import assert from 'node:assert/strict';
import test from 'node:test';
import { html } from './app-harness.mjs';

// Source contracts complement, but cannot establish, native bounds or wheel behavior.
function rule(selector) {
  const start=html.indexOf(selector+'{');
  assert.ok(start>=0, `Missing CSS rule ${selector}`);
  return html.slice(start,html.indexOf('}',start));
}

test('native dialogs alone lock page scrolling',()=>{
  assert.match(rule('html:has(dialog:modal),body:has(dialog:modal)'),/overflow:hidden/);
});

test('Help allocates a fixed header and internally scrolling body within the viewport',()=>{
  const shell=rule('#helpDialog[open]');
  assert.match(shell,/display:flex/);assert.match(shell,/flex-direction:column/);
  assert.match(shell,/100dvh.*safe-area-inset-top.*safe-area-inset-bottom/);
  assert.match(rule('#helpDialog .dialog-header'),/flex:0 0 auto/);
  const body=rule('#helpDialog .dialog-body');
  for(const expected of [/min-height:0/,/flex:1 1 auto/,/max-height:none/,/overflow:auto/,/overscroll-behavior:contain/])assert.match(body,expected);
});

test('narrow title and version wrap while header actions remain separate',()=>{
  const start=html.indexOf('@media(max-width:420px)');assert.ok(start>=0);
  const narrow=html.slice(start,html.indexOf('</style>',start));
  assert.match(narrow,/\.brand-name\{[^}]*display:flex[^}]*flex-wrap:wrap[^}]*white-space:normal[^}]*overflow:visible/);
  assert.match(narrow,/\.version-badge\{[^}]*flex:0 0 auto[^}]*margin-left:0/);
  assert.match(narrow,/\.header-actions\{[^}]*flex-shrink:0/);
});

test('the local-processing shield, privacy policy and untested viewer allocation stay intact',()=>{
  assert.match(html,/class="local-badge"[\s\S]*?<path d="M12 3/);
  assert.match(html,/connect-src 'none'/);
  assert.match(rule('.viewer-body'),/height:calc\(100% - 67px\)/);
  assert.match(rule('.viewer-dialog'),/height:min\(860px,calc\(100dvh - 24px\)\)/);
});
