## ADDED Requirements

### Requirement: A cell frames what is being chosen
An option cell MUST frame the part being chosen closely enough to tell one
option from another, including parts far smaller than a head.

#### Scenario: Choosing nails
- **WHEN** she opens the nails tab
- **THEN** each cell shows a hand close up, not a whole figure with a hand in it

#### Scenario: A hand belongs to a body
- **WHEN** the hand is framed
- **THEN** it is framed off that character's own arm, so a grown-up and a child
  are both framed on their own hand rather than on a fixed spot

#### Scenario: Telling two shapes apart
- **WHEN** two nail shapes are shown side by side in the grid
- **THEN** the difference between them is visible at the size the phone draws
  the cell
