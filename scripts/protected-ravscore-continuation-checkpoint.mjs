#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSupabaseAdminHeaders,
  isRetryableStatementTimeout,
  isRetryableTranslatedSecretAuthError,
} from './lib/supabase-admin-rest.mjs';
import {
  loadRavScoreContinuationCheckpointForTarget,
  RAVSCORE_CONTINUATION_CHECKPOINT_POLICY,
} from './ravscore-continuation-checkpoint.mjs';

export const PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY =
  'ravscore-continuation-checkpoint';
export const PROTECTED_RAVSCORE_CHECKPOINT_PATH =
  '.cache/ravscore-continuation-checkpoint/checkpoint.json';
export const PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_ALLOWLIST = Object.freeze([
  PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
]);
export const PROTECTED_RAVSCORE_CHECKPOINT_RPC =
  'ravradar_ravscore_checkpoint_cas';
export const PROTECTED_RAVSCORE_CHECKPOINT_RPC_MAXIMUM_RESPONSE_BYTES = 4 * 1024;
export const PROTECTED_RAVSCORE_CHECKPOINT_RESTORE_RESPONSE_ENVELOPE_BYTES = 4 * 1024;
export const PROTECTED_RAVSCORE_CHECKPOINT_RESTORE_MAXIMUM_RESPONSE_BYTES =
  RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumSerializedBytes
  + PROTECTED_RAVSCORE_CHECKPOINT_RESTORE_RESPONSE_ENVELOPE_BYTES;

const isPlainObject = value => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;

function safeMetadata(loaded) {
  return {
    checkpointAt: loaded.checkpointAt,
    targetReferenceAt: loaded.targetReferenceAt,
    ageHours: loaded.ageHours,
    continuationAvailable: loaded.continuationAvailable,
    partCount: loaded.partCount,
    modelId: loaded.modelId,
    stateSchemaVersion: loaded.stateSchemaVersion,
    modelContractSha256: loaded.modelContractSha256,
    modelBundleSha256: loaded.modelBundleSha256,
    continuationStateContractSha256: loaded.continuationStateContractSha256,
  };
}

async function validateCheckpointPayload({
  payload,
  targetReference,
  temporaryRoot,
}) {
  if (!isPlainObject(payload)) {
    throw new Error('Protected RavScore checkpoint payload must be an object');
  }
  const root = temporaryRoot ?? os.tmpdir();
  await fs.mkdir(root, { recursive: true });
  const directory = await fs.mkdtemp(path.join(root, 'ravscore-protected-validation-'));
  const candidate = path.join(directory, 'checkpoint.json');
  try {
    await fs.writeFile(candidate, `${JSON.stringify(payload)}\n`, { mode: 0o600 });
    const loaded = await loadRavScoreContinuationCheckpointForTarget({
      checkpointPath: candidate,
      targetReference,
      expectedPartCount: RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount,
    });
    if (!loaded.loaded) {
      throw new Error('Protected RavScore checkpoint validation produced no checkpoint');
    }
    return loaded;
  } finally {
    await fs.rm(directory, { recursive: true, force: true }).catch(() => {});
  }
}

function assertProtectedCheckpointTarget(checkpointPath) {
  if (typeof checkpointPath !== 'string' || !checkpointPath.trim()) {
    throw new Error('Protected RavScore checkpoint target path is missing');
  }
  const resolved = path.resolve(checkpointPath);
  const suffix = path.join(
    '.cache',
    'ravscore-continuation-checkpoint',
    'checkpoint.json',
  );
  const comparison = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  const expectedSuffix = process.platform === 'win32' ? suffix.toLowerCase() : suffix;
  if (!comparison.endsWith(`${path.sep}${expectedSuffix}`)) {
    throw new Error(
      'Protected RavScore checkpoint restore target must be the dedicated .cache path',
    );
  }
  return resolved;
}

async function assertNoSymlinkComponents(resolvedPath) {
  const parsed = path.parse(resolvedPath);
  const parts = path.relative(parsed.root, resolvedPath).split(path.sep).filter(Boolean);
  let current = parsed.root;
  for (const part of parts) {
    current = path.join(current, part);
    let stats;
    try {
      stats = await fs.lstat(current);
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    if (stats.isSymbolicLink()) {
      throw new Error('Protected RavScore checkpoint path must not traverse a symlink');
    }
  }
}

function checkpointsAreEquivalent(left, right) {
  const fields = [
    'schemaVersion',
    'status',
    'datasetId',
    'productionReferenceAt',
    'continuationStateContractSha256',
    'generationSha256',
    'partCount',
    'stateSha256',
  ];
  return fields.every(field => left?.[field] === right?.[field])
    && JSON.stringify(left?.modelBinding) === JSON.stringify(right?.modelBinding)
    && JSON.stringify(left?.candidateGRollbackCompanion)
      === JSON.stringify(right?.candidateGRollbackCompanion);
}

async function invokeProtectedRequest(request, suffix, options, operation) {
  if (typeof request !== 'function') {
    throw new Error('Protected RavScore checkpoint requester is missing');
  }
  try {
    return await request(suffix, options, operation);
  } catch (error) {
    const wrapped = new Error(`Protected RavScore checkpoint ${operation} failed closed`);
    wrapped.code = 'PROTECTED_RAVSCORE_CHECKPOINT_REMOTE_ERROR';
    wrapped.cause = error;
    throw wrapped;
  }
}

async function readExactProtectedCheckpointRow(request, { allowMissing }) {
  const key = PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY;
  const rows = await invokeProtectedRequest(
    request,
    `?document_key=eq.${encodeURIComponent(key)}&select=document_key,payload,version&limit=2`,
    {},
    'read',
  );
  if (!Array.isArray(rows)) {
    throw new Error('Protected RavScore checkpoint readback is not a row set');
  }
  if (rows.length === 0) {
    if (allowMissing) return null;
    throw new Error('Protected RavScore checkpoint readback is missing');
  }
  if (rows.length !== 1) {
    throw new Error('Protected RavScore checkpoint readback is not unique');
  }
  const row = rows[0];
  if (!isPlainObject(row)
    || row.document_key !== key
    || !Number.isSafeInteger(row.version)
    || row.version < 1
    || !PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_ALLOWLIST.includes(row.document_key)) {
    throw new Error('Protected RavScore checkpoint readback has an unexpected document key');
  }
  if (!isPlainObject(row.payload)) {
    throw new Error('Protected RavScore checkpoint readback has an invalid payload');
  }
  return row;
}

async function readExactProtectedCheckpointVersion(request, { allowMissing }) {
  const key = PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY;
  const rows = await invokeProtectedRequest(
    request,
    `?document_key=eq.${encodeURIComponent(key)}&select=document_key,version&limit=2`,
    {},
    'version read',
  );
  if (!Array.isArray(rows)) {
    throw new Error('Protected RavScore checkpoint version readback is not a row set');
  }
  if (rows.length === 0) {
    if (allowMissing) return null;
    throw new Error('Protected RavScore checkpoint version readback is missing');
  }
  if (rows.length !== 1) {
    throw new Error('Protected RavScore checkpoint version readback is not unique');
  }
  const row = rows[0];
  if (!isPlainObject(row)
    || Object.keys(row).sort().join(',') !== 'document_key,version'
    || row.document_key !== key
    || !Number.isSafeInteger(row.version)
    || row.version < 1
    || !PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_ALLOWLIST.includes(row.document_key)) {
    throw new Error('Protected RavScore checkpoint version readback is invalid');
  }
  return { documentKey: key, version: row.version };
}

async function readLocalCheckpointPayload(checkpointPath) {
  checkpointPath = assertProtectedCheckpointTarget(checkpointPath);
  await assertNoSymlinkComponents(checkpointPath);
  let handle;
  try {
    handle = await fs.open(checkpointPath, 'r');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error('Local protected RavScore checkpoint is missing');
    }
    throw error;
  }
  let text;
  try {
    const maximumBytes =
      RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumSerializedBytes;
    const [stat, currentPathStat] = await Promise.all([
      handle.stat(),
      fs.lstat(checkpointPath),
    ]);
    if (!stat.isFile()
      || currentPathStat.isSymbolicLink()
      || (Number.isSafeInteger(stat.ino)
        && Number.isSafeInteger(currentPathStat.ino)
        && (stat.ino !== currentPathStat.ino || stat.dev !== currentPathStat.dev))
      || !Number.isSafeInteger(stat.size)
      || stat.size > maximumBytes) {
      throw new Error('Local protected RavScore checkpoint exceeds its serialized limit');
    }
    const bytes = Buffer.allocUnsafe(maximumBytes + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset > maximumBytes) {
      throw new Error('Local protected RavScore checkpoint exceeds its serialized limit');
    }
    text = bytes.subarray(0, offset).toString('utf8');
  } finally {
    await handle.close();
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Local protected RavScore checkpoint is not valid JSON');
  }
}

const parseRemoteJson = text => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

async function readResponseTextBounded(response, maximumBytes, label) {
  const contentLength = Number(response?.headers?.get?.('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new Error(`${label} exceeds its response bound`);
  }
  const reader = response?.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maximumBytes) {
      throw new Error(`${label} exceeds its response bound`);
    }
    return text;
  }
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    total += chunk.length;
    if (total > maximumBytes) {
      await reader.cancel().catch(() => {});
      throw new Error(`${label} exceeds its response bound`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, total).toString('utf8');
}

function requiredProtectedSupabaseConnection({ supabaseUrl, serviceRoleKey }) {
  const url = typeof supabaseUrl === 'string' ? supabaseUrl.trim().replace(/\/$/, '') : '';
  const key = typeof serviceRoleKey === 'string' ? serviceRoleKey.trim() : '';
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the protected RavScore checkpoint',
    );
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('SUPABASE_URL is invalid for the protected RavScore checkpoint');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password
    || parsed.search || parsed.hash) {
    throw new Error('SUPABASE_URL is invalid for the protected RavScore checkpoint');
  }
  return { url, key };
}

export function createProtectedRavScoreCheckpointRequester({
  supabaseUrl = process.env.SUPABASE_URL,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  fetchImpl = globalThis.fetch,
  delayImpl = ms => new Promise(resolve => setTimeout(resolve, ms)),
  retryDelayMs = 1_000,
  logger = message => console.warn(message),
} = {}) {
  const { url, key } = requiredProtectedSupabaseConnection({
    supabaseUrl,
    serviceRoleKey,
  });
  if (typeof fetchImpl !== 'function' || typeof delayImpl !== 'function'
    || !Number.isSafeInteger(retryDelayMs) || retryDelayMs < 0
    || typeof logger !== 'function') {
    throw new Error('Protected RavScore checkpoint restore requester configuration is invalid');
  }
  const expectedSuffix =
    `?document_key=eq.${encodeURIComponent(PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY)}`
    + '&select=document_key,payload,version&limit=2';
  const endpoint = `${url}/rest/v1/admin_documents${expectedSuffix}`;
  const headers = buildSupabaseAdminHeaders(key);
  return async function request(suffix, options = {}, operation = 'read') {
    if (suffix !== expectedSuffix
      || (options.method !== undefined && options.method !== 'GET')
      || options.body !== undefined
      || (options.headers !== undefined && Object.keys(options.headers).length > 0)) {
      throw new Error('Protected RavScore checkpoint restore requester rejected a non-read query');
    }
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      let response;
      try {
        response = await fetchImpl(endpoint, { method: 'GET', headers });
      } catch {
        if (attempt === 1) {
          logger(`Protected RavScore checkpoint restore response was unavailable; retrying once after ${retryDelayMs} ms`);
          await delayImpl(retryDelayMs);
          continue;
        }
        throw new Error(`Protected RavScore checkpoint ${operation} could not be reached`);
      }
      const responseText = await readResponseTextBounded(
        response,
        PROTECTED_RAVSCORE_CHECKPOINT_RESTORE_MAXIMUM_RESPONSE_BYTES,
        'Protected RavScore checkpoint restore response',
      );
      const parsedResponse = parseRemoteJson(responseText);
      if (response.ok) {
        if (!Array.isArray(parsedResponse)) {
          throw new Error('Protected RavScore checkpoint restore query returned invalid JSON');
        }
        return parsedResponse;
      }
      const translatedSecretAuth = isRetryableTranslatedSecretAuthError({
        key,
        status: response.status,
        body: responseText,
      });
      const statementTimeout = isRetryableStatementTimeout({
        status: response.status,
        body: responseText,
      });
      if (attempt === 1 && (translatedSecretAuth || statementTimeout)) {
        const reason = translatedSecretAuth ? 'PGRST303' : 'statement-timeout 57014';
        logger(`Protected RavScore checkpoint restore query received ${reason}; retrying once after ${retryDelayMs} ms`);
        await delayImpl(retryDelayMs);
        continue;
      }
      throw new Error(
        `Protected RavScore checkpoint ${operation} failed: HTTP ${response.status}`
        + `${parsedResponse?.code ? ` ${String(parsedResponse.code).slice(0, 32)}` : ''}`,
      );
    }
    throw new Error('Protected RavScore checkpoint restore query failed after its bounded retry');
  };
}

export function createProtectedRavScoreCheckpointVersionRequester({
  supabaseUrl = process.env.SUPABASE_URL,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  fetchImpl = globalThis.fetch,
  delayImpl = ms => new Promise(resolve => setTimeout(resolve, ms)),
  retryDelayMs = 1_000,
  logger = message => console.warn(message),
} = {}) {
  const { url, key } = requiredProtectedSupabaseConnection({
    supabaseUrl,
    serviceRoleKey,
  });
  if (typeof fetchImpl !== 'function' || typeof delayImpl !== 'function'
    || !Number.isSafeInteger(retryDelayMs) || retryDelayMs < 0
    || typeof logger !== 'function') {
    throw new Error('Protected RavScore checkpoint version requester configuration is invalid');
  }
  const expectedSuffix =
    `?document_key=eq.${encodeURIComponent(PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY)}`
    + '&select=document_key,version&limit=2';
  const endpoint = `${url}/rest/v1/admin_documents${expectedSuffix}`;
  const headers = buildSupabaseAdminHeaders(key);
  return async function request(suffix, options = {}, operation = 'version read') {
    if (suffix !== expectedSuffix
      || (options.method !== undefined && options.method !== 'GET')
      || options.body !== undefined
      || (options.headers !== undefined && Object.keys(options.headers).length > 0)) {
      throw new Error('Protected RavScore checkpoint version requester rejected a non-metadata query');
    }
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      let response;
      try {
        response = await fetchImpl(endpoint, { method: 'GET', headers });
      } catch {
        if (attempt === 1) {
          logger(`Protected RavScore checkpoint version response was unavailable; retrying once after ${retryDelayMs} ms`);
          await delayImpl(retryDelayMs);
          continue;
        }
        throw new Error(`Protected RavScore checkpoint ${operation} could not be reached`);
      }
      const responseText = await readResponseTextBounded(
        response,
        PROTECTED_RAVSCORE_CHECKPOINT_RPC_MAXIMUM_RESPONSE_BYTES,
        'Protected RavScore checkpoint version response',
      );
      const parsedResponse = parseRemoteJson(responseText);
      if (response.ok) {
        if (!Array.isArray(parsedResponse)) {
          throw new Error('Protected RavScore checkpoint version query returned invalid JSON');
        }
        return parsedResponse;
      }
      const translatedSecretAuth = isRetryableTranslatedSecretAuthError({
        key,
        status: response.status,
        body: responseText,
      });
      const statementTimeout = isRetryableStatementTimeout({
        status: response.status,
        body: responseText,
      });
      if (attempt === 1 && (translatedSecretAuth || statementTimeout)) {
        const reason = translatedSecretAuth ? 'PGRST303' : 'statement-timeout 57014';
        logger(`Protected RavScore checkpoint version query received ${reason}; retrying once after ${retryDelayMs} ms`);
        await delayImpl(retryDelayMs);
        continue;
      }
      throw new Error(
        `Protected RavScore checkpoint ${operation} failed: HTTP ${response.status}`
        + `${parsedResponse?.code ? ` ${String(parsedResponse.code).slice(0, 32)}` : ''}`,
      );
    }
    throw new Error('Protected RavScore checkpoint version query failed after its bounded retry');
  };
}

export function createProtectedRavScoreCheckpointRpcRequester({
  supabaseUrl = process.env.SUPABASE_URL,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  fetchImpl = globalThis.fetch,
  delayImpl = ms => new Promise(resolve => setTimeout(resolve, ms)),
  retryDelayMs = 1_000,
  logger = message => console.warn(message),
} = {}) {
  const { url, key } = requiredProtectedSupabaseConnection({
    supabaseUrl,
    serviceRoleKey,
  });
  if (typeof fetchImpl !== 'function' || typeof delayImpl !== 'function'
    || !Number.isSafeInteger(retryDelayMs) || retryDelayMs < 0
    || typeof logger !== 'function') {
    throw new Error('Protected RavScore checkpoint RPC requester configuration is invalid');
  }
  const endpoint = `${url}/rest/v1/rpc/${PROTECTED_RAVSCORE_CHECKPOINT_RPC}`;
  const headers = buildSupabaseAdminHeaders(key);
  return async function request(body, operation = 'metadata compare-and-swap') {
    const expectedBodyKeys = ['p_expected_version', 'p_payload', 'p_target_reference'];
    if (!isPlainObject(body)
      || JSON.stringify(Object.keys(body).sort()) !== JSON.stringify(expectedBodyKeys)
      || !Number.isSafeInteger(body.p_expected_version)
      || body.p_expected_version < 0
      || typeof body.p_target_reference !== 'string'
      || !isPlainObject(body.p_payload)
      || body.p_payload.productionReferenceAt !== body.p_target_reference
      || Buffer.byteLength(`${JSON.stringify(body.p_payload)}\n`, 'utf8')
        > RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumSerializedBytes) {
      throw new Error('Protected RavScore checkpoint RPC body is invalid');
    }
    const serializedBody = JSON.stringify(body);
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      let response;
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          headers,
          body: serializedBody,
        });
      } catch {
        if (attempt === 1) {
          logger(`Protected RavScore checkpoint RPC network response was unavailable; retrying once after ${retryDelayMs} ms`);
          await delayImpl(retryDelayMs);
          continue;
        }
        throw new Error('Protected RavScore checkpoint RPC could not be reached');
      }
      const responseText = await readResponseTextBounded(
        response,
        PROTECTED_RAVSCORE_CHECKPOINT_RPC_MAXIMUM_RESPONSE_BYTES,
        'Protected RavScore checkpoint RPC response',
      );
      const parsedResponse = parseRemoteJson(responseText);
      if (response.ok) {
        if (!isPlainObject(parsedResponse)) {
          throw new Error('Protected RavScore checkpoint RPC returned invalid metadata JSON');
        }
        return parsedResponse;
      }
      const translatedSecretAuth = isRetryableTranslatedSecretAuthError({
        key,
        status: response.status,
        body: responseText,
      });
      const statementTimeout = isRetryableStatementTimeout({
        status: response.status,
        body: responseText,
      });
      if (attempt === 1 && (translatedSecretAuth || statementTimeout)) {
        const reason = translatedSecretAuth ? 'PGRST303' : 'statement-timeout 57014';
        logger(`Protected RavScore checkpoint RPC received ${reason}; retrying once after ${retryDelayMs} ms`);
        await delayImpl(retryDelayMs);
        continue;
      }
      throw new Error(
        `Protected RavScore checkpoint RPC ${operation} failed: HTTP ${response.status}`
        + `${parsedResponse?.code ? ` ${String(parsedResponse.code).slice(0, 32)}` : ''}`,
      );
    }
    throw new Error('Protected RavScore checkpoint RPC failed after its bounded retry');
  };
}

function validateCheckpointRpcMetadata(value, { local, expectedVersion }) {
  const expectedKeys = [
    'candidatePartCount',
    'centralVersion',
    'disposition',
    'documentKey',
    'generationSha256',
    'modelBundleSha256',
    'modelContractSha256',
    'modelId',
    'partCount',
    'productionReferenceAt',
    'schemaVersion',
    'stateSchemaVersion',
  ];
  if (!isPlainObject(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(expectedKeys)
    || value.schemaVersion !== '1.0.0'
    || value.documentKey !== PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY
    || !['inserted', 'updated', 'unchanged'].includes(value.disposition)
    || !Number.isSafeInteger(value.centralVersion)
    || value.centralVersion < 1
    || !Number.isSafeInteger(value.partCount)
    || value.partCount !== RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount
    || !Number.isSafeInteger(value.candidatePartCount)
    || value.candidatePartCount
      !== RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount
    || value.productionReferenceAt !== local.checkpointAt
    || value.modelId !== local.modelId
    || value.stateSchemaVersion !== local.stateSchemaVersion
    || value.modelContractSha256 !== local.modelContractSha256
    || value.modelBundleSha256 !== local.modelBundleSha256
    || value.generationSha256 !== local.generationSha256) {
    throw new Error('Protected RavScore checkpoint RPC metadata is incompatible');
  }
  const centralVersion = value.centralVersion;
  if (value.disposition === 'inserted'
    && (expectedVersion !== 0 || centralVersion !== 1)) {
    throw new Error('Protected RavScore checkpoint RPC insert metadata is inconsistent');
  }
  if (value.disposition === 'updated'
    && (expectedVersion < 1 || centralVersion !== expectedVersion + 1)) {
    throw new Error('Protected RavScore checkpoint RPC update metadata is inconsistent');
  }
  if (value.disposition === 'unchanged'
    && centralVersion !== expectedVersion
    && centralVersion !== expectedVersion + 1) {
    throw new Error('Protected RavScore checkpoint RPC retry metadata is inconsistent');
  }
  return { ...value, centralVersion };
}

async function invokeProtectedCheckpointRpc(rpcRequest, body) {
  if (typeof rpcRequest !== 'function') {
    throw new Error('Protected RavScore checkpoint RPC requester is missing');
  }
  try {
    return await rpcRequest(body, 'publish');
  } catch (error) {
    const wrapped = new Error('Protected RavScore checkpoint RPC publish failed closed');
    wrapped.code = 'PROTECTED_RAVSCORE_CHECKPOINT_REMOTE_ERROR';
    wrapped.cause = error;
    throw wrapped;
  }
}

export async function publishProtectedRavScoreContinuationCheckpoint({
  checkpointPath = PROTECTED_RAVSCORE_CHECKPOINT_PATH,
  targetReference,
  request,
  rpcRequest,
  temporaryRoot,
} = {}) {
  checkpointPath = assertProtectedCheckpointTarget(checkpointPath);
  await assertNoSymlinkComponents(checkpointPath);
  const prevalidated = await loadRavScoreContinuationCheckpointForTarget({
    checkpointPath,
    targetReference,
    expectedPartCount: RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount,
  });
  if (!prevalidated.loaded) {
    throw new Error('Local protected RavScore checkpoint is missing');
  }
  const payload = await readLocalCheckpointPayload(checkpointPath);
  const local = await validateCheckpointPayload({
    payload,
    targetReference,
    temporaryRoot,
  });
  if (!local.continuationAvailable) {
    throw new Error('Expired schema-6 continuation checkpoints cannot be published');
  }
  const key = PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY;
  const existingVersion = await readExactProtectedCheckpointVersion(
    request,
    { allowMissing: true },
  );
  const expectedVersion = existingVersion?.version ?? 0;
  const metadata = validateCheckpointRpcMetadata(
    await invokeProtectedCheckpointRpc(rpcRequest, {
      p_expected_version: expectedVersion,
      p_target_reference: local.checkpointAt,
      p_payload: payload,
    }),
    { local, expectedVersion },
  );
  const changed = metadata.disposition !== 'unchanged';
  return {
    published: changed,
    reason: changed
      ? `protected-checkpoint-${metadata.disposition}`
      : 'protected-checkpoint-already-current',
    documentKey: key,
    centralVersion: metadata.centralVersion,
    ...safeMetadata(local),
    payloadLogged: false,
    preexistingHistoricalVersionsPreserved: true,
    newHistoricalVersionsRetained: false,
  };
}

export async function restoreProtectedRavScoreContinuationCheckpoint({
  checkpointPath = PROTECTED_RAVSCORE_CHECKPOINT_PATH,
  targetReference,
  request,
} = {}) {
  checkpointPath = assertProtectedCheckpointTarget(checkpointPath);
  await assertNoSymlinkComponents(checkpointPath);
  const row = await readExactProtectedCheckpointRow(request, { allowMissing: true });
  if (!row) {
    return {
      restored: false,
      reason: 'protected-checkpoint-not-found',
      documentKey: PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
      targetUnchanged: true,
    };
  }

  const directory = path.dirname(checkpointPath);
  await fs.mkdir(directory, { recursive: true });
  await assertNoSymlinkComponents(checkpointPath);
  const temporary = path.join(
    directory,
    `.checkpoint.remote-${process.pid}-${crypto.randomBytes(6).toString('hex')}.tmp`,
  );
  try {
    await fs.writeFile(temporary, `${JSON.stringify(row.payload)}\n`, { mode: 0o600 });
    const loaded = await loadRavScoreContinuationCheckpointForTarget({
      checkpointPath: temporary,
      targetReference,
      expectedPartCount: RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount,
    });
    if (!loaded.loaded) {
      throw new Error('Protected RavScore checkpoint restore produced no checkpoint');
    }
    const normalizedRemotePayload = JSON.parse(
      await fs.readFile(temporary, 'utf8'),
    );

    let localPayload = null;
    let local = null;
    const localCandidate = await loadRavScoreContinuationCheckpointForTarget({
      checkpointPath,
      targetReference,
      expectedPartCount: RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount,
    });
    if (localCandidate.loaded) {
      local = localCandidate;
      localPayload = await readLocalCheckpointPayload(checkpointPath);
    } else if (localCandidate.reason !== 'checkpoint-not-found') {
      throw new Error(
        'Local protected RavScore checkpoint validation produced no checkpoint',
      );
    }

    if (local) {
      const remoteMs = Date.parse(loaded.checkpointAt);
      const localMs = Date.parse(local.checkpointAt);
      if (localMs > remoteMs) {
        await fs.rm(temporary, { force: true });
        return {
          restored: false,
          reason: 'local-checkpoint-newer',
          documentKey: PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
          targetUnchanged: true,
          ...safeMetadata(local),
          payloadLogged: false,
        };
      }
      if (localMs === remoteMs) {
        if (!checkpointsAreEquivalent(localPayload, normalizedRemotePayload)) {
          throw new Error(
            'Local and protected RavScore checkpoints conflict at the same reference time',
          );
        }
        await fs.rm(temporary, { force: true });
        return {
          restored: false,
          reason: 'protected-checkpoint-equivalent',
          documentKey: PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
          targetUnchanged: true,
          ...safeMetadata(local),
          payloadLogged: false,
        };
      }
    }
    await fs.rename(temporary, checkpointPath);
    return {
      restored: true,
      reason: loaded.continuationReattestedFromImplementationSha256
        ? 'protected-checkpoint-restored-after-compatible-predecessor-reattest'
        : 'protected-checkpoint-restored',
      documentKey: PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
      ...safeMetadata(loaded),
      payloadLogged: false,
    };
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function parseArgs(argv) {
  const result = { mode: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--publish' || value === '--restore') {
      if (result.mode) throw new Error('Use exactly one of --publish or --restore');
      result.mode = value.slice(2);
    } else if (value === '--target-reference') {
      result.targetReference = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  if (!result.mode) throw new Error('Use --publish or --restore');
  result.targetReference ??= process.env.RAVRADAR_PRODUCTION_TARGET_HOUR;
  if (!result.targetReference) throw new Error('--target-reference is required');
  result.targetReference = new Date(result.targetReference).toISOString();
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const request = options.mode === 'publish'
    ? createProtectedRavScoreCheckpointVersionRequester()
    : createProtectedRavScoreCheckpointRequester();
  const rpcRequest = options.mode === 'publish'
    ? createProtectedRavScoreCheckpointRpcRequester()
    : null;
  const result = options.mode === 'publish'
    ? await publishProtectedRavScoreContinuationCheckpoint({
      targetReference: options.targetReference,
      request,
      rpcRequest,
    })
    : await restoreProtectedRavScoreContinuationCheckpoint({
      targetReference: options.targetReference,
      request,
    });
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
