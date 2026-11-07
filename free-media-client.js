'use strict';
/* Free Pixabay/YouTube lookup runs AFTER Gemini; the five campaigns remain usable. */
(() => {
  const node=document.getElementById('freeMediaStatus');if(!node)return;
  let generation=0,active=false,controller=null;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const show=(text,mode='working',cancel=false)=>{
    node.hidden=false;node.className='cloud-media-status '+mode;
    node.innerHTML=`<span class="cloud-media-dot" aria-hidden="true"></span><span class="cloud-media-message">${escape(text)}</span>${cancel?'<button type="button" class="cloud-media-cancel" id="freeMediaCancel">Dừng tìm nguồn</button>':''}`;
  };
  function stop(){generation++;active=false;controller?.abort();controller=null;node.hidden=true;}
  async function start(ticket,ideaIds){
    if(!ticket||!Array.isArray(ideaIds)||ideaIds.length!==5)return;
    stop();const current=++generation;
    active=true;controller=new AbortController();
    show('Đang tìm ảnh Google / Pinterest / Pixabay và video YouTube riêng cho 5 chiến dịch…','working',true);
    try{
      const response=await fetch('/api/free-media/search',{method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket}),signal:controller.signal});
      const data=await response.json();
      if(current!==generation)return;
      if(!response.ok||!data.ok)throw Error(data.error||'Không lấy được ảnh và video.');
      const count=(data.campaigns||[]).reduce((acc,x)=>acc+(x.images?.length||0)+(x.videos?.length||0),0);
      const warning=Array.isArray(data.warnings)&&data.warnings.length?' Có cảnh báo: '+data.warnings.slice(0,2).join('; '):'';
      if(count){window.MGApplyExternalSources?.(ideaIds,data.campaigns,'Google Images / Pinterest / Pixabay / YouTube');
        node.hidden=true; // Sources are already displayed inside campaign cards.
      }
      else show('Chưa tìm được ảnh/video phù hợp. Bạn vẫn có thể sử dụng 5 chiến dịch đã tạo.'+warning,warning?'error':'neutral');
    }catch(e){
      if(current===generation&&e.name!=='AbortError')show('Chưa tìm được nguồn: '+e.message,'error');
    }finally{if(current===generation){active=false;controller=null;}}
  }
  node.addEventListener('click',e=>{if(e.target?.id==='freeMediaCancel'){stop();show('Đã dừng chờ kết quả tìm nguồn.','neutral');}});
  window.MGFreeMedia={start,stop};
})();
