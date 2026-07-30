/**
 * Food.
 *
 * The first thing in the house that runs out. A shower can be showered in for
 * ever and a bed slept in every night, but a cake has a number of slices and
 * each one eaten is gone — so this is the only object whose state travels in
 * one direction.
 *
 * Pure and testable — no canvas, no DOM.
 */

/**
 * What there is to eat, and how many goes it takes.
 *
 * `catEats` is the interesting field. A cat cannot taste sweetness at all — it
 * is the one mammal missing the receptor — so it will rob a steak and walk
 * straight past a cake. That is true, and it is exactly the sort of thing worth
 * putting in a game a child plays.
 */
export const FOODS = {
  cake: { portions: 4, catEats: false },
  steak: { portions: 3, catEats: true },
};

export function isFood(item) {
  return Boolean(item) && item.item in FOODS;
}

/** How many goes a whole one of these has. */
export function wholePortions(itemId) {
  return FOODS[itemId]?.portions ?? 0;
}

/** How much is left, treating anything missing or silly as untouched. */
export function portionsLeft(item) {
  if (!isFood(item)) return 0;
  const whole = wholePortions(item.item);
  const left = item.left;
  if (!Number.isInteger(left) || left < 0 || left > whole) return whole;
  return left;
}

/** Whether there is anything left worth walking over for. */
export function hasFoodLeft(item) {
  return isFood(item) && portionsLeft(item) > 0;
}

/**
 * Takes one portion. Returns what is left, so the caller can tell when to
 * clear the plate away.
 */
export function biteFrom(item) {
  if (!hasFoodLeft(item)) return 0;
  item.left = portionsLeft(item) - 1;
  return item.left;
}

/** Whether a cat would bother. */
export function catEats(itemId) {
  return FOODS[itemId]?.catEats === true;
}

/**
 * How eaten it looks, from nothing to all of it.
 *
 * The renderer works from this rather than from the count, so a cake with four
 * slices and a steak with three can share one drawing rule.
 */
export function eatenFraction(item) {
  const whole = wholePortions(item.item);
  if (!whole) return 0;
  return 1 - portionsLeft(item) / whole;
}
