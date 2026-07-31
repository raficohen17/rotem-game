/**
 * The save format, and the migrations that keep old saves working.
 *
 * Pure data and pure functions — no DOM, no canvas — so node:test can cover
 * this directly. That matters more here than anywhere else in the codebase:
 * the worst bug this app could have is Rotem opening it one morning to find
 * the houses she built are gone.
 */

import { clampBook } from './book.js';
import { clampBoard } from './board.js';
import { createFront, clampFront } from './front.js';
import { clampCatSpec } from './cat.js';

export const CURRENT_VERSION = 2;

/**
 * How many buildings stand on a street.
 *
 * Three, because the street is drawn across 1280 points and a building narrower
 * than about 380 stops looking like a building. It is also as many as a child
 * needs: somewhere to live, somewhere to learn, and somewhere else.
 */
export const MAX_BUILDINGS = 3;

/** What a building is for. Its kind picks the sign and what it is called. */
export const BUILDING_KINDS = ['house', 'school', 'shop'];

/**
 * The longest name that still fits on the sign over the door.
 *
 * Enforced here rather than where it is typed, so the limit is the same
 * wherever a name comes from — typed, defaulted, or loaded from an old save.
 */
export const MAX_BUILDING_NAME = 12;

/** Where a character is when she is outside, between the buildings. */
export const STREET = 'street';

/** The room the front door opens into: the one at the bottom left. */
export const FRONT_ROOM = 'living';

export const ROOM_IDS = ['bedroom', 'living', 'kitchen', 'bath'];

export const DEFAULT_WALL = '#ecdcd6';
export const DEFAULT_FLOOR = '#c2996b';

/** Rooms as they appear in the cutaway: two upstairs, two below. */
export const HOUSE_LAYOUT = ['bedroom', 'bath', 'living', 'kitchen'];

/* Tinted paper stock, not poster paint. */

export const WALL_COLORS = [
  '#ecdcd6', '#dde3ea', '#e0e7d6', '#f2e6cd', '#ecd9cb',
  '#dfd8e4', '#d3e0de', '#e8dce4', '#ebe5d9', '#ccd3da',
];

/**
 * Floor surfaces. The colour is chosen separately, so six patterns times ten
 * colours gives sixty floors rather than six.
 */
export const FLOOR_STYLES = ['boards', 'tiles', 'checker', 'herringbone', 'carpet', 'plain'];

export const FLOOR_COLORS = [
  '#c2996b', '#8a6448', '#d6c8ab', '#a3b09b', '#b3a6bd',
  '#ded0b4', '#6f8794', '#bf9a97', '#9c968d', '#556b5c',
];

/** Where a character stands when first placed, in design coordinates. */
export const SPAWN = { x: 640, y: 660 };

let idCounter = 0;

/** Short unique id. Not security-sensitive — just needs to not collide. */
export function makeId() {
  const rand = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID().slice(0, 8)
    : `x${(idCounter += 1)}`;
  return rand;
}

function emptyRoom(id) {
  return { id, wall: DEFAULT_WALL, floor: DEFAULT_FLOOR, floorStyle: 'boards', items: [] };
}

/**
 * The next free "House N" name.
 *
 * Counting the houses on the shelf gives a name that is already taken as soon
 * as one has been deleted — delete House 3 of ten and the replacement is a
 * second House 10. Two identical names on the shelf are impossible to tell
 * apart, so pick the lowest number nobody is using instead.
 */
export function nextHouseName(worlds) {
  const taken = new Set((worlds ?? []).map((world) => world.name));
  for (let n = 1; ; n += 1) {
    const name = `House ${n}`;
    if (!taken.has(name)) return name;
  }
}

/** @returns {object} a brand new world, ready to save. */
/**
 * A building: a name, what it is for, how it looks from outside, and rooms.
 *
 * The rooms are the same four every building has. A school is a school because
 * of what she puts in it and what its sign says, not because the game decided
 * which of its rooms is a classroom.
 */
export function createBuilding(name = 'My House', kind = 'house') {
  const rooms = {};
  for (const id of ROOM_IDS) rooms[id] = emptyRoom(id);
  return { id: makeId(), name, kind, front: createFront(), rooms };
}

export function createWorld(name = 'My House') {
  return {
    version: CURRENT_VERSION,
    id: makeId(),
    name,
    createdAt: 0, // stamped by the caller; keeps this function deterministic
    buildings: [createBuilding(name)],
    characters: [],
    cats: [],
    thumb: null,
  };
}

/** The rooms of one building, by its id. */
export function roomsOf(world, buildingId) {
  return buildingOf(world, buildingId)?.rooms ?? {};
}

/** The building with this id, or the first one, which always exists. */
export function buildingOf(world, id) {
  return world?.buildings?.find((b) => b.id === id) ?? world?.buildings?.[0] ?? null;
}

/**
 * A placed piece of furniture.
 * `x` is the horizontal centre and `y` the baseline it sits on, so depth
 * sorting is just "larger y draws later".
 */
export function placeItem(catalogId, x, y) {
  return { uid: makeId(), item: catalogId, x, y, z: 0, scale: 1, flip: false, tint: 0 };
}

/**
 * A cat, dropped into a room.
 *
 * No z: a cat sorts by where it is standing like everything else, and giving
 * it one would only let it be pushed behind the sofa it is sitting on.
 */
export function placeCat(spec, room, x = SPAWN.x, y = SPAWN.y) {
  return { uid: makeId(), spec, room, x, y, pose: 'stand' };
}

export function placeCharacter(spec, room, x = SPAWN.x, y = SPAWN.y) {
  return { uid: makeId(), spec, room, x, y, z: 0 };
}

/**
 * Next free layer above everything currently placed, for "bring to front".
 *
 * Depth normally comes from the baseline — lower on the floor means nearer —
 * but that leaves no way to pull one item out of a pile without also moving
 * it. `z` is that escape hatch, and nothing else touches it.
 */
export function frontZ(entries) {
  return entries.reduce((top, entry) => Math.max(top, entry.z ?? 0), 0) + 1;
}

export function backZ(entries) {
  return entries.reduce((low, entry) => Math.min(low, entry.z ?? 0), 0) - 1;
}

/*
 * Migrations.
 *
 * Each entry upgrades a world from version N to N+1. There are none yet — v1
 * is the first format — but the machinery and its tests exist from day one so
 * that the first schema change is a routine edit rather than a data loss
 * incident.
 *
 * @type {Record<number, (world: object) => object>}
 */
export const MIGRATIONS = {
  /*
   * v1 -> v2: a world was one house; it becomes a street with that house on it.
   *
   * Everything she has already built has to come through untouched, so the
   * four rooms are lifted wholesale into the first building and everybody is
   * told which building they are standing in. Nothing is thrown away and
   * nothing is asked of her.
   */
  1(world) {
    const building = {
      id: makeId(),
      name: typeof world.name === 'string' && world.name ? world.name : 'My House',
      kind: 'house',
      front: createFront(),
      rooms: world.rooms && typeof world.rooms === 'object' ? world.rooms : {},
    };
    const inside = (who) => ({ ...who, building: building.id });
    const next = {
      ...world,
      version: 2,
      buildings: [building],
      characters: Array.isArray(world.characters) ? world.characters.map(inside) : [],
      cats: Array.isArray(world.cats) ? world.cats.map(inside) : [],
    };
    delete next.rooms;
    return next;
  },
};

/**
 * Brings a loaded world up to the current version and repairs anything
 * missing. Returns null if the input is too broken to salvage.
 */
export function migrateWorld(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  let world = { ...raw };
  let version = Number.isInteger(world.version) ? world.version : 1;

  while (version < CURRENT_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return null; // gap in the chain — refuse rather than corrupt
    world = step(world);
    version += 1;
  }

  // A save written by a NEWER build than the one running. Rotem might install
  // an update on the phone and then open an older cached copy. Loading it
  // read-and-repair is safer than throwing her house away.
  world.version = CURRENT_VERSION;

  return repairWorld(world);
}

/** Fills in anything absent so the rest of the code never checks for gaps. */
export function repairWorld(world) {
  const safe = {
    version: CURRENT_VERSION,
    id: typeof world.id === 'string' && world.id ? world.id : makeId(),
    name: typeof world.name === 'string' && world.name ? world.name : 'My House',
    createdAt: Number.isFinite(world.createdAt) ? world.createdAt : 0,
    buildings: [],
    characters: [],
    cats: [],
    thumb: typeof world.thumb === 'string' ? world.thumb : null,
  };

  const raw = Array.isArray(world.buildings) && world.buildings.length
    ? world.buildings.slice(0, MAX_BUILDINGS)
    : [{ name: safe.name }];
  safe.buildings = raw
    .filter((b) => b && typeof b === 'object')
    .map((b) => repairBuilding(b, safe.name));
  // A street with nothing on it is not a world she can play in.
  if (!safe.buildings.length) safe.buildings = [createBuilding(safe.name)];

  const homes = new Set(safe.buildings.map((b) => b.id));
  const firstHome = safe.buildings[0].id;
  /** Which building somebody is in — or none at all, meaning outdoors. */
  const homeOf = (who) => (who.room === STREET
    ? { building: null }
    : { building: homes.has(who.building) ? who.building : firstHome });

  if (Array.isArray(world.characters)) {
    safe.characters = world.characters
      .filter((c) => c && typeof c === 'object' && typeof c.spec === 'object')
      .map((c) => ({
        uid: typeof c.uid === 'string' ? c.uid : makeId(),
        spec: c.spec,
        room: c.room === STREET || ROOM_IDS.includes(c.room) ? c.room : ROOM_IDS[0],
        ...homeOf(c),
        x: Number.isFinite(c.x) ? c.x : SPAWN.x,
        y: Number.isFinite(c.y) ? c.y : SPAWN.y,
        z: Number.isFinite(c.z) ? c.z : 0,
        // What she is in the middle of doing. Rebuilding the character from a
        // fixed list of fields is what keeps a corrupt save from crashing the
        // game, and it also silently dropped this the first time — she was
        // showering until the world was reopened, and then she was not.
        ...(isUsingRecord(c.using) ? { using: { uid: c.using.uid, action: c.using.action } } : {}),
        // Mid-mouthful is a moment, not a state worth carrying across a
        // session: the clock it is measured against restarts, so a saved one
        // would leave her frozen holding a cake. She simply finishes the bite.
      }));
  }

  // Cats. A world saved before there were any simply has none, which is what
  // it had. Rebuilt from a fixed list of fields like everything else, so a
  // corrupt one cannot crash the room it lives in.
  if (Array.isArray(world.cats)) {
    safe.cats = world.cats
      .filter((c) => c && typeof c === 'object')
      .map((c) => ({
        uid: typeof c.uid === 'string' ? c.uid : makeId(),
        spec: clampCatSpec(c.spec),
        // A cat stays indoors. Nobody wants to look for it on the street.
        room: ROOM_IDS.includes(c.room) ? c.room : ROOM_IDS[0],
        ...homeOf({ ...c, room: ROOM_IDS.includes(c.room) ? c.room : ROOM_IDS[0] }),
        x: Number.isFinite(c.x) ? c.x : SPAWN.x,
        y: Number.isFinite(c.y) ? c.y : SPAWN.y,
        pose: ['stand', 'sit', 'curl'].includes(c.pose) ? c.pose : 'stand',
        /*
         * When it next thinks is deliberately not kept.
         *
         * It counts seconds of play, and the clock restarts at zero each time
         * the app is opened — so a saved one is a debt from the last session
         * that has to be paid off before the cat moves again, and it grows
         * every time she plays. Dropping it means a cat decides on the first
         * frame of a new session, which is the right behaviour anyway: you
         * come back and it has moved.
         */
        ...(typeof c.on === 'string' ? { on: c.on } : {}),
        // Mid-journey between rooms. Kept, so closing the app does not strand
        // a cat halfway down the stairs.
        ...(c.walk && Array.isArray(c.walk.legs) && Number.isInteger(c.walk.index)
          ? { walk: c.walk }
          : {}),
      }));
  }

  return safe;
}

/** A name that will fit on a sign, whatever was typed or loaded. */
export function cleanBuildingName(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ')
    .trim().slice(0, MAX_BUILDING_NAME);
}

/** One building, rebuilt field by field like everything else in a save. */
function repairBuilding(building, worldName) {
  const rooms = {};
  const given = building.rooms && typeof building.rooms === 'object' ? building.rooms : {};
  for (const id of ROOM_IDS) {
    const room = given[id] && typeof given[id] === 'object' ? given[id] : {};
    rooms[id] = {
      id,
      wall: typeof room.wall === 'string' ? room.wall : DEFAULT_WALL,
      floor: typeof room.floor === 'string' ? room.floor : DEFAULT_FLOOR,
      // Rooms saved before floor patterns existed get the original boards.
      floorStyle: FLOOR_STYLES.includes(room.floorStyle) ? room.floorStyle : 'boards',
      items: Array.isArray(room.items) ? room.items.filter(isValidItem).map(repairItem) : [],
    };
  }

  return {
    id: typeof building.id === 'string' && building.id ? building.id : makeId(),
    name: cleanBuildingName(building.name) || cleanBuildingName(worldName) || 'House',
    kind: BUILDING_KINDS.includes(building.kind) ? building.kind : 'house',
    front: clampFront(building.front),
    rooms,
  };
}

/** A saved "she is using something" record, before it is trusted. */
function isUsingRecord(using) {
  return Boolean(using) && typeof using === 'object'
    && typeof using.uid === 'string' && typeof using.action === 'string';
}

/** Guarantees every optional field exists, so nothing downstream checks. */
function repairItem(entry) {
  return {
    uid: typeof entry.uid === 'string' ? entry.uid : makeId(),
    item: entry.item,
    x: entry.x,
    y: entry.y,
    z: Number.isFinite(entry.z) ? entry.z : 0,
    scale: Number.isFinite(entry.scale) && entry.scale > 0 ? entry.scale : 1,
    flip: entry.flip === true,
    tint: Number.isInteger(entry.tint) && entry.tint >= 0 ? entry.tint : 0,
    // Two things carry something she made: a book its cover, a whiteboard the
    // drawing on it. They are repaired by their own rules — running a board's
    // strokes through the book repair would hand back a cover and throw the
    // drawing away. Anything else has no design and the field is absent.
    ...(entry.design && typeof entry.design === 'object'
      ? { design: entry.item === 'whiteboard' ? clampBoard(entry.design) : clampBook(entry.design) }
      : {}),
    // A book laid flat on a pile keeps its orientation and the size that goes
    // with it, or it would spring upright the next time the world is opened.
    ...(entry.lying === true && Number.isFinite(entry.w) && Number.isFinite(entry.h)
      ? { lying: true, w: entry.w, h: entry.h }
      : {}),
    // A lamp she left on is still on tomorrow. Rebuilding an item from a fixed
    // list of fields is what stops a corrupt save crashing the game, and it is
    // also how the record of what a character was doing got silently dropped
    // the first time — so anything worth keeping has to be named here.
    ...(entry.on === true ? { on: true } : {}),
    // How much of a cake is left. Anything silly reads as whole rather than as
    // broken, so a bad save is a full cake and not an invisible one.
    ...(Number.isInteger(entry.left) && entry.left >= 0 ? { left: entry.left } : {}),
    // Shut in the fridge. The first thing in the game that is inside another.
    ...(typeof entry.inside === 'string' ? { inside: entry.inside } : {}),
    ...(Number.isInteger(entry.shelf) ? { shelf: entry.shelf } : {}),
    // What is in a glass, and how much of it. Named here or it is stripped,
    // which is the lesson every stateful field in this game has had to learn.
    ...(Number.isInteger(entry.sips) && entry.sips >= 0 ? { sips: entry.sips } : {}),
    ...(typeof entry.holds === 'string' ? { holds: entry.holds } : {}),
    // How long something has been in the pan. Not a moment on a clock that
    // restarts at zero but an amount already spent, so it keeps: an omelette
    // half made when she closed the game is half made when she opens it.
    ...(Number.isFinite(entry.cooked) && entry.cooked >= 0 ? { cooked: entry.cooked } : {}),
  };
}

function isValidItem(entry) {
  return entry
    && typeof entry === 'object'
    && typeof entry.item === 'string'
    && Number.isFinite(entry.x)
    && Number.isFinite(entry.y);
}
