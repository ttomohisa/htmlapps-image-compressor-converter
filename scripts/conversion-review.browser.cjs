'use strict';
const assert = require('node:assert/strict');
const { before, after, beforeEach, afterEach, test } = require('node:test');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, firefox, webkit } = require('playwright');

const artifact = path.resolve(__dirname, '..', process.env.IMAGE_SOURCE || 'dist/index.html');
let browser, page;
before(async () => {
  const engine = { chromium, firefox, webkit }[process.env.BROWSER_ENGINE || 'chromium'];
  browser = await engine.launch(engine === chromium ? { executablePath: process.env.CHROMIUM_PATH } : {});
});
after(async () => browser?.close());
beforeEach(async () => {
  page = await browser.newPage({ locale: 'ja', viewport: { width: 1360, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(4500);
  await page.goto(pathToFileURL(artifact).href);
  await page.locator('#addButton').waitFor();
});
afterEach(async () => page.context().close());

test('keyboard activation opens the file picker belonging to the focused button', async () => {
  for (const [control, input] of [['#folderButton', 'folderInput'], ['#addButton', 'fileInput'], ['#dropZone', 'fileInput']]) {
    for (const key of ['Enter', 'Space']) {
      const waiting = page.waitForEvent('filechooser');
      await page.locator(control).press(key);
      assert.equal(await (await waiting).element().getAttribute('id'), input);
    }
  }
});

test('format cards show the size and dimensions that are actually selected under a size limit', async () => {
  await page.locator('#fileInput').setInputFiles(path.resolve(__dirname, '../assets/screenshot.png'));
  await page.locator('[data-preset="upload"]').click();
  await page.locator('#targetKb').fill('10');
  await page.locator('#targetKb').press('Tab');
  await page.locator('#compareFormatsButton').click();
  const pngCard = page.locator('.candidate-card').filter({ hasText: 'PNG' });
  const description = await pngCard.locator('.candidate-meta').innerText({ timeout: 30000 });
  await pngCard.click();
  await page.locator('#saveCard').waitFor();
  const size = (await page.locator('#outputSizeValue').innerText()).split(' · ')[0];
  const dimensions = await page.locator('#dimensionValue').innerText();
  assert.equal(description, size + ' · ' + dimensions);
  await page.locator('#targetKb').fill('20');
  await page.locator('#targetKb').press('Tab');
  assert.ok(await page.locator('#candidatePanel').isHidden(), 'refresh a comparison after its settings change');
});

async function png(name = 'logo.png', fineAlpha = false) {
  const data = await page.evaluate(fine => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (fine) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 600, 400);
      ctx.clearRect(555, 333, 1, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.996)';
      ctx.fillRect(555, 333, 1, 1);
    } else {
      ctx.fillStyle = 'blue';
      ctx.fillRect(290, 160, 20, 80);
    }
    return canvas.toDataURL().split(',')[1];
  }, fineAlpha);
  return { name, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') };
}
async function manualJpeg() {
  await page.locator('#fileInput').setInputFiles(await png());
  await page.locator('[data-preset="convert"]').click();
  await page.locator('.advanced-settings summary').click();
  await page.locator('[data-format="image/jpeg"]').click();
  await page.locator('#processButton').click();
  await page.locator('#downloadSelectedButton').waitFor();
}
async function sampleStage(selector) {
  const frame = await page.locator(selector).screenshot();
  return page.evaluate(async b64 => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const sample = ratio => {
      const pixel = ctx.getImageData(Math.round(img.width * ratio), Math.round(img.height * 0.55), 1, 1);
      return Math.min(...pixel.data.slice(0, 3));
    };
    return [sample(0.3), sample(0.7)];
  }, frame.toString('base64'));
}
test('both comparison views place the transparent source left and the white JPEG right', async () => {
  await manualJpeg();
  assert.deepEqual(await page.locator('.preview-tag').allTextContents(), ['元画像', '変換後']);
  for (const stage of ['#previewStage', '#viewerStage']) {
    if (stage === '#viewerStage') await page.locator('#openViewerButton').click();
    const [left, right] = await sampleStage(stage);
    assert.ok(left < 252 && right > 252, stage + ' source/output pixel values: ' + [left, right]);
  }
  for (const [stage, range] of [['#viewerStage', '#viewerCompareRange'], ['#previewStage', '#compareRange']]) {
    await page.locator(range).press('Home');
    assert.ok((await sampleStage(stage)).every(value => value > 252), 'all output at the left endpoint');
    await page.locator(range).press('End');
    assert.ok((await sampleStage(stage)).every(value => value < 252), 'all source at the right endpoint');
    if (stage === '#viewerStage') await page.locator('#viewerCloseButton').click();
  }
});

const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMwFRH7DwACQAFfkyWOnQAAAABJRU5ErkJggg==', 'base64');
async function convertWithOriginalRetention() {
  // A one-pixel JPEG is larger than this PNG in all three engines; WebP sizes vary.
  await page.locator('.advanced-settings summary').click();
  await page.locator('[data-format="image/jpeg"]').click();
  await page.locator('#qualityRange').press('Home');
  await page.locator('#processButton').click();
}
test('retaining the original warns about metadata at save time in both languages', async () => {
  await page.locator('#fileInput').setInputFiles({
    name: 'pixel.png', mimeType: 'image/png',
    buffer: onePixelPng
  });
  await convertWithOriginalRetention();
  const warning = page.locator('#outputWarning');
  await warning.waitFor();
  assert.match(await warning.innerText(), /撮影情報|メタデータ/);
  await page.locator('#languageButton').click();
  assert.match(await warning.innerText(), /metadata/i);
  const checkedNote = page.locator('#checkedExportControls [data-retention]');
  assert.ok(await checkedNote.isVisible());
  await page.locator('#checkNoneButton').click();
  assert.ok(await checkedNote.isHidden());
  await page.setViewportSize({ width: 320, height: 568 });
  const saveNote = page.locator('.mobile-bar [data-retention]');
  await saveNote.waitFor({ state: 'visible' });
  assert.match(await saveNote.innerText(), /metadata/i);
});

test('one nearly opaque pixel rules out JPEG even outside the first scan tile', async () => {
  await page.locator('#fileInput').setInputFiles(await png('fine.png', true));
  await page.locator('#compareFormatsButton').click();
  await page.locator('.candidate-card').first().waitFor();
  const formats = await page.locator('.candidate-top').allInnerTexts();
  assert.ok(formats.some(s => s.includes('PNG')));
  assert.ok(!formats.some(s => s.includes('JPEG')), formats.join(', '));
});

test('the bulk save card identifies retained siblings of a re-encoded selection', async () => {
  const screenshot = await readFile(path.resolve(__dirname, '../assets/screenshot.png'));
  await page.locator('#fileInput').setInputFiles([
    { name: 'screen.png', mimeType: 'image/png', buffer: screenshot },
    { name: 'pixel.png', mimeType: 'image/png', buffer: onePixelPng }
  ]);
  await convertWithOriginalRetention();
  await page.locator('#saveAllButton').waitFor();
  assert.ok(await page.locator('#outputWarning').isHidden());
  assert.ok(await page.locator('#saveCard [data-retention]').isVisible());
});

test('transparent pixels survive candidate selection when the picker reports a JPEG MIME type', async () => {
  const input = await png('mislabeled.jpg', true);
  await page.locator('#fileInput').setInputFiles({ ...input, mimeType: 'image/jpeg' });
  await page.locator('#compareFormatsButton').click();
  await page.locator('.candidate-card').first().waitFor();
  assert.doesNotMatch((await page.locator('.candidate-top').allInnerTexts()).join(' '), /JPEG/);
});

test('a retained original is downloaded with its actual image extension', async () => {
  await page.locator('#fileInput').setInputFiles({ name: 'logo.jpg', mimeType: 'image/jpeg', buffer: onePixelPng });
  await convertWithOriginalRetention();
  await page.locator('#outputWarning').waitFor();
  const pending = page.waitForEvent('download');
  await page.locator('#downloadSelectedButton').click();
  const download = await pending;
  assert.equal(download.suggestedFilename(), 'logo.png');
  assert.deepEqual(await readFile(await download.path()), onePixelPng);
});

const damaged = { name: 'unreadable.png', mimeType: 'image/png', buffer: Buffer.from('unreadable') };
test('a mixed batch announces actual successes and failures', async () => {
  await page.locator('#fileInput').setInputFiles([await png(), damaged]);
  await page.locator('#smartOptimizeButton').click();
  await page.waitForFunction(() => document.querySelector('.file-status.error') && !document.querySelector('#smartOptimizeButton').disabled);
  assert.match(await page.locator('#toast').innerText(), /1枚成功.*1枚失敗/);
  await page.locator('#languageButton').click();
  assert.match(await page.locator('#batchSummary').innerText(), /1 succeeded.*1 failed/);
});

test('the mobile results shortcut reaches a finished image after a long mixed batch', async () => {
  await page.setViewportSize({ width: 320, height: 568 });
  const good = await png();
  await page.locator('#fileInput').setInputFiles([damaged, ...Array.from({ length: 19 }, (_, i) => ({ ...good, name: i + '.png' }))]);
  await page.locator('#mobileProcessButton').click();
  await page.waitForFunction(() => document.querySelectorAll('.file-status.done').length === 19 && !document.querySelector('#mobileProcessButton').disabled, null, { timeout: 60000 });
  const shortcut = page.getByRole('button', { name: '結果を見る' });
  await shortcut.click();
  const stage = await page.locator('#previewStage').boundingBox();
  assert.ok(stage.y >= 0 && stage.y < 350, 'preview within phone viewport');
  assert.ok(await page.locator('#saveCard').isVisible());
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
  await page.locator('#languageButton').click();
  assert.ok(await page.getByRole('button', { name: 'View results' }).isVisible());
});

function zipEntries(bytes) {
  const entries = new Map();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const nameLength = bytes.readUInt16LE(offset + 26);
    const begin = offset + 30 + nameLength + bytes.readUInt16LE(offset + 28);
    const end = begin + bytes.readUInt32LE(offset + 18);
    entries.set(bytes.toString('utf8', offset + 30, offset + 30 + nameLength), bytes.subarray(begin, end));
    offset = end;
  }
  return entries;
}
test('renamed Web assets resolve from both the copied and packaged picture markup', async () => {
  await manualJpeg();
  const name = '新 ロゴ#2&x.v2';
  await page.locator('#outputFilenameInput').fill(name);
  await page.locator('#outputFilenameInput').press('Enter');
  await page.locator('#exportButton').click();
  await page.locator('[data-mode="picture"]').click();
  const copied = await page.locator('#codeOutput').inputValue();
  const pending = page.waitForEvent('download');
  await page.locator('#webPackageButton').click();
  const download = await pending;
  const entries = zipEntries(await readFile(await download.path()));
  assert.equal(download.suggestedFilename(), name + '-web-assets.zip');
  assert.deepEqual([...entries.keys()], [name + '.webp', name + '.png', 'snippet.html']);
  assert.equal(entries.get('snippet.html').toString().trim(), copied.trim());
  for (const [, url] of copied.matchAll(/(?:srcset|src)="([^"]+)"/g)) {
    assert.ok(!/[\s#]/.test(url) && entries.has(decodeURIComponent(url)), url);
  }
});
