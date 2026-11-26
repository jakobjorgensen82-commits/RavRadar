-- Keeps the issued checkpoint's forbidden names and normalization.
-- Recurse only when a JSON value can contain keys or child values.
begin;
set local lock_timeout = '5s';

do $checkpoint_scalar_walk_before$
begin
  if not exists (
    select 1 from supabase_migrations.schema_migrations where version::text = '20261125045214'
  ) then
    raise exception 'CHECKPOINT_SCALAR_WALK_REQUIRES_APPLIED_603';
  end if;
  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='i'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='7efd040c084a2d99c6ceb1b12d431374196ec151a86950a3b9ba5e7ea0d1c4d7'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_has_forbidden_key(jsonb)')),false)
    then raise exception 'CHECKPOINT_SCALAR_WALK_BODY_OR_PROPERTIES_MISMATCH'; end if;
end;
$checkpoint_scalar_walk_before$;

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
      if jsonb_typeof(v_child) in ('object','array') then
        if public.ravradar_ravscore_checkpoint_has_forbidden_key(v_child) then
          return true;
        end if;
      end if;
    end loop;
  elsif jsonb_typeof(p_value) = 'array' then
    for v_child in select value from pg_catalog.jsonb_array_elements(p_value)
    loop
      if jsonb_typeof(v_child) in ('object','array') then
        if public.ravradar_ravscore_checkpoint_has_forbidden_key(v_child) then
          return true;
        end if;
      end if;
    end loop;
  end if;
  return false;
end;
$$;

do $checkpoint_scalar_walk_after$
begin
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
    then raise exception 'CHECKPOINT_SCALAR_WALK_BODY_OR_PROPERTIES_MISMATCH'; end if;
end;
$checkpoint_scalar_walk_after$;

commit;
