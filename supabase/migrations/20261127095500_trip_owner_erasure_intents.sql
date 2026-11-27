begin;

-- Store authorised trip-only requests independently of a D1 rollback.
-- Account erasure has its own pre-existing outbox and remains separate.
create table public.trip_owner_erasure_intents (
  owner_subject text primary key check (owner_subject ~ '^usr_v1_[A-Za-z0-9_-]{43}$'),
  requested_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz check (completed_at is null or completed_at >= requested_at)
);
alter table public.trip_owner_erasure_intents enable row level security;
alter table public.trip_owner_erasure_intents force row level security;
revoke all on table public.trip_owner_erasure_intents from public, anon, authenticated, service_role;

-- This gate lives outside the databases restored by D1 Time Travel.
create table public.trip_erasure_recovery_gate (
  singleton boolean primary key check (singleton),
  hold_id uuid,
  held_at timestamptz,
  check ((hold_id is null and held_at is null)
    or (hold_id is not null and held_at is not null and isfinite(held_at)))
);
insert into public.trip_erasure_recovery_gate (singleton) values (true);
alter table public.trip_erasure_recovery_gate enable row level security;
alter table public.trip_erasure_recovery_gate force row level security;
revoke all on table public.trip_erasure_recovery_gate from public, anon, authenticated, service_role;

create function public.guard_trip_erasure_recovery_write()
returns trigger language plpgsql security definer set search_path = '' set lock_timeout = '5s'
as $$
declare active_hold uuid;
begin
  select gate.hold_id into active_hold
    from public.trip_erasure_recovery_gate as gate where gate.singleton for share;
  if not found or active_hold is not null then
    raise exception 'TRIP_ERASURE_RECOVERY_HOLD' using errcode = '55000';
  end if;
  return null;
end;
$$;
revoke all on function public.guard_trip_erasure_recovery_write() from public, anon, authenticated, service_role;
create trigger trip_owner_erasure_recovery_guard
  before insert or update or delete or truncate on public.trip_owner_erasure_intents
  for each statement execute function public.guard_trip_erasure_recovery_write();
create trigger account_erasure_recovery_guard
  before insert or update or delete or truncate on public.account_erasure_operations
  for each statement execute function public.guard_trip_erasure_recovery_write();

-- Preserve the hold across a runner failure. Only the controlled recovery
-- caller may later release it after confirming the exact replay.
create function public.acquire_trip_erasure_recovery_hold(p_hold_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' set lock_timeout = '5s'
as $$
declare gate public.trip_erasure_recovery_gate%rowtype;
begin
  if p_hold_id is null or p_hold_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'TRIP_ERASURE_RECOVERY_HOLD_ID_INVALID' using errcode = '22023';
  end if;
  if pg_catalog.current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'TRIP_ERASURE_RECOVERY_REQUIRES_FRESH_SNAPSHOT' using errcode = '40001';
  end if;
  select * into strict gate from public.trip_erasure_recovery_gate where singleton for update;
  if gate.hold_id = p_hold_id then return gate.held_at; end if;
  if gate.hold_id is not null or exists (
    select 1 from public.account_erasure_operations
    where auth_claimed_at is not null and auth_absent_at is null
  ) then
    raise exception 'TRIP_ERASURE_RECOVERY_ADMISSION_BLOCKED' using errcode = '55000';
  end if;
  -- This separate READ COMMITTED statement follows the wait for all writers.
  update public.trip_erasure_recovery_gate set hold_id = p_hold_id, held_at = pg_catalog.clock_timestamp()
    where singleton returning held_at into gate.held_at;
  return gate.held_at;
end;
$$;
revoke all on function public.acquire_trip_erasure_recovery_hold(uuid) from public, anon, authenticated, service_role;
grant execute on function public.acquire_trip_erasure_recovery_hold(uuid) to service_role;

create function public.record_trip_owner_erasure_intent(p_owner_subject text, p_completed boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_owner_subject is null or p_owner_subject !~ '^usr_v1_[A-Za-z0-9_-]{43}$' or p_completed is null then
    raise exception 'invalid trip owner erasure intent' using errcode = '22023';
  end if;

  if p_completed then
    update public.trip_owner_erasure_intents as intent
      set completed_at = greatest(intent.requested_at, statement_timestamp())
      where intent.owner_subject = p_owner_subject and intent.completed_at is null;
  else
    insert into public.trip_owner_erasure_intents (owner_subject)
      values (p_owner_subject) on conflict (owner_subject) do nothing;
  end if;

  return exists (select 1 from public.trip_owner_erasure_intents as intent
    where intent.owner_subject = p_owner_subject and (not p_completed or intent.completed_at is not null));
end;
$$;
revoke all on function public.record_trip_owner_erasure_intent(text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.record_trip_owner_erasure_intent(text, boolean) to service_role;

-- The recovery caller supplies the earliest restored shard and an established
-- capture boundary. A held recovery also checks all ten shards before reopen.
create function public.read_trip_erasure_restore_subjects(
  p_hold_id uuid, p_restore_from timestamptz, p_capture_at timestamptz, p_after_subject text
)
returns table (owner_subject text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_restore_from is null or p_capture_at is null or not isfinite(p_restore_from)
    or not isfinite(p_capture_at) or p_restore_from > p_capture_at
    or p_capture_at > statement_timestamp()
    or (p_after_subject is not null and p_after_subject !~ '^usr_v1_[A-Za-z0-9_-]{43}$')
  then
    raise exception 'invalid trip restore evidence window' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.trip_erasure_recovery_gate as gate
    where gate.singleton and gate.hold_id = p_hold_id and gate.held_at <= p_capture_at
  ) then
    raise exception 'TRIP_ERASURE_RECOVERY_HOLD_UNVERIFIED' using errcode = '55000';
  end if;

  return query
  select eligible.subject
    from (
      select intent.owner_subject as subject
        from public.trip_owner_erasure_intents as intent
        where intent.requested_at <= p_capture_at
          and (intent.completed_at is null or intent.completed_at >= p_restore_from)
      union
      select operation.d1_owner_subject as subject
        from public.account_erasure_operations as operation
        where operation.auth_absent_at <= p_capture_at
          and (operation.d1_ack_at is null or operation.d1_ack_at >= p_restore_from)
    ) as eligible
    where p_after_subject is null or eligible.subject collate pg_catalog."C" > p_after_subject collate pg_catalog."C"
    order by eligible.subject collate pg_catalog."C"
    limit 100;
end;
$$;
revoke all on function public.read_trip_erasure_restore_subjects(uuid, timestamptz, timestamptz, text)
  from public, anon, authenticated, service_role;
grant execute on function public.read_trip_erasure_restore_subjects(uuid, timestamptz, timestamptz, text) to service_role;

commit;
