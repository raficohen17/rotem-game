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
