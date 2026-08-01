/**
 * How long everything takes, on a world with something in it.
 *
 * Run from the browser console:
 *
 *   const { runBench } = await import('./tools/bench.js'); await runBench();
 *
 * It builds a full street — three buildings, a crowd, a room full of things —
 * and times the work the game actually does every frame and every save. The
 * numbers are what the phone is complaining about, so they are measured
 * against a real canvas rather than counted.
 *
 * Not part of the game: nothing imports this, and it is not in the shell the
 * service worker caches.
 *
 * ONE THING TO CHECK BEFORE BELIEVING ANY NUMBER FROM THIS: the tab has to be
 * on screen. A hidden tab is given a deprioritised renderer and stops asking
 * for frames altogether, which made the same room measure 5.6ms and 25ms
 * within the hour, and made a perfectly healthy game look like it was stuck on
 * its loading screen. runBench refuses to guess about it and says so instead.
 */

import { loadCatalog } from '../js/render/catalog.js';
import {
  createWorld, createBuilding, placeItem, placeCharacter, placeCat,
  HOUSE_LAYOUT, MAX_BUILDINGS,
} from '../js/model/world.js';
import { createCharacterSpec } from '../js/model/character.js';
import { createCatSpec } from '../js/model/cat.js';
import { createRoomScene } from '../js/scenes/room.js';
import { createHouse } from '../js/scenes/house.js';
import { createStreet } from '../js/scenes/street.js';
import { createMenu } from '../js/scenes/menu.js';
import { drawCharacter } from '../js/render/character.js';
import { renderStreetThumbnail } from '../js/render/building.js';

/** What a well-used world looks like: three buildings, people in all of them. */
export function heavyWorld(catalog) {
  const world = createWorld('Bench');
  while (world.buildings.length < MAX_BUILDINGS) {
    world.buildings.push(createBuilding(`House ${world.buildings.length + 1}`));
  }

  const fill = ['sofa', 'armchair', 'table_dining', 'lamp_floor', 'plant_tall',
    'bookshelf', 'rug_round', 'tv', 'chair', 'desk_school', 'whiteboard', 'cake',
    'glass', 'fridge', 'stove'];

  world.buildings.forEach((building, b) => {
    HOUSE_LAYOUT.forEach((roomId) => {
      const room = building.rooms[roomId];
      fill.forEach((id, i) => {
        const def = catalog.get(id);
        if (!def) return;
        room.items.push(placeItem(id, 90 + (i % 8) * 140, def.surface === 'wall' ? 250 : 470));
      });
      // Four people and a cat per room, which is a busy but reachable house.
      for (let i = 0; i < 4; i += 1) {
        world.characters.push(placeCharacter(
          { ...createCharacterSpec(), hair: i * 3, size: i % 2 },
          roomId, 200 + i * 220, 470, building.id,
        ));
      }
      world.cats.push(placeCat(createCatSpec(), roomId, 600, 470, building.id));
    });
    void b;
  });
  return world;
}

/** A game object shaped like the real one, without the frame loop. */
function benchGame(catalog, world) {
  const game = {
    catalog,
    time: 1.25,
    world,
    worlds: [world],
    building: world.buildings[0],
    setScene() {},
    persist() {},
    persistSoon() {},
    captureThumb() {},
    goMenu() {},
    goStreet() {},
    openWorld() {},
    openBuilding() {},
    charactersIn: (roomId, buildingId = game.building?.id) => world.characters
      .filter((c) => c.room === roomId && c.building === buildingId),
    catsIn: (roomId, buildingId = game.building?.id) => (world.cats ?? [])
      .filter((c) => c.room === roomId && c.building === buildingId),
    charactersOutside: () => world.characters.filter((c) => c.room === 'street'),
  };
  return game;
}

/**
 * Median milliseconds for one call of `fn`.
 *
 * Two things make a naive timing useless here. Canvas work is queued rather
 * than done, so a draw call returns long before there are any pixels — every
 * scene measured 0.00 ms until a pixel was read back to force the queue
 * through. And the clock is deliberately coarse, so one call of anything fast
 * is unmeasurable; each sample does a batch and divides.
 */
function time(fn, runs = 30, batch = 4, flush = null) {
  const taken = [];
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    for (let n = 0; n < batch; n += 1) fn(i * batch + n);
    if (flush) flush();
    taken.push((performance.now() - start) / batch);
  }
  /*
   * The fastest run, not the middle one.
   *
   * Everything else on the machine only ever adds time, so the median moves
   * around with whatever else is running — two runs of the same code came out
   * 17ms and 49ms. The lowest is the closest thing to what the work actually
   * costs, and it is stable enough to compare two versions with.
   */
  return Math.min(...taken);
}

export async function runBench({ runs = 30, quiet = false, dpr = null } = {}) {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    const warning = 'The tab is hidden — a hidden tab gets a deprioritised '
      + 'renderer and no frames at all, so nothing measured here means anything. '
      + 'Show the page and run it again.';
    if (!quiet) console.warn(warning);
    return { results: {}, report: warning, world: null, hidden: true };
  }
  const catalog = await loadCatalog();
  const world = heavyWorld(catalog);
  const game = benchGame(catalog, world);

  // A canvas the size the phone really draws, at the same pixel ratio.
  const canvas = document.createElement('canvas');
  const ratio = dpr ?? Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(915 * ratio);
  canvas.height = Math.round(412 * ratio);
  const ctx = canvas.getContext('2d');
  const scale = Math.min((915 * ratio) / 1280, (412 * ratio) / 720);

  const frame = (scene) => (i) => {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    game.time = i * 0.016;
    scene.draw(ctx);
  };

  const room = createRoomScene(game, 'living');
  const roomOpen = createRoomScene(game, 'living');
  roomOpen.onTap(1240, 676);
  const house = createHouse(game);
  const street = createStreet(game);
  const menu = createMenu(game);

  // Reading one pixel back waits for everything queued before it.
  const flush = () => ctx.getImageData(0, 0, 1, 1);

  /*
   * A fixed piece of work to measure everything else against.
   *
   * The machine is never quiet twice: the same code measured 17ms and 49ms
   * half a minute apart. Dividing by a workload that never changes turns the
   * numbers into something two runs can be compared on.
   */
  const unit = time(() => {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    for (let i = 0; i < 200; i += 1) {
      ctx.fillStyle = i % 2 ? '#c96' : '#69c';
      ctx.beginPath();
      ctx.arc(40 + (i % 20) * 60, 40 + Math.floor(i / 20) * 60, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 12, 2, flush);

  const results = {
    'room draw': time(frame(room), runs, 4, flush),
    'room draw, drawer open': time(frame(roomOpen), runs, 4, flush),
    'house cutaway draw': time(frame(house), runs, 4, flush),
    'street draw': time(frame(street), runs, 4, flush),
    'menu draw': time(frame(menu), runs, 4, flush),
    'one character': time(() => {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.save();
      ctx.translate(300, 500);
      drawCharacter(ctx, world.characters[0].spec, 1.2, {});
      ctx.restore();
    }, runs, 8, flush),
    'save the worlds': time(() => {
      window.localStorage.setItem('rotem.bench', JSON.stringify(game.worlds));
    }, Math.min(runs, 12), 1),
    'thumbnail': time(() => renderStreetThumbnail(world), Math.min(runs, 10), 1),
  };

  window.localStorage.removeItem('rotem.bench');

  const report = Object.entries(results)
    .map(([name, ms]) => `${name.padEnd(24)} ${ms.toFixed(2)} ms  (${(ms / unit).toFixed(1)} units)`)
    .join('\n');
  results.unit = unit;
  if (!quiet) console.log(report);
  return { results, report, world };
}
