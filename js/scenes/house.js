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
import {
  drawRoomShell, drawRoomContents, ROOM_W, ROOM_H, FLOOR_Y,
} from '../render/room.js';
import { HOUSE_LAYOUT, STREET } from '../model/world.js';
import {
  beginWalk, routeBetween, STAIR_X, LINKS, HOUSE_GRID, planExit, beginTrip,
} from '../model/travel.js';
import { drawCharacter, CHAR_H, CHAR_W } from '../render/character.js';
import {
  ACTIONS, SWITCHES, canUse, canSwitch, useFor, switchFor,
  beginUse, stopUsing, isUsing, toggleSwitch,
} from '../model/using.js';
import { createRoomScene } from './room.js';
import { doorX } from './street.js';

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

/** How wide a character is to aim at in the cutaway, in screen pixels. */
export const PICK_W = 78;

/** How close she has to be to something to be offered it, in room pixels. */
const USE_REACH = 110;

/** The floating action buttons, the same size they are inside a room. */
const PIP = 72;

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

  /**
   * The character waiting to be sent somewhere.
   *
   * Tapping a character picks her up; the next tap on a room sends her walking
   * there. With nobody picked up a tap on a room zooms into it, which is what
   * it always did — so the new gesture costs the old one nothing.
   */
  let traveller = null;

  /** Turns a screen point into the room under it, and the point within it. */
  function locate(x, y) {
    for (let i = 0; i < HOUSE_LAYOUT.length; i += 1) {
      const box = cellBox(i);
      if (x < box.x || x > box.x + box.w || y < box.y || y > box.y + box.h) continue;
      return {
        roomId: HOUSE_LAYOUT[i],
        x: (x - box.x) / CELL_SCALE,
        y: (y - box.y) / CELL_SCALE,
      };
    }
    return null;
  }

  /**
   * The character under a screen point, if any.
   *
   * Her own width is not enough to aim at here. Shrunk into a room cell she is
   * 150 room-pixels wide, which is 65 on the screen and 37 on the phone — under
   * what a child can reliably hit. The reach is widened to PICK_W screen pixels
   * so picking her up is as easy as everything else in the game.
   */
  function characterAt(x, y) {
    const spot = locate(x, y);
    if (!spot) return null;
    const reach = Math.max(CHAR_W, PICK_W / CELL_SCALE) / 2;
    return game.charactersIn(spot.roomId).find((c) => (
      spot.x >= c.x - reach && spot.x <= c.x + reach
      && spot.y >= c.y - CHAR_H && spot.y <= c.y
    )) ?? null;
  }

  /**
   * A button in each room she can reach, while somebody is picked up.
   *
   * The gesture used to be tap-her-then-tap-a-room with nothing drawn to say
   * so: the only feedback was a hint line at y=726 on a 720-tall canvas — off
   * the bottom of the screen — and a gold ring drawn inside the room cell, so
   * scaled down to a 3px thread. Tapping a character appeared to do nothing at
   * all, and the whole feature read as broken.
   */
  /**
   * The way out of the building, offered next to the front door.
   *
   * Drawn under the house rather than in a room, because that is where she
   * ends up: on the pavement, outside. Only while somebody is picked up, like
   * every other walk target.
   */
  function exitTarget() {
    if (!traveller || traveller.room === STREET) return null;
    const index = game.world.buildings.indexOf(game.building);
    if (index < 0) return null;
    // At the bottom left corner, which is where the front door is: the outside
    // wall of the room downstairs on the left. Under the house it would have
    // been at y=726 on a 720-tall screen — the same way off the bottom edge
    // that made the walk hint invisible.
    return button('out', BODY.x - TOUCH / 2, BODY.y + BODY.h - TOUCH - 10,
      TOUCH, TOUCH, { icon: 'door', round: true, tone: 'accent', index });
  }

  function walkTargets() {
    if (!traveller) return [];
    return HOUSE_LAYOUT.flatMap((id, index) => {
      if (id === traveller.room) return [];
      if (!routeBetween(traveller.room, id)?.length) return [];
      const box = cellBox(index);
      return [button(`walk:${id}`, box.x + box.w / 2 - TOUCH / 2, box.y + box.h / 2 - TOUCH / 2,
        TOUCH, TOUCH, { icon: 'walk', round: true, tone: 'good', iconScale: 1.15, roomId: id })];
    });
  }

  /**
   * What the picked-up character can do right here, without leaving the view.
   *
   * The cutaway is the screen the game is actually played on — it shows all
   * four rooms and everybody in them — so having to zoom into a room before
   * anyone could be put to bed made the whole feature feel further away than
   * it is.
   *
   * These sit in her own room, and walk buttons only ever appear in the rooms
   * she is not in, so the two sets cannot collide.
   */
  function actionTargets() {
    if (!traveller) return [];
    const index = HOUSE_LAYOUT.indexOf(traveller.room);
    if (index < 0) return [];
    const room = game.building.rooms[traveller.room];
    const box = cellBox(index);

    const reachable = (room?.items ?? []).filter((item) => (
      Math.abs(item.x - traveller.x) <= USE_REACH && (canUse(item) || canSwitch(item))
    ));
    if (!reachable.length) return [];

    // A row above her head, inside her own room.
    const width = reachable.length * PIP + (reachable.length - 1) * 6;
    const left = Math.min(box.x + box.w - width - 8,
      Math.max(box.x + 8, box.x + traveller.x * CELL_SCALE - width / 2));
    const top = Math.max(box.y + 6,
      box.y + (traveller.y - CHAR_H) * CELL_SCALE - PIP - 8);

    return reachable.map((item, i) => {
      const action = useFor(item.item) ?? switchFor(item.item);
      // Already sitting in it, so the same button is now how she gets up.
      // Offering "sit" to somebody who is sitting says nothing about what the
      // tap will do.
      const busy = traveller.using?.uid === item.uid;
      const icon = busy ? 'cross' : (ACTIONS[action] ?? SWITCHES[action]).icon;
      return button(`do:${item.uid}`, left + i * (PIP + 6), top, PIP, PIP,
        { icon, round: true, tone: busy ? undefined : 'good', item });
    });
  }

  const rooms = HOUSE_LAYOUT.map((id, index) => {
    const box = cellBox(index);
    return button(`room:${id}`, box.x, box.y, box.w, box.h, { roomId: id });
  });

  return {
    controls: [...rooms, back],

    /**
     * Everything tappable right now, including what only appears once
     * somebody is picked up.
     *
     * The harness only checks what a scene admits to having, and the way out
     * of the building was not in the static list — so nothing was watching
     * whether it was on the screen at all.
     */
    allControls: () => [
      ...rooms, back, ...walkTargets(), ...actionTargets(),
      ...(exitTarget() ? [exitTarget()] : []),
    ],

    onTap(x, y) {
      // Anything she was offered wins over what is underneath it.
      const doing = hitTest(actionTargets(), x, y);
      if (doing) {
        if (canSwitch(doing.item)) toggleSwitch(doing.item);
        else if (traveller.using?.uid === doing.item.uid) stopUsing(traveller);
        else beginUse(traveller, doing.item);
        game.persist();
        return;
      }

      const out = exitTarget();
      if (out && hitTest([out], x, y)) {
        beginTrip(traveller, planExit(traveller, doorX(out.index), ROOM_W));
        traveller = null;
        game.persist();
        return;
      }

      const badge = hitTest(walkTargets(), x, y);
      if (badge) {
        beginWalk(traveller, badge.roomId, ROOM_W / 2, ROOM_W);
        game.persist();
        traveller = null;
        return;
      }

      // Sending someone walking takes priority over zooming into a room.
      const tapped = characterAt(x, y);
      if (tapped) { traveller = traveller === tapped ? null : tapped; return; }

      if (traveller) {
        const spot = locate(x, y);
        if (spot) {
          beginWalk(traveller, spot.roomId, spot.x, ROOM_W);
          game.persist();
          traveller = null;
          return;
        }
        traveller = null;
      }

      const hit = hitTest(this.controls, x, y);
      if (!hit) return;

      if (hit.id === 'back') {
        // Out of a building is the street it stands on, not the shelf of
        // worlds: the shelf is one more step out, from the street itself.
        game.goStreet();
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
        const room = game.building.rooms[id];

        ctx.save();
        ctx.beginPath();
        ctx.rect(box.x, box.y, box.w, box.h);
        ctx.clip();
        ctx.translate(box.x, box.y);
        ctx.scale(CELL_SCALE, CELL_SCALE);
        drawRoomShell(ctx, room);
        drawRoomContents(ctx, room, game.charactersIn(id), game.catalog, game.time,
          null, game.catsIn(id));
        ctx.restore();

        drawRecess(ctx, box);
        // Outside the cell transform, so the outline keeps its real weight.
        if (traveller && traveller.room === id) drawPickedUp(ctx, box, traveller);
      });

      drawStructure(ctx);
      if (traveller) {
        drawButtons(ctx, walkTargets());
        drawButtons(ctx, actionTargets());
        const out = exitTarget();
        if (out) drawButtons(ctx, [out]);
        drawHint(ctx);
      }
      drawTitle(ctx, game.building.name, BODY.x + 6, BODY.y - ROOF_HEIGHT - 26, 30);
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
  // Kept on the canvas: at +22 with a 26 radius it ran 8px past the bottom
  // edge, and a shape drawn off the screen is the one thing this house has
  // already been caught doing.
  fillEllipse(ctx, cx, baseY + 16, BODY.w * 0.52, 22, '#000');
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

  drawStaircase(ctx);

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

/** A ring under whoever is waiting to be sent, drawn in room coordinates. */
function drawPickedUp(ctx, box, character) {
  // The same dashed outline the room uses for a selected thing, so "this one
  // is picked" looks the same wherever she meets it.
  const w = CHAR_W * CELL_SCALE;
  const h = CHAR_H * CELL_SCALE;
  const x = box.x + character.x * CELL_SCALE - w / 2;
  const y = box.y + character.y * CELL_SCALE - h;

  ctx.save();
  ctx.strokeStyle = '#f0c86a';
  ctx.lineWidth = 4;
  ctx.setLineDash([9, 7]);
  roundRect(ctx, x - 7, y - 7, w + 14, h + 14, 12);
  ctx.stroke();
  ctx.restore();
}

/** Says what the picked-up character is waiting for. */
function drawHint(ctx) {
  // Above the roof. Below the house there are 40px between the carcass and the
  // bottom of the screen, which is where this line used to be told to go — and
  // it needs 52, so it went over the edge and was never seen.
  const text = 'Tap a room to walk there';
  ctx.font = '600 24px system-ui, sans-serif';
  const w = ctx.measureText(text).width + 56;
  const h = 52;
  const x = 640 - w / 2;
  const y = 12;

  fillRR(ctx, x, y, w, h, h / 2, 'rgba(240, 200, 106, 0.15)');
  ctx.strokeStyle = '#f0c86a';
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();

  ctx.fillStyle = '#f7e8c4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 640, y + h / 2);
}

/**
 * The staircase, drawn across the slab so it actually connects two floors.
 *
 * This is house structure, not room furniture. Drawn inside a room it rose to
 * that room's own ceiling and joined nothing — a flight of stairs that goes
 * nowhere is worse than no stairs at all.
 */
function drawStaircase(ctx) {
  const link = LINKS.find((entry) => entry.kind === 'stair');
  if (!link) return;

  const [upper, lower] = link.between[0] === HOUSE_GRID[1]
    ? [link.between[0], link.between[1]]
    : [link.between[1], link.between[0]];

  const upperBox = cellBox(HOUSE_GRID.indexOf(upper));
  const lowerBox = cellBox(HOUSE_GRID.indexOf(lower));

  // Both floors, in house coordinates.
  const topFloor = upperBox.y + FLOOR_Y * CELL_SCALE;
  const bottomFloor = lowerBox.y + FLOOR_Y * CELL_SCALE;
  const centre = lowerBox.x + STAIR_X * CELL_SCALE;
  const width = 190 * CELL_SCALE;
  const left = centre - width / 2;

  const wood = '#c2996b';
  const steps = 11;
  const rise = bottomFloor - topFloor;

  // A stairwell cut through the slab, so the flight passes through it rather
  // than stopping underneath.
  ctx.fillStyle = '#2a2429';
  ctx.fillRect(left, upperBox.y + upperBox.h, width, SLAB);

  ctx.save();
  ctx.beginPath();
  ctx.rect(left - 4, topFloor - 6, width + 8, rise + 10);
  ctx.clip();

  for (let i = 0; i < steps; i += 1) {
    const y = bottomFloor - (rise / steps) * (i + 1);
    const x = left + (width / steps) * i;
    const w = width / steps + 1.5;
    const h = rise / steps + 1.5;
    ctx.fillStyle = litFill(ctx, y, h, wood, 0.16);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = shade(wood, 0.3);
    ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = shade(wood, -0.3);
    ctx.fillRect(x, y, 1.5, h);
  }
  ctx.restore();

  // A banister following the pitch, with posts down to the treads.
  ctx.strokeStyle = shade(wood, -0.3);
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(left + 4, bottomFloor - 34);
  ctx.lineTo(left + width - 4, topFloor - 34);
  ctx.stroke();
  for (let i = 1; i < steps; i += 2) {
    const x = left + (width / steps) * i;
    const y = bottomFloor - (rise / steps) * i;
    ctx.strokeStyle = shade(wood, -0.2);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 34);
    ctx.stroke();
  }
}
