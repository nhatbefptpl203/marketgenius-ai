'use strict';
// No real Google requests or real API key: emulate Google REST responses.
const assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/ai.js');
process.env.GUEST_GEMINI_API_KEY='private-testing-key-123';
process.env.GUEST_GEMINI_MODEL='gemini-3-flash-preview'; // legacy setting must NOT reorder the new list
process.env.TURNSTILE_SITE_KEY='site-test';
process.env.TURNSTILE_SECRET_KEY='secret-test';
process.env.MEDIA_RESEARCH_ENABLED='false';
const order=['gemini-3.5-flash-lite','gemini-3.1-flash-lite','gemini-3.6-flash','gemini-3.8-flash','gemini-3-flash-preview'];
const brief={industry:'Phụ kiện điện thoại',product:'Ốp lưng iPhone 18',budget:'Thấp',goal:'Tăng doanh số bán hàng',briefMode:'quick',budgetAmount:null};
const ideas=Array.from({length:5},(_,i)=>({title:`Chiến dịch ${i+1}`,channel:'Facebook',concept:'Tạo nội dung ngắn',timeline:[1,2,3,4].map(week=>({week,task:'Đăng bài và báo cáo'})),allocations:[{label:'Nội dung',percent:80},{label:'Dự phòng',percent:20}]}));
const goals=['Tăng doanh số bán hàng','Ra mắt sản phẩm mới','Tăng nhận diện thương hiệu','Thu hút khách hàng tiềm năng'];
const templates=Array.from({length:4},(_,i)=>({title:'Mẫu '+(i+1),description:'Định hướng thực tế',industry:'Phụ kiện điện thoại',goal:goals[i],tier:'Thấp',amount:1500000,audience:'Người dùng điện thoại',marketRegion:'Hà Nội',usp:'Cần xác nhận đặc điểm vật liệu',targetMetric:'8 video thử nghiệm',suggestedChannels:['TikTok']}));
let callNames=[], responses=[], currentAction='guest-generate';
const providerReply=(status,payload)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(payload)});
const success=()=>({ok:true,status:200,text:async()=>JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(currentAction==='guest-templates'?{templates}:{ideas})}]}}]})});
const fail=(status,message,code)=>providerReply(status,{error:{message,status:code||'UNKNOWN'}});
global.fetch=async (url,options={})=>{
  if(String(url).includes('turnstile'))return {ok:true,json:async()=>({success:true,action:currentAction==='guest-templates'?'guest_templates':'guest_generate',hostname:'smartgear.website'})};
  const model=decodeURIComponent(String(url).match(/\/models\/([^/:]+):generateContent/)?.[1]||'');
  callNames.push(model);
  const sent=JSON.parse(options.body);
  if(model==='gemini-3.8-flash')assert.equal(Object.hasOwn(sent.generationConfig,'temperature'),false,'Gemini 3.8 must not receive deprecated temperature');
  if(!model)throw new Error('Expected model path in provider request');
  return (responses.shift()||success());
};
async function issue(action,variants){
  currentAction=action;callNames=[];responses=variants.slice();
  const result=await handler({httpMethod:'POST',headers:{host:'smartgear.website'},body:JSON.stringify({action,turnstileToken:'t'.repeat(48),brief,product:brief.product})});
  return {status:result.statusCode,body:JSON.parse(result.body),calls:callNames.slice()};
}
(async()=>{
  const config=JSON.parse((await handler({httpMethod:'GET'})).body);
  assert.equal(config.guestModel,order[0],'default model must be prioritized above legacy env');
  assert.deepEqual(Object.keys(config).sort(),['guestAvailable','guestModel','ok','turnstileSiteKey'].sort(),'GET schema unchanged');

  // 429 with RESOURCE_EXHAUSTED must advance immediately, as must 503, 404.
  let result=await issue('guest-generate',[
    fail(429,'Daily project quota depleted','RESOURCE_EXHAUSTED'),
    fail(429,'Requests per minute exceeded','RESOURCE_EXHAUSTED'),
    fail(503,'model busy','UNAVAILABLE'),
    fail(404,'model not found','NOT_FOUND'),
    success()
  ]);
  assert.equal(result.status,200,JSON.stringify(result.body));
  assert.deepEqual(result.calls,order);
  assert.equal(result.body.ideas.length,5);
  assert(!('model' in result.body),'response JSON schema must not be extended');

  // If primary works, no other model should be called.
  result=await issue('guest-generate',[success()]);
  assert.equal(result.status,200);
  assert.deepEqual(result.calls,[order[0]]);

  // Templates are covered too and keep their original shape.
  result=await issue('guest-templates',[fail(429,'RESOURCE_EXHAUSTED','RESOURCE_EXHAUSTED'),success()]);
  assert.equal(result.status,200,JSON.stringify(result.body));
  assert.deepEqual(result.calls,order.slice(0,2));
  assert.equal(result.body.templates.length,4);
  assert.deepEqual(Object.keys(result.body).sort(),['ok','source','templates'].sort());

  // RESOURCE_EXHAUSTED should work even if an upstream gateway uses a non-429 HTTP status.
  result=await issue('guest-generate',[fail(400,'Resource exhausted','RESOURCE_EXHAUSTED'),success()]);
  assert.equal(result.status,200);
  assert.deepEqual(result.calls,order.slice(0,2));

  // Auth failure must NOT try other models.
  result=await issue('guest-generate',[fail(403,'Key disabled','PERMISSION_DENIED')]);
  assert.equal(result.status,403);
  assert.deepEqual(result.calls,[order[0]]);

  // Exhausted all model quotas must stop after 5 tries and preserve 429 error format.
  result=await issue('guest-generate',order.map(()=>fail(429,'daily quota exceeded','RESOURCE_EXHAUSTED')));
  assert.equal(result.status,429,JSON.stringify(result.body));
  assert.deepEqual(result.calls,order);
  assert.equal(result.body.ok,false);
  assert(result.body.code==='quota_exceeded'||result.body.code==='rate_limited');
  assert(!JSON.stringify(result.body).includes(process.env.GUEST_GEMINI_API_KEY));

  // If the final available model 404s, keep the earlier actionable 429.
  result=await issue('guest-generate',[
    fail(429,'daily quota exceeded','RESOURCE_EXHAUSTED'),
    fail(429,'daily quota exceeded','RESOURCE_EXHAUSTED'),
    fail(429,'daily quota exceeded','RESOURCE_EXHAUSTED'),
    fail(429,'daily quota exceeded','RESOURCE_EXHAUSTED'),
    fail(404,'not found','NOT_FOUND')
  ]);
  assert.equal(result.status,429);
  assert.deepEqual(result.calls,order);

  // A malformed successful output may be retried on the SAME model once, never change model.
  result=await issue('guest-generate',[
    providerReply(200,{candidates:[{content:{parts:[{text:'not json'}]}}]}),
    providerReply(200,{candidates:[{content:{parts:[{text:'still not json'}]}}]})
  ]);
  assert.equal(result.status,422);
  assert.deepEqual(result.calls,[order[0],order[0]]);
  console.log('PASS Gemini model priority, 429/503/404 fallback, templates, 403 stop, JSON shapes, secrets, finite retries');
})().catch(error=>{console.error(error);process.exitCode=1;});
