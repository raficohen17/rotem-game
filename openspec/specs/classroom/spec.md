# classroom Specification

## Purpose
TBD - created by archiving change add-classroom. Update Purpose after archive.
## Requirements
### Requirement: A whiteboard she can draw on
The board MUST take a freehand drawing made with a finger and keep it, so what
is on the board in the room is what she drew.

#### Scenario: Drawing a line
- **WHEN** she drags a finger across the open board
- **THEN** a line appears where the finger went, in the colour of the marker
  she is holding

#### Scenario: Back in the room
- **WHEN** she closes the board
- **THEN** the drawing is on the board on the wall, and is readable at the size
  the board is on the phone

#### Scenario: Coming back tomorrow
- **WHEN** the world is saved and opened again
- **THEN** the drawing is still on the board

### Requirement: The markers are the colours
The colours available on the board MUST be the markers in the room, so a marker
is a thing she owns rather than a menu entry.

#### Scenario: A new board
- **WHEN** a whiteboard is placed
- **THEN** it arrives with markers in its tray, so it can be drawn on at once

#### Scenario: Another colour
- **WHEN** a marker of a colour she does not have is placed in the room
- **THEN** that colour can be drawn with

#### Scenario: Markers travel with the board
- **WHEN** the board is moved along the wall
- **THEN** the markers in its tray move with it

### Requirement: A wiped board is still a board
Erasing MUST leave the board on the wall, empty and ready to be drawn on again.

#### Scenario: Rubbing out one line
- **WHEN** the rubber is dragged across a line
- **THEN** that line is gone and the rest of the drawing is not

#### Scenario: Wiping the board
- **WHEN** the board is wiped
- **THEN** it is empty, and it is still on the wall

### Requirement: A drawing cannot fill up the save
A board MUST hold a bounded amount of drawing, so ten worlds of boards cannot
grow until saving stops working.

#### Scenario: Drawing and drawing
- **WHEN** she keeps drawing past what a board can hold
- **THEN** the board keeps the drawing it has and the game keeps working

#### Scenario: A damaged save
- **WHEN** a board's drawing is loaded back as something that is not a drawing
- **THEN** the board comes back blank rather than breaking the room

### Requirement: Somewhere to sit and listen
The class drawer MUST hold something to sit at, so a classroom can be built
out of one drawer rather than assembled from three.

#### Scenario: A row of desks
- **WHEN** she places school desks in a room with a board
- **THEN** each is one object with its own chair, and a character can sit at it

### Requirement: Writing at the board
A character near the board MUST be able to be sent to write at it, the way she
can be sent to read a book.

#### Scenario: Sending her to the board
- **WHEN** a character standing near the board is told to write
- **THEN** she stands at the board with a marker, facing it, feet on the floor

#### Scenario: Walking away
- **WHEN** she is sent somewhere else
- **THEN** she stops writing

