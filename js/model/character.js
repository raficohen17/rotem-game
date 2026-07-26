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
  '#332a2a', '#54382a', '#7d5236', '#a9773f', '#d4b183',
  '#b05663', '#7a6296', '#4a7f96', '#5c8a66', '#ded7cc',
];

export const CLOTH_COLORS = [
  '#c9604f', '#d98a4e', '#dcb85c', '#7d9e62', '#4f9695',
  '#5c7aa8', '#8a6d9e', '#cd8b98', '#efe7d9', '#423d4d',
];

export const LIP_COLORS = [
  '#a85a5f', '#c07070', '#8f4048', '#d4878c',
  '#7d3a44', '#b8656f', '#9c5750', '#e0a3a2',
];

export const EYE_COLORS = [
  '#4a3728', '#6b4b2e', '#8a6a3f', '#4f6b52',
  '#3f5f70', '#5a7f96', '#6a5878', '#2f2b2e',
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
 * Number of styles per part. The character creator builds its option grids
 * from these counts, so adding a hairstyle means bumping one number and
 * drawing it — no UI work.
 */
export const PART_COUNTS = {
  face: FACE_SHAPES.length,
  skin: SKIN_TONES.length,
  hair: 14,
  hairColor: HAIR_COLORS.length,
  brows: 8,
  eyes: 10,
  eyeColor: EYE_COLORS.length,
  nose: 6, // index 0 is "nothing"
  mouth: 10,
  mouthColor: LIP_COLORS.length,
  top: 12,
  topColor: CLOTH_COLORS.length,
  bottom: 10,
  bottomColor: CLOTH_COLORS.length,
  shoes: 8,
  shoesColor: CLOTH_COLORS.length,
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
  { key: 'face', colorKey: null, icon: 'face' },
  { key: 'skin', colorKey: null, icon: 'skin' },
  { key: 'hair', colorKey: 'hairColor', icon: 'hair' },
  { key: 'brows', colorKey: null, icon: 'brows' },
  { key: 'eyes', colorKey: 'eyeColor', icon: 'eyes' },
  { key: 'nose', colorKey: null, icon: 'nose' },
  { key: 'mouth', colorKey: 'mouthColor', icon: 'mouth' },
  { key: 'top', colorKey: 'topColor', icon: 'top' },
  { key: 'bottom', colorKey: 'bottomColor', icon: 'bottom' },
  { key: 'shoes', colorKey: 'shoesColor', icon: 'shoes' },
  { key: 'extra', colorKey: 'extraColor', icon: 'extra' },
];

export function createCharacterSpec() {
  return {
    face: 0, skin: 3, hair: 0, hairColor: 1, brows: 0,
    eyes: 0, eyeColor: 0, nose: 1, mouth: 0, mouthColor: 0,
    top: 0, topColor: 0, bottom: 0, bottomColor: 5,
    shoes: 0, shoesColor: 9, extra: 0, extraColor: 2,
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
