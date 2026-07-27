# character-looks Specification

## Purpose
TBD - created by archiving change make-characters-worth-playing-with. Update Purpose after archive.
## Requirements
### Requirement: Complete looks can be chosen in one tap

The creator SHALL offer a gallery of complete looks, each setting several parts
at once — clothing, layer, shoes and accessories together — so that a character
can be started from something coherent rather than from a blank figure and
eighteen tabs.

#### Scenario: Starting from a look

- **WHEN** Rotem opens the creator and picks a look from the gallery
- **THEN** the character wears that whole outfit immediately

#### Scenario: A look is a starting point, not a cage

- **WHEN** she picks a look and then changes the hair and the skirt colour
- **THEN** both changes apply and the rest of the outfit is untouched

### Requirement: Three named characters are reachable

The available parts SHALL be sufficient to build a recognisable version of each
of Hermione Granger, Luna Lovegood and Anne of Green Gables, and each SHALL be
reachable from the gallery in a single tap.

This is the acceptance test for the whole change. It is written as three
specific characters rather than as "look nicer" because taste is not checkable
and this is.

#### Scenario: A schoolgirl in uniform

- **WHEN** the Hermione look is chosen
- **THEN** the character has voluminous brown hair, a pleated skirt, a collared
  shirt under a jumper, a striped tie, knee socks, and something to carry

#### Scenario: A dreamer

- **WHEN** the Luna look is chosen
- **THEN** the character has long pale wavy hair, an unusual accessory, and a
  softer, odder palette than the others

#### Scenario: A girl with red braids

- **WHEN** the Anne look is chosen
- **THEN** the character has red braided hair, a pinafore over a blouse, a
  straw hat, and freckles clearly visible on her face

### Requirement: Clothing layers

A character SHALL be able to wear a layer over a top — a cardigan, coat, cloak,
apron or pinafore — with both visible at once, and SHALL be able to wear none.

#### Scenario: A cardigan over a dress

- **WHEN** Rotem puts a cardigan on a character already wearing a dress
- **THEN** both are visible, with the cardigan over the dress

#### Scenario: No layer

- **WHEN** the layer is set to none
- **THEN** only the top and bottom are worn, exactly as before layers existed

### Requirement: Characters saved before layers still load

A character saved by a build without layers MUST load with every choice she had
intact, gaining only a default for the parts that did not exist.

#### Scenario: Opening a world made before this change

- **WHEN** a character saved without a layer or held item is loaded
- **THEN** her face, hair, build and clothing are unchanged
- **AND** she wears no layer and holds nothing

### Requirement: Boys can be dressed in one tap
The complete looks MUST include boys' outfits, so one tap reaches a dressed boy
the same way it reaches a dressed girl. Parts that exist but that only combine
into a boy by careful assembly are not enough — that is the assembled-rather-
than-designed problem the looks were added to solve.

#### Scenario: A boy look is offered
- **WHEN** the looks are shown
- **THEN** at least two dress the figure as a boy
- **AND** choosing one sets the build, hair, garments and shoes together

#### Scenario: A look is a whole outfit
- **WHEN** a boy look is chosen
- **THEN** every garment slot it names is set
- **AND** nothing is left over from the look chosen before it

### Requirement: Three named boys are reachable
Three specific and different boys MUST be reachable from the parts, as the test
of whether the range is really there. Named children are checkable in a way that
"add boys" is not.

#### Scenario: A school boy
- **WHEN** a jumper, a collar, a tie, sensible shoes and a combed short cut are
  chosen
- **THEN** the figure reads as a boy dressed for school

#### Scenario: A scruffy boy
- **WHEN** a mop of hair, a t-shirt, shorts and scuffed boots are chosen
- **THEN** the figure reads as a boy who has been outside all day

#### Scenario: A small boy
- **WHEN** a round face, a soft crop and dungarees are chosen
- **THEN** the figure reads as a young boy rather than a shrunken adult

