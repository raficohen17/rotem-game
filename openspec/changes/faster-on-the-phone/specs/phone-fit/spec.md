# phone-fit Specification

## ADDED Requirements

### Requirement: The game keeps up with her finger
A scene MUST be cheap enough to draw that the phone it is played on stays
responsive, measured rather than assumed.

#### Scenario: A busy world
- **WHEN** a world has three buildings, four people in every room and a room
  full of furniture
- **THEN** drawing a room costs less than half what it cost before this change,
  and drawing the cutaway less than half what it cost before

#### Scenario: Deciding by numbers
- **WHEN** a change is made in the name of speed
- **THEN** the same measurement is taken before and after it, and a change that
  does not help is reverted rather than kept

#### Scenario: Nothing is quietly lost
- **WHEN** the game is drawn after the work
- **THEN** every scene still draws what it drew before: the tests that check
  what is on the screen all still pass

### Requirement: Effort goes where it can be seen
Work that cannot be seen on the screen it is played on MUST not be done.

#### Scenario: More pixels than the art has detail
- **WHEN** the phone offers more device pixels than flat vector art can use
- **THEN** the game draws at a size chosen for what can be seen, not at
  whatever the phone reports

#### Scenario: Frames nobody can tell apart
- **WHEN** the picture would be all but identical from one frame to the next
- **THEN** the game does not draw it again at full rate

#### Scenario: The same picture twice
- **WHEN** something is drawn identically on every frame
- **THEN** it is worked out once rather than every time
