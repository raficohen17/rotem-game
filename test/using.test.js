import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  ACTIONS, AFFORDS, useFor, canUse, beginUse, stopUsing, isUsing, resolveUse, carriedItems,
} from '../js/model/using.js';
import { placeItem, placeCharacter, createWorld, repairWorld } from '../js/model/world.js';
import { ICONS } from '../js/ui/icons.js';
import { createCharacterSpec } from '../js/model/character.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'assets/catalog.json'), 'utf8'));

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
  assert.equal(useFor('sofa'), null);
  assert.equal(canUse(placeItem('sofa', 100, 470)), false);
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
  assert.equal(beginUse(her, placeItem('sofa', 640, 470)), false);
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
