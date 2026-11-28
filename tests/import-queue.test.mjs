import assert from 'node:assert/strict';
import test from 'node:test';
import {app, item} from './app-harness.mjs';

test('waiting imports and cancellation leave unstarted images out of the metadata decoder', async () => {
  const a = app([]);
  a.node('autoCompressInput').checked = false;
  a.addFiles([item('one').file, item('two').file]);
  assert.equal(a.images.length, 0);
  const selected = a.sel();
  Object.assign(a.E.sourcePreview, {currentSrc: selected.sourceUrl, naturalWidth: 90, naturalHeight: 60});
  a.E.sourcePreview.dispatch('load');
  assert.equal(a.E.dimensionValue.textContent, '90 × 60');
  assert.equal(selected.hasAlpha, null);
  assert.equal(a.S.items[1].width, null);

  a.S.settings.format = 'image/png';
  a.node('autoCompressInput').checked = true;
  a.addFiles([item('three').file, item('four').file]);
  assert.equal(a.images.length, 1, 'only the active image enters the decoder');
  a.E.cancelButton.onclick();
  assert.equal(a.images.length, 1, 'cancellation must leave unstarted images idle');
  await a.flush();
  assert.equal(a.S.processing, false);
  assert.equal(a.S.items[2].status, 'done');
  assert.equal(a.S.items[3].status, 'waiting');
  assert.equal(a.S.items[3].hasAlpha, null);
});

test('imports during a manual conversion queue only their own files and settings', async () => {
  const first = item('manual', 'manual.png', 'waiting');
  const a = app([first]);
  const seen = [];
  let release;
  const manual = a.runBatch(async x => {
    seen.push(x.id);
    await new Promise(resolve => { release = resolve; });
  }, 'Done');
  a.node('autoCompressInput').checked = true;
  Object.assign(a.S.settings, {format: 'image/png', resizeMode: 'width', resizeValue: 1, keepSmaller: false});
  const added = item('auto').file;
  await a.addFiles([added, added]);
  a.S.settings.resizeValue = 2;
  a.node('autoCompressInput').checked = false;
  await a.addFiles([item('later').file]);
  release();
  await a.flush();
  await manual;
  assert.deepEqual(seen, ['manual']);
  const [, automatic, waiting] = a.S.items;
  assert.equal(a.S.items.length, 3);
  assert.equal(automatic.output.smart, true);
  assert.equal(automatic.output.width, 1);
  assert.equal(waiting.status, 'waiting');
  assert.equal(waiting.output, null);
});
