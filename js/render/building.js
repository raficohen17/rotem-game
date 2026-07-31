/**
 * A building seen from the street.
 *
 * Drawn into whatever box it is given, so the same function draws the three on
 * the street, the one being designed, and the picture on the shelf. Everything
 * is a fraction of the box: a building is not a fixed size, it is a shape.
 */

import { fillRR, fillPoly, fillCircle, fillEllipse, shade, roundRect } from './shapes.js';
import { litFill } from './materials.js';
import { frontLook } from '../model/front.js';

/** How much of the box the roof takes. */
const ROOF = 0.26;

/**
 * Draws a building front.
 *
 * @param {{x:number,y:number,w:number,h:number}} box the ground it stands on,
 *   y being the top of the box and y+h the pavement it sits on
 */
export function drawFront(ctx, building, box, options = {}) {
  const look = frontLook(building?.front);
  const bodyTop = box.y + box.h * ROOF;
  const bodyH = box.h - box.h * ROOF;

  ctx.save();
  // On the ground rather than floating over it.
  ctx.globalAlpha = 0.32;
  fillEllipse(ctx, box.x + box.w / 2, box.y + box.h + 4, box.w * 0.46, box.h * 0.026, '#000');
  ctx.globalAlpha = 1;
  ctx.restore();

  // Walls.
  ctx.fillStyle = litFill(ctx, bodyTop, bodyH, look.wall, 0.12);
  fillRR(ctx, box.x, bodyTop, box.w, bodyH, 6, ctx.fillStyle);

  drawRoofShape(ctx, look, box, bodyTop);
  drawWindows(ctx, look, box, bodyTop, bodyH);
  drawDoor(ctx, look, box, bodyTop, bodyH);
  if (building?.kind && building.kind !== 'house') drawSign(ctx, building, box, bodyTop);
  if (options.lit) drawLit(ctx, box, bodyTop, bodyH);
}

function drawRoofShape(ctx, look, box, bodyTop) {
  const roofH = box.h * ROOF;
  const top = box.y;
  const over = box.w * 0.05;
  const left = box.x - over;
  const right = box.x + box.w + over;
  const color = look.roof;
  ctx.fillStyle = litFill(ctx, top, roofH, color, 0.14);
  const paint = ctx.fillStyle;

  if (look.roofStyle === 'flat') {
    // A parapet, so a flat roof is a shape rather than a missing roof.
    fillRR(ctx, left, bodyTop - roofH * 0.42, right - left, roofH * 0.42, 4, paint);
    fillRR(ctx, left, bodyTop - roofH * 0.42, right - left, roofH * 0.12, 3, shade(color, 0.22));
    return;
  }
  if (look.roofStyle === 'hip') {
    fillPoly(ctx, [
      left, bodyTop, right, bodyTop,
      box.x + box.w * 0.72, top, box.x + box.w * 0.28, top,
    ], paint);
    return;
  }
  if (look.roofStyle === 'mansard') {
    fillPoly(ctx, [
      left, bodyTop, right, bodyTop,
      box.x + box.w * 0.86, top + roofH * 0.42, box.x + box.w * 0.14, top + roofH * 0.42,
    ], paint);
    fillRR(ctx, box.x + box.w * 0.14, top, box.w * 0.72, roofH * 0.44, 4, shade(color, 0.16));
    return;
  }
  // A gable: the ordinary one, and the one a child draws.
  fillPoly(ctx, [left, bodyTop, right, bodyTop, box.x + box.w / 2, top], paint);
}

function drawWindows(ctx, look, box, bodyTop, bodyH) {
  const w = box.w * 0.19;
  const h = bodyH * 0.2;
  const row = bodyTop + bodyH * 0.16;
  for (const cx of [box.x + box.w * 0.26, box.x + box.w * 0.74]) {
    drawWindow(ctx, look, cx - w / 2, row, w, h);
  }
  // A second window over the door, if the building is tall enough to hold one.
  drawWindow(ctx, look, box.x + box.w * 0.5 - w / 2, row, w, h);
}

function drawWindow(ctx, look, x, y, w, h) {
  const glass = '#cfe0e8';
  const frame = '#f6f1e8';

  if (look.window === 'round') {
    const r = Math.min(w, h) / 2;
    fillCircle(ctx, x + w / 2, y + h / 2, r + 3, frame);
    fillCircle(ctx, x + w / 2, y + h / 2, r, glass);
    return;
  }
  if (look.window === 'arch') {
    ctx.fillStyle = frame;
    ctx.beginPath();
    ctx.moveTo(x - 3, y + h + 3);
    ctx.lineTo(x - 3, y + h * 0.4);
    ctx.quadraticCurveTo(x + w / 2, y - 8, x + w + 3, y + h * 0.4);
    ctx.lineTo(x + w + 3, y + h + 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + h * 0.42);
    ctx.quadraticCurveTo(x + w / 2, y - 2, x + w, y + h * 0.42);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    return;
  }

  fillRR(ctx, x - 3, y - 3, w + 6, h + 6, 3, frame);
  fillRR(ctx, x, y, w, h, 2, glass);
  // Glazing bars: four panes, or two.
  ctx.fillStyle = frame;
  ctx.fillRect(x + w / 2 - 1.5, y, 3, h);
  if (look.window === 'four') ctx.fillRect(x, y + h / 2 - 1.5, w, 3);
}

function drawDoor(ctx, look, box, bodyTop, bodyH) {
  const w = box.w * 0.2;
  const h = bodyH * 0.42;
  const x = box.x + box.w / 2 - w / 2;
  const y = bodyTop + bodyH - h;

  fillRR(ctx, x - 4, y - 4, w + 8, h + 4, 4, '#f6f1e8');
  ctx.fillStyle = litFill(ctx, y, h, look.door, 0.16);
  fillRR(ctx, x, y, w, h, 3, ctx.fillStyle);
  fillCircle(ctx, x + w * 0.8, y + h * 0.55, Math.max(2.4, w * 0.06), '#f0d9a0');
  // A step, so the door meets the pavement rather than hanging over it.
  fillRR(ctx, x - w * 0.2, bodyTop + bodyH - 4, w * 1.4, 8, 3, '#c9c2b6');
}

/**
 * The sign over the door.
 *
 * Only on a building that is not a house: a school has to say so from the
 * street, and a home does not need a label.
 */
function drawSign(ctx, building, box, bodyTop) {
  const w = box.w * 0.62;
  // Deep enough for a name that can be read on the phone: at 9% of the box the
  // lettering came out under 10px on a Pixel, which is a sign nobody can read
  // from the street.
  const h = box.h * 0.13;
  const x = box.x + box.w / 2 - w / 2;
  const y = bodyTop + box.h * 0.03;

  fillRR(ctx, x, y, w, h, 4, '#3c3540');
  fillRR(ctx, x + 3, y + 3, w - 6, h - 6, 3, '#f2e6cd');

  ctx.fillStyle = '#3c3540';
  ctx.font = `700 ${Math.round(h * 0.58)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(building.name, box.x + box.w / 2, y + h / 2 + 1);
}

/** Warm light in the windows, for a building somebody is inside. */
function drawLit(ctx, box, bodyTop, bodyH) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  const w = box.w * 0.19;
  const h = bodyH * 0.2;
  const row = bodyTop + bodyH * 0.16;
  for (const cx of [box.x + box.w * 0.26, box.x + box.w * 0.5, box.x + box.w * 0.74]) {
    fillRR(ctx, cx - w / 2, row, w, h, 2, '#f0c86a');
  }
  ctx.restore();
}

/** An empty plot: a fence, a patch of ground, and room for something. */
export function drawPlot(ctx, box) {
  ctx.save();
  fillRR(ctx, box.x, box.y + box.h * 0.55, box.w, box.h * 0.45, 8, '#3a3340');
  ctx.strokeStyle = '#5b5266';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 12]);
  ctx.beginPath();
  roundRect(ctx, box.x + 6, box.y + box.h * 0.55 + 6, box.w - 12, box.h * 0.45 - 12, 6);
  ctx.stroke();
  ctx.restore();
}

/**
 * The picture of a world for the shelf: its street, not one of its houses.
 *
 * A world is a street now, and a thumbnail showing only the first building
 * would say the same thing about two worlds that look nothing alike.
 */
export function renderStreetThumbnail(world, width = 240) {
  const height = Math.round(width * 0.56);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width);
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const ground = height * 0.76;
  const sky = ctx.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, '#2b3550');
  sky.addColorStop(1, '#5c6d84');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, ground);
  ctx.fillStyle = '#b9b2a6';
  ctx.fillRect(0, ground, width, height * 0.1);
  ctx.fillStyle = '#4a4650';
  ctx.fillRect(0, ground + height * 0.1, width, height);

  const plots = world.buildings?.length ?? 0;
  const slot = width / 3;
  for (let i = 0; i < plots && i < 3; i += 1) {
    const box = { x: i * slot + slot * 0.08, y: height * 0.14, w: slot * 0.84, h: ground - height * 0.14 };
    drawFront(ctx, world.buildings[i], box);
  }

  return canvas.toDataURL('image/jpeg', 0.68);
}
