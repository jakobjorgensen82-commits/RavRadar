#!/usr/bin/env node
// DEC-0278: one display-count change, immutable SQL predecessors, no state rewrite.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { computeRavScoreModelBundle } from './build-ravscore-model-bundle.mjs';
import { computeCandidateGRollbackBundle } from './build-candidate-g-rollback-bundle.mjs';
import { ravScoreContinuationImplementationSha256 } from './lib/ravscore-continuation-implementation-contract.mjs';

const oldHash = 'c557f91a520ae64211f9441f25fc72a9c230691cdb7b48551ecb7286463420eb';
const newHash = '3a14f458122f5bc0ea8a60c07abbcbd68d022c0322a87e77242891f21631c852';
const continuation = '46683362ec6b69835695db375f7de976a8dd0a75b7367a27e2854b653d73e0ab';
const destination = 'supabase/migrations/20261002080000_top20_display_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
const count = (text, value) => text.split(value).length - 1;
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
const mode = process.argv[2] ?? '--check';
assert.ok(['--check', '--write'].includes(mode));

const file = 'scripts/public-conditions-lib.mjs';
const source = await fs.readFile(file, 'utf8');
const needle = '}).sort(compareNationalRankingRows).slice(0, 20);';
assert.equal(count(source, needle), 1);
const previous = await computeRavScoreModelBundle({ sourceOverrides: new Map([
  [file, source.replace(needle, '}).sort(compareNationalRankingRows).slice(0, 5);')],
]) });
const current = await computeRavScoreModelBundle();
assert.equal(previous.modelBundleSha256, oldHash);
assert.equal(current.modelBundleSha256, newHash);
assert.equal(current.contractSha256, previous.contractSha256);
assert.equal(current.manifest.files.length, 67);
assert.deepEqual(current.manifest.files.filter((entry, index) =>
  entry.sha256 !== previous.manifest.files[index].sha256).map(entry => entry.path), [file]);
assert.equal((await computeCandidateGRollbackBundle()).modelBundleSha256,
  'a2494810db3a335376795e308d149f5856885c05665d9f155fc6b0632344c021');
assert.equal(await ravScoreContinuationImplementationSha256(), continuation);

async function immutable(filePath, expected) {
  const text = normalize(await fs.readFile(filePath, 'utf8'));
  assert.equal(digest(text), expected, `${filePath}: applied predecessor changed`);
  return text;
}
function definition(text, name) {
  const start = text.indexOf(`create or replace function public.${name}(`);
  assert.ok(start >= 0);
  assert.equal(text.indexOf(`create or replace function public.${name}(`, start + 1), -1);
  const end = text.indexOf('\n$$;', start);
  assert.ok(end > start);
  return text.slice(start, end + 4);
}
function once(text, before, after) {
  assert.equal(count(text, before), 1, `Ambiguous reviewed replacement: ${before.slice(0, 80)}`);
  return text.replace(before, () => after);
}
const base = await immutable('supabase/migrations/20260925150000_weather_selection_model_binding.sql',
  '436a0ec8a57a6b9b5e1b9124b37c0ccf3e0328234f9bf7635b88ed23602c3bc4');
const exact = await immutable('supabase/migrations/20260926170000_exact_checkpoint_predecessor.sql',
  'e435b9c0ad8fa1137d770cda0bd1d277de0bc4b896886c14e25fbf8c5ac2e2fc');
assert.equal(count(base, oldHash), 5);
let result = base.replaceAll(oldHash, newHash);
result = once(result, `'${newHash}'\n      )`, `'${oldHash}',\n        '${newHash}'\n      )`);
result = once(result, "'20260925150000'", "'20261002080000'");

// Project ONLY the named Top5 implementation's two binding paths. The exact
// current payload validator still validates every field, state and privacy rule.
// Original stored payload/cipher is never overwritten by this pure projection.
const projection = `create or replace function public.ravradar_ravscore_checkpoint_top20_predecessor_projection(
  p_payload jsonb,
  p_target_reference timestamptz
)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_projected jsonb;
  v_states jsonb;
begin
  if p_payload is null
    or p_target_reference is null
    or pg_catalog.octet_length(p_payload::text) > 16777216
    or p_payload #>> '{modelBinding,modelBundleSha256}' is distinct from '${oldHash}'
    or p_payload ->> 'continuationStateContractSha256' is distinct from '${continuation}'
    or pg_catalog.jsonb_typeof(p_payload -> 'states') is distinct from 'object'
  then return null; end if;
  if (select pg_catalog.count(*) from pg_catalog.jsonb_each(p_payload -> 'states')) <> 673
    or exists (select 1 from pg_catalog.jsonb_each(p_payload -> 'states') as state(part_id,value)
      where state.value ->> 'modelBundleSha256' is distinct from '${oldHash}')
  then return null; end if;
  select pg_catalog.jsonb_object_agg(state.part_id, pg_catalog.jsonb_set(
    state.value, '{modelBundleSha256}', pg_catalog.to_jsonb('${newHash}'::text), false))
    into v_states from pg_catalog.jsonb_each(p_payload -> 'states') as state(part_id,value);
  v_projected := pg_catalog.jsonb_set(pg_catalog.jsonb_set(p_payload,
    '{modelBinding,modelBundleSha256}', pg_catalog.to_jsonb('${newHash}'::text), false),
    '{states}', v_states, false);
  if public.ravradar_ravscore_checkpoint_payload_valid(v_projected, p_target_reference)
  then return v_projected; end if;
  return null;
exception when others then return null;
end;
$$;
revoke all on function public.ravradar_ravscore_checkpoint_top20_predecessor_projection(jsonb,timestamptz)
  from public, anon, authenticated;
`;
let predecessor = definition(exact, 'ravradar_ravscore_checkpoint_predecessor_payload_valid');
predecessor = once(predecessor, 'begin\n', `begin
  if p_current_implementation_sha256 = '${continuation}'
    and public.ravradar_ravscore_checkpoint_top20_predecessor_projection(
      p_payload, p_target_reference) is not null
  then return true; end if;
`);
result = once(result, definition(base, 'ravradar_ravscore_checkpoint_predecessor_payload_valid'),
  `${projection}\n${predecessor}`);

// At the SAME target, permit only exact byte-structured state equivalence
// after the named binding projection and its derived digest changes. No value,
// history, target, role, companion state or semantic model field is discarded.
result = once(result, '  v_exact_predecessor_same_target_transition boolean := false;',
  '  v_exact_predecessor_same_target_transition boolean := false;\n  v_top20_predecessor_payload jsonb;');
const cas = definition(result, 'ravradar_ravscore_checkpoint_cas');
const start = cas.indexOf('    v_exact_predecessor_same_target_transition :=');
const end = cas.indexOf('    -- Equality is checked', start);
assert.ok(start > 0 && end > start);
const oldComparison = cas.slice(start, end);
result = once(result, oldComparison, `    v_top20_predecessor_payload :=
      public.ravradar_ravscore_checkpoint_top20_predecessor_projection(
        v_payload, v_central_reference);
    if v_central_is_compatible_predecessor and v_top20_predecessor_payload is not null then
      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference
        and (v_top20_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}')
        = (p_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}');
    else
${oldComparison}    end if;
`);

// Include the new pure helper in the SAME exact live definition readback and
// security-invoker/restricted-execute attestation; do not leave an unbound helper.
result = once(result, '  v_checkpoint_definition text;',
  '  v_checkpoint_definition text;\n  v_top20_projection_definition text;');
result = once(result, "'public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)'\n    )\n  ];",
  "'public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)'\n    ),\n    pg_catalog.to_regprocedure(\n      'public.ravradar_ravscore_checkpoint_top20_predecessor_projection(jsonb,timestamptz)'\n    )\n  ];");
result = once(result, '  v_checkpoint_definition := v_canonical_time_definition',
  `  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into v_top20_projection_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[6];

  v_checkpoint_definition := v_canonical_time_definition`);
result = once(result, "    || E'\\n-- checkpoint-history-exclusion --\\n' || v_history_definition;",
  "    || E'\\n-- checkpoint-history-exclusion --\\n' || v_history_definition\n    || E'\\n-- top20-predecessor-projection --\\n' || v_top20_projection_definition;");
result = once(result, '-- Rebind the changed weather-selection implementation without changing score rules.',
  '-- DEC-0278: bind ONLY the Top20 display-count implementation; physical score rules are unchanged.');
assert.equal(count(result, newHash), 7); // five bindings plus two projection destinations
assert.equal(count(result, oldHash), 3); // trip bridge plus exact payload/state preconditions
assert.equal(count(result, "'20261002080000'"), 1);
assert.ok(result.includes("set statement_timeout = '30s'"));
assert.ok(result.includes(definition(exact, 'ravradar_ravscore_checkpoint_predecessor_payload_valid')
  .slice(definition(exact, 'ravradar_ravscore_checkpoint_predecessor_payload_valid').indexOf('  if p_payload is not null'))));
if (mode === '--write') await fs.writeFile(destination, result, 'utf8');
else assert.equal(normalize(await fs.readFile(destination, 'utf8')), result);
console.log('Top20 binding successor: one frozen row-limit delta, immutable predecessors, exact state-preserving bridge.');
