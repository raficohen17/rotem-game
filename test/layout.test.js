import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { tabRow, SCREEN, TOUCH } from '../js/ui/widgets.js';
import { EXTRA_TABS } from '../js/scenes/room.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'assets/catalog.json'), 'utf8'));

/** Tabs in the room drawer: the extras, then one per catalog category. */
const DRAWER_TABS = EXTRA_TABS.length + catalog.categories.length;

test('every drawer tab is on the screen', () => {
  // The wall-decor tab was drawn 88px past the right edge and could not be
  // tapped, so pictures and windows were unreachable from inside the game.
  const row = tabRow(DRAWER_TABS);
  for (let i = 0; i < DRAWER_TABS; i += 1) {
    assert.ok(row.at(i) >= 0, `tab ${i} starts on screen`);
    assert.ok(row.at(i) + row.w <= SCREEN.w, `tab ${i} ends on screen`);
  }
});

test('tabs stay wide enough for a child to hit', () => {
  const row = tabRow(DRAWER_TABS);
  // Narrower than the row is tall would mean a sliver rather than a button.
  assert.ok(row.w >= row.h, `a tab is ${row.w}px wide and ${row.h}px tall`);
  assert.ok(row.h >= TOUCH * 0.75, 'and tall enough to aim at');
});

test('tabs do not overlap', () => {
  for (const count of [1, 4, 10, 13, 20]) {
    const row = tabRow(count);
    for (let i = 1; i < count; i += 1) {
      assert.ok(row.at(i) >= row.at(i - 1) + row.w, `${count} tabs: ${i} clears ${i - 1}`);
    }
  }
});

test('a short row does not stretch its tabs across the screen', () => {
  // Four tabs sharing the full width would each be 300px wide, which reads as
  // a row of panels rather than a row of tabs.
  const row = tabRow(4);
  assert.ok(row.w <= 110, `a tab is ${row.w}px wide`);
});

test('the row still fits if a category is added later', () => {
  const row = tabRow(DRAWER_TABS + 3);
  assert.ok(row.at(DRAWER_TABS + 2) + row.w <= SCREEN.w, 'three more tabs still fit');
});

test('no drawer tab id is claimed twice', () => {
  // The paint tab and the wall-decor category were both called "wall", so
  // opening the wall-decor drawer showed paint swatches and its five items —
  // window, picture, clock, wall shelf, door — could not be placed at all.
  const ids = [...EXTRA_TABS.map((t) => t.id), ...catalog.categories.map((c) => c.id)];
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(duplicates, [], 'each tab opens exactly one drawer');
});
