-- Inactive source preparation. Installing functions does not configure an Auth hook
-- or enable coverage/notices/erasure. Claims and native revocation remain unchanged.
begin;

create function public.account_native_activity_capture(p_target uuid)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '250ms' as $capture$
declare
  observed timestamptz := pg_catalog.clock_timestamp();
  epoch uuid; admitted boolean := false; cancelled bigint; changed bigint;
begin
  if p_target is null then raise exception 'ACCOUNT_ACTIVITY_TARGET_REQUIRED' using errcode = '22023'; end if;
  -- Native Auth already owns user/session/token locks. Never wait for a profile
  -- writer, and remain compatible with the journal's FK KEY SHARE checks.
  begin
    perform 1 from public.profiles where id = p_target for share nowait;
    admitted := found;
    if exists(select 1 from public.account_erasure_operations
      where target_user_id = p_target and pg_staged_at is not null) then admitted := false; end if;
  exception when others then
    admitted := false;
  end;
  if admitted then
    -- Keep the successful profile admission outside this rollback boundary.
    begin
      insert into public.account_activity_journal as a(user_id,first_observed_at,last_activity_at)
        values(p_target,observed,observed)
      on conflict(user_id) do update set last_activity_at = greatest(a.last_activity_at,excluded.last_activity_at);
      select coverage_epoch into epoch from public.account_inactivity_policy
        where singleton and coverage_status = 'CAPTURING';
      insert into public.account_lifecycle_activity as a(user_id,revision,first_observed_at,last_activity_at,coverage_epoch)
        values(p_target,1,observed,observed,epoch)
      on conflict(user_id) do update set revision = a.revision + 1,
        last_activity_at = greatest(a.last_activity_at,excluded.last_activity_at),coverage_epoch = excluded.coverage_epoch;
      update public.account_inactivity_notices set state = 'CANCELLED',hold_reason = 'ACTIVITY_OBSERVED',
        revision = revision + 1,delete_not_before = null where target_user_id = p_target and state <> 'CANCELLED';
      get diagnostics cancelled = row_count;
      return jsonb_build_object('recorded',true,'noticesCancelled',cancelled);
    exception when others then
      -- No partial journal/revision/cancel survives this subtransaction.
      null;
    end;
  end if;
  -- Fail open for token availability ONLY if both safety writes commit in the
  -- SAME Auth transaction. Query cancellation/assert failures are not OTHERS;
  -- any error here propagates and rolls back positive token issuance.
  update public.account_inactivity_policy set coverage_status = 'INVALID' where singleton;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'ACCOUNT_ACTIVITY_COVERAGE_INVALIDATION_FAILED' using errcode = 'P0001'; end if;
  update public.account_inactivity_notices set state = 'CANCELLED',hold_reason = 'ACTIVITY_OBSERVED',
    revision = revision + 1,delete_not_before = null where target_user_id = p_target and state <> 'CANCELLED';
  get diagnostics cancelled = row_count;
  return jsonb_build_object('recorded',false,'coverageInvalidated',true,'noticesCancelled',cancelled);
end;
$capture$;
revoke all on function public.account_native_activity_capture(uuid) from public,anon,authenticated,service_role,supabase_auth_admin;

create or replace function public.record_account_lifecycle_activity()
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '250ms' as $activity$
declare actor uuid := auth.uid();
begin
  if actor is null or auth.role() is distinct from 'authenticated' then
    raise exception 'ACCOUNT_ACTIVITY_AUTH_REQUIRED' using errcode = '42501';
  end if;
  return public.account_native_activity_capture(actor);
end;
$activity$;
-- CREATE OR REPLACE preserves the existing authenticated-only owner/ACL.

create function public.account_native_activity_token_hook(event jsonb)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '250ms' as $token_hook$
declare target uuid;
begin
  if jsonb_typeof(event) is distinct from 'object'
    or jsonb_typeof(event->'claims') is distinct from 'object' then
    raise exception 'ACCOUNT_ACTIVITY_HOOK_EVENT_INVALID' using errcode = '22023';
  end if;
  target := (event->>'user_id')::uuid;
  if target is null or (event->'claims'->>'sub')::uuid is distinct from target then
    raise exception 'ACCOUNT_ACTIVITY_HOOK_EVENT_INVALID' using errcode = '22023';
  end if;
  perform public.account_native_activity_capture(target);
  return jsonb_build_object('claims',event->'claims');
end;
$token_hook$;
revoke all on function public.account_native_activity_token_hook(jsonb) from public,anon,authenticated,service_role,supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.account_native_activity_token_hook(jsonb) to supabase_auth_admin;
comment on function public.account_native_activity_token_hook(jsonb) is
  'INACTIVE: positive token issuance only; no Auth configuration, session DELETE hook, claim mutation or coverage activation.';
commit;
