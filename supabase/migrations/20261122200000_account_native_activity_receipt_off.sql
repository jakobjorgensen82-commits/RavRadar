-- UNACTIVATED app append. One native-only observation; no coverage/notice/erasure authority.
begin;

create table public.account_native_activity_receipt (
  singleton boolean primary key default true check (singleton),
  arm_epoch uuid not null default pg_catalog.gen_random_uuid(),
  coverage_epoch uuid,
  armed_at timestamptz,
  native_started_at timestamptz,
  native_captured_at timestamptz,
  check (armed_at is null or isfinite(armed_at)),
  check (native_started_at is null or isfinite(native_started_at)),
  check (native_captured_at is null or isfinite(native_captured_at)),
  check ((armed_at is null) = (coverage_epoch is null)),
  check ((native_started_at is null) = (native_captured_at is null)),
  check (native_captured_at is null or
    (armed_at is not null and native_started_at >= armed_at and native_captured_at >= native_started_at))
);
alter table public.account_native_activity_receipt enable row level security;
alter table public.account_native_activity_receipt force row level security;
revoke all on public.account_native_activity_receipt from public,anon,authenticated,service_role,supabase_auth_admin;
insert into public.account_native_activity_receipt(singleton) values(true);

create or replace function public.account_native_activity_token_hook(event jsonb)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '250ms' as $token_hook$
declare target uuid; native_started timestamptz := pg_catalog.clock_timestamp(); capture_result jsonb;
begin
  if jsonb_typeof(event) is distinct from 'object'
    or jsonb_typeof(event->'claims') is distinct from 'object' then
    raise exception 'ACCOUNT_ACTIVITY_HOOK_EVENT_INVALID' using errcode = '22023';
  end if;
  target := (event->>'user_id')::uuid;
  if target is null or (event->'claims'->>'sub')::uuid is distinct from target then
    raise exception 'ACCOUNT_ACTIVITY_HOOK_EVENT_INVALID' using errcode = '22023';
  end if;
  capture_result := public.account_native_activity_capture(target);
  if capture_result->'recorded' = 'true'::jsonb then
    -- Optional observation only. Never wait for an arm/read/other native writer.
    -- A hook that started before the arm cannot consume this one receipt.
    begin
      perform 1 from public.account_native_activity_receipt r
        where r.singleton and r.armed_at is not null and r.native_captured_at is null
          and native_started >= r.armed_at
          and exists(select 1 from public.account_inactivity_policy p
            where p.singleton and p.coverage_epoch = r.coverage_epoch
              and p.coverage_status = 'UNKNOWN' and p.coverage_started_at is null
              and not p.notices_enabled and not p.delivery_qualified)
        for update nowait;
      if found then
        update public.account_native_activity_receipt
          set native_started_at = native_started, native_captured_at = pg_catalog.clock_timestamp()
          where singleton and native_captured_at is null;
      end if;
    exception when others then
      -- Receipt failure is UNKNOWN, never a reason to undo positive capture.
      -- Capture's own INVALID/cancel-or-Auth-rollback contract is unchanged.
      null;
    end;
  end if;
  return jsonb_build_object('claims',event->'claims');
end;
$token_hook$;
-- CREATE OR REPLACE keeps the previous owner/ACL, restated to close public/default grants.
revoke all on function public.account_native_activity_token_hook(jsonb) from public,anon,authenticated,service_role,supabase_auth_admin;
grant execute on function public.account_native_activity_token_hook(jsonb) to supabase_auth_admin;
comment on table public.account_native_activity_receipt is
  'One unarmed native capture observation. No user/token/claims, per-login rows or policy activation. Arm only by the separately admitted fixed owner.';
commit;
