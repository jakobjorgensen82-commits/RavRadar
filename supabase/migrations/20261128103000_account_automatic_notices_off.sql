-- Automatic notice admission and receipt reconciliation. Installation starts OFF.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.account_automatic_notice_policy (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into public.account_automatic_notice_policy(singleton) values (true);

create table public.account_automatic_notice_dispatches (
  notice_id uuid primary key references public.account_inactivity_notices(notice_id) on delete cascade,
  -- Order receipt checks without changing the notice's revision.
  poll_requested_at timestamptz check (poll_requested_at is null or pg_catalog.isfinite(poll_requested_at))
);

alter table public.account_automatic_notice_policy enable row level security;
alter table public.account_automatic_notice_policy force row level security;
alter table public.account_automatic_notice_dispatches enable row level security;
alter table public.account_automatic_notice_dispatches force row level security;
revoke all on public.account_automatic_notice_policy, public.account_automatic_notice_dispatches
  from public, anon, authenticated, service_role;

create function public.prepare_account_automatic_notice_work()
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $work$
declare
  actor uuid;
  policy public.account_inactivity_policy%rowtype;
  activity public.account_lifecycle_activity%rowtype;
  candidate record;
  send_id uuid;
  polls jsonb := '[]'::jsonb;
  work jsonb := '[]'::jsonb;
  poll jsonb;
  observed timestamptz := pg_catalog.clock_timestamp();
  empty_work constant jsonb := '{"scope":"account-automatic-notice-work","rows":[]}'::jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'ACCOUNT_AUTOMATIC_NOTICE_SERVICE_REQUIRED' using errcode = '42501';
  end if;

  -- Serialize only automatic selection. Claims share the same switch.
  perform 1 from public.account_automatic_notice_policy where singleton and enabled for update;
  if not found then return empty_work; end if;

  select * into policy from public.account_inactivity_policy where singleton;
  if policy.notices_enabled is distinct from true or policy.coverage_status is distinct from 'CAPTURING'
    or policy.delivery_qualified is distinct from true or policy.coverage_started_at is null
    or policy.coverage_started_at > observed - interval '2 years' then
    return empty_work;
  end if;

  select p.id into actor from public.profiles p
    where p.role = 'owner' and p.is_active
      and (select count(*) from public.profiles where role = 'owner') = 1;
  if actor is null then return empty_work; end if;
  actor := public.account_erasure_require_service_owner(actor);

  -- Only automatic notices with durable provider acceptance can be polled.
  -- Request the least recently polled receipts first, including eligible holds.
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'noticeId', q.notice_id, 'targetUserId', q.target_user_id, 'actorId', actor, 'kind', 'POLL')
    order by q.poll_requested_at nulls first, q.accepted_at, q.notice_id), '[]'::jsonb) into polls
  from (
    select n.notice_id, n.target_user_id, d.poll_requested_at, n.accepted_at
    from public.account_automatic_notice_dispatches d
    join public.account_inactivity_notices n on n.notice_id = d.notice_id
    join public.profiles p on p.id = n.target_user_id
    join auth.users u on u.id = n.target_user_id
    join public.account_activity_journal j on j.user_id = n.target_user_id
    join public.account_lifecycle_activity a on a.user_id = n.target_user_id
    where n.requested_by = actor
      and (n.state = 'ACCEPTED' or (n.state = 'HELD'
        and n.hold_reason in ('AUTH_UNAVAILABLE', 'DELIVERY_UNAVAILABLE', 'TARGET_CHANGED')))
      and n.provider_id is not null and n.attempt_id is not null
      and n.attempt_id = n.attempt_ids[pg_catalog.cardinality(n.attempt_ids)]
      and n.claimed_at is not null and n.created_at <= n.claimed_at
      and n.accepted_at >= n.claimed_at and pg_catalog.isfinite(n.accepted_at)
      and n.delivered_at is null and n.delete_not_before is null
      and n.coverage_epoch = policy.coverage_epoch and a.coverage_epoch = policy.coverage_epoch
      and n.activity_revision = a.revision and n.activity_at = a.last_activity_at
      and p.is_active and p.role in ('expert', 'user')
      and u.email_confirmed_at is not null and u.deleted_at is null
      and u.created_at = case when pg_catalog.pg_input_is_valid(n.auth_user_created_at, 'timestamp with time zone')
        then n.auth_user_created_at::timestamptz end
      and n.recipient_digest = public.account_automatic_erasure_recipient_digest(u.email)
      and greatest(j.last_activity_at, a.last_activity_at) <= observed - interval '2 years'
      and public.account_inactivity_notice_hold(n.target_user_id) is null
      and not exists (select 1 from public.account_erasure_operations o
        where o.target_user_id = n.target_user_id and (o.state = 'PREPARED' or o.pg_staged_at is not null))
    order by d.poll_requested_at nulls first, n.accepted_at, n.notice_id
    limit 2
  ) q;

  -- Give one place to a receipt when present and use the other for a new send.
  -- A prior manual, claimed, or ambiguous notice always occupies its target.
  for candidate in
    select p.id
    from public.profiles p
    join auth.users u on u.id = p.id
    join public.account_activity_journal j on j.user_id = p.id
    join public.account_lifecycle_activity a on a.user_id = p.id
    left join public.account_inactivity_notices n on n.target_user_id = p.id and n.state <> 'CANCELLED'
    left join public.account_automatic_notice_dispatches d on d.notice_id = n.notice_id
    where p.is_active and p.role in ('expert', 'user')
      and u.created_at is not null and u.email_confirmed_at is not null and u.deleted_at is null
      and pg_catalog.char_length(u.email) <= 254
      and u.email ~ '^[^[:space:]@<>,;]+@[^[:space:]@<>,;]+\.[^[:space:]@<>,;]+$'
      and a.coverage_epoch = policy.coverage_epoch
      and greatest(j.last_activity_at, a.last_activity_at) <= observed - interval '2 years'
      and (n.notice_id is null or (d.notice_id is not null and n.requested_by = actor and n.state = 'READY'
        and n.claimed_at is null and n.attempt_id is null and pg_catalog.cardinality(n.attempt_ids) = 0
        and n.coverage_epoch = a.coverage_epoch and n.activity_revision = a.revision and n.activity_at = a.last_activity_at))
      and public.account_inactivity_notice_hold(p.id) is null
      and not exists (select 1 from public.account_erasure_operations o
        where o.target_user_id = p.id and (o.state = 'PREPARED' or o.pg_staged_at is not null))
    order by (n.notice_id is null), greatest(j.last_activity_at, a.last_activity_at), p.id
    limit case when pg_catalog.jsonb_array_length(polls) = 0 then 2 else 1 end
    for update of p skip locked
  loop
    -- Follow the activity hook's profile -> journals -> policy -> notice order.
    perform 1 from public.account_activity_journal where user_id = candidate.id for share nowait;
    if not found then continue; end if;
    select * into activity from public.account_lifecycle_activity where user_id = candidate.id for share nowait;
    if not found then continue; end if;
    select * into policy from public.account_inactivity_policy where singleton for share nowait;
    if activity.coverage_epoch is distinct from policy.coverage_epoch
      or public.account_inactivity_notice_hold(candidate.id) is not null
      or exists (select 1 from public.account_erasure_operations o
        where o.target_user_id = candidate.id and (o.state = 'PREPARED' or o.pg_staged_at is not null)) then
      continue;
    end if;

    select n.notice_id into send_id
    from public.account_inactivity_notices n
    join public.account_automatic_notice_dispatches d on d.notice_id = n.notice_id
    where n.target_user_id = candidate.id and n.requested_by = actor and n.state = 'READY'
      and n.claimed_at is null and n.attempt_id is null and pg_catalog.cardinality(n.attempt_ids) = 0
      and n.coverage_epoch = activity.coverage_epoch and n.activity_revision = activity.revision
      and n.activity_at = activity.last_activity_at
    for update of n nowait;
    if not found then
      insert into public.account_inactivity_notices
        (notice_id, target_user_id, requested_by, state, activity_revision, activity_at, coverage_epoch)
      values (pg_catalog.gen_random_uuid(), candidate.id, actor, 'READY',
        activity.revision, activity.last_activity_at, activity.coverage_epoch)
      on conflict (target_user_id) where state <> 'CANCELLED' do nothing
      returning notice_id into send_id;
      if send_id is null then continue; end if;
      insert into public.account_automatic_notice_dispatches(notice_id) values (send_id);
    end if;

    work := work || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'noticeId', send_id, 'targetUserId', candidate.id, 'actorId', actor, 'kind', 'SEND'));
  end loop;

  for poll in select value from pg_catalog.jsonb_array_elements(polls)
  loop
    exit when pg_catalog.jsonb_array_length(work) = 2;
    update public.account_automatic_notice_dispatches
      set poll_requested_at = pg_catalog.clock_timestamp()
      where notice_id = (poll->>'noticeId')::uuid;
    if found then work := work || pg_catalog.jsonb_build_array(poll); end if;
  end loop;

  return pg_catalog.jsonb_build_object('scope', 'account-automatic-notice-work', 'rows', work);
end;
$work$;
revoke all on function public.prepare_account_automatic_notice_work() from public, anon, authenticated, service_role;
grant execute on function public.prepare_account_automatic_notice_work() to service_role;

create function public.claim_account_automatic_notice(p_notice uuid, p_actor uuid, p_expected_revision bigint,
  p_attempt uuid, p_recipient_digest text, p_auth_created_at text)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $claim$
declare
  actor uuid;
  target_id uuid;
  auth_user auth.users%rowtype;
  activity public.account_lifecycle_activity%rowtype;
  policy public.account_inactivity_policy%rowtype;
  n public.account_inactivity_notices%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'ACCOUNT_AUTOMATIC_NOTICE_SERVICE_REQUIRED' using errcode = '42501';
  end if;
  perform 1 from public.account_automatic_notice_policy where singleton and enabled for share;
  if not found then raise exception 'ACCOUNT_AUTOMATIC_NOTICE_POLICY_OFF' using errcode = '22023'; end if;
  actor := public.account_erasure_require_service_owner(p_actor);

  select notice.target_user_id into target_id
  from public.account_inactivity_notices notice
  join public.account_automatic_notice_dispatches dispatch on dispatch.notice_id = notice.notice_id
  where notice.notice_id = p_notice and notice.requested_by = actor;
  if not found then raise exception 'ACCOUNT_AUTOMATIC_NOTICE_NOT_FOUND' using errcode = '22023'; end if;

  if p_expected_revision is null or p_expected_revision <= 0 or p_attempt is null
    or p_recipient_digest is null or p_recipient_digest !~ '^[a-f0-9]{64}$'
    or p_auth_created_at is null or pg_catalog.octet_length(p_auth_created_at) > 40
    or p_auth_created_at !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,9})?Z$'
    or not pg_catalog.pg_input_is_valid(p_auth_created_at, 'timestamp with time zone') then
    raise exception 'ACCOUNT_AUTOMATIC_NOTICE_INPUT_INVALID' using errcode = '22023';
  end if;

  -- Auth owns its row first at token capture. A conflicting live change aborts
  -- the claim before the dispatcher is allowed to call the mail provider.
  select * into auth_user from auth.users where id = target_id for update nowait;
  if not found or auth_user.email_confirmed_at is null or auth_user.deleted_at is not null
    or auth_user.created_at is distinct from p_auth_created_at::timestamptz
    or pg_catalog.char_length(auth_user.email) > 254
    or auth_user.email !~ '^[^[:space:]@<>,;]+@[^[:space:]@<>,;]+\.[^[:space:]@<>,;]+$'
    or public.account_automatic_erasure_recipient_digest(auth_user.email) is distinct from p_recipient_digest then
    return public.account_inactivity_notice_json(p_notice, actor, true) || '{"shouldSend":false}'::jsonb;
  end if;
  perform 1 from public.profiles where id = target_id and is_active and role in ('expert', 'user') for update nowait;
  if not found then
    return public.account_inactivity_notice_json(p_notice, actor, true) || '{"shouldSend":false}'::jsonb;
  end if;
  perform 1 from public.account_activity_journal where user_id = target_id for update nowait;
  select * into activity from public.account_lifecycle_activity where user_id = target_id for update nowait;
  select * into policy from public.account_inactivity_policy where singleton for share nowait;
  select * into n from public.account_inactivity_notices where notice_id = p_notice and requested_by = actor for update nowait;
  if n.target_user_id is distinct from target_id or n.revision is distinct from p_expected_revision
    or n.state is distinct from 'READY' or n.claimed_at is not null or n.attempt_id is not null
    or pg_catalog.cardinality(n.attempt_ids) <> 0 or n.accepted_at is not null or n.provider_id is not null
    or n.recipient_digest is not null or n.auth_user_created_at is not null
    or n.delivered_at is not null or n.delete_not_before is not null
    or n.coverage_epoch is distinct from policy.coverage_epoch or activity.coverage_epoch is distinct from policy.coverage_epoch
    or activity.revision is distinct from n.activity_revision or activity.last_activity_at is distinct from n.activity_at
    or public.account_inactivity_notice_hold(target_id) is not null
    or exists (select 1 from public.account_erasure_operations o
      where o.target_user_id = target_id and (o.state = 'PREPARED' or o.pg_staged_at is not null)) then
    return public.account_inactivity_notice_json(p_notice, actor, true) || '{"shouldSend":false}'::jsonb;
  end if;

  return public.claim_account_inactivity_notice(p_notice, actor, p_expected_revision,
    p_attempt, p_recipient_digest, p_auth_created_at);
end;
$claim$;
revoke all on function public.claim_account_automatic_notice(uuid, uuid, bigint, uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_account_automatic_notice(uuid, uuid, bigint, uuid, text, text) to service_role;

notify pgrst, 'reload schema';
commit;
