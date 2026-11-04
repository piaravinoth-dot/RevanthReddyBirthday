import re
head=open('part_head.html').read()
import json as _j
GC=_j.load(open('gates_config.json',encoding='utf-8'))
for _i,_g in enumerate(GC['gates'],1): head=head.replace('{{G%d}}'%_i,_g['name'])
head=head.replace('<div class="hint"><span>W / &uarr; walk</span><span>A D / &larr; &rarr; steer</span><span>No way back once you start</span></div>',
 '<div class="hint"><span>W / &uarr; walk</span><span>A D / &larr; &rarr; steer</span><span>No way back once you start</span><button class="qbtn" id="qBtn" type="button">Graphics: High</button><button class="qbtn" id="sndBtn2" type="button">Sound: On</button><button class="qbtn" id="chBtn" type="button">Character: 3D model</button></div>')
head=head.replace(':focus-visible{outline',".qbtn{appearance:none;background:transparent;color:var(--fg);border:1px solid var(--fg);border-radius:4px;font-family:var(--font-mono);font-size:.72rem;letter-spacing:.05em;text-transform:uppercase;padding:3px 10px;cursor:pointer}\n:focus-visible{outline",1)
head=head.replace('<span>W / &uarr; walk</span>','<span>W / &uarr; walk &middot; Shift run</span>')
head=head.replace('/*ANEK*/',open('anek.css').read())
head=head.replace('<div class="loading" id="loading">','<button id="sndBtn" class="snd" type="button" aria-pressed="true" aria-label="Sound: On"><span class="ic">&#9835;</span><i></i></button>\n    <div class="loading" id="loading">',1)
head=head.replace(':focus-visible{outline',".snd{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:5;width:44px;height:44px;border-radius:50%;border:2px solid #fff;background:#7a2fc0;color:#fff;font-size:1.25rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;touch-action:manipulation;overflow:hidden}\n.snd i{position:absolute;left:6px;right:6px;top:50%;height:3px;background:#fff;border-radius:2px;transform:rotate(-40deg);opacity:0}\n.snd.off{background:#3a3450;color:#bbb}.snd.off i{opacity:1}\n.snd.half{background:#4b3a78}.snd.half i{opacity:1;transform:rotate(-40deg) scaleX(.55)}\n:focus-visible{outline",1)
import base64
B64=base64.b64encode(open('deploy/assets/audio/vasool_bgm_from_0045.mp3','rb').read()).decode()
js=open('game.js').read().replace('/*GATECFG*/{entryFee:2500,ui:{amountLabel:\'Amount to Pay\',button:\'CONTINUE\'},gates:[]}',_j.dumps(GC,ensure_ascii=True)).replace('/*POPUPS*/{popups:[]}',__import__('json').dumps(__import__('json').load(open('vasool_telugu_popups.json',encoding='utf-8')),ensure_ascii=True)).replace('/*STANDEE_B64*/','data:image/png;base64,'+__import__('base64').b64encode(open('standee/rr_standee.png','rb').read()).decode()).replace('/*BGM_B64*/',B64).replace('/*SPRITES*/',open('sprites.js').read()).replace('/*PRODLOADER*/',open('prod_loader.js').read()).replace('/*ENVJS*/',open('env.js').read()+'\nENV.build();')
CD='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/'
libs=['shaders/CopyShader.js','shaders/LuminosityHighPassShader.js','shaders/FXAAShader.js','postprocessing/EffectComposer.js','postprocessing/RenderPass.js','postprocessing/ShaderPass.js','postprocessing/UnrealBloomPass.js','loaders/GLTFLoader.js','utils/BufferGeometryUtils.js','utils/SkeletonUtils.js']
def build(t,ex,extra=''):
    s=head+'<script src="%s"></script>\n'%t
    for l in libs: s+='<script src="%s%s"></script>\n'%(ex,l)
    return s+'<script>\n'+js.replace('/*DBG*/',extra)+'\n</script>\n'
def inline():
    R='lib/node_modules/three/'
    s=head+'<script>'+open(R+'build/three.min.js').read().replace('</script','<\\/script')+'</script>\n'
    for l in libs: s+='<script>'+open(R+'examples/js/'+l).read().replace('</script','<\\/script')+'</script>\n'
    return s+'<script>\n'+js.replace('/*DBG*/','')+'\n</script>\n'
PRE='<!doctype html>\n<html lang="en">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
import gzip
def GZ(f): return base64.b64encode(gzip.compress(open(f,'rb').read(),9,mtime=0)).decode()
js_url=js
js=js_url.replace('/*RB_P*/',GZ('glb/player.glb')).replace('/*RB_C*/',GZ('glb/collector.glb'))
for n in '2345': js=js.replace('/*RB_C%s*/'%n,GZ('glb/collector%s.glb'%n))
js_emb=js
PAKO=open('lib/node_modules/pako/dist/pako_inflate.min.js').read().replace('</script','<\\/script')
open('vasool-birthday-art.html','w').write(inline().replace('<script>\n'+js.replace('/*DBG*/','')[:40],'<script>'+PAKO+'</script>\n<script>\n'+js.replace('/*DBG*/','')[:40],1))
js=js_url
open('vasool-birthday-v2.html','w').write(PRE+inline()+'</body></html>')
js=js_emb
PRE2='<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<link rel="icon" href="data:,">\n'
open('netlify-index.html','w').write(PRE2+inline().replace('<script>\n'+js.replace('/*DBG*/','')[:40],'<script>'+PAKO+'</script>\n<script>\n'+js.replace('/*DBG*/','')[:40],1)+'</body></html>')
js=js_url
open('vasool-birthday-cdn.html','w').write(build('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',CD))
L='file:///tmp/claude-0/-home-claude/e8c47cfb-790e-505b-9fb3-ae2ea3624375/scratchpad/lib/node_modules/three/'
dbg="window.__d={PCAM:PCAM,STD:STD,ENV:ENV,RB:RB,camera:camera,scene:scene,renderer:renderer,S:S,startSeq:startSeq,toReady:toReady,gates:gates,P:P,K:K,finale:finale,player:player,vb:vb,update:update,Q:Q,applyQuality:applyQuality,hasPost:hasPost,camPos:camPos,camLook:camLook,SPR:SPR,sprActive:sprActive,K:K,PROD:PROD,AU:AU,render:function(){if(gradePass)gradePass.uniforms.uTime.value=S.showT%100;if(composer)composer.render(0.016);else renderer.render(scene,camera);},bundles:bundles,ikArm:ikArm,gatesAll:gates,hist:function(){return document.getElementById('hist').innerText;}};"
open('test.html','w').write(PRE+build(L+'build/three.min.js',L+'examples/js/',dbg)+'</body></html>')
open('chk3.js','w').write(js)

open('test_http.html','w').write(open('test.html').read().replace(L,'/lib/node_modules/three/'))
