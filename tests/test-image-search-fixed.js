'use strict';
// Exercise optional paid image-search path explicitly; production default stays OFF.
process.env.MEDIA_GEMINI_IMAGE_SEARCH='true';
const assert=require('node:assert/strict');
const {collectProductMedia,extractImageFromHtml,followGroundedRedirect}=require('../netlify/functions/media-research.js');
const {signImageUrl,verifiedUrl,imageResponse}=require('../image-proxy.js');
async function run(){
  const product='iPhone 18 Pro Max 256GB';
  const queries=[];
  const imageUrl='https://images.apple-example.com/18pro-max-256.jpg';
  const pageUrl='https://www.apple-example.com/vn/iphone18-promax';
  const mockFetch=async (url,opts={})=>{
    queries.push(String(url));
    if(String(url).includes('generativelanguage.googleapis.com')){
      const body=JSON.parse(opts.body);
      if(body.tools?.[0]?.google_search?.searchTypes?.imageSearch)return {ok:true,json:async()=>({candidates:[{groundingMetadata:{groundingChunks:[{image:{imageUri:imageUrl,sourceUri:pageUrl,title:product}}]}}]})};
      return {ok:true,json:async()=>({candidates:[{groundingMetadata:{groundingChunks:[]}}]})};
    }
    if(String(url).includes('openverse.org'))return {ok:true,json:async()=>({results:[]})};
    if(String(url).includes('wikimedia.org'))return {ok:true,json:async()=>({query:{pages:{}}})};
    throw new Error('Unexpected '+url);
  };
  const results=await collectProductMedia(product,'gemini-2.5-flash','dummy-server-key',{fetch:mockFetch});
  assert.equal(results.image.url,imageUrl);
  assert.equal(results.image.sourceUrl,pageUrl);
  assert.equal(results.images.length,1);
  assert.equal(results.diagnostic.groundingImageCount,1);
  assert.ok(queries.some(x=>x.includes('gemini-3.1-flash-image')));
  const imageHtml='<html><head><meta content="https://cdn.apple-example.com/img/a&amp;b.jpg" property="og:image" /></head></html>';
  assert.equal(extractImageFromHtml(imageHtml,pageUrl),'https://cdn.apple-example.com/img/a&b.jpg');
  const productHtml='<html><script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:product,image:['https://cdn.apple-example.com/iphone18.png']})+'</script></html>';
  assert.equal(extractImageFromHtml(productHtml,pageUrl,product),'https://cdn.apple-example.com/iphone18.png');
  const htmlImg='<img alt="iPhone 18 Pro Max 256GB black" src="https://cdn.apple-example.com/iphone18-black.webp">';
  assert.equal(extractImageFromHtml(htmlImg,pageUrl,product),'https://cdn.apple-example.com/iphone18-black.webp');
  const link=signImageUrl('https://cdn.apple.com/a.jpg');
  assert.ok(link.startsWith('/api/image?'));
  assert.equal(verifiedUrl(new URL(link,'https://smartgear.website').searchParams),'https://cdn.apple.com/a.jpg');
  assert.equal(signImageUrl('http://127.0.0.1/private'),'');
  assert.equal(verifiedUrl(new URL(link.replace('s=','s=000'),'https://smartgear.website').searchParams),'');
  const img=Buffer.from([255,216,255,217]);
  const direct=await imageResponse(link,{lookup:async()=>[{address:'8.8.8.8'}],fetch:async()=>({ok:true,status:200,headers:new Map([['content-type','image/jpeg'],['content-length','4']]),body:(async function*(){yield img;})()})});
  assert.equal(direct.status,200);
  assert.deepEqual(direct.buffer,img);
  const block=await imageResponse(link,{lookup:async()=>[{address:'127.0.0.1'}],fetch:async()=>{throw Error('should not fetch')}});
  assert.equal(block.status,403);
  console.log('PASS dedicated image grounding, image extraction, signed same-origin image and SSRF protection');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
