'use strict';
const assert=require('node:assert/strict');
const {collectProductMedia,extractTextUrls,verifiedArticleFromText}=require('../netlify/functions/media-research.js');
process.env.MEDIA_GEMINI_IMAGE_SEARCH='false';
(async()=>{
  const product='Mộc An Trà';
  const goodArticle='https://example.com/moc-an-tra-review';
  const badArticle='https://example.com/samsung-other';
  const html=(title)=>`<html><head><meta property="og:title" content="${title}"><meta property="og:image" content="https://cdn.example.org/moc-an-tra.webp"></head><body></body></html>`;
  const mockFetch=async (url,opts={})=>{
    if(String(url).includes('generativelanguage.googleapis.com'))return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:`Có bài viết: ${goodArticle} và ${badArticle}`}]},groundingMetadata:{groundingChunks:[]}}]})};
    if(url===goodArticle||url===badArticle)return {ok:true,status:200,headers:{get:k=>k==='content-type'?'text/html':null},text:async()=>html(url===goodArticle?'Mộc An Trà trà thảo mộc':'Samsung Galaxy S26')};
    if(String(url).includes('api.openverse.org'))return {ok:true,json:async()=>({results:[]})};
    if(String(url).includes('commons.wikimedia.org'))return {ok:true,json:async()=>({query:{pages:{}}})};
    throw new Error('Unexpected '+url);
  };
  const options={fetch:mockFetch,dnsLookup:async()=>[{address:'1.1.1.1'}]};
  const data=await collectProductMedia(product,'gemini-2.5-flash','fake-key',options);
  assert.equal(data.articles.length,1);
  assert.equal(data.articles[0].url,goodArticle);
  assert.equal(data.image.url,'https://cdn.example.org/moc-an-tra.webp');
  assert.equal(data.image.sourceUrl,goodArticle);
  assert.equal(extractTextUrls('https://example.com/a. https://example.com/b), https://127.0.0.1/x').length,2);
  const blocked=await verifiedArticleFromText('https://example.com/private',product,mockFetch,{dnsLookup:async()=>[{address:'127.0.0.1'}]});
  assert.equal(blocked,null);
  console.log('PASS verified content link fallback, matched OG photo, rejected mismatched product and SSRF');
})().catch(e=>{console.error(e);process.exitCode=1});
