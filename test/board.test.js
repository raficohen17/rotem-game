/**
 * The whiteboard.
 *
 * The first thing in the game that keeps a line she drew rather than a choice
 * she picked, and the first that is meant to be undone — so most of this is
 * about erasing, about what a save can hold, and about a board that has been
 * emptied still being a board.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  MARKER_COLORS, GRID, MAX_STROKES, MAX_POINTS, MIN_STEP, RUB, TRAY_STOCK, FACE,
  createBoard, isBlank, hasRoom, startStroke, extendStroke, eraseAt, wipe,
  clampBoard, markerColors, traySpot,
} from '../js/model/board.js';
import { createWorld, repairWorld, placeItem } from '../js/model/world.js';
import { useFor, canUse, beginUse, ACTIONS } from '../js/model/using.js';
import { createRoomScene } from '../js/scenes/room.js';
import { stubGame } from './helpers/stubs.js';
import { HOUSE_LAYOUT } from '../js/model/world.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'assets/catalog.json'), 'utf8'));
const lookup = (id) => catalog.items.find((i) => i.id === id);

/** A stroke drawn across the board, in as many points as asked for. */
function scribble(board, color = 0, points = 6, y = 500) {
  startStroke(board, color, 100, y);
  for (let i = 1; i < points; i += 1) extendStroke(board, 100 + i * 60, y);
}

test('the board, the markers and the rubber are all real items', () => {
  for (const id of ['whiteboard', 'marker', 'rubber']) {
    assert.ok(lookup(id), `${id} can be taken from a drawer`);
  }
  assert.equal(lookup('whiteboard').surface, 'wall', 'the board hangs on the wall');
  assert.equal(lookup('marker').colors.length, MARKER_COLORS.length,
    'every marker colour can be drawn with');
});

test('a new board is blank', () => {
  const board = createBoard();
  assert.equal(isBlank(board), true);
  assert.equal(hasRoom(board), true);
});

test('a line drawn is a line kept', () => {
  const board = createBoard();
  scribble(board, 2, 5);
  assert.equal(board.strokes.length, 1);
  assert.equal(board.strokes[0].c, 2, 'in the colour of the marker');
  assert.equal(board.strokes[0].p.length, 10, 'five points, x and y each');
  assert.equal(isBlank(board), false);
});

test('a finger resting still does not fill the board with points', () => {
  const board = createBoard();
  startStroke(board, 0, 400, 400);
  for (let i = 0; i < 30; i += 1) extendStroke(board, 400 + i * 0.2, 400);
  assert.equal(board.strokes[0].p.length, 2, 'nothing moved, so nothing was added');

  assert.equal(extendStroke(board, 400 + MIN_STEP + 2, 400), true, 'a real move counts');
});

test('a dot is a stroke a child meant to draw', () => {
  const board = createBoard();
  startStroke(board, 1, 500, 500);
  const back = clampBoard(JSON.parse(JSON.stringify(board)));
  assert.equal(back.strokes.length, 1, 'and it survives being saved');
});

test('the rubber takes out the line it is dragged across', () => {
  const board = createBoard();
  scribble(board, 0, 5, 200);
  scribble(board, 1, 5, 800);

  assert.equal(eraseAt(board, 160, 200, RUB), true);
  assert.equal(board.strokes.length, 1, 'one line gone');
  assert.equal(board.strokes[0].c, 1, 'and the other one is not');
});

test('the rubber passing nowhere near a line leaves it alone', () => {
  const board = createBoard();
  scribble(board, 0, 5, 200);
  assert.equal(eraseAt(board, 500, 900, RUB), false);
  assert.equal(board.strokes.length, 1);
});

test('a wiped board is still a board', () => {
  const board = createBoard();
  scribble(board);
  assert.equal(wipe(board), true);
  assert.equal(isBlank(board), true);
  assert.equal(hasRoom(board), true, 'and can be drawn on again at once');
  startStroke(board, 0, 100, 100);
  assert.equal(board.strokes.length, 1);
});

test('a board cannot grow until the save breaks', () => {
  const board = createBoard();
  for (let i = 0; i < MAX_STROKES + 20; i += 1) startStroke(board, 0, i, i);
  assert.equal(board.strokes.length, MAX_STROKES, 'it holds what it holds');
  assert.equal(hasRoom(board), false, 'and says so');

  const long = createBoard();
  startStroke(long, 0, 0, 0);
  for (let i = 1; i < MAX_POINTS + 50; i += 1) extendStroke(long, i * MIN_STEP * 2, 500);
  assert.ok(long.strokes[0].p.length <= MAX_POINTS * 2, 'and no one line runs away');
});

test('a full board is not a broken one', () => {
  // The wipe is right there, so a board that has stopped taking lines is a
  // board to clear rather than an item that has failed.
  const board = createBoard();
  for (let i = 0; i < MAX_STROKES; i += 1) startStroke(board, 0, i, i);
  assert.equal(startStroke(board, 0, 1, 1), false, 'nothing more goes on');
  wipe(board);
  assert.equal(startStroke(board, 0, 1, 1), true, 'until it is wiped');
});

test('a damaged drawing comes back as a blank board', () => {
  for (const bad of [null, undefined, 'scribble', 42, { strokes: 'lots' }]) {
    assert.deepEqual(clampBoard(bad), { strokes: [] }, `${JSON.stringify(bad)} is blank`);
  }
});

test('a drawing loaded back is forced onto the board', () => {
  const back = clampBoard({
    strokes: [
      { c: 99, p: [-500, 5000, 200, 200] },
      { c: 1, p: [Number.NaN, 3] },
      { c: 2, p: [] },
    ],
  });
  assert.equal(back.strokes.length, 1, 'only what is drawable is kept');
  assert.equal(back.strokes[0].c, 0, 'a colour she does not have becomes black');
  assert.deepEqual(back.strokes[0].p, [0, GRID, 200, 200], 'and the points are on the board');
});

test('the drawing survives a save', () => {
  const world = createWorld('House 1');
  const board = placeItem('whiteboard', 600, 300);
  board.design = createBoard();
  scribble(board.design, 3, 4);
  world.buildings[0].rooms.bedroom.items.push(board);

  const back = repairWorld(JSON.parse(JSON.stringify(world)));
  const saved = back.buildings[0].rooms.bedroom.items.at(-1);
  assert.deepEqual(saved.design, board.design, 'stroke for stroke');
});

test('a board is not repaired as if it were a book', () => {
  // Every design in the game used to go through the book repair, which hands
  // back a cover — so a board saved that way came back as a blank cover and
  // the drawing was gone.
  const world = createWorld('House 1');
  const board = placeItem('whiteboard', 600, 300);
  board.design = createBoard();
  scribble(board.design);
  const book = placeItem('book', 300, 470);
  world.buildings[0].rooms.bedroom.items.push(board, book);

  const back = repairWorld(JSON.parse(JSON.stringify(world)));
  const savedBoard = back.buildings[0].rooms.bedroom.items.find((i) => i.item === 'whiteboard');
  assert.ok(savedBoard.design.strokes.length, 'the board kept its drawing');
  assert.equal('cover' in savedBoard.design, false, 'and was not given a cover');
});

/* ------------------------------------------------------------- the markers */

test('the colours are the markers in the room', () => {
  const red = placeItem('marker', 100, 470);
  red.tint = 1;
  const green = placeItem('marker', 140, 470);
  green.tint = 3;
  assert.deepEqual(markerColors([red, green, placeItem('cake', 0, 0)]), [1, 3]);
});

test('two of the same colour are one colour', () => {
  const a = placeItem('marker', 100, 470);
  const b = placeItem('marker', 140, 470);
  a.tint = 2;
  b.tint = 2;
  assert.deepEqual(markerColors([a, b]), [2]);
});

test('no markers means no colours, not a black one by default', () => {
  assert.deepEqual(markerColors([placeItem('cake', 0, 0)]), []);
  assert.deepEqual(markerColors([]), []);
  assert.deepEqual(markerColors(null), []);
});

test('a board arrives with markers in more than one colour', () => {
  assert.ok(TRAY_STOCK.length >= 2, 'so there is a choice from the first tap');
  assert.equal(new Set(TRAY_STOCK).size, TRAY_STOCK.length, 'and no two the same');
  for (const tint of TRAY_STOCK) {
    assert.ok(tint >= 0 && tint < MARKER_COLORS.length, `${tint} is a real colour`);
  }
});

test('the tray is on the board, and each marker has its own place in it', () => {
  const board = placeItem('whiteboard', 600, 300);
  const def = lookup('whiteboard');
  const spots = TRAY_STOCK.map((_, i) => traySpot(board, def, i));

  const xs = spots.map((s) => s.x);
  assert.deepEqual(xs, [...xs].sort((a, b) => a - b), 'they sit in a row');
  assert.equal(new Set(xs).size, xs.length, 'and not all in one place');
  for (const spot of spots) {
    assert.ok(Math.abs(spot.x - board.x) < def.w / 2, 'inside the board');
    assert.ok(spot.y > board.y - def.h && spot.y <= board.y, 'and on it, not above it');
  }
});

/* -------------------------------------------------------------- at the board */

test('a character can be sent to write at the board', () => {
  const board = placeItem('whiteboard', 600, 240);
  assert.equal(useFor('whiteboard'), 'write');
  assert.equal(canUse(board), true);

  const her = { x: 400, y: 470 };
  beginUse(her, board);
  assert.equal(her.x, 600, 'she goes to the board');
  assert.equal(her.y, 470, 'and stays on the floor rather than up the wall');
  assert.equal(her.using.action, 'write');
});

test('the board face used by the room is the one she draws on', () => {
  // The scene and the artwork both take the face from the model. Two copies
  // of these numbers means a line in the corner full screen lands somewhere
  // else on the wall.
  const art = readFileSync(join(ROOT, 'js/render/placeholders.js'), 'utf8');
  const render = readFileSync(join(ROOT, 'js/render/board.js'), 'utf8');
  assert.match(art, /FACE\.x/, 'the artwork insets the face by the shared numbers');
  assert.match(render, /FACE/, 'and so does what draws on it');
  for (const key of ['x', 'y', 'w', 'h']) {
    assert.ok(FACE[key] > 0 && FACE[key] <= 1, `FACE.${key} is a fraction of the board`);
  }
  assert.ok(FACE.y + FACE.h < 1, 'and the tray is below the drawable part');
});

test('writing is an action with a button of its own', () => {
  assert.equal(ACTIONS.write.icon, 'marker');
  assert.equal(ACTIONS.write.atWall, true, 'used from the floor in front of it');
  assert.equal(ACTIONS.write.carried, false, 'the board stays on the wall');
});

test('the rubber takes out a line it crosses between two points', () => {
  // A quick stroke is stored as a few points a long way apart. Measuring to
  // the points rather than to the line meant rubbing at the middle of a long
  // line did nothing, which is indistinguishable from a broken rubber.
  const board = createBoard();
  startStroke(board, 0, 100, 100);
  extendStroke(board, 900, 900);
  assert.equal(board.strokes[0].p.length, 4, 'two points, far apart');

  assert.equal(eraseAt(board, 500, 500, RUB), true, 'the middle of the line is the line');
  assert.equal(board.strokes.length, 0);
});

test('the rubber still misses a line it is nowhere near', () => {
  const board = createBoard();
  startStroke(board, 0, 100, 100);
  extendStroke(board, 900, 100);
  assert.equal(eraseAt(board, 500, 900, RUB), false, 'well below it');
  assert.equal(eraseAt(board, 100 - RUB * 3, 100, RUB), false, 'and off the end of it');
  assert.equal(board.strokes.length, 1);
});

test('she uses the thing she is standing at, not the first one in the room', () => {
  // Whichever item happened to be earlier in the list won, so standing at the
  // board with a glass on a table behind her had her drinking the milk.
  const game = stubGame();
  const roomId = HOUSE_LAYOUT[0];
  const room = game.world.buildings[0].rooms[roomId];
  const board = room.items.find((i) => i.item === 'whiteboard');
  const her = game.world.characters.find((c) => c.room === roomId);
  her.x = board.x;
  delete her.using;

  const scene = createRoomScene(game, roomId);
  scene.onPointerDown(20 + her.x * 1.033, 22 + (her.y - 150) * 1.033);
  scene.onPointerUp(20 + her.x * 1.033, 22 + (her.y - 150) * 1.033);
  const use = scene.allControls().find((c) => c.id === 'use');
  assert.ok(use, 'there is something to use');
  scene.onTap(use.x + use.w / 2, use.y + use.h / 2);

  assert.equal(her.using?.uid, board.uid, 'she went to the board');
  assert.equal(her.using?.action, 'write');
});

test('a marker dropped on the board goes in its tray, and comes out again', () => {
  const game = stubGame();
  const roomId = HOUSE_LAYOUT[0];
  const room = game.world.buildings[0].rooms[roomId];
  const board = room.items.find((i) => i.item === 'whiteboard');
  // Clear of the furniture the stub room is full of, so the drag picks it up.
  const loose = placeItem('marker', 470, 470);
  loose.tint = 5;
  room.items.push(loose);

  const scene = createRoomScene(game, roomId);
  const at = (x, y) => [20 + x * 1.033, 22 + y * 1.033];
  scene.onPointerDown(...at(loose.x, loose.y - 20));
  scene.onPointerMove(...at(board.x, board.y - 60));
  scene.onPointerUp(...at(board.x, board.y - 60));
  assert.equal(loose.inside, board.uid, 'it is in the tray');

  scene.onPointerDown(...at(loose.x, loose.y - 20));
  scene.onPointerMove(...at(300, 470));
  scene.onPointerUp(...at(300, 470));
  assert.equal('inside' in loose, false, 'and it comes out again');
  assert.ok(loose.y > board.y, 'back down on the floor');
});

test('markers travel with the board they are in', () => {
  const game = stubGame();
  const roomId = HOUSE_LAYOUT[0];
  const room = game.world.buildings[0].rooms[roomId];
  const board = room.items.find((i) => i.item === 'whiteboard');
  const markers = room.items.filter((i) => i.inside === board.uid);
  assert.ok(markers.length, 'there are markers in the tray');

  const scene = createRoomScene(game, roomId);
  const at = (x, y) => [20 + x * 1.033, 22 + y * 1.033];
  scene.onPointerDown(...at(board.x, board.y - 100));
  scene.onPointerMove(...at(board.x - 200, board.y - 100));
  scene.onPointerUp(...at(board.x - 200, board.y - 100));

  for (const marker of markers) {
    assert.ok(Math.abs(marker.x - board.x) < 200,
      'the marker went with the board rather than staying on the wall behind it');
  }
});
