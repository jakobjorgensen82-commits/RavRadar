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

commit;
