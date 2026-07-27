import test from 'node:test';
import { lookGrid } from '../js/scenes/charcreator.js';
import { LOOKS } from '../js/model/character.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { tabRow, onScreen, screenScale, PHONE, SCREEN, TOUCH } from '../js/ui/widgets.js';
import { EXTRA_TABS } from '../js/scenes/room.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'assets/catalog.json'), 'utf8'));

/**
 * What a control has to measure on the phone itself.
 *
 * Android asks for 48dp and these are for a six-year-old, but the design space
 * is 720 tall against the phone's 412 and some of these rows are set by how
 * many things have to fit. 40 is the floor that everything clears; text is
 * held to 11, below which the drawer labels stop being readable at arm's
 * length.
 */
const MIN_TAP = 40;
const MIN_TEXT = 11;

const DRAWER_TABS = EXTRA_TABS.length + catalog.categories.length;

test('the phone really is smaller than the design space', () => {
  // If this ever stops holding, every number below is measuring nothing.
  assert.ok(screenScale(PHONE) < 1, 'design pixels shrink on the way to the phone');
  assert.equal(Math.min(PHONE.w / SCREEN.w, PHONE.h / SCREEN.h), screenScale(PHONE));
});

test('a pinned button is big enough to hit on the phone', () => {
  assert.ok(onScreen(TOUCH) >= MIN_TAP, `${onScreen(TOUCH).toFixed(1)}px`);
});

test('the floating selection buttons are big enough to hit', () => {
  // These are the ones tapped most — grow, shrink, flip — and they were 33px.
  const pip = pipSize();
  assert.ok(onScreen(pip) >= MIN_TAP, `${onScreen(pip).toFixed(1)}px`);
});

test('a drawer tab is big enough to hit and its label big enough to read', () => {
  const row = tabRow(DRAWER_TABS);
  assert.ok(onScreen(row.h) >= MIN_TAP, `tab is ${onScreen(row.h).toFixed(1)}px tall`);
  assert.ok(onScreen(row.w) >= MIN_TAP, `tab is ${onScreen(row.w).toFixed(1)}px wide`);
  assert.ok(onScreen(tabFontSize()) >= MIN_TEXT, `label is ${onScreen(tabFontSize()).toFixed(1)}px`);
});

test('the longest drawer label still fits inside its tab', () => {
  // There is no canvas here to measure with. Measuring these ten labels in the
  // browser at 20px semibold system-ui put the widest character average at
  // 0.581em ("Beds"), so 0.6 estimates high for every one of them. The label
  // is centred, so overflow shows up as letters leaving the tab on both sides.
  const row = tabRow(DRAWER_TABS);
  const longest = Math.max(...catalog.categories.map((c) => c.label.length));
  const estimated = longest * tabFontSize() * 0.6;
  assert.ok(estimated <= row.w, `${longest} chars needs about ${Math.round(estimated)}px of ${Math.round(row.w)}`);
});

test('the creator rail fits on the screen at a hittable size', () => {
  const tab = creatorRail();
  const rows = Math.ceil(creatorTabCount() / tab.cols);
  const bottom = tab.y + (rows - 1) * tab.step + tab.size;

  assert.ok(bottom <= SCREEN.h, `the rail ends at ${bottom} of ${SCREEN.h}`);
  assert.ok(onScreen(tab.size) >= MIN_TAP, `a rail icon is ${onScreen(tab.size).toFixed(1)}px`);
});

test('the drawer panel does not cover the room it belongs to', () => {
  const { panelTop, roomBottom } = drawerGeometry();
  assert.ok(roomBottom <= panelTop, `the room ends at ${roomBottom}, the panel starts at ${panelTop}`);
});

test('the drawer cells sit between the tabs and the bottom edge', () => {
  const row = tabRow(DRAWER_TABS);
  const cell = drawerCell();
  assert.ok(cell.y >= row.y + row.h, 'cells clear the tabs');
  assert.ok(cell.y + cell.h <= SCREEN.h, `cells end at ${cell.y + cell.h} of ${SCREEN.h}`);
});

/* Read straight out of the scenes, so the test measures what actually ships. */

const roomSource = readFileSync(join(ROOT, 'js/scenes/room.js'), 'utf8');
const creatorSource = readFileSync(join(ROOT, 'js/scenes/charcreator.js'), 'utf8');

const number = (source, pattern, label) => {
  const match = source.match(pattern);
  assert.ok(match, `found ${label}`);
  return Number(match[1]);
};

const pipSize = () => number(roomSource, /const PIP = (\d+)/, 'PIP');
const tabFontSize = () => number(roomSource, /ctx\.font = '600 (\d+)px system-ui[^']*';\n\s*ctx\.textAlign/, 'the tab label font');

function drawerCell() {
  const match = roomSource.match(/const CELL = \{ y: (\d+), w: \d+, h: (\d+)/);
  assert.ok(match, 'found the drawer cell');
  return { y: Number(match[1]), h: Number(match[2]) };
}

function drawerGeometry() {
  const panelTop = number(roomSource, /const PANEL_TOP = (\d+)/, 'PANEL_TOP');
  const open = roomSource.match(/\{ x: \d+, y: (\d+), s: ([\d.]+) \}/);
  assert.ok(open, 'found the drawer-open transform');
  const roomHeight = number(roomSource.replace(/[\s\S]*/, ''), /^$/, 'x') || 520;
  return { panelTop, roomBottom: Number(open[1]) + roomHeight * Number(open[2]) };
}

function creatorRail() {
  const match = creatorSource.match(
    /const TAB = \{ x: \d+, y: (\d+), size: (\d+), step: (\d+), cols: (\d+) \}/,
  );
  assert.ok(match, 'found the creator rail');
  return {
    y: Number(match[1]), size: Number(match[2]), step: Number(match[3]), cols: Number(match[4]),
  };
}

function creatorTabCount() {
  // The looks gallery, then one tab per editable part.
  const parts = readFileSync(join(ROOT, 'js/model/character.js'), 'utf8')
    .match(/export const EDITABLE_PARTS = \[([\s\S]*?)\];/);
  assert.ok(parts, 'found EDITABLE_PARTS');
  return 1 + (parts[1].match(/key:/g) ?? []).length;
}

/* ------------------------------------------------------- the other scenes */

const menuSource = readFileSync(join(ROOT, 'js/scenes/menu.js'), 'utf8');
const designerSource = readFileSync(join(ROOT, 'js/scenes/bookdesigner.js'), 'utf8');
const houseSource = readFileSync(join(ROOT, 'js/scenes/house.js'), 'utf8');

test('the delete button on a house is big enough to hit', () => {
  const trash = number(menuSource, /const TRASH = (\d+)/, 'TRASH');
  assert.ok(onScreen(trash) >= MIN_TAP, `${onScreen(trash).toFixed(1)}px`);
});

test('the delete button does not spill into the next house along', () => {
  // It straddles the corner to stay off the slot, so the gap is what stops it
  // landing on a neighbour — deleting the wrong house is the worst misfire in
  // the game, and it is the one action that cannot be undone.
  const slotW = number(menuSource, /const SLOT_W = (\d+)/, 'SLOT_W');
  const gap = number(menuSource, /const GAP_X = (\d+)/, 'GAP_X');
  const trash = number(menuSource, /const TRASH = (\d+)/, 'TRASH');
  const inset = number(menuSource, /box\.x \+ box\.w - (\d+), box\.y/, 'the trash inset');

  const overhang = trash - inset;
  assert.ok(overhang <= gap, `it reaches ${overhang}px past the slot into a ${gap}px gap`);
  assert.ok(inset < slotW, 'and still starts inside its own slot');
});

test('the house names stay clear of the row below', () => {
  const rows = menuSource.match(/const ROW_Y = \[(\d+), (\d+)\]/);
  assert.ok(rows, 'found the row positions');
  const slotH = number(menuSource, /const SLOT_H = (\d+)/, 'SLOT_H');
  const trash = number(menuSource, /const TRASH = (\d+)/, 'TRASH');
  const lift = number(menuSource, /box\.y - (\d+), TRASH/, 'the trash lift');

  const firstRowBottom = Number(rows[1]) + slotH;
  assert.ok(Number(rows[2]) - lift >= firstRowBottom,
    `the second row's delete buttons start at ${Number(rows[2]) - lift}, the first row ends at ${firstRowBottom}`);
});

test('every book-designer control is big enough to hit', () => {
  const row = designerRow();
  assert.ok(onScreen(row.size) >= MIN_TAP, `a colour swatch is ${onScreen(row.size).toFixed(1)}px`);

  for (const [what, size] of Object.entries(designerControls())) {
    assert.ok(onScreen(size) >= MIN_TAP, `${what} is ${onScreen(size).toFixed(1)}px`);
  }
});

test('the book-designer section labels are big enough to read', () => {
  const font = number(designerSource, /ctx\.font = '600 (\d+)px system-ui[^']*';\n\s*ctx\.textAlign = 'left'/, 'the label font');
  assert.ok(onScreen(font) >= MIN_TEXT, `${onScreen(font).toFixed(1)}px`);
});

test('the book designer fits inside its panel', () => {
  // Five rows of controls in a fixed panel: one row growing without the rest
  // moving down is how they end up overlapping.
  const panel = designerPanel();
  const row = designerRow();
  const rows = [...designerSource.matchAll(/PANEL\.y \+ (\d+), (?:ROW\.size|\d+), (?:ROW\.size|\d+)/g)]
    .map((m) => Number(m[1]));
  assert.ok(rows.length >= 5, `found ${rows.length} control rows`);

  const lowest = Math.max(...rows);
  assert.ok(lowest + row.size <= panel.h,
    `the last row ends at ${lowest + row.size} inside a panel ${panel.h} tall`);
  assert.ok(panel.x + panel.w <= SCREEN.w, 'the panel is on the screen');
});

test('the book-designer swatch rows fit across the panel', () => {
  const row = designerRow();
  const panel = designerPanel();
  const colors = 10; // COVER_COLORS
  const right = row.x + (colors - 1) * row.step + row.size;
  assert.ok(right <= panel.x + panel.w, `the row ends at ${right} of ${panel.x + panel.w}`);
  assert.ok(row.step >= row.size, 'swatches do not overlap each other');
});

test('the house view needs no small targets at all', () => {
  // Four rooms and a home button. If a control ever appears here that is not
  // one of those, it has to clear the bar like everything else.
  const sized = [...houseSource.matchAll(/button\('[^']+',\s*[\d.]+,\s*[\d.]+,\s*(TOUCH|\d+),\s*(TOUCH|\d+)/g)];
  assert.ok(sized.length > 0, 'found the house buttons');
  for (const [, w, h] of sized) {
    for (const dimension of [w, h]) {
      const size = dimension === 'TOUCH' ? TOUCH : Number(dimension);
      assert.ok(onScreen(size) >= MIN_TAP, `a house button is ${onScreen(size).toFixed(1)}px`);
    }
  }
});

function designerRow() {
  const match = designerSource.match(/const ROW = \{ x: (\d+), step: (\d+), size: (\d+) \}/);
  assert.ok(match, 'found the designer row');
  return { x: Number(match[1]), step: Number(match[2]), size: Number(match[3]) };
}

function designerPanel() {
  const match = designerSource.match(/const PANEL = \{ x: (\d+), y: (\d+), w: (\d+), h: (\d+) \}/);
  assert.ok(match, 'found the designer panel');
  return {
    x: Number(match[1]), y: Number(match[2]), w: Number(match[3]), h: Number(match[4]),
  };
}

/** The controls in the designer that are not plain colour swatches. */
function designerControls() {
  const pattern = designerSource.match(/`pattern:\$\{i\}`[^)]*?, (\d+), (\d+),/);
  const style = designerSource.match(/`style:\$\{i\}`[^)]*?, (\d+), (ROW\.size|\d+),/);
  assert.ok(pattern && style, 'found the pattern chips and title styles');
  return {
    'a pattern chip': Math.min(Number(pattern[1]), Number(pattern[2])),
    'a title style button': style[2] === 'ROW.size' ? designerRow().size : Number(style[2]),
  };
}

/* ------------------------------------------------------------- the looks */

test('the looks grid fits however many looks there are', () => {
  // Fixed at three per row on a 230px step, the seventh look started a row
  // that ran to y=802 on a 720-tall canvas — three outfits drawn off screen.
  for (const count of [3, 6, 9, 12, 15]) {
    const grid = lookGrid(count);
    const last = count - 1;
    const right = grid.x + (last % grid.cols) * grid.stepX + grid.w;
    const bottom = grid.y + Math.floor(last / grid.cols) * grid.stepY + grid.h;
    assert.ok(right <= SCREEN.w, `${count} looks: the last card ends at x=${Math.round(right)}`);
    assert.ok(bottom <= SCREEN.h, `${count} looks: the last card ends at y=${Math.round(bottom)}`);
  }
});

test('a look card stays big enough to tap and to see', () => {
  const grid = lookGrid(LOOKS.length);
  assert.ok(onScreen(grid.w) >= MIN_TAP, `a card is ${onScreen(grid.w).toFixed(1)}px wide`);
  assert.ok(onScreen(grid.h) >= MIN_TAP, `a card is ${onScreen(grid.h).toFixed(1)}px tall`);
});

test('look cards do not overlap', () => {
  const grid = lookGrid(LOOKS.length);
  assert.ok(grid.stepX >= grid.w, 'columns are clear of each other');
  assert.ok(grid.stepY >= grid.h, 'rows are clear of each other');
});
