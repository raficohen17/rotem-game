/**
 * Icons, drawn in code, centred on the origin at a nominal 44px box.
 *
 * The interface is icon-first on purpose: Rotem reads English, but nothing in
 * the game should *require* reading to be understood.
 */

import { fillRR, fillCircle, fillPoly, strokeLine } from '../render/shapes.js';

function stroke(ctx, color, width = 5) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

export const ICONS = {
  back(ctx, c) {
    stroke(ctx, c, 6);
    ctx.beginPath();
    ctx.moveTo(6, -14);
    ctx.lineTo(-8, 0);
    ctx.lineTo(6, 14);
    ctx.stroke();
  },

  home(ctx, c) {
    fillPoly(ctx, [0, -16, 18, 0, 12, 0, 12, 16, -12, 16, -12, 0, -18, 0], c);
  },

  plus(ctx, c) {
    strokeLine(ctx, -14, 0, 14, 0, c, 6);
    strokeLine(ctx, 0, -14, 0, 14, c, 6);
  },

  minus(ctx, c) {
    strokeLine(ctx, -14, 0, 14, 0, c, 6);
  },

  trash(ctx, c) {
    fillRR(ctx, -11, -8, 22, 24, 4, c);
    fillRR(ctx, -15, -14, 30, 6, 3, c);
    fillRR(ctx, -5, -19, 10, 6, 3, c);
  },

  flip(ctx, c) {
    fillPoly(ctx, [-4, -14, -4, 14, -18, 0], c);
    fillPoly(ctx, [4, -14, 4, 14, 18, 0], c);
  },

  grow(ctx, c) {
    stroke(ctx, c, 5);
    ctx.strokeRect(-14, -14, 28, 28);
    strokeLine(ctx, -6, 0, 6, 0, c, 5);
    strokeLine(ctx, 0, -6, 0, 6, c, 5);
  },

  shrink(ctx, c) {
    stroke(ctx, c, 5);
    ctx.strokeRect(-14, -14, 28, 28);
    strokeLine(ctx, -6, 0, 6, 0, c, 5);
  },

  layerUp(ctx, c) {
    fillPoly(ctx, [0, -16, 14, -2, -14, -2], c);
    fillRR(ctx, -14, 6, 28, 6, 3, c);
  },

  layerDown(ctx, c) {
    fillPoly(ctx, [0, 16, 14, 2, -14, 2], c);
    fillRR(ctx, -14, -12, 28, 6, 3, c);
  },

  paint(ctx, c) {
    fillRR(ctx, -13, -16, 26, 14, 4, c);
    fillRR(ctx, -4, -2, 8, 10, 3, c);
    fillPoly(ctx, [-9, 8, 9, 8, 6, 18, -6, 18], c);
  },

  person(ctx, c) {
    fillCircle(ctx, 0, -9, 8, c);
    fillPoly(ctx, [-12, 18, -9, 2, 9, 2, 12, 18], c);
  },

  check(ctx, c) {
    stroke(ctx, c, 7);
    ctx.beginPath();
    ctx.moveTo(-14, 1);
    ctx.lineTo(-4, 12);
    ctx.lineTo(15, -12);
    ctx.stroke();
  },

  cross(ctx, c) {
    strokeLine(ctx, -12, -12, 12, 12, c, 6);
    strokeLine(ctx, 12, -12, -12, 12, c, 6);
  },

  wall(ctx, c) {
    fillRR(ctx, -16, -14, 32, 10, 2, c);
    fillRR(ctx, -16, -2, 15, 10, 2, c);
    fillRR(ctx, 2, -2, 14, 10, 2, c);
    fillRR(ctx, -16, 10, 32, 8, 2, c);
  },

  floor(ctx, c) {
    fillPoly(ctx, [-18, 12, 18, 12, 12, -6, -12, -6], c);
    strokeLine(ctx, -6, -6, -11, 12, '#00000033', 3);
    strokeLine(ctx, 6, -6, 11, 12, '#00000033', 3);
  },

  drawer(ctx, c) {
    fillRR(ctx, -17, -14, 34, 12, 3, c);
    fillRR(ctx, -17, 2, 34, 12, 3, c);
  },

  chevronUp(ctx, c) {
    stroke(ctx, c, 6);
    ctx.beginPath();
    ctx.moveTo(-13, 6);
    ctx.lineTo(0, -7);
    ctx.lineTo(13, 6);
    ctx.stroke();
  },

  chevronDown(ctx, c) {
    stroke(ctx, c, 6);
    ctx.beginPath();
    ctx.moveTo(-13, -6);
    ctx.lineTo(0, 7);
    ctx.lineTo(13, -6);
    ctx.stroke();
  },
};

/** Draws an icon centred at (x, y), scaled from its nominal 44px box. */
export function drawIcon(ctx, name, x, y, color, scale = 1) {
  const paint = ICONS[name];
  if (!paint) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  paint(ctx, color);
  ctx.restore();
}
