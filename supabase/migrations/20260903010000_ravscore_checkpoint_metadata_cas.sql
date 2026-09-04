-- Publish the private RavScore continuation checkpoint without returning its
-- multi-megabyte JSONB payload on every successful write. The service-role
-- caller still validates the local document completely before this RPC; the
-- database independently enforces the bounded envelope, identity, privacy and
-- monotonic compare-and-swap contract.

begin;
set local lock_timeout = '5s';

-- RAVSCORE_CHECKPOINT_METADATA_CAS_GENERATED_BEGIN
-- The protected continuation checkpoint is an operational replacement row,
-- not owner-authored history. Reassert the complete current exclusion list so
-- schema-only and installer-only setups cannot retain a second 16 MiB copy on
-- every successful CAS update.
create or replace function public.version_admin_document()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.payload is not distinct from old.payload then return null; end if;
  if tg_op='UPDATE' and old.document_key not in (
    'weather-health',
    'runtime-diagnostics',
    'dmi-water-stations',
    'water-station-routing-audit',
    'ocean-diagnostics',
    'cache-audit',
    'implementation-audit',
    'coastal-point-staging-status',
    'protected-asset-manifest',
    'ravscore-continuation-checkpoint',
    'ravscore-private-production-runtime-pointer',
    'ravscore-integrated-cutover-readiness',
    'ravscore-operational-model-activation'
  ) then
    insert into public.admin_document_versions(document_key,payload,version,created_by)
    values(old.document_key,old.payload,old.version,auth.uid());
  end if;
  if tg_op='UPDATE' then new.version=old.version+1; end if;
  new.updated_at=now();
  new.updated_by=auth.uid();
  return new;
end;
$$;

-- The continuation row is operational service-role state. Even RavRadar
-- owners/full_admins must use the bounded metadata RPC rather than selecting
-- the multi-megabyte payload or a stale version copy through permissive RLS.
drop policy if exists ravradar_ravscore_checkpoint_no_direct_read
  on public.admin_documents;
create policy ravradar_ravscore_checkpoint_no_direct_read
on public.admin_documents as restrictive for select to authenticated
using (document_key <> 'ravscore-continuation-checkpoint');

drop policy if exists ravradar_ravscore_checkpoint_versions_no_direct_read
  on public.admin_document_versions;
create policy ravradar_ravscore_checkpoint_versions_no_direct_read
on public.admin_document_versions as restrictive for select to authenticated
using (document_key <> 'ravscore-continuation-checkpoint');

-- PostgreSQL accepts a few timestamp spellings that it subsequently
-- normalises. Require the exact JavaScript toISOString millisecond form and a
-- successful UTC round trip before any caller casts a checkpoint time.
create or replace function public.ravradar_ravscore_checkpoint_canonical_time(
  p_value text
)
returns boolean
language plpgsql
stable
set search_path = pg_catalog, public
as $$
begin
  if p_value is null or p_value !~
      '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
  then
    return false;
  end if;
  return pg_catalog.to_char(
    p_value::timestamptz at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  ) = p_value;
exception
  when others then
    return false;
end;
$$;

create or replace function public.ravradar_ravscore_checkpoint_has_forbidden_key(
  p_value jsonb
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_key text;
  v_normalized_key text;
  v_child jsonb;
begin
  if p_value is null then return false; end if;
  if jsonb_typeof(p_value) = 'object' then
    for v_key, v_child in select key, value from pg_catalog.jsonb_each(p_value)
    loop
      v_normalized_key := pg_catalog.regexp_replace(
        pg_catalog.lower(v_key),
        '[^a-z0-9]',
        '',
        'g'
      );
      if v_normalized_key = any (array[
        'u','v','rawu','rawv','umps','vmps','currentu','currentv',
        'currentumps','currentvmps','eastwardcurrentmps','northwardcurrentmps',
        'waterpoint','landpoint','coordinate','coordinates','lat','latitude',
        'lon','lng','longitude','weather','forecast','payload','score','scores'
      ]::text[]) then
        return true;
      end if;
      if public.ravradar_ravscore_checkpoint_has_forbidden_key(v_child) then
        return true;
      end if;
    end loop;
  elsif jsonb_typeof(p_value) = 'array' then
    for v_child in select value from pg_catalog.jsonb_array_elements(p_value)
    loop
      if public.ravradar_ravscore_checkpoint_has_forbidden_key(v_child) then
        return true;
      end if;
    end loop;
  end if;
  return false;
end;
$$;

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
      is distinct from 'd5796289f645f1bcab6b4fe822c5ed6b0e919321013687302feb2139e814a286'
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
      'WINDOW_HAS_TIME_GAP','READY','READY_NATIVE_HOLD'
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

  if pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') not between 1 and 49
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
    )
    or p_state -> 'currentEvidence'
      -> (pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') - 1)
      ->> 'time' is distinct from p_state ->> 'currentReferenceAt'
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
        or v_lineage ->> 'historyTransition' is distinct from case
          when (v_lineage ->> 'boundedUnknownPositionCount')::numeric > 0
            then 'UNKNOWN_HISTORY_INTERVAL'
          else 'VERIFIED_CAUSAL_HISTORY_WINDOW'
        end
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

create or replace function public.ravradar_ravscore_checkpoint_candidate_state_valid(
  p_state jsonb,
  p_reference_text text
)
returns boolean
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_reference timestamptz;
  v_boundary timestamptz;
  v_first_time timestamptz;
  v_second_time timestamptz;
begin
  if jsonb_typeof(p_state) is distinct from 'object'
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(p_state)) <> 15
    or exists (
      select 1
      from pg_catalog.jsonb_object_keys(p_state) as allowed(key)
      where not (allowed.key = any (array[
        'schemaVersion','modelId','variantId','profileId','stateKey','time',
        'transportReferenceAt','transportPotential','outboundEpisodeEffectiveHours',
        'transportMemoryReady','transportMemoryStatus','transportMemoryWindowHours',
        'transportMemoryCoverageHours','transportEvidence','mobilisationPotential'
      ]::text[]))
    )
    -- RAVSCORE_CHECKPOINT_CANDIDATE_STATE_BINDING_GENERATED_BEGIN
    or p_state ->> 'schemaVersion' is distinct from '2.0.0'
    or p_state ->> 'modelId'
      is distinct from 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3'
    or p_state ->> 'variantId'
      is distinct from 'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED'
    or p_state ->> 'profileId'
      is distinct from 'current-0.03-0.15-in10-out8-exhaust13-window48-boundary0-wave-build4-decay48'
    -- RAVSCORE_CHECKPOINT_CANDIDATE_STATE_BINDING_GENERATED_END
    or coalesce(p_state ->> 'stateKey', '') !~ '^sha256:[0-9a-f]{64}$'
    or not public.ravradar_ravscore_checkpoint_canonical_time(p_reference_text)
    or not public.ravradar_ravscore_checkpoint_canonical_time(p_state ->> 'time')
    or p_state ->> 'time' is distinct from p_reference_text
    or not public.ravradar_ravscore_checkpoint_canonical_time(
      p_state ->> 'transportReferenceAt'
    )
    or p_state ->> 'transportReferenceAt' is distinct from p_reference_text
    or jsonb_typeof(p_state -> 'transportPotential') is distinct from 'number'
    or (p_state ->> 'transportPotential')::numeric not between 0 and 100
    or jsonb_typeof(p_state -> 'outboundEpisodeEffectiveHours') is distinct from 'number'
    or (p_state ->> 'outboundEpisodeEffectiveHours')::numeric < 0
    or p_state -> 'transportMemoryReady' is distinct from 'true'::jsonb
    or p_state ->> 'transportMemoryStatus' is distinct from 'READY'
    or p_state -> 'transportMemoryWindowHours' is distinct from '48'::jsonb
    or p_state -> 'transportMemoryCoverageHours' is distinct from '48'::jsonb
    or jsonb_typeof(p_state -> 'mobilisationPotential') is distinct from 'number'
    or (p_state ->> 'mobilisationPotential')::numeric not between 0 and 100
    or jsonb_typeof(p_state -> 'transportEvidence') is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_state -> 'transportEvidence') not between 1 and 49
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_state -> 'transportEvidence') as evidence(value)
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
        or (jsonb_typeof(evidence.value -> 'strength') = 'number'
          and (evidence.value ->> 'strength')::numeric not between -1 and 1)
    )
    or public.ravradar_ravscore_checkpoint_has_forbidden_key(p_state)
  then
    return false;
  end if;

  if pg_catalog.jsonb_array_length(p_state -> 'transportEvidence') not between 2 and 49
    or exists (
      select 1
      from (
        select evidence.value,
          evidence.ordinality,
          pg_catalog.lag(evidence.value ->> 'time') over (
            order by evidence.ordinality
          ) as previous_time
        from pg_catalog.jsonb_array_elements(
          p_state -> 'transportEvidence'
        ) with ordinality as evidence(value, ordinality)
      ) as ordered
      where not public.ravradar_ravscore_checkpoint_canonical_time(
          ordered.value ->> 'time'
        )
        or jsonb_typeof(ordered.value -> 'strength') is distinct from 'number'
        or (ordered.value ->> 'strength')::numeric not between -1 and 1
        or (ordered.previous_time is not null and (
          (ordered.value ->> 'time')::timestamptz
            <= ordered.previous_time::timestamptz
          or extract(epoch from (
            (ordered.value ->> 'time')::timestamptz
              - ordered.previous_time::timestamptz
          )) / 3600 > 3
        ))
    )
    or p_state -> 'transportEvidence'
      -> (pg_catalog.jsonb_array_length(p_state -> 'transportEvidence') - 1)
      ->> 'time' is distinct from p_reference_text
  then
    return false;
  end if;

  v_reference := p_reference_text::timestamptz;
  v_boundary := v_reference - interval '48 hours';
  v_first_time := (
    p_state -> 'transportEvidence' -> 0 ->> 'time'
  )::timestamptz;
  v_second_time := (
    p_state -> 'transportEvidence' -> 1 ->> 'time'
  )::timestamptz;
  if v_first_time > v_boundary
    or (v_first_time < v_boundary and (
      pg_catalog.jsonb_array_length(p_state -> 'transportEvidence') < 3
      or v_first_time < v_boundary - interval '3 hours'
      or v_second_time < v_boundary
      or v_second_time - v_first_time > interval '3 hours'
    ))
  then
    return false;
  end if;
  return true;
exception
  when others then
    return false;
end;
$$;

create or replace function public.ravradar_ravscore_checkpoint_payload_valid(
  p_payload jsonb,
  p_target_reference timestamptz
)
returns boolean
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_companion jsonb;
  v_integrated_binding jsonb;
  v_candidate_binding jsonb;
  v_privacy constant jsonb := '{
    "compactDerivedStateOnly": true,
    "weatherIncluded": false,
    "scoresIncluded": false,
    "rawVectorsIncluded": false,
    "coordinatesIncluded": false,
    "privateDataIncluded": false
  }'::jsonb;
  v_reference_text text;
begin
  if p_target_reference is null
    or p_payload is null
    or jsonb_typeof(p_payload) is distinct from 'object'
    -- This is PostgreSQL's normalized JSONB-text size. The caller separately
    -- owns the exact compact JSON.stringify UTF-8 byte measurement.
    or pg_catalog.octet_length(pg_catalog.convert_to(p_payload::text, 'UTF8')) > 16777216
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(p_payload)) <> 12
    or exists (
      select 1
      from pg_catalog.jsonb_object_keys(p_payload) as allowed(key)
      where not (allowed.key = any (array[
        'schemaVersion','status','datasetId','productionReferenceAt','modelBinding',
        'continuationStateContractSha256','generationSha256','partCount',
        'stateSha256','states','candidateGRollbackCompanion','privacy'
      ]::text[]))
    )
    or p_payload -> 'schemaVersion' is distinct from '4'::jsonb
    or p_payload ->> 'status'
      is distinct from 'ravscore-schema6-with-candidate-g-rollback-companion'
    or jsonb_typeof(p_payload -> 'datasetId') is distinct from 'string'
    or jsonb_typeof(p_payload -> 'productionReferenceAt') is distinct from 'string'
    or jsonb_typeof(p_payload -> 'continuationStateContractSha256')
      is distinct from 'string'
    or jsonb_typeof(p_payload -> 'generationSha256') is distinct from 'string'
    or jsonb_typeof(p_payload -> 'stateSha256') is distinct from 'string'
    or coalesce(p_payload ->> 'datasetId', '') !~
      '^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
    -- RAVSCORE_CHECKPOINT_CONTINUATION_STATE_CONTRACT_GENERATED_BEGIN
    or p_payload ->> 'continuationStateContractSha256' is distinct from
      '35c45f8f1f701695923b3195d60a6b8931aad4d2d08b05c93900b88401eca95c'
    -- RAVSCORE_CHECKPOINT_CONTINUATION_STATE_CONTRACT_GENERATED_END
    or coalesce(p_payload ->> 'generationSha256', '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_payload ->> 'stateSha256', '') !~ '^[0-9a-f]{64}$'
    or p_payload -> 'privacy' is distinct from v_privacy
    or jsonb_typeof(p_payload -> 'modelBinding') is distinct from 'object'
    or jsonb_typeof(p_payload -> 'partCount') is distinct from 'number'
    or jsonb_typeof(p_payload -> 'states') is distinct from 'object'
    or public.ravradar_ravscore_checkpoint_has_forbidden_key(p_payload)
  then
    return false;
  end if;

  v_reference_text := p_payload ->> 'productionReferenceAt';
  if not public.ravradar_ravscore_checkpoint_canonical_time(v_reference_text)
    or v_reference_text::timestamptz is distinct from p_target_reference
    or p_payload -> 'partCount' is distinct from '673'::jsonb
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(
      p_payload -> 'states'
    )) <> 673
    or exists (
      select 1
      from pg_catalog.jsonb_each(p_payload -> 'states') as state(part_id, value)
      where state.part_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$'
        or pg_catalog.octet_length(pg_catalog.convert_to(state.part_id, 'UTF8')) > 100
        or not public.ravradar_ravscore_checkpoint_integrated_state_valid(
          state.value,
          v_reference_text
        )
    )
    or (select pg_catalog.count(distinct state.value ->> 'samplingContextKey')
        from pg_catalog.jsonb_each(p_payload -> 'states') as state(part_id, value)) <> 673
  then
    return false;
  end if;

  v_integrated_binding := p_payload -> 'modelBinding';
  -- RAVSCORE_CHECKPOINT_INTEGRATED_BINDING_GENERATED_BEGIN
  if v_integrated_binding is distinct from '{
    "modelId": "RRS-COASTAL-PROCESS-INTEGRATED-1.1.0",
    "stateSchemaVersion": "6.0.0",
    "variantId": "COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2",
    "profileId": "cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5",
    "componentSchemaId": "ravscore-components-huntability-delivery-mobilisation-bounds-v5",
    "explanationSchemaId": "ravscore-explanation-integrated-bounds-v5",
    "rankingPolicyId": "direction-broad-19-history-tie-v2",
    "bestTimePolicyId": "score-history-water-tie-earliest-v3",
    "presentationPolicyId": "score-bands-35-55-75-exceptional90-v1",
    "modelContractSha256": "a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b",
    "modelBundleSha256": "d5796289f645f1bcab6b4fe822c5ed6b0e919321013687302feb2139e814a286"
  }'::jsonb then
    return false;
  end if;
  -- RAVSCORE_CHECKPOINT_INTEGRATED_BINDING_GENERATED_END

  v_companion := p_payload -> 'candidateGRollbackCompanion';
  if jsonb_typeof(v_companion) is distinct from 'object'
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_companion)) <> 11
    or exists (
      select 1
      from pg_catalog.jsonb_object_keys(v_companion) as allowed(key)
      where not (allowed.key = any (array[
        'schemaVersion','status','datasetId','productionReferenceAt',
        'generationSha256','modelBinding','rollbackId','partCount',
        'stateSha256','states','privacy'
      ]::text[]))
    )
    or v_companion -> 'schemaVersion' is distinct from '1'::jsonb
    or v_companion ->> 'status' is distinct from 'candidate-g-rollback-ready-companion'
    or jsonb_typeof(v_companion -> 'datasetId') is distinct from 'string'
    or jsonb_typeof(v_companion -> 'productionReferenceAt') is distinct from 'string'
    or not public.ravradar_ravscore_checkpoint_canonical_time(
      v_companion ->> 'productionReferenceAt'
    )
    or jsonb_typeof(v_companion -> 'generationSha256') is distinct from 'string'
    or jsonb_typeof(v_companion -> 'stateSha256') is distinct from 'string'
    or jsonb_typeof(v_companion -> 'rollbackId') is distinct from 'string'
    or v_companion ->> 'datasetId' is distinct from p_payload ->> 'datasetId'
    or v_companion ->> 'productionReferenceAt' is distinct from v_reference_text
    or v_companion ->> 'generationSha256'
      is distinct from p_payload ->> 'generationSha256'
    or v_companion ->> 'rollbackId'
      is distinct from 'integrated-schema6-to-candidate-g-schema2-v3'
    or coalesce(v_companion ->> 'stateSha256', '') !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(v_companion -> 'partCount') is distinct from 'number'
    or v_companion -> 'partCount' is distinct from '673'::jsonb
    or v_companion -> 'privacy' is distinct from v_privacy
    or jsonb_typeof(v_companion -> 'modelBinding') is distinct from 'object'
    or jsonb_typeof(v_companion -> 'states') is distinct from 'object'
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(
      v_companion -> 'states'
    )) <> 673
    or exists (
      select 1
      from pg_catalog.jsonb_each(v_companion -> 'states') as state(part_id, value)
      where state.part_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$'
        or pg_catalog.octet_length(pg_catalog.convert_to(state.part_id, 'UTF8')) > 100
        or not public.ravradar_ravscore_checkpoint_candidate_state_valid(
          state.value,
          v_reference_text
        )
    )
    or (select pg_catalog.count(distinct state.value ->> 'stateKey')
        from pg_catalog.jsonb_each(v_companion -> 'states') as state(part_id, value)) <> 673
    or exists (
      (select key from pg_catalog.jsonb_object_keys(p_payload -> 'states') as x(key)
       except
       select key from pg_catalog.jsonb_object_keys(v_companion -> 'states') as y(key))
      union all
      (select key from pg_catalog.jsonb_object_keys(v_companion -> 'states') as x(key)
       except
       select key from pg_catalog.jsonb_object_keys(p_payload -> 'states') as y(key))
    )
  then
    return false;
  end if;

  v_candidate_binding := v_companion -> 'modelBinding';
  -- RAVSCORE_CHECKPOINT_CANDIDATE_G_ROLLBACK_BINDING_GENERATED_BEGIN
  if v_candidate_binding is distinct from '{
    "modelId": "RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3",
    "stateSchemaVersion": "2.0.0",
    "variantId": "G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED",
    "profileId": "current-0.03-0.15-in10-out8-exhaust13-window48-boundary0-wave-build4-decay48",
    "componentSchemaId": "ravscore-components-huntability-transport-mobilisation-candidate-g-v1",
    "explanationSchemaId": "ravscore-explanation-candidate-g-v3",
    "rankingPolicyId": "direction-broad-19-v1",
    "bestTimePolicyId": "score-water-tie-earliest-v2",
    "presentationPolicyId": "score-bands-35-55-75-exceptional90-v1",
    "modelContractSha256": "c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8",
    "modelBundleSha256": "7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d"
  }'::jsonb then
    return false;
  end if;
  -- RAVSCORE_CHECKPOINT_CANDIDATE_G_ROLLBACK_BINDING_GENERATED_END

  return true;
exception
  when others then
    return false;
end;
$$;

-- One exact 4.0.320 predecessor may already have been written by production
-- head 7198b685f4bc9d86bd6432b049380f4279ab797c while this migration is
-- deployed. Validate it by projecting only its continuation hash through the
-- current full payload validator. This is a migration bridge, not a fallback.
create or replace function public.ravradar_ravscore_checkpoint_predecessor_payload_valid(
  p_payload jsonb,
  p_target_reference timestamptz,
  p_current_implementation_sha256 text
)
returns boolean
language plpgsql
stable
set search_path = pg_catalog, public
as $$
begin
  if p_payload is null
    or p_target_reference is null
    or p_current_implementation_sha256 is null
    or p_payload ->> 'continuationStateContractSha256' is distinct from
      '082a5187f569518c0474590e924ccd17fce760d494a1da4a593de551e440cf91'
  then
    return false;
  end if;
  return public.ravradar_ravscore_checkpoint_payload_valid(
    pg_catalog.jsonb_set(
      p_payload,
      '{continuationStateContractSha256}',
      pg_catalog.to_jsonb(p_current_implementation_sha256),
      false
    ),
    p_target_reference
  );
exception
  when others then
    return false;
end;
$$;

create or replace function public.ravradar_ravscore_checkpoint_cas(
  p_expected_version bigint,
  p_target_reference timestamptz,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_key constant text := 'ravscore-continuation-checkpoint';
  v_version bigint;
  v_payload jsonb;
  v_central_reference timestamptz;
  v_central_is_compatible_predecessor boolean := false;
  v_exact_predecessor_same_target_transition boolean := false;
  v_disposition text;
  v_result jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_expected_version is null
    or p_expected_version < 0
    or not public.ravradar_ravscore_checkpoint_payload_valid(
      p_payload,
      p_target_reference
    )
  then
    raise exception 'invalid protected RavScore checkpoint CAS input'
      using errcode = '22023';
  end if;

  select version, payload into v_version, v_payload
  from public.admin_documents
  where document_key = v_key
  for update;

  if not found then
    if p_expected_version <> 0 then
      raise exception 'protected RavScore checkpoint CAS version mismatch'
        using errcode = '40001';
    end if;
    insert into public.admin_documents(document_key, payload, updated_by)
    values(v_key, p_payload, null)
    on conflict (document_key) do nothing
    returning version, payload into v_version, v_payload;
    if found then
      v_disposition := 'inserted';
    else
      select version, payload into strict v_version, v_payload
      from public.admin_documents
      where document_key = v_key
      for update;
    end if;
  end if;

  if v_disposition is null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      v_payload ->> 'productionReferenceAt'
    ) then
      raise exception 'protected RavScore checkpoint central row is invalid'
        using errcode = '22023';
    end if;
    v_central_reference := (v_payload ->> 'productionReferenceAt')::timestamptz;
    if public.ravradar_ravscore_checkpoint_payload_valid(
      v_payload,
      v_central_reference
    ) then
      v_central_is_compatible_predecessor := false;
    elsif public.ravradar_ravscore_checkpoint_predecessor_payload_valid(
      v_payload,
      v_central_reference,
      p_payload ->> 'continuationStateContractSha256'
    ) then
      v_central_is_compatible_predecessor := true;
    else
      raise exception 'protected RavScore checkpoint central row is invalid'
        using errcode = '22023';
    end if;
    v_exact_predecessor_same_target_transition :=
      v_central_is_compatible_predecessor
      and v_central_reference = p_target_reference
      and (
        v_payload
          #- '{continuationStateContractSha256}'
          #- '{generationSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}'
      ) = (
        p_payload
          #- '{continuationStateContractSha256}'
          #- '{generationSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}'
      );
    -- Equality is checked before the expected version. This makes a retry
    -- idempotent when the first HTTP response was lost after a committed write.
    if v_payload = p_payload then
      v_disposition := 'unchanged';
    elsif v_central_reference > p_target_reference then
      raise exception 'protected RavScore checkpoint would regress central state'
        using errcode = '22023';
    elsif v_central_reference = p_target_reference
      and not v_exact_predecessor_same_target_transition
    then
      raise exception 'protected RavScore checkpoint conflicts at the same reference'
        using errcode = '23505';
    elsif v_version is distinct from p_expected_version then
      raise exception 'protected RavScore checkpoint CAS version mismatch'
        using errcode = '40001';
    else
      update public.admin_documents
      set payload = p_payload, updated_by = null
      where document_key = v_key and version = p_expected_version
      returning version, payload into v_version, v_payload;
      if not found
        or v_version <> p_expected_version + 1
        or v_payload is distinct from p_payload
      then
        raise exception 'protected RavScore checkpoint CAS update lost'
          using errcode = '40001';
      end if;
      v_disposition := 'updated';
    end if;
  end if;

  v_result := pg_catalog.jsonb_build_object(
    'schemaVersion', '1.0.0',
    'documentKey', v_key,
    'disposition', v_disposition,
    'centralVersion', v_version,
    'productionReferenceAt', p_payload ->> 'productionReferenceAt',
    'partCount', (p_payload ->> 'partCount')::integer,
    'candidatePartCount',
      (p_payload -> 'candidateGRollbackCompanion' ->> 'partCount')::integer,
    'modelId', p_payload -> 'modelBinding' ->> 'modelId',
    'stateSchemaVersion', p_payload -> 'modelBinding' ->> 'stateSchemaVersion',
    'modelContractSha256',
      p_payload -> 'modelBinding' ->> 'modelContractSha256',
    'modelBundleSha256',
      p_payload -> 'modelBinding' ->> 'modelBundleSha256',
    'generationSha256', p_payload ->> 'generationSha256'
  );
  if pg_catalog.octet_length(pg_catalog.convert_to(v_result::text, 'UTF8')) > 4096 then
    raise exception 'protected RavScore checkpoint CAS metadata exceeds response bound'
      using errcode = '54000';
  end if;
  return v_result;
end;
$$;

-- A separate service-role metadata RPC attests the additive checkpoint contract.
-- Keeping it separate preserves the already verified trip/observation readback
-- and avoids replacing unrelated backend logic for a checkpoint-only change.
create or replace function public.ravradar_ravscore_checkpoint_contract()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_canonical_time_definition text;
  v_forbidden_definition text;
  v_integrated_state_definition text;
  v_candidate_state_definition text;
  v_payload_definition text;
  v_predecessor_payload_definition text;
  v_cas_definition text;
  v_history_definition text;
  v_checkpoint_definition text;
  v_canonical_time_oid oid := pg_catalog.to_regprocedure(
    'public.ravradar_ravscore_checkpoint_canonical_time(text)'
  );
  v_cas_oid oid := pg_catalog.to_regprocedure(
    'public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)'
  );
  v_history_oid oid := pg_catalog.to_regprocedure(
    'public.version_admin_document()'
  );
  v_validator_oids oid[] := array[
    pg_catalog.to_regprocedure(
      'public.ravradar_ravscore_checkpoint_has_forbidden_key(jsonb)'
    ),
    pg_catalog.to_regprocedure(
      'public.ravradar_ravscore_checkpoint_integrated_state_valid(jsonb,text)'
    ),
    pg_catalog.to_regprocedure(
      'public.ravradar_ravscore_checkpoint_candidate_state_valid(jsonb,text)'
    ),
    pg_catalog.to_regprocedure(
      'public.ravradar_ravscore_checkpoint_payload_valid(jsonb,timestamptz)'
    ),
    pg_catalog.to_regprocedure(
      'public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)'
    )
  ];
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select pg_catalog.btrim(p.prosrc, E' \n\r\t')
  into v_canonical_time_definition
  from pg_catalog.pg_proc p
  where p.oid = v_canonical_time_oid;
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_forbidden_definition
  from pg_catalog.pg_proc p
  where p.oid = v_validator_oids[1];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_integrated_state_definition
  from pg_catalog.pg_proc p
  where p.oid = v_validator_oids[2];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_candidate_state_definition
  from pg_catalog.pg_proc p
  where p.oid = v_validator_oids[3];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_payload_definition
  from pg_catalog.pg_proc p
  where p.oid = v_validator_oids[4];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_predecessor_payload_definition
  from pg_catalog.pg_proc p
  where p.oid = v_validator_oids[5];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_cas_definition
  from pg_catalog.pg_proc p
  where p.oid = v_cas_oid;
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_history_definition
  from pg_catalog.pg_proc p
  where p.oid = v_history_oid;

  v_checkpoint_definition := v_canonical_time_definition
    || E'\n-- forbidden-key-validator --\n' || v_forbidden_definition
    || E'\n-- integrated-state-validator --\n' || v_integrated_state_definition
    || E'\n-- candidate-state-validator --\n' || v_candidate_state_definition
    || E'\n-- payload-validator --\n' || v_payload_definition
    || E'\n-- predecessor-payload-validator --\n' || v_predecessor_payload_definition
    || E'\n-- cas-function --\n' || v_cas_definition
    || E'\n-- checkpoint-history-exclusion --\n' || v_history_definition;

  return pg_catalog.jsonb_build_object(
    'schemaVersion', 'ravscore-checkpoint-db-v1',
    'appliedMigrationVersion', case when exists (
      select 1
      from supabase_migrations.schema_migrations m
      where m.version::text = '20260903010000'
    ) then '20260903010000' else null end,
    'checkpointContract', pg_catalog.jsonb_build_object(
      'id', 'ravscore-checkpoint-metadata-cas-v1',
      'definition', v_checkpoint_definition
    ),
    'checks', pg_catalog.jsonb_build_object(
      'checkpointContractDefinitionPresent', v_checkpoint_definition is not null,
      'checkpointCanonicalTimeHelperStableSecurityInvoker', coalesce((
        select p.provolatile = 's'
          and not p.prosecdef
        from pg_catalog.pg_proc p
        where p.oid = v_canonical_time_oid
      ), false),
      'checkpointHistoryExclusionInstalled',
        v_history_oid is not null
        and coalesce((
          select p.prosecdef
            and coalesce(
              'search_path=pg_catalog, public' = any (p.proconfig),
              false
            )
            and pg_catalog.strpos(
              p.prosrc,
              '''ravscore-continuation-checkpoint'''
            ) > 0
          from pg_catalog.pg_proc p
          where p.oid = v_history_oid
        ), false)
        and exists (
          select 1
          from pg_catalog.pg_trigger t
          where t.tgrelid = 'public.admin_documents'::regclass
            and not t.tgisinternal
            and t.tgenabled in ('O', 'A')
            and t.tgtype = 19
            and t.tgfoid = v_history_oid
        ),
      'checkpointDirectPayloadReadRestricted', (
        select pg_catalog.count(*)
        from pg_catalog.pg_policy policy
        join pg_catalog.pg_class relation on relation.oid = policy.polrelid
        join pg_catalog.pg_namespace namespace
          on namespace.oid = relation.relnamespace
        where namespace.nspname = 'public'
          and (
            (relation.relname = 'admin_documents'
              and policy.polname = 'ravradar_ravscore_checkpoint_no_direct_read')
            or (relation.relname = 'admin_document_versions'
              and policy.polname =
                'ravradar_ravscore_checkpoint_versions_no_direct_read')
          )
          and relation.relrowsecurity
          and policy.polpermissive = false
          and policy.polcmd = 'r'
          and policy.polroles = array[(
            select role.oid
            from pg_catalog.pg_roles role
            where role.rolname = 'authenticated'
          )]::oid[]
          and pg_catalog.regexp_replace(
            pg_catalog.pg_get_expr(policy.polqual, policy.polrelid),
            '[[:space:]]+',
            '',
            'g'
          ) = '(document_key<>''ravscore-continuation-checkpoint''::text)'
      ) = 2,
      'checkpointCasSecurityDefiner', coalesce((
        select p.prosecdef from pg_catalog.pg_proc p where p.oid = v_cas_oid
      ), false),
      'checkpointCasServiceRoleExecutable', coalesce(
        pg_catalog.has_function_privilege('service_role', v_cas_oid, 'EXECUTE'),
        false
      ),
      'checkpointCasAnonymousExecutionRejected',
        not coalesce(pg_catalog.has_function_privilege('anon', v_cas_oid, 'EXECUTE'), true)
        and not coalesce(
          pg_catalog.has_function_privilege('authenticated', v_cas_oid, 'EXECUTE'),
          true
        ),
      'checkpointValidatorExecutionRestricted', not exists (
        select 1
        from pg_catalog.unnest(
          pg_catalog.array_prepend(v_canonical_time_oid, v_validator_oids)
        ) as validator(oid)
        where validator.oid is null
          or coalesce(pg_catalog.has_function_privilege('anon', validator.oid, 'EXECUTE'), true)
          or coalesce(
            pg_catalog.has_function_privilege('authenticated', validator.oid, 'EXECUTE'),
            true
          )
      ),
      'checkpointFunctionsSearchPathLocked', not exists (
        select 1
        from pg_catalog.pg_proc p
        where p.oid = any (
          pg_catalog.array_cat(
            array[v_canonical_time_oid, v_history_oid]::oid[],
            pg_catalog.array_append(v_validator_oids, v_cas_oid)
          )
        )
          and not coalesce(
            'search_path=pg_catalog, public' = any (p.proconfig),
            false
          )
      ) and v_cas_oid is not null
        and v_canonical_time_oid is not null
        and v_history_oid is not null
        and pg_catalog.array_position(v_validator_oids, null) is null
    )
  );
end;
$$;

revoke all on function public.ravradar_ravscore_checkpoint_contract()
  from public, anon, authenticated;
grant execute on function public.ravradar_ravscore_checkpoint_contract()
  to service_role;

comment on function public.ravradar_ravscore_checkpoint_contract()
is 'Service-role-only metadata readback for the exact protected RavScore checkpoint implementation and ACLs; reads no checkpoint payload rows.';
revoke all on function public.ravradar_ravscore_checkpoint_canonical_time(text)
  from public, anon, authenticated;
revoke all on function public.ravradar_ravscore_checkpoint_has_forbidden_key(jsonb)
  from public, anon, authenticated;
revoke all on function public.ravradar_ravscore_checkpoint_integrated_state_valid(jsonb,text)
  from public, anon, authenticated;
revoke all on function public.ravradar_ravscore_checkpoint_candidate_state_valid(jsonb,text)
  from public, anon, authenticated;
revoke all on function public.ravradar_ravscore_checkpoint_payload_valid(jsonb,timestamptz)
  from public, anon, authenticated;
revoke all on function public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)
  from public, anon, authenticated;
revoke all on function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)
  from public, anon, authenticated;
grant execute on function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)
  to service_role;

comment on function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)
is 'Service-role-only fixed-key RavScore checkpoint CAS. It returns bounded metadata, never the checkpoint payload.';
comment on function public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)
is 'Internal exact transition validator for the 4.0.320 continuation hash from source head 7198b685f4bc9d86bd6432b049380f4279ab797c; it is not a general fallback.';
-- RAVSCORE_CHECKPOINT_METADATA_CAS_GENERATED_END

notify pgrst, 'reload schema';
commit;
