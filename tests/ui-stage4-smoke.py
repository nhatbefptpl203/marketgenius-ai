"""Stage3 UI regression: static no-network harness, no npm dependency."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,base64
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
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for w in [1366,768,390]:
  page=browser.new_page(viewport={'width':w,'height':900},reduced_motion='reduce')
  page.set_default_timeout(7000)
  errors=[]
  page.on('pageerror',lambda err:errors.append(str(err)))
  page.evaluate('''() => {
   const store=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});
   window.fetch=async()=>({ok:true,status:200,text:async()=>JSON.stringify({ok:true,guestAvailable:false,guestModel:null,turnstileSiteKey:null})});
   window.print=()=>window.__printed=true;
  }''')
  page.set_content(html,wait_until='domcontentloaded')
  page.wait_for_timeout(350)
  palette=page.evaluate('''()=>{const r=getComputedStyle(document.documentElement);return {background:r.getPropertyValue('--bg').trim(),primary:r.getPropertyValue('--primary').trim(),accent:r.getPropertyValue('--accent').trim(),actual:getComputedStyle(document.body).backgroundColor,hero:getComputedStyle(document.querySelector('.studio-home-hero')).backgroundImage,front:getComputedStyle(document.querySelector('.home-main-cta')).backgroundColor}}''')
  assert palette['background']=='#FAF9F6',palette
  assert palette['primary']=='#0F172A' and palette['accent']=='#EA580C',palette
  assert palette['hero']=='none',palette
  assert palette['front']=='rgb(234, 88, 12)',palette
  assert page.locator('#modeBadge').count()==1
  assert page.locator('.mg-sample-card').count()==1
  page.screenshot(path=str(root/f'STAGE4_Home_{w}.png'),full_page=False)
  page.evaluate("changeView('create')")
  page.wait_for_timeout(180)
  assert page.locator('#generateBtn').is_disabled()
  page.screenshot(path=str(root/f'STAGE4_Create_Empty_{w}.png'),full_page=False)
  page.locator('#demoBtn').click(force=True)
  page.wait_for_function("document.querySelectorAll('#ideasGrid .idea-card').length===5")
  page.locator('#ideasGrid').scroll_into_view_if_needed()
  page.wait_for_timeout(150)
  page.screenshot(path=str(root/f'STAGE4_Create_Results_{w}.png'),full_page=False)
  page.locator('#ideasGrid .mg-card-menu summary').first.click(force=True)
  assert page.locator('#ideasGrid .mg-card-menu[open]').count()==1
  page.keyboard.press('Escape')
  assert page.locator('#ideasGrid .mg-card-menu[open]').count()==0
  page.locator('#ideasGrid [data-action="save"]').first.click(force=True)
  page.evaluate("changeView('shortlist')")
  assert page.locator('#savedGrid .idea-card').count()==1
  page.wait_for_timeout(100)
  page.screenshot(path=str(root/f'STAGE4_Shortlist_{w}.png'),full_page=False)
  page.evaluate("changeView('history')")
  assert page.locator('#historyList .history-item').count()>=1
  page.wait_for_timeout(120)
  page.screenshot(path=str(root/f'STAGE4_History_{w}.png'),full_page=False)
  total_width=page.evaluate('document.documentElement.scrollWidth')
  assert total_width<=w+1,('overflow',w,total_width)
  assert errors==[],errors
  print('PASS Stage3',w,'palette',palette,'cards=5, shortlist/history, no horizontal overflow, no JS errors',flush=True)
  page.close()
 browser.close()
