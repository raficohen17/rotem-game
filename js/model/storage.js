/**
 * Save slots.
 *
 * The backend is injected rather than reaching for localStorage directly, for
 * two reasons: node:test can pass a plain object, and swapping to IndexedDB
 * later (needed once drawings are imported from the camera as blobs) touches
 * only this file.
 */

import { CURRENT_VERSION, migrateWorld } from './world.js';

export const STORAGE_KEY = 'rotem.worlds';
export const MAX_WORLDS = 10;

/**
 * @param {{getItem(k: string): string|null, setItem(k: string, v: string): void}} backend
 */
export function createStore(backend) {
  return {
    /** @returns {object[]} every saved world, repaired and up to date. */
    load() {
      let parsed;
      try {
        const raw = backend.getItem(STORAGE_KEY);
        if (!raw) return [];
        parsed = JSON.parse(raw);
      } catch {
        return []; // corrupt blob — better an empty shelf than a crash
      }

      const list = Array.isArray(parsed?.worlds) ? parsed.worlds : [];
      return list.map(migrateWorld).filter(Boolean).slice(0, MAX_WORLDS);
    },

    /** @param {object[]} worlds */
    save(worlds) {
      const payload = {
        version: CURRENT_VERSION,
        worlds: worlds.slice(0, MAX_WORLDS),
      };
      try {
        backend.setItem(STORAGE_KEY, JSON.stringify(payload));
        return true;
      } catch {
        // Quota exceeded, or private mode with storage disabled. The game
        // stays playable; only persistence is lost.
        return false;
      }
    },
  };
}

/** @returns {boolean} whether another world can be added. */
export function canAddWorld(worlds) {
  return worlds.length < MAX_WORLDS;
}

/** Adds a world if there is room, returning a new array either way. */
export function addWorld(worlds, world) {
  if (!canAddWorld(worlds)) return worlds.slice();
  return [...worlds, world];
}

export function removeWorld(worlds, id) {
  return worlds.filter((w) => w.id !== id);
}

export function replaceWorld(worlds, world) {
  const index = worlds.findIndex((w) => w.id === world.id);
  if (index === -1) return addWorld(worlds, world);
  const next = worlds.slice();
  next[index] = world;
  return next;
}
