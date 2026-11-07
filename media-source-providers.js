'use strict';
/**
 * Read-only Google Images search via Serper and read-only Pinterest USER pins.
 * API keys/tokens stay exclusively in server environment variables. Never
 * fetch arbitrary result image URLs here; server's signed proxy handles display.
 */
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {safeHttpsUrl,relevant}=require('./netlify/functions/media-research.js');
const clean=s=>String(s??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
const hash=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const domain=(url,suffix)=>{try{const x=new URL(url);return x.hostname===suffix||x.hostname.endsWith('.'+suffix);}catch{return false;}};
function safeGoogleImage(item,product){
  const url=safeHttpsUrl(item?.imageUrl),page=safeHttpsUrl(item?.link);
  const title=clean(item?.title).slice(0,180);
  if(!url||!page||!title||!relevant(product,title))return null;
  // Do not confuse a link from Google search with a license to redistribute.
  return {url,sourceUrl:page,sourceTitle:title,label:'Ảnh tìm qua Google Images · '+clean(item.source||'nguồn ngoài').slice(0,60),
    license:'Chưa xác minh quyền sử dụng',kind:'product-reference',provider:'Google Images / Serper'};
}
function safePinterestPin(pin,product){
  const id=String(pin?.id||'');
  const media=pin?.media;
  const url=safeHttpsUrl(media?.images?.['600x']?.url||media?.images?.['400x300']?.url||media?.images?.['1200x']?.url);
  const title=clean([pin?.title,pin?.alt_text,pin?.description].filter(Boolean).join(' ')).slice(0,250);
  if(!/^\d{6,25}$/.test(id)||media?.media_type!=='image'||!url||!domain(url,'pinimg.com')||!relevant(product,title))return null;
  return {url,sourceUrl:`https://www.pinterest.com/pin/${id}/`,sourceTitle:title,
    label:'Pinterest · Pin được cấp quyền',license:'Chưa xác minh quyền thương mại',kind:'inspiration',provider:'Pinterest'};
}
class CampaignSourceProviders{
  constructor({env=process.env,fetchImpl=(...args)=>globalThis.fetch(...args),now=()=>Date.now(),cacheDir=path.join(__dirname,'.media-cache')}={}){
    this.env=env;this.fetchImpl=fetchImpl;this.now=now;this.cacheDir=cacheDir;this.inflight=new Map();
  }
  get googleEnabled(){return this.env.GOOGLE_IMAGES_ENABLED!=='false' && clean(this.env.SERPER_API_KEY).length>=8;}
  get pinterestEnabled(){return this.env.PINTEREST_ENABLED!=='false' && clean(this.env.PINTEREST_ACCESS_TOKEN).length>=12;}
  status(){return {google:{configured:this.googleEnabled,service:'Serper Google Images',scope:'Ảnh từ Google; cần kiểm tra quyền sử dụng'},
    pinterest:{configured:this.pinterestEnabled,service:'Pinterest API v5',scope:'Chỉ tìm các Pin tài khoản/token được cấp quyền'},
    configuredOnly:true};}
  async cached(provider,query,ttl,operation){
    const key=provider+'|'+query.toLowerCase(),file=path.join(this.cacheDir,'sources',hash(key)+'.json');
    const active=this.inflight.get(key);if(active)return active;
    const run=(async()=>{
      try{const saved=JSON.parse(await fs.readFile(file,'utf8'));
        if(saved&&Array.isArray(saved.items)&&this.now()>=saved.at&&this.now()-saved.at<ttl)return saved.items;
      }catch{}
      const items=(await operation()).slice(0,12);
      await fs.mkdir(path.dirname(file),{recursive:true});
      const temp=file+'.'+crypto.randomBytes(5).toString('hex')+'.tmp';
      await fs.writeFile(temp,JSON.stringify({at:this.now(),items}),{mode:0o600});
      await fs.rename(temp,file);
      return items;
    })();
    this.inflight.set(key,run);try{return await run;}finally{this.inflight.delete(key);}
  }
  async getJson(url,options={},timeoutMs=8500){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await this.fetchImpl(url,{...options,redirect:'error',signal:controller.signal});
      if(!response.ok)throw new Error(response.status===401||response.status===403?'API key/token chưa hợp lệ hoặc thiếu quyền':response.status===429?'Vượt hạn mức API':`HTTP ${response.status}`);
      return await response.json();
    }finally{clearTimeout(timer);}
  }
  async google(product,query){
    if(!this.googleEnabled)return [];
    const q=clean(query).slice(0,125);if(!q)return [];
    return this.cached('serper-images',q,6*3600000,async()=>{
      const data=await this.getJson('https://google.serper.dev/images',{
        method:'POST',headers:{'X-API-KEY':this.env.SERPER_API_KEY,'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({q,gl:'vn',hl:'vi',num:10})
      });
      return (Array.isArray(data?.images)?data.images:[]).map(item=>safeGoogleImage(item,product)).filter(Boolean);
    });
  }
  async pinterest(product,query){
    if(!this.pinterestEnabled)return [];
    const q=clean(query).slice(0,100);if(!q)return [];
    return this.cached('pinterest-own-pins',q,3600000,async()=>{
      const endpoint=new URL('https://api.pinterest.com/v5/search/pins');
      endpoint.searchParams.set('query',q);endpoint.searchParams.set('page_size','25');
      const data=await this.getJson(endpoint.toString(),{
        method:'GET',headers:{'Authorization':`Bearer ${this.env.PINTEREST_ACCESS_TOKEN}`,'Accept':'application/json'}
      });
      return (Array.isArray(data?.items)?data.items:[]).map(pin=>safePinterestPin(pin,product)).filter(Boolean);
    });
  }
}
module.exports={CampaignSourceProviders,safeGoogleImage,safePinterestPin};
