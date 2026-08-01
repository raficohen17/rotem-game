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

import {
  fillRR, fillCircle, fillEllipse, fillPoly, strokeLine, shade, paperLayer, detailLayer,
} from './shapes.js';
import { litFill } from './materials.js';
import {
  SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, LIP_COLORS, EYE_COLORS, FACE_SHAPES,
  BUILDS, SIZES, clampSpec,
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
/**
 * How high off the floor she sits when nothing says otherwise.
 *
 * Overridden per seat, because a stool and a sofa are not the same height and
 * a figure drawn at a fixed height floats above one and sinks into the other.
 */
export const DEFAULT_SEAT = 92;

/** Which pose the figure currently being drawn is in. */
let POSE = 'stand';

/**
 * How much of a character is worth drawing at the size she is being drawn at.
 *
 * A figure is sixty-four painted shapes, and four of them in a room is more
 * than every piece of furniture put together. In the cutaway she is 78 pixels
 * tall: her eyebrows are a third of a pixel, the highlight in her eye is less
 * than that, and the hairpin is a smudge the colour of her hair.
 *
 * So below a size, the parts that cannot resolve are not drawn. What stays is
 * everything you pick her out by across a room — her hair, her clothes, her
 * shape — and what goes is detail that was costing a fifth of the frame to
 * paint under a pixel.
 */
let FINE = true;

/** The height on the screen, in real pixels, below which detail is dropped. */
const FINE_HEIGHT = 150;

/**
 * Whether she is being drawn big enough for the fine parts to land on pixels.
 *
 * A recording canvas has no transform to read — it is measuring what is drawn
 * rather than drawing it — so it gets everything.
 */
function isWorthDetail(ctx, scale) {
  if (typeof ctx.getTransform !== 'function') return true;
  const t = ctx.getTransform();
  return Math.hypot(t.a, t.b) * CHAR_H * scale >= FINE_HEIGHT;
}

/** Whether this character has her hand up. Set per draw, like POSE. */
let HAND_UP = false;

/**
 * The same figure, sitting.
 *
 * Everything above the hip — waist, torso, shoulders, chin, and through them
 * the head and arms — is derived from hipY, so lowering that one number sits
 * the whole character down and shortens the legs to the shins in one move.
 * Seen from the front the thighs point at the viewer and foreshorten to
 * nothing, which is exactly why this reads as sitting rather than as a short
 * person standing: the body drops, the shins stay, and the seat drawn around
 * her does the rest.
 */
export function seatedMetrics(build, seatY) {
  return seated(metricsFor(build), seatY);
}

/** The standing metrics for a build, exposed so a test can compare poses. */
export function standMetrics(build) {
  return metricsFor(build);
}

function seated(b, seatY) {
  const drop = b.hipY + seatY; // hipY is negative; seatY is a height
  return {
    ...b,
    hipY: b.hipY - drop,
    waistY: b.waistY - drop,
    torsoTop: b.torsoTop - drop,
    shoulderY: b.shoulderY - drop,
    chinY: b.chinY - drop,
  };
}

/**
 * @param {number} scale how big this person is: a child is 1, a grown-up more
 */
function metricsFor(b, scale = 1) {
  const s = (value) => value * scale;
  const hipY = s(-b.leg);
  const torsoTop = hipY - s(82);
  return {
    shoulderW: s(b.shoulder),
    waistW: s(b.waist),
    hipW: s(b.hip),
    armW: s(b.arm),
    legW: Math.round(s(b.hip * 0.56)),
    legX: s(b.hip * 0.42),
    hipY,
    waistY: hipY - s(26),
    torsoTop,
    shoulderY: torsoTop + s(8),
    chinY: torsoTop - s(20),
    armX: s(b.shoulder + 7),
    armLen: s(100),
  };
}

/** How tall somebody is against the figure the game started with. */
export function sizeOf(rawSpec) {
  const spec = clampSpec(rawSpec);
  return SIZES[spec.size ?? 0] ?? SIZES[0];
}

/** The hit box for one character, which is not the same for everybody now. */
export function charHeight(rawSpec) {
  return CHAR_H * sizeOf(rawSpec).scale;
}

let B = metricsFor(BUILDS[2]);

/** A limb: a rounded bar whose ends are semicircles. */
function capsule(ctx, cx, top, bottom, width, color) {
  fillRR(ctx, cx - width / 2, top, width, bottom - top, width / 2, color);
}

/**
 * Where the head sits for a given character, in character coordinates.
 *
 * Exported because anything that frames a face — the creator's option cells —
 * has to know. Those cells used to assume a fixed head position, so when the
 * head was re-anchored by the chin they silently began framing the torso,
 * which is how a grid of fourteen hairstyles came to show fourteen bodies.
 */
export function headBounds(rawSpec) {
  const spec = clampSpec(rawSpec);
  const size = sizeOf(spec);
  const metrics = metricsFor(BUILDS[spec.build], size.scale);
  const shape = FACE_SHAPES[spec.face];
  const head = HEAD_SCALE * size.scale * size.head;

  const centre = metrics.chinY - shape.chin * head;
  const top = centre - HEAD_TOP * head;
  const bottom = metrics.chinY;
  return { top, bottom, centre: (top + bottom) / 2, height: bottom - top };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} rawSpec
 * @param {number} time seconds, driving the idle animation
 */
export function drawCharacter(ctx, rawSpec, time = 0, motion = null) {
  const spec = clampSpec(rawSpec);
  const size = sizeOf(spec);
  FINE = motion?.fine ?? isWorthDetail(ctx, size.scale);
  // The whole skeleton is built at her size, rather than the canvas being
  // scaled: a seat height is a fact about the chair, not about who is sitting
  // on it, and scaling the canvas would have scaled that too.
  B = metricsFor(BUILDS[spec.build], size.scale);
  const headScale = HEAD_SCALE * size.scale * size.head;
  POSE = motion?.pose === 'sit' ? 'sit' : 'stand';
  HAND_UP = motion?.handUp === true;
  if (POSE === 'sit') B = seated(B, motion.seatY ?? DEFAULT_SEAT);
  const skin = SKIN_TONES[spec.skin];
  const hairColor = HAIR_COLORS[spec.hairColor];

  // Breathing, a slow head tilt and a little arm sway. Small enough that
  // dragging still feels precise, alive enough that a still room isn't dead.
  const walking = motion?.walking ?? false;
  const stride = walking ? Math.sin(time * 9) : 0;

  const breath = Math.sin(time * 1.9);
  // While walking the arms swing properly rather than drifting.
  const sway = walking ? stride * 3.4 : Math.sin(time * 1.3);

  // Characters blink out of step with each other — a room where everyone
  // blinks in unison looks wrong in a way that is hard to place.
  const phase = spec.skin * 1.7 + spec.hair * 2.3 + spec.eyes * 0.9;
  // Asleep is a blink that does not end.
  const blinking = motion?.asleep === true || (time + phase) % 4.2 < 0.13;

  const shape = FACE_SHAPES[spec.face];
  const headY = B.chinY - shape.chin * headScale;

  /** Runs a draw call in head space: anchored at the chin and scaled to fit. */
  const onHead = (draw) => {
    ctx.save();
    ctx.translate(0, headY);
    ctx.rotate(sway * 0.02);
    ctx.scale(headScale, headScale);
    draw();
    ctx.restore();
  };

  ctx.save();
  // A little bob on each step, and she faces the way she is going.
  ctx.translate(0, walking ? -Math.abs(stride) * 3 : breath * 1.5);
  if (motion?.facing === -1) ctx.scale(-1, 1);

  // Each group is its own sheet of paper, so the character reads as a stack of
  // cut shapes rather than as one flat sticker.
  detailLayer(ctx, () => onHead(() => drawBackHair(ctx, spec.hair, hairColor)));
  detailLayer(ctx, () => {
    drawLegs(ctx, skin, stride);
    if (FINE) drawSocks(ctx, spec.socks, CLOTH_COLORS[spec.socksColor], stride);
    drawShoes(ctx, spec.shoes, CLOTH_COLORS[spec.shoesColor], stride);
  });

  // Arms sit behind the body so the wide head and torso stay unbroken.
  detailLayer(ctx, () => drawArms(ctx, skin, sway));
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

  // The layer always goes over the top, whatever either of them is. Fixing
  // the order rather than making it a choice is what keeps an outfit
  // coherent — a cardigan under a dress is never what anyone meant.
  detailLayer(ctx, () => drawLayer(ctx, spec.layer, CLOTH_COLORS[spec.layerColor], sway));

  detailLayer(ctx, () => drawHands(ctx, skin, sway));
  if (FINE) detailLayer(ctx, () => drawHeld(ctx, spec.held, sway));
  onHead(() => drawHead(ctx, skin, spec, shape, hairColor, blinking));

  ctx.restore();
}

// ------------------------------------------------------------------- body

/**
 * Legs, swinging when walking.
 *
 * Each leg pivots at the hip by opposite amounts, which is enough to read as
 * walking at this scale — a full knee joint would be invisible.
 */
function drawLegs(ctx, skin, stride = 0) {
  // Sitting, the thighs point at the viewer and foreshorten to nothing, so
  // without a knee at the front of each one the figure reads as somebody
  // short standing behind the furniture rather than as somebody sitting on it.
  if (POSE === 'sit') {
    for (const side of [-1, 1]) {
      fillRR(ctx, side * B.legX - B.legW * 0.62, B.hipY - 10,
        B.legW * 1.24, 30, B.legW * 0.55, shade(skin, -0.05));
    }
  }

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * B.legX, B.hipY - 6);
    ctx.rotate(stride * 0.34 * side);
    capsule(ctx, 0, 0, Math.abs(B.hipY) - 4, B.legW, skin);
    ctx.restore();
  }
}

/** Where a foot has swung to, so the shoe goes with the leg. */
function footOffset(side, stride) {
  const swing = stride * 0.34 * side;
  const length = Math.abs(B.hipY) - 4;
  return {
    x: side * B.legX + Math.sin(swing) * length,
    lift: length - Math.cos(swing) * length,
  };
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

/**
 * Where an arm hangs.
 *
 * A hand up is one arm swung back over the shoulder rather than a new limb:
 * the arm is drawn downwards from the shoulder, so turning it most of the way
 * round points it at the ceiling and everything hung off it — the sleeve, the
 * hand, anything she is holding — comes with it.
 */
function armAngle(sway, side) {
  if (HAND_UP && side === 1) return Math.PI * 0.93;
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
    fillEllipse(ctx, 0, B.armLen + 2, B.armW * 0.5, B.armW * 0.62, skin);
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

  // Eyes and a mouth are a face at any size. Brows and a nose are a pixel of
  // shading at the size the cutaway draws her.
  if (FINE) drawBrows(ctx, spec.brows, place, shade(hairColor, -0.12));
  drawEyes(ctx, spec.eyes, EYE_COLORS[spec.eyeColor], place, blinking);
  if (FINE) drawNose(ctx, spec.nose, place, skin);
  drawMouth(ctx, spec.mouth, LIP_COLORS[spec.mouthColor], place);

  detailLayer(ctx, () => drawFrontHair(ctx, spec.hair, hairColor, shape));
  if (FINE) {
    detailLayer(ctx, () => drawHairpin(ctx, spec.hairpin, CLOTH_COLORS[spec.hairpinColor], shape));
    detailLayer(ctx, () => drawExtra(ctx, spec.extra, CLOTH_COLORS[spec.extraColor]));
  }
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
//
// Fourteen cuts, each modelled on something instantly recognisable rather than
// on "long" or "short" — a flapper bob, a ballerina bun, a beehive, feathered
// flicks, twin plaits. At thumbnail size the silhouette does all the work, so
// the outlines are pushed as far apart as they will go.
//
// Back hair is drawn before the body so it falls behind the shoulders; the
// crown and fringe go on after the face. Both work in head space.

/** A soft sheen across the crown — the thing that makes hair read as hair. */
function hairSheen(ctx, color, width = 44, y = -34) {
  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.strokeStyle = shade(color, 0.42);
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-width, y + 10);
  ctx.quadraticCurveTo(-width * 0.55, y - 13, width * 0.2, y - 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * A lock of hair with a curled tip, used by most of the long styles.
 *
 * The strand lines matter more than the silhouette does: without them hair is
 * a flat block of colour, which is most of why it read as a shape rather than
 * as hair.
 */
function tress(ctx, x, top, length, width, color, curl = 1) {
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x - width / 2, top);
    ctx.quadraticCurveTo(x - width * 0.75, top + length * 0.6, x - width * 0.2 * curl, top + length);
    ctx.quadraticCurveTo(x + width * 0.5 * curl, top + length * 1.08, x + width * 0.7, top + length * 0.72);
    ctx.quadraticCurveTo(x + width * 0.62, top + length * 0.3, x + width / 2, top);
    ctx.closePath();
  };

  ctx.fillStyle = color;
  path();
  ctx.fill();

  ctx.save();
  path();
  ctx.clip();
  // The underside falls into shadow, and strands follow the fall of the lock.
  ctx.fillStyle = shade(color, -0.18);
  ctx.fillRect(x - width, top + length * 0.55, width * 2, length);
  ctx.strokeStyle = shade(color, -0.24);
  ctx.lineWidth = 2.2;
  for (let i = -1; i <= 1; i += 1) {
    const sx = x + i * width * 0.26;
    ctx.beginPath();
    ctx.moveTo(sx, top + 4);
    ctx.quadraticCurveTo(sx - width * 0.3 * curl, top + length * 0.6, sx + width * 0.12 * curl, top + length);
    ctx.stroke();
  }
  ctx.restore();
}

/** Drawn before the body, so it falls behind the shoulders. */
function drawBackHair(ctx, style, color) {
  const dark = shade(color, -0.15);

  switch (style) {
    case 0: // long layered waves, centre parted
      tress(ctx, -50, -26, 150, 34, dark, 1.2);
      tress(ctx, 50, -26, 150, 34, dark, -1.2);
      fillRR(ctx, -56, -40, 112, 118, 42, color);
      break;
    case 1: // flapper bob, chin length with a scalloped edge
      fillRR(ctx, -60, -36, 120, 84, 36, color);
      for (let i = -2; i <= 2; i += 1) fillCircle(ctx, i * 24, 44, 16, color);
      break;
    case 2: // sleek high ponytail
      fillCircle(ctx, 6, -56, 26, color);
      tress(ctx, 34, -52, 150, 30, color, 1.4);
      break;
    case 3: // twin plaits, braided in segments
      for (const side of [-1, 1]) {
        fillCircle(ctx, side * 56, -14, 21, color);
        for (let i = 0; i < 4; i += 1) {
          fillEllipse(ctx, side * (62 + i * 2), 16 + i * 24, 15 - i, 15, i % 2 ? dark : color);
        }
        fillRR(ctx, side * 66 - 8, 108, 16, 9, 4, shade(color, -0.35));
      }
      break;
    case 4: // ballerina bun
      fillCircle(ctx, 0, -74, 27, color);
      fillCircle(ctx, 0, -74, 17, dark);
      break;
    case 5: // big natural curls
      for (const [x, y, r] of [[-46, -18, 34], [46, -18, 34], [0, -44, 40],
        [-38, 22, 28], [38, 22, 28], [0, 30, 30]]) {
        fillCircle(ctx, x, y, r, color);
      }
      break;
    case 6: // sharp blunt bob
      fillRR(ctx, -62, -38, 124, 96, 12, color);
      break;
    case 7: // space buns
      for (const side of [-1, 1]) {
        fillCircle(ctx, side * 52, -50, 25, color);
        fillCircle(ctx, side * 52, -50, 15, dark);
      }
      break;
    case 8: // pixie crop
      fillRR(ctx, -58, -40, 116, 54, 26, color);
      break;
    case 9: // very long and straight
      fillRR(ctx, -58, -36, 116, 176, 26, color);
      break;
    case 10: // half up, the rest loose
      tress(ctx, -48, -20, 120, 32, dark, 1);
      tress(ctx, 48, -20, 120, 32, dark, -1);
      fillRR(ctx, -54, -38, 108, 96, 38, color);
      break;
    case 11: // side ponytail, high on one side
      fillCircle(ctx, -46, -44, 22, color);
      tress(ctx, -68, -40, 132, 30, color, -1.3);
      break;
    case 12: // beehive
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-56, 4);
      ctx.bezierCurveTo(-78, -60, -46, -118, 0, -118);
      ctx.bezierCurveTo(46, -118, 78, -60, 56, 4);
      ctx.closePath();
      ctx.fill();
      fillRR(ctx, -58, -30, 116, 76, 34, color);
      break;
    case 13: // feathered flicks
      tress(ctx, -56, -22, 104, 32, dark, -1.6);
      tress(ctx, 56, -22, 104, 32, dark, 1.6);
      fillRR(ctx, -56, -38, 112, 96, 38, color);
      break;

    /*
     * Short cuts.
     *
     * Thirteen of the fourteen styles above are long or styled long, and the
     * one short one is a pixie — so a figure could be given trousers and a
     * crop and still read as a girl with short hair, because nothing else
     * about the head said otherwise. These sit tight to the skull and stop at
     * or above the nape, which is the part that actually carries the reading.
     */
    case 14: // short back and sides, tapered at the neck
      fillRR(ctx, -54, -42, 108, 46, 22, color);
      fillRR(ctx, -40, -8, 80, 12, 6, shade(color, -0.16));
      break;
    case 15: // a mop, thick and unbrushed
      fillRR(ctx, -60, -44, 120, 62, 30, color);
      for (let i = -2; i <= 2; i += 1) {
        tress(ctx, i * 24, -34, 30, 20, dark, i * 0.5);
      }
      break;
    case 16: // short curls, close to the head
      fillRR(ctx, -56, -42, 112, 52, 26, color);
      for (let i = -2; i <= 2; i += 1) {
        fillCircle(ctx, i * 23, -40, 15, i % 2 ? color : shade(color, -0.1));
      }
      break;
    case 17: // a crop with a straight fringe
      fillRR(ctx, -56, -44, 112, 54, 20, color);
      break;
    case 18: // buzz, barely there
      fillRR(ctx, -50, -44, 100, 40, 20, shade(color, -0.06));
      break;
    default:
      break;
  }
}

/** The crown and fringe, drawn after the face so it sits over the forehead. */
function drawFrontHair(ctx, style, color, shape) {
  // Cropped styles show more forehead; heavy fringes come further down.
  const heavy = style === 1 || style === 6 || style === 12 || style === 17;
  // Short cuts show more forehead, which is most of what makes them read short.
  const cropped = style === 8 || style === 14 || style === 18;
  const hairline = cropped ? -30 : heavy ? -4 : -16;

  ctx.save();
  facePathScaled(ctx, shape, 1.07);
  ctx.clip();
  // A curved bottom edge, not a level cut — that is what made this read as a
  // helmet rather than as hair.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-95, -HEAD_TOP * 1.4);
  ctx.lineTo(95, -HEAD_TOP * 1.4);
  ctx.lineTo(95, hairline + 4);
  ctx.quadraticCurveTo(0, hairline - 22, -95, hairline + 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  switch (style) {
    case 0: // centre parting, soft curtains
      fillEllipse(ctx, -32, -34, 32, 22, color);
      fillEllipse(ctx, 32, -34, 32, 22, color);
      break;
    case 1: // finger waves across the brow
      fillEllipse(ctx, -14, -32, 46, 20, color);
      ctx.strokeStyle = shade(color, -0.22);
      ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.arc(i * 24, -40, 15, 0.1, Math.PI - 0.1);
        ctx.stroke();
      }
      break;
    case 2: // pulled back tight
      fillEllipse(ctx, 0, -46, 52, 18, color);
      break;
    case 4: // scraped back for the bun
      fillEllipse(ctx, 0, -48, 50, 16, color);
      break;
    case 5: // curls onto the forehead
      fillCircle(ctx, -34, -34, 22, color);
      fillCircle(ctx, 2, -46, 25, color);
      fillCircle(ctx, 36, -30, 21, color);
      break;
    case 6: // heavy blunt fringe
      fillRR(ctx, -60, -HEAD_TOP - 6, 120, 56, 8, color);
      break;
    case 7: // small fringe under the buns
      fillEllipse(ctx, 0, -40, 46, 20, color);
      break;
    case 8: // cropped, a wisp at the temple
      fillEllipse(ctx, -30, -34, 24, 12, color);
      break;
    case 9: // centre parting, long and flat
      fillEllipse(ctx, -30, -38, 30, 20, color);
      fillEllipse(ctx, 30, -38, 30, 20, color);
      break;
    case 10: // half-up, gathered at the crown
      fillEllipse(ctx, -26, -36, 30, 20, color);
      fillEllipse(ctx, 26, -36, 30, 20, color);
      fillCircle(ctx, 0, -HEAD_TOP - 4, 17, color);
      break;
    case 11: // swept hard to one side
      fillEllipse(ctx, -24, -40, 48, 22, color);
      break;
    case 12: // teased up off the forehead
      fillEllipse(ctx, 0, -50, 54, 20, color);
      break;
    case 13: // feathered, parted off centre
      fillEllipse(ctx, -22, -38, 40, 20, color);
      fillEllipse(ctx, 30, -34, 28, 16, color);
      break;
    case 14: // swept to one side, short
      fillEllipse(ctx, -20, -40, 40, 16, color);
      fillEllipse(ctx, 26, -42, 26, 12, color);
      break;
    case 15: // a mop falling over the brow
      for (let i = -2; i <= 2; i += 1) {
        fillEllipse(ctx, i * 20, -32 + Math.abs(i) * 3, 17, 14, color);
      }
      break;
    case 16: // curls over the forehead
      for (let i = -1; i <= 1; i += 1) {
        fillCircle(ctx, i * 26, -36, 15, i === 0 ? color : shade(color, -0.08));
      }
      break;
    case 17: // a blunt fringe, straight across
      fillRR(ctx, -50, -46, 100, 30, 8, color);
      break;
    case 18: // nothing to fall forward
      break;
    default:
      fillEllipse(ctx, -18, -38, 38, 20, color);
      break;
  }

  // A buzz has no strands or shine to speak of; drawing them made it look
  // like a wig sitting on top of the head.
  if (style !== 18) {
    hairStrands(ctx, color);
    hairSheen(ctx, color);
  }
}

/** Fine lines radiating from the parting, so the crown is not a flat cap. */
function hairStrands(ctx, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -6, HEAD_R + 6, Math.PI * 0.96, Math.PI * 2.04);
  ctx.clip();
  ctx.strokeStyle = shade(color, -0.2);
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.7;
  for (let i = -3; i <= 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-14, -HEAD_R - 2);
    ctx.quadraticCurveTo(i * 14, -HEAD_R * 0.5, i * 21, -6);
    ctx.stroke();
  }
  ctx.restore();
}

// --------------------------------------------------------------- clothing
//
// Everything here is measured off the build. The previous version mixed
// derived positions with leftover constants — shoes at a hard-coded x while
// the legs had moved — which is how a character ended up standing beside her
// own boots.
//
// A garment is one shape that includes its own shoulders, rather than a slab
// with sleeve tubes stuck on the sides. That is what stops the sleeves reading
// as separate lumps floating next to the body.

/** A sleeve that follows the arm, tapering from shoulder to wrist. */
function sleeve(ctx, side, length, color, sway, flare = 6) {
  ctx.save();
  ctx.translate(B.armX * side, B.shoulderY);
  ctx.rotate(armAngle(sway, side));

  const top = (B.armW + flare) / 2;
  const cuff = (B.armW + 3) / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-top, -10);
  ctx.quadraticCurveTo(-top - 2, length * 0.5, -cuff, length);
  ctx.quadraticCurveTo(0, length + 5, cuff, length);
  ctx.quadraticCurveTo(top + 2, length * 0.5, top, -10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * The body of a garment: shoulders, waist and hem, following the build.
 *
 * `neck` cuts the collar lower for a vest or a scoop; `shoulder` widens it
 * enough to meet the sleeves so there is no seam between them.
 */
function garment(ctx, color, options = {}) {
  const top = options.top ?? B.torsoTop - 5;
  const bottom = options.bottom ?? B.hipY + 8;
  const neck = options.neck ?? 0.42;
  const sw = B.shoulderW + (options.shoulder ?? 6);
  const ww = B.waistW + 4;
  const hw = B.hipW + 5;
  const waist = Math.max(top + 22, Math.min(B.waistY, bottom - 12));

  ctx.fillStyle = litFill(ctx, top, bottom - top, color, 0.12);
  ctx.beginPath();
  ctx.moveTo(-sw, top + 14);
  ctx.quadraticCurveTo(-sw + 2, top, -sw * neck, top + 4);
  ctx.quadraticCurveTo(0, top + 14, sw * neck, top + 4);
  ctx.quadraticCurveTo(sw - 2, top, sw, top + 14);
  ctx.quadraticCurveTo(ww, waist - 12, ww, waist);
  ctx.quadraticCurveTo(hw, bottom - 14, hw, bottom + 2);
  // The hem dips in the middle and lifts at the sides, the way cloth hangs.
  ctx.quadraticCurveTo(hw * 0.45, bottom + 12, 0, bottom + 9);
  ctx.quadraticCurveTo(-hw * 0.45, bottom + 12, -hw, bottom + 2);
  ctx.quadraticCurveTo(-hw, bottom - 14, -ww, waist);
  ctx.quadraticCurveTo(-ww, waist - 12, -sw, top + 14);
  ctx.closePath();
  ctx.fill();
}

/** Keeps a pattern inside the garment it belongs to. */
function withinGarment(ctx, draw, top = B.torsoTop - 5, bottom = B.hipY + 10) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(-B.hipW - 6, top, (B.hipW + 6) * 2, bottom - top);
  ctx.clip();
  draw();
  ctx.restore();
}

/** A turned collar, the detail that makes a shirt read as a shirt. */
function collar(ctx, color) {
  const top = B.torsoTop - 5;
  const w = B.shoulderW * 0.6;
  fillPoly(ctx, [-w, top + 2, 0, top + 26, -6, top + 2], shade(color, 0.34));
  fillPoly(ctx, [w, top + 2, 0, top + 26, 6, top + 2], shade(color, 0.34));
}

function drawTop(ctx, style, color, sway) {
  const top = B.torsoTop - 5;

  switch (style) {
    case 1: // long sleeves
      sleeve(ctx, -1, 62, color, sway);
      sleeve(ctx, 1, 62, color, sway);
      garment(ctx, color);
      break;
    case 2: // vest, cut away at the shoulder
      garment(ctx, color, { shoulder: -6, neck: 0.3 });
      break;
    case 3: // hoodie
      sleeve(ctx, -1, 62, color, sway, 8);
      sleeve(ctx, 1, 62, color, sway, 8);
      garment(ctx, color, { top: top - 4, bottom: B.hipY + 14 });
      fillEllipse(ctx, 0, top + 2, B.shoulderW * 0.9, 15, shade(color, -0.2));
      strokeLine(ctx, -8, top + 22, -8, top + 44, shade(color, 0.45), 3);
      strokeLine(ctx, 8, top + 22, 8, top + 44, shade(color, 0.45), 3);
      break;
    case 4: // stripes
      sleeve(ctx, -1, 34, color, sway);
      sleeve(ctx, 1, 34, color, sway);
      garment(ctx, color);
      withinGarment(ctx, () => {
        for (let i = 0; i < 6; i += 1) {
          fillRR(ctx, -60, top + 12 + i * 15, 120, 6, 3, shade(color, 0.42));
        }
      });
      break;
    case 5: // chunky knit
      sleeve(ctx, -1, 64, color, sway, 9);
      sleeve(ctx, 1, 64, color, sway, 9);
      garment(ctx, color, { top: top - 3, bottom: B.hipY + 14 });
      withinGarment(ctx, () => {
        for (let i = -1; i <= 1; i += 1) {
          strokeLine(ctx, i * 15, top + 12, i * 15, B.hipY, shade(color, -0.16), 3);
        }
      });
      break;
    case 6: // dungarees, straps over a bare shoulder
      garment(ctx, color, { top: top + 34, shoulder: -8 });
      fillRR(ctx, -B.shoulderW * 0.55, top, 12, 46, 4, color);
      fillRR(ctx, B.shoulderW * 0.55 - 12, top, 12, 46, 4, color);
      fillRR(ctx, -18, top + 38, 36, 22, 5, shade(color, 0.16));
      break;
    case 7: // blouse with a collar and buttons
      sleeve(ctx, -1, 38, color, sway);
      sleeve(ctx, 1, 38, color, sway);
      garment(ctx, color);
      collar(ctx, color);
      for (let i = 0; i < 3; i += 1) fillCircle(ctx, 0, top + 34 + i * 15, 3, shade(color, -0.3));
      break;
    case 8: // cardigan open over a shirt
      sleeve(ctx, -1, 62, color, sway);
      sleeve(ctx, 1, 62, color, sway);
      garment(ctx, color);
      withinGarment(ctx, () => fillRR(ctx, -11, top, 22, 110, 4, shade(color, 0.4)));
      break;
    case 9: // crop top
      sleeve(ctx, -1, 26, color, sway);
      sleeve(ctx, 1, 26, color, sway);
      garment(ctx, color, { bottom: B.hipY - 26, neck: 0.32 });
      break;
    case 10: {
      // A field jacket: heavy, with lapels, chest pockets and a zip.
      sleeve(ctx, -1, 68, shade(color, -0.1), sway, 9);
      sleeve(ctx, 1, 68, shade(color, -0.1), sway, 9);
      garment(ctx, color, { top: top - 4, bottom: B.hipY + 16, shoulder: 8 });
      const jw = B.shoulderW;
      fillPoly(ctx, [-jw * 0.62, top - 2, 0, top + 34, -8, top - 2], shade(color, -0.22));
      fillPoly(ctx, [jw * 0.62, top - 2, 0, top + 34, 8, top - 2], shade(color, -0.22));
      strokeLine(ctx, 0, top + 32, 0, B.hipY + 10, shade(color, -0.3), 3);
      for (const side of [-1, 1]) {
        fillRR(ctx, side * 24 - 14, top + 44, 28, 20, 3, shade(color, -0.14));
        fillRR(ctx, side * 24 - 14, top + 44, 28, 5, 2, shade(color, 0.18));
      }
      break;
    }
    case 11: {
      // A school jumper over a collared shirt, with a striped tie.
      sleeve(ctx, -1, 62, color, sway, 8);
      sleeve(ctx, 1, 62, color, sway, 8);
      garment(ctx, color, { top: top - 2, bottom: B.hipY + 12 });
      // The shirt showing at the neck, then the tie over it.
      fillPoly(ctx, [-20, top, 0, top + 30, 20, top], '#f6f1e8');
      collar(ctx, '#f6f1e8');
      fillPoly(ctx, [-7, top + 12, 7, top + 12, 5, top + 26, -5, top + 26], '#8a3f4a');
      fillPoly(ctx, [-6, top + 26, 6, top + 26, 3, top + 62, -3, top + 62], '#8a3f4a');
      for (let i = 0; i < 3; i += 1) {
        strokeLine(ctx, -6, top + 32 + i * 10, 6, top + 28 + i * 10, '#dcb85c', 2.5);
      }
      // A ribbed hem, the giveaway detail on a school jumper.
      fillRR(ctx, -B.hipW - 5, B.hipY + 4, (B.hipW + 5) * 2, 9, 4, shade(color, -0.16));
      break;
    }
    default: // short sleeves
      sleeve(ctx, -1, 32, color, sway);
      sleeve(ctx, 1, 32, color, sway);
      garment(ctx, color);
  }
}

function skirt(ctx, color, hem, flare) {
  const w = B.hipW + 5;
  ctx.fillStyle = litFill(ctx, B.hipY - 14, hem - B.hipY + 14, color, 0.12);
  ctx.beginPath();
  ctx.moveTo(-w, B.hipY - 14);
  ctx.lineTo(w, B.hipY - 14);
  ctx.quadraticCurveTo(flare, hem - 16, flare, hem);
  // A scalloped hem: three shallow dips, so a skirt hangs instead of ending.
  ctx.quadraticCurveTo(flare * 0.62, hem + 15, flare * 0.34, hem + 5);
  ctx.quadraticCurveTo(0, hem + 18, -flare * 0.34, hem + 5);
  ctx.quadraticCurveTo(-flare * 0.62, hem + 15, -flare, hem);
  ctx.quadraticCurveTo(-flare, hem - 16, -w, B.hipY - 14);
  ctx.closePath();
  ctx.fill();
}

/** Trousers as one seat with two legs, so they join at the hip. */
function trousers(ctx, color, hem, width) {
  ctx.fillStyle = litFill(ctx, B.hipY - 20, hem - B.hipY + 20, color, 0.1);
  fillRR(ctx, -B.hipW - 4, B.hipY - 20, (B.hipW + 4) * 2, 30, 10, ctx.fillStyle);
  capsule(ctx, -B.legX, B.hipY - 12, hem, width, ctx.fillStyle);
  capsule(ctx, B.legX, B.hipY - 12, hem, width, ctx.fillStyle);
  // The inside seam, which is what stops it reading as one slab.
  strokeLine(ctx, 0, B.hipY + 4, 0, hem - 6, shade(color, -0.2), 2.5);
}

function drawBottom(ctx, style, color) {
  // Sitting, every hem is measured from a hip that has dropped to seat height,
  // so a long skirt that hung to mid-calf standing up reaches past the floor
  // and hides the legs completely — which makes a seated figure read as
  // somebody standing behind the furniture. Clamped, it drapes over the lap.
  const hemFor = (hem) => (POSE === 'sit' ? Math.min(hem, B.hipY * 0.45) : hem);

  // The knees, in whatever she is wearing. Drawn bare on the leg they were
  // covered by the trousers that go on afterwards, which left a seated figure
  // with nothing to say her thighs come toward the viewer — so on a sofa she
  // read as somebody short standing in front of it.
  const knees = () => {
    if (POSE !== 'sit') return;
    for (const side of [-1, 1]) {
      fillRR(ctx, side * B.legX - B.legW * 0.66, B.hipY - 4,
        B.legW * 1.32, 34, B.legW * 0.6, shade(color, -0.1));
    }
  };

  switch (style) {
    case 1: // shorts
      trousers(ctx, color, hemFor(B.hipY + 34), B.legW + 8);
      break;
    case 2: // short skirt
      skirt(ctx, color, hemFor(B.hipY + 40), B.hipW + 26);
      break;
    case 3: // long skirt
      skirt(ctx, color, hemFor(B.hipY + 74), B.hipW + 34);
      break;
    case 5: // leggings
      trousers(ctx, color, hemFor(-12), B.legW + 2);
      break;
    case 6: // pleated skirt
      skirt(ctx, color, hemFor(B.hipY + 52), B.hipW + 30);
      for (let i = -2; i <= 2; i += 1) {
        strokeLine(ctx, i * 12, B.hipY - 8, i * 20, B.hipY + 46, shade(color, -0.18), 3);
      }
      break;
    case 7: // dungaree trousers
      trousers(ctx, color, hemFor(-14), B.legW + 9);
      break;
    case 8: // wide legged
      trousers(ctx, color, hemFor(-12), B.legW + 16);
      break;
    case 9: // tutu, in three layers
      skirt(ctx, shade(color, -0.12), hemFor(B.hipY + 46), B.hipW + 42);
      skirt(ctx, color, hemFor(B.hipY + 34), B.hipW + 32);
      skirt(ctx, shade(color, 0.22), hemFor(B.hipY + 22), B.hipW + 20);
      break;
    default: // trousers
      trousers(ctx, color, hemFor(-14), B.legW + 6);
  }
  knees();
}

function drawDress(ctx, color) {
  garment(ctx, color, { bottom: B.hipY - 8 });
  skirt(ctx, color, B.hipY + 54, B.hipW + 36);
  fillRR(ctx, -B.hipW - 6, B.hipY - 24, (B.hipW + 6) * 2, 10, 4, shade(color, -0.3));
}

/**
 * Shoes, drawn on the feet.
 *
 * The x came from a constant while the legs came from the build, so on most
 * builds the shoes stood beside the character rather than under her. Both now
 * read B.legX.
 */
function drawShoes(ctx, style, color, stride = 0) {
  const shoe = (x) => {
    const toe = x + B.legW * 0.28; // shoes point slightly outward
    switch (style) {
      case 1: // ankle boots
        fillRR(ctx, x - B.legW / 2 - 2, -40, B.legW + 4, 34, 6, litFill(ctx, -40, 34, color, 0.14));
        fillEllipse(ctx, toe, -6, B.legW * 0.72, 8, shade(color, -0.22));
        fillRR(ctx, x - B.legW / 2 - 2, -40, B.legW + 4, 5, 2, shade(color, 0.28));
        break;
      case 2: // sandals
        fillEllipse(ctx, toe, -6, B.legW * 0.66, 7, color);
        strokeLine(ctx, x - 4, -8, x + 6, -20, color, 4.5);
        break;
      case 3: // trainers
        fillRR(ctx, x - B.legW / 2 - 3, -24, B.legW + 8, 20, 8, litFill(ctx, -24, 20, color, 0.14));
        fillEllipse(ctx, toe, -5, B.legW * 0.78, 8, PAPER);
        break;
      case 4: // mary janes with a strap
        fillEllipse(ctx, toe, -8, B.legW * 0.72, 10, litFill(ctx, -18, 20, color, 0.14));
        strokeLine(ctx, x - B.legW * 0.5, -15, x + B.legW * 0.6, -15, shade(color, -0.25), 4);
        fillCircle(ctx, toe, -15, 3.2, shade(color, 0.4));
        break;
      case 5: // wellies
        fillRR(ctx, x - B.legW / 2 - 3, -62, B.legW + 6, 56, 8, litFill(ctx, -62, 56, color, 0.14));
        fillEllipse(ctx, toe, -6, B.legW * 0.8, 9, shade(color, -0.25));
        fillRR(ctx, x - B.legW / 2 - 3, -56, B.legW + 6, 7, 3, shade(color, 0.3));
        break;
      case 6: // fluffy slippers
        fillEllipse(ctx, toe, -9, B.legW * 0.8, 11, color);
        fillCircle(ctx, toe, -18, B.legW * 0.42, shade(color, 0.32));
        break;
      case 7: // high tops with laces
        fillRR(ctx, x - B.legW / 2 - 3, -38, B.legW + 8, 34, 9, litFill(ctx, -38, 34, color, 0.14));
        fillEllipse(ctx, toe, -5, B.legW * 0.8, 8, PAPER);
        for (let i = 0; i < 3; i += 1) {
          strokeLine(ctx, x - 6, -32 + i * 8, x + 7, -32 + i * 8, PAPER, 2.2);
        }
        break;
      default: // flats
        fillEllipse(ctx, toe, -7, B.legW * 0.68, 9, litFill(ctx, -16, 18, color, 0.14));
    }
  };
  for (const side of [-1, 1]) {
    const foot = footOffset(side, stride);
    ctx.save();
    ctx.translate(foot.x - side * B.legX, -foot.lift);
    shoe(side * B.legX);
    ctx.restore();
  }
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

// ---------------------------------------------------------- socks & legs

/** Runs a draw call in one leg's space, swung by the walk. */
function onLeg(ctx, side, stride, draw) {
  ctx.save();
  ctx.translate(side * B.legX, B.hipY - 6);
  ctx.rotate(stride * 0.34 * side);
  draw(Math.abs(B.hipY) - 4);
  ctx.restore();
}

/**
 * Socks and tights, between the leg and the shoe.
 *
 * Their own part rather than a variant of shoes, because knee socks under a
 * pleated skirt are half a school uniform and bare legs in sandals are the
 * other half of a summer one.
 */
function drawSocks(ctx, style, color, stride = 0) {
  if (style === 0) return;

  for (const side of [-1, 1]) {
    onLeg(ctx, side, stride, (length) => {
      const w = B.legW + 2;
      const top = {
        1: length - 34, // ankle
        2: length * 0.42, // knee
        3: 0, // tights
        4: length * 0.42, // striped knee
        5: length * 0.5, // slouch
      }[style] ?? length - 34;

      ctx.fillStyle = litFill(ctx, top, length - top, color, 0.12);
      fillRR(ctx, -w / 2, top, w, length - top, w * 0.3, ctx.fillStyle);

      if (style === 4) {
        for (let y = top + 8; y < length - 12; y += 16) {
          fillRR(ctx, -w / 2, y, w, 6, 2, shade(color, 0.4));
        }
      }
      if (style === 5) {
        // Bunched at the ankle: a couple of folds where it slouches.
        for (const y of [length - 26, length - 14]) {
          fillRR(ctx, -w / 2 - 2, y, w + 4, 9, 4, shade(color, -0.14));
        }
      }
      // A turned cuff, which is what tells a sock from a painted leg.
      if (style !== 3) fillRR(ctx, -w / 2 - 1, top, w + 2, 8, 4, shade(color, 0.28));
    });
  }
}

// --------------------------------------------------------------- layering

/**
 * A garment worn over the top: cardigan, coat, cloak, apron, pinafore, gilet.
 *
 * This exists because a jumper and the cardigan over it were competing for one
 * slot, so nothing could be layered and nothing looked put together. Index 0
 * is nothing at all.
 */
function drawLayer(ctx, style, color, sway) {
  if (style === 0) return;
  const top = B.torsoTop - 7;

  switch (style) {
    case 1: { // cardigan, open down the front
      sleeve(ctx, -1, 66, color, sway, 9);
      sleeve(ctx, 1, 66, color, sway, 9);
      openFront(ctx, color, top, B.hipY + 16);
      break;
    }
    case 2: { // coat, longer with a collar and buttons
      sleeve(ctx, -1, 72, color, sway, 11);
      sleeve(ctx, 1, 72, color, sway, 11);
      openFront(ctx, color, top, B.hipY + 44, 0.5);
      collar(ctx, color);
      for (let i = 0; i < 3; i += 1) {
        fillCircle(ctx, -7, top + 40 + i * 22, 3.4, shade(color, -0.34));
      }
      break;
    }
    case 3: { // cloak, hanging open so the outfit underneath still shows
      const hem = B.hipY + 62;
      const spread = B.hipW + 42;

      for (const side of [-1, 1]) {
        ctx.fillStyle = litFill(ctx, top, hem - top, color, 0.14);
        ctx.beginPath();
        ctx.moveTo(side * (B.shoulderW + 8), top + 12);
        ctx.quadraticCurveTo(side * spread, B.waistY, side * spread, hem);
        ctx.quadraticCurveTo(side * spread * 0.6, hem + 14, side * 14, hem + 4);
        ctx.lineTo(side * 12, top + 22);
        ctx.quadraticCurveTo(side * 30, top + 4, side * (B.shoulderW + 8), top + 12);
        ctx.closePath();
        ctx.fill();
        strokeLine(ctx, side * 26, top + 30, side * spread * 0.72, hem - 12,
          shade(color, -0.16), 3);
      }

      // A collar across the shoulders and the clasp that holds it.
      fillRR(ctx, -B.shoulderW - 6, top + 2, (B.shoulderW + 6) * 2, 18, 8,
        shade(color, -0.12));
      fillCircle(ctx, 0, top + 11, 7, shade(color, 0.42));
      break;
    }
    case 4: { // apron, tied over whatever is underneath
      const hem = B.hipY + 30;
      ctx.fillStyle = shade(color, 0.05);
      fillRR(ctx, -B.waistW - 2, top + 30, (B.waistW + 2) * 2, 46, 5, ctx.fillStyle);
      ctx.beginPath();
      ctx.moveTo(-B.waistW - 6, B.waistY - 6);
      ctx.lineTo(B.waistW + 6, B.waistY - 6);
      ctx.quadraticCurveTo(B.hipW + 12, hem - 14, B.hipW + 10, hem);
      ctx.quadraticCurveTo(0, hem + 12, -B.hipW - 10, hem);
      ctx.quadraticCurveTo(-B.hipW - 12, hem - 14, -B.waistW - 6, B.waistY - 6);
      ctx.closePath();
      ctx.fill();
      // Straps up over the shoulders and a tie at the waist.
      fillRR(ctx, -20, top + 12, 8, 24, 3, color);
      fillRR(ctx, 12, top + 12, 8, 24, 3, color);
      fillRR(ctx, -B.waistW - 8, B.waistY - 10, (B.waistW + 8) * 2, 9, 4,
        shade(color, -0.18));
      break;
    }
    case 5: { // pinafore: a dress worn over a blouse
      const hem = B.hipY + 48;
      ctx.fillStyle = litFill(ctx, top, hem - top, color, 0.12);
      fillRR(ctx, -B.waistW - 4, top + 26, (B.waistW + 4) * 2, 52, 6, ctx.fillStyle);
      skirt(ctx, color, hem, B.hipW + 30);
      fillRR(ctx, -22, top + 6, 11, 32, 4, color);
      fillRR(ctx, 11, top + 6, 11, 32, 4, color);
      fillCircle(ctx, -16, top + 12, 3, shade(color, -0.3));
      fillCircle(ctx, 16, top + 12, 3, shade(color, -0.3));
      break;
    }
    default: { // gilet: padded, no sleeves
      openFront(ctx, color, top + 6, B.hipY + 12);
      for (let i = 0; i < 3; i += 1) {
        const y = top + 26 + i * 22;
        strokeLine(ctx, -B.shoulderW - 4, y, -10, y, shade(color, -0.18), 3);
        strokeLine(ctx, 10, y, B.shoulderW + 4, y, shade(color, -0.18), 3);
      }
    }
  }
}

/** Two front panels with a gap between them, for anything worn open. */
function openFront(ctx, color, top, bottom, lapel = 0) {
  const sw = B.shoulderW + 7;
  const hw = B.hipW + 7;

  for (const side of [-1, 1]) {
    ctx.fillStyle = litFill(ctx, top, bottom - top, color, 0.12);
    ctx.beginPath();
    ctx.moveTo(side * sw, top + 14);
    ctx.quadraticCurveTo(side * sw, top, side * sw * 0.5, top + 2);
    ctx.lineTo(side * 9, top + 30);
    ctx.lineTo(side * 9, bottom);
    ctx.quadraticCurveTo(side * hw * 0.6, bottom + 8, side * hw, bottom - 4);
    ctx.quadraticCurveTo(side * hw, B.waistY, side * sw, top + 14);
    ctx.closePath();
    ctx.fill();

    if (lapel > 0) {
      fillPoly(ctx, [
        side * sw * 0.55, top + 2, side * 9, top + 30 + lapel * 24, side * 9, top + 26,
      ], shade(color, 0.2));
    }
  }
}

// ----------------------------------------------------------- held  items

/**
 * Something in her hand.
 *
 * Attached to the arm transform rather than to the body, so it swings with her
 * as she walks. A character holding something reads as a character doing
 * something, which no amount of clothing achieves.
 */
function drawHeld(ctx, style, sway) {
  if (style === 0) return;

  ctx.save();
  ctx.translate(B.armX, B.shoulderY);
  ctx.rotate(armAngle(sway, 1));
  ctx.translate(0, B.armLen + 2);

  switch (style) {
    case 1: // a book, held against the hip
      ctx.rotate(-0.2);
      fillRR(ctx, -8, -6, 30, 40, 3, litFill(ctx, -6, 40, '#8a4a52', 0.16));
      fillRR(ctx, -8, -6, 8, 40, 3, shade('#8a4a52', -0.3));
      fillRR(ctx, 0, -3, 20, 34, 2, PAPER);
      break;
    case 2: // a wand
      ctx.rotate(0.42);
      capsule(ctx, 0, -34, 24, 6, litFill(ctx, -34, 58, '#7d5236', 0.2));
      fillCircle(ctx, 0, -34, 4.5, shade('#7d5236', 0.4));
      break;
    case 3: // a basket
      fillPoly(ctx, [-20, 4, 20, 4, 15, 30, -15, 30], '#c2996b');
      for (let i = -2; i <= 2; i += 1) strokeLine(ctx, i * 8, 6, i * 6, 28, shade('#c2996b', -0.25), 2);
      ctx.strokeStyle = '#c2996b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 4, 16, Math.PI, 0);
      ctx.stroke();
      break;
    case 4: // a posy of flowers
      for (const [dx, col] of [[-8, '#e0708a'], [0, '#f0c86a'], [8, '#c98ad0']]) {
        strokeLine(ctx, dx * 0.4, 8, dx, -22, '#6f9463', 3);
        for (let i = 0; i < 5; i += 1) {
          const a = (i / 5) * Math.PI * 2;
          fillCircle(ctx, dx + Math.cos(a) * 5, -22 + Math.sin(a) * 5, 4, col);
        }
        fillCircle(ctx, dx, -22, 3, '#f6f1e8');
      }
      break;
    default: { // a small teddy, carried by one arm
      const fur = '#c2996b';
      fillCircle(ctx, -6, 22, 7, fur);
      fillCircle(ctx, 10, 22, 7, fur);
      fillEllipse(ctx, 2, 16, 12, 13, fur);
      fillCircle(ctx, 2, 0, 11, fur);
      fillCircle(ctx, -6, -8, 5, fur);
      fillCircle(ctx, 10, -8, 5, fur);
      fillEllipse(ctx, 2, 3, 5, 4, shade(fur, 0.35));
      fillCircle(ctx, -2, -2, 2, DARK);
      fillCircle(ctx, 6, -2, 2, DARK);
    }
  }
  ctx.restore();
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
