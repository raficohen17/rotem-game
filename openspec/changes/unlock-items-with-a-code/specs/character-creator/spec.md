## ADDED Requirements

### Requirement: There is a dress worth dressing up in
The wardrobe SHALL include a floor-length gown, drawn with detail the everyday
clothes do not have — a shaped neckline, a waist seam and a hem that clears the
floor — so that it reads as an occasion rather than as another colour of skirt.
It MUST be classic in cut: one silhouette, no cutouts and no asymmetry.

#### Scenario: The gown replaces the top
- **WHEN** the gown is chosen
- **THEN** it is drawn as one garment from shoulder to floor
- **AND** no separate top is drawn under it

#### Scenario: The gown reaches the floor
- **WHEN** a character in the gown is drawn standing
- **THEN** the hem falls below the knee and above the floor she stands on
- **AND** this holds at both sizes

#### Scenario: Telling it apart in the grid
- **WHEN** the option grid is drawn
- **THEN** the gown is distinguishable from the existing dress

### Requirement: A sword is held like a sword
The wardrobe SHALL include a magic sword as a held item, drawn with a blade, a
crossguard, a grip and a pommel. It MUST hang from the hand at an angle that
keeps the blade clear of the body and the legs.

#### Scenario: The blade clears the body
- **WHEN** a character holding the sword is drawn standing and walking
- **THEN** the blade does not cross her legs or her body

#### Scenario: It swings with the arm
- **WHEN** a character holding the sword walks
- **THEN** the sword moves with her arm rather than floating beside her

#### Scenario: It stays inside the picture
- **WHEN** a character holding the sword is drawn at either size
- **THEN** nothing is drawn outside the design space

### Requirement: Held things are for holding, not for hitting
A held item MUST NOT damage, break, open or otherwise change anything else in
the world. Play cannot fail, and nothing a character carries may become the first
way to break something.

#### Scenario: Carrying a sword through a furnished room
- **WHEN** a character holding the sword walks past furniture and other characters
- **THEN** nothing in the room is changed by the sword

### Requirement: An option can be shown as locked
The option grid SHALL be able to draw an option as locked, and a locked option
MUST NOT be selected by tapping it.

#### Scenario: A locked option is drawn
- **WHEN** the grid contains a locked option
- **THEN** it is drawn dimmed with a lock over it

#### Scenario: A locked option is tapped
- **WHEN** a locked option is tapped
- **THEN** the character does not change
- **AND** the grid stays where it is

## MODIFIED Requirements

### Requirement: Characters can hold things

A character SHALL be able to hold an item in her hand — a book, a wand, a
basket, a sword — and the item MUST move with the arm as she walks rather than
floating beside her.

#### Scenario: Carrying a book while walking

- **WHEN** a character holding a book walks to another room
- **THEN** the book stays in her hand throughout

#### Scenario: Empty handed

- **WHEN** no held item is chosen
- **THEN** her hands are empty and nothing is drawn
