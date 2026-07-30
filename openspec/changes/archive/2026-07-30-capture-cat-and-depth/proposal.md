## Why

Three things shipped since the cat arrived and none of them are written down,
and one of the three is a rule that has now been rediscovered the hard way
three separate times.

The cat gained the run of the house, started keeping time off the wall clock
rather than off frames drawn, and learned to sit on a cushion rather than on
the top of the bounding box. All three were bugs found by Rotem or her father
rather than by anything here, which is the definition of a rule that was never
recorded.

The third is the important one. Whenever something sits **on** or **in**
something else, the depth tie has to be settled deliberately or the thing draws
behind what it is supposed to be in front of. It has now bitten characters
standing at furniture, cats sitting on sofas, and food put in the fridge. It
will bite the next feature that puts one object on another, and cooking is
exactly such a feature.

## What Changes

- **cat-life**: the cat wanders the house, keeps time off the wall clock, and
  rests where a cat would rest rather than on top of a bounding box.
- **house-designer**: the depth rule stated once, generally, so the next thing
  placed on or in another thing does not have to find it again.
- **offline-app-shell**: an update is asked for when the app comes back to the
  foreground, because she never navigates — she resumes from the app switcher.

## Impact

Documentation only. Everything here is live in v43 and covered by the 545 tests
already in the suite.
