'use strict';
const assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/ai.js');
process.env.GUEST_GEMINI_API_KEY='fake-site-key-tests-only';
process.env.GUEST_GEMINI_MODEL='gemini-2.5-flash';
process.env.TURNSTILE_SITE_KEY='fake-turnstile-site';
process.env.TURNSTILE_SECRET_KEY='fake-turnstile-secret';
process.env.MEDIA_RESEARCH_ENABLED='false';
const validBrief={industry:'Phụ kiện điện thoại',product:'Ốp lưng chống sốc',budget:'Thấp',goal:'Tăng doanh số bán hàng',briefMode:'quick',budgetAmount:null};
const goodIdea=(i)=>({title:`Chiến dịch ${i+1}`,channel:'Facebook',concept:'Nội dung ngắn',allocations:[{label:'Sản xuất',percent:80},{label:'Dự phòng',percent:20}],timeline:[1,2,3,4].map(week=>({week,task:'Triển khai và kiểm tra'}))});
let calls=0, gateway=0;
global.fetch=async(url,opts={})=>{
  const target=String(url);
  if(target.includes('turnstile'))return {ok:true,json:async()=>({success:opts.body.toString().includes('wrong')?false:true,action:'guest_generate',hostname:'smartgear.website'})};
  gateway++;
  if(gateway===1)throw Error('network-failure');
  const payload={ideas:Array.from({length:gateway===2?4:5},(_,i)=>goodIdea(i))};
  if(gateway===4)return {ok:false,status:429,text:async()=>JSON.stringify({error:{message:'quota exceeded'}})};
  return {ok:true,status:200,text:async()=>JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(payload)}]}}]})};
};
async function send(action,extras={},cb){const result=await handler({httpMethod:'POST',headers:{host:'smartgear.website'},body:JSON.stringify({action,turnstileToken:'good'.repeat(12),brief:validBrief,...extras}),beforeGuestGemini:cb});return {status:result.statusCode,body:JSON.parse(result.body)};}
(async()=>{
  const cfg=await handler({httpMethod:'GET'});
  assert.deepEqual(Object.keys(JSON.parse(cfg.body)).sort(),['guestAvailable','guestModel','ok','turnstileSiteKey'].sort());
  for(const action of ['generate','test','probe-model','list-models']){
    const response=await send(action,{apiKey:'fake-user-key',provider:'openai',model:'gpt-4o'});
    assert.equal(response.status,400,action);
  }
  assert.equal(gateway,0,'unsupported actions must never reach Gemini');
  let reservations=0;
  const invalid=await send('guest-generate',{turnstileToken:'wrong'.repeat(12)},()=>{reservations++});
  assert.equal(invalid.status,403);assert.equal(reservations,0,'Turnstile failure must never reserve quota');
  // Network failures must not retry; JSON-format failures still get exactly one retry.
  const providerDown=await send('guest-generate',{},()=>{reservations++});
  assert.equal(providerDown.status,502);assert.equal(reservations,1);assert.equal(gateway,1);
  // 4 ideas -> retry exactly once -> valid 5 ideas.
  const response=await send('guest-generate',{},()=>{reservations++});
  assert.equal(response.status,200,JSON.stringify(response.body));
  assert.equal(response.body.ideas.length,5);assert.equal(gateway,3);
  // 429 from Gemini -> immediate next-model fallback, not a same-model retry.
  const limited=await send('guest-generate',{},()=>{reservations++});
  assert.equal(limited.status,200);assert.equal(limited.body.ideas.length,5);assert.equal(gateway,5);
  assert.equal(reservations,3,'quota reserved once per validated incoming request, not once per retry');
  console.log('PASS guest-only actions, CAPTCHA, JSON retry once, network errors and 429 fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
