/**
 * A school that works: sizes, a class that sits down, and a hand up.
 *
 * The three things a room full of desks needs that a living room does not.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SIZES, EDITABLE_PARTS, createCharacterSpec, clampSpec,
} from '../js/model/character.js';
import { charHeight, sizeOf, headBounds, standMetrics } from '../js/render/character.js';
import { BUILDS } from '../js/model/character.js';
import {
  seatsIn, seated, seatEveryone, standEveryone, isClassSeated,
} from '../js/model/classroom.js';
import {
  beginUse, stopUsing, canRaiseHand, toggleHand, handIsUp, useFor, resolveUse, SEAT_LEVEL,
} from '../js/model/using.js';
import {
  createWorld, repairWorld, placeItem, placeCharacter,
  WALL_COLORS, FLOOR_COLORS, FLOOR_STYLES,
} from '../js/model/world.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRoomScene } from '../js/scenes/room.js';
import { stubGame } from './helpers/stubs.js';
import { HOUSE_LAYOUT } from '../js/model/world.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'assets/catalog.json'), 'utf8'));
const lookup = (id) => catalog.items.find((i) => i.id === id);

const child = () => ({ ...createCharacterSpec(), size: 0 });
const grown = () => ({ ...createCharacterSpec(), size: 1 });

/* ------------------------------------------------------------------ sizes */

test('a grown-up is taller than a child', () => {
  assert.ok(charHeight(grown()) > charHeight(child()), 'plainly taller');
  assert.ok(charHeight(grown()) / charHeight(child()) > 1.1, 'by enough to see');
});

test('a grown-up has a smaller head against her body', () => {
  const childHead = headBounds(child()).height / charHeight(child());
  const grownHead = headBounds(grown()).height / charHeight(grown());
  assert.ok(grownHead < childHead, 'which is most of what says grown-up');
});

test('the figure the game always drew is the child, so nobody changes size', () => {
  assert.equal(SIZES[0].scale, 1);
  assert.equal(charHeight(child()), charHeight({ ...createCharacterSpec(), size: undefined }));
});

test('every part of the skeleton grows, not just the legs', () => {
  const small = standMetrics(BUILDS[2]);
  const spec = grown();
  const factor = sizeOf(spec).scale;
  // Drawn through the same metrics, so a grown-up is a bigger person rather
  // than a child on stilts.
  assert.ok(Math.abs(small.shoulderW * factor - small.shoulderW) > 2);
});

test('a size survives a save, and nonsense comes back as a child', () => {
  const world = createWorld('Home');
  world.characters.push({ ...placeCharacter(grown(), 'bedroom', 300, 470) });
  const back = repairWorld(JSON.parse(JSON.stringify(world)));
  assert.equal(back.characters[0].spec.size, 1);

  assert.equal(clampSpec({ ...createCharacterSpec(), size: 99 }).size, 0);
  assert.equal(clampSpec({ ...createCharacterSpec(), size: 'big' }).size, 0);
});

test('size is a tab in the creator, so it can actually be chosen', () => {
  assert.ok(EDITABLE_PARTS.some((p) => p.key === 'size'), 'it is on the rail');
});

/* ---------------------------------------------------------------- a class */

test('one tap sits the whole class down, each at a different desk', () => {
  const desks = [200, 400, 600].map((x) => placeItem('desk_school', x, 470));
  const kids = [210, 420, 590].map((x) => placeCharacter(child(), 'living', x, 470));

  assert.equal(seatEveryone(kids, desks), 3);
  const taken = kids.map((k) => k.using.uid);
  assert.equal(new Set(taken).size, 3, 'nobody is sitting on anybody');
  assert.equal(seated(kids).length, 3);
});

test('each child takes the desk she is nearest to', () => {
  const desks = [200, 900].map((x) => placeItem('desk_school', x, 470));
  const near = placeCharacter(child(), 'living', 220, 470);
  const far = placeCharacter(child(), 'living', 880, 470);

  seatEveryone([near, far], desks);
  assert.equal(near.using.uid, desks[0].uid);
  assert.equal(far.using.uid, desks[1].uid);
});

test('more children than desks leaves the rest standing', () => {
  const desks = [placeItem('chair', 300, 470)];
  const kids = [300, 400, 500].map((x) => placeCharacter(child(), 'living', x, 470));

  assert.equal(seatEveryone(kids, desks), 1);
  assert.equal(seated(kids).length, 1, 'one down');
  assert.equal(kids.filter((k) => !k.using).length, 2, 'two still on their feet');
});

test('nobody is moved out of a seat they are already in', () => {
  const desks = [200, 400].map((x) => placeItem('desk_school', x, 470));
  const her = placeCharacter(child(), 'living', 380, 470);
  beginUse(her, desks[1]);
  const other = placeCharacter(child(), 'living', 210, 470);

  seatEveryone([her, other], desks);
  assert.equal(her.using.uid, desks[1].uid, 'she stayed where she was');
  assert.equal(other.using.uid, desks[0].uid);
});

test('one tap stands the class up again', () => {
  const desks = [200, 400].map((x) => placeItem('desk_school', x, 470));
  const kids = [210, 420].map((x) => placeCharacter(child(), 'living', x, 470));
  seatEveryone(kids, desks);

  assert.equal(isClassSeated(kids, desks), true);
  assert.equal(standEveryone(kids), 2);
  assert.equal(seated(kids).length, 0);
});

test('standing the class up leaves somebody in the shower alone', () => {
  const shower = placeItem('shower', 800, 470);
  const desk = placeItem('desk_school', 200, 470);
  const her = placeCharacter(child(), 'bath', 800, 470);
  const him = placeCharacter(child(), 'bath', 200, 470);
  beginUse(her, shower);
  beginUse(him, desk);

  standEveryone([her, him]);
  assert.ok(her.using, 'she is still in the shower');
  assert.equal(him.using, undefined, 'he got up from his desk');
});

test('only things you sit on count as seats', () => {
  const items = [
    placeItem('desk_school', 200, 470), placeItem('chair', 300, 470),
    placeItem('bed_single', 400, 470), placeItem('fridge', 500, 470),
    placeItem('cake', 600, 470),
  ];
  assert.deepEqual(seatsIn(items).map((i) => i.item), ['desk_school', 'chair']);
});

test('a seat shut in a cupboard is not a seat', () => {
  const stool = placeItem('stool', 300, 470);
  stool.inside = 'somewhere';
  assert.deepEqual(seatsIn([stool]), []);
});

test('the sit-everybody button is offered only where it means something', () => {
  const game = stubGame();
  const roomId = HOUSE_LAYOUT[0];
  const room = game.world.buildings[0].rooms[roomId];

  room.items = room.items.filter((i) => !seatsIn([i]).length);
  const bare = createRoomScene(game, roomId);
  assert.equal(bare.allControls().some((c) => c.id === 'classSit'), false,
    'nothing to sit on, no button');

  room.items.push(placeItem('desk_school', 400, 470));
  const withDesk = createRoomScene(game, roomId);
  assert.ok(withDesk.allControls().some((c) => c.id === 'classSit'), 'a desk, a button');
});

test('the button sits the room down and then stands it up', () => {
  const game = stubGame();
  const roomId = HOUSE_LAYOUT[0];
  const room = game.world.buildings[0].rooms[roomId];
  room.items.push(placeItem('desk_school', 320, 470));
  const here = game.charactersIn(roomId);
  assert.ok(here.length, 'somebody is in the room');

  const scene = createRoomScene(game, roomId);
  const tap = () => {
    const button = createRoomScene(game, roomId).allControls().find((c) => c.id === 'classSit');
    scene.onTap(button.x + button.w / 2, button.y + button.h / 2);
  };
  tap();
  assert.equal(seated(here).length, here.length, 'everybody sat down');
  tap();
  assert.equal(seated(here).length, 0, 'and everybody got up');
});

/* --------------------------------------------------------------- hands up */

test('a hand goes up sitting down, and nowhere else', () => {
  const desk = placeItem('desk_school', 300, 470);
  const her = placeCharacter(child(), 'living', 300, 470);

  assert.equal(canRaiseHand(her), false, 'not standing in the middle of the room');
  beginUse(her, desk);
  assert.equal(canRaiseHand(her), true);
  assert.equal(toggleHand(her), true);
  assert.equal(handIsUp(her), true);
});

test('a hand comes down again', () => {
  const desk = placeItem('desk_school', 300, 470);
  const her = placeCharacter(child(), 'living', 300, 470);
  beginUse(her, desk);
  toggleHand(her);
  assert.equal(toggleHand(her), false);
  assert.equal(handIsUp(her), false);
});

test('standing up takes the hand down', () => {
  const desk = placeItem('desk_school', 300, 470);
  const her = placeCharacter(child(), 'living', 300, 470);
  beginUse(her, desk);
  toggleHand(her);
  stopUsing(her);
  assert.equal(handIsUp(her), false);
  assert.equal('hand' in her, false, 'and nothing is left behind on her');
});

test('a hand still up tomorrow is still up', () => {
  const world = createWorld('School');
  const desk = placeItem('desk_school', 300, 470);
  const her = placeCharacter(child(), 'living', 300, 470);
  beginUse(her, desk);
  toggleHand(her);
  world.buildings[0].rooms.living.items.push(desk);
  world.characters.push(her);

  const back = repairWorld(JSON.parse(JSON.stringify(world)));
  assert.equal(back.characters[0].hand, true, 'she is still waiting to be asked');
});

test('a hand saved without a seat under it is dropped', () => {
  const world = createWorld('School');
  const her = placeCharacter(child(), 'living', 300, 470);
  her.hand = true;
  world.characters.push(her);

  const back = repairWorld(JSON.parse(JSON.stringify(world)));
  assert.equal('hand' in back.characters[0], false);
});

/* ------------------------------------------------------------ the playground */

test('the playground has things to play on, and they can be used', () => {
  for (const id of ['slide', 'swing', 'sandpit', 'ball']) {
    assert.ok(lookup(id), `${id} can be taken from a drawer`);
  }
  for (const id of ['slide', 'swing', 'sandpit']) {
    assert.equal(useFor(id), 'sit', `${id} is something to get on`);
  }
});

test('a slide is sat on at the top, not half way down the chute', () => {
  assert.ok(SEAT_LEVEL.slide > 0.7, 'up at the platform');
  const her = placeCharacter(child(), 'living', 300, 470);
  const slide = placeItem('slide', 300, 470);
  beginUse(her, slide);
  const doing = resolveUse(her, [slide]);
  assert.equal(doing.seat, SEAT_LEVEL.slide, 'and the room draws her there');
});

test('a room can be painted as outdoors', () => {
  assert.ok(WALL_COLORS.length > 10, 'there is a sky to paint the wall');
  assert.ok(FLOOR_STYLES.includes('grass'), 'and grass to lay on the floor');
  // Appended rather than inserted, or every saved floor would change.
  assert.equal(FLOOR_STYLES.indexOf('grass'), FLOOR_STYLES.length - 1);
  assert.equal(WALL_COLORS[0], '#ecdcd6', 'the first wall colour is unchanged');
  assert.equal(FLOOR_COLORS[0], '#c2996b', 'and so is the first floor');
});

test('the classroom kit is all in a drawer somewhere', () => {
  for (const id of ['whiteboard', 'marker', 'rubber', 'desk_school',
    'teacher_desk', 'globe', 'school_bag', 'poster']) {
    assert.ok(lookup(id), `${id} is in the catalog`);
  }
  assert.equal(lookup('poster').surface, 'wall', 'a poster goes on the wall');
});
