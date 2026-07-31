-- RavRadar 4.0.44
-- ÉN samlet, genkørbar installation til central adminlagring og ekspertrettigheder.
-- Filen ændrer IKKE den eksisterende observationsdatamodel og kan derfor køres
-- på både ældre og nyere RavRadar-Supabase-projekter uden UUID/bigint-konflikter.

begin;

-- ---------------------------------------------------------------------------
-- 1. Profiler og brede ekspertrettigheder
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'expert',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists role text not null default 'expert';
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Undgå at en gammel inkompatibel check constraint blokerer migrationen.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('owner','expert')) not valid;
alter table public.profiles validate constraint profiles_role_check;

create table if not exists public.user_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

alter table public.user_permissions add column if not exists enabled boolean not null default false;
alter table public.user_permissions add column if not exists updated_at timestamptz not null default now();
alter table public.user_permissions drop constraint if exists user_permissions_permission_key_check;
alter table public.user_permissions add constraint user_permissions_permission_key_check
  check (permission_key in (
    'handbook_review','rules_edit','rules_publish','zones_weather_edit',
    'diagnostics_view','experts_manage','full_admin'
  )) not valid;
alter table public.user_permissions validate constraint user_permissions_permission_key_check;

create or replace function public.handle_new_ravradar_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id,email,display_name)
  values(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''),'@',1))
  )
  on conflict(id) do update
    set email=excluded.email,
        display_name=coalesce(public.profiles.display_name, excluded.display_name),
        updated_at=now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ravradar on auth.users;
create trigger on_auth_user_created_ravradar
after insert or update of email on auth.users
for each row execute function public.handle_new_ravradar_user();

insert into public.profiles(id,email,display_name)
select id,email,coalesce(raw_user_meta_data->>'display_name',split_part(coalesce(email,''),'@',1))
from auth.users
on conflict(id) do update
set email=excluded.email,
    display_name=coalesce(public.profiles.display_name,excluded.display_name),
    updated_at=now();

-- Jakob er permanent owner i dette projekt.
update public.profiles
set role='owner', is_active=true, updated_at=now()
where lower(email)=lower('jakob.jorgensen82@gmail.com');

-- Eksperter får som udgangspunkt kun adgang til drejebogsreview.
insert into public.user_permissions(user_id,permission_key,enabled)
select id,'handbook_review',true
from public.profiles
where role='expert'
on conflict(user_id,permission_key) do nothing;

create or replace function public.is_ravradar_owner()
returns boolean
language sql
stable
security definer
set search_path=public
set row_security=off
as $$
  select exists(
    select 1 from public.profiles
    where id=auth.uid() and role='owner' and is_active=true
  );
$$;

create or replace function public.has_ravradar_permission(p_key text)
returns boolean
language sql
stable
security definer
set search_path=public
set row_security=off
as $$
  select public.is_ravradar_owner()
    or exists(
      select 1 from public.user_permissions p
      join public.profiles pr on pr.id=p.user_id
      where p.user_id=auth.uid()
        and p.permission_key=p_key
        and p.enabled=true
        and pr.is_active=true
    );
$$;

-- ---------------------------------------------------------------------------
-- 2. Central autoritativ adminlagring med versionshistorik
-- ---------------------------------------------------------------------------
create table if not exists public.admin_documents (
  document_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

alter table public.admin_documents add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.admin_documents add column if not exists version bigint not null default 1;
alter table public.admin_documents add column if not exists updated_at timestamptz not null default now();
alter table public.admin_documents add column if not exists updated_by uuid null references auth.users(id) on delete set null;

create table if not exists public.admin_document_versions (
  id bigint generated by default as identity primary key,
  document_key text not null,
  payload jsonb not null,
  version bigint not null,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null
);
create index if not exists admin_document_versions_key_version_idx
  on public.admin_document_versions(document_key,version desc);

create table if not exists public.admin_audit_log (
  id bigint generated by default as identity primary key,
  event_type text not null,
  subject_key text,
  actor_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log(created_at desc);

create or replace function public.version_admin_document()
returns trigger
language plpgsql
security definer
set search_path=public
set row_security=off
as $$
begin
  if tg_op='UPDATE' then
    insert into public.admin_document_versions(document_key,payload,version,created_by)
    values(old.document_key,old.payload,old.version,auth.uid());
    new.version=old.version+1;
  end if;
  new.updated_at=now();
  new.updated_by=auth.uid();
  return new;
end;
$$;

drop trigger if exists admin_documents_version_trigger on public.admin_documents;
create trigger admin_documents_version_trigger
before update on public.admin_documents
for each row execute function public.version_admin_document();

create or replace function public.ravradar_document_permission(p_document_key text)
returns text
language sql
immutable
as $$
  select case
    when p_document_key in ('rules','rule-history') then 'rules_edit'
    when p_document_key in (
      'water-level-station-routing','direction-reviews','zone-overrides',
      'dmi-station-registry','dmi-station-audit','dmi-routing-suggestions'
    ) then 'zones_weather_edit'
    when p_document_key in ('diagnostics-settings') then 'diagnostics_view'
    else 'full_admin'
  end;
$$;

create or replace function public.can_manage_ravradar_document(p_document_key text)
returns boolean
language sql
stable
security definer
set search_path=public
set row_security=off
as $$
  select public.is_ravradar_owner()
    or public.has_ravradar_permission('full_admin')
    or public.has_ravradar_permission(public.ravradar_document_permission(p_document_key));
$$;

create or replace function public.save_ravradar_admin_document(
  p_document_key text,
  p_payload jsonb
)
returns table(
  document_key text,
  payload jsonb,
  version bigint,
  updated_at timestamptz,
  updated_by uuid
)
language plpgsql
security definer
set search_path=public
set row_security=off
as $$
begin
  if auth.uid() is null then
    raise exception 'LOGIN_REQUIRED' using errcode='42501';
  end if;
  if not public.can_manage_ravradar_document(p_document_key) then
    raise exception 'PERMISSION_DENIED_FOR_DOCUMENT: %',p_document_key using errcode='42501';
  end if;
  if p_document_key='rules' and coalesce(p_payload->>'schemaVersion','')='' then
    raise exception 'INVALID_RULE_DOCUMENT' using errcode='22023';
  end if;

  insert into public.admin_documents(document_key,payload,updated_by)
  values(p_document_key,coalesce(p_payload,'{}'::jsonb),auth.uid())
  on conflict(document_key) do update
    set payload=excluded.payload,
        updated_by=auth.uid();

  return query
  select d.document_key,d.payload,d.version,d.updated_at,d.updated_by
  from public.admin_documents d
  where d.document_key=p_document_key;
end;
$$;

create or replace function public.audit_ravradar_document_change()
returns trigger
language plpgsql
security definer
set search_path=public
set row_security=off
as $$
begin
  insert into public.admin_audit_log(event_type,subject_key,actor_id,details)
  values('admin_document_saved',new.document_key,auth.uid(),jsonb_build_object('version',new.version));
  return new;
end;
$$;

drop trigger if exists ravradar_document_audit_trigger on public.admin_documents;
create trigger ravradar_document_audit_trigger
after insert or update on public.admin_documents
for each row execute function public.audit_ravradar_document_change();

create or replace function public.save_ravradar_permissions(
  p_user_id uuid,
  p_permissions jsonb
)
returns void
language plpgsql
security definer
set search_path=public
set row_security=off
as $$
declare
  k text;
begin
  if auth.uid() is null then
    raise exception 'LOGIN_REQUIRED' using errcode='42501';
  end if;
  if not (
    public.is_ravradar_owner()
    or public.has_ravradar_permission('full_admin')
    or public.has_ravradar_permission('experts_manage')
  ) then
    raise exception 'PERMISSION_DENIED' using errcode='42501';
  end if;
  if exists(select 1 from public.profiles where id=p_user_id and role='owner')
     and not public.is_ravradar_owner() then
    raise exception 'OWNER_PROTECTED' using errcode='42501';
  end if;

  foreach k in array array[
    'handbook_review','rules_edit','rules_publish','zones_weather_edit',
    'diagnostics_view','experts_manage','full_admin'
  ] loop
    insert into public.user_permissions(user_id,permission_key,enabled,updated_at)
    values(p_user_id,k,coalesce((p_permissions->>k)::boolean,false),now())
    on conflict(user_id,permission_key) do update
      set enabled=excluded.enabled,updated_at=now();
  end loop;

  insert into public.admin_audit_log(event_type,subject_key,actor_id,details)
  values('permissions_saved',p_user_id::text,auth.uid(),coalesce(p_permissions,'{}'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. RLS og grants. Direkte adminskrivning lukkes; RPC bruges til writes.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_permissions enable row level security;
alter table public.admin_documents enable row level security;
alter table public.admin_document_versions enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists profiles_owner_read on public.profiles;
create policy profiles_owner_read on public.profiles
for select to authenticated
using(
  public.is_ravradar_owner()
  or id=auth.uid()
  or public.has_ravradar_permission('full_admin')
  or public.has_ravradar_permission('experts_manage')
);

drop policy if exists permissions_owner_read on public.user_permissions;
create policy permissions_owner_read on public.user_permissions
for select to authenticated
using(
  public.is_ravradar_owner()
  or user_id=auth.uid()
  or public.has_ravradar_permission('full_admin')
  or public.has_ravradar_permission('experts_manage')
);

drop policy if exists permissions_owner_write on public.user_permissions;

drop policy if exists "authenticated admins manage documents" on public.admin_documents;
drop policy if exists ravradar_admin_documents_read on public.admin_documents;
create policy ravradar_admin_documents_read on public.admin_documents
for select to authenticated
using(public.can_manage_ravradar_document(document_key));

drop policy if exists "authenticated admins read document versions" on public.admin_document_versions;
drop policy if exists ravradar_admin_document_versions_read on public.admin_document_versions;
create policy ravradar_admin_document_versions_read on public.admin_document_versions
for select to authenticated
using(public.can_manage_ravradar_document(document_key));

drop policy if exists admin_audit_read on public.admin_audit_log;
create policy admin_audit_read on public.admin_audit_log
for select to authenticated
using(
  public.is_ravradar_owner()
  or public.has_ravradar_permission('full_admin')
  or public.has_ravradar_permission('diagnostics_view')
);

revoke all on public.profiles from anon;
revoke all on public.user_permissions from anon;
revoke all on public.admin_documents from anon;
revoke all on public.admin_document_versions from anon;
revoke all on public.admin_audit_log from anon;

revoke insert,update,delete on public.admin_documents from authenticated;
revoke insert,update,delete on public.user_permissions from authenticated;
grant select on public.profiles to authenticated;
grant select on public.user_permissions to authenticated;
grant select on public.admin_documents to authenticated;
grant select on public.admin_document_versions to authenticated;
grant select on public.admin_audit_log to authenticated;
grant execute on function public.save_ravradar_admin_document(text,jsonb) to authenticated;
grant execute on function public.save_ravradar_permissions(uuid,jsonb) to authenticated;

-- Begræns øvrige funktionsrettigheder.
revoke all on function public.save_ravradar_admin_document(text,jsonb) from public,anon;
revoke all on function public.save_ravradar_permissions(uuid,jsonb) from public,anon;

-- PostgREST skal genindlæse database-skemaet.
notify pgrst,'reload schema';

commit;

-- ---------------------------------------------------------------------------
-- 4. Installationskontrol. Resultatet skal vise installed=true og owner_count=1.
-- ---------------------------------------------------------------------------
select
  to_regclass('public.profiles') is not null
  and to_regclass('public.user_permissions') is not null
  and to_regclass('public.admin_documents') is not null
  and to_regclass('public.admin_document_versions') is not null
  and to_regclass('public.admin_audit_log') is not null
  and to_regprocedure('public.save_ravradar_admin_document(text,jsonb)') is not null
  and to_regprocedure('public.save_ravradar_permissions(uuid,jsonb)') is not null
  as installed,
  (select count(*) from public.profiles where role='owner' and is_active=true) as owner_count,
  (select count(*) from public.profiles) as profile_count;
