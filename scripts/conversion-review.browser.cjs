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
  page.setDefaultTimeout(15000);
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

test('workbench header and footer align with the image workspace after adding a file', async () => {
  await page.locator('#fileInput').setInputFiles(await png());
  await page.locator('body.has-items').waitFor();
  for (const width of [1920, 1360, 1024, 721, 720, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const edges = await page.evaluate(() => {
      function contentEdges(selector) {
        const el = document.querySelector(selector);
        const box = el.getBoundingClientRect();
        const css = getComputedStyle(el);
        return [box.left + parseFloat(css.paddingLeft), box.right - parseFloat(css.paddingRight)];
      }
      return {
        main: contentEdges('.app-layout'),
        header: contentEdges('.header-inner'),
        footer: contentEdges('footer')
      };
    });
    for (const name of width > 720 ? ['header', 'footer'] : ['header']) {
      edges[name].forEach((edge, i) => assert.ok(Math.abs(edge - edges.main[i]) <= 1,
        width + 'px ' + name + ' edge ' + edge + ' should align with ' + edges.main[i]));
    }
  }
});

test('format cards show the size and dimensions that are actually selected under a size limit', async () => {
  await page.locator('#autoCompressInput').uncheck();
  await page.locator('#fileInput').setInputFiles(path.resolve(__dirname, '../assets/screenshot.png'));
  await openSettings();
  await page.locator('[data-preset="upload"]').click();
  await page.locator('#targetKb').fill('10');
  await page.locator('#targetKb').press('Tab');
  await page.locator('#closeSettingsButton').click();
  await page.locator('#compareFormatsButton').click();
  const pngCard = page.locator('.candidate-card').filter({ hasText: 'PNG' });
  const description = await pngCard.locator('.candidate-meta').innerText({ timeout: 30000 });
  await pngCard.click();
  await page.locator('#saveCard').waitFor();
  const size = (await page.locator('#outputSizeValue').innerText()).split(' · ')[0];
  const dimensions = await page.locator('#dimensionValue').innerText();
  assert.equal(description, size + ' · ' + dimensions);
  await openSettings();
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
async function openSettings() {
  await page.locator('#openSettingsButton:visible, #workspaceSettingsButton:visible, #mobileSettingsButton:visible').first().click();
}
async function manualJpeg() {
  await page.locator('#autoCompressInput').uncheck();
  await page.locator('#fileInput').setInputFiles(await png());
  await openSettings();
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
  await openSettings();
  // A one-pixel JPEG is larger than this PNG in all three engines; WebP sizes vary.
  await page.locator('.advanced-settings summary').click();
  await page.locator('[data-format="image/jpeg"]').click();
  await page.locator('#qualityRange').press('Home');
  await page.locator('#processButton').click();
}
test('retaining the original warns about metadata at save time in both languages', async () => {
  await page.locator('#autoCompressInput').uncheck();
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
  await page.locator('#fileOptions summary').click();
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
  await page.locator('#autoCompressInput').uncheck();
  await page.locator('#fileInput').setInputFiles(await png('fine.png', true));
  await page.locator('#compareFormatsButton').click();
  await page.locator('.candidate-card').first().waitFor();
  const formats = await page.locator('.candidate-top').allInnerTexts();
  assert.ok(formats.some(s => s.includes('PNG')));
  assert.ok(!formats.some(s => s.includes('JPEG')), formats.join(', '));
});

test('the bulk save card identifies retained siblings of a re-encoded selection', async () => {
  await page.locator('#autoCompressInput').uncheck();
  const screenshot = await readFile(path.resolve(__dirname, '../assets/screenshot.png'));
  await page.locator('#fileInput').setInputFiles([
    { name: 'screen.png', mimeType: 'image/png', buffer: screenshot },
    { name: 'pixel.png', mimeType: 'image/png', buffer: onePixelPng }
  ]);
  await convertWithOriginalRetention();
  await page.locator('#saveAllButton').waitFor();
  assert.ok(await page.locator('#outputWarning').isHidden());
  assert.ok(await page.locator('#batchDownload [data-retention]').isVisible());
});

test('transparent pixels survive candidate selection when the picker reports a JPEG MIME type', async () => {
  await page.locator('#autoCompressInput').uncheck();
  const input = await png('mislabeled.jpg', true);
  await page.locator('#fileInput').setInputFiles({ ...input, mimeType: 'image/jpeg' });
  await page.locator('#compareFormatsButton').click();
  await page.locator('.candidate-card').first().waitFor();
  assert.doesNotMatch((await page.locator('.candidate-top').allInnerTexts()).join(' '), /JPEG/);
});

test('a retained original is downloaded with its actual image extension', async () => {
  await page.locator('#autoCompressInput').uncheck();
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
async function waitForIdle(doneCount) {
  await page.waitForFunction(count =>
    document.querySelectorAll('.file-status.done').length === count && !document.querySelector('#processButton').disabled,
    doneCount, {timeout: 30000});
}
async function pauseFirstEncode() {
  await page.evaluate(() => {
    const native = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(...args) {
      HTMLCanvasElement.prototype.toBlob = native;
      window.resumeEncode = () => native.apply(this, args);
    };
  });
}
async function downloadOutput() {
  const event = page.waitForEvent('download');
  await page.locator('#downloadSelectedButton').click();
  const download = await event;
  return {name: download.suggestedFilename(), bytes: await readFile(await download.path())};
}
test('the default picker produces a downloadable result and duplicate or later imports preserve it', async () => {
  assert.ok(await page.locator('#autoCompressInput').isChecked());
  const source = path.resolve(__dirname, '../assets/screenshot.png');
  const picker = page.waitForEvent('filechooser');
  await page.locator('#addButton').click();
  await (await picker).setFiles(source);
  await waitForIdle(1);
  const imageUrl = await page.locator('#outputPreview').getAttribute('src');
  assert.match(imageUrl, /^blob:/);
  const first = await downloadOutput();
  assert.match(first.name, /^screenshot\.(webp|png|jpg)$/);
  assert.ok(first.bytes.length > 0 && first.bytes.length <= (await readFile(source)).length);
  await page.locator('#outputDetails summary').click();
  const filename = page.locator('#outputFilenameInput');
  await filename.fill('custom name');
  await filename.press('Enter');
  await page.locator('#fileInput').setInputFiles(source);
  assert.equal(await page.locator('.file-row').count(), 1);
  assert.equal(await page.locator('#outputPreview').getAttribute('src'), imageUrl);
  await page.locator('#fileInput').setInputFiles(await png('another.png'));
  await waitForIdle(2);
  assert.equal(await page.locator('#outputPreview').getAttribute('src'), imageUrl);
  const saved = await downloadOutput();
  assert.equal(saved.name, 'custom name' + path.extname(first.name));
  assert.deepEqual(saved.bytes, first.bytes);
});
test('desktop compresses the selected pending image and mobile compresses the rest without replacing existing results', async () => {
  const image = await png();
  await openSettings();
  await page.locator('[data-preset="convert"]').click();
  await page.locator('.advanced-settings summary').click();
  await page.locator('[data-format="image/png"]').click();
  await page.locator('#closeSettingsButton').click();
  await page.locator('#fileInput').setInputFiles(image);
  await waitForIdle(1);
  await page.locator('#outputDetails summary').click();
  await page.locator('#outputFilenameInput').fill('original edit');
  await page.locator('#outputFilenameInput').press('Enter');
  const first = await downloadOutput();
  assert.equal(first.name, 'original edit.png');
  const preview = page.locator('#outputPreview');
  const originalUrl = await preview.getAttribute('src');

  await page.locator('#autoCompressInput').uncheck();
  await page.locator('#fileInput').setInputFiles(['second.png', 'third.png', 'fourth.png'].map(name => ({...image, name})));
  await openSettings();
  await page.locator('[data-format="image/jpeg"]').click();
  await page.locator('#closeSettingsButton').click();
  const rows = page.locator('.file-row');
  await rows.nth(1).click();
  await page.setViewportSize({width: 390, height: 844});
  assert.ok(await page.locator('#mobileSaveButton').isDisabled());
  const mobilePicker = page.locator('#previewFileSelect');
  await mobilePicker.selectOption({label: image.name});
  assert.ok(await page.locator('#mobileSaveButton').isEnabled());
  await mobilePicker.selectOption({label: 'second.png'});

  await page.setViewportSize({width: 1360, height: 900});
  await page.locator('#compressPendingButton').click();
  await waitForIdle(2);
  assert.equal(await page.locator('.file-status.waiting').count(), 2);
  assert.match(await page.locator('#outputSizeValue').innerText(), /JPEG/);
  const secondUrl = await preview.getAttribute('src');
  await page.setViewportSize({width: 390, height: 844});
  await page.locator('#mobileProcessButton').click();
  await waitForIdle(4);
  assert.equal(await preview.getAttribute('src'), secondUrl);
  await rows.first().click();
  assert.equal(await preview.getAttribute('src'), originalUrl);
  await page.setViewportSize({width: 1360, height: 900});
  assert.deepEqual(await downloadOutput(), first);
});
test('cancelling during an encode leaves remaining and later queued imports waiting for explicit retry', async () => {
  const image = await png();
  await pauseFirstEncode();
  await page.locator('#fileInput').setInputFiles([image, {...image, name: 'second.png'}]);
  await page.waitForFunction(() => typeof window.resumeEncode === 'function');
  await page.locator('#fileInput').setInputFiles({...image, name: 'third.png'});
  await page.locator('#cancelButton').click();
  await page.evaluate(() => window.resumeEncode());
  await waitForIdle(1);
  assert.equal(await page.locator('.file-status.waiting').count(), 2);
  await page.locator('.file-row').nth(1).click();
  await page.locator('#fileOptions summary').click();
  await page.locator('#removeSelectedButton').click();
  await page.locator('#confirmOkButton').click();
  assert.equal(await page.locator('.file-row').count(), 2);
  await openSettings();
  await page.locator('#smartOptimizeButton').click();
  await waitForIdle(2);
});
test('files appended during automatic compression keep the settings from each import', async () => {
  const image = await png();
  await openSettings();
  await page.locator('[data-preset="convert"]').click();
  await page.locator('.advanced-settings summary').click();
  await page.locator('[data-format="image/png"]').click();
  await page.locator('#resizeMode').selectOption('width');
  const setWidth = async width => {
    await page.locator('#resizeValue').fill(String(width));
    await page.locator('#resizeValue').press('Tab');
    await page.locator('#closeSettingsButton').click();
  };
  await setWidth(300);
  await pauseFirstEncode();
  await page.locator('#fileInput').setInputFiles(image);
  await page.waitForFunction(() => typeof window.resumeEncode === 'function');
  await openSettings();
  await setWidth(150);
  await page.locator('#fileInput').setInputFiles({...image, name: 'appended.png'});
  await openSettings();
  await setWidth(90);
  await page.evaluate(() => window.resumeEncode());
  await waitForIdle(2);
  assert.equal(await page.locator('#dimensionValue').textContent(), '300 × 200');
  await page.locator('.file-row').nth(1).click();
  assert.equal(await page.locator('#dimensionValue').textContent(), '150 × 100');
});
test('a new import waits for an active manual conversion and then uses Smart Optimize', async () => {
  await page.locator('#autoCompressInput').uncheck();
  const image = await png();
  await page.locator('#fileInput').setInputFiles(image);
  assert.ok(await page.locator('.file-status.waiting').isVisible());
  await openSettings();
  await pauseFirstEncode();
  await page.locator('#processButton').click();
  await page.waitForFunction(() => typeof window.resumeEncode === 'function');
  await page.locator('#autoCompressInput').check();
  await page.locator('#fileInput').setInputFiles({...image, name: 'automatic.png'});
  await page.evaluate(() => window.resumeEncode());
  await waitForIdle(2);
  assert.ok(await page.locator('#optimizationNote').evaluate(el => el.hidden));
  await page.locator('.file-row').nth(1).click();
  assert.equal(await page.locator('#optimizationNote').evaluate(el => el.hidden), false);
});
test('an automatic mixed batch announces actual successes and failures', async () => {
  await page.locator('#fileInput').setInputFiles([await png(), damaged]);
  await page.waitForFunction(() => document.querySelector('.file-status.error') && !document.querySelector('#smartOptimizeButton').disabled);
  assert.match(await page.locator('#toast').innerText(), /1枚成功.*1枚失敗/);
  await page.locator('#languageButton').click();
  assert.match(await page.locator('#batchSummary').innerText(), /1 succeeded.*1 failed/);
});

test('the mobile results shortcut reaches a finished image after a long mixed batch', async () => {
  await page.locator('#autoCompressInput').uncheck();
  await page.setViewportSize({ width: 320, height: 568 });
  const good = await png();
  await page.locator('#fileInput').setInputFiles([damaged, ...Array.from({ length: 19 }, (_, i) => ({ ...good, name: i + '.png' }))]);
  await page.locator('#mobileProcessButton').click();
  await page.waitForFunction(() => document.querySelectorAll('.file-status.done').length === 19 && !document.querySelector('#mobileProcessButton').disabled, null, { timeout: 60000 });
  assert.ok(await page.getByRole('button', { name: '結果を見る' }).isVisible());
  await page.locator('#languageButton').click();
  const shortcut = page.getByRole('button', { name: 'View results' });
  await shortcut.click();
  const stage = await page.locator('#previewStage').boundingBox();
  assert.ok(stage.y >= 0 && stage.y < 350, 'preview within phone viewport');
  assert.ok(await page.locator('#saveCard').isVisible());
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
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
  await page.locator('#outputDetails summary').click();
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
