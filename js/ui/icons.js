/**
 * Icons, drawn in code, centred on the origin at a nominal 44px box.
 *
 * The interface is icon-first on purpose: Rotem reads English, but nothing in
 * the game should *require* reading to be understood.
 */

import { fillRR, fillCircle, fillEllipse, fillPoly, strokeLine } from '../render/shapes.js';

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

  /*
   * Symbols for the parts of a character.
   *
   * These replaced a thumbnail of the character on every tab. A picture of the
   * whole girl cannot say whether a tab edits her brows or her eyes — eleven
   * tabs all showed the same face at slightly different crops. A drawing of the
   * feature itself can.
   */

  build(ctx, c) {
    fillCircle(ctx, 0, -13, 6.5, c);
    fillPoly(ctx, [-8, -5, 8, -5, 5, 5, -5, 5], c);
    fillRR(ctx, -6, 4, 4.5, 14, 2, c);
    fillRR(ctx, 1.5, 4, 4.5, 14, 2, c);
  },

  face(ctx, c) {
    stroke(ctx, c, 4);
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(14, -18, 15, -4, 15, 2);
    ctx.bezierCurveTo(15, 12, 8, 18, 0, 18);
    ctx.bezierCurveTo(-8, 18, -15, 12, -15, 2);
    ctx.bezierCurveTo(-15, -4, -14, -18, 0, -18);
    ctx.stroke();
  },

  skin(ctx, c) {
    // A paint droplet: the tab is tinted with the tone in use.
    fillPoly(ctx, [0, -18, 12, 2, -12, 2], c);
    fillCircle(ctx, 0, 4, 12, c);
  },

  hair(ctx, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-17, 16);
    ctx.bezierCurveTo(-20, -6, -12, -18, 0, -18);
    ctx.bezierCurveTo(12, -18, 20, -6, 17, 16);
    ctx.lineTo(9, 16);
    ctx.bezierCurveTo(11, -2, 6, -8, 0, -8);
    ctx.bezierCurveTo(-6, -8, -11, -2, -9, 16);
    ctx.closePath();
    ctx.fill();
  },

  hairpin(ctx, c) {
    // A clip, drawn at an angle so it reads as worn rather than as a bar.
    ctx.save();
    ctx.rotate(-0.5);
    fillRR(ctx, -17, -5, 34, 10, 5, c);
    fillRR(ctx, -13, -2, 22, 4, 2, '#00000055');
    ctx.restore();
    fillCircle(ctx, 11, -12, 4.5, c);
  },

  brows(ctx, c) {
    stroke(ctx, c, 6);
    ctx.beginPath();
    ctx.moveTo(-19, 2);
    ctx.quadraticCurveTo(-10, -9, -1, -3);
    ctx.moveTo(1, -3);
    ctx.quadraticCurveTo(10, -9, 19, 2);
    ctx.stroke();
  },

  eyes(ctx, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    fillCircle(ctx, 0, 0, 8.5, '#00000055');
    fillCircle(ctx, 2.5, -3, 3, c);
    stroke(ctx, c, 4);
    ctx.beginPath();
    ctx.moveTo(-20, -6);
    ctx.quadraticCurveTo(0, -18, 20, -6);
    ctx.stroke();
  },

  nose(ctx, c) {
    stroke(ctx, c, 4.5);
    ctx.beginPath();
    ctx.moveTo(2, -17);
    ctx.quadraticCurveTo(-8, 4, 3, 8);
    ctx.stroke();
    fillCircle(ctx, -6, 12, 3, c);
    fillCircle(ctx, 8, 12, 3, c);
  },

  mouth(ctx, c) {
    fillEllipse(ctx, -6, -4, 8, 5, c);
    fillEllipse(ctx, 6, -4, 8, 5, c);
    fillEllipse(ctx, 0, 5, 16, 8, c);
    strokeLine(ctx, -15, 0, 15, 0, '#00000055', 2.5);
  },

  top(ctx, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-9, -15);
    ctx.lineTo(9, -15);
    ctx.lineTo(19, -9);
    ctx.lineTo(15, 0);
    ctx.lineTo(11, -2);
    ctx.lineTo(11, 16);
    ctx.lineTo(-11, 16);
    ctx.lineTo(-11, -2);
    ctx.lineTo(-15, 0);
    ctx.lineTo(-19, -9);
    ctx.closePath();
    ctx.fill();
  },

  bottom(ctx, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-12, -16);
    ctx.lineTo(12, -16);
    ctx.lineTo(10, 17);
    ctx.lineTo(2, 17);
    ctx.lineTo(0, -2);
    ctx.lineTo(-2, 17);
    ctx.lineTo(-10, 17);
    ctx.closePath();
    ctx.fill();
  },

  shoes(ctx, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-14, -10);
    ctx.lineTo(-4, -10);
    ctx.quadraticCurveTo(-2, 2, 14, 6);
    ctx.lineTo(16, 13);
    ctx.lineTo(-14, 13);
    ctx.closePath();
    ctx.fill();
  },

  extra(ctx, c) {
    fillPoly(ctx, [-18, -8, -4, -14, -4, -1], c);
    fillPoly(ctx, [4, -14, 18, -8, 4, -1], c);
    fillCircle(ctx, 0, -7.5, 5, c);
    fillPoly(ctx, [-7, -2, 7, -2, 4, 15, -4, 15], c);
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
