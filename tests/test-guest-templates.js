'use strict';
const assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/ai.js');
process.env.GUEST_GEMINI_API_KEY='fake-site-owned-key';
process.env.GUEST_GEMINI_MODEL='gemini-2.5-flash';
process.env.TURNSTILE_SITE_KEY='fake-site';
process.env.TURNSTILE_SECRET_KEY='fake-secret';
const goals=['Tăng doanh số bán hàng','Ra mắt sản phẩm mới','Tăng nhận diện thương hiệu','Thu hút khách hàng tiềm năng'];
let paid=0,validated=0;
global.fetch=async (url,options={})=>{
 if(String(url).includes('turnstile'))return {ok:true,json:async()=>({success:true,action:'guest_templates',hostname:'smartgear.website'})};
 paid++;
 const templates=Array.from({length:4},(_,i)=>({title:'Mẫu marketing '+(i+1),description:'Định hướng riêng',industry:'Phụ kiện điện thoại',goal:goals[i],tier:'Thấp',amount:1500000,audience:'Người yêu công nghệ',marketRegion:'Hà Nội',usp:'Cần kiểm chứng vật liệu sản phẩm',targetMetric:'Đăng 8 bài trong 4 tuần',suggestedChannels:['TikTok']}));
 return {ok:true,status:200,text:async()=>JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({templates})}]}}]})};
};
(async()=>{
 const ret=await handler({httpMethod:'POST',headers:{host:'smartgear.website'},body:JSON.stringify({action:'guest-templates',product:'Ốp lưng iPhone',turnstileToken:'g'.repeat(50)}),beforeGuestGemini:()=>{validated++;}});
 const data=JSON.parse(ret.body);
 assert.equal(ret.statusCode,200,JSON.stringify(data));
 assert.equal(data.templates.length,4);assert.equal(data.templates[0].industry,'Phụ kiện điện thoại');
 assert.equal(paid,1);assert.equal(validated,1);
 console.log('PASS guest template AI with Turnstile and owner-managed Gemini');
})().catch(e=>{console.error(e);process.exitCode=1});
