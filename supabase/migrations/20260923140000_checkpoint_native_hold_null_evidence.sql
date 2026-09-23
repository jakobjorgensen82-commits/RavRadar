-- Append-only correction of the observed eight I04 causal-evidence rejections.

-- Applied 20260923120000 and 20260923130000 definitions stay immutable.

-- Later null evidence is not a measurement; later numeric evidence still fails.

begin;

set local lock_timeout = '5s';

create or replace function public.ravradar_ravscore_checkpoint_integrated_state_valid(
  p_state jsonb,
  p_reference_text text
)
returns boolean
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_state_time timestamptz;
  v_current_reference timestamptz;
  v_current_boundary timestamptz;
  v_current_first_time timestamptz;
  v_current_second_time timestamptz;
  v_wave_last_verified timestamptz;
  v_wave_migration_seed timestamptz;
  v_authorization jsonb;
  v_wave_approach jsonb;
  v_history jsonb;
  v_lineage jsonb;
  v_wave_unknown timestamptz;
  v_wave_reset timestamptz;
  v_last_mile_unknown timestamptz;
  v_last_mile_reset timestamptz;
  v_current_lower numeric;
  v_current_upper numeric;
  v_wave_lower numeric;
  v_wave_upper numeric;
  v_min_activity numeric;
  v_min_normal numeric;
  v_max_activity numeric;
  v_max_normal numeric;
  v_point_activity numeric;
  v_point_normal numeric;
  v_min_factor numeric;
  v_max_factor numeric;
  v_point_factor numeric;
begin
  if jsonb_typeof(p_state) is distinct from 'object'
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(p_state)) <> 35
    or exists (
      select 1
      from pg_catalog.jsonb_object_keys(p_state) as allowed(key)
      where not (allowed.key = any (array[
        'schemaVersion','modelId','variantId','profileId','componentSchemaId',
        'explanationSchemaId','rankingPolicyId','bestTimePolicyId',
        'presentationPolicyId','modelContractSha256','modelBundleSha256',
        'samplingContextKey','time','currentReferenceAt','currentMemoryReady',
        'currentMemoryStatus','currentMemoryWindowHours',
        'currentMemoryCoverageHours','currentEvidence',
        'currentNativeHoldAuthorization','currentNativeHoldIntervalEnds',
        'supplyPotential','historyBounds','waveStateSchemaVersion','wavePolicyId',
        'waveLastVerifiedAt','waveMigrationSeedAt','waveMemoryReady',
        'waveMemoryStatus','waveEnergyScore','waveMigrationSeedAwaitingReference',
        'mobilisationPotential','rollbackCandidateGMobilisationPotential',
        'waveApproachState','lineage'
      ]::text[]))
    )
    -- RAVSCORE_CHECKPOINT_INTEGRATED_STATE_BINDING_GENERATED_BEGIN
    or p_state ->> 'schemaVersion' is distinct from '6.0.0'
    or p_state ->> 'modelId'
      is distinct from 'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0'
    or p_state ->> 'variantId'
      is distinct from 'COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2'
    or p_state ->> 'profileId'
      is distinct from 'cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5'
    or p_state ->> 'componentSchemaId'
      is distinct from 'ravscore-components-huntability-delivery-mobilisation-bounds-v5'
    or p_state ->> 'explanationSchemaId'
      is distinct from 'ravscore-explanation-integrated-bounds-v5'
    or p_state ->> 'rankingPolicyId'
      is distinct from 'direction-broad-19-history-tie-v2'
    or p_state ->> 'bestTimePolicyId'
      is distinct from 'score-history-water-tie-earliest-v3'
    or p_state ->> 'presentationPolicyId'
      is distinct from 'score-bands-35-55-75-exceptional90-v1'
    or p_state ->> 'modelContractSha256'
      is distinct from 'a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b'
    or p_state ->> 'modelBundleSha256'
      is distinct from '61ec54746fdf1ac58f3d7859d4d55a901fcc6376d0412acf2d6f4f418ae5c0a1'
    -- RAVSCORE_CHECKPOINT_INTEGRATED_STATE_BINDING_GENERATED_END
    or coalesce(p_state ->> 'samplingContextKey', '') !~ '^sha256:[0-9a-f]{64}$'
    or not public.ravradar_ravscore_checkpoint_canonical_time(p_reference_text)
    or not public.ravradar_ravscore_checkpoint_canonical_time(p_state ->> 'time')
    or p_state ->> 'time' is distinct from p_reference_text
    or jsonb_typeof(p_state -> 'currentEvidence') is distinct from 'array'
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_state -> 'currentEvidence') as evidence(value)
      where jsonb_typeof(evidence.value) is distinct from 'object'
        or (select pg_catalog.count(*)
            from pg_catalog.jsonb_object_keys(evidence.value)) <> 2
        or exists (
          select 1 from pg_catalog.jsonb_object_keys(evidence.value) as keyset(key)
          where not (keyset.key = any (array['time','strength']::text[]))
        )
        or coalesce(evidence.value ->> 'time', '') !~
          '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
        or coalesce(jsonb_typeof(evidence.value -> 'strength'), 'missing')
          not in ('number','null')
    )
    or public.ravradar_ravscore_checkpoint_has_forbidden_key(p_state)
  then
    return false;
  end if;

  -- JavaScript remains authoritative for mathematical replay. PostgreSQL
  -- independently enforces the bounded, canonical derived-state envelope.
  if jsonb_typeof(p_state -> 'currentReferenceAt') is distinct from 'string'
    or not public.ravradar_ravscore_checkpoint_canonical_time(
      p_state ->> 'currentReferenceAt'
    )
    or jsonb_typeof(p_state -> 'currentMemoryReady') is distinct from 'boolean'
    or jsonb_typeof(p_state -> 'currentMemoryStatus') is distinct from 'string'
    or p_state ->> 'currentMemoryStatus' <> all (array[
      'WINDOW_INCOMPLETE','WINDOW_HAS_MISSING_EVIDENCE',
      'WINDOW_HAS_TIME_GAP','LATEST_SAMPLE_MISSING','LATEST_SAMPLE_GAP',
      'EVIDENCE_LIMIT_EXCEEDED','READY','READY_NATIVE_HOLD'
    ]::text[])
    or jsonb_typeof(p_state -> 'currentMemoryWindowHours') is distinct from 'number'
    or (p_state ->> 'currentMemoryWindowHours')::numeric <> 48
    or jsonb_typeof(p_state -> 'currentMemoryCoverageHours') is distinct from 'number'
    or (p_state ->> 'currentMemoryCoverageHours')::numeric not between 0 and 48
    or ((p_state -> 'currentMemoryReady') = 'true'::jsonb)
      is distinct from ((p_state ->> 'currentMemoryStatus') = any (
        array['READY','READY_NATIVE_HOLD']::text[]
      ))
    or (((p_state -> 'currentMemoryReady') = 'true'::jsonb)
      and (p_state ->> 'currentMemoryCoverageHours')::numeric <> 48)
    or (((p_state -> 'currentMemoryReady') = 'false'::jsonb)
      and (p_state ->> 'currentMemoryCoverageHours')::numeric <> 0)
    or (((p_state -> 'currentMemoryReady') = 'true'::jsonb)
      and (jsonb_typeof(p_state -> 'supplyPotential') is distinct from 'number'
        or (p_state ->> 'supplyPotential')::numeric not between 0 and 100))
    or (((p_state -> 'currentMemoryReady') = 'false'::jsonb)
      and jsonb_typeof(p_state -> 'supplyPotential') is distinct from 'null')
    or jsonb_typeof(p_state -> 'currentNativeHoldIntervalEnds')
      is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_state -> 'currentNativeHoldIntervalEnds') > 48
    or coalesce(jsonb_typeof(p_state -> 'currentNativeHoldAuthorization'), 'missing')
      not in ('object','null')
    or jsonb_typeof(p_state -> 'waveStateSchemaVersion') is distinct from 'string'
    or p_state ->> 'waveStateSchemaVersion' is distinct from '1.0.0'
    or jsonb_typeof(p_state -> 'wavePolicyId') is distinct from 'string'
    or p_state ->> 'wavePolicyId'
      is distinct from 'wave-energy-freshness-build4-decay48-coldrestart-v2'
    or coalesce(jsonb_typeof(p_state -> 'waveLastVerifiedAt'), 'missing')
      not in ('string','null')
    or coalesce(jsonb_typeof(p_state -> 'waveMigrationSeedAt'), 'missing')
      not in ('string','null')
    or jsonb_typeof(p_state -> 'waveMemoryReady') is distinct from 'boolean'
    or jsonb_typeof(p_state -> 'waveMemoryStatus') is distinct from 'string'
    or p_state ->> 'waveMemoryStatus' <> all (array[
      'READY','MIGRATED_READY','RECOVERED_SHORT_GAP','MISSING_INPUT','COLD_START'
    ]::text[])
    or coalesce(jsonb_typeof(p_state -> 'waveEnergyScore'), 'missing')
      not in ('number','null')
    or (jsonb_typeof(p_state -> 'waveEnergyScore') = 'number'
      and (p_state ->> 'waveEnergyScore')::numeric not between 0 and 100)
    or jsonb_typeof(p_state -> 'waveMigrationSeedAwaitingReference')
      is distinct from 'boolean'
    or jsonb_typeof(p_state -> 'mobilisationPotential') is distinct from 'number'
    or (p_state ->> 'mobilisationPotential')::numeric not between 0 and 100
    or jsonb_typeof(p_state -> 'rollbackCandidateGMobilisationPotential')
      is distinct from 'number'
    or (p_state ->> 'rollbackCandidateGMobilisationPotential')::numeric
      not between 0 and 100
    or jsonb_typeof(p_state -> 'waveApproachState') is distinct from 'object'
    or jsonb_typeof(p_state -> 'historyBounds') is distinct from 'object'
    or coalesce(jsonb_typeof(p_state -> 'lineage'), 'missing') not in ('object','null')
  then
    return false;
  end if;

  v_state_time := (p_state ->> 'time')::timestamptz;
  v_current_reference := (p_state ->> 'currentReferenceAt')::timestamptz;
  if v_current_reference > v_state_time
    or extract(epoch from (v_state_time - v_current_reference)) / 3600 > 3
    or (p_state ->> 'currentMemoryStatus' = 'READY'
      and v_current_reference is distinct from v_state_time)
    or (p_state ->> 'currentMemoryStatus' = 'READY_NATIVE_HOLD'
      and v_current_reference >= v_state_time)
  then
    return false;
  end if;

  if pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') > 49
    or ((p_state -> 'currentMemoryReady') = 'true'::jsonb
      and pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') < 2)
    or exists (
      select 1
      from (
        select evidence.value,
          evidence.ordinality,
          pg_catalog.lag(evidence.value ->> 'time') over (
            order by evidence.ordinality
          ) as previous_time
        from pg_catalog.jsonb_array_elements(
          p_state -> 'currentEvidence'
        ) with ordinality as evidence(value, ordinality)
      ) as ordered
      where jsonb_typeof(ordered.value) is distinct from 'object'
        or (select pg_catalog.count(*)
            from pg_catalog.jsonb_object_keys(ordered.value)) <> 2
        or exists (
          select 1
          from pg_catalog.jsonb_object_keys(ordered.value) as keyset(key)
          where not (keyset.key = any (array['time','strength']::text[]))
        )
        or not public.ravradar_ravscore_checkpoint_canonical_time(
          ordered.value ->> 'time'
        )
        or coalesce(jsonb_typeof(ordered.value -> 'strength'), 'missing')
          not in ('number','null')
        or (jsonb_typeof(ordered.value -> 'strength') = 'number'
          and (ordered.value ->> 'strength')::numeric not between -1 and 1)
        or (ordered.previous_time is not null
          and ordered.previous_time::timestamptz
            >= (ordered.value ->> 'time')::timestamptz)
        -- An exact regional native hold can retain later MISSING rows,
        -- but may never invent later signed transport evidence.
        or (ordered.value ->> 'time')::timestamptz > v_state_time
        or ((ordered.value ->> 'time')::timestamptz > v_current_reference
          and jsonb_typeof(ordered.value -> 'strength') is distinct from 'null')
    )
    or (((p_state -> 'currentMemoryReady') = 'true'::jsonb)
      and p_state -> 'currentEvidence'
        -> (pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') - 1)
        ->> 'time' is distinct from p_state ->> 'currentReferenceAt')
    or (((p_state -> 'currentMemoryReady') = 'true'::jsonb) and exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_state -> 'currentEvidence') as evidence(value)
      where jsonb_typeof(evidence.value -> 'strength') is distinct from 'number'
    ))
  then
    return false;
  end if;

  -- READY current memory must at least have the same real 48-hour boundary
  -- shape and attested cadence as the JavaScript builder. This deliberately
  -- does not replay signed rates or recompute supplyPotential in PostgreSQL.
  if (p_state -> 'currentMemoryReady') = 'true'::jsonb then
    v_current_boundary := v_current_reference - interval '48 hours';
    v_current_first_time := (
      p_state -> 'currentEvidence' -> 0 ->> 'time'
    )::timestamptz;
    v_current_second_time := (
      p_state -> 'currentEvidence' -> 1 ->> 'time'
    )::timestamptz;
    if v_current_first_time > v_current_boundary
      or (v_current_first_time < v_current_boundary and (
        pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') < 2
        or v_current_first_time < v_current_boundary - interval '3 hours'
        or v_current_second_time < v_current_boundary
        or v_current_second_time - v_current_first_time > interval '3 hours'
      ))
      or exists (
        select 1
        from (
          select evidence.value ->> 'time' as evidence_time,
            pg_catalog.lag(evidence.value ->> 'time') over (
              order by evidence.ordinality
            ) as previous_time
          from pg_catalog.jsonb_array_elements(
            p_state -> 'currentEvidence'
          ) with ordinality as evidence(value, ordinality)
        ) as ordered
        where ordered.previous_time is not null
          and (
            (ordered.evidence_time::timestamptz
              - ordered.previous_time::timestamptz) > interval '3 hours'
            or (
              (ordered.evidence_time::timestamptz
                - ordered.previous_time::timestamptz) > interval '1 hour'
              and (
                ordered.previous_time::timestamptz >= v_current_boundary
                or ordered.evidence_time::timestamptz
                  > v_current_boundary + interval '1 hour'
              )
              and not exists (
                select 1
                from pg_catalog.jsonb_array_elements(
                  p_state -> 'currentNativeHoldIntervalEnds'
                ) as hold(value)
                where hold.value #>> '{}' = ordered.evidence_time
              )
            )
          )
      )
    then
      return false;
    end if;
  end if;

  v_authorization := p_state -> 'currentNativeHoldAuthorization';
  if jsonb_typeof(v_authorization) = 'object' then
    if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_authorization)) <> 4
      or exists (
        select 1 from pg_catalog.jsonb_object_keys(v_authorization) as allowed(key)
        where not (allowed.key = any (array[
          'sourceClass','source','collection','distanceKm'
        ]::text[]))
      )
      or v_authorization ->> 'sourceClass'
        is distinct from 'owner-approved-regional-proxy'
      or v_authorization ->> 'source' is distinct from 'dmi-dkss-lf-regional-proxy'
      or v_authorization ->> 'collection' is distinct from 'dkss_lf'
      or jsonb_typeof(v_authorization -> 'distanceKm') is distinct from 'number'
      or (v_authorization ->> 'distanceKm')::numeric not between 0 and 15
      or (select evidence.value ->> 'time'
          from pg_catalog.jsonb_array_elements(
            p_state -> 'currentEvidence'
          ) with ordinality as evidence(value, ordinality)
          where jsonb_typeof(evidence.value -> 'strength') = 'number'
          order by evidence.ordinality desc
          limit 1) is distinct from p_state ->> 'currentReferenceAt'
    then
      return false;
    end if;
  elsif v_current_reference < v_state_time
    or p_state ->> 'currentMemoryStatus' = 'READY_NATIVE_HOLD'
  then
    return false;
  end if;

  if exists (
    select 1
    from (
      select hold.value #>> '{}' as hold_time,
        hold.ordinality,
        pg_catalog.lag(hold.value #>> '{}') over (
          order by hold.ordinality
        ) as previous_hold_time
      from pg_catalog.jsonb_array_elements(
        p_state -> 'currentNativeHoldIntervalEnds'
      ) with ordinality as hold(value, ordinality)
    ) as ordered_hold
    where not public.ravradar_ravscore_checkpoint_canonical_time(
        ordered_hold.hold_time
      )
      or (ordered_hold.previous_hold_time is not null
        and ordered_hold.previous_hold_time::timestamptz
          >= ordered_hold.hold_time::timestamptz)
      or not exists (
        select 1
        from pg_catalog.jsonb_array_elements(
          p_state -> 'currentEvidence'
        ) with ordinality as current_evidence(value, ordinality)
        join pg_catalog.jsonb_array_elements(
          p_state -> 'currentEvidence'
        ) with ordinality as previous_evidence(value, ordinality)
          on previous_evidence.ordinality + 1 = current_evidence.ordinality
        where current_evidence.value ->> 'time' = ordered_hold.hold_time
          and jsonb_typeof(current_evidence.value -> 'strength') = 'number'
          and jsonb_typeof(previous_evidence.value -> 'strength') = 'number'
          and extract(epoch from (
            (current_evidence.value ->> 'time')::timestamptz
              - (previous_evidence.value ->> 'time')::timestamptz
          )) / 3600 > 1
          and extract(epoch from (
            (current_evidence.value ->> 'time')::timestamptz
              - (previous_evidence.value ->> 'time')::timestamptz
          )) / 3600 <= 3
      )
  ) then
    return false;
  end if;

  if p_state ->> 'waveLastVerifiedAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      p_state ->> 'waveLastVerifiedAt'
    )
    then return false; end if;
    v_wave_last_verified := (p_state ->> 'waveLastVerifiedAt')::timestamptz;
  end if;
  if p_state ->> 'waveMigrationSeedAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      p_state ->> 'waveMigrationSeedAt'
    )
    then return false; end if;
    v_wave_migration_seed := (p_state ->> 'waveMigrationSeedAt')::timestamptz;
  end if;
  if v_wave_last_verified > v_state_time
    or v_wave_migration_seed > v_state_time
    or ((p_state -> 'waveMemoryReady') = 'true'::jsonb)
      is distinct from ((p_state ->> 'waveMemoryStatus') = any (
        array['READY','MIGRATED_READY','RECOVERED_SHORT_GAP']::text[]
      ))
    or (((p_state ->> 'waveMemoryStatus') = any (
        array['READY','MIGRATED_READY','RECOVERED_SHORT_GAP']::text[]
      )) and (v_wave_last_verified is distinct from v_state_time
        or jsonb_typeof(p_state -> 'waveEnergyScore') is distinct from 'number'))
    or ((v_wave_last_verified is null)
      is distinct from (jsonb_typeof(p_state -> 'waveEnergyScore') = 'null'))
    or (p_state ->> 'waveMemoryStatus' = 'COLD_START'
      and (v_wave_last_verified is distinct from v_state_time
        or (p_state ->> 'mobilisationPotential')::numeric <> 0
        or (p_state -> 'waveMigrationSeedAwaitingReference') = 'true'::jsonb))
    or (p_state ->> 'waveMemoryStatus' = 'MISSING_INPUT'
      and v_wave_last_verified is not null
      and v_wave_last_verified >= v_state_time)
    or (p_state ->> 'waveMemoryStatus' = 'MISSING_INPUT'
      and v_wave_last_verified is null
      and (p_state -> 'waveMigrationSeedAwaitingReference') = 'false'::jsonb
      and ((p_state ->> 'mobilisationPotential')::numeric <> 0
        or (p_state ->> 'rollbackCandidateGMobilisationPotential')::numeric <> 0))
    or ((p_state -> 'waveMigrationSeedAwaitingReference') = 'true'::jsonb
      and ((p_state -> 'waveMemoryReady') = 'true'::jsonb
        or p_state ->> 'waveMemoryStatus' <> 'MISSING_INPUT'
        or v_wave_last_verified is not null
        or v_wave_migration_seed is null))
    or ((p_state -> 'waveMigrationSeedAwaitingReference') = 'false'::jsonb
      and v_wave_migration_seed is not null)
  then
    return false;
  end if;

  v_wave_approach := p_state -> 'waveApproachState';
  if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_wave_approach)) <> 12
    or exists (
      select 1 from pg_catalog.jsonb_object_keys(v_wave_approach) as allowed(key)
      where not (allowed.key = any (array[
        'schemaVersion','policyId','time','waveReferenceAt','waveActivityMoment',
        'waveNormalMoment','waveTangentMoment','latestWaveEnergyWeight',
        'latestWaveNormalAlignment','latestWaveTangentAlignment','readiness','status'
      ]::text[]))
    )
    or v_wave_approach ->> 'schemaVersion' is distinct from '1.0.0'
    or v_wave_approach ->> 'policyId'
      is distinct from 'last-mile-wave-approach-ewma4-attenuation15-v1'
    or not public.ravradar_ravscore_checkpoint_canonical_time(
      v_wave_approach ->> 'time'
    )
    or v_wave_approach ->> 'time' is distinct from p_reference_text
    or jsonb_typeof(v_wave_approach -> 'waveActivityMoment') is distinct from 'number'
    or (v_wave_approach ->> 'waveActivityMoment')::numeric not between 0 and 1
    or jsonb_typeof(v_wave_approach -> 'waveNormalMoment') is distinct from 'number'
    or jsonb_typeof(v_wave_approach -> 'waveTangentMoment') is distinct from 'number'
    or pg_catalog.abs((v_wave_approach ->> 'waveNormalMoment')::numeric)
      > (v_wave_approach ->> 'waveActivityMoment')::numeric + 0.000000001
    or pg_catalog.abs((v_wave_approach ->> 'waveTangentMoment')::numeric)
      > (v_wave_approach ->> 'waveActivityMoment')::numeric + 0.000000001
    or pg_catalog.sqrt(
      pg_catalog.power((v_wave_approach ->> 'waveNormalMoment')::numeric, 2)
      + pg_catalog.power((v_wave_approach ->> 'waveTangentMoment')::numeric, 2)
    ) > (v_wave_approach ->> 'waveActivityMoment')::numeric + 0.000000001
    or jsonb_typeof(v_wave_approach -> 'readiness') is distinct from 'boolean'
    or jsonb_typeof(v_wave_approach -> 'status') is distinct from 'string'
    or v_wave_approach ->> 'status' <> all (array[
      'READY','RECOVERED_SHORT_GAP','MISSING_INPUT','COLD_START'
    ]::text[])
    or ((v_wave_approach -> 'readiness') = 'true'::jsonb)
      is distinct from ((v_wave_approach ->> 'status') = any (
        array['READY','RECOVERED_SHORT_GAP']::text[]
      ))
    or coalesce(jsonb_typeof(v_wave_approach -> 'waveReferenceAt'), 'missing')
      not in ('string','null')
    or coalesce(jsonb_typeof(v_wave_approach -> 'latestWaveEnergyWeight'), 'missing')
      not in ('number','null')
    or coalesce(jsonb_typeof(v_wave_approach -> 'latestWaveNormalAlignment'), 'missing')
      not in ('number','null')
    or coalesce(jsonb_typeof(v_wave_approach -> 'latestWaveTangentAlignment'), 'missing')
      not in ('number','null')
  then
    return false;
  end if;
  if v_wave_approach ->> 'waveReferenceAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
        v_wave_approach ->> 'waveReferenceAt'
      )
      or (v_wave_approach ->> 'waveReferenceAt')::timestamptz > v_state_time
    then return false; end if;
  end if;
  if ((v_wave_approach ->> 'waveReferenceAt' is null) and not (
      jsonb_typeof(v_wave_approach -> 'latestWaveEnergyWeight') = 'null'
      and jsonb_typeof(v_wave_approach -> 'latestWaveNormalAlignment') = 'null'
      and jsonb_typeof(v_wave_approach -> 'latestWaveTangentAlignment') = 'null'
    ))
    or ((v_wave_approach ->> 'waveReferenceAt' is not null) and not (
      jsonb_typeof(v_wave_approach -> 'latestWaveEnergyWeight') = 'number'
      and jsonb_typeof(v_wave_approach -> 'latestWaveNormalAlignment') = 'number'
      and jsonb_typeof(v_wave_approach -> 'latestWaveTangentAlignment') = 'number'
    ))
    or (((v_wave_approach ->> 'status') = any (
        array['READY','RECOVERED_SHORT_GAP']::text[]
      )) and v_wave_approach ->> 'waveReferenceAt' is distinct from p_reference_text)
    or (v_wave_approach ->> 'status' = 'COLD_START'
      and (v_wave_approach ->> 'waveReferenceAt' is distinct from p_reference_text
        or (v_wave_approach ->> 'waveActivityMoment')::numeric <> 0
        or (v_wave_approach ->> 'waveNormalMoment')::numeric <> 0
        or (v_wave_approach ->> 'waveTangentMoment')::numeric <> 0))
    or (v_wave_approach ->> 'status' = 'MISSING_INPUT'
      and v_wave_approach ->> 'waveReferenceAt' is not null
      and (v_wave_approach ->> 'waveReferenceAt')::timestamptz >= v_state_time)
    or (v_wave_approach ->> 'status' = 'MISSING_INPUT'
      and v_wave_approach ->> 'waveReferenceAt' is null
      and ((v_wave_approach ->> 'waveActivityMoment')::numeric <> 0
        or (v_wave_approach ->> 'waveNormalMoment')::numeric <> 0
        or (v_wave_approach ->> 'waveTangentMoment')::numeric <> 0))
  then
    return false;
  end if;
  if v_wave_approach ->> 'waveReferenceAt' is not null then
    if (v_wave_approach ->> 'latestWaveEnergyWeight')::numeric not between 0 and 1
      or (v_wave_approach ->> 'latestWaveNormalAlignment')::numeric not between -1 and 1
      or (v_wave_approach ->> 'latestWaveTangentAlignment')::numeric not between -1 and 1
      or (((v_wave_approach ->> 'latestWaveNormalAlignment')::numeric = 0
          and (v_wave_approach ->> 'latestWaveTangentAlignment')::numeric = 0)
        and (v_wave_approach ->> 'latestWaveEnergyWeight')::numeric <> 0)
      or (not ((v_wave_approach ->> 'latestWaveNormalAlignment')::numeric = 0
          and (v_wave_approach ->> 'latestWaveTangentAlignment')::numeric = 0)
        and pg_catalog.abs(pg_catalog.sqrt(
          pg_catalog.power(
            (v_wave_approach ->> 'latestWaveNormalAlignment')::numeric, 2
          ) + pg_catalog.power(
            (v_wave_approach ->> 'latestWaveTangentAlignment')::numeric, 2
          )
        ) - 1) > 0.000000001)
    then return false; end if;
  end if;

  v_history := p_state -> 'historyBounds';
  if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_history)) <> 4
    or exists (
      select 1 from pg_catalog.jsonb_object_keys(v_history) as allowed(key)
      where not (allowed.key = any (array[
        'schemaVersion','current','waveMobilisation','lastMile'
      ]::text[]))
    )
    or v_history ->> 'schemaVersion' is distinct from '1.0.0'
    or jsonb_typeof(v_history -> 'current') is distinct from 'object'
    or (select pg_catalog.count(*)
        from pg_catalog.jsonb_object_keys(v_history -> 'current')) <> 2
    or exists (
      select 1 from pg_catalog.jsonb_object_keys(v_history -> 'current') as allowed(key)
      where not (allowed.key = any (array['lowerPotential','upperPotential']::text[]))
    )
    or jsonb_typeof(v_history -> 'waveMobilisation') is distinct from 'object'
    or (select pg_catalog.count(*)
        from pg_catalog.jsonb_object_keys(v_history -> 'waveMobilisation')) <> 4
    or exists (
      select 1
      from pg_catalog.jsonb_object_keys(v_history -> 'waveMobilisation') as allowed(key)
      where not (allowed.key = any (array[
        'lowerPotential','upperPotential','lastUnknownAt','conservativeResetAt'
      ]::text[]))
    )
    or jsonb_typeof(v_history -> 'lastMile') is distinct from 'object'
    or (select pg_catalog.count(*)
        from pg_catalog.jsonb_object_keys(v_history -> 'lastMile')) <> 4
    or exists (
      select 1 from pg_catalog.jsonb_object_keys(v_history -> 'lastMile') as allowed(key)
      where not (allowed.key = any (array[
        'minimumFactorTrack','maximumFactorTrack','lastUnknownAt','conservativeResetAt'
      ]::text[]))
    )
  then
    return false;
  end if;

  if coalesce(jsonb_typeof(v_history -> 'current' -> 'lowerPotential'), 'missing')
      not in ('number','null')
    or coalesce(jsonb_typeof(v_history -> 'current' -> 'upperPotential'), 'missing')
      not in ('number','null')
    or (jsonb_typeof(v_history -> 'current' -> 'lowerPotential') = 'null')
      is distinct from (jsonb_typeof(v_history -> 'current' -> 'upperPotential') = 'null')
  then return false; end if;
  if jsonb_typeof(v_history -> 'current' -> 'lowerPotential') = 'number' then
    v_current_lower := (v_history -> 'current' ->> 'lowerPotential')::numeric;
    v_current_upper := (v_history -> 'current' ->> 'upperPotential')::numeric;
    if v_current_lower not between 0 and 100
      or v_current_upper not between 0 and 100
      or v_current_lower > v_current_upper + 0.000000001
      or ((p_state -> 'currentMemoryReady') = 'true'::jsonb and (
        v_current_lower > (p_state ->> 'supplyPotential')::numeric + 0.000000001
        or v_current_upper < (p_state ->> 'supplyPotential')::numeric - 0.000000001
        or pg_catalog.abs(v_current_lower - v_current_upper) > 0.000000001
      ))
    then return false; end if;
  elsif (p_state -> 'currentMemoryReady') = 'true'::jsonb then
    return false;
  end if;

  if jsonb_typeof(v_history -> 'waveMobilisation' -> 'lowerPotential')
      is distinct from 'number'
    or jsonb_typeof(v_history -> 'waveMobilisation' -> 'upperPotential')
      is distinct from 'number'
    or coalesce(jsonb_typeof(v_history -> 'waveMobilisation' -> 'lastUnknownAt'), 'missing')
      not in ('string','null')
    or coalesce(
      jsonb_typeof(v_history -> 'waveMobilisation' -> 'conservativeResetAt'),
      'missing'
    ) not in ('string','null')
  then return false; end if;
  v_wave_lower := (v_history -> 'waveMobilisation' ->> 'lowerPotential')::numeric;
  v_wave_upper := (v_history -> 'waveMobilisation' ->> 'upperPotential')::numeric;
  if v_wave_lower not between 0 and 100
    or v_wave_upper not between 0 and 100
    or v_wave_lower > v_wave_upper + 0.000000001
  then return false; end if;
  if v_history -> 'waveMobilisation' ->> 'lastUnknownAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      v_history -> 'waveMobilisation' ->> 'lastUnknownAt'
    ) then return false; end if;
    v_wave_unknown := (v_history -> 'waveMobilisation' ->> 'lastUnknownAt')::timestamptz;
  end if;
  if v_history -> 'waveMobilisation' ->> 'conservativeResetAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      v_history -> 'waveMobilisation' ->> 'conservativeResetAt'
    ) then return false; end if;
    v_wave_reset :=
      (v_history -> 'waveMobilisation' ->> 'conservativeResetAt')::timestamptz;
  end if;
  if v_wave_unknown > v_state_time or v_wave_reset > v_state_time
    or (v_wave_reset is not null and (
      v_wave_unknown is null
      or v_wave_reset < v_wave_unknown
      or extract(epoch from (v_wave_reset - v_wave_unknown)) / 3600 < 288
    ))
    or (v_wave_reset is null and v_wave_unknown is not null
      and extract(epoch from (v_state_time - v_wave_unknown)) / 3600 >= 288)
    or ((v_wave_unknown is null or v_wave_reset is not null)
      and pg_catalog.abs(v_wave_lower - v_wave_upper) > 0.000000001)
    or (v_wave_reset is null and (
      v_wave_lower > (p_state ->> 'mobilisationPotential')::numeric + 0.000000001
      or v_wave_upper < (p_state ->> 'mobilisationPotential')::numeric - 0.000000001
    ))
  then return false; end if;

  if coalesce(jsonb_typeof(v_history -> 'lastMile' -> 'lastUnknownAt'), 'missing')
      not in ('string','null')
    or coalesce(jsonb_typeof(v_history -> 'lastMile' -> 'conservativeResetAt'), 'missing')
      not in ('string','null')
    or jsonb_typeof(v_history -> 'lastMile' -> 'minimumFactorTrack')
      is distinct from 'object'
    or jsonb_typeof(v_history -> 'lastMile' -> 'maximumFactorTrack')
      is distinct from 'object'
  then return false; end if;
  if exists (
    select 1
    from (values
      (v_history -> 'lastMile' -> 'minimumFactorTrack'),
      (v_history -> 'lastMile' -> 'maximumFactorTrack')
    ) as track(value)
    where (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(track.value)) <> 2
      or exists (
        select 1 from pg_catalog.jsonb_object_keys(track.value) as allowed(key)
        where not (allowed.key = any (array['activityMoment','normalMoment']::text[]))
      )
      or jsonb_typeof(track.value -> 'activityMoment') is distinct from 'number'
      or jsonb_typeof(track.value -> 'normalMoment') is distinct from 'number'
      or (track.value ->> 'activityMoment')::numeric not between 0 and 1
      or pg_catalog.abs((track.value ->> 'normalMoment')::numeric)
        > (track.value ->> 'activityMoment')::numeric + 0.000000001
  ) then return false; end if;
  v_min_activity :=
    (v_history -> 'lastMile' -> 'minimumFactorTrack' ->> 'activityMoment')::numeric;
  v_min_normal :=
    (v_history -> 'lastMile' -> 'minimumFactorTrack' ->> 'normalMoment')::numeric;
  v_max_activity :=
    (v_history -> 'lastMile' -> 'maximumFactorTrack' ->> 'activityMoment')::numeric;
  v_max_normal :=
    (v_history -> 'lastMile' -> 'maximumFactorTrack' ->> 'normalMoment')::numeric;
  v_point_activity := (v_wave_approach ->> 'waveActivityMoment')::numeric;
  v_point_normal := (v_wave_approach ->> 'waveNormalMoment')::numeric;
  v_min_factor := greatest(0.85, least(
    1,
    1 - 0.15 * greatest(
      0,
      least(v_min_activity, (v_min_activity - v_min_normal) / 1.25)
    )
  ));
  v_max_factor := greatest(0.85, least(
    1,
    1 - 0.15 * greatest(
      0,
      least(v_max_activity, (v_max_activity - v_max_normal) / 1.25)
    )
  ));
  v_point_factor := greatest(0.85, least(
    1,
    1 - 0.15 * greatest(
      0,
      least(v_point_activity, (v_point_activity - v_point_normal) / 1.25)
    )
  ));
  if v_history -> 'lastMile' ->> 'lastUnknownAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      v_history -> 'lastMile' ->> 'lastUnknownAt'
    ) then return false; end if;
    v_last_mile_unknown :=
      (v_history -> 'lastMile' ->> 'lastUnknownAt')::timestamptz;
  end if;
  if v_history -> 'lastMile' ->> 'conservativeResetAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      v_history -> 'lastMile' ->> 'conservativeResetAt'
    ) then return false; end if;
    v_last_mile_reset :=
      (v_history -> 'lastMile' ->> 'conservativeResetAt')::timestamptz;
  end if;
  if v_last_mile_unknown > v_state_time or v_last_mile_reset > v_state_time
    or (v_last_mile_reset is not null and (
      v_last_mile_unknown is null
      or v_last_mile_reset < v_last_mile_unknown
      or extract(epoch from (
        v_last_mile_reset - v_last_mile_unknown
      )) / 3600 < 40
    ))
    or (v_last_mile_reset is null and v_last_mile_unknown is not null
      and extract(epoch from (
        v_state_time - v_last_mile_unknown
      )) / 3600 >= 40)
    or v_min_factor > v_max_factor + 0.000000001
    or ((v_last_mile_unknown is null or v_last_mile_reset is not null) and (
      pg_catalog.abs(v_min_activity - v_max_activity) > 0.000000001
      or pg_catalog.abs(v_min_normal - v_max_normal) > 0.000000001
    ))
    or (v_last_mile_reset is null and (
      v_point_factor < v_min_factor - 0.000000001
      or v_point_factor > v_max_factor + 0.000000001
    ))
  then return false; end if;

  v_lineage := p_state -> 'lineage';
  if jsonb_typeof(v_lineage) = 'object' then
    if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_lineage)) = 8
      and not exists (
        select 1 from pg_catalog.jsonb_object_keys(v_lineage) as keys(key)
        where not (keys.key = any (array[
          'currentEvidenceSource','migrationId','sourceModelId',
          'sourceStateSchemaVersion','migratedAt','waveApproachBootstrapHours',
          'waveApproachMaximumOmittedMomentShare',
          'waveApproachMaximumScoreErrorBeforeRounding'
        ]::text[]))
      )
    then
      if v_lineage ->> 'currentEvidenceSource'
          is distinct from 'VERIFIED_CANDIDATE_G_SIGNED_EVIDENCE_REWEIGHT'
        or v_lineage ->> 'migrationId' is distinct from
          'candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5'
        or v_lineage ->> 'sourceModelId'
          is distinct from 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3'
        or v_lineage ->> 'sourceStateSchemaVersion' is distinct from '2.0.0'
        or jsonb_typeof(v_lineage -> 'waveApproachBootstrapHours')
          is distinct from 'number'
        or (v_lineage ->> 'waveApproachBootstrapHours')::numeric <> 40
        or jsonb_typeof(v_lineage -> 'waveApproachMaximumOmittedMomentShare')
          is distinct from 'number'
        or pg_catalog.abs(
          (v_lineage ->> 'waveApproachMaximumOmittedMomentShare')::numeric
            - 0.0009765625
        ) > 0.000000001
        or jsonb_typeof(v_lineage -> 'waveApproachMaximumScoreErrorBeforeRounding')
          is distinct from 'number'
        or pg_catalog.abs(
          (v_lineage ->> 'waveApproachMaximumScoreErrorBeforeRounding')::numeric
            - 0.01171875
        ) > 0.000000001
        or not public.ravradar_ravscore_checkpoint_canonical_time(
          v_lineage ->> 'migratedAt'
        )
        or (v_lineage ->> 'migratedAt')::timestamptz > v_state_time
      then return false; end if;
    elsif (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_lineage)) = 7
      and not exists (
        select 1 from pg_catalog.jsonb_object_keys(v_lineage) as keys(key)
        where not (keys.key = any (array[
          'boundedUnknownPositionCount','completeCausalPositionCount',
          'expectedCausalPositionCount','historyTransition','recoveryId','source',
          'targetReferenceAt'
        ]::text[]))
      )
    then
      if v_lineage ->> 'recoveryId'
          is distinct from 'bounded-private-48h-history-cold-replay-v3'
        or v_lineage ->> 'source' is distinct from 'VERIFIED_PRIVATE_PROVENANCE_REPLAY'
        or jsonb_typeof(v_lineage -> 'expectedCausalPositionCount')
          is distinct from 'number'
        or (v_lineage ->> 'expectedCausalPositionCount')::numeric <> 48
        or jsonb_typeof(v_lineage -> 'completeCausalPositionCount')
          is distinct from 'number'
        or jsonb_typeof(v_lineage -> 'boundedUnknownPositionCount')
          is distinct from 'number'
        or pg_catalog.trunc(
          (v_lineage ->> 'completeCausalPositionCount')::numeric
        ) <> (v_lineage ->> 'completeCausalPositionCount')::numeric
        or pg_catalog.trunc(
          (v_lineage ->> 'boundedUnknownPositionCount')::numeric
        ) <> (v_lineage ->> 'boundedUnknownPositionCount')::numeric
        or (v_lineage ->> 'completeCausalPositionCount')::numeric < 0
        or (v_lineage ->> 'boundedUnknownPositionCount')::numeric < 0
        or (v_lineage ->> 'completeCausalPositionCount')::numeric
          + (v_lineage ->> 'boundedUnknownPositionCount')::numeric <> 48
        or v_lineage ->> 'historyTransition' is distinct from (case
          when (v_lineage ->> 'boundedUnknownPositionCount')::numeric > 0
            then 'UNKNOWN_HISTORY_INTERVAL'
          else 'VERIFIED_CAUSAL_HISTORY_WINDOW'
        end)
        or not public.ravradar_ravscore_checkpoint_canonical_time(
          v_lineage ->> 'targetReferenceAt'
        )
        or (v_lineage ->> 'targetReferenceAt')::timestamptz > v_state_time
      then return false; end if;
    else
      return false;
    end if;
  end if;
  return true;
exception
  when others then
    return false;
end;
$$;

create or replace function public.ravradar_ravscore_checkpoint_integrated_state_reason(
  p_state jsonb,
  p_reference_text text
)
returns text
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_state_time timestamptz;
  v_current_reference timestamptz;
  v_current_boundary timestamptz;
  v_current_first_time timestamptz;
  v_current_second_time timestamptz;
  v_wave_last_verified timestamptz;
  v_wave_migration_seed timestamptz;
  v_authorization jsonb;
  v_wave_approach jsonb;
  v_history jsonb;
  v_lineage jsonb;
  v_wave_unknown timestamptz;
  v_wave_reset timestamptz;
  v_last_mile_unknown timestamptz;
  v_last_mile_reset timestamptz;
  v_current_lower numeric;
  v_current_upper numeric;
  v_wave_lower numeric;
  v_wave_upper numeric;
  v_min_activity numeric;
  v_min_normal numeric;
  v_max_activity numeric;
  v_max_normal numeric;
  v_point_activity numeric;
  v_point_normal numeric;
  v_min_factor numeric;
  v_max_factor numeric;
  v_point_factor numeric;
begin
  if jsonb_typeof(p_state) is distinct from 'object'
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(p_state)) <> 35
    or exists (
      select 1
      from pg_catalog.jsonb_object_keys(p_state) as allowed(key)
      where not (allowed.key = any (array[
        'schemaVersion','modelId','variantId','profileId','componentSchemaId',
        'explanationSchemaId','rankingPolicyId','bestTimePolicyId',
        'presentationPolicyId','modelContractSha256','modelBundleSha256',
        'samplingContextKey','time','currentReferenceAt','currentMemoryReady',
        'currentMemoryStatus','currentMemoryWindowHours',
        'currentMemoryCoverageHours','currentEvidence',
        'currentNativeHoldAuthorization','currentNativeHoldIntervalEnds',
        'supplyPotential','historyBounds','waveStateSchemaVersion','wavePolicyId',
        'waveLastVerifiedAt','waveMigrationSeedAt','waveMemoryReady',
        'waveMemoryStatus','waveEnergyScore','waveMigrationSeedAwaitingReference',
        'mobilisationPotential','rollbackCandidateGMobilisationPotential',
        'waveApproachState','lineage'
      ]::text[]))
    )
    -- RAVSCORE_CHECKPOINT_INTEGRATED_STATE_BINDING_GENERATED_BEGIN
    or p_state ->> 'schemaVersion' is distinct from '6.0.0'
    or p_state ->> 'modelId'
      is distinct from 'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0'
    or p_state ->> 'variantId'
      is distinct from 'COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2'
    or p_state ->> 'profileId'
      is distinct from 'cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5'
    or p_state ->> 'componentSchemaId'
      is distinct from 'ravscore-components-huntability-delivery-mobilisation-bounds-v5'
    or p_state ->> 'explanationSchemaId'
      is distinct from 'ravscore-explanation-integrated-bounds-v5'
    or p_state ->> 'rankingPolicyId'
      is distinct from 'direction-broad-19-history-tie-v2'
    or p_state ->> 'bestTimePolicyId'
      is distinct from 'score-history-water-tie-earliest-v3'
    or p_state ->> 'presentationPolicyId'
      is distinct from 'score-bands-35-55-75-exceptional90-v1'
    or p_state ->> 'modelContractSha256'
      is distinct from 'a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b'
    or p_state ->> 'modelBundleSha256'
      is distinct from '61ec54746fdf1ac58f3d7859d4d55a901fcc6376d0412acf2d6f4f418ae5c0a1'
    -- RAVSCORE_CHECKPOINT_INTEGRATED_STATE_BINDING_GENERATED_END
    or coalesce(p_state ->> 'samplingContextKey', '') !~ '^sha256:[0-9a-f]{64}$'
    or not public.ravradar_ravscore_checkpoint_canonical_time(p_reference_text)
    or not public.ravradar_ravscore_checkpoint_canonical_time(p_state ->> 'time')
    or p_state ->> 'time' is distinct from p_reference_text
    or jsonb_typeof(p_state -> 'currentEvidence') is distinct from 'array'
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_state -> 'currentEvidence') as evidence(value)
      where jsonb_typeof(evidence.value) is distinct from 'object'
        or (select pg_catalog.count(*)
            from pg_catalog.jsonb_object_keys(evidence.value)) <> 2
        or exists (
          select 1 from pg_catalog.jsonb_object_keys(evidence.value) as keyset(key)
          where not (keyset.key = any (array['time','strength']::text[]))
        )
        or coalesce(evidence.value ->> 'time', '') !~
          '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
        or coalesce(jsonb_typeof(evidence.value -> 'strength'), 'missing')
          not in ('number','null')
    )
    or public.ravradar_ravscore_checkpoint_has_forbidden_key(p_state)
  then
    return 'I01'; /* source line 507 */
  end if;

  -- JavaScript remains authoritative for mathematical replay. PostgreSQL
  -- independently enforces the bounded, canonical derived-state envelope.
  if jsonb_typeof(p_state -> 'currentReferenceAt') is distinct from 'string'
    or not public.ravradar_ravscore_checkpoint_canonical_time(
      p_state ->> 'currentReferenceAt'
    )
    or jsonb_typeof(p_state -> 'currentMemoryReady') is distinct from 'boolean'
    or jsonb_typeof(p_state -> 'currentMemoryStatus') is distinct from 'string'
    or p_state ->> 'currentMemoryStatus' <> all (array[
      'WINDOW_INCOMPLETE','WINDOW_HAS_MISSING_EVIDENCE',
      'WINDOW_HAS_TIME_GAP','LATEST_SAMPLE_MISSING','LATEST_SAMPLE_GAP',
      'EVIDENCE_LIMIT_EXCEEDED','READY','READY_NATIVE_HOLD'
    ]::text[])
    or jsonb_typeof(p_state -> 'currentMemoryWindowHours') is distinct from 'number'
    or (p_state ->> 'currentMemoryWindowHours')::numeric <> 48
    or jsonb_typeof(p_state -> 'currentMemoryCoverageHours') is distinct from 'number'
    or (p_state ->> 'currentMemoryCoverageHours')::numeric not between 0 and 48
    or ((p_state -> 'currentMemoryReady') = 'true'::jsonb)
      is distinct from ((p_state ->> 'currentMemoryStatus') = any (
        array['READY','READY_NATIVE_HOLD']::text[]
      ))
    or (((p_state -> 'currentMemoryReady') = 'true'::jsonb)
      and (p_state ->> 'currentMemoryCoverageHours')::numeric <> 48)
    or (((p_state -> 'currentMemoryReady') = 'false'::jsonb)
      and (p_state ->> 'currentMemoryCoverageHours')::numeric <> 0)
    or (((p_state -> 'currentMemoryReady') = 'true'::jsonb)
      and (jsonb_typeof(p_state -> 'supplyPotential') is distinct from 'number'
        or (p_state ->> 'supplyPotential')::numeric not between 0 and 100))
    or (((p_state -> 'currentMemoryReady') = 'false'::jsonb)
      and jsonb_typeof(p_state -> 'supplyPotential') is distinct from 'null')
    or jsonb_typeof(p_state -> 'currentNativeHoldIntervalEnds')
      is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_state -> 'currentNativeHoldIntervalEnds') > 48
    or coalesce(jsonb_typeof(p_state -> 'currentNativeHoldAuthorization'), 'missing')
      not in ('object','null')
    or jsonb_typeof(p_state -> 'waveStateSchemaVersion') is distinct from 'string'
    or p_state ->> 'waveStateSchemaVersion' is distinct from '1.0.0'
    or jsonb_typeof(p_state -> 'wavePolicyId') is distinct from 'string'
    or p_state ->> 'wavePolicyId'
      is distinct from 'wave-energy-freshness-build4-decay48-coldrestart-v2'
    or coalesce(jsonb_typeof(p_state -> 'waveLastVerifiedAt'), 'missing')
      not in ('string','null')
    or coalesce(jsonb_typeof(p_state -> 'waveMigrationSeedAt'), 'missing')
      not in ('string','null')
    or jsonb_typeof(p_state -> 'waveMemoryReady') is distinct from 'boolean'
    or jsonb_typeof(p_state -> 'waveMemoryStatus') is distinct from 'string'
    or p_state ->> 'waveMemoryStatus' <> all (array[
      'READY','MIGRATED_READY','RECOVERED_SHORT_GAP','MISSING_INPUT','COLD_START'
    ]::text[])
    or coalesce(jsonb_typeof(p_state -> 'waveEnergyScore'), 'missing')
      not in ('number','null')
    or (jsonb_typeof(p_state -> 'waveEnergyScore') = 'number'
      and (p_state ->> 'waveEnergyScore')::numeric not between 0 and 100)
    or jsonb_typeof(p_state -> 'waveMigrationSeedAwaitingReference')
      is distinct from 'boolean'
    or jsonb_typeof(p_state -> 'mobilisationPotential') is distinct from 'number'
    or (p_state ->> 'mobilisationPotential')::numeric not between 0 and 100
    or jsonb_typeof(p_state -> 'rollbackCandidateGMobilisationPotential')
      is distinct from 'number'
    or (p_state ->> 'rollbackCandidateGMobilisationPotential')::numeric
      not between 0 and 100
    or jsonb_typeof(p_state -> 'waveApproachState') is distinct from 'object'
    or jsonb_typeof(p_state -> 'historyBounds') is distinct from 'object'
    or coalesce(jsonb_typeof(p_state -> 'lineage'), 'missing') not in ('object','null')
  then
    return 'I02'; /* source line 575 */
  end if;

  v_state_time := (p_state ->> 'time')::timestamptz;
  v_current_reference := (p_state ->> 'currentReferenceAt')::timestamptz;
  if v_current_reference > v_state_time
    or extract(epoch from (v_state_time - v_current_reference)) / 3600 > 3
    or (p_state ->> 'currentMemoryStatus' = 'READY'
      and v_current_reference is distinct from v_state_time)
    or (p_state ->> 'currentMemoryStatus' = 'READY_NATIVE_HOLD'
      and v_current_reference >= v_state_time)
  then
    return 'I03'; /* source line 587 */
  end if;

  if pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') > 49
    or ((p_state -> 'currentMemoryReady') = 'true'::jsonb
      and pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') < 2)
    or exists (
      select 1
      from (
        select evidence.value,
          evidence.ordinality,
          pg_catalog.lag(evidence.value ->> 'time') over (
            order by evidence.ordinality
          ) as previous_time
        from pg_catalog.jsonb_array_elements(
          p_state -> 'currentEvidence'
        ) with ordinality as evidence(value, ordinality)
      ) as ordered
      where jsonb_typeof(ordered.value) is distinct from 'object'
        or (select pg_catalog.count(*)
            from pg_catalog.jsonb_object_keys(ordered.value)) <> 2
        or exists (
          select 1
          from pg_catalog.jsonb_object_keys(ordered.value) as keyset(key)
          where not (keyset.key = any (array['time','strength']::text[]))
        )
        or not public.ravradar_ravscore_checkpoint_canonical_time(
          ordered.value ->> 'time'
        )
        or coalesce(jsonb_typeof(ordered.value -> 'strength'), 'missing')
          not in ('number','null')
        or (jsonb_typeof(ordered.value -> 'strength') = 'number'
          and (ordered.value ->> 'strength')::numeric not between -1 and 1)
        or (ordered.previous_time is not null
          and ordered.previous_time::timestamptz
            >= (ordered.value ->> 'time')::timestamptz)
        -- An exact regional native hold can retain later MISSING rows,
        -- but may never invent later signed transport evidence.
        or (ordered.value ->> 'time')::timestamptz > v_state_time
        or ((ordered.value ->> 'time')::timestamptz > v_current_reference
          and jsonb_typeof(ordered.value -> 'strength') is distinct from 'null')
    )
    or (((p_state -> 'currentMemoryReady') = 'true'::jsonb)
      and p_state -> 'currentEvidence'
        -> (pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') - 1)
        ->> 'time' is distinct from p_state ->> 'currentReferenceAt')
    or (((p_state -> 'currentMemoryReady') = 'true'::jsonb) and exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_state -> 'currentEvidence') as evidence(value)
      where jsonb_typeof(evidence.value -> 'strength') is distinct from 'number'
    ))
  then
    return 'I04'; /* source line 635 */
  end if;

  -- READY current memory must at least have the same real 48-hour boundary
  -- shape and attested cadence as the JavaScript builder. This deliberately
  -- does not replay signed rates or recompute supplyPotential in PostgreSQL.
  if (p_state -> 'currentMemoryReady') = 'true'::jsonb then
    v_current_boundary := v_current_reference - interval '48 hours';
    v_current_first_time := (
      p_state -> 'currentEvidence' -> 0 ->> 'time'
    )::timestamptz;
    v_current_second_time := (
      p_state -> 'currentEvidence' -> 1 ->> 'time'
    )::timestamptz;
    if v_current_first_time > v_current_boundary
      or (v_current_first_time < v_current_boundary and (
        pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') < 2
        or v_current_first_time < v_current_boundary - interval '3 hours'
        or v_current_second_time < v_current_boundary
        or v_current_second_time - v_current_first_time > interval '3 hours'
      ))
      or exists (
        select 1
        from (
          select evidence.value ->> 'time' as evidence_time,
            pg_catalog.lag(evidence.value ->> 'time') over (
              order by evidence.ordinality
            ) as previous_time
          from pg_catalog.jsonb_array_elements(
            p_state -> 'currentEvidence'
          ) with ordinality as evidence(value, ordinality)
        ) as ordered
        where ordered.previous_time is not null
          and (
            (ordered.evidence_time::timestamptz
              - ordered.previous_time::timestamptz) > interval '3 hours'
            or (
              (ordered.evidence_time::timestamptz
                - ordered.previous_time::timestamptz) > interval '1 hour'
              and (
                ordered.previous_time::timestamptz >= v_current_boundary
                or ordered.evidence_time::timestamptz
                  > v_current_boundary + interval '1 hour'
              )
              and not exists (
                select 1
                from pg_catalog.jsonb_array_elements(
                  p_state -> 'currentNativeHoldIntervalEnds'
                ) as hold(value)
                where hold.value #>> '{}' = ordered.evidence_time
              )
            )
          )
      )
    then
      return 'I05'; /* source line 690 */
    end if;
  end if;

  v_authorization := p_state -> 'currentNativeHoldAuthorization';
  if jsonb_typeof(v_authorization) = 'object' then
    if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_authorization)) <> 4
      or exists (
        select 1 from pg_catalog.jsonb_object_keys(v_authorization) as allowed(key)
        where not (allowed.key = any (array[
          'sourceClass','source','collection','distanceKm'
        ]::text[]))
      )
      or v_authorization ->> 'sourceClass'
        is distinct from 'owner-approved-regional-proxy'
      or v_authorization ->> 'source' is distinct from 'dmi-dkss-lf-regional-proxy'
      or v_authorization ->> 'collection' is distinct from 'dkss_lf'
      or jsonb_typeof(v_authorization -> 'distanceKm') is distinct from 'number'
      or (v_authorization ->> 'distanceKm')::numeric not between 0 and 15
      or (select evidence.value ->> 'time'
          from pg_catalog.jsonb_array_elements(
            p_state -> 'currentEvidence'
          ) with ordinality as evidence(value, ordinality)
          where jsonb_typeof(evidence.value -> 'strength') = 'number'
          order by evidence.ordinality desc
          limit 1) is distinct from p_state ->> 'currentReferenceAt'
    then
      return 'I06'; /* source line 717 */
    end if;
  elsif v_current_reference < v_state_time
    or p_state ->> 'currentMemoryStatus' = 'READY_NATIVE_HOLD'
  then
    return 'I07'; /* source line 722 */
  end if;

  if exists (
    select 1
    from (
      select hold.value #>> '{}' as hold_time,
        hold.ordinality,
        pg_catalog.lag(hold.value #>> '{}') over (
          order by hold.ordinality
        ) as previous_hold_time
      from pg_catalog.jsonb_array_elements(
        p_state -> 'currentNativeHoldIntervalEnds'
      ) with ordinality as hold(value, ordinality)
    ) as ordered_hold
    where not public.ravradar_ravscore_checkpoint_canonical_time(
        ordered_hold.hold_time
      )
      or (ordered_hold.previous_hold_time is not null
        and ordered_hold.previous_hold_time::timestamptz
          >= ordered_hold.hold_time::timestamptz)
      or not exists (
        select 1
        from pg_catalog.jsonb_array_elements(
          p_state -> 'currentEvidence'
        ) with ordinality as current_evidence(value, ordinality)
        join pg_catalog.jsonb_array_elements(
          p_state -> 'currentEvidence'
        ) with ordinality as previous_evidence(value, ordinality)
          on previous_evidence.ordinality + 1 = current_evidence.ordinality
        where current_evidence.value ->> 'time' = ordered_hold.hold_time
          and jsonb_typeof(current_evidence.value -> 'strength') = 'number'
          and jsonb_typeof(previous_evidence.value -> 'strength') = 'number'
          and extract(epoch from (
            (current_evidence.value ->> 'time')::timestamptz
              - (previous_evidence.value ->> 'time')::timestamptz
          )) / 3600 > 1
          and extract(epoch from (
            (current_evidence.value ->> 'time')::timestamptz
              - (previous_evidence.value ->> 'time')::timestamptz
          )) / 3600 <= 3
      )
  ) then
    return 'I08'; /* source line 765 */
  end if;

  if p_state ->> 'waveLastVerifiedAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      p_state ->> 'waveLastVerifiedAt'
    )
    then return 'I09'; /* source line 772 */ end if;
    v_wave_last_verified := (p_state ->> 'waveLastVerifiedAt')::timestamptz;
  end if;
  if p_state ->> 'waveMigrationSeedAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      p_state ->> 'waveMigrationSeedAt'
    )
    then return 'I10'; /* source line 779 */ end if;
    v_wave_migration_seed := (p_state ->> 'waveMigrationSeedAt')::timestamptz;
  end if;
  if v_wave_last_verified > v_state_time
    or v_wave_migration_seed > v_state_time
    or ((p_state -> 'waveMemoryReady') = 'true'::jsonb)
      is distinct from ((p_state ->> 'waveMemoryStatus') = any (
        array['READY','MIGRATED_READY','RECOVERED_SHORT_GAP']::text[]
      ))
    or (((p_state ->> 'waveMemoryStatus') = any (
        array['READY','MIGRATED_READY','RECOVERED_SHORT_GAP']::text[]
      )) and (v_wave_last_verified is distinct from v_state_time
        or jsonb_typeof(p_state -> 'waveEnergyScore') is distinct from 'number'))
    or ((v_wave_last_verified is null)
      is distinct from (jsonb_typeof(p_state -> 'waveEnergyScore') = 'null'))
    or (p_state ->> 'waveMemoryStatus' = 'COLD_START'
      and (v_wave_last_verified is distinct from v_state_time
        or (p_state ->> 'mobilisationPotential')::numeric <> 0
        or (p_state -> 'waveMigrationSeedAwaitingReference') = 'true'::jsonb))
    or (p_state ->> 'waveMemoryStatus' = 'MISSING_INPUT'
      and v_wave_last_verified is not null
      and v_wave_last_verified >= v_state_time)
    or (p_state ->> 'waveMemoryStatus' = 'MISSING_INPUT'
      and v_wave_last_verified is null
      and (p_state -> 'waveMigrationSeedAwaitingReference') = 'false'::jsonb
      and ((p_state ->> 'mobilisationPotential')::numeric <> 0
        or (p_state ->> 'rollbackCandidateGMobilisationPotential')::numeric <> 0))
    or ((p_state -> 'waveMigrationSeedAwaitingReference') = 'true'::jsonb
      and ((p_state -> 'waveMemoryReady') = 'true'::jsonb
        or p_state ->> 'waveMemoryStatus' <> 'MISSING_INPUT'
        or v_wave_last_verified is not null
        or v_wave_migration_seed is null))
    or ((p_state -> 'waveMigrationSeedAwaitingReference') = 'false'::jsonb
      and v_wave_migration_seed is not null)
  then
    return 'I11'; /* source line 814 */
  end if;

  v_wave_approach := p_state -> 'waveApproachState';
  if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_wave_approach)) <> 12
    or exists (
      select 1 from pg_catalog.jsonb_object_keys(v_wave_approach) as allowed(key)
      where not (allowed.key = any (array[
        'schemaVersion','policyId','time','waveReferenceAt','waveActivityMoment',
        'waveNormalMoment','waveTangentMoment','latestWaveEnergyWeight',
        'latestWaveNormalAlignment','latestWaveTangentAlignment','readiness','status'
      ]::text[]))
    )
    or v_wave_approach ->> 'schemaVersion' is distinct from '1.0.0'
    or v_wave_approach ->> 'policyId'
      is distinct from 'last-mile-wave-approach-ewma4-attenuation15-v1'
    or not public.ravradar_ravscore_checkpoint_canonical_time(
      v_wave_approach ->> 'time'
    )
    or v_wave_approach ->> 'time' is distinct from p_reference_text
    or jsonb_typeof(v_wave_approach -> 'waveActivityMoment') is distinct from 'number'
    or (v_wave_approach ->> 'waveActivityMoment')::numeric not between 0 and 1
    or jsonb_typeof(v_wave_approach -> 'waveNormalMoment') is distinct from 'number'
    or jsonb_typeof(v_wave_approach -> 'waveTangentMoment') is distinct from 'number'
    or pg_catalog.abs((v_wave_approach ->> 'waveNormalMoment')::numeric)
      > (v_wave_approach ->> 'waveActivityMoment')::numeric + 0.000000001
    or pg_catalog.abs((v_wave_approach ->> 'waveTangentMoment')::numeric)
      > (v_wave_approach ->> 'waveActivityMoment')::numeric + 0.000000001
    or pg_catalog.sqrt(
      pg_catalog.power((v_wave_approach ->> 'waveNormalMoment')::numeric, 2)
      + pg_catalog.power((v_wave_approach ->> 'waveTangentMoment')::numeric, 2)
    ) > (v_wave_approach ->> 'waveActivityMoment')::numeric + 0.000000001
    or jsonb_typeof(v_wave_approach -> 'readiness') is distinct from 'boolean'
    or jsonb_typeof(v_wave_approach -> 'status') is distinct from 'string'
    or v_wave_approach ->> 'status' <> all (array[
      'READY','RECOVERED_SHORT_GAP','MISSING_INPUT','COLD_START'
    ]::text[])
    or ((v_wave_approach -> 'readiness') = 'true'::jsonb)
      is distinct from ((v_wave_approach ->> 'status') = any (
        array['READY','RECOVERED_SHORT_GAP']::text[]
      ))
    or coalesce(jsonb_typeof(v_wave_approach -> 'waveReferenceAt'), 'missing')
      not in ('string','null')
    or coalesce(jsonb_typeof(v_wave_approach -> 'latestWaveEnergyWeight'), 'missing')
      not in ('number','null')
    or coalesce(jsonb_typeof(v_wave_approach -> 'latestWaveNormalAlignment'), 'missing')
      not in ('number','null')
    or coalesce(jsonb_typeof(v_wave_approach -> 'latestWaveTangentAlignment'), 'missing')
      not in ('number','null')
  then
    return 'I12'; /* source line 864 */
  end if;
  if v_wave_approach ->> 'waveReferenceAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
        v_wave_approach ->> 'waveReferenceAt'
      )
      or (v_wave_approach ->> 'waveReferenceAt')::timestamptz > v_state_time
    then return 'I13'; /* source line 871 */ end if;
  end if;
  if ((v_wave_approach ->> 'waveReferenceAt' is null) and not (
      jsonb_typeof(v_wave_approach -> 'latestWaveEnergyWeight') = 'null'
      and jsonb_typeof(v_wave_approach -> 'latestWaveNormalAlignment') = 'null'
      and jsonb_typeof(v_wave_approach -> 'latestWaveTangentAlignment') = 'null'
    ))
    or ((v_wave_approach ->> 'waveReferenceAt' is not null) and not (
      jsonb_typeof(v_wave_approach -> 'latestWaveEnergyWeight') = 'number'
      and jsonb_typeof(v_wave_approach -> 'latestWaveNormalAlignment') = 'number'
      and jsonb_typeof(v_wave_approach -> 'latestWaveTangentAlignment') = 'number'
    ))
    or (((v_wave_approach ->> 'status') = any (
        array['READY','RECOVERED_SHORT_GAP']::text[]
      )) and v_wave_approach ->> 'waveReferenceAt' is distinct from p_reference_text)
    or (v_wave_approach ->> 'status' = 'COLD_START'
      and (v_wave_approach ->> 'waveReferenceAt' is distinct from p_reference_text
        or (v_wave_approach ->> 'waveActivityMoment')::numeric <> 0
        or (v_wave_approach ->> 'waveNormalMoment')::numeric <> 0
        or (v_wave_approach ->> 'waveTangentMoment')::numeric <> 0))
    or (v_wave_approach ->> 'status' = 'MISSING_INPUT'
      and v_wave_approach ->> 'waveReferenceAt' is not null
      and (v_wave_approach ->> 'waveReferenceAt')::timestamptz >= v_state_time)
    or (v_wave_approach ->> 'status' = 'MISSING_INPUT'
      and v_wave_approach ->> 'waveReferenceAt' is null
      and ((v_wave_approach ->> 'waveActivityMoment')::numeric <> 0
        or (v_wave_approach ->> 'waveNormalMoment')::numeric <> 0
        or (v_wave_approach ->> 'waveTangentMoment')::numeric <> 0))
  then
    return 'I14'; /* source line 900 */
  end if;
  if v_wave_approach ->> 'waveReferenceAt' is not null then
    if (v_wave_approach ->> 'latestWaveEnergyWeight')::numeric not between 0 and 1
      or (v_wave_approach ->> 'latestWaveNormalAlignment')::numeric not between -1 and 1
      or (v_wave_approach ->> 'latestWaveTangentAlignment')::numeric not between -1 and 1
      or (((v_wave_approach ->> 'latestWaveNormalAlignment')::numeric = 0
          and (v_wave_approach ->> 'latestWaveTangentAlignment')::numeric = 0)
        and (v_wave_approach ->> 'latestWaveEnergyWeight')::numeric <> 0)
      or (not ((v_wave_approach ->> 'latestWaveNormalAlignment')::numeric = 0
          and (v_wave_approach ->> 'latestWaveTangentAlignment')::numeric = 0)
        and pg_catalog.abs(pg_catalog.sqrt(
          pg_catalog.power(
            (v_wave_approach ->> 'latestWaveNormalAlignment')::numeric, 2
          ) + pg_catalog.power(
            (v_wave_approach ->> 'latestWaveTangentAlignment')::numeric, 2
          )
        ) - 1) > 0.000000001)
    then return 'I15'; /* source line 918 */ end if;
  end if;

  v_history := p_state -> 'historyBounds';
  if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_history)) <> 4
    or exists (
      select 1 from pg_catalog.jsonb_object_keys(v_history) as allowed(key)
      where not (allowed.key = any (array[
        'schemaVersion','current','waveMobilisation','lastMile'
      ]::text[]))
    )
    or v_history ->> 'schemaVersion' is distinct from '1.0.0'
    or jsonb_typeof(v_history -> 'current') is distinct from 'object'
    or (select pg_catalog.count(*)
        from pg_catalog.jsonb_object_keys(v_history -> 'current')) <> 2
    or exists (
      select 1 from pg_catalog.jsonb_object_keys(v_history -> 'current') as allowed(key)
      where not (allowed.key = any (array['lowerPotential','upperPotential']::text[]))
    )
    or jsonb_typeof(v_history -> 'waveMobilisation') is distinct from 'object'
    or (select pg_catalog.count(*)
        from pg_catalog.jsonb_object_keys(v_history -> 'waveMobilisation')) <> 4
    or exists (
      select 1
      from pg_catalog.jsonb_object_keys(v_history -> 'waveMobilisation') as allowed(key)
      where not (allowed.key = any (array[
        'lowerPotential','upperPotential','lastUnknownAt','conservativeResetAt'
      ]::text[]))
    )
    or jsonb_typeof(v_history -> 'lastMile') is distinct from 'object'
    or (select pg_catalog.count(*)
        from pg_catalog.jsonb_object_keys(v_history -> 'lastMile')) <> 4
    or exists (
      select 1 from pg_catalog.jsonb_object_keys(v_history -> 'lastMile') as allowed(key)
      where not (allowed.key = any (array[
        'minimumFactorTrack','maximumFactorTrack','lastUnknownAt','conservativeResetAt'
      ]::text[]))
    )
  then
    return 'I16'; /* source line 957 */
  end if;

  if coalesce(jsonb_typeof(v_history -> 'current' -> 'lowerPotential'), 'missing')
      not in ('number','null')
    or coalesce(jsonb_typeof(v_history -> 'current' -> 'upperPotential'), 'missing')
      not in ('number','null')
    or (jsonb_typeof(v_history -> 'current' -> 'lowerPotential') = 'null')
      is distinct from (jsonb_typeof(v_history -> 'current' -> 'upperPotential') = 'null')
  then return 'I17'; /* source line 966 */ end if;
  if jsonb_typeof(v_history -> 'current' -> 'lowerPotential') = 'number' then
    v_current_lower := (v_history -> 'current' ->> 'lowerPotential')::numeric;
    v_current_upper := (v_history -> 'current' ->> 'upperPotential')::numeric;
    if v_current_lower not between 0 and 100
      or v_current_upper not between 0 and 100
      or v_current_lower > v_current_upper + 0.000000001
      or ((p_state -> 'currentMemoryReady') = 'true'::jsonb and (
        v_current_lower > (p_state ->> 'supplyPotential')::numeric + 0.000000001
        or v_current_upper < (p_state ->> 'supplyPotential')::numeric - 0.000000001
        or pg_catalog.abs(v_current_lower - v_current_upper) > 0.000000001
      ))
    then return 'I18'; /* source line 978 */ end if;
  elsif (p_state -> 'currentMemoryReady') = 'true'::jsonb then
    return 'I19'; /* source line 980 */
  end if;

  if jsonb_typeof(v_history -> 'waveMobilisation' -> 'lowerPotential')
      is distinct from 'number'
    or jsonb_typeof(v_history -> 'waveMobilisation' -> 'upperPotential')
      is distinct from 'number'
    or coalesce(jsonb_typeof(v_history -> 'waveMobilisation' -> 'lastUnknownAt'), 'missing')
      not in ('string','null')
    or coalesce(
      jsonb_typeof(v_history -> 'waveMobilisation' -> 'conservativeResetAt'),
      'missing'
    ) not in ('string','null')
  then return 'I20'; /* source line 993 */ end if;
  v_wave_lower := (v_history -> 'waveMobilisation' ->> 'lowerPotential')::numeric;
  v_wave_upper := (v_history -> 'waveMobilisation' ->> 'upperPotential')::numeric;
  if v_wave_lower not between 0 and 100
    or v_wave_upper not between 0 and 100
    or v_wave_lower > v_wave_upper + 0.000000001
  then return 'I21'; /* source line 999 */ end if;
  if v_history -> 'waveMobilisation' ->> 'lastUnknownAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      v_history -> 'waveMobilisation' ->> 'lastUnknownAt'
    ) then return 'I22'; /* source line 1003 */ end if;
    v_wave_unknown := (v_history -> 'waveMobilisation' ->> 'lastUnknownAt')::timestamptz;
  end if;
  if v_history -> 'waveMobilisation' ->> 'conservativeResetAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      v_history -> 'waveMobilisation' ->> 'conservativeResetAt'
    ) then return 'I23'; /* source line 1009 */ end if;
    v_wave_reset :=
      (v_history -> 'waveMobilisation' ->> 'conservativeResetAt')::timestamptz;
  end if;
  if v_wave_unknown > v_state_time or v_wave_reset > v_state_time
    or (v_wave_reset is not null and (
      v_wave_unknown is null
      or v_wave_reset < v_wave_unknown
      or extract(epoch from (v_wave_reset - v_wave_unknown)) / 3600 < 288
    ))
    or (v_wave_reset is null and v_wave_unknown is not null
      and extract(epoch from (v_state_time - v_wave_unknown)) / 3600 >= 288)
    or ((v_wave_unknown is null or v_wave_reset is not null)
      and pg_catalog.abs(v_wave_lower - v_wave_upper) > 0.000000001)
    or (v_wave_reset is null and (
      v_wave_lower > (p_state ->> 'mobilisationPotential')::numeric + 0.000000001
      or v_wave_upper < (p_state ->> 'mobilisationPotential')::numeric - 0.000000001
    ))
  then return 'I24'; /* source line 1027 */ end if;

  if coalesce(jsonb_typeof(v_history -> 'lastMile' -> 'lastUnknownAt'), 'missing')
      not in ('string','null')
    or coalesce(jsonb_typeof(v_history -> 'lastMile' -> 'conservativeResetAt'), 'missing')
      not in ('string','null')
    or jsonb_typeof(v_history -> 'lastMile' -> 'minimumFactorTrack')
      is distinct from 'object'
    or jsonb_typeof(v_history -> 'lastMile' -> 'maximumFactorTrack')
      is distinct from 'object'
  then return 'I25'; /* source line 1037 */ end if;
  if exists (
    select 1
    from (values
      (v_history -> 'lastMile' -> 'minimumFactorTrack'),
      (v_history -> 'lastMile' -> 'maximumFactorTrack')
    ) as track(value)
    where (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(track.value)) <> 2
      or exists (
        select 1 from pg_catalog.jsonb_object_keys(track.value) as allowed(key)
        where not (allowed.key = any (array['activityMoment','normalMoment']::text[]))
      )
      or jsonb_typeof(track.value -> 'activityMoment') is distinct from 'number'
      or jsonb_typeof(track.value -> 'normalMoment') is distinct from 'number'
      or (track.value ->> 'activityMoment')::numeric not between 0 and 1
      or pg_catalog.abs((track.value ->> 'normalMoment')::numeric)
        > (track.value ->> 'activityMoment')::numeric + 0.000000001
  ) then return 'I26'; /* source line 1054 */ end if;
  v_min_activity :=
    (v_history -> 'lastMile' -> 'minimumFactorTrack' ->> 'activityMoment')::numeric;
  v_min_normal :=
    (v_history -> 'lastMile' -> 'minimumFactorTrack' ->> 'normalMoment')::numeric;
  v_max_activity :=
    (v_history -> 'lastMile' -> 'maximumFactorTrack' ->> 'activityMoment')::numeric;
  v_max_normal :=
    (v_history -> 'lastMile' -> 'maximumFactorTrack' ->> 'normalMoment')::numeric;
  v_point_activity := (v_wave_approach ->> 'waveActivityMoment')::numeric;
  v_point_normal := (v_wave_approach ->> 'waveNormalMoment')::numeric;
  v_min_factor := greatest(0.85, least(
    1,
    1 - 0.15 * greatest(
      0,
      least(v_min_activity, (v_min_activity - v_min_normal) / 1.25)
    )
  ));
  v_max_factor := greatest(0.85, least(
    1,
    1 - 0.15 * greatest(
      0,
      least(v_max_activity, (v_max_activity - v_max_normal) / 1.25)
    )
  ));
  v_point_factor := greatest(0.85, least(
    1,
    1 - 0.15 * greatest(
      0,
      least(v_point_activity, (v_point_activity - v_point_normal) / 1.25)
    )
  ));
  if v_history -> 'lastMile' ->> 'lastUnknownAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      v_history -> 'lastMile' ->> 'lastUnknownAt'
    ) then return 'I27'; /* source line 1089 */ end if;
    v_last_mile_unknown :=
      (v_history -> 'lastMile' ->> 'lastUnknownAt')::timestamptz;
  end if;
  if v_history -> 'lastMile' ->> 'conservativeResetAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      v_history -> 'lastMile' ->> 'conservativeResetAt'
    ) then return 'I28'; /* source line 1096 */ end if;
    v_last_mile_reset :=
      (v_history -> 'lastMile' ->> 'conservativeResetAt')::timestamptz;
  end if;
  if v_last_mile_unknown > v_state_time or v_last_mile_reset > v_state_time
    or (v_last_mile_reset is not null and (
      v_last_mile_unknown is null
      or v_last_mile_reset < v_last_mile_unknown
      or extract(epoch from (
        v_last_mile_reset - v_last_mile_unknown
      )) / 3600 < 40
    ))
    or (v_last_mile_reset is null and v_last_mile_unknown is not null
      and extract(epoch from (
        v_state_time - v_last_mile_unknown
      )) / 3600 >= 40)
    or v_min_factor > v_max_factor + 0.000000001
    or ((v_last_mile_unknown is null or v_last_mile_reset is not null) and (
      pg_catalog.abs(v_min_activity - v_max_activity) > 0.000000001
      or pg_catalog.abs(v_min_normal - v_max_normal) > 0.000000001
    ))
    or (v_last_mile_reset is null and (
      v_point_factor < v_min_factor - 0.000000001
      or v_point_factor > v_max_factor + 0.000000001
    ))
  then return 'I29'; /* source line 1121 */ end if;

  v_lineage := p_state -> 'lineage';
  if jsonb_typeof(v_lineage) = 'object' then
    if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_lineage)) = 8
      and not exists (
        select 1 from pg_catalog.jsonb_object_keys(v_lineage) as keys(key)
        where not (keys.key = any (array[
          'currentEvidenceSource','migrationId','sourceModelId',
          'sourceStateSchemaVersion','migratedAt','waveApproachBootstrapHours',
          'waveApproachMaximumOmittedMomentShare',
          'waveApproachMaximumScoreErrorBeforeRounding'
        ]::text[]))
      )
    then
      if v_lineage ->> 'currentEvidenceSource'
          is distinct from 'VERIFIED_CANDIDATE_G_SIGNED_EVIDENCE_REWEIGHT'
        or v_lineage ->> 'migrationId' is distinct from
          'candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5'
        or v_lineage ->> 'sourceModelId'
          is distinct from 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3'
        or v_lineage ->> 'sourceStateSchemaVersion' is distinct from '2.0.0'
        or jsonb_typeof(v_lineage -> 'waveApproachBootstrapHours')
          is distinct from 'number'
        or (v_lineage ->> 'waveApproachBootstrapHours')::numeric <> 40
        or jsonb_typeof(v_lineage -> 'waveApproachMaximumOmittedMomentShare')
          is distinct from 'number'
        or pg_catalog.abs(
          (v_lineage ->> 'waveApproachMaximumOmittedMomentShare')::numeric
            - 0.0009765625
        ) > 0.000000001
        or jsonb_typeof(v_lineage -> 'waveApproachMaximumScoreErrorBeforeRounding')
          is distinct from 'number'
        or pg_catalog.abs(
          (v_lineage ->> 'waveApproachMaximumScoreErrorBeforeRounding')::numeric
            - 0.01171875
        ) > 0.000000001
        or not public.ravradar_ravscore_checkpoint_canonical_time(
          v_lineage ->> 'migratedAt'
        )
        or (v_lineage ->> 'migratedAt')::timestamptz > v_state_time
      then return 'I30'; /* source line 1162 */ end if;
    elsif (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_lineage)) = 7
      and not exists (
        select 1 from pg_catalog.jsonb_object_keys(v_lineage) as keys(key)
        where not (keys.key = any (array[
          'boundedUnknownPositionCount','completeCausalPositionCount',
          'expectedCausalPositionCount','historyTransition','recoveryId','source',
          'targetReferenceAt'
        ]::text[]))
      )
    then
      if v_lineage ->> 'recoveryId'
          is distinct from 'bounded-private-48h-history-cold-replay-v3'
        or v_lineage ->> 'source' is distinct from 'VERIFIED_PRIVATE_PROVENANCE_REPLAY'
        or jsonb_typeof(v_lineage -> 'expectedCausalPositionCount')
          is distinct from 'number'
        or (v_lineage ->> 'expectedCausalPositionCount')::numeric <> 48
        or jsonb_typeof(v_lineage -> 'completeCausalPositionCount')
          is distinct from 'number'
        or jsonb_typeof(v_lineage -> 'boundedUnknownPositionCount')
          is distinct from 'number'
        or pg_catalog.trunc(
          (v_lineage ->> 'completeCausalPositionCount')::numeric
        ) <> (v_lineage ->> 'completeCausalPositionCount')::numeric
        or pg_catalog.trunc(
          (v_lineage ->> 'boundedUnknownPositionCount')::numeric
        ) <> (v_lineage ->> 'boundedUnknownPositionCount')::numeric
        or (v_lineage ->> 'completeCausalPositionCount')::numeric < 0
        or (v_lineage ->> 'boundedUnknownPositionCount')::numeric < 0
        or (v_lineage ->> 'completeCausalPositionCount')::numeric
          + (v_lineage ->> 'boundedUnknownPositionCount')::numeric <> 48
        or v_lineage ->> 'historyTransition' is distinct from (case
          when (v_lineage ->> 'boundedUnknownPositionCount')::numeric > 0
            then 'UNKNOWN_HISTORY_INTERVAL'
          else 'VERIFIED_CAUSAL_HISTORY_WINDOW'
        end)
        or not public.ravradar_ravscore_checkpoint_canonical_time(
          v_lineage ->> 'targetReferenceAt'
        )
        or (v_lineage ->> 'targetReferenceAt')::timestamptz > v_state_time
      then return 'I31'; /* source line 1202 */ end if;
    else
      return 'I32'; /* source line 1204 */
    end if;
  end if;
  return null;
exception
  when others then
    return 'I33'; /* source line 1210 */
end;
$$;

revoke all on function public.ravradar_ravscore_checkpoint_integrated_state_valid(jsonb,text)

  from public, anon, authenticated;

revoke all on function public.ravradar_ravscore_checkpoint_integrated_state_reason(jsonb,text)

  from public, anon, authenticated;

comment on function public.ravradar_ravscore_checkpoint_integrated_state_valid(jsonb,text)

is 'Exact compact state validator: verified native hold may retain later null, never later signed evidence.';

notify pgrst, 'reload schema';

commit;
