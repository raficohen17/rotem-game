import test from 'node:test';
import assert from 'node:assert/strict';

import {
  itemBounds, boundsContain, drawOrder, hitTest, clampScale, clampToRoom,
  findSurface, MIN_SCALE, MAX_SCALE,
} from '../js/model/geometry.js';
import { placeItem, ROOM_IDS } from '../js/model/world.js';
import {
  routeBetween, planWalk, beginWalk, stepWalk, isWalking,
} from '../js/model/travel.js';

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

test('an item dropped onto a table stands on it and draws in front', () => {
  // The fish-tank-on-a-table case: without this the tank keeps a baseline
  // above the table's and therefore renders behind it.
  const defs = { table: { w: 300, h: 145 }, tank: { w: 200, h: 145 } };
  const lookupTwo = (id) => defs[id];

  const table = placeItem('table', 600, 480);
  const tank = placeItem('tank', 600, 340);

  const host = findSurface(tank, [table], lookupTwo, 600, 340, defs.tank);
  assert.ok(host, 'the table is found as a surface');
  assert.equal(host.top, 480 - 145, 'its top is the table top');

  tank.y = host.top;
  tank.z = (host.item.z ?? 0) + 1;
  const ordered = drawOrder([table, tank], lookupTwo);
  assert.equal(ordered.at(-1), tank, 'the tank draws in front of the table');
});

test('a drop onto open floor finds no surface', () => {
  const defs = { table: { w: 300, h: 145 }, tank: { w: 200, h: 145 } };
  const lookupTwo = (id) => defs[id];
  const table = placeItem('table', 200, 480);
  const tank = placeItem('tank', 900, 500);

  assert.equal(findSurface(tank, [table], lookupTwo, 900, 500, defs.tank), null);
});

test('a drop well above a table does not snap to it', () => {
  const defs = { table: { w: 300, h: 145 }, tank: { w: 200, h: 145 } };
  const lookupTwo = (id) => defs[id];
  const table = placeItem('table', 600, 480);
  const tank = placeItem('tank', 600, 200);

  assert.equal(findSurface(tank, [table], lookupTwo, 600, 200, defs.tank), null,
    'out of reach of the surface');
});

test('an item never stands on itself, or on a wall item', () => {
  const defs = { table: { w: 300, h: 145 }, poster: { w: 140, h: 120, surface: 'wall' } };
  const lookupTwo = (id) => defs[id];
  const table = placeItem('table', 600, 480);
  const poster = placeItem('poster', 600, 300);

  assert.equal(findSurface(table, [table], lookupTwo, 600, 480, defs.table), null, 'not itself');
  assert.equal(findSurface(table, [poster], lookupTwo, 600, 300, defs.table), null, 'not a wall item');
});

test('stacking picks the highest surface under the finger', () => {
  const defs = { table: { w: 300, h: 145 }, box: { w: 120, h: 80 }, lamp: { w: 60, h: 60 } };
  const lookupTwo = (id) => defs[id];
  const table = placeItem('table', 600, 480);
  const box = placeItem('box', 600, 335); // standing on the table

  const host = findSurface(placeItem('lamp', 600, 255), [table, box], lookupTwo, 600, 255, defs.lamp);
  assert.equal(host.item, box, 'lands on the box, not the table below it');
});

test('a wide item overlapping the edge of a cupboard still lands on it', () => {
  // The television case: its centre sits just past the cupboard's left edge,
  // but most of a player would call that "on the cupboard".
  const defs = { cupboard: { w: 220, h: 180 }, tv: { w: 280, h: 190 } };
  const lookupTwo = (id) => defs[id];
  const cupboard = placeItem('cupboard', 700, 480);
  const tv = placeItem('tv', 560, 300);

  const host = findSurface(tv, [cupboard], lookupTwo, 560, 300, defs.tv);
  assert.ok(host, 'overlapping footprints are enough');
  assert.equal(host.item, cupboard);
});

test('an item merely brushing a surface does not snap to it', () => {
  const defs = { cupboard: { w: 220, h: 180 }, tv: { w: 280, h: 190 } };
  const lookupTwo = (id) => defs[id];
  const cupboard = placeItem('cupboard', 700, 480);

  // Far enough left that only a sliver overlaps.
  const host = findSurface(placeItem('tv', 380, 300), [cupboard], lookupTwo, 380, 300, defs.tv);
  assert.equal(host, null);
});

// --- travel between rooms -------------------------------------------------

test('rooms on one floor are one doorway apart', () => {
  assert.deepEqual(routeBetween('bedroom', 'bath'), ['bedroom', 'bath']);
  assert.deepEqual(routeBetween('living', 'kitchen'), ['living', 'kitchen']);
});

test('crossing floors goes through the stairs', () => {
  assert.deepEqual(routeBetween('bath', 'kitchen'), ['bath', 'kitchen']);
});

test('the far diagonal takes a door, the stairs, then a door', () => {
  // Bedroom is top-left and living is bottom-left, and the stairs are on the
  // right — so the only route is the long way round.
  assert.deepEqual(routeBetween('bedroom', 'living'),
    ['bedroom', 'bath', 'kitchen', 'living']);
});

test('every room can reach every other room', () => {
  for (const from of ROOM_IDS) {
    for (const to of ROOM_IDS) {
      assert.ok(routeBetween(from, to), `${from} -> ${to} is reachable`);
    }
  }
});

test('a walk plan leaves each room by the right exit', () => {
  const legs = planWalk('bedroom', 'living', 300, 1200);
  assert.deepEqual(legs.map((l) => l.room), ['bedroom', 'bath', 'kitchen', 'living']);
  assert.deepEqual(legs.map((l) => l.exit), ['door', 'stair', 'door', null]);
  assert.equal(legs.at(-1).x, 300, 'the last leg walks to where she was sent');
});

test('walking within one room is a single leg', () => {
  const legs = planWalk('bath', 'bath', 400, 1200);
  assert.deepEqual(legs, [{ room: 'bath', x: 400, exit: null }]);
});

test('a walk advances, changes room at the door, and finishes', () => {
  const her = { room: 'bedroom', x: 200, y: 500 };
  assert.equal(beginWalk(her, 'bath', 300, 1200), true);

  // Generous enough to cross both rooms: a room is 1200 wide and a frame
  // covers four units, so a short loop would time out before she arrived.
  for (let i = 0; i < 2000 && isWalking(her); i += 1) stepWalk(her, 1 / 60, 1200);

  assert.equal(her.room, 'bath', 'she arrived in the other room');
  assert.equal(her.x, 300, 'and stopped where she was sent');
  assert.equal(isWalking(her), false);
});

test('a walk to an unknown room is refused rather than hanging', () => {
  const her = { room: 'bedroom', x: 200 };
  assert.equal(beginWalk(her, 'attic', 300, 1200), false);
  assert.equal(isWalking(her), false);
});
