# room-travel Specification

## Purpose
TBD - created by archiving change capture-shipped-play. Update Purpose after archive.
## Requirements
### Requirement: Rooms are connected by doors and a staircase
The four rooms MUST form a connected graph, so a character can reach any room
from any other. Rooms on the same floor are joined by a door in the partition;
the two floors are joined by a single staircase drawn across the slab.

#### Scenario: Every room reaches every other
- **WHEN** a route is asked for between any two of the four rooms
- **THEN** a route exists
- **AND** a route between rooms on different floors passes through the stair

#### Scenario: The staircase belongs to the house, not to a room
- **WHEN** the cutaway is drawn
- **THEN** the stair is drawn across the slab between the two storeys
- **AND** it is not drawn inside either room as furniture

### Requirement: A character walks to where she is sent
A character sent to another room MUST walk there along the route rather than
appearing at the destination, moving through each intervening room in turn.

#### Scenario: Walking two rooms and down a flight
- **WHEN** a character in the upstairs bedroom is sent to the kitchen
- **THEN** she walks to the door, through the bath, down the stair, and into the
  kitchen
- **AND** on arrival her walk is cleared and her room is the kitchen

#### Scenario: A walk survives leaving the room
- **WHEN** a character is walking and the view changes
- **THEN** she continues from where she had reached

### Requirement: Sending someone walking is visible before it is done
Picking up a character MUST show, on screen, that she is waiting to be sent and
where she can be sent. A gesture whose only feedback is off the canvas is
indistinguishable from a broken one.

#### Scenario: Picking her up offers the destinations
- **WHEN** a character in the cutaway house is tapped
- **THEN** she is outlined
- **AND** a button appears in each room she can reach
- **AND** a line of text says what to do next

#### Scenario: Nothing is drawn off the canvas
- **WHEN** the cutaway house is drawn with a character picked up
- **THEN** every shape it draws falls inside the design space

#### Scenario: Putting her down again
- **WHEN** a picked-up character is tapped a second time
- **THEN** she is put down
- **AND** tapping a room zooms into it as it does when nobody is picked up

### Requirement: A character is big enough to pick up
The reach that picks up a character in the cutaway MUST meet the minimum tap
size. Shrunk into a room cell she is drawn narrower than that on her own.

#### Scenario: Aiming at a character in the cutaway
- **WHEN** the cutaway house is shown on a phone
- **THEN** the area that picks up a character is at least the minimum tap size
- **AND** it stays narrower than half a room, so the room is still tappable

