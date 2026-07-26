/**
 * Draws a character from its part indices.
 *
 * Origin is between the feet, so a character stands on a baseline the same way
 * furniture does and sorts into the same depth order. Height is CHAR_H at
 * scale 1.
 *
 * The proportions are deliberately not realistic. A big head, short chunky
 * limbs, mitten hands and rounded ends everywhere are what separate a
 * character a child wants to play with from a jointed shop dummy. Nothing here
 * has a square corner.
 *
 * Every part is drawn from an index, never from stored colours or shapes —
 * which is what lets the whole cast be restyled later without touching a
 * single save file.
 */

import { fillRR, fillCircle, fillEllipse, fillPoly, strokeLine, shade } from './shapes.js';
import { SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, clampSpec } from '../model/character.js';

export const CHAR_H = 260;
export const CHAR_W = 150;

const HEAD_Y = -198;
const HEAD_R = 58;
const SHOULDER_Y = -146;
const TORSO_TOP = -152;
const HIP_Y = -76;
const ARM_X = 44;
const DARK = '#4a3b52';

/** A limb: a rounded bar whose ends are semicircles. */
function capsule(ctx, cx, top, bottom, width, color) {
  fillRR(ctx, cx - width / 2, top, width, bottom - top, width / 2, color);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} rawSpec
 * @param {number} time seconds, driving the idle animation
 */
export function drawCharacter(ctx, rawSpec, time = 0) {
  const spec = clampSpec(rawSpec);
  const skin = SKIN_TONES[spec.skin];
  const hairColor = HAIR_COLORS[spec.hairColor];

  // Breathing, a slow head tilt and a little arm sway. Small enough that
  // dragging still feels precise, alive enough that a still room isn't dead.
  const breath = Math.sin(time * 1.9);
  const sway = Math.sin(time * 1.3);

  // Characters blink out of step with each other — a room where everyone
  // blinks in unison looks wrong in a way that is hard to place.
  const phase = spec.skin * 1.7 + spec.hair * 2.3 + spec.eyes * 0.9;
  const blinking = (time + phase) % 4.2 < 0.13;

  ctx.save();
  ctx.translate(0, breath * 1.5);

  drawBackHair(ctx, spec.hair, hairColor);
  drawLegs(ctx, skin);
  drawShoes(ctx, spec.shoes, CLOTH_COLORS[spec.shoesColor]);

  // Arms sit behind the body so the wide head and torso stay unbroken.
  drawArms(ctx, skin, sway);
  drawTorso(ctx, skin);

  if (spec.bottom === 4) {
    drawDress(ctx, CLOTH_COLORS[spec.bottomColor]);
  } else {
    drawBottom(ctx, spec.bottom, CLOTH_COLORS[spec.bottomColor]);
    drawTop(ctx, spec.top, CLOTH_COLORS[spec.topColor], sway);
  }

  drawHands(ctx, skin, sway);
  drawHead(ctx, skin, spec, hairColor, blinking, sway);

  ctx.restore();
}

// ------------------------------------------------------------------- body

function drawLegs(ctx, skin) {
  capsule(ctx, -17, HIP_Y - 6, -14, 26, skin);
  capsule(ctx, 17, HIP_Y - 6, -14, 26, skin);
}

function drawTorso(ctx, skin) {
  // Slightly pear shaped rather than a slab: wider at the hip, soft shoulders.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-34, TORSO_TOP + 22);
  ctx.quadraticCurveTo(-34, TORSO_TOP, -12, TORSO_TOP);
  ctx.lineTo(12, TORSO_TOP);
  ctx.quadraticCurveTo(34, TORSO_TOP, 34, TORSO_TOP + 22);
  ctx.lineTo(38, HIP_Y - 16);
  ctx.quadraticCurveTo(38, HIP_Y, 22, HIP_Y);
  ctx.lineTo(-22, HIP_Y);
  ctx.quadraticCurveTo(-38, HIP_Y, -38, HIP_Y - 16);
  ctx.closePath();
  ctx.fill();
}

function armAngle(sway, side) {
  return sway * 0.05 * side;
}

function drawArms(ctx, skin, sway) {
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(ARM_X * side, SHOULDER_Y + 6);
    ctx.rotate(armAngle(sway, side));
    capsule(ctx, 0, -8, 70, 21, skin);
    ctx.restore();
  }
}

/** Mitten hands, drawn after the sleeves so a long sleeve stops at the wrist. */
function drawHands(ctx, skin, sway) {
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(ARM_X * side, SHOULDER_Y + 6);
    ctx.rotate(armAngle(sway, side));
    fillCircle(ctx, 0, 64, 13, skin);
    ctx.restore();
  }
}

// ------------------------------------------------------------------- head

function drawHead(ctx, skin, spec, hairColor, blinking, sway) {
  ctx.save();
  // The head leads the sway very slightly, which reads as looking around.
  ctx.translate(0, HEAD_Y);
  ctx.rotate(sway * 0.02);

  fillCircle(ctx, 0, 0, HEAD_R, skin);
  fillEllipse(ctx, -HEAD_R + 3, 10, 8, 12, shade(skin, -0.12));
  fillEllipse(ctx, HEAD_R - 3, 10, 8, 12, shade(skin, -0.12));

  // A soft shadow under the chin stops the head reading as a flat sticker.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, HEAD_R, 0, Math.PI * 2);
  ctx.clip();
  fillEllipse(ctx, 0, HEAD_R + 12, 46, 22, shade(skin, -0.14));
  ctx.restore();

  drawEyes(ctx, spec.eyes, blinking);
  drawCheeks(ctx, skin);
  drawMouth(ctx, spec.mouth);
  drawFrontHair(ctx, spec.hair, hairColor);
  drawExtra(ctx, spec.extra, hairColor);
  ctx.restore();
}

function drawCheeks(ctx, skin) {
  ctx.save();
  ctx.globalAlpha = 0.42;
  fillEllipse(ctx, -33, 14, 13, 8, '#f08098');
  fillEllipse(ctx, 33, 14, 13, 8, '#f08098');
  ctx.restore();
  // A tiny nose keeps the middle of the face from looking empty.
  fillEllipse(ctx, 0, 8, 4.5, 3.5, shade(skin, -0.22));
}

// ------------------------------------------------------------------- face

function closedEye(ctx, x) {
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, -2, 10, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();
}

function drawEyes(ctx, style, blinking) {
  const y = -6;
  const eye = (x, side) => {
    if (blinking) { closedEye(ctx, x); return; }

    switch (style) {
      case 1: // happy, closed
        closedEye(ctx, x);
        break;
      case 2: // big and round, with lashes
        fillEllipse(ctx, x, y, 12, 13, '#ffffff');
        fillEllipse(ctx, x, y + 1, 9, 10, DARK);
        fillCircle(ctx, x + 3.5, y - 4, 3.6, '#ffffff');
        fillCircle(ctx, x - 3, y + 5, 1.8, '#ffffff');
        strokeLine(ctx, x + side * 12, y - 9, x + side * 18, y - 14, DARK, 3);
        break;
      case 3: // winking on one side
        if (side < 0) closedEye(ctx, x);
        else {
          fillEllipse(ctx, x, y, 9.5, 11, DARK);
          fillCircle(ctx, x + 3, y - 4, 3.2, '#ffffff');
        }
        break;
      case 4: // sleepy half-lids
        fillEllipse(ctx, x, y + 2, 9.5, 5.5, DARK);
        strokeLine(ctx, x - 10, y - 5, x + 10, y - 5, DARK, 3);
        break;
      default: // the everyday eye
        fillEllipse(ctx, x, y, 9, 10.5, DARK);
        fillCircle(ctx, x + 3, y - 4, 3.2, '#ffffff');
    }
  };
  eye(-22, -1);
  eye(22, 1);
}

function drawMouth(ctx, style) {
  const y = 26;

  switch (style) {
    case 1: // open, delighted
      ctx.fillStyle = DARK;
      ctx.beginPath();
      ctx.ellipse(0, y, 13, 11, 0, 0, Math.PI);
      ctx.fill();
      fillEllipse(ctx, 0, y + 7, 8, 4.5, '#f07f9a');
      break;
    case 2: // small round o
      fillEllipse(ctx, 0, y + 1, 6, 7, DARK);
      break;
    case 3: // a straight, thoughtful line
      strokeLine(ctx, -9, y, 9, y, DARK, 4);
      break;
    case 4: // tongue out
      ctx.fillStyle = DARK;
      ctx.beginPath();
      ctx.ellipse(0, y, 12, 9, 0, 0, Math.PI);
      ctx.fill();
      fillEllipse(ctx, 0, y + 8, 7, 6, '#f07f9a');
      break;
    default: // an easy smile
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, y - 7, 13, Math.PI * 0.18, Math.PI * 0.82);
      ctx.stroke();
  }
}

// ------------------------------------------------------------------- hair
// Hair carries most of a character's identity, so the silhouettes are pushed
// well apart rather than being small variations on a cap.

/** Drawn before the body, so it falls behind the shoulders. */
function drawBackHair(ctx, style, color) {
  const y = HEAD_Y;
  switch (style) {
    case 1: // long, past the shoulders
      fillRR(ctx, -60, y - 40, 120, 150, 44, color);
      break;
    case 2: // high ponytail
      fillCircle(ctx, 52, y - 34, 20, shade(color, -0.06));
      fillEllipse(ctx, 66, y + 10, 22, 46, color);
      break;
    case 3: // twin tails
      fillCircle(ctx, -58, y - 20, 22, color);
      fillCircle(ctx, 58, y - 20, 22, color);
      fillEllipse(ctx, -64, y + 22, 19, 40, color);
      fillEllipse(ctx, 64, y + 22, 19, 40, color);
      break;
    case 5: // a big round cloud of curls
      fillCircle(ctx, 0, y - 10, 74, color);
      break;
    case 6: // bob, tucked under the jaw
      fillRR(ctx, -62, y - 34, 124, 96, 40, color);
      break;
    case 7: // braids with ties
      fillEllipse(ctx, -58, y + 34, 15, 48, color);
      fillEllipse(ctx, 58, y + 34, 15, 48, color);
      fillCircle(ctx, -58, y + 78, 11, shade(color, -0.2));
      fillCircle(ctx, 58, y + 78, 11, shade(color, -0.2));
      break;
    default:
      break;
  }
}

/** The cap over the skull and the fringe, drawn in head-local coordinates. */
function drawFrontHair(ctx, style, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, HEAD_R + 4, Math.PI * 0.98, Math.PI * 2.02);
  ctx.lineTo(HEAD_R + 4, -14);
  ctx.lineTo(-HEAD_R - 4, -14);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  switch (style) {
    case 2: // a swept side fringe
      fillEllipse(ctx, -20, -36, 42, 22, color);
      fillEllipse(ctx, 26, -42, 26, 16, color);
      break;
    case 4: // topknot
      fillCircle(ctx, 0, -HEAD_R - 20, 26, color);
      fillRR(ctx, -12, -HEAD_R - 8, 24, 12, 6, shade(color, -0.18));
      break;
    case 5: // curls tumbling over the forehead
      fillCircle(ctx, -34, -34, 21, color);
      fillCircle(ctx, 2, -46, 24, color);
      fillCircle(ctx, 36, -30, 20, color);
      break;
    case 6: // a blunt fringe straight across
      fillRR(ctx, -HEAD_R - 2, -HEAD_R - 4, HEAD_R * 2 + 4, 44, 14, color);
      break;
    case 7: // centre parting
      fillEllipse(ctx, -28, -38, 30, 20, color);
      fillEllipse(ctx, 28, -38, 30, 20, color);
      break;
    default: // a soft fringe to one side
      fillEllipse(ctx, -18, -38, 38, 20, color);
      break;
  }
}

// --------------------------------------------------------------- clothing

function sleeve(ctx, side, length, color, sway) {
  ctx.save();
  ctx.translate(ARM_X * side, SHOULDER_Y + 6);
  ctx.rotate(armAngle(sway, side));
  capsule(ctx, 0, -10, length, 25, color);
  ctx.restore();
}

function bodyGarment(ctx, color, top = TORSO_TOP - 4, bottom = HIP_Y + 6) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-38, top + 24);
  ctx.quadraticCurveTo(-38, top, -14, top);
  ctx.lineTo(14, top);
  ctx.quadraticCurveTo(38, top, 38, top + 24);
  ctx.lineTo(42, bottom - 14);
  ctx.quadraticCurveTo(42, bottom, 24, bottom);
  ctx.lineTo(-24, bottom);
  ctx.quadraticCurveTo(-42, bottom, -42, bottom - 14);
  ctx.closePath();
  ctx.fill();
}

function drawTop(ctx, style, color, sway) {
  switch (style) {
    case 1: // long sleeves
      sleeve(ctx, -1, 60, color, sway);
      sleeve(ctx, 1, 60, color, sway);
      bodyGarment(ctx, color);
      break;
    case 2: // sleeveless
      bodyGarment(ctx, color, TORSO_TOP + 8);
      break;
    case 3: // hoodie
      sleeve(ctx, -1, 58, color, sway);
      sleeve(ctx, 1, 58, color, sway);
      bodyGarment(ctx, color, TORSO_TOP - 8);
      fillEllipse(ctx, 0, TORSO_TOP - 2, 36, 17, shade(color, -0.2));
      strokeLine(ctx, -10, TORSO_TOP + 20, -10, TORSO_TOP + 40, shade(color, 0.45), 3.5);
      strokeLine(ctx, 10, TORSO_TOP + 20, 10, TORSO_TOP + 40, shade(color, 0.45), 3.5);
      break;
    case 4: // stripes
      sleeve(ctx, -1, 32, color, sway);
      sleeve(ctx, 1, 32, color, sway);
      bodyGarment(ctx, color);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-42, TORSO_TOP - 4, 84, HIP_Y - TORSO_TOP + 10);
      ctx.clip();
      for (let i = 0; i < 5; i += 1) {
        fillRR(ctx, -44, TORSO_TOP + 8 + i * 16, 88, 7, 3, shade(color, 0.5));
      }
      ctx.restore();
      break;
    case 5: // chunky knit
      sleeve(ctx, -1, 62, color, sway);
      sleeve(ctx, 1, 62, color, sway);
      bodyGarment(ctx, color, TORSO_TOP - 6, HIP_Y + 12);
      for (let i = -1; i <= 1; i += 1) {
        strokeLine(ctx, i * 18, TORSO_TOP + 10, i * 18, HIP_Y, shade(color, -0.16), 3.5);
      }
      break;
    default: // short sleeves
      sleeve(ctx, -1, 30, color, sway);
      sleeve(ctx, 1, 30, color, sway);
      bodyGarment(ctx, color);
  }
}

function skirt(ctx, color, hem, flare) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-36, HIP_Y - 14);
  ctx.lineTo(36, HIP_Y - 14);
  ctx.quadraticCurveTo(flare, hem - 16, flare, hem);
  ctx.quadraticCurveTo(0, hem + 14, -flare, hem);
  ctx.quadraticCurveTo(-flare, hem - 16, -36, HIP_Y - 14);
  ctx.closePath();
  ctx.fill();
}

function drawBottom(ctx, style, color) {
  switch (style) {
    case 1: // shorts
      capsule(ctx, -17, HIP_Y - 18, HIP_Y + 26, 30, color);
      capsule(ctx, 17, HIP_Y - 18, HIP_Y + 26, 30, color);
      fillRR(ctx, -36, HIP_Y - 20, 72, 26, 12, color);
      break;
    case 2: // short skirt
      skirt(ctx, color, HIP_Y + 34, 54);
      break;
    case 3: // long skirt
      skirt(ctx, color, HIP_Y + 62, 62);
      break;
    default: // trousers
      capsule(ctx, -17, HIP_Y - 18, -18, 30, color);
      capsule(ctx, 17, HIP_Y - 18, -18, 30, color);
      fillRR(ctx, -36, HIP_Y - 20, 72, 28, 12, color);
  }
}

function drawDress(ctx, color) {
  bodyGarment(ctx, color, TORSO_TOP - 2, HIP_Y - 6);
  skirt(ctx, color, HIP_Y + 46, 64);
  fillRR(ctx, -40, HIP_Y - 22, 80, 9, 4, shade(color, -0.3));
}

function drawShoes(ctx, style, color) {
  const shoe = (x) => {
    switch (style) {
      case 1: // boots
        capsule(ctx, x, -42, -1, 30, color);
        fillEllipse(ctx, x + 3, -6, 19, 8, shade(color, -0.2));
        break;
      case 2: // sandals
        fillEllipse(ctx, x + 2, -6, 17, 7, color);
        strokeLine(ctx, x - 4, -8, x + 8, -20, color, 5);
        break;
      case 3: // trainers
        fillRR(ctx, x - 13, -24, 32, 20, 10, color);
        fillEllipse(ctx, x + 3, -6, 20, 8, '#ffffff');
        break;
      default: // simple flats
        fillEllipse(ctx, x + 2, -8, 18, 10, color);
    }
  };
  shoe(-19);
  shoe(19);
}

// ------------------------------------------------------------------ extra
// Drawn in head-local coordinates.

function drawExtra(ctx, style, hairColor) {
  switch (style) {
    case 1: // round glasses
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(-22, -6, 17, 0, Math.PI * 2);
      ctx.moveTo(39, -6);
      ctx.arc(22, -6, 17, 0, Math.PI * 2);
      ctx.stroke();
      strokeLine(ctx, -5, -6, 5, -6, DARK, 3.5);
      break;
    case 2: // sun hat
      fillEllipse(ctx, 0, -44, 78, 15, '#f2b13d');
      fillEllipse(ctx, 0, -62, 38, 26, '#f2b13d');
      fillRR(ctx, -38, -54, 76, 11, 5, '#e05a7a');
      break;
    case 3: // bow
      fillPoly(ctx, [-44, -52, -16, -62, -16, -40], '#e05a7a');
      fillPoly(ctx, [14, -62, 42, -52, 14, -40], '#e05a7a');
      fillCircle(ctx, -1, -51, 9, shade('#e05a7a', -0.18));
      break;
    case 4: // crown
      fillPoly(ctx, [
        -38, -44, -38, -74, -20, -58, 0, -80, 20, -58, 38, -74, 38, -44,
      ], '#f7d04a');
      fillCircle(ctx, 0, -54, 6, '#e05a7a');
      break;
    case 5: // headphones
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, -6, HEAD_R + 8, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      fillRR(ctx, -HEAD_R - 16, -20, 17, 32, 8, shade(hairColor, -0.4));
      fillRR(ctx, HEAD_R - 1, -20, 17, 32, 8, shade(hairColor, -0.4));
      break;
    default:
      break;
  }
}
