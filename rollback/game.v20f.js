(function(){
'use strict';
var $=function(i){return document.getElementById(i);};
var stage=$('stage');
if(!window.THREE){$('loading').innerHTML='The 3D engine could not load (network or blocked script).<br><button class="btn" type="button" onclick="location.reload()" style="margin-top:12px">Reload</button>';return;}
var V3=THREE.Vector3;
var coarse=false;try{coarse=window.matchMedia('(pointer:coarse)').matches;}catch(e){}
var Q={high:!coarse};
requestAnimationFrame(function(){setTimeout(function(){try{init();}catch(err){$('loading').hidden=false;$('loading').textContent='Could not start the 3D scene on this device.';if(window.console)console.error(err);}},30);});

function init(){
var renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){$('loading').innerHTML='WebGL is turned off or unsupported in this browser.<br><button class="btn" type="button" onclick="location.reload()" style="margin-top:12px">Try again</button>';return;}
renderer.setClearColor(0x000000,1);
stage.insertBefore(renderer.domElement,stage.firstChild);

/* ---------- colour + material helpers (linear workflow) ---------- */
function C(hex){return new THREE.Color(hex).convertSRGBToLinear();}
function setC(m,hex){m.color.copy(C(hex));}
function sm(hex,rough,metal,extra){
  var o={color:C(hex),roughness:rough===undefined?0.8:rough,metalness:metal||0};
  if(extra)for(var k in extra)o[k]=extra[k];
  return new THREE.MeshStandardMaterial(o);
}
function lerp(a,b,p){return a+(b-a)*p;}
function ease(p){return p<0.5?2*p*p:1-Math.pow(-2*p+2,2)/2;}
function sstep(a,b,x){var t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}

/* ---------- noise + procedural textures ---------- */
function hash2(x,y){var h=Math.sin(x*127.1+y*311.7)*43758.5453;return h-Math.floor(h);}
function pn(x,y,per){
  var xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  function h(a,b){a=((a%per)+per)%per;b=((b%per)+per)%per;return hash2(a,b);}
  var a=h(xi,yi),b=h(xi+1,yi),c=h(xi,yi+1),d=h(xi+1,yi+1);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
function pfbm(x,y,per,o){var s=0,a=0.5,f=1,n=0;for(var i=0;i<o;i++){s+=a*pn(x*f,y*f,per*f);n+=a;f*=2;a*=0.5;}return s/n;}
function vn(x,y){var xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  var a=hash2(xi,yi),b=hash2(xi+1,yi),c=hash2(xi,yi+1),d=hash2(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,o){var s=0,a=0.5,f=1,n=0;for(var i=0;i<o;i++){s+=a*vn(x*f,y*f);n+=a;f*=2;a*=0.5;}return s/n;}
function makeTex(w,h,fn,srgb,rx,ry){
  var c=document.createElement('canvas');c.width=w;c.height=h;var ctx=c.getContext('2d');
  var im=ctx.createImageData(w,h),d=im.data;
  for(var y=0;y<h;y++)for(var x=0;x<w;x++){var col=fn(x/w,y/h,x,y),i=(y*w+x)*4;d[i]=col[0];d[i+1]=col[1];d[i+2]=col[2];d[i+3]=255;}
  ctx.putImageData(im,0,0);
  var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;
  if(srgb)t.encoding=THREE.sRGBEncoding;
  if(rx)t.repeat.set(rx,ry||rx);
  return t;
}
var redraws=[];
function mkTex(w,h,draw){
  var c=document.createElement('canvas');c.width=w;c.height=h;var ctx=c.getContext('2d');
  var t=new THREE.CanvasTexture(c);t.anisotropy=8;t.encoding=THREE.sRGBEncoding;
  function go(){ctx.clearRect(0,0,w,h);draw(ctx,w,h);t.needsUpdate=true;}
  go();redraws.push(go);return t;
}
var TEL='"Anek Telugu","Nirmala UI",sans-serif';
function fitText(ctx,str,x,y,maxW,size,weight,font,color){
  var s=size;ctx.font=weight+' '+s+'px '+font;
  while(ctx.measureText(str).width>maxW&&s>14){s-=2;ctx.font=weight+' '+s+'px '+font;}
  ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(str,x,y);
}
function mix3(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}

var grassTex=makeTex(256,256,function(u,v){
  var n=pfbm(u*8,v*8,8,4),m=pn(u*64,v*64,64),k=0.6+n*0.8;
  return [38*k+m*14,70*k+m*26,26*k+m*8];
},true,64);
var cobbleCanvas=document.createElement('canvas');cobbleCanvas.width=cobbleCanvas.height=512;
(function(){
  var x=cobbleCanvas.getContext('2d');x.fillStyle='#3a3530';x.fillRect(0,0,512,512);
  var N=8,sz=512/N;
  for(var j=0;j<N;j++)for(var i=0;i<N;i++){
    var ox=(j%2)*sz*0.5,cx=i*sz+ox+sz/2+(hash2(i,j)-0.5)*8,cy=j*sz+sz/2+(hash2(j,i+9)-0.5)*8;
    var g=118+hash2(i*3,j*7)*70,r=g+10,b=g-8;
    x.fillStyle='rgb('+(r|0)+','+(g|0)+','+(b|0)+')';
    var w=sz*0.46+hash2(i,j+3)*5,h=sz*0.44+hash2(i+5,j)*5,rad=14;
    x.beginPath();x.moveTo(cx-w+rad,cy-h);x.lineTo(cx+w-rad,cy-h);x.quadraticCurveTo(cx+w,cy-h,cx+w,cy-h+rad);x.lineTo(cx+w,cy+h-rad);x.quadraticCurveTo(cx+w,cy+h,cx+w-rad,cy+h);x.lineTo(cx-w+rad,cy+h);x.quadraticCurveTo(cx-w,cy+h,cx-w,cy+h-rad);x.lineTo(cx-w,cy-h+rad);x.quadraticCurveTo(cx-w,cy-h,cx-w+rad,cy-h);x.fill();
  }
  var im=x.getImageData(0,0,512,512),d=im.data;
  for(var p=0;p<512*512;p++){var nn=(hash2(p%512*0.37,Math.floor(p/512)*0.41)-0.5)*26;d[p*4]+=nn;d[p*4+1]+=nn;d[p*4+2]+=nn;}
  x.putImageData(im,0,0);
})();
var cobbleTex=new THREE.CanvasTexture(cobbleCanvas);cobbleTex.wrapS=cobbleTex.wrapT=THREE.RepeatWrapping;cobbleTex.anisotropy=8;cobbleTex.encoding=THREE.sRGBEncoding;
var cobbleBump=new THREE.CanvasTexture(cobbleCanvas);cobbleBump.wrapS=cobbleBump.wrapT=THREE.RepeatWrapping;cobbleBump.anisotropy=8;
var spongeTex=makeTex(128,512,function(u,v,px,py){
  var n=pfbm(u*6,v*24,6,3),crumb=hash2(px*1.7,py*1.3);
  var col;
  if(v<0.07)col=[247,170,200];
  else if(v<0.3)col=[255,246,230];
  else if(v<0.35)col=[196,38,74];
  else if(v<0.58)col=[244,214,150];
  else if(v<0.64)col=[196,38,74];
  else if(v<0.8)col=[250,238,214];
  else col=[120,74,48];
  var k=0.93+n*0.14+(crumb-0.5)*((v>0.35&&v<0.58)?0.08:0.02);
  return [col[0]*k,col[1]*k,col[2]*k];
},true,8,1);
var frostTex=makeTex(128,128,function(u,v){var n=pfbm(u*6,v*6,6,3);var k=0.9+n*0.2;return [250*k,160*k,196*k];},true,3);
var barkTex=makeTex(64,128,function(u,v,px,py){var n=pfbm(u*4,v*16,4,3);var k=0.55+n*0.7;return [96*k,66*k,42*k];},true,1);
var woodTex=makeTex(128,128,function(u,v){var n=pfbm(u*2,v*18,2,4),k=0.7+n*0.5;return [150*k,102*k,62*k];},true,1);
var lanternTex=mkTex(256,256,function(x,w,h){
  var g=x.createRadialGradient(w/2,h/2,10,w/2,h/2,w*0.62);g.addColorStop(0,'#ffe9a8');g.addColorStop(0.5,'#ffa23a');g.addColorStop(1,'#d24a12');x.fillStyle=g;x.fillRect(0,0,w,h);
  x.strokeStyle='rgba(90,20,0,0.75)';x.lineWidth=6;x.lineCap='round';
  for(var r=0;r<3;r++){x.beginPath();for(var a=0;a<=Math.PI*2+0.1;a+=0.12){var rr=26+r*34+Math.sin(a*5+r)*10;var px=w/2+Math.cos(a)*rr*1.5,py=h/2+Math.sin(a)*rr*1.5;if(a===0)x.moveTo(px,py);else x.lineTo(px,py);}x.stroke();}
});
var glowTex=mkTex(128,128,function(x,w,h){var g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.25,'rgba(255,255,255,0.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h);});
glowTex.encoding=THREE.LinearEncoding;
var cloudTex=null;
(function(){ /* give cloud texture real alpha */
  var c=document.createElement('canvas');c.width=256;c.height=128;var x=c.getContext('2d');var im=x.createImageData(256,128),d=im.data;
  for(var py=0;py<128;py++)for(var px=0;px<256;px++){var u=px/256,v=py/128,n=pfbm(u*5,v*3,5,5),e=Math.max(0,1-Math.abs(v-0.5)*2),a=Math.max(0,Math.min(1,(n-0.42)*3.4))*Math.pow(e,0.8),i=(py*256+px)*4;d[i]=255;d[i+1]=226;d[i+2]=204;d[i+3]=a*255;}
  x.putImageData(im,0,0);cloudTex=new THREE.CanvasTexture(c);cloudTex.encoding=THREE.sRGBEncoding;
})();

/* ---------- scene, sky, lights ---------- */
var scene=new THREE.Scene();
var FOG=C(0xe6b497);
scene.fog=new THREE.FogExp2(FOG,0.0030);
scene.background=FOG.clone();
var camera=new THREE.PerspectiveCamera(52,16/9,0.1,900);
var SUNPOS=new V3(-45,30,35);
var skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{top:{value:C(0x3a64b0)},mid:{value:C(0xef9f86)},hor:{value:C(0xffd2a8)},sunDir:{value:SUNPOS.clone().normalize()},sunCol:{value:C(0xfff0c8)}},
  vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform vec3 top;uniform vec3 mid;uniform vec3 hor;uniform vec3 sunDir;uniform vec3 sunCol;varying vec3 vP;void main(){vec3 d=normalize(vP);float h=clamp(d.y,0.0,1.0);vec3 c=mix(hor,mid,smoothstep(0.0,0.2,h));c=mix(c,top,smoothstep(0.12,0.75,h));float s=max(dot(d,sunDir),0.0);c+=sunCol*(pow(s,700.0)*7.0+pow(s,20.0)*0.5+pow(s,4.0)*0.14);if(d.y<0.0)c=hor*0.9;gl_FragColor=vec4(c,1.0);}'});
var sky=new THREE.Mesh(new THREE.SphereGeometry(450,32,16),skyMat);sky.frustumCulled=false;sky.renderOrder=-10;scene.add(sky);
var clouds=[];
for(var cl=0;cl<12;cl++){
  var cs=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudTex,transparent:true,opacity:0.55,fog:false,depthWrite:false}));
  var ca=Math.random()*Math.PI*2,cr=330;cs.position.set(Math.cos(ca)*cr,70+Math.random()*90,Math.sin(ca)*cr);cs.scale.set(220+Math.random()*120,70+Math.random()*30,1);scene.add(cs);clouds.push(cs);
}
var hemi=new THREE.HemisphereLight(C(0xa7c1ee),C(0x6b7a45),0.8);scene.add(hemi);
var sun=new THREE.DirectionalLight(C(0xffd2a0),2.3);sun.position.copy(SUNPOS);scene.add(sun);scene.add(sun.target);
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-17;sun.shadow.camera.right=17;sun.shadow.camera.top=17;sun.shadow.camera.bottom=-17;sun.shadow.camera.near=1;sun.shadow.camera.far=120;sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.03;
var fill=new THREE.DirectionalLight(C(0x86a4ff),0.55);fill.position.set(40,18,-30);scene.add(fill);
var follow=new THREE.PointLight(C(0xffb468),0.7,10,2);scene.add(follow);
var candleLight=new THREE.PointLight(C(0xffb050),1.2,16,2);candleLight.position.set(0,15.2,0);scene.add(candleLight);

/* ---------- renderer + post ---------- */
var GradeShader={uniforms:{tDiffuse:{value:null},uTime:{value:0},uExposure:{value:0.95}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform sampler2D tDiffuse;uniform float uTime;uniform float uExposure;varying vec2 vUv;'+
  'vec3 aces(vec3 x){const float a=2.51;const float b=0.03;const float c=2.43;const float d=0.59;const float e=0.14;return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);}'+
  'float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}'+
  'void main(){vec3 c=texture2D(tDiffuse,vUv).rgb*uExposure;c=aces(c);float l=dot(c,vec3(0.2126,0.7152,0.0722));c=mix(vec3(l),c,1.06);'+
  'c=mix(c,c*vec3(1.05,1.0,0.94),0.5);c=pow(c,vec3(1.0/2.2));vec2 q=vUv-0.5;c*=1.0-dot(q,q)*0.6;c+=(hash(vUv*vec2(1731.0,977.0)+uTime)-0.5)*0.010;gl_FragColor=vec4(c,1.0);}'};
var composer=null,bloom=null,gradePass=null,fxaa=null;
function pixelRatio(){return Math.min(window.devicePixelRatio||1,Q.high?2:1.25);}
renderer.setPixelRatio(pixelRatio());
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
function setupPost(w,h){
  try{
    if(!(THREE.EffectComposer&&THREE.RenderPass&&THREE.ShaderPass&&THREE.UnrealBloomPass&&THREE.FXAAShader&&THREE.CopyShader&&THREE.LuminosityHighPassShader))return false;
    var ext=renderer.extensions,half=renderer.capabilities.isWebGL2&&(ext.has('EXT_color_buffer_float')||ext.has('EXT_color_buffer_half_float'));
    var rt=new THREE.WebGLRenderTarget(Math.max(2,w),Math.max(2,h),{type:half?THREE.HalfFloatType:THREE.UnsignedByteType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
    composer=new THREE.EffectComposer(renderer,rt);
    composer.addPass(new THREE.RenderPass(scene,camera));
    bloom=new THREE.UnrealBloomPass(new THREE.Vector2(w,h),0.22,0.5,0.93);composer.addPass(bloom);
    gradePass=new THREE.ShaderPass(GradeShader);composer.addPass(gradePass);
    fxaa=new THREE.ShaderPass(THREE.FXAAShader);composer.addPass(fxaa);
    return true;
  }catch(e){composer=null;return false;}
}
var hasPost=setupPost(Math.max(2,stage.clientWidth),Math.max(2,stage.clientHeight));
if(!hasPost){renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;}
var shadowCasters=[];
function applyQuality(){
  renderer.setPixelRatio(pixelRatio());
  renderer.shadowMap.enabled=Q.high;sun.castShadow=Q.high;
  if(bloom)bloom.enabled=Q.high;
  if(grassMesh)grassMesh.count=Q.high?GRASS_N:Math.floor(GRASS_N*0.3);
  guests.forEach(function(g,i){g.group.visible=Q.high||i%2===0;});
  scene.traverse(function(o){if(o.material){var ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(function(m){m.needsUpdate=true;});}});
  $('qBtn').textContent='Graphics: '+(Q.high?'High':'Low');
  resize();
}

/* ---------- path ---------- */
var TURNS=2.6,HMAX=12.6,RC0=18.6,TH=2*Math.PI*TURNS;
function rc(t){return RC0-HMAX*t;}
function hh(t){return HMAX*t;}
function P(t,off,out){var th=TH*t,r=rc(t)-off;out.set(r*Math.cos(th),hh(t),r*Math.sin(th));return out;}
function Tn(t,out){var th=TH*t,r=rc(t);out.set(-HMAX*Math.cos(th)-r*Math.sin(th)*TH,HMAX,-HMAX*Math.sin(th)+r*Math.cos(th)*TH);return out.normalize();}
function dsAt(t){var r=rc(t);return Math.sqrt(HMAX*HMAX+(r*TH)*(r*TH)+HMAX*HMAX);}
function f2At(t,out){Tn(t,out);out.y=0;return out.normalize();}
var PCAM={side:3.9,fwd:1.0,h:1.5,ly:0.85,gside:3.5,gfwd:0.5,gh:1.1,gly:0.95,glat:0.9};
var tA=new V3(),tB=new V3(),tC=new V3(),rv=new V3(),CT_r=new V3(),CT_m=new V3(),CT_d=new V3();
var XF=RC0+6;

/* ---------- terrain ---------- */
function hgt(x,z){var r=Math.sqrt(x*x+z*z),b=sstep(54,135,r);if(b<=0)return 0;var n=fbm(x*0.011+9,z*0.011+4,4),ridge=1-Math.abs(n*2-1);return b*(6+ridge*48+n*12);}
var tg=new THREE.PlaneGeometry(440,440,150,150);tg.rotateX(-Math.PI/2);
(function(){
  var pos=tg.attributes.position,col=new Float32Array(pos.count*3);
  for(var i=0;i<pos.count;i++){
    var x=pos.getX(i),z=pos.getZ(i),h=hgt(x,z);pos.setY(i,h);
    var n=fbm(x*0.05,z*0.05,3),g=[0.62+n*0.5,0.86+n*0.4,0.5+n*0.3],rock=[0.78,0.66,0.62],snow=[0.95,0.9,0.92];
    var c=mix3(g,rock,sstep(14,34,h));c=mix3(c,snow,sstep(44,62,h));col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2];
  }
  tg.setAttribute('color',new THREE.BufferAttribute(col,3));tg.computeVertexNormals();
})();
var terrain=new THREE.Mesh(tg,new THREE.MeshStandardMaterial({map:grassTex,vertexColors:true,roughness:1,metalness:0}));
terrain.position.y=-0.12;terrain.receiveShadow=true;scene.add(terrain);
var plate=new THREE.Mesh(new THREE.CylinderGeometry(21,21,0.12,72),sm(0xf3ece6,0.22,0.05));plate.position.y=-0.06;plate.receiveShadow=true;scene.add(plate);
var plateRim=new THREE.Mesh(new THREE.TorusGeometry(21,0.14,10,72),sm(0xf3ece6,0.22,0.05));plateRim.rotation.x=Math.PI/2;scene.add(plateRim);

/* ---------- cake ---------- */
var cakeMat=new THREE.MeshStandardMaterial({map:spongeTex,bumpMap:spongeTex,bumpScale:0.6,roughness:0.7,metalness:0});
var cake=new THREE.Mesh(new THREE.CylinderGeometry(4,17,13,96,1),cakeMat);cake.position.y=6.5;cake.castShadow=true;cake.receiveShadow=true;scene.add(cake);
(function(){
  var prof=[],i;
  prof.push(new THREE.Vector2(0.0,0.30));prof.push(new THREE.Vector2(1.6,0.28));prof.push(new THREE.Vector2(3.2,0.2));prof.push(new THREE.Vector2(3.95,0.08));prof.push(new THREE.Vector2(4.2,-0.05));prof.push(new THREE.Vector2(4.1,-0.25));
  var lg=new THREE.LatheGeometry(prof,72);
  var topM=sm(0xf7a8c6,0.28,0.0,{map:frostTex,bumpMap:frostTex,bumpScale:0.4});
  var top=new THREE.Mesh(lg,topM);top.position.y=13.0;top.castShadow=true;scene.add(top);
  var dN=44,dg=new THREE.SphereGeometry(0.17,10,8),dr=new THREE.InstancedMesh(dg,sm(0xf7a8c6,0.25),dN),dm=new THREE.Object3D();
  for(i=0;i<dN;i++){var a=i/dN*Math.PI*2+hash2(i,1)*0.1,len=1.2+hash2(i,2)*3.4,r=4.12+0.0;
    dm.position.set(Math.cos(a)*(r+0.05),12.92-len*0.12,Math.sin(a)*(r+0.05));dm.scale.set(1+hash2(i,3)*0.5,len*0.9,1+hash2(i,4)*0.5);dm.rotation.set(0,0,0);dm.updateMatrix();dr.setMatrixAt(i,dm.matrix);}
  dr.castShadow=true;scene.add(dr);
  var spN=260,sg=new THREE.BoxGeometry(0.03,0.03,0.12),sp=new THREE.InstancedMesh(sg,sm(0xffffff,0.5),spN),spc=[0xff5d73,0x4dabf7,0xffd43b,0x69db7c,0xda77f2,0xffffff];
  for(i=0;i<spN;i++){var aa=hash2(i,5)*Math.PI*2,rr=Math.sqrt(hash2(i,6))*3.8;dm.position.set(Math.cos(aa)*rr,13.31-rr*0.015,Math.sin(aa)*rr);dm.scale.set(1,1,1);dm.rotation.set(0,hash2(i,7)*6.28,0);dm.updateMatrix();sp.setMatrixAt(i,dm.matrix);sp.setColorAt(i,C(spc[i%6]));}
  scene.add(sp);
  var cherryM=sm(0xc81e32,0.18,0.0);
  for(i=0;i<14;i++){var ca=i/14*Math.PI*2;var ch=new THREE.Mesh(new THREE.SphereGeometry(0.27,16,12),cherryM);ch.position.set(Math.cos(ca)*3.7,13.46,Math.sin(ca)*3.7);ch.castShadow=true;scene.add(ch);
    var st=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.35,5),sm(0x4a7a2a,0.8));st.position.set(Math.cos(ca)*3.7,13.7,Math.sin(ca)*3.7);st.rotation.z=0.3;scene.add(st);}
  var rosN=70,rg=new THREE.ConeGeometry(0.3,0.5,12),ros=new THREE.InstancedMesh(rg,sm(0xfff3e2,0.3),rosN),rn=0;
  for(i=0;i<rosN;i++){var ang=i/rosN*Math.PI*2;if(ang<2.2||ang>6.2)continue;
    dm.position.set(Math.cos(ang)*17.15,0.33,Math.sin(ang)*17.15);dm.rotation.set(0,0,0);dm.scale.set(1,1,1);dm.lookAt(0,0.33,0);dm.rotateX(-Math.PI/2*0.9);dm.updateMatrix();ros.setMatrixAt(rn++,dm.matrix);}
  ros.count=rn;ros.castShadow=true;scene.add(ros);
})();
var flames=[];
var candleCols=[0xff6b6b,0x4dabf7,0xffd43b,0x69db7c,0xda77f2,0xff922b,0x38d9a9];
(function(){
  for(var cn=0;cn<7;cn++){
    var cang=cn/7*Math.PI*2,cr=cn===0?0:1.9,cx=cn===0?0:Math.cos(cang)*cr,cz=cn===0?0:Math.sin(cang)*cr;
    var cd=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,1.6,14),sm(candleCols[cn],0.4));cd.position.set(cx,14.1,cz);cd.castShadow=true;scene.add(cd);
    var fl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:C(0xffa83a),blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,fog:false}));fl.scale.set(0.9,1.3,1);fl.position.set(cx,15.15,cz);scene.add(fl);flames.push(fl);
    var core=new THREE.Mesh(new THREE.SphereGeometry(0.08,8,8),new THREE.MeshBasicMaterial({color:new THREE.Color(3.5,2.4,0.8)}));core.scale.y=1.6;core.position.set(cx,14.98,cz);scene.add(core);
  }
})();

/* ---------- road ---------- */
function ribbon(fn,N,material,vrep,urep){
  var pos=[],uv=[],idx=[],i;
  for(i=0;i<=N;i++){var t=i/N,a=fn(t,0),b=fn(t,1);pos.push(a[0],a[1],a[2],b[0],b[1],b[2]);uv.push(0,t*vrep,urep,t*vrep);}
  for(i=0;i<N;i++){var k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}
  var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  var m=new THREE.Mesh(g,material);m.receiveShadow=true;scene.add(m);return m;
}
function rp(off,dy){return function(t,k){P(t,off[k],rv);return [rv.x,rv.y+dy[k],rv.z];};}
cobbleTex.repeat.set(1,1);
var roadMat=new THREE.MeshStandardMaterial({map:cobbleTex,bumpMap:cobbleBump,bumpScale:3,roughness:0.92,metalness:0,side:THREE.DoubleSide});
ribbon(rp([-1.5,1.8],[0.03,0.03]),520,roadMat,60,1.1);
var lineMat=sm(0xf4f0e6,0.7,0,{side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
ribbon(rp([-1.5,-1.3],[0.045,0.045]),520,lineMat,1,1);
ribbon(rp([1.35,1.55],[0.045,0.045]),520,lineMat,1,1);
ribbon(rp([-1.5,-1.5],[0.03,-0.8]),520,sm(0xf7a8c6,0.3,0,{map:frostTex,side:THREE.DoubleSide}),30,1);
var ropeMat=sm(0xcdb78a,0.9);
class HelixCurve extends THREE.Curve{constructor(off,dy){super();this.off=off;this.dy=dy;}getPoint(t,target){target=target||new V3();P(t,this.off,target);target.y+=this.dy;return target;}}
var rail=new THREE.Mesh(new THREE.TubeGeometry(new HelixCurve(-1.52,0.5),500,0.035,6,false),ropeMat);rail.castShadow=true;scene.add(rail);
var postGeo=new THREE.CylinderGeometry(0.06,0.07,0.62,8),postMat=sm(0x8a5a32,0.8,0,{map:woodTex});
var posts=new THREE.InstancedMesh(postGeo,postMat,100),dmm=new THREE.Object3D();
for(var pi=0;pi<100;pi++){P(pi/99,-1.52,rv);dmm.position.set(rv.x,rv.y+0.28,rv.z);dmm.rotation.set(0,0,0);dmm.scale.set(1,1,1);dmm.updateMatrix();posts.setMatrixAt(pi,dmm.matrix);}
posts.castShadow=true;scene.add(posts);

function roadSeg(x1,z1,x2,z2,w){
  var dx=x2-x1,dz=z2-z1,len=Math.sqrt(dx*dx+dz*dz);
  var mat=roadMat.clone();mat.map=cobbleTex.clone();mat.map.needsUpdate=true;mat.map.repeat.set(w/3,len/3);mat.bumpMap=cobbleBump.clone();mat.bumpMap.needsUpdate=true;mat.bumpMap.repeat.set(w/3,len/3);
  var m=new THREE.Mesh(new THREE.BoxGeometry(w,0.08,len),mat);
  m.position.set((x1+x2)/2,0.0,(z1+z2)/2);m.rotation.y=Math.atan2(dx,dz);m.receiveShadow=true;scene.add(m);
}
roadSeg(XF,-38,XF,-14,3.6);roadSeg(XF,-14,XF,-2,3.6);roadSeg(XF,-14,RC0,-7,3.6);roadSeg(RC0,-8,RC0,-0.5,3.6);

/* ---------- vegetation ---------- */
var segs=[[XF,-40,XF,-1],[XF,-14,RC0,-7],[RC0,-8,RC0,0]];
function distSeg(px,pz,s){var ax=s[0],az=s[1],bx=s[2],bz=s[3],dx=bx-ax,dz=bz-az,l2=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/l2));var cx=ax+dx*t,cz=az+dz*t;return Math.sqrt((px-cx)*(px-cx)+(pz-cz)*(pz-cz));}
var ENVZ=null;function envZ(){ENVZ=[];[0.34,0.51,0.68,0.85].forEach(function(t){for(var k=-3;k<=3;k++){var q=P(t+k*0.0105,-3.8,new V3());ENVZ.push(q.x,q.z);}});}
function inEnv(x,z){if(!ENVZ)envZ();for(var i=0;i<ENVZ.length;i+=2){var ex=x-ENVZ[i],ez=z-ENVZ[i+1];if(ex*ex+ez*ez<20)return true;}if(Math.abs(x-XF)<10.8&&z>-40&&z<-13)return true;var r=Math.sqrt(x*x+z*z);if(r<32){var a=Math.atan2(z,x);if(a<0)a+=2*Math.PI;if(a>1.6&&a<3.95&&r>17.5)return true;}return false;}
function nearRoad(x,z,m){if(inEnv(x,z))return true;for(var i=0;i<segs.length;i++)if(distSeg(x,z,segs[i])<m)return true;return false;}
var GRASS_N=34000,grassMesh=null;
var windU={value:0};
(function(){
  var bg=new THREE.PlaneGeometry(0.075,1,1,3);bg.translate(0,0.5,0);
  var pp=bg.attributes.position,cc=new Float32Array(pp.count*3);
  for(var i=0;i<pp.count;i++){var f=pp.getY(i);pp.setX(i,pp.getX(i)*(1-f*0.85));pp.setZ(i,f*f*0.22);var c=mix3([0.04,0.12,0.03],[0.4,0.6,0.18],f);cc[i*3]=c[0];cc[i*3+1]=c[1];cc[i*3+2]=c[2];}
  bg.setAttribute('color',new THREE.BufferAttribute(cc,3));
  var gm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.9,side:THREE.DoubleSide});
  gm.onBeforeCompile=function(sh){sh.uniforms.uTime=windU;sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\ntransformed.x+=sin(uTime*1.7+instanceMatrix[3].x*0.6+instanceMatrix[3].z*0.4)*0.16*position.y*position.y;transformed.z+=cos(uTime*1.3+instanceMatrix[3].z*0.5)*0.08*position.y*position.y;\n#endif');};
  grassMesh=new THREE.InstancedMesh(bg,gm,GRASS_N);
  var dm=new THREE.Object3D(),n=0,tries=0,gcols=[0xffffff,0xe8f0c0,0xc8e090,0xf0e8a0];
  while(n<GRASS_N&&tries<GRASS_N*4){tries++;
    var a=Math.random()*Math.PI*2,r=21.5+Math.pow(Math.random(),0.8)*46,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(nearRoad(x,z,2.9))continue;
    dm.position.set(x,-0.1,z);dm.rotation.set(0,Math.random()*6.28,0);var s=0.7+Math.random()*0.9;dm.scale.set(1,s*(0.22+Math.random()*0.3),1);dm.updateMatrix();
    grassMesh.setMatrixAt(n,dm.matrix);grassMesh.setColorAt(n,C(gcols[n%4]));n++;
  }
  grassMesh.count=n;GRASS_N=n;grassMesh.frustumCulled=false;scene.add(grassMesh);
})();
(function(){
  var dm=new THREE.Object3D(),FN=900,fg=new THREE.SphereGeometry(0.07,8,6),fm=new THREE.InstancedMesh(fg,sm(0xffffff,0.6),FN),fc=[0xb36bff,0xffd23f,0xffffff,0xff7a3d,0x6fa8ff,0xff6fa8],n=0;
  while(n<FN){var a=Math.random()*Math.PI*2,r=21.8+Math.random()*30,x=Math.cos(a)*r,z=Math.sin(a)*r;if(nearRoad(x,z,2.9))continue;
    var cl=Math.floor(Math.random()*6);for(var k=0;k<3&&n<FN;k++){dm.position.set(x+(Math.random()-0.5)*1.4,0.35+Math.random()*0.35,z+(Math.random()-0.5)*1.4);dm.rotation.set(0,0,0);dm.scale.setScalar(0.8+Math.random()*0.8);dm.updateMatrix();fm.setMatrixAt(n,dm.matrix);fm.setColorAt(n,C(fc[cl]));n++;}}
  scene.add(fm);
})();
(function(){
  var ig=new THREE.IcosahedronGeometry(1,2),ip=ig.attributes.position;
  for(var i=0;i<ip.count;i++){var x=ip.getX(i),y=ip.getY(i),z=ip.getZ(i),k=1+(vn(x*2.4+5,z*2.4+y*2)-0.5)*0.45;ip.setXYZ(i,x*k,y*k*0.85,z*k);}
  ig.computeVertexNormals();
  var TN=46,trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28,0.46,1,8),sm(0xffffff,0.95,0,{map:barkTex}),TN);
  var blobs=new THREE.InstancedMesh(ig,sm(0xffffff,0.88),TN*6),cones=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1.5,9),sm(0xffffff,0.9),TN*4);
  var dm=new THREE.Object3D(),nb=0,nc=0,nt=0,gcol=[0x3f8a3c,0x4f9a42,0x2f7a35,0x5aa04a,0x6b9b3a],pcol=[0x2e6b45,0x33754a,0x285c3e];
  while(nt<TN){
    var a=Math.random()*Math.PI*2,r=34+Math.random()*60,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.abs(x-XF)<11&&z<14&&z>-46)continue;
    var pine=Math.random()<0.4,h=pine?9+Math.random()*7:5+Math.random()*4,gy=hgt(x,z)-0.12;
    dm.position.set(x,gy+h*0.25,z);dm.rotation.set(0,0,0);dm.scale.set(pine?0.7:1,h*0.5,pine?0.7:1);dm.updateMatrix();trunk.setMatrixAt(nt,dm.matrix);
    if(pine){for(var c=0;c<4;c++){var cs=(2.8-c*0.55)*(0.8+Math.random()*0.3);dm.position.set(x,gy+h*0.35+c*h*0.17,z);dm.scale.set(cs,cs*1.15,cs);dm.rotation.set(0,Math.random()*6,0);dm.updateMatrix();cones.setMatrixAt(nc,dm.matrix);cones.setColorAt(nc,C(pcol[nc%3]));nc++;}}
    else{for(var b=0;b<6;b++){var bs=1.6+Math.random()*1.6;dm.position.set(x+(Math.random()-0.5)*2.6,gy+h*0.8+(Math.random()-0.3)*2.2,z+(Math.random()-0.5)*2.6);dm.scale.setScalar(bs);dm.rotation.set(Math.random()*3,Math.random()*3,0);dm.updateMatrix();blobs.setMatrixAt(nb,dm.matrix);blobs.setColorAt(nb,C(gcol[nb%5]));nb++;}}
    nt++;
  }
  trunk.count=nt;blobs.count=nb;cones.count=nc;
  [trunk,blobs,cones].forEach(function(m){m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;scene.add(m);});
  var bushN=70,bush=new THREE.InstancedMesh(ig,sm(0xffffff,0.9),bushN);
  for(var i2=0;i2<bushN;i2++){var an=Math.random()*Math.PI*2,rr=22.4+Math.random()*3.2;if(nearRoad(Math.cos(an)*rr,Math.sin(an)*rr,3.2))continue;dm.position.set(Math.cos(an)*rr,0.35,Math.sin(an)*rr);dm.scale.set(0.8+Math.random()*0.9,0.55+Math.random()*0.5,0.8+Math.random()*0.9);dm.rotation.set(0,Math.random()*6,0);dm.updateMatrix();bush.setMatrixAt(i2,dm.matrix);bush.setColorAt(i2,C(gcol[i2%5]));}
  bush.castShadow=true;scene.add(bush);
})();

/* ---------- signs and textures ---------- */
var tStripe=mkTex(256,64,function(x,w,h){x.fillStyle='#f6f2ea';x.fillRect(0,0,w,h);x.fillStyle='#d62839';for(var i=-2;i<10;i++){x.beginPath();x.moveTo(i*40,h);x.lineTo(i*40+20,h);x.lineTo(i*40+60,0);x.lineTo(i*40+40,0);x.closePath();x.fill();}});
function signTex(l1,l2){return mkTex(1024,320,function(x,w,h){
  x.fillStyle='#2a1a4d';x.fillRect(0,0,w,h);x.strokeStyle='#ffd35a';x.lineWidth=10;x.strokeRect(10,10,w-20,h-20);
  fitText(x,l1,w/2,h*0.35,w-150,112,'400','Anton, Impact, sans-serif','#ffffff');
  fitText(x,l2,w/2,h*0.745,w-150,104,'400','Anton, Impact, sans-serif','#7dffb0');});}
var bannerTex=mkTex(1024,300,function(x,w,h){
  var g=x.createLinearGradient(0,0,w,0);g.addColorStop(0,'#5a1f9a');g.addColorStop(1,'#c2308f');x.fillStyle=g;x.fillRect(0,0,w,h);
  x.strokeStyle='#ffd35a';x.lineWidth=10;x.strokeRect(8,8,w-16,h-16);
  fitText(x,'వాసూల్ బాబు బర్త్‌డే పార్టీకి స్వాగతం',w/2,h*0.34,w-80,70,'700',TEL,'#ffffff');
  fitText(x,'WELCOME TO THE BIRTHDAY PARTY',w/2,h*0.7,w-80,64,'400','Anton, Impact, sans-serif','#ffd35a');});
var promiseTex=mkTex(512,420,function(x,w,h){
  x.fillStyle='#fff7e8';x.fillRect(0,0,w,h);x.strokeStyle='#7a2fc0';x.lineWidth=12;x.strokeRect(6,6,w-12,h-12);
  fitText(x,'6 వాగ్దానాల బాట',w/2,70,w-60,58,'700',TEL,'#7a2fc0');fitText(x,'వాసూల్ పార్టీ',w/2,128,w-60,40,'700',TEL,'#1b1730');
  var lines=['1  Free cake for everyone','2  Free candles for everyone','3  Free cream, terms apply','4  Free time, ask the clerk','5  Free road, toll extra','6  Free birthday, fee at entry'];
  lines.forEach(function(s,i){x.font='400 26px Hind, sans-serif';x.fillStyle='#1b1730';x.textAlign='left';x.textBaseline='middle';x.fillText(s,44,190+i*34);});});
var capLabelTex=mkTex(256,128,function(x,w,h){x.fillStyle='#ffd35a';x.fillRect(0,0,w,h);x.strokeStyle='#7a2fc0';x.lineWidth=8;x.strokeRect(4,4,w-8,h-8);fitText(x,'బకరా',w/2,h/2+2,w-30,72,'700',TEL,'#7a2fc0');});
var qTex=mkTex(128,128,function(x,w,h){x.fillStyle='#fff';x.beginPath();x.arc(64,64,58,0,7);x.fill();x.strokeStyle='#7a2fc0';x.lineWidth=6;x.stroke();fitText(x,'?',64,68,90,96,'400','Anton, Impact, sans-serif','#7a2fc0');});
var sumTex=mkTex(768,200,function(x,w,h){var g=x.createLinearGradient(0,0,w,0);g.addColorStop(0,'#c2308f');g.addColorStop(1,'#5a1f9a');x.fillStyle=g;x.fillRect(0,0,w,h);fitText(x,'HAPPY BIRTHDAY, VASOOL BABU',w/2,h/2,w-50,62,'400','Anton, Impact, sans-serif','#ffffff');});
function basicMap(t,k){var m=new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});m.color.setScalar(k||0.9);return m;}

var collCols=[0x5b3f8c,0x2f7f6f,0xb5532e,0x3b4b7a,0x7a3b4b];
var GATECFG=/*GATECFG*/{entryFee:2500,ui:{amountLabel:'Amount to Pay',button:'CONTINUE'},gates:[]};
var gateDefs=[
 {t:0.17,kind:'boom'},
 {t:0.34,kind:'cones'},
 {t:0.51,kind:'chain'},
 {t:0.68,kind:'flag'},
 {t:0.85,kind:'punct'}
];
var FEES=[GATECFG.entryFee].concat(GATECFG.gates.map(function(g){return g.amount;})),TOTAL=FEES.reduce(function(a,b){return a+b;},0);
gateDefs.forEach(function(d,i){var c=GATECFG.gates[i];d.id=c.id;d.name=c.name;d.popKey=c.popKey;d.sign={l1:c.name,l2:'\u20B9'+c.amount.toLocaleString('en-IN')};d.pay={title:c.name,label:GATECFG.ui.amountLabel,amount:c.amount,button:GATECFG.ui.button};});

/* ---------- lanterns, torches, ropes ---------- */
var lanternPts=[],woodPoleM=sm(0x6b4423,0.85,0,{map:woodTex}),darkM=sm(0x2b2018,0.7,0.3);
var polePos=[];
function addPole(x,y,z,h){polePos.push([x,y,z,h]);}
function stringBetween(a,b,n){
  var pts=[];for(var i=0;i<=6;i++){var f=i/6,sag=Math.sin(f*Math.PI)*0.6;pts.push(new V3(lerp(a.x,b.x,f),lerp(a.y,b.y,f)-sag,lerp(a.z,b.z,f)));}
  var cu=new THREE.CatmullRomCurve3(pts);var m=new THREE.Mesh(new THREE.TubeGeometry(cu,18,0.012,4,false),sm(0x1d1812,0.9));scene.add(m);
  for(var k=1;k<=n;k++){var f2=k/(n+1);var p=cu.getPoint(f2);lanternPts.push([p.x,p.y-0.34,p.z]);}
}
(function(){
  var prev=null,POLE_H=4.4;
  for(var i=0;i<=20;i++){
    var t=i/20;if(t<0.04||t>0.98)continue;
    var skip=false;gateDefs.forEach(function(g){if(Math.abs(g.t-t)<0.022)skip=true;});if(skip){continue;}
    P(t,-1.7,rv);var top=new V3(rv.x,rv.y+POLE_H-0.2,rv.z);addPole(rv.x,rv.y-0.5,rv.z,POLE_H+0.5);
    if(prev)stringBetween(prev,top,4);prev=top;
  }
  var zs=[-36,-29,-22,-15];var prevL=null,prevR=null;
  zs.forEach(function(z){
    var L=new V3(XF-2.4,POLE_H-0.2,z),R=new V3(XF+2.4,POLE_H-0.2,z);addPole(L.x,0,z,POLE_H);addPole(R.x,0,z,POLE_H);
    stringBetween(L,R,3);if(prevL){stringBetween(prevL,L,3);stringBetween(prevR,R,3);}prevL=L;prevR=R;
  });
  var pg=new THREE.CylinderGeometry(0.07,0.1,1,8),pm=new THREE.InstancedMesh(pg,woodPoleM,polePos.length),dm=new THREE.Object3D();
  polePos.forEach(function(p,i){dm.position.set(p[0],p[1]+p[3]/2,p[2]);dm.scale.set(1,p[3],1);dm.rotation.set(0,0,0);dm.updateMatrix();pm.setMatrixAt(i,dm.matrix);});
  pm.castShadow=true;scene.add(pm);
  var lg=new THREE.SphereGeometry(0.28,18,14);lg.scale(1,1.2,1);
  var lm=new THREE.InstancedMesh(lg,new THREE.MeshStandardMaterial({color:C(0xff9a3a),map:lanternTex,emissive:C(0xff8a2a),emissiveMap:lanternTex,emissiveIntensity:2.6,roughness:0.5}),lanternPts.length);
  var cg=new THREE.CylinderGeometry(0.1,0.12,0.08,10),cm=new THREE.InstancedMesh(cg,darkM,lanternPts.length);
  lanternPts.forEach(function(p,i){dm.position.set(p[0],p[1],p[2]);dm.scale.set(1,1,1);dm.rotation.set(0,i*1.3,0);dm.updateMatrix();lm.setMatrixAt(i,dm.matrix);dm.position.y+=0.34;dm.updateMatrix();cm.setMatrixAt(i,dm.matrix);});
  scene.add(lm);scene.add(cm);
})();
var torchSprites=[];
function makeTorch(parent,x,z,withLight){
  var pole=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,1.6,8),woodPoleM);pole.position.set(x,0.8,z);pole.castShadow=true;parent.add(pole);
  var bowl=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.09,0.18,12),sm(0x3a3a40,0.4,0.8));bowl.position.set(x,1.68,z);parent.add(bowl);
  var f=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:C(0xff8a2a),blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,fog:false}));f.scale.set(1.0,1.5,1);f.position.set(x,1.98,z);parent.add(f);torchSprites.push(f);
  var core=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8),new THREE.MeshBasicMaterial({color:new THREE.Color(3,2,0.6)}));core.position.set(x,1.86,z);core.scale.y=1.7;parent.add(core);
  var L=null;if(withLight){L=new THREE.PointLight(C(0xff9a40),0,9,2);L.position.set(x,2.1,z+0.2);parent.add(L);}
  return L;
}

/* ---------- arch, board, rear gate, balloons ---------- */
var balloons=[];
(function(){
  var ax=RC0,az=1.2;
  [-1.95,1.95].forEach(function(dx){var p=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.14,4.4,10),woodPoleM);p.position.set(ax+dx,2.2,az);p.castShadow=true;scene.add(p);});
  var bg=new THREE.PlaneGeometry(4.1,1.2,24,4),bp=bg.attributes.position;for(var i=0;i<bp.count;i++)bp.setZ(i,Math.sin(bp.getX(i)*1.7)*0.06);bg.computeVertexNormals();
  var b=new THREE.Mesh(bg,basicMap(bannerTex,0.95));b.position.set(ax,3.75,az-0.06);b.rotation.y=Math.PI;scene.add(b);
  var bx=new THREE.Mesh(new THREE.BoxGeometry(4.2,1.3,0.06),sm(0x2a1a4d,0.8));bx.position.set(ax,3.75,az+0.04);scene.add(bx);
  var bpos=new V3(RC0-3.6,2.3,-11.5),bd=new THREE.Mesh(new THREE.PlaneGeometry(1,1),basicMap(promiseTex,0.8));
  bd.scale.set(3.2,2.6,1);bd.position.copy(bpos);bd.rotation.y=Math.atan2(36-bpos.x,-40-bpos.z);scene.add(bd);
  var back=new THREE.Mesh(new THREE.BoxGeometry(3.3,2.7,0.08),woodPoleM);back.position.copy(bpos);back.rotation.y=bd.rotation.y;back.translateZ(-0.06);back.castShadow=true;scene.add(back);
  [-1.2,1.2].forEach(function(dx){var s=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,2.4,8),woodPoleM);s.position.set(bpos.x+dx*Math.cos(bd.rotation.y),1.2,bpos.z-dx*Math.sin(bd.rotation.y));s.castShadow=true;scene.add(s);});
  var bc=[0xff6b6b,0x4dabf7,0xffd43b,0x69db7c,0xda77f2];
  for(var k=0;k<10;k++){
    var side=k%2?1:-1,bx2=ax+side*(2.5+Math.random()*1.4),bz=az+(Math.random()-0.5)*3;
    var bl=new THREE.Mesh(new THREE.SphereGeometry(0.42,24,18),sm(bc[k%5],0.25,0));bl.scale.y=1.2;bl.position.set(bx2,4.7+Math.random()*1.6,bz);bl.castShadow=true;scene.add(bl);
    var st=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,2.7,4),sm(0xffffff,0.8));st.position.set(bx2,3.3,bz);scene.add(st);
    balloons.push({m:bl,y:bl.position.y,ph:Math.random()*6});
  }
  var sb=new THREE.Mesh(new THREE.PlaneGeometry(6,1.6),basicMap(sumTex,0.95));sb.position.set(0,16.4,-2);scene.add(sb);
  [-2.8,2.8].forEach(function(dx){var p=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,3.2,8),woodPoleM);p.position.set(dx,14.7,-2);scene.add(p);});
  makeTorch(scene,XF-2.2,-14.5,false);makeTorch(scene,XF+2.2,-14.5,false);
})();
var rearGate=new THREE.Group();rearGate.position.set(RC0-1.9,0,-3.8);scene.add(rearGate);
(function(){
  var post=new THREE.Mesh(new THREE.BoxGeometry(0.22,1.6,0.22),woodPoleM);post.position.set(0,0.8,0);post.castShadow=true;rearGate.add(post);
  var arm=new THREE.Mesh(new THREE.BoxGeometry(3.8,0.9,0.12),sm(0xffffff,0.55,0.05,{map:tStripe}));arm.position.set(1.9,0.95,0);arm.castShadow=true;rearGate.add(arm);
  var stop=new THREE.Mesh(new THREE.BoxGeometry(0.22,1.6,0.22),woodPoleM);stop.position.set(3.9,0.8,0);stop.castShadow=true;rearGate.add(stop);
})();
rearGate.rotation.y=Math.PI/2;

/* ---------- characters ---------- */
var clothBump=makeTex(64,64,function(u,v,px,py){var g=128+(hash2(px*0.9,py*0.7)-0.5)*110;return [g,g,g];},false,6);
function limbMesh(rt,rb,h,m){var g=new THREE.CylinderGeometry(rt,rb,h,12);var me=new THREE.Mesh(g,m);me.position.y=-h/2;return me;}
function makeChar(o){
  var g=new THREE.Group(),p={group:g};
  var skinM=sm(o.skin||0xd9a679,0.55),shirtM=sm(o.shirt,0.85,0,{bumpMap:clothBump,bumpScale:0.05}),sleeveM=sm(o.shirt,0.85,0,{bumpMap:clothBump,bumpScale:0.05}),pantsM=sm(o.pants||0x2d3350,0.85,0,{bumpMap:clothBump,bumpScale:0.05});
  p.skinMat=skinM;p.shirtMat=shirtM;p.sleeveMat=sleeveM;
  function add(geo,m,x,y,z,parent){var me=new THREE.Mesh(geo,m);me.position.set(x,y,z);(parent||g).add(me);return me;}
  var pel=add(new THREE.SphereGeometry(0.19,16,12),pantsM,0,0.95,0);pel.scale.set(1.05,0.75,0.8);
  var torso=add(new THREE.CylinderGeometry(0.245,0.19,0.64,20),shirtM,0,1.25,0);torso.scale.z=o.belly?0.86:0.66;p.body=torso;
  var chest=add(new THREE.SphereGeometry(0.245,18,12),shirtM,0,1.48,0);chest.scale.set(1,0.55,0.66);
  p.collar=add(new THREE.TorusGeometry(0.1,0.025,8,16),shirtM,0,1.57,0);p.collar.rotation.x=Math.PI/2;
  add(new THREE.CylinderGeometry(0.065,0.075,0.12,12),skinM,0,1.6,0);
  var head=new THREE.Group();head.position.set(0,1.62,0);g.add(head);p.head=head;
  var skull=add(new THREE.SphereGeometry(0.225,24,18),skinM,0,0.22,0,head);skull.scale.set(1,1.1,1.02);
  [-1,1].forEach(function(s){
    var ew=add(new THREE.SphereGeometry(0.04,12,8),sm(0xffffff,0.3),0.085*s,0.27,0.185,head);ew.scale.set(1,0.8,0.5);
    add(new THREE.SphereGeometry(0.022,10,8),sm(0x1a1208,0.2),0.085*s,0.27,0.2,head);
    var br=add(new THREE.BoxGeometry(0.075,0.014,0.02),sm(o.hair||0x1a1a1a,0.8),0.085*s,0.325,0.2,head);br.rotation.z=-0.12*s;
    add(new THREE.SphereGeometry(0.042,10,8),skinM,0.225*s,0.21,0,head).scale.set(0.5,1,0.8);
  });
  var nose=add(new THREE.SphereGeometry(0.035,10,8),skinM,0,0.2,0.222,head);nose.scale.set(0.9,1.2,1.1);
  add(new THREE.BoxGeometry(0.075,0.011,0.012),sm(0x7a2a2a,0.5),0,0.115,0.213,head);
  var hair=add(new THREE.SphereGeometry(0.235,20,12,0,Math.PI*2,0,Math.PI*0.52),sm(o.hair||0x1a1a1a,0.7),0,0.235,-0.01,head);hair.rotation.x=-0.3;
  if(o.mustache)add(new THREE.BoxGeometry(0.13,0.022,0.03),sm(o.hair||0x1a1a1a,0.8),0,0.147,0.216,head);
  function arm(sx,name,name2){
    var sh=new THREE.Group();sh.position.set(0.31*sx,1.47,0);g.add(sh);p[name]=sh;
    add(new THREE.SphereGeometry(0.085,12,10),sleeveM,0,0,0,sh);
    sh.add(limbMesh(0.07,0.058,0.34,sleeveM));
    var el=new THREE.Group();el.position.y=-0.34;sh.add(el);p[name2]=el;
    add(new THREE.SphereGeometry(0.06,10,8),sleeveM,0,0,0,el);
    el.add(limbMesh(0.058,0.046,0.3,sleeveM));
    add(new THREE.SphereGeometry(0.058,12,10),skinM,0,-0.33,0,el);
  }
  arm(-1,'armL','armL2');arm(1,'armR','armR2');
  function leg(sx,name,name2,footName){
    var hp=new THREE.Group();hp.position.set(0.105*sx,0.95,0);g.add(hp);p[name]=hp;
    hp.add(limbMesh(0.098,0.072,0.46,pantsM));
    var kn=new THREE.Group();kn.position.y=-0.46;hp.add(kn);p[name2]=kn;
    add(new THREE.SphereGeometry(0.074,10,8),pantsM,0,0,0,kn);
    kn.add(limbMesh(0.068,0.052,0.46,pantsM));
    add(new THREE.BoxGeometry(0.1,0.05,0.22),skinM,0,-0.45,0.06,kn);
    if(o.slippers){var sl=add(new THREE.BoxGeometry(0.115,0.03,0.29),sm(0x3a2a22,0.6),0,-0.468,0.07,kn);var strap=add(new THREE.BoxGeometry(0.11,0.03,0.05),sm(0x3a2a22,0.6),0,-0.44,0.1,kn);sl.add(strap);strap.position.set(0,0.03,0.03);p[footName]=sl;}
    else{add(new THREE.BoxGeometry(0.115,0.075,0.29),sm(o.shoe||0x2b211c,0.45,0.05),0,-0.43,0.07,kn);}
  }
  leg(-1,'legL','legL2','slipL');leg(1,'legR','legR2','slipR');
  if(o.scarf){var sc=add(new THREE.TorusGeometry(0.16,0.055,10,20),sm(o.scarf,0.7),0,1.56,0);sc.rotation.x=Math.PI/2;var tail=add(new THREE.BoxGeometry(0.11,0.4,0.03),sm(o.scarf,0.7),0.1,1.37,0.17);tail.rotation.z=0.12;}
  if(o.kurta){var ku=add(new THREE.CylinderGeometry(0.21,0.33,0.62,20),shirtM,0,0.7,0);ku.scale.z=0.85;}
  g.traverse(function(m){if(m.isMesh)m.castShadow=true;});
  return p;
}
function walkAnim(c,ph,amp){
  if(c.rb)return;
  var s=Math.sin(ph);
  c.legL.rotation.x=-s*amp*0.9;c.legR.rotation.x=s*amp*0.9;
  c.legL2.rotation.x=Math.max(0,Math.cos(ph))*amp*1.3;c.legR2.rotation.x=Math.max(0,-Math.cos(ph))*amp*1.3;
  c.armL.rotation.x=s*amp*0.7;c.armR.rotation.x=-s*amp*0.7;
  c.armL2.rotation.x=-0.22-Math.max(0,-s)*amp*0.5;c.armR2.rotation.x=-0.22-Math.max(0,s)*amp*0.5;
}
function turnTo(g,yaw,k){var d=yaw-g.rotation.y;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;g.rotation.y+=d*Math.min(1,k);}

var player=makeChar({shirt:0x6fb1e6,pants:0x33384f,skin:0xd9a679,slippers:true,hair:0x1a1410});
scene.add(player.group);
(function(){
  var gold=sm(0xf2c230,0.22,1.0);
  player.chain=new THREE.Group();player.chain.position.set(0,1.5,0.02);player.chain.rotation.x=0.35;
  var tor=new THREE.Mesh(new THREE.TorusGeometry(0.2,0.022,10,28),gold);tor.rotation.x=Math.PI/2;player.chain.add(tor);
  var pend=new THREE.Mesh(new THREE.SphereGeometry(0.04,12,10),gold);pend.position.set(0,0,0.2);player.chain.add(pend);player.group.add(player.chain);
  player.ring=new THREE.Mesh(new THREE.TorusGeometry(0.04,0.011,8,14),gold);player.ring.position.set(0.0,-0.31,0.03);player.ring.rotation.y=Math.PI/2;player.armR2.add(player.ring);
  var wb=new THREE.Mesh(new THREE.TorusGeometry(0.06,0.014,8,16),sm(0x222222,0.4,0.6));wb.rotation.x=Math.PI/2;wb.position.set(0,-0.24,0);
  var wf=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.016,14),sm(0xdadfe6,0.2,0.8));wf.position.set(0,0,0.062);wf.rotation.x=Math.PI/2;wb.add(wf);
  player.watch=wb;player.armL2.add(wb);
  var sg=new THREE.Group();
  [-0.085,0.085].forEach(function(dx){var r=new THREE.Mesh(new THREE.TorusGeometry(0.06,0.009,8,18),sm(0x222222,0.3,0.6));r.position.set(dx,0,0);sg.add(r);
    var l=new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.058,0.004,16),new THREE.MeshStandardMaterial({color:C(0xcfe6f2),roughness:0.05,metalness:0.1,transparent:true,opacity:0.28}));l.rotation.x=Math.PI/2;l.position.set(dx,0,0);sg.add(l);
    var tp=new THREE.Mesh(new THREE.BoxGeometry(0.006,0.006,0.19),sm(0x222222,0.4,0.5));tp.position.set(dx*2.5,0,-0.09);sg.add(tp);});
  var br=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.008,0.008),sm(0x222222,0.4,0.5));sg.add(br);sg.position.set(0,0.27,0.215);player.specs=sg;player.head.add(sg);
  var pur=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.15,0.06),sm(0x5a3a22,0.65,0,{map:woodTex}));pur.position.set(0.11,0.88,0.17);pur.rotation.z=0.1;player.purse=pur;pur.visible=false;player.group.add(pur);
  var cash=new THREE.Mesh(new THREE.BoxGeometry(0.17,0.05,0.04),sm(0x2fbf6e,0.7));cash.position.set(0,0.09,0);pur.add(cash);
  player.cap=new THREE.Group();
  var cone=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.5,20),sm(0xd62839,0.45));cone.position.y=0.25;player.cap.add(cone);
  var lbl=new THREE.Mesh(new THREE.PlaneGeometry(0.3,0.15),new THREE.MeshBasicMaterial({map:capLabelTex,side:THREE.DoubleSide}));lbl.position.set(0,0.2,0.15);lbl.rotation.x=-0.3;player.cap.add(lbl);
  var pom=new THREE.Mesh(new THREE.SphereGeometry(0.05,10,8),sm(0xffd43b,0.5));pom.position.y=0.52;player.cap.add(pom);
  player.cap.position.y=0.42;player.cap.visible=false;player.head.add(player.cap);
})();
player.head.scale.setScalar(0.88);
(function(){
  var dark=sm(0x1c2030,0.9);
  var belt=new THREE.Mesh(new THREE.TorusGeometry(0.2,0.016,8,24),sm(0x2a1c14,0.6));belt.rotation.x=Math.PI/2;belt.position.set(0,1.02,0);belt.scale.set(1.02,0.8,1);player.group.add(belt);
  var seam=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.15,0.1),dark);seam.position.set(0.2,0.93,0.07);seam.rotation.set(0,-0.3,0.12);player.group.add(seam);
  var seam2=seam.clone();seam2.position.x=-0.2;seam2.rotation.set(0,0.3,-0.12);player.group.add(seam2);
})();
var noteTex=mkTex(160,70,function(x,w,h){x.fillStyle='#aeb7a2';x.fillRect(0,0,w,h);x.strokeStyle='#5c6b52';x.lineWidth=4;x.strokeRect(4,4,w-8,h-8);x.fillStyle='#7d8b70';x.fillRect(w*0.7,8,w*0.2,h-16);x.fillStyle='#2f3a2a';x.font='700 30px sans-serif';x.textAlign='left';x.textBaseline='middle';x.fillText('\u20B9500',14,h/2);});
var BNG=null,BNE=null,BNF=null,BNM=null;
function makeBundle(n){
  if(!BNG){BNG=new THREE.BoxGeometry(0.15,0.004,0.07);BNE=sm(0xe8e6da,0.8);BNF=sm(0xffffff,0.6,0,{map:noteTex});BNM=[BNE,BNE,BNF,BNF,BNE,BNE];}
  var gp=new THREE.Group(),mats=BNM;
  for(var i=0;i<n;i++){var nm=new THREE.Mesh(BNG,mats);nm.position.set((i%3-1)*0.004,i*0.0045,(i%2)*0.003);nm.rotation.y=(i%5-2)*0.03;gp.add(nm);}
  gp.traverse(function(m){if(m.isMesh)m.castShadow=false;});return gp;
}
player.pocketCash=makeBundle(12);player.pocketCash.rotation.set(Math.PI/2-0.25,0,0.12);player.pocketCash.position.set(-0.17,1.0,0.13);player.pocketCash.scale.set(1.15,1.15,1.15);player.group.add(player.pocketCash);
function setPocket(){player.pocketCash.visible=S.wallet>1;player.pocketCash.children.forEach(function(c,i){c.visible=i<Math.max(1,Math.ceil(12*S.wallet/TOTAL));});}
function restorePlayer(){
  [player.chain,player.ring,player.watch,player.specs,player.pocketCash,player.slipL,player.slipR,player.collar].forEach(function(m){m.visible=true;});
  setC(player.shirtMat,0x6fb1e6);setC(player.sleeveMat,0x6fb1e6);player.cap.visible=false;
  player.head.rotation.set(0,0,0);player.armR.rotation.x=0;
}
var vb=makeChar({shirt:0xf4efe6,pants:0xf4efe6,skin:0xc99467,scarf:0x7a2fc0,hair:0xdcdcdc,kurta:true,belly:true,mustache:true});
/* ---- summit standee: the user's supplied caricature image, used UNCHANGED as a cardboard cutout ---- */
var STD={ready:false,g:null,H:2.3};
(function(){try{
  var img=new Image();img.onload=function(){try{
    var tex=new THREE.Texture(img);tex.needsUpdate=true;tex.anisotropy=4;if(THREE.sRGBEncoding)tex.encoding=THREE.sRGBEncoding;
    var H=STD.H,W=H*img.width/img.height,g=new THREE.Group();
    var front=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:0.45,side:THREE.FrontSide}));front.position.set(0,H/2,0.02);
    var back=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({map:tex,color:0xb98a55,transparent:true,alphaTest:0.45,side:THREE.FrontSide}));back.position.set(0,H/2,-0.05);back.rotation.y=Math.PI;
    var foot=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.05,0.5),new THREE.MeshStandardMaterial({color:0x8a5a2b,roughness:0.9}));foot.position.set(0,0.025,-0.02);
    var sh=new THREE.Mesh(new THREE.CircleGeometry(0.55,24),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.28,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.position.y=0.01;sh.scale.set(1.1,0.7,1);
    g.add(sh,foot,back,front);g.userData.W=W;
    STD.g=g;STD.body=new THREE.Group();STD.ready=true;
  }catch(e){}};
  img.onerror=function(){};
  img.src='/*STANDEE_B64*/';
}catch(e){}})();
scene.add(vb.group);vb.group.visible=false;
(function(){
  var hat=new THREE.Mesh(new THREE.ConeGeometry(0.17,0.42,16),sm(0xffd43b,0.45));hat.position.y=0.62;vb.head.add(hat);
  var pm=new THREE.Mesh(new THREE.SphereGeometry(0.045,10,8),sm(0xda77f2,0.6));pm.position.y=0.85;vb.head.add(pm);
  var sg=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.07,0.05),sm(0x0a0a0a,0.15,0.4));sg.position.set(0,0.27,0.215);vb.head.add(sg);
  var gold=sm(0xf2c230,0.22,1.0);var ch=new THREE.Mesh(new THREE.TorusGeometry(0.22,0.03,10,28),gold);ch.rotation.x=Math.PI/2+0.4;ch.position.set(0,1.5,0.04);vb.group.add(ch);
})();

/* guests */
var guests=[];
(function(){
  var cols=[0x8a5a44,0x4a6a8a,0x6a8a4a,0xb08a3a,0x7a4a8a,0x8a4a5a,0x3a6a6a],pants=[0x2d3350,0x4a3a2a,0x2a2a2a,0x3a4a3a];
  var spots=[[XF-3.3,-33,1],[XF+3.3,-30,-1],[XF-3.5,-26,1],[XF+3.4,-23,-1],[XF-3.3,-19,1],[XF+3.5,-17,-1],[RC0-2.8,-5.2,1],[RC0+2.8,-6.5,-1],[RC0-3.0,-3.6,1],[RC0+3.2,-3,-1]];
  spots.forEach(function(sp,i){
    var ch=makeChar({shirt:cols[i%7],pants:pants[i%4],skin:[0xd9a679,0xc58f5f,0xb27a50,0xe0b48c][i%4],hair:[0x1a1410,0x2a1c14,0x3a2a1c][i%3],mustache:i%3===0});
    ch.group.position.set(sp[0],0.04,sp[1]);ch.group.rotation.y=sp[2]>0?Math.PI/2:-Math.PI/2;
    ch.armR.rotation.x=-0.6;ch.ph=Math.random()*6;scene.add(ch.group);guests.push(ch);
  });
})();

/*ENVJS*/
/* ---------- gates ---------- */
var steel=sm(0x4a4f5c,0.35,0.75);
var gates=gateDefs.map(function(d,i){
  var base=P(d.t,0,new V3()),f2=f2At(d.t,new V3()),right=new V3(-f2.z,0,f2.x);
  var grp=new THREE.Group();grp.position.copy(base);grp.rotation.y=Math.atan2(-f2.x,-f2.z);scene.add(grp);
  var postL=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,3.1,10),woodPoleM);postL.position.set(-1.45,1.55,0);postL.castShadow=true;grp.add(postL);
  var postR=postL.clone();postR.position.x=1.7;grp.add(postR);
  var beam=new THREE.Mesh(new THREE.BoxGeometry(3.5,0.14,0.14),woodPoleM);beam.position.set(0.12,3.15,0);beam.castShadow=true;grp.add(beam);
  var sign=new THREE.Mesh(new THREE.PlaneGeometry(3.3,1.03),basicMap(signTex(d.sign.l1,d.sign.l2),0.95));sign.position.set(0.12,2.65,0.02);grp.add(sign);
  var sback=new THREE.Mesh(new THREE.BoxGeometry(3.34,1.07,0.05),sm(0x2a1a4d,0.8));sback.position.set(0.12,2.65,-0.03);grp.add(sback);
  var light=makeTorch(grp,-1.95,0.3,true);
  var open=function(){};
  if(d.kind==='boom'||d.kind==='flag'){
    var pv=new THREE.Group();pv.position.set(1.7,d.kind==='boom'?0.95:1.05,0);grp.add(pv);var len=3.4;
    var arm=d.kind==='boom'?new THREE.Mesh(new THREE.BoxGeometry(len,0.18,0.18),sm(0xffffff,0.5,0.05,{map:tStripe})):new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,len,8),sm(0x8a6a3a,0.7));
    if(d.kind==='flag')arm.rotation.z=Math.PI/2;arm.position.x=-len/2;arm.castShadow=true;pv.add(arm);
    if(d.kind==='flag'){var fg=new THREE.Mesh(new THREE.PlaneGeometry(0.85,0.55,8,3),new THREE.MeshStandardMaterial({color:C(0xd62839),roughness:0.8,side:THREE.DoubleSide}));var fp=fg.geometry.attributes.position;for(var q=0;q<fp.count;q++)fp.setZ(q,Math.sin(fp.getX(q)*6)*0.05);fg.geometry.computeVertexNormals();fg.position.set(-len+0.5,-0.3,0);pv.add(fg);}
    var sp=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,1.05,10),steel);sp.position.set(1.7,0.5,0);sp.castShadow=true;grp.add(sp);
    open=function(p){pv.rotation.z=-1.35*p;};
  }else if(d.kind==='cones'){
    var cones=[];
    for(var k=0;k<7;k++){var cg=new THREE.Group();cg.position.set(-1.35+k*0.5,0,0);var c=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.7,16),sm(0xff6a1a,0.5));c.position.y=0.35;c.castShadow=true;cg.add(c);var br=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.13,0.1,14),sm(0xffffff,0.4));br.position.y=0.38;cg.add(br);var bs=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.04,0.42),sm(0x222222,0.7));bs.position.y=0.02;cg.add(bs);grp.add(cg);cones.push(cg);}
    open=function(p){cones.forEach(function(c,k){c.rotation.z=(k%2?1:-1)*1.45*p;c.position.y=0.2*p;});};
  }else if(d.kind==='chain'){
    var ch=new THREE.Mesh(new THREE.TorusGeometry(0.06,0.014,6,10),steel),chainG=new THREE.Group();chainG.position.set(0.05,1.0,0);grp.add(chainG);
    for(var l=0;l<28;l++){var lk=new THREE.Mesh(ch.geometry,steel);lk.position.x=-1.7+l*0.125;lk.rotation.x=l%2?Math.PI/2:0;lk.scale.set(1.2,1,1);chainG.add(lk);}
    [-1.75,1.8].forEach(function(x,ix){var m=makeChar({shirt:0x555a66,pants:0x2d3350,scarf:0x6a2fb0,mustache:true});m.group.position.set(x,0,0);m.group.rotation.y=ix?-Math.PI/2:Math.PI/2;m.armR.rotation.x=-1.2;m.armL.rotation.x=-1.2;grp.add(m.group);});
    open=function(p){chainG.position.y=1.0-0.93*p;chainG.rotation.x=0.3*p;};
  }else{
    var plateM=new THREE.Mesh(new THREE.BoxGeometry(3.2,0.08,1.0),sm(0x3b3f4d,0.5,0.6));plateM.position.set(-0.05,0.05,0);plateM.receiveShadow=true;grp.add(plateM);
    var sp2=new THREE.Group();grp.add(sp2);
    for(var a=0;a<9;a++)for(var b=0;b<2;b++){var s=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.34,8),sm(0xc9ced8,0.25,0.9));s.position.set(-1.45+a*0.36,0.25,-0.2+b*0.4);s.castShadow=true;sp2.add(s);}
    var mb=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.9,0.6),sm(0x4a4f63,0.45,0.6));mb.position.set(1.95,0.45,0);mb.castShadow=true;grp.add(mb);
    var lamp=new THREE.Mesh(new THREE.SphereGeometry(0.1,12,10),new THREE.MeshBasicMaterial({color:new THREE.Color(3,0.3,0.2)}));lamp.position.set(1.95,1.0,0.1);grp.add(lamp);postR.material=postR.material.clone();grp.userData.nearFade={meshes:[mb,lamp,postR],a:[1,1,1]};
    open=function(p){sp2.scale.y=1-0.97*p;plateM.position.y=0.05-0.12*p;lamp.material.color.setRGB(p>0.5?0.2:3,p>0.5?2.6:0.3,p>0.5?0.5:0.2);};
  }
  var col=makeChar({shirt:collCols[i],pants:0x2d3350,scarf:0x7a2fc0,skin:0xc99467,mustache:true,belly:i%2===0});
  var rest=base.clone().addScaledVector(right,-1.45).addScaledVector(f2,2.1);
  col.group.position.copy(rest);col.group.rotation.y=Math.atan2(-f2.x,-f2.z);scene.add(col.group);
  var G={def:d,idx:i,t:d.t,stopT:d.t-2.4/dsAt(d.t),grp:grp,open:null,openAmt:0,col:col,rest:rest,f2:f2,done:false,light:light};
  G.open=function(p){G.openAmt=p;open(p);};return G;
});

/* confetti + dust */
var CN=110,cT=0,cpos=new Float32Array(CN*3),ccol=new Float32Array(CN*3),cvel=[],cact=false;
var cgeo=new THREE.BufferGeometry();cgeo.setAttribute('position',new THREE.BufferAttribute(cpos,3));cgeo.setAttribute('color',new THREE.BufferAttribute(ccol,3));
var cpts=new THREE.Points(cgeo,new THREE.PointsMaterial({size:0.085,vertexColors:true,transparent:true,opacity:0.95}));cpts.frustumCulled=false;cpts.visible=false;scene.add(cpts);
function burst(c){
  var pal=[[1,0.42,0.42],[0.3,0.67,0.97],[1,0.83,0.23],[0.41,0.86,0.49],[0.85,0.47,0.95]];cvel=[];
  for(var i=0;i<CN;i++){cpos[i*3]=c.x+(Math.random()-0.5)*0.8;cpos[i*3+1]=c.y+2.5;cpos[i*3+2]=c.z+(Math.random()-0.5)*0.8;var cl=pal[i%5];ccol[i*3]=cl[0];ccol[i*3+1]=cl[1];ccol[i*3+2]=cl[2];cvel.push([(Math.random()-0.5)*5,2.5+Math.random()*4,(Math.random()-0.5)*5]);}
  cgeo.attributes.position.needsUpdate=true;cgeo.attributes.color.needsUpdate=true;cpts.visible=true;cact=true;cT=2.6;
}
var DN=260,dpos=new Float32Array(DN*3),dgeo=new THREE.BufferGeometry();
for(var di=0;di<DN;di++){dpos[di*3]=(Math.random()-0.5)*18;dpos[di*3+1]=Math.random()*7;dpos[di*3+2]=(Math.random()-0.5)*18;}
dgeo.setAttribute('position',new THREE.BufferAttribute(dpos,3));
var dust=new THREE.Points(dgeo,new THREE.PointsMaterial({size:0.09,map:glowTex,color:C(0xffe2b0),transparent:true,opacity:0.7,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));dust.frustumCulled=false;scene.add(dust);
for(var fgI=0;fgI<14;fgI++){
  var fs=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:C(0xf3cfb4),transparent:true,opacity:0.2,depthWrite:false}));
  var fa=Math.random()*Math.PI*2,fr=24+Math.random()*30;fs.position.set(Math.cos(fa)*fr,1.6+Math.random()*2,Math.sin(fa)*fr);fs.scale.set(34,9,1);scene.add(fs);
}

/* ---------- UI ---------- */
var el={wallet:$('wallet'),vwallet:$('vwallet'),wAmt:$('wAmt'),vAmt:$('vAmt'),notes:$('notes'),pop:$('pop'),popLab:$('popLab'),popTel:$('popTel'),popEn:$('popEn'),laugh:$('laugh'),introBar:$('introBar'),startBar:$('startBar'),hint:$('hintBar'),result:$('result')};
var noteEls=[];
function buildNotes(){el.notes.innerHTML='';noteEls=[];for(var i=0;i<50;i++){var n=document.createElement('span');n.className='note';el.notes.appendChild(n);noteEls.push(n);}}
var NF=null;try{NF=new Intl.NumberFormat('en-IN',{maximumFractionDigits:0});}catch(e){}
function money(n){var r=Math.round(n);return '₹'+(NF?NF.format(r):r.toLocaleString('en-IN'));}
var popT=null;
function placePop(){try{el.pop.style.top='';var sr=stage.getBoundingClientRect(),pw=el.pop.offsetWidth,pl=sr.left+(sr.width-pw)/2,pr=pl+pw,pt=sr.top+sr.height*0.15,b=0;[el.wallet,el.vwallet].forEach(function(w){if(w&&!w.classList.contains('hide')){var r=w.getBoundingClientRect();if(r.width>0&&r.left<pr&&r.right>pl&&r.bottom>pt-4)b=Math.max(b,r.bottom-sr.top);}});if(b>0)el.pop.style.top=(b+16)+'px';}catch(e){}}
var POPUPS=/*POPUPS*/{popups:[]};
function popTxt(id,fb){var a=POPUPS.popups||[];for(var i=0;i<a.length;i++)if(a[i].id===id&&typeof a[i].text==='string'&&a[i].text.length)return a[i].text;return fb;}
function popLevel(id,fb){var a=POPUPS.popups||[];for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i].level||fb;return fb;}
function showPop(lab,tel,en,ms){AU.play('pop');AU.duck('pop',true);clearTimeout(window.__dk);window.__dk=setTimeout(function(){AU.duck('pop',false);},(ms||3400)+500);el.popLab.textContent=lab;el.popTel.textContent=tel;el.popEn.textContent=en||'';placePop();[90,350,800].forEach(function(d){setTimeout(function(){if(el.pop.classList.contains('show'))placePop();},d);});el.pop.classList.add('show');clearTimeout(popT);popT=setTimeout(function(){el.pop.classList.remove('show');},ms||3400);}
/* ---------- audio (procedural WebAudio: music + sfx) ---------- */
var AU=(function(){
  var ctx=null,master,musG,sfxG,bgG,noiseBuf,on=true,musicOn=true,mode='all',held=false,started=false,nextT=0,stepI=0,tmr=null,BPM=104;
  var BGM_LOOP_START=2.0,BGM_LOOP_END=45.8829,BGM_B64='/*BGM_B64*/',BGM_URL='assets/audio/vasool_bgm_from_0045.mp3',BGM_LEVEL=0.18,BGM_DUCK=0.08;
  var bgm={state:'idle',buf:null,src:null,lg:null,t0:0,n:0,from:'-'},ducks={};
  try{var sv=localStorage.getItem('vb_snd');if(sv==='0'||sv==='off')mode='off';else if(sv==='sfx')mode='sfx';}catch(e){}
  on=mode!=='off';musicOn=mode==='all';
  var BASE=146.83; // D3
  function hz(semi,oct){return BASE*Math.pow(2,(semi+12*(oct||0))/12);}
  function ensure(){
    if(ctx)return true;
    var C=window.AudioContext||window.webkitAudioContext;if(!C)return false;
    try{ctx=new C();}catch(e){return false;}
    var comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=5;
    master=ctx.createGain();master.gain.value=on?0.9:0;master.connect(comp);comp.connect(ctx.destination);
    musG=ctx.createGain();musG.gain.value=0.5;musG.connect(master);
    sfxG=ctx.createGain();sfxG.gain.value=1;sfxG.connect(master);
    bgG=ctx.createGain();bgG.gain.value=0;bgG.connect(master);
    noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);var d=noiseBuf.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    return true;
  }
  function tone(f,dur,type,vol,t,o){
    o=o||{};var os=ctx.createOscillator(),g=ctx.createGain(),dst=o.dst||sfxG;
    os.type=type||'sine';os.frequency.setValueAtTime(f,t);if(o.to)os.frequency.exponentialRampToValueAtTime(o.to,t+dur);
    var node=os;if(o.lp){var fl=ctx.createBiquadFilter();fl.type='lowpass';fl.frequency.setValueAtTime(o.lp,t);if(o.lpTo)fl.frequency.exponentialRampToValueAtTime(o.lpTo,t+dur);os.connect(fl);node=fl;}
    node.connect(g);g.connect(dst);
    var a=o.a||0.005;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    os.start(t);os.stop(t+dur+0.05);
  }
  function noise(dur,ftype,f,vol,t,o){
    o=o||{};var s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();
    s.buffer=noiseBuf;s.loop=true;fl.type=ftype;fl.frequency.setValueAtTime(f,t);if(o.to)fl.frequency.exponentialRampToValueAtTime(o.to,t+dur);fl.Q.value=o.q||1;
    s.connect(fl);fl.connect(g);g.connect(o.dst||sfxG);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+(o.a||0.004));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.start(t,Math.random()*0.5);s.stop(t+dur+0.05);
  }
  /* ----- music: 2-bar loop, D phrygian-dominant, dhol + tabla + plucks ----- */
  var MEL=[12,null,10,null,8,7,null,4, 5,null,4,null,1,null,0,null, 0,null,4,5,7,null,8,7, 5,4,null,5,4,1,0,null];
  var BAS=[0,null,null,0,null,null,0,null, 7,null,null,7,null,null,5,null, 0,null,null,0,null,null,0,null, 8,null,null,7,null,null,5,null];
  function music(i,t){
    var s=i%32,m=MEL[s],b=BAS[s],d=0.5*60/BPM;
    // dhol: boom on 0,6,10,16,22,26 ; tak on 4,12,20,28 (+ fills)
    if(s===0||s===6||s===10||s===16||s===22||s===26)tone(110,0.22,'sine',0.9,t,{to:45,dst:musG});
    if(s===4||s===12||s===20||s===28||s===30){noise(0.07,'bandpass',2400,0.45,t,{q:2,dst:musG});tone(260,0.08,'triangle',0.25,t,{to:180,dst:musG});}
    if(s%2===1)noise(0.03,'highpass',7500,0.16,t,{dst:musG});          // shaker
    if(s%8===2||s%8===5)tone(520,0.06,'sine',0.25,t,{to:380,dst:musG});    // tabla
    if(b!==null)tone(hz(b,-1),d*2.4,'triangle',0.65,t,{lp:700,dst:musG});
    if(m!==null){tone(hz(m,1),d*2.2,'sawtooth',0.17,t,{lp:2800,lpTo:600,dst:musG,a:0.006});tone(hz(m,1)*2.003,d*1.2,'sine',0.07,t,{dst:musG});}
    if(s===0)tone(hz(0,0),d*30,'sine',0.12,t,{dst:musG,a:0.4});          // drone
  }
  function sched(){
    if(!ctx||ctx.state!=='running')return;
    var d=0.5*60/BPM;if(nextT<ctx.currentTime-0.5)nextT=ctx.currentTime+0.05;
    while(nextT<ctx.currentTime+0.25){if(bgm.state==='fail'&&musicOn)music(stepI,nextT);stepI++;nextT+=d;}
  }
  /* ----- supplied recording (from 00:45 to the end): ONE looping source, quiet bed, ducks under toll/dialogue ----- */
  function musLevel(){return musicOn?(Object.keys(ducks).some(function(k){return ducks[k];})?BGM_DUCK:BGM_LEVEL):0;}
  function applyMus(){if(!ctx||!bgG)return;var du=Object.keys(ducks).some(function(k){return ducks[k];});bgG.gain.cancelScheduledValues(ctx.currentTime);bgG.gain.setTargetAtTime(musLevel(),ctx.currentTime,du?0.45:0.7);}
  function startBgm(){
    if(bgm.src||!bgm.buf||!ctx)return;
    var src=ctx.createBufferSource(),lg=ctx.createGain();src.buffer=bgm.buf;src.loop=true;src.loopStart=BGM_LOOP_START;src.loopEnd=BGM_LOOP_END;lg.gain.value=1; /* file = 45s->end with the last 2 s cross-faded into the first 2 s, so the loop (2.0 s -> 45.883 s) has no seam */src.connect(lg);lg.connect(bgG);
    bgm.t0=ctx.currentTime+0.05;src.start(bgm.t0);bgm.n++;bgm.src=src;bgm.lg=lg;bgm.state='ok';applyMus();
  }
  function loadBgm(){
    if(bgm.state!=='idle'||!ctx)return;bgm.state='loading';
    function dec(ab){return new Promise(function(res,rej){var p=ctx.decodeAudioData(ab,res,rej);if(p&&p.then)p.then(res,rej);});}
    function emb(){if(BGM_B64.length<200)return Promise.reject(new Error('no embedded audio'));var bin=atob(BGM_B64),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return dec(u.buffer);}
    var p;try{p=fetch(BGM_URL).then(function(r){if(!r.ok)throw new Error('http '+r.status);return r.arrayBuffer();}).then(dec);}catch(e){p=Promise.reject(e);}
    p.then(function(b){bgm.from='file';return b;}).catch(function(){bgm.from='embedded';return emb();}).then(function(b){bgm.buf=b;startBgm();}).catch(function(){bgm.state='fail';});
  }
  function duck(k,v){ducks[k]=!!v;applyMus();}
  function unlock(){
    if(held)return;if(!ensure())return;
    if(ctx.state!=='running'){try{ctx.resume();}catch(e){}}
    if(!started){started=true;nextT=ctx.currentTime+0.1;tmr=setInterval(sched,70);}
    loadBgm();
  }
  function now(){return ctx.currentTime+0.01;}
  function ok(){return ctx&&on&&ctx.state==='running';}
  var sfx={
    click:function(){var t=now();tone(660,0.07,'square',0.12,t);tone(990,0.09,'square',0.1,t+0.05);},
    pop:function(){var t=now();tone(520,0.1,'triangle',0.35,t);tone(780,0.14,'triangle',0.35,t+0.08);tone(1040,0.18,'triangle',0.3,t+0.16);},
    cash:function(){var t=now();for(var i=0;i<7;i++){noise(0.07,'bandpass',3200+Math.random()*1500,0.35,t+i*0.07,{q:3});}tone(1568,0.35,'sine',0.35,t+0.5);tone(2093,0.5,'sine',0.3,t+0.56);},
    snatch:function(){var t=now();noise(0.22,'bandpass',900,0.6,t,{to:3200,q:1.2});tone(300,0.12,'sawtooth',0.2,t,{to:600,lp:1500});},
    chain:function(){var t=now();noise(0.1,'bandpass',1400,0.5,t,{q:1.5});for(var i=0;i<11;i++){var tt=t+0.04+i*0.045+Math.random()*0.02,f=2400+Math.random()*3200;tone(f,0.09,'square',0.12,tt,{to:f*0.7});noise(0.04,'bandpass',f,0.28,tt,{q:6});}tone(180,0.2,'sine',0.7,t+0.55,{to:70});noise(0.15,'lowpass',500,0.5,t+0.55);},
    ouch:function(){var t=now();tone(520,0.35,'sawtooth',0.3,t,{to:170,lp:1800,lpTo:500});tone(780,0.3,'square',0.1,t,{to:260,lp:1500});},
    stop:function(){var t=now();tone(120,0.25,'square',0.5,t,{to:60,lp:500});noise(0.14,'bandpass',1100,0.55,t,{q:2});tone(1800,0.12,'sine',0.25,t+0.02);},
    gateOpen:function(){var t=now();tone(880,0.1,'square',0.18,t);tone(880,0.1,'square',0.18,t+0.18);tone(70,1.0,'sawtooth',0.3,t+0.4,{to:190,lp:420,lpTo:900});noise(1.0,'bandpass',500,0.18,t+0.4,{to:1400,q:3});tone(1500,0.1,'sine',0.25,t+1.4);tone(95,0.2,'sine',0.6,t+1.4,{to:60});},
    gateClose:function(){var t=now();tone(190,0.7,'sawtooth',0.28,t,{to:70,lp:900,lpTo:350});noise(0.7,'bandpass',900,0.14,t,{to:350,q:3});tone(95,0.3,'sine',0.9,t+0.7,{to:40});noise(0.18,'bandpass',900,0.7,t+0.7,{q:1});tone(1400,0.15,'sine',0.3,t+0.72);},
    slam:function(){var t=now();tone(70,0.9,'sawtooth',0.35,t,{to:45,lp:600});noise(0.5,'lowpass',400,0.8,t+0.9,{});tone(80,0.5,'sine',1,t+0.9,{to:30});noise(0.25,'bandpass',1000,0.8,t+0.9,{q:1});tone(1200,0.25,'sine',0.3,t+0.92);},
    step:function(){var t=now();noise(0.07,'lowpass',380+Math.random()*160,0.45,t,{});},
    sting:function(){var t=now(),n=[0,4,7,12,16];n.forEach(function(s,i){tone(hz(s,1),0.22,'square',0.18,t+i*0.07,{lp:3000});});noise(0.5,'highpass',5000,0.35,t+0.35);},
    wah:function(){var t=now(),n=[[7,0.45],[5,0.45],[4,0.45],[0,1.1]],tt=t;n.forEach(function(x,i){var os=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter(),lfo=ctx.createOscillator(),lg=ctx.createGain();os.type='sawtooth';os.frequency.setValueAtTime(hz(x[0],0),tt);if(i===3)os.frequency.exponentialRampToValueAtTime(hz(x[0],0)*0.8,tt+x[1]);f.type='lowpass';f.frequency.setValueAtTime(700,tt);f.Q.value=4;lfo.frequency.value=5.5;lg.gain.value=hz(x[0],0)*0.03;lfo.connect(lg);lg.connect(os.frequency);os.connect(f);f.connect(g);g.connect(sfxG);g.gain.setValueAtTime(0.0001,tt);g.gain.exponentialRampToValueAtTime(0.4,tt+0.04);g.gain.exponentialRampToValueAtTime(0.0001,tt+x[1]);os.start(tt);lfo.start(tt);os.stop(tt+x[1]+0.05);lfo.stop(tt+x[1]+0.05);tt+=x[1]*0.95;});},
    laugh:function(){var t=now();for(var i=0;i<6;i++){tone(380-i*18,0.14,'sawtooth',0.22,t+i*0.2,{to:300-i*18,lp:1400});noise(0.1,'bandpass',1200,0.12,t+i*0.2,{q:2});}},
    horn:function(){var t=now();tone(420,0.5,'sawtooth',0.25,t,{to:520,lp:1600});tone(630,0.5,'sawtooth',0.15,t,{to:780,lp:1800});noise(0.4,'highpass',6000,0.25,t+0.1);}
  };
  function play(n){if(!ok()||!sfx[n])return;try{sfx[n]();}catch(e){}}
  var LABEL={all:'Sound: On',sfx:'Music: Off',off:'Sound: Off'};
  function refresh(){
    on=mode!=='off';musicOn=mode==='all';
    if(ctx){master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(on?0.9:0,ctx.currentTime,0.05);applyMus();}
    var lab=LABEL[mode];var b=document.getElementById('sndBtn'),b2=document.getElementById('sndBtn2');
    if(b){b.setAttribute('aria-pressed',mode==='all'?'true':'false');b.setAttribute('aria-label',lab);b.setAttribute('title',lab);b.classList.toggle('off',mode==='off');b.classList.toggle('half',mode==='sfx');}
    if(b2)b2.textContent=lab;
  }
  function setMode(m){mode=m;try{localStorage.setItem('vb_snd',m);}catch(e){}refresh();if(on)unlock();}
  function setOn(v){setMode(v?'all':'off');}
  function hold(v){held=!!v;if(!ctx)return;try{if(held)ctx.suspend();else if(on)ctx.resume();}catch(e){}}
  document.addEventListener('visibilitychange',function(){if(!ctx)return;if(document.hidden){try{ctx.suspend();}catch(e){}}else if(on&&!held){try{ctx.resume();}catch(e){}}});
  ['pointerdown','keydown','touchend'].forEach(function(ev){window.addEventListener(ev,function(){unlock();},{passive:true});});
  setInterval(function(){if(started&&ctx&&ctx.state==='suspended'&&on&&!held&&!document.hidden){try{ctx.resume();}catch(e){}}},1500);
  return {level:function(){return bgG?bgG.gain.value:null;},ctxState:function(){return ctx?ctx.state:'none';},ducked:function(){return Object.keys(ducks).filter(function(k){return ducks[k];});},play:play,setOn:setOn,setMode:setMode,refresh:refresh,duck:duck,hold:hold,getMode:function(){return mode;},bgm:bgm,loop:function(){return [BGM_LOOP_START,BGM_LOOP_END];},ctx:function(){return ctx;},toggle:function(){unlock();setMode(mode==='all'?'sfx':mode==='sfx'?'off':'all');if(on)setTimeout(function(){play('click');},80);},unlock:unlock,isOn:function(){return on;}};
})();

var timers=[],anims=[],run=0;
function wait(sec){return new Promise(function(res){timers.push({left:sec,res:res});});}
function anim(dur,fn){return new Promise(function(res){anims.push({t:0,dur:dur,fn:fn,res:res});});}
var WALK_SPEED=4.6,RUN_SPEED=7.2;
var S={spd:0,recoil:0,pocketSide:-1,mode:'intro',t:0,off:0,gate:0,paid:0,vb:0,wallet:TOTAL,time:0,wph:0,shake:0,introD:0,orbit:0,showT:0};
var K={fwd:false,left:false,right:false,run:false};
function setWallet(v){S.wallet=v;el.wAmt.textContent=money(v);}
function setVb(v){S.vb=v;el.vAmt.textContent=money(v);}
function addHist(label,amt){
  var h=document.getElementById('hist');if(!h)return;var d=document.createElement('div');d.innerHTML='';var a=document.createElement('span');a.textContent=label+' ';var b=document.createElement('b');b.textContent='\u2212'+money(amt);d.appendChild(a);d.appendChild(b);h.insertBefore(d,h.firstChild);while(h.children.length>4)h.removeChild(h.lastChild);
}
function deduct(i){
  var label=i===0?'Party entry':gates[i-1].def.name;
  var amt=FEES[i],n=amt/500,from=S.wallet,toV=S.vb;
  var used=noteEls.filter(function(x){return !x.classList.contains('gone');});
  for(var k=0;k<n&&k<used.length;k++){(function(e,d){setTimeout(function(){e.classList.add('gone');},d);})(used[k],k*70);}
  var fl=document.createElement('div');fl.className='float';fl.textContent='−'+money(amt);el.wallet.appendChild(fl);setTimeout(function(){if(fl.parentNode)fl.parentNode.removeChild(fl);},1300);
  S.paid+=amt;AU.play('cash');addHist(label,amt);
  return anim(0.9,function(p){setWallet(from-amt*p);setVb(toV+amt*p);});
}

/* ---------- intro ---------- */
var WP=[new V3(XF,0,-38),new V3(XF,0,-14),new V3(RC0,0,-7),new V3(RC0,0,-1.6)];
var WPL=[];(function(){var c=0;WPL.push(0);for(var i=1;i<WP.length;i++){c+=WP[i].distanceTo(WP[i-1]);WPL.push(c);}})();
var INTRO_SPEED=3.4;
function introPos(d,out){var i=1;while(i<WP.length-1&&d>WPL[i])i++;var a=WP[i-1],b=WP[i],seg=WPL[i]-WPL[i-1],p=Math.max(0,Math.min(1,(d-WPL[i-1])/seg));out.lerpVectors(a,b,p);out.y=0.04;return Math.atan2(b.x-a.x,b.z-a.z);}
function toReady(){S.mode='ready';S.introD=WPL[WPL.length-1];el.introBar.hidden=true;el.startBar.hidden=false;}
$('skipBtn').addEventListener('click',toReady);

/* ---------- sequences ---------- */
async function startSeq(){
  var r=run;S.mode='startfx';el.startBar.hidden=true;el.wallet.classList.remove('hide');el.vwallet.classList.remove('hide');
  await wait(0.7);if(r!==run)return;
  deduct(0);{var gsT=popTxt('game_start');if(gsT)showPop(popLevel('game_start','Game Starts'),gsT,'',4600);else showPop('WELCOME','దారి తప్పి వచ్చావా? ఇక్కడ లోపలికి దారి ఉంది – బయటికి లేదు!','Lost your way? There is a way in here, not out.',3600);}
  var from=rearGate.rotation.y;AU.play('slam');
  await anim(1.1,function(p){rearGate.rotation.y=lerp(from,0,ease(p));});if(r!==run)return;
  S.shake=0.5;await wait(1.8);if(r!==run)return;
  showPop('NO WAY BACK','వెనక్కి వెళ్లే దారి లేదు','The gate behind you has closed.',2600);
  S.mode='play';el.hint.classList.add('on');S.time=0;
}
/* (retired: the old grab()/flyItem() that removed the player's belongings. Belongings now stay on the player; see inspect().) */

/* ---------- live toll payment ---------- */
var payRes=null,payPending=false,bundles=[];
function waitPay(i){el.hint.classList.remove('on');AU.duck('toll',true);clearTimeout(popT);el.pop.classList.remove('show');var g=gates[i];$('tollName').textContent=g.def.pay.title;$('tollLab').textContent=g.def.pay.label;$('tollAmt').textContent=money(g.def.pay.amount);$('payBtn').textContent=g.def.pay.button;$('toll').hidden=false;payPending=true;return new Promise(function(res){payRes=res;});}
function doPay(){if(!payPending)return;payPending=false;$('toll').hidden=true;var f=payRes;payRes=null;if(f)f(true);}
/* ---- collector grabs the toll from the player's pocket (the player never offers money) ---- */
var IKm=new THREE.Matrix4();
var T_v=new V3(),T_Tc=new V3(),T_h=new V3(),T_E=new V3(),T_e=new V3(),T_f=new V3(),T_z=new V3(),T_Y=new V3(),T_X=new V3();
function ikArm(col,sh,el,Tl){
  if(col.rb){if(!col.ikT)col.ikT=new V3();col.ikT.copy(Tl);col.ikSh=sh;}
  var S0=sh.position,v=T_v.copy(Tl).sub(S0),a=0.34,b=0.33,d=v.length();
  d=Math.max(0.2,Math.min(a+b-0.015,d));var u=v.normalize(),Tc=T_Tc.copy(S0).addScaledVector(u,d);
  var ca=(a*a+d*d-b*b)/(2*a*d),sa=Math.sqrt(Math.max(0,1-ca*ca));
  var p=T_h.set(S0.x>0?0.35:-0.35,-1,-0.2);p.addScaledVector(u,-p.dot(u)).normalize();
  var E=T_E.copy(S0).addScaledVector(u,a*ca).addScaledVector(p,a*sa);
  var e=T_e.copy(E).sub(S0).normalize(),f=T_f.copy(Tc).sub(E).normalize(),cp=Math.max(-1,Math.min(1,e.dot(f))),phi=Math.acos(cp);
  var z=T_z.copy(f).addScaledVector(e,-cp);if(z.length()<1e-4)z.set(0,0,1).addScaledVector(e,-e.z);z.normalize();
  var Y=T_Y.copy(e).negate(),X=T_X.crossVectors(Y,z);
  sh.quaternion.setFromRotationMatrix(IKm.makeBasis(X,Y,z));el.rotation.set(-phi,0,0);
}
function ikClear(col){col.ikT=null;col.armL.rotation.set(0,0,0);col.armR.rotation.set(0,0,0);col.armL2.rotation.set(-0.22,0,0);col.armR2.rotation.set(-0.22,0,0);}
async function payToll(r,i,col){
  var g=gates[i];
  await waitPay(i);if(r!==run)return false;
  S.hands=true;S.hcol=col;S.recoil=0;
  var amt=FEES[i+1],n=Math.min(12,Math.max(3,Math.round(amt/500)));
  var SP=sprActive()||PROD.on,PD=PROD.on&&prodSetOk('pair:pay/player','side',PROD.outfit)&&prodSetOk('pair:pay/collector','side',0);
  var held=makeBundle(n);held.scale.set(1.3,1.3,1.3);bundles.push(held);scene.add(held);held.visible=false;
  if(player.rb)RB.pocket(col.rb?'low':'high');
  var pg=player.group;walkAnim(player,0,0);walkAnim(col,0,0);ikClear(col);
  var fx=Math.sin(pg.rotation.y),fz=Math.cos(pg.rotation.y);               // road-forward (player facing)
  function pocketW(o){return player.pocketCash.getWorldPosition(o);}
  var Pw0=pocketW(new V3());S.pocketSide=SP?-1:(Pw0.clone().sub(pg.position).dot(new V3(fz,0,-fx))>=0?1:-1);
  var gap=PD?((PROD.man.pairs.pay.gapMeters)||0.62):0.52;
  var cpos0=col.group.position.clone(),stepIn=new V3(pg.position.x+fx*gap,cpos0.y,pg.position.z+fz*gap);
  var yaw0=col.group.rotation.y,yaw1=yaw0;function sdY(d){while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;}
  if(col.rb&&!PD){/* collector comes alongside the player's RIGHT side, slightly behind, angled towards the pocket (no face-to-face) */
    stepIn.set(pg.position.x-fz*RB.SIDE+fx*RB.FWD,cpos0.y,pg.position.z+fx*RB.SIDE+fz*RB.FWD);
    var vx=Pw0.x-stepIn.x,vz=Pw0.z-stepIn.z,vl=Math.sqrt(vx*vx+vz*vz)||1;vx=vx/vl+fx*RB.TURN;vz=vz/vl+fz*RB.TURN;yaw1=yaw0+sdY(Math.atan2(vx,vz)-yaw0);}
  /* stand so the reaching shoulder is level with the pocket (arm reaches straight in, never across the body) */
  var ya=pg.worldToLocal(Pw0.clone()).x<0?player.armL:player.armR,yo=ya===player.armL?-1:1,Y=0,Rr=0;
  function pose(){[player.armL,player.armR].forEach(function(a){var so=a===player.armL?-1:1;a.rotation.z=so*0.18*Rr+(a===ya?yo*0.32*Y:0);});ya.rotation.x=0.18*Y;}
  if(!PD&&!col.rb){var cy=col.group.rotation.y,lax=new V3(Math.cos(cy),0,-Math.sin(cy)),lxp=Pw0.clone().sub(stepIn).dot(lax),sgn=lxp>=0?1:-1,dx=lxp-(col.rb?0.21:0.31)*sgn;stepIn.addScaledVector(lax,dx);}
  var LF=new V3(fx,0,fz),LL=new V3(-fz,0,fx),r0=cpos0.clone().sub(pg.position),r1=stepIn.clone().sub(pg.position),f0=r0.dot(LF),l0=r0.dot(LL),f1=r1.dot(LF),l1=r1.dot(LL);
  function lane(e,o){var f=lerp(f0,f1,e),l=lerp(l0,l1,ease(Math.min(1,e*1.7)));o.copy(pg.position).addScaledVector(LF,f).addScaledVector(LL,l);o.y=cpos0.y;return o;}
  await anim(col.rb?0.8:0.45,function(p){var e=ease(p);if(col.rb&&!PD)lane(e,col.group.position);else col.group.position.lerpVectors(cpos0,stepIn,e);if(col.rb)col.group.rotation.y=yaw0+sdY(yaw1-yaw0)*e;walkAnim(col,p*10,0.5);if(!PD){Y=e;pose();}});if(r!==run)return false;
  walkAnim(col,0,0);
  var sh,el,sh2;
  function armPick(){var loc=col.group.worldToLocal(Pw0.clone());return loc.x>=0?['armR','armR2']:['armL','armL2'];}
  col.group.updateMatrixWorld(true);var an=armPick(),A=col[an[0]],A2=col[an[1]];
  var restL=A.position.clone().add(new V3(0,-0.62,0.07));
  var handL=new V3(),tgtL=new V3(),pW=new V3();
  function toLocal(w,o){col.group.updateWorldMatrix(true,false);o.copy(w);return col.group.worldToLocal(o);}
  if(PD){
    var pp=PROD.man.pairs.pay,E=pp.events||{},dur=pp.frames/pp.fps,cash=pp.cash||{},tmp=new V3(),fl={},cA=PROD.cols[i];
    PROD.pair={name:'pay',gate:i,t:0};
    await anim(dur,function(p){
      var tt=p*dur;PROD.pair.t=tt;var f=Math.floor(tt*pp.fps);
      if(!fl.c&&f>=E.contact){fl.c=true;held.visible=true;AU.play('click');}
      if(fl.c&&!fl.gr){prodPx(PROD.player,cash.pocket[0],cash.pocket[1],tmp);held.position.copy(tmp);}
      if(!fl.gr&&f>=E.grabbed){fl.gr=true;AU.play('snatch');}
      if(fl.gr){var tr=cash.track&&cash.track[Math.min(f,cash.track.length-1)];if(!tr)tr=cash.hold||cash.pocket;prodPx(cA,tr[0],tr[1],tmp);held.position.copy(tmp);}
      if(!fl.rel&&f>=E.release){fl.rel=true;if(!g.paid){g.paid=true;deduct(i+1);}}
    });if(r!==run)return false;
    PROD.pair=null;if(!g.paid){g.paid=true;deduct(i+1);}
    cA.mesh.attach(held);
  }else{
    pocketW(Pw0);var up=new V3(0,1,0);S.grab=true;
    // 1) collector reaches towards the right trouser pocket
    var h0=new V3();A2.updateWorldMatrix(true,false);A2.localToWorld(h0.set(0,-0.33,0));
    await anim(0.8,function(p){var e=ease(p);pocketW(pW);pW.y+=0.0;pW.x+=fx*0.012;pW.z+=fz*0.012;tgtL.lerpVectors(h0,pW,e);toLocal(tgtL,handL);ikArm(col,A,A2,handL);col.head.rotation.x=0.12*e;});if(r!==run)return false;
    // 2) hand on the pocket - visible contact, notes still in the pocket
    await anim(0.5,function(p){pocketW(pW);pW.x+=fx*0.012;pW.z+=fz*0.012;pW.y+=0.0-0.01*Math.sin(p*3.14);toLocal(pW,handL);ikArm(col,A,A2,handL);player.head.rotation.x=0.05*p;});if(r!==run)return false;
    // 3) snatch: the notes leave the pocket in the collector's hand and are pulled out, player jolts back
    AU.play('snatch');pocketW(pW);
    var pocketNow=player.pocketCash,shown=pocketNow.children.filter(function(c){return c.visible;});
    var keep=Math.max(1,Math.ceil(12*(S.wallet-amt)/TOTAL));
    shown.forEach(function(c,k){if(k>=keep)c.visible=false;});
    pocketNow.updateWorldMatrix(true,false);
    var q=new THREE.Quaternion(),ps=new V3();pocketNow.matrixWorld.decompose(pW,q,ps);
    held.position.copy(pW);held.quaternion.copy(q);held.scale.copy(ps);held.visible=true;
    var cdir=new V3(-fx,0,-fz),pull=new V3();
    A2.attach(held);var gl=new V3(0,-0.34,0.03),gl0=held.position.clone(),gs0=held.scale.x,gq0=held.quaternion.clone(),gq1=new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5,0,0.2));
    var pk0=new V3();pocketW(pk0);pk0.x+=fx*0.012;pk0.z+=fz*0.012;
    await anim(0.55,function(p){var e=1-(1-p)*(1-p);
      pull.copy(pk0).addScaledVector(cdir,0.34*e);pull.y+=0.14*e;toLocal(pull,handL);ikArm(col,A,A2,handL);
      var gp=Math.min(1,p*3),ge=ease(gp);held.position.lerpVectors(gl0,gl,ge);held.quaternion.slerpQuaternions(gq0,gq1,ge);var sc=lerp(gs0,1.15,ge);held.scale.set(sc,sc,sc);
      S.recoil=0.22*e;player.head.rotation.x=lerp(0.05,-0.18,e);Rr=e;pose();
      pocketW(pW);});if(r!==run)return false;
    S.shake=Math.max(S.shake,0.12);S.grab=false;
    // 4) collector holds the money up; wallet drops once, mid-withdrawal
    var hp=new V3();A2.updateWorldMatrix(true,false);A2.localToWorld(hp.set(0,-0.33,0));toLocal(hp,gl0);
    var hold=new V3(-Math.sign(A.position.x)*0.26,-0.40,0.22).add(A.position);
    await anim(0.6,function(p){if(p>=0.45&&!g.paid){g.paid=true;deduct(i+1);}var e=ease(p);tgtL.lerpVectors(gl0,hold,e);ikArm(col,A,A2,tgtL);S.recoil=0.22*(1-e);player.head.rotation.x=lerp(-0.18,0,e);Rr=1-e;Y=1-e;pose();col.head.rotation.x=0.12*(1-e);});if(r!==run)return false;
    S.recoil=0;Rr=0;Y=0;pose();ya.rotation.x=0;player.head.rotation.x=0;
  }
  // 5) collector steps back with the money in hand
  var a0=A.position.clone(),hs=new V3();
  var hq0=A.quaternion.clone(),he0=A2.rotation.x;
  var hold2=A.position.clone().add(new V3(-Math.sign(A.position.x)*0.26,-0.40,0.22)),relax=A.position.clone().add(new V3(0,-0.52,0.14)),tg2=new V3();
  await anim(col.rb?0.8:0.55,function(p){var e=ease(p);if(col.rb&&!PD)lane(1-e,col.group.position);else col.group.position.lerpVectors(stepIn,cpos0,e);if(col.rb)col.group.rotation.y=yaw1+sdY(yaw0-yaw1)*e;if(!PD){tg2.lerpVectors(hold2,relax,Math.min(1,e*1.4));ikArm(col,A,A2,tg2);}else walkAnim(col,p*10,0.4);});if(r!==run)return false;
  walkAnim(col,0,0);col.head.rotation.x=0;S.recoil=0;
  setPocket();
  if(!PD){/* neutral stance: arm relaxed at his side, notes still in his hand */ikClear(col);A.rotation.set(-0.12,0,0);A2.rotation.set(-0.5,0,0);}else ikClear(col);
  S.hands=false;S.grab=false;return true;
}
/* ---- belongings stay on the player: the collector only inspects / points at them ---- */
async function inspect(r,col,what){
  var pg=player.group,fx=Math.sin(pg.rotation.y),fz=Math.cos(pg.rotation.y);
  S.hands=true;S.hcol=col;S.pocketSide=(sprActive()||PROD.on)?-1:S.pocketSide;
  var low=what==='slippers',gap=low?0.8:0.64,cpos0=col.group.position.clone(),stepIn=new V3(pg.position.x+fx*gap,cpos0.y,pg.position.z+fz*gap);
  function itemW(o){pg.updateMatrixWorld(true);
    if(what==='chain')return player.chain.getWorldPosition(o);if(what==='ring')return player.ring.getWorldPosition(o);if(what==='watch')return player.watch.getWorldPosition(o);
    if(what==='specs')return player.specs.getWorldPosition(o);if(what==='shirt')return pg.localToWorld(o.set(0,1.3,0.15));return pg.localToWorld(o.set(0.105,0.12,0.2));}
  walkAnim(col,0,0);ikClear(col);
  await anim(0.4,function(p){var e=ease(p);col.group.position.lerpVectors(cpos0,stepIn,e);walkAnim(col,p*10,0.5);});if(r!==run)return false;
  walkAnim(col,0,0);ikClear(col);col.group.updateMatrixWorld(true);
  var iw=itemW(new V3()),lx=col.group.worldToLocal(iw.clone()).x,A=lx>=0?col.armR:col.armL,A2=lx>=0?col.armR2:col.armL2;
  var h0=new V3();A2.updateWorldMatrix(true,false);A2.localToWorld(h0.set(0,-0.33,0));
  var tg=new V3(),w=new V3(),loc=new V3();
  function aim(e,t){itemW(w);w.x-=fx*0.27;w.z-=fz*0.27;if(low)w.y=Math.max(0.75,w.y+0.45);else if(what==='chain'||what==='specs'||what==='shirt')w.y-=0.24;w.y+=Math.sin(t*10)*0.012*e;tg.lerpVectors(h0,w,e);col.group.updateMatrixWorld(true);loc.copy(col.group.worldToLocal(tg.clone()));ikArm(col,A,A2,loc);}
  if(low)S.deepLean=0.62;
  AU.play('click');
  await anim(0.55,function(p){var e=ease(p);aim(e,0);col.head.rotation.x=(low?0.45:0.14)*e;});if(r!==run)return false;
  var t0=0;await anim(1.1,function(p){t0=p*1.1;aim(1,t0);});if(r!==run)return false;
  await anim(0.45,function(p){var e=ease(p);itemW(w);w.x-=fx*0.27;w.z-=fz*0.27;if(low)w.y=Math.max(0.75,w.y+0.45);else if(what==='chain'||what==='specs'||what==='shirt')w.y-=0.24;tg.lerpVectors(w,h0,e);col.group.updateMatrixWorld(true);loc.copy(col.group.worldToLocal(tg.clone()));ikArm(col,A,A2,loc);col.head.rotation.x=(low?0.45:0.14)*(1-e);});if(r!==run)return false;
  S.deepLean=false;
  await anim(0.4,function(p){var e=ease(p);col.group.position.lerpVectors(stepIn,cpos0,e);walkAnim(col,p*10,0.4);});if(r!==run)return false;
  walkAnim(col,0,0);ikClear(col);col.head.rotation.x=0;S.hands=false;S.deepLean=false;return true;
}
async function gateSeq(i){
  var r=run,g=gates[i],col=g.col;S.mode='gate';K.fwd=false;S.spd=0;
  var off0=S.off;
  await anim(0.35,function(p){S.off=lerp(off0,0,p);});if(r!==run)return;
  var tInt=S.t+1.25/dsAt(S.t),target=P(tInt,0,new V3());target.y+=0.04;
  var f2=f2At(S.t,new V3());var from=col.group.position.clone();
  col.group.rotation.y=Math.atan2(-f2.x,-f2.z);
  await anim(0.8,function(p){col.group.position.lerpVectors(from,target,ease(p));walkAnim(col,p*12,0.6);});if(r!==run)return;
  walkAnim(col,0,0);AU.play('stop');
  if(i===4){
    var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:qTex,transparent:true}));sp.scale.set(0.9,0.9,1);sp.position.set(0,2.7,0);col.group.add(sp);
    await anim(1.2,function(p){player.head.rotation.y=Math.sin(p*14)*0.7*(1-p);});if(r!==run)return;
    player.head.rotation.y=0;col.group.remove(sp);
  }
  var ok=true;
  ok=await payToll(r,i,col);if(!ok||r!==run)return;
  if(i===1)ok=await inspect(r,col,'chain');
  if(i===2)ok=await inspect(r,col,'ring');
  if(i===3)ok=await inspect(r,col,'watch');
  if(i===4){
    ok=await inspect(r,col,'specs');if(!ok||r!==run)return;
    ok=await inspect(r,col,'shirt');if(!ok||r!==run)return;
    ok=await inspect(r,col,'slippers');
  }
  if(!ok||r!==run)return;
  {var gpT=popTxt(g.def.popKey);if(gpT)showPop(g.def.name,gpT,'',4600);}
  await wait(1.6);if(r!==run)return;
  var back=col.group.position.clone();col.group.rotation.y=Math.atan2(-f2.x,-f2.z);var rest=g.rest.clone();
  AU.play('gateOpen');var openP=anim(1.0,function(p){g.open(ease(p));});
  await anim(0.9,function(p){col.group.position.lerpVectors(back,rest,ease(p));walkAnim(col,p*10,0.6);});if(r!==run)return;
  walkAnim(col,0,0);await openP;if(r!==run)return;
  g.done=true;el.hint.classList.add('on');AU.duck('toll',false);S.gate=i+1;S.mode='play';
  while(r===run&&S.t<g.stopT+0.012){await wait(0.25);}
  if(r!==run)return;
  AU.play('gateClose');await anim(0.8,function(p){g.open(1-ease(p));});
}
async function finale(){
  var r=run;S.mode='finale';K.fwd=false;AU.duck('fin',true);el.hint.classList.remove('on');
  var end=P(S.t,0,new V3());end.y+=0.04;var f2=f2At(S.t,new V3());
  var rad=new V3(end.x,0,end.z).normalize();var vbStart=new V3(rad.x*3.4,13.04,rad.z*3.4);
  vb.group.visible=true;vb.group.position.copy(vbStart);
  var useStd=!!(STD.ready&&STD.g);
  if(useStd){vb.group.children.forEach(function(ch){ch.visible=false;});STD.g.visible=true;STD.g.position.set(0,0,0);STD.g.rotation.set(0,0,0);if(STD.g.parent!==vb.group)vb.group.add(STD.g);}
  var meet=end.clone().addScaledVector(f2,useStd?1.05:1.4);meet.y=end.y;
  (function(){var m0=end.clone().addScaledVector(f2,0.95);m0.y+=1.35;if(stage.clientWidth<stage.clientHeight){var mm=end.clone().addScaledVector(f2,0.7);S.fcam={pos:new V3(mm.x+rad.x*5.6-f2.x*0.6,end.y+1.6,mm.z+rad.z*5.6-f2.z*0.6),look:new V3(mm.x,end.y+1.25,mm.z)};}else S.fcam={pos:new V3(m0.x+rad.x*3.6-f2.x*3.8,m0.y+0.7,m0.z+rad.z*3.6-f2.z*3.8),look:m0.clone()};})();
  if(S.fcam&&camPos.distanceTo(S.fcam.pos)>6){camPos.copy(S.fcam.pos);camLook.copy(S.fcam.look);camera.position.copy(camPos);camera.lookAt(camLook);}
  vb.group.rotation.y=Math.atan2(end.x-vbStart.x,end.z-vbStart.z);
  function stdWalk(ph,amp){if(!useStd)return;STD.g.position.y=Math.abs(Math.sin(ph))*0.09*amp;STD.g.rotation.z=Math.sin(ph)*0.07*amp;STD.g.rotation.x=0.02*amp;}
  await anim(useStd?2.4:1.8,function(p){vb.group.position.lerpVectors(vbStart,meet,ease(p));if(useStd)stdWalk(p*16,1-Math.max(0,(p-0.85)/0.15));else walkAnim(vb,p*14,0.6);});if(r!==run)return;
  if(useStd){STD.g.position.y=0;STD.g.rotation.z=0;STD.g.rotation.x=0;}else walkAnim(vb,0,0);
  S.faceVb=true;vb.group.rotation.y=Math.atan2(end.x-meet.x,end.z-meet.z);
  await wait(0.5);if(r!==run)return;
  if(useStd){await anim(0.5,function(p){STD.g.rotation.z=Math.sin(p*Math.PI)*0.1;STD.g.position.y=Math.sin(p*Math.PI)*0.05;});STD.g.rotation.z=0;STD.g.position.y=0;}
  else vb.armR.rotation.x=-2.4;
  AU.play('horn');
  showPop('BIRTHDAY GIFT','వచ్చావా బకరా! ఇదిగో నీ కోసం స్పెషల్ క్యాప్!','You came, bakra! Here is a special cap for you.',3400);
  await wait(1.2);if(r!==run)return;
  if(useStd){
    /* cap flies from the standee's raised hand to the player's head */
    var fc=player.cap.clone();fc.visible=true;fc.scale.set(1,1,1);scene.add(fc);
    var hand=new V3(-STD.g.userData.W*0.36,STD.H*0.62,0.15);
    var sA=vb.group.localToWorld(hand.clone());
    player.group.updateMatrixWorld(true);player.cap.visible=true;player.cap.scale.set(1,1,1);player.head.updateMatrixWorld(true);
    var tgt=player.cap.getWorldPosition(new V3());player.cap.visible=false;
    var above=tgt.clone();above.y+=0.35;
    await anim(0.9,function(p){var e=ease(p);fc.position.lerpVectors(sA,above,e);fc.position.y+=Math.sin(p*Math.PI)*0.35;fc.rotation.z=(1-e)*0.7;fc.rotation.y+=0.06;STD.g.rotation.z=-0.1*Math.sin(Math.min(1,p*1.3)*Math.PI);});
    await anim(0.35,function(p){var e=ease(p);fc.position.lerpVectors(above,tgt,e);fc.rotation.z*=0.8;});if(r!==run)return;
    scene.remove(fc);player.cap.visible=true;player.cap.scale.set(1,1,1);STD.g.rotation.z=0;
  }else{
    player.cap.visible=true;player.cap.scale.set(0.01,0.01,0.01);
    await anim(0.5,function(p){var s=ease(p);player.cap.scale.set(s,s,s);});if(r!==run)return;
    vb.armR.rotation.x=0;
  }
  el.laugh.classList.add('show');burst(end);AU.play('sting');AU.play('laugh');setTimeout(function(){AU.play('wah');},900);S.shake=0.4;
  var tot=S.time;
  if(useStd)await anim(3.4,function(p){STD.g.position.y=Math.abs(Math.sin(p*Math.PI*6))*0.1;STD.g.rotation.z=Math.sin(p*Math.PI*6)*0.05;});else await wait(3.4);
  if(r!==run)return;
  if(useStd){STD.g.position.y=0;STD.g.rotation.z=0;}
  el.laugh.classList.remove('show');
  $('rPaid').textContent=money(S.paid);$('rVb').textContent=money(S.vb);
  var m=Math.floor(tot/60),s2=Math.floor(tot%60);$('rTime').textContent=m+':'+(s2<10?'0':'')+s2;
  el.result.hidden=false;clearTimeout(popT);el.pop.classList.remove('show');document.body.classList.add('res');S.mode='result';AU.duck('fin',false);
}
function resetGame(){
  run++;S.deepLean=false;AU.duck('toll',false);AU.duck('fin',false);S.spd=0;S.recoil=0;gates.forEach(function(g){ikClear(g.col);g.col.head.rotation.x=0;});player.armL.rotation.z=0;player.armR.rotation.z=0;PROD.pair=null;PROD.outfit=0;timers.length=0;anims.length=0;restorePlayer();payPending=false;payRes=null;S.hands=false;$('toll').hidden=true;bundles.forEach(function(b){if(b.parent)b.parent.remove(b);});bundles.length=0;var hh=$('hist');if(hh)hh.innerHTML='';setPocket();
  gates.forEach(function(g){g.open(0);g.done=false;g.col.group.position.copy(g.rest);g.col.group.rotation.y=Math.atan2(-g.f2.x,-g.f2.z);walkAnim(g.col,0,0);g.col.armR.rotation.x=0;g.col.armL.rotation.x=0;g.paid=false;});
  S.t=0;S.off=0;S.gate=0;S.paid=0;S.time=0;S.shake=0;S.faceVb=false;S.fcam=null;setWallet(TOTAL);setVb(0);buildNotes();setPocket();
  vb.group.visible=false;vb.group.children.forEach(function(ch){ch.visible=(ch!==STD.g);});if(STD.g){STD.g.visible=false;STD.g.position.set(0,0,0);STD.g.rotation.set(0,0,0);}cpts.visible=false;cact=false;rearGate.rotation.y=Math.PI/2;
  el.wallet.classList.add('hide');el.vwallet.classList.add('hide');el.pop.classList.remove('show');el.laugh.classList.remove('show');el.hint.classList.remove('on');el.result.hidden=true;document.body.classList.remove('res');
}
function replay(){resetGame();S.mode='ready';S.introD=WPL[WPL.length-1];el.introBar.hidden=true;el.startBar.hidden=false;}
$('startBtn').addEventListener('click',startSeq);
var shF=0;var stepAcc=0;setInterval(function(){if(S.mode==='play'&&S.spd>0.5){stepAcc+=S.spd*0.08;if(stepAcc>=1.35){stepAcc-=1.35;AU.play('step');}}},80);
document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('button');if(b&&b.id!=='sndBtn'&&b.id!=='sndBtn2'&&!b.closest('#pad'))AU.play('click');},true);
$('sndBtn').addEventListener('click',AU.toggle);$('sndBtn2').addEventListener('click',AU.toggle);AU.refresh();
$('againBtn').addEventListener('click',replay);
(function(){var tg=$('hudTgl');if(!tg)return;var user=false,mq=null;
  function setMin(on){document.body.classList.toggle('hudmin',on);tg.setAttribute('aria-expanded',on?'false':'true');tg.setAttribute('aria-label',on?'Show wallet details':'Hide wallet details');}
  try{mq=window.matchMedia('(max-width:640px), (pointer:coarse) and (orientation:portrait)');}catch(e){}
  function auto(){if(!user&&mq)setMin(!!mq.matches);}
  auto();if(mq){if(mq.addEventListener)mq.addEventListener('change',auto);else if(mq.addListener)mq.addListener(auto);}
  tg.addEventListener('click',function(e){e.stopPropagation();user=true;setMin(!document.body.classList.contains('hudmin'));});
})();
if(window.visualViewport){window.visualViewport.addEventListener('resize',function(){setTimeout(resize,60);});}
$('qBtn').addEventListener('click',function(){Q.high=!Q.high;applyQuality();});
$('shareBtn').addEventListener('click',function(){
  var txt='I paid '+money(S.paid)+' in "taxes" to climb Vasool Babu\'s birthday cake and ended up in a bakra cap. (A fictional satire game.)';
  var msg=$('shareMsg');function ok(){msg.textContent='Copied. Paste it anywhere.';}function no(){msg.textContent=txt;}
  try{navigator.clipboard.writeText(txt).then(ok,no);}catch(e){no();}
});


/* ---------- enter party / full screen ---------- */
var inFull=false,fsAsked=false;
function setFull(on){inFull=on;document.body.classList.toggle('full',on);try{window.scrollTo(0,0);}catch(e){}setTimeout(resize,60);setTimeout(resize,350);}
function enterParty(){
  AU.hold(false);AU.unlock();
  var de=document.documentElement,rq=de.requestFullscreen||de.webkitRequestFullscreen;
  if(rq){try{fsAsked=true;var pr=rq.call(de);if(pr&&pr.catch)pr.catch(function(){});}catch(e){}}
  try{if(screen.orientation&&screen.orientation.lock&&window.matchMedia('(pointer:coarse)').matches&&window.innerWidth>window.innerHeight)screen.orientation.lock('landscape').catch(function(){});}catch(e){}
  setFull(true);$('enter').hidden=true;
  if(S.mode==='intro'||S.mode==='ready'){S.mode='intro';S.introD=0;el.introBar.hidden=false;el.startBar.hidden=true;}
  if(S.mode==='intro'){var pgT=popTxt('pre_game');if(pgT)setTimeout(function(){if(S.mode==='intro')showPop(popLevel('pre_game','Pre Game Sequence'),pgT,'',5200);},600);}
}
function leaveFull(){
  AU.hold(true);
  var ex=document.exitFullscreen||document.webkitExitFullscreen;
  if(document.fullscreenElement||document.webkitFullscreenElement){try{var p=ex.call(document);if(p&&p.catch)p.catch(function(){});}catch(e){}}
  setFull(false);$('enterBtn').textContent='Back to the party';$('enter').hidden=false;
}
$('enterBtn').addEventListener('click',enterParty);
$('exitBtn').addEventListener('click',leaveFull);
['fullscreenchange','webkitfullscreenchange'].forEach(function(ev){document.addEventListener(ev,function(){
  if(fsAsked&&inFull&&!document.fullscreenElement&&!document.webkitFullscreenElement){leaveFull();}
  setTimeout(resize,100);
});});
window.addEventListener('orientationchange',function(){setTimeout(resize,250);});


/* ---------- photo-sprite character (prototype, falls back to the 3D model) ---------- */
/*SPRITES*/
var SPR={want:/[?&]char=photo/.test(location.search),ready:false,loading:false,frames:{},mesh:null,shadow:null,cap:null,act:'idle',ft:0,fi:-1,prev:new V3(),mov:0};
function sprActive(){return SPR.want&&SPR.ready&&!!SPR.mesh&&!(PROD.ready&&PROD.want);}
function sideActive(){return sprActive()||(PROD.ready&&PROD.want&&!PROD.hasBack);}
function sprLabel(){var b=$('chBtn2'),b2=$('chBtn');var mo=(PROD.ready&&PROD.want)?'Production sprites':(SPR.ready&&SPR.want)?'Photo sprite (prototype)':'3D model';var t=(SPR.loading||PROD.state==='loading')?'Character: loading\u2026':'Character: '+mo;if(b)b.textContent=t;if(b2)b2.textContent=t;}
function loadSprites(){
  if(typeof SPR_DATA==='undefined'){sprLabel();return;}
  var total=0,done=0,bad=false;Object.keys(SPR_DATA).forEach(function(k){total+=SPR_DATA[k].length;});SPR.loading=true;
  Object.keys(SPR_DATA).forEach(function(k){SPR.frames[k]=[];SPR_DATA[k].forEach(function(d,i){
    var img=new Image();
    img.onload=function(){var t=new THREE.Texture(img);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;t.needsUpdate=true;SPR.frames[k][i]={tex:t,hx:d.hx};if(++done===total&&!bad)buildSprite();};
    img.onerror=function(){bad=true;SPR.loading=false;SPR.want=false;sprLabel();};
    img.src=d.u;});});
}
function buildSprite(){
  var geo=new THREE.PlaneGeometry(1.0,2.0);geo.translate(0,1.0-0.086,0);
  var mat=new THREE.MeshBasicMaterial({map:SPR.frames.idle[0].tex,transparent:true,alphaTest:0.4,side:THREE.DoubleSide,color:new THREE.Color(0.62,0.58,0.54)});
  SPR.mesh=new THREE.Mesh(geo,mat);SPR.mesh.visible=false;SPR.mesh.renderOrder=2;scene.add(SPR.mesh);
  var st=mkTex(128,128,function(x,w,h){var g2=x.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g2.addColorStop(0,'rgba(0,0,0,0.55)');g2.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g2;x.fillRect(0,0,w,h);});
  var sg=new THREE.PlaneGeometry(1,1);sg.rotateX(-Math.PI/2);
  SPR.shadow=new THREE.Mesh(sg,new THREE.MeshBasicMaterial({map:st,transparent:true,depthWrite:false,fog:false}));SPR.shadow.visible=false;SPR.shadow.renderOrder=1;scene.add(SPR.shadow);
  SPR.cap=player.cap.clone();SPR.cap.visible=false;scene.add(SPR.cap);
  SPR.ready=true;SPR.loading=false;sprLabel();
}
var SPR_FPS={idle:1,walk:7,run:8,pocket:1};
function updateSprite(dt){
  var on=sprActive();player.group.visible=!on;
  if(!SPR.mesh)return;SPR.mesh.visible=on;SPR.shadow.visible=on;
  if(!on){SPR.cap.visible=false;return;}
  var pg=player.group,pos=pg.position,dx=pos.x-SPR.prev.x,dz=pos.z-SPR.prev.z,sp=Math.hypot(dx,dz)/Math.max(dt,1e-3);SPR.prev.copy(pos);
  SPR.mov+=((sp>0.4?1:0)-SPR.mov)*Math.min(1,dt*10);
  var act='idle';
  if(S.hands)act='pocket';else if((S.mode==='intro'||S.mode==='play')&&SPR.mov>0.5)act=(K.run&&S.mode==='play')?'run':'walk';
  if(act!==SPR.act){SPR.act=act;SPR.ft=0;SPR.fi=-1;}SPR.ft+=dt;
  var fr=SPR.frames[act],idx=Math.floor(SPR.ft*SPR_FPS[act])%fr.length;
  if(idx!==SPR.fi){SPR.fi=idx;SPR.mesh.material.map=fr[idx].tex;SPR.mesh.material.needsUpdate=true;}
  var fwx=Math.sin(pg.rotation.y),fwz=Math.cos(pg.rotation.y),e=camera.matrixWorld.elements;
  var flip=(fwx*e[0]+fwz*e[2])>0;SPR.mesh.scale.x=flip?-1:1;
  SPR.mesh.rotation.y=Math.atan2(camera.position.x-pos.x,camera.position.z-pos.z);
  var bob=act==='walk'?Math.abs(Math.sin(SPR.ft*Math.PI*SPR_FPS.walk*0.5))*0.03:act==='run'?Math.abs(Math.sin(SPR.ft*Math.PI*SPR_FPS.run*0.5))*0.05:0;
  SPR.mesh.position.set(pos.x,pos.y+bob,pos.z);
  SPR.shadow.position.set(pos.x,pos.y+0.03,pos.z);SPR.shadow.rotation.y=pg.rotation.y;SPR.shadow.scale.set(0.9,1,1.5);
  if(player.cap.visible){
    var rl=Math.hypot(e[0],e[2])||1,rx=e[0]/rl,rz=e[2]/rl,off=(fr[idx].hx-0.5)*(flip?-1:1);
    SPR.cap.visible=true;SPR.cap.position.set(pos.x+rx*off,pos.y+1.66,pos.z+rz*off);SPR.cap.rotation.y=SPR.mesh.rotation.y;SPR.cap.scale.copy(player.cap.scale);
  }else SPR.cap.visible=false;
}

/*PRODLOADER*/

/* ---------- input ---------- */
window.addEventListener('keydown',function(e){
  var k=e.key,used=false;
  if(k==='Shift')K.run=true;
  if((k==='Enter'||k===' ')&&payPending){doPay();e.preventDefault();return;}
  if(k==='w'||k==='W'||k==='ArrowUp'){K.fwd=true;used=true;}
  else if(k==='a'||k==='A'||k==='ArrowLeft'){K.left=true;used=true;}
  else if(k==='d'||k==='D'||k==='ArrowRight'){K.right=true;used=true;}
  else if((k===' '||k==='Enter')&&S.mode==='ready'){var a=document.activeElement;if(!(a&&a.tagName==='BUTTON')){startSeq();used=true;}}
  if(used&&(S.mode==='play'||S.mode==='gate'||S.mode==='finale'||S.mode==='ready'))e.preventDefault();
});
window.addEventListener('keyup',function(e){if(e.key==='Shift')K.run=false;var k=e.key;
  if(k==='w'||k==='W'||k==='ArrowUp')K.fwd=false;else if(k==='a'||k==='A'||k==='ArrowLeft')K.left=false;else if(k==='d'||k==='D'||k==='ArrowRight')K.right=false;});
function hold(id,key){var b=$(id);function on(e){e.preventDefault();K[key]=true;}function off(){K[key]=false;}
  b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off);b.addEventListener('pointercancel',off);}
(function(){
  var joy=$('joy'),knob=$('joyKnob'),pid=null,R=46;
  function upd(e){var r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,d=Math.hypot(dx,dy),m=Math.min(1,d/R);
    if(d>R){dx*=R/d;dy*=R/d;}knob.style.transform='translate('+dx+'px,'+dy+'px)';
    var nx=dx/R,ny=dy/R;K.fwd=ny<-0.3;K.left=nx<-0.35;K.right=nx>0.35;K.run=ny<-0.3&&Math.hypot(nx,ny)>0.92;}
  function end(){pid=null;knob.style.transform='translate(0,0)';K.fwd=K.left=K.right=K.run=false;}
  joy.addEventListener('pointerdown',function(e){e.preventDefault();pid=e.pointerId;try{joy.setPointerCapture(pid);}catch(x){}upd(e);});
  joy.addEventListener('pointermove',function(e){if(e.pointerId===pid)upd(e);});
  joy.addEventListener('pointerup',end);joy.addEventListener('pointercancel',end);joy.addEventListener('lostpointercapture',end);
  $('payBtn').addEventListener('click',doPay);
  function togChar(){var modes=['3d'];if(SPR.ready)modes.push('proto');if(PROD.ready)modes.push('prod');var cur=(PROD.ready&&PROD.want)?'prod':(SPR.ready&&SPR.want)?'proto':'3d';var nx=modes[(modes.indexOf(cur)+1)%modes.length];SPR.want=nx==='proto';PROD.want=nx==='prod';sprLabel();}
  var cb=$('chBtn'),cb2=$('chBtn2');if(cb)cb.addEventListener('click',togChar);if(cb2)cb2.addEventListener('click',togChar);
  if(window.matchMedia('(pointer:coarse)').matches){var hb=$('hintBar');if(hb)hb.textContent='Joystick to walk \u00B7 push fully to run \u00B7 tap CONTINUE at each gate';}
})();
window.addEventListener('blur',function(){K.fwd=K.left=K.right=K.run=false;});

/* ---------- Rocketbox characters (Stage A: player + Gate-1 collector) ----------
   Microsoft Rocketbox Avatar Library, MIT licence (see CREDITS/LICENSE). The procedural
   characters stay in the scene as the invisible logic rig + fallback: all existing
   gameplay code keeps driving them, and the skinned avatars follow (hand/head targets). */
var RB={on:false,list:[],url:'assets/models/',emb:{player:'/*RB_P*/',collector:'/*RB_C*/',collector2:'/*RB_C2*/',collector3:'/*RB_C3*/',collector4:'/*RB_C4*/',collector5:'/*RB_C5*/'},off:/[?&]rb=0/.test(location.search),err:null,
  DUR:{walk:1.0667,run:0.7667,fast:0.6},STRIDE:{walk:1.496,run:2.357,fast:3.504},
  KNEE:0.5,SIDE:0.58,FWD:-0.12,TURN:0.35,FINGER_AXIS:new V3(0,0,1),CURL:[1.0,1.15,0.8],THUMB:[0.5,0.6,0.5]};
RB.diag={};
RB.load=function(name){return new Promise(function(ok,bad){var L=new THREE.GLTFLoader(),b64=RB.emb[name],t0=Date.now(),D=RB.diag[name]={name:name,src:null,status:null,bytes:0,ms:0,err:null};
  function done(g){D.ms=Date.now()-t0;ok(g);}
  function fail(e){D.ms=Date.now()-t0;D.err=String(e&&e.message||e);bad(e);}
  function fromB64(t,gz){var bin=atob(t.trim()),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);if(gz)u=window.pako.ungzip(u);RB.emb[name]=null;D.bytes=u.length;L.parse(u.buffer.slice(u.byteOffset,u.byteOffset+u.length),'',done,fail);}
  try{
  if(b64&&b64.length>200){D.src=b64.charAt(0)==='H'&&b64.slice(0,4)==='H4sI'?'embedded-gzip':'embedded';fromB64(b64,D.src==='embedded-gzip');}
  else{D.src='glb';L.load(RB.url+name+'.glb',function(g){D.status=200;done(g);},undefined,function(e0){D.glbErr=String(e0&&e0.message||e0);if(!window.fetch)return fail(e0);D.src='glb.txt';fetch(RB.url+name+'.glb.txt').then(function(r){D.status=r.status;if(!r.ok)throw new Error('HTTP '+r.status);return r.text();}).then(function(t){fromB64(t,false);}).catch(fail);});}
  }catch(e){fail(e);}
});};
RB.attach=function(c,gltf,kind){
  var root=gltf.scene,rb={c:c,kind:kind,root:root,B:{},mixer:null,A:{},w:{idle:1,walk:0,run:0,fast:0},ph:0,v:0,last:c.group.position.clone(),ik:{L:0,R:0},grip:{L:0,R:0},hide:[],props:[],fing:{L:[],R:[]},lean:0,fAnim:false,fix:0,yaw0:c.group.rotation.y,yr:0};
  c.group.add(root);rb.mixer=new THREE.AnimationMixer(root);
  root.traverse(function(o){if(o.isBone)rb.B[o.name]=o;if(o.isSkinnedMesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;(Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){if(m.map&&!m.alphaTest)m.color.setScalar(0.8);});}});
  gltf.animations.forEach(function(cl){var a=rb.mixer.clipAction(cl);a.play();a.setEffectiveWeight(cl.name==='idle'?1:0);a.timeScale=cl.name==='idle'?1:0;rb.A[cl.name]=a;if(cl.tracks.some(function(t){return /Finger/.test(t.name);}))rb.fAnim=true;});
  rb.A.fast=rb.A.runfast;rb.mixer.update(0);c.group.updateMatrixWorld(true);
  ['L','R'].forEach(function(s){var a=new V3(),b=new V3(),h=new V3();rb.B['Bip01_'+s+'_UpperArm'].getWorldPosition(a);rb.B['Bip01_'+s+'_Forearm'].getWorldPosition(b);rb.B['Bip01_'+s+'_Hand'].getWorldPosition(h);rb['a'+s]=a.distanceTo(b);rb['b'+s]=b.distanceTo(h);});
  Object.keys(rb.B).forEach(function(n){var m=/^Bip01_([LR])_Finger(\d)(\d)?$/.exec(n);if(m)rb.fing[m[1]].push({b:rb.B[n],f:+m[2],j:m[3]?+m[3]:0,q0:rb.B[n].quaternion.clone()});});
  /* props: re-parent the existing objects onto skeleton bones, placed in character space (metres) */
  function holder(bone){var h=new THREE.Object3D(),ws=new V3();bone.add(h);bone.updateWorldMatrix(true,false);bone.getWorldScale(ws);h.scale.setScalar(1/ws.x);h.updateMatrixWorld(true);return h;}
  rb.put=function(obj,bone,pos,rot,sc){c.group.add(obj);obj.position.set(pos[0],pos[1],pos[2]);if(rot)obj.rotation.set(rot[0],rot[1],rot[2]);if(sc!=null)obj.scale.setScalar(sc);c.group.updateMatrixWorld(true);holder(rb.B[bone]).attach(obj);rb.props.push(obj);};
  if(kind==='player'){
    var P=RB.PLACE;c.chain.children[0].geometry=new THREE.TorusGeometry(0.2,0.0075,10,36);c.chain.children[1].scale.setScalar(0.55);
    rb.put(c.chain,'Bip01_Spine2',P.chain.p,P.chain.r,P.chain.s);
    rb.put(c.ring,'Bip01_L_Finger3',P.ring.p,P.ring.r,P.ring.s);
    rb.put(c.watch,'Bip01_R_Forearm',P.watch.p,P.watch.r,P.watch.s);
    rb.put(c.specs,'Bip01_Head',P.specs.p,P.specs.r,P.specs.s);
    c.cap.children.forEach(function(k){k.position.multiplyScalar(P.cap.k);k.scale.multiplyScalar(P.cap.k);});
    rb.put(c.cap,'Bip01_Head',P.cap.p,P.cap.r,null);
    rb.put(c.purse,'Bip01_L_Thigh',P.purse.p,P.purse.r,null);
    rb.put(c.pocketCash,'Bip01_R_Thigh',P.pocket.p,P.pocket.r,P.pocket.s);
    (function(){var pc=c.pocketCash,hd=pc.parent;rb.pk={low:{p:pc.position.clone(),q:pc.quaternion.clone(),s:pc.scale.clone()}};
      c.group.add(pc);pc.position.set(-0.17,1.0,0.13);pc.rotation.set(Math.PI/2-0.25,0,0.12);pc.scale.set(1.15,1.15,1.15);c.group.updateMatrixWorld(true);hd.attach(pc);
      rb.pk.high={p:pc.position.clone(),q:pc.quaternion.clone(),s:pc.scale.clone()};RB.pocket('low');})();
  }
  c.group.traverse(function(m){if(m.isMesh&&!isIn(m,root))rb.hide.push(m);});
  function isIn(m,r){for(var o=m;o;o=o.parent)if(o===r)return true;return false;}
  rb.hideAll=rb.hide.slice();c.rb=rb;RB.list.push(rb);RB.on=true;return rb;
};
RB.PLACE={chain:{p:[0,1.455,0.02],r:[0.42,0,0],s:0.4},ring:{p:[0.284,0.776,0.040],r:[Math.PI/2,0,0],s:0.45},
  watch:{p:[-0.269,0.905,0.026],r:[0,-Math.PI/2,0],s:0.5},specs:{p:[0,1.688,0.145],r:[0,0,0],s:0.30},
  cap:{p:[0,1.74,-0.01],r:[-0.12,0,0],k:0.5},purse:{p:[0.17,0.86,0.09],r:[0,0,0.1]},pocket:{p:[-0.155,0.875,0.125],r:[Math.PI/2-0.3,0,0.1],s:1.0}};
RB.pocket=function(w){var rb=player.rb;if(!rb||!rb.pk)return;var k=rb.pk[w];player.pocketCash.position.copy(k.p);player.pocketCash.quaternion.copy(k.q);player.pocketCash.scale.copy(k.s);};
RB.showDiag=function(force){if(!force&&!/[?&]diag=1/.test(location.search))return;if(RB.dEl)return;var d=document.createElement('pre');d.style.cssText='position:fixed;left:4px;top:4px;z-index:99999;background:rgba(0,0,0,.75);color:#7f7;font:10px monospace;padding:4px;margin:0;pointer-events:none;max-width:96vw;white-space:pre-wrap';var t='';(RB.gate||[]).forEach(function(g,i){var D=RB.diag[i?'collector'+(i+1):'collector']||{};t+='G'+g.gate+' '+g.shown+' src='+D.src+' st='+D.status+' '+D.bytes+'B '+D.ms+'ms'+(g.reason?' ! '+g.reason:'')+'\n';});d.textContent=t+'embedded='+Object.keys(RB.diag).map(function(k){return k+':'+RB.diag[k].src;}).join(',');RB.dEl=d;document.body.appendChild(d);};
RB.start=function(){
  if(RB.off||!window.THREE||!THREE.GLTFLoader)return;
  var g0=gates[0];
  Promise.all([RB.load('player'),RB.load('collector'),RB.load('collector2').catch(function(){return null;}),RB.load('collector3').catch(function(){return null;}),RB.load('collector4').catch(function(){return null;}),RB.load('collector5').catch(function(){return null;})]).then(function(r){
    try{RB.G={player:{scene:THREE.SkeletonUtils.clone(r[0].scene),animations:r[0].animations},collector:{scene:THREE.SkeletonUtils.clone(r[1].scene),animations:r[1].animations}};}catch(e){RB.G=null;}RB.attach(player,r[0],'player');RB.attach(g0.col,r[1],'collector');
    RB.gate=[{gate:1,shown:'rigged-human'}];for(var gi=1;gi<5;gi++){var gl=r[1+gi],G={gate:gi+1,shown:'procedural-makeChar',reason:null};RB.gate.push(G);if(!gl){G.reason='load failed: '+(RB.diag['collector'+(gi+1)]&&RB.diag['collector'+(gi+1)].err);continue;}if(gates[gi])try{RB.attach(gates[gi].col,gl,'collector');G.shown='rigged-human';}catch(e){G.reason='attach failed: '+(e&&e.message||e);if(window.console)console.warn('collector '+(gi+1)+' avatar failed; built-in kept',e);}}RB.showDiag();
    try{ENV.rbReady();}catch(e){if(window.console)console.warn('npc rocketbox',e);}if(typeof RB.ready==='function')RB.ready();
  }).catch(function(e){RB.err=String(e&&e.message||e);if(window.console)console.warn('Rocketbox characters unavailable, using built-in characters: '+RB.err+' '+JSON.stringify(RB.diag));});
};
function rbRamp(x,a,b){return Math.max(0,Math.min(1,(x-a)/(b-a)));}
var rbQ1=new THREE.Quaternion(),rbQ2=new THREE.Quaternion(),rbQ3=new THREE.Quaternion(),rbV1=new V3(),rbV2=new V3(),rbV3=new V3(),rbV4=new V3(),rbV5=new V3();
/* rotate a bone so the vector bone->childPos points at targetPos (world space) */
function rbAim(bone,childPos,targetPos){
  bone.getWorldPosition(rbV1);rbV2.copy(childPos).sub(rbV1).normalize();rbV3.copy(targetPos).sub(rbV1).normalize();
  rbQ1.setFromUnitVectors(rbV2,rbV3);bone.getWorldQuaternion(rbQ2);rbQ2.premultiply(rbQ1);
  bone.parent.getWorldQuaternion(rbQ3).invert();bone.quaternion.copy(rbQ3.multiply(rbQ2));bone.updateMatrixWorld(true);
}
/* world-space rotation of a bone about a world axis */
function rbTwist(bone,axis,ang){bone.getWorldQuaternion(rbQ2);rbQ1.setFromAxisAngle(axis,ang);rbQ2.premultiply(rbQ1);bone.parent.getWorldQuaternion(rbQ3).invert();bone.quaternion.copy(rbQ3.multiply(rbQ2));bone.updateMatrixWorld(true);}
RB.arm=function(rb,s,dt){
  var c=rb.c,pn=(s==='R')?'armL':'armR',P1=c[pn],P2=c[pn+'2'];
  var U=rb.B['Bip01_'+s+'_UpperArm'],F=rb.B['Bip01_'+s+'_Forearm'],H=rb.B['Bip01_'+s+'_Hand'];
  var dev=Math.abs(P1.rotation.x)+Math.abs(P1.rotation.y)+Math.abs(P1.rotation.z)+Math.min(Math.abs(P2.rotation.x+0.22),Math.abs(P2.rotation.x))+Math.abs(P2.rotation.y)+Math.abs(P2.rotation.z);
  var held=P2.children.some(function(k){return bundles.indexOf(k)>=0;});
  var eng=dev>0.04?1:0;rb.ik[s]+=(eng-rb.ik[s])*Math.min(1,dt*(eng?16:9));
  var gt=held?1:(eng&&rb.kind==='collector'?(player.pocketCash.visible&&P2.localToWorld(new V3(0,-0.33,0)).distanceTo(player.pocketCash.getWorldPosition(new V3()))<0.13?0.55:0.16):0);rb.grip[s]+=(gt-rb.grip[s])*Math.min(1,dt*(gt>rb.grip[s]?14:7));
  var w=rb.ik[s];if(w<0.004)return;
  var Pe=rbV4.set(0,0,0);P2.getWorldPosition(Pe);var Ph=P2.localToWorld(new V3(0,-0.33,0));
  var aw=new V3();H.getWorldPosition(aw);var ew=new V3();F.getWorldPosition(ew);var sw=new V3();U.getWorldPosition(sw);
  var T=new V3(),pole=new V3();
  if(rb.kind==='collector'){var fd=Ph.clone().sub(Pe).normalize();T.copy(Ph).addScaledVector(fd,-0.075);pole.copy(Pe);
    if(c.ikT&&c.ikSh===P1){var tw=c.group.localToWorld(c.ikT.clone());fd.copy(tw).sub(sw).normalize();T.copy(tw).addScaledVector(fd,-0.075);}}
  else{var sx=(s==='R'?-1:1)*0.31,rest=c.group.localToWorld(new V3(sx,0.809,0.0718));T.copy(aw).add(Ph).sub(rest);pole.copy(ew);pole.x+=(s==='R'?-1:1)*0.05;pole.z-=0.05;}
  var a=rb['a'+s],b=rb['b'+s],d=T.clone().sub(sw),dist=Math.min(a+b-0.003,Math.max(Math.abs(a-b)+0.01,d.length()));d.normalize();
  var pv=pole.clone().sub(sw);pv.sub(d.clone().multiplyScalar(pv.dot(d)));if(pv.lengthSq()<1e-6)pv.set(0,-1,0).sub(d.clone().multiplyScalar(-d.y));pv.normalize();
  var ca=(a*a+dist*dist-b*b)/(2*dist),h=Math.sqrt(Math.max(0,a*a-ca*ca));
  var E=sw.clone().addScaledVector(d,ca).addScaledVector(pv,h),Tc=sw.clone().addScaledVector(d,dist);
  var qU=U.quaternion.clone(),qF=F.quaternion.clone();
  rbAim(U,ew,E);F.getWorldPosition(rbV5);H.getWorldPosition(aw);rbAim(F,aw,Tc);
  var qU2=U.quaternion.clone(),qF2=F.quaternion.clone();
  U.quaternion.slerpQuaternions(qU,qU2,w);F.quaternion.slerpQuaternions(qF,qF2,w);U.updateMatrixWorld(true);
  if(held&&rb.kind==='collector'){var hb=P2.children.filter(function(k){return bundles.indexOf(k)>=0;})[0];if(hb&&hb.visible){var pm=new V3(),f2=new V3();H.getWorldPosition(pm);rb.B['Bip01_'+s+'_Finger2'].getWorldPosition(f2);pm.add(f2).multiplyScalar(0.5);hb.position.copy(P2.worldToLocal(pm));}}
};
RB.fingers=function(rb,s){
  var g=rb.grip[s];
  rb.fing[s].forEach(function(f){
    var q=rb.fAnim?f.b.quaternion:f.q0;var ang=(f.f===0?RB.THUMB[f.j]:RB.CURL[f.j])*Math.max(g,f.f===0?0.12:0.22);
    rbQ1.setFromAxisAngle(RB.FINGER_AXIS,ang);f.b.quaternion.copy(q).multiply(rbQ1);
  });
};
RB.step=function(rb,dt){
  var c=rb.c,g=c.group;if(!g.visible)return;
  rb.hide.forEach(function(m){m.visible=false;});
  var dx=g.position.x-rb.last.x,dz=g.position.z-rb.last.z;rb.last.copy(g.position);
  var sp=Math.sqrt(dx*dx+dz*dz)/dt;if(sp>14)sp=0;
  var fw=Math.sin(g.rotation.y)*dx+Math.cos(g.rotation.y)*dz,sgn=fw<-0.0015?-1:1;
  rb.v+=(sp-rb.v)*Math.min(1,dt*14);var v=rb.v;
  var r1=rbRamp(v,0.15,0.6),r2=rbRamp(v,1.9,2.6),r3=rbRamp(v,4.0,5.2);
  var tw={idle:1-r1,walk:r1*(1-r2),run:r2*(1-r3),fast:r3},k=Math.min(1,dt*12),sum=0,L=0;
  ['idle','walk','run','fast'].forEach(function(n){rb.w[n]+=(tw[n]-rb.w[n])*k;});
  ['walk','run','fast'].forEach(function(n){sum+=rb.w[n];L+=rb.w[n]*RB.STRIDE[n];});
  var rate=sum>0.01?Math.min(2.3,v/(L/sum)):0;rb.ph=(rb.ph+sgn*rate*dt)%1;if(rb.ph<0)rb.ph+=1;
  ['walk','run','fast'].forEach(function(n){var a=rb.A[n];if(!a)return;a.setEffectiveWeight(rb.w[n]);a.time=rb.ph*RB.DUR[n];});
  rb.A.idle.setEffectiveWeight(Math.max(0.0001,rb.w.idle));
  rb.mixer.update(dt);g.updateMatrixWorld(true);
  /* keep the lowest foot from sinking below the road (blend hips can dip a few cm) */
  var sole=Math.min(rb.B.Bip01_L_Toe0.getWorldPosition(rbV1).y,rb.B.Bip01_R_Toe0.getWorldPosition(rbV2).y)-g.position.y-0.005;
  rb.fix+=((sole<0?-sole:0)-rb.fix)*Math.min(1,dt*20);rb.root.position.y=rb.fix;g.updateMatrixWorld(true);
  /* turning: lean into the curve and lead with the head (the body yaw itself is the game's turnTo) */
  var dy=g.rotation.y-rb.yaw0;rb.yaw0=g.rotation.y;while(dy>Math.PI)dy-=2*Math.PI;while(dy<-Math.PI)dy+=2*Math.PI;
  rb.yr+=((Math.abs(dy)<1?dy/dt:0)-rb.yr)*Math.min(1,dt*8);
  if(rb.kind==='player'&&v>1.2){var roll=Math.max(-0.16,Math.min(0.16,-rb.yr*0.07))*Math.min(1,v/4),lead=Math.max(-0.3,Math.min(0.3,rb.yr*0.1));
    rbV5.set(Math.sin(g.rotation.y),0,Math.cos(g.rotation.y));rbTwist(rb.B.Bip01_Spine,rbV5.clone(),roll);rbV5.set(0,1,0);rbTwist(rb.B.Bip01_Head,rbV5.clone(),lead);}
  /* collector leans into the reach */
  if(rb.kind==='collector'){var lt=(S.hands&&S.hcol===c)?(S.deepLean?S.deepLean:Math.max(0,1-Math.max(rb.grip.L,rb.grip.R)*1.4)):0;rb.lean+=(lt-rb.lean)*Math.min(1,dt*7);
    if(rb.lean>0.01){var ax=rbV5.set(1,0,0).applyQuaternion(g.getWorldQuaternion(rbQ3)).clone(),L=rb.lean,al=RB.KNEE*L,ga=Math.asin(Math.min(1,0.45/0.43*Math.sin(al)));
      rb.root.position.y=rb.fix-(0.45*(1-Math.cos(al))+0.43*(1-Math.cos(ga)))*1.0;g.updateMatrixWorld(true);
      ['L','R'].forEach(function(s){rbTwist(rb.B['Bip01_'+s+'_Thigh'],ax,-al);rbTwist(rb.B['Bip01_'+s+'_Calf'],ax,al+ga);rbTwist(rb.B['Bip01_'+s+'_Foot'],ax,-ga);});
      rbV5.copy(ax);rbTwist(rb.B.Bip01_Spine,rbV5.clone(),0.42*rb.lean);rbTwist(rb.B.Bip01_Spine1,rbV5.clone(),0.16*rb.lean);}}
  RB.arm(rb,'L',dt);RB.arm(rb,'R',dt);
  RB.fingers(rb,'L');RB.fingers(rb,'R');
  var hx=c.head.rotation.x;if(Math.abs(hx)>0.002){rbV5.set(1,0,0).applyQuaternion(g.getWorldQuaternion(rbQ3));rbTwist(rb.B.Bip01_Head,rbV5.clone(),hx*0.9);}
};
RB.tick=function(dt){if(!(dt>0))return;for(var i=0;i<RB.list.length;i++){try{RB.step(RB.list[i],dt);}catch(e){RB.fail(e);return;}}};
RB.fail=function(e){RB.err='runtime: '+(e&&e.message||e);if(window.console)console.warn('Rocketbox runtime error; reverting to built-in characters',e);
  RB.list.forEach(function(rb){rb.root.visible=false;rb.hide.length=0;rb.c.rb=null;rb.props.forEach(function(o){});});
  /* restore procedural bodies */RB.list.forEach(function(rb){rb.hideAll.forEach(function(m){m.visible=true;});});RB.on=false;RB.list=[];};

/* ---------- update ---------- */
var camPos=new V3(36,5,-44),camLook=new V3(20,1.4,-14),wantPos=new V3(),wantLook=new V3();
var last=performance.now();
var NF_v=new THREE.Vector3();
function update(dt){
  S.time+=(S.mode==='play'||S.mode==='gate')?dt:0;
  for(var i=timers.length-1;i>=0;i--){var tm=timers[i];tm.left-=dt;if(tm.left<=0){timers.splice(i,1);tm.res();}}
  for(var j=anims.length-1;j>=0;j--){var a=anims[j];a.t+=dt;var p=Math.min(1,a.t/a.dur);a.fn(p);if(p>=1){anims.splice(j,1);a.res();}}
  S.showT+=dt;windU.value=S.showT;
  flames.forEach(function(f,k){var fl=1+Math.sin(S.showT*9+k*1.7)*0.12+Math.sin(S.showT*17+k)*0.06;f.scale.set(0.9*fl,1.3*fl,1);});
  torchSprites.forEach(function(f,k){var fl=1+Math.sin(S.showT*11+k*2.1)*0.14+Math.sin(S.showT*23+k)*0.07;f.scale.set(1.0*fl,1.5*fl,1);});
  balloons.forEach(function(b){b.m.position.y=b.y+Math.sin(S.showT*1.2+b.ph)*0.18;});
  clouds.forEach(function(c,k){c.position.x+=Math.sin(k)*0.02;});
  guests.forEach(function(gq){gq.ph+=dt*1.4;gq.group.position.y=0.04+Math.abs(Math.sin(gq.ph))*0.012;gq.head.rotation.y=Math.sin(gq.ph*0.7)*0.25;gq.armL.rotation.x=Math.sin(gq.ph)*0.05;});
  candleLight.intensity=1.2+Math.sin(S.showT*13)*0.12;ENV.tick(dt);

  var pg=player.group;
  if(S.mode==='intro'){
    S.introD+=INTRO_SPEED*dt;var yaw=introPos(S.introD,tA);pg.position.copy(tA);turnTo(pg,yaw,dt*8);walkAnim(player,S.introD*3.0,0.65);
    if(S.introD>=WPL[WPL.length-1])toReady();
  }else if(S.mode==='ready'||S.mode==='startfx'){
    tA.copy(WP[WP.length-1]);tA.y=0.04;pg.position.copy(tA);turnTo(pg,0,dt*6);walkAnim(player,0,0);
  }else if(S.mode==='play'){
    var f2=f2At(S.t,tB);var nextStop=S.gate<5?gates[S.gate].stopT:0.975;
    var tsp=K.fwd?(K.run?RUN_SPEED:WALK_SPEED):0,dl=(nextStop-S.t)*dsAt(S.t);if(S.gate<5&&dl<3.2)tsp=Math.min(tsp,Math.max(1.1,dl*1.5));
    S.spd+=Math.max(-24*dt,Math.min(22*dt,tsp-S.spd));if(S.spd<0.02&&tsp===0)S.spd=0;var step=S.spd/dsAt(S.t)*dt;var nt=Math.min(S.t+step,nextStop);var moved=nt>S.t&&S.spd>0.05;S.t=nt;
    var side=(K.right?1:0)-(K.left?1:0);S.off=Math.max(-0.95,Math.min(1.2,S.off+side*2.2*dt));
    P(S.t,S.off,tA);tA.y+=0.04;pg.position.copy(tA);turnTo(pg,Math.atan2(f2.x,f2.z),dt*8);
    if(moved||side){var rr=Math.max(0,Math.min(1,(S.spd-4.6)/2.6));S.wph+=dt*Math.max(S.spd,3.2)*(2.95-0.75*rr);walkAnim(player,S.wph,(0.65+0.4*rr)*Math.max(0.55,Math.min(1,S.spd/4.6)));}else walkAnim(player,0,0);
    if(S.gate<5&&S.t>=nextStop-1e-5)gateSeq(S.gate);
    else if(S.gate>=5&&S.t>=0.975)finale();
  }else if(S.mode==='gate'){
    P(S.t,S.off,tA);tA.y+=0.04;pg.position.copy(tA);if(S.recoil){pg.position.x-=Math.sin(pg.rotation.y)*S.recoil;pg.position.z-=Math.cos(pg.rotation.y)*S.recoil;}if(!S.hands)walkAnim(player,0,0);
  }else if(S.mode==='finale'||S.mode==='result'){
    if(STD.g&&STD.g.visible&&STD.g.parent===vb.group){var cyw=Math.atan2(camera.position.x-vb.group.position.x,camera.position.z-vb.group.position.z)-vb.group.rotation.y;cyw=Math.atan2(Math.sin(cyw),Math.cos(cyw));STD.g.rotation.y+=(cyw-STD.g.rotation.y)*Math.min(1,dt*6);}
    walkAnim(player,0,0);if(S.faceVb)turnTo(pg,Math.atan2(vb.group.position.x-pg.position.x,vb.group.position.z-pg.position.z),dt*6);
  }
  updateSprite(dt);updateProd(dt);
  if(cact){cT-=dt;if(cT<=0){cact=false;cpts.visible=false;}for(var q=0;q<CN;q++){var v=cvel[q];v[1]-=9*dt;cpos[q*3]+=v[0]*dt;cpos[q*3+1]+=v[1]*dt;cpos[q*3+2]+=v[2]*dt;if(cpos[q*3+1]<(S.t>0.5?12.6:0.1)&&v[1]<0){cpos[q*3+1]=S.t>0.5?12.6:0.1;v[0]*=0.9;v[1]=0;v[2]*=0.9;}}cgeo.attributes.position.needsUpdate=true;}

  /* lights follow */
  follow.position.set(pg.position.x,pg.position.y+2.6,pg.position.z);
  sun.target.position.copy(pg.position);sun.position.copy(pg.position).add(SUNPOS);
  gates.forEach(function(g){var near=S.mode==='intro'||S.mode==='ready'?0:Math.max(0,1-Math.abs(S.t-g.t)/0.09);g.light.intensity=lerp(g.light.intensity,near*2.0*(1+Math.sin(S.showT*12+g.idx)*0.08),Math.min(1,dt*4));});

  /* camera */
  S.shake=Math.max(0,S.shake-dt*1.4);var k=Math.min(1,dt*3);
  if(S.mode==='intro'||S.mode==='ready'){
    wantPos.set(XF+10,3.2,-46);wantLook.set(XF-3,1.9,-14);
    if(S.mode==='ready'){wantPos.set(RC0+7.5,2.2,-13.5);wantLook.set(RC0-0.6,1.7,0);}
  }else if(S.hands&&S.hcol){
    var hf=f2At(S.t,tC),hr=CT_r.set(hf.z,0,-hf.x).normalize();
    P(S.t,S.off,tB);var hm=CT_m.copy(tB).addScaledVector(hf,0.4);hm.y=pg.position.y;k=Math.min(1,dt*2);
    var rbc=S.hcol.rb&&!sideActive();var ptr=(stage.clientWidth/Math.max(1,stage.clientHeight))<1;
    if(ptr){k=Math.min(1,dt*2.8);S.gk=lerp(S.gk||0,S.grab?1:0,Math.min(1,dt*3.5));var gk=S.gk,PS=lerp(PCAM.side,PCAM.gside,gk),PF=lerp(PCAM.fwd,PCAM.gfwd,gk);wantPos.copy(hm).addScaledVector(hr,(S.pocketSide||-1)*PS).addScaledVector(hf,PF);wantPos.y=hm.y+lerp(PCAM.h,PCAM.gh,gk);wantLook.copy(hm).addScaledVector(hr,(S.pocketSide||-1)*PCAM.glat*gk);wantLook.y=hm.y+lerp(PCAM.ly,PCAM.gly,gk);}
    else{wantPos.copy(hm).addScaledVector(hr,(S.pocketSide||-1)*(rbc?2.9:(sideActive()?3.8:3.5))).addScaledVector(hf,rbc?1.2:-0.25);wantPos.y=hm.y+1.05;
    wantLook.copy(hm);wantLook.y=hm.y+0.98;}
    if(S.qaCam){var qp=player.pocketCash.getWorldPosition(new V3());player.group.updateMatrixWorld(true);wantPos.copy(player.group.localToWorld(new V3(-S.qaCam,1.15,0.9)));wantLook.copy(qp);wantLook.y+=0.1;camPos.copy(wantPos);camLook.copy(wantLook);}
  }else if(sideActive()&&(S.mode==='play'||S.mode==='gate'||S.mode==='intro')){
    var sfx=Math.sin(pg.rotation.y),sfz=Math.cos(pg.rotation.y),pt=(stage.clientWidth/Math.max(1,stage.clientHeight))<1;
    wantPos.set(pg.position.x-sfz*(pt?3.6:4.6)+sfx*0.3,pg.position.y+1.4,pg.position.z+sfx*(pt?3.6:4.6)+sfz*0.3);
    wantLook.set(pg.position.x+sfx*(pt?1.0:1.7),pg.position.y+1.05,pg.position.z+sfz*(pt?1.0:1.7));
  }else if(S.mode==='startfx'){wantPos.set(RC0+0.8,2.3,-8.5);wantLook.set(RC0-0.2,1.8,6);}
  else if(S.mode==='finale'||S.mode==='result'){
    k=Math.min(1,dt*1.6);
    if(S.fcam){wantPos.copy(S.fcam.pos);wantLook.copy(S.fcam.look);}
    else{var mid=pg.position.clone().add(vb.group.position).multiplyScalar(0.5);mid.y+=1.5;wantPos.set(mid.x+5,mid.y+0.4,mid.z+5);wantLook.copy(mid);}
  }else{
    var dsn=dsAt(S.t),tbRaw=S.t-3.8/dsn;
    if(tbRaw>=0){P(tbRaw,S.off*0.3+0.55,wantPos);}else{P(0,S.off*0.3+0.55,wantPos);wantPos.addScaledVector(f2At(0,tC),tbRaw*dsn);wantPos.y=0;}
    wantPos.y+=1.95;
    var tl=Math.min(1,S.t+4.6/dsn);P(tl,0,wantLook);wantLook.y+=1.45;
  }
  if(S.mode==='gate'||S.mode==='finale'||S.mode==='result'){var lim=(S.mode==='gate'?((stage.clientWidth<stage.clientHeight)?4.5:4.5):3.5)*dt;CT_d.copy(wantPos).sub(camPos).multiplyScalar(k);var dl=CT_d.length();if(dl>lim)CT_d.multiplyScalar(lim/dl);camPos.add(CT_d);
    CT_d.copy(wantLook).sub(camLook).multiplyScalar(k);dl=CT_d.length();if(dl>lim*1.5)CT_d.multiplyScalar(lim*1.5/dl);camLook.add(CT_d);}
  else{camPos.lerp(wantPos,k);camLook.lerp(wantLook,k);}
  camera.position.set(camPos.x+(Math.random()-0.5)*S.shake*0.08,camPos.y+(Math.random()-0.5)*S.shake*0.06,camPos.z);
  camera.lookAt(camLook);
  sky.position.copy(camera.position);
  /* V20f: the Gate 5 signal-box fades out only while the grab/inspection camera is within 1.9 m of it, so it can never fill the frame. */
  for(var nfI=0;nfI<gates.length;nfI++){var nf=gates[nfI].grp.userData.nearFade;if(!nf)continue;
    nf.meshes.forEach(function(m,mi){m.getWorldPosition(NF_v);var nfT=NF_v.distanceTo(camera.position)<(mi===2?1.5:1.9)?0:1;var a=nf.a[mi];a+=(nfT-a)*Math.min(1,dt*9);if(Math.abs(nfT-a)<0.01)a=nfT;nf.a[mi]=a;var tr=a<0.999;m.visible=a>0.02;if(m.material.transparent!==tr){m.material.transparent=tr;m.material.needsUpdate=true;}m.material.opacity=a;});}
  for(var dI=0;dI<DN;dI++){var px=dpos[dI*3]+Math.sin(S.showT*0.3+dI)*0.003,py=dpos[dI*3+1]+Math.sin(S.showT*0.5+dI*2)*0.002+0.0015,pz=dpos[dI*3+2]+Math.cos(S.showT*0.3+dI)*0.003;if(py>7)py=0;dpos[dI*3]=px;dpos[dI*3+1]=py;dpos[dI*3+2]=pz;}
  dgeo.attributes.position.needsUpdate=true;dust.position.set(camera.position.x,camera.position.y-2,camera.position.z);
  if(RB.on)RB.tick(dt);
}
function resize(){
  var w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
  var pr=pixelRatio();renderer.setPixelRatio(pr);renderer.setSize(w,h,false);
  renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';
  camera.aspect=w/h;camera.fov=w/h<1?66:52;camera.updateProjectionMatrix();
  if(composer){composer.setPixelRatio(pr);composer.setSize(w,h);if(fxaa)fxaa.material.uniforms.resolution.value.set(1/(w*pr),1/(h*pr));}
}
if(window.ResizeObserver){new ResizeObserver(resize).observe(stage);}else{window.addEventListener('resize',resize);}
var PERF=/[?&](perf|diag)=1/.test(location.search)?{el:null,max:0,n:0,spikes:[],tU:0,tR:0,t0:0,fr:0}:null;
function frame(now){
  requestAnimationFrame(frame);
  var dt=Math.min(0.05,(now-last)/1000);var rawMs=now-last;last=now;
  var pa=PERF?performance.now():0;
  update(dt);
  var pb=PERF?performance.now():0;
  if(gradePass)gradePass.uniforms.uTime.value=S.showT%100;
  if(Q.high)renderer.shadowMap.autoUpdate=!(S.mode==='gate'&&((shF=(shF+1)|0)&1));
  if(composer)composer.render(dt);else renderer.render(scene,camera);
  if(PERF){var pc=performance.now();PERF.tU+=pb-pa;PERF.tR+=pc-pb;PERF.fr++;if(rawMs>PERF.max)PERF.max=rawMs;
    if(rawMs>50&&PERF.spikes.length<40){var inf=renderer.info;PERF.spikes.push({ms:Math.round(rawMs),upd:Math.round(pb-pa),rnd:Math.round(pc-pb),mode:S.mode,hands:!!S.hands,geo:inf.memory.geometries,tex:inf.memory.textures,calls:inf.render.calls});}
    if(!PERF.el){PERF.el=document.createElement('pre');PERF.el.style.cssText='position:fixed;right:4px;bottom:150px;z-index:99999;background:rgba(0,0,0,.75);color:#ff9;font:10px monospace;padding:4px;margin:0;pointer-events:none;white-space:pre';document.body.appendChild(PERF.el);PERF.t0=now;}
    if(now-PERF.t0>1000){var i2=renderer.info;PERF.el.textContent='fps '+PERF.fr+' maxdt '+Math.round(PERF.max)+'ms\nupd '+(PERF.tU/PERF.fr).toFixed(1)+' rnd '+(PERF.tR/PERF.fr).toFixed(1)+'ms\ncalls '+i2.render.calls+' tri '+i2.render.triangles+'\ngeo '+i2.memory.geometries+' tex '+i2.memory.textures+'\nspikes>50ms '+PERF.spikes.length+(PERF.spikes.length?' last@'+PERF.spikes[PERF.spikes.length-1].mode:'');PERF.fr=0;PERF.max=0;PERF.tU=0;PERF.tR=0;PERF.t0=now;}
    window.__perfSpikes=PERF.spikes;}
}
buildNotes();setWallet(TOTAL);setVb(0);
applyQuality();
camera.position.copy(camPos);camera.lookAt(camLook);
$('loading').hidden=true;
var fp=[];try{fp=[document.fonts.load('700 40px "Anek Telugu"','వాసూల్'),document.fonts.load('400 40px Anton','A'),document.fonts.load('400 20px Hind','A')];}catch(e){}
Promise.all(fp).then(function(){redraws.forEach(function(f){f();});}).catch(function(){});
(function(){var st=document.getElementById('stage'),pd=document.getElementById('pad');function blk(e){var t=e.target;if(t&&t.closest&&t.closest('#result .card'))return;e.preventDefault();}
[st,pd].forEach(function(n){if(!n)return;n.addEventListener('contextmenu',blk);n.addEventListener('selectstart',blk);n.addEventListener('dragstart',blk);});
document.addEventListener('selectionchange',function(){if(S.mode==='result')return;var sl=window.getSelection&&window.getSelection();if(sl&&!sl.isCollapsed&&sl.anchorNode&&((st&&st.contains(sl.anchorNode))||(pd&&pd.contains(sl.anchorNode))))sl.removeAllRanges();});})();
(function(){var n=0,t0=0,st=document.getElementById('stage');if(!st)return;st.addEventListener('pointerdown',function(e){var r=st.getBoundingClientRect();if(e.clientX-r.left>70||e.clientY-r.top>70)return;var t=Date.now();if(t-t0>1500)n=0;t0=t;if(++n>=5){n=0;if(!PERF)PERF={el:null,max:0,n:0,spikes:[],tU:0,tR:0,t0:0,fr:0};RB.showDiag(true);}});})();
loadSprites();prodLoad();RB.start();
/*DBG*/
if(!/[?&]norAF/.test(location.search))requestAnimationFrame(frame);else last=performance.now();
}
})();
