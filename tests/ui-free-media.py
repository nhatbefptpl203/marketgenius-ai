"""Free-source UI test: exact media URL normalization, per-campaign allocation and persistence."""
import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
html=re.sub(r'<script\b[^>]*\bsrc=[^>]*></script>','',html,flags=re.I)
html=re.sub(r'<link\b[^>]*\bhref=[^>]*>','',html,flags=re.I)
mock="""() => {
  window.fetch=async (url,config={})=>{
    const path=String(url);
    let result;
    if(path==='/api/ai')result={ok:true,guestAvailable:false,turnstileSiteKey:null};
    else if(path==='/api/free-media/search'){
      result={ok:true,campaigns:Array.from({length:5},(_,i)=>{
        const hash=String(i+1).repeat(64);
        const img={url:`https://cdn.pixabay.com/photo/example-${i}.jpg`,proxyUrl:`/api/free-media/image/${hash}`,
          sourceUrl:`https://pixabay.com/photos/tea-${i}/`,sourceTitle:`Trà thảo mộc ${i}`,label:'Ảnh minh họa · Pixabay'};
        return {image:img,images:[img],videos:[{url:`https://www.youtube.com/watch?v=Abcdefg${String(i).padStart(4,'0')}`,title:`Mộc An Trà Review ${i}`,source:'YouTube'}],articles:[]};
      })};
    } else result={ok:false,error:'unexpected'};
    return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
  }
}"""
with sync_playwright() as p:
  b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in [1366,390]:
    page=b.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
    errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
    page.set_content(html)
    for name in ['styles.css','startup-theme.css','studio-layout.css','saas-design.css','smart-templates.css','research-media.css','browser-use-media.css']:
      page.add_style_tag(content=(ROOT/name).read_text())
    page.evaluate("""() => {const db=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,String(v)),removeItem:k=>db.delete(k),clear:()=>db.clear()}})}""")
    page.evaluate(mock)
    for name in ['app.js','studio.js','browser-use-client.js','free-media-client.js','studio-layout.js','planner.js','smart-templates.js']:
      page.add_script_tag(content=(ROOT/name).read_text())
    page.evaluate("() => changeView('create')")
    page.locator('#demoBtn').click()
    page.wait_for_function("document.querySelectorAll('#ideasGrid .idea-card').length===5",timeout=15000)
    page.evaluate("() => window.MGFreeMedia.start('mock-ticket',state.ideas.map(i=>i.id))")
    page.wait_for_function("document.querySelector('#freeMediaStatus')?.textContent?.includes('Đã bổ sung')",timeout=10000)
    srcs=page.locator('#ideasGrid .product-source-image').evaluate_all('(els)=>els.map(x=>x.getAttribute("src"))')
    assert len(srcs)==5,(width,srcs)
    assert all(x.startswith('/api/free-media/image/') for x in srcs),(width,srcs)
    assert len(set(srcs))==5,(width,srcs)
    videos=page.locator('#ideasGrid a[href*="youtube.com/watch"]').count()
    assert videos==5,(width,videos)
    history=page.evaluate("""() => JSON.parse(localStorage.getItem('marketgenius-campaign-history-v13')||'[]')""")
    assert len(history)>0,(width,'no history')
    got=[x.get('resources',{}).get('images',[{}])[0].get('proxyUrl') for x in history[0]['ideas']]
    assert len(set(got))==5 and all(v.startswith('/api/free-media/image/') for v in got),(width,got)
    assert not errs,(width,errs)
    assert page.locator('html').evaluate('(el)=>el.scrollWidth')<=width+4,(width,'overflow')
    print(f'PASS free-media UI {width}px: 5 distinct local images, 5 videos, cached in history')
    page.close()
  b.close()
