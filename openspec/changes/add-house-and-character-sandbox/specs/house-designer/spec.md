## ADDED Requirements

### Requirement: Four rooms per world

Each world SHALL contain exactly four rooms — bedroom, living room, kitchen and
bathroom — each holding its own furniture and its own wall and floor colour.
Switching rooms MUST NOT disturb what is placed in any other room.

#### Scenario: Switching between rooms

- **WHEN** Rotem taps a different room in the room switcher
- **THEN** that room's furniture, wall colour and floor colour are shown
- **AND** the room she left keeps everything she placed in it

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

When several items overlap under a touch point, the system SHALL select the one
drawn frontmost, so what looks like it is on top is what gets picked up.

#### Scenario: Overlapping items

- **WHEN** Rotem taps a point covered by three overlapping items
- **THEN** the item drawn frontmost at that point is selected

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
