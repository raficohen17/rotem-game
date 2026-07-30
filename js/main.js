/**
 * Boot, shared state and the frame loop.
 */

import { View } from './core/view.js';
import { Input } from './core/input.js';
import { loadCatalog } from './render/catalog.js';
import { createStore, replaceWorld } from './model/storage.js';
import { createMenu } from './scenes/menu.js';
import { createHouse } from './scenes/house.js';
import { createArtSheet } from './scenes/artsheet.js';
import { stepWalk } from './model/travel.js';
import { stepCat, isDue } from './model/catlife.js';
import { cookOn, isOverHeat, utensils, clearProgress } from './model/recipes.js';
import { isOn } from './model/using.js';
import { renderHouseThumbnail } from './render/room.js';
import { drawRotatePrompt } from './ui/rotate.js';
import { HOUSE_LAYOUT } from './model/world.js';
import { ROOM_W, FLOOR_BAND } from './render/room.js';

/** Where a cat's paws go when it is walking rather than sitting on something. */
const CAT_FLOOR_Y = FLOOR_BAND.bottom - 40;

/** What the cats' clock counts from. Wall time, so it runs while the app does not. */
const catEpoch = Date.now();

const canvas = document.getElementById('stage');
const view = new View(canvas);

let scene = null;
let lastFrame = 0;

/**
 * localStorage throws outright in some privacy modes rather than merely
 * failing to persist, so it is probed once and swapped for a memory-backed
 * stand-in. The game stays playable either way; only saving is lost.
 */
function safeStorage() {
  try {
    const probe = '__rotem_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    const memory = new Map();
    return {
      getItem: (k) => (memory.has(k) ? memory.get(k) : null),
      setItem: (k, v) => memory.set(k, v),
    };
  }
}

const store = createStore(safeStorage());

/** Everything the scenes share. */
const game = {
  view,
  catalog: null,
  time: 0,
  worlds: [],
  world: null,

  setScene(next) {
    scene = next;
    if (scene?.enter) scene.enter();
  },

  /**
   * Writes the current world through to storage. Called after every change
   * rather than on the way out, so closing the app mid-play loses nothing.
   */
  persist() {
    if (game.world) game.worlds = replaceWorld(game.worlds, game.world);
    store.save(game.worlds);
  },

  /**
   * Saves at most a few times a second.
   *
   * A walk moves a character every frame, and writing the whole world to
   * storage sixty times a second would be wasteful for a position that is
   * only interesting once she stops.
   */
  persistSoon() {
    game.pendingSave = true;
  },

  /**
   * Re-renders the picture of the house shown in the menu.
   *
   * This used to happen only when leaving the house by its home button, so a
   * world closed any other way — or simply never left — showed a blank slot on
   * the shelf. It now refreshes on a timer while a world is open, which costs a
   * small canvas render every few seconds and means the menu always shows the
   * house as it currently stands.
   */
  captureThumb() {
    if (!game.world || !game.catalog) return;
    game.world.thumb = renderHouseThumbnail(game.world, HOUSE_LAYOUT, game.catalog);
    game.pendingSave = true;
  },

  openWorld(world) {
    game.world = world;
    game.setScene(createHouse(game));
    // A brand new world gets a picture straight away, so its slot is never
    // blank even if she backs straight out again.
    game.captureThumb();
  },

  goMenu() {
    game.captureThumb();
    game.persist();
    game.world = null;
    game.setScene(createMenu(game));
  },

  charactersIn(roomId) {
    return game.world ? game.world.characters.filter((c) => c.room === roomId) : [];
  },

  catsIn(roomId) {
    return game.world ? (game.world.cats ?? []).filter((c) => c.room === roomId) : [];
  },
};

// No scene while the phone is upright, so nothing can be tapped behind the
// rotate prompt — a stray tap on a control she cannot see would act on the
// house she cannot see either.
new Input(canvas, view, () => (view.isPortrait() ? null : scene));
window.addEventListener('resize', () => view.resize());
window.addEventListener('orientationchange', () => view.resize());

function frame(now) {
  const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
  lastFrame = now;
  game.time += dt;

  game.saveTimer = (game.saveTimer ?? 0) + dt;
  if (game.pendingSave && game.saveTimer > 0.4) {
    game.pendingSave = false;
    game.saveTimer = 0;
    game.persist();
  }

  // Held upright, the game is asked for rather than drawn. Everything above
  // this line still runs — a save in flight is not stranded by a rotation —
  // but the world stops where it is until the phone comes back round.
  if (view.isPortrait()) {
    view.beginScreen();
    drawRotatePrompt(view.ctx, view.cssW, view.cssH, game.time);
    requestAnimationFrame(frame);
    return;
  }

  // Keep the menu's picture of the house roughly current, so closing the app
  // mid-play still leaves a recognisable slot on the shelf.
  game.thumbTimer = (game.thumbTimer ?? 0) + dt;
  if (game.world && game.thumbTimer > 5) {
    game.thumbTimer = 0;
    game.captureThumb();
  }

  // Characters keep walking whichever scene is showing, so a journey started
  // in the house view carries on after zooming into a room.
  if (game.world) {
    let moved = false;
    for (const character of game.world.characters) {
      if (character.walk) {
        stepWalk(character, dt, ROOM_W);
        moved = true;
      }
    }
    /*
     * Anything on the stove cooks. Cheap by the same argument as the cats: a
     * pan with nothing in it or a cold stove is one lookup and a skip, and
     * there are only ever a handful of pans in a house.
     */
    for (const room of Object.values(game.world.rooms)) {
      for (const utensil of room.items) {
        if (!utensils().includes(utensil.item)) continue;
        const contents = room.items.find((i) => i.inside === utensil.uid);
        if (!contents) { clearProgress(utensil); continue; }
        const made = cookOn(utensil, contents, dt, isOverHeat(utensil, room.items, isOn));
        if (made) {
          // The ingredient becomes the thing it was cooked into, in place, so
          // it stays in the pan she put it in.
          contents.item = made;
          delete contents.left;
          moved = true;
        }
      }
    }

    // Cats think for themselves every twenty seconds or so. On every other
    // frame this is one comparison each and an early return, which is the
    // whole reason a house full of them costs nothing.
    const house = { rooms: HOUSE_LAYOUT, width: ROOM_W, floorY: CAT_FLOOR_Y };
    /*
     * Cats keep their own clock, off the wall rather than off the frames.
     *
     * game.time only advances while the game is drawing, so a phone in a
     * pocket freezes it — and Rotem's phone spends most of its life in a
     * pocket. Measured that way the cat had barely aged a minute between one
     * look and the next, which is why it appeared to sit in the same room for
     * hours. Off the wall clock it carries on living while she is away, and
     * has moved by the time she looks again, which is the whole idea of it.
     */
    const catNow = (Date.now() - catEpoch) / 1000;
    for (const cat of game.world.cats ?? []) {
      // On its way to another room: the same stepper the people use, since it
      // only ever needed something with a room, an x and a walk.
      if (cat.walk) {
        stepWalk(cat, dt, ROOM_W);
        if (!cat.walk) cat.dueAt = 0; // arrived — find somewhere to sit
        moved = true;
        continue;
      }
      if (!isDue(cat, catNow)) continue;
      const room = game.world.rooms[cat.room];
      if (stepCat(cat, room?.items ?? [], (id) => game.catalog?.get(id),
        catNow, Math.random, house)) {
        moved = true;
      }
    }

    if (moved) game.persistSoon();
  }

  if (scene?.update) scene.update(dt);
  view.begin();
  if (scene?.draw) scene.draw(view.ctx);

  requestAnimationFrame(frame);
}

function drawMessage(message) {
  view.begin();
  const { ctx } = view;
  ctx.fillStyle = '#e8e2f5';
  ctx.font = '600 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, 640, 360);
}

async function start() {
  drawMessage('Loading…');
  try {
    game.catalog = await loadCatalog();
  } catch (error) {
    drawMessage('Could not load the catalog');
    console.error(error);
    return;
  }

  game.worlds = store.load();

  // ?dev=art is a contact sheet of every item, used to check placeholder art
  // and to see how a new drawing sits next to the rest of the set.
  const dev = new URLSearchParams(location.search).get('dev');
  game.setScene(dev === 'art' ? createArtSheet(game) : createMenu(game));

  requestAnimationFrame(frame);
}

/*
 * The service worker is what makes the app work offline, and the reload below
 * is what stops a cached copy from serving an old build forever. The flag
 * guards against a reload loop if activation fires more than once.
 */
const IS_LOCAL = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Caching during development means every edit is served stale until the
    // version is bumped, so the worker is left off locally. It still needs
    // testing — that happens against the deployed HTTPS site, which is the
    // only place it behaves the way Rotem's phone will.
    if (IS_LOCAL) {
      navigator.serviceWorker.getRegistrations()
        .then((all) => all.forEach((registration) => registration.unregister()))
        .catch(() => { /* nothing registered */ });
      return;
    }

    navigator.serviceWorker.register('sw.js').then((registration) => {
      if (!registration) return;

      /*
       * Ask whether there is a new build, rather than waiting to be told.
       *
       * Registering alone only checks on a fresh navigation. Rotem does not
       * navigate — she opens the app from her home screen and Android resumes
       * it from the app switcher, which is not a load, so a phone could sit on
       * an old build for as long as she never fully closed it. Checking when
       * the app comes back to the foreground is what makes an update arrive
       * without her having to know what a cache is.
       */
      let lastCheck = 0;
      const checkForUpdate = () => {
        const now = Date.now();
        // Not on every glance at the screen; a deploy takes longer than this.
        if (now - lastCheck < 60000) return;
        lastCheck = now;
        registration.update().catch(() => { /* offline, which is fine */ });
      };

      checkForUpdate();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
    }).catch(() => { /* file:// */ });

    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      // Whatever she has just done is worth more than the update. The throttled
      // save can be up to a moment behind, and a reload would take that with it.
      try { game.persist(); } catch { /* nothing open yet */ }
      location.reload();
    });
  });
}

start();
