import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const runtime = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1]
  .replace('__APP_CONFIG_JSON__', '{}').replace('__BUILD_MANIFEST_JSON__', '{}')
  .replace('}init();', '}');
const tick = () => new Promise(resolve => setImmediate(resolve));

// A dependency-free DOM/codec adapter runs the real inline app functions. Real
// browser image decoding, focus, layout and downloads are checked separately.
function app(items = fixtures()) {
  const nodes = new Map(), revoked = [], created = [], readers = [], images = [], encodes = [], downloads = [], saved = new Map();
  let document;
  class Element {
    constructor() { this.value = ''; this.innerHTML = ''; this.textContent = ''; this.dataset = {}; this.style = {}; this.hidden = false; this.disabled = false; this.events = {}; this.open = false; this.classes = new Set(); this.classList = { add: x => this.classes.add(x), remove: x => this.classes.delete(x), contains: x => this.classes.has(x), toggle: (x, on) => on ? this.classes.add(x) : this.classes.delete(x) }; }
    addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }
    dispatch(type) { for (const fn of this.events[type] || []) fn({ target: this, preventDefault() {} }); }
    removeAttribute(key) { delete this[key]; }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    scrollIntoView() {} appendChild() {} remove() {}
    click() { if (this.download) downloads.push({ name: this.download, blob: created.find(x => x.url === this.href).blob }); else this.onclick?.({ target: this, stopPropagation() {} }); }
    querySelectorAll(selector) {
      if (selector === '.file-row') return [...this.innerHTML.matchAll(/class="file-row ([^"]*)" data-id="([^"]+)"/g)].map(([, cls, id]) => { const e = node('row:' + id); e.dataset.id = id; e.classes = new Set(cls.split(' ')); return e; });
      if (selector === '.candidate-card') return [...this.innerHTML.matchAll(/data-index="(\d+)"/g)].map(([, index]) => { const e = new Element(); e.dataset.index = index; return e; });
      return [];
    }
    querySelector(selector) { if (selector.includes('file-row')) return this.querySelectorAll('.file-row').find(e => selector.includes('selected') ? e.dataset.id === api.S.selectedId : true) || null; return new Element(); }
    getContext() { return { drawImage() {}, fillRect() {}, getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) }), createImageData: () => ({ data: new Uint8ClampedArray(4) }), putImageData() {} }; }
    toBlob(fn, type) { encodes.push(() => fn(new Blob(['encoded'], { type }))); }
  }
  const node = id => { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); };
  document = { getElementById: node, querySelectorAll: selector => selector === '[data-i18n]' ? [...html.matchAll(/<[^>]+id="([^"]+)"[^>]+data-i18n="([^"]+)"[^>]*>/g)].map(([, id, key]) => { const e = node(id); e.dataset.i18n = key; return e; }) : [], createElement: () => new Element(), addEventListener() {}, body: new Element(), documentElement: {}, activeElement: null };
  const context = vm.createContext({ document, navigator: { language: 'en' }, window: {}, innerWidth: 1000, addEventListener() {}, localStorage: { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) }, setTimeout: fn => { queueMicrotask(fn); return 1; }, clearTimeout() {}, requestAnimationFrame: fn => fn(), Blob, TextEncoder, Uint8Array, Uint32Array, Uint8ClampedArray,
    URL: { createObjectURL: blob => { const url = 'blob:new-' + created.length; created.push({ url, blob }); return url; }, revokeObjectURL: url => revoked.push(url) },
    FileReader: class { readAsDataURL(blob) { readers.push(async () => { this.result = 'data:' + blob.type + ';base64,' + Buffer.from(await blob.arrayBuffer()).toString('base64'); this.onload(); }); } },
    Image: class { set src(value) { this._src = value; images.push(() => { this.naturalWidth = this.width = 2; this.naturalHeight = this.height = 2; this.onload(); }); } get src() { return this._src; } }
  });
  const exports = 'S,E,I,sel,bind,setLang,renderList,renderPreview,renderCandidates,updatePrimaryActions,updateSnippet,updateSnippetDisplay,removeSelected:typeof removeSelected === "function"?removeSelected:undefined,closeConfirm,clearAll,addFiles,metadata,compareFormats,toggleDifference,ensureDifference,finalizeOutput,runBatch,saveAll,downloadSelected,makeZip';
  vm.runInContext(runtime.replace(/\}\)\(\);\s*$/, `globalThis.api={${exports}};})();`), context);
  const api = context.api;
  api.S.items = items; api.S.selectedId = items[0]?.id || null; api.S.lang = 'en'; api.bind(); api.renderList(); api.renderPreview();
  return { ...api, node, document, revoked, created, readers, images, encodes, downloads, saved,
    async remove(confirm = true) { assert.equal(typeof api.E.removeSelectedButton?.onclick, 'function', 'Remove selected must be wired to its action'); const pending = api.E.removeSelectedButton.onclick(); api.closeConfirm(confirm); await pending; },
    select(id, keyboard = false) { const row = node('fileList').querySelectorAll('.file-row').find(e => e.dataset.id === id); if (keyboard) row.onkeydown({ key: 'Enter', preventDefault() {} }); else row.onclick(); },
    async flush() { for (let n = 0; n < 20; n++) { const batch = [...images.splice(0), ...encodes.splice(0), ...readers.splice(0)]; for (const work of batch) await work(); await tick(); if (!images.length && !encodes.length && !readers.length) break; } }
  };
}
function item(id, name = `${id}.png`, status = 'done') {
  const file = new Blob(['source-' + id], { type: 'image/png' }); file.name = name; file.lastModified = 1;
  return { id, name, path: `folder/${name}`, file, sourceUrl: 'blob:source-' + id, width: 2, height: 2, hasAlpha: false, status, error: status === 'error' ? 'Bad image' : '', candidates: [{ url: 'blob:candidate-' + id, blob: new Blob(['candidate']), type: 'image/png', width: 2, height: 2 }], output: status === 'done' ? { blob: new Blob(['output-' + id], { type: 'image/webp' }), url: 'blob:output-' + id, diffUrl: 'blob:diff-' + id, customBase: 'edited-' + id, name: `edited-${id}.webp`, path: `folder/edited-${id}.webp`, width: 2, height: 2, type: 'image/webp' } : null };
}
function fixtures() { return [item('a'), item('b'), item('c')]; }

for (const [index, next] of [[0, 'b'], [1, 'c'], [2, 'b']]) test(`removes selected position ${index} and selects its next/previous neighbor`, async () => {
  const a = app(); a.select(['a', 'b', 'c'][index]); await a.remove();
  assert.deepEqual(Array.from(a.S.items, x => x.id), ['a', 'b', 'c'].filter((_, i) => i !== index)); assert.equal(a.S.selectedId, next); assert.equal(a.document.activeElement.dataset.id, next);
});
test('only item returns to Start, clears previews/snippets and disables saving', async () => {
  const a = app([item('a')]); a.S.snippetFull = 'old'; await a.remove();
  assert.equal(a.S.items.length, 0); assert.equal(a.S.selectedId, null); assert.equal(a.document.body.classList.contains('has-items'), false); assert.equal(a.E.sourcePreview.src, undefined); assert.equal(a.E.saveCard.hidden, true); assert.equal(a.S.snippetFull, ''); assert.equal(a.E.batchSummary.hidden, true); assert.equal(a.E.mobileSaveButton.disabled, true); assert.equal(a.E.removeSelectedButton.disabled, true); assert.equal(a.document.activeElement, a.E.addButton);
});
test('cancel preserves every item, result, setting and resource', async () => {
  const a = app(); const before = a.S.items.slice(); const settings = JSON.stringify(a.S.settings); a.select('b'); await a.remove(false);
  assert.deepEqual(a.S.items, before); assert.equal(a.S.selectedId, 'b'); assert.equal(JSON.stringify(a.S.settings), settings); assert.deepEqual(a.revoked, []);
});
test('confirmation captures the exact item ID even if selection changes', async () => {
  const a = app([item('a', 'same.png'), item('b', 'same.png'), item('c')]); a.select('a'); assert.equal(typeof a.removeSelected, 'function'); const pending = a.removeSelected(); a.select('b'); a.closeConfirm(true); await pending;
  assert.deepEqual(Array.from(a.S.items, x => x.id), ['b', 'c']); assert.equal(a.S.selectedId, 'b');
});
test('filenames containing HTML are shown as literal confirmation text', async () => {
  const a = app([item('a', '<img src=x onerror=alert(1)>.png')]); assert.equal(typeof a.removeSelected, 'function'); const pending = a.removeSelected();
  assert.match(a.E.confirmMessage.textContent, /<img src=x onerror=alert\(1\)>\.png/); assert.equal(a.E.confirmMessage.innerHTML, ''); a.closeConfirm(false); await pending;
});
test('only removed resources are revoked; survivor bytes, names, paths, candidates and settings stay intact', async () => {
  const a = app(); const [first, removed, last] = a.S.items; const output = first.output; const settings = JSON.stringify(a.S.settings); a.select(removed.id); await a.remove();
  assert.equal(a.S.items[0], first); assert.equal(a.S.items[1], last); assert.equal(first.output, output); assert.equal(await output.blob.text(), 'output-a'); assert.equal(output.name, 'edited-a.webp'); assert.equal(output.path, 'folder/edited-a.webp'); assert.equal(JSON.stringify(a.S.settings), settings); assert.deepEqual(a.revoked.sort(), ['blob:source-b', 'blob:output-b', 'blob:diff-b', 'blob:candidate-b'].sort()); assert.equal(last.candidates.length, 1); assert.match(a.E.candidateGrid.innerHTML, /blob:candidate-c/);
});
for (const status of ['waiting', 'error', 'done']) test(`removes a ${status} item and updates summary/save eligibility`, async () => {
  const a = app([item('a', 'a.png', status), item('b', 'b.png', 'waiting')]); await a.remove(); assert.equal(a.E.mobileSaveButton.disabled, true); assert.match(a.E.batchSummary.innerHTML, /1 files/);
});
test('batch conversion disables removal and ignores programmatic removal', async () => {
  const a = app(); let finish; const pending = a.runBatch(() => new Promise(r => { finish = r; }), 'Done'); assert.equal(a.E.removeSelectedButton?.disabled, true); await a.remove(); assert.equal(a.S.items.length, 3); a.S.cancelRequested = true; finish(); await pending; assert.equal(a.E.removeSelectedButton.disabled, false);
});
test('conversion starting while confirmation is pending leaves images untouched', async () => {
  const a = app(); assert.equal(typeof a.removeSelected, 'function'); const pending = a.removeSelected(); a.S.processing = true; a.closeConfirm(true); await pending; assert.equal(a.S.items.length, 3); assert.deepEqual(a.revoked, []);
});
test('removal permits re-adding the same file while duplicate names keep separate identities', async () => {
  const a = app([item('a', 'same.png'), item('b', 'same.png')]); a.S.items[1].path = 'other/same.png'; const file = a.S.items[0].file; file.webkitRelativePath = 'folder/same.png'; await a.remove(); await a.addFiles([file]); assert.equal(a.S.items.length, 2); assert.equal(a.S.items[0].id, 'b'); assert.notEqual(a.S.items[1].id, 'a'); await a.flush();
});
test('ZIP contains only survivors with exact output bytes and edited relative paths', async () => {
  const a = app(); a.select('b'); await a.remove(); await a.saveAll(); assert.equal(a.downloads.length, 1);
  const bytes = Buffer.from(await a.downloads[0].blob.arrayBuffer()); const entries = []; let pos = 0;
  while (bytes.readUInt32LE(pos) === 0x04034b50) { const size = bytes.readUInt32LE(pos + 18), nameSize = bytes.readUInt16LE(pos + 26), extra = bytes.readUInt16LE(pos + 28); const start = pos + 30 + nameSize + extra; entries.push([bytes.subarray(pos + 30, pos + 30 + nameSize).toString(), bytes.subarray(start, start + size).toString()]); pos = start + size; }
  assert.deepEqual(entries, [['folder/edited-a.webp', 'output-a'], ['folder/edited-c.webp', 'output-c']]);
});
test('late metadata cannot mutate or restore a removed item', async () => {
  const x = item('a'); x.width = x.height = x.hasAlpha = null; const a = app([x]); const pending = a.metadata(x); await a.remove(); await a.flush(); await pending; assert.equal(x.width, null); assert.equal(a.E.fileList.innerHTML, '');
});
test('late comparison after removal cannot create URLs, candidates or reopen the panel', async () => {
  const a = app(); const x = a.sel(); const pending = a.compareFormats(); await tick(); await a.remove(); await a.flush(); await pending;
  assert.equal(x.candidates, null); assert.equal(a.created.filter(x => x.blob.type === 'image/png' || x.blob.type === 'image/jpeg' || x.blob.type === 'image/webp').length, 0); assert.doesNotMatch(a.E.candidateGrid.innerHTML, /blob:new-/);
});
test('comparison selection changes discard results and keep current candidate UI', async () => {
  const a = app(); const pending = a.compareFormats(); await tick(); a.select('b'); await a.flush(); await pending; assert.match(a.E.candidateGrid.innerHTML, /blob:candidate-b/); assert.doesNotMatch(a.E.candidateGrid.innerHTML, /blob:new-/); assert.equal(a.created.length, 0);
});
test('late difference after removal does not recreate removed output URLs or show stale pixels', async () => {
  const x = item('a'); delete x.output.diffUrl; const a = app([x, item('b')]); const pending = a.toggleDifference(); await a.remove(); await a.flush(); await pending; assert.equal(x.output.diffUrl, undefined); assert.equal(a.E.differencePreview.hidden, true); assert.equal(a.E.differenceButton.disabled, false);
});
test('late snippet cannot replace the new selection or a cleared selection', async () => {
  const a = app(); const pending = a.updateSnippet(); a.select('b'); await a.readers.pop()(); await tick(); const correct = a.S.snippetFull; await a.readers.shift()(); await pending; assert.equal(a.S.snippetFull, correct);
  const pending2 = a.updateSnippet(); a.S.selectedId = null; await a.updateSnippet(); await a.flush(); await pending2; assert.equal(a.S.snippetFull, '');
});
test('late conversion cannot allocate or attach output to a removed item', async () => {
  const x = item('a'); const a = app([x]); await a.remove(); const old = x.output; await a.finalizeOutput(x, { blob: new Blob(['new']), width: 1, height: 1, quality: .8 }, 'image/png', { ...a.S.settings, keepSmaller: false }); assert.equal(x.output, old); assert.equal(a.created.length, 0);
});
test('English/Japanese labels, help and native keyboard action remain available', async () => {
  assert.match(html, /<button[^>]+id="removeSelectedButton"[^>]+type="button"/);
  const a = app(); a.setLang('en'); assert.equal(a.E.removeSelectedButton.textContent, 'Remove selected'); assert.match(a.I.en.helpUse1, /Remove selected/); a.setLang('ja'); assert.equal(a.E.removeSelectedButton.textContent, '選択画像を削除'); assert.match(a.I.ja.helpUse1, /選択画像を削除/); a.select('b', true); await a.remove(); assert.equal(a.document.activeElement.dataset.id, 'c');
});
test('selection away and back still invalidates an earlier comparison', async () => {
  const a = app(); const pending = a.compareFormats(); await tick(); a.select('b'); a.select('a'); await a.flush(); await pending; assert.equal(a.created.length, 0); assert.match(a.E.candidateGrid.innerHTML, /blob:candidate-a/);
});
test('difference encoding completing after removal does not allocate a URL', async () => {
  const x = item('a'); delete x.output.diffUrl; const a = app([x]); const pending = a.toggleDifference(); a.images.splice(0).forEach(fn => fn()); await tick(); assert.equal(a.encodes.length, 1); await a.remove(); await a.flush(); await pending; assert.equal(a.created.length, 0); assert.equal(a.E.differencePreview.hidden, true);
});
test('confirmation Escape closes without deleting and returns focus to the action', async () => {
  const a = app(); const pending = a.removeSelected(); assert.equal(a.document.activeElement, a.E.confirmCancelButton); a.E.confirmDialog.dispatch('cancel'); await pending; assert.equal(a.S.items.length, 3); assert.equal(a.E.confirmDialog.open, false); assert.equal(a.document.activeElement, a.E.removeSelectedButton);
});
test('a successful comparison owns its URLs and removal cleans all of them', async () => {
  const a = app(); const x = a.sel(); const pending = a.compareFormats(); await a.flush(); await pending; assert.equal(x.candidates.length, 3); const urls = x.candidates.map(c => c.url); assert.equal(a.E.candidatePanel.hidden, false); await a.remove(); for (const url of urls) assert.ok(a.revoked.includes(url)); assert.match(a.E.candidateGrid.innerHTML, /blob:candidate-b/);
});
test('a successful difference shows and can return to Before / After', async () => {
  const a = app(); await a.toggleDifference(); assert.equal(a.E.differencePreview.hidden, false); assert.equal(a.E.differencePreview.src, 'blob:diff-a'); await a.toggleDifference(); assert.equal(a.E.differencePreview.hidden, true); assert.equal(a.E.compareRange.disabled, false);
});
test('single-image save after removal uses the survivor edited name and original output bytes', async () => {
  const a = app(); a.select('b'); await a.remove(); a.downloadSelected(); assert.equal(a.downloads[0].name, 'edited-c.webp'); assert.equal(await a.downloads[0].blob.text(), 'output-c');
});
test('confirmation preserves replacement-dollar tokens in the exact captured path', async () => {
  const x = item('a', "cost-$&-$`-$'-$1-$$.png"); const a = app([x]); const pending = a.removeSelected();
  assert.equal(a.E.confirmMessage.textContent, `Remove “${x.path}” and its generated output? The source file is not changed.`); a.closeConfirm(false); await pending;
});
test('removal releases closed large-viewer source and output references', async () => {
  const a = app(); a.E.viewerSource.src = a.sel().sourceUrl; a.E.viewerOutput.src = a.sel().output.url; a.E.viewerFileName.textContent = a.sel().output.name; a.E.viewerDialog.open = false; await a.remove(); assert.equal(a.E.viewerSource.src, undefined); assert.equal(a.E.viewerOutput.src, undefined); assert.equal(a.E.viewerFileName.textContent, '');
});
