## Adding parts without breaking saves

A character is stored as integer indices into the part tables, which is what
lets the whole cast be restyled without touching a save. It also means the
order of those tables is a published interface: inserting a build at index 2
would silently change every saved character that used index 2 or above.

So every new part goes on the **end** of its table, and no existing entry moves
or changes meaning. `PART_COUNTS` grows; `clampSpec` keeps doing what it does
for anything out of range.

## Why builds rather than a "boy" switch

The obvious shape for this is a toggle: girl or boy, which swaps a set of
defaults. It is the wrong shape here for two reasons.

It collapses a range into two points. The creator's whole argument is that
Rotem composes a person out of parts; a switch would make two of the most
visible parts — the silhouette and the hair — stop composing and start being
consequences of something else.

It also makes the game answer a question it should not be asking. A figure with
square shoulders and a crop is a boy if Rotem says it is. The parts should
offer the range and let her decide what she has made, which is how the eight
face shapes and six builds already work.

So: more builds, more haircuts, more brows and mouths, and more complete looks.
No new axis, no switch, nothing to migrate.

## What "reachable" means for the looks

The existing character-looks spec names Hermione, Luna and Anne, because "look
nicer" is not checkable and three named children are. The same test applies
here, and needs its own names — boys who are as different from each other as
those three are:

- **a school boy** — jumper, collar, tie, sensible shoes, hair that has been
  combed by somebody else
- **a scruffy one** — mop of hair, t-shirt, shorts, scuffed boots
- **a small one** — round face, soft crop, dungarees

If a build, a haircut and a look cannot combine into a recognisable version of
each, the parts are not there yet, whatever the counts say.

## What the palettes were doing

The first guess was that the brows and mouths were all drawn too soft. They are
not: a bushy brow and a level mouth were already there at indices 6 and 3. The
parts were fine.

The palettes were not. All eight lip colours are lipsticks, and six of the ten
clothing colours are pink or purple with no navy, green, brown or grey among
the remaining four. So a figure could be given square shoulders, a short back
and sides and a pair of trousers and still come out wearing orchid and a full
face of make-up — and it did, on the first attempt at all three boys.

That is worth writing down because it generalises: when a choice keeps coming
out the same way whatever is selected, the constraint is usually in the range
being offered rather than in the thing being chosen.
