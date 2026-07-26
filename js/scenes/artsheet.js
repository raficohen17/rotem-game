/**
 * A contact sheet of every catalog item and a row of characters.
 *
 * This is a development tool, not part of the game — reach it with `?dev=art`.
 * It earns its place by being how a new drawing gets checked against the rest
 * of the set: dropping a PNG in and reloading shows immediately whether it
 * sits at the right size and weight next to everything else.
 */

import { drawItemArt } from '../render/catalog.js';
import { drawCharacter, CHAR_H } from '../render/character.js';
import { createCharacterSpec, PART_COUNTS } from '../model/character.js';

const CELL_W = 150;
const CELL_H = 150;
const COLS = 8;
const TOP = 96;

export function createArtSheet(game) {
  const items = game.catalog.items;
  const pageSize = COLS * 3;
  let page = 0;
  let scrollTarget = 0;

  // A few characters showing off different part combinations.
  const cast = [0, 1, 2, 3, 4, 5].map((i) => {
    const spec = createCharacterSpec();
    spec.skin = i % PART_COUNTS.skin;
    spec.hair = (i * 3) % PART_COUNTS.hair;
    spec.hairColor = (i * 2) % PART_COUNTS.hairColor;
    spec.eyes = i % PART_COUNTS.eyes;
    spec.mouth = (i * 2) % PART_COUNTS.mouth;
    spec.top = i % PART_COUNTS.top;
    spec.bottom = i % PART_COUNTS.bottom;
    spec.shoes = i % PART_COUNTS.shoes;
    spec.extra = i % PART_COUNTS.extra;
    return spec;
  });

  const pageCount = Math.ceil(items.length / pageSize);

  return {
    onTap(x) {
      page = x < 640 ? Math.max(0, page - 1) : Math.min(pageCount, page + 1);
      scrollTarget = page;
    },

    draw(ctx) {
      ctx.fillStyle = '#1d1830';
      ctx.fillRect(0, 0, 1280, 720);

      ctx.fillStyle = '#e8e2f5';
      ctx.font = '600 26px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(
        scrollTarget < pageCount
          ? `Art sheet — items ${scrollTarget * pageSize + 1}-${Math.min((scrollTarget + 1) * pageSize, items.length)} of ${items.length}`
          : 'Art sheet — characters',
        40, 52,
      );
      ctx.font = '400 18px system-ui, sans-serif';
      ctx.fillStyle = '#8a82a8';
      ctx.fillText('tap left / right to page', 40, 78);

      if (scrollTarget >= pageCount) {
        drawCast(ctx, cast, game.time);
        return;
      }

      const slice = items.slice(scrollTarget * pageSize, (scrollTarget + 1) * pageSize);
      slice.forEach((def, index) => {
        const col = index % COLS;
        const row = Math.floor(index / COLS);
        const cx = 100 + col * CELL_W;
        const cy = TOP + row * CELL_H + CELL_H - 30;

        ctx.fillStyle = '#262040';
        ctx.fillRect(cx - CELL_W / 2 + 6, cy - CELL_H + 24, CELL_W - 12, CELL_H - 12);

        ctx.save();
        ctx.translate(cx, cy);
        // Scale each item down to fit its cell so oversized art is obvious.
        const fit = Math.min(1, (CELL_W - 30) / def.w, (CELL_H - 52) / def.h);
        ctx.scale(fit, fit);
        drawItemArt(ctx, def, 0);
        ctx.restore();

        ctx.fillStyle = '#9a92b8';
        ctx.font = '400 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(def.id, cx, cy + 18);
        ctx.textAlign = 'left';
      });
    },
  };
}

function drawCast(ctx, cast, time) {
  cast.forEach((spec, index) => {
    const x = 180 + index * 165;
    const y = 520;

    ctx.fillStyle = '#262040';
    ctx.fillRect(x - 75, y - CHAR_H - 30, 150, CHAR_H + 50);

    ctx.save();
    ctx.translate(x, y);
    drawCharacter(ctx, spec, time + index * 0.7);
    ctx.restore();
  });
}
