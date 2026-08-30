import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const sources = Object.freeze({
  migration: 'supabase/migrations/20260829020000_integrated_trip_calibration_binding.sql',
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
const definitions = Object.fromEntries(Object.entries(documents).map(([label, source]) => [
  label,
  normalize(functionDefinition(source, label)),
]));

assert.equal(definitions.schema, definitions.migration,
  'historical schema reference drifted from the versioned cutover RPC');
assert.equal(definitions.installer, definitions.migration,
  'security installer drifted from the versioned cutover RPC');

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
  ['public.ravradar_trip_v3_binding_allowed', documents.migration],
  ['public.ravradar_trip_v3_active_binding_admitted', documents.migration],
  ['public.ravradar_observation_require_active_v3_binding', documents.migration],
  ['public.ravradar_trip_payload_has_sensitive_key', documents.migration],
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

function activeTriggerDefinition(source, label) {
  const match = source.match(
    /create trigger ravradar_observations_active_v3_binding_trigger[\s\S]*?execute function public\.ravradar_observation_require_active_v3_binding\(\);/i,
  );
  assert.ok(match, `${label} is missing the active schema-3 binding trigger`);
  return normalize(match[0]);
}
assert.equal(activeTriggerDefinition(documents.schema, 'historical schema'),
  activeTriggerDefinition(documents.migration, 'versioned migration'),
  'active schema-3 binding trigger drifted in historical schema');
assert.equal(activeTriggerDefinition(documents.installer, 'security installer'),
  activeTriggerDefinition(documents.migration, 'versioned migration'),
  'active schema-3 binding trigger drifted in security installer');

function tripConstraintContract(source, label) {
  const match = source.match(
    /alter table public\.observations\s+drop constraint if exists ravradar_observations_schema_version_check,[\s\S]*?comment on column public\.observations\.calibration_eligible is\s+'[^']*';/i,
  );
  assert.ok(match, `${label} is missing the complete schema-3 constraint contract`);
  return normalize(match[0]);
}
assert.equal(tripConstraintContract(documents.schema, 'historical schema'),
  tripConstraintContract(documents.migration, 'versioned migration'),
  'schema-3 constraints drifted in historical schema');
assert.equal(tripConstraintContract(documents.installer, 'security installer'),
  tripConstraintContract(documents.migration, 'versioned migration'),
  'schema-3 constraints drifted in security installer');

for (const [label, source] of Object.entries(documents)) {
  assert.match(source,
    /revoke all on function public\.ravradar_trip_v3_score_quality_allowed\(\s*text, jsonb\s*\) from public, anon, authenticated;/i,
    `${label} exposes the immutable score-quality validator outside service_role`);
  assert.match(source,
    /grant execute on function public\.ravradar_trip_v3_score_quality_allowed\(\s*text, jsonb\s*\) to service_role;/i,
    `${label} does not grant the immutable score-quality validator to service_role`);
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
  < documents.migration.indexOf("'20260829020000'"),
'metadata readback must preserve operational-runtime-before-trip-binding order');

console.log('Integrated cutover RPC, privacy function and schema-3 constraints are identical in migration, schema and installer.');
