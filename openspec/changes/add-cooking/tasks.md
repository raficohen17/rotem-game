# Tasks

## 1. Ingredients and utensils

- [x] 1.1 Ingredients in the food drawer: egg, raw steak, and a couple more
- [x] 1.2 A `raw` flag — an ingredient is food that cannot be eaten yet
- [x] 1.3 Pan and pot in the kitchen drawer, with art
- [x] 1.4 A utensil holds one ingredient; the ingredient travels with it
- [x] 1.5 Test: a character is not offered raw steak, but a cat still takes it

## 2. Recipes

- [x] 2.1 `js/model/recipes.js` — what goes in what, and what comes out
- [x] 2.2 Cooking needs ingredient + utensil + a lit stove; any missing does
      nothing
- [x] 2.3 Progress that pauses when the stove goes off and resumes when it
      comes back on
- [x] 2.4 Nothing burns, nothing is wasted, anything can be taken off
- [x] 2.5 Test: every recipe's ingredients, utensils and results are real items

## 3. Watching it cook

- [x] 3.1 A pan that is cooking looks like it, without words
- [x] 3.2 The result plainly replaces the ingredient when it is done
- [x] 3.3 Cooking runs on the same cheap tick as the cats — no per-frame work

## 4. The rule book

- [ ] 4.1 `js/scenes/rulebook.js` — every recipe as pictures
- [ ] 4.2 Built from the recipe table, so a new recipe needs no edit here
- [ ] 4.3 Reached from the kitchen drawer
- [ ] 4.4 Under the scene harness: on screen, hittable, legible

## 5. A stocked fridge

- [x] 5.1 A new fridge arrives with a few random things in it
- [x] 5.2 Only food and ingredients, never furniture
- [x] 5.3 Stocked once, on placing — never restocked on load
- [x] 5.4 Test: two fridges do not hold the same things

## 6. Checks

- [x] 6.1 `npm test`
- [x] 6.2 Cook an omelette end to end in the running game at 915x412
- [ ] 6.3 Screenshots: a stocked fridge, a pan cooking, the rule book
- [ ] 6.4 Bump both versions, commit, merge, push
