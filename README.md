# Rotem's Game

A Toca Boca style 2D sandbox for Rotem — design a flat side-view house, create
characters, dress them up, no scores and no way to lose.

Runs as an installable PWA on a Pixel phone. Offline, no ads, no network calls,
no data collection.

## Status

v1 in progress: house designer (4 rooms) + character creator.

## Running it

No build step. Serve the folder and open it:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Layout

```
index.html            entry point, no bundler
css/                  page chrome only — the game draws to a canvas
js/model/             pure logic, no DOM — this is what the unit tests cover
js/render/            canvas drawing
js/scenes/            menu, house designer, character creator
assets/catalog.json   item manifest: one entry per placeable object
assets/drawings/      Rotem's scanned drawings, as transparent PNGs
```

## Adding a new item

1. Drop a transparent PNG into `assets/drawings/`.
2. Add one entry to `assets/catalog.json`.

That is the whole process — no code change.

## Parts behind a code

Some things in the character creator are locked. They show in the grid greyed
out with a padlock, so Rotem can see what exists; tapping one asks for a code.
Entering it unlocks that part on that device, for good. A wrong code shakes the
field and does nothing else — no message, no count, no lockout.

The locked parts are listed in `js/model/unlocks.js`. To mint a code:

```bash
node tools/make_code.js bottom:10 tyyffk
```

Paste the `codeHash` it prints into that part's row, and **write the code down
somewhere that is not this repository** — it cannot be recovered from the hash,
and retyping it is the only way back after site data is cleared.

This is not a security boundary and is not meant to be one. The whole game runs
on the player's machine, so anyone willing to open devtools can write to the
unlock list directly. The hash only keeps the codes out of a file you could
read. It is a way to hand over a present, not a lock.

## Turning a drawing into an item

Photograph the drawing on white paper in even light, then:

```bash
tools/.venv/bin/python tools/make_sprite.py photo.jpg --id sofa_pink
```

It makes the paper transparent, trims to the drawing and resizes, writing
`assets/drawings/sofa_pink.png`. Give it several photos at once to batch them.

The paper is removed by flooding inward from the edges, so white *inside* the
drawing survives. If a photo was taken in shadow, lower `--brightness`; under
warm indoor light, raise `--tolerance`. For a photo neither setting rescues,
use macOS's own Remove Background (right-click the file in Finder, Quick
Actions) and pass the result through with `--brightness 250`.

First-time setup for the tool:

```bash
python3 -m venv tools/.venv && tools/.venv/bin/pip install Pillow
```
