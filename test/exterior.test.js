/**
 * Designing the outside of a building.
 *
 * The point of it is that two buildings can look different, so most of this is
 * about a choice actually reaching the street: the same object is edited, the
 * indices survive a save, and a bad one cannot draw nothing.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FRONT_WALLS, FRONT_ROOFS, ROOF_STYLES, DOOR_COLORS, WINDOW_STYLES,
  createFront, clampFront, frontLook, FRONT_RANGES,
} from '../js/model/front.js';
import {
  BUILDING_KINDS, MAX_BUILDING_NAME, createWorld, createBuilding, repairWorld,
} from '../js/model/world.js';
import { createExterior } from '../js/scenes/exterior.js';
import { createStreet, plotBox } from '../js/scenes/street.js';
import { stubGame, withDocument } from './helpers/stubs.js';

const open = (game, building) => withDocument(
  () => createExterior(game, building, () => {}),
);

test('every choice on the front has something to choose from', () => {
  for (const [field, count] of Object.entries(FRONT_RANGES)) {
    assert.ok(count >= 2, `${field} offers a choice at all`);
  }
  assert.equal(FRONT_WALLS.length, 10, 'walls match the ten a room has');
  assert.ok(ROOF_STYLES.length >= 3, 'roofs come in shapes');
  assert.ok(WINDOW_STYLES.length >= 3);
  assert.ok(DOOR_COLORS.length >= 4);
  assert.ok(FRONT_ROOFS.length >= 4);
});

test('a front loaded back as nonsense comes back as a building', () => {
  for (const bad of [null, undefined, 'blue', 42, { wall: -1, roof: 99, window: 'round' }]) {
    const front = clampFront(bad);
    assert.deepEqual(Object.keys(front).sort(), Object.keys(createFront()).sort());
    const look = frontLook(front);
    assert.match(look.wall, /^#/, 'it still has walls');
    assert.ok(ROOF_STYLES.includes(look.roofStyle), 'and a roof that is a shape');
  }
});

test('painting the walls changes the building she is looking at', () => {
  const game = stubGame();
  const building = game.world.buildings[0];
  const scene = open(game, building);

  const swatch = scene.allControls().find((c) => c.id === 'wall:4');
  assert.ok(swatch, 'there is a fifth wall colour to pick');
  scene.onTap(swatch.x + swatch.w / 2, swatch.y + swatch.h / 2);

  assert.equal(building.front.wall, 4);
  assert.equal(frontLook(building.front).wall, FRONT_WALLS[4]);
});

test('every choice on the panel actually sets its own field', () => {
  const game = stubGame();
  const building = game.world.buildings[0];
  const scene = open(game, building);

  for (const [field, index] of [['wall', 2], ['roof', 3], ['roofStyle', 1], ['door', 2], ['window', 2]]) {
    const control = scene.allControls().find((c) => c.id === `${field}:${index}`);
    assert.ok(control, `${field} ${index} can be picked`);
    scene.onTap(control.x + control.w / 2, control.y + control.h / 2);
    assert.equal(building.front[field], index, `${field} took`);
  }
});

test('what she picks is on the street when she comes back out', () => {
  const game = stubGame();
  const building = game.world.buildings[0];
  const scene = open(game, building);
  const roof = scene.allControls().find((c) => c.id === 'roof:5');
  scene.onTap(roof.x + roof.w / 2, roof.y + roof.h / 2);

  // The street draws the very object she was editing, not a copy of it.
  assert.equal(game.world.buildings[0].front.roof, 5);
});

test('a building can be made a school, and only then has a sign', () => {
  const game = stubGame();
  const building = game.world.buildings[0];
  assert.equal(building.kind, 'house');
  const scene = open(game, building);

  const school = scene.allControls().find((c) => c.id === 'kind:school');
  assert.ok(school, 'a school is one of the things it can be');
  scene.onTap(school.x + school.w / 2, school.y + school.h / 2);
  assert.equal(building.kind, 'school');
  assert.ok(BUILDING_KINDS.includes(building.kind));
});

test('the outside of every building survives a save', () => {
  const world = createWorld('Home');
  world.buildings.push(createBuilding('School', 'school'));
  world.buildings[0].front = { wall: 3, roof: 6, roofStyle: 2, door: 4, window: 1 };
  world.buildings[1].front = { wall: 8, roof: 1, roofStyle: 3, door: 0, window: 3 };

  const back = repairWorld(JSON.parse(JSON.stringify(world)));
  assert.deepEqual(back.buildings[0].front, world.buildings[0].front);
  assert.deepEqual(back.buildings[1].front, world.buildings[1].front);
  assert.equal(back.buildings[1].kind, 'school', 'and so does what it is for');
});

test('a name is cut to what fits over the door', () => {
  const game = stubGame();
  const building = game.world.buildings[0];
  const scene = open(game, building);
  const field = scene.allControls().find((c) => c.id === 'name');
  assert.ok(field, 'the name can be tapped');
  assert.ok(building.name.length <= MAX_BUILDING_NAME);
});

test('the paintbrush on the street opens the building it sits on', () => {
  let scene = null;
  const game = stubGame({ setScene: (next) => { scene = next; } });
  const street = createStreet(game);
  const brush = street.allControls().find((c) => c.id === `paint:${game.world.buildings[1].id}`);
  assert.ok(brush, 'every building has one');

  withDocument(() => street.onTap(brush.x + brush.w / 2, brush.y + brush.h / 2));
  assert.ok(scene, 'it opened something');
  assert.ok(scene.allControls().some((c) => c.id?.startsWith('wall:')), 'the outside designer');
});

test('the paintbrush sits on its own building and nowhere near the door', () => {
  const game = stubGame();
  const street = createStreet(game);
  game.world.buildings.forEach((building, i) => {
    const brush = street.allControls().find((c) => c.id === `paint:${building.id}`);
    const box = plotBox(i);
    const centre = brush.x + brush.w / 2 - 40;
    assert.ok(centre > box.x && centre < box.x + box.w, `plot ${i}: on its own building`);
    assert.ok(Math.abs(centre - (box.x + box.w / 2)) > box.w * 0.2,
      `plot ${i}: clear of the front door`);
  });
});

test('picking somebody up puts the paintbrushes away', () => {
  // Two round buttons on the same building, one to walk into it and one to
  // paint it, is a coin toss under a child's finger.
  const game = stubGame();
  const street = createStreet(game);
  const outside = game.charactersOutside()[0];
  street.onTap(40 + outside.x, 512 - 40);

  assert.equal(street.allControls().some((c) => c.id?.startsWith('paint:')), false);
  assert.ok(street.allControls().some((c) => c.id?.startsWith('walk:')), 'the walk badges are up');
});

test('a building she has not named takes the name of what it is for', () => {
  const game = stubGame();
  const building = game.world.buildings[0];
  building.name = 'House 1';
  const scene = open(game, building);
  const school = scene.allControls().find((c) => c.id === 'kind:school');
  scene.onTap(school.x + school.w / 2, school.y + school.h / 2);
  assert.equal(building.name, 'School');
});

test('a building she has named keeps its name', () => {
  const game = stubGame();
  const building = game.world.buildings[0];
  building.name = 'Rotem';
  const scene = open(game, building);
  const school = scene.allControls().find((c) => c.id === 'kind:school');
  scene.onTap(school.x + school.w / 2, school.y + school.h / 2);
  assert.equal(building.name, 'Rotem', 'a school called Rotem is her school');
});
