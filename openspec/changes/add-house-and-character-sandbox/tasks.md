## 1. App shell and canvas core

- [x] 1.1 Create `index.html` with no build step, Content Security Policy blocking every external origin, and a single full-screen canvas
- [x] 1.2 Add `manifest.webmanifest` for fullscreen landscape home screen install
- [x] 1.3 Write `sw.js` with a versioned cache, deletion of stale caches on activate, and offline navigation fallback
- [x] 1.4 Build `js/core/view.js`: fixed 1280x720 design space, letterbox scaling, device pixel ratio capped at 2
- [x] 1.5 Build `js/core/input.js`: pointer events in design coordinates, single pointer, tap versus drag discrimination
- [x] 1.6 Register the service worker in `main.js` and reload once when a new worker takes over, guarded against reload loops
- [x] 1.7 Generate `assets/icon-192.png` and `assets/icon-512.png`

## 2. Model layer (no DOM, no canvas)

- [x] 2.1 Define the world schema in `js/model/world.js` with `version`, four rooms, characters and thumbnail
- [x] 2.2 Add the migration chain and `repairWorld` so unknown, missing or newer-version data loads rather than fails
- [x] 2.3 Build `js/model/storage.js` with an injected backend and a ten-world limit
- [x] 2.4 Build `js/model/geometry.js`: item bounds, depth ordering, frontmost-wins hit testing, scale clamping
- [x] 2.5 Define character parts and `clampSpec` in `js/model/character.js`

## 3. Item catalog and placeholder art

- [x] 3.1 Define the catalog format: one entry per item with id, category, size, surface and colour options
- [x] 3.2 Draw forty-four placeholder items in code across beds, seats, tables, storage, kitchen, bath, decor, pets and wall
- [x] 3.3 Load `assets/drawings/<id>.png` when the manifest lists one and fall back to the placeholder otherwise, so a drawing replaces a placeholder with no code change
- [x] 3.4 Write the character renderer: layered parts drawn from a spec, with an idle animation

## 4. Scenes

- [x] 4.1 Build shared icon-only widgets: buttons, tab strips, drawer, colour swatch grid, all at least 64 units of touch target
- [x] 4.2 Build the world menu: ten slots with thumbnails, create, open and delete, with a clear message when full
- [x] 4.3 Build the house designer: 2x2 cutaway, tap-to-zoom, drawer, drag-to-place, drag-to-move, selection controls for resize, flip, layer and delete
- [x] 4.4 Add per-room wall and floor colour palettes
- [x] 4.5 Build the character creator: part tabs, option grids, colour swatches, live preview
- [x] 4.6 Place characters into rooms and drag them, sorted into the room's depth order
- [x] 4.7 Save on every change, and render a thumbnail when leaving a world

## 5. Tests

- [x] 5.1 Set up `node:test` with no dependencies and an `npm test` script
- [x] 5.2 Test save and load round-trip, corrupt data, missing rooms and a failing backend
- [x] 5.3 Test migration from every past version, plus loading a newer-version save
- [x] 5.4 Test the ten-world limit, and that deleting frees a slot
- [x] 5.5 Test geometry: depth ordering, frontmost-wins hit testing on overlaps, scale clamping
- [x] 5.6 Test `clampSpec` against out-of-range and missing part indices
- [x] 5.7 Test catalog integrity: ids unique, drawings manifest matches the files on disk

## 6. Ship

- [x] 6.1 Verify at Pixel viewport in the browser: landscape layout, touch target sizes, nothing clipped
- [x] 6.2 Confirm no network requests reach any third-party origin while playing
- [x] 6.3 Confirm install to home screen, offline start, and that a version bump reaches an installed copy
- [x] 6.4 Merge to `main` so GitHub Pages serves it, and install it on Rotem's phone
