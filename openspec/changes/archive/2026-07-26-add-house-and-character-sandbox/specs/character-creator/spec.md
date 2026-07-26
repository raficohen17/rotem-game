## ADDED Requirements

### Requirement: Characters are built from layered parts

A character SHALL be composed of independently chosen parts: skin tone, hair
style, hair colour, eyes, mouth, top, bottom, shoes and one accessory. Changing
any part MUST leave every other part unchanged.

#### Scenario: Changing hair only

- **WHEN** Rotem picks a different hairstyle
- **THEN** the hair changes on the preview
- **AND** skin, eyes, mouth and clothing are untouched

#### Scenario: Recolouring a garment

- **WHEN** Rotem picks a new colour for the top
- **THEN** only the top changes colour, and its style stays as chosen

### Requirement: A character is stored as part indices

A saved character SHALL be stored as a set of integer indices into the part
lists rather than as colours and shapes, so that restyling the art later
changes how existing characters look without editing any save.

#### Scenario: Art is restyled

- **WHEN** the drawings behind a hairstyle are replaced with new artwork
- **THEN** every saved character using that hairstyle renders with the new art
- **AND** no save file needs to change

### Requirement: Out-of-range parts degrade gracefully

The system MUST substitute a valid part rather than render nothing or crash
when a saved character references a part index that does not exist — for
instance a save written by a newer build, opened by an older cached one.

#### Scenario: Save from a newer version

- **WHEN** a character references hairstyle 9 but only 8 exist
- **THEN** the character is drawn with a valid hairstyle
- **AND** the rest of the character is unaffected

### Requirement: Characters are placed into rooms

A finished character SHALL be placeable into any room, MUST be draggable to a
new position within that room, and MUST persist with the world.

#### Scenario: Placing and moving a character

- **WHEN** Rotem adds a character to the kitchen and drags her across it
- **THEN** the character stays where released
- **AND** she is still there when the world is reopened

### Requirement: The interface needs no reading

Every control in the creator SHALL be identified by an icon or by the visual
result of the choice itself. Text MAY appear as a label but MUST NOT be the
only way to understand a control.

#### Scenario: Choosing without reading

- **WHEN** a child who cannot read opens the creator
- **THEN** each option shows the hairstyle, colour or garment it will apply
- **AND** every control can be understood from its icon alone
