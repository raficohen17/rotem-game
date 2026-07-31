# drinks Specification

## Purpose
TBD - created by archiving change add-drinks. Update Purpose after archive.
## Requirements
### Requirement: A container pours into a glass
Pouring MUST take from one object and give to another: the container loses a
measure and the glass gains one. This is the first thing in the game that
changes two objects at once.

#### Scenario: Filling a glass
- **WHEN** a carton of juice is poured into an empty glass
- **THEN** the glass has juice in it
- **AND** the carton has one measure fewer

#### Scenario: An empty carton
- **WHEN** a container with nothing left is poured
- **THEN** nothing happens, and no glass is filled

#### Scenario: A glass that is already full
- **WHEN** a full glass is poured into
- **THEN** nothing happens, and nothing is wasted

#### Scenario: Pouring into the wrong thing
- **WHEN** a container is poured over something that is not a glass
- **THEN** nothing happens

### Requirement: A glass shows what is in it
A glass MUST show what it holds and how much, so a child can tell milk from
juice and full from nearly gone without being told.

#### Scenario: Milk and juice
- **WHEN** one glass holds milk and another juice
- **THEN** they plainly look different

#### Scenario: Half drunk
- **WHEN** a glass has been drunk from
- **THEN** the level in it has dropped

#### Scenario: Empty
- **WHEN** a glass has been finished
- **THEN** it is an empty glass, still there to be filled again

### Requirement: Drinking works the same way as eating
A character near a full glass MUST be offered a drink, taken in a few goes,
through the same control that offers her food. There is one way of doing things
to objects and drinking does not get a second one.

#### Scenario: Standing by a full glass
- **WHEN** a character is selected near a glass with something in it
- **THEN** a drink button appears among her controls

#### Scenario: Taking a sip
- **WHEN** the drink button is tapped
- **THEN** the level in the glass drops
- **AND** she is still standing there

#### Scenario: An empty glass
- **WHEN** the glass is empty
- **THEN** she is not offered it, but the glass stays where it is

### Requirement: Milk in a bowl is a cat's business
Milk poured into a bowl MUST be something a cat will cross a room for, exactly
as a steak is, so that pouring some out is a thing worth doing.

#### Scenario: A saucer of milk
- **WHEN** there is milk in a bowl in a cat's room
- **THEN** the cat goes to it and drinks some

#### Scenario: Milk in a glass
- **WHEN** the milk is in a glass on a table rather than a bowl
- **THEN** the cat leaves it alone

