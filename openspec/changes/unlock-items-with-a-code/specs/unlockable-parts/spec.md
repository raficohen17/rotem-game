## ADDED Requirements

### Requirement: A part can be held back behind a code
A character part MAY be locked. A locked part MUST NOT be selectable until its
code has been entered on that device.

#### Scenario: A locked part cannot be worn
- **WHEN** a locked part is tapped in the creator before its code is entered
- **THEN** the character does not change into it

#### Scenario: An unlocked part behaves like any other
- **WHEN** a part has been unlocked
- **THEN** selecting it works exactly as every free part does

### Requirement: Locked parts are visible, not hidden
A locked part MUST be shown in the option grid, drawn so that it reads as locked
rather than as missing. Rotem SHALL be able to see what exists before she has it.

#### Scenario: A locked option in the grid
- **WHEN** the wardrobe is opened with a locked part in it
- **THEN** that option appears in the grid, dimmed and marked with a lock

#### Scenario: Tapping a locked option
- **WHEN** a locked option is tapped
- **THEN** a field for that part's code opens
- **AND** the name of the part being unlocked is shown

### Requirement: A code is checked against a stored hash
A code MUST be verified against a stored hash rather than a stored code, and the
hash MUST be combined with the identity of the part it belongs to, so that one
code cannot open a part it was not meant for.

#### Scenario: The right code
- **WHEN** the code minted for a part is entered for that part
- **THEN** the part unlocks

#### Scenario: The same code offered for a different part
- **WHEN** a code minted for one part is entered for another
- **THEN** nothing unlocks

#### Scenario: The code is not readable in the source
- **WHEN** the shipped files are searched for a part's code
- **THEN** the code does not appear in them

### Requirement: An unlock lasts forever on that device
An unlock MUST persist across reloads, and MUST NOT belong to any one world. It
MUST survive a world being deleted and MUST apply to every world on the device.

#### Scenario: Reopening the game
- **WHEN** a part is unlocked and the game is closed and reopened
- **THEN** the part is still unlocked

#### Scenario: A new world
- **WHEN** a new world is started after a part was unlocked
- **THEN** the part is unlocked there too

#### Scenario: Entering the same code twice
- **WHEN** a code that has already been used is entered again
- **THEN** the part stays unlocked and nothing else changes

### Requirement: A wrong code cannot make her lose
A wrong code MUST NOT produce an error message, a failure count or a lockout.
There MUST be no limit on attempts.

#### Scenario: A mistyped code
- **WHEN** a code that matches nothing is entered
- **THEN** the field shakes and stays open with what was typed still in it
- **AND** no error text is shown

#### Scenario: Many wrong codes
- **WHEN** wrong codes are entered many times in a row
- **THEN** the field still accepts another attempt

### Requirement: A character keeps a part she is already wearing
A character already wearing a part MUST continue to be drawn wearing it, even if
the unlock list is cleared. Losing stored data MUST NOT undress somebody.

#### Scenario: The unlock list is lost
- **WHEN** a character wearing an unlocked part is loaded with an empty unlock list
- **THEN** she is still drawn wearing that part

### Requirement: A code can be minted without hand-writing a hash
A tool SHALL produce the stored hash from a part and a code, using the same
hashing the game uses.

#### Scenario: Minting a code
- **WHEN** the tool is run with a part and a code
- **THEN** it prints the value to store
- **AND** the game accepts that code for that part
