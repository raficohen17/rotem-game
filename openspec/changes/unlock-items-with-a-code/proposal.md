## Why

Every item in the game is available from the moment it is installed, so there is
nothing to look forward to and no way to give Rotem a present. A code written on
a note — typed into the game, unlocking a gala dress or a magic sword — turns a
new drawing into an occasion instead of a silent catalog entry.

There is no server and there never will be, so the codes have to live in the
app. Doing that needs somewhere to type them, and the one place in the game that
takes typing today — the book title — uses an input parked off screen at
`left: -9999px`. It has no caret, no selection, no paste, and the phone keyboard
can cover the field being typed into. That is the wrong thing to build a second
caller on top of, so it gets fixed first.

## What Changes

- A shared text field: a real, visible `<input>` positioned over the canvas in
  design-space coordinates, which lifts itself clear of the phone keyboard.
- The book title moves onto it, and the off-screen input is deleted.
- A catalog item may carry a `codeHash`. An item that has one is locked until
  its code is entered, and stays unlocked on that device forever.
- Locked items show in the drawer greyed out with a lock, so Rotem can see what
  exists. Tapping one opens the code field for that item rather than placing it.
- A wrong code shakes the field and does nothing else — no error, no counter, no
  lockout.
- `tools/make_code.js` mints the hash for an item id and a code, so a code can be
  minted without hand-editing a hash.

The hash keeps codes out of the source. It is not a security boundary: the whole
game runs on the player's machine, and anyone willing to open devtools can write
straight to the unlock list. That is understood and accepted.

## Capabilities

### New Capabilities
- `text-entry`: typing into the game — a field drawn in the canvas, backed by
  the phone's own keyboard, that stays visible while the keyboard is up.
- `unlockable-items`: items held back behind a code, how a code is redeemed, and
  how a locked item appears in the drawer.

### Modified Capabilities
- `book-design`: the title field becomes the shared text field, and gains the
  requirement that it stays visible while the keyboard is up.

## Impact

- New: `js/model/unlocks.js` (pure, hashing and redemption), `js/ui/textfield.js`
  (the shared field), `tools/make_code.js`.
- Changed: `js/scenes/bookdesigner.js` (drops its private input),
  `js/scenes/room.js` (locked items in the drawer, code entry),
  `js/render/catalog.js` (carries `codeHash` through), `assets/catalog.json`
  (locked entries), `js/model/storage.js` (the unlock list).
- Unlocks are stored under their own key, separate from `rotem.worlds`, because
  they belong to the device and not to any one world.
- No new dependencies, no build step, no network calls.
