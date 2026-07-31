-- LEGACY: Må ikke bruges til ny 4.0.44-installation. Kør INSTALL-RAVRADAR-4.0.44.sql i stedet.
-- RavRadar 4.0.41 – profiler og brede ekspertrettigheder
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'expert' check (role in ('owner','expert')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.user_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null check (permission_key in ('handbook_review','rules_edit','rules_publish','zones_weather_edit','diagnostics_view','experts_manage','full_admin')),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(user_id,permission_key)
);
create or replace function public.handle_new_ravradar_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,email,display_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1))) on conflict(id) do update set email=excluded.email; return new; end $$;
drop trigger if exists on_auth_user_created_ravradar on auth.users;
create trigger on_auth_user_created_ravradar after insert or update of email on auth.users for each row execute function public.handle_new_ravradar_user();
insert into public.profiles(id,email,display_name) select id,email,coalesce(raw_user_meta_data->>'display_name',split_part(email,'@',1)) from auth.users on conflict(id) do update set email=excluded.email;
create or replace function public.is_ravradar_owner() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='owner' and is_active); $$;
create or replace function public.has_ravradar_permission(p_key text) returns boolean language sql stable security definer set search_path=public as $$ select public.is_ravradar_owner() or exists(select 1 from public.user_permissions where user_id=auth.uid() and permission_key=p_key and enabled); $$;
alter table public.profiles enable row level security; alter table public.user_permissions enable row level security;
drop policy if exists profiles_owner_read on public.profiles; create policy profiles_owner_read on public.profiles for select to authenticated using(public.is_ravradar_owner() or id=auth.uid());
drop policy if exists permissions_owner_read on public.user_permissions; create policy permissions_owner_read on public.user_permissions for select to authenticated using(public.is_ravradar_owner() or user_id=auth.uid());
drop policy if exists permissions_owner_write on public.user_permissions; create policy permissions_owner_write on public.user_permissions for all to authenticated using(public.is_ravradar_owner()) with check(public.is_ravradar_owner());
-- Sæt Jakob som owner. Tilpas kun mailen, hvis owner-mailen ændres.
update public.profiles set role='owner' where lower(email)=lower('jakob.jorgensen82@gmail.com');
-- Ekspertens standardrettigheder: drejebog. De øvrige vælges i RavRadar Admin.
insert into public.user_permissions(user_id,permission_key,enabled)
select id,'handbook_review',true from public.profiles where role='expert' on conflict(user_id,permission_key) do nothing;
