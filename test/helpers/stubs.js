/**
 * The least game a scene needs in order to draw itself.
 *
 * Scenes take a `game` and reach back into it for the world, the catalog and
 * the clock. None of that needs a browser, so a plain object is enough to run
 * a real draw() under the recording canvas.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createWorld, placeItem, placeCharacter, HOUSE_LAYOUT } from '../../js/model/world.js';
import { createBook } from '../../js/model/book.js';
import { recordingContext } from './recorder.js';

/** Distinctive and one word, so it never wraps into lines a test cannot match. */
export const BOOK_TITLE = 'Bookish';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const raw = JSON.parse(readFileSync(join(ROOT, 'assets/catalog.json'), 'utf8'));

/** The same shape loadCatalog builds, minus the images. */
export function stubCatalog() {
  const byId = new Map();
  for (const item of raw.items) {
    byId.set(item.id, {
      ...item,
      surface: item.surface || 'floor',
      colors: item.colors?.length ? item.colors : ['#c98f5f'],
      image: null,
    });
  }
  return {
    categories: raw.categories,
    items: [...byId.values()],
    get: (id) => byId.get(id),
    inCategory: (categoryId) => [...byId.values()].filter((i) => i.cat === categoryId),
  };
}

/** A world with something in every room, so scenes draw a full house. */
export function stubWorld(name = 'House 1') {
  const world = createWorld(name);
  const catalog = stubCatalog();

  HOUSE_LAYOUT.forEach((roomId, i) => {
    const room = world.rooms[roomId];
    // A floor item, a wall item and a book: the three ways an item is drawn.
    const floor = catalog.items.filter((item) => item.surface !== 'wall');
    const wall = catalog.items.filter((item) => item.surface === 'wall');
    room.items.push(placeItem(floor[i % floor.length].id, 300, 470));
    if (wall.length) room.items.push(placeItem(wall[i % wall.length].id, 800, 220));
    const book = placeItem('book', 620, 470);
    book.design = { ...createBook(), title: BOOK_TITLE };
    room.items.push(book);
  });

  world.characters.push(placeCharacter(undefined, HOUSE_LAYOUT[0], 320, 470));
  world.characters.push(placeCharacter(undefined, HOUSE_LAYOUT[3], 700, 470));
  return world;
}

export function stubGame(overrides = {}) {
  const world = overrides.world ?? stubWorld();
  const game = {
    catalog: stubCatalog(),
    time: 1.25,
    world,
    worlds: [world],
    pendingSave: false,
    setScene() {},
    persist() {},
    persistSoon() {},
    captureThumb() {},
    goMenu() {},
    openWorld() {},
    charactersIn: (roomId) => world.characters.filter((c) => c.room === roomId),
    ...overrides,
  };
  return game;
}

/**
 * A canvas for code that renders to an offscreen tile.
 *
 * The character creator draws each option cell once into its own canvas and
 * blits it after that, so a scene running under the recorder needs somewhere
 * for those tiles to go. What the tile contains is not recorded — the scene
 * only ever puts it on screen with one drawImage, and that is what the
 * scene-wide checks are about. Cell contents are covered by the character
 * tests instead.
 */
function stubCanvas() {
  return {
    width: 0,
    height: 0,
    getContext: () => recordingContext().ctx,
    toDataURL: () => 'data:,',
  };
}

/**
 * The book designer builds a hidden input to raise the phone's keyboard, so it
 * needs just enough DOM to get through its constructor.
 */
export function withDocument(run) {
  const had = 'document' in globalThis;
  const previous = globalThis.document;
  globalThis.document = {
    createElement: (tag) => (tag === 'canvas' ? stubCanvas() : {
      style: {},
      value: '',
      setAttribute() {},
      addEventListener() {},
      removeEventListener() {},
      remove() {},
      focus() {},
      blur() {},
      setSelectionRange() {},
    }),
    body: { appendChild() {}, removeChild() {} },
  };
  try {
    return run();
  } finally {
    if (had) globalThis.document = previous;
    else delete globalThis.document;
  }
}
