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

  function loadHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(value) ? value.filter(r => r && Array.isArray(r.ideas) && r.ideas.length === 5 && r.brief).slice(0, MAX_HISTORY) : [];
    } catch { return []; }
  }
  studio.history = loadHistory();
  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(studio.history)); }
    catch { notifyInfo('Bộ nhớ trình duyệt đã đầy, chưa thể lưu lịch sử. Hãy xóa các lịch sử cũ.', 'error'); }
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
    return ['Nội dung & thiết kế', 'Quảng cáo & phân phối', 'KOC / cộng đồng', 'Khuyến mãi / hoạt động', 'Dự phòng']
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
  normalizeIdeas = function (list) {
    return baseNormalize(list).map(item => planIdea(item, state.brief?.budgetAmount));
  };
  makeDemoIdeas = function (brief) { return baseDemo(brief).map(item => planIdea(item, brief.budgetAmount)); };
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
  renderCard = function(idea, savedView=false) {
    planIdea(idea,null);
    const checked = studio.comparing.has(idea.id);
    const tools = `<div class="studio-card-tools">
       <label class="studio-compare-toggle"><input aria-label="Chọn so sánh ${safe(idea.title)}" type="checkbox" data-action="compare" data-id="${safe(idea.id)}" ${checked?'checked':''}/> So sánh</label>
       <button type="button" data-action="edit" data-id="${safe(idea.id)}">✎ Chỉnh sửa</button>
       <button type="button" data-action="pdf" data-id="${safe(idea.id)}">⇩ Xuất PDF</button>
     </div>`;
    return baseCard(idea,savedView).replace('<div class="idea-footer">',tools+'<div class="idea-footer">');
  };
  detailContent = function(idea) {
    planIdea(idea,null);
    return `<div class="detail-header"><div class="detail-header-top"><span class="idea-number">KẾ HOẠCH MARKETING · 04 TUẦN</span><button type="button" class="icon-button dialog-close" data-action="close-dialog" aria-label="Đóng">${icon('close')}</button></div><h2 class="detail-title">${safe(idea.title)}</h2><p class="detail-summary">${safe(idea.concept)}</p></div>
    <div class="detail-body"><div class="detail-info-grid"><div class="detail-info"><span>KÊNH TRIỂN KHAI</span><p>${safe(idea.channel)}</p></div><div class="detail-info"><span>KHÁCH HÀNG MỤC TIÊU</span><p>${safe(idea.audience||'Theo brief sản phẩm')}</p></div><div class="detail-info"><span>THÔNG ĐIỆP / HOOK</span><p>${safe(idea.hook||'Nội dung thu hút khách hàng mục tiêu')}</p></div><div class="detail-info"><span>NGÂN SÁCH</span><p>${idea.budgetAmount===null?'Chưa nhập mức tiền cụ thể':safe(currency(idea.budgetAmount))}</p></div></div>
    <h4>Phân bổ ngân sách tham khảo</h4>${allocationTable(idea)}
    <h4>Timeline công việc 4 tuần</h4>${timelineTable(idea)}
    <h4>KPI cần theo dõi</h4><div class="kpi-list">${(idea.kpis.length?idea.kpis:['Lượt tiếp cận','Tương tác','Chuyển đổi']).map(kpi=>`<span class="kpi-chip">${safe(kpi)}</span>`).join('')}</div>
    <p class="studio-disclaimer">Tích vào từng tuần để theo dõi tiến độ. Các thay đổi lưu trên trình duyệt hiện tại.</p></div>
    <div class="detail-footer"><button type="button" class="btn btn-outline small" data-action="edit" data-id="${safe(idea.id)}">✎ Chỉnh sửa</button><button type="button" class="btn btn-outline small" data-action="pdf" data-id="${safe(idea.id)}">⇩ Xuất PDF</button><button type="button" class="btn btn-outline small" data-action="copy" data-id="${safe(idea.id)}">${icon('copy')} Sao chép</button><button type="button" class="btn btn-primary small" data-action="save" data-id="${safe(idea.id)}">${icon('bookmark')} ${state.saved.some(x=>x.id===idea.id)?'Bỏ lưu':'Lưu shortlist'}</button></div>`;
  };
  ideaToText = function(idea) {
    planIdea(idea,null);
    return `${baseIdeaText(idea)}\n\nPHÂN BỔ NGÂN SÁCH (THAM KHẢO)\n${idea.allocations.map((a,i)=>`${a.label}: ${a.percent}%${idea.budgetAmount===null?'':` · ${amountOrDash(idea,a.percent,i)}`}`).join('\n')}\nTiến độ: ${idea.doneWeeks.filter(Boolean).length}/4 tuần`;
  };

  function recordHistory() {
    const item={id:newId(),createdAt:new Date().toISOString(),brief:clone(state.brief),source:state.source,
      provider:state.source==='ai'?el('provider').value:null,model:state.source==='ai'?selectedModel():null,ideas:clone(state.ideas)};
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
  busy = function(active) {
    baseBusy(active);
    el('cancelGenerationBtn').classList.toggle('hidden',!active);
    el('progressLabel').textContent=active?'AI đang lập 5 chiến dịch và 20 tuần công việc…':'';
    el('progressPanel').classList.toggle('hidden',!active);
  };

  function renderHistory() {
    el('historyCount').textContent=`${studio.history.length} lần tạo được lưu trên thiết bị này`;
    el('historyEmpty').classList.toggle('hidden',studio.history.length>0);
    el('historyList').innerHTML = studio.history.map((entry,i)=>`<article class="history-item">
      <div class="history-number">${String(i+1).padStart(2,'0')}</div>
      <div class="history-info"><strong>${safe(entry.brief.product||'Chiến dịch chưa có tên')}</strong><p>${safe(entry.brief.industry||'')} · ${safe(entry.brief.goal||'')} · ${safe(dateTime(entry.createdAt))}</p>
       <span class="history-source">${entry.source==='demo'?'Bản mẫu DEMO':`AI thật · ${safe(entry.provider||'')}`}</span></div>
      <div class="history-actions"><button type="button" data-history-action="restore" data-id="${safe(entry.id)}">Mở lại</button><button type="button" data-history-action="export" data-id="${safe(entry.id)}">PDF</button><button type="button" class="danger" data-history-action="delete" data-id="${safe(entry.id)}">Xóa</button></div>
    </article>`).join('');
  }
  changeView = function(view) {
    if (view==='history') {
      state.view='history';
      for(const section of ['createView','shortlistView','historyView']) el(section).classList.toggle('active',section==='historyView');
      document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='history'));
      el('breadcrumbPage').textContent='Lịch sử chiến dịch';
      renderHistory();closeMobileMenu(); window.scrollTo({top:0,behavior:'smooth'});return;
    }
    baseChangeView(view);
    el('historyView').classList.remove('active');
  };
  document.querySelector('[data-view="history"]').addEventListener('click',()=>changeView('history'));

  function showComparison() {
    const ideas=[...studio.comparing].map(id=>getIdeaById(id)).filter(Boolean);
    if(ideas.length<2){notifyInfo('Hãy chọn ít nhất 2 chiến dịch để so sánh.','error');return;}
    el('comparisonContent').innerHTML=`<div class="compare-head"><div><span class="section-overline">SO SÁNH CHIẾN DỊCH</span><h2>Đặt ${ideas.length} chiến dịch cạnh nhau</h2></div><button type="button" class="icon-button" data-action="close-compare" aria-label="Đóng">${icon('close')}</button></div>
      <div class="table-scroll"><table class="studio-table compare-matrix"><thead><tr><th>Tiêu chí</th>${ideas.map(i=>`<th>${safe(i.title)}</th>`).join('')}</tr></thead><tbody>
      <tr><th>Kênh</th>${ideas.map(i=>`<td>${safe(i.channel)}</td>`).join('')}</tr>
      <tr><th>Khách hàng</th>${ideas.map(i=>`<td>${safe(i.audience)}</td>`).join('')}</tr>
      <tr><th>Ý tưởng chính</th>${ideas.map(i=>`<td>${safe(i.concept)}</td>`).join('')}</tr>
      <tr><th>Ngân sách</th>${ideas.map(i=>`<td>${i.budgetAmount===null?'Tỷ lệ tham khảo':currency(i.budgetAmount)}</td>`).join('')}</tr>
      <tr><th>Phân bổ</th>${ideas.map(i=>`<td>${i.allocations.map(x=>`${safe(x.label)}: ${x.percent}%`).join('<br>')}</td>`).join('')}</tr>
      <tr><th>KPI</th>${ideas.map(i=>`<td>${i.kpis.map(safe).join('<br>')}</td>`).join('')}</tr>
      <tr><th>Tiến độ</th>${ideas.map(i=>`<td>${i.doneWeeks.filter(Boolean).length}/4 tuần</td>`).join('')}</tr>
      ${[0,1,2,3].map(w=>`<tr><th>Tuần ${w+1}</th>${ideas.map(i=>`<td>${safe(i.timeline[w]?.task||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
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
      <label class="wide">KPI (mỗi dòng một chỉ số) <textarea name="kpis" rows="3">${safe(idea.kpis.join('\n'))}</textarea></label>
    </div><h3>Ngân sách</h3><label class="budget-input-label">Tổng ngân sách (VNĐ, có thể để trống) <input type="number" min="0" max="1000000000000" step="1" name="budgetAmount" value="${idea.budgetAmount===null?'':idea.budgetAmount}"></label>
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
    const val=bd===''?null:Number(bd);
    if(val!==null&&(!Number.isFinite(val)||val<0||val>1e12)){notifyInfo('Ngân sách không hợp lệ.','error');return;}
    item.title=String(fd.get('title')||'').trim().slice(0,120);
    item.channel=String(fd.get('channel')||'').trim().slice(0,100);
    item.concept=String(fd.get('concept')||'').trim().slice(0,650);
    item.audience=String(fd.get('audience')||'').trim().slice(0,250);
    item.hook=String(fd.get('hook')||'').trim().slice(0,350);
    item.budgetAmount=val;
    item.kpis=String(fd.get('kpis')||'').split('\n').map(s=>s.trim()).filter(Boolean).slice(0,8);
    item.allocations=item.allocations.map((a,i)=>({label:String(fd.get(`allocation-label-${i}`)||'Hoạt động').trim().slice(0,85), percent:Number(fd.get(`allocation-percent-${i}`))}));
    item.timeline=item.timeline.map((a,i)=>({week:i+1,task:String(fd.get(`week-${i}`)||'').trim().slice(0,650)}));
    saveUpdatedIdea(item);el('editDialog').close();notifyInfo('Đã lưu thay đổi chiến dịch trên trình duyệt.');
  });

  function printableIdea(idea,index) {
    planIdea(idea,null);
    return `<section class="pdf-idea"><h2>${index+1}. ${safe(idea.title)}</h2><p><strong>Kênh:</strong> ${safe(idea.channel)}</p><p><strong>Nội dung:</strong> ${safe(idea.concept)}</p><p><strong>Khách hàng:</strong> ${safe(idea.audience)}</p><p><strong>Thông điệp:</strong> ${safe(idea.hook)}</p>
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
  el('historyList').addEventListener('click',(event)=>{
    const btn=event.target.closest('[data-history-action]');if(!btn)return;
    const entry=studio.history.find(e=>e.id===btn.dataset.id);if(!entry)return;
    if(btn.dataset.historyAction==='restore'){
      state.brief=clone(entry.brief);state.ideas=clone(entry.ideas);state.source=entry.source;
      for(const name of ['industry','product','budget','goal','audience','usp'])if(el(name))el(name).value=entry.brief[name]||'';
      el('budgetAmount').value=entry.brief.budgetAmount??'';
      studio.comparing.clear();changeView('create');baseResult();if(entry.source==='ai'&&entry.provider){el('sourceTag').textContent=`AI THẬT · ${entry.provider.toUpperCase()}`;}notifyInfo('Đã mở lại 5 chiến dịch từ lịch sử.');
    } else if(btn.dataset.historyAction==='export') exportPDF(entry.ideas,`Lịch sử chiến dịch - ${entry.brief.product}`);
    else if(btn.dataset.historyAction==='delete') {
      if(!window.confirm('Xóa lần tạo này khỏi lịch sử? Shortlist không bị ảnh hưởng.'))return;
      studio.history=studio.history.filter(x=>x.id!==entry.id);saveHistory();renderHistory();notifyInfo('Đã xóa mục lịch sử.');
    }
  });
  el('cancelGenerationBtn').addEventListener('click',()=>{
    studio.cancelled=true;
    studio.requestController?.abort();
    el('progressLabel').textContent='Đã yêu cầu hủy trên trình duyệt. AI có thể đã nhận yêu cầu trước đó.';
  });
  el('retryAfterErrorBtn').addEventListener('click',()=>{el('aiAlert').classList.add('hidden');generate(false);});
  el('closeAiAlert').addEventListener('click',()=>el('aiAlert').classList.add('hidden'));

  function friendlyError(status, message, code) {
    if(status===429 || code==='quota_exceeded' || code==='rate_limited')return {heading:'API đã chạm giới hạn sử dụng (429)',
      message:code==='quota_exceeded'
        ? 'Có thể đã hết lượt miễn phí, hạn mức theo ngày hoặc hạn mức chi tiêu của dự án/model. Kiểm tra Rate Limits hoặc Billing; tạo key mới trong cùng dự án thường không tăng quota.'
        : 'Có thể đã vượt giới hạn yêu cầu hoặc token trong thời gian ngắn (RPM/TPM), hoặc không đủ quota. Xem Rate Limits, chờ phù hợp rồi thử lại. Website không tự gửi lại liên tục để tránh tốn hạn mức.',retry:false};
    if(status===503 || code==='provider_busy')return {heading:'Nhà cung cấp AI tạm thời quá tải (503)',
      message:'Website đã thử lại một lần. Bạn có thể thử lại sau, hoặc chọn model khác. Brief vẫn được giữ nguyên.',retry:true};
    if(status===401 || status===403)return {heading:'API Key không có quyền truy cập',message:'Kiểm tra lại API Key, quyền truy cập model, tình trạng thanh toán và dự án tương ứng.',retry:false};
    if(status===404 || status===400)return {heading:'Model hoặc yêu cầu không được hỗ trợ',message:'Hãy tải lại danh sách model theo key và thử model tạo văn bản khác.',retry:false};
    if(status===504)return {heading:'Yêu cầu AI quá thời gian',message:'Giữ nguyên brief và thử model khác hoặc gửi lại yêu cầu khi kết nối ổn định.',retry:true};
    return {heading:'Chưa thể tạo chiến dịch',message:message||'Vui lòng kiểm tra kết nối và thử lại.',retry:true};
  }
  function showAiError(status, message, code) {
    const info=friendlyError(status,message,code);
    el('aiErrorTitle').textContent=info.heading;
    el('aiErrorBody').textContent=info.message;
    el('aiErrorDetail').textContent=message.slice(0,250);
    el('retryAfterErrorBtn').classList.toggle('hidden',!info.retry);
    const isRateLimit=status===429||code==='quota_exceeded'||code==='rate_limited';
    const isGemini=el('provider').value==='gemini';
    el('quotaLink').href=isGemini?'https://ai.dev/rate-limit':'https://platform.openai.com/settings/organization/limits';
    el('quotaLink').textContent=isGemini?'Kiểm tra giới hạn Gemini ↗':'Kiểm tra giới hạn OpenAI ↗';
    el('quotaLink').classList.toggle('hidden',!isRateLimit);
    el('aiAlert').classList.remove('hidden');
  }
  // Controlled one-time retry of 503. 429 quotas are never retried automatically.
  apiRequest = async function(payload) {
    const maximum=(payload.action==='generate')?2:1;
    for(let attempt=0;attempt<maximum;attempt++) {
      if(studio.cancelled)throw new Error('Đã hủy yêu cầu tạo chiến dịch.');
      const controller=new AbortController();
      if(payload.action==='generate')studio.requestController=controller;
      try {
        const response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',signal:controller.signal,body:JSON.stringify(payload)});
        if(!(response.headers.get('content-type')||'').includes('application/json'))throw new Error('Máy chủ chưa trả JSON. Vui lòng triển khai đủ Netlify Functions.');
        const data=await response.json();
        if(!response.ok||!data.ok){
          const status=data.providerStatus||response.status;
          const message=String(data.error||`HTTP ${status}`);
          if(status===503 && payload.action==='generate' && attempt<maximum-1){
            el('progressLabel').textContent='Model đang quá tải (503). Tự thử lại một lần…';
            await new Promise(r=>setTimeout(r,2000));
            continue;
          }
          if(payload.action==='generate')showAiError(status,message,data.code);
          const friendly=friendlyError(status,message,data.code);
          const err=new Error(`${friendly.heading}. ${friendly.message}`);err.status=status;throw err;
        }
        return data;
      } catch(error) {
        if(error.name==='AbortError') throw new Error('Đã hủy yêu cầu trên trình duyệt.');
        if(error instanceof TypeError) {
          if(payload.action==='generate')showAiError(0,'Không kết nối được Netlify hoặc mạng bị gián đoạn.');
          throw new Error('Không kết nối được máy chủ AI. Hãy kiểm tra mạng và cấu hình Netlify Function.');
        }
        throw error;
      } finally {if(studio.requestController===controller)studio.requestController=null;}
    }
  };
  renderHistory();updateComparison();
})();
