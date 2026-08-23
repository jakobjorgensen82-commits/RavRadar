-- LEGACY: Må ikke bruges til ny 4.0.44-installation. Kør INSTALL-RAVRADAR-4.0.44.sql i stedet.
-- RavRadar 2.3. Appen virker uden Supabase. Tabellen bruges kun, når synkronisering er aktiveret.
create table if not exists public.observations (
  id uuid primary key,
  zone_id text not null check (char_length(zone_id) between 2 and 80),
  zone_name text,
  observed_at timestamptz not null default now(),
  hunt_mode text not null check (hunt_mode in ('waders', 'beach')),
  result text not null check (result in ('none', 'small', 'medium', 'good')),
  grams numeric check (grams is null or grams between 0 and 10000),
  anonymous_id uuid not null,
  user_id uuid null references auth.users(id) on delete set null,
  trip_id uuid null,
  gps jsonb null,
  rav_score smallint check (rav_score is null or rav_score between 0 and 100),
  score_level text,
  weather_snapshot jsonb not null default '{}'::jsonb,
  wind_speed_mps numeric, wind_direction_deg numeric,
  wave_height_m numeric, wave_period_s numeric,
  water_level_cm numeric,
  current_speed_mps numeric, current_direction_deg numeric,
  water_temperature_c numeric,
  created_at timestamptz not null default now()
);

alter table public.observations add column if not exists zone_name text;
alter table public.observations add column if not exists grams numeric;
alter table public.observations add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.observations add column if not exists trip_id uuid;
alter table public.observations add column if not exists gps jsonb;
alter table public.observations add column if not exists rav_score smallint;
alter table public.observations add column if not exists score_level text;
alter table public.observations add column if not exists weather_snapshot jsonb not null default '{}'::jsonb;
alter table public.observations add column if not exists wind_speed_mps numeric;
alter table public.observations add column if not exists wind_direction_deg numeric;
alter table public.observations add column if not exists wave_height_m numeric;
alter table public.observations add column if not exists wave_period_s numeric;
alter table public.observations add column if not exists water_level_cm numeric;
alter table public.observations add column if not exists current_speed_mps numeric;
alter table public.observations add column if not exists current_direction_deg numeric;
alter table public.observations add column if not exists water_temperature_c numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.observations'::regclass
      and conname = 'observations_remote_location_null'
  ) then
    alter table public.observations
      add constraint observations_remote_location_null
      check (
        gps is null
        and not (coalesce(weather_snapshot, '{}'::jsonb) ?| array['gps','latitude','longitude','coordinates','position'])
      ) not valid;
  end if;
end $$;

create index if not exists observations_zone_time_idx on public.observations (zone_id, observed_at desc);
create index if not exists observations_created_idx on public.observations (created_at desc);
create index if not exists observations_user_idx on public.observations (user_id, observed_at desc);
alter table public.observations enable row level security;

drop policy if exists "anonymous observations can be inserted" on public.observations;
create policy "anonymous observations can be inserted" on public.observations for insert to anon
with check (
  user_id is null
  and gps is null
  and not (coalesce(weather_snapshot, '{}'::jsonb) ?| array['gps','latitude','longitude','coordinates','position'])
  and observed_at between now() - interval '2 days' and now() + interval '10 minutes'
);

drop policy if exists "authenticated observations can be inserted" on public.observations;
create policy "authenticated observations can be inserted" on public.observations for insert to authenticated
with check (
  (user_id is null or user_id = auth.uid())
  and gps is null
  and not (coalesce(weather_snapshot, '{}'::jsonb) ?| array['gps','latitude','longitude','coordinates','position'])
);

drop policy if exists "observations are publicly readable" on public.observations;
drop policy if exists "users can read own observations" on public.observations;
create policy "users can read own observations" on public.observations for select to authenticated
using (user_id = auth.uid());
grant select on table public.observations to authenticated;

-- RavRadar 2.6.25: fundament for ekspertviden, regelversioner og analyse.
-- Administrative writes must later be restricted to server-side/admin functions.
create table if not exists public.knowledge_rules (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('bonus','penalty','persistence','gate','override','annotation')),
  status text not null default 'draft' check (status in ('draft','active','inactive','retired')),
  geography jsonb not null default '{}'::jsonb,
  priority integer not null default 100 check (priority between 0 and 10000),
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_rule_versions (
  rule_id text not null references public.knowledge_rules(id) on delete cascade,
  version integer not null check (version >= 1),
  knowledge_class text not null check (knowledge_class in ('documented','expert','data-derived','hypothesis')),
  confidence text not null check (confidence in ('lav','mellem','stor')),
  source jsonb not null,
  conditions jsonb not null default '{}'::jsonb,
  effect jsonb not null default '{}'::jsonb,
  rationale text,
  valid_from timestamptz,
  valid_to timestamptz,
  approved_by uuid null references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (rule_id, version)
);

create table if not exists public.weather_observations (
  id bigint generated by default as identity primary key,
  zone_id text not null,
  observed_at timestamptz not null,
  source text not null check (source in ('dmi','open-meteo-marine','met-norway','cache','mixed')),
  quality text not null check (quality in ('good','partial','stale','missing')),
  wind_speed_mps numeric,
  wind_direction_from_deg numeric check (wind_direction_from_deg is null or (wind_direction_from_deg >= 0 and wind_direction_from_deg < 360)),
  current_speed_mps numeric,
  current_direction_towards_deg numeric check (current_direction_towards_deg is null or (current_direction_towards_deg >= 0 and current_direction_towards_deg < 360)),
  wave_height_m numeric,
  wave_period_s numeric,
  water_level_cm numeric,
  water_temperature_c numeric,
  raw_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(zone_id, observed_at, source)
);
create index if not exists weather_observations_zone_time_idx on public.weather_observations(zone_id, observed_at desc);

create table if not exists public.score_evaluations (
  id uuid primary key,
  zone_id text not null,
  evaluated_at timestamptz not null,
  hunt_mode text not null check (hunt_mode in ('waders','beach')),
  base_score smallint not null check (base_score between 0 and 100),
  rule_adjustment smallint not null default 0 check (rule_adjustment between -100 and 100),
  final_score smallint not null check (final_score between 0 and 100),
  engine_version text not null,
  matched_rule_versions jsonb not null default '[]'::jsonb,
  explanation jsonb not null default '[]'::jsonb,
  input_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists score_evaluations_zone_time_idx on public.score_evaluations(zone_id, evaluated_at desc);

create table if not exists public.observation_rule_matches (
  observation_id uuid not null references public.observations(id) on delete cascade,
  rule_id text not null,
  rule_version integer not null,
  adjustment smallint not null default 0,
  explanation text,
  primary key (observation_id, rule_id, rule_version),
  foreign key (rule_id, rule_version) references public.knowledge_rule_versions(rule_id, version)
);

create table if not exists public.analysis_exports (
  id uuid primary key,
  requested_by uuid null references auth.users(id) on delete set null,
  format text not null check (format in ('csv','jsonl','parquet')),
  filters jsonb not null default '{}'::jsonb,
  privacy_profile text not null default 'pseudonymised',
  row_count integer,
  status text not null default 'queued' check (status in ('queued','running','ready','failed','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.knowledge_rules enable row level security;
alter table public.knowledge_rule_versions enable row level security;
alter table public.weather_observations enable row level security;
alter table public.score_evaluations enable row level security;
alter table public.observation_rule_matches enable row level security;
alter table public.analysis_exports enable row level security;

-- Active rules may later be exposed read-only to authenticated clients.
drop policy if exists "authenticated users can read active rules" on public.knowledge_rules;
create policy "authenticated users can read active rules" on public.knowledge_rules
for select to authenticated using (status = 'active');

drop policy if exists "authenticated users can read active rule versions" on public.knowledge_rule_versions;
create policy "authenticated users can read active rule versions" on public.knowledge_rule_versions
for select to authenticated using (
  exists (
    select 1 from public.knowledge_rules r
    where r.id = rule_id and r.status = 'active' and r.current_version = version
  )
);

-- RavRadar 2.6.26: driftsalarmer og kontrollerbar sletning af gammel vejrhistorik.
create table if not exists public.weather_ingestion_status (
  source text primary key,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  consecutive_failure_since timestamptz,
  status text not null default 'unknown' check (status in ('ok','warning','alarm','unknown')),
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_alert_log (
  id bigint generated by default as identity primary key,
  alert_type text not null,
  source text not null,
  sent_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);
create index if not exists admin_alert_log_type_time_idx on public.admin_alert_log(alert_type, sent_at desc);

create table if not exists public.weather_retention_policy (
  id boolean primary key default true check (id),
  raw_days integer not null default 7 check (raw_days >= 1),
  hourly_days integer not null default 90 check (hourly_days >= raw_days),
  long_term_days integer not null default 1095 check (long_term_days >= hourly_days),
  max_admin_alerts_per_24h integer not null default 2 check (max_admin_alerts_per_24h between 0 and 2),
  updated_at timestamptz not null default now()
);
insert into public.weather_retention_policy(id) values (true) on conflict (id) do nothing;

create or replace function public.can_send_weather_admin_alert(p_alert_type text, p_source text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select count(*) < 2
  from public.admin_alert_log
  where alert_type = p_alert_type
    and source = p_source
    and sent_at >= now() - interval '24 hours';
$$;

create or replace function public.prune_old_weather_data(p_before timestamptz)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  delete from public.weather_observations
  where observed_at < p_before;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

alter table public.weather_ingestion_status enable row level security;
alter table public.admin_alert_log enable row level security;
alter table public.weather_retention_policy enable row level security;
revoke all on function public.can_send_weather_admin_alert(text, text) from public, anon, authenticated;
revoke all on function public.prune_old_weather_data(timestamptz) from public, anon, authenticated;


-- RavRadar 4.0.18: central autoritativ lagring af alle admin-dokumenter.
create table if not exists public.admin_documents (
  document_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);
create table if not exists public.admin_document_versions (
  id bigint generated by default as identity primary key,
  document_key text not null, payload jsonb not null, version bigint not null,
  created_at timestamptz not null default now(), created_by uuid null references auth.users(id) on delete set null
);
create or replace function public.version_admin_document() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.payload is not distinct from old.payload then return null; end if;
  if tg_op='UPDATE' and old.document_key not in ('weather-health','runtime-diagnostics','dmi-water-stations','water-station-routing-audit','ocean-diagnostics','cache-audit','implementation-audit','protected-asset-manifest') then insert into public.admin_document_versions(document_key,payload,version,created_by) values(old.document_key,old.payload,old.version,auth.uid()); end if;
  if tg_op='UPDATE' then new.version=old.version+1; end if;
  new.updated_at=now(); new.updated_by=auth.uid(); return new;
end;$$;
drop trigger if exists admin_documents_version_trigger on public.admin_documents;
create trigger admin_documents_version_trigger before update on public.admin_documents for each row execute function public.version_admin_document();
alter table public.admin_documents enable row level security; alter table public.admin_document_versions enable row level security;
drop policy if exists "authenticated admins manage documents" on public.admin_documents;
create policy "authenticated admins manage documents" on public.admin_documents for all to authenticated using(true) with check(true);
drop policy if exists "authenticated admins read document versions" on public.admin_document_versions;
create policy "authenticated admins read document versions" on public.admin_document_versions for select to authenticated using(true);

-- RavRadar 4.0.33: produktionsgrundlag for samtykke, prognosekobling og datakvalitet.
alter table public.observations add column if not exists consent_version text;
alter table public.observations add column if not exists forecast_issued_at timestamptz;
alter table public.observations add column if not exists forecast_target_at timestamptz;
alter table public.observations add column if not exists score_engine_version text;
alter table public.observations add column if not exists data_quality_flags jsonb not null default '[]'::jsonb;
alter table public.observations add column if not exists search_minutes integer check (search_minutes is null or search_minutes between 1 and 1440);
alter table public.observations add column if not exists report_accuracy text check (report_accuracy is null or report_accuracy in ('exact','approximate','unknown'));
create unique index if not exists observations_user_trip_unique on public.observations(user_id,trip_id) where user_id is not null and trip_id is not null;
create index if not exists observations_forecast_target_idx on public.observations(zone_id, forecast_target_at desc);
