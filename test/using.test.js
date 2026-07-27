import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  ACTIONS, AFFORDS, useFor, canUse, beginUse, stopUsing, isUsing, resolveUse, carriedItems,
  SWITCHES, SWITCHED, canSwitch, toggleSwitch, isOn,
} from '../js/model/using.js';
import { placeItem, placeCharacter, createWorld, repairWorld } from '../js/model/world.js';
import { ICONS } from '../js/ui/icons.js';
import { createCharacterSpec } from '../js/model/character.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'assets/catalog.json'), 'utf8'));
const catalogItems = catalog.items;

test('every item that affords a use is really in the catalog', () => {
  // A typo here is a use that can never be reached, because no item in any
  // drawer carries that id.
  const ids = new Set(catalog.items.map((item) => item.id));
  for (const id of Object.keys(AFFORDS)) {
    assert.ok(ids.has(id), `${id} is a catalog item`);
  }
});

test('every affordance names an action that exists', () => {
  for (const [id, action] of Object.entries(AFFORDS)) {
    assert.ok(ACTIONS[action], `${id} affords "${action}", which is defined`);
  }
});

test('furniture with no use offers none', () => {
  // A dining table is furniture you arrange, not furniture you occupy.
  assert.equal(useFor('table_dining'), null);
  assert.equal(canUse(placeItem('table_dining', 100, 470)), false);
  assert.equal(canUse(null), false);
});

test('a book can be read and a shower can be showered in', () => {
  assert.equal(useFor('book'), 'read');
  assert.equal(useFor('shower'), 'shower');
  assert.equal(canUse(placeItem('book', 100, 470)), true);
});

test('using something puts her at it', () => {
  const shower = placeItem('shower', 640, 470);
  const her = placeCharacter(undefined, 'bath', 200, 470);

  assert.equal(beginUse(her, shower), true);
  assert.equal(isUsing(her), true);
  assert.equal(her.x, 640, 'she moved to the shower');
  assert.equal(her.y, 470);
});

test('she cannot use a thing that offers nothing', () => {
  const her = placeCharacter(undefined, 'bath', 200, 470);
  assert.equal(beginUse(her, placeItem('wardrobe', 640, 470)), false);
  assert.equal(isUsing(her), false);
});

test('what she is using survives a save and reload', () => {
  // The record is the item's uid, not the item, so it still resolves after
  // the world has been through JSON.
  const shower = placeItem('shower', 640, 470);
  const her = placeCharacter(undefined, 'bath', 200, 470);
  beginUse(her, shower);

  const reloaded = JSON.parse(JSON.stringify({ items: [shower], her }));
  const doing = resolveUse(reloaded.her, reloaded.items);
  assert.equal(doing.action, 'shower');
  assert.equal(doing.item.uid, shower.uid);
});

test('deleting the thing she is using stops her using it', () => {
  const shower = placeItem('shower', 640, 470);
  const her = placeCharacter(undefined, 'bath', 200, 470);
  beginUse(her, shower);

  assert.equal(resolveUse(her, []), null, 'the shower is gone');
  assert.equal(isUsing(her), false, 'and she is no longer showering');
});

test('stopping leaves nothing behind in the save', () => {
  const her = placeCharacter(undefined, 'bath', 200, 470);
  beginUse(her, placeItem('shower', 640, 470));
  stopUsing(her);
  assert.equal('using' in her, false, 'the key is removed, not set to null');
});

test('an action says where she stands and whether she is in front', () => {
  for (const [name, action] of Object.entries(ACTIONS)) {
    assert.equal(typeof action.offset, 'number', `${name} has an offset`);
    assert.equal(typeof action.inFront, 'boolean', `${name} says which side she is on`);
  }
  // The curtain has to draw over her, or it is not hiding anything.
  assert.equal(ACTIONS.shower.inFront, false);
  // The book has to draw over her, since she is holding it up.
  assert.equal(ACTIONS.read.inFront, true);
});

test('the button for every action is an icon that exists', () => {
  // drawButton draws nothing at all for a name it does not know, so a missing
  // icon is a blank circle that still taps — which is how the shower button
  // first shipped. The name is computed at runtime, so only checking it
  // against the real icon set catches it.
  for (const [name, action] of Object.entries(ACTIONS)) {
    assert.ok(typeof ICONS[action.icon] === 'function',
      `${name} uses the "${action.icon}" icon, which is drawn`);
  }
});

test('what she is doing survives being loaded back out of storage', () => {
  // repairWorld rebuilds every character from a fixed list of fields, which
  // is what stops a corrupt save crashing the game — and which dropped this
  // one silently. She showered until the world was reopened, then stood there
  // dry with the curtain gone.
  const world = createWorld('House 1');
  const shower = placeItem('shower', 640, 470);
  const her = placeCharacter(createCharacterSpec(), 'bath', 200, 470);
  world.rooms.bath.items.push(shower);
  world.characters.push(her);
  beginUse(her, shower);

  const loaded = repairWorld(JSON.parse(JSON.stringify(world)));
  const restored = loaded.characters[0];
  assert.deepEqual(restored.using, { uid: shower.uid, action: 'shower' });
  assert.ok(resolveUse(restored, loaded.rooms.bath.items), 'and still resolves to the shower');
});

test('a nonsense using record is thrown away rather than trusted', () => {
  const world = createWorld('House 1');
  const her = placeCharacter(createCharacterSpec(), 'bath', 200, 470);
  world.characters.push(her);

  for (const junk of [42, 'shower', {}, { uid: 5 }, { action: 'shower' }, null]) {
    her.using = junk;
    const loaded = repairWorld(JSON.parse(JSON.stringify(world)));
    assert.equal('using' in loaded.characters[0], false, `${JSON.stringify(junk)} is dropped`);
  }
});

test('a book being read is not also left standing on the floor', () => {
  const book = placeItem('book', 300, 470);
  const her = placeCharacter(createCharacterSpec(), 'bedroom', 300, 470);
  beginUse(her, book);
  assert.deepEqual([...carriedItems([her])], [book.uid]);
});

test('a shower is not carried around', () => {
  const shower = placeItem('shower', 640, 470);
  const her = placeCharacter(createCharacterSpec(), 'bath', 640, 470);
  beginUse(her, shower);
  assert.equal(carriedItems([her]).size, 0, 'it stays where it is plumbed in');
});

test('nobody using anything carries anything', () => {
  assert.equal(carriedItems([]).size, 0);
  assert.equal(carriedItems(undefined).size, 0);
});

/* -------------------------------------------------- things you switch on */

test('every switchable item is really in the catalog', () => {
  const ids = new Set(catalogItems.map((item) => item.id));
  for (const id of Object.keys(SWITCHED)) assert.ok(ids.has(id), `${id} is a catalog item`);
});

test('every switch names an action that exists and has an icon', () => {
  for (const [id, action] of Object.entries(SWITCHED)) {
    assert.ok(SWITCHES[action], `${id} switches "${action}"`);
    assert.ok(typeof ICONS[SWITCHES[action].icon] === 'function',
      `"${action}" uses an icon that is drawn`);
  }
});

test('a lamp turns on and off again', () => {
  const lamp = placeItem('lamp_floor', 300, 470);
  assert.equal(isOn(lamp), false, 'it starts off');
  assert.equal(toggleSwitch(lamp), true);
  assert.equal(isOn(lamp), true);
  assert.equal(toggleSwitch(lamp), false);
  assert.equal(isOn(lamp), false);
});

test('a sofa has no switch', () => {
  // It can be sat on, which is a different thing: a seat is occupied by one
  // person, a lamp is a state of the room.
  const sofa = placeItem('sofa', 300, 470);
  assert.equal(canSwitch(sofa), false);
  assert.equal(toggleSwitch(sofa), false);
  assert.equal(isOn(sofa), false);
  assert.equal(canUse(sofa), true);
});

test('a lamp she left on is still on tomorrow', () => {
  // repairItem rebuilds every item from a fixed list of fields, which already
  // dropped one thing worth keeping. A lamp that goes out when the world is
  // reopened is the same bug wearing a different hat.
  const world = createWorld('House 1');
  const lamp = placeItem('lamp_floor', 300, 470);
  toggleSwitch(lamp);
  world.rooms.bedroom.items.push(lamp);

  const loaded = repairWorld(JSON.parse(JSON.stringify(world)));
  assert.equal(isOn(loaded.rooms.bedroom.items[0]), true);
});

test('a lamp that was off does not carry a field around', () => {
  const world = createWorld('House 1');
  world.rooms.bedroom.items.push(placeItem('lamp_floor', 300, 470));
  const loaded = repairWorld(JSON.parse(JSON.stringify(world)));
  assert.equal('on' in loaded.rooms.bedroom.items[0], false, 'off is the absence of the field');
});

test('a nonsense on value is not trusted', () => {
  const world = createWorld('House 1');
  const lamp = placeItem('lamp_floor', 300, 470);
  world.rooms.bedroom.items.push(lamp);
  for (const junk of ['yes', 1, {}, []]) {
    lamp.on = junk;
    const loaded = repairWorld(JSON.parse(JSON.stringify(world)));
    assert.equal('on' in loaded.rooms.bedroom.items[0], false, `${JSON.stringify(junk)} is dropped`);
  }
});

test('switching something is not the same as using it', () => {
  // A lamp belongs to the room, not to whoever turned it on: she can walk away
  // and it stays lit, and two characters do not fight over it.
  const lamp = placeItem('lamp_floor', 300, 470);
  assert.equal(canUse(lamp), false, 'a lamp is not occupied');
  assert.equal(canSwitch(lamp), true, 'it is switched');

  const shower = placeItem('shower', 640, 470);
  assert.equal(canSwitch(shower), false, 'a shower is occupied, not switched');
  assert.equal(canUse(shower), true);
});

/* ------------------------------------------------- poses and their hosts */

test('every bed can be slept in and every seat sat on', () => {
  // A game where the sofa works and the armchair does not reads as broken
  // rather than as unfinished, so the whole drawer has to be covered.
  const inCategory = (cat) => catalogItems.filter((i) => i.cat === cat).map((i) => i.id);

  for (const id of inCategory('sleep')) {
    // A cushion is a thing you put on a bed, not a thing you sleep in.
    if (id === 'cushion') continue;
    assert.equal(useFor(id), 'sleep', `${id} can be slept in`);
  }
  for (const id of inCategory('sit')) {
    assert.equal(useFor(id), 'sit', `${id} can be sat on`);
  }
});

test('a pose action says how it is drawn', () => {
  for (const name of ['sit', 'sleep', 'bathe']) {
    const action = ACTIONS[name];
    assert.ok(['sit', 'lie'].includes(action.pose), `${name} names a pose`);
    assert.ok(action.seat > 0 && action.seat < 1,
      `${name} anchors to a fraction of its host's height, not a constant`);
  }
});

test('sitting heights differ by what is being sat on', () => {
  // A stool and a sofa are not the same height. Anchoring to a constant
  // floats her above one and sinks her into the other.
  assert.notEqual(ACTIONS.sit.seat, ACTIONS.bathe.seat);
  assert.ok(ACTIONS.bathe.seat < ACTIONS.sit.seat, 'a bath is sat in lower than a chair');
});

test('sleeping closes her eyes', () => {
  assert.equal(ACTIONS.sleep.asleep, true);
  assert.notEqual(ACTIONS.sit.asleep, true, 'sitting does not');
});

test('what she is lying in is drawn behind her and a bath in front', () => {
  // She lies on top of a mattress and down inside a bath.
  assert.equal(ACTIONS.sleep.inFront, true);
  assert.equal(ACTIONS.bathe.inFront, false);
});
