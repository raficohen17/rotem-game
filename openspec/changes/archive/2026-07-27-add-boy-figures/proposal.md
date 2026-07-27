## Why

Rotem asked for boys. The creator cannot make one.

That is not a matter of taste, it is a gap in the parts. Of fourteen
hairstyles, thirteen are long or styled long — waves, a bob, a ponytail,
plaits, a bun, curls, space buns, a beehive — and the one short cut is a pixie.
Of six builds, every one is drawn from the same narrow-shouldered template, and
the widest hips in the set belong to the two that read most feminine. All six
complete looks are girls' outfits.

So the honest description of the creator today is that it makes girls, in a
range of eight faces and six builds. Pick "average", give her trousers and the
pixie crop, and you get a girl with short hair — because the shoulders, the
waist and every one of the six looks still say so.

This matters beyond boys. The whole point of the parts system is that Rotem's
choices compose; a dimension the parts cannot express is a dimension she cannot
play with. Her brother, a dad, a friend from school — none of them are
reachable, and she will notice, because a dolls' house with only girls in it is
a dolls' house missing half the people.

The earlier note that this is "a girls' game" is not in tension with this. It
means the game is *for* her. It does not mean the world she builds has to be.

## What Changes

- **Builds that are not all one shape.** Add builds with square shoulders, a
  straight waist and narrow hips, across the same range of heights as the
  existing set, so a boy can be small, average or lanky rather than only one
  size. Existing builds keep their indices, so every saved character is
  untouched.
- **Short haircuts.** Add cuts that read as boys' hair at a glance — a short
  back and sides, a mop, short curls, a crop with a fringe, a buzz. These are
  hairstyles, not "boy hairstyles": any of them can go on any figure, exactly
  as the pixie already can.
- **Complete boy looks.** Add looks alongside School, Dreamer, Orchard, Party,
  Cosy and Explorer, so one tap reaches a dressed boy the same way it reaches a
  dressed girl. As with the existing looks, the test is whether specific
  children are reachable rather than whether the parts exist.
- **Palettes that are not all sweets.** Every one of the eight lip colours is a
  lipstick, and six of the ten clothing colours are pink or purple with no
  navy, green, brown or grey among the rest. Add neutral tones to both. This
  turned out to matter more than any of the above: with the old palette a
  figure given square shoulders, a crop and trousers still came out made-up
  and dressed in orchid.

## Impact

- `js/model/character.js` — `BUILDS`, `PART_COUNTS.hair`, `LIP_COLORS`,
  `CLOTH_COLORS`, `LOOKS`
- `js/render/character.js` — new hair cases
- `js/scenes/charcreator.js` — the looks grid, which was fixed at six
- Saved worlds are unaffected: parts are stored as indices and every existing
  index keeps its meaning. Only new indices are added on the end.
