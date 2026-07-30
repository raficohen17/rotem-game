# cat-life Specification

## ADDED Requirements

### Requirement: A cat helps itself to food left out
A cat MUST prefer food it likes over furniture when there is some within its
reach, and MUST eat a portion when it gets there. Leaving something out is then
a decision with a consequence, which is the first one in the game — and a funny
one rather than a punishing one, since nothing is lost that cannot be dragged
out of a drawer again.

#### Scenario: A steak on the table
- **WHEN** a cat decides while there is a steak out in its room
- **THEN** it goes to the steak rather than to a chair
- **AND** a portion is gone

#### Scenario: A cat will not eat cake
- **WHEN** the only food out is cake
- **THEN** the cat ignores it and settles somewhere as usual
- **AND** the cake is untouched

#### Scenario: Food in the fridge is safe
- **WHEN** the food in the room is inside the fridge
- **THEN** the cat does not go for it

#### Scenario: Nothing left
- **WHEN** the food a cat was after is finished
- **THEN** the cat goes back to choosing furniture
