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

/** Keeps an item from being dragged off where it can never be grabbed again. */
export function clampToRoom(x, y, room) {
  return {
    x: Math.min(room.right, Math.max(room.left, x)),
    y: Math.min(room.bottom, Math.max(room.top, y)),
  };
}
