/**
 * Cooking.
 *
 * The first thing in the game with more than one step. Everything else is a
 * single action — place it, tap it, eat it — where a recipe is a sequence she
 * has to work out and carry through: find the eggs, get the pan, put one in
 * the other, stand it on the stove, turn the stove on, wait.
 *
 * Three things have to be true at once, and any of them missing simply means
 * nothing happens. Nothing burns, nothing is spoiled, nothing is wasted: play
 * cannot fail anywhere else in the game and the kitchen is not where that
 * starts. The worst outcome is that she waits and nothing changes.
 *
 * Pure and testable — no canvas, no DOM, no clock of its own.
 */

/**
 * What makes what.
 *
 * A table rather than code, because the rule book is built from this same
 * list — so a new recipe is one line here and appears in the book without the
 * book being touched.
 */
export const RECIPES = [
  { needs: 'egg', in: 'pan', makes: 'omelette', takes: 12 },
  { needs: 'steak_raw', in: 'pan', makes: 'steak', takes: 18 },
  // The pot is for the wet things. A utensil that cooks nothing is a tool that
  // is really a decoration, which is worse than not having it.
  { needs: 'veg', in: 'pot', makes: 'soup', takes: 20 },
  { needs: 'egg', in: 'pot', makes: 'egg_boiled', takes: 15 },
];

/** How hot a thing has to be standing on for anything to happen. */
export const HEAT_SOURCE = 'stove';

/** The recipe for what is in this utensil, if there is one. */
export function recipeFor(ingredientId, utensilId) {
  return RECIPES.find((r) => r.needs === ingredientId && r.in === utensilId) ?? null;
}

/** Everything a given utensil can be used to make. */
export function recipesIn(utensilId) {
  return RECIPES.filter((r) => r.in === utensilId);
}

/** Every utensil any recipe calls for. */
export function utensils() {
  return [...new Set(RECIPES.map((r) => r.in))];
}

/** Every raw thing any recipe starts from. */
export function ingredients() {
  return [...new Set(RECIPES.map((r) => r.needs))];
}

/**
 * Whether this pan is on a stove that is lit.
 *
 * Standing on a cold stove is not cooking, and neither is sitting on the floor
 * next to a hot one. Both simply do nothing.
 */
export function isOverHeat(utensil, items, isLit) {
  if (!utensil) return false;
  const stove = items.find((item) => (
    item.item === HEAT_SOURCE
    && Math.abs(item.x - utensil.x) <= COOK_REACH
    && utensil.y <= item.y
  ));
  return Boolean(stove) && isLit(stove);
}

/** How near a utensil has to be to a stove to count as standing on it. */
export const COOK_REACH = 90;

/**
 * Moves a pot of something along, and says what it has become.
 *
 * Progress is kept on the utensil rather than on a timer somewhere, so turning
 * the stove off pauses it exactly where it was and turning it back on carries
 * on. Taking the pan off does the same. Nothing is ever lost by changing her
 * mind, which is the difference between a game a child explores and a game a
 * child is careful in.
 *
 * @returns {string|null} what it turned into on this tick, or null
 */
export function cookOn(utensil, contents, dt, hot) {
  const recipe = recipeFor(contents?.item, utensil?.item);
  if (!recipe) return null;
  // The heat is asked for rather than assumed. Left to the caller to check,
  // a pan on a cold stove quietly built up progress and finished the moment
  // the stove was lit, which is not what anybody watching would expect.
  if (!hot) return null;

  utensil.cooked = (utensil.cooked ?? 0) + dt;
  if (utensil.cooked < recipe.takes) return null;

  utensil.cooked = 0;
  return recipe.makes;
}

/** How far through it is, for showing that something is happening. */
export function cookingProgress(utensil, contents) {
  const recipe = recipeFor(contents?.item, utensil?.item);
  if (!recipe) return 0;
  return Math.max(0, Math.min(1, (utensil.cooked ?? 0) / recipe.takes));
}

/** Forgets any part-cooking, for when a pan is emptied. */
export function clearProgress(utensil) {
  if (utensil) delete utensil.cooked;
}
