'use strict';
/* Stage 2: hash routes + home entry points. No change to AI calls or storage. */
(() => {
  const menu=document.getElementById('menuBtn');
  const nav=document.getElementById('sidebar');
  const overlay=document.getElementById('overlay');
  const close=document.getElementById('navClose');
  close?.addEventListener('click',()=>{closeMobileMenu();menu?.focus();});
  overlay?.addEventListener('click',()=>{closeMobileMenu();menu?.focus();});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&nav?.classList.contains('open')) {
      closeMobileMenu();menu?.focus();
    }
  });
  document.querySelectorAll('[data-start-mode]').forEach(button=>{
    button.addEventListener('click',()=>{
      const mode=button.dataset.startMode;
      const input=document.querySelector(`input[name="briefMode"][value="${mode}"]`);
      if(input){input.checked=true;refreshBriefMode();}
      changeView('create');
      window.setTimeout(()=>document.getElementById('briefForm')?.scrollIntoView({behavior:'smooth',block:'start'}),140);
    });
  });
  function syncHashRoute(){
    const route=resolveAppRoute(window.location.hash);
    if(window.location.hash!=='#'+route.view){
      window.history.replaceState(null,'','#'+route.view);
    }
    changeView(route.view,{fromHash:true,scrollGuide:route.scrollGuide});
  }
  window.addEventListener('hashchange',syncHashRoute);
  window.addEventListener('popstate',syncHashRoute);
  syncHashRoute();
})();
