/**
 * Making a cat.
 *
 * The same shape as the character creator — a rail of parts, a grid of live
 * previews, complete animals for one tap — because it is the same job and
 * Rotem should not have to learn a second way of doing it.
 *
 * Every cell is a whole cat rather than a swatch: the difference between a
 * tabby and a spotted cat is not something a colour chip can show.
 */

import { button, hitTest, drawButtons, drawPanel, COLORS, TOUCH } from '../ui/widgets.js';
import { fillRR } from '../render/shapes.js';
import { drawCat, CAT_H } from '../render/cat.js';
import {
  CAT_PARTS, CAT_PART_COUNTS, CAT_LOOKS, COAT_COLORS, EYE_COLORS, COLLAR_COLORS,
  applyCatLook, createCatSpec, clampCatSpec,
} from '../model/cat.js';

const TAB = { x: 20, y: 96, size: 70, step: 75, cols: 2 };
const GRID_X = 648;
const GRID_Y = 122;

/** Cells, sized so the longest part list fits without paging. */
const CELL = { w: 150, h: 116, stepX: 158, stepY: 124, cols: 4 };

const LOOK_BOX = { right: 1264, bottom: 700, gap: 10, maxH: 180 };

/** Which palette belongs to which colour part, for the parts that are colours. */
const PALETTES = {
  coat: COAT_COLORS,
  markingColor: COAT_COLORS,
  eyes: EYE_COLORS,
};

export function lookGrid(count, cols = 4) {
  const rows = Math.max(1, Math.ceil(count / cols));
  const { gap, maxH } = LOOK_BOX;
  const w = (LOOK_BOX.right - GRID_X - (cols - 1) * gap) / cols;
  const h = Math.min(maxH, (LOOK_BOX.bottom - GRID_Y - (rows - 1) * gap) / rows);
  return { cols, rows, w, h, stepX: w + gap, stepY: h + gap, x: GRID_X, y: GRID_Y };
}

/** The rail: whole cats first, then each part. */
const TABS = [{ key: 'looks', icon: 'catFace' }, ...CAT_PARTS];

export function createCatCreator(game, onDone, onCancel, initialSpec = null) {
  let spec = initialSpec ? clampCatSpec(initialSpec) : createCatSpec();
  let partIndex = 0;

  const part = () => TABS[partIndex];
  const onLooks = () => part().key === 'looks';

  function optionControls() {
    if (onLooks()) {
      const grid = lookGrid(CAT_LOOKS.length);
      return CAT_LOOKS.map((look, i) => button(
        `look:${look.id}`,
        grid.x + (i % grid.cols) * grid.stepX,
        grid.y + Math.floor(i / grid.cols) * grid.stepY,
        grid.w, grid.h,
        { look },
      ));
    }
    const count = CAT_PART_COUNTS[part().key];
    return Array.from({ length: count }, (unused, i) => button(
      `opt:${i}`,
      GRID_X + (i % CELL.cols) * CELL.stepX,
      GRID_Y + Math.floor(i / CELL.cols) * CELL.stepY,
      CELL.w, CELL.h,
      { option: i, active: spec[part().key] === i },
    ));
  }

  const tabControls = () => TABS.map((entry, i) => button(
    `tab:${i}`,
    TAB.x + (i % TAB.cols) * TAB.step,
    TAB.y + Math.floor(i / TAB.cols) * TAB.step,
    TAB.size, TAB.size,
    { active: i === partIndex, icon: entry.icon },
  ));

  const done = button('done', 1136, 22, TOUCH, TOUCH, { icon: 'check', tone: 'good' });
  const cancel = button('cancel', 1040, 22, TOUCH, TOUCH, { icon: 'cross' });

  const controls = () => [...tabControls(), ...optionControls(), cancel, done];

  return {
    /** Every tappable thing right now. Exposed so a test can check them all. */
    allControls: controls,

    onTap(x, y) {
      const hit = hitTest(controls(), x, y);
      if (!hit) return;

      if (hit.id === 'done') { onDone(spec); return; }
      if (hit.id === 'cancel') { onCancel(); return; }

      const [kind, value] = hit.id.split(':');
      if (kind === 'tab') { partIndex = Number(value); return; }
      if (kind === 'look') { spec = applyCatLook(spec, value); return; }
      if (kind === 'opt') spec = clampCatSpec({ ...spec, [part().key]: Number(value) });
    },

    draw(ctx) {
      ctx.fillStyle = COLORS.backdrop;
      ctx.fillRect(0, 0, 1280, 720);

      // The cat itself, big.
      drawPanel(ctx, 182, 96, 404, 600, '#2c262e', 22);
      ctx.save();
      ctx.translate(384, 470);
      ctx.scale(2.6, 2.6);
      drawCat(ctx, spec, game.time, 'stand');
      ctx.restore();

      drawPanel(ctx, 620, 96, 636, 600, COLORS.panel, 22);

      for (const control of optionControls()) {
        if (control.look) drawLookCard(ctx, control, spec);
        else drawOption(ctx, control, spec, part());
      }
      drawButtons(ctx, [...tabControls(), cancel, done]);
    },
  };
}

function drawOption(ctx, control, spec, part) {
  fillRR(ctx, control.x, control.y, control.w, control.h, 14,
    control.active ? COLORS.buttonActive : '#413945');
  drawCachedCat(ctx, { ...spec, [part.key]: control.option }, control);
}

function drawLookCard(ctx, control, spec) {
  fillRR(ctx, control.x, control.y, control.w, control.h, 16,
    control.active ? COLORS.buttonActive : '#413945');
  drawCachedCat(ctx, applyCatLook(spec, control.look.id), {
    x: control.x, y: control.y, w: control.w, h: control.h - 26,
  });

  ctx.fillStyle = COLORS.ink;
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(control.look.label, control.x + control.w / 2, control.y + control.h - 15);
}

/*
 * Cells drawn once and kept, as the character creator does.
 *
 * A whole cat per cell per frame is the same trap: it is not the drawing that
 * hurts, it is allocating a spec and clamping it sixty times a second for
 * every cell on screen, which is enough garbage to make the collector stall.
 */
const catCache = new Map();
const CACHE_LIMIT = 300;
const TILE_SCALE = 2;

function drawCachedCat(ctx, spec, box) {
  const w = Math.round(box.w);
  const h = Math.round(box.h);
  const key = `${w}x${h}|${Object.values(spec).join(',')}`;

  let tile = catCache.get(key);
  if (!tile) {
    if (catCache.size > CACHE_LIMIT) catCache.clear();
    tile = document.createElement('canvas');
    tile.width = w * TILE_SCALE;
    tile.height = h * TILE_SCALE;
    const tctx = tile.getContext('2d');
    tctx.scale(TILE_SCALE, TILE_SCALE);
    // Sized to the cell, standing on its floor.
    const fit = Math.min((w - 16) / 110, (h - 14) / CAT_H);
    tctx.translate(w / 2, h - 10);
    tctx.scale(fit, fit);
    drawCat(tctx, spec, 0, 'stand');
    catCache.set(key, tile);
  }
  ctx.drawImage(tile, box.x, box.y, w, h);
}
