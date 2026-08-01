/**
 * The code, from her side: what she sees in the grid and what typing does.
 *
 * The hashing itself is covered in unlocks.test.js. This is the half that has
 * to feel right — a locked thing she can see, a field that asks for one thing,
 * and a wrong code that costs her nothing.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createCharacterCreator } from '../js/scenes/charcreator.js';
import { EDITABLE_PARTS, PART_COUNTS } from '../js/model/character.js';
import { LOCKED_PARTS, lockId } from '../js/model/unlocks.js';
import { stubGame, withDocument, inputsCreated } from './helpers/stubs.js';
import { recordingContext } from './helpers/recorder.js';

const CODES = { 'bottom:10': 'tyyffk', 'bottom:11': 'shimmr', 'held:6': 'zibbon' };

/** The tab index of a part, the way a tap would reach it. */
const tabFor = (key) => EDITABLE_PARTS.findIndex((p) => p.key === key) + 1;

const tap = (scene, control) => scene.onTap(control.x + control.w / 2, control.y + control.h / 2);

/** Opens the creator on the tab a locked part lives in. */
function creatorOn(key, game = stubGame()) {
  const scene = createCharacterCreator(game, () => {}, () => {});
  const tab = scene.allControls().find((c) => c.id === `tab:${tabFor(key)}`);
  tap(scene, tab);
  return { scene, game };
}

for (const lock of LOCKED_PARTS) {
  const id = lockId(lock.key, lock.index);

  test(`${lock.name} is in the grid, and locked, before its code`, () => {
    const { scene } = creatorOn(lock.key);
    const option = scene.allControls().find((c) => c.id === `opt:${lock.index}`);
    assert.ok(option, 'the option is shown rather than hidden');
    assert.equal(option.locked, true);

    const free = scene.allControls().filter((c) => c.id?.startsWith('opt:') && c.locked);
    assert.equal(free.length, LOCKED_PARTS.filter((p) => p.key === lock.key).length,
      'and nothing else on the tab is locked');
  });

  test(`tapping ${lock.name} asks for a code instead of putting it on`, () => {
    withDocument(() => {
      const { scene, game } = creatorOn(lock.key);
      const before = scene.allControls().find((c) => c.active && c.id?.startsWith('opt:'));

      tap(scene, scene.allControls().find((c) => c.id === `opt:${lock.index}`));

      assert.equal(scene.allControls().find((c) => c.id === `opt:${lock.index}`).active, false,
        'she is not wearing it');
      assert.equal(scene.allControls().find((c) => c.active && c.id?.startsWith('opt:')).id,
        before.id, 'and is still wearing what she was');
      assert.deepEqual(game.unlocks, [], 'nothing was unlocked by the tap alone');

      const field = inputsCreated().at(-1);
      assert.ok(field, 'a field opened');
      assert.equal(field.focused, true, 'with the keyboard already up');
      assert.equal(field.placeholder, lock.name, 'naming what it will unlock');
    });
  });

  test(`the right code puts ${lock.name} on and keeps it`, () => {
    withDocument(() => {
      const { scene, game } = creatorOn(lock.key);
      tap(scene, scene.allControls().find((c) => c.id === `opt:${lock.index}`));

      inputsCreated().at(-1).typeIn(CODES[id]);

      assert.deepEqual(game.unlocks, [id], 'it is unlocked on the device');
      const option = scene.allControls().find((c) => c.id === `opt:${lock.index}`);
      assert.equal(option.locked, false);
      assert.equal(option.active, true, 'and she is wearing it straight away');
      assert.equal(inputsCreated().at(-1).attached, false, 'the field has gone');
    });
  });

  test(`a wrong code for ${lock.name} shakes and costs her nothing`, () => {
    withDocument(() => {
      const { scene, game } = creatorOn(lock.key);
      tap(scene, scene.allControls().find((c) => c.id === `opt:${lock.index}`));
      const field = inputsCreated().at(-1);

      for (const wrong of ['aaaaaa', 'zzzzzz', 'wrongy']) field.typeIn(wrong);

      assert.equal(field.shakes, 3, 'each attempt shakes');
      assert.equal(field.attached, true, 'and the field is still there for another go');
      assert.deepEqual(game.unlocks, []);
      assert.equal(scene.allControls().find((c) => c.id === `opt:${lock.index}`).locked, true);
    });
  });

  test(`${lock.name} behaves like any other option once unlocked`, () => {
    withDocument(() => {
      const game = stubGame({ unlocks: [id] });
      const { scene } = creatorOn(lock.key, game);

      const option = scene.allControls().find((c) => c.id === `opt:${lock.index}`);
      assert.equal(option.locked, false);
      tap(scene, option);

      assert.equal(scene.allControls().find((c) => c.id === `opt:${lock.index}`).active, true);
      assert.equal(inputsCreated().length, 0, 'and no code was asked for');
    });
  });
}

test('a half-typed code is not an attempt', () => {
  withDocument(() => {
    const { scene, game } = creatorOn('bottom');
    tap(scene, scene.allControls().find((c) => c.id === 'opt:10'));
    const field = inputsCreated().at(-1);

    for (const partial of ['t', 'ty', 'tyy', 'tyyf', 'tyyff']) field.typeIn(partial);
    assert.equal(field.shakes, 0, 'nothing shakes while she is still typing');

    field.typeIn('tyyffk');
    assert.deepEqual(game.unlocks, ['bottom:10']);
  });
});

test('leaving the creator takes the keyboard with it', () => {
  withDocument(() => {
    const { scene } = creatorOn('bottom');
    tap(scene, scene.allControls().find((c) => c.id === 'opt:10'));
    assert.equal(inputsCreated().at(-1).attached, true);

    const cancel = scene.allControls().find((c) => c.id === 'cancel');
    tap(scene, cancel);
    assert.equal(inputsCreated().at(-1).attached, false);
  });
});

test('changing tabs puts the code field away', () => {
  withDocument(() => {
    const { scene } = creatorOn('bottom');
    tap(scene, scene.allControls().find((c) => c.id === 'opt:10'));
    const field = inputsCreated().at(-1);

    tap(scene, scene.allControls().find((c) => c.id === `tab:${tabFor('shoes')}`));
    assert.equal(field.attached, false);
  });
});

test('a character already wearing a locked part still draws without the codes', () => {
  // Site data can be cleared, and the PWA can be reinstalled. Neither is
  // allowed to undress somebody Rotem made.
  for (const lock of LOCKED_PARTS) {
    const recorder = recordingContext();
    const game = stubGame({ unlocks: [] });
    const spec = { ...game.world.characters[0].spec, [lock.key]: lock.index };

    withDocument(() => {
      createCharacterCreator(game, () => {}, () => {}, spec).draw(recorder.ctx);
    });

    const bounds = recorder.bounds();
    assert.ok(bounds.maxX > bounds.minX, `${lock.name} still draws`);
  }
});

test('the locked options are the only ones behind a code', () => {
  // A guard against a future part count being bumped past a lock index, which
  // would silently free it.
  for (const lock of LOCKED_PARTS) {
    assert.ok(lock.index < PART_COUNTS[lock.key]);
  }
  assert.equal(LOCKED_PARTS.length, 3, 'two gowns and the magic sword');
});
