'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('startup-theme.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const lines = [
  'Đang phân tích dữ liệu ngành hàng & mục tiêu chiến dịch...',
  'AI đang phác thảo 5 hướng tiếp cận & KPI tham khảo...',
  'Đang xây dựng lịch trình hành động chi tiết cho 4 tuần...',
  'Đang tìm kiếm ảnh tư liệu & hoàn thiện bản kế hoạch...'
];
for (const line of lines) assert.ok(app.includes(line), line);
for (const marker of ['.mg-skeleton-card','.mg-loading-status','mgShimmer','mgLoadingPulse','prefers-reduced-motion'])
  assert.ok(css.includes(marker), marker);
assert.match(app, /setInterval\(\(\) => \{[\s\S]*?\}, 2500\);/);
assert.match(app, /Array\.from\(\{length:4\}/);
assert.ok(app.includes('${skeletonCard()}${skeletonCard()}'));
assert.ok(app.includes('finally { mgLoadingPreview.stop();'));
assert.ok(app.includes('mgLoadingPreview.stop(true)'));
assert.match(html, /app\.js\?v=(?:skeleton57|ux58|share59)/);
assert.ok(html.includes('startup-theme.css?v=skeleton57'));
for (const oldId of ['resultsSection','ideasGrid','progressPanel','cancelGenerationBtn'])
  assert.ok(html.includes(`id="${oldId}"`), oldId);
console.log('PASS v5.7 skeleton visual-only contract');
