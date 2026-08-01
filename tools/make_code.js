#!/usr/bin/env node
/**
 * Mints the hash for a code.
 *
 *   node tools/make_code.js bottom:10 tyyffk
 *
 * Prints the value to paste into `LOCKED_PARTS` in js/model/unlocks.js. It
 * imports the game's own hashing rather than repeating it, so what is written
 * into the table cannot drift from what the game checks.
 *
 * Write the code itself down somewhere that is not this repository. It is not
 * recoverable from the hash, and it is the only way back in after site data is
 * cleared.
 */

import { hashFor, cleanCode, lockId, LOCKED_PARTS, CODE_LENGTH } from '../js/model/unlocks.js';

const [id, raw] = process.argv.slice(2);

if (!id || !raw) {
  console.error('usage: node tools/make_code.js <part> <code>');
  console.error(`       <part> is one of: ${LOCKED_PARTS.map((p) => lockId(p.key, p.index)).join(', ')}`);
  process.exit(1);
}

const code = cleanCode(raw);

if (code.length !== CODE_LENGTH) {
  console.error(`a code is ${CODE_LENGTH} lowercase letters — "${raw}" cleans to "${code}"`);
  process.exit(1);
}

const known = LOCKED_PARTS.find((p) => lockId(p.key, p.index) === id);
if (!known) {
  console.error(`no locked part called "${id}". Add it to LOCKED_PARTS first.`);
  process.exit(1);
}

console.log(`${known.name}  (${id})`);
console.log(`  code:     ${code}`);
console.log(`  codeHash: '${hashFor(id, code)}',`);
