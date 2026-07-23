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

create index if not exists observations_zone_time_idx on public.observations (zone_id, observed_at desc);
create index if not exists observations_created_idx on public.observations (created_at desc);
create index if not exists observations_user_idx on public.observations (user_id, observed_at desc);
alter table public.observations enable row level security;

drop policy if exists "anonymous observations can be inserted" on public.observations;
create policy "anonymous observations can be inserted" on public.observations for insert to anon
with check (user_id is null and observed_at between now() - interval '2 days' and now() + interval '10 minutes');

drop policy if exists "authenticated observations can be inserted" on public.observations;
create policy "authenticated observations can be inserted" on public.observations for insert to authenticated
with check (user_id is null or user_id = auth.uid());

drop policy if exists "observations are publicly readable" on public.observations;
drop policy if exists "users can read own observations" on public.observations;
create policy "users can read own observations" on public.observations for select to authenticated
using (user_id = auth.uid());
