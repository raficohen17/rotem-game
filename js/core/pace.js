/**
 * How often the game bothers to draw.
 *
 * A dolls' house does not need sixty frames a second. Everything in it moves
 * slowly, and most of the time nothing moves at all: nobody is walking,
 * nothing is cooking, and the only change from one frame to the next is a
 * breath that takes three seconds to finish.
 *
 * So there are two rates. The fast one is for while something is happening —
 * somebody walking, a cat crossing a room, a finger on the glass. The slow one
 * is for a still house, where half the frames look identical to each other and
 * the phone spends the difference on staying cool.
 *
 * Pure and testable — no canvas, no clock. Which matters more than usual here:
 * this is the one piece of the game that decides whether anything gets drawn
 * at all, and it cannot be measured from outside while a browser tab is hidden.
 */

/** Seconds between frames while something is happening. */
export const BUSY_GAP = 1 / 32;

/** Seconds between frames while nothing is. */
export const IDLE_GAP = 1 / 16;

/** How long a touch keeps the game at the fast rate. */
export const STIRRED = 0.7;

/**
 * Whether enough time has passed to be worth drawing again.
 *
 * @param {number} sinceDraw seconds since the last drawn frame
 * @param {boolean} busy whether anything is moving or being touched
 */
export function readyToDraw(sinceDraw, busy) {
  return sinceDraw >= (busy ? BUSY_GAP : IDLE_GAP);
}

/**
 * Whether the game should be at the fast rate right now.
 *
 * @param {boolean} moving anything the world is doing by itself
 * @param {number} now the game clock
 * @param {number} touchedUntil when the last touch stops counting
 */
export function isBusy(moving, now, touchedUntil) {
  return Boolean(moving) || now < touchedUntil;
}
