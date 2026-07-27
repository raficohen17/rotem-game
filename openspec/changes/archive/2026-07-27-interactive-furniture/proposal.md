## Why

The shower proved the idea and Rotem wants the rest of the house to work the
same way. Right now two of forty-five items do anything: a book can be read and
a shower can be showered in. Everything else is scenery you push around.

A dolls' house where the bed cannot be slept in is a furniture catalogue. The
gap is most obvious on exactly the things a child reaches for first — the bed,
the sofa, the television, the light switch.

There is also a placement problem. Using something is only possible inside a
room, but the cutaway house is where she actually plays: it is the screen that
shows all four rooms and everybody in them. Sending someone to bed should not
require zooming into a room first.

## What Changes

- **Ten objects gain an action**, chosen for what a seven-year-old reaches for:

  | object | action | what it looks like |
  | --- | --- | --- |
  | bed_single, bed_double | sleep | lying on the mattress, eyes closed |
  | sofa, armchair | sit | seated, legs over the front edge |
  | toilet | sit | seated, lid down |
  | bathtub | bathe | in the water to the shoulders |
  | lamp_floor, lamp_table | light | the lamp lit, a pool of light in the room |
  | tv | watch | the screen lit and flickering |
  | fridge | open | door open, cold light spilling out |
  | stove | cook | a pot on the hob with steam |

  Siblings map to the same actions, so bunk beds and cribs can be slept in and
  a stool can be sat on. A game where the sofa works and the armchair does not
  is a game that looks broken.

- **Interactions work from the cutaway house too.** Tapping a character there
  already picks her up to walk. Picking her up now also offers whatever is
  within reach of her, so the house view is a place to play rather than only a
  place to travel from.

- **Characters can sit and lie down.** Legs currently rotate at the hip only,
  which is enough for a stride and not for a knee. This adds the joint.

## Impact

- `js/model/using.js` — `ACTIONS`, `AFFORDS`, poses
- `js/render/character.js` — a leg frame with a knee, so garments, socks and
  shoes follow the pose rather than each computing their own leg
- `js/render/room.js` — how each action is drawn
- `js/scenes/house.js` — offering actions in the cutaway
- Saved worlds are unaffected: an action is a string on the character, and an
  unknown one is already discarded on load.
