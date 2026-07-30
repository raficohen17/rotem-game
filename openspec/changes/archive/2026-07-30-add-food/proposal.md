## Why

Rotem wants cake and steak. The interesting part is not the two objects — it
is the four questions asked alongside them, because each one is really asking
what kind of thing food is.

**Can we put it in the fridge?** Nothing in the game is ever *inside* anything.
Items sit on the floor or on top of other items. A fridge you can put a cake
into needs a new relationship between two objects, and it is worth having,
because it is the first thing in the house with an inside.

**How does eating work?** Everything usable so far is inexhaustible: a shower
can be showered in for ever, a bed slept in every night. Food is the first
thing that runs out. That makes it the first object in the game with a state
that only goes one way.

**Can we put the cake on a table?** This one already works — the surface and
stacking rules were built for it. Worth stating so it stays working.

**Can the cats eat it if we leave it out?** This is the best of the four. It
turns the fridge from a container into a *decision*: leave the cake on the
table and something might happen to it. Nothing in the game has consequences
yet, and this is a consequence a child would find funny rather than punishing —
nothing is lost that cannot be dragged out of a drawer again.

And it gives the cat something to do that is unmistakably its own idea.

## What Changes

- **Two foods.** Cake, which is already in the catalogue as decoration and
  becomes edible, and steak, which is new.
- **Food has portions.** A cake has slices, a steak has bites. Each one eaten
  changes how it looks; the last one finishes it.
- **Anybody standing near food can eat it**, using the same button that puts
  her in the shower.
- **Food can go in the fridge**, which is the first inside in the game. Food in
  the fridge is drawn only when the door is open, and is out of reach.
- **A cat will help itself to a steak left out**, and ignores cake — cats
  cannot taste sweetness, which is true and is exactly the sort of thing worth
  putting in a game a child plays.

## Impact

- `js/model/food.js` — portions, what a cat will eat
- `js/model/using.js` — eating as an action
- `js/model/catlife.js` — a cat choosing food over furniture
- `js/model/world.js` — an item being inside another, and surviving a save
- `js/render/placeholders.js` — steak, and cake in its states
- `assets/catalog.json` — a food drawer
