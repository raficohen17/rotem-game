/**
 * The cutaway house: four rooms, two per floor, all visible at once.
 *
 * This is the home screen of a world. Rooms are not edited here — a quarter of
 * the screen is too small to drag a sofa around with a child's finger — so a
 * tap zooms the room to fill the screen instead.
 */

import { button, hitTest, drawButtons, drawTitle, COLORS, TOUCH } from '../ui/widgets.js';
import { fillRR } from '../render/shapes.js';
import { drawRoomShell, drawRoomContents, ROOM_W, ROOM_H, renderHouseThumbnail } from '../render/room.js';
import { HOUSE_LAYOUT } from '../model/world.js';
import { createRoomScene } from './room.js';

const CELL_W = 570;
const CELL_SCALE = CELL_W / ROOM_W;
const CELL_H = ROOM_H * CELL_SCALE;
const COL_X = [60, 650];
const ROW_Y = [118, 385];

export function cellBox(index) {
  return {
    x: COL_X[index % 2],
    y: ROW_Y[Math.floor(index / 2)],
    w: CELL_W,
    h: CELL_H,
  };
}

export function createHouse(game) {
  const back = button('back', 1148, 22, TOUCH, TOUCH, { icon: 'home' });

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
      drawTitle(ctx, game.world.name, 44, 62, 32);

      HOUSE_LAYOUT.forEach((id, index) => {
        const box = cellBox(index);
        const room = game.world.rooms[id];

        ctx.save();
        fillRR(ctx, box.x, box.y, box.w, box.h, 14, '#000000');
        ctx.clip();
        ctx.translate(box.x, box.y);
        ctx.scale(CELL_SCALE, CELL_SCALE);
        drawRoomShell(ctx, room);
        drawRoomContents(ctx, room, game.charactersIn(id), game.catalog, game.time);
        ctx.restore();

        ctx.strokeStyle = '#1a161c';
        ctx.lineWidth = 8;
        ctx.strokeRect(box.x, box.y, box.w, box.h);
      });

      drawButtons(ctx, [back]);
    },
  };
}
