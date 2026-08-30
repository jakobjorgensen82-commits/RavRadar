-- Schema 1/2 remain visible historical records and can never enter calibration.
-- Only complete schema-3 rows bound to the exact integrated model can be eligible.
begin;

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
        normalized ~ '(gps|geolocation|latitude|longitude|coordinate|coord|position|route|track|waypoint|polyline)'
        or normalized in ('lat', 'lon', 'lng')
        or normalized ~ '(lat|lon|lng)$'
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

-- One immutable allowlist gate is shared by the table constraint and the
-- metadata-only cutover probe. It admits exactly the integrated binding or the
-- sealed Candidate G rollback binding; a merely well-formed third model is
-- rejected. Candidate G can never be calibration eligible.
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
    when p_model_version = 'RRS-COASTAL-PROCESS-INTEGRATED-1.0.0'
      and p_calibration_features ->> 'modelStateVersion' = '4.0.0'
      and p_calibration_features ->> 'modelVariantId' = 'COASTAL-SUPPLY-MOBILISATION-STRUCTURAL-LAST-MILE-HUNTABILITY-1'
      and p_calibration_features ->> 'modelProfileId' = 'cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileneutral-v3'
      and p_calibration_features ->> 'modelComponentSchemaId' = 'ravscore-components-huntability-transport-mobilisation-v3'
      and p_calibration_features ->> 'modelExplanationSchemaId' = 'ravscore-explanation-integrated-v3'
      and p_calibration_features ->> 'modelRankingPolicyId' = 'direction-broad-19-v1'
      and p_calibration_features ->> 'modelBestTimePolicyId' = 'score-water-tie-earliest-v2'
      and p_calibration_features ->> 'modelPresentationPolicyId' = 'score-bands-35-55-75-exceptional90-v1'
      and p_calibration_features ->> 'modelContractSha256' = 'a6272796cdb21ed10a3d308dc97efebf3bafc77715ac59521ac7b3522173ce76'
      and p_calibration_features ->> 'modelBundleSha256' = '2949091d782684c713fa5852fb490d712bb6bb257f8a5f86429e2c5d87545717'
    -- RAVSCORE_INTEGRATED_BINDING_END
    then case
      when p_calibration_features -> 'reasonCodes' = '["PUBLIC_EMERGENCY_LAST_COMPLETE"]'::jsonb
      then p_calibration_eligible = false
      else p_calibration_eligible = (
        p_actual_zone_id = p_forecast_zone_id
        and p_actual_coastal_part_id = p_forecast_coastal_part_id
      )
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
      and p_calibration_features ->> 'modelContractSha256' = '37cdcc9e369e82c405ab05e0a2923ccceebf8938706af74073264bf541bf95cc'
      and p_calibration_features ->> 'modelBundleSha256' = '6662f203de8929eefb9796008850d4b03d55eea39bee6ec9efa8cfa33d34d1bf'
    -- RAVSCORE_CANDIDATE_G_ROLLBACK_BINDING_END
    then p_calibration_eligible = false
    else false
  end;
$$;

-- Schema-3 writes are admitted only while the same exact model binding is the
-- atomically ACTIVE operational model and the central profile names that same
-- binding. During either PENDING phase the function returns false, so the Edge
-- outbox retries after completion instead of creating a premature calibration
-- row. Only privacy-safe model identity and zone/part ids cross this boundary.
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
      'sourceDeploymentId','deploymentId','automaticActivationAllowed',
      'schedulerActivationAllowed','calibrationEligible','requestedAt',
      'activatedAt','failureCode','returnPlanSha256','integratedReadinessSha256',
      'integratedPublicAuditSha256','integratedManifestSha256'
    ] = '{}'::jsonb
    and operational ->> 'schemaVersion' = 'ravscore-operational-model-activation-v3'
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
    and profile -> 'evidence' ->> 'decisionId' = 'DEC-0108'
    and profile -> 'evidence' ->> 'exactHeadValidationRequired' = 'true'
    and profile -> 'evidence' ->> 'freshProductionValidationRequired' = 'true'
  ) then return false; end if;

  return (
    p_model_id = 'RRS-COASTAL-PROCESS-INTEGRATED-1.0.0'
    and operational ->> 'status' = 'INTEGRATED_ACTIVE'
    and operational ->> 'calibrationEligible' = 'true'
    and profile ->> 'switchVersion' = 'RAVSCORE-PROFILE-SWITCH-INTEGRATED-1.0.0'
    and profile ->> 'publicAvailabilityPolicy' = 'integrated-model-local-fail-closed'
    and profile ->> 'status' like 'owner-approved-integrated-model-only-%'
    and profile ->> 'activationAuthority' = 'DEC-0108-integrated-ravscore-release-decision'
  ) or (
    p_model_id = 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3'
    and p_calibration_eligible = false
    and operational ->> 'status' = 'CANDIDATE_G_ACTIVE'
    and operational ->> 'calibrationEligible' = 'false'
    and profile ->> 'switchVersion' = 'RAVSCORE-PROFILE-SWITCH-CANDIDATE-G-ROLLBACK-1.0.0'
    and profile ->> 'publicAvailabilityPolicy' = 'candidate-g-local-fail-closed'
    and profile ->> 'status' = 'owner-approved-candidate-g-rollback-only-local-fail-closed'
    and profile ->> 'activationAuthority' = 'DEC-0108-manual-candidate-g-rollback'
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
    and data_quality_flags <@ '["account-manual","historical-snapshot-unavailable","not-calibration-eligible"]'::jsonb
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
        'totalScore','huntabilityScore','transportScore','mobilisationScore',
        'windSpeedMs','windDirectionDeg','waveHeightM','wavePeriodS','waveDirectionDeg',
        'currentSpeedMs','currentDirectionDeg','waterLevelM','waterLevelTrendM3h',
        'maxWaveHeight24hM','hoursSinceEnergyPeak','sustainedOnshoreHours','reasonCodes'
      ]
      and calibration_features - array[
        'modelVersion','appVersion','modelStateVersion','modelVariantId','modelProfileId',
        'modelComponentSchemaId','modelExplanationSchemaId','modelRankingPolicyId',
        'modelBestTimePolicyId','modelPresentationPolicyId','modelContractSha256','modelBundleSha256',
        'totalScore','huntabilityScore','transportScore','mobilisationScore',
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
  'True only for complete immutable schema-3 trips bound to the exact current integrated RavScore bundle and matching the forecast location. Exact Candidate G rollback trips are retained with false; unknown bindings and schema 1/2 are excluded.';

-- Read back only committed schema metadata. This function never selects an
-- observation row and is deliberately unavailable to anon/authenticated.
-- The caller supplies the expected exact binding from its checked-out source,
-- so a later source bundle cannot accidentally accept an older database gate.
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
      'id', 'ravradar-trip-v3-exact-integrated-candidate-g-emergency-v2',
      'definition', trip_binding_policy_definition
    ),
    'tripActiveAdmissionPolicy', pg_catalog.jsonb_build_object(
      'id', 'ravradar-trip-v3-exact-operational-active-reasons-v2',
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

notify pgrst, 'reload schema';
commit;
