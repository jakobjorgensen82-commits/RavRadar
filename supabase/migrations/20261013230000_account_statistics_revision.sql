-- Append-only account preference revision; no statistics/deletion activation or binding change.

begin;

set local statement_timeout = '55s';

set local lock_timeout = '5s';

do $statistics_revision$
declare observed jsonb; original_catalog jsonb; after_catalog jsonb; function_name text;
begin
  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '20261013220000'
    then raise exception 'STATISTICS_REVISION_EXACT_220_PREDECESSOR_REQUIRED'; end if;
  lock table public.account_statistics_preferences, public.account_activity_journal in access exclusive mode;
  if exists(select 1 from pg_catalog.pg_proc where pronamespace='public'::regnamespace and proname='set_own_statistics_preference')
    then raise exception 'STATISTICS_REVISION_DESTINATION_EXISTS'; end if;

  select q.metadata into observed from (with wanted_tables(name) as (values ('account_activity_journal'),('account_statistics_preferences')),
table_metadata as (
  select wanted.name,jsonb_build_object(
    'present',r.oid is not null,
    'regular',r.relkind='r','rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,
    'inheritance',exists(select 1 from pg_catalog.pg_inherits where inhrelid=r.oid or inhparent=r.oid),
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'position',a.attnum,
      'type',t.typname,'builtin',t.typnamespace='pg_catalog'::regnamespace,
      'notNull',a.attnotnull,'default',a.atthasdef,'identity',a.attidentity,
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
), wanted_functions(name) as (values ('record_account_activity'),('get_own_statistics_preference'),
 ('enable_own_statistics_preference'),('disable_own_statistics_preference')),
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
 left join pg_catalog.pg_proc p on p.oid=pg_catalog.to_regprocedure('public.'||wanted.name||'()')
 left join pg_catalog.pg_language l on l.oid=p.prolang
)
select jsonb_build_object('schemaVersion',1,
 'tables',(select jsonb_object_agg(name,metadata) from table_metadata),
 'functions',(select jsonb_object_agg(name,metadata) from function_metadata)) as metadata) q;
  foreach function_name in array array['record_account_activity','get_own_statistics_preference','enable_own_statistics_preference','disable_own_statistics_preference'] loop
    if pg_catalog.jsonb_typeof(observed #> array['functions',function_name,'serviceExecute']) is distinct from 'boolean'
      then raise exception 'STATISTICS_REVISION_BEFORE_SERVICE_SHAPE'; end if;
    -- Preserve genuine213's pre-existing service defaults; the exact body still
    -- rejects service_role. Never normalize unexpectedAcl/PUBLIC/anon/auth.
    observed:=pg_catalog.jsonb_set(observed,array['functions',function_name,'serviceExecute'],'false'::jsonb,false);
    if observed #> array['functions',function_name,'configuration'] = '["search_path="]'::jsonb then
      observed:=pg_catalog.jsonb_set(observed,array['functions',function_name,'configuration'],pg_catalog.jsonb_build_array('search_path=""'),false);
    end if;
  end loop;
  if observed is distinct from $statistics_expected${"schemaVersion":1,"tables":{"account_activity_journal":{"present":true,"regular":true,"rls":true,"forceRls":false,"inheritance":false,"columns":[{"name":"user_id","position":1,"type":"uuid","builtin":true,"notNull":true,"default":false,"identity":"","generated":"","dimensions":0},{"name":"first_observed_at","position":2,"type":"timestamptz","builtin":true,"notNull":true,"default":false,"identity":"","generated":"","dimensions":0},{"name":"last_activity_at","position":3,"type":"timestamptz","builtin":true,"notNull":true,"default":false,"identity":"","generated":"","dimensions":0}],"droppedColumns":0,"constraintCount":3,"primaryKey":1,"profilesCascade":1,"activityOrder":1,"policyCount":0,"userTriggerCount":0,"unexpectedAcl":false,"anonAccess":false,"authenticatedAccess":false},"account_statistics_preferences":{"present":true,"regular":true,"rls":true,"forceRls":false,"inheritance":false,"columns":[{"name":"user_id","position":1,"type":"uuid","builtin":true,"notNull":true,"default":false,"identity":"","generated":"","dimensions":0},{"name":"enabled","position":2,"type":"bool","builtin":true,"notNull":true,"default":false,"identity":"","generated":"","dimensions":0}],"droppedColumns":0,"constraintCount":2,"primaryKey":1,"profilesCascade":1,"activityOrder":0,"policyCount":0,"userTriggerCount":0,"unexpectedAcl":false,"anonAccess":false,"authenticatedAccess":false}},"functions":{"record_account_activity":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"a7ae8ee7e0cbe7688d94ea36728e1e2f70cecec7900bab4117db00377337cc2a","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false},"get_own_statistics_preference":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"8e7299c79f404f3e0650e1bb2b035accabcde5e605c6765ed8e4e32afaeee60e","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false},"enable_own_statistics_preference":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"1f626db3dd25858a2e79434936d65b467d732028d74ef04fd7508587af30ece9","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false},"disable_own_statistics_preference":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"26952eb54232d140fb0b7461a705902a6f9af665317f0e5f76c1e16e2237b4fc","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false}}}$statistics_expected$::jsonb
    then raise exception 'STATISTICS_REVISION_BEFORE_CATALOG_MISMATCH'; end if;

  select jsonb_build_object(
 'functions',(select jsonb_object_agg(p.proname,jsonb_build_object('oid',p.oid,'owner',p.proowner,'acl',p.proacl))
   from pg_catalog.pg_proc p where p.oid=any(array[
    'public.record_account_activity()'::regprocedure,'public.get_own_statistics_preference()'::regprocedure,
    'public.enable_own_statistics_preference()'::regprocedure,'public.disable_own_statistics_preference()'::regprocedure])),
 'tables',(select jsonb_object_agg(r.relname,jsonb_build_object('oid',r.oid,'owner',r.relowner,'acl',r.relacl,
    'rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,'oldColumnAcl',(select jsonb_agg(jsonb_build_array(a.attnum,a.attacl) order by a.attnum)
       from pg_catalog.pg_attribute a where a.attrelid=r.oid and a.attnum>0 and not a.attisdropped
       and not (r.relname='account_statistics_preferences' and a.attname='revision'))))
   from pg_catalog.pg_class r where r.oid in ('public.account_activity_journal'::regclass,'public.account_statistics_preferences'::regclass)),
 'activity',pg_catalog.pg_get_functiondef('public.record_account_activity()'::regprocedure),
 'checkpoint',(select jsonb_build_object('oid',p.oid,'owner',p.proowner,'acl',p.proacl,'definition',pg_catalog.pg_get_functiondef(p.oid))
   from pg_catalog.pg_proc p where p.oid='public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)'::regprocedure)
) into original_catalog;

  execute $statistics_ddl_0$
alter table public.account_statistics_preferences
  add column revision bigint not null default 0 check (revision >= 0);
$statistics_ddl_0$;

  execute $statistics_ddl_1$
create or replace function public.get_own_statistics_preference()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  own_user_id uuid := auth.uid();
  stored_value boolean;
  stored_revision bigint;
begin
  if own_user_id is null or auth.role() is distinct from 'authenticated'
    or not exists (select 1 from public.profiles where id = own_user_id) then
    raise exception 'ACCOUNT_PREFERENCE_AUTH_REQUIRED' using errcode = '42501';
  end if;
  select enabled, revision into stored_value, stored_revision
    from public.account_statistics_preferences where user_id = own_user_id;
  if not found then
    return jsonb_build_object('enabled', true, 'source', 'default', 'revision', '0');
  end if;
  return jsonb_build_object('enabled', stored_value, 'source', 'stored', 'revision', stored_revision::text);
end;
$$;
$statistics_ddl_1$;

  execute $statistics_ddl_2$
create function public.set_own_statistics_preference(p_enabled boolean, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  own_user_id uuid := auth.uid();
  stored_revision bigint;
  next_revision bigint;
  saved_value boolean;
begin
  if own_user_id is null or auth.role() is distinct from 'authenticated' then
    raise exception 'ACCOUNT_PREFERENCE_AUTH_REQUIRED' using errcode = '42501';
  end if;
  -- One existing owner row serializes even the first absent-preference insert.
  -- No caller owner, browser time, receipt JSON or aggregate processing authority.
  perform 1 from public.profiles where id = own_user_id for update;
  if not found then
    raise exception 'ACCOUNT_PREFERENCE_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_enabled is null or (p_expected_revision is not null and p_expected_revision < 0) then
    raise exception 'ACCOUNT_PREFERENCE_INPUT_INVALID' using errcode = '22023';
  end if;
  select revision into stored_revision from public.account_statistics_preferences
    where user_id = own_user_id for update;
  if not found then stored_revision := 0; end if;
  if p_enabled and (p_expected_revision is null or p_expected_revision <> stored_revision) then
    raise exception 'ACCOUNT_PREFERENCE_REVISION_CONFLICT' using errcode = '40001';
  end if;
  -- OFF may use an older read, never a fabricated future revision. Legacy OFF
  -- has no read receipt and is also safe: it still increments this owner revision.
  if not p_enabled and p_expected_revision is not null and p_expected_revision > stored_revision then
    raise exception 'ACCOUNT_PREFERENCE_REVISION_CONFLICT' using errcode = '40001';
  end if;
  if stored_revision = 9223372036854775807 then
    raise exception 'ACCOUNT_PREFERENCE_REVISION_EXHAUSTED' using errcode = '22003';
  end if;
  next_revision := stored_revision + 1;
  insert into public.account_statistics_preferences (user_id, enabled, revision)
    values (own_user_id, p_enabled, next_revision)
    on conflict (user_id) do update set enabled = excluded.enabled, revision = excluded.revision
    returning enabled, revision into saved_value, next_revision;
  return jsonb_build_object('enabled', saved_value, 'source', 'stored', 'revision', next_revision::text);
end;
$$;
$statistics_ddl_2$;

  execute $statistics_ddl_3$
create or replace function public.enable_own_statistics_preference()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare own_user_id uuid := auth.uid();
begin
  if own_user_id is null or auth.role() is distinct from 'authenticated'
    or not exists (select 1 from public.profiles where id = own_user_id) then
    raise exception 'ACCOUNT_PREFERENCE_AUTH_REQUIRED' using errcode = '42501';
  end if;
  raise exception 'ACCOUNT_PREFERENCE_REVISION_REQUIRED' using errcode = '22023';
end;
$$;
$statistics_ddl_3$;

  execute $statistics_ddl_4$
create or replace function public.disable_own_statistics_preference()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  return public.set_own_statistics_preference(false, null);
end;
$$;
$statistics_ddl_4$;

  execute $statistics_ddl_5$
revoke all on function public.set_own_statistics_preference(boolean, bigint) from public, anon, authenticated;
$statistics_ddl_5$;

  execute $statistics_ddl_6$
grant execute on function public.set_own_statistics_preference(boolean, bigint) to authenticated;
$statistics_ddl_6$;

  select q.metadata into observed from (with wanted_tables(name) as (values ('account_activity_journal'),('account_statistics_preferences')),
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
    if pg_catalog.jsonb_typeof(observed #> array['functions',function_name,'serviceExecute']) is distinct from 'boolean'
      then raise exception 'STATISTICS_REVISION_AFTER_SERVICE_SHAPE'; end if;
    -- Preserve genuine213's pre-existing service defaults; the exact body still
    -- rejects service_role. Never normalize unexpectedAcl/PUBLIC/anon/auth.
    observed:=pg_catalog.jsonb_set(observed,array['functions',function_name,'serviceExecute'],'false'::jsonb,false);
    if observed #> array['functions',function_name,'configuration'] = '["search_path="]'::jsonb then
      observed:=pg_catalog.jsonb_set(observed,array['functions',function_name,'configuration'],pg_catalog.jsonb_build_array('search_path=""'),false);
    end if;
  end loop;
  if observed is distinct from $statistics_expected${"schemaVersion":2,"tables":{"account_activity_journal":{"present":true,"regular":true,"rls":true,"forceRls":false,"inheritance":false,"columns":[{"name":"user_id","position":1,"type":"uuid","builtin":true,"notNull":true,"default":false,"defaultExpression":null,"identity":"","generated":"","dimensions":0},{"name":"first_observed_at","position":2,"type":"timestamptz","builtin":true,"notNull":true,"default":false,"defaultExpression":null,"identity":"","generated":"","dimensions":0},{"name":"last_activity_at","position":3,"type":"timestamptz","builtin":true,"notNull":true,"default":false,"defaultExpression":null,"identity":"","generated":"","dimensions":0}],"droppedColumns":0,"constraintCount":3,"primaryKey":1,"profilesCascade":1,"activityOrder":1,"revisionNonnegative":0,"policyCount":0,"userTriggerCount":0,"unexpectedAcl":false,"anonAccess":false,"authenticatedAccess":false},"account_statistics_preferences":{"present":true,"regular":true,"rls":true,"forceRls":false,"inheritance":false,"columns":[{"name":"user_id","position":1,"type":"uuid","builtin":true,"notNull":true,"default":false,"defaultExpression":null,"identity":"","generated":"","dimensions":0},{"name":"enabled","position":2,"type":"bool","builtin":true,"notNull":true,"default":false,"defaultExpression":null,"identity":"","generated":"","dimensions":0},{"name":"revision","position":3,"type":"int8","builtin":true,"notNull":true,"default":true,"defaultExpression":"0","identity":"","generated":"","dimensions":0}],"droppedColumns":0,"constraintCount":3,"primaryKey":1,"profilesCascade":1,"activityOrder":0,"revisionNonnegative":1,"policyCount":0,"userTriggerCount":0,"unexpectedAcl":false,"anonAccess":false,"authenticatedAccess":false}},"functions":{"record_account_activity":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"a7ae8ee7e0cbe7688d94ea36728e1e2f70cecec7900bab4117db00377337cc2a","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false},"get_own_statistics_preference":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"77405eb8ad047c59e9352893b91d35041c93fc7b4e4b7e52311612cbbc7b3c02","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false},"enable_own_statistics_preference":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"2e51ed1903aa8e8e4de40ddccc94a6e05f4f0d34bd8bb21b4e96ed34fd19666b","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false},"disable_own_statistics_preference":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"b1275e656d398f5b240990bb8a8401c3166c66121189cc205fc5c0154924c4f5","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false},"set_own_statistics_preference":{"present":true,"sameNameCount":1,"kind":"f","language":"plpgsql","result":"jsonb","arguments":"p_enabled boolean, p_expected_revision bigint","variadic":false,"strict":false,"returnsSet":false,"definer":true,"volatility":"v","configuration":["search_path=\"\""],"bodySha256":"acd4d566a25d0fc251cd52bb58a8edccfb1aa7de02e4f751f69becb95a0e7bf1","publicExecute":false,"unexpectedAcl":false,"anonExecute":false,"authenticatedExecute":true,"serviceExecute":false}}}$statistics_expected$::jsonb
    then raise exception 'STATISTICS_REVISION_AFTER_CATALOG_MISMATCH'; end if;

  select jsonb_build_object(
 'functions',(select jsonb_object_agg(p.proname,jsonb_build_object('oid',p.oid,'owner',p.proowner,'acl',p.proacl))
   from pg_catalog.pg_proc p where p.oid=any(array[
    'public.record_account_activity()'::regprocedure,'public.get_own_statistics_preference()'::regprocedure,
    'public.enable_own_statistics_preference()'::regprocedure,'public.disable_own_statistics_preference()'::regprocedure])),
 'tables',(select jsonb_object_agg(r.relname,jsonb_build_object('oid',r.oid,'owner',r.relowner,'acl',r.relacl,
    'rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,'oldColumnAcl',(select jsonb_agg(jsonb_build_array(a.attnum,a.attacl) order by a.attnum)
       from pg_catalog.pg_attribute a where a.attrelid=r.oid and a.attnum>0 and not a.attisdropped
       and not (r.relname='account_statistics_preferences' and a.attname='revision'))))
   from pg_catalog.pg_class r where r.oid in ('public.account_activity_journal'::regclass,'public.account_statistics_preferences'::regclass)),
 'activity',pg_catalog.pg_get_functiondef('public.record_account_activity()'::regprocedure),
 'checkpoint',(select jsonb_build_object('oid',p.oid,'owner',p.proowner,'acl',p.proacl,'definition',pg_catalog.pg_get_functiondef(p.oid))
   from pg_catalog.pg_proc p where p.oid='public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)'::regprocedure)
) into after_catalog;

  if after_catalog is distinct from original_catalog then raise exception 'STATISTICS_REVISION_ORIGINAL_CATALOG_CHANGED'; end if;
end;
$statistics_revision$;

notify pgrst, 'reload schema';

commit;
