import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const main = readFileSync(join(ROOT, 'js/main.js'), 'utf8');
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');

/*
 * How a new build reaches the phone.
 *
 * Rotem was left on v35 while the site served v36. None of this is visible
 * from inside the game, and none of it can be checked by looking at a
 * screenshot, so it is pinned here instead.
 */

test('the app asks whether there is a new build', () => {
  // Registering alone only checks on a fresh navigation, and she does not
  // navigate — Android resumes the app from the switcher, which is not a load.
  assert.match(main, /registration\.update\(\)/, 'it calls update()');
});

test('it asks again when she comes back to the app', () => {
  assert.match(main, /visibilitychange/, 'it listens for the app being shown');
  assert.match(main, /visibilityState === 'visible'/, 'and only acts on becoming visible');
});

test('it does not ask on every glance at the screen', () => {
  // A deploy takes longer than the throttle, so checking harder buys nothing
  // and costs a request each time the screen wakes.
  assert.match(main, /now - lastCheck < \d+/, 'update checks are throttled');
});

test('a new worker takes over rather than waiting for every tab to close', () => {
  assert.match(sw, /skipWaiting\(\)/);
  assert.match(sw, /clients\.claim\(\)/);
});

test('the old cache is deleted when the new worker activates', () => {
  assert.match(sw, /caches\.delete/);
  assert.match(sw, /names\.filter/, 'every cache that is not the current one');
});

test('the reload happens once, not in a loop', () => {
  assert.match(main, /if \(reloading\) return;/, 'guarded against firing twice');
});

test('what she was doing is saved before the reload', () => {
  // The save is throttled, so it can be a moment behind — and a reload would
  // take that moment with it.
  const handler = main.slice(main.indexOf("addEventListener('controllerchange'"));
  const persistAt = handler.indexOf('game.persist()');
  const reloadAt = handler.indexOf('location.reload()');
  assert.ok(persistAt > 0, 'it saves');
  assert.ok(reloadAt > 0, 'it reloads');
  assert.ok(persistAt < reloadAt, 'and saves before reloading, not after');
});

test('the worker is left off during development', () => {
  // Caching locally serves every edit stale until the version is bumped.
  assert.match(main, /IS_LOCAL/);
  assert.match(main, /unregister\(\)/, 'and any worker from an earlier run is removed');
});
