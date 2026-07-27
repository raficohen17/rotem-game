# house-designer Specification

## Purpose
TBD - created by archiving change add-house-and-character-sandbox. Update Purpose after archive.
## Requirements
### Requirement: The house is a cutaway of four rooms on two floors

Each world SHALL contain exactly four rooms, arranged two per floor in a 2x2
cutaway seen from the side, with all four visible at once. Each room holds its
own furniture and its own wall and floor colour, and editing one MUST NOT
disturb any other.

#### Scenario: Seeing the whole house

- **WHEN** Rotem opens a world
- **THEN** all four rooms are shown at once, two upstairs and two downstairs
- **AND** the furniture she placed in each is visible in place

#### Scenario: Editing one room leaves the others alone

- **WHEN** Rotem rearranges the bedroom
- **THEN** the other three rooms keep everything she placed in them

### Requirement: Tapping a room zooms in to design it

Tapping a room in the house view SHALL zoom that room to fill the screen for
designing, and a control MUST return to the whole-house view. Zooming exists so
that touch targets stay large enough for a child's finger; a quarter-screen
room is too small to arrange furniture in directly.

#### Scenario: Zooming into a room

- **WHEN** Rotem taps the kitchen in the house view
- **THEN** the kitchen fills the screen with its furniture drawer available

#### Scenario: Returning to the house

- **WHEN** Rotem taps the back control while zoomed into a room
- **THEN** the whole house is shown again with her changes in place

### Requirement: Furniture is placed by dragging from a drawer

The designer SHALL present a drawer of available items grouped by category.
Dragging an item from the drawer into the room MUST place a copy of it at the
position where the finger was released.

#### Scenario: Dragging a sofa into the room

- **WHEN** Rotem presses an item in the drawer and drags it into the room
- **THEN** a copy of that item appears in the room at the release point
- **AND** the drawer still offers the same item, so it can be placed again

#### Scenario: Released back over the drawer

- **WHEN** Rotem drags an item out and releases it while still over the drawer
- **THEN** no item is placed and nothing changes

### Requirement: Placed furniture can be rearranged

Tapping a placed item SHALL select it and reveal controls to resize, flip,
raise or lower its layer, and delete it. Dragging a placed item MUST move it.
Item scale MUST be clamped to a usable range so an item can never be shrunk or
enlarged past the point of being grabbable again.

#### Scenario: Moving an item

- **WHEN** Rotem drags a placed chair
- **THEN** the chair follows her finger and stays where she releases it

#### Scenario: Deleting an item

- **WHEN** Rotem selects an item and taps delete
- **THEN** the item is removed from the room
- **AND** no other item is affected

#### Scenario: Resizing to the limit

- **WHEN** Rotem repeatedly taps the shrink control on a selected item
- **THEN** the item stops shrinking at the minimum size and remains selectable

### Requirement: Items are drawn in depth order

Furniture SHALL be drawn back to front by the baseline it stands on, so an item
nearer the front of the room overlaps one further back. Wall-mounted items MUST
draw behind everything standing on the floor.

#### Scenario: Chair in front of a table

- **WHEN** a chair is placed with a lower baseline than a table
- **THEN** the chair is drawn in front of the table

#### Scenario: Picture behind a wardrobe

- **WHEN** a wall picture and a floor-standing wardrobe overlap
- **THEN** the wardrobe is drawn in front of the picture

### Requirement: Tapping picks the frontmost item
A tap MUST select the frontmost thing under it, so what looks on top is what is
picked — except that a person beats furniture. A character standing at something
she can use is covered by it, and the controls that appear on her would be
unreachable exactly when they are wanted.

#### Scenario: Overlapping furniture
- **WHEN** two items overlap and the overlap is tapped
- **THEN** the one drawn in front is selected

#### Scenario: A character standing at furniture
- **WHEN** a character stands within an item and the two overlap under a tap
- **THEN** the character is selected
- **AND** the item can still be selected by tapping it beside her

### Requirement: Wall and floor colour are changeable per room

Each room SHALL offer a palette for wall colour and a palette for floor colour.
A chosen colour MUST apply only to the current room and MUST persist with the
world.

#### Scenario: Repainting one room

- **WHEN** Rotem picks a new wall colour in the bedroom
- **THEN** only the bedroom wall changes
- **AND** the colour is still there when she reopens the world

### Requirement: Play cannot fail

The designer SHALL present no score, no timer, no objective and no failure
state, and MUST NOT block any arrangement of items as invalid.

#### Scenario: An unusual arrangement

- **WHEN** Rotem puts a bathtub in the kitchen and stacks a lamp on a bed
- **THEN** the game allows it without warning, correction or penalty

### Requirement: Floors have a pattern as well as a colour
A room's floor MUST carry a pattern — boards, tiles and so on — chosen
separately from its colour, and both MUST be remembered per room.

#### Scenario: Choosing a floor pattern
- **WHEN** a floor pattern is chosen in a room
- **THEN** that room's floor is drawn in it
- **AND** the other three rooms are unchanged

#### Scenario: A room saved before patterns existed
- **WHEN** a world saved without a floor pattern is loaded
- **THEN** its floors are the original boards

