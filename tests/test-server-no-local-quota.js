'use strict';
const assert=require('node:assert/strict');
const net=require('node:net');
const path=require('node:path');
const {spawn}=require('node:child_process');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const port=s.address().port;await new Promise(r=>s.close(r));return port;}
(async()=>{
 const port=await freePort();
 const child=spawn(process.execPath,['-r',path.join(__dirname,'fixtures/fake-gemini.js'),'server.js'],{
  cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),GUEST_GEMINI_API_KEY:'fake-testing-key',GUEST_GEMINI_MODEL:'gemini-2.5-flash',TURNSTILE_SITE_KEY:'fake',TURNSTILE_SECRET_KEY:'fake',GUEST_IP_DAILY_LIMIT:'1',GUEST_DAILY_LIMIT:'1',MEDIA_RESEARCH_ENABLED:'false'},stdio:['ignore','pipe','pipe']
 });
 let err='';child.stderr.on('data',chunk=>err+=chunk.toString());
 try{
  let ready=false;for(let i=0;i<50;i++){try{if((await fetch(`http://127.0.0.1:${port}/healthz`)).ok){ready=true;break;}}catch{}await pause(80);}assert(ready,err);
  const brief={industry:'Phụ kiện điện thoại',product:'Ốp lưng iPhone',budget:'Thấp',goal:'Tăng doanh số bán hàng',briefMode:'quick'};
  async function send(ip,seed){
   const resp=await fetch(`http://127.0.0.1:${port}/api/ai`,{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':ip},body:JSON.stringify({action:'guest-generate',brief,turnstileToken:'good'.repeat(10)+seed})});
   return {status:resp.status,body:await resp.json()};
  }
  const invalid=await send('198.51.100.10','invalid');assert.equal(invalid.status,403,'Turnstile must still reject invalid token');
  const first=await send('198.51.100.10','1');assert.equal(first.status,500,'fixture provider first call fails');
  const second=await send('198.51.100.10','2');assert.equal(second.status,200,JSON.stringify(second.body));
  const third=await send('198.51.100.10','3');assert.equal(third.status,200,JSON.stringify(third.body));
  const fourth=await send('198.51.100.11','4');assert.equal(fourth.status,200,JSON.stringify(fourth.body));
  const cfg=await (await fetch(`http://127.0.0.1:${port}/api/ai`)).json();
  assert.equal(cfg.guestAvailable,true,'server config must never turn off AI based on local count');
  console.log('PASS no local daily/per-IP/cooldown cap; valid consecutive requests accepted; Turnstile still required');
 }finally{child.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1;});
