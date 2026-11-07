'use strict';

const STORAGE_KEY = 'marketgenius-shortlist-v1';
const $ = (selector) => document.querySelector(selector);
// Định dạng VNĐ khi nhập: 15000000 → 15.000.000, nhưng dữ liệu gửi AI vẫn là số nguyên.
// Không định dạng trường phần trăm, số khách hàng hoặc dữ liệu mẫu.
window.MGMoney = (() => {
  const onlyDigits = value => String(value ?? '').replace(/\D/g, '');
  function format(value) {
    const digits = onlyDigits(value).replace(/^0+(?=\d)/, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function parse(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    // Chỉ chấp nhận chữ số và dấu phân cách hàng nghìn.
    if (!/^[\d.,\s]+$/.test(raw)) return NaN;
    const digits = onlyDigits(raw);
    return digits ? Number(digits) : NaN;
  }
  function set(field, value) {
    if (!field) return;
    field.value = field.matches('[data-money]') ? format(value) : String(value ?? '');
  }
  function reformat(field) {
    const caret = field.selectionStart ?? field.value.length;
    const digitsBefore = onlyDigits(field.value.slice(0, caret)).length;
    const result = format(field.value);
    if (field.value !== result) field.value = result;
    if (document.activeElement === field) {
      let newPos = 0, found = 0;
      if (digitsBefore > 0) {
        newPos = result.length;
        for (let i = 0; i < result.length; i++) {
          if (/\d/.test(result[i]) && ++found === digitsBefore) {newPos = i + 1;break;}
        }
      }
      field.setSelectionRange(newPos, newPos);
    }
  }
  document.addEventListener('input', event => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.matches('[data-money]')) reformat(target);
  });
  // Backspace/Delete ngay sát dấu chấm sẽ xóa chữ số phù hợp, không bị mắc kẹt.
  document.addEventListener('beforeinput', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches('[data-money]')) return;
    if (!['deleteContentBackward','deleteContentForward'].includes(event.inputType)) return;
    const start=input.selectionStart, end=input.selectionEnd;
    if (start==null || start!==end) return;
    const forward=event.inputType==='deleteContentForward';
    const punctIndex=forward?start:start-1;
    if (input.value[punctIndex]!=='.') return;
    const chars=input.value.split('');
    let digitPos=forward?punctIndex+1:punctIndex-1;
    while(digitPos>=0 && digitPos<chars.length && !/\d/.test(chars[digitPos])) digitPos+=forward?1:-1;
    if(digitPos<0 || digitPos>=chars.length)return;
    event.preventDefault();
    chars.splice(digitPos,1);
    input.value=format(chars.join(''));
    const before=onlyDigits(chars.slice(0,Math.min(digitPos,chars.length)).join('')).length;
    let caret=0,count=0;
    if(before>0){caret=input.value.length;for(let i=0;i<input.value.length;i++)if(/\d/.test(input.value[i])&&++count===before){caret=i+1;break;}}
    input.setSelectionRange(caret,caret);
    input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  return {format,parse,set,reformat};
})();
const icons = {
  zap: '<svg class="icon"><use href="#i-zap"/></svg>',
  target: '<svg class="icon"><use href="#i-target"/></svg>',
  bookmark: '<svg class="icon"><use href="#i-bookmark"/></svg>',
  check: '<svg class="icon"><use href="#i-check"/></svg>',
  eye: '<svg class="icon"><use href="#i-eye"/></svg>',
  copy: '<svg class="icon"><use href="#i-copy"/></svg>',
  trash: '<svg class="icon"><use href="#i-trash"/></svg>',
  rotate: '<svg class="icon"><use href="#i-rotate"/></svg>',
  close: '<svg class="icon"><use href="#i-close"/></svg>'
};
const state = { ideas: [], saved: loadSaved(), source: '', brief: null, loading: false, view: 'home' };

// Chỉ cấu hình Gemini do website quản lý; khách không nhập khóa hay chọn model.
let guestReady = false;
let guestModel = '';
let guestSiteKey = '';
let guestToken = '';
let guestWidgetId = null;
function setGuestStatus(message, kind=''){
  const node=$('#guestStatus');node.textContent=message;
  node.className=`guest-status ${kind==='ready'?'is-ready':kind==='error'?'is-error':''}`;
}
function refreshAiMode(){
  $('#generateBtn').disabled=state.loading || !guestReady;
  $('#aiFormNotice').textContent='Gemini do website cung cấp · Không cần API Key. Demo không gọi AI và luôn hoạt động.';
  const isDemo=state.source==='demo';
  $('#modeBadge').classList.toggle('is-connected',guestReady && !isDemo);
  $('#modeBadge').innerHTML=`<span class="tiny-pulse"></span>${isDemo?'Demo':guestReady?'AI sẵn sàng':'AI chưa khả dụng'}`;
}
let turnstileScriptPending=false;
function loadTurnstileScript(){
  if(turnstileScriptPending||window.turnstile)return;
  turnstileScriptPending=true;
  const script=document.createElement('script');
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async=true;script.defer=true;
  script.onerror=()=>{turnstileScriptPending=false;setGuestStatus('Không tải được xác minh. Có thể dùng Demo.','error');};
  document.head.appendChild(script);
}
async function initGuestTurnstile(tries=0){
  if(!guestReady || !guestSiteKey || guestWidgetId!==null || !$('#createView').classList.contains('active')) return;
  if(!window.turnstile){
    loadTurnstileScript();
    if(tries>=40){setGuestStatus('Không tải được bước xác minh. Hãy kiểm tra kết nối hoặc dùng Demo.','error');return;}
    setTimeout(()=>initGuestTurnstile(tries+1),250);return;
  }
  try {
    guestWidgetId=window.turnstile.render('#guestTurnstile',{
      sitekey:guestSiteKey,theme:'light',size:'flexible',action:'guest_generate',
      callback:(token)=>{guestToken=token;$('#guestTurnstile').classList.add('mg-verified');setGuestStatus('Đã xác minh. Bạn có thể tạo 5 chiến dịch bằng AI có sẵn.','ready');},
      'expired-callback':()=>{guestToken='';$('#guestTurnstile').classList.remove('mg-verified');setGuestStatus('Phiên xác minh đã hết hạn. Hãy xác minh lại để tiếp tục.');},
      'error-callback':()=>{guestToken='';$('#guestTurnstile').classList.remove('mg-verified');setGuestStatus('Không thể xác minh. Thử tải lại trang hoặc dùng Demo.','error');}
    });
  } catch {setGuestStatus('Không thể khởi tạo xác minh Turnstile.','error');}
}
function resetGuestChallenge(){
  guestToken='';
  $('#guestTurnstile').classList.remove('mg-verified');
  if(guestWidgetId!==null && window.turnstile)try{window.turnstile.reset(guestWidgetId);}catch{}
  if(guestReady)setGuestStatus('Vui lòng xác minh lại trước lượt tạo ý tưởng tiếp theo.');
}
async function loadGuestConfiguration(){
  try {
    const response=await fetch('/api/ai',{method:'GET',cache:'no-store'});
    const data=await readAiJsonResponse(response);
    if(!response.ok || !data.ok)throw new Error(`Không tải được cấu hình AI có sẵn (HTTP ${response.status}).`);
    guestReady=Boolean(data.ok && data.guestAvailable && data.turnstileSiteKey);
    guestModel=guestReady?String(data.guestModel||''):'';
    guestSiteKey=guestReady?String(data.turnstileSiteKey||''):'';
    setGuestStatus(guestReady?`Đã có Gemini (${guestModel}). Xác minh một lần để tạo ý tưởng thật.`:'AI có sẵn chưa khả dụng hoặc đã hết hạn mức. Bạn có thể dùng Demo.',guestReady?'ready':'error');
    if(guestReady)initGuestTurnstile();
  } catch {
    guestReady=false;
    setGuestStatus('Không lấy được cấu hình AI có sẵn. Thử lại sau hoặc dùng Demo.','error');
  }
  refreshAiMode();
}



function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'": '&#39;' })[char]);
}
function newId() { return (globalThis.crypto?.randomUUID?.() || `idea-${Date.now()}-${Math.random().toString(36).slice(2)}`); }
function loadSaved() {
  try { const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(arr) ? arr.filter(isValidIdea).slice(0,100) : []; }
  catch { return []; }
}
const HISTORY_STORAGE_KEY='marketgenius-campaign-history-v13';
function lightweightIdea(idea){
  const result=JSON.parse(JSON.stringify(idea));
  if(result.resources){delete result.resources.suggestions;delete result.resources.diagnostic;}
  return result;
}
function saveLocalWithHistoryEviction(key, data, onPrune){
  for(let attempt=0;attempt<4;attempt++){
    try{localStorage.setItem(key,JSON.stringify(typeof data==='function'?data():data));return true;}
    catch(error){
      if(attempt>=3)break;
      if(onPrune && onPrune())continue;
      let items=[];
      try{items=JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)||'[]');}catch{}
      if(!Array.isArray(items)||!items.length)break;
      items.pop();
      try{localStorage.setItem(HISTORY_STORAGE_KEY,JSON.stringify(items));}
      catch{break;}
    }
  }
  notify('Bộ nhớ trình duyệt đã đầy, không thể lưu sau khi giảm tối đa 3 mục lịch sử.','error');
  return false;
}
function saveStorage() {
  return saveLocalWithHistoryEviction(STORAGE_KEY,()=>state.saved.map(lightweightIdea),window.MGPruneOldestHistory);
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
const APP_ROUTES = Object.freeze(['home','create','shortlist','history']);
function resolveAppRoute(hash=window.location.hash) {
  const route=String(hash||'').replace(/^#/, '').toLowerCase();
  return {view:APP_ROUTES.includes(route)?route:'home', scrollGuide:route==='about'};
}
function scrollToGuide() {
  document.getElementById('how-it-works')?.scrollIntoView({behavior:'smooth',block:'start'});
}
// Central navigation for menu links, CTAs, history restore and browser Back/Forward.
function changeView(view, options={}) {
  const target=APP_ROUTES.includes(view)?view:'home';
  state.view=target;
  for (const name of APP_ROUTES) {
    document.getElementById(name+'View')?.classList.toggle('active',name===target);
  }
  document.querySelectorAll('[data-view]').forEach(control=>{
    const active=control.dataset.view===target;
    control.classList.toggle('active',active);
    if(control.matches('.site-nav a[data-view]')) {
      if(active) control.setAttribute('aria-current','page');
      else control.removeAttribute('aria-current');
    }
  });
  if(target==='shortlist') renderShortlist();
  closeMobileMenu();
  if(target==='create') initGuestTurnstile();
  if(!options.fromHash && window.location.hash!=='#'+target) window.history.pushState(null,'','#'+target);
  if(options.scrollGuide){
    window.requestAnimationFrame(scrollToGuide);
  } else {
    window.scrollTo({top:0,behavior:'instant'});
  }
}
function openMobileMenu() {
  const nav=$('#sidebar'), button=$('#menuBtn');
  nav.classList.add('open');$('#overlay').hidden=false;
  button.setAttribute('aria-expanded','true');
  $('#navClose')?.focus();
}
function closeMobileMenu() {
  const nav=$('#sidebar'), button=$('#menuBtn');
  nav.classList.remove('open');$('#overlay').hidden=true;
  button.setAttribute('aria-expanded','false');
}
function updateCounters() {
  const count=state.saved.length;
  $('#sideSavedCount').textContent=count;
  // The home statistic will be removed in stage 4; tolerate either markup meanwhile.
  const dashboardCount=$('#dashboardSavedCount');
  if(dashboardCount) dashboardCount.textContent=String(count).padStart(2,'0');
  $('#shortlistDescription').textContent=`${count} ý tưởng được lưu trên trình duyệt này.`;
  $('#copyAllBtn').disabled=count===0;
}
function isAdvancedBrief() { return document.querySelector('input[name="briefMode"]:checked')?.value === 'advanced'; }
function refreshBriefMode() {
  const advanced=isAdvancedBrief();
  $('#advancedBrief').classList.toggle('hidden',!advanced);
  $('#budgetAmount').required=advanced;
  $('#budgetScenarioSection').classList.toggle('hidden',!advanced);
  $('#briefModeNotice').textContent=advanced
    ? 'Chuyên sâu: nhập ngân sách VNĐ và chọn cách sử dụng. AI không tự nhận doanh nghiệp có ưu đãi hoặc nguồn lực chưa xác nhận.'
    : 'Vui lòng nhập 4 thông tin bắt buộc. Lưu ý: KPI và ngân sách do AI gợi ý mang tính tham khảo nếu dữ liệu đầu vào chưa đầy đủ.';
  refreshBudgetScenario();
  refreshPromotionFields();
  refreshCustomerDataFields();
}
function refreshBudgetScenario(){
  const mode=document.querySelector('input[name="budgetScenario"]:checked')?.value || 'alternatives';
  $('#budgetScenarioHint').textContent=mode==='portfolio'
    ? 'TỔNG ngân sách cho cả 5 hoạt động. Website chia số tiền thành 5 phần có tổng chính xác bằng giá trị này.'
    : 'Có 5 phương án để lựa chọn. Mỗi phương án riêng lẻ dùng tối đa số tiền nhập; KHÔNG cộng thành 5 lần.';
}
function briefFactList(brief){
  if(!brief)return [];
  const facts=[`Sản phẩm: ${brief.product}`,`Ngành hàng: ${brief.industry}`,`Mức ngân sách: ${brief.budget}`,`Mục tiêu: ${brief.goal}`];
  if(brief.budgetAmount!=null)facts.push(`Ngân sách người dùng nhập: ${Number(brief.budgetAmount).toLocaleString('vi-VN')}đ`);
  if(brief.audience)facts.push(`Khách hàng mục tiêu theo brief: ${brief.audience}`);
  if(brief.usp)facts.push(`Điểm nổi bật do người dùng khai báo: ${brief.usp}`);
  const c=brief.context||{};
  if(c.marketRegion)facts.push(`Thị trường: ${c.marketRegion}`);
  if(c.targetMetric)facts.push(`Mục tiêu định lượng: ${c.targetMetric}`);
  if(c.baseline)facts.push(`Số liệu nền do người dùng khai báo: ${c.baseline}`);
  if(c.sellingPrice!=null)facts.push(`Giá bán do người dùng khai báo: ${Number(c.sellingPrice).toLocaleString('vi-VN')}đ`);
  if(c.teamCapacity && c.teamCapacity!=='unknown')facts.push(`Quy mô triển khai: ${{solo:'1 người',small:'2–3 người',medium:'4–10 người',agency:'Đội chuyên trách'}[c.teamCapacity]||c.teamCapacity}`);
  if(c.channels?.length)facts.push(`Kênh có thể sử dụng: ${c.channels.join(', ')}`);
  if(c.customerData==='yes')facts.push('Người dùng xác nhận có tệp khách phù hợp để liên hệ');
  if(c.promotionType==='percent')facts.push(`Giới hạn giảm giá được khai báo: ${c.promotionLimit}%`);
  if(c.promotionType==='fixed')facts.push(`Giới hạn giảm giá được khai báo: ${Number(c.promotionLimit).toLocaleString('vi-VN')}đ`);
  return facts.slice(0,13);
}
function briefAssumptionList(brief){
  const c=brief?.context||{};
  const items=['Hiệu quả chiến dịch, chi phí quảng cáo và KPI là mục tiêu thử nghiệm cho đến khi có kết quả đo thực tế.'];
  if(!c.baseline)items.push('Chưa có số liệu nền để dự báo tỷ lệ chuyển đổi hoặc doanh thu.');
  if(brief?.briefMode!=='advanced')items.push('Chưa xác nhận nguồn lực, tệp khách cũ, kênh và chính sách ưu đãi của doanh nghiệp.');
  else {
    if(!c.channels?.length)items.push('Chưa xác nhận các kênh Marketing hiện có.');
    if(c.customerData!=='yes')items.push('Chưa xác nhận có tệp khách được phép liên hệ để tiếp thị.');
    if(c.promotionType==='none')items.push('Chưa có chương trình giảm giá/quà tặng được phê duyệt.');
  }
  return items.slice(0,4);
}
function refreshPromotionFields(){
  const show=isAdvancedBrief()&&$('#promotionType').value!=='none';
  const field=$('#promotionLimit');
  const isVnd=$('#promotionType').value==='fixed';
  $('#promotionLimitWrap').classList.toggle('hidden',!show);
  field.required=show;
  // Giới hạn tính theo VNĐ hiển thị dấu chấm; giới hạn theo % vẫn là số bình thường.
  field.type=isVnd?'text':'number';
  if(isVnd){field.setAttribute('data-money','vnd');field.setAttribute('inputmode','numeric');MGMoney.reformat(field);}
  else{field.removeAttribute('data-money');field.removeAttribute('inputmode');}
  field.max=isVnd?'1000000000000':'100';
  field.placeholder=isVnd?'VD: 500.000 (VNĐ)':'VD: 10 (%)';
}
function refreshCustomerDataFields(){
  $('#customerCountWrap').classList.toggle('hidden',!(isAdvancedBrief()&&$('#customerData').value==='yes'));
}
// Text mẫu chưa sửa chỉ phục vụ hướng dẫn nhập; không được coi là dữ kiện thực.
function verifiedBriefText(id) {
  const field=$(`#${id}`);
  return field?.dataset.templateDraft==='1' ? '' : (field?.value||'').trim();
}
function readBrief() {
  const advanced=isAdvancedBrief();
  const numberText=advanced?$('#budgetAmount').value.trim():'';
  const budgetAmount=MGMoney.parse(numberText);
  if (advanced && (budgetAmount===null || !Number.isSafeInteger(budgetAmount) || budgetAmount<1000 || budgetAmount>1_000_000_000_000)) {
    throw new Error('Chế độ chuyên sâu cần ngân sách từ 1.000 đến 1.000 tỷ VNĐ.');
  }
  const brief={industry:$('#industry').value.trim(),product:$('#product').value.trim(),budget:$('#budget').value,goal:$('#goal').value,
    audience:advanced?$('#audience').value.trim():'',budgetAmount,usp:advanced?verifiedBriefText('usp'):'',briefMode:advanced?'advanced':'quick'};
  if(!advanced)return brief;
  const valueOrNull=(id)=>{const el=$(`#${id}`);const s=el.value.trim();return el.matches('[data-money]')?MGMoney.parse(s):(s===''?null:Number(s));};
  const sellingPrice=valueOrNull('sellingPrice');
  if(sellingPrice!==null&&(!Number.isSafeInteger(sellingPrice)||sellingPrice<0||sellingPrice>1e12))throw new Error('Giá bán sản phẩm không hợp lệ.');
  const promotionType=$('#promotionType').value;
  const promotionLimit=promotionType==='none'?null:valueOrNull('promotionLimit');
  if(promotionType!=='none'&&(promotionLimit===null||!Number.isSafeInteger(promotionLimit)||promotionLimit<0||(promotionType==='percent'?promotionLimit>100:promotionLimit>1e12)))throw new Error('Giới hạn ưu đãi không hợp lệ.');
  const customerCount=$('#customerData').value==='yes'?valueOrNull('customerCount'):null;
  if(customerCount!==null&&(!Number.isSafeInteger(customerCount)||customerCount<0||customerCount>1e8))throw new Error('Số khách hàng hợp lệ phải là số nguyên không âm.');
  brief.context={sellingPrice,marketRegion:verifiedBriefText('marketRegion'),targetMetric:$('#targetMetric').value.trim(),baseline:verifiedBriefText('baseline'),
    teamCapacity:$('#teamCapacity').value,customerData:$('#customerData').value,customerCount,
    channels:[...document.querySelectorAll('input[name="ownedChannel"]:checked')].map(x=>x.value),
    capabilities:[...document.querySelectorAll('input[name="capability"]:checked')].map(x=>x.value),
    promotionType,promotionLimit,scenario:document.querySelector('input[name="budgetScenario"]:checked')?.value==='portfolio'?'portfolio':'alternatives'};
  return brief;
}
function fillDemoBriefIfBlank() {
  if (!$('#industry').value) $('#industry').value = 'Đồ ăn & thức uống';
  if (!$('#product').value.trim()) $('#product').value = 'Trà thảo mộc Mộc An';
  if (!$('#budget').value) $('#budget').value = 'Thấp';
  if (!$('#goal').value) $('#goal').value = 'Tăng doanh số bán hàng';
  if(isAdvancedBrief() && !$('#budgetAmount').value.trim())MGMoney.set($('#budgetAmount'),2000000);
}
// Sources are provided by server-side Google Search grounding. Older history records
// may not have them; normalize defensively and only allow HTTPS hyperlinks.
function normalizeResearchSources(raw){
  if(!raw||typeof raw!=='object')return null;
  function safeUrl(value){try{const u=new URL(String(value||''));return u.protocol==='https:'&&u.href.length<=3000?u.href:'';}catch{return '';}}
  function text(v,n=200){return String(v??'').slice(0,n);}
  const normalizeImage=x=>x&&safeUrl(x.url)?{
    url:safeUrl(x.url),sourceUrl:safeUrl(x.sourceUrl)||safeUrl(x.url),proxyUrl:/^\/api\/image\?u=[A-Za-z0-9_%&=.-]+$/.test(String(x.proxyUrl||''))?x.proxyUrl:'',sourceTitle:text(x.sourceTitle),label:text(x.label),license:text(x.license,40)}:null;
  const image=normalizeImage(raw.image);
  const images=Array.isArray(raw.images)?raw.images.map(normalizeImage).filter(Boolean).slice(0,5):[];
  if(image&&!images.some(x=>x.url===image.url))images.unshift(image);
  const sources=(value,max)=>Array.isArray(value)?value.slice(0,max).filter(x=>x&&safeUrl(x.url)).map(x=>({
    url:safeUrl(x.url),title:text(x.title),source:text(x.source),verification:text(x.verification)})):[];
  const links=raw.searchLinks||{};
  return {image:image||images[0]||null,images,videos:sources(raw.videos,3),articles:sources(raw.articles,4),status:text(raw.status,30),
    note:text(raw.note,300),searchLinks:{imageSearch:safeUrl(links.imageSearch),tiktokSearch:safeUrl(links.tiktokSearch),articleSearch:safeUrl(links.articleSearch)},
    suggestions:Array.isArray(raw.suggestions)?raw.suggestions.filter(v=>typeof v==='string').slice(0,3).map(v=>v.slice(0,16000)):[],
    diagnostic:raw.diagnostic&&typeof raw.diagnostic==='object'?{imageCount:Number(raw.diagnostic.imageCount)||0,webpageCount:Number(raw.diagnostic.webpageCount)||0,imageSearchStatus:text(raw.diagnostic.imageSearchStatus,30),imageSearchEnabled:Boolean(raw.diagnostic.imageSearchEnabled)}:null};
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
      strategy: text(idea.strategy,140), rationale: text(idea.rationale,600),
      sampleContent: text(idea.sampleContent,700), riskPlan: text(idea.riskPlan,600),
      assumptions:Array.isArray(idea.assumptions)?idea.assumptions.slice(0,3).map(x=>text(x,200)):[],
      portfolioWeight: Number.isFinite(Number(idea.portfolioWeight)) && Number(idea.portfolioWeight)>0 ? Number(idea.portfolioWeight) : null,
      evidence:{facts:briefFactList(state.brief),caveats:briefAssumptionList(state.brief)},
      resources:normalizeResearchSources(idea.resources),
      allocations: Array.isArray(idea.allocations) ? idea.allocations.slice(0,8).map(a=>({label:text(a.label,85),percent:Number(a.percent)})) : undefined,
      kpis: Array.isArray(idea.kpis) ? idea.kpis.slice(0,5).map(x=>text(x,220)) : [],
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
  const weekSummary = (idea.timeline||[]).map((x,i)=>({task:String(x?.task||'').trim(),i})).filter(x=>x.task).map(({task,i})=>`<div class="week-pill ${idea.doneWeeks?.[i]?'is-done':''}"><b>${idea.doneWeeks?.[i]?'✓ ':''}Tuần ${String(i+1).padStart(2,'0')}</b><span>${esc(task.split(/[.;\n]/)[0].slice(0,60))}</span></div>`).join('');
  return `<article class="idea-card">
    <div class="idea-card-top"><span class="idea-number">Ý TƯỞNG ${String(idea.number || 1).padStart(2,'0')}</span><span class="idea-channel">${esc(idea.channel)}</span></div>
    <h3>${esc(idea.title)}</h3>${savedView&&idea.source==='ai'?'<p class="history-source">AI cá nhân (bản cũ)</p>':''}<p class="idea-description">${esc(idea.concept)}</p>
    <div class="idea-detail"><strong>Điểm nhấn chiến dịch</strong><p>${esc(idea.hook || 'Chiến dịch được cá nhân hóa cho sản phẩm của bạn.')}</p></div>
    <div class="idea-timeline-header"><strong>Timeline triển khai</strong><span>04 tuần</span></div>
    <div class="week-pills">${weekSummary}</div>
    <div class="idea-footer">
      ${!savedView?`<button type="button" class="idea-save ${saved ? 'saved':''}" data-action="save" data-id="${safeId}">${icon(saved ? 'check':'bookmark')} ${saved?'Đã lưu':'Lưu shortlist'}</button>`:''}
      <div class="idea-actions-right"><button type="button" class="idea-preview" data-action="details" data-id="${safeId}">${icon('eye')} Xem chi tiết</button></div>
    </div>
  </article>`;
}
function renderResults() {
  const section = $('#resultsSection');
  section.classList.remove('hidden');
  $('#ideasGrid').innerHTML = state.ideas.map(idea => renderCard(idea)).join('');
  $('#resultsSubtitle').textContent = formatBrief(state.brief);
  const label = $('#sourceTag');
  label.textContent = state.source==='demo'?'DỮ LIỆU DEMO':state.source==='ai'?'AI cá nhân (bản cũ)':'AI CÓ SẴN · GEMINI';
  label.classList.toggle('demo',state.source==='demo');
  refreshAiMode();
  const attribution=$('#googleResearchAttribution');
  if(attribution){
    const suggestions=state.ideas[0]?.resources?.suggestions||[];
    attribution.classList.toggle('hidden',!suggestions.length);
    attribution.innerHTML=suggestions.length?`<div><strong>Tra cứu nguồn qua Google Search</strong><small>Đề xuất tìm kiếm từ Google, không phải nội dung AI tự tạo</small></div><div class="grounding-chip-grid">${suggestions.map((html,i)=>`<iframe title="Đề xuất Google Search ${i+1}" sandbox="allow-popups allow-popups-to-escape-sandbox" loading="lazy" referrerpolicy="no-referrer" srcdoc="${esc(html)}"></iframe>`).join('')}</div>`:'';
  }
  if(typeof window.renderPortfolioSummary==='function')window.renderPortfolioSummary(state.ideas,state.brief);
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
    const savedCopy = JSON.parse(JSON.stringify(idea));
    if(savedCopy.resources){delete savedCopy.resources.suggestions;delete savedCopy.resources.diagnostic;}
    if (!savedCopy.budgetTier && state.ideas.some(x => x.id === idea.id) && state.brief?.budget) savedCopy.budgetTier = state.brief.budget;
    state.saved.unshift(savedCopy); notify('Đã lưu ý tưởng vào shortlist!');
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
    {title:`Bạn giới thiệu bạn – Cùng khám phá ${p}`,channel:'Facebook · Zalo',concept:`Chương trình khách hàng giới thiệu bạn bè bằng mã hoặc lời nhắn cá nhân, chỉ mở ưu đãi nếu doanh nghiệp có chính sách được xác nhận.`,hook:'Tận dụng lòng tin từ người quen để tạo đơn hàng mới với chi phí kiểm soát được.',kpis:['Lượt giới thiệu','Số khách mới','Chi phí/đơn'],timeline:['Thiết kế quy tắc giới thiệu và cách theo dõi mã; chỉ thêm quà nếu được duyệt.','Đăng nội dung giải thích trên kênh được phép, không tự gửi tin cho khách chưa đồng ý.','Nhắc chương trình, chia sẻ phản hồi và tối ưu ưu đãi.','Đối soát đơn, tổng kết chi phí quà tặng và kết quả giới thiệu.']},
    {title:`Một câu chuyện, một lý do chọn ${p}`,channel:'Facebook · Instagram',concept:`Kể câu chuyện nguồn gốc và điểm khác biệt của ${p} qua bài viết dạng carousel và phản hồi khách hàng.`,hook:'Đánh vào giá trị và cảm xúc thay cho giảm giá trực tiếp.',kpis:['Lượt lưu bài','Tương tác','Tin nhắn tư vấn'],timeline:['Xác định thông điệp, thu thập ảnh thật và câu chuyện sản phẩm.','Đăng chuỗi 3 bài về vấn đề, giải pháp, giá trị sử dụng.','Khuyến khích khách hàng chia sẻ trải nghiệm; chọn câu chuyện nổi bật.','Tổng hợp FAQ, đo lượt nhắn tin và cải thiện nội dung chuyển đổi.']},
    {title:`Mini Challenge: Thử ngay ${p}`,channel:'TikTok · Cộng đồng',concept:`Gợi ý khách chia sẻ ảnh/video liên quan đến ${p} nếu họ đồng ý, có thể trưng bày bài nổi bật khi được phép.`,hook:'Khuyến khích cộng đồng tự tạo nội dung và lan truyền tự nhiên.',kpis:['Bài UGC hợp lệ','Lượt tiếp cận','Lượng người theo dõi mới'],timeline:['Xác định thể lệ, cách xin phép dùng nội dung và hashtag riêng; không hứa thưởng chưa duyệt.','Đăng video mở màn, mời các khách hàng đầu tiên tham gia.','Tổng hợp bài tham gia, chia sẻ bài nổi bật và duy trì thử thách.','Chọn bài hợp lệ, công bố cảm ơn người tham gia và đo kết quả.']},
    {title:`Khách hàng cũ – Ưu đãi đúng lúc`,channel:'Zalo OA · Email',concept:`Nếu có tệp khách đã cho phép liên hệ, chia sẻ hướng dẫn sử dụng ${p} và mời phản hồi tự nguyện.`,hook:'Tăng doanh thu lặp lại bằng nội dung hữu ích và ưu đãi có mục tiêu.',kpis:['Tỷ lệ phản hồi','Đơn mua lại','Doanh thu mua lại'],timeline:['Phân nhóm khách đồng ý nhận tin; xây dựng nội dung chăm sóc.','Gửi hướng dẫn hữu ích và khảo sát ngắn sau mua.','Chỉ gửi thông tin phù hợp nếu có quyền tiếp thị, tránh làm phiền hoặc nhắn quá nhiều.','Đo số đơn lặp lại, xử lý phản hồi và cải thiện chương trình.']}
  ];
  const sampleDetails = [
    {strategy:'Video trải nghiệm thực tế',rationale:'Dùng video để người xem nhìn thấy cách sử dụng sản phẩm. Cần thử nhiều nội dung để kiểm chứng mức độ quan tâm.',sampleContent:`${p} có phù hợp với bạn? Xem cách sử dụng và đặt câu hỏi ở bình luận nhé. Xem thêm thông tin sản phẩm tại trang của chúng tôi!`,riskPlan:'Video ít tương tác: thử lại góc quay và câu mở đầu, so sánh tỷ lệ xem hết trước khi quảng cáo.',kpis:['8 video được đăng trong 4 tuần – kiểm tra lịch đăng','10.000 lượt xem là mục tiêu thử nghiệm – đối chiếu thống kê TikTok']},
    {strategy:'Giới thiệu bạn bè',rationale:'Đề xuất cơ chế giới thiệu để tận dụng sự tin tưởng của khách hàng hiện có; chỉ triển khai nếu có khách hàng cũ đồng ý nhận tin.',sampleContent:`Đã thử ${p}? Hãy giới thiệu cho bạn bè quan tâm; xem điều kiện chương trình và quyền lợi tại trang chính thức.`,riskPlan:'Chi phí tặng quà vượt biên lợi nhuận: giới hạn số lượt đổi quà, kiểm tra đơn hợp lệ trước khi trao.',kpis:['1 chương trình giới thiệu được công bố – kiểm tra thể lệ','30 lượt giới thiệu là mục tiêu thử nghiệm – tổng hợp mã giới thiệu']},
    {strategy:'Kể câu chuyện thương hiệu',rationale:'Nội dung câu chuyện có thể giúp khách hiểu sản phẩm hơn mà không phụ thuộc hoàn toàn vào giảm giá; cần dùng thông tin thật.',sampleContent:`Điều gì khiến ${p} đáng để tìm hiểu? Cùng xem câu chuyện sản phẩm và đặt câu hỏi cho chúng tôi!`,riskPlan:'Thông tin sản phẩm chưa đủ chứng cứ: chỉ đăng ảnh và dữ liệu được xác nhận, không dùng đánh giá khách hàng chưa được đồng ý.',kpis:['3 bài carousel được đăng – kiểm tra lịch nội dung','20 tin nhắn tư vấn là mục tiêu thử nghiệm – thống kê hộp thư']},
    {strategy:'Nội dung do cộng đồng tạo',rationale:'Khuyến khích người dùng tham gia sáng tạo nội dung; cần thể lệ minh bạch và quyền sử dụng ảnh/video.',sampleContent:`Bạn sáng tạo nội dung với ${p} thế nào? Đăng bài dự thi theo thể lệ trên trang và chia sẻ ý tưởng của mình!`,riskPlan:'Ít người tham gia hoặc tranh chấp bản quyền: công bố thể lệ, yêu cầu đồng ý dùng nội dung và có quà khuyến khích phù hợp.',kpis:['1 thể lệ và 1 video mở màn – kiểm tra trước khi đăng','10 bài tham gia hợp lệ là mục tiêu thử nghiệm – kiểm tra hashtag']},
    {strategy:'Chăm sóc và mua lại',rationale:'Dùng nội dung hữu ích để giữ liên hệ với người đã mua; chỉ gửi thông tin cho khách hàng đồng ý nhận tin.',sampleContent:`Bạn đang sử dụng ${p}? Đây là một số gợi ý hữu ích dành cho bạn. Nhắn tin nếu cần hỗ trợ thêm!`,riskPlan:'Khách hàng thấy bị làm phiền: cho phép từ chối nhận tin và giới hạn tần suất gửi.',kpis:['2 thông điệp chăm sóc được gửi đúng lịch – nhật ký gửi','10 phản hồi là mục tiêu thử nghiệm – theo dõi phản hồi tự nguyện']}
  ];
  return normalizeIdeas(templates.map((t,i)=>({
    ...t,...sampleDetails[i],audience:a,budgetSplit:budget,portfolioWeight:[25,25,20,15,15][i],
    timeline:t.timeline.map((task,j)=>({week:j+1,task})),
    number:i+1
  })));
}
function busy(active) {
  state.loading = active;
  $('#generateBtn').disabled = active || !guestReady;
  $('#demoBtn').disabled = active;
  $('#regenerateBtn').disabled = active;
  $('#generateBtn').innerHTML = active ? `<span class="spin">${icon('rotate')}</span> AI đang lên ý tưởng...` : `${icon('zap')} Tạo 5 ý tưởng <svg class="icon"><use href="#i-arrow"/></svg>`;
  if(!active)refreshAiMode();
}
// Parse backend responses, including HTML from hosting proxy errors.
// Never print the raw response (which could include diagnostics or sensitive information).
async function readAiJsonResponse(response) {
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch {}
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    const status = response.status;
    const hint = status === 404
      ? 'Không tìm thấy /api/ai. Kiểm tra ứng dụng Node.js và server.js trên cPanel.'
      : status === 502 || status === 503 || status === 504
      ? 'Máy chủ AI đang lỗi, quá tải hoặc quá thời gian. Kiểm tra logs của ứng dụng Node.js trong cPanel.'
      : status === 401 || status === 403
      ? 'Yêu cầu bị chặn hoặc từ chối. Kiểm tra cấu hình bảo mật và Cloudflare Turnstile.'
      : 'Kiểm tra logs ứng dụng Node.js trong cPanel và Network của yêu cầu /api/ai.';
    const error = new Error(`API trả HTTP ${status} nhưng không phải JSON. ${hint}`);
    error.status = status; error.code = 'non_json_response';
    throw error;
  }
  return data;
}
async function apiRequest(payload) {
  let response;
  try {
    response = await fetch('/api/ai', {
      method:'POST', headers:{'Content-Type':'application/json'},
      cache:'no-store', body:JSON.stringify(payload)
    });
  } catch {
    throw new Error('Không kết nối được máy chủ AI. Hãy kiểm tra mạng hoặc thử tải lại website.');
  }
  const data = await readAiJsonResponse(response);
  if (!response.ok || !data.ok) {
    const error = new Error(data.error || `Yêu cầu API thất bại (${response.status}).`);
    error.status = data.providerStatus || response.status;
    error.code = data.code;
    throw error;
  }
  return data;
}
async function generate(useDemo = false) {
  if (state.loading) return;
  if (useDemo) fillDemoBriefIfBlank();
  if (!$('#campaignForm').reportValidity()) { notify(isAdvancedBrief()?'Hãy điền đủ 4 thông tin cơ bản và ngân sách VNĐ ở chế độ Chuyên sâu.':'Vui lòng nhập đủ 4 thông tin bắt buộc.','error'); return; }
  let brief;
  try { brief = readBrief(); } catch(error) {notify(error.message,'error');return;}
  if (!useDemo) {
    if (!guestReady) {notify('AI có sẵn chưa khả dụng. Bạn có thể dùng Demo ngay.','error');return;}
    if (!guestToken) {notify('Hãy hoàn thành xác minh bảo vệ trước khi tạo.','error');$('#apiPanel').scrollIntoView({behavior:'smooth',block:'start'});return;}
  }
  const previousBrief = state.brief;
  state.brief = brief;
  busy(true, useDemo);
  $('#resultsSection').classList.remove('hidden');
  $('#resultsSubtitle').textContent = useDemo ? 'Đang chuẩn bị 5 hoạt động mẫu...' : 'Đang tạo 5 chiến dịch, mỗi chiến dịch có kế hoạch triển khai 4 tuần...';
  $('#ideasGrid').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  $('#resultsSection').scrollIntoView({behavior:'smooth',block:'start'});
  try {
    let ideas;
    if (useDemo) {
      await new Promise(resolve => setTimeout(resolve,450));
      ideas = makeDemoIdeas(brief);
    } else {
      const data=await apiRequest({action:'guest-generate',brief,turnstileToken:guestToken});
      ideas=normalizeIdeas(data.ideas);
      setGuestStatus('AI có sẵn đã tạo thành công.','ready');
    }
    state.ideas = ideas;state.source=useDemo?'demo':'guest';renderResults();
    if (!useDemo && window.MGProgress) await window.MGProgress.complete();
    notify(useDemo?'Đã tạo 5 chiến dịch DEMO (không gọi AI).':'AI đã tạo thành công 5 chiến dịch!');
  } catch(error) {
    if (state.ideas.length) {
      // Never label an old result as if it belonged to the newly submitted brief.
      state.brief = previousBrief;
      renderResults();
      $('#resultsSubtitle').textContent += ' · Đây là kết quả lần trước; lần tạo mới chưa thành công.';
    } else {
      $('#resultsSection').classList.add('hidden');
      state.brief = previousBrief;
    }
    if(error.code==='guest_site_limit'){guestReady=false;refreshAiMode();setGuestStatus('AI có sẵn đã hết hạn mức. Bạn có thể dùng Demo.','error');}
    notify(error.message||'Đã xảy ra lỗi khi tạo ý tưởng. Brief đã được giữ nguyên trên form.','error');
  } finally { if(!useDemo)resetGuestChallenge(); window.MGProgress?.stop(); busy(false); }
}

document.addEventListener('click',async (event)=>{
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action=target.dataset.action;
  if (action==='close-dialog') { $('#detailsDialog').close(); return; }
  // Studio / Planner own their action names; do not show a false "not found" toast.
  if (!['details','save','remove','copy'].includes(action)) return;
  const idea=getIdeaById(target.dataset.id);
  if (!idea) {notify('Không tìm thấy chiến dịch.','error');return;}
  if (action==='details') openDetails(idea);
  if (action==='save' || action==='remove') toggleSaved(idea);
  if (action==='copy') await copyText(ideaToText(idea));
});

document.querySelectorAll('[data-view]').forEach(control=>control.addEventListener('click',event=>{
  event.preventDefault();
  changeView(control.dataset.view,{scrollGuide:control.dataset.scroll==='how-it-works'});
}));
$('#menuBtn').addEventListener('click',openMobileMenu);
$('#overlay').addEventListener('click',closeMobileMenu);
$('#goCreateBtn').addEventListener('click',()=>changeView('create'));
document.querySelectorAll('input[name="briefMode"]').forEach(x=>x.addEventListener('change',refreshBriefMode));
document.querySelectorAll('input[name="budgetScenario"]').forEach(x=>x.addEventListener('change',refreshBudgetScenario));
$('#promotionType').addEventListener('change',()=>{ $('#promotionLimit').value=''; refreshPromotionFields(); });
$('#customerData').addEventListener('change',refreshCustomerDataFields);
refreshBriefMode();
$('#campaignForm').addEventListener('submit',event=>{event.preventDefault();generate(false);});
$('#demoBtn').addEventListener('click',()=>generate(true));
$('#regenerateBtn').addEventListener('click',()=>generate(state.source==='demo'));
$('#copyAllBtn').addEventListener('click',()=>{
  if (!state.saved.length) {notify('Chưa có ý tưởng nào để sao chép.','error');return;}
  copyText(`MARKETGENIUS AI — SHORTLIST\n\n${state.saved.map((idea,i)=>`${i+1}. ${ideaToText(idea)}`).join('\n\n────────────────────\n\n')}`);
});
$('#detailsDialog').addEventListener('click',event=>{if(event.target===$('#detailsDialog'))$('#detailsDialog').close();});
refreshAiMode();
loadGuestConfiguration();
updateCounters();renderShortlist();
