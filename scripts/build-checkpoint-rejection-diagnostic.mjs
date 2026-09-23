#!/usr/bin/env node

// A read-only, service-role-only diagnostic for a rejected private checkpoint.
// Clone the applied validators exactly, changing only their return type and
// false/true results into static reason codes. Never emit state values or IDs.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor = 'supabase/migrations/20260923120000_integrated_checkpoint_missing_state_binding.sql';
const destination = 'supabase/migrations/20260923130000_checkpoint_rejection_diagnostic.sql';
const predecessorSha256 = 'a171ed10e1520d2979fae506aba9aca17d420ded2a11fc12ba087dfb32ccd6c1';
const normalize = value => value.replace(/\r\n?/g, '\n');
const source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(crypto.createHash('sha256').update(source).digest('hex'), predecessorSha256,
  'Applied checkpoint migration changed; diagnostic must be rebuilt deliberately');

function reasonFunction(suffix, prefix) {
  const oldName = `public.ravradar_ravscore_checkpoint_${suffix}_valid`;
  const newName = `public.ravradar_ravscore_checkpoint_${suffix}_reason`;
  const start = source.indexOf(`create or replace function ${oldName}(`);
  assert.ok(start >= 0 && source.indexOf(`create or replace function ${oldName}(`, start + 1) < 0);
  const end = source.indexOf('\n$$;', start);
  assert.ok(end > start);
  let definition = source.slice(start, end + 4).replace(oldName, newName);
  assert.equal((definition.match(/returns boolean/g) ?? []).length, 1);
  definition = definition.replace('returns boolean', 'returns text');
  let index = 0;
  definition = definition.replace(/return false;/g, (_match, offset) => {
    index += 1;
    const sourceLine = source.slice(0, start).split('\n').length
      + definition.slice(0, offset).split('\n').length - 1;
    return `return '${prefix}${String(index).padStart(2, '0')}'; /* source line ${sourceLine} */`;
  });
  assert.ok(index > 0 && index < 100);
  assert.equal((definition.match(/return true;/g) ?? []).length, 1);
  definition = definition.replace('return true;', 'return null;');
  assert.ok(!/return (?:true|false);/.test(definition));
  return definition;
}

const definitions = [
  reasonFunction('integrated_state', 'I'),
  reasonFunction('candidate_state', 'C'),
  reasonFunction('payload', 'P'),
].join('\n\n');

const wrapper = `
create or replace function public.ravradar_ravscore_checkpoint_rejection_diagnostic(
  p_payload jsonb,
  p_target_reference timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_integrated jsonb := '{}'::jsonb;
  v_candidate jsonb := '{}'::jsonb;
  v_payload_reason text;
begin
  -- The output contains only fixed reason codes and aggregate counts.
  -- No part identifiers, times, strengths, weather, scores or payload fields.
  v_payload_reason := public.ravradar_ravscore_checkpoint_payload_reason(
    p_payload, p_target_reference
  );
  if jsonb_typeof(p_payload -> 'states') = 'object' then
    select coalesce(jsonb_object_agg(reason, amount), '{}'::jsonb)
    into v_integrated
    from (
      select reason, count(*)::integer as amount
      from pg_catalog.jsonb_each(p_payload -> 'states') as state(part_id, value)
      cross join lateral (
        select public.ravradar_ravscore_checkpoint_integrated_state_reason(
          state.value, p_payload ->> 'productionReferenceAt'
        ) as reason
      ) as classified
      where reason is not null
      group by reason
    ) as counts;
  end if;
  if jsonb_typeof(p_payload #> '{candidateGRollbackCompanion,states}') = 'object' then
    select coalesce(jsonb_object_agg(reason, amount), '{}'::jsonb)
    into v_candidate
    from (
      select reason, count(*)::integer as amount
      from pg_catalog.jsonb_each(p_payload #> '{candidateGRollbackCompanion,states}')
        as state(part_id, value)
      cross join lateral (
        select public.ravradar_ravscore_checkpoint_candidate_state_reason(
          state.value, p_payload ->> 'productionReferenceAt'
        ) as reason
      ) as classified
      where reason is not null
      group by reason
    ) as counts;
  end if;
  return pg_catalog.jsonb_build_object(
    'schemaVersion', '1.0.0',
    'payloadReason', coalesce(v_payload_reason, 'PASS'),
    'normalizedBytes', pg_catalog.octet_length(
      pg_catalog.convert_to(p_payload::text, 'UTF8')
    ),
    'integratedReasons', v_integrated,
    'candidateReasons', v_candidate
  );
exception when others then
  return pg_catalog.jsonb_build_object(
    'schemaVersion', '1.0.0',
    'payloadReason', 'DIAGNOSTIC_EXCEPTION',
    'normalizedBytes', 0,
    'integratedReasons', '{}'::jsonb,
    'candidateReasons', '{}'::jsonb
  );
end;
$$;

revoke all on function public.ravradar_ravscore_checkpoint_integrated_state_reason(jsonb,text)
  from public, anon, authenticated;
revoke all on function public.ravradar_ravscore_checkpoint_candidate_state_reason(jsonb,text)
  from public, anon, authenticated;
revoke all on function public.ravradar_ravscore_checkpoint_payload_reason(jsonb,timestamptz)
  from public, anon, authenticated;
revoke all on function public.ravradar_ravscore_checkpoint_rejection_diagnostic(jsonb,timestamptz)
  from public, anon, authenticated;
grant execute on function public.ravradar_ravscore_checkpoint_rejection_diagnostic(jsonb,timestamptz)
  to service_role;

comment on function public.ravradar_ravscore_checkpoint_rejection_diagnostic(jsonb,timestamptz)
is 'Service-role-only read-only diagnostic: fixed validator reason codes and aggregate counts, never checkpoint data.';

notify pgrst, 'reload schema';
commit;
`;

const output = [
  '-- Append-only diagnostic after the applied 20260923120000 checkpoint binding.',
  '-- Read-only; this migration does not change the CAS or acceptance contract.',
  'begin;',
  definitions,
  wrapper,
].join('\n');
const mode = process.argv[2] ?? '--check';
assert.ok(mode === '--write' || mode === '--check', 'Use --write or --check');
if (mode === '--write') await fs.writeFile(destination, output, 'utf8');
else assert.equal(normalize(await fs.readFile(destination, 'utf8')), output,
  'Checkpoint rejection diagnostic is stale');
console.log('Checkpoint rejection diagnostic matches the immutable applied validator.');
