"""No-network browser regression: header, hash routing, legacy About redirects, Demo, mobile nav."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
html=re.sub(r'<link[^>]*href="https://[^"]+"[^>]*>', '', html)
html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*>', '', html)
css='\n'.join((root/f).read_text() for f in ['styles.css','research-media.css','startup-theme.css','studio-layout.css','smart-templates.css','saas-design.css'])
html=html.replace('</head>',f'<style>{css}</style></head>')
html=re.sub(r'<script[^>]*src="https://[^"]+"[^>]*></script>','',html)
def inline_js(m):return '<script>\n'+(root/m.group(1)).read_text().replace('</script>', '<\\/script>')+'\n</script>'
html=re.sub(r'<script[^>]*src="([^"?]+)(?:\?[^"]*)?"[^>]*></script>',inline_js,html)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for w in [1366,768,390]:
  page=browser.new_page(viewport={'width':w,'height':900})
  page.set_default_timeout(4000)
  print('BEGIN',w,flush=True)
  errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.evaluate('''() => {
    const store=new Map();
    Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});
    window.fetch=async()=>({ok:true,status:200,text:async()=>JSON.stringify({ok:true,guestAvailable:false,guestModel:null,turnstileSiteKey:null})});
    window.print=()=>{window.__printed=true};
  }''')
  page.set_content(html,wait_until='domcontentloaded')
  page.wait_for_timeout(140)
  assert page.locator('header.site-header').count()==1
  assert page.locator('.topbar').count()==0
  assert page.locator('#aboutView').count()==0
  assert page.locator('#how-it-works').count()==1
  assert page.evaluate('location.hash')=='#home'
  assert page.locator('#homeView').evaluate("e=>e.classList.contains('active')")
  assert page.locator('.site-nav a[aria-current="page"]').get_attribute('data-view')=='home'
  page.screenshot(path=str(root/f'STAGE2_Home_{w}.png'),full_page=False)
  print('HOME',w,flush=True)
  if w<850:
   assert page.locator('#menuBtn').is_visible()
   assert page.locator('#menuBtn').evaluate('e => Math.min(e.getBoundingClientRect().width,e.getBoundingClientRect().height)')>=44
   page.locator('#menuBtn').click()
   assert page.locator('#sidebar').evaluate('e=>e.classList.contains("open")')
   assert page.locator('#menuBtn').get_attribute('aria-expanded')=='true'
   page.locator('#sidebar a[href="#create"]').click()
  else:
   page.locator('.site-nav a[href="#create"]').click()
  assert page.evaluate('location.hash')=='#create'
  assert page.locator('#createView').evaluate("e=>e.classList.contains('active')")
  assert page.locator('#sidebar').evaluate('e=>!e.classList.contains("open")')
  assert page.locator('#generateBtn').is_disabled()
  page.screenshot(path=str(root/f'STAGE2_Create_{w}.png'),full_page=False)
  print('CREATE',w,flush=True)
  page.locator('#demoBtn').click(force=True)
  page.wait_for_function("document.querySelectorAll('#ideasGrid .idea-card').length === 5",timeout=8000)
  page.locator('#ideasGrid [data-action="save"]').first.click(force=True)
  page.evaluate("changeView('shortlist')")
  assert page.evaluate('location.hash')=='#shortlist'
  assert page.locator('#savedGrid .idea-card').count()>0
  page.screenshot(path=str(root/f'STAGE2_Shortlist_{w}.png'),full_page=False)
  page.evaluate("changeView('history')")
  assert page.evaluate('location.hash')=='#history'
  assert page.locator('#historyList .history-item').count()>0
  page.screenshot(path=str(root/f'STAGE2_History_{w}.png'),full_page=False)
  print('HISTORY',w,flush=True)
  # Browser history: return from History -> Shortlist -> Create without dropping state.
  page.evaluate('history.back()')
  page.wait_for_function("location.hash === '#shortlist' && document.getElementById('shortlistView').classList.contains('active')")
  page.evaluate('history.back()')
  page.wait_for_function("location.hash === '#create' && document.getElementById('createView').classList.contains('active')")
  page.evaluate('history.forward()')
  page.wait_for_function("location.hash === '#shortlist' && document.getElementById('shortlistView').classList.contains('active')")
  # Legacy links go to home guide.
  page.evaluate("location.hash='#about'")
  page.wait_for_function("location.hash === '#home' && document.getElementById('homeView').classList.contains('active')")
  assert page.locator('#how-it-works .about-feature-grid article').count()==6
  assert page.locator('#how-it-works .about-steps > div').count()==4
  assert page.locator('#how-it-works .about-disclaimer').count()==1
  # CTA to guide remains on home and scrolls down.
  page.evaluate("changeView('create')")
  page.wait_for_function("location.hash === '#create' && document.getElementById('createView').classList.contains('active')",timeout=6000)
  page.evaluate("window.__clicks=[];document.addEventListener('click',e=>window.__clicks.push({tag:e.target.tagName,cl:e.target.className}),{capture:true,once:true})")
  page.locator('.builder-how-btn').click()
  print('GUIDE CTA',w,page.evaluate('location.hash'),page.locator('.builder-how-btn').get_attribute('data-view'),page.evaluate('state.view'),page.evaluate('window.__clicks'),flush=True)
  assert page.evaluate('location.hash')=='#home'
  page.wait_for_timeout(450)
  guide_y=page.locator('#how-it-works').evaluate('e=>e.getBoundingClientRect().top')
  assert guide_y < 400, f'guide not scrolled into view: {guide_y}'
  wide=page.evaluate('({width:document.body.scrollWidth,viewport:innerWidth})')
  assert wide['width'] <= wide['viewport']+1, f'horizontal overflow {wide}'
  assert not errors, errors
  print('PASS Stage2 routes',w,'back/forward #about/mobile/menu/demo/history, no overflow or JS errors')
  page.close()
 browser.close()
