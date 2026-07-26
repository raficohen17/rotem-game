/**
 * Books Rotem designs herself.
 *
 * A book is a placed item like any other, but it carries a design: a cover
 * colour, a pattern, and a title she types. That design travels with the item
 * in the save, so a shelf of her own books survives being closed and reopened.
 *
 * Pure and testable — no canvas, no DOM.
 */

/** Cover patterns. Index 0 is a plain cover. */
export const COVER_PATTERNS = [
  'plain', 'stripes', 'spots', 'stars', 'hearts', 'checks', 'moons', 'flowers',
];

export const COVER_COLORS = [
  '#c9707f', '#5c8fae', '#7d9e62', '#d9a24e', '#8a6d9e',
  '#4f9695', '#c2996b', '#423d4d', '#e0a8b8', '#f0e2d0',
];

/** How the title is set on the cover. */
export const TITLE_STYLES = ['plain', 'banner', 'arched', 'boxed'];

/**
 * The longest title that still fits on a cover at a readable size.
 *
 * Enforced here rather than in the input so the limit is the same wherever a
 * title comes from — typed, pasted, or loaded from an old save.
 */
export const MAX_TITLE = 24;

export function createBook() {
  return {
    title: 'My Book',
    cover: 0,
    pattern: 0,
    patternColor: 9,
    titleStyle: 0,
    titleColor: 9,
  };
}

/** Trims a typed title to something that will fit and render. */
export function cleanTitle(raw) {
  if (typeof raw !== 'string') return '';
  // Control characters and newlines would break the cover layout, and runs of
  // spaces make a title look mistyped rather than typed.
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trimStart()
    .slice(0, MAX_TITLE);
}

/** Forces a loaded design into range, so a bad save cannot draw nothing. */
export function clampBook(design) {
  const base = createBook();
  if (!design || typeof design !== 'object') return base;

  const index = (value, count, fallback) => (
    Number.isInteger(value) && value >= 0 && value < count ? value : fallback
  );

  return {
    // An empty title stays empty. Substituting the default here meant a
    // deliberately blank cover — the pattern chips in the designer — came back
    // stamped "My Book".
    title: typeof design.title === 'string' ? cleanTitle(design.title) : base.title,
    cover: index(design.cover, COVER_COLORS.length, base.cover),
    pattern: index(design.pattern, COVER_PATTERNS.length, base.pattern),
    patternColor: index(design.patternColor, COVER_COLORS.length, base.patternColor),
    titleStyle: index(design.titleStyle, TITLE_STYLES.length, base.titleStyle),
    titleColor: index(design.titleColor, COVER_COLORS.length, base.titleColor),
  };
}

/** How many different books can be designed, ignoring the title. */
export function countCovers() {
  return COVER_COLORS.length * COVER_PATTERNS.length * COVER_COLORS.length
    * TITLE_STYLES.length * COVER_COLORS.length;
}
