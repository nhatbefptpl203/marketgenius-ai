"""Offline browser regression: manual upload, URL validation, persistence and mobile."""
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
html=re.sub(r'<script[^>]*src="([^"?]+)(?:\?[^\"]*)?"[^>]*></script>', lambda m:'<script>\n'+(root/m.group(1)).read_text().replace('</script>','<\\/script>')+'\n</script>',html)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in (1366,390):
        page=browser.new_page(viewport={'width':width,'height':950})
        errors=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.evaluate('''() => {
          const store=new Map();window.__store=store;
          Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});
          window.fetch=async()=>({ok:true,status:200,text:async()=>JSON.stringify({ok:true,guestAvailable:false,guestModel:null,turnstileSiteKey:null})});window.print=()=>{};
        }''')
        page.set_content(html,wait_until='domcontentloaded')
        page.evaluate("changeView('create')")
        page.locator('#demoBtn').click(force=True)
        page.wait_for_function("document.querySelectorAll('#ideasGrid .idea-card').length===5")
        first=page.locator('#ideasGrid [data-action="media-edit"]').first
        first.click(force=True)
        assert page.locator('#mediaEditorDialog').evaluate('(e)=>e.open')
        page.locator('#mediaEditorDialog').screenshot(path=str(root/f'MEDIA_FORM_{width}.png'))
        page.locator('#mediaEditorForm [name="videoUrl"]').fill('https://www.tiktok.com/@reviewer/video/7481234567890123456')
        page.locator('#mediaEditorForm [name="articleUrl"]').fill('https://example.com/san-pham')
        page.locator('#mediaEditorForm [name="imageFile"]').set_input_files(str(root/'assets/marketgenius-symbol.png'))
        page.locator('#mediaEditorForm [type="submit"]').click()
        page.wait_for_function('!document.getElementById("mediaEditorDialog").open',timeout=15000)
        page.wait_for_function('document.querySelectorAll("#ideasGrid .product-source-image").length===5')
        sources=page.locator('#ideasGrid .product-source-image').evaluate_all('(all)=>all.map(e=>e.getAttribute("src"))')
        assert all(s.startswith('data:image/jpeg;base64,') for s in sources),sources
        assert all(len(s)<=140000 for s in sources)
        page.locator('#ideasGrid .idea-card').first.screenshot(path=str(root/f'MEDIA_CARD_{width}.png'))
        assert page.locator('#ideasGrid .media-card-links a[href^="https://www.tiktok.com/"]').count()==5
        entry=page.evaluate('JSON.parse(localStorage.getItem("marketgenius-campaign-history-v13"))[0]')
        assert 'manualMedia' in entry
        assert not any('manualMedia' in i for i in entry['ideas'])
        assert entry['manualMedia']['articleUrl']=='https://example.com/san-pham'
        # Modify only one campaign; compact history must not replace it with the shared source.
        page.locator('#ideasGrid [data-action="media-edit"]').nth(1).click(force=True)
        page.locator('#mediaEditorForm [name="manualAll"]').uncheck()
        page.locator('#mediaEditorForm [name="articleUrl"]').fill('https://example.net/nguon-rieng')
        page.locator('#mediaEditorForm [type="submit"]').click()
        page.wait_for_function('!document.getElementById("mediaEditorDialog").open')
        entry=page.evaluate('JSON.parse(localStorage.getItem("marketgenius-campaign-history-v13"))[0]')
        assert 'manualMedia' not in entry
        assert entry['ideas'][1]['manualMedia']['articleUrl']=='https://example.net/nguon-rieng'
        assert entry['ideas'][0]['manualMedia']['articleUrl']=='https://example.com/san-pham'
        # Reject non-HTTPS/localhost URLs, no broken state gets persisted.
        page.locator('#ideasGrid [data-action="media-edit"]').nth(2).click(force=True)
        page.locator('#mediaEditorForm [name="imageUrl"]').fill('http://example.org/unsafe.jpg')
        page.locator('#mediaEditorForm [type="submit"]').click(force=True)
        assert page.locator('#mediaEditorDialog').evaluate('(e)=>e.open')
        page.locator('#mediaEditorDialog .studio-dialog-head button').click(force=True)
        # All other pages keep working after user attachments.
        page.evaluate("changeView('history')")
        assert page.locator('#historyList .history-item').count()==1
        assert page.evaluate('document.documentElement.scrollWidth')<=width+1
        assert not errors,errors
        page.screenshot(path=str(root/f'MEDIA_EDITOR_{width}.png'),full_page=False)
        print(f'PASS media editor UI {width}px: upload/jpeg, 5 campaigns, per-idea edit, persisted sources, HTML validation, no JS errors')
        page.close()
    browser.close()
