## Why

The speed work carried on past the first round, and what came out of it was not
a list of tricks but three rules worth writing down — because the next person
to add an item, a character part or a scene will otherwise put the cost
straight back.

Eighteen experiments were run. Five of them were thrown away after being
measured, including the one that looked most obviously right. That ratio is the
point: none of this was decidable by reading the code.

## What Changes

- **Detail is drawn to the size it is drawn at.** Two rules, because two things
  disappear differently: a feature disappears when it is too small, and texture
  disappears when its line is too thin.
- **The game draws as often as it needs to and no more**: fast while something
  is happening, half that while nothing is.
- **An optimisation is measured or it is not an optimisation**, and the
  measurement is written down next to it — including the ones that were
  reverted, so nobody spends the day rediscovering them.

## Impact

- `js/render/shapes.js` — the two size rules
- `js/core/pace.js` — how often to draw, pure and tested
- `js/render/*` — where both are applied
- `tools/bench.js` — how any of this is measured, and when it refuses to
