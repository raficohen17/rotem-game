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

import {
  createWorld, createBuilding, placeItem, placeCharacter, placeCat, HOUSE_LAYOUT, STREET,
  WALL_COLORS, FLOOR_COLORS,
} from '../../js/model/world.js';
import { createCharacterSpec } from '../../js/model/character.js';
import { createBook } from '../../js/model/book.js';
import { createCatSpec } from '../../js/model/cat.js';
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
    // The same filter the real catalog applies. Without it the harness drew a
    // drawer the game never shows — with the cooked dishes in it — and
    // reported an overflow that could not happen, while hiding whether the
    // real drawer fits.
    inCategory: (categoryId) => [...byId.values()]
      .filter((i) => i.cat === categoryId && !i.made),
  };
}

/** A world with something in every room, so scenes draw a full house. */
export function stubWorld(name = 'House 1') {
  const world = createWorld(name);
  const catalog = stubCatalog();

  HOUSE_LAYOUT.forEach((roomId, i) => {
    const room = world.buildings[0].rooms[roomId];
    // A floor item, a wall item and a book: the three ways an item is drawn.
    const floor = catalog.items.filter((item) => item.surface !== 'wall');
    const wall = catalog.items.filter((item) => item.surface === 'wall');
    room.items.push(placeItem(floor[i % floor.length].id, 300, 470));
    if (wall.length) room.items.push(placeItem(wall[i % wall.length].id, 800, 220));
    const book = placeItem('book', 620, 470);
    book.design = { ...createBook(), title: BOOK_TITLE };
    room.items.push(book);

    /*
     * A kitchen mid-cook, in every room.
     *
     * The branch that draws a pan's contents and its steam was never once
     * exercised by a test, so a missing function in it took the whole room
     * down and the suite stayed green. Anything with a state the harness never
     * puts it in is a branch nobody is checking.
     */
    const stove = placeItem('stove', 900, 470);
    stove.on = true;
    const pan = placeItem('pan', 900, 470 - 170);
    const egg = placeItem('egg', pan.x, pan.y - 20);
    egg.inside = pan.uid;
    pan.cooked = 5;
    room.items.push(stove, pan, egg);

    // A part-eaten meal and a part-drunk glass, because a level is exactly the
    // kind of state that has shipped twice looking untouched.
    const plate = placeItem('cake', 200, 470);
    plate.left = 2;
    const cup = placeItem('glass', 250, 470);
    cup.holds = 'milk';
    cup.sips = 2;
    const bowl = placeItem('dog_bowl', 380, 470);
    bowl.holds = 'milk';
    bowl.sips = 1;
    room.items.push(plate, cup, bowl, placeItem('milk', 150, 470));

    // A whiteboard with a drawing on it and markers in its tray: the drawing
    // is the only thing in the game that comes from her finger rather than
    // from a menu, and the tray is a container with no door on it.
    const board = placeItem('whiteboard', 640, 250);
    board.design = { strokes: [
      { c: 0, p: [120, 300, 300, 260, 480, 340, 700, 220] },
      { c: 3, p: [200, 700, 520, 640] },
      { c: 1, p: [820, 500] },
    ] };
    room.items.push(board);
    [0, 1, 2].forEach((tint, slot) => {
      const marker = placeItem('marker', 560 + slot * 54, 250);
      marker.tint = tint;
      marker.inside = board.uid;
      room.items.push(marker);
    });

    // And a fridge with something shut inside it.
    const fridge = placeItem('fridge', 1050, 470);
    const stored = placeItem('cake', 1050, 470 - 160);
    stored.inside = fridge.uid;
    room.items.push(fridge, stored);
  });

  const home = world.buildings[0].id;
  world.characters.push({ ...placeCharacter(undefined, HOUSE_LAYOUT[0], 320, 470), building: home });
  world.characters.push({ ...placeCharacter(undefined, HOUSE_LAYOUT[3], 700, 470), building: home });
  // Somebody out on the pavement, because the street is a place people are
  // and not only a set of doors.
  world.characters.push({ ...placeCharacter(undefined, STREET, 300, 512), building: null });

  // A cat in each pose, so the scene harness covers all three drawings.
  world.cats = [
    { ...placeCat(createCatSpec(), HOUSE_LAYOUT[0], 500, 470), pose: 'stand', building: home },
    { ...placeCat(createCatSpec(), HOUSE_LAYOUT[1], 400, 400), pose: 'sit', building: home },
    { ...placeCat(createCatSpec(), HOUSE_LAYOUT[2], 800, 430), pose: 'curl', building: home },
  ];

  // A second building on the street: a school, with a class sitting at desks
  // in one room and a playground in another. Both are states nobody would
  // think to open by hand, and both are what the school is for.
  const school = createBuilding('School', 'school');
  world.buildings.push(school);

  const classroom = school.rooms.living;
  classroom.items.push(placeItem('whiteboard', 620, 250));
  const teacher = { ...placeCharacter({ ...createCharacterSpec(), size: 1 }, 'living', 620, 470),
    building: school.id };
  world.characters.push(teacher);
  [260, 420, 580].forEach((x) => {
    const desk = placeItem('desk_school', x, 470);
    classroom.items.push(desk);
    const pupil = { ...placeCharacter(undefined, 'living', x, 470), building: school.id };
    pupil.using = { uid: desk.uid, action: 'sit' };
    if (x === 420) pupil.hand = true;
    world.characters.push(pupil);
  });

  const playground = school.rooms.kitchen;
  playground.wall = WALL_COLORS[WALL_COLORS.length - 1];
  playground.floor = FLOOR_COLORS[FLOOR_COLORS.length - 1];
  playground.floorStyle = 'grass';
  playground.items.push(placeItem('slide', 300, 470), placeItem('swing', 620, 470),
    placeItem('sandpit', 880, 470), placeItem('ball', 1000, 470));
  return world;
}

export function stubGame(overrides = {}) {
  const world = overrides.world ?? stubWorld();
  // eslint-disable-next-line prefer-const
  const game = {
    catalog: stubCatalog(),
    time: 1.25,
    world,
    building: world.buildings[0],
    worlds: [world],
    pendingSave: false,
    setScene() {},
    persist() {},
    persistSoon() {},
    captureThumb() {},
    goMenu() {},
    openWorld() {},
    openBuilding() {},
    goStreet() {},
    charactersIn: (roomId, buildingId = game.building?.id) => world.characters
      .filter((c) => c.room === roomId && c.building === buildingId),
    catsIn: (roomId, buildingId = game.building?.id) => (world.cats ?? [])
      .filter((c) => c.room === roomId && c.building === buildingId),
    charactersOutside: () => world.characters.filter((c) => c.room === STREET),
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
