-- UNISSUED app-only candidate after the 75 issued M2 migrations.
-- Manual owner PG stage only. No Auth deletion, D1 ACK, inactivity authority,
-- native activity hook, notice sender, scheduler or final completion RPC.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.account_erasure_operations (
  operation_id uuid primary key,
  target_user_id uuid not null,
  requested_by uuid not null,
  mode text not null default 'MANUAL_OWNER' check (mode = 'MANUAL_OWNER'),
  state text not null check (state in ('PREPARED','HOLD_ACTIVITY_CHANGED','HOLD_POLICY','PG_STAGED_AUTH_PENDING')),
  hold_reason text check (hold_reason in ('ACTIVITY_CHANGED','PRIVILEGED_TARGET','REFERENCE_POLICY','REFERENCE_CATALOG_UNKNOWN','TARGET_MISSING')),
  activity_first timestamptz,
  activity_last timestamptz,
  profile_was_active boolean not null,
  prepared_at timestamptz not null,
  updated_at timestamptz not null,
  pg_staged_at timestamptz,
  pg_rows_removed bigint not null default 0 check (pg_rows_removed between 0 and 9007199254740991),
  check (operation_id <> '00000000-0000-0000-0000-000000000000'::uuid),
  check (target_user_id <> requested_by),
  check ((activity_first is null) = (activity_last is null)),
  check (activity_first is null or (isfinite(activity_first) and isfinite(activity_last) and activity_first <= activity_last)),
  check (isfinite(prepared_at) and isfinite(updated_at) and prepared_at <= updated_at),
  check ((state = 'PG_STAGED_AUTH_PENDING') = (pg_staged_at is not null)),
  check (pg_staged_at is null or (isfinite(pg_staged_at) and pg_staged_at >= prepared_at)),
  check ((state in ('HOLD_ACTIVITY_CHANGED','HOLD_POLICY')) = (hold_reason is not null)),
  check (state = 'PG_STAGED_AUTH_PENDING' or pg_rows_removed = 0)
);
-- Deliberately no FK to Auth/profiles: identity and retry ownership survive deletion.
create unique index account_erasure_one_active_target
  on public.account_erasure_operations(target_user_id)
  where state in ('PREPARED','PG_STAGED_AUTH_PENDING');
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
  return null;
end;
$policy$;
revoke all on function public.account_erasure_policy_hold(uuid) from public, anon, authenticated, service_role;

create function public.get_account_erasure_status(p_operation uuid)
returns jsonb language plpgsql security definer set search_path = '' as $status$
declare actor uuid := public.account_erasure_require_owner(); operation public.account_erasure_operations%rowtype;
begin
  select * into operation from public.account_erasure_operations where operation_id = p_operation and requested_by = actor;
  if not found then raise exception 'ACCOUNT_ERASURE_OPERATION_UNKNOWN' using errcode = '22023'; end if;
  return jsonb_build_object('operationId',operation.operation_id,'mode',operation.mode,'state',operation.state,
    'holdReason',operation.hold_reason,'pgStageCommitted',operation.state = 'PG_STAGED_AUTH_PENDING',
    'pgRowsRemoved',operation.pg_rows_removed,'authAdminIntegrated',false,'authDeleted',false,
    'd1Acknowledged',false,'complete',false);
end;
$status$;
revoke all on function public.get_account_erasure_status(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_account_erasure_status(uuid) to authenticated;

create function public.find_account_erasure_operation(p_target uuid)
returns jsonb language plpgsql security definer set search_path = '' as $find$
declare actor uuid := public.account_erasure_require_owner(); operation public.account_erasure_operations%rowtype;
begin
  if p_target is null then raise exception 'ACCOUNT_ERASURE_INPUT_INVALID' using errcode = '22023'; end if;
  select * into operation from public.account_erasure_operations where target_user_id = p_target
    and state in ('PREPARED','PG_STAGED_AUTH_PENDING');
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
    where target_user_id = any(targets) and state = 'PG_STAGED_AUTH_PENDING') then
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
  if exists(select 1 from public.account_erasure_operations where state = 'PG_STAGED_AUTH_PENDING'
    and target_user_id = NEW.id) then
    raise exception 'ACCOUNT_ERASURE_PROFILE_FENCED' using errcode = '42501';
  end if;
  if TG_OP = 'UPDATE' then
    if exists(select 1 from public.account_erasure_operations
      where state = 'PG_STAGED_AUTH_PENDING' and target_user_id = OLD.id) then
      raise exception 'ACCOUNT_ERASURE_PROFILE_FENCED' using errcode = '42501';
    end if;
  end if;
  return NEW;
end;
$profiles$;
revoke all on function public.account_erasure_profile_guard() from public, anon, authenticated, service_role;
create trigger account_erasure_profile_write_guard
  before insert or update on public.profiles for each row execute function public.account_erasure_profile_guard();

comment on table public.account_erasure_operations is
  'Manual owner PG-stage retry/fence only. No Auth/profile FK, no inactivity authority, no Auth/D1/final completion proof. Restore must reconcile latest operations before reopening writers.';
commit;
