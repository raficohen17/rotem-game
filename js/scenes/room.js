/**
 * Designing one room, zoomed to fill the screen.
 *
 * The room gets the screen; the interface gets out of the way. There are two
 * permanent controls — a back button and one that opens the drawer — and
 * everything else is either inside the drawer or floats next to whatever is
 * selected. An earlier version had eleven buttons pinned across the top, which
 * spent a third of a phone screen on chrome in a game about looking at a room.
 *
 * Painting and adding people live in the drawer as tabs beside the furniture
 * categories, because they are the same kind of action: pick a thing, put it in
 * the room.
 */

import { button, hitTest, drawPanel, drawButton, drawButtons, COLORS } from '../ui/widgets.js';
import { fillRR, fillCircle, roundRect, shade } from '../render/shapes.js';
import { drawItemArt } from '../render/catalog.js';
import { drawCharacter, CHAR_H, CHAR_W } from '../render/character.js';
import {
  drawRoomShell, drawRoomContents, roomContents, drawFloorSample,
  ROOM_W, ROOM_H, FLOOR_Y, FLOOR_BAND,
} from '../render/room.js';
import { itemBounds, boundsContain, clampScale, findSurface } from '../model/geometry.js';
import {
  placeItem, placeCharacter, frontZ, backZ, WALL_COLORS, FLOOR_COLORS, FLOOR_STYLES,
} from '../model/world.js';
import { createBook } from '../model/book.js';
import { createCharacterCreator } from './charcreator.js';
import { createBookDesigner } from './bookdesigner.js';
import { createHouse } from './house.js';

const PANEL_TOP = 470;
const TAB = { y: 482, w: 98, h: 58, step: 102, x: 46 };
const CELL = { y: 550, w: 100, h: 156, step: 106, x: 46 };

/** Floating controls are smaller than pinned ones: they sit near the thumb. */
const PIP = 58;

/** Tabs that are not furniture categories. */
const EXTRA_TABS = [
  { id: 'people', icon: 'person' },
  { id: 'wall', icon: 'wall' },
  { id: 'floor', icon: 'floor' },
];

export function createRoomScene(game, roomId) {
  const room = game.world.rooms[roomId];
  const { catalog } = game;

  let open = false;
  let tab = catalog.categories[0].id;
  let selected = null;
  let drag = null;

  /**
   * Where the room sits on screen. Both drawing and touch mapping read this,
   * so they can never disagree — and the room lifts out from behind the drawer
   * when it opens rather than being covered by it.
   */
  function transform() {
    return open
      ? { x: 121, y: 14, s: 0.865 }
      : { x: 20, y: 22, s: 1.033 };
  }

  function toRoom(sx, sy) {
    const t = transform();
    return { x: (sx - t.x) / t.s, y: (sy - t.y) / t.s };
  }

  function inRoom(sx, sy) {
    const p = toRoom(sx, sy);
    return p.x >= 0 && p.x <= ROOM_W && p.y >= 0 && p.y <= ROOM_H;
  }

  const cast = () => game.charactersIn(roomId);
  const isItem = (entry) => entry && entry.item !== undefined;

  function isWallItem(entry) {
    return isItem(entry) && catalog.get(entry.item)?.surface === 'wall';
  }

  /**
   * Stands an item on whatever surface it was dropped onto.
   *
   * Sets the baseline to the host's top and lifts z one above it, so the item
   * draws in front of the thing it is standing on rather than behind it.
   * Returns false when the drop was onto the floor.
   */
  function standOnSurface(entry, x, y) {
    if (isWallItem(entry)) return false;
    const host = findSurface(entry, room.items, (id) => catalog.get(id), x, y,
      catalog.get(entry.item));
    if (!host) {
      if (entry.item === 'book' && entry.lying) standUp(entry);
      return false;
    }

    entry.x = x;
    entry.y = host.top;
    entry.z = (host.item.z ?? 0) + 1;

    /*
     * A book dropped onto another book makes a pile, and a pile is flat.
     *
     * The book underneath lies down too — a stack balanced on the top edge of
     * an upright book is still a tower, just a shorter one. So the first book
     * on a table stands and shows its cover, and the moment a second joins it
     * they both lie down and read as a pile.
     */
    const def = catalog.get(entry.item);
    if (entry.item === 'book' && host.item.item === 'book') {
      if (!host.item.lying) lieFlat(host.item, catalog.get(host.item.item));
      lieFlat(entry, def);
      entry.y = host.item.y - (host.item.h ?? def.h) * host.item.scale;
    } else if (entry.item === 'book' && entry.lying) {
      standUp(entry);
    }

    if (def && Number.isFinite(host.maxHeight)) {
      const natural = def.h * entry.scale;
      if (natural > host.maxHeight) {
        entry.scale = clampScale(entry.scale * (host.maxHeight / natural));
      }
    }
    return true;
  }

  /** Lays a book down: same book, turned on its side. */
  function lieFlat(entry, def) {
    entry.lying = true;
    entry.w = def.h * 0.86;
    entry.h = Math.max(22, def.w * 0.28);
  }

  /** Stands a book back up when it is moved off a pile. */
  function standUp(entry) {
    delete entry.lying;
    delete entry.w;
    delete entry.h;
  }

  /** Keeps anything placed within reach of a finger. */
  function clampPlacement(entry, x, y) {
    const wall = isWallItem(entry);
    return {
      x: Math.min(ROOM_W - 30, Math.max(30, x)),
      y: wall
        ? Math.min(FLOOR_Y - 10, Math.max(40, y))
        : Math.min(FLOOR_BAND.bottom, Math.max(FLOOR_BAND.top, y)),
    };
  }

  /** The surface the current drag would land on, for the highlight. */
  function hoveredSurface(sx, sy) {
    if (!drag) return null;
    const entry = drag.mode === 'place'
      ? { item: drag.def.id, scale: 1 }
      : drag.target;
    if (!entry || isWallItem(entry)) return null;

    const p = toRoom(sx, sy);
    const point = drag.mode === 'place' ? p : { x: p.x - drag.dx, y: p.y - drag.dy };
    return findSurface(entry, room.items, (id) => catalog.get(id), point.x, point.y,
      catalog.get(entry.item));
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
    if (isItem(selected)) {
      room.items = room.items.filter((entry) => entry !== selected);
    } else {
      game.world.characters = game.world.characters.filter((entry) => entry !== selected);
    }
    selected = null;
    game.persist();
  }

  /** Opens the cover designer for a placed book. */
  function openBookDesigner(book) {
    const back = () => game.setScene(createRoomScene(game, roomId));
    game.setScene(createBookDesigner(game, book.design, (design) => {
      book.design = design;
      game.persist();
      back();
    }, back));
  }

  function openCreator(existing) {
    const back = () => game.setScene(createRoomScene(game, roomId));
    game.setScene(createCharacterCreator(game, (spec) => {
      if (existing) {
        existing.spec = spec;
      } else {
        const already = cast().length;
        game.world.characters.push(placeCharacter(
          spec, roomId,
          ROOM_W / 2 + ((already % 5) - 2) * 140,
          FLOOR_BAND.bottom - 40,
        ));
      }
      game.persist();
      back();
    }, back, existing?.spec));
  }

  // ------------------------------------------------------------- controls

  /** The only two controls that are always on screen. */
  function permanent() {
    return [
      button('back', 18, 18, PIP, PIP, { icon: 'back', round: true }),
      button('drawer', 1204, 640, PIP, PIP, {
        icon: open ? 'chevronDown' : 'plus', round: true, tone: 'accent',
      }),
    ];
  }

  function tabs() {
    if (!open) return [];
    const all = [
      ...EXTRA_TABS.map((e) => ({ id: e.id, icon: e.icon })),
      ...catalog.categories.map((c) => ({ id: c.id, label: c.label })),
    ];
    return all.map((entry, i) => button(
      `tab:${entry.id}`, TAB.x + i * TAB.step, TAB.y, TAB.w, TAB.h,
      { active: entry.id === tab, tabInfo: entry },
    ));
  }

  function panelContents() {
    if (!open) return [];

    if (tab === 'wall' || tab === 'floor') {
      const swatches = tab === 'wall' ? WALL_COLORS : FLOOR_COLORS;
      const current = tab === 'wall' ? room.wall : room.floor;
      const colors = swatches.map((color, i) => button(
        `paint:${i}`, CELL.x + i * 70, CELL.y + 4, 64, 64,
        { swatch: color, color, active: current === color },
      ));
      if (tab === 'wall') return colors;

      // The floor also gets a surface, chosen separately from its colour —
      // six patterns times ten colours is sixty floors rather than six.
      const patterns = FLOOR_STYLES.map((style, i) => button(
        `surface:${style}`, CELL.x + i * 102, CELL.y + 78, 94, 74,
        { floorStyle: style, active: room.floorStyle === style },
      ));
      return [...colors, ...patterns];
    }

    if (tab === 'people') {
      const controls = [button('addPerson', CELL.x, CELL.y, CELL.w, CELL.h, { addPerson: true })];
      cast().forEach((character, i) => {
        controls.push(button(`person:${i}`, CELL.x + (i + 1) * CELL.step, CELL.y,
          CELL.w, CELL.h, { character }));
      });
      return controls;
    }

    return catalog.inCategory(tab).map((def, i) => button(
      `item:${def.id}`, CELL.x + i * CELL.step, CELL.y, CELL.w, CELL.h, { def },
    ));
  }

  /**
   * Controls for the selected object, floating just above it rather than
   * pinned to the top of the screen — so they are next to what they act on,
   * and gone entirely when nothing is selected.
   */
  function selectionControls() {
    if (!selected) return [];

    const book = isItem(selected) && selected.item === 'book';
    const ids = isItem(selected)
      ? [
        ...(book ? [['design', 'looks']] : []),
        ['shrink', 'shrink'], ['grow', 'grow'], ['flip', 'flip'],
        ['sendBack', 'layerDown'], ['bringFront', 'layerUp'], ['delete', 'trash'],
      ]
      : [['edit', 'person'], ['delete', 'trash']];

    const t = transform();
    const width = ids.length * PIP + (ids.length - 1) * 6;
    const height = isItem(selected)
      ? (catalog.get(selected.item)?.h ?? 0) * selected.scale
      : CHAR_H;

    // Above the object, or below it when that would leave the screen.
    let top = t.y + (selected.y - height) * t.s - PIP - 14;
    if (top < 12) top = t.y + selected.y * t.s + 14;
    const left = Math.min(1280 - width - 16, Math.max(16, t.x + selected.x * t.s - width / 2));

    return ids.map(([id, icon], i) => button(
      id, left + i * (PIP + 6), top, PIP, PIP,
      { icon, round: true, tone: id === 'delete' ? 'danger' : undefined },
    ));
  }

  const allControls = () => [
    ...permanent(), ...tabs(), ...panelContents(), ...selectionControls(),
  ];

  // ---------------------------------------------------------------- input

  function act(hit) {
    switch (hit.id) {
      case 'back': game.setScene(createHouse(game)); return true;
      case 'drawer': open = !open; return true;
      case 'addPerson': openCreator(null); return true;
      case 'edit': openCreator(selected); return true;
      case 'design': openBookDesigner(selected); return true;
      case 'delete': removeSelected(); return true;
      default: break;
    }

    const [kind, value] = hit.id.split(':');
    if (kind === 'tab') { tab = value; return true; }
    if (kind === 'paint') {
      if (tab === 'wall') room.wall = hit.color;
      else room.floor = hit.color;
      game.persist();
      return true;
    }
    if (kind === 'surface') {
      room.floorStyle = hit.floorStyle;
      game.persist();
      return true;
    }
    if (kind === 'person') { selected = hit.character; return true; }

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

  return {
    enter() { selected = null; },

    onPointerDown(x, y) {
      const hit = hitTest(allControls(), x, y);

      // Dragging out of the drawer is how furniture is placed, so a press on a
      // drawer cell starts a placement rather than waiting for a tap.
      if (hit?.def) {
        drag = { mode: 'place', def: hit.def, sx: x, sy: y };
        return;
      }
      if (hit) return; // everything else acts on tap, so a slip does nothing

      if (!inRoom(x, y)) return;
      const p = toRoom(x, y);
      const target = pick(p.x, p.y);
      selected = target;
      if (target) drag = { mode: 'move', target, dx: p.x - target.x, dy: p.y - target.y };
    },

    onPointerMove(x, y) {
      if (!drag) return;
      drag.hover = hoveredSurface(x, y);
      if (drag.mode === 'place') { drag.sx = x; drag.sy = y; return; }

      const p = toRoom(x, y);
      const next = clampPlacement(drag.target, p.x - drag.dx, p.y - drag.dy);
      drag.target.x = next.x;
      drag.target.y = next.y;
      standOnSurface(drag.target, next.x, next.y);
    },

    onPointerUp(x, y) {
      if (!drag) return;

      if (drag.mode === 'place') {
        // Released back over the drawer means "changed my mind" — place nothing.
        if (inRoom(x, y)) {
          const p = toRoom(x, y);
          const entry = placeItem(drag.def.id, p.x, p.y);
          if (entry.item === 'book') entry.design = createBook();
          const spot = clampPlacement(entry, p.x, p.y);
          entry.x = spot.x;
          entry.y = spot.y;
          standOnSurface(entry, spot.x, spot.y);
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
      if (hit) act(hit);
    },

    draw(ctx) {
      ctx.fillStyle = COLORS.backdrop;
      ctx.fillRect(0, 0, 1280, 720);

      const t = transform();
      ctx.save();
      fillRR(ctx, t.x, t.y, ROOM_W * t.s, ROOM_H * t.s, 14, '#000');
      ctx.clip();
      ctx.translate(t.x, t.y);
      ctx.scale(t.s, t.s);
      drawRoomShell(ctx, room);
      drawRoomContents(ctx, room, cast(), catalog, game.time, selected);
      ctx.restore();

      // A bright line along the surface a drag will land on.
      if (drag?.hover) {
        const t2 = transform();
        const b = drag.hover.bounds;
        ctx.save();
        ctx.strokeStyle = '#f0c86a';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(t2.x + b.left * t2.s, t2.y + b.top * t2.s);
        ctx.lineTo(t2.x + b.right * t2.s, t2.y + b.top * t2.s);
        ctx.stroke();
        ctx.restore();
      }

      if (open) drawDrawer(ctx, tabs(), panelContents(), tab, game.time, room.floor);

      drawButtons(ctx, permanent());
      drawButtons(ctx, selectionControls());

      if (drag?.mode === 'place') {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.translate(drag.sx, drag.sy);
        drawItemArt(ctx, drag.def, 0);
        ctx.restore();
      }
    },
  };
}

// ---------------------------------------------------------------- drawing

function drawDrawer(ctx, tabControls, contents, tab, time, floorColor) {
  drawPanel(ctx, 16, PANEL_TOP, 1248, 720 - PANEL_TOP, COLORS.panel, 24);

  for (const control of tabControls) {
    fillRR(ctx, control.x, control.y, control.w, control.h, 14,
      control.active ? COLORS.buttonActive : COLORS.button);
    const info = control.tabInfo;
    if (info.label) {
      ctx.fillStyle = COLORS.ink;
      ctx.font = '600 17px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(info.label, control.x + control.w / 2, control.y + control.h / 2);
    } else {
      drawButton(ctx, { ...control, icon: info.icon, w: control.w, h: control.h, flat: true });
    }
  }

  for (const control of contents) {
    if (control.def) {
      fillRR(ctx, control.x, control.y, control.w, control.h, 12, '#413945');
      drawFitted(ctx, control.def, control.x + control.w / 2, control.y + control.h - 12,
        control.w - 18, control.h - 24);
    } else if (control.addPerson) {
      fillRR(ctx, control.x, control.y, control.w, control.h, 12, '#413945');
      fillCircle(ctx, control.x + control.w / 2, control.y + control.h / 2, 26,
        COLORS.buttonActive);
      drawPlus(ctx, control.x + control.w / 2, control.y + control.h / 2);
    } else if (control.character) {
      fillRR(ctx, control.x, control.y, control.w, control.h, 12, '#413945');
      ctx.save();
      ctx.beginPath();
      ctx.rect(control.x, control.y, control.w, control.h);
      ctx.clip();
      const scale = (control.h - 20) / CHAR_H;
      ctx.translate(control.x + control.w / 2, control.y + control.h - 10);
      ctx.scale(scale, scale);
      drawCharacter(ctx, control.character.spec, time);
      ctx.restore();
    } else if (control.floorStyle) {
      drawFloorSwatch(ctx, control, floorColor);
    } else {
      drawButton(ctx, control);
    }
  }
}

/** A patch of the real floor, so a pattern is chosen by looking at it. */
function drawFloorSwatch(ctx, control, color) {
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, control.x, control.y, control.w, control.h, 10);
  ctx.clip();
  // Draw the room's floor band scaled down into the cell.
  ctx.translate(control.x, control.y - FLOOR_Y * (control.h / (ROOM_H - FLOOR_Y)));
  const s = control.w / ROOM_W;
  ctx.scale(s, control.h / (ROOM_H - FLOOR_Y));
  ctx.fillStyle = color;
  ctx.fillRect(0, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);
  drawFloorSample(ctx, color, control.floorStyle);
  ctx.restore();

  if (control.active) {
    ctx.strokeStyle = COLORS.buttonActive;
    ctx.lineWidth = 4;
    roundRect(ctx, control.x, control.y, control.w, control.h, 10);
    ctx.stroke();
  }
}

function drawPlus(ctx, cx, cy) {
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy);
  ctx.lineTo(cx + 12, cy);
  ctx.moveTo(cx, cy - 12);
  ctx.lineTo(cx, cy + 12);
  ctx.stroke();
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
