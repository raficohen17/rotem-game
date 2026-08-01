## Context

The game is a static PWA: no build step, no dependencies, no server, no network
calls. Everything ships in the folder and runs on Rotem's Pixel. Logic lives in
`js/model/` as pure functions covered by `node:test`; `js/render/` and `js/ui/`
draw; `js/scenes/` wire the two together.

A character is stored as a set of part indices (`js/model/character.js`), and
`js/scenes/charcreator.js` builds its option grid straight from `PART_COUNTS` —
so a new style is a bumped number plus drawing code, with no UI work. That is
where both locked things belong: a gala dress and a magic sword are worn, not
placed, so `assets/catalog.json` and the furniture drawer are not involved.

The other half is a text field. The only typing in the game today is the book
title, done through an input parked at `left: -9999px` — invisible, so no caret,
no selection, no paste, and nothing stopping the phone keyboard from covering
the field.

## Goals / Non-Goals

**Goals:**
- One text field used by both the book title and code entry, visible, and never
  hidden under the phone keyboard.
- A code unlocks exactly one part, on that device, forever.
- The hashing half is pure and synchronous so `node:test` covers it.
- Two locked parts that visibly outclass the free wardrobe.

**Non-Goals:**
- Real payments, accounts, receipts, or any network call. There is no server and
  the README promises there never will be.
- Protection against an adult with devtools. See Risks.
- Locking catalog furniture. Nothing in this change touches the drawer, though
  the same unlock list would serve it later.
- A sword that cuts, breaks or hits anything. See the decision below.

## Decisions

### A pure-JS SHA-256 in `js/model/`, not `crypto.subtle`

`crypto.subtle` is only defined in a secure context. Installed over HTTPS that is
fine, but the game is also served off a laptop with `python3 -m http.server` and
opened from the phone at `http://192.168.x.x:8080`, which is not a secure
context — `crypto.subtle` would be `undefined` and every code would fail on the
one setup used while developing. It is also async, which would push `async` into
the model layer and out of the synchronous `node:test` style every other model
file is written in.

A ~40-line SHA-256 has neither problem. *Alternative considered:* a short
non-cryptographic hash (FNV-1a, djb2). Rejected not for strength — at six
characters neither resists a brute force — but because a 32-bit digest makes
accidental collisions conceivable, and "a wrong code opened the dress" is a bug
with no explanation Rotem would accept.

### The code is salted with the lock id

The stored value is `sha256(lockId + ":" + code)`, where a lock id is
`"<partKey>:<index>"` — `bottom:10`, `held:6`. Without the salt, one code reused
across two parts unlocks both, and picking codes would silently require them to
be globally distinct. With it, a code only ever opens the part it was minted for.

### Locked parts are a table in `js/model/unlocks.js`

```
LOCKED_PARTS = [
  { key: 'bottom', index: 10, name: 'Gala dress',  codeHash: '…' },
  { key: 'held',   index: 6,  name: 'Magic sword', codeHash: '…' },
]
```

A table rather than a catalog field, because parts are not catalog entries —
they have always been an index plus drawing code, so a locked part costing one
table row is consistent with how every other part is added. The README's "adding
an item is a PNG and a catalog entry, no code change" promise is about placeable
furniture and is untouched.

### The unlock list stores lock ids, not codes

`localStorage['rotem.unlocks']` holds `["bottom:10", ...]`. Storing codes would
mean a code could not be changed after it was given out, and would leave
plaintext codes on the device for the next locked part to be guessed from.

### Unlocks live under their own key

`rotem.worlds` holds worlds; unlocks belong to the device, not to any one world.
A new world must not arrive locked again, and deleting a world must not take the
gala dress with it. Same injected-backend pattern as `createStore`, so tests pass
a plain object.

### A locked part is shown, greyed, not hidden

Rotem seeing the sword she does not have yet is the point; a hidden part cannot
be looked forward to. The option button draws at low alpha with a lock badge, and
tapping it opens the code field for that part instead of selecting it.

*Alternative considered:* hiding locked parts so an unlock is a surprise. It
makes a better single moment and a worse week — nothing to want, and no way to
ask for a specific thing.

### A wrong code shakes and says nothing

`house-designer` already requires that play cannot fail. An error message, a
retry counter or a lockout would all be a way to lose at a game that has none.
The field shakes, keeps what was typed, and stays open.

### Clamping keeps a locked index out of a saved character

`clampSpec` already pins every index into `PART_COUNTS`, so bumping a count
cannot break a saved character. A locked index is a legal value — the lock lives
in the creator's selection, not in the spec — so a character wearing the gala
dress still draws correctly if the unlock list is later cleared. That is
deliberate: losing site data should not undress somebody Rotem made.

### The text field is a real input positioned over the canvas

`View` already exposes `cssScale`, `cssOffsetX` and `cssOffsetY`, so a design
space rect maps to a CSS rect with `x * cssScale + cssOffsetX`. The field is
styled from `COLORS` in `js/ui/widgets.js` to sit in the drawn UI, and
re-positions on resize. Font size is kept at or above 16px, below which mobile
browsers zoom the page on focus.

Keyboard avoidance uses `visualViewport`: when the keyboard shrinks the viewport
enough to cover the field, the field moves up to sit just above it. Where
`visualViewport` is missing the field stays put, which is exactly today's
behaviour and no worse.

*Alternative considered:* a keyboard drawn in canvas, which would avoid the DOM
entirely and be consistent with the rest of the game. Rejected for the reason
already recorded in `bookdesigner.js`: it would be considerably worse to use
than the keyboard Rotem already knows.

### The gala dress is a `bottom` style that replaces the top

`bottom === 4` already means "a dress" and skips `drawTop`. The gown takes the
same route at index 10. Drawn as a fitted bodice to a defined waist, then a
floor-length skirt built from the existing `skirt()` helper at a wider flare and
a lower hem, with a satin highlight down the skirt and a sash at the waist.

What makes it read as a step up is detail the free tops do not have: a shaped
neckline, a waist seam, and a hem that clears the floor rather than ending at
the shin. Classic — one colour, one silhouette, no cutouts or asymmetry.

### The magic sword is a `held` style, and it does not cut anything

`drawHeld` attaches to the arm transform, so a held thing already swings with
her as she walks. The sword is drawn from that origin rotated so the blade rides
down and away from the leg rather than through it — the wand at index 2 already
establishes the rotate-then-draw pattern, and a sword is longer, so the angle
matters more. It gets a crossguard, a wrapped grip and a gem in the pommel, with
a pale edge along the blade for the magic.

It does **not** interact with other objects. The verbs in this game live in the
`ACTIONS` table in `js/model/using.js`, and every one of them is an occupation —
read, sit, bathe, write. A sword that hits or cuts would be the first way to
break something in a game whose `house-designer` spec says play cannot fail.

*Alternative considered:* the sword as a catalog item with a `wield` action and
`carried: true`, like a book — placed in a room, picked up, put down. That is a
real option and the machinery for it already exists, but it makes the sword
something lying on a bedroom floor rather than something her character *has*,
and it would need the drawer to grow a lock as well. If it should later also be
a thing she picks up, that is a catalog entry plus an `ACTIONS` row, and none of
the unlock machinery changes.

### `tools/make_code.js` imports the same hash

The minting tool and the game share `js/model/unlocks.js`, so the hash cannot
drift between what is written into the table and what the game checks. Run as
`node tools/make_code.js bottom:10 tyyffk`.

## Risks / Trade-offs

- **The lock is not a security boundary.** Everything runs on the player's
  machine; anyone can write to `rotem.unlocks` from devtools or read the check
  out of the source. → Accepted, and stated in the proposal. The hash exists to
  keep codes out of a readable file, not to withstand attack. Nothing of value
  is behind it.
- **Clearing site data or reinstalling the PWA wipes unlocks.** → Codes are
  re-enterable and never expire, so recovery is retyping them. Keep the notes.
  Characters already wearing a locked part are unaffected, by the clamping
  decision above.
- **A real DOM input is harder to test than a pure function.** → The split is
  deliberate: hashing and redemption are pure and land in `js/model/unlocks.js`
  under `node:test`; the field itself is `js/ui/` and is exercised through the
  existing scene harness, checking that the scene opens and closes it and where
  it is placed.
- **A long sword can clip the body or leave the design space.** → It is drawn
  and checked at both `SIZES`, walking and standing; `phone-fit` already forbids
  drawing outside the design space and its test covers the creator.
- **Touching `bookdesigner.js` risks regressing book titles.** → The book title
  tests run unchanged against the new field; behaviour is meant to be identical
  apart from the field becoming visible.
- **A gown drawn at option-grid size may be unreadable.** → The creator previews
  a part on a whole figure, and the grid cell is small. Checked against the
  existing dress at index 4, which is the closest thing already shipping.
