#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSupabaseAdminRequester } from './lib/supabase-admin-rest.mjs';
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
    || !Number.isSafeInteger(Number(row.version))
    || Number(row.version) < 1
    || !PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_ALLOWLIST.includes(row.document_key)) {
    throw new Error('Protected RavScore checkpoint readback has an unexpected document key');
  }
  if (!isPlainObject(row.payload)) {
    throw new Error('Protected RavScore checkpoint readback has an invalid payload');
  }
  return row;
}

async function readLocalCheckpointPayload(checkpointPath) {
  let text;
  try {
    text = await fs.readFile(checkpointPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error('Local protected RavScore checkpoint is missing');
    }
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Local protected RavScore checkpoint is not valid JSON');
  }
}

export function createProtectedRavScoreCheckpointRequester({
  supabaseUrl = process.env.SUPABASE_URL,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  fetchImpl = globalThis.fetch,
  delayImpl,
  retryDelayMs,
  logger,
} = {}) {
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
  return createSupabaseAdminRequester({
    endpoint: `${url}/rest/v1/admin_documents`,
    key,
    fetchImpl,
    ...(delayImpl === undefined ? {} : { delayImpl }),
    ...(retryDelayMs === undefined ? {} : { retryDelayMs }),
    ...(logger === undefined ? {} : { logger }),
  });
}

export async function publishProtectedRavScoreContinuationCheckpoint({
  checkpointPath = PROTECTED_RAVSCORE_CHECKPOINT_PATH,
  targetReference,
  request,
  temporaryRoot,
} = {}) {
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
  const existingRow = await readExactProtectedCheckpointRow(request, { allowMissing: true });
  let expectedVersion;
  let mutation;
  if (!existingRow) {
    const inserted = await invokeProtectedRequest(
      request,
      '?on_conflict=document_key&select=document_key,payload,version',
      {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify({ document_key: key, payload, updated_by: null }),
      },
      'publish insert',
    );
    if (!Array.isArray(inserted) || inserted.length !== 1) {
      throw new Error('Protected RavScore checkpoint insert lost a concurrent write');
    }
    expectedVersion = Number(inserted[0].version);
    mutation = 'inserted';
  } else {
    const existing = await validateCheckpointPayload({
      payload: existingRow.payload,
      targetReference,
      temporaryRoot,
    });
    const existingMs = Date.parse(existing.checkpointAt);
    const localMs = Date.parse(local.checkpointAt);
    if (existingMs > localMs) {
      throw new Error('Protected RavScore checkpoint publish would regress central state');
    }
    if (existingMs === localMs) {
      if (!checkpointsAreEquivalent(existingRow.payload, payload)) {
        throw new Error(
          'Local and protected RavScore checkpoints conflict at the same reference time',
        );
      }
      return {
        published: false,
        reason: 'protected-checkpoint-already-current',
        documentKey: key,
        centralVersion: Number(existingRow.version),
        ...safeMetadata(local),
        payloadLogged: false,
        historicalVersionsRetained: true,
      };
    }
    const currentVersion = Number(existingRow.version);
    const updated = await invokeProtectedRequest(
      request,
      `?document_key=eq.${encodeURIComponent(key)}&version=eq.${currentVersion}&select=document_key,payload,version`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ payload, updated_by: null }),
      },
      'publish compare-and-swap',
    );
    if (!Array.isArray(updated)
      || updated.length !== 1
      || Number(updated[0].version) !== currentVersion + 1) {
      throw new Error('Protected RavScore checkpoint compare-and-swap lost a concurrent write');
    }
    expectedVersion = currentVersion + 1;
    mutation = 'updated';
  }

  const readbackRow = await readExactProtectedCheckpointRow(request, { allowMissing: false });
  if (Number(readbackRow.version) !== expectedVersion
    || !checkpointsAreEquivalent(readbackRow.payload, payload)) {
    throw new Error('Protected RavScore checkpoint readback does not match the published state');
  }
  await validateCheckpointPayload({
    payload: readbackRow.payload,
    targetReference,
    temporaryRoot,
  });
  return {
    published: true,
    reason: `protected-checkpoint-${mutation}`,
    documentKey: key,
    centralVersion: expectedVersion,
    ...safeMetadata(local),
    payloadLogged: false,
    historicalVersionsRetained: true,
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

    let localPayload = null;
    let local = null;
    try {
      localPayload = await readLocalCheckpointPayload(checkpointPath);
      local = await loadRavScoreContinuationCheckpointForTarget({
        checkpointPath,
        targetReference,
        expectedPartCount: RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount,
      });
      if (!local.loaded) {
        throw new Error('Local protected RavScore checkpoint validation produced no checkpoint');
      }
    } catch (error) {
      if (error?.message !== 'Local protected RavScore checkpoint is missing') throw error;
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
        if (!checkpointsAreEquivalent(localPayload, row.payload)) {
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
      reason: 'protected-checkpoint-restored',
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
  const request = createProtectedRavScoreCheckpointRequester();
  const result = options.mode === 'publish'
    ? await publishProtectedRavScoreContinuationCheckpoint({
      targetReference: options.targetReference,
      request,
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
