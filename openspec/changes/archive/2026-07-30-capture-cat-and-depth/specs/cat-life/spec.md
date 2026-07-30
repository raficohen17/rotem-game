# cat-life Specification

## ADDED Requirements

### Requirement: A cat has the run of the house
A cat MUST be able to leave the room it was made in, and MUST walk there rather
than appear. A cat that never leaves one room is a piece of furniture with a
tail.

#### Scenario: Wandering off
- **WHEN** a cat decides to move
- **THEN** it sometimes chooses another room it can reach
- **AND** it walks there through the doors and stairs

#### Scenario: Getting up first
- **WHEN** a cat sets off for another room
- **THEN** it is on its feet and on the floor before it starts

#### Scenario: Left to arrive
- **WHEN** a cat is on its way somewhere
- **THEN** it is not asked to decide again until it gets there

#### Scenario: Caught mid-journey
- **WHEN** the app is closed while a cat is between rooms
- **THEN** it is still on its way when the app is reopened

### Requirement: A cat keeps time by the clock, not by the frames
A cat's sense of time MUST come from the wall clock rather than from frames
drawn. A phone spends most of its life in a pocket, and a cat that only ages
while the screen is lit has barely aged at all between one look and the next —
which is exactly how it came to sit in the same room for hours.

#### Scenario: Away for a while
- **WHEN** the app has been in the background and is opened again
- **THEN** the cat has aged by the time that actually passed

#### Scenario: Moving often enough to be seen
- **WHEN** a cat is watched for a few minutes
- **THEN** it has changed what it is doing several times

### Requirement: A cat rests where a cat would rest
A cat MUST settle at the height it would really sit at on each thing — the
cushions of a sofa, the top of a table, the floor for a rug — rather than at
the top of the item's bounding box. A sofa's box includes its backrest, so the
top of it is thin air.

#### Scenario: On a sofa
- **WHEN** a cat settles on a sofa
- **THEN** it is on the cushions, not floating above the back

#### Scenario: On a table
- **WHEN** a cat settles on a table
- **THEN** it is on the table top, because that is the surface

#### Scenario: On a rug
- **WHEN** a cat settles on a rug
- **THEN** it is on the floor, because a rug is a place rather than a climb
