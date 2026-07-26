## ADDED Requirements

### Requirement: Characters can hold things

A character SHALL be able to hold an item in her hand — a book, a wand, a
basket — and the item MUST move with the arm as she walks rather than floating
beside her.

#### Scenario: Carrying a book while walking

- **WHEN** a character holding a book walks to another room
- **THEN** the book stays in her hand throughout

#### Scenario: Empty handed

- **WHEN** no held item is chosen
- **THEN** her hands are empty and nothing is drawn

### Requirement: Legs can be dressed separately from feet

Socks and tights SHALL bechoosable independently of shoes, so that knee socks
under a skirt and bare legs in sandals are both possible.

#### Scenario: Knee socks with school shoes

- **WHEN** knee socks and flat shoes are both chosen
- **THEN** the socks show above the shoes and below the hem

### Requirement: Hair reads as hair rather than as a shape

Hair SHALL be drawn with visible texture — strands following the silhouette and
a shaded underside — not as a single flat colour.

#### Scenario: Long hair at full size

- **WHEN** a character with long hair is shown in the creator preview
- **THEN** the hair shows strand detail and is not one flat block of colour

### Requirement: Garments follow the body

A garment MUST follow the build it is worn on — its shoulders meeting the
sleeves, its waist following the figure, and its hem draping rather than ending
in a straight horizontal cut.

#### Scenario: The same top on two builds

- **WHEN** the same top is worn by the petite build and the curvy build
- **THEN** each garment follows its own figure rather than being the same shape
  at a different size

#### Scenario: Every top is checked

- **WHEN** each of the top styles is shown on a character
- **THEN** none has sleeves detached from the body, and none has its hem
  crossing the arms
