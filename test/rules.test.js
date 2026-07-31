import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { RECIPES, utensils } from '../js/model/recipes.js';
import {
  isFood, putInside, takeOut, shelfSpot, panSpot, FRIDGE_STOCK,
  portionsLeft, biteFrom,
} from '../js/model/food.js';
import {
  POURABLE, VESSELS, canPour, pourInto, sipFrom, sipsLeft,
} from '../js/model/drink.js';
import { SWITCHED, switchFor, toggleSwitch } from '../js/model/using.js';
import { traySpot } from '../js/model/board.js';
import { cookOn } from '../js/model/recipes.js';
import { createWorld, repairWorld, placeItem, placeCharacter, placeCat } from '../js/model/world.js';
import { createCharacterSpec } from '../js/model/character.js';
import { createCatSpec } from '../js/model/cat.js';
import { beginUse } from '../js/model/using.js';
import { createRoomScene } from '../js/scenes/room.js';
import { stubGame } from './helpers/stubs.js';
import { HOUSE_LAYOUT } from '../js/model/world.js';

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
  // The pen tray on a whiteboard: a container with no door at all, which is
  // what makes the markers on it part of the board.
  const trays = [{ id: 'whiteboard', hides: false, place: traySpot }];
  return [...withDoors, ...open, ...trays];
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
    world.buildings[0].rooms.kitchen.items.push(host, thing);

    const back = repairWorld(JSON.parse(JSON.stringify(world))).buildings[0].rooms.kitchen.items;
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
  assert.match(stubs, /\.left = \d/, 'a part-eaten meal');
  assert.match(stubs, /\.sips = \d/, 'and a part-drunk glass');
  assert.match(stubs, /placeItem\('whiteboard'/, 'a whiteboard');
  assert.match(stubs, /strokes:/, 'with something drawn on it');
  assert.match(stubs, /marker\.inside = board\.uid/, 'and markers in its tray');
});

test('everything with a level shows that level', () => {
  // A cake, a glass, a carton: three ways of being half used up, all of which
  // are invisible unless something draws them. The eaten cake shipped twice
  // looking whole because the only thing checking was somebody's eyes.
  const source = readFileSync(join(ROOT, 'js/render/catalog.js'), 'utf8');
  assert.match(source, /function drawContents/, 'a glass is drawn by what is in it');
  assert.match(source, /isVessel\(placed\)/, 'and every glass goes through it');
  for (const id of Object.keys(VESSELS)) {
    assert.ok(lookup(id), `${id} is a real item`);
  }
});

test('nothing holds two different things at once', () => {
  // The rule that keeps a container answerable: whatever is in it, there is
  // one answer to what it is. Mixing would need a third thing to exist.
  const vessel = placeItem('glass', 0, 0);
  pourInto(placeItem('milk', 0, 0), vessel);
  while (sipsLeft(vessel) > 1) sipFrom(vessel);
  for (const drink of Object.keys(POURABLE)) {
    if (drink === 'milk') continue;
    assert.equal(canPour(drink, vessel), false, `${drink} does not go in on top of milk`);
  }
});

test('a thing emptied is still a thing', () => {
  // Deleting what she emptied has been wrong twice: a plate becomes crumbs, a
  // glass becomes an empty glass. Neither vanishes out from under her.
  const vessel = placeItem('glass', 0, 0);
  pourInto(placeItem('milk', 0, 0), vessel);
  while (sipsLeft(vessel) > 0) sipFrom(vessel);
  assert.equal(canPour('juice', vessel), true, 'an empty glass takes a new drink');

  const cake = placeItem('cake', 0, 0);
  while (portionsLeft(cake) > 0) biteFrom(cake);
  assert.equal(portionsLeft(cake), 0, 'and an eaten cake is still on the table');
});

test('the stub catalog shows what the real one shows', () => {
  // The stub filtered nothing, so the harness drew a drawer the game never
  // shows — cooked dishes included — and reported an overflow that could not
  // happen while hiding whether the real drawer fits. A stub that has drifted
  // tests a game that does not exist.
  const real = readFileSync(join(ROOT, 'js/render/catalog.js'), 'utf8');
  const stub = readFileSync(join(ROOT, 'test/helpers/stubs.js'), 'utf8');
  const filter = /i\.cat === categoryId && !i\.made/;
  assert.match(real, filter, 'the real catalog hides what is only made');
  assert.match(stub, filter, 'and so does the stub');
});

/**
 * The generic version of the rule that keeps catching us out.
 *
 * Every stateful field has had to be named in repairItem by somebody
 * remembering: what a lamp was doing, what was left of a cake, what was in a
 * glass. Each was found by playing, not by a test. So rather than listing the
 * fields again here, this plays the game — pours, cooks, puts food away,
 * takes a bite, turns things on — and demands that everything it wrote is
 * still there afterwards.
 *
 * The exceptions are absolute times: a moment measured against a clock that
 * restarts at zero is a debt the next session pays off. An accumulated amount,
 * like how long something has been in the pan, is not a moment and does keep.
 */
const MOMENTS = new Set(['eating', 'dueAt', 'walk']);

test('everything the game writes onto the world survives a save', () => {
  const world = createWorld('House 1');
  const room = world.buildings[0].rooms.kitchen;

  const lamp = placeItem('lamp_table', 200, 470);
  toggleSwitch(lamp);

  const fridge = placeItem('fridge', 1050, 470);
  toggleSwitch(fridge);
  const cake = placeItem('cake', 1050, 470);
  putInside(cake, fridge, lookup('fridge'), 1);
  biteFrom(cake);

  const stove = placeItem('stove', 900, 470);
  toggleSwitch(stove);
  const pan = placeItem('pan', 900, 300);
  const egg = placeItem('egg', 900, 280);
  egg.inside = pan.uid;
  cookOn(pan, egg, 4, true);

  const cup = placeItem('glass', 300, 470);
  pourInto(placeItem('milk', 250, 470), cup);
  sipFrom(cup);

  room.items.push(lamp, fridge, cake, stove, pan, egg, cup);

  const back = repairWorld(JSON.parse(JSON.stringify(world)));
  const saved = new Map(back.buildings[0].rooms.kitchen.items.map((i) => [i.uid, i]));
  for (const item of room.items) {
    const after = saved.get(item.uid);
    assert.ok(after, `${item.item} is still there`);
    for (const [field, value] of Object.entries(item)) {
      if (MOMENTS.has(field)) continue;
      assert.deepEqual(after[field], value, `${item.item}.${field} was kept`);
    }
  }
});

/**
 * Deleting a thing takes its references with it.
 *
 * Everything that holds another thing holds it by uid, and a uid outlives the
 * object it named. A cake in a deleted fridge stayed in the room for ever —
 * never drawn, because what it was inside had gone, and never usable, because
 * it still counted as put away. Written against every container there is, so
 * the next one is covered by having been added rather than by being remembered.
 */
function deleteInScene(game, roomId, doomed, offset = 0) {
  // Aimed off centre where asked: what is in a container is drawn over the
  // middle of it, and so is whoever is using it, and the tap picks the thing
  // on top — which is the right behaviour and the wrong thing to delete here.
  const scene = createRoomScene(game, roomId);
  const x = doomed.x + offset;
  scene.onPointerDown(20 + x * 1.033, 22 + (doomed.y - 12) * 1.033);
  scene.onPointerUp(20 + x * 1.033, 22 + (doomed.y - 12) * 1.033);
  const button = scene.allControls().find((c) => c.id === 'delete');
  assert.ok(button, 'there is a delete button');
  scene.onTap(button.x + button.w / 2, button.y + button.h / 2);
}

test('deleting a container leaves what was in it in the room', () => {
  for (const c of containers()) {
    const game = stubGame();
    const roomId = HOUSE_LAYOUT[2];
    const room = game.world.buildings[0].rooms[roomId];
    room.items = [];
    const host = placeItem(c.id, 400, 470);
    const thing = placeItem('egg', 400, 400);
    putInside(thing, host, lookup(c.id));
    room.items.push(host, thing);

    deleteInScene(game, roomId, host, -lookup(c.id).w * 0.36);
    const after = game.world.buildings[0].rooms[roomId].items;
    assert.equal(after.includes(host), false, `${c.id}: it is gone`);
    assert.ok(after.includes(thing), `${c.id}: what was in it is still here`);
    assert.equal('inside' in thing, false, `${c.id}: and is not inside a ghost`);
    assert.ok(thing.y > 300, `${c.id}: it came down to the floor`);
  }
});

test('deleting what somebody is using stops them using it', () => {
  const game = stubGame();
  const roomId = HOUSE_LAYOUT[2];
  const room = game.world.buildings[0].rooms[roomId];
  room.items = [];
  const sofa = placeItem('sofa', 400, 470);
  room.items.push(sofa);
  const her = { ...placeCharacter(createCharacterSpec(), roomId, 400, 470), building: game.building.id };
  game.world.characters.push(her);
  beginUse(her, sofa);
  assert.ok(her.using, 'she sat down');

  deleteInScene(game, roomId, sofa, lookup('sofa').w * 0.4);
  assert.equal('using' in her, false, 'and stood up when it went');
});

test('deleting what a cat is on gets the cat off it', () => {
  const game = stubGame();
  const roomId = HOUSE_LAYOUT[2];
  const room = game.world.buildings[0].rooms[roomId];
  room.items = [];
  const sofa = placeItem('sofa', 400, 470);
  room.items.push(sofa);
  const cat = { ...placeCat(createCatSpec(), roomId, 400, 430), building: game.building.id };
  cat.on = sofa.uid;
  game.world.cats = [cat];

  deleteInScene(game, roomId, sofa, lookup('sofa').w * 0.4);
  assert.equal('on' in cat, false, 'it is not perched on nothing');
});
