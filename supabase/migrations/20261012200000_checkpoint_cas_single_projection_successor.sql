-- Append-only CAS implementation successor; no model/score/storage rebinding.
-- The issued 20261010130000 migration and all validators/projections stay immutable.
-- A non-null selected predecessor projection is reused only after its existing
-- complete validation; same-reference comparison, version CAS and ACL stay strict.
begin;
set local lock_timeout = '5s';

do $checkpoint_cas_before$
declare
  v_definition text;
begin
  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where version::text = '20261010130000'
  ) then
    raise exception 'checkpoint CAS successor requires installed userdata predecessor';
  end if;
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_definition
  from pg_catalog.pg_proc p
  where p.oid = pg_catalog.to_regprocedure(
    'public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)');
  if pg_catalog.encode(extensions.digest(
    pg_catalog.convert_to(v_definition, 'UTF8'), 'sha256'), 'hex')
    is distinct from 'd40ebe0253f5bcc1942e5d25b701a5342ff6685856162ee06ca76ace51ff624c'
  then
    raise exception 'checkpoint CAS predecessor definition differs';
  end if;
end;
$checkpoint_cas_before$;

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
  v_top20_predecessor_payload jsonb;
  v_cp_close_predecessor_payload jsonb;
  v_owner_current_predecessor_payload jsonb;
  v_water_level_predecessor_payload jsonb;
  v_userdata_predecessor_payload jsonb;
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
    -- These five immutable predecessor projections have disjoint exact
    -- top-level model hashes. Each non-null result has already passed the
    -- unchanged FULL current payload validator. Keep that result for equality;
    -- do not validate/copy it again through the predecessor boolean wrapper.
    if p_payload ->> 'continuationStateContractSha256' =
      'a5430dd21e3135d6efc09e22df3dd0cdcafee723f962ff1d3cb52e7765b2aaa0'
    then
      case v_payload #>> '{modelBinding,modelBundleSha256}'
        when 'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb' then
          v_userdata_predecessor_payload :=
            public.ravradar_ravscore_checkpoint_userdata_predecessor_projection(v_payload, v_central_reference);
        when '4ebe158f68954f32b47cb71d5222ab0cf676faaf4b323d743f9d43bf34a63a51' then
          v_water_level_predecessor_payload :=
            public.ravradar_ravscore_checkpoint_water_level_predecessor_projection(v_payload, v_central_reference);
        when '29ea9a19647bf7d5edad0eee159267086d546f0d90a9f2778a77077351aad948' then
          v_owner_current_predecessor_payload :=
            public.ravradar_ravscore_checkpoint_owner_current_predecessor_projection(v_payload, v_central_reference);
        when '3a14f458122f5bc0ea8a60c07abbcbd68d022c0322a87e77242891f21631c852' then
          v_cp_close_predecessor_payload :=
            public.ravradar_ravscore_checkpoint_cp_close_predecessor_projection(v_payload, v_central_reference);
        when 'c557f91a520ae64211f9441f25fc72a9c230691cdb7b48551ecb7286463420eb' then
          v_top20_predecessor_payload :=
            public.ravradar_ravscore_checkpoint_top20_predecessor_projection(v_payload, v_central_reference);
        else null;
      end case;
    end if;
    if v_userdata_predecessor_payload is not null
      or v_water_level_predecessor_payload is not null
      or v_owner_current_predecessor_payload is not null
      or v_cp_close_predecessor_payload is not null
      or v_top20_predecessor_payload is not null
    then
      v_central_is_compatible_predecessor := true;
    elsif public.ravradar_ravscore_checkpoint_payload_valid(
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
    if v_central_is_compatible_predecessor and v_userdata_predecessor_payload is not null then
      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference
        and (v_userdata_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}')
        = (p_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}');
    elsif v_central_is_compatible_predecessor and v_water_level_predecessor_payload is not null then
      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference
        and (v_water_level_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}')
        = (p_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}');
    elsif v_central_is_compatible_predecessor and v_owner_current_predecessor_payload is not null then
      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference
        and (v_owner_current_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}')
        = (p_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}');
    elsif v_central_is_compatible_predecessor and v_cp_close_predecessor_payload is not null then
      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference
        and (v_cp_close_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}')
        = (p_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}');
    elsif v_central_is_compatible_predecessor and v_top20_predecessor_payload is not null then
      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference
        and (v_top20_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}')
        = (p_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}');
    else
    v_exact_predecessor_same_target_transition :=
      v_central_is_compatible_predecessor
      and v_central_reference = p_target_reference
      and (
        v_payload
          #- '{schemaVersion}'
          #- '{status}'
          #- '{candidateGRollbackCompanion,schemaVersion}'
          #- '{candidateGRollbackCompanion,status}'
          #- '{continuationStateContractSha256}'
          #- '{generationSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}'
      ) = (
        p_payload
          #- '{schemaVersion}'
          #- '{status}'
          #- '{candidateGRollbackCompanion,schemaVersion}'
          #- '{candidateGRollbackCompanion,status}'
          #- '{continuationStateContractSha256}'
          #- '{generationSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}'
      );
    end if;
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

revoke all on function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)
  from public, anon, authenticated;
grant execute on function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)
  to service_role;
alter function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)
  set statement_timeout = '55s';
comment on function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)
is 'Service-role-only fixed-key RavScore checkpoint CAS. It returns bounded metadata, never the checkpoint payload.';
notify pgrst, 'reload schema';
commit;
