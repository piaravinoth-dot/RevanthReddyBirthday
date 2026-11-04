
/* ---------- production sprite loader (manifest-driven; 3D model stays the default) ---------- */
var PROD={want:/[?&]char=prod/.test(location.search),state:'idle',man:null,sets:{},report:[],ready:false,on:false,hasBack:false,player:null,cols:[],outfit:0,pair:null,cap:null,hid:false,
  base:(function(){var m=location.search.match(/[?&]assets=([^&]+)/);var b=m?decodeURIComponent(m[1]):'assets/character/';return b.charAt(b.length-1)==='/'?b:b+'/';})()};
function prodPad(n){return ('0000'+n).slice(-4);}
function prodPath(t,o,d,n){return t.replace('{o}',o).replace('{dir}',d).replace('{n}',prodPad(n));}
function prodLoad(){
  if(!/[?&]sprites=1/.test(location.search)){PROD.state='absent';PROD.report.push('manifest: optional sprite system not enabled (no request made)');sprLabel();return;}
  fetch(PROD.base+'manifest.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('manifest http '+r.status);return r.json();}).then(function(m){
    if(m.schema!=='vasool-sprites/1')throw new Error('unknown manifest schema '+m.schema);
    PROD.man=m;PROD.state='loading';sprLabel();
    var W=m.canvas.w,H=m.canvas.h,OF=m.outfits||1,jobs=0,doneN=0,sets=PROD.sets;
    function reg(key,tpl,frames,dirs,outs,meta){
      var s={frames:frames,fps:meta.fps||12,loop:meta.loop!==false,stride:meta.stride||0,dirs:{},ok:{}};sets[key]=s;
      dirs.forEach(function(d){s.dirs[d]={};for(var o=0;o<outs;o++){(function(d,o){var arr=new Array(frames),cnt=0;s.dirs[d][o]=arr;
        for(var n=0;n<frames;n++)(function(n){jobs++;var img=new Image();
          img.onload=function(){
            if(img.naturalWidth!==W||img.naturalHeight!==H){PROD.report.push('SIZE '+prodPath(tpl,o,d,n)+' is '+img.naturalWidth+'x'+img.naturalHeight+', expected '+W+'x'+H);}
            else{var t=new THREE.Texture(img);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;t.needsUpdate=true;arr[n]=t;cnt++;}
            fin();};
          img.onerror=function(){PROD.report.push('MISSING '+prodPath(tpl,o,d,n));fin();};
          img.src=PROD.base+prodPath(tpl,o,d,n);})(n);
        s.ok[d+'/'+o]=function(){return cnt===frames;};})(d,o);}});
    }
    function fin(){doneN++;if(doneN===jobs)prodDone();}
    var A=m.actors||{};
    Object.keys(A).forEach(function(an){var cl=A[an].clips||{};Object.keys(cl).forEach(function(cn){var c=cl[cn];reg(an+'/'+cn,c.path,c.frames,c.dirs||m.directions,c.path.indexOf('{o}')>=0?(an==='player'?OF:1):1,c);});});
    var Pr=m.pairs||{};
    Object.keys(Pr).forEach(function(pn){var p=Pr[pn];reg('pair:'+pn+'/player',p.player,p.frames,p.dirs||['side'],p.player.indexOf('{o}')>=0?OF:1,p);reg('pair:'+pn+'/collector',p.collector,p.frames,p.dirs||['side'],1,p);});
    if(jobs===0)prodDone();
  }).catch(function(e){PROD.state='absent';PROD.report.push('manifest: '+(e&&e.message||e));sprLabel();});
}
function prodSetOk(key,d,o){var s=PROD.sets[key];return !!(s&&s.ok[d+'/'+(o||0)]&&s.ok[d+'/'+(o||0)]());}
function prodDone(){
  var need=['player/idle','player/walk','collector/idle'],good=need.every(function(k){return prodSetOk(k,'side',0);});
  PROD.hasBack=prodSetOk('player/idle','back',0)&&prodSetOk('player/walk','back',0)&&prodSetOk('player/idle','front',0);
  PROD.ready=good;PROD.state=good?'ready':'incomplete';
  if(!good)PROD.report.push('NOT READY: need player idle+walk and collector idle, side view, outfit 0, all frames.');
  if(PROD.report.length&&window.console)console.warn('[sprites] '+PROD.report.length+' issue(s):\n'+PROD.report.slice(0,40).join('\n'));
  sprLabel();
}
function makeProdActor(){
  var m=PROD.man,ppm=m.pixelsPerMeter,W=m.canvas.w,H=m.canvas.h,ax=m.anchor.x,ay=m.anchor.y,tn=m.tint||[0.8,0.78,0.74];
  var geo=new THREE.PlaneGeometry(W/ppm,H/ppm);geo.translate((W/2-ax)/ppm,(ay-H/2)/ppm,0);
  var mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({transparent:true,alphaTest:0.4,side:THREE.DoubleSide,color:new THREE.Color(tn[0],tn[1],tn[2])}));mesh.visible=false;mesh.renderOrder=2;scene.add(mesh);
  var st=mkTex(128,128,function(x,w,h){var g2=x.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g2.addColorStop(0,'rgba(0,0,0,0.55)');g2.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g2;x.fillRect(0,0,w,h);});
  var sg=new THREE.PlaneGeometry(1,1);sg.rotateX(-Math.PI/2);
  var sh=new THREE.Mesh(sg,new THREE.MeshBasicMaterial({map:st,transparent:true,depthWrite:false,fog:false}));sh.visible=false;sh.renderOrder=1;scene.add(sh);
  return {mesh:mesh,shadow:sh,key:'',t:0,phase:0,prev:new V3(),mov:0,dir:'side',flip:false,ang:0,last:null,idx:-1};
}
function prodDirFor(a,avail,cur){
  var deg=Math.abs(a)*180/Math.PI,order=['back','back34','side','front34','front'],want=deg<22.5?0:deg<67.5?1:deg<112.5?2:deg<157.5?3:4;
  if(cur&&avail.indexOf(cur)>=0){var ci=order.indexOf(cur);if(Math.abs(deg-[0,45,90,135,180][ci])<22.5+6)return cur;}
  var best=null,bd=9;avail.forEach(function(d){var di=Math.abs(order.indexOf(d)-want);if(di<bd){bd=di;best=d;}});return best||'side';
}
function prodActorUpdate(a,actor,pos,yaw,dt,clip,pairKey,pairT){
  var m=PROD.man,e=camera.matrixWorld.elements;
  var cfx=-e[8],cfz=-e[10],cl=Math.hypot(cfx,cfz)||1;cfx/=cl;cfz/=cl;var crx=e[0],crz=e[2],rl=Math.hypot(crx,crz)||1;crx/=rl;crz/=rl;
  var fx=Math.sin(yaw),fz=Math.cos(yaw);actor.ang=Math.atan2(fx*crx+fz*crz,fx*cfx+fz*cfz);
  var moved=Math.hypot(pos.x-actor.prev.x,pos.z-actor.prev.z);actor.prev.copy(pos);var sp=moved/Math.max(dt,1e-3);actor.mov+=((sp>0.4?1:0)-actor.mov)*Math.min(1,dt*10);
  var key,set;
  if(pairKey){key=pairKey;set=PROD.sets[key];}
  else{if(clip==='auto')clip=actor.mov>0.5?((a==='player'&&K.run&&S.mode==='play')?'run':'walk'):'idle';key=a+'/'+clip;set=PROD.sets[key];if(!set||!set.dirs.side){key=a+'/idle';set=PROD.sets[key];}}
  if(key!==actor.key){actor.key=key;actor.t=0;}else actor.t+=dt;
  var avail=Object.keys(set.dirs).filter(function(d){return prodSetOk(key,d,0);});
  var dir=prodDirFor(actor.ang,avail,actor.dir);actor.dir=dir;actor.flip=actor.ang<0;
  var o=(a==='player'?PROD.outfit:0);if(!(set.ok[dir+'/'+o]&&set.ok[dir+'/'+o]()))o=0;
  var N=set.frames,idx;
  if(pairKey)idx=Math.max(0,Math.min(N-1,Math.floor(pairT*set.fps)));
  else if(set.stride>0&&clip!=='idle'){actor.phase+=moved/set.stride;idx=Math.floor((actor.phase%1)*N);}
  else idx=set.loop?Math.floor(actor.t*set.fps)%N:Math.min(N-1,Math.floor(actor.t*set.fps));
  var tex=set.dirs[dir][o][idx];if(idx!==actor.idx||tex!==actor.last){actor.idx=idx;actor.last=tex;actor.mesh.material.map=tex;actor.mesh.material.needsUpdate=true;}
  actor.mesh.visible=true;actor.shadow.visible=true;actor.mesh.scale.x=actor.flip?-1:1;
  actor.mesh.rotation.y=Math.atan2(camera.position.x-pos.x,camera.position.z-pos.z);actor.mesh.position.copy(pos);
  actor.shadow.position.set(pos.x,pos.y+0.03,pos.z);actor.shadow.rotation.y=yaw;actor.shadow.scale.set(0.9,1,1.5);
  actor.mesh.updateMatrixWorld(true);
}
function prodOutfit(n){PROD.outfit=0;} /* outfit states retired: belongings always visible */
function prodPx(actor,x,y,out){var m=PROD.man;actor.mesh.updateMatrixWorld(true);return actor.mesh.localToWorld(out.set((x-m.anchor.x)/m.pixelsPerMeter,(m.anchor.y-y)/m.pixelsPerMeter,0));}
function updateProd(dt){
  var on=PROD.ready&&PROD.want;PROD.on=on;
  if(!on){if(PROD.player){PROD.player.mesh.visible=false;PROD.player.shadow.visible=false;PROD.cols.forEach(function(c){c.mesh.visible=false;c.shadow.visible=false;});if(PROD.cap)PROD.cap.visible=false;}
    if(PROD.hid){gates.forEach(function(g){g.col.group.visible=true;});PROD.hid=false;}return;}
  if(!PROD.player){PROD.player=makeProdActor();PROD.cols=gates.map(function(){return makeProdActor();});PROD.cap=player.cap.clone();PROD.cap.visible=false;scene.add(PROD.cap);}
  var pg=player.group;pg.visible=false;if(SPR.mesh){SPR.mesh.visible=false;SPR.shadow.visible=false;SPR.cap.visible=false;}
  gates.forEach(function(g){g.col.group.visible=false;});PROD.hid=true;
  var pr=PROD.pair,pk=pr?'pair:'+pr.name+'/player':null,ck=pr?'pair:'+pr.name+'/collector':null;
  prodActorUpdate('player',PROD.player,pg.position,pg.rotation.y,dt,'auto',pk,pr?pr.t:0);
  gates.forEach(function(g,i){var c=PROD.cols[i],cp=g.col.group.position;prodActorUpdate('collector',c,cp,g.col.group.rotation.y,dt,'auto',(pr&&pr.gate===i)?ck:null,pr?pr.t:0);});
  if(player.cap.visible){PROD.cap.visible=true;PROD.cap.position.set(pg.position.x,pg.position.y+(PROD.man.capHeight||1.7),pg.position.z);PROD.cap.rotation.y=PROD.player.mesh.rotation.y;PROD.cap.scale.copy(player.cap.scale);}else PROD.cap.visible=false;
}
