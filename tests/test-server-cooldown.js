'use strict';
const assert=require('node:assert/strict');
const net=require('node:net');
const path=require('node:path');
const {spawn}=require('node:child_process');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const port=s.address().port;await new Promise(r=>s.close(r));return port;}
(async()=>{
 const port=await freePort();
 const child=spawn(process.execPath,['-r',path.join(__dirname,'fixtures/fake-gemini.js'),'server.js'],{
  cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),GUEST_GEMINI_API_KEY:'fake-testing-key',GUEST_GEMINI_MODEL:'gemini-2.5-flash',TURNSTILE_SITE_KEY:'fake',TURNSTILE_SECRET_KEY:'fake',GUEST_IP_DAILY_LIMIT:'4',GUEST_DAILY_LIMIT:'20',MEDIA_RESEARCH_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
 try{
  let up=false;for(let i=0;i<50;i++){try{if((await fetch(`http://127.0.0.1:${port}/healthz`)).ok){up=true;break;}}catch{}await pause(80);}assert(up);
  const payload={action:'guest-generate',brief:{industry:'Phụ kiện điện thoại',product:'Ốp lưng',budget:'Thấp',goal:'Tăng doanh số bán hàng',briefMode:'quick'},turnstileToken:'good'.repeat(12)};
  const call=async()=>{const r=await fetch(`http://127.0.0.1:${port}/api/ai`,{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':'192.0.2.35'},body:JSON.stringify(payload)});return {status:r.status,body:await r.json()};};
  assert.equal((await call()).status,500,'provider error still occupies generate slot');
  const second=await call();assert.equal(second.status,429);assert.equal(second.body.code,'guest_cooldown');
  console.log('PASS 20-second same-IP generate cooldown is independent of daily quota');
 }finally{child.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1});
