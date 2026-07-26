/**
 * Drawing a room's interior.
 *
 * A room is authored in its own 1200x520 local space with the wall above
 * FLOOR_Y and the floor below it, so the same function draws a room whether it
 * is filling the screen or shrunk into a quarter of the cutaway house. The
 * caller supplies the transform; this module knows nothing about either view.
 */

import { drawItem } from './catalog.js';
import { drawCharacter } from './character.js';
import { drawOrder } from '../model/geometry.js';
import { shade, fillRR, roundRect } from './shapes.js';
import { litFill } from './materials.js';

export const ROOM_W = 1200;
export const ROOM_H = 520;

/** Where the wall meets the floor. Below this is walkable depth. */
export const FLOOR_Y = 380;

/** Baselines are clamped into this band so nothing lands out of reach. */
export const FLOOR_BAND = { top: FLOOR_Y + 10, bottom: ROOM_H - 10 };

/**
 * The empty room: wall, skirting and floor.
 *
 * This is behind every screen in the game, so it carries more weight than any
 * single piece of furniture. It used to be two flat rectangles. It now has a
 * wall that falls off toward the floor, a proper skirting board with a lip,
 * and floorboards that shorten toward the back — the cheapest depth cue there
 * is, and the one that stops the floor reading as a stripe of colour.
 */
export function drawRoomShell(ctx, room) {
  const skirtH = 22;
  const skirtY = FLOOR_Y - skirtH;

  // Wall, brightest at the top where the light comes from.
  ctx.fillStyle = litFill(ctx, 0, FLOOR_Y, room.wall, 0.1);
  ctx.fillRect(0, 0, ROOM_W, FLOOR_Y);

  // Floor, with boards running away from the viewer.
  ctx.fillStyle = litFill(ctx, FLOOR_Y, ROOM_H - FLOOR_Y, room.floor, 0.08);
  ctx.fillRect(0, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);
  drawFloorPattern(ctx, room.floor, room.floorStyle);

  // Skirting board: a face, a lip along the top, and a shadow it casts down
  // onto the floor.
  ctx.fillStyle = shade(room.wall, -0.16);
  ctx.fillRect(0, skirtY, ROOM_W, skirtH);
  ctx.fillStyle = shade(room.wall, 0.16);
  ctx.fillRect(0, skirtY, ROOM_W, 4);
  ctx.fillStyle = shade(room.wall, -0.3);
  ctx.fillRect(0, FLOOR_Y - 3, ROOM_W, 3);

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, FLOOR_Y, ROOM_W, 14);
  ctx.restore();
}

/**
 * The floor surface.
 *
 * Every pattern uses the same trick: rows get taller toward the front, so the
 * floor recedes. It is the cheapest depth cue available and the reason the
 * floor stops reading as a stripe of colour. The colour is chosen separately,
 * so six patterns and ten colours give sixty floors.
 */
export function drawFloorSample(ctx, color, style = 'boards') {
  drawFloorPattern(ctx, color, style);
}

function drawFloorPattern(ctx, color, style = 'boards') {
  if (style === 'plain') return;

  const depth = ROOM_H - FLOOR_Y;
  const rows = 5;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, FLOOR_Y, ROOM_W, depth);
  ctx.clip();

  // Row boundaries, each band taller than the one behind it.
  const bands = [];
  let y = FLOOR_Y;
  for (let row = 0; row < rows; row += 1) {
    const h = (depth / rows) * (0.62 + row * 0.19);
    bands.push({ top: y, height: h });
    y += h;
  }

  if (style === 'carpet') drawCarpet(ctx, color, bands);
  else if (style === 'checker') drawChecker(ctx, color, bands);
  else if (style === 'tiles') drawTiles(ctx, color, bands, false);
  else if (style === 'herringbone') drawHerringbone(ctx, color, bands);
  else drawBoards(ctx, color, bands);

  ctx.restore();
}

/** Long planks with staggered end joints. */
function drawBoards(ctx, color, bands) {
  ctx.strokeStyle = shade(color, -0.22);
  ctx.lineWidth = 2;

  bands.forEach((band, row) => {
    const bottom = band.top + band.height;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, bottom);
    ctx.lineTo(ROOM_W, bottom);
    ctx.stroke();

    ctx.globalAlpha = 0.45;
    const boardW = 190 + row * 30;
    const offset = (row % 2) * boardW * 0.5;
    for (let x = offset; x < ROOM_W; x += boardW) {
      ctx.beginPath();
      ctx.moveTo(x, band.top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
  });
  ctx.globalAlpha = 1;
}

/** Square tiles with a grout line, aligned row to row. */
function drawTiles(ctx, color, bands) {
  ctx.strokeStyle = shade(color, -0.26);
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.65;

  bands.forEach((band, row) => {
    const bottom = band.top + band.height;
    ctx.beginPath();
    ctx.moveTo(0, bottom);
    ctx.lineTo(ROOM_W, bottom);
    ctx.stroke();

    const tileW = 96 + row * 16;
    for (let x = 0; x < ROOM_W; x += tileW) {
      ctx.beginPath();
      ctx.moveTo(x, band.top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
    // A highlight along the top of each tile, so they read as glazed.
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, band.top + 2, ROOM_W, 3);
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

/** Two-tone squares in a chequerboard. */
function drawChecker(ctx, color, bands) {
  const dark = shade(color, -0.24);

  bands.forEach((band, row) => {
    const tileW = 96 + row * 16;
    let i = row % 2;
    for (let x = 0; x < ROOM_W; x += tileW) {
      if (i % 2 === 0) {
        ctx.fillStyle = dark;
        ctx.fillRect(x, band.top, tileW, band.height);
      }
      i += 1;
    }
  });

  ctx.strokeStyle = shade(color, -0.34);
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.5;
  bands.forEach((band) => {
    const bottom = band.top + band.height;
    ctx.beginPath();
    ctx.moveTo(0, bottom);
    ctx.lineTo(ROOM_W, bottom);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

/** Short planks laid at alternating angles. */
function drawHerringbone(ctx, color, bands) {
  ctx.strokeStyle = shade(color, -0.24);
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;

  bands.forEach((band, row) => {
    const bottom = band.top + band.height;
    const step = 54 + row * 10;
    for (let x = -step; x < ROOM_W + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, bottom);
      ctx.lineTo(x + step * 0.5, band.top);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, band.top);
      ctx.lineTo(x + step * 0.5, bottom);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, bottom);
    ctx.lineTo(ROOM_W, bottom);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

/** Flecked pile, with no seams at all. */
function drawCarpet(ctx, color, bands) {
  ctx.globalAlpha = 0.4;
  bands.forEach((band, row) => {
    const size = 3 + row * 0.8;
    const step = 26 - row * 2;
    for (let x = (row * 11) % step; x < ROOM_W; x += step) {
      for (let y = band.top + step / 2; y < band.top + band.height; y += step) {
        const shift = ((x / step) | 0) % 2 ? step / 2 : 0;
        ctx.fillStyle = ((x + y) | 0) % 3 ? shade(color, -0.14) : shade(color, 0.14);
        ctx.fillRect(x, y + shift, size, size);
      }
    }
  });
  ctx.globalAlpha = 1;
}

/**
 * Everything standing in the room, back to front.
 *
 * Characters and furniture share one ordering so a character can stand behind
 * a sofa or in front of it depending on where she is.
 */
export function roomContents(room, characters, catalog) {
  const items = room.items.map((placed) => ({ kind: 'item', placed }));
  const cast = characters.map((character) => ({ kind: 'character', placed: character }));

  const lookup = (id) => catalog.get(id);
  const orderedItems = drawOrder(room.items, lookup);
  const rank = new Map(orderedItems.map((placed, index) => [placed, index]));

  return [...items, ...cast].sort((a, b) => {
    const aWall = a.kind === 'item' && lookup(a.placed.item)?.surface === 'wall';
    const bWall = b.kind === 'item' && lookup(b.placed.item)?.surface === 'wall';
    if (aWall !== bWall) return aWall ? -1 : 1;
    const az = a.placed.z ?? 0;
    const bz = b.placed.z ?? 0;
    if (az !== bz) return az - bz;
    if (a.placed.y !== b.placed.y) return a.placed.y - b.placed.y;
    return (rank.get(a.placed) ?? 0) - (rank.get(b.placed) ?? 0);
  });
}

/**
 * @param {object[]} characters those standing in this room
 * @param {object|null} selected highlighted with a halo
 */
export function drawRoomContents(ctx, room, characters, catalog, time, selected = null) {
  for (const entry of roomContents(room, characters, catalog)) {
    if (entry.placed === selected) drawSelectionHalo(ctx, entry, catalog);

    if (entry.kind === 'item') {
      const def = catalog.get(entry.placed.item);
      if (def) drawItem(ctx, entry.placed, def);
    } else {
      ctx.save();
      ctx.translate(entry.placed.x, entry.placed.y);
      drawCharacter(ctx, entry.placed.spec, time);
      ctx.restore();
    }
  }
}

function drawSelectionHalo(ctx, entry, catalog) {
  const { placed } = entry;
  let w = 120;
  let h = 260;

  if (entry.kind === 'item') {
    const def = catalog.get(placed.item);
    if (!def) return;
    w = def.w * placed.scale;
    h = def.h * placed.scale;
  }

  // A soft rounded glow rather than a hard dashed box — the old one looked
  // like a marquee tool sitting on top of drawn furniture.
  const x = placed.x - w / 2 - 12;
  const y = placed.y - h - 12;
  const bw = w + 24;
  const bh = h + 24;

  ctx.save();
  ctx.globalAlpha = 0.22;
  fillRR(ctx, x, y, bw, bh, 16, '#f0c86a');
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = '#f0c86a';
  ctx.lineWidth = 3.5;
  ctx.setLineDash([13, 9]);
  roundRect(ctx, x, y, bw, bh, 16);
  ctx.stroke();
  ctx.restore();
}

/**
 * Renders the whole house into a small JPEG for the menu.
 *
 * Kept deliberately small — ten of these live in localStorage alongside the
 * worlds themselves, and blowing the quota would cost Rotem her houses.
 *
 * @param {string[]} roomIds in cutaway order: top-left, top-right, then below
 */
export function renderHouseThumbnail(world, roomIds, catalog, width = 240) {
  const cellW = width / 2;
  const cellH = (cellW * ROOM_H) / ROOM_W;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width);
  canvas.height = Math.round(cellH * 2);

  const ctx = canvas.getContext('2d');
  roomIds.forEach((id, index) => {
    const room = world.rooms[id];
    if (!room) return;
    ctx.save();
    ctx.translate((index % 2) * cellW, Math.floor(index / 2) * cellH);
    ctx.beginPath();
    ctx.rect(0, 0, cellW, cellH);
    ctx.clip();
    ctx.scale(cellW / ROOM_W, cellH / ROOM_H);
    drawRoomShell(ctx, room);
    const cast = world.characters.filter((c) => c.room === id);
    drawRoomContents(ctx, room, cast, catalog, 0);
    ctx.restore();
  });

  return canvas.toDataURL('image/jpeg', 0.68);
}
