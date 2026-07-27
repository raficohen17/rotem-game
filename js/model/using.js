/**
 * Characters using furniture.
 *
 * A room full of things you can only move around is a showroom. Being able to
 * put someone *in* the shower or hand her a book is what turns it into play,
 * and it is the thing Rotem asked for by name.
 *
 * What an item affords is declared here rather than in the catalog, so adding
 * a use to an existing item is one line and needs no change to the art or the
 * saved worlds. Pure and testable — no canvas, no DOM.
 */

/**
 * Things that happen to the object rather than to the character.
 *
 * A lamp she switched on should still be on after she leaves the room — the
 * state belongs to the lamp, not to her. These are toggled rather than
 * occupied, so several can be on at once and nobody is stuck holding them.
 */
export const SWITCHES = {
  light: { icon: 'light', label: 'light' },
  watch: { icon: 'tv', label: 'watch' },
  open: { icon: 'open', label: 'open' },
  cook: { icon: 'cook', label: 'cook' },
};

/** Items whose action is a switch on the object. */
export const SWITCHED = {
  lamp_floor: 'light',
  lamp_table: 'light',
  tv: 'watch',
  fridge: 'open',
  stove: 'cook',
};

export function switchFor(itemId) {
  const action = SWITCHED[itemId];
  return action && SWITCHES[action] ? action : null;
}

export function canSwitch(item) {
  return Boolean(item && switchFor(item.item));
}

/** Flips a switchable object, and reports what it now is. */
export function toggleSwitch(item) {
  if (!canSwitch(item)) return false;
  item.on = !item.on;
  return item.on;
}

export function isOn(item) {
  return Boolean(item?.on);
}

/** What a character can be doing. */
export const ACTIONS = {
  read: {
    /** Where she stands relative to the item's centre, and which way she looks. */
    offset: 0,
    facing: 1,
    /** She stands in front of it rather than behind. */
    inFront: true,
    label: 'read',
    /** The button she is offered. Named here so a test can check it exists. */
    icon: 'book',
    /** She picks it up, so it is drawn in her hands and not on the floor. */
    carried: true,
  },
  shower: {
    offset: 0,
    facing: 1,
    // Behind the curtain, so the curtain draws over her.
    inFront: false,
    label: 'shower',
    icon: 'shower',
    carried: false,
  },
};

/**
 * Which action an item offers, by catalog id.
 *
 * Keyed on the id rather than the category because two things in the same
 * drawer can afford different play: a shower is used standing behind a
 * curtain, a bath is sat in.
 */
export const AFFORDS = {
  book: 'read',
  shower: 'shower',
};

/** The action an item offers, or null if it is only furniture. */
export function useFor(itemId) {
  const action = AFFORDS[itemId];
  return action && ACTIONS[action] ? action : null;
}

export function canUse(item) {
  return Boolean(item && useFor(item.item));
}

/**
 * Puts a character to work at an item.
 *
 * Records the item's uid rather than a reference, so a world that has been
 * saved and reloaded still knows what she is doing — and so an item that gets
 * deleted while in use leaves a dangling id that `resolveUse` simply drops.
 */
export function beginUse(character, item) {
  const action = useFor(item.item);
  if (!action) return false;
  character.using = { uid: item.uid, action };
  character.x = item.x + ACTIONS[action].offset;
  character.y = item.y;
  return true;
}

export function stopUsing(character) {
  delete character.using;
}

export function isUsing(character) {
  return Boolean(character?.using);
}

/**
 * The item a character is using, looked up in the room she is in.
 *
 * Returns null — and clears the record — when the item is gone, which is what
 * happens if she is showering and the shower is deleted out from under her.
 */
export function resolveUse(character, items) {
  if (!character?.using) return null;
  const item = items.find((entry) => entry.uid === character.using.uid);
  if (!item) {
    stopUsing(character);
    return null;
  }
  return { item, action: character.using.action, ...ACTIONS[character.using.action] };
}

/**
 * The uids of items currently in somebody's hands.
 *
 * Drawn in her hands *and* left standing where it was, a book she is reading
 * appears twice in the room.
 */
export function carriedItems(characters) {
  const held = new Set();
  for (const c of characters ?? []) {
    if (c?.using && ACTIONS[c.using.action]?.carried) held.add(c.using.uid);
  }
  return held;
}

/** Walking anywhere means she has stopped using whatever she was using. */
export function releaseForWalk(character) {
  if (character?.using) stopUsing(character);
}
