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
 * The design language is cut paper: flat shapes stacked with a soft shadow
 * between them rather than outlines. See `paperLayer` in shapes.js for why.
 *
 * Every part is drawn from an index, never from stored colours or shapes —
 * which is what lets the whole cast be restyled later without touching a
 * single save file.
 */

import { fillRR, fillCircle, fillEllipse, fillPoly, strokeLine, shade, paperLayer } from './shapes.js';
import { SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, LIP_COLORS, clampSpec } from '../model/character.js';

export const CHAR_H = 260;
export const CHAR_W = 150;

const HEAD_Y = -198;
const HEAD_R = 58;
const SHOULDER_Y = -146;
const TORSO_TOP = -152;
const HIP_Y = -76;
const ARM_X = 44;
const DARK = '#3f3a45';
const PAPER = '#f6f1e8';

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

  // Each group is its own sheet of paper, so the character reads as a stack of
  // cut shapes rather than as one flat sticker.
  paperLayer(ctx, () => drawBackHair(ctx, spec.hair, hairColor), 0.8);
  paperLayer(ctx, () => {
    drawLegs(ctx, skin);
    drawShoes(ctx, spec.shoes, CLOTH_COLORS[spec.shoesColor]);
  }, 0.7);

  // Arms sit behind the body so the wide head and torso stay unbroken.
  paperLayer(ctx, () => drawArms(ctx, skin, sway), 0.7);
  paperLayer(ctx, () => drawTorso(ctx, skin), 0.9);

  paperLayer(ctx, () => {
    if (spec.bottom === 4) {
      drawDress(ctx, CLOTH_COLORS[spec.bottomColor]);
    } else {
      drawBottom(ctx, spec.bottom, CLOTH_COLORS[spec.bottomColor]);
      drawTop(ctx, spec.top, CLOTH_COLORS[spec.topColor], sway);
    }
  });

  paperLayer(ctx, () => drawHands(ctx, skin, sway), 0.6);
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

  paperLayer(ctx, () => {
    fillCircle(ctx, 0, 0, HEAD_R, skin);
    fillEllipse(ctx, -HEAD_R + 3, 10, 8, 12, shade(skin, -0.1));
    fillEllipse(ctx, HEAD_R - 3, 10, 8, 12, shade(skin, -0.1));
  }, 1.1);

  drawEyes(ctx, spec.eyes, blinking);
  drawNose(ctx, spec.nose, skin);
  drawMouth(ctx, spec.mouth, LIP_COLORS[spec.mouthColor]);

  paperLayer(ctx, () => drawFrontHair(ctx, spec.hair, hairColor), 0.7);
  paperLayer(ctx, () => drawExtra(ctx, spec.extra, CLOTH_COLORS[spec.extraColor]), 0.7);
  ctx.restore();
}

// ------------------------------------------------------------------- face
// All face parts are drawn in head-local coordinates: the origin is the middle
// of the head, and the head has radius HEAD_R.

function closedEye(ctx, x) {
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, -2, 10, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();
}

function brow(ctx, x, side, lift, angle = 0) {
  ctx.save();
  ctx.translate(x, -22 - lift);
  ctx.rotate(angle * side);
  strokeLine(ctx, -10, 0, 10, 0, shade(DARK, 0.15), 4);
  ctx.restore();
}

function drawEyes(ctx, style, blinking) {
  const y = -6;

  const eye = (x, side) => {
    if (blinking && style !== 1) { closedEye(ctx, x); return; }

    switch (style) {
      case 1: // closed and happy
        closedEye(ctx, x);
        break;
      case 2: // wide, with a lash
        fillEllipse(ctx, x, y, 10, 11.5, DARK);
        fillCircle(ctx, x + 3.2, y - 4, 3, PAPER);
        strokeLine(ctx, x + side * 11, y - 8, x + side * 17, y - 12, DARK, 3);
        break;
      case 3: // winking on one side
        if (side < 0) closedEye(ctx, x);
        else fillEllipse(ctx, x, y, 8.5, 10, DARK);
        break;
      case 4: // sleepy half-lids
        fillEllipse(ctx, x, y + 2, 9, 5, DARK);
        break;
      case 5: // bright, with two highlights
        fillEllipse(ctx, x, y, 11, 12.5, DARK);
        fillCircle(ctx, x + 4, y - 5, 3.4, PAPER);
        fillCircle(ctx, x - 3.5, y + 5, 2, PAPER);
        break;
      case 6: // almond, angled
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(side * -0.18);
        fillEllipse(ctx, 0, 0, 11, 7, DARK);
        ctx.restore();
        break;
      case 7: // small dots, wide set
        fillCircle(ctx, x + side * 3, y, 5.5, DARK);
        break;
      case 8: // surprised, with raised brows
        brow(ctx, x, side, 10);
        fillEllipse(ctx, x, y + 2, 9, 10, PAPER);
        fillEllipse(ctx, x, y + 2, 6, 7, DARK);
        break;
      case 9: // stern, with angled brows
        brow(ctx, x, side, 2, 0.28);
        fillEllipse(ctx, x, y + 1, 8, 8.5, DARK);
        break;
      default: // the everyday eye — a clean cut oval, nothing more
        fillEllipse(ctx, x, y, 8, 9.5, DARK);
    }
  };

  eye(-22, -1);
  eye(22, 1);
}

/** Index 0 is no nose at all, which suits the plainest faces. */
function drawNose(ctx, style, skin) {
  const ink = shade(skin, -0.28);
  const y = 8;

  switch (style) {
    case 1: // a small soft button
      fillEllipse(ctx, 0, y, 5, 4, ink);
      break;
    case 2: // a little rounded triangle
      fillPoly(ctx, [0, y - 6, 6, y + 4, -6, y + 4], ink);
      break;
    case 3: // a curved line, drawn rather than filled
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, y - 3, 6, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      break;
    case 4: // longer, with a rounded tip
      capsule(ctx, 0, y - 12, y + 4, 7, ink);
      break;
    case 5: // a button nose with freckles across it
      fillEllipse(ctx, 0, y, 5, 4, ink);
      for (const [fx, fy] of [[-20, 4], [-13, 9], [13, 9], [20, 4], [-16, -2], [16, -2]]) {
        fillCircle(ctx, fx, fy, 1.9, shade(skin, -0.3));
      }
      break;
    default:
      break;
  }
}

function drawMouth(ctx, style, lip) {
  const y = 26;
  ctx.lineCap = 'round';

  switch (style) {
    case 1: // open, delighted
      ctx.fillStyle = DARK;
      ctx.beginPath();
      ctx.ellipse(0, y, 13, 11, 0, 0, Math.PI);
      ctx.fill();
      fillEllipse(ctx, 0, y + 7, 8, 4.5, lip);
      break;
    case 2: // a small round o
      fillEllipse(ctx, 0, y + 1, 6, 7, DARK);
      break;
    case 3: // straight and thoughtful
      strokeLine(ctx, -9, y, 9, y, DARK, 4);
      break;
    case 4: // tongue out
      ctx.fillStyle = DARK;
      ctx.beginPath();
      ctx.ellipse(0, y, 12, 9, 0, 0, Math.PI);
      ctx.fill();
      fillEllipse(ctx, 0, y + 8, 7, 6, lip);
      break;
    case 5: // full lips
      fillEllipse(ctx, 0, y - 2, 13, 6, lip);
      fillEllipse(ctx, 0, y + 5, 15, 8, shade(lip, -0.12));
      strokeLine(ctx, -13, y + 1, 13, y + 1, shade(lip, -0.35), 2.5);
      break;
    case 6: // a grin showing teeth
      ctx.fillStyle = DARK;
      ctx.beginPath();
      ctx.ellipse(0, y, 15, 10, 0, 0, Math.PI);
      ctx.fill();
      fillRR(ctx, -13, y, 26, 5, 2, PAPER);
      break;
    case 7: // downturned
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, y + 12, 12, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      break;
    case 8: // a one-sided smirk
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-11, y);
      ctx.quadraticCurveTo(4, y + 7, 12, y - 4);
      ctx.stroke();
      break;
    case 9: // pursed
      fillEllipse(ctx, 0, y, 9, 8, lip);
      fillEllipse(ctx, 0, y, 5, 3, shade(lip, -0.3));
      break;
    default: // an easy smile
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 4;
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
    case 9: // long and wavy
      fillEllipse(ctx, -54, y + 34, 26, 74, color);
      fillEllipse(ctx, 54, y + 34, 26, 74, color);
      fillRR(ctx, -56, y - 30, 112, 90, 40, color);
      break;
    case 10: // space buns
      fillCircle(ctx, -50, y - 44, 24, color);
      fillCircle(ctx, 50, y - 44, 24, color);
      break;
    case 11: // a high puff
      fillCircle(ctx, 0, y - 62, 40, color);
      break;
    case 12: // long with a straight fringe
      fillRR(ctx, -58, y - 34, 116, 132, 40, color);
      break;
    case 13: // one ponytail off to the side
      fillCircle(ctx, -56, y - 18, 19, color);
      fillEllipse(ctx, -70, y + 26, 21, 48, color);
      break;
    default:
      break;
  }
}

/** The cap over the skull and the fringe, in head-local coordinates. */
function drawFrontHair(ctx, style, color) {
  // Style 8 is cropped so close that it needs no separate fringe.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, HEAD_R + 4, Math.PI * 0.98, Math.PI * 2.02);
  ctx.lineTo(HEAD_R + 4, style === 8 ? -26 : -14);
  ctx.lineTo(-HEAD_R - 4, style === 8 ? -26 : -14);
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
    case 8: // cropped short
      break;
    case 9: // soft waves framing the face
      fillEllipse(ctx, -30, -34, 32, 22, color);
      fillEllipse(ctx, 30, -34, 32, 22, color);
      break;
    case 10: // small fringe under the buns
      fillEllipse(ctx, 0, -40, 44, 20, color);
      break;
    case 11: // pushed back off the forehead
      fillEllipse(ctx, 0, -46, 50, 20, color);
      break;
    case 12: // a heavy straight fringe
      fillRR(ctx, -HEAD_R - 2, -HEAD_R - 6, HEAD_R * 2 + 4, 52, 10, color);
      break;
    case 13: // swept hard to one side
      fillEllipse(ctx, -26, -40, 46, 22, color);
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

/** Keeps a pattern inside the garment it belongs to. */
function withinGarment(ctx, draw, top = TORSO_TOP - 4, bottom = HIP_Y + 10) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(-44, top, 88, bottom - top);
  ctx.clip();
  draw();
  ctx.restore();
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
      withinGarment(ctx, () => {
        for (let i = 0; i < 5; i += 1) {
          fillRR(ctx, -44, TORSO_TOP + 8 + i * 16, 88, 7, 3, shade(color, 0.5));
        }
      });
      break;
    case 5: // chunky knit
      sleeve(ctx, -1, 62, color, sway);
      sleeve(ctx, 1, 62, color, sway);
      bodyGarment(ctx, color, TORSO_TOP - 6, HIP_Y + 12);
      for (let i = -1; i <= 1; i += 1) {
        strokeLine(ctx, i * 18, TORSO_TOP + 10, i * 18, HIP_Y, shade(color, -0.16), 3.5);
      }
      break;
    case 6: // dungarees, straps over a bare shoulder
      bodyGarment(ctx, color, TORSO_TOP + 30);
      fillRR(ctx, -26, TORSO_TOP - 2, 13, 44, 5, color);
      fillRR(ctx, 13, TORSO_TOP - 2, 13, 44, 5, color);
      fillRR(ctx, -20, TORSO_TOP + 34, 40, 22, 6, shade(color, 0.18));
      break;
    case 7: // blouse with a collar
      sleeve(ctx, -1, 34, color, sway);
      sleeve(ctx, 1, 34, color, sway);
      bodyGarment(ctx, color);
      fillPoly(ctx, [-20, TORSO_TOP - 2, 0, TORSO_TOP + 26, -4, TORSO_TOP - 2], shade(color, 0.35));
      fillPoly(ctx, [20, TORSO_TOP - 2, 0, TORSO_TOP + 26, 4, TORSO_TOP - 2], shade(color, 0.35));
      for (let i = 0; i < 3; i += 1) {
        fillCircle(ctx, 0, TORSO_TOP + 34 + i * 15, 3, shade(color, -0.3));
      }
      break;
    case 8: // open cardigan over a plain shirt
      sleeve(ctx, -1, 60, color, sway);
      sleeve(ctx, 1, 60, color, sway);
      bodyGarment(ctx, color);
      withinGarment(ctx, () => {
        fillRR(ctx, -13, TORSO_TOP - 4, 26, 100, 4, shade(color, 0.42));
      });
      break;
    case 9: // crop top
      bodyGarment(ctx, color, TORSO_TOP + 4, HIP_Y - 26);
      sleeve(ctx, -1, 24, color, sway);
      sleeve(ctx, 1, 24, color, sway);
      break;
    case 10: // puffer jacket
      sleeve(ctx, -1, 62, color, sway);
      sleeve(ctx, 1, 62, color, sway);
      bodyGarment(ctx, color, TORSO_TOP - 10, HIP_Y + 12);
      withinGarment(ctx, () => {
        for (let i = 0; i < 4; i += 1) {
          strokeLine(ctx, -44, TORSO_TOP + 8 + i * 19, 44, TORSO_TOP + 8 + i * 19,
            shade(color, -0.18), 3);
        }
      }, TORSO_TOP - 10, HIP_Y + 12);
      break;
    case 11: // sports jersey
      bodyGarment(ctx, color, TORSO_TOP + 2);
      sleeve(ctx, -1, 26, shade(color, 0.3), sway);
      sleeve(ctx, 1, 26, shade(color, 0.3), sway);
      withinGarment(ctx, () => {
        fillRR(ctx, -44, TORSO_TOP + 34, 88, 16, 3, shade(color, 0.4));
        fillCircle(ctx, 0, TORSO_TOP + 20, 9, shade(color, 0.4));
      });
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

function trousers(ctx, color, hem, width) {
  capsule(ctx, -17, HIP_Y - 18, hem, width, color);
  capsule(ctx, 17, HIP_Y - 18, hem, width, color);
  fillRR(ctx, -36, HIP_Y - 20, 72, 28, 12, color);
}

function drawBottom(ctx, style, color) {
  switch (style) {
    case 1: // shorts
      trousers(ctx, color, HIP_Y + 26, 30);
      break;
    case 2: // short skirt
      skirt(ctx, color, HIP_Y + 34, 54);
      break;
    case 3: // long skirt
      skirt(ctx, color, HIP_Y + 62, 62);
      break;
    case 5: // leggings
      trousers(ctx, color, -14, 24);
      break;
    case 6: // pleated skirt
      skirt(ctx, color, HIP_Y + 44, 58);
      for (let i = -2; i <= 2; i += 1) {
        strokeLine(ctx, i * 13, HIP_Y - 10, i * 21, HIP_Y + 38, shade(color, -0.18), 3);
      }
      break;
    case 7: // dungaree trousers
      trousers(ctx, color, -16, 32);
      fillRR(ctx, -34, HIP_Y - 26, 68, 20, 8, color);
      break;
    case 8: // wide legged
      capsule(ctx, -20, HIP_Y - 18, -14, 38, color);
      capsule(ctx, 20, HIP_Y - 18, -14, 38, color);
      fillRR(ctx, -38, HIP_Y - 20, 76, 28, 12, color);
      break;
    case 9: // tutu, in three layers
      skirt(ctx, shade(color, -0.12), HIP_Y + 40, 70);
      skirt(ctx, color, HIP_Y + 28, 60);
      skirt(ctx, shade(color, 0.22), HIP_Y + 16, 48);
      break;
    default: // trousers
      trousers(ctx, color, -18, 30);
  }
}

function drawDress(ctx, color) {
  bodyGarment(ctx, color, TORSO_TOP - 2, HIP_Y - 6);
  skirt(ctx, color, HIP_Y + 46, 64);
  fillRR(ctx, -40, HIP_Y - 22, 80, 9, 4, shade(color, -0.3));
}

function drawShoes(ctx, style, color) {
  const shoe = (x, side) => {
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
        fillEllipse(ctx, x + 3, -6, 20, 8, PAPER);
        break;
      case 4: // mary janes, with a strap
        fillEllipse(ctx, x + 2, -8, 18, 10, color);
        strokeLine(ctx, x - 10, -14, x + 14, -14, shade(color, -0.25), 4);
        fillCircle(ctx, x + 2, -14, 3.5, shade(color, 0.4));
        break;
      case 5: // wellies
        capsule(ctx, x + 1, -56, -2, 28, color);
        fillEllipse(ctx, x + 4, -6, 20, 9, shade(color, -0.25));
        fillRR(ctx, x - 13, -50, 28, 7, 3, shade(color, 0.3));
        break;
      case 6: // fluffy slippers
        fillEllipse(ctx, x + 2, -9, 20, 12, color);
        fillCircle(ctx, x + 2, -18, 9, shade(color, 0.32));
        break;
      case 7: // high tops with laces
        fillRR(ctx, x - 13, -36, 31, 32, 11, color);
        fillEllipse(ctx, x + 3, -6, 21, 8, PAPER);
        for (let i = 0; i < 3; i += 1) {
          strokeLine(ctx, x - 8, -30 + i * 8, x + 12, -30 + i * 8, PAPER, 2.5);
        }
        break;
      default: // simple flats
        fillEllipse(ctx, x + 2, -8, 18, 10, color);
    }
  };
  shoe(-19, -1);
  shoe(19, 1);
}

// ------------------------------------------------------------------ extra
// Drawn in head-local coordinates. Index 0 is nothing at all.

function drawExtra(ctx, style, color) {
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
      fillEllipse(ctx, 0, -44, 78, 15, color);
      fillEllipse(ctx, 0, -62, 38, 26, color);
      fillRR(ctx, -38, -54, 76, 11, 5, shade(color, -0.3));
      break;
    case 3: // bow
      fillPoly(ctx, [-44, -52, -16, -62, -16, -40], color);
      fillPoly(ctx, [14, -62, 42, -52, 14, -40], color);
      fillCircle(ctx, -1, -51, 9, shade(color, -0.18));
      break;
    case 4: // crown
      fillPoly(ctx, [
        -38, -44, -38, -74, -20, -58, 0, -80, 20, -58, 38, -74, 38, -44,
      ], color);
      fillCircle(ctx, 0, -54, 6, shade(color, -0.35));
      break;
    case 5: // headphones
      ctx.strokeStyle = shade(color, -0.4);
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, -6, HEAD_R + 8, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      fillRR(ctx, -HEAD_R - 16, -20, 17, 32, 8, color);
      fillRR(ctx, HEAD_R - 1, -20, 17, 32, 8, color);
      break;
    case 6: // beanie with a bobble
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, -8, HEAD_R + 6, Math.PI, Math.PI * 2);
      ctx.lineTo(HEAD_R + 6, -26);
      ctx.lineTo(-HEAD_R - 6, -26);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
      fillRR(ctx, -HEAD_R - 6, -34, HEAD_R * 2 + 12, 16, 7, shade(color, 0.28));
      fillCircle(ctx, 0, -HEAD_R - 22, 13, shade(color, 0.28));
      break;
    case 7: // flower crown
      for (let i = -2; i <= 2; i += 1) {
        const fx = i * 22;
        const fy = -46 - Math.abs(i) * -3;
        fillCircle(ctx, fx, fy, 9, i % 2 ? shade(color, 0.3) : color);
        fillCircle(ctx, fx, fy, 3.5, '#dcb85c');
      }
      break;
    case 8: // sunglasses
      fillRR(ctx, -40, -16, 34, 22, 9, DARK);
      fillRR(ctx, 6, -16, 34, 22, 9, DARK);
      fillRR(ctx, -8, -9, 16, 5, 2, DARK);
      fillRR(ctx, -36, -13, 12, 6, 3, shade(color, 0.5));
      break;
    case 9: // earrings
      fillCircle(ctx, -HEAD_R + 2, 16, 6, color);
      fillCircle(ctx, HEAD_R - 2, 16, 6, color);
      fillCircle(ctx, -HEAD_R + 2, 16, 2.5, shade(color, 0.45));
      fillCircle(ctx, HEAD_R - 2, 16, 2.5, shade(color, 0.45));
      break;
    case 10: // a scarf round the neck
      fillRR(ctx, -40, HEAD_R - 4, 80, 22, 11, color);
      fillRR(ctx, 12, HEAD_R + 12, 20, 40, 9, shade(color, -0.12));
      break;
    case 11: // cat ears
      fillPoly(ctx, [-46, -34, -30, -74, -12, -40], color);
      fillPoly(ctx, [46, -34, 30, -74, 12, -40], color);
      fillPoly(ctx, [-38, -38, -30, -62, -20, -41], shade(color, 0.4));
      fillPoly(ctx, [38, -38, 30, -62, 20, -41], shade(color, 0.4));
      break;
    default:
      break;
  }
}
