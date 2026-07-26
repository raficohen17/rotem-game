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

/**
 * Number of styles per part. The character creator builds its option grids
 * from these counts, so adding a hairstyle means bumping one number and
 * drawing it — no UI work.
 */
export const PART_COUNTS = {
  skin: SKIN_TONES.length,
  hair: 14,
  hairColor: HAIR_COLORS.length,
  eyes: 10,
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
  { key: 'skin', colorKey: null, icon: 'face' },
  { key: 'hair', colorKey: 'hairColor', icon: 'hair' },
  { key: 'eyes', colorKey: null, icon: 'eyes' },
  { key: 'nose', colorKey: null, icon: 'nose' },
  { key: 'mouth', colorKey: 'mouthColor', icon: 'mouth' },
  { key: 'top', colorKey: 'topColor', icon: 'top' },
  { key: 'bottom', colorKey: 'bottomColor', icon: 'bottom' },
  { key: 'shoes', colorKey: 'shoesColor', icon: 'shoes' },
  { key: 'extra', colorKey: 'extraColor', icon: 'extra' },
];

export function createCharacterSpec() {
  return {
    skin: 3, hair: 0, hairColor: 1, eyes: 0, nose: 1, mouth: 0, mouthColor: 0,
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
