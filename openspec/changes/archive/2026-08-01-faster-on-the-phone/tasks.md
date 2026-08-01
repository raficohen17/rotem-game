# Tasks

- [x] 4.1 A bench that times every scene on a full street, and a baseline
- [x] 4.2 Item art painted once into bitmaps — MEASURED WORSE (room 17.5 → 21.6),
      reverted: a blit at a fractional position resamples, and paths are faster
- [x] 4.3 No soft shadow where it cannot be seen — the cutaway's four rooms at
      43%, people on the pavement, thumbnails: cutaway 27.4 → 13.5 ms
- [x] 4.4 No soft shadow behind furniture in a room, which still has its own
      ground shadow: room 17.2 → 9.8 ms
- [x] 4.5 Half the device pixels: capped at 1.5 rather than 2, about −28%
- [x] 4.6 The room shell drawn once — MEASURED NOT WORTH IT: the whole shell is
      0.24 ms, and grass 0.60 ms
- [x] 4.7 Shadow only behind a character's body and clothes, not all eleven
      layers: 0.65 → 0.43 ms each. Dropping only the small layers first saved
      nothing, which is what said the cost is area rather than set-up
- [x] 4.8 A frame rate that suits a dolls' house: 121 drawn frames a second
      became 30, with the world still updating on every frame
- [x] 4.9 Measured what was left: what remains is the art itself
- [x] 4.10 Measure it all again, check every scene still draws, ship
