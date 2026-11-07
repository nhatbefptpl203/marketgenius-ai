'use strict';
/**
 * MarketGenius AI free media sources: Pixabay photo/video + YouTube video search.
 * Server-side credentials only. Search requests require a one-use, short-lived
 * ticket issued after a successful Gemini generation, with IP/day caps.
 * Pixabay JSON is cached persistently for 24h; selected photo bytes are stored
 * locally (Pixabay does not allow permanent CDN image hotlinking).
 */
const crypto=require('node:crypto');
const fs=require('node:fs/promises');
const path=require('node:path');
const {campaignAngle,relevant}=require('./netlify/functions/media-research.js');
const {CampaignSourceProviders}=require('./media-source-providers.js');
const {signImageUrl}=require('./image-proxy.js');
const rnd=()=>crypto.randomBytes(24).toString('base64url');
const clamp=(value,def,min,max)=>Number.isInteger(Number(value))&&Number(value)>=min&&Number(value)<=max?Number(value):def;
const txt=(x,n=140)=>String(x??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const digest=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const cleanQuery=s=>txt(s,100).replace(/["<>\\]/g,'').trim();
const hostIs=(host,suffix)=>host===suffix||host.endsWith('.'+suffix);
const videoId=id=>/^[A-Za-z0-9_-]{11}$/.test(String(id||''));
function safePixabayPhoto(item){
  try{
    const image=new URL(item?.webformatURL||'');const page=new URL(item?.pageURL||'');
    if(image.protocol!=='https:'||image.port||!((hostIs(image.hostname,'cdn.pixabay.com')&&image.pathname.match(/\.(?:jpe?g|png|webp)$/i))||(image.hostname==='pixabay.com'&&image.pathname.startsWith('/get/'))))return null;
    if(page.protocol!=='https:'||page.port||!hostIs(page.hostname,'pixabay.com'))return null;
    return {url:image.href,sourceUrl:page.href,sourceTitle:txt(item.tags||'Hình ảnh Pixabay'),user:txt(item.user||'',65),kind:'illustration'};
  }catch{return null;}
}
function safePixabayVideo(item){
  try{
    const page=new URL(item?.pageURL||'');
    if(page.protocol!=='https:'||page.port||!hostIs(page.hostname,'pixabay.com')||!page.pathname.startsWith('/videos/'))return null;
    return {url:page.href,title:'Video minh họa · '+txt(item.tags||'Pixabay',92),source:'Pixabay · video tư liệu',verification:'Nguồn Pixabay · kiểm tra nội dung trước khi sử dụng'};
  }catch{return null;}
}
function youtubeResults(data,product){
  return (Array.isArray(data?.items)?data.items:[]).flatMap(x=>{
    const id=x?.id?.videoId,title=txt(x?.snippet?.title,180);
    if(!videoId(id)||!title||!relevant(product,title))return [];
    return [{url:`https://www.youtube.com/watch?v=${id}`,title,source:'YouTube · video công khai',verification:'Liên kết tham khảo, không cấp quyền tái sử dụng video'}];
  });
}
class FreeMediaService{
  constructor(options={}){
    this.env=options.env||process.env;
    this.fetchImpl=options.fetchImpl||((...a)=>globalThis.fetch(...a));
    this.now=options.now||(()=>Date.now());
    this.cacheDir=options.cacheDir||path.join(__dirname,'.media-cache');
    this.tickets=new Map();this.hits=new Map();this.day='';this.count=0;this.active=0;
    this.inflight=new Map();this.youtubeCache=new Map();
    this.extra=new CampaignSourceProviders({env:this.env,fetchImpl:this.fetchImpl,now:this.now,cacheDir:this.cacheDir});
  }
  get hasPixabay(){return txt(this.env.PIXABAY_API_KEY,160).length>=8;}
  get hasYoutube(){return txt(this.env.YOUTUBE_API_KEY,160).length>=8;}
  get enabled(){return this.env.FREE_MEDIA_ENABLED!=='false'&&(this.hasPixabay||this.hasYoutube||this.extra.googleEnabled||this.extra.pinterestEnabled);}
  providerStatus(){return {pixabay:{configured:this.hasPixabay},youtube:{configured:this.hasYoutube},...this.extra.status(),enabled:this.enabled};}
  fail(message,status=400){const e=new Error(message);e.statusCode=status;return e;}
  cleanup(){
    const n=this.now();for(const [key,t] of this.tickets)if(t.expires<n)this.tickets.delete(key);
    const day=new Date(n).toISOString().slice(0,10);
    if(day!==this.day){this.day=day;this.hits.clear();this.count=0;}
    if(this.youtubeCache.size>150)for(const [key,v] of this.youtubeCache)if(n-v.time>20*60*1000)this.youtubeCache.delete(key);
  }
  issueTicket(ip,brief,ideas){
    if(!this.enabled||!Array.isArray(ideas)||ideas.length!==5)return '';
    this.cleanup();
    const token=rnd();
    this.tickets.set(token,{ip,product:txt(brief?.product,100),industry:txt(brief?.industry,100),
      ideas:ideas.map(x=>({title:txt(x.title),channel:txt(x.channel),concept:txt(x.concept,350),hook:txt(x.hook,200)})),
      expires:this.now()+10*60*1000});
    return token;
  }
  async request(url,timeout=7000){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const r=await this.fetchImpl(url,{method:'GET',signal:controller.signal,redirect:'error',headers:{Accept:'application/json'}});
      if(!r.ok)throw this.fail(r.status===429?'đã đạt giới hạn lượt gọi':r.status===401||r.status===403?'API key bị từ chối (401/403)':`máy chủ phản hồi HTTP ${r.status}`,r.status===429?429:502);
      return await r.json();
    }finally{clearTimeout(timer);}
  }
  cachePath(kind,query){return path.join(this.cacheDir,'pixabay',digest(`${kind}|${query.toLowerCase()}`)+'.json');}
  async pixabay(kind,q){
    if(!this.hasPixabay||!q)return [];
    const query=cleanQuery(q);if(!query)return [];
    const cacheKey=`${kind}:${query.toLowerCase()}`;
    if(this.inflight.has(cacheKey))return this.inflight.get(cacheKey);
    const task=(async()=>{
      const file=this.cachePath(kind,query);
      try{
        const cached=JSON.parse(await fs.readFile(file,'utf8'));
        if(this.now()-cached.at<86400000&&this.now()>=cached.at&&Array.isArray(cached.items))return cached.items;
      }catch{}
      // A writable disk cache is mandatory for Pixabay API use.
      await fs.mkdir(path.dirname(file),{recursive:true});
      await fs.access(path.dirname(file),require('node:fs').constants.W_OK);
      const base=kind==='video'?'https://pixabay.com/api/videos/':'https://pixabay.com/api/';
      const u=new URL(base);
      u.searchParams.set('key',this.env.PIXABAY_API_KEY);
      u.searchParams.set('q',query);
      u.searchParams.set('lang','vi');u.searchParams.set('per_page','20');u.searchParams.set('safesearch','true');
      const data=await this.request(u.toString(),7000);
      const items=(Array.isArray(data?.hits)?data.hits:[]).map(kind==='video'?safePixabayVideo:safePixabayPhoto).filter(Boolean).slice(0,20);
      const tmp=file+'.'+rnd().slice(0,10)+'.tmp';
      await fs.writeFile(tmp,JSON.stringify({at:this.now(),items}),{mode:0o600});
      await fs.rename(tmp,file);
      return items;
    })();
    this.inflight.set(cacheKey,task);
    try{return await task;}finally{this.inflight.delete(cacheKey);}
  }
  async youtube(product,angle){
    if(!this.hasYoutube)return [];
    const q=cleanQuery(`${product} ${angle.name==='howto'?'hướng dẫn':angle.name==='review'?'review':angle.name==='compare'?'so sánh':angle.name==='promotion'?'ưu đãi':angle.name==='launch'?'giới thiệu':'trải nghiệm'}`);
    if(!q)return [];
    const hit=this.youtubeCache.get(q);
    if(hit&&this.now()-hit.time<20*60*1000)return hit.items;
    const url=new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('key',this.env.YOUTUBE_API_KEY);
    url.searchParams.set('part','snippet');url.searchParams.set('type','video');url.searchParams.set('q',q);
    url.searchParams.set('maxResults','10');url.searchParams.set('relevanceLanguage','vi');url.searchParams.set('safeSearch','moderate');
    const data=await this.request(url.toString(),8000);
    const items=youtubeResults(data,product);
    this.youtubeCache.set(q,{time:this.now(),items});
    return items;
  }
  async persistPhoto(img){
    const hash=digest(img.url),dir=path.join(this.cacheDir,'images');
    await fs.mkdir(dir,{recursive:true});
    const target=path.join(dir,hash);
    try{const st=await fs.stat(target);if(st.size>0&&st.size<=2500000)return {...img,proxyUrl:'/api/free-media/image/'+hash};}catch{}
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6500);
    try{
      const response=await this.fetchImpl(img.url,{method:'GET',redirect:'error',signal:ctrl.signal,
        headers:{Accept:'image/jpeg,image/png,image/webp'}});
      const mime=(response.headers?.get?.('content-type')||'').split(';')[0].toLowerCase();
      if(!response.ok||!['image/jpeg','image/png','image/webp'].includes(mime)||Number(response.headers.get('content-length'))>2500000)return null;
      const parts=[];let count=0;
      for await (const part of response.body){count+=part.length;if(count>2500000)return null;parts.push(Buffer.from(part));}
      const bytes=Buffer.concat(parts);
      // Basic magic number check to reject HTML or spoofed file types.
      const actual=bytes.subarray(0,3).toString('hex')==='ffd8ff'?'image/jpeg':bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))?'image/png':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'image/webp':'';
      if(!actual||actual!==mime)return null;
      // Protect small shared hosting accounts from unbounded media storage.
      const maxBytes=clamp(this.env.FREE_MEDIA_IMAGE_CACHE_MB,150,20,2000)*1024*1024;
      let used=0;
      for(const file of await fs.readdir(dir)){
        if(!/^[a-f0-9]{64}$/.test(file))continue;
        try{used+=(await fs.stat(path.join(dir,file))).size;}catch{}
        if(used+bytes.length>maxBytes)return null;
      }
      const tmp=target+'.'+rnd().slice(0,10)+'.tmp';
      await fs.writeFile(tmp,bytes,{mode:0o644});await fs.rename(tmp,target);
      return {...img,proxyUrl:'/api/free-media/image/'+hash};
    }catch{return null;}finally{clearTimeout(timer);}
  }
  async readImage(hash){
    if(!/^[a-f0-9]{64}$/.test(hash))return null;
    try{
      const bytes=await fs.readFile(path.join(this.cacheDir,'images',hash));
      if(!bytes.length||bytes.length>2500000)return null;
      const mime=bytes.subarray(0,3).toString('hex')==='ffd8ff'?'image/jpeg':bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))?'image/png':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'image/webp':'';
      return mime?{bytes,mime}:null;
    }catch{return null;}
  }
  async search(ticket,ip){
    this.cleanup();if(!this.enabled)throw this.fail('Chưa cấu hình Pixabay API hoặc YouTube Data API.',503);
    const job=this.tickets.get(ticket);
    if(!job||job.ip!==ip||job.expires<this.now())throw this.fail('Phiên tìm nguồn đã hết hạn; hãy tạo chiến dịch AI mới.',403);
    if(this.count>=clamp(this.env.FREE_MEDIA_DAILY_LIMIT,15,1,500) || (this.hits.get(ip)||0)>=clamp(this.env.FREE_MEDIA_IP_DAILY_LIMIT,3,1,100))throw this.fail('Đã đạt hạn mức tìm nguồn trong ngày.',429);
    if(this.active>=clamp(this.env.FREE_MEDIA_CONCURRENCY,1,1,4))throw this.fail('Đang có lượt tìm nguồn khác. Vui lòng thử lại sau.',429);
    this.tickets.delete(ticket);this.count++;this.hits.set(ip,(this.hits.get(ip)||0)+1);this.active++;
    try{
      // Search all campaign angles concurrently. A sequential provider loop could
      // exceed the shared-host reverse proxy timeout and leave the UI waiting.
      const warnings=new Set();
      const safely=async (provider,operation)=>{
        try{return await operation();}catch(e){
          const msg=e?.name==='AbortError'?'kết nối quá thời gian':String(e?.message||'không kết nối được').slice(0,100);
          warnings.add(provider+': '+msg);return [];
        }
      };
      const found=await Promise.all(job.ideas.map(async idea=>{
        const angle=campaignAngle(idea),product=job.product,category=job.industry||product;
        const googleQuery=cleanQuery(`${product} ${angle.query}`);
        const imageTerms=cleanQuery(`${product} ${angle.query}`);
        const videoTerms=cleanQuery(`${product} ${angle.name}`);
        const [google,pinterest,photos,stockVideos,youtube]=await Promise.all([
          this.extra.googleEnabled?safely('Google Images',()=>this.extra.google(product,googleQuery)):Promise.resolve([]),
          this.extra.pinterestEnabled?safely('Pinterest',()=>this.extra.pinterest(product,product)):Promise.resolve([]),
          this.hasPixabay?safely('Pixabay ảnh',()=>this.pixabay('image',imageTerms)):Promise.resolve([]),
          this.hasPixabay?safely('Pixabay video',()=>this.pixabay('video',videoTerms)):Promise.resolve([]),
          this.hasYoutube?safely('YouTube',()=>this.youtube(product,angle)):Promise.resolve([])
        ]);
        if(this.hasPixabay&&!photos.length)photos.push(...await safely('Pixabay ảnh',()=>this.pixabay('image',category)));
        if(this.hasPixabay&&!stockVideos.length)stockVideos.push(...await safely('Pixabay video',()=>this.pixabay('video',category)));
        return {images:[...google,...pinterest,...photos],stockVideos,youtube};
      }));
      const usedImages=new Set(),usedVideos=new Set();
      // Fair round-robin allocation so 5 campaigns each receive an independent
      // primary image/video before extra suggestions consume the shared pool.
      const selected=found.map(()=>({images:[],videos:[]}));
      for(let pass=0;pass<3;pass++)for(let i=0;i<found.length;i++){
        const next=found[i].images.find(img=>!usedImages.has(img.url));
        if(next){usedImages.add(next.url);selected[i].images.push(next);}
      }
      for(let pass=0;pass<3;pass++)for(let i=0;i<found.length;i++){
        const next=[...found[i].youtube,...found[i].stockVideos].find(v=>!usedVideos.has(v.url));
        if(next){usedVideos.add(next.url);selected[i].videos.push(next);}
      }
      const result=await Promise.all(selected.map(async ({images,videos})=>{
        const resource={image:null,images:[],videos,articles:[]};
        for(const img of images){
          if(img.provider==='Google Images / Serper'||img.provider==='Pinterest'){
            const proxyUrl=signImageUrl(img.url);
            if(proxyUrl)resource.images.push({...img,proxyUrl});
          }else{
            const stored=await this.persistPhoto(img);
            if(stored)resource.images.push({...stored,label:txt('Ảnh minh họa · Pixabay'+(stored.user?' · '+stored.user:''),120),license:'Pixabay Content License'});
          }
        }
        resource.image=resource.images[0]||null;
        return resource;
      }));
      return {campaigns:result,providers:{pixabay:this.hasPixabay,youtube:this.hasYoutube,google:this.extra.googleEnabled,pinterest:this.extra.pinterestEnabled},warnings:[...warnings].slice(0,6)};
    }finally{this.active=Math.max(0,this.active-1);}
  }
}
module.exports={FreeMediaService,safePixabayPhoto,safePixabayVideo,youtubeResults};
