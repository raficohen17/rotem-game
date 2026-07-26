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
