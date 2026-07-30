# house-designer Specification

## ADDED Requirements

### Requirement: Anything on or in something draws in front of it
Anything resting on, sitting in, or held by another object MUST be drawn in
front of that object, whatever its own position would otherwise imply. This
cannot be left to the ordinary rule, because things placed on top of something
sit higher up the screen and so sort *behind* it.

This has been rediscovered three times — a character standing at furniture, a
cat on a sofa, food in a fridge — and it will be found again by the next
feature that puts one object on another.

#### Scenario: Somebody sitting on a sofa
- **WHEN** a character sits on a sofa
- **THEN** she is drawn in front of it, not behind its back

#### Scenario: A cat on a sofa
- **WHEN** a cat settles on the cushions
- **THEN** it is drawn in front of the sofa

#### Scenario: Something in a container
- **WHEN** food is inside an open fridge
- **THEN** it is drawn in the doorway rather than behind the door

#### Scenario: A container that moves
- **WHEN** a container is dragged across the room
- **THEN** whatever is inside it goes too, rather than staying where the
  container used to be
