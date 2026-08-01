/**
 * Placeholder art, drawn in code.
 *
 * These exist so the game is fully playable before a single drawing has been
 * made. Every function is keyed by the same id its PNG will use, so when a
 * drawing of a sofa lands at `assets/drawings/sofa.png` it replaces this sofa
 * with no code change anywhere.
 *
 * Local space: the origin is the bottom centre of the item. x runs from -w/2
 * to w/2, y from -h up to 0, so an item stands on the floor by default.
 *
 * Each piece is built rather than outlined — a bed has a frame, a mattress, a
 * duvet with a turned-back edge and pillows with dimples; a wardrobe has doors,
 * recessed panels and handles. Light falls from the upper left everywhere, via
 * the helpers in materials.js.
 */

import {
  fillRR, fillCircle, fillEllipse, fillPoly, strokeLine, shade, worthDrawing,
} from './shapes.js';
import {
  litFill, sideLit, within, woodGrain, planks, folds, stitching, sheen, glass,
  knob, pull, panel,
} from './materials.js';
import { FACE } from '../model/board.js';

const WHITE = '#f6f1e8';
const PAPER_WHITE = '#f6f1e8';
const GLASS = '#c2d9e2';
const DARK = '#423d4d';
const METAL = '#a8a49c';

/** A tapered leg, wider at the top like a real one. */
function leg(ctx, x, top, bottom, width, color) {
  fillPoly(ctx, [
    x - width / 2, top, x + width / 2, top,
    x + width * 0.34, bottom, x - width * 0.34, bottom,
  ], color);
}

function legs(ctx, w, h, color, inset = 0.12, thickness = 0.07) {
  const lw = w * thickness;
  leg(ctx, -w / 2 + w * inset + lw / 2, -h, 0, lw, color);
  leg(ctx, w / 2 - w * inset - lw / 2, -h, 0, lw, color);
}

/** A soft contact shadow, so an object sits on the floor instead of floating. */
function groundShadow(ctx, w, spread = 0.46) {
  ctx.save();
  ctx.globalAlpha = 0.17;
  fillEllipse(ctx, 0, -2, w * spread, 7, '#000');
  ctx.restore();
}

/** A plumped cushion: rounded, creased, and dimpled at the centre. */
function cushionShape(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = litFill(ctx, y, h, color, 0.16);
  fillRR(ctx, x, y, w, h, r, ctx.fillStyle);
  folds(ctx, x, y, w, h, color, 2);
  fillEllipse(ctx, x + w / 2, y + h / 2, w * 0.06, h * 0.08, shade(color, -0.16));
}

export const PLACEHOLDERS = {
  // ---------------------------------------------------------------- sleep

  bed_single(ctx, w, h, c) {
    const wood = shade(c, -0.42);
    groundShadow(ctx, w);
    leg(ctx, -w / 2 + 10, -h * 0.18, 0, 12, shade(wood, -0.2));
    leg(ctx, w / 2 - 10, -h * 0.18, 0, 12, shade(wood, -0.2));

    // Headboard, with a panel so it is not a plain slab.
    fillRR(ctx, -w / 2, -h, w * 0.11, h * 0.94, 7, sideLit(ctx, -w / 2, w * 0.11, wood));
    panel(ctx, -w / 2 + 3, -h * 0.94, w * 0.11 - 6, h * 0.42, wood, 4);

    // Base and mattress.
    fillRR(ctx, -w / 2 + w * 0.04, -h * 0.44, w * 0.96, h * 0.32, 6,
      litFill(ctx, -h * 0.44, h * 0.32, wood, 0.1));
    woodGrain(ctx, -w / 2 + w * 0.04, -h * 0.44, w * 0.96, h * 0.32, wood, 2);
    fillRR(ctx, -w / 2 + w * 0.06, -h * 0.62, w * 0.92, h * 0.22, 8,
      litFill(ctx, -h * 0.62, h * 0.22, WHITE, 0.08));
    stitching(ctx, -w / 2 + w * 0.08, -h * 0.52, w / 2 - w * 0.04, -h * 0.52, WHITE);

    // Duvet with a turned-back top edge.
    fillRR(ctx, -w / 2 + w * 0.3, -h * 0.68, w * 0.68, h * 0.3, 9,
      litFill(ctx, -h * 0.68, h * 0.3, c, 0.15));
    folds(ctx, -w / 2 + w * 0.3, -h * 0.68, w * 0.68, h * 0.3, c, 3);
    fillRR(ctx, -w / 2 + w * 0.3, -h * 0.72, w * 0.16, h * 0.12, 6, shade(c, 0.32));

    // Pillow, tilted against the headboard.
    ctx.save();
    ctx.translate(-w / 2 + w * 0.2, -h * 0.68);
    ctx.rotate(-0.09);
    cushionShape(ctx, -w * 0.1, 0, w * 0.22, h * 0.19, 8, WHITE);
    ctx.restore();
  },

  bed_double(ctx, w, h, c) {
    PLACEHOLDERS.bed_single(ctx, w, h, c);
    ctx.save();
    ctx.translate(-w / 2 + w * 0.42, -h * 0.68);
    ctx.rotate(0.07);
    cushionShape(ctx, -w * 0.09, 0, w * 0.2, h * 0.18, 8, WHITE);
    ctx.restore();
  },

  bunk_bed(ctx, w, h, c) {
    const wood = shade(c, -0.45);
    const post = w * 0.075;
    groundShadow(ctx, w);

    for (const px of [-w / 2, w / 2 - post]) {
      fillRR(ctx, px, -h, post, h, 5, sideLit(ctx, px, post, wood, 0.16));
      woodGrain(ctx, px, -h, post, h, wood, 5);
    }

    for (const y of [-h * 0.44, -h]) {
      fillRR(ctx, -w / 2, y, w, h * 0.075, 4, litFill(ctx, y, h * 0.075, wood, 0.12));
      fillRR(ctx, -w / 2 + post, y - h * 0.115, w - post * 2, h * 0.12, 7, WHITE);
      fillRR(ctx, -w / 2 + w * 0.3, y - h * 0.135, w * 0.58, h * 0.14, 7,
        litFill(ctx, y - h * 0.135, h * 0.14, c, 0.14));
      folds(ctx, -w / 2 + w * 0.3, y - h * 0.135, w * 0.58, h * 0.14, c, 3);
      cushionShape(ctx, -w / 2 + post + 6, y - h * 0.125, w * 0.2, h * 0.11, 6, WHITE);
    }

    // Ladder up the right-hand side.
    for (let i = 0; i < 4; i += 1) {
      const ry = -h * 0.1 - i * h * 0.1;
      fillRR(ctx, w / 2 - post - w * 0.14, ry, w * 0.14, 5, 2.5, shade(wood, 0.12));
    }
  },

  crib(ctx, w, h, c) {
    const wood = shade(c, -0.28);
    groundShadow(ctx, w * 0.9);
    fillRR(ctx, -w / 2, -h * 0.36, w, h * 0.32, 8, litFill(ctx, -h * 0.36, h * 0.32, wood, 0.1));

    for (let i = 0; i <= 6; i += 1) {
      const x = -w / 2 + w * 0.06 + (w * 0.88 * i) / 6;
      fillRR(ctx, x, -h, w * 0.045, h * 0.68, 3, sideLit(ctx, x, w * 0.045, c, 0.2));
    }
    fillRR(ctx, -w / 2, -h, w, h * 0.085, 4, litFill(ctx, -h, h * 0.085, c, 0.16));
    fillRR(ctx, -w / 2, -h * 0.36, w, h * 0.05, 3, shade(c, 0.1));

    fillRR(ctx, -w / 2 + w * 0.08, -h * 0.46, w * 0.84, h * 0.12, 6, WHITE);
    fillRR(ctx, -w / 2 + w * 0.14, -h * 0.5, w * 0.5, h * 0.1, 5,
      litFill(ctx, -h * 0.5, h * 0.1, shade(c, 0.28), 0.1));
    leg(ctx, -w / 2 + 12, -h * 0.06, 0, 10, shade(wood, -0.2));
    leg(ctx, w / 2 - 12, -h * 0.06, 0, 10, shade(wood, -0.2));
  },

  cushion(ctx, w, h, c) {
    groundShadow(ctx, w * 0.9, 0.42);
    cushionShape(ctx, -w / 2, -h, w, h, h * 0.42, c);
    stitching(ctx, -w / 2 + 5, -h * 0.5, w / 2 - 5, -h * 0.5, c);
    for (const x of [-w / 2 + 4, w / 2 - 4]) fillCircle(ctx, x, -h * 0.5, 3, shade(c, -0.25));
  },

  // ------------------------------------------------------------------ sit

  sofa(ctx, w, h, c) {
    groundShadow(ctx, w);
    legs(ctx, w, h * 0.11, shade(c, -0.55), 0.09, 0.05);

    // Back, then arms, then seat cushions in front of both.
    fillRR(ctx, -w / 2, -h, w, h * 0.66, 20, litFill(ctx, -h, h * 0.66, c, 0.14));
    for (let i = 0; i < 2; i += 1) {
      const bx = -w / 2 + w * 0.19 + i * w * 0.31;
      cushionShape(ctx, bx, -h * 0.94, w * 0.29, h * 0.4, 12, shade(c, 0.1));
    }

    fillRR(ctx, -w / 2, -h * 0.62, w * 0.17, h * 0.51, 13,
      sideLit(ctx, -w / 2, w * 0.17, shade(c, -0.1), 0.16));
    fillRR(ctx, w / 2 - w * 0.17, -h * 0.62, w * 0.17, h * 0.51, 13,
      sideLit(ctx, w / 2 - w * 0.17, w * 0.17, shade(c, -0.12), 0.16));

    for (let i = 0; i < 2; i += 1) {
      const sx = -w / 2 + w * 0.18 + i * w * 0.32;
      cushionShape(ctx, sx, -h * 0.52, w * 0.31, h * 0.24, 10, shade(c, 0.06));
    }
    stitching(ctx, -w / 2 + w * 0.18, -h * 0.28, w / 2 - w * 0.18, -h * 0.28, c);
  },

  armchair(ctx, w, h, c) {
    groundShadow(ctx, w);
    legs(ctx, w, h * 0.12, shade(c, -0.55), 0.12, 0.07);
    fillRR(ctx, -w / 2, -h, w, h * 0.64, 18, litFill(ctx, -h, h * 0.64, c, 0.14));
    cushionShape(ctx, -w / 2 + w * 0.19, -h * 0.93, w * 0.62, h * 0.38, 12, shade(c, 0.1));
    fillRR(ctx, -w / 2, -h * 0.6, w * 0.21, h * 0.48, 12,
      sideLit(ctx, -w / 2, w * 0.21, shade(c, -0.1), 0.16));
    fillRR(ctx, w / 2 - w * 0.21, -h * 0.6, w * 0.21, h * 0.48, 12,
      sideLit(ctx, w / 2 - w * 0.21, w * 0.21, shade(c, -0.12), 0.16));
    cushionShape(ctx, -w / 2 + w * 0.18, -h * 0.5, w * 0.64, h * 0.24, 10, shade(c, 0.06));
  },

  chair(ctx, w, h, c) {
    const wood = shade(c, -0.05);
    groundShadow(ctx, w * 0.9);
    legs(ctx, w, h * 0.46, shade(wood, -0.3), 0.1, 0.09);
    strokeLine(ctx, -w * 0.3, -h * 0.2, w * 0.3, -h * 0.2, shade(wood, -0.35), 4);

    // Back with two slats.
    fillRR(ctx, -w / 2 + w * 0.08, -h, w * 0.09, h * 0.58, 4, sideLit(ctx, 0, w, wood, 0.18));
    fillRR(ctx, w / 2 - w * 0.17, -h, w * 0.09, h * 0.58, 4, sideLit(ctx, 0, w, wood, 0.18));
    fillRR(ctx, -w / 2 + w * 0.05, -h, w * 0.9, h * 0.1, 5, litFill(ctx, -h, h * 0.1, wood, 0.16));
    fillRR(ctx, -w / 2 + w * 0.05, -h * 0.72, w * 0.9, h * 0.07, 4, shade(wood, -0.08));

    fillRR(ctx, -w / 2, -h * 0.5, w, h * 0.11, 5, litFill(ctx, -h * 0.5, h * 0.11, wood, 0.14));
    woodGrain(ctx, -w / 2, -h * 0.5, w, h * 0.11, wood, 1);
  },

  stool(ctx, w, h, c) {
    groundShadow(ctx, w * 0.9);
    legs(ctx, w, h * 0.78, shade(c, -0.3), 0.14, 0.11);
    strokeLine(ctx, -w * 0.28, -h * 0.3, w * 0.28, -h * 0.3, shade(c, -0.38), 4);
    fillRR(ctx, -w / 2, -h, w, h * 0.24, 8, litFill(ctx, -h, h * 0.24, c, 0.16));
    woodGrain(ctx, -w / 2, -h, w, h * 0.24, c, 2);
  },

  beanbag(ctx, w, h, c) {
    groundShadow(ctx, w * 0.92, 0.5);
    ctx.fillStyle = litFill(ctx, -h, h, c, 0.16);
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, 0);
    ctx.bezierCurveTo(-w * 0.56, -h * 0.5, -w * 0.34, -h * 0.72, -w * 0.1, -h * 0.72);
    ctx.bezierCurveTo(w * 0.2, -h * 0.72, w * 0.36, -h * 0.5, w * 0.48, -h * 0.16);
    ctx.bezierCurveTo(w * 0.5, -h * 0.04, w * 0.3, 0, 0, 0);
    ctx.closePath();
    ctx.fill();
    folds(ctx, -w * 0.4, -h * 0.6, w * 0.8, h * 0.5, c, 3);
    stitching(ctx, -w * 0.42, -h * 0.28, w * 0.44, -h * 0.2, c);
  },

  // ---------------------------------------------------------------- table

  table_dining(ctx, w, h, c) {
    groundShadow(ctx, w);
    legs(ctx, w, h * 0.85, shade(c, -0.28), 0.09, 0.075);
    strokeLine(ctx, -w * 0.36, -h * 0.28, w * 0.36, -h * 0.28, shade(c, -0.35), 5);
    fillRR(ctx, -w / 2, -h, w, h * 0.13, 5, litFill(ctx, -h, h * 0.13, c, 0.16));
    fillRR(ctx, -w / 2, -h * 0.87, w, h * 0.05, 3, shade(c, -0.18));
    woodGrain(ctx, -w / 2, -h, w, h * 0.13, c, 2);
  },

  table_coffee(ctx, w, h, c) {
    groundShadow(ctx, w);
    legs(ctx, w, h * 0.78, shade(c, -0.28), 0.08, 0.065);
    fillRR(ctx, -w / 2, -h, w, h * 0.18, 5, litFill(ctx, -h, h * 0.18, c, 0.16));
    woodGrain(ctx, -w / 2, -h, w, h * 0.18, c, 2);
    fillRR(ctx, -w / 2 + w * 0.08, -h * 0.42, w * 0.84, h * 0.08, 3, shade(c, -0.22));
    // A magazine left on the shelf.
    fillRR(ctx, -w * 0.24, -h * 0.5, w * 0.28, h * 0.07, 2, '#d98a4e');
  },

  desk(ctx, w, h, c) {
    groundShadow(ctx, w);
    fillRR(ctx, -w / 2 + w * 0.06, -h * 0.86, w * 0.06, h * 0.86, 3, shade(c, -0.3));
    fillRR(ctx, 0, -h * 0.86, w * 0.44, h * 0.86, 5,
      litFill(ctx, -h * 0.86, h * 0.86, shade(c, -0.12), 0.1));
    for (let i = 0; i < 3; i += 1) {
      const dy = -h * 0.8 + i * h * 0.26;
      panel(ctx, w * 0.03, dy, w * 0.38, h * 0.2, shade(c, 0.1), 5);
      pull(ctx, w * 0.22, dy + h * 0.1, w * 0.16, METAL);
    }
    fillRR(ctx, -w / 2, -h, w, h * 0.12, 5, litFill(ctx, -h, h * 0.12, c, 0.16));
    woodGrain(ctx, -w / 2, -h, w, h * 0.12, c, 2);
  },

  nightstand(ctx, w, h, c) {
    groundShadow(ctx, w * 0.92);
    legs(ctx, w, h * 0.16, shade(c, -0.38), 0.14, 0.08);
    fillRR(ctx, -w / 2, -h, w, h * 0.86, 6, litFill(ctx, -h, h * 0.86, c, 0.12));
    panel(ctx, -w / 2 + w * 0.1, -h * 0.76, w * 0.8, h * 0.26, c, 5);
    pull(ctx, 0, -h * 0.63, w * 0.34, METAL);
    panel(ctx, -w / 2 + w * 0.1, -h * 0.44, w * 0.8, h * 0.26, c, 5);
    pull(ctx, 0, -h * 0.31, w * 0.34, METAL);
    fillRR(ctx, -w / 2 - 3, -h - 4, w + 6, h * 0.06, 3, litFill(ctx, -h - 4, h * 0.06, c, 0.2));
  },

  // ---------------------------------------------------------------- store

  wardrobe(ctx, w, h, c) {
    groundShadow(ctx, w);
    fillRR(ctx, -w / 2, -h, w, h, 8, litFill(ctx, -h, h, c, 0.1));
    fillRR(ctx, -w / 2 - 4, -h - 5, w + 8, h * 0.045, 4,
      litFill(ctx, -h - 5, h * 0.045, c, 0.24));

    panel(ctx, -w / 2 + w * 0.05, -h * 0.93, w * 0.43, h * 0.86, c, 8);
    panel(ctx, w * 0.02, -h * 0.93, w * 0.43, h * 0.86, c, 8);
    knob(ctx, -w * 0.045, -h * 0.5, 5, METAL);
    knob(ctx, w * 0.045, -h * 0.5, 5, METAL);
    leg(ctx, -w / 2 + 14, -h * 0.04, 0, 12, shade(c, -0.4));
    leg(ctx, w / 2 - 14, -h * 0.04, 0, 12, shade(c, -0.4));
  },

  bookshelf(ctx, w, h, c) {
    groundShadow(ctx, w);
    fillRR(ctx, -w / 2, -h, w, h, 6, litFill(ctx, -h, h, c, 0.08));
    // Interior, so shelves read as recessed.
    ctx.fillStyle = shade(c, -0.3);
    ctx.fillRect(-w / 2 + w * 0.05, -h * 0.96, w * 0.9, h * 0.92);

    const books = ['#c9707f', '#5c8fae', '#7d9e62', '#d9a24e', '#8a6d9e', '#4f9695'];
    // A book on a shelf is about a sixteenth of its width. Below three real
    // pixels each they are a stripe of colour however carefully they are drawn.
    const shelved = worthDrawing(ctx, w * 0.06);
    for (let row = 0; row < 3; row += 1) {
      const y = -h * 0.9 + row * h * 0.3;
      const shelfH = h * 0.24;
      let x = -w / 2 + w * 0.09;
      let i = row * 2;
      /*
       * Fewer, fatter books when they are small.
       *
       * A shelf drawn as one band of colour is a cupboard with paper in it —
       * the books are what a bookshelf is. So below the size where a spine can
       * be told from its neighbour they are drawn twice as wide and half as
       * many, which keeps a row of books and halves the painting.
       */
      const fat = shelved ? 1 : 2.1;
      while (x < w / 2 - w * 0.12) {
        const bw = w * (0.055 + ((i * 7) % 3) * 0.012) * fat;
        const bh = shelfH * (0.74 + ((i * 5) % 4) * 0.06);
        const col = books[i % books.length];
        fillRR(ctx, x, y + shelfH - bh, bw, bh, 2, sideLit(ctx, x, bw, col, 0.18));
        if (shelved) fillRR(ctx, x, y + shelfH - bh * 0.78, bw, 2.5, 1, shade(col, 0.4));
        x += bw + 2;
        i += 1;
      }
      fillRR(ctx, -w / 2 + w * 0.05, y + shelfH, w * 0.9, h * 0.035, 2,
        litFill(ctx, y + shelfH, h * 0.035, c, 0.16));
    }
  },

  dresser(ctx, w, h, c) {
    groundShadow(ctx, w);
    legs(ctx, w, h * 0.13, shade(c, -0.4), 0.11, 0.07);
    fillRR(ctx, -w / 2, -h, w, h * 0.87, 6, litFill(ctx, -h, h * 0.87, c, 0.1));
    fillRR(ctx, -w / 2 - 4, -h - 4, w + 8, h * 0.05, 3, litFill(ctx, -h - 4, h * 0.05, c, 0.22));
    for (let i = 0; i < 3; i += 1) {
      const y = -h * 0.78 + i * h * 0.24;
      panel(ctx, -w / 2 + w * 0.07, y, w * 0.86, h * 0.19, c, 5);
      pull(ctx, 0, y + h * 0.095, w * 0.3, METAL);
    }
  },

  toybox(ctx, w, h, c) {
    groundShadow(ctx, w);
    fillRR(ctx, -w / 2, -h * 0.76, w, h * 0.76, 7, litFill(ctx, -h * 0.76, h * 0.76, c, 0.12));
    planks(ctx, -w / 2, -h * 0.76, w, h * 0.76, c, 4, true);
    fillRR(ctx, -w / 2 - w * 0.03, -h, w * 1.06, h * 0.26, 7,
      litFill(ctx, -h, h * 0.26, shade(c, -0.14), 0.16));
    knob(ctx, 0, -h * 0.87, 6, METAL);
    // Toys spilling over the rim.
    fillCircle(ctx, -w * 0.22, -h * 0.38, w * 0.09, '#dcb85c');
    fillCircle(ctx, w * 0.14, -h * 0.4, w * 0.1, '#5c8fae');
    fillPoly(ctx, [w * 0.3, -h * 0.3, w * 0.4, -h * 0.5, w * 0.46, -h * 0.3], '#c9707f');
  },

  // -------------------------------------------------------------- kitchen

  fridge(ctx, w, h, c) {
    groundShadow(ctx, w);
    fillRR(ctx, -w / 2, -h, w, h, 12, litFill(ctx, -h, h, c, 0.12));
    sheen(ctx, -w / 2, -h, w, h, 0.16);
    // Door seam, then the two doors as slightly proud panels.
    ctx.fillStyle = shade(c, -0.28);
    ctx.fillRect(-w / 2 + 5, -h * 0.63, w - 10, 3);
    fillRR(ctx, -w / 2 + 5, -h + 5, w - 10, h * 0.36, 8, shade(c, 0.05));
    fillRR(ctx, -w / 2 + 5, -h * 0.6, w - 10, h * 0.57, 8, shade(c, 0.03));

    fillRR(ctx, w * 0.19, -h * 0.92, w * 0.07, h * 0.2, 3.5, METAL);
    fillRR(ctx, w * 0.19, -h * 0.55, w * 0.07, h * 0.3, 3.5, METAL);
    fillRR(ctx, -w * 0.3, -h * 0.86, w * 0.17, h * 0.11, 2, '#c9707f');
    fillCircle(ctx, -w * 0.3, -h * 0.5, 4, '#dcb85c');
  },

  stove(ctx, w, h, c) {
    groundShadow(ctx, w);
    fillRR(ctx, -w / 2, -h, w, h, 7, litFill(ctx, -h, h, c, 0.1));
    // Oven door with a glass window.
    fillRR(ctx, -w / 2 + w * 0.07, -h * 0.62, w * 0.86, h * 0.44, 6, shade(c, -0.12));
    glass(ctx, -w / 2 + w * 0.13, -h * 0.56, w * 0.74, h * 0.3, 4, '#5a5560');
    pull(ctx, 0, -h * 0.68, w * 0.6, METAL);
    // Hob with four rings.
    fillRR(ctx, -w / 2 + 4, -h, w - 8, h * 0.24, 5, shade(c, -0.2));
    for (const [dx, dy, r] of [[-0.22, 0.9, 0.1], [0.22, 0.9, 0.1],
      [-0.22, 0.79, 0.075], [0.22, 0.79, 0.075]]) {
      fillCircle(ctx, w * dx, -h * dy, w * r, shade(c, -0.42));
      fillCircle(ctx, w * dx, -h * dy, w * r * 0.6, shade(c, -0.25));
    }
  },

  counter(ctx, w, h, c) {
    groundShadow(ctx, w);
    fillRR(ctx, -w / 2, -h * 0.82, w, h * 0.82, 5, litFill(ctx, -h * 0.82, h * 0.82, c, 0.1));
    panel(ctx, -w / 2 + w * 0.06, -h * 0.68, w * 0.4, h * 0.5, c, 6);
    panel(ctx, w * 0.04, -h * 0.68, w * 0.4, h * 0.5, c, 6);
    knob(ctx, -w * 0.06, -h * 0.44, 4.5, METAL);
    knob(ctx, w * 0.06, -h * 0.44, 4.5, METAL);
    // Worktop with a lip.
    fillRR(ctx, -w / 2 - w * 0.02, -h, w * 1.04, h * 0.16, 4,
      litFill(ctx, -h, h * 0.16, shade(c, -0.3), 0.18));
    fillRR(ctx, -w / 2 - w * 0.02, -h, w * 1.04, 4, 2, shade(c, 0.2));
  },

  sink_kitchen(ctx, w, h, c) {
    groundShadow(ctx, w);
    fillRR(ctx, -w / 2, -h * 0.8, w, h * 0.8, 5, litFill(ctx, -h * 0.8, h * 0.8, shade(c, -0.18), 0.1));
    panel(ctx, -w / 2 + w * 0.08, -h * 0.66, w * 0.84, h * 0.46, shade(c, -0.1), 6);
    fillRR(ctx, -w / 2, -h, w, h * 0.22, 4, litFill(ctx, -h, h * 0.22, c, 0.14));
    // Basin, sunk into the top.
    fillRR(ctx, -w * 0.3, -h * 0.98, w * 0.6, h * 0.15, 5, shade(c, -0.3));
    glass(ctx, -w * 0.28, -h * 0.96, w * 0.56, h * 0.11, 4, GLASS);
    fillCircle(ctx, 0, -h * 0.9, 4, shade(c, -0.4));
    strokeLine(ctx, w * 0.3, -h * 0.98, w * 0.3, -h * 1.22, METAL, 6);
    strokeLine(ctx, w * 0.3, -h * 1.22, w * 0.06, -h * 1.22, METAL, 6);
    fillCircle(ctx, w * 0.06, -h * 1.2, 3.5, METAL);
  },

  // ----------------------------------------------------------------- bath

  toilet(ctx, w, h, c) {
    groundShadow(ctx, w * 0.8);
    fillRR(ctx, -w / 2 + w * 0.12, -h, w * 0.76, h * 0.44, 7,
      litFill(ctx, -h, h * 0.44, c, 0.1));
    fillRR(ctx, -w / 2 + w * 0.2, -h * 0.99, w * 0.6, h * 0.06, 3, shade(c, -0.14));
    knob(ctx, w * 0.24, -h * 0.9, 4, METAL);
    // Pan, seat and lid.
    fillPoly(ctx, [-w * 0.2, -h * 0.56, w * 0.2, -h * 0.56, w * 0.16, 0, -w * 0.16, 0],
      shade(c, -0.08));
    fillEllipse(ctx, 0, -h * 0.35, w * 0.42, h * 0.13, litFill(ctx, -h * 0.48, h * 0.26, c, 0.12));
    fillEllipse(ctx, 0, -h * 0.34, w * 0.3, h * 0.085, shade(c, -0.3));
    fillEllipse(ctx, 0, -h * 0.36, w * 0.26, h * 0.06, GLASS);
  },

  bathtub(ctx, w, h, c) {
    groundShadow(ctx, w);
    fillRR(ctx, -w / 2, -h * 0.78, w, h * 0.78, 24, litFill(ctx, -h * 0.78, h * 0.78, c, 0.12));
    fillRR(ctx, -w / 2 + w * 0.04, -h * 0.74, w * 0.92, h * 0.52, 19, shade(c, -0.22));
    glass(ctx, -w / 2 + w * 0.05, -h * 0.68, w * 0.9, h * 0.42, 17, GLASS);
    // Suds and a couple of bubbles.
    fillEllipse(ctx, -w * 0.18, -h * 0.6, w * 0.12, h * 0.055, WHITE);
    fillEllipse(ctx, w * 0.06, -h * 0.64, w * 0.09, h * 0.045, WHITE);
    fillCircle(ctx, w * 0.24, -h * 0.72, w * 0.028, WHITE);
    fillCircle(ctx, -w * 0.3, -h * 0.75, w * 0.02, WHITE);
    strokeLine(ctx, -w * 0.44, -h * 0.8, -w * 0.44, -h * 0.95, METAL, 5);
    leg(ctx, -w * 0.36, -h * 0.16, 0, 12, shade(c, -0.35));
    leg(ctx, w * 0.36, -h * 0.16, 0, 12, shade(c, -0.35));
  },

  sink_bath(ctx, w, h, c) {
    groundShadow(ctx, w * 0.75);
    fillPoly(ctx, [-w * 0.15, -h * 0.66, w * 0.15, -h * 0.66, w * 0.11, 0, -w * 0.11, 0],
      shade(c, -0.12));
    fillRR(ctx, -w / 2, -h, w, h * 0.34, 11, litFill(ctx, -h, h * 0.34, c, 0.14));
    fillEllipse(ctx, 0, -h * 0.87, w * 0.34, h * 0.085, shade(c, -0.28));
    glass(ctx, -w * 0.3, -h * 0.92, w * 0.6, h * 0.1, 6, GLASS);
    fillCircle(ctx, 0, -h * 0.86, 3.5, METAL);
    strokeLine(ctx, 0, -h, 0, -h * 1.14, METAL, 6);
    strokeLine(ctx, 0, -h * 1.14, 0, -h * 1.1, METAL, 6);
    fillCircle(ctx, 0, -h * 1.15, 4, METAL);
  },

  shower(ctx, w, h, c) {
    groundShadow(ctx, w);
    fillRR(ctx, -w / 2, -h, w, h, 8, shade(c, 0.42));
    glass(ctx, -w / 2 + 8, -h + 8, w - 16, h - 24, 5, c);
    // Door edge and handle.
    strokeLine(ctx, w * 0.06, -h + 14, w * 0.06, -h * 0.14, shade(c, 0.6), 3.5);
    fillRR(ctx, -w * 0.16, -h * 0.46, w * 0.06, h * 0.09, 3, METAL);
    // Tray, with a step.
    fillRR(ctx, -w / 2, -h * 0.13, w, h * 0.13, 5,
      litFill(ctx, -h * 0.13, h * 0.13, shade(c, -0.34), 0.14));
    fillRR(ctx, -w / 2, -h * 0.13, w, 4, 2, shade(c, 0.2));
    // Head and spray.
    fillRR(ctx, -w * 0.3, -h * 0.95, w * 0.28, h * 0.028, 3, METAL);
    strokeLine(ctx, -w * 0.16, -h * 0.95, -w * 0.16, -h, METAL, 5);
    for (let i = 0; i < 5; i += 1) {
      const x = -w * 0.29 + i * w * 0.065;
      strokeLine(ctx, x, -h * 0.92, x - w * 0.015, -h * 0.74, WHITE, 2.4);
    }
  },

  // ---------------------------------------------------------------- decor

  lamp_floor(ctx, w, h, c) {
    groundShadow(ctx, w * 0.7, 0.42);
    fillEllipse(ctx, 0, -h * 0.02, w * 0.3, h * 0.028, shade(METAL, -0.2));
    fillEllipse(ctx, 0, -h * 0.035, w * 0.28, h * 0.022, METAL);
    strokeLine(ctx, 0, -h * 0.7, 0, -h * 0.04, METAL, 5);
    ctx.fillStyle = litFill(ctx, -h, h * 0.3, c, 0.2);
    fillPoly(ctx, [-w * 0.42, -h * 0.7, w * 0.42, -h * 0.7, w * 0.26, -h, -w * 0.26, -h],
      ctx.fillStyle);
    fillRR(ctx, -w * 0.42, -h * 0.72, w * 0.84, 4, 2, shade(c, -0.2));
    // Light pooling out of the bottom of the shade.
    ctx.save();
    ctx.globalAlpha = 0.3;
    fillPoly(ctx, [-w * 0.42, -h * 0.7, w * 0.42, -h * 0.7, w * 0.62, -h * 0.4, -w * 0.62, -h * 0.4],
      '#f7e6b8');
    ctx.restore();
  },

  lamp_table(ctx, w, h, c) {
    groundShadow(ctx, w * 0.7, 0.4);
    fillEllipse(ctx, 0, -h * 0.05, w * 0.3, h * 0.045, METAL);
    strokeLine(ctx, 0, -h * 0.6, 0, -h * 0.07, METAL, 4.5);
    ctx.fillStyle = litFill(ctx, -h, h * 0.4, c, 0.2);
    fillPoly(ctx, [-w * 0.44, -h * 0.62, w * 0.44, -h * 0.62, w * 0.26, -h, -w * 0.26, -h],
      ctx.fillStyle);
    fillRR(ctx, -w * 0.44, -h * 0.64, w * 0.88, 4, 2, shade(c, -0.2));
  },

  plant_tall(ctx, w, h, c) {
    groundShadow(ctx, w * 0.7);
    // Pot with a rim.
    ctx.fillStyle = litFill(ctx, -h * 0.3, h * 0.3, '#b5734c', 0.14);
    fillPoly(ctx, [-w * 0.24, -h * 0.28, w * 0.24, -h * 0.28, w * 0.18, 0, -w * 0.18, 0],
      ctx.fillStyle);
    fillRR(ctx, -w * 0.27, -h * 0.32, w * 0.54, h * 0.06, 3,
      litFill(ctx, -h * 0.32, h * 0.06, '#c4825a', 0.16));
    fillEllipse(ctx, 0, -h * 0.29, w * 0.22, h * 0.018, '#4a3a2e');

    strokeLine(ctx, 0, -h * 0.3, 0, -h * 0.82, shade(c, -0.35), 6);
    // Leaves alternating up the stem, each with a midrib.
    const leaf = (x, y, rx, ry, tilt, col) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      fillEllipse(ctx, 0, 0, rx, ry, col);
      strokeLine(ctx, -rx * 0.8, 0, rx * 0.8, 0, shade(col, -0.22), 1.8);
      ctx.restore();
    };
    leaf(-w * 0.22, -h * 0.6, w * 0.24, h * 0.05, -0.3, c);
    leaf(w * 0.22, -h * 0.68, w * 0.24, h * 0.05, 0.3, shade(c, -0.08));
    leaf(-w * 0.17, -h * 0.79, w * 0.2, h * 0.045, -0.4, shade(c, 0.12));
    leaf(w * 0.15, -h * 0.87, w * 0.2, h * 0.045, 0.4, shade(c, 0.08));
    leaf(0, -h * 0.95, w * 0.15, h * 0.04, 0, c);
  },

  plant_small(ctx, w, h, c) {
    groundShadow(ctx, w * 0.65);
    ctx.fillStyle = litFill(ctx, -h * 0.42, h * 0.42, '#b5734c', 0.14);
    fillPoly(ctx, [-w * 0.3, -h * 0.4, w * 0.3, -h * 0.4, w * 0.22, 0, -w * 0.22, 0],
      ctx.fillStyle);
    fillRR(ctx, -w * 0.33, -h * 0.45, w * 0.66, h * 0.08, 3, '#c4825a');
    fillCircle(ctx, -w * 0.16, -h * 0.6, w * 0.2, shade(c, -0.06));
    fillCircle(ctx, w * 0.16, -h * 0.58, w * 0.18, shade(c, 0.14));
    fillCircle(ctx, 0, -h * 0.78, w * 0.22, c);
    fillCircle(ctx, -w * 0.06, -h * 0.82, w * 0.07, shade(c, 0.28));
  },

  tv(ctx, w, h, c) {
    groundShadow(ctx, w * 0.7);
    fillRR(ctx, -w * 0.18, -h * 0.18, w * 0.36, h * 0.1, 3, shade(c, -0.2));
    fillRR(ctx, -w * 0.06, -h * 0.3, w * 0.12, h * 0.14, 3, shade(c, -0.1));
    fillRR(ctx, -w / 2, -h, w, h * 0.72, 7, litFill(ctx, -h, h * 0.72, c, 0.12));
    // Screen, with a picture on it.
    const sx = -w / 2 + 9;
    const sy = -h + 9;
    const sw = w - 18;
    const sh = h * 0.72 - 18;
    fillRR(ctx, sx, sy, sw, sh, 4, '#8fb8c4');
    within(ctx, sx, sy, sw, sh, () => {
      fillRR(ctx, sx, sy + sh * 0.62, sw, sh * 0.4, 0, '#7d9e62');
      fillCircle(ctx, sx + sw * 0.24, sy + sh * 0.3, sh * 0.16, '#f0c86a');
      fillPoly(ctx, [sx + sw * 0.52, sy + sh * 0.66, sx + sw * 0.7, sy + sh * 0.22,
        sx + sw * 0.88, sy + sh * 0.66], '#a8c4d4');
    });
    sheen(ctx, sx, sy, sw, sh, 0.22);
  },

  rug_round(ctx, w, h, c) {
    ctx.save();
    ctx.globalAlpha = 0.14;
    fillEllipse(ctx, 0, -h * 0.46, w * 0.5, h * 0.5, '#000');
    ctx.restore();
    fillEllipse(ctx, 0, -h * 0.5, w * 0.5, h * 0.5, c);
    fillEllipse(ctx, 0, -h * 0.5, w * 0.38, h * 0.38, shade(c, 0.2));
    fillEllipse(ctx, 0, -h * 0.5, w * 0.26, h * 0.26, c);
    fillEllipse(ctx, 0, -h * 0.5, w * 0.12, h * 0.12, shade(c, 0.3));
    // Fringe at both ends.
    for (let i = 0; i < 9; i += 1) {
      const a = Math.PI + (i / 8) * Math.PI;
      strokeLine(ctx, Math.cos(a) * w * 0.5, -h * 0.5 + Math.sin(a) * h * 0.5,
        Math.cos(a) * w * 0.55, -h * 0.5 + Math.sin(a) * h * 0.62, shade(c, 0.35), 2);
    }
  },

  teddy(ctx, w, h, c) {
    groundShadow(ctx, w * 0.7, 0.42);
    fillCircle(ctx, -w * 0.28, -h * 0.78, w * 0.15, shade(c, -0.12));
    fillCircle(ctx, w * 0.28, -h * 0.78, w * 0.15, shade(c, -0.12));
    fillCircle(ctx, -w * 0.28, -h * 0.78, w * 0.08, shade(c, 0.3));
    fillCircle(ctx, w * 0.28, -h * 0.78, w * 0.08, shade(c, 0.3));
    fillEllipse(ctx, -w * 0.3, -h * 0.34, w * 0.13, h * 0.1, shade(c, -0.08));
    fillEllipse(ctx, w * 0.3, -h * 0.34, w * 0.13, h * 0.1, shade(c, -0.08));
    fillEllipse(ctx, 0, -h * 0.26, w * 0.34, h * 0.26, litFill(ctx, -h * 0.5, h * 0.5, c, 0.12));
    fillEllipse(ctx, 0, -h * 0.22, w * 0.2, h * 0.14, shade(c, 0.22));
    fillCircle(ctx, 0, -h * 0.68, w * 0.32, litFill(ctx, -h, h * 0.64, c, 0.14));
    fillEllipse(ctx, 0, -h * 0.6, w * 0.15, h * 0.09, shade(c, 0.3));
    fillCircle(ctx, -w * 0.11, -h * 0.73, w * 0.045, DARK);
    fillCircle(ctx, w * 0.11, -h * 0.73, w * 0.045, DARK);
    fillEllipse(ctx, 0, -h * 0.63, w * 0.05, h * 0.03, DARK);
    strokeLine(ctx, 0, -h * 0.61, 0, -h * 0.57, DARK, 1.6);
  },

  /* An egg, still in its shell. */
  egg(ctx, w, h, c) {
    groundShadow(ctx, w * 0.7, 0.34);
    ctx.fillStyle = litFill(ctx, -h, h, c, 0.2);
    fillEllipse(ctx, 0, -h * 0.5, w * 0.36, h * 0.5, ctx.fillStyle);
    fillEllipse(ctx, -w * 0.1, -h * 0.66, w * 0.12, h * 0.16, shade(c, 0.5));
  },

  /* Raw steak: paler, wetter, no griddle marks yet. */
  steak_raw(ctx, w, h, c) {
    groundShadow(ctx, w * 0.9, 0.4);
    fillEllipse(ctx, 0, -h * 0.12, w * 0.5, h * 0.2, '#f6f1e8');
    ctx.fillStyle = litFill(ctx, -h * 0.6, h * 0.45, c, 0.2);
    ctx.beginPath();
    ctx.moveTo(-w * 0.3, -h * 0.3);
    ctx.quadraticCurveTo(-w * 0.34, -h * 0.62, -w * 0.02, -h * 0.6);
    ctx.quadraticCurveTo(w * 0.3, -h * 0.58, w * 0.28, -h * 0.34);
    ctx.quadraticCurveTo(w * 0.26, -h * 0.16, -w * 0.04, -h * 0.2);
    ctx.quadraticCurveTo(-w * 0.28, -h * 0.2, -w * 0.3, -h * 0.3);
    ctx.closePath();
    ctx.fill();
    // Marbling rather than sear marks.
    fillEllipse(ctx, -w * 0.1, -h * 0.44, w * 0.09, h * 0.07, shade(c, 0.34));
    fillEllipse(ctx, w * 0.12, -h * 0.36, w * 0.07, h * 0.06, shade(c, 0.3));
    fillEllipse(ctx, -w * 0.24, -h * 0.4, w * 0.05, h * 0.08, '#f0e6d2');
  },

  /* An omelette, folded, on a plate. */
  omelette(ctx, w, h, c) {
    groundShadow(ctx, w * 0.9, 0.4);
    fillEllipse(ctx, 0, -h * 0.12, w * 0.5, h * 0.2, '#f6f1e8');
    ctx.fillStyle = litFill(ctx, -h * 0.7, h * 0.55, c, 0.18);
    ctx.beginPath();
    ctx.moveTo(-w * 0.32, -h * 0.24);
    ctx.quadraticCurveTo(-w * 0.3, -h * 0.72, 0, -h * 0.7);
    ctx.quadraticCurveTo(w * 0.32, -h * 0.68, w * 0.3, -h * 0.26);
    ctx.quadraticCurveTo(0, -h * 0.14, -w * 0.32, -h * 0.24);
    ctx.closePath();
    ctx.fill();
    // The fold.
    ctx.strokeStyle = shade(c, -0.2);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.18, -h * 0.28);
    ctx.quadraticCurveTo(0, -h * 0.5, w * 0.2, -h * 0.3);
    ctx.stroke();
    fillEllipse(ctx, -w * 0.12, -h * 0.56, w * 0.07, h * 0.09, shade(c, 0.36));
  },

  /* Vegetables, waiting to be soup. */
  veg(ctx, w, h, c) {
    groundShadow(ctx, w * 0.8, 0.38);
    // A carrot, lying down.
    ctx.fillStyle = '#d9803c';
    ctx.beginPath();
    ctx.moveTo(-w * 0.42, -h * 0.34);
    ctx.lineTo(w * 0.12, -h * 0.46);
    ctx.lineTo(w * 0.12, -h * 0.22);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 3; i += 1) {
      strokeLine(ctx, w * 0.12, -h * 0.34, w * 0.34, -h * (0.5 - i * 0.12), shade(c, -0.1), 3);
    }
    // And something round and green behind it.
    ctx.fillStyle = litFill(ctx, -h * 0.9, h * 0.5, c, 0.2);
    fillEllipse(ctx, -w * 0.06, -h * 0.66, w * 0.26, h * 0.28, ctx.fillStyle);
    fillEllipse(ctx, -w * 0.14, -h * 0.74, w * 0.08, h * 0.08, shade(c, 0.4));
  },

  /* Soup, in a bowl. */
  soup(ctx, w, h, c) {
    groundShadow(ctx, w * 0.8, 0.4);
    ctx.fillStyle = litFill(ctx, -h, h, c, 0.2);
    fillEllipse(ctx, 0, -h * 0.5, w * 0.34, h * 0.16, ctx.fillStyle);
    // The bowl, over the soup so it holds it.
    ctx.fillStyle = '#f2ece0';
    ctx.beginPath();
    ctx.moveTo(-w * 0.4, -h * 0.52);
    ctx.quadraticCurveTo(-w * 0.34, -h * 0.04, 0, -h * 0.04);
    ctx.quadraticCurveTo(w * 0.34, -h * 0.04, w * 0.4, -h * 0.52);
    ctx.closePath();
    ctx.fill();
    fillEllipse(ctx, 0, -h * 0.52, w * 0.4, h * 0.1, '#fbf7f0');
    fillEllipse(ctx, 0, -h * 0.52, w * 0.33, h * 0.075, shade(c, 0.1));
    fillEllipse(ctx, -w * 0.1, -h * 0.55, w * 0.06, h * 0.03, shade(c, 0.5));
  },

  /* A boiled egg, cut in half so it is plainly not a raw one. */
  egg_boiled(ctx, w, h, c) {
    groundShadow(ctx, w * 0.7, 0.34);
    ctx.fillStyle = litFill(ctx, -h, h, c, 0.2);
    fillEllipse(ctx, 0, -h * 0.5, w * 0.36, h * 0.5, ctx.fillStyle);
    // The yolk, which is the whole difference.
    fillEllipse(ctx, 0, -h * 0.5, w * 0.17, h * 0.2, '#f0c04a');
    fillEllipse(ctx, -w * 0.04, -h * 0.56, w * 0.06, h * 0.07, '#f7dc8e');
  },

  /* A carton of milk, gable topped. */
  milk(ctx, w, h, c) {
    groundShadow(ctx, w * 0.8, 0.4);
    ctx.fillStyle = litFill(ctx, -h, h, c, 0.16);
    fillRR(ctx, -w * 0.4, -h * 0.78, w * 0.8, h * 0.78, 3, ctx.fillStyle);
    fillPoly(ctx, [-w * 0.4, -h * 0.78, w * 0.4, -h * 0.78, w * 0.16, -h, -w * 0.16, -h],
      shade(c, -0.12));
    // A blue band, so it is milk at a glance and not a plain box.
    fillRR(ctx, -w * 0.4, -h * 0.5, w * 0.8, h * 0.16, 2, '#6fa8dc');
    fillEllipse(ctx, 0, -h * 0.42, w * 0.14, h * 0.06, '#f6f2e8');
  },

  /* A carton of juice, with a straw hole and a fruit on it. */
  juice(ctx, w, h, c) {
    groundShadow(ctx, w * 0.8, 0.4);
    ctx.fillStyle = litFill(ctx, -h, h, c, 0.16);
    fillRR(ctx, -w * 0.4, -h * 0.86, w * 0.8, h * 0.86, 4, ctx.fillStyle);
    fillCircle(ctx, 0, -h * 0.56, w * 0.2, shade(c, 0.36));
    strokeLine(ctx, w * 0.22, -h * 0.88, w * 0.3, -h * 1.06, '#f6f1e8', 5);
  },

  /* A bottle of water. */
  water(ctx, w, h, c) {
    groundShadow(ctx, w * 0.7, 0.36);
    ctx.fillStyle = litFill(ctx, -h, h, c, 0.24);
    fillRR(ctx, -w * 0.36, -h * 0.72, w * 0.72, h * 0.72, 6, ctx.fillStyle);
    fillRR(ctx, -w * 0.16, -h * 0.92, w * 0.32, h * 0.24, 3, shade(c, 0.2));
    fillRR(ctx, -w * 0.2, -h, w * 0.4, h * 0.1, 3, '#6fa8dc');
    // A highlight down one side, which is what makes it read as glass.
    ctx.save();
    ctx.globalAlpha = 0.5;
    fillRR(ctx, -w * 0.26, -h * 0.64, w * 0.1, h * 0.44, 4, '#ffffff');
    ctx.restore();
  },

  /* An empty glass. What is in it is drawn over this. */
  glass(ctx, w, h, c) {
    groundShadow(ctx, w * 0.7, 0.4);
    ctx.save();
    ctx.globalAlpha = 0.5;
    fillPoly(ctx, [-w * 0.34, -h, w * 0.34, -h, w * 0.28, 0, -w * 0.28, 0], c);
    ctx.restore();
    ctx.strokeStyle = 'rgba(210, 232, 240, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h);
    ctx.lineTo(-w * 0.28, 0);
    ctx.lineTo(w * 0.28, 0);
    ctx.lineTo(w * 0.34, -h);
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.6;
    fillRR(ctx, -w * 0.24, -h * 0.9, w * 0.08, h * 0.7, 3, '#ffffff');
    ctx.restore();
  },

  /* A mug, with a handle. */
  mug(ctx, w, h, c) {
    groundShadow(ctx, w * 0.7, 0.42);
    ctx.strokeStyle = shade(c, -0.1);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(w * 0.34, -h * 0.5, h * 0.22, -1.1, 1.1);
    ctx.stroke();
    ctx.fillStyle = litFill(ctx, -h, h, c, 0.18);
    fillRR(ctx, -w * 0.36, -h * 0.86, w * 0.72, h * 0.86, 6, ctx.fillStyle);
    fillEllipse(ctx, 0, -h * 0.86, w * 0.36, h * 0.1, shade(c, 0.24));
  },

  /* A frying pan, seen from the side with its handle out. */
  pan(ctx, w, h, c) {
    groundShadow(ctx, w * 0.7, 0.5);
    ctx.fillStyle = litFill(ctx, -h, h, c, 0.16);
    fillRR(ctx, -w * 0.36, -h * 0.72, w * 0.72, h * 0.66, h * 0.24, ctx.fillStyle);
    // The rim, and the handle.
    fillRR(ctx, -w * 0.4, -h * 0.78, w * 0.8, h * 0.2, h * 0.1, shade(c, 0.26));
    fillRR(ctx, w * 0.36, -h * 0.62, w * 0.16, h * 0.16, h * 0.08, shade(c, -0.22));
  },

  /* A pot, taller, with a lid. */
  pot(ctx, w, h, c) {
    groundShadow(ctx, w * 0.7, 0.44);
    ctx.fillStyle = litFill(ctx, -h, h, c, 0.16);
    fillRR(ctx, -w * 0.34, -h * 0.72, w * 0.68, h * 0.7, 6, ctx.fillStyle);
    fillRR(ctx, -w * 0.42, -h * 0.84, w * 0.84, h * 0.16, 5, shade(c, 0.24));
    fillRR(ctx, -w * 0.06, -h * 0.96, w * 0.12, h * 0.14, 4, shade(c, -0.18));
    for (const side of [-1, 1]) {
      fillRR(ctx, side * w * 0.36, -h * 0.6, w * 0.1, h * 0.12, 4, shade(c, -0.2));
    }
  },

  /*
   * A steak on a plate.
   *
   * Drawn on its plate rather than bare, because a lump of meat on a table
   * reads as a mess and a child putting dinner out means the plate as well.
   */
  steak(ctx, w, h, c) {
    groundShadow(ctx, w * 0.9, 0.4);
    // The plate.
    fillEllipse(ctx, 0, -h * 0.12, w * 0.5, h * 0.2, '#f6f1e8');
    fillEllipse(ctx, 0, -h * 0.16, w * 0.4, h * 0.15, shade('#f6f1e8', -0.06));
    // The steak, a fat kidney shape with a bone end.
    ctx.fillStyle = litFill(ctx, -h * 0.6, h * 0.45, c, 0.16);
    ctx.beginPath();
    ctx.moveTo(-w * 0.3, -h * 0.3);
    ctx.quadraticCurveTo(-w * 0.34, -h * 0.62, -w * 0.02, -h * 0.6);
    ctx.quadraticCurveTo(w * 0.3, -h * 0.58, w * 0.28, -h * 0.34);
    ctx.quadraticCurveTo(w * 0.26, -h * 0.16, -w * 0.04, -h * 0.2);
    ctx.quadraticCurveTo(-w * 0.28, -h * 0.2, -w * 0.3, -h * 0.3);
    ctx.closePath();
    ctx.fill();
    // A seared edge and the griddle marks.
    ctx.strokeStyle = shade(c, -0.34);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      const x = -w * 0.18 + i * w * 0.17;
      ctx.beginPath();
      ctx.moveTo(x, -h * 0.52);
      ctx.lineTo(x + w * 0.06, -h * 0.26);
      ctx.stroke();
    }
    fillEllipse(ctx, -w * 0.24, -h * 0.42, w * 0.06, h * 0.09, '#f0e6d2');
  },

  cake(ctx, w, h, c) {
    groundShadow(ctx, w * 0.85, 0.42);
    fillEllipse(ctx, 0, -h * 0.06, w * 0.52, h * 0.06, WHITE);
    fillRR(ctx, -w * 0.42, -h * 0.46, w * 0.84, h * 0.42, 4,
      litFill(ctx, -h * 0.46, h * 0.42, shade(c, -0.3), 0.12));
    // Icing with drips.
    ctx.fillStyle = litFill(ctx, -h * 0.68, h * 0.26, c, 0.16);
    fillRR(ctx, -w * 0.42, -h * 0.68, w * 0.84, h * 0.26, 5, ctx.fillStyle);
    for (let i = 0; i < 4; i += 1) {
      fillEllipse(ctx, -w * 0.28 + i * w * 0.19, -h * 0.42, w * 0.07, h * 0.06, c);
    }
    fillEllipse(ctx, 0, -h * 0.68, w * 0.42, h * 0.07, shade(c, 0.26));
    for (let i = 0; i < 5; i += 1) {
      fillCircle(ctx, -w * 0.26 + i * w * 0.13, -h * 0.7, w * 0.028, '#f6f1e8');
    }
    strokeLine(ctx, 0, -h * 0.72, 0, -h * 0.92, WHITE, 5);
    fillEllipse(ctx, 0, -h * 0.96, w * 0.04, h * 0.055, '#f0c86a');
  },

  balloons(ctx, w, h, c) {
    const shades = [c, shade(c, 0.28), shade(c, -0.2)];
    const spots = [[-w * 0.26, -h * 0.74], [w * 0.24, -h * 0.82], [0, -h * 0.94]];
    spots.forEach(([x, y], i) => {
      ctx.strokeStyle = '#c9c2c8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.1);
      ctx.quadraticCurveTo(x * 0.4, -h * 0.3, 0, -h * 0.04);
      ctx.stroke();
      const col = shades[i];
      fillEllipse(ctx, x, y, w * 0.2, h * 0.135, litFill(ctx, y - h * 0.135, h * 0.27, col, 0.18));
      fillEllipse(ctx, x - w * 0.07, y - h * 0.05, w * 0.05, h * 0.03, shade(col, 0.45));
      fillPoly(ctx, [x - w * 0.03, y + h * 0.13, x + w * 0.03, y + h * 0.13, x, y + h * 0.17], col);
    });
    fillRR(ctx, -w * 0.06, -h * 0.06, w * 0.12, h * 0.05, 2, '#c9707f');
  },

  // ------------------------------------------------------------------ pet

  cat_bed(ctx, w, h, c) {
    groundShadow(ctx, w * 0.9, 0.48);
    fillEllipse(ctx, 0, -h * 0.28, w * 0.5, h * 0.3, litFill(ctx, -h * 0.6, h * 0.6, c, 0.14));
    fillEllipse(ctx, 0, -h * 0.4, w * 0.36, h * 0.2, shade(c, -0.2));
    fillEllipse(ctx, 0, -h * 0.42, w * 0.33, h * 0.17, shade(c, 0.3));
    stitching(ctx, -w * 0.44, -h * 0.24, w * 0.44, -h * 0.24, c);
  },

  dog_bowl(ctx, w, h, c) {
    groundShadow(ctx, w * 0.8, 0.5);
    fillPoly(ctx, [-w * 0.5, -h * 0.7, w * 0.5, -h * 0.7, w * 0.32, 0, -w * 0.32, 0],
      litFill(ctx, -h * 0.7, h * 0.7, c, 0.14));
    fillEllipse(ctx, 0, -h * 0.7, w * 0.5, h * 0.14, shade(c, -0.18));
    fillEllipse(ctx, 0, -h * 0.68, w * 0.42, h * 0.11, shade(c, 0.28));
    // The shadowed inside, not a permanent helping of food: the bowl holds
    // milk now, and one that always looks full says nothing when it is filled.
    fillEllipse(ctx, 0, -h * 0.66, w * 0.34, h * 0.085, shade(c, -0.34));
    fillRR(ctx, -w * 0.5, -h * 0.42, w, h * 0.08, 3, shade(c, 0.18));
  },

  cat_tower(ctx, w, h, c) {
    groundShadow(ctx, w);
    fillRR(ctx, -w * 0.46, -h * 0.1, w * 0.92, h * 0.1, 5,
      litFill(ctx, -h * 0.1, h * 0.1, shade(c, -0.25), 0.14));
    // Post, wrapped in rope.
    fillRR(ctx, -w * 0.1, -h * 0.94, w * 0.2, h * 0.86, 4, shade(c, -0.05));
    within(ctx, -w * 0.1, -h * 0.94, w * 0.2, h * 0.86, () => {
      ctx.strokeStyle = shade(c, -0.25);
      ctx.lineWidth = 2;
      for (let y = -h * 0.92; y < -h * 0.1; y += 7) {
        ctx.beginPath();
        ctx.moveTo(-w * 0.1, y);
        ctx.lineTo(w * 0.1, y + 4);
        ctx.stroke();
      }
    });
    // Box with a hole, and a perch on top.
    fillRR(ctx, -w * 0.46, -h * 0.64, w * 0.6, h * 0.34, 7,
      litFill(ctx, -h * 0.64, h * 0.34, c, 0.12));
    fillCircle(ctx, -w * 0.16, -h * 0.47, w * 0.11, shade(c, -0.48));
    fillCircle(ctx, -w * 0.16, -h * 0.47, w * 0.095, shade(c, -0.62));
    fillRR(ctx, -w * 0.2, -h, w * 0.6, h * 0.075, 5,
      litFill(ctx, -h, h * 0.075, shade(c, 0.14), 0.14));
    fillCircle(ctx, w * 0.36, -h * 0.82, w * 0.075, shade(c, 0.36));
    strokeLine(ctx, w * 0.36, -h * 0.78, w * 0.36, -h * 0.66, shade(c, -0.3), 2.4);
  },

  fish_tank(ctx, w, h, c) {
    groundShadow(ctx, w);
    fillRR(ctx, -w / 2, -h, w, h, 5, shade(c, -0.4));
    glass(ctx, -w / 2 + 5, -h + 5, w - 10, h - 12, 3, c);
    within(ctx, -w / 2 + 5, -h + 5, w - 10, h - 12, () => {
      // Gravel, plants, fish, bubbles.
      fillRR(ctx, -w / 2, -h * 0.22, w, h * 0.22, 0, '#ded0b4');
      fillEllipse(ctx, -w * 0.3, -h * 0.24, w * 0.1, h * 0.05, '#c4b596');
      for (const [x, hh] of [[0.28, 0.44], [0.36, 0.3], [-0.38, 0.34]]) {
        ctx.strokeStyle = '#6f9463';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w * x, -h * 0.2);
        ctx.quadraticCurveTo(w * x + 8, -h * (0.2 + hh / 2), w * x - 4, -h * (0.2 + hh));
        ctx.stroke();
      }
      const fish = (fx, fy, s, col) => {
        fillEllipse(ctx, fx, fy, w * 0.06 * s, h * 0.045 * s, col);
        fillPoly(ctx, [fx - w * 0.06 * s, fy, fx - w * 0.11 * s, fy - h * 0.035 * s,
          fx - w * 0.11 * s, fy + h * 0.035 * s], col);
        fillCircle(ctx, fx + w * 0.03 * s, fy - h * 0.01 * s, 1.6, DARK);
      };
      fish(-w * 0.1, -h * 0.55, 1, '#d98a4e');
      fish(w * 0.18, -h * 0.4, 0.8, '#c9707f');
      for (const [bx, by, br] of [[-0.24, 0.72, 3], [-0.2, 0.82, 2.2], [-0.26, 0.9, 1.7]]) {
        fillCircle(ctx, w * bx, -h * by, br, '#ffffff88');
      }
    });
    fillRR(ctx, -w / 2, -h, w, h * 0.09, 4, litFill(ctx, -h, h * 0.09, shade(c, -0.32), 0.16));
  },

  // ----------------------------------------------------------------- wall

  window(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h, 6, litFill(ctx, -h, h, c, 0.14));
    fillRR(ctx, -w / 2 + 9, -h + 9, w - 18, h - 18, 3, '#a8cadd');
    // Sky, a hill and a cloud behind the glass.
    within(ctx, -w / 2 + 9, -h + 9, w - 18, h - 18, () => {
      fillEllipse(ctx, -w * 0.1, -h * 0.16, w * 0.42, h * 0.22, '#8fb082');
      fillCircle(ctx, w * 0.22, -h * 0.72, w * 0.09, '#f2dd9a');
      fillEllipse(ctx, -w * 0.14, -h * 0.66, w * 0.14, h * 0.05, '#f6f1e8');
      fillEllipse(ctx, -w * 0.05, -h * 0.68, w * 0.1, h * 0.045, '#f6f1e8');
    });
    sheen(ctx, -w / 2 + 9, -h + 9, w - 18, h - 18, 0.2);
    strokeLine(ctx, 0, -h + 9, 0, -9, c, 7);
    strokeLine(ctx, -w / 2 + 9, -h / 2, w / 2 - 9, -h / 2, c, 7);
    fillRR(ctx, -w / 2 - 5, -6, w + 10, 10, 3, litFill(ctx, -6, 10, c, 0.2));
  },

  /*
   * A whiteboard, with a pen tray along the bottom.
   *
   * The face is left empty on purpose: what goes on it is whatever Rotem drew,
   * painted over this by the room. The proportions come from FACE in
   * model/board.js, so a line she puts in the corner is in the corner here.
   */
  whiteboard(ctx, w, h, c) {
    // Frame first, then the face inset into it.
    fillRR(ctx, -w / 2, -h, w, h * 0.86, 6, litFill(ctx, -h, h, c, 0.14));
    const fx = -w / 2 + w * FACE.x;
    const fy = -h + h * FACE.y;
    fillRR(ctx, fx, fy, w * FACE.w, h * FACE.h, 3, '#fbfaf6');
    // A wash across the top corner, which is what stops a white rectangle
    // reading as a hole in the wall.
    ctx.save();
    ctx.globalAlpha = 0.5;
    fillPoly(ctx, [fx, fy, fx + w * FACE.w * 0.5, fy, fx, fy + h * FACE.h * 0.45], '#eef2f4');
    ctx.restore();

    // The tray, sticking out far enough to hold a marker.
    const ty = -h + h * 0.8;
    fillRR(ctx, -w / 2 + w * 0.02, ty, w * 0.96, h * 0.07, 3, shade(c, -0.16));
    fillRR(ctx, -w / 2 + w * 0.02, ty, w * 0.96, h * 0.025, 2, shade(c, 0.2));
  },

  /* A marker, cap on, standing up. */
  marker(ctx, w, h, c) {
    groundShadow(ctx, w * 0.8, 0.5);
    // Barrel in the ink colour, so the marker and its line match.
    fillRR(ctx, -w * 0.34, -h * 0.72, w * 0.68, h * 0.72, 3, litFill(ctx, -h, h, c, 0.2));
    // Cap, a shade darker, with a clip.
    fillRR(ctx, -w * 0.4, -h, w * 0.8, h * 0.34, 3, shade(c, -0.22));
    fillRR(ctx, w * 0.16, -h * 0.96, w * 0.16, h * 0.24, 2, shade(c, -0.4));
    // The band where the cap meets the barrel.
    fillRR(ctx, -w * 0.4, -h * 0.68, w * 0.8, h * 0.05, 2, '#efe9df');
  },

  /*
   * A school desk with its chair, seen from the side.
   *
   * One object rather than two, because a classroom is rows of desks and a
   * child laying out twelve separate chairs is a child doing furniture
   * removals instead of playing.
   */
  desk_school(ctx, w, h, c) {
    groundShadow(ctx, w * 0.9, 0.42);
    const wood = litFill(ctx, -h, h, c, 0.16);

    /*
     * The chair first, in the middle, because that is where whoever sits here
     * is drawn: an item is used at its own centre, and a chair off to one side
     * had the child sitting on the desk top beside it.
     */
    fillRR(ctx, -w * 0.16, -h * 0.4, w * 0.32, h * 0.07, 3, shade(c, -0.16));
    fillRR(ctx, -w * 0.18, -h * 0.88, w * 0.06, h * 0.52, 3, shade(c, -0.22));
    leg(ctx, -w * 0.13, -h * 0.38, 0, w * 0.05, shade(c, -0.28));
    leg(ctx, w * 0.13, -h * 0.38, 0, w * 0.05, shade(c, -0.28));

    // The desk in front of it, spanning the whole object: drawn over whoever
    // is sitting here, so she is behind her desk the way a pupil is.
    fillRR(ctx, -w * 0.48, -h * 0.62, w * 0.96, h * 0.09, 3, wood);
    fillRR(ctx, -w * 0.44, -h * 0.53, w * 0.88, h * 0.05, 2, shade(c, -0.26));
    // A shelf under the top for books, and the pencil groove along the front.
    fillRR(ctx, -w * 0.4, -h * 0.34, w * 0.8, h * 0.05, 2, shade(c, -0.3));
    fillRR(ctx, -w * 0.44, -h * 0.64, w * 0.5, h * 0.02, 1, shade(c, 0.3));
    leg(ctx, -w * 0.42, -h * 0.56, 0, w * 0.06, shade(c, -0.2));
    leg(ctx, w * 0.42, -h * 0.56, 0, w * 0.06, shade(c, -0.2));
  },

  /* A slide: steps up one side, a chute down the other. */
  slide(ctx, w, h, c) {
    groundShadow(ctx, w * 0.9, 0.4);
    const rail = shade(c, -0.2);
    // The chute, from the platform down to the ground.
    fillPoly(ctx, [-w * 0.12, -h, w * 0.04, -h, w * 0.5, -h * 0.06, w * 0.34, -h * 0.06],
      litFill(ctx, -h, h, c, 0.2));
    // Its raised edge, which is what stops it reading as a ramp.
    fillPoly(ctx, [-w * 0.12, -h, -w * 0.05, -h, w * 0.4, -h * 0.06, w * 0.34, -h * 0.06], rail);
    // The ladder.
    fillRR(ctx, -w * 0.46, -h, w * 0.06, h, 3, rail);
    fillRR(ctx, -w * 0.2, -h, w * 0.06, h, 3, rail);
    for (let i = 1; i <= 4; i += 1) {
      fillRR(ctx, -w * 0.46, -h * (i / 4.6), w * 0.32, h * 0.05, 2, shade(c, 0.14));
    }
    // The platform at the top.
    fillRR(ctx, -w * 0.5, -h - h * 0.05, w * 0.44, h * 0.06, 3, shade(c, 0.24));
  },

  /* A swing: a frame, two ropes and a seat. */
  swing(ctx, w, h, c) {
    groundShadow(ctx, w * 0.85, 0.4);
    const frame = litFill(ctx, -h, h, c, 0.18);
    // Two A-frames and the beam across the top.
    fillPoly(ctx, [-w * 0.5, 0, -w * 0.42, 0, -w * 0.02, -h, -w * 0.08, -h], frame);
    fillPoly(ctx, [w * 0.5, 0, w * 0.42, 0, w * 0.02, -h, w * 0.08, -h], frame);
    fillRR(ctx, -w * 0.12, -h - h * 0.03, w * 0.24, h * 0.04, 3, shade(c, -0.16));
    // Ropes and seat.
    strokeLine(ctx, -w * 0.09, -h, -w * 0.09, -h * 0.42, shade(c, -0.3), 3);
    strokeLine(ctx, w * 0.09, -h, w * 0.09, -h * 0.42, shade(c, -0.3), 3);
    fillRR(ctx, -w * 0.15, -h * 0.42, w * 0.3, h * 0.05, 3, '#8a6a4a');
  },

  /* A sandpit: a wooden box with sand heaped in it, and a spade. */
  sandpit(ctx, w, h, c) {
    groundShadow(ctx, w * 0.95, 0.5);
    fillRR(ctx, -w / 2, -h * 0.6, w, h * 0.6, 4, '#a87f52');
    // The sand itself, mounded rather than flat.
    ctx.fillStyle = litFill(ctx, -h, h, c, 0.16);
    ctx.beginPath();
    ctx.moveTo(-w * 0.46, -h * 0.5);
    ctx.quadraticCurveTo(0, -h * 0.95, w * 0.46, -h * 0.5);
    ctx.closePath();
    ctx.fill();
    // The rim, drawn over the sand so the sand sits inside the box.
    fillRR(ctx, -w / 2, -h * 0.6, w, h * 0.16, 3, '#8a6a4a');
    fillRR(ctx, w * 0.2, -h * 1.1, w * 0.05, h * 0.6, 2, '#c0392b');
    fillPoly(ctx, [w * 0.14, -h * 0.62, w * 0.32, -h * 0.62, w * 0.28, -h * 0.44,
      w * 0.18, -h * 0.44], '#c0392b');
  },

  /* A ball, panelled so it reads as a ball and not a dot. */
  ball(ctx, w, h, c) {
    groundShadow(ctx, w * 0.7, 0.6);
    const r = Math.min(w, h) / 2;
    fillCircle(ctx, 0, -r, r, litFill(ctx, -h, h, c, 0.24));
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -r, r, 0, Math.PI * 2);
    ctx.clip();
    fillEllipse(ctx, -r * 0.1, -r, r * 0.42, r, PAPER_WHITE);
    fillEllipse(ctx, -r * 0.1, -r, r * 0.42, r * 0.34, shade(c, 0.1));
    ctx.restore();
    fillEllipse(ctx, -r * 0.34, -r * 1.4, r * 0.26, r * 0.16, 'rgba(255,255,255,0.5)');
  },

  /* An alphabet poster, for a classroom wall. */
  poster(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h, 4, litFill(ctx, -h, h, c, 0.1));
    fillRR(ctx, -w / 2 + 4, -h + 4, w - 8, h - 8, 3, '#fbfaf6');
    // Rows of letter blocks. Shapes rather than letters: at the size this is
    // on a wall, text would be a smear, and a smear that is nearly readable is
    // worse than a pattern that is not pretending.
    const cols = 6;
    const rows = 4;
    const bw = (w - 24) / cols;
    const bh = (h - 24) / rows;
    const inks = ['#c0392b', '#2e7fc4', '#3f9e5b', '#e0891e', '#8a5fb0'];
    if (!worthDrawing(ctx, bw)) {
      // Rows of colour rather than twenty-four separate blocks of it.
      for (let r = 0; r < rows; r += 1) {
        fillRR(ctx, -w / 2 + 14, -h + 14 + r * bh, w - 28, bh - 5, 2, inks[r % inks.length]);
      }
      return;
    }
    for (let r = 0; r < rows; r += 1) {
      for (let i = 0; i < cols; i += 1) {
        fillRR(ctx, -w / 2 + 12 + i * bw + 2, -h + 12 + r * bh + 2,
          bw - 5, bh - 5, 2, inks[(r * cols + i) % inks.length]);
      }
    }
  },

  /* A globe on a stand. */
  globe(ctx, w, h, c) {
    groundShadow(ctx, w * 0.7, 0.44);
    fillRR(ctx, -w * 0.24, -h * 0.16, w * 0.48, h * 0.08, 3, '#5b5266');
    strokeLine(ctx, 0, -h * 0.16, 0, -h * 0.4, '#5b5266', 5);
    const r = w * 0.36;
    fillCircle(ctx, 0, -h * 0.4 - r, r, litFill(ctx, -h, h, c, 0.22));
    // Land, in two blobs. A map at this size is two blobs however it is drawn.
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -h * 0.4 - r, r, 0, Math.PI * 2);
    ctx.clip();
    fillEllipse(ctx, -r * 0.3, -h * 0.4 - r * 1.2, r * 0.42, r * 0.3, '#7fa860');
    fillEllipse(ctx, r * 0.34, -h * 0.4 - r * 0.7, r * 0.34, r * 0.42, '#7fa860');
    ctx.restore();
    // The meridian ring.
    ctx.strokeStyle = shade(c, -0.34);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -h * 0.4 - r, r + 3, Math.PI * 0.62, Math.PI * 2.38);
    ctx.stroke();
  },

  /* A school bag, with a flap and two straps. */
  school_bag(ctx, w, h, c) {
    groundShadow(ctx, w * 0.8, 0.46);
    ctx.fillStyle = litFill(ctx, -h, h, c, 0.18);
    fillRR(ctx, -w * 0.42, -h * 0.78, w * 0.84, h * 0.78, 8, ctx.fillStyle);
    // The flap over the top, a shade darker.
    fillRR(ctx, -w * 0.44, -h * 0.86, w * 0.88, h * 0.42, 8, shade(c, -0.16));
    fillRR(ctx, -w * 0.1, -h * 0.5, w * 0.2, h * 0.12, 3, '#e8dfc8');
    // The handle.
    ctx.strokeStyle = shade(c, -0.3);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, -h * 0.86, w * 0.16, Math.PI, 0);
    ctx.stroke();
  },

  /* A teacher's desk: a bigger desk with a modesty panel across the front. */
  teacher_desk(ctx, w, h, c) {
    groundShadow(ctx, w * 0.92, 0.42);
    const wood = litFill(ctx, -h, h, c, 0.16);
    fillRR(ctx, -w / 2, -h, w, h * 0.14, 4, wood);
    fillRR(ctx, -w * 0.44, -h * 0.86, w * 0.88, h * 0.6, 3, shade(c, -0.12));
    // Two drawers on the right, a knob each.
    for (const dy of [0.74, 0.5]) {
      fillRR(ctx, w * 0.1, -h * dy, w * 0.3, h * 0.2, 3, shade(c, 0.14));
      fillCircle(ctx, w * 0.25, -h * (dy - 0.1), h * 0.02, shade(c, -0.36));
    }
    leg(ctx, -w * 0.4, -h * 0.26, 0, w * 0.05, shade(c, -0.24));
    leg(ctx, w * 0.4, -h * 0.26, 0, w * 0.05, shade(c, -0.24));
  },

  /* A board rubber: a felt pad with a handle on top. */
  rubber(ctx, w, h, c) {
    groundShadow(ctx, w * 0.8, 0.44);
    fillRR(ctx, -w / 2, -h * 0.42, w, h * 0.42, 3, '#dcd6cc');
    fillRR(ctx, -w * 0.44, -h, w * 0.88, h * 0.62, 4, litFill(ctx, -h, h, c, 0.18));
    fillRR(ctx, -w * 0.2, -h * 1.02, w * 0.4, h * 0.16, 3, shade(c, 0.22));
  },

  picture(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h, 5, litFill(ctx, -h, h, c, 0.16));
    fillRR(ctx, -w / 2 + 5, -h + 5, w - 10, h - 10, 3, shade(c, -0.3));
    const ix = -w / 2 + 10;
    const iy = -h + 10;
    const iw = w - 20;
    const ih = h - 20;
    fillRR(ctx, ix, iy, iw, ih, 2, '#f4ecdd');
    within(ctx, ix, iy, iw, ih, () => {
      fillRR(ctx, ix, iy + ih * 0.6, iw, ih * 0.4, 0, '#8fb082');
      fillPoly(ctx, [ix + iw * 0.1, iy + ih * 0.68, ix + iw * 0.36, iy + ih * 0.2,
        ix + iw * 0.62, iy + ih * 0.68], '#7d9e62');
      fillCircle(ctx, ix + iw * 0.76, iy + ih * 0.26, ih * 0.12, '#f0c86a');
    });
  },

  clock(ctx, w, h, c) {
    fillCircle(ctx, 0, -h / 2, w / 2, shade(c, -0.3));
    fillCircle(ctx, 0, -h / 2, w * 0.45, litFill(ctx, -h, h, c, 0.16));
    fillCircle(ctx, 0, -h / 2, w * 0.38, '#f4ecdd');
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      const long = i % 3 === 0;
      strokeLine(ctx, Math.cos(a) * w * 0.33, -h / 2 + Math.sin(a) * w * 0.33,
        Math.cos(a) * w * (long ? 0.26 : 0.29), -h / 2 + Math.sin(a) * w * (long ? 0.26 : 0.29),
        DARK, long ? 2.4 : 1.4);
    }
    strokeLine(ctx, 0, -h / 2, 0, -h * 0.76, DARK, 3.4);
    strokeLine(ctx, 0, -h / 2, w * 0.2, -h * 0.44, DARK, 2.6);
    fillCircle(ctx, 0, -h / 2, 3, '#c9707f');
  },

  shelf_wall(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h * 0.3, w, h * 0.3, 3, litFill(ctx, -h * 0.3, h * 0.3, c, 0.16));
    woodGrain(ctx, -w / 2, -h * 0.3, w, h * 0.3, c, 1);
    fillPoly(ctx, [-w * 0.36, 0, -w * 0.28, 0, -w * 0.32, h * 0.22], shade(c, -0.3));
    fillPoly(ctx, [w * 0.28, 0, w * 0.36, 0, w * 0.32, h * 0.22], shade(c, -0.3));
    // Things standing on it.
    fillRR(ctx, -w * 0.38, -h, w * 0.09, h * 0.7, 2, '#c9707f');
    fillRR(ctx, -w * 0.27, -h * 0.92, w * 0.08, h * 0.62, 2, '#5c8fae');
    fillRR(ctx, -w * 0.17, -h * 0.86, w * 0.07, h * 0.56, 2, '#dcb85c');
    fillCircle(ctx, w * 0.2, -h * 0.52, w * 0.11, '#7d9e62');
    fillEllipse(ctx, w * 0.2, -h * 0.34, w * 0.09, h * 0.07, '#b5734c');
  },

  door(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h, 4, shade(c, -0.3));
    fillRR(ctx, -w / 2 + 6, -h + 6, w - 12, h - 8, 3, litFill(ctx, -h, h, c, 0.12));
    panel(ctx, -w * 0.26, -h * 0.9, w * 0.52, h * 0.32, c, 6);
    panel(ctx, -w * 0.26, -h * 0.52, w * 0.52, h * 0.38, c, 6);
    knob(ctx, w * 0.3, -h * 0.46, 6, '#f0c86a');
    fillRR(ctx, w * 0.24, -h * 0.5, w * 0.06, h * 0.08, 2, shade('#f0c86a', -0.25));
  },
};
