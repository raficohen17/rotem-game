## Context

A character is a spec of integers: each part is an index, each colour is an
index into a palette. Parts are drawn in `js/render/character.js` from a
skeleton built for the chosen build and size, and chosen in a rail of tabs in
the creator. Two parts are already held back behind a code, checked against a
salted SHA-256 that ships in `js/model/unlocks.js`.

The hand is `fillEllipse(0, armLen + 2, armW * 0.5, armW * 0.62)` — about 14 by
17 units, which on the phone is ten pixels across in a room and about forty in
the creator's preview. That single fact drives most of what follows.

## Goals / Non-Goals

**Goals:**
- Nails as an ordinary part: shape, colour, hers, free.
- Two gel designs that arrive with a code and look like the thing they are
  named after.
- Somewhere in the creator where a nail is big enough to choose.
- Nothing already saved changes: index 0 is what every existing character
  already has.

**Non-Goals:**
- Painting individual fingers. At this scale a hand is a shape, not five
  fingers, and pretending otherwise would be five sub-pixel rectangles.
- A manicure scene, a nail salon, or drying time. She asked for nails.
- Making the codes secure. They are not, they never were, and the spec for the
  existing locks says so.

## Decisions

**Nails are a part and a colour, like every other part.** `nails` picks the
shape and finish, `nailColor` picks the colour from the cloth palette she
already knows. The alternative — a single combined "manicure" index — would
have needed a new palette per design and would have made the two locked designs
fixed colours rather than hers.

**Six free shapes, so the part earns its tab.** The codified rule is that a
part with fewer than six options does nothing visible enough to be worth a tab,
with size the one exception (two options, each redrawing the whole figure).
Nails are not that exception: bare, short, round, almond, square and long are
six genuinely different silhouettes at the size a hand is drawn in the preview.

**The locked designs are appended, never inserted.** Indices 6 and 7. Every
table in this game is append-only for the same reason: an index is stored in
the save, so moving one silently repaints every character already made.

**A locked design paints over her colour rather than replacing it.** The French
tip is her colour with a white crescent at the tip; the ombré is her colour
fading into glitter. Both read as "her nails, done nicely" rather than as a
sticker, and both keep working whichever of the ten colours she picked.

**The two designs are the two that survive being small.** Both are defined at
the tip of the nail. A design defined in the middle — a flower, a heart, a
marble swirl — is a smudge at forty pixels a hand and invisible at ten. This is
the same reasoning that took the eyebrows off a character in the cutaway.

**A hand crop in the creator, alongside the head crop.** `cropFor` already
returns `feature`, `head` or `body`; this adds `hand`, framed on the hand the
way `head` is framed on the head, using the skeleton's own arm measurements so
it follows the build and the size rather than a constant. Without it the nails
tab would be twelve cells of identical whole bodies.

**Nails obey the size rule.** They are drawn through `worthDrawing`, so they
are painted in a room and in the creator, and not in the cutaway where a hand
is four pixels. That is the rule the last round of work established, and nails
are exactly what it was written for.

## Risks / Trade-offs

**A nail is small even in the preview** → the shapes differ in silhouette
(length and tip) rather than in detail, and the cells frame the hand rather
than the figure. If a shape cannot be told from its neighbour in a cell, it is
not worth having: the check is a screenshot of the tab at 915x412, magnified,
before any of it is kept.

**Two more codes to keep somewhere** → they go where the other three are: a
hash in `unlocks.js` and the plain code reported once, to the parent, in the
message that ships them. Nothing else in the repository knows them.

**The nails tab makes sixteen tabs in the creator rail** → the rail already
wraps into two columns and is checked by a test that every tab is on screen at
a hittable size. If the sixteenth breaks that, the rail changes, not the test.

## Migration Plan

None needed. `nails: 0` and `nailColor: <default>` are filled in by `clampSpec`
for every character already saved, and index 0 is bare nails, which is what
every character already has.
