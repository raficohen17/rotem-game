/**
 * A class, rather than six children one at a time.
 *
 * Everything else in this game is done to one thing: this cake, that lamp, her.
 * A classroom is the first place where the interesting unit is everybody at
 * once — six children walked to six desks and sat down one by one is furniture
 * removals, and it is the whole reason a room full of desks felt like work.
 *
 * Pure and testable — no canvas, no DOM.
 */

import { useFor, beginUse, stopUsing, isUsing, ACTIONS } from './using.js';
import { isPutAway } from './food.js';

/** Everything in a room that somebody could sit on. */
export function seatsIn(items) {
  return (items ?? []).filter((item) => (
    ACTIONS[useFor(item.item)]?.pose === 'sit' && !isPutAway(item)
  ));
}

/** Who in this room is sitting on something. */
export function seated(characters) {
  return (characters ?? []).filter((c) => ACTIONS[c.using?.action]?.pose === 'sit');
}

/**
 * Sits everybody down, each at a different seat.
 *
 * Nearest first, so a child at the front of the room takes the desk at the
 * front of the room: seating them in the order they happen to be stored put
 * the class in a scramble every time.
 *
 * @returns {number} how many found somewhere to sit
 */
export function seatEveryone(characters, items) {
  const free = seatsIn(items).filter((seat) => (
    !characters.some((c) => c.using?.uid === seat.uid)
  ));
  let sat = 0;

  for (const character of characters) {
    if (isUsing(character)) continue;
    if (!free.length) break;
    // The nearest free seat to where she is already standing.
    let best = 0;
    for (let i = 1; i < free.length; i += 1) {
      if (Math.abs(free[i].x - character.x) < Math.abs(free[best].x - character.x)) best = i;
    }
    const [seat] = free.splice(best, 1);
    if (beginUse(character, seat)) sat += 1;
  }
  return sat;
}

/**
 * Everybody up.
 *
 * Only the ones who are sitting: somebody in the shower stays in the shower,
 * because "sit down, class" is not "stop whatever you are doing".
 */
export function standEveryone(characters) {
  let up = 0;
  for (const character of seated(characters)) {
    stopUsing(character);
    up += 1;
  }
  return up;
}

/**
 * Whether the room is currently sat down.
 *
 * Used to decide which way the one button goes: a class that is seated wants
 * standing up, and one that is standing wants sitting down.
 */
export function isClassSeated(characters, items) {
  const sitting = seated(characters).length;
  if (!sitting) return false;
  const free = seatsIn(items).length - sitting;
  const standing = characters.filter((c) => !isUsing(c)).length;
  // Everybody who could be sitting is sitting.
  return standing === 0 || free <= 0;
}
