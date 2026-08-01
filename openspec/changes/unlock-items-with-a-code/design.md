## Context

The game is a static PWA: no build step, no dependencies, no server, no network
calls. Everything ships in the folder and runs on Rotem's Pixel. Logic lives in
`js/model/` as pure functions covered by `node:test`; `js/render/` and
`js/ui/` draw; `js/scenes/` wire the two together. Items come from
`assets/catalog.json`, and the README promises that adding one is a PNG plus a
catalog entry and no code change.

Two things are being built. The first is a shared text field, because the only
typing in the game today is the book title and it is done through an input
parked at `left: -9999px` — invisible, so no caret, no selection, no paste, and
nothing stopping the phone keyboard from covering the field. The second is the
codes themselves, which need that field.

## Goals / Non-Goals

**Goals:**
- One text field used by both the book title and code entry, visible, and never
  hidden under the phone keyboard.
- A code unlocks exactly one item, on that device, forever.
- Adding a locked item stays a PNG plus a catalog entry — no code change.
- The hashing half is pure and synchronous so `node:test` covers it.

**Non-Goals:**
- Real payments, accounts, receipts, or any network call. There is no server and
  the README promises there never will be.
- Protection against an adult with devtools. See Risks.
- Packs, bundles, or an in-game store. One code, one item.
- Codes that expire, are used up, or differ per device.

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

### The code is salted with the item id

The stored value is `sha256(itemId + ":" + code)`. Without the salt, one code
reused across two items produces the same hash and unlocks both, and picking
codes would silently require them to be globally distinct. With it, a code only
ever opens the item it was minted for.

### The unlock list stores item ids, not codes

`localStorage['rotem.unlocks']` holds `["gala_dress_1", ...]`. Storing codes
would mean a code could not be changed after it was given out, and would leave
plaintext codes on the device for the next locked item to be guessed from.

### Unlocks live under their own key

`rotem.worlds` holds worlds; unlocks belong to the device, not to any one world.
A new world must not arrive locked again, and deleting a world must not take the
gala dress with it. Same injected-backend pattern as `createStore`, so tests pass
a plain object.

### `codeHash` is a catalog field

A locked item is an ordinary `assets/catalog.json` entry that also carries
`codeHash`. This keeps the README's promise intact — locking a new drawing is
still one entry and no code change. `loadCatalog` passes the field through, and
`inCategory` keeps returning locked items, because the drawer has to show them.

### Locked items are shown, greyed, not hidden

Rotem seeing the sword she does not have yet is the point; a hidden item cannot
be looked forward to. Tapping a locked item opens the code field for that item
instead of starting a drag.

*Alternative considered:* hiding locked items so an unlock is a surprise. It
makes a better single moment and a worse week — nothing to want, and no way to
ask for a specific thing.

### A wrong code shakes and says nothing

`house-designer` already requires that play cannot fail. An error message, a
retry counter or a lockout would all be a way to lose at a game that has none.
The field shakes, keeps what was typed, and stays open.

### The text field is a real input positioned over the canvas

`View` already exposes `cssScale`, `cssOffsetX` and `cssOffsetY`, so a design
space rect maps to a CSS rect with `x * cssScale + cssOffsetX`. The field is
styled to sit in the drawn UI and re-positions on resize. Font size is kept at or
above 16px, below which mobile browsers zoom the page on focus.

Keyboard avoidance uses `visualViewport`: when the keyboard shrinks the viewport
enough to cover the field, the field moves up to sit just above it. Where
`visualViewport` is missing the field stays put, which is exactly today's
behaviour and no worse.

*Alternative considered:* a keyboard drawn in canvas, which would avoid the DOM
entirely and be consistent with the rest of the game. Rejected for the reason
already recorded in `bookdesigner.js`: it would be considerably worse to use
than the keyboard Rotem already knows.

### `tools/make_code.js` imports the same hash

The minting tool and the game share `js/model/unlocks.js`, so the hash cannot
drift between what is written into the catalog and what the game checks. Run as
`node tools/make_code.js gala_dress_1 tyyffk`.

## Risks / Trade-offs

- **The lock is not a security boundary.** Everything runs on the player's
  machine; anyone can write to `rotem.unlocks` from devtools or read the check
  out of the source. → Accepted, and stated in the proposal. The hash exists to
  keep codes out of a readable file, not to withstand attack. Nothing of value
  is behind it.
- **Clearing site data or reinstalling the PWA wipes unlocks.** → Codes are
  re-enterable and never expire, so recovery is retyping them. Keep the notes.
- **A real DOM input is harder to test than a pure function.** → The split is
  deliberate: hashing and redemption are pure and land in `js/model/unlocks.js`
  under `node:test`; the field itself is `js/ui/` and is exercised through the
  existing scene harness, checking that the scene opens and closes it and where
  it is placed.
- **A visible input can be styled wrongly enough to look foreign in the game.**
  → It borrows `COLORS` from `js/ui/widgets.js` and is checked on the phone
  against the drawn panels around it.
- **Touching `bookdesigner.js` risks regressing book titles.** → The book title
  tests run unchanged against the new field; behaviour is meant to be identical
  apart from the field becoming visible.
