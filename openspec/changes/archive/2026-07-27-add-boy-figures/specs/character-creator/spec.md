# character-creator Specification

## ADDED Requirements

### Requirement: Builds cover more than one silhouette
The build options MUST include figures with square shoulders, a straight waist
and narrow hips, at more than one height. A single narrow-shouldered template in
six sizes cannot make a boy, whatever else is chosen.

#### Scenario: A boyish silhouette exists
- **WHEN** the build options are offered
- **THEN** at least one has shoulders wider than its hips
- **AND** at least one such build is short and one is tall

#### Scenario: The range is still a range
- **WHEN** all builds are compared
- **THEN** they differ in height, shoulder, waist and hip
- **AND** no two are the same figure at a different size

### Requirement: Haircuts include short ones
The hairstyle options MUST include several cuts that read as short hair at a
glance, so a figure is not defined as a girl by the only hair available.

#### Scenario: Short cuts are offered
- **WHEN** the hairstyle options are shown
- **THEN** more than one is a short cut
- **AND** they differ from each other in shape, not only in length

#### Scenario: Any hair goes on any figure
- **WHEN** a short cut is chosen
- **THEN** it can be worn by any build
- **AND** a long style can equally be worn by a broad-shouldered build

### Requirement: The palettes are not all sweets
The colour palettes MUST offer neutral tones alongside the bright ones. Every
lip colour was a lipstick and six of the ten clothing colours were pink or
purple, so a figure came out made-up and dressed in orchid however its build,
hair and garments were chosen — the palettes were deciding who these people
were more than the parts were.

#### Scenario: A mouth that is not wearing lipstick
- **WHEN** the mouth colours are offered
- **THEN** at least one is a natural lip tone

#### Scenario: Clothes that are not pink
- **WHEN** the clothing colours are offered
- **THEN** they include a navy, a green, a brown and a grey

#### Scenario: The bright colours are still there
- **WHEN** a character saved before the neutrals were added is loaded
- **THEN** every one of its colours is unchanged

## MODIFIED Requirements

### Requirement: A character is stored as part indices
A character MUST be stored as integer indices into the part tables, never as
colours or shapes, so the whole cast can be restyled without touching a save.
New parts MUST be appended, so no existing index changes meaning.

#### Scenario: Adding parts leaves saved characters alone
- **WHEN** new builds, haircuts, brows or mouths are added
- **THEN** they take indices after the existing ones
- **AND** a character saved beforehand looks exactly as it did

#### Scenario: A spec is a set of numbers
- **WHEN** a character is saved
- **THEN** every part is stored as an index into its table
