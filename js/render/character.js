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
  fillRR, fillCircle, fillEllipse, fillPoly, strokeLine, shade, relief,
  paperLayer, detailLayer, worthDrawing,
} from './shapes.js';
import { litFill } from './materials.js';
import {
  SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, LIP_COLORS, EYE_COLORS, FACE_SHAPES,
  BUILDS, SIZES, NAIL_STYLES, clampSpec,
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
 * Where a hand is, for anything that needs to frame one.
 *
 * The creator's nail cells use it the way the hairstyle cells use headBounds:
 * a hand is ten pixels across at body size, so a cell showing a whole figure
 * would be a grid of identical people.
 */
export function handBounds(rawSpec) {
  const spec = clampSpec(rawSpec);
  const size = sizeOf(spec);
  const metrics = metricsFor(BUILDS[spec.build], size.scale);
  return {
    x: metrics.armX,
    y: metrics.shoulderY + metrics.armLen + 2,
    // A little more than the hand itself, so a long nail is inside the frame.
    size: metrics.armW * 2.6,
  };
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
  /*
   * A floor-length gown shortens her step.
   *
   * Not a flourish. The legs pivot up to a third of a radian at the hip, which
   * throws a foot forty out from where it stands, and a gown cut close to the
   * knee cannot follow that — the legs came out through the sides of the
   * skirt. Somebody in a long dress takes small steps for exactly this reason,
   * so the fix and the truth are the same thing.
   */
  const stride = walking
    ? Math.sin(time * 9) * (FLOOR_LENGTH.has(spec.bottom) ? 0.42 : 1)
    : 0;

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
    if (spec.bottom === GALA_GOWN) {
      drawGalaGown(ctx, CLOTH_COLORS[spec.bottomColor]);
    } else if (spec.bottom === GLITTER_GOWN) {
      drawGlitterGown(ctx, CLOTH_COLORS[spec.bottomColor]);
    } else if (spec.bottom === 4) {
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

  detailLayer(ctx, () => drawHands(ctx, skin, sway, spec));
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

/**
 * Where the forearm starts, as a fraction of the arm.
 *
 * Below every sleeve in the game: the longest of them runs 68 from the shoulder
 * and the arm is 100, so nothing drawn past this point can cover a cuff.
 */
const FOREARM_FROM = 0.72;

/**
 * Hands, drawn after the sleeves so a long sleeve stops at the wrist.
 *
 * The forearm comes with them, and that is the point. Arms are drawn behind the
 * clothes so a sleeve can cover the shoulder, but a skirt is wider than the arm
 * that hangs beside it — so the skirt painted over the middle of the arm and
 * the hand reappeared on top of it as a bare circle with nothing joining it to
 * her. Bringing the forearm forward with the hand puts the whole limb in front
 * of the skirt, which is where an arm actually is.
 */
function drawHands(ctx, skin, sway, spec) {
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(B.armX * side, B.shoulderY);
    ctx.rotate(armAngle(sway, side));
    capsule(ctx, 0, B.armLen * FOREARM_FROM, B.armLen, B.armW, skin);
    fillEllipse(ctx, 0, B.armLen + 2, B.armW * 0.5, B.armW * 0.62, skin);
    drawNails(ctx, spec);
    ctx.restore();
  }
}

/**
 * Nails, across the end of a hand.
 *
 * Three of them, not one and not five. One nail the width of the whole hand
 * reads as a mitten with the end painted; five at the size a hand is drawn are
 * sub-pixel slivers. Three across the fingertips suggest the fingers that are
 * not drawn — the hand itself is a single shape — and stay legible down to the
 * size where the size rule takes them away altogether.
 */
function drawNails(ctx, spec) {
  const shape = NAIL_STYLES[spec.nails ?? 0];
  if (!shape?.wide) return;

  const rx = B.armW * 0.5;
  const ry = B.armW * 0.62;
  const hy = B.armLen + 2;
  // One nail of three, inset so the outer two sit inside the hand's curve.
  const half = rx * shape.wide * 0.3;
  const color = CLOTH_COLORS[spec.nailColor ?? 0];

  // A nail is a flat oval with nothing inside it, so it survives smaller than
  // a thing with detail in it does: three and a half real pixels across still
  // reads as a painted nail, and that is what a room draws them at.
  if (!worthDrawing(ctx, half * 2, 3.5)) {
    // Too small for three nails — but not too small to see that they are
    // painted. Fewer and fatter, the way a bookshelf loses half its books
    // rather than all of them: one tinted fingertip, so a red manicure is
    // still a red manicure across a room.
    drawTintedTip(ctx, shape, color, rx, ry, hy);
    return;
  }
  for (const [i, at] of [-0.5, 0, 0.5].entries()) {
    /*
     * How far down the hand this nail sits.
     *
     * Set into the fingertip rather than stuck on the end of it: measured from
     * the hand's lowest point, the first attempt put every nail past the
     * silhouette, which reads as claws rather than as a manicure. The middle
     * finger reaches furthest, so the outer two sit higher, which is also what
     * stops three identical ovals reading as a row of tiles.
     */
    const drop = ry * (0.82 - Math.abs(at) * 0.26);
    const bed = hy + drop - ry * 1.5 * shape.deep;
    const tip = hy + drop + B.armW * shape.over;
    ctx.save();
    ctx.translate(rx * at, 0);
    nailPath(ctx, shape, half, bed, tip);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.clip();
    if (shape.gel === 'french') drawFrenchTip(ctx, half, bed, tip);
    else if (shape.gel === 'ombre') drawGlitterOmbre(ctx, half, bed, tip, i);
    // A single gloss highlight, up near the bed where the light catches.
    ctx.globalAlpha = 0.28;
    fillEllipse(ctx, -half * 0.22, bed + (tip - bed) * 0.32, half * 0.26,
      (tip - bed) * 0.13, '#ffffff');
    ctx.restore();
  }
}

/**
 * The whole set of nails as one shape, for when three of them will not fit.
 *
 * Clipped to the hand so it is the fingertip that is coloured rather than a
 * blob stuck on the end of it, and a gel design keeps its pale tip, because
 * that is the half of it that survives at this size.
 */
function drawTintedTip(ctx, shape, color, rx, ry, hy) {
  if (!worthDrawing(ctx, rx)) return;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, hy, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  /*
   * A band along the very end of the hand, and nothing else.
   *
   * The first version covered most of the lower half and put a near-white
   * ellipse on top of it for the gel designs, which at the size this is used
   * read as hands dipped in paint. What is wanted here is only the colour of
   * her nails, at the end of her fingers, and a gel one lightened rather than
   * given a white tip it has no room for.
   */
  const paint = shape.gel ? shade(color, 0.3) : color;
  fillEllipse(ctx, 0, hy + ry * 1.2, rx * 0.95, ry * 0.52, paint);
  ctx.restore();
}

/** The outline of one nail: a bed, two sides, and an end of the given shape. */
function nailPath(ctx, shape, half, bed, tip) {
  ctx.beginPath();
  ctx.moveTo(-half, bed);
  ctx.lineTo(half, bed);
  if (shape.tip === 'point') {
    ctx.quadraticCurveTo(half * 0.9, tip - (tip - bed) * 0.34, 0, tip);
    ctx.quadraticCurveTo(-half * 0.9, tip - (tip - bed) * 0.34, -half, bed);
  } else if (shape.tip === 'square') {
    const r = half * 0.34;
    ctx.lineTo(half, tip - r);
    ctx.quadraticCurveTo(half, tip, half - r, tip);
    ctx.lineTo(-half + r, tip);
    ctx.quadraticCurveTo(-half, tip, -half, tip - r);
  } else {
    ctx.quadraticCurveTo(half, tip, 0, tip);
    ctx.quadraticCurveTo(-half, tip, -half, bed);
  }
  ctx.closePath();
}

/**
 * A French tip: a pale crescent across the very end of the nail.
 *
 * Shallow on purpose. Half the nail in white is a sock; the thing that reads
 * as a French manicure is a thin band with a curve on it, so the ellipse is
 * wider than the nail and mostly below it, and the clip does the rest.
 */
function drawFrenchTip(ctx, half, bed, tip) {
  const depth = (tip - bed) * 0.46;
  fillEllipse(ctx, 0, tip - depth * 0.18, half * 1.6, depth, '#fdf8f4');
}

/**
 * A glitter ombré: her colour fading into sparkle towards the tip.
 *
 * The fade stays in the last third — a gradient over the whole nail turns her
 * colour into a pale smudge — and the sparkle is one dot per nail, placed
 * differently on each so the three of them read as scattered glitter rather
 * than as three identical spots.
 */
function drawGlitterOmbre(ctx, half, bed, tip, index) {
  const span = tip - bed;
  const wash = ctx.createLinearGradient(0, bed + span * 0.45, 0, tip);
  wash.addColorStop(0, 'rgba(255,250,246,0)');
  wash.addColorStop(1, 'rgba(255,251,246,0.85)');
  ctx.fillStyle = wash;
  ctx.fillRect(-half, bed + span * 0.45, half * 2, span * 0.55);

  const spark = [[-0.3, 0.58], [0.26, 0.5], [0.04, 0.66]][index % 3];
  fillCircle(ctx, half * spark[0], bed + span * spark[1], half * 0.2,
    'rgba(255,255,255,0.95)');
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
  ctx.strokeStyle = relief(color, 0.42);
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
    case 6: { // sharp blunt bob
      /*
       * A dome over the crown, then straight down to a blunt hem.
       *
       * It was a 124x96 rectangle with a 12 radius, which is a box: the top
       * corners squared off well above the widest part of the skull, so the
       * bob sat on her head like a shoebox rather than growing out of it. The
       * blunt cut belongs at the bottom, which is the only place hair is ever
       * actually blunt.
       */
      const hem = 58;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-62, hem);
      ctx.lineTo(-62, -16);
      ctx.quadraticCurveTo(-62, -54, 0, -54);
      ctx.quadraticCurveTo(62, -54, 62, -16);
      ctx.lineTo(62, hem);
      ctx.quadraticCurveTo(0, hem + 7, -62, hem);
      ctx.closePath();
      ctx.fill();
      break;
    }
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
      /*
       * Tall, but not twice her head.
       *
       * It rose to 118 above the head's centre against a skull radius of 58 —
       * so the hair was as tall again as the person, and read as a helmet
       * rather than as a hairdo. It reaches 38 above the crown now and gathers
       * inward on the way, which is the shape a beehive actually is.
       */
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-56, 4);
      ctx.bezierCurveTo(-70, -46, -52, -96, 0, -96);
      ctx.bezierCurveTo(52, -96, 70, -46, 56, 4);
      ctx.closePath();
      ctx.fill();
      fillRR(ctx, -58, -30, 116, 76, 34, color);
      // The sweep round the mound, which is what tells a beehive from a bun.
      if (FINE) {
        ctx.strokeStyle = shade(color, -0.17);
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(-45, -28);
        ctx.quadraticCurveTo(0, -64, 45, -32);
        ctx.stroke();
      }
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
      /*
       * A fringe is blunt along the bottom only.
       *
       * Drawn as a 120x56 rounded rectangle with a radius of 8, and drawn
       * outside the clip that keeps the rest of the front hair on the face, it
       * was a box sitting on her head — wider than the skull and square at the
       * top corners. This is the shoebox that made the blunt bob look boxed,
       * and it was in the fringe rather than in the bob.
       */
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-54, -12);
      ctx.quadraticCurveTo(-58, -HEAD_TOP - 2, 0, -HEAD_TOP - 4);
      ctx.quadraticCurveTo(58, -HEAD_TOP - 2, 54, -12);
      ctx.quadraticCurveTo(0, -5, -54, -12);
      ctx.closePath();
      ctx.fill();
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
  /*
   * A domed head on the sleeve rather than a flat lid.
   *
   * Closing the path straight across the top left a hard horizontal edge over
   * the arm, which met the garment's own flat shoulder and made everybody look
   * like they were wearing a box. A sleeve is gathered over the top of the
   * shoulder, so the seam is a curve.
   */
  ctx.quadraticCurveTo(0, -10 - top * 0.8, -top, -10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * The outline of a garment, as a path on the context.
 *
 * Split out from the fill so that a pattern can be clipped to the same shape
 * the garment was drawn from. Returns the measurements a caller needs to lay
 * something out inside it.
 */
function garmentPath(ctx, options = {}) {
  const top = options.top ?? B.torsoTop - 5;
  const bottom = options.bottom ?? B.hipY + 8;
  const neck = options.neck ?? 0.42;
  const sw = B.shoulderW + (options.shoulder ?? 6);
  const ww = B.waistW + 4;
  const hw = B.hipW + 5;
  const waist = Math.max(top + 22, Math.min(B.waistY, bottom - 12));

  /*
   * The shoulder line slopes, and turns into the armhole without a corner.
   *
   * It used to run flat from the neck to the shoulder tip and then break
   * straight down, which is a coat hanger, not a person — and with the sleeve's
   * flat lid beside it everyone came out looking boxed. A neck sits higher than
   * a shoulder tip, so the line falls `SHOULDER_DROP` on the way out, and the
   * first control point sits directly above the tip so the curve leaves it
   * travelling straight up — which is the tangent the side seam arrives on, and
   * so the join is smooth instead of a notch.
   */
  const tipY = top + SHOULDER_DROP;

  ctx.beginPath();
  ctx.moveTo(-sw, tipY);
  ctx.bezierCurveTo(-sw, top + 4, -sw * 0.78, top - 1, -sw * neck, top + 5);
  ctx.quadraticCurveTo(0, top + 19, sw * neck, top + 5);
  ctx.bezierCurveTo(sw * 0.78, top - 1, sw, top + 4, sw, tipY);
  ctx.quadraticCurveTo(ww, waist - 12, ww, waist);
  ctx.quadraticCurveTo(hw, bottom - 14, hw, bottom + 2);
  // The hem dips in the middle and lifts at the sides, the way cloth hangs.
  ctx.quadraticCurveTo(hw * 0.45, bottom + 12, 0, bottom + 9);
  ctx.quadraticCurveTo(-hw * 0.45, bottom + 12, -hw, bottom + 2);
  ctx.quadraticCurveTo(-hw, bottom - 14, -ww, waist);
  ctx.quadraticCurveTo(-ww, waist - 12, -sw, tipY);
  ctx.closePath();

  return { top, bottom, waist, sw, ww, hw };
}

/**
 * The body of a garment: shoulders, waist and hem, following the build.
 *
 * `neck` cuts the collar lower for a vest or a scoop; `shoulder` widens it
 * enough to meet the sleeves so there is no seam between them.
 */
function garment(ctx, color, options = {}) {
  const { top, bottom } = garmentPath(ctx, options);
  ctx.fillStyle = litFill(ctx, top, bottom - top, color, 0.12);
  ctx.fill();
}

/**
 * Keeps a pattern inside the garment it belongs to.
 *
 * Clipped to the garment's own outline, not to a box around it. A box is the
 * width of the hips at every height, so a stripe drawn across the waist — where
 * the garment is at its narrowest — carried on out past the side of the dress
 * into thin air. Pass the same options the garment was drawn with, or the
 * pattern is clipped to a shape the garment does not have.
 *
 * The callback is handed the measurements, so a pattern can be laid out against
 * the garment it is going into rather than against numbers typed in by hand.
 */
function withinGarment(ctx, draw, options = {}) {
  ctx.save();
  const shape = garmentPath(ctx, options);
  ctx.clip();
  draw(shape);
  ctx.restore();
}

/** How many bands a striped top gets, whatever the build. */
const STRIPE_COUNT = 6;

/** How far a shoulder falls from the neck to the tip. Nobody is a coat hanger. */
const SHOULDER_DROP = 18;

/**
 * One band of a stripe, sagging slightly in the middle.
 *
 * A body has a front and two sides, so a stripe running round it is a shallow
 * curve seen head on, not a straight rule. Drawn dead straight, six of them
 * stacked up read as rungs on a ladder laid over a flat board — which is
 * exactly what they looked like.
 *
 * Drawn wider than the body on purpose: the caller clips to the garment, and
 * letting the clip cut the ends is what makes a stripe follow the silhouette.
 */
function stripeBand(ctx, y, reach, thickness, color) {
  const sag = thickness * 0.7;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-reach, y);
  ctx.quadraticCurveTo(0, y + sag, reach, y);
  ctx.lineTo(reach, y + thickness);
  ctx.quadraticCurveTo(0, y + sag + thickness, -reach, y + thickness);
  ctx.closePath();
  ctx.fill();
}

/** A turned collar, the detail that makes a shirt read as a shirt. */
function collar(ctx, color) {
  const top = B.torsoTop - 5;
  const w = B.shoulderW * 0.6;
  fillPoly(ctx, [-w, top + 2, 0, top + 26, -6, top + 2], relief(color, 0.34));
  fillPoly(ctx, [w, top + 2, 0, top + 26, 6, top + 2], relief(color, 0.34));
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
    case 3: { // hoodie
      sleeve(ctx, -1, 62, color, sway, 8);
      sleeve(ctx, 1, 62, color, sway, 8);
      const hood = { top: top - 4, bottom: B.hipY + 14 };
      const { bottom: hoodHem } = garmentPath(ctx, hood);
      garment(ctx, color, hood);

      /*
       * A hood bunched at the neck, and a pocket across the front.
       *
       * The hood was a flat ellipse as wide as her shoulders sitting at the
       * collar line, which is not a hood — it is a bib. A hood gathers *around*
       * the neck and rises behind it, so this is a narrower shape that comes up
       * past the shoulder line, with the opening cut into it. The pocket is the
       * other half of what makes a hoodie read as a hoodie, and it was missing
       * altogether.
       */
      const cowl = B.shoulderW * 0.56;
      ctx.fillStyle = shade(color, -0.16);
      ctx.beginPath();
      ctx.moveTo(-cowl, top + 20);
      ctx.quadraticCurveTo(-cowl - 2, top - 20, 0, top - 22);
      ctx.quadraticCurveTo(cowl + 2, top - 20, cowl, top + 20);
      ctx.quadraticCurveTo(0, top + 30, -cowl, top + 20);
      ctx.closePath();
      ctx.fill();
      // The opening, so the hood has a hollow rather than being a lump.
      ctx.fillStyle = shade(color, -0.34);
      ctx.beginPath();
      ctx.moveTo(-cowl * 0.72, top + 10);
      ctx.quadraticCurveTo(0, top + 24, cowl * 0.72, top + 10);
      ctx.quadraticCurveTo(0, top - 2, -cowl * 0.72, top + 10);
      ctx.closePath();
      ctx.fill();

      // Drawstrings, hanging from the cowl with a knot on each.
      for (const side of [-1, 1]) {
        strokeLine(ctx, side * 8, top + 20, side * 9, top + 46, PAPER, 2.6);
        fillCircle(ctx, side * 9, top + 48, 2.6, PAPER);
      }

      // The kangaroo pocket: a band across the front, open at both ends.
      const pw = B.hipW + 1;
      ctx.fillStyle = shade(color, -0.1);
      ctx.beginPath();
      ctx.moveTo(-pw, hoodHem - 34);
      ctx.lineTo(pw, hoodHem - 34);
      ctx.lineTo(pw, hoodHem - 2);
      ctx.quadraticCurveTo(0, hoodHem + 4, -pw, hoodHem - 2);
      ctx.closePath();
      ctx.fill();
      strokeLine(ctx, -pw, hoodHem - 34, -pw * 0.62, hoodHem - 30, shade(color, -0.3), 2.4);
      strokeLine(ctx, pw, hoodHem - 34, pw * 0.62, hoodHem - 30, shade(color, -0.3), 2.4);
      break;
    }
    case 4: // stripes
      sleeve(ctx, -1, 34, color, sway);
      sleeve(ctx, 1, 34, color, sway);
      garment(ctx, color);
      /*
       * Bands drawn wider than the body and cut back by the clip, so each one
       * ends exactly where the shirt does and pulls in through the waist with
       * it. They were 120 wide whatever the build, on a box-shaped clip, which
       * left them hanging out either side of the narrowest part of the dress.
       *
       * Spaced off the garment's own height rather than every 15px: a petite
       * torso is shorter than six fixed steps, so the last stripe used to fall
       * past the hem and get sliced in half.
       */
      withinGarment(ctx, ({ top: gTop, bottom: gBottom }) => {
        const first = gTop + 16;
        const step = (gBottom - 6 - first) / STRIPE_COUNT;
        for (let i = 0; i < STRIPE_COUNT; i += 1) {
          stripeBand(ctx, first + i * step, B.hipW + 30,
            Math.min(7, step * 0.44), relief(color, 0.42));
        }
      });
      break;
    case 5: { // chunky knit
      sleeve(ctx, -1, 64, color, sway, 9);
      sleeve(ctx, 1, 64, color, sway, 9);
      const knit = { top: top - 3, bottom: B.hipY + 14 };
      garment(ctx, color, knit);

      /*
       * Ribs that pinch at the waist with the jumper, and a ribbed hem.
       *
       * Three dead-straight lines at a fixed 15 apart said nothing about the
       * body underneath and nothing about knitwear either — they read as a
       * barcode on a slab. A rib runs down the garment, so it follows the same
       * curve the side seam does: out at the chest, in at the waist, out again
       * over the hip. Each one is placed as a fraction of the garment's own
       * width at each of those three heights, which is what makes them fan.
       *
       * The ribbed hem is the giveaway detail. A chunky jumper ends in a band
       * that grips, and without one this was a sack.
       */
      withinGarment(ctx, ({ top: gTop, bottom: gBottom, waist, sw, ww, hw }) => {
        const rib = shade(color, -0.17);
        ctx.strokeStyle = rib;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (const f of [-0.62, -0.21, 0.21, 0.62]) {
          ctx.beginPath();
          ctx.moveTo(f * sw * 0.72, gTop + 16);
          ctx.quadraticCurveTo(f * ww, waist, f * hw, gBottom + 8);
          ctx.stroke();
        }

        // The band at the hem, with its own finer ribbing across it.
        fillRR(ctx, -hw - 2, gBottom - 12, (hw + 2) * 2, 18, 4, shade(color, -0.1));
        if (FINE) {
          for (let i = -5; i <= 5; i += 1) {
            strokeLine(ctx, i * 7, gBottom - 10, i * 7, gBottom + 4, rib, 1.8);
          }
        }
      }, knit);

      // A rolled collar, so the neck of a jumper is not a raw edge.
      fillRR(ctx, -B.shoulderW * 0.42, top - 8, B.shoulderW * 0.84, 15, 7,
        shade(color, -0.1));
      break;
    }
    case 6: { // dungarees, straps over a bare shoulder
      garment(ctx, color, { top: top + 34, shoulder: -8 });

      /*
       * A bib joined to the straps, and the straps angled out to the shoulder.
       *
       * The bib was a 36-wide rounded rect floating at chest height with two
       * vertical bars behind it, and nothing about that said the three pieces
       * were one garment. A bib is part of the front of the dungarees, so it
       * rises out of the body rather than sitting on it, and the straps run
       * from its top corners out and up — shoulders are wider than a bib, so a
       * strap that goes straight up is a strap that misses the shoulder.
       */
      const bib = B.waistW + 2;
      const bibTop = top + 26;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-bib, bibTop + 6);
      ctx.quadraticCurveTo(-bib, bibTop, -bib + 6, bibTop);
      ctx.lineTo(bib - 6, bibTop);
      ctx.quadraticCurveTo(bib, bibTop, bib, bibTop + 6);
      ctx.lineTo(bib, top + 46);
      ctx.lineTo(-bib, top + 46);
      ctx.closePath();
      ctx.fill();

      for (const side of [-1, 1]) {
        // Out to the shoulder, and thinner than the bib it grows from.
        ctx.strokeStyle = color;
        ctx.lineWidth = 11;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(side * (bib - 5), bibTop + 2);
        ctx.quadraticCurveTo(side * (bib + 4), top + 10, side * B.shoulderW * 0.62, top + 2);
        ctx.stroke();
        // The button that holds it on, where the strap meets the bib.
        fillCircle(ctx, side * (bib - 5), bibTop + 4, 3, shade(color, -0.32));
      }
      break;
    }
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
      /*
       * The shirt underneath, with the cardigan's two front edges either side
       * of it and buttons down one band.
       *
       * It used to be a lighter tint of the cardigan's own colour with no edges
       * — which is not a layer, it is a pale stripe, and it read as a scarf.
       * A shirt is a different garment, so it gets a different colour, and the
       * edges are what actually say the cardigan is hanging open.
       *
       * Measured off the garment: a fixed 110 stopped short of the hem on a
       * tall build and ran past it on a small one.
       */
      withinGarment(ctx, ({ top: gTop, bottom: gBottom }) => {
        const edge = shade(color, -0.26);
        fillRR(ctx, -12, gTop, 24, gBottom - gTop + 14, 3, PAPER);
        strokeLine(ctx, -12, gTop, -12, gBottom + 11, edge, 2.5);
        strokeLine(ctx, 12, gTop, 12, gBottom + 11, edge, 2.5);
        for (let i = 0; i < 3; i += 1) {
          fillCircle(ctx, 17, gTop + 30 + i * 24, 2.6, edge);
        }
      });
      break;
    case 9: { // crop top
      sleeve(ctx, -1, 26, color, sway);
      sleeve(ctx, 1, 26, color, sway);
      const crop = { bottom: B.hipY - 26, neck: 0.32 };
      const { bottom: cropHem, ww } = garmentPath(ctx, crop);
      garment(ctx, color, crop);
      // A finished band at the hem. Cut off square, the shape read as a top
      // that had been cropped by the drawing rather than by a pattern cutter.
      fillRR(ctx, -ww - 2, cropHem - 4, (ww + 2) * 2, 9, 4, shade(color, -0.18));
      break;
    }
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
/**
 * Trousers: a seat, a crotch and two legs, as one shape.
 *
 * They used to be a rounded rectangle with two capsules stuck under it, which
 * gave the seat a notch bitten out between the legs and left every pair in the
 * game with the same sausage silhouette whatever width it was handed — four of
 * the ten bottoms were near enough indistinguishable. One path with a real
 * crotch and a taper toward the hem gives a leg a shape, and `cuff` is what
 * finally tells the four of them apart.
 *
 * @param {'none'|'band'|'turnup'} [options.cuff] how the leg ends
 * @param {number} [options.taper] hem width against the thigh; below 1 tapers
 */
function trousers(ctx, color, hem, width, options = {}) {
  const top = B.hipY - 20;
  const hw = B.hipW + 4;
  const taper = options.taper ?? 0.92;
  const outer = B.legX + width * 0.5;
  const inner = Math.max(1.5, B.legX - width * 0.5);
  const oHem = B.legX + width * 0.5 * taper;
  const iHem = Math.max(1.5, B.legX - width * 0.5 * taper);
  // Far enough down to be a crotch, never more than a third of the way to the
  // hem — on shorts that would land it below the leg opening.
  const crotch = B.hipY + Math.min(26, (hem - B.hipY) * 0.32);

  ctx.fillStyle = litFill(ctx, top, hem - top, color, 0.1);
  ctx.beginPath();
  ctx.moveTo(-hw, top + 9);
  ctx.quadraticCurveTo(-hw, top, -hw + 9, top);
  ctx.lineTo(hw - 9, top);
  ctx.quadraticCurveTo(hw, top, hw, top + 9);
  ctx.quadraticCurveTo(outer + 3, B.hipY + 24, oHem, hem);
  ctx.quadraticCurveTo(B.legX, hem + 6, iHem, hem);
  ctx.quadraticCurveTo(inner, B.hipY + 44, 0, crotch);
  ctx.quadraticCurveTo(-inner, B.hipY + 44, -iHem, hem);
  ctx.quadraticCurveTo(-B.legX, hem + 6, -oHem, hem);
  ctx.quadraticCurveTo(-outer - 3, B.hipY + 24, -hw, top + 9);
  ctx.closePath();
  ctx.fill();

  /*
   * The inside seam.
   *
   * The legs are drawn 11-ish apart and 21 wide, so they very nearly touch —
   * the crotch curve leaves a gap barely a pixel across, and without a seam
   * down it the two legs read as one block to the ankle. The silhouette cannot
   * do this job at these proportions, so a line has to.
   */
  strokeLine(ctx, 0, crotch + 2, 0, hem - 8, shade(color, -0.22), 2.5);

  const cuff = options.cuff ?? 'none';
  if (cuff !== 'none' && FINE) {
    const deep = cuff === 'turnup' ? 13 : 6;
    const tone = shade(color, cuff === 'turnup' ? 0.16 : -0.2);
    for (const side of [-1, 1]) {
      fillRR(ctx, side * B.legX - width * 0.5 * taper - 1, hem - deep,
        width * taper + 2, deep + 4, 3, tone);
    }
  }
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
    case 1: // shorts, with a turn-up
      trousers(ctx, color, hemFor(B.hipY + 34), B.legW + 8, { cuff: 'turnup', taper: 1 });
      break;
    case 2: // short skirt
      skirt(ctx, color, hemFor(B.hipY + 40), B.hipW + 26);
      break;
    case 3: // long skirt
      skirt(ctx, color, hemFor(B.hipY + 74), B.hipW + 34);
      break;
    case 5: // leggings, tapered to the ankle with a cuff
      trousers(ctx, color, hemFor(-12), B.legW + 2, { cuff: 'band', taper: 0.8 });
      break;
    case 6: { // pleated skirt
      const hem = hemFor(B.hipY + 52);
      const flare = B.hipW + 30;
      skirt(ctx, color, hem, flare);
      /*
       * Pleats that reach the hem and open out with it.
       *
       * They used to stop forty short of the hem and fan on a fixed 12-to-20
       * spread, so on a wide skirt they huddled in the middle and on a narrow
       * one they ran outside it. Spacing both ends as a fraction of the skirt's
       * own width is what keeps a pleat a pleat.
       */
      if (FINE) {
        for (const f of [-0.68, -0.34, 0, 0.34, 0.68]) {
          // Dark enough to actually read. At -0.18 the pleats were drawn and
          // invisible, which made this indistinguishable from the plain skirt
          // two options along — the one thing a pleated skirt must not be.
          strokeLine(ctx, f * (B.hipW * 0.7), B.hipY - 10, f * flare * 0.94, hem + 2,
            shade(color, -0.36), 3);
        }
      }
      break;
    }
    case 7: // dungaree trousers, rolled at the ankle
      trousers(ctx, color, hemFor(-14), B.legW + 9, { cuff: 'turnup', taper: 0.94 });
      break;
    case 8: // wide legged, falling straight from the hip
      trousers(ctx, color, hemFor(-12), B.legW + 16, { taper: 1.08 });
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
 * The gala gown, which is `bottom` index 10 and behind a code.
 *
 * It is a `bottom` because it replaces the top as well — the same route the
 * everyday dress at index 4 already takes. What separates the two is where the
 * skirt begins: this one falls from the waist rather than the hip, which is
 * most of the difference between a gown and a long skirt with a top over it.
 *
 * It is drawn with three things the free clothes do not have — a waist seam
 * under a sash, a satin fall of light down the skirt, and a hem that reaches
 * the floor instead of stopping at the shin. That is the whole reason it is
 * worth a code: a locked garment that looked like the others would not be.
 *
 * Classic on purpose. One silhouette, one colour, no cutouts and no asymmetry.
 */
const GALA_GOWN = 10;

function drawGalaGown(ctx, color) {
  const top = B.torsoTop + 6;
  const waist = B.waistY;

  /*
   * Standing, the hem sits 26 above the floor at y=0, so the deepest scallop
   * still clears it. Sitting, it is pulled up over the lap instead: measured
   * from the floor while seated it would pool where the chair is and hide the
   * legs, which reads as somebody standing behind the furniture.
   */
  const hem = POSE === 'sit' ? B.hipY + 46 : -26;
  const flare = B.hipW + 36;
  const w = B.waistW + 3;

  /*
   * The skirt, from the waist, as an A-line rather than a bell.
   *
   * The curve is held close to the body for the first half and only opens
   * below the knee. Flared straight off the waist it was both the wrong shape
   * — a crinoline, which is a costume — and drawn out past where her hands
   * hang: hands are a detail layer and go on last, so they came out as two
   * pale circles sitting on top of the skirt.
   */
  ctx.fillStyle = litFill(ctx, waist - 10, hem - waist + 10, color, 0.16);
  ctx.beginPath();
  ctx.moveTo(-w, waist - 6);
  ctx.lineTo(w, waist - 6);
  ctx.bezierCurveTo(w + 4, waist + 58, flare * 0.5, hem - 46, flare, hem);
  ctx.quadraticCurveTo(flare * 0.6, hem + 15, flare * 0.32, hem + 5);
  ctx.quadraticCurveTo(0, hem + 17, -flare * 0.32, hem + 5);
  ctx.quadraticCurveTo(-flare * 0.6, hem + 15, -flare, hem);
  ctx.bezierCurveTo(-flare * 0.5, hem - 46, -w - 4, waist + 58, -w, waist - 6);
  ctx.closePath();
  ctx.fill();

  // Folds, so the skirt has a fall to it rather than being one flat panel.
  for (const dx of [-0.62, -0.24, 0.24, 0.62]) {
    strokeLine(ctx, dx * B.waistW, waist + 6, dx * flare * 0.9, hem - 4,
      shade(color, -0.12), 2);
  }

  /*
   * The satin.
   *
   * A narrow off-centre fall of light. Centred it read as a seam down the
   * front, and wide it read as a second colour — a stripe rather than a sheen.
   */
  ctx.fillStyle = shade(color, 0.2);
  ctx.beginPath();
  ctx.moveTo(-2, waist + 4);
  ctx.lineTo(6, waist + 4);
  ctx.quadraticCurveTo(20, hem - 40, 24, hem - 2);
  ctx.quadraticCurveTo(12, hem + 3, 2, hem - 3);
  ctx.quadraticCurveTo(-3, hem - 44, -2, waist + 4);
  ctx.closePath();
  ctx.fill();

  /*
   * The bodice, drawn here rather than through `garment`.
   *
   * Every other top ends at the hip, so `garment` cuts its hem at hip width.
   * Asked to end at the waist it put a hip-wide hem there instead of a waist,
   * which came out as a slab sticking out either side of her — the opposite of
   * fitted, and the one line the whole silhouette rests on.
   */
  const sw = B.shoulderW - 2;
  const ww = B.waistW + 3;
  ctx.fillStyle = litFill(ctx, top, waist - top, color, 0.14);
  ctx.beginPath();
  ctx.moveTo(-sw, top + 16);
  ctx.quadraticCurveTo(-sw + 2, top + 2, -sw * 0.4, top + 8);
  // The dip at the front: a sweetheart neckline, which is the classic one.
  ctx.quadraticCurveTo(0, top + 22, sw * 0.4, top + 8);
  ctx.quadraticCurveTo(sw - 2, top + 2, sw, top + 16);
  ctx.quadraticCurveTo(ww + 3, waist - 34, ww, waist + 6);
  ctx.lineTo(-ww, waist + 6);
  ctx.quadraticCurveTo(-ww - 3, waist - 34, -sw, top + 16);
  ctx.closePath();
  ctx.fill();

  // Thin straps up over the shoulders: the neckline is cut low, and a gown
  // that stayed up by itself read as a tube.
  for (const side of [-1, 1]) {
    strokeLine(ctx, side * (sw * 0.5), top + 8,
      side * (sw * 0.72), B.torsoTop - 2, color, 5);
  }

  // The sash, with a brooch where it gathers. Kept to the waist it sits on —
  // a sash wider than the waist is a belt worn over the hips.
  fillRR(ctx, -ww - 2, waist - 6, (ww + 2) * 2, 13, 6, shade(color, -0.28));
  fillRR(ctx, -ww - 2, waist - 6, (ww + 2) * 2, 4, 2, shade(color, -0.08));
  fillCircle(ctx, 0, waist + 0.5, 4.5, relief(color, 0.45));
}

/**
 * The second gown: `bottom` index 11, also behind a code.
 *
 * Where the first gown is an A-line that falls from the waist, this one is a
 * column — held against the body from the bust to below the knee and only then
 * breaking into a mermaid flare. Two gowns that differ in trim would be one
 * gown twice; two that differ in silhouette are two, and the option grid draws
 * them at the size of a thumbnail, where the outline is all there is to go on.
 *
 * A plunging sweetheart neckline, strands of jewels draped off the shoulders
 * instead of straps, and lines of stones following the seams rather than a
 * fabric print. The glitter is the point of this one, so it is drawn as
 * separate stones and not as a lighter colour.
 */
const GLITTER_GOWN = 11;

/**
 * Bottoms that reach the floor, and so shorten her step.
 *
 * Read by `drawCharacter` when it works out the stride. Declared here rather
 * than at the top of the file so it sits with the two gowns it names.
 */
const FLOOR_LENGTH = new Set([GALA_GOWN, GLITTER_GOWN]);

/**
 * Stones along a line, fading toward the ends.
 *
 * Placed off a fixed pattern rather than a random one: the option cells are
 * cached bitmaps, so anything random redraws differently every time the cache
 * is missed and the dress appears to twinkle when nothing has changed.
 */
function beading(ctx, x1, y1, x2, y2, count, color, size = 1.7) {
  for (let i = 0; i < count; i += 1) {
    const t = (i + 0.5) / count;
    // Biggest in the middle of the run, so a line of stones has a highlight
    // along it instead of reading as a dotted rule.
    const r = size * (0.55 + 0.45 * Math.sin(t * Math.PI));
    fillCircle(ctx, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, r, color);
  }
}

function drawGlitterGown(ctx, color) {
  const bust = B.torsoTop + 14;
  const waist = B.waistY;
  const hip = B.hipY;

  /*
   * Where the column breaks into the flare.
   *
   * Below the knee standing. Sitting, the whole thing is pulled up over the
   * lap like the other gown — a floor-length hem measured while seated pools
   * where the chair is and hides the legs.
   */
  const hem = POSE === 'sit' ? hip + 46 : -26;
  // Above the hem, so minus. Plus put the break below the floor, and the skirt
  // ran down past her feet and flared back up into two spikes.
  const knee = POSE === 'sit' ? hip + 26 : hem - 34;
  const flare = B.hipW + 26;
  const sparkle = relief(color, 0.55);

  const hw = B.hipW + 4;
  /*
   * The narrowest the column gets.
   *
   * Cut to the leg it covers, it was narrower than her stride: walking, the
   * legs swung out past the sides of the dress and came through it. A gown is
   * allowed to be tight, not to be transparent — so this is the width of the
   * widest step rather than of a leg standing still.
   */
  const kw = B.legW + 15;

  // The column: bust, waist, hip, then held close to the knee.
  ctx.fillStyle = litFill(ctx, bust, hem - bust, color, 0.16);
  ctx.beginPath();
  ctx.moveTo(-B.shoulderW * 0.72, bust + 2);
  // The plunging sweetheart: two curves that meet low in the middle.
  ctx.quadraticCurveTo(-B.shoulderW * 0.3, bust - 6, -1, bust + 34);
  ctx.quadraticCurveTo(B.shoulderW * 0.3, bust - 6, B.shoulderW * 0.72, bust + 2);
  ctx.quadraticCurveTo(B.waistW + 5, waist - 26, B.waistW + 3, waist);
  ctx.quadraticCurveTo(hw, hip - 16, hw, hip + 6);
  ctx.quadraticCurveTo(kw + 4, knee - 40, kw, knee);
  // The mermaid break. The control point sits near the knee's own width so the
  // skirt eases outward — level with the break it bulged straight sideways and
  // the hem came out as a flat pancake round her feet.
  ctx.quadraticCurveTo(kw + 7, hem - 16, flare, hem);
  ctx.quadraticCurveTo(flare * 0.55, hem + 15, flare * 0.3, hem + 5);
  ctx.quadraticCurveTo(0, hem + 17, -flare * 0.3, hem + 5);
  ctx.quadraticCurveTo(-flare * 0.55, hem + 15, -flare, hem);
  ctx.quadraticCurveTo(-kw - 7, hem - 16, -kw, knee);
  ctx.quadraticCurveTo(-kw - 4, knee - 40, -hw, hip + 6);
  ctx.quadraticCurveTo(-hw, hip - 16, -B.waistW - 3, waist);
  ctx.quadraticCurveTo(-B.waistW - 5, waist - 26, -B.shoulderW * 0.72, bust + 2);
  ctx.closePath();
  ctx.fill();

  // Two soft creases either side of the front, so the column has a front and
  // two sides. A single line down the middle read as a zip, or worse as a slit.
  for (const side of [-1, 1]) {
    strokeLine(ctx, side * B.waistW * 0.5, waist - 6, side * kw * 0.5, knee,
      shade(color, -0.08), 2);
  }

  /*
   * The stones.
   *
   * Skipped entirely when the figure is too small to resolve them: a fifty
   * stone dress drawn two thirds of a pixel at a time is a smudge that costs
   * fifty fills, which is the whole reason `FINE` exists.
   */
  if (FINE) {
    // Following the seams, the way the real one traces the silhouette.
    for (const side of [-1, 1]) {
      beading(ctx, side * (B.shoulderW * 0.66), bust + 6,
        side * (B.waistW + 4), waist, 7, sparkle);
      beading(ctx, side * (B.waistW + 4), waist, side * hw, hip + 4, 4, sparkle);
      beading(ctx, side * hw, hip + 4, side * kw, knee, 6, sparkle, 1.5);
    }
    // The neckline, which is the edge the eye lands on first.
    beading(ctx, -B.shoulderW * 0.66, bust + 4, -1, bust + 32, 5, sparkle, 1.9);
    beading(ctx, 1, bust + 32, B.shoulderW * 0.66, bust + 4, 5, sparkle, 1.9);
    // And a scatter over the skirt, dense at the break and thinning downward.
    for (let i = 0; i < 14; i += 1) {
      const t = i / 13;
      const y = knee + (hem - knee) * t;
      const spread = kw + (flare - kw) * t;
      fillCircle(ctx, (i % 2 ? 1 : -1) * spread * (0.28 + 0.5 * ((i * 7) % 5) / 4),
        y, 1.5 - t * 0.5, sparkle);
    }
  }

  /*
   * Jewels draped off the shoulders, in place of straps.
   *
   * The neckline is cut too low to hold itself up, and a plain strap on a
   * dress made of stones looks like a strap somebody forgot to finish.
   */
  for (const side of [-1, 1]) {
    const sx = side * B.shoulderW * 0.78;
    ctx.strokeStyle = sparkle;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(sx, B.torsoTop - 1);
    ctx.quadraticCurveTo(sx * 1.04, bust + 14, side * B.shoulderW * 0.6, bust + 8);
    ctx.stroke();
    if (FINE) beading(ctx, sx, B.torsoTop + 3, side * B.shoulderW * 0.62, bust + 8, 4, sparkle, 1.6);
    fillCircle(ctx, sx, B.torsoTop - 1, 2.6, sparkle);
  }
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
        fillRR(ctx, x - B.legW / 2 - 2, -40, B.legW + 4, 5, 2, relief(color, 0.28));
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
        fillCircle(ctx, toe, -15, 3.2, relief(color, 0.4));
        break;
      case 5: // wellies
        fillRR(ctx, x - B.legW / 2 - 3, -62, B.legW + 6, 56, 8, litFill(ctx, -62, 56, color, 0.14));
        fillEllipse(ctx, toe, -6, B.legW * 0.8, 9, shade(color, -0.25));
        fillRR(ctx, x - B.legW / 2 - 3, -56, B.legW + 6, 7, 3, relief(color, 0.3));
        break;
      case 6: // fluffy slippers
        fillEllipse(ctx, toe, -9, B.legW * 0.8, 11, color);
        fillCircle(ctx, toe, -18, B.legW * 0.42, relief(color, 0.32));
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

    /*
     * A sole under every shoe.
     *
     * Five of the eight are a single ellipse in the shoe's own colour stuck to
     * the bottom of a leg, which reads as a foot rather than as footwear —
     * flats, sandals, mary janes and slippers were all the same pebble with a
     * different decoration on top. A sole is the one thing every shoe has and
     * none of these had, and it is what puts her on the floor rather than
     * ending at it.
     */
    if (FINE) {
      fillRR(ctx, toe - B.legW * 0.76, -4, B.legW * 1.5, 6, 2.5, shade(color, -0.4));
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
      fillCircle(ctx, -side, top, 6, relief(color, 0.4));
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

      /*
       * The stripes and the cuff both used to be a highlight — shade(+0.4) and
       * shade(+0.28). That works on a navy sock and does nothing at all on a
       * cream one, and the sock palette is mostly pale, so the striped socks
       * had their stripes drawn every single time and had never once been
       * seen. `relief` picks the direction from the colour instead.
       */
      if (style === 4) {
        for (let y = top + 8; y < length - 12; y += 16) {
          fillRR(ctx, -w / 2, y, w, 6, 2, relief(color, 0.34));
        }
      }
      if (style === 5) {
        // Bunched at the ankle: a couple of folds where it slouches.
        for (const y of [length - 26, length - 14]) {
          fillRR(ctx, -w / 2 - 2, y, w + 4, 9, 4, relief(color, 0.16));
        }
      }
      // A turned cuff, which is what tells a sock from a painted leg.
      if (style !== 3) fillRR(ctx, -w / 2 - 1, top, w + 2, 8, 4, relief(color, 0.22));
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
      fillCircle(ctx, 0, top + 11, 7, relief(color, 0.42));
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
      /*
       * Straps that reach the shoulders, and a tie at the waist.
       *
       * They were two short vertical bars floating either side of the neck,
       * ending in mid-air well short of the shoulder — the same mistake the
       * dungarees made. An apron hangs from the shoulders, so the straps run
       * from the top of the bib out to them.
       */
      for (const side of [-1, 1]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(side * (B.waistW - 2), top + 34);
        ctx.quadraticCurveTo(side * (B.waistW + 6), top + 8, side * B.shoulderW * 0.58, top + 4);
        ctx.stroke();
      }
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
      const gTop = top + 6;
      const gBottom = B.hipY + 12;
      openFront(ctx, color, gTop, gBottom);

      /*
       * Quilting that stops where the gilet does.
       *
       * These ran from a fixed shoulder width inward, so at the waist — where
       * the gilet is now at its narrowest — they carried on out past the edge
       * of it. The same mistake the shirt stripes were making. Each seam is
       * measured against the garment's own half-width at its own height, which
       * means walking the same three points the side seam is built from.
       */
      const tipY = gTop + SHOULDER_DROP;
      const sw = B.shoulderW + 7;
      const ww = B.waistW + 7;
      const hw = B.hipW + 7;
      const halfAt = (y) => {
        if (y <= tipY) return sw;
        if (y <= B.waistY) return sw + (ww - sw) * ((y - tipY) / (B.waistY - tipY));
        return ww + (hw - ww) * Math.min(1, (y - B.waistY) / (gBottom - B.waistY));
      };

      for (let i = 0; i < 3; i += 1) {
        const y = gTop + 26 + i * 22;
        const edge = halfAt(y) - 2;
        strokeLine(ctx, -edge, y, -10, y + 1, shade(color, -0.18), 3);
        strokeLine(ctx, 10, y + 1, edge, y, shade(color, -0.18), 3);
      }
    }
  }
}

/** Two front panels with a gap between them, for anything worn open. */
function openFront(ctx, color, top, bottom, lapel = 0) {
  const sw = B.shoulderW + 7;
  const hw = B.hipW + 7;
  const ww = B.waistW + 7;
  const tipY = top + SHOULDER_DROP;

  for (const side of [-1, 1]) {
    ctx.fillStyle = litFill(ctx, top, bottom - top, color, 0.12);
    ctx.beginPath();
    /*
     * The same sloped shoulder the garments got, for the same reason: this ran
     * flat from the neck to the tip and then straight down, which put a square
     * pad on every cardigan, coat and gilet in the game.
     */
    ctx.moveTo(side * sw, tipY);
    ctx.bezierCurveTo(side * sw, top + 4, side * sw * 0.72, top - 1, side * sw * 0.46, top + 4);
    ctx.lineTo(side * 9, top + 30);
    ctx.lineTo(side * 9, bottom);
    ctx.quadraticCurveTo(side * hw * 0.6, bottom + 8, side * hw, bottom - 4);
    /*
     * And a waist. The side seam used to run from the hem to the shoulder in
     * one curve that bulged outward on the way, so a coat was a barrel with a
     * head on top — the figure underneath has a waist and the coat hid it.
     */
    ctx.quadraticCurveTo(side * hw, B.waistY + 10, side * ww, B.waistY);
    ctx.quadraticCurveTo(side * sw, tipY + 22, side * sw, tipY);
    ctx.closePath();
    ctx.fill();

    if (lapel > 0) {
      fillPoly(ctx, [
        side * sw * 0.5, top + 4, side * 9, top + 30 + lapel * 24, side * 9, top + 26,
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
    case 2: { // a wand
      /*
       * A tapered shaft, a bound grip and a star on the end.
       *
       * It was a straight brown capsule with a slightly paler bead on top,
       * which is a stick. Next to a sword that has a crossguard and a gem in
       * the pommel it looked like the thing you got instead of a present. A
       * wand tapers toward the tip and the magic is at the end of it.
       */
      ctx.rotate(0.42);
      const wood = '#7d5236';
      const spark = '#f4e6b0';

      ctx.fillStyle = litFill(ctx, -34, 58, wood, 0.2);
      ctx.beginPath();
      ctx.moveTo(-3.8, 24);
      ctx.lineTo(3.8, 24);
      ctx.lineTo(2, -30);
      ctx.lineTo(-2, -30);
      ctx.closePath();
      ctx.fill();
      fillRR(ctx, -4.6, 7, 9.2, 14, 3, shade(wood, -0.3));

      fillCircle(ctx, 0, -34, 8, shade(spark, 0.5));
      if (FINE) {
        fillPoly(ctx, [
          0, -45, 2.5, -36.5, 11, -34, 2.5, -31.5,
          0, -23, -2.5, -31.5, -11, -34, -2.5, -36.5,
        ], spark);
      }
      fillCircle(ctx, 0, -34, 2.6, '#fffdf2');
      break;
    }
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
    case 6: { // the magic sword
      /*
       * Point down, tipped outward.
       *
       * The hand is already further from the middle than the leg is, so the
       * only thing that can be hit on the way down is the leg itself — and a
       * negative angle swings the tip away from the body rather than across
       * it. The wand above tips the other way, which is fine at 58 long and
       * would put a blade through her knee.
       *
       * Carried point down rather than shouldered: a blade resting on the
       * shoulder crosses the head at every hairstyle, and one held up crosses
       * the top of the design space on the grown-up size.
       */
      /*
       * Far enough out to clear the stride.
       *
       * At a gentler angle the blade hung straight down beside the leg, which
       * is fine standing still and wrong the moment she walks: the legs swing
       * out under it and the near one crossed the blade every other step.
       */
      ctx.rotate(-0.42);

      const steel = '#c2cedb';
      const gold = '#d9a24e';
      const gem = '#8fd8ea';

      /*
       * Sitting, the point rests on the ground beside the chair.
       *
       * Her hand drops about forty when she sits, and a blade that reaches the
       * floor standing goes through it sitting — the only held thing in the
       * game that did. Shortened to where the ground now is, it reads as a
       * sword stood on its point beside her, which is what somebody sitting
       * down with one does with it.
       */
      const reach = POSE === 'sit' ? 64 : 96;
      const edge = reach * 0.77;

      // The blade, tapering to a point, with a fuller down the middle and a
      // pale edge that is as much magic as it is a highlight.
      fillPoly(ctx, [-8, 12, 8, 12, 5.5, edge, 0, reach, -5.5, edge],
        litFill(ctx, 12, reach - 12, steel, 0.2));
      strokeLine(ctx, 0, 18, 0, edge + 2, shade(steel, -0.18), 2.5);
      strokeLine(ctx, -5, 16, -3, edge + 4, '#f4fbff', 2.2);
      strokeLine(ctx, 5, 16, 3, edge + 4, shade(steel, -0.28), 1.5);

      // Crossguard, with a stone set in the middle of it.
      fillRR(ctx, -17, 5, 34, 9, 4, litFill(ctx, 5, 9, gold, 0.25));
      fillCircle(ctx, 0, 9.5, 3.4, gem);

      // A wrapped grip: the wraps are what stop it reading as a stick.
      capsule(ctx, 0, -14, 5, 8, '#6d4630');
      for (let i = 0; i < 4; i += 1) {
        strokeLine(ctx, -4, -11 + i * 4.6, 4, -13 + i * 4.6, shade('#6d4630', 0.3), 1.6);
      }

      // Pommel.
      fillCircle(ctx, 0, -17, 6, litFill(ctx, -23, 12, gold, 0.3));
      fillCircle(ctx, 0, -17, 3, gem);
      break;
    }
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
      fillRR(ctx, -HEAD_R - 6, -34, HEAD_R * 2 + 12, 16, 7, relief(color, 0.28));
      fillCircle(ctx, 0, -HEAD_R - 22, 13, relief(color, 0.28));
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
    case 10: { // a scarf wound round the neck
      /*
       * It was one 80-wide capsule at the chin — as wide as her whole head,
       * sticking out well past the neck it was supposed to be round, with a
       * separate rounded rect beside it for a tail. It read as a surgical
       * collar. A scarf is wound, so it is two bands with the front one lapped
       * over the back, and the tail hangs off the front one rather than
       * floating next to it.
       */
      const w = HEAD_R * 0.46;
      fillRR(ctx, -w, HEAD_R - 8, w * 2, 17, 8, shade(color, -0.18));
      fillRR(ctx, -w * 0.94, HEAD_R + 1, w * 1.88, 16, 8, color);

      const tx = w * 0.34;
      ctx.fillStyle = shade(color, -0.07);
      ctx.beginPath();
      ctx.moveTo(tx, HEAD_R + 12);
      ctx.lineTo(tx + w * 0.62, HEAD_R + 12);
      ctx.quadraticCurveTo(tx + w * 0.58, HEAD_R + 40, tx + w * 0.42, HEAD_R + 50);
      ctx.quadraticCurveTo(tx + w * 0.06, HEAD_R + 44, tx, HEAD_R + 12);
      ctx.closePath();
      ctx.fill();
      if (FINE) {
        for (let i = 0; i < 3; i += 1) {
          strokeLine(ctx, tx + 3 + i * 6, HEAD_R + 47, tx + 2 + i * 6, HEAD_R + 55,
            relief(color, 0.2), 2);
        }
      }
      break;
    }
    case 11: // cat ears
      /*
       * Sat on the head instead of hovering over it. Both base corners used to
       * fall outside the skull — the outer one at 46 against a radius of 58,
       * but paired with a y that put it well clear of the curve — so the ears
       * floated above her hair with a gap under them.
       */
      for (const side of [-1, 1]) {
        fillPoly(ctx, [
          side * 15, -40, side * 40, -22, side * 33, -72,
        ], color);
        fillPoly(ctx, [
          side * 21, -40, side * 34, -28, side * 31, -62,
        ], relief(color, 0.34));
      }
      break;
    default:
      break;
  }
}
