-- Bagudkompatibel turkontrakt. Eksisterende observationer bliver schema_version 1.
-- Nye komplette ture bruger schema_version 2. Ingen præcis position eller rute lagres.
-- Produktionsskemaet stammer fra en aeldre bigint-udgave; offentlige zone-id'er
-- og browserens UUID gemmes derfor i nye, eksplicitte kolonner.

do $$
declare
  id_type text;
  id_is_identity text;
begin
  select udt_name, is_identity into id_type, id_is_identity
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'observations'
    and column_name = 'id';

  if id_type = 'int8' and id_is_identity = 'NO' then
    execute 'create sequence if not exists public.observations_id_seq as bigint';
    perform setval(
      'public.observations_id_seq',
      coalesce((select max(id) + 1 from public.observations), 1),
      false
    );
    execute 'alter sequence public.observations_id_seq owned by public.observations.id';
    execute 'alter table public.observations alter column id set default nextval(''public.observations_id_seq'')';
  elsif id_type = 'int8' and id_is_identity = 'YES' then
    null;
  elsif id_type = 'uuid' then
    alter table public.observations alter column id set default gen_random_uuid();
  else
    raise exception 'Unsupported public.observations.id type: %', id_type;
  end if;
end $$;

alter table public.observations
  add column if not exists client_observation_id uuid not null default gen_random_uuid(),
  add column if not exists schema_version smallint not null default 1,
  add column if not exists actual_zone_id text,
  add column if not exists actual_coastal_part_id text,
  add column if not exists trip_started_at timestamptz,
  add column if not exists trip_ended_at timestamptz,
  add column if not exists search_minutes integer,
  add column if not exists search_coverage text,
  add column if not exists forecast_zone_id text,
  add column if not exists forecast_coastal_part_id text,
  add column if not exists calibration_eligible boolean,
  add column if not exists found boolean,
  add column if not exists forecast_snapshot_id text,
  add column if not exists forecast_issued_at timestamptz,
  add column if not exists forecast_valid_at timestamptz,
  add column if not exists forecast_captured_at timestamptz,
  add column if not exists calibration_features jsonb,
  add column if not exists coast_type text,
  add column if not exists submitted_at timestamptz,
  add column if not exists ai_probability numeric,
  add column if not exists ai_confidence numeric,
  add column if not exists model_version text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ravradar_observations_schema_version_check'
      and conrelid = 'public.observations'::regclass
  ) then
    alter table public.observations
      add constraint ravradar_observations_schema_version_check
      check (schema_version in (1, 2));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ravradar_observations_trip_v2_check'
      and conrelid = 'public.observations'::regclass
  ) then
    alter table public.observations
      add constraint ravradar_observations_trip_v2_check
      check (
        schema_version = 1 or (
          trip_id is not null
          and trip_started_at is not null
          and trip_ended_at > trip_started_at
          and search_minutes between 1 and 1440
          and search_coverage in ('partial', 'normal', 'thorough')
          and actual_zone_id is not null
          and actual_coastal_part_id is not null
          and forecast_zone_id is not null
          and forecast_coastal_part_id is not null
          and calibration_eligible = (
            actual_zone_id = forecast_zone_id
            and actual_coastal_part_id = forecast_coastal_part_id
          )
          and found is not null
          and forecast_snapshot_id is not null
          and forecast_issued_at is not null
          and forecast_valid_at is not null
          and forecast_captured_at is not null
          and jsonb_typeof(calibration_features) = 'object'
          and forecast_issued_at <= forecast_captured_at
          and forecast_captured_at <= trip_started_at + interval '5 minutes'
        )
      );
  end if;
end $$;

create unique index if not exists observations_trip_id_v2_uidx
  on public.observations (trip_id)
  where schema_version = 2 and trip_id is not null;

create unique index if not exists observations_client_observation_id_uidx
  on public.observations (client_observation_id);

comment on column public.observations.schema_version is
  '1 = historisk observation, 2 = komplet dataminimeret søgetur.';
comment on column public.observations.actual_zone_id is
  'Den faktiske offentlige RavRadar-zone; ikke en praecis position.';
comment on column public.observations.actual_coastal_part_id is
  'Den faktiske kystdel brugeren søgte på; ikke en præcis position.';
comment on column public.observations.forecast_snapshot_id is
  'Uforanderligt id for det prognosedatasæt, der var tilgængeligt ved turstart.';
