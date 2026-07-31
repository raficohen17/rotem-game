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
import { drawStrokes, faceRect } from './board.js';
import { fillEllipse, fillCircle, shade } from './shapes.js';
import { isFood, portionsLeft, wholePortions } from '../model/food.js';
import { isVessel, holds, fullness, drinkColor } from '../model/drink.js';

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
    /**
     * Items in one drawer tab, in catalog order.
     *
     * Anything a recipe makes is left out. With an omelette sitting in the
     * drawer next to the egg, cooking one was strictly worse than taking one —
     * the drawer was a cupboard that already held every meal, and the whole
     * activity had no reason to exist.
     */
    inCategory: (categoryId) => [...byId.values()]
      .filter((i) => i.cat === categoryId && !i.made),
  };
}

/**
 * The inside of each thing that holds a drink, as a fraction of its own size.
 *
 * Taken off the artwork rather than guessed, so the milk sits inside the glass
 * instead of floating over it. A bowl is wide and shallow and a glass is narrow
 * and tall, and the same drink has to look right in both.
 */
const INSIDE = {
  glass: { floor: 0.04, brim: 0.92, wFloor: 0.25, wBrim: 0.31 },
  // A mug is opaque, so its drink is only ever the surface in the mouth. That
  // is why a mug holds one mouthful: full and empty are the two states it can
  // actually show, and a level nobody can see is a level that is not there.
  mug: { floor: 0.83, brim: 0.85, wFloor: 0.34, wBrim: 0.34 },
  dog_bowl: { floor: 0.06, brim: 0.64, wFloor: 0.16, wBrim: 0.42 },
};

/**
 * What is in a glass: its colour, and how far up it comes.
 *
 * Both at once, because either alone is too little to see at the size a glass
 * really is in a room — a glass is 31 pixels tall on the phone, and one sip of
 * three is about a dozen of them. That is exactly how a part-eaten cake
 * shipped twice looking untouched.
 */
function drawContents(ctx, def, placed) {
  const drink = holds(placed);
  if (!drink) return;
  const shape = INSIDE[placed.item];
  if (!shape) return;

  const color = drinkColor(drink);
  const level = fullness(placed);
  const floorY = -def.h * shape.floor;
  const surfaceY = floorY - def.h * (shape.brim - shape.floor) * level;
  const wFloor = def.w * shape.wFloor;
  const wSurface = def.w * (shape.wFloor + (shape.wBrim - shape.wFloor) * level);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-wSurface, surfaceY);
  ctx.lineTo(wSurface, surfaceY);
  ctx.lineTo(wFloor, floorY);
  ctx.lineTo(-wFloor, floorY);
  ctx.closePath();
  ctx.fill();
  // The surface, which is what makes it read as liquid rather than as a block
  // of colour painted on the front of the glass.
  fillEllipse(ctx, 0, surfaceY, wSurface, def.h * 0.05, shade(color, 0.22));
  // An edge round the drink, because milk is very nearly the colour of the
  // paper the rooms are printed on and without it the glass reads as empty.
  ctx.strokeStyle = shade(color, -0.3);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-wSurface, surfaceY);
  ctx.lineTo(-wFloor, floorY);
  ctx.lineTo(wFloor, floorY);
  ctx.lineTo(wSurface, surfaceY);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, surfaceY, wSurface, def.h * 0.05, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/** The plate everything edible sits on, at the size it started. */
function drawPlate(ctx, def) {
  const w = def.w * 0.58;
  ctx.save();
  ctx.globalAlpha = 0.22;
  fillEllipse(ctx, 0, -def.h * 0.02, w, def.h * 0.09, '#000');
  ctx.restore();
  fillEllipse(ctx, 0, -def.h * 0.04, w, def.h * 0.085, '#fbf7f0');
  fillEllipse(ctx, 0, -def.h * 0.06, w * 0.86, def.h * 0.065, '#e2d8c6');
}

/**
 * What is left of something, portion by portion.
 *
 * Each remaining portion is drawn as its own slice of the whole with a gap
 * beside it, so how much is left can be counted rather than estimated.
 */
function drawPortions(ctx, def, color, placed, paint) {
  const whole = wholePortions(placed.item);
  const left = portionsLeft(placed);
  drawPlate(ctx, def);

  if (left <= 0) {
    // Crumbs. The end of a meal, and plainly not a cake.
    for (const [x, y, r] of [[-9, -5, 2.4], [-2, -8, 1.8], [5, -4, 2.2],
      [11, -7, 1.6], [-14, -8, 1.5], [1, -3, 1.4]]) {
      fillCircle(ctx, x * (def.w / 110), -def.h * 0.06 + y * 0.4, r, '#c9b48c');
    }
    return;
  }

  if (left >= whole) {
    paint(ctx, def.w, def.h, color);
    return;
  }

  // Each slice is a vertical band of the whole drawing, so whatever the food
  // looks like, its slices look like slices of it.
  const band = def.w / whole;
  for (let i = 0; i < left; i += 1) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-def.w / 2 + i * band + 1, -def.h * 1.2, band - 2, def.h * 1.2);
    ctx.clip();
    paint(ctx, def.w, def.h, color);
    ctx.restore();
    // The cut face of each slice, pale sponge against dark icing.
    const cut = -def.w / 2 + (i + 1) * band - 1;
    ctx.fillStyle = shade(color, 0.5);
    ctx.fillRect(cut - 2, -def.h * 0.74, 2, def.h * 0.66);
  }
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
    // `placed` matters: it carries how much of a cake is left. Without it
    // every item in every room was drawn in its untouched state, so a cake
    // with three slices gone looked exactly like a whole one.
    drawItemArt(ctx, def, placed.tint, placed.design, placed);
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
    // The board is drawn empty and then what she drew is painted onto it, so
    // the drawing is on the board rather than being the board.
    if (def.id === 'whiteboard') {
      PLACEHOLDERS.whiteboard(ctx, def.w, def.h, def.colors[tint % def.colors.length]);
      drawStrokes(ctx, design, faceRect(def.w, def.h));
      return;
    }
    const paint = PLACEHOLDERS[def.id];
    if (!paint) return;
    /*
     * Food is drawn as the portions it has left.
     *
     * A share clipped off the side was invisible: at the size a cake really is
     * in a room, three of its four slices gone looked exactly like a whole one,
     * because the difference was a dozen pixels of width and nothing else.
     * Whole portions with gaps between them can be counted at a glance, and an
     * empty plate with crumbs on it is unmistakably the end of a meal.
     */
    if (placed && isFood(placed)) {
      const color = def.colors[tint % def.colors.length];
      drawPortions(ctx, def, color, placed, paint);
      return;
    }
    // A glass is drawn, then what is in it over the top, so the level shows
    // through the side the way it does in a real one.
    if (placed && isVessel(placed)) {
      paint(ctx, def.w, def.h, def.colors[tint % def.colors.length]);
      drawContents(ctx, def, placed);
      return;
    }
    paint(ctx, def.w, def.h, def.colors[tint % def.colors.length]);
  });
}
