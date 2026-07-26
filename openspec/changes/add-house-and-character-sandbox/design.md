## Context

The target is one device: Rotem's Pixel phone, held in landscape. There is one
user, no accounts, no backend, and no deadline. The developer is her parent,
working in occasional short sessions.

That shapes the engineering priorities differently from a normal project. The
scarce resource is not performance or scale — a flat 2D scene with a hundred
sprites does not trouble a Pixel — it is **the cost of making a change months
from now**. A stack that needs a toolchain reinstall before a one-line edit is
a stack that quietly ends the project.

Reference point: Toca Life World, the game being emulated, is fully 2D — flat
vector art, side-on view, layered sprites, no camera movement. It is built in
Unity, but Unity is doing 2D there. Nothing about it requires a 3D engine.

## Goals / Non-Goals

**Goals:**

- Rotem can build a house and make characters, offline, from a home screen icon.
- Adding a new piece of furniture costs one PNG and one line of JSON.
- A change made on the laptop reaches her phone on the next launch, with no
  reinstall and no app store.
- Her saved worlds survive every future format change.
- The project still builds and runs in three years with no dependency updates.

**Non-Goals:**

- Play Store distribution. Deferred, and reachable later without a rewrite.
- Any 3D. Explicitly excluded — it would rule out Rotem drawing her own assets.
- Multiplayer, cloud sync, accounts, sharing.
- Scores, goals, timers, failure states. This is a sandbox.
- In-app music playback (see the audio decision below).

## Decisions

### PWA rather than Flutter, React Native or native Android

Chosen because the update loop is the whole ballgame. A PWA published to
GitHub Pages updates on next launch with no reinstall; a Flutter build means
rebuild, transfer, install, every single time. Android Studio plus the SDK is
also 10–15 GB and a Gradle cycle between editing a line and seeing it.

Alternatives: Flutter and Expo/React Native. Expo is genuinely close — its OTA
updates solve most of the same problem — but it still costs a build server, an
account, and a native rebuild for anything touching the native layer.

Crucially this is **not a one-way door**: the same code wraps into a real APK
later via Capacitor or Bubblewrap without a rewrite. The reverse — starting
native and backing out to web — is not available. Given genuine uncertainty
about where this goes, the reversible option wins.

### Canvas 2D rather than DOM, SVG or WebGL

Sprite counts are in the dozens, with no physics and no 3D, so rendering
performance is not a differentiator and cannot be used to pick. What differs is
control and dependencies.

- DOM/CSS: the browser handles hit-testing and layering for free, but free
  rotation, custom hit shapes and a fixed design resolution all get awkward.
- SVG: nice vector story, degrades with node count and filters.
- PixiJS/WebGL: excellent, but a dependency to maintain — against the goal of
  still running untouched in three years.

Canvas 2D costs writing hit-testing and draw ordering by hand. Those are small,
pure, and now unit tested, which is a better place for that complexity than a
dependency. If the scene ever grows to hundreds of animated items, PixiJS drops
into the same rendering model.

### No build step, no framework, no dependencies

Native ES modules, served exactly as written. Deploying is copying a folder.
There is no `node_modules` to rot, no bundler config to break, no dev server
required to make an edit.

React was considered and rejected on fit: game state changes every frame, which
is precisely what its render model is not built around.

### JavaScript with JSDoc types rather than TypeScript

TypeScript catches real bugs but requires compilation, which conflicts with the
decision above. JSDoc annotations plus a checking-only `tsconfig` give editor
type-checking with zero runtime cost and zero build.

### Fixed 1280×720 design space, letterboxed

Everything is authored in one coordinate system and scaled to fit. This removes
responsive layout logic from the entire codebase, and a house built on the
phone looks identical on a laptop. Device pixel ratio is capped at 2 — a Pixel
reports around 2.6, and the extra pixels cost fill rate for no visible gain on
flat art.

### Saves in localStorage, behind an injected backend, versioned from day one

Worlds are small JSON — item ids and positions — so localStorage's 5 MB is
ample. Two things matter more than the storage choice itself:

1. **Every save carries a `version` and there is a migration chain**, with
   tests, before any migration exists. The worst possible bug in this app is
   Rotem opening it to find her houses gone; that risk is designed out rather
   than discovered.
2. **The backend is injected, not imported.** `node:test` passes a plain
   object, and the eventual move to IndexedDB — needed once drawings are
   imported from the camera as blobs — touches one file.

Loading is deliberately forgiving: unknown fields are repaired, out-of-range
values clamped, and a save from a *newer* build is read rather than discarded.

### One PNG per item plus a JSON manifest

This is the most consequential decision in the project, because it is the
action that will be repeated hundreds of times. Adding an item must be
"drop a file, add a line" or the art never gets made.

A sprite atlas was rejected: it buys performance that is not needed and costs a
build tool on every art change. Individual files load fine over HTTP/2 and can
be edited in isolation.

Placeholder art is drawn in code under the **same item ids** the PNGs will use,
so the game is playable before any art exists and each drawing Rotem makes
replaces a placeholder with no code change.

### Service worker with a versioned cache

A plain cache-first service worker makes the app work offline and then never
updates again — the cached copy always wins. Since "updates reach her phone
automatically" is the main reason a PWA was chosen at all, getting this wrong
would undo the platform decision.

So: the cache name carries a version, `activate` deletes every cache that is
not current, the worker claims clients immediately, and the page reloads once
when a new worker takes over. `CACHE_VERSION` must be bumped on every deploy.

### The game plays no audio of its own

Rotem wants her own music from Spotify while she plays. A web app cannot
control Spotify — that needs OAuth, Premium and a network connection, all of
which are excluded here. But on Android, a page that plays audio takes audio
focus and **stops** Spotify.

So the game ships with no background music, and sound effects default to off
behind a toggle. Doing less is what produces the behaviour she asked for.

### Public repo on GitHub Pages

A GitHub Pages site is public regardless of repo visibility — repo privacy
hides source and history, never the deployed files. Since the deployed art is
public either way, a private repo would buy little while costing a second
service (Cloudflare Pages) in the chain. The owner reviewed the trade-off,
including that the repo will contain his child's drawings, and chose public.

### `model/` and `render/` are separate

`js/model/` imports no DOM and no canvas, so `node:test` runs against it
directly with zero dependencies. This split exists to make the logic testable,
not for tidiness — it is what lets migrations, hit-testing and the slot limit
be covered by tests while rendering stays uncovered and unimportant.

## Risks / Trade-offs

- **A cache-first service worker silently freezes the app on an old build** →
  versioned cache, old caches deleted on activate, client reloads on worker
  change; `CACHE_VERSION` bump is part of deploying.
- **A schema change wipes saved worlds** → migration chain plus tests covering
  a load from every past version, in place before the first migration exists.
- **Thumbnails exhaust the 5 MB localStorage quota** → thumbnails kept small
  (roughly 8 KB each, 10 maximum); Rotem's drawings live as repo files, not in
  storage. A failed write degrades to "not saved", never to a crash.
- **A service worker update reloads the page mid-play** → world state is
  written on change rather than on exit, so a reload costs nothing. Updates are
  detected at launch, so in practice the reload lands before play starts.
- **Hand-written hit-testing picks the wrong item when sprites overlap** → draw
  order and hit-testing are pure functions with unit tests, rather than
  something to debug by poking at a phone.
- **The repo is public and will hold a child's drawings** → accepted by the
  owner with the trade-off stated; no names or identifying detail in asset
  filenames.
- **Canvas 2D means no accessibility tree** → accepted. Single known user, and
  the interface is deliberately icon-driven rather than text-driven.
- **Placeholder art may become permanent if drawings never arrive** → the game
  is fully playable with placeholders, so this degrades quality rather than
  blocking anything.

## Migration Plan

No data to migrate — first release. Deployment is a push to `main`, which
GitHub Pages serves at `https://raficohen17.github.io/rotem-game/`. Rollback is
`git revert` and push. Rotem installs once from Chrome's "Add to home screen";
every later version arrives on its own.

Note for pushing: this machine's `~/.ssh/config` maps plain `github.com` to a
corporate key that GitHub rejects, so remotes must use the `github-personal`
host alias. `GH_TOKEN` in `~/.zshrc` also overrides `gh` for every host,
including github.com; `GH_ENTERPRISE_TOKEN` would scope it correctly.

## Open Questions

- Does Rotem want more rooms than four, or is depth within a room better?
- Should characters be placeable in a room in v1, or is that a follow-up?
- What is the workflow for turning a paper drawing into a transparent PNG —
  phone photo plus background removal, or a scan?
