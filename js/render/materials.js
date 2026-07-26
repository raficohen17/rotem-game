/**
 * Materials.
 *
 * The furniture was flat rounded rectangles: a sofa and a wardrobe differed
 * only in outline. What separates a drawn object from a coloured box is that
 * its surfaces catch light differently and carry the marks of what they are
 * made of — grain in wood, folds in fabric, a hard sheen on metal.
 *
 * Light comes from the upper left throughout. Every helper here assumes that,
 * so the whole room agrees about where the window is.
 */

import { shade } from './shapes.js';

/** Vertical fall of light across a surface: lit on top, shaded underneath. */
export function litFill(ctx, y, h, color, amount = 0.14) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(color, amount));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -amount * 1.3));
  return g;
}

/** Light falling across a surface from the left. */
export function sideLit(ctx, x, w, color, amount = 0.12) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, shade(color, amount));
  g.addColorStop(0.7, color);
  g.addColorStop(1, shade(color, -amount));
  return g;
}

/** Runs `draw` clipped to the rectangle, for detail that must stay inside. */
export function within(ctx, x, y, w, h, draw) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  draw();
  ctx.restore();
}

/** Long grain lines, slightly wandering so they do not read as a barcode. */
export function woodGrain(ctx, x, y, w, h, color, lines = 4) {
  within(ctx, x, y, w, h, () => {
    ctx.strokeStyle = shade(color, -0.16);
    ctx.lineWidth = 1.6;
    for (let i = 1; i <= lines; i += 1) {
      const gy = y + (h * i) / (lines + 1);
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.bezierCurveTo(x + w * 0.3, gy - 2.5, x + w * 0.6, gy + 2.5, x + w, gy);
      ctx.stroke();
    }
  });
}

/** Planks running across a surface, with a darker seam between each. */
export function planks(ctx, x, y, w, h, color, count = 6, vertical = false) {
  within(ctx, x, y, w, h, () => {
    ctx.strokeStyle = shade(color, -0.2);
    ctx.lineWidth = 2;
    for (let i = 1; i < count; i += 1) {
      ctx.beginPath();
      if (vertical) {
        const px = x + (w * i) / count;
        ctx.moveTo(px, y);
        ctx.lineTo(px, y + h);
      } else {
        const py = y + (h * i) / count;
        ctx.moveTo(x, py);
        ctx.lineTo(x + w, py);
      }
      ctx.stroke();
    }
  });
}

/** Soft creases, for anything stuffed: cushions, duvets, upholstery. */
export function folds(ctx, x, y, w, h, color, count = 3) {
  within(ctx, x, y, w, h, () => {
    ctx.strokeStyle = shade(color, -0.13);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    for (let i = 1; i <= count; i += 1) {
      const fx = x + (w * i) / (count + 1);
      ctx.beginPath();
      ctx.moveTo(fx, y + h * 0.12);
      ctx.quadraticCurveTo(fx + w * 0.04, y + h / 2, fx, y + h * 0.88);
      ctx.stroke();
    }
  });
}

/** A dashed seam, the detail that most reads as "sewn". */
export function stitching(ctx, x1, y1, x2, y2, color) {
  ctx.save();
  ctx.strokeStyle = shade(color, -0.3);
  ctx.lineWidth = 1.8;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** A hard diagonal glint, for anything polished. */
export function sheen(ctx, x, y, w, h, strength = 0.4) {
  within(ctx, x, y, w, h, () => {
    ctx.save();
    ctx.globalAlpha = strength;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.1, y + h);
    ctx.lineTo(x + w * 0.34, y);
    ctx.lineTo(x + w * 0.5, y);
    ctx.lineTo(x + w * 0.26, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

/** Glass: a cool tint, a glint, and a bright rim along the top. */
export function glass(ctx, x, y, w, h, r, color) {
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = litFill(ctx, y, h, color, 0.18);
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.restore();
  sheen(ctx, x, y, w, h, 0.28);
}

/** A small round knob or handle, lit from the upper left. */
export function knob(ctx, cx, cy, r, color) {
  ctx.fillStyle = shade(color, -0.35);
  ctx.beginPath();
  ctx.arc(cx, cy + 1.5, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(color, 0.45);
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
}

/** A drawn-out handle bar with two mounts. */
export function pull(ctx, cx, cy, w, color) {
  ctx.strokeStyle = shade(color, -0.1);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.lineTo(cx + w / 2, cy);
  ctx.stroke();
  ctx.fillStyle = shade(color, -0.25);
  ctx.beginPath();
  ctx.arc(cx - w / 2, cy, 2.6, 0, Math.PI * 2);
  ctx.arc(cx + w / 2, cy, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

/** A recessed panel, the detail that turns a slab into a cabinet door. */
export function panel(ctx, x, y, w, h, color, inset = 7) {
  ctx.fillStyle = shade(color, -0.12);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = shade(color, 0.06);
  ctx.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
  ctx.strokeStyle = shade(color, -0.22);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
}
