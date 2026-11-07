'use strict';
const assert=require('node:assert/strict');
const {BrowserUseMediaService,normalizeCloudResult,directImageUrl,validVideoUrl}=require('../browser-use-cloud.js');
const id='3d7d9e7b-8a6c-482e-b4df-4fa2882e18f1';
const ideas=Array.from({length:5},(_,i)=>({title:'Chiến dịch '+(i+1),channel:i%2?'TikTok':'Facebook',concept:'Chiến dịch review trải nghiệm sản phẩm',hook:'Trải nghiệm thực tế'}));
const campaigns=Array.from({length:5},(_,i)=>({index:i+1,image:{url:`https://images.pexels.com/photos/${i+1}/pexels-photo-${i+1}.jpeg`,sourceUrl:`https://www.pexels.com/photo/${i+1}/`,sourceTitle:'Bàn làm việc chụp ảnh thiết bị',kind:'illustration'},video:{url:`https://www.youtube.com/watch?v=abcdEFGH${i}`,title:'Video thực tế '+(i+1)},article:{url:`https://example.com/article/${i+1}`,title:'Bài viết '+(i+1)}}));
(async()=>{
  const env={BROWSER_USE_ENABLED:'true',BROWSER_USE_API_KEY:'test-secret-must-not-leak',BROWSER_USE_MAX_COST_USD:'0.30',BROWSER_USE_DAILY_LIMIT:'1',BROWSER_USE_IP_DAILY_LIMIT:'1'};
  let time=Date.now(),pollCount=0,createCount=0,cancelCount=0,seenRequest=null;
  const fetchImpl=async(url,options)=>{
    assert(url.startsWith('https://api.browser-use.com/api/v4/'));
    assert.equal(options.headers['X-Browser-Use-API-Key'],env.BROWSER_USE_API_KEY);
    if(url.endsWith('/runs')&&options.method==='POST'){
      createCount++;seenRequest=JSON.parse(options.body);
      assert(seenRequest.outputSchema.properties.campaigns);
      return {ok:true,json:async()=>({id})};
    }
    if(url.endsWith('/status')){pollCount++;return {ok:true,json:async()=>({status:pollCount<2?'running':'completed'})};}
    if(url.endsWith('/cancel')){cancelCount++;return {ok:true,json:async()=>({status:'cancelled'})};}
    if(url.endsWith('/'+id)&&options.method==='GET')return {ok:true,json:async()=>({status:'completed',result:JSON.stringify({campaigns})})};
    throw Error('unexpected mocked URL '+url);
  };
  const svc=new BrowserUseMediaService({env,now:()=>time,fetchImpl});
  assert.equal(svc.issueTicket('ip-a','Tai nghe Bluetooth',ideas).length>20,true);
  const ticket=svc.issueTicket('ip-a','Tai nghe Bluetooth',ideas);
  const handle=await svc.start(ticket,'ip-a');
  assert.equal(createCount,1);
  assert.equal(seenRequest.maxCostUsd,0.30);
  assert(!JSON.stringify(handle).includes(env.BROWSER_USE_API_KEY));
  await assert.rejects(()=>svc.start(ticket,'ip-a'),/hết hạn/);
  await assert.rejects(()=>svc.status(handle.jobId,'wrong-access','ip-a'),/quyền/);
  await assert.rejects(()=>svc.status(handle.jobId,handle.access,'ip-other'),/hợp lệ/);
  time+=3000;assert.equal((await svc.status(handle.jobId,handle.access,'ip-a')).status,'running');
  time+=3000;const done=await svc.status(handle.jobId,handle.access,'ip-a');
  assert.equal(done.status,'completed');assert.equal(done.campaigns.length,5);
  assert.equal(done.campaigns[0].images.length,1);
  assert.equal(done.campaigns[3].videos[0].url,'https://www.youtube.com/watch?v=abcdEFGH3');
  assert.equal(svc.active,0);assert.equal(cancelCount,0);
  await assert.rejects(()=>svc.start(svc.issueTicket('ip-a','Tai nghe Bluetooth',ideas),'ip-a'),/hạn mức/);
  const unsafe=normalizeCloudResult({output:JSON.stringify({campaigns:[
    {index:1,image:{url:'http://10.0.0.1/x.jpg',sourceUrl:'https://example.com',sourceTitle:'Private',kind:'product'},video:{url:'https://tiktok.com/search?q=foo',title:'Tìm kiếm'},article:{url:'http://localhost',title:'Local'}},
    {index:2,image:{url:'https://images.pexels.com/photos/1/x.jpg',sourceUrl:'https://example.com/ref',sourceTitle:'Ảnh stock',kind:'illustration'}},
    {index:3,image:{url:'https://images.pexels.com/photos/1/x.jpg',sourceUrl:'https://example.com/ref',sourceTitle:'Trùng ảnh',kind:'illustration'}},
    {index:4,image:{url:'https://images.pexels.com/photos/7/x.jpg',sourceUrl:'https://example.com/ref',sourceTitle:'iPhone 15',kind:'product'}}]})},ideas,'iPhone 17 Pro');
  assert.equal(unsafe[0].images.length,0);assert.equal(unsafe[0].videos.length,0);
  assert.equal(unsafe[1].images.length,1);assert.equal(unsafe[2].images.length,0);assert.equal(unsafe[3].images.length,0);
  assert.equal(directImageUrl('https://example.com/article'),'');
  assert.equal(validVideoUrl('https://www.youtube.com/results?search_query=thing'),'');
  const env2={...env,BROWSER_USE_DAILY_LIMIT:'10',BROWSER_USE_IP_DAILY_LIMIT:'10'};
  const svc2=new BrowserUseMediaService({env:env2,now:()=>time,fetchImpl});
  const h2=await svc2.start(svc2.issueTicket('ip-a','Sản phẩm mới',ideas),'ip-a');
  assert.equal((await svc2.cancel(h2.jobId,h2.access,'ip-a')).status,'cancelled');
  assert.equal(svc2.active,0);assert.equal(cancelCount,1);
  assert.equal((await svc2.status(h2.jobId,h2.access,'ip-a')).status,'cancelled');
  console.log('Browser Use Cloud: PASS (ticket, auth, v4 schema, pending/completed, filtering, cancel, quota)');
})().catch(e=>{console.error(e);process.exitCode=1;});
