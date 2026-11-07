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


// A lightweight safety brake for the site's own Gemini quota. It resets when
// the Node process restarts and is NOT a durable multi-worker rate limiter.
const guestHits=new Map();
const guestLastGenerate=new Map();
const guestGlobal={day:'',count:0};
const guestIpMax=boundedInt(process.env.GUEST_IP_DAILY_LIMIT,5,1,500);
const guestTotalMax=boundedInt(process.env.GUEST_DAILY_LIMIT,60,1,10000);
const GENERATE_GAP_MS=20000;
function boundedInt(value,fallback,min,max){const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback;}
function getDay(){return new Date().toISOString().slice(0,10);}
function clientIp(req){
  const peer=String(req.socket.remoteAddress||'');
  const viaProxy=peer==='127.0.0.1'||peer==='::1'||peer==='::ffff:127.0.0.1';
  const forwarded=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
  return viaProxy && forwarded && forwarded.length<100 ? forwarded : peer||'unknown';
}
function guestQuotaExhausted(req){
  const day=getDay();
  if(guestGlobal.day!==day)return false;
  return guestGlobal.count>=guestTotalMax || (guestHits.get(clientIp(req))||0)>=guestIpMax;
}
function reserveGuestCall(req,action){
  const day=getDay();
  if(guestGlobal.day!==day){guestGlobal.day=day;guestGlobal.count=0;guestHits.clear();guestLastGenerate.clear();}
  const ip=clientIp(req);
  const count=guestHits.get(ip)||0;
  if(count>=guestIpMax||guestGlobal.count>=guestTotalMax){
    const error=new Error('AI có sẵn đã đạt hạn mức. Bạn có thể thử lại sau hoặc dùng Demo ngay.');
    error.statusCode=429;error.code='guest_site_limit';throw error;
  }
  if(action==='guest-generate' && Date.now()-(guestLastGenerate.get(ip)||0)<GENERATE_GAP_MS){
    const error=new Error('Vui lòng chờ ít nhất 20 giây giữa hai lượt tạo chiến dịch hoặc dùng Demo.');
    error.statusCode=429;error.code='guest_cooldown';throw error;
  }
  // Reserve before the Gemini call, even if Gemini fails. CAPTCHA failures never reach here.
  guestHits.set(ip,count+1);guestGlobal.count++;
  if(action==='guest-generate')guestLastGenerate.set(ip,Date.now());
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
    if(url.pathname==='/healthz'){
      if(req.method!=='GET')return json(res,405,{ok:false,error:'Chỉ hỗ trợ GET.'});
      return json(res,200,{ok:true,service:'MarketGenius AI',runtime:'Node.js',status:'ready'});
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
    const event={httpMethod:req.method,headers:req.headers,body,
      beforeGuestGemini:(action)=>reserveGuestCall(req,action)};
    const result=await aiHandler(event);
    const status=Number(result.statusCode)||500;
    const text=typeof result.body==='string'?result.body:JSON.stringify(result.body||{});
    let resultData;
    try{resultData=JSON.parse(text);}catch{resultData={ok:false,error:'Máy chủ trả phản hồi không hợp lệ.'};}
    if(req.method==='GET'&&status===200&&guestQuotaExhausted(req)){
      resultData.guestAvailable=false;resultData.guestModel=null;resultData.turnstileSiteKey=null;
    }
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
