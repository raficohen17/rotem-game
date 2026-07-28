/**
 * Drawing a cat.
 *
 * Same cut-paper language as the people: soft shapes, light from the upper
 * left, every part its own sheet. Anchored at the paws like everything else in
 * a room, so a cat sorts into the same depth order as the furniture.
 *
 * Three poses. Standing is the one it walks in; sitting is what it does on a
 * chair or a table; curled is for its own bed and for anything soft.
 */

import {
  fillRR, fillCircle, fillEllipse, fillPoly, strokeLine, roundRect, paperLayer, shade,
} from './shapes.js';
import { litFill } from './materials.js';
import {
  COAT_COLORS, EYE_COLORS, COLLAR_COLORS, MARKINGS, EARS, TAILS, FACES, clampCatSpec,
} from '../model/cat.js';

/** A cat is about a fifth the height of a person, and wider than it is tall. */
export const CAT_H = 62;
export const CAT_W = 96;

export function drawCat(ctx, rawSpec, time = 0, pose = 'stand') {
  const spec = clampCatSpec(rawSpec);
  const coat = COAT_COLORS[spec.coat];
  const mark = COAT_COLORS[spec.markingColor];
  const eye = EYE_COLORS[spec.eyes];

  // Breathing, and a tail that never quite stops.
  const breath = Math.sin(time * 1.6) * 0.6;
  const flick = Math.sin(time * 1.1) * 0.16;

  paperLayer(ctx, () => {
    if (pose === 'curl') drawCurled(ctx, spec, coat, mark, eye, breath, flick);
    else drawUpright(ctx, spec, coat, mark, eye, breath, flick, pose);
  }, 0.8);
}

/** Sitting and standing share a body; the difference is how low it sits. */
function drawUpright(ctx, spec, coat, mark, eye, breath, flick, pose) {
  const sitting = pose === 'sit';
  const bodyH = sitting ? 34 : 26;
  const bodyY = -bodyH - (sitting ? 2 : 12);
  const headX = -26;
  const headY = sitting ? -50 : -44;

  drawTail(ctx, spec.tail, coat, mark, 34, sitting ? -14 : -22, flick);

  // Back legs, then the body, then the front legs over it.
  if (!sitting) {
    for (const x of [16, 26]) fillRR(ctx, x, -14, 8, 14, 4, shade(coat, -0.12));
    for (const x of [-16, -6]) fillRR(ctx, x, -14, 8, 14, 4, shade(coat, -0.06));
  } else {
    fillEllipse(ctx, 14, -8, 20, 9, shade(coat, -0.12));
  }

  ctx.fillStyle = litFill(ctx, bodyY, bodyH, coat, 0.14);
  fillRR(ctx, -30, bodyY + breath, 62, bodyH, bodyH * 0.48, ctx.fillStyle);
  drawMarkings(ctx, spec.marking, mark, -30, bodyY + breath, 62, bodyH);

  if (sitting) {
    for (const x of [-24, -10]) fillRR(ctx, x, -12, 9, 12, 4.5, shade(coat, 0.06));
  }

  drawHead(ctx, spec, coat, mark, eye, headX, headY + breath);
}

/** A cat asleep: a comma with ears. */
function drawCurled(ctx, spec, coat, mark, eye, breath, flick) {
  const cy = -20 + breath * 0.5;

  drawTail(ctx, spec.tail, coat, mark, 26, -12, flick * 0.4, true);
  ctx.fillStyle = litFill(ctx, cy - 22, 44, coat, 0.14);
  fillEllipse(ctx, 0, cy, 40, 22, ctx.fillStyle);
  drawMarkings(ctx, spec.marking, mark, -40, cy - 22, 80, 44);

  // Head tucked against the flank, eyes shut.
  const hx = -22;
  const hy = cy - 6;
  drawEars(ctx, spec.ears, coat, mark, hx, hy - 12);
  ctx.fillStyle = litFill(ctx, hy - 14, 28, coat, 0.12);
  fillEllipse(ctx, hx, hy, 17, 15, ctx.fillStyle);
  for (const side of [-1, 1]) {
    strokeLine(ctx, hx + side * 9 - 4, hy - 1, hx + side * 9 + 4, hy - 1, shade(coat, -0.45), 1.8);
  }
  drawCollar(ctx, spec.collar, hx + 12, hy + 11, 15);
}

function drawHead(ctx, spec, coat, mark, eye, x, y) {
  const shape = FACES[spec.face];
  const w = shape === 'wide' ? 21 : shape === 'narrow' ? 16 : 18.5;
  const h = shape === 'narrow' ? 18 : 17;

  drawEars(ctx, spec.ears, coat, mark, x, y - h + 2);

  ctx.fillStyle = litFill(ctx, y - h, h * 2, coat, 0.12);
  fillEllipse(ctx, x, y, w, h, ctx.fillStyle);

  // Muzzle, which is what stops a cat's face reading as a bear's.
  fillEllipse(ctx, x - 1, y + 6, w * 0.62, h * 0.42, shade(coat, 0.16));

  const lift = shape === 'grumpy' ? 1.5 : 0;
  for (const side of [-1, 1]) {
    const ex = x + side * w * 0.42;
    fillEllipse(ctx, ex, y - 1 + lift, 4.6, 5.4, '#f6f2ea');
    fillEllipse(ctx, ex, y - 1 + lift, 3.4, 4.6, eye);
    // A slit pupil, which is the whole difference between a cat and a doll.
    fillEllipse(ctx, ex, y - 1 + lift, 1.1, 3.6, '#241f26');
    fillCircle(ctx, ex - 1.2, y - 3 + lift, 1, 'rgba(255,255,255,0.85)');
    if (shape === 'grumpy') {
      strokeLine(ctx, ex - 5, y - 7, ex + 4, y - 5.5, shade(coat, -0.4), 1.6);
    }
  }

  fillPoly(ctx, [x - 2.6, y + 3, x + 2.6, y + 3, x, y + 6], shade('#e0a0a8', 0));
  strokeLine(ctx, x, y + 6, x, y + 9, shade(coat, -0.4), 1.4);

  // Whiskers.
  ctx.globalAlpha = 0.5;
  for (const side of [-1, 1]) {
    for (const dy of [-1.5, 1.5]) {
      strokeLine(ctx, x + side * 6, y + 6 + dy, x + side * (w + 12), y + 3 + dy * 2.2,
        '#f2ece2', 1.2);
    }
  }
  ctx.globalAlpha = 1;

  drawCollar(ctx, spec.collar, x + 12, y + h - 1, w);
}

function drawEars(ctx, style, coat, mark, x, y) {
  const kind = EARS[style];
  for (const side of [-1, 1]) {
    const ex = x + side * 12;
    if (kind === 'folded') {
      fillEllipse(ctx, ex, y + 3, 8, 5.5, shade(coat, -0.1));
      continue;
    }
    const tall = kind === 'round' ? 10 : 15;
    const wide = kind === 'round' ? 10 : 8;
    fillPoly(ctx, [ex - wide, y + 6, ex + wide, y + 6, ex + side * 2, y - tall],
      shade(coat, -0.06));
    fillPoly(ctx, [ex - wide * 0.5, y + 5, ex + wide * 0.5, y + 5, ex + side, y - tall * 0.6],
      '#e8b4b8');
    if (kind === 'tufted') {
      strokeLine(ctx, ex + side * 2, y - tall, ex + side * 6, y - tall - 6, shade(coat, 0.2), 1.8);
    }
  }
}

/** The markings, clipped to whatever body shape they are laid over. */
function drawMarkings(ctx, style, ink, x, y, w, h) {
  const kind = MARKINGS[style];
  if (kind === 'plain') return;

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, h * 0.48);
  ctx.clip();
  ctx.globalAlpha = 0.85;

  if (kind === 'tabby') {
    for (let i = 0; i < 5; i += 1) {
      const bx = x + w * (0.24 + i * 0.15);
      fillRR(ctx, bx, y + 2, 5, h - 4, 2.5, ink);
    }
  } else if (kind === 'tuxedo') {
    fillEllipse(ctx, x + w * 0.34, y + h, w * 0.34, h * 0.7, ink);
  } else if (kind === 'patched') {
    fillEllipse(ctx, x + w * 0.28, y + h * 0.36, w * 0.2, h * 0.34, ink);
    fillEllipse(ctx, x + w * 0.72, y + h * 0.66, w * 0.22, h * 0.3, ink);
  } else if (kind === 'socks') {
    fillRR(ctx, x, y + h * 0.62, w, h * 0.38, 4, ink);
  } else if (kind === 'mask') {
    fillEllipse(ctx, x + w * 0.08, y + h * 0.4, w * 0.28, h * 0.6, ink);
    fillEllipse(ctx, x + w, y + h * 0.5, w * 0.2, h * 0.5, ink);
  } else if (kind === 'spotted') {
    for (let i = 0; i < 7; i += 1) {
      const sx = x + w * (0.16 + (i % 4) * 0.22);
      const sy = y + h * (i < 4 ? 0.32 : 0.66);
      fillCircle(ctx, sx, sy, 3.4, ink);
    }
  } else if (kind === 'bicolour') {
    fillRR(ctx, x, y, w * 0.46, h, h * 0.4, ink);
  }

  ctx.restore();
}

function drawTail(ctx, style, coat, mark, x, y, flick, tucked = false) {
  const kind = TAILS[style];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tucked ? 0.4 : flick);

  const color = shade(coat, -0.08);
  if (kind === 'short') {
    fillRR(ctx, -4, -8, 9, 18, 4.5, color);
  } else if (kind === 'curled') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.quadraticCurveTo(20, 0, 14, -18);
    ctx.stroke();
  } else {
    const thick = kind === 'fluffy' ? 13 : 8;
    ctx.strokeStyle = color;
    ctx.lineWidth = thick;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(18, -4, 12, -30);
    ctx.stroke();
    if (kind === 'fluffy') {
      fillCircle(ctx, 12, -30, 7, shade(coat, 0.06));
    }
  }
  ctx.restore();
}

function drawCollar(ctx, style, x, y, w) {
  if (style === 0) return;
  const color = COLLAR_COLORS[style - 1];
  fillRR(ctx, x - w - 4, y - 3, w + 8, 6, 3, color);
  fillCircle(ctx, x - w / 2 - 2, y + 2, 3.4, shade(color, 0.4));
}
