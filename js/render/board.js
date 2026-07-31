/**
 * Drawing what is on a whiteboard.
 *
 * One function, used at two sizes: the board hanging on the wall, 244 pixels
 * wide on the phone, and the board she draws on full screen. Both take the
 * same strokes through the same mapping, so the line she puts in the corner
 * full screen is in the corner of the little one — which is the only thing
 * that makes drawing on it feel like drawing on it.
 */

import { GRID, NIB, MARKER_COLORS, FACE } from '../model/board.js';

/**
 * The drawable face of a whiteboard, in the item's own local coordinates.
 *
 * The origin is the bottom centre of the item, which is where every placed
 * item is drawn from.
 */
export function faceRect(w, h) {
  return { x: -w / 2 + w * FACE.x, y: -h + h * FACE.y, w: w * FACE.w, h: h * FACE.h };
}

/**
 * Paints a drawing into a rectangle.
 *
 * The nib is a fraction of the width it is drawn at rather than a number of
 * pixels, so the line keeps its weight relative to the board at any size. A
 * fixed nib looked like a felt tip full screen and like a hair on the wall.
 */
export function drawStrokes(ctx, design, rect) {
  const strokes = design?.strokes;
  if (!strokes?.length) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.2, rect.w * NIB);

  for (const stroke of strokes) {
    const points = stroke?.p;
    if (!points || points.length < 2) continue;
    ctx.strokeStyle = MARKER_COLORS[stroke.c] ?? MARKER_COLORS[0];

    const x0 = rect.x + (points[0] / GRID) * rect.w;
    const y0 = rect.y + (points[1] / GRID) * rect.h;
    if (points.length === 2) {
      // A dot is a stroke of one point, and a child draws them on purpose.
      ctx.beginPath();
      ctx.arc(x0, y0, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (let i = 2; i + 1 < points.length; i += 2) {
      ctx.lineTo(rect.x + (points[i] / GRID) * rect.w, rect.y + (points[i + 1] / GRID) * rect.h);
    }
    ctx.stroke();
  }
  ctx.restore();
}
