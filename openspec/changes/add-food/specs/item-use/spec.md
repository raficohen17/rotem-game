# item-use Specification

## ADDED Requirements

### Requirement: Anybody near food can eat it
A character within reach of food MUST be offered the chance to eat it, through
the same control that puts her in the shower, so there is one way of doing
things to objects rather than two.

#### Scenario: Standing by a cake
- **WHEN** a character is selected near a cake
- **THEN** an eat button appears among her controls

#### Scenario: Taking a bite
- **WHEN** the eat button is tapped
- **THEN** one portion is gone
- **AND** she is still standing there, able to take another

#### Scenario: Nothing left to eat
- **WHEN** the food is finished
- **THEN** the button is no longer offered, because there is nothing there

### Requirement: The fridge has an inside
Food MUST be able to go inside the fridge, which is the first container in the
game. Food inside it MUST be drawn only when the door is open, and MUST be out
of reach of anything in the room.

#### Scenario: Putting the cake away
- **WHEN** food is dropped onto an open fridge
- **THEN** it is inside the fridge rather than standing in front of it

#### Scenario: A closed door
- **WHEN** the fridge is shut
- **THEN** the food inside is not drawn

#### Scenario: Getting it out again
- **WHEN** food inside the fridge is dragged out
- **THEN** it stands in the room again

#### Scenario: Still there tomorrow
- **WHEN** a world with food in the fridge is reopened
- **THEN** the food is still inside it
