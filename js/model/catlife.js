/**
 * What a cat does with itself.
 *
 * A cat is the first inhabitant Rotem does not control, which is the whole
 * point of having one: it sits where it likes, and you come back and it has
 * moved. So it needs to choose — and it needs to choose *rarely*, because a
 * pet pacing about the corner of a room being decorated is a distraction
 * rather than company.
 *
 * The cost rule: a cat does no work on a frame where it is not deciding. It
 * carries the time of its next decision and a frame compares one number. Only
 * when that passes does it look at the room, which is a handful of array
 * operations, once a minute, per cat. Between decisions a cat is as cheap to
 * have as a piece of furniture.
 *
 * Pure and testable — no canvas, no DOM, no clock of its own. The caller
 * passes the time in, which is also what makes the intervals testable.
 */
import { beginWalk, routeBetween } from './travel.js';
import { catEats, hasFoodLeft, biteFrom } from './food.js';
import { catWouldDrink, sipFrom } from './drink.js';



/**
 * How long between one cat's decisions, in seconds.
 *
 * A few seconds either side of twenty rather than exactly twenty, so that two
 * cats made at the same moment do not check on the same frame for ever after —
 * which reads as one scripted event rather than as two animals.
 */
export const SETTLE_MIN = 18;
export const SETTLE_MAX = 22;

/**
 * How likely it is to simply stay where it is when the time comes.
 *
 * Half. So it moves every forty seconds on average, and the gaps are uneven,
 * which is what stops it looking like a metronome.
 */
export const STAY_CHANCE = 0.5;

/**
 * How often a move is to a different room rather than across this one.
 *
 * Half. At a quarter, a room change needed three things to line up — due, and
 * moving, and wandering — which came to one decision in eight, and whole
 * five-minute stretches passed with the cat sitting exactly where it was. That
 * is indistinguishable from a broken cat to somebody watching it.
 */
export const WANDER_CHANCE = 0.5;

/**
 * What a cat will get onto.
 *
 * Keyed by catalog id rather than by category, because a cat sits on a table
 * and not on a fridge, and both are furniture. A cat on the cooker is a joke
 * that stops being funny the second time.
 */
export const PERCHES = new Set([
  'sofa', 'armchair', 'chair', 'stool', 'beanbag',
  'bed_single', 'bed_double', 'crib', 'cushion',
  'table_dining', 'table_coffee', 'desk', 'nightstand',
  'bookshelf', 'dresser', 'toybox',
  'cat_bed', 'cat_tower', 'rug_round',
]);

/** How a cat sits on each kind of thing. A cat in its own bed curls up. */
const CURL_ON = new Set(['cat_bed', 'cushion', 'bed_single', 'bed_double', 'crib', 'beanbag']);

/**
 * How far up each thing a cat actually rests, as a fraction of its height.
 *
 * Not the top of the box. A sofa's box includes its backrest, so a cat placed
 * at the top of it sits in the air above the cushions rather than on them —
 * which is exactly what it looked like. A table is the other way round: its
 * top *is* the surface, so a cat goes on 1.
 */
const PERCH_LEVEL = {
  sofa: 0.46,
  armchair: 0.46,
  chair: 0.44,
  stool: 1,
  beanbag: 0.66,
  bed_single: 0.62,
  bed_double: 0.62,
  crib: 0.72,
  cushion: 0.85,
  table_dining: 1,
  table_coffee: 1,
  desk: 1,
  nightstand: 1,
  bookshelf: 1,
  dresser: 1,
  toybox: 1,
  cat_bed: 0.75,
  cat_tower: 1,
  // A rug is a place on the floor, not a thing to climb.
  rug_round: 0,
};

/**
 * Food a cat would rob, in its room and out in the open.
 *
 * Checked before furniture, because a cat that walks past a steak to sit on a
 * stool is not a cat. Anything shut in the fridge is not out in the open and so
 * is not on the list, which is what makes putting the cake away a decision
 * worth making rather than a thing the game does for her.
 */
export function foodWithinReach(items) {
  return items.filter((item) => (
    item.inside === undefined && catEats(item.item) && hasFoodLeft(item)
  ));
}

/**
 * Milk a cat would drink, which means milk in a bowl on the floor.
 *
 * A cat does not drink out of her glass. Putting the milk in the bowl is the
 * whole decision, and it is one she makes by choosing a bowl rather than by
 * being told anywhere.
 */
export function drinkWithinReach(items) {
  return items.filter((item) => item.inside === undefined && catWouldDrink(item));
}

/** Where the top of a cat's paws goes when it settles on this item. */
export function perchLevel(itemId) {
  return PERCH_LEVEL[itemId] ?? 1;
}

export function isPerch(item) {
  return Boolean(item) && PERCHES.has(item.item);
}

/**
 * When this cat should next think.
 *
 * Spread out rather than fixed, so several cats in a house do not all move at
 * the same instant — which reads as a scripted event rather than as animals.
 */
export function nextDecisionAt(now, roll = Math.random()) {
  return now + SETTLE_MIN + roll * (SETTLE_MAX - SETTLE_MIN);
}

/** Whether it is time for this cat to think again. */
export function isDue(cat, now) {
  return !cat || typeof cat.dueAt !== 'number' || now >= cat.dueAt;
}

/**
 * Picks somewhere for a cat to be.
 *
 * Only ever looks at the items in its own room. Returns null for "stay where
 * you are", which is a real answer and not a failure — a cat that always moves
 * when asked is a cat that never settles.
 *
 * @param {object[]} items the items in the cat's room
 * @param {() => number} random injected, so a test can decide what it picks
 */
export function chooseSpot(items, lookup, random = Math.random, alreadyDecided = false) {
  if (!alreadyDecided && random() < STAY_CHANCE) return null;

  const perches = [];
  for (const item of items) {
    if (!isPerch(item)) continue;
    const def = lookup(item.item);
    if (!def) continue;
    const height = (item.h ?? def.h) * (item.scale ?? 1);
    perches.push({
      item,
      x: item.x,
      y: item.y - height * perchLevel(item.item),
      pose: CURL_ON.has(item.item) ? 'curl' : 'sit',
    });
  }

  if (!perches.length) return null;
  return perches[Math.min(perches.length - 1, Math.floor(random() * perches.length))];
}

/**
 * Picks another room to wander off to, or null to stay on this floor plan.
 *
 * @param {string[]} rooms every room in the house
 */
export function chooseRoom(from, rooms, random = Math.random) {
  const elsewhere = rooms.filter((id) => id !== from && routeBetween(from, id)?.length);
  if (!elsewhere.length) return null;
  return elsewhere[Math.min(elsewhere.length - 1, Math.floor(random() * elsewhere.length))];
}

/**
 * Moves a cat on by one decision, if one is due.
 *
 * Returns true when something changed, so the caller knows whether the world
 * is worth saving. On a frame where nothing is due this is one comparison and
 * an early return, which is the entire performance argument.
 *
 * @param {object} world optional — the rooms and the floor, so it can wander
 */
export function stepCat(cat, items, lookup, now, random = Math.random, world = null) {
  if (!isDue(cat, now)) return false;
  // Already on its way somewhere; let it get there before it thinks again.
  if (cat.walk) return false;

  cat.dueAt = nextDecisionAt(now, random());
  if (random() < STAY_CHANCE) return true; // it thought about it and stayed

  // Something to eat or drink beats anything to sit on.
  const meals = [...foodWithinReach(items), ...drinkWithinReach(items)];
  if (meals.length) {
    const meal = meals[Math.min(meals.length - 1, Math.floor(random() * meals.length))];
    const def = lookup(meal.item);
    const height = def ? (meal.h ?? def.h) * (meal.scale ?? 1) : 0;
    cat.x = meal.x;
    cat.y = meal.y - (meal.onSurface ?? 0);
    cat.pose = 'stand';
    delete cat.on;
    if (catWouldDrink(meal)) sipFrom(meal);
    else biteFrom(meal);
    void height;
    return true;
  }

  // Off to another room, now and then.
  if (world && random() < WANDER_CHANCE) {
    const room = chooseRoom(cat.room, world.rooms, random);
    if (room) {
      setDown(cat, world.floorY);
      beginWalk(cat, room, world.width / 2, world.width);
      return true;
    }
  }

  const spot = chooseSpot(items, lookup, random, true);
  if (!spot) return true;

  cat.x = spot.x;
  cat.y = spot.y;
  cat.pose = spot.pose;
  cat.on = spot.item.uid;
  return true;
}

/** Puts a cat on the floor, which is where one starts and where it lands. */
export function setDown(cat, floorY) {
  cat.y = floorY;
  cat.pose = 'stand';
  delete cat.on;
  return cat;
}
