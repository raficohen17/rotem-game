# book-design Specification

## ADDED Requirements

### Requirement: A book cover is designed in the game
A book MUST carry a design chosen by the player — a cover colour, a pattern, a
pattern colour, a title, a title style and a title colour — and that design MUST
travel with the book in the save.

#### Scenario: A designed book survives being closed and reopened
- **WHEN** a book is given a cover and a title and the world is reopened
- **THEN** the same book is on the shelf with the same cover and title

#### Scenario: A book is drawn from its design rather than from art
- **WHEN** a book is drawn in a room
- **THEN** its cover is rendered from the design, not from a catalog picture

### Requirement: The title is typed on the phone's own keyboard
Typing MUST raise the keyboard Rotem already knows, with its own autocorrect and
its own delete key, rather than a keyboard drawn in canvas.

#### Scenario: Tapping the title field
- **WHEN** the title field is tapped
- **THEN** the phone's keyboard opens
- **AND** what is typed appears on the cover as it is typed

#### Scenario: A title that cannot be rendered is trimmed
- **WHEN** a title contains control characters, newlines or runs of spaces
- **THEN** they are reduced to single spaces before the title is stored
- **AND** the title is cut to a length that still fits on a cover

### Requirement: A title is readable on any cover she can choose
Every combination of cover colour, pattern and title colour MUST leave the title
readable. The player picks the colours, so the game cannot rely on her picking a
contrasting pair.

#### Scenario: A low-contrast pair
- **WHEN** a title colour is close in luminance to the cover behind it
- **THEN** the title is given enough separation to stay legible
- **AND** this holds for every cover, pattern and title colour in the game

#### Scenario: A title keeps all of its words
- **WHEN** a title is too long to fit at its natural size
- **THEN** the type shrinks until the whole title fits
- **AND** no word is dropped

### Requirement: Books stack into piles
Books MUST be stackable, so a pile of her own books can be built.

#### Scenario: Dropping a book onto another
- **WHEN** a book is dropped onto a book already in the room
- **THEN** both lie flat and the new one rests on top of the other
