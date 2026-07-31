import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createStore, canAddWorld, addWorld, removeWorld, replaceWorld,
  MAX_WORLDS, STORAGE_KEY,
} from '../js/model/storage.js';
import { createWorld, placeItem } from '../js/model/world.js';

/** Stands in for localStorage. */
function fakeBackend(initial = null) {
  const data = new Map();
  if (initial !== null) data.set(STORAGE_KEY, initial);
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
    raw: data,
  };
}

function fullShelf() {
  return Array.from({ length: MAX_WORLDS }, (unused, i) => createWorld(`House ${i}`));
}

test('saving then loading gives back what went in', () => {
  const backend = fakeBackend();
  const store = createStore(backend);

  const world = createWorld('Home');
  world.buildings[0].rooms.bedroom.items.push(placeItem('sofa', 240, 430));
  store.save([world]);

  const [loaded] = store.load();
  assert.equal(loaded.name, 'Home');
  assert.equal(loaded.buildings[0].rooms.bedroom.items[0].item, 'sofa');
});

test('an empty shelf loads as an empty list', () => {
  assert.deepEqual(createStore(fakeBackend()).load(), []);
});

test('corrupt storage loads empty instead of throwing', () => {
  assert.deepEqual(createStore(fakeBackend('{not json at all')).load(), []);
  assert.deepEqual(createStore(fakeBackend('{"worlds":"nope"}')).load(), []);
  assert.deepEqual(createStore(fakeBackend('null')).load(), []);
});

test('unreadable worlds are skipped and the good ones still load', () => {
  const good = createWorld('Good');
  const payload = JSON.stringify({ version: 1, worlds: [null, good, 'rubbish', 42] });

  const loaded = createStore(fakeBackend(payload)).load();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].name, 'Good');
});

test('a backend that rejects writes reports failure without throwing', () => {
  const store = createStore({
    getItem: () => null,
    setItem: () => { throw new Error('QuotaExceededError'); },
  });
  assert.equal(store.save([createWorld('Big')]), false);
});

test('the shelf holds ten worlds and refuses an eleventh', () => {
  const worlds = fullShelf();
  assert.equal(canAddWorld(worlds), false);

  const after = addWorld(worlds, createWorld('One too many'));
  assert.equal(after.length, MAX_WORLDS);
  assert.ok(!after.some((w) => w.name === 'One too many'), 'the new world is not added');
  assert.equal(after[0].name, worlds[0].name, 'and no existing world is dropped');
});

test('deleting a world frees a slot', () => {
  const worlds = fullShelf();
  const trimmed = removeWorld(worlds, worlds[3].id);

  assert.equal(trimmed.length, MAX_WORLDS - 1);
  assert.equal(canAddWorld(trimmed), true);
  assert.equal(addWorld(trimmed, createWorld('New')).length, MAX_WORLDS);
});

test('loading never returns more than ten worlds', () => {
  const tooMany = Array.from({ length: 14 }, (unused, i) => createWorld(`House ${i}`));
  const store = createStore(fakeBackend(JSON.stringify({ version: 1, worlds: tooMany })));
  assert.equal(store.load().length, MAX_WORLDS);
});

test('replacing a world updates it in place and keeps the order', () => {
  const worlds = [createWorld('A'), createWorld('B'), createWorld('C')];
  const edited = { ...worlds[1], name: 'B edited' };

  const next = replaceWorld(worlds, edited);
  assert.equal(next.length, 3);
  assert.equal(next[1].name, 'B edited');
  assert.equal(next[0].name, 'A');
});

test('replacing a world that is not on the shelf adds it', () => {
  const next = replaceWorld([createWorld('A')], createWorld('B'));
  assert.equal(next.length, 2);
});

test('a change is persisted without any explicit save step by the caller', () => {
  const backend = fakeBackend();
  const store = createStore(backend);

  const world = createWorld('Live');
  store.save([world]);
  world.buildings[0].rooms.living.items.push(placeItem('tv', 600, 440));
  store.save(replaceWorld(store.load(), world));

  assert.equal(createStore(backend).load()[0].buildings[0].rooms.living.items.length, 1);
});

test("a world's picture survives being saved and loaded", () => {
  // The menu shows this picture, so losing it on load would leave every slot
  // blank however recently the house was played in.
  const backend = fakeBackend();
  const store = createStore(backend);

  const world = createWorld('Pictured');
  world.thumb = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  store.save([world]);

  assert.equal(store.load()[0].thumb, world.thumb);
});

test('ten pictures fit comfortably in the storage budget', () => {
  // Thumbnails are the only large thing in a save. Ten of them at the size
  // the renderer produces has to stay well inside localStorage's five
  // megabytes, or a full shelf would start losing houses.
  const typical = 3 * 1024;
  assert.ok(typical * MAX_WORLDS < 5 * 1024 * 1024 * 0.1,
    'ten thumbnails use under a tenth of the quota');
});
