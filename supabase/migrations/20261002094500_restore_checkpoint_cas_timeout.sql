-- Restore DEC-0249's established function-local 55-second bound after the
-- applied Top20 binding successor accidentally reasserted its old 30s setting.
-- This does not raise the prior bound or change any payload/state/CAS validator.
-- The applied Top20 migration stays immutable; no checkpoint rows are rewritten.
begin;
set local lock_timeout = '5s';

alter function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)
  set statement_timeout = '55s';

-- Read back the actual pg_proc setting, in the existing service-role-only
-- metadata RPC. Preserve every previous definition and ACL check.
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
  v_top20_projection_definition text;
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
    ),
    pg_catalog.to_regprocedure(
      'public.ravradar_ravscore_checkpoint_top20_predecessor_projection(jsonb,timestamptz)'
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

  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_top20_projection_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[6];

  v_checkpoint_definition := v_canonical_time_definition
    || E'\n-- forbidden-key-validator --\n' || v_forbidden_definition
    || E'\n-- integrated-state-validator --\n' || v_integrated_state_definition
    || E'\n-- candidate-state-validator --\n' || v_candidate_state_definition
    || E'\n-- payload-validator --\n' || v_payload_definition
    || E'\n-- predecessor-payload-validator --\n' || v_predecessor_payload_definition
    || E'\n-- cas-function --\n' || v_cas_definition
    || E'\n-- checkpoint-history-exclusion --\n' || v_history_definition
    || E'\n-- top20-predecessor-projection --\n' || v_top20_projection_definition;

  return pg_catalog.jsonb_build_object(
    'schemaVersion', 'ravscore-checkpoint-db-v1',
    'appliedMigrationVersion', case when exists (
      select 1
      from supabase_migrations.schema_migrations m
      where m.version::text = '20261002094500'
    ) then '20260920220000' else null end,
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
      'checkpointCasStatementTimeout55Seconds', coalesce((
        select 'statement_timeout=55s' = any (p.proconfig)
        from pg_catalog.pg_proc p where p.oid = v_cas_oid
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

notify pgrst, 'reload schema';
commit;
