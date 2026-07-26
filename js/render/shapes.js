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
export function paperLayer(ctx, draw, lift = 1) {
  ctx.save();
  ctx.shadowColor = 'rgba(38, 28, 45, 0.26)';
  ctx.shadowBlur = 7 * lift;
  ctx.shadowOffsetY = 3 * lift;
  ctx.shadowOffsetX = 1 * lift;
  draw();
  ctx.restore();
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
