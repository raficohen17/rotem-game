/**
 * Placement geometry and hit testing.
 *
 * Pure functions over plain objects so the fiddly parts — which item does a
 * finger land on when three overlap — are unit tested rather than debugged by
 * poking at a phone.
 */

/** Minimum touch target in design pixels. Sized for a young child's finger. */
export const MIN_TOUCH = 64;

export const MIN_SCALE = 0.4;
export const MAX_SCALE = 2.2;

/**
 * Bounding box of a placed item. `x` is its horizontal centre, `y` the
 * baseline it stands on, so the box grows upward from the floor.
 *
 * @param {{x: number, y: number, scale: number}} placed
 * @param {{w: number, h: number}} def catalog entry
 */
export function itemBounds(placed, def) {
  const w = def.w * placed.scale;
  const h = def.h * placed.scale;
  return { left: placed.x - w / 2, right: placed.x + w / 2, top: placed.y - h, bottom: placed.y, w, h };
}

export function boundsContain(bounds, px, py) {
  return px >= bounds.left && px <= bounds.right && py >= bounds.top && py <= bounds.bottom;
}

/**
 * Back-to-front order. Wall-mounted items sit behind everything on the floor;
 * floor items are sorted by baseline so a chair in front of a table overlaps
 * it the way it would in a side-on view.
 *
 * @param {object[]} items
 * @param {(id: string) => ({surface?: string}|undefined)} lookup
 */
export function drawOrder(items, lookup) {
  return items
    .map((placed, index) => ({ placed, index }))
    .sort((a, b) => {
      const aWall = lookup(a.placed.item)?.surface === 'wall';
      const bWall = lookup(b.placed.item)?.surface === 'wall';
      if (aWall !== bWall) return aWall ? -1 : 1;
      // z is only ever non-zero for items deliberately pulled to the front or
      // pushed to the back; everything else falls through to baseline order.
      const az = a.placed.z ?? 0;
      const bz = b.placed.z ?? 0;
      if (az !== bz) return az - bz;
      if (a.placed.y !== b.placed.y) return a.placed.y - b.placed.y;
      return a.index - b.index; // stable for items on the same baseline
    })
    .map((entry) => entry.placed);
}

/**
 * Topmost item under a point, or null. Walks the draw order backwards so what
 * looks like it is in front is what gets picked up.
 *
 * @param {(id: string) => ({w: number, h: number, surface?: string}|undefined)} lookup
 */
export function hitTest(items, lookup, px, py) {
  const ordered = drawOrder(items, lookup);
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    const placed = ordered[i];
    const def = lookup(placed.item);
    if (!def) continue;
    if (boundsContain(itemBounds(placed, def), px, py)) return placed;
  }
  return null;
}

export function clampScale(scale) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * Every surface an item offers, top first.
 *
 * Most items offer only their own top. A bookshelf declares its shelves, so a
 * book lands on a shelf rather than balancing on the roof of the shelf unit —
 * which is where it went when the only surface an item could have was its top.
 *
 * `maxHeight` is the headroom above a surface, so the caller can size what
 * lands there.
 */
function surfacesOf(placed, def, bounds) {
  const list = [{ top: bounds.top, maxHeight: Infinity }];
  if (!Array.isArray(def.shelves)) return list;

  const height = def.h * placed.scale;
  const gap = (def.shelfGap ?? 0.25) * height;
  for (const fraction of def.shelves) {
    list.push({ top: placed.y - fraction * height, maxHeight: gap });
  }
  return list;
}

/** How close a dropped baseline must be to a surface to land on it. */
export const SNAP_REACH = 62;

/** How much of the narrower item must sit over the surface to count. */
const SNAP_OVERLAP = 0.34;

/**
 * The item a dropped object should stand on, or null for the floor.
 *
 * Depth otherwise comes only from the baseline — lower on screen means nearer
 * — so anything lifted onto a cupboard has a higher baseline than the cupboard
 * and therefore draws behind it. That makes putting a television on a cupboard
 * impossible, which is an obvious thing to want to do.
 *
 * The test is an overlap between the two footprints, not "is the centre point
 * inside". A player lining a wide television up against the left edge of a
 * cupboard reasonably expects it to land there, and a centre-point test
 * silently refuses.
 *
 * @param {{w: number, h: number}} movingDef catalog entry of the moving item
 * @param {(id: string) => ({w: number, h: number, surface?: string}|undefined)} lookup
 */
export function findSurface(moving, items, lookup, x, y, movingDef) {
  const halfWidth = ((movingDef?.w ?? 0) * (moving.scale ?? 1)) / 2;
  const left = x - halfWidth;
  const right = x + halfWidth;
  let best = null;

  for (const candidate of items) {
    if (candidate === moving) continue;
    const def = lookup(candidate.item);
    if (!def || def.surface === 'wall') continue;

    const bounds = itemBounds(candidate, def);

    const overlap = Math.min(right, bounds.right) - Math.max(left, bounds.left);
    const needed = Math.min(halfWidth * 2, bounds.w) * SNAP_OVERLAP;
    if (overlap < Math.max(needed, 8)) continue;

    for (const surface of surfacesOf(candidate, def, bounds)) {
      const drop = y - surface.top;
      if (drop < -SNAP_REACH || drop > SNAP_REACH) continue;

      // Prefer the highest surface in reach, so stacking works.
      if (!best || surface.top < best.top) {
        best = { item: candidate, top: surface.top, maxHeight: surface.maxHeight, bounds };
      }
    }
  }

  return best;
}

/** Keeps an item from being dragged off where it can never be grabbed again. */
export function clampToRoom(x, y, room) {
  return {
    x: Math.min(room.right, Math.max(room.left, x)),
    y: Math.min(room.bottom, Math.max(room.top, y)),
  };
}
