'use strict';
// Exercise optional paid image-search path explicitly; production default stays OFF.
process.env.MEDIA_GEMINI_IMAGE_SEARCH='true';
const assert=require('node:assert/strict');
const {collectProductMedia}=require('../netlify/functions/media-research.js');
async function main(){
  const calls=[];
  const fetch=async (url,opts={})=>{
    calls.push(String(url));
    if(String(url).includes('generativelanguage.googleapis.com'))return {ok:true,status:200,json:async()=>({candidates:[{groundingMetadata:{groundingChunks:[]}}]})};
    if(String(url).includes('api.openverse.org'))return {ok:true,status:200,json:async()=>({results:[
      {title:'Son môi màu đỏ đẹp',thumbnail:'https://images.example.org/son-do.jpg',foreign_landing_url:'https://openverse.org/image/a',license:'cc0'},
      {title:'iPhone 15',thumbnail:'https://images.example.org/iphone15.jpg',foreign_landing_url:'https://openverse.org/image/b'}
    ]})};
    if(String(url).includes('commons.wikimedia.org'))return {ok:true,status:200,json:async()=>({query:{pages:{}}})};
    throw Error('Unexpected URL '+url);
  };
  const result=await collectProductMedia('Son môi','gemini-2.5-flash','fake-test-key',{fetch});
  assert.equal(result.image.url,'https://images.example.org/son-do.jpg');
  assert.equal(result.images.length,1);
  assert.equal(result.image.sourceUrl,'https://openverse.org/image/a');
  assert.equal(result.status,'partial');
  assert.equal(calls.length,5);
  console.log('PASS direct product photo fallback via public image search');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
