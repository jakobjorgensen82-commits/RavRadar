#!/usr/bin/env node

// Keep the applied migration immutable; install only the reviewed missing-state successor.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { ravScoreContinuationImplementationSha256 } from './lib/ravscore-continuation-implementation-contract.mjs';

const predecessor = 'supabase/migrations/20260923110000_integrated_checkpoint_warmup_status_binding.sql';
const destination = 'supabase/migrations/20260923120000_integrated_checkpoint_missing_state_binding.sql';
const predecessorSha256 = '24c77f96a0a21a95232dba473394b1e19783bca4bceb32069e5bb482c4421187';
const continuationSha256 = 'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587';
const normalize = value => value.replace(/\r\n?/g, '\n');
const count = (source, value) => source.split(value).length - 1;
let source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(crypto.createHash('sha256').update(source).digest('hex'), predecessorSha256,
  'The applied warmup-status migration must remain immutable');
assert.equal(await ravScoreContinuationImplementationSha256(), continuationSha256,
  'The successor may bind only the reviewed checkpoint implementation');

function replaceExactly(oldText, newText, label) {
  assert.equal(count(source, oldText), 1, `Unexpected predecessor ${label} inventory`);
  source = source.replace(oldText, newText);
}

replaceExactly([
  '-- Re-assert the exact trip-policy and checkpoint binding after the',
  '-- measured-warmup status correction. The 20260923100000 predecessor',
  '-- remains immutable; this successor is the binding authority.',
].join('\n'), [
  '-- Re-assert the exact trip-policy and checkpoint binding after the',
  '-- missing-state correction. The 20260923110000 predecessor remains',
  '-- immutable; this successor is the binding authority.',
].join('\n'), 'header');
replaceExactly("'20260923110000'", "'20260923120000'", 'migration version');
replaceExactly([
  "      'WINDOW_HAS_TIME_GAP','READY','READY_NATIVE_HOLD'",
].join('\n'), [
  "      'WINDOW_HAS_TIME_GAP','LATEST_SAMPLE_MISSING','LATEST_SAMPLE_GAP',",
  "      'EVIDENCE_LIMIT_EXCEEDED','READY','READY_NATIVE_HOLD'",
].join('\n'), 'integrated unavailable statuses');
replaceExactly(
  "  if pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') not between 1 and 49",
  [
    "  if pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') > 49",
    "    or ((p_state -> 'currentMemoryReady') = 'true'::jsonb",
    "      and pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') < 2)",
  ].join('\n'),
  'integrated evidence bound',
);
replaceExactly([
  "        or (ordered.previous_time is not null",
  "          and ordered.previous_time::timestamptz",
  "            >= (ordered.value ->> 'time')::timestamptz)",
  "    )",
  "    or p_state -> 'currentEvidence'",
  "      -> (pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') - 1)",
  "      ->> 'time' is distinct from p_state ->> 'currentReferenceAt'",
].join('\n'), [
  "        or (ordered.previous_time is not null",
  "          and ordered.previous_time::timestamptz",
  "            >= (ordered.value ->> 'time')::timestamptz)",
  "        or (ordered.value ->> 'time')::timestamptz > v_current_reference",
  "    )",
  "    or (((p_state -> 'currentMemoryReady') = 'true'::jsonb)",
  "      and p_state -> 'currentEvidence'",
  "        -> (pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') - 1)",
  "        ->> 'time' is distinct from p_state ->> 'currentReferenceAt')",
].join('\n'), 'integrated last-evidence bound');
replaceExactly([
  '    if v_previous is distinct from v_reference then return false; end if;',
  '    v_coverage := case when v_suffix_start is null then 0',
  '      else extract(epoch from (v_reference - v_suffix_start)) / 3600 end;',
  '    v_status := case',
  "      when v_contains_missing then 'WINDOW_HAS_MISSING_EVIDENCE'",
].join('\n'), [
  '    v_coverage := case when v_previous is distinct from v_reference',
  '      or v_suffix_start is null then 0',
  '      else extract(epoch from (v_reference - v_suffix_start)) / 3600 end;',
  '    v_status := case',
  "      when v_previous is distinct from v_reference then 'LATEST_SAMPLE_MISSING'",
  "      when v_contains_missing then 'WINDOW_HAS_MISSING_EVIDENCE'",
].join('\n'), 'candidate missing-last status');

const mode = process.argv[2];
assert.ok(mode === undefined || mode === '--write' || mode === '--check',
  'Unsupported generator option');
if (mode === '--write') await fs.writeFile(destination, source, 'utf8');
else assert.equal(normalize(await fs.readFile(destination, 'utf8')), source,
  'Checkpoint missing-state successor is stale');
console.log('Checkpoint missing-state successor verified against immutable predecessor.');
