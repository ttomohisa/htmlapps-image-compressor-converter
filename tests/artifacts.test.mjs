import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import test from 'node:test';
import * as harness from './app-harness.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('artifact overrides remain filesystem paths on both Windows and Unix', () => {
  assert.equal(typeof harness.appSourcePath, 'function');
  for (const path of ['C:\\work\\画像 tool\\dist\\index.html', '\\\\server\\share\\app.html', '/tmp/image tool/index.html']) assert.equal(harness.appSourcePath(path), path);
  assert.equal(harness.appSourcePath('').protocol, 'file:');
});
test('tracked root, readable and self-extract artifacts carry the exact current template', () => {
  const source = read('src/index.template.html'), release = read('dist/index.html');
  const normalize = text => text.replace(/const APP_CONFIG=.*?;/, 'const APP_CONFIG=CONFIG;').replace(/const BUILD_MANIFEST=.*?;/, 'const BUILD_MANIFEST=MANIFEST;').replace(/const EMBEDDED_ASSET_BUNDLE_BASE64=.*?;/, 'const EMBEDDED_ASSET_BUNDLE_BASE64=BUNDLE;');
  assert.equal(normalize(release), normalize(source));
  assert.equal(read('image-compressor-converter.html'), release);
  const encoded = read('dist/index.self-extract.html').match(/atob\('([^']+)'\)/)?.[1]; assert.ok(encoded, 'self-extract payload exists');
  assert.equal(gunzipSync(Buffer.from(encoded, 'base64')).toString(), release);
});
