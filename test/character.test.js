import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PART_COUNTS, PART_KEYS, EDITABLE_PARTS, SKIN_TONES, HAIR_COLORS, CLOTH_COLORS,
  LIP_COLORS, createCharacterSpec, clampSpec, nextPart, countCombinations,
} from '../js/model/character.js';

/** The agreed floor for how many different characters can be made. */
const REQUIRED_CHARACTERS = 50_000;

test(`at least ${REQUIRED_CHARACTERS.toLocaleString('en')} different characters can be made`, () => {
  // Guards the wardrobe: trimming part lists in a future tidy-up fails here
  // rather than quietly making everyone look the same.
  assert.ok(
    countCombinations() >= REQUIRED_CHARACTERS,
    `only ${countCombinations().toLocaleString('en')} combinations available`,
  );
});

test('no single part is so thin that it barely varies', () => {
  for (const part of EDITABLE_PARTS) {
    assert.ok(PART_COUNTS[part.key] >= 6, `${part.key} offers at least six choices`);
    if (part.colorKey) {
      assert.ok(PART_COUNTS[part.colorKey] >= 8, `${part.colorKey} offers at least eight colours`);
    }
  }
});

test('a new character has a valid value for every part', () => {
  const spec = createCharacterSpec();
  for (const key of PART_KEYS) {
    assert.ok(Number.isInteger(spec[key]), `${key} is a whole number`);
    assert.ok(spec[key] >= 0 && spec[key] < PART_COUNTS[key], `${key} is in range`);
  }
});

test('a part index from a newer build degrades to a valid one', () => {
  // The case that matters: Rotem's phone saves with a build that has more
  // hairstyles, then opens an older cached copy. Drawing nothing at all would
  // leave a bald, alarming character.
  const spec = { ...createCharacterSpec(), hair: PART_COUNTS.hair + 4 };
  const safe = clampSpec(spec);

  assert.ok(safe.hair >= 0 && safe.hair < PART_COUNTS.hair);
});

test('one bad part does not disturb the others', () => {
  const spec = createCharacterSpec();
  spec.top = 3;
  spec.eyes = 999;

  const safe = clampSpec(spec);
  assert.equal(safe.top, 3, 'the good choice is kept');
  assert.ok(safe.eyes < PART_COUNTS.eyes);
});

test('rubbish in place of a spec still produces a drawable character', () => {
  for (const junk of [null, undefined, 'a person', 42, []]) {
    const safe = clampSpec(junk);
    for (const key of PART_KEYS) {
      assert.ok(safe[key] >= 0 && safe[key] < PART_COUNTS[key], `${key} valid for ${junk}`);
    }
  }
});

test('negative and fractional indices are rejected', () => {
  const safe = clampSpec({ ...createCharacterSpec(), skin: -1, mouth: 1.5 });
  assert.ok(safe.skin >= 0);
  assert.ok(Number.isInteger(safe.mouth));
});

test('cycling a part wraps round rather than running off the end', () => {
  let spec = createCharacterSpec();
  for (let i = 0; i < PART_COUNTS.hair + 1; i += 1) spec = nextPart(spec, 'hair');
  assert.equal(spec.hair, 1, 'wrapped once and carried on');
});

test('every editable part exists, and its colour palette is real', () => {
  for (const part of EDITABLE_PARTS) {
    assert.ok(PART_COUNTS[part.key] > 0, `${part.key} has options`);
    if (part.colorKey) {
      assert.ok(PART_COUNTS[part.colorKey] > 0, `${part.colorKey} has colours`);
    }
  }
});

test('palette lengths match the part counts that index them', () => {
  assert.equal(PART_COUNTS.skin, SKIN_TONES.length);
  assert.equal(PART_COUNTS.hairColor, HAIR_COLORS.length);
  assert.equal(PART_COUNTS.topColor, CLOTH_COLORS.length);
  assert.equal(PART_COUNTS.bottomColor, CLOTH_COLORS.length);
  assert.equal(PART_COUNTS.shoesColor, CLOTH_COLORS.length);
});

test('every colour is a usable hex value', () => {
  for (const color of [...SKIN_TONES, ...HAIR_COLORS, ...CLOTH_COLORS, ...LIP_COLORS]) {
    assert.match(color, /^#[0-9a-f]{6}$/i, `${color} is a hex colour`);
  }
});

test('a character saved before the nose existed still loads', () => {
  // Exactly what happens to the characters already on Rotem's phone: their
  // saves predate the part entirely.
  const old = {
    skin: 2, hair: 3, hairColor: 4, eyes: 1, mouth: 2,
    top: 1, topColor: 3, bottom: 2, bottomColor: 4, shoes: 1, shoesColor: 2, extra: 3,
  };
  const safe = clampSpec(old);

  assert.equal(safe.hair, 3, 'the choices she made are kept');
  assert.equal(safe.top, 1);
  assert.ok(safe.nose >= 0 && safe.nose < PART_COUNTS.nose, 'and a nose is filled in');
  assert.ok(safe.extraColor >= 0 && safe.extraColor < PART_COUNTS.extraColor);
});
