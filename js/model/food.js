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
  omelette: { portions: 3, catEats: false },

  /*
   * Raw things.
   *
   * Food nobody will eat as it is, which is the whole reason cooking is worth
   * the trouble. A cat is the exception and takes raw steak happily — it does
   * not wait for anybody to cook.
   */
  egg: { portions: 1, catEats: false, raw: true },
  steak_raw: { portions: 3, catEats: true, raw: true },
  veg: { portions: 2, catEats: false, raw: true },

  soup: { portions: 3, catEats: false },
  egg_boiled: { portions: 1, catEats: false },
};

/** Whether this needs cooking before anybody will eat it. */
export function isRaw(itemId) {
  return FOODS[itemId]?.raw === true;
}

/** Whether a person would eat this as it is. */
export function isEdible(item) {
  return isFood(item) && !isRaw(item.item) && hasFoodLeft(item);
}

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

/* ------------------------------------------------------------- the fridge */

/**
 * Where on the shelf something sits when it is put in the fridge.
 *
 * One function, used both to place the food and to draw it. When the two were
 * worked out separately the cake was drawn on a shelf and picked up from
 * wherever it had been dropped, so tapping the cake she could see got her the
 * fridge behind it — and since nothing ever cleared the record, food put away
 * could never be got out again.
 */
/**
 * Where something sits when it is in a pan.
 *
 * On top of it rather than inside it — a fried egg is visible, which is the
 * whole point of watching it cook.
 */
export function panSpot(host, hostDef) {
  const h = (host.h ?? hostDef.h) * (host.scale ?? 1);
  return { x: host.x, y: host.y - h * 0.62 };
}

export const SHELVES = 3;

/**
 * Where on the shelves something sits.
 *
 * One position for everything put three things in a fridge and drew one, so
 * each thing gets its own shelf and they are all visible when the door opens —
 * which is the entire reason a stocked fridge is worth having.
 */
export function shelfSpot(host, hostDef, slot = 0) {
  const w = (host.w ?? hostDef.w) * (host.scale ?? 1);
  const h = (host.h ?? hostDef.h) * (host.scale ?? 1);
  const shelf = ((slot % SHELVES) + SHELVES) % SHELVES;
  return {
    x: host.x - w * 0.02,
    y: host.y - h * (0.72 - shelf * 0.22),
  };
}

/** Puts food away, moving it onto a shelf so it is drawn where it is. */
export function putInside(item, host, hostDef, slot = 0) {
  const spot = shelfSpot(host, hostDef, slot);
  item.x = spot.x;
  item.y = spot.y;
  item.inside = host.uid;
  item.shelf = ((slot % SHELVES) + SHELVES) % SHELVES;
  return item;
}

/** Takes it back out. Where it lands is the caller's business. */
export function takeOut(item) {
  delete item.inside;
  delete item.shelf;
  return item;
}

/** The first shelf nothing is already standing on. */
export function freeShelf(host, items) {
  const taken = new Set(items.filter((i) => i.inside === host.uid).map((i) => i.shelf ?? 0));
  for (let i = 0; i < SHELVES; i += 1) if (!taken.has(i)) return i;
  return items.filter((i) => i.inside === host.uid).length % SHELVES;
}

/** Whether this is shut away rather than out where anyone can get at it. */
export function isPutAway(item) {
  return Boolean(item?.inside);
}

/* ------------------------------------------------------- a stocked fridge */

/**
 * What a new fridge arrives with.
 *
 * An empty fridge is a cupboard. Stocked, opening one is a small discovery and
 * a reason to cook — which is where cooking has to start, because a child does
 * not go looking for a recipe she has no ingredients for.
 *
 * Only ingredients, never a finished meal: finding an omelette in the fridge
 * would make cooking one pointless in exactly the way taking one from the
 * drawer did.
 */
export const FRIDGE_STOCK = ['egg', 'veg', 'steak_raw', 'cake'];

/** How many things a new fridge holds. */
export const STOCK_MIN = 2;
export const STOCK_MAX = 3;

/**
 * Chooses what is in a new fridge.
 *
 * Returns ids rather than items, so the caller owns how they are made and
 * where they are put — this stays pure and testable.
 */
export function stockList(random = Math.random) {
  const count = STOCK_MIN + Math.floor(random() * (STOCK_MAX - STOCK_MIN + 1));
  const choices = [];
  const pool = [...FRIDGE_STOCK];
  for (let i = 0; i < count && pool.length; i += 1) {
    const at = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    choices.push(pool[at]);
    pool.splice(at, 1);
  }
  return choices;
}

/** Whether this is something a fridge would arrive holding. */
export function isStockable(itemId) {
  return FRIDGE_STOCK.includes(itemId);
}
