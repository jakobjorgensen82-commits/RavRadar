-- Append-only correction of the private Candidate G companion identity.

-- The source model package ID differs from the schema-6 controller transition ID.

-- All state, generation, part, privacy, time and model-binding checks remain exact.

begin;

set local lock_timeout = '5s';

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
    or p_payload -> 'schemaVersion' is distinct from '5'::jsonb
    or p_payload ->> 'status'
      is distinct from 'ravscore-schema6-with-measured-candidate-g-continuation'
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
      'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587'
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
    "modelBundleSha256": "61ec54746fdf1ac58f3d7859d4d55a901fcc6376d0412acf2d6f4f418ae5c0a1"
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
    or v_companion -> 'schemaVersion' is distinct from '2'::jsonb
    or v_companion ->> 'status' is distinct from 'candidate-g-measured-continuation-companion'
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
      is distinct from 'integrated-schema5-to-candidate-g-schema2-v2'
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
    "modelBundleSha256": "c7c4840d3c07b71610b30d1528633bc30a9e2449d77e331d3018852a4e68891c"
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

create or replace function public.ravradar_ravscore_checkpoint_payload_reason(
  p_payload jsonb,
  p_target_reference timestamptz
)
returns text
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
    or p_payload -> 'schemaVersion' is distinct from '5'::jsonb
    or p_payload ->> 'status'
      is distinct from 'ravscore-schema6-with-measured-candidate-g-continuation'
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
      'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587'
    -- RAVSCORE_CHECKPOINT_CONTINUATION_STATE_CONTRACT_GENERATED_END
    or coalesce(p_payload ->> 'generationSha256', '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_payload ->> 'stateSha256', '') !~ '^[0-9a-f]{64}$'
    or p_payload -> 'privacy' is distinct from v_privacy
    or jsonb_typeof(p_payload -> 'modelBinding') is distinct from 'object'
    or jsonb_typeof(p_payload -> 'partCount') is distinct from 'number'
    or jsonb_typeof(p_payload -> 'states') is distinct from 'object'
    or public.ravradar_ravscore_checkpoint_has_forbidden_key(p_payload)
  then
    return 'P01'; /* source line 1467 */
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
    return 'P02'; /* source line 1490 */
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
    "modelBundleSha256": "61ec54746fdf1ac58f3d7859d4d55a901fcc6376d0412acf2d6f4f418ae5c0a1"
  }'::jsonb then
    return 'P03'; /* source line 1508 */
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
    or v_companion -> 'schemaVersion' is distinct from '2'::jsonb
    or v_companion ->> 'status' is distinct from 'candidate-g-measured-continuation-companion'
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
      is distinct from 'integrated-schema5-to-candidate-g-schema2-v2'
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
    return 'P04'; /* source line 1571 */
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
    "modelBundleSha256": "c7c4840d3c07b71610b30d1528633bc30a9e2449d77e331d3018852a4e68891c"
  }'::jsonb then
    return 'P05'; /* source line 1589 */
  end if;
  -- RAVSCORE_CHECKPOINT_CANDIDATE_G_ROLLBACK_BINDING_GENERATED_END

  return null;
exception
  when others then
    return 'P06'; /* source line 1596 */
end;
$$;

revoke all on function public.ravradar_ravscore_checkpoint_payload_valid(jsonb,timestamptz)

  from public, anon, authenticated;

revoke all on function public.ravradar_ravscore_checkpoint_payload_reason(jsonb,timestamptz)

  from public, anon, authenticated;

comment on function public.ravradar_ravscore_checkpoint_payload_valid(jsonb,timestamptz)

is 'Protected checkpoint CAS: exact Candidate G companion ID from its sealed package.';

notify pgrst, 'reload schema';

commit;
