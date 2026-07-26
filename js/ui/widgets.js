/**
 * Shared interface pieces.
 *
 * Every tappable thing is a plain object with a box and an id, and hit testing
 * is a single helper. Keeping buttons as data rather than as classes means a
 * scene can rebuild its whole control set each frame without allocating much,
 * and the geometry stays easy to read.
 */

import { fillRR, fillCircle, shade } from '../render/shapes.js';
import { drawIcon } from './icons.js';

/** Minimum touch target in design pixels — sized for a child's finger. */
export const TOUCH = 72;

/** The design space every scene is laid out in, before letterbox scaling. */
export const SCREEN = { w: 1280, h: 720 };

/**
 * Lays a row of tabs across the screen.
 *
 * The tabs used to be a fixed 102px apart, which fitted the ten tabs there
 * were when it was written and ran 88px off the right edge once there were
 * thirteen — the wall-decor tab was drawn past the end of the screen and could
 * not be tapped at all, so pictures and windows were unreachable. Sizing the
 * step from the count means the row always fits, however many drawers there
 * are, and a tab is never wider than it needs to be.
 *
 * @param {number} count how many tabs are in the row
 * @param {{x: number, y: number, h: number, gap: number, maxW: number}} [row]
 */
export function tabRow(count, row = TAB_ROW) {
  const span = SCREEN.w - row.x * 2;
  const step = count > 0 ? Math.min(row.maxW + row.gap, span / count) : row.maxW;
  return {
    x: row.x,
    y: row.y,
    h: row.h,
    step,
    w: step - row.gap,
    /** The left edge of tab `i`. */
    at: (i) => row.x + i * step,
  };
}

const TAB_ROW = { x: 30, y: 482, h: 58, gap: 6, maxW: 98 };

/* A warm charcoal surround, so the tinted paper of the rooms is what carries
   the colour rather than competing with the interface. */
export const COLORS = {
  panel: '#332c33',
  panelEdge: '#463d47',
  button: '#4a4048',
  buttonActive: '#d98a4e',
  danger: '#c05a63',
  good: '#6f9463',
  ink: '#f4eee4',
  inkDim: '#a89e94',
  backdrop: '#241f26',
};

/**
 * @param {string} id returned by hitTest so the caller can switch on it
 */
export function button(id, x, y, w, h, options = {}) {
  return { id, x, y, w, h, ...options };
}

/** A square icon button at the standard touch size. */
export function iconButton(id, x, y, options = {}) {
  return button(id, x, y, TOUCH, TOUCH, options);
}

export function contains(box, px, py) {
  return px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h;
}

/** Topmost matching control, or null. Later entries win, as they draw on top. */
export function hitTest(controls, px, py) {
  for (let i = controls.length - 1; i >= 0; i -= 1) {
    if (!controls[i].disabled && contains(controls[i], px, py)) return controls[i];
  }
  return null;
}

export function drawPanel(ctx, x, y, w, h, color = COLORS.panel, radius = 18) {
  fillRR(ctx, x, y, w, h, radius, color);
}

export function drawButton(ctx, btn) {
  const base = btn.active ? COLORS.buttonActive
    : btn.tone === 'danger' ? COLORS.danger
      : btn.tone === 'good' ? COLORS.good
        : btn.tone === 'accent' ? COLORS.buttonActive
          : COLORS.button;
  const fill = btn.disabled ? shade(base, -0.45) : base;
  // Round controls float over the room; square ones sit in a panel.
  const radius = btn.round ? Math.min(btn.w, btn.h) / 2 : 16;

  if (!btn.flat) {
    fillRR(ctx, btn.x, btn.y + 4, btn.w, btn.h, radius, shade(fill, -0.35));
    fillRR(ctx, btn.x, btn.y, btn.w, btn.h, radius, fill);
  }

  const cx = btn.x + btn.w / 2;
  const cy = btn.y + btn.h / 2;
  const ink = btn.disabled ? COLORS.inkDim : COLORS.ink;

  if (btn.icon) drawIcon(ctx, btn.icon, cx, cy, ink, btn.iconScale ?? 1);
  if (btn.label) {
    ctx.fillStyle = ink;
    ctx.font = `600 ${btn.labelSize ?? 20}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, cx, btn.icon ? btn.y + btn.h - 14 : cy);
  }
  if (btn.swatch) {
    fillCircle(ctx, cx, cy, Math.min(btn.w, btn.h) * 0.3, btn.swatch);
    if (btn.active) {
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(btn.w, btn.h) * 0.38, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

export function drawButtons(ctx, controls) {
  for (const control of controls) drawButton(ctx, control);
}

export function drawTitle(ctx, text, x, y, size = 30, color = COLORS.ink) {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

/**
 * A modal question with two big answers. Returned as a scene-like object the
 * caller draws on top of itself; kept deliberately blunt because the only
 * thing it is ever used for is "really delete this?".
 */
export function createConfirm(message, onYes, onNo) {
  const yes = button('yes', 560, 400, 160, TOUCH, { icon: 'check', tone: 'good' });
  const no = button('no', 380, 400, 160, TOUCH, { icon: 'cross', tone: 'danger' });

  return {
    controls: [no, yes],
    draw(ctx) {
      ctx.fillStyle = 'rgba(10, 8, 20, 0.7)';
      ctx.fillRect(0, 0, 1280, 720);
      drawPanel(ctx, 340, 250, 600, 260);
      ctx.fillStyle = COLORS.ink;
      ctx.font = '600 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(message, 640, 330);
      drawButtons(ctx, this.controls);
    },
    onTap(x, y) {
      const hit = hitTest(this.controls, x, y);
      if (!hit) return;
      if (hit.id === 'yes') onYes();
      else onNo();
    },
  };
}
