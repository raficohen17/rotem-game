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

import { isFood, hasFoodLeft, biteFrom, isEdible } from './food.js';
import { sipsLeft, sipFrom, holds } from './drink.js';

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
  sit: {
    offset: 0,
    facing: 1,
    inFront: true,
    label: 'sit',
    icon: 'sit',
    carried: false,
    pose: 'sit',
    /* Where the seat is, as a fraction of the item's height. A stool and a
       sofa are not the same height, and a figure sat at a fixed height floats
       above one and sinks into the other. */
    seat: 0.46,
  },
  sleep: {
    offset: 0,
    facing: 1,
    inFront: true,
    label: 'sleep',
    icon: 'sleep',
    carried: false,
    pose: 'lie',
    asleep: true,
    seat: 0.62,
  },
  /*
   * Eating is the one action that changes the thing it is done to.
   *
   * Everything else here is an occupation — she is in the shower until she is
   * not. A bite is instant and leaves her standing where she was, free to take
   * another, which is what makes finishing a cake feel like something she did
   * rather than something she waited for.
   */
  eat: {
    offset: 0,
    facing: 1,
    inFront: true,
    label: 'eat',
    icon: 'eat',
    carried: false,
    instant: true,
  },
  drink: {
    offset: 0,
    facing: 1,
    inFront: true,
    label: 'drink',
    icon: 'drink',
    carried: false,
    instant: true,
  },
  bathe: {
    offset: 0,
    facing: 1,
    // The tub draws over her, so she is in the water rather than on it.
    inFront: false,
    label: 'bathe',
    icon: 'bathe',
    carried: false,
    pose: 'sit',
    /* Low, because a bath is sat down *in*. At a third of the tub's height
       her whole torso cleared the rim and she looked perched on the edge. */
    seat: 0.15,
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

  /* Every bed, so a bunk and a cot are not mysteriously different. */
  bed_single: 'sleep',
  bed_double: 'sleep',
  bunk_bed: 'sleep',
  crib: 'sleep',

  /* Every seat. A game where the sofa works and the armchair does not reads
     as broken rather than as unfinished. */
  sofa: 'sit',
  armchair: 'sit',
  chair: 'sit',
  stool: 'sit',
  beanbag: 'sit',
  toilet: 'sit',

  bathtub: 'bathe',

  cake: 'eat',
  steak: 'eat',
  omelette: 'eat',
  soup: 'eat',
  egg_boiled: 'eat',

  glass: 'drink',
  mug: 'drink',
  dog_bowl: 'drink',
};

/** The action an item offers, or null if it is only furniture. */
export function useFor(itemId) {
  const action = AFFORDS[itemId];
  return action && ACTIONS[action] ? action : null;
}

export function canUse(item) {
  if (!item) return false;
  const action = useFor(item.item);
  if (!action) return false;
  // An empty plate is not something to offer anybody.
  // Raw food is not offered to anybody: cooking it is the point.
  if (ACTIONS[action].instant && isFood(item)) return isEdible(item);
  // An empty glass is not a drink. It stays where it is, ready to be filled.
  if (action === 'drink') return sipsLeft(item) > 0;
  return true;
}

/**
 * Does an instant action, and says whether the thing it was done to is spent.
 *
 * Kept apart from beginUse because nothing is being occupied: she takes a bite
 * and is immediately free again, and the caller has to know when to clear an
 * empty plate off the table.
 */
export function actOnce(character, item, now = 0) {
  const action = useFor(item?.item);
  if (!action || !ACTIONS[action].instant) return false;
  if (action === 'drink') {
    if (sipsLeft(item) <= 0) return false;
    // Noted before the sip, because the last one empties the glass and the
    // splash would otherwise come out the colour of crumbs.
    const drink = holds(item);
    sipFrom(item);
    character.eating = { uid: item.uid, until: now + CHEW_TIME, drink };
    return sipsLeft(item) <= 0;
  }
  if (!isFood(item) || !hasFoodLeft(item)) return false;
  biteFrom(item);
  /*
   * A moment of actually eating it.
   *
   * The bite itself lands at once, so tapping does something immediately —
   * but with nothing drawn the food simply got smaller and then was not there,
   * and it read as things vanishing rather than as anybody eating. For the
   * next second she is holding it, which is the part that was missing.
   */
  character.eating = { uid: item.uid, until: now + CHEW_TIME };
  // The last mouthful clears the plate — but not until the bite has been seen,
  // so the caller is told to take it away when the chewing stops rather than
  // the instant the tap lands.
  return !hasFoodLeft(item);
}

/** How long she is shown eating after a bite, in seconds. */
export const CHEW_TIME = 0.9;

/** Whether she is mid-mouthful right now. */
export function isEating(character, now) {
  return Boolean(character?.eating) && now < character.eating.until;
}

/** Whether this action happens in a moment rather than being settled into. */
export function isInstant(itemId) {
  const action = useFor(itemId);
  return Boolean(action) && ACTIONS[action].instant === true;
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
