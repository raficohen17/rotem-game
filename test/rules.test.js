import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { RECIPES, utensils } from '../js/model/recipes.js';
import {
  isFood, putInside, takeOut, shelfSpot, panSpot, FRIDGE_STOCK,
} from '../js/model/food.js';
import { SWITCHED, switchFor } from '../js/model/using.js';
import { createWorld, repairWorld, placeItem, placeCharacter, placeCat } from '../js/model/world.js';
import { createCharacterSpec } from '../js/model/character.js';
import { createCatSpec } from '../js/model/cat.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'assets/catalog.json'), 'utf8'));
const lookup = (id) => catalog.items.find((i) => i.id === id);

/*
 * The rules the game keeps rediscovering.
 *
 * Each of these was learned by shipping the mistake: four times something on
 * or in something else drew behind it, three times a scene crashed because no
 * test opened that tab, twice a session clock was saved and froze what it was
 * counting. They are written here against the rules rather than against the
 * objects, so a container or a recipe added next month is checked without
 * anybody remembering to check it.
 */

/** Every kind of "one thing holds another" the game has. */
function containers() {
  const withDoors = Object.entries(SWITCHED)
    .filter(([, action]) => action === 'open')
    .map(([id]) => ({ id, hides: true, place: shelfSpot }));
  const open = utensils().map((id) => ({ id, hides: false, place: panSpot }));
  return [...withDoors, ...open];
}

test('every container is a real item', () => {
  for (const c of containers()) {
    assert.ok(lookup(c.id), `${c.id} is in the catalog`);
  }
});

test('what a container holds is put where the container is', () => {
  // The drawing and the hit area have to agree, or she taps what she sees and
  // gets the thing behind it.
  for (const c of containers()) {
    const def = lookup(c.id);
    const host = placeItem(c.id, 640, 470);
    const spot = c.place(host, def);
    assert.ok(Math.abs(spot.x - host.x) <= def.w, `${c.id}: across it, not beside it`);
    assert.ok(spot.y <= host.y && spot.y >= host.y - def.h * 1.2,
      `${c.id}: within its height`);
  }
});

test('anything put into a container can be taken out again', () => {
  // A dead end in a sandbox is a bug however sensible the rule sounded. An
  // omelette was stuck in its pan for good.
  for (const c of containers()) {
    const host = placeItem(c.id, 640, 470);
    const thing = placeItem('egg', 0, 0);
    putInside(thing, host, lookup(c.id));
    assert.equal(thing.inside, host.uid, `${c.id}: it went in`);
    takeOut(thing);
    assert.equal('inside' in thing, false, `${c.id}: and it comes out`);
  }
});

test('what a container holds survives being saved', () => {
  for (const c of containers()) {
    const world = createWorld('House 1');
    const host = placeItem(c.id, 640, 470);
    const thing = placeItem('egg', 0, 0);
    putInside(thing, host, lookup(c.id));
    world.rooms.kitchen.items.push(host, thing);

    const back = repairWorld(JSON.parse(JSON.stringify(world))).rooms.kitchen.items;
    const saved = back.find((i) => i.item === 'egg');
    assert.equal(saved.inside, host.uid, `${c.id}: still inside after a reload`);
  }
});

test('a container that hides its contents does so by having a door', () => {
  // Never by accident. A pan hides nothing, and the rule that blocks reaching
  // into a shut fridge caught it once and stuck the omelette inside.
  const source = readFileSync(join(ROOT, 'js/scenes/room.js'), 'utf8');
  assert.match(source, /switchFor\(host\.item\) === 'open'/,
    'being shut is tested by having a door, not by lacking a switch');
  for (const c of containers().filter((x) => !x.hides)) {
    assert.equal(switchFor(c.id), null, `${c.id} has no door and hides nothing`);
  }
});

test('anything on or in something else draws in front of it', () => {
  // Four times: a character at furniture, a cat on a sofa, food in a fridge,
  // and food in a pan would have been the fourth.
  const source = readFileSync(join(ROOT, 'js/render/room.js'), 'utf8');
  const order = source.slice(source.indexOf('export function roomContents'));
  assert.match(order.slice(0, 3000), /entry\.placed\.inside/,
    'something inside something borrows its baseline');
  assert.match(order.slice(0, 3000), /entry\.kind === 'cat' && entry\.placed\.on/,
    'and so does a cat sitting on something');
});

test('nothing an activity produces can be taken from a drawer', () => {
  // Otherwise the activity is strictly worse than not doing it.
  for (const r of RECIPES) {
    assert.equal(lookup(r.makes).made, true, `${r.makes} is only made, never taken`);
  }
});

test('everything an activity needs can be taken from a drawer', () => {
  for (const r of RECIPES) {
    for (const id of [r.needs, r.in]) {
      assert.notEqual(lookup(id).made, true, `${id} can be got hold of`);
    }
  }
});

test('a fridge is stocked only with things that are not made', () => {
  const made = new Set(RECIPES.map((r) => r.makes));
  for (const id of FRIDGE_STOCK) {
    assert.equal(made.has(id), false, `${id} is not a finished dish`);
  }
});

test('nothing counted in seconds of play is saved', () => {
  // The clock restarts at zero, so a saved count is a debt the next session
  // pays off before anything happens. It has frozen a cat and could freeze
  // somebody mid-mouthful.
  const world = createWorld('House 1');
  const her = placeCharacter(createCharacterSpec(), 'kitchen', 300, 470);
  her.eating = { uid: 'x', until: 1e6 };
  const cat = placeCat(createCatSpec(), 'kitchen', 300, 470);
  cat.dueAt = 1e6;
  world.characters.push(her);
  world.cats.push(cat);

  const back = repairWorld(JSON.parse(JSON.stringify(world)));
  assert.equal('eating' in back.characters[0], false, 'a mouthful is not saved');
  assert.equal('dueAt' in back.cats[0], false, 'nor is when a cat next thinks');
});

test('every food shows how much of it is left', () => {
  // A state that cannot be seen at the size the object really is on screen is
  // indistinguishable from the game being broken.
  const source = readFileSync(join(ROOT, 'js/render/catalog.js'), 'utf8');
  assert.match(source, /function drawPortions/, 'food is drawn by what it has left');
  assert.match(source, /isFood\(placed\)/, 'and every food goes through it');
  for (const item of catalog.items) {
    if (!isFood(placeItem(item.id, 0, 0))) continue;
    assert.ok(item.w > 0 && item.h > 0, `${item.id} has a size to draw`);
  }
});

test('every scene tab is exercised by the harness', () => {
  // Three crashes shipped through a green suite because no test opened that
  // tab. Each took a whole screen down.
  const scenes = readFileSync(join(ROOT, 'test/scenes.test.js'), 'utf8');
  assert.match(scenes, /DRAWER_TABS\.forEach/, 'every drawer tab is drawn');
  assert.match(scenes, /EDITABLE_PARTS\.map\(\(p\) => p\.key\)/, 'every creator tab is drawn');
  assert.match(scenes, /CAT_PARTS\.map\(\(p\) => p\.key\)/, 'every cat tab is drawn');
});

test('a room in a test has the states that only happen sometimes', () => {
  // A branch nobody puts the world into is a branch nobody is checking.
  const stubs = readFileSync(join(ROOT, 'test/helpers/stubs.js'), 'utf8');
  assert.match(stubs, /placeItem\('stove'/, 'a stove');
  assert.match(stubs, /placeItem\('pan'/, 'with a pan on it');
  assert.match(stubs, /inside = pan\.uid/, 'and something cooking in the pan');
  assert.match(stubs, /inside = fridge\.uid/, 'and something shut in a fridge');
});
