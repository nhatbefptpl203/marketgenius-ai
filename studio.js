'use strict';
/* MarketGenius AI Studio v1.3: local history, editable campaign plans, fair budget splits,
   comparison, browser PDF export and transparent API error recovery.
   The API key never enters persistent storage. */
(() => {
  const HISTORY_KEY = 'marketgenius-campaign-history-v13';
  const MAX_HISTORY = 18;
  const studio = { history: [], comparing: new Set(), editingId: null, requestController: null,
    cancelled: false, sourceBeforeGenerate: null, printTitle: '' };
  const safe = esc;
  const currency = (v) => Number(v).toLocaleString('vi-VN') + ' ₫';
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const dateTime = (d) => new Date(d).toLocaleString('vi-VN');
  const el = (id) => document.getElementById(id);
  const notifyInfo = (text, type = 'success') => notify(text, type);

  // Stage 4.7: honest elapsed-time *estimate*; no server-side progress is available.
  // Embedded in studio.js so the cPanel static whitelist needs no extra JS asset.
  const progressUI = (() => {
    const panel = el('progressPanel');
    const rail = el('progressTrack');
    const fill = el('progressFill');
    const percent = el('progressPercent');
    const label = el('progressLabel');
    const detail = el('progressDetail');
    let intervalId = null;
    let finishIntervalId = null;
    let delayId = null;
    let resolveCompletion = null;
    let active = false;
    let elapsedStart = 0;
    let current = 0;
    let ariaValue = -5;
    let lastLabel = '';
    const stages = {
      send: 'Đang gửi brief',
      analyze: 'AI đang phân tích sản phẩm và mục tiêu',
      write: 'Đang viết 5 chiến dịch và timeline 4 tuần',
      check: 'Đang kiểm tra ngân sách và KPI',
      long: 'AI đang xử lý lâu hơn bình thường, vui lòng chờ thêm',
      done: 'Hoàn tất'
    };
    function stage(text) {
      if (lastLabel !== text) { lastLabel = text; label.textContent = text; }
    }
    function update(value, forceAria = false) {
      current = Math.max(current, Math.min(100, value));
      const shown = Math.round(current);
      if (percent.textContent !== `${shown}%`) percent.textContent = `${shown}%`;
      fill.style.width = `${current}%`;
      // Screen readers are notified only every ~5 percentage points and at completion.
      if (forceAria || shown >= ariaValue + 5 || shown === 100) {
        rail.setAttribute('aria-valuenow', String(shown));
        ariaValue = shown;
      }
    }
    function tick() {
      if (!active) return;
      const elapsed = (performance.now() - elapsedStart) / 1000;
      const estimated = elapsed > 60 ? 95 : Math.min(95, 95 * (1 - Math.exp(-elapsed / 20)));
      update(Math.max(1, estimated));
      stage(elapsed > 60 ? stages.long : current < 10 ? stages.send : current < 35 ? stages.analyze : current < 75 ? stages.write : stages.check);
      if (elapsed > 60) detail.textContent = 'Ước tính theo thời gian; máy chủ AI chưa gửi kết quả.';
    }
    function stop() {
      active = false;
      if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
      if (finishIntervalId !== null) { clearInterval(finishIntervalId); finishIntervalId = null; }
      if (delayId !== null) { clearTimeout(delayId); delayId = null; }
      if (resolveCompletion) { const resolve = resolveCompletion; resolveCompletion = null; resolve(); }
    }
    function start() {
      stop();
      current = 0;
      ariaValue = -5;
      lastLabel = '';
      elapsedStart = performance.now();
      active = true;
      panel.classList.remove('hidden');
      detail.textContent = 'Phần trăm dựa trên thời gian chờ, không phải tiến độ thật từ AI.';
      stage(stages.send);
      update(1, true);
      intervalId = setInterval(tick, 250);
    }
    function complete() {
      if (!active) return Promise.resolve();
      if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
      const initial = current;
      const startedAt = performance.now();
      return new Promise(resolve => {
        resolveCompletion = resolve;
        function animate() {
          if (!active) return;
          const fraction = Math.min(1, (performance.now() - startedAt) / 300);
          update(initial + (100 - initial) * fraction, fraction === 1);
          if (fraction === 1) {
            clearInterval(finishIntervalId);
            finishIntervalId = null;
            stage(stages.done);
            detail.textContent = 'Đã nhận đủ 5 chiến dịch.';
            delayId = setTimeout(() => {
              delayId = null;
              resolveCompletion = null;
              resolve();
            }, 400);
          }
        }
        // Use a clock-based timer instead of rAF: completion also finishes in background tabs.
        finishIntervalId = setInterval(animate, 30);
      });
    }
    return {start, stop, complete};
  })();
  window.MGProgress = progressUI;

  function loadHistory() {
    try {
      const value=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
      if(!Array.isArray(value))return [];
      return value.filter(r=>r&&Array.isArray(r.ideas)&&r.ideas.length===5&&r.brief)
        .slice(0,MAX_HISTORY).map(entry=>{
          // Legacy records repeat resources per idea. New records share them once.
          const shared=entry.resources||entry.ideas.find(i=>i.resources)?.resources;
          if(shared)entry.ideas.forEach(idea=>{if(!idea.resources)idea.resources=clone(shared);});
          return entry;
        });
    }catch{return [];}
  }
  function compactHistory(){
    return studio.history.map(entry=>{
      const copy=clone(entry);
      const shared=copy.resources||copy.ideas.find(idea=>idea.resources)?.resources;
      if(shared){copy.resources=clone(shared);delete copy.resources.suggestions;delete copy.resources.diagnostic;}
      copy.ideas=copy.ideas.map(idea=>{const clean=lightweightIdea(idea);delete clean.resources;return clean;});
      return copy;
    });
  }
  studio.history=loadHistory();
  window.MGPruneOldestHistory=()=>{
    if(!studio.history.length)return false;
    studio.history.pop();
    try{localStorage.setItem(HISTORY_KEY,JSON.stringify(compactHistory()));return true;}
    catch{return false;}
  };
  function saveHistory(){
    return saveLocalWithHistoryEviction(HISTORY_KEY,compactHistory,window.MGPruneOldestHistory);
  }
  const baseNormalize = normalizeIdeas;
  const baseDemo = makeDemoIdeas;
  const baseCard = renderCard;
  const baseDetails = detailContent;
  const baseGenerate = generate;
  const baseShortlist = renderShortlist;
  const baseResult = renderResults;
  const baseBusy = busy;
  const baseChangeView = changeView;
  const baseIdeaText = ideaToText;

  function startingSplit(idea) {
    const channel = `${idea.channel||''} ${idea.concept||''}`.toLowerCase();
    let weights = [30, 30, 15, 15, 10];
    if (/tiktok|reels|video|youtube/.test(channel)) weights = [35, 30, 15, 10, 10];
    else if (/giới thiệu|referral|zalo|khách hàng cũ|email/.test(channel)) weights = [20, 20, 15, 35, 10];
    else if (/koc|influencer/.test(channel)) weights = [25, 20, 35, 10, 10];
    return ['Nội dung & thiết kế', 'Quảng cáo & phân phối', 'KOC / cộng đồng', 'Thử nghiệm & đo lường', 'Dự phòng']
      .map((label,i) => ({label,percent:weights[i]}));
  }
  function planIdea(idea, budgetAmount) {
    if (!idea || typeof idea !== 'object') return idea;
    if (!Array.isArray(idea.allocations) || !idea.allocations.length) idea.allocations = startingSplit(idea);
    idea.allocations = idea.allocations.slice(0, 8).map(x => ({label:String(x.label||'Hoạt động').slice(0,85),percent:Number(x.percent)||0}));
    if (!Array.isArray(idea.doneWeeks) || idea.doneWeeks.length !== 4) idea.doneWeeks = [false,false,false,false];
    if (idea.budgetAmount === undefined) idea.budgetAmount = budgetAmount == null ? null : Number(budgetAmount);
    if (!Array.isArray(idea.kpis)) idea.kpis=[];
    return idea;
  }
  function exactShares(weights,total){
    const clean=weights.map(w=>Number.isFinite(Number(w)) && Number(w)>0?Math.min(1000,Number(w)):1);
    const denominator=clean.reduce((a,b)=>a+b,0);
    const exact=clean.map(w=>total*w/denominator);
    const ints=exact.map(Math.floor);
    let remaining=total-ints.reduce((a,b)=>a+b,0);
    const order=exact.map((v,i)=>({i,frac:v-ints[i]})).sort((a,b)=>b.frac-a.frac || a.i-b.i);
    for(let i=0;i<remaining;i++)ints[order[i%order.length].i]++;
    return ints;
  }
  function applyBudgetScenario(items,brief){
    if(brief?.briefMode!=='advanced' || brief.context?.scenario!=='portfolio')return items;
    if(items.length!==5||!Number.isSafeInteger(Number(brief.budgetAmount)))return items;
    const budget=Number(brief.budgetAmount);
    const weights=items.map(i=>i.portfolioWeight||1);
    const amounts=exactShares(weights,budget);
    const shares=exactShares(weights,100);
    return items.map((idea,i)=>{
      idea.budgetAmount=amounts[i];idea.portfolioTotal=budget;idea.portfolioPercent=shares[i];idea.portfolioMode='portfolio';
      return idea;
    });
  }
  normalizeIdeas = function (list) {
    return applyBudgetScenario(baseNormalize(list).map(item => planIdea(item, state.brief?.budgetAmount)),state.brief);
  };
  makeDemoIdeas = function (brief) {
    return applyBudgetScenario(baseDemo(brief).map(item => planIdea(item, brief.budgetAmount)),brief);
  };
  window.renderPortfolioSummary = function(items,brief){
    const box=el('portfolioSummary');if(!box)return;
    const portfolio=brief?.context?.scenario==='portfolio' && items?.length===5 && items.every(i=>i.portfolioMode==='portfolio');
    box.classList.toggle('hidden',!portfolio);
    if(!portfolio){box.innerHTML='';return;}
    const total=Number(brief.budgetAmount)||0;
    const spent=items.reduce((sum,item)=>sum+(Number(item.budgetAmount)||0),0);
    box.innerHTML=`<div class="portfolio-summary-head"><div><span class="section-overline">KẾ HOẠCH NGÂN SÁCH CHUNG</span><h3>5 hoạt động · Tổng ${safe(currency(total))}</h3><p>Đây là 5 phần bổ trợ nhau, không phải 5 lần ngân sách. Phân bổ là dự toán cần kiểm chứng trước khi thực hiện.</p></div><b class="portfolio-check">${spent===total?'✓ Đã khớp ngân sách':'⚠ Cần kiểm tra'}</b></div><div class="portfolio-lines">${items.map((idea,i)=>`<div><span>${i+1}. ${safe(idea.title)}</span><strong>${safe(currency(idea.budgetAmount))} <small>(${idea.portfolioPercent}%)</small></strong></div>`).join('')}</div><div class="portfolio-total"><span>TỔNG 5 HOẠT ĐỘNG</span><strong>${safe(currency(spent))}</strong></div>`;
  };
  state.saved.forEach(item => planIdea(item, null));
  studio.history.forEach(h => h.ideas.forEach(idea => planIdea(idea, h.brief?.budgetAmount)));

  function budgetAmounts(idea) {
    if(idea.budgetAmount===null || !Number.isFinite(idea.budgetAmount))return null;
    // Largest remainder method: total of rounded VND allocations equals the exact brief budget.
    const budget=Math.round(idea.budgetAmount);
    const exact=idea.allocations.map(a=>budget*Number(a.percent||0)/100);
    const result=exact.map(Math.floor);
    let remaining=budget-result.reduce((a,b)=>a+b,0);
    const order=exact.map((x,i)=>({i,frac:x-result[i]})).sort((a,b)=>b.frac-a.frac);
    for(let i=0;i<remaining&&i<order.length;i++)result[order[i].i]++;
    return result;
  }
  function amountOrDash(idea,percentage,index=null) {
    const amounts=budgetAmounts(idea);
    return amounts ? currency(index===null?Math.round(idea.budgetAmount*percentage/100):amounts[index]) : 'Chưa nhập ngân sách';
  }
  function allocationTable(idea) {
    planIdea(idea,null);
    const sum = idea.allocations.reduce((a,b)=> a + Number(b.percent||0),0);
    return `<div class="table-scroll"><table class="studio-table"><thead><tr><th>Hạng mục</th><th>Tỷ trọng</th><th>Dự toán</th></tr></thead><tbody>${idea.allocations.map((a,i)=>`<tr><td>${safe(a.label)}</td><td>${a.percent}%</td><td>${safe(amountOrDash(idea,a.percent,i))}</td></tr>`).join('')}</tbody><tfoot><tr><th>Tổng</th><th>${sum}%</th><th>${idea.budgetAmount===null ? '—' : safe(currency(idea.budgetAmount))}</th></tr></tfoot></table></div><p class="studio-disclaimer">Phân bổ minh họa theo loại chiến dịch; không phải báo giá thị trường. Có thể chỉnh sửa trong “Chỉnh sửa”.</p>`;
  }
  // Detailed output is progressive: compact cards are unchanged; useful extras
  // appear only on demand and remain backwards-compatible with older shortlist records.
  function extraOutput(idea) {
    const rows = [
      ['Vì sao phù hợp?',idea.rationale],
      ['Nội dung quảng cáo mẫu & CTA',idea.sampleContent],
      ['Rủi ro và phương án dự phòng',idea.riskPlan]
    ].filter(([_,value])=>typeof value==='string'&&value.trim());
    const facts=Array.isArray(idea.evidence?.facts)?idea.evidence.facts:[];
    const caveats=[...(Array.isArray(idea.assumptions)?idea.assumptions:[]),...(Array.isArray(idea.evidence?.caveats)?idea.evidence.caveats:[])];
    const evidence=(facts.length||caveats.length)?`<div class="evidence-grid"><section class="evidence-card evidence-facts"><h4>✓ Thông tin bạn cung cấp</h4><p class="evidence-sub">Chưa được website kiểm chứng độc lập</p><ul>${facts.slice(0,9).map(v=>`<li>${safe(v)}</li>`).join('')}</ul></section><section class="evidence-card evidence-assumptions"><h4>⚠ Giả định cần kiểm chứng</h4><p class="evidence-sub">Không dùng làm cam kết quảng cáo</p><ul>${[...new Set(caveats)].slice(0,6).map(v=>`<li>${safe(v)}</li>`).join('')}</ul></section></div>`:'';
    return `${evidence || '<p class="studio-disclaimer">Chiến dịch lưu từ phiên bản cũ chưa có phân loại dữ kiện/giả định. Vui lòng kiểm chứng trước khi sử dụng.</p>'}${rows.length ? `<div class="quality-extras">${rows.map(([heading,content])=>`<section class="quality-extra"><h4>${safe(heading)}</h4><p>${safe(content)}</p></section>`).join('')}</div>` : ''}`;
  }
  function timelineTable(idea, interactive = true) {
    planIdea(idea,null);
    return `<div class="table-scroll"><table class="studio-table timeline-table"><thead><tr><th>Tuần</th><th>Nhiệm vụ triển khai</th><th>Trạng thái</th></tr></thead><tbody>${idea.timeline.map((w,i)=>`<tr><td><b>Tuần ${i+1}</b></td><td>${safe(w.task)}</td><td>${interactive ? `<label class="done-week"><input type="checkbox" data-action="week-toggle" data-id="${safe(idea.id)}" data-week="${i}" ${idea.doneWeeks[i]?'checked':''}/> <span>${idea.doneWeeks[i]?'Đã xong':'Chưa xong'}</span></label>` : (idea.doneWeeks[i]?'Đã xong':'Chưa xong')}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function refreshViews() {
    if (state.ideas.length) el('ideasGrid').innerHTML=state.ideas.map(i=>renderCard(i)).join('');
    baseShortlist();
    renderHistory();
    updateComparison();
  }
  function saveUpdatedIdea(idea) {
    const inSaved = state.saved.find(x=>x.id===idea.id);
    if (inSaved && inSaved!==idea) Object.assign(inSaved,clone(idea));
    for (const entry of studio.history) {
      const match=entry.ideas.find(x=>x.id===idea.id);
      if (match && match!==idea) Object.assign(match,clone(idea));
    }
    saveStorage(); saveHistory(); refreshViews();
    if (el('detailsDialog').open) el('detailsContent').innerHTML = detailContent(idea);
    if (el('compareDialog').open) showComparison();
  }
  // Referenced media are website search results, not AI-generated or guessed URLs.
  // Each campaign shares product-level sources; relevance must be checked by users.
  // Use direct <img> tags in every campaign; try another found photo if a
  // website blocks hotlinking. Sources are still clickable for context.
  function mediaPhoto(idea,mode){
    const m=idea.resources||{};
    const images=[...(Array.isArray(m.images)?m.images:[])];
    if(m.image&&!images.some(x=>x.url===m.image.url))images.unshift(m.image);
    const list=images.filter(x=>x&&/^https:\/\//.test(x.url)).slice(0,6);
    const cls=mode==='detail'?'reference-photo':'media-thumbnail';
    if(!list.length){
      const status=m.diagnostic?.imageSearchStatus;
      const hint=status==='no_access'?'Tìm ảnh AI: tài khoản chưa được cấp quyền':status==='rate_limited'?'Tìm ảnh AI: đã hết hạn mức':status==='bad_model'?'Tìm ảnh AI: model không hỗ trợ': 'Chưa nhận được URL ảnh trực tiếp';
      return `<a class="${cls} ${mode==='detail'?'reference-photo-empty':'media-thumbnail-empty'}" href="${safe(m.searchLinks?.imageSearch||'#')}" target="_blank" rel="noopener noreferrer"><span>⌕</span><small>${safe(hint)} · Xem Google Hình ảnh</small></a>`;
    }
    const img=list[0];
    const alternatives=JSON.stringify([...(list[0].proxyUrl?[list[0].proxyUrl]:[]),...list.slice(1).flatMap(x=>[x.url,...(x.proxyUrl?[x.proxyUrl]:[])])]);
    return `<a class="${cls}" href="${safe(img.sourceUrl||img.url)}" target="_blank" rel="noopener noreferrer" title="Mở trang chứa ảnh"><img class="product-source-image" src="${safe(img.url)}" data-alt-urls="${safe(alternatives)}" alt="Ảnh sản phẩm tham khảo" loading="lazy" referrerpolicy="no-referrer"/><span class="image-fallback">Không thể tải ảnh từ website bên ngoài</span>${mode==='detail'?`<small>${safe(img.label||'Ảnh sản phẩm tham khảo')}</small>`:''}</a>`;
  }
  function productMediaCard(idea){
    const m=idea.resources;
    if(!m)return '<p class="media-pending">Ảnh, video và bài viết chưa được tra cứu ở lần tạo này.</p>';
    const imageBlock=mediaPhoto(idea,'card');
    const oneVideo=(m.videos||[])[0],oneArticle=(m.articles||[])[0];
    return `<div class="media-card"><div class="media-card-image">${imageBlock}</div><div class="media-card-links"><strong>Hình ảnh & nguồn tham khảo</strong>
      ${oneVideo?`<a href="${safe(oneVideo.url)}" target="_blank" rel="noopener noreferrer">▶ TikTok: ${safe(oneVideo.title)}</a>`:`<a href="${safe(m.searchLinks?.tiktokSearch||'#')}" target="_blank" rel="noopener noreferrer">▶ Tìm review TikTok (chưa thấy video cụ thể)</a>`}
      ${oneArticle?`<a href="${safe(oneArticle.url)}" target="_blank" rel="noopener noreferrer">▤ Bài viết: ${safe(oneArticle.title)}</a>`:`<a href="${safe(m.searchLinks?.articleSearch||'#')}" target="_blank" rel="noopener noreferrer">▤ Tìm bài viết (chưa có nguồn phù hợp)</a>`}
      <small>Ảnh và liên kết tham khảo</small></div></div>`;
  }
  function productMediaDetail(idea,printMode=false){
    const m=idea.resources;
    if(!m)return `<section class="product-research"><h4>Ảnh sản phẩm, video & bài báo tham khảo</h4><p class="studio-disclaimer">Chiến dịch này chưa có dữ liệu tìm kiếm. Hãy tạo mới bằng Gemini để tra cứu nguồn thực tế.</p></section>`;
    const photo=mediaPhoto(idea,'detail');
    const img=m.image;
    const rows=(items,fallback,title)=>items?.length
      ?`<ul class="reference-links">${items.map(item=>`<li><a href="${safe(item.url)}" target="_blank" rel="noopener noreferrer">${safe(item.title||'Mở nguồn tham khảo')} ↗</a>${item.source||item.verification?`<small>${safe(item.source||item.verification)}</small>`:''}</li>`).join('')}</ul>`
      :`<p class="studio-disclaimer">Chưa tìm được liên kết ${safe(title)} cụ thể. <a href="${safe(fallback||'#')}" target="_blank" rel="noopener noreferrer">Tìm thêm trên nền tảng ↗</a></p>`;
    const suggestions=!printMode && (m.suggestions||[]).length?`<details class="google-grounding-suggestions"><summary>Đề xuất tìm kiếm Google</summary>${m.suggestions.map((html,i)=>`<iframe title="Google Search ${i+1}" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer" loading="lazy" srcdoc="${safe(html)}"></iframe>`).join('')}</details>`:'';
    return `<section class="product-research"><h4>Ảnh sản phẩm, video TikTok & bài báo tham khảo</h4><div class="product-research-grid"><div>${photo}</div><div class="reference-source-list"><h5>▶ Video TikTok review</h5>${rows(m.videos,m.searchLinks?.tiktokSearch,'video TikTok')}<p class="reference-caveat">Không xác nhận lượt xem hoặc độ viral khi nguồn không công bố số liệu.</p><h5>▤ Bài viết / bài báo</h5>${rows(m.articles,m.searchLinks?.articleSearch,'bài báo')}</div></div><p class="studio-disclaimer">${safe(m.note||'Nguồn tham khảo cần được kiểm tra trước khi sử dụng.')} ${img?'Ảnh có thể có quyền sử dụng riêng.':''}</p>${suggestions}</section>`;
  }
  document.addEventListener('error',event=>{
    const img=event.target; if(!img?.matches?.('img.product-source-image'))return;
    let alternatives=[];try{alternatives=JSON.parse(img.dataset.altUrls||'[]');}catch{}
    if(alternatives.length){img.dataset.altUrls=JSON.stringify(alternatives.slice(1));img.src=alternatives[0];return;}
    img.closest('.media-thumbnail,.reference-photo')?.classList.add('failed-image');
  },true);
  renderCard = function(idea, savedView=false) {
    planIdea(idea,null);
    const checked = studio.comparing.has(idea.id);
    const tools = `<div class="studio-card-tools"><label class="studio-compare-toggle"><input aria-label="Chọn so sánh ${safe(idea.title)}" type="checkbox" data-action="compare" data-id="${safe(idea.id)}" ${checked?'checked':''}/> So sánh</label>
      <details class="mg-card-menu"><summary aria-label="Thao tác với chiến dịch ${safe(idea.title)}" aria-haspopup="menu" aria-expanded="false">${icon('more')}</summary><div class="mg-card-menu-items" role="menu">
      <button role="menuitem" type="button" data-action="edit" data-id="${safe(idea.id)}">Chỉnh sửa</button><button role="menuitem" type="button" data-action="pdf" data-id="${safe(idea.id)}">Xuất PDF</button><button role="menuitem" type="button" data-action="copy" data-id="${safe(idea.id)}">Sao chép</button>${savedView?`<button role="menuitem" type="button" data-action="remove" data-id="${safe(idea.id)}">Xóa khỏi shortlist</button>`:''}</div></details></div>`;
    return baseCard(idea,savedView).replace('<div class="idea-footer">',productMediaCard(idea)+tools+'<div class="idea-footer">');
  };
  detailContent = function(idea) {
    planIdea(idea,null);
    return `<div class="detail-header"><div class="detail-header-top"><span class="idea-number">KẾ HOẠCH MARKETING · 04 TUẦN</span><button type="button" class="icon-button dialog-close" data-action="close-dialog" aria-label="Đóng">${icon('close')}</button></div><h2 class="detail-title">${safe(idea.title)}</h2><p class="detail-summary">${safe(idea.concept)}</p></div>
    <div class="detail-body"><div class="detail-info-grid"><div class="detail-info"><span>KÊNH TRIỂN KHAI</span><p>${safe(idea.channel)}</p></div><div class="detail-info"><span>KHÁCH HÀNG MỤC TIÊU</span><p>${safe(idea.audience||'Theo brief sản phẩm')}</p></div><div class="detail-info"><span>THÔNG ĐIỆP / HOOK</span><p>${safe(idea.hook||'Nội dung thu hút khách hàng mục tiêu')}</p></div><div class="detail-info"><span>${idea.portfolioMode==='portfolio'?'PHẦN NGÂN SÁCH TRONG KẾ HOẠCH CHUNG':'NGÂN SÁCH'}</span><p>${idea.budgetAmount===null?'Chưa nhập mức tiền cụ thể':safe(currency(idea.budgetAmount))}${idea.portfolioMode==='portfolio'?` / tổng ${safe(currency(idea.portfolioTotal))} (${idea.portfolioPercent}%)`:''}</p></div></div>
    ${idea.strategy?`<p class="quality-strategy"><strong>Hướng chiến lược:</strong> ${safe(idea.strategy)}</p>`:''}
    ${extraOutput(idea)}
    ${productMediaDetail(idea)}
    <h4>Phân bổ ngân sách tham khảo</h4>${allocationTable(idea)}
    <h4>Timeline công việc 4 tuần</h4>${timelineTable(idea)}
    <h4>KPI mục tiêu (đo lường, không bảo đảm kết quả)</h4><div class="kpi-list">${(idea.kpis.length?idea.kpis:['Lượt tiếp cận','Tương tác','Chuyển đổi']).map(kpi=>`<span class="kpi-chip">${safe(kpi)}</span>`).join('')}</div>
    <p class="studio-disclaimer">Tích vào từng tuần để theo dõi tiến độ. Các thay đổi lưu trên trình duyệt hiện tại.</p></div>
    <div class="detail-footer"><button type="button" class="btn btn-outline small" data-action="edit" data-id="${safe(idea.id)}">✎ Chỉnh sửa</button><button type="button" class="btn btn-outline small" data-action="pdf" data-id="${safe(idea.id)}">⇩ Xuất PDF</button><button type="button" class="btn btn-outline small" data-action="copy" data-id="${safe(idea.id)}">${icon('copy')} Sao chép</button><button type="button" class="btn btn-primary small" data-action="save" data-id="${safe(idea.id)}">${icon('bookmark')} ${state.saved.some(x=>x.id===idea.id)?'Bỏ lưu':'Lưu shortlist'}</button></div>`;
  };
  ideaToText = function(idea) {
    planIdea(idea,null);
    const resources=idea.resources;
    const references=resources?`\n\nNGUỒN THAM KHẢO CÓ ĐƯỜNG DẪN:\nẢnh: ${resources.image?.sourceUrl||'Chưa tìm thấy'}\nVideo TikTok:\n${(resources.videos||[]).map(v=>`${v.title}: ${v.url}`).join('\n')||'Chưa tìm thấy'}\nBài báo/bài viết:\n${(resources.articles||[]).map(v=>`${v.title}: ${v.url}`).join('\n')||'Chưa tìm thấy'}\nLưu ý: chưa xác minh độ viral của video.`:'\n\nChưa tra cứu nguồn trực tuyến.';
    return `${baseIdeaText(idea)}${references}\n\nTHÔNG TIN NGƯỜI DÙNG CUNG CẤP (CHƯA KIỂM CHỨNG ĐỘC LẬP):\n${(idea.evidence?.facts||[]).join('\n')}\nGIẢ ĐỊNH CẦN KIỂM CHỨNG:\n${[...(idea.assumptions||[]),...(idea.evidence?.caveats||[])].join('\n')}\n\nHƯỚNG TIẾP CẬN: ${idea.strategy||'Theo brief'}\nVÌ SAO PHÙ HỢP: ${idea.rationale||'Chưa có dữ liệu'}\nNỘI DUNG MẪU + CTA: ${idea.sampleContent||'Chưa có dữ liệu'}\nRỦI RO / DỰ PHÒNG: ${idea.riskPlan||'Chưa có dữ liệu'}\n\nPHÂN BỔ NGÂN SÁCH (THAM KHẢO)\n${idea.allocations.map((a,i)=>`${a.label}: ${a.percent}%${idea.budgetAmount===null?'':` · ${amountOrDash(idea,a.percent,i)}`}`).join('\n')}\nTiến độ: ${idea.doneWeeks.filter(Boolean).length}/4 tuần`;
  };

  function recordHistory() {
    const item={id:newId(),createdAt:new Date().toISOString(),brief:clone(state.brief),source:state.source,
      provider:state.source==='guest'?'gemini (AI có sẵn)':null,
      model:state.source==='guest'?guestModel:null,ideas:clone(state.ideas)};
    studio.history.unshift(item);
    studio.history = studio.history.slice(0,MAX_HISTORY);
    saveHistory();renderHistory();
  }
  generate = async function(useDemo=false) {
    const before=state.ideas;
    studio.cancelled=false;
    el('aiAlert').classList.add('hidden');
    await baseGenerate(useDemo);
    if (state.ideas !== before && state.ideas.length===5) { studio.comparing.clear(); updateComparison(); recordHistory(); }
  };
  busy = function(active, useDemo = false) {
    baseBusy(active);
    if (active && !useDemo) {
      el('cancelGenerationBtn').classList.remove('hidden');
      progressUI.start();
    } else {
      progressUI.stop();
      el('progressPanel').classList.add('hidden');
      el('cancelGenerationBtn').classList.add('hidden');
    }
  };

  function renderHistory() {
    el('historyCount').textContent=`${studio.history.length} lần tạo được lưu trên thiết bị này`;
    el('historyEmpty').classList.toggle('hidden',studio.history.length>0);
    el('historyList').innerHTML = studio.history.map((entry,i)=>`<article class="history-item">
      <span class="mg-history-dot ${entry.source==='demo'?'is-demo':entry.source==='guest'?'is-guest':'is-legacy'}" aria-hidden="true"></span>
      <div class="history-info"><strong>${safe(entry.brief.product||'Chiến dịch chưa có tên')}</strong><p>${safe(entry.brief.industry||'')} · ${safe(entry.brief.goal||'')} <time>${safe(dateTime(entry.createdAt))}</time></p>
       <span class="history-source">${entry.source==='demo'?'Bản mẫu DEMO':entry.source==='guest'?'AI có sẵn · Gemini':'AI cá nhân (bản cũ)'}</span></div>
      <div class="history-actions"><button type="button" data-history-action="restore" data-id="${safe(entry.id)}">Mở lại</button><button type="button" data-history-action="export" data-id="${safe(entry.id)}">PDF</button><button type="button" class="danger" data-history-action="delete" data-id="${safe(entry.id)}">Xóa</button></div>
    </article>`).join('');
  }
  // History uses the same hash-aware route as all other views.
  // Keep this wrapper only to refresh data when the history view is entered.
  changeView = function(view, options={}) {
    baseChangeView(view,options);
    if (state.view==='history') renderHistory();
  };

  function showComparison() {
    const ideas=[...studio.comparing].map(id=>getIdeaById(id)).filter(Boolean);
    if(ideas.length<2){notifyInfo('Hãy chọn ít nhất 2 chiến dịch để so sánh.','error');return;}
    el('comparisonContent').innerHTML=`<div class="compare-head"><div><span class="section-overline">SO SÁNH CHIẾN DỊCH</span><h2>Đặt ${ideas.length} chiến dịch cạnh nhau</h2></div><button type="button" class="icon-button" data-action="close-compare" aria-label="Đóng">${icon('close')}</button></div>
      <div class="table-scroll compare-desktop-matrix"><table class="studio-table compare-matrix"><thead><tr><th>Tiêu chí</th>${ideas.map(i=>`<th>${safe(i.title)}</th>`).join('')}</tr></thead><tbody>
      <tr><th>Kênh</th>${ideas.map(i=>`<td>${safe(i.channel)}</td>`).join('')}</tr>
      <tr><th>Khách hàng</th>${ideas.map(i=>`<td>${safe(i.audience)}</td>`).join('')}</tr>
      <tr><th>Ý tưởng chính</th>${ideas.map(i=>`<td>${safe(i.concept)}</td>`).join('')}</tr>
      <tr><th>Ngân sách</th>${ideas.map(i=>`<td>${i.budgetAmount===null?'Tỷ lệ tham khảo':currency(i.budgetAmount)}</td>`).join('')}</tr>
      <tr><th>Phân bổ</th>${ideas.map(i=>`<td>${i.allocations.map(x=>`${safe(x.label)}: ${x.percent}%`).join('<br>')}</td>`).join('')}</tr>
      <tr><th>KPI</th>${ideas.map(i=>`<td>${i.kpis.map(safe).join('<br>')}</td>`).join('')}</tr>
      <tr><th>Tiến độ</th>${ideas.map(i=>`<td>${i.doneWeeks.filter(Boolean).length}/4 tuần</td>`).join('')}</tr>
      ${[0,1,2,3].map(w=>`<tr><th>Tuần ${w+1}</th>${ideas.map(i=>`<td>${safe(i.timeline[w]?.task||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="compare-mobile-cards" aria-label="So sánh từng chiến dịch trên điện thoại">${ideas.map((i,n)=>`<article class="compare-mobile-card"><span class="idea-number">CHIẾN DỊCH ${String(n+1).padStart(2,'0')}</span><h3>${safe(i.title)}</h3><dl><div><dt>Kênh</dt><dd>${safe(i.channel)}</dd></div><div><dt>Khách hàng</dt><dd>${safe(i.audience)}</dd></div><div><dt>Ý tưởng chính</dt><dd>${safe(i.concept)}</dd></div><div><dt>Ngân sách</dt><dd>${i.budgetAmount===null?'Tỷ lệ tham khảo':currency(i.budgetAmount)}</dd></div><div><dt>KPI</dt><dd>${i.kpis.map(safe).join(' · ')}</dd></div><div><dt>Tiến độ</dt><dd>${i.doneWeeks.filter(Boolean).length}/4 tuần</dd></div></dl><details><summary>4 tuần triển khai</summary>${[0,1,2,3].map(w=>`<p><b>Tuần ${w+1}:</b> ${safe(i.timeline[w]?.task||'')}</p>`).join('')}</details></article>`).join('')}</div>
      <div class="compare-foot"><span>So sánh để hỗ trợ quyết định, không phải dự báo kết quả chắc chắn.</span><button type="button" class="btn btn-primary small" data-action="pdf-compare">⇩ Xuất PDF so sánh</button></div>`;
    if (!el('compareDialog').open) el('compareDialog').showModal();
  }
  function updateComparison() {
    const selected=studio.comparing.size;
    el('compareTray').classList.toggle('hidden',selected===0);
    el('compareCount').textContent=`${selected}/3 chiến dịch`;
    el('compareNowBtn').disabled=selected<2;
  }
  function toggleCompare(idea, checked) {
    if(checked && !studio.comparing.has(idea.id) && studio.comparing.size>=3){notifyInfo('Chỉ có thể so sánh tối đa 3 chiến dịch.','error');refreshViews();return;}
    if(checked)studio.comparing.add(idea.id);else studio.comparing.delete(idea.id);
    refreshViews();
  }
  function openEdit(idea) {
    planIdea(idea,null);
    studio.editingId=idea.id;
    const form=el('editForm');
    form.innerHTML=`<div class="edit-fields">
      <label>Tên chiến dịch <input name="title" maxlength="120" required value="${safe(idea.title)}"></label>
      <label>Kênh triển khai <input name="channel" maxlength="100" required value="${safe(idea.channel)}"></label>
      <label class="wide">Nội dung chính <textarea name="concept" maxlength="650" rows="3" required>${safe(idea.concept)}</textarea></label>
      <label>Khách hàng mục tiêu <input name="audience" maxlength="250" value="${safe(idea.audience||'')}"></label>
      <label>Thông điệp / điểm nhấn <input name="hook" maxlength="350" value="${safe(idea.hook||'')}"></label>
      <label>Hướng chiến lược <input name="strategy" maxlength="140" value="${safe(idea.strategy||'')}"></label>
      <label class="wide">Vì sao chiến dịch phù hợp? <textarea name="rationale" maxlength="600" rows="2">${safe(idea.rationale||'')}</textarea></label>
      <label class="wide">Nội dung quảng cáo mẫu + CTA <textarea name="sampleContent" maxlength="700" rows="3">${safe(idea.sampleContent||'')}</textarea></label>
      <label class="wide">Rủi ro và phương án xử lý <textarea name="riskPlan" maxlength="600" rows="2">${safe(idea.riskPlan||'')}</textarea></label>
      <label class="wide">KPI (mỗi dòng một chỉ số) <textarea name="kpis" rows="3">${safe(idea.kpis.join('\n'))}</textarea></label>
    </div><h3>Ngân sách</h3><label class="budget-input-label">Tổng ngân sách (VNĐ, có thể để trống) <input type="text" inputmode="numeric" autocomplete="off" data-money="vnd" name="budgetAmount" placeholder="VD: 8.000.000" value="${idea.budgetAmount===null?'':MGMoney.format(idea.budgetAmount)}"></label>
    <div class="allocation-editor">${idea.allocations.map((a,i)=>`<div class="allocation-row"><input aria-label="Tên hạng mục ${i+1}" name="allocation-label-${i}" maxlength="85" value="${safe(a.label)}"><input aria-label="Tỷ lệ % ${i+1}" type="number" min="0" max="100" step="1" name="allocation-percent-${i}" value="${a.percent}"><span>%</span></div>`).join('')}</div><p id="allocationSum" class="studio-disclaimer"></p>
    <h3>Nhiệm vụ 4 tuần</h3><div class="week-edit-list">${idea.timeline.map((week,i)=>`<label>Tuần ${i+1}<textarea maxlength="650" rows="2" name="week-${i}" required>${safe(week.task)}</textarea></label>`).join('')}</div>
    <div class="edit-footer"><button type="button" id="dismissEdit" class="btn btn-outline small">Hủy</button><button type="submit" class="btn btn-primary small">Lưu thay đổi</button></div>`;
    el('allocationSum').textContent='';
    el('editDialog').showModal();
    el('dismissEdit').addEventListener('click',()=>el('editDialog').close());
    updateBudgetSummary();
  }
  function updateBudgetSummary() {
    const form=el('editForm');
    const entries=[...form.querySelectorAll('input[name^="allocation-percent-"]')];
    const total=entries.reduce((sum,e)=>sum+(Number(e.value)||0),0);
    el('allocationSum').textContent=`Tổng tỷ trọng: ${total}%. ${total===100?'Đã cân đối 100%.':'Cần điều chỉnh về đúng 100% để lưu.'}`;
    el('allocationSum').classList.toggle('budget-bad',total!==100);
  }
  el('editForm').addEventListener('input',updateBudgetSummary);
  el('editForm').addEventListener('submit',(event)=>{
    event.preventDefault();
    const item=getIdeaById(studio.editingId);
    if(!item)return;
    const form=event.currentTarget;const fd=new FormData(form);
    const total=item.allocations.reduce((sum,_,i)=>sum+(Number(fd.get(`allocation-percent-${i}`))||0),0);
    if(total!==100){notifyInfo('Các tỷ lệ ngân sách cần cộng đúng 100%.','error');return;}
    const bd=String(fd.get('budgetAmount')??'').trim();
    const val=MGMoney.parse(bd);
    if(val!==null&&(!Number.isFinite(val)||val<0||val>1e12)){notifyInfo('Ngân sách không hợp lệ.','error');return;}
    item.title=String(fd.get('title')||'').trim().slice(0,120);
    item.channel=String(fd.get('channel')||'').trim().slice(0,100);
    item.concept=String(fd.get('concept')||'').trim().slice(0,650);
    item.audience=String(fd.get('audience')||'').trim().slice(0,250);
    item.hook=String(fd.get('hook')||'').trim().slice(0,350);
    item.strategy=String(fd.get('strategy')||'').trim().slice(0,140);
    item.rationale=String(fd.get('rationale')||'').trim().slice(0,600);
    item.sampleContent=String(fd.get('sampleContent')||'').trim().slice(0,700);
    item.riskPlan=String(fd.get('riskPlan')||'').trim().slice(0,600);
    item.budgetAmount=val;
    item.kpis=String(fd.get('kpis')||'').split('\n').map(s=>s.trim()).filter(Boolean).slice(0,8);
    item.allocations=item.allocations.map((a,i)=>({label:String(fd.get(`allocation-label-${i}`)||'Hoạt động').trim().slice(0,85), percent:Number(fd.get(`allocation-percent-${i}`))}));
    item.timeline=item.timeline.map((a,i)=>({week:i+1,task:String(fd.get(`week-${i}`)||'').trim().slice(0,650)}));
    saveUpdatedIdea(item);el('editDialog').close();notifyInfo('Đã lưu thay đổi chiến dịch trên trình duyệt.');
  });

  function printableIdea(idea,index) {
    planIdea(idea,null);
    return `<section class="pdf-idea"><h2>${index+1}. ${safe(idea.title)}</h2>${idea.portfolioMode==='portfolio'?`<p><strong>Phần ngân sách trong kế hoạch chung:</strong> ${safe(currency(idea.budgetAmount))} / ${safe(currency(idea.portfolioTotal))} (${idea.portfolioPercent}%)</p>`:''}<p><strong>Kênh:</strong> ${safe(idea.channel)}</p><p><strong>Nội dung:</strong> ${safe(idea.concept)}</p><p><strong>Khách hàng:</strong> ${safe(idea.audience)}</p><p><strong>Thông điệp:</strong> ${safe(idea.hook)}</p><p><strong>Hướng chiến lược:</strong> ${safe(idea.strategy||'')}</p>${extraOutput(idea)}${productMediaDetail(idea,true)}
    <h3>Phân bổ ngân sách · ${idea.budgetAmount===null?'Chưa có ngân sách VNĐ':safe(currency(idea.budgetAmount))}</h3>${allocationTable(idea)}<h3>KPI</h3><p>${idea.kpis.map(safe).join(' · ')}</p><h3>Timeline 4 tuần</h3>${timelineTable(idea,false)}</section>`;
  }
  function exportPDF(ideas,title,includeComparison=false) {
    if(!ideas.length){notifyInfo('Chưa có chiến dịch để xuất.','error');return;}
    el('printReport').innerHTML=`<div class="print-document"><header><small>MARKETGENIUS AI · CAMPAIGN PLANNER</small><h1>${safe(title)}</h1><p>Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} · ${ideas.length} chiến dịch</p></header>
    ${includeComparison?`<section class="pdf-compare-summary"><h2>Tổng quan so sánh</h2><table class="studio-table"><thead><tr><th>Tiêu chí</th>${ideas.map(i=>`<th>${safe(i.title)}</th>`).join('')}</tr></thead><tbody><tr><th>Kênh</th>${ideas.map(i=>`<td>${safe(i.channel)}</td>`).join('')}</tr><tr><th>Ngân sách</th>${ideas.map(i=>`<td>${i.budgetAmount===null?'Chưa nhập':currency(i.budgetAmount)}</td>`).join('')}</tr><tr><th>Tiến độ</th>${ideas.map(i=>`<td>${i.doneWeeks.filter(Boolean).length}/4 tuần</td>`).join('')}</tr></tbody></table></section>`:''}
    ${ideas.map(printableIdea).join('')}<footer>Tài liệu được tạo từ MarketGenius AI. Kế hoạch và phân bổ ngân sách là gợi ý, cần kiểm chứng trước khi triển khai.</footer></div>`;
    studio.printTitle=document.title;document.title='MarketGenius AI - '+title;
    document.body.classList.add('print-mode');
    notifyInfo('Ở cửa sổ in, chọn “Lưu dưới dạng PDF” (Save as PDF).');
    window.print();
  }
  window.addEventListener('afterprint',()=>{
    document.body.classList.remove('print-mode');
    if(studio.printTitle) document.title=studio.printTitle;
  });

  document.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-action]');
    if(!btn)return;
    const action=btn.dataset.action;
    const idea=btn.dataset.id?getIdeaById(btn.dataset.id):null;
    if(action==='edit'&&idea)openEdit(idea);
    if(action==='pdf'&&idea)exportPDF([idea],idea.title);
    if(action==='close-compare')el('compareDialog').close();
    if(action==='pdf-compare')exportPDF([...studio.comparing].map(getIdeaById).filter(Boolean),'Báo cáo so sánh chiến dịch',true);
    if(action==='compare'&&idea)toggleCompare(idea,btn.checked);
    if(action==='week-toggle'&&idea){const week=Number(btn.dataset.week);if(Number.isInteger(week)&&week>=0&&week<4){idea.doneWeeks[week]=btn.checked;saveUpdatedIdea(idea);notifyInfo(`Đã cập nhật tiến độ tuần ${week+1}.`);}}
  });
  el('compareNowBtn').addEventListener('click',showComparison);
  el('clearCompareBtn').addEventListener('click',()=>{studio.comparing.clear();refreshViews();});
  el('exportShortlistBtn').addEventListener('click',()=>exportPDF(state.saved,'Danh sách chiến dịch đã lưu'));
  el('exportCurrentBtn').addEventListener('click',()=>exportPDF(state.ideas,'05 ý tưởng chiến dịch Marketing'));

  document.addEventListener('toggle',event=>{const d=event.target.closest?.('.mg-card-menu');if(!d)return;d.querySelector('summary')?.setAttribute('aria-expanded',String(d.open));if(d.open)document.querySelectorAll('.mg-card-menu[open]').forEach(x=>{if(x!==d)x.open=false;});},true);
  document.addEventListener('click',event=>{if(!event.target.closest('.mg-card-menu'))document.querySelectorAll('.mg-card-menu[open]').forEach(x=>x.open=false);else if(event.target.closest('.mg-card-menu [data-action]'))event.target.closest('.mg-card-menu').open=false;});
  document.addEventListener('keydown',event=>{const d=event.target.closest?.('.mg-card-menu');if(event.key==='Escape'){document.querySelectorAll('.mg-card-menu[open]').forEach(x=>{x.open=false;x.querySelector('summary')?.focus();});return;}if(!d||!['ArrowDown','ArrowUp'].includes(event.key))return;event.preventDefault();d.open=true;const nodes=[...d.querySelectorAll('[role="menuitem"]')];const index=nodes.indexOf(document.activeElement);nodes[(index+(event.key==='ArrowDown'?1:-1)+nodes.length)%nodes.length]?.focus();});
  el('historyList').addEventListener('click',(event)=>{
    const btn=event.target.closest('[data-history-action]');if(!btn)return;
    const entry=studio.history.find(e=>e.id===btn.dataset.id);if(!entry)return;
    if(btn.dataset.historyAction==='restore'){
      state.brief=clone(entry.brief);state.ideas=clone(entry.ideas);state.source=entry.source;
      for(const name of ['industry','product','budget','goal','audience','usp'])if(el(name))el(name).value=entry.brief[name]||'';
      const advanced=entry.brief.briefMode==='advanced';
      const mode=document.querySelector(`input[name="briefMode"][value="${advanced?'advanced':'quick'}"]`);
      if(mode){mode.checked=true;refreshBriefMode();}
      MGMoney.set(el('budgetAmount'),entry.brief.budgetAmount);
      const selectedScenario=entry.brief.context?.scenario==='portfolio'?'portfolio':'alternatives';
      const scenarioOption=document.querySelector(`input[name="budgetScenario"][value="${selectedScenario}"]`);
      if(scenarioOption){scenarioOption.checked=true;refreshBudgetScenario();}
      const ctx=entry.brief.context||{};
      for(const name of ['marketRegion','targetMetric','baseline'])if(el(name))el(name).value=ctx[name]||'';
      for(const name of ['sellingPrice','customerCount','promotionLimit'])if(el(name))el(name).value=ctx[name]??'';
      if(el('teamCapacity'))el('teamCapacity').value=ctx.teamCapacity||'solo';
      if(el('customerData'))el('customerData').value=ctx.customerData||'none';
      if(el('promotionType'))el('promotionType').value=ctx.promotionType||'none';
      for(const name of ['ownedChannel','capability'])document.querySelectorAll(`input[name="${name}"]`).forEach(cb=>cb.checked=((name==='ownedChannel'?ctx.channels:ctx.capabilities)||[]).includes(cb.value));
      refreshPromotionFields();refreshCustomerDataFields();
      MGMoney.set(el('sellingPrice'),ctx.sellingPrice);
      if(ctx.promotionType==='fixed') MGMoney.set(el('promotionLimit'),ctx.promotionLimit);
      studio.comparing.clear();changeView('create');baseResult();
      if(entry.source==='guest')el('sourceTag').textContent='AI CÓ SẴN · GEMINI';
      else if(entry.source==='ai')el('sourceTag').textContent='AI cá nhân (bản cũ)';
      notifyInfo('Đã mở lại 5 chiến dịch từ lịch sử.');
    } else if(btn.dataset.historyAction==='export') exportPDF(entry.ideas,`Lịch sử chiến dịch - ${entry.brief.product}`);
    else if(btn.dataset.historyAction==='delete') {
      if(!window.confirm('Xóa lần tạo này khỏi lịch sử? Shortlist không bị ảnh hưởng.'))return;
      studio.history=studio.history.filter(x=>x.id!==entry.id);saveHistory();renderHistory();notifyInfo('Đã xóa mục lịch sử.');
    }
  });
  el('cancelGenerationBtn').addEventListener('click',()=>{
    studio.cancelled=true;
    progressUI.stop();
    el('progressPanel').classList.add('hidden');
    studio.requestController?.abort();
  });
  el('retryAfterErrorBtn').addEventListener('click',()=>{el('aiAlert').classList.add('hidden');generate(false);});
  el('closeAiAlert').addEventListener('click',()=>el('aiAlert').classList.add('hidden'));

  function friendlyError(status,message,code){
    if(status===429||['quota_exceeded','rate_limited','guest_site_limit'].includes(code))return {
      heading:'AI có sẵn đã đạt hạn mức',
      message:'AI có sẵn đã đạt hạn mức. Bạn có thể thử lại sau hoặc dùng Demo ngay.',retry:false,demo:true};
    if(code==='guest_cooldown')return {heading:'Cần giãn cách giữa hai lượt tạo',message:'Vui lòng chờ 20 giây rồi tạo tiếp hoặc dùng Demo.',retry:false,demo:true};
    if(status===503||code==='provider_busy')return {
      heading:'AI tạm thời quá tải',message:'Máy chủ Gemini chưa thể hoàn tất yêu cầu. Brief vẫn được giữ nguyên; thử lại sau hoặc dùng Demo.',retry:true};
    if(status===401||status===403)return {
      heading:'Không thể xác minh yêu cầu',message:'Phiên xác minh có thể hết hạn. Hãy xác minh lại hoặc dùng Demo.',retry:false,demo:true};
    if(status===504)return {heading:'AI phản hồi quá thời gian',message:'Hãy thử lại sau hoặc dùng Demo. Brief được giữ nguyên.',retry:true};
    return {heading:'Chưa thể tạo chiến dịch',message:message||'Hãy thử lại hoặc dùng Demo.',retry:true};
  }
  function showAiError(status,message,code){
    const info=friendlyError(status,message,code);
    if(el('progressLabel'))el('progressLabel').textContent='Yêu cầu chưa hoàn tất · Brief vẫn được giữ';
    el('aiErrorTitle').textContent=info.heading;
    el('aiErrorBody').textContent=info.message;
    el('aiErrorDetail').textContent=String(message||'').slice(0,250);
    el('retryAfterErrorBtn').classList.toggle('hidden',!info.retry);
    el('useDemoAfterErrorBtn')?.classList.toggle('hidden',!info.demo);
    el('aiAlert').classList.remove('hidden');
  }
  el('useDemoAfterErrorBtn')?.addEventListener('click',()=>{
    el('aiAlert').classList.add('hidden');generate(true);
  });
  // Controlled one-time retry of 503. 429 quotas are never retried automatically.
  apiRequest = async function(payload) {
    const isGeneration=payload.action==='guest-generate';
    const maximum=1;
    for(let attempt=0;attempt<maximum;attempt++) {
      if(studio.cancelled)throw new Error('Đã hủy yêu cầu tạo chiến dịch.');
      const controller=new AbortController();
      if(isGeneration)studio.requestController=controller;
      try {
        const response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',signal:controller.signal,body:JSON.stringify(payload)});
        // Handle provider JSON errors and hosting HTML timeout/crash pages separately.
        const data=await readAiJsonResponse(response);
        if(!response.ok||!data.ok){
          const status=data.providerStatus||response.status;
          const message=String(data.error||`HTTP ${status}`);
          if(status===503 && attempt<maximum-1){
            el('progressLabel').textContent='Model đang quá tải (503). Tự thử lại một lần…';
            await new Promise(r=>setTimeout(r,2000));
            continue;
          }
          if(isGeneration)showAiError(status,message,data.code);
          const friendly=friendlyError(status,message,data.code);
          const err=new Error(`${friendly.heading}. ${friendly.message}`);err.status=status;throw err;
        }
        return data;
      } catch(error) {
        if(error.name==='AbortError') throw new Error('Đã hủy yêu cầu trên trình duyệt.');
        if(error instanceof TypeError) {
          if(isGeneration)showAiError(0,'Không kết nối được máy chủ AI hoặc mạng bị gián đoạn.');
          throw new Error('Không kết nối được máy chủ AI. Hãy kiểm tra mạng và cấu hình Node.js trên cPanel.');
        }
        if(error.code==='non_json_response' && isGeneration)showAiError(error.status||0,error.message,error.code);
        throw error;
      } finally {if(studio.requestController===controller)studio.requestController=null;}
    }
  };
  renderHistory();updateComparison();
})();
