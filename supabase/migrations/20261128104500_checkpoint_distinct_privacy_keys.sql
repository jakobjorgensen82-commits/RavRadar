-- Check each distinct JSON key with the existing privacy normalization.
begin;
set local lock_timeout = '5s';

do $checkpoint_distinct_privacy_before$
begin
  if not exists (
    select 1 from supabase_migrations.schema_migrations where version::text = '20261126152500'
  ) then
    raise exception 'CHECKPOINT_DISTINCT_PRIVACY_REQUIRES_INSTALLED_SCALAR_WALK';
  end if;
  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='i'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='2aff2a4bf3ac0b29eeffeccdd96dfaaf1e1597c28adf257c1b74fee0b1d04258'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_has_forbidden_key(jsonb)')),false)
    then raise exception 'CHECKPOINT_DISTINCT_PRIVACY_BODY_OR_PROPERTIES_MISMATCH'; end if;
end;
$checkpoint_distinct_privacy_before$;

create or replace function public.ravradar_ravscore_checkpoint_has_forbidden_key(
  p_value jsonb
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
begin
  return exists (
    select 1
    from (
      select distinct member #>> '{}' as key
      from pg_catalog.jsonb_path_query(p_value, 'strict $.** ? (@.type() == "object").keyvalue().key') as items(member)
    ) as members
    where pg_catalog.regexp_replace(pg_catalog.lower(members.key), '[^a-z0-9]', '', 'g')
      = any (array[
        'u','v','rawu','rawv','umps','vmps','currentu','currentv',
        'currentumps','currentvmps','eastwardcurrentmps','northwardcurrentmps',
        'waterpoint','landpoint','coordinate','coordinates','lat','latitude',
        'lon','lng','longitude','weather','forecast','payload','score','scores'
      ]::text[])
  );
end;
$$;

do $checkpoint_distinct_privacy_after$
begin
  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='i'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='3aa7a798dbcd93b9b689920ed023288f3905c8502c725e03de0a692ac629f60d'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_has_forbidden_key(jsonb)')),false)
    then raise exception 'CHECKPOINT_DISTINCT_PRIVACY_BODY_OR_PROPERTIES_MISMATCH'; end if;
end;
$checkpoint_distinct_privacy_after$;

commit;
