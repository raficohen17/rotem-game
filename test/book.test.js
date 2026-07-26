import test from 'node:test';
import assert from 'node:assert/strict';

import {
  needsHalo, effectiveBackground, luminance, contrastTo, CONTRAST_FLOOR,
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

test('ink close to its background does get a glow', () => {
  const design = {
    ...createBook(), cover: CHARCOAL, pattern: PLAIN, titleColor: CHARCOAL,
  };
  assert.equal(needsHalo(design), true);
});

test('the glow decision follows the contrast floor exactly', () => {
  for (let cover = 0; cover < COVER_COLORS.length; cover += 1) {
    for (let ink = 0; ink < COVER_COLORS.length; ink += 1) {
      const design = { ...createBook(), cover, pattern: PLAIN, titleColor: ink };
      const gap = Math.abs(luminance(COVER_COLORS[ink]) - luminance(COVER_COLORS[cover]));
      assert.equal(needsHalo(design), gap < CONTRAST_FLOOR,
        `cover ${cover} with ink ${ink} (gap ${gap.toFixed(2)})`);
    }
  }
});

test('every cover and ink pairing is legible one way or the other', () => {
  // Either the ink already separates, or a glow is applied. There is no
  // combination she can pick that leaves the title unreadable.
  for (let cover = 0; cover < COVER_COLORS.length; cover += 1) {
    for (let ink = 0; ink < COVER_COLORS.length; ink += 1) {
      for (let pattern = 0; pattern < COVER_PATTERNS.length; pattern += 1) {
        const design = { ...createBook(), cover, pattern, patternColor: ink, titleColor: ink };
        const gap = Math.abs(
          luminance(COVER_COLORS[ink]) - luminance(effectiveBackground(design)),
        );
        assert.ok(gap >= CONTRAST_FLOOR || needsHalo(design),
          `cover ${cover} / pattern ${pattern} / ink ${ink} is readable`);
      }
    }
  }
});
