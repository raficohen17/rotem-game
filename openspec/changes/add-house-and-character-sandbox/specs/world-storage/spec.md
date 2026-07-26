## ADDED Requirements

### Requirement: Up to ten worlds are saved on the device

The system SHALL persist up to ten worlds locally, each holding its four rooms,
its furniture, its colours and its characters. When ten exist, the system MUST
prevent creating an eleventh and MUST say so rather than silently discarding
either the new world or an old one.

#### Scenario: Creating a world with room to spare

- **WHEN** Rotem creates a new world and fewer than ten exist
- **THEN** the world is added and appears in the menu

#### Scenario: Creating an eleventh world

- **WHEN** Rotem tries to create a world and ten already exist
- **THEN** no world is created and no existing world is removed
- **AND** she is shown that the shelf is full

#### Scenario: Deleting frees a slot

- **WHEN** Rotem deletes a world while ten exist
- **THEN** a new world can be created afterwards

### Requirement: Changes persist without an explicit save

Every change Rotem makes SHALL be written to storage as it happens. The system
MUST NOT depend on her leaving through a particular button, and MUST NOT lose
work if the app is closed, backgrounded or reloaded mid-play.

#### Scenario: App closed while playing

- **WHEN** Rotem places a bed and the app is killed without leaving the room
- **THEN** the bed is still there when she reopens the world

### Requirement: Saves survive format changes

Every saved world SHALL carry a schema version, and the system MUST provide a
migration path from every previously released version to the current one. A
world MUST NOT be discarded because it was written by an older build.

#### Scenario: Opening a world from an older version

- **WHEN** a world saved by an earlier release is loaded
- **THEN** it is migrated to the current format
- **AND** its rooms, furniture, colours and characters are preserved

#### Scenario: Opening a world from a newer version

- **WHEN** a world saved by a newer build is loaded by an older cached one
- **THEN** it is read and repaired rather than discarded

### Requirement: Damaged data never blocks play

Malformed, partial or unreadable stored data MUST NOT prevent the game from
starting. Unreadable worlds SHALL be skipped, and salvageable ones repaired by
filling in missing fields with defaults.

#### Scenario: Corrupt storage

- **WHEN** the stored data cannot be parsed
- **THEN** the game starts with an empty world list instead of failing

#### Scenario: A world missing a room

- **WHEN** a stored world has no kitchen entry
- **THEN** an empty kitchen is created and the rest of the world loads intact

### Requirement: A full disk degrades to not saving

The game MUST stay playable and MUST NOT crash or lose the in-memory world when
storage rejects a write, whether because the quota is exceeded or because
storage is disabled.

#### Scenario: Quota exceeded

- **WHEN** a save fails because storage is full
- **THEN** play continues with the current world intact

### Requirement: Each world shows a thumbnail

Each saved world SHALL carry a small rendered image of itself for the menu, so
worlds can be told apart without opening them, and MUST stay small enough that
ten of them fit comfortably in the storage budget.

#### Scenario: Recognising a world in the menu

- **WHEN** Rotem opens the menu with several worlds saved
- **THEN** each slot shows a picture of that world
