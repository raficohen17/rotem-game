/**
 * Cats.
 *
 * Built the same way as the people: every part is an integer index into a
 * table, never a colour or a shape, so the whole species can be redrawn
 * without touching a saved world.
 *
 * Pure and testable — no canvas, no DOM.
 */

/** Coats. Ordinary cat colours; the fancy ones come from the markings. */
export const COAT_COLORS = [
  '#3a3238', '#8a8288', '#c9bcae', '#d89a5c', '#a8703c',
  '#f0e6d8', '#6b5a4e', '#e8c9a0', '#5a6a72', '#c98f7a',
];

export const EYE_COLORS = ['#7fbf4a', '#e0a83c', '#4a9ad8', '#8fbf9a', '#c98a4a', '#6a6a7a'];

export const COLLAR_COLORS = [
  '#e0708a', '#6fa8dc', '#f0c86a', '#5fc4bd', '#c98ad0',
  '#a8443f', '#4f7a4a', '#faf3ea',
];

/** How the coat is broken up. Index 0 is a plain cat. */
export const MARKINGS = [
  'plain', 'tabby', 'tuxedo', 'patched', 'socks', 'mask', 'spotted', 'bicolour',
];

export const EARS = ['pointed', 'round', 'tufted', 'folded'];
export const TAILS = ['long', 'fluffy', 'short', 'curled'];
export const FACES = ['sweet', 'wide', 'narrow', 'grumpy'];

/** Number of styles per part, so the designer builds its grids from one place. */
export const CAT_PART_COUNTS = {
  coat: COAT_COLORS.length,
  marking: MARKINGS.length,
  markingColor: COAT_COLORS.length,
  face: FACES.length,
  eyes: EYE_COLORS.length,
  ears: EARS.length,
  tail: TAILS.length,
  collar: COLLAR_COLORS.length + 1, // index 0 is no collar at all
};

/** The tabs the cat designer offers, in the order they are shown. */
export const CAT_PARTS = [
  { key: 'coat', icon: 'catCoat' },
  { key: 'marking', icon: 'catMarking' },
  { key: 'markingColor', icon: 'catMarkingColor' },
  { key: 'face', icon: 'catFace' },
  { key: 'eyes', icon: 'eyes' },
  { key: 'ears', icon: 'catEars' },
  { key: 'tail', icon: 'catTail' },
  { key: 'collar', icon: 'catCollar' },
];

export function createCatSpec() {
  return {
    coat: 3, marking: 1, markingColor: 4, face: 0,
    eyes: 0, ears: 0, tail: 0, collar: 0,
  };
}

/** Forces a loaded cat into range, so an old save cannot draw nothing. */
export function clampCatSpec(spec) {
  const base = createCatSpec();
  if (!spec || typeof spec !== 'object') return base;

  const safe = {};
  for (const [key, count] of Object.entries(CAT_PART_COUNTS)) {
    const value = spec[key];
    safe[key] = Number.isInteger(value) && value >= 0 && value < count ? value : base[key];
  }
  return safe;
}

/**
 * Whole cats.
 *
 * A coat and a marking chosen independently read as a kit of parts rather than
 * as an animal — the same defect the people had before they got complete looks.
 */
export const CAT_LOOKS = [
  { id: 'tabby', label: 'Tabby', spec: { coat: 3, marking: 1, markingColor: 4, face: 0, eyes: 0, ears: 0, tail: 1, collar: 0 } },
  { id: 'tuxedo', label: 'Tuxedo', spec: { coat: 0, marking: 2, markingColor: 5, face: 1, eyes: 1, ears: 0, tail: 0, collar: 3 } },
  { id: 'ginger', label: 'Ginger', spec: { coat: 3, marking: 6, markingColor: 4, face: 1, eyes: 1, ears: 2, tail: 1, collar: 0 } },
  { id: 'calico', label: 'Calico', spec: { coat: 5, marking: 3, markingColor: 4, face: 0, eyes: 3, ears: 0, tail: 0, collar: 1 } },
  { id: 'siamese', label: 'Siamese', spec: { coat: 7, marking: 5, markingColor: 6, face: 2, eyes: 2, ears: 0, tail: 2, collar: 0 } },
  { id: 'shadow', label: 'Shadow', spec: { coat: 0, marking: 0, markingColor: 0, face: 3, eyes: 0, ears: 3, tail: 3, collar: 0 } },
  { id: 'smoke', label: 'Smoke', spec: { coat: 1, marking: 4, markingColor: 5, face: 0, eyes: 5, ears: 1, tail: 1, collar: 6 } },
  { id: 'cream', label: 'Cream', spec: { coat: 5, marking: 7, markingColor: 8, face: 0, eyes: 4, ears: 1, tail: 1, collar: 2 } },
];

export function applyCatLook(spec, lookId) {
  const look = CAT_LOOKS.find((entry) => entry.id === lookId);
  return look ? clampCatSpec({ ...spec, ...look.spec }) : spec;
}

/** How many different cats can be made. */
export function countCats() {
  return Object.values(CAT_PART_COUNTS).reduce((total, n) => total * n, 1);
}
