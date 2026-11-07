'use strict';
/* Background web research, separate from Gemini. All paid API calls stay on the server. */
(() => {
  const node=document.getElementById('browserUseMediaStatus');
  if(!node)return;
  let active=null,serial=0;
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function post(path,data){
    const resp=await fetch('/api/browser-use/'+path,{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(data)});
    let json;try{json=await resp.json();}catch{throw new Error('Máy chủ tìm nguồn không trả JSON hợp lệ.');}
    if(!resp.ok||!json.ok)throw new Error(json.error||'Không lấy được nguồn tham khảo.');
    return json;
  }
  function show(message,mode='working',cancel=false){
    node.className='cloud-media-status '+mode;
    node.innerHTML=`<span class="cloud-media-dot" aria-hidden="true"></span><span class="cloud-media-message">${escapeText(message)}</span>${cancel?'<button type="button" class="cloud-media-cancel" id="browserUseMediaCancel">Dừng tìm nguồn</button>':''}`;
    node.hidden=false;
  }
  async function stopCurrent(){
    const old=active;active=null;serial++;
    if(!old)return;
    try{await post('cancel',{jobId:old.jobId,access:old.access});}catch{}
  }
  async function start(ticket,ideaIds){
    if(!ticket||!Array.isArray(ideaIds)||ideaIds.length!==5)return;
    // New generation takes precedence. A previous run is cancelled to limit charges.
    const previous=active;active=null;serial++;
    const runSerial=serial;
    if(previous)post('cancel',{jobId:previous.jobId,access:previous.access}).catch(()=>{});
    show('Đang kết nối Browser Use để tự tìm ảnh và video cho từng chiến dịch…','working');
    let handle;
    try{handle=await post('start',{ticket});}
    catch(e){if(runSerial===serial)show('Chưa tìm được nguồn bổ sung: '+e.message,'error');return;}
    if(runSerial!==serial){post('cancel',{jobId:handle.jobId,access:handle.access}).catch(()=>{});return;}
    active={jobId:handle.jobId,access:handle.access};
    const started=Date.now();
    while(active&&runSerial===serial){
      await pause(4000);
      if(runSerial!==serial||!active)break;
      let data;
      try{data=await post('status',{jobId:active.jobId,access:active.access});}
      catch(e){show('Mất kết nối khi tìm nguồn: '+e.message,'error');active=null;return;}
      if(runSerial!==serial)return;
      if(data.status==='completed'){
        active=null;
        const count=(data.campaigns||[]).reduce((total,r)=>total+(r.image?1:0)+(r.videos?.length||0)+(r.articles?.length||0),0);
        if(count){window.MGApplyBrowserUseSources?.(ideaIds,data.campaigns);
          show(`Đã tìm thêm ${count} ảnh/video/bài viết từ Browser Use. Hãy kiểm tra nguồn trước khi sử dụng.`,'done');}
        else show('Browser Use chưa tìm được nguồn phù hợp có URL hợp lệ cho bộ chiến dịch này.','neutral');
        return;
      }
      if(data.status==='failed'||data.status==='cancelled'){
        active=null;show(data.error||'Browser Use không hoàn thành lượt tìm nguồn.','error');return;
      }
      if(Date.now()-started>90000)show('Browser Use vẫn đang tìm nguồn; 5 chiến dịch đã hiển thị và có thể sử dụng ngay.','working',true);
      else show('Browser Use đang duyệt web, tìm ảnh và video riêng cho 5 chiến dịch…','working',true);
    }
  }
  node.addEventListener('click',event=>{
    if(event.target?.id!=='browserUseMediaCancel')return;
    const old=active;active=null;serial++;
    show('Đã gửi yêu cầu dừng tìm nguồn.','neutral');
    if(old)post('cancel',{jobId:old.jobId,access:old.access}).catch(()=>{});
  });
  window.MGBrowserUseMedia={start,stop:stopCurrent};
})();
