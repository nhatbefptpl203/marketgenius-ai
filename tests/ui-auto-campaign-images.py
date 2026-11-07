from pathlib import Path
from playwright.sync_api import sync_playwright
import re,base64,json
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
html=re.sub(r'<link[^>]*href="https://[^"]+"[^>]*>', '',html)
html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*>', '',html)
css='\n'.join((root/f).read_text() for f in ['styles.css','research-media.css','startup-theme.css','studio-layout.css','smart-templates.css','saas-design.css'])
html=html.replace('</head>',f'<style>{css}</style></head>')
html=re.sub(r'<script[^>]*src="https://[^"]+"[^>]*></script>','',html)
html=html.replace('/assets/marketgenius-symbol.png','data:image/png;base64,'+base64.b64encode((root/'assets/marketgenius-symbol.png').read_bytes()).decode())
def inline_js(m):return '<script>\n'+(root/m.group(1)).read_text().replace('</script>','<\\/script>')+'\n</script>'
html=re.sub(r'<script[^>]*src="([^"?]+)(?:\?[^\"]*)?"[^>]*></script>',inline_js,html)

source_images=[f'https://cdn.example.com/campaign-{i+1}.jpg' for i in range(5)]
ideas=[]
for i in range(5):
 ideas.append({
  'title':f'Chiến dịch sản phẩm thứ {i+1}', 'channel':'TikTok',
  'concept':'Tạo nội dung thử nghiệm cho sản phẩm Mộc An Trà',
  'strategy':'Tìm hiểu sản phẩm','hook':'Khám phá sản phẩm',
  'timeline':[{'week':j+1,'task':f'Nhiệm vụ tuần {j+1}'} for j in range(4)],
  'resources':{'image':{'url':source_images[i],'sourceUrl':f'https://example.com/product-{i+1}','sourceTitle':'Mộc An Trà'},
    'images':[{'url':source_images[i],'sourceUrl':f'https://example.com/product-{i+1}','sourceTitle':'Mộc An Trà'}],
    'videos':[],'articles':[], 'note':'Tự động tìm ảnh phù hợp cho chiến dịch.'}
 })
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [1366,390]:
  page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
  errors=[]
  page.on('pageerror',lambda err:errors.append(str(err)))
  page.evaluate('''() => {const store=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});window.fetch=async()=>({ok:true,status:200,text:async()=>JSON.stringify({ok:true,guestAvailable:false,guestModel:null,turnstileSiteKey:null})});}''')
  page.set_content(html,wait_until='domcontentloaded')
  page.evaluate('changeView("create")')
  page.evaluate('''data => {state.brief={product:'Mộc An Trà',industry:'Đồ ăn & thức uống',goal:'Tăng doanh số bán hàng',budget:'Thấp'};state.ideas=normalizeIdeas(data);state.source='guest';renderResults();}''',ideas)
  srcs=page.locator('#ideasGrid img.product-source-image').evaluate_all('(list)=>list.map(x=>x.src)')
  assert srcs==source_images,(srcs,source_images)
  assert page.locator('#ideasGrid .media-edit-btn').count()==0
  assert page.locator('#progressDetail').inner_text()==''
  assert not page.locator('#mediaEditorDialog').is_visible()
  assert page.locator('#ideasGrid .idea-card').count()==5
  assert page.evaluate('document.documentElement.scrollWidth')<=width+1
  assert not errors,errors
  print('PASS auto-media browser',width,'unique campaign images, no manual CTA, no progress subtitle, no overflow')
  page.close()
 browser.close()
