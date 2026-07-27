# house-designer Specification

## ADDED Requirements

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

## MODIFIED Requirements

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
