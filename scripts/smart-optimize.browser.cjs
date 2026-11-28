'use strict';
const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, firefox, webkit } = require('playwright');

const artifact = pathToFileURL(path.resolve(__dirname, '..', process.env.IMAGE_SOURCE || 'dist/index.html')).href;
let browser;
before(async () => {
  const engine = { chromium, firefox, webkit }[process.env.BROWSER_ENGINE || 'chromium'];
  browser = await engine.launch(engine === chromium ? {executablePath: process.env.CHROMIUM_PATH} : {});
});
after(async () => browser?.close());

async function openImage(t, {noise = false, alpha = false, noWebP = false, edge = 128} = {}) {
  const page = await browser.newPage({locale: 'en', viewport: {width: 1360, height: 900}});
  t.after(() => page.context().close());
  if (noWebP) {
    // An encoder that does not support a requested MIME type returns PNG.
    await page.addInitScript(() => {
      const native = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
        return native.call(this, type === 'image/webp' ? 'image/png' : type, quality);
      };
    });
  }
  await page.goto(artifact);
  await page.locator('#autoCompressInput').uncheck();
  const data = await page.evaluate(({noise, alpha, edge}) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = edge;
    const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(edge, edge);
    let seed = 12;
    for (let i = 0; i < pixels.data.length; i += 4) {
      for (let channel = 0; channel < 3; channel++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        pixels.data[i + channel] = noise ? seed >>> 24 : 50;
      }
      pixels.data[i + 3] = alpha && i === 0 ? 0 : 255;
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas.toDataURL().split(',')[1];
  }, {noise, alpha, edge});
  await page.locator('#fileInput').setInputFiles({name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64')});
  await page.locator('#workspaceSettingsButton').click();
  await page.locator('[data-preset="convert"]').click();
  return page;
}

async function optimize(page) {
  await page.locator('#smartOptimizeButton').click();
  await page.waitForFunction(() => !document.querySelector('#smartOptimizeButton').disabled);
  assert.ok(await page.locator('.file-status.done').count(), await page.locator('#batchSummary').innerText());
  await page.locator('#outputDetails summary').click();
}

for (const noise of [false, true]) {
  test(noise ? 'JPEG with no candidate above the visual threshold still yields an output' :
    'Smart Optimize obeys the 20 percent JPEG quality ceiling', async t => {
    const page = await openImage(t, {noise});
    await page.locator('.advanced-settings summary').click();
    await page.locator('[data-format="image/jpeg"]').click();
    await page.locator('#qualityRange').press('Home');
    await optimize(page);
    assert.match(await page.locator('#optimizationNote').innerText(), /JPEG.*quality 20\b/i);
    if (noise) {
      const note = await page.locator('#optimizationNote').innerText();
      const score = Number(note.match(/([\d.]+)$/)[1]);
      assert.ok(score < 95, note);
    }
  });
}

for (const [alpha, format] of [[false, 'JPEG'], [true, 'PNG']]) {
  test('WebP conversion preset falls back to ' + format + ' when its encoder is unavailable', async t => {
    const page = await openImage(t, {alpha, noWebP: true});
    assert.ok(await page.locator('[data-format="image/webp"]').isDisabled());
    await optimize(page);
    assert.match(await page.locator('#outputSizeValue').innerText(), new RegExp(format));
  });
}

test('size targeting never encodes above the JPEG quality ceiling', async t => {
  const page = await openImage(t, {noise: true, edge: 256});
  await page.locator('.advanced-settings summary').click();
  await page.locator('[data-format="image/jpeg"]').click();
  await page.locator('#qualityRange').press('Home');
  await page.locator('label.switch').filter({has: page.locator('#targetToggle')}).click();
  assert.ok(await page.locator('#targetToggle').isChecked());
  await page.locator('#targetKb').fill('5');
  await page.locator('#targetKb').press('Tab');
  await page.evaluate(() => {
    const native = HTMLCanvasElement.prototype.toBlob;
    window.attemptedJpegQualities = [];
    HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
      if (type === 'image/jpeg') window.attemptedJpegQualities.push(quality);
      return native.call(this, callback, type, quality);
    };
  });
  await optimize(page);
  const qualities = await page.evaluate(() => window.attemptedJpegQualities);
  assert.ok(qualities.length > 1 && qualities.every(value => value <= 0.2), qualities.join(', '));
});
