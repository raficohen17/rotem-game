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
 */

import { fillRR, fillCircle, fillEllipse, fillPoly, strokeLine, shade } from './shapes.js';

const WHITE = '#f7f4ef';
const GLASS = '#bfe4f5';
const DARK = '#3a3550';

/** Two legs under a piece of furniture. */
function legs(ctx, w, h, color, inset = 0.12, thickness = 0.07) {
  const lw = w * thickness;
  const lh = h;
  fillRR(ctx, -w / 2 + w * inset, -lh, lw, lh, 4, color);
  fillRR(ctx, w / 2 - w * inset - lw, -lh, lw, lh, 4, color);
}

export const PLACEHOLDERS = {
  // ---------------------------------------------------------------- sleep

  bed_single(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w * 0.1, h, 8, shade(c, -0.35));
    fillRR(ctx, -w / 2, -h * 0.42, w, h * 0.42, 10, shade(c, -0.3));
    fillRR(ctx, -w / 2 + w * 0.06, -h * 0.66, w * 0.9, h * 0.26, 10, WHITE);
    fillRR(ctx, -w / 2 + w * 0.34, -h * 0.7, w * 0.62, h * 0.32, 10, c);
    fillRR(ctx, -w / 2 + w * 0.1, -h * 0.76, w * 0.2, h * 0.16, 8, '#ffffff');
  },

  bed_double(ctx, w, h, c) {
    PLACEHOLDERS.bed_single(ctx, w, h, c);
    fillRR(ctx, -w / 2 + w * 0.32, -h * 0.76, w * 0.18, h * 0.16, 8, '#ffffff');
  },

  bunk_bed(ctx, w, h, c) {
    const post = w * 0.07;
    fillRR(ctx, -w / 2, -h, post, h, 5, shade(c, -0.4));
    fillRR(ctx, w / 2 - post, -h, post, h, 5, shade(c, -0.4));
    for (const y of [-h * 0.42, -h]) {
      fillRR(ctx, -w / 2, y, w, h * 0.1, 6, shade(c, -0.25));
      fillRR(ctx, -w / 2 + post, y - h * 0.12, w - post * 2, h * 0.13, 8, WHITE);
      fillRR(ctx, -w / 2 + w * 0.3, y - h * 0.14, w * 0.6, h * 0.16, 8, c);
    }
  },

  crib(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h * 0.34, w, h * 0.34, 10, shade(c, -0.2));
    for (let i = 0; i <= 6; i += 1) {
      const x = -w / 2 + w * 0.06 + (w * 0.88 * i) / 6;
      fillRR(ctx, x, -h, w * 0.05, h * 0.7, 4, c);
    }
    fillRR(ctx, -w / 2, -h, w, h * 0.09, 5, c);
    fillRR(ctx, -w / 2 + w * 0.1, -h * 0.46, w * 0.8, h * 0.14, 6, WHITE);
  },

  cushion(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h, h * 0.42, c);
    fillCircle(ctx, 0, -h * 0.5, h * 0.12, shade(c, -0.2));
  },

  // ------------------------------------------------------------------ sit

  sofa(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h * 0.72, 22, c);
    fillRR(ctx, -w / 2, -h * 0.52, w, h * 0.42, 18, shade(c, 0.12));
    fillRR(ctx, -w / 2, -h * 0.56, w * 0.16, h * 0.56, 14, shade(c, -0.15));
    fillRR(ctx, w / 2 - w * 0.16, -h * 0.56, w * 0.16, h * 0.56, 14, shade(c, -0.15));
    fillRR(ctx, -w * 0.22, -h * 0.62, w * 0.2, h * 0.18, 8, shade(c, 0.3));
    fillRR(ctx, w * 0.02, -h * 0.62, w * 0.2, h * 0.18, 8, shade(c, 0.3));
    legs(ctx, w, h * 0.12, shade(c, -0.5), 0.08, 0.06);
  },

  armchair(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h * 0.7, 18, c);
    fillRR(ctx, -w / 2, -h * 0.5, w, h * 0.4, 14, shade(c, 0.12));
    fillRR(ctx, -w / 2, -h * 0.55, w * 0.2, h * 0.55, 12, shade(c, -0.15));
    fillRR(ctx, w / 2 - w * 0.2, -h * 0.55, w * 0.2, h * 0.55, 12, shade(c, -0.15));
    legs(ctx, w, h * 0.12, shade(c, -0.5), 0.1, 0.08);
  },

  chair(ctx, w, h, c) {
    fillRR(ctx, -w / 2 + w * 0.06, -h, w * 0.88, h * 0.55, 8, c);
    fillRR(ctx, -w / 2, -h * 0.45, w, h * 0.12, 6, shade(c, 0.1));
    legs(ctx, w, h * 0.45, shade(c, -0.3), 0.1, 0.1);
  },

  stool(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h * 0.25, 8, c);
    legs(ctx, w, h * 0.8, shade(c, -0.3), 0.12, 0.12);
  },

  beanbag(ctx, w, h, c) {
    fillEllipse(ctx, 0, -h * 0.3, w * 0.5, h * 0.32, c);
    fillEllipse(ctx, -w * 0.1, -h * 0.62, w * 0.34, h * 0.32, shade(c, 0.12));
  },

  // ---------------------------------------------------------------- table

  table_dining(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h * 0.16, 6, c);
    legs(ctx, w, h * 0.86, shade(c, -0.25), 0.1, 0.08);
  },

  table_coffee(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h * 0.22, 6, c);
    fillRR(ctx, -w / 2 + w * 0.1, -h * 0.4, w * 0.8, h * 0.1, 4, shade(c, -0.2));
    legs(ctx, w, h * 0.8, shade(c, -0.25), 0.08, 0.07);
  },

  desk(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h * 0.15, 6, c);
    fillRR(ctx, 0, -h * 0.85, w * 0.42, h * 0.55, 6, shade(c, -0.2));
    for (let i = 0; i < 3; i += 1) {
      fillRR(ctx, w * 0.04, -h * 0.8 + i * h * 0.17, w * 0.34, h * 0.12, 4, shade(c, 0.15));
    }
    fillRR(ctx, -w / 2 + w * 0.08, -h * 0.85, w * 0.07, h * 0.85, 4, shade(c, -0.25));
  },

  nightstand(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h * 0.82, 8, c);
    fillRR(ctx, -w / 2 + w * 0.12, -h * 0.72, w * 0.76, h * 0.24, 5, shade(c, 0.18));
    fillRR(ctx, -w / 2 + w * 0.12, -h * 0.42, w * 0.76, h * 0.24, 5, shade(c, 0.18));
    legs(ctx, w, h * 0.18, shade(c, -0.35), 0.12, 0.08);
  },

  // ---------------------------------------------------------------- store

  wardrobe(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h, 10, c);
    fillRR(ctx, -w / 2 + w * 0.06, -h * 0.94, w * 0.42, h * 0.86, 6, shade(c, 0.14));
    fillRR(ctx, w * 0.02, -h * 0.94, w * 0.42, h * 0.86, 6, shade(c, 0.14));
    fillCircle(ctx, -w * 0.04, -h * 0.5, w * 0.03, DARK);
    fillCircle(ctx, w * 0.04, -h * 0.5, w * 0.03, DARK);
  },

  bookshelf(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h, 8, c);
    const books = ['#e05a7a', '#4f9bd8', '#6fbf5f', '#f2b13d', '#9b6bd8'];
    for (let row = 0; row < 3; row += 1) {
      const y = -h * 0.9 + row * h * 0.3;
      fillRR(ctx, -w / 2 + w * 0.06, y, w * 0.88, h * 0.24, 4, shade(c, 0.2));
      for (let i = 0; i < 5; i += 1) {
        const bw = w * 0.13;
        fillRR(ctx, -w / 2 + w * 0.1 + i * bw, y + h * 0.04, bw * 0.8, h * 0.2, 2,
          books[(row + i) % books.length]);
      }
    }
  },

  dresser(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h * 0.86, 8, c);
    for (let i = 0; i < 3; i += 1) {
      const y = -h * 0.8 + i * h * 0.25;
      fillRR(ctx, -w / 2 + w * 0.08, y, w * 0.84, h * 0.2, 5, shade(c, 0.18));
      fillRR(ctx, -w * 0.08, y + h * 0.08, w * 0.16, h * 0.04, 3, DARK);
    }
    legs(ctx, w, h * 0.14, shade(c, -0.35), 0.1, 0.08);
  },

  toybox(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h * 0.78, w, h * 0.78, 8, c);
    fillRR(ctx, -w / 2 - w * 0.03, -h, w * 1.06, h * 0.28, 8, shade(c, -0.2));
    fillCircle(ctx, -w * 0.2, -h * 0.4, w * 0.08, '#f7d04a');
    fillCircle(ctx, w * 0.12, -h * 0.42, w * 0.1, '#4f9bd8');
  },

  // -------------------------------------------------------------- kitchen

  fridge(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h, 12, c);
    strokeLine(ctx, -w / 2 + 6, -h * 0.62, w / 2 - 6, -h * 0.62, shade(c, -0.25), 3);
    fillRR(ctx, w * 0.2, -h * 0.9, w * 0.08, h * 0.2, 4, shade(c, -0.4));
    fillRR(ctx, w * 0.2, -h * 0.55, w * 0.08, h * 0.28, 4, shade(c, -0.4));
    fillRR(ctx, -w * 0.3, -h * 0.86, w * 0.16, h * 0.1, 3, '#e05a7a');
  },

  stove(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h, 8, c);
    fillRR(ctx, -w / 2 + w * 0.08, -h * 0.62, w * 0.84, h * 0.42, 6, shade(c, 0.25));
    fillCircle(ctx, -w * 0.22, -h * 0.92, w * 0.09, shade(c, -0.4));
    fillCircle(ctx, w * 0.22, -h * 0.92, w * 0.09, shade(c, -0.4));
    fillRR(ctx, -w / 2 + w * 0.1, -h * 0.72, w * 0.8, h * 0.05, 3, shade(c, -0.3));
  },

  counter(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h * 0.84, w, h * 0.84, 6, c);
    fillRR(ctx, -w / 2 - w * 0.02, -h, w * 1.04, h * 0.18, 6, shade(c, -0.3));
    fillRR(ctx, -w / 2 + w * 0.08, -h * 0.66, w * 0.36, h * 0.46, 5, shade(c, 0.18));
    fillRR(ctx, w * 0.04, -h * 0.66, w * 0.36, h * 0.46, 5, shade(c, 0.18));
  },

  sink_kitchen(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h * 0.82, w, h * 0.82, 6, shade(c, -0.15));
    fillRR(ctx, -w / 2, -h, w, h * 0.22, 6, c);
    fillRR(ctx, -w * 0.3, -h * 0.98, w * 0.6, h * 0.16, 6, GLASS);
    strokeLine(ctx, w * 0.28, -h * 0.98, w * 0.28, -h * 1.2, '#9aa6b2', 6);
    strokeLine(ctx, w * 0.28, -h * 1.2, w * 0.06, -h * 1.2, '#9aa6b2', 6);
  },

  // ----------------------------------------------------------------- bath

  toilet(ctx, w, h, c) {
    fillRR(ctx, -w / 2 + w * 0.1, -h, w * 0.8, h * 0.42, 8, c);
    fillRR(ctx, -w / 2 + w * 0.16, -h * 0.62, w * 0.68, h * 0.24, 6, shade(c, -0.12));
    fillEllipse(ctx, 0, -h * 0.32, w * 0.42, h * 0.16, c);
    fillEllipse(ctx, 0, -h * 0.32, w * 0.3, h * 0.1, GLASS);
    fillRR(ctx, -w * 0.24, -h * 0.2, w * 0.48, h * 0.2, 6, shade(c, -0.1));
  },

  bathtub(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h * 0.78, w, h * 0.78, 26, c);
    fillRR(ctx, -w / 2 + w * 0.05, -h * 0.72, w * 0.9, h * 0.5, 20, GLASS);
    fillEllipse(ctx, -w * 0.2, -h * 0.6, w * 0.07, h * 0.05, '#ffffff');
    fillEllipse(ctx, w * 0.05, -h * 0.66, w * 0.05, h * 0.04, '#ffffff');
    legs(ctx, w, h * 0.2, shade(c, -0.35), 0.1, 0.07);
  },

  sink_bath(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h * 0.34, 12, c);
    fillEllipse(ctx, 0, -h * 0.86, w * 0.32, h * 0.08, GLASS);
    fillPoly(ctx, [-w * 0.16, -h * 0.7, w * 0.16, -h * 0.7, w * 0.1, 0, -w * 0.1, 0], c);
    strokeLine(ctx, 0, -h * 0.98, 0, -h * 1.16, '#9aa6b2', 6);
  },

  shower(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h, 10, shade(c, 0.4));
    fillRR(ctx, -w / 2 + 9, -h + 9, w - 18, h - 22, 6, GLASS);
    fillRR(ctx, -w / 2, -h * 0.11, w, h * 0.11, 6, shade(c, -0.35));
    strokeLine(ctx, w * 0.04, -h + 14, w * 0.04, -h * 0.14, shade(c, 0.55), 4);
    fillCircle(ctx, -w * 0.16, -h * 0.44, w * 0.05, shade(c, 0.6));
    fillEllipse(ctx, -w * 0.14, -h * 0.9, w * 0.16, h * 0.03, '#9aa6b2');
    strokeLine(ctx, -w * 0.14, -h * 0.94, -w * 0.14, -h, '#9aa6b2', 5);
    for (let i = 0; i < 4; i += 1) {
      const x = -w * 0.26 + i * w * 0.08;
      strokeLine(ctx, x, -h * 0.84, x, -h * 0.7, '#ffffff', 3);
    }
  },

  // ---------------------------------------------------------------- decor

  lamp_floor(ctx, w, h, c) {
    strokeLine(ctx, 0, -h * 0.7, 0, -h * 0.04, '#9aa6b2', 6);
    fillEllipse(ctx, 0, -h * 0.03, w * 0.3, h * 0.03, '#9aa6b2');
    fillPoly(ctx, [-w * 0.42, -h * 0.72, w * 0.42, -h * 0.72, w * 0.26, -h, -w * 0.26, -h], c);
  },

  lamp_table(ctx, w, h, c) {
    strokeLine(ctx, 0, -h * 0.6, 0, -h * 0.06, '#9aa6b2', 5);
    fillEllipse(ctx, 0, -h * 0.05, w * 0.3, h * 0.05, '#9aa6b2');
    fillPoly(ctx, [-w * 0.44, -h * 0.62, w * 0.44, -h * 0.62, w * 0.26, -h, -w * 0.26, -h], c);
  },

  plant_tall(ctx, w, h, c) {
    fillPoly(ctx, [-w * 0.24, -h * 0.3, w * 0.24, -h * 0.3, w * 0.18, 0, -w * 0.18, 0], '#c8703f');
    strokeLine(ctx, 0, -h * 0.32, 0, -h * 0.8, shade(c, -0.3), 7);
    fillEllipse(ctx, -w * 0.22, -h * 0.62, w * 0.24, h * 0.09, c);
    fillEllipse(ctx, w * 0.22, -h * 0.7, w * 0.24, h * 0.09, c);
    fillEllipse(ctx, -w * 0.16, -h * 0.82, w * 0.2, h * 0.08, shade(c, 0.15));
    fillEllipse(ctx, w * 0.14, -h * 0.9, w * 0.2, h * 0.08, shade(c, 0.15));
    fillEllipse(ctx, 0, -h * 0.97, w * 0.16, h * 0.07, c);
  },

  plant_small(ctx, w, h, c) {
    fillPoly(ctx, [-w * 0.3, -h * 0.42, w * 0.3, -h * 0.42, w * 0.22, 0, -w * 0.22, 0], '#c8703f');
    fillCircle(ctx, -w * 0.16, -h * 0.62, w * 0.2, c);
    fillCircle(ctx, w * 0.16, -h * 0.6, w * 0.18, shade(c, 0.15));
    fillCircle(ctx, 0, -h * 0.8, w * 0.22, c);
  },

  tv(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h * 0.76, 8, c);
    fillRR(ctx, -w / 2 + 8, -h + 8, w - 16, h * 0.76 - 16, 5, '#7fd4e8');
    fillRR(ctx, -w * 0.06, -h * 0.24, w * 0.12, h * 0.14, 3, shade(c, -0.2));
    fillRR(ctx, -w * 0.2, -h * 0.12, w * 0.4, h * 0.06, 4, shade(c, -0.2));
  },

  rug_round(ctx, w, h, c) {
    fillEllipse(ctx, 0, -h * 0.5, w * 0.5, h * 0.5, c);
    fillEllipse(ctx, 0, -h * 0.5, w * 0.34, h * 0.34, shade(c, 0.22));
    fillEllipse(ctx, 0, -h * 0.5, w * 0.18, h * 0.18, c);
  },

  teddy(ctx, w, h, c) {
    fillCircle(ctx, -w * 0.28, -h * 0.78, w * 0.14, c);
    fillCircle(ctx, w * 0.28, -h * 0.78, w * 0.14, c);
    fillCircle(ctx, 0, -h * 0.68, w * 0.32, c);
    fillEllipse(ctx, 0, -h * 0.26, w * 0.34, h * 0.26, shade(c, 0.1));
    fillCircle(ctx, -w * 0.1, -h * 0.72, w * 0.04, DARK);
    fillCircle(ctx, w * 0.1, -h * 0.72, w * 0.04, DARK);
    fillEllipse(ctx, 0, -h * 0.6, w * 0.1, h * 0.06, shade(c, 0.35));
  },

  cake(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h * 0.44, w, h * 0.44, 6, shade(c, -0.3));
    fillRR(ctx, -w / 2, -h * 0.66, w, h * 0.28, 8, c);
    fillEllipse(ctx, 0, -h * 0.66, w * 0.5, h * 0.08, shade(c, 0.25));
    strokeLine(ctx, 0, -h * 0.7, 0, -h * 0.92, '#ffffff', 5);
    fillEllipse(ctx, 0, -h * 0.96, w * 0.04, h * 0.06, '#f7d04a');
  },

  balloons(ctx, w, h, c) {
    const extra = [shade(c, 0.3), shade(c, -0.2)];
    const spots = [[-w * 0.26, -h * 0.74], [w * 0.24, -h * 0.82], [0, -h * 0.94]];
    spots.forEach(([x, y], i) => {
      strokeLine(ctx, x, y, 0, -h * 0.06, '#c9c2d8', 2);
      fillEllipse(ctx, x, y, w * 0.2, h * 0.13, i === 0 ? c : extra[i - 1]);
    });
  },

  // ------------------------------------------------------------------ pet

  cat_bed(ctx, w, h, c) {
    fillEllipse(ctx, 0, -h * 0.3, w * 0.5, h * 0.3, c);
    fillEllipse(ctx, 0, -h * 0.42, w * 0.34, h * 0.2, shade(c, 0.3));
  },

  dog_bowl(ctx, w, h, c) {
    fillPoly(ctx, [-w * 0.5, -h * 0.7, w * 0.5, -h * 0.7, w * 0.32, 0, -w * 0.32, 0], c);
    fillEllipse(ctx, 0, -h * 0.7, w * 0.5, h * 0.14, shade(c, 0.3));
  },

  cat_tower(ctx, w, h, c) {
    fillRR(ctx, -w * 0.44, -h * 0.12, w * 0.88, h * 0.12, 6, shade(c, -0.25));
    fillRR(ctx, -w * 0.11, -h * 0.94, w * 0.22, h * 0.84, 5, shade(c, -0.05));
    // The box the cat actually sits in, with a hole in the front.
    fillRR(ctx, -w * 0.46, -h * 0.66, w * 0.62, h * 0.34, 8, c);
    fillCircle(ctx, -w * 0.15, -h * 0.49, w * 0.11, shade(c, -0.45));
    fillRR(ctx, -w * 0.5, -h, w * 0.94, h * 0.1, 6, shade(c, 0.2));
    fillCircle(ctx, w * 0.34, -h * 0.86, w * 0.09, shade(c, 0.35));
    strokeLine(ctx, w * 0.34, -h * 0.82, w * 0.34, -h * 0.7, shade(c, -0.3), 3);
  },

  fish_tank(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h, 6, GLASS);
    fillRR(ctx, -w / 2, -h * 0.2, w, h * 0.2, 4, '#e0cfa0');
    fillRR(ctx, -w / 2, -h, w, h * 0.1, 4, shade(c, -0.35));
    fillEllipse(ctx, -w * 0.14, -h * 0.56, w * 0.1, h * 0.07, '#f2913d');
    fillEllipse(ctx, w * 0.2, -h * 0.42, w * 0.08, h * 0.06, '#e05a7a');
    strokeLine(ctx, w * 0.3, -h * 0.2, w * 0.3, -h * 0.6, '#4fa84f', 5);
  },

  // ----------------------------------------------------------------- wall

  window(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h, 8, c);
    fillRR(ctx, -w / 2 + 10, -h + 10, w - 20, h - 20, 5, '#9fdcf5');
    strokeLine(ctx, 0, -h + 10, 0, -10, c, 8);
    strokeLine(ctx, -w / 2 + 10, -h / 2, w / 2 - 10, -h / 2, c, 8);
  },

  picture(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h, 6, c);
    fillRR(ctx, -w / 2 + 9, -h + 9, w - 18, h - 18, 3, '#fdf6e8');
    fillPoly(ctx, [-w * 0.3, -h * 0.2, -w * 0.05, -h * 0.6, w * 0.2, -h * 0.2], '#6fbf5f');
    fillCircle(ctx, w * 0.22, -h * 0.68, w * 0.09, '#f7d04a');
  },

  clock(ctx, w, h, c) {
    fillCircle(ctx, 0, -h / 2, w / 2, c);
    fillCircle(ctx, 0, -h / 2, w * 0.42, '#fdf6e8');
    strokeLine(ctx, 0, -h / 2, 0, -h * 0.78, DARK, 4);
    strokeLine(ctx, 0, -h / 2, w * 0.22, -h * 0.5, DARK, 4);
  },

  shelf_wall(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h * 0.35, w, h * 0.35, 4, c);
    fillRR(ctx, -w * 0.36, -h, w * 0.1, h * 0.68, 3, '#e05a7a');
    fillRR(ctx, -w * 0.2, -h * 0.92, w * 0.1, h * 0.6, 3, '#4f9bd8');
    fillCircle(ctx, w * 0.22, -h * 0.62, w * 0.12, '#6fbf5f');
  },

  door(ctx, w, h, c) {
    fillRR(ctx, -w / 2, -h, w, h, 8, shade(c, -0.25));
    fillRR(ctx, -w / 2 + 8, -h + 8, w - 16, h - 12, 6, c);
    fillRR(ctx, -w * 0.26, -h * 0.86, w * 0.52, h * 0.3, 4, shade(c, 0.16));
    fillCircle(ctx, w * 0.3, -h * 0.46, w * 0.06, '#f7d04a');
  },
};
