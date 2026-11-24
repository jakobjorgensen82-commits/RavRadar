import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { readFixedNativeActivityReceiptSource, fixedNativeActivityReceiptMigration, fixedNativeActivityReceiptArmQuery, buildFixedNativeActivityReceiptQuery } from './lib/account-native-activity-receipt-source.mjs';
export { readFixedNativeActivityReceiptSource, fixedNativeActivityReceiptMigration, fixedNativeActivityReceiptArmQuery };

const AUTH_CONFIG_URL = 'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/config/auth';
const DATABASE_QUERY_URL = 'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query';
const ACTIVITY_HOOK_URI = 'pg-functions://postgres/public/account_native_activity_token_hook';
const REPOSITORY = 'jakobjorgensen82-commits/RavRadar';
const MAX_RESPONSE_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 12000;
const VERIFIED_NATIVE_RECEIPT_STATES = new Set(['NATIVE_RECEIPT_UNARMED', 'NATIVE_RECEIPT_ARMED', 'NATIVE_CAPTURE_OBSERVED']);

export function isFixedActivityHookReadOwner(env) {
  return env.GITHUB_ACTIONS === 'true'
    && env.RUNNER_ENVIRONMENT === 'github-hosted'
    && env.GITHUB_REPOSITORY === REPOSITORY
    && env.GITHUB_EVENT_NAME === 'workflow_dispatch'
    && env.GITHUB_REF === 'refs/heads/main'
    && env.GITHUB_RUN_ATTEMPT === '1'
    && env.GITHUB_WORKFLOW_REF === REPOSITORY + '/.github/workflows/deploy-trip-storage.yml@refs/heads/main';
}

async function readBoundedJson(response, maximumBytes = MAX_RESPONSE_BYTES) {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null && (!/^[0-9]+$/.test(declaredLength) || Number(declaredLength) > maximumBytes)) {
    return null;
  }
  if (!response.body) return null;

  // The management response may contain secrets. Keep it transient and return no fields from it.
  const bytes = new Uint8Array(maximumBytes);
  let length = 0;
  for await (const chunk of response.body) {
    if (!(chunk instanceof Uint8Array) || chunk.byteLength > bytes.length - length) return null;
    bytes.set(chunk, length);
    length += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length)));
}

async function readConfig(response) {
  const config = await readBoundedJson(response);
  return config && typeof config === 'object' && !Array.isArray(config) ? config : null;
}

function classifyDisabledHookUri(uri) {
  if (uri === null || uri === '') return 'EMPTY';
  if (typeof uri !== 'string' || !uri.trim()) return 'UNPROVED';
  return uri === ACTIVITY_HOOK_URI ? 'EXPECTED' : 'DIFFERENT';
}

async function readFixedAccountActivityHookConfig({ accessToken, fetchImpl = globalThis.fetch }) {
  if (typeof accessToken !== 'string' || !accessToken.trim()) return { status: 'CREDENTIAL_UNAVAILABLE' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(AUTH_CONFIG_URL, {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json' },
      redirect: 'error',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (response.redirected) return { status: 'CONFIG_UNAVAILABLE' };
    if (response.status === 401 || response.status === 403) return { status: 'PERMISSION_REFUSED' };
    if (response.status !== 200) return { status: 'CONFIG_UNAVAILABLE' };

    const config = await readConfig(response);
    return config ? { status: 'CONFIG_READ', config } : { status: 'CONFIG_UNAVAILABLE' };
  } catch {
    // Do not expose provider messages, the response, or the exception cause.
    return { status: 'CONFIG_UNAVAILABLE' };
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

function projectHookConfig(config) {
  const enabled = config.hook_custom_access_token_enabled;
  const uri = config.hook_custom_access_token_uri;
  if (enabled === false) return { status: 'HOOK_DISABLED', disabledHookUri: classifyDisabledHookUri(uri) };
  if (enabled !== true || typeof uri !== 'string' || !uri.trim()) return { status: 'CONFIG_UNAVAILABLE' };
  return { status: uri === ACTIVITY_HOOK_URI ? 'HOOK_ENABLED_EXPECTED' : 'HOOK_ENABLED_DIFFERENT' };
}

export async function readFixedAccountActivityHookProjection(options) {
  const result = await readFixedAccountActivityHookConfig(options);
  return result.status === 'CONFIG_READ' ? projectHookConfig(result.config) : result;
}

// Library-only preparation: no CLI/write owner or hosted activation is supplied here.
// One admitted caller must hold the production writer window and qualify the live
// schema/ACL and Auth configuration before using this controller. GET is no proof
// of auth:write. Keep the exact prior null/empty URI only in this transient closure.
export function createFixedAccountActivityHookController({ accessToken, fetchImpl = globalThis.fetch }) {
  let busy = false;
  let unresolved = false;
  let rollbackAvailable = false;
  let priorUri;
  const attempted = new Set();

  async function patch(payload) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchImpl(AUTH_CONFIG_URL, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'error', credentials: 'omit', cache: 'no-store', signal: controller.signal,
      });
      if (response.redirected) return 'UNKNOWN';
      if (response.status === 401 || response.status === 403) return 'PERMISSION_REFUSED';
      if (response.status !== 200) return 'UNKNOWN';
      // The response can contain unrelated secrets; bound it, then discard it.
      return await readConfig(response) ? 'ACKNOWLEDGED' : 'UNKNOWN';
    } catch {
      return 'UNKNOWN';
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  }

  async function operate(operation) {
    if (busy) return { status: 'OPERATION_IN_PROGRESS' };
    if (unresolved) return { status: 'WRITE_UNRESOLVED' };
    if (operation === 'rollback' && !rollbackAvailable) return { status: 'ROLLBACK_NOT_AVAILABLE' };
    // GET may return null, but the supported PATCH body documents a string URI.
    // Preserve that distinction; explicit disable remains available without a
    // speculative null PATCH or a false claim of exact prior-state restoration.
    if (operation === 'rollback' && priorUri === null) return { status: 'ROLLBACK_URI_UNPROVED' };
    if (attempted.has(operation)) return { status: 'OPERATION_ALREADY_ATTEMPTED' };
    attempted.add(operation);
    busy = true;
    try {
      const before = await readFixedAccountActivityHookConfig({ accessToken, fetchImpl });
      if (before.status !== 'CONFIG_READ') return { status: before.status };
      const enabled = before.config.hook_custom_access_token_enabled;
      const uri = before.config.hook_custom_access_token_uri;
      if (operation === 'enable') {
        if (enabled !== false || (uri !== null && uri !== '')) return { status: 'PRECONDITION_REFUSED' };
        priorUri = uri;
      } else if (enabled !== true || uri !== ACTIVITY_HOOK_URI) {
        return { status: 'PRECONDITION_REFUSED' };
      }
      const target = {
        hook_custom_access_token_enabled: operation === 'enable',
        hook_custom_access_token_uri: operation === 'rollback' ? priorUri : ACTIVITY_HOOK_URI,
      };
      rollbackAvailable = false;
      const outcome = await patch(target);
      if (outcome === 'PERMISSION_REFUSED') return { status: 'PERMISSION_REFUSED' };
      // An unknown PATCH can still be in flight. Even a matching GET is only an
      // observation: never turn it into rollback/retry authority in this instance.
      const after = await readFixedAccountActivityHookConfig({ accessToken, fetchImpl });
      const matches = after.status === 'CONFIG_READ'
        && after.config.hook_custom_access_token_enabled === target.hook_custom_access_token_enabled
        && after.config.hook_custom_access_token_uri === target.hook_custom_access_token_uri;
      if (outcome !== 'ACKNOWLEDGED' || !matches) {
        unresolved = true;
        return { status: 'WRITE_UNRESOLVED', patchOutcome: outcome,
          readback: after.status === 'CONFIG_READ' ? projectHookConfig(after.config) : { status: after.status } };
      }
      rollbackAvailable = operation === 'enable';
      return { status: operation === 'enable' ? 'HOOK_ENABLED_VERIFIED'
        : operation === 'rollback' ? 'HOOK_ROLLBACK_VERIFIED' : 'HOOK_DISABLED_VERIFIED' };
    } finally {
      busy = false;
    }
  }

  return Object.freeze({
    enable: () => operate('enable'),
    disable: () => operate('disable'),
    rollback: () => operate('rollback'),
  });
}


const WRITE_CONFIRMATIONS = Object.freeze({
  enable: 'ENABLE-FIXED-ACCOUNT-ACTIVITY-HOOK',
  disable: 'DISABLE-FIXED-ACCOUNT-ACTIVITY-HOOK',
  arm: 'ARM-FIXED-ACCOUNT-ACTIVITY-RECEIPT',
});

export function isFixedActivityHookWriteOwner(env, operation) {
  return env !== null && typeof env === 'object' && !Array.isArray(env)
    && Object.hasOwn(WRITE_CONFIRMATIONS, operation)
    && isFixedActivityHookReadOwner(env)
    && env.GITHUB_JOB === 'configure-fixed-account-activity-hook'
    && /^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '')
    && env.RAVRADAR_FIXED_ACTIVITY_HOOK_OPERATION === operation
    && env.RAVRADAR_FIXED_ACTIVITY_HOOK_CONFIRMATION === WRITE_CONFIRMATIONS[operation];
}

function isFixedAccountActivityMetadataReadOwner(env, operation) {
  return env !== null && typeof env === 'object' && !Array.isArray(env)
    && isFixedActivityHookReadOwner(env)
    && env.GITHUB_JOB === 'read-fixed-supabase-metadata'
    && /^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '')
    && env.RAVRADAR_FIXED_ACTIVITY_HOOK_OPERATION === operation;
}

export function isFixedActivityHookCatalogReadOwner(env) {
  return isFixedAccountActivityMetadataReadOwner(env, 'catalog-read');
}

function onlyKeys(value, expected) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === expected.length
    && Object.keys(value).sort().join('\n') === [...expected].sort().join('\n');
}

const MANUAL_CATALOG_MAX_BYTES = 32768;
const MANUAL_CATALOG_HTTP_STATUSES = new Set([400,401,403,404,408,409,422,429,500,502,503,504]);
const MANUAL_CATALOG_SQLSTATES = new Set(['42501','42703','42883','42P01','55P03','57014','25006']);
const MANUAL_CATALOG_PERMISSION_TARGETS = new Map([
  ['permission denied for function account_erasure_check_metadata', 'CHECK_METADATA_EXECUTE'],
  ['permission denied for schema auth', 'AUTH_SCHEMA_USAGE'],
  ['permission denied for schema extensions', 'EXTENSIONS_SCHEMA_USAGE'],
  ['permission denied for function digest', 'DIGEST_EXECUTE'],
  ['permission denied for table pg_constraint', 'CHECK_CATALOG_READ'],
]);
const MANUAL_CATALOG_VALIDATION = new Set([
  'CATALOG_ENVELOPE','TABLE_CONTRACT','COLUMN_CONTRACT','INDEX_CONTRACT',
  'FUNCTION_CONTRACT','TRIGGER_CONTRACT','CHECK_FORMAT',
]);

function manualCatalogSqlState(value) {
  const message = typeof value?.message === 'string' ? value.message : '';
  const reported = [value?.code, value?.sqlstate, value?.error?.code,
    /^(?:Failed to run SQL query: )?ERROR:\s+([A-Z0-9]{5})(?=[:\s])/i.exec(message)?.[1]?.toUpperCase()];
  return reported.find(code => MANUAL_CATALOG_SQLSTATES.has(code));
}

export async function diagnoseFixedManualAccountErasureCatalog({ env, accessToken, fetchImpl = globalThis.fetch }) {
  const refused = (category, detail = {}) => ({ status: 'MANUAL_CATALOG_DIAGNOSTIC_REFUSED', category, ...detail });
  if (!isFixedAccountActivityMetadataReadOwner(env, 'manual-catalog-diagnose')) return refused('OWNER_REQUIRED');
  if (typeof accessToken !== 'string' || !accessToken.length || /[\r\n]/.test(accessToken)) return refused('CREDENTIAL_UNAVAILABLE');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let phase = 'REQUEST';
  try {
    const { accountErasureCatalogQuery, verifyAccountErasureCatalogMetadata } = await import('./verify-account-erasure-schema.mjs');
    const response = await fetchImpl('https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query', {
      method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store', signal: controller.signal,
      headers: { authorization: 'Bearer ' + accessToken, 'content-type': 'application/json' },
      body: JSON.stringify({ query: accountErasureCatalogQuery, read_only: true }),
    });
    if (response.redirected) return refused('HTTP_REDIRECT');
    if (response.status !== 201) {
      const httpStatus = MANUAL_CATALOG_HTTP_STATUSES.has(response.status) ? response.status : null;
      const error = [400,422,500].includes(httpStatus)
        ? await readBoundedJson(response, MANUAL_CATALOG_MAX_BYTES).catch(() => null) : null;
      const sqlState = manualCatalogSqlState(error);
      // The provider message remains private. Only exact known permission targets get a category.
      const permissionMessage = sqlState === '42501' && typeof error?.message === 'string'
        ? error.message.split(/\r?\n/, 1)[0]
          .replace(/^(?:Failed to run SQL query: )?ERROR:\s+(?:42501:\s+)?/i, '').trim() : null;
      const permissionTarget = MANUAL_CATALOG_PERMISSION_TARGETS.get(permissionMessage);
      return refused('HTTP_STATUS', { httpStatus, ...(sqlState ? { sqlState } : {}),
        ...(permissionTarget ? { permissionTarget } : {}) });
    }
    phase = 'RESPONSE_BODY';
    const value = await readBoundedJson(response, MANUAL_CATALOG_MAX_BYTES);
    if (value === null) return refused('RESPONSE_BODY');
    phase = 'CATALOG_UNCLASSIFIED';
    const rows = Array.isArray(value) ? value : onlyKeys(value, ['result']) ? value.result
      : onlyKeys(value, ['data']) ? value.data : null;
    verifyAccountErasureCatalogMetadata(rows);
    return { status: 'MANUAL_CATALOG_DIAGNOSTIC_PASS', checkExpressionSemanticsVerified: false };
  } catch (error) {
    if (controller.signal.aborted) return refused('RESPONSE_DEADLINE');
    return refused(MANUAL_CATALOG_VALIDATION.has(error?.catalogCategory) ? error.catalogCategory : phase);
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

// Reuse the installed OFF catalog and its source/body/ACL verifier. The sole
// additional catalog fact is schema USAGE, never table rows or arbitrary SQL.
// Historical CHECK-expression qualification remains the installation's proof;
// this read must not manufacture a fresh native or hosted login result.
export async function readFixedAccountActivityHookCatalog({ accessToken, fetchImpl = globalThis.fetch }) {
  if (typeof accessToken !== 'string' || !accessToken.trim()) return { status: 'CREDENTIAL_UNAVAILABLE' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const { accountInactivityCatalogQuery, verifyAccountInactivityCatalogMetadata } = await import('./verify-account-erasure-schema.mjs');
    const query = "select saved.metadata, pg_catalog.has_schema_privilege('supabase_auth_admin','public','USAGE') as \"authAdminPublicUsage\" from ("
      + accountInactivityCatalogQuery.trim().replace(/;$/, '') + ') as saved;';
    const response = await fetchImpl('https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query', {
      method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store', signal: controller.signal,
      headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, read_only: true }),
    });
    if (response.redirected) return { status: 'HOOK_CATALOG_UNAVAILABLE' };
    if (response.status === 401 || response.status === 403) return { status: 'HOOK_CATALOG_PERMISSION_REFUSED' };
    if (response.status !== 201) return { status: 'HOOK_CATALOG_UNAVAILABLE' };
    const value = await readBoundedJson(response);
    const rows = Array.isArray(value) ? value : onlyKeys(value, ['result']) ? value.result : onlyKeys(value, ['data']) ? value.data : null;
    if (!Array.isArray(rows) || rows.length !== 1 || !onlyKeys(rows[0], ['metadata', 'authAdminPublicUsage'])
      || rows[0].authAdminPublicUsage !== true) return { status: 'HOOK_CATALOG_REFUSED' };
    let result;
    try { result = verifyAccountInactivityCatalogMetadata([{ metadata: rows[0].metadata }]); }
    catch { return { status: 'HOOK_CATALOG_REFUSED' }; }
    // The reused validator also serves isolated rr_native_test databases.
    // The hosted activation owner accepts only the actual production owner.
    if (result.catalogVerified !== true || rows[0].metadata.functions.account_native_activity_token_hook.owner !== 'postgres')
      return { status: 'HOOK_CATALOG_REFUSED' };
    return { status: 'HOOK_CATALOG_VERIFIED', publicSchemaUsage: true,
      sourceBodyAndAclVerified: true, checkExpressionSemanticsVerified: result.checkExpressionSemanticsVerified };
  } catch {
    return { status: 'HOOK_CATALOG_UNAVAILABLE' };
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

async function armFixedNativeActivityReceipt({ accessToken, fetchImpl }) {
  const before = await readFixedNativeActivityReceiptState({ accessToken, fetchImpl });
  if (['NATIVE_RECEIPT_ARMED', 'NATIVE_CAPTURE_OBSERVED'].includes(before.status)) {
    return { status: 'NATIVE_RECEIPT_ARM_PRECONDITION_REFUSED', receiptStatus: before.status };
  }
  if (before.status !== 'NATIVE_RECEIPT_UNARMED') return { status: before.status };
  const hook = await readFixedAccountActivityHookProjection({ accessToken, fetchImpl });
  if (hook.status !== 'HOOK_DISABLED' || hook.disabledHookUri !== 'EMPTY') {
    return { status: 'NATIVE_RECEIPT_ARM_AUTH_DISABLED_EMPTY_REQUIRED' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let acknowledged = false;
  try {
    const response = await fetchImpl(DATABASE_QUERY_URL, {
      method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store', signal: controller.signal,
      headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: fixedNativeActivityReceiptArmQuery, read_only: false }),
    });
    if (!response.redirected && (response.status === 401 || response.status === 403)) {
      return { status: 'NATIVE_RECEIPT_ARM_PERMISSION_REFUSED' };
    }
    acknowledged = !response.redirected && response.status === 201;
  } catch {
    // The transaction may still commit after an interrupted request.
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }

  const { policyEpochSha256, ...after } = await readFixedNativeActivityReceiptState({ accessToken, fetchImpl });
  if (!acknowledged || after.status !== 'NATIVE_RECEIPT_ARMED'
    || after.armEpochSha256 !== before.armEpochSha256
    || policyEpochSha256 !== before.policyEpochSha256
    || after.coverageEpochSha256 !== policyEpochSha256 || after.armedAt <= before.observedAt) {
    return { status: 'NATIVE_RECEIPT_ARM_WRITE_UNRESOLVED', receiptStatus: after.status };
  }
  return { ...after, status: 'NATIVE_RECEIPT_ARMED_VERIFIED' };
}

export async function runFixedAccountActivityHookOperation({ operation, env, accessToken, fetchImpl = globalThis.fetch }) {
  if (!isFixedActivityHookWriteOwner(env ?? {}, operation)) return { status: 'OWNER_REQUIRED' };
  if (operation === 'arm') return armFixedNativeActivityReceipt({ accessToken, fetchImpl });
  if (operation === 'enable') {
    // SQL80 extends the token-hook body. Verify the exact installed append,
    // receipt table and existing OFF/ACL contract instead of the legacy body.
    // Require an armed receipt for the current epoch before a first login can be observed.
    // This configuration change does not establish Auth-response or coverage-start authority.
    const receipt = await readFixedNativeActivityReceipt({ accessToken, fetchImpl });
    if (receipt.status !== 'NATIVE_RECEIPT_ARMED') {
      return { status: receipt.status };
    }
  }
  // Disabling must remain available if capture conservatively invalidated the
  // policy or the database is unavailable. Its exact own-URI read is mandatory.
  return createFixedAccountActivityHookController({ accessToken, fetchImpl })[operation]();
}


// Operational metadata readback only. The installed OFF verifier keeps its exact
// UNKNOWN/OFF oracle; this projection never qualifies Auth acceptance or starts
// coverage. All dates come from this fixed database query, not caller arguments.
export const fixedAccountActivityCoverageQuery = `select
  pg_catalog.to_char(pg_catalog.clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "observedAt",
  (select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'coverageStatus', coverage_status,
    'coverageEpoch', coverage_epoch::text,
    'coverageStartedAt', case when coverage_started_at is null then null else
      pg_catalog.to_char(coverage_started_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end,
    'noticesEnabled', notices_enabled,
    'deliveryQualified', delivery_qualified))
   from public.account_inactivity_policy) as "policy";`;

function coverageTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(value)) return false;
  const milliseconds = value.slice(0, 23) + 'Z';
  const parsed = Date.parse(milliseconds);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === milliseconds;
}

export async function readFixedAccountActivityCoverage({ accessToken, fetchImpl = globalThis.fetch }) {
  if (typeof accessToken !== 'string' || !accessToken.trim()) return { status: 'CREDENTIAL_UNAVAILABLE' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl('https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query', {
      method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store', signal: controller.signal,
      headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: fixedAccountActivityCoverageQuery, read_only: true }),
    });
    if (response.redirected) return { status: 'COVERAGE_UNAVAILABLE' };
    if (response.status === 401 || response.status === 403) return { status: 'COVERAGE_PERMISSION_REFUSED' };
    if (response.status !== 201) return { status: 'COVERAGE_UNAVAILABLE' };
    const value = await readBoundedJson(response);
    if (value === null) return { status: 'COVERAGE_UNAVAILABLE' };
    const rows = Array.isArray(value) ? value : onlyKeys(value, ['result']) ? value.result : onlyKeys(value, ['data']) ? value.data : null;
    if (!Array.isArray(rows) || rows.length !== 1 || !onlyKeys(rows[0], ['observedAt', 'policy'])
      || !coverageTime(rows[0].observedAt) || !Array.isArray(rows[0].policy) || rows[0].policy.length !== 1)
      return { status: 'COVERAGE_STATE_REFUSED' };
    const policy = rows[0].policy[0];
    if (!onlyKeys(policy, ['coverageStatus', 'coverageEpoch', 'coverageStartedAt', 'noticesEnabled', 'deliveryQualified'])
      || typeof policy.coverageEpoch !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(policy.coverageEpoch)
      || policy.coverageEpoch === '00000000-0000-0000-0000-000000000000'
      || policy.noticesEnabled !== false || policy.deliveryQualified !== false
      || !['UNKNOWN', 'CAPTURING', 'INVALID'].includes(policy.coverageStatus)
      || !(policy.coverageStartedAt === null || coverageTime(policy.coverageStartedAt))
      || policy.coverageStartedAt !== null && policy.coverageStartedAt > rows[0].observedAt
      || policy.coverageStatus === 'UNKNOWN' && policy.coverageStartedAt !== null
      || policy.coverageStatus === 'CAPTURING' && policy.coverageStartedAt === null)
      return { status: 'COVERAGE_STATE_REFUSED' };
    return {
      status: policy.coverageStatus === 'CAPTURING' ? 'COVERAGE_CAPTURING_OBSERVED'
        : policy.coverageStatus === 'INVALID' ? 'COVERAGE_INVALID_OBSERVED' : 'COVERAGE_UNKNOWN_OBSERVED',
      observedAt: rows[0].observedAt,
      coverageStartedAt: policy.coverageStartedAt,
      coverageEpochSha256: createHash('sha256').update(policy.coverageEpoch, 'utf8').digest('hex'),
      activityEligibility: 'HOLD', noticesEnabled: false, deliveryQualified: false,
      automaticDeletionEnabled: false, authAcceptanceProved: false, activationAuthority: false,
    };
  } catch {
    return { status: 'COVERAGE_UNAVAILABLE' };
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}


async function nativeReceiptQueryAndSource() {
  const base = await import('./verify-account-erasure-schema.mjs');
  const append = readFixedNativeActivityReceiptSource();
  const source = base.readAccountInactivitySource();
  const query = buildFixedNativeActivityReceiptQuery(base.accountInactivityCatalogQuery);
  return { base, append, query, source: { ...source, bodies: { ...source.bodies, account_native_activity_token_hook: append.hookBodySha256 } } };
}

async function readFixedNativeActivityReceiptState({ accessToken, fetchImpl = globalThis.fetch, expectedCheckReference }) {
  if (typeof accessToken !== 'string' || !accessToken.trim()) return { status: 'CREDENTIAL_UNAVAILABLE' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const { base, append, query, source } = await nativeReceiptQueryAndSource();
    if(expectedCheckReference!==undefined)base.verifyAccountInactivityCheckReference(expectedCheckReference);
    const response = await fetchImpl(DATABASE_QUERY_URL, {
      method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store', signal: controller.signal,
      headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, read_only: true }),
    });
    if (response.redirected) return { status: 'NATIVE_RECEIPT_UNAVAILABLE' };
    if (response.status === 401 || response.status === 403) return { status: 'NATIVE_RECEIPT_PERMISSION_REFUSED' };
    if (response.status !== 201) return { status: 'NATIVE_RECEIPT_UNAVAILABLE' };
    const value = await readBoundedJson(response);
    if (value === null) return { status: 'NATIVE_RECEIPT_UNAVAILABLE' };
    const rows = Array.isArray(value) ? value : onlyKeys(value, ['result']) ? value.result : onlyKeys(value, ['data']) ? value.data : null;
    if (!Array.isArray(rows) || rows.length !== 1 || !onlyKeys(rows[0], ['metadata', 'authAdminPublicUsage', 'policyEpoch', 'observedAt', 'receipt'])
      || rows[0].authAdminPublicUsage !== true || !coverageTime(rows[0].observedAt)) return { status: 'NATIVE_RECEIPT_REFUSED' };
    const metadata = structuredClone(rows[0].metadata);
    const table = metadata?.tables?.account_native_activity_receipt;
    const oldTable = metadata?.tables?.account_inactivity_policy;
    const expectedColumns = [['singleton','bool',true,true,0],['arm_epoch','uuid',true,true,0],['coverage_epoch','uuid',false,false,0],
      ['armed_at','timestamptz',false,false,0],['native_started_at','timestamptz',false,false,0],['native_captured_at','timestamptz',false,false,0]];
    if (!table || !oldTable || Object.keys(table).sort().join('\n') !== Object.keys(oldTable).sort().join('\n')
      || table.present !== true || table.regular !== true || table.rls !== true || table.forceRls !== true
      || table.owner !== 'postgres' || table.ownerBypassesRls !== true
      || JSON.stringify(table.columns) !== JSON.stringify(expectedColumns) || table.foreignKeys !== null
      || table.checks !== 7 || table.constraintCount !== 8 || table.primaryKey !== 1
      || table.policies !== 0 || table.userTriggers !== 0 || table.unexpectedAcl !== false
      || table.unexpectedColumnAcl !== false || table.directAccess !== false) return { status: 'NATIVE_RECEIPT_REFUSED' };
    // Existing public API: supply the exact append-derived source, never replace
    // actual metadata/body hashes to make the old OFF oracle accept new code.
    delete metadata.tables.account_native_activity_receipt;
    try { base.verifyAccountInactivityCatalogMetadata([{ metadata }], { source, expectedCheckReference }); }
    catch { return { status: 'NATIVE_RECEIPT_REFUSED' }; }
    if (metadata.functions.account_native_activity_token_hook.owner !== 'postgres') return { status: 'NATIVE_RECEIPT_REFUSED' };
    const values = rows[0].receipt;
    if (!Array.isArray(values) || values.length !== 1 || !onlyKeys(values[0], ['armEpoch','coverageEpoch','armedAt','nativeStartedAt','nativeCapturedAt']))
      return { status: 'NATIVE_RECEIPT_REFUSED' };
    const receipt = values[0], uuid = v => typeof v === 'string'
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v) && v !== '00000000-0000-0000-0000-000000000000';
    if (!uuid(rows[0].policyEpoch) || !uuid(receipt.armEpoch) || !(receipt.coverageEpoch === null || uuid(receipt.coverageEpoch))
      || receipt.coverageEpoch !== null && receipt.coverageEpoch !== rows[0].policyEpoch
      || [receipt.armedAt,receipt.nativeStartedAt,receipt.nativeCapturedAt].some(v => v !== null && !coverageTime(v))
      || (receipt.armedAt === null) !== (receipt.coverageEpoch === null)
      || (receipt.nativeStartedAt === null) !== (receipt.nativeCapturedAt === null)
      || receipt.armedAt !== null && receipt.armedAt > rows[0].observedAt
      || receipt.nativeCapturedAt !== null && (receipt.armedAt === null || receipt.nativeStartedAt < receipt.armedAt
        || receipt.nativeCapturedAt < receipt.nativeStartedAt || receipt.nativeCapturedAt > rows[0].observedAt))
      return { status: 'NATIVE_RECEIPT_REFUSED' };
    const captured = receipt.nativeCapturedAt !== null;
    return { status: captured ? 'NATIVE_CAPTURE_OBSERVED' : receipt.armedAt === null ? 'NATIVE_RECEIPT_UNARMED' : 'NATIVE_RECEIPT_ARMED',
      observedAt: rows[0].observedAt, armedAt: receipt.armedAt, nativeStartedAt: receipt.nativeStartedAt, nativeCapturedAt: receipt.nativeCapturedAt,
      armEpochSha256: createHash('sha256').update(receipt.armEpoch,'utf8').digest('hex'),
      policyEpochSha256: createHash('sha256').update(rows[0].policyEpoch,'utf8').digest('hex'),
      coverageEpochSha256: receipt.coverageEpoch === null ? null : createHash('sha256').update(receipt.coverageEpoch,'utf8').digest('hex'),
      appendSha256: append.sha256, sourceBodyAndAclVerified: true, checkExpressionSemanticsVerified: false, nativeCaptureObserved: captured,
      authResponseObserved: false, activityEligibility: 'HOLD', coverageStartAuthority: false,
      noticesEnabled: false, automaticDeletionEnabled: false,
      ...(expectedCheckReference===undefined?{}:{originalOffCheckExpressionSemanticsVerified:true}) };
  } catch {
    return { status: 'NATIVE_RECEIPT_UNAVAILABLE' };
  } finally {
    clearTimeout(timeout); controller.abort();
  }
}

export async function readFixedNativeActivityReceipt(options) {
  const { policyEpochSha256, ...result } = await readFixedNativeActivityReceiptState(options);
  return result;
}

// Installation readback only; no SQL write, arm, Auth PATCH or policy start.
export async function verifyFixedNativeActivityReceiptInstallState({phase,accessToken,expectedManualCheckReference,expectedInactivityCheckReference,expectedAppendSha256,fetchImpl=globalThis.fetch}) {
  if(!['before','installed'].includes(phase)||expectedAppendSha256!==readFixedNativeActivityReceiptSource().sha256)
    throw new Error('NATIVE_RECEIPT_INSTALL_STATE_REQUIRED');
  const base=await import('./verify-account-erasure-schema.mjs');
  base.verifyAccountInactivityCheckReference(expectedInactivityCheckReference);
  // The unchanged manual verifier validates its qualified CHECK reference before transport.
  await base.verifyInstalledAccountErasureSchema({accessToken,expectedCheckReference:expectedManualCheckReference,fetchImpl});
  const hook=await readFixedAccountActivityHookProjection({accessToken,fetchImpl});
  if(hook.status!=='HOOK_DISABLED'||!['EMPTY','EXPECTED'].includes(hook.disabledHookUri))
    throw new Error('NATIVE_RECEIPT_INSTALL_AUTH_DISABLED_REQUIRED');
  if(phase==='before') {
    const catalog=await readFixedAccountActivityHookCatalog({accessToken,fetchImpl});
    if(catalog.status!=='HOOK_CATALOG_VERIFIED')throw new Error('NATIVE_RECEIPT_INSTALL_CATALOG_REQUIRED');
    await base.verifyInstalledAccountInactivitySchema({accessToken,expectedCheckReference:expectedInactivityCheckReference,fetchImpl});
  } else {
    const receipt=await readFixedNativeActivityReceipt({accessToken,fetchImpl,expectedCheckReference:expectedInactivityCheckReference});
    if(receipt.status!=='NATIVE_RECEIPT_UNARMED'||receipt.originalOffCheckExpressionSemanticsVerified!==true
      ||receipt.appendSha256!==expectedAppendSha256||receipt.nativeCaptureObserved!==false
      ||receipt.activityEligibility!=='HOLD'||receipt.coverageStartAuthority!==false
      ||receipt.noticesEnabled!==false||receipt.automaticDeletionEnabled!==false)
      throw new Error('NATIVE_RECEIPT_INSTALL_UNARMED_OFF_REQUIRED');
  }
  return {kind:'ACCOUNT_NATIVE_RECEIPT_INSTALL_READBACK',phase,appendSha256:expectedAppendSha256,
    authHookStatus:'HOOK_DISABLED',originalOffCheckExpressionSemanticsVerified:true,
    receiptCheckExpressionSemanticsVerified:false,receiptStatus:phase==='before'?'NOT_INSTALLED':'UNARMED',
    activityEligibility:'HOLD',coverageStarted:false,noticesEnabled:false,automaticDeletionEnabled:false,activationAuthority:false};
}

// The hosted catalogue command reads the installed append. The pre-install
// catalogue oracle remains used exclusively by its existing callers.
export async function runFixedAccountActivityCatalogRead({ env, accessToken, fetchImpl = globalThis.fetch }) {
  if (!isFixedActivityHookCatalogReadOwner(env)) return { status: 'OWNER_REQUIRED' };
  const result = await readFixedNativeActivityReceipt({ accessToken, fetchImpl });
  if (!VERIFIED_NATIVE_RECEIPT_STATES.has(result.status)) return { status: result.status };
  const {
    status, sourceBodyAndAclVerified, nativeCaptureObserved, authResponseObserved,
    activityEligibility, coverageStartAuthority, noticesEnabled, automaticDeletionEnabled,
  } = result;
  return {
    status, sourceBodyAndAclVerified, nativeCaptureObserved, authResponseObserved,
    activityEligibility, coverageStartAuthority, noticesEnabled, automaticDeletionEnabled,
  };
}

export async function readFixedAccountActivityHook(options) {
  return (await readFixedAccountActivityHookProjection(options)).status;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const operation = process.argv.length === 3 && process.argv[2] === '--enable' ? 'enable'
    : process.argv.length === 3 && process.argv[2] === '--disable' ? 'disable'
      : process.argv.length === 3 && process.argv[2] === '--arm' ? 'arm' : null;
  if (process.argv.length === 3 && process.argv[2] === '--catalog') {
    const result = await runFixedAccountActivityCatalogRead({ env: process.env, accessToken: process.env.SUPABASE_ACCESS_TOKEN });
    console.log(JSON.stringify(result));
    if (!VERIFIED_NATIVE_RECEIPT_STATES.has(result.status)) process.exitCode = 1;
  } else if (process.argv.length === 3 && process.argv[2] === '--manual-catalog-diagnose') {
    const result = await diagnoseFixedManualAccountErasureCatalog({ env: process.env, accessToken: process.env.SUPABASE_ACCESS_TOKEN });
    console.log(JSON.stringify(result));
    if (result.status !== 'MANUAL_CATALOG_DIAGNOSTIC_PASS') process.exitCode = 1;
  } else if (operation !== null) {
    const result = await runFixedAccountActivityHookOperation({ operation, env: process.env, accessToken: process.env.SUPABASE_ACCESS_TOKEN });
    console.log(JSON.stringify(result));
    if (!['HOOK_ENABLED_VERIFIED', 'HOOK_DISABLED_VERIFIED', 'NATIVE_RECEIPT_ARMED_VERIFIED'].includes(result.status)) process.exitCode = 1;
  } else {
    const permitted = process.argv.length === 2 && isFixedActivityHookReadOwner(process.env);
    const { status, disabledHookUri } = permitted
      ? await readFixedAccountActivityHookProjection({ accessToken: process.env.SUPABASE_ACCESS_TOKEN })
      : { status: 'OWNER_REQUIRED' };
    console.log(JSON.stringify({ status }));
    if (status === 'HOOK_DISABLED') console.log(JSON.stringify({ disabledHookUri }));
    if (!['HOOK_DISABLED', 'HOOK_ENABLED_EXPECTED', 'HOOK_ENABLED_DIFFERENT'].includes(status)) process.exitCode = 1;
  }
}
