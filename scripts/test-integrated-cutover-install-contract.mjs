import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const sources = Object.freeze({
  migration: 'supabase/migrations/20260901010000_integrated_trip_measured_warmup_admission.sql',
  schema: 'supabase/schema.sql',
  installer: 'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql',
});

const FUNCTION_NAME = 'public.ravradar_integrated_cutover_contract';
const normalize = value => String(value).replace(/\s+/g, ' ').trim();

function functionDefinition(source, label, functionName = FUNCTION_NAME) {
  const start = source.indexOf(`create or replace function ${functionName}(`);
  assert.ok(start >= 0, `${label} is missing ${functionName}`);
  const bodyStart = source.indexOf('as $$', start);
  assert.ok(bodyStart >= 0, `${label} has no function body for ${functionName}`);
  const end = source.indexOf('\n$$;', bodyStart);
  assert.ok(end >= 0, `${label} has no closed function body for ${functionName}`);
  return source.slice(start, end + '\n$$;'.length);
}

const entries = await Promise.all(Object.entries(sources).map(async ([label, file]) => [
  label,
  await fs.readFile(file, 'utf8'),
]));
const documents = Object.fromEntries(entries);
const checkpointMigration = await fs.readFile(
  'supabase/migrations/20260903010000_ravscore_checkpoint_metadata_cas.sql',
  'utf8',
);
const stableTripMigration = await fs.readFile(
  'supabase/migrations/20260829020000_integrated_trip_calibration_binding.sql',
  'utf8',
);
const definitions = Object.fromEntries(Object.entries(documents).map(([label, source]) => [
  label,
  normalize(functionDefinition(source, label)),
]));

assert.equal(definitions.schema, definitions.migration,
  'historical schema reference drifted from the versioned cutover RPC');
assert.equal(definitions.installer, definitions.migration,
  'security installer drifted from the versioned cutover RPC');

const CHECKPOINT_FUNCTION_NAMES = Object.freeze([
  'public.ravradar_ravscore_checkpoint_has_forbidden_key',
  'public.ravradar_ravscore_checkpoint_integrated_state_valid',
  'public.ravradar_ravscore_checkpoint_candidate_state_valid',
  'public.ravradar_ravscore_checkpoint_payload_valid',
  'public.ravradar_ravscore_checkpoint_predecessor_payload_valid',
  'public.ravradar_ravscore_checkpoint_cas',
  'public.ravradar_ravscore_checkpoint_contract',
]);
for (const functionName of CHECKPOINT_FUNCTION_NAMES) {
  const canonicalDefinition = normalize(functionDefinition(
    checkpointMigration,
    'checkpoint migration',
    functionName,
  ));
  assert.equal(normalize(functionDefinition(documents.schema, 'historical schema', functionName)),
    canonicalDefinition, `${functionName} drifted in historical schema`);
  assert.equal(normalize(functionDefinition(documents.installer, 'security installer', functionName)),
    canonicalDefinition, `${functionName} drifted in security installer`);
}

const CHECKPOINT_BLOCK_BEGIN = '-- RAVSCORE_CHECKPOINT_METADATA_CAS_GENERATED_BEGIN';
const CHECKPOINT_BLOCK_END = '-- RAVSCORE_CHECKPOINT_METADATA_CAS_GENERATED_END';
function checkpointGeneratedBlock(source, label) {
  const start = source.indexOf(CHECKPOINT_BLOCK_BEGIN);
  const secondStart = source.indexOf(CHECKPOINT_BLOCK_BEGIN, start + 1);
  const end = source.indexOf(CHECKPOINT_BLOCK_END, start + CHECKPOINT_BLOCK_BEGIN.length);
  assert.ok(start >= 0 && end > start && secondStart < 0,
    `${label} must contain exactly one complete checkpoint generated block`);
  assert.equal(source.indexOf(CHECKPOINT_BLOCK_END, end + 1), -1,
    `${label} contains a duplicate checkpoint generated block end`);
  return source.slice(start, end + CHECKPOINT_BLOCK_END.length).replaceAll('\r\n', '\n');
}
const checkpointBlock = checkpointGeneratedBlock(checkpointMigration, 'checkpoint migration');
assert.equal(checkpointGeneratedBlock(documents.schema, 'historical schema'), checkpointBlock,
  'historical schema checkpoint block drifted from the versioned migration');
assert.equal(checkpointGeneratedBlock(documents.installer, 'security installer'), checkpointBlock,
  'security installer checkpoint block drifted from the versioned migration');
assert.match(checkpointBlock,
  /create or replace function public\.version_admin_document\(\)[\s\S]*?'ravscore-continuation-checkpoint'/i,
  'checkpoint installation must keep the high-frequency checkpoint out of admin document history');

for (const [label, source] of Object.entries({
  migration: checkpointMigration,
  schema: documents.schema,
  installer: documents.installer,
})) {
  for (const functionName of CHECKPOINT_FUNCTION_NAMES) {
    assert.match(normalize(functionDefinition(source, label, functionName)),
      /set search_path = pg_catalog, public/i,
      `${label} does not lock ${functionName}'s search path`);
  }
  for (const functionName of [
    'public.ravradar_ravscore_checkpoint_cas',
    'public.ravradar_ravscore_checkpoint_contract',
  ]) {
    assert.match(normalize(functionDefinition(source, label, functionName)),
      /security definer/i, `${label} must keep ${functionName} security definer`);
  }
  assert.match(source,
    /revoke all on function public\.ravradar_ravscore_checkpoint_cas\(bigint,timestamptz,jsonb\)\s+from public, anon, authenticated;/i,
    `${label} exposes the checkpoint CAS outside service_role`);
  assert.match(source,
    /grant execute on function public\.ravradar_ravscore_checkpoint_cas\(bigint,timestamptz,jsonb\)\s+to service_role;/i,
    `${label} does not grant checkpoint CAS to service_role`);
  assert.match(source,
    /revoke all on function public\.ravradar_ravscore_checkpoint_contract\(\)\s+from public, anon, authenticated;/i,
    `${label} exposes checkpoint metadata readback outside service_role`);
  assert.doesNotMatch(functionDefinition(
    source,
    label,
    'public.ravradar_ravscore_checkpoint_contract',
  ), /\bfrom\s+public\.admin_documents\b/i,
  `${label} checkpoint metadata readback must not read checkpoint payload rows`);
}
assert.match(checkpointMigration, /begin;[\s\S]*set local lock_timeout = '5s';/i,
  'checkpoint migration must install transactionally with a bounded DDL lock wait');
assert.match(checkpointMigration, /notify pgrst, 'reload schema';\s*commit;/i,
  'checkpoint migration must reload PostgREST only before its transaction commits');

const operationalMigration = await fs.readFile(
  'supabase/migrations/20260829010000_ravscore_operational_documents_no_history.sql',
  'utf8',
);
for (const [label, source] of Object.entries({
  migration: operationalMigration,
  schema: documents.schema,
  installer: documents.installer,
})) {
  assert.match(source,
    /revoke all on function public\.ravradar_ravscore_operational_cas\(\s*bigint\s*,\s*bigint\s*,\s*jsonb\s*,\s*jsonb\s*\)\s*from public, anon, authenticated;/i,
    `${label} exposes the operational CAS outside service_role`);
  assert.match(source,
    /grant execute on function public\.ravradar_ravscore_operational_cas\(\s*bigint\s*,\s*bigint\s*,\s*jsonb\s*,\s*jsonb\s*\)\s*to service_role;/i,
    `${label} does not grant the operational CAS to service_role`);
}
for (const [functionName, migrationSource] of [
  ['public.ravradar_trip_v3_score_quality_allowed', documents.migration],
  ['public.ravradar_trip_v3_calibration_truth_allowed', documents.migration],
  ['public.ravradar_trip_v3_binding_allowed', documents.migration],
  ['public.ravradar_trip_v3_active_binding_admitted', documents.migration],
  ['public.ravradar_observation_require_active_v3_binding', stableTripMigration],
  ['public.ravradar_trip_payload_has_sensitive_key', stableTripMigration],
  ['public.ravradar_ravscore_operational_cas', operationalMigration],
]) {
  const canonicalDefinition = normalize(functionDefinition(
    migrationSource,
    'versioned migration',
    functionName,
  ));
  assert.equal(normalize(functionDefinition(documents.schema, 'historical schema', functionName)),
    canonicalDefinition, `${functionName} drifted in historical schema`);
  assert.equal(normalize(functionDefinition(documents.installer, 'security installer', functionName)),
    canonicalDefinition, `${functionName} drifted in security installer`);
}
for (const [label, source] of Object.entries(documents)) {
  const scoreQuality = normalize(functionDefinition(
    source,label,'public.ravradar_trip_v3_score_quality_allowed',
  ));
  assert.match(scoreQuality,/score_calibration_eligible in \(true, false\)/,
    `${label} must treat FULL_HISTORY calibration eligibility as a ceiling`);
  assert.match(scoreQuality,
    /jsonb_typeof\(p_calibration_features -> 'scoreCalibrationEligible'\) is distinct from 'boolean'/,
    `${label} must reject a missing scoreCalibrationEligible field`);
  const calibrationTruth = normalize(functionDefinition(
    source,label,'public.ravradar_trip_v3_calibration_truth_allowed',
  ));
  assert.match(calibrationTruth,
    /jsonb_typeof\(p_calibration_features -> 'scoreCalibrationEligible'\) is distinct from 'boolean'/,
    `${label} calibration truth must reject a missing scoreCalibrationEligible field`);
  assert.match(calibrationTruth,
    /scoreCalibrationEligible'\)::boolean and p_actual_zone_id = p_forecast_zone_id/,
    `${label} must apply scoreCalibrationEligible as the trip calibration ceiling`);
}

for (const [label, source] of Object.entries(documents)) {
  const activeAdmission = normalize(functionDefinition(
    source,label,'public.ravradar_trip_v3_active_binding_admitted',
  ));
  assert.match(activeAdmission,
    /'scoreCalibrationEligible', p_calibration_eligible/,
    `${label} active admission must bind the synthetic score ceiling fail-closed`);
  const readback = normalize(functionDefinition(source,label));
  const trimmedDefinitions = [...readback.matchAll(
    /select pg_catalog\.btrim\(p\.prosrc, E' \\n\\r\\t'\) into (trip_[a-z_]+_definition)/g,
  )].map(match => match[1]);
  assert.deepEqual(trimmedDefinitions, [
    'trip_score_quality_definition',
    'trip_calibration_truth_definition',
    'trip_binding_gate_definition',
    'trip_active_admission_definition',
    'trip_active_trigger_function_definition',
  ], `${label} must canonicalise all five pg_proc bodies before live hashing`);
  assert.doesNotMatch(readback,/select p\.prosrc/,
    `${label} must not hash a raw whitespace-sensitive pg_proc body`);
  assert.match(readback,
    /trip_score_quality_definition \|\| E'\\n-- calibration-truth-function --\\n' \|\| trip_calibration_truth_definition/,
    `${label} live policy hash must include the score-quality validator`);
  assert.match(readback,/'integratedProxyCeilingBindingPresent'/,
    `${label} readback lacks the false-ceiling integrated probe`);
  assert.match(readback,/'integratedMissingCalibrationCeilingRejected'/,
    `${label} readback lacks the missing-ceiling negative probe`);
}

for (const [label, source] of Object.entries(documents)) {
  const admission = functionDefinition(
    source,
    label,
    'public.ravradar_trip_v3_active_binding_admitted',
  );
  const begin = admission.indexOf('RAVSCORE_INTEGRATED_MEASURED_WARMUP_ADMISSION_BEGIN');
  const end = admission.indexOf('RAVSCORE_INTEGRATED_MEASURED_WARMUP_ADMISSION_END');
  assert.ok(begin >= 0 && end > begin,
    `${label} lacks the bounded integrated measured-warmup admission`);
  const warmup = normalize(admission.slice(begin, end));
  assert.match(warmup, /operational ->> 'calibrationEligible' = 'false'/,
    `${label} does not bind warmup admission to the exact false controller`);
  assert.match(warmup, /p_calibration_eligible = false/,
    `${label} could admit calibration-eligible warmup evidence`);
  assert.match(warmup, /ravscore-global-warmup-calibration-lock/,
    `${label} does not admit immutable FULL_HISTORY evidence captured under the global lock`);
  assert.match(warmup,
    /p_reason_codes in \( '\["ravscore-history-incomplete"\]'::jsonb, '\["public-emergency-last-complete","ravscore-history-incomplete"\]'::jsonb \)/,
    `${label} does not limit warmup admission to canonical HISTORY_INCOMPLETE evidence`);
  assert.doesNotMatch(warmup, /RRS-CANDIDATE|unknown|reconstructed|unattested/i,
    `${label} broadens warmup admission beyond the exact integrated history contract`);
}

function activeTriggerDefinition(source, label) {
  const match = source.match(
    /create trigger ravradar_observations_active_v3_binding_trigger[\s\S]*?execute function public\.ravradar_observation_require_active_v3_binding\(\);/i,
  );
  assert.ok(match, `${label} is missing the active schema-3 binding trigger`);
  return normalize(match[0]);
}
assert.equal(activeTriggerDefinition(documents.schema, 'historical schema'),
  activeTriggerDefinition(stableTripMigration, 'stable trip migration'),
  'active schema-3 binding trigger drifted in historical schema');
assert.equal(activeTriggerDefinition(documents.installer, 'security installer'),
  activeTriggerDefinition(stableTripMigration, 'stable trip migration'),
  'active schema-3 binding trigger drifted in security installer');

function tripConstraintContract(source, label) {
  const match = source.match(
    /alter table public\.observations\s+drop constraint if exists ravradar_observations_schema_version_check,[\s\S]*?comment on column public\.observations\.calibration_eligible is\s+'[^']*';/i,
  );
  assert.ok(match, `${label} is missing the complete schema-3 constraint contract`);
  return normalize(match[0]);
}
assert.equal(tripConstraintContract(documents.schema, 'historical schema'),
  tripConstraintContract(stableTripMigration, 'stable trip migration'),
  'schema-3 constraints drifted in historical schema');
assert.equal(tripConstraintContract(documents.installer, 'security installer'),
  tripConstraintContract(stableTripMigration, 'stable trip migration'),
  'schema-3 constraints drifted in security installer');
assert.match(documents.migration, /set local lock_timeout = '5s';/,
  'additive migration must fail boundedly if required function DDL locks are unavailable');
for (const forbidden of [
  /\bdrop\s+(?:trigger|constraint|index)\b/i,
  /\bcreate\s+(?:trigger|(?:unique\s+)?index)\b/i,
  /\balter\s+table\b/i,
  /\bnot\s+valid\b/i,
  /\bvalidate\s+constraint\b/i,
]) assert.doesNotMatch(documents.migration, forbidden,
  `additive migration must preserve installed trigger, indexes and constraint validation: ${forbidden}`);

for (const [label, source] of Object.entries({
  migration: stableTripMigration,
  schema: documents.schema,
  installer: documents.installer,
})) {
  assert.match(source,
    /revoke all on function public\.ravradar_trip_v3_score_quality_allowed\(\s*text, jsonb\s*\) from public, anon, authenticated;/i,
    `${label} exposes the immutable score-quality validator outside service_role`);
  assert.match(source,
    /grant execute on function public\.ravradar_trip_v3_score_quality_allowed\(\s*text, jsonb\s*\) to service_role;/i,
    `${label} does not grant the immutable score-quality validator to service_role`);
}

for (const [label, source] of Object.entries(documents)) {
  assert.match(source,
    /revoke all on function public\.ravradar_trip_v3_calibration_truth_allowed\(\s*text,\s*jsonb,\s*boolean,\s*text,\s*text,\s*text,\s*text\s*\) from public, anon, authenticated;/i,
    `${label} exposes the immutable calibration truth validator outside service_role`);
  assert.match(source,
    /grant execute on function public\.ravradar_trip_v3_calibration_truth_allowed\(\s*text,\s*jsonb,\s*boolean,\s*text,\s*text,\s*text,\s*text\s*\) to service_role;/i,
    `${label} does not grant the immutable calibration truth validator to service_role`);
  assert.match(source,
    /revoke all on function public\.ravradar_trip_v3_active_binding_admitted\([\s\S]*?from public, anon, authenticated;/i,
    `${label} exposes active schema-3 admission outside service_role`);
  assert.match(source,
    /grant execute on function public\.ravradar_trip_v3_active_binding_admitted\([\s\S]*?to service_role;/i,
    `${label} does not grant active schema-3 admission to service_role`);
}

for (const [label, source] of Object.entries(documents)) {
  const definition = functionDefinition(source, label);
  assert.match(definition, /stable\s+security definer\s+set search_path = pg_catalog, public/i,
    `${label} must keep the stable service-role metadata boundary`);
  assert.doesNotMatch(definition, /\b(?:from|join)\s+public\.observations\b/i,
    `${label} must never read observation rows`);
  assert.match(source, new RegExp(
    `revoke all on function ${FUNCTION_NAME.replaceAll('.', '\\.')}`
      + `[\\s\\S]*?from public, anon, authenticated;`,
    'i',
  ), `${label} must deny public/anon/authenticated RPC execution`);
  assert.match(source, new RegExp(
    `grant execute on function ${FUNCTION_NAME.replaceAll('.', '\\.')}`
      + `[\\s\\S]*?to service_role;`,
    'i',
  ), `${label} must grant the RPC only to service_role`);
}

assert.ok(documents.migration.indexOf("'20260829010000'")
  < documents.migration.indexOf("'20260829020000'")
  && documents.migration.indexOf("'20260829020000'")
    < documents.migration.indexOf("'20260901010000'"),
'metadata readback must preserve operational-runtime-before-trip-binding-before-warmup-admission order');

console.log('Integrated additive truth/admission/readback functions match schema and installer; stable trigger/privacy/constraints remain unchanged.');
