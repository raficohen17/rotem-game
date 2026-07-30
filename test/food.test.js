import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  FOODS, isFood, wholePortions, portionsLeft, hasFoodLeft, biteFrom, catEats, eatenFraction,
  putInside, takeOut, shelfSpot, isPutAway,
} from '../js/model/food.js';
import { canUse, actOnce, isInstant, useFor, isEating, CHEW_TIME } from '../js/model/using.js';
import { foodWithinReach, stepCat } from '../js/model/catlife.js';
import { createWorld, repairWorld, placeItem, placeCat, placeCharacter } from '../js/model/world.js';
import { createCatSpec } from '../js/model/cat.js';
import { createCharacterSpec } from '../js/model/character.js';
import { ICONS } from '../js/ui/icons.js';
import { PLACEHOLDERS } from '../js/render/placeholders.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'assets/catalog.json'), 'utf8'));
const lookup = (id) => catalog.items.find((i) => i.id === id);
const seq = (v) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };

/* --------------------------------------------------------------- the food */

test('every food is a real catalog item with art', () => {
  const ids = new Set(catalog.items.map((i) => i.id));
  for (const id of Object.keys(FOODS)) {
    assert.ok(ids.has(id), `${id} is in the catalog`);
    assert.ok(typeof PLACEHOLDERS[id] === 'function', `${id} can be drawn`);
  }
});

test('food is in the food drawer', () => {
  for (const id of Object.keys(FOODS)) {
    assert.equal(lookup(id).cat, 'food', `${id} is where a child would look`);
  }
});

test('food runs out, one portion at a time', () => {
  const cake = placeItem('cake', 100, 470);
  assert.equal(portionsLeft(cake), wholePortions('cake'));

  let bites = 0;
  while (hasFoodLeft(cake)) { biteFrom(cake); bites += 1; }
  assert.equal(bites, wholePortions('cake'));
  assert.equal(portionsLeft(cake), 0);
});

test('eating it changes how it looks', () => {
  const cake = placeItem('cake', 100, 470);
  assert.equal(eatenFraction(cake), 0, 'a whole cake looks whole');
  biteFrom(cake);
  assert.ok(eatenFraction(cake) > 0, 'and a cut one does not');
  while (hasFoodLeft(cake)) biteFrom(cake);
  assert.equal(eatenFraction(cake), 1);
});

test('nothing puts a portion back', () => {
  const steak = placeItem('steak', 100, 470);
  while (hasFoodLeft(steak)) biteFrom(steak);
  assert.equal(biteFrom(steak), 0, 'biting an empty plate does nothing');
  assert.equal(portionsLeft(steak), 0);
});

test('furniture is not food', () => {
  assert.equal(isFood(placeItem('sofa', 100, 470)), false);
  assert.equal(isFood(null), false);
  assert.equal(portionsLeft(placeItem('sofa', 100, 470)), 0);
});

/* ------------------------------------------------------------- the eating */

test('food is offered to eat, and only while there is some', () => {
  const cake = placeItem('cake', 100, 470);
  assert.equal(useFor('cake'), 'eat');
  assert.equal(isInstant('cake'), true, 'a bite, not an occupation');
  assert.equal(canUse(cake), true);

  while (hasFoodLeft(cake)) actOnce({}, cake);
  assert.equal(canUse(cake), false, 'an empty plate is offered to nobody');
});

test('a bite says when the plate is finished', () => {
  const steak = placeItem('steak', 100, 470);
  const results = [];
  for (let i = 0; i < wholePortions('steak'); i += 1) results.push(actOnce({}, steak));
  assert.deepEqual(results.slice(0, -1), results.slice(0, -1).map(() => false));
  assert.equal(results.at(-1), true, 'the last bite reports it is gone');
});

test('eating leaves her where she was', () => {
  // It is a bite, not somewhere she goes and has to be got out of again.
  const her = { x: 300, y: 470 };
  const cake = placeItem('cake', 300, 470);
  actOnce(her, cake);
  assert.equal(her.x, 300);
  assert.equal('using' in her, false, 'she is not occupied by it');
});

test('the eat button has an icon', () => {
  assert.equal(typeof ICONS.eat, 'function');
});

/* ------------------------------------------------------------- the fridge */

test('food in the fridge is remembered, and so is how much is left', () => {
  const world = createWorld('House 1');
  const fridge = placeItem('fridge', 640, 470);
  const cake = placeItem('cake', 640, 470);
  cake.inside = fridge.uid;
  biteFrom(cake);
  world.rooms.kitchen.items.push(fridge, cake);

  const back = repairWorld(JSON.parse(JSON.stringify(world))).rooms.kitchen.items;
  const savedCake = back.find((i) => i.item === 'cake');
  assert.equal(savedCake.inside, fridge.uid, 'still in the fridge');
  assert.equal(portionsLeft(savedCake), wholePortions('cake') - 1, 'still a slice short');
});

test('a nonsense portion count reads as a whole one', () => {
  const world = createWorld('House 1');
  const cake = placeItem('cake', 100, 470);
  world.rooms.kitchen.items.push(cake);
  for (const junk of ['half', -1, 1.5, {}]) {
    cake.left = junk;
    const back = repairWorld(JSON.parse(JSON.stringify(world))).rooms.kitchen.items[0];
    assert.equal(portionsLeft(back), wholePortions('cake'), `${JSON.stringify(junk)} is a whole cake`);
  }
});

/* ---------------------------------------------------------------- the cat */

test('a cat robs a steak and walks past a cake', () => {
  // Cats have no sweet receptor at all, which is true and is the sort of thing
  // worth putting in a game a child plays.
  assert.equal(catEats('steak'), true);
  assert.equal(catEats('cake'), false);

  const steak = placeItem('steak', 600, 470);
  const cake = placeItem('cake', 300, 470);
  assert.deepEqual(foodWithinReach([steak, cake]).map((i) => i.item), ['steak']);
});

test('a cat goes for food rather than for furniture', () => {
  const steak = placeItem('steak', 600, 470);
  const sofa = placeItem('sofa', 900, 470);
  const cat = placeCat(createCatSpec(), 'kitchen', 100, 470);

  stepCat(cat, [steak, sofa], lookup, 0, seq([0.5, 0.9]));
  assert.equal(cat.x, 600, 'it went to the steak, not the sofa');
  assert.equal(portionsLeft(steak), wholePortions('steak') - 1, 'and had some');
});

test('food in the fridge is safe from the cat', () => {
  const fridge = placeItem('fridge', 640, 470);
  const steak = placeItem('steak', 640, 470);
  steak.inside = fridge.uid;
  assert.deepEqual(foodWithinReach([fridge, steak]), [], 'nothing it can get at');
});

test('a cat goes back to the furniture once the food is gone', () => {
  const steak = placeItem('steak', 600, 470);
  while (hasFoodLeft(steak)) biteFrom(steak);
  const sofa = placeItem('sofa', 900, 470);
  const cat = placeCat(createCatSpec(), 'kitchen', 100, 470);

  stepCat(cat, [steak, sofa], lookup, 0, seq([0.5, 0.9, 0.9, 0]));
  assert.equal(cat.on, sofa.uid, 'it settled on the sofa instead');
});

test('an empty plate is drawn as an empty plate', () => {
  // The game clears food away when it is finished, but a stray save should not
  // leave a knife mark hanging in the air over nothing.
  const source = readFileSync(join(ROOT, 'js/render/catalog.js'), 'utf8');
  assert.match(source, /if \(eaten >= 1\) return;/, 'nothing is drawn on a bare plate');
});

test('the plate is drawn outside the clip, at full size', () => {
  // Clipping the food alone made a part-eaten cake read as a smaller cake:
  // nothing on screen said how big it had started.
  const source = readFileSync(join(ROOT, 'js/render/catalog.js'), 'utf8');
  const plateAt = source.indexOf("'#f2ece0'");
  const clipAt = source.indexOf('ctx.clip();', plateAt);
  assert.ok(plateAt > 0 && clipAt > plateAt, 'the plate goes down before the clip');
});

/* ------------------------------------------------- getting it out again */

test('food in the fridge is drawn where it can be grabbed', () => {
  // The drawing and the hit area have to agree, or she taps the cake she can
  // see and gets the fridge behind it.
  const fridge = placeItem('fridge', 640, 470);
  const cake = placeItem('cake', 500, 400);
  putInside(cake, fridge, lookup('fridge'));

  const spot = shelfSpot(fridge, lookup('fridge'));
  assert.equal(cake.x, spot.x, 'it is moved onto the shelf');
  assert.equal(cake.y, spot.y);
  assert.equal(cake.inside, fridge.uid);
});

test('taking it out clears the fridge from it', () => {
  const fridge = placeItem('fridge', 640, 470);
  const cake = placeItem('cake', 640, 470);
  putInside(cake, fridge, lookup('fridge'));
  takeOut(cake);
  assert.equal('inside' in cake, false, 'it is out');
});

test('a shelf spot is inside the fridge it belongs to', () => {
  const fridge = placeItem('fridge', 640, 470);
  const def = lookup('fridge');
  const spot = shelfSpot(fridge, def);
  assert.ok(Math.abs(spot.x - fridge.x) < def.w / 2, 'across the fridge');
  assert.ok(spot.y < fridge.y && spot.y > fridge.y - def.h, 'and up inside it');
});

test('a character cannot eat through a closed door', () => {
  // Food in the fridge is put away. She has to take it out first, which is the
  // whole reason the fridge is worth having.
  const fridge = placeItem('fridge', 640, 470);
  const cake = placeItem('cake', 640, 470);
  putInside(cake, fridge, lookup('fridge'));
  assert.equal(isPutAway(cake), true);
  assert.equal(isPutAway(placeItem('cake', 100, 470)), false, 'one on the floor is fair game');
});

test('the drawn shelf and the grabbable spot are the same place', () => {
  // They were worked out separately once, and drifted.
  const source = readFileSync(join(ROOT, 'js/render/room.js'), 'utf8');
  const inside = source.slice(source.indexOf('function drawInside'));
  assert.match(inside.slice(0, 900), /ctx\.translate\(placed\.x, placed\.y\)/,
    'the fridge draws food where the food says it is');
});

test('what is in the fridge travels with the fridge', () => {
  // Pushed across the room, the fridge left the cake hanging in the air where
  // it had been standing.
  const fridge = placeItem('fridge', 640, 470);
  const cake = placeItem('cake', 0, 0);
  putInside(cake, fridge, lookup('fridge'));

  fridge.x = 200;
  putInside(cake, fridge, lookup('fridge'));   // what carryContents does
  const spot = shelfSpot(fridge, lookup('fridge'));
  assert.equal(cake.x, spot.x, 'the cake went with it');
  assert.equal(cake.inside, fridge.uid, 'and is still inside');
});

/* ------------------------------------------------------ eating, visibly */

test('a bite lands at once and is shown for a moment', () => {
  // The bite itself has to be immediate, or tapping feels dead. The moment
  // afterwards is what was missing: with nothing drawn, food got quietly
  // smaller and then was not there, which reads as things disappearing.
  const her = { x: 300, y: 470 };
  const cake = placeItem('cake', 300, 470);

  actOnce(her, cake, 10);
  assert.equal(portionsLeft(cake), wholePortions('cake') - 1, 'the bite is instant');
  assert.equal(isEating(her, 10), true, 'and she is shown eating');
  assert.equal(isEating(her, 10 + CHEW_TIME + 0.1), false, 'for a moment only');
});

test('an empty plate is left behind rather than vanishing', () => {
  // Food that disappeared entirely read as a bug rather than as a meal, and a
  // plate on the table is what actually happens when you finish.
  const her = { x: 300, y: 470 };
  const cake = placeItem('cake', 300, 470);
  while (hasFoodLeft(cake)) actOnce(her, cake, 0);

  assert.equal(portionsLeft(cake), 0, 'it is finished');
  assert.equal(canUse(cake), false, 'and offered to nobody');
  // The scene no longer takes it off the table.
  const source = readFileSync(join(ROOT, 'js/scenes/room.js'), 'utf8');
  const eating = source.slice(source.indexOf("if (isInstant(item.item))"), source.indexOf("} else {", source.indexOf("if (isInstant(item.item))")));
  assert.equal(/removeItem/.test(eating), false, 'nothing is cleared away');
});

test('nobody is left frozen holding a cake', () => {
  // The chew is measured against a clock that restarts each session.
  const world = createWorld('House 1');
  const her = placeCharacter(createCharacterSpec(), 'kitchen', 300, 470);
  her.eating = { uid: 'something', until: 1e6 };
  world.characters.push(her);

  const back = repairWorld(JSON.parse(JSON.stringify(world))).characters[0];
  assert.equal('eating' in back, false, 'she finishes the mouthful and moves on');
});
