## Why

Every part in the character creator is available from the moment the game is
installed, so there is nothing to look forward to and no way to give Rotem a
present. A code written on a note — typed into the game, unlocking a gala dress
or a magic sword — turns a new part into an occasion instead of a silent extra
swatch.

The first two things behind a code are deliberately a step up from the free
wardrobe. A locked part that looks like the others is not worth wanting.

There is no server and there never will be, so the codes have to live in the
app. Doing that needs somewhere to type them, and the one place in the game that
takes typing today — the book title — uses an input parked off screen at
`left: -9999px`. It has no caret, no selection, no paste, and the phone keyboard
can cover the field being typed into. That is the wrong thing to build a second
caller on top of, so it gets fixed first.

## What Changes

**A shared text field**
- A real, visible `<input>` positioned over the canvas in design-space
  coordinates, which lifts itself clear of the phone keyboard.
- The book title moves onto it, and the off-screen input is deleted.

**Codes**
- A character part may be locked behind a code. Entering it unlocks that part on
  that device, forever.
- Locked parts show in the creator greyed with a lock, so Rotem can see what
  exists. Tapping one opens the code field for that part rather than selecting
  it.
- A wrong code shakes the field and does nothing else — no error, no counter, no
  lockout.
- `tools/make_code.js` mints the hash for a part and a code.

**The first two locked parts**
- A **gala dress** — a new `bottom` style, drawn as a floor-length classic gown
  (fitted bodice, defined waist, full skirt), replacing the top the way the
  existing dress does. Classic, not costume.
- A **magic sword** — a new `held` style, carried in the swinging hand, angled
  so the blade rides clear of the body.

The hash keeps codes out of the source. It is not a security boundary: the whole
game runs on the player's machine, and anyone willing to open devtools can write
straight to the unlock list. That is understood and accepted.

## Capabilities

### New Capabilities
- `text-entry`: typing into the game — a field drawn in the canvas, backed by
  the phone's own keyboard, that stays visible while the keyboard is up.
- `unlockable-parts`: parts held back behind a code, how a code is redeemed, and
  how a locked part appears in the creator.

### Modified Capabilities
- `book-design`: the title field becomes the shared text field, and gains the
  requirement that it stays visible while the keyboard is up.
- `character-creator`: the option grid gains a locked state, and the wardrobe
  gains the gala dress and the magic sword.

## Impact

- New: `js/model/unlocks.js` (pure — hashing, the locked-part table, redemption),
  `js/ui/textfield.js` (the shared field), `tools/make_code.js`.
- Changed: `js/scenes/bookdesigner.js` (drops its private input),
  `js/scenes/charcreator.js` (locked options, code entry),
  `js/model/character.js` (`PART_COUNTS.bottom`, `HELD_ITEMS`),
  `js/render/character.js` (the gown and the sword),
  `js/model/storage.js` (the unlock list).
- Not changed: `assets/catalog.json`, `js/render/catalog.js`, `js/scenes/room.js`.
  The furniture drawer is untouched — both locked things are worn, not placed.
- Unlocks are stored under their own key, separate from `rotem.worlds`, because
  they belong to the device and not to any one world.
- No new dependencies, no build step, no network calls.
