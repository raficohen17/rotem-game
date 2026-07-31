## Why

The same handful of mistakes keep being made, in new clothes each time.

Four times now something resting on or inside something else has been drawn
behind it — a character at furniture, a cat on a sofa, food in a fridge, and it
would have been food in a pan had the first three not taught me to look. Three
times a scene has shipped broken because no test ever put it in the state that
broke: the people drawer, the creator's colour tabs, a pan on a stove. Twice a
value measured against a clock that restarts each session has been saved, and
frozen something the next time the app opened.

Each was found by Rotem or her father playing, and each was fixed on its own,
as if it were a one-off. They are not one-offs. They are the same few rules
being rediscovered, and the next feature will rediscover them again unless they
are written down where they apply to everything rather than to the thing that
happened to break.

This change writes them down once, generally, and — more usefully — turns the
ones that can be checked into tests that apply to objects that do not exist
yet. A container added next month gets checked without anybody remembering to
check it.

## What Changes

Six rules, stated once and enforced where they can be:

- **Anything inside anything** has to answer the same four questions: can it be
  seen, can it be reached, does it travel with what holds it, does it survive
  being saved. Each container has answered them separately and got a different
  subset right.
- **Every placement is reversible.** A finished omelette was stuck in its pan
  for good, which is the one place food must never be stuck.
- **A state the player can cause must be visible.** Eating that showed nothing,
  a cat that had not moved, a walk hint drawn off the screen — all read as the
  game being broken rather than as nothing having happened.
- **Nothing measured against the session clock is saved.** It restarts at zero,
  so a saved value is a debt the next session has to pay off.
- **Nothing a drawer gives away undermines an activity that produces it.** An
  omelette in the drawer made cooking one pointless.
- **Every state a player can reach is exercised by the harness.** Three crashes
  shipped through a green suite because no test opened that tab.

## Impact

- `openspec/specs/gameplay-rules/` — the rules themselves
- `test/rules.test.js` — the ones that can be enforced, written to apply to
  every container and every recipe rather than to a list
