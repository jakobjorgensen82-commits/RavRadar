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
drop policy if exists "authenticated observations can be inserted" on public.observations;
revoke insert on table public.observations from anon, authenticated;
-- Offentlige writes går gennem submit-observation Edge Function, som validerer,
-- begrænser frekvensen og bruger service_role efter den server-side kontrol.

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
drop policy if exists "authenticated admins read document versions" on public.admin_document_versions;
revoke all on public.admin_documents,public.admin_document_versions from anon;
revoke insert,update,delete on public.admin_documents,public.admin_document_versions from authenticated;
-- Denne fil er en historisk skemareference. Den aktuelle SECURITY-installation
-- opretter de dokumentnøgle-afgrænsede læsepolicies og RPC-baseret skrivning.

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

-- DEC-0109: trip-v2 quality lineage is an exact allowlist. Both an honestly
-- marked reconstructed RavScore and the public last-complete emergency view
-- remain useful observations, but neither may enter forecast calibration.
alter table public.observations
  drop constraint if exists ravradar_observations_trip_v2_check;

alter table public.observations
  add constraint ravradar_observations_trip_v2_check
  check (
    schema_version = 1 or (schema_version = 2 and
      trip_id is not null
      and trip_started_at is not null
      and trip_ended_at > trip_started_at
      and search_minutes between 1 and 1440
      and search_coverage in ('partial', 'normal', 'thorough')
      and actual_zone_id is not null
      and actual_coastal_part_id is not null
      and forecast_zone_id is not null
      and forecast_coastal_part_id is not null
      and coalesce(data_quality_flags, '[]'::jsonb) in (
        '[]'::jsonb,
        '["ravscore-reconstructed-derived-evidence"]'::jsonb,
        '["public-emergency-last-complete"]'::jsonb,
        '["public-emergency-last-complete","ravscore-reconstructed-derived-evidence"]'::jsonb,
        '["ravscore-evidence-trust-unattested"]'::jsonb
      )
      and calibration_eligible = (
        actual_zone_id = forecast_zone_id
        and actual_coastal_part_id = forecast_coastal_part_id
        and coalesce(data_quality_flags, '[]'::jsonb) = '[]'::jsonb
      )
      and found is not null
      and forecast_snapshot_id is not null
      and forecast_issued_at is not null
      and forecast_valid_at is not null
      and forecast_captured_at is not null
      and jsonb_typeof(calibration_features) = 'object'
      and jsonb_typeof(coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb)) = 'array'
      and jsonb_path_query_array(
        coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb),
        '$[*] ? (@ == "public-emergency-last-complete" || @ == "ravscore-reconstructed-derived-evidence" || @ == "ravscore-evidence-trust-unattested")'
      ) = coalesce(data_quality_flags, '[]'::jsonb)
      and ((coalesce(data_quality_flags, '[]'::jsonb) ? 'ravscore-reconstructed-derived-evidence')
        = (coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb) ? 'ravscore-reconstructed-derived-evidence'))
      and ((coalesce(data_quality_flags, '[]'::jsonb) ? 'public-emergency-last-complete')
        = (coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb) ? 'public-emergency-last-complete'))
      and ((coalesce(data_quality_flags, '[]'::jsonb) ? 'ravscore-evidence-trust-unattested')
        = (coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb) ? 'ravscore-evidence-trust-unattested'))
      and jsonb_array_length(jsonb_path_query_array(
        coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb),
        '$[*] ? (@ == "ravscore-reconstructed-derived-evidence")'
      )) <= 1
      and jsonb_array_length(jsonb_path_query_array(
        coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb),
        '$[*] ? (@ == "public-emergency-last-complete")'
      )) <= 1
      and jsonb_array_length(jsonb_path_query_array(
        coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb),
        '$[*] ? (@ == "ravscore-evidence-trust-unattested")'
      )) <= 1
      and forecast_issued_at <= forecast_captured_at
      and forecast_captured_at <= trip_started_at + interval '5 minutes'
    )
  ) not valid;

alter table public.observations
  validate constraint ravradar_observations_trip_v2_check;

comment on constraint ravradar_observations_trip_v2_check on public.observations is
  'Trip v2 DEC-0109-v2: exact quality allowlist and canonical quality-reason order; reconstructed, public-emergency and legacy-unattested snapshots are always excluded from calibration.';

create or replace function public.ravradar_ravscore_operational_cas(
  p_expected_operational_version bigint,
  p_expected_profile_version bigint,
  p_operational_payload jsonb,
  p_profile_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_operational_version bigint;
  v_operational_payload jsonb;
  v_profile_version bigint;
  v_profile_payload jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service role required' using errcode='42501';
  end if;
  if p_expected_operational_version < 0 or p_expected_profile_version < 0
    or jsonb_typeof(p_operational_payload) <> 'object'
    or jsonb_typeof(p_profile_payload) <> 'object' then
    raise exception 'invalid RavScore CAS input' using errcode='22023';
  end if;

  -- Every caller locks the two keys in this fixed order.
  select version, payload into v_operational_version, v_operational_payload
  from public.admin_documents
  where document_key='ravscore-operational-model-activation'
  for update;
  select version, payload into v_profile_version, v_profile_payload
  from public.admin_documents
  where document_key='ravscore-profile-selection'
  for update;

  if p_expected_operational_version = 0 then
    if v_operational_version is not null then
      raise exception 'operational CAS version mismatch' using errcode='40001';
    end if;
    insert into public.admin_documents(document_key,payload,updated_by)
    values('ravscore-operational-model-activation',p_operational_payload,null)
    returning version,payload into v_operational_version,v_operational_payload;
  else
    if v_operational_version is distinct from p_expected_operational_version then
      raise exception 'operational CAS version mismatch' using errcode='40001';
    end if;
    update public.admin_documents
    set payload=p_operational_payload,updated_by=null
    where document_key='ravscore-operational-model-activation'
      and version=p_expected_operational_version
    returning version,payload into v_operational_version,v_operational_payload;
    if v_operational_version is null then
      raise exception 'operational CAS update lost' using errcode='40001';
    end if;
  end if;

  if p_expected_profile_version = 0 then
    if v_profile_version is not null then
      raise exception 'profile CAS version mismatch' using errcode='40001';
    end if;
    insert into public.admin_documents(document_key,payload,updated_by)
    values('ravscore-profile-selection',p_profile_payload,null)
    returning version,payload into v_profile_version,v_profile_payload;
  elsif v_profile_version is distinct from p_expected_profile_version then
    raise exception 'profile CAS version mismatch' using errcode='40001';
  elsif v_profile_payload is distinct from p_profile_payload then
    update public.admin_documents
    set payload=p_profile_payload,updated_by=null
    where document_key='ravscore-profile-selection'
      and version=p_expected_profile_version
    returning version,payload into v_profile_version,v_profile_payload;
    if v_profile_version is null then
      raise exception 'profile CAS update lost' using errcode='40001';
    end if;
  end if;

  return jsonb_build_object(
    'operationalVersion',v_operational_version,
    'operationalPayload',v_operational_payload,
    'profileVersion',v_profile_version,
    'profilePayload',v_profile_payload
  );
end;
$$;

revoke all on function public.ravradar_ravscore_operational_cas(bigint,bigint,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.ravradar_ravscore_operational_cas(bigint,bigint,jsonb,jsonb)
  to service_role;

create or replace function public.ravradar_trip_payload_has_sensitive_key(payload jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = public
as $$
declare
  entry record;
  normalized text;
begin
  if jsonb_typeof(payload) = 'object' then
    for entry in select key, value from jsonb_each(payload)
    loop
      normalized := regexp_replace(lower(entry.key), '[^a-z0-9]', '', 'g');
      if normalized <> 'modelprofileid' and (
        normalized ~ '(lat(itude)?|lon(gitude)?|lng|gps|coord|position|route|track|location)'
        or normalized ~ '(email|userid|accountid|accountuser|contact|displayname|fullname|phonenumber|phone|profile|username)'
      ) then
        return true;
      end if;
      if public.ravradar_trip_payload_has_sensitive_key(entry.value) then return true; end if;
    end loop;
  elsif jsonb_typeof(payload) = 'array' then
    for entry in select value from jsonb_array_elements(payload)
    loop
      if public.ravradar_trip_payload_has_sensitive_key(entry.value) then return true; end if;
    end loop;
  end if;
  return false;
end;
$$;

-- Validate the immutable public score-quality snapshot independently of the
-- transport/storage client. This is deliberately model-bound: the integrated
-- model can store a bounded HISTORY_INCOMPLETE score, while the sealed
-- Candidate G rollback may store only an exact, READY 48-hour point score and
-- remains calibration-ineligible because it is the retired rollback model.
create or replace function public.ravradar_trip_v3_score_quality_allowed(
  p_model_version text,
  p_calibration_features jsonb
)
returns boolean
language plpgsql
immutable
strict
set search_path = pg_catalog, public
as $$
declare
  quality text;
  semantics text;
  score_calibration_eligible boolean;
  tail_reset boolean;
  total_score numeric;
  lower_bound numeric;
  upper_bound numeric;
  uncertainty_points numeric;
  raw_lower numeric;
  raw_upper numeric;
  coverage_hours numeric;
  history_reason jsonb;
  history_reason_code text;
  seen_history_reasons text[] := array[]::text[];
begin
  if jsonb_typeof(p_calibration_features) <> 'object'
    or jsonb_typeof(p_calibration_features -> 'scoreQuality') <> 'string'
    or jsonb_typeof(p_calibration_features -> 'scoreSemantics') <> 'string'
    or jsonb_typeof(p_calibration_features -> 'scoreCalibrationEligible') is distinct from 'boolean'
    or jsonb_typeof(p_calibration_features -> 'conservativeTailResetApplied') <> 'boolean'
    or jsonb_typeof(p_calibration_features -> 'scoreBoundLower') <> 'number'
    or jsonb_typeof(p_calibration_features -> 'scoreBoundUpper') <> 'number'
    or jsonb_typeof(p_calibration_features -> 'scoreBoundModelUncertaintyPoints') <> 'number'
    or jsonb_typeof(p_calibration_features -> 'scoreBoundRawLower') <> 'number'
    or jsonb_typeof(p_calibration_features -> 'scoreBoundRawUpper') <> 'number'
    or jsonb_typeof(p_calibration_features -> 'historyCoverageHours') <> 'number'
    or jsonb_typeof(p_calibration_features -> 'totalScore') <> 'number'
    or jsonb_typeof(p_calibration_features -> 'historyReasonCodes') <> 'array'
    or jsonb_array_length(p_calibration_features -> 'historyReasonCodes') > 12
  then return false;
  end if;

  quality := p_calibration_features ->> 'scoreQuality';
  semantics := p_calibration_features ->> 'scoreSemantics';
  score_calibration_eligible := (p_calibration_features ->> 'scoreCalibrationEligible')::boolean;
  tail_reset := (p_calibration_features ->> 'conservativeTailResetApplied')::boolean;
  total_score := (p_calibration_features ->> 'totalScore')::numeric;
  lower_bound := (p_calibration_features ->> 'scoreBoundLower')::numeric;
  upper_bound := (p_calibration_features ->> 'scoreBoundUpper')::numeric;
  uncertainty_points := (p_calibration_features ->> 'scoreBoundModelUncertaintyPoints')::numeric;
  raw_lower := (p_calibration_features ->> 'scoreBoundRawLower')::numeric;
  raw_upper := (p_calibration_features ->> 'scoreBoundRawUpper')::numeric;
  coverage_hours := (p_calibration_features ->> 'historyCoverageHours')::numeric;

  if total_score <> lower_bound
    or lower_bound not between 0 and 100
    or upper_bound not between 0 and 100
    or lower_bound > upper_bound
    or uncertainty_points not between 0 and 100
    or uncertainty_points <> upper_bound - lower_bound
    or raw_lower not between 0 and 100
    or raw_upper not between 0 and 100
    or raw_lower > raw_upper
    or coverage_hours not between 0 and 48
  then return false;
  end if;

  for history_reason in
    select value from jsonb_array_elements(p_calibration_features -> 'historyReasonCodes')
  loop
    if jsonb_typeof(history_reason) <> 'string' then return false; end if;
    history_reason_code := history_reason #>> '{}';
    if history_reason_code !~ '^[A-Z][A-Z0-9_]{0,127}$'
      or history_reason_code = any(seen_history_reasons)
    then return false;
    end if;
    seen_history_reasons := array_append(seen_history_reasons, history_reason_code);
  end loop;

  if quality = 'FULL_HISTORY' then
    if coverage_hours <> 48
      or cardinality(seen_history_reasons) <> 0
      or lower_bound <> upper_bound
      or raw_lower <> raw_upper
      or semantics not in ('EXACT_POINT_SCORE', 'CONSERVATIVE_TAIL_RESET_POINT_SCORE')
      or tail_reset <> (semantics = 'CONSERVATIVE_TAIL_RESET_POINT_SCORE')
    then return false;
    end if;
    if p_model_version = 'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0' then
      return score_calibration_eligible in (true, false);
    end if;
    if p_model_version = 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3' then
      return score_calibration_eligible = false
        and semantics = 'EXACT_POINT_SCORE'
        and tail_reset = false;
    end if;
    return false;
  end if;

  return quality = 'HISTORY_INCOMPLETE'
    and p_model_version = 'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0'
    and score_calibration_eligible = false
    and semantics = 'CONSERVATIVE_ENCLOSING_LOWER_BOUND'
    and cardinality(seen_history_reasons) > 0;
exception when others then
  return false;
end;
$$;

revoke all on function public.ravradar_trip_v3_score_quality_allowed(
  text, jsonb
) from public, anon, authenticated;
grant execute on function public.ravradar_trip_v3_score_quality_allowed(
  text, jsonb
) to service_role;

-- Immutable public trip-evidence truth table. The bounded warmup reason is
-- captured with the public score snapshot and survives delayed retries; it
-- never depends on the mutable operational controller at retry time.
create or replace function public.ravradar_trip_v3_calibration_truth_allowed(
  p_model_version text,
  p_calibration_features jsonb,
  p_calibration_eligible boolean,
  p_actual_zone_id text,
  p_actual_coastal_part_id text,
  p_forecast_zone_id text,
  p_forecast_coastal_part_id text
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  quality_reasons jsonb;
  warmup_reason_count integer;
begin
  if jsonb_typeof(coalesce(p_calibration_features -> 'reasonCodes', '[]'::jsonb)) <> 'array' then
    return false;
  end if;
  if jsonb_typeof(p_calibration_features -> 'scoreCalibrationEligible') is distinct from 'boolean' then
    return false;
  end if;
  quality_reasons := jsonb_path_query_array(
    coalesce(p_calibration_features -> 'reasonCodes', '[]'::jsonb),
    '$[*] ? (@ == "public-emergency-last-complete" || @ == "ravscore-history-incomplete" || @ == "ravscore-reconstructed-derived-evidence" || @ == "ravscore-evidence-trust-unattested")'
  );
  warmup_reason_count := jsonb_array_length(jsonb_path_query_array(
    coalesce(p_calibration_features -> 'reasonCodes', '[]'::jsonb),
    '$[*] ? (@ == "ravscore-global-warmup-calibration-lock")'
  ));
  if warmup_reason_count > 1 then return false; end if;

  if p_model_version = 'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0' then
    if quality_reasons in (
      '["ravscore-history-incomplete"]'::jsonb,
      '["public-emergency-last-complete","ravscore-history-incomplete"]'::jsonb
    ) then
      return warmup_reason_count = 0 and p_calibration_eligible = false;
    end if;
    if quality_reasons not in (
      '[]'::jsonb,
      '["public-emergency-last-complete"]'::jsonb,
      '["ravscore-reconstructed-derived-evidence"]'::jsonb,
      '["public-emergency-last-complete","ravscore-reconstructed-derived-evidence"]'::jsonb,
      '["ravscore-evidence-trust-unattested"]'::jsonb
    ) then return false;
    end if;
    if warmup_reason_count = 1 or quality_reasons <> '[]'::jsonb then
      return p_calibration_eligible = false;
    end if;
    return p_calibration_eligible = (
      (p_calibration_features ->> 'scoreCalibrationEligible')::boolean
      and p_actual_zone_id = p_forecast_zone_id
      and p_actual_coastal_part_id = p_forecast_coastal_part_id
    );
  end if;

  if p_model_version = 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3' then
    return warmup_reason_count = 0
      and p_calibration_eligible = false
      and quality_reasons in (
        '[]'::jsonb,
        '["public-emergency-last-complete"]'::jsonb,
        '["ravscore-reconstructed-derived-evidence"]'::jsonb,
        '["public-emergency-last-complete","ravscore-reconstructed-derived-evidence"]'::jsonb,
        '["ravscore-evidence-trust-unattested"]'::jsonb
      );
  end if;
  return false;
exception when others then
  return false;
end;
$$;

revoke all on function public.ravradar_trip_v3_calibration_truth_allowed(
  text,jsonb,boolean,text,text,text,text
) from public, anon, authenticated;
grant execute on function public.ravradar_trip_v3_calibration_truth_allowed(
  text,jsonb,boolean,text,text,text,text
) to service_role;

create or replace function public.ravradar_trip_v3_binding_allowed(
  p_model_version text,
  p_calibration_features jsonb,
  p_calibration_eligible boolean,
  p_actual_zone_id text,
  p_actual_coastal_part_id text,
  p_forecast_zone_id text,
  p_forecast_coastal_part_id text
)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case
    -- RAVSCORE_INTEGRATED_BINDING_BEGIN
    when p_model_version = 'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0'
      and p_calibration_features ->> 'modelStateVersion' = '6.0.0'
      and p_calibration_features ->> 'modelVariantId' = 'COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2'
      and p_calibration_features ->> 'modelProfileId' = 'cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5'
      and p_calibration_features ->> 'modelComponentSchemaId' = 'ravscore-components-huntability-delivery-mobilisation-bounds-v5'
      and p_calibration_features ->> 'modelExplanationSchemaId' = 'ravscore-explanation-integrated-bounds-v5'
      and p_calibration_features ->> 'modelRankingPolicyId' = 'direction-broad-19-history-tie-v2'
      and p_calibration_features ->> 'modelBestTimePolicyId' = 'score-history-water-tie-earliest-v3'
      and p_calibration_features ->> 'modelPresentationPolicyId' = 'score-bands-35-55-75-exceptional90-v1'
      and p_calibration_features ->> 'modelContractSha256' = 'a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b'
      and p_calibration_features ->> 'modelBundleSha256' = 'd5796289f645f1bcab6b4fe822c5ed6b0e919321013687302feb2139e814a286'
    -- RAVSCORE_INTEGRATED_BINDING_END
    then public.ravradar_trip_v3_calibration_truth_allowed(
      p_model_version,p_calibration_features,p_calibration_eligible,
      p_actual_zone_id,p_actual_coastal_part_id,
      p_forecast_zone_id,p_forecast_coastal_part_id
    )
    -- RAVSCORE_CANDIDATE_G_ROLLBACK_BINDING_BEGIN
    when p_model_version = 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3'
      and p_calibration_features ->> 'modelStateVersion' = '2.0.0'
      and p_calibration_features ->> 'modelVariantId' = 'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED'
      and p_calibration_features ->> 'modelProfileId' = 'current-0.03-0.15-in10-out8-exhaust13-window48-boundary0-wave-build4-decay48'
      and p_calibration_features ->> 'modelComponentSchemaId' = 'ravscore-components-huntability-transport-mobilisation-candidate-g-v1'
      and p_calibration_features ->> 'modelExplanationSchemaId' = 'ravscore-explanation-candidate-g-v3'
      and p_calibration_features ->> 'modelRankingPolicyId' = 'direction-broad-19-v1'
      and p_calibration_features ->> 'modelBestTimePolicyId' = 'score-water-tie-earliest-v2'
      and p_calibration_features ->> 'modelPresentationPolicyId' = 'score-bands-35-55-75-exceptional90-v1'
      and p_calibration_features ->> 'modelContractSha256' = 'c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8'
      and p_calibration_features ->> 'modelBundleSha256' = '7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d'
    -- RAVSCORE_CANDIDATE_G_ROLLBACK_BINDING_END
    then public.ravradar_trip_v3_calibration_truth_allowed(
      p_model_version,p_calibration_features,p_calibration_eligible,
      p_actual_zone_id,p_actual_coastal_part_id,
      p_forecast_zone_id,p_forecast_coastal_part_id
    )
    else false
  end;
$$;

revoke all on function public.ravradar_trip_v3_binding_allowed(
  text,jsonb,boolean,text,text,text,text
) from public, anon, authenticated;
grant execute on function public.ravradar_trip_v3_binding_allowed(
  text,jsonb,boolean,text,text,text,text
) to service_role;

alter table public.observations
  drop constraint if exists ravradar_observations_schema_version_check,
  drop constraint if exists ravradar_observations_trip_v2_check,
  drop constraint if exists ravradar_observations_trip_v3_check,
  drop constraint if exists ravradar_observations_data_quality_flags_check;

alter table public.observations
  add constraint ravradar_observations_schema_version_check
  check (schema_version in (1, 2, 3)) not valid;

alter table public.observations
  add constraint ravradar_observations_data_quality_flags_check
  check (
    jsonb_typeof(data_quality_flags) = 'array'
    and jsonb_array_length(data_quality_flags) <= 3
    and data_quality_flags in (
      '[]'::jsonb,
      '["public-emergency-last-complete"]'::jsonb,
      '["ravscore-history-incomplete"]'::jsonb,
      '["public-emergency-last-complete","ravscore-history-incomplete"]'::jsonb,
      '["ravscore-reconstructed-derived-evidence"]'::jsonb,
      '["public-emergency-last-complete","ravscore-reconstructed-derived-evidence"]'::jsonb,
      '["ravscore-evidence-trust-unattested"]'::jsonb,
      '["account-manual","historical-snapshot-unavailable","not-calibration-eligible"]'::jsonb
    )
  ) not valid;

alter table public.observations
  drop constraint if exists ravradar_observations_nested_privacy_check;
alter table public.observations
  add constraint ravradar_observations_nested_privacy_check
  check (
    gps is null
    and not public.ravradar_trip_payload_has_sensitive_key(coalesce(weather_snapshot, '{}'::jsonb))
    and not public.ravradar_trip_payload_has_sensitive_key(coalesce(calibration_features, '{}'::jsonb))
  ) not valid;

alter table public.observations
  add constraint ravradar_observations_trip_v3_check
  check (
    (
      schema_version in (1, 2)
      and coalesce(calibration_eligible, false) = false
    )
    or (
      schema_version = 3
      and trip_id is not null
      and client_observation_id is not null
      and trip_started_at is not null
      and trip_ended_at > trip_started_at
      and trip_ended_at <= trip_started_at + interval '24 hours'
      and observed_at = trip_started_at + ((trip_ended_at - trip_started_at) / 2)
      and search_minutes = greatest(1, round(extract(epoch from (trip_ended_at - trip_started_at)) / 60)::integer)
      and search_minutes between 1 and 1440
      and search_coverage in ('partial', 'normal', 'thorough')
      and hunt_mode in ('waders', 'beach')
      and actual_zone_id is not null
      and actual_coastal_part_id is not null
      and forecast_zone_id is not null
      and forecast_coastal_part_id is not null
      and found is not null
      and result in ('none', 'small', 'medium', 'good')
      and (
        (found = false and result = 'none' and grams is null)
        or (found = true and result in ('small', 'medium', 'good') and (grams is null or grams between 0 and 10000))
      )
      and forecast_snapshot_id is not null
      and forecast_issued_at is not null
      and forecast_valid_at is not null
      and forecast_captured_at is not null
      and forecast_issued_at <= forecast_captured_at
      and forecast_captured_at <= trip_started_at + interval '5 minutes'
      and calibration_eligible is not null
      and jsonb_typeof(calibration_features) = 'object'
      and calibration_features ?& array[
        'modelVersion','appVersion','modelStateVersion','modelVariantId','modelProfileId',
        'modelComponentSchemaId','modelExplanationSchemaId','modelRankingPolicyId',
        'modelBestTimePolicyId','modelPresentationPolicyId','modelContractSha256','modelBundleSha256',
        'totalScore','scoreBoundLower','scoreBoundUpper','scoreBoundModelUncertaintyPoints',
        'scoreBoundRawLower','scoreBoundRawUpper','historyCoverageHours',
        'scoreQuality','scoreSemantics','scoreCalibrationEligible',
        'conservativeTailResetApplied','historyReasonCodes',
        'huntabilityScore','transportScore','mobilisationScore',
        'windSpeedMs','windDirectionDeg','waveHeightM','wavePeriodS','waveDirectionDeg',
        'currentSpeedMs','currentDirectionDeg','waterLevelM','waterLevelTrendM3h',
        'maxWaveHeight24hM','hoursSinceEnergyPeak','sustainedOnshoreHours','reasonCodes'
      ]
      and calibration_features - array[
        'modelVersion','appVersion','modelStateVersion','modelVariantId','modelProfileId',
        'modelComponentSchemaId','modelExplanationSchemaId','modelRankingPolicyId',
        'modelBestTimePolicyId','modelPresentationPolicyId','modelContractSha256','modelBundleSha256',
        'totalScore','scoreBoundLower','scoreBoundUpper','scoreBoundModelUncertaintyPoints',
        'scoreBoundRawLower','scoreBoundRawUpper','historyCoverageHours',
        'scoreQuality','scoreSemantics','scoreCalibrationEligible',
        'conservativeTailResetApplied','historyReasonCodes',
        'huntabilityScore','transportScore','mobilisationScore',
        'windSpeedMs','windDirectionDeg','waveHeightM','wavePeriodS','waveDirectionDeg',
        'currentSpeedMs','currentDirectionDeg','waterLevelM','waterLevelTrendM3h',
        'maxWaveHeight24hM','hoursSinceEnergyPeak','sustainedOnshoreHours','reasonCodes'
      ] = '{}'::jsonb
      and jsonb_typeof(calibration_features -> 'modelVersion') = 'string'
      and calibration_features ->> 'modelVersion' ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
      and jsonb_typeof(calibration_features -> 'appVersion') = 'string'
      and calibration_features ->> 'appVersion' ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
      and jsonb_typeof(calibration_features -> 'modelStateVersion') = 'string'
      and calibration_features ->> 'modelStateVersion' ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
      and jsonb_typeof(calibration_features -> 'modelVariantId') = 'string'
      and calibration_features ->> 'modelVariantId' ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
      and jsonb_typeof(calibration_features -> 'modelProfileId') = 'string'
      and calibration_features ->> 'modelProfileId' ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
      and jsonb_typeof(calibration_features -> 'modelComponentSchemaId') = 'string'
      and calibration_features ->> 'modelComponentSchemaId' ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
      and jsonb_typeof(calibration_features -> 'modelExplanationSchemaId') = 'string'
      and calibration_features ->> 'modelExplanationSchemaId' ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
      and jsonb_typeof(calibration_features -> 'modelRankingPolicyId') = 'string'
      and calibration_features ->> 'modelRankingPolicyId' ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
      and jsonb_typeof(calibration_features -> 'modelBestTimePolicyId') = 'string'
      and calibration_features ->> 'modelBestTimePolicyId' ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
      and jsonb_typeof(calibration_features -> 'modelPresentationPolicyId') = 'string'
      and calibration_features ->> 'modelPresentationPolicyId' ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
      and jsonb_typeof(calibration_features -> 'modelContractSha256') = 'string'
      and calibration_features ->> 'modelContractSha256' ~ '^[a-f0-9]{64}$'
      and jsonb_typeof(calibration_features -> 'modelBundleSha256') = 'string'
      and calibration_features ->> 'modelBundleSha256' ~ '^[a-f0-9]{64}$'
      and jsonb_typeof(calibration_features -> 'totalScore') = 'number'
      and public.ravradar_trip_v3_score_quality_allowed(
        model_version,
        calibration_features
      )
      and (
        (calibration_features ->> 'scoreQuality' = 'HISTORY_INCOMPLETE')
        = (data_quality_flags ? 'ravscore-history-incomplete')
      )
      and jsonb_typeof(calibration_features -> 'huntabilityScore') = 'number'
      and jsonb_typeof(calibration_features -> 'transportScore') = 'number'
      and jsonb_typeof(calibration_features -> 'mobilisationScore') = 'number'
      and (calibration_features ->> 'totalScore')::numeric between 0 and 100
      and (calibration_features ->> 'totalScore')::numeric = trunc((calibration_features ->> 'totalScore')::numeric)
      and (calibration_features ->> 'huntabilityScore')::numeric between 0 and 100
      and (calibration_features ->> 'transportScore')::numeric between 0 and 100
      and (calibration_features ->> 'mobilisationScore')::numeric between 0 and 100
      and jsonb_typeof(calibration_features -> 'windSpeedMs') in ('number', 'null')
      and (jsonb_typeof(calibration_features -> 'windSpeedMs') = 'null' or (calibration_features ->> 'windSpeedMs')::numeric between 0 and 100)
      and jsonb_typeof(calibration_features -> 'windDirectionDeg') in ('number', 'null')
      and (jsonb_typeof(calibration_features -> 'windDirectionDeg') = 'null' or (calibration_features ->> 'windDirectionDeg')::numeric between 0 and 360)
      and jsonb_typeof(calibration_features -> 'waveHeightM') in ('number', 'null')
      and (jsonb_typeof(calibration_features -> 'waveHeightM') = 'null' or (calibration_features ->> 'waveHeightM')::numeric between 0 and 30)
      and jsonb_typeof(calibration_features -> 'wavePeriodS') in ('number', 'null')
      and (jsonb_typeof(calibration_features -> 'wavePeriodS') = 'null' or (calibration_features ->> 'wavePeriodS')::numeric between 0 and 40)
      and jsonb_typeof(calibration_features -> 'waveDirectionDeg') in ('number', 'null')
      and (jsonb_typeof(calibration_features -> 'waveDirectionDeg') = 'null' or (calibration_features ->> 'waveDirectionDeg')::numeric between 0 and 360)
      and jsonb_typeof(calibration_features -> 'currentSpeedMs') in ('number', 'null')
      and (jsonb_typeof(calibration_features -> 'currentSpeedMs') = 'null' or (calibration_features ->> 'currentSpeedMs')::numeric between 0 and 10)
      and jsonb_typeof(calibration_features -> 'currentDirectionDeg') in ('number', 'null')
      and (jsonb_typeof(calibration_features -> 'currentDirectionDeg') = 'null' or (calibration_features ->> 'currentDirectionDeg')::numeric between 0 and 360)
      and jsonb_typeof(calibration_features -> 'waterLevelM') in ('number', 'null')
      and (jsonb_typeof(calibration_features -> 'waterLevelM') = 'null' or (calibration_features ->> 'waterLevelM')::numeric between -20 and 20)
      and jsonb_typeof(calibration_features -> 'waterLevelTrendM3h') in ('number', 'null')
      and (jsonb_typeof(calibration_features -> 'waterLevelTrendM3h') = 'null' or (calibration_features ->> 'waterLevelTrendM3h')::numeric between -10 and 10)
      and jsonb_typeof(calibration_features -> 'maxWaveHeight24hM') in ('number', 'null')
      and (jsonb_typeof(calibration_features -> 'maxWaveHeight24hM') = 'null' or (calibration_features ->> 'maxWaveHeight24hM')::numeric between 0 and 30)
      and jsonb_typeof(calibration_features -> 'hoursSinceEnergyPeak') in ('number', 'null')
      and (jsonb_typeof(calibration_features -> 'hoursSinceEnergyPeak') = 'null' or (calibration_features ->> 'hoursSinceEnergyPeak')::numeric between 0 and 168)
      and jsonb_typeof(calibration_features -> 'sustainedOnshoreHours') in ('number', 'null')
      and (jsonb_typeof(calibration_features -> 'sustainedOnshoreHours') = 'null' or (calibration_features ->> 'sustainedOnshoreHours')::numeric between 0 and 168)
      and jsonb_typeof(calibration_features -> 'reasonCodes') = 'array'
      and jsonb_array_length(calibration_features -> 'reasonCodes') <= 12
      and jsonb_path_query_array(
        calibration_features -> 'reasonCodes',
        '$[*] ? (@ == "public-emergency-last-complete" || @ == "ravscore-history-incomplete" || @ == "ravscore-reconstructed-derived-evidence" || @ == "ravscore-evidence-trust-unattested")'
      ) = data_quality_flags
      and model_version = calibration_features ->> 'modelVersion'
      and rav_score::numeric = (calibration_features ->> 'totalScore')::numeric
      and wind_speed_mps is not distinct from nullif(calibration_features ->> 'windSpeedMs', '')::numeric
      and wind_direction_deg is not distinct from nullif(calibration_features ->> 'windDirectionDeg', '')::numeric
      and wave_height_m is not distinct from nullif(calibration_features ->> 'waveHeightM', '')::numeric
      and wave_period_s is not distinct from nullif(calibration_features ->> 'wavePeriodS', '')::numeric
      and water_level_cm is not distinct from (nullif(calibration_features ->> 'waterLevelM', '')::numeric * 100)
      and current_speed_mps is not distinct from nullif(calibration_features ->> 'currentSpeedMs', '')::numeric
      and current_direction_deg is not distinct from nullif(calibration_features ->> 'currentDirectionDeg', '')::numeric
      and jsonb_typeof(weather_snapshot) = 'object'
      and weather_snapshot ?& array[
        'schemaVersion','capturedAt','forecastSnapshotId','forecastIssuedAt',
        'forecastValidAt','calibrationFeatures'
      ]
      and weather_snapshot - array[
        'schemaVersion','capturedAt','forecastSnapshotId','forecastIssuedAt',
        'forecastValidAt','calibrationFeatures'
      ] = '{}'::jsonb
      and weather_snapshot -> 'schemaVersion' = '4'::jsonb
      and weather_snapshot ->> 'forecastSnapshotId' = forecast_snapshot_id
      and (weather_snapshot ->> 'forecastIssuedAt')::timestamptz = forecast_issued_at
      and (weather_snapshot ->> 'forecastValidAt')::timestamptz = forecast_valid_at
      and (weather_snapshot ->> 'capturedAt')::timestamptz = forecast_captured_at
      and weather_snapshot -> 'calibrationFeatures' = calibration_features
      and public.ravradar_trip_v3_binding_allowed(
        model_version,
        calibration_features,
        calibration_eligible,
        actual_zone_id,
        actual_coastal_part_id,
        forecast_zone_id,
        forecast_coastal_part_id
      )
    )
  ) not valid;

create unique index if not exists observations_trip_id_complete_uidx
  on public.observations (trip_id)
  where schema_version in (2, 3) and trip_id is not null;

comment on column public.observations.schema_version is
  '1 = historisk observation, 2 = historisk komplet Candidate G-tur, 3 = komplet tur til den integrerede model.';
comment on column public.observations.calibration_eligible is
  'True only for FULL_HISTORY immutable schema-3 trips bound to the exact current integrated RavScore bundle and matching the forecast location. HISTORY_INCOMPLETE and public-emergency trips remain storable with false. Exact Candidate G rollback trips are retained with false; unknown bindings and schema 1/2 are excluded.';

create or replace function public.ravradar_trip_v3_active_binding_admitted(
  p_model_id text,
  p_state_schema_version text,
  p_variant_id text,
  p_profile_id text,
  p_component_schema_id text,
  p_explanation_schema_id text,
  p_ranking_policy_id text,
  p_best_time_policy_id text,
  p_presentation_policy_id text,
  p_model_contract_sha256 text,
  p_model_bundle_sha256 text,
  p_reason_codes jsonb,
  p_calibration_eligible boolean,
  p_actual_zone_id text,
  p_actual_coastal_part_id text,
  p_forecast_zone_id text,
  p_forecast_coastal_part_id text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  operational jsonb;
  profile jsonb;
  submitted_binding jsonb;
  binding_features jsonb;
begin
  select payload into operational
  from public.admin_documents
  where document_key = 'ravscore-operational-model-activation'
  for share;

  select payload into profile
  from public.admin_documents
  where document_key = 'ravscore-profile-selection'
  for share;

  if operational is null or profile is null then return false; end if;

  submitted_binding := jsonb_build_object(
    'modelId', p_model_id,
    'stateSchemaVersion', p_state_schema_version,
    'variantId', p_variant_id,
    'profileId', p_profile_id,
    'componentSchemaId', p_component_schema_id,
    'explanationSchemaId', p_explanation_schema_id,
    'rankingPolicyId', p_ranking_policy_id,
    'bestTimePolicyId', p_best_time_policy_id,
    'presentationPolicyId', p_presentation_policy_id,
    'modelContractSha256', p_model_contract_sha256,
    'modelBundleSha256', p_model_bundle_sha256
  );
  binding_features := jsonb_build_object(
    'modelStateVersion', p_state_schema_version,
    'modelVariantId', p_variant_id,
    'modelProfileId', p_profile_id,
    'modelComponentSchemaId', p_component_schema_id,
    'modelExplanationSchemaId', p_explanation_schema_id,
    'modelRankingPolicyId', p_ranking_policy_id,
    'modelBestTimePolicyId', p_best_time_policy_id,
    'modelPresentationPolicyId', p_presentation_policy_id,
    'modelContractSha256', p_model_contract_sha256,
    'modelBundleSha256', p_model_bundle_sha256,
    'scoreCalibrationEligible', p_calibration_eligible,
    'reasonCodes', p_reason_codes
  );

  if not public.ravradar_trip_v3_binding_allowed(
    p_model_id,
    binding_features,
    p_calibration_eligible,
    p_actual_zone_id,
    p_actual_coastal_part_id,
    p_forecast_zone_id,
    p_forecast_coastal_part_id
  ) then return false; end if;

  if not (
    operational ?& array[
      'schemaVersion','status','transitionKind','sourceHead','datasetId',
      'productionReferenceAt','rollbackId','activeModelBinding',
      'requestedModelBinding','sourceModelBinding','candidatePlanSha256',
      'candidateFullSha256','privateBundleContentSha256','publicManifestSha256',
      'sourcePublicManifestSha256','requestedPublicManifestSha256',
      'sourceImplementationClosureSha256','requestedImplementationClosureSha256',
      'sourceDeploymentId','deploymentId','automaticActivationAllowed',
      'schedulerActivationAllowed','calibrationEligible','requestedAt',
      'activatedAt','failureCode','returnPlanSha256','integratedReadinessSha256',
      'integratedPublicAuditSha256','integratedManifestSha256'
    ]
    and operational - array[
      'schemaVersion','status','transitionKind','sourceHead','datasetId',
      'productionReferenceAt','rollbackId','activeModelBinding',
      'requestedModelBinding','sourceModelBinding','candidatePlanSha256',
      'candidateFullSha256','privateBundleContentSha256','publicManifestSha256',
      'sourcePublicManifestSha256','requestedPublicManifestSha256',
      'sourceImplementationClosureSha256','requestedImplementationClosureSha256',
      'sourceDeploymentId','deploymentId','automaticActivationAllowed',
      'schedulerActivationAllowed','calibrationEligible','requestedAt',
      'activatedAt','failureCode','returnPlanSha256','integratedReadinessSha256',
      'integratedPublicAuditSha256','integratedManifestSha256'
    ] = '{}'::jsonb
    and operational ->> 'schemaVersion' = 'ravscore-operational-model-activation-v4'
    and operational ->> 'sourceImplementationClosureSha256' ~ '^[a-f0-9]{64}$'
    and operational ->> 'requestedImplementationClosureSha256' ~ '^[a-f0-9]{64}$'
    and operational -> 'activeModelBinding' = submitted_binding
    and operational ->> 'automaticActivationAllowed' = 'false'
    and operational ->> 'schedulerActivationAllowed' = 'false'
  ) then return false; end if;

  if not (
    profile ?& array[
      'schemaVersion','sourceVersion','switchVersion','requestedProfileId',
      'activeModelId','stateSchemaVersion','variantId','profileId',
      'componentSchemaId','explanationSchemaId','rankingPolicyId',
      'bestTimePolicyId','presentationPolicyId','modelContractSha256',
      'modelBundleSha256','rollbackModelId','runtimeFallbackModelId',
      'modelActivationEnabled','automaticActivationAllowed',
      'publicAvailabilityPolicy','crossModelRuntimeFallbackAllowed',
      'migrationRequiredAtFirstCutover','status','activationAuthority','evidence'
    ]
    and profile - array[
      'schemaVersion','sourceVersion','switchVersion','requestedProfileId',
      'activeModelId','stateSchemaVersion','variantId','profileId',
      'componentSchemaId','explanationSchemaId','rankingPolicyId',
      'bestTimePolicyId','presentationPolicyId','modelContractSha256',
      'modelBundleSha256','rollbackModelId','runtimeFallbackModelId',
      'modelActivationEnabled','automaticActivationAllowed',
      'publicAvailabilityPolicy','crossModelRuntimeFallbackAllowed',
      'migrationRequiredAtFirstCutover','status','activationAuthority','evidence'
    ] = '{}'::jsonb
    and (profile -> 'evidence') ?& array[
      'decisionId','exactHeadValidationRequired','freshProductionValidationRequired'
    ]
    and (profile -> 'evidence') - array[
      'decisionId','exactHeadValidationRequired','freshProductionValidationRequired'
    ] = '{}'::jsonb
    and profile ->> 'schemaVersion' = '3.0.0'
    and profile ->> 'requestedProfileId' = p_model_id
    and profile ->> 'activeModelId' = p_model_id
    and profile ->> 'stateSchemaVersion' = p_state_schema_version
    and profile ->> 'variantId' = p_variant_id
    and profile ->> 'profileId' = p_profile_id
    and profile ->> 'componentSchemaId' = p_component_schema_id
    and profile ->> 'explanationSchemaId' = p_explanation_schema_id
    and profile ->> 'rankingPolicyId' = p_ranking_policy_id
    and profile ->> 'bestTimePolicyId' = p_best_time_policy_id
    and profile ->> 'presentationPolicyId' = p_presentation_policy_id
    and profile ->> 'modelContractSha256' = p_model_contract_sha256
    and profile ->> 'modelBundleSha256' = p_model_bundle_sha256
    and profile ->> 'modelActivationEnabled' = 'true'
    and profile ->> 'automaticActivationAllowed' = 'false'
    and profile -> 'runtimeFallbackModelId' = 'null'::jsonb
    and profile ->> 'crossModelRuntimeFallbackAllowed' = 'false'
    and profile -> 'evidence' ->> 'decisionId' = 'DEC-0110'
    and profile -> 'evidence' ->> 'exactHeadValidationRequired' = 'true'
    and profile -> 'evidence' ->> 'freshProductionValidationRequired' = 'true'
  ) then return false; end if;

  return (
    p_model_id = 'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0'
    and operational ->> 'status' = 'INTEGRATED_ACTIVE'
    and (
      operational ->> 'calibrationEligible' = 'true'
      or (
        -- RAVSCORE_INTEGRATED_MEASURED_WARMUP_ADMISSION_BEGIN
        operational ->> 'calibrationEligible' = 'false'
        and p_calibration_eligible = false
        and (
          jsonb_array_length(jsonb_path_query_array(
            coalesce(p_reason_codes, '[]'::jsonb),
            '$[*] ? (@ == "ravscore-global-warmup-calibration-lock")'
          )) = 1
          or p_reason_codes in (
            '["ravscore-history-incomplete"]'::jsonb,
            '["public-emergency-last-complete","ravscore-history-incomplete"]'::jsonb
          )
        )
        -- RAVSCORE_INTEGRATED_MEASURED_WARMUP_ADMISSION_END
      )
    )
    and profile ->> 'switchVersion' = 'RAVSCORE-PROFILE-SWITCH-INTEGRATED-1.0.0'
    and profile ->> 'publicAvailabilityPolicy' = 'integrated-model-local-fail-closed'
    and profile ->> 'status' like 'owner-approved-integrated-model-only-%'
    and profile ->> 'activationAuthority' = 'DEC-0110-integrated-ravscore-release-decision'
  ) or (
    p_model_id = 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3'
    and p_calibration_eligible = false
    and operational ->> 'status' = 'CANDIDATE_G_ACTIVE'
    and operational ->> 'calibrationEligible' = 'false'
    and profile ->> 'switchVersion' = 'RAVSCORE-PROFILE-SWITCH-CANDIDATE-G-ROLLBACK-1.0.0'
    and profile ->> 'publicAvailabilityPolicy' = 'candidate-g-local-fail-closed'
    and profile ->> 'status' = 'owner-approved-candidate-g-rollback-only-local-fail-closed'
    and profile ->> 'activationAuthority' = 'DEC-0110-manual-candidate-g-rollback'
  );
end;
$$;

revoke all on function public.ravradar_trip_v3_active_binding_admitted(
  text,text,text,text,text,text,text,text,text,text,text,jsonb,boolean,text,text,text,text
) from public, anon, authenticated;
grant execute on function public.ravradar_trip_v3_active_binding_admitted(
  text,text,text,text,text,text,text,text,text,text,text,jsonb,boolean,text,text,text,text
) to service_role;

create or replace function public.ravradar_observation_require_active_v3_binding()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.schema_version = 3 and not public.ravradar_trip_v3_active_binding_admitted(
    new.model_version,
    new.calibration_features ->> 'modelStateVersion',
    new.calibration_features ->> 'modelVariantId',
    new.calibration_features ->> 'modelProfileId',
    new.calibration_features ->> 'modelComponentSchemaId',
    new.calibration_features ->> 'modelExplanationSchemaId',
    new.calibration_features ->> 'modelRankingPolicyId',
    new.calibration_features ->> 'modelBestTimePolicyId',
    new.calibration_features ->> 'modelPresentationPolicyId',
    new.calibration_features ->> 'modelContractSha256',
    new.calibration_features ->> 'modelBundleSha256',
    new.calibration_features -> 'reasonCodes',
    new.calibration_eligible,
    new.actual_zone_id,
    new.actual_coastal_part_id,
    new.forecast_zone_id,
    new.forecast_coastal_part_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'RAVSCORE_MODEL_NOT_ACTIVE';
  end if;
  return new;
end;
$$;

revoke all on function public.ravradar_observation_require_active_v3_binding()
  from public, anon, authenticated;

drop trigger if exists ravradar_observations_active_v3_binding_trigger
  on public.observations;
create trigger ravradar_observations_active_v3_binding_trigger
before insert or update of
  schema_version, model_version, calibration_features, calibration_eligible,
  actual_zone_id, actual_coastal_part_id, forecast_zone_id, forecast_coastal_part_id
on public.observations
for each row execute function public.ravradar_observation_require_active_v3_binding();

create or replace function public.ravradar_integrated_cutover_contract(
  p_model_id text,
  p_state_schema_version text,
  p_variant_id text,
  p_profile_id text,
  p_component_schema_id text,
  p_explanation_schema_id text,
  p_ranking_policy_id text,
  p_best_time_policy_id text,
  p_presentation_policy_id text,
  p_model_contract_sha256 text,
  p_model_bundle_sha256 text,
  p_candidate_model_id text,
  p_candidate_state_schema_version text,
  p_candidate_variant_id text,
  p_candidate_profile_id text,
  p_candidate_component_schema_id text,
  p_candidate_explanation_schema_id text,
  p_candidate_ranking_policy_id text,
  p_candidate_best_time_policy_id text,
  p_candidate_presentation_policy_id text,
  p_candidate_model_contract_sha256 text,
  p_candidate_model_bundle_sha256 text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  trip_definition text;
  trip_score_quality_definition text;
  trip_calibration_truth_definition text;
  trip_binding_gate_definition text;
  trip_binding_policy_definition text;
  trip_active_admission_definition text;
  trip_active_trigger_function_definition text;
  trip_active_trigger_definition text;
  trip_constraint_validated boolean := false;
  applied_migration_versions jsonb := '[]'::jsonb;
begin
  select pg_catalog.pg_get_constraintdef(c.oid, true), c.convalidated
  into trip_definition, trip_constraint_validated
  from pg_catalog.pg_constraint c
  join pg_catalog.pg_class r on r.oid = c.conrelid
  join pg_catalog.pg_namespace n on n.oid = r.relnamespace
  where n.nspname = 'public'
    and r.relname = 'observations'
    and c.conname = 'ravradar_observations_trip_v3_check'
  limit 1;

  select pg_catalog.btrim(p.prosrc, E' \n\r\t')
  into trip_score_quality_definition
  from pg_catalog.pg_proc p
  where p.oid = pg_catalog.to_regprocedure(
    'public.ravradar_trip_v3_score_quality_allowed(text,jsonb)'
  );

  select pg_catalog.btrim(p.prosrc, E' \n\r\t')
  into trip_calibration_truth_definition
  from pg_catalog.pg_proc p
  where p.oid = pg_catalog.to_regprocedure(
    'public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)'
  );

  select pg_catalog.btrim(p.prosrc, E' \n\r\t')
  into trip_binding_gate_definition
  from pg_catalog.pg_proc p
  where p.oid = pg_catalog.to_regprocedure(
    'public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)'
  );

  trip_binding_policy_definition := trip_score_quality_definition
    || E'\n-- calibration-truth-function --\n' || trip_calibration_truth_definition
    || E'\n-- binding-function --\n' || trip_binding_gate_definition;

  select pg_catalog.btrim(p.prosrc, E' \n\r\t')
  into trip_active_admission_definition
  from pg_catalog.pg_proc p
  where p.oid = pg_catalog.to_regprocedure(
    'public.ravradar_trip_v3_active_binding_admitted(text,text,text,text,text,text,text,text,text,text,text,jsonb,boolean,text,text,text,text)'
  );

  select pg_catalog.btrim(p.prosrc, E' \n\r\t')
  into trip_active_trigger_function_definition
  from pg_catalog.pg_proc p
  where p.oid = pg_catalog.to_regprocedure(
    'public.ravradar_observation_require_active_v3_binding()'
  );

  select pg_catalog.pg_get_triggerdef(t.oid, true)
  into trip_active_trigger_definition
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class r on r.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = r.relnamespace
  where n.nspname = 'public'
    and r.relname = 'observations'
    and t.tgname = 'ravradar_observations_active_v3_binding_trigger'
    and not t.tgisinternal
  limit 1;

  select coalesce(pg_catalog.jsonb_agg(applied.version order by applied.version), '[]'::jsonb)
  into applied_migration_versions
  from (
    select m.version::text as version
    from supabase_migrations.schema_migrations m
    where m.version::text in ('20260829010000', '20260829020000', '20260901010000')
  ) applied;

  return pg_catalog.jsonb_build_object(
    'schemaVersion', 'ravscore-integrated-cutover-db-v1',
    'tripSchemaVersion', 3,
    'appliedMigrationVersions', applied_migration_versions,
    'tripBindingPolicy', pg_catalog.jsonb_build_object(
      'id', 'ravradar-trip-v3-exact-integrated-candidate-g-global-warmup-v6',
      'definition', trip_binding_policy_definition
    ),
    'tripActiveAdmissionPolicy', pg_catalog.jsonb_build_object(
      'id', 'ravradar-trip-v3-exact-operational-active-global-warmup-v6',
      'definition', trip_active_admission_definition,
      'triggerFunctionDefinition', trip_active_trigger_function_definition,
      'triggerDefinition', trip_active_trigger_definition
    ),
    'checks', pg_catalog.jsonb_build_object(
      'schemaVersionConstraintPresent', exists (
        select 1
        from pg_catalog.pg_constraint c
        join pg_catalog.pg_class r on r.oid = c.conrelid
        join pg_catalog.pg_namespace n on n.oid = r.relnamespace
        where n.nspname = 'public'
          and r.relname = 'observations'
          and c.conname = 'ravradar_observations_schema_version_check'
      ),
      'dataQualityConstraintPresent', exists (
        select 1
        from pg_catalog.pg_constraint c
        join pg_catalog.pg_class r on r.oid = c.conrelid
        join pg_catalog.pg_namespace n on n.oid = r.relnamespace
        where n.nspname = 'public'
          and r.relname = 'observations'
          and c.conname = 'ravradar_observations_data_quality_flags_check'
      ),
      'nestedPrivacyConstraintPresent', exists (
        select 1
        from pg_catalog.pg_constraint c
        join pg_catalog.pg_class r on r.oid = c.conrelid
        join pg_catalog.pg_namespace n on n.oid = r.relnamespace
        where n.nspname = 'public'
          and r.relname = 'observations'
          and c.conname = 'ravradar_observations_nested_privacy_check'
      ),
      'tripV3ConstraintPresent', trip_definition is not null,
      'tripV3ConstraintValidatedAgainstHistoricalRows', trip_constraint_validated,
      'tripIdIndexPresent', pg_catalog.to_regclass('public.observations_trip_id_complete_uidx') is not null,
      'bindingPolicyDefinitionPresent', trip_score_quality_definition is not null
        and trip_calibration_truth_definition is not null
        and trip_binding_gate_definition is not null
        and trip_binding_policy_definition is not null,
      'bindingTruthCalledForBothModels', trip_binding_gate_definition is not null
        and pg_catalog.regexp_count(
          trip_binding_gate_definition,
          'ravradar_trip_v3_calibration_truth_allowed'
        ) = 2,
      'activeBindingAdmissionDefinitionPresent', trip_active_admission_definition is not null,
      'activeBindingTriggerPresent', trip_active_trigger_function_definition is not null
        and trip_active_trigger_definition is not null,
      'activeBindingTriggerCallsGateExactlyOnce', trip_active_trigger_function_definition is not null
        and pg_catalog.regexp_count(
          trip_active_trigger_function_definition,
          'ravradar_trip_v3_active_binding_admitted'
        ) = 1,
      'bindingGateCalledExactlyOnce', trip_definition is not null
        and pg_catalog.regexp_count(trip_definition, 'ravradar_trip_v3_binding_allowed') = 1,
      'integratedModelBindingPresent', public.ravradar_trip_v3_binding_allowed(
        p_model_id,
        pg_catalog.jsonb_build_object(
          'modelStateVersion',p_state_schema_version,
          'modelVariantId',p_variant_id,
          'modelProfileId',p_profile_id,
          'modelComponentSchemaId',p_component_schema_id,
          'modelExplanationSchemaId',p_explanation_schema_id,
          'modelRankingPolicyId',p_ranking_policy_id,
          'modelBestTimePolicyId',p_best_time_policy_id,
          'modelPresentationPolicyId',p_presentation_policy_id,
          'modelContractSha256',p_model_contract_sha256,
          'modelBundleSha256',p_model_bundle_sha256,
          'scoreCalibrationEligible',true
        ),
        true,'zone','part','zone','part'
      ),
      'integratedProxyCeilingBindingPresent', public.ravradar_trip_v3_binding_allowed(
        p_model_id,
        pg_catalog.jsonb_build_object(
          'modelStateVersion',p_state_schema_version,
          'modelVariantId',p_variant_id,
          'modelProfileId',p_profile_id,
          'modelComponentSchemaId',p_component_schema_id,
          'modelExplanationSchemaId',p_explanation_schema_id,
          'modelRankingPolicyId',p_ranking_policy_id,
          'modelBestTimePolicyId',p_best_time_policy_id,
          'modelPresentationPolicyId',p_presentation_policy_id,
          'modelContractSha256',p_model_contract_sha256,
          'modelBundleSha256',p_model_bundle_sha256,
          'scoreCalibrationEligible',false
        ),
        false,'zone','part','zone','part'
      ),
      'integratedMissingCalibrationCeilingRejected', not public.ravradar_trip_v3_binding_allowed(
        p_model_id,
        pg_catalog.jsonb_build_object(
          'modelStateVersion',p_state_schema_version,
          'modelVariantId',p_variant_id,
          'modelProfileId',p_profile_id,
          'modelComponentSchemaId',p_component_schema_id,
          'modelExplanationSchemaId',p_explanation_schema_id,
          'modelRankingPolicyId',p_ranking_policy_id,
          'modelBestTimePolicyId',p_best_time_policy_id,
          'modelPresentationPolicyId',p_presentation_policy_id,
          'modelContractSha256',p_model_contract_sha256,
          'modelBundleSha256',p_model_bundle_sha256
        ),
        false,'zone','part','zone','part'
      ),
      'candidateGRollbackBindingPresent', public.ravradar_trip_v3_binding_allowed(
        p_candidate_model_id,
        pg_catalog.jsonb_build_object(
          'modelStateVersion',p_candidate_state_schema_version,
          'modelVariantId',p_candidate_variant_id,
          'modelProfileId',p_candidate_profile_id,
          'modelComponentSchemaId',p_candidate_component_schema_id,
          'modelExplanationSchemaId',p_candidate_explanation_schema_id,
          'modelRankingPolicyId',p_candidate_ranking_policy_id,
          'modelBestTimePolicyId',p_candidate_best_time_policy_id,
          'modelPresentationPolicyId',p_candidate_presentation_policy_id,
          'modelContractSha256',p_candidate_model_contract_sha256,
          'modelBundleSha256',p_candidate_model_bundle_sha256,
          'scoreCalibrationEligible',false
        ),
        false,'zone','part','zone','part'
      ) and not public.ravradar_trip_v3_binding_allowed(
        p_candidate_model_id,
        pg_catalog.jsonb_build_object(
          'modelStateVersion',p_candidate_state_schema_version,
          'modelVariantId',p_candidate_variant_id,
          'modelProfileId',p_candidate_profile_id,
          'modelComponentSchemaId',p_candidate_component_schema_id,
          'modelExplanationSchemaId',p_candidate_explanation_schema_id,
          'modelRankingPolicyId',p_candidate_ranking_policy_id,
          'modelBestTimePolicyId',p_candidate_best_time_policy_id,
          'modelPresentationPolicyId',p_candidate_presentation_policy_id,
          'modelContractSha256',p_candidate_model_contract_sha256,
          'modelBundleSha256',p_candidate_model_bundle_sha256,
          'scoreCalibrationEligible',false
        ),
        true,'zone','part','zone','part'
      ),
      'unknownModelBindingRejected', not public.ravradar_trip_v3_binding_allowed(
        p_candidate_model_id || '-FORGED',
        pg_catalog.jsonb_build_object(
          'modelStateVersion',p_candidate_state_schema_version,
          'modelVariantId',p_candidate_variant_id,
          'modelProfileId',p_candidate_profile_id,
          'modelComponentSchemaId',p_candidate_component_schema_id,
          'modelExplanationSchemaId',p_candidate_explanation_schema_id,
          'modelRankingPolicyId',p_candidate_ranking_policy_id,
          'modelBestTimePolicyId',p_candidate_best_time_policy_id,
          'modelPresentationPolicyId',p_candidate_presentation_policy_id,
          'modelContractSha256',p_candidate_model_contract_sha256,
          'modelBundleSha256',p_candidate_model_bundle_sha256,
          'scoreCalibrationEligible',false
        ),
        false,'zone','part','zone','part'
      ),
      'exactModelBindingPresent', trip_definition is not null
        and trip_binding_policy_definition is not null
        and pg_catalog.regexp_count(trip_definition, 'ravradar_trip_v3_binding_allowed') = 1
        and public.ravradar_trip_v3_binding_allowed(
          p_model_id,
          pg_catalog.jsonb_build_object(
            'modelStateVersion',p_state_schema_version,
            'modelVariantId',p_variant_id,
            'modelProfileId',p_profile_id,
            'modelComponentSchemaId',p_component_schema_id,
            'modelExplanationSchemaId',p_explanation_schema_id,
            'modelRankingPolicyId',p_ranking_policy_id,
            'modelBestTimePolicyId',p_best_time_policy_id,
            'modelPresentationPolicyId',p_presentation_policy_id,
            'modelContractSha256',p_model_contract_sha256,
            'modelBundleSha256',p_model_bundle_sha256,
            'scoreCalibrationEligible',true
          ),true,'zone','part','zone','part'
        )
        and public.ravradar_trip_v3_binding_allowed(
          p_candidate_model_id,
          pg_catalog.jsonb_build_object(
            'modelStateVersion',p_candidate_state_schema_version,
            'modelVariantId',p_candidate_variant_id,
            'modelProfileId',p_candidate_profile_id,
            'modelComponentSchemaId',p_candidate_component_schema_id,
            'modelExplanationSchemaId',p_candidate_explanation_schema_id,
            'modelRankingPolicyId',p_candidate_ranking_policy_id,
            'modelBestTimePolicyId',p_candidate_best_time_policy_id,
            'modelPresentationPolicyId',p_candidate_presentation_policy_id,
            'modelContractSha256',p_candidate_model_contract_sha256,
            'modelBundleSha256',p_candidate_model_bundle_sha256,
            'scoreCalibrationEligible',false
          ),false,'zone','part','zone','part'
        )
        and not public.ravradar_trip_v3_binding_allowed(
          p_candidate_model_id || '-FORGED','{}'::jsonb,false,'zone','part','zone','part'
        )
    )
  );
end;
$$;

revoke all on function public.ravradar_integrated_cutover_contract(
  text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.ravradar_integrated_cutover_contract(
  text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text, text, text, text
) to service_role;

comment on function public.ravradar_integrated_cutover_contract(
  text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text, text, text, text
) is 'Service-role-only metadata readback for the exact integrated and Candidate G rollback binding allowlist; reads no observation rows.';

-- RAVSCORE_CHECKPOINT_METADATA_CAS_GENERATED_BEGIN
-- The protected continuation checkpoint is an operational replacement row,
-- not owner-authored history. Reassert the complete current exclusion list so
-- schema-only and installer-only setups cannot retain a second 16 MiB copy on
-- every successful CAS update.
create or replace function public.version_admin_document()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.payload is not distinct from old.payload then return null; end if;
  if tg_op='UPDATE' and old.document_key not in (
    'weather-health',
    'runtime-diagnostics',
    'dmi-water-stations',
    'water-station-routing-audit',
    'ocean-diagnostics',
    'cache-audit',
    'implementation-audit',
    'coastal-point-staging-status',
    'protected-asset-manifest',
    'ravscore-continuation-checkpoint',
    'ravscore-private-production-runtime-pointer',
    'ravscore-integrated-cutover-readiness',
    'ravscore-operational-model-activation'
  ) then
    insert into public.admin_document_versions(document_key,payload,version,created_by)
    values(old.document_key,old.payload,old.version,auth.uid());
  end if;
  if tg_op='UPDATE' then new.version=old.version+1; end if;
  new.updated_at=now();
  new.updated_by=auth.uid();
  return new;
end;
$$;

-- The continuation row is operational service-role state. Even RavRadar
-- owners/full_admins must use the bounded metadata RPC rather than selecting
-- the multi-megabyte payload or a stale version copy through permissive RLS.
drop policy if exists ravradar_ravscore_checkpoint_no_direct_read
  on public.admin_documents;
create policy ravradar_ravscore_checkpoint_no_direct_read
on public.admin_documents as restrictive for select to authenticated
using (document_key <> 'ravscore-continuation-checkpoint');

drop policy if exists ravradar_ravscore_checkpoint_versions_no_direct_read
  on public.admin_document_versions;
create policy ravradar_ravscore_checkpoint_versions_no_direct_read
on public.admin_document_versions as restrictive for select to authenticated
using (document_key <> 'ravscore-continuation-checkpoint');

-- PostgreSQL accepts a few timestamp spellings that it subsequently
-- normalises. Require the exact JavaScript toISOString millisecond form and a
-- successful UTC round trip before any caller casts a checkpoint time.
create or replace function public.ravradar_ravscore_checkpoint_canonical_time(
  p_value text
)
returns boolean
language plpgsql
stable
set search_path = pg_catalog, public
as $$
begin
  if p_value is null or p_value !~
      '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
  then
    return false;
  end if;
  return pg_catalog.to_char(
    p_value::timestamptz at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  ) = p_value;
exception
  when others then
    return false;
end;
$$;

create or replace function public.ravradar_ravscore_checkpoint_has_forbidden_key(
  p_value jsonb
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_key text;
  v_normalized_key text;
  v_child jsonb;
begin
  if p_value is null then return false; end if;
  if jsonb_typeof(p_value) = 'object' then
    for v_key, v_child in select key, value from pg_catalog.jsonb_each(p_value)
    loop
      v_normalized_key := pg_catalog.regexp_replace(
        pg_catalog.lower(v_key),
        '[^a-z0-9]',
        '',
        'g'
      );
      if v_normalized_key = any (array[
        'u','v','rawu','rawv','umps','vmps','currentu','currentv',
        'currentumps','currentvmps','eastwardcurrentmps','northwardcurrentmps',
        'waterpoint','landpoint','coordinate','coordinates','lat','latitude',
        'lon','lng','longitude','weather','forecast','payload','score','scores'
      ]::text[]) then
        return true;
      end if;
      if public.ravradar_ravscore_checkpoint_has_forbidden_key(v_child) then
        return true;
      end if;
    end loop;
  elsif jsonb_typeof(p_value) = 'array' then
    for v_child in select value from pg_catalog.jsonb_array_elements(p_value)
    loop
      if public.ravradar_ravscore_checkpoint_has_forbidden_key(v_child) then
        return true;
      end if;
    end loop;
  end if;
  return false;
end;
$$;

create or replace function public.ravradar_ravscore_checkpoint_integrated_state_valid(
  p_state jsonb,
  p_reference_text text
)
returns boolean
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_state_time timestamptz;
  v_current_reference timestamptz;
  v_current_boundary timestamptz;
  v_current_first_time timestamptz;
  v_current_second_time timestamptz;
  v_wave_last_verified timestamptz;
  v_wave_migration_seed timestamptz;
  v_authorization jsonb;
  v_wave_approach jsonb;
  v_history jsonb;
  v_lineage jsonb;
  v_wave_unknown timestamptz;
  v_wave_reset timestamptz;
  v_last_mile_unknown timestamptz;
  v_last_mile_reset timestamptz;
  v_current_lower numeric;
  v_current_upper numeric;
  v_wave_lower numeric;
  v_wave_upper numeric;
  v_min_activity numeric;
  v_min_normal numeric;
  v_max_activity numeric;
  v_max_normal numeric;
  v_point_activity numeric;
  v_point_normal numeric;
  v_min_factor numeric;
  v_max_factor numeric;
  v_point_factor numeric;
begin
  if jsonb_typeof(p_state) is distinct from 'object'
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(p_state)) <> 35
    or exists (
      select 1
      from pg_catalog.jsonb_object_keys(p_state) as allowed(key)
      where not (allowed.key = any (array[
        'schemaVersion','modelId','variantId','profileId','componentSchemaId',
        'explanationSchemaId','rankingPolicyId','bestTimePolicyId',
        'presentationPolicyId','modelContractSha256','modelBundleSha256',
        'samplingContextKey','time','currentReferenceAt','currentMemoryReady',
        'currentMemoryStatus','currentMemoryWindowHours',
        'currentMemoryCoverageHours','currentEvidence',
        'currentNativeHoldAuthorization','currentNativeHoldIntervalEnds',
        'supplyPotential','historyBounds','waveStateSchemaVersion','wavePolicyId',
        'waveLastVerifiedAt','waveMigrationSeedAt','waveMemoryReady',
        'waveMemoryStatus','waveEnergyScore','waveMigrationSeedAwaitingReference',
        'mobilisationPotential','rollbackCandidateGMobilisationPotential',
        'waveApproachState','lineage'
      ]::text[]))
    )
    -- RAVSCORE_CHECKPOINT_INTEGRATED_STATE_BINDING_GENERATED_BEGIN
    or p_state ->> 'schemaVersion' is distinct from '6.0.0'
    or p_state ->> 'modelId'
      is distinct from 'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0'
    or p_state ->> 'variantId'
      is distinct from 'COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2'
    or p_state ->> 'profileId'
      is distinct from 'cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5'
    or p_state ->> 'componentSchemaId'
      is distinct from 'ravscore-components-huntability-delivery-mobilisation-bounds-v5'
    or p_state ->> 'explanationSchemaId'
      is distinct from 'ravscore-explanation-integrated-bounds-v5'
    or p_state ->> 'rankingPolicyId'
      is distinct from 'direction-broad-19-history-tie-v2'
    or p_state ->> 'bestTimePolicyId'
      is distinct from 'score-history-water-tie-earliest-v3'
    or p_state ->> 'presentationPolicyId'
      is distinct from 'score-bands-35-55-75-exceptional90-v1'
    or p_state ->> 'modelContractSha256'
      is distinct from 'a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b'
    or p_state ->> 'modelBundleSha256'
      is distinct from 'd5796289f645f1bcab6b4fe822c5ed6b0e919321013687302feb2139e814a286'
    -- RAVSCORE_CHECKPOINT_INTEGRATED_STATE_BINDING_GENERATED_END
    or coalesce(p_state ->> 'samplingContextKey', '') !~ '^sha256:[0-9a-f]{64}$'
    or not public.ravradar_ravscore_checkpoint_canonical_time(p_reference_text)
    or not public.ravradar_ravscore_checkpoint_canonical_time(p_state ->> 'time')
    or p_state ->> 'time' is distinct from p_reference_text
    or jsonb_typeof(p_state -> 'currentEvidence') is distinct from 'array'
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_state -> 'currentEvidence') as evidence(value)
      where jsonb_typeof(evidence.value) is distinct from 'object'
        or (select pg_catalog.count(*)
            from pg_catalog.jsonb_object_keys(evidence.value)) <> 2
        or exists (
          select 1 from pg_catalog.jsonb_object_keys(evidence.value) as keyset(key)
          where not (keyset.key = any (array['time','strength']::text[]))
        )
        or coalesce(evidence.value ->> 'time', '') !~
          '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
        or coalesce(jsonb_typeof(evidence.value -> 'strength'), 'missing')
          not in ('number','null')
    )
    or public.ravradar_ravscore_checkpoint_has_forbidden_key(p_state)
  then
    return false;
  end if;

  -- JavaScript remains authoritative for mathematical replay. PostgreSQL
  -- independently enforces the bounded, canonical derived-state envelope.
  if jsonb_typeof(p_state -> 'currentReferenceAt') is distinct from 'string'
    or not public.ravradar_ravscore_checkpoint_canonical_time(
      p_state ->> 'currentReferenceAt'
    )
    or jsonb_typeof(p_state -> 'currentMemoryReady') is distinct from 'boolean'
    or jsonb_typeof(p_state -> 'currentMemoryStatus') is distinct from 'string'
    or p_state ->> 'currentMemoryStatus' <> all (array[
      'WINDOW_INCOMPLETE','WINDOW_HAS_MISSING_EVIDENCE',
      'WINDOW_HAS_TIME_GAP','READY','READY_NATIVE_HOLD'
    ]::text[])
    or jsonb_typeof(p_state -> 'currentMemoryWindowHours') is distinct from 'number'
    or (p_state ->> 'currentMemoryWindowHours')::numeric <> 48
    or jsonb_typeof(p_state -> 'currentMemoryCoverageHours') is distinct from 'number'
    or (p_state ->> 'currentMemoryCoverageHours')::numeric not between 0 and 48
    or ((p_state -> 'currentMemoryReady') = 'true'::jsonb)
      is distinct from ((p_state ->> 'currentMemoryStatus') = any (
        array['READY','READY_NATIVE_HOLD']::text[]
      ))
    or (((p_state -> 'currentMemoryReady') = 'true'::jsonb)
      and (p_state ->> 'currentMemoryCoverageHours')::numeric <> 48)
    or (((p_state -> 'currentMemoryReady') = 'false'::jsonb)
      and (p_state ->> 'currentMemoryCoverageHours')::numeric <> 0)
    or (((p_state -> 'currentMemoryReady') = 'true'::jsonb)
      and (jsonb_typeof(p_state -> 'supplyPotential') is distinct from 'number'
        or (p_state ->> 'supplyPotential')::numeric not between 0 and 100))
    or (((p_state -> 'currentMemoryReady') = 'false'::jsonb)
      and jsonb_typeof(p_state -> 'supplyPotential') is distinct from 'null')
    or jsonb_typeof(p_state -> 'currentNativeHoldIntervalEnds')
      is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_state -> 'currentNativeHoldIntervalEnds') > 48
    or coalesce(jsonb_typeof(p_state -> 'currentNativeHoldAuthorization'), 'missing')
      not in ('object','null')
    or jsonb_typeof(p_state -> 'waveStateSchemaVersion') is distinct from 'string'
    or p_state ->> 'waveStateSchemaVersion' is distinct from '1.0.0'
    or jsonb_typeof(p_state -> 'wavePolicyId') is distinct from 'string'
    or p_state ->> 'wavePolicyId'
      is distinct from 'wave-energy-freshness-build4-decay48-coldrestart-v2'
    or coalesce(jsonb_typeof(p_state -> 'waveLastVerifiedAt'), 'missing')
      not in ('string','null')
    or coalesce(jsonb_typeof(p_state -> 'waveMigrationSeedAt'), 'missing')
      not in ('string','null')
    or jsonb_typeof(p_state -> 'waveMemoryReady') is distinct from 'boolean'
    or jsonb_typeof(p_state -> 'waveMemoryStatus') is distinct from 'string'
    or p_state ->> 'waveMemoryStatus' <> all (array[
      'READY','MIGRATED_READY','RECOVERED_SHORT_GAP','MISSING_INPUT','COLD_START'
    ]::text[])
    or coalesce(jsonb_typeof(p_state -> 'waveEnergyScore'), 'missing')
      not in ('number','null')
    or (jsonb_typeof(p_state -> 'waveEnergyScore') = 'number'
      and (p_state ->> 'waveEnergyScore')::numeric not between 0 and 100)
    or jsonb_typeof(p_state -> 'waveMigrationSeedAwaitingReference')
      is distinct from 'boolean'
    or jsonb_typeof(p_state -> 'mobilisationPotential') is distinct from 'number'
    or (p_state ->> 'mobilisationPotential')::numeric not between 0 and 100
    or jsonb_typeof(p_state -> 'rollbackCandidateGMobilisationPotential')
      is distinct from 'number'
    or (p_state ->> 'rollbackCandidateGMobilisationPotential')::numeric
      not between 0 and 100
    or jsonb_typeof(p_state -> 'waveApproachState') is distinct from 'object'
    or jsonb_typeof(p_state -> 'historyBounds') is distinct from 'object'
    or coalesce(jsonb_typeof(p_state -> 'lineage'), 'missing') not in ('object','null')
  then
    return false;
  end if;

  v_state_time := (p_state ->> 'time')::timestamptz;
  v_current_reference := (p_state ->> 'currentReferenceAt')::timestamptz;
  if v_current_reference > v_state_time
    or extract(epoch from (v_state_time - v_current_reference)) / 3600 > 3
    or (p_state ->> 'currentMemoryStatus' = 'READY'
      and v_current_reference is distinct from v_state_time)
    or (p_state ->> 'currentMemoryStatus' = 'READY_NATIVE_HOLD'
      and v_current_reference >= v_state_time)
  then
    return false;
  end if;

  if pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') not between 1 and 49
    or exists (
      select 1
      from (
        select evidence.value,
          evidence.ordinality,
          pg_catalog.lag(evidence.value ->> 'time') over (
            order by evidence.ordinality
          ) as previous_time
        from pg_catalog.jsonb_array_elements(
          p_state -> 'currentEvidence'
        ) with ordinality as evidence(value, ordinality)
      ) as ordered
      where jsonb_typeof(ordered.value) is distinct from 'object'
        or (select pg_catalog.count(*)
            from pg_catalog.jsonb_object_keys(ordered.value)) <> 2
        or exists (
          select 1
          from pg_catalog.jsonb_object_keys(ordered.value) as keyset(key)
          where not (keyset.key = any (array['time','strength']::text[]))
        )
        or not public.ravradar_ravscore_checkpoint_canonical_time(
          ordered.value ->> 'time'
        )
        or coalesce(jsonb_typeof(ordered.value -> 'strength'), 'missing')
          not in ('number','null')
        or (jsonb_typeof(ordered.value -> 'strength') = 'number'
          and (ordered.value ->> 'strength')::numeric not between -1 and 1)
        or (ordered.previous_time is not null
          and ordered.previous_time::timestamptz
            >= (ordered.value ->> 'time')::timestamptz)
    )
    or p_state -> 'currentEvidence'
      -> (pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') - 1)
      ->> 'time' is distinct from p_state ->> 'currentReferenceAt'
    or (((p_state -> 'currentMemoryReady') = 'true'::jsonb) and exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_state -> 'currentEvidence') as evidence(value)
      where jsonb_typeof(evidence.value -> 'strength') is distinct from 'number'
    ))
  then
    return false;
  end if;

  -- READY current memory must at least have the same real 48-hour boundary
  -- shape and attested cadence as the JavaScript builder. This deliberately
  -- does not replay signed rates or recompute supplyPotential in PostgreSQL.
  if (p_state -> 'currentMemoryReady') = 'true'::jsonb then
    v_current_boundary := v_current_reference - interval '48 hours';
    v_current_first_time := (
      p_state -> 'currentEvidence' -> 0 ->> 'time'
    )::timestamptz;
    v_current_second_time := (
      p_state -> 'currentEvidence' -> 1 ->> 'time'
    )::timestamptz;
    if v_current_first_time > v_current_boundary
      or (v_current_first_time < v_current_boundary and (
        pg_catalog.jsonb_array_length(p_state -> 'currentEvidence') < 2
        or v_current_first_time < v_current_boundary - interval '3 hours'
        or v_current_second_time < v_current_boundary
        or v_current_second_time - v_current_first_time > interval '3 hours'
      ))
      or exists (
        select 1
        from (
          select evidence.value ->> 'time' as evidence_time,
            pg_catalog.lag(evidence.value ->> 'time') over (
              order by evidence.ordinality
            ) as previous_time
          from pg_catalog.jsonb_array_elements(
            p_state -> 'currentEvidence'
          ) with ordinality as evidence(value, ordinality)
        ) as ordered
        where ordered.previous_time is not null
          and (
            (ordered.evidence_time::timestamptz
              - ordered.previous_time::timestamptz) > interval '3 hours'
            or (
              (ordered.evidence_time::timestamptz
                - ordered.previous_time::timestamptz) > interval '1 hour'
              and (
                ordered.previous_time::timestamptz >= v_current_boundary
                or ordered.evidence_time::timestamptz
                  > v_current_boundary + interval '1 hour'
              )
              and not exists (
                select 1
                from pg_catalog.jsonb_array_elements(
                  p_state -> 'currentNativeHoldIntervalEnds'
                ) as hold(value)
                where hold.value #>> '{}' = ordered.evidence_time
              )
            )
          )
      )
    then
      return false;
    end if;
  end if;

  v_authorization := p_state -> 'currentNativeHoldAuthorization';
  if jsonb_typeof(v_authorization) = 'object' then
    if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_authorization)) <> 4
      or exists (
        select 1 from pg_catalog.jsonb_object_keys(v_authorization) as allowed(key)
        where not (allowed.key = any (array[
          'sourceClass','source','collection','distanceKm'
        ]::text[]))
      )
      or v_authorization ->> 'sourceClass'
        is distinct from 'owner-approved-regional-proxy'
      or v_authorization ->> 'source' is distinct from 'dmi-dkss-lf-regional-proxy'
      or v_authorization ->> 'collection' is distinct from 'dkss_lf'
      or jsonb_typeof(v_authorization -> 'distanceKm') is distinct from 'number'
      or (v_authorization ->> 'distanceKm')::numeric not between 0 and 15
      or (select evidence.value ->> 'time'
          from pg_catalog.jsonb_array_elements(
            p_state -> 'currentEvidence'
          ) with ordinality as evidence(value, ordinality)
          where jsonb_typeof(evidence.value -> 'strength') = 'number'
          order by evidence.ordinality desc
          limit 1) is distinct from p_state ->> 'currentReferenceAt'
    then
      return false;
    end if;
  elsif v_current_reference < v_state_time
    or p_state ->> 'currentMemoryStatus' = 'READY_NATIVE_HOLD'
  then
    return false;
  end if;

  if exists (
    select 1
    from (
      select hold.value #>> '{}' as hold_time,
        hold.ordinality,
        pg_catalog.lag(hold.value #>> '{}') over (
          order by hold.ordinality
        ) as previous_hold_time
      from pg_catalog.jsonb_array_elements(
        p_state -> 'currentNativeHoldIntervalEnds'
      ) with ordinality as hold(value, ordinality)
    ) as ordered_hold
    where not public.ravradar_ravscore_checkpoint_canonical_time(
        ordered_hold.hold_time
      )
      or (ordered_hold.previous_hold_time is not null
        and ordered_hold.previous_hold_time::timestamptz
          >= ordered_hold.hold_time::timestamptz)
      or not exists (
        select 1
        from pg_catalog.jsonb_array_elements(
          p_state -> 'currentEvidence'
        ) with ordinality as current_evidence(value, ordinality)
        join pg_catalog.jsonb_array_elements(
          p_state -> 'currentEvidence'
        ) with ordinality as previous_evidence(value, ordinality)
          on previous_evidence.ordinality + 1 = current_evidence.ordinality
        where current_evidence.value ->> 'time' = ordered_hold.hold_time
          and jsonb_typeof(current_evidence.value -> 'strength') = 'number'
          and jsonb_typeof(previous_evidence.value -> 'strength') = 'number'
          and extract(epoch from (
            (current_evidence.value ->> 'time')::timestamptz
              - (previous_evidence.value ->> 'time')::timestamptz
          )) / 3600 > 1
          and extract(epoch from (
            (current_evidence.value ->> 'time')::timestamptz
              - (previous_evidence.value ->> 'time')::timestamptz
          )) / 3600 <= 3
      )
  ) then
    return false;
  end if;

  if p_state ->> 'waveLastVerifiedAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      p_state ->> 'waveLastVerifiedAt'
    )
    then return false; end if;
    v_wave_last_verified := (p_state ->> 'waveLastVerifiedAt')::timestamptz;
  end if;
  if p_state ->> 'waveMigrationSeedAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      p_state ->> 'waveMigrationSeedAt'
    )
    then return false; end if;
    v_wave_migration_seed := (p_state ->> 'waveMigrationSeedAt')::timestamptz;
  end if;
  if v_wave_last_verified > v_state_time
    or v_wave_migration_seed > v_state_time
    or ((p_state -> 'waveMemoryReady') = 'true'::jsonb)
      is distinct from ((p_state ->> 'waveMemoryStatus') = any (
        array['READY','MIGRATED_READY','RECOVERED_SHORT_GAP']::text[]
      ))
    or (((p_state ->> 'waveMemoryStatus') = any (
        array['READY','MIGRATED_READY','RECOVERED_SHORT_GAP']::text[]
      )) and (v_wave_last_verified is distinct from v_state_time
        or jsonb_typeof(p_state -> 'waveEnergyScore') is distinct from 'number'))
    or ((v_wave_last_verified is null)
      is distinct from (jsonb_typeof(p_state -> 'waveEnergyScore') = 'null'))
    or (p_state ->> 'waveMemoryStatus' = 'COLD_START'
      and (v_wave_last_verified is distinct from v_state_time
        or (p_state ->> 'mobilisationPotential')::numeric <> 0
        or (p_state -> 'waveMigrationSeedAwaitingReference') = 'true'::jsonb))
    or (p_state ->> 'waveMemoryStatus' = 'MISSING_INPUT'
      and v_wave_last_verified is not null
      and v_wave_last_verified >= v_state_time)
    or (p_state ->> 'waveMemoryStatus' = 'MISSING_INPUT'
      and v_wave_last_verified is null
      and (p_state -> 'waveMigrationSeedAwaitingReference') = 'false'::jsonb
      and ((p_state ->> 'mobilisationPotential')::numeric <> 0
        or (p_state ->> 'rollbackCandidateGMobilisationPotential')::numeric <> 0))
    or ((p_state -> 'waveMigrationSeedAwaitingReference') = 'true'::jsonb
      and ((p_state -> 'waveMemoryReady') = 'true'::jsonb
        or p_state ->> 'waveMemoryStatus' <> 'MISSING_INPUT'
        or v_wave_last_verified is not null
        or v_wave_migration_seed is null))
    or ((p_state -> 'waveMigrationSeedAwaitingReference') = 'false'::jsonb
      and v_wave_migration_seed is not null)
  then
    return false;
  end if;

  v_wave_approach := p_state -> 'waveApproachState';
  if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_wave_approach)) <> 12
    or exists (
      select 1 from pg_catalog.jsonb_object_keys(v_wave_approach) as allowed(key)
      where not (allowed.key = any (array[
        'schemaVersion','policyId','time','waveReferenceAt','waveActivityMoment',
        'waveNormalMoment','waveTangentMoment','latestWaveEnergyWeight',
        'latestWaveNormalAlignment','latestWaveTangentAlignment','readiness','status'
      ]::text[]))
    )
    or v_wave_approach ->> 'schemaVersion' is distinct from '1.0.0'
    or v_wave_approach ->> 'policyId'
      is distinct from 'last-mile-wave-approach-ewma4-attenuation15-v1'
    or not public.ravradar_ravscore_checkpoint_canonical_time(
      v_wave_approach ->> 'time'
    )
    or v_wave_approach ->> 'time' is distinct from p_reference_text
    or jsonb_typeof(v_wave_approach -> 'waveActivityMoment') is distinct from 'number'
    or (v_wave_approach ->> 'waveActivityMoment')::numeric not between 0 and 1
    or jsonb_typeof(v_wave_approach -> 'waveNormalMoment') is distinct from 'number'
    or jsonb_typeof(v_wave_approach -> 'waveTangentMoment') is distinct from 'number'
    or pg_catalog.abs((v_wave_approach ->> 'waveNormalMoment')::numeric)
      > (v_wave_approach ->> 'waveActivityMoment')::numeric + 0.000000001
    or pg_catalog.abs((v_wave_approach ->> 'waveTangentMoment')::numeric)
      > (v_wave_approach ->> 'waveActivityMoment')::numeric + 0.000000001
    or pg_catalog.sqrt(
      pg_catalog.power((v_wave_approach ->> 'waveNormalMoment')::numeric, 2)
      + pg_catalog.power((v_wave_approach ->> 'waveTangentMoment')::numeric, 2)
    ) > (v_wave_approach ->> 'waveActivityMoment')::numeric + 0.000000001
    or jsonb_typeof(v_wave_approach -> 'readiness') is distinct from 'boolean'
    or jsonb_typeof(v_wave_approach -> 'status') is distinct from 'string'
    or v_wave_approach ->> 'status' <> all (array[
      'READY','RECOVERED_SHORT_GAP','MISSING_INPUT','COLD_START'
    ]::text[])
    or ((v_wave_approach -> 'readiness') = 'true'::jsonb)
      is distinct from ((v_wave_approach ->> 'status') = any (
        array['READY','RECOVERED_SHORT_GAP']::text[]
      ))
    or coalesce(jsonb_typeof(v_wave_approach -> 'waveReferenceAt'), 'missing')
      not in ('string','null')
    or coalesce(jsonb_typeof(v_wave_approach -> 'latestWaveEnergyWeight'), 'missing')
      not in ('number','null')
    or coalesce(jsonb_typeof(v_wave_approach -> 'latestWaveNormalAlignment'), 'missing')
      not in ('number','null')
    or coalesce(jsonb_typeof(v_wave_approach -> 'latestWaveTangentAlignment'), 'missing')
      not in ('number','null')
  then
    return false;
  end if;
  if v_wave_approach ->> 'waveReferenceAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
        v_wave_approach ->> 'waveReferenceAt'
      )
      or (v_wave_approach ->> 'waveReferenceAt')::timestamptz > v_state_time
    then return false; end if;
  end if;
  if ((v_wave_approach ->> 'waveReferenceAt' is null) and not (
      jsonb_typeof(v_wave_approach -> 'latestWaveEnergyWeight') = 'null'
      and jsonb_typeof(v_wave_approach -> 'latestWaveNormalAlignment') = 'null'
      and jsonb_typeof(v_wave_approach -> 'latestWaveTangentAlignment') = 'null'
    ))
    or ((v_wave_approach ->> 'waveReferenceAt' is not null) and not (
      jsonb_typeof(v_wave_approach -> 'latestWaveEnergyWeight') = 'number'
      and jsonb_typeof(v_wave_approach -> 'latestWaveNormalAlignment') = 'number'
      and jsonb_typeof(v_wave_approach -> 'latestWaveTangentAlignment') = 'number'
    ))
    or (((v_wave_approach ->> 'status') = any (
        array['READY','RECOVERED_SHORT_GAP']::text[]
      )) and v_wave_approach ->> 'waveReferenceAt' is distinct from p_reference_text)
    or (v_wave_approach ->> 'status' = 'COLD_START'
      and (v_wave_approach ->> 'waveReferenceAt' is distinct from p_reference_text
        or (v_wave_approach ->> 'waveActivityMoment')::numeric <> 0
        or (v_wave_approach ->> 'waveNormalMoment')::numeric <> 0
        or (v_wave_approach ->> 'waveTangentMoment')::numeric <> 0))
    or (v_wave_approach ->> 'status' = 'MISSING_INPUT'
      and v_wave_approach ->> 'waveReferenceAt' is not null
      and (v_wave_approach ->> 'waveReferenceAt')::timestamptz >= v_state_time)
    or (v_wave_approach ->> 'status' = 'MISSING_INPUT'
      and v_wave_approach ->> 'waveReferenceAt' is null
      and ((v_wave_approach ->> 'waveActivityMoment')::numeric <> 0
        or (v_wave_approach ->> 'waveNormalMoment')::numeric <> 0
        or (v_wave_approach ->> 'waveTangentMoment')::numeric <> 0))
  then
    return false;
  end if;
  if v_wave_approach ->> 'waveReferenceAt' is not null then
    if (v_wave_approach ->> 'latestWaveEnergyWeight')::numeric not between 0 and 1
      or (v_wave_approach ->> 'latestWaveNormalAlignment')::numeric not between -1 and 1
      or (v_wave_approach ->> 'latestWaveTangentAlignment')::numeric not between -1 and 1
      or (((v_wave_approach ->> 'latestWaveNormalAlignment')::numeric = 0
          and (v_wave_approach ->> 'latestWaveTangentAlignment')::numeric = 0)
        and (v_wave_approach ->> 'latestWaveEnergyWeight')::numeric <> 0)
      or (not ((v_wave_approach ->> 'latestWaveNormalAlignment')::numeric = 0
          and (v_wave_approach ->> 'latestWaveTangentAlignment')::numeric = 0)
        and pg_catalog.abs(pg_catalog.sqrt(
          pg_catalog.power(
            (v_wave_approach ->> 'latestWaveNormalAlignment')::numeric, 2
          ) + pg_catalog.power(
            (v_wave_approach ->> 'latestWaveTangentAlignment')::numeric, 2
          )
        ) - 1) > 0.000000001)
    then return false; end if;
  end if;

  v_history := p_state -> 'historyBounds';
  if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_history)) <> 4
    or exists (
      select 1 from pg_catalog.jsonb_object_keys(v_history) as allowed(key)
      where not (allowed.key = any (array[
        'schemaVersion','current','waveMobilisation','lastMile'
      ]::text[]))
    )
    or v_history ->> 'schemaVersion' is distinct from '1.0.0'
    or jsonb_typeof(v_history -> 'current') is distinct from 'object'
    or (select pg_catalog.count(*)
        from pg_catalog.jsonb_object_keys(v_history -> 'current')) <> 2
    or exists (
      select 1 from pg_catalog.jsonb_object_keys(v_history -> 'current') as allowed(key)
      where not (allowed.key = any (array['lowerPotential','upperPotential']::text[]))
    )
    or jsonb_typeof(v_history -> 'waveMobilisation') is distinct from 'object'
    or (select pg_catalog.count(*)
        from pg_catalog.jsonb_object_keys(v_history -> 'waveMobilisation')) <> 4
    or exists (
      select 1
      from pg_catalog.jsonb_object_keys(v_history -> 'waveMobilisation') as allowed(key)
      where not (allowed.key = any (array[
        'lowerPotential','upperPotential','lastUnknownAt','conservativeResetAt'
      ]::text[]))
    )
    or jsonb_typeof(v_history -> 'lastMile') is distinct from 'object'
    or (select pg_catalog.count(*)
        from pg_catalog.jsonb_object_keys(v_history -> 'lastMile')) <> 4
    or exists (
      select 1 from pg_catalog.jsonb_object_keys(v_history -> 'lastMile') as allowed(key)
      where not (allowed.key = any (array[
        'minimumFactorTrack','maximumFactorTrack','lastUnknownAt','conservativeResetAt'
      ]::text[]))
    )
  then
    return false;
  end if;

  if coalesce(jsonb_typeof(v_history -> 'current' -> 'lowerPotential'), 'missing')
      not in ('number','null')
    or coalesce(jsonb_typeof(v_history -> 'current' -> 'upperPotential'), 'missing')
      not in ('number','null')
    or (jsonb_typeof(v_history -> 'current' -> 'lowerPotential') = 'null')
      is distinct from (jsonb_typeof(v_history -> 'current' -> 'upperPotential') = 'null')
  then return false; end if;
  if jsonb_typeof(v_history -> 'current' -> 'lowerPotential') = 'number' then
    v_current_lower := (v_history -> 'current' ->> 'lowerPotential')::numeric;
    v_current_upper := (v_history -> 'current' ->> 'upperPotential')::numeric;
    if v_current_lower not between 0 and 100
      or v_current_upper not between 0 and 100
      or v_current_lower > v_current_upper + 0.000000001
      or ((p_state -> 'currentMemoryReady') = 'true'::jsonb and (
        v_current_lower > (p_state ->> 'supplyPotential')::numeric + 0.000000001
        or v_current_upper < (p_state ->> 'supplyPotential')::numeric - 0.000000001
        or pg_catalog.abs(v_current_lower - v_current_upper) > 0.000000001
      ))
    then return false; end if;
  elsif (p_state -> 'currentMemoryReady') = 'true'::jsonb then
    return false;
  end if;

  if jsonb_typeof(v_history -> 'waveMobilisation' -> 'lowerPotential')
      is distinct from 'number'
    or jsonb_typeof(v_history -> 'waveMobilisation' -> 'upperPotential')
      is distinct from 'number'
    or coalesce(jsonb_typeof(v_history -> 'waveMobilisation' -> 'lastUnknownAt'), 'missing')
      not in ('string','null')
    or coalesce(
      jsonb_typeof(v_history -> 'waveMobilisation' -> 'conservativeResetAt'),
      'missing'
    ) not in ('string','null')
  then return false; end if;
  v_wave_lower := (v_history -> 'waveMobilisation' ->> 'lowerPotential')::numeric;
  v_wave_upper := (v_history -> 'waveMobilisation' ->> 'upperPotential')::numeric;
  if v_wave_lower not between 0 and 100
    or v_wave_upper not between 0 and 100
    or v_wave_lower > v_wave_upper + 0.000000001
  then return false; end if;
  if v_history -> 'waveMobilisation' ->> 'lastUnknownAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      v_history -> 'waveMobilisation' ->> 'lastUnknownAt'
    ) then return false; end if;
    v_wave_unknown := (v_history -> 'waveMobilisation' ->> 'lastUnknownAt')::timestamptz;
  end if;
  if v_history -> 'waveMobilisation' ->> 'conservativeResetAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      v_history -> 'waveMobilisation' ->> 'conservativeResetAt'
    ) then return false; end if;
    v_wave_reset :=
      (v_history -> 'waveMobilisation' ->> 'conservativeResetAt')::timestamptz;
  end if;
  if v_wave_unknown > v_state_time or v_wave_reset > v_state_time
    or (v_wave_reset is not null and (
      v_wave_unknown is null
      or v_wave_reset < v_wave_unknown
      or extract(epoch from (v_wave_reset - v_wave_unknown)) / 3600 < 288
    ))
    or (v_wave_reset is null and v_wave_unknown is not null
      and extract(epoch from (v_state_time - v_wave_unknown)) / 3600 >= 288)
    or ((v_wave_unknown is null or v_wave_reset is not null)
      and pg_catalog.abs(v_wave_lower - v_wave_upper) > 0.000000001)
    or (v_wave_reset is null and (
      v_wave_lower > (p_state ->> 'mobilisationPotential')::numeric + 0.000000001
      or v_wave_upper < (p_state ->> 'mobilisationPotential')::numeric - 0.000000001
    ))
  then return false; end if;

  if coalesce(jsonb_typeof(v_history -> 'lastMile' -> 'lastUnknownAt'), 'missing')
      not in ('string','null')
    or coalesce(jsonb_typeof(v_history -> 'lastMile' -> 'conservativeResetAt'), 'missing')
      not in ('string','null')
    or jsonb_typeof(v_history -> 'lastMile' -> 'minimumFactorTrack')
      is distinct from 'object'
    or jsonb_typeof(v_history -> 'lastMile' -> 'maximumFactorTrack')
      is distinct from 'object'
  then return false; end if;
  if exists (
    select 1
    from (values
      (v_history -> 'lastMile' -> 'minimumFactorTrack'),
      (v_history -> 'lastMile' -> 'maximumFactorTrack')
    ) as track(value)
    where (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(track.value)) <> 2
      or exists (
        select 1 from pg_catalog.jsonb_object_keys(track.value) as allowed(key)
        where not (allowed.key = any (array['activityMoment','normalMoment']::text[]))
      )
      or jsonb_typeof(track.value -> 'activityMoment') is distinct from 'number'
      or jsonb_typeof(track.value -> 'normalMoment') is distinct from 'number'
      or (track.value ->> 'activityMoment')::numeric not between 0 and 1
      or pg_catalog.abs((track.value ->> 'normalMoment')::numeric)
        > (track.value ->> 'activityMoment')::numeric + 0.000000001
  ) then return false; end if;
  v_min_activity :=
    (v_history -> 'lastMile' -> 'minimumFactorTrack' ->> 'activityMoment')::numeric;
  v_min_normal :=
    (v_history -> 'lastMile' -> 'minimumFactorTrack' ->> 'normalMoment')::numeric;
  v_max_activity :=
    (v_history -> 'lastMile' -> 'maximumFactorTrack' ->> 'activityMoment')::numeric;
  v_max_normal :=
    (v_history -> 'lastMile' -> 'maximumFactorTrack' ->> 'normalMoment')::numeric;
  v_point_activity := (v_wave_approach ->> 'waveActivityMoment')::numeric;
  v_point_normal := (v_wave_approach ->> 'waveNormalMoment')::numeric;
  v_min_factor := greatest(0.85, least(
    1,
    1 - 0.15 * greatest(
      0,
      least(v_min_activity, (v_min_activity - v_min_normal) / 1.25)
    )
  ));
  v_max_factor := greatest(0.85, least(
    1,
    1 - 0.15 * greatest(
      0,
      least(v_max_activity, (v_max_activity - v_max_normal) / 1.25)
    )
  ));
  v_point_factor := greatest(0.85, least(
    1,
    1 - 0.15 * greatest(
      0,
      least(v_point_activity, (v_point_activity - v_point_normal) / 1.25)
    )
  ));
  if v_history -> 'lastMile' ->> 'lastUnknownAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      v_history -> 'lastMile' ->> 'lastUnknownAt'
    ) then return false; end if;
    v_last_mile_unknown :=
      (v_history -> 'lastMile' ->> 'lastUnknownAt')::timestamptz;
  end if;
  if v_history -> 'lastMile' ->> 'conservativeResetAt' is not null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      v_history -> 'lastMile' ->> 'conservativeResetAt'
    ) then return false; end if;
    v_last_mile_reset :=
      (v_history -> 'lastMile' ->> 'conservativeResetAt')::timestamptz;
  end if;
  if v_last_mile_unknown > v_state_time or v_last_mile_reset > v_state_time
    or (v_last_mile_reset is not null and (
      v_last_mile_unknown is null
      or v_last_mile_reset < v_last_mile_unknown
      or extract(epoch from (
        v_last_mile_reset - v_last_mile_unknown
      )) / 3600 < 40
    ))
    or (v_last_mile_reset is null and v_last_mile_unknown is not null
      and extract(epoch from (
        v_state_time - v_last_mile_unknown
      )) / 3600 >= 40)
    or v_min_factor > v_max_factor + 0.000000001
    or ((v_last_mile_unknown is null or v_last_mile_reset is not null) and (
      pg_catalog.abs(v_min_activity - v_max_activity) > 0.000000001
      or pg_catalog.abs(v_min_normal - v_max_normal) > 0.000000001
    ))
    or (v_last_mile_reset is null and (
      v_point_factor < v_min_factor - 0.000000001
      or v_point_factor > v_max_factor + 0.000000001
    ))
  then return false; end if;

  v_lineage := p_state -> 'lineage';
  if jsonb_typeof(v_lineage) = 'object' then
    if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_lineage)) = 8
      and not exists (
        select 1 from pg_catalog.jsonb_object_keys(v_lineage) as keys(key)
        where not (keys.key = any (array[
          'currentEvidenceSource','migrationId','sourceModelId',
          'sourceStateSchemaVersion','migratedAt','waveApproachBootstrapHours',
          'waveApproachMaximumOmittedMomentShare',
          'waveApproachMaximumScoreErrorBeforeRounding'
        ]::text[]))
      )
    then
      if v_lineage ->> 'currentEvidenceSource'
          is distinct from 'VERIFIED_CANDIDATE_G_SIGNED_EVIDENCE_REWEIGHT'
        or v_lineage ->> 'migrationId' is distinct from
          'candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5'
        or v_lineage ->> 'sourceModelId'
          is distinct from 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3'
        or v_lineage ->> 'sourceStateSchemaVersion' is distinct from '2.0.0'
        or jsonb_typeof(v_lineage -> 'waveApproachBootstrapHours')
          is distinct from 'number'
        or (v_lineage ->> 'waveApproachBootstrapHours')::numeric <> 40
        or jsonb_typeof(v_lineage -> 'waveApproachMaximumOmittedMomentShare')
          is distinct from 'number'
        or pg_catalog.abs(
          (v_lineage ->> 'waveApproachMaximumOmittedMomentShare')::numeric
            - 0.0009765625
        ) > 0.000000001
        or jsonb_typeof(v_lineage -> 'waveApproachMaximumScoreErrorBeforeRounding')
          is distinct from 'number'
        or pg_catalog.abs(
          (v_lineage ->> 'waveApproachMaximumScoreErrorBeforeRounding')::numeric
            - 0.01171875
        ) > 0.000000001
        or not public.ravradar_ravscore_checkpoint_canonical_time(
          v_lineage ->> 'migratedAt'
        )
        or (v_lineage ->> 'migratedAt')::timestamptz > v_state_time
      then return false; end if;
    elsif (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_lineage)) = 7
      and not exists (
        select 1 from pg_catalog.jsonb_object_keys(v_lineage) as keys(key)
        where not (keys.key = any (array[
          'boundedUnknownPositionCount','completeCausalPositionCount',
          'expectedCausalPositionCount','historyTransition','recoveryId','source',
          'targetReferenceAt'
        ]::text[]))
      )
    then
      if v_lineage ->> 'recoveryId'
          is distinct from 'bounded-private-48h-history-cold-replay-v3'
        or v_lineage ->> 'source' is distinct from 'VERIFIED_PRIVATE_PROVENANCE_REPLAY'
        or jsonb_typeof(v_lineage -> 'expectedCausalPositionCount')
          is distinct from 'number'
        or (v_lineage ->> 'expectedCausalPositionCount')::numeric <> 48
        or jsonb_typeof(v_lineage -> 'completeCausalPositionCount')
          is distinct from 'number'
        or jsonb_typeof(v_lineage -> 'boundedUnknownPositionCount')
          is distinct from 'number'
        or pg_catalog.trunc(
          (v_lineage ->> 'completeCausalPositionCount')::numeric
        ) <> (v_lineage ->> 'completeCausalPositionCount')::numeric
        or pg_catalog.trunc(
          (v_lineage ->> 'boundedUnknownPositionCount')::numeric
        ) <> (v_lineage ->> 'boundedUnknownPositionCount')::numeric
        or (v_lineage ->> 'completeCausalPositionCount')::numeric < 0
        or (v_lineage ->> 'boundedUnknownPositionCount')::numeric < 0
        or (v_lineage ->> 'completeCausalPositionCount')::numeric
          + (v_lineage ->> 'boundedUnknownPositionCount')::numeric <> 48
        or v_lineage ->> 'historyTransition' is distinct from case
          when (v_lineage ->> 'boundedUnknownPositionCount')::numeric > 0
            then 'UNKNOWN_HISTORY_INTERVAL'
          else 'VERIFIED_CAUSAL_HISTORY_WINDOW'
        end
        or not public.ravradar_ravscore_checkpoint_canonical_time(
          v_lineage ->> 'targetReferenceAt'
        )
        or (v_lineage ->> 'targetReferenceAt')::timestamptz > v_state_time
      then return false; end if;
    else
      return false;
    end if;
  end if;
  return true;
exception
  when others then
    return false;
end;
$$;

create or replace function public.ravradar_ravscore_checkpoint_candidate_state_valid(
  p_state jsonb,
  p_reference_text text
)
returns boolean
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_reference timestamptz;
  v_boundary timestamptz;
  v_first_time timestamptz;
  v_second_time timestamptz;
begin
  if jsonb_typeof(p_state) is distinct from 'object'
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(p_state)) <> 15
    or exists (
      select 1
      from pg_catalog.jsonb_object_keys(p_state) as allowed(key)
      where not (allowed.key = any (array[
        'schemaVersion','modelId','variantId','profileId','stateKey','time',
        'transportReferenceAt','transportPotential','outboundEpisodeEffectiveHours',
        'transportMemoryReady','transportMemoryStatus','transportMemoryWindowHours',
        'transportMemoryCoverageHours','transportEvidence','mobilisationPotential'
      ]::text[]))
    )
    -- RAVSCORE_CHECKPOINT_CANDIDATE_STATE_BINDING_GENERATED_BEGIN
    or p_state ->> 'schemaVersion' is distinct from '2.0.0'
    or p_state ->> 'modelId'
      is distinct from 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3'
    or p_state ->> 'variantId'
      is distinct from 'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED'
    or p_state ->> 'profileId'
      is distinct from 'current-0.03-0.15-in10-out8-exhaust13-window48-boundary0-wave-build4-decay48'
    -- RAVSCORE_CHECKPOINT_CANDIDATE_STATE_BINDING_GENERATED_END
    or coalesce(p_state ->> 'stateKey', '') !~ '^sha256:[0-9a-f]{64}$'
    or not public.ravradar_ravscore_checkpoint_canonical_time(p_reference_text)
    or not public.ravradar_ravscore_checkpoint_canonical_time(p_state ->> 'time')
    or p_state ->> 'time' is distinct from p_reference_text
    or not public.ravradar_ravscore_checkpoint_canonical_time(
      p_state ->> 'transportReferenceAt'
    )
    or p_state ->> 'transportReferenceAt' is distinct from p_reference_text
    or jsonb_typeof(p_state -> 'transportPotential') is distinct from 'number'
    or (p_state ->> 'transportPotential')::numeric not between 0 and 100
    or jsonb_typeof(p_state -> 'outboundEpisodeEffectiveHours') is distinct from 'number'
    or (p_state ->> 'outboundEpisodeEffectiveHours')::numeric < 0
    or p_state -> 'transportMemoryReady' is distinct from 'true'::jsonb
    or p_state ->> 'transportMemoryStatus' is distinct from 'READY'
    or p_state -> 'transportMemoryWindowHours' is distinct from '48'::jsonb
    or p_state -> 'transportMemoryCoverageHours' is distinct from '48'::jsonb
    or jsonb_typeof(p_state -> 'mobilisationPotential') is distinct from 'number'
    or (p_state ->> 'mobilisationPotential')::numeric not between 0 and 100
    or jsonb_typeof(p_state -> 'transportEvidence') is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_state -> 'transportEvidence') not between 1 and 49
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_state -> 'transportEvidence') as evidence(value)
      where jsonb_typeof(evidence.value) is distinct from 'object'
        or (select pg_catalog.count(*)
            from pg_catalog.jsonb_object_keys(evidence.value)) <> 2
        or exists (
          select 1 from pg_catalog.jsonb_object_keys(evidence.value) as keyset(key)
          where not (keyset.key = any (array['time','strength']::text[]))
        )
        or coalesce(evidence.value ->> 'time', '') !~
          '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
        or coalesce(jsonb_typeof(evidence.value -> 'strength'), 'missing')
          not in ('number','null')
        or (jsonb_typeof(evidence.value -> 'strength') = 'number'
          and (evidence.value ->> 'strength')::numeric not between -1 and 1)
    )
    or public.ravradar_ravscore_checkpoint_has_forbidden_key(p_state)
  then
    return false;
  end if;

  if pg_catalog.jsonb_array_length(p_state -> 'transportEvidence') not between 2 and 49
    or exists (
      select 1
      from (
        select evidence.value,
          evidence.ordinality,
          pg_catalog.lag(evidence.value ->> 'time') over (
            order by evidence.ordinality
          ) as previous_time
        from pg_catalog.jsonb_array_elements(
          p_state -> 'transportEvidence'
        ) with ordinality as evidence(value, ordinality)
      ) as ordered
      where not public.ravradar_ravscore_checkpoint_canonical_time(
          ordered.value ->> 'time'
        )
        or jsonb_typeof(ordered.value -> 'strength') is distinct from 'number'
        or (ordered.value ->> 'strength')::numeric not between -1 and 1
        or (ordered.previous_time is not null and (
          (ordered.value ->> 'time')::timestamptz
            <= ordered.previous_time::timestamptz
          or extract(epoch from (
            (ordered.value ->> 'time')::timestamptz
              - ordered.previous_time::timestamptz
          )) / 3600 > 3
        ))
    )
    or p_state -> 'transportEvidence'
      -> (pg_catalog.jsonb_array_length(p_state -> 'transportEvidence') - 1)
      ->> 'time' is distinct from p_reference_text
  then
    return false;
  end if;

  v_reference := p_reference_text::timestamptz;
  v_boundary := v_reference - interval '48 hours';
  v_first_time := (
    p_state -> 'transportEvidence' -> 0 ->> 'time'
  )::timestamptz;
  v_second_time := (
    p_state -> 'transportEvidence' -> 1 ->> 'time'
  )::timestamptz;
  if v_first_time > v_boundary
    or (v_first_time < v_boundary and (
      pg_catalog.jsonb_array_length(p_state -> 'transportEvidence') < 3
      or v_first_time < v_boundary - interval '3 hours'
      or v_second_time < v_boundary
      or v_second_time - v_first_time > interval '3 hours'
    ))
  then
    return false;
  end if;
  return true;
exception
  when others then
    return false;
end;
$$;

create or replace function public.ravradar_ravscore_checkpoint_payload_valid(
  p_payload jsonb,
  p_target_reference timestamptz
)
returns boolean
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_companion jsonb;
  v_integrated_binding jsonb;
  v_candidate_binding jsonb;
  v_privacy constant jsonb := '{
    "compactDerivedStateOnly": true,
    "weatherIncluded": false,
    "scoresIncluded": false,
    "rawVectorsIncluded": false,
    "coordinatesIncluded": false,
    "privateDataIncluded": false
  }'::jsonb;
  v_reference_text text;
begin
  if p_target_reference is null
    or p_payload is null
    or jsonb_typeof(p_payload) is distinct from 'object'
    -- This is PostgreSQL's normalized JSONB-text size. The caller separately
    -- owns the exact compact JSON.stringify UTF-8 byte measurement.
    or pg_catalog.octet_length(pg_catalog.convert_to(p_payload::text, 'UTF8')) > 16777216
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(p_payload)) <> 12
    or exists (
      select 1
      from pg_catalog.jsonb_object_keys(p_payload) as allowed(key)
      where not (allowed.key = any (array[
        'schemaVersion','status','datasetId','productionReferenceAt','modelBinding',
        'continuationStateContractSha256','generationSha256','partCount',
        'stateSha256','states','candidateGRollbackCompanion','privacy'
      ]::text[]))
    )
    or p_payload -> 'schemaVersion' is distinct from '4'::jsonb
    or p_payload ->> 'status'
      is distinct from 'ravscore-schema6-with-candidate-g-rollback-companion'
    or jsonb_typeof(p_payload -> 'datasetId') is distinct from 'string'
    or jsonb_typeof(p_payload -> 'productionReferenceAt') is distinct from 'string'
    or jsonb_typeof(p_payload -> 'continuationStateContractSha256')
      is distinct from 'string'
    or jsonb_typeof(p_payload -> 'generationSha256') is distinct from 'string'
    or jsonb_typeof(p_payload -> 'stateSha256') is distinct from 'string'
    or coalesce(p_payload ->> 'datasetId', '') !~
      '^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
    -- RAVSCORE_CHECKPOINT_CONTINUATION_STATE_CONTRACT_GENERATED_BEGIN
    or p_payload ->> 'continuationStateContractSha256' is distinct from
      '35c45f8f1f701695923b3195d60a6b8931aad4d2d08b05c93900b88401eca95c'
    -- RAVSCORE_CHECKPOINT_CONTINUATION_STATE_CONTRACT_GENERATED_END
    or coalesce(p_payload ->> 'generationSha256', '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_payload ->> 'stateSha256', '') !~ '^[0-9a-f]{64}$'
    or p_payload -> 'privacy' is distinct from v_privacy
    or jsonb_typeof(p_payload -> 'modelBinding') is distinct from 'object'
    or jsonb_typeof(p_payload -> 'partCount') is distinct from 'number'
    or jsonb_typeof(p_payload -> 'states') is distinct from 'object'
    or public.ravradar_ravscore_checkpoint_has_forbidden_key(p_payload)
  then
    return false;
  end if;

  v_reference_text := p_payload ->> 'productionReferenceAt';
  if not public.ravradar_ravscore_checkpoint_canonical_time(v_reference_text)
    or v_reference_text::timestamptz is distinct from p_target_reference
    or p_payload -> 'partCount' is distinct from '673'::jsonb
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(
      p_payload -> 'states'
    )) <> 673
    or exists (
      select 1
      from pg_catalog.jsonb_each(p_payload -> 'states') as state(part_id, value)
      where state.part_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$'
        or pg_catalog.octet_length(pg_catalog.convert_to(state.part_id, 'UTF8')) > 100
        or not public.ravradar_ravscore_checkpoint_integrated_state_valid(
          state.value,
          v_reference_text
        )
    )
    or (select pg_catalog.count(distinct state.value ->> 'samplingContextKey')
        from pg_catalog.jsonb_each(p_payload -> 'states') as state(part_id, value)) <> 673
  then
    return false;
  end if;

  v_integrated_binding := p_payload -> 'modelBinding';
  -- RAVSCORE_CHECKPOINT_INTEGRATED_BINDING_GENERATED_BEGIN
  if v_integrated_binding is distinct from '{
    "modelId": "RRS-COASTAL-PROCESS-INTEGRATED-1.1.0",
    "stateSchemaVersion": "6.0.0",
    "variantId": "COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2",
    "profileId": "cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5",
    "componentSchemaId": "ravscore-components-huntability-delivery-mobilisation-bounds-v5",
    "explanationSchemaId": "ravscore-explanation-integrated-bounds-v5",
    "rankingPolicyId": "direction-broad-19-history-tie-v2",
    "bestTimePolicyId": "score-history-water-tie-earliest-v3",
    "presentationPolicyId": "score-bands-35-55-75-exceptional90-v1",
    "modelContractSha256": "a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b",
    "modelBundleSha256": "d5796289f645f1bcab6b4fe822c5ed6b0e919321013687302feb2139e814a286"
  }'::jsonb then
    return false;
  end if;
  -- RAVSCORE_CHECKPOINT_INTEGRATED_BINDING_GENERATED_END

  v_companion := p_payload -> 'candidateGRollbackCompanion';
  if jsonb_typeof(v_companion) is distinct from 'object'
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_companion)) <> 11
    or exists (
      select 1
      from pg_catalog.jsonb_object_keys(v_companion) as allowed(key)
      where not (allowed.key = any (array[
        'schemaVersion','status','datasetId','productionReferenceAt',
        'generationSha256','modelBinding','rollbackId','partCount',
        'stateSha256','states','privacy'
      ]::text[]))
    )
    or v_companion -> 'schemaVersion' is distinct from '1'::jsonb
    or v_companion ->> 'status' is distinct from 'candidate-g-rollback-ready-companion'
    or jsonb_typeof(v_companion -> 'datasetId') is distinct from 'string'
    or jsonb_typeof(v_companion -> 'productionReferenceAt') is distinct from 'string'
    or not public.ravradar_ravscore_checkpoint_canonical_time(
      v_companion ->> 'productionReferenceAt'
    )
    or jsonb_typeof(v_companion -> 'generationSha256') is distinct from 'string'
    or jsonb_typeof(v_companion -> 'stateSha256') is distinct from 'string'
    or jsonb_typeof(v_companion -> 'rollbackId') is distinct from 'string'
    or v_companion ->> 'datasetId' is distinct from p_payload ->> 'datasetId'
    or v_companion ->> 'productionReferenceAt' is distinct from v_reference_text
    or v_companion ->> 'generationSha256'
      is distinct from p_payload ->> 'generationSha256'
    or v_companion ->> 'rollbackId'
      is distinct from 'integrated-schema6-to-candidate-g-schema2-v3'
    or coalesce(v_companion ->> 'stateSha256', '') !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(v_companion -> 'partCount') is distinct from 'number'
    or v_companion -> 'partCount' is distinct from '673'::jsonb
    or v_companion -> 'privacy' is distinct from v_privacy
    or jsonb_typeof(v_companion -> 'modelBinding') is distinct from 'object'
    or jsonb_typeof(v_companion -> 'states') is distinct from 'object'
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(
      v_companion -> 'states'
    )) <> 673
    or exists (
      select 1
      from pg_catalog.jsonb_each(v_companion -> 'states') as state(part_id, value)
      where state.part_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$'
        or pg_catalog.octet_length(pg_catalog.convert_to(state.part_id, 'UTF8')) > 100
        or not public.ravradar_ravscore_checkpoint_candidate_state_valid(
          state.value,
          v_reference_text
        )
    )
    or (select pg_catalog.count(distinct state.value ->> 'stateKey')
        from pg_catalog.jsonb_each(v_companion -> 'states') as state(part_id, value)) <> 673
    or exists (
      (select key from pg_catalog.jsonb_object_keys(p_payload -> 'states') as x(key)
       except
       select key from pg_catalog.jsonb_object_keys(v_companion -> 'states') as y(key))
      union all
      (select key from pg_catalog.jsonb_object_keys(v_companion -> 'states') as x(key)
       except
       select key from pg_catalog.jsonb_object_keys(p_payload -> 'states') as y(key))
    )
  then
    return false;
  end if;

  v_candidate_binding := v_companion -> 'modelBinding';
  -- RAVSCORE_CHECKPOINT_CANDIDATE_G_ROLLBACK_BINDING_GENERATED_BEGIN
  if v_candidate_binding is distinct from '{
    "modelId": "RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3",
    "stateSchemaVersion": "2.0.0",
    "variantId": "G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED",
    "profileId": "current-0.03-0.15-in10-out8-exhaust13-window48-boundary0-wave-build4-decay48",
    "componentSchemaId": "ravscore-components-huntability-transport-mobilisation-candidate-g-v1",
    "explanationSchemaId": "ravscore-explanation-candidate-g-v3",
    "rankingPolicyId": "direction-broad-19-v1",
    "bestTimePolicyId": "score-water-tie-earliest-v2",
    "presentationPolicyId": "score-bands-35-55-75-exceptional90-v1",
    "modelContractSha256": "c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8",
    "modelBundleSha256": "7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d"
  }'::jsonb then
    return false;
  end if;
  -- RAVSCORE_CHECKPOINT_CANDIDATE_G_ROLLBACK_BINDING_GENERATED_END

  return true;
exception
  when others then
    return false;
end;
$$;

-- One exact 4.0.320 predecessor may already have been written by production
-- head 7198b685f4bc9d86bd6432b049380f4279ab797c while this migration is
-- deployed. Validate it by projecting only its continuation hash through the
-- current full payload validator. This is a migration bridge, not a fallback.
create or replace function public.ravradar_ravscore_checkpoint_predecessor_payload_valid(
  p_payload jsonb,
  p_target_reference timestamptz,
  p_current_implementation_sha256 text
)
returns boolean
language plpgsql
stable
set search_path = pg_catalog, public
as $$
begin
  if p_payload is null
    or p_target_reference is null
    or p_current_implementation_sha256 is null
    or p_payload ->> 'continuationStateContractSha256' is distinct from
      '082a5187f569518c0474590e924ccd17fce760d494a1da4a593de551e440cf91'
  then
    return false;
  end if;
  return public.ravradar_ravscore_checkpoint_payload_valid(
    pg_catalog.jsonb_set(
      p_payload,
      '{continuationStateContractSha256}',
      pg_catalog.to_jsonb(p_current_implementation_sha256),
      false
    ),
    p_target_reference
  );
exception
  when others then
    return false;
end;
$$;

create or replace function public.ravradar_ravscore_checkpoint_cas(
  p_expected_version bigint,
  p_target_reference timestamptz,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_key constant text := 'ravscore-continuation-checkpoint';
  v_version bigint;
  v_payload jsonb;
  v_central_reference timestamptz;
  v_central_is_compatible_predecessor boolean := false;
  v_exact_predecessor_same_target_transition boolean := false;
  v_disposition text;
  v_result jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_expected_version is null
    or p_expected_version < 0
    or not public.ravradar_ravscore_checkpoint_payload_valid(
      p_payload,
      p_target_reference
    )
  then
    raise exception 'invalid protected RavScore checkpoint CAS input'
      using errcode = '22023';
  end if;

  select version, payload into v_version, v_payload
  from public.admin_documents
  where document_key = v_key
  for update;

  if not found then
    if p_expected_version <> 0 then
      raise exception 'protected RavScore checkpoint CAS version mismatch'
        using errcode = '40001';
    end if;
    insert into public.admin_documents(document_key, payload, updated_by)
    values(v_key, p_payload, null)
    on conflict (document_key) do nothing
    returning version, payload into v_version, v_payload;
    if found then
      v_disposition := 'inserted';
    else
      select version, payload into strict v_version, v_payload
      from public.admin_documents
      where document_key = v_key
      for update;
    end if;
  end if;

  if v_disposition is null then
    if not public.ravradar_ravscore_checkpoint_canonical_time(
      v_payload ->> 'productionReferenceAt'
    ) then
      raise exception 'protected RavScore checkpoint central row is invalid'
        using errcode = '22023';
    end if;
    v_central_reference := (v_payload ->> 'productionReferenceAt')::timestamptz;
    if public.ravradar_ravscore_checkpoint_payload_valid(
      v_payload,
      v_central_reference
    ) then
      v_central_is_compatible_predecessor := false;
    elsif public.ravradar_ravscore_checkpoint_predecessor_payload_valid(
      v_payload,
      v_central_reference,
      p_payload ->> 'continuationStateContractSha256'
    ) then
      v_central_is_compatible_predecessor := true;
    else
      raise exception 'protected RavScore checkpoint central row is invalid'
        using errcode = '22023';
    end if;
    v_exact_predecessor_same_target_transition :=
      v_central_is_compatible_predecessor
      and v_central_reference = p_target_reference
      and (
        v_payload
          #- '{continuationStateContractSha256}'
          #- '{generationSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}'
      ) = (
        p_payload
          #- '{continuationStateContractSha256}'
          #- '{generationSha256}'
          #- '{candidateGRollbackCompanion,generationSha256}'
      );
    -- Equality is checked before the expected version. This makes a retry
    -- idempotent when the first HTTP response was lost after a committed write.
    if v_payload = p_payload then
      v_disposition := 'unchanged';
    elsif v_central_reference > p_target_reference then
      raise exception 'protected RavScore checkpoint would regress central state'
        using errcode = '22023';
    elsif v_central_reference = p_target_reference
      and not v_exact_predecessor_same_target_transition
    then
      raise exception 'protected RavScore checkpoint conflicts at the same reference'
        using errcode = '23505';
    elsif v_version is distinct from p_expected_version then
      raise exception 'protected RavScore checkpoint CAS version mismatch'
        using errcode = '40001';
    else
      update public.admin_documents
      set payload = p_payload, updated_by = null
      where document_key = v_key and version = p_expected_version
      returning version, payload into v_version, v_payload;
      if not found
        or v_version <> p_expected_version + 1
        or v_payload is distinct from p_payload
      then
        raise exception 'protected RavScore checkpoint CAS update lost'
          using errcode = '40001';
      end if;
      v_disposition := 'updated';
    end if;
  end if;

  v_result := pg_catalog.jsonb_build_object(
    'schemaVersion', '1.0.0',
    'documentKey', v_key,
    'disposition', v_disposition,
    'centralVersion', v_version,
    'productionReferenceAt', p_payload ->> 'productionReferenceAt',
    'partCount', (p_payload ->> 'partCount')::integer,
    'candidatePartCount',
      (p_payload -> 'candidateGRollbackCompanion' ->> 'partCount')::integer,
    'modelId', p_payload -> 'modelBinding' ->> 'modelId',
    'stateSchemaVersion', p_payload -> 'modelBinding' ->> 'stateSchemaVersion',
    'modelContractSha256',
      p_payload -> 'modelBinding' ->> 'modelContractSha256',
    'modelBundleSha256',
      p_payload -> 'modelBinding' ->> 'modelBundleSha256',
    'generationSha256', p_payload ->> 'generationSha256'
  );
  if pg_catalog.octet_length(pg_catalog.convert_to(v_result::text, 'UTF8')) > 4096 then
    raise exception 'protected RavScore checkpoint CAS metadata exceeds response bound'
      using errcode = '54000';
  end if;
  return v_result;
end;
$$;

-- A separate service-role metadata RPC attests the additive checkpoint contract.
-- Keeping it separate preserves the already verified trip/observation readback
-- and avoids replacing unrelated backend logic for a checkpoint-only change.
create or replace function public.ravradar_ravscore_checkpoint_contract()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_canonical_time_definition text;
  v_forbidden_definition text;
  v_integrated_state_definition text;
  v_candidate_state_definition text;
  v_payload_definition text;
  v_predecessor_payload_definition text;
  v_cas_definition text;
  v_history_definition text;
  v_checkpoint_definition text;
  v_canonical_time_oid oid := pg_catalog.to_regprocedure(
    'public.ravradar_ravscore_checkpoint_canonical_time(text)'
  );
  v_cas_oid oid := pg_catalog.to_regprocedure(
    'public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)'
  );
  v_history_oid oid := pg_catalog.to_regprocedure(
    'public.version_admin_document()'
  );
  v_validator_oids oid[] := array[
    pg_catalog.to_regprocedure(
      'public.ravradar_ravscore_checkpoint_has_forbidden_key(jsonb)'
    ),
    pg_catalog.to_regprocedure(
      'public.ravradar_ravscore_checkpoint_integrated_state_valid(jsonb,text)'
    ),
    pg_catalog.to_regprocedure(
      'public.ravradar_ravscore_checkpoint_candidate_state_valid(jsonb,text)'
    ),
    pg_catalog.to_regprocedure(
      'public.ravradar_ravscore_checkpoint_payload_valid(jsonb,timestamptz)'
    ),
    pg_catalog.to_regprocedure(
      'public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)'
    )
  ];
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select pg_catalog.btrim(p.prosrc, E' \n\r\t')
  into v_canonical_time_definition
  from pg_catalog.pg_proc p
  where p.oid = v_canonical_time_oid;
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_forbidden_definition
  from pg_catalog.pg_proc p
  where p.oid = v_validator_oids[1];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_integrated_state_definition
  from pg_catalog.pg_proc p
  where p.oid = v_validator_oids[2];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_candidate_state_definition
  from pg_catalog.pg_proc p
  where p.oid = v_validator_oids[3];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_payload_definition
  from pg_catalog.pg_proc p
  where p.oid = v_validator_oids[4];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_predecessor_payload_definition
  from pg_catalog.pg_proc p
  where p.oid = v_validator_oids[5];
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_cas_definition
  from pg_catalog.pg_proc p
  where p.oid = v_cas_oid;
  select pg_catalog.btrim(p.prosrc, E' \n\r\t') into v_history_definition
  from pg_catalog.pg_proc p
  where p.oid = v_history_oid;

  v_checkpoint_definition := v_canonical_time_definition
    || E'\n-- forbidden-key-validator --\n' || v_forbidden_definition
    || E'\n-- integrated-state-validator --\n' || v_integrated_state_definition
    || E'\n-- candidate-state-validator --\n' || v_candidate_state_definition
    || E'\n-- payload-validator --\n' || v_payload_definition
    || E'\n-- predecessor-payload-validator --\n' || v_predecessor_payload_definition
    || E'\n-- cas-function --\n' || v_cas_definition
    || E'\n-- checkpoint-history-exclusion --\n' || v_history_definition;

  return pg_catalog.jsonb_build_object(
    'schemaVersion', 'ravscore-checkpoint-db-v1',
    'appliedMigrationVersion', case when exists (
      select 1
      from supabase_migrations.schema_migrations m
      where m.version::text = '20260903010000'
    ) then '20260903010000' else null end,
    'checkpointContract', pg_catalog.jsonb_build_object(
      'id', 'ravscore-checkpoint-metadata-cas-v1',
      'definition', v_checkpoint_definition
    ),
    'checks', pg_catalog.jsonb_build_object(
      'checkpointContractDefinitionPresent', v_checkpoint_definition is not null,
      'checkpointCanonicalTimeHelperStableSecurityInvoker', coalesce((
        select p.provolatile = 's'
          and not p.prosecdef
        from pg_catalog.pg_proc p
        where p.oid = v_canonical_time_oid
      ), false),
      'checkpointHistoryExclusionInstalled',
        v_history_oid is not null
        and coalesce((
          select p.prosecdef
            and coalesce(
              'search_path=pg_catalog, public' = any (p.proconfig),
              false
            )
            and pg_catalog.strpos(
              p.prosrc,
              '''ravscore-continuation-checkpoint'''
            ) > 0
          from pg_catalog.pg_proc p
          where p.oid = v_history_oid
        ), false)
        and exists (
          select 1
          from pg_catalog.pg_trigger t
          where t.tgrelid = 'public.admin_documents'::regclass
            and not t.tgisinternal
            and t.tgenabled in ('O', 'A')
            and t.tgtype = 19
            and t.tgfoid = v_history_oid
        ),
      'checkpointDirectPayloadReadRestricted', (
        select pg_catalog.count(*)
        from pg_catalog.pg_policy policy
        join pg_catalog.pg_class relation on relation.oid = policy.polrelid
        join pg_catalog.pg_namespace namespace
          on namespace.oid = relation.relnamespace
        where namespace.nspname = 'public'
          and (
            (relation.relname = 'admin_documents'
              and policy.polname = 'ravradar_ravscore_checkpoint_no_direct_read')
            or (relation.relname = 'admin_document_versions'
              and policy.polname =
                'ravradar_ravscore_checkpoint_versions_no_direct_read')
          )
          and relation.relrowsecurity
          and policy.polpermissive = false
          and policy.polcmd = 'r'
          and policy.polroles = array[(
            select role.oid
            from pg_catalog.pg_roles role
            where role.rolname = 'authenticated'
          )]::oid[]
          and pg_catalog.regexp_replace(
            pg_catalog.pg_get_expr(policy.polqual, policy.polrelid),
            '[[:space:]]+',
            '',
            'g'
          ) = '(document_key<>''ravscore-continuation-checkpoint''::text)'
      ) = 2,
      'checkpointCasSecurityDefiner', coalesce((
        select p.prosecdef from pg_catalog.pg_proc p where p.oid = v_cas_oid
      ), false),
      'checkpointCasServiceRoleExecutable', coalesce(
        pg_catalog.has_function_privilege('service_role', v_cas_oid, 'EXECUTE'),
        false
      ),
      'checkpointCasAnonymousExecutionRejected',
        not coalesce(pg_catalog.has_function_privilege('anon', v_cas_oid, 'EXECUTE'), true)
        and not coalesce(
          pg_catalog.has_function_privilege('authenticated', v_cas_oid, 'EXECUTE'),
          true
        ),
      'checkpointValidatorExecutionRestricted', not exists (
        select 1
        from pg_catalog.unnest(
          pg_catalog.array_prepend(v_canonical_time_oid, v_validator_oids)
        ) as validator(oid)
        where validator.oid is null
          or coalesce(pg_catalog.has_function_privilege('anon', validator.oid, 'EXECUTE'), true)
          or coalesce(
            pg_catalog.has_function_privilege('authenticated', validator.oid, 'EXECUTE'),
            true
          )
      ),
      'checkpointFunctionsSearchPathLocked', not exists (
        select 1
        from pg_catalog.pg_proc p
        where p.oid = any (
          pg_catalog.array_cat(
            array[v_canonical_time_oid, v_history_oid]::oid[],
            pg_catalog.array_append(v_validator_oids, v_cas_oid)
          )
        )
          and not coalesce(
            'search_path=pg_catalog, public' = any (p.proconfig),
            false
          )
      ) and v_cas_oid is not null
        and v_canonical_time_oid is not null
        and v_history_oid is not null
        and pg_catalog.array_position(v_validator_oids, null) is null
    )
  );
end;
$$;

revoke all on function public.ravradar_ravscore_checkpoint_contract()
  from public, anon, authenticated;
grant execute on function public.ravradar_ravscore_checkpoint_contract()
  to service_role;

comment on function public.ravradar_ravscore_checkpoint_contract()
is 'Service-role-only metadata readback for the exact protected RavScore checkpoint implementation and ACLs; reads no checkpoint payload rows.';
revoke all on function public.ravradar_ravscore_checkpoint_canonical_time(text)
  from public, anon, authenticated;
revoke all on function public.ravradar_ravscore_checkpoint_has_forbidden_key(jsonb)
  from public, anon, authenticated;
revoke all on function public.ravradar_ravscore_checkpoint_integrated_state_valid(jsonb,text)
  from public, anon, authenticated;
revoke all on function public.ravradar_ravscore_checkpoint_candidate_state_valid(jsonb,text)
  from public, anon, authenticated;
revoke all on function public.ravradar_ravscore_checkpoint_payload_valid(jsonb,timestamptz)
  from public, anon, authenticated;
revoke all on function public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)
  from public, anon, authenticated;
revoke all on function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)
  from public, anon, authenticated;
grant execute on function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)
  to service_role;

comment on function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)
is 'Service-role-only fixed-key RavScore checkpoint CAS. It returns bounded metadata, never the checkpoint payload.';
comment on function public.ravradar_ravscore_checkpoint_predecessor_payload_valid(jsonb,timestamptz,text)
is 'Internal exact transition validator for the 4.0.320 continuation hash from source head 7198b685f4bc9d86bd6432b049380f4279ab797c; it is not a general fallback.';
-- RAVSCORE_CHECKPOINT_METADATA_CAS_GENERATED_END
