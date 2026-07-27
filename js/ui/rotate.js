/**
 * The one screen that appears when the phone is held the wrong way up.
 *
 * Drawn in CSS pixels against the real viewport rather than in the game's
 * design space, because in portrait that space is a letterboxed strip — a
 * message inside it would be small and floating in the middle of a black
 * screen, which is the problem rather than the fix.
 *
 * A picture first and three words after it. Rotem reads English, but a
 * six-year-old holding a phone that has gone blank wants to know what to do
 * before she wants to read about it, and the picture says it faster.
 */

const INK = '#f2ecdf';
const DIM = '#9d93a6';
const ACCENT = '#d9925c';

/** Why the screen has gone away, in the fewest words that explain it. */
const NOTE = 'The house needs a wide screen';

/**
 * The largest size at which a string fits a width.
 *
 * There is no canvas to measure against when this is decided, and system-ui
 * differs by platform anyway, so it estimates on the high side: 0.6em per
 * character is above the average of any of these words.
 */
function fits(text, width) {
  return width / (text.length * 0.6);
}

/**
 * @param {CanvasRenderingContext2D} ctx in CSS pixels, origin top left
 * @param {number} w viewport width
 * @param {number} h viewport height
 * @param {number} time seconds, for the tilt
 */
export function drawRotatePrompt(ctx, w, h, time = 0) {
  // Sized from the arc outwards, because the arc plus its arrowhead is the
  // widest part and the thing that runs off the edge if the phone is sized
  // first. Everything else is a fraction of it, so the whole picture keeps its
  // proportions on any screen shape.
  const radius = Math.min(w * 0.32, h * 0.15);
  const phoneH = radius * 1.3;
  const phoneW = phoneH / 1.9;
  const centreY = h * 0.42;

  ctx.save();
  ctx.translate(w / 2, centreY);

  // A slow quarter turn and back, so the picture demonstrates the action
  // rather than just depicting a phone. Eased, so it settles at each end
  // instead of sweeping past.
  const cycle = (Math.sin(time * 1.15) + 1) / 2;
  const eased = cycle * cycle * (3 - 2 * cycle);
  ctx.rotate(eased * (Math.PI / 2));

  drawPhone(ctx, phoneW, phoneH);
  ctx.restore();

  // The arc and arrow sit outside the phone and do not turn with it.
  drawTurnArrow(ctx, w / 2, centreY, radius);

  const title = Math.max(20, Math.round(Math.min(w * 0.085, h * 0.045)));
  ctx.fillStyle = INK;
  ctx.font = `700 ${title}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Turn your phone', w / 2, h * 0.76);

  // The second line is the longest thing on the screen, so its size is set by
  // what will fit rather than by a fraction of the first line. Taken as a
  // fraction, it ran off both edges of a 412px phone by five pixels.
  const note = Math.max(13, Math.floor(Math.min(title * 0.55, fits(NOTE, w * 0.84))));
  ctx.fillStyle = DIM;
  ctx.font = `600 ${note}px system-ui, sans-serif`;
  ctx.fillText(NOTE, w / 2, h * 0.76 + title * 1.15);
}

/** A phone, drawn from its own centre so it can be rotated about it. */
function drawPhone(ctx, w, h) {
  const r = w * 0.16;

  ctx.fillStyle = '#39323f';
  roundRect(ctx, -w / 2, -h / 2, w, h, r);
  ctx.fill();

  ctx.strokeStyle = '#5d5266';
  ctx.lineWidth = Math.max(2, w * 0.04);
  roundRect(ctx, -w / 2, -h / 2, w, h, r);
  ctx.stroke();

  // The screen, showing the letterboxed strip that is the whole complaint.
  const inset = w * 0.11;
  const screenW = w - inset * 2;
  const screenH = h - inset * 2;
  ctx.fillStyle = '#221d26';
  roundRect(ctx, -screenW / 2, -screenH / 2, screenW, screenH, r * 0.55);
  ctx.fill();

  const stripH = screenW * (9 / 16);
  ctx.fillStyle = ACCENT;
  ctx.globalAlpha = 0.85;
  roundRect(ctx, -screenW / 2, -stripH / 2, screenW, stripH, r * 0.3);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** An arc with an arrowhead, curving the way the phone should be turned. */
function drawTurnArrow(ctx, cx, cy, radius) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = Math.max(3, radius * 0.055);
  ctx.lineCap = 'round';

  const from = Math.PI * 1.18;
  const to = Math.PI * 1.82;
  ctx.beginPath();
  ctx.arc(0, 0, radius, from, to);
  ctx.stroke();

  // Arrowhead on the leading end, tangent to the arc.
  const x = Math.cos(to) * radius;
  const y = Math.sin(to) * radius;
  const head = radius * 0.17;
  ctx.translate(x, y);
  ctx.rotate(to + Math.PI / 2);
  ctx.fillStyle = ACCENT;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-head * 0.62, -head);
  ctx.lineTo(head * 0.62, -head);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Local copy: this module draws in screen pixels, not design pixels. */
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
