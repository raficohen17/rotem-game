# Tasks

## 1. The model

- [x] 1.1 `js/model/cat.js` — parts, palettes, `createCatSpec`, `clampCatSpec`
- [x] 1.2 Complete cats: tabby, tuxedo, ginger, calico, siamese, black
- [x] 1.3 Cats in `createWorld` and `repairWorld`; an older world gets none
- [x] 1.4 Test: parts are indices, out-of-range falls back, saves survive

## 2. The life

- [x] 2.1 `js/model/catlife.js` — `dueAt`, `decide`, pure and testable
- [x] 2.2 A decision picks a surface in its own room, or the floor, or stays
- [x] 2.3 Test: nothing happens before it is due
- [x] 2.4 Test: a decision only ever looks at its own room
- [x] 2.5 Test: it can choose to stay

## 3. Drawing

- [x] 3.1 `js/render/cat.js` — stand, sit, curl
- [x] 3.2 Coat, markings, ears, tail, eyes, collar
- [x] 3.3 Test: every part index draws something

## 4. The designer

- [x] 4.1 `js/scenes/catcreator.js`, built like the character creator
- [x] 4.2 Reached from the people drawer
- [x] 4.3 Cached option cells, as the character creator does
- [x] 4.4 Under the scene harness: on screen, hittable, legible

## 5. In the house

- [x] 5.1 Drawn in rooms and in the cutaway
- [x] 5.2 Not selectable, no controls, not a walk or action target
- [x] 5.3 Stepped from the frame loop, cheaply

## 6. Checks

- [x] 6.1 `npm test`
- [x] 6.2 Screenshots at 915x412 of the designer and of cats about the house
- [x] 6.3 Measure a frame with cats present against one without
- [x] 6.4 Bump both versions, commit, merge, push
