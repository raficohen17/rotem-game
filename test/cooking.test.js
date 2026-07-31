import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  RECIPES, HEAT_SOURCE, recipeFor, recipesIn, utensils, ingredients,
  isOverHeat, cookOn, cookingProgress, clearProgress,
} from '../js/model/recipes.js';
import {
  isRaw, isEdible, isFood, panSpot, stockList, FRIDGE_STOCK, STOCK_MIN, STOCK_MAX,
  shelfSpot, putInside, freeShelf, SHELVES,
} from '../js/model/food.js';
import { canUse } from '../js/model/using.js';
import { catEats } from '../js/model/food.js';
import { placeItem } from '../js/model/world.js';
import { PLACEHOLDERS } from '../js/render/placeholders.js';
import { cardGrid } from '../js/scenes/rulebook.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'assets/catalog.json'), 'utf8'));
const lookup = (id) => catalog.items.find((i) => i.id === id);
const lit = () => true;
const cold = () => false;

/* -------------------------------------------------------- the recipe table */

test('every recipe names real items', () => {
  // A typo here is a recipe that can never be cooked and a picture that cannot
  // be drawn in the rule book.
  const ids = new Set(catalog.items.map((i) => i.id));
  for (const r of RECIPES) {
    assert.ok(ids.has(r.needs), `${r.needs} is a catalog item`);
    assert.ok(ids.has(r.in), `${r.in} is a catalog item`);
    assert.ok(ids.has(r.makes), `${r.makes} is a catalog item`);
    assert.ok(r.takes > 0, `${r.makes} takes some time`);
  }
});

test('everything a recipe mentions can be drawn', () => {
  for (const r of RECIPES) {
    for (const id of [r.needs, r.in, r.makes]) {
      assert.ok(typeof PLACEHOLDERS[id] === 'function', `${id} has art`);
    }
  }
});

test('the heat source is a real item', () => {
  assert.ok(catalog.items.some((i) => i.id === HEAT_SOURCE));
});

test('an egg in a pan makes an omelette', () => {
  const r = recipeFor('egg', 'pan');
  assert.equal(r.makes, 'omelette');
});

test('raw steak in a pan makes a steak', () => {
  assert.equal(recipeFor('steak_raw', 'pan').makes, 'steak');
});

test('a pairing with no recipe makes nothing', () => {
  assert.equal(recipeFor('cake', 'pan'), null);
  assert.equal(recipeFor('cake', 'pot'), null, 'a pot does not cook cake');
  assert.equal(recipeFor(undefined, undefined), null);
});

/* --------------------------------------------------------- all three parts */

test('nothing cooks without heat', () => {
  const pan = placeItem('pan', 600, 310);
  const egg = placeItem('egg', 600, 300);
  assert.equal(cookOn(pan, egg, 100, false), null, 'a cold stove makes nothing');
  assert.equal(cookingProgress(pan, egg), 0, 'and does not quietly build up');
});

test('nothing cooks without a utensil', () => {
  const egg = placeItem('egg', 600, 470);
  // An egg put straight on the stove is not in anything.
  assert.equal(recipeFor('egg', 'stove'), null);
});

test('nothing cooks without something to cook', () => {
  const pan = placeItem('pan', 600, 310);
  assert.equal(cookOn(pan, null, 100, true), null);
});

test('a pan has to be on the stove, not beside it', () => {
  const stove = placeItem('stove', 600, 470);
  const onIt = placeItem('pan', 600, 310);
  const beside = placeItem('pan', 900, 470);
  assert.equal(isOverHeat(onIt, [stove], lit), true);
  assert.equal(isOverHeat(beside, [stove], lit), false, 'across the room is not cooking');
  assert.equal(isOverHeat(onIt, [stove], cold), false, 'nor is a cold stove');
});

test('an egg becomes an omelette after a while', () => {
  const pan = placeItem('pan', 600, 310);
  const egg = placeItem('egg', 600, 300);
  const recipe = recipeFor('egg', 'pan');

  let made = null;
  for (let t = 0; t < recipe.takes - 1 && !made; t += 1) made = cookOn(pan, egg, 1, true);
  assert.equal(made, null, 'not before its time');
  made = cookOn(pan, egg, 2, true);
  assert.equal(made, 'omelette');
});

/* ------------------------------------------------------ nothing goes wrong */

test('turning the stove off pauses rather than spoils', () => {
  const pan = placeItem('pan', 600, 310);
  const egg = placeItem('egg', 600, 300);
  cookOn(pan, egg, 3, true);
  const part = cookingProgress(pan, egg);
  assert.ok(part > 0 && part < 1, 'it is part way through');

  cookOn(pan, egg, 60, false);   // stove off for a long while
  assert.equal(cookingProgress(pan, egg), part, 'it waited exactly where it was');

  cookOn(pan, egg, 3, true);
  assert.ok(cookingProgress(pan, egg) > part, 'and carried on from there');
});

test('something finished does not burn if it is left on', () => {
  const pan = placeItem('pan', 600, 310);
  const egg = placeItem('egg', 600, 300);
  let made = null;
  while (!made) made = cookOn(pan, egg, 4, true);
  egg.item = made;

  // An omelette in a pan is not an ingredient for anything.
  assert.equal(cookOn(pan, egg, 1000, true), null, 'it just sits there');
  assert.equal(egg.item, 'omelette');
});

test('taking it out of the pan forgets what it had done', () => {
  const pan = placeItem('pan', 600, 310);
  const egg = placeItem('egg', 600, 300);
  cookOn(pan, egg, 6, true);
  clearProgress(pan);
  assert.equal(cookingProgress(pan, egg), 0);
});

/* -------------------------------------------------------- raw is not food */

test('raw things are not offered to people but a cat still takes them', () => {
  assert.equal(isRaw('steak_raw'), true);
  assert.equal(isRaw('steak'), false);
  assert.equal(canUse(placeItem('steak_raw', 0, 0)), false, 'nobody eats it raw');
  assert.equal(canUse(placeItem('steak', 0, 0)), true, 'cooked, she will');
  assert.equal(catEats('steak_raw'), true, 'a cat does not wait for anybody to cook');
});

test('everything a recipe makes is something somebody would eat', () => {
  for (const r of RECIPES) {
    assert.equal(isEdible(placeItem(r.makes, 0, 0)), true, `${r.makes} is worth cooking`);
  }
});

test('every ingredient is food that needs cooking', () => {
  for (const id of ingredients()) {
    assert.equal(isFood(placeItem(id, 0, 0)), true, `${id} is food`);
    assert.equal(isRaw(id), true, `${id} needs cooking`);
  }
});

/* ------------------------------------------------------------- the pan */

test('a utensil is in the kitchen drawer where the stove is', () => {
  for (const id of utensils()) {
    assert.equal(lookup(id).cat, 'kitchen', `${id} is with the stove`);
  }
});

test('what is in a pan sits on top of it, where it can be watched', () => {
  const pan = placeItem('pan', 600, 310);
  const spot = panSpot(pan, lookup('pan'));
  assert.equal(spot.x, pan.x);
  assert.ok(spot.y < pan.y, 'on top, not inside');
});

test('every utensil can be used for something', () => {
  for (const id of utensils()) {
    assert.ok(recipesIn(id).length > 0, `${id} makes something`);
  }
});

test('what is in a pan can be taken out of it', () => {
  // A pan has no door, but the rule that stops her reaching through a closed
  // fridge treated anything not switched on as shut — so a finished omelette
  // was stuck in the pan for good, which is the one place it must not be.
  const source = readFileSync(join(ROOT, 'js/scenes/room.js'), 'utf8');
  assert.match(source, /function isShut\(host\)/, 'being shut is asked about explicitly');
  assert.match(source, /switchFor\(host\.item\) === 'open' && !isOn\(host\)/,
    'and only a thing with a door can be shut');
  assert.equal(/isPutAway\(entry\.placed\) && !isOn\(/.test(source), false,
    'the old rule that caught pans is gone');
});

/* ---------------------------------------------------- a fridge worth opening */

test('a new fridge arrives with a few things in it', () => {
  // An empty fridge is a cupboard, and gives no reason to cook.
  const list = stockList(() => 0.5);
  assert.ok(list.length >= STOCK_MIN && list.length <= STOCK_MAX, `${list.length} things`);
});

test('two fridges do not hold the same things', () => {
  const seen = new Set();
  for (let i = 0; i < 40; i += 1) seen.add(stockList().join(','));
  assert.ok(seen.size > 1, 'they vary');
});

test('a fridge never holds the same thing twice', () => {
  for (let i = 0; i < 40; i += 1) {
    const list = stockList();
    assert.equal(new Set(list).size, list.length, `${list} has no duplicates`);
  }
});

test('a fridge holds ingredients, never a finished meal', () => {
  // Finding an omelette in the fridge would make cooking one pointless in
  // exactly the way taking one from the drawer did.
  const made = new Set(RECIPES.map((r) => r.makes));
  for (const id of FRIDGE_STOCK) {
    assert.equal(made.has(id), false, `${id} is not something you cook`);
    assert.ok(isFood(placeItem(id, 0, 0)), `${id} is food`);
  }
});

/* ------------------------------------------ cooking has to be worth doing */

test('nothing a recipe makes can be taken from a drawer', () => {
  // With an omelette in the drawer beside the egg, cooking one was strictly
  // worse than taking one, and the whole activity had no reason to exist.
  for (const r of RECIPES) {
    assert.equal(lookup(r.makes).made, true, `${r.makes} is only made by cooking`);
  }
});

test('everything a recipe needs can be taken from a drawer', () => {
  // The other half of the same rule: she has to be able to get the ingredients.
  for (const r of RECIPES) {
    assert.notEqual(lookup(r.needs).made, true, `${r.needs} can be found`);
    assert.notEqual(lookup(r.in).made, true, `${r.in} can be found`);
  }
});

test('a fridge with three things in it shows three things', () => {
  // One shelf position for everything put three things in and drew one, which
  // takes the point out of stocking it at all.
  const fridge = placeItem('fridge', 640, 470);
  const def = lookup('fridge');
  const spots = [0, 1, 2].map((slot) => shelfSpot(fridge, def, slot).y);
  assert.equal(new Set(spots).size, 3, 'three different shelves');
  for (const y of spots) {
    assert.ok(y < fridge.y && y > fridge.y - def.h, `${y} is inside the fridge`);
  }
});

test('shelves are handed out without doubling up', () => {
  const fridge = placeItem('fridge', 640, 470);
  const def = lookup('fridge');
  const items = [fridge];
  for (let i = 0; i < SHELVES; i += 1) {
    const food = placeItem('egg', 0, 0);
    putInside(food, fridge, def, freeShelf(fridge, items));
    items.push(food);
  }
  const used = items.filter((i) => i.inside).map((i) => i.shelf);
  assert.equal(new Set(used).size, SHELVES, `each of ${SHELVES} shelves used once`);
});

/* ------------------------------------------------------------- the book */

test('the book has a card for every recipe, and nothing hand-written', () => {
  // Built from the table, so a recipe added to the game appears without the
  // book being touched — which is the difference between a book that stays
  // true and one that quietly goes stale.
  const source = readFileSync(join(ROOT, 'js/scenes/rulebook.js'), 'utf8');
  assert.match(source, /RECIPES\.forEach/, 'it walks the recipes');
  assert.match(source, /cardGrid\(RECIPES\.length\)/, 'and sizes itself to how many there are');
  for (const r of RECIPES) {
    assert.equal(source.includes(`'${r.makes}'`), false,
      `${r.makes} is not named in the book by hand`);
  }
});

test('every recipe card fits on the screen', () => {
  for (const count of [1, 2, 4, 6, 8]) {
    const grid = cardGrid(count);
    const last = grid.at(count - 1);
    assert.ok(last.x + grid.w <= 1280, `${count} recipes: the last card ends on screen`);
    assert.ok(last.y + grid.h <= 720, `${count} recipes: and above the bottom`);
  }
});

test('the book needs no reading', () => {
  // The game has never required reading and does not start here.
  const source = readFileSync(join(ROOT, 'js/scenes/rulebook.js'), 'utf8');
  assert.equal(/fillText|strokeText/.test(source), false, 'not a word in it');
});
