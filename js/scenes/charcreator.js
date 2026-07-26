/**
 * Making a character.
 *
 * Every option shows the result rather than naming it: choosing a hairstyle
 * means looking at eight heads and picking one. Nothing here needs reading.
 */

import { button, hitTest, drawButtons, drawPanel, COLORS, TOUCH } from '../ui/widgets.js';
import { drawIcon } from '../ui/icons.js';
import { fillRR } from '../render/shapes.js';
import { drawCharacter, headBounds, CHAR_H } from '../render/character.js';
import {
  EDITABLE_PARTS, PART_COUNTS, CLOTH_COLORS, HAIR_COLORS, LIP_COLORS, EYE_COLORS,
  SKIN_TONES, LOOKS, applyLook, createCharacterSpec, clampSpec,
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
// tabs run two across. Nine rows of them is what sets the size: 70 is the
// largest that still leaves the last row on the screen, and anything smaller
// lands under a child's fingertip on the phone.
const TAB = { x: 20, y: 36, size: 70, step: 75, cols: 2 };

// Five across and three down holds the largest part list (fourteen hairstyles)
// on one screen, so no part needs paging.
const GRID_X = 648;
const GRID_Y = 122;
const CELL = { w: 112, h: 128, stepX: 120, stepY: 136, cols: 5 };
const SWATCH_Y = 566;

/**
 * The looks gallery, plus every individual part.
 *
 * The gallery comes first because facing sixteen tabs on a blank character is
 * not a starting point. Picking a look sets several parts at once and leaves
 * every one of them editable afterwards.
 */
const TABS = [{ key: 'looks', colorKey: null, icon: 'looks' }, ...EDITABLE_PARTS];

export function createCharacterCreator(game, onDone, onCancel, initialSpec = null) {
  let spec = initialSpec ? clampSpec(initialSpec) : createCharacterSpec();
  let partIndex = 0;

  const part = () => TABS[partIndex];
  const onLooks = () => part().key === 'looks';

  function optionControls() {
    if (onLooks()) {
      return LOOKS.map((look, i) => button(
        `look:${look.id}`,
        GRID_X + (i % 3) * 200,
        GRID_Y + Math.floor(i / 3) * 230,
        190, 220,
        { look },
      ));
    }
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
    if (!colorKey || onLooks()) return [];
    const palette = PALETTES[colorKey] ?? CLOTH_COLORS;
    return palette.map((color, i) => button(
      `col:${i}`, GRID_X + i * 58, SWATCH_Y, 52, 52,
      { swatch: color, active: spec[colorKey] === i },
    ));
  }

  function tabControls() {
    return TABS.map((entry, i) => button(
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
      if (kind === 'look') { spec = applyLook(spec, value); return; }

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
        if (control.look) drawLookCard(ctx, control, spec, game.time);
        else drawOption(ctx, control, spec, part(), game.time);
      }
      for (const control of tabControls()) {
        drawTab(ctx, control, spec);
      }

      drawButtons(ctx, [...swatchControls(), cancel, done]);
    },
  };
}

/**
 * A tab is a drawing of the feature it edits, tinted with the colour currently
 * chosen for it.
 *
 * It used to be a thumbnail of the character, which could not distinguish the
 * brows tab from the eyes tab — eleven tabs showed the same face at slightly
 * different crops. A symbol says what the tab is for; the tint says what is
 * currently set.
 */
function drawTab(ctx, control, spec) {
  fillRR(ctx, control.x, control.y, control.w, control.h, 14,
    control.active ? COLORS.buttonActive : COLORS.button);

  drawIcon(
    ctx, control.part.icon,
    control.x + control.w / 2, control.y + control.h / 2,
    tabTint(control.part.key, spec, control.active),
    1.05,
  );
}

/** The colour a tab's symbol is drawn in, previewing the current choice. */
function tabTint(key, spec, active) {
  switch (key) {
    case 'skin': return SKIN_TONES[spec.skin];
    case 'hair': return HAIR_COLORS[spec.hairColor];
    case 'brows': return HAIR_COLORS[spec.hairColor];
    case 'eyes': return EYE_COLORS[spec.eyeColor];
    case 'mouth': return LIP_COLORS[spec.mouthColor];
    case 'top': return CLOTH_COLORS[spec.topColor];
    case 'bottom': return CLOTH_COLORS[spec.bottomColor];
    case 'shoes': return CLOTH_COLORS[spec.shoesColor];
    case 'extra': return CLOTH_COLORS[spec.extraColor];
    default: return active ? '#2c262e' : COLORS.ink;
  }
}

/** A whole look, shown full length with its name underneath. */
function drawLookCard(ctx, control, spec, time) {
  fillRR(ctx, control.x, control.y, control.w, control.h, 16,
    control.active ? COLORS.buttonActive : '#413945');

  const preview = applyLook(spec, control.look.id);
  drawMini(ctx, preview, {
    x: control.x, y: control.y, w: control.w, h: control.h - 30,
  }, 'body', time);

  ctx.fillStyle = COLORS.ink;
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(control.look.label, control.x + control.w / 2, control.y + control.h - 18);
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
  // Framing is measured off where the head actually is for this character,
  // not off a constant — builds and face shapes move it.
  const head = headBounds(spec);

  if (crop === 'feature') {
    // Brows, eyes, noses and mouths differ by a few pixels. Filling the cell
    // with the face is the only framing in which the options are comparable.
    const scale = (box.h * 0.92) / head.height;
    ctx.translate(cx, box.y + box.h * 0.5 - head.centre * scale);
    ctx.scale(scale, scale);
  } else if (crop === 'head') {
    // Head, hair and a little shoulder. What tells fourteen hairstyles apart
    // is the silhouette falling below the jaw, so the frame has to include it.
    const scale = box.h / (head.height * 2.05);
    ctx.translate(cx, box.y + box.h * 0.06 - head.top * scale);
    ctx.scale(scale, scale);
  } else {
    const scale = (box.h - 16) / CHAR_H;
    ctx.translate(cx, box.y + box.h - 8);
    ctx.scale(scale, scale);
  }
  drawCharacter(ctx, spec, time);
  ctx.restore();
}
