/**
 * Designing a book cover.
 *
 * The title is typed on the phone's own keyboard rather than on one drawn in
 * canvas: a hand-drawn keyboard would have been consistent with the rest of the
 * game and considerably worse to use. The field itself is the game's shared
 * text field, a real input sitting where the field is drawn — so it has a
 * caret, a selection and a paste of its own, and the keyboard cannot come up
 * over the thing being typed into.
 */

import { button, hitTest, drawButtons, drawPanel, drawTitle, COLORS, TOUCH } from '../ui/widgets.js';
import { openTextField } from '../ui/textfield.js';
import { fillRR } from '../render/shapes.js';
import { drawBook } from '../render/book.js';
import {
  COVER_COLORS, COVER_PATTERNS, TITLE_STYLES, MAX_TITLE,
  createBook, clampBook, cleanTitle,
} from '../model/book.js';

/*
 * The preview gives up width so the panel can hold a finger-sized swatch.
 *
 * Ten colours in a row is what sets the size: at the old 62px step they came
 * out 31px across on the phone, which is half what a child can reliably hit.
 * A 80px step needs 780px of panel, and the panel only had 704 to give — so
 * the book preview is narrower now, which costs nothing, because the book is
 * drawn 250 wide inside it either way.
 */
const PREVIEW = { x: 60, y: 110, w: 320, h: 480 };
const PANEL = { x: 400, y: 96, w: 856, h: 576 };
const ROW = { x: 430, step: 80, size: 72 };

/** Where the title field is drawn, and so where the real input is put. */
const TITLE_BOX = { x: PREVIEW.x, y: PREVIEW.y + PREVIEW.h + 24, w: PREVIEW.w, h: TOUCH };

export function createBookDesigner(game, initial, onDone, onCancel) {
  let design = clampBook(initial ?? createBook());

  const field = openTextField(game.view, TITLE_BOX, {
    value: design.title,
    maxLength: MAX_TITLE,
    filter: cleanTitle,
    label: 'Book title',
    placeholder: 'Name your book',
    onChange: (value) => { design = { ...design, title: value }; },
  });

  const close = () => {
    field.close();
  };

  const covers = () => COVER_COLORS.map((color, i) => button(
    `cover:${i}`, ROW.x + i * ROW.step, PANEL.y + 36, ROW.size, ROW.size,
    { swatch: color, active: design.cover === i },
  ));

  const patterns = () => COVER_PATTERNS.map((name, i) => button(
    `pattern:${i}`, ROW.x + i * 100, PANEL.y + 144, 92, 84,
    { patternIndex: i, active: design.pattern === i },
  ));

  const patternInks = () => COVER_COLORS.map((color, i) => button(
    `ink:${i}`, ROW.x + i * ROW.step, PANEL.y + 264, ROW.size, ROW.size,
    { swatch: color, active: design.patternColor === i },
  ));

  const titleStyles = () => TITLE_STYLES.map((name, i) => button(
    `style:${i}`, ROW.x + i * 190, PANEL.y + 372, 178, ROW.size,
    { label: name, active: design.titleStyle === i },
  ));

  const titleInks = () => COVER_COLORS.map((color, i) => button(
    `titleInk:${i}`, ROW.x + i * ROW.step, PANEL.y + 480, ROW.size, ROW.size,
    { swatch: color, active: design.titleColor === i },
  ));

  const done = button('done', 1150, 24, TOUCH, TOUCH, { icon: 'check', tone: 'good' });
  const cancel = button('cancel', 1054, 24, TOUCH, TOUCH, { icon: 'cross' });

  /*
   * The title field is not in here.
   *
   * It is a real input on top of the canvas now, so it takes its own taps and
   * a canvas button under it would never be hit — and the one thing worse than
   * no hit target is two.
   */
  const controls = () => [
    ...covers(), ...patterns(), ...patternInks(),
    ...titleStyles(), ...titleInks(), cancel, done,
  ];

  return {
    /** Every tappable thing right now. Exposed so a test can check them all. */
    allControls: controls,

    onTap(x, y) {
      const hit = hitTest(controls(), x, y);
      // Tapping the canvas anywhere else puts the keyboard away.
      if (!hit) { field.blur(); return; }

      if (hit.id === 'done') { close(); onDone(design); return; }
      if (hit.id === 'cancel') { close(); onCancel(); return; }

      const [kind, value] = hit.id.split(':');
      const index = Number(value);
      if (kind === 'cover') design = { ...design, cover: index };
      else if (kind === 'pattern') design = { ...design, pattern: index };
      else if (kind === 'ink') design = { ...design, patternColor: index };
      else if (kind === 'style') design = { ...design, titleStyle: index };
      else if (kind === 'titleInk') design = { ...design, titleColor: index };
    },

    draw(ctx) {
      ctx.fillStyle = COLORS.backdrop;
      ctx.fillRect(0, 0, 1280, 720);

      // The book itself, big enough to judge.
      drawPanel(ctx, PREVIEW.x, PREVIEW.y, PREVIEW.w, PREVIEW.h, '#2c262e', 22);
      ctx.save();
      ctx.translate(PREVIEW.x + PREVIEW.w / 2, PREVIEW.y + PREVIEW.h - 40);
      drawBook(ctx, design, 250, 380);
      ctx.restore();

      drawPanel(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, COLORS.panel, 22);
      // Each label sits twice as far below the row above it as it does above
      // its own, so the five groups read as five groups. Set closer to even,
      // "Pattern" looks like a caption on the cover swatches.
      label(ctx, 'Cover', ROW.x, PANEL.y + 30);
      label(ctx, 'Pattern', ROW.x, PANEL.y + 138);
      label(ctx, 'Pattern colour', ROW.x, PANEL.y + 258);
      label(ctx, 'Title style', ROW.x, PANEL.y + 366);
      label(ctx, 'Title colour', ROW.x, PANEL.y + 474);

      for (const control of patterns()) drawPatternChip(ctx, control, design);
      drawButtons(ctx, [...covers(), ...patternInks(), ...titleStyles(), ...titleInks(),
        cancel, done]);
    },
  };
}

function label(ctx, text, x, y) {
  ctx.fillStyle = COLORS.inkDim;
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

/** A pattern chip showing the pattern on the cover colour actually chosen. */
function drawPatternChip(ctx, control, design) {
  fillRR(ctx, control.x, control.y, control.w, control.h, 10,
    control.active ? COLORS.buttonActive : '#413945');

  ctx.save();
  ctx.beginPath();
  ctx.rect(control.x + 5, control.y + 5, control.w - 10, control.h - 10);
  ctx.clip();
  ctx.translate(control.x + control.w / 2, control.y + control.h - 8);
  // Titleless, so the chip shows the pattern rather than the words.
  drawBook(ctx, { ...design, pattern: control.patternIndex, title: '' },
    control.w - 14, control.h - 16);
  ctx.restore();
}
