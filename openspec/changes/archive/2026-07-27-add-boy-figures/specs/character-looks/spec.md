# character-looks Specification

## ADDED Requirements

### Requirement: Boys can be dressed in one tap
The complete looks MUST include boys' outfits, so one tap reaches a dressed boy
the same way it reaches a dressed girl. Parts that exist but that only combine
into a boy by careful assembly are not enough — that is the assembled-rather-
than-designed problem the looks were added to solve.

#### Scenario: A boy look is offered
- **WHEN** the looks are shown
- **THEN** at least two dress the figure as a boy
- **AND** choosing one sets the build, hair, garments and shoes together

#### Scenario: A look is a whole outfit
- **WHEN** a boy look is chosen
- **THEN** every garment slot it names is set
- **AND** nothing is left over from the look chosen before it

### Requirement: Three named boys are reachable
Three specific and different boys MUST be reachable from the parts, as the test
of whether the range is really there. Named children are checkable in a way that
"add boys" is not.

#### Scenario: A school boy
- **WHEN** a jumper, a collar, a tie, sensible shoes and a combed short cut are
  chosen
- **THEN** the figure reads as a boy dressed for school

#### Scenario: A scruffy boy
- **WHEN** a mop of hair, a t-shirt, shorts and scuffed boots are chosen
- **THEN** the figure reads as a boy who has been outside all day

#### Scenario: A small boy
- **WHEN** a round face, a soft crop and dungarees are chosen
- **THEN** the figure reads as a young boy rather than a shrunken adult
