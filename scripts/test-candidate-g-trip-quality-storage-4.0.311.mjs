import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  applyCandidateGTripQualityMigration,
  assertCandidateGTripQualityConstraintRows,
  assertCandidateGTripQualityMigrationSql,
} from './apply-candidate-g-trip-quality-migration.mjs';
import { readProductionWorkflowSources } from './lib/production-workflow-sources.mjs';

const migration = fs.readFileSync('supabase/migrations/20260829_candidate_g_reconstructed_trip_exclusion.sql', 'utf8');
const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
const installer = fs.readFileSync('supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql', 'utf8');
const workflow = fs.readFileSync('.github/workflows/deploy-trip-storage.yml', 'utf8').replace(/\r\n/g, '\n');
const edgeVerification = fs.readFileSync('scripts/verify-trip-storage-edge.mjs', 'utf8');
const edgeNoWriteRetry = fs.readFileSync('scripts/lib/trip-storage-edge-readiness.mjs', 'utf8');
const edgeContractProbe = fs.readFileSync('supabase/functions/_shared/trip-storage-contract-probe.js', 'utf8');
const publicGateway = fs.readFileSync('supabase/functions/_shared/public-gateway.ts', 'utf8');
const {
  orchestrator: activeProductionOrchestrator,
  build: activeProductionBuild,
} = await readProductionWorkflowSources();
const workerVerification = fs.readFileSync('scripts/verify-cloudflare-trip-gateway.mjs', 'utf8');
const workerGateway = fs.readFileSync('cloudflare/trip-gateway/worker.js', 'utf8');
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
  definition: `CHECK (((schema_version = 1) OR ((schema_version = 2)
    AND calibration_eligible AND data_quality_flags IS NOT NULL
    AND actual_zone_id IS NOT NULL AND forecast_zone_id IS NOT NULL
    AND (jsonb_path_query_array(
      COALESCE((calibration_features -> 'reasonCodes'::text), '[]'::jsonb),
      '$[*]?((@ == "public-emergency-last-complete" || @ == "ravscore-reconstructed-derived-evidence") || @ == "ravscore-evidence-trust-unattested")'::jsonpath
    ) = COALESCE(data_quality_flags, '[]'::jsonb)))))`,
  constraint_comment: 'Trip v2 DEC-0109-v2: exact quality allowlist and canonical quality-reason order; reconstructed, public-emergency and legacy-unattested snapshots are always excluded from calibration.',
};
assert.equal(assertCandidateGTripQualityConstraintRows([verifiedConstraintRow]), true);
const rightParenthesizedConstraintRow = {
  ...verifiedConstraintRow,
  definition: verifiedConstraintRow.definition.replace(
    '((@ == "public-emergency-last-complete" || @ == "ravscore-reconstructed-derived-evidence") || @ == "ravscore-evidence-trust-unattested")',
    '(@ == "public-emergency-last-complete" || (@ == "ravscore-reconstructed-derived-evidence" || @ == "ravscore-evidence-trust-unattested"))',
  ),
};
assert.equal(assertCandidateGTripQualityConstraintRows([rightParenthesizedConstraintRow]), true,
  'Semantisk uvæsentlig PostgreSQL-parentesering må ikke afvise den forseglede canonical path.');
for (const decoyDefinition of [
  verifiedConstraintRow.definition.replace('jsonb_path_query_array(', 'evil_jsonb_path_query_array('),
  `${verifiedConstraintRow.definition.replace('jsonb_path_query_array(', 'coalesce(')}
    AND 'jsonb_path_query_array(''[]''::jsonb, ''$[*]?(@ == "public-emergency-last-complete" || @ == "ravscore-reconstructed-derived-evidence" || @ == "ravscore-evidence-trust-unattested")''::jsonpath)'::text <> ''`,
]) {
  assert.throws(() => assertCandidateGTripQualityConstraintRows([{
    ...verifiedConstraintRow,
    definition: decoyDefinition,
  }]), /canonical-reason-order/,
  'Kun et ægte, eksakt navngivet jsonb_path_query_array-kald uden for SQL-strengliteraler må attesteres.');
}
const reorderedConstraintRow = {
  ...verifiedConstraintRow,
  definition: verifiedConstraintRow.definition.replace(
    '((@ == "public-emergency-last-complete" || @ == "ravscore-reconstructed-derived-evidence") || @ == "ravscore-evidence-trust-unattested")',
    '((@ == "ravscore-reconstructed-derived-evidence" || @ == "public-emergency-last-complete") || @ == "ravscore-evidence-trust-unattested")',
  ),
};
assert.throws(() => assertCandidateGTripQualityConstraintRows([reorderedConstraintRow]), /canonical-reason-order/,
  'PostgreSQL-parenteser må tolereres, men den forseglede reason-code-rækkefølge må ikke ombyttes.');
for (const alteredLiteral of [
  'PUBLIC-EMERGENCY-LAST-COMPLETE',
  'public-emergency-last-complete ',
  ' public-emergency-last-complete',
]) {
  const inexactReasonConstraintRow = {
    ...verifiedConstraintRow,
    definition: verifiedConstraintRow.definition.replace(
      'public-emergency-last-complete',
      alteredLiteral,
    ),
  };
  assert.throws(() => assertCandidateGTripQualityConstraintRows([inexactReasonConstraintRow]), /canonical-reason-order/,
    'Reason-koder er case- og whitespace-følsomme og må ikke normaliseres inde i JSONPath-strengværdier.');
}
const duplicateReasonConstraintRow = {
  ...verifiedConstraintRow,
  definition: verifiedConstraintRow.definition.replace(
    '@ == "ravscore-evidence-trust-unattested")',
    '@ == "ravscore-evidence-trust-unattested" || @ == "ravscore-evidence-trust-unattested")',
  ),
};
assert.throws(() => assertCandidateGTripQualityConstraintRows([duplicateReasonConstraintRow]), /canonical-reason-order/,
  'En deparsertekst med dubleret canonical reason må ikke godkendes.');
for (const unexpectedPath of [
  '(@ == "unexpected" || (@ == "public-emergency-last-complete" || @ == "ravscore-reconstructed-derived-evidence") || @ == "ravscore-evidence-trust-unattested")',
  '((@ == "public-emergency-last-complete" || @ == "ravscore-reconstructed-derived-evidence") || @ == "ravscore-evidence-trust-unattested" || @ == "unexpected")',
]) {
  const extraPredicateConstraintRow = {
    ...verifiedConstraintRow,
    definition: verifiedConstraintRow.definition.replace(
      '((@ == "public-emergency-last-complete" || @ == "ravscore-reconstructed-derived-evidence") || @ == "ravscore-evidence-trust-unattested")',
      unexpectedPath,
    ),
  };
  assert.throws(() => assertCandidateGTripQualityConstraintRows([extraPredicateConstraintRow]), /canonical-reason-order/,
    'En ekstra predicate før eller efter den forseglede canonical path må ikke godkendes.');
}
const ambiguousCanonicalCallRow = {
  ...verifiedConstraintRow,
  definition: `${verifiedConstraintRow.definition} AND ${verifiedConstraintRow.definition.match(/jsonb_path_query_array\([\s\S]*?\n    \)/)?.[0]}`,
};
assert.throws(() => assertCandidateGTripQualityConstraintRows([ambiguousCanonicalCallRow]), /canonical-reason-order/,
  'Præcis ét jsonb_path-kald må binde alle tre canonical reasons.');
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
assert.ok(localHeadCheckCount >= mainFetchCount, 'Hver fetch-gate og den indledende checkout skal kontrollere lokal head.');
assert.equal(remoteHeadCheckCount, localHeadCheckCount, 'Lokal og remote exact-head skal altid kontrolleres som et par.');
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
assert.match(workflow, /apply-candidate-g-trip-quality-migration\.mjs\r?\n/);
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
assert.match(edgeVerification, /runTripStorageNoWriteContractProbe/);
assert.match(edgeVerification, /'trip-log-signed-login-response'/);
assert.match(edgeNoWriteRetry, /Object\.freeze\(\[0, 250, 750\]\)/);
assert.match(edgeNoWriteRetry, /Object\.freeze\(\[429, 502, 503, 504\]\)/);
assert.match(edgeNoWriteRetry, /assertRetrySafeDescriptor/);
assert.match(edgeNoWriteRetry, /TRIP_STORAGE_EDGE_SIGNED_LOGIN_PROBE_KIND/);
assert.match(edgeNoWriteRetry, /noWriteRequestDescriptor/);
assert.match(edgeNoWriteRetry, /tripGatewaySignature/);
assert.match(edgeNoWriteRetry, /TRIP_STORAGE_EDGE_WRITE_CAPABLE_RETRY_FORBIDDEN/);
assert.doesNotMatch(edgeNoWriteRetry, /\brequest\s*:/);
assert.match(edgeContractProbe, /signed-login-response-v1/);
assert.match(edgeContractProbe, /TRIP_STORAGE_SIGNED_LOGIN_METHOD = 'GET'/);
assert.match(edgeContractProbe, /hasBody !== false/);
assert.match(edgeNoWriteRetry, /url\.searchParams\.set\('_rr_trip_attestation'/);
assert.match(edgeNoWriteRetry, /cache: 'no-store'/);
assert.match(publicGateway, /request\.method !== "POST"[\s\S]*GatewayError\(405, "METHOD_NOT_ALLOWED"\)/);
assert.match(publicGateway, /throw new GatewayError\(401, TRIP_STORAGE_LOGIN_REQUIRED_CODE\)/);
const probeBranchIndex = tripLog.indexOf('const contractProbeHeader');
const normalJsonIndex = tripLog.indexOf('const payload = await readJsonObject');
const rateLimitIndex = tripLog.indexOf('await enforceRateLimits');
const authIndex = tripLog.indexOf('await requireAuthenticatedUserId');
const storageIndex = tripLog.indexOf('await listOwnTripObservations');
assert.ok(probeBranchIndex >= 0
  && probeBranchIndex < normalJsonIndex
  && normalJsonIndex < rateLimitIndex
  && rateLimitIndex < authIndex
  && authIndex < storageIndex);
const signedProbeBranch = tripLog.slice(probeBranchIndex, rateLimitIndex);
assert.match(signedProbeBranch, /verifyTripGatewaySignature/);
assert.match(signedProbeBranch, /tripStorageReadinessHeaders/);
assert.doesNotMatch(signedProbeBranch, /enforceRateLimits|requireAuthenticatedUserId|listOwnTripObservations/);
const readinessStart = activeProductionOrchestrator.indexOf('\n  trip-storage-readiness:');
const readinessEnd = activeProductionOrchestrator.indexOf('\n  build-and-prepare:', readinessStart);
assert.ok(readinessStart >= 0 && readinessEnd > readinessStart);
const readinessJob = activeProductionOrchestrator.slice(readinessStart, readinessEnd);
for (const marker of [
  'name: Check exact-head D1 trip-storage readiness',
  'name: Require checked-out HEAD to equal current origin/main',
  'name: Determine exact-head D1 trip-storage readiness without failing the run',
  'node scripts/verify-trip-storage-edge.mjs',
  'node scripts/verify-cloudflare-trip-gateway.mjs',
]) assert.ok(readinessJob.includes(marker), `Trip-storage-readiness-orkestratoren mangler ${marker}`);

const activeGateStart = activeProductionBuild.indexOf('name: Verify active trip-storage Edge and D1 read contracts without creating data');
const protectedWritesStart = activeProductionBuild.indexOf('name: Reconfirm current origin/main before protected writes and Pages artifact');
assert.ok(activeGateStart >= 0 && protectedWritesStart > activeGateStart);
const activeGate = activeProductionBuild.slice(activeGateStart, protectedWritesStart);
assert.match(activeGate, /node scripts\/verify-trip-storage-edge\.mjs/);
assert.match(activeGate, /node scripts\/verify-cloudflare-trip-gateway\.mjs/);
assert.match(activeGate, /CLOUDFLARE_TRIP_GATEWAY_URL: \$\{\{ secrets\.CLOUDFLARE_TRIP_GATEWAY_URL \}\}/);
assert.match(activeGate, /TRIP_GATEWAY_SHARED_SECRET: \$\{\{ secrets\.TRIP_GATEWAY_SHARED_SECRET \}\}/);
assert.doesNotMatch(activeGate.slice(0, activeGate.indexOf('env:')), /\$\{\{\s*secrets\./);
for (const marker of [
  'WORKER_COUNT_RETRY_DELAYS_MS = Object.freeze([0, 250, 750])',
  'WORKER_COUNT_TRANSIENT_HTTP_STATUSES = Object.freeze([429, 502, 503, 504])',
  "const WORKER_COUNT_METHOD = 'POST'",
  "const WORKER_COUNT_PATH = '/v1/trips/count'",
  "const WORKER_COUNT_BODY = '{}'",
  'runWorkerCountReadProbe',
  'nextWorkerCountTimestamp',
  'tripGatewaySignature',
  'response.status !== 200',
  'Object.keys(body).sort()',
  'body.trip_count >= 0',
  'discardWorkerCountResponse',
  "cache: 'no-store'",
]) assert.ok(workerVerification.includes(marker), `Worker-count-retry mangler kontraktmarkøren: ${marker}`);
const workerCountProbeParameters = workerVerification.match(
  /export async function runWorkerCountReadProbe\(\{([\s\S]*?)\}\) \{/,
)?.[1] || '';
assert.doesNotMatch(workerCountProbeParameters, /\b(?:route|path|body|request|descriptorFactory|requestFactory)\b/);
const workerCountFunction = workerGateway.match(
  /async function countTrips\(env\) \{[\s\S]*?(?=\nasync function deleteOwnerTrips)/,
)?.[0] || '';
assert.match(workerCountFunction, /select count\(\*\) as trip_count from trip_observations/i);
assert.doesNotMatch(workerCountFunction, /\b(?:insert|update|delete|replace|upsert|run)\b/i);
assert.match(workerGateway, /if \(url\.pathname === '\/v1\/trips\/count'\) \{[\s\S]*?return json\(503, \{ ok: false, error: 'COUNT_UNAVAILABLE' \}\);/);
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
