import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { gunzipSync } from 'node:zlib';

// Environment overrides are native filesystem paths, including Windows drives.
function appSourcePath(override = process.env.IMAGE_SOURCE) { return override || new URL('../src/index.template.html', import.meta.url); }
const input = readFileSync(appSourcePath(), 'utf8');
const html = input.includes("new DecompressionStream('gzip')") ? gunzipSync(Buffer.from(input.match(/atob\('([^']+)'\)/)[1], 'base64')).toString() : input;
const runtime = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1]
  .replace('__APP_CONFIG_JSON__', '{}').replace('__BUILD_MANIFEST_JSON__', '{}')
  .replace('}init();', '}');
const tick = () => new Promise(resolve => setImmediate(resolve));

// A dependency-free DOM/codec adapter runs the real inline app functions. Real
// browser image decoding, focus, layout and downloads are not simulated here.
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
      if (selector === '.export-checkbox') return [...this.innerHTML.matchAll(/<input class="export-checkbox" type="checkbox" data-id="([^"]+)"([^>]*)>/g)].map(([, id, attrs]) => { const e = node('check:' + id); e.dataset.id = id; if (e.markup !== attrs) { e.checked = /\bchecked\b/.test(attrs); e.disabled = /\bdisabled\b/.test(attrs); e.markup = attrs; } return e; });
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
  const exports = 'S,E,I,sel,bind,setLang,renderList,renderPreview,renderCandidates,updatePrimaryActions,updateSnippet,updateSnippetDisplay,removeSelected:typeof removeSelected === "function"?removeSelected:undefined,closeConfirm,clearAll,addFiles,metadata,compareFormats,toggleDifference,ensureDifference,finalizeOutput,runBatch,saveAll,downloadSelected,makeZip,updateOutputName,saveCheckedZip:typeof saveCheckedZip === "function"?saveCheckedZip:undefined';
  vm.runInContext(runtime.replace(/\}\)\(\);\s*$/, `globalThis.api={${exports}};})();`), context);
  const api = context.api;
  api.S.items = items; api.S.selectedId = items[0]?.id || null; api.S.lang = 'en'; api.bind(); api.renderList(); api.renderPreview();
  return { ...api, node, document, revoked, created, readers, images, encodes, downloads, saved,
    async remove(confirm = true) { assert.equal(typeof api.E.removeSelectedButton?.onclick, 'function', 'Remove selected must be wired to its action'); const pending = api.E.removeSelectedButton.onclick(); api.closeConfirm(confirm); await pending; },
    select(id, keyboard = false) { const row = node('fileList').querySelectorAll('.file-row').find(e => e.dataset.id === id); if (keyboard) row.onkeydown({ key: 'Enter', preventDefault() {} }); else row.onclick(); },
    check(id, value) { const box = node('fileList').querySelectorAll('.export-checkbox').find(e => e.dataset.id === id); assert.ok(box, 'Each image needs its own export checkbox'); box.checked = value; box.onchange({ target: box }); },
    async flush() { for (let n = 0; n < 20; n++) { const batch = [...images.splice(0), ...encodes.splice(0), ...readers.splice(0)]; for (const work of batch) await work(); await tick(); if (!images.length && !encodes.length && !readers.length) break; } }
  };
}
function item(id, name = `${id}.png`, status = 'done') {
  const file = new Blob(['source-' + id], { type: 'image/png' }); file.name = name; file.lastModified = 1;
  return { id, name, path: `folder/${name}`, file, sourceUrl: 'blob:source-' + id, width: 2, height: 2, hasAlpha: false, status, error: status === 'error' ? 'Bad image' : '', candidates: [{ url: 'blob:candidate-' + id, blob: new Blob(['candidate']), type: 'image/png', width: 2, height: 2 }], output: status === 'done' ? { blob: new Blob(['output-' + id], { type: 'image/webp' }), url: 'blob:output-' + id, diffUrl: 'blob:diff-' + id, customBase: 'edited-' + id, name: `edited-${id}.webp`, path: `folder/edited-${id}.webp`, width: 2, height: 2, type: 'image/webp' } : null };
}
function fixtures() { return [item('a'), item('b'), item('c')]; }


export { app, item, html, tick, appSourcePath };
