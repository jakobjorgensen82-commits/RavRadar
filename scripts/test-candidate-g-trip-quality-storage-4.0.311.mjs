import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  applyCandidateGTripQualityMigration,
  assertCandidateGTripQualityConstraintRows,
  assertCandidateGTripQualityMigrationSql,
} from './apply-candidate-g-trip-quality-migration.mjs';

const migration = fs.readFileSync('supabase/migrations/20260829_candidate_g_reconstructed_trip_exclusion.sql', 'utf8');
const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
const installer = fs.readFileSync('supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql', 'utf8');
const workflow = fs.readFileSync('.github/workflows/deploy-trip-storage.yml', 'utf8');
const edgeVerification = fs.readFileSync('scripts/verify-trip-storage-edge.mjs', 'utf8');
const publicRuntime = fs.readFileSync('js/services/trip-evidence-runtime.js', 'utf8');
const observationService = fs.readFileSync('js/services/observation-service.js', 'utf8');
const edgeTripStorage = fs.readFileSync('supabase/functions/_shared/trip-storage.js', 'utf8');
const edgeReadiness = fs.readFileSync('supabase/functions/_shared/trip-storage-readiness.ts', 'utf8');
const submitObservation = fs.readFileSync('supabase/functions/submit-observation/index.ts', 'utf8');
const tripLog = fs.readFileSync('supabase/functions/trip-log/index.ts', 'utf8');
const tripSchema = JSON.parse(fs.readFileSync('docs/research/trip-evidence-v2.schema.json', 'utf8'));

assert.equal(assertCandidateGTripQualityMigrationSql(migration), true);
const verifiedConstraintRow = {
  convalidated: true,
  definition: 'check schema_version = 1 or schema_version = 2 and calibration_eligible data_quality_flags actual_zone_id forecast_zone_id jsonb_path_query_array @ == "public-emergency-last-complete" || @ == "ravscore-reconstructed-derived-evidence" || @ == "ravscore-evidence-trust-unattested"',
  constraint_comment: 'Trip v2 DEC-0109-v2: exact quality allowlist and canonical quality-reason order; reconstructed, public-emergency and legacy-unattested snapshots are always excluded from calibration.',
};
assert.equal(assertCandidateGTripQualityConstraintRows([verifiedConstraintRow]), true);
assert.throws(() => assertCandidateGTripQualityConstraintRows([{
  convalidated: false,
  definition: 'calibration_eligible data_quality_flags actual_zone_id forecast_zone_id jsonb_path_query_array public-emergency-last-complete ravscore-reconstructed-derived-evidence ravscore-evidence-trust-unattested',
  constraint_comment: verifiedConstraintRow.constraint_comment,
}]), /NOT_VALIDATED/);
assert.throws(() => assertCandidateGTripQualityConstraintRows([{
  convalidated: true,
  definition: 'check calibration_eligible data_quality_flags actual_zone_id forecast_zone_id jsonb_path_query_array public-emergency-last-complete ravscore-reconstructed-derived-evidence ravscore-evidence-trust-unattested',
  constraint_comment: 'Trip v2: exact DEC-0109 quality allowlist; reconstructed, public-emergency and legacy-unattested snapshots are always excluded from calibration and bound to matching reason codes.',
}]), /MARKER_MISSING|COMMENT_MISMATCH/);

const block = sql => sql.match(/alter table public\.observations\s+drop constraint if exists ravradar_observations_trip_v2_check;[\s\S]*?comment on constraint ravradar_observations_trip_v2_check[\s\S]*?;\s*/i)?.[0]
  .replace(/\s+/g, ' ').trim();
assert.ok(block(migration));
assert.equal(block(schema), block(migration));
assert.equal(block(installer), block(migration));
for (const sql of [migration, schema, installer]) {
  assert.match(sql, /schema_version\s*=\s*1\s+or\s*\(schema_version\s*=\s*2\s+and/i);
  assert.match(sql, /\["public-emergency-last-complete","ravscore-reconstructed-derived-evidence"\]/);
  assert.doesNotMatch(sql, /\["ravscore-reconstructed-derived-evidence","public-emergency-last-complete"\]/);
  assert.match(sql, /jsonb_path_query_array\([\s\S]*?public-emergency-last-complete[\s\S]*?ravscore-reconstructed-derived-evidence[\s\S]*?ravscore-evidence-trust-unattested[\s\S]*?\)\s*=\s*coalesce\(data_quality_flags/);
  assert.match(sql, /validate constraint ravradar_observations_trip_v2_check/);
}

assert.ok(tripSchema.required.includes('dataQualityFlags'));
assert.equal(tripSchema.properties.dataQualityFlags.oneOf.length, 5);
assert.match(JSON.stringify(tripSchema), /public-emergency-last-complete/);
assert.match(JSON.stringify(tripSchema), /ravscore-reconstructed-derived-evidence/);
assert.match(JSON.stringify(tripSchema), /ravscore-evidence-trust-unattested/);

assert.match(workflow, /Require the exact main head/);
assert.match(workflow, /run-name: "Deploy RavRadar trip storage \[d1\]"/);
const mainFetchCount = (workflow.match(/git fetch --no-tags --prune origin \+refs\/heads\/main:refs\/remotes\/origin\/main/g) || []).length;
const localHeadCheckCount = (workflow.match(/test "\$\(git rev-parse HEAD\^\{commit\}\)" = "\$EXPECTED_HEAD_SHA"/g) || []).length;
const remoteHeadCheckCount = (workflow.match(/test "\$\(git rev-parse origin\/main\^\{commit\}\)" = "\$EXPECTED_HEAD_SHA"/g) || []).length;
assert.ok(mainFetchCount >= 16, `Expected repeated exact-main CAS gates, got ${mainFetchCount}`);
assert.equal(localHeadCheckCount, mainFetchCount);
assert.equal(remoteHeadCheckCount, mainFetchCount);
for (const gate of [
  'Reconfirm current origin/main before the Candidate G database contract',
  'Reconfirm current origin/main before D1 schema and phase inspection',
  'Reconfirm current origin/main before maintenance-capable Edge predeployment',
  'Reconfirm current origin/main immediately before the public mode family',
  'Reconfirm current origin/main before quiesced Cloudflare Worker replacement',
  'Reconfirm current origin/main before the first Supabase to D1 synchronization',
  'Reconfirm current origin/main before a genuinely fresh D1 activation',
  'Reconfirm current origin/main immediately before normal D1 mode',
  'Reconfirm current origin/main immediately before final reconciliation',
  'Reconfirm exact main before any failure-recovery mutation',
  'Reconfirm exact main before restored fresh-Supabase Edge deployment',
  'Reconfirm exact main before failure roll-forward D1 phase persistence',
  'Reconfirm exact main before maintenance-capable failure Edge predeployment',
  'Reconfirm exact main before failure roll-forward expiring maintenance',
  'Reconfirm exact main immediately before failure Worker replacement',
  'Reconfirm exact main before failure D1 secret and Edge deployment',
  'Reconfirm exact main immediately before failure roll-forward reconciliation',
]) assert.ok(workflow.includes(gate), `Missing exact-main gate: ${gate}`);
assert.match(workflow, /apply-candidate-g-trip-quality-migration\.mjs\n/);
assert.match(workflow, /apply-candidate-g-trip-quality-migration\.mjs --verify-only/);
assert.ok(workflow.indexOf('Validate exact source head before external writes')
  < workflow.indexOf('Reconfirm current origin/main before the Candidate G database contract'));
assert.ok(workflow.indexOf('Reconfirm current origin/main before the Candidate G database contract')
  < workflow.indexOf('Atomically apply and verify the Candidate G trip-quality contract'));
assert.ok(workflow.indexOf('Atomically apply and verify the Candidate G trip-quality contract')
  < workflow.indexOf('Prepare ten EU-restricted D1 shards, schema and durable phase'));
assert.ok(workflow.indexOf('Prepare ten EU-restricted D1 shards, schema and durable phase')
  < workflow.indexOf('Require safe D1 storage headroom'));
assert.ok(workflow.indexOf('Require safe D1 storage headroom')
  < workflow.indexOf('Record current-run existing-D1 Edge predeployment intent'));
assert.ok(workflow.indexOf('Record current-run existing-D1 Edge predeployment intent')
  < workflow.indexOf('Deploy exact maintenance-capable Edge functions while Worker and mode stay unchanged'));
assert.ok(workflow.indexOf('Deploy exact maintenance-capable Edge functions while Worker and mode stay unchanged')
  < workflow.indexOf('Attest both exact Edge boundaries in unchanged D1 mode before leasing maintenance'));
assert.ok(workflow.indexOf('Attest both exact Edge boundaries in unchanged D1 mode before leasing maintenance')
  < workflow.indexOf('Record current-run D1 repair intent immediately before quiescence'));
assert.ok(workflow.indexOf('Record current-run D1 repair intent immediately before quiescence')
  < workflow.indexOf('Enter fail-closed expiring maintenance for every existing D1 installation'));
assert.ok(workflow.indexOf('Enter fail-closed expiring maintenance for every existing D1 installation')
  < workflow.indexOf('Attest both Edge boundaries in fail-closed maintenance'));
assert.ok(workflow.indexOf('Attest both Edge boundaries in fail-closed maintenance')
  < workflow.indexOf('Drain every bounded request from the preceding Edge generation'));
assert.ok(workflow.indexOf('Drain every bounded request from the preceding Edge generation')
  < workflow.indexOf('Install deploy and attest the private D1 gateway after Edge quiescence'));
assert.ok(workflow.indexOf('Install deploy and attest the private D1 gateway after Edge quiescence')
  < workflow.indexOf('Idempotently synchronize existing Supabase trips into D1'));
assert.ok(workflow.indexOf('Idempotently synchronize existing Supabase trips into D1')
  < workflow.indexOf('Record local fail-closed intent before a genuinely fresh D1 marker'));
assert.ok(workflow.indexOf('Record local fail-closed intent before a genuinely fresh D1 marker')
  < workflow.indexOf('Persist the point of no return immediately before fresh D1 activation'));
assert.ok(workflow.indexOf('Persist the point of no return immediately before fresh D1 activation')
  < workflow.indexOf('Activate normal Cloudflare D1 mode after verified Worker readiness'));
assert.ok(workflow.indexOf('Activate normal Cloudflare D1 mode after verified Worker readiness')
  < workflow.indexOf('Attest both Edge write and read boundaries in live D1 mode before final reconciliation'));
assert.ok(workflow.indexOf('Attest both Edge write and read boundaries in live D1 mode before final reconciliation')
  < workflow.indexOf('Drain the last bounded pre-D1 requests before final reconciliation'));
assert.ok(workflow.indexOf('Drain the last bounded pre-D1 requests before final reconciliation')
  < workflow.indexOf('Reconfirm current origin/main immediately before final reconciliation'));
assert.ok(workflow.indexOf('Reconfirm current origin/main immediately before final reconciliation')
  < workflow.indexOf('Reconcile every trip written before both Edge boundaries attested D1'));
assert.ok(workflow.indexOf('Reconcile every trip written before both Edge boundaries attested D1')
  < workflow.indexOf('Reverify both public Edge boundaries in live D1 mode'));
assert.match(workflow, /Restore Supabase only for a proven fresh pre-activation installation[\s\S]*?steps\.prepare_d1\.outcome == 'success'[\s\S]*?steps\.fresh_edge_predeploy_intent\.outputs\.edge_predeploy_intent == 'true'[\s\S]*?steps\.activation_intent\.outputs\.d1_activation_intent != 'true'/);
assert.match(workflow, /Persist or reconfirm the D1 boundary during failure roll-forward[\s\S]*?Preserve D1 after the point of no return and repair forward/);
assert.match(edgeReadiness, /X-RavRadar-Trip-Contract-Version/);
assert.match(edgeReadiness, /X-RavRadar-Trip-Storage-Mode/);
assert.match(submitObservation, /tripStorageReadinessHeaders\(request\)/);
assert.match(tripLog, /tripStorageReadinessHeaders\(request\)/);
assert.match(edgeVerification, /for \(const functionName of \['submit-observation', 'trip-log'\]\)/);
assert.match(edgeVerification, /TRIP_CALIBRATION_ELIGIBILITY_INVALID/);
assert.match(edgeVerification, /TRIP_DATA_QUALITY_FLAGS_INVALID/);
assert.match(publicRuntime, /forecastCalibrationEligible: prepared\.forecastCalibrationEligible/);
assert.match(publicRuntime, /dataQualityFlags: prepared\.dataQualityFlags/);
assert.match(observationService, /assertObservationTripQualityBinding\(columns\)/);
assert.match(observationService, /data_quality_flags:columns\.data_quality_flags/);
assert.doesNotMatch(observationService, /data_quality_flags:Array\.isArray\(columns\.data_quality_flags\).*\[\]/);
assert.match(observationService, /migrateLegacyUnattestedObservationColumns/);
assert.match(edgeTripStorage, /normalizeExternalTripQualityBinding/);
assert.doesNotMatch(edgeTripStorage, /key === 'data_quality_flags'.*value\.length === 0/);
assert.match(submitObservation, /normalizeExternalTripQualityBinding\(await readJsonObject/);
assert.match(submitObservation, /assertNoPrivateLocation\(payload\.weather_snapshot\)/);
assert.match(submitObservation, /assertNoPrivateLocation\(payload\.calibration_features\)/);
assert.match(submitObservation, /assertExternalTripNestedContract\(payload\)/);
assert.match(edgeTripStorage, /PRIVATE_LOCATION_KEY_PATTERN/);
assert.match(edgeTripStorage, /assertNoPrivateLocation\(external\)/);
assert.match(edgeTripStorage, /assertExternalTripNestedContract\(external\)/);

const originalFetch = globalThis.fetch;
try {
  const existingCalls = [];
  globalThis.fetch = async (url, init) => {
    existingCalls.push({ url, body: JSON.parse(init.body) });
    return new Response(JSON.stringify([verifiedConstraintRow]), { status: 201 });
  };
  const existing = await applyCandidateGTripQualityMigration({ accessToken: 'test-management-token' });
  assert.equal(existing.status, 'already-current');
  assert.equal(existingCalls.length, 1);
  assert.equal(existingCalls[0].body.read_only, true);

  const applyCalls = [];
  globalThis.fetch = async (url, init) => {
    const call = { url, body: JSON.parse(init.body) };
    applyCalls.push(call);
    const responseBody = applyCalls.length === 1 ? [] : applyCalls.length === 2 ? [] : [verifiedConstraintRow];
    return new Response(JSON.stringify(responseBody), { status: 201 });
  };
  const applied = await applyCandidateGTripQualityMigration({ accessToken: 'test-management-token' });
  assert.equal(applied.status, 'applied-and-verified');
  assert.equal(applyCalls.length, 3);
  assert.equal(applyCalls[0].body.read_only, true);
  assert.equal(applyCalls[1].body.read_only, false);
  assert.match(applyCalls[1].body.query, /begin;[\s\S]*commit;/);
  assert.equal(applyCalls[2].body.read_only, true);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Candidate G trip-quality storage: client, Edge, D1, Supabase SQL og deploy-verifikation består.');
