/**
 * What a character is made of.
 *
 * A character is stored as a set of small integers — an index into each part
 * list — rather than as colours and shapes. Two consequences that matter:
 * a saved character is about 80 bytes, and restyling the whole art set later
 * changes how everyone looks without touching a single save file.
 */

/*
 * Muted, warm and slightly dusty rather than saturated — the palette of tinted
 * paper stock. Changing these values restyles every character already saved,
 * which is the whole reason parts are stored as indices.
 */

export const SKIN_TONES = [
  '#6b4630', '#8f5f3f', '#b57f56', '#d3a077', '#e8c39e', '#f2d9bd',
];

export const HAIR_COLORS = [
  '#2e2622', '#5b3a28', '#8a5a34', '#c08843', '#e8cb8e',
  '#f2b8c6', '#c98ad0', '#8f7ad8', '#6fb5d8', '#e6e0e8',
];

/* Rose, blush, lilac, gold and aqua — the colours a dressing-up box is
   actually full of, rather than the earth tones this started with. */
export const CLOTH_COLORS = [
  '#e0708a', '#f2a2ba', '#f7cddb', '#c98ad0', '#8f7ad8',
  '#6fa8dc', '#5fc4bd', '#f0c86a', '#faf3ea', '#4a4258',
  /*
   * Colours that are not sweets.
   *
   * Six of the ten above are pink or purple and none of the rest is a navy, a
   * green, a brown or a grey — so a boy could be given trousers and a jumper
   * and still come out dressed in orchid. The palette was quietly doing more
   * to decide who these people were than any of the parts.
   *
   * Appended, so nothing already saved changes colour.
   */
  '#33406b', '#4f7a4a', '#8a6046', '#7d7a86', '#a8443f',
];

export const LIP_COLORS = [
  '#c96878', '#d98292', '#b04f62', '#e8a0ae',
  '#96384c', '#e07a92', '#c05a70', '#f0bcc4',
  /*
   * Natural tones.
   *
   * Every colour above is a lipstick, so every face in the game was wearing
   * one whether or not it was asked for — which is most of why a figure kept
   * reading as a girl after the hair and the shoulders had been changed.
   * Appended, so no saved character's mouth changes colour.
   */
  '#b8756e', '#a86a63', '#c98a80', '#8f5a55',
];

export const EYE_COLORS = [
  '#4a3728', '#7a5230', '#a07a3a', '#4f8a62',
  '#3f7fa0', '#6ab0d0', '#8a6ac0', '#2f2b2e',
];

/**
 * Face shapes, as parameters rather than eight hand-drawn outlines.
 *
 * `temple` is the width at the browline, `cheek` the widest point, `jaw` the
 * width where the jaw turns toward the chin, `chin` how far the chin drops and
 * `chinRound` how square it is (0 square, 1 rounded). Feature placement reads
 * these too, so a wide face gets wider-set eyes rather than the same face with
 * a different border.
 */
export const FACE_SHAPES = [
  { id: 'oval', temple: 50, cheek: 55, jaw: 40, chin: 64, chinRound: 0.55 },
  { id: 'round', temple: 53, cheek: 59, jaw: 51, chin: 56, chinRound: 0.95 },
  { id: 'heart', temple: 55, cheek: 53, jaw: 31, chin: 66, chinRound: 0.3 },
  { id: 'square', temple: 52, cheek: 55, jaw: 53, chin: 58, chinRound: 0.2 },
  { id: 'long', temple: 46, cheek: 49, jaw: 41, chin: 76, chinRound: 0.5 },
  { id: 'diamond', temple: 41, cheek: 58, jaw: 35, chin: 68, chinRound: 0.35 },
  { id: 'pear', temple: 43, cheek: 52, jaw: 55, chin: 60, chinRound: 0.65 },
  { id: 'soft', temple: 49, cheek: 57, jaw: 46, chin: 61, chinRound: 0.8 },
];

/**
 * Layers worn over a top: index 0 is nothing at all.
 *
 * A separate part rather than more top styles, because the whole problem was
 * that a jumper and the cardigan over it were competing for one slot. A look
 * that is "put together" is almost always two garments, not one.
 */
export const LAYERS = ['none', 'cardigan', 'coat', 'cloak', 'apron', 'pinafore', 'gilet'];

/**
 * Things a character can hold. Index 0 is empty handed.
 *
 * The sword is appended, never inserted: a held item is stored as an index, so
 * moving one would put a sword in the hand of somebody already made.
 */
export const HELD_ITEMS = ['none', 'book', 'wand', 'basket', 'flowers', 'teddy', 'sword'];

/** Legwear, chosen separately from shoes — knee socks are half a uniform. */
export const SOCKS = ['none', 'ankle', 'knee', 'tights', 'striped', 'slouch'];

/**
 * Body builds.
 *
 * These exist because "a Hermione or a Malibu Barbie depending on the choices"
 * is not a clothing question — those two differ in the skeleton before they
 * differ in anything else. Half-widths at the shoulder, waist and hip, plus
 * leg length, which is the single measurement that does most of the work: a
 * long-legged figure reads as a fashion doll and a short-legged one does not,
 * whatever it is wearing.
 */
export const BUILDS = [
  { id: 'petite', shoulder: 25, waist: 18, hip: 27, leg: 116, arm: 13 },
  { id: 'slight', shoulder: 26, waist: 18, hip: 26, leg: 128, arm: 13 },
  { id: 'average', shoulder: 28, waist: 20, hip: 28, leg: 132, arm: 14 },
  { id: 'tall', shoulder: 28, waist: 19, hip: 28, leg: 148, arm: 13 },
  { id: 'curvy', shoulder: 30, waist: 22, hip: 35, leg: 126, arm: 15 },
  { id: 'athletic', shoulder: 33, waist: 23, hip: 29, leg: 136, arm: 16 },
  /*
   * Square shoulders, a straight waist and narrow hips.
   *
   * Every build above is the same narrow-shouldered template at a different
   * size, with the widest hips on the two that read most feminine — so no
   * combination of them made a boy, whatever hair and clothes were chosen.
   * These three cover the same short/average/tall range the others do.
   *
   * Appended, never inserted: a build is stored as an index, so moving one
   * would silently redraw every character already saved.
   */
  { id: 'sprout', shoulder: 27, waist: 21, hip: 24, leg: 114, arm: 14 },
  { id: 'sturdy', shoulder: 33, waist: 26, hip: 28, leg: 132, arm: 17 },
  { id: 'lanky', shoulder: 31, waist: 22, hip: 25, leg: 152, arm: 15 },
];

/**
 * How big somebody is.
 *
 * Two sizes, because a school needs somebody in charge of it and a teacher the
 * same height as her class is another child standing at the board. Index 0 is
 * the figure the game has always drawn, so nobody already made changes size.
 *
 * A grown-up is not only bigger: her head is a little smaller against her body,
 * which is most of what tells a child from an adult at a glance.
 */
export const SIZES = [
  { id: 'child', scale: 1, head: 1 },
  { id: 'grown', scale: 1.16, head: 0.92 },
];

/**
 * Number of styles per part. The character creator builds its option grids
 * from these counts, so adding a hairstyle means bumping one number and
 * drawing it — no UI work.
 */
export const PART_COUNTS = {
  size: SIZES.length,
  build: BUILDS.length,
  face: FACE_SHAPES.length,
  skin: SKIN_TONES.length,
  hair: 19,
  hairColor: HAIR_COLORS.length,
  hairpin: 10, // index 0 is "nothing"
  hairpinColor: CLOTH_COLORS.length,
  brows: 8,
  eyes: 10,
  eyeColor: EYE_COLORS.length,
  nose: 6, // index 0 is "nothing"
  mouth: 10,
  mouthColor: LIP_COLORS.length,
  top: 12,
  topColor: CLOTH_COLORS.length,
  layer: LAYERS.length,
  layerColor: CLOTH_COLORS.length,
  // Index 10 is the gala gown, which is behind a code. It is counted here like
  // any other style — the lock lives in the creator's selection, not in the
  // spec, so a character already wearing it still draws if the unlock list is
  // ever lost.
  bottom: 11,
  bottomColor: CLOTH_COLORS.length,
  socks: SOCKS.length,
  socksColor: CLOTH_COLORS.length,
  shoes: 8,
  shoesColor: CLOTH_COLORS.length,
  held: HELD_ITEMS.length,
  extra: 12, // index 0 is "nothing"
  extraColor: CLOTH_COLORS.length,
};

/**
 * How many different characters can be made.
 *
 * Worth stating as a number rather than a feeling — it is the answer to "can
 * she make a new one that isn't like the others", and a test holds it above
 * the agreed floor so a future tidy-up cannot quietly shrink the wardrobe.
 */
export function countCombinations() {
  return Object.values(PART_COUNTS).reduce((total, count) => total * count, 1);
}

export const PART_KEYS = Object.keys(PART_COUNTS);

/** Parts offered as their own tab in the creator, in the order shown. */
export const EDITABLE_PARTS = [
  { key: 'size', colorKey: null, icon: 'person' },
  { key: 'build', colorKey: null, icon: 'build' },
  { key: 'face', colorKey: null, icon: 'face' },
  { key: 'skin', colorKey: null, icon: 'skin' },
  { key: 'hair', colorKey: null, icon: 'hair' },
  /*
   * Hair colour has its own tab.
   *
   * It used to be a strip of 52px swatches tucked under the hair shapes, which
   * is a small target for the thing a child changes most — and it took the
   * place brows used to occupy in the rail, which is where Rotem went looking
   * for it. Brows are gone from the rail: eight brow shapes differ by a few
   * pixels on a face this size, so the tab did nothing visible in most cases.
   * The part itself stays in the spec, so no saved character changes.
   */
  { key: 'hairColor', colorKey: null, icon: 'hairColor' },
  { key: 'hairpin', colorKey: 'hairpinColor', icon: 'hairpin' },
  { key: 'eyes', colorKey: 'eyeColor', icon: 'eyes' },
  { key: 'nose', colorKey: null, icon: 'nose' },
  { key: 'mouth', colorKey: 'mouthColor', icon: 'mouth' },
  { key: 'top', colorKey: 'topColor', icon: 'top' },
  { key: 'layer', colorKey: 'layerColor', icon: 'layer' },
  { key: 'bottom', colorKey: 'bottomColor', icon: 'bottom' },
  { key: 'socks', colorKey: 'socksColor', icon: 'socks' },
  { key: 'shoes', colorKey: 'shoesColor', icon: 'shoes' },
  { key: 'held', colorKey: null, icon: 'held' },
  { key: 'extra', colorKey: 'extraColor', icon: 'extra' },
];

export function createCharacterSpec() {
  return {
    size: 0,
    build: 2, face: 0, skin: 3, hair: 0, hairColor: 1,
    hairpin: 0, hairpinColor: 0, brows: 0,
    eyes: 0, eyeColor: 0, nose: 1, mouth: 0, mouthColor: 0,
    top: 0, topColor: 0, layer: 0, layerColor: 3,
    bottom: 0, bottomColor: 5, socks: 0, socksColor: 8,
    shoes: 0, shoesColor: 9, held: 0, extra: 0, extraColor: 2,
  };
}

/**
 * Forces every index into range.
 *
 * This is the load-bearing bit of forward compatibility: if a future build
 * adds hairstyles and Rotem's phone opens an older cached copy, an index of 9
 * against 8 styles would otherwise draw nothing at all — a bald, alarming
 * character. Clamping degrades it to a different hairstyle instead.
 */
export function clampSpec(spec) {
  const base = createCharacterSpec();
  if (!spec || typeof spec !== 'object') return base;

  const safe = {};
  for (const key of PART_KEYS) {
    const value = spec[key];
    safe[key] = Number.isInteger(value) && value >= 0 && value < PART_COUNTS[key]
      ? value
      : base[key];
  }
  return safe;
}

/** Cycles a part forward, wrapping at the end. */
export function nextPart(spec, key) {
  return { ...spec, [key]: (spec[key] + 1) % PART_COUNTS[key] };
}


/**
 * Complete looks.
 *
 * The defect these exist to fix is coordination: eighteen parts chosen
 * independently will always read as a kit rather than as somebody. A look
 * writes several parts at once and then leaves every one of them editable, so
 * it is a starting point rather than a costume.
 *
 * Named for what they evoke rather than for anyone in particular.
 */
export const LOOKS = [
  {
    id: 'school',
    label: 'School',
    spec: {
      build: 1, face: 0, skin: 4, hair: 5, hairColor: 1, hairpin: 0,
      brows: 2, eyes: 2, eyeColor: 1, nose: 5, mouth: 0, mouthColor: 3,
      top: 11, topColor: 9, layer: 0, layerColor: 9,
      bottom: 6, bottomColor: 9, socks: 2, socksColor: 8,
      shoes: 4, shoesColor: 9, held: 1, extra: 0, extraColor: 9,
    },
  },
  {
    id: 'dreamer',
    label: 'Dreamer',
    spec: {
      build: 3, face: 4, skin: 5, hair: 9, hairColor: 4, hairpin: 7,
      brows: 3, eyes: 5, eyeColor: 5, nose: 1, mouth: 8, mouthColor: 7,
      top: 2, topColor: 3, layer: 3, layerColor: 4,
      bottom: 3, bottomColor: 2, socks: 4, socksColor: 6,
      shoes: 0, shoesColor: 3, held: 2, extra: 9, extraColor: 7,
    },
  },
  {
    id: 'orchard',
    label: 'Orchard',
    spec: {
      build: 0, face: 2, skin: 5, hair: 3, hairColor: 2, hairpin: 4,
      brows: 0, eyes: 7, eyeColor: 3, nose: 5, mouth: 0, mouthColor: 1,
      top: 7, topColor: 8, layer: 5, layerColor: 5,
      bottom: 3, bottomColor: 5, socks: 1, socksColor: 8,
      shoes: 1, shoesColor: 1, held: 3, extra: 2, extraColor: 7,
    },
  },
  {
    id: 'party',
    label: 'Party',
    spec: {
      build: 2, face: 7, skin: 3, hair: 4, hairColor: 0, hairpin: 3,
      brows: 1, eyes: 5, eyeColor: 0, nose: 1, mouth: 5, mouthColor: 0,
      top: 0, topColor: 0, layer: 0, layerColor: 0,
      bottom: 4, bottomColor: 1, socks: 0, socksColor: 8,
      shoes: 0, shoesColor: 7, held: 4, extra: 4, extraColor: 7,
    },
  },
  {
    id: 'cosy',
    label: 'Cosy',
    spec: {
      build: 4, face: 1, skin: 2, hair: 1, hairColor: 3, hairpin: 0,
      brows: 5, eyes: 1, eyeColor: 2, nose: 1, mouth: 0, mouthColor: 3,
      top: 5, topColor: 6, layer: 1, layerColor: 2,
      bottom: 5, bottomColor: 9, socks: 5, socksColor: 2,
      shoes: 6, shoesColor: 2, held: 5, extra: 6, extraColor: 6,
    },
  },
  {
    id: 'explorer',
    label: 'Explorer',
    spec: {
      build: 5, face: 3, skin: 1, hair: 3, hairColor: 0, hairpin: 0,
      brows: 6, eyes: 9, eyeColor: 7, nose: 2, mouth: 3, mouthColor: 4,
      top: 10, topColor: 9, layer: 0, layerColor: 9,
      bottom: 0, bottomColor: 9, socks: 1, socksColor: 9,
      shoes: 7, shoesColor: 9, held: 0, extra: 0, extraColor: 9,
    },
  },
  /*
   * Boys.
   *
   * The parts to make one were mostly there — trousers, shorts, a t-shirt, a
   * field jacket, a school jumper, bushy brows, a level mouth — but no
   * combination of the six looks above reached one, so in practice the
   * creator made girls. These are the three from the design note: a boy
   * dressed for school, one who has been outside all day, and a small one.
   *
   * mouthColor points at the natural tones rather than the lipsticks, which
   * is the single change that stops a face reading as made-up.
   */
  {
    id: 'schoolboy',
    label: 'School Boy',
    spec: {
      build: 7, face: 3, skin: 2, hair: 14, hairColor: 1, hairpin: 0,
      brows: 6, eyes: 3, eyeColor: 1, nose: 2, mouth: 3, mouthColor: 9,
      top: 11, topColor: 10, layer: 0, layerColor: 0,
      bottom: 0, bottomColor: 13, socks: 1, socksColor: 9,
      shoes: 2, shoesColor: 9, held: 1, extra: 0, extraColor: 0,
    },
  },
  {
    id: 'scruff',
    label: 'Scruff',
    spec: {
      build: 6, face: 1, skin: 4, hair: 15, hairColor: 2, hairpin: 0,
      brows: 2, eyes: 6, eyeColor: 2, nose: 5, mouth: 6, mouthColor: 8,
      top: 0, topColor: 11, layer: 0, layerColor: 0,
      bottom: 1, bottomColor: 12, socks: 1, socksColor: 8,
      shoes: 5, shoesColor: 12, held: 0, extra: 0, extraColor: 0,
    },
  },
  {
    id: 'sprig',
    label: 'Sprig',
    spec: {
      build: 6, face: 1, skin: 1, hair: 16, hairColor: 3, hairpin: 0,
      brows: 0, eyes: 1, eyeColor: 4, nose: 5, mouth: 1, mouthColor: 10,
      top: 0, topColor: 14, layer: 0, layerColor: 0,
      bottom: 7, bottomColor: 5, socks: 1, socksColor: 8,
      shoes: 1, shoesColor: 9, held: 5, extra: 0, extraColor: 0,
    },
  }
];

/** Applies a look over a character, leaving anything it does not set alone. */
export function applyLook(spec, lookId) {
  const look = LOOKS.find((entry) => entry.id === lookId);
  if (!look) return clampSpec(spec);
  return clampSpec({ ...spec, ...look.spec });
}
