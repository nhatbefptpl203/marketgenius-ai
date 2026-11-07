'use strict';
/**
 * Product research for MarketGenius AI.
 * Dedicated Gemini image-search grounding (when enabled/supported), real
 * publisher-page metadata and optional image-search API supply candidates.
 * No invented product photo URLs or third-party image scraping.
 * No secrets or search services are exposed in the browser.
 */
const {lookup}=require('node:dns/promises');
const {isIP}=require('node:net');
const MAX_SOURCE=14;
// A short-lived in-process cache prevents repeated Google grounded lookups for
// the same product. cPanel may run multiple workers, so this is best-effort.
const CACHE=new Map();
const CACHE_MS=20*60*1000;
const IMAGE_SOURCE_HOSTS=[
  'apple.com','samsung.com','xiaomi.com','oppo.com','vivo.com',
  'thegioididong.com','dienmayxanh.com','fptshop.com.vn','cellphones.com.vn',
  'vnexpress.net','thanhnien.vn','tuoitre.vn','dantri.com.vn','vietnamnet.vn',
  'genk.vn','tinhte.vn','24h.com.vn','cafef.vn','techradar.com',
  'theverge.com','gsmarena.com','cnet.com','tomsguide.com','androidauthority.com',
  'wikipedia.org','wikimedia.org','wired.com','engadget.com','forbes.com',
  'elle.vn','kenh14.vn','afamily.vn','giadinh.suckhoedoisong.vn'
];
const SOCIAL_HOSTS=['tiktok.com','youtube.com','youtu.be','facebook.com','instagram.com','reddit.com','x.com','twitter.com','pinterest.com'];
function domainMatch(host,domain){return host===domain||host.endsWith('.'+domain);}
function isPrivateAddress(ip){
  if (ip.includes(':')){
    const h=ip.toLowerCase();return h==='::1'||h==='::'||h.startsWith('fe80:')||h.startsWith('fc')||h.startsWith('fd')||h.startsWith('::ffff:127.')||h.startsWith('::ffff:10.')||h.startsWith('::ffff:192.168.');
  }
  const a=ip.split('.').map(Number);
  return a.length!==4||a[0]===0||a[0]===10||a[0]===127||a[0]>=224||
    a[0]===169&&a[1]===254||a[0]===172&&a[1]>=16&&a[1]<=31||
    a[0]===192&&a[1]===168||a[0]===100&&a[1]>=64&&a[1]<=127||
    a[0]===192&&a[1]===0||a[0]===198&&[18,19].includes(a[1]);
}
function safeHttpsUrl(value){
  try{
    const url=new URL(String(value||''));
    const hostname=url.hostname.toLowerCase();
    if(url.protocol!=='https:'||url.port||url.username||url.password||!hostname||
      hostname==='localhost'||hostname.endsWith('.local')||hostname.endsWith('.internal')||
      hostname.endsWith('.test')||hostname.endsWith('.localhost')||
      (isIP(hostname)&&isPrivateAddress(hostname)))return '';
    url.hash='';return url.toString();
  }catch{return '';}
}
function isTikTokVideo(url){
  try{const u=new URL(url);return domainMatch(u.hostname,'tiktok.com')&&/^\/@[^/]+\/video\/\d{12,22}(?:\/|$)/.test(u.pathname);}catch{return false;}
}
function normalizeProduct(p){return String(p||'').normalize('NFC').trim().slice(0,150);}
function plain(s,max=150){return String(s||'').replace(/\s+/g,' ').trim().slice(0,max);}
function keywords(text){
  return plain(text.toLowerCase(),170).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d')
    .split(/[^a-z0-9]+/).filter(w=>w.length>=3&&!['the','and','for','voi','cua','review','danh','gia','tinh','nang','san','pham','moi','nhat','chinh','hang','gia','ban','256gb','128gb','512gb'].includes(w)).slice(0,8);
}
function relevant(product,title){
  const keys=keywords(product),hay=keywords(title);
  const hit=keys.filter(k=>hay.includes(k)).length;
  // Do not accidentally show an older product model's picture (e.g. iPhone 17
  // when somebody requested iPhone 18). Storage-size tokens are not model ids.
  const productNorm=plain(product.toLowerCase(),170).normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  const titleNorm=plain(title.toLowerCase(),220).normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  const modelNumbers=(productNorm.match(/\b\d{2,4}\b/g)||[]).filter(n=>!['64','128','256','512','1024'].includes(n));
  if(modelNumbers.some(n=>!(new RegExp('\\b'+n+'\\b')).test(titleNorm)))return false;
  const variants=['ultra','plus','mini','pro','max'];
  if(variants.some(v=>keys.includes(v)&&!hay.includes(v)))return false;
  return hit>=Math.min(keys.length,keys.length>=3?2:1);
}
function googleLinks(product){
  const p=normalizeProduct(product);
  return {
    imageSearch:'https://www.google.com/search?tbm=isch&q='+encodeURIComponent(p+' sản phẩm chính hãng'),
    tiktokSearch:'https://www.tiktok.com/search?q='+encodeURIComponent(p+' review'),
    articleSearch:'https://www.google.com/search?q='+encodeURIComponent(p+' đánh giá bài báo')
  };
}
function emptyResources(product,note='Chưa tìm được ảnh trực tiếp cho sản phẩm này.'){
  return {status:'unavailable',product:normalizeProduct(product),image:null,images:[],videos:[],articles:[],searchLinks:googleLinks(product),suggestions:[],note};
}
async function groundedQuery({product,model,key,kind,fetchImpl}){
  const instruction=kind==='video'
    ? `Hãy TÌM KIẾM trên Google các video TikTok có URL cụ thể dạng tiktok.com/@.../video/ID review, mở hộp, trải nghiệm thực tế sản phẩm "${product}". Chỉ nói về video tìm thấy thật. Không tự bịa liên kết; nếu không tìm được video cụ thể, ghi rõ. Viết tối đa 120 từ, không dùng Markdown.`
    : `Hãy dùng Google Search tìm bài báo, trang sản phẩm chính hãng và bài đánh giá CÓ THẬT về "${product}" tại Việt Nam. Ưu tiên nguồn chính hãng và tòa soạn/báo công nghệ, tiêu đề đúng phiên bản sản phẩm. Không khẳng định sản phẩm tồn tại nếu không có nguồn đáng tin. Trình bày ngắn 120 từ.`;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),23000);
  try{
    const response=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
      method:'POST',headers:{'x-goog-api-key':key,'Content-Type':'application/json'},signal:controller.signal,
      body:JSON.stringify({contents:[{role:'user',parts:[{text:instruction}]}],tools:[{google_search:{}}],generationConfig:{temperature:0.25,maxOutputTokens:700}})
    });
    if(!response.ok)throw new Error('Không thể tìm dữ liệu Google Search (HTTP '+response.status+').');
    const data=await response.json();
    const metadata=data?.candidates?.[0]?.groundingMetadata||{};
    return {chunks:Array.isArray(metadata.groundingChunks)?metadata.groundingChunks.slice(0,MAX_SOURCE):[],
      modelText:(data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('').slice(0,2400),
      suggestion:plain(metadata.searchEntryPoint?.renderedContent,16000),
      queries:Array.isArray(metadata.webSearchQueries)?metadata.webSearchQueries.slice(0,6):[]};
  }finally{clearTimeout(timer);}
}
async function followGroundedRedirect(raw,fetchImpl){
  const url=safeHttpsUrl(raw);
  if(!url)return '';
  if(!domainMatch(new URL(url).hostname,'vertexaisearch.cloud.google.com'))return url;
  for(const method of ['HEAD','GET']){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2800);
    try{
      const res=await fetchImpl(url,{method,redirect:'manual',signal:controller.signal});
      if(res.status>=300&&res.status<=399){
        const target=safeHttpsUrl(new URL(res.headers.get('location')||'',url).href);
        if(target)return target;
      }
      if(res.body?.cancel)await res.body.cancel().catch(()=>{});
    }catch{}finally{clearTimeout(timer);}
  }
  // A grounding link still opens in the browser, but is not a scrapeable page.
  return url;
}
function decodeEntities(text){return String(text||'').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');}
function tagAttrs(tag){
  const attrs={};
  for(const match of String(tag).matchAll(/([\w:-]+)\s*=\s*(?:(["'])(.*?)\2|([^\s>]+))/gs)){
    attrs[match[1].toLowerCase()]=decodeEntities(match[3]??match[4]??'');
  }
  return attrs;
}
function absolutizeImage(v,base){
  try{
    const raw=String(v||'').trim();if(!raw||raw.startsWith('data:')||raw.startsWith('blob:'))return '';
    return safeHttpsUrl(new URL(raw,base).href);
  }catch{return '';}
}
function extractImageFromHtml(html,baseUrl,product=''){
  const page=String(html||'');
  const meta=page.match(/<meta\b[^>]*>/gi)||[];
  // Some sites use a merchant's default sharing image, but a known page og:image
  // is still better than an unrelated stock photo.
  for(const name of ['og:image','og:image:url','twitter:image','twitter:image:src','image']){
    for(const tag of meta){
      const a=tagAttrs(tag);
      if((a.property||a.name||a.itemprop||'').toLowerCase()===name){
        const image=absolutizeImage(a.content,baseUrl);
        if(image)return image;
      }
    }
  }
  // Product schema.org JSON-LD is a common reliable fallback on retailer pages.
  for(const script of page.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{
      const json=JSON.parse(script[1]);
      const entries=[].concat(json?.['@graph']||[],json||[]);
      for(const item of entries){
        if(!/product/i.test(String(item?.['@type']||'')))continue;
        if(product && item.name && !possibleProductImage(product,item.name))continue;
        const options=[].concat(item.image||[]);
        for(const raw of options){
          const url=absolutizeImage(typeof raw==='string'?raw:raw?.url||raw?.contentUrl,baseUrl);
          if(url)return url;
        }
      }
    }catch{}
  }
  // Modern stores sometimes only expose <img> with descriptive alt text.
  if(product){
    for(const tag of (page.match(/<img\b[^>]*>/gi)||[]).slice(0,200)){
      const a=tagAttrs(tag);
      if(!a.alt||!possibleProductImage(product,a.alt))continue;
      for(const raw of [a['data-src'],a.src,a['data-original'],(a.srcset||'').split(',')[0].trim().split(/\s+/)[0]]){
        const url=absolutizeImage(raw,baseUrl);if(url)return url;
      }
    }
  }
  return '';
}
async function fetchArticleImage(source,fetchImpl,options={}){
  let url=safeHttpsUrl(source?.url);
  if(!url)return null;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
  const dnsLookup=options.dnsLookup||lookup;
  try{
    for(let hop=0;hop<=2;hop++){
      const host=new URL(url).hostname;
      if(SOCIAL_HOSTS.some(d=>domainMatch(host,d))||domainMatch(host,'google.com')||domainMatch(host,'vertexaisearch.cloud.google.com'))return null;
      // SSRF safeguard on each redirect, not only the first URL.
      const ips=await dnsLookup(host,{all:true});
      if(!Array.isArray(ips)||!ips.length||ips.some(x=>isPrivateAddress(x.address)))return null;
      const res=await fetchImpl(url,{method:'GET',redirect:'manual',signal:controller.signal,
        headers:{'User-Agent':'Mozilla/5.0 (compatible; MarketGeniusAI/2.2.2; +https://smartgear.website)',
          Accept:'text/html,application/xhtml+xml'}});
      if(res.status>=300&&res.status<400){
        const next=absolutizeImage(res.headers.get('location'),url);
        if(res.body?.cancel)await res.body.cancel().catch(()=>{});
        if(!next)return null;url=next;continue;
      }
      const ct=res.headers?.get?.('content-type')||'';
      if(!res.ok||!ct.includes('text/html'))return null;
      if(Number(res.headers.get('content-length'))>450000)return null;
      let html='';const reader=res.body?.getReader?.();
      if(reader){
        let bytes=0;
        for(let i=0;i<72;i++){
          const {done,value}=await reader.read();if(done)break;
          bytes+=value.length;
          if(bytes>260000){await reader.cancel().catch(()=>{});break;}
          html+=new TextDecoder().decode(value);
          if(html.length>65000&&html.includes('og:image'))break;
        }
      }else if(typeof res.text==='function')html=(await res.text()).slice(0,260000);
      const imageUrl=extractImageFromHtml(html,url,source.product||'');
      if(!imageUrl)return null;
      return {url:imageUrl,sourceUrl:url,sourceTitle:source.title,
        label:'Ảnh sản phẩm tham khảo từ trang sản phẩm/bài viết'};
    }
    return null;
  }catch{return null;}
  finally{clearTimeout(timer);}
}

// Grounded search sometimes returns plain URLs in model text but no chunks.
// We NEVER display those URLs until their actual page responds with relevant metadata.
function extractTextUrls(text){
  const hits=String(text||'').match(/https:\/\/[^\s<>"'`\)\]\}]+/g)||[];
  return [...new Set(hits.map(raw=>safeHttpsUrl(raw.replace(/[.,;!?]+$/,''))).filter(Boolean))].slice(0,8);
}
function pageTitle(html){
  const meta=(String(html||'').match(/<meta\b[^>]*>/gi)||[]);
  for(const tag of meta){const a=tagAttrs(tag);if((a.property||a.name||'').toLowerCase()==='og:title'&&a.content)return plain(a.content,200);}
  const title=String(html||'').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title?plain(decodeEntities(title[1]).replace(/<[^>]*>/g,''),200):'';
}
async function verifiedArticleFromText(url,product,fetchImpl,options={}){
  let current=safeHttpsUrl(url);if(!current)return null;
  const dnsLookup=options.dnsLookup||lookup;
  const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),4600);
  try{
    for(let hop=0;hop<3;hop++){
      const host=new URL(current).hostname;
      if(SOCIAL_HOSTS.some(x=>domainMatch(host,x))||domainMatch(host,'google.com')||domainMatch(host,'vertexaisearch.cloud.google.com'))return null;
      const ips=await dnsLookup(host,{all:true});
      if(!Array.isArray(ips)||!ips.length||ips.some(x=>isPrivateAddress(x.address)))return null;
      const res=await fetchImpl(current,{method:'GET',redirect:'manual',signal:abort.signal,headers:{'Accept':'text/html,application/xhtml+xml','User-Agent':'Mozilla/5.0 (compatible; MarketGeniusAI/2.4)'}});
      if(res.status>=300&&res.status<400){
        const next=absolutizeImage(res.headers?.get?.('location'),current);
        if(res.body?.cancel)await res.body.cancel().catch(()=>{});
        if(!next)return null;current=next;continue;
      }
      if(!res.ok||!String(res.headers?.get?.('content-type')||'').includes('text/html')||Number(res.headers?.get?.('content-length'))>350000)return null;
      let html='';
      if(res.body?.getReader){
        const reader=res.body.getReader();const decoder=new TextDecoder();let bytes=0;
        while(bytes<120000){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;html+=decoder.decode(part.value,{stream:true});if(html.includes('</head>'))break;}
        await reader.cancel().catch(()=>{});
      }else html=String(await res.text()).slice(0,120000);
      const title=pageTitle(html);
      if(!title||!possibleProductImage(product,title))return null;
      return {title,url:current,source:new URL(current).hostname,
        image:extractImageFromHtml(html,current,product)};
    }
    return null;
  }catch{return null;}finally{clearTimeout(timeout);}
}
// A real Google Image Search result requires an image-capable Gemini model.
// Text-only Gemini grounding only returns webpage chunks; querying more pages
// does not change that. Uses the EXISTING site Gemini key, not a visitor key.
// This is one optional billable request per new product (cached in process).
async function googleImageSearch(product,key,fetchImpl,options={}){
  if(options.disableImageGrounding||String(process.env.MEDIA_GEMINI_IMAGE_SEARCH||'false').toLowerCase()==='false'){const skipped=[];skipped.status='disabled';return skipped;}
  const model=String(options.imageModel||process.env.MEDIA_GEMINI_IMAGE_MODEL||'gemini-3.1-flash-image').trim();
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
  try{
    const res=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
      method:'POST',signal:controller.signal,
      headers:{'x-goog-api-key':key,'Content-Type':'application/json'},
      body:JSON.stringify({
        contents:[{parts:[{text:`Tìm Google Image Search các ảnh SẢN PHẨM GỐC có thật về "${product}"; ưu tiên trang nhà sản xuất hoặc nhà bán lẻ. Không lấy ảnh đời khác hay sản phẩm khác.`}]}],
        tools:[{google_search:{searchTypes:{webSearch:{},imageSearch:{}}}}],
        generationConfig:{responseModalities:['IMAGE']}
      })
    });
    if(!res.ok){
      const failed=[];failed.status=[401,403].includes(res.status)?'no_access':res.status===429?'rate_limited':res.status===400?'bad_model':'request_failed';
      return failed;
    }
    const data=await res.json();
    const meta=data?.candidates?.[0]?.groundingMetadata||{};
    const found=(Array.isArray(meta.groundingChunks)?meta.groundingChunks:[]).filter(x=>x.image).slice(0,8)
      .map(x=>({url:safeHttpsUrl(x.image.imageUri||x.image.image_uri||x.image.url),
        sourceUrl:safeHttpsUrl(x.image.sourceUri||x.image.source_uri||x.image.uri),
        sourceTitle:plain(x.image.title||product),label:'Ảnh từ Google Image Search'}))
      .filter(x=>x.url&&x.sourceUrl);
    found.status=found.length?'success':'no_results';
    found.searchSuggestion=String(meta.searchEntryPoint?.renderedContent||'').slice(0,16000);
    return found;
  }catch{const failed=[];failed.status='network_error';return failed;}
  finally{clearTimeout(timer);}
}
// Optional structured image search for hosting owners who need more predictable
// coverage than public web/Creative Commons. The key never reaches the browser.
async function serperImageSearch(product,fetchImpl,key,searchQuery=product+' sản phẩm'){
  if(!key)return [];
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
    const res=await fetchImpl('https://google.serper.dev/images',{
      method:'POST',signal:controller.signal,
      headers:{'X-API-KEY':key,'Content-Type':'application/json'},
      body:JSON.stringify({q:plain(searchQuery,220),gl:'vn',hl:'vi',num:10})
    });
    if(!res.ok)return [];
    const data=await res.json();
    return (Array.isArray(data.images)?data.images:[]).slice(0,8).map(x=>({
      url:safeHttpsUrl(x.imageUrl||x.thumbnailUrl),sourceUrl:safeHttpsUrl(x.link),
      sourceTitle:plain(x.title||product),label:'Ảnh tìm kiếm sản phẩm'
    })).filter(x=>x.url&&x.sourceUrl&&possibleProductImage(product,x.sourceTitle));
  }catch{return [];}
  finally{clearTimeout(timer);}
}
// No extra API key required. Openverse returns real image thumbnails and a
// landing page; generic matches are clearly labelled as illustrative.
async function openverseImage(product,fetchImpl){
  const search='https://api.openverse.org/v1/images/?q='+encodeURIComponent(product)+'&page_size=12';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
  try{
    const res=await fetchImpl(search,{method:'GET',redirect:'error',signal:controller.signal,headers:{'Accept':'application/json','User-Agent':'MarketGeniusAI/2.2.1 (product image search)'}});
    if(!res.ok)return null;
    const data=await res.json();
    const results=Array.isArray(data.results)?data.results:[];
    // Exact match first. Never silently use an older phone model.
    const chosen=results.find(x=>relevant(product,String(x.title||''))&&safeHttpsUrl(x.thumbnail||x.url)&&safeHttpsUrl(x.foreign_landing_url));
    if(!chosen)return null;
    return {url:safeHttpsUrl(chosen.thumbnail||chosen.url),sourceUrl:safeHttpsUrl(chosen.foreign_landing_url),
      sourceTitle:plain(chosen.title||product),label:'Ảnh sản phẩm tham khảo · Openverse',license:plain(chosen.license||'',40)};
  }catch{return null;}finally{clearTimeout(timer);}
}
// Wikimedia Commons public thumbnail search is another no-key fallback for
// products whose photos are not indexed by Openverse yet.
async function commonsImage(product,fetchImpl){
  const qs=new URLSearchParams({action:'query',generator:'search',gsrnamespace:'6',
    gsrsearch:product,gsrlimit:'10',prop:'imageinfo',iiprop:'url',iiurlwidth:'720',format:'json'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
  try{
    const res=await fetchImpl('https://commons.wikimedia.org/w/api.php?'+qs.toString(),
      {method:'GET',redirect:'error',signal:controller.signal,headers:{Accept:'application/json'}});
    if(!res.ok)return null;
    const data=await res.json(),pages=Object.values(data?.query?.pages||{});
    const match=pages.find(x=>possibleProductImage(product,x.title||'')&&x.imageinfo?.[0]);
    const info=match?.imageinfo?.[0];
    const url=safeHttpsUrl(info?.thumburl||info?.url);
    const sourceUrl=safeHttpsUrl(info?.descriptionurl);
    if(!url||!sourceUrl)return null;
    return {url,sourceUrl,sourceTitle:plain(match.title,150),label:'Ảnh sản phẩm tham khảo · Wikimedia Commons'};
  }catch{return null;}finally{clearTimeout(timer);}
}
async function publicMediaImage(product,fetchImpl){
  const results=await Promise.all([openverseImage(product,fetchImpl),commonsImage(product,fetchImpl)]);
  return results.find(Boolean)||null;
}
function possibleProductImage(product,title){
  // Looser than article title matching, because many product photos use a
  // generic caption; still reject an obviously different model number.
  const a=plain(product.toLowerCase(),170).normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  const b=plain(title.toLowerCase(),220).normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  const keys=keywords(product),titleKeys=keywords(title);
  const importantNumbers=(a.match(/\b\d{2,4}\b/g)||[]).filter(n=>!['64','128','256','512','1024'].includes(n));
  if(importantNumbers.length&&importantNumbers.some(n=>!new RegExp('\\b'+n+'\\b').test(b)))return false;
  if(['pro','max','ultra','mini','plus'].some(k=>keys.includes(k)&&!titleKeys.includes(k)))return false;
  return !keys.length||titleKeys.some(k=>keys.includes(k));
}
function dedupeByUrl(arr){const seen=new Set();return arr.filter(x=>{const u=x.url;if(seen.has(u))return false;seen.add(u);return true;});}
async function verifyTikTok(video,fetchImpl){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1900);
  try{
    const url='https://www.tiktok.com/oembed?url='+encodeURIComponent(video.url);
    const res=await fetchImpl(url,{method:'GET',redirect:'error',signal:controller.signal});
    if(!res.ok)return video;
    const data=await res.json();
    if(data?.type!=='video'||data?.provider_name!=='TikTok')return video;
    const title=plain(data.title||video.title,180);
    // Public video metadata returned by TikTok is stronger than an indexed URL.
    return {...video,title,verification:'TikTok oEmbed xác nhận đường dẫn; chưa xác minh lượt xem',
      creator:plain(data.author_name,100),thumbnail:safeHttpsUrl(data.thumbnail_url)};
  }catch{return video;}
  finally{clearTimeout(timer);}
}

async function collectProductMedia(product,model,key,options={}){
  product=normalizeProduct(product);
  if(!product||!model||!key)return emptyResources(product,'Thiếu thông tin để tra cứu nguồn.');
  const fetchImpl=options.fetch||globalThis.fetch;
  const cacheKey=model+'|'+product.toLocaleLowerCase('vi-VN');
  if(!options.fetch){
    const cached=CACHE.get(cacheKey);
    if(cached&&Date.now()-cached.time<CACHE_MS)return cached.data;
  }
  const [articleResult,videoResult,geminiImages,serperImages]=await Promise.all([
    groundedQuery({product,model,key,kind:'articles',fetchImpl}).catch(()=>null),
    groundedQuery({product,model,key,kind:'video',fetchImpl}).catch(()=>null),
    googleImageSearch(product,key,fetchImpl,options),
    serperImageSearch(product,fetchImpl,options.imageSearchKey||process.env.SERPER_API_KEY||'')
  ]);
  const good=[articleResult,videoResult].filter(Boolean);
  const rawChunks=good.flatMap(r=>r.chunks);
  const urls=await Promise.all(rawChunks.map(async chunk=>{
    if(chunk.image){
      const url=safeHttpsUrl(chunk.image.imageUri);
      const sourceUrl=safeHttpsUrl(chunk.image.sourceUri);
      return url?{kind:'image',url,sourceUrl,title:plain(chunk.image.title||product)}:null;
    }
    if(!chunk.web)return null;
    const url=await followGroundedRedirect(chunk.web.uri,fetchImpl);
    return url?{kind:'web',url,title:plain(chunk.web.title||'Bài viết tham khảo')}:null;
  }));
  const sources=urls.filter(Boolean),images=sources.filter(x=>x.kind==='image');
  const fromGrounding=sources.filter(x=>x.kind==='web'&&isTikTokVideo(x.url))
    .filter(x=>relevant(product,x.title)||x.title.toLowerCase().includes('tiktok'))
    .map(x=>({title:x.title||'Video TikTok về sản phẩm',url:x.url,verification:'Đường dẫn từ Google Search; chưa xác minh lượt xem'}));
  const fromModelText=good.flatMap(x=>[...(x.modelText||'').matchAll(/https:\/\/(?:www\.)?tiktok\.com\/@[^\s<>"']+\/video\/\d{12,22}/g)])
    .map(match=>safeHttpsUrl(match[0])).filter(isTikTokVideo)
    .map(url=>({title:'Video review sản phẩm trên TikTok',url,verification:'Chờ TikTok xác minh'}));
  const checkedVideos=await Promise.all(dedupeByUrl([...fromGrounding,...fromModelText]).slice(0,5)
    .map(v=>verifyTikTok(v,fetchImpl)));
  const videos=checkedVideos.filter(v=>v.verification!=='Chờ TikTok xác minh'||v.verification.startsWith('TikTok oEmbed')).slice(0,3);
  const articles=dedupeByUrl(sources.filter(x=>x.kind==='web'&&!isTikTokVideo(x.url)&&
    !SOCIAL_HOSTS.some(h=>domainMatch(new URL(x.url).hostname,h))&&
    !domainMatch(new URL(x.url).hostname,'google.com')&&
    possibleProductImage(product,x.title))
    .map(x=>({title:x.title,url:x.url,source:domainMatch(new URL(x.url).hostname,'vertexaisearch.cloud.google.com')?'Liên kết nguồn do Google Search cung cấp':new URL(x.url).hostname}))).slice(0,4);
  // No chunks? Verify URL text against a real HTML page before labeling as a source.
  // Limit to four candidates, in parallel, so this never waits indefinitely.
  const verified=articles.length?[]:(await Promise.all(good.flatMap(x=>extractTextUrls(x.modelText))
    .filter(url=>!isTikTokVideo(url)).slice(0,4).map(url=>verifiedArticleFromText(url,product,fetchImpl,options)))).filter(Boolean);
  articles.push(...dedupeByUrl(verified.map(({title,url,source})=>({title,url,source}))).slice(0,4));
  const imageCandidates=dedupeByUrl([
    ...serperImages,...geminiImages,
    ...images.map(x=>({url:x.url,sourceUrl:x.sourceUrl,sourceTitle:x.title,label:'Ảnh sản phẩm từ kết quả tìm kiếm'})),
    ...verified.filter(x=>x.image).map(x=>({url:x.image,sourceUrl:x.url,sourceTitle:x.title,label:'Ảnh từ bài viết đã xác minh'}))
  ].filter(x=>x.url));
  const groundedPages=sources.filter(x=>x.kind==='web'&&!SOCIAL_HOSTS.some(h=>domainMatch(new URL(x.url).hostname,h)));
  const likelyPages=[...groundedPages].sort((a,b)=>Number(possibleProductImage(product,b.title))-Number(possibleProductImage(product,a.title)));
  // When dedicated image Search does not work on the key, fetch the OG image
  // or product JSON-LD image from official website / review pages instead.
  if(imageCandidates.length<2){
    const pagePhotos=await Promise.all(likelyPages.slice(0,8).map(x=>fetchArticleImage({...x,product},fetchImpl,options)));
    imageCandidates.push(...pagePhotos.filter(Boolean));
  }
  if(!imageCandidates.length){
    const publicImage=await publicMediaImage(product,fetchImpl);
    if(publicImage)imageCandidates.push(publicImage);
  }
  const finalImages=dedupeByUrl(imageCandidates).slice(0,6);
  const productImage=finalImages[0]||null;
  // Google requires Search Suggestions to accompany grounded search results.
  const suggestions=[...good.map(x=>x.suggestion),geminiImages.searchSuggestion].filter(Boolean).slice(0,3);
  const count=articles.length+videos.length+(productImage?1:0);
  const note=productImage?'Đã tìm được URL ảnh tham khảo. Bấm ảnh để xem trang nguồn.':
    'Chưa tìm được ảnh trực tiếp có thể xác minh. Bạn có thể thêm ảnh sản phẩm hoặc đường dẫn nguồn từ thiết bị của mình.';
  const output={status:count?'partial':'unavailable',product,image:productImage,images:finalImages,videos,articles,
    searchLinks:googleLinks(product),suggestions,note,
    diagnostic:{imageCount:finalImages.length,groundingImageCount:geminiImages.length,providerImageCount:serperImages.length,
      webpageCount:groundedPages.length,imageSearchStatus:geminiImages.status||'unknown',imageSearchEnabled:!options.disableImageGrounding&&String(process.env.MEDIA_GEMINI_IMAGE_SEARCH||'false').toLowerCase()!=='false'}};
  if(!options.fetch){
    if(CACHE.size>=50)CACHE.delete(CACHE.keys().next().value);
    CACHE.set(cacheKey,{time:Date.now(),data:output});
  }
  return output;
}


// Stage 4.9 — per-campaign image research. Search terms are derived from each
// AI campaign's channel, hook and concept, but the *product* name is required
// in every accepted photo title. Sources must be actual HTTPS URLs from a
// provider; never interpolate query text into a fabricated image URL.
const CAMPAIGN_IMAGE_CACHE=new Map();
function campaignAngle(idea){
  const text=plain([idea.title,idea.channel,idea.concept,idea.hook,idea.strategy].join(' ').toLowerCase(),1200);
  if(/unbox|mở hộp|đập hộp|trải nghiệm|review|đánh giá|koc|ugc|khách hàng thật/.test(text))return {name:'review',query:'review trải nghiệm thực tế',tags:['review','trải nghiệm','unbox','mở hộp','hands on']};
  if(/hướng dẫn|cách dùng|cách sử dụng|giải thích|giáo dục|tips|mẹo|tutorial/.test(text))return {name:'howto',query:'hướng dẫn sử dụng thực tế',tags:['hướng dẫn','sử dụng','tutorial','cách dùng']};
  if(/so sánh|đối chiếu|trước sau|ưu nhược|comparison|vs\b/.test(text))return {name:'compare',query:'so sánh chi tiết sản phẩm',tags:['so sánh','comparison','compare']};
  if(/giảm giá|khuyến mãi|flash sale|combo|ưu đãi|deal|voucher|sale/.test(text))return {name:'promotion',query:'sản phẩm ưu đãi khuyến mãi',tags:['ưu đãi','giảm giá','deal','sale','combo']};
  if(/lifestyle|phong cách|câu chuyện|hằng ngày|đời sống|cộng đồng|story/.test(text))return {name:'lifestyle',query:'phong cách sống sử dụng thực tế',tags:['lifestyle','đời sống','phong cách','người dùng']};
  if(/ra mắt|launch|mới|teaser|giới thiệu/.test(text))return {name:'launch',query:'ảnh giới thiệu chi tiết',tags:['giới thiệu','mới','chi tiết','launch']};
  return {name:'product',query:'ảnh chi tiết sản phẩm',tags:['sản phẩm','chi tiết','product']};
}
async function openverseCampaignPhotos(product,query,fetchImpl){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
  try{
    const u='https://api.openverse.org/v1/images/?q='+encodeURIComponent(query)+'&page_size=20';
    const res=await fetchImpl(u,{method:'GET',redirect:'error',signal:controller.signal,headers:{Accept:'application/json','User-Agent':'MarketGeniusAI/2.4.9 (campaign image research)'}});
    if(!res.ok)return [];
    const body=await res.json();
    return (Array.isArray(body.results)?body.results:[]).map(i=>({
      url:safeHttpsUrl(i.thumbnail||i.url),sourceUrl:safeHttpsUrl(i.foreign_landing_url),
      sourceTitle:plain(i.title),label:'Ảnh tham khảo · Openverse',license:plain(i.license,40)
    })).filter(i=>i.url&&i.sourceUrl&&possibleProductImage(product,i.sourceTitle)).slice(0,10);
  }catch{return [];}finally{clearTimeout(timer);}
}
async function commonsCampaignPhotos(product,query,fetchImpl){
  const qs=new URLSearchParams({action:'query',generator:'search',gsrnamespace:'6',gsrsearch:query,
    gsrlimit:'20',prop:'imageinfo',iiprop:'url',iiurlwidth:'720',format:'json'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
  try{
    const res=await fetchImpl('https://commons.wikimedia.org/w/api.php?'+qs,{method:'GET',redirect:'error',signal:controller.signal,headers:{Accept:'application/json'}});
    if(!res.ok)return [];
    const body=await res.json();
    return Object.values(body?.query?.pages||{}).map(p=>({
      url:safeHttpsUrl(p.imageinfo?.[0]?.thumburl||p.imageinfo?.[0]?.url),
      sourceUrl:safeHttpsUrl(p.imageinfo?.[0]?.descriptionurl),sourceTitle:plain(p.title),
      label:'Ảnh tham khảo · Wikimedia Commons'
    })).filter(i=>i.url&&i.sourceUrl&&possibleProductImage(product,i.sourceTitle)).slice(0,10);
  }catch{return [];}finally{clearTimeout(timer);}
}
function imageCandidate(product,photo){
  return photo&&safeHttpsUrl(photo.url)&&safeHttpsUrl(photo.sourceUrl)&&
    possibleProductImage(product,photo.sourceTitle||product)
      ? {...photo,url:safeHttpsUrl(photo.url),sourceUrl:safeHttpsUrl(photo.sourceUrl)} : null;
}
function rankCampaignPhoto(photo,angle,own){
  const title=plain(photo.sourceTitle,220).toLocaleLowerCase('vi');
  const hit=angle.tags.reduce((n,k)=>n+(title.includes(k)?1:0),0);
  return (own?60:0)+hit*25+(photo.license?2:0);
}
async function collectCampaignMedia(product,ideas,base,options={}){
  const fetchImpl=options.fetch||globalThis.fetch;
  const key=options.imageSearchKey??process.env.SERPER_API_KEY??'';
  const angles=ideas.map(campaignAngle);
  const sharedPhotos=dedupeByUrl((base?.images||[]).concat(base?.image?[base.image]:[])
    .map(i=>imageCandidate(product,i)).filter(Boolean));
  const cacheKey=normalizeProduct(product).toLocaleLowerCase('vi')+'|'+angles.map(a=>a.name).join(',')+'|'+Boolean(key);
  let perIdea;
  const cached=!options.fetch&&CAMPAIGN_IMAGE_CACHE.get(cacheKey);
  if(cached&&Date.now()-cached.time<CACHE_MS)perIdea=cached.items;
  else{
    perIdea=await Promise.all(angles.map(async angle=>{
      const query=normalizeProduct(product)+' '+angle.query;
      // Image-index provider is optional; two public licensed-image indexes
      // are queried without another API key. All requests have timeouts.
      const [serper,openverse,commons]=await Promise.all([
        serperImageSearch(product,fetchImpl,key,query),
        openverseCampaignPhotos(product,query,fetchImpl),
        commonsCampaignPhotos(product,query,fetchImpl)
      ]);
      return dedupeByUrl([...serper,...openverse,...commons].map(i=>imageCandidate(product,i)).filter(Boolean));
    }));
    if(!options.fetch){
      if(CAMPAIGN_IMAGE_CACHE.size>=35)CAMPAIGN_IMAGE_CACHE.delete(CAMPAIGN_IMAGE_CACHE.keys().next().value);
      CAMPAIGN_IMAGE_CACHE.set(cacheKey,{time:Date.now(),items:perIdea});
    }
  }
  const used=new Set();
  return ideas.map((idea,index)=>{
    const angle=angles[index];
    const own=perIdea[index]||[];
    const found=dedupeByUrl([...own,...sharedPhotos]);
    found.sort((a,b)=>rankCampaignPhoto(b,angle,own.some(x=>x.url===b.url))-
      rankCampaignPhoto(a,angle,own.some(x=>x.url===a.url)));
    // A single product photo must NOT silently repeat in all five campaigns.
    const image=found.find(p=>!used.has(p.url))||null;
    if(image)used.add(image.url);
    return {
      ...(base||emptyResources(product)),
      image, images:image?[image]:[],
      imageApproach:angle.name,
      note:image?'AI đã tự tìm ảnh tham khảo cho hướng triển khai này. Cần kiểm tra quyền sử dụng trước khi đăng.':
        'Chưa có ảnh công khai xác minh được cho hướng triển khai này; không dùng ảnh sai sản phẩm.',
      diagnostic:{...(base?.diagnostic||{}),campaignImageFound:Boolean(image)}
    };
  });
}

module.exports={collectCampaignMedia,campaignAngle,collectProductMedia,emptyResources,safeHttpsUrl,relevant,extractImageFromHtml,googleLinks,googleImageSearch,serperImageSearch,fetchArticleImage,followGroundedRedirect,extractTextUrls,verifiedArticleFromText};
