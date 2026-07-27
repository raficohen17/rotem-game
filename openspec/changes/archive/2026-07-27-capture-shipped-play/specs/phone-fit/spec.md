# phone-fit Specification

## ADDED Requirements

### Requirement: Every control is reachable on the phone the game is for
The game MUST fit a Pixel held sideways. Every control MUST be inside the design
space and large enough for a child's finger once scaled to that screen.

#### Scenario: Nothing is positioned off the canvas
- **WHEN** any scene builds its controls
- **THEN** every control falls inside the design space

#### Scenario: Controls are big enough to hit
- **WHEN** a control is scaled to a Pixel held sideways
- **THEN** it is at least the minimum tap size

#### Scenario: A row of tabs fits however many there are
- **WHEN** the drawer has more tabs than fit at their natural width
- **THEN** the row is sized so that all of them are on screen
- **AND** each tab stays large enough to tap

### Requirement: No control is hidden under another
Every control MUST be tappable somewhere within its own area. A control that
renders and cannot be tapped looks exactly like a working one.

#### Scenario: A control covered by later ones
- **WHEN** a scene's controls are hit-tested across each control's own area
- **THEN** every control is reachable somewhere within it

### Requirement: Words are large enough to read on the phone
Text the player is meant to read MUST meet a legibility floor once scaled to the
phone. Text painted onto an object in the world is held to a lower floor, and
text in a view where a whole room is shown as a thumbnail is not held to one at
all — a book cover in a dolls' house is texture, not writing.

#### Scenario: Interface text
- **WHEN** a scene draws a label, a title or a message
- **THEN** it is at least the legibility floor on the phone

#### Scenario: A book cover in a room
- **WHEN** a book stands in a room at its natural size
- **THEN** its title is large enough to tell one book from another

#### Scenario: A book cover in the cutaway
- **WHEN** the same book is shown in the cutaway house
- **THEN** its title is not required to be readable

### Requirement: Nothing is drawn outside the design space
Every scene MUST keep its drawing inside the design space. A shape drawn beyond
it is invisible on every screen and cannot be found by looking at a screenshot.

#### Scenario: Running a scene's own drawing
- **WHEN** a scene draws itself and the extent of every shape is recorded, with
  transforms and clipping applied
- **THEN** nothing falls outside the design space

### Requirement: A phone held upright is asked to turn
The game is laid out for landscape. A phone held upright MUST be told to turn
rather than shown a layout at half scale.

#### Scenario: Portrait
- **WHEN** the window is taller than it is wide
- **THEN** a prompt to turn the phone sideways is shown
- **AND** it fits the screen it is drawn on, whatever the shape

#### Scenario: Turning it back
- **WHEN** the phone is turned sideways again
- **THEN** the game is shown, in the state it was left in
