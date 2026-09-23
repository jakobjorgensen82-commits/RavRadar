#!/usr/bin/env node

// The Candidate G companion carries the immutable Candidate G rollback
// package's own ID. The applied checkpoint SQL compared it with the distinct
// schema-6 controller transition ID. Change only that exact comparison.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { CANDIDATE_G_OPERATIONAL_ROLLBACK_ID } from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import { RAVSCORE_ROLLBACK_ID as INTEGRATED_TRANSITION_ID } from '../js/core/ravscore-model-contract.js';

const validatorPath = 'supabase/migrations/20260923120000_integrated_checkpoint_missing_state_binding.sql';
const reasonPath = 'supabase/migrations/20260923130000_checkpoint_rejection_diagnostic.sql';
const destination = 'supabase/migrations/20260923160000_checkpoint_candidate_companion_id.sql';
const hashes = new Map([
  [validatorPath, 'a171ed10e1520d2979fae506aba9aca17d420ded2a11fc12ba087dfb32ccd6c1'],
  [reasonPath, '6c43152ca038e5d322063cb3ed922bfb43dc698de5690629b488b4a6dfbf6d57'],
]);
const normalize = value => value.replace(/\r\n?/g, '\n');
async function immutableSource(file) {
  const source = normalize(await fs.readFile(file, 'utf8'));
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), hashes.get(file),
    `${file} changed after application`);
  return source;
}
function functionDefinition(source, name) {
  const marker = `create or replace function public.${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0 && source.indexOf(marker, start + 1) < 0,
    `${name} must have one reviewed definition`);
  const end = source.indexOf('\n$$;', start);
  assert.ok(end > start, `${name} is incomplete`);
  return source.slice(start, end + '\n$$;'.length);
}

assert.equal(CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
  'integrated-schema5-to-candidate-g-schema2-v2',
  'Companion ID must be the exact existing frozen Candidate G package ID');
assert.equal(INTEGRATED_TRANSITION_ID, 'integrated-schema6-to-candidate-g-schema2-v3',
  'The separate integrated transition identity must not be redefined');
const oldRule = `    or v_companion ->> 'rollbackId'
      is distinct from '${INTEGRATED_TRANSITION_ID}'`;
const newRule = `    or v_companion ->> 'rollbackId'
      is distinct from '${CANDIDATE_G_OPERATIONAL_ROLLBACK_ID}'`;
function bindCompanionId(definition, name) {
  assert.equal(definition.split(oldRule).length - 1, 1,
    `${name} must have one mismatched companion-ID comparison`);
  return definition.replace(oldRule, newRule);
}
const validator = bindCompanionId(functionDefinition(
  await immutableSource(validatorPath),
  'ravradar_ravscore_checkpoint_payload_valid',
), 'checkpoint validator');
const reason = bindCompanionId(functionDefinition(
  await immutableSource(reasonPath),
  'ravradar_ravscore_checkpoint_payload_reason',
), 'read-only reason');
const output = [
  '-- Append-only correction of the private Candidate G companion identity.',
  '-- The source model package ID differs from the schema-6 controller transition ID.',
  '-- All state, generation, part, privacy, time and model-binding checks remain exact.',
  'begin;',
  "set local lock_timeout = '5s';",
  validator,
  reason,
  'revoke all on function public.ravradar_ravscore_checkpoint_payload_valid(jsonb,timestamptz)',
  '  from public, anon, authenticated;',
  'revoke all on function public.ravradar_ravscore_checkpoint_payload_reason(jsonb,timestamptz)',
  '  from public, anon, authenticated;',
  "comment on function public.ravradar_ravscore_checkpoint_payload_valid(jsonb,timestamptz)",
  "is 'Protected checkpoint CAS: exact Candidate G companion ID from its sealed package.';",
  "notify pgrst, 'reload schema';",
  'commit;',
  '',
].join('\n\n').trimEnd() + '\n';
const mode = process.argv[2] ?? '--check';
assert.ok(mode === '--write' || mode === '--check', 'Use --write or --check');
if (mode === '--write') await fs.writeFile(destination, output, 'utf8');
else assert.equal(normalize(await fs.readFile(destination, 'utf8')), output,
  'Candidate G companion-ID successor is stale');
console.log('Candidate G companion-ID successor matches immutable SQL and model sources.');
