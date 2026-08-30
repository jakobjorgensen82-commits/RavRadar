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

+-- Validate the immutable public score-quality snapshot independently of the
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
    or jsonb_typeof(p_calibration_features -> 'scoreCalibrationEligible') <> 'boolean'
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
      return score_calibration_eligible = true;
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
      and p_calibration_features ->> 'modelContractSha256' = '778db7aa3946f925607a8304daa42ed17dd30294e4a51bf6d895d7293e84c4e7'
      and p_calibration_features ->> 'modelBundleSha256' = '74bfc42bb008f6743f374fc35201d3ea6f81f6e360c99873541fed83eeadcbae'
    -- RAVSCORE_INTEGRATED_BINDING_END
    then case
      when jsonb_path_query_array(
        coalesce(p_calibration_features -> 'reasonCodes', '[]'::jsonb),
        '$[*] ? (@ == "public-emergency-last-complete" || @ == "ravscore-history-incomplete" || @ == "ravscore-reconstructed-derived-evidence" || @ == "ravscore-evidence-trust-unattested")'
      ) = '[]'::jsonb
      then p_calibration_eligible = (
        p_actual_zone_id = p_forecast_zone_id
        and p_actual_coastal_part_id = p_forecast_coastal_part_id
      )
      when jsonb_path_query_array(
        coalesce(p_calibration_features -> 'reasonCodes', '[]'::jsonb),
        '$[*] ? (@ == "public-emergency-last-complete" || @ == "ravscore-history-incomplete" || @ == "ravscore-reconstructed-derived-evidence" || @ == "ravscore-evidence-trust-unattested")'
      ) in (
        '["public-emergency-last-complete"]'::jsonb,
        '["ravscore-history-incomplete"]'::jsonb,
        '["public-emergency-last-complete","ravscore-history-incomplete"]'::jsonb,
        '["ravscore-reconstructed-derived-evidence"]'::jsonb,
        '["public-emergency-last-complete","ravscore-reconstructed-derived-evidence"]'::jsonb,
        '["ravscore-evidence-trust-unattested"]'::jsonb
      ) then p_calibration_eligible = false
      else false
    end
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
      and p_calibration_features ->> 'modelBundleSha256' = 'fd3f7e70ec3706818c153c26140ae592e4f0ad2acc6c157183984689f74a2207'
    -- RAVSCORE_CANDIDATE_G_ROLLBACK_BINDING_END
    then p_calibration_eligible = false and jsonb_path_query_array(
      coalesce(p_calibration_features -> 'reasonCodes', '[]'::jsonb),
      '$[*] ? (@ == "public-emergency-last-complete" || @ == "ravscore-history-incomplete" || @ == "ravscore-reconstructed-derived-evidence" || @ == "ravscore-evidence-trust-unattested")'
    ) in (
      '[]'::jsonb,
      '["public-emergency-last-complete"]'::jsonb,
      '["ravscore-reconstructed-derived-evidence"]'::jsonb,
      '["public-emergency-last-complete","ravscore-reconstructed-derived-evidence"]'::jsonb,
      '["ravscore-evidence-trust-unattested"]'::jsonb
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
    and operational ->> 'calibrationEligible' = 'true'
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

  select p.prosrc
  into trip_binding_policy_definition
  from pg_catalog.pg_proc p
  where p.oid = pg_catalog.to_regprocedure(
    'public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)'
  );

  select p.prosrc
  into trip_active_admission_definition
  from pg_catalog.pg_proc p
  where p.oid = pg_catalog.to_regprocedure(
    'public.ravradar_trip_v3_active_binding_admitted(text,text,text,text,text,text,text,text,text,text,text,jsonb,boolean,text,text,text,text)'
  );

  select p.prosrc
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
    where m.version::text in ('20260829010000', '20260829020000')
  ) applied;

  return pg_catalog.jsonb_build_object(
    'schemaVersion', 'ravscore-integrated-cutover-db-v1',
    'tripSchemaVersion', 3,
    'appliedMigrationVersions', applied_migration_versions,
    'tripBindingPolicy', pg_catalog.jsonb_build_object(
      'id', 'ravradar-trip-v3-exact-integrated-candidate-g-history-emergency-v3',
      'definition', trip_binding_policy_definition
    ),
    'tripActiveAdmissionPolicy', pg_catalog.jsonb_build_object(
      'id', 'ravradar-trip-v3-exact-operational-active-reasons-v3',
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
      'bindingPolicyDefinitionPresent', trip_binding_policy_definition is not null,
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
          'modelBundleSha256',p_model_bundle_sha256
        ),
        true,'zone','part','zone','part'
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
          'modelBundleSha256',p_candidate_model_bundle_sha256
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
          'modelBundleSha256',p_candidate_model_bundle_sha256
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
          'modelBundleSha256',p_candidate_model_bundle_sha256
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
            'modelBundleSha256',p_model_bundle_sha256
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
            'modelBundleSha256',p_candidate_model_bundle_sha256
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
