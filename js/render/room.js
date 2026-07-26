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
import { shade } from './shapes.js';

export const ROOM_W = 1200;
export const ROOM_H = 520;

/** Where the wall meets the floor. Below this is walkable depth. */
export const FLOOR_Y = 380;

/** Baselines are clamped into this band so nothing lands out of reach. */
export const FLOOR_BAND = { top: FLOOR_Y + 10, bottom: ROOM_H - 10 };

export function drawRoomShell(ctx, room) {
  ctx.fillStyle = room.wall;
  ctx.fillRect(0, 0, ROOM_W, FLOOR_Y);

  // A soft skirting line so the wall and floor read as different surfaces even
  // when Rotem picks two similar colours.
  ctx.fillStyle = shade(room.wall, -0.18);
  ctx.fillRect(0, FLOOR_Y - 10, ROOM_W, 10);

  ctx.fillStyle = room.floor;
  ctx.fillRect(0, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);

  ctx.fillStyle = shade(room.floor, 0.12);
  ctx.fillRect(0, FLOOR_Y, ROOM_W, 6);
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

  ctx.save();
  ctx.strokeStyle = '#f7d04a';
  ctx.lineWidth = 5;
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(placed.x - w / 2 - 8, placed.y - h - 8, w + 16, h + 16);
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
