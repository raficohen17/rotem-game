/**
 * Drawing to the size it is drawn at.
 *
 * Two rules decide whether a piece of detail is painted: how big it is, and —
 * for texture, which is drawn in lines rather than shapes — how thick the line
 * is. Both have to say yes at the size a room is played at and no at the size
 * four rooms are shown at, or they are either useless or vandalism.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { worthDrawing, worthStroking } from '../js/render/shapes.js';

/** A canvas pretending to be scaled by `scale`. */
const at = (scale) => ({ getTransform: () => ({ a: scale, b: 0 }) });

/* What the game really draws at: a room fills the screen, the cutaway shows
   four of them, and a thumbnail is a picture of a whole house. */
const ROOM = 0.858;
const CUTAWAY = 0.858 * 0.43;
const THUMB = 0.06;

test('a canvas with no transform is told to draw everything', () => {
  // The test harness records what is drawn to check it; hiding detail from it
  // would mean the checks stop seeing what ships.
  assert.equal(worthDrawing({}, 1), true);
  assert.equal(worthStroking({}, 0.1), true);
});

test('detail on a book spine survives a room and not a cutaway', () => {
  const book = 14;
  assert.equal(worthDrawing(at(ROOM), book), true, 'a room shows the books');
  assert.equal(worthDrawing(at(CUTAWAY), book), false, 'the cutaway does not');
});

test('wood grain survives a room and not a cutaway', () => {
  const grain = 1.6;
  assert.equal(worthStroking(at(ROOM), grain), true);
  assert.equal(worthStroking(at(CUTAWAY), grain), false);
});

test('a whisker survives a room and not a cutaway', () => {
  const whisker = 1.2;
  assert.equal(worthStroking(at(ROOM), whisker), true);
  assert.equal(worthStroking(at(CUTAWAY), whisker), false);
});

test('nothing fine survives a thumbnail', () => {
  assert.equal(worthDrawing(at(THUMB), 20), false);
  assert.equal(worthStroking(at(THUMB), 3), false);
});

test('something big is drawn however small the picture is', () => {
  // The rule is about detail, not about objects: a sofa is still a sofa.
  assert.equal(worthDrawing(at(THUMB), 200), true);
});

test('a flipped item is measured by its size, not its sign', () => {
  // Items are flipped by scaling by a negative number, and a negative size
  // would have read as "too small" and quietly dropped every detail.
  assert.equal(worthDrawing({ getTransform: () => ({ a: -ROOM, b: 0 }) }, 14), true);
  assert.equal(worthStroking({ getTransform: () => ({ a: -ROOM, b: 0 }) }, 1.6), true);
});
