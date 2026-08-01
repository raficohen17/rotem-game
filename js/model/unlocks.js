/**
 * Parts held back behind a code.
 *
 * There is no server and there never will be, so a code is checked against a
 * hash that ships in this file. That keeps the codes themselves out of
 * anything readable — it is not a lock. The whole game runs on the player's
 * machine and anybody willing to open devtools can write to the unlock list
 * directly. Nothing of value is behind it: the point is that Rotem gets a code
 * on a note and something appears, not that the something is defended.
 *
 * The hash is written out longhand rather than taken from `crypto.subtle`,
 * which is only defined in a secure context. The game is served off a laptop
 * with `python3 -m http.server` and opened from the phone over plain http,
 * where `crypto.subtle` is undefined and every code would fail on the one
 * setup used while building this. It is also synchronous, which keeps this
 * file in the same shape as every other model file and testable under
 * node:test without async.
 */

/* ------------------------------------------------------------------ sha256 */

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const rotr = (x, n) => (x >>> n) | (x << (32 - n));

/** UTF-8 bytes, so a code with anything but plain letters still hashes. */
function utf8Bytes(text) {
  const out = [];
  for (const char of text) {
    let code = char.codePointAt(0);
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    } else {
      out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    }
  }
  return out;
}

/** @returns {string} the SHA-256 of `text`, as 64 lowercase hex characters. */
export function sha256(text) {
  const bytes = utf8Bytes(String(text));
  const bitLen = bytes.length * 8;

  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  // The length goes in as 64 bits. The top four bytes are always zero here —
  // nothing this hashes is anywhere near 2^32 bits long.
  bytes.push(0, 0, 0, 0,
    (bitLen >>> 24) & 255, (bitLen >>> 16) & 255, (bitLen >>> 8) & 255, bitLen & 255);

  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const w = new Uint32Array(64);

  for (let i = 0; i < bytes.length; i += 64) {
    for (let t = 0; t < 16; t += 1) {
      const o = i + t * 4;
      w[t] = (bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3];
    }
    for (let t = 16; t < 64; t += 1) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let t = 0; t < 64; t += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e;
      e = (d + t1) >>> 0;
      d = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
    }
    const next = [a, b, c, d, e, f, g, hh];
    for (let t = 0; t < 8; t += 1) h[t] = (h[t] + next[t]) >>> 0;
  }

  return h.map((n) => n.toString(16).padStart(8, '0')).join('');
}

/* ------------------------------------------------------------------- locks */

/**
 * What a locked part is called in the unlock list.
 *
 * A part has never had an id — it is a key and an index — so one is made here
 * rather than invented in three places.
 */
export function lockId(key, index) {
  return `${key}:${index}`;
}

/**
 * The value stored for a code.
 *
 * Salted with the lock id, so the same code minted for two parts produces two
 * different hashes. Without that, one code would quietly open both, and
 * picking codes would secretly require them to be unique across the whole
 * game.
 */
export function hashFor(id, code) {
  return sha256(`${id}:${code}`);
}

/** How a code is written down, and so what the field will accept. */
export const CODE_LENGTH = 6;

/** Lowercase letters only: it is typed by a seven year old on a phone. */
export function cleanCode(raw) {
  return String(raw ?? '').toLowerCase().replace(/[^a-z]/g, '').slice(0, CODE_LENGTH);
}

/**
 * The parts that need a code.
 *
 * A table rather than a field on a catalog entry, because parts are not
 * catalog entries — a part has always been an index plus the code that draws
 * it. Locking one costs a row here, which is the same shape as adding one.
 */
export const LOCKED_PARTS = [
  {
    key: 'bottom',
    index: 10,
    name: 'Gala dress',
    codeHash: 'a1e7cbe1376a8825d08fb448a15502fc7b08920cd42b44190ce9c8c95f811bb0',
  },
  {
    key: 'held',
    index: 6,
    name: 'Magic sword',
    codeHash: '6687fe126c4203996ce17f702a33237506660092cb032884582f548614681408',
  },
];

/** The locked part at a given option, or null when that option is free. */
export function lockFor(key, index) {
  return LOCKED_PARTS.find((p) => p.key === key && p.index === index) ?? null;
}

/** @returns {boolean} whether this option still needs a code. */
export function isLocked(key, index, unlocked = []) {
  const lock = lockFor(key, index);
  if (!lock) return false;
  return !unlocked.includes(lockId(key, index));
}

/**
 * Tries a code against a lock.
 *
 * Returns the list to store. A wrong code returns the list it was given, which
 * is how the caller tells the two apart — and means a wrong code can never
 * take away something already unlocked.
 */
export function redeem(id, code, unlocked = []) {
  const lock = LOCKED_PARTS.find((p) => lockId(p.key, p.index) === id);
  if (!lock) return unlocked;
  if (hashFor(id, cleanCode(code)) !== lock.codeHash) return unlocked;
  if (unlocked.includes(id)) return unlocked; // entering it twice changes nothing
  return [...unlocked, id];
}

/** Drops anything in a stored list that is not a lock this version knows. */
export function cleanUnlocks(list) {
  if (!Array.isArray(list)) return [];
  const known = new Set(LOCKED_PARTS.map((p) => lockId(p.key, p.index)));
  return [...new Set(list.filter((id) => known.has(id)))];
}
