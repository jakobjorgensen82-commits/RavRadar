-- RavRadar 4.0.284: server-side privilege, rate-limit and observation-write contract.
-- Idempotent and data-preserving. Existing observations and user permissions are not removed.

begin;

create table if not exists public.public_request_limits (
  scope text not null,
  subject_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope, subject_hash)
);

alter table public.public_request_limits enable row level security;
revoke all on table public.public_request_limits from public, anon, authenticated;
grant select, insert, update on table public.public_request_limits to service_role;

create or replace function public.consume_public_request_limit(
  p_scope text,
  p_subject_hash text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  bucket timestamptz;
  current_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_scope is null or char_length(p_scope) not between 3 and 120
    or p_subject_hash is null or char_length(p_subject_hash) not between 6 and 128
    or p_limit not between 1 and 100000
    or p_window_seconds not between 10 and 86400 then
    raise exception 'INVALID_RATE_LIMIT_ARGUMENTS' using errcode = '22023';
  end if;

  bucket := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.public_request_limits(
    scope, subject_hash, window_started_at, request_count, updated_at
  ) values (
    p_scope, p_subject_hash, bucket, 1, now()
  )
  on conflict (scope, subject_hash) do update
  set window_started_at = excluded.window_started_at,
      request_count = case
        when public.public_request_limits.window_started_at = excluded.window_started_at
          then public.public_request_limits.request_count + 1
        else 1
      end,
      updated_at = now()
  returning request_count into current_count;

  return current_count <= p_limit;
end
$$;

revoke all on function public.consume_public_request_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_public_request_limit(text, text, integer, integer) to service_role;

create or replace function public.save_ravradar_permissions(
  p_user_id uuid,
  p_permissions jsonb
) returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  k text;
  target_role text;
  can_manage_all boolean := public.is_ravradar_owner() or public.has_ravradar_permission('full_admin');
  expert_keys text[] := array['admin_access', 'handbook_view', 'handbook_review'];
  all_keys text[] := array['admin_access','handbook_view','handbook_review','rules_view','rules_edit','rules_publish','zones_view','zones_weather_edit','diagnostics_view','diagnostics_download','observations_view','learning_manage','experts_manage','system_manage','full_admin'];
  managed_keys text[];
  enabled_count integer := 0;
begin
  if not (can_manage_all or public.has_ravradar_permission('experts_manage')) then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;
  if p_permissions is null or jsonb_typeof(p_permissions) <> 'object' then
    raise exception 'PERMISSION_OBJECT_REQUIRED' using errcode = '22023';
  end if;

  select role into target_role from public.profiles where id = p_user_id;
  if target_role is null then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target_role = 'owner' and not public.is_ravradar_owner() then
    raise exception 'OWNER_PROTECTED' using errcode = '42501';
  end if;

  if not can_manage_all then
    if target_role <> 'expert' then
      raise exception 'EXPERT_TARGET_REQUIRED' using errcode = '42501';
    end if;
    if exists (
      select 1
      from jsonb_each_text(p_permissions) item
      where not (item.key = any(expert_keys)) and lower(item.value) = 'true'
    ) then
      raise exception 'EXPERT_PERMISSION_SCOPE_EXCEEDED' using errcode = '42501';
    end if;
    managed_keys := expert_keys;
  else
    managed_keys := all_keys;
  end if;

  if exists (
    select 1 from jsonb_each(p_permissions) item
    where not (item.key = any(all_keys))
  ) then
    raise exception 'UNKNOWN_PERMISSION_KEY' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_each(p_permissions) item
    where jsonb_typeof(item.value) <> 'boolean'
  ) then
    raise exception 'INVALID_PERMISSION_VALUE' using errcode = '22023';
  end if;

  foreach k in array managed_keys loop
    insert into public.user_permissions(user_id, permission_key, enabled, updated_at)
    values (p_user_id, k, coalesce((p_permissions ->> k)::boolean, false), now())
    on conflict (user_id, permission_key) do update
      set enabled = excluded.enabled, updated_at = now();
    if coalesce((p_permissions ->> k)::boolean, false) then
      enabled_count := enabled_count + 1;
    end if;
  end loop;

  insert into public.admin_audit_log(event_type, subject_key, actor_id, details)
  values (
    'permissions_saved',
    p_user_id::text,
    auth.uid(),
    jsonb_build_object(
      'scope', case when can_manage_all then 'administrator' else 'expert' end,
      'managed_keys', to_jsonb(managed_keys),
      'enabled_count', enabled_count
    )
  );
end
$$;

-- En ekspertadministrator må kun se ekspertkonti og de tre ufarlige
-- ekspertrettigheder. Filtreringen ligger i databasen, ikke kun i browseren.
alter table public.profiles enable row level security;
alter table public.user_permissions enable row level security;

drop policy if exists profiles_owner_read on public.profiles;
drop policy if exists permissions_owner_read on public.user_permissions;
drop policy if exists ravradar_profiles_read on public.profiles;
drop policy if exists ravradar_user_permissions_read on public.user_permissions;

create policy ravradar_profiles_read
on public.profiles for select to authenticated
using(
  public.is_ravradar_owner()
  or public.has_ravradar_permission('full_admin')
  or id = auth.uid()
  or (
    public.has_ravradar_permission('experts_manage')
    and role = 'expert'
  )
);

create policy ravradar_user_permissions_read
on public.user_permissions for select to authenticated
using(
  public.is_ravradar_owner()
  or public.has_ravradar_permission('full_admin')
  or user_id = auth.uid()
  or (
    public.has_ravradar_permission('experts_manage')
    and permission_key in ('admin_access', 'handbook_view', 'handbook_review')
    and exists (
      select 1 from public.profiles target_profile
      where target_profile.id = user_permissions.user_id
        and target_profile.role = 'expert'
    )
  )
);

revoke all on table public.profiles, public.user_permissions from anon;
grant select on table public.profiles, public.user_permissions to authenticated;

-- Fjern tidligere brede policies, og genopret kun den dokumentadgang,
-- som den konkrete admin-rettighed giver. Skrivning sker fortsat via RPC.
drop policy if exists "authenticated admins manage documents" on public.admin_documents;
drop policy if exists "authenticated admins read document versions" on public.admin_document_versions;
drop policy if exists ravradar_admin_documents_read on public.admin_documents;
drop policy if exists ravradar_admin_document_versions_read on public.admin_document_versions;

create policy ravradar_admin_documents_read
on public.admin_documents for select to authenticated
using(
  public.is_ravradar_owner()
  or public.has_ravradar_permission('full_admin')
  or public.has_ravradar_permission(public.ravradar_document_permission(document_key))
);

create policy ravradar_admin_document_versions_read
on public.admin_document_versions for select to authenticated
using(
  public.is_ravradar_owner()
  or public.has_ravradar_permission('full_admin')
  or public.has_ravradar_permission(public.ravradar_document_permission(document_key))
);

revoke insert, update, delete on table public.admin_documents from anon, authenticated;
revoke insert, update, delete on table public.admin_document_versions from anon, authenticated;
grant select on table public.admin_documents, public.admin_document_versions to authenticated;

-- Eksperter må indsende og læse egne håndbogsreviews. Kun ejer/full_admin
-- må behandle reviews eller læse versionshistorikken.
drop policy if exists "authenticated users submit handbook reviews" on public.handbook_reviews;
drop policy if exists "users read own handbook reviews" on public.handbook_reviews;
drop policy if exists "authenticated admins manage handbook reviews" on public.handbook_reviews;
drop policy if exists "authenticated reviewers read handbook review queue" on public.handbook_reviews;
drop policy if exists "authenticated admins read handbook review versions" on public.handbook_review_versions;
drop policy if exists "reviewers read handbook review versions" on public.handbook_review_versions;
drop policy if exists "experts submit handbook reviews" on public.handbook_reviews;
drop policy if exists "reviewers update handbook reviews" on public.handbook_reviews;
drop policy if exists "users or reviewers read handbook reviews" on public.handbook_reviews;
drop policy if exists handbook_review_insert on public.handbook_reviews;
drop policy if exists handbook_review_read on public.handbook_reviews;
drop policy if exists handbook_review_manage on public.handbook_reviews;
drop policy if exists handbook_review_delete on public.handbook_reviews;
drop policy if exists handbook_review_versions_read on public.handbook_review_versions;

create policy handbook_review_insert
on public.handbook_reviews for insert to authenticated
with check(
  created_by = auth.uid()
  and public.has_ravradar_permission('handbook_review')
);

create policy handbook_review_read
on public.handbook_reviews for select to authenticated
using(
  (
    public.has_ravradar_permission('handbook_review')
    and created_by = auth.uid()
  )
  or public.is_ravradar_owner()
  or public.has_ravradar_permission('full_admin')
);

create policy handbook_review_manage
on public.handbook_reviews for update to authenticated
using(public.is_ravradar_owner() or public.has_ravradar_permission('full_admin'))
with check(public.is_ravradar_owner() or public.has_ravradar_permission('full_admin'));

create policy handbook_review_delete
on public.handbook_reviews for delete to authenticated
using(public.is_ravradar_owner() or public.has_ravradar_permission('full_admin'));

create policy handbook_review_versions_read
on public.handbook_review_versions for select to authenticated
using(public.is_ravradar_owner() or public.has_ravradar_permission('full_admin'));

revoke all on table public.handbook_reviews, public.handbook_review_versions from anon;
grant select, insert, update, delete on table public.handbook_reviews to authenticated;
revoke insert, update, delete on table public.handbook_review_versions from authenticated;
grant select on table public.handbook_review_versions to authenticated;

drop policy if exists "anonymous observations can be inserted" on public.observations;
drop policy if exists "authenticated observations can be inserted" on public.observations;
revoke insert on table public.observations from anon, authenticated;
grant insert, select on table public.observations to service_role;

create or replace function public.ravradar_security_contract()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
set row_security = off
as $$
declare
  result jsonb;
begin
  if not (public.is_ravradar_owner() or public.has_ravradar_permission('full_admin')) then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'observations_rls_enabled', coalesce((select relrowsecurity from pg_class where oid = 'public.observations'::regclass), false),
    'observations_anon_insert', has_table_privilege('anon', 'public.observations', 'INSERT'),
    'observations_authenticated_insert', has_table_privilege('authenticated', 'public.observations', 'INSERT'),
    'own_observation_read_policy', exists(
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'observations'
        and policyname = 'users can read own observations'
    ),
    'rate_limit_table_rls_enabled', coalesce((select relrowsecurity from pg_class where oid = 'public.public_request_limits'::regclass), false),
    'rate_limit_rpc_present', to_regprocedure('public.consume_public_request_limit(text,text,integer,integer)') is not null,
    'permission_rpc_present', to_regprocedure('public.save_ravradar_permissions(uuid,jsonb)') is not null,
    'profiles_expert_scope_policy_present', exists(
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'profiles'
        and policyname = 'ravradar_profiles_read'
    ),
    'permissions_expert_scope_policy_present', exists(
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'user_permissions'
        and policyname = 'ravradar_user_permissions_read'
    ),
    'admin_documents_broad_policy_present', exists(
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'admin_documents'
        and policyname = 'authenticated admins manage documents'
    ),
    'admin_document_versions_broad_policy_present', exists(
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'admin_document_versions'
        and policyname = 'authenticated admins read document versions'
    ),
    'handbook_review_versions_broad_policy_present', exists(
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'handbook_review_versions'
        and policyname = 'authenticated admins read handbook review versions'
    )
  ) into result;
  return result;
end
$$;

revoke all on function public.ravradar_security_contract() from public, anon;
grant execute on function public.ravradar_security_contract() to authenticated;

notify pgrst, 'reload schema';

commit;
