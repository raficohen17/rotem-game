/**
 * Getting from one room to another.
 *
 * The house is a 2x2 cutaway, so rooms are not all adjacent: the two on a
 * floor share a doorway through the partition, and the two on the right share
 * a staircase. Walking from the kitchen to the bedroom therefore means going
 * through a door, up the stairs, and through another door — a route, not a
 * jump.
 *
 * Pure and testable: no canvas, no DOM. Given where a character is and where
 * she was sent, it returns the waypoints she should walk through.
 */

import { ROOM_IDS } from './world.js';

/** Room positions in the cutaway: index 0 top-left, 1 top-right, and so on. */
export const HOUSE_GRID = ['bedroom', 'bath', 'living', 'kitchen'];

/** Where a doorway sits in a room, measured from that room's own left edge. */
export const DOOR_INSET = 84;

/** Where the staircase meets each floor, in room coordinates. */
export const STAIR_X = 980;

/**
 * The ways out of each room.
 *
 * `door` links the two rooms on one floor through the partition; `stair` links
 * the two right-hand rooms between floors. Keeping this as data rather than as
 * branching means adding a second staircase later is one more entry.
 */
export const LINKS = [
  { kind: 'door', between: ['bedroom', 'bath'] },
  { kind: 'door', between: ['living', 'kitchen'] },
  { kind: 'stair', between: ['bath', 'kitchen'] },
];

/** Every room reachable in one step, with how you get there. */
export function exitsFrom(roomId) {
  return LINKS.flatMap((link) => {
    const [a, b] = link.between;
    if (a === roomId) return [{ to: b, kind: link.kind }];
    if (b === roomId) return [{ to: a, kind: link.kind }];
    return [];
  });
}

/**
 * The rooms to pass through, from `from` to `to` inclusive.
 * Returns null when there is no route, which should not happen — but a bad
 * saved room id must not hang the walk.
 */
export function routeBetween(from, to) {
  if (!ROOM_IDS.includes(from) || !ROOM_IDS.includes(to)) return null;
  if (from === to) return [from];

  const queue = [[from]];
  const seen = new Set([from]);

  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];

    for (const exit of exitsFrom(last)) {
      if (seen.has(exit.to)) continue;
      const next = [...path, exit.to];
      if (exit.to === to) return next;
      seen.add(exit.to);
      queue.push(next);
    }
  }
  return null;
}

/** Which side of a room the partition is on. */
export function partitionSide(roomId) {
  return HOUSE_GRID.indexOf(roomId) % 2 === 0 ? 'right' : 'left';
}

/**
 * Where a character should stand to use a given exit from a room.
 *
 * @param {number} roomWidth the room's width in its own coordinates
 */
export function exitPoint(roomId, kind, roomWidth) {
  if (kind === 'stair') return STAIR_X;
  return partitionSide(roomId) === 'right' ? roomWidth - DOOR_INSET : DOOR_INSET;
}

/**
 * The full walk: a list of legs, each naming the room it happens in, the x it
 * walks to, and how it leaves at the end.
 *
 * @returns {{room: string, x: number, exit: 'door'|'stair'|null}[]|null}
 */
export function planWalk(fromRoom, toRoom, targetX, roomWidth) {
  const route = routeBetween(fromRoom, toRoom);
  if (!route) return null;

  return route.map((room, i) => {
    const last = i === route.length - 1;
    if (last) return { room, x: targetX, exit: null };

    const next = route[i + 1];
    const link = exitsFrom(room).find((exit) => exit.to === next);
    return { room, x: exitPoint(room, link.kind, roomWidth), exit: link.kind };
  });
}

/** Where a character arrives when she comes through an exit into a room. */
export function arrivalX(roomId, kind, roomWidth) {
  return exitPoint(roomId, kind, roomWidth);
}

/** How fast a character walks, in room units per second. */
export const WALK_SPEED = 240;

/** Starts a character walking to a point in a room. Returns false if unreachable. */
export function beginWalk(character, toRoom, targetX, roomWidth) {
  const legs = planWalk(character.room, toRoom, targetX, roomWidth);
  if (!legs) return false;
  character.walk = { legs, index: 0 };
  return true;
}

/**
 * Advances a walk by one frame.
 *
 * Moves along the current leg, and when it ends either steps through the exit
 * into the next room or finishes. Passing through a doorway is instant because
 * both rooms are on screen at once in the cutaway — she steps out of one and
 * into the other, which is what walking through a door looks like from
 * outside a dolls' house.
 *
 * @returns {boolean} whether the character is still walking
 */
export function stepWalk(character, dt, roomWidth) {
  const walk = character.walk;
  if (!walk) return false;

  const leg = walk.legs[walk.index];
  if (!leg) { delete character.walk; return false; }

  const dx = leg.x - character.x;
  const step = WALK_SPEED * dt;

  if (Math.abs(dx) > step) {
    character.x += Math.sign(dx) * step;
    character.facing = Math.sign(dx);
    return true;
  }

  character.x = leg.x;
  walk.index += 1;

  const next = walk.legs[walk.index];
  if (!next) { delete character.walk; return false; }

  // Through the door, or up the stairs, and on into the next room.
  character.room = next.room;
  character.x = arrivalX(next.room, leg.exit, roomWidth);
  character.facing = Math.sign(next.x - character.x) || 1;
  return true;
}

/** True while the character is mid-journey, for the walking animation. */
export function isWalking(character) {
  return Boolean(character.walk);
}
