# nails Specification

## Purpose
TBD - created by archiving change add-nails. Update Purpose after archive.
## Requirements
### Requirement: A character has nails
A character MUST have nails as an ordinary part: a shape she picks and a colour
she picks, free, the way her top and her shoes already are.

#### Scenario: Choosing a shape
- **WHEN** she opens the nails tab
- **THEN** she is offered bare nails and a set of shapes, and picking one shows
  on the character at once

#### Scenario: Choosing a colour
- **WHEN** she picks a nail colour
- **THEN** the nails are that colour, from the same palette her clothes use

#### Scenario: Bare nails
- **WHEN** the shape is the first one
- **THEN** the hands are drawn exactly as they were before nails existed

#### Scenario: Somebody made before nails existed
- **WHEN** a character saved before this change is loaded
- **THEN** she has bare nails and looks exactly as she did

#### Scenario: Coming back tomorrow
- **WHEN** the world is saved and opened again
- **THEN** the shape and the colour are the ones she chose

### Requirement: Two gel designs arrive with a code
Two nail designs MUST be held back behind a code, the way the gala dress and
the magic sword already are.

#### Scenario: Before the code
- **WHEN** she opens the nails tab without the code
- **THEN** the two designs are shown greyed out with a padlock, because a thing
  she cannot see is a thing she cannot look forward to

#### Scenario: The right code
- **WHEN** she types the code for a design
- **THEN** that design is hers, on this device, for every character and every
  house

#### Scenario: The wrong code
- **WHEN** she types a code that is not right
- **THEN** nothing is taken away and nothing else happens, because play cannot
  fail here

#### Scenario: One code does not open the other
- **WHEN** the code for one design is entered
- **THEN** the other design is still locked

### Requirement: A gel design is painted over her colour
A locked design MUST use the colour she chose as its own base, so it is her
manicure rather than a sticker.

#### Scenario: A French tip
- **WHEN** the French tip is chosen over a pink nail
- **THEN** the nail is pink with a pale crescent across the tip

#### Scenario: A glitter ombré
- **WHEN** the glitter ombré is chosen over a blue nail
- **THEN** the nail is blue fading into sparkle towards the tip

#### Scenario: Changing her mind about the colour
- **WHEN** she changes the nail colour while a gel design is on
- **THEN** the design follows the new colour rather than reverting to a fixed one

### Requirement: Nails are drawn where they can be seen
Nails MUST follow the size rule the rest of the game follows: painted where
they land on real pixels, and not where they cannot.

#### Scenario: In a room
- **WHEN** a character with painted nails is drawn in a room
- **THEN** her nails are drawn

#### Scenario: In the cutaway
- **WHEN** the same character is drawn in the cutaway, where a whole hand is a
  few pixels across
- **THEN** the nails are not drawn, and she is unchanged in every other way

