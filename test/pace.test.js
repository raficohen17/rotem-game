/**
 * How often the game draws.
 *
 * This is the one piece that decides whether anything is drawn at all, and it
 * cannot be watched from outside: a browser tab that is not on screen stops
 * calling for frames altogether, which is exactly how a working game came to
 * look like a game stuck on its loading screen. So it is tested here, where
 * there is no tab to be hidden.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { readyToDraw, isBusy, BUSY_GAP, IDLE_GAP, STIRRED } from '../js/core/pace.js';

test('a still house is drawn at half the rate of a busy one', () => {
  assert.ok(IDLE_GAP > BUSY_GAP, 'the idle gap is the longer wait');
  assert.equal(IDLE_GAP / BUSY_GAP, 2, 'and it is half the frames, not a tenth');
});

test('the fast rate is fast enough to read as movement', () => {
  // Thirty frames a second is what a walk has to be drawn at to look like
  // walking rather than like stepping.
  assert.ok(1 / BUSY_GAP >= 30, `${(1 / BUSY_GAP).toFixed(0)} frames a second`);
});

test('the slow rate still animates rather than freezing', () => {
  // A frozen character is a dead one. Sixteen a second is a slow breath drawn
  // smoothly; it is the frame count that drops, not the animation.
  assert.ok(1 / IDLE_GAP >= 15, `${(1 / IDLE_GAP).toFixed(0)} frames a second`);
});

test('nothing is drawn twice in the same instant', () => {
  assert.equal(readyToDraw(0, true), false);
  assert.equal(readyToDraw(0, false), false);
});

test('a busy frame comes round sooner than an idle one', () => {
  const between = (BUSY_GAP + IDLE_GAP) / 2;
  assert.equal(readyToDraw(between, true), true, 'busy: draw it');
  assert.equal(readyToDraw(between, false), false, 'idle: wait a little longer');
});

test('both rates do eventually draw', () => {
  assert.equal(readyToDraw(IDLE_GAP, false), true);
  assert.equal(readyToDraw(BUSY_GAP, true), true);
});

test('anything the world does by itself counts as busy', () => {
  // Somebody walking, a cat crossing a room, an omelette finishing.
  assert.equal(isBusy(true, 10, 0), true);
});

test('a touch keeps it fast for a moment afterwards', () => {
  const touchedUntil = 10 + STIRRED;
  assert.equal(isBusy(false, 10, touchedUntil), true, 'during');
  assert.equal(isBusy(false, 10 + STIRRED - 0.01, touchedUntil), true, 'just before it lapses');
  assert.equal(isBusy(false, 10 + STIRRED, touchedUntil), false, 'and then it is still again');
});

test('a still, untouched house is not busy', () => {
  assert.equal(isBusy(false, 100, 0), false);
});

test('the touch grace is long enough to cover a drag between two moves', () => {
  // A finger dragging a sofa fires moves in bursts; a grace shorter than the
  // gaps between them would drop the drag to the slow rate mid-gesture.
  assert.ok(STIRRED >= 0.5, `${STIRRED}s`);
});
