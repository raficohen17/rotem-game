# item-use Specification

## ADDED Requirements

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
