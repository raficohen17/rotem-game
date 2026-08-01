## Why

Rotem says the game is slow. Measured on a desktop, with a street of three
buildings and four people in every room, one frame of a room costs 17ms and one
frame of the cutaway costs 27ms — and the phone is several times slower than
the desktop. That is a game running at ten frames a second on the only machine
it is played on.

Nothing here is a feature. The point is that the same game feels like a toy
that answers her finger rather than one that thinks about it first.

## What Changes

- **A bench** that builds a full street with a crowd in it and times what the
  game does every frame, so this is decided by numbers rather than by opinion.
- **A frame budget**: what a scene may cost, checked against the machine it is
  played on rather than the one it is written on.
- **Fewer soft shadows**: they are 38% of the cost of a room and they are drawn
  behind every object on every frame.
- **A frame rate that suits the game**: a dolls' house does not need sixty
  frames a second, and half of them costs half the battery and half the heat.
- **Fewer device pixels** where the art cannot show them.
- **Work that is not repeated**: the floor pattern, the gradients, and anything
  else redrawn identically sixty times a second.

Each step is measured before and after. Anything that does not make it faster
is reverted rather than kept, and said so — two of them were.

Where it ended up, on the same busy world: a room 17.3ms → 5.6ms, the cutaway
27.4ms → 9.3ms, a character 0.9ms → 0.4ms, and the game drawing thirty frames a
second rather than a hundred and twenty.

## Impact

- `tools/bench.js` — the measurement
- `js/render/*` — where the time goes
- `js/core/view.js`, `js/main.js` — how often and how big we draw
