/**
 * Making a character.
 *
 * Every option shows the result rather than naming it: choosing a hairstyle
 * means looking at eight heads and picking one. Nothing here needs reading.
 */

import { button, hitTest, drawButtons, drawPanel, COLORS, TOUCH } from '../ui/widgets.js';
import { fillRR } from '../render/shapes.js';
import { drawCharacter, CHAR_H } from '../render/character.js';
import {
  EDITABLE_PARTS, PART_COUNTS, CLOTH_COLORS, HAIR_COLORS, LIP_COLORS, EYE_COLORS,
  createCharacterSpec, clampSpec,
} from '../model/character.js';

/** Parts shown as a head close-up; the rest are shown full length. */
const HEAD_PARTS = new Set(['face', 'skin', 'hair', 'brows', 'eyes', 'nose', 'mouth', 'extra']);

/** Parts where the difference is small enough to need a tighter crop. */
const FEATURE_PARTS = new Set(['brows', 'eyes', 'nose', 'mouth']);

/** Which palette belongs to which colour part. */
const PALETTES = {
  hairColor: HAIR_COLORS,
  eyeColor: EYE_COLORS,
  mouthColor: LIP_COLORS,
  topColor: CLOTH_COLORS,
  bottomColor: CLOTH_COLORS,
  shoesColor: CLOTH_COLORS,
  extraColor: CLOTH_COLORS,
};

// Eleven parts no longer fit in one column at a finger-sized target, so the
// tabs run two across.
const TAB = { x: 22, y: 92, size: 66, step: 74, cols: 2 };

// Five across and three down holds the largest part list (fourteen hairstyles)
// on one screen, so no part needs paging.
const GRID_X = 648;
const GRID_Y = 122;
const CELL = { w: 112, h: 128, stepX: 120, stepY: 136, cols: 5 };
const SWATCH_Y = 566;

export function createCharacterCreator(game, onDone, onCancel, initialSpec = null) {
  let spec = initialSpec ? clampSpec(initialSpec) : createCharacterSpec();
  let partIndex = 0;

  const part = () => EDITABLE_PARTS[partIndex];

  function optionControls() {
    const count = PART_COUNTS[part().key];
    return Array.from({ length: count }, (unused, i) => button(
      `opt:${i}`,
      GRID_X + (i % CELL.cols) * CELL.stepX,
      GRID_Y + Math.floor(i / CELL.cols) * CELL.stepY,
      CELL.w, CELL.h,
      { option: i, active: spec[part().key] === i },
    ));
  }

  function swatchControls() {
    const colorKey = part().colorKey;
    if (!colorKey) return [];
    const palette = PALETTES[colorKey] ?? CLOTH_COLORS;
    return palette.map((color, i) => button(
      `col:${i}`, GRID_X + i * 58, SWATCH_Y, 52, 52,
      { swatch: color, active: spec[colorKey] === i },
    ));
  }

  function tabControls() {
    return EDITABLE_PARTS.map((entry, i) => button(
      `tab:${i}`,
      TAB.x + (i % TAB.cols) * TAB.step,
      TAB.y + Math.floor(i / TAB.cols) * TAB.step,
      TAB.size, TAB.size,
      { active: i === partIndex, part: entry },
    ));
  }

  const done = button('done', 1136, 22, TOUCH, TOUCH, { icon: 'check', tone: 'good' });
  const cancel = button('cancel', 1040, 22, TOUCH, TOUCH, { icon: 'cross' });

  function controls() {
    return [...tabControls(), ...optionControls(), ...swatchControls(), cancel, done];
  }

  return {
    onTap(x, y) {
      const hit = hitTest(controls(), x, y);
      if (!hit) return;

      if (hit.id === 'done') { onDone(spec); return; }
      if (hit.id === 'cancel') { onCancel(); return; }

      const [kind, value] = hit.id.split(':');
      const index = Number(value);
      if (kind === 'tab') partIndex = index;
      else if (kind === 'opt') spec = { ...spec, [part().key]: index };
      else if (kind === 'col') spec = { ...spec, [part().colorKey]: index };
    },

    draw(ctx) {
      ctx.fillStyle = COLORS.backdrop;
      ctx.fillRect(0, 0, 1280, 720);

      // Preview
      drawPanel(ctx, 182, 96, 404, 600, '#2c262e', 22);
      ctx.save();
      ctx.translate(384, 646);
      ctx.scale(1.62, 1.62);
      drawCharacter(ctx, spec, game.time);
      ctx.restore();

      drawPanel(ctx, 620, 96, 636, 600, COLORS.panel, 22);

      for (const control of optionControls()) {
        drawOption(ctx, control, spec, part(), game.time);
      }
      for (const control of tabControls()) {
        drawTab(ctx, control, spec, game.time);
      }

      drawButtons(ctx, [...swatchControls(), cancel, done]);
    },
  };
}

/** A tab shows the character wearing whatever that part currently is. */
function drawTab(ctx, control, spec, time) {
  fillRR(ctx, control.x, control.y, control.w, control.h, 14,
    control.active ? COLORS.buttonActive : COLORS.button);
  drawMini(ctx, spec, control, cropFor(control.part.key), time);
}

/** How closely a cell should frame the character for a given part. */
function cropFor(key) {
  if (FEATURE_PARTS.has(key)) return 'feature';
  return HEAD_PARTS.has(key) ? 'head' : 'body';
}

function drawOption(ctx, control, spec, part, time) {
  fillRR(ctx, control.x, control.y, control.w, control.h, 14,
    control.active ? COLORS.buttonActive : '#413945');

  const preview = { ...spec, [part.key]: control.option };
  drawMini(ctx, preview, control, cropFor(part.key), time);
}

/**
 * Draws a character inside a cell — head close-up for face and hair, full
 * length for clothing, whichever makes the difference between options easiest
 * to see.
 */
function drawMini(ctx, spec, box, crop, time) {
  ctx.save();
  fillRR(ctx, box.x + 4, box.y + 4, box.w - 8, box.h - 8, 10, '#00000000');
  ctx.beginPath();
  ctx.rect(box.x + 4, box.y + 4, box.w - 8, box.h - 8);
  ctx.clip();

  const cx = box.x + box.w / 2;
  if (crop === 'feature') {
    // Brows, eyes, noses and mouths differ by a few pixels. Filling the cell
    // with the face is the only framing in which the options are comparable.
    const scale = Math.min(box.w, box.h) / 125;
    ctx.translate(cx, box.y + box.h * 0.52 + 198 * scale);
    ctx.scale(scale, scale);
  } else if (crop === 'head') {
    // Head and shoulders: what tells fourteen hairstyles apart is the
    // silhouette below the ears, and a tighter crop cut exactly that off.
    const scale = Math.min(box.w, box.h) / 205;
    ctx.translate(cx, box.y + box.h * 0.4 + 198 * scale);
    ctx.scale(scale, scale);
  } else {
    const scale = (box.h - 16) / CHAR_H;
    ctx.translate(cx, box.y + box.h - 8);
    ctx.scale(scale, scale);
  }
  drawCharacter(ctx, spec, time);
  ctx.restore();
}
