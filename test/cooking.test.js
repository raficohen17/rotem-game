import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  RECIPES, HEAT_SOURCE, recipeFor, recipesIn, utensils, ingredients,
  isOverHeat, cookOn, cookingProgress, clearProgress,
} from '../js/model/recipes.js';
import { isRaw, isEdible, isFood, panSpot } from '../js/model/food.js';
import { canUse } from '../js/model/using.js';
import { catEats } from '../js/model/food.js';
import { placeItem } from '../js/model/world.js';
import { PLACEHOLDERS } from '../js/render/placeholders.js';

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
  assert.equal(recipeFor('egg', 'pot'), null, 'the pot has no egg recipe yet');
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
