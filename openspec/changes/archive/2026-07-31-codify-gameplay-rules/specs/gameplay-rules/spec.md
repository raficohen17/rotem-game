# gameplay-rules Specification

## ADDED Requirements

### Requirement: Anything inside anything answers the same four questions
Every relationship where one object holds another MUST settle all four of: can
it be seen, can it be reached, does it travel with what holds it, and does it
survive being saved. Each container so far has answered these separately and
got a different subset of them right.

#### Scenario: It can be seen
- **WHEN** something is inside another thing
- **THEN** it is drawn in front of what holds it, never behind it
- **AND** a container that hides its contents does so deliberately, by having a
  door that is shut, rather than by accident

#### Scenario: It can be reached
- **WHEN** something is inside an open container
- **THEN** tapping where it appears selects it
- **AND** where it appears and where it can be tapped are the same place

#### Scenario: It travels
- **WHEN** a container is moved
- **THEN** everything inside it moves with it

#### Scenario: It survives
- **WHEN** a world with something inside something is saved and reopened
- **THEN** it is still inside it

### Requirement: Every placement is reversible
Anything the player can put somewhere MUST be removable from there. A dead end
in a sandbox is a bug however sensible the rule that created it sounded.

#### Scenario: Taking something back
- **WHEN** something has been put into a container
- **THEN** it can be dragged out again

#### Scenario: A rule that blocks reaching applies only where it means to
- **WHEN** a rule prevents reaching into a container
- **THEN** it applies only to containers that rule was written for
- **AND** never to a container that simply lacks the property being tested

### Requirement: A state the player causes is visible
Anything the player does that changes the world MUST show that it has. A change
that cannot be seen is indistinguishable from a game that is broken, and every
report of something being broken so far has turned out to be this.

#### Scenario: Doing something
- **WHEN** the player acts on an object
- **THEN** something on screen changes at once

#### Scenario: A state that lasts
- **WHEN** an object is left in a state the player put it in
- **THEN** it looks different from an object not in that state
- **AND** the difference is visible at the size the object really is on screen

#### Scenario: Something taking time
- **WHEN** something takes a while to happen
- **THEN** it is visibly happening while it does

### Requirement: Nothing measured against the session clock is saved
A value counted in seconds of play MUST NOT be written to the save. The clock
restarts at zero each time the app opens, so a saved value becomes a debt the
next session has to pay off before anything happens.

#### Scenario: Saving mid-count
- **WHEN** a world is saved while something is counting down
- **THEN** the count is not saved with it

#### Scenario: Opening again
- **WHEN** the world is reopened
- **THEN** whatever was counting starts afresh rather than waiting

### Requirement: A drawer does not undermine what an activity produces
Anything produced by an activity MUST NOT also be available from a drawer. If
it is, the activity is strictly worse than not doing it, and it becomes
decoration.

#### Scenario: Something that is made
- **WHEN** an object is the result of an activity
- **THEN** it cannot be taken from a drawer

#### Scenario: What the activity needs
- **WHEN** an activity needs particular objects to start
- **THEN** those can be taken from a drawer, so it can always be started

### Requirement: Every state a player can reach is exercised
The scene harness MUST put each scene into every state a player can reach.
Three crashes have shipped through a green suite because no test opened that
tab, and each took a whole screen down.

#### Scenario: A scene with tabs
- **WHEN** a scene has tabs or modes
- **THEN** every one of them is drawn by a test

#### Scenario: A drawing that only happens sometimes
- **WHEN** something is only drawn in a particular situation
- **THEN** a test puts the world into that situation
