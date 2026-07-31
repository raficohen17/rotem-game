# food Specification

## Purpose
TBD - created by archiving change add-food. Update Purpose after archive.
## Requirements
### Requirement: Food runs out
Food MUST have portions and MUST lose one each time it is eaten, until there is
none left and it is gone. Everything else usable in the house is inexhaustible —
a shower can be showered in for ever — so this is the first object whose state
only goes one way.

#### Scenario: Eating a cake
- **WHEN** a cake with slices left is eaten
- **THEN** it has one fewer slice
- **AND** it looks different from how it looked before

#### Scenario: The last slice
- **WHEN** the last portion is eaten
- **THEN** the food is gone from the room

#### Scenario: Nothing goes backwards
- **WHEN** food has been eaten
- **THEN** nothing in the game puts a portion back

### Requirement: Food is placed like anything else
Food MUST be placeable on the floor and on top of furniture, using the same
rules as every other item, so a cake can be put on a table without anything new
having to be learned.

#### Scenario: A cake on a table
- **WHEN** a cake is dropped onto a table
- **THEN** it stands on the table top

### Requirement: How much is left is remembered
Food MUST keep its remaining portions in the save, so a half-eaten cake is
still half-eaten tomorrow.

#### Scenario: Closing and reopening
- **WHEN** a world with a part-eaten cake is reopened
- **THEN** the cake has the same number of slices left

#### Scenario: A nonsense portion count
- **WHEN** food is loaded with a portion count that makes no sense
- **THEN** it is treated as whole rather than as broken

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

