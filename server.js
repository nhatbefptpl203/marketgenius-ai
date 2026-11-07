'use strict';
/**
 * MarketGenius AI — cPanel / CloudLinux Node.js startup file.
 * Node.js 22+; no npm dependencies required.
 * The existing Netlify Function is reused internally as an HTTP handler.
 * Secrets are configured ONLY through cPanel Setup Node.js App > Environment variables.
 */
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const { handler: aiHandler } = require('./netlify/functions/ai.js');
const {signImageUrl,imageResponse}=require('./image-proxy.js');
const {BrowserUseMediaService}=require('./browser-use-cloud.js');
const {FreeMediaService}=require('./free-media-service.js');
const browserMedia=new BrowserUseMediaService();
const freeMedia=new FreeMediaService();

const ROOT = __dirname;
const STATIC_FILES = Object.freeze({
  '/': ['index.html','text/html; charset=utf-8'],
  '/index.html': ['index.html','text/html; charset=utf-8'],
  '/styles.css': ['styles.css','text/css; charset=utf-8'],
  '/startup-theme.css': ['startup-theme.css','text/css; charset=utf-8'],
  '/studio-layout.css': ['studio-layout.css','text/css; charset=utf-8'],
  '/saas-design.css': ['saas-design.css','text/css; charset=utf-8'],
  '/studio-layout.js': ['studio-layout.js','application/javascript; charset=utf-8'],
  '/smart-templates.css': ['smart-templates.css','text/css; charset=utf-8'],
  '/research-media.css': ['research-media.css','text/css; charset=utf-8'],
  '/browser-use-media.css': ['browser-use-media.css','text/css; charset=utf-8'],
  '/browser-use-client.js': ['browser-use-client.js','application/javascript; charset=utf-8'],
  '/free-media-client.js': ['free-media-client.js','application/javascript; charset=utf-8'],
  '/smart-templates.js': ['smart-templates.js','application/javascript; charset=utf-8'],
  '/favicon.ico': ['favicon.ico','image/x-icon'],
  '/favicon-32.png': ['favicon-32.png','image/png'],
  '/favicon-192.png': ['favicon-192.png','image/png'],
  '/apple-touch-icon.png': ['apple-touch-icon.png','image/png'],
  '/assets/marketgenius-symbol.png': ['assets/marketgenius-symbol.png','image/png'],
  '/assets/marketgenius-symbol.webp': ['assets/marketgenius-symbol.webp','image/webp'],
  '/robots.txt': ['robots.txt','text/plain; charset=utf-8'],
  '/sitemap.xml': ['sitemap.xml','application/xml; charset=utf-8'],
  '/manifest.webmanifest': ['manifest.webmanifest','application/manifest+json; charset=utf-8'],
  '/app.js': ['app.js','application/javascript; charset=utf-8'],
  '/studio.js': ['studio.js','application/javascript; charset=utf-8'],
  '/planner.js': ['planner.js','application/javascript; charset=utf-8']
});
const CSP = ["default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'", "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com data:", "img-src 'self' data: blob: https:", "connect-src 'self' https://challenges.cloudflare.com", "frame-src https://challenges.cloudflare.com"].join('; ');
const BASE_HEADERS = {
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'X-Frame-Options':'DENY',
  'Content-Security-Policy':CSP
};
const MAX_BODY_BYTES = 20000;
const COMPRESSIBLE = /^(?:text\/|application\/(?:javascript|json|xml|manifest\+json))/;
const compressedCache=new Map();


// No application-level daily, per-IP or 20-second Gemini call quotas.
// Every AI POST is still validated by the existing Turnstile challenge in ai.js.
// Concurrent duplicate submissions are prevented client-side; the Gemini provider
// may still enforce its own rate limits and billing restrictions.
function clientIp(req){
  const peer=String(req.socket.remoteAddress||'');
  const viaProxy=peer==='127.0.0.1'||peer==='::1'||peer==='::ffff:127.0.0.1';
  const forwarded=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
  return viaProxy && forwarded && forwarded.length<100 ? forwarded : peer||'unknown';
}

function json(res,status,data,method='GET',extra={}){
  const body=Buffer.from(JSON.stringify(data));
  res.writeHead(status,{
    ...BASE_HEADERS,
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store, max-age=0',
    'Content-Length':String(body.length),
    ...extra
  });
  res.end(method==='HEAD'?undefined:body);
}

async function readBody(req){
  const parts=[];let length=0;
  for await (const part of req){
    length+=part.length;
    if(length>MAX_BODY_BYTES){const err=new Error('Dữ liệu quá dài.');err.statusCode=413;throw err;}
    parts.push(part);
  }
  return Buffer.concat(parts).toString('utf8');
}

async function serveStatic(req,res,urlPath,search=''){
  if(!Object.prototype.hasOwnProperty.call(STATIC_FILES,urlPath)){
    const body=Buffer.from('<!doctype html><html lang="vi"><meta charset="utf-8"><title>404 — Không tìm thấy</title><body style="font:16px system-ui;padding:3rem"><h1>Không tìm thấy trang</h1><p>Đường dẫn này không tồn tại.</p><a href="/">Trở về trang chủ</a></body></html>');
    res.writeHead(404,{...BASE_HEADERS,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Length':body.length});
    return res.end(req.method==='HEAD'?undefined:body);
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){
    json(res,405,{ok:false,error:'Phương thức không được hỗ trợ.'},req.method,{Allow:'GET, HEAD'});return;
  }
  const [file,mime]=STATIC_FILES[urlPath];
  try{
    const data=await fs.readFile(path.join(ROOT,file));
    const accept=String(req.headers['accept-encoding']||'');
    const encoding=COMPRESSIBLE.test(mime) && /\bbr\b/.test(accept)?'br':COMPRESSIBLE.test(mime)&&/\bgzip\b/.test(accept)?'gzip':'';
    let output=data;
    if(encoding){
      const key=file+':'+encoding+':'+data.length;
      if(compressedCache.has(key))output=compressedCache.get(key);
      else{
        output=encoding==='br'?zlib.brotliCompressSync(data):zlib.gzipSync(data);
        if(compressedCache.size>100)compressedCache.clear();
        compressedCache.set(key,output);
      }
    }
    const cache=urlPath==='/'||urlPath==='/index.html'?'no-cache':search.includes('v=')?'public, max-age=31536000, immutable':urlPath.startsWith('/assets/')?'public, max-age=604800':'public, max-age=300';
    res.writeHead(200,{...BASE_HEADERS,'Content-Type':mime,'Cache-Control':cache,'Vary':'Accept-Encoding',...(encoding?{'Content-Encoding':encoding}:{}),'Content-Length':String(output.length)});
    res.end(req.method==='HEAD'?undefined:output);
  }catch{
    json(res,500,{ok:false,error:'Tệp giao diện chưa được tải lên hosting.'},req.method);
  }
}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/', 'http://localhost');
    if(url.pathname==='/api/image'){
      if(req.method!=='GET')return json(res,405,{ok:false,error:'Chỉ hỗ trợ GET ảnh.'});
      const out=await imageResponse(req.url);
      if(out.status!==200)return json(res,out.status,{ok:false,error:out.message});
      res.writeHead(200,{...BASE_HEADERS,'Content-Type':out.mime,'Cache-Control':'private, max-age=300','Content-Length':String(out.buffer.length)});
      return res.end(out.buffer);
    }
    if(url.pathname.startsWith('/api/free-media/image/')){
      if(!['GET','HEAD'].includes(req.method))return json(res,405,{ok:false,error:'Chỉ hỗ trợ GET.'},req.method);
      const hash=url.pathname.slice('/api/free-media/image/'.length);
      const found=await freeMedia.readImage(hash);
      if(!found)return json(res,404,{ok:false,error:'Không tìm thấy ảnh đã lưu.'},req.method);
      res.writeHead(200,{...BASE_HEADERS,'Content-Type':found.mime,'Content-Length':found.bytes.length,
        'Cache-Control':'public, max-age=604800','Cross-Origin-Resource-Policy':'same-origin'});
      return res.end(req.method==='HEAD'?undefined:found.bytes);
    }
    if(url.pathname==='/api/media-sources/status'){
      if(req.method!=='GET')return json(res,405,{ok:false,error:'Chỉ hỗ trợ GET.'});
      const all=freeMedia.providerStatus();
      return json(res,200,{ok:true,enabled:all.enabled,providers:{
        google:all.google,youtube:all.youtube,pinterest:all.pinterest,pixabay:all.pixabay},
        message:'Trạng thái chỉ kiểm tra biến môi trường; không xác nhận key hoạt động.'});
    }
    if(url.pathname==='/api/free-media/status'){
      if(req.method!=='GET')return json(res,405,{ok:false,error:'Chỉ hỗ trợ GET.'});
      return json(res,200,{ok:true,enabled:freeMedia.enabled,pixabay:freeMedia.hasPixabay,youtube:freeMedia.hasYoutube,google:freeMedia.extra.googleEnabled,pinterest:freeMedia.extra.pinterestEnabled});
    }
    if(url.pathname==='/api/free-media/search'){
      if(req.method!=='POST')return json(res,405,{ok:false,error:'Chỉ hỗ trợ POST.'});
      const origin=req.headers.origin;
      if(origin){let host='';try{host=new URL(origin).host.toLowerCase();}catch{}
        if(!host||host!==String(req.headers.host||'').toLowerCase())return json(res,403,{ok:false,error:'Yêu cầu không cùng nguồn.'});}
      const fetchSite=String(req.headers['sec-fetch-site']||'');
      if(fetchSite&&!['same-origin','none'].includes(fetchSite))return json(res,403,{ok:false,error:'Yêu cầu không cùng nguồn.'});
      let body;try{body=JSON.parse(await readBody(req));}catch{return json(res,400,{ok:false,error:'JSON không hợp lệ.'});}
      if(!body||typeof body.ticket!=='string'||body.ticket.length>200)return json(res,400,{ok:false,error:'Vé tìm nguồn không hợp lệ.'});
      try{return json(res,200,{ok:true,...await freeMedia.search(body.ticket,clientIp(req))});}
      catch(err){const status=Number(err.statusCode)||502;
        return json(res,status,{ok:false,error:String(err.message||'Không tìm được ảnh/video tham khảo.').slice(0,200)});}
    }
    if(url.pathname==='/healthz'){
      if(req.method!=='GET')return json(res,405,{ok:false,error:'Chỉ hỗ trợ GET.'});
      return json(res,200,{ok:true,service:'MarketGenius AI',runtime:'Node.js',status:'ready'});
    }
    if(url.pathname.startsWith('/api/browser-use/')){
      if(req.method!=='POST')return json(res,405,{ok:false,error:'Chỉ hỗ trợ POST.'});
      // Never accept cross-site POSTs to paid cloud operations.
      const origin=req.headers.origin;
      if(origin){let host='';try{host=new URL(origin).host.toLowerCase();}catch{}
        if(!host||host!==String(req.headers.host||'').toLowerCase())return json(res,403,{ok:false,error:'Yêu cầu không cùng nguồn.'});}
      const fetchSite=String(req.headers['sec-fetch-site']||'');
      if(fetchSite && !['same-origin','none'].includes(fetchSite))return json(res,403,{ok:false,error:'Yêu cầu không cùng nguồn.'});
      let body;try{body=JSON.parse(await readBody(req));}catch{return json(res,400,{ok:false,error:'JSON không hợp lệ.'});}
      if(!body||typeof body!=='object'||Array.isArray(body))return json(res,400,{ok:false,error:'Dữ liệu không hợp lệ.'});
      const ip=clientIp(req);
      try{
        let result;
        if(url.pathname==='/api/browser-use/start')result=await browserMedia.start(String(body.ticket||''),ip);
        else if(url.pathname==='/api/browser-use/status')result=await browserMedia.status(String(body.jobId||''),String(body.access||''),ip);
        else if(url.pathname==='/api/browser-use/cancel')result=await browserMedia.cancel(String(body.jobId||''),String(body.access||''),ip);
        else return json(res,404,{ok:false,error:'Không tìm thấy API.'});
        if(Array.isArray(result.campaigns))for(const item of result.campaigns){
          if(item?.image?.url){item.image.proxyUrl=signImageUrl(item.image.url);}
          for(const img of item?.images||[])if(img?.url)img.proxyUrl=signImageUrl(img.url);
        }
        return json(res,200,{ok:true,...result});
      }catch(err){
        // Never return API keys or provider response bodies.
        const code=Number(err.statusCode)||502;
        return json(res,code,{ok:false,error:String(err.message||'Không thể tìm nguồn bằng Browser Use.').slice(0,240)});
      }
    }
    if(url.pathname!=='/api/ai'){
      return await serveStatic(req,res,url.pathname,url.search);
    }
    if(!['GET','POST'].includes(req.method)){
      return json(res,405,{ok:false,error:'Chỉ hỗ trợ GET hoặc POST.'},req.method,{Allow:'GET, POST'});
    }
    let body='';
    if(req.method==='POST')body=await readBody(req);
    let payload;
    if(req.method==='POST'){
      try {payload=JSON.parse(body||'{}');}
      catch {return json(res,400,{ok:false,error:'JSON gửi lên không hợp lệ.'});}
    }
    // Same-origin browser API; no permissive CORS or public proxying.
    const origin=req.headers.origin;
    if(origin){
      let originHost='';try{originHost=new URL(origin).host.toLowerCase();}catch{}
      if(!originHost||originHost!==(req.headers.host||'').toLowerCase()){
        return json(res,403,{ok:false,error:'Yêu cầu không cùng nguồn với website.'});
      }
    }
    const event={httpMethod:req.method,headers:req.headers,body};
    const result=await aiHandler(event);
    const status=Number(result.statusCode)||500;
    const text=typeof result.body==='string'?result.body:JSON.stringify(result.body||{});
    let resultData;
    try{resultData=JSON.parse(text);}catch{resultData={ok:false,error:'Máy chủ trả phản hồi không hợp lệ.'};}
    // Same-origin signed image fallback avoids broken hotlinks on campaign cards.
    if(status===200&&Array.isArray(resultData?.ideas)){
      const seen=new Map();
      for(const idea of resultData.ideas){
        const r=idea?.resources;if(!r||!Array.isArray(r.images))continue;
        for(const item of r.images){
          if(item?.url){if(!seen.has(item.url))seen.set(item.url,signImageUrl(item.url));item.proxyUrl=seen.get(item.url);}
        }
        if(r.image?.url)r.image.proxyUrl=seen.get(r.image.url)||signImageUrl(r.image.url);
      }
    }
    if(status===200&&req.method==='POST'&&payload?.action==='guest-generate'&&resultData?.ok===true&&Array.isArray(resultData?.ideas)&&resultData.ideas.length===5){
      const ticket=browserMedia.issueTicket(clientIp(req),payload.brief?.product,resultData.ideas);
      if(ticket)resultData.mediaTicket=ticket;
      const freeTicket=freeMedia.issueTicket(clientIp(req),payload.brief,resultData.ideas);
      if(freeTicket)resultData.freeMediaTicket=freeTicket;
    }
    return json(res,status,resultData);
  }catch(error){
    // Do not print request body or any visitor API keys to the server log.
    const status=Number(error.statusCode)||500;
    return json(res,status,{ok:false,error:status===413?'Nội dung gửi lên quá dài.':'Máy chủ gặp lỗi khi xử lý yêu cầu.'});
  }
});

// Passenger/CloudLinux binds the listening socket; PORT is provided when present.
server.listen(process.env.PORT||3000,()=>{
  console.log('MarketGenius AI Node.js is ready.');
});
module.exports=server;
