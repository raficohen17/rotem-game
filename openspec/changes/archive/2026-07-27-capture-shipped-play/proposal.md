## Why

Four capabilities shipped since the last archive and none of them are written
down. The specs describe a game that is a house, a wardrobe and a shelf of
worlds; the game on Rotem's phone also walks characters between rooms, lets her
design book covers, lets her put someone in the shower, and holds every control
to a size a seven-year-old can hit.

That gap is not bookkeeping. Two of the bugs found this week — a drawer tab
positioned 88px off the right edge, and the walk hint drawn at y=726 on a
720-tall canvas — were both cases of a rule that existed in my head and nowhere
else. Written down, they are testable; unwritten, they were rediscovered by
playing.

This change records what is already built and shipped. No behaviour changes.

## What Changes

- **room-travel** (new): doors, the staircase, routing between rooms, and the
  walk buttons that make the gesture visible.
- **book-design** (new): designing a cover, typing a title on the phone's own
  keyboard, the contrast floor that keeps a title readable on any cover, and
  stacking books into piles.
- **item-use** (new): characters using furniture — a shower behind a curtain, a
  book read from her own design — and what happens to that record when the
  world is saved or the item deleted.
- **phone-fit** (new): the Pixel-landscape budget every scene is held to, the
  legibility floor for text, and the rotate prompt for a phone held upright.
- **house-designer**: floor patterns, and the rule that a person wins a tie
  against furniture when both are under the same tap.
- **world-storage**: the picture of the house shown on the shelf.

## Impact

Documentation only. Every requirement here describes code that is live in v26
and covered by the 241 tests already in the suite.
