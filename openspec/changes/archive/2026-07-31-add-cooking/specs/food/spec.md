# food Specification

## ADDED Requirements

### Requirement: A new fridge has something in it
A fridge MUST arrive with a few things already inside, chosen at random, so
that opening one is a small discovery and no two are quite the same. An empty
fridge is a cupboard, and gives no reason to cook.

#### Scenario: Putting a fridge in a room
- **WHEN** a fridge is placed
- **THEN** it already has a few things inside it

#### Scenario: Not the same every time
- **WHEN** several fridges are placed
- **THEN** they do not all hold the same things

#### Scenario: What is in it
- **WHEN** a new fridge is stocked
- **THEN** what is in it is food or ingredients, and nothing else

#### Scenario: Her own fridge stays hers
- **WHEN** a fridge that has been emptied is saved and reopened
- **THEN** it is still empty rather than restocked
