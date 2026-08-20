-- Bagudkompatibel turkontrakt. Eksisterende observationer bliver schema_version 1.
-- Nye komplette ture bruger schema_version 2. Ingen præcis position eller rute lagres.

alter table public.ravradar_observations
  add column if not exists schema_version smallint not null default 1,
  add column if not exists trip_id text,
  add column if not exists trip_started_at timestamptz,
  add column if not exists trip_ended_at timestamptz,
  add column if not exists search_minutes integer,
  add column if not exists search_coverage text,
  add column if not exists coastal_part_id text,
  add column if not exists found boolean,
  add column if not exists forecast_snapshot_id text,
  add column if not exists forecast_issued_at timestamptz,
  add column if not exists forecast_valid_at timestamptz,
  add column if not exists forecast_captured_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ravradar_observations_schema_version_check'
      and conrelid = 'public.ravradar_observations'::regclass
  ) then
    alter table public.ravradar_observations
      add constraint ravradar_observations_schema_version_check
      check (schema_version in (1, 2));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ravradar_observations_trip_v2_check'
      and conrelid = 'public.ravradar_observations'::regclass
  ) then
    alter table public.ravradar_observations
      add constraint ravradar_observations_trip_v2_check
      check (
        schema_version = 1 or (
          trip_id is not null
          and trip_started_at is not null
          and trip_ended_at > trip_started_at
          and search_minutes between 1 and 1440
          and search_coverage in ('partial', 'normal', 'thorough')
          and coastal_part_id is not null
          and found is not null
          and forecast_snapshot_id is not null
          and forecast_issued_at is not null
          and forecast_valid_at is not null
          and forecast_captured_at is not null
          and forecast_issued_at <= forecast_captured_at
          and forecast_captured_at <= trip_started_at + interval '5 minutes'
        )
      );
  end if;
end $$;

comment on column public.ravradar_observations.schema_version is
  '1 = historisk observation, 2 = komplet dataminimeret søgetur.';
comment on column public.ravradar_observations.coastal_part_id is
  'Den faktiske kystdel brugeren søgte på; ikke en præcis position.';
comment on column public.ravradar_observations.forecast_snapshot_id is
  'Uforanderligt id for det prognosedatasæt, der var tilgængeligt ved turstart.';
