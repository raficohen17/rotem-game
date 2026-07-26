/**
 * Drawing a book Rotem designed.
 *
 * Books stand cover-out rather than lying flat. A stack of books seen from the
 * side would show only spines, and the whole point is that she made the
 * covers — so they stand slightly proud of one another, like a display, and
 * every cover stays visible however high the pile.
 *
 * Local space matches every other item: the origin is the bottom centre, x
 * runs from -w/2 to w/2 and y from -h up to 0.
 */

import { fillRR, fillCircle, fillEllipse, fillPoly, strokeLine, roundRect, shade } from './shapes.js';
import { litFill, sideLit, within } from './materials.js';
import { COVER_COLORS, COVER_PATTERNS, TITLE_STYLES, clampBook } from '../model/book.js';

/** How much of the width is the spine, seen very slightly from the side. */
const SPINE = 0.11;

export function drawBook(ctx, rawDesign, w, h) {
  const design = clampBook(rawDesign);
  const cover = COVER_COLORS[design.cover];
  const spineW = w * SPINE;
  const faceX = -w / 2 + spineW;
  const faceW = w - spineW;

  // The pages, showing along the open edge.
  fillRR(ctx, faceX + 4, -h + 3, faceW - 4, h - 6, 3, '#efe6d6');
  for (let i = 1; i < 4; i += 1) {
    strokeLine(ctx, faceX + faceW - 2 - i * 2, -h + 8, faceX + faceW - 2 - i * 2, -8,
      '#d8ccb8', 1.2);
  }

  // The spine, turned a little toward us.
  ctx.fillStyle = sideLit(ctx, -w / 2, spineW, shade(cover, -0.22), 0.2);
  fillRR(ctx, -w / 2, -h, spineW + 5, h, 4, ctx.fillStyle);

  // The front cover.
  ctx.fillStyle = litFill(ctx, -h, h, cover, 0.12);
  fillRR(ctx, faceX, -h, faceW, h, 5, ctx.fillStyle);

  drawPattern(ctx, design, faceX, -h, faceW, h);
  drawTitle(ctx, design, faceX, -h, faceW, h);

  // A highlight down the hinge, and the shadow the book casts on itself.
  strokeLine(ctx, faceX + 3, -h + 6, faceX + 3, -6, shade(cover, -0.3), 2);
  ctx.save();
  ctx.globalAlpha = 0.16;
  fillEllipse(ctx, 0, -1, w * 0.46, 4, '#000');
  ctx.restore();
}

/** Cover patterns, clipped to the face so nothing spills onto the spine. */
function drawPattern(ctx, design, x, y, w, h) {
  const style = COVER_PATTERNS[design.pattern];
  if (style === 'plain') return;

  const ink = COVER_COLORS[design.patternColor];

  within(ctx, x, y, w, h, () => {
    ctx.globalAlpha = 0.85;

    if (style === 'stripes') {
      for (let i = 0; i < 9; i += 1) {
        fillRR(ctx, x, y + 6 + i * (h / 9), w, h / 22, 2, ink);
      }
      return;
    }
    if (style === 'checks') {
      const size = w / 5;
      for (let cx = 0; cx < 6; cx += 1) {
        for (let cy = 0; cy < 9; cy += 1) {
          if ((cx + cy) % 2) continue;
          ctx.fillStyle = ink;
          ctx.fillRect(x + cx * size, y + cy * size, size, size);
        }
      }
      return;
    }

    // The scattered patterns share a layout: staggered rows of one motif.
    const cols = 3;
    const rows = 4;
    const stepX = w / cols;
    const stepY = h / rows;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cx = x + stepX * (col + 0.5) + (row % 2 ? stepX * 0.3 : -stepX * 0.15);
        const cy = y + stepY * (row + 0.55);
        const r = Math.min(stepX, stepY) * 0.24;
        drawMotif(ctx, style, cx, cy, r, ink);
      }
    }
  });
}

function drawMotif(ctx, style, cx, cy, r, ink) {
  switch (style) {
    case 'spots':
      fillCircle(ctx, cx, cy, r, ink);
      break;
    case 'stars':
      fillPoly(ctx, [
        cx, cy - r, cx + r * 0.3, cy - r * 0.3, cx + r, cy - r * 0.15,
        cx + r * 0.45, cy + r * 0.35, cx + r * 0.6, cy + r,
        cx, cy + r * 0.55, cx - r * 0.6, cy + r,
        cx - r * 0.45, cy + r * 0.35, cx - r, cy - r * 0.15, cx - r * 0.3, cy - r * 0.3,
      ], ink);
      break;
    case 'hearts':
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(cx, cy + r * 0.9);
      ctx.bezierCurveTo(cx - r * 1.5, cy - r * 0.2, cx - r * 0.5, cy - r * 1.1, cx, cy - r * 0.3);
      ctx.bezierCurveTo(cx + r * 0.5, cy - r * 1.1, cx + r * 1.5, cy - r * 0.2, cx, cy + r * 0.9);
      ctx.closePath();
      ctx.fill();
      break;
    case 'moons':
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 0.35, Math.PI * 1.65);
      ctx.arc(cx + r * 0.5, cy, r * 0.92, Math.PI * 1.5, Math.PI * 0.5, true);
      ctx.closePath();
      ctx.fill();
      break;
    default: // flowers
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        fillCircle(ctx, cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, r * 0.42, ink);
      }
      fillCircle(ctx, cx, cy, r * 0.3, shade(ink, 0.45));
  }
}

/**
 * The title, set on the cover.
 *
 * Every style puts something behind the text. That is not decoration: Rotem
 * picks the cover, the pattern and the title colour independently, so sooner
 * or later she picks blue on green spots — and a title you cannot read is a
 * title she will not bother typing. The plate guarantees contrast whatever
 * she chooses.
 *
 * Wrapped to at most three lines and shrunk until it fits, because a cover
 * that clips its own words looks broken rather than full.
 */
function drawTitle(ctx, design, x, y, w, h) {
  const title = design.title.trim();
  if (!title) return;

  const ink = COVER_COLORS[design.titleColor];
  const style = TITLE_STYLES[design.titleStyle];
  const maxWidth = w * 0.78;

  // Shrink until every word fits. Dropping the tail of a title she typed is
  // worse than setting it small — "Anne of Green Gables" must not become
  // "Anne of Green".
  let size = Math.round(h * 0.135);
  let lines = [];
  for (; size > h * 0.055; size -= 1) {
    ctx.font = `700 ${size}px Georgia, serif`;
    const attempt = wrap(ctx, title, maxWidth, 4);
    if (attempt.complete) { lines = attempt.lines; break; }
    lines = attempt.lines;
  }
  ctx.font = `700 ${size}px Georgia, serif`;

  const arch = style === 'arched' && lines.length === 1;
  const lineHeight = size * 1.26;
  const blockH = lines.length * lineHeight;
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const top = y + h * (arch ? 0.16 : 0.19);
  const cx = x + w / 2;

  const plate = plateColour(ink);
  const padX = size * 0.55;
  const padY = size * 0.36;

  // Banner and boxed are deliberate designs and keep their backing. Plain and
  // arched get a halo round the letters instead: it buys the same legibility
  // for the cost of an outline rather than covering the cover, which on a
  // four-line title meant hiding almost all of the art she chose.
  if (style === 'banner') {
    fillRR(ctx, x + 4, top - padY, w - 8, blockH + padY * 2, 4, ink);
    fillRR(ctx, x + 4, top - padY, w - 8, 4, 2, shade(ink, 0.4));
  } else if (style === 'boxed') {
    ctx.save();
    ctx.globalAlpha = 0.55;
    fillRR(ctx, cx - widest / 2 - padX, top - padY, widest + padX * 2,
      blockH + padY * 2, 5, plate);
    ctx.restore();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5;
    roundRect(ctx, cx - widest / 2 - padX + 4, top - padY + 4,
      widest + padX * 2 - 8, blockH + padY * 2 - 8, 3);
    ctx.stroke();
  }

  const textInk = style === 'banner' ? contrastTo(ink) : ink;
  const halo = style === 'plain' || arch ? plate : null;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  if (arch) {
    drawArched(ctx, lines[0], cx, top + size * 0.95, size, textInk, halo);
    return;
  }
  lines.forEach((line, i) => {
    haloedText(ctx, line, cx, top + i * lineHeight, size, textInk, halo);
  });
}

/**
 * Text with a soft glow behind it.
 *
 * A stroked outline was tried first and merged: at a readable weight the
 * outlines of adjacent lines ran together into a solid slab, which is exactly
 * the plate this was meant to replace. A blurred shadow cannot merge that way
 * — it falls off — so the cover stays visible between the lines.
 */
function haloedText(ctx, text, x, y, size, ink, halo, draw = null) {
  const paint = draw ?? (() => ctx.fillText(text, x, y));

  if (halo) {
    ctx.save();
    ctx.shadowColor = halo;
    ctx.shadowBlur = size * 0.42;
    ctx.fillStyle = halo;
    // Three passes: one blurred shadow is too faint to carry over a pattern.
    for (let i = 0; i < 3; i += 1) paint();
    ctx.restore();
  }

  ctx.fillStyle = ink;
  paint();
}

/** A backing tone that the ink will always read against. */
function plateColour(ink) {
  return luminance(ink) > 0.55 ? '#2e2a30' : '#f7f2e8';
}

/** Black or white, whichever the given colour can carry. */
function contrastTo(color) {
  return luminance(color) > 0.55 ? '#2e2a30' : '#f7f2e8';
}

function luminance(hex) {
  const v = parseInt(hex.slice(1), 16);
  const r = ((v >> 16) & 255) / 255;
  const g = ((v >> 8) & 255) / 255;
  const b = (v & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Words wrapped to a width.
 *
 * Reports whether every word fitted, so the caller can shrink the type rather
 * than silently losing the end of a title.
 *
 * @returns {{lines: string[], complete: boolean}}
 */
function wrap(ctx, text, width, max) {
  const words = text.split(' ');
  const lines = [];
  let line = '';

  for (let i = 0; i < words.length; i += 1) {
    const next = line ? `${line} ${words[i]}` : words[i];

    if (ctx.measureText(next).width <= width) {
      line = next;
      continue;
    }
    if (!line) {
      // A single word too wide for the cover at this size.
      return { lines: [...lines, next], complete: false };
    }
    lines.push(line);
    line = words[i];
    if (lines.length === max) return { lines, complete: false };
  }

  if (line) lines.push(line);
  return { lines, complete: lines.length <= max };
}

/**
 * A single line bent over an arc, the way a storybook title is set.
 *
 * Each letter advances by its own width rather than by a fixed angle — a
 * constant step piles a W on top of an i, which is what scrambled the first
 * version.
 */
function drawArched(ctx, text, cx, baseY, size, ink, halo) {
  const radius = size * 4.4;
  const letters = [...text];
  const widths = letters.map((letter) => ctx.measureText(letter).width);
  const total = widths.reduce((sum, width) => sum + width, 0);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.translate(cx, baseY + radius);

  let travelled = -total / 2;
  letters.forEach((letter, i) => {
    const angle = (travelled + widths[i] / 2) / radius;
    ctx.save();
    ctx.rotate(angle);
    haloedText(ctx, letter, 0, -radius, size, ink, halo,
      () => ctx.fillText(letter, 0, -radius));
    ctx.restore();
    travelled += widths[i];
  });
  ctx.restore();
}
