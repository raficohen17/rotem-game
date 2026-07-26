/**
 * The item catalog, and how an item gets drawn.
 *
 * Each item tries to load `assets/drawings/<id>.png` and falls back to the
 * code-drawn placeholder if there is none. The load is fired off without being
 * awaited, so the game starts instantly on placeholders and a drawing pops in
 * as soon as it arrives.
 *
 * The point of doing it this way: dropping a PNG named after an item is the
 * entire process of replacing its art. No catalog edit, no code change, no
 * build step.
 */

import { PLACEHOLDERS } from './placeholders.js';

const DRAWINGS_DIR = 'assets/drawings';

/** Loads a drawing for an item if one exists, quietly doing nothing if not. */
function attachDrawing(item) {
  const image = new Image();
  image.addEventListener('load', () => { item.image = image; });
  image.addEventListener('error', () => { /* no drawing yet — placeholder stays */ });
  image.src = `${DRAWINGS_DIR}/${item.id}.png`;
}

export async function loadCatalog() {
  const response = await fetch('assets/catalog.json');
  if (!response.ok) throw new Error(`catalog.json: ${response.status}`);
  const data = await response.json();

  const byId = new Map();
  for (const raw of data.items) {
    const item = {
      ...raw,
      surface: raw.surface || 'floor',
      colors: raw.colors?.length ? raw.colors : ['#c98f5f'],
      image: null,
    };
    byId.set(item.id, item);
    attachDrawing(item);
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
  drawItemArt(ctx, def, placed.tint);
  ctx.restore();
}

/** Draws an item at its natural size, origin at bottom centre. */
export function drawItemArt(ctx, def, tint = 0) {
  if (def.image) {
    ctx.drawImage(def.image, -def.w / 2, -def.h, def.w, def.h);
    return;
  }
  const paint = PLACEHOLDERS[def.id];
  if (!paint) return;
  paint(ctx, def.w, def.h, def.colors[tint % def.colors.length]);
}
