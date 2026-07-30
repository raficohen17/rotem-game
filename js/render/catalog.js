/**
 * The item catalog, and how an item gets drawn.
 *
 * An item is drawn from `assets/drawings/<id>.png` when one of Rotem's
 * drawings exists for it, and from the code-drawn placeholder otherwise. The
 * image load is fired off without being awaited, so the game starts instantly
 * on placeholders and a drawing pops in as soon as it arrives.
 *
 * Which drawings exist is read from a manifest rather than discovered by
 * trying to load all of them, because a miss costs a 404 round trip on every
 * cold start — forty-odd of them before Rotem has drawn anything. The
 * manifest is written by tools/make_sprite.py, so adding a drawing is still
 * one command and no code change.
 */

import { PLACEHOLDERS } from './placeholders.js';
import { paperLayer } from './shapes.js';
import { drawBook, drawBookFlat } from './book.js';
import { fillEllipse, strokeLine, shade } from './shapes.js';
import { isFood, eatenFraction } from '../model/food.js';

const DRAWINGS_DIR = 'assets/drawings';

async function loadDrawingIndex() {
  try {
    const response = await fetch(`${DRAWINGS_DIR}/index.json`);
    if (!response.ok) return new Set();
    const data = await response.json();
    return new Set(Array.isArray(data.drawings) ? data.drawings : []);
  } catch {
    return new Set(); // no manifest, or offline before it was cached
  }
}

/** Swaps a placeholder for a drawing once the image has decoded. */
function attachDrawing(item) {
  const image = new Image();
  image.addEventListener('load', () => { item.image = image; });
  image.addEventListener('error', () => { /* keep the placeholder */ });
  image.src = `${DRAWINGS_DIR}/${item.id}.png`;
}

export async function loadCatalog() {
  const response = await fetch('assets/catalog.json');
  if (!response.ok) throw new Error(`catalog.json: ${response.status}`);
  const data = await response.json();
  const drawn = await loadDrawingIndex();

  const byId = new Map();
  for (const raw of data.items) {
    const item = {
      ...raw,
      surface: raw.surface || 'floor',
      colors: raw.colors?.length ? raw.colors : ['#c98f5f'],
      image: null,
    };
    byId.set(item.id, item);
    if (drawn.has(item.id)) attachDrawing(item);
  }

  return {
    categories: data.categories,
    items: [...byId.values()],
    get: (id) => byId.get(id),
    /** Items in one drawer tab, in catalog order. */
    inCategory: (categoryId) => [...byId.values()].filter((i) => i.cat === categoryId),
  };
}

/**
 * Draws a placed item. The canvas is left as it was found.
 *
 * @param {{x: number, y: number, scale: number, flip: boolean, tint: number}} placed
 * @param {object} def catalog entry
 */
export function drawItem(ctx, placed, def) {
  ctx.save();
  ctx.translate(placed.x, placed.y);
  ctx.scale(placed.flip ? -placed.scale : placed.scale, placed.scale);
  if (placed.lying) {
    drawBookFlat(ctx, placed.design, placed.w ?? def.w, placed.h ?? def.h);
  } else {
    drawItemArt(ctx, def, placed.tint, placed.design);
  }
  ctx.restore();
}

/**
 * Draws an item at its natural size, origin at bottom centre.
 *
 * The paper shadow is applied here rather than inside each of the forty-odd
 * placeholders, which also means one of Rotem's scanned drawings picks up the
 * same treatment and sits in the room the same way the placeholders do.
 */
export function drawItemArt(ctx, def, tint = 0, design = null, placed = null) {
  paperLayer(ctx, () => {
    // A book is the one item whose art comes from the player rather than from
    // a placeholder or a drawing.
    if (def.id === 'book') {
      drawBook(ctx, design ?? { cover: tint }, def.w, def.h);
      return;
    }
    if (def.image) {
      ctx.drawImage(def.image, -def.w / 2, -def.h, def.w, def.h);
      return;
    }
    const paint = PLACEHOLDERS[def.id];
    if (!paint) return;
    // Food is drawn with a share of it missing, so a cake she has been eating
    // looks eaten rather than merely being a smaller number somewhere.
    const eaten = placed && isFood(placed) ? eatenFraction(placed) : 0;
    if (eaten > 0) {
      const color = def.colors[tint % def.colors.length];
      const kept = def.w * (1 - eaten);

      /*
       * The plate first, at its full size and outside the clip.
       *
       * Clipping the food alone made a part-eaten cake read as a smaller cake
       * rather than as a cake with slices taken out of it — nothing on screen
       * said how big it had started. A plate that stays the same size while the
       * cake on it shrinks is what carries that.
       */
      fillEllipse(ctx, 0, -def.h * 0.04, def.w * 0.52, def.h * 0.075, '#f2ece0');
      fillEllipse(ctx, 0, -def.h * 0.06, def.w * 0.44, def.h * 0.055, '#e6dccd');

      ctx.save();
      ctx.beginPath();
      ctx.rect(-def.w / 2, -def.h, kept, def.h);
      ctx.clip();
      paint(ctx, def.w, def.h, color);
      ctx.restore();

      // The cut face, so the straight edge reads as a knife rather than a crop.
      // Not on an empty plate: the game clears food away when it is finished,
      // but a drawer preview or a stray save should not show a knife mark
      // hanging in the air over nothing.
      if (eaten >= 1) return;
      const cutX = -def.w / 2 + kept;
      ctx.fillStyle = shade(color, 0.42);
      ctx.fillRect(cutX - 3, -def.h * 0.72, 3, def.h * 0.66);
      strokeLine(ctx, cutX, -def.h * 0.72, cutX, -def.h * 0.06, shade(color, -0.24), 1.6);
      return;
    }
    paint(ctx, def.w, def.h, def.colors[tint % def.colors.length]);
  });
}
