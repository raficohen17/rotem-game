/**
 * The street the buildings stand on.
 *
 * A world used to be one house, and the way out of it was the shelf of worlds.
 * Now the way out is here: three plots side by side, a pavement in front of
 * them, and a road. Tapping a building opens its cutaway; anybody standing on
 * the pavement can be sent into any of them.
 *
 * The buildings are drawn at about a third of the size a room is, which is the
 * same trick the cutaway plays — small enough that three fit, large enough
 * that a child can tell a school from a house.
 */

import { button, hitTest, drawButtons, drawTitle, COLORS, TOUCH } from '../ui/widgets.js';
import { fillRR, fillCircle, shade } from '../render/shapes.js';
import { drawIcon } from '../ui/icons.js';
import { drawFront, drawPlot } from '../render/building.js';
import { drawCharacter, CHAR_H, CHAR_W } from '../render/character.js';
import { createBuilding, MAX_BUILDINGS, FRONT_ROOM } from '../model/world.js';
import { planEntry, beginTrip, isWalking } from '../model/travel.js';
import { ROOM_W } from '../render/room.js';

/** The street in its own coordinates, the way a room has its own. */
export const STREET_W = 1200;

/** Where the street sits on the screen. */
const ORIGIN_X = 40;

/** The line the buildings and the people stand on. */
export const PAVEMENT_Y = 452;

/** Where a character's feet go on the pavement. */
export const WALK_Y = 512;

/** People are drawn small out here, so that a building can tower over them. */
const PEOPLE_SCALE = 0.46;

const PLOT = { w: 370, gap: 30, top: 116, x: 20 };

/** The plot boxes, in street coordinates. */
export function plotBox(index) {
  return {
    x: PLOT.x + index * (PLOT.w + PLOT.gap),
    y: PLOT.top,
    w: PLOT.w,
    h: PAVEMENT_Y - PLOT.top,
  };
}

/** Where a building's front door meets the pavement, in street coordinates. */
export function doorX(index) {
  const box = plotBox(index);
  return box.x + box.w / 2;
}

/** Street coordinates to screen. */
function toScreen(box) {
  return { ...box, x: box.x + ORIGIN_X };
}

export function createStreet(game) {
  const back = button('back', 1186, 24, TOUCH, TOUCH, { icon: 'home', round: true });

  /** The character picked up, waiting to be sent somewhere. */
  let traveller = null;

  const buildings = () => game.world.buildings;

  function plots() {
    const out = [];
    for (let i = 0; i < MAX_BUILDINGS; i += 1) {
      const box = toScreen(plotBox(i));
      const building = buildings()[i];
      out.push(button(building ? `enter:${building.id}` : `build:${i}`,
        box.x, box.y, box.w, box.h, { building, index: i }));
    }
    return out;
  }

  /** Somebody standing on the pavement, under this point. */
  function personAt(x, y) {
    const reach = Math.max(CHAR_W * PEOPLE_SCALE, TOUCH) / 2;
    return game.charactersOutside().find((c) => {
      const cx = ORIGIN_X + c.x;
      return x >= cx - reach && x <= cx + reach
        && y >= WALK_Y - CHAR_H * PEOPLE_SCALE && y <= WALK_Y + 10;
    }) ?? null;
  }

  /** A badge over each building she could be sent into. */
  function walkTargets() {
    if (!traveller) return [];
    return buildings().map((building, i) => {
      const box = toScreen(plotBox(i));
      return button(`walk:${building.id}`, box.x + box.w / 2 - TOUCH / 2,
        box.y + box.h * 0.52, TOUCH, TOUCH,
        { icon: 'walk', round: true, tone: 'good', iconScale: 1.15, building, index: i });
    });
  }

  function addBuilding(index) {
    if (buildings().length >= MAX_BUILDINGS) return;
    // Named for the plot it stands on, so two buildings are never both "House".
    const building = createBuilding(`House ${buildings().length + 1}`);
    game.world.buildings.push(building);
    game.persist();
    void index;
  }

  return {
    controls: [back],

    allControls: () => [...plots(), ...walkTargets(), back],

    onTap(x, y) {
      // Sending somebody somewhere beats opening what is underneath.
      const badge = hitTest(walkTargets(), x, y);
      if (badge) {
        const legs = planEntry(badge.building.id, doorX(badge.index), FRONT_ROOM, ROOM_W / 2, ROOM_W);
        beginTrip(traveller, legs);
        traveller = null;
        game.persist();
        return;
      }

      const person = personAt(x, y);
      if (person) {
        traveller = traveller === person ? null : person;
        return;
      }
      if (traveller) { traveller = null; return; }

      const hit = hitTest([...plots(), back], x, y);
      if (!hit) return;
      if (hit.id === 'back') { game.goMenu(); return; }

      const [kind] = hit.id.split(':');
      if (kind === 'build') { addBuilding(hit.index); return; }
      if (kind === 'enter') game.openBuilding(hit.building);
    },

    draw(ctx) {
      drawSky(ctx);
      drawRoad(ctx);

      for (let i = 0; i < MAX_BUILDINGS; i += 1) {
        const box = toScreen(plotBox(i));
        const building = buildings()[i];
        if (building) drawFront(ctx, building, box);
        else drawPlot(ctx, box);
      }

      // Empty plots get a plus, drawn after the buildings so it is never behind
      // one, and only while there is somewhere to put another building.
      for (let i = buildings().length; i < MAX_BUILDINGS; i += 1) {
        const box = toScreen(plotBox(i));
        drawIcon(ctx, 'plus', box.x + box.w / 2, box.y + box.h * 0.76, '#7d7078', 1.8);
      }

      for (const person of game.charactersOutside()) {
        ctx.save();
        ctx.translate(ORIGIN_X + person.x, WALK_Y);
        ctx.scale(PEOPLE_SCALE, PEOPLE_SCALE);
        drawCharacter(ctx, person.spec, game.time, {
          walking: isWalking(person),
          facing: person.facing ?? 1,
          pose: 'stand',
        });
        ctx.restore();
        if (person === traveller) drawPickedUp(ctx, person);
      }

      drawTitle(ctx, game.world.name, 40, 66, 34);
      if (traveller) drawButtons(ctx, walkTargets());
      drawButtons(ctx, [back]);
    },
  };
}

function drawSky(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, PAVEMENT_Y);
  sky.addColorStop(0, '#2b3550');
  sky.addColorStop(1, '#5c6d84');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1280, PAVEMENT_Y);

  // A few clouds, placed rather than random so the street looks the same each
  // time she opens it.
  ctx.save();
  ctx.globalAlpha = 0.16;
  for (const [x, y, r] of [[210, 108, 34], [252, 118, 26], [900, 88, 30], [946, 98, 22]]) {
    fillCircle(ctx, x, y, r, '#f6f1e8');
  }
  ctx.restore();
}

function drawRoad(ctx) {
  // Pavement, kerb, road.
  ctx.fillStyle = '#b9b2a6';
  ctx.fillRect(0, PAVEMENT_Y, 1280, 88);
  ctx.fillStyle = shade('#b9b2a6', -0.12);
  ctx.fillRect(0, PAVEMENT_Y, 1280, 6);
  ctx.fillStyle = '#8f887f';
  ctx.fillRect(0, PAVEMENT_Y + 88, 1280, 10);
  ctx.fillStyle = '#4a4650';
  ctx.fillRect(0, PAVEMENT_Y + 98, 1280, 720 - PAVEMENT_Y - 98);

  // Paving joints, so the pavement is a surface and not a band of colour.
  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let x = 40; x < 1280; x += 96) {
    ctx.fillStyle = '#8f887f';
    ctx.fillRect(x, PAVEMENT_Y + 8, 3, 78);
  }
  ctx.restore();

  // The centre line of the road.
  ctx.save();
  ctx.globalAlpha = 0.7;
  for (let x = 30; x < 1280; x += 140) {
    fillRR(ctx, x, 660, 76, 8, 4, '#e8dfc8');
  }
  ctx.restore();
}

/** The ring round whoever is picked up, so it is obvious who will be sent. */
function drawPickedUp(ctx, person) {
  ctx.save();
  ctx.strokeStyle = COLORS.buttonActive;
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 8]);
  const w = CHAR_W * PEOPLE_SCALE;
  const h = CHAR_H * PEOPLE_SCALE;
  ctx.strokeRect(ORIGIN_X + person.x - w / 2, WALK_Y - h, w, h + 8);
  ctx.restore();
}
