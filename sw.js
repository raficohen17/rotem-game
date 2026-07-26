/*
 * Offline cache.
 *
 * The trap this file exists to avoid: a plain cache-first service worker makes
 * the app work offline and then never updates again, because the cached copy
 * always wins. So the cache name carries a version, activate() deletes every
 * cache that isn't the current one, and the client reloads once when a new
 * worker takes over.
 *
 * BUMP CACHE_VERSION ON EVERY DEPLOY or Rotem keeps playing the old build.
 */
const CACHE_VERSION = 'v19';
const CACHE_NAME = `rotem-${CACHE_VERSION}`;

// Only the shell is precached. Everything else (art, catalog) is cached the
// first time it is requested, so adding items never means editing this list.
const SHELL = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/main.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Same-origin only. There is nothing else to fetch — the app makes no
  // network calls at runtime by design.
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline and not in the cache. Falling back to the shell keeps a
    // navigation from showing the browser's error page.
    if (request.mode === 'navigate') {
      const shell = await caches.match('index.html');
      if (shell) return shell;
    }
    throw err;
  }
}
