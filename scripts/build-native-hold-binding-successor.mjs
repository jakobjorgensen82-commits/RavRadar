#!/usr/bin/env node

// Append-only continuation binding for the measured native-hold replay fix.
// The applied predecessor is hash-pinned and never rewritten.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor = 'supabase/migrations/20260923052100_integrated_current_projection_binding.sql';
const destination = 'supabase/migrations/20260923091500_integrated_native_hold_continuation_binding.sql';
const oldVersion = '20260923052100';
const newVersion = '20260923091500';
const oldContinuation = '7ea4258b07a244e66cb9a1461eb77b469aa9355a28019f2fc7804bb14ee2d9ad';
const newContinuation = '954bb170421a7b140baa8ccc5bee96814348d8575a6cd2769be3055406a79b99';
const predecessorSha256 = '26d5133de58137d121c7f1bbf4410503fdfb553c5101010bd667dfcd6decd1a6';
const normalize = value => value.replace(/\r\n?/g, '\n');
const count = (text, value) => text.split(value).length - 1;
const source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(crypto.createHash('sha256').update(source).digest('hex'), predecessorSha256,
  'The applied current-projection migration must remain immutable');
for (const [value, expected] of [[oldVersion, 1], [newVersion, 0],
  [oldContinuation, 1], [newContinuation, 0]]) {
  assert.equal(count(source, value), expected, `Unexpected predecessor inventory for ${value}`);
}
const oldHeader = [
  '-- Re-assert the exact trip-policy and checkpoint binding after the generated',
  '-- integrated model bundle changed. The 20260922100000 predecessor remains',
  '-- immutable; this append-only successor is the current binding authority.',
].join('\n');
const newHeader = [
  '-- Re-assert the exact trip-policy and checkpoint binding after the measured',
  '-- native-hold continuation implementation changed. The 20260923052100',
  '-- predecessor remains immutable; this successor is the binding authority.',
].join('\n');
assert.equal(count(source, oldHeader), 1, 'Unexpected predecessor header');
const successor = source.replace(oldHeader, newHeader)
  .replace(`'${oldVersion}'`, `'${newVersion}'`)
  .replace(oldContinuation, newContinuation);
for (const [value, expected] of [[oldVersion, 1], [newVersion, 1],
  [oldContinuation, 0], [newContinuation, 1]]) {
  // The old version is intentionally cited once in the new explanatory header.
  assert.equal(count(successor, value), expected, `Unexpected successor inventory for ${value}`);
}
const mode = process.argv[2];
assert.ok(mode === undefined || mode === '--write' || mode === '--check', 'Unsupported generator option');
if (mode === '--write') await fs.writeFile(destination, successor, 'utf8');
else assert.equal(normalize(await fs.readFile(destination, 'utf8')), successor,
  'Native-hold binding successor is stale');
console.log('Native-hold continuation binding successor verified against immutable predecessor.');
