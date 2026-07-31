## Why

A kitchen with food and no drink is half a kitchen, and pouring is a different
verb from every other one in the game.

Everything so far either goes somewhere or gets used up. Pouring moves something
from one object into another and changes both — the bottle has less in it and
the glass has some. That is worth having on its own, and it is the same shape
as the cooking step that follows it, so the two teach each other.

It also gives the fridge a second reason to exist. A carton of juice is exactly
the sort of thing that should be in there when she opens it.

## What Changes

- **Something to drink**: milk, juice and water, as containers that hold several
  glassfuls.
- **Something to drink out of**: a glass and a mug.
- **Pouring**: a container tipped into an empty glass fills it and uses one of
  its own. The glass shows what is in it by its colour, and how much by how
  full it is.
- **Drinking**: the same as eating — a character near a full glass drinks it in
  a few goes, and the glass is left empty rather than vanishing.
- **A drop for the cat**: milk poured into a bowl is something a cat will go
  for, exactly as a steak is.

## Impact

- `js/model/drink.js` — what pours into what, and how much
- `js/model/using.js` — pouring and drinking as actions
- `js/model/catlife.js` — milk counts as something worth crossing a room for
- `assets/catalog.json` — a drinks drawer
