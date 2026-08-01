# phone-fit Specification

## ADDED Requirements

### Requirement: Detail is drawn only where it lands on real pixels
Anything finer than the screen can show MUST not be painted. Two rules, because
two different things vanish: a feature by being small, and texture by being
thin.

#### Scenario: A book on a shelf
- **WHEN** a bookshelf is drawn in a room
- **THEN** its books are drawn as books
- **AND WHEN** the same shelf is drawn in the cutaway, where a spine is five
  pixels wide, it is drawn as half as many books at twice the width — still a
  shelf of books, at a third of the painting

#### Scenario: Wood grain
- **WHEN** a wooden post is drawn in the cutaway, where the grain line is six
  tenths of a real pixel
- **THEN** the grain is not drawn, because at that width it is a haze over the
  wood rather than a line on it

#### Scenario: A cat's whiskers
- **WHEN** a cat is drawn in a room
- **THEN** it has whiskers, which is what makes it a cat rather than a toy
- **AND WHEN** it is drawn in the cutaway it does not, and still reads as a cat

#### Scenario: Something that carries meaning
- **WHEN** a floor is grass, which is what says a room is outside rather than
  painted green
- **THEN** it keeps its tufts at sizes where a floorboard seam is already gone

#### Scenario: The harness still sees everything
- **WHEN** a scene is drawn into the recording canvas the tests use
- **THEN** every piece of detail is drawn, because the tests check what ships

### Requirement: The game draws as often as it needs to and no more
Drawing MUST be paced by whether anything is happening, not by how often the
browser offers a frame.

#### Scenario: Something is happening
- **WHEN** somebody is walking, a cat is crossing a room, or a finger is on the
  glass
- **THEN** the game draws at the fast rate

#### Scenario: A still house
- **WHEN** nothing is moving but a breath
- **THEN** the game draws at half that rate, and the breath is still smooth

#### Scenario: A touch
- **WHEN** she touches the screen
- **THEN** the fast rate resumes at once and holds for long enough that a drag
  is never paced down between two of its own moves

#### Scenario: The world does not slow down with the drawing
- **WHEN** frames are skipped
- **THEN** walking, cooking and cats carry on at the same speed, because only
  the drawing is rationed

### Requirement: An optimisation is measured or it is not an optimisation
A change made in the name of speed MUST be measured before and after, and
reverted if it does not help.

#### Scenario: It did not help
- **WHEN** painting every item once into a bitmap and blitting it made a room
  slower — 17.5ms to 21.6ms, because a blit at a fractional position resamples
- **THEN** it was reverted rather than kept, and why is written down

#### Scenario: There was nothing there to win
- **WHEN** the JavaScript in a frame was measured and found to be 8% of a room,
  spread thin with no hot spot
- **THEN** nothing was cached, and the measurement is the record of why

#### Scenario: A measurement that cannot be trusted
- **WHEN** the tab being measured is not on screen, which deprioritises the
  renderer and stops frames altogether
- **THEN** the bench refuses to report a number rather than reporting a wrong one
