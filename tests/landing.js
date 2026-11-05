// Landing -> form validation -> invitation -> Enter -> direct game (no old shell). Does not touch game logic.
const {chromium}=require('playwright');
const vpn=process.argv[2]||'d',BASE=process.argv[3]||'http://localhost:8801';
const VP={d:[1440,900,false],m:[390,844,true],l:[844,390,true]}[vpn];
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+vpn+' landing '+m);if(!c)fails++};
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
 const c=await b.newContext({viewport:{width:VP[0],height:VP[1]},isMobile:VP[2],hasTouch:VP[2]});const p=await c.newPage();const errs=[];
 await p.route(u=>!/^https?:\/\/localhost[:\/]/.test(u.toString())&&!/^(data|blob):/.test(u.toString()),r=>r.abort());
 p.on('pageerror',e=>errs.push(String(e)));p.on('requestfailed',r=>{if(/localhost/.test(r.url())&&!/\.mp4/.test(r.url()))errs.push('REQFAIL '+r.url().slice(-60))});
 p.on('response',r=>{if(/localhost/.test(r.url())&&r.status()>=400)errs.push(r.status()+' '+r.url().slice(-60))});
 await p.goto(BASE+'/index.html');await p.waitForTimeout(3000);
 ok(await p.evaluate(()=>!!document.querySelector('meta[name=robots][content*=noindex]')),'noindex meta present');
 ok(/satire/i.test(await p.evaluate(()=>document.body.innerText)),'satire disclosure on page');
 await p.click('#go');ok(/name/i.test(await p.textContent('#enm'))&&/mobile/i.test(await p.textContent('#eph')),'empty form shows both errors');
 await p.fill('#nm','Viswanathan');await p.fill('#ph','12345');await p.click('#go');ok(/10-digit/.test(await p.textContent('#eph')),'bad phone rejected');
 await p.fill('#ph','98765 43210');await p.click('#go');await p.waitForTimeout(5000);
 ok(await p.evaluate(()=>/25,000/.test(document.getElementById('wv').textContent)&&/viswanathan/i.test(document.getElementById('nmt').textContent)),'invitation shows name and ₹25,000');
 // disclosure must not overlap the primary button (short-screen fix)
 const ov=await p.evaluate(()=>{const a=document.getElementById('enter').getBoundingClientRect(),d=document.querySelector('.disc').getBoundingClientRect();return a.bottom>d.top+1&&a.top<d.bottom-1&&a.right>d.left&&a.left<d.right});
 ok(!ov,'disclosure does not overlap Enter button');
 await Promise.all([p.waitForURL(/game(\.html)?\?fromInvite=1/,{timeout:20000}),p.click('#enter')]);
 let shell=false;for(let i=0;i<20;i++){await p.waitForTimeout(250);try{shell=shell||await p.evaluate(()=>['.hero','header.top','footer','#enter'].some(s=>{const e=document.querySelector(s);return e&&e.offsetParent!==null&&getComputedStyle(e).display!=='none'}))}catch(e){}}
 ok(!shell,'direct entry: old shell never shown');
 ok(errs.length===0,'no page errors / failed local requests '+JSON.stringify(errs.slice(0,3)));
 await b.close();process.exit(fails?1:0)})().catch(e=>{console.log('FAIL exception',e.message);process.exit(1)});
