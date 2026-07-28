import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  CAT_PART_COUNTS, CAT_PARTS, CAT_LOOKS, COAT_COLORS,
  createCatSpec, clampCatSpec, applyCatLook, countCats,
} from '../js/model/cat.js';
import {
  PERCHES, SETTLE_MIN, SETTLE_MAX, STAY_CHANCE,
  isDue, nextDecisionAt, chooseSpot, stepCat, isPerch, setDown, perchLevel,
} from '../js/model/catlife.js';
import { createWorld, repairWorld, placeItem, placeCat } from '../js/model/world.js';
import { ICONS } from '../js/ui/icons.js';
import { createRoomScene } from '../js/scenes/room.js';
import { stubGame } from './helpers/stubs.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'assets/catalog.json'), 'utf8'));
const lookup = (id) => catalog.items.find((i) => i.id === id);

/* ------------------------------------------------------------- the parts */

test('a cat is stored as indices, never as colours', () => {
  const spec = createCatSpec();
  for (const value of Object.values(spec)) {
    assert.equal(Number.isInteger(value), true, `${value} is an index`);
  }
});

test('every part index is in range and out-of-range falls back', () => {
  const junk = clampCatSpec({ coat: 99, ears: -1, tail: 'long', collar: 2 });
  for (const [key, count] of Object.entries(CAT_PART_COUNTS)) {
    assert.ok(junk[key] >= 0 && junk[key] < count, `${key} is in range`);
  }
  assert.equal(junk.collar, 2, 'the one valid value is kept');
});

test('a cat made of nothing is still a cat', () => {
  for (const junk of [null, undefined, 42, 'tabby', []]) {
    assert.deepEqual(clampCatSpec(junk), createCatSpec(), `${JSON.stringify(junk)}`);
  }
});

test('every cat part has an icon that exists', () => {
  for (const part of CAT_PARTS) {
    assert.ok(typeof ICONS[part.icon] === 'function', `${part.key} uses a real icon`);
  }
});

test('whole cats set every part they name', () => {
  for (const look of CAT_LOOKS) {
    const applied = applyCatLook(createCatSpec(), look.id);
    for (const [key, value] of Object.entries(look.spec)) {
      assert.equal(applied[key], value, `${look.id} sets ${key}`);
    }
  }
});

test('a whole cat names only real options', () => {
  for (const look of CAT_LOOKS) {
    const clamped = clampCatSpec(look.spec);
    assert.deepEqual(clamped, look.spec, `${look.id} is entirely in range`);
  }
});

test('there are plenty of cats to make', () => {
  assert.ok(countCats() > 100000, `${countCats().toLocaleString()} cats`);
});

/* -------------------------------------------------------------- the life */

test('every perch is a real catalog item', () => {
  const ids = new Set(catalog.items.map((i) => i.id));
  for (const id of PERCHES) assert.ok(ids.has(id), `${id} is a catalog item`);
});

test('a cat gets on the furniture but not on the cooker', () => {
  assert.equal(isPerch(placeItem('sofa', 100, 470)), true);
  assert.equal(isPerch(placeItem('table_dining', 100, 470)), true);
  assert.equal(isPerch(placeItem('cat_bed', 100, 470)), true);
  // A cat on the hob is a joke that stops being funny the second time.
  assert.equal(isPerch(placeItem('stove', 100, 470)), false);
  assert.equal(isPerch(placeItem('toilet', 100, 470)), false);
  assert.equal(isPerch(null), false);
});

test('a cat that is not due does nothing at all', () => {
  // The whole performance argument: on a frame where nothing is due this is
  // one comparison and an early return.
  const cat = { x: 100, y: 470, dueAt: 500 };
  const before = JSON.stringify(cat);
  let looked = 0;
  const items = [placeItem('sofa', 300, 470)];
  assert.equal(stepCat(cat, items, (id) => { looked += 1; return lookup(id); }, 100), false);
  assert.equal(JSON.stringify(cat), before, 'nothing changed');
  assert.equal(looked, 0, 'it did not even look at the room');
});

test('a cat with no plan thinks on the next frame', () => {
  assert.equal(isDue({ x: 0, y: 0 }, 0), true, 'a new cat decides straight away');
  assert.equal(isDue({ dueAt: 10 }, 9.9), false);
  assert.equal(isDue({ dueAt: 10 }, 10), true);
});

test('a cat settles for about a minute', () => {
  assert.ok(SETTLE_MIN >= 30, `${SETTLE_MIN}s is not pacing`);
  assert.equal(nextDecisionAt(0, 0), SETTLE_MIN);
  assert.equal(nextDecisionAt(0, 1), SETTLE_MAX);
  assert.equal(nextDecisionAt(100, 0.5), 100 + (SETTLE_MIN + SETTLE_MAX) / 2);
});

test('cats do not all move at the same instant', () => {
  // A fixed interval reads as a scripted event rather than as animals.
  assert.notEqual(nextDecisionAt(0, 0.1), nextDecisionAt(0, 0.9));
});

test('staying put is a real answer', () => {
  // A cat that always moves when asked is a cat that never settles.
  const items = [placeItem('sofa', 300, 470)];
  const stay = chooseSpot(items, lookup, () => STAY_CHANCE / 2);
  assert.equal(stay, null, 'it thought about it and stayed');
});

test('a cat chooses the top of something it could sit on', () => {
  const sofa = placeItem('sofa', 300, 470);
  const spot = chooseSpot([sofa], lookup, seq([0.9, 0]));
  assert.ok(spot, 'it picked somewhere');
  assert.equal(spot.item, sofa);
  assert.equal(spot.x, sofa.x);
  assert.ok(spot.y < sofa.y, 'it is on top of the sofa, not inside it');
});

test('a cat curls up in its own bed and sits on a table', () => {
  const bed = placeItem('cat_bed', 300, 470);
  const table = placeItem('table_dining', 300, 470);
  assert.equal(chooseSpot([bed], lookup, seq([0.9, 0])).pose, 'curl');
  assert.equal(chooseSpot([table], lookup, seq([0.9, 0])).pose, 'sit');
});

test('an empty room leaves the cat where it is', () => {
  assert.equal(chooseSpot([], lookup, seq([0.9, 0])), null);
  // And a room with nothing worth sitting on.
  assert.equal(chooseSpot([placeItem('stove', 100, 470)], lookup, seq([0.9, 0])), null);
});

test('a cat only ever looks at its own room', () => {
  // Bounded work: the decision considers the items it was handed and nothing
  // else, so a house with four full rooms costs the same as one.
  const mine = [placeItem('sofa', 300, 470)];
  const spot = chooseSpot(mine, lookup, seq([0.9, 0]));
  assert.equal(spot.item, mine[0]);
});

test('putting a cat down clears what it was on', () => {
  const cat = placeCat(createCatSpec(), 'bedroom', 300, 200);
  cat.on = 'something';
  cat.pose = 'curl';
  setDown(cat, 470);
  assert.equal(cat.y, 470);
  assert.equal(cat.pose, 'stand');
  assert.equal('on' in cat, false);
});

/* ---------------------------------------------------------- in the world */

test('a new world has room for cats and none in it', () => {
  assert.deepEqual(createWorld('House 1').cats, []);
});

test('a world saved before cats existed loads with none', () => {
  const world = createWorld('House 1');
  delete world.cats;
  const loaded = repairWorld(JSON.parse(JSON.stringify(world)));
  assert.deepEqual(loaded.cats, [], 'no cats, and nothing else disturbed');
  assert.equal(Object.keys(loaded.rooms).length, 4);
});

test('a cat survives being closed and reopened', () => {
  const world = createWorld('House 1');
  const cat = placeCat({ ...createCatSpec(), coat: 5, collar: 2 }, 'kitchen', 640, 400);
  cat.pose = 'curl';
  cat.dueAt = 123;
  world.cats.push(cat);

  const loaded = repairWorld(JSON.parse(JSON.stringify(world)));
  const back = loaded.cats[0];
  assert.equal(back.room, 'kitchen');
  assert.equal(back.spec.coat, 5);
  assert.equal(back.spec.collar, 2);
  assert.equal(back.pose, 'curl');
  assert.equal(back.dueAt, 123);
});

test('a corrupt cat is repaired rather than trusted', () => {
  const world = createWorld('House 1');
  world.cats.push({ spec: 'ginger', room: 'nowhere', x: 'left', pose: 'dancing' });
  const back = repairWorld(JSON.parse(JSON.stringify(world))).cats[0];
  assert.deepEqual(back.spec, createCatSpec());
  assert.equal(back.room, 'bedroom');
  assert.equal(Number.isFinite(back.x), true);
  assert.equal(back.pose, 'stand');
});

/** Rolls a fixed sequence, so a test decides what the cat picks. */
function seq(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

/* --------------------------------------------------- not hers to control */

test('a cat cannot be selected and offers no controls', () => {
  // The whole point of a cat is that it is not hers to move. Tapping one must
  // do nothing to it, and must not swallow the tap either.
  const game = stubGame();
  const roomId = 'bedroom';
  const scene = createRoomScene(game, roomId);
  const cat = game.catsIn(roomId)[0];
  assert.ok(cat, 'there is a cat to tap');

  const t = { x: 20, y: 22, s: 1.033 };
  scene.onPointerDown(t.x + cat.x * t.s, t.y + (cat.y - 20) * t.s);
  scene.onPointerUp(t.x + cat.x * t.s, t.y + (cat.y - 20) * t.s);

  const controls = scene.allControls();
  const aboutTheCat = controls.filter((c) => c.character === cat || c.item === cat);
  assert.deepEqual(aboutTheCat, [], 'nothing appeared for the cat');
  for (const id of ['edit', 'use', 'stop', 'flick', 'shrink', 'grow', 'delete']) {
    assert.equal(controls.some((c) => c.id === id), false, `no ${id} button`);
  }
});

test('a cat is not something a character can be sent to or use', () => {
  // Cats are not in the room's item list at all, so they cannot turn up among
  // the things a character is offered.
  const game = stubGame();
  const items = game.world.rooms.bedroom.items;
  const cats = game.catsIn('bedroom');
  for (const cat of cats) {
    assert.equal(items.includes(cat), false, 'a cat is not furniture');
  }
});

test('a cat rests on the seat, not on top of the backrest', () => {
  // A sofa's box includes its back, so the top of it is thin air above the
  // cushions — which is exactly where the cat first sat.
  const sofa = placeItem('sofa', 300, 470);
  const def = lookup('sofa');
  const spot = chooseSpot([sofa], lookup, seq([0.9, 0]));

  const boxTop = sofa.y - def.h;
  assert.ok(spot.y > boxTop, 'below the top of the sofa');
  assert.ok(spot.y < sofa.y, 'and above the floor');
  assert.ok(perchLevel('sofa') < 0.6, 'about half way up, where the cushions are');
});

test('a cat on a table is on the table top', () => {
  // The other way round: a table's top is its surface, so the cat goes on it.
  const table = placeItem('table_dining', 300, 470);
  const def = lookup('table_dining');
  const spot = chooseSpot([table], lookup, seq([0.9, 0]));
  assert.equal(Math.round(spot.y), Math.round(table.y - def.h));
});

test('every perch says how far up it a cat sits', () => {
  for (const id of PERCHES) {
    const level = perchLevel(id);
    assert.ok(level >= 0 && level <= 1, `${id} rests a cat at ${level}`);
  }
});

test('a cat on a rug is on the floor', () => {
  assert.equal(perchLevel('rug_round'), 0, 'a rug is a place, not a climb');
});
