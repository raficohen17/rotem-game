## ADDED Requirements

### Requirement: One text field serves every place that takes typing
The game SHALL have a single text field component, and every place that takes
typing MUST use it. A second private input built inside a scene is a defect.

#### Scenario: Two callers, one field
- **WHEN** the book title and the code entry are both examined
- **THEN** both open the same shared field
- **AND** no scene creates an input of its own

### Requirement: The field is visible where the game drew it
The field MUST be shown at the position the scene asked for, in design-space
coordinates, so that a caret, a selection and the phone's paste control are all
available on the thing being typed into.

#### Scenario: The field appears over its drawn slot
- **WHEN** a scene opens the field at a design-space rectangle
- **THEN** the field is visible at that rectangle on screen
- **AND** it stays there when the window is resized

#### Scenario: Focus does not zoom the page
- **WHEN** the field takes focus on the phone
- **THEN** the page is not zoomed in by the browser

### Requirement: The phone keyboard never covers the field
When the phone's keyboard is up and would cover the field, the field MUST move
so that it stays visible.

#### Scenario: A field low on the screen
- **WHEN** the keyboard opens over a field near the bottom of the screen
- **THEN** the field moves above the keyboard and remains visible

#### Scenario: A browser that does not report the keyboard
- **WHEN** the browser gives no way to know the keyboard's size
- **THEN** the field stays where it was drawn and typing still works

### Requirement: The field is the keyboard Rotem already knows
Typing MUST raise the phone's own keyboard, with its own autocorrect and its own
delete key, rather than a keyboard drawn in canvas.

#### Scenario: Tapping a field
- **WHEN** a text field is tapped
- **THEN** the phone's keyboard opens

### Requirement: A caller constrains what may be typed
The field MUST accept a maximum length and a filter from its caller, so that a
title and a code can have different rules, and MUST report the cleaned value as
it is typed.

#### Scenario: A code field
- **WHEN** the field is opened for a code with a lowercase-only filter
- **THEN** typed capitals arrive as lowercase
- **AND** nothing beyond the maximum length is accepted

#### Scenario: Closing the field
- **WHEN** the field is closed by the scene, or by Enter, or by tapping away
- **THEN** the keyboard is dismissed
- **AND** the input is removed from the page
