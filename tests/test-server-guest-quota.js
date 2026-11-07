'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const net=require('node:net');
const path=require('node:path');
const {spawn}=require('node:child_process');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));return port;}
const brief={industry:'Phụ kiện điện thoại',product:'Ốp lưng iPhone',budget:'Thấp',goal:'Tăng doanh số bán hàng',briefMode:'quick'};
async function send(port,ip,token='good'.repeat(12)){
  const body=JSON.stringify({action:'guest-generate',brief,turnstileToken:token});
  const response=await fetch(`http://127.0.0.1:${port}/api/ai`,{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':ip,'Origin':`http://127.0.0.1:${port}`},body});
  return {status:response.status,body:await response.json()};
}
(async()=>{
  const port=await freePort();
  const child=spawn(process.execPath,['-r',path.join(__dirname,'fixtures/fake-gemini.js'),'server.js'],{
    cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),GUEST_GEMINI_API_KEY:'fake-local-key',GUEST_GEMINI_MODEL:'gemini-2.5-flash',TURNSTILE_SITE_KEY:'fake-site',TURNSTILE_SECRET_KEY:'fake-secret',MEDIA_RESEARCH_ENABLED:'false',GUEST_IP_DAILY_LIMIT:'1',GUEST_DAILY_LIMIT:'2'},stdio:['ignore','pipe','pipe']});
  let err='';child.stderr.on('data',x=>err+=x.toString());
  try{
    let ready=false;
    for(let i=0;i<45;i++){if(child.exitCode!==null)throw new Error(err||'server died');try{const res=await fetch(`http://127.0.0.1:${port}/healthz`);if(res.ok){ready=true;break;}}catch{}await pause(90);}
    assert(ready,'server not ready '+err);
    const bad=await send(port,'198.51.100.10','invalid'.repeat(8));assert.equal(bad.status,403,'invalid CAPTCHA must not count');
    const providerError=await send(port,'198.51.100.10');assert.equal(providerError.status,500,'first paid Gemini call error');
    const sameIp=await send(port,'198.51.100.10');assert.equal(sameIp.status,429);assert.equal(sameIp.body.code,'guest_site_limit','failed Gemini must still count');
    const success=await send(port,'198.51.100.11');assert.equal(success.status,200,JSON.stringify(success.body));
    const global=await send(port,'198.51.100.12');assert.equal(global.status,429);assert.equal(global.body.code,'guest_site_limit');
    const configResponse=await fetch(`http://127.0.0.1:${port}/api/ai`,{headers:{'X-Forwarded-For':'198.51.100.12'}});
    const config=await configResponse.json();
    assert.equal(config.guestAvailable,false,'quota-exhausted config must disable AI CTA');
    console.log('PASS server reserves paid calls on failures, CAPTCHA failures free, per-IP and global quota');
  } finally {child.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1});
