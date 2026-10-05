import assert from 'node:assert/strict';
import test from 'node:test';
import { app, item, html } from './app-harness.mjs';

// Read actual store-mode ZIP bytes, including the central directory and offsets.
function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1; } return (crc ^ 0xffffffff) >>> 0; }
async function entries(blob, binary = false) {
  const b = Buffer.from(await blob.arrayBuffer()), result = []; let p = 0;
  while (b.readUInt32LE(p) === 0x04034b50) {
    const n = b.readUInt16LE(p + 26), extra = b.readUInt16LE(p + 28), size = b.readUInt32LE(p + 18), start = p + 30 + n + extra;
    assert.equal(b.readUInt16LE(p + 6), 0x0800); assert.equal(b.readUInt16LE(p + 8), 0);
    const bytes = b.subarray(start, start + size); assert.equal(b.readUInt32LE(p + 14), crc32(bytes));
    result.push({ name: b.subarray(p + 30, p + 30 + n).toString(), bytes, offset: p }); p = start + size;
  }
  const centralStart = p;
  for (const e of result) {
    assert.equal(b.readUInt32LE(p), 0x02014b50); const n = b.readUInt16LE(p + 28);
    assert.equal(b.subarray(p + 46, p + 46 + n).toString(), e.name); assert.equal(b.readUInt32LE(p + 42), e.offset);
    assert.equal(b.readUInt32LE(p + 20), e.bytes.length); assert.equal(b.readUInt32LE(p + 16), crc32(e.bytes)); p += 46 + n + b.readUInt16LE(p + 30) + b.readUInt16LE(p + 32);
  }
  assert.equal(b.readUInt32LE(p), 0x06054b50); assert.equal(b.readUInt16LE(p + 10), result.length); assert.equal(b.readUInt32LE(p + 16), centralStart); assert.equal(b.readUInt32LE(p + 12), p - centralStart);
  return result.map(({ name, bytes }) => ({ name, bytes: binary ? bytes : bytes.toString() }));
}
const box = (a, id) => a.E.fileList.querySelectorAll('.export-checkbox').find(e => e.dataset.id === id);
const checked = a => a.E.fileList.querySelectorAll('.export-checkbox').filter(e => e.checked).map(e => e.dataset.id);
const result = (id, name = `folder/edited-${id}.webp`) => ({ name, bytes: `output-${id}` });
async function finalize(a, x, bytes = `output-${x.id}`) { await a.finalizeOutput(x, { blob: new Blob([bytes]), width: 2, height: 2, quality: .8 }, 'image/webp', { ...a.S.settings, keepSmaller: false }); a.renderList(); a.renderPreview(); }

test('ordinary photo.png and photo.jpg conversion preserves both ZIP entries and payloads', async () => {
  const a = app([item('a', 'photo.png'), item('b', 'photo.jpg')]);
  for (const x of a.S.items) { x.output = null; await finalize(a, x); }
  await a.saveAll(); assert.deepEqual(await entries(a.downloads[0].blob), [result('a', 'folder/photo.webp'), result('b', 'folder/photo (2).webp')]);
  assert.deepEqual(a.S.items.map(x => x.output.path), ['folder/photo.webp', 'folder/photo.webp']);
});
test('manual duplicate names and natural suffix names stay unique without renaming output state', async () => {
  const a = app([item('a'), item('b'), item('c'), item('d')]);
  for (const [i, x] of a.S.items.entries()) a.updateOutputName(x, i === 2 ? 'photo (2)' : 'photo');
  await a.saveAll(); assert.deepEqual(await entries(a.downloads[0].blob), [result('a', 'folder/photo.webp'), result('b', 'folder/photo (3).webp'), result('c', 'folder/photo (2).webp'), result('d', 'folder/photo (4).webp')]);
  assert.equal(a.S.items[1].output.name, 'photo.webp');
});
test('ZIP collision allocation is deterministic, extension-aware and folder-local', async () => {
  const a = app(); const names = ['one/photo.webp', 'two/photo.webp', 'one/photo.jpg', 'one/photo.webp', 'one/photo (2).webp', 'one/photo (2).webp'];
  const input = names.map((name, i) => ({ name, blob: new Blob([String(i)]) }));
  const expected = names.map((name, i) => ({ name: i === 3 ? 'one/photo (3).webp' : i === 5 ? 'one/photo (2) (2).webp' : name, bytes: String(i) }));
  assert.deepEqual(await entries(await a.makeZip(input)), expected); assert.deepEqual(await entries(await a.makeZip(input)), expected);
});
test('collision detection uses existing safe paths and preserves Unicode and case-only distinctions', async () => {
  const a = app(); const names = ['\\folder\\画像.webp', '/folder/./画像.webp', 'folder/画像 (2).webp', 'folder/Photo.webp', 'folder/photo.webp', 'readme', 'readme', ''];
  const expected = ['folder/画像.webp', 'folder/画像 (3).webp', 'folder/画像 (2).webp', 'folder/Photo.webp', 'folder/photo.webp', 'readme', 'readme (2)', 'file.bin'];
  assert.deepEqual(await entries(await a.makeZip(names.map((name, i) => ({ name, blob: new Blob([String(i)]) })))), expected.map((name, i) => ({ name, bytes: String(i) })));
});
test('new items default to checked, but counts and exports include only available outputs', async () => {
  const a = app([item('a'), item('b', 'b.png', 'waiting'), item('c', 'c.png', 'error')]);
  assert.deepEqual(checked(a), ['a', 'b', 'c']); assert.equal(a.E.checkedCount.textContent, '1 checked output');
  assert.equal(box(a, 'b').disabled, true); assert.equal(box(a, 'c').disabled, true); assert.equal(a.E.saveCheckedButton.disabled, false);
  await a.E.saveCheckedButton.onclick(); assert.match(a.downloads[0].name, /\.zip$/); assert.deepEqual(await entries(a.downloads[0].blob), [result('a')]);
});
test('checkbox changes are separate from preview selection and do not re-render or convert images', async () => {
  const a = app(); const before = a.S.items.map(x => x.output), htmlBefore = a.E.fileList.innerHTML, version = a.S.viewVersion;
  a.check('b', false); assert.equal(a.S.selectedId, 'a'); assert.equal(a.S.viewVersion, version); assert.equal(a.E.fileList.innerHTML, htmlBefore); assert.deepEqual(a.S.items.map(x => x.output), before); assert.equal(a.E.confirmDialog.open, false); assert.equal(a.E.checkedCount.textContent, '2 checked outputs');
  a.select('b', true); assert.deepEqual(checked(a), ['a', 'c']); assert.equal(a.S.selectedId, 'b');
  await a.E.saveCheckedButton.onclick(); assert.deepEqual(await entries(a.downloads[0].blob), [result('a'), result('c')]);
});
test('checkbox Enter toggles only inclusion; Space retains native behavior without preview activation', () => {
  const a = app(); const b = box(a, 'b'); let prevented = false;
  b.onkeydown({ key: 'Enter', target: b, preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(b.checked, false); assert.equal(a.S.selectedId, 'a');
  prevented = false; b.onkeydown({ key: ' ', target: b, preventDefault() { prevented = true; } }); assert.equal(prevented, false); a.check('b', true); assert.equal(a.S.selectedId, 'a');
});
test('All and None only affect available outputs and preserve preview selection', async () => {
  const a = app([item('a'), item('b', 'b.png', 'waiting'), item('c', 'c.png', 'error')]); a.E.checkNoneButton.onclick();
  assert.deepEqual(checked(a), ['b', 'c']); assert.equal(a.E.checkedCount.textContent, '0 checked outputs'); assert.equal(a.E.saveCheckedButton.disabled, true); assert.equal(a.S.selectedId, 'a');
  await a.E.saveCheckedButton.onclick(); assert.equal(a.downloads.length, 0);
  await finalize(a, a.S.items[1]); assert.equal(a.E.checkedCount.textContent, '1 checked output');
  a.E.checkAllButton.onclick(); assert.deepEqual(checked(a), ['a', 'b', 'c']); assert.equal(a.E.checkedCount.textContent, '2 checked outputs'); assert.equal(a.S.selectedId, 'a');
});
test('inclusion survives rerender, language, edited names and replacement outputs', async () => {
  const a = app(); a.check('b', false); a.updateOutputName(a.S.items[1], 'renamed'); a.renderList(); a.setLang('ja');
  assert.deepEqual(checked(a), ['a', 'c']); assert.equal(a.E.checkedCount.textContent, 'チェック済み 2 枚'); await finalize(a, a.S.items[1], 'replacement-b'); assert.deepEqual(checked(a), ['a', 'c']);
  a.setLang('en'); await a.saveAll(); assert.equal((await entries(a.downloads[0].blob))[1].name, 'folder/renamed.webp');
});
test('retained output remains eligible after retry error without changing inclusion', async () => {
  const a = app(); a.check('b', false); a.S.items[0].status = a.S.items[1].status = 'error'; a.renderList();
  assert.equal(a.E.checkedCount.textContent, '2 checked outputs'); assert.equal(box(a, 'a').disabled, false); await a.E.saveCheckedButton.onclick(); assert.deepEqual(await entries(a.downloads[0].blob), [result('a'), result('c')]);
});
test('remove and re-add reconcile stable identities; clear resets all inclusion state', async () => {
  const a = app(); a.check('a', false); const old = a.S.items[0]; await a.remove(); assert.deepEqual(checked(a), ['b', 'c']);
  await a.addFiles([old.file]); const added = a.S.items.at(-1); assert.notEqual(added.id, old.id); assert.equal(box(a, added.id).checked, true); assert.equal(a.S.exportChecked.has(old.id), false);
  const p = a.clearAll(); a.closeConfirm(true); await p; assert.equal(a.S.exportChecked.size, 0); assert.equal(a.E.saveCheckedButton.disabled, true); assert.equal(a.E.checkedCount.textContent, '0 checked outputs'); await a.flush();
});
test('batch disables checkbox and bulk controls and restores correct state after cancellation', async () => {
  const a = app(); a.check('b', false); let release; const p = a.runBatch(() => new Promise(r => { release = r; }), 'Done');
  assert.equal(a.E.saveCheckedButton.disabled, true); assert.equal(a.E.checkAllButton.disabled, true); assert.equal(a.E.checkNoneButton.disabled, true); assert.equal(box(a, 'a').disabled, true);
  a.E.checkNoneButton.onclick(); await a.E.saveCheckedButton.onclick(); assert.equal(a.downloads.length, 0); assert.equal(a.S.exportChecked.get('a'), true);
  a.E.cancelButton.onclick(); release(); await p; assert.equal(a.E.saveCheckedButton.disabled, false); assert.equal(box(a, 'a').disabled, false); assert.deepEqual(checked(a), ['a', 'c']);
});
test('checked ZIP snapshots membership, paths and Blob identity before asynchronous reading', async () => {
  const a = app(); a.check('c', false); const first = a.S.items[0].output.blob; let release;
  a.S.items[0].output.blob = { size: first.size, arrayBuffer: () => new Promise(r => { release = async () => r(await first.arrayBuffer()); }) };
  const p = a.E.saveCheckedButton.onclick(); assert.equal(typeof release, 'function');
  a.E.checkNoneButton.onclick(); a.updateOutputName(a.S.items[1], 'changed'); a.S.items[0].output = { blob: new Blob(['replacement']), name: 'new.webp', path: 'new.webp' }; a.S.items.splice(1, 1); a.renderList();
  await release(); await p; assert.deepEqual(await entries(a.downloads[0].blob), [result('a'), result('b')]);
});
test('checked ZIP uses the same collision-safe paths and always zips a single checked output', async () => {
  const a = app(); a.updateOutputName(a.S.items[0], 'same'); a.updateOutputName(a.S.items[1], 'same'); a.check('c', false);
  await a.E.saveCheckedButton.onclick(); assert.deepEqual(await entries(a.downloads[0].blob), [result('a', 'folder/same.webp'), result('b', 'folder/same (2).webp')]);
  a.check('b', false); await a.E.saveCheckedButton.onclick(); assert.equal(a.downloads[1].blob.type, 'application/zip'); assert.deepEqual(await entries(a.downloads[1].blob), [result('a', 'folder/same.webp')]);
});
test('Save all and Save this image keep existing behavior regardless of checkbox state', async () => {
  const a = app([item('a')]); a.E.checkNoneButton.onclick(); await a.saveAll(); a.downloadSelected();
  assert.equal(a.downloads.length, 2); for (const d of a.downloads) { assert.equal(d.name, 'edited-a.webp'); assert.equal(await d.blob.text(), 'output-a'); }
  const b = app(); b.E.checkNoneButton.onclick(); await b.saveAll(); assert.equal((await entries(b.downloads[0].blob)).length, 3);
});
test('bilingual controls, help and accessible checkbox labels distinguish preview from export', () => {
  const a = app([item('a', '<special>&.png')]); a.setLang('en'); assert.equal(a.E.saveCheckedButton.textContent, 'Save checked ZIP'); assert.equal(a.E.checkAllButton.textContent, 'All'); assert.equal(a.E.checkNoneButton.textContent, 'None'); assert.match(a.I.en.helpUse3, /Save checked ZIP/);
  assert.match(a.E.fileList.innerHTML, /aria-label="Include in ZIP: folder\/&lt;special&gt;&amp;\.png"/);
  assert.match(a.E.fileList.innerHTML, /<div class="file-entry"><label[^>]*><input[^>]*><\/label><div class="file-row /);
  a.setLang('ja'); assert.equal(a.E.saveCheckedButton.textContent, 'チェック済みをZIP保存'); assert.match(a.I.ja.helpUse3, /チェック済みをZIP保存/);
  assert.match(html, /id="checkedExportControls"/); assert.match(html, /id="mobileSaveButton"/); assert.match(html, /connect-src 'none'/); assert.equal(a.saved.has('image-toolkit.exportChecked'), false);
});

test('both ZIP save paths preserve arbitrary binary Blob bytes and CRCs with duplicate names', async () => {
  const a = app([item('a'), item('b')]), payloads = [Buffer.from([0, 255, 128, 1, 13, 10]), Buffer.from([254, 0, 129, 192, 255, 7])];
  a.S.items.forEach((x, i) => { x.output.blob = new Blob([payloads[i]]); a.updateOutputName(x, 'same'); });
  await a.saveAll(); await a.E.saveCheckedButton.onclick();
  for (const download of a.downloads) assert.deepEqual(await entries(download.blob, true), payloads.map((bytes, i) => ({ name: `folder/same${i ? ' (2)' : ''}.webp`, bytes })));
});
test('successful batch continues after an error and counts only completed checked outputs', async () => {
  const a = app([item('a', 'a.png', 'waiting'), item('b', 'b.png', 'waiting'), item('c', 'c.png', 'waiting')]);
  assert.equal(a.E.checkAllButton.disabled, true); assert.equal(a.E.checkNoneButton.disabled, true); assert.equal(a.E.saveCheckedButton.disabled, true);
  const seen = []; await a.runBatch(async x => { seen.push(x.id); if (x.id === 'b') { x.status = 'error'; throw Error('synthetic codec failure'); } await finalize(a, x); }, 'Done');
  assert.deepEqual(seen, ['a', 'b', 'c']); assert.equal(a.E.progressText.textContent, '3 / 3'); assert.equal(a.E.checkedCount.textContent, '2 checked outputs'); assert.equal(a.E.saveCheckedButton.disabled, false);
  a.E.checkNoneButton.onclick(); await finalize(a, a.S.items[1]); assert.equal(a.E.checkedCount.textContent, '1 checked output');
  await a.E.saveCheckedButton.onclick(); assert.deepEqual(await entries(a.downloads[0].blob), [result('b', 'folder/b.webp')]);
});
test('canceling removal leaves the exact export membership and preview unchanged', async () => {
  const a = app(); a.check('a', false); a.select('b'); await a.remove(false);
  assert.deepEqual(checked(a), ['b', 'c']); assert.equal(a.S.selectedId, 'b'); assert.equal(a.E.checkedCount.textContent, '2 checked outputs');
});
