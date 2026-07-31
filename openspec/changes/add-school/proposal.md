## Why

There is a school on the street with a whiteboard in it, and everybody in it is
the same height. A teacher who is exactly as tall as the children is not a
teacher, she is another child standing at the board.

And a class is six children at six desks. Placing them one at a time and
sitting each of them down by hand is furniture removals, not play — the one
thing a classroom needs that a living room does not is a way to sit everybody
down at once.

## What Changes

- **Grown-ups and children**: a size in the character creator, so a teacher
  looks like a teacher and her class looks like a class.
- **Sitting the class down**: one tap in a room seats everybody at a free desk,
  and one tap gets them up again.
- **Raising a hand**: something a seated child can do, which is what a class
  looks like from the back of the room.
- **A playground**: a room painted as outdoors, with a slide, a swing, a
  sandpit and a ball.
- **The rest of the kit**: a teacher's desk, a school bag, a globe, an
  alphabet poster and a wall clock for the classroom.

## Impact

- `js/model/character.js` — how big somebody is
- `js/render/character.js` — drawn at that size, sitting at that size
- `js/scenes/room.js` — sit the class down, and get them up
- `js/model/using.js` — a hand up
- `assets/catalog.json` — the school and playground drawers
