/**
 * Pouring and drinking.
 *
 * A drink is a property of the glass rather than an object inside it, which is
 * what keeps it out of the four questions every container has to answer. What
 * is left to check is that measures move rather than multiply, that an empty
 * glass stays on the table, and that the cat only gets what is in a bowl.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  POURABLE, VESSELS, isPourable, isVessel, canPour, pourInto, sipFrom,
  measuresLeft, sipsLeft, holds, fullness, catWouldDrink, drinkColor,
} from '../js/model/drink.js';
import { placeItem } from '../js/model/world.js';
import { createWorld, repairWorld } from '../js/model/world.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { canUse, actOnce, useFor } from '../js/model/using.js';
import { drinkWithinReach } from '../js/model/catlife.js';
import { createRoomScene } from '../js/scenes/room.js';
import { stubGame } from './helpers/stubs.js';
import { HOUSE_LAYOUT } from '../js/model/world.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'assets/catalog.json'), 'utf8'));

const carton = (id = 'milk') => placeItem(id, 100, 400);
const glass = (id = 'glass') => placeItem(id, 200, 400);

test('every drink and every glass is a real item', () => {
  for (const id of [...Object.keys(POURABLE), ...Object.keys(VESSELS)]) {
    assert.ok(catalog.items.find((i) => i.id === id), `${id} can be taken from a drawer`);
  }
});

test('a measure leaves the carton and arrives in the glass', () => {
  const milk = carton();
  const cup = glass();
  const full = measuresLeft(milk);

  assert.equal(pourInto(milk, cup), true);
  assert.equal(measuresLeft(milk), full - 1, 'the carton is one down');
  assert.equal(holds(cup), 'milk', 'and the glass has milk in it');
  assert.equal(sipsLeft(cup), VESSELS.glass.sips, 'filled to the top');
});

test('an empty carton pours nothing', () => {
  const milk = carton();
  const cup = glass();
  for (let i = 0; i < POURABLE.milk.measures; i += 1) {
    assert.equal(pourInto(milk, cup), true, `pour ${i + 1}`);
    while (sipsLeft(cup) > 0) sipFrom(cup);
  }
  assert.equal(measuresLeft(milk), 0);
  assert.equal(pourInto(milk, cup), false, 'nothing left to pour');
  assert.equal(sipsLeft(cup), 0, 'and the glass stays empty');
});

test('a full glass takes nothing more', () => {
  const milk = carton();
  const cup = glass();
  pourInto(milk, cup);
  const before = measuresLeft(milk);
  assert.equal(canPour('milk', cup), false);
  assert.equal(pourInto(milk, cup), false);
  assert.equal(measuresLeft(milk), before, 'no measure disappeared');
});

test('one drink never goes on top of another', () => {
  const cup = glass();
  pourInto(carton('milk'), cup);
  while (sipsLeft(cup) > 1) sipFrom(cup);
  const juice = carton('juice');
  assert.equal(canPour('juice', cup), false, 'milk and juice do not mix');
  assert.equal(pourInto(juice, cup), false);
  assert.equal(holds(cup), 'milk');
  assert.equal(measuresLeft(juice), POURABLE.juice.measures);
});

test('a glass drunk dry stays, ready to be filled again', () => {
  const cup = glass();
  pourInto(carton(), cup);
  while (sipsLeft(cup) > 0) sipFrom(cup);

  assert.equal(holds(cup), null, 'it is empty');
  assert.equal(fullness(cup), 0);
  assert.equal(canPour('juice', cup), true, 'and will take anything next');
});

test('drinking is on the same control as eating', () => {
  const cup = glass();
  pourInto(carton(), cup);
  const her = { x: 0, y: 0 };

  assert.equal(useFor(cup.item), 'drink');
  assert.equal(canUse(cup), true);
  const sips = sipsLeft(cup);
  actOnce(her, cup, 0);
  assert.equal(sipsLeft(cup), sips - 1, 'one sip a tap');
  assert.ok(her.eating, 'and it shows for a moment, the way a bite does');
});

test('an empty glass offers nothing to drink', () => {
  assert.equal(canUse(glass()), false);
});

test('what is in a glass has a colour and a level to draw it with', () => {
  for (const id of Object.keys(POURABLE)) {
    assert.match(drinkColor(id), /^#[0-9a-f]{6}$/i, `${id} has a colour`);
  }
  const cup = glass();
  pourInto(carton(), cup);
  assert.equal(fullness(cup), 1);
  sipFrom(cup);
  assert.ok(fullness(cup) > 0 && fullness(cup) < 1, 'part drunk reads as part full');
});

test('what a glass holds survives being saved', () => {
  const world = createWorld('House 1');
  const cup = glass();
  pourInto(carton(), cup);
  sipFrom(cup);
  world.buildings[0].rooms.kitchen.items.push(cup);

  const back = repairWorld(JSON.parse(JSON.stringify(world)));
  const saved = back.buildings[0].rooms.kitchen.items.at(-1);
  assert.equal(holds(saved), 'milk');
  assert.equal(sipsLeft(saved), sipsLeft(cup));
});

test('a cat drinks milk from a bowl and not from her glass', () => {
  const bowl = placeItem('dog_bowl', 300, 460);
  const cup = glass();
  pourInto(carton('milk'), bowl);
  pourInto(carton('milk'), cup);

  assert.equal(catWouldDrink(bowl), true);
  assert.equal(catWouldDrink(cup), false, 'a cat does not use a glass');
  const reachable = drinkWithinReach([bowl, cup]);
  assert.deepEqual(reachable.map((i) => i.item), ['dog_bowl']);
});

test('a cat does not drink juice, even from a bowl', () => {
  const bowl = placeItem('dog_bowl', 300, 460);
  pourInto(carton('juice'), bowl);
  assert.equal(catWouldDrink(bowl), false);
});

test('an empty bowl is not on the cat list', () => {
  const bowl = placeItem('dog_bowl', 300, 460);
  assert.deepEqual(drinkWithinReach([bowl]), []);
  pourInto(carton('milk'), bowl);
  while (sipsLeft(bowl) > 0) sipFrom(bowl);
  assert.deepEqual(drinkWithinReach([bowl]), [], 'nor is one the cat emptied');
});

test('a bowl shut in the fridge is out of reach', () => {
  const bowl = placeItem('dog_bowl', 300, 460);
  pourInto(carton('milk'), bowl);
  bowl.inside = 'fridge-uid';
  assert.deepEqual(drinkWithinReach([bowl]), []);
});

test('what pours and what is poured into do not overlap', () => {
  // A carton that could be drunk from, or a glass that could be tipped, would
  // make pouring ambiguous the moment one is dropped on the other.
  for (const id of Object.keys(POURABLE)) {
    assert.equal(isVessel(placeItem(id, 0, 0)), false, `${id} is not a glass`);
  }
  for (const id of Object.keys(VESSELS)) {
    assert.equal(isPourable(placeItem(id, 0, 0)), false, `${id} is not a carton`);
  }
});

/* ------------------------------------------------ pouring, with her finger */

test('dragging the milk onto a glass fills it and puts the milk back', () => {
  // The one gesture in the game that changes two objects at once. The carton
  // was tipped, not moved, so it belongs back where it was standing.
  const game = stubGame();
  const roomId = HOUSE_LAYOUT[0];
  const room = game.world.buildings[0].rooms[roomId];
  const cup = placeItem('glass', 700, 470);
  // Clear of the furniture the stub room is full of, so "back where it was"
  // means the same thing before and after.
  const milk = placeItem('milk', 560, 470);
  room.items.push(cup, milk);

  const scene = createRoomScene(game, roomId);
  const at = (item, dy = 20) => [20 + item.x * 1.033, 22 + (item.y - dy) * 1.033];
  scene.onPointerDown(...at(milk));
  scene.onPointerMove(...at(cup));
  scene.onPointerUp(...at(cup));

  assert.equal(holds(cup), 'milk', 'the glass has milk in it');
  assert.equal(measuresLeft(milk), POURABLE.milk.measures - 1, 'the carton is one down');
  assert.equal(milk.x, 560, 'and it is back where it was');
  assert.equal(milk.y, 470);
});

test('dragging the milk somewhere else just moves it', () => {
  const game = stubGame();
  const roomId = HOUSE_LAYOUT[0];
  const room = game.world.buildings[0].rooms[roomId];
  const milk = placeItem('milk', 560, 470);
  room.items.push(milk);

  const scene = createRoomScene(game, roomId);
  scene.onPointerDown(20 + milk.x * 1.033, 22 + (milk.y - 20) * 1.033);
  scene.onPointerMove(20 + 640 * 1.033, 22 + 450 * 1.033);
  scene.onPointerUp(20 + 640 * 1.033, 22 + 450 * 1.033);

  assert.equal(measuresLeft(milk), POURABLE.milk.measures, 'nothing was poured');
  assert.notEqual(milk.x, 560, 'and it went where she put it');
});

test('the last sip still splashes the colour of the drink', () => {
  // The sip that empties the glass clears what it held, so the moment is
  // remembered on her rather than read back off a glass that is now empty.
  const cup = glass();
  pourInto(carton('juice'), cup);
  const her = { x: 0, y: 0 };
  while (sipsLeft(cup) > 1) sipFrom(cup);
  actOnce(her, cup, 0);

  assert.equal(sipsLeft(cup), 0, 'that was the last of it');
  assert.equal(her.eating.drink, 'juice', 'and it was juice she was drinking');
});
