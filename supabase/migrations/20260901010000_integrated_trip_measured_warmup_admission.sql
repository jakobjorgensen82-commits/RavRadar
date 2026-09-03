-- Additive schema-3 admission patch. Historical migrations remain immutable.
-- Public warmup truth is captured in the existing immutable reasonCodes field.
begin;
set local lock_timeout = '5s';

-- FULL_HISTORY is a ceiling, not a promise of calibration eligibility. A
-- verified derived input may lock an otherwise complete score out of learning.
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
      and p_calibration_features ->> 'modelBundleSha256' = '3192db304a6e613059cd66d1ae983583c3aaff832293bda978cdc03991bb49c3'
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

notify pgrst, 'reload schema';
commit;
