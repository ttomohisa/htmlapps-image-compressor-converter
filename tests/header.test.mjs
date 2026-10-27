import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { app, html } from './app-harness.mjs';

test('header version matches the once-incremented canonical version and privacy is preserved', () => {
  const config = JSON.parse(readFileSync(new URL('../app.config.json', import.meta.url), 'utf8'));
  assert.equal(config.version, '1.1.2');
  assert.match(html, /id="versionBadge">v1\.1\.2<\/span>/);
  assert.match(html, /"完全ローカル処理"/);
  assert.match(html, /"Fully local processing"/);
  const h = app([]);
  h.setLang('ja');
  assert.equal(h.E.versionBadge.textContent, 'v1.1.2');
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
    assert.equal(h.E.versionBadge.textContent, 'v1.1.2');
    assert.equal(h.saved.has('image-toolkit.lang'), false);if(language==='en')assert.equal(h.saved.get('browser-kitty:ui-language:v1'),language);
    h.S.items.forEach((item, index) => assert.equal(item.output, outputs[index]));
    h.E.languageButton.click();
  }
});


test('language resolution reads URL/common/legacy/browser in order without migration writes',()=>{
 for(const [options,expected] of [[{url:'https://test.invalid/?lang=ja',saved:{'browser-kitty:ui-language:v1':'en'}},'ja'],[{saved:{'browser-kitty:ui-language:v1':'ja','image-toolkit.lang':'en'}},'ja'],[{saved:{'image-toolkit.lang':'ja'}},'ja'],[{languages:['fr','ja-JP','en-US']},'ja'],[{languages:['fr']},'en']]){
  const a=app([],options),before=Array.from(a.saved);a.loadSettings();assert.equal(a.S.lang,expected);assert.deepEqual(Array.from(a.saved),before);
 }
});
test('settings/language storage failure keeps images and settings, with persistent recovery notice',()=>{
 const a=app(undefined,{storageUnavailable:true}),before=a.S.items.slice();a.S.settings.quality=73;
 assert.equal(a.saveSettings(),false);assert.match(a.node('settingsStatus').textContent,/Could not save settings/);
 a.E.languageButton.click();assert.equal(a.S.lang,'ja');assert.match(a.node('languageStatus').textContent,/この画面/);
 assert.deepEqual(a.S.items,before);assert.equal(a.S.settings.quality,73);
});
test('open removal confirmation translates its captured literal filename and cancel preserves outputs',async()=>{
 const a=app();const before=a.S.items.slice();const pending=a.removeSelected();a.E.languageButton.click();
 assert.match(a.E.confirmMessage.textContent,/folder\/a.png/);assert.match(a.E.confirmMessage.textContent,/元ファイル/);
 assert.equal(a.document.activeElement,a.E.confirmCancelButton);a.closeConfirm(false);await pending;assert.deepEqual(a.S.items,before);
});
