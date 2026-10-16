// Source-derived expected metadata, followed by the EXISTING normal readback.
// These objects are expectations, never standalone original/admission proof.
import assert from 'node:assert/strict';
import {
  assertNativeIdentityOutputFrozen, NATIVE_IDENTITY_BINDING_REVIEW as BINDING,
  NATIVE_IDENTITY_OUTPUT_REVIEW as OUTPUT, nativeIdentitySourceSha256 as sha,
  nativeIdentitySqlDefinition as definition, readNativeIdentityCanonicalSource,
  nativeIdentityMigration, NATIVE_IDENTITY_PREDECESSOR,
} from './lib/native-sampling-identity-successor-source.mjs';
const CP = 'ravradar_ravscore_checkpoint_';
const body = source => source.slice(source.indexOf('as $$') + 5, source.lastIndexOf('$$;')).replace(/\r\n?/g, '\n').trim();
const CHECKPOINT_ROWS = Object.freeze([
  ['canonical_time', null], ['has_forbidden_key', 'forbidden-key-validator'],
  ['integrated_state_valid', 'integrated-state-validator'], ['candidate_state_valid', 'candidate-state-validator'],
  ['payload_valid', 'payload-validator'], ['predecessor_payload_valid', 'predecessor-payload-validator'],
  ['cas', 'cas-function'], ['version_admin_document', 'checkpoint-history-exclusion'],
  ['top20_predecessor_projection', 'top20-predecessor-projection'],
  ['cp_close_predecessor_projection', 'cp-close-predecessor-projection'],
  ['owner_current_predecessor_projection', 'owner-current-predecessor-projection'],
  ['water_level_predecessor_projection', 'water-level-predecessor-projection'],
  ['userdata_predecessor_projection', 'userdata-predecessor-projection'],
  ['account_assistant_predecessor_projection', 'account-assistant-predecessor-projection'],
  ...['ffc', '249', 'c1ac'].flatMap(family => ['state', 'payload'].map(kind =>
    ['grid_' + family + '_' + kind + '_valid', 'grid-original-' + family + '-' + kind + '-validator'])),
  ['native_identity_i71_state_valid', 'native-identity-i71-state-validator'],
  ['native_identity_i71_payload_valid', 'native-identity-i71-payload-validator'],
]);
export async function nativeSamplingIdentityExpectedDatabaseContracts() {
  assertNativeIdentityOutputFrozen(); // FIRST: no source I/O until fully reviewed.
  assert.equal(arguments.length, 0, 'No injected source, root or binding');
  const { canonicalSource } = await readNativeIdentityCanonicalSource();
  const checkpointDefinition = CHECKPOINT_ROWS.map(([name, label]) => (label === null ? '' : '\n-- ' + label + ' --\n')
    + body(definition(canonicalSource, name === 'version_admin_document' ? name : CP + name))).join('');
  const tripDefinition = body(definition(canonicalSource, 'ravradar_trip_v3_score_quality_allowed'))
    + '\n-- calibration-truth-function --\n' + body(definition(canonicalSource, 'ravradar_trip_v3_calibration_truth_allowed'))
    + '\n-- binding-function --\n' + body(definition(canonicalSource, 'ravradar_trip_v3_binding_allowed'));
  assert.equal(sha(checkpointDefinition), OUTPUT.checkpointContractSha256);
  assert.equal(sha(tripDefinition), OUTPUT.tripBindingPolicySha256);
  return Object.freeze({
    checkpoint: Object.freeze({ id: 'ravscore-checkpoint-metadata-cas-v1', definition: checkpointDefinition, sha256: sha(checkpointDefinition) }),
    trip: Object.freeze({ id: 'ravradar-trip-v3-exact-integrated-candidate-g-global-warmup-v6', definition: tripDefinition, sha256: sha(tripDefinition) }),
  });
}
export async function verifyNativeSamplingIdentitySuccessorReadiness() {
  assertNativeIdentityOutputFrozen();
  assert.equal(arguments.length, 0, 'Only actual normal configuration and readers');
  const expected = await nativeSamplingIdentityExpectedDatabaseContracts();
  const normal = await import('./integrated-cutover-readiness.mjs');
  const integrated = (await import('../js/core/ravscore-model-contract.js')).ravScoreModelBinding();
  const candidate = (await import('./rollback-assets/ravscore-model-contract.js')).ravScoreModelBinding();
  const continuation = await import('./lib/ravscore-continuation-implementation-contract.mjs');
  assert.equal(integrated.modelBundleSha256, BINDING.integrated);
  assert.equal(candidate.modelBundleSha256, BINDING.candidate);
  assert.equal(await continuation.ravScoreContinuationImplementationSha256(), BINDING.continuation);
  // Deliberately fail if ROOT has not wired the ACTUAL normal source reader.
  // Never substitute a report/boolean or our own weaker database validator.
  assert.deepEqual(await normal.expectedCheckpointCasContract(), expected.checkpoint,
    'Normal checkpoint readback must use the exact native identity successor source');
  assert.deepEqual(await normal.expectedTripBindingPolicy(), expected.trip,
    'Normal trip readback must use the exact native identity successor source');
  const url = String(process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '');
  assert(url && serviceRoleKey, 'Actual normal authenticated readback configuration required');
  await normal.verifyIntegratedDatabaseReadback({ url, serviceRoleKey });
  const schema = await import('./verify-account-assistant-schema.mjs');
  await schema.verifyInstalledStatisticsPreferenceRevisionSchema({ accessToken: process.env.SUPABASE_ACCESS_TOKEN });
  return Object.freeze({ status: 'NORMAL_NATIVE_IDENTITY_READBACK_PASSED', privatePayloadIncluded: false,
    installationPerformed: false });
}

const INSTALLED_MIGRATIONS_ENDPOINT = 'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query';
const INSTALLED_MIGRATIONS_QUERY = 'select version from supabase_migrations.schema_migrations order by version;';
const installedMetadataKeys = (value, keys) => value !== null && typeof value === 'object'
  && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
  && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
function requireInstalledMetadata(condition) {
  if (!condition) throw Object.assign(new Error('NATIVE_IDENTITY_INSTALLED_MIGRATION_METADATA_REJECTED'),
    { code: 'NATIVE_IDENTITY_INSTALLED_MIGRATION_METADATA_REJECTED' });
}

// This is remote installed-version metadata only, never a local CLI plan,
// permission to install, original-data admission or a substitute for DB readback.
export async function verifyNativeSamplingIdentityInstalledMigrationMetadata(options) {
  assertNativeIdentityOutputFrozen(); // FIRST: no network while source is unfrozen.
  requireInstalledMetadata(arguments.length === 1
    && (installedMetadataKeys(options, ['accessToken']) || installedMetadataKeys(options, ['accessToken', 'fetchImpl'])));
  const { accessToken, fetchImpl = globalThis.fetch } = options;
  requireInstalledMetadata(typeof accessToken === 'string' && accessToken.trim().length > 0
    && !/[\r\n]/.test(accessToken) && typeof fetchImpl === 'function');
  await readNativeIdentityCanonicalSource(); // Actual immutable SQL and output pins.
  const normal = await import('./integrated-cutover-readiness.mjs');
  const successor = nativeIdentityMigration();
  const required = normal.REQUIRED_CUTOVER_MIGRATIONS.map(row => row.version);
  requireInstalledMetadata(required.length > 2 && new Set(required).size === required.length
    && required.every(version => /^\d{8,14}$/.test(version))
    && required.at(-1) === successor.version
    && required.includes(NATIVE_IDENTITY_PREDECESSOR.currentGridVersion)
    && required.includes(NATIVE_IDENTITY_PREDECESSOR.statisticsVersion));
  const controller = new AbortController();
  let rejectDeadline, reader;
  const deadline = new Promise((_, reject) => { rejectDeadline = reject; });
  const timer = setTimeout(() => {
    rejectDeadline(Object.assign(new Error('NATIVE_IDENTITY_INSTALLED_MIGRATION_METADATA_DEADLINE'),
      { code: 'NATIVE_IDENTITY_INSTALLED_MIGRATION_METADATA_DEADLINE' }));
    controller.abort();
  }, 15_000);
  const bounded = promise => Promise.race([promise, deadline]);
  try {
    const response = await bounded(fetchImpl(INSTALLED_MIGRATIONS_ENDPOINT, {
      method: 'POST', redirect: 'error', cache: 'no-store', credentials: 'omit', signal: controller.signal,
      headers: { authorization: 'Bearer ' + accessToken, 'content-type': 'application/json' },
      body: JSON.stringify({ query: INSTALLED_MIGRATIONS_QUERY, read_only: true }),
    }));
    requireInstalledMetadata(response.status === 201 && !response.redirected
      && typeof response.headers?.get === 'function' && typeof response.body?.getReader === 'function');
    const length = response.headers.get('content-length');
    requireInstalledMetadata(length === null || (/^\d+$/.test(length) && Number(length) <= 32 * 1024));
    reader = response.body.getReader();
    const chunks = []; let count = 0;
    for (;;) {
      const item = await bounded(reader.read());
      if (item.done) break;
      requireInstalledMetadata(item.value instanceof Uint8Array);
      count += item.value.byteLength;
      requireInstalledMetadata(count <= 32 * 1024);
      chunks.push(item.value);
    }
    reader.releaseLock(); reader = null;
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, count)));
    // The same exact Management API envelopes as the normal catalog reader.
    const rows = Array.isArray(value) ? value : installedMetadataKeys(value, ['result']) ? value.result
      : installedMetadataKeys(value, ['data']) ? value.data : null;
    requireInstalledMetadata(Array.isArray(rows) && rows.length > 0);
    const versions = rows.map(row => {
      requireInstalledMetadata(installedMetadataKeys(row, ['version']) && typeof row.version === 'string'
        && /^\d{8,14}$/.test(row.version));
      return row.version;
    });
    requireInstalledMetadata(new Set(versions).size === versions.length);
    const first = [...required].sort().at(0);
    requireInstalledMetadata(required.every(version => versions.includes(version))
      && [...versions].sort().at(-1) === successor.version
      && versions.every(version => version < first || required.includes(version)));
    return Object.freeze({ status: 'NATIVE_IDENTITY_INSTALLED_MIGRATION_METADATA_MATCH',
      scope: 'FIXED_REMOTE_VERSION_METADATA_ONLY', migrationCount: versions.length,
      admission: 'NO_ADMISSION', installationPerformed: false, privatePayloadIncluded: false });
  } finally {
    clearTimeout(timer); controller.abort();
    if (reader) {
      try { void reader.cancel().catch(() => {}); } catch { /* Preserve first bounded failure. */ }
      try { reader.releaseLock(); } catch { /* Preserve first bounded failure. */ }
    }
  }
}
