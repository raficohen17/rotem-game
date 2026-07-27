import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { cellBox, PICK_W } from '../js/scenes/house.js';
import { HOUSE_LAYOUT } from '../js/model/world.js';
import { routeBetween } from '../js/model/travel.js';
import { SCREEN, TOUCH } from '../js/ui/widgets.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(ROOT, 'js/scenes/house.js'), 'utf8');

/* Pixel landscape, matching test/phone.test.js. */
const PHONE = Math.min(915 / SCREEN.w, 412 / SCREEN.h);
const onScreen = (n) => n * PHONE;
const MIN_TAP = 40;
const MIN_TEXT = 11;

test('the walk hint is drawn on the screen', () => {
  // It was placed at BODY.y + BODY.h + 46 = 726 on a 720-tall canvas, so the
  // only thing telling Rotem the walk gesture was armed rendered off the
  // bottom edge and the feature looked dead.
  const y = number(/const y = (\d+);\n\n  fillRR/, 'the hint y');
  const h = number(/const h = (\d+);\n  const x = 640/, 'the hint height');
  assert.ok(y >= 0, 'the hint starts on screen');
  assert.ok(y + h <= SCREEN.h, `the hint ends at ${y + h} on a ${SCREEN.h}-tall canvas`);
});

test('the walk hint is readable on the phone', () => {
  const font = number(/ctx\.font = '600 (\d+)px system-ui, sans-serif';\n  const w = ctx\.measureText/, 'the hint font');
  assert.ok(onScreen(font) >= MIN_TEXT, `${onScreen(font).toFixed(1)}px`);
});

test('the walk hint clears the roof and the house name', () => {
  const y = number(/const y = (\d+);\n\n  fillRR/, 'the hint y');
  const h = number(/const h = (\d+);\n  const x = 640/, 'the hint height');
  const bodyY = number(/BODY\.y = (\d+);/, 'BODY.y');
  const roofHeight = number(/const ROOF_HEIGHT = (\d+);/, 'ROOF_HEIGHT');
  assert.ok(y + h <= bodyY - roofHeight, 'the pill sits above the roof apex');
});

test('every room in the house is on the screen', () => {
  for (let i = 0; i < HOUSE_LAYOUT.length; i += 1) {
    const box = cellBox(i);
    assert.ok(box.x >= 0 && box.y >= 0, `room ${i} starts on screen`);
    assert.ok(box.x + box.w <= SCREEN.w, `room ${i} ends within the width`);
    assert.ok(box.y + box.h <= SCREEN.h, `room ${i} ends within the height`);
  }
});

test('a walk button lands inside its room and is big enough to hit', () => {
  assert.ok(onScreen(TOUCH) >= MIN_TAP, `a walk button is ${onScreen(TOUCH).toFixed(1)}px`);
  for (let i = 0; i < HOUSE_LAYOUT.length; i += 1) {
    const box = cellBox(i);
    const x = box.x + box.w / 2 - TOUCH / 2;
    const y = box.y + box.h / 2 - TOUCH / 2;
    assert.ok(x >= box.x && x + TOUCH <= box.x + box.w, `room ${i} is wide enough for the button`);
    assert.ok(y >= box.y && y + TOUCH <= box.y + box.h, `room ${i} is tall enough for the button`);
  }
});

test('no two walk buttons overlap', () => {
  const boxes = HOUSE_LAYOUT.map((id, i) => {
    const box = cellBox(i);
    return { x: box.x + box.w / 2 - TOUCH / 2, y: box.y + box.h / 2 - TOUCH / 2 };
  });
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const apart = Math.abs(boxes[i].x - boxes[j].x) >= TOUCH
        || Math.abs(boxes[i].y - boxes[j].y) >= TOUCH;
      assert.ok(apart, `walk buttons ${i} and ${j} are clear of each other`);
    }
  }
});

test('every room can be walked to from every other', () => {
  // A button is only offered where there is a route, so an unreachable room
  // would silently lose its button rather than fail loudly.
  for (const from of HOUSE_LAYOUT) {
    for (const to of HOUSE_LAYOUT) {
      if (from === to) continue;
      const route = routeBetween(from, to);
      assert.ok(route?.length, `${from} reaches ${to}`);
    }
  }
});

test('the pick-up outline is drawn outside the room transform', () => {
  // Drawn inside the cell it was scaled by CELL_SCALE (0.43), which turned a
  // 7px ring into a 3px thread — invisible on the phone.
  const restore = source.indexOf('ctx.restore();\n\n        drawRecess');
  const outline = source.indexOf('drawPickedUp(ctx, box, traveller)');
  assert.ok(restore > 0 && outline > restore,
    'drawPickedUp runs after the cell transform is restored');
});

function number(pattern, what) {
  const match = source.match(pattern);
  assert.ok(match, `found ${what}`);
  return Number(match[1]);
}

test('a character is wide enough to aim at in the cutaway', () => {
  // She is drawn at CELL_SCALE, so her own 150px width comes out at 37px on
  // the phone — under the floor. The pick reach is widened to compensate.
  assert.ok(onScreen(PICK_W) >= MIN_TAP, `she is ${onScreen(PICK_W).toFixed(1)}px wide to tap`);
});

test('picking a character up does not swallow the room next door', () => {
  const box = cellBox(0);
  assert.ok(PICK_W < box.w / 2, `a ${PICK_W}px reach inside a ${box.w}px room`);
});
