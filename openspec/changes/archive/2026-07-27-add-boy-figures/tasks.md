# Tasks

## 1. Builds

- [x] 1.1 Add boyish builds to `BUILDS`, appended so existing indices hold
- [x] 1.2 Cover short, average and tall in the new shapes
- [x] 1.3 Test: at least one build has shoulders wider than hips, at two heights
- [x] 1.4 Test: no two builds are the same figure scaled

## 2. Haircuts

- [x] 2.1 Add short cuts to the hair renderer, appended after index 13
- [x] 2.2 Bump `PART_COUNTS.hair`
- [x] 2.3 Test: every hair index draws something distinct
- [x] 2.4 Check each new cut on a broad build and a petite one

## 3. Palettes

Brows and mouths turned out not to be the gap — a bushy brow and a level mouth
were already there at indices 6 and 3. The palettes were.

- [x] 3.1 Append natural lip tones to `LIP_COLORS`
- [x] 3.2 Append navy, green, brown, grey and red to `CLOTH_COLORS`
- [x] 3.3 Test: a natural lip tone exists and the wardrobe is not all sweets

## 4. Looks

The looks grid was fixed at three per row on a 230px step, so the seventh look
started a row that ran to y=802 on a 720-tall canvas. The scene harness caught
it the moment the looks were added.

- [x] 4.0 Size the looks grid from the number of looks
- [x] 4.1 Add boy looks to `LOOKS`
- [x] 4.2 Test: every look sets every garment slot it names
- [x] 4.3 Test: applying a look leaves nothing from the previous one

## 5. Check it by looking

- [x] 5.1 Render a sheet of the new builds and cuts and judge them
- [x] 5.2 Build the school boy, the scruffy one and the small one; screenshot
- [x] 5.3 Confirm existing saved characters are unchanged
- [x] 5.4 `npm test`, bump the version in both files, commit, merge, push
