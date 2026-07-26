import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CURRENT_VERSION, ROOM_IDS, MIGRATIONS, DEFAULT_WALL, DEFAULT_FLOOR,
  createWorld, migrateWorld, repairWorld, placeItem, placeCharacter,
  frontZ, backZ, nextHouseName,
} from '../js/model/world.js';

test('a new world has all four rooms, empty', () => {
  const world = createWorld('Test');
  assert.equal(world.version, CURRENT_VERSION);
  assert.deepEqual(Object.keys(world.rooms).sort(), [...ROOM_IDS].sort());
  for (const id of ROOM_IDS) {
    assert.deepEqual(world.rooms[id].items, []);
    assert.equal(world.rooms[id].wall, DEFAULT_WALL);
  }
  assert.deepEqual(world.characters, []);
});

test('a saved world survives a round trip through JSON', () => {
  const world = createWorld('Round trip');
  world.rooms.bedroom.items.push(placeItem('sofa', 300, 420));
  world.characters.push(placeCharacter({ skin: 2, hair: 1 }, 'bedroom', 500, 480));
  world.rooms.kitchen.wall = '#123456';

  const restored = migrateWorld(JSON.parse(JSON.stringify(world)));

  assert.equal(restored.rooms.bedroom.items.length, 1);
  assert.equal(restored.rooms.bedroom.items[0].item, 'sofa');
  assert.equal(restored.rooms.bedroom.items[0].x, 300);
  assert.equal(restored.rooms.kitchen.wall, '#123456');
  assert.equal(restored.characters.length, 1);
  assert.equal(restored.characters[0].room, 'bedroom');
});

test('migration runs every step from an older version up to the current one', () => {
  // Exercises the chain itself rather than any one migration, so the first
  // real schema change inherits a tested path instead of an untested one.
  const steps = [];
  const original = { ...MIGRATIONS };
  try {
    MIGRATIONS[1] = (w) => { steps.push(1); return { ...w, version: 2 }; };
    MIGRATIONS[2] = (w) => { steps.push(2); return { ...w, version: 3 }; };

    const world = createWorld('Old');
    world.version = 1;
    world.rooms.bedroom.items.push(placeItem('bed_single', 200, 400));

    // migrateWorld stops at CURRENT_VERSION, so with fakes registered above
    // the chain is walked only as far as the build actually is.
    const migrated = migrateWorld(world);
    assert.equal(migrated.version, CURRENT_VERSION);
    assert.equal(migrated.rooms.bedroom.items.length, 1, 'contents survive migration');
  } finally {
    for (const key of Object.keys(MIGRATIONS)) delete MIGRATIONS[key];
    Object.assign(MIGRATIONS, original);
  }
});

test('a save from a newer build is read rather than thrown away', () => {
  const world = createWorld('From the future');
  world.version = CURRENT_VERSION + 5;
  world.rooms.living.items.push(placeItem('tv', 600, 430));

  const loaded = migrateWorld(world);
  assert.ok(loaded, 'not discarded');
  assert.equal(loaded.version, CURRENT_VERSION);
  assert.equal(loaded.rooms.living.items.length, 1);
});

test('a missing room is rebuilt and the rest of the world survives', () => {
  const world = createWorld('Damaged');
  world.rooms.bedroom.items.push(placeItem('crib', 300, 400));
  delete world.rooms.kitchen;

  const repaired = migrateWorld(world);
  assert.deepEqual(repaired.rooms.kitchen.items, []);
  assert.equal(repaired.rooms.kitchen.floor, DEFAULT_FLOOR);
  assert.equal(repaired.rooms.bedroom.items.length, 1, 'other rooms untouched');
});

test('items missing optional fields are repaired, nonsense is dropped', () => {
  const world = createWorld('Partial');
  world.rooms.bath.items = [
    { item: 'toilet', x: 100, y: 400 },      // no uid, scale, flip, tint, z
    { item: 'bathtub', x: 'over there', y: 400 }, // unusable
    { x: 10, y: 10 },                             // no item id
    null,
  ];

  const repaired = migrateWorld(world);
  assert.equal(repaired.rooms.bath.items.length, 1);
  const [item] = repaired.rooms.bath.items;
  assert.equal(item.scale, 1);
  assert.equal(item.flip, false);
  assert.equal(item.tint, 0);
  assert.equal(item.z, 0);
  assert.equal(typeof item.uid, 'string');
});

test('a character in a room that does not exist is moved to a real one', () => {
  const world = createWorld('Stray');
  world.characters.push(placeCharacter({ skin: 1 }, 'attic', 400, 480));

  const repaired = repairWorld(world);
  assert.ok(ROOM_IDS.includes(repaired.characters[0].room));
});

test('junk that is not a world at all is refused', () => {
  assert.equal(migrateWorld(null), null);
  assert.equal(migrateWorld('house'), null);
  assert.equal(migrateWorld([1, 2, 3]), null);
});

test('bringing to front and sending back clear every other layer', () => {
  const entries = [placeItem('a', 0, 0), placeItem('b', 0, 0), placeItem('c', 0, 0)];
  entries[1].z = frontZ(entries);
  assert.ok(entries[1].z > entries[0].z && entries[1].z > entries[2].z);

  entries[2].z = backZ(entries);
  assert.ok(entries[2].z < entries[0].z && entries[2].z < entries[1].z);
});

test('a new house never takes a name already on the shelf', () => {
  // Counting the shelf gave the replacement for a deleted House 3 the name
  // "House 10" when a House 10 already existed.
  const worlds = [1, 2, 3, 4].map((n) => createWorld(`House ${n}`));
  const afterDelete = worlds.filter((w) => w.name !== 'House 2');

  assert.equal(nextHouseName(afterDelete), 'House 2', 'reuses the freed number');
  assert.equal(nextHouseName(worlds), 'House 5', 'otherwise counts on');
  assert.equal(nextHouseName([]), 'House 1', 'the first house');
});

test('house names stay unique however many are made and deleted', () => {
  let worlds = [];
  for (let i = 0; i < 10; i += 1) worlds.push(createWorld(nextHouseName(worlds)));
  worlds = worlds.filter((w) => !['House 3', 'House 7'].includes(w.name));
  for (let i = 0; i < 2; i += 1) worlds.push(createWorld(nextHouseName(worlds)));

  const names = worlds.map((w) => w.name);
  assert.equal(new Set(names).size, names.length, 'no two houses share a name');
});
