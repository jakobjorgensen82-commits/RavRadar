import { GatewayError } from './public-gateway.ts';
import { tripStorageMode } from './trip-store.ts';
import { deleteCloudflareTrips, externalOwnerSubject, normalizeCloudflareGatewayUrl, sha256Hex } from './trip-storage.js';
import { inactivityNoticeBody } from './inactivity-notice-mail.mjs';

export const MANUAL_ACCOUNT_ERASURE_CONFIRMATION = 'DELETE-MANUAL-ACCOUNT-PERMANENTLY';
const OPERATIONS = ['account-erasure-prepare', 'account-erasure-status', 'account-erasure-resume', 'account-erasure-list'];
const PUBLIC_KEYS = ['operationId', 'targetUserId', 'mode', 'state', 'holdReason', 'pgStageCommitted',
  'pgRowsRemoved', 'authAbsent', 'd1Acknowledged', 'd1DeletedCount', 'complete'];
const SERVICE_KEYS = [...PUBLIC_KEYS, 'authAttemptId', 'authUserCreatedAt', 'd1OwnerSubject'];
const STATES = ['PREPARED', 'HOLD_ACTIVITY_CHANGED', 'HOLD_POLICY', 'PG_STAGED_AUTH_PENDING',
  'AUTH_ATTEMPTED', 'AUTH_ABSENT_D1_PENDING', 'COMPLETE'];
const HOLD_REASONS = ['ACTIVITY_CHANGED', 'PRIVILEGED_TARGET', 'REFERENCE_POLICY', 'REFERENCE_CATALOG_UNKNOWN',
  'TARGET_MISSING', 'STORAGE_CATALOG_UNKNOWN', 'STORAGE_POLICY_UNQUALIFIED', 'STORAGE_OWNERSHIP', 'AUTH_GENERATION_CHANGED'];
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const id = value => typeof value === 'string' && UUID.test(value) && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value);
const generation = value => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value);
const subject = value => typeof value === 'string' && /^usr_v1_[A-Za-z0-9_-]{43}$/.test(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
const fail = (code = 'ACCOUNT_ERASURE_UNAVAILABLE', status = 503) => { throw new GatewayError(status, code); };
const sameKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === [...keys].sort().join(',');

export const isManualAccountErasureOperation = value => OPERATIONS.includes(value);
export function validateManualAccountErasurePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('ACCOUNT_ERASURE_INPUT_INVALID', 400);
  if(payload.operation===OPERATIONS[3]){
    const cursor=Object.hasOwn(payload,'afterOperationId');
    if(!sameKeys(payload,cursor?['operation','afterOperationId']:['operation'])
      ||cursor&&!id(payload.afterOperationId))fail('ACCOUNT_ERASURE_INPUT_INVALID',400);
    return;
  }
  const keys = payload.operation === OPERATIONS[0] ? ['operation', 'operationId', 'targetUserId']
    : payload.operation === OPERATIONS[1] ? ['operation', 'operationId']
    : ['operation', 'operationId', 'attemptId', 'confirmation'];
  if (!isManualAccountErasureOperation(payload.operation) || !sameKeys(payload, keys) || !id(payload.operationId)
    || payload.operation === OPERATIONS[0] && !id(payload.targetUserId)
    || payload.operation === OPERATIONS[2] && (!id(payload.attemptId)
      || payload.confirmation !== MANUAL_ACCOUNT_ERASURE_CONFIRMATION)) fail('ACCOUNT_ERASURE_INPUT_INVALID', 400);
}

function checkedStatus(value, operationId, internal = false, claim = false, mode = 'MANUAL_OWNER') {
  if (!sameKeys(value, [...(internal ? SERVICE_KEYS : PUBLIC_KEYS), ...(claim ? ['shouldIssueDelete'] : [])])
    || value.operationId !== operationId || !id(value.targetUserId) || value.mode !== mode
    || !STATES.includes(value.state) || !(value.holdReason === null || HOLD_REASONS.includes(value.holdReason))
    || !count(value.pgRowsRemoved) || !(value.d1DeletedCount === null || count(value.d1DeletedCount))
    || ['pgStageCommitted', 'authAbsent', 'd1Acknowledged', 'complete'].some(key => typeof value[key] !== 'boolean')
    || value.complete !== (value.state === 'COMPLETE') || value.d1Acknowledged !== value.complete
    || value.d1Acknowledged !== (value.d1DeletedCount !== null)
    || value.pgStageCommitted !== ['PG_STAGED_AUTH_PENDING', 'AUTH_ATTEMPTED', 'AUTH_ABSENT_D1_PENDING', 'COMPLETE'].includes(value.state)
    || value.authAbsent !== ['AUTH_ABSENT_D1_PENDING', 'COMPLETE'].includes(value.state)
    || value.complete && value.holdReason !== null) fail('ACCOUNT_ERASURE_SCHEMA_UNAVAILABLE');
  if (internal && (!(value.authAttemptId === null || id(value.authAttemptId))
    || !(value.authUserCreatedAt === null || generation(value.authUserCreatedAt))
    || !(value.d1OwnerSubject === null || subject(value.d1OwnerSubject))
    || value.authAbsent && (!value.authAttemptId || !value.d1OwnerSubject)
    || value.state === 'AUTH_ATTEMPTED' && (!value.authAttemptId || !value.authUserCreatedAt || !value.d1OwnerSubject))) {
    fail('ACCOUNT_ERASURE_SCHEMA_UNAVAILABLE');
  }
  if (claim && (typeof value.shouldIssueDelete !== 'boolean' || value.shouldIssueDelete
    && (value.state !== 'AUTH_ATTEMPTED' || value.holdReason !== null))) fail('ACCOUNT_ERASURE_SCHEMA_UNAVAILABLE');
  return value;
}
function publicStatus(value) { return Object.fromEntries(PUBLIC_KEYS.map(key => [key, value[key]])); }
function held(status) {
  return status.holdReason !== null && !(status.pgStageCommitted
    && ['STORAGE_CATALOG_UNKNOWN', 'STORAGE_POLICY_UNQUALIFIED', 'STORAGE_OWNERSHIP'].includes(status.holdReason));
}

function configured(name) {
  const value = Deno.env.get(name)?.trim();
  if (!value) fail('ACCOUNT_ERASURE_NOT_CONFIGURED');
  return value;
}
function configuration() {
  const base = new URL(configured('SUPABASE_URL'));
  if (base.protocol !== 'https:' || !base.hostname.endsWith('.supabase.co') || base.pathname !== '/'
    || base.username || base.password || base.port || base.search || base.hash) fail('ACCOUNT_ERASURE_NOT_CONFIGURED');
  return { base: base.origin, anon: configured('SUPABASE_ANON_KEY') };
}
function serviceHeaders(key) {
  return { apikey: key, ...(!key.startsWith('sb_secret_') ? { Authorization: 'Bearer ' + key } : {}) };
}
// One bounded request, including its body. No transport/status retry and no body logging.
async function requestJson(url, init, maxBytes=8192) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8_000);
  let reader;
  try {
    const response = await fetch(url, { ...init, redirect: 'error', cache: 'no-store', signal: controller.signal });
    reader = response.body?.getReader();
    if (!reader) fail();
    const chunks = []; let size = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength; if (size > maxBytes) fail('ACCOUNT_ERASURE_RESPONSE_BOUND');
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return { status: response.status, ok: response.ok,
      data: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) };
  } catch (error) {
    if (error instanceof GatewayError) throw error;
    fail();
  } finally {
    clearTimeout(timer); controller.abort();
    if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
}
async function rpc(config, name, parameters, headers, maxBytes=8192) {
  const response = await requestJson(config.base + '/rest/v1/rpc/' + name, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(parameters),
  },maxBytes);
  if (!response.ok) {
    if (response.data?.message === 'ACCOUNT_ERASURE_OWNER_REQUIRED') fail('ACCOUNT_ERASURE_OWNER_REQUIRED', 403);
    if (response.data?.message === 'ACCOUNT_ERASURE_OPERATION_UNKNOWN') fail('ACCOUNT_ERASURE_OPERATION_UNKNOWN', 409);
    if (response.status === 404) fail('ACCOUNT_ERASURE_SCHEMA_UNAVAILABLE');
    fail('ACCOUNT_ERASURE_RPC_REJECTED');
  }
  return response.data;
}

export async function runManualAccountErasure(request, actorId, payload) {
  validateManualAccountErasurePayload(payload);
  if (!id(actorId) || !request.headers.get('authorization')) fail('ACCOUNT_ERASURE_OWNER_REQUIRED', 403);
  const config = configuration(), operationId = payload.operationId;
  const ownerHeaders = { apikey: config.anon, authorization: request.headers.get('authorization') };
  if(payload.operation===OPERATIONS[3]){
    // Only this64-row public-metadata read uses the existing32KiB read bound;
    // Auth, mutations and every other RPC retain their8KiB response cap.
    const value=await rpc(config,'list_account_erasure_operations',{p_after:payload.afterOperationId??null},ownerHeaders,32768);
    if(!sameKeys(value,['scope','rows','truncated'])||value.scope!=='own-account-erasure-operations'
      ||!Array.isArray(value.rows)||value.rows.length>64||typeof value.truncated!=='boolean'
      ||value.truncated&&value.rows.length!==64)fail('ACCOUNT_ERASURE_SCHEMA_UNAVAILABLE');
    let previous=payload.afterOperationId?.toLowerCase()??null;
    for(const row of value.rows){
      if(!id(row?.operationId)||previous!==null&&row.operationId.toLowerCase()<=previous)fail('ACCOUNT_ERASURE_SCHEMA_UNAVAILABLE');
      checkedStatus(row,row.operationId);previous=row.operationId.toLowerCase();
    }
    return value;
  }
  const readOwner = async () => checkedStatus(await rpc(config, 'get_account_erasure_status', { p_operation: operationId }, ownerHeaders), operationId);
  if (payload.operation === OPERATIONS[1]) return readOwner();
  if (payload.operation === OPERATIONS[0]) {
    let result;
    try { result = checkedStatus(await rpc(config, 'prepare_account_erasure', {
      p_operation: operationId, p_target: payload.targetUserId,
    }, ownerHeaders), operationId); }
    catch { result = await readOwner(); }
    if (result.targetUserId !== payload.targetUserId || result.targetUserId === actorId) fail('ACCOUNT_ERASURE_TARGET_CHANGED', 409);
    return result;
  }

  return resumeAccountErasure({
    config, operationId, actorId, attempt: payload.attemptId,
    stage: () => rpc(config, 'stage_account_erasure_pg', {
      p_operation: operationId, p_confirmation: 'STAGE-MANUAL-ACCOUNT-PG-ERASURE',
    }, ownerHeaders),
  });
}

const AUTOMATIC_WORK_KEYS = ['noticeId', 'targetUserId', 'actorId', 'revision', 'authUserCreatedAt', 'recipientDigest', 'kind'];
const AUTOMATIC_BATCH_LIMIT = 2;

export const AUTOMATIC_ACCOUNT_ERASURE_HEADER = 'X-RavRadar-Automatic-Account-Erasure';

export async function requireAccountAutomationRequest(request, kind) {
  if (request.method !== 'POST' || request.headers.has('origin') || request.body !== null
    || !['schedule-v1', 'notice-v1'].includes(kind) || request.headers.get(AUTOMATIC_ACCOUNT_ERASURE_HEADER) !== kind) {
    fail('ACCOUNT_ERASURE_SCHEDULE_FORBIDDEN', 403);
  }
  const key = configured('SUPABASE_SERVICE_ROLE_KEY');
  const expectedAuthorization = key.startsWith('sb_secret_') ? key : 'Bearer ' + key;
  const authorization = request.headers.get(key.startsWith('sb_secret_') ? 'apikey' : 'authorization');
  if (key.length < 32 || !authorization || authorization.length !== expectedAuthorization.length)
    fail('ACCOUNT_ERASURE_SCHEDULE_FORBIDDEN', 403);
  const [expected, actual] = await Promise.all([sha256Hex(expectedAuthorization), sha256Hex(authorization)]);
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  if (mismatch) fail('ACCOUNT_ERASURE_SCHEDULE_FORBIDDEN', 403);
}

export async function runScheduledAccountErasure(request) {
  await requireAccountAutomationRequest(request, 'schedule-v1');
  return runAutomaticAccountErasureBatch();
}

export async function runAutomaticAccountErasureBatch() {
  const config = configuration();
  const headers = serviceHeaders(configured('SUPABASE_SERVICE_ROLE_KEY'));
  const work = await rpc(config, 'list_account_automatic_erasure_work', {}, headers);
  if (!sameKeys(work, ['scope', 'rows']) || work.scope !== 'account-automatic-erasure-work'
    || !Array.isArray(work.rows) || work.rows.length > AUTOMATIC_BATCH_LIMIT) fail('ACCOUNT_ERASURE_SCHEMA_UNAVAILABLE');
  const notices = new Set(), subjects = new Set();
  for (const row of work.rows) {
    if (!sameKeys(row, AUTOMATIC_WORK_KEYS) || !id(row.noticeId) || !id(row.targetUserId) || !id(row.actorId)
      || row.actorId === row.targetUserId || notices.has(row.noticeId) || subjects.has(row.targetUserId)
      || !['STAGE', 'RESUME'].includes(row.kind) || typeof row.revision !== 'string'
      || !/^[1-9][0-9]{0,18}$/.test(row.revision) || BigInt(row.revision) > 9223372036854775807n
      || !generation(row.authUserCreatedAt) || typeof row.recipientDigest !== 'string'
      || !/^[a-f0-9]{64}$/.test(row.recipientDigest)) fail('ACCOUNT_ERASURE_SCHEMA_UNAVAILABLE');
    notices.add(row.noticeId);
    subjects.add(row.targetUserId);
  }
  const result = { selected: work.rows.length, completed: 0, pending: 0, failed: 0 };
  const started = performance.now();
  for (const row of work.rows) {
    if (performance.now() - started >= 45_000) {
      result.pending += 1;
      continue;
    }
    try {
      const status = await resumeAccountErasure({
        config, operationId: row.noticeId, actorId: row.actorId, attempt: crypto.randomUUID(),
        automatic: row, stage: () => stageAutomaticAccountErasure(config, headers, row),
      });
      if (status.complete) result.completed += 1;
      else result.pending += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}

async function noticeTargetMatches(user, row) {
  return user?.id === row.targetUserId && user.created_at === row.authUserCreatedAt
    && typeof user.email === 'string' && user.email.length <= 254
    && await sha256Hex(JSON.stringify(inactivityNoticeBody(user.email, false))) === row.recipientDigest;
}

async function stageAutomaticAccountErasure(config, headers, row) {
  const response = await requestJson(config.base + '/auth/v1/admin/users/' + row.targetUserId, { method: 'GET', headers });
  if (response.status !== 200 || !await noticeTargetMatches(response.data, row)) {
    fail('ACCOUNT_ERASURE_NOTICE_TARGET_CHANGED', 409);
  }
  await rpc(config, 'stage_account_automatic_erasure', {
    p_notice: row.noticeId, p_revision: row.revision, p_auth_user_created_at: row.authUserCreatedAt,
    p_recipient_digest: row.recipientDigest,
  }, headers);
}

async function resumeAccountErasure({ config, operationId, actorId, attempt, stage, automatic = null }) {
  const key = configured('SUPABASE_SERVICE_ROLE_KEY'), headers = serviceHeaders(key);
  const actor = { p_operation: operationId, p_actor: actorId };
  const mode = automatic ? 'AUTOMATIC_INACTIVITY' : 'MANUAL_OWNER';
  let boundTarget = automatic?.targetUserId ?? null;
  const serviceStatus = (value, claim = false) => {
    const status = checkedStatus(value, operationId, true, claim, mode);
    if (status.targetUserId === actorId || boundTarget !== null && status.targetUserId !== boundTarget) fail('ACCOUNT_ERASURE_TARGET_CHANGED', 409);
    boundTarget = status.targetUserId;
    return status;
  };
  const readService = async () => serviceStatus(await rpc(config, 'get_account_erasure_service_status', actor, headers));
  // A new automatic candidate has no erasure row until atomic inactivity admission.
  let status = automatic?.kind === 'STAGE' ? null : await readService();
  if (status && (status.complete || held(status))) return publicStatus(status);
  if (tripStorageMode() !== 'd1') fail('ACCOUNT_ERASURE_STORAGE_NOT_READY');
  const pseudonymSecret = configured('TRIP_PSEUDONYM_SECRET_V1');
  const owner = await externalOwnerSubject({ userId: status?.targetUserId ?? boundTarget, secret: pseudonymSecret });
  const d1Subject = owner.subject, gatewayUrl = normalizeCloudflareGatewayUrl(configured('CLOUDFLARE_TRIP_GATEWAY_URL')),
    sharedSecret = configured('TRIP_GATEWAY_SHARED_SECRET');
  if (!subject(d1Subject) || sharedSecret.length < 32 || status?.d1OwnerSubject && status.d1OwnerSubject !== d1Subject) {
    fail('ACCOUNT_ERASURE_SUBJECT_CHANGED', 409);
  }
  if (!status?.pgStageCommitted) {
    try { await stage(); } catch { /* Reconcile the same UUID, never infer commit from HTTP. */ }
    status = await readService();
    if (status.holdReason !== null) return publicStatus(status);
    if (!status.pgStageCommitted) fail('ACCOUNT_ERASURE_OUTCOME_UNKNOWN');
  }
  const target = status.targetUserId;
  const adminRead = async () => {
    const result = await requestJson(config.base + '/auth/v1/admin/users/' + target, { method: 'GET', headers });
    if (result.status === 404 && result.data?.code === 404 && result.data?.error_code === 'user_not_found') return null;
    if (result.status !== 200 || result.data?.id !== target || !generation(result.data.created_at)) fail('ACCOUNT_ERASURE_AUTH_OUTCOME_UNKNOWN');
    if (status.authUserCreatedAt !== null && result.data.created_at !== status.authUserCreatedAt) fail('ACCOUNT_ERASURE_AUTH_GENERATION_CHANGED', 409);
    if (automatic && !await noticeTargetMatches(result.data, automatic)) fail('ACCOUNT_ERASURE_NOTICE_TARGET_CHANGED', 409);
    return result.data.created_at; // Preserve the exact native string; never round through Date.
  };
  const acknowledgeAbsent = async () => {
    try {
      return serviceStatus(await rpc(config, 'acknowledge_account_erasure_auth_absent', {
        ...actor, p_previous_attempt: status.authAttemptId, p_attempt: attempt, p_d1_subject: d1Subject,
      }, headers));
    } catch { return readService(); }
  };
  if (!status.authAbsent) {
    const createdAt = await adminRead();
    if (createdAt === null) status = await acknowledgeAbsent();
    else {
      let claim;
      try {
        claim = serviceStatus(await rpc(config, 'claim_account_erasure_auth', {
          ...actor, p_previous_attempt: status.authAttemptId, p_attempt: attempt,
          p_auth_user_created_at: createdAt, p_d1_subject: d1Subject,
        }, headers), true);
      } catch { return publicStatus(await readService()); } // A lost token reply never permits DELETE.
      status = claim;
      if (claim.targetUserId !== target) fail('ACCOUNT_ERASURE_TARGET_CHANGED', 409);
      if (!claim.shouldIssueDelete) return publicStatus(status);
      if (claim.authAttemptId !== attempt || claim.authUserCreatedAt !== createdAt || claim.d1OwnerSubject !== d1Subject) {
        fail('ACCOUNT_ERASURE_CLAIM_CHANGED', 409);
      }
      try {
        await requestJson(config.base + '/auth/v1/admin/users/' + target, {
          method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ should_soft_delete: false }),
        });
      } catch { /* The normal admin GET below, never this reply, determines absence. */ }
      if (await adminRead() !== null) return publicStatus(await readService());
      status = await acknowledgeAbsent();
    }
  }
  if (!status.authAbsent || held(status)) return publicStatus(status);
  if (status.complete) return publicStatus(status);
  if (status.d1OwnerSubject !== d1Subject || !id(status.authAttemptId) || tripStorageMode() !== 'd1') fail('ACCOUNT_ERASURE_STORAGE_NOT_READY');
  // This existing Worker operation establishes all ten tombstones, purges, then
  // physically asserts shard/registry absence before its positive count reply.
  let deleted;
  try {
    deleted = await deleteCloudflareTrips({ gatewayUrl, sharedSecret, ownerSubject: d1Subject,
      fetchImpl: async (url, init) => {
        const response = await requestJson(url, init);
        return { ok: response.ok, status: response.status, json: async () => response.data };
      } });
  } catch { fail('ACCOUNT_ERASURE_D1_PENDING'); }
  if (!count(deleted) || tripStorageMode() !== 'd1') fail('ACCOUNT_ERASURE_D1_PENDING');
  try {
    status = serviceStatus(await rpc(config, 'acknowledge_account_erasure_d1', {
      ...actor, p_attempt: status.authAttemptId, p_d1_subject: d1Subject, p_deleted_count: deleted,
    }, headers));
  } catch { status = await readService(); }
  return publicStatus(status); // Only the durable SQL ACK may report COMPLETE.
}

// Existing bounded, no-retry server transport. Notice code receives no erasure authority.
export { configuration as accountLifecycleConfiguration, configured as accountLifecycleSetting,
  serviceHeaders as accountLifecycleServiceHeaders, requestJson as accountLifecycleRequestJson,
  rpc as accountLifecycleRpc };
