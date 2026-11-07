"""Optional no-network UI smoke using installed Python Playwright.
Chromium in this sandbox cannot navigate localhost, so HTML/CSS/JS are inlined
in-memory (not a production-network deployment test)."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import re, json
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
html=re.sub(r'<link[^>]*href="https://[^\"]+"[^>]*>', '', html)
html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*>', '', html)
css='\n'.join((root/f).read_text() for f in ['styles.css','research-media.css','startup-theme.css','studio-layout.css','smart-templates.css','saas-design.css'])
html=html.replace('</head>',f'<style>{css}</style></head>')
html=re.sub(r'<script[^>]*src="https://[^\"]+"[^>]*></script>','',html)
def inline_js(match):
 return '<script>\n'+(root/match.group(1)).read_text().replace('</script>', '<\\/script>')+'\n</script>'
html=re.sub(r'<script[^>]*src="([^\"?]+)(?:\?[^\"]*)?"[^>]*></script>',inline_js,html)
legacy_idea={'id':'legacy-a','title':'Bài cũ với AI cá nhân','channel':'TikTok','concept':'Nội dung tham khảo','timeline':[{'week':w,'task':'Triển khai'} for w in range(1,5)],'source':'ai','provider':'openai','model':'gpt-4o','resources':{'image':None,'images':[],'videos':[],'articles':[],'suggestions':['x'*8000]*3,'diagnostic':{'detail':'test'}}}
legacy_history={'id':'legacy-history','createdAt':'2026-01-01T01:00:00.000Z','source':'ai','provider':'openai','model':'gpt-4o','brief':{'industry':'Phụ kiện điện thoại','product':'Ốp lưng cũ','budget':'Thấp','goal':'Tăng doanh số bán hàng','briefMode':'quick'},'ideas':[dict(legacy_idea,id=f'legacy-{i}') for i in range(5)]}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [1366,768,390]:
  page=browser.new_page(viewport={'width':width,'height':850})
  errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.evaluate('''({oldSaved,oldHistory})=>{
    const store=new Map([['marketgenius-shortlist-v1',JSON.stringify([oldSaved])],['marketgenius-campaign-history-v13',JSON.stringify([oldHistory])]]);
    Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});
    window.fetch=async()=>({ok:true,status:200,text:async()=>JSON.stringify({ok:true,guestAvailable:false,guestModel:null,turnstileSiteKey:null})});
    window.print=()=>{window.__printCalled=true;};
  }''',{'oldSaved':legacy_idea,'oldHistory':legacy_history})
  page.set_content(html,wait_until='domcontentloaded');page.wait_for_timeout(100)
  assert not errors,errors
  assert page.locator('#generateBtn').is_disabled(), 'AI must be locked without guest config'
  page.evaluate("changeView('history')")
  assert 'AI cá nhân (bản cũ)' in page.locator('#historyList').inner_text()
  page.locator('#historyList [data-history-action="restore"]').first.click(force=True)
  assert page.locator('#ideasGrid .idea-card').count()==5
  assert 'AI cá nhân (bản cũ)' in page.locator('#sourceTag').inner_text()
  page.locator('#demoBtn').click(force=True);page.wait_for_timeout(650)
  assert page.locator('#ideasGrid .idea-card').count()==5
  page.locator('#ideasGrid [data-action="save"]').first.click(force=True)
  stored=page.evaluate('''() => ({saved:JSON.parse(localStorage.getItem('marketgenius-shortlist-v1')),history:JSON.parse(localStorage.getItem('marketgenius-campaign-history-v13'))})''')
  assert all('suggestions' not in (x.get('resources') or {}) and 'diagnostic' not in (x.get('resources') or {}) for x in stored['saved'])
  assert all(not any('resources' in idea for idea in h['ideas']) for h in stored['history']), 'history media should be shared at top level'
  assert all('suggestions' not in (h.get('resources') or {}) for h in stored['history'])
  page.locator('#ideasGrid [data-action="details"]').first.click(force=True)
  assert page.locator('#detailsDialog').evaluate('(el)=>el.open')
  page.locator('#detailsDialog [data-action="close-dialog"]').click(force=True)
  page.locator('#ideasGrid [data-action="compare"]').nth(0).check(force=True)
  page.locator('#ideasGrid [data-action="compare"]').nth(1).check(force=True)
  page.locator('#compareNowBtn').click(force=True)
  assert page.locator('#compareDialog').evaluate('(el)=>el.open')
  page.locator('#compareDialog [data-action="close-compare"]').click(force=True)
  page.evaluate("changeView('shortlist')")
  assert page.locator('#savedGrid .idea-card').count()>=1 or page.locator('#savedGrid .idea-card').count()>=1
  page.locator('#openPlannerBtn').click(force=True)
  assert 'hidden' not in page.locator('#smartPlanner').get_attribute('class')
  # Exercise print export with print stub; no actual PDF is written during smoke.
  page.locator('#exportShortlistBtn').click(force=True)
  assert page.evaluate('Boolean(window.__printCalled)')
  size=page.evaluate('({body:document.body.scrollWidth,inner:innerWidth})')
  assert size['body']<=size['inner']+1, f'horizontal overflow: {size}'
  assert not errors,errors
  page.screenshot(path=str(root/f'STAGE1_UI_{width}.png'),full_page=False)
  print('PASS UI',width,'Demo/legacy history/shortlist/compare/detail/Planner/print, no console errors')
  page.close()
 browser.close()
