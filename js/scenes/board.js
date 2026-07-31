/**
 * The whiteboard, full screen, with a finger on it.
 *
 * The board on the wall is 244 pixels wide on the phone, which is enough to
 * see a drawing and nowhere near enough to make one. So tapping it opens this:
 * the same face, the same proportions, filling the screen.
 *
 * There is no save button. What she draws is on the board the moment she lifts
 * her finger, the way a real one works — and the way it has to work for the
 * back button to be the only thing she has to understand.
 */

import { button, hitTest, drawButtons, drawPanel, COLORS, TOUCH } from '../ui/widgets.js';
import { fillRR, roundRect } from '../render/shapes.js';
import { drawItemArt } from '../render/catalog.js';
import { drawStrokes } from '../render/board.js';
import {
  GRID, MARKER_COLORS, createBoard, clampBoard, startStroke, extendStroke,
  eraseAt, wipe, hasRoom, RUB,
} from '../model/board.js';

/** The face she draws on, at the size the screen can give it. */
const FACE = { x: 40, y: 96, w: 940, h: 489 };

/** The tray of tools down the right-hand side. */
const TOOL = { x: 1016, y: 116, size: 76, gapX: 92, gapY: 86, cols: 2 };

/**
 * @param {number|null} startColor the marker she came in holding, if she
 *   opened the board by tapping a pen rather than the board itself
 */
export function createBoardScene(game, board, items, onBack, onFindMarkers, startColor = null) {
  board.design = clampBoard(board.design ?? createBoard());

  const colors = markersHere();
  // The pen she tapped, if she still has it; otherwise the first in the tray.
  let tool = colors.includes(startColor) ? startColor : (colors.length ? colors[0] : null);
  let drawing = false;
  /** Set while the rubber is down, so a drag rubs rather than draws. */
  let rubbing = false;

  function markersHere() {
    const tints = new Set();
    for (const item of items ?? []) {
      if (item?.item !== 'marker') continue;
      const tint = item.tint ?? 0;
      if (tint >= 0 && tint < MARKER_COLORS.length) tints.add(tint);
    }
    return [...tints].sort((a, b) => a - b);
  }

  function markerButtons() {
    return colors.map((tint, i) => button(
      `marker:${tint}`,
      TOOL.x + (i % TOOL.cols) * TOOL.gapX,
      TOOL.y + Math.floor(i / TOOL.cols) * TOOL.gapY,
      TOOL.size, TOOL.size,
      { tint, active: tool === tint, flat: true },
    ));
  }

  /** Where the tools below the markers start, whatever the palette holds. */
  function toolsTop() {
    const rows = Math.max(1, Math.ceil(colors.length / TOOL.cols));
    return TOOL.y + rows * TOOL.gapY + 16;
  }

  const rubber = () => button('rubber', TOOL.x, toolsTop(), 168, TOUCH,
    { icon: 'rubber', active: tool === 'rubber' });

  // Live even on a blank board: wiping one that is already clear does
  // nothing, and a button that greys itself out is one more thing to explain.
  const wipeAll = () => button('wipe', TOOL.x, toolsTop() + 92, 168, TOUCH,
    { icon: 'wipe', tone: 'danger' });

  /** Shown only when she has no markers at all, and it fetches her one. */
  const getMarkers = () => button('getMarkers', TOOL.x, TOOL.y, 168, TOUCH,
    { icon: 'plus', tone: 'accent' });

  const back = button('back', 1184, 20, TOUCH, TOUCH, { icon: 'back' });

  const controls = () => [
    back,
    ...(colors.length ? markerButtons() : [getMarkers()]),
    rubber(), wipeAll(),
  ];

  /** Where a finger on the screen lands on the board, or null if it is off it. */
  function toBoard(x, y) {
    if (x < FACE.x || x > FACE.x + FACE.w || y < FACE.y || y > FACE.y + FACE.h) return null;
    return {
      x: ((x - FACE.x) / FACE.w) * GRID,
      y: ((y - FACE.y) / FACE.h) * GRID,
    };
  }

  return {
    allControls: controls,

    onPointerDown(x, y) {
      const at = toBoard(x, y);
      if (!at) return;
      if (tool === 'rubber') {
        rubbing = true;
        if (eraseAt(board.design, at.x, at.y, RUB)) game.persist();
        return;
      }
      if (tool === null) return;
      drawing = startStroke(board.design, tool, at.x, at.y);
    },

    onPointerMove(x, y) {
      const at = toBoard(x, y);
      if (!at) return;
      if (rubbing) {
        if (eraseAt(board.design, at.x, at.y, RUB)) game.persist();
        return;
      }
      if (drawing) extendStroke(board.design, at.x, at.y);
    },

    onPointerUp() {
      if (drawing || rubbing) game.persist();
      drawing = false;
      rubbing = false;
    },

    onTap(x, y) {
      // A tap that landed on the board itself was a dot she drew, not a miss.
      if (toBoard(x, y)) return;
      const hit = hitTest(controls(), x, y);
      if (!hit) return;

      if (hit.id === 'back') { onBack(); return; }
      if (hit.id === 'getMarkers') { onFindMarkers(); return; }
      if (hit.id === 'wipe') {
        if (wipe(board.design)) game.persist();
        return;
      }
      if (hit.id === 'rubber') { tool = 'rubber'; return; }

      const [kind, value] = hit.id.split(':');
      if (kind === 'marker') tool = Number(value);
    },

    draw(ctx) {
      ctx.fillStyle = COLORS.backdrop;
      ctx.fillRect(0, 0, 1280, 720);

      // The board: a frame, a face, and her drawing on it.
      drawPanel(ctx, FACE.x - 16, FACE.y - 16, FACE.w + 32, FACE.h + 62, '#b9b5ad', 14);
      fillRR(ctx, FACE.x, FACE.y, FACE.w, FACE.h, 6, '#fbfaf6');
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, FACE.x, FACE.y, FACE.w, FACE.h, 6);
      ctx.clip();
      drawStrokes(ctx, board.design, FACE);
      ctx.restore();

      // The tray under it, so the full-screen board is plainly the same object
      // as the one on the wall.
      fillRR(ctx, FACE.x - 8, FACE.y + FACE.h + 14, FACE.w + 16, 22, 6, '#a09c94');

      // A full board says so, rather than silently ignoring her finger.
      if (!hasRoom(board.design)) {
        ctx.fillStyle = COLORS.inkDim;
        ctx.font = '600 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Board full — wipe it to draw more', FACE.x + FACE.w / 2, FACE.y + FACE.h + 25);
      }

      drawPanel(ctx, TOOL.x - 14, TOOL.y - 20, 196, 620, COLORS.panel, 18);
      const buttons = controls();
      for (const control of buttons) {
        if (control.tint === undefined) continue;
        drawMarkerCell(ctx, control, game);
      }
      drawButtons(ctx, buttons.filter((c) => c.tint === undefined));
    },
  };
}

/**
 * One marker in the palette, drawn as the marker it is.
 *
 * Swatches were the obvious thing and were wrong: the rule of this board is
 * that the colours are the markers she owns, and a row of coloured circles
 * says nothing about markers at all.
 */
function drawMarkerCell(ctx, control, game) {
  fillRR(ctx, control.x, control.y, control.w, control.h, 14,
    control.active ? COLORS.buttonActive : '#3d3543');

  const def = game.catalog?.get?.('marker');
  ctx.save();
  ctx.translate(control.x + control.w / 2, control.y + control.h - 8);
  if (def) {
    const fit = Math.min((control.w - 24) / def.w, (control.h - 16) / def.h);
    ctx.scale(fit, fit);
    drawItemArt(ctx, def, control.tint);
  } else {
    // No catalog to hand — a plain nib is still the right colour.
    fillRR(ctx, -8, -control.h + 20, 16, control.h - 26, 4, MARKER_COLORS[control.tint]);
  }
  ctx.restore();
}
