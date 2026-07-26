/**
 * Draws a character from its part indices.
 *
 * Origin is between the feet, so a character stands on a baseline the same way
 * furniture does and sorts into the same depth order. Height is CHAR_H at
 * scale 1.
 *
 * Every part is drawn from an index, never from stored colours or shapes —
 * which is what lets the whole cast be restyled later without touching a
 * single save file.
 */

import { fillRR, fillCircle, fillEllipse, fillPoly, strokeLine, shade } from './shapes.js';
import { SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, clampSpec } from '../model/character.js';

export const CHAR_H = 260;
export const CHAR_W = 130;

const HEAD_Y = -206;
const HEAD_R = 44;
const SHOULDER_Y = -160;
const HIP_Y = -92;
const DARK = '#3a3550';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} rawSpec
 * @param {number} time seconds, for the idle bob
 */
export function drawCharacter(ctx, rawSpec, time = 0) {
  const spec = clampSpec(rawSpec);
  const skin = SKIN_TONES[spec.skin];
  const hairColor = HAIR_COLORS[spec.hairColor];

  // A slow breathing bob. Enough to read as alive, small enough not to make
  // dragging feel imprecise.
  const bob = Math.sin(time * 1.8) * 2;

  ctx.save();
  ctx.translate(0, bob);

  drawBackHair(ctx, spec.hair, hairColor);
  drawLegs(ctx, skin);
  drawShoes(ctx, spec.shoes, CLOTH_COLORS[spec.shoesColor]);
  drawBody(ctx, skin);

  // Bare arms go on before the clothing, so a sleeve covers the arm it is
  // meant to cover and only the forearm below it stays skin.
  drawArms(ctx, skin);

  // A dress replaces both garments, so it is drawn instead of the top.
  if (spec.bottom === 4) {
    drawDress(ctx, CLOTH_COLORS[spec.bottomColor]);
  } else {
    drawBottom(ctx, spec.bottom, CLOTH_COLORS[spec.bottomColor]);
    drawTop(ctx, spec.top, CLOTH_COLORS[spec.topColor]);
  }

  drawHead(ctx, skin);
  drawEyes(ctx, spec.eyes);
  drawMouth(ctx, spec.mouth);
  drawFrontHair(ctx, spec.hair, hairColor);
  drawExtra(ctx, spec.extra, hairColor);

  ctx.restore();
}

// ------------------------------------------------------------------- body

function drawLegs(ctx, skin) {
  fillRR(ctx, -26, HIP_Y, 22, 84, 10, skin);
  fillRR(ctx, 4, HIP_Y, 22, 84, 10, skin);
}

function drawBody(ctx, skin) {
  fillRR(ctx, -31, SHOULDER_Y - 12, 62, 84, 22, skin);
  fillRR(ctx, -11, HEAD_Y + HEAD_R - 8, 22, 22, 8, shade(skin, -0.08)); // neck
}

function drawArms(ctx, skin) {
  fillRR(ctx, -46, SHOULDER_Y - 6, 16, 70, 8, skin);
  fillRR(ctx, 30, SHOULDER_Y - 6, 16, 70, 8, skin);
}

function drawHead(ctx, skin) {
  fillCircle(ctx, 0, HEAD_Y, HEAD_R, skin);
  fillEllipse(ctx, -HEAD_R + 4, HEAD_Y + 6, 7, 10, shade(skin, -0.1));
  fillEllipse(ctx, HEAD_R - 4, HEAD_Y + 6, 7, 10, shade(skin, -0.1));
}

// ------------------------------------------------------------------- face

function drawEyes(ctx, style) {
  const y = HEAD_Y - 2;
  const eye = (x) => {
    switch (style) {
      case 1: // closed and happy
        ctx.strokeStyle = DARK; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x, y + 3, 8, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        break;
      case 2: // big, with lashes
        fillCircle(ctx, x, y, 10, '#ffffff');
        fillCircle(ctx, x, y, 7, DARK);
        fillCircle(ctx, x + 2.5, y - 3, 2.5, '#ffffff');
        strokeLine(ctx, x - 10, y - 8, x - 14, y - 12, DARK, 2.5);
        break;
      case 3: // wink on one side
        if (x < 0) {
          ctx.strokeStyle = DARK; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(x, y + 3, 8, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        } else {
          fillCircle(ctx, x, y, 7, DARK);
          fillCircle(ctx, x + 2, y - 2.5, 2.2, '#ffffff');
        }
        break;
      case 4: // sleepy
        fillEllipse(ctx, x, y, 7, 3.5, DARK);
        break;
      default: // plain round
        fillCircle(ctx, x, y, 6.5, DARK);
        fillCircle(ctx, x + 2, y - 2.5, 2.2, '#ffffff');
    }
  };
  eye(-16);
  eye(16);
}

function drawMouth(ctx, style) {
  const y = HEAD_Y + 20;
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';

  switch (style) {
    case 1: // open smile
      fillEllipse(ctx, 0, y + 2, 11, 8, DARK);
      fillEllipse(ctx, 0, y + 5, 8, 4, '#e0607a');
      break;
    case 2: // small o
      fillCircle(ctx, 0, y + 2, 5, DARK);
      break;
    case 3: // straight
      strokeLine(ctx, -8, y + 2, 8, y + 2, DARK, 3.5);
      break;
    case 4: // tongue out
      fillEllipse(ctx, 0, y + 2, 10, 6, DARK);
      fillEllipse(ctx, 0, y + 7, 6, 5, '#f07f9a');
      break;
    default: // smile
      ctx.beginPath();
      ctx.arc(0, y - 4, 11, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
  }
}

// ------------------------------------------------------------------- hair

/** Hair behind the head — drawn before the body so it falls behind shoulders. */
function drawBackHair(ctx, style, color) {
  switch (style) {
    case 1: // long straight
      fillRR(ctx, -46, HEAD_Y - 30, 92, 130, 30, color);
      break;
    case 2: // ponytail
      fillEllipse(ctx, 40, HEAD_Y + 30, 16, 40, color);
      break;
    case 3: // twin tails
      fillEllipse(ctx, -46, HEAD_Y + 24, 14, 34, color);
      fillEllipse(ctx, 46, HEAD_Y + 24, 14, 34, color);
      break;
    case 5: // curly volume
      fillCircle(ctx, 0, HEAD_Y - 4, 56, color);
      break;
    case 7: // braids
      fillEllipse(ctx, -44, HEAD_Y + 34, 12, 40, color);
      fillEllipse(ctx, 44, HEAD_Y + 34, 12, 40, color);
      fillCircle(ctx, -44, HEAD_Y + 70, 9, shade(color, -0.15));
      fillCircle(ctx, 44, HEAD_Y + 70, 9, shade(color, -0.15));
      break;
    default:
      break;
  }
}

/** The cap of hair over the skull, drawn after the face. */
function drawFrontHair(ctx, style, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, HEAD_Y, HEAD_R + 3, Math.PI, Math.PI * 2);
  ctx.lineTo(HEAD_R + 3, HEAD_Y - 6);
  ctx.lineTo(-HEAD_R - 3, HEAD_Y - 6);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  switch (style) {
    case 4: // bun on top
      fillCircle(ctx, 0, HEAD_Y - HEAD_R - 14, 20, color);
      break;
    case 5: // curls spilling over the forehead
      fillCircle(ctx, -26, HEAD_Y - 26, 16, color);
      fillCircle(ctx, 4, HEAD_Y - 34, 18, color);
      fillCircle(ctx, 30, HEAD_Y - 22, 15, color);
      break;
    case 6: // bob, framing the cheeks
      fillRR(ctx, -HEAD_R - 4, HEAD_Y - 20, 20, 58, 10, color);
      fillRR(ctx, HEAD_R - 16, HEAD_Y - 20, 20, 58, 10, color);
      break;
    default: // a fringe swept to one side
      fillEllipse(ctx, -14, HEAD_Y - 26, 30, 16, color);
      break;
  }
}

// --------------------------------------------------------------- clothing

function drawTop(ctx, style, color) {
  const top = SHOULDER_Y - 10;

  switch (style) {
    case 1: // long sleeves
      fillRR(ctx, -33, top, 66, 74, 18, color);
      fillRR(ctx, -47, top + 4, 17, 66, 8, color);
      fillRR(ctx, 30, top + 4, 17, 66, 8, color);
      break;
    case 2: // tank top
      fillRR(ctx, -28, top + 8, 56, 66, 14, color);
      break;
    case 3: // hoodie
      fillRR(ctx, -35, top, 70, 78, 20, color);
      fillRR(ctx, -49, top + 4, 18, 60, 9, color);
      fillRR(ctx, 31, top + 4, 18, 60, 9, color);
      fillEllipse(ctx, 0, top + 4, 30, 14, shade(color, -0.18));
      strokeLine(ctx, -8, top + 20, -8, top + 36, shade(color, 0.4), 3);
      strokeLine(ctx, 8, top + 20, 8, top + 36, shade(color, 0.4), 3);
      break;
    case 4: // stripes
      fillRR(ctx, -33, top, 66, 74, 18, color);
      for (let i = 0; i < 4; i += 1) {
        fillRR(ctx, -33, top + 10 + i * 16, 66, 7, 3, shade(color, 0.45));
      }
      fillRR(ctx, -46, top + 4, 15, 34, 8, color);
      fillRR(ctx, 31, top + 4, 15, 34, 8, color);
      break;
    case 5: // chunky sweater
      fillRR(ctx, -36, top - 2, 72, 78, 22, color);
      fillRR(ctx, -50, top + 2, 18, 62, 10, color);
      fillRR(ctx, 32, top + 2, 18, 62, 10, color);
      for (let i = 0; i < 3; i += 1) {
        strokeLine(ctx, -30 + i * 22, top + 10, -30 + i * 22, top + 62, shade(color, -0.15), 3);
      }
      break;
    default: // short sleeves
      fillRR(ctx, -33, top, 66, 74, 18, color);
      fillRR(ctx, -46, top + 4, 15, 34, 8, color);
      fillRR(ctx, 31, top + 4, 15, 34, 8, color);
  }
}

function drawBottom(ctx, style, color) {
  switch (style) {
    case 1: // shorts
      fillRR(ctx, -30, HIP_Y - 12, 60, 40, 10, color);
      fillRR(ctx, -28, HIP_Y - 4, 24, 36, 8, color);
      fillRR(ctx, 4, HIP_Y - 4, 24, 36, 8, color);
      break;
    case 2: // short skirt
      fillPoly(ctx, [-30, HIP_Y - 12, 30, HIP_Y - 12, 44, HIP_Y + 34, -44, HIP_Y + 34], color);
      break;
    case 3: // long skirt
      fillPoly(ctx, [-30, HIP_Y - 12, 30, HIP_Y - 12, 52, HIP_Y + 66, -52, HIP_Y + 66], color);
      break;
    default: // trousers
      fillRR(ctx, -30, HIP_Y - 12, 60, 30, 8, color);
      fillRR(ctx, -28, HIP_Y - 8, 24, 78, 8, color);
      fillRR(ctx, 4, HIP_Y - 8, 24, 78, 8, color);
  }
}

function drawDress(ctx, color) {
  fillRR(ctx, -33, SHOULDER_Y - 10, 66, 60, 18, color);
  fillRR(ctx, -46, SHOULDER_Y - 6, 15, 32, 8, color);
  fillRR(ctx, 31, SHOULDER_Y - 6, 15, 32, 8, color);
  fillPoly(ctx, [-33, SHOULDER_Y + 40, 33, SHOULDER_Y + 40, 58, HIP_Y + 46, -58, HIP_Y + 46], color);
  fillRR(ctx, -34, SHOULDER_Y + 36, 68, 8, 4, shade(color, -0.25));
}

function drawShoes(ctx, style, color) {
  const shoe = (x) => {
    switch (style) {
      case 1: // boots
        fillRR(ctx, x - 2, -34, 26, 34, 7, color);
        break;
      case 2: // sandals
        fillRR(ctx, x, -8, 24, 8, 4, color);
        strokeLine(ctx, x + 4, -8, x + 18, -18, color, 4);
        break;
      case 3: // trainers with a sole
        fillRR(ctx, x - 2, -20, 27, 20, 8, color);
        fillRR(ctx, x - 3, -8, 29, 8, 4, '#ffffff');
        break;
      default: // simple flats
        fillRR(ctx, x - 1, -16, 25, 16, 7, color);
    }
  };
  shoe(-27);
  shoe(3);
}

// ------------------------------------------------------------------ extra

function drawExtra(ctx, style, hairColor) {
  switch (style) {
    case 1: // glasses
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-16, HEAD_Y - 2, 13, 0, Math.PI * 2);
      ctx.moveTo(29, HEAD_Y - 2);
      ctx.arc(16, HEAD_Y - 2, 13, 0, Math.PI * 2);
      ctx.stroke();
      strokeLine(ctx, -3, HEAD_Y - 2, 3, HEAD_Y - 2, DARK, 3);
      break;
    case 2: // sun hat
      fillEllipse(ctx, 0, HEAD_Y - 26, 62, 12, '#f2b13d');
      fillEllipse(ctx, 0, HEAD_Y - 40, 30, 22, '#f2b13d');
      fillRR(ctx, -30, HEAD_Y - 32, 60, 8, 4, '#e05a7a');
      break;
    case 3: // bow
      fillPoly(ctx, [-34, HEAD_Y - 38, -12, HEAD_Y - 46, -12, HEAD_Y - 28], '#e05a7a');
      fillPoly(ctx, [10, HEAD_Y - 46, 32, HEAD_Y - 38, 10, HEAD_Y - 28], '#e05a7a');
      fillCircle(ctx, -1, HEAD_Y - 37, 7, shade('#e05a7a', -0.15));
      break;
    case 4: // crown
      fillPoly(ctx, [
        -30, HEAD_Y - 30, -30, HEAD_Y - 54, -16, HEAD_Y - 42,
        0, HEAD_Y - 60, 16, HEAD_Y - 42, 30, HEAD_Y - 54, 30, HEAD_Y - 30,
      ], '#f7d04a');
      fillCircle(ctx, 0, HEAD_Y - 38, 5, '#e05a7a');
      break;
    case 5: // headphones
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, HEAD_Y - 4, HEAD_R + 6, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      fillRR(ctx, -HEAD_R - 12, HEAD_Y - 14, 14, 26, 6, shade(hairColor, -0.4));
      fillRR(ctx, HEAD_R - 2, HEAD_Y - 14, 14, 26, 6, shade(hairColor, -0.4));
      break;
    default:
      break;
  }
}
