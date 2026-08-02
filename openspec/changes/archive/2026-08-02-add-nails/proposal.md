## Why

Rotem asked for gel nails, and she asked for them as one of the things that
arrive with a code. Two of those exist already — a gala dress and a magic sword
— and they work: the padlock in the grid is something to look forward to, and
the note with the code on it is the present.

Nails are also the first part of a character that is genuinely small. A hand is
about ten pixels across at body size, so this is not "add another part": it is
a part that needs somewhere to be seen, the way the face already has.

## What Changes

- **Nails**, as an ordinary part of a character: a shape and a colour she picks,
  free, like her top and her shoes.
- **Two gel designs behind codes**: a French tip and a glitter ombré, chosen
  because both are defined at the tip of the nail, which is the part that
  survives being small.
- **Her colour, their pattern**: a locked design paints itself over the colour
  she already chose rather than replacing it, so it is still her manicure.
- **A hand close-up in the creator**, the way the face parts already get a head
  close-up — otherwise the nails tab shows a whole body with the thing being
  chosen invisible in it.

## Capabilities

### New Capabilities
- `nails`: what nails a character has, how they are painted, and what the two
  designs held back behind a code are.

### Modified Capabilities
- `character-creator`: a cell can frame a hand, not only a head or a whole
  figure, so a part too small to see at body size has somewhere to be seen.

## Impact

- `js/model/character.js` — a nails part and its colour
- `js/model/unlocks.js` — two more rows, and the codes for them
- `js/render/character.js` — nails on the hands, drawn to the size they are
  drawn at
- `js/scenes/charcreator.js` — the hand crop, and the nails tab
