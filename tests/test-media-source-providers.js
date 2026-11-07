'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');
const {CampaignSourceProviders,safeGoogleImage,safePinterestPin}=require('../media-source-providers.js');
const {FreeMediaService}=require('../free-media-service.js');
const ideas=[
  {title:'Đánh giá',concept:'Review thực tế',channel:'YouTube',hook:'Review'},
  {title:'Cách sử dụng',concept:'Hướng dẫn',channel:'TikTok',hook:'Tips'},
  {title:'Ưu đãi',concept:'Khuyến mại',channel:'Facebook',hook:'Giảm giá'},
  {title:'Thương hiệu',concept:'Lifestyle',channel:'Instagram',hook:'Phong cách'},
  {title:'So sánh',concept:'So sánh mẫu',channel:'Website',hook:'Đối chiếu'}
];
(async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mg-multisrc-'));
  let countGoogle=0,countPinterest=0;
  const images=Array.from({length:20},(_,i)=>({
    title:`iPhone 18 Pro Max - ảnh đúng mẫu ${i}`,
    imageUrl:`https://example-media.com/products/iphone18-${i}.jpg`,
    link:`https://example-store.com/iphone18/${i}`,source:'Cửa hàng'
  }));
  const pin={id:'123456789012345',title:'iPhone 18 Pro Max trải nghiệm',media:{media_type:'image',images:{'600x':{url:'https://i.pinimg.com/600x/abc.jpg'}}}};
  const fetchImpl=async(url,opts={})=>{
    const u=new URL(url);
    if(u.hostname==='google.serper.dev'){
      countGoogle++;assert.equal(u.pathname,'/images');assert.equal(opts.method,'POST');
      assert.equal(opts.headers['X-API-KEY'],'serper-example-secret');
      const body=JSON.parse(opts.body);assert(body.q.includes('iPhone 18 Pro Max'));
      return {ok:true,status:200,json:async()=>({images})};
    }
    if(u.hostname==='api.pinterest.com'){
      countPinterest++;assert.equal(u.pathname,'/v5/search/pins');
      assert.equal(opts.headers.Authorization,'Bearer pinterest-user-oauth-token');
      return {ok:true,status:200,json:async()=>({items:[pin]})};
    }
    throw Error('Unexpected URL '+url);
  };
  const env={GOOGLE_IMAGES_ENABLED:'true',SERPER_API_KEY:'serper-example-secret',
    PINTEREST_ENABLED:'true',PINTEREST_ACCESS_TOKEN:'pinterest-user-oauth-token'};
  try{
    const c=new CampaignSourceProviders({env,fetchImpl,cacheDir:dir});
    assert(c.googleEnabled&&c.pinterestEnabled);
    assert.equal(safeGoogleImage(images[0],'iPhone 18 Pro Max').provider,'Google Images / Serper');
    assert.equal(safeGoogleImage({...images[0],imageUrl:'http://localhost/private'},'iPhone 18 Pro Max'),null);
    assert.equal(safeGoogleImage({...images[0],title:'iPhone 17 Pro Max'},'iPhone 18 Pro Max'),null);
    assert.equal(safePinterestPin(pin,'iPhone 18 Pro Max').provider,'Pinterest');
    assert.equal(safePinterestPin({...pin,id:'wrong'},'iPhone 18 Pro Max'),null);
    assert.equal(safePinterestPin({...pin,media:{...pin.media,images:{'600x':{url:'http://10.0.0.1/secret.jpg'}}}},'iPhone 18 Pro Max'),null);
    const g=await c.google('iPhone 18 Pro Max','iPhone 18 Pro Max review');
    assert.equal(g.length,12);
    const p=await c.pinterest('iPhone 18 Pro Max','iPhone 18 Pro Max');assert.equal(p.length,1);
    await c.google('iPhone 18 Pro Max','iPhone 18 Pro Max review');
    await c.pinterest('iPhone 18 Pro Max','iPhone 18 Pro Max');
    assert.equal(countGoogle,1);assert.equal(countPinterest,1);
    const restarted=new CampaignSourceProviders({env,fetchImpl,cacheDir:dir});
    await restarted.google('iPhone 18 Pro Max','iPhone 18 Pro Max review');
    assert.equal(countGoogle,1,'on-disk cache survives restart');
    const svc=new FreeMediaService({env,fetchImpl,cacheDir:dir});
    assert(svc.enabled,'google and pinterest alone should enable search');
    const ticket=svc.issueTicket('198.51.100.5',{product:'iPhone 18 Pro Max',industry:'công nghệ'},ideas);
    const result=await svc.search(ticket,'198.51.100.5');
    assert.equal(result.campaigns.length,5);
    assert(result.campaigns.every(c=>c.image && c.images.length>=1 && c.image.proxyUrl.startsWith('/api/image?u=')));
    assert.equal(new Set(result.campaigns.map(x=>x.image.url)).size,5);
    assert(result.campaigns.every(x=>x.images.every(img=>img.license!=='Được phép sử dụng thương mại')));
    assert.equal(result.providers.google,true);assert.equal(result.providers.pinterest,true);
    assert(!JSON.stringify(result).includes(env.SERPER_API_KEY));
    assert(!JSON.stringify(result).includes(env.PINTEREST_ACCESS_TOKEN));
    const none=new FreeMediaService({env:{},cacheDir:dir});
    assert.equal(none.enabled,false);
    console.log('Multi-source 5.3 PASS: Serper Google Images, authorized Pinterest pins, cache, product matching, secure signed proxy, per-campaign fair allocation');
  }finally{await fs.rm(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
