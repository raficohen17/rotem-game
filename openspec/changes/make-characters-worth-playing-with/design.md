## Context

The character system has been rebuilt three times in one day, each time in
response to the same complaint arriving in different words. It is worth being
precise about what is actually wrong, because "make it prettier" has now failed
three times and a fourth attempt at the same thing will fail too.

What was fixed and is not the problem any more:

- The head is a parametric skull with eight face shapes, not a circle.
- Eyes have a sclera, iris, pupil, highlight and lid. Brows are their own part.
- Six builds change the skeleton — shoulder, waist, hip and leg length.
- The palette is a dressing-up box rather than earth tones.
- 142 billion combinations, held above a floor by a test.

What is still wrong, stated as precisely as I can:

**The figures are assembled, not designed.** Each part is drawn in isolation
and composited. A real character design decides the silhouette first and then
fills it in; this one decides eighteen things separately and hopes. That is why
adding more options has not helped and will not: the problem is not the number
of parts, it is that nothing coordinates them.

Three named characters make this checkable. Take Hermione: brown hair with real
volume, a school uniform *as a set* — pleated skirt, white collar, striped tie,
grey jumper, knee socks — plus a book or a wand. The game has the skirt, the
tie and the jumper. It cannot layer them over a collared shirt, has no socks,
and nothing to hold. So the closest reachable result is a girl in a jumper, and
the difference between that and Hermione is precisely the coordination.

## Goals / Non-Goals

**Goals:**

- A recognisable Hermione, Luna and Anne are all reachable, and reaching each
  takes a child under a minute from the gallery.
- Clothing layers, so an outfit is built up rather than swapped out.
- Garments drape rather than ending in straight lines.
- Every character already saved on Rotem's phone still loads and still looks
  like herself.

**Non-Goals:**

- Licensed likenesses. These are reference points for silhouette and palette,
  not portraits, and nothing is named in the game.
- More part *counts* for their own sake. The combination floor is already
  cleared by four orders of magnitude; adding a fifteenth hairstyle is not what
  is missing.
- Animation beyond the walk cycle that already exists.

## Decisions

### Outfits set several parts at once, and stay editable

A "look" writes top, bottom, shoes, layer and accessory together, then leaves
every one of them adjustable. This is the smallest change that addresses the
actual defect: coordination. It also gives a child a starting point, which
eighteen tabs on a blank character does not.

Rejected: locking outfits so they cannot be edited. It would guarantee they
look right and would take the game away from her, which is the opposite of the
point.

### Layering is a new part, not a replacement

`layer` sits over the top: cardigan, coat, cloak, apron, pinafore, none. A
separate part rather than more top styles, because the whole problem is that a
top and a cardigan are currently the same slot and cannot coexist.

The cost is a wider spec and another migration. `clampSpec` already fills
missing parts with defaults, so old saves gain `layer: none` and are unchanged
— which is exactly the case the forward-compatibility work was for.

### Held items, not only worn ones

A wand, a book, a basket. These attach to the hand at the end of the arm and
rotate with the arm swing, so they need the arm transform rather than the head
transform every other accessory uses. Worth the plumbing: a character holding
something reads as a character doing something.

### Hair gets texture

Every hairstyle is one flat colour, which is most of why hair reads as a shape
rather than as hair. Strand lines following the silhouette, a sheen already
exists, and a slightly darker underside. Anne's braids and Luna's waves are
unreachable without it.

## Risks / Trade-offs

- **A fourth restyle also misses.** → This is the reason the brief is three
  named characters: it is checkable rather than a matter of taste. If Hermione,
  Luna and Anne are not reachable at the end, it failed, and that is a fact
  rather than an opinion.
- **Layering doubles the drawing order's complexity** → layers draw in a fixed
  sequence with no options about it: bottom, top, layer, accessories.
- **Saved characters change appearance** → parts are indices and old specs gain
  defaults, so a saved character keeps every choice she had. A test covers
  loading a pre-layer character specifically.
- **The creator is running out of room** — eighteen tabs in a two-column strip
  is near the limit of a phone screen → the gallery becomes the first tab, and
  parts group under it rather than all being peers.
- **Scope**: this is the largest single change since v1 and it is being done
  unattended overnight. Each piece ships separately behind its own commit so a
  bad one can be reverted without losing the rest.

## Open Questions

- Should socks and tights be part of `shoes` or their own part? Leaning their
  own, since knee socks under a pleated skirt is half of a school uniform.
- Is a held item worth a whole part, or should it live in `extra`? Leaning
  its own, because `extra` is worn on the head and a hand is not a head.
