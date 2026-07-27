/**
 * Designing a book cover.
 *
 * The title is typed on the phone's own keyboard rather than on one drawn in
 * canvas. A hidden input is focused when she taps the title, which brings up
 * the keyboard she already knows, with its own autocorrect and its own delete
 * key. A hand-drawn keyboard would have been consistent with the rest of the
 * game and considerably worse to use.
 */

import { button, hitTest, drawButtons, drawPanel, drawTitle, COLORS, TOUCH } from '../ui/widgets.js';
import { fillRR, roundRect } from '../render/shapes.js';
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

/**
 * The input that brings up the keyboard.
 *
 * Kept off screen rather than hidden with `display: none`, because a display
 * of none cannot take focus and so never opens the keyboard at all.
 */
function createTitleInput(initial, onChange) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = initial;
  input.maxLength = MAX_TITLE;
  input.autocapitalize = 'words';
  input.setAttribute('aria-label', 'Book title');
  Object.assign(input.style, {
    position: 'fixed',
    left: '-9999px',
    top: '0',
    opacity: '0',
    width: '1px',
    height: '1px',
  });

  input.addEventListener('input', () => onChange(cleanTitle(input.value)));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') input.blur();
  });

  document.body.appendChild(input);
  return input;
}

export function createBookDesigner(game, initial, onDone, onCancel) {
  let design = clampBook(initial ?? createBook());
  let typing = false;

  const input = createTitleInput(design.title, (value) => {
    design = { ...design, title: value };
  });

  const close = () => {
    input.remove();
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

  const titleField = () => button('title', PREVIEW.x, PREVIEW.y + PREVIEW.h + 24,
    PREVIEW.w, TOUCH, {});

  const done = button('done', 1150, 24, TOUCH, TOUCH, { icon: 'check', tone: 'good' });
  const cancel = button('cancel', 1054, 24, TOUCH, TOUCH, { icon: 'cross' });

  const controls = () => [
    ...covers(), ...patterns(), ...patternInks(),
    ...titleStyles(), ...titleInks(), titleField(), cancel, done,
  ];

  return {
    onTap(x, y) {
      const hit = hitTest(controls(), x, y);
      if (!hit) { input.blur(); typing = false; return; }

      if (hit.id === 'done') { close(); onDone(design); return; }
      if (hit.id === 'cancel') { close(); onCancel(); return; }
      if (hit.id === 'title') {
        typing = true;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        return;
      }

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

      drawTitleField(ctx, titleField(), design.title, typing, game.time);

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

/** The title, shown as a field she can tap to type into. */
function drawTitleField(ctx, box, title, typing, time) {
  fillRR(ctx, box.x, box.y, box.w, box.h, 14, typing ? '#3d3543' : '#2c262e');
  ctx.strokeStyle = typing ? COLORS.buttonActive : '#4a4048';
  ctx.lineWidth = 3;
  roundRect(ctx, box.x, box.y, box.w, box.h, 14);
  ctx.stroke();

  ctx.fillStyle = title ? COLORS.ink : COLORS.inkDim;
  ctx.font = '600 24px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const shown = title || 'Tap to name your book';
  ctx.fillText(shown, box.x + 18, box.y + box.h / 2);

  // A caret while the keyboard is up, so it is obvious where typing lands.
  if (typing && Math.floor(time * 2) % 2 === 0) {
    const width = ctx.measureText(title).width;
    ctx.fillStyle = COLORS.buttonActive;
    ctx.fillRect(box.x + 20 + width, box.y + 14, 3, box.h - 28);
  }
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
