# item-use Specification

## Purpose
TBD - created by archiving change capture-shipped-play. Update Purpose after archive.
## Requirements
### Requirement: Some furniture can be used, not only moved
Furniture MUST be able to declare an action a character can perform with it. A
room of things that can only be pushed around is a showroom rather than a place
to play.

#### Scenario: A shower can be showered in
- **WHEN** a character stands at a shower and the action is chosen
- **THEN** she is drawn in the shower behind a closed curtain with the water
  running

#### Scenario: A book can be read
- **WHEN** a character stands at a book and the action is chosen
- **THEN** she holds that book open in front of her
- **AND** the cover shown is the one the player designed

#### Scenario: Furniture with no action offers none
- **WHEN** a character stands at a sofa, which declares no action
- **THEN** no action is offered

### Requirement: Using something takes one gesture
The action MUST be offered on the character herself once she is near something
that affords it. Choosing a character, then a verb, then a target is three steps
where one will do.

#### Scenario: Standing near something usable
- **WHEN** a character is selected within reach of a usable item
- **THEN** a button for that item's action appears among her controls
- **AND** a button to stop appears while she is using it

#### Scenario: A character standing at an item can still be tapped
- **WHEN** a character stands at an item wide enough to cover her
- **THEN** tapping her selects her rather than the item
- **AND** the item can still be selected by tapping beside her

### Requirement: What she is doing is part of the world
The record of what a character is using MUST survive being saved and loaded, and
MUST refer to the item in a way that stays valid across a reload.

#### Scenario: Still showering tomorrow
- **WHEN** a character is showering and the world is closed and reopened
- **THEN** she is still showering

#### Scenario: The item is deleted while in use
- **WHEN** the item a character is using is deleted
- **THEN** she stops using it rather than referring to something that is gone

#### Scenario: A nonsense record is discarded
- **WHEN** a saved character carries a use record that is not a valid one
- **THEN** it is dropped and she simply stands there

### Requirement: An item in someone's hands is not also on the floor
An item whose action is carried MUST be drawn in the character's hands and not
in its own place, so it does not appear twice.

#### Scenario: Reading a book
- **WHEN** a character is reading a book
- **THEN** the book is drawn in her hands
- **AND** it is not also drawn standing where it was

