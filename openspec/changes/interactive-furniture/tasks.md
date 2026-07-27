# Tasks

## 1. Actions that need no new pose

- [x] 1.1 `light` — lamp_floor, lamp_table; lit lamp and a pool of light
- [x] 1.2 `watch` — tv; lit screen that flickers
- [x] 1.3 `open` — fridge; door open, cold light
- [x] 1.4 `cook` — stove; pot and steam
- [x] 1.5 These are on the object, not the character: the lamp stays lit when
      she walks away

## 2. A knee, so she can sit and lie

- [x] 2.1 Seating is a shift of hipY — everything above it derives from that
      one number, so no separate leg frame was needed after all
- [x] 2.2 `stand` reproduces today's drawing exactly
- [x] 2.3 `sit` — thigh forward, shin down
- [x] 2.4 `lie` — horizontal
- [x] 2.5 Garments, socks and shoes follow the frame

## 3. Actions that use the pose

- [x] 3.1 `sleep` — beds, eyes closed
- [x] 3.2 `sit` — sofa, armchair, chair, stool, beanbag, toilet
- [x] 3.3 `bathe` — bathtub, in the water to the shoulders
- [x] 3.4 Anchor each to the object: seat height, mattress height

## 4. The cutaway house

- [ ] 4.1 Offer actions for what is in reach of a picked-up character
- [ ] 4.2 Keep them clear of the walk buttons
- [ ] 4.3 Test: neither set overlaps the other

## 5. Checks

- [x] 5.1 Every affording id is a real catalog item
- [x] 5.2 Every sibling of a usable item affords the same action
- [x] 5.3 Every action's icon exists
- [ ] 5.4 The scene harness passes for each pose
- [ ] 5.5 Screenshots at 915x412 of every new action
- [ ] 5.6 `npm test`, bump both versions, commit, merge, push
