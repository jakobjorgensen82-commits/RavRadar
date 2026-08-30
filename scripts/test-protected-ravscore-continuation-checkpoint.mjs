import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildIntegratedRavScoreStateSeries } from '../js/core/ravscore-integrated-state-pipeline.js';
import {
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  RAVSCORE_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-model-contract.js';
import {
  PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_ALLOWLIST,
  PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
  createProtectedRavScoreCheckpointRequester,
  publishProtectedRavScoreContinuationCheckpoint,
  restoreProtectedRavScoreContinuationCheckpoint,
} from './protected-ravscore-continuation-checkpoint.mjs';
import {
  RAVSCORE_CONTINUATION_CHECKPOINT_POLICY,
  saveRavScoreContinuationCheckpoint,
} from './ravscore-continuation-checkpoint.mjs';

const PART_COUNT = RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount;
const START = Date.parse('2026-08-01T00:00:00.000Z');
const atHour = hour => new Date(START + hour * 3_600_000).toISOString();
const clone = value => JSON.parse(JSON.stringify(value));
const contextFor = partId => `sha256:${crypto.createHash('sha256').update(partId).digest('hex')}`;

const samples = Array.from({ length: 51 }, (_, hour) => ({
  time: atHour(hour),
  currentSpeedMps: 0.12,
  currentAlignment: 0.75,
  currentVerified: true,
  waveHeightM: 1.2,
  wavePeriodS: 6,
}));
const stateSeries = buildIntegratedRavScoreStateSeries(samples, {
  samplingContextKey: contextFor('template'),
});
const partIds = Array.from(
  { length: PART_COUNT },
  (_, index) => `part-${String(index + 1).padStart(3, '0')}`,
);
const sourceDocumentAt = (hour, datasetId = `rr-protected-schema4-${hour}`) => ({
  datasetId,
  productionReferenceAt: atHour(hour),
  coastalParts: {
    parts: Object.fromEntries(partIds.map(partId => [partId, {
      ravScoreModel: {
        currentState: {
          ...clone(stateSeries.rows[hour].continuationState),
          samplingContextKey: contextFor(partId),
        },
      },
    }])),
  },
});
const sourceDocument = sourceDocumentAt(49, 'rr-protected-schema4-synthetic');

function memoryRequester(initialRow = null) {
  let row = initialRow ? clone(initialRow) : null;
  const calls = [];
  const request = async (suffix, options = {}, operation = '') => {
    calls.push({ suffix, options: { ...options }, operation });
    const method = options.method ?? 'GET';
    if (method === 'POST') {
      if (row) return [];
      const body = JSON.parse(options.body);
      row = {
        document_key: body.document_key,
        payload: clone(body.payload),
        version: 1,
      };
      return [clone(row)];
    }
    if (method === 'PATCH') {
      const expected = Number(suffix.match(/version=eq\.(\d+)/)?.[1]);
      if (!row || Number(row.version) !== expected) return [];
      const body = JSON.parse(options.body);
      row = {
        ...row,
        payload: clone(body.payload),
        version: Number(row.version) + 1,
      };
      return [clone(row)];
    }
    return row ? [clone(row)] : [];
  };
  return { request, calls, row: () => clone(row) };
}

const rowFor = payload => ({
  document_key: PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
  payload: clone(payload),
  version: 1,
});

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ravscore-protected-checkpoint-'));
const sourcePath = path.join(tempRoot, 'source.json');
const localCheckpointPath = path.join(tempRoot, 'local', 'checkpoint.json');
const restoredCheckpointPath = path.join(
  tempRoot,
  'restore-root',
  '.cache',
  'ravscore-continuation-checkpoint',
  'checkpoint.json',
);

try {
  await fs.writeFile(sourcePath, `${JSON.stringify(sourceDocument)}\n`);
  await saveRavScoreContinuationCheckpoint({
    sourcePath,
    checkpointPath: localCheckpointPath,
  });
  const checkpoint = JSON.parse(await fs.readFile(localCheckpointPath, 'utf8'));

  assert.deepEqual(PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_ALLOWLIST, [
    PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
  ]);

  const memory = memoryRequester();
  const published = await publishProtectedRavScoreContinuationCheckpoint({
    checkpointPath: localCheckpointPath,
    targetReference: atHour(50),
    request: memory.request,
    temporaryRoot: tempRoot,
  });
  assert.equal(published.published, true);
  assert.equal(published.documentKey, PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY);
  assert.equal(published.partCount, PART_COUNT);
  assert.equal(published.modelId, RAVSCORE_MODEL_ID);
  assert.equal(published.stateSchemaVersion, RAVSCORE_STATE_SCHEMA_VERSION);
  assert.equal(published.modelContractSha256, RAVSCORE_MODEL_CONTRACT_SHA256);
  assert.equal(published.modelBundleSha256, RAVSCORE_MODEL_BUNDLE_SHA256);
  assert.equal(
    published.continuationStateContractSha256,
    checkpoint.continuationStateContractSha256,
  );
  assert.equal(published.payloadLogged, false);
  assert.equal(published.historicalVersionsRetained, true);
  assert.equal('payload' in published, false);
  assert.equal('states' in published, false);
  assert.equal(memory.calls.length, 3);
  assert.match(memory.calls[0].suffix, /select=document_key,payload,version/);
  assert.equal(memory.calls[1].suffix, '?on_conflict=document_key&select=document_key,payload,version');
  assert.equal(memory.calls[1].options.method, 'POST');
  assert.equal(
    memory.calls[1].options.headers.Prefer,
    'resolution=ignore-duplicates,return=representation',
  );
  const publishedBody = JSON.parse(memory.calls[1].options.body);
  assert.equal(publishedBody.document_key, PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY);
  assert.deepEqual(publishedBody.payload, checkpoint);
  assert.equal(publishedBody.updated_by, null);
  await fs.mkdir(path.dirname(restoredCheckpointPath), { recursive: true });
  const restored = await restoreProtectedRavScoreContinuationCheckpoint({
    checkpointPath: restoredCheckpointPath,
    targetReference: atHour(50),
    request: memory.request,
  });
  assert.equal(restored.restored, true);
  assert.equal(restored.reason, 'protected-checkpoint-restored');
  assert.equal(restored.partCount, PART_COUNT);
  assert.equal(restored.modelId, RAVSCORE_MODEL_ID);
  assert.equal(restored.stateSchemaVersion, RAVSCORE_STATE_SCHEMA_VERSION);
  assert.equal(restored.modelContractSha256, RAVSCORE_MODEL_CONTRACT_SHA256);
  assert.equal(restored.modelBundleSha256, RAVSCORE_MODEL_BUNDLE_SHA256);
  assert.equal(
    restored.continuationStateContractSha256,
    checkpoint.continuationStateContractSha256,
  );
  assert.equal(restored.payloadLogged, false);
  assert.equal(memory.calls.length, 4);
  assert.match(
    memory.calls[3].suffix,
    /^\?document_key=eq\.ravscore-continuation-checkpoint&select=document_key,payload,version&limit=2$/,
  );
  assert.deepEqual(
    JSON.parse(await fs.readFile(restoredCheckpointPath, 'utf8')),
    checkpoint,
  );
  assert.deepEqual(
    await fs.readdir(path.dirname(restoredCheckpointPath)),
    ['checkpoint.json'],
    'successful restore must not leave a remote temporary file',
  );

  const newerSourcePath = path.join(tempRoot, 'source-newer.json');
  const newerCheckpointPath = path.join(tempRoot, 'checkpoint-newer.json');
  await fs.writeFile(
    newerSourcePath,
    `${JSON.stringify(sourceDocumentAt(50))}\n`,
  );
  await saveRavScoreContinuationCheckpoint({
    sourcePath: newerSourcePath,
    checkpointPath: newerCheckpointPath,
  });
  const newerCheckpointText = await fs.readFile(newerCheckpointPath, 'utf8');
  const newerCheckpoint = JSON.parse(newerCheckpointText);

  const casMemory = memoryRequester(rowFor(checkpoint));
  const casPublished = await publishProtectedRavScoreContinuationCheckpoint({
    checkpointPath: newerCheckpointPath,
    targetReference: atHour(51),
    request: casMemory.request,
    temporaryRoot: tempRoot,
  });
  assert.equal(casPublished.published, true);
  assert.equal(casPublished.reason, 'protected-checkpoint-updated');
  assert.equal(casPublished.centralVersion, 2);
  assert.equal(casMemory.row().version, 2);
  assert.deepEqual(casMemory.row().payload, newerCheckpoint);
  assert.match(casMemory.calls[1].suffix, /version=eq\.1/);
  assert.equal(casMemory.calls[1].options.method, 'PATCH');

  const alreadyCurrent = await publishProtectedRavScoreContinuationCheckpoint({
    checkpointPath: newerCheckpointPath,
    targetReference: atHour(51),
    request: casMemory.request,
    temporaryRoot: tempRoot,
  });
  assert.equal(alreadyCurrent.published, false);
  assert.equal(alreadyCurrent.reason, 'protected-checkpoint-already-current');
  assert.equal(alreadyCurrent.centralVersion, 2);

  await assert.rejects(
    publishProtectedRavScoreContinuationCheckpoint({
      checkpointPath: localCheckpointPath,
      targetReference: atHour(51),
      request: casMemory.request,
      temporaryRoot: tempRoot,
    }),
    /would regress central state/,
  );

  const losingRaceBase = memoryRequester(rowFor(checkpoint));
  const losingRaceRequest = async (suffix, options = {}, operation = '') => {
    if (options.method === 'PATCH') return [];
    return losingRaceBase.request(suffix, options, operation);
  };
  await assert.rejects(
    publishProtectedRavScoreContinuationCheckpoint({
      checkpointPath: newerCheckpointPath,
      targetReference: atHour(51),
      request: losingRaceRequest,
      temporaryRoot: tempRoot,
    }),
    /compare-and-swap lost a concurrent write/,
  );

  const changedReadbackBase = memoryRequester(rowFor(checkpoint));
  let changedReadbackPatchSeen = false;
  const changedReadbackRequest = async (suffix, options = {}, operation = '') => {
    const result = await changedReadbackBase.request(suffix, options, operation);
    if (options.method === 'PATCH') changedReadbackPatchSeen = true;
    if (!options.method && changedReadbackPatchSeen && Array.isArray(result) && result[0]) {
      const changed = clone(result);
      changed[0].payload.datasetId = 'rr-protected-readback-changed';
      return changed;
    }
    return result;
  };
  await assert.rejects(
    publishProtectedRavScoreContinuationCheckpoint({
      checkpointPath: newerCheckpointPath,
      targetReference: atHour(51),
      request: changedReadbackRequest,
      temporaryRoot: tempRoot,
    }),
    /readback does not match/,
  );

  await fs.writeFile(restoredCheckpointPath, newerCheckpointText);
  const localNewer = await restoreProtectedRavScoreContinuationCheckpoint({
    checkpointPath: restoredCheckpointPath,
    targetReference: atHour(51),
    request: memoryRequester(rowFor(checkpoint)).request,
  });
  assert.equal(localNewer.restored, false);
  assert.equal(localNewer.reason, 'local-checkpoint-newer');
  assert.equal(localNewer.checkpointAt, atHour(50));
  assert.equal(localNewer.targetUnchanged, true);
  assert.equal(await fs.readFile(restoredCheckpointPath, 'utf8'), newerCheckpointText);

  await fs.writeFile(restoredCheckpointPath, `${JSON.stringify(checkpoint)}\n`);
  const remoteNewer = await restoreProtectedRavScoreContinuationCheckpoint({
    checkpointPath: restoredCheckpointPath,
    targetReference: atHour(51),
    request: memoryRequester(rowFor(newerCheckpoint)).request,
  });
  assert.equal(remoteNewer.restored, true);
  assert.equal(remoteNewer.checkpointAt, atHour(50));
  assert.equal(await fs.readFile(restoredCheckpointPath, 'utf8'), newerCheckpointText);

  await fs.writeFile(restoredCheckpointPath, `${JSON.stringify(checkpoint)}\n`);
  const equivalent = await restoreProtectedRavScoreContinuationCheckpoint({
    checkpointPath: restoredCheckpointPath,
    targetReference: atHour(50),
    request: memoryRequester(rowFor(checkpoint)).request,
  });
  assert.equal(equivalent.restored, false);
  assert.equal(equivalent.reason, 'protected-checkpoint-equivalent');
  assert.equal(equivalent.targetUnchanged, true);

  const sameTimeConflict = clone(checkpoint);
  sameTimeConflict.datasetId = 'rr-protected-schema4-conflict';
  const equivalentBefore = await fs.readFile(restoredCheckpointPath, 'utf8');
  await assert.rejects(
    restoreProtectedRavScoreContinuationCheckpoint({
      checkpointPath: restoredCheckpointPath,
      targetReference: atHour(50),
      request: memoryRequester(rowFor(sameTimeConflict)).request,
    }),
    /conflict at the same reference time/,
  );
  assert.equal(await fs.readFile(restoredCheckpointPath, 'utf8'), equivalentBefore);

  const absentPath = path.join(
    tempRoot,
    'missing-remote',
    '.cache',
    'ravscore-continuation-checkpoint',
    'checkpoint.json',
  );
  const absent = await restoreProtectedRavScoreContinuationCheckpoint({
    checkpointPath: absentPath,
    targetReference: atHour(50),
    request: memoryRequester().request,
  });
  assert.deepEqual(absent, {
    restored: false,
    reason: 'protected-checkpoint-not-found',
    documentKey: PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
    targetUnchanged: true,
  });
  await assert.rejects(fs.access(absentPath), /ENOENT/);

  const outsideDedicatedCache = memoryRequester(rowFor(checkpoint));
  await assert.rejects(
    restoreProtectedRavScoreContinuationCheckpoint({
      checkpointPath: path.join(tempRoot, 'arbitrary-output.json'),
      targetReference: atHour(50),
      request: outsideDedicatedCache.request,
    }),
    /dedicated \.cache path/,
  );
  assert.equal(
    outsideDedicatedCache.calls.length,
    0,
    'an invalid restore target must be rejected before any protected fetch',
  );

  const atomicTarget = path.join(
    tempRoot,
    'atomic',
    '.cache',
    'ravscore-continuation-checkpoint',
    'checkpoint.json',
  );
  await fs.mkdir(path.dirname(atomicTarget), { recursive: true });
  const sentinel = 'known-safe-previous-checkpoint\n';
  const assertRemoteRejectsWithoutMutation = async ({
    row,
    targetReference = atHour(50),
    match,
    request,
  }) => {
    await fs.writeFile(atomicTarget, sentinel);
    await assert.rejects(
      restoreProtectedRavScoreContinuationCheckpoint({
        checkpointPath: atomicTarget,
        targetReference,
        request: request ?? memoryRequester(row).request,
      }),
      match,
    );
    assert.equal(
      await fs.readFile(atomicTarget, 'utf8'),
      sentinel,
      'rejected protected restore must preserve the previous checkpoint byte-for-byte',
    );
    assert.deepEqual(
      await fs.readdir(path.dirname(atomicTarget)),
      ['checkpoint.json'],
      'rejected protected restore must clean its temporary file',
    );
  };

  await assertRemoteRejectsWithoutMutation({
    row: {
      document_key: 'not-allowlisted',
      payload: checkpoint,
    },
    match: /unexpected document key/,
  });

  const tampered = clone(checkpoint);
  tampered.stateSha256 = '0'.repeat(64);
  await assertRemoteRejectsWithoutMutation({
    row: rowFor(tampered),
    match: /state integrity is invalid/,
  });

  const wrongModel = clone(checkpoint);
  wrongModel.modelBinding.modelId = 'wrong-model';
  await assertRemoteRejectsWithoutMutation({
    row: rowFor(wrongModel),
    match: /incompatible modelId/,
  });

  const wrongCount = clone(checkpoint);
  wrongCount.partCount = PART_COUNT - 1;
  await assertRemoteRejectsWithoutMutation({
    row: rowFor(wrongCount),
    match: /descriptor is invalid/,
  });

  await assertRemoteRejectsWithoutMutation({
    row: rowFor(checkpoint),
    targetReference: atHour(48),
    match: /future relative to the bound target/,
  });

  await assertRemoteRejectsWithoutMutation({
    row: rowFor(checkpoint),
    targetReference: atHour(
      50 + RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumAgeHours,
    ),
    match: /older than the 72-hour continuation limit/,
  });

  const maximumAgePath = path.join(
    tempRoot,
    'maximum-age',
    '.cache',
    'ravscore-continuation-checkpoint',
    'checkpoint.json',
  );
  const maximumAgeRestore = await restoreProtectedRavScoreContinuationCheckpoint({
    checkpointPath: maximumAgePath,
    targetReference: atHour(
      49 + RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumAgeHours,
    ),
    request: memoryRequester(rowFor(checkpoint)).request,
  });
  assert.equal(maximumAgeRestore.restored, true);
  assert.equal(
    maximumAgeRestore.ageHours,
    RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumAgeHours,
  );

  const secretErrorText = 'must-not-log-a-protected-payload';
  await fs.writeFile(atomicTarget, sentinel);
  await assert.rejects(
    restoreProtectedRavScoreContinuationCheckpoint({
      checkpointPath: atomicTarget,
      targetReference: atHour(50),
      request: async () => { throw new Error(secretErrorText); },
    }),
    error => {
      assert.equal(error.code, 'PROTECTED_RAVSCORE_CHECKPOINT_REMOTE_ERROR');
      assert.equal(error.message.includes(secretErrorText), false);
      assert.match(error.message, /read failed closed/);
      return true;
    },
  );
  assert.equal(await fs.readFile(atomicTarget, 'utf8'), sentinel);

  assert.throws(
    () => createProtectedRavScoreCheckpointRequester({
      supabaseUrl: '',
      serviceRoleKey: '',
    }),
    /SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required/,
  );
  assert.throws(
    () => createProtectedRavScoreCheckpointRequester({
      supabaseUrl: 'http://example.invalid',
      serviceRoleKey: 'synthetic-key',
    }),
    /SUPABASE_URL is invalid/,
  );

  const rejectedCredentialRequest = createProtectedRavScoreCheckpointRequester({
    supabaseUrl: 'https://example.invalid',
    serviceRoleKey: 'synthetic-wrong-key',
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({
        code: 'AUTH_FAILED',
        message: secretErrorText,
      }),
    }),
    retryDelayMs: 0,
    delayImpl: async () => {},
    logger: () => {},
  });
  await assertRemoteRejectsWithoutMutation({
    request: rejectedCredentialRequest,
    match: error => {
      assert.equal(error.code, 'PROTECTED_RAVSCORE_CHECKPOINT_REMOTE_ERROR');
      assert.equal(error.message.includes(secretErrorText), false);
      return true;
    },
  });

  const tamperedLocalPath = path.join(tempRoot, 'tampered-local', 'checkpoint.json');
  await fs.mkdir(path.dirname(tamperedLocalPath), { recursive: true });
  await fs.writeFile(tamperedLocalPath, `${JSON.stringify(tampered)}\n`);
  const unpublished = memoryRequester();
  await assert.rejects(
    publishProtectedRavScoreContinuationCheckpoint({
      checkpointPath: tamperedLocalPath,
      targetReference: atHour(50),
      request: unpublished.request,
      temporaryRoot: tempRoot,
    }),
    /state integrity is invalid/,
  );
  assert.equal(unpublished.calls.length, 0, 'invalid local checkpoint must not be published');
  assert.deepEqual(
    JSON.parse(await fs.readFile(localCheckpointPath, 'utf8')),
    checkpoint,
    'failed pre-publication validation must never mutate the valid local checkpoint',
  );

  console.log('Protected schema-4 RavScore checkpoint backup/restore contract passes.');
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
