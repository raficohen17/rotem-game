/**
 * The build version, shown in the corner of the menu.
 *
 * It exists so "am I looking at an old version?" can be answered by looking
 * rather than by clearing caches and hoping. Bump it on every deploy.
 *
 * `CACHE_VERSION` in sw.js must match — a test enforces that, because the two
 * drifting apart is exactly how a stale build hides.
 */
export const VERSION = 'v51';
