'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('studio.js', 'utf8');
const a = source.indexOf('  const progressUI = (() => {');
const b = source.indexOf('  window.MGProgress = progressUI;', a);
assert.ok(a > 0 && b > a, 'progress module must exist inside studio.js');

const nodes = new Map();
const el = id => {
  if (!nodes.has(id)) nodes.set(id, {
    textContent: '', style: {}, attrs: {}, classes: new Set(),
    setAttribute(name,value) { this.attrs[name] = value; },
    classList: { add() {}, remove() {} }
  });
  return nodes.get(id);
};
let ms = 0;
let idCounter = 0;
const intervals = new Map();
const timeouts = new Map();
function setIntervalFake(fn, interval) {const id = ++idCounter; intervals.set(id, {fn, interval, next:ms+interval}); return id;}
function setTimeoutFake(fn, duration) {const id = ++idCounter; timeouts.set(id, {fn, next:ms+duration}); return id;}
function advance(targetMs) {
  const end = ms + targetMs;
  while (true) {
    let found = null;
    for (const [id,t] of timeouts) if (t.next <= end && (!found || t.next < found.next)) found={kind:'timeout',id,...t};
    for (const [id,t] of intervals) if (t.next <= end && (!found || t.next < found.next)) found={kind:'interval',id,...t};
    if (!found) break;
    ms=found.next;
    if(found.kind==='interval') {
      const t=intervals.get(found.id); if(!t) continue; t.next=ms+t.interval; t.fn();
    } else {
      const t=timeouts.get(found.id); if(!t)continue;timeouts.delete(found.id);t.fn();
    }
  }
  ms=end;
}
const progress = vm.runInNewContext(source.slice(a,b) + '\nprogressUI;', {
  el, performance:{now:()=>ms}, setInterval:setIntervalFake,clearInterval:id=>intervals.delete(id),
  setTimeout:setTimeoutFake, clearTimeout:id=>timeouts.delete(id), Math, Promise
});
const percent = () => Number(el('progressPercent').textContent.replace('%',''));

(async () => {
  progress.start();
  assert.equal(percent(),1);
  assert.equal(el('progressLabel').textContent, 'Đang gửi brief');
  assert.equal(intervals.size,1);
  advance(8000);
  assert.equal(percent(),31);
  assert.equal(el('progressLabel').textContent,'AI đang phân tích sản phẩm và mục tiêu');
  assert.ok(Number(el('progressTrack').attrs['aria-valuenow']) <= 31);
  advance(62000);
  assert.equal(percent(),95);
  assert.match(el('progressLabel').textContent,/lâu hơn bình thường/);
  advance(60000);
  assert.equal(percent(),95,'must not exceed 95 before response');
  // Success: smoothly reach 100 then show completion 400ms.
  const done=progress.complete();
  advance(300);
  assert.equal(percent(),100);
  assert.equal(el('progressTrack').attrs['aria-valuenow'],'100');
  assert.equal(el('progressLabel').textContent,'Hoàn tất');
  advance(400);
  await done;
  progress.stop();
  assert.equal(intervals.size,0);
  assert.equal(timeouts.size,0);
  // Cancel / network error must stop all pending interval/timer work.
  progress.start();advance(5000);progress.stop();
  const frozen=percent();advance(20000);
  assert.equal(percent(),frozen);
  assert.equal(intervals.size,0);
  progress.start();advance(3000);
  progress.stop(); // error cleanup
  assert.equal(intervals.size,0);
  // Reset after a previous attempt and no duplicate tickers.
  progress.start();advance(9000);progress.start();
  assert.equal(percent(),1);
  assert.equal(intervals.size,1);
  progress.stop();
  // Stop during the 300ms success animation; no leak or later label flip.
  progress.start(); const pending=progress.complete();advance(90);progress.stop();
  await pending;
  const cancelledPercent=percent();advance(10000);
  assert.equal(percent(),cancelledPercent);
  assert.equal(intervals.size,0);
  assert.equal(timeouts.size,0);
  // HTML + JS must use same ids and must not retain misleading text.
  const html=fs.readFileSync('index.html','utf8');
  const app=fs.readFileSync('app.js','utf8');
  for(const id of ['progressPanel','progressLabel','progressDetail','cancelGenerationBtn','progressTrack','progressFill','progressPercent'])
    assert.ok(html.includes(`id="${id}"`),`Missing ${id}`);
  assert.match(html,/role="progressbar"/);
  assert.match(app,/MGProgress\.complete\(\)/);
  assert.doesNotMatch(app,/Không có tỷ lệ phần trăm ảo/);
  console.log('PASS estimated progress: 8s, 70s, 95% ceiling, success 100%, abort, errors, rapid retries, cleanup');
})().catch(error=>{console.error(error);process.exitCode=1;});
