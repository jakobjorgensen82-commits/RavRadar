-- Later SAME_H0_MODEL_METADATA successor after exact installed140000.

-- Projection is NOT authentication. Matched actual140000 B/S, whole metadata inverse and fresh prewrite are required BEFORE SQL.

-- Original numerical state, published history, prior SQL and account schema remain unchanged.

begin;

set local statement_timeout = '55s';

set local lock_timeout = '5s';

do $assistant_same_h0_successor$
declare original_catalog jsonb; after_catalog jsonb; account_observed jsonb; function_name text;
begin
  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '20261017140000'
    then raise exception 'ASSISTANT_SAME_H0_EXACT_INSTALLED140000_REQUIRED'; end if;
  if exists(select 1 from supabase_migrations.schema_migrations
    where version::text=any(array['20261014140000','20261015030000','20261016030000']))
    then raise exception 'ASSISTANT_SAME_H0_ARCHIVED_PHASE_MUST_BE_ABSENT'; end if;
  if not exists(select 1 from supabase_migrations.schema_migrations where version::text='20261013230000')
    then raise exception 'ASSISTANT_SAME_H0_INSTALLED230_REQUIRED'; end if;
  lock table public.account_activity_journal,public.account_statistics_preferences in access share mode;

  if exists(select 1 from pg_catalog.pg_proc where pronamespace='public'::regnamespace
    and proname='ravradar_ravscore_checkpoint_origin140000_state_valid') then raise exception 'ASSISTANT_SAME_H0_DESTINATION_EXISTS'; end if;

  if exists(select 1 from pg_catalog.pg_proc where pronamespace='public'::regnamespace
    and proname='ravradar_ravscore_checkpoint_origin140000_payload_valid') then raise exception 'ASSISTANT_SAME_H0_DESTINATION_EXISTS'; end if;

  if exists(select 1 from pg_catalog.pg_proc where pronamespace='public'::regnamespace
    and proname='ravradar_ravscore_checkpoint_assistant_same_h0_projection') then raise exception 'ASSISTANT_SAME_H0_DESTINATION_EXISTS'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='sql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='i'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='5e01d396d1eabc113ec08257c557bc962a594651dde1dab0f3c87b6bb079e2ab'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='trigger'::regtype and not p.proretset
    and p.prosecdef=true and p.provolatile='v'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='a07394c6687481d20ef20e75ab4d09453382a011887a50deb69638e90a56bdc6'


    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.version_admin_document()')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.version_admin_document()'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='965176e7ee489d6ae130f55e59826175e735eeb66d83cb1db05cf2d6d1219d7d'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_canonical_time(text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_canonical_time(text)'; end if;

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
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_has_forbidden_key(jsonb)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='1038d0e59a745ae3e920a4070fe8bb231aa648c32909fdcd7c3e93bec95a804c'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_ffc_state_valid(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_grid_ffc_state_valid(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='69e6a1d3fe02c588f290bab0701493e1472163b5608cab173be0a4e9dfe4912c'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_ffc_payload_valid(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_grid_ffc_payload_valid(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='f9278193f22d6d7f30db20df8e5efc838644809b1c51c57655f208c40a56de1a'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_249_state_valid(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_grid_249_state_valid(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='53c0d083032b162a34da4197efe696cfd6b2fe8f7a9177e070fd6ef8cb3fe0a8'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_249_payload_valid(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_grid_249_payload_valid(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='9967f0198fba12055649bd459ab106166ef0e5f6c6d0deb92c4416e09ebeaab0'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_c1ac_state_valid(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_grid_c1ac_state_valid(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='780f020f375a7a199df4b682329d0fe7f66a8ebf09701137beb0f1fadd8a6f49'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_c1ac_payload_valid(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_grid_c1ac_payload_valid(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='30a6acf6253a23e9652af67f346583f38fd6677c3aae61c56ce3df89548d1717'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_native_identity_i71_state_valid(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_native_identity_i71_state_valid(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='f09a25e5de2e8370b6f77e3106819cd76e28036ab1f4946d8a90f3aa143506fc'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_native_identity_i71_payload_valid(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_native_identity_i71_payload_valid(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='b017a2b55136caad4a4e41845d5532e403592d1df07393dd88fff9632b1834be'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_cmw_predecessor_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_cmw_predecessor_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='8fcbc74abc62834ff938576eec4797b24ee954c8f57b16ffa4a204024e7a15b1'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_cmw0200_state_valid(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_cmw0200_state_valid(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='09a2ddc61106dff844cf280fb723d7407fbfe67096c76caed63a107dc7aebda8'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_cmw0200_payload_valid(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_cmw0200_payload_valid(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='c7777affb83018f190bca2e966643e980ba5be14a49e8d12df7f6866443eca23'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_native_origin_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_native_origin_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='965b1de49f5e5e762a6009437e89c6be882be1430aad29d2f793a532408e0a66'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_integrated_state_valid(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_integrated_state_valid(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='4bf3c0f23b225fb0158c300b248d7f2ee090ca7ccac7949fbd1cf336bf531564'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_candidate_state_valid(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_candidate_state_valid(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='37f459face659746c557d64ea7f3328ea0c88b140efe665ff3ec491c3df0317c'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_payload_valid(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_payload_valid(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='a122b0d816ef0dbd06c621946d3fdec666f5c45610fb77c7258712037eb9c977'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='eba84fbaa962203b3534b6f5318089d239751fc57ff60ce329fa2876cbead908'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_userdata_predecessor_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_userdata_predecessor_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='034f7590e61ae8ac190108082e9faa9723174b5f0ed6fad011573f49dd42bdd5'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_water_level_predecessor_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_water_level_predecessor_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='61968fe94934c80952d45b3048562906e24ba2b55c507b971edf02da95070f44'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_owner_current_predecessor_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_owner_current_predecessor_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='2a497eff52c0e13cc527f715580022e85754fd37b507598abee9357c92052181'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_cp_close_predecessor_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_cp_close_predecessor_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='bbbabe8dea2ffaa067dae54b58493da78b5aa3c68edf76df521eaa024f4cd821'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_top20_predecessor_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_top20_predecessor_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='f68117beaddd71e63bd83d3963c58d02dbc61e0a3f3a5a797e95cd9a22d941da'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=true and p.provolatile='v'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public','statement_timeout=55s']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='7b63ecf1bbe5be6d847f866012d3906686cbacdf7ee75966f085876e15b670ae'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))
    and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=true and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='f2a2f60f2273fcbbd55b5f365192c59c54024dcd81d4d9b0a3a8bbcc49c67dcd'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_contract()')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_contract()'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='text'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='75d4c4abdc2419c59535cf6b79a74bfa5760cafbf8e8506c0fdb59495d7571ba'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_integrated_state_reason(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_integrated_state_reason(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='text'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='fa3feac17ef018fc1b9dc4af49dfb5c605f6cd6dcee7549e0f9501c1b8cd0a34'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_payload_reason(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_payload_reason(jsonb,timestamptz)'; end if;

  select q.metadata into account_observed from (with wanted_tables(name) as (values ('account_activity_journal'),('account_statistics_preferences')),
table_metadata as (
  select wanted.name,jsonb_build_object(
    'present',r.oid is not null,
    'regular',r.relkind='r','rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,
    'inheritance',exists(select 1 from pg_catalog.pg_inherits where inhrelid=r.oid or inhparent=r.oid),
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'position',a.attnum,
      'type',t.typname,'builtin',t.typnamespace='pg_catalog'::regnamespace,
      'notNull',a.attnotnull,'default',a.atthasdef,
      'defaultExpression',(select pg_catalog.pg_get_expr(d.adbin,d.adrelid)
        from pg_catalog.pg_attrdef d where d.adrelid=a.attrelid and d.adnum=a.attnum),
      'identity',a.attidentity,
      'generated',a.attgenerated,'dimensions',a.attndims) order by a.attnum)
      from pg_catalog.pg_attribute a join pg_catalog.pg_type t on t.oid=a.atttypid
      where a.attrelid=r.oid and a.attnum>0 and not a.attisdropped),
    'droppedColumns',(select count(*) from pg_catalog.pg_attribute where attrelid=r.oid and attnum>0 and attisdropped),
    'constraintCount',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid),
    'primaryKey',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid and contype='p'
      and conkey=array[1]::smallint[] and convalidated and not condeferrable),
    'profilesCascade',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid and contype='f'
      and conkey=array[1]::smallint[] and confrelid='public.profiles'::regclass
      and confkey=array[(select attnum from pg_catalog.pg_attribute where attrelid='public.profiles'::regclass
        and attname='id' and not attisdropped)]::smallint[]
      and confdeltype='c' and confupdtype='a' and confmatchtype='s'
      and convalidated and not condeferrable),
    'activityOrder',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid and contype='c'
      and convalidated and regexp_replace(pg_catalog.pg_get_expr(conbin,conrelid),'[[:space:]]','','g')
        ='(last_activity_at>=first_observed_at)'),
    'revisionNonnegative',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid and contype='c'
      and conkey=array[3]::smallint[] and convalidated and not condeferrable and not connoinherit
      and regexp_replace(pg_catalog.pg_get_expr(conbin,conrelid),'[[:space:]]','','g')='(revision>=0)'),
    'policyCount',(select count(*) from pg_catalog.pg_policy where polrelid=r.oid),
    'userTriggerCount',(select count(*) from pg_catalog.pg_trigger where tgrelid=r.oid and not tgisinternal),
    'unexpectedAcl',exists(select 1 from pg_catalog.aclexplode(coalesce(r.relacl,pg_catalog.acldefault('r',r.relowner))) a
      where a.grantee<>r.relowner and a.grantee<>coalesce((select oid from pg_catalog.pg_roles where rolname='service_role'),0))
      or exists(select 1 from pg_catalog.pg_attribute c cross join lateral pg_catalog.aclexplode(c.attacl) a
        where c.attrelid=r.oid and c.attnum>0 and not c.attisdropped and a.grantee<>r.relowner
          and a.grantee<>coalesce((select oid from pg_catalog.pg_roles where rolname='service_role'),0)),
    'anonAccess',pg_catalog.has_table_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or pg_catalog.has_any_column_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,REFERENCES'),
    'authenticatedAccess',pg_catalog.has_table_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or pg_catalog.has_any_column_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,REFERENCES')
  ) as metadata
  from wanted_tables wanted
  left join pg_catalog.pg_class r on r.oid=pg_catalog.to_regclass('public.'||wanted.name)
), wanted_functions(name,signature) as (values ('record_account_activity',''),('get_own_statistics_preference',''),
 ('enable_own_statistics_preference',''),('disable_own_statistics_preference',''),
 ('set_own_statistics_preference','boolean,bigint')),
function_metadata as (
 select wanted.name,jsonb_build_object(
   'present',p.oid is not null,
   'sameNameCount',(select count(*) from pg_catalog.pg_proc q where q.pronamespace='public'::regnamespace and q.proname=wanted.name),
   'kind',p.prokind,'language',l.lanname,'result',pg_catalog.pg_get_function_result(p.oid),
   'arguments',pg_catalog.pg_get_function_arguments(p.oid),'variadic',p.provariadic<>0,
   'strict',p.proisstrict,'returnsSet',p.proretset,'definer',p.prosecdef,'volatility',p.provolatile,
   'configuration',p.proconfig,
   'bodySha256',pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex'),
   'publicExecute',exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
     where a.grantee=0 and a.privilege_type='EXECUTE'),
   'unexpectedAcl',exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
     where (a.grantee<>p.proowner and a.grantee not in
       (select oid from pg_catalog.pg_roles where rolname in ('authenticated','service_role')))
       or (a.is_grantable and a.grantee=(select oid from pg_catalog.pg_roles where rolname='authenticated'))),
   'anonExecute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),
   'authenticatedExecute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
   'serviceExecute',pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
 ) as metadata from wanted_functions wanted
 left join pg_catalog.pg_proc p on p.oid=pg_catalog.to_regprocedure('public.'||wanted.name||'('||wanted.signature||')')
 left join pg_catalog.pg_language l on l.oid=p.prolang
)
select jsonb_build_object('schemaVersion',2,
 'tables',(select jsonb_object_agg(name,metadata) from table_metadata),
 'functions',(select jsonb_object_agg(name,metadata) from function_metadata)) as metadata) q;
  foreach function_name in array array['record_account_activity','get_own_statistics_preference','enable_own_statistics_preference','disable_own_statistics_preference','set_own_statistics_preference'] loop
    if pg_catalog.jsonb_typeof(account_observed #> array['functions',function_name,'serviceExecute']) is distinct from 'boolean'
      then raise exception 'CMW_SQL_SCHEMA2_SERVICE_SHAPE'; end if;
    -- Exact existing230 normalization only. ACL itself is preserved separately.
    account_observed:=pg_catalog.jsonb_set(account_observed,array['functions',function_name,'serviceExecute'],'false'::jsonb,false);
    if account_observed #> array['functions',function_name,'configuration']='["search_path="]'::jsonb then
      account_observed:=pg_catalog.jsonb_set(account_observed,array['functions',function_name,'configuration'],pg_catalog.jsonb_build_array('search_path=""'),false);
    end if;
  end loop;
  if account_observed is distinct from $cmw_expected${"schemaVersion":2,"tables":{"account_activity_journal":{"present":true,"regular":true,"rls":true,"forceRls":false,"inheritance":false,"columns":[{"name":"user_id","position":1,"type":"uuid","builtin":true,"notNull":true,"default":false,"defaultExpression":null,"identity":"","generated":"","dimensions":0},{"name":"first_observed_at","position":2,"type":"timestamptz","builtin":true,"notNull":true,"default":false,"defaultExpression":null,"identity":"","generated":"","dimensions":0},{"name":"last_activity_at","position":3,"type":"timestamptz","builtin":true,"notNull":true,"default":false,"defaultExpression":null,"identity":"","generated":"","dimensions":0}],"droppedColumns":0,"constraintCount":3,"primaryKey":1,"profilesCascade":1,"activityOrder":1,"revisionNonnegative":0,"policyCount":0,"userTriggerCount":0,"unexpectedAcl":false,"anonAccess":false,"authenticatedAccess":false},"account_statistics_preferences":{"present":true,"regular":true,"rls":true,"forceRls":false,"inheritance":false,"columns":[{"name":"user_id","position":1,"type":"uuid","builtin":true,"notNull":true,"default":false,"defaultExpression":null,"identity":"","generated":"","dimensions":0},{"name":"enabled","position":2,"type":"bool","builtin":true,"notNull":true,"default":false,"defaultExpression":null,"identity":"","generated":"","dimensions":0},{"name":"revision","position":3,"type":"int8","builtin":true,"notNull":true,"default":true,"defaultExpression":"0","identity":"","generated":"","dimensions":0}],"droppedColumns":0,"constraintCount":3,"primaryKey":1,"profilesCascade":1,"activityOrder":0,"revisionNonnegative":1,"policyCount":0,"userTriggerCount":0,"unexpectedAcl":false,"anonAccess":false,"authenticatedAccess":false}},"functions":{"record_account_activity":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"a7ae8ee7e0cbe7688d94ea36728e1e2f70cecec7900bab4117db00377337cc2a","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false},"get_own_statistics_preference":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"77405eb8ad047c59e9352893b91d35041c93fc7b4e4b7e52311612cbbc7b3c02","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false},"enable_own_statistics_preference":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"2e51ed1903aa8e8e4de40ddccc94a6e05f4f0d34bd8bb21b4e96ed34fd19666b","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false},"disable_own_statistics_preference":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"b1275e656d398f5b240990bb8a8401c3166c66121189cc205fc5c0154924c4f5","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false},"set_own_statistics_preference":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"p_enabled boolean, p_expected_revision bigint","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"acd4d566a25d0fc251cd52bb58a8edccfb1aa7de02e4f751f69becb95a0e7bf1","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false}}}$cmw_expected$::jsonb
    then raise exception 'CMW_SQL_EXACT_SCHEMA2_REQUIRED'; end if;

  select pg_catalog.jsonb_build_object(
    'functions',(select pg_catalog.jsonb_object_agg(p.oid::text,
      pg_catalog.to_jsonb(p)-array['prosrc','prosqlbody']) from pg_catalog.pg_proc p
      where p.oid=any(array['public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)'::regprocedure,'public.version_admin_document()'::regprocedure,'public.ravradar_ravscore_checkpoint_canonical_time(text)'::regprocedure,'public.ravradar_ravscore_checkpoint_has_forbidden_key(jsonb)'::regprocedure,'public.ravradar_ravscore_checkpoint_grid_ffc_state_valid(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_grid_ffc_payload_valid(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_grid_249_state_valid(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_grid_249_payload_valid(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_grid_c1ac_state_valid(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_grid_c1ac_payload_valid(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_native_identity_i71_state_valid(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_native_identity_i71_payload_valid(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_cmw_predecessor_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_cmw0200_state_valid(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_cmw0200_payload_valid(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_native_origin_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_integrated_state_valid(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_candidate_state_valid(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_payload_valid(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_userdata_predecessor_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_water_level_predecessor_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_owner_current_predecessor_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_cp_close_predecessor_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_top20_predecessor_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)'::regprocedure,'public.ravradar_ravscore_checkpoint_contract()'::regprocedure,'public.ravradar_ravscore_checkpoint_integrated_state_reason(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_payload_reason(jsonb,timestamptz)'::regprocedure])),
    'accountFunctions',(select pg_catalog.jsonb_object_agg(p.proname,pg_catalog.to_jsonb(p))
      from pg_catalog.pg_proc p where p.pronamespace='public'::regnamespace and p.proname=any(array[
        'record_account_activity','get_own_statistics_preference','enable_own_statistics_preference',
        'disable_own_statistics_preference','set_own_statistics_preference'])),
    'tables',(select pg_catalog.jsonb_object_agg(r.relname,pg_catalog.jsonb_build_object(
      'relation',pg_catalog.jsonb_build_object('oid',r.oid,'owner',r.relowner,'acl',r.relacl,
        'kind',r.relkind,'rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,'options',r.reloptions),
      'columns',(select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) order by a.attnum) from pg_catalog.pg_attribute a where a.attrelid=r.oid),
      'constraints',(select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c where c.conrelid=r.oid),
      'policies',(select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p) order by p.oid) from pg_catalog.pg_policy p where p.polrelid=r.oid)))
      from pg_catalog.pg_class r where r.oid=any(array['public.account_activity_journal'::regclass,'public.account_statistics_preferences'::regclass]))) into original_catalog;

  execute $assistant_same_h0_ddl_0$
create or replace function public.ravradar_ravscore_checkpoint_origin140000_state_valid(
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
      is distinct from '038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f'
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
$assistant_same_h0_ddl_0$;

  execute $assistant_same_h0_ddl_1$
revoke all on function public.ravradar_ravscore_checkpoint_origin140000_state_valid(jsonb,text) from public, anon, authenticated;
$assistant_same_h0_ddl_1$;

  execute $assistant_same_h0_ddl_2$
create or replace function public.ravradar_ravscore_checkpoint_origin140000_payload_valid(
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
    or p_payload -> 'schemaVersion' is distinct from '5'::jsonb
    or p_payload ->> 'status'
      is distinct from 'ravscore-schema6-with-measured-candidate-g-continuation'
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
      '047db5f9c91b555eb47b886d200061456c9cbec450732743265f0f1739114447'
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
        or not public.ravradar_ravscore_checkpoint_origin140000_state_valid(
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
    "modelBundleSha256": "038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f"
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
    or v_companion -> 'schemaVersion' is distinct from '2'::jsonb
    or v_companion ->> 'status' is distinct from 'candidate-g-measured-continuation-companion'
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
      is distinct from 'integrated-schema5-to-candidate-g-schema2-v2'
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
    "modelBundleSha256": "5cc38c658bf14513a029a62de8f5f9e98259630755bdd84bccbc5fb2c1797858"
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
$assistant_same_h0_ddl_2$;

  execute $assistant_same_h0_ddl_3$
revoke all on function public.ravradar_ravscore_checkpoint_origin140000_payload_valid(jsonb,timestamptz) from public, anon, authenticated;
$assistant_same_h0_ddl_3$;

  execute $assistant_same_h0_ddl_4$
create or replace function public.ravradar_ravscore_checkpoint_assistant_same_h0_projection(
  p_payload jsonb,
  p_target_reference timestamptz
)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_projected jsonb;
  v_states jsonb;
begin
  if not public.ravradar_ravscore_checkpoint_origin140000_payload_valid(p_payload,p_target_reference)
  then return null; end if;
  if p_payload is null
    or p_target_reference is null
    or pg_catalog.octet_length(p_payload::text) > 16777216
    or p_payload #>> '{modelBinding,modelBundleSha256}' is distinct from '038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f'
    or p_payload ->> 'continuationStateContractSha256' is distinct from '047db5f9c91b555eb47b886d200061456c9cbec450732743265f0f1739114447'
    or p_payload #>> '{candidateGRollbackCompanion,modelBinding,modelBundleSha256}'
      is distinct from '5cc38c658bf14513a029a62de8f5f9e98259630755bdd84bccbc5fb2c1797858'
    or pg_catalog.jsonb_typeof(p_payload -> 'states') is distinct from 'object'
  then return null; end if;
  if (select pg_catalog.count(*) from pg_catalog.jsonb_each(p_payload -> 'states')) <> 673
    or exists (select 1 from pg_catalog.jsonb_each(p_payload -> 'states') as state(part_id,value)
      where state.value ->> 'modelBundleSha256' is distinct from '038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f')
  then return null; end if;
  select pg_catalog.jsonb_object_agg(state.part_id, pg_catalog.jsonb_set(
    state.value, '{modelBundleSha256}', pg_catalog.to_jsonb('504393dd6f819f6d5a1dc172092e26b10cae26fe684342aaaed001c51e466d94'::text), false))
    into v_states from pg_catalog.jsonb_each(p_payload -> 'states') as state(part_id,value);
  v_projected := pg_catalog.jsonb_set(pg_catalog.jsonb_set(p_payload,
    '{modelBinding,modelBundleSha256}', pg_catalog.to_jsonb('504393dd6f819f6d5a1dc172092e26b10cae26fe684342aaaed001c51e466d94'::text), false),
    '{states}', v_states, false);
  v_projected := pg_catalog.jsonb_set(pg_catalog.jsonb_set(v_projected,
    '{continuationStateContractSha256}', pg_catalog.to_jsonb('eadf4569d28ee92dc6e196b284428c7838305d9d01998c2b751e05aa96880487'::text), false),
    '{candidateGRollbackCompanion,modelBinding,modelBundleSha256}',
    pg_catalog.to_jsonb('3ce599247688acbf21062441f726e1e13d758cb1c52c5b85e6026df175973bca'::text), false);
  if public.ravradar_ravscore_checkpoint_payload_valid(v_projected, p_target_reference)
  then return v_projected; end if;
  return null;
exception when others then return null;
end;
$$;
$assistant_same_h0_ddl_4$;

  execute $assistant_same_h0_ddl_5$
revoke all on function public.ravradar_ravscore_checkpoint_assistant_same_h0_projection(jsonb,timestamptz) from public, anon, authenticated;
$assistant_same_h0_ddl_5$;

  execute $assistant_same_h0_ddl_6$
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
      is distinct from '504393dd6f819f6d5a1dc172092e26b10cae26fe684342aaaed001c51e466d94'
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
$assistant_same_h0_ddl_6$;

  execute $assistant_same_h0_ddl_7$
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
    or p_payload -> 'schemaVersion' is distinct from '5'::jsonb
    or p_payload ->> 'status'
      is distinct from 'ravscore-schema6-with-measured-candidate-g-continuation'
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
      'eadf4569d28ee92dc6e196b284428c7838305d9d01998c2b751e05aa96880487'
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
    "modelBundleSha256": "504393dd6f819f6d5a1dc172092e26b10cae26fe684342aaaed001c51e466d94"
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
    or v_companion -> 'schemaVersion' is distinct from '2'::jsonb
    or v_companion ->> 'status' is distinct from 'candidate-g-measured-continuation-companion'
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
      is distinct from 'integrated-schema5-to-candidate-g-schema2-v2'
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
    "modelBundleSha256": "3ce599247688acbf21062441f726e1e13d758cb1c52c5b85e6026df175973bca"
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
$assistant_same_h0_ddl_7$;

  execute $assistant_same_h0_ddl_8$
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
    -- RAVSCORE_CHECKPOINT_INTEGRATED_STATE_BINDING_DIAGNOSTIC_BEGIN
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
      is distinct from '504393dd6f819f6d5a1dc172092e26b10cae26fe684342aaaed001c51e466d94'
    -- RAVSCORE_CHECKPOINT_INTEGRATED_STATE_BINDING_DIAGNOSTIC_END
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
$assistant_same_h0_ddl_8$;

  execute $assistant_same_h0_ddl_9$
create or replace function public.ravradar_ravscore_checkpoint_payload_reason(
  p_payload jsonb,
  p_target_reference timestamptz
)
returns text
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
    or p_payload -> 'schemaVersion' is distinct from '5'::jsonb
    or p_payload ->> 'status'
      is distinct from 'ravscore-schema6-with-measured-candidate-g-continuation'
    or jsonb_typeof(p_payload -> 'datasetId') is distinct from 'string'
    or jsonb_typeof(p_payload -> 'productionReferenceAt') is distinct from 'string'
    or jsonb_typeof(p_payload -> 'continuationStateContractSha256')
      is distinct from 'string'
    or jsonb_typeof(p_payload -> 'generationSha256') is distinct from 'string'
    or jsonb_typeof(p_payload -> 'stateSha256') is distinct from 'string'
    or coalesce(p_payload ->> 'datasetId', '') !~
      '^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
    -- RAVSCORE_CHECKPOINT_CONTINUATION_STATE_CONTRACT_DIAGNOSTIC_BEGIN
    or p_payload ->> 'continuationStateContractSha256' is distinct from
      'eadf4569d28ee92dc6e196b284428c7838305d9d01998c2b751e05aa96880487'
    -- RAVSCORE_CHECKPOINT_CONTINUATION_STATE_CONTRACT_DIAGNOSTIC_END
    or coalesce(p_payload ->> 'generationSha256', '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_payload ->> 'stateSha256', '') !~ '^[0-9a-f]{64}$'
    or p_payload -> 'privacy' is distinct from v_privacy
    or jsonb_typeof(p_payload -> 'modelBinding') is distinct from 'object'
    or jsonb_typeof(p_payload -> 'partCount') is distinct from 'number'
    or jsonb_typeof(p_payload -> 'states') is distinct from 'object'
    or public.ravradar_ravscore_checkpoint_has_forbidden_key(p_payload)
  then
    return 'P01'; /* source line 1467 */
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
    return 'P02'; /* source line 1490 */
  end if;

  v_integrated_binding := p_payload -> 'modelBinding';
  -- RAVSCORE_CHECKPOINT_INTEGRATED_BINDING_DIAGNOSTIC_BEGIN
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
    "modelBundleSha256": "504393dd6f819f6d5a1dc172092e26b10cae26fe684342aaaed001c51e466d94"
  }'::jsonb then
    return 'P03'; /* source line 1508 */
  end if;
  -- RAVSCORE_CHECKPOINT_INTEGRATED_BINDING_DIAGNOSTIC_END

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
    or v_companion -> 'schemaVersion' is distinct from '2'::jsonb
    or v_companion ->> 'status' is distinct from 'candidate-g-measured-continuation-companion'
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
      is distinct from 'integrated-schema5-to-candidate-g-schema2-v2'
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
    return 'P04'; /* source line 1571 */
  end if;

  v_candidate_binding := v_companion -> 'modelBinding';
  -- RAVSCORE_CHECKPOINT_CANDIDATE_G_ROLLBACK_BINDING_DIAGNOSTIC_BEGIN
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
    "modelBundleSha256": "3ce599247688acbf21062441f726e1e13d758cb1c52c5b85e6026df175973bca"
  }'::jsonb then
    return 'P05'; /* source line 1589 */
  end if;
  -- RAVSCORE_CHECKPOINT_CANDIDATE_G_ROLLBACK_BINDING_DIAGNOSTIC_END

  return null;
exception
  when others then
    return 'P06'; /* source line 1596 */
end;
$$;
$assistant_same_h0_ddl_9$;

  execute $assistant_same_h0_ddl_10$
create or replace function public.ravradar_ravscore_checkpoint_native_origin_projection(
  p_payload jsonb,
  p_target_reference timestamptz
)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_projected jsonb;
  v_states jsonb;
begin
  if not public.ravradar_ravscore_checkpoint_cmw0200_payload_valid(p_payload,p_target_reference)
    or p_payload ->> 'datasetId' is distinct from 'rr-20261016191945-210'
    or p_payload ->> 'productionReferenceAt' is distinct from '2026-10-16T10:00:00.000Z'
    or p_payload ->> 'generationSha256' is distinct from 'd337d7fd8d111af723e26d9252bb8f56e679cb4dd66a226612e62971f4d661bb'
    or p_payload #>> '{candidateGRollbackCompanion,stateSha256}' is distinct from '61297a258de3bd7131c0268d62966cb6eed8463fc886641a07b4e23d071fe503'
  then return null; end if;
  if p_payload is null
    or p_target_reference is null
    or pg_catalog.octet_length(p_payload::text) > 16777216
    or p_payload #>> '{modelBinding,modelBundleSha256}' is distinct from '84217430a712fec3e78c5c3115d86520a4011a388998af030d231a8433d52bb3'
    or p_payload ->> 'continuationStateContractSha256' is distinct from 'a519a34e91e552623892e28f3c1fa9ee67b65d1fa08869a96e34fa24bd6d832f'
    or p_payload #>> '{candidateGRollbackCompanion,modelBinding,modelBundleSha256}'
      is distinct from '76a86277db106621e7f0952d0789f9038a4bf9cfe7993b88de5c9a49bf25b4b8'
    or pg_catalog.jsonb_typeof(p_payload -> 'states') is distinct from 'object'
  then return null; end if;
  if (select pg_catalog.count(*) from pg_catalog.jsonb_each(p_payload -> 'states')) <> 673
    or exists (select 1 from pg_catalog.jsonb_each(p_payload -> 'states') as state(part_id,value)
      where state.value ->> 'modelBundleSha256' is distinct from '84217430a712fec3e78c5c3115d86520a4011a388998af030d231a8433d52bb3')
  then return null; end if;
  select pg_catalog.jsonb_object_agg(state.part_id, pg_catalog.jsonb_set(
    state.value, '{modelBundleSha256}', pg_catalog.to_jsonb('038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f'::text), false))
    into v_states from pg_catalog.jsonb_each(p_payload -> 'states') as state(part_id,value);
  v_projected := pg_catalog.jsonb_set(pg_catalog.jsonb_set(p_payload,
    '{modelBinding,modelBundleSha256}', pg_catalog.to_jsonb('038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f'::text), false),
    '{states}', v_states, false);
  v_projected := pg_catalog.jsonb_set(pg_catalog.jsonb_set(v_projected,
    '{continuationStateContractSha256}', pg_catalog.to_jsonb('047db5f9c91b555eb47b886d200061456c9cbec450732743265f0f1739114447'::text), false),
    '{candidateGRollbackCompanion,modelBinding,modelBundleSha256}',
    pg_catalog.to_jsonb('5cc38c658bf14513a029a62de8f5f9e98259630755bdd84bccbc5fb2c1797858'::text), false);
  if public.ravradar_ravscore_checkpoint_origin140000_payload_valid(v_projected, p_target_reference)
  then return v_projected; end if;
  return null;
exception when others then return null;
end;
$$;
$assistant_same_h0_ddl_10$;

  execute $assistant_same_h0_ddl_11$
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
  if p_current_implementation_sha256 = 'eadf4569d28ee92dc6e196b284428c7838305d9d01998c2b751e05aa96880487'
    and p_payload #>> '{modelBinding,modelBundleSha256}' = '038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f'
    and public.ravradar_ravscore_checkpoint_assistant_same_h0_projection(p_payload,p_target_reference) is not null
  then return true; end if;
  if p_current_implementation_sha256 = '047db5f9c91b555eb47b886d200061456c9cbec450732743265f0f1739114447'
    and p_payload #>> '{modelBinding,modelBundleSha256}' = '84217430a712fec3e78c5c3115d86520a4011a388998af030d231a8433d52bb3'
    and public.ravradar_ravscore_checkpoint_native_origin_projection(p_payload,p_target_reference) is not null
  then return true; end if;
  if p_current_implementation_sha256 = 'a519a34e91e552623892e28f3c1fa9ee67b65d1fa08869a96e34fa24bd6d832f'
    and p_payload #>> '{modelBinding,modelBundleSha256}' = 'aa1e364bf6a0962725b6633fdc3487c6e626d51373302d7135023547a93c9855'
    and public.ravradar_ravscore_checkpoint_cmw_predecessor_projection(p_payload, p_target_reference) is not null
  then return true; end if;
  if p_current_implementation_sha256 = '7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b'
    and public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection(p_payload, p_target_reference) is not null
  then return true; end if;
  if p_current_implementation_sha256 = '7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b'
    and public.ravradar_ravscore_checkpoint_userdata_predecessor_projection(p_payload, p_target_reference) is not null
  then return true; end if;
  if p_current_implementation_sha256 = '7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b'
    and public.ravradar_ravscore_checkpoint_water_level_predecessor_projection(p_payload, p_target_reference) is not null
  then return true; end if;
  if p_current_implementation_sha256 = '7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b'
    and public.ravradar_ravscore_checkpoint_owner_current_predecessor_projection(p_payload, p_target_reference) is not null
  then return true; end if;
  if p_current_implementation_sha256 = '7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b'
    and public.ravradar_ravscore_checkpoint_cp_close_predecessor_projection(p_payload, p_target_reference) is not null
  then return true; end if;
  if p_current_implementation_sha256 = '7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b'
    and public.ravradar_ravscore_checkpoint_top20_predecessor_projection(
      p_payload, p_target_reference) is not null
  then return true; end if;
  if p_payload is not null
    and p_target_reference = '2026-09-24T15:00:00.000Z'::timestamptz
    and p_current_implementation_sha256 =
      '7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b'
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
$assistant_same_h0_ddl_11$;

  execute $assistant_same_h0_ddl_12$
create or replace function public.ravradar_trip_v3_binding_allowed(
  p_model_version text,
  p_calibration_features jsonb,
  p_calibration_eligible boolean,
  p_actual_zone_id text,
  p_actual_coastal_part_id text,
  p_forecast_zone_id text,
  p_forecast_coastal_part_id text
)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case
    -- RAVSCORE_INTEGRATED_BINDING_BEGIN
    when p_model_version = 'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0'
      and p_calibration_features ->> 'modelStateVersion' = '6.0.0'
      and p_calibration_features ->> 'modelVariantId' = 'COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2'
      and p_calibration_features ->> 'modelProfileId' = 'cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5'
      and p_calibration_features ->> 'modelComponentSchemaId' = 'ravscore-components-huntability-delivery-mobilisation-bounds-v5'
      and p_calibration_features ->> 'modelExplanationSchemaId' = 'ravscore-explanation-integrated-bounds-v5'
      and p_calibration_features ->> 'modelRankingPolicyId' = 'direction-broad-19-history-tie-v2'
      and p_calibration_features ->> 'modelBestTimePolicyId' = 'score-history-water-tie-earliest-v3'
      and p_calibration_features ->> 'modelPresentationPolicyId' = 'score-bands-35-55-75-exceptional90-v1'
      and p_calibration_features ->> 'modelContractSha256' = 'a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b'
      -- The exact public predecessor remains admissible only while the central
      -- activeModelBinding still names it. The active-binding guard below rejects
      -- this predecessor automatically after maintenance completion.
      and p_calibration_features ->> 'modelBundleSha256' in (
        '327b989b731e6e84bf05bdb6bd54707d47c04d5bdf80038d437332e84a4c8e01',
        '14f3f0c9b1d91df0d23f94e1d56852a34f8d6a232e23da74590921be8f058904',
        'dafee01903ccb643b59572539104f879d99903bd622be8997cb20d1cc25d729d',
        '2c26b855fc0e93754c5f0ba586f6d2a2864c6de17880717ab6cd6c8cbc3bcad7',
        '61ec54746fdf1ac58f3d7859d4d55a901fcc6376d0412acf2d6f4f418ae5c0a1',
        'c557f91a520ae64211f9441f25fc72a9c230691cdb7b48551ecb7286463420eb',
        '3a14f458122f5bc0ea8a60c07abbcbd68d022c0322a87e77242891f21631c852',
        '29ea9a19647bf7d5edad0eee159267086d546f0d90a9f2778a77077351aad948',
        '4ebe158f68954f32b47cb71d5222ab0cf676faaf4b323d743f9d43bf34a63a51',
        'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb',
        '249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932',
        'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5',
        '994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399',
        'aa1e364bf6a0962725b6633fdc3487c6e626d51373302d7135023547a93c9855',
        '84217430a712fec3e78c5c3115d86520a4011a388998af030d231a8433d52bb3',
        '038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f',
        '504393dd6f819f6d5a1dc172092e26b10cae26fe684342aaaed001c51e466d94'
      )
    -- RAVSCORE_INTEGRATED_BINDING_END
    then public.ravradar_trip_v3_calibration_truth_allowed(
      p_model_version,p_calibration_features,p_calibration_eligible,
      p_actual_zone_id,p_actual_coastal_part_id,
      p_forecast_zone_id,p_forecast_coastal_part_id
    )
    -- RAVSCORE_CANDIDATE_G_ROLLBACK_BINDING_BEGIN
    when p_model_version = 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3'
      and p_calibration_features ->> 'modelStateVersion' = '2.0.0'
      and p_calibration_features ->> 'modelVariantId' = 'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED'
      and p_calibration_features ->> 'modelProfileId' = 'current-0.03-0.15-in10-out8-exhaust13-window48-boundary0-wave-build4-decay48'
      and p_calibration_features ->> 'modelComponentSchemaId' = 'ravscore-components-huntability-transport-mobilisation-candidate-g-v1'
      and p_calibration_features ->> 'modelExplanationSchemaId' = 'ravscore-explanation-candidate-g-v3'
      and p_calibration_features ->> 'modelRankingPolicyId' = 'direction-broad-19-v1'
      and p_calibration_features ->> 'modelBestTimePolicyId' = 'score-water-tie-earliest-v2'
      and p_calibration_features ->> 'modelPresentationPolicyId' = 'score-bands-35-55-75-exceptional90-v1'
      and p_calibration_features ->> 'modelContractSha256' = 'c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8'
      and p_calibration_features ->> 'modelBundleSha256' in (
        'a2494810db3a335376795e308d149f5856885c05665d9f155fc6b0632344c021',
        '28a69936b3d9a9c655e967c5e0c352d8401e5894ef3011bbfc55c85ad37f7ce7',
        '3e5aae87b19934091a7882fbd8f5b5570b7c83ba786ea6f3bac52a8fd71fcd1e',
        '8d9142b5f7d9b5a3e5a0f3593e73df0c7ffaf3d80c036317967cb713f09197e3',
        '55fd7dfa5ee36596c729d93225a448ea5b8f1e7142c44b8b1bda5c3d4d84c957',
        '2fdc7426ea99382731c6f4d118eacf4fc271f505fcf121bc67c5349c62938af9',
        'd192e060cf47fde07a1ae2faf9a8db913dbbf4e1325cbf7bf2e33c720982e8d9',
        '2786145f7fc812cd658cab3a69927db625c2b8ffb3be81256acedd12288f4010',
        '76a86277db106621e7f0952d0789f9038a4bf9cfe7993b88de5c9a49bf25b4b8',
        '5cc38c658bf14513a029a62de8f5f9e98259630755bdd84bccbc5fb2c1797858',
        '3ce599247688acbf21062441f726e1e13d758cb1c52c5b85e6026df175973bca'
      )
    -- RAVSCORE_CANDIDATE_G_ROLLBACK_BINDING_END
    then public.ravradar_trip_v3_calibration_truth_allowed(
      p_model_version,p_calibration_features,p_calibration_eligible,
      p_actual_zone_id,p_actual_coastal_part_id,
      p_forecast_zone_id,p_forecast_coastal_part_id
    )
    else false
  end;
$$;
$assistant_same_h0_ddl_12$;

  execute $assistant_same_h0_ddl_13$
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
  v_account_assistant_predecessor_payload jsonb;
  v_cmw_predecessor_payload jsonb;
  v_causal_predecessor_payload jsonb;
  v_same_h0_predecessor_payload jsonb;
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
    if p_payload ->> 'continuationStateContractSha256' = 'eadf4569d28ee92dc6e196b284428c7838305d9d01998c2b751e05aa96880487'
      and v_payload #>> '{modelBinding,modelBundleSha256}' = '038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f'
    then
      v_same_h0_predecessor_payload := public.ravradar_ravscore_checkpoint_assistant_same_h0_projection(v_payload,v_central_reference);
    end if;
    if p_payload ->> 'continuationStateContractSha256' = '047db5f9c91b555eb47b886d200061456c9cbec450732743265f0f1739114447'
      and v_payload #>> '{modelBinding,modelBundleSha256}' = '84217430a712fec3e78c5c3115d86520a4011a388998af030d231a8433d52bb3'
    then
      v_causal_predecessor_payload := public.ravradar_ravscore_checkpoint_native_origin_projection(v_payload,v_central_reference);
    end if;
    if p_payload ->> 'continuationStateContractSha256' = 'a519a34e91e552623892e28f3c1fa9ee67b65d1fa08869a96e34fa24bd6d832f'
      and v_payload #>> '{modelBinding,modelBundleSha256}' = 'aa1e364bf6a0962725b6633fdc3487c6e626d51373302d7135023547a93c9855'
    then
      v_cmw_predecessor_payload := public.ravradar_ravscore_checkpoint_cmw_predecessor_projection(v_payload, v_central_reference);
    end if;
    if p_payload ->> 'continuationStateContractSha256' =
      '7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b'
    then
      case v_payload #>> '{modelBinding,modelBundleSha256}'
        when '249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932' then
          v_account_assistant_predecessor_payload :=
            public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection(v_payload, v_central_reference);
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
    if v_same_h0_predecessor_payload is not null
      or v_causal_predecessor_payload is not null
      or v_cmw_predecessor_payload is not null
      or v_account_assistant_predecessor_payload is not null
      or v_userdata_predecessor_payload is not null
      or v_water_level_predecessor_payload is not null
      or v_owner_current_predecessor_payload is not null
      or v_cp_close_predecessor_payload is not null
      or v_top20_predecessor_payload is not null
    then
      v_central_is_compatible_predecessor := true;
    elsif p_target_reference > v_central_reference
      and p_payload ->> 'continuationStateContractSha256' = 'eadf4569d28ee92dc6e196b284428c7838305d9d01998c2b751e05aa96880487'
      and (case v_payload #>> '{modelBinding,modelBundleSha256}'
        when 'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb' then public.ravradar_ravscore_checkpoint_grid_ffc_payload_valid(v_payload, v_central_reference)
        when '249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932' then public.ravradar_ravscore_checkpoint_grid_249_payload_valid(v_payload, v_central_reference)
        when 'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5' then public.ravradar_ravscore_checkpoint_grid_c1ac_payload_valid(v_payload, v_central_reference)
        when '994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399' then public.ravradar_ravscore_checkpoint_native_identity_i71_payload_valid(v_payload, v_central_reference)
        else false
      end)
    then
      -- A genuinely newer current generation; no metadata projection or same-reference waiver.
      v_central_is_compatible_predecessor := false;
    elsif p_target_reference > v_central_reference
      and p_payload ->> 'continuationStateContractSha256' = '047db5f9c91b555eb47b886d200061456c9cbec450732743265f0f1739114447'
      and (case v_payload #>> '{modelBinding,modelBundleSha256}'
        when 'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb' then public.ravradar_ravscore_checkpoint_grid_ffc_payload_valid(v_payload, v_central_reference)
        when '249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932' then public.ravradar_ravscore_checkpoint_grid_249_payload_valid(v_payload, v_central_reference)
        when 'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5' then public.ravradar_ravscore_checkpoint_grid_c1ac_payload_valid(v_payload, v_central_reference)
        when '994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399' then public.ravradar_ravscore_checkpoint_native_identity_i71_payload_valid(v_payload, v_central_reference)
        else false
      end)
    then
      -- A genuinely newer current generation; no metadata projection or same-reference waiver.
      v_central_is_compatible_predecessor := false;
    elsif p_target_reference > v_central_reference
      and p_payload ->> 'continuationStateContractSha256' = 'a519a34e91e552623892e28f3c1fa9ee67b65d1fa08869a96e34fa24bd6d832f'
      and (case v_payload #>> '{modelBinding,modelBundleSha256}'
        when 'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb' then public.ravradar_ravscore_checkpoint_grid_ffc_payload_valid(v_payload, v_central_reference)
        when '249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932' then public.ravradar_ravscore_checkpoint_grid_249_payload_valid(v_payload, v_central_reference)
        when 'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5' then public.ravradar_ravscore_checkpoint_grid_c1ac_payload_valid(v_payload, v_central_reference)
        when '994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399' then public.ravradar_ravscore_checkpoint_native_identity_i71_payload_valid(v_payload, v_central_reference)
        else false
      end)
    then
      -- A genuinely newer current generation; no metadata projection or same-reference waiver.
      v_central_is_compatible_predecessor := false;
    elsif p_target_reference > v_central_reference
      and p_payload ->> 'continuationStateContractSha256' = '15f0eb6748cf0a4f1c9d8971e43efc6823ec7d70c85984e6619e07db277702f1'
      and (case v_payload #>> '{modelBinding,modelBundleSha256}'
        when 'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb' then public.ravradar_ravscore_checkpoint_grid_ffc_payload_valid(v_payload, v_central_reference)
        when '249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932' then public.ravradar_ravscore_checkpoint_grid_249_payload_valid(v_payload, v_central_reference)
        when 'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5' then public.ravradar_ravscore_checkpoint_grid_c1ac_payload_valid(v_payload, v_central_reference)
        when '994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399' then public.ravradar_ravscore_checkpoint_native_identity_i71_payload_valid(v_payload, v_central_reference)
        else false
      end)
    then
      -- A genuinely newer current generation; no metadata projection or same-reference waiver.
      v_central_is_compatible_predecessor := false;
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
    if v_central_is_compatible_predecessor and v_same_h0_predecessor_payload is not null then
      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference
        and (v_same_h0_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}')
        = (p_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}');
    elsif v_central_is_compatible_predecessor and v_causal_predecessor_payload is not null then
      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference
        and (v_causal_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}')
        = (p_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}');
    elsif v_central_is_compatible_predecessor and v_cmw_predecessor_payload is not null then
      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference
        and (v_cmw_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}')
        = (p_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}');
    elsif v_central_is_compatible_predecessor and v_account_assistant_predecessor_payload is not null then
      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference
        and (v_account_assistant_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}')
        = (p_payload #- '{generationSha256}' #- '{stateSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}');
    elsif v_central_is_compatible_predecessor and v_userdata_predecessor_payload is not null then
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
$assistant_same_h0_ddl_13$;

  execute $assistant_same_h0_ddl_14$
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
  v_cp_close_projection_definition text;
  v_owner_current_projection_definition text;
  v_water_level_projection_definition text;
  v_userdata_projection_definition text;
  v_account_assistant_projection_definition text;
  v_grid_ffc_state_definition text;
  v_grid_ffc_payload_definition text;
  v_grid_249_state_definition text;
  v_grid_249_payload_definition text;
  v_grid_c1ac_state_definition text;
  v_grid_c1ac_payload_definition text;
  v_cmw_projection_definition text;
  v_cmw0200_state_definition text;
  v_cmw0200_payload_definition text;
  v_native_origin_projection_definition text;
  v_origin140000_state_definition text;
  v_origin140000_payload_definition text;
  v_assistant_same_h0_projection_definition text;
  v_native_identity_i71_state_definition text;
  v_native_identity_i71_payload_definition text;
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
    ),
    pg_catalog.to_regprocedure(
      'public.ravradar_ravscore_checkpoint_cp_close_predecessor_projection(jsonb,timestamptz)'
    ),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_owner_current_predecessor_projection(jsonb,timestamptz)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_water_level_predecessor_projection(jsonb,timestamptz)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_userdata_predecessor_projection(jsonb,timestamptz)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection(jsonb,timestamptz)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_ffc_state_valid(jsonb,text)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_ffc_payload_valid(jsonb,timestamptz)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_249_state_valid(jsonb,text)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_249_payload_valid(jsonb,timestamptz)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_c1ac_state_valid(jsonb,text)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_c1ac_payload_valid(jsonb,timestamptz)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_native_identity_i71_state_valid(jsonb,text)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_native_identity_i71_payload_valid(jsonb,timestamptz)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_cmw_predecessor_projection(jsonb,timestamptz)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_cmw0200_state_valid(jsonb,text)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_cmw0200_payload_valid(jsonb,timestamptz)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_native_origin_projection(jsonb,timestamptz)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_origin140000_state_valid(jsonb,text)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_origin140000_payload_valid(jsonb,timestamptz)'),
    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_assistant_same_h0_projection(jsonb,timestamptz)')
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

  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_cp_close_projection_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[7];

  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_owner_current_projection_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[8];

  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_water_level_projection_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[9];

  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_userdata_projection_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[10];

  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_account_assistant_projection_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[11];

  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_grid_ffc_state_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[12];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_grid_ffc_payload_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[13];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_grid_249_state_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[14];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_grid_249_payload_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[15];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_grid_c1ac_state_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[16];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_grid_c1ac_payload_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[17];

  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_native_identity_i71_state_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[18];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_native_identity_i71_payload_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[19];

  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_cmw_projection_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[20];

  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_cmw0200_state_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[21];

  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_cmw0200_payload_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[22];

  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_native_origin_projection_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[23];

  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_origin140000_state_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[24];

  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_origin140000_payload_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[25];

  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_assistant_same_h0_projection_definition
  from pg_catalog.pg_proc p where p.oid = v_validator_oids[26];

  v_checkpoint_definition := v_canonical_time_definition
    || E'\n-- forbidden-key-validator --\n' || v_forbidden_definition
    || E'\n-- integrated-state-validator --\n' || v_integrated_state_definition
    || E'\n-- candidate-state-validator --\n' || v_candidate_state_definition
    || E'\n-- payload-validator --\n' || v_payload_definition
    || E'\n-- predecessor-payload-validator --\n' || v_predecessor_payload_definition
    || E'\n-- cas-function --\n' || v_cas_definition
    || E'\n-- checkpoint-history-exclusion --\n' || v_history_definition
    || E'\n-- top20-predecessor-projection --\n' || v_top20_projection_definition
    || E'\n-- cp-close-predecessor-projection --\n' || v_cp_close_projection_definition
    || E'\n-- owner-current-predecessor-projection --\n' || v_owner_current_projection_definition
    || E'\n-- water-level-predecessor-projection --\n' || v_water_level_projection_definition
    || E'\n-- userdata-predecessor-projection --\n' || v_userdata_projection_definition
    || E'\n-- account-assistant-predecessor-projection --\n' || v_account_assistant_projection_definition
    || E'\n-- grid-original-ffc-state-validator --\n' || v_grid_ffc_state_definition
    || E'\n-- grid-original-ffc-payload-validator --\n' || v_grid_ffc_payload_definition
    || E'\n-- grid-original-249-state-validator --\n' || v_grid_249_state_definition
    || E'\n-- grid-original-249-payload-validator --\n' || v_grid_249_payload_definition
    || E'\n-- grid-original-c1ac-state-validator --\n' || v_grid_c1ac_state_definition
    || E'\n-- grid-original-c1ac-payload-validator --\n' || v_grid_c1ac_payload_definition
    || E'\n-- native-identity-i71-state-validator --\n' || v_native_identity_i71_state_definition
    || E'\n-- native-identity-i71-payload-validator --\n' || v_native_identity_i71_payload_definition
    || E'\n-- current-memory-warmup-predecessor-projection --\n' || v_cmw_projection_definition
    || E'\n-- cmw0200-original-state-validator --\n' || v_cmw0200_state_definition
    || E'\n-- cmw0200-original-payload-validator --\n' || v_cmw0200_payload_definition
    || E'\n-- established-native-current-origin-projection --\n' || v_native_origin_projection_definition
    || E'\n-- origin140000-original-state-validator --\n' || v_origin140000_state_definition
    || E'\n-- origin140000-original-payload-validator --\n' || v_origin140000_payload_definition
    || E'\n-- assistant-same-h0-metadata-projection --\n' || v_assistant_same_h0_projection_definition;

  return pg_catalog.jsonb_build_object(
    'schemaVersion', 'ravscore-checkpoint-db-v1',
    'appliedMigrationVersion', case when exists (
      select 1
      from supabase_migrations.schema_migrations m
      where m.version::text = '20261017213500'
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
$assistant_same_h0_ddl_14$;

  execute $assistant_same_h0_ddl_15$
alter function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb) set statement_timeout = '55s';
$assistant_same_h0_ddl_15$;

  if not coalesce((select p.prokind='f' and l.lanname='sql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='i'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='e959447234f2e0267e340389c89047c91be7c7e85d8b2dddc3856497c35fc67d'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='trigger'::regtype and not p.proretset
    and p.prosecdef=true and p.provolatile='v'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='a07394c6687481d20ef20e75ab4d09453382a011887a50deb69638e90a56bdc6'


    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.version_admin_document()')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.version_admin_document()'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='965176e7ee489d6ae130f55e59826175e735eeb66d83cb1db05cf2d6d1219d7d'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_canonical_time(text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_canonical_time(text)'; end if;

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
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_has_forbidden_key(jsonb)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='1038d0e59a745ae3e920a4070fe8bb231aa648c32909fdcd7c3e93bec95a804c'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_ffc_state_valid(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_grid_ffc_state_valid(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='69e6a1d3fe02c588f290bab0701493e1472163b5608cab173be0a4e9dfe4912c'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_ffc_payload_valid(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_grid_ffc_payload_valid(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='f9278193f22d6d7f30db20df8e5efc838644809b1c51c57655f208c40a56de1a'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_249_state_valid(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_grid_249_state_valid(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='53c0d083032b162a34da4197efe696cfd6b2fe8f7a9177e070fd6ef8cb3fe0a8'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_249_payload_valid(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_grid_249_payload_valid(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='9967f0198fba12055649bd459ab106166ef0e5f6c6d0deb92c4416e09ebeaab0'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_c1ac_state_valid(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_grid_c1ac_state_valid(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='780f020f375a7a199df4b682329d0fe7f66a8ebf09701137beb0f1fadd8a6f49'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_grid_c1ac_payload_valid(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_grid_c1ac_payload_valid(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='30a6acf6253a23e9652af67f346583f38fd6677c3aae61c56ce3df89548d1717'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_native_identity_i71_state_valid(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_native_identity_i71_state_valid(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='f09a25e5de2e8370b6f77e3106819cd76e28036ab1f4946d8a90f3aa143506fc'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_native_identity_i71_payload_valid(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_native_identity_i71_payload_valid(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='b017a2b55136caad4a4e41845d5532e403592d1df07393dd88fff9632b1834be'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_cmw_predecessor_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_cmw_predecessor_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='8fcbc74abc62834ff938576eec4797b24ee954c8f57b16ffa4a204024e7a15b1'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_cmw0200_state_valid(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_cmw0200_state_valid(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='09a2ddc61106dff844cf280fb723d7407fbfe67096c76caed63a107dc7aebda8'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_cmw0200_payload_valid(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_cmw0200_payload_valid(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='d24f31974951febf0d6fb0077b2d1b62e68dd94234f7a184afca9f4e0f9939c2'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_native_origin_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_native_origin_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='babf1ac47900def3cb75ed5ddd89a0c7be564e3394af6c3b81408f0d57ad0fbf'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_integrated_state_valid(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_integrated_state_valid(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='4bf3c0f23b225fb0158c300b248d7f2ee090ca7ccac7949fbd1cf336bf531564'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_candidate_state_valid(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_candidate_state_valid(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='9851f1b508cf0969f407af050f61f7f41e23abf6071c802a8ee68d1a1067bac6'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_payload_valid(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_payload_valid(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='a122b0d816ef0dbd06c621946d3fdec666f5c45610fb77c7258712037eb9c977'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='eba84fbaa962203b3534b6f5318089d239751fc57ff60ce329fa2876cbead908'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_userdata_predecessor_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_userdata_predecessor_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='034f7590e61ae8ac190108082e9faa9723174b5f0ed6fad011573f49dd42bdd5'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_water_level_predecessor_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_water_level_predecessor_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='61968fe94934c80952d45b3048562906e24ba2b55c507b971edf02da95070f44'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_owner_current_predecessor_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_owner_current_predecessor_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='2a497eff52c0e13cc527f715580022e85754fd37b507598abee9357c92052181'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_cp_close_predecessor_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_cp_close_predecessor_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='bbbabe8dea2ffaa067dae54b58493da78b5aa3c68edf76df521eaa024f4cd821'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_top20_predecessor_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_top20_predecessor_projection(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='a1d46566c6f78d50d63805c050446acb6e294c44350a1ce3e37555e62c256854'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=true and p.provolatile='v'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public','statement_timeout=55s']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='c0093230987bf8af64774abe587251de6dcc6e23166e5f372184c62eb41e583c'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))
    and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=true and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='640694c5077894db6e3e30144270cbf1eaaf4353c3e02d2c02a5c59ebaf558fb'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_contract()')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_contract()'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='text'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='237202570d84bf3e21b6fc379a9880a10b77239b02af6e3e5836c7b33a891c0d'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_integrated_state_reason(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_integrated_state_reason(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='text'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='8596c12d32627d74e28589184ea51166f1b4ea3d8f7138ddb17eb624e8120c75'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_payload_reason(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_payload_reason(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='965b1de49f5e5e762a6009437e89c6be882be1430aad29d2f793a532408e0a66'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_origin140000_state_valid(jsonb,text)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_origin140000_state_valid(jsonb,text)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='2cef5fde33a9859cc50a067ed0018ab9d46241fed24d7054e042ee91e4098cce'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_origin140000_payload_valid(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_origin140000_payload_valid(jsonb,timestamptz)'; end if;

  if not coalesce((select p.prokind='f' and l.lanname='plpgsql'
    and p.prorettype='jsonb'::regtype and not p.proretset
    and p.prosecdef=false and p.provolatile='s'
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=array['search_path=pg_catalog, public']::text[]
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex')='d4582594c232f087476a02b9f9370e1d0d61e458d3eaa71d2606b683bcc171b3'
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))

    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_assistant_same_h0_projection(jsonb,timestamptz)')),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: public.ravradar_ravscore_checkpoint_assistant_same_h0_projection(jsonb,timestamptz)'; end if;

  select q.metadata into account_observed from (with wanted_tables(name) as (values ('account_activity_journal'),('account_statistics_preferences')),
table_metadata as (
  select wanted.name,jsonb_build_object(
    'present',r.oid is not null,
    'regular',r.relkind='r','rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,
    'inheritance',exists(select 1 from pg_catalog.pg_inherits where inhrelid=r.oid or inhparent=r.oid),
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'position',a.attnum,
      'type',t.typname,'builtin',t.typnamespace='pg_catalog'::regnamespace,
      'notNull',a.attnotnull,'default',a.atthasdef,
      'defaultExpression',(select pg_catalog.pg_get_expr(d.adbin,d.adrelid)
        from pg_catalog.pg_attrdef d where d.adrelid=a.attrelid and d.adnum=a.attnum),
      'identity',a.attidentity,
      'generated',a.attgenerated,'dimensions',a.attndims) order by a.attnum)
      from pg_catalog.pg_attribute a join pg_catalog.pg_type t on t.oid=a.atttypid
      where a.attrelid=r.oid and a.attnum>0 and not a.attisdropped),
    'droppedColumns',(select count(*) from pg_catalog.pg_attribute where attrelid=r.oid and attnum>0 and attisdropped),
    'constraintCount',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid),
    'primaryKey',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid and contype='p'
      and conkey=array[1]::smallint[] and convalidated and not condeferrable),
    'profilesCascade',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid and contype='f'
      and conkey=array[1]::smallint[] and confrelid='public.profiles'::regclass
      and confkey=array[(select attnum from pg_catalog.pg_attribute where attrelid='public.profiles'::regclass
        and attname='id' and not attisdropped)]::smallint[]
      and confdeltype='c' and confupdtype='a' and confmatchtype='s'
      and convalidated and not condeferrable),
    'activityOrder',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid and contype='c'
      and convalidated and regexp_replace(pg_catalog.pg_get_expr(conbin,conrelid),'[[:space:]]','','g')
        ='(last_activity_at>=first_observed_at)'),
    'revisionNonnegative',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid and contype='c'
      and conkey=array[3]::smallint[] and convalidated and not condeferrable and not connoinherit
      and regexp_replace(pg_catalog.pg_get_expr(conbin,conrelid),'[[:space:]]','','g')='(revision>=0)'),
    'policyCount',(select count(*) from pg_catalog.pg_policy where polrelid=r.oid),
    'userTriggerCount',(select count(*) from pg_catalog.pg_trigger where tgrelid=r.oid and not tgisinternal),
    'unexpectedAcl',exists(select 1 from pg_catalog.aclexplode(coalesce(r.relacl,pg_catalog.acldefault('r',r.relowner))) a
      where a.grantee<>r.relowner and a.grantee<>coalesce((select oid from pg_catalog.pg_roles where rolname='service_role'),0))
      or exists(select 1 from pg_catalog.pg_attribute c cross join lateral pg_catalog.aclexplode(c.attacl) a
        where c.attrelid=r.oid and c.attnum>0 and not c.attisdropped and a.grantee<>r.relowner
          and a.grantee<>coalesce((select oid from pg_catalog.pg_roles where rolname='service_role'),0)),
    'anonAccess',pg_catalog.has_table_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or pg_catalog.has_any_column_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,REFERENCES'),
    'authenticatedAccess',pg_catalog.has_table_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or pg_catalog.has_any_column_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,REFERENCES')
  ) as metadata
  from wanted_tables wanted
  left join pg_catalog.pg_class r on r.oid=pg_catalog.to_regclass('public.'||wanted.name)
), wanted_functions(name,signature) as (values ('record_account_activity',''),('get_own_statistics_preference',''),
 ('enable_own_statistics_preference',''),('disable_own_statistics_preference',''),
 ('set_own_statistics_preference','boolean,bigint')),
function_metadata as (
 select wanted.name,jsonb_build_object(
   'present',p.oid is not null,
   'sameNameCount',(select count(*) from pg_catalog.pg_proc q where q.pronamespace='public'::regnamespace and q.proname=wanted.name),
   'kind',p.prokind,'language',l.lanname,'result',pg_catalog.pg_get_function_result(p.oid),
   'arguments',pg_catalog.pg_get_function_arguments(p.oid),'variadic',p.provariadic<>0,
   'strict',p.proisstrict,'returnsSet',p.proretset,'definer',p.prosecdef,'volatility',p.provolatile,
   'configuration',p.proconfig,
   'bodySha256',pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex'),
   'publicExecute',exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
     where a.grantee=0 and a.privilege_type='EXECUTE'),
   'unexpectedAcl',exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
     where (a.grantee<>p.proowner and a.grantee not in
       (select oid from pg_catalog.pg_roles where rolname in ('authenticated','service_role')))
       or (a.is_grantable and a.grantee=(select oid from pg_catalog.pg_roles where rolname='authenticated'))),
   'anonExecute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),
   'authenticatedExecute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
   'serviceExecute',pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
 ) as metadata from wanted_functions wanted
 left join pg_catalog.pg_proc p on p.oid=pg_catalog.to_regprocedure('public.'||wanted.name||'('||wanted.signature||')')
 left join pg_catalog.pg_language l on l.oid=p.prolang
)
select jsonb_build_object('schemaVersion',2,
 'tables',(select jsonb_object_agg(name,metadata) from table_metadata),
 'functions',(select jsonb_object_agg(name,metadata) from function_metadata)) as metadata) q;
  foreach function_name in array array['record_account_activity','get_own_statistics_preference','enable_own_statistics_preference','disable_own_statistics_preference','set_own_statistics_preference'] loop
    if pg_catalog.jsonb_typeof(account_observed #> array['functions',function_name,'serviceExecute']) is distinct from 'boolean'
      then raise exception 'CMW_SQL_SCHEMA2_SERVICE_SHAPE'; end if;
    -- Exact existing230 normalization only. ACL itself is preserved separately.
    account_observed:=pg_catalog.jsonb_set(account_observed,array['functions',function_name,'serviceExecute'],'false'::jsonb,false);
    if account_observed #> array['functions',function_name,'configuration']='["search_path="]'::jsonb then
      account_observed:=pg_catalog.jsonb_set(account_observed,array['functions',function_name,'configuration'],pg_catalog.jsonb_build_array('search_path=""'),false);
    end if;
  end loop;
  if account_observed is distinct from $cmw_expected${"schemaVersion":2,"tables":{"account_activity_journal":{"present":true,"regular":true,"rls":true,"forceRls":false,"inheritance":false,"columns":[{"name":"user_id","position":1,"type":"uuid","builtin":true,"notNull":true,"default":false,"defaultExpression":null,"identity":"","generated":"","dimensions":0},{"name":"first_observed_at","position":2,"type":"timestamptz","builtin":true,"notNull":true,"default":false,"defaultExpression":null,"identity":"","generated":"","dimensions":0},{"name":"last_activity_at","position":3,"type":"timestamptz","builtin":true,"notNull":true,"default":false,"defaultExpression":null,"identity":"","generated":"","dimensions":0}],"droppedColumns":0,"constraintCount":3,"primaryKey":1,"profilesCascade":1,"activityOrder":1,"revisionNonnegative":0,"policyCount":0,"userTriggerCount":0,"unexpectedAcl":false,"anonAccess":false,"authenticatedAccess":false},"account_statistics_preferences":{"present":true,"regular":true,"rls":true,"forceRls":false,"inheritance":false,"columns":[{"name":"user_id","position":1,"type":"uuid","builtin":true,"notNull":true,"default":false,"defaultExpression":null,"identity":"","generated":"","dimensions":0},{"name":"enabled","position":2,"type":"bool","builtin":true,"notNull":true,"default":false,"defaultExpression":null,"identity":"","generated":"","dimensions":0},{"name":"revision","position":3,"type":"int8","builtin":true,"notNull":true,"default":true,"defaultExpression":"0","identity":"","generated":"","dimensions":0}],"droppedColumns":0,"constraintCount":3,"primaryKey":1,"profilesCascade":1,"activityOrder":0,"revisionNonnegative":1,"policyCount":0,"userTriggerCount":0,"unexpectedAcl":false,"anonAccess":false,"authenticatedAccess":false}},"functions":{"record_account_activity":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"a7ae8ee7e0cbe7688d94ea36728e1e2f70cecec7900bab4117db00377337cc2a","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false},"get_own_statistics_preference":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"77405eb8ad047c59e9352893b91d35041c93fc7b4e4b7e52311612cbbc7b3c02","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false},"enable_own_statistics_preference":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"2e51ed1903aa8e8e4de40ddccc94a6e05f4f0d34bd8bb21b4e96ed34fd19666b","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false},"disable_own_statistics_preference":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"b1275e656d398f5b240990bb8a8401c3166c66121189cc205fc5c0154924c4f5","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false},"set_own_statistics_preference":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"p_enabled boolean, p_expected_revision bigint","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"acd4d566a25d0fc251cd52bb58a8edccfb1aa7de02e4f751f69becb95a0e7bf1","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false}}}$cmw_expected$::jsonb
    then raise exception 'CMW_SQL_EXACT_SCHEMA2_REQUIRED'; end if;

  select pg_catalog.jsonb_build_object(
    'functions',(select pg_catalog.jsonb_object_agg(p.oid::text,
      pg_catalog.to_jsonb(p)-array['prosrc','prosqlbody']) from pg_catalog.pg_proc p
      where p.oid=any(array['public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)'::regprocedure,'public.version_admin_document()'::regprocedure,'public.ravradar_ravscore_checkpoint_canonical_time(text)'::regprocedure,'public.ravradar_ravscore_checkpoint_has_forbidden_key(jsonb)'::regprocedure,'public.ravradar_ravscore_checkpoint_grid_ffc_state_valid(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_grid_ffc_payload_valid(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_grid_249_state_valid(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_grid_249_payload_valid(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_grid_c1ac_state_valid(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_grid_c1ac_payload_valid(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_native_identity_i71_state_valid(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_native_identity_i71_payload_valid(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_cmw_predecessor_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_cmw0200_state_valid(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_cmw0200_payload_valid(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_native_origin_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_integrated_state_valid(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_candidate_state_valid(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_payload_valid(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_userdata_predecessor_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_water_level_predecessor_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_owner_current_predecessor_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_cp_close_predecessor_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_top20_predecessor_projection(jsonb,timestamptz)'::regprocedure,'public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)'::regprocedure,'public.ravradar_ravscore_checkpoint_contract()'::regprocedure,'public.ravradar_ravscore_checkpoint_integrated_state_reason(jsonb,text)'::regprocedure,'public.ravradar_ravscore_checkpoint_payload_reason(jsonb,timestamptz)'::regprocedure])),
    'accountFunctions',(select pg_catalog.jsonb_object_agg(p.proname,pg_catalog.to_jsonb(p))
      from pg_catalog.pg_proc p where p.pronamespace='public'::regnamespace and p.proname=any(array[
        'record_account_activity','get_own_statistics_preference','enable_own_statistics_preference',
        'disable_own_statistics_preference','set_own_statistics_preference'])),
    'tables',(select pg_catalog.jsonb_object_agg(r.relname,pg_catalog.jsonb_build_object(
      'relation',pg_catalog.jsonb_build_object('oid',r.oid,'owner',r.relowner,'acl',r.relacl,
        'kind',r.relkind,'rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,'options',r.reloptions),
      'columns',(select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) order by a.attnum) from pg_catalog.pg_attribute a where a.attrelid=r.oid),
      'constraints',(select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c where c.conrelid=r.oid),
      'policies',(select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p) order by p.oid) from pg_catalog.pg_policy p where p.polrelid=r.oid)))
      from pg_catalog.pg_class r where r.oid=any(array['public.account_activity_journal'::regclass,'public.account_statistics_preferences'::regclass]))) into after_catalog;

  if after_catalog is distinct from original_catalog
    then raise exception 'ASSISTANT_SAME_H0_ORIGINAL_PROPERTIES_OR_ACCOUNT_CHANGED'; end if;
end;
$assistant_same_h0_successor$;

notify pgrst, 'reload schema';

commit;
