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
