# phone-fit Specification

## Purpose
TBD - created by archiving change capture-shipped-play. Update Purpose after archive.
## Requirements
### Requirement: Every control is reachable on the phone the game is for
The game MUST fit a Pixel held sideways. Every control MUST be inside the design
space and large enough for a child's finger once scaled to that screen.

#### Scenario: Nothing is positioned off the canvas
- **WHEN** any scene builds its controls
- **THEN** every control falls inside the design space

#### Scenario: Controls are big enough to hit
- **WHEN** a control is scaled to a Pixel held sideways
- **THEN** it is at least the minimum tap size

#### Scenario: A row of tabs fits however many there are
- **WHEN** the drawer has more tabs than fit at their natural width
- **THEN** the row is sized so that all of them are on screen
- **AND** each tab stays large enough to tap

### Requirement: No control is hidden under another
Every control MUST be tappable somewhere within its own area. A control that
renders and cannot be tapped looks exactly like a working one.

#### Scenario: A control covered by later ones
- **WHEN** a scene's controls are hit-tested across each control's own area
- **THEN** every control is reachable somewhere within it

### Requirement: Words are large enough to read on the phone
Text the player is meant to read MUST meet a legibility floor once scaled to the
phone. Text painted onto an object in the world is held to a lower floor, and
text in a view where a whole room is shown as a thumbnail is not held to one at
all — a book cover in a dolls' house is texture, not writing.

#### Scenario: Interface text
- **WHEN** a scene draws a label, a title or a message
- **THEN** it is at least the legibility floor on the phone

#### Scenario: A book cover in a room
- **WHEN** a book stands in a room at its natural size
- **THEN** its title is large enough to tell one book from another

#### Scenario: A book cover in the cutaway
- **WHEN** the same book is shown in the cutaway house
- **THEN** its title is not required to be readable

### Requirement: Nothing is drawn outside the design space
Every scene MUST keep its drawing inside the design space. A shape drawn beyond
it is invisible on every screen and cannot be found by looking at a screenshot.

#### Scenario: Running a scene's own drawing
- **WHEN** a scene draws itself and the extent of every shape is recorded, with
  transforms and clipping applied
- **THEN** nothing falls outside the design space

### Requirement: A phone held upright is asked to turn
The game is laid out for landscape. A phone held upright MUST be told to turn
rather than shown a layout at half scale.

#### Scenario: Portrait
- **WHEN** the window is taller than it is wide
- **THEN** a prompt to turn the phone sideways is shown
- **AND** it fits the screen it is drawn on, whatever the shape

#### Scenario: Turning it back
- **WHEN** the phone is turned sideways again
- **THEN** the game is shown, in the state it was left in

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

