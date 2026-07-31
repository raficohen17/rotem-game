/**
 * How a building looks from the street.
 *
 * Kept apart from the rooms inside it: the front is five choices, the rooms are
 * everything she has ever put in them. Palettes are append-only, like every
 * other table in this game, so a saved index never means something else later.
 *
 * Pure and testable — no canvas, no DOM.
 */

/** Walls, in the same tinted-paper family as the rooms. */
export const FRONT_WALLS = [
  '#ecdfd0', '#dfe6ea', '#e3ead9', '#f2e4c8', '#ecd7cb',
  '#e0dae6', '#d5e2df', '#eddfe6', '#cfd6dd', '#d9cfc2',
];

export const FRONT_ROOFS = [
  '#c9707f', '#5c8fae', '#7d9e62', '#d9a24e', '#8a6d9e',
  '#4f9695', '#a9765a', '#5b5566', '#c0574f', '#3f7f6d',
];

/** The shape of the roof, which is what makes two buildings look different. */
export const ROOF_STYLES = ['gable', 'flat', 'hip', 'mansard'];

export const DOOR_COLORS = [
  '#8a5a3c', '#c05a63', '#4f7f9e', '#5f7f52', '#c9963c',
  '#6b5f7a', '#3f4854', '#a8a49c',
];

/** How the windows are divided up. */
export const WINDOW_STYLES = ['four', 'two', 'arch', 'round'];

/** A front as it comes: warm walls, a red roof, a wooden door. */
export function createFront() {
  return { wall: 0, roof: 0, roofStyle: 0, door: 0, window: 0 };
}

/** The lengths every index is kept inside, by field. */
export const FRONT_RANGES = {
  wall: FRONT_WALLS.length,
  roof: FRONT_ROOFS.length,
  roofStyle: ROOF_STYLES.length,
  door: DOOR_COLORS.length,
  window: WINDOW_STYLES.length,
};

/** Forces a loaded front into range, so a bad save cannot draw nothing. */
export function clampFront(front) {
  const base = createFront();
  if (!front || typeof front !== 'object') return base;
  const out = {};
  for (const [key, count] of Object.entries(FRONT_RANGES)) {
    const value = front[key];
    out[key] = Number.isInteger(value) && value >= 0 && value < count ? value : base[key];
  }
  return out;
}

/** The colours and shapes a front actually resolves to. */
export function frontLook(front) {
  const safe = clampFront(front);
  return {
    wall: FRONT_WALLS[safe.wall],
    roof: FRONT_ROOFS[safe.roof],
    roofStyle: ROOF_STYLES[safe.roofStyle],
    door: DOOR_COLORS[safe.door],
    window: WINDOW_STYLES[safe.window],
  };
}
