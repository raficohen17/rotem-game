# world-storage Specification

## ADDED Requirements

### Requirement: The shelf shows a picture of each house
Every saved world MUST carry a picture of its house, so the shelf is read by
looking rather than by remembering which name is which.

#### Scenario: A house that has been played in
- **WHEN** a world has been opened
- **THEN** its slot on the shelf shows the house as it currently stands

#### Scenario: The picture keeps up with the house
- **WHEN** furniture is added and the world is left by any route
- **THEN** the picture on the shelf reflects the change
