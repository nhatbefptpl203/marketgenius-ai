'use strict';
// Exercise optional paid image-search path explicitly; production default stays OFF.
process.env.MEDIA_GEMINI_IMAGE_SEARCH='true';
const assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/ai.js');
process.env.GUEST_GEMINI_API_KEY='local-testing-key-value';
process.env.GUEST_GEMINI_MODEL='gemini-2.5-flash';
process.env.TURNSTILE_SITE_KEY='local-site-key';
process.env.TURNSTILE_SECRET_KEY='local-test-secret';
const product='iPhone 18 Pro Max 256GB';
const ideas=Array.from({length:5},(_,i)=>({title:'Chiến dịch '+(i+1),strategy:'Kênh '+i,channel:'TikTok',concept:'Ý tưởng triển khai bằng video sản phẩm',audience:'Người mua quan tâm công nghệ',hook:'Khám phá sản phẩm',rationale:'Kiểm chứng giả định',sampleContent:'Hãy xem sản phẩm',riskPlan:'Giới hạn chi phí thử nghiệm',budgetSplit:'Dự trù ngân sách',allocations:[{label:'Nội dung',percent:90},{label:'Dự phòng',percent:10}],kpis:['4 video – thử nghiệm – đếm bài'],timeline:Array.from({length:4},(_,w)=>({week:w+1,task:'Đăng video và theo dõi lượt xem tuần '+(w+1)}))}));
let searches=0;
global.fetch=async (url,options={})=>{
  if(String(url).includes('turnstile'))return {ok:true,json:async()=>({success:true,action:'guest_generate',hostname:'smartgear.website'})};
  const parsed=JSON.parse(options.body);
  const grounded=Array.isArray(parsed.tools);
  if(grounded)searches++;
  const output=grounded
    ?{candidates:[{groundingMetadata:{groundingChunks:[
      {image:{sourceUri:'https://example.com/iphone',imageUri:'https://cdn.example.com/iphone.png',title:'iPhone 18 Pro Max 256GB'}},
      {web:{uri:'https://www.tiktok.com/@reviewvn/video/7481234567890123456',title:'iPhone 18 Pro Max 256GB review TikTok'}},
      {web:{uri:'https://www.theverge.com/2026/iphone-18-pro-max',title:'iPhone 18 Pro Max Review'}}
    ]}}]}
    :{candidates:[{content:{parts:[{text:JSON.stringify({ideas})}]}}]};
  return {ok:true,status:200,text:async()=>JSON.stringify(output),json:async()=>output};
};
(async()=>{
  const result=await handler({httpMethod:'POST',headers:{host:'smartgear.website'},body:JSON.stringify({action:'guest-generate',turnstileToken:'a'.repeat(60),brief:{product,industry:'Công nghệ & điện tử',budget:'Trung bình',goal:'Ra mắt sản phẩm mới',budgetAmount:5000000,briefMode:'quick'}})});
  assert.equal(result.statusCode,200,result.body);
  const value=JSON.parse(result.body);
  assert.equal(value.ideas.length,5);
  assert.equal(value.ideas[0].resources.image.url,'https://cdn.example.com/iphone.png');
  assert.equal(value.ideas[4].resources.videos.length,1);
  assert.equal(value.ideas[4].resources.articles.length,1);
  assert.equal(searches,3);
  assert.equal(JSON.stringify(value).includes('local-testing-key-value'),false);
  console.log('PASS backend guest-generate returns 5 campaigns + real indexed source links without exposing key');
})().catch(e=>{console.error(e);process.exitCode=1});
