/**
 * Nails, and the two manicures that arrive with a code.
 *
 * The interesting part is not that a character has another index on her: it is
 * that this is the first part small enough that where it is drawn, and where it
 * is chosen, both had to be decided rather than assumed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  NAIL_STYLES, PART_COUNTS, EDITABLE_PARTS, CLOTH_COLORS,
  createCharacterSpec, clampSpec,
} from '../js/model/character.js';
import { drawCharacter, handBounds, charHeight } from '../js/render/character.js';
import { LOCKED_PARTS, lockId, isLocked, redeem } from '../js/model/unlocks.js';
import { createWorld, repairWorld, placeCharacter } from '../js/model/world.js';
import { recordingContext } from './helpers/recorder.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * A canvas that counts what is painted and knows how big it is drawing.
 *
 * The recorder deliberately has no transform — it measures what ships, so the
 * size rules hand it everything. Checking that a nail disappears in the
 * cutaway needs a canvas that reports a scale, so this is that.
 */
function scaledCanvas(scale) {
  let fills = 0;
  const painted = [];
  let style = '';
  const ctx = {
    fills: () => fills,
    /** Every colour that was actually put on the canvas. */
    colours: () => painted,
    get fillStyle() { return style; },
    set fillStyle(value) { style = value; },
    getTransform: () => ({ a: scale, b: 0, c: 0, d: scale, e: 0, f: 0 }),
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, clip() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, ellipse() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, rect() {}, arcTo() {},
    fill() { fills += 1; painted.push(style); },
    stroke() {},
    fillRect() { fills += 1; painted.push(style); },
    strokeRect() {},
    fillText() {}, measureText: () => ({ width: 8 }), setLineDash() {}, drawImage() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  return ctx;
}

const bare = () => ({ ...createCharacterSpec(), nails: 0 });
const painted = (nails = 1, nailColor = 3) => ({ ...createCharacterSpec(), nails, nailColor });

/* ------------------------------------------------------------- the part */

test('nails are a part with a colour, like a top and its colour', () => {
  const part = EDITABLE_PARTS.find((p) => p.key === 'nails');
  assert.ok(part, 'nails are on the rail');
  assert.equal(part.colorKey, 'nailColor');
  assert.ok(PART_COUNTS.nails >= 6, 'the tab is worth opening');
  assert.ok(PART_COUNTS.nailColor >= 8, 'and there are colours to choose');
});

test('a new character has bare nails', () => {
  assert.equal(createCharacterSpec().nails, 0);
  assert.equal(NAIL_STYLES[0].id, 'bare');
  assert.equal(NAIL_STYLES[0].wide, undefined, 'nothing to draw at all');
});

test('somebody made before nails existed is drawn exactly as she was', () => {
  const old = { ...createCharacterSpec() };
  delete old.nails;
  delete old.nailColor;

  const before = recordingContext();
  drawCharacter(before.ctx, old, 1);
  const after = recordingContext();
  drawCharacter(after.ctx, bare(), 1);

  assert.equal(after.ops.length, before.ops.length, 'the same number of shapes');
});

test('nonsense comes back as bare nails', () => {
  assert.equal(clampSpec({ ...createCharacterSpec(), nails: 99 }).nails, 0);
  assert.equal(clampSpec({ ...createCharacterSpec(), nails: 'pink' }).nails, 0);
  assert.equal(clampSpec({ ...createCharacterSpec(), nailColor: -1 }).nailColor,
    createCharacterSpec().nailColor);
});

test('a manicure survives a save', () => {
  const world = createWorld('Home');
  world.characters.push(placeCharacter(painted(3, 7), 'bedroom', 300, 470));
  const back = repairWorld(JSON.parse(JSON.stringify(world))).characters[0];
  assert.equal(back.spec.nails, 3);
  assert.equal(back.spec.nailColor, 7);
});

test('painting her nails changes what is drawn', () => {
  const off = recordingContext();
  drawCharacter(off.ctx, bare(), 1);
  const on = recordingContext();
  drawCharacter(on.ctx, painted(), 1);
  assert.ok(on.ops.length > off.ops.length, 'there is more on the hands than there was');
});

test('every shape is a different shape', () => {
  // A tab of six options that look the same is a tab that does nothing, which
  // is why brows and lips are no longer on the rail.
  const shapes = NAIL_STYLES.slice(1).map((style) => {
    const recorder = recordingContext();
    drawCharacter(recorder.ctx, { ...createCharacterSpec(), nails: NAIL_STYLES.indexOf(style) }, 1);
    return JSON.stringify(recorder.ops.map((o) => [o.minX, o.minY, o.maxX, o.maxY]
      .map((n) => Number(n).toFixed(1))));
  });
  assert.equal(new Set(shapes).size, shapes.length, 'no two are drawn alike');
});

/* ------------------------------------------------------- the gel designs */

test('the two gel designs are the ones behind a code', () => {
  const locks = LOCKED_PARTS.filter((p) => p.key === 'nails');
  assert.equal(locks.length, 2, 'a French tip and a glitter ombré');
  for (const lock of locks) {
    assert.ok(lock.index < PART_COUNTS.nails, `${lock.name} is a real option`);
    assert.ok(NAIL_STYLES[lock.index].gel, 'and it is one of the gel designs');
    assert.equal(isLocked('nails', lock.index, []), true, 'locked until the code');
  }
});

test('the gel designs are appended, so nothing already saved moves', () => {
  const locks = LOCKED_PARTS.filter((p) => p.key === 'nails').map((l) => l.index).sort();
  assert.deepEqual(locks, [NAIL_STYLES.length - 2, NAIL_STYLES.length - 1]);
  assert.equal(NAIL_STYLES.slice(0, -2).every((s) => !s.gel), true,
    'and none of the free ones is a gel design');
});

test('a code opens its own design and not the other', () => {
  const [french, ombre] = LOCKED_PARTS.filter((p) => p.key === 'nails');
  const after = redeem(lockId('nails', french.index), 'cherry', []);
  assert.deepEqual(after, [lockId('nails', french.index)], 'the French tip is hers');
  assert.equal(isLocked('nails', ombre.index, after), true, 'the other one is not');
});

test('a gel design is painted over the colour she chose', () => {
  for (const lock of LOCKED_PARTS.filter((p) => p.key === 'nails')) {
    for (const color of [2, 9]) {
      const canvas = scaledCanvas(1.6);
      drawCharacter(canvas, painted(lock.index, color), 1);
      assert.ok(canvas.colours().includes(CLOTH_COLORS[color]),
        `${lock.name} is painted in the colour she chose`);
    }
  }
});

test('a gel design puts something of its own on top of that colour', () => {
  const [french] = LOCKED_PARTS.filter((p) => p.key === 'nails');
  const plain = scaledCanvas(1.6);
  drawCharacter(plain, painted(2, 3), 1);
  const gel = scaledCanvas(1.6);
  drawCharacter(gel, painted(french.index, 3), 1);
  assert.ok(gel.fills() > plain.fills(), 'there is a tip on it that a plain nail has not');
});

test('the colours are the ones her clothes use', () => {
  assert.equal(PART_COUNTS.nailColor, CLOTH_COLORS.length);
});

/* ------------------------------------------------------ where they show */

test('nails are drawn in a room and not in the cutaway', () => {
  const room = scaledCanvas(0.86);        // a room on the phone
  drawCharacter(room, painted(), 1);
  const cut = scaledCanvas(0.86 * 0.43);  // the same room in the cutaway
  drawCharacter(cut, painted(), 1);

  const bareRoom = scaledCanvas(0.86);
  drawCharacter(bareRoom, bare(), 1);
  const bareCut = scaledCanvas(0.86 * 0.43);
  drawCharacter(bareCut, bare(), 1);

  assert.ok(room.fills() > bareRoom.fills(), 'in a room her nails are painted');
  assert.equal(cut.fills(), bareCut.fills(), 'in the cutaway there is nothing to paint');
});

test('a hand can be framed, the way a head already can', () => {
  const hand = handBounds(createCharacterSpec());
  assert.ok(hand.size > 0, 'it has a size to frame');
  assert.ok(hand.x > 0, 'and a place, out at the end of an arm');
  assert.ok(hand.y < 0 && Math.abs(hand.y) < charHeight(createCharacterSpec()),
    'somewhere between her shoulder and her feet');

  const grown = handBounds({ ...createCharacterSpec(), size: 1 });
  assert.ok(grown.size > hand.size, 'a grown-up hand is framed as a grown-up hand');
});

test('the nails tab is framed on a hand rather than on a whole person', () => {
  // A cell showing a whole figure would be eight identical people.
  const source = readFileSync(join(ROOT, 'js/scenes/charcreator.js'), 'utf8');
  assert.match(source, /HAND_PARTS/, 'the creator knows which parts want a hand');
  assert.match(source, /crop === 'hand'/, 'and frames them on one');
});
