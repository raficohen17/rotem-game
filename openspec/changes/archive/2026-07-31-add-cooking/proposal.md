## Why

Food can be put out and eaten. Cooking is the step that makes the kitchen a
room rather than a set of appliances — and it is the first thing in the game
with more than one step.

Everything Rotem can do today is a single action: place it, tap it, eat it. A
recipe is a sequence she has to work out and carry through — find the eggs, get
the pan, put one in the other, put that on the stove, turn it on, wait, take
the omelette out. Nothing else in the game asks that of her, and at seven it is
exactly the kind of asking she is ready for.

Three things have to be true or it will not work.

**She has to be able to find out what makes what.** A recipe nobody can look up
is a recipe nobody will find. So there is a rule book, and it is pictures — egg
and pan make omelette — because the game has never required reading and should
not start now.

**The fridge has to be worth opening.** An empty fridge is a cupboard. A fridge
that already has something in it, and not the same something every time, turns
opening it into a small discovery and gives her a reason to cook rather than
just to arrange.

**Nothing can go wrong.** Play cannot fail here any more than anywhere else.
Food left on the heat does not burn, a wrong pairing simply does not cook, and
anything can be taken back off the stove. The worst outcome is that nothing
happens.

## What Changes

- **Ingredients**: eggs, raw steak, and a few others, which are food that
  cannot be eaten as they are.
- **Utensils** in the kitchen drawer: a pan and a pot, which are things you put
  ingredients into and stand on the stove.
- **Recipes**: an ingredient in the right utensil on a lit stove becomes
  something else after a while. Egg in a pan makes an omelette; raw steak in a
  pan makes a steak.
- **A rule book**, opened from the kitchen, showing every recipe as pictures.
- **A stocked fridge**: a new fridge has a few things in it, chosen at random,
  so no two are quite the same.

## Impact

- `js/model/recipes.js` — what makes what, pure and testable
- `js/model/food.js` — raw ingredients, which cannot be eaten yet
- `js/model/using.js` — putting an ingredient into a utensil
- `js/scenes/rulebook.js` — the recipe book
- `assets/catalog.json` — ingredients and utensils
- The stove already switches on; that switch becomes the heat
