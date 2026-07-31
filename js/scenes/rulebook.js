/**
 * The recipe book.
 *
 * Without it cooking is guesswork: nothing in the house tells a child that an
 * egg goes in a pan and vegetables go in a pot, and a recipe nobody can look
 * up is a recipe nobody finds.
 *
 * Not a word in it. The game has never required reading and does not start
 * here — a recipe is the thing you need, the thing you cook it in, the fact
 * that it goes on the heat, and the thing you get. Four pictures and two
 * symbols say all of that.
 *
 * Built from the RECIPES table rather than written out, so a recipe added to
 * the game appears in the book without the book being touched.
 */

import { button, hitTest, drawButtons, drawPanel, COLORS, TOUCH } from '../ui/widgets.js';
import { drawIcon } from '../ui/icons.js';
import { fillRR, fillCircle, strokeLine } from '../render/shapes.js';
import { drawItemArt } from '../render/catalog.js';
import { RECIPES } from '../model/recipes.js';

const PAGE = { x: 40, y: 96, w: 1200, h: 600 };
const CARD = { gap: 16, cols: 2 };

/** Where each recipe card sits, sized so they all fit whatever the count. */
export function cardGrid(count, cols = CARD.cols) {
  const rows = Math.max(1, Math.ceil(count / cols));
  const w = (PAGE.w - CARD.gap * (cols - 1)) / cols;
  const top = PAGE.y + 44;
  const room = PAGE.h - 60;
  const h = Math.min(180, (room - CARD.gap * (rows - 1)) / rows);
  // Centred down the page rather than stacked at the top, so four recipes do
  // not sit in the corner of a half-empty sheet. It still fills downward as
  // more are added.
  const used = rows * h + CARD.gap * (rows - 1);
  const y0 = top + Math.max(0, (room - used) / 2);
  return {
    cols,
    rows,
    w,
    h,
    at: (i) => ({
      x: PAGE.x + (i % cols) * (w + CARD.gap),
      y: y0 + Math.floor(i / cols) * (h + CARD.gap),
    }),
  };
}

export function createRuleBook(game, onClose) {
  const back = button('back', 1186, 24, TOUCH, TOUCH, { icon: 'back', round: true });

  return {
    allControls: () => [back],

    onTap(x, y) {
      if (hitTest([back], x, y)) onClose();
    },

    draw(ctx) {
      ctx.fillStyle = COLORS.backdrop;
      ctx.fillRect(0, 0, 1280, 720);
      drawPanel(ctx, PAGE.x, PAGE.y, PAGE.w, PAGE.h, COLORS.panel, 22);

      // A cooking pot at the top instead of a heading, for the same reason
      // there are no words anywhere else.
      drawIcon(ctx, 'cook', PAGE.x + 44, PAGE.y + 34, COLORS.ink, 0.9);

      const grid = cardGrid(RECIPES.length);
      RECIPES.forEach((recipe, i) => {
        drawRecipe(ctx, recipe, { ...grid.at(i), w: grid.w, h: grid.h }, game.catalog);
      });

      drawButtons(ctx, [back]);
    },
  };
}

/** One recipe: what you need, what it goes in, the heat, and what you get. */
function drawRecipe(ctx, recipe, box, catalog) {
  fillRR(ctx, box.x, box.y, box.w, box.h, 16, '#413945');

  // Four columns: ingredient, utensil, (arrow), result.
  const baseY = box.y + box.h - 26;
  const slot = box.w / 4.4;
  const at = (n) => box.x + slot * (0.6 + n);

  drawThing(ctx, catalog.get(recipe.needs), at(0), baseY, slot * 0.8, box.h - 60);
  drawPlus(ctx, at(0.5), box.y + box.h / 2 - 6);
  drawThing(ctx, catalog.get(recipe.in), at(1), baseY, slot * 0.8, box.h - 60);

  // The heat, under the pan, because that is where it is in the room too.
  drawFlame(ctx, at(1), baseY + 12);

  drawArrow(ctx, at(1.6), box.y + box.h / 2 - 6, slot * 0.7);
  drawThing(ctx, catalog.get(recipe.makes), at(2.6), baseY, slot * 0.9, box.h - 60);
}

function drawThing(ctx, def, cx, baseY, maxW, maxH) {
  if (!def) return;
  const fit = Math.min(1, maxW / def.w, maxH / def.h);
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(fit, fit);
  drawItemArt(ctx, def, 0);
  ctx.restore();
}

function drawPlus(ctx, cx, cy) {
  strokeLine(ctx, cx - 11, cy, cx + 11, cy, COLORS.inkDim, 5);
  strokeLine(ctx, cx, cy - 11, cx, cy + 11, COLORS.inkDim, 5);
}

function drawArrow(ctx, cx, cy, len) {
  strokeLine(ctx, cx - len / 2, cy, cx + len / 2 - 6, cy, COLORS.buttonActive, 6);
  ctx.fillStyle = COLORS.buttonActive;
  ctx.beginPath();
  ctx.moveTo(cx + len / 2 + 4, cy);
  ctx.lineTo(cx + len / 2 - 12, cy - 11);
  ctx.lineTo(cx + len / 2 - 12, cy + 11);
  ctx.closePath();
  ctx.fill();
}

/** The flame that says it has to go on the stove. */
function drawFlame(ctx, cx, cy) {
  ctx.fillStyle = '#f0a03c';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 20);
  ctx.quadraticCurveTo(cx + 12, cy - 8, cx + 7, cy + 2);
  ctx.quadraticCurveTo(cx + 3, cy + 9, cx, cy + 9);
  ctx.quadraticCurveTo(cx - 3, cy + 9, cx - 7, cy + 2);
  ctx.quadraticCurveTo(cx - 12, cy - 8, cx, cy - 20);
  ctx.closePath();
  ctx.fill();
  fillCircle(ctx, cx, cy + 2, 4.5, '#f7d06a');
}
