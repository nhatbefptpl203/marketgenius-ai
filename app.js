'use strict';

const STORAGE_KEY = 'marketgenius-shortlist-v1';
const $ = (selector) => document.querySelector(selector);
const icons = {
  sparkle: '<svg class="icon"><use href="#i-sparkle"/></svg>',
  bookmark: '<svg class="icon"><use href="#i-bookmark"/></svg>',
  check: '<svg class="icon"><use href="#i-check"/></svg>',
  eye: '<svg class="icon"><use href="#i-eye"/></svg>',
  copy: '<svg class="icon"><use href="#i-copy"/></svg>',
  trash: '<svg class="icon"><use href="#i-trash"/></svg>',
  rotate: '<svg class="icon"><use href="#i-rotate"/></svg>',
  close: '<svg class="icon"><use href="#i-close"/></svg>'
};
const state = { ideas: [], saved: loadSaved(), source: '', brief: null, loading: false, connected: false, view: 'create' };

// Danh sách gợi ý. Người dùng có thể tải thêm model thực tế bằng chính API Key.
const MODEL_PRESETS = {
  gemini: [
    {id:'gemini-3.8-flash',label:'Gemini 3.8 Flash · Đề xuất',group:'⭐ Nên dùng',hint:'Mạnh, đa năng; phù hợp tạo ý tưởng marketing.'},
    {id:'gemini-3.5-flash-lite',label:'Gemini 3.5 Flash-Lite · Tiết kiệm',group:'⭐ Nên dùng',hint:'Ưu tiên chi phí và tốc độ.'},
    {id:'gemini-4-argon',label:'Gemini 4 Argon · Mạnh',group:'Gemini 4',hint:'Model suy luận cao cấp; kiểm tra quota và chi phí trước khi dùng.'},
    {id:'gemini-3.6-flash',label:'Gemini 3.6 Flash',group:'Gemini 3.x',hint:'Cân bằng chất lượng và tốc độ.'},
    {id:'gemini-3.1-pro-preview',label:'Gemini 3.1 Pro · Preview',group:'Gemini 3.x',hint:'Ưu tiên bài toán cần phân tích sâu; bản preview có thể có hạn mức khác.'},
    {id:'gemini-3-flash-preview',label:'Gemini 3 Flash · Preview',group:'Gemini 3.x',hint:'Model Flash thế hệ 3 bản preview.'},
    {id:'gemini-3.1-flash-lite',label:'Gemini 3.1 Flash-Lite',group:'Gemini 3.x',hint:'Model gọn, phù hợp khối lượng lớn.'},
    {id:'gemini-2.5-flash',label:'Gemini 2.5 Flash · Đời cũ',group:'Gemini 2.5 · Có thể bị giới hạn',hint:'Một số API Key mới có thể không truy cập được dòng 2.5.'},
    {id:'gemini-2.5-pro',label:'Gemini 2.5 Pro · Đời cũ',group:'Gemini 2.5 · Có thể bị giới hạn',hint:'Model suy luận thế hệ 2.5; phụ thuộc quyền tài khoản.'},
    {id:'gemini-2.5-flash-lite',label:'Gemini 2.5 Flash-Lite · Đời cũ',group:'Gemini 2.5 · Có thể bị giới hạn',hint:'Ưu tiên tốc độ; có thể bị giới hạn trên dự án mới.'}
  ],
  openai: [
    {id:'gpt-5.4-mini',label:'GPT-5.4 Mini · Đề xuất',group:'⭐ Nên dùng',hint:'Cân bằng chất lượng, tốc độ và chi phí.'},
    {id:'gpt-6-luna',label:'GPT-6 Luna · Tiết kiệm',group:'⭐ Nên dùng',hint:'Ưu tiên tốc độ và chi phí cho nội dung Marketing.'},
    {id:'gpt-6.1-sol',label:'GPT-6.1 Sol',group:'GPT-6',hint:'Cân bằng năng lực phân tích và chi phí.'},
    {id:'gpt-6-astra',label:'GPT-6 Astra',group:'GPT-6',hint:'Ưu tiên chất lượng; chi phí có thể cao.'},
    {id:'gpt-5.6-terra',label:'GPT-5.6 Terra',group:'GPT-5',hint:'Cân bằng năng lực và chi phí, tùy quyền API.'},
    {id:'gpt-5.6-luna',label:'GPT-5.6 Luna',group:'GPT-5',hint:'Hướng tới các tác vụ chi phí nhạy cảm, tùy quyền API.'},
    {id:'gpt-5.5',label:'GPT-5.5',group:'GPT-5',hint:'Model mạnh cho công việc chuyên môn.'},
    {id:'gpt-5.4',label:'GPT-5.4',group:'GPT-5',hint:'Phù hợp hoạch định chiến lược và nội dung.'},
    {id:'gpt-5.2',label:'GPT-5.2',group:'GPT-5',hint:'Model thế hệ trước; tùy quyền truy cập.'},
    {id:'gpt-5-mini',label:'GPT-5 Mini',group:'GPT-5',hint:'Phương án tiết kiệm thuộc dòng GPT-5.'},
    {id:'gpt-4.1-mini',label:'GPT-4.1 Mini · Đời cũ',group:'GPT-4 · Có thể bị ngừng',hint:'Chỉ sử dụng nếu API Key của bạn còn hỗ trợ.'},
    {id:'gpt-4o-mini',label:'GPT-4o Mini · Đời cũ',group:'GPT-4 · Có thể bị ngừng',hint:'Chỉ sử dụng nếu API Key của bạn còn hỗ trợ.'}
  ]
};
const syncedModels = {gemini:[],openai:[]};

function selectedModel() {
  return $('#model').value === '__custom__' ? $('#customModel').value.trim() : $('#model').value;
}
function modelHint() {
  const custom=$('#model').value==='__custom__';
  $('#customModel').classList.toggle('hidden',!custom);
  const selected=MODEL_PRESETS[$('#provider').value].find(item=>item.id===$('#model').value);
  $('#modelHint').textContent=custom ? 'Chỉ dùng nếu bạn biết chính xác ID và model hỗ trợ tạo văn bản/JSON.' : selected?.hint || 'Model được nhà cung cấp trả về; hãy kiểm tra kết nối trước khi dùng.';
  if(custom) $('#customModel').focus();
}
function populateModels(provider,preferred) {
  const select=$('#model');select.innerHTML='';
  const groups=new Map();
  for(const entry of MODEL_PRESETS[provider]) {
    if(!groups.has(entry.group))groups.set(entry.group,[]);
    groups.get(entry.group).push(entry);
  }
  const baseIds=new Set(MODEL_PRESETS[provider].map(item=>item.id));
  const apiOnly=syncedModels[provider].filter(id=>!baseIds.has(id));
  if(apiOnly.length)groups.set('↻ Từ API Key của bạn',apiOnly.map(id=>({id,label:id})));
  for(const [name,items] of groups) {
    const group=document.createElement('optgroup');group.label=name;
    for(const item of items) {const option=document.createElement('option');option.value=item.id;option.textContent=item.label;group.append(option);}
    select.append(group);
  }
  const custom=document.createElement('option');custom.value='__custom__';custom.textContent='✎ Model khác (nhập ID nâng cao)';select.append(custom);
  const ids=[...baseIds,...apiOnly];
  select.value=preferred && ids.includes(preferred) ? preferred : MODEL_PRESETS[provider][0].id;
  $('#modelCount').textContent=`${ids.length} model`;
  modelHint();
}
async function loadModelList() {
  const apiKey=$('#apiKey').value.trim(),provider=$('#provider').value;
  if(!apiKey) {notify('Hãy nhập API Key để tải danh sách model từ tài khoản của bạn.','error');$('#apiKey').focus();return;}
  const btn=$('#loadModelsBtn');btn.disabled=true;btn.querySelector('span').textContent='Đang tải danh sách...';
  $('#modelListInfo').textContent='Đang hỏi nhà cung cấp các model hỗ trợ tạo văn bản...';
  try {
    const data=await apiRequest({action:'list-models',provider,apiKey});
    if($('#provider').value!==provider) return;
    syncedModels[provider]=data.models;
    const original=selectedModel();
    const suggested=MODEL_PRESETS[provider].find(item=>data.models.includes(item.id))?.id || data.models[0];
    const chosen=data.models.includes(original) ? original : suggested || original;
    populateModels(provider,chosen);
    if(chosen!==original)resetConnection();
    $('#modelListInfo').textContent=data.models.length
      ? `API trả về ${data.models.length} model tạo văn bản. ${chosen!==original?'Đã chuyển sang '+chosen+'. ':''}Quyền tạo nội dung và hạn mức cần được thử thực tế.`
      : 'API không trả về model tạo văn bản phù hợp. Bạn có thể chọn model có sẵn hoặc nhập ID nâng cao.';
    notify(`Đã đồng bộ ${data.models.length} model từ API Key!`);
  } catch(error){$('#modelListInfo').textContent=`Không lấy được danh sách: ${error.message}`;notify(error.message,'error');}
  finally{btn.disabled=false;btn.querySelector('span').textContent='Lấy model từ API Key';}
}


function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'": '&#39;' })[char]);
}
function newId() { return (globalThis.crypto?.randomUUID?.() || `idea-${Date.now()}-${Math.random().toString(36).slice(2)}`); }
function loadSaved() {
  try { const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(arr) ? arr.filter(isValidIdea).slice(0,100) : []; }
  catch { return []; }
}
function saveStorage() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.saved)); return true; }
  catch { notify('Không thể lưu dữ liệu trên trình duyệt. Hãy kiểm tra chế độ riêng tư hoặc dung lượng.', 'error'); return false; }
}
function isValidIdea(item) { return item && typeof item.title === 'string' && typeof item.channel === 'string' && Array.isArray(item.timeline) && item.timeline.length === 4; }
function icon(name) { return icons[name] || ''; }
function notify(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `${icon(type === 'error' ? 'close' : 'check')}<span>${esc(message)}</span>`;
  $('#toastStack').appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}
function setApiStatus(message, type = '') {
  const el = $('#apiStatus');
  el.className = `api-status ${type}`;
  el.querySelector('span:last-child').textContent = message;
  state.connected = type === 'connected';
  $('#modeBadge').classList.toggle('is-connected', state.connected);
  $('#modeBadge').innerHTML = `<span class="tiny-pulse"></span>${state.connected ? 'AI đã kết nối' : 'Demo sẵn sàng'}`;
}
function resetConnection() { setApiStatus('Chưa kiểm tra kết nối', ''); }
function changeView(view) {
  if (!['create','shortlist'].includes(view)) return;
  state.view = view;
  $('#createView').classList.toggle('active', view === 'create');
  $('#shortlistView').classList.toggle('active', view === 'shortlist');
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  $('#breadcrumbPage').textContent = view === 'create' ? 'Khám phá ý tưởng' : 'Shortlist của bạn';
  if (view === 'shortlist') renderShortlist();
  closeMobileMenu();
  window.scrollTo({top:0,behavior:'smooth'});
}
function openMobileMenu() { $('#sidebar').classList.add('open'); $('#overlay').hidden = false; }
function closeMobileMenu() { $('#sidebar').classList.remove('open'); $('#overlay').hidden = true; }
function updateCounters() {
  const count = state.saved.length;
  $('#sideSavedCount').textContent = count;
  $('#dashboardSavedCount').textContent = String(count).padStart(2,'0');
  $('#shortlistDescription').textContent = `${count} ý tưởng được lưu trên trình duyệt này (không chứa API Key).`;
  $('#copyAllBtn').disabled = count === 0;
}
function readBrief() {
  const numberText = $('#budgetAmount').value.trim();
  const budgetAmount = numberText ? Number(numberText) : null;
  if (budgetAmount !== null && (!Number.isFinite(budgetAmount) || budgetAmount < 0 || budgetAmount > 1_000_000_000_000)) {
    throw new Error('Ngân sách thực tế phải là số từ 0 đến 1.000 tỷ VNĐ.');
  }
  return {
    industry: $('#industry').value.trim(), product: $('#product').value.trim(),
    budget: $('#budget').value, goal: $('#goal').value,
    audience: $('#audience').value.trim(),
    budgetAmount, usp: $('#usp').value.trim()
  };
}
function fillDemoBriefIfBlank() {
  if (!$('#industry').value) $('#industry').value = 'Đồ ăn & thức uống';
  if (!$('#product').value.trim()) $('#product').value = 'Trà thảo mộc Mộc An';
  if (!$('#budget').value) $('#budget').value = 'Thấp';
  if (!$('#goal').value) $('#goal').value = 'Tăng doanh số bán hàng';
}
function normalizeIdeas(ideas) {
  if (!Array.isArray(ideas) || ideas.length !== 5) throw new Error('AI không trả về đúng 5 chiến dịch. Vui lòng thử tạo lại.');
  return ideas.map((idea, index) => {
    if (!idea || !idea.title || !idea.channel || !idea.concept || !Array.isArray(idea.timeline) || idea.timeline.length !== 4) {
      throw new Error('Dữ liệu AI trả về thiếu tiêu đề, kênh hoặc timeline 4 tuần. Hãy tạo lại.');
    }
    const text = (value, limit=500) => String(value ?? '').trim().slice(0,limit);
    return {
      id: newId(), number: index+1, title: text(idea.title,120), channel: text(idea.channel,100),
      concept: text(idea.concept,650), audience: text(idea.audience,250), hook: text(idea.hook,350),
      budgetSplit: text(idea.budgetSplit,350),
      kpis: Array.isArray(idea.kpis) ? idea.kpis.slice(0,5).map(x=>text(x,170)) : [],
      timeline: idea.timeline.map((week,i) => ({ week: i+1, task: text(typeof week === 'string' ? week : week?.task,650) }))
    };
  });
}
function formatBrief(brief) {
  const result = [brief.product, brief.industry, `ngân sách ${brief.budget.toLowerCase()}`, brief.goal.toLowerCase()];
  return result.filter(Boolean).join(' · ');
}
function renderCard(idea, savedView = false) {
  const saved = state.saved.some(item=>item.id === idea.id);
  const safeId = esc(idea.id);
  const firstTask = esc(idea.timeline[0]?.task || 'Lập kế hoạch và chuẩn bị');
  return `<article class="idea-card">
    <div class="idea-card-top"><span class="idea-number">Ý TƯỞNG ${String(idea.number || 1).padStart(2,'0')}</span><span class="idea-channel">${esc(idea.channel)}</span></div>
    <h3>${esc(idea.title)}</h3><p class="idea-description">${esc(idea.concept)}</p>
    <div class="idea-detail"><strong>✦ Điểm nhấn chiến dịch</strong><p>${esc(idea.hook || 'Chiến dịch được cá nhân hóa cho sản phẩm của bạn.')}</p></div>
    <div class="idea-timeline-header"><strong>Timeline triển khai</strong><span>04 tuần</span></div>
    <div class="week-pills"><div class="week-pill">Tuần 01</div><div class="week-pill">Tuần 02</div><div class="week-pill">Tuần 03</div><div class="week-pill">Tuần 04</div></div>
    <div class="idea-footer">
      ${savedView ? `<button type="button" class="idea-icon-action" data-action="remove" data-id="${safeId}">${icon('trash')} Xóa</button>` : `<button type="button" class="idea-save ${saved ? 'saved':''}" data-action="save" data-id="${safeId}">${icon(saved ? 'check':'bookmark')} ${saved?'Đã lưu':'Lưu shortlist'}</button>`}
      <div class="idea-actions-right"><button type="button" class="idea-preview" data-action="details" data-id="${safeId}">${icon('eye')} Xem chi tiết</button><button type="button" class="idea-preview" data-action="copy" data-id="${safeId}" aria-label="Sao chép chiến dịch">${icon('copy')}</button></div>
    </div>
  </article>`;
}
function renderResults() {
  const section = $('#resultsSection');
  section.classList.remove('hidden');
  $('#ideasGrid').innerHTML = state.ideas.map(idea => renderCard(idea)).join('');
  $('#resultsSubtitle').textContent = formatBrief(state.brief);
  const label = $('#sourceTag');
  label.textContent = state.source === 'demo' ? 'DỮ LIỆU DEMO' : `AI THẬT · ${$('#provider').value.toUpperCase()}`;
  label.classList.toggle('demo',state.source==='demo');
  setTimeout(()=>section.scrollIntoView({behavior:'smooth',block:'start'}),80);
}
function renderShortlist() {
  updateCounters();
  const empty = !state.saved.length;
  $('#shortlistEmpty').classList.toggle('hidden',!empty);
  $('#savedGrid').classList.toggle('hidden',empty);
  $('#savedGrid').innerHTML = state.saved.map(idea=>renderCard(idea,true)).join('');
}
function detailContent(idea) {
  return `<div class="detail-header"><div class="detail-header-top"><span class="idea-number">CHIẾN DỊCH ${String(idea.number||1).padStart(2,'0')}</span><button type="button" class="icon-button dialog-close" data-action="close-dialog" aria-label="Đóng">${icon('close')}</button></div><h2 class="detail-title">${esc(idea.title)}</h2><p class="detail-summary">${esc(idea.concept)}</p></div>
    <div class="detail-body"><div class="detail-info-grid"><div class="detail-info"><span>KÊNH TRIỂN KHAI</span><p>${esc(idea.channel)}</p></div><div class="detail-info"><span>KHÁCH HÀNG MỤC TIÊU</span><p>${esc(idea.audience||'Theo đặc điểm ngành hàng và brief')}</p></div><div class="detail-info"><span>THÔNG ĐIỆP / HOOK</span><p>${esc(idea.hook||'Tạo nội dung thu hút khách hàng mục tiêu')}</p></div><div class="detail-info"><span>NGÂN SÁCH GỢI Ý</span><p>${esc(idea.budgetSplit||'Điều chỉnh theo ngân sách thực tế')}</p></div></div>
    <h4>Kế hoạch triển khai 4 tuần</h4><div class="timeline-list">${idea.timeline.map((item,i)=>`<div class="timeline-row"><span class="timeline-index">TUẦN ${String(i+1).padStart(2,'0')}</span><p>${esc(item.task)}</p></div>`).join('')}</div>
    <h4>KPI nên theo dõi</h4><div class="kpi-list">${(idea.kpis.length ? idea.kpis : ['Lượt tiếp cận','Tương tác','Chuyển đổi']).map(kpi=>`<span class="kpi-chip">${esc(kpi)}</span>`).join('')}</div></div>
    <div class="detail-footer"><button type="button" class="btn btn-outline small" data-action="copy" data-id="${esc(idea.id)}">${icon('copy')} Copy tóm tắt</button><button type="button" class="btn btn-primary small" data-action="save" data-id="${esc(idea.id)}">${icon('bookmark')} ${state.saved.some(x=>x.id===idea.id)?'Bỏ lưu':'Lưu shortlist'}</button></div>`;
}
function getIdeaById(id) { return [...state.ideas,...state.saved].find(item=>item.id===id); }
function openDetails(idea) {
  $('#detailsContent').innerHTML = detailContent(idea);
  const dialog = $('#detailsDialog');
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open','');
}
function toggleSaved(idea) {
  const found = state.saved.findIndex(item => item.id === idea.id);
  if (found >= 0) {
    state.saved.splice(found,1); notify('Đã bỏ ý tưởng khỏi shortlist.');
  } else {
    if (state.saved.length >= 100) { notify('Shortlist tối đa 100 ý tưởng. Hãy xóa bớt trước khi lưu.', 'error'); return; }
    state.saved.unshift(JSON.parse(JSON.stringify(idea))); notify('Đã lưu ý tưởng vào shortlist!');
  }
  saveStorage(); updateCounters();
  if (state.ideas.length) $('#ideasGrid').innerHTML = state.ideas.map(x=>renderCard(x)).join('');
  renderShortlist();
  if ($('#detailsDialog').open) $('#detailsContent').innerHTML = detailContent(idea);
}
function ideaToText(idea) {
  return `CHIẾN DỊCH: ${idea.title}\nKênh triển khai: ${idea.channel}\nNội dung chính: ${idea.concept}\nKhách hàng mục tiêu: ${idea.audience || 'Theo brief'}\nĐiểm nhấn: ${idea.hook || ''}\nNgân sách gợi ý: ${idea.budgetSplit || 'Tùy ngân sách'}\nKPI: ${idea.kpis.join(' · ')}\n\nTIMELINE 4 TUẦN\n${idea.timeline.map((x,i)=>`Tuần ${i+1}: ${x.task}`).join('\n')}`;
}
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else {
      const el = document.createElement('textarea');
      el.value=text;el.style.position='fixed';el.style.left='-9999px';
      document.body.appendChild(el);el.select();
      const success=document.execCommand('copy'); el.remove();
      if (!success) throw new Error('clipboard not available');
    }
    notify('Đã sao chép! Có thể dán vào Zalo, Messenger hoặc tài liệu.');
  } catch { notify('Trình duyệt chặn sao chép. Hãy mở website bằng HTTPS và thử lại.','error'); }
}
function makeDemoIdeas(brief) {
  const p = brief.product;
  const a = brief.audience || 'Nhóm khách hàng phù hợp với sản phẩm';
  const cheap = brief.budget === 'Thấp';
  const budget = cheap ? 'Ưu tiên nội dung tự sản xuất, tối thiểu chi phí quảng cáo' : brief.budget === 'Cao' ? 'Có thể mở rộng ngân sách thử nghiệm và phân phối' : 'Phân bổ cân đối giữa nội dung và quảng cáo kiểm chứng';
  const templates = [
    {title:`7 ngày trải nghiệm ${p}`,channel:'TikTok · Reels',concept:`Chuỗi video ngắn về trải nghiệm thực tế với ${p}, kết hợp nội dung trước/sau và câu hỏi tương tác.`,hook:'Biến trải nghiệm thực thành bằng chứng hấp dẫn thay vì chỉ giới thiệu sản phẩm.',kpis:['Lượt xem video','Tỷ lệ xem hết','Click vào sản phẩm'],timeline:['Phân tích khách hàng; lên 7 kịch bản video và lịch đăng.','Sản xuất, đăng 3–4 video thử nghiệm; ghi nhận bình luận.','Tối ưu 3 video có kết quả tốt, gắn lời kêu gọi hành động.','Đăng video tổng kết, đo lượt truy cập và chuyển đổi; đề xuất vòng tiếp theo.']},
    {title:`Bạn giới thiệu bạn – Cùng khám phá ${p}`,channel:'Facebook · Zalo',concept:`Chương trình khách hàng giới thiệu bạn bè bằng mã hoặc lời nhắn cá nhân, đổi lấy một ưu đãi nhỏ phù hợp biên lợi nhuận.`,hook:'Tận dụng lòng tin từ người quen để tạo đơn hàng mới với chi phí kiểm soát được.',kpis:['Lượt giới thiệu','Số khách mới','Chi phí/đơn'],timeline:['Thiết kế quy tắc giới thiệu, mức quà và cách theo dõi mã.','Thông báo tới khách cũ qua Zalo/Facebook và đăng nội dung giải thích.','Nhắc chương trình, chia sẻ phản hồi và tối ưu ưu đãi.','Đối soát đơn, tổng kết chi phí quà tặng và kết quả giới thiệu.']},
    {title:`Một câu chuyện, một lý do chọn ${p}`,channel:'Facebook · Instagram',concept:`Kể câu chuyện nguồn gốc và điểm khác biệt của ${p} qua bài viết dạng carousel và phản hồi khách hàng.`,hook:'Đánh vào giá trị và cảm xúc thay cho giảm giá trực tiếp.',kpis:['Lượt lưu bài','Tương tác','Tin nhắn tư vấn'],timeline:['Xác định thông điệp, thu thập ảnh thật và câu chuyện sản phẩm.','Đăng chuỗi 3 bài về vấn đề, giải pháp, giá trị sử dụng.','Khuyến khích khách hàng chia sẻ trải nghiệm; chọn câu chuyện nổi bật.','Tổng hợp FAQ, đo lượt nhắn tin và cải thiện nội dung chuyển đổi.']},
    {title:`Mini Challenge: Thử ngay ${p}`,channel:'TikTok · Cộng đồng',concept:`Thử thách nội dung do khách hàng tạo: đăng ảnh/video sử dụng ${p} kèm hashtag, chọn bài sáng tạo nhất.`,hook:'Khuyến khích cộng đồng tự tạo nội dung và lan truyền tự nhiên.',kpis:['Bài UGC hợp lệ','Lượt tiếp cận','Lượng người theo dõi mới'],timeline:['Xác định thể lệ rõ ràng, giải thưởng nhỏ và hashtag riêng.','Đăng video mở màn, mời các khách hàng đầu tiên tham gia.','Tổng hợp bài tham gia, chia sẻ bài nổi bật và duy trì thử thách.','Chọn bài đạt tiêu chí, trao quà, công bố kết quả và đo hiệu quả.']},
    {title:`Khách hàng cũ – Ưu đãi đúng lúc`,channel:'Zalo OA · Email',concept:`Chăm sóc khách hàng đã mua ${p} bằng gợi ý sử dụng, ưu đãi có thời hạn và lời mời phản hồi tự nguyện.`,hook:'Tăng doanh thu lặp lại bằng nội dung hữu ích và ưu đãi có mục tiêu.',kpis:['Tỷ lệ phản hồi','Đơn mua lại','Doanh thu mua lại'],timeline:['Phân nhóm khách đồng ý nhận tin; xây dựng nội dung chăm sóc.','Gửi hướng dẫn hữu ích và khảo sát ngắn sau mua.','Gửi ưu đãi phù hợp, tránh làm phiền hoặc nhắn quá nhiều.','Đo số đơn lặp lại, xử lý phản hồi và cải thiện chương trình.']}
  ];
  return normalizeIdeas(templates.map((t,i)=>({
    ...t,audience:a,budgetSplit:budget,
    timeline:t.timeline.map((task,j)=>({week:j+1,task})),
    number:i+1
  })));
}
function busy(active) {
  state.loading = active;
  $('#generateBtn').disabled = active;
  $('#demoBtn').disabled = active;
  $('#regenerateBtn').disabled = active;
  $('#connectBtn').disabled = active;
  $('#loadModelsBtn').disabled = active;
  $('#generateBtn').innerHTML = active ? `<span class="spin">${icon('rotate')}</span> AI đang lên ý tưởng...` : `${icon('sparkle')} Tạo 5 ý tưởng <svg class="icon"><use href="#i-arrow"/></svg>`;
}
async function apiRequest(payload) {
  let response;
  try {
    response = await fetch('/api/ai', {
      method:'POST', headers:{'Content-Type':'application/json'},
      cache:'no-store', body:JSON.stringify(payload)
    });
  } catch {
    throw new Error('Không kết nối được máy chủ. Hãy chạy bằng Netlify Dev hoặc triển khai lên Netlify để dùng AI thật.');
  }
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('Chưa tìm thấy Netlify Function. Chế độ demo vẫn hoạt động khi mở index.html trực tiếp; AI thật cần chạy trên Netlify.');
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || `Yêu cầu API thất bại (${response.status}).`);
  return data;
}
async function testConnection() {
  const apiKey = $('#apiKey').value.trim();
  const provider = $('#provider').value;
  const model = selectedModel();
  if (!apiKey) { notify('Hãy dán API Key của bạn vào ô bên trái.','error'); $('#apiKey').focus(); return; }
  if (!model) { notify('Hãy chọn hoặc nhập một model AI.','error'); $('#model').focus(); return; }
  $('#connectBtn').disabled = true;
  $('#connectBtn').querySelector('span').textContent = 'Đang kiểm tra...';
  setApiStatus('Đang xác thực API Key...', '');
  try {
    await apiRequest({action:'test',provider,apiKey,model});
    setApiStatus(`Đã kết nối ${provider==='gemini'?'Gemini':'OpenAI'} · ${model}`,'connected');
    notify('API Key hợp lệ! Website đã sẵn sàng tạo chiến dịch bằng AI thật.');
  } catch (error) { setApiStatus(error.message,'failed'); notify(error.message,'error'); }
  finally { $('#connectBtn').disabled = false; $('#connectBtn').querySelector('span').textContent = 'Kiểm tra kết nối'; }
}
async function generate(useDemo = false) {
  if (state.loading) return;
  if (useDemo) fillDemoBriefIfBlank();
  if (!$('#campaignForm').reportValidity()) { notify('Vui lòng nhập đủ 4 thông tin bắt buộc.','error'); return; }
  let brief;
  try { brief = readBrief(); } catch(error) {notify(error.message,'error');return;}
  if (!useDemo && !$('#apiKey').value.trim()) {
    notify('Để tạo bằng AI thật, hãy nhập API Key. Hoặc nhấn “Thử demo”.','error');
    $('#apiKey').focus();
    if (window.innerWidth <= 990) openMobileMenu();
    return;
  }
  state.brief = brief;
  busy(true);
  $('#resultsSection').classList.remove('hidden');
  $('#resultsSubtitle').textContent = useDemo ? 'Đang chuẩn bị 5 chiến dịch mẫu...' : 'Đang trao đổi với AI để lập 5 chiến dịch và 20 tuần công việc...';
  $('#ideasGrid').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  $('#resultsSection').scrollIntoView({behavior:'smooth',block:'start'});
  try {
    let ideas;
    if (useDemo) {
      await new Promise(resolve => setTimeout(resolve,450));
      ideas = makeDemoIdeas(brief);
    } else {
      const data = await apiRequest({ action:'generate', provider:$('#provider').value,
        apiKey:$('#apiKey').value.trim(),model:selectedModel(),brief });
      ideas = normalizeIdeas(data.ideas);
      setApiStatus(`Đã kết nối ${$('#provider').value} · ${selectedModel()}`,'connected');
    }
    state.ideas = ideas;state.source=useDemo?'demo':'ai';renderResults();
    notify(useDemo?'Đã tạo 5 chiến dịch DEMO (không gọi AI).':'AI đã tạo thành công 5 chiến dịch!');
  } catch(error) {
    if (state.ideas.length) renderResults();
    else $('#resultsSection').classList.add('hidden');
    notify(error.message||'Đã xảy ra lỗi khi tạo ý tưởng.','error');
  } finally { busy(false); }
}

document.addEventListener('click',async (event)=>{
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action=target.dataset.action;
  if (action==='close-dialog') { $('#detailsDialog').close(); return; }
  const idea=getIdeaById(target.dataset.id);
  if (!idea) {notify('Không tìm thấy chiến dịch.','error');return;}
  if (action==='details') openDetails(idea);
  if (action==='save' || action==='remove') toggleSaved(idea);
  if (action==='copy') await copyText(ideaToText(idea));
});

document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>changeView(button.dataset.view)));
$('#menuBtn').addEventListener('click',openMobileMenu);
$('#overlay').addEventListener('click',closeMobileMenu);
$('#goCreateBtn').addEventListener('click',()=>changeView('create'));
$('#campaignForm').addEventListener('submit',event=>{event.preventDefault();generate(false);});
$('#demoBtn').addEventListener('click',()=>generate(true));
$('#regenerateBtn').addEventListener('click',()=>generate(state.source==='demo'));
$('#connectBtn').addEventListener('click',testConnection);
$('#loadModelsBtn').addEventListener('click',loadModelList);
$('#toggleKey').addEventListener('click',()=>{
  const input=$('#apiKey');input.type=input.type==='password'?'text':'password';
  $('#toggleKey').innerHTML=`<svg class="icon"><use href="#i-${input.type==='password'?'eye':'eyeoff'}"/></svg>`;
  $('#toggleKey').setAttribute('aria-label',input.type==='password'?'Hiện API Key':'Ẩn API Key');
});
$('#clearKeyBtn').addEventListener('click',()=>{
  $('#apiKey').value='';$('#apiKey').type='password';
  $('#toggleKey').innerHTML='<svg class="icon"><use href="#i-eye"/></svg>';
  resetConnection(); notify('Đã xóa API Key khỏi ô nhập.');
});
$('#provider').addEventListener('change',()=>{ $('#apiKey').value='';$('#customModel').value='';syncedModels.gemini=[];syncedModels.openai=[];populateModels($('#provider').value);$('#modelListInfo').textContent='Hãy nhập API Key của nền tảng mới rồi lấy danh sách model.';resetConnection(); });
$('#apiKey').addEventListener('input',()=>{syncedModels[$('#provider').value]=[];populateModels($('#provider').value,selectedModel());$('#modelListInfo').textContent='Nếu thay API Key, hãy lấy lại danh sách model của key mới.';resetConnection();});
$('#model').addEventListener('change',()=>{modelHint();resetConnection();});
$('#customModel').addEventListener('input',resetConnection);
$('#copyAllBtn').addEventListener('click',()=>{
  if (!state.saved.length) {notify('Chưa có ý tưởng nào để sao chép.','error');return;}
  copyText(`MARKETGENIUS AI — SHORTLIST\n\n${state.saved.map((idea,i)=>`${i+1}. ${ideaToText(idea)}`).join('\n\n────────────────────\n\n')}`);
});
$('#detailsDialog').addEventListener('click',event=>{if(event.target===$('#detailsDialog'))$('#detailsDialog').close();});
populateModels('gemini');
updateCounters();renderShortlist();
