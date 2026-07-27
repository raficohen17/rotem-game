import test from 'node:test';
import assert from 'node:assert/strict';

import { View } from '../js/core/view.js';
import { drawRotatePrompt } from '../js/ui/rotate.js';

/** isPortrait only reads the two measurements, so it needs no DOM to check. */
const orientationOf = (cssW, cssH) => View.prototype.isPortrait.call({ cssW, cssH });

test('a phone held upright is portrait and held sideways is not', () => {
  assert.equal(orientationOf(412, 915), true, 'Pixel upright');
  assert.equal(orientationOf(915, 412), false, 'Pixel sideways');
  assert.equal(orientationOf(1280, 720), false, 'the design space itself');
  assert.equal(orientationOf(800, 800), false, 'square is not portrait');
});

/**
 * A canvas that records where things land.
 *
 * Enough of a 2D context to run the rotate screen and track the extent of
 * everything it draws, transforms included — the first version of that screen
 * sized the arc off the phone and ran its arrowhead off the right edge, which
 * is exactly the kind of thing no assertion about constants would have caught.
 */
function recordingContext() {
  let m = [1, 0, 0, 1, 0, 0]; // a b c d e f
  const stack = [];
  const seen = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

  const mul = (n) => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
  const mark = (x, y) => {
    const px = m[0] * x + m[2] * y + m[4];
    const py = m[1] * x + m[3] * y + m[5];
    seen.minX = Math.min(seen.minX, px);
    seen.maxX = Math.max(seen.maxX, px);
    seen.minY = Math.min(seen.minY, py);
    seen.maxY = Math.max(seen.maxY, py);
  };

  let font = '16px sans-serif';
  const ctx = {
    set font(value) { font = value; },
    get font() { return font; },
    fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: '',
    globalAlpha: 1, textAlign: 'left', textBaseline: 'top',

    save() { stack.push([...m]); },
    restore() { m = stack.pop() ?? m; },
    translate(x, y) { m = mul([1, 0, 0, 1, x, y]); },
    rotate(a) { m = mul([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); },

    beginPath() {}, closePath() {}, fill() {}, stroke() {},
    moveTo: mark, lineTo: mark,
    arcTo(x1, y1, x2, y2) { mark(x1, y1); mark(x2, y2); },
    arc(x, y, r, from, to) {
      // Sample the sweep rather than trusting the endpoints — the widest point
      // of an arc is usually somewhere in the middle of it.
      const steps = 24;
      for (let i = 0; i <= steps; i += 1) {
        const a = from + ((to - from) * i) / steps;
        mark(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
    },
    fillRect(x, y, w, h) { mark(x, y); mark(x + w, y + h); },
    fillText(text, x, y) {
      const size = Number(font.match(/(\d+)px/)?.[1] ?? 16);
      // Estimated high; the point is to catch text running off the screen.
      const width = text.length * size * 0.6;
      const left = ctx.textAlign === 'center' ? x - width / 2 : x;
      mark(left, y - size * 0.7);
      mark(left + width, y + size * 0.7);
    },
  };
  return { ctx, seen };
}

/** Screens the prompt has to look right on, upright and otherwise. */
const SHAPES = [
  ['Pixel upright', 412, 915],
  ['a small phone upright', 360, 640],
  ['a tall thin phone', 360, 800],
  ['a tablet upright', 768, 1024],
  ['a narrow desktop window', 500, 900],
];

test('the rotate screen stays on the screen, whatever the shape', () => {
  for (const [name, w, h] of SHAPES) {
    // Several points in the tilt, because the phone turns as it is drawn.
    for (const time of [0, 0.7, 1.4, 2.1, 2.8]) {
      const { ctx, seen } = recordingContext();
      drawRotatePrompt(ctx, w, h, time);

      assert.ok(seen.minX >= 0, `${name} at t=${time}: overflows left by ${Math.round(-seen.minX)}px`);
      assert.ok(seen.maxX <= w, `${name} at t=${time}: overflows right by ${Math.round(seen.maxX - w)}px`);
      assert.ok(seen.minY >= 0, `${name} at t=${time}: overflows the top by ${Math.round(-seen.minY)}px`);
      assert.ok(seen.maxY <= h, `${name} at t=${time}: overflows the bottom by ${Math.round(seen.maxY - h)}px`);
    }
  }
});

test('the rotate screen actually fills the space it is given', () => {
  // A prompt that draws a tiny mark in the middle of a black screen would pass
  // the bounds check above and tell her nothing.
  const [, w, h] = SHAPES[0];
  const { ctx, seen } = recordingContext();
  drawRotatePrompt(ctx, w, h, 0);

  assert.ok(seen.maxX - seen.minX >= w * 0.5, 'it uses at least half the width');
  assert.ok(seen.maxY - seen.minY >= h * 0.3, 'and a reasonable share of the height');
});

test('the words are big enough to read on the smallest phone', () => {
  const sizes = [];
  const { ctx } = recordingContext();
  const spy = new Proxy(ctx, {
    set(target, key, value) {
      if (key === 'font') sizes.push(Number(String(value).match(/(\d+)px/)?.[1] ?? 0));
      target[key] = value;
      return true;
    },
  });
  drawRotatePrompt(spy, 360, 640, 0);

  // Drawn in real screen pixels, not design pixels, so no scaling applies.
  for (const size of sizes) assert.ok(size >= 13, `${size}px is readable`);
});
