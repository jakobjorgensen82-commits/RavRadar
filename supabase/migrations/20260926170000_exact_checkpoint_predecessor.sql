begin;
set local lock_timeout = '5s';

-- The protected 2026-09-24 15Z row was accepted under the former schema-5
-- continuation contract. The 2026-09-25 model binding changed that contract,
-- but its predecessor validator retained only the much older schema-4 bridge.
-- Admit the one already-published row by its complete PostgreSQL jsonb SHA-256,
-- not an arbitrary schema-5 row or a relaxed current payload validator.
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
  if p_payload is not null
    and p_target_reference = '2026-09-24T15:00:00.000Z'::timestamptz
    and p_current_implementation_sha256 =
      '46683362ec6b69835695db375f7de976a8dd0a75b7367a27e2854b653d73e0ab'
    and p_payload -> 'schemaVersion' = '5'::jsonb
    and p_payload ->> 'status' =
      'ravscore-schema6-with-measured-candidate-g-continuation'
    and p_payload ->> 'datasetId' = 'rr-20260924163002-210'
    and p_payload ->> 'productionReferenceAt' = '2026-09-24T15:00:00.000Z'
    and p_payload ->> 'continuationStateContractSha256' =
      'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587'
    and pg_catalog.encode(
      extensions.digest(p_payload::text::bytea, 'sha256'), 'hex'
    ) = '5ba4d8944a3e791a7fc918fe5027c5b3157b3cc74e6cd5f99c0fb54dca5208c9'
  then
    return true;
  end if;

  -- Preserve the existing exact schema-4 migration bridge unchanged.
  if p_payload is null
    or p_target_reference is null
    or p_current_implementation_sha256 is null
    or p_payload ->> 'continuationStateContractSha256' not in (
      '082a5187f569518c0474590e924ccd17fce760d494a1da4a593de551e440cf91',
      '91251f6b38835040250cd5283d2b701aab38bb23f2a4a0014baa1128d59c78f4'
    )
    or p_payload -> 'schemaVersion' is distinct from '4'::jsonb
    or p_payload ->> 'status' is distinct from
      'ravscore-schema6-with-candidate-g-rollback-companion'
    or p_payload #> '{candidateGRollbackCompanion,schemaVersion}'
      is distinct from '1'::jsonb
    or p_payload #>> '{candidateGRollbackCompanion,status}'
      is distinct from 'candidate-g-rollback-ready-companion'
    or exists (
      select 1
      from pg_catalog.jsonb_each(
        p_payload #> '{candidateGRollbackCompanion,states}'
      ) as state(part_id,value)
      where state.value -> 'transportMemoryReady' is distinct from 'true'::jsonb
        or state.value ->> 'transportReferenceAt'
          is distinct from p_payload ->> 'productionReferenceAt'
    )
  then
    return false;
  end if;
  return public.ravradar_ravscore_checkpoint_payload_valid(
    pg_catalog.jsonb_set(
      pg_catalog.jsonb_set(pg_catalog.jsonb_set(pg_catalog.jsonb_set(pg_catalog.jsonb_set(
        p_payload, '{schemaVersion}', '5'::jsonb, false),
        '{status}', '"ravscore-schema6-with-measured-candidate-g-continuation"'::jsonb, false),
        '{candidateGRollbackCompanion,schemaVersion}', '2'::jsonb, false),
        '{candidateGRollbackCompanion,status}', '"candidate-g-measured-continuation-companion"'::jsonb, false),
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

revoke all on function public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)
  from public, anon, authenticated;

comment on function public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)
  is 'One exact, SHA-256-bound 2026-09-24 schema-5 predecessor plus the unchanged schema-4 bridge; no general legacy admission.';

notify pgrst, 'reload schema';
commit;
