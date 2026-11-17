-- UNISSUED app-only candidate after the 75 issued M2 migrations.
-- Manual owner lifecycle only. Auth and D1 HTTP stay in the existing Edge
-- controller; SQL stores their qualified acknowledgements. No automatic
-- eligibility, native activity hook, notice sender or scheduler is enabled.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.account_erasure_operations (
  operation_id uuid primary key,
  target_user_id uuid not null,
  requested_by uuid not null,
  mode text not null default 'MANUAL_OWNER' check (mode = 'MANUAL_OWNER'),
  state text not null check (state in ('PREPARED','HOLD_ACTIVITY_CHANGED','HOLD_POLICY','PG_STAGED_AUTH_PENDING',
    'AUTH_ATTEMPTED','AUTH_ABSENT_D1_PENDING','COMPLETE')),
  hold_reason text check (hold_reason in ('ACTIVITY_CHANGED','PRIVILEGED_TARGET','REFERENCE_POLICY',
    'REFERENCE_CATALOG_UNKNOWN','TARGET_MISSING','STORAGE_CATALOG_UNKNOWN','STORAGE_POLICY_UNQUALIFIED','STORAGE_OWNERSHIP',
    'AUTH_GENERATION_CHANGED')),
  activity_first timestamptz,
  activity_last timestamptz,
  profile_was_active boolean not null,
  prepared_at timestamptz not null,
  updated_at timestamptz not null,
  pg_staged_at timestamptz,
  pg_rows_removed bigint not null default 0 check (pg_rows_removed between 0 and 9007199254740991),
  auth_attempt_id uuid,
  auth_attempt_ids uuid[] not null default '{}'::uuid[],
  auth_user_created_at text,
  auth_claimed_at timestamptz,
  auth_absent_at timestamptz,
  d1_owner_subject text check (d1_owner_subject is null or d1_owner_subject ~ '^usr_v1_[A-Za-z0-9_-]{43}$'),
  d1_ack_at timestamptz,
  d1_deleted_count bigint check (d1_deleted_count between 0 and 9007199254740991),
  check (operation_id <> '00000000-0000-0000-0000-000000000000'::uuid),
  check (target_user_id <> requested_by),
  check ((activity_first is null) = (activity_last is null)),
  check (activity_first is null or (isfinite(activity_first) and isfinite(activity_last) and activity_first <= activity_last)),
  check (isfinite(prepared_at) and isfinite(updated_at) and prepared_at <= updated_at),
  check ((state in ('PG_STAGED_AUTH_PENDING','AUTH_ATTEMPTED','AUTH_ABSENT_D1_PENDING','COMPLETE')) = (pg_staged_at is not null)),
  check (pg_staged_at is null or (isfinite(pg_staged_at) and pg_staged_at >= prepared_at)),
  check (state not in ('HOLD_ACTIVITY_CHANGED','HOLD_POLICY') or hold_reason is not null),
  check (state not in ('PREPARED','COMPLETE') or hold_reason is null),
  check (pg_staged_at is not null or pg_rows_removed = 0),
  check (coalesce(array_ndims(auth_attempt_ids),1) = 1 and coalesce(array_lower(auth_attempt_ids,1),1) = 1
    and array_position(auth_attempt_ids,null) is null and not ('00000000-0000-0000-0000-000000000000'::uuid = any(auth_attempt_ids))),
  check (auth_attempt_id is not distinct from auth_attempt_ids[cardinality(auth_attempt_ids)]),
  check ((auth_user_created_at is not null) = (auth_claimed_at is not null)),
  check (state <> 'AUTH_ATTEMPTED' or auth_claimed_at is not null),
  check (auth_user_created_at is null or auth_user_created_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,9})?Z$'),
  check (auth_claimed_at is null or (auth_attempt_id is not null and isfinite(auth_claimed_at) and auth_claimed_at >= pg_staged_at)),
  check ((state in ('AUTH_ABSENT_D1_PENDING','COMPLETE')) = (auth_absent_at is not null)),
  check (auth_absent_at is null or (auth_attempt_id is not null and d1_owner_subject is not null
    and isfinite(auth_absent_at) and auth_absent_at >= coalesce(auth_claimed_at,pg_staged_at))),
  check ((state = 'COMPLETE') = (d1_ack_at is not null)),
  check ((d1_ack_at is not null) = (d1_deleted_count is not null)),
  check (d1_ack_at is null or (isfinite(d1_ack_at) and d1_ack_at >= auth_absent_at)),
  check (auth_attempt_id is null or (pg_staged_at is not null and d1_owner_subject is not null))
);
-- Deliberately no FK to Auth/profiles: identity and retry ownership survive deletion.
create unique index account_erasure_one_active_target
  on public.account_erasure_operations(target_user_id)
  where state = 'PREPARED' or pg_staged_at is not null;
alter table public.account_erasure_operations enable row level security;
alter table public.account_erasure_operations force row level security;
revoke all on public.account_erasure_operations from public, anon, authenticated, service_role;

create function public.account_erasure_require_owner()
returns uuid language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $owner$
declare actor uuid := auth.uid();
begin
  if actor is null or auth.role() is distinct from 'authenticated' then
    raise exception 'ACCOUNT_ERASURE_OWNER_REQUIRED' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = actor and role = 'owner' and is_active for share;
  if not found or (select count(*) from public.profiles where role = 'owner') <> 1 then
    raise exception 'ACCOUNT_ERASURE_OWNER_REQUIRED' using errcode = '42501';
  end if;
  return actor;
end;
$owner$;
revoke all on function public.account_erasure_require_owner() from public, anon, authenticated, service_role;

create function public.account_erasure_check_metadata()
returns jsonb language plpgsql stable security definer set search_path = '' set standard_conforming_strings = 'on' as $check_metadata$
begin
  -- Code-only catalog definitions, canonicalized by this exact PostgreSQL
  -- major and fixed function settings; never account rows or CHECK values.
  return jsonb_build_object('format','PG_CONSTRAINTDEF_V1',
    'postgresMajor',pg_catalog.current_setting('server_version_num')::integer / 10000,
    'definitions',(select jsonb_agg(jsonb_build_array(conname,pg_catalog.pg_get_constraintdef(oid,false))
      order by conname::text collate pg_catalog."C") from pg_catalog.pg_constraint
      where conrelid = 'public.account_erasure_operations'::regclass and contype = 'c'));
end;
$check_metadata$;
revoke all on function public.account_erasure_check_metadata() from public, anon, authenticated, service_role;

create function public.account_erasure_require_service_owner(p_actor uuid)
returns uuid language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $service_owner$
begin
  if p_actor is null or auth.role() is distinct from 'service_role' then
    raise exception 'ACCOUNT_ERASURE_SERVICE_OWNER_REQUIRED' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = p_actor and role = 'owner' and is_active for share;
  if not found or (select count(*) from public.profiles where role = 'owner') <> 1 then
    raise exception 'ACCOUNT_ERASURE_SERVICE_OWNER_REQUIRED' using errcode = '42501';
  end if;
  return p_actor;
end;
$service_owner$;
revoke all on function public.account_erasure_require_service_owner(uuid) from public, anon, authenticated, service_role;

create function public.account_erasure_storage_hold(p_target uuid)
returns text language plpgsql security definer set search_path = '' as $storage$
declare item record; relation_oid oid; has_owner boolean;
begin
  -- No application account Storage writer exists in M2. Qualify the smaller
  -- default-deny contract instead of changing vendor schema/policies. A client
  -- INSERT/UPDATE policy (even one we cannot interpret) is HOLD, never a guess.
  if exists(select 1 from pg_catalog.pg_roles where rolname in ('anon','authenticated') and (rolsuper or rolbypassrls)) then
    return 'STORAGE_POLICY_UNQUALIFIED';
  end if;
  for item in select * from (values
    ('storage.objects','owner','uuid'),('storage.objects','owner_id','text'),
    ('storage.buckets','owner','uuid'),('storage.buckets','owner_id','text'),
    ('storage.s3_multipart_uploads','owner_id','text'),('storage.s3_multipart_uploads_parts','owner_id','text')
  ) as owners(relation_name,column_name,column_type)
  loop
    relation_oid := pg_catalog.to_regclass(item.relation_name);
    if relation_oid is null or not exists(select 1 from pg_catalog.pg_class where oid = relation_oid and relkind = 'r' and relrowsecurity)
      or not exists(select 1 from pg_catalog.pg_attribute where attrelid = relation_oid and attname = item.column_name
        and atttypid = pg_catalog.to_regtype(item.column_type) and attnum > 0 and not attisdropped) then
      return 'STORAGE_CATALOG_UNKNOWN';
    end if;
    if exists(select 1 from pg_catalog.pg_class c where c.oid = relation_oid
      and (pg_catalog.pg_has_role('anon',c.relowner,'MEMBER') or pg_catalog.pg_has_role('authenticated',c.relowner,'MEMBER')))
      or exists(select 1 from pg_catalog.pg_policy p cross join lateral unnest(p.polroles) as roles(role_oid)
        where p.polrelid = relation_oid and p.polcmd in ('a','w','*') and
          case when role_oid = 0 then true else pg_catalog.pg_has_role('anon',role_oid,'MEMBER')
            or pg_catalog.pg_has_role('authenticated',role_oid,'MEMBER') end) then
      return 'STORAGE_POLICY_UNQUALIFIED';
    end if;
    execute pg_catalog.format('select exists(select 1 from %s where lower(%I::text) = $1::text)',relation_oid::regclass,item.column_name)
      into has_owner using p_target;
    if has_owner then return 'STORAGE_OWNERSHIP'; end if;
  end loop;
  return null;
end;
$storage$;
revoke all on function public.account_erasure_storage_hold(uuid) from public, anon, authenticated, service_role;

create function public.account_erasure_policy_hold(p_target uuid)
returns text language plpgsql security definer set search_path = '' as $policy$
declare profile public.profiles%rowtype; item record; relation_oid oid; has_reference boolean;
begin
  select * into profile from public.profiles where id = p_target;
  if not found then return 'TARGET_MISSING'; end if;
  if profile.role is null or profile.role = 'owner' or profile.role not in ('expert','user')
    or lower(btrim(coalesce(profile.email,''))) = 'expert@ravradar.dk'
    or exists(select 1 from public.user_permissions where user_id = p_target and enabled) then
    return 'PRIVILEGED_TARGET';
  end if;
  -- Existing protected categories/rights are authority; a UI category is not.
  -- A link is HOLD, never permission to guess role/review/SCIM retention policy.
  for item in select * from (values
    ('public.app_user_roles','user_id'),
    ('public.handbook_reviews','created_by'),
    ('public.handbook_reviews','resolved_by'),
    ('public.handbook_review_versions','changed_by'),
    ('public.admin_documents','updated_by'),
    ('public.admin_document_versions','created_by'),
    ('public.admin_audit_log','actor_id'),
    ('auth.scim_users','user_id')) as refs(relation_name,column_name)
  loop
    relation_oid := pg_catalog.to_regclass(item.relation_name);
    if relation_oid is null or not exists(select 1 from pg_catalog.pg_class where oid = relation_oid and relkind = 'r')
      or not exists(select 1 from pg_catalog.pg_attribute where attrelid = relation_oid
        and attname = item.column_name and atttypid = 'uuid'::regtype and attnum > 0 and not attisdropped) then
      return 'REFERENCE_CATALOG_UNKNOWN';
    end if;
    execute pg_catalog.format('select exists(select 1 from %s where %I = $1)',relation_oid::regclass,item.column_name)
      into has_reference using p_target;
    if has_reference then return 'REFERENCE_POLICY'; end if;
  end loop;
  return public.account_erasure_storage_hold(p_target);
end;
$policy$;
revoke all on function public.account_erasure_policy_hold(uuid) from public, anon, authenticated, service_role;

create function public.account_erasure_status_json(p_operation uuid,p_actor uuid,p_internal boolean)
returns jsonb language plpgsql security definer set search_path = '' as $status_json$
declare operation public.account_erasure_operations%rowtype; result jsonb;
begin
  select * into operation from public.account_erasure_operations where operation_id = p_operation and requested_by = p_actor;
  if not found then raise exception 'ACCOUNT_ERASURE_OPERATION_UNKNOWN' using errcode = '22023'; end if;
  result := jsonb_build_object('operationId',operation.operation_id,'targetUserId',operation.target_user_id,
    'mode',operation.mode,'state',operation.state,'holdReason',operation.hold_reason,
    'pgStageCommitted',operation.pg_staged_at is not null,'pgRowsRemoved',operation.pg_rows_removed,
    'authAbsent',operation.auth_absent_at is not null,'d1Acknowledged',operation.d1_ack_at is not null,
    'd1DeletedCount',operation.d1_deleted_count,'complete',operation.state = 'COMPLETE');
  if p_internal then
    result := result || jsonb_build_object('authAttemptId',operation.auth_attempt_id,
      'authUserCreatedAt',operation.auth_user_created_at,'d1OwnerSubject',operation.d1_owner_subject);
  end if;
  return result;
end;
$status_json$;
revoke all on function public.account_erasure_status_json(uuid,uuid,boolean) from public, anon, authenticated, service_role;

create function public.get_account_erasure_status(p_operation uuid)
returns jsonb language plpgsql security definer set search_path = '' as $status$
begin
  return public.account_erasure_status_json(p_operation,public.account_erasure_require_owner(),false);
end;
$status$;
revoke all on function public.get_account_erasure_status(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_account_erasure_status(uuid) to authenticated;

create function public.list_account_erasure_operations(p_after uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $list$
declare actor uuid := public.account_erasure_require_owner(); result jsonb;
begin
  -- Keyset discovery survives a missing browser state and a deleted profile.
  -- Every HOLD remains visible; more than64 rows require an explicit next page.
  with selected as materialized(select operation_id from public.account_erasure_operations
    where requested_by = actor and state <> 'COMPLETE' and (p_after is null or operation_id > p_after)
    order by operation_id limit 65)
  select jsonb_build_object('scope','own-account-erasure-operations','rows',coalesce((
    select jsonb_agg(public.account_erasure_status_json(operation_id,actor,false) order by operation_id)
    from(select operation_id from selected order by operation_id limit 64) visible),'[]'::jsonb),
    'truncated',(select count(*) > 64 from selected)) into result;
  return result;
end;
$list$;
revoke all on function public.list_account_erasure_operations(uuid) from public, anon, authenticated, service_role;
grant execute on function public.list_account_erasure_operations(uuid) to authenticated;

create function public.find_account_erasure_operation(p_target uuid)
returns jsonb language plpgsql security definer set search_path = '' as $find$
declare actor uuid := public.account_erasure_require_owner(); operation public.account_erasure_operations%rowtype;
begin
  if p_target is null then raise exception 'ACCOUNT_ERASURE_INPUT_INVALID' using errcode = '22023'; end if;
  select * into operation from public.account_erasure_operations where target_user_id = p_target
    and (state = 'PREPARED' or pg_staged_at is not null);
  if not found then return jsonb_build_object('operationId',null,'state','NONE','complete',false); end if;
  if operation.requested_by <> actor then
    return jsonb_build_object('operationId',null,'state','HOLD_REQUESTER_CHANGED','complete',false);
  end if;
  return public.get_account_erasure_status(operation.operation_id);
end;
$find$;
revoke all on function public.find_account_erasure_operation(uuid) from public, anon, authenticated, service_role;
grant execute on function public.find_account_erasure_operation(uuid) to authenticated;

create function public.prepare_account_erasure(p_operation uuid,p_target uuid)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $prepare$
declare actor uuid := public.account_erasure_require_owner(); operation public.account_erasure_operations%rowtype;
  target public.profiles%rowtype; activity public.account_activity_journal%rowtype; reason text; checked_at timestamptz;
begin
  if p_operation is null or p_operation = '00000000-0000-0000-0000-000000000000'::uuid or p_target is null or p_target = actor then
    raise exception 'ACCOUNT_ERASURE_INPUT_INVALID' using errcode = '22023';
  end if;
  -- A retry works even after the future Auth controller has removed the profile.
  select * into operation from public.account_erasure_operations where operation_id = p_operation;
  if found then
    if operation.requested_by <> actor or operation.target_user_id <> p_target then
      raise exception 'ACCOUNT_ERASURE_UUID_CONFLICT' using errcode = '40001';
    end if;
    return public.get_account_erasure_status(p_operation);
  end if;
  select * into target from public.profiles where id = p_target for update;
  if not found then raise exception 'ACCOUNT_ERASURE_TARGET_UNKNOWN' using errcode = '22023'; end if;
  select * into activity from public.account_activity_journal where user_id = p_target for update;
  reason := public.account_erasure_policy_hold(p_target);
  checked_at := pg_catalog.clock_timestamp();
  begin
    insert into public.account_erasure_operations(operation_id,target_user_id,requested_by,state,hold_reason,
      activity_first,activity_last,profile_was_active,prepared_at,updated_at)
    values(p_operation,p_target,actor,case when reason is null then 'PREPARED' else 'HOLD_POLICY' end,reason,
      activity.first_observed_at,activity.last_activity_at,target.is_active,checked_at,checked_at)
    on conflict(operation_id) do nothing;
  exception when unique_violation then
    raise exception 'ACCOUNT_ERASURE_TARGET_BUSY' using errcode = '40001';
  end;
  select * into operation from public.account_erasure_operations where operation_id = p_operation;
  if operation.requested_by <> actor or operation.target_user_id <> p_target then
    raise exception 'ACCOUNT_ERASURE_UUID_CONFLICT' using errcode = '40001';
  end if;
  return public.get_account_erasure_status(p_operation);
end;
$prepare$;
revoke all on function public.prepare_account_erasure(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.prepare_account_erasure(uuid,uuid) to authenticated;

create function public.stage_account_erasure_pg(p_operation uuid,p_confirmation text)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $stage$
declare actor uuid := public.account_erasure_require_owner(); operation public.account_erasure_operations%rowtype;
  target public.profiles%rowtype; activity public.account_activity_journal%rowtype; reason text; removed bigint;
begin
  if p_operation is null or p_confirmation is distinct from 'STAGE-MANUAL-ACCOUNT-PG-ERASURE' then
    raise exception 'ACCOUNT_ERASURE_STAGE_CONFIRMATION_REQUIRED' using errcode = '22023';
  end if;
  -- Find immutable target, then the common target -> journal -> operation order.
  select * into operation from public.account_erasure_operations where operation_id = p_operation and requested_by = actor;
  if not found then raise exception 'ACCOUNT_ERASURE_OPERATION_UNKNOWN' using errcode = '22023'; end if;
  if operation.state <> 'PREPARED' then return public.get_account_erasure_status(p_operation); end if;
  select * into target from public.profiles where id = operation.target_user_id for update;
  select * into activity from public.account_activity_journal where user_id = operation.target_user_id for update;
  select * into operation from public.account_erasure_operations where operation_id = p_operation and requested_by = actor for update;
  if operation.state <> 'PREPARED' then return public.get_account_erasure_status(p_operation); end if;
  reason := public.account_erasure_policy_hold(operation.target_user_id);
  if reason is not null then
    update public.account_erasure_operations set state = 'HOLD_POLICY',hold_reason = reason,updated_at = pg_catalog.clock_timestamp()
      where operation_id = p_operation;
    return public.get_account_erasure_status(p_operation);
  end if;
  -- Positive freshness only: missing activity is not inactivity or complete Auth capture.
  if operation.activity_first is distinct from activity.first_observed_at
    or operation.activity_last is distinct from activity.last_activity_at then
    update public.account_erasure_operations set state = 'HOLD_ACTIVITY_CHANGED',hold_reason = 'ACTIVITY_CHANGED',
      updated_at = pg_catalog.clock_timestamp() where operation_id = p_operation;
    return public.get_account_erasure_status(p_operation);
  end if;
  -- This row update is a serialization point for older REPEATABLE READ writers;
  -- is_active alone is never represented as a GoTrue/JWT revocation barrier.
  update public.profiles set is_active = false where id = operation.target_user_id;
  update public.account_erasure_operations set state = 'PG_STAGED_AUTH_PENDING',pg_staged_at = pg_catalog.clock_timestamp(),
    updated_at = pg_catalog.clock_timestamp() where operation_id = p_operation;
  delete from public.observations where user_id = operation.target_user_id;
  get diagnostics removed = row_count;
  update public.account_erasure_operations set pg_rows_removed = removed where operation_id = p_operation;
  return public.get_account_erasure_status(p_operation);
end;
$stage$;
revoke all on function public.stage_account_erasure_pg(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.stage_account_erasure_pg(uuid,text) to authenticated;

create function public.get_account_erasure_service_status(p_operation uuid,p_actor uuid)
returns jsonb language plpgsql security definer set search_path = '' as $service_status$
begin
  return public.account_erasure_status_json(p_operation,public.account_erasure_require_service_owner(p_actor),true);
end;
$service_status$;
revoke all on function public.get_account_erasure_service_status(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_account_erasure_service_status(uuid,uuid) to service_role;

create function public.claim_account_erasure_auth(p_operation uuid,p_actor uuid,p_previous_attempt uuid,p_attempt uuid,
  p_auth_user_created_at text,p_d1_subject text)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $claim$
declare actor uuid := public.account_erasure_require_service_owner(p_actor);
  operation public.account_erasure_operations%rowtype; reason text;
begin
  if p_attempt is null or p_attempt = '00000000-0000-0000-0000-000000000000'::uuid
    or p_d1_subject is null or p_d1_subject !~ '^usr_v1_[A-Za-z0-9_-]{43}$'
    or p_auth_user_created_at is null or p_auth_user_created_at !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,9})?Z$' then
    raise exception 'ACCOUNT_ERASURE_INPUT_INVALID' using errcode = '22023';
  end if;
  begin
    if not isfinite(p_auth_user_created_at::timestamptz) then
      raise exception 'ACCOUNT_ERASURE_INPUT_INVALID' using errcode = '22023';
    end if;
  exception when invalid_datetime_format or datetime_field_overflow then
    raise exception 'ACCOUNT_ERASURE_INPUT_INVALID' using errcode = '22023';
  end;
  select * into operation from public.account_erasure_operations
    where operation_id = p_operation and requested_by = actor for update;
  if not found then raise exception 'ACCOUNT_ERASURE_OPERATION_UNKNOWN' using errcode = '22023'; end if;
  if operation.pg_staged_at is null then raise exception 'ACCOUNT_ERASURE_PG_STAGE_REQUIRED' using errcode = '22023'; end if;
  if operation.d1_owner_subject is not null and operation.d1_owner_subject <> p_d1_subject then
    raise exception 'ACCOUNT_ERASURE_SUBJECT_CONFLICT' using errcode = '40001';
  end if;
  -- Every previously used caller UUID stays spent, including A -> B -> A.
  -- A lost claim reply therefore authorizes readback only, never another DELETE.
  if p_attempt = any(operation.auth_attempt_ids) or operation.auth_absent_at is not null then
    return public.account_erasure_status_json(p_operation,actor,true) || jsonb_build_object('shouldIssueDelete',false);
  end if;
  if operation.auth_attempt_id is distinct from p_previous_attempt then
    raise exception 'ACCOUNT_ERASURE_ATTEMPT_CAS_CONFLICT' using errcode = '40001';
  end if;
  if operation.auth_user_created_at is not null and operation.auth_user_created_at <> p_auth_user_created_at then
    update public.account_erasure_operations set hold_reason = 'AUTH_GENERATION_CHANGED',updated_at = pg_catalog.clock_timestamp()
      where operation_id = p_operation;
    return public.account_erasure_status_json(p_operation,actor,true) || jsonb_build_object('shouldIssueDelete',false);
  end if;
  reason := public.account_erasure_storage_hold(operation.target_user_id);
  if reason is not null then
    update public.account_erasure_operations set hold_reason = reason,updated_at = pg_catalog.clock_timestamp()
      where operation_id = p_operation;
    return public.account_erasure_status_json(p_operation,actor,true) || jsonb_build_object('shouldIssueDelete',false);
  end if;
  -- The exact GoTrue created_at text is retained: no JavaScript millisecond
  -- conversion or PG timestamp reserialization may weaken generation equality.
  update public.account_erasure_operations set state = 'AUTH_ATTEMPTED',hold_reason = null,
    auth_attempt_id = p_attempt,auth_attempt_ids = array_append(auth_attempt_ids,p_attempt),
    auth_user_created_at = p_auth_user_created_at,auth_claimed_at = pg_catalog.clock_timestamp(),
    d1_owner_subject = p_d1_subject,updated_at = pg_catalog.clock_timestamp() where operation_id = p_operation;
  return public.account_erasure_status_json(p_operation,actor,true) || jsonb_build_object('shouldIssueDelete',true);
end;
$claim$;
revoke all on function public.claim_account_erasure_auth(uuid,uuid,uuid,uuid,text,text) from public, anon, authenticated, service_role;
grant execute on function public.claim_account_erasure_auth(uuid,uuid,uuid,uuid,text,text) to service_role;

create function public.acknowledge_account_erasure_auth_absent(p_operation uuid,p_actor uuid,p_previous_attempt uuid,
  p_attempt uuid,p_d1_subject text)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $auth_absent$
declare actor uuid := public.account_erasure_require_service_owner(p_actor); operation public.account_erasure_operations%rowtype;
begin
  if p_attempt is null or p_attempt = '00000000-0000-0000-0000-000000000000'::uuid
    or p_d1_subject is null or p_d1_subject !~ '^usr_v1_[A-Za-z0-9_-]{43}$' then
    raise exception 'ACCOUNT_ERASURE_INPUT_INVALID' using errcode = '22023';
  end if;
  select * into operation from public.account_erasure_operations
    where operation_id = p_operation and requested_by = actor for update;
  if not found then raise exception 'ACCOUNT_ERASURE_OPERATION_UNKNOWN' using errcode = '22023'; end if;
  if operation.pg_staged_at is null then raise exception 'ACCOUNT_ERASURE_PG_STAGE_REQUIRED' using errcode = '22023'; end if;
  if operation.d1_owner_subject is not null and operation.d1_owner_subject <> p_d1_subject then
    raise exception 'ACCOUNT_ERASURE_SUBJECT_CONFLICT' using errcode = '40001';
  end if;
  if operation.auth_absent_at is not null then return public.account_erasure_status_json(p_operation,actor,true); end if;
  if operation.auth_attempt_id is distinct from p_previous_attempt then
    raise exception 'ACCOUNT_ERASURE_ATTEMPT_CAS_CONFLICT' using errcode = '40001';
  end if;
  if p_attempt is distinct from operation.auth_attempt_id and p_attempt = any(operation.auth_attempt_ids) then
    raise exception 'ACCOUNT_ERASURE_ATTEMPT_REPLAY' using errcode = '40001';
  end if;
  -- Service caller attests only a qualified, exact-target adminGET404 with
  -- user_not_found. Initial absence binds correlation without a fake DELETE
  -- claim, invented present-generation or Auth SQL hard-delete.
  update public.account_erasure_operations set state = 'AUTH_ABSENT_D1_PENDING',hold_reason = null,
    auth_attempt_id = p_attempt,
    auth_attempt_ids = case when auth_attempt_id = p_attempt then auth_attempt_ids else array_append(auth_attempt_ids,p_attempt) end,
    auth_absent_at = pg_catalog.clock_timestamp(),d1_owner_subject = p_d1_subject,
    updated_at = pg_catalog.clock_timestamp() where operation_id = p_operation;
  return public.account_erasure_status_json(p_operation,actor,true);
end;
$auth_absent$;
revoke all on function public.acknowledge_account_erasure_auth_absent(uuid,uuid,uuid,uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.acknowledge_account_erasure_auth_absent(uuid,uuid,uuid,uuid,text) to service_role;

create function public.acknowledge_account_erasure_d1(p_operation uuid,p_actor uuid,p_attempt uuid,p_d1_subject text,p_deleted_count bigint)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $d1_ack$
declare actor uuid := public.account_erasure_require_service_owner(p_actor);
  operation public.account_erasure_operations%rowtype; reason text;
begin
  if p_attempt is null or p_d1_subject is null or p_deleted_count is null or p_deleted_count < 0 or p_deleted_count > 9007199254740991 then
    raise exception 'ACCOUNT_ERASURE_INPUT_INVALID' using errcode = '22023';
  end if;
  select * into operation from public.account_erasure_operations
    where operation_id = p_operation and requested_by = actor for update;
  if not found then raise exception 'ACCOUNT_ERASURE_OPERATION_UNKNOWN' using errcode = '22023'; end if;
  if operation.auth_attempt_id is distinct from p_attempt or operation.d1_owner_subject is distinct from p_d1_subject then
    raise exception 'ACCOUNT_ERASURE_ACK_BINDING_CONFLICT' using errcode = '40001';
  end if;
  if operation.pg_staged_at is null or operation.auth_absent_at is null then
    raise exception 'ACCOUNT_ERASURE_PRIOR_ACK_REQUIRED' using errcode = '22023';
  end if;
  if operation.state = 'COMPLETE' then return public.account_erasure_status_json(p_operation,actor,true); end if;
  reason := public.account_erasure_storage_hold(operation.target_user_id);
  if reason is not null then
    update public.account_erasure_operations set hold_reason = reason,updated_at = pg_catalog.clock_timestamp()
      where operation_id = p_operation;
    return public.account_erasure_status_json(p_operation,actor,true);
  end if;
  if exists(select 1 from auth.users where id = operation.target_user_id)
    or exists(select 1 from public.profiles where id = operation.target_user_id)
    or exists(select 1 from public.observations where user_id = operation.target_user_id)
    or exists(select 1 from public.account_activity_journal where user_id = operation.target_user_id)
    or exists(select 1 from public.account_statistics_preferences where user_id = operation.target_user_id)
    or exists(select 1 from public.user_permissions where user_id = operation.target_user_id) then
    -- Supplementary PG readback can refuse completion; it never substitutes
    -- for the already durable qualified GoTrue adminGET absence.
    raise exception 'ACCOUNT_ERASURE_PG_ROWS_REMAIN' using errcode = 'P0001';
  end if;
  -- Caller has awaited existing deleteCloudflareTrips: all ten durable
  -- tombstones, physical purge and physical absence assert, not guarded LIST.
  -- The ACK and sole final transition commit atomically, with the fence intact.
  update public.account_erasure_operations set state = 'COMPLETE',hold_reason = null,
    d1_ack_at = pg_catalog.clock_timestamp(),d1_deleted_count = p_deleted_count,
    updated_at = pg_catalog.clock_timestamp() where operation_id = p_operation;
  return public.account_erasure_status_json(p_operation,actor,true);
end;
$d1_ack$;
revoke all on function public.acknowledge_account_erasure_d1(uuid,uuid,uuid,text,bigint) from public, anon, authenticated, service_role;
grant execute on function public.acknowledge_account_erasure_d1(uuid,uuid,uuid,text,bigint) to service_role;

create function public.account_erasure_observation_guard()
returns trigger language plpgsql security definer set search_path = '' as $observations$
declare targets uuid[];
begin
  if TG_LEVEL <> 'ROW' or TG_WHEN <> 'BEFORE' or TG_RELID <> 'public.observations'::regclass or TG_OP not in ('INSERT','UPDATE') then
    raise exception 'ACCOUNT_ERASURE_GUARD_CONTEXT' using errcode = '42501';
  end if;
  targets := case when TG_OP = 'UPDATE' then array[OLD.user_id,NEW.user_id] else array[NEW.user_id] end;
  -- A strong nonblocking SHARE lock also conflicts with non-key profile changes.
  -- Lock before reading the fence: includes service-role UPSERT and OLD owner
  -- on owner changes/owner->NULL, while unrelated anonymous rows stay valid.
  begin
    perform id from public.profiles where id = any(targets) order by id for share nowait;
  exception when lock_not_available then
    raise exception 'ACCOUNT_ERASURE_WRITE_RETRY' using errcode = '55P03';
  end;
  if exists(select 1 from public.account_erasure_operations
    where target_user_id = any(targets) and pg_staged_at is not null) then
    raise exception 'ACCOUNT_ERASURE_WRITE_FENCED' using errcode = '42501';
  end if;
  return NEW;
end;
$observations$;
revoke all on function public.account_erasure_observation_guard() from public, anon, authenticated, service_role;
create trigger account_erasure_observation_write_guard
  before insert or update on public.observations for each row execute function public.account_erasure_observation_guard();

create function public.account_erasure_profile_guard()
returns trigger language plpgsql security definer set search_path = '' as $profiles$
begin
  if TG_LEVEL <> 'ROW' or TG_WHEN <> 'BEFORE' or TG_RELID <> 'public.profiles'::regclass or TG_OP not in ('INSERT','UPDATE') then
    raise exception 'ACCOUNT_ERASURE_GUARD_CONTEXT' using errcode = '42501';
  end if;
  if exists(select 1 from public.account_erasure_operations where pg_staged_at is not null
    and target_user_id = NEW.id) then
    raise exception 'ACCOUNT_ERASURE_PROFILE_FENCED' using errcode = '42501';
  end if;
  if TG_OP = 'UPDATE' then
    if exists(select 1 from public.account_erasure_operations
      where pg_staged_at is not null and target_user_id = OLD.id) then
      raise exception 'ACCOUNT_ERASURE_PROFILE_FENCED' using errcode = '42501';
    end if;
  end if;
  return NEW;
end;
$profiles$;
revoke all on function public.account_erasure_profile_guard() from public, anon, authenticated, service_role;
create trigger account_erasure_profile_write_guard
  before insert or update on public.profiles for each row execute function public.account_erasure_profile_guard();

create function public.account_erasure_auth_uuid_guard()
returns trigger language plpgsql security definer set search_path = '' as $auth_uuid$
begin
  if TG_LEVEL <> 'ROW' or TG_WHEN <> 'BEFORE' or TG_RELID <> 'auth.users'::regclass or TG_OP <> 'INSERT' then
    raise exception 'ACCOUNT_ERASURE_GUARD_CONTEXT' using errcode = '42501';
  end if;
  -- Serialize before an Auth PK wait; a genuinely new UUID has no profile.
  begin
    perform id from public.profiles where id = NEW.id for share nowait;
  exception when lock_not_available then
    raise exception 'ACCOUNT_ERASURE_WRITE_RETRY' using errcode = '55P03';
  end;
  if exists(select 1 from public.account_erasure_operations where target_user_id = NEW.id and pg_staged_at is not null) then
    raise exception 'ACCOUNT_ERASURE_AUTH_UUID_FENCED' using errcode = '42501';
  end if;
  return NEW;
end;
$auth_uuid$;
revoke all on function public.account_erasure_auth_uuid_guard() from public, anon, authenticated, service_role;
create trigger account_erasure_auth_uuid_insert_guard
  before insert on auth.users for each row execute function public.account_erasure_auth_uuid_guard();

comment on table public.account_erasure_operations is
  'Manual owner lifecycle outbox and permanent PG fence. No Auth/profile FK or inactivity authority. Auth and D1 evidence is service-only and must come from qualified controller readbacks. Restore must reconcile latest operations before reopening writers.';
commit;
