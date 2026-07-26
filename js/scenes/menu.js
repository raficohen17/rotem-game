/**
 * The shelf of worlds.
 *
 * Ten slots, always all ten drawn, so "how many can I have" is answered by
 * looking rather than by hitting a limit. A filled slot shows a picture of the
 * house; an empty one shows a plus.
 */

import { button, hitTest, drawButtons, drawButton, drawPanel, drawTitle, createConfirm, COLORS, TOUCH } from '../ui/widgets.js';
import { drawIcon } from '../ui/icons.js';
import { fillRR } from '../render/shapes.js';
import { MAX_WORLDS, addWorld, removeWorld } from '../model/storage.js';
import { createWorld } from '../model/world.js';

const COLS = 5;
const SLOT_W = 220;
const SLOT_H = 212;
const GAP_X = 20;
const ORIGIN_X = 40;
const ROW_Y = [126, 366];

/** Decoded thumbnails, keyed by world id, so they are not re-parsed each frame. */
const thumbCache = new Map();

function thumbnailFor(world) {
  if (!world.thumb) return null;
  const cached = thumbCache.get(world.id);
  if (cached && cached.src === world.thumb) return cached.image;

  const image = new Image();
  image.src = world.thumb;
  thumbCache.set(world.id, { src: world.thumb, image });
  return image;
}

export function createMenu(game) {
  let confirm = null;

  function slotBox(index) {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    return {
      x: ORIGIN_X + col * (SLOT_W + GAP_X),
      y: ROW_Y[row],
      w: SLOT_W,
      h: SLOT_H,
    };
  }

  function buildControls() {
    const controls = [];
    for (let i = 0; i < MAX_WORLDS; i += 1) {
      const box = slotBox(i);
      const world = game.worlds[i];
      controls.push(button(world ? `open:${i}` : `new:${i}`, box.x, box.y, box.w, box.h, { world }));
      if (world) {
        controls.push(button(`delete:${i}`, box.x + box.w - 56, box.y - 6, 56, 56, {
          icon: 'trash', tone: 'danger', iconScale: 0.8,
        }));
      }
    }
    return controls;
  }

  function openWorld(world) {
    game.openWorld(world);
  }

  function createNew() {
    const world = createWorld(`House ${game.worlds.length + 1}`);
    world.createdAt = Date.now();
    game.worlds = addWorld(game.worlds, world);
    game.persist();
    openWorld(world);
  }

  return {
    controls: buildControls(),

    enter() {
      this.controls = buildControls();
    },

    onTap(x, y) {
      if (confirm) {
        confirm.onTap(x, y);
        return;
      }

      const hit = hitTest(this.controls, x, y);
      if (!hit) return;
      const [action, indexText] = hit.id.split(':');
      const index = Number(indexText);

      if (action === 'new') {
        createNew();
      } else if (action === 'open') {
        openWorld(game.worlds[index]);
      } else if (action === 'delete') {
        const doomed = game.worlds[index];
        confirm = createConfirm('Delete this house?', () => {
          game.worlds = removeWorld(game.worlds, doomed.id);
          thumbCache.delete(doomed.id);
          game.persist();
          this.controls = buildControls();
          confirm = null;
        }, () => { confirm = null; });
      }
    },

    draw(ctx) {
      ctx.fillStyle = COLORS.backdrop;
      ctx.fillRect(0, 0, 1280, 720);

      drawTitle(ctx, "Rotem's World", 40, 74, 40);

      for (let i = 0; i < MAX_WORLDS; i += 1) {
        drawSlot(ctx, slotBox(i), game.worlds[i]);
      }

      // Only says the shelf is full at the moment it actually is.
      if (game.worlds.length >= MAX_WORLDS) {
        ctx.fillStyle = COLORS.inkDim;
        ctx.font = '600 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Ten houses is the most. Delete one to make a new one.', 640, 640);
      }

      drawButtons(ctx, this.controls.filter((c) => c.icon));
      if (confirm) confirm.draw(ctx);
    },
  };
}

function drawSlot(ctx, box, world) {
  if (!world) {
    fillRR(ctx, box.x, box.y, box.w, box.h, 20, '#2c262e');
    ctx.save();
    ctx.strokeStyle = '#544a54';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 10]);
    ctx.strokeRect(box.x + 6, box.y + 6, box.w - 12, box.h - 12);
    ctx.restore();
    drawIcon(ctx, 'plus', box.x + box.w / 2, box.y + box.h / 2, '#7d7078', 1.6);
    return;
  }

  drawPanel(ctx, box.x, box.y, box.w, box.h, COLORS.panel, 20);

  const image = thumbnailFor(world);
  const inner = { x: box.x + 10, y: box.y + 10, w: box.w - 20, h: box.h - 58 };
  fillRR(ctx, inner.x, inner.y, inner.w, inner.h, 12, '#1e1a20');

  if (image?.complete && image.naturalWidth > 0) {
    // Fitted rather than stretched — a squashed house is hard to recognise,
    // which is the one job the thumbnail has.
    const fit = Math.min(inner.w / image.naturalWidth, inner.h / image.naturalHeight);
    const w = image.naturalWidth * fit;
    const h = image.naturalHeight * fit;
    ctx.save();
    ctx.beginPath();
    ctx.rect(inner.x, inner.y, inner.w, inner.h);
    ctx.clip();
    ctx.drawImage(image, inner.x + (inner.w - w) / 2, inner.y + (inner.h - h) / 2, w, h);
    ctx.restore();
  } else {
    drawIcon(ctx, 'home', inner.x + inner.w / 2, inner.y + inner.h / 2, '#544a54', 1.4);
  }

  ctx.fillStyle = COLORS.ink;
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(world.name, box.x + box.w / 2, box.y + box.h - 26);
}
