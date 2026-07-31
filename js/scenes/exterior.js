/**
 * Designing the outside of a building.
 *
 * The inside has had a designer since the beginning — ten wall colours, six
 * floors. Outside, every building on the street was the same cream house with
 * the same red roof, which is the first thing she sees every time she opens a
 * world.
 *
 * Built like the book designer: the thing itself down one side at the size it
 * is really seen, the choices down the other, and every choice showing its own
 * effect rather than a word for it.
 */

import {
  button, hitTest, drawButtons, drawPanel, COLORS, TOUCH,
} from '../ui/widgets.js';
import { fillRR, roundRect } from '../render/shapes.js';
import { drawFront, drawWindowSample } from '../render/building.js';
import {
  FRONT_WALLS, FRONT_ROOFS, ROOF_STYLES, DOOR_COLORS, WINDOW_STYLES, clampFront,
} from '../model/front.js';
import { BUILDING_KINDS, MAX_BUILDING_NAME, cleanBuildingName } from '../model/world.js';

/** The building, drawn the size it is on the street. */
const PREVIEW = { x: 48, y: 116, w: 340, h: 400 };

const PANEL = { x: 412, y: 96, w: 844, h: 576 };

/** A row of swatches: ten of them, each big enough for a finger. */
const ROW = { x: 440, step: 80, size: 72 };

/**
 * The input that brings up the keyboard.
 *
 * Off screen rather than hidden, because something displayed as none cannot
 * take focus and so never opens the keyboard at all. The same trick the book
 * designer uses to name a book.
 */
function createNameInput(initial, onChange) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = initial;
  input.maxLength = MAX_BUILDING_NAME;
  input.autocapitalize = 'words';
  input.setAttribute('aria-label', 'Building name');
  Object.assign(input.style, {
    position: 'fixed', left: '-9999px', top: '0', opacity: '0', width: '1px', height: '1px',
  });
  input.addEventListener('input', () => onChange(cleanBuildingName(input.value)));
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter') input.blur(); });
  document.body.appendChild(input);
  return input;
}

/**
 * @param {object} building the one being designed — edited in place, so what
 *   she sees on the street is what she is looking at here
 */
export function createExterior(game, building, onDone) {
  building.front = clampFront(building.front);
  let typing = false;

  const input = createNameInput(building.name, (value) => {
    // An empty name would leave a school with a blank sign, so the old one
    // stands until she types something.
    building.name = value || building.name;
    game.persist();
  });

  const change = (field, value) => {
    building[field] = value;
    game.persist();
  };
  const setFront = (field, value) => {
    building.front = { ...building.front, [field]: value };
    game.persist();
  };

  const walls = () => FRONT_WALLS.map((color, i) => button(
    `wall:${i}`, ROW.x + i * ROW.step, PANEL.y + 40, ROW.size, ROW.size,
    { swatch: color, active: building.front.wall === i },
  ));

  const roofs = () => FRONT_ROOFS.map((color, i) => button(
    `roof:${i}`, ROW.x + i * ROW.step, PANEL.y + 148, ROW.size, ROW.size,
    { swatch: color, active: building.front.roof === i },
  ));

  const shapes = () => ROOF_STYLES.map((name, i) => button(
    `roofStyle:${i}`, ROW.x + i * 110, PANEL.y + 256, 100, 84,
    { shape: i, active: building.front.roofStyle === i },
  ));

  const doors = () => DOOR_COLORS.map((color, i) => button(
    `door:${i}`, ROW.x + i * ROW.step, PANEL.y + 368, ROW.size, ROW.size,
    { swatch: color, active: building.front.door === i },
  ));

  const windows = () => WINDOW_STYLES.map((name, i) => button(
    `window:${i}`, ROW.x + i * 110, PANEL.y + 466, 100, 84,
    { pane: i, active: building.front.window === i },
  ));

  const kinds = () => BUILDING_KINDS.map((kind, i) => button(
    `kind:${kind}`, PREVIEW.x + i * 116, PREVIEW.y + PREVIEW.h + 96, 108, TOUCH,
    { icon: KIND_ICON[kind], active: building.kind === kind },
  ));

  const nameField = () => button('name', PREVIEW.x, PREVIEW.y + PREVIEW.h + 16,
    PREVIEW.w, TOUCH, {});

  const done = button('done', 1178, 20, TOUCH, TOUCH, { icon: 'check', tone: 'good' });

  const controls = () => [
    ...walls(), ...roofs(), ...shapes(), ...doors(), ...windows(),
    ...kinds(), nameField(), done,
  ];

  return {
    allControls: controls,

    onTap(x, y) {
      const hit = hitTest(controls(), x, y);
      if (!hit) { input.blur(); typing = false; return; }

      if (hit.id === 'done') { input.remove(); onDone(); return; }
      if (hit.id === 'name') {
        typing = true;
        input.value = building.name;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        return;
      }

      const [field, value] = hit.id.split(':');
      if (field === 'kind') {
        change('kind', value);
        // A building she has not named yet takes the name of what it is for.
        // One she has named keeps it: a school called Rotem is her school.
        if (DEFAULT_NAME.test(building.name)) change('name', KIND_NAME[value]);
        return;
      }
      setFront(field, Number(value));
    },

    draw(ctx) {
      ctx.fillStyle = COLORS.backdrop;
      ctx.fillRect(0, 0, 1280, 720);

      // The building itself, on a strip of pavement so it is standing on
      // something rather than floating in a panel.
      drawPanel(ctx, PREVIEW.x - 16, PREVIEW.y - 16, PREVIEW.w + 32, PREVIEW.h + 48, '#2c262e', 22);
      fillRR(ctx, PREVIEW.x - 8, PREVIEW.y + PREVIEW.h, PREVIEW.w + 16, 22, 6, '#b9b2a6');
      drawFront(ctx, building, PREVIEW);

      drawNameField(ctx, nameField(), building.name, typing, game.time);

      drawPanel(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, COLORS.panel, 22);
      label(ctx, 'Walls', ROW.x, PANEL.y + 32);
      label(ctx, 'Roof', ROW.x, PANEL.y + 140);
      label(ctx, 'Roof shape', ROW.x, PANEL.y + 248);
      label(ctx, 'Door', ROW.x, PANEL.y + 360);
      label(ctx, 'Windows', ROW.x, PANEL.y + 458);

      for (const control of shapes()) drawRoofChip(ctx, control, building);
      for (const control of windows()) drawWindowChip(ctx, control, building);
      drawButtons(ctx, [...walls(), ...roofs(), ...doors(), ...kinds(), done]);
    },
  };
}

const KIND_ICON = { house: 'home', school: 'book', shop: 'shop' };

/** What each kind is called before she calls it something else. */
const KIND_NAME = { house: 'House', school: 'School', shop: 'Shop' };

/** A name the game gave it, rather than one she chose. */
const DEFAULT_NAME = /^(House|School|Shop)( \d+)?$/;

function label(ctx, text, x, y) {
  ctx.fillStyle = COLORS.inkDim;
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

/** The tray every chip is drawn on, so they read as one row of choices. */
function chipTray(ctx, control) {
  fillRR(ctx, control.x, control.y, control.w, control.h, 12,
    control.active ? COLORS.buttonActive : '#413945');
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, control.x + 5, control.y + 5, control.w - 10, control.h - 10, 8);
  ctx.clip();
}

/**
 * A roof-shape chip: the roof, close up.
 *
 * A word means nothing to a child still learning to read, and the whole
 * building shrunk into a chip made a gable, a hip and a mansard about fifteen
 * pixels tall each — three chips that looked the same. The building is drawn
 * twice the size of the chip and cropped to its top, so what the chip shows is
 * the one thing it is about.
 */
function drawRoofChip(ctx, control, building) {
  chipTray(ctx, control);
  drawFront(ctx, {
    ...building,
    kind: 'house',
    front: { ...building.front, roofStyle: control.shape },
  }, {
    x: control.x - control.w * 0.34,
    y: control.y + 8,
    w: control.w * 1.68,
    h: control.h * 2.1,
  });
  ctx.restore();
}

/** A window chip: one window, at a size where the panes are panes. */
function drawWindowChip(ctx, control, building) {
  chipTray(ctx, control);
  drawWindowSample(ctx, { ...building.front, window: control.pane },
    { x: control.x + 8, y: control.y + 8, w: control.w - 16, h: control.h - 16 });
  ctx.restore();
}

/** The name, shown as a field she can tap to type into. */
function drawNameField(ctx, box, name, typing, time) {
  fillRR(ctx, box.x, box.y, box.w, box.h, 14, typing ? '#3d3543' : '#2c262e');
  ctx.strokeStyle = typing ? COLORS.buttonActive : '#4a4048';
  ctx.lineWidth = 3;
  roundRect(ctx, box.x, box.y, box.w, box.h, 14);
  ctx.stroke();

  ctx.fillStyle = name ? COLORS.ink : COLORS.inkDim;
  ctx.font = '600 26px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(name || 'Tap to name it', box.x + 18, box.y + box.h / 2);

  if (typing && Math.floor(time * 2) % 2 === 0) {
    const width = ctx.measureText(name).width;
    ctx.fillStyle = COLORS.buttonActive;
    ctx.fillRect(box.x + 20 + width, box.y + 12, 3, box.h - 24);
  }
}
