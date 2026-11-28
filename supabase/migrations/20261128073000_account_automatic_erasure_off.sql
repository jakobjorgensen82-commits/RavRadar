-- Connect expired confirmed notices to the existing private erasure outbox.
-- Installation leaves new automatic admissions OFF. No scheduler is installed.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.account_erasure_operations
  drop constraint account_erasure_operations_mode_check,
  add constraint account_erasure_operations_mode_check
    check (mode in ('MANUAL_OWNER','AUTOMATIC_INACTIVITY'));

create table public.account_automatic_erasure_policy (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  recovery_qualified boolean not null default false,
  check (not enabled or recovery_qualified)
);
insert into public.account_automatic_erasure_policy(singleton) values (true);

-- Freeze the admission provenance separately from the mutable notice state.
create table public.account_automatic_erasure_admissions (
  operation_id uuid primary key references public.account_erasure_operations(operation_id) on delete restrict,
  notice_revision bigint not null check (notice_revision > 0),
  auth_user_created_at text not null
    check (auth_user_created_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,9})?Z$'),
  recipient_digest text not null check (recipient_digest ~ '^[a-f0-9]{64}$')
);
alter table public.account_automatic_erasure_policy enable row level security;
alter table public.account_automatic_erasure_policy force row level security;
alter table public.account_automatic_erasure_admissions enable row level security;
alter table public.account_automatic_erasure_admissions force row level security;
revoke all on public.account_automatic_erasure_policy,public.account_automatic_erasure_admissions
  from public,anon,authenticated,service_role;

-- The shared Auth claim must also match the generation fixed at admission.
create function public.account_automatic_erasure_auth_generation_guard()
returns trigger language plpgsql security definer set search_path = '' as $generation$
begin
  if new.mode = 'AUTOMATIC_INACTIVITY' and new.auth_user_created_at is not null
    and not exists(select 1 from public.account_automatic_erasure_admissions
      where operation_id = new.operation_id and auth_user_created_at = new.auth_user_created_at) then
    raise exception 'ACCOUNT_AUTOMATIC_ERASURE_AUTH_CHANGED' using errcode = '40001';
  end if;
  return new;
end;
$generation$;
revoke all on function public.account_automatic_erasure_auth_generation_guard()
  from public,anon,authenticated,service_role;
create trigger account_automatic_erasure_auth_generation_guard
  before update of auth_user_created_at on public.account_erasure_operations
  for each row execute function public.account_automatic_erasure_auth_generation_guard();

create index account_inactivity_notice_erasure_due
  on public.account_inactivity_notices(delete_not_before,notice_id)
  where state = 'DELIVERED';

-- Exactly the live inactivityNoticeBody JSON, without pretty printing.
-- Keep this version of the wire template with the qualified delivery proof.
create function public.account_automatic_erasure_recipient_digest(p_email text)
returns text language sql immutable strict set search_path = '' as $digest$
  select pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    '{"from":"RavRadar <varsling@besked.ravradar.dk>","to":['
    || pg_catalog.to_json(p_email)::text
    || '],"reply_to":"ravradar@outlook.dk","subject":"Log ind, hvis du vil beholde din RavRadar-konto","text":'
    || pg_catalog.to_json(pg_catalog.concat_ws(pg_catalog.chr(10) || pg_catalog.chr(10),
      'Din RavRadar-konto har været inaktiv i mindst to år.',
      'Hvis du vil beholde den, skal du logge ind på https://ravradar.dk/ inden for 30 dage.',
      'Hvis du ikke logger ind, kan din konto og dens gemte ture blive slettet efter varslingsperioden.',
      'Du kan svare på denne mail, hvis du har spørgsmål.'))::text
    || '}', 'UTF8'), 'sha256'), 'hex')
$digest$;
revoke all on function public.account_automatic_erasure_recipient_digest(text)
  from public,anon,authenticated,service_role;

-- The only shared irreversible PostgreSQL mutation. Both entry points hold
-- the profile and operation locks and perform their own admission checks.
create function public.account_erasure_commit_pg_stage(p_operation uuid,p_target uuid)
returns void language plpgsql set search_path = '' as $commit_stage$
declare removed bigint;
begin
  update public.profiles set is_active = false where id = p_target;
  if not found then raise exception 'ACCOUNT_ERASURE_TARGET_UNKNOWN' using errcode = '22023'; end if;
  update public.account_erasure_operations set state = 'PG_STAGED_AUTH_PENDING',
    pg_staged_at = pg_catalog.clock_timestamp(),updated_at = pg_catalog.clock_timestamp()
    where operation_id = p_operation and target_user_id = p_target and state = 'PREPARED';
  if not found then raise exception 'ACCOUNT_ERASURE_STAGE_STATE_CHANGED' using errcode = '40001'; end if;
  delete from public.observations where user_id = p_target;
  get diagnostics removed = row_count;
  update public.account_erasure_operations set pg_rows_removed = removed where operation_id = p_operation;
end;
$commit_stage$;
revoke all on function public.account_erasure_commit_pg_stage(uuid,uuid)
  from public,anon,authenticated,service_role;

create or replace function public.get_account_erasure_status(p_operation uuid)
returns jsonb language plpgsql security definer set search_path = '' as $status$
declare actor uuid := public.account_erasure_require_owner();
begin
  if not exists(select 1 from public.account_erasure_operations
    where operation_id = p_operation and requested_by = actor and mode = 'MANUAL_OWNER') then
    raise exception 'ACCOUNT_ERASURE_OPERATION_UNKNOWN' using errcode = '22023';
  end if;
  return public.account_erasure_status_json(p_operation,actor,false);
end;
$status$;

create or replace function public.list_account_erasure_operations(p_after uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $list$
declare actor uuid := public.account_erasure_require_owner(); result jsonb;
begin
  with selected as materialized(select operation_id from public.account_erasure_operations
    where requested_by = actor and mode = 'MANUAL_OWNER' and state <> 'COMPLETE'
      and (p_after is null or operation_id > p_after)
    order by operation_id limit 65)
  select jsonb_build_object('scope','own-account-erasure-operations','rows',coalesce((
    select jsonb_agg(public.account_erasure_status_json(operation_id,actor,false) order by operation_id)
    from(select operation_id from selected order by operation_id limit 64) visible),'[]'::jsonb),
    'truncated',(select count(*) > 64 from selected)) into result;
  return result;
end;
$list$;

create or replace function public.find_account_erasure_operation(p_target uuid)
returns jsonb language plpgsql security definer set search_path = '' as $find$
declare actor uuid := public.account_erasure_require_owner(); operation public.account_erasure_operations%rowtype;
begin
  if p_target is null then raise exception 'ACCOUNT_ERASURE_INPUT_INVALID' using errcode = '22023'; end if;
  select * into operation from public.account_erasure_operations where target_user_id = p_target
    and (state = 'PREPARED' or pg_staged_at is not null);
  if not found then return jsonb_build_object('operationId',null,'state','NONE','complete',false); end if;
  if operation.requested_by <> actor or operation.mode <> 'MANUAL_OWNER' then
    return jsonb_build_object('operationId',null,'state','HOLD_REQUESTER_CHANGED','complete',false);
  end if;
  return public.get_account_erasure_status(operation.operation_id);
end;
$find$;

create or replace function public.stage_account_erasure_pg(p_operation uuid,p_confirmation text)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $stage$
declare actor uuid := public.account_erasure_require_owner(); operation public.account_erasure_operations%rowtype;
  activity public.account_activity_journal%rowtype; reason text;
begin
  if p_operation is null or p_confirmation is distinct from 'STAGE-MANUAL-ACCOUNT-PG-ERASURE' then
    raise exception 'ACCOUNT_ERASURE_STAGE_CONFIRMATION_REQUIRED' using errcode = '22023';
  end if;
  select * into operation from public.account_erasure_operations
    where operation_id = p_operation and requested_by = actor and mode = 'MANUAL_OWNER';
  if not found then raise exception 'ACCOUNT_ERASURE_OPERATION_UNKNOWN' using errcode = '22023'; end if;
  if operation.state <> 'PREPARED' then return public.get_account_erasure_status(p_operation); end if;
  perform 1 from public.profiles where id = operation.target_user_id for update;
  select * into activity from public.account_activity_journal where user_id = operation.target_user_id for update;
  select * into operation from public.account_erasure_operations
    where operation_id = p_operation and requested_by = actor and mode = 'MANUAL_OWNER' for update;
  if operation.state <> 'PREPARED' then return public.get_account_erasure_status(p_operation); end if;
  reason := public.account_erasure_policy_hold(operation.target_user_id);
  if reason is not null then
    update public.account_erasure_operations set state = 'HOLD_POLICY',hold_reason = reason,updated_at = pg_catalog.clock_timestamp()
      where operation_id = p_operation;
    return public.get_account_erasure_status(p_operation);
  end if;
  if operation.activity_first is distinct from activity.first_observed_at
    or operation.activity_last is distinct from activity.last_activity_at then
    update public.account_erasure_operations set state = 'HOLD_ACTIVITY_CHANGED',hold_reason = 'ACTIVITY_CHANGED',
      updated_at = pg_catalog.clock_timestamp() where operation_id = p_operation;
    return public.get_account_erasure_status(p_operation);
  end if;
  perform public.account_erasure_commit_pg_stage(p_operation,operation.target_user_id);
  return public.get_account_erasure_status(p_operation);
end;
$stage$;

create function public.list_account_automatic_erasure_work()
returns jsonb language plpgsql stable security definer set search_path = '' as $work$
declare actor uuid; result jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'ACCOUNT_AUTOMATIC_ERASURE_SERVICE_REQUIRED' using errcode = '42501';
  end if;
  select id into actor from public.profiles where role = 'owner' and is_active
    and (select count(*) from public.profiles where role = 'owner') = 1;
  with pending as materialized (
    select o.operation_id as notice_id,o.target_user_id,o.requested_by,a.notice_revision,
      a.auth_user_created_at,a.recipient_digest,0 as priority,o.pg_staged_at as ready_at,'RESUME' as kind
    from public.account_automatic_erasure_admissions a
    join public.account_erasure_operations o using (operation_id)
    where o.requested_by = actor and o.mode = 'AUTOMATIC_INACTIVITY'
      and o.pg_staged_at is not null and o.state <> 'COMPLETE'
    order by o.pg_staged_at,o.operation_id limit 2
  ), due as materialized (
    select n.notice_id,n.target_user_id,n.requested_by,n.revision as notice_revision,
      n.auth_user_created_at,n.recipient_digest,1 as priority,n.delete_not_before as ready_at,'STAGE' as kind
    from public.account_inactivity_notices n
    join public.account_inactivity_policy policy on policy.singleton and policy.notices_enabled
      and policy.delivery_qualified and policy.coverage_status = 'CAPTURING' and policy.coverage_epoch = n.coverage_epoch
    join public.account_automatic_erasure_policy automatic on automatic.singleton and automatic.enabled and automatic.recovery_qualified
    join public.profiles p on p.id = n.target_user_id and p.is_active and p.role in ('expert','user')
    join public.account_activity_journal legacy on legacy.user_id = n.target_user_id
    join public.account_lifecycle_activity activity on activity.user_id = n.target_user_id
      and activity.revision = n.activity_revision and activity.coverage_epoch = policy.coverage_epoch
      and activity.last_activity_at = n.activity_at
    where n.requested_by = actor and n.state = 'DELIVERED' and n.provider_id is not null
      and n.created_at <= n.claimed_at and n.claimed_at <= n.accepted_at and n.accepted_at <= n.delivered_at
      and pg_catalog.isfinite(n.delivered_at) and n.delete_not_before = n.delivered_at + interval '720 hours'
      and n.delete_not_before <= pg_catalog.statement_timestamp()
      and greatest(activity.last_activity_at,legacy.last_activity_at,policy.coverage_started_at)
        <= pg_catalog.statement_timestamp() - interval '2 years'
      and n.auth_user_created_at is not null and n.recipient_digest is not null
      and n.attempt_id = n.attempt_ids[pg_catalog.cardinality(n.attempt_ids)]
      and not exists(select 1 from public.account_erasure_operations o
        where o.operation_id = n.notice_id
          or (o.target_user_id = n.target_user_id and (o.state = 'PREPARED' or o.pg_staged_at is not null)))
    order by n.delete_not_before,n.notice_id limit 2
  ), selected as (
    select * from (select * from pending union all select * from due) work
    order by priority,ready_at,notice_id limit 2
  )
  select jsonb_build_object('scope','account-automatic-erasure-work','rows',coalesce(
    jsonb_agg(jsonb_build_object('noticeId',notice_id,'targetUserId',target_user_id,'actorId',requested_by,
      'revision',notice_revision::text,'authUserCreatedAt',auth_user_created_at,'recipientDigest',recipient_digest,
      'kind',kind) order by priority,ready_at,notice_id),'[]'::jsonb)) into result from selected;
  return result;
end;
$work$;
revoke all on function public.list_account_automatic_erasure_work() from public,anon,authenticated,service_role;
grant execute on function public.list_account_automatic_erasure_work() to service_role;

create function public.stage_account_automatic_erasure(p_notice uuid,p_revision bigint,
  p_auth_user_created_at text,p_recipient_digest text)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $auto_stage$
declare actor uuid; target_id uuid; n public.account_inactivity_notices%rowtype;
  auth_user auth.users%rowtype; target public.profiles%rowtype; legacy public.account_activity_journal%rowtype;
  activity public.account_lifecycle_activity%rowtype; policy public.account_inactivity_policy%rowtype;
  observed timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'ACCOUNT_AUTOMATIC_ERASURE_SERVICE_REQUIRED' using errcode = '42501';
  end if;
  if p_notice is null or p_notice = '00000000-0000-0000-0000-000000000000'::uuid
    or p_revision is null or p_revision <= 0 or p_auth_user_created_at is null
    or p_auth_user_created_at !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,9})?Z$'
    or p_recipient_digest is null or p_recipient_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'ACCOUNT_AUTOMATIC_ERASURE_INPUT_INVALID' using errcode = '22023';
  end if;
  select * into n from public.account_inactivity_notices where notice_id = p_notice;
  if not found then raise exception 'ACCOUNT_AUTOMATIC_ERASURE_NOT_ELIGIBLE' using errcode = '22023'; end if;
  actor := public.account_erasure_require_service_owner(n.requested_by);
  target_id := n.target_user_id;
  perform 1 from public.account_automatic_erasure_policy where singleton and enabled and recovery_qualified for share;
  if not found then raise exception 'ACCOUNT_AUTOMATIC_ERASURE_POLICY_OFF' using errcode = '22023'; end if;

  -- Auth already owns its user/session locks at token capture. An unresolved
  -- concurrent lock aborts the whole admission before any irreversible write.
  select * into auth_user from auth.users where id = target_id for update nowait;
  if not found or auth_user.email_confirmed_at is null or auth_user.deleted_at is not null
    or auth_user.created_at is distinct from p_auth_user_created_at::timestamptz
    or public.account_automatic_erasure_recipient_digest(auth_user.email) is distinct from p_recipient_digest then
    raise exception 'ACCOUNT_AUTOMATIC_ERASURE_AUTH_CHANGED' using errcode = '40001';
  end if;
  select * into target from public.profiles where id = target_id for update nowait;
  select * into legacy from public.account_activity_journal where user_id = target_id for update nowait;
  select * into activity from public.account_lifecycle_activity where user_id = target_id for update nowait;
  -- The activity hook's fallback acquires policy before cancelling the notice.
  select * into policy from public.account_inactivity_policy where singleton for share nowait;
  select * into n from public.account_inactivity_notices where notice_id = p_notice for update nowait;
  observed := pg_catalog.clock_timestamp();
  if n.requested_by is distinct from actor or n.target_user_id is distinct from target_id
    or n.revision is distinct from p_revision or n.state is distinct from 'DELIVERED'
    or n.provider_id is null or n.attempt_id is null
    or n.attempt_id is distinct from n.attempt_ids[pg_catalog.cardinality(n.attempt_ids)]
    or n.recipient_digest is distinct from p_recipient_digest
    or n.auth_user_created_at is distinct from p_auth_user_created_at
    or n.claimed_at is null or n.created_at > n.claimed_at
    or n.accepted_at is null or n.claimed_at > n.accepted_at
    or n.delivered_at is null or not pg_catalog.isfinite(n.delivered_at) or n.accepted_at > n.delivered_at
    or n.delete_not_before is distinct from n.delivered_at + interval '720 hours' or n.delete_not_before > observed
    or policy.coverage_status is distinct from 'CAPTURING' or policy.notices_enabled is distinct from true
    or policy.delivery_qualified is distinct from true or policy.coverage_started_at is null
    or n.coverage_epoch is distinct from policy.coverage_epoch or activity.coverage_epoch is distinct from policy.coverage_epoch
    or activity.revision is null or activity.revision is distinct from n.activity_revision
    or activity.last_activity_at is distinct from n.activity_at or legacy.last_activity_at is null
    or greatest(activity.last_activity_at,legacy.last_activity_at,policy.coverage_started_at) > observed - interval '2 years'
    or target.is_active is distinct from true or public.account_erasure_policy_hold(target_id) is not null then
    raise exception 'ACCOUNT_AUTOMATIC_ERASURE_NOT_ELIGIBLE' using errcode = '22023';
  end if;
  if exists(select 1 from public.account_erasure_operations where operation_id = p_notice
    or (target_user_id = target_id and (state = 'PREPARED' or pg_staged_at is not null))) then
    raise exception 'ACCOUNT_ERASURE_TARGET_BUSY' using errcode = '40001';
  end if;
  insert into public.account_erasure_operations(operation_id,target_user_id,requested_by,mode,state,
    activity_first,activity_last,profile_was_active,prepared_at,updated_at)
  values (p_notice,target_id,actor,'AUTOMATIC_INACTIVITY','PREPARED',
    legacy.first_observed_at,legacy.last_activity_at,target.is_active,observed,observed);
  insert into public.account_automatic_erasure_admissions(operation_id,notice_revision,auth_user_created_at,recipient_digest)
  values (p_notice,p_revision,p_auth_user_created_at,p_recipient_digest);
  perform public.account_erasure_commit_pg_stage(p_notice,target_id);
  return public.account_erasure_status_json(p_notice,actor,true);
end;
$auto_stage$;
revoke all on function public.stage_account_automatic_erasure(uuid,bigint,text,text) from public,anon,authenticated,service_role;
grant execute on function public.stage_account_automatic_erasure(uuid,bigint,text,text) to service_role;

-- A completed outbox keeps the existing minimal replay fence. The notice
-- and working copy of its delivery bindings are no longer needed.
create function public.account_automatic_erasure_drop_notice_data()
returns trigger language plpgsql security definer set search_path = '' as $drop_notice$
begin
  delete from public.account_automatic_erasure_admissions where operation_id = new.operation_id;
  delete from public.account_inactivity_notices where target_user_id = new.target_user_id;
  return null;
end;
$drop_notice$;
revoke all on function public.account_automatic_erasure_drop_notice_data()
  from public,anon,authenticated,service_role;
create trigger account_automatic_erasure_drop_notice_data
  after update of state on public.account_erasure_operations for each row
  when (new.mode = 'AUTOMATIC_INACTIVITY' and old.state <> 'COMPLETE' and new.state = 'COMPLETE')
  execute function public.account_automatic_erasure_drop_notice_data();

notify pgrst, 'reload schema';
commit;
