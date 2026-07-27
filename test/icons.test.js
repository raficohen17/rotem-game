import test from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { ICONS } from '../js/ui/icons.js';
import { recordingContext } from './helpers/recorder.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCENES = join(ROOT, 'js/scenes');

/** Icons are drawn centred on the origin in a nominal 44px box. */
const BOX = 22;

/** The extent of one icon, drawn at its natural size. */
function extentOf(name) {
  const recorder = recordingContext();
  ICONS[name](recorder.ctx, '#fff');
  return recorder.bounds();
}

test('every icon draws something', () => {
  // An icon that draws nothing is an invisible button, which looks exactly
  // like a working one until it is tapped.
  for (const name of Object.keys(ICONS)) {
    const b = extentOf(name);
    assert.ok(Number.isFinite(b.minX), `${name} draws at all`);
    // Not both dimensions: a minus is a bar, and legitimately has no height.
    assert.ok(Math.max(b.maxX - b.minX, b.maxY - b.minY) >= 12, `${name} is not a speck`);
  }
});

test('no icon spills outside the box it is drawn in', () => {
  // The contract at the top of icons.js: centred on the origin, nominally
  // 44px. Callers scale from that, so an icon that quietly draws bigger
  // throws every button that uses it out.
  const TOLERANCE = 2;
  for (const name of Object.keys(ICONS)) {
    const b = extentOf(name);
    const reach = Math.max(-b.minX, -b.minY, b.maxX, b.maxY);
    assert.ok(reach <= BOX + TOLERANCE,
      `${name} reaches ${reach.toFixed(1)}px past the ${BOX}px it is allowed`);
  }
});

test('an icon fills enough of its box to be seen', () => {
  for (const name of Object.keys(ICONS)) {
    const b = extentOf(name);
    const reach = Math.max(-b.minX, -b.minY, b.maxX, b.maxY);
    assert.ok(reach >= BOX * 0.5, `${name} only reaches ${reach.toFixed(1)}px of ${BOX}`);
  }
});

test('the size controls differ by more than which pixels are filled', () => {
  // Bigger and smaller were mirrored arrow pairs twice over, and at phone size
  // "pointing out" and "pointing in" collapsed into the same two dashes. A
  // plus and a minus differ in how much ink they contain, which is what
  // survives being drawn small.
  const ink = (name) => {
    const recorder = recordingContext();
    ICONS[name](recorder.ctx, '#fff');
    return recorder.ops.length;
  };
  assert.notEqual(ink('grow'), ink('shrink'), 'grow and shrink are not the same drawing');
});

test('the layer controls point in opposite directions', () => {
  // Their difference used to be a swapped fill and a 7px arrow, which made
  // them identical on a phone. Now it is the direction of the arrow.
  const arrowEnd = (name) => {
    const recorder = recordingContext();
    ICONS[name](recorder.ctx, '#fff');
    return recorder.bounds();
  };
  const up = arrowEnd('layerUp');
  const down = arrowEnd('layerDown');
  assert.ok(Math.abs(up.minY - down.minY) < 1, 'both cover the same box');
  // The stack sits low and the arrow runs to the top in both, so the shapes
  // only differ in where the head is — check the drawings are not identical.
  const shape = (name) => {
    const recorder = recordingContext();
    ICONS[name](recorder.ctx, '#fff');
    return JSON.stringify(recorder.ops.map((o) => [o.minX, o.minY, o.maxX, o.maxY].map((n) => n.toFixed(1))));
  };
  assert.notEqual(shape('layerUp'), shape('layerDown'), 'the two are drawn differently');
});

test('every icon a scene asks for actually exists', () => {
  // drawButton silently draws nothing for an unknown name, so a typo — or an
  // icon that was never written — is an invisible button that looks and taps
  // like a working one. The shower and read buttons shipped blank this way.
  const sources = readdirSync(SCENES)
    .filter((f) => f.endsWith('.js'))
    .flatMap((f) => [readFileSync(join(SCENES, f), 'utf8')]);
  sources.push(readFileSync(join(ROOT, 'js/ui/widgets.js'), 'utf8'));

  const named = new Set();
  for (const source of sources) {
    for (const [, name] of source.matchAll(/\bicon:\s*'([a-zA-Z]+)'/g)) named.add(name);
    for (const [, name] of source.matchAll(/drawIcon\(\s*\w+,\s*'([a-zA-Z]+)'/g)) named.add(name);
    // The room builds its control rows as [id, icon] pairs.
    for (const [, name] of source.matchAll(/\['[a-zA-Z]+', '([a-zA-Z]+)'\]/g)) named.add(name);
  }

  assert.ok(named.size > 10, `found ${named.size} icon names to check`);
  for (const name of named) {
    assert.ok(typeof ICONS[name] === 'function', `"${name}" is a real icon`);
  }
});
