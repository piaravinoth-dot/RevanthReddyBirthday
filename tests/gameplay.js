// Gameplay acceptance test. READ-ONLY with respect to the game: it never edits site/game.html.
// It writes a temporary copy (tests/.tmp/game_test.html) that only adds a window.__d debug handle
// so the test can step the simulation deterministically (the page already supports ?norAF).
// Usage: node tests/gameplay.js <d|m|l> [baseUrlOfSiteRoot]   (server must serve ./site and ./tests/.tmp)
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const vpn=process.argv[2]||'d';
const VP={d:{width:1280,height:720},m:{width:390,height:844,isMobile:true,hasTouch:true},l:{width:844,height:390,isMobile:true,hasTouch:true}}[vpn];
const BASE=process.argv[3]||'http://localhost:8801';
const EXPECT={entry:{fee:2500,wallet:'₹22,500'},
 // [amount shown, wallet before paying, Vasool Babu total before paying]
 gates:[['₹6,000','₹22,500','₹2,500'],['₹5,000','₹16,500','₹8,500'],['₹4,500','₹11,500','₹13,500'],['₹3,000','₹7,000','₹18,000'],['₹4,000','₹4,000','₹21,000']],
 finalPaid:'₹25,000',finalVb:'₹25,000'};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+vpn+' '+m);if(!c)fails++};
(async()=>{
 // build the throw-away debug copy
 const src=fs.readFileSync(path.join(__dirname,'..','site','game.html'),'utf8');
 const key='if(!/[?&]norAF/.test(location.search))requestAnimationFrame(frame)';
 if(src.split(key).length!==2){console.log('FAIL cannot locate debug anchor in game.html');process.exit(1)}
 const dbg='window.__d={S:S,gates:gates,update:update};';
 fs.mkdirSync(path.join(__dirname,'.tmp'),{recursive:true});
 fs.writeFileSync(path.join(__dirname,'.tmp','game_test.html'),src.replace(key,dbg+key));
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const c=await b.newContext({viewport:{width:VP.width,height:VP.height},isMobile:!!VP.isMobile,hasTouch:!!VP.hasTouch});
 const p=await c.newPage();const errs=[],bad=[];
 await p.route(u=>!/^https?:\/\/localhost[:\/]/.test(u.toString())&&!/^(data|blob):/.test(u.toString()),r=>r.abort()); // external hosts (Google Fonts) are not part of the check
 p.on('pageerror',e=>errs.push('pageerror '+e.message));
 p.on('console',m=>{if(m.type()==='error'&&!/^Failed to load resource/.test(m.text()))errs.push('console.error '+m.text().slice(0,160))});
 p.on('requestfailed',r=>{if(/^https?:\/\/localhost[:\/]/.test(r.url()))bad.push('REQFAIL '+r.url().slice(-80))});
 p.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url().slice(-80))});
 await p.goto(BASE+'/__tmp/game_test.html?norAF&fromInvite=1');
 await p.waitForFunction(()=>window.__d&&document.getElementById('skipBtn'),null,{timeout:60000});
 await p.waitForTimeout(6000);
 const st=()=>p.evaluate(()=>({mode:__d.S.mode,gate:__d.S.gate,wal:document.getElementById('wAmt').textContent,vb:document.getElementById('vAmt').textContent,
  toll:!document.getElementById('toll').hidden,tn:document.getElementById('tollName').textContent,ta:document.getElementById('tollAmt').textContent,
  tel:document.getElementById('popTel').textContent,res:!document.getElementById('result').hidden,
  shell:['.hero','header.top','footer','#enter'].some(s=>{const e=document.querySelector(s);return e&&getComputedStyle(e).display!=='none'})}));
 const step=n=>p.evaluate(n=>{for(let j=0;j<n;j++)__d.update(1/30)},n);
 ok((await st()).shell===false,'old white shell not visible');
 await p.evaluate(()=>document.getElementById('skipBtn').click());
 const tel=new Set();let last='',rows=[],res=null,shell=false;
 for(let i=0;i<4000&&!res;i++){await step(10);const s=await st();shell=shell||s.shell;
  if(s.tel&&s.tel!==last){last=s.tel;tel.add(s.tel)}
  if(s.mode==='play'&&!s.toll)await p.keyboard.down('w');
  if(s.toll){await p.keyboard.up('w');
   const col=await p.evaluate(g=>!!(__d.gates[g]&&__d.gates[g].col),s.gate);
   const before=s.wal;await p.evaluate(()=>document.getElementById('payBtn').click());await step(120);const a=await st();
   rows.push({gate:s.gate,name:s.tn,amt:s.ta,before,vbAtToll:s.vb,col});}
  if(s.res)res=await p.evaluate(()=>({paid:document.getElementById('rPaid').textContent,vb:document.getElementById('rVb').textContent,msg:document.getElementById('rMsg').textContent}));}
 // entry toll is the first row (gate index -1/0 depending on engine); keep the last five as Gates 1-5
 const g5=rows.slice(-5);
 ok(rows.length>=5,'toll prompts seen: '+rows.length);
 g5.forEach((r,k)=>{const e=EXPECT.gates[k];
  ok(r.amt===e[0]&&r.before===e[1]&&r.vbAtToll===e[2],`Gate ${k+1} ${r.name}: pay ${r.amt}, wallet before ${r.before}, Vasool Babu ${r.vbAtToll}`);
  ok(r.col,`Gate ${k+1} collector group present`)});
 ok(!!res&&res.paid===EXPECT.finalPaid&&res.vb===EXPECT.finalVb,'receipt: '+JSON.stringify(res&&{paid:res.paid,vb:res.vb}));
 ok(!!res&&/[ఀ-౿]/.test(res.msg),'receipt Telugu message present');
 ok([...tel].filter(t=>/[ఀ-౿]/.test(t)).length>=6,'Telugu popups shown: '+tel.size);
 ok(!shell,'old shell never visible during run');
 await p.evaluate(()=>document.getElementById('againBtn').click());await step(30);
 const r=await st();ok(r.wal==='₹25,000','restart resets wallet to ₹25,000 ('+r.wal+')');
 ok(errs.length===0,'no console/page errors '+JSON.stringify(errs.slice(0,3)));
 ok(bad.length===0,'no failed requests '+JSON.stringify(bad.slice(0,3)));
 await b.close();process.exit(fails?1:0);
})().catch(e=>{console.log('FAIL exception',e.message);process.exit(1)});
