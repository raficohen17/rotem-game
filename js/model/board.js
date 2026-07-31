/**
 * The whiteboard she draws on.
 *
 * Everything else in this game is designed by picking: a cover from ten
 * colours, a face from a rail of parts. The board is the first thing that
 * keeps her own line, so what it holds is a list of strokes rather than a list
 * of choices.
 *
 * A stroke is a colour and a run of points, and the points are whole numbers
 * in a thousandth of the board's own width and height. Fractions of a pixel
 * are invisible on a board 244 pixels wide and would double the size of every
 * save, and normalising to the board rather than to the screen means a board
 * she resizes keeps the drawing that is on it.
 *
 * Pure and testable — no canvas, no DOM.
 */

/**
 * Marker colours, in the order they sit in the tray.
 *
 * Dark first, because a whiteboard is written on in black and a child looking
 * for the ordinary pen should find it without hunting.
 */
export const MARKER_COLORS = [
  '#2f2b33', '#c0392b', '#2e7fc4', '#3f9e5b',
  '#e0891e', '#8a5fb0', '#d9679a', '#33aba6',
];

/** The coordinate space a stroke is stored in: thousandths of the face. */
export const GRID = 1000;

/**
 * What one board can hold.
 *
 * Generous rather than tight — a child scribbling with one finger makes long
 * strokes and few of them, and the whole point of the board is that she can
 * fill it. Ten worlds of full boards come to a few hundred kilobytes, which
 * the phone's storage does not notice.
 */
export const MAX_STROKES = 120;
export const MAX_POINTS = 96;

/** How far the finger travels before another point is worth keeping. */
export const MIN_STEP = 9;

/** How thick a marker draws, as a fraction of the board's width. */
export const NIB = 0.018;

/** How close the rubber has to pass to take a stroke out. */
export const RUB = 42;

/**
 * The part of the whiteboard that is drawable, as fractions of the whole item.
 *
 * Shared by the board in the room and the board she draws on full screen, so
 * a line she puts in the top corner is in the top corner in both. Measured off
 * the artwork: the frame takes a little at the sides and the pen tray takes
 * the bottom quarter.
 */
export const FACE = { x: 0.045, y: 0.05, w: 0.91, h: 0.7 };

export function createBoard() {
  return { strokes: [] };
}

export function isBlank(board) {
  return !board?.strokes?.length;
}

/** Whether there is room for another line on it. */
export function hasRoom(board) {
  return (board?.strokes?.length ?? 0) < MAX_STROKES;
}

/**
 * Starts a line in the given marker colour.
 *
 * @returns {boolean} whether the board took it
 */
export function startStroke(board, color, x, y) {
  if (!board || !hasRoom(board)) return false;
  if (!Number.isInteger(color) || color < 0 || color >= MARKER_COLORS.length) return false;
  board.strokes.push({ c: color, p: [round(x), round(y)] });
  return true;
}

/**
 * Carries the current line on to another point.
 *
 * Points closer together than a finger can meaningfully move are dropped: a
 * finger resting still on the glass sends a point every frame, and sixty
 * identical points is a stroke that costs sixty times what it is worth.
 */
export function extendStroke(board, x, y) {
  const stroke = board?.strokes?.[board.strokes.length - 1];
  if (!stroke) return false;
  if (stroke.p.length >= MAX_POINTS * 2) return false;

  const px = stroke.p[stroke.p.length - 2];
  const py = stroke.p[stroke.p.length - 1];
  const nx = round(x);
  const ny = round(y);
  if (Math.hypot(nx - px, ny - py) < MIN_STEP) return false;

  stroke.p.push(nx, ny);
  return true;
}

/**
 * Rubs out every line the rubber passed close to.
 *
 * A whole stroke at a time rather than a hole in the middle of one: a rubber
 * that leaves half a line behind needs a much bigger drawing model, and a
 * child rubbing at a board expects the scribble to go.
 *
 * @returns {boolean} whether anything was taken out
 */
export function eraseAt(board, x, y, radius = RUB) {
  if (!board?.strokes?.length) return false;
  const before = board.strokes.length;
  board.strokes = board.strokes.filter((stroke) => !touches(stroke, x, y, radius));
  return board.strokes.length !== before;
}

/** Clears the board. It is still a board afterwards. */
export function wipe(board) {
  if (!board) return false;
  const had = board.strokes?.length > 0;
  board.strokes = [];
  return had;
}

/**
 * Forces a loaded drawing into range, so a bad save cannot break a room.
 *
 * Anything that is not a drawing comes back as a blank board rather than as
 * nothing at all: a board with no strokes is a board she can draw on, and a
 * board that is undefined is an item that draws half of itself.
 */
export function clampBoard(design) {
  const strokes = Array.isArray(design?.strokes) ? design.strokes : [];
  const kept = [];
  for (const stroke of strokes) {
    if (kept.length >= MAX_STROKES) break;
    const color = Number.isInteger(stroke?.c) && stroke.c >= 0
      && stroke.c < MARKER_COLORS.length ? stroke.c : 0;
    const points = Array.isArray(stroke?.p) ? stroke.p : [];
    const p = [];
    for (let i = 0; i + 1 < points.length && p.length < MAX_POINTS * 2; i += 2) {
      const x = points[i];
      const y = points[i + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      p.push(clamp(x), clamp(y));
    }
    // A stroke of one point is a dot, which is a thing a child draws on
    // purpose, so it stays. A stroke of none is nothing at all.
    if (p.length >= 2) kept.push({ c: color, p });
  }
  return { strokes: kept };
}

/**
 * The colours she can draw with: the markers that are in this room.
 *
 * A marker is a thing she owns rather than an entry on a menu, which is what
 * makes putting one in the tray worth doing. Ordered by the colour rather than
 * by where the markers happen to lie, so the palette does not reshuffle itself
 * every time one is moved.
 */
export function markerColors(items) {
  const tints = new Set();
  for (const item of items ?? []) {
    if (item?.item !== 'marker') continue;
    const tint = item.tint ?? 0;
    if (tint >= 0 && tint < MARKER_COLORS.length) tints.add(tint);
  }
  return [...tints].sort((a, b) => a - b);
}

/** Where the markers a new board comes with sit in its tray. */
export const TRAY_STOCK = [0, 1, 2];

/** The spot in the tray for the nth marker on a board. */
export function traySpot(board, def, slot = 0) {
  const w = (board.w ?? def.w) * (board.scale ?? 1);
  const h = (board.h ?? def.h) * (board.scale ?? 1);
  // Standing in the tray, left to right, inside the frame. Low enough that
  // the markers sit in front of the tray rather than up the face of the
  // board: the tray is where the pens live, and the face is for the drawing.
  const step = w * 0.13;
  return {
    x: board.x - w * 0.3 + slot * step,
    y: board.y - h * 0.06,
  };
}

/**
 * Whether the rubber passed close enough to this line to take it out.
 *
 * Measured to the line itself rather than to the points it is stored as. A
 * quick stroke is a handful of points a long way apart, and rubbing at the
 * middle of one did nothing at all — the rubber missed between them, which
 * reads as a rubber that does not work.
 */
function touches(stroke, x, y, radius) {
  if (stroke.p.length === 2) {
    return Math.hypot(stroke.p[0] - x, stroke.p[1] - y) <= radius;
  }
  for (let i = 0; i + 3 < stroke.p.length; i += 2) {
    if (nearSegment(x, y, stroke.p[i], stroke.p[i + 1], stroke.p[i + 2], stroke.p[i + 3]) <= radius) {
      return true;
    }
  }
  return false;
}

/** How far a point is from a line segment. */
function nearSegment(x, y, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const span = dx * dx + dy * dy;
  // Where along the segment the nearest point is, kept between its two ends.
  const t = span === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / span));
  return Math.hypot(ax + t * dx - x, ay + t * dy - y);
}

function round(value) {
  return clamp(Math.round(value));
}

function clamp(value) {
  return Math.max(0, Math.min(GRID, Math.round(value)));
}
