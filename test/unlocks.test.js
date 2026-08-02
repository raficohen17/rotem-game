import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  sha256, lockId, hashFor, cleanCode, isLocked, lockFor, redeem, cleanUnlocks,
  LOCKED_PARTS, CODE_LENGTH,
} from '../js/model/unlocks.js';
import { createUnlockStore, UNLOCKS_KEY } from '../js/model/storage.js';
import { PART_COUNTS } from '../js/model/character.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The two codes, in the clear.
 *
 * They have to be somewhere for a test to prove the right one works, and a
 * test file is the honest place: it is not served to the browser, and this is
 * a present for a seven year old rather than a secret. `codes never appear in
 * anything shipped` below is what actually matters, and it skips this folder.
 */
const CODES = {
  'bottom:10': 'tyyffk',
  'bottom:11': 'shimmr',
  'held:6': 'zibbon',
  'nails:6': 'cherry',
  'nails:7': 'sparks',
};

test('sha256 matches the published vectors', () => {
  assert.equal(sha256(''),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(sha256('The quick brown fox jumps over the lazy dog'),
    'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592');
});

test('every locked part points at an option that exists', () => {
  for (const part of LOCKED_PARTS) {
    assert.ok(PART_COUNTS[part.key] !== undefined, `${part.key} is a real part`);
    assert.ok(part.index < PART_COUNTS[part.key],
      `${lockId(part.key, part.index)} is within ${part.key}'s ${PART_COUNTS[part.key]} options`);
    assert.equal(part.codeHash.length, 64);
    assert.ok(part.name.length > 0, 'it has a name to show her');
  }
});

test('the right code unlocks its part', () => {
  for (const part of LOCKED_PARTS) {
    const id = lockId(part.key, part.index);
    assert.ok(isLocked(part.key, part.index, []), `${id} starts locked`);
    const after = redeem(id, CODES[id], []);
    assert.deepEqual(after, [id]);
    assert.equal(isLocked(part.key, part.index, after), false);
  }
});

test('a code minted for one part does not open another', () => {
  // Every pairing, not just one: the two gowns sit next to each other in the
  // same grid, so mistyping one code into the other's field is the mistake
  // most likely to actually happen.
  const ids = LOCKED_PARTS.map((p) => lockId(p.key, p.index));
  for (const mine of ids) {
    for (const other of ids) {
      if (mine === other) continue;
      assert.deepEqual(redeem(other, CODES[mine], []), [],
        `${mine}'s code offered for ${other} unlocks nothing`);
    }
  }
});

test('a wrong code changes nothing and never takes anything away', () => {
  const id = lockId('bottom', 10);
  assert.deepEqual(redeem(id, 'wrongy', []), []);

  const already = [lockId('held', 6)];
  const after = redeem(id, 'nopeno', already);
  assert.deepEqual(after, already, 'a failed attempt leaves what she has');
});

test('entering the same code twice changes nothing', () => {
  const id = lockId('bottom', 10);
  const once = redeem(id, CODES[id], []);
  const twice = redeem(id, CODES[id], once);
  assert.deepEqual(twice, once);
  assert.equal(twice.length, 1, 'and does not list it a second time');
});

test('a code is typed the way a child types it', () => {
  const id = lockId('bottom', 10);
  // Capitals from autocapitalise, and a stray space from the keyboard.
  assert.deepEqual(redeem(id, ' TyyFFk ', []), [id]);
  assert.equal(cleanCode('AB-cd!ef'), 'abcdef');
  assert.equal(cleanCode('abcdefghij').length, CODE_LENGTH, 'nothing past the length');
  assert.equal(cleanCode(null), '');
});

test('an unknown lock id is refused rather than trusted', () => {
  assert.deepEqual(redeem('bottom:99', 'tyyffk', []), []);
  assert.equal(lockFor('bottom', 99), null);
  assert.equal(isLocked('bottom', 0, []), false, 'a free part is never locked');
});

test('a stored list keeps only locks this version knows', () => {
  const id = lockId('bottom', 10);
  assert.deepEqual(cleanUnlocks([id, 'bottom:99', id]), [id],
    'junk is dropped and duplicates collapse');
  assert.deepEqual(cleanUnlocks('not a list'), []);
  assert.deepEqual(cleanUnlocks(null), []);
});

test('unlocks are stored on the device, apart from the worlds', () => {
  const backend = new Map();
  const store = createUnlockStore({
    getItem: (k) => (backend.has(k) ? backend.get(k) : null),
    setItem: (k, v) => backend.set(k, v),
  });

  assert.deepEqual(store.load(), [], 'nothing unlocked to begin with');
  const id = lockId('held', 6);
  store.save([id]);
  assert.deepEqual(store.load(), [id], 'and it survives being read back');
  assert.ok(backend.has(UNLOCKS_KEY), 'under its own key');
  assert.equal(backend.has('rotem.worlds'), false, 'not mixed in with the houses');
});

test('damaged or unavailable storage costs the codes, never the game', () => {
  const corrupt = createUnlockStore({ getItem: () => '{{{', setItem() {} });
  assert.deepEqual(corrupt.load(), []);

  const broken = createUnlockStore({
    getItem() { throw new Error('no'); },
    setItem() { throw new Error('full'); },
  });
  assert.deepEqual(broken.load(), []);
  assert.equal(broken.save(['held:6']), false, 'it reports the failure rather than throwing');
});

/** Every file the browser actually downloads. */
function shippedFiles(dir = ROOT, out = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', 'test', 'openspec', 'tools', 'assets'].includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) shippedFiles(full, out);
    else if (/\.(js|json|html|css|webmanifest)$/.test(name)) out.push(full);
  }
  return out;
}

test('codes never appear in anything shipped', () => {
  const files = shippedFiles();
  assert.ok(files.length > 5, 'the sweep found the app');
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const code of Object.values(CODES)) {
      assert.equal(text.includes(code), false, `${code} is readable in ${file}`);
    }
  }
});

test('the hash is salted, so one code cannot be reused across parts', () => {
  assert.notEqual(hashFor('bottom:10', 'tyyffk'), hashFor('held:6', 'tyyffk'));
});
