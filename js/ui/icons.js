/**
 * Icons, drawn in code, centred on the origin at a nominal 44px box.
 *
 * The interface is icon-first on purpose: Rotem reads English, but nothing in
 * the game should *require* reading to be understood.
 */

import { fillRR, fillCircle, fillEllipse, fillPoly, strokeLine, roundRect } from '../render/shapes.js';

/** A line with a head on the end, drawn thick enough to survive downscaling. */
function arrow(ctx, color, x1, y1, x2, y2, width = 3.6) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = width * 2.2;
  stroke(ctx, color, width);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(angle - 0.5) * head, y2 - Math.sin(angle - 0.5) * head);
  ctx.lineTo(x2 - Math.cos(angle + 0.5) * head, y2 - Math.sin(angle + 0.5) * head);
  ctx.closePath();
  ctx.fill();
}

/** The outline the size controls share, so they read as a pair. */
function sizeBox(ctx, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  roundRect(ctx, -17, -17, 34, 34, 6);
  ctx.stroke();
}

/** The pile an object is being moved through, drawn as two cards edge on. */
function stack(ctx, color) {
  fillRR(ctx, -19, 6, 38, 6, 3, color);
  fillRR(ctx, -13, 15, 26, 6, 3, color);
}

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

  /*
   * Controls for a selected object.
   *
   * The first set was a plus and a minus in a square box, and two triangles
   * with bars that read as eject and download. None of them said what they
   * did. These show the effect instead: a shape getting smaller or larger, a
   * shape mirrored across an axis, and one card moving in front of or behind
   * another.
   */

  flip(ctx, c) {
    // Solid shape on the left, its outline mirrored on the right, axis between.
    fillPoly(ctx, [-6, -13, -6, 13, -19, 0], c);
    ctx.strokeStyle = c;
    ctx.lineWidth = 2.6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(6, -13);
    ctx.lineTo(6, 13);
    ctx.lineTo(19, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(0, 17);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  /*
   * Bigger and smaller.
   *
   * A plus and a minus in a box. Mirrored arrow pairs were tried twice and
   * fail the same way: at phone size the heads are a few pixels and "pointing
   * out" and "pointing in" collapse into the same pair of dashes. A cross and
   * a single bar stay different however small they get, and a child already
   * knows what they mean. The box is what says the pair is about the object
   * rather than about adding another one.
   */
  grow(ctx, c) {
    sizeBox(ctx, c);
    strokeLine(ctx, -8, 0, 8, 0, c, 4.6);
    strokeLine(ctx, 0, -8, 0, 8, c, 4.6);
  },

  shrink(ctx, c) {
    sizeBox(ctx, c);
    strokeLine(ctx, -8, 0, 8, 0, c, 4.6);
  },

  /*
   * In front of and behind.
   *
   * These used to be the same two overlapping cards with the fill swapped and
   * a 7px arrow to tell them apart, which at phone size made them identical.
   * The difference is now the direction of a big arrow, which is the one thing
   * that survives being drawn small.
   */
  layerUp(ctx, c) {
    stack(ctx, c);
    arrow(ctx, c, 0, 2, 0, -19, 4.4);
  },

  layerDown(ctx, c) {
    stack(ctx, c);
    arrow(ctx, c, 0, -19, 0, 2, 4.4);
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

  /*
   * A footprint, for "send her walking to this room".
   *
   * One big print rather than a pair: at the size this is drawn, two prints
   * shrink until they read as two blobs, and a child cannot tell what they
   * are meant to be.
   */
  walk(ctx, c) {
    ctx.save();
    ctx.rotate(-0.16);

    // Ball, arch and heel as one path. Drawn as three overlapping shapes the
    // waist of the arch pinched to nothing and the heel read as a loose blob.
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-11, -8);
    ctx.quadraticCurveTo(-13, 3, -7, 7);
    ctx.quadraticCurveTo(-10, 15, -5, 18);
    ctx.quadraticCurveTo(0, 21, 5, 18);
    ctx.quadraticCurveTo(10, 15, 7, 7);
    ctx.quadraticCurveTo(13, 3, 11, -8);
    ctx.quadraticCurveTo(9, -16, 0, -16);
    ctx.quadraticCurveTo(-9, -16, -11, -8);
    ctx.closePath();
    ctx.fill();

    for (const [x, y, r] of [[-8, -19, 2.9], [-2.5, -21.5, 3], [3.5, -20.5, 2.8], [8.5, -17, 2.4]]) {
      fillCircle(ctx, x, y, r, c);
    }
    ctx.restore();
  },

  /* An open book, for "read this". */
  book(ctx, c) {
    ctx.fillStyle = c;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 2, -11);
      ctx.quadraticCurveTo(side * 12, -16, side * 20, -12);
      ctx.lineTo(side * 20, 12);
      ctx.quadraticCurveTo(side * 12, 8, side * 2, 13);
      ctx.closePath();
      ctx.fill();
    }
    strokeLine(ctx, 0, -12, 0, 13, c, 3);
  },

  /* A shower head with the water on. */
  shower(ctx, c) {
    strokeLine(ctx, 0, -21, 0, -14, c, 3.4);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-15, -8);
    ctx.quadraticCurveTo(0, -18, 15, -8);
    ctx.closePath();
    ctx.fill();
    for (const [x, y] of [[-10, 0], [-3.5, 3], [3.5, 0], [10, 3], [-7, 11], [7, 11], [0, 14]]) {
      fillCircle(ctx, x, y, 2.6, c);
    }
  },

  /* A lock of hair with a drop of colour on it. */
  hairColor(ctx, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-16, 16);
    ctx.quadraticCurveTo(-20, -12, -2, -20);
    ctx.quadraticCurveTo(14, -13, 8, 4);
    ctx.quadraticCurveTo(6, 13, -4, 12);
    ctx.quadraticCurveTo(-10, 11, -8, 16);
    ctx.closePath();
    ctx.fill();
    // The drop, cut out of the lock so it reads on any background.
    fillCircle(ctx, 12, 12, 8, c);
    ctx.globalCompositeOperation = 'destination-out';
    fillCircle(ctx, 12, 12, 4.5, '#000');
    ctx.globalCompositeOperation = 'source-over';
  },

  /* A bulb, for turning a lamp on. */
  light(ctx, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(0, -6, 11, Math.PI, 0);
    ctx.quadraticCurveTo(11, 4, 5, 9);
    ctx.lineTo(-5, 9);
    ctx.quadraticCurveTo(-11, 4, -11, -6);
    ctx.closePath();
    ctx.fill();
    fillRR(ctx, -6, 11, 12, 5, 2, c);
    fillRR(ctx, -4, 17, 8, 4, 2, c);
    // Rays kept inside the 44px box the icons are drawn in.
    for (const a of [-2.5, -1.9, -1.25, -0.6, 0]) {
      strokeLine(ctx, Math.cos(a) * 12, -6 + Math.sin(a) * 12,
        Math.cos(a) * 16, -6 + Math.sin(a) * 16, c, 2.6);
    }
  },

  /* A screen on a stand, for watching. */
  tv(ctx, c) {
    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    roundRect(ctx, -19, -16, 38, 26, 4);
    ctx.stroke();
    fillRR(ctx, -9, 14, 18, 4, 2, c);
    strokeLine(ctx, 0, 10, 0, 15, c, 3);
  },

  /* A door swinging open. */
  open(ctx, c) {
    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    ctx.strokeRect(-16, -18, 14, 36);
    fillPoly(ctx, [2, -18, 18, -11, 18, 20, 2, 18], c);
  },

  /* A pot with steam coming off it. */
  cook(ctx, c) {
    fillRR(ctx, -15, 0, 30, 16, 4, c);
    fillRR(ctx, -19, -4, 38, 5, 2, c);
    for (const x of [-7, 0, 7]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, -10);
      ctx.quadraticCurveTo(x + 4, -15, x, -20);
      ctx.stroke();
    }
  },

  /* A figure on a seat, for sitting down. */
  sit(ctx, c) {
    fillCircle(ctx, -3, -15, 6, c);
    // Back, thigh and shin as one bent line.
    stroke(ctx, c, 5);
    ctx.beginPath();
    ctx.moveTo(-3, -8);
    ctx.lineTo(-3, 3);
    ctx.lineTo(11, 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(11, 3);
    ctx.lineTo(11, 17);
    ctx.stroke();
    strokeLine(ctx, -14, 17, -14, -2, c, 4);
    strokeLine(ctx, -16, 3, -1, 3, c, 4);
  },

  /* Z's, for going to sleep. */
  sleep(ctx, c) {
    const zed = (x, y, size) => {
      stroke(ctx, c, size * 0.26);
      ctx.beginPath();
      ctx.moveTo(x - size / 2, y - size / 2);
      ctx.lineTo(x + size / 2, y - size / 2);
      ctx.lineTo(x - size / 2, y + size / 2);
      ctx.lineTo(x + size / 2, y + size / 2);
      ctx.stroke();
    };
    zed(-8, 10, 13);
    zed(6, -4, 11);
    zed(15, -16, 8);
  },

  /* A tub with water in it. */
  bathe(ctx, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-19, -4);
    ctx.lineTo(19, -4);
    ctx.quadraticCurveTo(17, 15, 8, 15);
    ctx.lineTo(-8, 15);
    ctx.quadraticCurveTo(-17, 15, -19, -4);
    ctx.closePath();
    ctx.fill();
    strokeLine(ctx, -21, -8, 21, -8, c, 3.4);
    fillCircle(ctx, -11, -15, 3, c);
    fillCircle(ctx, -1, -19, 2.6, c);
    fillCircle(ctx, 8, -15, 2.2, c);
  },

  /* A cat's head, for the cat parts. */
  catFace(ctx, c) {
    fillPoly(ctx, [-16, -6, -8, -20, -3, -7], c);
    fillPoly(ctx, [16, -6, 8, -20, 3, -7], c);
    fillEllipse(ctx, 0, 0, 17, 15, c);
    ctx.globalCompositeOperation = 'destination-out';
    fillEllipse(ctx, -6, -2, 3, 4, '#000');
    fillEllipse(ctx, 6, -2, 3, 4, '#000');
    ctx.globalCompositeOperation = 'source-over';
  },

  /* A swatch of coat. */
  catCoat(ctx, c) {
    fillEllipse(ctx, 0, 2, 19, 13, c);
    fillCircle(ctx, -14, -8, 8, c);
  },

  /* Stripes, for the markings. */
  catMarking(ctx, c) {
    fillEllipse(ctx, 0, 2, 19, 13, c);
    ctx.globalCompositeOperation = 'destination-out';
    for (const x of [-9, -1, 7]) fillRR(ctx, x, -12, 4, 28, 2, '#000');
    ctx.globalCompositeOperation = 'source-over';
  },

  /* The same, as a colour. */
  catMarkingColor(ctx, c) {
    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 2, 19, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (const x of [-8, 0, 8]) fillRR(ctx, x, -6, 4, 16, 2, c);
  },

  catEars(ctx, c) {
    fillPoly(ctx, [-18, 8, -8, -18, 0, 6], c);
    fillPoly(ctx, [18, 8, 8, -18, 0, 6], c);
  },

  catTail(ctx, c) {
    stroke(ctx, c, 7);
    ctx.beginPath();
    ctx.moveTo(-14, 16);
    ctx.quadraticCurveTo(14, 8, 8, -16);
    ctx.stroke();
  },

  catCollar(ctx, c) {
    ctx.strokeStyle = c;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, -3, 14, 0.25, Math.PI - 0.25);
    ctx.stroke();
    fillCircle(ctx, 0, 14, 5, c);
  },

  /* A fork and knife, for eating. */
  eat(ctx, c) {
    // Fork.
    strokeLine(ctx, -9, -4, -9, 19, c, 3.4);
    for (const x of [-14, -9, -4]) strokeLine(ctx, x, -19, x, -8, c, 2.6);
    strokeLine(ctx, -14, -8, -4, -8, c, 2.6);
    // Knife.
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(8, -19);
    ctx.quadraticCurveTo(15, -12, 13, 0);
    ctx.lineTo(8, 0);
    ctx.closePath();
    ctx.fill();
    strokeLine(ctx, 10.5, 0, 10.5, 19, c, 3.4);
  },

  /* A glass with something in it, for having a drink. */
  drink(ctx, c) {
    ctx.strokeStyle = c;
    ctx.lineWidth = 3.2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-11, -17);
    ctx.lineTo(-8, 15);
    ctx.lineTo(8, 15);
    ctx.lineTo(11, -17);
    ctx.closePath();
    ctx.stroke();
    // Filled to about half, which is what says it has something in it.
    fillPoly(ctx, [-9.4, -2, 9.4, -2, 8, 13, -8, 13], c);
    strokeLine(ctx, 4, -20, 13, -6, c, 3);
  },

  /* A marker, held at the angle you write with. */
  marker(ctx, c) {
    ctx.save();
    ctx.rotate(-0.5);
    // Barrel, band, and the wedge nib that says marker rather than pencil.
    fillRR(ctx, -6, -18, 12, 22, 3, c);
    fillRR(ctx, -7, 3, 14, 4, 2, c);
    fillPoly(ctx, [-5, 8, 5, 8, 3, 19, -3, 19], c);
    ctx.restore();
  },

  /* A board rubber, felt side down. */
  rubber(ctx, c) {
    ctx.save();
    ctx.rotate(-0.12);
    fillRR(ctx, -18, -12, 36, 14, 4, c);
    fillRR(ctx, -15, 3, 30, 8, 3, c);
    ctx.globalCompositeOperation = 'destination-out';
    fillRR(ctx, -12, 5.5, 24, 3, 1.5, '#000');
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },

  /* Wiping the board: a rubber, and the clean sweep behind it. */
  wipe(ctx, c) {
    fillRR(ctx, 0, -4, 20, 12, 4, c);
    for (const [y, len] of [[-14, 18], [-8, 13], [-2, 9]]) {
      strokeLine(ctx, -20, y, -20 + len, y, c, 3.4);
    }
    // The board edge it is being wiped along.
    strokeLine(ctx, -21, 15, 21, 15, c, 3.4);
  },

  /* A door standing open, for going outside. */
  door(ctx, c) {
    ctx.strokeStyle = c;
    ctx.lineWidth = 3.2;
    ctx.lineJoin = 'round';
    ctx.strokeRect(-15, -18, 30, 36);
    // The leaf, swung towards you, so it reads as open rather than as a panel.
    fillPoly(ctx, [-13, -16, 6, -12, 6, 16, -13, 16], c);
    fillCircle(ctx, 2, 2, 2.4, '#000');
    ctx.globalCompositeOperation = 'destination-out';
    fillCircle(ctx, 2, 2, 2.4, '#000');
    ctx.globalCompositeOperation = 'source-over';
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

  looks(ctx, c) {
    // A rail of hanging outfits: the gallery of whole looks.
    strokeLine(ctx, -19, -15, 19, -15, c, 3);
    for (const [x, w] of [[-11, 12], [0, 12], [11, 12]]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(x, -12, 3.2, Math.PI * 0.8, Math.PI * 2.4);
      ctx.stroke();
      fillPoly(ctx, [x - w / 2, -4, x + w / 2, -4, x + w / 2 - 1.5, 16, x - w / 2 + 1.5, 16], c);
    }
  },

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

  layer(ctx, c) {
    // An open cardigan: two front panels with a gap down the middle.
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-9, -15);
    ctx.lineTo(-2, -13);
    ctx.lineTo(-2, 16);
    ctx.lineTo(-11, 16);
    ctx.lineTo(-11, -2);
    ctx.lineTo(-15, 0);
    ctx.lineTo(-19, -9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9, -15);
    ctx.lineTo(2, -13);
    ctx.lineTo(2, 16);
    ctx.lineTo(11, 16);
    ctx.lineTo(11, -2);
    ctx.lineTo(15, 0);
    ctx.lineTo(19, -9);
    ctx.closePath();
    ctx.fill();
  },

  socks(ctx, c) {
    // A sock: a leg with a folded cuff and a foot turned out.
    fillRR(ctx, -13, -17, 15, 6, 3, c);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-13, -10);
    ctx.lineTo(2, -10);
    ctx.lineTo(2, 6);
    ctx.quadraticCurveTo(2, 15, 12, 15);
    ctx.lineTo(16, 15);
    ctx.lineTo(16, 6);
    ctx.quadraticCurveTo(-4, 6, -4, -2);
    ctx.lineTo(-13, -2);
    ctx.closePath();
    ctx.fill();
  },

  held(ctx, c) {
    // A hand holding a book.
    fillRR(ctx, -16, -12, 26, 20, 2, c);
    fillRR(ctx, -16, -12, 6, 20, 2, '#00000055');
    fillCircle(ctx, 8, 12, 8, c);
    fillRR(ctx, 1, 6, 12, 6, 3, c);
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
