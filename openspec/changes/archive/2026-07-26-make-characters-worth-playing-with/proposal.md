## Why

v1 shipped and Rotem can play it. Everything since has been feedback on the
same theme, said several different ways:

- "the character design is very boring", "pretty ugly"
- "I want more Barbie / Disney princess — it's a girls' game"
- "a Hermione or a Malibu Barbie depending on the choices"
- "not cardboard people — Hermione, Luna, Anne of Green Gables"

Each round fixed a real defect: the head became a parametric skull rather than
a circle, builds became configurable, the wardrobe grew, the palette warmed.
But the last note is the one that still stands. The figures are **assembled**
rather than **designed** — every part is drawn independently and dropped into
place, so the result reads as a kit of parts rather than as somebody.

Naming three specific characters is the most useful brief given so far,
because it is checkable. Hermione, Luna and Anne are not three hairstyles.
They are three silhouettes, three palettes, three sets of details that hang
together. If the creator cannot reach a recognisable version of each, it is not
finished — and it currently cannot.

The house also gained stairs, doors and walking today, and the room and
furniture art was rebuilt on a material system. Those are done and archived.
This change is about the people.

## What Changes

- **Outfits as whole looks, not separate garments.** A top, a bottom and shoes
  chosen independently will always look assembled. Add complete outfits that
  set several parts at once and can then be adjusted — a pinafore over a
  blouse, a school uniform, a winter coat over a dress.
- **Layering.** A cardigan over a dress, a coat over a jumper, tights under a
  skirt. Currently a character wears exactly one top and one bottom, which is
  why nothing looks put together.
- **Garment shapes that follow the build.** The current garments follow the
  torso widths but not its curve; hems are straight lines where they should
  drape.
- **Character-defining accessories**: a satchel, a book, a wand, a straw hat,
  round spectacles, a scarf, a cloak. Held and worn items, not only head
  pieces.
- **Freckles, hair texture and skin variation** — Anne is unreachable without
  freckles that read at a glance, and every hairstyle is currently one flat
  colour.
- **A "looks" gallery**: a starting point Rotem can pick and then change,
  rather than facing eighteen tabs from a blank character.
- Fix the eleven top styles that were changed to the new garment shape but
  never checked by eye.

## Capabilities

### New Capabilities

- `character-looks`: complete outfits, layering, and the gallery of starting
  points.

### Modified Capabilities

- `character-creator`: the parts themselves — garment shape, accessories held
  as well as worn, hair and skin texture.

## Impact

- `js/render/character.js` — the garment and accessory drawing.
- `js/model/character.js` — layered clothing in the spec, and the outfit
  presets. **Saves must survive this**: adding a layer changes the shape of a
  character, and every character already on Rotem's phone has to keep working.
- The creator's tabs grow again; the two-column strip is close to full.
- No change to storage, the service worker, or the house.
