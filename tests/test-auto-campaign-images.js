'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {collectCampaignMedia,campaignAngle}=require('../netlify/functions/media-research.js');
const product='Mộc An Trà';
const ideas=[
  {title:'Mở hộp cùng KOC',concept:'Video review và trải nghiệm thật',channel:'TikTok'},
  {title:'Hướng dẫn pha trà',concept:'Tips cách sử dụng và cách pha',channel:'Facebook'},
  {title:'Combo ngày hội',concept:'Ưu đãi flash sale cuối tuần',channel:'Shopee'},
  {title:'Trà mỗi sáng',concept:'Thói quen, phong cách sống',channel:'Instagram'},
  {title:'Công bố mẫu mới',concept:'Ra mắt dòng mới, giới thiệu chi tiết',channel:'Website'}
];
assert.deepEqual(ideas.map(x=>campaignAngle(x).name),['review','howto','promotion','lifestyle','launch']);
const angles=['review','howto','promotion','lifestyle','launch'];
const keywords=['trải nghiệm','hướng dẫn','ưu đãi','phong cách','giới thiệu'];
function image(i){return {imageUrl:`https://cdn.example.com/mocan-${i}.jpg`,link:`https://shop.example.com/${i}`,title:`Mộc An Trà ${keywords[i]} ảnh chiến dịch`};}
const fetch=async (url,opts={})=>{
  const str=String(url);
  if(str==='https://google.serper.dev/images'){
    const q=JSON.parse(opts.body).q;
    const i=keywords.findIndex(k=>q.includes(k));
    return {ok:true,json:async()=>({images:i<0?[]:[image(i),{imageUrl:'https://cdn.example.com/wrong-model.jpg',link:'https://example.com/wrong',title:'Samsung Galaxy 99'}]})};
  }
  if(str.includes('openverse.org'))return {ok:true,json:async()=>({results:[]})};
  if(str.includes('commons.wikimedia.org'))return {ok:true,json:async()=>({query:{pages:{}}})};
  throw Error('unexpected URL '+str);
};
(async()=>{
  const base={status:'partial',videos:[{url:'https://tiktok.com/@x/video/7481234567890123456',title:'Review'}],images:[],articles:[]};
  const result=await collectCampaignMedia(product,ideas,base,{fetch,imageSearchKey:'test-provider-key'});
  assert.equal(result.length,5);
  assert.deepEqual(result.map(r=>r.image.url),angles.map((_,i)=>image(i).imageUrl));
  assert.equal(new Set(result.map(r=>r.image.url)).size,5,'same photo must not appear on two campaigns');
  assert.equal(result[4].imageApproach,'launch');
  assert.equal(result[2].images.length,1);
  assert.equal(result[0].videos.length,1,'product sources preserved');
  // No provider coverage: only 1 trusted product photo. Never duplicate it.
  const emptyFetch=async(url)=>String(url).includes('openverse.org')?
    {ok:true,json:async()=>({results:[]})}:
    {ok:true,json:async()=>({query:{pages:{}}})};
  const one=await collectCampaignMedia(product,ideas,{...base,images:[{url:'https://cdn.example.com/only.jpg',sourceUrl:'https://shop.example.com/item',sourceTitle:'Mộc An Trà'}]},
    {fetch:emptyFetch,imageSearchKey:''});
  assert.equal(one.filter(x=>Boolean(x.image)).length,1);
  assert.ok(one.slice(1).every(x=>x.image===null&&x.images.length===0));
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  const studio=fs.readFileSync(path.join(__dirname,'..','studio.js'),'utf8');
  const backend=fs.readFileSync(path.join(__dirname,'..','netlify/functions/ai.js'),'utf8');
  assert.ok(!html.includes('Phần trăm dựa trên thời gian chờ'));
  assert.ok(!studio.includes('Phần trăm dựa trên thời gian chờ'));
  assert.ok(!studio.includes('Ước tính theo thời gian; máy chủ AI'));
  assert.ok(!studio.includes('data-action="media-edit" data-id="${safe(idea.id)}"'), 'manual edit CTA removed');
  assert.match(studio,/clean\.resources=clone\(idea\.resources\)/,'each idea must retain its image in browser history');
  assert.match(backend,/collectCampaignMedia\(brief\.product,result\.ideas,resources\)/);
  console.log('PASS 4.9: 5 separate campaign images, product relevance, no duplicates, honest fallback, history and progress copy');
})().catch(e=>{console.error(e);process.exitCode=1});
