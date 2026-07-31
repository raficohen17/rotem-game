/**
 * Drawing a room's interior.
 *
 * A room is authored in its own 1200x520 local space with the wall above
 * FLOOR_Y and the floor below it, so the same function draws a room whether it
 * is filling the screen or shrunk into a quarter of the cutaway house. The
 * caller supplies the transform; this module knows nothing about either view.
 */

import { drawItem, drawItemArt } from './catalog.js';
import { holds, drinkColor } from '../model/drink.js';
import { drawBookOpen, drawBookFlat } from './book.js';
import {
  resolveUse, carriedItems, isOn, switchFor, isEating, CHEW_TIME,
} from '../model/using.js';
import { utensils, isOverHeat, cookingProgress } from '../model/recipes.js';
import { drawCharacter, CHAR_H } from './character.js';
import { drawCat } from './cat.js';
import { drawOrder } from '../model/geometry.js';
import {
  shade, deepen, fillRR, fillEllipse, fillCircle, fillPoly, roundRect, strokeLine,
} from './shapes.js';
import { litFill } from './materials.js';
import { partitionSide } from '../model/travel.js';

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

  if (room.id) drawOpenings(ctx, room);
}

/** Door height and width, in room coordinates. */
const DOOR = { w: 140, h: 250 };

/**
 * The doorway through the partition, flush with the edge of the room.
 *
 * Only the door is drawn here. The staircase spans two floors and a slab, so
 * it belongs to the house frame — drawn inside one room it rose to that room's
 * own ceiling and connected nothing, which is exactly as odd as it sounds.
 */
function drawOpenings(ctx, room) {
  const side = partitionSide(room.id);
  const doorX = side === 'right' ? ROOM_W - DOOR.w : 0;
  const top = FLOOR_Y - DOOR.h;

  // Light falls out of the opening onto this room's floor before anything
  // else is drawn, so furniture stands on top of the spill rather than under
  // it. A hole that throws light is the thing that stops it reading as a grey
  // panel stuck to the wall.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);
  ctx.clip();
  const spill = ctx.createLinearGradient(0, FLOOR_Y, 0, ROOM_H);
  spill.addColorStop(0, 'rgba(255, 246, 224, 0.34)');
  spill.addColorStop(1, 'rgba(255, 246, 224, 0)');
  ctx.fillStyle = spill;
  ctx.beginPath();
  const inner = side === 'right' ? doorX : DOOR.w;
  const outer = side === 'right' ? ROOM_W : 0;
  ctx.moveTo(inner, FLOOR_Y);
  ctx.lineTo(outer, FLOOR_Y);
  ctx.lineTo(outer + (side === 'right' ? 46 : -46), ROOM_H);
  ctx.lineTo(inner + (side === 'right' ? -80 : 80), ROOM_H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(doorX, top, DOOR.w, DOOR.h);
  ctx.clip();

  // The room beyond, falling away into shadow. A smooth ramp rather than the
  // two flat bands it used to be — a hard edge across the middle of a dark
  // rectangle is exactly what a raised panel looks like.
  const depth = ctx.createLinearGradient(0, top, 0, FLOOR_Y);
  depth.addColorStop(0, deepen(room.wall, 0.88));
  depth.addColorStop(0.55, deepen(room.wall, 0.74));
  depth.addColorStop(1, deepen(room.wall, 0.58));
  ctx.fillStyle = depth;
  ctx.fillRect(doorX, top, DOOR.w, DOOR.h);

  // Its floor, running away from us and catching a little light.
  ctx.fillStyle = deepen(room.floor, 0.58);
  ctx.fillRect(doorX, FLOOR_Y - 34, DOOR.w, 34);
  ctx.fillStyle = deepen(room.floor, 0.38);
  ctx.fillRect(doorX, FLOOR_Y - 12, DOOR.w, 12);

  // A wedge of light down the far jamb, so the opening has a near side and a
  // far side instead of being uniformly dark.
  const wedge = ctx.createLinearGradient(
    side === 'right' ? doorX + DOOR.w : doorX, 0,
    side === 'right' ? doorX + DOOR.w * 0.35 : doorX + DOOR.w * 0.65, 0,
  );
  wedge.addColorStop(0, 'rgba(255, 244, 220, 0.22)');
  wedge.addColorStop(1, 'rgba(255, 244, 220, 0)');
  ctx.fillStyle = wedge;
  ctx.fillRect(doorX, top, DOOR.w, DOOR.h);
  ctx.restore();

  // The casing: an architrave around the opening, mitred at the corner. The
  // old door had a jamb on one side only, which read as a picture frame with a
  // missing edge.
  const CASE = 14;
  const jambX = side === 'right' ? doorX - CASE : doorX + DOOR.w;
  ctx.fillStyle = litFill(ctx, top - CASE, CASE + 4, shade(room.wall, 0.2), 0.24);
  ctx.fillRect(
    side === 'right' ? doorX - CASE : doorX, top - CASE,
    DOOR.w + CASE, CASE + 4,
  );
  ctx.fillStyle = shade(room.wall, side === 'right' ? 0.02 : 0.14);
  ctx.fillRect(jambX, top - CASE, CASE, DOOR.h + CASE);

  // A shadow the casing casts onto the wall beside it.
  ctx.fillStyle = 'rgba(60, 44, 40, 0.1)';
  ctx.fillRect(side === 'right' ? jambX - 7 : jambX + CASE, top - CASE, 7, DOOR.h + CASE);

  // The threshold, worn lighter than the floor it interrupts.
  ctx.fillStyle = shade(room.floor, 0.2);
  ctx.fillRect(doorX, FLOOR_Y - 7, DOOR.w, 7);
  ctx.fillStyle = deepen(room.floor, 0.45);
  ctx.fillRect(doorX, FLOOR_Y - 8, DOOR.w, 1.5);
}

/**
 * A patch of floor for the pattern chips in the drawer.
 *
 * Given its own rectangle rather than the room's, because the chip is 94px
 * wide and the room is 1200. Scaling the room down into the chip squashed
 * every seam to a sixth of a pixel, which is why four of the six patterns used
 * to look like blank cream tiles — there was nothing to choose between them.
 */
export function drawFloorSample(ctx, color, style, area) {
  drawFloorPattern(ctx, color, style, area);
}

/**
 * The floor surface.
 *
 * Every pattern uses the same trick: rows get taller toward the front, so the
 * floor recedes. It is the cheapest depth cue available and the reason the
 * floor stops reading as a stripe of colour. The colour is chosen separately,
 * so six patterns and ten colours give sixty floors.
 *
 * Every feature size is a fraction of the area rather than a pixel count, so
 * the same code draws a plank floor across a 1200px room and across a 94px
 * chip with the same number of planks in both. Only the stroke widths are
 * absolute — a hairline has to stay a hairline at either size.
 */
function drawFloorPattern(ctx, color, style, area = FLOOR_AREA) {
  if (style === 'plain') return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();

  // Row boundaries, each band taller than the one behind it — the front of
  // the floor is nearer, so it takes up more room.
  const rows = 5;
  const bands = [];
  let y = area.y;
  for (let row = 0; row < rows; row += 1) {
    const h = (area.h / rows) * (0.62 + row * 0.19);
    bands.push({ top: y, height: h, row });
    y += h;
  }

  const painter = PATTERNS[style] ?? drawBoards;
  painter(ctx, color, bands, area);
  ctx.restore();
}

/** The floor band of a full-size room. */
const FLOOR_AREA = { x: 0, y: FLOOR_Y, w: ROOM_W, h: ROOM_H - FLOOR_Y };

/** A horizontal rule at the back of a band, where one row meets the next. */
function bandLine(ctx, band, area) {
  ctx.beginPath();
  ctx.moveTo(area.x, band.top + band.height);
  ctx.lineTo(area.x + area.w, band.top + band.height);
  ctx.stroke();
}

/** Long planks with staggered end joints. */
function drawBoards(ctx, color, bands, area) {
  ctx.strokeStyle = shade(color, -0.22);
  ctx.lineWidth = 2;

  for (const band of bands) {
    ctx.globalAlpha = 0.7;
    bandLine(ctx, band, area);

    ctx.globalAlpha = 0.45;
    const boardW = area.w * (0.158 + band.row * 0.025);
    const offset = (band.row % 2) * boardW * 0.5;
    for (let x = area.x + offset; x < area.x + area.w; x += boardW) {
      ctx.beginPath();
      ctx.moveTo(x, band.top);
      ctx.lineTo(x, band.top + band.height);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/** Square tiles with a grout line, aligned row to row. */
function drawTiles(ctx, color, bands, area) {
  ctx.strokeStyle = shade(color, -0.26);
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.65;

  for (const band of bands) {
    bandLine(ctx, band, area);

    const tileW = area.w * (0.08 + band.row * 0.013);
    for (let x = area.x; x < area.x + area.w; x += tileW) {
      ctx.beginPath();
      ctx.moveTo(x, band.top);
      ctx.lineTo(x, band.top + band.height);
      ctx.stroke();
    }
    // A highlight along the top of each row, so they read as glazed.
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(area.x, band.top + 2, area.w, Math.max(2, area.h * 0.02));
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/** Two-tone squares in a chequerboard. */
function drawChecker(ctx, color, bands, area) {
  const dark = shade(color, -0.24);

  for (const band of bands) {
    const tileW = area.w * (0.08 + band.row * 0.013);
    let i = band.row % 2;
    for (let x = area.x; x < area.x + area.w; x += tileW) {
      if (i % 2 === 0) {
        ctx.fillStyle = dark;
        ctx.fillRect(x, band.top, tileW, band.height);
      }
      i += 1;
    }
  }

  ctx.strokeStyle = shade(color, -0.34);
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.5;
  for (const band of bands) bandLine(ctx, band, area);
  ctx.globalAlpha = 1;
}

/** Short planks laid at alternating angles. */
function drawHerringbone(ctx, color, bands, area) {
  ctx.strokeStyle = shade(color, -0.24);
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;

  for (const band of bands) {
    const bottom = band.top + band.height;
    const step = area.w * (0.045 + band.row * 0.008);
    for (let x = area.x - step; x < area.x + area.w + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, bottom);
      ctx.lineTo(x + step * 0.5, band.top);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, band.top);
      ctx.lineTo(x + step * 0.5, bottom);
      ctx.stroke();
    }
    bandLine(ctx, band, area);
  }
  ctx.globalAlpha = 1;
}

/** Flecked pile, with no seams at all. */
function drawCarpet(ctx, color, bands, area) {
  ctx.globalAlpha = 0.4;
  for (const band of bands) {
    const step = area.w * (0.0217 - band.row * 0.0017);
    const size = Math.max(1.5, step * 0.14);
    for (let x = area.x + ((band.row * 11) % step); x < area.x + area.w; x += step) {
      for (let y = band.top + step / 2; y < band.top + band.height; y += step) {
        const shift = ((x / step) | 0) % 2 ? step / 2 : 0;
        ctx.fillStyle = ((x + y) | 0) % 3 ? shade(color, -0.14) : shade(color, 0.14);
        ctx.fillRect(x, y + shift, size, size);
      }
    }
  }
  ctx.globalAlpha = 1;
}

const PATTERNS = {
  boards: drawBoards,
  tiles: drawTiles,
  checker: drawChecker,
  herringbone: drawHerringbone,
  carpet: drawCarpet,
};

/**
 * Everything standing in the room, back to front.
 *
 * Characters and furniture share one ordering so a character can stand behind
 * a sofa or in front of it depending on where she is.
 */
export function roomContents(room, characters, catalog, cats = []) {
  const items = room.items.map((placed) => ({ kind: 'item', placed }));
  const cast = characters.map((character) => ({ kind: 'character', placed: character }));
  // Cats sort by where they are standing like everything else, so one on a
  // sofa draws in front of it and one behind a table draws behind it.
  const pets = cats.map((cat) => ({ kind: 'cat', placed: cat }));

  const lookup = (id) => catalog.get(id);
  const orderedItems = drawOrder(room.items, lookup);
  const rank = new Map(orderedItems.map((placed, index) => [placed, index]));
  const byUidEarly = new Map(room.items.map((item) => [item.uid, item]));
  // Characters rank after every item, so a tie on the baseline puts her in
  // front of the furniture rather than behind it. Without this they all fell
  // back to rank 0 and anything placed after the first item drew over them —
  // which is why sitting on a sofa put her behind its back.
  // Anything inside something ranks just after it, so it draws in the doorway
  // rather than behind the door.
  for (const entry of items) {
    if (!entry.placed.inside) continue;
    const host = byUidEarly.get(entry.placed.inside);
    if (host) rank.set(entry.placed, (rank.get(host) ?? 0) + 0.5);
  }

  cast.forEach((entry, i) => rank.set(entry.placed, orderedItems.length + i));
  pets.forEach((entry, i) => rank.set(entry.placed, orderedItems.length + cast.length + i));

  /*
   * A cat sitting on something sorts with that thing, not with where its paws
   * are.
   *
   * Settled on a sofa its baseline is halfway up the sofa, which is a smaller
   * y than the sofa's own — so by the ordinary rule it drew behind the sofa
   * and disappeared. Borrowing the host's baseline puts it level with what it
   * is sitting on, and ranking after every item puts it in front.
   */
  const byUid = new Map(room.items.map((item) => [item.uid, item]));
  const baseline = (entry) => {
    if (entry.kind === 'cat' && entry.placed.on) {
      const host = byUid.get(entry.placed.on);
      if (host) return host.y;
    }
    // Something in the fridge sits high up its front, which is a smaller
    // baseline than the fridge itself — so by the ordinary rule the cake drew
    // behind the fridge and was invisible through its own open door.
    if (entry.kind === 'item' && entry.placed.inside) {
      const host = byUid.get(entry.placed.inside);
      if (host) return host.y;
    }
    return entry.placed.y;
  };

  return [...items, ...cast, ...pets].sort((a, b) => {
    const aWall = a.kind === 'item' && lookup(a.placed.item)?.surface === 'wall';
    const bWall = b.kind === 'item' && lookup(b.placed.item)?.surface === 'wall';
    if (aWall !== bWall) return aWall ? -1 : 1;
    const az = a.placed.z ?? 0;
    const bz = b.placed.z ?? 0;
    if (az !== bz) return az - bz;
    const ay = baseline(a);
    const by = baseline(b);
    if (ay !== by) return ay - by;
    return (rank.get(a.placed) ?? 0) - (rank.get(b.placed) ?? 0);
  });
}

/**
 * @param {object[]} characters those standing in this room
 * @param {object|null} selected highlighted with a halo
 */
export function drawRoomContents(ctx, room, characters, catalog, time, selected = null, cats = []) {
  const carried = carriedItems(characters);
  // Whoever is mid-mouthful, and what they are holding.
  const eatenBy = new Map();
  for (const c of characters) {
    if (isEating(c, time)) eatenBy.set(c.eating.uid, c);
  }

  for (const entry of roomContents(room, characters, catalog, cats)) {
    if (entry.kind === 'cat') {
      ctx.save();
      ctx.translate(entry.placed.x, entry.placed.y);
      drawCat(ctx, entry.placed.spec, time, entry.placed.pose);
      ctx.restore();
      continue;
    }

    if (entry.placed === selected) drawSelectionHalo(ctx, entry, catalog);

    if (entry.kind === 'item') {
      // Something in somebody's hands is drawn there, not here as well.
      if (carried.has(entry.placed.uid)) continue;
      if (entry.placed.inside) {
        const host = room.items.find((i) => i.uid === entry.placed.inside);
        if (!host) continue;
        // In a pan it sits on top and is drawn plainly — watching it cook is
        // the whole point. Shut in the fridge it is only drawn with the door
        // open, so a closed door really does hide what is in it.
        if (utensils().includes(host.item)) {
          const def = catalog.get(entry.placed.item);
          if (def) drawItem(ctx, entry.placed, def);
          drawCooking(ctx, host, entry.placed, room, time);
          continue;
        }
        if (!isOn(host)) continue;
        drawInside(ctx, entry.placed, host, catalog);
        continue;
      }
      const def = catalog.get(entry.placed.item);
      if (def) drawItem(ctx, entry.placed, def);
      if (def && isOn(entry.placed)) drawSwitchedOn(ctx, entry.placed, def, time);
      const biter = eatenBy.get(entry.placed.uid);
      if (def && biter) drawBiting(ctx, entry.placed, def, time, biter.eating.until, biter.eating.drink);
    } else {
      const doing = resolveUse(entry.placed, room.items);
      const host = doing ? catalog.get(doing.item.item) : null;
      // Anchored to the object she is on, not to a constant: a stool and a
      // sofa are not the same height, and a fixed figure floats above one and
      // sinks into the other.
      const seatY = doing?.seat && host
        ? ((doing.item.h ?? host.h) * doing.item.scale) * doing.seat
        : undefined;

      ctx.save();
      ctx.translate(entry.placed.x, entry.placed.y);
      if (doing?.pose === 'lie') {
        // Lying is the standing figure turned on its side and laid on the
        // mattress, which needs no new joints at all. Turning about her feet
        // swings her whole length out to one side, so she is shifted half a
        // body first and ends up centred on the bed.
        //
        // Scaled to the bed she is on, because a 310-tall figure on a 300-wide
        // single bed hangs her feet off the end. A cot is shorter still.
        const bedW = host ? (doing.item.w ?? host.w) * doing.item.scale : CHAR_H;
        const fit = Math.min(1, (bedW * 0.94) / CHAR_H);
        ctx.translate((CHAR_H * fit) / 2, -(seatY ?? 0));
        ctx.rotate(-Math.PI / 2);
        ctx.scale(fit, fit);
      }
      drawCharacter(ctx, entry.placed.spec, time, {
        walking: Boolean(entry.placed.walk),
        facing: entry.placed.facing ?? 1,
        pose: doing?.pose === 'sit' ? 'sit' : 'stand',
        seatY,
        asleep: doing?.asleep === true,
      });
      if (doing?.action === 'read') drawReading(ctx, doing.item, host, time);
      ctx.restore();
      if (doing?.action === 'shower') drawShowerRunning(ctx, doing.item, time);
      if (doing?.action === 'bathe') drawBathWater(ctx, doing.item, host, time);
    }
  }
}

/**
 * The book she is reading, held up in front of her.
 *
 * Her own design is drawn, not a generic one, so the book she made is the
 * book she is reading. Small and tilted, at about the height a person holds
 * something they are looking at.
 */
function drawReading(ctx, item, def, time) {
  // Cover out, not the flat pile drawing that was here first — that shows the
  // spine and the page edges, so the cover Rotem designed was the one thing
  // you could not see while she was reading it.
  const sway = Math.sin(time * 1.2) * 0.025;
  ctx.save();
  // Sized from the book itself: each panel is a third of the cover she made,
  // so the open pair is about a third of the object she picked up. Drawn any
  // larger it stops being something she is holding and becomes something she
  // is hiding behind.
  const w = (item.w ?? def?.w ?? 96) * item.scale;
  const h = (item.h ?? def?.h ?? 136) * item.scale;
  ctx.translate(0, -142);
  ctx.rotate(-0.04 + sway);
  drawBookOpen(ctx, item.design ?? {}, w * 0.6, h * 0.3);
  ctx.restore();
}

/**
 * The curtain pulled across the shower, with the water running.
 *
 * Drawn after she is, so she is behind it: a shower you can see straight
 * through is not a shower, and hiding her is the joke a child is after.
 */
function drawShowerRunning(ctx, item, time) {
  const w = (item.w ?? 180) * item.scale;
  const h = (item.h ?? 330) * item.scale;
  const left = item.x - w / 2;
  const top = item.y - h;

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, w, h);
  ctx.clip();

  // The curtain, closed, with folds.
  const curtain = 'rgba(214, 232, 240, 0.9)';
  fillRR(ctx, left + w * 0.1, top + h * 0.16, w * 0.86, h * 0.66, 4, curtain);
  ctx.strokeStyle = 'rgba(150, 180, 196, 0.55)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 6; i += 1) {
    const x = left + w * 0.1 + (w * 0.86 * i) / 6;
    ctx.beginPath();
    ctx.moveTo(x, top + h * 0.16);
    ctx.lineTo(x, top + h * 0.82);
    ctx.stroke();
  }

  // Water last, so it runs down the front of the curtain. Behind it the
  // curtain hid it completely, which left a shower that was plainly not on.
  ctx.strokeStyle = 'rgba(150, 205, 226, 0.75)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i += 1) {
    const x = left + w * (0.2 + (i / 9) * 0.62);
    const drop = (time * 260 + i * 53) % (h * 0.62);
    ctx.beginPath();
    ctx.moveTo(x, top + h * 0.2 + drop);
    ctx.lineTo(x, top + h * 0.2 + drop + 18);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * What a switched-on object looks like.
 *
 * Drawn over the item rather than baked into its art, so one placeholder
 * covers both states and Rotem's own drawing of a lamp would light up the same
 * way without her having to draw it twice.
 */
function drawSwitchedOn(ctx, placed, def, time) {
  const w = (placed.w ?? def.w) * placed.scale;
  const h = (placed.h ?? def.h) * placed.scale;
  const cx = placed.x;
  const top = placed.y - h;

  switch (switchFor(placed.item)) {
    case 'light': {
      // A pool of light on the floor and a glow at the shade. The radius has a
      // floor of its own, or a small table lamp lights almost nothing.
      const reach = Math.max(200, h * 1.1);
      const glow = ctx.createRadialGradient(cx, top + h * 0.2, 4, cx, top + h * 0.2, reach);
      glow.addColorStop(0, 'rgba(255, 226, 150, 0.55)');
      glow.addColorStop(0.45, 'rgba(255, 220, 140, 0.16)');
      glow.addColorStop(1, 'rgba(255, 214, 130, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, top + h * 0.2, reach, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'watch': {
      // Light added to the screen rather than laid over it. A pale rectangle
      // on top washed the picture out, so a television that was on looked
      // faded rather than lit.
      const flicker = 0.28 + Math.sin(time * 7.3) * 0.07 + Math.sin(time * 3.1) * 0.05;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0.12, Math.min(0.45, flicker));
      fillRR(ctx, cx - w * 0.36, top + h * 0.16, w * 0.72, h * 0.46, 4, '#9ec8e8');
      ctx.restore();
      const spill = ctx.createRadialGradient(cx, top + h * 0.4, 6, cx, top + h * 0.4, w * 1.1);
      spill.addColorStop(0, 'rgba(180, 220, 245, 0.22)');
      spill.addColorStop(1, 'rgba(180, 220, 245, 0)');
      ctx.fillStyle = spill;
      ctx.beginPath();
      ctx.arc(cx, top + h * 0.4, w * 1.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'open': {
      /*
       * The door swung open, and something behind it.
       *
       * This was a flat pale rectangle with three hairlines across it, which
       * read as a white box rather than as a fridge standing open. What sells
       * it is depth — a back wall further away than the sides, shelves with a
       * thickness you can see, and cold light falling out onto the floor.
       *
       * The shelves are drawn at the heights food is actually put on, so a
       * carton sits on a shelf rather than near one.
       */
      const left = cx - w * 0.3;
      const right = cx + w * 0.28;
      const inTop = top + h * 0.08;
      const inBottom = top + h * 0.93;

      // Light spilling out onto the floor in front of it.
      const spill = ctx.createLinearGradient(0, inBottom, 0, placed.y + 26);
      spill.addColorStop(0, 'rgba(206, 232, 240, 0.5)');
      spill.addColorStop(1, 'rgba(206, 232, 240, 0)');
      ctx.fillStyle = spill;
      fillPoly(ctx, [left, inBottom, right, inBottom,
        right + w * 0.16, placed.y + 26, left - w * 0.16, placed.y + 26]);

      // The cavity: back wall, then side and top walls angled in to it.
      const inset = w * 0.09;
      fillRR(ctx, left, inTop, right - left, inBottom - inTop, 5, '#b9ccd4');
      fillPoly(ctx, [left, inTop, right, inTop,
        right - inset, inTop + inset * 0.7, left + inset, inTop + inset * 0.7], '#a8bcc6');
      fillPoly(ctx, [left, inTop, left + inset, inTop + inset * 0.7,
        left + inset, inBottom - inset * 0.4, left, inBottom], '#c6d8de');
      fillPoly(ctx, [right, inTop, right - inset, inTop + inset * 0.7,
        right - inset, inBottom - inset * 0.4, right, inBottom], '#9fb4bf');
      // The back wall, lit.
      fillRR(ctx, left + inset, inTop + inset * 0.7,
        (right - left) - inset * 2, (inBottom - inTop) - inset * 1.1, 3, '#e4f2f6');

      // Shelves, at the heights things are actually put on.
      for (const at of [0.28, 0.5, 0.72]) {
        const y = top + h * at;
        fillRR(ctx, left + inset * 0.4, y - 3, (right - left) - inset * 0.8, 4, 2, '#f4fafc');
        ctx.save();
        ctx.globalAlpha = 0.3;
        fillRR(ctx, left + inset * 0.6, y + 1, (right - left) - inset * 1.2, 5, 2, '#7f98a4');
        ctx.restore();
      }

      // The door itself, swung wide to the right, seen edge on.
      const hinge = right + 2;
      const doorW = w * 0.2;
      fillPoly(ctx, [hinge, top + h * 0.04, hinge + doorW, top + h * 0.1,
        hinge + doorW, placed.y - h * 0.02, hinge, placed.y - h * 0.06], '#dfe8ec');
      fillPoly(ctx, [hinge, top + h * 0.04, hinge + doorW * 0.24, top + h * 0.055,
        hinge + doorW * 0.24, placed.y - h * 0.05, hinge, placed.y - h * 0.06], '#c2d0d6');
      // Its handle, on the inside face.
      fillRR(ctx, hinge + doorW * 0.55, top + h * 0.3, 5, h * 0.3, 2.5, '#9fb0b8');
      break;
    }

    case 'cook': {
      /*
       * A lit hob, and nothing else.
       *
       * This drew a pot with steam coming off it, which was fine when turning
       * the stove on was the whole of cooking. Now that pans are real objects
       * it put an imaginary pot beside the real one — so it shows the heat and
       * leaves the cooking to whatever is actually standing on it.
       */
      for (const side of [-1, 1]) {
        const rx = cx + side * w * 0.2;
        ctx.save();
        ctx.globalAlpha = 0.55 + Math.sin(time * 5 + side) * 0.12;
        const flame = ctx.createRadialGradient(rx, top + 8, 2, rx, top + 8, w * 0.22);
        flame.addColorStop(0, 'rgba(255, 190, 90, 0.95)');
        flame.addColorStop(1, 'rgba(255, 140, 60, 0)');
        ctx.fillStyle = flame;
        ctx.beginPath();
        ctx.arc(rx, top + 8, w * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    default:
      break;
  }
}

/**
 * The moment of eating or drinking, over the thing itself.
 *
 * Drawn where the food is, at the size the food is. Lifting it into her hands
 * at a smaller scale to show her holding it made the cake appear to shrink and
 * then grow back again when she finished, and a size that changes is read as
 * the amount of cake — so it said the opposite of what happened.
 *
 * A sip throws drops the colour of the drink rather than crumbs, because
 * crumbs off a glass of milk say the wrong thing about what just happened.
 */
function drawBiting(ctx, food, def, time, until, drinking = null) {
  const left = until - time;
  const swing = Math.sin(Math.max(0, Math.min(1, 1 - left / CHEW_TIME)) * Math.PI);
  if (swing <= 0) return;

  const drink = drinking ?? holds(food);
  const color = drink ? drinkColor(drink) : '#e2d3b6';
  const h = (food.h ?? def.h) * food.scale;
  ctx.save();
  ctx.globalAlpha = 0.8 * swing;
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    const spread = 14 + swing * 22;
    fillCircle(ctx, food.x + Math.cos(a) * spread,
      food.y - h * 0.6 + Math.sin(a) * spread * 0.6 + swing * 14,
      2.6 - i * 0.2, color);
  }
  ctx.restore();
}

/** The water she is sitting in, drawn over her so she is in it, not on it. */
function drawBathWater(ctx, item, def, time) {
  if (!def) return;
  const w = (item.w ?? def.w) * item.scale;
  const h = (item.h ?? def.h) * item.scale;
  const left = item.x - w / 2;
  const top = item.y - h;

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top + h * 0.3, w, h * 0.7);
  ctx.clip();
  ctx.globalAlpha = 0.72;
  fillRR(ctx, left + w * 0.06, top + h * 0.5, w * 0.88, h * 0.46, 8, '#a9d6e5');
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 4; i += 1) {
    const bob = Math.sin(time * 1.6 + i) * 3;
    fillEllipse(ctx, left + w * (0.2 + i * 0.2), top + h * 0.52 + bob, 11, 5, '#e8f4f8');
  }
  ctx.restore();
}

/**
 * That something is cooking, without a word of it written.
 *
 * A wait with nothing to watch is indistinguishable from a thing that is
 * broken — which is exactly how the cat read before it moved often enough to
 * be seen doing it.
 */
function drawCooking(ctx, utensil, contents, room, time) {
  if (!isOverHeat(utensil, room.items, isOn)) return;
  if (cookingProgress(utensil, contents) <= 0) return;

  const top = contents.y - 26;

  // A little heat under the pan, so the stove is plainly doing the work.
  ctx.save();
  ctx.globalAlpha = 0.3 + Math.sin(time * 6) * 0.07;
  fillEllipse(ctx, utensil.x, utensil.y - 2, 34, 7, '#f0a03c');
  ctx.restore();

  // Steam.
  ctx.save();
  ctx.strokeStyle = 'rgba(240, 236, 228, 0.62)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i += 1) {
    const drift = Math.sin(time * 2.4 + i * 1.7) * 6;
    ctx.beginPath();
    ctx.moveTo(contents.x + i * 15, top);
    ctx.quadraticCurveTo(contents.x + i * 15 + drift + 5, top - 20,
      contents.x + i * 15 + drift, top - 42);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Something on a shelf in the fridge, seen through the open door.
 *
 * Drawn at the item's own position rather than at a shelf worked out here.
 * Computed in two places the two drifted apart, and she ended up tapping a
 * cake that was not where it looked.
 */
function drawInside(ctx, placed, host, catalog) {
  const hostDef = catalog.get(host.item);
  const def = catalog.get(placed.item);
  if (!hostDef || !def) return;

  const hw = (host.w ?? hostDef.w) * host.scale;
  const hh = (host.h ?? hostDef.h) * host.scale;
  const top = host.y - hh;

  ctx.save();
  // Clipped to the door opening, so nothing pokes out through the side.
  ctx.beginPath();
  ctx.rect(host.x - hw * 0.3, top + hh * 0.1, hw * 0.58, hh * 0.8);
  ctx.clip();
  ctx.translate(placed.x, placed.y);
  drawItemArt(ctx, def, placed.tint, placed.design, placed);
  ctx.restore();
}

function drawSelectionHalo(ctx, entry, catalog) {
  const { placed } = entry;
  let w = 120;
  let h = 260;

  if (entry.kind === 'item') {
    const def = catalog.get(placed.item);
    if (!def) return;
    // The placed item may override its size — a book laid flat on a pile is
    // a quarter the height of the same book standing up.
    w = (placed.w ?? def.w) * placed.scale;
    h = (placed.h ?? def.h) * placed.scale;
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
