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

/**
 * The smallest type worth drawing.
 *
 * Below this letters stop being letters and become texture, which reads as a
 * smudge on the cover rather than as a title.
 */
const MIN_TYPE = 7;

/** How much of the width is the spine, seen very slightly from the side. */
const SPINE = 0.11;

/**
 * A book lying flat, seen from the side.
 *
 * Books standing upright show their covers, which is the point of designing
 * one — but three books balanced on each other's top edges is a tower, not a
 * pile, and looked absurd. A book dropped onto another lies down instead: you
 * see the page edges, the spine at one end, and a sliver of the cover on top.
 * Stack a few and it reads as a real pile.
 */
export function drawBookFlat(ctx, rawDesign, w, h) {
  const design = clampBook(rawDesign);
  const cover = COVER_COLORS[design.cover];
  const spineW = Math.max(6, w * 0.07);

  // Page block, with the leaves showing along the long front edge.
  ctx.fillStyle = litFill(ctx, -h, h, '#efe6d6', 0.1);
  fillRR(ctx, -w / 2 + spineW, -h + 3, w - spineW, h - 4, 2, ctx.fillStyle);
  ctx.strokeStyle = '#d8ccb8';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i += 1) {
    const y = -h + 4 + (i * (h - 6)) / 4;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + spineW + 2, y);
    ctx.lineTo(w / 2 - 3, y);
    ctx.stroke();
  }

  // The boards: a sliver of the cover top and bottom, and the spine end.
  ctx.fillStyle = litFill(ctx, -h, 5, cover, 0.2);
  fillRR(ctx, -w / 2, -h, w, 5, 2, ctx.fillStyle);
  ctx.fillStyle = shade(cover, -0.18);
  fillRR(ctx, -w / 2, -4, w, 4, 2, ctx.fillStyle);

  ctx.fillStyle = sideLit(ctx, -w / 2, spineW, shade(cover, -0.12), 0.24);
  fillRR(ctx, -w / 2, -h, spineW, h, 2, ctx.fillStyle);

  ctx.save();
  ctx.globalAlpha = 0.14;
  fillEllipse(ctx, 0, -1, w * 0.48, 3, '#000');
  ctx.restore();
}

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
      const bands = Math.max(7, Math.round(h / 30));
      for (let i = 0; i < bands; i += 1) {
        fillRR(ctx, x, y + 6 + i * (h / bands), w, Math.max(2, h / (bands * 2.4)), 2, ink);
      }
      return;
    }
    if (style === 'checks') {
      const size = w / Math.max(5, Math.round(w / 42));
      for (let cx = 0; cx * size < w; cx += 1) {
        for (let cy = 0; cy * size < h; cy += 1) {
          if ((cx + cy) % 2) continue;
          ctx.fillStyle = ink;
          ctx.fillRect(x + cx * size, y + cy * size, size, size);
        }
      }
      return;
    }

    // The scattered patterns share a layout: staggered rows of one motif.
    // Density follows the size of the cover, so a big cover is not sparse and
    // a shelf-sized one is not three enormous blobs.
    const cols = Math.max(3, Math.round(w / 52));
    const rows = Math.max(4, Math.round(h / 52));
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

  /*
   * Shrink until every word fits — but never below a size a person can read.
   *
   * On the designer's big preview every title fits comfortably, so nothing is
   * ever dropped there. On a shelf a book is barely eighty pixels tall, and
   * "Anne of Green Gables" set across four lines at that size is grey noise
   * rather than a title. Below the floor it is better to show fewer words
   * clearly than every word illegibly — you can always pick the book up.
   */
  const floor = Math.max(MIN_TYPE, h * 0.075);
  const maxLines = h < 160 ? 2 : 4;

  let size = Math.round(h * 0.135);
  let lines = [];
  for (; size > floor; size -= 1) {
    ctx.font = `700 ${size}px Georgia, serif`;
    const attempt = wrap(ctx, title, maxWidth, maxLines);
    if (attempt.complete) { lines = attempt.lines; break; }
    lines = attempt.lines;
  }
  size = Math.max(size, floor);
  ctx.font = `700 ${size}px Georgia, serif`;
  if (lines.length > maxLines) lines = lines.slice(0, maxLines);

  const arch = style === 'arched' && lines.length === 1;
  const lineHeight = size * 1.26;
  const blockH = lines.length * lineHeight;
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const top = y + h * (arch ? 0.16 : 0.19);
  const cx = x + w / 2;

  const padX = size * 0.55;
  const padY = size * 0.36;
  let boxFill = null;

  // Banner and boxed are deliberate designs and keep their backing. Plain and
  // arched get a halo round the letters instead: it buys the same legibility
  // for the cost of an outline rather than covering the cover, which on a
  // four-line title meant hiding almost all of the art she chose.
  if (style === 'banner') {
    fillRR(ctx, x + 4, top - padY, w - 8, blockH + padY * 2, 4, ink);
    fillRR(ctx, x + 4, top - padY, w - 8, 4, 2, shade(ink, 0.4));
  } else if (style === 'boxed') {
    // Opaque, and tinted from the cover rather than a flat grey: a printed
    // label sits on the cover, where a translucent panel let the pattern show
    // through it as a smear.
    const bg = effectiveBackground(design);
    boxFill = blend(bg, contrastTo(bg), 0.86);
    fillRR(ctx, cx - widest / 2 - padX, top - padY, widest + padX * 2,
      blockH + padY * 2, 5, boxFill);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5;
    roundRect(ctx, cx - widest / 2 - padX + 4, top - padY + 4,
      widest + padX * 2 - 8, blockH + padY * 2 - 8, 3);
    ctx.stroke();
  }

  /*
   * What the letters are actually set in.
   *
   * Each style puts the words on something different, so each asks the same
   * question of a different background: a banner is a solid bar of her colour,
   * a box is a near-solid label, and plain and arched sit straight on the
   * cover. The dark title colour on a boxed cover was the case that made this
   * worth separating — the box goes dark over a light cover, and her charcoal
   * ink disappeared into the label meant to be carrying it.
   */
  let textInk;
  if (style === 'banner') textInk = contrastTo(ink);
  else if (style === 'boxed') textInk = readableOn(ink, boxFill);
  else textInk = readableInk(design);

  const halo = (style === 'plain' || arch) && needsHalo(design)
    ? plateColour(textInk)
    : null;

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

/** Near-black and near-white, warmed so they sit on a paper cover. */
const DARKEST = '#17121c';
const LIGHTEST = '#fdf7ec';

/**
 * Every background a letter has to hold up against.
 *
 * Three of them on a patterned cover, not two: the cover, the pattern, and
 * their average. Which one the eye actually sees depends on how fine the
 * pattern is — a letter crossing a big star sits on the star, while stripes at
 * shelf size blur into a single tone — and the ink has no way to know which,
 * so it clears all three.
 */
function coverTones(design) {
  const cover = COVER_COLORS[design.cover];
  if (COVER_PATTERNS[design.pattern] === 'plain') return [cover];
  return [cover, COVER_COLORS[design.patternColor], effectiveBackground(design)];
}

/** How far apart two colours read. */
function gap(a, b) {
  return Math.abs(luminance(a) - luminance(b));
}

/**
 * An ink moved only as far as it has to be to be read on a given background.
 *
 * The ten cover colours are a set of tinted paper stocks, and eight of them
 * sit inside a luminance band narrower than the contrast floor itself — so
 * almost any colour she picks for a title is close to almost any colour she
 * picks for the cover. Measured across every combination, 89% of them landed
 * below the floor, which meant the halo that was written as insurance was
 * carrying the whole palette, and carrying it thinly.
 *
 * Her choice is kept: only the lightness moves, and only until it separates.
 * Blue on purple stays blue — it becomes a navy or a powder blue rather than
 * a different colour.
 */
export function readableOn(ink, ...backgrounds) {
  const worst = (color) => Math.min(...backgrounds.map((bg) => gap(color, bg)));
  if (worst(ink) >= CONTRAST_FLOOR) return ink;

  // Both directions are tried rather than picking one from the average,
  // because a cover and its pattern can sit on opposite sides of it: cream
  // stars on a charcoal cover average to a mid grey that points nowhere.
  let best = ink;
  let bestGap = worst(ink);
  for (const target of [DARKEST, LIGHTEST]) {
    for (let t = 0.1; t <= 1.0001; t += 0.05) {
      const candidate = blend(ink, target, Math.min(t, 1));
      const separation = worst(candidate);
      if (separation >= CONTRAST_FLOOR) return candidate;
      if (separation > bestGap) {
        bestGap = separation;
        best = candidate;
      }
    }
  }
  // Nothing clears every tone — the cover has light and dark on it at once.
  // The best available ink goes out and the halo carries the rest.
  return best;
}

/**
 * Her title colour, as it has to be to be read on the cover she chose.
 *
 * Measured against the tones actually printed on the cover rather than their
 * average, because those are what a letter crosses.
 */
export function readableInk(design) {
  return readableOn(COVER_COLORS[design.titleColor], ...coverTones(design));
}

/** Black or white, whichever the given colour can carry. */
export function contrastTo(color) {
  return luminance(color) > 0.55 ? '#2e2a30' : '#f7f2e8';
}

export function luminance(hex) {
  const v = parseInt(hex.slice(1), 16);
  const r = ((v >> 16) & 255) / 255;
  const g = ((v >> 8) & 255) / 255;
  const b = (v & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Halfway between two colours, as the eye sees a pattern over a cover. */
function blend(a, b, amount = 0.5) {
  const av = parseInt(a.slice(1), 16);
  const bv = parseInt(b.slice(1), 16);
  const mix = (shift) => {
    const ac = (av >> shift) & 255;
    const bc = (bv >> shift) & 255;
    return Math.round(ac + (bc - ac) * amount);
  };
  const value = (mix(16) << 16) | (mix(8) << 8) | mix(0);
  return `#${value.toString(16).padStart(6, '0')}`;
}

/**
 * What the title is actually sitting on.
 *
 * A patterned cover reads as somewhere between its own colour and the
 * pattern's, so contrast has to be judged against the mixture rather than
 * against the cover alone.
 */
export function effectiveBackground(design) {
  const cover = COVER_COLORS[design.cover];
  if (COVER_PATTERNS[design.pattern] === 'plain') return cover;
  return blend(cover, COVER_COLORS[design.patternColor], 0.35);
}

/** Below this the ink and its background are too close to tell apart. */
export const CONTRAST_FLOOR = 0.34;

/**
 * Whether a title needs a glow behind it.
 *
 * The glow is insurance, not decoration. Cream lettering on a charcoal cover
 * already separates perfectly, and adding a dark glow underneath it only
 * smudged the area — which is what made dark covers look murky. So the glow
 * appears exactly when the ink cannot be read against one of the tones on the
 * cover, whatever its lightness.
 */
export function needsHalo(design) {
  // Against the real tones rather than their average: a cream star on a
  // charcoal cover averages to a mid grey that no single ink can be read on,
  // and it is the star the letter actually crosses. Checked against the ink
  // after adjustment, so the halo is back to being the exception it was
  // written as — the case where no one colour works anywhere on the cover.
  const ink = readableInk(design);
  return coverTones(design).some((tone) => gap(ink, tone) < CONTRAST_FLOOR);
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
