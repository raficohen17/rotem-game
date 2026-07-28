## Why

Rotem wants a cat, and a cat is a different kind of thing from everything in
the game so far.

Every character in the house is hers to move: she picks one up, she sends her
walking, she sits her on the sofa. That is the whole interaction model. A cat
that worked the same way would just be a small person — and the reason a child
wants a cat in a dolls' house is precisely that it does its own thing. It sits
where it likes. You come back and it has moved.

So the cat is the first inhabitant she does not control. That is the feature,
not a limitation of it.

## What Changes

- **A cat designer**, alongside the character creator: coat colour and markings,
  ear and tail shape, eyes, a collar. Built the same way as the character
  creator — parts stored as indices, a grid of live previews, complete looks
  for one-tap tabbies, tuxedos and gingers.
- **Cats live in the world** next to characters, with their own room and
  position, and are saved with it.
- **A cat decides for itself, rarely.** About once a minute it picks somewhere
  in its room — the back of the sofa, a table, its own bed, the floor — and
  goes there, or simply stays where it is. It does not pace.
- **A cat is not selectable and has no controls.** She can pet it, and that is
  all. Nothing about it appears in the walk or action buttons.

## Cost

The thing to get right is that this must not cost anything. Four rooms, several
cats, sixty frames a second, on a phone.

So a cat does no work per frame. It carries the time of its next decision, and
a frame compares one number per cat. Only when that time passes does it choose,
which is a handful of array operations, once a minute, per cat. Between
decisions a cat is as cheap to have as a piece of furniture.

Walking there is the same stepper the characters already use, so a cat in
motion costs what a person in motion costs — and it is in motion for a couple
of seconds a minute.

## Impact

- `js/model/cat.js` — parts, palettes, looks, `clampCatSpec`
- `js/model/catlife.js` — the decision, pure and testable
- `js/render/cat.js` — drawing one, in three poses
- `js/model/world.js` — cats in the world, and in `repairWorld`
- `js/scenes/catcreator.js` — the designer
- `js/scenes/room.js`, `js/render/room.js` — placing and drawing them
- Saved worlds without cats load with none, which is what they had
