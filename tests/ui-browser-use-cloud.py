"""Browser UI smoke using local DOM and mocked fetch (no network, no Cloud fees)."""
import json, re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
html=re.sub(r'<script\b[^>]*\bsrc=[^>]*></script>','',html,flags=re.I)
html=re.sub(r'<link\b[^>]*\bhref=[^>]*>', '',html,flags=re.I)
fetch_stub='''() => {
  window.fetch=async (url,config={})=>{
    const path=String(url);
    let body;
    if(path==='/api/ai')body={ok:true,guestAvailable:false,turnstileSiteKey:null};
    else if(path.endsWith('/start'))body={ok:true,jobId:'job-1',access:'secret-token',status:'running'};
    else if(path.endsWith('/status')){
      const campaigns=Array.from({length:5},(_,i)=>{
        const img={url:`https://images.pexels.com/photos/${i+101}/pic-${i+101}.jpg`,sourceUrl:`https://www.pexels.com/photo/${i+101}/`,sourceTitle:'Ảnh minh họa',label:'Ảnh minh họa theo chủ đề · Browser Use'};
        return {image:img,images:[img],videos:[{url:`https://www.youtube.com/watch?v=abcDEF${i}xyz`,title:`Video ${i+1}`,source:'Browser Use'}],articles:[]};
      });
      body={ok:true,status:'completed',campaigns};
    }
    else body={ok:true,status:'cancelled'};
    return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
  };
}'''
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in [1366,390]:
    page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
    failures=[]
    page.on('pageerror',lambda error:failures.append(str(error)))
    page.set_content(html)
    for name in ['styles.css','startup-theme.css','studio-layout.css','saas-design.css','smart-templates.css','research-media.css','browser-use-media.css']:
      page.add_style_tag(content=(ROOT/name).read_text())
    page.evaluate("""() => {
      const memory=new Map();
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem:key=>memory.has(key)?memory.get(key):null,
        setItem:(key,value)=>memory.set(key,String(value)),
        removeItem:key=>memory.delete(key),
        clear:()=>memory.clear()
      }});
    }""")
    page.evaluate(fetch_stub)
    for name in ['app.js','studio.js','browser-use-client.js','studio-layout.js','planner.js','smart-templates.js']:
      page.add_script_tag(content=(ROOT/name).read_text())
    page.evaluate("() => changeView('create')")
    page.locator('#demoBtn').click()
    page.wait_for_function("document.querySelectorAll('#ideasGrid .idea-card').length===5",timeout=18000)
    page.evaluate("() => window.MGBrowserUseMedia.start('mock-ticket',state.ideas.map(i=>i.id))")
    page.wait_for_function("document.querySelector('#browserUseMediaStatus')?.textContent.includes('Đã tìm thêm')",timeout=16000)
    count=page.locator('#ideasGrid .product-source-image').count()
    assert count==5,(width,count)
    data=page.evaluate("""() => {
      const entries=JSON.parse(localStorage.getItem('marketgenius-campaign-history-v13')||'[]');
      return entries[0]?.ideas.map(i=>i.resources?.images?.[0]?.url);
    }""")
    assert data and len(data)==5 and len(set(data))==5,(width,data)
    assert not failures,(width,failures)
    assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=width+4,(width,'horizontal overflow')
    print(f'PASS Browser Use cloud UI mocked at {width}px: 5 different images + saved history')
    page.close()
  browser.close()
