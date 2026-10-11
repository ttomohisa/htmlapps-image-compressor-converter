'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { gunzipSync } = require('node:zlib');
const argument = process.argv.indexOf('--html');
const file = argument >= 0 ? process.argv[argument + 1] : path.join(__dirname, '../src/index.template.html');
let html = fs.readFileSync(file, 'utf8');
const payload = html.match(/<script id="self-extract-payload"[^>]*>([A-Za-z0-9+/=\s]+)<\/script>/)
  || html.match(/const b=atob\(["']([A-Za-z0-9+/=]+)["']\)/)
  || html.match(/const b=["']([A-Za-z0-9+/=]+)["'],raw=Uint8Array/);
if (payload) html = gunzipSync(Buffer.from(payload[1], 'base64')).toString('utf8');
assert.match(html, /id="helpDialog"/, 'Inspect the decoded application, not the self-extract loader');
const excluded = [
  "ヘルプ表示中は背景のスクロールを止め、画面が低い場合も閉じるボタンを残して本文をスクロールできます。狭い画面でも拡大プレビューの操作と書き出しコードを画面内に収め、確認画面は閉じるボタンを残して本文をスクロールできます。",
  " Help locks background scrolling and keeps its Close button visible while its content scrolls in short viewports. Preview controls and export code stay within narrow screens; confirmation content scrolls below its fixed Close button."
];
for (const text of excluded) {
  assert.equal(html.includes(text), false, `User-facing help must exclude obsolete audit/implementation copy: ${text}`);
}
console.log('User-facing help copy regression passed.');
