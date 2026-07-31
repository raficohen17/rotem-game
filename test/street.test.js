/**
 * The street.
 *
 * A world used to be one house. Most of what is here is about the seam that
 * makes: an old save has to come through with everything in it, two buildings
 * must not share the people in them, and somebody walking out of a front door
 * has to end up somewhere real.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_BUILDINGS, MAX_BUILDING_NAME, STREET, FRONT_ROOM, HOUSE_LAYOUT,
  createWorld, createBuilding, migrateWorld, repairWorld, buildingOf, roomsOf,
  placeItem, placeCharacter, placeCat, cleanBuildingName,
} from '../js/model/world.js';
import { planExit, planEntry, beginTrip, stepWalk } from '../js/model/travel.js';
import { createStreet, plotBox, doorX, WALK_Y } from '../js/scenes/street.js';
import { createHouse, cellBox } from '../js/scenes/house.js';
import { stubGame } from './helpers/stubs.js';
import { ROOM_W } from '../js/render/room.js';
import { SCREEN } from '../js/ui/widgets.js';

/** A world in the shape it had before the street existed. */
function oldWorld() {
  return {
    version: 1,
    id: 'w1',
    name: 'Old House',
    createdAt: 1,
    rooms: {
      bedroom: { id: 'bedroom', wall: '#fff', floor: '#c2996b', items: [placeItem('bed_single', 300, 470)] },
      living: { id: 'living', wall: '#fff', floor: '#c2996b', items: [placeItem('sofa', 500, 470)] },
      kitchen: { id: 'kitchen', wall: '#fff', floor: '#c2996b', items: [] },
      bath: { id: 'bath', wall: '#fff', floor: '#c2996b', items: [] },
    },
    characters: [placeCharacter({ hair: 0 }, 'kitchen', 400, 470)],
    cats: [placeCat({}, 'living', 600, 470)],
  };
}

/* ------------------------------------------------------ the house she had */

test('a world saved before the street becomes a street with her house on it', () => {
  const world = migrateWorld(oldWorld());
  assert.equal(world.version, 2);
  assert.equal(world.buildings.length, 1, 'one building, on the first plot');
  assert.equal(world.buildings[0].name, 'Old House', 'called what the world was called');
  assert.equal(world.buildings[0].kind, 'house');
});

test('nothing in the old house is lost on the way', () => {
  const world = migrateWorld(oldWorld());
  const rooms = world.buildings[0].rooms;
  assert.equal(rooms.bedroom.items.length, 1, 'the bed is still in the bedroom');
  assert.equal(rooms.living.items[0].item, 'sofa');
  assert.equal(world.characters[0].room, 'kitchen', 'she is still in the kitchen');
  assert.equal(world.cats[0].room, 'living');
});

test('everybody in an old house is told which building they are in', () => {
  const world = migrateWorld(oldWorld());
  const home = world.buildings[0].id;
  assert.equal(world.characters[0].building, home);
  assert.equal(world.cats[0].building, home);
});

test('a save with no buildings at all still opens', () => {
  const world = repairWorld({ id: 'x', name: 'Empty', buildings: [] });
  assert.equal(world.buildings.length, 1, 'a street with nothing on it is not a world');
  assert.deepEqual(Object.keys(world.buildings[0].rooms).sort(), [...HOUSE_LAYOUT].sort());
});

test('a save with too many buildings keeps the ones that fit', () => {
  const world = repairWorld({
    id: 'x',
    name: 'Row',
    buildings: Array.from({ length: 9 }, (_, i) => ({ name: `B${i}` })),
  });
  assert.equal(world.buildings.length, MAX_BUILDINGS);
});

/* -------------------------------------------------------------- buildings */

test('two buildings do not share the people in them', () => {
  const game = stubGame();
  const [home, school] = game.world.buildings;
  const her = { ...placeCharacter({}, 'kitchen', 400, 470), building: home.id };
  const him = { ...placeCharacter({}, 'kitchen', 400, 470), building: school.id };
  game.world.characters.push(her, him);

  assert.equal(game.charactersIn('kitchen', home.id).includes(him), false, 'not in her kitchen');
  assert.equal(game.charactersIn('kitchen', school.id).includes(her), false, 'nor she in his');
});

test('every building has its own rooms', () => {
  const world = createWorld('Home');
  world.buildings.push(createBuilding('School', 'school'));
  const [home, school] = world.buildings;
  roomsOf(world, home.id).kitchen.items.push(placeItem('fridge', 400, 470));

  assert.equal(roomsOf(world, home.id).kitchen.items.length, 1);
  assert.equal(roomsOf(world, school.id).kitchen.items.length, 0, 'the school has its own');
});

test('a name too long for the sign is cut down to fit', () => {
  const long = 'The Very Grand School of Everything';
  assert.equal(cleanBuildingName(long).length, MAX_BUILDING_NAME);
  const world = repairWorld({ id: 'x', name: 'W', buildings: [{ name: long }] });
  assert.equal(world.buildings[0].name.length, MAX_BUILDING_NAME);
});

test('an unknown building id falls back to the first one rather than to nothing', () => {
  const world = createWorld('Home');
  assert.equal(buildingOf(world, 'nonsense'), world.buildings[0]);
});

/* --------------------------------------------------------------- walking */

test('sent out, she ends up on the pavement outside her own door', () => {
  const her = { room: 'bedroom', building: 'b1', x: 300 };
  const legs = planExit(her, doorX(0), ROOM_W);
  assert.ok(legs, 'there is a way out');
  beginTrip(her, legs);
  for (let i = 0; i < 400 && her.walk; i += 1) stepWalk(her, 0.1, ROOM_W);

  assert.equal(her.room, STREET, 'she is outside');
  assert.equal(her.building, null, 'and in no building at all');
  assert.equal(her.x, doorX(0), 'standing where her door comes out');
});

test('sent in, she ends up in a room of the building she was sent to', () => {
  const her = { room: STREET, building: null, x: doorX(0) };
  beginTrip(her, planEntry('b2', doorX(1), 'kitchen', 600, ROOM_W));
  for (let i = 0; i < 400 && her.walk; i += 1) stepWalk(her, 0.1, ROOM_W);

  assert.equal(her.building, 'b2', 'in the other building');
  assert.equal(her.room, 'kitchen');
  assert.equal(her.x, 600);
});

test('she comes in through the front door, whichever room she is heading for', () => {
  const legs = planEntry('b2', doorX(1), 'bedroom', 500, ROOM_W);
  assert.equal(legs[0].room, STREET, 'she walks along the pavement first');
  assert.equal(legs[1].room, FRONT_ROOM, 'and in at the front');
  assert.equal(legs.at(-1).room, 'bedroom', 'and up to where she was sent');
});

test('a walk out and a walk back in is a round trip, not a one-way door', () => {
  const her = { room: 'bath', building: 'b1', x: 200 };
  beginTrip(her, planExit(her, doorX(1), ROOM_W));
  for (let i = 0; i < 400 && her.walk; i += 1) stepWalk(her, 0.1, ROOM_W);
  assert.equal(her.room, STREET);

  beginTrip(her, planEntry('b1', doorX(1), 'bath', 200, ROOM_W));
  for (let i = 0; i < 400 && her.walk; i += 1) stepWalk(her, 0.1, ROOM_W);
  assert.equal(her.building, 'b1');
  assert.equal(her.room, 'bath');
});

/* ----------------------------------------------------------- the scene */

test('tapping a building opens that building', () => {
  let opened = null;
  const game = stubGame({ openBuilding: (b) => { opened = b; } });
  const scene = createStreet(game);
  const box = plotBox(1);
  scene.onTap(40 + box.x + box.w / 2, box.y + box.h * 0.3);
  assert.equal(opened, game.world.buildings[1], 'the one she tapped');
});

test('tapping an empty plot builds on it, up to the last plot', () => {
  const game = stubGame();
  const scene = createStreet(game);
  while (game.world.buildings.length < MAX_BUILDINGS) {
    const box = plotBox(game.world.buildings.length);
    scene.onTap(40 + box.x + box.w / 2, box.y + box.h * 0.8);
  }
  assert.equal(game.world.buildings.length, MAX_BUILDINGS);

  const before = game.world.buildings.length;
  const full = createStreet(game);
  full.onTap(40 + plotBox(2).x + 20, plotBox(2).y + 20);
  assert.equal(game.world.buildings.length, before, 'a full street builds nothing more');
});

test('a new building comes with four rooms of its own and nothing in them', () => {
  const game = stubGame();
  game.world.buildings = game.world.buildings.slice(0, 1);
  const scene = createStreet(game);
  const box = plotBox(1);
  scene.onTap(40 + box.x + box.w / 2, box.y + box.h * 0.8);

  const built = game.world.buildings[1];
  assert.ok(built, 'it went up');
  assert.deepEqual(Object.keys(built.rooms).sort(), [...HOUSE_LAYOUT].sort());
  assert.equal(Object.values(built.rooms).every((r) => r.items.length === 0), true);
});

test('the way out of a building is the street, and out of the street is the shelf', () => {
  let wentStreet = false;
  let wentMenu = false;
  const house = createHouse(stubGame({ goStreet: () => { wentStreet = true; } }));
  const backHouse = house.controls.find((c) => c.id === 'back');
  house.onTap(backHouse.x + backHouse.w / 2, backHouse.y + backHouse.h / 2);
  assert.equal(wentStreet, true, 'out of the cutaway is the street');

  const street = createStreet(stubGame({ goMenu: () => { wentMenu = true; } }));
  street.onTap(1186 + 36, 24 + 36);
  assert.equal(wentMenu, true, 'out of the street is the shelf');
});

test('somebody on the pavement can be picked up and sent into a building', () => {
  const game = stubGame();
  const scene = createStreet(game);
  const outside = game.charactersOutside()[0];
  assert.ok(outside, 'there is somebody out there');

  scene.onTap(40 + outside.x, WALK_Y - 40);
  const badge = scene.allControls().find((c) => c.id?.startsWith('walk:'));
  assert.ok(badge, 'and buildings to send her into');
  scene.onTap(badge.x + badge.w / 2, badge.y + badge.h / 2);
  assert.ok(outside.walk, 'she set off');

  for (let i = 0; i < 400 && outside.walk; i += 1) stepWalk(outside, 0.1, ROOM_W);
  assert.ok(game.world.buildings.some((b) => b.id === outside.building), 'and got there');
});

test('the plots all fit on the screen with room between them', () => {
  for (let i = 0; i < MAX_BUILDINGS; i += 1) {
    const box = plotBox(i);
    assert.ok(box.x + 40 >= 0, `plot ${i} starts on screen`);
    assert.ok(box.x + box.w + 40 <= SCREEN.w, `plot ${i} ends on screen`);
    if (i > 0) {
      assert.ok(box.x > plotBox(i - 1).x + plotBox(i - 1).w, `plot ${i} clears plot ${i - 1}`);
    }
  }
});

test('sending her out of the cutaway puts her on the pavement', () => {
  const game = stubGame();
  const scene = createHouse(game);
  const her = game.charactersIn('kitchen')[0] ?? game.world.characters
    .find((c) => c.building === game.building.id);
  assert.ok(her, 'somebody is at home');

  // Tap her to pick her up, the way the cutaway works.
  const index = HOUSE_LAYOUT.indexOf(her.room);
  const box = cellBox(index);
  const scale = box.w / ROOM_W;
  scene.onTap(box.x + her.x * scale, box.y + (her.y - 80) * scale);

  const out = scene.allControls().find((c) => c.id === 'out');
  assert.ok(out, 'the way out is offered');
  scene.onTap(out.x + out.w / 2, out.y + out.h / 2);
  assert.ok(her.walk, 'she set off');

  for (let i = 0; i < 400 && her.walk; i += 1) stepWalk(her, 0.1, ROOM_W);
  assert.equal(her.room, STREET, 'and ended up outside');
});
