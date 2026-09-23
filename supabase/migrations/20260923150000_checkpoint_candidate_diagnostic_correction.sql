-- Append-only correction of a read-only Candidate G diagnostic, not the CAS validator.

-- The historical function returned boolean text instead of a fixed reason code.

begin;

set local lock_timeout = '5s';

create or replace function public.ravradar_ravscore_checkpoint_candidate_state_reason(
  p_state jsonb,
  p_reference_text text
)
returns text
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_reference timestamptz;
  v_boundary timestamptz;
  v_first_time timestamptz;
  v_second_time timestamptz;
  v_item jsonb;
  v_time timestamptz;
  v_previous timestamptz;
  v_suffix_start timestamptz;
  v_contains_missing boolean := false;
  v_gap boolean := false;
  v_status text;
  v_coverage numeric;
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
    or (p_state ->> 'transportReferenceAt')::timestamptz > p_reference_text::timestamptz
    or p_reference_text::timestamptz - (p_state ->> 'transportReferenceAt')::timestamptz > interval '3 hours'
    or jsonb_typeof(p_state -> 'transportPotential') is distinct from 'number'
    or (p_state ->> 'transportPotential')::numeric not between 0 and 100
    or jsonb_typeof(p_state -> 'outboundEpisodeEffectiveHours') is distinct from 'number'
    or (p_state ->> 'outboundEpisodeEffectiveHours')::numeric < 0
    or jsonb_typeof(p_state -> 'transportMemoryReady') is distinct from 'boolean'
    or p_state -> 'transportMemoryWindowHours' is distinct from '48'::jsonb
    or jsonb_typeof(p_state -> 'transportMemoryCoverageHours') is distinct from 'number'
    or (p_state ->> 'transportMemoryCoverageHours')::numeric not between 0 and 48
    or (p_state -> 'transportMemoryReady' = 'true'::jsonb and (
      p_state ->> 'transportMemoryStatus' is distinct from 'READY'
      or p_state -> 'transportMemoryCoverageHours' is distinct from '48'::jsonb
    ))
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
    return 'C01'; /* source line 1302 */
  end if;

  -- Non-READY progress is private measured continuation, never rollback READY.
  -- Derive its status/coverage from the ordered, bounded evidence, not labels.
  if p_state -> 'transportMemoryReady' = 'false'::jsonb then
    v_reference := (p_state ->> 'transportReferenceAt')::timestamptz;
    v_boundary := v_reference - interval '48 hours';
    for v_item in select value from pg_catalog.jsonb_array_elements(p_state -> 'transportEvidence') loop
      if not public.ravradar_ravscore_checkpoint_canonical_time(v_item ->> 'time') then
        return 'C02'; /* source line 1312 */
      end if;
      v_time := (v_item ->> 'time')::timestamptz;
      if v_time < v_boundary or v_time > v_reference
        or (v_previous is not null and v_time <= v_previous) then
        return 'C03'; /* source line 1317 */
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
    v_coverage := case when v_previous is distinct from v_reference
      or v_suffix_start is null then 0
      else extract(epoch from (v_reference - v_suffix_start)) / 3600 end;
    v_status := case
      when v_previous is distinct from v_reference then 'LATEST_SAMPLE_MISSING'
      when v_contains_missing then 'WINDOW_HAS_MISSING_EVIDENCE'
      when v_first_time > v_boundary then 'WINDOW_INCOMPLETE'
      when v_gap then 'WINDOW_HAS_TIME_GAP'
      else 'READY' end;
    if (v_status <> 'READY'
      and p_state ->> 'transportMemoryStatus' = v_status) is distinct from true
    then
      return 'C07'; -- Non-READY status does not match the bounded evidence.
    end if;
    if (abs((p_state ->> 'transportMemoryCoverageHours')::numeric - v_coverage)
      <= 0.000000001) is distinct from true
    then
      return 'C08'; -- Non-READY coverage does not match the bounded evidence.
    end if;
    return null;
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
      ->> 'time' is distinct from p_state ->> 'transportReferenceAt'
  then
    return 'C04'; /* source line 1377 */
  end if;

  v_reference := (p_state ->> 'transportReferenceAt')::timestamptz;
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
    return 'C05'; /* source line 1396 */
  end if;
  return null;
exception
  when others then
    return 'C06'; /* source line 1401 */
end;
$$;

revoke all on function public.ravradar_ravscore_checkpoint_candidate_state_reason(jsonb,text)

  from public, anon, authenticated;

comment on function public.ravradar_ravscore_checkpoint_candidate_state_reason(jsonb,text)

is 'Service-role-only fixed reason codes for the unchanged Candidate G state validator.';

notify pgrst, 'reload schema';

commit;
