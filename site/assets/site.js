(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var RM=matchMedia('(prefers-reduced-motion:reduce)').matches,FINE=matchMedia('(hover:hover) and (pointer:fine)').matches;
var LOW=(navigator.hardwareConcurrency||8)<=4||/Mobi|Android|iPhone/i.test(navigator.userAgent);
var state='form',busy=false;
/* intro */
function intro(){
 if(RM){$('#curtain').style.display='none';return}
 var tl=gsap.timeline({defaults:{ease:'power4.out'}});
 tl.to('#curtain',{opacity:0,duration:.9,ease:'power2.inOut'},0)
  .from('#pic',{opacity:0,duration:1.6},.2)
  .from('#kick',{opacity:0,y:14,duration:.8},.8)
  .from('h1 i',{yPercent:112,duration:1.2,stagger:.14},.9)
  .from('#reg',{opacity:0,x:-24,duration:1},1.4)
  .from(['nav','.disc'],{opacity:0,duration:.8},1.6);
}
/* parallax */
function parallax(){
 if(!FINE||RM)return;
 /* magnetic buttons */
 [].slice.call(document.querySelectorAll('.btn')).forEach(function(b){
  var qx=gsap.quickTo(b,'x',{duration:.5,ease:'power3'}),qy=gsap.quickTo(b,'y',{duration:.5,ease:'power3'});
  b.addEventListener('pointermove',function(e){var r=b.getBoundingClientRect();qx((e.clientX-r.left-r.width/2)*.12);qy((e.clientY-r.top-r.height/2)*.28)});
  b.addEventListener('pointerleave',function(){qx(0);qy(0)})})}
/* validation */
var nm=$('#nm'),ph=$('#ph');
function cleanPhone(v){var d=v.replace(/[\s\-().]/g,'');if(/^\+91/.test(d))d=d.slice(3);else if(/^91\d{10}$/.test(d))d=d.slice(2);else if(/^0\d{10}$/.test(d))d=d.slice(1);return d}
function vName(){var v=nm.value.replace(/\s+/g,' ').trim();if(!v)return 'Please enter your name.';if(v.length<2)return 'Name is too short.';if(v.length>40)return 'Please keep the name under 40 characters.';if(!/^[\p{L}][\p{L}\p{M}'’.\- ]*$/u.test(v))return 'Use letters only — no numbers or symbols.';return ''}
function vPhone(){var d=cleanPhone(ph.value);if(!d)return 'Please enter your mobile number.';if(!/^\d+$/.test(d))return 'Digits only, please.';if(d.length!==10)return 'Enter a 10-digit Indian mobile number.';if(!/^[6-9]/.test(d))return 'Indian mobile numbers start with 6, 7, 8 or 9.';return ''}
function show(f,e,msg){$('#'+f).classList.toggle('bad',!!msg);$('#'+e).textContent=msg;var i=f==='fn'?nm:ph;i.setAttribute('aria-invalid',msg?'true':'false')}
nm.addEventListener('blur',function(){if(nm.value)show('fn','enm',vName())});ph.addEventListener('blur',function(){if(ph.value)show('fp','eph',vPhone())});
nm.addEventListener('input',function(){if($('#fn').classList.contains('bad'))show('fn','enm',vName())});
ph.addEventListener('input',function(){ph.value=ph.value.replace(/[^\d+\s\-]/g,'');if($('#fp').classList.contains('bad'))show('fp','eph',vPhone())});
/* reveal */
function titleCase(s){return s.replace(/\s+/g,' ').trim().toLowerCase().replace(/(^|[\s\-'’.])(\p{L})/gu,function(m,a,b){return a+b.toUpperCase()})}
function fitName(){var e=$('#inm'),t=$('#nmt');e.style.fontSize='';t.style.whiteSpace='nowrap';var fs=parseFloat(getComputedStyle(e).fontSize),w=e.clientWidth;while(t.scrollWidth>w&&fs>20){fs-=2;e.style.fontSize=fs+'px'}}
addEventListener('resize',function(){if(state==='inv')fitName()});
function reveal(name){
 state='inv';prefetchGame();window.scrollTo(0,0);app.scrollTop=0;app.scrollLeft=0;var inv=$('#inv');$('#nmt').textContent=titleCase(name);
 inv.style.display='grid';place();fitName();
 if(RM){$('#form').style.display='none';$('#wv').textContent='₹25,000';$('#dim').style.opacity=innerWidth<=820?0:.1;$('#enter').focus({preventScroll:true});return}
 var o={v:0},tl=gsap.timeline({defaults:{ease:'power4.out'}});
 tl.to($('#form'),{opacity:0,x:-30,duration:.6,ease:'power2.in',onComplete:function(){$('#form').style.display='none'}},0)
  .to('#dim',{opacity:innerWidth<=820?0:.1,duration:1.2,ease:'power2.inOut'},.1)
  .fromTo('#ik',{opacity:0,y:16},{opacity:1,y:0,duration:.8},.7)
  .fromTo('#iw i',{yPercent:112},{yPercent:0,duration:1},.85)
  .fromTo('#nmt',{yPercent:112},{yPercent:0,duration:1.2},1)
  .fromTo('#iy',{opacity:0,y:14},{opacity:1,y:0,duration:.8},1.35)
  .fromTo('#ip i',{yPercent:112},{yPercent:0,duration:1.1,stagger:.12},1.45)
  .fromTo('#iwal',{opacity:0,y:18},{opacity:1,y:0,duration:.8},1.9)
  .to(o,{v:25000,duration:1.6,ease:'power2.out',onUpdate:function(){$('#wv').textContent='₹'+Math.round(o.v).toLocaleString('en-IN')}},2)
  .fromTo(['#enter','#chg'],{opacity:0,y:20},{opacity:1,y:0,duration:.8,stagger:.1,onComplete:function(){$('#enter').focus({preventScroll:true})}},2.3);
}
$('#reg').addEventListener('submit',function(e){e.preventDefault();if(busy||state!=='form')return;
 var a=vName(),b=vPhone();show('fn','enm',a);show('fp','eph',b);
 if(a||b){(a?nm:ph).focus();return}
 busy=true;var btn=$('#go');btn.disabled=true;btn.setAttribute('aria-busy','true');
 if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
 reveal(nm.value);});
$('#chg').addEventListener('click',function(){if(state!=='inv')return;state='form';busy=false;var btn=$('#go');btn.disabled=false;btn.removeAttribute('aria-busy');
 var f=$('#form');f.style.display='grid';place();
 if(RM){$('#inv').style.display='none';f.style.opacity=1;f.style.transform='';nm.focus();return}
 gsap.to('#inv',{opacity:0,duration:.4,onComplete:function(){$('#inv').style.display='none';gsap.set('#inv',{opacity:1});nm.focus({preventScroll:true})}});
 gsap.fromTo(f,{opacity:0,x:-30},{opacity:1,x:0,duration:.7,ease:'power3.out'});
 gsap.to('#dim',{opacity:0,duration:1})});
/* enter game */
$('#enter').addEventListener('click',function(e){e.preventDefault();var h=this.getAttribute('href');if(RM){stopV();location.href=h;return}
 stopV();gsap.to('#out',{opacity:1,duration:.8,ease:'power2.inOut',onComplete:function(){location.href=h}})});
[nm,ph].forEach(function(i){i.addEventListener('focus',function(){setTimeout(function(){try{i.scrollIntoView({block:'center',behavior:'smooth'})}catch(e){}},320)})});
function prefetchGame(){var c=navigator.connection||{};if(c.saveData||innerWidth<=820||document.querySelector('link[data-pf]'))return;var l=document.createElement('link');l.rel='prefetch';l.href='game.html?fromInvite=1';l.setAttribute('data-pf','1');document.head.appendChild(l)}
function boot(){parallax();intro()}
var img=$('#pic img');(img.decode?img.decode().catch(function(){}):Promise.resolve()).then(boot,boot);
/* hero video: starts muted, local file, never restarted by the reveal */
var hv=$('#hv'),pic=$('#pic'),snd=$('#snd'),app=$('#app');
function place(){}
function pickSrc(){var c=navigator.connection||{};return (innerWidth<=820||Math.min(innerWidth,innerHeight)<=500||c.saveData||/2g|3g/.test(c.effectiveType||''))?'assets/video/welcome-720.mp4':'assets/video/WELCOME.mp4'}
function playV(){hv.play&&hv.play().then(function(){pic.classList.add('on')},function(){})}
function startV(){if(RM||hv.getAttribute('src'))return;hv.preload='auto';hv.src=pickSrc();hv.muted=true;hv.addEventListener('playing',function(){pic.classList.add('on')},{once:true});playV()}
(function(){var go=function(){setTimeout(startV,60)};if(document.readyState==='complete')go();else addEventListener('load',go)})();
document.addEventListener('visibilitychange',function(){if(!hv.getAttribute('src'))return;if(document.hidden)hv.pause();else if(state!=='leaving')playV()});
if(RM){snd.style.display='none'}else{snd.style.display='block';snd.addEventListener('click',function(){var on=hv.muted;hv.muted=!on;if(on)hv.volume=.8;snd.setAttribute('aria-pressed',on?'true':'false');snd.textContent=on?'Sound on':'Sound off';playV()})}
function stopV(){state='leaving';try{hv.pause();hv.removeAttribute('src');hv.load()}catch(e){}}
addEventListener('pagehide',function(){try{hv.pause()}catch(e){}});
})();
