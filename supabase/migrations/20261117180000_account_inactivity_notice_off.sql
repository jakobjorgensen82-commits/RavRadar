-- Prepared notice-only lifecycle. This does not authorize automatic erasure.
begin;
create table public.account_inactivity_policy (
  singleton boolean primary key default true check (singleton),
  notices_enabled boolean not null default false,
  coverage_status text not null default 'UNKNOWN' check (coverage_status in ('UNKNOWN','CAPTURING','INVALID')),
  coverage_epoch uuid not null default pg_catalog.gen_random_uuid(),
  coverage_started_at timestamptz,
  delivery_qualified boolean not null default false,
  check (coverage_status <> 'CAPTURING' or coverage_started_at is not null),
  check (coverage_started_at is null or isfinite(coverage_started_at))
);
insert into public.account_inactivity_policy(singleton) values(true);
create table public.account_lifecycle_activity (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  revision bigint not null check (revision > 0),
  first_observed_at timestamptz not null,
  last_activity_at timestamptz not null,
  coverage_epoch uuid,
  check (last_activity_at >= first_observed_at and isfinite(first_observed_at) and isfinite(last_activity_at))
);
create table public.account_inactivity_notices (
  notice_id uuid primary key,
  target_user_id uuid not null,
  requested_by uuid not null,
  state text not null check (state in ('HELD','READY','CLAIMED','ACCEPTED','DELIVERED','UNKNOWN','CANCELLED')),
  hold_reason text,
  revision bigint not null default 1 check (revision > 0),
  activity_revision bigint,
  activity_at timestamptz,
  coverage_epoch uuid,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  attempt_id uuid,
  attempt_ids uuid[] not null default '{}' check (cardinality(attempt_ids) <= 64),
  recipient_digest text check (recipient_digest is null or recipient_digest ~ '^[a-f0-9]{64}$'),
  auth_user_created_at text,
  claimed_at timestamptz,
  provider_id uuid,
  accepted_at timestamptz,
  delivered_at timestamptz,
  delete_not_before timestamptz,
  check (target_user_id <> requested_by),
  check (isfinite(created_at) and (activity_at is null or isfinite(activity_at)) and (claimed_at is null or isfinite(claimed_at))),
  check (state <> 'READY' or (hold_reason is null and activity_revision is not null and coverage_epoch is not null)),
  check (delete_not_before is null or delivered_at is not null),
  check (state <> 'DELIVERED' or delete_not_before is not null),
  check (delete_not_before is null or delete_not_before = delivered_at + interval '720 hours'),
  check (state <> 'CANCELLED' or delete_not_before is null)
);
create unique index account_inactivity_notice_active_target on public.account_inactivity_notices(target_user_id)
  where state <> 'CANCELLED';
alter table public.account_inactivity_policy enable row level security;
alter table public.account_inactivity_policy force row level security;
alter table public.account_lifecycle_activity enable row level security;
alter table public.account_lifecycle_activity force row level security;
alter table public.account_inactivity_notices enable row level security;
alter table public.account_inactivity_notices force row level security;
revoke all on public.account_inactivity_policy,public.account_lifecycle_activity,public.account_inactivity_notices
  from public,anon,authenticated,service_role;

-- Same target-profile -> journal -> activity -> notice order as every notice CAS.
-- No Auth/session trigger or DELETE/revoke dependency is introduced.
create function public.record_account_lifecycle_activity()
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $activity$
declare actor uuid := auth.uid(); observed timestamptz := pg_catalog.clock_timestamp(); epoch uuid; cancelled bigint;
begin
  if actor is null or auth.role() is distinct from 'authenticated' then
    raise exception 'ACCOUNT_ACTIVITY_AUTH_REQUIRED' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = actor for update;
  if not found then return jsonb_build_object('recorded',false); end if;
  if exists(select 1 from public.account_erasure_operations where target_user_id = actor and pg_staged_at is not null) then
    return jsonb_build_object('recorded',false);
  end if;
  -- Keep the already issued positive-only RPC/body and its legacy consumers intact.
  perform public.record_account_activity();
  select coverage_epoch into epoch from public.account_inactivity_policy where singleton and coverage_status = 'CAPTURING';
  insert into public.account_lifecycle_activity as a(user_id,revision,first_observed_at,last_activity_at,coverage_epoch)
    values(actor,1,observed,observed,epoch)
  on conflict(user_id) do update set revision = a.revision + 1,
    last_activity_at = greatest(a.last_activity_at,excluded.last_activity_at),coverage_epoch = excluded.coverage_epoch;
  update public.account_inactivity_notices set state = 'CANCELLED',hold_reason = 'ACTIVITY_OBSERVED',
    revision = revision + 1,delete_not_before = null
    where target_user_id = actor and state <> 'CANCELLED';
  get diagnostics cancelled = row_count;
  return jsonb_build_object('recorded',true,'noticesCancelled',cancelled);
end;
$activity$;
revoke all on function public.record_account_lifecycle_activity() from public,anon,authenticated,service_role;
grant execute on function public.record_account_lifecycle_activity() to authenticated;

create function public.account_inactivity_notice_json(p_notice uuid,p_actor uuid,p_internal boolean)
returns jsonb language plpgsql security definer set search_path = '' as $status$
declare n public.account_inactivity_notices%rowtype; result jsonb;
begin
  select * into n from public.account_inactivity_notices where notice_id = p_notice and requested_by = p_actor;
  if not found then raise exception 'ACCOUNT_NOTICE_NOT_FOUND' using errcode = '22023'; end if;
  result := jsonb_build_object('noticeId',n.notice_id,'targetUserId',n.target_user_id,'state',n.state,
    'holdReason',n.hold_reason,'revision',n.revision::text,'activityRevision',n.activity_revision::text,
    'accepted',n.accepted_at is not null,'delivered',n.delivered_at is not null,
    'deleteNotBefore',n.delete_not_before,'automaticDeletionEnabled',false);
  if p_internal then result := result || jsonb_build_object('attemptId',n.attempt_id,'recipientDigest',n.recipient_digest,
    'authUserCreatedAt',n.auth_user_created_at,'providerId',n.provider_id,'reservedAt',n.claimed_at); end if;
  return result;
end;
$status$;
revoke all on function public.account_inactivity_notice_json(uuid,uuid,boolean) from public,anon,authenticated,service_role;

-- Caller holds the target profile and activity rows. Missing evidence is a HOLD.
create function public.account_inactivity_notice_hold(p_target uuid)
returns text language plpgsql security definer set search_path = '' as $hold$
declare policy public.account_inactivity_policy%rowtype; a public.account_lifecycle_activity%rowtype; legacy timestamptz;
begin
  select * into policy from public.account_inactivity_policy where singleton;
  if not found or not policy.notices_enabled then return 'POLICY_OFF'; end if;
  if policy.coverage_status <> 'CAPTURING' or policy.coverage_started_at is null then return 'COVERAGE_UNKNOWN'; end if;
  if not policy.delivery_qualified then return 'DELIVERY_UNQUALIFIED'; end if;
  select * into a from public.account_lifecycle_activity where user_id = p_target;
  select last_activity_at into legacy from public.account_activity_journal where user_id = p_target;
  if a.user_id is null or legacy is null or a.coverage_epoch is distinct from policy.coverage_epoch then return 'ACTIVITY_UNKNOWN'; end if;
  if greatest(a.last_activity_at,legacy,policy.coverage_started_at) > pg_catalog.clock_timestamp() - interval '2 years' then
    return 'ACTIVITY_TOO_RECENT';
  end if;
  if exists(select 1 from public.account_erasure_operations where target_user_id = p_target and pg_staged_at is not null) then
    return 'ERASURE_PENDING';
  end if;
  if public.account_erasure_policy_hold(p_target) is not null then return 'TARGET_POLICY'; end if;
  return null;
end;
$hold$;
revoke all on function public.account_inactivity_notice_hold(uuid) from public,anon,authenticated,service_role;

create function public.prepare_account_inactivity_notice(p_notice uuid,p_target uuid)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $prepare$
declare actor uuid := public.account_erasure_require_owner(); n public.account_inactivity_notices%rowtype;
  a public.account_lifecycle_activity%rowtype; reason text;
begin
  if p_notice is null or p_target is null or p_target = actor then raise exception 'ACCOUNT_NOTICE_INPUT_INVALID' using errcode = '22023'; end if;
  perform 1 from public.profiles where id = p_target for update;
  perform 1 from public.account_activity_journal where user_id = p_target for update;
  select * into a from public.account_lifecycle_activity where user_id = p_target for update;
  select * into n from public.account_inactivity_notices where notice_id = p_notice for update;
  if found then
    if n.target_user_id <> p_target or n.requested_by <> actor then raise exception 'ACCOUNT_NOTICE_IDENTITY_MISMATCH' using errcode = '22023'; end if;
    if n.state = 'HELD' and n.accepted_at is null and n.claimed_at is null then
      reason := public.account_inactivity_notice_hold(p_target);
      if a.revision is distinct from n.activity_revision then reason := 'ACTIVITY_CHANGED'; end if;
      update public.account_inactivity_notices set
        state = case when reason = 'ACTIVITY_CHANGED' then 'CANCELLED' when reason is null then 'READY' else 'HELD' end,
        hold_reason = reason,revision = revision + 1 where notice_id = p_notice;
    end if;
    return public.account_inactivity_notice_json(p_notice,actor,false);
  end if;
  if exists(select 1 from public.account_inactivity_notices where target_user_id = p_target and state <> 'CANCELLED') then
    raise exception 'ACCOUNT_NOTICE_ALREADY_EXISTS' using errcode = '22023';
  end if;
  reason := public.account_inactivity_notice_hold(p_target);
  insert into public.account_inactivity_notices(notice_id,target_user_id,requested_by,state,hold_reason,
    activity_revision,activity_at,coverage_epoch)
    values(p_notice,p_target,actor,case when reason is null then 'READY' else 'HELD' end,reason,a.revision,a.last_activity_at,a.coverage_epoch);
  return public.account_inactivity_notice_json(p_notice,actor,false);
end;
$prepare$;
revoke all on function public.prepare_account_inactivity_notice(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.prepare_account_inactivity_notice(uuid,uuid) to authenticated;

create function public.get_account_inactivity_notice_status(p_notice uuid)
returns jsonb language plpgsql security definer set search_path = '' as $get$
begin return public.account_inactivity_notice_json(p_notice,public.account_erasure_require_owner(),false); end;
$get$;
revoke all on function public.get_account_inactivity_notice_status(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_account_inactivity_notice_status(uuid) to authenticated;

create function public.get_account_inactivity_notice_service_status(p_notice uuid,p_actor uuid)
returns jsonb language plpgsql security definer set search_path = '' as $service_status$
begin return public.account_inactivity_notice_json(p_notice,public.account_erasure_require_service_owner(p_actor),true); end;
$service_status$;
revoke all on function public.get_account_inactivity_notice_service_status(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_account_inactivity_notice_service_status(uuid,uuid) to service_role;

create function public.list_account_inactivity_notices(p_after uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $list$
declare actor uuid := public.account_erasure_require_owner(); ids uuid[]; rows jsonb;
begin
  select array_agg(notice_id order by notice_id) into ids from (select notice_id from public.account_inactivity_notices
    where requested_by = actor and state <> 'CANCELLED' and (p_after is null or notice_id > p_after) order by notice_id limit 65) q;
  select coalesce(jsonb_agg(public.account_inactivity_notice_json(x,actor,false) order by x),'[]'::jsonb) into rows
    from unnest(coalesce(ids[1:64],'{}'::uuid[])) x;
  return jsonb_build_object('scope','own-account-inactivity-notices','rows',rows,'truncated',coalesce(array_length(ids,1),0)>64);
end;
$list$;
revoke all on function public.list_account_inactivity_notices(uuid) from public,anon,authenticated,service_role;
grant execute on function public.list_account_inactivity_notices(uuid) to authenticated;

create function public.claim_account_inactivity_notice(p_notice uuid,p_actor uuid,p_expected_revision bigint,
  p_attempt uuid,p_recipient_digest text,p_auth_created_at text)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $claim$
declare actor uuid := public.account_erasure_require_service_owner(p_actor); n public.account_inactivity_notices%rowtype;
  a public.account_lifecycle_activity%rowtype; reason text;
begin
  select * into n from public.account_inactivity_notices where notice_id = p_notice and requested_by = actor;
  if not found then raise exception 'ACCOUNT_NOTICE_NOT_FOUND' using errcode = '22023'; end if;
  perform 1 from public.profiles where id = n.target_user_id for update;
  perform 1 from public.account_activity_journal where user_id = n.target_user_id for update;
  select * into a from public.account_lifecycle_activity where user_id = n.target_user_id for update;
  select * into n from public.account_inactivity_notices where notice_id = p_notice and requested_by = actor for update;
  if p_expected_revision is null or n.revision <> p_expected_revision or n.accepted_at is not null
    or n.state not in ('HELD','READY','CLAIMED','UNKNOWN')
    or p_attempt = any(n.attempt_ids) then
    return public.account_inactivity_notice_json(p_notice,actor,true)||jsonb_build_object('shouldSend',false);
  end if;
  reason := public.account_inactivity_notice_hold(n.target_user_id);
  if a.revision is distinct from n.activity_revision or a.last_activity_at is distinct from n.activity_at then reason := 'ACTIVITY_CHANGED'; end if;
  if n.claimed_at is not null and n.claimed_at <= pg_catalog.clock_timestamp() - interval '23 hours' then reason := 'SEND_WINDOW_EXPIRED'; end if;
  if n.claimed_at is not null and (n.recipient_digest is distinct from p_recipient_digest
    or n.auth_user_created_at is distinct from p_auth_created_at) then reason := 'TARGET_CHANGED'; end if;
  if cardinality(n.attempt_ids) >= 64 then reason := 'ATTEMPT_LIMIT'; end if;
  if reason is not null then
    update public.account_inactivity_notices set
      state = case when reason in ('ACTIVITY_CHANGED','ACTIVITY_TOO_RECENT') then 'CANCELLED' else 'HELD' end,
      hold_reason = reason,revision = revision + 1,delete_not_before = null where notice_id = p_notice;
    return public.account_inactivity_notice_json(p_notice,actor,true)||jsonb_build_object('shouldSend',false);
  end if;
  if p_attempt is null or p_recipient_digest is null or p_recipient_digest !~ '^[a-f0-9]{64}$'
    or p_auth_created_at is null or octet_length(p_auth_created_at) > 40
    or p_auth_created_at !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,9})?Z$' then
    raise exception 'ACCOUNT_NOTICE_BINDING_INVALID' using errcode = '22023';
  end if;
  update public.account_inactivity_notices set state = 'CLAIMED',hold_reason = null,revision = revision + 1,
    attempt_id = p_attempt,attempt_ids = array_append(attempt_ids,p_attempt),recipient_digest = p_recipient_digest,auth_user_created_at = p_auth_created_at,
    claimed_at = coalesce(claimed_at,pg_catalog.clock_timestamp()) where notice_id = p_notice;
  return public.account_inactivity_notice_json(p_notice,actor,true)||jsonb_build_object('shouldSend',true);
end;
$claim$;
revoke all on function public.claim_account_inactivity_notice(uuid,uuid,bigint,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.claim_account_inactivity_notice(uuid,uuid,bigint,uuid,text,text) to service_role;

create function public.hold_account_inactivity_notice(p_notice uuid,p_actor uuid,p_expected_revision bigint,p_reason text)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $hold_notice$
declare actor uuid := public.account_erasure_require_service_owner(p_actor); n public.account_inactivity_notices%rowtype;
begin
  if p_reason is null or p_reason not in ('TARGET_MISSING','AUTH_UNAVAILABLE','TARGET_CHANGED','DELIVERY_UNAVAILABLE','SEND_WINDOW_EXPIRED') then
    raise exception 'ACCOUNT_NOTICE_INPUT_INVALID' using errcode = '22023';
  end if;
  select * into n from public.account_inactivity_notices where notice_id = p_notice and requested_by = actor for update;
  if not found then raise exception 'ACCOUNT_NOTICE_NOT_FOUND' using errcode = '22023'; end if;
  if p_expected_revision is not null and n.revision = p_expected_revision and n.state not in ('CANCELLED','DELIVERED') then
    update public.account_inactivity_notices set state = case when p_reason = 'TARGET_MISSING' then 'CANCELLED' else 'HELD' end,
      hold_reason = p_reason,revision = revision + 1,delete_not_before = null where notice_id = p_notice;
  end if;
  return public.account_inactivity_notice_json(p_notice,actor,false);
end;
$hold_notice$;
revoke all on function public.hold_account_inactivity_notice(uuid,uuid,bigint,text) from public,anon,authenticated,service_role;
grant execute on function public.hold_account_inactivity_notice(uuid,uuid,bigint,text) to service_role;

create function public.acknowledge_account_inactivity_notice(p_notice uuid,p_actor uuid,p_expected_revision bigint,
  p_attempt uuid,p_outcome text,p_provider uuid default null)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $ack$
declare actor uuid := public.account_erasure_require_service_owner(p_actor); n public.account_inactivity_notices%rowtype;
  observed timestamptz := pg_catalog.clock_timestamp();
  a public.account_lifecycle_activity%rowtype; reason text;
begin
  select * into n from public.account_inactivity_notices where notice_id = p_notice and requested_by = actor;
  if not found then raise exception 'ACCOUNT_NOTICE_NOT_FOUND' using errcode = '22023'; end if;
  perform 1 from public.profiles where id = n.target_user_id for update;
  perform 1 from public.account_activity_journal where user_id = n.target_user_id for update;
  select * into a from public.account_lifecycle_activity where user_id = n.target_user_id for update;
  select * into n from public.account_inactivity_notices where notice_id = p_notice and requested_by = actor for update;
  if p_expected_revision is null or n.revision <> p_expected_revision or n.attempt_id is distinct from p_attempt then
    return public.account_inactivity_notice_json(p_notice,actor,false);
  end if;
  if p_outcome = 'delivered' then
    -- A transient Auth/provider readback HOLD does not revoke the accepted send.
    -- Reconcile that same immutable receipt; claim still forbids any new POST.
    if n.state not in ('ACCEPTED','HELD') or n.accepted_at is null
      or n.provider_id is null or n.provider_id is distinct from p_provider or p_attempt is null then
      raise exception 'ACCOUNT_NOTICE_RECEIPT_INVALID' using errcode = '22023';
    end if;
    reason := public.account_inactivity_notice_hold(n.target_user_id);
    if a.revision is distinct from n.activity_revision then reason := 'ACTIVITY_CHANGED'; end if;
    if reason is not null then
      update public.account_inactivity_notices set
        state = case when reason in ('ACTIVITY_CHANGED','ACTIVITY_TOO_RECENT') then 'CANCELLED' else 'HELD' end,
        hold_reason = reason,revision = revision + 1,delete_not_before = null where notice_id = p_notice;
      return public.account_inactivity_notice_json(p_notice,actor,false);
    end if;
    update public.account_inactivity_notices set state = 'DELIVERED',hold_reason = null,revision = revision + 1,
      delivered_at = observed,delete_not_before = observed + interval '720 hours'
      where notice_id = p_notice;
    return public.account_inactivity_notice_json(p_notice,actor,false);
  end if;
  if n.state <> 'CLAIMED' then return public.account_inactivity_notice_json(p_notice,actor,false); end if;
  if p_outcome is null or p_outcome not in ('accepted','unknown','rejected','limited','not_attempted')
    or (p_outcome = 'accepted' and p_provider is null) then raise exception 'ACCOUNT_NOTICE_RECEIPT_INVALID' using errcode = '22023'; end if;
  update public.account_inactivity_notices set revision = revision + 1,
    state = case when p_outcome = 'accepted' then 'ACCEPTED' else 'UNKNOWN' end,
    hold_reason = case when p_outcome = 'accepted' then 'DELIVERY_UNCONFIRMED' else 'SEND_OUTCOME_UNKNOWN' end,
    provider_id = case when p_outcome = 'accepted' then p_provider else null end,
    accepted_at = case when p_outcome = 'accepted' then pg_catalog.clock_timestamp() else null end where notice_id = p_notice;
  -- An accepted response NEVER starts the 30-day deadline.
  return public.account_inactivity_notice_json(p_notice,actor,false);
end;
$ack$;
revoke all on function public.acknowledge_account_inactivity_notice(uuid,uuid,bigint,uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.acknowledge_account_inactivity_notice(uuid,uuid,bigint,uuid,text,uuid) to service_role;
comment on table public.account_inactivity_policy is 'OFF until complete native activity coverage and provider delivery/reconciliation are actually qualified. No RPC can activate it.';
comment on table public.account_inactivity_notices is 'Notice-only durable cases. No automatic DELETE, no manual-erasure authority, no inferred delivery or inactivity.';
commit;
