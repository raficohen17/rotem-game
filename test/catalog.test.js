import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { PLACEHOLDERS } from '../js/render/placeholders.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'assets/catalog.json'), 'utf8'));
const DRAWINGS = join(ROOT, 'assets/drawings');

test('every item id is unique', () => {
  const ids = catalog.items.map((item) => item.id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(duplicates, [], 'no id appears twice');
});

test('every item has a size and a category that exists', () => {
  const categories = new Set(catalog.categories.map((c) => c.id));
  for (const item of catalog.items) {
    assert.ok(categories.has(item.cat), `${item.id} is in a real category`);
    assert.ok(item.w > 0 && item.h > 0, `${item.id} has a size`);
    assert.ok(Array.isArray(item.colors) && item.colors.length > 0, `${item.id} has colours`);
    for (const color of item.colors) {
      assert.match(color, /^#[0-9a-f]{6}$/i, `${item.id} colour ${color} is hex`);
    }
  }
});

test('every category holds at least one item', () => {
  for (const category of catalog.categories) {
    const count = catalog.items.filter((item) => item.cat === category.id).length;
    assert.ok(count > 0, `${category.id} is not an empty tab`);
  }
});

test('every item can be drawn — by a drawing, or by a placeholder', () => {
  // This is what keeps a typo in an id from producing an invisible item: with
  // no PNG and no placeholder under that name, nothing would render at all.
  for (const item of catalog.items) {
    const hasDrawing = existsSync(join(DRAWINGS, `${item.id}.png`));
    const hasPlaceholder = typeof PLACEHOLDERS[item.id] === 'function';
    assert.ok(hasDrawing || hasPlaceholder, `${item.id} has art`);
  }
});

test('no drawing sits in the folder without a catalog entry to use it', () => {
  if (!existsSync(DRAWINGS)) return;
  const ids = new Set(catalog.items.map((item) => item.id));

  for (const file of readdirSync(DRAWINGS)) {
    if (!file.endsWith('.png')) continue;
    const id = file.replace(/\.png$/, '');
    assert.ok(ids.has(id), `${file} matches a catalog id (otherwise it never loads)`);
  }
});

test('the drawings manifest matches the files on disk', () => {
  // The game only loads drawings the manifest lists, so a file missing from it
  // is a drawing Rotem made that silently never appears.
  const indexPath = join(DRAWINGS, 'index.json');
  if (!existsSync(indexPath)) return;

  const listed = new Set(JSON.parse(readFileSync(indexPath, 'utf8')).drawings);
  const onDisk = new Set(
    readdirSync(DRAWINGS).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, '')),
  );

  for (const id of listed) assert.ok(onDisk.has(id), `${id} is listed but has no PNG`);
  for (const id of onDisk) assert.ok(listed.has(id), `${id}.png exists but is not listed`);
});

test('surface is either the floor or the wall', () => {
  for (const item of catalog.items) {
    if (item.surface === undefined) continue;
    assert.ok(['floor', 'wall'].includes(item.surface), `${item.id} surface is valid`);
  }
});

test('no placeholder is left behind with no catalog entry', () => {
  const ids = new Set(catalog.items.map((item) => item.id));
  for (const id of Object.keys(PLACEHOLDERS)) {
    assert.ok(ids.has(id), `placeholder ${id} is still in the catalog`);
  }
});
