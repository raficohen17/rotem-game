import test from 'node:test';
import assert from 'node:assert/strict';

import {
  itemBounds, boundsContain, drawOrder, hitTest, clampScale, clampToRoom,
  MIN_SCALE, MAX_SCALE,
} from '../js/model/geometry.js';
import { placeItem } from '../js/model/world.js';

const DEFS = {
  sofa: { w: 340, h: 155, surface: 'floor' },
  lamp: { w: 120, h: 330, surface: 'floor' },
  picture: { w: 140, h: 120, surface: 'wall' },
};
const lookup = (id) => DEFS[id];

test('an item grows upward from the baseline it stands on', () => {
  const bounds = itemBounds({ x: 600, y: 450, scale: 1 }, DEFS.sofa);
  assert.equal(bounds.bottom, 450);
  assert.equal(bounds.top, 450 - 155);
  assert.equal(bounds.left, 600 - 170);
  assert.equal(bounds.right, 600 + 170);
});

test('scale grows the box around the same footprint', () => {
  const bounds = itemBounds({ x: 600, y: 450, scale: 2 }, DEFS.sofa);
  assert.equal(bounds.bottom, 450, 'still standing on the floor');
  assert.equal(bounds.w, 680);
  assert.equal(bounds.h, 310);
});

test('a point is inside the box only when it really is', () => {
  const bounds = itemBounds({ x: 100, y: 200, scale: 1 }, DEFS.sofa);
  assert.equal(boundsContain(bounds, 100, 150), true);
  assert.equal(boundsContain(bounds, 100, 260), false, 'below the baseline');
  assert.equal(boundsContain(bounds, 400, 150), false, 'off to the side');
});

test('lower on the floor draws in front', () => {
  const back = placeItem('sofa', 300, 400);
  const front = placeItem('sofa', 320, 460);

  const ordered = drawOrder([front, back], lookup);
  assert.deepEqual(ordered.map((i) => i.y), [400, 460]);
});

test('wall items draw behind everything standing on the floor', () => {
  const picture = placeItem('picture', 300, 200);
  const sofa = placeItem('sofa', 300, 300);

  // The sofa's baseline is lower on the page than the picture's, which alone
  // would put the picture in front; being wall-mounted has to win.
  const ordered = drawOrder([sofa, picture], lookup);
  assert.equal(ordered[0].item, 'picture');
});

test('an item brought to the front beats a lower baseline', () => {
  const back = placeItem('sofa', 300, 400);
  const front = placeItem('sofa', 300, 460);
  back.z = 1;

  const ordered = drawOrder([back, front], lookup);
  assert.equal(ordered.at(-1), back);
});

test('items on the same baseline keep a stable order', () => {
  const first = placeItem('sofa', 300, 400);
  const second = placeItem('sofa', 310, 400);
  assert.deepEqual(drawOrder([first, second], lookup), [first, second]);
});

test('tapping overlapping items picks the frontmost', () => {
  const back = placeItem('sofa', 300, 400);
  const middle = placeItem('sofa', 300, 430);
  const front = placeItem('sofa', 300, 460);

  assert.equal(hitTest([back, middle, front], lookup, 300, 390), front);
});

test('tapping empty floor selects nothing', () => {
  assert.equal(hitTest([placeItem('sofa', 300, 400)], lookup, 900, 400), null);
});

test('an item whose catalog entry has gone is skipped rather than crashing', () => {
  const missing = placeItem('unicorn', 300, 400);
  const real = placeItem('sofa', 300, 400);
  assert.equal(hitTest([missing, real], lookup, 300, 380), real);
});

test('scale stops at both ends so nothing becomes ungrabbable', () => {
  assert.equal(clampScale(0.01), MIN_SCALE);
  assert.equal(clampScale(99), MAX_SCALE);
  assert.equal(clampScale(1.2), 1.2);
});

test('dragging past the wall stops at the edge', () => {
  const room = { left: 0, top: 100, right: 1200, bottom: 520 };
  assert.deepEqual(clampToRoom(-500, 300, room), { x: 0, y: 300 });
  assert.deepEqual(clampToRoom(9000, 300, room), { x: 1200, y: 300 });
  assert.deepEqual(clampToRoom(600, 9000, room), { x: 600, y: 520 });
  assert.deepEqual(clampToRoom(600, 0, room), { x: 600, y: 100 });
});
