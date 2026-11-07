'use strict';
const assert=require('node:assert/strict');
const os=require('node:os');const fs=require('node:fs/promises');const path=require('node:path');
const {FreeMediaService,safePixabayPhoto,safePixabayVideo,youtubeResults}=require('../free-media-service.js');
const ideas=[
  {title:'Review trải nghiệm thật',channel:'TikTok',concept:'Review sản phẩm',hook:'Mở hộp'},
  {title:'Hướng dẫn pha trà',channel:'YouTube',concept:'Cách dùng sản phẩm',hook:'Hướng dẫn'},
  {title:'Combo ưu đãi',channel:'Facebook',concept:'Flash sale combo',hook:'Giảm giá'},
  {title:'Phong cách sống',channel:'Instagram',concept:'Lifestyle mỗi sáng',hook:'Thư giãn'},
  {title:'Giới thiệu sản phẩm mới',channel:'Website',concept:'Ra mắt sản phẩm',hook:'Mẫu mới'}
];
const jpeg=Buffer.from('ffd8ff'+('00'.repeat(128)), 'hex');
const makeResponse=(data)=>({ok:true,status:200,json:async()=>data});
const fakeImage=(i)=>({webformatURL:`https://cdn.pixabay.com/photo/2026/11/01/sample${i}.jpg`,pageURL:`https://pixabay.com/photos/tea-${i}/`,tags:'tea green healthy drink',user:'Photographer'});
const fakeVideo=(i)=>({pageURL:`https://pixabay.com/videos/tea-${i}/`,tags:'tea tutorial video'});
const ytId=i=>'YTvideo'+String(i).padStart(4,'0'); // exactly 11 chars
const main=async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'mg-free-test-'));
  let time=Date.parse('2026-11-07T12:00:00Z'),pixCalls=0,ytCalls=0,images=0;
  const calls=[];
  const fetchImpl=async(url,options)=>{
    const u=new URL(url);
    calls.push(u.origin);
    if(u.hostname==='pixabay.com'){
      pixCalls++;
      assert.equal(u.searchParams.get('key'),'pixabay-secret-123456789');
      assert(u.searchParams.get('q'));
      assert.equal(u.searchParams.get('lang'),'vi');
      return makeResponse({hits:u.pathname.includes('/videos')?Array.from({length:12},(_,i)=>fakeVideo(i)):Array.from({length:12},(_,i)=>fakeImage(i))});
    }
    if(u.hostname==='www.googleapis.com'){
      ytCalls++;
      assert.equal(u.pathname,'/youtube/v3/search');
      assert.equal(u.searchParams.get('key'),'youtube-secret-123456789');
      assert.equal(u.searchParams.get('type'),'video');
      return makeResponse({items:Array.from({length:10},(_,i)=>({id:{videoId:ytId(i)},snippet:{title:'Mộc An Trà hướng dẫn review '+i}}))});
    }
    if(u.hostname==='cdn.pixabay.com'){
      images++;
      return {ok:true,headers:{get:name=>name==='content-type'?'image/jpeg':name==='content-length'?String(jpeg.length):null},body:(async function*(){yield jpeg;})()};
    }
    throw Error('unexpected URL '+url);
  };
  const env={PIXABAY_API_KEY:'pixabay-secret-123456789',YOUTUBE_API_KEY:'youtube-secret-123456789',FREE_MEDIA_DAILY_LIMIT:'4',FREE_MEDIA_IP_DAILY_LIMIT:'2'};
  try{
    const svc=new FreeMediaService({env,fetchImpl,now:()=>time,cacheDir:root});
    assert(svc.enabled&&svc.hasPixabay&&svc.hasYoutube);
    assert.equal(safePixabayPhoto(fakeImage(0)).kind,'illustration');
    assert.equal(safePixabayPhoto({...fakeImage(0),webformatURL:'http://127.0.0.1/file.jpg'}),null);
    assert.equal(safePixabayVideo(fakeVideo(0)).source.startsWith('Pixabay'),true);
    assert.equal(safePixabayVideo({pageURL:'https://evil.example/videos/1/'}),null);
    assert.equal(youtubeResults({items:[{id:{videoId:'abcdefghijk'},snippet:{title:'iPhone 17 Pro review'}}]},'iPhone 18 Pro').length,0);
    assert.equal(youtubeResults({items:[{id:{videoId:'abcdefghijk'},snippet:{title:'Mộc An Trà Review'}}]},'Mộc An Trà').length,1);
    const first=svc.issueTicket('1.2.3.4',{product:'Mộc An Trà',industry:'trà thảo mộc'},ideas);
    assert(first.length>15);
    await assert.rejects(svc.search(first,'5.6.7.8'),/hết hạn/);
    const a=await svc.search(first,'1.2.3.4');
    assert.equal(a.campaigns.length,5);
    assert.equal(a.campaigns.filter(i=>i.image).length,5);
    assert.equal(new Set(a.campaigns.map(x=>x.image.url)).size,5);
    assert(a.campaigns.every(x=>x.images[0].proxyUrl.startsWith('/api/free-media/image/')));
    assert(a.campaigns.every(x=>x.videos.some(v=>v.source.startsWith('YouTube'))));
    const photoPath=a.campaigns[0].images[0].proxyUrl.split('/').at(-1);
    assert.equal((await svc.readImage(photoPath)).mime,'image/jpeg');
    assert.equal(await svc.readImage('../secret'),null);
    await assert.rejects(svc.search(first,'1.2.3.4'),/hết hạn/);
    const firstCalls=pixCalls;
    const second=svc.issueTicket('1.2.3.4',{product:'Mộc An Trà',industry:'trà thảo mộc'},ideas);
    await svc.search(second,'1.2.3.4');
    assert.equal(pixCalls,firstCalls,'pixabay should use 24h cache');
    await assert.rejects(svc.search(svc.issueTicket('1.2.3.4',{product:'Mộc An Trà'},ideas),'1.2.3.4'),/hạn mức/);
    // Disk cache should survive restart, and stay valid after 23h.
    const another=new FreeMediaService({env,fetchImpl,now:()=>time+23*3600000,cacheDir:root});
    const cached=await another.pixabay('image','Mộc An Trà review trải nghiệm thực tế');
    assert(cached.length>0);
    assert.equal(pixCalls,firstCalls);
    // Requests after 24h must revalidate the cache.
    const old=await another.pixabay('image','Mộc An Trà review trải nghiệm thực tế');
    assert.equal(old.length,12);
    const newSvc=new FreeMediaService({env,fetchImpl,now:()=>time+25*3600000,cacheDir:root});
    await newSvc.pixabay('image','Mộc An Trà review trải nghiệm thực tế');
    assert.equal(pixCalls,firstCalls+1);
    const failedProvider=new FreeMediaService({env,cacheDir:path.join(root,'errors'),fetchImpl:async (url)=>({ok:false,status:String(url).includes('pixabay')?429:403}),now:()=>time});
    const failedTicket=failedProvider.issueTicket('fail-ip',{product:'Mộc An Trà',industry:'trà'},ideas);
    const failedResult=await failedProvider.search(failedTicket,'fail-ip');
    assert.equal(failedResult.campaigns.length,5,'provider failure cannot erase Gemini campaigns');
    assert.equal(failedResult.campaigns.filter(x=>x.image||x.videos.length).length,0);
    assert(failedResult.warnings.some(x=>x.includes('API key bị từ chối')));
    assert(!JSON.stringify(failedResult).includes(env.YOUTUBE_API_KEY));
    const noKeys=new FreeMediaService({env:{},cacheDir:root});
    assert.equal(noKeys.issueTicket('1.2.3.4',{product:'Test'},ideas),'');
    console.log('Free Media: PASS (5 separate images, Pixabay/YouTube mock, 24h disk cache, local image, quota, IP/ticket security, safety)');
  }finally{await fs.rm(root,{recursive:true,force:true});}
};
main().catch(err=>{console.error(err);process.exitCode=1;});
