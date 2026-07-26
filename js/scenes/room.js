/**
 * Designing one room, zoomed to fill the screen.
 *
 * Drag an item out of the drawer to place it, drag a placed item to move it,
 * tap it to select and get its controls. Nothing here can fail: no arrangement
 * is rejected, and there is nothing to score.
 */

import {
  button, iconButton, hitTest, drawButtons, drawPanel, COLORS, TOUCH,
} from '../ui/widgets.js';
import { fillRR, shade } from '../render/shapes.js';
import { drawItemArt } from '../render/catalog.js';
import { drawCharacter, CHAR_H, CHAR_W } from '../render/character.js';
import {
  drawRoomShell, drawRoomContents, roomContents, ROOM_W, ROOM_H, FLOOR_Y, FLOOR_BAND,
} from '../render/room.js';
import { itemBounds, boundsContain, clampScale, MIN_SCALE, MAX_SCALE } from '../model/geometry.js';
import { placeItem, placeCharacter, frontZ, backZ, WALL_COLORS, FLOOR_COLORS } from '../model/world.js';
import { createCharacterCreator } from './charcreator.js';
import { createHouse } from './house.js';

const PANEL_TOP = 500;
const TAB_W = 128;
const CELL_W = 120;

export function createRoomScene(game, roomId) {
  const room = game.world.rooms[roomId];
  const catalog = game.catalog;

  /** null when closed; otherwise the drawer shows items or a colour palette. */
  let panel = null;
  let category = catalog.categories[0].id;
  let selected = null;
  let drag = null;

  /**
   * Where the room sits on screen. Both drawing and touch mapping read this,
   * so the two can never disagree — and the room lifts out from behind the
   * drawer when it opens instead of being covered by it.
   */
  function transform() {
    return panel
      ? { x: 190, y: 92, s: 0.75 }
      : { x: 40, y: 104, s: 1 };
  }

  function toRoom(sx, sy) {
    const t = transform();
    return { x: (sx - t.x) / t.s, y: (sy - t.y) / t.s };
  }

  function inRoom(sx, sy) {
    const p = toRoom(sx, sy);
    return p.x >= 0 && p.x <= ROOM_W && p.y >= 0 && p.y <= ROOM_H;
  }

  function cast() {
    return game.charactersIn(roomId);
  }

  function isWallItem(entry) {
    return entry.item !== undefined && catalog.get(entry.item)?.surface === 'wall';
  }

  /** Keeps anything placed within reach of a finger. */
  function clampPlacement(entry, x, y) {
    const wall = isWallItem(entry);
    const top = wall ? 40 : FLOOR_BAND.top;
    const bottom = wall ? FLOOR_Y - 10 : FLOOR_BAND.bottom;
    return {
      x: Math.min(ROOM_W - 30, Math.max(30, x)),
      y: Math.min(bottom, Math.max(top, y)),
    };
  }

  /** Frontmost thing under a room-space point, so what looks on top is picked. */
  function pick(rx, ry) {
    const entries = roomContents(room, cast(), catalog);
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const entry = entries[i];
      if (entry.kind === 'item') {
        const def = catalog.get(entry.placed.item);
        if (def && boundsContain(itemBounds(entry.placed, def), rx, ry)) return entry.placed;
      } else {
        const c = entry.placed;
        if (rx >= c.x - CHAR_W / 2 && rx <= c.x + CHAR_W / 2
          && ry >= c.y - CHAR_H && ry <= c.y) return c;
      }
    }
    return null;
  }

  function removeSelected() {
    if (!selected) return;
    if (selected.item !== undefined) {
      room.items = room.items.filter((entry) => entry !== selected);
    } else {
      game.world.characters = game.world.characters.filter((entry) => entry !== selected);
    }
    selected = null;
    game.persist();
  }

  function addCharacter() {
    game.setScene(createCharacterCreator(game, (spec) => {
      // Stepped along so a new character does not land exactly on top of the
      // last one and look like nothing happened.
      const already = cast().length;
      const character = placeCharacter(
        spec,
        roomId,
        ROOM_W / 2 + ((already % 5) - 2) * 130,
        FLOOR_BAND.bottom - 40,
      );
      game.world.characters.push(character);
      game.persist();
      const back = createRoomScene(game, roomId);
      game.setScene(back);
    }, () => game.setScene(createRoomScene(game, roomId))));
  }

  // ------------------------------------------------------------- controls

  function topBar() {
    const controls = [
      iconButton('back', 20, 12, { icon: 'back' }),
      iconButton('person', 104, 12, { icon: 'person' }),
      iconButton('wall', 188, 12, { icon: 'wall', active: panel === 'wall' }),
      iconButton('floor', 272, 12, { icon: 'floor', active: panel === 'floor' }),
      iconButton('drawer', 356, 12, { icon: 'drawer', active: panel === 'items' }),
    ];

    if (selected) {
      const isItem = selected.item !== undefined;
      const x = (i) => 768 + i * 80;
      if (isItem) {
        controls.push(
          iconButton('shrink', x(0), 12, { icon: 'shrink' }),
          iconButton('grow', x(1), 12, { icon: 'grow' }),
          iconButton('flip', x(2), 12, { icon: 'flip' }),
          iconButton('sendBack', x(3), 12, { icon: 'layerDown' }),
          iconButton('bringFront', x(4), 12, { icon: 'layerUp' }),
        );
      } else {
        controls.push(iconButton('edit', x(3), 12, { icon: 'person' }));
      }
      controls.push(iconButton('delete', x(5), 12, { icon: 'trash', tone: 'danger' }));
    }
    return controls;
  }

  function panelControls() {
    if (!panel) return [];

    if (panel === 'items') {
      const tabs = catalog.categories.map((cat, i) => button(
        `cat:${cat.id}`, 64 + i * TAB_W, PANEL_TOP + 12, TAB_W - 8, 64,
        { active: cat.id === category, category: cat },
      ));
      const items = catalog.inCategory(category).map((def, i) => button(
        `item:${def.id}`, 64 + i * TAB_W, PANEL_TOP + 88, CELL_W, 120, { def },
      ));
      return [...tabs, ...items];
    }

    const swatches = panel === 'wall' ? WALL_COLORS : FLOOR_COLORS;
    return swatches.map((color, i) => button(
      `paint:${i}`, 64 + i * 118, PANEL_TOP + 60, 100, 100,
      { swatch: color, color, active: (panel === 'wall' ? room.wall : room.floor) === color },
    ));
  }

  function allControls() {
    return [...topBar(), ...panelControls()];
  }

  // ---------------------------------------------------------------- input

  function handleControl(hit) {
    switch (hit.id) {
      case 'back': game.setScene(createHouse(game)); return true;
      case 'person': addCharacter(); return true;
      case 'wall': panel = panel === 'wall' ? null : 'wall'; return true;
      case 'floor': panel = panel === 'floor' ? null : 'floor'; return true;
      case 'drawer': panel = panel === 'items' ? null : 'items'; return true;
      case 'delete': removeSelected(); return true;
      case 'edit':
        if (selected) {
          const target = selected;
          game.setScene(createCharacterCreator(game, (spec) => {
            target.spec = spec;
            game.persist();
            game.setScene(createRoomScene(game, roomId));
          }, () => game.setScene(createRoomScene(game, roomId)), target.spec));
        }
        return true;
      default: break;
    }

    if (!selected) return false;

    switch (hit.id) {
      case 'shrink': selected.scale = clampScale(selected.scale - 0.15); break;
      case 'grow': selected.scale = clampScale(selected.scale + 0.15); break;
      case 'flip': selected.flip = !selected.flip; break;
      case 'bringFront': selected.z = frontZ([...room.items, ...cast()]); break;
      case 'sendBack': selected.z = backZ([...room.items, ...cast()]); break;
      default: return false;
    }
    game.persist();
    return true;
  }

  function handlePanelTap(hit) {
    const [kind, value] = hit.id.split(':');
    if (kind === 'cat') { category = value; return true; }
    if (kind === 'paint') {
      if (panel === 'wall') room.wall = hit.color;
      else room.floor = hit.color;
      game.persist();
      return true;
    }
    return false;
  }

  return {
    enter() { selected = null; },

    onPointerDown(x, y) {
      const hit = hitTest(allControls(), x, y);

      // Dragging an item out of the drawer is how furniture gets placed, so a
      // press on a drawer cell starts a placement rather than acting on tap.
      if (hit?.def) {
        drag = { mode: 'place', def: hit.def, sx: x, sy: y };
        return;
      }
      if (hit) return; // handled on tap, so a slip does not fire it

      if (!inRoom(x, y)) return;
      const p = toRoom(x, y);
      const target = pick(p.x, p.y);
      selected = target;
      if (target) drag = { mode: 'move', target, dx: p.x - target.x, dy: p.y - target.y };
    },

    onPointerMove(x, y) {
      if (!drag) return;
      if (drag.mode === 'place') { drag.sx = x; drag.sy = y; return; }

      const p = toRoom(x, y);
      const next = clampPlacement(drag.target, p.x - drag.dx, p.y - drag.dy);
      drag.target.x = next.x;
      drag.target.y = next.y;
    },

    onPointerUp(x, y) {
      if (!drag) return;

      if (drag.mode === 'place') {
        // Released back over the drawer means "changed my mind" — place nothing.
        if (inRoom(x, y)) {
          const p = toRoom(x, y);
          const entry = placeItem(drag.def.id, p.x, p.y);
          const spot = clampPlacement(entry, p.x, p.y);
          entry.x = spot.x;
          entry.y = spot.y;
          room.items.push(entry);
          selected = entry;
          game.persist();
        }
      } else {
        game.persist();
      }
      drag = null;
    },

    onTap(x, y) {
      const hit = hitTest(allControls(), x, y);
      if (!hit) return;
      if (handleControl(hit)) return;
      handlePanelTap(hit);
    },

    draw(ctx) {
      ctx.fillStyle = COLORS.backdrop;
      ctx.fillRect(0, 0, 1280, 720);

      const t = transform();
      ctx.save();
      fillRR(ctx, t.x, t.y, ROOM_W * t.s, ROOM_H * t.s, 12, '#000');
      ctx.clip();
      ctx.translate(t.x, t.y);
      ctx.scale(t.s, t.s);
      drawRoomShell(ctx, room);
      drawRoomContents(ctx, room, cast(), catalog, game.time, selected);
      ctx.restore();

      if (panel) drawPanelBody(ctx, panel, catalog, category, room);
      drawButtons(ctx, allControls().filter((c) => !c.def && !c.category));
      if (panel === 'items') drawDrawerContents(ctx, panelControls());

      if (drag?.mode === 'place') drawGhost(ctx, drag);
    },
  };
}

// ---------------------------------------------------------------- drawing

function drawPanelBody(ctx, panel, catalog, category, room) {
  drawPanel(ctx, 24, PANEL_TOP, 1232, 720 - PANEL_TOP, COLORS.panel, 22);

  if (panel !== 'items') {
    ctx.fillStyle = COLORS.inkDim;
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(panel === 'wall' ? 'Wall' : 'Floor', 64, PANEL_TOP + 42);
  }
}

/** Category tabs and item cells, both showing the art rather than words. */
function drawDrawerContents(ctx, controls) {
  for (const control of controls) {
    if (control.category) {
      fillRR(ctx, control.x, control.y, control.w, control.h, 12,
        control.active ? COLORS.buttonActive : COLORS.button);
      ctx.fillStyle = COLORS.ink;
      ctx.font = '600 17px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(control.category.label, control.x + control.w / 2, control.y + control.h / 2);
    } else if (control.def) {
      fillRR(ctx, control.x, control.y, control.w, control.h, 12, '#352c52');
      drawFitted(ctx, control.def, control.x + control.w / 2, control.y + control.h - 12,
        control.w - 20, control.h - 24);
    }
  }
}

/** Draws an item scaled down to fit a cell, standing on the cell's floor. */
function drawFitted(ctx, def, cx, baseY, maxW, maxH) {
  const fit = Math.min(1, maxW / def.w, maxH / def.h);
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(fit, fit);
  drawItemArt(ctx, def, 0);
  ctx.restore();
}

/** The item following the finger before it is dropped. */
function drawGhost(ctx, drag) {
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.translate(drag.sx, drag.sy);
  drawItemArt(ctx, drag.def, 0);
  ctx.restore();
}
