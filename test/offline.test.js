import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const swSource = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));

/** The precache list, read out of the worker itself. */
function shell() {
  const block = swSource.match(/const SHELL = \[([\s\S]*?)\];/);
  assert.ok(block, 'found the SHELL list');
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

test('every precached path is a real file', () => {
  // cache.addAll rejects as a whole if any one request fails, which fails the
  // install — so a single typo here means no offline support at all, silently.
  for (const path of shell()) {
    if (path === '.') continue; // the directory itself, served as index.html
    assert.ok(existsSync(join(ROOT, path)), `${path} exists`);
  }
});

test('the shell can actually start the app', () => {
  const needed = ['index.html', 'js/main.js', 'css/style.css'];
  const precached = shell();
  for (const path of needed) {
    assert.ok(precached.includes(path), `${path} is precached`);
  }
});

test('every manifest icon is precached', () => {
  // The page never requests these, so the fetch handler never caches them on
  // the way past. Installing offline without them shows a blank icon.
  const precached = shell();
  const icons = new Set((manifest.icons ?? []).map((i) => i.src.replace(/^\.?\//, '')));
  assert.ok(icons.size > 0, 'the manifest declares icons');
  for (const src of icons) {
    assert.ok(precached.includes(src), `${src} is precached`);
  }
});

test('the manifest points at files that exist', () => {
  for (const icon of manifest.icons ?? []) {
    assert.ok(existsSync(join(ROOT, icon.src.replace(/^\.?\//, ''))), `${icon.src} exists`);
  }
});

test('the worker still deletes caches from older versions', () => {
  // Without this the first cached copy wins forever and no deploy ever
  // reaches her, which is the whole reason the cache name carries a version.
  assert.match(swSource, /caches\.delete/, 'activate deletes stale caches');
  assert.match(swSource, /names\.filter\(\(n\) => n !== CACHE_NAME\)/, 'and keeps the current one');
});

test('a navigation offline falls back to the cached shell', () => {
  // Otherwise opening the installed app with no network shows the browser's
  // dinosaur rather than the game.
  assert.match(swSource, /request\.mode === 'navigate'/, 'navigations are special-cased');
  assert.match(swSource, /caches\.match\('index\.html'\)/, 'and fall back to the shell');
});

test('the app is set up to open the way a phone game should', () => {
  assert.equal(manifest.display, 'fullscreen', 'no browser chrome');
  assert.equal(manifest.orientation, 'landscape', 'held sideways');
});
