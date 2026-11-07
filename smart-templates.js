'use strict';
/**
 * MarketGenius AI — Smart Quick Templates.
 * Site-owned Gemini creates 4 product-specific templates through a protected
 * server endpoint. Offline keyword templates remain a clearly labeled fallback.
 * No visitor API key is required; unverified suggestions are never treated as facts.
 */
(() => {
  const pick = id => document.getElementById(id);
  const picker = pick('smartTemplatePicker');
  const cards = pick('smartTemplateCards');
  const profileNote = pick('templateProfileNote');
  const customPanel = pick('customTemplatePanel');
  const customCards = pick('customTemplateCards');
  const banner = pick('selectedTemplateBanner');
  const aiBtn=pick('generateAiTemplatesBtn');
  const aiStatus=pick('templateAiStatus');
  const offlineBtn=pick('templateOfflineBtn');
  const aiTurnstile=pick('templateTurnstile');
  if (!picker || !cards || !pick('product') || !banner) return;
  const verification=document.createElement('section');
  verification.id='templateVerificationSummary';
  verification.className='template-verification-summary hidden';
  verification.setAttribute('aria-label','Những trường mẫu cần xác nhận');
  verification.innerHTML=`<strong>Thông tin mẫu đã điền sẵn</strong><p data-template-fill-msg></p>
    <div class="template-verification-grid">
      <div><span>GIÁ BÁN / SỐ LIỆU THỰC</span><p>Chưa có dữ liệu. Nhập giá thật nếu biết; không tự đoán.</p></div>
      <div><span>KÊNH NÊN THỬ</span><p data-template-channels></p><button type="button" data-template-channel-action class="template-confirm-channels">Tôi có thể triển khai các kênh này</button></div>
      <div><span>QUYỀN SỬ DỤNG / KHUYẾN MÃI</span><p>Chỉ chọn những gì doanh nghiệp thật sự được phép dùng.</p></div>
    </div>`;
  banner.insertAdjacentElement('afterend',verification);

  const LOCAL_KEY = 'marketgenius-brief-templates-v1';
  const MAX_TEMPLATES = 12;
  // Các giá trị có thể dùng để đọc mẫu nhưng CHƯA PHẢI dữ kiện doanh nghiệp.
  const DRAFT_FIELDS = ['marketRegion','usp','baseline'];
  const SUGGESTED_CHANNELS = {
    'Facebook':'Facebook', 'TikTok':'TikTok', 'TikTok Shop':'Shopee/TikTok Shop',
    'sàn TMĐT':'Shopee/TikTok Shop', 'Instagram':'TikTok', 'YouTube':'TikTok',
    'Website':'Website', 'Zalo OA':'Zalo OA', 'Email':'Email'
  };
  const get = id => pick(id)?.value ?? '';
  const normalize = value => String(value ?? '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatMoney = num => Number(num).toLocaleString('vi-VN') + 'đ';
  const profiles = [
    {id:'pet',re:/(\bcho\b|\bmeo\b|thu cung|yem cho|thuc an cho|do choi cho|pet)/,name:'Sản phẩm thú cưng',industry:'Thời trang & phụ kiện',audience:'Người đang nuôi thú cưng, ưu tiên sự phù hợp, tiện lợi và độ an toàn',channels:'TikTok, Facebook, cộng đồng nuôi thú cưng',angle:'Video dùng thực tế và cách chọn kích cỡ'},
    {id:'phone-accessory',re:/(op lung|cuong luc|sac du phong|sac nhanh|cap sac|day sac|tai nghe|phu kien dien thoai|gia do dien thoai)/,name:'Phụ kiện điện thoại',industry:'Phụ kiện điện thoại',audience:'Người dùng điện thoại đang tìm phụ kiện phù hợp với dòng máy và nhu cầu',channels:'TikTok Shop, Facebook, sàn TMĐT',angle:'Demo thiết kế, khả năng tương thích và trải nghiệm sản phẩm'},
    {id:'beauty',re:/(son moi|son duong|kem nen|phan ma|serum|kem chong nang|nuoc hoa|my pham|cham soc da|sua rua mat|toner)/,name:'Mỹ phẩm & làm đẹp',industry:'Mỹ phẩm & làm đẹp',audience:'Người quan tâm chăm sóc cá nhân và làm đẹp, muốn xem trải nghiệm thật',channels:'TikTok, Instagram, Facebook',angle:'Review chân thực, swatch và hướng dẫn sử dụng'},
    {id:'tea',re:/(tra thao moc|tra sen|tra sua|tra hoa|ca phe|cafe|nuoc uong|nuoc ep|tra xanh|matcha)/,name:'Đồ uống',industry:'Đồ ăn & thức uống',audience:'Người có nhu cầu lựa chọn đồ uống phù hợp khẩu vị và thói quen',channels:'TikTok, Facebook, sàn TMĐT',angle:'Cách pha, nguồn gốc nguyên liệu và cảm nhận hương vị'},
    {id:'food',re:/(banh|keo|snack|do an|an vat|thuc pham|com chay|mon an|\b(bun|pho)\b)/,name:'Đồ ăn & thực phẩm',industry:'Đồ ăn & thức uống',audience:'Người tìm món ăn hoặc thực phẩm phù hợp nhu cầu, khẩu vị và mức chi tiêu',channels:'Facebook, TikTok, hội nhóm địa phương',angle:'Hình ảnh thật, cách sử dụng và đánh giá khách hàng'},
    {id:'fashion',re:/(ao polo|ao thun|ao khoac|quan jean|quan ao|vay|dam|giay|tui xach|phu kien thoi trang|gang tay|tat|mu len)/,name:'Thời trang',industry:'Thời trang & phụ kiện',audience:'Người tìm trang phục hoặc phụ kiện phù hợp phong cách và ngân sách',channels:'TikTok, Instagram, Facebook',angle:'Phối đồ, video thử thực tế, bảng size và chất liệu'},
    {id:'tech',re:/(iphone|ipad|laptop|macbook|may tinh|dien thoai|dong ho thong minh|thiet bi cong nghe|camera)/,name:'Thiết bị công nghệ',industry:'Công nghệ & điện tử',audience:'Người đang so sánh thông số, công năng và chính sách mua hàng',channels:'TikTok, YouTube, Facebook',angle:'So sánh tính năng và trải nghiệm thực tế có kiểm chứng'},
    {id:'education',re:/(khoa hoc|lop hoc|day hoc|gia su|tieng anh|dao tao|hoc online|luyen thi)/,name:'Giáo dục & đào tạo',industry:'Giáo dục & đào tạo',audience:'Người muốn cải thiện kỹ năng hoặc kiến thức, cần hiểu lộ trình và giá trị khóa học',channels:'Facebook, TikTok, Website',angle:'Nội dung chia sẻ kiến thức và minh họa chương trình học'},
    {id:'travel',re:/(tour|du lich|homestay|khach san|resort|villa|ve may bay)/,name:'Du lịch & lưu trú',industry:'Du lịch & lưu trú',audience:'Người đang tìm trải nghiệm du lịch phù hợp thời gian và mức ngân sách',channels:'TikTok, Facebook, Website',angle:'Hành trình, trải nghiệm thực tế và bảng giá minh bạch'},
    {id:'health',re:/(cham soc suc khoe|kem duong|dau goi|dau xa|cham soc ca nhan|danh rang)/,name:'Chăm sóc cá nhân',industry:'Sức khỏe & chăm sóc cá nhân',audience:'Người quan tâm chăm sóc cơ thể, ưu tiên thông tin rõ ràng và an toàn',channels:'Facebook, TikTok, Website',angle:'Hướng dẫn sử dụng và thông tin được kiểm chứng'},
    {id:'home',re:/(noi chien|noi com|may hut bui|may loc|den ngu|do gia dung|noi|chao|may say)/,name:'Gia dụng',industry:'Gia dụng & đời sống',audience:'Người mua sắm đồ dùng cho gia đình quan tâm tính tiện ích và chi phí',channels:'TikTok, Facebook, sàn TMĐT',angle:'Demo trước-sau, tình huống sử dụng tại nhà'}
  ];
  const fallback = {id:'generic',name:'Sản phẩm / dịch vụ',industry:'Khác',audience:'Nhóm khách có nhu cầu với sản phẩm, cần xác nhận độ tuổi và hành vi mua',channels:'Facebook, TikTok hoặc kênh đang kinh doanh',angle:'Giải thích lợi ích và demo sản phẩm thực tế'};
  const sampleContent = {
    'pet': 'Đề xuất để xác minh: chất liệu, số đo kích cỡ và hình ảnh thú cưng mặc sản phẩm thực tế; không tự khẳng định độ an toàn.',
    'phone-accessory': 'Đề xuất để xác minh: dòng máy tương thích, chất liệu, độ hoàn thiện và video thử trực tiếp.',
    'beauty': 'Đề xuất để xác minh: màu sắc, thành phần/nguồn gốc, khả năng lên màu trên mẫu thực tế; tránh khẳng định tác dụng chưa chứng minh.',
    'tea': 'Đề xuất để xác minh: thành phần, hướng dẫn pha, nguồn gốc và trải nghiệm hương vị; không tuyên bố công dụng sức khỏe.',
    'food': 'Đề xuất để xác minh: nguyên liệu, quy cách đóng gói, thời hạn sử dụng và hình ảnh sản phẩm thật.',
    'fashion': 'Đề xuất để xác minh: chất liệu, bảng size, phom dáng và video phối đồ thật.',
    'tech': 'Đề xuất để xác minh: phiên bản, dung lượng, bảo hành và tính năng thực tế; không tự khẳng định hàng chính hãng.',
    'education': 'Đề xuất để xác minh: giáo trình, lịch học, giảng viên, kết quả học viên đã có sự đồng ý sử dụng.',
    'travel': 'Đề xuất để xác minh: lịch trình, mức giá, các dịch vụ đi kèm và điều kiện đặt/hủy.',
    'health': 'Đề xuất để xác minh: thành phần, hướng dẫn dùng, nhãn hàng và giấy tờ được phép công bố.',
    'home': 'Đề xuất để xác minh: kích thước, chất liệu, công suất và video trải nghiệm thật.',
    'generic': 'Đề xuất để xác minh: điểm khác biệt, cách sử dụng, chất lượng và chính sách bán hàng thực tế.'
  };
  const marketExamples = {
    launch: 'Gợi ý thị trường: bán online tại Việt Nam; sửa theo tỉnh/thành hoặc địa bàn doanh nghiệp phục vụ.',
    sales: 'Gợi ý thị trường: khách hàng đang tìm mua online tại Việt Nam; sửa theo nơi đang bán thực tế.',
    brand: 'Gợi ý thị trường: tập trung khu vực doanh nghiệp có thể giao hàng hoặc cung cấp dịch vụ.',
    lean: 'Gợi ý thị trường: ưu tiên địa phương hoặc cộng đồng có thể tiếp cận; sửa theo nguồn lực thực tế.'
  };
  const byIndustry = {'Mỹ phẩm & làm đẹp':'beauty','Thời trang & phụ kiện':'fashion','Đồ ăn & thức uống':'food','Phụ kiện điện thoại':'phone-accessory','Giáo dục & đào tạo':'education','Du lịch & lưu trú':'travel','Công nghệ & điện tử':'tech','Sức khỏe & chăm sóc cá nhân':'health','Gia dụng & đời sống':'home'};
  const templateTypes = [
    {id:'sales',title:'Tăng doanh số',icon:'↗',description:'Tập trung khách có nhu cầu mua, thử nội dung và CTA chuyển đổi.',goal:'Tăng doanh số bán hàng',tier:'Trung bình',amount:5000000,metric:'Mục tiêu THỬ NGHIỆM: 20 lượt hỏi mua/4 tuần',sub:'Gợi ý thực hiện nhỏ gọn, đo lượt hỏi mua'},
    {id:'launch',title:'Ra mắt sản phẩm',icon:'▣',description:'Giới thiệu điểm nổi bật, thu hút người quan tâm sản phẩm mới.',goal:'Ra mắt sản phẩm mới',tier:'Trung bình',amount:3000000,metric:'Mục tiêu THỬ NGHIỆM: 30 lượt hỏi thông tin/4 tuần',sub:'Tạo nhận biết trước khi đẩy bán hàng'},
    {id:'brand',title:'Xây dựng thương hiệu',icon:'◎',description:'Phát triển nội dung hữu ích, thể hiện giá trị sản phẩm.',goal:'Tăng nhận diện thương hiệu',tier:'Trung bình',amount:4000000,metric:'Mục tiêu THỬ NGHIỆM: 5.000 lượt tiếp cận/4 tuần',sub:'Tạo dấu ấn thương hiệu với nội dung thật'},
    {id:'lean',title:'Tiết kiệm & tự triển khai',icon:'♧',description:'Ít nhân sự, tận dụng nội dung tự tạo; không mặc định thuê KOC.',goal:'Thu hút khách hàng tiềm năng',tier:'Thấp',amount:1500000,metric:'Mục tiêu THỬ NGHIỆM: 15 lượt hỏi mua/4 tuần',sub:'Phù hợp thử nghiệm với chi phí thấp'}
  ];

  let activeTemplateId = null;
  let lastAppliedFingerprint = null;
  let lastAppliedProduct = '';
  let currentProfile = fallback;
  let currentSuggestions = [];
  let renderTimer = null;
  let aiAutoTimer=null;
  let aiReady=false;
  let aiSiteKey='';
  let aiToken='';
  let aiWidgetId=null;
  let aiWidgetStarted=false;
  let aiInFlight=false;
  let aiSuggestions=[];
  let aiProductKey='';
  let offlineMode=false;
  let lastObservedProductKey='';
  let aiRequestKey='';
  const attemptedAutoKeys=new Set();
  const AI_CACHE_KEY='marketgenius-ai-product-templates-v55';
  const MAX_CACHED_PRODUCTS=24;
  const productKey=value=>String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi-VN');
  function loadAiCache(){
    try{
      const saved=JSON.parse(localStorage.getItem(AI_CACHE_KEY)||'[]');
      if(!Array.isArray(saved))return new Map();
      return new Map(saved.filter(entry=>Array.isArray(entry)&&typeof entry[0]==='string'&&entry[0].length<=120&&
        Array.isArray(entry[1])&&entry[1].length===4).slice(-MAX_CACHED_PRODUCTS));
    }catch{return new Map();}
  }
  const aiCache=loadAiCache();
  function cacheAiTemplates(key,templates){
    if(aiCache.has(key))aiCache.delete(key);
    aiCache.set(key,templates);
    while(aiCache.size>MAX_CACHED_PRODUCTS)aiCache.delete(aiCache.keys().next().value);
    try{localStorage.setItem(AI_CACHE_KEY,JSON.stringify([...aiCache]));}catch{}
  }
  function useCachedTemplates(key){
    const cached=aiCache.get(key);
    if(!cached)return false;
    aiSuggestions=cached;aiProductKey=key;offlineMode=false;
    render();aiSetStatus('Đã sử dụng lại 4 template AI cho tên sản phẩm này.','ready');
    return true;
  }
  function aiSetStatus(message,kind=''){
    if(!aiStatus)return;
    aiStatus.textContent=message;
    aiStatus.dataset.state=kind;
  }
  function ensureAiWidget(tries=0){
    if(!aiReady||!aiSiteKey||!aiTurnstile||aiWidgetId!==null||aiWidgetStarted)return;
    if(picker.classList.contains('hidden'))return;
    if(!window.turnstile){
      if(tries<48)setTimeout(()=>ensureAiWidget(tries+1),250);
      else aiSetStatus('Không tải được bước xác minh. Có thể dùng mẫu cơ bản.','error');
      return;
    }
    aiWidgetStarted=true;
    try{
      aiWidgetId=window.turnstile.render('#templateTurnstile',{
        sitekey:aiSiteKey,theme:'light',size:'flexible',action:'guest_templates',
        callback:token=>{
          aiToken=token;
          if(aiProductKey===productKey(get('product'))&&aiSuggestions.length){
            aiSetStatus('Đã tạo 4 template AI cho sản phẩm này.','ready');
          }else{
            aiSetStatus('Đã xác minh. AI sẵn sàng tạo mẫu theo sản phẩm.','ready');
          }
          // A fresh token also enables automatic generation when the product changed.
          scheduleAiTemplates();
        },
        'expired-callback':()=>{aiToken='';aiSetStatus('Xác minh hết hạn. Vui lòng xác minh lại.','error');},
        'error-callback':()=>{aiToken='';aiSetStatus('Lỗi xác minh. Hãy tải lại trang hoặc dùng mẫu cơ bản.','error');}
      });
    }catch{aiWidgetStarted=false;aiSetStatus('Không thể khởi tạo xác minh.','error');}
  }
  function resetTemplateTurnstile(){
    aiToken='';
    if(aiWidgetId!==null && window.turnstile){
      try{window.turnstile.reset(aiWidgetId);}catch{}
    }
  }
  async function loadAiConfig(){
    try{
      const response=await fetch('/api/ai',{cache:'no-store'});
      if(!response.ok)throw new Error('Không tải được cấu hình.');
      const cfg=await response.json();
      aiReady=Boolean(cfg.ok && cfg.guestAvailable && cfg.turnstileSiteKey);
      aiSiteKey=aiReady?String(cfg.turnstileSiteKey):'';
      if(aiReady){aiSetStatus('AI có sẵn đang chuẩn bị xác minh...');ensureAiWidget();}
      else{aiSetStatus('AI có sẵn chưa được chủ website cấu hình. Bạn có thể dùng mẫu cơ bản.','error');offlineBtn?.classList.remove('hidden');}
    }catch{
      aiSetStatus('Không kết nối được AI có sẵn. Có thể sử dụng mẫu cơ bản.','error');
      offlineBtn?.classList.remove('hidden');
    }
  }
  function scheduleAiTemplates(){
    clearTimeout(aiAutoTimer);
    const key=productKey(get('product'));
    if(key.length<3||!aiReady)return;
    if(aiProductKey===key&&aiSuggestions.length)return;
    if(useCachedTemplates(key))return;
    // Do not automatically re-request an unchanged name after an error;
    // a manual retry button remains available for that case.
    if(attemptedAutoKeys.has(key))return;
    if(aiInFlight)return; // finally schedules the most recent product.
    if(!aiToken){
      ensureAiWidget();
      aiSetStatus('Đang chờ xác minh để tự tạo 4 mẫu cho sản phẩm mới.');
      return;
    }
    aiAutoTimer=setTimeout(()=>{
      if(productKey(get('product'))===key)requestAiTemplates(false);
    },850);
  }
  function productChanged(){
    const key=productKey(get('product'));
    if(key===lastObservedProductKey)return;
    lastObservedProductKey=key;
    // Old campaign suggestions and selection must not be shown for a new product.
    aiSuggestions=[];aiProductKey='';offlineMode=false;
    activeTemplateId=null;
    banner.classList.add('hidden');verification.classList.add('hidden');
    render();
    if(key.length>=3){
      if(!useCachedTemplates(key))scheduleAiTemplates();
    }else{
      clearTimeout(aiAutoTimer);
      if(key.length>0)aiSetStatus('Nhập ít nhất 3 ký tự để AI tự tạo 4 mẫu.');
    }
  }
  async function requestAiTemplates(manual=true){
    const product=get('product').trim();
    const key=productKey(product);
    if(product.length<3){aiSetStatus('Nhập tên sản phẩm ít nhất 3 ký tự.','error');return;}
    if(aiInFlight)return;
    if(!aiReady){aiSetStatus('AI có sẵn chưa cấu hình. Hãy dùng mẫu cơ bản hoặc thử lại sau.','error');offlineBtn?.classList.remove('hidden');return;}
    if(useCachedTemplates(key))return;
    if(!aiToken){
      ensureAiWidget();aiSetStatus('Hãy hoàn thành xác minh an toàn phía trên để AI tạo template.','error');return;
    }
    aiInFlight=true;aiRequestKey=key;attemptedAutoKeys.add(key);
    if(aiBtn){aiBtn.disabled=true;aiBtn.textContent='Đang tạo template...';}
    aiSetStatus(`AI đang phân tích “${product.slice(0,70)}” và tạo 4 mẫu Marketing...`,'loading');
    try{
      const budgetStr=String(get('budgetAmount')||'').replace(/[^0-9]/g,'');
      const budgetAmount=budgetStr?Number(budgetStr):null;
      const response=await fetch('/api/ai',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'guest-templates',product,budgetAmount,turnstileToken:aiToken})
      });
      let data;
      try{data=await response.json();}catch{throw new Error('Máy chủ trả dữ liệu không hợp lệ.');}
      if(!response.ok||!data.ok||!Array.isArray(data.templates)||data.templates.length!==4){
        throw new Error(String(data.error||'AI chưa tạo đủ 4 template. Vui lòng thử lại.'));
      }
      const templates=data.templates.map((item,i)=>({
        ...item,id:`ai:${key}:${i+1}`,icon:['↗','▣','◎','▤'][i],source:'ai',
        suggestedChannels:Array.isArray(item.suggestedChannels)?item.suggestedChannels.join(', '):String(item.suggestedChannels||'')
      }));
      cacheAiTemplates(key,templates);
      if(productKey(get('product'))===key){
        aiSuggestions=templates;aiProductKey=key;offlineMode=false;
        render();aiSetStatus('Đã có 4 template do AI tạo. Chọn mẫu để điền form Chuyên sâu.','ready');
      }else{aiSetStatus('Đã lưu mẫu của sản phẩm trước; đang chuẩn bị mẫu cho sản phẩm mới.');}
    }catch(err){
      if(productKey(get('product'))===key){
        aiSetStatus(err.message||'Không tạo được template. Bạn có thể thử lại bằng nút tạo AI.','error');
        offlineBtn?.classList.remove('hidden');
      }
    }finally{
      aiInFlight=false;aiRequestKey='';
      if(aiBtn){aiBtn.disabled=false;aiBtn.textContent='Tạo 4 mẫu bằng AI';}
      resetTemplateTurnstile();
      // If a different name was entered while the API request was running,
      // start its own auto-generation after the next valid Turnstile token.
      if(productKey(get('product'))!==key)scheduleAiTemplates();
    }
  }


  function loadCustom() {
    try {
      const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      if (!Array.isArray(list)) return [];
      return list.filter(x=>x && typeof x.id==='string' && typeof x.name==='string' && x.values && typeof x.values==='object').slice(0,MAX_TEMPLATES);
    } catch { return []; }
  }
  let savedTemplates=loadCustom();
  function persistCustom() {
    try { localStorage.setItem(LOCAL_KEY,JSON.stringify(savedTemplates));return true; }
    catch { alert('Bộ nhớ trình duyệt chưa cho phép lưu mẫu.');return false; }
  }

  function selectProfile(product) {
    const normalized=normalize(product);
    const direct=profiles.find(p=>p.re.test(normalized));
    if(direct)return direct;
    return profiles.find(p=>p.id===byIndustry[get('industry')])||fallback;
  }
  function buildRecommendations(product) {
    currentProfile=selectProfile(product);
    return templateTypes.map(t=>({
      ...t, id:'built-in:'+t.id,
      industry:currentProfile.industry,
      audience:currentProfile.audience,
      suggestedChannels:currentProfile.channels,
      suggestionAngle:currentProfile.angle
    }));
  }
  const fieldNames=['industry','product','budget','goal','budgetAmount','sellingPrice','audience','marketRegion','usp','targetMetric','baseline','teamCapacity','customerData','customerCount','promotionType','promotionLimit'];
  const radioNames=['briefMode','budgetScenario'];
  const checkboxNames=['ownedChannel','capability'];
  function snapshot() {
    const values={};
    for (const id of fieldNames) values[id]=pick(id)?.dataset.templateDraft==='1'?'':get(id);
    for (const name of radioNames) values[name]=document.querySelector(`input[name="${name}"]:checked`)?.value||'';
    for (const name of checkboxNames) values[name]=[...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el=>el.value);
    return values;
  }
  function signature() {return JSON.stringify(snapshot());}
  function setField(id,value){
    const field=pick(id);
    if(!field)return;
    if(field.matches('[data-money]') && window.MGMoney) window.MGMoney.set(field,value);
    else field.value=value==null?'':String(value);
    delete field.dataset.templateDraft;
    field.closest('.form-field')?.querySelector('.template-draft-label')?.remove();
    field.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function markExample(id, value) {
    setField(id,value);
    const field=pick(id);
    if(!field)return;
    field.dataset.templateDraft='1';

  }
  function clearDraftLabels() {
    DRAFT_FIELDS.forEach(id=>{
      const el=pick(id);
      if(el)delete el.dataset.templateDraft;
      el?.closest('.form-field')?.querySelector('.template-draft-label')?.remove();
    });
  }
  function showConfirmationNotes(item) {
    const target=pick('templateVerificationSummary');
    if(!target)return;
    target.classList.remove('hidden');
    const txt=target.querySelector('[data-template-fill-msg]');
    if(txt)txt.textContent=`Đã điền ngành hàng, mục tiêu, ngân sách mẫu, khách hàng, KPI, khu vực và gợi ý nội dung. Các thông tin có thực cần bạn xác nhận.`;
    const rec=target.querySelector('[data-template-channels]');
    if(rec)rec.textContent=item.suggestedChannels||'Chưa có đề xuất';
    const btn=target.querySelector('[data-template-channel-action]');
    if(btn){
      btn.onclick=()=>{
        const channels=[...new Set(String(item.suggestedChannels||'').split(/[,，]/).map(x=>x.trim()).map(x=>SUGGESTED_CHANNELS[x]||x).filter(x=>['Facebook','TikTok','Zalo OA','Website','Email','Shopee/TikTok Shop','Cửa hàng trực tiếp'].includes(x)))];
        if(!channels.length){alert('Chưa xác định được kênh trong mẫu. Hãy chọn thủ công.');return;}
        if(!confirm(`Chỉ đánh dấu kênh nếu bạn thực sự có thể triển khai. Chọn ${channels.join(', ')}?`))return;
        setChecks('ownedChannel',channels);
        lastAppliedFingerprint=signature();
        btn.textContent='✓ Đã chọn kênh (có thể chỉnh sửa)';
      };
    }
    const sell=pick('sellingPrice');
    if(sell&&!sell.value){sell.placeholder='Cần bạn nhập giá bán thực tế (nếu biết)';}
    const field=pick('teamCapacity');
    if(field)field.closest('.form-field')?.querySelector('.template-field-note')?.remove();
    if(field){
      const hint=document.createElement('small');hint.className='template-field-note';hint.textContent='Hãy chọn quy mô nhân sự thật trước khi tạo nếu đã biết.';field.closest('.form-field')?.append(hint);
    }
  }
  function setRadio(name,value){
    const radio=[...document.querySelectorAll(`input[name="${name}"]`)].find(x=>x.value===value);
    if(radio){radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));}
  }
  function setChecks(name,values){
    document.querySelectorAll(`input[name="${name}"]`).forEach(el=>{el.checked=Array.isArray(values)&&values.includes(el.value);});
  }
  function hasExistingBrief() {
    return Boolean(get('budgetAmount') || get('audience') || get('usp') || get('sellingPrice') || get('baseline') || get('targetMetric'));
  }
  function verifyOverwrite(nextId){
    if (activeTemplateId && nextId!==activeTemplateId && lastAppliedFingerprint && signature()!==lastAppliedFingerprint) {
      return confirm('Bạn đã sửa thông tin trong mẫu hiện tại. Chọn mẫu mới sẽ thay các trường được gợi ý. Tiếp tục?');
    }
    if (!activeTemplateId && hasExistingBrief()) {
      return confirm('Form đã có thông tin. Áp dụng template sẽ thay một số trường gợi ý (mục tiêu, khách hàng, ngân sách). Các thông tin thực tế như giá bán, ưu đãi và kênh hiện có sẽ được giữ nguyên. Tiếp tục?');
    }
    return true;
  }
  function showApplied(name,description){
    banner.classList.remove('hidden');
    pick('selectedTemplateName').textContent=`Đã áp dụng: ${name}`;
    pick('selectedTemplateMeta').textContent=description||'Thông tin mẫu là đề xuất. Hãy xác nhận ngân sách, khách hàng và điều kiện thực tế trước khi tạo.';
  }
  function applySuggestion(item) {
    if(!verifyOverwrite(item.id))return;
    clearDraftLabels();
    // Điền các mục có thể gợi ý; không bịa giá bán, dữ liệu khách hoặc quyền ưu đãi.
    setField('industry',item.industry);
    setField('budget',item.tier);
    setField('goal',item.goal);
    setField('budgetAmount',item.amount);
    const pName=get('product').trim();
    const displayAudience=item.audience + ' (nhóm GỢI Ý; cần thử nghiệm/kiểm chứng)';
    setField('audience',displayAudience.slice(0,180));
    setField('targetMetric',item.targetMetric||item.metric||'Mục tiêu THỬ NGHIỆM: Theo dõi 4 tuần');
    markExample('marketRegion',item.marketRegion||marketExamples[item.id.split(':')[1]]||marketExamples.sales);
    markExample('usp',item.usp||(sampleContent[currentProfile.id]||sampleContent.generic).replace('sản phẩm',pName).slice(0,480));
    markExample('baseline','Chưa được cung cấp dữ liệu nền; cần đo thử nghiệm từ tuần 1, không dự báo chuyển đổi chắc chắn.');
    // Không xóa hoặc tự thay dữ kiện người dùng đã xác nhận: giá bán,
    // nhân sự, quyền giảm giá, dữ liệu khách, kênh và năng lực thực tế.
    setRadio('budgetScenario','alternatives');
    setRadio('briefMode','advanced');
    if(typeof window.refreshBriefMode==='function')window.refreshBriefMode();
    else if(typeof refreshBriefMode==='function')refreshBriefMode();
    activeTemplateId=item.id;
    lastAppliedProduct=get('product');
    showApplied(item.title,`${item.source==='ai'?'Gemini đã cá nhân hóa template theo sản phẩm':'Mẫu cơ bản'}: đã điền ngành, khách hàng gợi ý, mục tiêu, ngân sách, khu vực, nội dung cần kiểm chứng và KPI thử nghiệm. Ngân sách mẫu: ${formatMoney(item.amount)}. Hãy kiểm tra trước khi tạo.`);
    showConfirmationNotes(item);
    lastAppliedFingerprint=signature();
    updateVisibility();
    picker.querySelectorAll('[data-template]').forEach(card=>card.classList.toggle('is-selected',card.dataset.template===item.id));
    pick('selectedTemplateBanner')?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function applySaved(item){
    if(!verifyOverwrite(item.id))return;
    clearDraftLabels();
    verification.classList.add('hidden');
    const values=item.values;
    const typed=get('product').trim();
    for(const field of fieldNames){if(field==='product')continue;if(Object.prototype.hasOwnProperty.call(values,field))setField(field,values[field]);}
    if(!typed && values.product)setField('product',values.product);
    for(const name of radioNames)if(values[name])setRadio(name,values[name]);
    for(const name of checkboxNames)setChecks(name,values[name]);
    setRadio('briefMode','advanced');
    if(typeof refreshBriefMode==='function')refreshBriefMode();
    if(window.MGMoney)for(const id of ['budgetAmount','sellingPrice','promotionLimit']){
      const el=pick(id);if(el?.matches('[data-money]'))window.MGMoney.reformat(el);
    }
    activeTemplateId=item.id;
    lastAppliedProduct=get('product');
    showApplied(item.name,'Mẫu riêng đã lưu trong trình duyệt. Kiểm tra lại giá, nguồn lực, khách hàng và các quyền tiếp thị nếu sử dụng cho sản phẩm mới.');
    lastAppliedFingerprint=signature();
    updateVisibility();
    pick('selectedTemplateBanner')?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function builtInMarkup(item){
    return `<button type="button" class="smart-template-card${activeTemplateId===item.id?' is-selected':''}" data-template="${escapeHtml(item.id)}">
      <span class="template-icon" aria-hidden="true">${item.icon}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <span class="template-card-copy">${escapeHtml(item.description)}</span>
      <span class="template-card-meta">${item.source==='ai'?'AI đề xuất':'Mẫu cơ bản'} · Ngân sách gợi ý ${formatMoney(item.amount)}</span>
      <span class="template-card-cta">${activeTemplateId===item.id?'✓ Đã chọn':'Chọn & điền form →'}</span>
    </button>`;
  }
  function customMarkup(item){
    return `<div class="custom-template-card"><button type="button" class="smart-template-card custom" data-custom="${escapeHtml(item.id)}"><span class="template-icon" aria-hidden="true">★</span><strong>${escapeHtml(item.name)}</strong><span class="template-card-copy">${escapeHtml(item.values.product||'Mẫu đã lưu')} · ${escapeHtml(item.values.goal||'Marketing')}</span><span class="template-card-cta">Áp dụng mẫu đã lưu →</span></button><button type="button" class="custom-template-delete" data-delete-custom="${escapeHtml(item.id)}" aria-label="Xóa mẫu ${escapeHtml(item.name)}" title="Xóa mẫu riêng">✕</button></div>`;
  }
  function render() {
    const product=get('product').trim();
    if(product.length<2){picker.classList.add('hidden');return;}
    const key=productKey(product);
    if(aiProductKey===key&&aiSuggestions.length){
      currentSuggestions=aiSuggestions;
      profileNote.textContent=`Gemini đã tạo 4 template riêng cho “${product}”. Chọn mẫu để điền toàn bộ những trường có thể gợi ý sang Chuyên sâu.`;
    }else if(offlineMode){
      currentSuggestions=buildRecommendations(product);
      profileNote.textContent=`Đang xem MẪU CƠ BẢN (không sử dụng AI). Nhấn “Tạo 4 template bằng AI” để cá nhân hóa theo sản phẩm.`;
    }else{
      currentSuggestions=[];
      profileNote.textContent=`Nhập sản phẩm → xác minh an toàn → AI tạo 4 template khác nhau để bạn lựa chọn.`;
    }
    cards.innerHTML=currentSuggestions.length?currentSuggestions.map(builtInMarkup).join(''):'<p class="template-ai-empty">Các mẫu AI sẽ xuất hiện tại đây sau khi phân tích sản phẩm.</p>';
    customPanel.classList.toggle('hidden',!savedTemplates.length);
    customCards.innerHTML=savedTemplates.map(customMarkup).join('');
    updateVisibility();
    ensureAiWidget();
  }
  function updateVisibility(){
    const quick=document.querySelector('input[name="briefMode"]:checked')?.value==='quick';
    picker.classList.toggle('hidden',!quick||get('product').trim().length<2);
    if(activeTemplateId && get('product').trim()!==lastAppliedProduct && !banner.classList.contains('hidden')){
      pick('selectedTemplateMeta').textContent='Bạn đã đổi tên sản phẩm. Hãy xem lại thông tin mẫu, khách hàng và ngân sách trước khi tạo chiến dịch.';
    }
  }
  function clearApplied(){activeTemplateId=null;lastAppliedFingerprint=null;lastAppliedProduct='';banner.classList.add('hidden');verification.classList.add('hidden');clearDraftLabels();render();}
  function saveCurrent(){
    const name=get('customTemplateName').trim() || `${get('product').trim()||'Sản phẩm'} — ${get('goal')||'Marketing'}`;
    if(!get('product').trim()){alert('Nhập tên sản phẩm trước khi lưu mẫu.');return;}
    if(name.length>55){alert('Tên mẫu tối đa 55 ký tự.');return;}
    const values=snapshot();
    // Only business-brief fields are saved; never API keys, passwords or model info.
    delete values.briefMode;
    const item={id:'saved:'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),name,values};
    const candidate=[item,...savedTemplates].slice(0,MAX_TEMPLATES);
    try{localStorage.setItem(LOCAL_KEY,JSON.stringify(candidate));savedTemplates=candidate;}
    catch{alert('Không thể lưu mẫu trong trình duyệt này. Hãy kiểm tra quyền lưu trữ.');return;}
    pick('customTemplateName').value='';
    render();
    if(typeof notify==='function')notify('Đã lưu mẫu riêng trên thiết bị này.');
    else alert('Đã lưu mẫu riêng trên trình duyệt này.');
  }
  cards.addEventListener('click',ev=>{
    const btn=ev.target.closest('[data-template]');if(!btn)return;
    const item=currentSuggestions.find(x=>x.id===btn.dataset.template);if(item)applySuggestion(item);
  });
  customCards.addEventListener('click',ev=>{
    const deleteBtn=ev.target.closest('[data-delete-custom]');
    if(deleteBtn){const entry=savedTemplates.find(x=>x.id===deleteBtn.dataset.deleteCustom);if(!entry)return;
      if(confirm(`Xóa mẫu riêng "${entry.name}" khỏi trình duyệt này?`)){
        savedTemplates=savedTemplates.filter(x=>x.id!==entry.id);persistCustom();render();
      }return;
    }
    const btn=ev.target.closest('[data-custom]');if(!btn)return;
    const item=savedTemplates.find(x=>x.id===btn.dataset.custom);if(item)applySaved(item);
  });
  pick('changeTemplateBtn')?.addEventListener('click',()=>{
    setRadio('briefMode','quick');
    if(typeof refreshBriefMode==='function')refreshBriefMode();
    render();picker.scrollIntoView({behavior:'smooth',block:'start'});
  });
  pick('saveCustomTemplateBtn')?.addEventListener('click',saveCurrent);
  for(const id of DRAFT_FIELDS){
    const el=pick(id);
    el?.addEventListener('input',()=>{
      if(el.dataset.templateDraft==='1'){
        delete el.dataset.templateDraft;
        el.closest('.form-field')?.querySelector('.template-draft-label')?.remove();
      }
    });
  }
  pick('product').addEventListener('input',()=>{
    clearTimeout(renderTimer);renderTimer=setTimeout(productChanged,350);
  });
  pick('industry')?.addEventListener('change',()=>{if(get('product').trim())render();});
  document.querySelectorAll('input[name="briefMode"]').forEach(el=>el.addEventListener('change',updateVisibility));
  pick('historyList')?.addEventListener('click',ev=>{
    if(ev.target.closest('[data-history-action="restore"]'))setTimeout(clearApplied,20);
  });
  aiBtn?.addEventListener('click',()=>requestAiTemplates(true));
  offlineBtn?.addEventListener('click',()=>{offlineMode=true;render();aiSetStatus('Đang dùng mẫu cơ bản không qua AI. Nhấn nút tạo AI để cá nhân hóa.');});
  // Never overwrite the form on page load or on product keystrokes.
  lastObservedProductKey=productKey(get('product'));
  render();loadAiConfig().then(()=>scheduleAiTemplates());
})();
