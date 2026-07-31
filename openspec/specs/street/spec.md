# street Specification

## Purpose
TBD - created by archiving change add-street. Update Purpose after archive.
## Requirements
### Requirement: A world is a street of buildings
A world MUST hold more than one building, each with its own rooms, so a house
and a school can stand next to each other and share the people in them.

#### Scenario: A house that already exists
- **WHEN** a world saved before the street is opened
- **THEN** its four rooms are the first building on the street, with everything
  still in them and everybody still in the rooms they were in

#### Scenario: Building another one
- **WHEN** she taps an empty plot
- **THEN** a new building stands there with four empty rooms of its own

#### Scenario: A full street
- **WHEN** every plot is taken
- **THEN** the street says so rather than offering a plus that does nothing

### Requirement: Going in and coming out
Tapping a building MUST open it, and leaving it MUST come back to the street.

#### Scenario: Into a building
- **WHEN** she taps a building on the street
- **THEN** its cutaway opens, showing that building's rooms and nobody else's

#### Scenario: Back out
- **WHEN** she leaves the cutaway
- **THEN** she is on the street, not on the shelf of worlds

### Requirement: Walking from one building to another
A character MUST be able to walk out of one building and into another, so the
buildings are one place rather than two.

#### Scenario: Out to the street
- **WHEN** a character in a room is sent out
- **THEN** she walks to the front door and ends up standing on the pavement

#### Scenario: In through another door
- **WHEN** a character on the pavement is sent into a building
- **THEN** she walks along to it and ends up in a room of that building

#### Scenario: Where she is, is where she is drawn
- **WHEN** a character is on the street
- **THEN** she is drawn on the street and not in any room

### Requirement: Everything keeps working per building
What a room does MUST keep working in every building, not only in the one that
is open.

#### Scenario: Cooking in an empty house
- **WHEN** a pan is left on a lit stove in one building and she goes to another
- **THEN** the cooking carries on

#### Scenario: A cat stays in its building
- **WHEN** a cat wanders
- **THEN** it moves between the rooms of the building it is in

