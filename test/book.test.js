import test from 'node:test';
import assert from 'node:assert/strict';

import {
  needsHalo, effectiveBackground, luminance, contrastTo, CONTRAST_FLOOR,
  readableInk, readableOn,
} from '../js/render/book.js';
import { COVER_COLORS, COVER_PATTERNS, createBook } from '../js/model/book.js';

const indexOf = (list, value) => list.indexOf(value);
const CREAM = indexOf(COVER_COLORS, '#f0e2d0');
const CHARCOAL = indexOf(COVER_COLORS, '#423d4d');
const PLAIN = indexOf(COVER_PATTERNS, 'plain');
const CHECKS = indexOf(COVER_PATTERNS, 'checks');

test('luminance orders colours the way an eye does', () => {
  assert.ok(luminance('#ffffff') > luminance('#808080'));
  assert.ok(luminance('#808080') > luminance('#000000'));
  assert.equal(Math.round(luminance('#000000')), 0);
});

test('a contrasting tone is dark for light colours and light for dark ones', () => {
  assert.equal(contrastTo('#ffffff'), '#2e2a30');
  assert.equal(contrastTo('#000000'), '#f7f2e8');
});

test('a plain cover is its own background', () => {
  const design = { ...createBook(), cover: CHARCOAL, pattern: PLAIN };
  assert.equal(effectiveBackground(design), COVER_COLORS[CHARCOAL]);
});

test('a patterned cover reads as a mixture, not as the cover alone', () => {
  // A dark cover under a pale pattern is lighter than the cover by itself,
  // and contrast has to be judged against what the eye actually sees.
  const design = {
    ...createBook(), cover: CHARCOAL, pattern: CHECKS, patternColor: CREAM,
  };
  const mixed = effectiveBackground(design);

  assert.notEqual(mixed, COVER_COLORS[CHARCOAL]);
  assert.ok(luminance(mixed) > luminance(COVER_COLORS[CHARCOAL]));
  assert.ok(luminance(mixed) < luminance(COVER_COLORS[CREAM]));
});

test('cream lettering on a charcoal cover needs no glow', () => {
  // This is the case that made dark covers look murky: the ink already
  // separates, and a dark glow under it only smudged the area.
  const design = {
    ...createBook(), cover: CHARCOAL, pattern: PLAIN, titleColor: CREAM,
  };
  assert.equal(needsHalo(design), false);
});

test('an ink the same colour as its cover is moved until it can be read', () => {
  // It used to be left alone and given a glow. Moving the ink is the better
  // answer: the letters separate by themselves and the cover stays clean.
  const design = {
    ...createBook(), cover: CHARCOAL, pattern: PLAIN, titleColor: CHARCOAL,
  };
  const ink = readableInk(design);

  assert.notEqual(ink, COVER_COLORS[CHARCOAL], 'it did not stay as it was');
  assert.ok(
    Math.abs(luminance(ink) - luminance(COVER_COLORS[CHARCOAL])) >= CONTRAST_FLOOR,
    'and it now separates from the cover',
  );
});

test('an ink that already separates is left exactly as she chose it', () => {
  const design = {
    ...createBook(), cover: CHARCOAL, pattern: PLAIN, titleColor: CREAM,
  };
  assert.equal(readableInk(design), COVER_COLORS[CREAM]);
});

test('a moved ink keeps the colour she picked', () => {
  // The point of moving only the lightness: blue on purple was the case that
  // started this, and it has to still look like blue.
  const purple = indexOf(COVER_COLORS, '#8a6d9e');
  const blue = indexOf(COVER_COLORS, '#5c8fae');
  const design = { ...createBook(), cover: purple, pattern: PLAIN, titleColor: blue };
  const ink = readableInk(design);

  const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [r, g, b] = channels(ink);
  assert.ok(b >= g && g >= r, `${ink} is still a blue, not a grey or a brown`);
});

test('no colour she can pick leaves a title unreadable', () => {
  // The whole space: ten covers, eight patterns, ten pattern colours, ten
  // title colours. Before the ink was adjusted, 89% of these sat below the
  // floor and leaned on a glow that was written for the rare case.
  let checked = 0;
  let leaning = 0;

  for (let cover = 0; cover < COVER_COLORS.length; cover += 1) {
    for (let pattern = 0; pattern < COVER_PATTERNS.length; pattern += 1) {
      for (let patternColor = 0; patternColor < COVER_COLORS.length; patternColor += 1) {
        for (let titleColor = 0; titleColor < COVER_COLORS.length; titleColor += 1) {
          const design = {
            ...createBook(), cover, pattern, patternColor, titleColor,
          };
          const separation = Math.abs(
            luminance(readableInk(design)) - luminance(effectiveBackground(design)),
          );
          checked += 1;
          if (separation < CONTRAST_FLOOR) {
            leaning += 1;
            assert.ok(needsHalo(design),
              `cover ${cover} / pattern ${pattern} / ink ${titleColor} has neither contrast nor a glow`);
          }
        }
      }
    }
  }

  assert.equal(checked, 8000, 'the whole space was covered');
  // Some covers carry a light tone and a dark one at once, and no single ink
  // reads on both — those are the ones the glow exists for. If this climbs
  // back toward the old 89%, the ink adjustment has stopped working.
  assert.ok(leaning / checked < 0.05,
    `${((leaning / checked) * 100).toFixed(1)}% of covers still depend on a glow`);
});

test('a glow is now the exception rather than the rule', () => {
  let halos = 0;
  let total = 0;
  for (let cover = 0; cover < COVER_COLORS.length; cover += 1) {
    for (let pattern = 0; pattern < COVER_PATTERNS.length; pattern += 1) {
      for (let titleColor = 0; titleColor < COVER_COLORS.length; titleColor += 1) {
        total += 1;
        if (needsHalo({ ...createBook(), cover, pattern, titleColor })) halos += 1;
      }
    }
  }
  assert.ok(halos / total < 0.2, `${((halos / total) * 100).toFixed(1)}% of covers get a glow`);
});

test('readableOn satisfies every background it is given at once', () => {
  // The boxed style asks it about a label; a patterned cover asks it about two
  // tones that can sit either side of the average.
  const cream = COVER_COLORS[CREAM];
  const charcoal = COVER_COLORS[CHARCOAL];

  const one = readableOn(cream, cream);
  assert.ok(Math.abs(luminance(one) - luminance(cream)) >= CONTRAST_FLOOR,
    'it separates from a single background');

  // Cream and charcoal together is the impossible case: it returns the best
  // available ink rather than failing, and needsHalo covers the rest.
  const both = readableOn(cream, cream, charcoal);
  assert.equal(typeof both, 'string');
  assert.match(both, /^#[0-9a-f]{6}$/i);
});

test('a book laid flat keeps its orientation through a save', async () => {
  const { migrateWorld, createWorld, placeItem } = await import('../js/model/world.js');

  const world = createWorld('Pile');
  const flat = placeItem('book', 400, 460);
  flat.design = { ...createBook(), title: 'Under the pile' };
  flat.lying = true;
  flat.w = 117;
  flat.h = 27;
  world.buildings[0].rooms.living.items.push(flat);

  const restored = migrateWorld(JSON.parse(JSON.stringify(world))).buildings[0].rooms.living.items[0];
  assert.equal(restored.lying, true, 'still lying down');
  assert.equal(restored.w, 117);
  assert.equal(restored.h, 27);
});

test('a standing book gains no orientation fields', async () => {
  const { migrateWorld, createWorld, placeItem } = await import('../js/model/world.js');

  const world = createWorld('Shelf');
  const upright = placeItem('book', 400, 460);
  upright.design = createBook();
  world.buildings[0].rooms.living.items.push(upright);

  const restored = migrateWorld(JSON.parse(JSON.stringify(world))).buildings[0].rooms.living.items[0];
  assert.equal('lying' in restored, false);
  assert.equal('w' in restored, false);
});

test('a flat book is measured by its own size, not the catalog entry', async () => {
  const { itemBounds } = await import('../js/model/geometry.js');

  const def = { w: 96, h: 136 };
  const upright = { x: 400, y: 460, scale: 1 };
  const flat = { x: 400, y: 460, scale: 1, w: 117, h: 27 };

  assert.equal(itemBounds(upright, def).h, 136);
  assert.equal(itemBounds(flat, def).h, 27, 'a pile is only as tall as the books in it');
  assert.equal(itemBounds(flat, def).w, 117);
});

test('books dropped on each other form a flat pile, not a tower', async () => {
  const { findSurface } = await import('../js/model/geometry.js');
  const { placeItem } = await import('../js/model/world.js');

  const defs = { table: { w: 300, h: 145 }, book: { w: 96, h: 136 } };
  const lookup = (id) => defs[id];
  const flatH = Math.max(22, defs.book.w * 0.28);
  const lieFlat = (e) => {
    e.lying = true;
    e.w = defs.book.h * 0.86;
    e.h = flatH;
  };

  const items = [placeItem('table', 600, 500)];
  const drop = (aimY) => {
    const b = placeItem('book', 600, aimY);
    const host = findSurface(b, items, lookup, 600, aimY, defs.book);
    if (host) {
      b.y = host.top;
      b.z = (host.item.z ?? 0) + 1;
      if (host.item.item === 'book') {
        if (!host.item.lying) lieFlat(host.item);
        lieFlat(b);
        b.y = host.item.y - (host.item.h ?? defs.book.h);
      }
    }
    items.push(b);
    return b;
  };

  let last = drop(500 - defs.table.h);
  const pile = [last];
  for (let i = 0; i < 3; i += 1) {
    last = drop(last.y - (last.h ?? defs.book.h));
    pile.push(last);
  }

  assert.ok(pile.every((b) => b.lying), 'every book in a pile is lying down');
  assert.deepEqual(pile.map((b) => b.y), [355, 355 - flatH, 355 - flatH * 2, 355 - flatH * 3],
    'each sits exactly one flat book above the last');
  assert.deepEqual(pile.map((b) => b.z), [1, 2, 3, 4], 'and one layer above it');

  // A pile of four is barely taller than one upright book — a tower of four
  // upright books would be four times as tall.
  const pileHeight = pile.length * flatH;
  assert.ok(pileHeight < defs.book.h * 1.1, 'a pile is short, as a pile should be');
});
