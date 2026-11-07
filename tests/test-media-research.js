'use strict';
// Exercise optional paid image-search path explicitly; production default stays OFF.
process.env.MEDIA_GEMINI_IMAGE_SEARCH='true';
const assert=require('node:assert/strict');
const {collectProductMedia,emptyResources,relevant,safeHttpsUrl,extractImageFromHtml}=require('../netlify/functions/media-research.js');
async function run(){
  assert.equal(relevant('iPhone 18 Pro Max 256GB','iPhone 18 Pro Max - đánh giá'),true);
  assert.equal(relevant('iPhone 18 Pro Max','Samsung S25 Ultra - đánh giá'),false);
  assert.equal(safeHttpsUrl('http://localhost:3000/pic.png'),'');
  assert.equal(safeHttpsUrl('https://example.com/pic.png'),'https://example.com/pic.png');
  assert.equal(extractImageFromHtml('<meta property="og:image" content="https://img.example.com/a&amp;b.jpg">','https://example.com'),'https://img.example.com/a&b.jpg');
  const calls=[];
  const fetch=async (url,opts)=>{
    calls.push(url);
    const isVideo=opts.body.includes('video TikTok');
    return {ok:true,status:200,json:async()=>({candidates:[{groundingMetadata:{groundingChunks:isVideo?[
      {web:{uri:'https://www.tiktok.com/@reviewer/video/7481234567890123456',title:'iPhone 18 Pro Max TikTok review'}}]:[
      {image:{imageUri:'https://img.example.com/iphone.jpg',sourceUri:'https://example.com/iphone-product',title:'iPhone 18 Pro Max 256GB'}},
      {web:{uri:'https://www.theverge.com/2026/11/07/iphone-18-pro-max',title:'iPhone 18 Pro Max Review - The Verge'}},
      {web:{uri:'http://127.0.0.1/private',title:'iPhone 18 Pro Max hacked source'}},
      {web:{uri:'https://www.theverge.com/unrelated',title:'Review of Samsung tablet'}}
    ],searchEntryPoint:{renderedContent:'<div>Search</div>'}}}]})};
  };
  const result=await collectProductMedia('iPhone 18 Pro Max 256GB','gemini-2.5-flash','secret',{fetch});
  assert.equal(result.articles.length,1);
  assert.equal(result.videos.length,1);
  assert.ok(result.image.url.includes('iphone.jpg'));
  assert.equal(result.videos[0].url,'https://www.tiktok.com/@reviewer/video/7481234567890123456');
  assert.match(result.videos[0].verification,/chưa xác minh/);
  assert.equal(calls.length,4);
  const none=await collectProductMedia('đồ dùng tùy biến','gemini-2.5-flash','secret',{fetch:async()=>{throw Error('network error');}});
  assert.equal(none.articles.length,0);assert.equal(none.videos.length,0);assert.ok(none.searchLinks.imageSearch);
  console.log('PASS media source normalization, non-fabrication and fallback');
}
run().catch(err=>{console.error(err);process.exitCode=1;});
