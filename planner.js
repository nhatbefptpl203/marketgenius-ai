'use strict';
/* MarketGenius AI v1.4.1 — Smart Campaign Planner.
   Aggregates existing Shortlist entries only; it does not call AI, store API keys,
   estimate a combined budget, or transmit campaign data without user interaction. */
(() => {
  const $p = (id) => document.getElementById(id);
  const panel = $p('smartPlanner');
  if (!panel || !$p('openPlannerBtn')) return;
  const escapeHTML = (value) => esc(value);
  const chosen = new Set();
  let started = false;
  let activeWeek = 0;
  let refreshQueued = false;
  const vnd = (amount) => Number(amount).toLocaleString('vi-VN') + ' ₫';
  const tiers = ['Thấp', 'Trung bình', 'Cao'];
  // Migrate label from a matching historical brief when possible (exact campaign ID).
  // Do not infer a level from VND amounts: the user may define their own thresholds.
  const oldTierById = new Map();
  try {
    const history = JSON.parse(localStorage.getItem('marketgenius-campaign-history-v13') || '[]');
    if (Array.isArray(history)) for (const batch of history) {
      if (tiers.includes(batch?.brief?.budget) && Array.isArray(batch.ideas))
        for (const campaign of batch.ideas) if (campaign?.id) oldTierById.set(campaign.id, batch.brief.budget);
    }
  } catch {}
  const tierOf = (idea) => tiers.includes(idea.budgetTier) ? idea.budgetTier : (oldTierById.get(idea.id) || 'Chưa phân loại');
  const allSaved = () => state.saved.filter(x => x && x.id && Array.isArray(x.timeline) && x.timeline.length === 4);
  const selectedIdeas = () => allSaved().filter(x => chosen.has(x.id));
  const hasSelected = () => {
    if (selectedIdeas().length) return true;
    notify('Hãy chọn ít nhất một chiến dịch trong Shortlist.', 'error');
    return false;
  };
  const escapeMarkdown = (v) => String(v ?? '').replace(/[\\`*_{}\[\]()#+.!|>~-]/g, '\\$&');
  const plainBudget = (idea) => Number.isFinite(Number(idea.budgetAmount)) && idea.budgetAmount !== null && idea.budgetAmount !== '' ? vnd(idea.budgetAmount) : 'Chưa nhập ngân sách VNĐ';

  // Budget labels describe the original brief, not inferred budget bands.
  // Earlier saved ideas without a known level remain "Chưa phân loại".
  function matchingIdeas() {
    const tier = $p('plannerBudgetFilter').value;
    return allSaved().filter(x => tier === 'all' || tierOf(x) === tier);
  }
  function syncSelection() {
    const ids = new Set(allSaved().map(x => x.id));
    for (const id of chosen) if (!ids.has(id)) chosen.delete(id);
    if (!started) {
      for (const id of ids) chosen.add(id);
      started = true;
    }
  }
  function renderCampaignPicker() {
    const cards = matchingIdeas();
    const selected = selectedIdeas();
    $p('plannerCampaigns').innerHTML = cards.length
      ? cards.map(idea => `<label class="planner-campaign">
        <input type="checkbox" data-planner-id="${escapeHTML(idea.id)}" ${chosen.has(idea.id) ? 'checked' : ''}>
        <span class="planner-campaign-content"><strong>${escapeHTML(idea.title)}</strong>
        <small>${escapeHTML(idea.channel)} · Ngân sách: ${escapeHTML(tierOf(idea))}</small></span>
      </label>`).join('')
      : '<p class="planner-muted">Không có chiến dịch nào thuộc mức ngân sách đang lọc.</p>';
    $p('plannerSelectionCount').textContent = `${selected.length}/${allSaved().length} chiến dịch được chọn`;
    $p('plannerSelectAll').checked = !!cards.length && cards.every(x => chosen.has(x.id));
    $p('plannerSelectAll').indeterminate = cards.some(x => chosen.has(x.id)) && !cards.every(x => chosen.has(x.id));
  }
  function progress(ideas) {
    const all = ideas.length * 4;
    const done = ideas.reduce((sum,idea) => sum + (Array.isArray(idea.doneWeeks) ? idea.doneWeeks.slice(0,4).filter(Boolean).length : 0),0);
    return {all,done, percent: all ? Math.round(done*100/all) : 0};
  }
  function renderWeekContent() {
    const ideas = selectedIdeas();
    const p = progress(ideas);
    $p('plannerProgressLabel').textContent = `${p.done}/${p.all} đầu việc hoàn thành`;
    $p('plannerProgressBar').style.width = `${p.percent}%`;
    $p('plannerProgressBar').setAttribute('aria-valuenow',String(p.percent));
    $p('plannerWeekTabs').querySelectorAll('[data-planner-week]').forEach(btn => {
      const active = Number(btn.dataset.plannerWeek) === activeWeek;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected', String(active));
    });
    $p('plannerWeekContent').innerHTML = ideas.length ? ideas.map(idea => {
      const task = idea.timeline[activeWeek]?.task || 'Chưa có nội dung tuần này';
      const done = !!idea.doneWeeks?.[activeWeek];
      return `<article class="planner-task${done ? ' is-done' : ''}">
        <label class="planner-task-check"><input type="checkbox" data-action="week-toggle" data-id="${escapeHTML(idea.id)}" data-week="${activeWeek}" ${done ? 'checked' : ''} aria-label="Đánh dấu tuần ${activeWeek+1} của ${escapeHTML(idea.title)}"></label>
        <div class="planner-task-copy"><strong>${escapeHTML(idea.title)}</strong><span>${escapeHTML(idea.channel)}</span><p>${escapeHTML(task)}</p></div>
      </article>`;
    }).join('') : '<div class="planner-empty-week">Chọn ít nhất một chiến dịch để tổng hợp công việc từng tuần.</div>';
    const amounts = [...new Set(ideas.filter(i => i.budgetAmount != null && Number.isFinite(Number(i.budgetAmount))).map(i => Number(i.budgetAmount)))];
    $p('plannerBudgetNotice').textContent = amounts.length
      ? `Ngân sách ghi trong các chiến dịch: ${amounts.map(vnd).join(' · ')}. Không cộng các số tiền này vì có thể là cùng một ngân sách tổng.`
      : 'Chưa có số tiền VNĐ cụ thể. Hãy nhập ngân sách khi lập brief hoặc chỉnh sửa chiến dịch để lập dự toán.';
  }
  function render() {
    if (panel.classList.contains('hidden')) return;
    syncSelection();
    renderCampaignPicker();
    renderWeekContent();
  }
  function queueRender() {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(() => {refreshQueued = false; render();});
  }
  function togglePlanner(show) {
    if (show && !state.saved.length) {notify('Lưu ít nhất một chiến dịch vào Shortlist để lập kế hoạch chung.','error');return;}
    panel.classList.toggle('hidden',!show);
    $p('openPlannerBtn').setAttribute('aria-expanded',String(show));
    if (show) { render(); panel.scrollIntoView({behavior:'smooth',block:'start'}); }
  }

  function toPlain(ideas) {
    const now = new Date().toLocaleDateString('vi-VN');
    const lines = [`MARKETGENIUS AI — KẾ HOẠCH MARKETING TỔNG HỢP 4 TUẦN`,`Made by Nhất Be · Ngày lập: ${now}`,`Tổng hợp từ ${ideas.length} chiến dịch trong Shortlist.`,
      'Lưu ý: đây là kế hoạch tham khảo; KPI là mục tiêu, không phải kết quả thực tế.',''];
    lines.push('CÁC CHIẾN DỊCH ĐƯỢC CHỌN');
    ideas.forEach((x,i)=>lines.push(`${i+1}. ${x.title} | ${x.channel} | ${plainBudget(x)}`));
    for(let w=0;w<4;w++) {
      lines.push('',`TUẦN ${w+1}`);
      ideas.forEach((x,i)=>{
        const done = !!x.doneWeeks?.[w];
        lines.push(`${done?'[x]':'[ ]'} ${x.title} (${x.channel}): ${x.timeline[w]?.task||'Chưa có nhiệm vụ'}`);
      });
    }
    lines.push('', 'KPI THAM KHẢO THEO CHIẾN DỊCH');
    ideas.forEach(x=>lines.push(`${x.title}: ${(x.kpis||[]).join('; ')||'Chưa đặt KPI'}`));
    lines.push('','Ngân sách của các chiến dịch có thể cùng xuất phát từ một brief; không tự cộng các mức tiền.');
    return lines.join('\n');
  }
  function toMarkdown(ideas) {
    const result = ['# Kế hoạch Marketing tổng hợp 4 tuần', '',`**Được tạo bởi:** MarketGenius AI · Nhất Be  `,
      `**Ngày lập:** ${new Date().toLocaleDateString('vi-VN')}  `, `**Nguồn:** ${ideas.length} chiến dịch đã chọn trong Shortlist`, '',
      '> Kế hoạch tham khảo. Các chỉ số KPI là mục tiêu, không phải kết quả đã đạt được.', '', '## Danh sách chiến dịch'];
    ideas.forEach((x,i)=>result.push(`${i+1}. **${escapeMarkdown(x.title)}** — ${escapeMarkdown(x.channel)} — ${escapeMarkdown(plainBudget(x))}`));
    for (let w=0;w<4;w++) {
      result.push('',`## Tuần ${w+1}`);
      ideas.forEach(x=>result.push(`- [${x.doneWeeks?.[w]?'x':' '}] **${escapeMarkdown(x.title)}** (${escapeMarkdown(x.channel)}): ${escapeMarkdown(x.timeline[w]?.task||'Chưa có nhiệm vụ')}`));
    }
    result.push('', '## KPI mục tiêu');
    ideas.forEach(x=>result.push(`- **${escapeMarkdown(x.title)}:** ${(x.kpis||[]).map(escapeMarkdown).join('; ')||'Chưa có KPI'}`));
    result.push('', '_Lưu ý ngân sách: không tự cộng số tiền từ nhiều chiến dịch vì các chiến dịch có thể cùng sử dụng một ngân sách tổng._');
    return result.join('\n');
  }
  async function copyContent(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const box = document.createElement('textarea');
        box.value = text;box.style.position = 'fixed';box.style.left = '-9999px';
        document.body.appendChild(box);box.select();
        const success = document.execCommand('copy');box.remove();
        if (!success) throw new Error('Clipboard denied');
      }
      notify('Đã sao chép kế hoạch.');
      return true;
    } catch {
      notify('Trình duyệt chặn sao chép. Hãy thử trên HTTPS hoặc chọn Copy Text trong trình duyệt khác.','error');
      return false;
    }
  }
  function printPlanner(ideas) {
    const prevTitle = document.title;
    const taskRows = [0,1,2,3].map(week => `<section class="planner-print-week"><h2>Tuần ${week+1}</h2><table class="studio-table"><thead><tr><th>Chiến dịch</th><th>Công việc</th><th>Tiến độ</th></tr></thead><tbody>${ideas.map(x=>`<tr><td>${escapeHTML(x.title)}<br><small>${escapeHTML(x.channel)}</small></td><td>${escapeHTML(x.timeline[week]?.task||'')}</td><td>${x.doneWeeks?.[week]?'Đã xong':'Chưa xong'}</td></tr>`).join('')}</tbody></table></section>`).join('');
    $p('printReport').innerHTML = `<div class="print-document planner-print-report"><header><small>MARKETGENIUS AI · MADE BY NHẤT BE</small><h1>Kế hoạch Marketing tổng hợp 4 tuần</h1><p>${new Date().toLocaleDateString('vi-VN')} · ${ideas.length} chiến dịch được chọn từ Shortlist</p></header>
      <h2>Danh sách chiến dịch</h2><ul>${ideas.map(x=>`<li><strong>${escapeHTML(x.title)}</strong> · ${escapeHTML(x.channel)} · ${escapeHTML(plainBudget(x))}</li>`).join('')}</ul>
      ${taskRows}<section><h2>KPI mục tiêu</h2>${ideas.map(x=>`<p><strong>${escapeHTML(x.title)}:</strong> ${escapeHTML((x.kpis||[]).join('; ')||'Chưa có KPI')}</p>`).join('')}</section>
      <footer>Gợi ý cần kiểm chứng trước khi triển khai. Không cộng ngân sách từng chiến dịch vì có thể sử dụng chung một tổng ngân sách.</footer></div>`;
    document.title='MarketGenius AI - Ke hoach 4 tuan';
    document.body.classList.add('print-mode');
    window.addEventListener('afterprint',()=>{document.title=prevTitle;document.body.classList.remove('print-mode');},{once:true});
    notify('Trong hộp thoại in, chọn “Lưu dưới dạng PDF” để tải kế hoạch.');
    window.print();
  }
  function openChat(service) {
    if (!hasSelected()) return;
    const url = service==='zalo'?'https://chat.zalo.me/':'https://web.telegram.org/k/';
    // Start the clipboard operation while the tab still has focus, then open chat.
    // Opening the chat is user-triggered; the user still chooses a recipient and sends.
    const copied = copyContent(toPlain(selectedIdeas()));
    window.open(url,'_blank','noopener,noreferrer');
    void copied.then(ok=>{
      if(ok) notify(`Đã sao chép kế hoạch. Hãy chọn người nhận trong ${service==='zalo'?'Zalo':'Telegram'} và dán nội dung để gửi.`);
      else notify('Hãy dùng nút Copy Text, sau đó dán kế hoạch trong ứng dụng chat.','error');
    });
  }

  $p('openPlannerBtn').addEventListener('click',()=>togglePlanner(panel.classList.contains('hidden')));
  $p('closePlannerBtn').addEventListener('click',()=>togglePlanner(false));
  $p('plannerCampaigns').addEventListener('change',event=>{
    const checkbox=event.target.closest('input[data-planner-id]');
    if(!checkbox)return;
    if(checkbox.checked)chosen.add(checkbox.dataset.plannerId);else chosen.delete(checkbox.dataset.plannerId);
    render();
  });
  $p('plannerSelectAll').addEventListener('change',e=>{
    matchingIdeas().forEach(x=>e.target.checked?chosen.add(x.id):chosen.delete(x.id));render();
  });
  $p('plannerBudgetFilter').addEventListener('change',render);
  $p('plannerWeekTabs').addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    activeWeek = event.key==='Home'?0:event.key==='End'?3:
      (activeWeek + (event.key==='ArrowRight'?1:3))%4;
    renderWeekContent();
    $p('plannerWeekTabs').querySelector(`[data-planner-week="${activeWeek}"]`).focus();
  });
  $p('plannerWeekTabs').addEventListener('click',event=>{
    const button=event.target.closest('[data-planner-week]');
    if(!button)return;
    activeWeek=Number(button.dataset.plannerWeek);
    renderWeekContent();
  });
  $p('plannerCopyTextBtn').addEventListener('click',()=>{if(hasSelected())void copyContent(toPlain(selectedIdeas()));});
  $p('plannerCopyMarkdownBtn').addEventListener('click',()=>{if(hasSelected())void copyContent(toMarkdown(selectedIdeas()));});
  $p('plannerExportPdfBtn').addEventListener('click',()=>{if(hasSelected())printPlanner(selectedIdeas());});
  $p('plannerShareBtn').addEventListener('click',async()=>{
    if(!hasSelected())return;
    const text = toPlain(selectedIdeas());
    if(navigator.share){
      try{await navigator.share({title:'Kế hoạch Marketing 4 tuần · Nhất Be',text});}
      catch(error){if(error.name!=='AbortError')await copyContent(text);}
    }else{
      await copyContent(text);
      notify('Đã sao chép kế hoạch. Dán vào ứng dụng muốn chia sẻ.');
    }
  });
  $p('plannerZaloBtn').addEventListener('click',()=>openChat('zalo'));
  $p('plannerTelegramBtn').addEventListener('click',()=>openChat('telegram'));

  // Existing Shortlist is refreshed by both app.js and studio.js after save, delete or edit.
  // Listen only for card-list changes; never watch our own panel (prevents render loops).
  new MutationObserver(queueRender).observe($p('savedGrid'),{childList:true});
  window.addEventListener('storage',e=>{if(e.key==='marketgenius-shortlist-v1'){
    try {const fresh=JSON.parse(localStorage.getItem(e.key)||'[]');
      if(Array.isArray(fresh))state.saved=fresh.filter(isValidIdea).slice(0,100);
      renderShortlist();
    }catch{} }
  });
  // Expose a narrowly scoped helper for manual testing, not an API secret.
  window.MarketGeniusPlanner = Object.freeze({getSummary:()=>({selected:selectedIdeas().length,weeklyTasks:selectedIdeas().length*4}),toPlain:()=>toPlain(selectedIdeas())});
})();
