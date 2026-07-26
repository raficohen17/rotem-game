import test from 'node:test';
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
