'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const js = fs.readFileSync('studio.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('saas-design.css', 'utf8');
for (const marker of ['data-action="edit"', 'data-action="pdf"', 'data-action="copy"', 'data-action="remove"', 'data-action="compare"']) {
  assert.ok(js.includes(marker), `Missing pre-existing campaign control: ${marker}`);
}
for (const name of ['share-zalo','share-telegram']) {
  assert.ok(js.includes(`data-action="${name}"`), `Missing share action: ${name}`);
}
assert.match(js, /<svg class="icon" aria-hidden="true"><use href="#i-more"><\/use><\/svg><span>Thao tác<\/span>/);
assert.match(js, /async function shareCampaign\(idea, platform\)/);
assert.match(js, /https:\/\/t\.me\/share\/url\?url=/);
assert.match(js, /encodeURIComponent\(content\)/);
assert.match(js, /navigator\.share\(/);
assert.match(js, /https:\/\/chat\.zalo\.me\//);
assert.ok(!js.includes("window.location.assign(shareUrl)"),'Share must not navigate away from campaign page');
assert.match(css, /linear-gradient\(135deg,#FF5A1F 0%,#FF8A00 100%\)/);
assert.match(css, /mg-menu-share-zalo/);
assert.match(css, /mg-menu-share-telegram/);
assert.match(html, /saas-design\.css\?v=share59/);
assert.match(html, /studio\.js\?v=share59/);
console.log('PASS v5.9 menu visibility, menu actions, Telegram and Zalo share paths, cache versions');
