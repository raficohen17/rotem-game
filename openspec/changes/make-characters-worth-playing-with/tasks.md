## 1. Model

- [x] 1.1 Add `layer` and `layerColor` parts, with `none` at index 0
- [x] 1.2 Add `held` (book, wand, basket, flowers, teddy, none) as its own part
- [x] 1.3 Add `socks` and `socksColor`, chosen independently of shoes
- [x] 1.4 Define the looks table: each look writes several parts at once
- [x] 1.5 Test that a character saved before layers loads with every choice intact

## 2. Drawing

- [ ] 2.1 Draw layers over the top in a fixed order: bottom, top, layer, accessories
- [ ] 2.2 Cardigan, coat, cloak, apron and pinafore
- [ ] 2.3 Held items, attached to the hand and rotating with the arm swing
- [ ] 2.4 Socks and tights, between the leg and the shoe
- [ ] 2.5 Hair texture: strand lines following the silhouette, shaded underside
- [ ] 2.6 Give hems a drape rather than a straight horizontal cut

## 3. The three characters

- [ ] 3.1 Hermione: volume in the brown hair, uniform as a set, knee socks, a book
- [ ] 3.2 Luna: long pale wavy hair, an odd accessory, a softer palette
- [ ] 3.3 Anne: red braids, pinafore over a blouse, straw hat, stronger freckles
- [ ] 3.4 Check each against the spec's scenarios by eye, side by side

## 4. Creator

- [ ] 4.1 Add the looks gallery as the first tab
- [ ] 4.2 Regroup the tabs so eighteen parts still fit a phone screen
- [ ] 4.3 Check all twelve top styles by eye — they were changed to the new
      garment shape and never verified

## 5. Ship

- [ ] 5.1 Full test run, version bump in both version.js and sw.js
- [ ] 5.2 Deploy and confirm the live version marker
