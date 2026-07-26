/**
 * The cutaway house: four rooms, two per floor, all visible at once.
 *
 * This is the home screen of a world. Rooms are not edited here — a quarter of
 * the screen is too small to drag a sofa around with a child's finger — so a
 * tap zooms the room to fill the screen instead.
 *
 * The house is drawn as one object rather than as four panels. That distinction
 * is the whole design: the gaps between the rooms are not gaps, they are the
 * structure — a floor slab between the storeys, a partition wall between the
 * rooms, outer walls around the lot, a roof on top. Drawn as four clipped
 * rectangles with black between them it read as four disconnected screens; the
 * same four rooms inside a shell read as a dolls' house sitting on a shelf.
 */

import { button, hitTest, drawButtons, drawTitle, COLORS, TOUCH } from '../ui/widgets.js';
import { fillRR, fillEllipse, fillPoly, roundRect, shade } from '../render/shapes.js';
import { litFill, sideLit, woodGrain, within } from '../render/materials.js';
import { drawRoomShell, drawRoomContents, ROOM_W, ROOM_H, renderHouseThumbnail } from '../render/room.js';
import { HOUSE_LAYOUT } from '../model/world.js';
import { createRoomScene } from './room.js';

/** The painted carcass. Warm cream with a rose roof, to match the rooms. */
const EXTERIOR = '#ecdfd0';
const ROOF = '#c9707f';
const TRIM = '#f6f1e8';

/** Outer wall, the slab between storeys, and the partition between rooms. */
const WALL = 20;
const SLAB = 24;
const PARTITION = 18;

const CELL_W = 516;
const CELL_H = Math.round((CELL_W * ROOM_H) / ROOM_W);
const CELL_SCALE = CELL_W / ROOM_W;

const BODY = {
  w: CELL_W * 2 + PARTITION + WALL * 2,
  h: CELL_H * 2 + SLAB + WALL * 2,
};
BODY.x = Math.round((1280 - BODY.w) / 2);
BODY.y = 168;

const ROOF_HEIGHT = 96;
const ROOF_OVERHANG = 34;

export function cellBox(index) {
  const col = index % 2;
  const row = Math.floor(index / 2);
  return {
    x: BODY.x + WALL + col * (CELL_W + PARTITION),
    y: BODY.y + WALL + row * (CELL_H + SLAB),
    w: CELL_W,
    h: CELL_H,
  };
}

export function createHouse(game) {
  const back = button('back', 1186, 24, TOUCH, TOUCH, { icon: 'home', round: true });

  const rooms = HOUSE_LAYOUT.map((id, index) => {
    const box = cellBox(index);
    return button(`room:${id}`, box.x, box.y, box.w, box.h, { roomId: id });
  });

  return {
    controls: [...rooms, back],

    onTap(x, y) {
      const hit = hitTest(this.controls, x, y);
      if (!hit) return;

      if (hit.id === 'back') {
        // The thumbnail is refreshed on the way out, so the menu always shows
        // the house as Rotem last left it.
        game.world.thumb = renderHouseThumbnail(game.world, HOUSE_LAYOUT, game.catalog);
        game.persist();
        game.goMenu();
        return;
      }
      if (hit.roomId) game.setScene(createRoomScene(game, hit.roomId));
    },

    draw(ctx) {
      ctx.fillStyle = COLORS.backdrop;
      ctx.fillRect(0, 0, 1280, 720);

      drawStanding(ctx);
      drawRoof(ctx);
      drawCarcass(ctx);

      HOUSE_LAYOUT.forEach((id, index) => {
        const box = cellBox(index);
        const room = game.world.rooms[id];

        ctx.save();
        ctx.beginPath();
        ctx.rect(box.x, box.y, box.w, box.h);
        ctx.clip();
        ctx.translate(box.x, box.y);
        ctx.scale(CELL_SCALE, CELL_SCALE);
        drawRoomShell(ctx, room);
        drawRoomContents(ctx, room, game.charactersIn(id), game.catalog, game.time);
        ctx.restore();

        drawRecess(ctx, box);
      });

      drawStructure(ctx);
      drawTitle(ctx, game.world.name, BODY.x + 6, BODY.y - ROOF_HEIGHT - 26, 30);
      drawButtons(ctx, [back]);
    },
  };
}

// ---------------------------------------------------------------- drawing

/** The glow and shadow that put the house on a surface rather than in a void. */
function drawStanding(ctx) {
  const cx = BODY.x + BODY.w / 2;
  const baseY = BODY.y + BODY.h;

  const glow = ctx.createRadialGradient(cx, baseY - 160, 60, cx, baseY - 160, 620);
  glow.addColorStop(0, 'rgba(240, 200, 106, 0.13)');
  glow.addColorStop(1, 'rgba(240, 200, 106, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1280, 720);

  ctx.save();
  ctx.globalAlpha = 0.4;
  fillEllipse(ctx, cx, baseY + 22, BODY.w * 0.52, 26, '#000');
  ctx.restore();
}

/** A gable roof with tile courses, a ridge and a chimney. */
function drawRoof(ctx) {
  const left = BODY.x - ROOF_OVERHANG;
  const right = BODY.x + BODY.w + ROOF_OVERHANG;
  const base = BODY.y + 6;
  const apex = BODY.y - ROOF_HEIGHT;
  const cx = BODY.x + BODY.w / 2;

  // Chimney first, so the roof laps over its base.
  const chimX = BODY.x + BODY.w * 0.72;
  fillRR(ctx, chimX, apex + 6, 54, 74, 4, sideLit(ctx, chimX, 54, shade(ROOF, -0.34), 0.16));
  fillRR(ctx, chimX - 6, apex + 2, 66, 14, 4, shade(ROOF, -0.2));

  ctx.fillStyle = litFill(ctx, apex, base - apex, ROOF, 0.16);
  fillPoly(ctx, [cx, apex, right, base, left, base], ctx.fillStyle);

  // Tile courses, following the pitch.
  within(ctx, left, apex, right - left, base - apex, () => {
    ctx.strokeStyle = shade(ROOF, -0.18);
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    for (let i = 1; i < 5; i += 1) {
      const y = apex + ((base - apex) * i) / 5;
      const spread = ((right - left) / 2) * (i / 5);
      ctx.beginPath();
      ctx.moveTo(cx - spread, y);
      ctx.lineTo(cx + spread, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });

  // Ridge cap and the eaves board along the bottom edge.
  fillPoly(ctx, [cx, apex - 6, cx + 26, apex + 18, cx - 26, apex + 18], shade(ROOF, 0.22));
  fillRR(ctx, left, base - 12, right - left, 16, 5, litFill(ctx, base - 12, 16, TRIM, 0.14));
}

/** The painted body of the house, behind the rooms. */
function drawCarcass(ctx) {
  ctx.fillStyle = litFill(ctx, BODY.y, BODY.h, EXTERIOR, 0.1);
  fillRR(ctx, BODY.x, BODY.y, BODY.w, BODY.h, 8, ctx.fillStyle);
  woodGrain(ctx, BODY.x, BODY.y, BODY.w, BODY.h, EXTERIOR, 7);
}

/** A soft inner shadow so each room reads as a recess in the carcass. */
function drawRecess(ctx, box) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.globalAlpha = 0.3;

  const top = ctx.createLinearGradient(0, box.y, 0, box.y + 22);
  top.addColorStop(0, 'rgba(0,0,0,0.75)');
  top.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = top;
  ctx.fillRect(box.x, box.y, box.w, 22);

  const side = ctx.createLinearGradient(box.x, 0, box.x + 20, 0);
  side.addColorStop(0, 'rgba(0,0,0,0.6)');
  side.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = side;
  ctx.fillRect(box.x, box.y, 20, box.h);
  ctx.restore();
}

/**
 * The structure itself: the slab between storeys and the partition between
 * rooms, drawn over the carcass with a lip and a cast shadow so they read as
 * timber rather than as empty space.
 */
function drawStructure(ctx) {
  const slabY = BODY.y + WALL + CELL_H;
  const partX = BODY.x + WALL + CELL_W;

  // Partition: a vertical post, lit from the left.
  ctx.fillStyle = sideLit(ctx, partX, PARTITION, EXTERIOR, 0.16);
  ctx.fillRect(partX, BODY.y + WALL, PARTITION, BODY.h - WALL * 2);

  // Floor slab, with a bright top lip and a shadow falling into the room below.
  ctx.fillStyle = litFill(ctx, slabY, SLAB, shade(EXTERIOR, -0.06), 0.16);
  ctx.fillRect(BODY.x + WALL, slabY, BODY.w - WALL * 2, SLAB);
  ctx.fillStyle = TRIM;
  ctx.fillRect(BODY.x + WALL, slabY, BODY.w - WALL * 2, 4);
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#000';
  ctx.fillRect(BODY.x + WALL, slabY + SLAB, BODY.w - WALL * 2, 10);
  ctx.restore();

  // A bright inner edge all round, like the lip of a real dolls' house.
  ctx.strokeStyle = TRIM;
  ctx.lineWidth = 3;
  roundRect(ctx, BODY.x + WALL - 2, BODY.y + WALL - 2,
    BODY.w - WALL * 2 + 4, BODY.h - WALL * 2 + 4, 4);
  ctx.stroke();

  // Front step, so the house has a bottom rather than stopping.
  const stepW = BODY.w * 0.22;
  fillRR(ctx, BODY.x + BODY.w / 2 - stepW / 2, BODY.y + BODY.h, stepW, 16, 4,
    litFill(ctx, BODY.y + BODY.h, 16, shade(EXTERIOR, -0.16), 0.14));
}
