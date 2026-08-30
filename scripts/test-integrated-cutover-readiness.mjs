#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  ASSISTANT_BINDING_HEADERS,
  REQUIRED_CUTOVER_MIGRATIONS,
  assertSealedIntegratedCutoverReadiness,
  assertSupabaseMigrationPlan,
  assertSupabaseMigrationsApplied,
  buildIntegratedCutoverReadiness,
  checkIntegratedCutoverReadiness,
  checkSealedIntegratedCutoverReadiness,
  expectedAssistantBinding,
  expectedTripActiveAdmissionPolicy,
  expectedTripBindingPolicy,
  hydrateTemporaryRemoteMigrationHistory,
  inspectMigrationSources,
  parseSupabaseMigrationList,
  publishIntegratedCutoverReadiness,
  prepareTemporarySupabaseCutoverWorkdir,
  verifyIntegratedAssistantEdge,
  verifyIntegratedDatabaseReadback,
  verifyTripStorageEdgeBoundaries,
} from './integrated-cutover-readiness.mjs';

const SOURCE_HEAD = 'a'.repeat(40);
const PUBLIC_IMPLEMENTATION_CLOSURE_SHA256 = 'c'.repeat(64);
const URL = 'https://project.example';
const SERVICE_KEY = 'sb_secret_test_only';
const PUBLISHABLE_KEY = 'sb_publishable_test_only';

await inspectMigrationSources();

const integratedMigration = await fs.readFile(
  'supabase/migrations/20260829020000_integrated_trip_calibration_binding.sql',
  'utf8',
);
for (const marker of [
  'create or replace function public.ravradar_integrated_cutover_contract(',
  'from supabase_migrations.schema_migrations m',
  "where m.version::text in ('20260829010000', '20260829020000')",
  "c.conname = 'ravradar_observations_trip_v3_check'",
  'create or replace function public.ravradar_trip_v3_binding_allowed(',
  'create or replace function public.ravradar_trip_v3_active_binding_admitted(',
  'create trigger ravradar_observations_active_v3_binding_trigger',
  "'bindingGateCalledExactlyOnce'",
  "'candidateGRollbackBindingPresent'",
  "'unknownModelBindingRejected'",
  "'tripBindingPolicy'",
  "'bindingPolicyDefinitionPresent'",
  "'exactModelBindingPresent'",
  'revoke all on function public.ravradar_integrated_cutover_contract(',
  ') from public, anon, authenticated;',
  'grant execute on function public.ravradar_integrated_cutover_contract(',
  ') to service_role;',
  'reads no observation rows.',
]) assert.ok(integratedMigration.includes(marker), `integrated migration metadata RPC is missing ${marker}`);
const rpcSql = integratedMigration.slice(integratedMigration.indexOf('create or replace function public.ravradar_integrated_cutover_contract('));
assert.doesNotMatch(rpcSql, /\bfrom\s+public\.observations\b/i,
  'integrated cutover RPC must not read observation rows');
assert.doesNotMatch(rpcSql, /\bselect\s+\*\b/i,
  'integrated cutover RPC must not expose broad table data');

const workflow = await fs.readFile('.github/workflows/deploy-trip-storage.yml', 'utf8');
for (const marker of [
  'git rev-parse origin/main',
  'node scripts/integrated-cutover-readiness.mjs assert-source',
  'SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}',
  'node scripts/integrated-cutover-readiness.mjs prepare-workdir',
  'supabase migration list --linked',
  'supabase db push --linked --dry-run',
  'node scripts/integrated-cutover-readiness.mjs plan',
  'Reverify exact main immediately before the first external write',
  'supabase db push --linked',
  'node scripts/integrated-cutover-readiness.mjs applied',
  'node scripts/integrated-cutover-readiness.mjs verify-db',
  'supabase functions deploy --project-ref "$SUPABASE_PROJECT_ID"',
  'RAVRADAR_REQUIRE_INTEGRATED_BINDING: "true"',
  'node scripts/integrated-cutover-readiness.mjs publish',
]) assert.ok(workflow.includes(marker), `backend cutover workflow is missing ${marker}`);
const workflowOrder = [
  'npm run validate:source',
  'node scripts/integrated-cutover-readiness.mjs prepare-workdir',
  'supabase db push --linked --dry-run',
  'node scripts/integrated-cutover-readiness.mjs plan',
  'Reverify exact main immediately before the first external write',
  'supabase db push --linked)',
  'node scripts/integrated-cutover-readiness.mjs verify-db',
  'supabase functions deploy --project-ref "$SUPABASE_PROJECT_ID"',
  'node scripts/verify-trip-storage-edge.mjs',
  'node scripts/integrated-cutover-readiness.mjs publish',
];
for (let index = 1; index < workflowOrder.length; index += 1) {
  assert.ok(workflow.indexOf(workflowOrder[index - 1]) < workflow.indexOf(workflowOrder[index]),
    `backend cutover order is unsafe: ${workflowOrder[index - 1]} must precede ${workflowOrder[index]}`);
}
for (const forbidden of ['continue-on-error', 'supabase migration repair', 'supabase db reset', '--include-all']) {
  assert.equal(workflow.includes(forbidden), false, `backend cutover workflow contains forbidden bypass: ${forbidden}`);
}
assert.equal((workflow.match(/integrated-cutover-readiness\.mjs publish/g) || []).length, 1,
  'protected readiness must have one final publisher');
assert.equal((workflow.match(/git fetch --no-tags --depth=1 origin \+refs\/heads\/main:refs\/remotes\/origin\/main/g) || []).length, 2,
  'backend cutover must reverify main once after checkout and again immediately before its first write');

const unicodeList = `
       LOCAL       │      REMOTE      │ TIME (UTC)
───────────────────┼──────────────────┼──────────────────────
 20260826          │ 20260826         │ 2026-08-26 00:00:00
 20260829010000    │ 20260829010000   │ 2026-08-29 01:00:00
 20260829020000    │                  │ 2026-08-29 02:00:00
`;
assert.deepEqual(parseSupabaseMigrationList(unicodeList), [
  { local: '20260826', remote: '20260826' },
  { local: '20260829010000', remote: '20260829010000' },
  { local: '20260829020000', remote: null },
]);

const plan = await assertSupabaseMigrationPlan({
  migrationListText: unicodeList,
  dryRunText: 'DRY RUN: 20260829020000_integrated_trip_calibration_binding.sql',
});
assert.deepEqual(plan.pendingVersions, ['20260829020000']);
assert.deepEqual(plan.alreadyAppliedVersions, ['20260829010000']);

await assert.rejects(
  assertSupabaseMigrationPlan({
    migrationListText: `${unicodeList}\n 20260823 │ │ 2026-08-23 00:00:00`,
    dryRunText: 'DRY RUN: 20260823_account_trip_log_contract.sql 20260829010000',
  }),
  /unexpected pending migrations: 20260823/,
);
await assert.rejects(
  assertSupabaseMigrationPlan({
    migrationListText: unicodeList,
    dryRunText: 'DRY RUN: no named migration',
  }),
  /did not name pending required migration/,
);
await assert.rejects(
  assertSupabaseMigrationPlan({
    migrationListText: `
      LOCAL | REMOTE | TIME
      20260829010000 | | pending
      20260829020000 | 20260829020000 | applied
    `,
    dryRunText: 'DRY RUN: 20260829010000_ravscore_operational_documents_no_history.sql',
  }),
  /migration order is inconsistent/,
);

const appliedList = `
 LOCAL | REMOTE | TIME
 20260826 | 20260826 | old
 20260829010000 | 20260829010000 | now
 20260829020000 | 20260829020000 | now
`;
assert.deepEqual(assertSupabaseMigrationsApplied(appliedList).appliedVersions,
  REQUIRED_CUTOVER_MIGRATIONS.map(item => item.version));
assert.throws(() => assertSupabaseMigrationsApplied(unicodeList), /was not recorded remotely/);

const duplicateDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-cutover-migrations-'));
try {
  await Promise.all([
    fs.writeFile(path.join(duplicateDirectory, '20260829010000_ravscore_operational_documents_no_history.sql'), '-- test\n'),
    fs.writeFile(path.join(duplicateDirectory, '20260829010000_duplicate.sql'), '-- test\n'),
    fs.writeFile(path.join(duplicateDirectory, '20260829020000_integrated_trip_calibration_binding.sql'), '-- test\n'),
  ]);
  await assert.rejects(inspectMigrationSources({ migrationsDirectory: duplicateDirectory }), /duplicate Supabase migration version/);
} finally {
  await fs.rm(duplicateDirectory, { recursive: true, force: true });
}

const isolatedWorkdir = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-cutover-workdir-'));
try {
  const prepared = await prepareTemporarySupabaseCutoverWorkdir({ workdir: isolatedWorkdir });
  assert.deepEqual((await fs.readdir(prepared.migrationsDirectory)).sort(),
    REQUIRED_CUTOVER_MIGRATIONS.map(item => item.filename).sort());
  const initialRemoteHistory = `
 LOCAL │ REMOTE │ TIME
       │ 20260823 │ historical
 20260829010000 │ │ pending
 20260829020000 │ │ pending
 `;
  const hydrated = await hydrateTemporaryRemoteMigrationHistory({
    workdir: isolatedWorkdir,
    migrationListText: initialRemoteHistory,
  });
  assert.deepEqual(hydrated.placeholders, ['20260823_remote_applied_history_placeholder.sql']);
  assert.match(await fs.readFile(path.join(prepared.migrationsDirectory, hydrated.placeholders[0]), 'utf8'),
    /contains no executable SQL/);
  await assert.rejects(hydrateTemporaryRemoteMigrationHistory({
    workdir: isolatedWorkdir,
    migrationListText: `
      LOCAL │ REMOTE │ TIME
      │ 20260830 │ future
      20260829010000 │ │ pending
      20260829020000 │ │ pending
    `,
  }), /unknown post-cutover migration 20260830/);
} finally {
  await fs.rm(isolatedWorkdir, { recursive: true, force: true });
}

const readiness = await buildIntegratedCutoverReadiness(SOURCE_HEAD, {
  publicImplementationClosureSha256: PUBLIC_IMPLEMENTATION_CLOSURE_SHA256,
});
assert.deepEqual(Object.keys(readiness), [
  'schemaVersion',
  'sourceHead',
  'modelContractSha256',
  'modelBundleSha256',
  'publicImplementationClosureSha256',
  'migrationIds',
  'tripSchemaVersion',
  'tripBindingPolicyId',
  'tripBindingPolicySha256',
  'tripActiveAdmissionPolicyId',
  'tripActiveAdmissionPolicySha256',
  'modelBinding',
  'candidateModelBinding',
  'centralProfile',
  'assistantBinding',
]);
assert.equal(readiness.sourceHead, SOURCE_HEAD);
assert.equal(readiness.tripSchemaVersion, 3);
assert.equal(readiness.tripBindingPolicyId,
  'ravradar-trip-v3-exact-integrated-candidate-g-emergency-v2');
assert.match(readiness.tripBindingPolicySha256, /^[a-f0-9]{64}$/);
assert.equal(readiness.tripActiveAdmissionPolicyId,
  'ravradar-trip-v3-exact-operational-active-reasons-v2');
assert.match(readiness.tripActiveAdmissionPolicySha256, /^[a-f0-9]{64}$/);
assert.equal(readiness.modelContractSha256, readiness.modelBinding.modelContractSha256);
assert.equal(readiness.modelBundleSha256, readiness.modelBinding.modelBundleSha256);
assert.equal(readiness.publicImplementationClosureSha256,
  PUBLIC_IMPLEMENTATION_CLOSURE_SHA256);
assert.equal(readiness.centralProfile.modelBundleSha256, readiness.modelBinding.modelBundleSha256);
assert.equal(readiness.centralProfile.sourceVersion,
  JSON.parse(await fs.readFile('data/admin/ravscore-profile-selection.json', 'utf8')).sourceVersion);
assertSealedIntegratedCutoverReadiness(readiness);
assert.throws(() => assertSealedIntegratedCutoverReadiness({
  ...readiness,
  centralProfile: { ...readiness.centralProfile, hiddenFallback: true },
}), /exact key set/);
assert.throws(() => assertSealedIntegratedCutoverReadiness({
  ...readiness,
  modelBinding: { ...readiness.modelBinding, modelBundleSha256: '0'.repeat(64) },
}), /strictly equal|modelBundle/);
assert.equal(readiness.assistantBinding.modelContractSha256, readiness.modelContractSha256);
assert.equal(readiness.assistantBinding.modelBundleSha256, readiness.modelBundleSha256);
assert.deepEqual(readiness.migrationIds, REQUIRED_CUTOVER_MIGRATIONS.map(item => item.id));
assert.doesNotMatch(JSON.stringify(readiness), /(?:coordinate|latitude|longitude|currentU|currentV|payloadRow)/i);
await assert.rejects(buildIntegratedCutoverReadiness('short', {
  publicImplementationClosureSha256: PUBLIC_IMPLEMENTATION_CLOSURE_SHA256,
}), /exact 40-character Git SHA/);

const expectedPolicy = await expectedTripBindingPolicy();
const expectedActiveAdmissionPolicy = await expectedTripActiveAdmissionPolicy();
const databaseReadback = {
  schemaVersion: 'ravscore-integrated-cutover-db-v1',
  tripSchemaVersion: 3,
  appliedMigrationVersions: REQUIRED_CUTOVER_MIGRATIONS.map(item => item.version),
  tripBindingPolicy: {
    id: expectedPolicy.id,
    definition: expectedPolicy.definition,
  },
  tripActiveAdmissionPolicy: {
    id: expectedActiveAdmissionPolicy.id,
    definition: expectedActiveAdmissionPolicy.definition,
    triggerFunctionDefinition: expectedActiveAdmissionPolicy.triggerFunctionDefinition,
    triggerDefinition: 'CREATE TRIGGER ravradar_observations_active_v3_binding_trigger BEFORE INSERT OR UPDATE OF schema_version ON public.observations FOR EACH ROW EXECUTE FUNCTION ravradar_observation_require_active_v3_binding()',
  },
  checks: {
    schemaVersionConstraintPresent: true,
    dataQualityConstraintPresent: true,
    nestedPrivacyConstraintPresent: true,
    tripV3ConstraintPresent: true,
    tripV3ConstraintValidatedAgainstHistoricalRows: false,
    tripIdIndexPresent: true,
    bindingPolicyDefinitionPresent: true,
    activeBindingAdmissionDefinitionPresent: true,
    activeBindingTriggerPresent: true,
    activeBindingTriggerCallsGateExactlyOnce: true,
    bindingGateCalledExactlyOnce: true,
    integratedModelBindingPresent: true,
    candidateGRollbackBindingPresent: true,
    unknownModelBindingRejected: true,
    exactModelBindingPresent: true,
  },
};

let rpcRequestBody = null;
await verifyIntegratedDatabaseReadback({
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  fetchImpl: async (requestUrl, options) => {
    assert.equal(requestUrl, `${URL}/rest/v1/rpc/ravradar_integrated_cutover_contract`);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.apikey, SERVICE_KEY);
    assert.equal(options.headers.Authorization, undefined, 'sb_secret_ keys must not be translated to bearer JWTs');
    rpcRequestBody = JSON.parse(options.body);
    return new Response(JSON.stringify(databaseReadback), { status: 200 });
  },
});
assert.deepEqual(Object.keys(rpcRequestBody).sort(), [
  'p_best_time_policy_id',
  'p_candidate_best_time_policy_id',
  'p_candidate_component_schema_id',
  'p_candidate_explanation_schema_id',
  'p_candidate_model_bundle_sha256',
  'p_candidate_model_contract_sha256',
  'p_candidate_model_id',
  'p_candidate_presentation_policy_id',
  'p_candidate_profile_id',
  'p_candidate_ranking_policy_id',
  'p_candidate_state_schema_version',
  'p_candidate_variant_id',
  'p_component_schema_id',
  'p_explanation_schema_id',
  'p_model_bundle_sha256',
  'p_model_contract_sha256',
  'p_model_id',
  'p_presentation_policy_id',
  'p_profile_id',
  'p_ranking_policy_id',
  'p_state_schema_version',
  'p_variant_id',
]);

const expectedAssistant = await expectedAssistantBinding();
function assistantResponseHeaders({ includeBinding = true, partial = false, mismatch = false } = {}) {
  const headers = new Headers({
    'access-control-allow-origin': 'https://ravradar.dk',
  });
  if (includeBinding) {
    const values = {
      [ASSISTANT_BINDING_HEADERS.modelId]: mismatch ? 'wrong-model' : expectedAssistant.modelId,
      [ASSISTANT_BINDING_HEADERS.stateSchemaVersion]: expectedAssistant.stateSchemaVersion,
      [ASSISTANT_BINDING_HEADERS.modelContractSha256]: expectedAssistant.modelContractSha256,
      [ASSISTANT_BINDING_HEADERS.modelBundleSha256]: expectedAssistant.modelBundleSha256,
      [ASSISTANT_BINDING_HEADERS.knowledgeSchema]: expectedAssistant.knowledgeSchema,
      [ASSISTANT_BINDING_HEADERS.knowledgeSha256]: expectedAssistant.knowledgeSha256,
    };
    for (const [name, value] of Object.entries(values)) {
      if (!partial || name === ASSISTANT_BINDING_HEADERS.modelId) headers.set(name, value);
    }
    headers.set('access-control-expose-headers', Object.keys(values).join(', '));
  }
  return headers;
}

function assistantFetch({ includeBinding = true, partial = false, mismatch = false } = {}) {
  return async (_url, options) => {
    if (options.headers.origin === 'https://example.invalid') return new Response(null, { status: 403 });
    if (options.method === 'POST') {
      const supplied = JSON.parse(options.body)?.context?.modelBinding;
      const exact = supplied && JSON.stringify(supplied) === JSON.stringify(readiness.modelBinding);
      return new Response(JSON.stringify(exact
        ? { answer: 'Det spørgsmål ligger uden for RavRadar.' }
        : { error: 'MODEL_BINDING_MISMATCH' }), {
        status: exact ? 200 : 409,
        headers: assistantResponseHeaders({ includeBinding, partial, mismatch }),
      });
    }
    return new Response(null, {
      status: 204,
      headers: assistantResponseHeaders({ includeBinding, partial, mismatch }),
    });
  };
}

assert.equal((await verifyIntegratedAssistantEdge({
  url: URL,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: assistantFetch(),
})).bindingPresent, true);
assert.equal((await verifyIntegratedAssistantEdge({
  url: URL,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: assistantFetch({ includeBinding: false }),
  requireBinding: false,
})).bindingPresent, false);
await assert.rejects(verifyIntegratedAssistantEdge({
  url: URL,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: assistantFetch({ includeBinding: false }),
}), /did not return the required/);
await assert.rejects(verifyIntegratedAssistantEdge({
  url: URL,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: assistantFetch({ partial: true }),
}), /partial model\/knowledge binding/);
await assert.rejects(verifyIntegratedAssistantEdge({
  url: URL,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: assistantFetch({ mismatch: true }),
}), /header mismatch/);

function fullCutoverFetch({ existingReadiness = null, database = databaseReadback } = {}) {
  const calls = [];
  let stored = existingReadiness;
  const fetchImpl = async (requestUrl, options = {}) => {
    const method = options.method || 'GET';
    calls.push({ requestUrl, method });
    if (requestUrl.endsWith('/rest/v1/rpc/ravradar_integrated_cutover_contract')) {
      return new Response(JSON.stringify(database), { status: 200 });
    }
    if (requestUrl.includes('/functions/v1/trip-log') || requestUrl.includes('/functions/v1/submit-observation')) {
      if (method === 'OPTIONS') {
        if (options.headers.origin === 'https://example.invalid') return new Response(null, { status: 403 });
        return new Response(null, {
          status: 204,
          headers: { 'access-control-allow-origin': 'https://ravradar.dk' },
        });
      }
      if (requestUrl.includes('/trip-log')) {
        return new Response(JSON.stringify({ error: 'LOGIN_REQUIRED' }), { status: 401 });
      }
      return new Response(JSON.stringify({ error: 'INVALID_REQUEST' }), { status: 400 });
    }
    if (requestUrl.includes(`/functions/v1/ravradar-assistant`)) {
      if (options.headers.origin === 'https://example.invalid') return new Response(null, { status: 403 });
      if (method === 'POST') {
        const supplied = JSON.parse(options.body)?.context?.modelBinding;
        const exact = supplied && JSON.stringify(supplied) === JSON.stringify(readiness.modelBinding);
        return new Response(JSON.stringify(exact
          ? { answer: 'Det spørgsmål ligger uden for RavRadar.' }
          : { error: 'MODEL_BINDING_MISMATCH' }), {
          status: exact ? 200 : 409,
          headers: assistantResponseHeaders(),
        });
      }
      return new Response(null, { status: 204, headers: assistantResponseHeaders() });
    }
    if (requestUrl.includes('/rest/v1/admin_documents')) {
      if (method === 'GET') return new Response(JSON.stringify(stored ? [{ payload: stored }] : []), { status: 200 });
      assert.equal(method, 'POST');
      const body = JSON.parse(options.body);
      assert.equal(body.document_key, 'ravscore-integrated-cutover-readiness');
      stored = body.payload;
      return new Response(JSON.stringify([{ payload: stored }]), { status: 200 });
    }
    throw new Error(`unexpected mock URL ${requestUrl}`);
  };
  return { calls, fetchImpl, get stored() { return stored; } };
}

const tripBoundaryMock = fullCutoverFetch();
await verifyTripStorageEdgeBoundaries({
  url: URL,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: tripBoundaryMock.fetchImpl,
});
const publishMock = fullCutoverFetch();
const published = await publishIntegratedCutoverReadiness({
  sourceHead: SOURCE_HEAD,
  publicImplementationClosureSha256: PUBLIC_IMPLEMENTATION_CLOSURE_SHA256,
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: publishMock.fetchImpl,
});
assert.deepEqual(published, readiness);
assert.deepEqual(publishMock.stored, readiness);
const writeIndex = publishMock.calls.findIndex(call => call.method === 'POST' && call.requestUrl.includes('/admin_documents'));
const databaseIndex = publishMock.calls.findIndex(call => call.requestUrl.includes('/rpc/'));
const tripIndex = publishMock.calls.findIndex(call => call.requestUrl.includes('/functions/v1/trip-log'));
const assistantIndex = publishMock.calls.findIndex(call => call.requestUrl.includes('/functions/v1/ravradar-assistant'));
assert.ok(databaseIndex >= 0 && tripIndex > databaseIndex && assistantIndex > tripIndex && writeIndex > assistantIndex,
  'readiness was written before every metadata/Edge gate passed');

const rejectedDatabase = structuredClone(databaseReadback);
rejectedDatabase.checks.exactModelBindingPresent = false;
const failedPublishMock = fullCutoverFetch({ database: rejectedDatabase });
await assert.rejects(publishIntegratedCutoverReadiness({
  sourceHead: SOURCE_HEAD,
  publicImplementationClosureSha256: PUBLIC_IMPLEMENTATION_CLOSURE_SHA256,
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: failedPublishMock.fetchImpl,
}), /exactModelBindingPresent/);

const driftedPolicyDatabase = structuredClone(databaseReadback);
driftedPolicyDatabase.tripBindingPolicy.definition += '\nselect true;';
await assert.rejects(verifyIntegratedDatabaseReadback({
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  fetchImpl: async () => new Response(JSON.stringify(driftedPolicyDatabase), { status: 200 }),
}), /policy definition hash drifted/);

const driftedActiveAdmissionDatabase = structuredClone(databaseReadback);
driftedActiveAdmissionDatabase.tripActiveAdmissionPolicy.definition += '\nreturn true;';
await assert.rejects(verifyIntegratedDatabaseReadback({
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  fetchImpl: async () => new Response(JSON.stringify(driftedActiveAdmissionDatabase), { status: 200 }),
}), /active trip admission policy definition hash drifted/);

for (const rejectedCheck of [
  'bindingPolicyDefinitionPresent',
  'activeBindingAdmissionDefinitionPresent',
  'activeBindingTriggerPresent',
  'activeBindingTriggerCallsGateExactlyOnce',
  'bindingGateCalledExactlyOnce',
  'integratedModelBindingPresent',
  'candidateGRollbackBindingPresent',
  'unknownModelBindingRejected',
]) {
  const rejected = structuredClone(databaseReadback);
  rejected.checks[rejectedCheck] = false;
  await assert.rejects(verifyIntegratedDatabaseReadback({
    url: URL,
    serviceRoleKey: SERVICE_KEY,
    fetchImpl: async () => new Response(JSON.stringify(rejected), { status: 200 }),
  }), new RegExp(rejectedCheck));
}
assert.equal(failedPublishMock.calls.some(call => call.requestUrl.includes('/admin_documents')), false,
  'failed database gate touched the readiness document');

const checkMock = fullCutoverFetch({ existingReadiness: readiness });
await checkIntegratedCutoverReadiness({
  sourceHead: SOURCE_HEAD,
  publicImplementationClosureSha256: PUBLIC_IMPLEMENTATION_CLOSURE_SHA256,
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: checkMock.fetchImpl,
});
assert.equal(checkMock.calls.some(call => call.method !== 'GET' && call.requestUrl.includes('/admin_documents')), false,
  'normal readiness checker wrote protected storage');
const sealedCheckMock = fullCutoverFetch({ existingReadiness: readiness });
assert.deepEqual(await checkSealedIntegratedCutoverReadiness({
  expected: readiness,
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: sealedCheckMock.fetchImpl,
}), readiness);
assert.equal(sealedCheckMock.calls.some(call => call.method !== 'GET'
  && call.requestUrl.includes('/admin_documents')), false,
'sealed readiness checker must be strictly read-only');
await assert.rejects(checkIntegratedCutoverReadiness({
  sourceHead: 'b'.repeat(40),
  publicImplementationClosureSha256: PUBLIC_IMPLEMENTATION_CLOSURE_SHA256,
  url: URL,
  serviceRoleKey: SERVICE_KEY,
  publishableKey: PUBLISHABLE_KEY,
  fetchImpl: checkMock.fetchImpl,
}), /does not match the exact source/);

console.log('Integrated backend cutover readiness: migration fail-closed, metadata-only DB readback, no-write Edge binding, protected exact-head marker and read-only checker are green.');
