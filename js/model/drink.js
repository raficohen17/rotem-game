/**
 * Drinks.
 *
 * Pouring is a verb the game has not had. Everything else either goes
 * somewhere or gets used up; pouring takes from one object and gives to
 * another, and changes both — the carton has less in it and the glass has
 * some.
 *
 * A drink is a property of the glass rather than an object sitting inside it.
 * That is deliberate: a thing inside a thing has four questions to answer —
 * can it be seen, reached, does it travel, does it survive — and a puddle of
 * milk is not something anybody should be able to pick up separately from the
 * glass it is in.
 *
 * Pure and testable — no canvas, no DOM.
 */

/** What can be poured, and how many glassfuls are in one. */
export const POURABLE = {
  milk: { measures: 4, color: '#f6f2e8', catDrinks: true },
  juice: { measures: 4, color: '#e8963c', catDrinks: false },
  water: { measures: 5, color: '#a9d6e5', catDrinks: false },
};

/** What can be poured into, and how many sips it then holds. */
export const VESSELS = {
  glass: { sips: 3, bowl: false },
  mug: { sips: 1, bowl: false },
  // A cat drinks from a bowl on the floor and not from a glass on a table,
  // which is the difference between leaving something out and putting it away.
  dog_bowl: { sips: 2, bowl: true },
};

export function isPourable(item) {
  return Boolean(item) && item.item in POURABLE;
}

export function isVessel(item) {
  return Boolean(item) && item.item in VESSELS;
}

/** How many measures a carton has left, treating anything odd as full. */
export function measuresLeft(item) {
  if (!isPourable(item)) return 0;
  const full = POURABLE[item.item].measures;
  const left = item.left;
  if (!Number.isInteger(left) || left < 0 || left > full) return full;
  return left;
}

/** How many sips are in a glass. Empty unless something was poured in. */
export function sipsLeft(item) {
  if (!isVessel(item)) return 0;
  const full = VESSELS[item.item].sips;
  const left = item.sips;
  if (!Number.isInteger(left) || left < 0 || left > full) return 0;
  return left;
}

export function isEmptyVessel(item) {
  return isVessel(item) && sipsLeft(item) === 0;
}

/** What is in this glass, if anything. */
export function holds(item) {
  return isVessel(item) && sipsLeft(item) > 0 ? item.holds : null;
}

/** The colour of what is in it, for drawing. */
export function drinkColor(drinkId) {
  return POURABLE[drinkId]?.color ?? null;
}

/**
 * Whether a measure of this drink would go into this glass.
 *
 * Nothing is spilt and nothing is wasted: a full glass takes nothing, and one
 * drink never goes on top of another to make some third thing. Asked before
 * the drop as well as during it, so a glass that cannot take a pour is never
 * offered as a target in the first place.
 */
export function canPour(drink, vessel) {
  if (!POURABLE[drink] || !isVessel(vessel)) return false;
  if (sipsLeft(vessel) >= VESSELS[vessel.item].sips) return false;
  return !holds(vessel) || holds(vessel) === drink;
}

/**
 * Moves one measure from a carton into a glass.
 *
 * @returns {boolean} whether anything moved
 */
export function pourInto(container, vessel) {
  if (!isPourable(container) || measuresLeft(container) <= 0) return false;
  if (!canPour(container.item, vessel)) return false;
  const full = VESSELS[vessel.item].sips;
  container.left = measuresLeft(container) - 1;
  vessel.holds = container.item;
  vessel.sips = full;
  return true;
}

/** Takes one sip. Returns what is left, so the caller knows when it is empty. */
export function sipFrom(vessel) {
  if (!isVessel(vessel) || sipsLeft(vessel) <= 0) return 0;
  vessel.sips = sipsLeft(vessel) - 1;
  if (vessel.sips === 0) delete vessel.holds;
  return vessel.sips;
}

/** How full it looks, from empty to brimming. */
export function fullness(vessel) {
  if (!isVessel(vessel)) return 0;
  return sipsLeft(vessel) / VESSELS[vessel.item].sips;
}

/** Whether a cat would put its face in this. */
export function catWouldDrink(vessel) {
  const drink = holds(vessel);
  return Boolean(drink) && VESSELS[vessel.item]?.bowl === true
    && POURABLE[drink]?.catDrinks === true;
}
