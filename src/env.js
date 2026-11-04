/* ---------- ENV: roadside scenery prototype (entrance + Gate 1). Scenery only: no gameplay, route, collision or camera change ---------- */
var ENV=(function(){
  var E={groups:[],on:!/[?&]env=0/.test(location.search),npcs:[],bob:[],steam:[],flags:[],lamps:[],ph:0};
  E.tick=function(){};E.rbReady=function(){};E.build=function(){};if(!E.on)return E;
  var QQ=new THREE.Object3D(),M={},GEO={};
  function mt(k,hex,r,m,ex){return M[k]||(M[k]=sm(hex,r==null?0.85:r,m||0,ex));}
  /* ---- geometry shortcuts ---- */
  function bx(w,h,d){return new THREE.BoxGeometry(w,h,d);}
  function cy(a,b,h,s){return new THREE.CylinderGeometry(a,b,h,s||12);}
  function sp(r,ws,hs){return new THREE.SphereGeometry(r,ws||14,hs||10);}
  function pl(w,h,ws,hs){return new THREE.PlaneGeometry(w,h,ws||1,hs||1);}
  /* ---- merged builder: collects parts, merges by material (few draw calls per prop) ---- */
  var VCR=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.82,metalness:0}),VCM=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.4,metalness:0.7});
  function vcOf(m){if(m.map||m.transparent||m.alphaTest||(m.emissive&&m.emissive.getHex()>0))return null;return m.metalness>0.3?VCM:VCR;}
  function Bld(){var items=[];var self={items:items,
    add:function(g,m,x,y,z,rx,ry,rz,sx,sy,sz){QQ.position.set(x||0,y||0,z||0);QQ.rotation.set(rx||0,ry||0,rz||0);QQ.scale.set(sx==null?1:sx,sy==null?1:sy,sz==null?1:sz);QQ.updateMatrix();
      var c=g.clone();c.applyMatrix4(QQ.matrix);var vm=vcOf(m);if(vm){var n=c.attributes.position.count,ca=new Float32Array(n*3);for(var i=0;i<n;i++){ca[i*3]=m.color.r;ca[i*3+1]=m.color.g;ca[i*3+2]=m.color.b;}c.setAttribute('color',new THREE.BufferAttribute(ca,3));m=vm;}
      items.push([c,m]);return self;},
    merge:function(o,x,y,z,ry){QQ.position.set(x||0,y||0,z||0);QQ.rotation.set(0,ry||0,0);QQ.scale.set(1,1,1);QQ.updateMatrix();o.items.forEach(function(it){var c=it[0].clone();c.applyMatrix4(QQ.matrix);items.push([c,it[1]]);});return self;},
    parts:function(){var by={},out=[];items.forEach(function(it){var k=it[1].uuid;(by[k]=by[k]||{m:it[1],g:[]}).g.push(it[0]);});
      for(var k in by){var gs=by[k].g,geo=gs.length>1?THREE.BufferGeometryUtils.mergeBufferGeometries(gs):gs[0];out.push({g:geo,m:by[k].m});}return out;},
    done:function(parent,x,y,z,ry,cast){var grp=new THREE.Group();grp.position.set(x||0,y||0,z||0);grp.rotation.y=ry||0;
      this.parts().forEach(function(p){var me=new THREE.Mesh(p.g,p.m);me.castShadow=cast!==false&&!p.m.transparent&&!(p.m.map&&p.m.map.image&&p.m.alphaTest);me.receiveShadow=true;grp.add(me);});
      (parent||scene).add(grp);return grp;}};return self;}
  function instanced(B,mats){var out=[];B.parts().forEach(function(p){var im=new THREE.InstancedMesh(p.g,p.m,mats.length);mats.forEach(function(mx,i){im.setMatrixAt(i,mx);});im.castShadow=!p.m.transparent;im.receiveShadow=true;im.frustumCulled=false;scene.add(im);out.push(im);});return out;}
  function mxAt(x,y,z,ry,s){QQ.position.set(x,y,z);QQ.rotation.set(0,ry||0,0);QQ.scale.set(s||1,s||1,s||1);QQ.updateMatrix();return QQ.matrix.clone();}
  function rnd(a){a=(a*127.1+311.7)%1000;return Math.abs(Math.sin(a*12.9898)*43758.5453)%1;}
  /* ---- textures ---- */
  var T={};
  function stripe(c1,c2,scal){var k='s'+c1+c2+(scal?1:0);return T[k]||(T[k]=mkTex(256,128,function(x,w,h){x.clearRect(0,0,w,h);for(var i=0;i<8;i++){x.fillStyle=i%2?c2:c1;x.fillRect(i*w/8,0,w/8,h);}
      if(scal){x.globalCompositeOperation='destination-out';for(var j=0;j<8;j++){x.beginPath();x.arc(j*w/8+w/16,h-4,w/16,0,Math.PI,false);x.lineTo(j*w/8,h);x.lineTo((j+1)*w/8,h);x.closePath();x.fill();}x.globalCompositeOperation='source-over';}
      var g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(255,255,255,0.10)');g.addColorStop(1,'rgba(0,0,0,0.12)');x.fillStyle=g;x.fillRect(0,0,w,h);}));}
  function board(l1,l2,bg,fg,fg2,w,h){var k='b'+l1+l2+bg;return T[k]||(T[k]=mkTex(w||512,h||160,function(x,W,H){x.fillStyle=bg;x.fillRect(0,0,W,H);x.strokeStyle=fg;x.lineWidth=7;x.strokeRect(7,7,W-14,H-14);
      fitText(x,l1,W/2,l2?H*0.36:H*0.52,W-50,l2?54:62,'400','Anton, Impact, '+TEL,fg);if(l2)fitText(x,l2,W/2,H*0.72,W-50,46,'400',TEL,fg2||fg);}));}
  function valTex(c1,c2){var k='v'+c1+c2;return T[k]||(T[k]=mkTex(256,48,function(x,w,h){x.clearRect(0,0,w,h);var cw=w/8;for(var i=0;i<8;i++){x.fillStyle=i%2?c2:c1;x.beginPath();x.rect(i*cw,0,cw,h-cw/2);x.fill();x.beginPath();x.arc(i*cw+cw/2,h-cw/2,cw/2,0,Math.PI,false);x.fill();}}));}
  function plane(w,h,tile){var g=new THREE.PlaneGeometry(w,h),uv=g.attributes.uv;for(var i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/tile,uv.getY(i)*h/tile);return g;}
  var pavTex=mkTex(128,128,function(x,w,h){x.fillStyle='#d9c9b2';x.fillRect(0,0,w,h);for(var j=0;j<4;j++)for(var i=0;i<4;i++){var o=j%2?w/8:0;x.fillStyle='hsl(32,'+(18+((i*7+j*5)%9))+'%,'+(70+((i*3+j*11)%8))+'%)';x.fillRect(i*w/4+o+1.5,j*h/4+1.5,w/4-3,h/4-3);}});
  pavTex.wrapS=pavTex.wrapT=THREE.RepeatWrapping;
  var plankTex=mkTex(128,128,function(x,w,h){for(var i=0;i<6;i++){x.fillStyle='hsl('+(26+i%3*2)+',38%,'+(40+(i*5)%10)+'%)';x.fillRect(0,i*h/6,w,h/6-1.5);}x.fillStyle='rgba(0,0,0,.07)';for(var k=0;k<40;k++)x.fillRect(hash2(k,3)*w,hash2(k,9)*h,18+hash2(k,5)*30,1);});
  plankTex.wrapS=plankTex.wrapT=THREE.RepeatWrapping;
  /* ---- shared materials ---- */
  var wood=mt('wood',0xffffff,0.86,0,{map:plankTex}),woodD=mt('woodD',0x4e3322,0.85),cream=mt('cream',0xf0e2cc,0.9),pink=mt('pink',0xf4a9c4,0.55,0,{map:frostTex}),white=mt('white',0xf4f0e8,0.7),
      teal=mt('teal',0x2f8f86,0.8),plum=mt('plum',0x6a2d86,0.8),red=mt('red',0xc9363f,0.7),gold=mt('gold',0xe0b13a,0.4,0.5),steelM=mt('steel',0xb9bec6,0.35,0.8),
      iron=mt('iron',0x2b2f38,0.6,0.5),glassM=mt('glass',0xcfe9f2,0.1,0.1,{transparent:true,opacity:0.28,depthWrite:false}),
      tin=mt('tin',0x8e9aa6,0.5,0.55),sponge=mt('sponge',0xe3b36a,0.8),cherry=mt('cherry',0xc41e3a,0.3),choc=mt('choc',0x5a3622,0.6),yellow=mt('yellow',0xf2c23b,0.7),sky=mt('sky',0x5ba8e0,0.75);
  var pav=mt('pav',0xffffff,0.95,0,{map:pavTex});
  var flagCols=[0xe5484d,0xf2c23b,0x3fa7d6,0x5cc08a,0xb36bff,0xff8a3d].map(function(c,i){return mt('fl'+i,c,0.8,0);});
  var balCols=[0xff6b6b,0x4dabf7,0xffd43b,0x69db7c,0xda77f2,0xff922b].map(function(c,i){return mt('bl'+i,c,0.22,0.05);});
  function sample(t,off,o){P(t,off,tA);var r=Math.sqrt(tA.x*tA.x+tA.z*tA.z);o.x=tA.x;o.y=tA.y;o.z=tA.z;o.yaw=Math.atan2(-tA.x/r,-tA.z/r);o.rx=-tA.x/r;o.rz=-tA.z/r;return o;}
  var tmpS={};
  /* ================= props ================= */
  function stall(def,Z){
    var B=new Bld(),w=def.w||3.0,d=def.d||2.2,c1=def.c1||'#d94f5c',c2=def.c2||'#f6efe2',wall=def.wall||cream;
    if(!def.noFloor)B.add(bx(w+0.5,0.14,d+0.9),wood,0,0.07,0.2);
    B.add(bx(w,2.35,0.1),wall,0,1.3,-d/2);B.add(bx(w+0.12,0.12,0.16),woodD,0,2.5,-d/2+0.02);B.add(bx(w+0.12,0.1,0.16),woodD,0,0.2,-d/2+0.02);
    [-1,1].forEach(function(s){B.add(bx(0.08,1.15,d),wall,s*(w/2-0.04),0.75,0);B.add(cy(0.05,0.055,2.5,8),woodD,s*w/2,1.4,d/2);B.add(cy(0.05,0.055,2.5,8),woodD,s*w/2,1.4,-d/2);});
    /* counter */
    B.add(bx(w-0.1,0.98,0.55),mt('ctr'+(def.ctr||0),def.ctr||0xb78552,0.8),0,0.63,d/2-0.38);
    B.add(bx(w-0.1,0.07,0.62),cream,0,1.16,d/2-0.36);
    B.add(bx(w-0.1,0.05,0.5),woodD,0,0.34,d/2-0.38);
    for(var i=0;i<5;i++)B.add(bx(0.02,0.8,0.02),woodD,-w/2+0.3+i*(w-0.6)/4,0.65,d/2-0.095);
    /* roof: sloped striped awning, scalloped valance */
    var y0=2.72,y1=2.38,len=Math.sqrt((d+0.7)*(d+0.7)+(y0-y1)*(y0-y1)),ang=Math.atan2(y0-y1,d+0.7);
    var am=mt('aw'+c1+c2,0xffffff,0.85,0,{map:stripe(c1,c2),side:THREE.DoubleSide});
    B.add(pl(w+0.5,len),am,0,(y0+y1)/2,0.05+0.15,-Math.PI/2+ang,0,0);
    var vm=mt('vl'+c1+c2,0xffffff,0.85,0,{map:valTex(c1,c2),side:THREE.DoubleSide,alphaTest:0.5});
    B.add(pl(w+0.5,0.34),vm,0,y1-0.15,d/2+0.5,0,0,0);
    B.add(bx(w+0.5,0.05,0.05),woodD,0,y1+0.03,d/2+0.5);B.add(bx(w+0.5,0.05,0.05),woodD,0,y0+0.02,-d/2-0.3);
    /* sign board above the awning front */
    B.add(bx(w*0.9,0.55,0.07),mt('sb'+def.sign[0],0xffffff,0.8,0,{map:board(def.sign[0],def.sign[1],def.sb||'#2a1a4d','#ffd35a','#9affc4')}),0,y0+0.55,-d/2+0.15,0,0,0);
    [-1,1].forEach(function(s){B.add(cy(0.03,0.03,0.6,6),woodD,s*w*0.42,y0+0.3,-d/2+0.12);});
    /* hanging lanterns */
    for(var l=0;l<3;l++){B.add(cy(0.006,0.006,0.35,4),iron,-w/3+l*w/3,2.2,d/2+0.3);B.add(sp(0.09,10,8),mt('lan',0xffb050,0.4,0,{emissive:C(0xff9a30),emissiveIntensity:1.4}),-w/3+l*w/3,2.0,d/2+0.3);}
    if(!def.noFloor)B.add(plane(w+1.6,d+3.4,1.6),pav,0,0.008,0.9,-Math.PI/2,0,0);
    goods[def.type](B,w,d,def);
    var cr=mt('crate',0x9a6b3c,0.88,0,{map:plankTex}),sk=mt('sack',0xcdb68c,0.95),ch=mt('chalkB',0xffffff,0.9,0,{map:board(def.sign[1]||def.sign[0],'','#26352c','#f4f0e8','#f4f0e8',256,320)});
    B.add(bx(0.5,0.34,0.5),cr,w/2+0.42,0.17,d/2-0.1,0,0.2,0);B.add(bx(0.4,0.3,0.4),cr,w/2+0.4,0.49,d/2-0.1,0,-0.3,0);
    B.add(sp(0.26,10,8),sk,-w/2-0.4,0.2,d/2-0.35,0,0,0,1,0.95,0.8);B.add(sp(0.22,10,8),sk,-w/2-0.45,0.17,d/2+0.12,0,0,0,1,0.9,0.8);
    B.add(bx(0.5,0.78,0.04),ch,-w/4,0.42,d/2+1.05,-0.2,0,0);B.add(bx(0.5,0.78,0.04),woodD,-w/4,0.42,d/2+1.3,0.2,0,0);
    B.add(cy(0.17,0.15,0.5,12),mt('bin',0x3d6f5a,0.7),w/2+0.35,0.25,-d/2+0.2);
    Z.merge(B,def.x,def.y||0,def.z,def.yaw);var g=new THREE.Group();g.position.set(def.x,def.y||0,def.z);g.rotation.y=def.yaw||0;scene.add(g);
    /* paving apron in front of the stall */
    
    /* bunting along the front edge (sways) */
    var bg=new THREE.Group();bg.position.set(0,y1-0.28,d/2+0.55);g.add(bg);
    var bb=new Bld();for(var f=0;f<9;f++){var fx=-w/2-0.1+f*(w+0.2)/8,fy=-Math.sin(f/8*Math.PI)*0.0;var flag=new THREE.ConeGeometry(0.09,0.2,3);bb.add(flag,flagCols[(f+(def.fo||0))%6],fx,fy,0,Math.PI,0,0);}
    bb.done(bg,0,0,0,0,false);E.flags.push({g:bg,p:Math.random()*6});
    return g;}
  /* goods per stall type (merged) */
  var goods={
    tea:function(B,w,d){
      B.add(bx(0.7,0.55,0.55),iron,-w/2+0.55,0.42,-0.2);B.add(cy(0.17,0.2,0.28,14),steelM,-w/2+0.55,0.84,-0.2);B.add(cy(0.12,0.17,0.24,14),steelM,-w/2+0.55,1.06,-0.2);B.add(cy(0.015,0.03,0.2,6),steelM,-w/2+0.72,0.95,-0.2,0,0,-0.9);
      B.add(cy(0.14,0.2,0.34,14),steelM,-w/2+0.55,0.82,0.15);
      for(var i=0;i<6;i++)B.add(cy(0.035,0.03,0.08,10),glassM,0.2+i*0.12,1.24,d/2-0.35);
      for(var j=0;j<4;j++){B.add(cy(0.09,0.09,0.22,12),glassM,0.0+j*0.22-0.2,1.31,d/2-0.55);B.add(cy(0.095,0.095,0.04,12),[red,yellow,teal,plum][j],-0.2+j*0.22,1.43,d/2-0.55);}
      B.add(cy(0.12,0.12,0.2,12),steelM,w/2-0.4,1.27,d/2-0.5);
      B.add(bx(0.9,0.5,0.4),wood,w/2-0.55,2.0,-d/2+0.25);for(var k=0;k<5;k++)B.add(bx(0.12,0.2,0.1),[red,yellow,sky,pink,teal][k],w/2-0.9+k*0.16,2.15,-d/2+0.25);},
    cake:function(B,w,d){
      B.add(bx(w-0.7,0.9,0.7),glassM,0,1.65,d/2-0.38);B.add(bx(w-0.64,0.05,0.74),white,0,1.2,d/2-0.38);B.add(bx(w-0.64,0.05,0.74),white,0,2.1,d/2-0.38);B.add(bx(w-0.64,0.05,0.74),white,0,1.65,d/2-0.38);
      [-1,1].forEach(function(s){B.add(bx(0.04,0.95,0.04),steelM,s*(w/2-0.36),1.65,d/2-0.04);B.add(bx(0.04,0.95,0.04),steelM,s*(w/2-0.36),1.65,d/2-0.72);});
      for(var i=0;i<3;i++){var cx=-w/2+0.75+i*(w-1.5)/2;
        B.add(cy(0.22,0.24,0.14,18),sponge,cx,1.3,d/2-0.38);B.add(cy(0.235,0.235,0.04,18),[pink,white,choc][i],cx,1.4,d/2-0.38);B.add(sp(0.035,8,6),cherry,cx,1.46,d/2-0.38);
        B.add(cy(0.15,0.17,0.12,16),sponge,cx,1.73,d/2-0.38);B.add(cy(0.16,0.16,0.04,16),[white,choc,pink][i],cx,1.81,d/2-0.38);B.add(sp(0.03,8,6),cherry,cx,1.86,d/2-0.38);}
      for(var j=0;j<5;j++){B.add(cy(0.04,0.03,0.05,10),[red,yellow,teal,plum,sky][j],-w/2+0.5+j*0.13,0.0+1.24,d/2-0.38+0.2);B.add(sp(0.045,8,6),[pink,white,pink,white,pink][j],-w/2+0.5+j*0.13,1.3,d/2-0.38+0.2);}
      B.add(cy(0.28,0.3,0.1,20),white,0.45,1.25,-0.15);B.add(cy(0.24,0.26,0.18,20),pink,0.45,1.39,-0.15);B.add(cy(0.17,0.19,0.16,20),cream,0.45,1.56,-0.15);B.add(sp(0.05,10,8),cherry,0.45,1.68,-0.15);
      B.add(bx(0.8,0.6,0.05),mt('chalk',0x2b3a2f,0.9),-w/2+0.7,1.85,-d/2+0.1);B.add(bx(0.06,0.55,0.05),woodD,-w/2+0.7,1.85,-d/2+0.08);},
    snack:function(B,w,d){
      for(var r=0;r<3;r++)B.add(bx(w-0.5,0.04,0.35),wood,0,1.35+r*0.4,-d/2+0.3);
      for(var r2=0;r2<3;r2++)for(var i=0;i<7;i++)B.add(bx(0.2,0.24,0.08),flagCols[(i+r2*2)%6],-w/2+0.4+i*(w-0.8)/6,1.5+r2*0.4,-d/2+0.34,0,0,0.04*(i%3-1));
      for(var j=0;j<3;j++)B.add(cy(0.11,0.11,0.26,12),glassM,0.1+j*0.28,1.32,d/2-0.5),B.add(cy(0.115,0.115,0.04,12),[red,gold,teal][j],0.1+j*0.28,1.47,d/2-0.5);
      B.add(cy(0.28,0.22,0.1,18),iron,-w/2+0.6,1.24,d/2-0.4);B.add(cy(0.26,0.26,0.015,18),yellow,-w/2+0.6,1.29,d/2-0.4);
      for(var k=0;k<8;k++)B.add(bx(0.13,0.2,0.02),flagCols[k%6],-w/2+0.3+k*0.35,2.18-Math.sin(k*0.9)*0.04,d/2+0.2);
      B.add(cy(0.004,0.004,w,4),iron,0,2.3,d/2+0.2,0,0,Math.PI/2);},
    candle:function(B,w,d){
      for(var r=0;r<3;r++)B.add(bx(w-0.5,0.04,0.35),wood,0,1.35+r*0.4,-d/2+0.3);
      for(var r2=0;r2<3;r2++)for(var i=0;i<9;i++){var h=0.16+0.08*((i+r2)%3);B.add(cy(0.03,0.03,h,8),[white,yellow,pink,cream,red][(i+r2)%5],-w/2+0.35+i*(w-0.7)/8,1.37+r2*0.4+h/2+0.02,-d/2+0.34);B.add(sp(0.022,6,5),mt('flm',0xffe08a,0.4,0,{emissive:C(0xffb030),emissiveIntensity:1.6}),-w/2+0.35+i*(w-0.7)/8,1.37+r2*0.4+h+0.05,-d/2+0.34);}
      for(var j=0;j<7;j++){B.add(cy(0.09,0.05,0.045,10),mt('diya',0xc4642c,0.8),-w/2+0.4+j*0.28,1.2,d/2-0.45);B.add(sp(0.018,6,5),mt('flm',0xffe08a,0.4,0,{emissive:C(0xffb030),emissiveIntensity:1.6}),-w/2+0.4+j*0.28,1.26,d/2-0.45);}
      for(var k=0;k<2;k++){B.add(cy(0.13,0.14,0.6,12),[red,yellow][k],w/2-0.4-k*0.3,0.45,-0.1);}},
    clock:function(B,w,d){
      for(var i=0;i<6;i++){var cx=-w/2+0.4+i*(w-0.8)/5,cyy=1.55+0.35*((i%2)?1:0);B.add(cy(0.17,0.17,0.05,18),i%2?gold:white,cx,cyy,-d/2+0.32,Math.PI/2,0,0);B.add(cy(0.14,0.14,0.055,18),mt('cface',0xfaf4e4,0.6),cx,cyy,-d/2+0.33,Math.PI/2,0,0);B.add(bx(0.012,0.1,0.01),iron,cx,cyy+0.04,-d/2+0.365);B.add(bx(0.09,0.012,0.01),iron,cx+0.03,cyy,-d/2+0.365);}
      B.add(bx(w-0.7,0.04,0.5),wood,0,1.22,d/2-0.4);
      for(var j=0;j<6;j++){B.add(cy(0.055,0.055,0.012,14),[gold,steelM,gold,steelM,gold,steelM][j],-w/2+0.5+j*0.38,1.26,d/2-0.4);B.add(cy(0.04,0.04,0.014,14),mt('cface',0xfaf4e4,0.6),-w/2+0.5+j*0.38,1.265,d/2-0.4);}},
    optic:function(B,w,d){
      for(var r=0;r<3;r++)B.add(bx(w-0.5,0.04,0.35),wood,0,1.35+r*0.4,-d/2+0.3);
      for(var r2=0;r2<3;r2++)for(var i=0;i<5;i++){var x0=-w/2+0.55+i*(w-1.1)/4,y0=1.48+r2*0.4;[-0.07,0.07].forEach(function(dx){B.add(new THREE.TorusGeometry(0.045,0.007,5,14),[iron,gold,red,teal,iron][(i+r2)%5].metalness>0.3?iron:[iron,woodD,red,teal,plum][(i+r2)%5],x0+dx,y0,-d/2+0.35);});B.add(bx(0.05,0.008,0.008),iron,x0,y0+0.01,-d/2+0.35);}
      B.add(bx(0.5,0.5,0.04),glassM,w/2-0.5,1.6,d/2-0.45);B.add(bx(0.36,0.26,0.02),mt('mir',0xcfe3f0,0.2,0.6),w/2-0.5,1.6,d/2-0.43);},
    balloon:function(B,w,d){
      for(var i=0;i<4;i++){B.add(bx(0.4,0.3,0.4),[pink,sky,yellow,teal][i],-w/2+0.55+i*0.42,0.28,-0.1);B.add(bx(0.42,0.045,0.08),red,-w/2+0.55+i*0.42,0.45,-0.1);}
      for(var j=0;j<4;j++){B.add(cone(0.12,0.28),[red,yellow,sky,plum][j],0.0+j*0.2,1.33,d/2-0.45);}
      B.add(bx(0.7,0.5,0.45),pink,w/2-0.55,1.45,d/2-0.45);B.add(bx(0.72,0.07,0.1),white,w/2-0.55,1.7,d/2-0.45);B.add(bx(0.07,0.5,0.47),white,w/2-0.55,1.45,d/2-0.45);}
  };
  function cone(r,h){return new THREE.ConeGeometry(r,h,12);}
  /* floating balloons above a stall (animated) */
  function balloons(x,y,z,n,spread){var grp=new THREE.Group();grp.position.set(x,y,z);scene.add(grp);var B=new Bld();
    for(var i=0;i<n;i++){var a=i/n*6.28,rr=0.18+rnd(i+x)*spread,bxp=Math.cos(a)*rr,bzp=Math.sin(a)*rr,by=0.9+rnd(i+z)*0.9;
      B.add(sp(0.23,18,14),balCols[i%6],bxp,by,bzp,0,0,0,1,1.22,1);B.add(cy(0.005,0.005,by,3),white,bxp*0.5,by/2,bzp*0.5);}
    B.done(grp,0,0,0,0,false);E.bob.push({g:grp,y:y,p:Math.random()*6});return grp;}
  /* instanced benches / lamps / posts / planters */
  function benchB(){var B=new Bld();B.add(bx(1.5,0.06,0.45),wood,0,0.46,0);B.add(bx(1.5,0.5,0.05),wood,0,0.78,-0.22,-0.18,0,0);[-0.62,0.62].forEach(function(s){B.add(bx(0.06,0.46,0.4),iron,s,0.23,0);B.add(bx(0.06,0.5,0.05),iron,s,0.75,-0.2,-0.18,0,0);});return B;}
  function lampB(){var B=new Bld();B.add(cy(0.07,0.1,3.6,10),iron,0,1.8,0);B.add(cy(0.14,0.16,0.12,10),iron,0,0.06,0);B.add(bx(0.7,0.06,0.06),iron,0.3,3.5,0);
    B.add(cy(0.17,0.12,0.07,10),iron,0.58,3.52,0);B.add(sp(0.2,14,10),mt('lampG',0xffe9b0,0.3,0,{emissive:C(0xffd890),emissiveIntensity:1.3}),0.58,3.36,0,0,0,0,1,1.15,1);return B;}
  function plantersAt(list){var B=new Bld();B.add(bx(1.4,0.34,0.56),mt('stone',0xcfc3b0,0.9),0,0.17,0);B.add(bx(1.28,0.06,0.44),mt('soil',0x4a3626,1),0,0.35,0);
    var ims=instanced(B,list.map(function(l){return mxAt(l[0],l[1],l[2],l[3]);}));
    /* flowers: instanced coloured blooms with per-instance colour */
    var fg=sp(0.11,8,6),fm=new THREE.InstancedMesh(fg,mt('bloom',0xffffff,0.6),list.length*14),n=0,col=new THREE.Color(),pal=[0xff6fa8,0xffd23f,0xffffff,0xb36bff,0xff7a3d,0xff4d6d];
    list.forEach(function(l,li){for(var k=0;k<14;k++){var lx=(k%7-3)*0.17,lz=(Math.floor(k/7)-0.5)*0.22,c=Math.cos(l[3]),s=Math.sin(l[3]);
      QQ.position.set(l[0]+lx*c+lz*s,l[1]+0.42+rnd(k+li)*0.06,l[2]-lx*s+lz*c);QQ.rotation.set(0,0,0);QQ.scale.setScalar(0.8+rnd(k*3+li)*0.6);QQ.updateMatrix();fm.setMatrixAt(n,QQ.matrix);col.setHex(pal[(k+li)%6]);col.convertSRGBToLinear();fm.setColorAt(n,col);n++;}});
    fm.frustumCulled=false;scene.add(fm);
    var lg=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.34,1),mt('leaf',0x3f8a3c,0.9),list.length*3);n=0;
    list.forEach(function(l,li){for(var k=0;k<3;k++){var c=Math.cos(l[3]),s=Math.sin(l[3]),lx=(k-1)*0.42;QQ.position.set(l[0]+lx*c,l[1]+0.42,l[2]-lx*s);QQ.rotation.set(0,k,0);QQ.scale.set(1,0.55,1);QQ.updateMatrix();lg.setMatrixAt(k+li*3,QQ.matrix);}});
    lg.receiveShadow=true;lg.frustumCulled=false;scene.add(lg);}
  /* ================= people ================= */
  var NP=[];
  function npc(def){var c=makeChar({shirt:def.shirt||0x6a8ab0,pants:def.pants||0x2d3350,skin:def.skin||0xc58f5f,hair:def.hair||0x1a1410,mustache:!!def.mus});
    c.group.position.set(def.x,def.y||0.04,def.z);c.group.rotation.y=def.yaw||0;scene.add(c.group);
    var n={c:c,def:def,x0:def.x,z0:def.z,y0:def.y||0.04,yaw0:def.yaw||0,ph:Math.random()*6,wp:def.path||null,wi:1,wait:0,y:def.y||0.04};NP.push(n);E.npcs.push(n);return n;}
  var GT=[0xe8c9a8,0xb4c8dc,0xd9c27a,0xe3a8a8,0xb8d8c0,0xc8b6e8,0xf0d8c0,0xa9c4e8,0xd8b4a0,0xcfd8e8];
  function skin(c,model,tint){var src=model==='c'?RB.G.collector:RB.G.player;var sc=THREE.SkeletonUtils.clone(src.scene),bodies=[];
    sc.traverse(function(o){if(o.isSkinnedMesh&&o.material){o.material=o.material.clone();if(/body/i.test(o.name))bodies.push(o.material);}});
    RB.attach(c,{scene:sc,animations:src.animations},'npc');
    if(tint!=null&&model!=='c')bodies.forEach(function(m){m.color.copy(C(tint)).multiplyScalar(0.92);});}
  E.rbReady=function(){
    if(!RB.G||!THREE.SkeletonUtils)return;
    NP.forEach(function(n){if(n.c.rb)return;skin(n.c,n.def.model,n.def.tint);});
    guests.forEach(function(g,i){if(g.rb)return;skin(g,i%4===3?'c':'p',GT[i%GT.length]);});};
  E.tick=function(dt){
    E.ph+=dt;var pp=player.group.position;
    E.bob.forEach(function(b){b.g.position.y=b.y+Math.sin(E.ph*1.1+b.p)*0.12;b.g.rotation.z=Math.sin(E.ph*0.7+b.p)*0.03;});
    E.flags.forEach(function(f){f.g.rotation.z=Math.sin(E.ph*1.6+f.p)*0.035;f.g.rotation.x=Math.sin(E.ph*1.1+f.p)*0.05;});
    E.steam.forEach(function(s,i){var u=(E.ph*0.5+i*0.33)%1;s.position.set(s.userData.x,s.userData.y+u*0.5,s.userData.z);s.material.opacity=0.28*Math.sin(u*Math.PI);var k=0.22+u*0.3;s.scale.set(k,k*1.4,1);});
    E.lamps.forEach(function(l,i){l.material.opacity=0.55+Math.sin(E.ph*2.3+i*1.7)*0.04;});
    function setCast(g,on){g.traverse(function(o){if(o.isMesh){if(o.userData.cs===undefined)o.userData.cs=o.castShadow;o.castShadow=on&&o.userData.cs;}});}
    guests.forEach(function(gq,i){var ddx=pp.x-gq.group.position.x,ddz=pp.z-gq.group.position.z,d2=ddx*ddx+ddz*ddz,v=(d2<(Q.high?2704:1296))&&(Q.high||i%2===0);if(gq.group.visible!==v)gq.group.visible=v;var sc=d2<196;if(gq.sc!==sc){gq.sc=sc;setCast(gq.group,sc);}});
    NP.forEach(function(n){var c=n.c,g=c.group,dx=pp.x-g.position.x,dz=pp.z-g.position.z,dd=Math.sqrt(dx*dx+dz*dz);
      var vis=dd<(Q.high?52:36)&&(Q.high||NP.indexOf(n)%2===0);if(g.visible!==vis)g.visible=vis;if(!vis)return;var sc2=dd<14;if(n.sc!==sc2){n.sc=sc2;setCast(g,sc2);}
      if(n.def.deck){var th=Math.atan2(g.position.z,g.position.x);if(th<0)th+=6.2832;g.position.y=hh(th/TH)+0.03;}
      if(n.wp){
        if(n.wait>0){n.wait-=dt;}
        else{var w=n.wp[n.wi],ex=w[0]-g.position.x,ez=w[1]-g.position.z,el=Math.sqrt(ex*ex+ez*ez);
          if(el<0.2){n.wi=(n.wi+1)%n.wp.length;n.wait=2+Math.random()*3;}
          else{var sp2=1.25*dt;g.position.x+=ex/el*sp2;g.position.z+=ez/el*sp2;turnTo(g,Math.atan2(ex,ez),Math.min(1,dt*5));
            if(!c.rb){n.ph+=dt*6;walkAnim(c,n.ph,0.6);}}}
        if(n.wait>0&&dd<7)turnTo(g,Math.atan2(dx,dz),Math.min(1,dt*2.5));
      }else if(dd<6.5&&n.def.react!==false){var want=Math.atan2(dx,dz);var off=n.yaw0;var d=want-off;while(d>Math.PI)d-=6.2832;while(d<-Math.PI)d+=6.2832;turnTo(g,off+Math.max(-0.9,Math.min(0.9,d)),Math.min(1,dt*1.8));}
      else turnTo(g,n.yaw0,Math.min(1,dt*1.2));
      if(!c.rb&&!n.wp){n.ph+=dt*1.2;c.head.rotation.y=Math.sin(n.ph*0.7)*0.2;}
    });};
  /* ================= build: ENTRANCE ================= */
  function build(){
    var zA=-34.2,ZE=new Bld();
    /* --- welcome arch across the road --- */
    var A=new Bld(),sw=3.1;
    [-1,1].forEach(function(s){A.add(bx(0.8,4.6,0.8),cream,s*sw,2.3,0);A.add(bx(1.0,0.28,1.0),pink,s*sw,4.62,0);A.add(bx(1.0,0.35,1.0),pink,s*sw,0.18,0);
      A.add(sp(0.34,16,12),pink,s*sw,4.95,0,0,0,0,1,0.8,1);A.add(sp(0.09,10,8),cherry,s*sw,5.3,0);
      for(var k=0;k<4;k++)A.add(bx(0.5,0.04,0.04),gold,s*sw,1.0+k*0.9,0.41,0,0,0);});
    var arcM=mt('arc',0xf4a9c4,0.55,0,{map:frostTex});
    A.add(new THREE.TorusGeometry(sw,0.24,12,36,Math.PI),arcM,0,4.9,0,0,0,0,1,0.22,1);
    A.add(bx(sw*2,0.5,0.28),mt('arcSign',0xffffff,0.8,0,{map:board('WELCOME TO CAKE MOUNTAIN','స్వాగతం  –  పుట్టినరోజు శుభాకాంక్షలు','#3b1f5e','#ffd35a','#9affc4',1024,200)}),0,5.25,0);
    ZE.merge(A,XF,0,zA,0);
    balloons(XF-sw-0.3,4.9,zA,9,0.35);balloons(XF+sw+0.3,4.9,zA,9,0.35);
    /* --- security area: booth + striped (open) rail + cones + guard --- */
    var S1=new Bld();boothInto(S1,'SECURITY','భద్రత');
    ZE.merge(S1,XF+5.2,0,-31.2,-Math.PI/2);
    /* cones + low barrier stubs at the walkway edge (never across the road) */
    var cB=new Bld();cB.add(cone(0.17,0.5),mt('cone',0xff6a1f,0.6),0,0.25,0);cB.add(cy(0.17,0.17,0.04,12),mt('coneB',0xffffff,0.6),0,0.03,0);cB.add(cy(0.12,0.14,0.07,12),white,0,0.25,0);
    instanced(cB,[mxAt(XF+3.2,0,-31.6),mxAt(XF+3.2,0,-30.0),mxAt(XF+3.2,0,-28.6)]);
    /* --- stalls, entrance right (+x), face -x --- */
    stall({type:'tea',x:XF+6.6,z:-26.2,yaw:-Math.PI/2,sign:['TEA  &  SNACKS','టీ  •  స్నాక్స్'],c1:'#d94f5c',c2:'#f6efe2',wall:mt('wTea',0xe9d9bf,0.9),fo:0},ZE);
    stall({type:'cake',x:XF+6.6,z:-21.2,yaw:-Math.PI/2,sign:['CAKE  KIOSK','కేక్  షాప్'],c1:'#e86fa0',c2:'#fbeef3',wall:mt('wCake',0xfbe4ec,0.9),sb:'#7a2d5a',fo:2,w:3.2},ZE);
    stall({type:'snack',x:XF+6.6,z:-16.9,yaw:-Math.PI/2,sign:['SNACK  CORNER','చిరుతిళ్ళు'],c1:'#2f8f86',c2:'#f4f0e8',wall:mt('wSn',0xdff0ea,0.9),sb:'#1f4a47',fo:4},ZE);
    /* --- entrance left (-x), face +x --- */
    stall({type:'balloon',x:XF-6.6,z:-28.4,yaw:Math.PI/2,sign:['PARTY  STALL','పార్టీ  సామాన్లు'],c1:'#6a2d86',c2:'#f6e9ff',wall:mt('wBal',0xe8dcf4,0.9),sb:'#3b1f5e',fo:1},ZE);
    stall({type:'tea',x:XF-6.6,z:-23.2,yaw:Math.PI/2,sign:['CHAI  POINT','చాయ్  పాయింట్'],c1:'#f2c23b',c2:'#fff6dc',wall:mt('wCh',0xf2e4c4,0.9),sb:'#6b3d12',fo:3,w:2.8},ZE);
    balloons(XF-5.4,2.6,-28.4,8,0.3);balloons(XF+5.6,2.9,-21.2,7,0.3);
    /* steam from the two tea stalls */
    [[XF+6.8,-27.15],[XF-6.8,-22.35]].forEach(function(p,i){for(var k=0;k<3;k++){var s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffffff,transparent:true,opacity:0.2,depthWrite:false}));s.userData={x:p[0],y:1.45,z:p[1]};scene.add(s);E.steam.push(s);}});
    /* seating area: benches (instanced) + two umbrella tables on the left paving */
    var benches=[[XF-4.6,-18.0,Math.PI/2],[XF-4.6,-15.7,Math.PI/2],[XF+4.6,-34.8,-Math.PI/2],[XF-4.6,-31.2,Math.PI/2]];
    instanced(benchB(),benches.map(function(b){return mxAt(b[0],0.0,b[1],b[2]);}));
    var table=new Bld();table.add(cy(0.5,0.5,0.05,18),wood,0,0.78,0);table.add(cy(0.05,0.07,0.78,8),iron,0,0.39,0);table.add(cy(0.28,0.3,0.04,14),iron,0,0.03,0);
    [0,1,2].forEach(function(k){table.add(cy(0.18,0.18,0.04,12),wood,Math.cos(k*2.1)*0.78,0.46,Math.sin(k*2.1)*0.78);table.add(cy(0.03,0.04,0.46,6),iron,Math.cos(k*2.1)*0.78,0.23,Math.sin(k*2.1)*0.78);});
    table.add(cy(0.025,0.025,2.2,8),iron,0,1.2,0);
    var tpos=[mxAt(XF-7.2,0,-18.8),mxAt(XF-7.2,0,-16.4)];instanced(table,tpos);
    var umb=new Bld();umb.add(new THREE.ConeGeometry(1.25,0.45,14,1,true),mt('umb',0xffffff,0.85,0,{map:stripe('#e5484d','#fff4e0'),side:THREE.DoubleSide}),0,2.25,0);instanced(umb,tpos);
    var pv=new THREE.Mesh(plane(6,6,1.6),pav);pv.rotation.x=-Math.PI/2;pv.position.set(XF-6.6,0.008,-17.6);pv.receiveShadow=true;scene.add(pv);
    /* street lamps (instanced) along the entrance, alternating sides */
    var lm=[],lpos=[];[-36,-29.5,-23,-16.5].forEach(function(z,i){lm.push(mxAt(XF-3.05,0,z,0));lpos.push([XF-3.05+0.58,3.38,z]);lm.push(mxAt(XF+3.05,0,z+3.2,Math.PI));lpos.push([XF+3.05-0.58,3.38,z+3.2]);});
    instanced(lampB(),lm);lpos.forEach(function(p){lampGlow(p[0],p[1],p[2]);});
    /* low timber railing along both walkway edges (instanced posts + rails) */
    var RB2=new Bld();RB2.add(cy(0.04,0.04,0.78,6),woodD,0,0.39,0);
    var rl=new Bld();rl.add(bx(2.0,0.05,0.05),wood,0,0,0);
    var pm=[],rm=[];for(var z=-33;z<=-15;z+=2.0){[-1,1].forEach(function(s){pm.push(mxAt(XF+s*2.1,0,z,0));if(z<-15){rm.push(mxAt(XF+s*2.1,0.55,z+1.0,Math.PI/2));rm.push(mxAt(XF+s*2.1,0.34,z+1.0,Math.PI/2));}});}
    instanced(RB2,pm);instanced(rl,rm);
    /* flower planters + rocks */
    var pls=[];for(var zz=-32;zz<=-16;zz+=3.2){pls.push([XF-2.95,0,zz+0.4,Math.PI/2]);pls.push([XF+2.95,0,zz-0.4,Math.PI/2]);}
    plantersAt(pls);
    rocks([[XF-10.6,-24],[XF+10.4,-28],[XF+10.9,-24.5],[XF-10.3,-31],[XF+9.6,-19.5],[XF-10.2,-15.5],[XF+10.2,-33],[XF+9.2,-36],[XF-9.5,-35]]);
    /* direction signboard */
    var sb=new Bld();sb.add(cy(0.06,0.07,2.7,8),woodD,0,1.35,0);sb.add(bx(1.8,0.62,0.07),mt('dir',0xffffff,0.8,0,{map:board('CAKE MOUNTAIN  ▲','కేక్ పర్వతం','#1f4a47','#ffffff','#ffd35a')}),0,2.5,0.04);sb.add(bx(1.6,0.5,0.07),mt('dir2',0xffffff,0.8,0,{map:board('TEA • SNACKS • CAKE','టీ • కేక్','#7a2d5a','#ffffff','#ffd35a')}),0,1.85,0.05);
    ZE.merge(sb,XF+3.9,0,-35.8,-Math.PI/2);
    /* bunting strings between lantern poles */
    var bn=new Bld();for(var q=0;q<14;q++)bn.add(new THREE.ConeGeometry(0.1,0.22,3),flagCols[q%6],-2.4+q*0.37,-Math.sin(q/13*Math.PI)*0.3,0,Math.PI,0,0);
    [-32.5,-25.5,-18.5].forEach(function(z){var g=bn.done(scene,XF,4.05,z,0,false);E.flags.push({g:g,p:z});});
    ZE.done(scene,0,0,0,0,true);
    /* people at the entrance */
    var Pi=Math.PI;
    npc({x:XF+6.7,z:-25.7,y:0.14,yaw:-Pi/2,model:'p',tint:0xe9d3a8,mus:1,react:false});/* tea vendor */
    npc({x:XF+6.7,z:-21.8,y:0.14,yaw:-Pi/2,model:'p',tint:0xf2dce6,react:false});/* cake vendor */
    npc({x:XF-6.7,z:-23.5,y:0.14,yaw:Pi/2,model:'p',tint:0xd9c27a,mus:1,react:false});/* chai vendor */
    npc({x:XF-6.7,z:-28.0,y:0.14,yaw:Pi/2,model:'p',tint:0xc8b6e8,react:false});/* party stall */
    npc({x:XF+3.9,z:-30.0,yaw:-Pi/2,model:'c'});/* security guard */
    npc({x:XF+5.1,z:-26.3,yaw:Pi/2,model:'p',tint:0xb8d8c0});/* customer at tea stall */
    npc({x:XF-4.7,z:-26.5,yaw:0,model:'p',tint:0xa9c4e8,react:false});npc({x:XF-4.7,z:-25.4,yaw:Pi,model:'p',tint:0xe8b8a8,react:false});/* talking pair */
    npc({x:XF+4.4,z:-33.0,yaw:0,model:'p',tint:0xe3a8a8,path:[[XF+4.4,-33],[XF+4.4,-18]]});/* walkers */
    npc({x:XF-4.5,z:-17.0,yaw:Pi,model:'p',tint:0xb4c8dc,path:[[XF-4.5,-17],[XF-4.5,-32]]});
  }
  function lampGlow(x,y,z){var s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:C(0xffd890),blending:THREE.AdditiveBlending,transparent:true,opacity:0.42,depthWrite:false,fog:false}));s.scale.set(1.1,1.1,1);s.position.set(x,y,z);scene.add(s);E.lamps.push(s);}
  function rocks(list){var rk=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5,0),mt('rock',0x7d776b,0.97),list.length);
    list.forEach(function(p,i){QQ.position.set(p[0],0.06,p[1]);QQ.rotation.set(rnd(i)*3,rnd(i+4)*3,0);QQ.scale.set(0.55+rnd(i)*0.6,0.4+rnd(i+2)*0.35,0.5+rnd(i+3)*0.5);QQ.updateMatrix();rk.setMatrixAt(i,QQ.matrix);});rk.castShadow=true;rk.receiveShadow=true;rk.frustumCulled=false;scene.add(rk);}
  /* ================= GATE 1 roadside deck ================= */
  function buildGate1(){
    var t0=0.118,t1=0.224,o0=1.84,o1=6.7,N=30,pos=[],uv=[],idx=[],q={},acc=0,Pi=Math.PI,prev=null;
    function addV(x,y,z,u,v){pos.push(x,y,z);uv.push(u,v);return pos.length/3-1;}
    for(var i=0;i<=N;i++){var t=t0+(t1-t0)*i/N,a=P(t,-o0,new V3()),b=P(t,-o1,new V3());if(prev)acc+=Math.sqrt((a.x-prev.x)*(a.x-prev.x)+(a.z-prev.z)*(a.z-prev.z));prev=a;
      addV(a.x,a.y+0.03,a.z,0,acc/1.4);addV(b.x,b.y+0.03,b.z,(o1-o0)/1.4,acc/1.4);addV(b.x,b.y+0.03,b.z,0,acc/1.4);addV(b.x,b.y-0.36,b.z,0.3,acc/1.4);}
    for(var k=0;k<N;k++){var b0=k*4,b1=(k+1)*4;idx.push(b0,b1,b0+1,b1,b1+1,b0+1);idx.push(b0+2,b1+2,b0+3,b1+2,b1+3,b0+3);}
    var dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));dg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));dg.setIndex(idx);dg.computeVertexNormals();
    var dm=new THREE.Mesh(dg,mt('deck',0xd2bfaa,0.88,0,{map:plankTex,side:THREE.DoubleSide}));dm.receiveShadow=true;dm.castShadow=true;scene.add(dm);
    /* support posts + beams */
    var sp2=new Bld();sp2.add(cy(0.09,0.11,1,8),woodD,0,0.5,0);
    var spm=[];for(var j=0;j<=10;j++){var tt=t0+(t1-t0)*j/10;[o1-0.25,o0+0.9].forEach(function(of){P(tt,-of,tA);var h=tA.y-0.35+0.1;QQ.position.set(tA.x,-0.1,tA.z);QQ.rotation.set(0,0,0);QQ.scale.set(1,h,1);QQ.updateMatrix();spm.push(QQ.matrix.clone());});}
    instanced(sp2,spm);
    /* outer railing: 2 tube rails + instanced balusters */
    var rail1=[],rail2=[],bal=[];for(var r=0;r<=N;r++){var t2=t0+(t1-t0)*r/N;P(t2,-(o1-0.08),tB);rail1.push(new V3(tB.x,tB.y+1.0,tB.z));rail2.push(new V3(tB.x,tB.y+0.55,tB.z));}
    [rail1,rail2].forEach(function(pts,ri){var m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),90,ri?0.03:0.045,6,false),ri?woodD:wood);m.castShadow=true;scene.add(m);});
    var bb2=new Bld();bb2.add(cy(0.035,0.035,1.0,6),woodD,0,0.5,0);var bm=[];for(var u=0;u<=44;u++){var t3=t0+(t1-t0)*u/44;P(t3,-(o1-0.08),tB);bm.push(mxAt(tB.x,tB.y+0.03,tB.z,0));}instanced(bb2,bm);
    var o={},ZG=new Bld();
    /* stalls on the deck */
    function place(t,off,def){sample(t,off,o);def.x=o.x;def.y=o.y+0.03;def.z=o.z;def.yaw=o.yaw;def.noFloor=true;return stall(def,ZG);}
    place(0.1285,-4.3,{type:'tea',sign:['CHAI  &  SNACKS','చాయ్  •  బిస్కెట్'],c1:'#d94f5c',c2:'#f6efe2',wall:mt('wTea',0xe9d9bf,0.9),w:3.0,fo:1});
    place(0.1865,-4.3,{type:'snack',sign:['SNACK  SHOP','చిరుతిళ్ళు'],c1:'#2f8f86',c2:'#f4f0e8',wall:mt('wSn',0xdff0ea,0.9),sb:'#1f4a47',w:3.0,fo:3});
    place(0.2025,-4.3,{type:'cake',sign:['CAKE  SLICES','కేక్ ముక్కలు'],c1:'#e86fa0',c2:'#fbeef3',wall:mt('wCake',0xfbe4ec,0.9),sb:'#7a2d5a',w:3.2,fo:2});
    place(0.2175,-4.3,{type:'balloon',sign:['PARTY  STALL','పార్టీ  సామాన్లు'],c1:'#6a2d86',c2:'#f6e9ff',wall:mt('wBal',0xe8dcf4,0.9),sb:'#3b1f5e',w:2.8,fo:5});
    /* roadside payment booth + security */
    sample(0.1500,-3.6,o);var Bt=new Bld();boothInto(Bt,'PAYMENT  BOOTH','చెల్లింపు  కౌంటర్');ZG.merge(Bt,o.x,o.y+0.03,o.z,o.yaw);
    /* waiting area: benches + umbrella table on the deck */
    var wb=[];[0.1395,0.1435].forEach(function(t){sample(t,-3.6,o);wb.push(mxAt(o.x,o.y+0.03,o.z,o.yaw));});instanced(benchB(),wb);
    sample(0.1415,-5.7,o);var tb=new Bld();tb.add(cy(0.5,0.5,0.05,18),wood,0,0.78,0);tb.add(cy(0.05,0.07,0.78,8),iron,0,0.39,0);tb.add(cy(0.28,0.3,0.04,14),iron,0,0.03,0);tb.add(cy(0.025,0.025,2.2,8),iron,0,1.2,0);
    tb.add(new THREE.ConeGeometry(1.25,0.45,14,1,true),mt('umb',0xffffff,0.85,0,{map:stripe('#e5484d','#fff4e0'),side:THREE.DoubleSide}),0,2.25,0);ZG.merge(tb,o.x,o.y+0.03,o.z,0);
    /* lamps along the outer rail */
    var lmx=[];[0.124,0.1595,0.178,0.196,0.2135].forEach(function(t){sample(t,-(o1-0.2),o);var th=Math.atan2(-o.rz,o.rx);lmx.push(mxAt(o.x,o.y+0.03,o.z,th));lampGlow(o.x+o.rx*0.58,o.y+3.38,o.z+o.rz*0.58);});
    instanced(lampB(),lmx);
    /* big party banner on two posts behind the booth */
    sample(0.1705,-6.35,o);var bn=new THREE.Mesh(new THREE.PlaneGeometry(5.4,1.55,24,3),basicMap(bannerTex,0.95));var bp=bn.geometry.attributes.position;for(var i3=0;i3<bp.count;i3++)bp.setZ(i3,Math.sin(bp.getX(i3)*1.6)*0.07);bn.geometry.computeVertexNormals();
    bn.position.set(o.x,o.y+3.2,o.z);bn.rotation.y=o.yaw;scene.add(bn);var bk=new THREE.Mesh(new THREE.BoxGeometry(5.5,1.62,0.06),mt('bback',0x2a1a4d,0.8));bk.position.copy(bn.position);bk.rotation.y=o.yaw;bk.translateZ(-0.05);scene.add(bk);
    [-2.55,2.55].forEach(function(dx){var pp=new THREE.Mesh(cy(0.07,0.09,3.8,8),woodD);pp.position.set(o.x,o.y+1.9,o.z);pp.rotation.y=o.yaw;pp.translateX(dx);scene.add(pp);});
    /* planters + flowers along the deck inner edge */
    var pl2=[];for(var f=0;f<7;f++){sample(0.1295+f*0.0145+(f>3?0.012:0),-2.25,o);pl2.push([o.x,o.y+0.03,o.z,o.yaw+Pi/2]);}
    plantersAt(pl2);
    ZG.done(scene,0,0,0,0,true);
    /* people on the deck (tag: deck, so they follow the slope) */
    function dn(t,off,model,tint,extra){sample(t,off,o);var d={x:o.x,z:o.z,y:o.y+0.03,yaw:o.yaw+(extra&&extra.turn||0),model:model,tint:tint,deck:true};for(var k in extra)d[k]=extra[k];return npc(d);}
    dn(0.1285,-3.3,'p',0xe9d3a8,{react:false,mus:1,turn:0});/* tea vendor behind counter? (placed behind) */
    dn(0.1265,-2.9,'p',0xb8d8c0,{});dn(0.1305,-2.9,'p',0xe8b8a8,{turn:Pi*0.9,react:false});
    dn(0.1865,-4.95,'p',0xd9c27a,{react:false});dn(0.2025,-4.95,'p',0xf2dce6,{react:false});dn(0.2175,-4.95,'p',0xc8b6e8,{react:false});
    dn(0.1555,-2.7,'c',0xffffff,{});/* security staff beside the booth */
    dn(0.1395,-5.1,'p',0xa9c4e8,{turn:Pi*0.5});dn(0.1435,-4.7,'p',0xe3a8a8,{turn:-Pi*0.4});
    var wa=[];for(var w=0;w<2;w++){sample(0.145+w*0.065,-2.6,o);wa.push([o.x,o.z]);sample(0.145+w*0.065+0.03,-2.6,o);wa.push([o.x,o.z]);}
    var o2={};sample(0.146,-2.7,o);sample(0.2,-2.7,o2);
    var walk=npc({x:o.x,z:o.z,y:o.y+0.03,yaw:o.yaw,model:'p',tint:0xdcb4a0,deck:true,path:[[o.x,o.z],[o2.x,o2.z]]});
  }

  function buildDeckN(gi,cfg){
    var tc=cfg.t,hs=cfg.half||0.032,t0=tc-hs,t1=tc+hs,o0=1.84,o1=cfg.o1||5.4,N=18,pos=[],uv=[],idx=[],acc=0,Pi=Math.PI,prev=null;
    function addV(x,y,z,u,v){pos.push(x,y,z);uv.push(u,v);return pos.length/3-1;}
    for(var i=0;i<=N;i++){var t=t0+(t1-t0)*i/N,a=P(t,-o0,new V3()),b=P(t,-o1,new V3());if(prev)acc+=Math.sqrt((a.x-prev.x)*(a.x-prev.x)+(a.z-prev.z)*(a.z-prev.z));prev=a;
      addV(a.x,a.y+0.03,a.z,0,acc/1.4);addV(b.x,b.y+0.03,b.z,(o1-o0)/1.4,acc/1.4);addV(b.x,b.y+0.03,b.z,0,acc/1.4);addV(b.x,b.y-0.36,b.z,0.3,acc/1.4);}
    for(var k=0;k<N;k++){var b0=k*4,b1=(k+1)*4;idx.push(b0,b1,b0+1,b1,b1+1,b0+1);idx.push(b0+2,b1+2,b0+3,b1+2,b1+3,b0+3);}
    var dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));dg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));dg.setIndex(idx);dg.computeVertexNormals();
    var dm=new THREE.Mesh(dg,mt('deck',0xd2bfaa,0.88,0,{map:plankTex,side:THREE.DoubleSide}));dm.receiveShadow=true;dm.castShadow=true;scene.add(dm);
    var sp2=new Bld();sp2.add(cy(0.09,0.11,1,8),woodD,0,0.5,0);var spm=[];
    for(var j=0;j<=6;j++){var tt=t0+(t1-t0)*j/6;[o1-0.25,o0+0.9].forEach(function(of){P(tt,-of,tA);var h=2.2;QQ.position.set(tA.x,tA.y-0.35-h+0.15,tA.z);QQ.rotation.set(0,0,0);QQ.scale.set(1,h,1);QQ.updateMatrix();spm.push(QQ.matrix.clone());});}
    instanced(sp2,spm);
    var rail1=[],rail2=[];for(var r=0;r<=N;r++){var t2=t0+(t1-t0)*r/N;P(t2,-(o1-0.08),tB);rail1.push(new V3(tB.x,tB.y+1.0,tB.z));rail2.push(new V3(tB.x,tB.y+0.55,tB.z));}
    [rail1,rail2].forEach(function(pts,ri){var m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),60,ri?0.03:0.045,6,false),ri?woodD:wood);m.castShadow=true;scene.add(m);});
    var bb2=new Bld();bb2.add(cy(0.035,0.035,1.0,6),woodD,0,0.5,0);var bm=[];for(var u=0;u<=22;u++){var t3=t0+(t1-t0)*u/22;P(t3,-(o1-0.08),tB);bm.push(mxAt(tB.x,tB.y+0.03,tB.z,0));}instanced(bb2,bm);
    var o={},ZG=new Bld();
    cfg.stalls.forEach(function(sd){sample(t0+(t1-t0)*sd.u,-(o1-1.15),o);var def={x:o.x,y:o.y+0.03,z:o.z,yaw:o.yaw,noFloor:true};for(var k in sd)def[k]=sd[k];if(sd.wallHex)def.wall=mt('w'+sd.wallHex,sd.wallHex,0.9);stall(def,ZG);});
    var wb=[];[0.5].forEach(function(uu){sample(t0+(t1-t0)*uu,-(o0+1.0),o);wb.push(mxAt(o.x,o.y+0.03,o.z,o.yaw));});instanced(benchB(),wb);
    var lmx=[];[0.05,0.5,0.95].forEach(function(uu){sample(t0+(t1-t0)*uu,-(o1-0.2),o);var th=Math.atan2(-o.rz,o.rx);lmx.push(mxAt(o.x,o.y+0.03,o.z,th));lampGlow(o.x+o.rx*0.58,o.y+3.38,o.z+o.rz*0.58);});
    instanced(lampB(),lmx);
    sample(tc,-(o1+0.4),o);var bt=board(cfg.b1,cfg.b2,cfg.bbg||'#3b1f5e','#ffd35a','#ffffff',1024,292);
    var bn=new THREE.Mesh(new THREE.PlaneGeometry(5.0,1.43,16,2),basicMap(bt,0.95));bn.position.set(o.x,o.y+3.0,o.z);bn.rotation.y=o.yaw;scene.add(bn);
    var bk=new THREE.Mesh(new THREE.BoxGeometry(5.1,1.5,0.06),mt('bback',0x2a1a4d,0.8));bk.position.copy(bn.position);bk.rotation.y=o.yaw;bk.translateZ(-0.05);scene.add(bk);
    [-2.4,2.4].forEach(function(dx){var pp=new THREE.Mesh(cy(0.07,0.09,3.6,8),woodD);pp.position.set(o.x,o.y+1.8,o.z);pp.rotation.y=o.yaw;pp.translateX(dx);scene.add(pp);});
    var pl2=[];for(var f=0;f<4;f++){sample(t0+(t1-t0)*(0.12+f*0.25),-(o0+0.55),o);pl2.push([o.x,o.y+0.03,o.z,o.yaw+Pi/2]);}
    plantersAt(pl2);ZG.done(scene,0,0,0,0,true);
    function dn(uu,off,model,tint,extra){sample(t0+(t1-t0)*uu,-off,o);var d={x:o.x,z:o.z,y:o.y+0.03,yaw:o.yaw+(extra&&extra.turn||0),model:model,tint:tint,deck:false};for(var k in extra)d[k]=extra[k];return npc(d);}
    (cfg.npcs||[]).forEach(function(n){dn(n[0],n[1],n[2],n[3],n[4]||{});});
  }
  function boothInto(B,l1,l2){var bw=2.2;
    B.add(bx(bw+0.4,0.16,2.4),mt('conc',0xb8b2a6,0.95),0,0.08,0);
    B.add(bx(bw,2.3,2.0),cream,0,1.31,0);B.add(bx(bw+0.04,0.38,2.04),red,0,0.5,0);
    B.add(bx(bw*0.62,0.9,0.05),glassM,0,1.55,1.01);B.add(bx(bw*0.66,0.07,0.28),woodD,0,1.05,1.14);
    B.add(bx(bw+0.7,0.18,2.7),mt('roofB',0x35527a,0.6),0,2.58,0.05);B.add(bx(bw+0.74,0.05,2.74),white,0,2.47,0.05);
    B.add(bx(1.7,0.5,0.06),mt('sec'+l1,0xffffff,0.8,0,{map:board(l1,l2,'#1f3a63','#ffffff','#ffd35a')}),0,2.95,1.1);
    B.add(bx(0.5,0.9,0.05),wood,bw/2-0.25,1.35,1.02);
    [-1,1].forEach(function(s){B.add(cy(0.05,0.05,2.5,8),iron,s*(bw/2+0.2),1.4,1.2);});
    B.add(bx(bw*0.66,0.05,0.07),iron,0,1.1,1.03);B.add(bx(bw*0.66,0.05,0.07),iron,0,2.0,1.03);B.add(bx(0.05,0.9,0.07),iron,0,1.55,1.03);[-1,1].forEach(function(s){B.add(bx(0.05,0.9,0.07),iron,s*bw*0.31,1.55,1.03);});
    B.add(bx(0.08,1.9,0.8),woodD,bw/2+0.02,1.05,0.1);B.add(bx(0.03,0.03,0.03),gold,bw/2+0.07,1.05,-0.2);
    B.add(bx(0.9,0.6,0.04),mt('poster',0xf2c23b,0.8),-bw/2-0.02,1.5,0.1,0,Math.PI/2,0);B.add(bx(0.5,0.7,0.04),mt('poster2',0x5ba8e0,0.8),-bw/2-0.02,1.5,-0.55,0,Math.PI/2,0);
    B.add(bx(bw+0.74,0.04,0.08),red,0,2.43,1.4);B.add(bx(0.6,0.4,0.12),iron,-bw/2+0.5,2.1,-1.1);}
  var tB=new V3();
  E.build=function(){try{build();buildGate1();}catch(e){if(window.console)console.warn('Roadside scenery skipped:',e);E.err=String(e&&e.message||e);}
    var Pi=Math.PI;var Dk=[
     {t:0.34,b1:GATECFG.gates[1].name,b2:'\u20B9'+GATECFG.gates[1].amount.toLocaleString('en-IN'),bbg:'#8a2d5e',stalls:[{u:0.1,type:'cake',sign:['CREAM  CORNER','క్రీమ్  కార్నర్'],c1:'#e86fa0',c2:'#fbeef3',wallHex:0xfbe4ec,sb:'#7a2d5a',w:3.0,fo:1},{u:0.9,type:'tea',sign:['LASSI  &  FALOODA','లస్సీ  •  ఫలూదా'],c1:'#2f8f86',c2:'#f4f0e8',wallHex:0xdff0ea,sb:'#1f4a47',w:3.0,fo:2}],npcs:[[0.3,3.4,'p',0xe8b8a8,{}],[0.7,3.6,'p',0xb8d8c0,{turn:Pi*0.8,react:false}],[0.12,4.4,'p',0xd9c27a,{react:false}]]},
     {t:0.51,b1:GATECFG.gates[2].name,b2:'\u20B9'+GATECFG.gates[2].amount.toLocaleString('en-IN'),bbg:'#5a2a1e',stalls:[{u:0.1,type:'candle',sign:['DIYA  &  CANDLES','దీపాలు  •  కొవ్వొత్తులు'],c1:'#e5933a',c2:'#fff1d6',wallHex:0xf3dcc0,sb:'#5a2a1e',w:3.0,fo:3},{u:0.9,type:'snack',sign:['MIRCHI  BAJJI','మిర్చి  బజ్జి'],c1:'#d94f5c',c2:'#f6efe2',wallHex:0xf2e0c8,sb:'#6e2230',w:3.0,fo:0}],npcs:[[0.3,3.5,'p',0xe3a8a8,{}],[0.65,3.3,'p',0xc8b6e8,{react:false}],[0.88,4.5,'p',0xa9c4e8,{turn:-Pi*0.4}]]},
     {t:0.68,b1:GATECFG.gates[3].name,b2:'\u20B9'+GATECFG.gates[3].amount.toLocaleString('en-IN'),bbg:'#1f3a63',stalls:[{u:0.1,type:'clock',sign:['WATCH  &  CLOCK','గడియారాల  షాపు'],c1:'#2f6fb5',c2:'#f4f0e8',wallHex:0xdde8f4,sb:'#1f3a63',w:3.0,fo:4},{u:0.9,type:'tea',sign:['CHAI  &  BISCUIT','చాయ్  •  బిస్కెట్'],c1:'#d94f5c',c2:'#f6efe2',wallHex:0xe9d9bf,w:3.0,fo:1}],npcs:[[0.32,3.4,'p',0xd9c27a,{}],[0.7,3.5,'p',0xf2dce6,{turn:Pi*0.9,react:false}],[0.1,4.6,'p',0xb8d8c0,{react:false}]]},
     {t:0.85,b1:GATECFG.gates[4].name,b2:'\u20B9'+GATECFG.gates[4].amount.toLocaleString('en-IN'),bbg:'#3b1f5e',stalls:[{u:0.1,type:'optic',sign:['SPECS  &  OPTICALS','కళ్లద్దాల  షాపు'],c1:'#6a2d86',c2:'#f6e9ff',wallHex:0xe8dcf4,sb:'#3b1f5e',w:3.0,fo:5},{u:0.9,type:'balloon',sign:['PARTY  STALL','పార్టీ  సామాన్లు'],c1:'#e86fa0',c2:'#fbeef3',wallHex:0xfbe4ec,sb:'#7a2d5a',w:2.8,fo:2}],npcs:[[0.3,3.4,'p',0xc8b6e8,{}],[0.68,3.5,'p',0xe9d3a8,{react:false}],[0.9,4.6,'p',0xe3a8a8,{turn:Pi*0.5}]]}];
    Dk.forEach(function(d,i){try{buildDeckN(i+1,d);}catch(e){if(window.console)console.warn('deck '+(i+2)+' skipped',e);E.err=String(e&&e.message||e);}});};
  return E;
})();
