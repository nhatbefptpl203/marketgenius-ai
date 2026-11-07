'use strict';
// A short-lived, signed image URL is generated only for search results returned
// by the server. This is not an open proxy and never accepts arbitrary user URLs.
const crypto=require('node:crypto');
const {lookup}=require('node:dns/promises');
const {isIP}=require('node:net');
const secret=process.env.IMAGE_PROXY_SECRET || process.env.GUEST_GEMINI_API_KEY || crypto.randomBytes(32).toString('hex');
function isLocalIP(ip){
  if(ip.includes(':'))return ip==='::'||ip==='::1'||ip.startsWith('fe80:')||ip.startsWith('fc')||ip.startsWith('fd')||ip.startsWith('::ffff:127.')||ip.startsWith('::ffff:10.')||ip.startsWith('::ffff:192.168.');
  const a=ip.split('.').map(Number);
  return a.length!==4||a[0]===0||a[0]===10||a[0]===127||a[0]>=224||a[0]===169&&a[1]===254||a[0]===172&&a[1]>=16&&a[1]<=31||a[0]===192&&a[1]===168||a[0]===100&&a[1]>=64&&a[1]<=127||a[0]===192&&a[1]===0||a[0]===198&&[18,19].includes(a[1]);
}
function safeRemote(value){
  try{const url=new URL(value);const host=url.hostname.toLowerCase().replace(/^\[|\]$/g,'');
    if(url.protocol!=='https:'||url.username||url.password||url.port||!host||host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||isIP(host)&&isLocalIP(host))return '';
    return url.href;
  }catch{return '';}
}
function sig(u,t){return crypto.createHmac('sha256',secret).update(`${u}\n${t}`).digest('hex');}
function signImageUrl(raw,seconds=86400){
  const url=safeRemote(raw);if(!url)return '';
  const u=Buffer.from(url).toString('base64url');
  const t=String(Math.floor(Date.now()/1000)+seconds);
  return '/api/image?u='+encodeURIComponent(u)+'&t='+t+'&s='+sig(u,t);
}
function verifiedUrl(params){
  const u=params.get('u')||'',t=params.get('t')||'',s=params.get('s')||'';
  if(!/^[A-Za-z0-9_-]{8,4000}$/.test(u)||!/^[0-9]{10,11}$/.test(t)||!/^[a-f0-9]{64}$/.test(s))return '';
  const now=Math.floor(Date.now()/1000);
  if(+t<now||+t>now+2*86400)return '';
  const expected=sig(u,t);
  if(!crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(s,'hex')))return '';
  return safeRemote(Buffer.from(u,'base64url').toString('utf8'));
}
async function imageResponse(requestUrl,options={}){
  let url=verifiedUrl(new URL(requestUrl,'http://localhost').searchParams);
  if(!url)return {status:403,message:'Ảnh không hợp lệ hoặc đường dẫn đã hết hạn.'};
  const fetchImpl=options.fetch||globalThis.fetch,dnsLookup=options.lookup||lookup;
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),8500);
  try{
    for(let i=0;i<3;i++){
      const host=new URL(url).hostname;
      const ips=await dnsLookup(host,{all:true});
      if(!Array.isArray(ips)||!ips.length||ips.some(x=>isLocalIP(x.address)))return {status:403,message:'Nguồn ảnh không an toàn.'};
      const resp=await fetchImpl(url,{method:'GET',redirect:'manual',signal:ctrl.signal,
        headers:{'Accept':'image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8',
          'User-Agent':'Mozilla/5.0 (compatible; MarketGeniusAI/2.2.2)'}});
      if(resp.status>=300&&resp.status<400){
        const next=safeRemote(new URL(resp.headers.get('location')||'',url).href);
        if(resp.body?.cancel)await resp.body.cancel().catch(()=>{});
        if(!next)return {status:502,message:'Nguồn ảnh chuyển hướng không hợp lệ.'};
        url=next;continue;
      }
      const mime=(resp.headers?.get('content-type')||'').split(';')[0].toLowerCase();
      if(!resp.ok||!['image/jpeg','image/png','image/webp','image/avif','image/gif'].includes(mime))return {status:502,message:'Nguồn ảnh không trả tệp hình ảnh.'};
      if(Number(resp.headers.get('content-length'))>3000000)return {status:413,message:'Ảnh vượt quá 3 MB.'};
      const chunks=[];let total=0;
      for await (const buf of resp.body){total+=buf.length;if(total>3000000)return {status:413,message:'Ảnh vượt quá 3 MB.'};chunks.push(Buffer.from(buf));}
      return {status:200,mime,buffer:Buffer.concat(chunks),cacheSeconds:300};
    }
    return {status:502,message:'Nguồn ảnh chuyển hướng quá nhiều lần.'};
  }catch{return {status:502,message:'Không tải được ảnh từ website bên ngoài.'};}
  finally{clearTimeout(timeout);}
}
module.exports={signImageUrl,verifiedUrl,imageResponse};
