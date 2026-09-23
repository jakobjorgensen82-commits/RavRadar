#!/usr/bin/env node

// Generate the smallest append-only SQL correction from immutable, already
// applied definitions. Never edit the historical validator or diagnostic.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const validatorPath = 'supabase/migrations/20260923120000_integrated_checkpoint_missing_state_binding.sql';
const diagnosticPath = 'supabase/migrations/20260923130000_checkpoint_rejection_diagnostic.sql';
const destination = 'supabase/migrations/20260923140000_checkpoint_native_hold_null_evidence.sql';
const expectedHashes = new Map([
  [validatorPath, 'a171ed10e1520d2979fae506aba9aca17d420ded2a11fc12ba087dfb32ccd6c1'],
  [diagnosticPath, '6c43152ca038e5d322063cb3ed922bfb43dc698de5690629b488b4a6dfbf6d57'],
]);
const normalize = value => value.replace(/\r\n?/g, '\n');
async function immutableSource(file) {
  const value = normalize(await fs.readFile(file, 'utf8'));
  assert.equal(crypto.createHash('sha256').update(value).digest('hex'),
    expectedHashes.get(file), `${file} must remain immutable`);
  return value;
}
function functionDefinition(source, name) {
  const marker = `create or replace function public.${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0 && source.indexOf(marker, start + 1) < 0,
    `${name} must have exactly one source definition`);
  const end = source.indexOf('\n$$;', start);
  assert.ok(end > start, `${name} function body is incomplete`);
  return source.slice(start, end + '\n$$;'.length);
}
function allowOnlyNullAfterMeasuredReference(definition, name) {
  const oldRule = "        or (ordered.value ->> 'time')::timestamptz > v_current_reference";
  assert.equal(definition.split(oldRule).length - 1, 1,
    `${name} must contain one reviewed causal-evidence bound`);
  return definition.replace(oldRule, [
    '        -- An exact regional native hold can retain later MISSING rows,',
    '        -- but may never invent later signed transport evidence.',
    "        or (ordered.value ->> 'time')::timestamptz > v_state_time",
    "        or ((ordered.value ->> 'time')::timestamptz > v_current_reference",
    "          and jsonb_typeof(ordered.value -> 'strength') is distinct from 'null')",
  ].join('\n'));
}

const validator = allowOnlyNullAfterMeasuredReference(functionDefinition(
  await immutableSource(validatorPath),
  'ravradar_ravscore_checkpoint_integrated_state_valid',
), 'integrated validator');
const reason = allowOnlyNullAfterMeasuredReference(functionDefinition(
  await immutableSource(diagnosticPath),
  'ravradar_ravscore_checkpoint_integrated_state_reason',
), 'diagnostic reason');
const output = [
  '-- Append-only correction of the observed eight I04 causal-evidence rejections.',
  '-- Applied 20260923120000 and 20260923130000 definitions stay immutable.',
  '-- Later null evidence is not a measurement; later numeric evidence still fails.',
  'begin;',
  "set local lock_timeout = '5s';",
  validator,
  reason,
  'revoke all on function public.ravradar_ravscore_checkpoint_integrated_state_valid(jsonb,text)',
  '  from public, anon, authenticated;',
  'revoke all on function public.ravradar_ravscore_checkpoint_integrated_state_reason(jsonb,text)',
  '  from public, anon, authenticated;',
  "comment on function public.ravradar_ravscore_checkpoint_integrated_state_valid(jsonb,text)",
  "is 'Exact compact state validator: verified native hold may retain later null, never later signed evidence.';",
  "notify pgrst, 'reload schema';",
  'commit;',
  '',
].join('\n\n').trimEnd() + '\n';
const mode = process.argv[2] ?? '--check';
assert.ok(mode === '--write' || mode === '--check', 'Use --write or --check');
if (mode === '--write') await fs.writeFile(destination, output, 'utf8');
else assert.equal(normalize(await fs.readFile(destination, 'utf8')), output,
  'Native-hold null-evidence successor is stale');
console.log('Native-hold null-evidence successor matches immutable SQL sources.');
