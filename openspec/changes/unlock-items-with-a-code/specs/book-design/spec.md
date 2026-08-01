## MODIFIED Requirements

### Requirement: The title is typed on the phone's own keyboard
Typing MUST raise the keyboard Rotem already knows, with its own autocorrect and
its own delete key, rather than a keyboard drawn in canvas. The title MUST be
typed into the game's shared text field, which is visible while it is being typed
into and is not covered by the keyboard.

#### Scenario: Tapping the title field
- **WHEN** the title field is tapped
- **THEN** the phone's keyboard opens
- **AND** what is typed appears on the cover as it is typed

#### Scenario: The field stays visible while typing
- **WHEN** the keyboard is up
- **THEN** the title field is still visible
- **AND** a caret shows where typing will land

#### Scenario: A title that cannot be rendered is trimmed
- **WHEN** a title contains control characters, newlines or runs of spaces
- **THEN** they are reduced to single spaces before the title is stored
- **AND** the title is cut to a length that still fits on a cover
