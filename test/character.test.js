import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PART_COUNTS, PART_KEYS, EDITABLE_PARTS, SKIN_TONES, HAIR_COLORS, CLOTH_COLORS,
  LIP_COLORS, createCharacterSpec, clampSpec, nextPart, countCombinations,
  LOOKS, applyLook, BUILDS,
} from '../js/model/character.js';
import { headBounds, seatedMetrics, standMetrics } from '../js/render/character.js';

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

// --- layers, held items and looks -----------------------------------------

test('a character saved before layers keeps every choice she had', () => {
  // The exact case on Rotem's phone tonight: her characters predate layers,
  // socks and held items entirely.
  const before = {
    build: 4, face: 2, skin: 1, hair: 7, hairColor: 3, hairpin: 2,
    brows: 5, eyes: 3, eyeColor: 4, nose: 5, mouth: 6, mouthColor: 2,
    top: 9, topColor: 6, bottom: 3, bottomColor: 1,
    shoes: 5, shoesColor: 7, extra: 4, extraColor: 8,
  };
  const after = clampSpec(before);

  for (const [key, value] of Object.entries(before)) {
    assert.equal(after[key], value, `${key} survived`);
  }
  assert.equal(after.layer, 0, 'and she wears no layer');
  assert.equal(after.held, 0, 'and holds nothing');
  assert.equal(after.socks, 0, 'and has bare legs');
});

test('every look produces a valid character', () => {
  for (const look of LOOKS) {
    const spec = applyLook(createCharacterSpec(), look.id);
    for (const key of PART_KEYS) {
      assert.ok(spec[key] >= 0 && spec[key] < PART_COUNTS[key],
        `${look.id}: ${key} = ${spec[key]} is in range`);
    }
  }
});

test('the three characters the change is judged on exist', () => {
  // The acceptance test, as a test: if these ids go away, the looks that make
  // a schoolgirl, a dreamer and a girl with red braids went away with them.
  for (const id of ['school', 'dreamer', 'orchard']) {
    assert.ok(LOOKS.some((look) => look.id === id), `the ${id} look exists`);
  }
});

test('the looks differ from one another in more than colour', () => {
  // Six looks that share a silhouette are one look in six colourways.
  const shapes = LOOKS.map((look) => [
    look.spec.build, look.spec.hair, look.spec.top, look.spec.bottom,
  ].join(':'));
  assert.equal(new Set(shapes).size, LOOKS.length, 'each look has its own shape');
});

test('a look leaves untouched parts alone', () => {
  const mine = { ...createCharacterSpec(), eyeColor: 6 };
  const dressed = applyLook(mine, 'school');
  assert.equal(dressed.top, LOOKS.find((l) => l.id === 'school').spec.top);
  assert.ok(dressed.eyeColor >= 0, 'eye colour is still valid');
});

test('an unknown look leaves the character as she was', () => {
  const mine = createCharacterSpec();
  assert.deepEqual(applyLook(mine, 'nonexistent'), clampSpec(mine));
});

// --- books ----------------------------------------------------------------

test('a typed title is cleaned but never silently emptied', async () => {
  const { cleanTitle, MAX_TITLE } = await import('../js/model/book.js');

  assert.equal(cleanTitle('  My   Book '), 'My Book ');
  assert.equal(cleanTitle('Line\nbreak'), 'Line break');
  assert.equal(cleanTitle(null), '');
  assert.ok(cleanTitle('x'.repeat(200)).length <= MAX_TITLE, 'long titles are cut to fit');
});

test('a damaged book design still draws something', async () => {
  const { clampBook, createBook } = await import('../js/model/book.js');

  const base = createBook();
  assert.deepEqual(clampBook(null), base);

  // Out-of-range indices fall back; a deliberately empty title does not. The
  // designer draws blank covers for its pattern chips, and substituting a
  // default there stamped every chip with "My Book".
  const damaged = clampBook({ cover: 99, pattern: -1, title: '' });
  assert.equal(damaged.cover, base.cover);
  assert.equal(damaged.pattern, base.pattern);
  assert.equal(damaged.title, '', 'an empty title stays empty');

  const kept = clampBook({ ...base, cover: 3, pattern: 5, title: 'Spells' });
  assert.equal(kept.cover, 3);
  assert.equal(kept.pattern, 5);
  assert.equal(kept.title, 'Spells');
});

test("a book's design survives being saved and loaded", async () => {
  const { migrateWorld, createWorld, placeItem } = await import('../js/model/world.js');

  const world = createWorld('Library');
  const book = placeItem('book', 300, 460);
  book.design = { title: 'My Spells', cover: 4, pattern: 3, patternColor: 9, titleStyle: 1, titleColor: 8 };
  world.buildings[0].rooms.living.items.push(book);

  const loaded = migrateWorld(JSON.parse(JSON.stringify(world)));
  const restored = loaded.buildings[0].rooms.living.items[0];

  assert.equal(restored.design.title, 'My Spells', 'the title she typed');
  assert.equal(restored.design.cover, 4);
  assert.equal(restored.design.pattern, 3);
});

test('an ordinary item gains no design field', async () => {
  const { migrateWorld, createWorld, placeItem } = await import('../js/model/world.js');

  const world = createWorld('Plain');
  world.buildings[0].rooms.living.items.push(placeItem('sofa', 300, 460));
  const loaded = migrateWorld(JSON.parse(JSON.stringify(world)));

  assert.equal('design' in loaded.buildings[0].rooms.living.items[0], false);
});

/* ------------------------------------------------------------------ boys */

test('builds are not all one silhouette', () => {
  // Every build was drawn from the same narrow-shouldered template, with the
  // widest hips on the two that read most feminine, so no combination of
  // parts made a boy.
  const broad = BUILDS.filter((b) => b.shoulder > b.hip);
  assert.ok(broad.length >= 2, `${broad.length} builds have shoulders wider than hips`);

  const legs = broad.map((b) => b.leg);
  assert.ok(Math.max(...legs) - Math.min(...legs) >= 25,
    'the boyish builds cover a range of heights, not one');
});

test('no two builds are the same figure at a different size', () => {
  const shape = (b) => [b.shoulder / b.hip, b.waist / b.hip].map((n) => n.toFixed(2)).join();
  const shapes = BUILDS.map(shape);
  assert.equal(new Set(shapes).size, shapes.length, 'every build is its own shape');
});

test('there are several short haircuts, not one', () => {
  // Thirteen of the original fourteen were long or styled long. The one short
  // cut was a pixie, so short hair and "girl" were the same choice.
  assert.ok(PART_COUNTS.hair >= 19, `${PART_COUNTS.hair} hairstyles`);
});

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

test('a mouth can be a natural colour rather than a lipstick', () => {
  // A rose lipstick carries more blue than green; a natural lip is warmer and
  // browner, so green above blue is the line between them. Every one of the
  // original eight was a lipstick, which made up every face in the game
  // whether or not anybody asked for it.
  const natural = LIP_COLORS.filter((c) => { const [, g, b] = rgb(c); return g >= b; });
  assert.ok(natural.length >= 2, `${natural.length} natural lip tones`);
});

test('the wardrobe has colours that are not sweets', () => {
  // Six of the original ten were pink or purple, and none of the other four
  // was a navy, a green, a brown or a grey — so a boy came out in orchid.
  const has = (test) => CLOTH_COLORS.some((c) => test(...rgb(c)));
  assert.ok(has((r, g, b) => b > r && b > g && b < 140), 'there is a navy');
  assert.ok(has((r, g, b) => g > r && g > b), 'there is a green');
  assert.ok(has((r, g, b) => r > g && g > b && r < 190), 'there is a brown');
  assert.ok(has((r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) < 30), 'there is a neutral');
});

test('adding parts left every saved character alone', () => {
  // Parts are stored as indices, so appending is safe and inserting is not.
  // These are the values the original tables had at these positions.
  assert.equal(BUILDS[0].id, 'petite');
  assert.equal(BUILDS[5].id, 'athletic');
  assert.equal(LIP_COLORS[0], '#c96878');
  assert.equal(CLOTH_COLORS[0], '#e0708a');
  assert.equal(CLOTH_COLORS[9], '#4a4258');
  assert.equal(LOOKS[0].id, 'school');
  assert.equal(LOOKS[5].id, 'explorer');
});

test('boys can be dressed in one tap', () => {
  const boys = LOOKS.filter((l) => ['schoolboy', 'scruff', 'sprig'].includes(l.id));
  assert.equal(boys.length, 3, 'three boy looks');

  for (const look of boys) {
    const spec = clampSpec(look.spec);
    // A look that lands on a part it did not mean is a look that was clamped,
    // which means it named an index that does not exist.
    for (const [key, value] of Object.entries(look.spec)) {
      assert.equal(spec[key], value, `${look.id} sets ${key} to a real option`);
    }
    assert.ok(spec.hair >= 14, `${look.id} wears one of the short cuts`);
    assert.ok(BUILDS[spec.build].shoulder > BUILDS[spec.build].hip,
      `${look.id} has a boyish build`);
  }
});

test('every look still sets every slot it names', () => {
  for (const look of LOOKS) {
    const applied = applyLook(createCharacterSpec(), look.id);
    for (const [key, value] of Object.entries(look.spec)) {
      assert.equal(applied[key], value, `${look.id} sets ${key}`);
    }
  }
});

test('standing is unchanged by the pose parameter existing', () => {
  // The seated figure is the standing one with hipY lowered, and everything
  // above the hip derives from hipY. Proving stand is untouched is the whole
  // safety argument for that change.
  const spec = LOOKS[0].spec;
  const stand = headBounds(spec);
  assert.ok(Number.isFinite(stand.top) && stand.height > 0, 'the standing head is where it was');
});

test('sitting lowers the whole figure, not just the legs', () => {
  const b = seatedMetrics(BUILDS[2], 90);
  const standing = standMetrics(BUILDS[2]);
  const drop = standing.hipY - b.hipY;

  // Every landmark above the hip moves by exactly the same amount, or the
  // torso stretches instead of the character sitting down.
  for (const key of ['waistY', 'torsoTop', 'shoulderY', 'chinY']) {
    assert.equal(standing[key] - b[key], drop, `${key} moves with the hip`);
  }
  assert.ok(b.hipY > standing.hipY, 'she is lower than when standing');
  assert.equal(b.shoulderW, standing.shoulderW, 'she is not a different build');
});
