import test from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { hitTest, tabRow } from '../js/ui/widgets.js';
import { recordingContext, SCREEN, onScreen, MIN_TEXT } from './helpers/recorder.js';
import { stubGame, withDocument, BOOK_TITLE } from './helpers/stubs.js';
import { HOUSE_LAYOUT, MAX_BUILDINGS, createBuilding } from '../js/model/world.js';
import { EDITABLE_PARTS } from '../js/model/character.js';
import { EXTRA_TABS } from '../js/scenes/room.js';
import { CAT_PARTS } from '../js/model/cat.js';
import { createBook } from '../js/model/book.js';

import { createMenu } from '../js/scenes/menu.js';
import { createHouse } from '../js/scenes/house.js';
import { createStreet, WALK_Y } from '../js/scenes/street.js';
import { createExterior } from '../js/scenes/exterior.js';
import { createRoomScene } from '../js/scenes/room.js';
import { createCharacterCreator } from '../js/scenes/charcreator.js';
import { createBookDesigner } from '../js/scenes/bookdesigner.js';
import { createCatCreator } from '../js/scenes/catcreator.js';
import { createRuleBook } from '../js/scenes/rulebook.js';
import { createBoardScene } from '../js/scenes/board.js';
import { createBoard } from '../js/model/board.js';

/**
 * Every scene, in the states it is actually seen in.
 *
 * A scene is built, optionally poked into a state with taps, then drawn under
 * the recording canvas.
 */
function scenes() {
  const cases = [];
  const add = (name, build, options = {}) => cases.push({ name, build, ...options });

  add('the menu with one house', () => createMenu(stubGame()));
  add('the menu with a full shelf', () => {
    const game = stubGame();
    game.worlds = Array.from({ length: 10 }, (_, i) => ({ ...game.world, id: `w${i}`, name: `House ${i + 1}` }));
    return createMenu(game);
  });
  add('the menu with an empty shelf', () => {
    const game = stubGame();
    game.worlds = [];
    return createMenu(game);
  });

  add('the street', () => createStreet(stubGame()));
  add('the street with somebody picked up', () => {
    const game = stubGame();
    const scene = createStreet(game);
    const outside = game.charactersOutside()[0];
    scene.onTap(40 + outside.x, WALK_Y - 40);
    return scene;
  });
  add('a street with every plot taken', () => {
    const game = stubGame();
    while (game.world.buildings.length < MAX_BUILDINGS) {
      game.world.buildings.push(createBuilding(`House ${game.world.buildings.length + 1}`));
    }
    return createStreet(game);
  });
  add('a street with one building on it', () => {
    const game = stubGame();
    game.world.buildings = game.world.buildings.slice(0, 1);
    return createStreet(game);
  });

  add('the house', () => createHouse(stubGame()), { preview: true });
  add('the house with someone picked up', () => {
    const game = stubGame();
    const scene = createHouse(game);
    // Tapping her arms the walk, which is what draws the hint and the buttons.
    const her = game.world.characters[0];
    scene.onTap(...characterPoint(her));
    return scene;
  }, { preview: true });

  for (const roomId of HOUSE_LAYOUT) {
    add(`the ${roomId}`, () => createRoomScene(stubGame(), roomId));
  }
  add('a room with the drawer open', () => {
    const scene = createRoomScene(stubGame(), HOUSE_LAYOUT[0]);
    scene.onTap?.(1240, 676);
    return scene;
  });
  // Every drawer tab, not just the one it opens on. The people tab draws an
  // "add a cat" cell that reached for a variable it could not see, and the
  // whole room scene threw on every frame — but no test ever selected that
  // tab, so the suite stayed green while the game was unusable.
  DRAWER_TABS.forEach((id) => {
    add(`a room with the ${id} drawer open`, () => {
      const scene = createRoomScene(stubGame(), HOUSE_LAYOUT[0]);
      scene.onTap(1240, 676);
      const row = tabRow(DRAWER_TABS.length);
      const i = DRAWER_TABS.indexOf(id);
      scene.onTap(row.at(i) + row.w / 2, row.y + row.h / 2);
      return scene;
    });
  });
  add('a room with an item selected', () => {
    const game = stubGame();
    const scene = createRoomScene(game, HOUSE_LAYOUT[0]);
    const item = game.world.buildings[0].rooms[HOUSE_LAYOUT[0]].items[0];
    scene.onPointerDown(20 + item.x * 1.033, 22 + (item.y - 40) * 1.033);
    scene.onPointerUp(20 + item.x * 1.033, 22 + (item.y - 40) * 1.033);
    return scene;
  });
  add('a room with a character selected', () => {
    const game = stubGame();
    const scene = createRoomScene(game, HOUSE_LAYOUT[0]);
    const her = game.world.characters[0];
    scene.onPointerDown(20 + her.x * 1.033, 22 + (her.y - 150) * 1.033);
    scene.onPointerUp(20 + her.x * 1.033, 22 + (her.y - 150) * 1.033);
    return scene;
  });

  add('the character creator', () => createCharacterCreator(stubGame(), () => {}, () => {}));
  // Every tab, not just the one it opens on. The colour swatches ran five
  // swatches off the side of the screen for a whole release because the
  // creator was only ever checked in its default state, where the swatch row
  // is empty.
  ['looks', ...EDITABLE_PARTS.map((p) => p.key)].forEach((key, index) => {
    add(`the creator's ${key} tab`, () => {
      const scene = createCharacterCreator(stubGame(), () => {}, () => {});
      const tab = scene.allControls().find((c) => c.id === `tab:${index}`);
      scene.onTap(tab.x + tab.w / 2, tab.y + tab.h / 2);
      return scene;
    });
  });
  add('the recipe book', () => createRuleBook(stubGame(), () => {}));

  add('the cat designer', () => createCatCreator(stubGame(), () => {}, () => {}));
  ['looks', ...CAT_PARTS.map((p) => p.key)].forEach((key, index) => {
    add(`the cat designer's ${key} tab`, () => {
      const scene = createCatCreator(stubGame(), () => {}, () => {});
      const tab = scene.allControls().find((c) => c.id === `tab:${index}`);
      scene.onTap(tab.x + tab.w / 2, tab.y + tab.h / 2);
      return scene;
    });
  });

  add('the outside designer', () => withDocument(
    () => createExterior(stubGame(), stubGame().world.buildings[0], () => {}),
  ));
  add('the outside designer on a school', () => withDocument(() => {
    const game = stubGame();
    return createExterior(game, game.world.buildings[1], () => {});
  }));

  add('the book designer', () => withDocument(
    () => createBookDesigner(stubGame(), null, () => {}, () => {}),
  ));

  /*
   * The whiteboard, in the four states it is really seen in.
   *
   * Blank, drawn on, with the rubber picked up, and with no markers at all —
   * the last because a palette with nothing in it is the one state nobody
   * would think to open by hand.
   */
  const boardIn = (roomId = HOUSE_LAYOUT[0]) => {
    const game = stubGame();
    const room = game.world.buildings[0].rooms[roomId];
    const board = room.items.find((i) => i.item === 'whiteboard');
    return { game, room, board };
  };

  add('the board, blank', () => {
    const { game, room, board } = boardIn();
    board.design = createBoard();
    return createBoardScene(game, board, room.items, () => {}, () => {});
  });
  add('the board with a drawing on it', () => {
    const { game, room, board } = boardIn();
    return createBoardScene(game, board, room.items, () => {}, () => {});
  });
  add('the board with the rubber picked up', () => {
    const { game, room, board } = boardIn();
    const scene = createBoardScene(game, board, room.items, () => {}, () => {});
    const rubber = scene.allControls().find((c) => c.id === 'rubber');
    scene.onTap(rubber.x + rubber.w / 2, rubber.y + rubber.h / 2);
    return scene;
  });
  add('the board with no markers anywhere', () => {
    const { game, room, board } = boardIn();
    room.items = room.items.filter((i) => i.item !== 'marker');
    return createBoardScene(game, board, room.items, () => {}, () => {});
  });
  add('a room with the class drawer open at the board', () => createRoomScene(
    stubGame(), HOUSE_LAYOUT[0], { open: true, tab: 'class' },
  ));

  return cases;
}

/**
 * The floor for text painted onto an object in the world rather than on the UI.
 *
 * Zero in the cutaway house: there the whole room is shown at 43%, so a book
 * title is a few pixels of texture on a thumbnail. Nobody reads a book cover
 * in a dolls' house — she taps the room to go in, and reads it there.
 */
const IN_WORLD_TEXT = 8;

/**
 * Titles that are painted on a book rather than written on the interface.
 *
 * The drawer draws a little book in its cell, so the catalogue's own default
 * title turns up as scene text at thumbnail size — art, like the cover of a
 * book standing in a room, not a label anybody is asked to read.
 */
const COVER_TITLES = new Set([BOOK_TITLE, createBook().title]);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Every tab in the room drawer: people, wall, floor, then the categories. */
const DRAWER_TABS = [
  ...EXTRA_TABS.map((t) => t.id),
  ...JSON.parse(readFileSync(join(ROOT, 'assets/catalog.json'), 'utf8')).categories.map((c) => c.id),
];
const IN_WORLD_TEXT_IN_PREVIEW = 0;

/** Where a character stands, in house-view screen coordinates. */
function characterPoint(character) {
  const index = HOUSE_LAYOUT.indexOf(character.room);
  const col = index % 2;
  const row = Math.floor(index / 2);
  const scale = 516 / 1200;
  const x = 85 + 20 + col * (516 + 18) + character.x * scale;
  const y = 168 + 20 + row * (224 + 24) + (character.y - 150) * scale;
  return [x, y];
}

function draw(build) {
  const recorder = recordingContext();
  withDocument(() => build().draw(recorder.ctx));
  return recorder;
}

for (const { name, build, preview } of scenes()) {
  test(`${name} draws nothing off the screen`, () => {
    const recorder = draw(build);
    const strays = recorder.offScreen();
    const worst = strays[0];
    assert.equal(strays.length, 0, worst
      ? `${strays.length} stray shape(s); worst is a ${worst.kind} `
        + `${Math.round(worst.over)}px outside at `
        + `(${Math.round(worst.minX)}, ${Math.round(worst.minY)})–`
        + `(${Math.round(worst.maxX)}, ${Math.round(worst.maxY)})`
      : '');
  });

  test(`${name} sets no text too small to read on the phone`, () => {
    const recorder = draw(build);
    // A title on a book standing in a room is art, not interface: it is sized
    // by the book, and Rotem reads it full-size in the designer. It still has
    // to be legible enough to tell one book from another on a shelf.
    const inWorld = preview ? IN_WORLD_TEXT_IN_PREVIEW : IN_WORLD_TEXT;
    const floorFor = (t) => (COVER_TITLES.has(t.text) ? inWorld : MIN_TEXT);
    const tiny = recorder.texts
      .filter((t) => onScreen(t.drawn) < floorFor(t))
      .map((t) => `"${t.text}" at ${t.drawn.toFixed(1)}px (${onScreen(t.drawn).toFixed(1)}px on the phone)`);
    assert.deepEqual(tiny, [], 'every word is legible');
  });

  test(`${name} actually fills the screen`, () => {
    // A scene that drew one shape in a corner would pass the bounds check and
    // still be broken.
    const b = draw(build).bounds();
    assert.ok(b.maxX - b.minX >= SCREEN.w * 0.6, 'it uses most of the width');
    assert.ok(b.maxY - b.minY >= SCREEN.h * 0.6, 'and most of the height');
  });
}

test('a book title is full size in the designer, where it is meant to be read', () => {
  // The in-world floor above only applies to a book standing in a room. The
  // designer is where she reads and edits it, and there it is interface text.
  const recorder = recordingContext();
  withDocument(() => {
    const design = { cover: 0, pattern: 0, patternColor: 9, titleStyle: 0, titleColor: 9, title: BOOK_TITLE };
    createBookDesigner(stubGame(), design, () => {}, () => {}).draw(recorder.ctx);
  });

  const cover = recorder.texts.filter((t) => t.text === BOOK_TITLE);
  assert.ok(cover.length > 0, 'the title is drawn on the preview');
  for (const t of cover) {
    assert.ok(onScreen(t.drawn) >= MIN_TEXT,
      `the preview title is ${onScreen(t.drawn).toFixed(1)}px on the phone`);
  }
});

/* ------------------------------------------------- controls you can reach */

/** Whatever the scene currently offers as tappable. */
function controlsOf(scene) {
  return typeof scene.allControls === 'function' ? scene.allControls() : (scene.controls ?? []);
}

/**
 * Controls no tap can ever reach.
 *
 * hitTest walks the list backwards, so a control drawn earlier and covered
 * completely by later ones is dead — it renders, it looks tappable, and
 * nothing happens. Sampling the box beats comparing rectangles because
 * overlapping is normal here: the delete button deliberately sits on the
 * corner of the house slot it belongs to.
 */
function unreachable(controls) {
  const dead = [];
  for (const control of controls) {
    let reachable = false;
    for (let i = 1; i <= 5 && !reachable; i += 1) {
      for (let j = 1; j <= 5 && !reachable; j += 1) {
        const x = control.x + (control.w * i) / 6;
        const y = control.y + (control.h * j) / 6;
        if (hitTest(controls, x, y) === control) reachable = true;
      }
    }
    if (!reachable) dead.push(control.id);
  }
  return dead;
}

for (const { name, build } of scenes()) {
  test(`every control in ${name} is on the screen`, () => {
    const strays = withDocument(() => controlsOf(build()))
      .filter((c) => c.x < 0 || c.y < 0 || c.x + c.w > SCREEN.w || c.y + c.h > SCREEN.h)
      .map((c) => `${c.id} at (${Math.round(c.x)}, ${Math.round(c.y)}) ${c.w}x${c.h}`);
    // The wall-decor tab was drawn from x=1270 to x=1368 and could not be
    // tapped at all, so pictures and windows were unreachable in the game.
    assert.deepEqual(strays, [], 'nothing is positioned off the canvas');
  });

  test(`every control in ${name} can be tapped`, () => {
    const controls = withDocument(() => controlsOf(build()));
    assert.deepEqual(unreachable(controls), [], 'nothing is completely covered');
  });
}
