#!/usr/bin/env node

// Rebind the changed weather-selection implementation without editing an
// applied migration or reverting later checkpoint-validator corrections.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const sources = Object.freeze({
  base: ['supabase/migrations/20260923120000_integrated_checkpoint_missing_state_binding.sql',
    'a171ed10e1520d2979fae506aba9aca17d420ded2a11fc12ba087dfb32ccd6c1'],
  nativeHold: ['supabase/migrations/20260923140000_checkpoint_native_hold_null_evidence.sql',
    'b502c3c1abc12fb07375eca7954f7538d4c8f5d12f776802e7dc48a8173caa8d'],
  companion: ['supabase/migrations/20260923160000_checkpoint_candidate_companion_id.sql',
    '14d2746b647006c2720a1666887f02ed59e964fe5841b626101b32efd77efe00'],
});
const destination = 'supabase/migrations/20260925150000_weather_selection_model_binding.sql';
const predecessorHash = '61ec54746fdf1ac58f3d7859d4d55a901fcc6376d0412acf2d6f4f418ae5c0a1';
const successorHash = 'c557f91a520ae64211f9441f25fc72a9c230691cdb7b48551ecb7286463420eb';
const frozenCandidateHash = 'c7c4840d3c07b71610b30d1528633bc30a9e2449d77e331d3018852a4e68891c';
const currentCandidateHash = 'a2494810db3a335376795e308d149f5856885c05665d9f155fc6b0632344c021';
const frozenContinuationHash = 'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587';
const currentContinuationHash = '46683362ec6b69835695db375f7de976a8dd0a75b7367a27e2854b653d73e0ab';
const normalize = text => text.replace(/\r\n?/g, '\n');
const count = (text, value) => text.split(value).length - 1;

async function immutableSource([file, expectedHash]) {
  const source = normalize(await fs.readFile(file, 'utf8'));
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), expectedHash,
    `${file} changed after application`);
  return source;
}

function functionDefinition(source, name) {
  const marker = `create or replace function public.${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0 && source.indexOf(marker, start + 1) < 0,
    `${name} must have exactly one reviewed definition`);
  const end = source.indexOf('\n$$;', start);
  assert.ok(end > start, `${name} is incomplete`);
  return source.slice(start, end + '\n$$;'.length);
}

const base = await immutableSource(sources.base);
const nativeHold = await immutableSource(sources.nativeHold);
const companion = await immutableSource(sources.companion);
let successor = base;
for (const [name, currentSource] of [
  ['ravradar_ravscore_checkpoint_integrated_state_valid', nativeHold],
  ['ravradar_ravscore_checkpoint_payload_valid', companion],
]) {
  successor = successor.replace(functionDefinition(base, name),
    () => functionDefinition(currentSource, name));
}
assert.equal(count(successor, predecessorHash), 3,
  'Expected the trip, state and payload predecessor bindings exactly once');
successor = successor.replaceAll(predecessorHash, successorHash);
assert.equal(count(successor, frozenCandidateHash), 2,
  'Expected the trip and payload frozen Candidate G bindings exactly once');
successor = successor.replaceAll(frozenCandidateHash, currentCandidateHash);
assert.equal(count(successor, frozenContinuationHash), 1,
  'Expected one validator continuation-implementation binding');
successor = successor.replaceAll(frozenContinuationHash, currentContinuationHash);
const bridge = `        '${successorHash}'\n      )`;
assert.equal(count(successor, bridge), 1, 'Trip binding transition bridge is ambiguous');
successor = successor.replace(bridge,
  () => `        '${predecessorHash}',\n        '${successorHash}'\n      )`);

const reasonFunctions = [
  functionDefinition(nativeHold, 'ravradar_ravscore_checkpoint_integrated_state_reason')
    .replaceAll(predecessorHash, successorHash),
  functionDefinition(companion, 'ravradar_ravscore_checkpoint_payload_reason')
    .replaceAll(predecessorHash, successorHash),
].map(definition => definition
  .replaceAll(frozenCandidateHash, currentCandidateHash)
  .replaceAll(frozenContinuationHash, currentContinuationHash)
  .replace(/(RAVSCORE_CHECKPOINT_[A-Z0-9_]+)_GENERATED_(BEGIN|END)/g,
    '$1_DIAGNOSTIC_$2'));
const outerEnd = '-- RAVSCORE_CHECKPOINT_METADATA_CAS_GENERATED_END';
assert.equal(count(successor, outerEnd), 1, 'Checkpoint outer marker is ambiguous');
successor += [
  '',
  'begin;',
  "set local lock_timeout = '5s';",
  '-- Preserve the later protected null-evidence and companion-ID diagnostics.',
  ...reasonFunctions.flatMap((definition, index) => [
    definition,
    `revoke all on function public.${index === 0
      ? 'ravradar_ravscore_checkpoint_integrated_state_reason(jsonb,text)'
      : 'ravradar_ravscore_checkpoint_payload_reason(jsonb,timestamptz)'} from public, anon, authenticated;`,
  ]),
  '',
  '-- Re-assert the bounded timeout after replacing the checkpoint CAS function.',
  "alter function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb) set statement_timeout = '30s';",
  "notify pgrst, 'reload schema';",
  'commit;',
  '',
].join('\n');
successor = successor.replace(
  '-- Re-assert the exact trip-policy and checkpoint binding after the\n'
    + '-- missing-state correction. The 20260923110000 predecessor remains\n'
    + '-- immutable; this successor is the binding authority.\n'
    + '-- No score rule, provider rule, state row or history is rewritten.',
  '-- Rebind the changed weather-selection implementation without changing score rules.\n'
    + '-- The applied 20260923120000 predecessor and later validator corrections\n'
    + '-- remain immutable; this successor preserves their final behavior.\n'
    + '-- No weather, state row or history is rewritten.',
);
assert.equal(count(successor, "'20260923120000'"), 1,
  'Checkpoint contract migration version is ambiguous');
successor = successor.replace("'20260923120000'", "'20260925150000'");
assert.equal(count(successor, predecessorHash), 1,
  'Only the explicit trip transition bridge may retain the predecessor hash');
assert.equal(count(successor, successorHash), 5,
  'Current trip, state, payload and diagnostic binding inventory drifted');
assert.equal(count(successor, currentCandidateHash), 3,
  'Current Candidate G rollback closure is not bound consistently');

const mode = process.argv[2] ?? '--check';
assert.ok(mode === '--write' || mode === '--check', 'Use --write or --check');
if (mode === '--write') await fs.writeFile(destination, successor, 'utf8');
else assert.equal(normalize(await fs.readFile(destination, 'utf8')), successor,
  'Weather-selection model-binding successor is stale');
console.log('Weather-selection model binding preserves immutable predecessors and later validators.');
