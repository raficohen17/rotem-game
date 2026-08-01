/**
 * Drawing helpers shared by the placeholder art and the character renderer.
 *
 * Placeholder items are drawn in a local space where the origin sits at the
 * bottom centre of the item: x runs from -w/2 to w/2, y from -h up to 0. That
 * makes "standing on the floor" the default and keeps depth sorting simple.
 */

/**
 * The design language is cut paper: every element is a flat shape lying on
 * the one behind it, separated by a soft shadow rather than by an outline.
 *
 * It was chosen for where this project ends up rather than for how it looks
 * today — the plan is for Rotem's own paper drawings to replace this art, and
 * in a cut-paper world a scanned drawing reads as belonging rather than as a
 * patch.
 */
/**
 * Whether the paper shadow is worth drawing at the size we are drawing at.
 *
 * A blurred shadow is the most expensive thing a canvas does — measured at 38%
 * of the cost of a whole room — and at a quarter size it is a two-pixel smudge
 * nobody can see. The cutaway shows four rooms at 43%, and the menu shows a
 * house at a tenth, so both turn it off around what they draw.
 */
let shadows = true;

export function setPaperShadows(on) {
  shadows = on;
}

/** Whether shadows are on right now, so a caller can put it back as it was. */
export function paperShadows() {
  return shadows;
}

/**
 * Which kinds of thing are worth a shadow, for whoever draws a room.
 *
 * Furniture is flat against the wall and the floor and hardly shows one;
 * a character is the thing being looked at, and the shadow is what lifts her
 * off the furniture behind her.
 */
export const shadowsOn = { items: false, people: true, detail: false };

/**
 * Passes inside a character that do without their own shadow.
 *
 * A figure was drawn as eleven stacked sheets, each casting a soft shadow, and
 * that shadow is three quarters of what a character costs: 2.66ms with, 0.70ms
 * without. Dropping only the small ones — hands, a hairpin — saved nothing,
 * because the cost is in how much is being shadowed rather than how many times
 * it is set up.
 *
 * So the shadow stays where it does the work: behind her body and her clothes,
 * which is what lifts her off the furniture. Her hair, arms, legs and the rest
 * are drawn flat against her, which is where they are anyway.
 */
export function detailLayer(ctx, draw) {
  if (!shadowsOn.detail) { draw(); return; }
  paperLayer(ctx, draw, 0.6);
}

export function paperLayer(ctx, draw, lift = 1) {
  if (!shadows) { draw(); return; }
  ctx.save();
  ctx.shadowColor = 'rgba(38, 28, 45, 0.26)';
  ctx.shadowBlur = 7 * lift;
  ctx.shadowOffsetY = 3 * lift;
  ctx.shadowOffsetX = 1 * lift;
  draw();
  ctx.restore();
}

/**
 * Whether a detail this big is worth drawing at the size we are drawing at.
 *
 * The books on a shelf are seventy-two of the eight hundred and sixty shapes
 * in the whole catalogue. At room size they are books; in the cutaway each one
 * is four pixels wide, and in a thumbnail it is a quarter of one.
 *
 * Given the size of the detail in design units, this says whether it lands on
 * enough real pixels to be worth painting. A canvas with no transform to read
 * is a recorder measuring what gets drawn, so it is told yes.
 */
export function worthDrawing(ctx, designSize) {
  if (typeof ctx.getTransform !== 'function') return true;
  const t = ctx.getTransform();
  // Six real pixels. A book three pixels wide with a rounded corner and a
  // highlight down its spine is a coloured stripe with extra steps, which is
  // exactly what is drawn instead when this says no.
  return designSize * Math.hypot(t.a, t.b) >= 6;
}

/** Rounded rectangle path. Hand-rolled rather than ctx.roundRect for reach. */
export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function fillRR(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
}

export function fillCircle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

export function fillEllipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Fills a closed polygon from a flat [x, y, x, y, ...] list. */
export function fillPoly(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
  ctx.fill();
}

export function strokeLine(ctx, x1, y1, x2, y2, color, width = 4) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Shifts a #rrggbb colour toward black or white.
 * @param {number} amount -1 (black) to 1 (white)
 */
/**
 * Darkens toward a warm brown rather than toward black.
 *
 * `shade` mixes toward pure black, which drains the colour out as it goes — a
 * cream wall pushed two thirds of the way to black is grey, and a grey recess
 * in a warm room looks like a photograph with the colour missing. Real shadow
 * in a room this colour is brown.
 */
const SHADOW = [0x3a, 0x2a, 0x24];

export function deepen(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift, target) => {
    const c = (value >> shift) & 0xff;
    return Math.round(c + (target - c) * amount);
  };

  const r = channel(16, SHADOW[0]);
  const g = channel(8, SHADOW[1]);
  const b = channel(0, SHADOW[2]);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const mix = Math.abs(amount);

  const channel = (shift) => {
    const c = (value >> shift) & 0xff;
    return Math.round(c + (target - c) * mix);
  };

  const r = channel(16);
  const g = channel(8);
  const b = channel(0);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
