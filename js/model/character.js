/**
 * What a character is made of.
 *
 * A character is stored as a set of small integers — an index into each part
 * list — rather than as colours and shapes. Two consequences that matter:
 * a saved character is about 80 bytes, and restyling the whole art set later
 * changes how everyone looks without touching a single save file.
 */

export const SKIN_TONES = [
  '#8d5524', '#c68642', '#e0ac69', '#f1c27d', '#ffdbac', '#5c3317',
];

export const HAIR_COLORS = [
  '#2b1b12', '#5a3825', '#8b5a2b', '#c8873f', '#e8c17a',
  '#d94f6a', '#7b4fd9', '#3fa9d9', '#4fbf6a', '#f0f0f0',
];

export const CLOTH_COLORS = [
  '#e94f6a', '#f2913d', '#f7d04a', '#6fcf5f', '#3fb8c9',
  '#5a7fe0', '#9b6bd8', '#f07fb8', '#ffffff', '#3a3550',
];

/**
 * Number of styles per part. The character creator builds its option grids
 * from these counts, so adding a hairstyle means bumping one number and
 * drawing it — no UI work.
 */
export const PART_COUNTS = {
  skin: SKIN_TONES.length,
  hair: 8,
  hairColor: HAIR_COLORS.length,
  eyes: 5,
  mouth: 5,
  top: 6,
  topColor: CLOTH_COLORS.length,
  bottom: 5,
  bottomColor: CLOTH_COLORS.length,
  shoes: 4,
  shoesColor: CLOTH_COLORS.length,
  extra: 6, // index 0 is "nothing"
};

export const PART_KEYS = Object.keys(PART_COUNTS);

/** Parts offered as their own tab in the creator, in the order shown. */
export const EDITABLE_PARTS = [
  { key: 'skin', colorKey: null, icon: 'face' },
  { key: 'hair', colorKey: 'hairColor', icon: 'hair' },
  { key: 'eyes', colorKey: null, icon: 'eyes' },
  { key: 'mouth', colorKey: null, icon: 'mouth' },
  { key: 'top', colorKey: 'topColor', icon: 'top' },
  { key: 'bottom', colorKey: 'bottomColor', icon: 'bottom' },
  { key: 'shoes', colorKey: 'shoesColor', icon: 'shoes' },
  { key: 'extra', colorKey: null, icon: 'extra' },
];

export function createCharacterSpec() {
  return {
    skin: 3, hair: 0, hairColor: 1, eyes: 0, mouth: 0,
    top: 0, topColor: 0, bottom: 0, bottomColor: 5,
    shoes: 0, shoesColor: 9, extra: 0,
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
