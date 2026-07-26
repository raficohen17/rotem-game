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
  EDITABLE_PARTS, PART_COUNTS, CLOTH_COLORS, HAIR_COLORS,
  createCharacterSpec, clampSpec,
} from '../model/character.js';

/** Parts shown as a head close-up; the rest are shown full length. */
const HEAD_PARTS = new Set(['skin', 'hair', 'eyes', 'mouth', 'extra']);

const TAB_X = 26;
const TAB_SIZE = 64;
const TAB_STEP = 72;
const GRID_X = 648;
const GRID_Y = 132;
const CELL = { w: 140, h: 152, stepX: 148, stepY: 160 };
const SWATCH_Y = 626;

export function createCharacterCreator(game, onDone, onCancel, initialSpec = null) {
  let spec = initialSpec ? clampSpec(initialSpec) : createCharacterSpec();
  let partIndex = 0;

  const part = () => EDITABLE_PARTS[partIndex];

  function optionControls() {
    const count = PART_COUNTS[part().key];
    return Array.from({ length: count }, (unused, i) => button(
      `opt:${i}`,
      GRID_X + (i % 4) * CELL.stepX,
      GRID_Y + Math.floor(i / 4) * CELL.stepY,
      CELL.w, CELL.h,
      { option: i, active: spec[part().key] === i },
    ));
  }

  function swatchControls() {
    const colorKey = part().colorKey;
    if (!colorKey) return [];
    const palette = colorKey === 'hairColor' ? HAIR_COLORS : CLOTH_COLORS;
    return palette.map((color, i) => button(
      `col:${i}`, GRID_X + i * 60, SWATCH_Y, 54, 54,
      { swatch: color, active: spec[colorKey] === i },
    ));
  }

  function tabControls() {
    return EDITABLE_PARTS.map((entry, i) => button(
      `tab:${i}`, TAB_X, 96 + i * TAB_STEP, TAB_SIZE, TAB_SIZE,
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
      drawPanel(ctx, 116, 96, 470, 600, '#241f3a', 22);
      ctx.save();
      ctx.translate(351, 640);
      ctx.scale(1.6, 1.6);
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
  drawMini(ctx, spec, control, HEAD_PARTS.has(control.part.key), time);
}

function drawOption(ctx, control, spec, part, time) {
  fillRR(ctx, control.x, control.y, control.w, control.h, 14,
    control.active ? COLORS.buttonActive : '#352c52');

  const preview = { ...spec, [part.key]: control.option };
  drawMini(ctx, preview, control, HEAD_PARTS.has(part.key), time);
}

/**
 * Draws a character inside a cell — head close-up for face and hair, full
 * length for clothing, whichever makes the difference between options easiest
 * to see.
 */
function drawMini(ctx, spec, box, headOnly, time) {
  ctx.save();
  fillRR(ctx, box.x + 4, box.y + 4, box.w - 8, box.h - 8, 10, '#00000000');
  ctx.beginPath();
  ctx.rect(box.x + 4, box.y + 4, box.w - 8, box.h - 8);
  ctx.clip();

  const cx = box.x + box.w / 2;
  if (headOnly) {
    const scale = Math.min(box.w, box.h) / 150;
    ctx.translate(cx, box.y + box.h / 2 + 206 * scale);
    ctx.scale(scale, scale);
  } else {
    const scale = (box.h - 16) / CHAR_H;
    ctx.translate(cx, box.y + box.h - 8);
    ctx.scale(scale, scale);
  }
  drawCharacter(ctx, spec, time);
  ctx.restore();
}
