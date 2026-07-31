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

import {
  button, hitTest, drawPanel, drawButton, drawButtons, tabRow, COLORS,
} from '../ui/widgets.js';
import { fillRR, fillCircle, roundRect, shade } from '../render/shapes.js';
import { drawItemArt } from '../render/catalog.js';
import { drawCharacter, charHeight, CHAR_H, CHAR_W } from '../render/character.js';
import {
  ACTIONS, SWITCHES, canUse, useFor, beginUse, stopUsing, isUsing,
  switchFor, toggleSwitch, actOnce, isInstant, isOn, CHEW_TIME,
  canRaiseHand, toggleHand,
} from '../model/using.js';
import {
  seatsIn, seatEveryone, standEveryone, isClassSeated,
} from '../model/classroom.js';
import {
  drawRoomShell, drawRoomContents, roomContents, drawFloorSample,
  ROOM_W, ROOM_H, FLOOR_Y, FLOOR_BAND,
} from '../render/room.js';
import { itemBounds, boundsContain, clampScale, findSurface } from '../model/geometry.js';
import {
  placeItem, placeCharacter, placeCat, frontZ, backZ, WALL_COLORS, FLOOR_COLORS, FLOOR_STYLES,
} from '../model/world.js';
import { createBook } from '../model/book.js';
import { isVessel, isPourable, canPour, pourInto } from '../model/drink.js';
import { createCharacterCreator } from './charcreator.js';
import { createCatCreator } from './catcreator.js';
import { createRuleBook } from './rulebook.js';
import { drawIcon } from '../ui/icons.js';
import { drawCat } from '../render/cat.js';
import { createCatSpec } from '../model/cat.js';
import {
  isFood, putInside, takeOut, isPutAway, panSpot, stockList, freeShelf,
} from '../model/food.js';
import { utensils, clearProgress } from '../model/recipes.js';
import { createBookDesigner } from './bookdesigner.js';
import { createBoardScene } from './board.js';
import { createBoard, traySpot, TRAY_STOCK } from '../model/board.js';
import { createHouse } from './house.js';

const PANEL_TOP = 456;
const CELL = { y: 548, w: 100, h: 152, step: 106, x: 46 };

/**
 * The floating round controls.
 *
 * They used to be 58, on the reasoning that a control next to the thing it
 * acts on can be smaller than one pinned to the edge. On the phone that came
 * out as 33px, well under what a child can hit — and these are the buttons she
 * taps most.
 */
const PIP = 72;

/** How close she has to stand to something before she can use it. */
const USE_REACH = 110;

/**
 * Tabs that are not furniture categories.
 *
 * The ids are prefixed because the catalog has a category called `wall` too —
 * the one holding windows, pictures and clocks. When the paint tab was also
 * called `wall`, selecting the wall-decor drawer opened the paint swatches
 * instead, and those five items could not be placed at all. A test now checks
 * these ids against the catalog's.
 */
export const EXTRA_TABS = [
  { id: 'people', icon: 'person' },
  { id: 'paintWall', icon: 'wall' },
  { id: 'paintFloor', icon: 'floor' },
];

/**
 * @param {{open?: boolean, tab?: string}} [start] which drawer to come back to,
 *   so a scene that sends her here for something can put it in front of her.
 */
export function createRoomScene(game, roomId, start = {}) {
  const room = game.building.rooms[roomId];
  const { catalog } = game;

  let open = start.open === true;
  let tab = catalog.categories.some((c) => c.id === start.tab)
    ? start.tab : catalog.categories[0].id;
  let selected = null;
  let drag = null;

  /**
   * Where the room sits on screen. Both drawing and touch mapping read this,
   * so they can never disagree — and the room lifts out from behind the drawer
   * when it opens rather than being covered by it.
   */
  function transform() {
    return open
      ? { x: 136, y: 12, s: 0.84 }
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
  const catsHere = () => game.catsIn(roomId);
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
    if (!host) return false;

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

  /**
   * Puts an item where it was dropped: on a surface if one is in reach,
   * otherwise on the floor.
   *
   * The surface search has to happen against the raw drop point. Clamping to
   * the floor band first pinned every drop to within sixty pixels of the
   * floor, so nothing could ever reach the top of a second book — a pile of
   * two was the tallest thing anyone could build, and it worked at all only
   * because a table top happened to fall inside the clamped range.
   */
  function settle(entry, x, y) {
    if (standOnSurface(entry, x, y)) return;

    const spot = clampPlacement(entry, x, y);
    entry.x = spot.x;
    entry.y = spot.y;
    if (entry.item === 'book' && entry.lying) standUp(entry);
  }

  /** Moves anything stored in or standing in this item along with it. */
  function carryContents(host) {
    if (!host?.uid) return;
    const def = catalog.get(host.item);
    if (!def) return;
    const pan = utensils().includes(host.item);
    const tray = host.item === 'whiteboard';
    let slot = 0;
    for (const item of room.items) {
      if (item.inside !== host.uid) continue;
      if (pan) putInPan(item, host, def);
      else if (tray) { putInTray(item, host, def, slot); slot += 1; }
      else putInside(item, host, def, item.shelf ?? 0);
    }
  }

  /** Puts an ingredient into a pan, on top of it where it can be seen. */
  function putInPan(item, vessel, def = catalog.get(vessel.item)) {
    if (!def) return;
    const spot = panSpot(vessel, def);
    item.x = spot.x;
    item.y = spot.y;
    item.inside = vessel.uid;
  }

  /** Stands a marker in a whiteboard's tray. */
  function putInTray(marker, board, def = catalog.get(board.item), slot = 0) {
    if (!def) return;
    const spot = traySpot(board, def, slot);
    marker.x = spot.x;
    marker.y = spot.y;
    marker.inside = board.uid;
  }

  /** How many markers are already in this board's tray. */
  function trayCount(board) {
    return room.items.filter((item) => item.inside === board.uid).length;
  }

  /**
   * A new board arrives with markers in it.
   *
   * The same reason a new fridge arrives with food in it: the colours on the
   * board are the markers she owns, so a board with an empty tray is a board
   * she cannot draw on, and that is a poor first thing to happen.
   */
  function stockBoard(board) {
    const def = catalog.get(board.item);
    if (!def) return;
    TRAY_STOCK.forEach((tint, slot) => {
      const marker = placeItem('marker', board.x, board.y);
      marker.tint = tint;
      putInTray(marker, board, def, slot);
      room.items.push(marker);
    });
  }

  /** A whiteboard under this point, if there is one. */
  function boardAt(rx, ry) {
    return room.items.find((item) => {
      if (item.item !== 'whiteboard') return false;
      const def = catalog.get(item.item);
      if (!def) return false;
      return boundsContain(itemBounds(item, def), rx, ry);
    }) ?? null;
  }

  /** Fills a newly placed fridge with a few things. */
  function stockFridge(fridge) {
    const def = catalog.get(fridge.item);
    if (!def) return;
    stockList().forEach((id, shelf) => {
      const food = placeItem(id, fridge.x, fridge.y);
      putInside(food, fridge, def, shelf);
      room.items.push(food);
    });
  }

  /**
   * A glass under this point that could take a drink.
   *
   * Only one that has room: tipping a carton over a full glass should do
   * nothing at all rather than quietly swallowing a measure.
   */
  function vesselAt(rx, ry, drink) {
    return room.items.find((item) => {
      if (!isVessel(item) || !canPour(drink, item)) return false;
      const def = catalog.get(item.item);
      if (!def) return false;
      return boundsContain(itemBounds(item, def), rx, ry);
    }) ?? null;
  }

  /** A utensil under this point, if there is one. */
  function utensilAt(rx, ry) {
    return room.items.find((item) => {
      if (!utensils().includes(item.item)) return false;
      const def = catalog.get(item.item);
      if (!def) return false;
      return boundsContain(itemBounds(item, def), rx, ry);
    }) ?? null;
  }

  /** Whatever a put-away item is inside, if it is still there. */
  function hostOf(item) {
    return room.items.find((entry) => entry.uid === item.inside) ?? null;
  }

  /** A container with a door on it, and the door closed. */
  function isShut(host) {
    return Boolean(host) && switchFor(host.item) === 'open' && !isOn(host);
  }

  /**
   * An open fridge under this point, if there is one.
   *
   * Only when it is open: a cake going through a closed door is a conjuring
   * trick, and having to open it first is what makes the fridge a place.
   */
  function openFridgeAt(rx, ry) {
    return room.items.find((item) => {
      if (!isOn(item) || switchFor(item.item) !== 'open') return false;
      const def = catalog.get(item.item);
      if (!def) return false;
      return boundsContain(itemBounds(item, def), rx, ry);
    }) ?? null;
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
  /**
   * The thing under a point in the room. People win ties.
   *
   * Depth order alone put the furniture first, and the moment a character
   * stood at something she could use — the whole point of standing there —
   * the item covered her and she could not be tapped at all. The buttons that
   * appear on her were unreachable exactly when they were wanted. She is
   * narrower than the shower she is standing in, so the item is still easy to
   * tap on either side of her.
   */
  function pick(rx, ry) {
    const entries = roomContents(room, cast(), catalog);

    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const entry = entries[i];
      if (entry.kind === 'item') continue;
      const c = entry.placed;
      if (rx >= c.x - CHAR_W / 2 && rx <= c.x + CHAR_W / 2
        && ry >= c.y - charHeight(c.spec) && ry <= c.y) return c;
    }

    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const entry = entries[i];
      if (entry.kind !== 'item') continue;
      // Behind a closed door there is nothing to grab — but only a thing with
      // a door counts. A pan has none, and the rule shut the omelette inside
      // it for good.
      if (isPutAway(entry.placed) && isShut(hostOf(entry.placed))) continue;
      const def = catalog.get(entry.placed.item);
      if (def && boundsContain(itemBounds(entry.placed, def), rx, ry)) return entry.placed;
    }

    return null;
  }

  /** Takes one thing out of the room, whether or not it is selected. */
  function removeItem(item) {
    room.items = room.items.filter((entry) => entry !== item);
    if (selected === item) selected = null;
  }

  /**
   * Lets go of a thing about to be deleted.
   *
   * Everything that points at an item by its uid has to stop pointing at it,
   * or the reference outlives the thing. A cake in a deleted fridge stayed in
   * the room for ever: never drawn, because what it was inside was gone, and
   * never usable, because it counted as put away. The markers in a deleted
   * board were worse — they kept feeding colours to a palette nobody could
   * see the pens for.
   */
  function releaseFrom(doomed) {
    for (const item of room.items) {
      if (item.inside !== doomed.uid) continue;
      takeOut(item);
      clearProgress(item);
      settle(item, item.x, FLOOR_BAND.bottom);
    }
    for (const character of cast()) {
      if (character.using?.uid === doomed.uid) stopUsing(character);
    }
    for (const cat of catsHere()) {
      if (cat.on === doomed.uid) delete cat.on;
    }
  }

  function removeSelected() {
    if (!selected) return;
    if (isItem(selected)) {
      releaseFrom(selected);
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

  /** Opens the whiteboard full screen, where a finger can draw on it. */
  function openBoard(board, color = null) {
    const back = () => game.setScene(createRoomScene(game, roomId));
    board.design = board.design ?? createBoard();
    game.setScene(createBoardScene(game, board, room.items, back,
      // No markers anywhere: she is put back in the room with the class
      // drawer open, which is where the markers are. A palette with nothing
      // in it and no way out of it is a dead end.
      () => game.setScene(createRoomScene(game, roomId, { open: true, tab: 'class' })),
      color));
  }

  /**
   * The board a selected marker belongs to, if it is in one's tray.
   *
   * Tapping a pen and being offered "make it bigger" is the wrong answer to
   * what she was asking. A pen in a board's tray is how you write on that
   * board, so it opens it — in that pen's colour.
   */
  function boardForPen(item) {
    if (!isItem(item) || item.item !== 'marker') return null;
    const host = hostOf(item);
    return host?.item === 'whiteboard' ? host : null;
  }

  /**
   * Making a cat.
   *
   * It is dropped on the floor and left to itself — there is nothing to place
   * and nothing to aim, because a cat decides where it goes. It will have
   * chosen somewhere by the time she has looked away and back.
   */
  function openCatCreator() {
    const back = () => game.setScene(createRoomScene(game, roomId));
    game.setScene(createCatCreator(game, (spec) => {
      game.world.cats = game.world.cats ?? [];
      const already = game.world.cats.length;
      game.world.cats.push(placeCat(
        spec, roomId,
        ROOM_W / 2 + ((already % 5) - 2) * 130,
        FLOOR_BAND.bottom - 40,
        game.building.id,
      ));
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
          game.building.id,
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
      ...classButton(),
    ];
  }

  /**
   * Sit everybody down, or stand everybody up.
   *
   * Offered only where it means something: a room with somewhere to sit and
   * somebody to sit there. In a bathroom it would be a button that does
   * nothing, and a button that does nothing is a button she stops trusting.
   */
  function classButton() {
    const here = cast().filter((c) => !c.walk);
    if (!here.length || !seatsIn(room.items).length) return [];
    const down = isClassSeated(here, room.items);
    return [button('classSit', 18, 108, PIP, PIP, {
      icon: down ? 'walk' : 'sit', round: true, tone: 'good',
    })];
  }

  function tabs() {
    if (!open) return [];
    const all = [
      ...EXTRA_TABS.map((e) => ({ id: e.id, icon: e.icon })),
      ...catalog.categories.map((c) => ({ id: c.id, label: c.label })),
    ];
    const row = tabRow(all.length);
    return all.map((entry, i) => button(
      `tab:${entry.id}`, row.at(i), row.y, row.w, row.h,
      { active: entry.id === tab, tabInfo: entry },
    ));
  }

  function panelContents() {
    if (!open) return [];

    if (tab === 'paintWall' || tab === 'paintFloor') {
      const paintingWall = tab === 'paintWall';
      const swatches = paintingWall ? WALL_COLORS : FLOOR_COLORS;
      const current = paintingWall ? room.wall : room.floor;
      const colors = swatches.map((color, i) => button(
        `paint:${i}`, CELL.x + i * 70, CELL.y + 4, 64, 64,
        { swatch: color, color, active: current === color },
      ));
      if (paintingWall) return colors;

      // The floor also gets a surface, chosen separately from its colour —
      // six patterns times ten colours is sixty floors rather than six.
      const patterns = FLOOR_STYLES.map((style, i) => button(
        `surface:${style}`, CELL.x + i * 102, CELL.y + 78, 94, 74,
        { floorStyle: style, active: room.floorStyle === style },
      ));
      return [...colors, ...patterns];
    }

    if (tab === 'people') {
      const controls = [
        button('addPerson', CELL.x, CELL.y, CELL.w, CELL.h, { addPerson: true }),
        button('addCat', CELL.x + CELL.step, CELL.y, CELL.w, CELL.h, { addCat: true }),
      ];
      cast().forEach((character, i) => {
        controls.push(button(`person:${i}`, CELL.x + (i + 2) * CELL.step, CELL.y,
          CELL.w, CELL.h, { character }));
      });
      return controls;
    }

    // The recipe book sits at the front of the kitchen drawer, where the
    // things it is about are. Nothing else in the house tells her that an egg
    // goes in a pan.
    const first = tab === 'kitchen'
      ? [button('recipes', CELL.x, CELL.y, CELL.w, CELL.h, { recipes: true })]
      : [];
    return [
      ...first,
      ...catalog.inCategory(tab).map((def, i) => button(
        `item:${def.id}`, CELL.x + (i + first.length) * CELL.step, CELL.y,
        CELL.w, CELL.h, { def },
      )),
    ];
  }

  /**
   * The usable thing a character is standing at, if any.
   *
   * Standing near it is the whole gesture: she is walked or dragged to the
   * shower and a shower button appears on her. Asking a child to pick the
   * character, then pick a verb, then pick the target is three steps where
   * one will do.
   */
  function nearestUsable(character) {
    if (isItem(character) || isUsing(character)) return null;
    let best = null;
    let closest = Infinity;
    for (const item of room.items) {
      // Food in the fridge is put away. She takes it out first, which is the
      // whole reason the fridge is worth having. A marker in a tray is not
      // put away — but nothing in a tray is usable, so it never gets here.
      if (!canUse(item) || isPutAway(item)) continue;
      const away = Math.abs(item.x - character.x);
      if (away > USE_REACH || away >= closest) continue;
      closest = away;
      best = item;
    }
    return best;
  }

  function useIcon(character) {
    const item = nearestUsable(character);
    return ACTIONS[useFor(item.item)].icon;
  }

  /**
   * Controls for the selected object, floating just above it rather than
   * pinned to the top of the screen — so they are next to what they act on,
   * and gone entirely when nothing is selected.
   */
  function selectionControls() {
    if (!selected) return [];

    const book = isItem(selected) && selected.item === 'book';
    const board = isItem(selected) && selected.item === 'whiteboard';
    const pen = boardForPen(selected);
    const flick = isItem(selected) ? switchFor(selected.item) : null;
    const ids = isItem(selected)
      ? [
        ...(book ? [['design', 'looks']] : []),
        ...(board || pen ? [['draw', 'marker']] : []),
        ...(flick ? [['flick', SWITCHES[flick].icon]] : []),
        ['shrink', 'shrink'], ['grow', 'grow'], ['flip', 'flip'],
        ['sendBack', 'layerDown'], ['bringFront', 'layerUp'], ['delete', 'trash'],
      ]
      : [
        ...(nearestUsable(selected) ? [['use', useIcon(selected)]] : []),
        ...(canRaiseHand(selected) ? [['hand', selected.hand ? 'handDown' : 'handUp']] : []),
        ...(isUsing(selected) ? [['stop', 'cross']] : []),
        ['edit', 'person'], ['delete', 'trash'],
      ];

    const t = transform();
    const width = ids.length * PIP + (ids.length - 1) * 6;

    // The row sits above the object at its natural height, not its scaled one.
    // Measuring the live size moved the buttons on every tap of grow or
    // shrink — sliding them out from under the one finger that is tapping the
    // same button several times in a row, which is exactly how resizing is
    // used. Moving the object still moves the row with it.
    const height = isItem(selected)
      ? (selected.h ?? catalog.get(selected.item)?.h ?? 0)
      : charHeight(selected.spec);

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
      case 'classSit': {
        const here = cast().filter((c) => !c.walk);
        if (isClassSeated(here, room.items)) standEveryone(here);
        else seatEveryone(here, room.items);
        game.persist();
        return true;
      }
      case 'hand': toggleHand(selected); game.persist(); return true;
      case 'drawer': open = !open; return true;
      case 'addPerson': openCreator(null); return true;
      case 'addCat': openCatCreator(); return true;
      case 'recipes':
        game.setScene(createRuleBook(game, () => game.setScene(createRoomScene(game, roomId))));
        return true;
      case 'edit': openCreator(selected); return true;
      case 'use': {
        const item = nearestUsable(selected);
        if (!item) return true;
        if (isInstant(item.item)) {
          // A bite rather than an occupation: she stays put and takes another
          // if she wants one. The last mouthful clears the plate away, but only
          // once the bite has been seen — taking it the instant the tap landed
          // was what made food look like it simply vanished.
          // The plate stays when it is finished — an empty one with crumbs on
          // it is the end of a meal. Taking it away made food look like it had
          // simply vanished.
          actOnce(selected, item, game.time);
        } else {
          beginUse(selected, item);
        }
        game.persist();
        return true;
      }
      case 'stop': stopUsing(selected); game.persist(); return true;
      case 'flick': toggleSwitch(selected); game.persist(); return true;
      case 'design': openBookDesigner(selected); return true;
      case 'draw': {
        const pen = boardForPen(selected);
        if (pen) openBoard(pen, selected.tint ?? 0);
        else openBoard(selected);
        return true;
      }
      case 'delete': removeSelected(); return true;
      default: break;
    }

    const [kind, value] = hit.id.split(':');
    if (kind === 'tab') { tab = value; return true; }
    if (kind === 'paint') {
      if (tab === 'paintWall') room.wall = hit.color;
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
    /** Every tappable thing right now. Exposed so a test can check them all. */
    allControls,

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
      // Where it started, so a carton that was only tipped over a glass can go
      // back to standing where it was rather than ending up on top of it.
      if (target) {
        drag = { mode: 'move', target, dx: p.x - target.x, dy: p.y - target.y, fromX: target.x, fromY: target.y };
      }
    },

    onPointerMove(x, y) {
      if (!drag) return;
      drag.hover = hoveredSurface(x, y);
      if (drag.mode === 'place') { drag.sx = x; drag.sy = y; return; }

      const p = toRoom(x, y);
      settle(drag.target, p.x - drag.dx, p.y - drag.dy);
      // Whatever is in it comes along. Moving the fridge across the room left
      // the cake hanging in the air where the fridge used to be.
      carryContents(drag.target);
    },

    onPointerUp(x, y) {
      if (!drag) return;

      if (drag.mode === 'place') {
        // Released back over the drawer means "changed my mind" — place nothing.
        if (inRoom(x, y)) {
          const p = toRoom(x, y);
          const entry = placeItem(drag.def.id, p.x, p.y);
          if (entry.item === 'book') entry.design = createBook();
          // Dropped on an open fridge, food goes in it. The door has to be open
          // — putting a cake through a shut door would be a conjuring trick,
          // and having to open it first is what makes the fridge feel like a
          // place rather than a decoration.
          const larder = openFridgeAt(p.x, p.y);
          const vessel = utensilAt(p.x, p.y);
          if (larder && isFood(entry)) {
            putInside(entry, larder, catalog.get(larder.item), freeShelf(larder, room.items));
          }
          else if (vessel && isFood(entry)) putInPan(entry, vessel);
          else if (entry.item === 'marker' && boardAt(p.x, p.y)) {
            const board = boardAt(p.x, p.y);
            putInTray(entry, board, catalog.get(board.item), trayCount(board));
          }
          else settle(entry, p.x, p.y);
          // A carton brought straight out of the drawer onto a glass fills it
          // on the way past, so pouring works the first time as well as later.
          const glass = isPourable(entry) ? vesselAt(p.x, p.y, entry.item) : null;
          if (glass) pourInto(entry, glass);
          room.items.push(entry);
          // A new fridge comes with something in it. An empty one is a
          // cupboard, and gives her no reason to cook.
          if (switchFor(entry.item) === 'open') stockFridge(entry);
          // And a new board comes with markers in its tray, for the same
          // reason: an empty one is a blank wall she cannot draw on.
          if (entry.item === 'whiteboard') stockBoard(entry);
          selected = entry;
          game.persist();
        }
      } else {
        // Dragged clear of the fridge it was in, it comes out. Dropped back on
        // an open one, it goes in — so the same gesture puts food away and
        // fetches it out again.
        const moved = drag.target;
        const p0 = toRoom(x, y);
        // Pouring is the one gesture that changes two things at once: a measure
        // leaves the carton and appears in the glass. The carton goes back to
        // where it was standing, because it was tipped, not moved.
        const glass = moved && isPourable(moved) ? vesselAt(p0.x, p0.y, moved.item) : null;
        if (glass && pourInto(moved, glass)) {
          settle(moved, drag.fromX ?? moved.x, drag.fromY ?? moved.y);
        }
        if (moved && isFood(moved)) {
          const p = toRoom(x, y);
          const larder = openFridgeAt(p.x, p.y);
          const vessel = utensilAt(p.x, p.y);
          if (larder) {
            putInside(moved, larder, catalog.get(larder.item), freeShelf(larder, room.items));
          }
          else if (vessel) putInPan(moved, vessel);
          else if (isPutAway(moved)) {
            // Out of the pan it was in, so whatever it had cooked so far stops.
            clearProgress(hostOf(moved));
            takeOut(moved);
            settle(moved, p.x, p.y);
          }
        }
        // A marker goes in the tray of the board it is dropped on, and comes
        // out again when it is dragged off — the same gesture both ways, which
        // is the one the fridge already taught.
        else if (moved?.item === 'marker') {
          const board = boardAt(p0.x, p0.y);
          if (board) {
            const taken = room.items.filter((i) => i.inside === board.uid && i !== moved).length;
            putInTray(moved, board, catalog.get(board.item), taken);
          } else if (isPutAway(moved)) {
            takeOut(moved);
            settle(moved, p0.x, p0.y);
          }
        }
        // A pan pushed along the counter takes its contents with it.
        if (moved) carryContents(moved);
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
      drawRoomContents(ctx, room, cast(), catalog, game.time, selected, catsHere());
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
      ctx.font = '600 20px system-ui, sans-serif';
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
    } else if (control.recipes) {
      fillRR(ctx, control.x, control.y, control.w, control.h, 12, '#413945');
      drawIcon(ctx, 'cook', control.x + control.w / 2, control.y + control.h / 2 - 8,
        COLORS.buttonActive, 1.15);
      drawIcon(ctx, 'book', control.x + control.w / 2 + 22, control.y + control.h / 2 + 22,
        COLORS.ink, 0.6);
    } else if (control.addCat) {
      // A cat with a plus on it, so the two "add" cells are told apart by what
      // they add rather than by their position in the row.
      fillRR(ctx, control.x, control.y, control.w, control.h, 12, '#413945');
      ctx.save();
      ctx.translate(control.x + control.w / 2, control.y + control.h - 34);
      ctx.scale(0.78, 0.78);
      drawCat(ctx, createCatSpec(), time, 'sit');
      ctx.restore();
      fillCircle(ctx, control.x + control.w - 24, control.y + 24, 17, COLORS.buttonActive);
      drawPlus(ctx, control.x + control.w - 24, control.y + 24, 0.6);
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
  ctx.fillStyle = color;
  ctx.fillRect(control.x, control.y, control.w, control.h);
  // Drawn at the chip's own size rather than scaled down from the room, so
  // the seams stay a visible width and the patterns are told apart.
  drawFloorSample(ctx, color, control.floorStyle, control);
  ctx.restore();

  if (control.active) {
    ctx.strokeStyle = COLORS.buttonActive;
    ctx.lineWidth = 4;
    roundRect(ctx, control.x, control.y, control.w, control.h, 10);
    ctx.stroke();
  }
}

function drawPlus(ctx, cx, cy, scale = 1) {
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 6 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 12 * scale, cy);
  ctx.lineTo(cx + 12 * scale, cy);
  ctx.moveTo(cx, cy - 12 * scale);
  ctx.lineTo(cx, cy + 12 * scale);
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
