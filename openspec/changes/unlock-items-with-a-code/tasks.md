## 1. The shared text field

- [x] 1.1 Add `js/ui/textfield.js`: `openTextField(view, rect, opts)` creating a visible `<input>` positioned from `view.cssScale`/`cssOffsetX`/`cssOffsetY`, styled from `COLORS`, font size at least 16px, returning a handle with `close()`, `focus()`, `value()` and `shake()`
- [x] 1.2 Accept `maxLength`, `filter`, `keyboard` and `onChange` from the caller; report the filtered value as it is typed
- [x] 1.3 Reposition on `resize`, and move above the keyboard using `visualViewport` when it would be covered — staying put when `visualViewport` is absent
- [x] 1.4 Move `js/scenes/bookdesigner.js` onto it and delete `createTitleInput` and the `left: -9999px` input
- [x] 1.5 Confirm `npm test` passes, `test/book.test.js` unchanged

## 2. Codes

- [x] 2.1 Add `js/model/unlocks.js` with a synchronous pure-JS `sha256(text)` (no `crypto.subtle`)
- [x] 2.2 Add `lockId(key, index)` → `"<key>:<index>"` and `hashFor(lockId, code)` → `sha256(lockId + ':' + code)`
- [x] 2.3 Add the `LOCKED_PARTS` table with `{ key, index, name, codeHash }`, plus `lockFor(key, index)` and `isLocked(key, index, unlocked)`
- [x] 2.4 Add `redeem(lockId, code, unlocked)` returning the new unlock list, unchanged on a wrong code and idempotent on a repeat
- [x] 2.5 Add `createUnlockStore(backend)` in `js/model/storage.js` over key `rotem.unlocks`, same injected-backend shape as `createStore`, degrading to empty on corrupt or unavailable storage
- [x] 2.6 Add `tools/make_code.js` importing `js/model/unlocks.js`, run as `node tools/make_code.js bottom:10 tyyffk`
- [x] 2.7 Add `test/unlocks.test.js`: right code unlocks, a code minted for one part does not open another, repeat redeem is a no-op, wrong code leaves the list untouched, and the plaintext codes appear in no shipped file

## 3. The gala dress

- [x] 3.1 Bump `PART_COUNTS.bottom` to 11 in `js/model/character.js` (appended, never inserted)
- [x] 3.2 Add `drawGalaGown` to `js/render/character.js` — fitted bodice, shaped neckline, waist seam with a sash, floor-length skirt via `skirt()` at a wider flare and lower hem, satin highlight down the skirt
- [x] 3.3 Route `bottom === 10` through the same branch as `bottom === 4` so the top is not drawn under it
- [x] 3.4 Check the hem clears the floor at both `SIZES` and does not swing through the legs while walking

## 4. The magic sword

- [x] 4.1 Append `'sword'` to `HELD_ITEMS` in `js/model/character.js`
- [x] 4.2 Draw it in `drawHeld` as `case 6`: blade, crossguard, wrapped grip, gem in the pommel, pale edge along the blade
- [x] 4.3 Rotate from the arm origin so the blade rides clear of the leg and the body, standing and walking, at both sizes
- [x] 4.4 Confirm nothing is drawn outside the design space (`test/phone.test.js`, `test/portrait.test.js`)

## 5. Locked options in the creator

- [x] 5.1 Load the unlock list into `game` at startup in `js/main.js` and pass it to the character creator
- [x] 5.2 Mark option buttons for locked parts in `optionControls()` in `js/scenes/charcreator.js`
- [x] 5.3 Draw a locked option dimmed with a lock badge; add the lock icon to `js/ui/icons.js` if it is not there
- [x] 5.4 On tapping a locked option, open the shared field for that part's code with its name shown, lowercase filter, `maxLength` 6 — do not change the character
- [x] 5.5 On a correct code, persist the unlock, close the field and select the part; on a wrong code, shake the field and keep what was typed
- [x] 5.6 Confirm a character already wearing a locked part still draws when the unlock list is empty

## 6. Finishing

- [x] 6.1 Add `test/unlockui.test.js` covering the locked option in the grid, the tap opening the field, and the character not changing
- [x] 6.2 Extend `test/character.test.js` for the new `bottom` and `held` counts and that `countCombinations()` has grown
- [x] 6.3 Mint the two codes, write their hashes into `LOCKED_PARTS`, and record the codes outside the repo
- [x] 6.4 Run `npm test` and check the creator on the phone at both sizes
- [x] 6.5 Note the codes feature in `README.md`, including that the lock is not a security boundary

## 7. A second gown

- [x] 7.1 Bump `PART_COUNTS.bottom` to 12 and route `bottom === 11` to a new `drawGlitterGown`
- [x] 7.2 Draw it as a mermaid column — plunging sweetheart, jewelled shoulder strands, beading along the seams — so it differs from the gala gown in silhouette and not only in trim
- [x] 7.3 Skip the stones when `FINE` is false, and place them off a fixed pattern so cached option cells do not twinkle
- [x] 7.4 Shorten the stride for floor-length bottoms so the legs stay inside the gown while walking
- [x] 7.5 Add the `bottom:11` row to `LOCKED_PARTS`, mint its code, and extend the unlock tests to try every code against every other lock
- [x] 7.6 Add a silhouette test: in a gown, walking is no wider than standing; trousers still stride
