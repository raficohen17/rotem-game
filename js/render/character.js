/**
 * Draws a character from its part indices.
 *
 * Origin is between the feet, so a character stands on a baseline the same way
 * furniture does and sorts into the same depth order. Height is CHAR_H at
 * scale 1.
 *
 * The head is built to be configured rather than decorated. The skull is a
 * parametric outline, not a circle; the eyes have a sclera, an iris, a pupil,
 * a highlight and a lid; brows, nose and mouth are separate parts. Feature
 * placement is measured off the face shape, so a wide face gets wider-set eyes
 * instead of the same face with a different border.
 *
 * The body stays stylised — short chunky limbs, mitten hands, rounded ends —
 * so the detail sits where a player actually looks.
 *
 * The design language is cut paper: flat shapes stacked with a soft shadow
 * between them rather than outlines. See `paperLayer` in shapes.js for why.
 *
 * Every part is drawn from an index, never from stored colours or shapes —
 * which is what lets the whole cast be restyled later without touching a
 * single save file.
 */

import { fillRR, fillCircle, fillEllipse, fillPoly, strokeLine, shade, paperLayer } from './shapes.js';
import {
  SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, LIP_COLORS, EYE_COLORS, FACE_SHAPES,
  BUILDS, clampSpec,
} from '../model/character.js';

/** How far the skull rises above the head origin. */
const HEAD_TOP = 58;

/**
 * A generous envelope for hit testing. Builds differ in height, and a grab box
 * a little larger than the tallest of them is better than one that misses a
 * head.
 */
export const CHAR_H = 310;
export const CHAR_W = 150;

/**
 * The head is drawn at natural size and scaled onto the body. At 0.55 the head
 * is roughly a fifth of the figure, which is what reads as a fashion doll —
 * the previous 0.82 was a third, which reads as a toddler.
 */
const HEAD_SCALE = 0.55;

/** Nominal skull radius, used by hair and accessories. */
const HEAD_R = 58;

const DARK = '#3f3a45';
const PAPER = '#f6f1e8';

/**
 * Where every joint sits, derived from the chosen build.
 *
 * Held in a module-level variable rather than threaded through thirty drawing
 * functions. Canvas rendering is single-threaded and every draw sets this
 * first, so there is no interleaving to worry about — and the alternative was
 * an extra parameter on every garment.
 */
function metricsFor(b) {
  const hipY = -b.leg;
  const torsoTop = hipY - 82;
  return {
    shoulderW: b.shoulder,
    waistW: b.waist,
    hipW: b.hip,
    armW: b.arm,
    legW: Math.round(b.hip * 0.56),
    hipY,
    waistY: hipY - 26,
    torsoTop,
    shoulderY: torsoTop + 8,
    chinY: torsoTop - 20,
    armX: b.shoulder + 7,
    armLen: 100,
  };
}

let B = metricsFor(BUILDS[2]);

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
  B = metricsFor(BUILDS[spec.build]);
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

  const shape = FACE_SHAPES[spec.face];
  const headY = B.chinY - shape.chin * HEAD_SCALE;

  /** Runs a draw call in head space: anchored at the chin and scaled to fit. */
  const onHead = (draw) => {
    ctx.save();
    ctx.translate(0, headY);
    ctx.rotate(sway * 0.02);
    ctx.scale(HEAD_SCALE, HEAD_SCALE);
    draw();
    ctx.restore();
  };

  ctx.save();
  ctx.translate(0, breath * 1.5);

  // Each group is its own sheet of paper, so the character reads as a stack of
  // cut shapes rather than as one flat sticker.
  paperLayer(ctx, () => onHead(() => drawBackHair(ctx, spec.hair, hairColor)), 0.8);
  paperLayer(ctx, () => {
    drawLegs(ctx, skin);
    drawShoes(ctx, spec.shoes, CLOTH_COLORS[spec.shoesColor]);
  }, 0.7);

  // Arms sit behind the body so the wide head and torso stay unbroken.
  paperLayer(ctx, () => drawArms(ctx, skin, sway), 0.7);
  paperLayer(ctx, () => {
    drawNeck(ctx, skin);
    drawTorso(ctx, skin);
  }, 0.9);

  paperLayer(ctx, () => {
    if (spec.bottom === 4) {
      drawDress(ctx, CLOTH_COLORS[spec.bottomColor]);
    } else {
      drawBottom(ctx, spec.bottom, CLOTH_COLORS[spec.bottomColor]);
      drawTop(ctx, spec.top, CLOTH_COLORS[spec.topColor], sway);
    }
  });

  paperLayer(ctx, () => drawHands(ctx, skin, sway), 0.6);
  onHead(() => drawHead(ctx, skin, spec, shape, hairColor, blinking));

  ctx.restore();
}

// ------------------------------------------------------------------- body

function drawLegs(ctx, skin) {
  const x = B.hipW * 0.42;
  capsule(ctx, -x, B.hipY - 6, -12, B.legW, skin);
  capsule(ctx, x, B.hipY - 6, -12, B.legW, skin);
}

function drawNeck(ctx, skin) {
  capsule(ctx, 0, B.chinY - 8, B.torsoTop + 18, 19, shade(skin, -0.1));
}

/**
 * The torso, with an actual waist.
 *
 * Three widths — shoulder, waist, hip — curved between, rather than the slab
 * this used to be. The waist is what makes a build read as a build.
 */
function drawTorso(ctx, skin) {
  const { shoulderW: sw, waistW: ww, hipW: hw, torsoTop: top, waistY: waist, hipY: hip } = B;

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-sw, top + 16);
  ctx.quadraticCurveTo(-sw, top, -sw * 0.45, top);
  ctx.lineTo(sw * 0.45, top);
  ctx.quadraticCurveTo(sw, top, sw, top + 16);
  ctx.quadraticCurveTo(ww, waist - 14, ww, waist);
  ctx.quadraticCurveTo(hw, hip - 18, hw, hip);
  ctx.quadraticCurveTo(hw * 0.72, hip + 8, 0, hip + 8);
  ctx.quadraticCurveTo(-hw * 0.72, hip + 8, -hw, hip);
  ctx.quadraticCurveTo(-hw, hip - 18, -ww, waist);
  ctx.quadraticCurveTo(-ww, waist - 14, -sw, top + 16);
  ctx.closePath();
  ctx.fill();
}

function armAngle(sway, side) {
  return sway * 0.05 * side;
}

function drawArms(ctx, skin, sway) {
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(B.armX * side, B.shoulderY);
    ctx.rotate(armAngle(sway, side));
    capsule(ctx, 0, -8, B.armLen, B.armW, skin);
    ctx.restore();
  }
}

/** Hands, drawn after the sleeves so a long sleeve stops at the wrist. */
function drawHands(ctx, skin, sway) {
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(B.armX * side, B.shoulderY);
    ctx.rotate(armAngle(sway, side));
    fillEllipse(ctx, 0, B.armLen - 4, B.armW * 0.62, B.armW * 0.8, skin);
    ctx.restore();
  }
}

// ------------------------------------------------------------------- head

/**
 * The skull outline, built from the chosen face shape's parameters.
 *
 * Drawn as a path rather than a circle because the face is meant to be
 * configured, not decorated: a heart face and a square jaw have to be
 * genuinely different heads, and everything else — where the eyes sit, how
 * wide the hairline runs — is measured off these numbers.
 */
function facePath(ctx, s) {
  // A square chin needs its control points pushed out toward the jaw corners;
  // a round one pulls them in.
  const square = 1 - s.chinRound;
  const corner = s.jaw * (0.5 + square * 0.45);

  ctx.beginPath();
  ctx.moveTo(0, -HEAD_TOP);
  ctx.bezierCurveTo(s.temple * 0.92, -HEAD_TOP, s.cheek, -HEAD_TOP * 0.5, s.cheek, -4);
  ctx.bezierCurveTo(s.cheek, s.chin * 0.34, s.jaw * 1.06, s.chin * 0.66, corner, s.chin - 6);
  ctx.quadraticCurveTo(corner * square * 0.8, s.chin, 0, s.chin);
  ctx.quadraticCurveTo(-corner * square * 0.8, s.chin, -corner, s.chin - 6);
  ctx.bezierCurveTo(-s.jaw * 1.06, s.chin * 0.66, -s.cheek, s.chin * 0.34, -s.cheek, -4);
  ctx.bezierCurveTo(-s.cheek, -HEAD_TOP * 0.5, -s.temple * 0.92, -HEAD_TOP, 0, -HEAD_TOP);
  ctx.closePath();
}

/** Builds the face path scaled about the head centre, for hair that hugs it. */
function facePathScaled(ctx, s, k) {
  ctx.save();
  ctx.scale(k, k);
  facePath(ctx, s);
  ctx.restore();
}

/** Where the features sit, measured off the face shape rather than fixed. */
function layout(s) {
  return {
    eyeX: s.cheek * 0.4,
    eyeY: -4,
    browY: -26,
    noseY: s.chin * 0.3,
    mouthY: s.chin * 0.63,
  };
}

/**
 * Ears go on before the face and are overdrawn by it, so only the outer rim
 * shows. Drawn on top at cheek height they read as swelling, not as ears.
 */
function drawEars(ctx, s, skin) {
  for (const side of [-1, 1]) {
    fillEllipse(ctx, side * (s.cheek + 3), 4, 11, 16, shade(skin, -0.06));
    fillEllipse(ctx, side * (s.cheek + 6), 4, 5, 9, shade(skin, -0.2));
  }
}

function drawHead(ctx, skin, spec, shape, hairColor, blinking) {
  const place = layout(shape);

  paperLayer(ctx, () => {
    drawEars(ctx, shape, skin);
    facePath(ctx, shape);
    ctx.fillStyle = skin;
    ctx.fill();
  }, 1.1);

  drawBrows(ctx, spec.brows, place, shade(hairColor, -0.12));
  drawEyes(ctx, spec.eyes, EYE_COLORS[spec.eyeColor], place, blinking);
  drawNose(ctx, spec.nose, place, skin);
  drawMouth(ctx, spec.mouth, LIP_COLORS[spec.mouthColor], place);

  paperLayer(ctx, () => drawFrontHair(ctx, spec.hair, hairColor, shape), 0.7);
  paperLayer(ctx, () => drawHairpin(ctx, spec.hairpin, CLOTH_COLORS[spec.hairpinColor], shape), 0.6);
  paperLayer(ctx, () => drawExtra(ctx, spec.extra, CLOTH_COLORS[spec.extraColor]), 0.7);
}

// ------------------------------------------------------------------- face
//
// Face parts are drawn in head-local coordinates — the origin is the middle of
// the head — and take a `place` object giving where the shape puts each
// feature, so a wide face gets wider-set eyes rather than the same face with a
// different border.
//
// Eyes are built from real parts: sclera, iris, pupil, highlight and a lash
// line. That is what separates a configurable face from two dots.

/** Eye geometry per style. `tilt` in radians, positive turning the outer corner down. */
const EYE_SHAPES = [
  { w: 13, h: 10.5, tilt: 0, lid: 3.2, lash: false }, // almond
  { w: 12, h: 13, tilt: 0, lid: 3, lash: false }, // round
  { w: 16, h: 10, tilt: 0, lid: 3, lash: false }, // wide
  { w: 14, h: 7.5, tilt: 0, lid: 3.4, lash: false }, // narrow
  { w: 13.5, h: 10.5, tilt: -0.2, lid: 3.2, lash: true }, // upturned
  { w: 13.5, h: 10.5, tilt: 0.2, lid: 3.2, lash: false }, // downturned
  { w: 14, h: 9, tilt: 0, lid: 5.5, lash: false }, // hooded
  { w: 15, h: 14, tilt: 0, lid: 3, lash: true }, // large
  { w: 10, h: 8.5, tilt: 0, lid: 2.6, lash: false }, // small
  { w: 13, h: 6, tilt: 0.08, lid: 4.5, lash: false }, // sleepy
];

/** Brow geometry per style. `arch` is how far the middle lifts. */
const BROW_SHAPES = [
  { thick: 5, arch: 6, tilt: 0, len: 21 }, // natural
  { thick: 4, arch: 11, tilt: 0, len: 21 }, // arched
  { thick: 8.5, arch: 4, tilt: 0, len: 23 }, // thick
  { thick: 3, arch: 5, tilt: 0, len: 18 }, // fine
  { thick: 5.5, arch: 1, tilt: 0.26, len: 21 }, // angled
  { thick: 6, arch: 13, tilt: 0, len: 22 }, // high arch
  { thick: 10, arch: 2, tilt: -0.12, len: 25 }, // bushy
  { thick: 4, arch: 0, tilt: 0, len: 20 }, // flat
];

function drawBrows(ctx, style, place, color) {
  const b = BROW_SHAPES[style];
  ctx.strokeStyle = color;
  ctx.lineWidth = b.thick;
  ctx.lineCap = 'round';

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * place.eyeX, place.browY);
    ctx.rotate(b.tilt * side);
    ctx.beginPath();
    ctx.moveTo(-b.len * 0.5 * side, 2);
    ctx.quadraticCurveTo(0, -b.arch, b.len * 0.5 * side, 0);
    ctx.stroke();
    ctx.restore();
  }
}

/** A shut eye: the lash line curved down over the closed lid. */
function closedEye(ctx, e) {
  ctx.strokeStyle = DARK;
  ctx.lineWidth = e.lid;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-e.w * 0.9, -1);
  ctx.quadraticCurveTo(0, e.h * 0.75, e.w * 0.9, -1);
  ctx.stroke();
}

function drawEyes(ctx, style, iris, place, blinking) {
  const e = EYE_SHAPES[style];
  const sleepy = style === 9;

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * place.eyeX, place.eyeY);
    ctx.rotate(e.tilt * side);

    if (blinking) {
      closedEye(ctx, e);
      ctx.restore();
      continue;
    }

    // Sclera, clipped so nothing inside it spills over the lids.
    fillEllipse(ctx, 0, 0, e.w, e.h, '#efe9dd');
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, e.w, e.h, 0, 0, Math.PI * 2);
    ctx.clip();

    const irisR = Math.min(e.w, e.h) * 0.92;
    fillCircle(ctx, side * 1.5, sleepy ? 1 : 0, irisR, iris);
    fillCircle(ctx, side * 1.5, sleepy ? 1 : 0, irisR * 0.46, '#241d1a');
    fillCircle(ctx, side * 1.5 + irisR * 0.36, -irisR * 0.38, irisR * 0.26, PAPER);
    fillCircle(ctx, side * 1.5 - irisR * 0.3, irisR * 0.42, irisR * 0.13, '#ffffff88');

    // The upper lid sits inside the clip, so it thickens the eye's top edge.
    ctx.fillStyle = DARK;
    ctx.beginPath();
    ctx.moveTo(-e.w - 1, -e.h - 1);
    ctx.lineTo(e.w + 1, -e.h - 1);
    ctx.lineTo(e.w + 1, -e.h + e.lid);
    ctx.quadraticCurveTo(0, -e.h + e.lid * 2.6, -e.w - 1, -e.h + e.lid);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Lash line and outer corner, drawn over the sclera edge.
    ctx.strokeStyle = DARK;
    ctx.lineWidth = e.lid * 0.62;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-e.w, -e.h * 0.35);
    ctx.quadraticCurveTo(0, -e.h * 1.25, e.w, -e.h * 0.35);
    ctx.stroke();

    if (e.lash) {
      strokeLine(ctx, side * e.w * 0.95, -e.h * 0.5, side * (e.w + 7), -e.h - 4, DARK, 2.8);
    }
    ctx.restore();
  }
}

/** Index 0 is no nose at all, which suits the plainest faces. */
function drawNose(ctx, style, place, skin) {
  const ink = shade(skin, -0.24);
  const deep = shade(skin, -0.34);
  const y = place.noseY;

  switch (style) {
    case 1: // small and soft, a shadow under the tip
      fillEllipse(ctx, 0, y, 5.5, 4, ink);
      fillEllipse(ctx, 0, y - 2, 3.5, 2.5, shade(skin, 0.12));
      break;
    case 2: // straight bridge with a defined tip
      capsule(ctx, 0, y - 15, y + 1, 6, ink);
      fillEllipse(ctx, 0, y + 1, 6, 4, deep);
      fillCircle(ctx, -7, y + 1, 2.4, deep);
      fillCircle(ctx, 7, y + 1, 2.4, deep);
      break;
    case 3: // a curved line only, the lightest touch
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-1, y - 10);
      ctx.quadraticCurveTo(-6, y + 2, 2, y + 3);
      ctx.stroke();
      break;
    case 4: // broad, with wide nostrils
      fillEllipse(ctx, 0, y - 1, 9, 6, ink);
      fillEllipse(ctx, -8, y + 1, 3.6, 2.8, deep);
      fillEllipse(ctx, 8, y + 1, 3.6, 2.8, deep);
      break;
    case 5: // button nose with freckles scattered across the cheeks
      fillEllipse(ctx, 0, y, 5, 4, ink);
      for (const [fx, fy] of [[-22, 2], [-15, 8], [-28, 8], [15, 8], [22, 2], [28, 8], [-18, -3], [18, -3]]) {
        fillCircle(ctx, fx, y + fy, 1.9, shade(skin, -0.26));
      }
      break;
    default:
      break;
  }
}

function drawMouth(ctx, style, lip, place) {
  const y = place.mouthY;
  ctx.lineCap = 'round';

  switch (style) {
    case 1: // open, delighted
      ctx.fillStyle = '#5c3a3a';
      ctx.beginPath();
      ctx.ellipse(0, y, 13, 11, 0, 0, Math.PI);
      ctx.fill();
      fillEllipse(ctx, 0, y + 7, 8, 4.5, lip);
      strokeLine(ctx, -13, y, 13, y, shade(lip, -0.2), 3);
      break;
    case 2: // a small round o
      fillEllipse(ctx, 0, y + 1, 6.5, 7.5, shade(lip, -0.35));
      fillEllipse(ctx, 0, y + 2.5, 4, 4, '#5c3a3a');
      break;
    case 3: // closed and level
      strokeLine(ctx, -10, y, 10, y, shade(lip, -0.3), 4);
      fillEllipse(ctx, 0, y - 3.5, 9, 3.5, lip);
      fillEllipse(ctx, 0, y + 3.5, 10, 4, shade(lip, -0.1));
      break;
    case 4: // tongue out
      ctx.fillStyle = '#5c3a3a';
      ctx.beginPath();
      ctx.ellipse(0, y, 12, 9, 0, 0, Math.PI);
      ctx.fill();
      fillEllipse(ctx, 0, y + 8, 7, 6, shade(lip, 0.2));
      break;
    case 5: // full lips
      fillEllipse(ctx, -6, y - 3, 7, 4.5, lip);
      fillEllipse(ctx, 6, y - 3, 7, 4.5, lip);
      fillEllipse(ctx, 0, y + 4, 14, 7, shade(lip, -0.1));
      strokeLine(ctx, -13, y + 0.5, 13, y + 0.5, shade(lip, -0.4), 2.2);
      break;
    case 6: // a grin showing teeth
      ctx.fillStyle = '#5c3a3a';
      ctx.beginPath();
      ctx.ellipse(0, y, 15, 10, 0, 0, Math.PI);
      ctx.fill();
      fillRR(ctx, -13, y, 26, 5.5, 2, PAPER);
      strokeLine(ctx, -15, y, 15, y, shade(lip, -0.2), 3);
      break;
    case 7: // downturned
      ctx.strokeStyle = shade(lip, -0.35);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, y + 12, 12, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      break;
    case 8: // a one-sided smirk
      ctx.strokeStyle = shade(lip, -0.35);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-11, y);
      ctx.quadraticCurveTo(4, y + 7, 12, y - 4);
      ctx.stroke();
      break;
    case 9: // pursed
      fillEllipse(ctx, 0, y, 9, 8, lip);
      fillEllipse(ctx, 0, y, 4.5, 3, shade(lip, -0.4));
      break;
    default: // an easy smile, with a hint of lower lip
      ctx.strokeStyle = shade(lip, -0.3);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, y - 7, 13, Math.PI * 0.18, Math.PI * 0.82);
      ctx.stroke();
      fillEllipse(ctx, 0, y + 5, 8, 3, lip);
  }
}

// ------------------------------------------------------------------- hair
// Hair carries most of a character's identity, so the silhouettes are pushed
// well apart rather than being small variations on a cap.

/** Drawn before the body, so it falls behind the shoulders. */
function drawBackHair(ctx, style, color) {
  const y = 0;
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
function drawFrontHair(ctx, style, color, shape) {
  // The cap is the face's own outline, grown slightly and filled from the
  // crown down to the hairline. Clipping to the skull is what lets one set of
  // hairstyles sit correctly on eight different head shapes.
  const hairline = style === 8 ? -26 : -14; // style 8 is cropped close

  ctx.save();
  facePathScaled(ctx, shape, 1.07);
  ctx.clip();
  // The bottom edge is a curve, not a straight cut — a level hairline right
  // across the forehead is what made this read as a helmet.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-95, -HEAD_TOP * 1.3);
  ctx.lineTo(95, -HEAD_TOP * 1.3);
  ctx.lineTo(95, hairline + 4);
  ctx.quadraticCurveTo(0, hairline - 22, -95, hairline + 4);
  ctx.closePath();
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
  ctx.translate(B.armX * side, B.shoulderY);
  ctx.rotate(armAngle(sway, side));
  capsule(ctx, 0, -10, length, B.armW + 5, color);
  ctx.restore();
}

/** A garment that follows the torso, nipped in at the waist like the body. */
function bodyGarment(ctx, color, top = B.torsoTop - 4, bottom = B.hipY + 6) {
  const sw = B.shoulderW + 3;
  const ww = B.waistW + 3;
  const hw = B.hipW + 3;
  const waist = Math.max(top + 20, Math.min(B.waistY, bottom - 10));

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-sw, top + 16);
  ctx.quadraticCurveTo(-sw, top, -sw * 0.45, top);
  ctx.lineTo(sw * 0.45, top);
  ctx.quadraticCurveTo(sw, top, sw, top + 16);
  ctx.quadraticCurveTo(ww, waist - 12, ww, waist);
  ctx.quadraticCurveTo(hw, bottom - 16, hw, bottom);
  ctx.lineTo(-hw, bottom);
  ctx.quadraticCurveTo(-hw, bottom - 16, -ww, waist);
  ctx.quadraticCurveTo(-ww, waist - 12, -sw, top + 16);
  ctx.closePath();
  ctx.fill();
}

/** Keeps a pattern inside the garment it belongs to. */
function withinGarment(ctx, draw, top = B.torsoTop - 4, bottom = B.hipY + 10) {
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
      bodyGarment(ctx, color, B.torsoTop + 8);
      break;
    case 3: // hoodie
      sleeve(ctx, -1, 58, color, sway);
      sleeve(ctx, 1, 58, color, sway);
      bodyGarment(ctx, color, B.torsoTop - 8);
      fillEllipse(ctx, 0, B.torsoTop - 2, 36, 17, shade(color, -0.2));
      strokeLine(ctx, -10, B.torsoTop + 20, -10, B.torsoTop + 40, shade(color, 0.45), 3.5);
      strokeLine(ctx, 10, B.torsoTop + 20, 10, B.torsoTop + 40, shade(color, 0.45), 3.5);
      break;
    case 4: // stripes
      sleeve(ctx, -1, 32, color, sway);
      sleeve(ctx, 1, 32, color, sway);
      bodyGarment(ctx, color);
      withinGarment(ctx, () => {
        for (let i = 0; i < 5; i += 1) {
          fillRR(ctx, -44, B.torsoTop + 8 + i * 16, 88, 7, 3, shade(color, 0.5));
        }
      });
      break;
    case 5: // chunky knit
      sleeve(ctx, -1, 62, color, sway);
      sleeve(ctx, 1, 62, color, sway);
      bodyGarment(ctx, color, B.torsoTop - 6, B.hipY + 12);
      for (let i = -1; i <= 1; i += 1) {
        strokeLine(ctx, i * 18, B.torsoTop + 10, i * 18, B.hipY, shade(color, -0.16), 3.5);
      }
      break;
    case 6: // dungarees, straps over a bare shoulder
      bodyGarment(ctx, color, B.torsoTop + 30);
      fillRR(ctx, -26, B.torsoTop - 2, 13, 44, 5, color);
      fillRR(ctx, 13, B.torsoTop - 2, 13, 44, 5, color);
      fillRR(ctx, -20, B.torsoTop + 34, 40, 22, 6, shade(color, 0.18));
      break;
    case 7: // blouse with a collar
      sleeve(ctx, -1, 34, color, sway);
      sleeve(ctx, 1, 34, color, sway);
      bodyGarment(ctx, color);
      fillPoly(ctx, [-20, B.torsoTop - 2, 0, B.torsoTop + 26, -4, B.torsoTop - 2], shade(color, 0.35));
      fillPoly(ctx, [20, B.torsoTop - 2, 0, B.torsoTop + 26, 4, B.torsoTop - 2], shade(color, 0.35));
      for (let i = 0; i < 3; i += 1) {
        fillCircle(ctx, 0, B.torsoTop + 34 + i * 15, 3, shade(color, -0.3));
      }
      break;
    case 8: // open cardigan over a plain shirt
      sleeve(ctx, -1, 60, color, sway);
      sleeve(ctx, 1, 60, color, sway);
      bodyGarment(ctx, color);
      withinGarment(ctx, () => {
        fillRR(ctx, -13, B.torsoTop - 4, 26, 100, 4, shade(color, 0.42));
      });
      break;
    case 9: // crop top
      bodyGarment(ctx, color, B.torsoTop + 4, B.hipY - 26);
      sleeve(ctx, -1, 24, color, sway);
      sleeve(ctx, 1, 24, color, sway);
      break;
    case 10: // puffer jacket
      sleeve(ctx, -1, 62, color, sway);
      sleeve(ctx, 1, 62, color, sway);
      bodyGarment(ctx, color, B.torsoTop - 10, B.hipY + 12);
      withinGarment(ctx, () => {
        for (let i = 0; i < 4; i += 1) {
          strokeLine(ctx, -44, B.torsoTop + 8 + i * 19, 44, B.torsoTop + 8 + i * 19,
            shade(color, -0.18), 3);
        }
      }, B.torsoTop - 10, B.hipY + 12);
      break;
    case 11: // sports jersey
      bodyGarment(ctx, color, B.torsoTop + 2);
      sleeve(ctx, -1, 26, shade(color, 0.3), sway);
      sleeve(ctx, 1, 26, shade(color, 0.3), sway);
      withinGarment(ctx, () => {
        fillRR(ctx, -44, B.torsoTop + 34, 88, 16, 3, shade(color, 0.4));
        fillCircle(ctx, 0, B.torsoTop + 20, 9, shade(color, 0.4));
      });
      break;
    default: // short sleeves
      sleeve(ctx, -1, 30, color, sway);
      sleeve(ctx, 1, 30, color, sway);
      bodyGarment(ctx, color);
  }
}

function skirt(ctx, color, hem, flare) {
  const w = B.hipW + 5;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-w, B.hipY - 14);
  ctx.lineTo(w, B.hipY - 14);
  ctx.quadraticCurveTo(flare, hem - 16, flare, hem);
  ctx.quadraticCurveTo(0, hem + 14, -flare, hem);
  ctx.quadraticCurveTo(-flare, hem - 16, -w, B.hipY - 14);
  ctx.closePath();
  ctx.fill();
}

function trousers(ctx, color, hem, width) {
  const x = B.hipW * 0.42;
  capsule(ctx, -x, B.hipY - 18, hem, width, color);
  capsule(ctx, x, B.hipY - 18, hem, width, color);
  fillRR(ctx, -B.hipW - 2, B.hipY - 20, (B.hipW + 2) * 2, 28, 12, color);
}

function drawBottom(ctx, style, color) {
  switch (style) {
    case 1: // shorts
      trousers(ctx, color, B.hipY + 26, B.legW + 8);
      break;
    case 2: // short skirt
      skirt(ctx, color, B.hipY + 34, 54);
      break;
    case 3: // long skirt
      skirt(ctx, color, B.hipY + 62, 62);
      break;
    case 5: // leggings
      trousers(ctx, color, -12, B.legW + 2);
      break;
    case 6: // pleated skirt
      skirt(ctx, color, B.hipY + 44, 58);
      for (let i = -2; i <= 2; i += 1) {
        strokeLine(ctx, i * 13, B.hipY - 10, i * 21, B.hipY + 38, shade(color, -0.18), 3);
      }
      break;
    case 7: // dungaree trousers
      trousers(ctx, color, -14, B.legW + 8);
      fillRR(ctx, -34, B.hipY - 26, 68, 20, 8, color);
      break;
    case 8: // wide legged
      capsule(ctx, -20, B.hipY - 18, -14, 38, color);
      capsule(ctx, 20, B.hipY - 18, -14, 38, color);
      fillRR(ctx, -38, B.hipY - 20, 76, 28, 12, color);
      break;
    case 9: // tutu, in three layers
      skirt(ctx, shade(color, -0.12), B.hipY + 40, 70);
      skirt(ctx, color, B.hipY + 28, 60);
      skirt(ctx, shade(color, 0.22), B.hipY + 16, 48);
      break;
    default: // trousers
      trousers(ctx, color, -16, B.legW + 6);
  }
}

function drawDress(ctx, color) {
  bodyGarment(ctx, color, B.torsoTop - 2, B.hipY - 6);
  skirt(ctx, color, B.hipY + 46, 64);
  fillRR(ctx, -40, B.hipY - 22, 80, 9, 4, shade(color, -0.3));
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

// ---------------------------------------------------------------- hairpin
//
// Small things worn in the hair, kept as their own part rather than mixed in
// with glasses and scarves — a clip is chosen while picking a hairstyle, not
// while picking an accessory. Drawn in head space over the hair.

/** A four-pointed sparkle, used by a couple of the pins. */
function sparkle(ctx, x, y, r, color) {
  fillPoly(ctx, [x, y - r, x + r * 0.32, y - r * 0.32, x + r, y,
    x + r * 0.32, y + r * 0.32, x, y + r, x - r * 0.32, y + r * 0.32,
    x - r, y, x - r * 0.32, y - r * 0.32], color);
}

function drawHairpin(ctx, style, color, shape) {
  const side = shape.temple * 0.72;
  const top = -HEAD_TOP + 8;

  switch (style) {
    case 1: // a single clip
      ctx.save();
      ctx.translate(-side, top + 6);
      ctx.rotate(-0.42);
      fillRR(ctx, -17, -5, 34, 10, 5, color);
      fillRR(ctx, -12, -1.5, 22, 3, 1.5, shade(color, -0.35));
      ctx.restore();
      break;
    case 2: // two crossed clips
      for (const [dx, angle] of [[-4, -0.5], [4, 0.5]]) {
        ctx.save();
        ctx.translate(-side + dx, top + 8);
        ctx.rotate(angle);
        fillRR(ctx, -15, -4.5, 30, 9, 4.5, color);
        ctx.restore();
      }
      break;
    case 3: // a hairband across the crown
      ctx.strokeStyle = color;
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -6, HEAD_R + 2, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
      break;
    case 4: // a small ribbon bow to one side
      fillPoly(ctx, [-side - 24, top - 4, -side - 6, top - 12, -side - 6, top + 6], color);
      fillPoly(ctx, [-side + 6, top - 12, -side + 24, top - 4, -side + 6, top + 6], color);
      fillCircle(ctx, -side, top - 3, 7, shade(color, -0.2));
      break;
    case 5: // butterfly clips
      for (const dx of [-side, side * 0.75]) {
        fillEllipse(ctx, dx - 7, top + 2, 8, 6, color);
        fillEllipse(ctx, dx + 7, top + 2, 8, 6, color);
        fillRR(ctx, dx - 2, top - 3, 4, 12, 2, shade(color, -0.35));
      }
      break;
    case 6: // a scrunchie
      ctx.strokeStyle = color;
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.arc(side + 6, top + 26, 17, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 7: // sparkle pins scattered along the parting
      sparkle(ctx, -side - 4, top + 2, 9, color);
      sparkle(ctx, -side + 16, top - 10, 7, color);
      sparkle(ctx, -side + 30, top + 4, 6, color);
      break;
    case 8: // a flower pin
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        fillEllipse(ctx, -side + Math.cos(a) * 11, top + Math.sin(a) * 11, 7, 7, color);
      }
      fillCircle(ctx, -side, top, 6, shade(color, 0.4));
      break;
    case 9: // a row of pearl pins
      for (let i = 0; i < 5; i += 1) {
        fillCircle(ctx, -side + i * 15 - 6, top + 2 - Math.abs(i - 2) * 3, 5.5, color);
      }
      break;
    default:
      break;
  }
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
