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

  openWorld(world) {
    game.world = world;
    game.setScene(createHouse(game));
  },

  goMenu() {
    game.world = null;
    game.setScene(createMenu(game));
  },

  charactersIn(roomId) {
    return game.world ? game.world.characters.filter((c) => c.room === roomId) : [];
  },
};

new Input(canvas, view, () => scene);
window.addEventListener('resize', () => view.resize());
window.addEventListener('orientationchange', () => view.resize());

function frame(now) {
  const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
  lastFrame = now;
  game.time += dt;

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

    navigator.serviceWorker.register('sw.js').catch(() => { /* file:// */ });

    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
  });
}

start();
