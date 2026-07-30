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

### Requirement: The things a child reaches for first can be used
The catalogue MUST offer an action on the furniture a child expects to work: a
bed to sleep in, somewhere to sit, a bath, a light, a television, a fridge and
a cooker. A dolls' house whose bed cannot be slept in is a furniture catalogue.

#### Scenario: A bed can be slept in
- **WHEN** a character is at a bed and the action is chosen
- **THEN** she lies on the mattress with her eyes closed

#### Scenario: A seat can be sat on
- **WHEN** a character is at a sofa, an armchair, a chair or a stool
- **THEN** she sits on it, her legs over the front edge

#### Scenario: A light can be turned on
- **WHEN** a character is at a lamp and the action is chosen
- **THEN** the lamp is lit and casts light into the room
- **AND** it stays lit until it is turned off

### Requirement: Objects that do the same thing behave the same way
Every item that plainly affords an action MUST offer it, not just the one that
was implemented first. A game where the sofa can be sat on and the armchair
cannot reads as broken rather than as unfinished.

#### Scenario: Siblings of a usable item
- **WHEN** any bed in the catalogue is offered
- **THEN** it can be slept in

#### Scenario: Every seat
- **WHEN** any item in the seating drawer is offered
- **THEN** it can be sat on

### Requirement: Actions are available where the game is played
An action MUST be reachable from the cutaway house as well as from inside a
room. The cutaway is the screen that shows all four rooms and everybody in
them, so sending someone to bed there MUST NOT require zooming in first.

#### Scenario: Using something from the cutaway
- **WHEN** a character is picked up in the cutaway house and something she can
  use is within reach
- **THEN** an action button is offered without leaving that view

#### Scenario: The walk buttons still work
- **WHEN** a character is picked up in the cutaway house
- **THEN** the rooms she can walk to are still offered
- **AND** the two sets of buttons do not overlap each other

### Requirement: A character can sit and lie down
The character MUST be drawable seated and lying, not only standing. Legs that
rotate at the hip alone are enough for a stride and not for a knee, so a
seated figure was not previously possible at all.

#### Scenario: Seated
- **WHEN** a character is drawn sitting
- **THEN** her thighs run forward from the hip and her shins hang down
- **AND** her clothes, socks and shoes follow the bend rather than staying
  straight

#### Scenario: Lying
- **WHEN** a character is drawn lying down
- **THEN** she is horizontal, at the height of whatever she is lying on

#### Scenario: A pose does not change what she is wearing
- **WHEN** the same character is drawn standing, sitting and lying
- **THEN** every garment, sock and shoe is the same in all three

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

