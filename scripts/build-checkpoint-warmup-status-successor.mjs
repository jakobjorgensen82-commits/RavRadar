#!/usr/bin/env node

// Reassert the protected checkpoint contract without editing an applied migration.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { ravScoreContinuationImplementationSha256 } from './lib/ravscore-continuation-implementation-contract.mjs';

const predecessor = 'supabase/migrations/20260923100000_integrated_checkpoint_part_identity_binding.sql';
const destination = 'supabase/migrations/20260923110000_integrated_checkpoint_warmup_status_binding.sql';
const predecessorSha256 = '3d0b9aa386cd19ee092a1fd2cb25afd3dc4b367d92c3fb1503bc0e1b4adf130c';
const continuationSha256 = 'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587';
const normalize = value => value.replace(/\r\n?/g, '\n');
const count = (source, value) => source.split(value).length - 1;
const source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(crypto.createHash('sha256').update(source).digest('hex'), predecessorSha256,
  'The applied part-identity migration must remain immutable');
assert.equal(await ravScoreContinuationImplementationSha256(), continuationSha256,
  'The successor may bind only the reviewed checkpoint implementation');

const oldHeader = [
  '-- Re-assert the exact trip-policy and checkpoint binding after the',
  '-- production-shaped checkpoint part-identity correction. The 20260923091500',
  '-- predecessor remains immutable; this successor is the binding authority.',
].join('\n');
const newHeader = [
  '-- Re-assert the exact trip-policy and checkpoint binding after the',
  '-- measured-warmup status correction. The 20260923100000 predecessor',
  '-- remains immutable; this successor is the binding authority.',
].join('\n');
const oldStatus = [
  "      when jsonb_typeof(v_item -> 'strength') = 'null' then 'LATEST_SAMPLE_MISSING'",
  "      when v_contains_missing then 'WINDOW_HAS_MISSING_EVIDENCE'",
].join('\n');
const newStatus = "      when v_contains_missing then 'WINDOW_HAS_MISSING_EVIDENCE'";
for (const [value, expected] of [[oldHeader, 1], [oldStatus, 1],
  ["'20260923100000'", 1], ["'20260923110000'", 0]]) {
  assert.equal(count(source, value), expected, `Unexpected predecessor inventory for ${value}`);
}
const successor = source.replace(oldHeader, newHeader)
  .replace("'20260923100000'", "'20260923110000'")
  .replace(oldStatus, newStatus);
assert.equal(count(successor, oldStatus), 0);
assert.equal(count(successor, newStatus), 1);
assert.equal(count(successor, "'20260923110000'"), 1);

const mode = process.argv[2];
assert.ok(mode === undefined || mode === '--write' || mode === '--check',
  'Unsupported generator option');
if (mode === '--write') await fs.writeFile(destination, successor, 'utf8');
else assert.equal(normalize(await fs.readFile(destination, 'utf8')), successor,
  'Checkpoint warmup-status successor is stale');
console.log('Checkpoint warmup-status successor verified against immutable predecessor.');
