import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { app, html } from './app-harness.mjs';

const config = JSON.parse(readFileSync(new URL('../app.config.json', import.meta.url), 'utf8'));
const versionLabel = 'v' + config.version;

test('header and Help share the configured release version and preserve privacy labels', () => {
  assert.match(html, /"完全ローカル処理"/);
  assert.match(html, /"Fully local processing"/);
  const h = app([]);
  h.setLang('ja');
  assert.equal(h.E.versionBadge.textContent, versionLabel);
  assert.ok(h.E.buildInfo.textContent.includes(' ' + versionLabel));
});

test('header controls localize accessible names through repeated bound language clicks', () => {
  const h = app();
  const outputs = h.S.items.map(item => item.output);
  h.setLang('ja');
  for (const language of ['ja', 'en', 'ja', 'en']) {
    const japanese = language === 'ja';
    assert.equal(h.S.lang, language);
    assert.equal(h.document.documentElement.lang, language);
    assert.equal(h.E.languageButton.textContent, japanese ? 'EN' : 'JA');
    assert.equal(h.E.languageButton.getAttribute('aria-label'), japanese ? 'Switch to English' : '日本語に切り替え');
    assert.equal(h.E.languageButton.title, h.E.languageButton.getAttribute('aria-label'));
    assert.equal(h.E.helpButton.getAttribute('aria-label'), japanese ? '使い方と注意事項' : 'How to use & notes');
    assert.equal(h.E.helpButton.title, h.E.helpButton.getAttribute('aria-label'));
    assert.equal(h.E.versionBadge.textContent, versionLabel);
    assert.equal(h.saved.get('image-toolkit.lang'), language);
    h.S.items.forEach((item, index) => assert.equal(item.output, outputs[index]));
    h.E.languageButton.click();
  }
});
