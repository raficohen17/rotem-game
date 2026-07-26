## Why

Rotem wants a Toca Boca style game on her Pixel phone — a flat, side-on world
where she designs houses and makes characters. Nothing off the shelf fits: the
real thing is subscription-gated and full of content nobody chose for her, and
the point here is a game she can put her own drawings into.

The constraint that shapes every decision below is that this project has to
survive years of "Dad, can you add a giraffe?" So the edit-to-playing loop has
to stay short, and the app must not depend on anything that rots.

## What Changes

- A **house designer**: four rooms, furniture dragged in from a drawer, moved,
  resized, flipped, layered and deleted; wall and floor colours per room.
- A **character creator**: characters built from layered parts — skin, hair,
  eyes, mouth, top, bottom, shoes, accessory — that can then be placed into
  rooms and dragged around.
- **Ten save slots**, each holding a whole world with a rendered thumbnail.
- An **installable offline app** that lands as an icon on the Pixel home screen
  and updates itself when a new version is published.
- Sandbox play only: **no score, no goals, no timer, no way to lose**.
- Interface is **English plus large icons**, sized for a child's finger. Rotem
  reads English, but icons carry the meaning so nothing depends on reading.

## Capabilities

### New Capabilities

- `house-designer`: placing, arranging and removing furniture across four
  rooms, plus per-room wall and floor colour.
- `character-creator`: building a character from layered parts, and placing
  characters into rooms.
- `world-storage`: persisting up to ten worlds, and surviving format changes
  without losing what Rotem built.
- `offline-app-shell`: installing to the home screen, running with no network,
  and delivering updates without a reinstall.

### Modified Capabilities

None — this is the first change in the project.

## Impact

- New codebase. No existing behaviour to preserve.
- **No runtime dependencies and no build step.** Source is served as written.
- **No network access at runtime at all** — enforced by Content Security
  Policy, not just by convention. No ads, no analytics, no telemetry, no
  third-party fonts or CDNs, no accounts, no data leaving the phone.
- Hosted on GitHub Pages from `main` of `raficohen17/rotem-game`; every push
  reaches the phone on next launch.
- Art is replaceable: each item is one transparent PNG plus one line of
  manifest, so swapping a placeholder for one of Rotem's scanned drawings
  requires no code change.
