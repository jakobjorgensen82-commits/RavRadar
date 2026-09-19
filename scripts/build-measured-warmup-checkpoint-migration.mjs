// Reproducible schema-only successor; applied migrations are immutable inputs.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor = 'supabase/migrations/20260919010000_current_input_foundation_binding.sql';
const destination = 'supabase/migrations/20260919020000_measured_warmup_checkpoint.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
let sql = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(crypto.createHash('sha256').update(sql).digest('hex'),
  '5ff2e8a01d27eb5bc5df9482c0660e1b82133fa9a738bff60e93fed5fd2b1233',
  'Applied checkpoint predecessor must remain immutable');
const replace = (before, after, count = 1) => {
  assert.equal(sql.split(before).length - 1, count, `Unexpected SQL inventory: ${before}`);
  sql = sql.replaceAll(before, after);
};
replace('20260919010000', '20260919020000', 2);
replace('-- Generated current-input foundation binding successor; predecessor remains immutable.',
  '-- Generated measured-warmup checkpoint successor; predecessor remains immutable.');
replace('-- Reassert the existing trip/checkpoint definitions with only their exact bundle\n-- hashes, derived continuation seal and checkpoint readback version changed. No row rewrite,\n-- history deletion, score formula change or widened state admission is included.',
  '-- Preserve integrated state and measured Candidate G progress during warmup.\n-- Non-READY continuation is private storage only, never rollback activation.\n-- No row rewrite, history deletion or score formula change is included.');
replace("or p_payload -> 'schemaVersion' is distinct from '4'::jsonb",
  "or p_payload -> 'schemaVersion' is distinct from '5'::jsonb");
replace('ravscore-schema6-with-candidate-g-rollback-companion',
  'ravscore-schema6-with-measured-candidate-g-continuation');
replace("or v_companion -> 'schemaVersion' is distinct from '1'::jsonb",
  "or v_companion -> 'schemaVersion' is distinct from '2'::jsonb");
replace('candidate-g-rollback-ready-companion', 'candidate-g-measured-continuation-companion');

const candidateStart = sql.indexOf('create or replace function public.ravradar_ravscore_checkpoint_candidate_state_valid(');
const candidateEnd = sql.indexOf('\n$$;', candidateStart) + 4;
let candidate = sql.slice(candidateStart, candidateEnd);
const candidateReplace = (before, after) => {
  assert.equal(candidate.split(before).length - 1, 1, `Unexpected candidate validator: ${before}`);
  candidate = candidate.replace(before, after);
};
candidateReplace('  v_second_time timestamptz;', `  v_second_time timestamptz;
  v_item jsonb;
  v_time timestamptz;
  v_previous timestamptz;
  v_suffix_start timestamptz;
  v_contains_missing boolean := false;
  v_gap boolean := false;
  v_status text;
  v_coverage numeric;`);
candidateReplace("or p_state ->> 'transportReferenceAt' is distinct from p_reference_text",
  `or (p_state ->> 'transportReferenceAt')::timestamptz > p_reference_text::timestamptz
    or p_reference_text::timestamptz - (p_state ->> 'transportReferenceAt')::timestamptz > interval '3 hours'`);
candidateReplace(`    or p_state -> 'transportMemoryReady' is distinct from 'true'::jsonb
    or p_state ->> 'transportMemoryStatus' is distinct from 'READY'
    or p_state -> 'transportMemoryWindowHours' is distinct from '48'::jsonb
    or p_state -> 'transportMemoryCoverageHours' is distinct from '48'::jsonb`,
`    or jsonb_typeof(p_state -> 'transportMemoryReady') is distinct from 'boolean'
    or p_state -> 'transportMemoryWindowHours' is distinct from '48'::jsonb
    or jsonb_typeof(p_state -> 'transportMemoryCoverageHours') is distinct from 'number'
    or (p_state ->> 'transportMemoryCoverageHours')::numeric not between 0 and 48
    or (p_state -> 'transportMemoryReady' = 'true'::jsonb and (
      p_state ->> 'transportMemoryStatus' is distinct from 'READY'
      or p_state -> 'transportMemoryCoverageHours' is distinct from '48'::jsonb
    ))`);
candidateReplace("->> 'time' is distinct from p_reference_text\n  then",
  "->> 'time' is distinct from p_state ->> 'transportReferenceAt'\n  then");
candidateReplace('  v_reference := p_reference_text::timestamptz;',
  "  v_reference := (p_state ->> 'transportReferenceAt')::timestamptz;");
candidateReplace("  if pg_catalog.jsonb_array_length(p_state -> 'transportEvidence') not between 2 and 49", `  -- Non-READY progress is private measured continuation, never rollback READY.
  -- Derive its status/coverage from the ordered, bounded evidence, not labels.
  if p_state -> 'transportMemoryReady' = 'false'::jsonb then
    v_reference := (p_state ->> 'transportReferenceAt')::timestamptz;
    v_boundary := v_reference - interval '48 hours';
    for v_item in select value from pg_catalog.jsonb_array_elements(p_state -> 'transportEvidence') loop
      if not public.ravradar_ravscore_checkpoint_canonical_time(v_item ->> 'time') then
        return false;
      end if;
      v_time := (v_item ->> 'time')::timestamptz;
      if v_time < v_boundary or v_time > v_reference
        or (v_previous is not null and v_time <= v_previous) then
        return false;
      end if;
      if v_first_time is null then v_first_time := v_time; end if;
      if v_previous is not null and v_time - v_previous > interval '3 hours' then
        v_gap := true;
        v_suffix_start := null;
      end if;
      if jsonb_typeof(v_item -> 'strength') = 'null' then
        v_contains_missing := true;
        v_suffix_start := null;
      elsif v_suffix_start is null then
        v_suffix_start := v_time;
      end if;
      v_previous := v_time;
    end loop;
    if v_previous is distinct from v_reference then return false; end if;
    v_coverage := case when v_suffix_start is null then 0
      else extract(epoch from (v_reference - v_suffix_start)) / 3600 end;
    v_status := case
      when jsonb_typeof(v_item -> 'strength') = 'null' then 'LATEST_SAMPLE_MISSING'
      when v_contains_missing then 'WINDOW_HAS_MISSING_EVIDENCE'
      when v_first_time > v_boundary then 'WINDOW_INCOMPLETE'
      when v_gap then 'WINDOW_HAS_TIME_GAP'
      else 'READY' end;
    return v_status <> 'READY'
      and p_state ->> 'transportMemoryStatus' = v_status
      and abs((p_state ->> 'transportMemoryCoverageHours')::numeric - v_coverage) <= 0.000000001;
  end if;

  if pg_catalog.jsonb_array_length(p_state -> 'transportEvidence') not between 2 and 49`);
sql = sql.slice(0, candidateStart) + candidate + sql.slice(candidateEnd);

// The bridge validates the entire predecessor through current validators while
// preserving state values; same-target CAS removes only these schema/hash fields.
replace(`or p_payload ->> 'continuationStateContractSha256' is distinct from
      '082a5187f569518c0474590e924ccd17fce760d494a1da4a593de551e440cf91'`,
`or p_payload ->> 'continuationStateContractSha256' not in (
      '082a5187f569518c0474590e924ccd17fce760d494a1da4a593de551e440cf91',
      '91251f6b38835040250cd5283d2b701aab38bb23f2a4a0014baa1128d59c78f4'
    )
    or p_payload -> 'schemaVersion' is distinct from '4'::jsonb
    or p_payload ->> 'status' is distinct from 'ravscore-schema6-with-candidate-g-rollback-companion'
    or p_payload #> '{candidateGRollbackCompanion,schemaVersion}' is distinct from '1'::jsonb
    or p_payload #>> '{candidateGRollbackCompanion,status}' is distinct from 'candidate-g-rollback-ready-companion'
    or exists (select 1 from pg_catalog.jsonb_each(
      p_payload #> '{candidateGRollbackCompanion,states}'
    ) as state(part_id,value) where state.value -> 'transportMemoryReady' is distinct from 'true'::jsonb
      or state.value ->> 'transportReferenceAt' is distinct from p_payload ->> 'productionReferenceAt')`);
replace(`      p_payload,
      '{continuationStateContractSha256}',`, `      pg_catalog.jsonb_set(pg_catalog.jsonb_set(pg_catalog.jsonb_set(pg_catalog.jsonb_set(
        p_payload, '{schemaVersion}', '5'::jsonb, false),
        '{status}', '"ravscore-schema6-with-measured-candidate-g-continuation"'::jsonb, false),
        '{candidateGRollbackCompanion,schemaVersion}', '2'::jsonb, false),
        '{candidateGRollbackCompanion,status}', '"candidate-g-measured-continuation-companion"'::jsonb, false),
      '{continuationStateContractSha256}',`);
replace("          #- '{continuationStateContractSha256}'", `          #- '{schemaVersion}'
          #- '{status}'
          #- '{candidateGRollbackCompanion,schemaVersion}'
          #- '{candidateGRollbackCompanion,status}'
          #- '{continuationStateContractSha256}'`, 2);

// Derive the successor's seals only from the assembled implementation. The
// applied predecessor and the explicit predecessor allowance above stay fixed.
replace('b114d226425eefd6b7a3c8280fb19982c312f0d88d2f9351c7dc6cbc4ece8c38',
  '8f0ef7800eee6adbb5cb620fed682c2c7900ad8748a86ba84085570e44fa9c26', 3);
replace('2a0cba46ea1bb625f655ee3c58a07c90e3b6d169812f569643d0f2d924c4c09e',
  'd740e2f74796971d1d60e1ab8e6a3365b0eb1dae0d674847ed9369c4a85c6a27', 2);
replace("or p_payload ->> 'continuationStateContractSha256' is distinct from\n      '91251f6b38835040250cd5283d2b701aab38bb23f2a4a0014baa1128d59c78f4'",
  "or p_payload ->> 'continuationStateContractSha256' is distinct from\n      '3d4e51b9dca15bafac98cf5c1e69f0b60d6ca354d3aa9e05bf9302d8622c8f77'");

assert.ok(process.argv.length === 2 || (process.argv.length === 3
  && ['--write', '--check'].includes(process.argv[2])));
if (process.argv.includes('--write')) await fs.writeFile(destination, sql);
else assert.equal(normalize(await fs.readFile(destination, 'utf8')), sql,
  'Measured warmup checkpoint successor is stale');
console.log('Measured warmup checkpoint migration verified against immutable predecessor; no database access.');
