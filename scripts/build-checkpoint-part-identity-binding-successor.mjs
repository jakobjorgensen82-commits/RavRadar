#!/usr/bin/env node

// Append-only binding for the production-shaped checkpoint part identity.
// Never edit the applied predecessor to follow a new implementation hash.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { ravScoreContinuationImplementationSha256 } from './lib/ravscore-continuation-implementation-contract.mjs';

const predecessor = 'supabase/migrations/20260923091500_integrated_native_hold_continuation_binding.sql';
const destination = 'supabase/migrations/20260923100000_integrated_checkpoint_part_identity_binding.sql';
const oldVersion = '20260923091500';
const newVersion = '20260923100000';
const oldContinuation = '954bb170421a7b140baa8ccc5bee96814348d8575a6cd2769be3055406a79b99';
const newContinuation = 'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587';
const predecessorSha256 = 'fb6b357395c11e5982eb496187a6eb3c45502c21ef036a12ecb1ad4838a5457d';
const normalize = value => value.replace(/\r\n?/g, '\n');
const count = (source, value) => source.split(value).length - 1;
const source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(crypto.createHash('sha256').update(source).digest('hex'), predecessorSha256,
  'The applied native-hold migration must remain immutable');
assert.equal(await ravScoreContinuationImplementationSha256(), newContinuation,
  'The successor may bind only the reviewed checkpoint implementation');
for (const [value, expected] of [[oldVersion, 1], [newVersion, 0],
  [oldContinuation, 1], [newContinuation, 0]]) {
  assert.equal(count(source, value), expected, `Unexpected predecessor inventory for ${value}`);
}
const oldHeader = [
  '-- Re-assert the exact trip-policy and checkpoint binding after the measured',
  '-- native-hold continuation implementation changed. The 20260923052100',
  '-- predecessor remains immutable; this successor is the binding authority.',
].join('\n');
const newHeader = [
  '-- Re-assert the exact trip-policy and checkpoint binding after the',
  '-- production-shaped checkpoint part-identity correction. The 20260923091500',
  '-- predecessor remains immutable; this successor is the binding authority.',
].join('\n');
assert.equal(count(source, oldHeader), 1, 'Unexpected predecessor header');
const successor = source.replace(oldHeader, newHeader)
  .replace(`'${oldVersion}'`, `'${newVersion}'`)
  .replace(oldContinuation, newContinuation);
for (const [value, expected] of [[oldVersion, 1], [newVersion, 1],
  [oldContinuation, 0], [newContinuation, 1]]) {
  assert.equal(count(successor, value), expected, `Unexpected successor inventory for ${value}`);
}
const mode = process.argv[2];
assert.ok(mode === undefined || mode === '--write' || mode === '--check',
  'Unsupported generator option');
if (mode === '--write') await fs.writeFile(destination, successor, 'utf8');
else assert.equal(normalize(await fs.readFile(destination, 'utf8')), successor,
  'Checkpoint part-identity binding successor is stale');
console.log('Checkpoint part-identity successor verified against immutable predecessor.');
