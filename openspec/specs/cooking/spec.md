# cooking Specification

## Purpose
TBD - created by archiving change add-cooking. Update Purpose after archive.
## Requirements
### Requirement: A recipe is an ingredient, a utensil and heat
Cooking MUST require all three: something to cook, something to cook it in, and
a stove that is switched on. Any one of them missing MUST simply mean nothing
happens, because this is the first thing in the game with several steps and the
steps are the point.

#### Scenario: An omelette
- **WHEN** an egg is in a pan, and the pan is on a lit stove
- **THEN** after a while the egg has become an omelette

#### Scenario: A steak
- **WHEN** raw steak is in a pan on a lit stove
- **THEN** after a while it has become a cooked steak

#### Scenario: The stove is off
- **WHEN** an egg is in a pan on a stove that is not lit
- **THEN** nothing happens, and the egg is still an egg

#### Scenario: No pan
- **WHEN** an egg is put straight onto a lit stove
- **THEN** nothing happens

#### Scenario: A pairing with no recipe
- **WHEN** something is cooked that no recipe mentions
- **THEN** nothing happens, and nothing is spoiled

### Requirement: Cooking cannot go wrong
Nothing in cooking MUST be able to fail, burn, or be wasted. Play cannot fail
anywhere else in the game and the kitchen is not where that starts.

#### Scenario: Left on the heat
- **WHEN** something finished is left on a lit stove
- **THEN** it stays as it is rather than burning

#### Scenario: Changing her mind
- **WHEN** something part-cooked is taken off the stove
- **THEN** it can be put back, and carries on from where it was

#### Scenario: Turning the stove off halfway
- **WHEN** the stove is switched off while something is cooking
- **THEN** it waits, and carries on when the stove is lit again

### Requirement: It is clear that something is happening
Cooking MUST be visible while it is going on, and MUST show when it is done. A
wait with nothing to watch is indistinguishable from a thing that is broken —
which is exactly how the cat read before it moved often enough to be seen.

#### Scenario: While it cooks
- **WHEN** something is cooking
- **THEN** the pan shows that it is, without anything having to be read

#### Scenario: When it is done
- **WHEN** it has finished
- **THEN** it plainly looks like the new thing rather than the old one

### Requirement: Raw ingredients are not food yet
An ingredient that is meant to be cooked MUST NOT be edible as it is, so that
cooking is worth doing.

#### Scenario: Raw steak
- **WHEN** a character is next to raw steak
- **THEN** she is not offered it to eat

#### Scenario: Once it is cooked
- **WHEN** the same steak has been cooked
- **THEN** she can eat it

#### Scenario: What a cat thinks
- **WHEN** a cat finds raw steak left out
- **THEN** it eats it, because a cat does not wait for anybody to cook

### Requirement: What makes what can be looked up
There MUST be a rule book showing every recipe, and it MUST be readable by
somebody who cannot read. A recipe nobody can look up is a recipe nobody finds.

#### Scenario: Opening the book
- **WHEN** the rule book is opened
- **THEN** every recipe is shown as pictures: what goes in, what it goes in,
  and what comes out

#### Scenario: Nothing to read
- **WHEN** a recipe is shown
- **THEN** it can be understood without reading any words

#### Scenario: A new recipe
- **WHEN** a recipe is added to the game
- **THEN** it appears in the book without the book having to be edited

### Requirement: Utensils hold ingredients
A utensil MUST be able to hold an ingredient, and MUST be placeable on a stove,
using the same placing and stacking rules as everything else.

#### Scenario: Filling a pan
- **WHEN** an ingredient is dropped onto a pan
- **THEN** it is in the pan, and travels with it

#### Scenario: A pan on the stove
- **WHEN** a pan is dropped onto a stove
- **THEN** it stands on the stove top

#### Scenario: Emptying it
- **WHEN** what is in a pan is dragged out
- **THEN** it is out, and the pan is empty

