# cat-design Specification

## ADDED Requirements

### Requirement: A cat is designed from parts
A cat MUST be built from chosen parts — coat colour, markings, ears, tail, eyes
and collar — and stored as integer indices, so the whole species can be
redrawn without touching a saved world.

#### Scenario: Designing a cat
- **WHEN** the cat designer is opened
- **THEN** every part can be changed and the cat redraws as it changes

#### Scenario: A cat is a set of numbers
- **WHEN** a cat is saved
- **THEN** every part is stored as an index into its table

#### Scenario: A part that no longer exists
- **WHEN** a cat is loaded whose part index is out of range
- **THEN** that part falls back to a valid one and the rest is kept

### Requirement: Whole cats can be chosen in one tap
The designer MUST offer complete cats — a tabby, a tuxedo, a ginger and so on —
because a coat colour and a marking chosen independently read as a kit of parts
rather than as an animal, exactly as they did for the people.

#### Scenario: Choosing a whole cat
- **WHEN** a complete cat is chosen
- **THEN** every part it names is set together
- **AND** each one can still be changed afterwards

### Requirement: The cat designer fits the phone
The designer MUST meet the same budget as every other scene: nothing drawn off
the design space, no control below the minimum tap size, no text below the
legibility floor.

#### Scenario: On a Pixel held sideways
- **WHEN** the cat designer is drawn
- **THEN** every control is on screen and large enough to hit
