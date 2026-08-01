/**
 * Making a character.
 *
 * Every option shows the result rather than naming it: choosing a hairstyle
 * means looking at eight heads and picking one. Nothing here needs reading.
 *
 * Two options are behind a code. They are shown rather than hidden, because a
 * thing she cannot see is a thing she cannot look forward to — the point of a
 * code is that she knows what it opens before she has it.
 */

import { button, hitTest, drawButtons, drawPanel, COLORS, TOUCH } from '../ui/widgets.js';
import { drawIcon } from '../ui/icons.js';
import { openTextField } from '../ui/textfield.js';
import { fillRR } from '../render/shapes.js';
import { drawCharacter, headBounds, charHeight } from '../render/character.js';
import {
  EDITABLE_PARTS, PART_COUNTS, CLOTH_COLORS, HAIR_COLORS, LIP_COLORS, EYE_COLORS,
  SKIN_TONES, LOOKS, applyLook, createCharacterSpec, clampSpec,
} from '../model/character.js';
import { lockFor, lockId, isLocked, redeem, cleanCode, CODE_LENGTH } from '../model/unlocks.js';

/** Parts shown as a head close-up; the rest are shown full length. */
const HEAD_PARTS = new Set(['face', 'skin', 'hair', 'hairColor', 'brows', 'eyes', 'nose', 'mouth', 'extra']);

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

/**
 * Lays the colour swatches out across the panel, wrapping when they run out.
 *
 * Fixed at a 52px swatch on a 58px step, the row fitted the ten colours it was
 * written for and ran to x=1512 once the wardrobe had fifteen — five swatches
 * off the side of a 1280 screen, unreachable. Wrapping rather than shrinking:
 * squeezing fifteen into the same width gives a 35px swatch, which is 20px on
 * the phone and under what a child can hit.
 */
export function swatchRow(count) {
  const STEP = 58;
  const cols = Math.floor((1264 - GRID_X) / STEP);
  return {
    cols,
    step: STEP,
    size: STEP - 6,
    rows: Math.max(1, Math.ceil(count / cols)),
    x: (i) => GRID_X + (i % cols) * STEP,
    y: (i) => SWATCH_Y + Math.floor(i / cols) * STEP,
  };
}

/** The box the look cards are dealt into. */
const LOOK_BOX = { right: 1264, bottom: 700, gap: 10, maxH: 220 };

/**
 * Lays the looks out to fit however many there are.
 *
 * Fixed at a 190x220 card on a 200x230 step, the seventh look started a third
 * row that ran to y=802 on a 720-tall canvas — three whole outfits drawn off
 * the bottom of the screen. Sizing the card from the count means adding a look
 * is still a matter of writing it down.
 */
export function lookGrid(count, cols = 3) {
  const rows = Math.max(1, Math.ceil(count / cols));
  const { gap, maxH } = LOOK_BOX;
  const w = (LOOK_BOX.right - GRID_X - (cols - 1) * gap) / cols;
  const h = Math.min(maxH, (LOOK_BOX.bottom - GRID_Y - (rows - 1) * gap) / rows);
  return { cols, rows, w, h, stepX: w + gap, stepY: h + gap, x: GRID_X, y: GRID_Y };
}
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

/**
 * Where the code field sits: under the option grid it was tapped in.
 *
 * Clear of the last row of cells, which for the two locked parts ends at 522 —
 * the prompt was overlapping the very tile it was asking about.
 */
const CODE_BOX = { x: 648, y: 590, w: 380, h: TOUCH };

export function createCharacterCreator(game, onDone, onCancel, initialSpec = null) {
  let spec = initialSpec ? clampSpec(initialSpec) : createCharacterSpec();
  let partIndex = 0;

  /** The part whose code is being typed, or null when nothing is being unlocked. */
  let unlocking = null;
  let field = null;

  const part = () => TABS[partIndex];
  const onLooks = () => part().key === 'looks';

  /** What has been unlocked on this device. Empty is a normal state, not a fault. */
  const unlocked = () => game.unlocks ?? [];

  function closeCode() {
    field?.close();
    field = null;
    unlocking = null;
  }

  /**
   * Asks for a code.
   *
   * The part being unlocked is named on the field, so it is obvious which of
   * the two codes on the fridge she is meant to be typing.
   */
  function askForCode(lock) {
    closeCode();
    unlocking = lock;
    const id = lockId(lock.key, lock.index);

    field = openTextField(game.view, CODE_BOX, {
      maxLength: CODE_LENGTH,
      filter: cleanCode,
      keyboard: 'code',
      align: 'center',
      label: `Code for ${lock.name}`,
      placeholder: lock.name,
      onChange: (value) => {
        if (value.length < CODE_LENGTH) return;

        const after = redeem(id, value, unlocked());
        // `redeem` hands back the list it was given when the code is wrong, so
        // the two cases tell themselves apart without a second check.
        if (after === unlocked()) { field.shake(); return; }

        game.setUnlocks(after);
        spec = { ...spec, [lock.key]: lock.index };
        partIndex = TABS.findIndex((t) => t.key === lock.key);
        closeCode();
      },
    });
    field.focus();
  }

  function optionControls() {
    if (onLooks()) {
      const grid = lookGrid(LOOKS.length);
      return LOOKS.map((look, i) => button(
        `look:${look.id}`,
        grid.x + (i % grid.cols) * grid.stepX,
        grid.y + Math.floor(i / grid.cols) * grid.stepY,
        grid.w, grid.h,
        { look },
      ));
    }
    const count = PART_COUNTS[part().key];
    const key = part().key;
    return Array.from({ length: count }, (unused, i) => button(
      `opt:${i}`,
      GRID_X + (i % CELL.cols) * CELL.stepX,
      GRID_Y + Math.floor(i / CELL.cols) * CELL.stepY,
      CELL.w, CELL.h,
      { option: i, active: spec[key] === i, locked: isLocked(key, i, unlocked()) },
    ));
  }

  function swatchControls() {
    const colorKey = part().colorKey;
    if (!colorKey || onLooks()) return [];
    // The code field stands where the swatches do. She is not choosing a
    // colour while she is typing a code, and two rows of them showing through
    // the field made it look like something had gone wrong.
    if (unlocking) return [];
    const palette = PALETTES[colorKey] ?? CLOTH_COLORS;
    const row = swatchRow(palette.length);
    return palette.map((color, i) => button(
      `col:${i}`, row.x(i), row.y(i), row.size, row.size,
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
    /** Every tappable thing right now. Exposed so a test can check them all. */
    allControls: controls,

    onTap(x, y) {
      const hit = hitTest(controls(), x, y);
      if (!hit) { closeCode(); return; }

      if (hit.id === 'done') { closeCode(); onDone(spec); return; }
      if (hit.id === 'cancel') { closeCode(); onCancel(); return; }

      const [kind, value] = hit.id.split(':');
      if (kind === 'look') { closeCode(); spec = applyLook(spec, value); return; }

      const index = Number(value);
      if (kind === 'tab') { closeCode(); partIndex = index; return; }

      if (kind === 'opt') {
        if (hit.locked) { askForCode(lockFor(part().key, index)); return; }
        closeCode();
        spec = { ...spec, [part().key]: index };
      } else if (kind === 'col') {
        closeCode();
        spec = { ...spec, [part().colorKey]: index };
      }
    },

    /** Scenes are dropped without ceremony, so the field has to go with it. */
    leave: closeCode,

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
        if (control.look) drawLookCard(ctx, control, spec);
        else drawOption(ctx, control, spec, part());
      }
      for (const control of tabControls()) {
        drawTab(ctx, control, spec);
      }

      // The prompt over the code field, on a slab of its own so the field does
      // not look like it is floating over the panel behind it. The field
      // itself is a real input on top of the canvas, so nothing is drawn where
      // it actually sits.
      if (unlocking) {
        fillRR(ctx, CODE_BOX.x - 24, CODE_BOX.y - 56, CODE_BOX.w + 168,
          CODE_BOX.h + 80, 18, '#2c262e');
        drawIcon(ctx, 'lock', CODE_BOX.x + CODE_BOX.w + 66,
          CODE_BOX.y + CODE_BOX.h / 2, COLORS.inkDim, 0.8);
        ctx.fillStyle = COLORS.ink;
        ctx.font = '600 26px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`Type the code for the ${unlocking.name.toLowerCase()}`,
          CODE_BOX.x, CODE_BOX.y - 22);
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
function drawLookCard(ctx, control, spec) {
  fillRR(ctx, control.x, control.y, control.w, control.h, 16,
    control.active ? COLORS.buttonActive : '#413945');

  // A look card shows a fixed outfit, so it never changes at all once drawn.
  const preview = applyLook(spec, control.look.id);
  drawCachedMini(ctx, preview, {
    x: control.x, y: control.y, w: control.w, h: control.h - 30,
  }, 'body');

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

function drawOption(ctx, control, spec, part) {
  fillRR(ctx, control.x, control.y, control.w, control.h, 14,
    control.active ? COLORS.buttonActive : '#413945');

  const preview = { ...spec, [part.key]: control.option };

  if (control.locked) {
    /*
     * Shown, but faint, with a padlock over it.
     *
     * Faint rather than a silhouette: she is meant to be able to tell that it
     * is a long dress and that she wants it. A blank tile with a lock on it
     * would say something exists and nothing about what.
     */
    ctx.save();
    ctx.globalAlpha = 0.32;
    drawCachedMini(ctx, preview, control, cropFor(part.key));
    ctx.restore();
    drawIcon(ctx, 'lock', control.x + control.w / 2, control.y + control.h / 2,
      COLORS.ink, 0.62);
    return;
  }

  drawCachedMini(ctx, preview, control, cropFor(part.key));
}

/*
 * Option cells, rendered once and kept.
 *
 * Every cell used to draw a whole character on every frame — up to nineteen of
 * them on the hair tab, each one allocating a spread of the spec, two
 * clampSpecs and a fresh metrics object. Sixty times a second that is enough
 * garbage to make the collector stall for a tenth of a second at a time, which
 * on a phone is the screen locking up for a moment every time she changes
 * something. The stalls were not on any one tab; they landed wherever the
 * collector happened to run.
 *
 * A cell only changes when the character does, so it is drawn to its own small
 * canvas and blitted after that. The big preview still animates — that is the
 * one that is meant to be alive.
 */
const miniCache = new Map();
const MINI_CACHE_LIMIT = 400;

function drawCachedMini(ctx, spec, box, crop) {
  const w = Math.round(box.w);
  const h = Math.round(box.h);
  const key = `${crop}|${w}x${h}|${miniKey(spec, crop)}`;

  let tile = miniCache.get(key);
  if (!tile) {
    // Cheaper to drop the lot than to track which cells a change invalidates;
    // it refills in one frame and this only trips after a lot of browsing.
    if (miniCache.size > MINI_CACHE_LIMIT) miniCache.clear();
    tile = document.createElement('canvas');
    tile.width = w * MINI_SCALE;
    tile.height = h * MINI_SCALE;
    const tctx = tile.getContext('2d');
    tctx.scale(MINI_SCALE, MINI_SCALE);
    drawMini(tctx, spec, { x: 0, y: 0, w, h }, crop, 0);
    miniCache.set(key, tile);
  }
  ctx.drawImage(tile, box.x, box.y, w, h);
}

/** Drawn at twice the cell size, so the tiles survive the letterbox scale. */
const MINI_SCALE = 2;

/**
 * What a cell actually depends on.
 *
 * Keying on the whole spec would redraw every cell whenever anything changed,
 * including parts the cell does not show — a head crop does not care what the
 * shoes are.
 */
const MINI_KEYS = {
  feature: ['build', 'face', 'skin', 'brows', 'eyes', 'eyeColor', 'nose', 'mouth', 'mouthColor', 'hair', 'hairColor'],
  head: ['build', 'face', 'skin', 'hair', 'hairColor', 'hairpin', 'hairpinColor', 'brows', 'eyes', 'eyeColor', 'nose', 'mouth', 'mouthColor'],
};

function miniKey(spec, crop) {
  const keys = MINI_KEYS[crop];
  if (!keys) return Object.values(spec).join(',');
  return keys.map((k) => spec[k]).join(',');
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
    // Fitted to how tall this particular person is, not to the tallest one
    // there could be: the size cells draw a child and a grown-up side by side,
    // and a grown-up scaled as a child hangs out of the top of her cell.
    const scale = (box.h - 16) / charHeight(spec);
    ctx.translate(cx, box.y + box.h - 8);
    ctx.scale(scale, scale);
  }
  drawCharacter(ctx, spec, time);
  ctx.restore();
}
