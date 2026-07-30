# cat-life Specification

## Purpose
TBD - created by archiving change add-a-cat. Update Purpose after archive.
## Requirements
### Requirement: A cat decides for itself
A cat MUST NOT be controllable. It chooses where it goes, and the player
cannot pick it up, send it anywhere, or give it an instruction. This is the
point of having one rather than a small silent person.

#### Scenario: Tapping a cat
- **WHEN** a cat is tapped in a room
- **THEN** no controls appear for it
- **AND** whatever is behind it can still be selected

#### Scenario: A cat is not offered anywhere
- **WHEN** a character is picked up in the cutaway house
- **THEN** no cat appears among the things she can be sent to or use

### Requirement: A cat settles rather than paces
A cat MUST change what it is doing rarely — on the order of once a minute —
and MUST be able to choose to stay where it is. A pet that moves constantly is
a distraction in the corner of a room being decorated.

#### Scenario: Left alone
- **WHEN** a cat has just settled somewhere
- **THEN** it stays there until its next decision is due

#### Scenario: Deciding
- **WHEN** a cat's next decision falls due
- **THEN** it picks somewhere in its room, or stays where it is

#### Scenario: Somewhere to be
- **WHEN** a cat chooses a place
- **THEN** it is the top of something it could plausibly sit on, or the floor

### Requirement: A cat costs nothing between decisions
A cat MUST do no work on a frame where it is not deciding or moving. The game
runs on a phone at sixty frames a second with four rooms of furniture, and a
pet that thinks every frame would be paid for by everything else on screen.

#### Scenario: A frame with a settled cat
- **WHEN** a frame is drawn and no cat is due to decide
- **THEN** each cat costs a single comparison

#### Scenario: Deciding is bounded
- **WHEN** a cat decides
- **THEN** it considers only the items in its own room

### Requirement: Cats are saved with the world
A cat MUST be stored with the world it lives in, and MUST survive being closed
and reopened, including where it was and what it was doing.

#### Scenario: Closing and reopening
- **WHEN** a world with cats is reopened
- **THEN** each cat is in the room it was in, drawn as it was designed

#### Scenario: A world saved before cats existed
- **WHEN** an older world is loaded
- **THEN** it has no cats and everything else is unchanged

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

