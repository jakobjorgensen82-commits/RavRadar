import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import {
  canonicalPrivateRuntimeJson,
  createPrivateProductionRuntimeBundle,
  privateRuntimeBundleContentSha256,
  verifyPrivateProductionRuntimeBundle,
} from './private-production-runtime-bundle.mjs';
import {
  PRIVATE_RUNTIME_CONTRACT_FILES,
  PRIVATE_RUNTIME_FILES,
  buildPrivateRuntimeCreateSpec,
  buildPrivateRuntimeExpectation,
  privateRuntimeContractHashes,
} from './private-production-runtime-workflow.mjs';
import {
  DMI_MARINE_SEAM_PREDECESSOR,
  DMI_SCHEDULER_ONLY_PREDECESSOR,
  WEATHER_ROTATION_PREDECESSOR,
  MARINE_COMPONENT_PREDECESSOR,
  COMPLETE_WEATHER_PREDECESSOR,
  PROTECTED_PRIVATE_RUNTIME_POLICY,
  auditProtectedPrivateRuntimeAnonymousDenial,
  buildProtectedPrivateRuntimeArchive,
  createProtectedPrivateRuntimeClients,
  describeCurrentProtectedPrivateProductionRuntime,
  describeTargetProtectedPrivateProductionRuntime,
  publishProtectedPrivateProductionRuntime,
  restoreProtectedPrivateProductionRuntime,
  isExactDmiMarineSeamPredecessor,
  isExactDmiSchedulerPredecessor,
  isExactWeatherRotationPredecessor,
  isExactMarineComponentPredecessor,
  isApprovedExactWeatherPredecessor,
  validateSameReferencePrivateRuntimeSuccessor,
  validateProtectedPrivateRuntimePointer,
} from './protected-private-production-runtime.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const sourceRepository = path.resolve('.');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-protected-private-runtime-'));
const repository = path.join(temp, 'repository');
const privateRoot = path.join(temp, 'private');
const restoreRoot = path.join(temp, 'restore-private');
const SOURCE_HEADS = ['a', 'b', 'c', 'd', 'e', 'f'].map(letter => letter.repeat(40));

const contractFiles = [...new Set(Object.values(PRIVATE_RUNTIME_CONTRACT_FILES).flat())];

function syntheticConditions(index) {
  const hour = String(10 + index).padStart(2, '0');
  return {
    datasetId: `rr-synthetic-private-generation-${index}`,
    generatedAt: `2026-08-29T${hour}:05:00.000Z`,
    productionReferenceAt: `2026-08-29T${hour}:00:00.000Z`,
    zones: Object.fromEntries(Array.from({ length: 210 }, (_, row) => [`z-${row}`, {}])),
    coastalParts: {
      modelBinding: ravScoreModelBinding(),
      parts: Object.fromEntries(Array.from({ length: 673 }, (_, row) => [`p-${row}`, {}])),
    },
  };
}

async function createGeneration(index, {
  largeStreamPayload = false,
  metadataOverride = {},
  contractHashesOverride,
} = {}) {
  const conditions = { ...syntheticConditions(index), ...metadataOverride };
  for (const descriptor of PRIVATE_RUNTIME_FILES) {
    const destination = path.join(repository, descriptor.relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(
      destination,
      descriptor.id === 'full-conditions'
        ? `${JSON.stringify(conditions)}\n`
        : largeStreamPayload && descriptor.id === 'dmi-bulk-cache'
          ? crypto.randomBytes((5 * 1024 * 1024) + 3)
        : `synthetic-generation-${index}-${descriptor.id}\n`,
    );
  }
  const spec = await buildPrivateRuntimeCreateSpec({ repositoryRoot: repository });
  const bundlePath = path.join(privateRoot, `bundle-${index}`);
  await createPrivateProductionRuntimeBundle({
    privateRoot,
    bundlePath,
    repositoryRoot: repository,
    ...spec,
    metadata: contractHashesOverride
      ? { ...spec.metadata, contractHashes: contractHashesOverride }
      : spec.metadata,
  });
  const expected = await buildPrivateRuntimeExpectation({
    repositoryRoot: repository,
    targetReferenceAt: `2026-08-29T${String(11 + index).padStart(2, '0')}:00:00.000Z`,
    now: `2026-08-29T${String(11 + index).padStart(2, '0')}:05:00.000Z`,
  });
  return { bundlePath, expected, conditions };
}

function fakeDocuments() {
  let row = null;
  let loseNextPatch = false;
  let commitThenLoseNextPatch = false;
  return {
    request: async (suffix, options = {}) => {
      const method = options.method ?? 'GET';
      if (method === 'GET') return row ? [clone(row)] : [];
      if (method === 'POST') {
        if (row) return [];
        const body = JSON.parse(options.body);
        row = { document_key: body.document_key, payload: body.payload, version: 1 };
        return [clone(row)];
      }
      if (method === 'PATCH') {
        if (loseNextPatch) {
          loseNextPatch = false;
          return [];
        }
        const expectedVersion = Number(/version=eq\.(\d+)/.exec(suffix)?.[1]);
        if (!row || row.version !== expectedVersion) return [];
        row = { ...row, payload: JSON.parse(options.body).payload, version: row.version + 1 };
        if (commitThenLoseNextPatch) {
          commitThenLoseNextPatch = false;
          throw new Error('synthetic response lost after committed patch');
        }
        return [clone(row)];
      }
      throw new Error(`unexpected document method ${method}`);
    },
    row: () => clone(row),
    setRow: value => { row = clone(value); },
    losePatch: () => { loseNextPatch = true; },
    commitThenLosePatch: () => { commitThenLoseNextPatch = true; },
  };
}

function fakeStorage() {
  const objects = new Map();
  const removed = [];
  let anonymousStatus = 403;
  let downloadCount = 0;
  return {
    client: {
      ensurePrivateBucket: async () => true,
      uploadImmutable: async (objectPath, bytes) => {
        if (objects.has(objectPath)) return { created: false, alreadyExists: true };
        objects.set(objectPath, Buffer.from(bytes));
        return { created: true };
      },
      download: async objectPath => {
        downloadCount += 1;
        if (!objects.has(objectPath)) throw new Error('synthetic object missing');
        return Buffer.from(objects.get(objectPath));
      },
      removeExact: async objectPath => {
        removed.push(objectPath);
        objects.delete(objectPath);
        return true;
      },
      anonymousStatus: async () => anonymousStatus,
    },
    objects,
    removed,
    downloads: () => downloadCount,
    setAnonymousStatus: status => { anonymousStatus = status; },
  };
}

try {
  await fs.mkdir(repository, { recursive: true });
  await fs.mkdir(privateRoot, { recursive: true });
  await fs.mkdir(restoreRoot, { recursive: true });
  for (const relative of contractFiles) {
    const source = path.join(sourceRepository, relative);
    if (!await fs.lstat(source).catch(() => null)) continue;
    const destination = path.join(repository, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
  }

  const baselineContracts = await privateRuntimeContractHashes({ repositoryRoot: repository });
  assert.equal(
    baselineContracts.continuationStateContractSha256,
    DMI_SCHEDULER_ONLY_PREDECESSOR.continuationStateContractSha256,
    'the one-time predecessor may not cross a continuation change',
  );
  assert.equal(
    baselineContracts.publicProjectionContractSha256,
    DMI_SCHEDULER_ONLY_PREDECESSOR.publicProjectionContractSha256,
    'the one-time predecessor may not cross a public projection change',
  );
  assert.equal(baselineContracts.continuationStateContractSha256,
    DMI_MARINE_SEAM_PREDECESSOR.continuationStateContractSha256);
  assert.equal(baselineContracts.publicProjectionContractSha256,
    DMI_MARINE_SEAM_PREDECESSOR.publicProjectionContractSha256);
  assert.equal(baselineContracts.continuationStateContractSha256,
    WEATHER_ROTATION_PREDECESSOR.continuationStateContractSha256);
  assert.equal(baselineContracts.publicProjectionContractSha256,
    WEATHER_ROTATION_PREDECESSOR.publicProjectionContractSha256);
  const schedulerPredecessor = {
    ...DMI_SCHEDULER_ONLY_PREDECESSOR,
    modelBinding: ravScoreModelBinding(),
    contractHashes: {
      continuationStateContractSha256: DMI_SCHEDULER_ONLY_PREDECESSOR.continuationStateContractSha256,
      fullRuntimeContractSha256: DMI_SCHEDULER_ONLY_PREDECESSOR.fullRuntimeContractSha256,
      publicProjectionContractSha256: DMI_SCHEDULER_ONLY_PREDECESSOR.publicProjectionContractSha256,
    },
  };
  const schedulerExpected = {
    modelBinding: ravScoreModelBinding(),
    contractHashes: baselineContracts,
  };
  assert.equal(isExactDmiSchedulerPredecessor(schedulerPredecessor, schedulerExpected), true);
  for (const change of [
    { sourceHead: SOURCE_HEADS[0] },
    { datasetId: 'rr-other-generation' },
    { productionReferenceAt: '2026-09-23T17:00:00.000Z' },
    { contractHashes: { ...schedulerPredecessor.contractHashes, fullRuntimeContractSha256: 'a'.repeat(64) } },
    { modelBinding: { ...schedulerPredecessor.modelBinding, modelBundleSha256: 'a'.repeat(64) } },
  ]) {
    assert.equal(isExactDmiSchedulerPredecessor({ ...schedulerPredecessor, ...change }, schedulerExpected), false);
  }
  const workflowContractPath = path.join(repository, 'scripts/private-production-runtime-workflow.mjs');
  await fs.copyFile(path.join(sourceRepository, 'scripts/private-production-runtime-workflow.mjs'), workflowContractPath);
  const storageAbiPath = path.join(repository, 'scripts/lib/private-weather-storage-abi.json');
  const scoreContractPath = path.join(repository, 'js/core/local-zone-score.js');
  const workflowContractSource = await fs.readFile(workflowContractPath, 'utf8');
  const scoreContractSource = await fs.readFile(scoreContractPath, 'utf8');
  await fs.writeFile(workflowContractPath,
    workflowContractSource.replaceAll('4.0.378', '9.9.999'));
  await fs.writeFile(scoreContractPath,
    scoreContractSource.replaceAll('?v=4.0.378', '?v=9.9.999'));
  assert.deepEqual(
    await privateRuntimeContractHashes({ repositoryRoot: repository }),
    baselineContracts,
    'mechanical release numbers must not invalidate private weather contracts',
  );
  await fs.writeFile(workflowContractPath, `${workflowContractSource}\n// semantic-contract-change\n`);
  assert.deepEqual(await privateRuntimeContractHashes({ repositoryRoot: repository }), baselineContracts,
    'an implementation-only producer change must not invalidate the storage ABI');
  const storageAbiSource = await fs.readFile(storageAbiPath, 'utf8');
  const changedStorageAbi = JSON.parse(storageAbiSource);
  changedStorageAbi.incompatibleChangeRule += ' Audited.';
  await fs.writeFile(storageAbiPath, `${JSON.stringify(changedStorageAbi)}\n`);
  assert.notEqual((await privateRuntimeContractHashes({ repositoryRoot: repository })).fullRuntimeContractSha256,
    baselineContracts.fullRuntimeContractSha256,
    'a persisted storage ABI change must remain hash-visible');
  await fs.writeFile(storageAbiPath, storageAbiSource);
  await fs.writeFile(workflowContractPath, workflowContractSource);
  await fs.writeFile(scoreContractPath, scoreContractSource);

  const documents = fakeDocuments();
  const storage = fakeStorage();
  const exactBridge = await createGeneration(6, {
    metadataOverride: {
      datasetId: DMI_SCHEDULER_ONLY_PREDECESSOR.datasetId,
      generatedAt: '2026-09-23T17:06:22.947Z',
      productionReferenceAt: DMI_SCHEDULER_ONLY_PREDECESSOR.productionReferenceAt,
    },
    contractHashesOverride: schedulerPredecessor.contractHashes,
  });
  const bridgeDocuments = fakeDocuments();
  const bridgeStorage = fakeStorage();
  const bridgeOldExpected = {
    ...(await buildPrivateRuntimeExpectation({
      repositoryRoot: repository,
      targetReferenceAt: '2026-09-23T18:00:00.000Z',
      now: '2026-09-23T18:05:00.000Z',
    })),
    contractHashes: schedulerPredecessor.contractHashes,
  };
  await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: exactBridge.bundlePath,
    repositoryRoot: repository,
    expected: bridgeOldExpected,
    now: '2026-09-23T18:05:00.000Z',
    sourceHead: DMI_SCHEDULER_ONLY_PREDECESSOR.sourceHead,
    request: bridgeDocuments.request,
    storage: bridgeStorage.client,
  });
  const bridgeRestored = await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: path.join(restoreRoot, 'exact-dmi-scheduler-bridge'),
    repositoryRoot: repository,
    expected: await buildPrivateRuntimeExpectation({
      repositoryRoot: repository,
      targetReferenceAt: '2026-09-23T18:00:00.000Z',
      now: '2026-09-23T18:05:00.000Z',
    }),
    now: '2026-09-23T18:05:00.000Z',
    request: bridgeDocuments.request,
    storage: bridgeStorage.client,
  });
  assert.equal(bridgeRestored.restored, true);
  assert.equal(bridgeRestored.exactDmiPredecessor, true);
  const seamPredecessor = {
    ...DMI_MARINE_SEAM_PREDECESSOR,
    modelBinding: ravScoreModelBinding(),
    contractHashes: {
      continuationStateContractSha256: DMI_MARINE_SEAM_PREDECESSOR.continuationStateContractSha256,
      fullRuntimeContractSha256: DMI_MARINE_SEAM_PREDECESSOR.fullRuntimeContractSha256,
      publicProjectionContractSha256: DMI_MARINE_SEAM_PREDECESSOR.publicProjectionContractSha256,
    },
  };
  assert.equal(isExactDmiMarineSeamPredecessor(seamPredecessor, schedulerExpected), true);
  assert.equal(isExactDmiSchedulerPredecessor(seamPredecessor, schedulerExpected), false);
  for (const change of [
    { sourceHead: SOURCE_HEADS[0] },
    { datasetId: 'rr-other-generation' },
    { productionReferenceAt: '2026-09-23T20:00:00.000Z' },
    { contractHashes: { ...seamPredecessor.contractHashes, fullRuntimeContractSha256: 'a'.repeat(64) } },
    { modelBinding: { ...seamPredecessor.modelBinding, modelBundleSha256: 'a'.repeat(64) } },
  ]) {
    assert.equal(isExactDmiMarineSeamPredecessor({ ...seamPredecessor, ...change }, schedulerExpected), false);
  }
  const seamGeneration = await createGeneration(7, {
    metadataOverride: {
      datasetId: DMI_MARINE_SEAM_PREDECESSOR.datasetId,
      generatedAt: '2026-09-23T21:57:27.000Z',
      productionReferenceAt: DMI_MARINE_SEAM_PREDECESSOR.productionReferenceAt,
    },
    contractHashesOverride: seamPredecessor.contractHashes,
  });
  const seamDocuments = fakeDocuments();
  const seamStorage = fakeStorage();
  await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: seamGeneration.bundlePath,
    repositoryRoot: repository,
    expected: {
      ...(await buildPrivateRuntimeExpectation({
        repositoryRoot: repository,
        targetReferenceAt: '2026-09-23T22:00:00.000Z',
        now: '2026-09-23T22:05:00.000Z',
      })),
      contractHashes: seamPredecessor.contractHashes,
    },
    now: '2026-09-23T22:05:00.000Z',
    sourceHead: DMI_MARINE_SEAM_PREDECESSOR.sourceHead,
    request: seamDocuments.request,
    storage: seamStorage.client,
  });
  const seamRestored = await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: path.join(restoreRoot, 'exact-dmi-marine-seam-bridge'),
    repositoryRoot: repository,
    expected: await buildPrivateRuntimeExpectation({
      repositoryRoot: repository,
      targetReferenceAt: '2026-09-23T22:00:00.000Z',
      now: '2026-09-23T22:05:00.000Z',
    }),
    now: '2026-09-23T22:05:00.000Z',
    request: seamDocuments.request,
    storage: seamStorage.client,
  });
  assert.equal(seamRestored.restored, true);
  assert.equal(seamRestored.exactDmiPredecessor, true);
  const rotationPredecessor = {
    ...WEATHER_ROTATION_PREDECESSOR,
    modelBinding: ravScoreModelBinding(),
    contractHashes: {
      continuationStateContractSha256: WEATHER_ROTATION_PREDECESSOR.continuationStateContractSha256,
      fullRuntimeContractSha256: WEATHER_ROTATION_PREDECESSOR.fullRuntimeContractSha256,
      publicProjectionContractSha256: WEATHER_ROTATION_PREDECESSOR.publicProjectionContractSha256,
    },
  };
  assert.equal(isExactWeatherRotationPredecessor(rotationPredecessor, schedulerExpected), true);
  for (const change of [
    { sourceHead: SOURCE_HEADS[0] },
    { datasetId: 'rr-other-generation' },
    { productionReferenceAt: '2026-09-24T01:00:00.000Z' },
    { contractHashes: { ...rotationPredecessor.contractHashes, fullRuntimeContractSha256: 'a'.repeat(64) } },
    { modelBinding: { ...rotationPredecessor.modelBinding, modelBundleSha256: 'a'.repeat(64) } },
  ]) {
    assert.equal(isExactWeatherRotationPredecessor({ ...rotationPredecessor, ...change }, schedulerExpected), false);
  }
  const rotationGeneration = await createGeneration(8, {
    metadataOverride: {
      datasetId: WEATHER_ROTATION_PREDECESSOR.datasetId,
      generatedAt: '2026-09-24T01:26:18.000Z',
      productionReferenceAt: WEATHER_ROTATION_PREDECESSOR.productionReferenceAt,
    },
    contractHashesOverride: rotationPredecessor.contractHashes,
  });
  const rotationDocuments = fakeDocuments();
  const rotationStorage = fakeStorage();
  await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: rotationGeneration.bundlePath,
    repositoryRoot: repository,
    expected: {
      ...(await buildPrivateRuntimeExpectation({
        repositoryRoot: repository,
        targetReferenceAt: '2026-09-24T02:00:00.000Z',
        now: '2026-09-24T02:05:00.000Z',
      })),
      contractHashes: rotationPredecessor.contractHashes,
    },
    now: '2026-09-24T02:05:00.000Z',
    sourceHead: WEATHER_ROTATION_PREDECESSOR.sourceHead,
    request: rotationDocuments.request,
    storage: rotationStorage.client,
  });
  const rotationRestored = await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: path.join(restoreRoot, 'exact-weather-rotation-bridge'),
    repositoryRoot: repository,
    expected: await buildPrivateRuntimeExpectation({
      repositoryRoot: repository,
      targetReferenceAt: '2026-09-24T02:00:00.000Z',
      now: '2026-09-24T02:05:00.000Z',
    }),
    now: '2026-09-24T02:05:00.000Z',
    request: rotationDocuments.request,
    storage: rotationStorage.client,
  });
  assert.equal(rotationRestored.restored, true);
  assert.equal(rotationRestored.exactDmiPredecessor, true);
  const marineComponentPredecessor = {
    ...MARINE_COMPONENT_PREDECESSOR,
    modelBinding: ravScoreModelBinding(),
    contractHashes: {
      continuationStateContractSha256: MARINE_COMPONENT_PREDECESSOR.continuationStateContractSha256,
      fullRuntimeContractSha256: MARINE_COMPONENT_PREDECESSOR.fullRuntimeContractSha256,
      publicProjectionContractSha256: MARINE_COMPONENT_PREDECESSOR.publicProjectionContractSha256,
    },
  };
  assert.equal(isExactMarineComponentPredecessor(marineComponentPredecessor, schedulerExpected), true);
  assert.equal(isApprovedExactWeatherPredecessor(marineComponentPredecessor, schedulerExpected), true);
  const completeWeatherPredecessor = {
    ...COMPLETE_WEATHER_PREDECESSOR,
    modelBinding: ravScoreModelBinding(),
    contractHashes: {
      continuationStateContractSha256: COMPLETE_WEATHER_PREDECESSOR.continuationStateContractSha256,
      fullRuntimeContractSha256: COMPLETE_WEATHER_PREDECESSOR.fullRuntimeContractSha256,
      publicProjectionContractSha256: COMPLETE_WEATHER_PREDECESSOR.publicProjectionContractSha256,
    },
  };
  assert.equal(isApprovedExactWeatherPredecessor(completeWeatherPredecessor, schedulerExpected), true);
  for (const change of [
    { sourceHead: SOURCE_HEADS[0] },
    { datasetId: 'rr-thinner-successor' },
    { productionReferenceAt: '2026-09-24T15:00:00.000Z' },
    { contractHashes: { ...completeWeatherPredecessor.contractHashes, fullRuntimeContractSha256: 'a'.repeat(64) } },
    { modelBinding: { ...completeWeatherPredecessor.modelBinding, modelBundleSha256: 'a'.repeat(64) } },
  ]) {
    assert.equal(isApprovedExactWeatherPredecessor(
      { ...completeWeatherPredecessor, ...change }, schedulerExpected,
    ), false);
  }
  for (const change of [
    { sourceHead: SOURCE_HEADS[0] },
    { datasetId: 'rr-other-generation' },
    { productionReferenceAt: '2026-09-24T08:00:00.000Z' },
    { contractHashes: { ...marineComponentPredecessor.contractHashes, fullRuntimeContractSha256: 'a'.repeat(64) } },
    { modelBinding: { ...marineComponentPredecessor.modelBinding, modelBundleSha256: 'a'.repeat(64) } },
  ]) {
    assert.equal(isApprovedExactWeatherPredecessor(
      { ...marineComponentPredecessor, ...change }, schedulerExpected,
    ), false);
  }
  const marineGeneration = await createGeneration(9, {
    metadataOverride: {
      datasetId: MARINE_COMPONENT_PREDECESSOR.datasetId,
      generatedAt: '2026-09-24T08:48:21.314Z',
      productionReferenceAt: MARINE_COMPONENT_PREDECESSOR.productionReferenceAt,
    },
    contractHashesOverride: marineComponentPredecessor.contractHashes,
  });
  const marineDocuments = fakeDocuments();
  const marineStorage = fakeStorage();
  await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: marineGeneration.bundlePath,
    repositoryRoot: repository,
    expected: {
      ...(await buildPrivateRuntimeExpectation({
        repositoryRoot: repository,
        targetReferenceAt: '2026-09-24T10:00:00.000Z',
        now: '2026-09-24T10:05:00.000Z',
      })),
      contractHashes: marineComponentPredecessor.contractHashes,
    },
    now: '2026-09-24T10:05:00.000Z',
    sourceHead: MARINE_COMPONENT_PREDECESSOR.sourceHead,
    request: marineDocuments.request,
    storage: marineStorage.client,
  });
  const marineRestored = await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: path.join(restoreRoot, 'exact-marine-component-bridge'),
    repositoryRoot: repository,
    expected: await buildPrivateRuntimeExpectation({
      repositoryRoot: repository,
      targetReferenceAt: '2026-09-24T10:00:00.000Z',
      now: '2026-09-24T10:05:00.000Z',
    }),
    now: '2026-09-24T10:05:00.000Z',
    request: marineDocuments.request,
    storage: marineStorage.client,
  });
  assert.equal(marineRestored.restored, true);
  assert.equal(marineRestored.exactDmiPredecessor, true);
  const continuityDocuments = fakeDocuments();
  const continuityStorage = fakeStorage();
  const completeGeneration = await createGeneration(10, {
    metadataOverride: {
      datasetId: COMPLETE_WEATHER_PREDECESSOR.datasetId,
      generatedAt: '2026-09-24T12:24:09.000Z',
      productionReferenceAt: COMPLETE_WEATHER_PREDECESSOR.productionReferenceAt,
    },
    contractHashesOverride: completeWeatherPredecessor.contractHashes,
  });
  await publishProtectedPrivateProductionRuntime({
    privateRoot, bundlePath: completeGeneration.bundlePath, repositoryRoot: repository,
    expected: {
      ...(await buildPrivateRuntimeExpectation({
        repositoryRoot: repository,
        targetReferenceAt: '2026-09-24T13:00:00.000Z',
        now: '2026-09-24T12:30:00.000Z',
      })),
      contractHashes: completeWeatherPredecessor.contractHashes,
    },
    now: '2026-09-24T12:30:00.000Z',
    sourceHead: COMPLETE_WEATHER_PREDECESSOR.sourceHead,
    request: continuityDocuments.request,
    storage: continuityStorage.client,
  });
  const thinnerHashes = { ...baselineContracts, fullRuntimeContractSha256: 'f'.repeat(64) };
  const thinnerGeneration = await createGeneration(11, {
    metadataOverride: {
      datasetId: 'rr-thinner-successor',
      generatedAt: '2026-09-24T16:30:02.000Z',
      productionReferenceAt: '2026-09-24T15:00:00.000Z',
    },
    contractHashesOverride: thinnerHashes,
  });
  await publishProtectedPrivateProductionRuntime({
    privateRoot, bundlePath: thinnerGeneration.bundlePath, repositoryRoot: repository,
    expected: {
      ...(await buildPrivateRuntimeExpectation({
        repositoryRoot: repository,
        targetReferenceAt: '2026-09-24T17:00:00.000Z',
        now: '2026-09-24T16:35:00.000Z',
      })),
      contractHashes: thinnerHashes,
    },
    now: '2026-09-24T16:35:00.000Z',
    sourceHead: SOURCE_HEADS[0],
    request: continuityDocuments.request,
    storage: continuityStorage.client,
  });
  const completeRollback = await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: path.join(restoreRoot, 'complete-weather-rollback'),
    repositoryRoot: repository,
    expected: await buildPrivateRuntimeExpectation({
      repositoryRoot: repository,
      targetReferenceAt: '2026-09-24T17:00:00.000Z',
      now: '2026-09-24T17:05:00.000Z',
    }),
    now: '2026-09-24T17:05:00.000Z',
    request: continuityDocuments.request,
    storage: continuityStorage.client,
  });
  assert.equal(completeRollback.restored, true);
  assert.equal(completeRollback.rollbackSelected, true);
  assert.equal(completeRollback.currentGenerationRejected, true);
  assert.equal(completeRollback.exactDmiPredecessor, true);
  assert.equal(completeRollback.productionReferenceAt,
    COMPLETE_WEATHER_PREDECESSOR.productionReferenceAt);
  assert.equal(PROTECTED_PRIVATE_RUNTIME_POLICY.maximumRawPayloadBytes, 2 * 1024 * 1024 * 1024);
  assert.equal(PROTECTED_PRIVATE_RUNTIME_POLICY.maximumFilePayloadBytes, 768 * 1024 * 1024);
  assert.equal(PROTECTED_PRIVATE_RUNTIME_POLICY.maximumLegacyRawPayloadBytes, 768 * 1024 * 1024);
  assert.equal(PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveBytes, 50 * 1024 * 1024);
  assert.equal(PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchivePartBytes, 50_000_000);
  assert.equal(PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes, 350_000_000);
  assert.equal(PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveObjectCount, 8);
  let bucketCreatedWith = null;
  let bucketLookupCount = 0;
  const clientContract = createProtectedPrivateRuntimeClients({
    supabaseUrl: 'https://synthetic-project.supabase.co',
    serviceRoleKey: 'synthetic-service-role-key',
    fetchImpl: async (url, options = {}) => {
      if (url.endsWith(`/storage/v1/bucket/${PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId}`)) {
        bucketLookupCount += 1;
        if (bucketLookupCount === 1) return new Response('', { status: 404 });
        return new Response(JSON.stringify({
          id: PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId,
          name: PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId,
          public: false,
          file_size_limit: PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveBytes,
          allowed_mime_types: [PROTECTED_PRIVATE_RUNTIME_POLICY.mimeType],
        }), { status: 200 });
      }
      if (url.endsWith('/storage/v1/bucket') && options.method === 'POST') {
        bucketCreatedWith = JSON.parse(options.body);
        return new Response('', { status: 200 });
      }
      throw new Error(`unexpected synthetic Supabase request ${options.method ?? 'GET'} ${url}`);
    },
  });
  await clientContract.storage.ensurePrivateBucket();
  assert.equal(bucketCreatedWith.file_size_limit, 50 * 1024 * 1024,
    'new protected buckets must use the actual Free-plan object boundary');
  assert.equal(bucketCreatedWith.public, false);

  let transientBucketCalls = 0;
  const transientClient = createProtectedPrivateRuntimeClients({
    supabaseUrl: 'https://synthetic-project.supabase.co',
    serviceRoleKey: 'synthetic-service-role-key',
    retryDelayMs: 0,
    delayImpl: async () => {},
    fetchImpl: async () => {
      transientBucketCalls += 1;
      if (transientBucketCalls === 1) return new Response('', { status: 502 });
      return new Response(JSON.stringify({
        id: PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId,
        name: PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId,
        public: false,
        file_size_limit: PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveBytes,
        allowed_mime_types: [PROTECTED_PRIVATE_RUNTIME_POLICY.mimeType],
      }), { status: 200 });
    },
  });
  await transientClient.storage.ensurePrivateBucket();
  assert.equal(transientBucketCalls, 2,
    'a transient protected storage 502 must be retried once');

  let oversizedBodyRead = false;
  const oversizedClient = createProtectedPrivateRuntimeClients({
    supabaseUrl: 'https://synthetic-project.supabase.co',
    serviceRoleKey: 'synthetic-service-role-key',
    fetchImpl: async () => ({
      ok: true,
      headers: { get: name => name === 'content-length'
        ? String(PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveBytes + 1)
        : null },
      arrayBuffer: async () => {
        oversizedBodyRead = true;
        return new ArrayBuffer(0);
      },
    }),
  });
  await assert.rejects(
    oversizedClient.storage.download('bundles/sha256/synthetic.json.gz'),
    /download failed closed/,
  );
  assert.equal(oversizedBodyRead, false,
    'declared oversized objects must be rejected before a full body read');
  const first = await createGeneration(0);
  const archiveOne = await buildProtectedPrivateRuntimeArchive({
    privateRoot,
    bundlePath: first.bundlePath,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    sourceHead: SOURCE_HEADS[0],
  });
  const archiveTwo = await buildProtectedPrivateRuntimeArchive({
    privateRoot,
    bundlePath: first.bundlePath,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    sourceHead: SOURCE_HEADS[0],
  });
  assert.equal(archiveOne.descriptor.objectSha256, archiveTwo.descriptor.objectSha256);
  assert.deepEqual(archiveOne.archive, archiveTwo.archive, 'protected archive bytes must be deterministic');
  assert.deepEqual(
    archiveOne.objects.map(object => object.descriptor),
    archiveTwo.objects.map(object => object.descriptor),
    'protected archive object-set descriptors must be deterministic',
  );
  const encodedEnvelope = JSON.parse(gunzipSync(archiveOne.archive).toString('utf8'));
  assert.equal(encodedEnvelope.contentEncoding, 'GZIP_BASE64');
  assert.equal(
    encodedEnvelope.files.every(file => {
      const encoded = Buffer.from(file.contentBase64, 'base64');
      return encoded[0] === 0x1f && encoded[1] === 0x8b;
    }),
    true,
    'every private file must be compressed before base64 expansion',
  );
  assert.equal(Object.isFrozen(archiveOne.archiveMetrics), true);
  assert.equal(archiveOne.archiveMetrics.rawPayloadBytes > 0, true);
  assert.equal(
    archiveOne.archiveMetrics.envelopeBytes > 0
      && archiveOne.archiveMetrics.envelopeBytes
        <= PROTECTED_PRIVATE_RUNTIME_POLICY.maximumEnvelopeBytes,
    true,
  );
  assert.equal(archiveOne.archiveMetrics.objectBytes, archiveOne.archive.length);
  assert.equal(archiveOne.archiveMetrics.objectBytes, archiveOne.descriptor.objectBytes);
  assert.equal(archiveOne.archiveMetrics.objectCount, archiveOne.objects.length);
  assert.equal(
    archiveOne.archiveMetrics.largestObjectBytes,
    Math.max(...archiveOne.objects.map(object => object.bytes.length)),
  );
  assert.deepEqual(
    archiveOne.archiveMetrics,
    archiveTwo.archiveMetrics,
    'aggregate archive measurements must be deterministic with the production packer',
  );

  const splitPolicy = {
    ...PROTECTED_PRIVATE_RUNTIME_POLICY,
    maximumArchivePartBytes: 1_024,
    maximumArchiveAggregateBytes: 64 * 1_024,
    maximumArchiveObjectCount: 64,
  };
  const splitArchive = await buildProtectedPrivateRuntimeArchive({
    privateRoot,
    bundlePath: first.bundlePath,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    sourceHead: SOURCE_HEADS[0],
    policy: splitPolicy,
  });
  assert.equal(splitArchive.objects.length > 1, true,
    'a generation larger than one object must be split');
  assert.equal(splitArchive.objects.every(object => object.bytes.length <= 1_024), true);
  assert.deepEqual(
    Buffer.concat(splitArchive.objects.map(object => object.bytes)),
    splitArchive.archive,
    'ordered immutable parts must reassemble the exact archive',
  );
  const splitDocuments = fakeDocuments();
  const splitStorage = fakeStorage();
  const splitPublication = await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: first.bundlePath,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    sourceHead: SOURCE_HEADS[0],
    request: splitDocuments.request,
    storage: splitStorage.client,
    policy: splitPolicy,
  });
  assert.equal(splitPublication.objectCount, splitArchive.objects.length);
  assert.equal(splitStorage.objects.size, splitArchive.objects.length);
  assert.equal(splitStorage.downloads(), splitArchive.objects.length,
    'publication must read back every immutable part before pointer CAS');
  const splitRestoreBundle = path.join(restoreRoot, 'bundle-split');
  const splitRestore = await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: splitRestoreBundle,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    request: splitDocuments.request,
    storage: splitStorage.client,
    policy: splitPolicy,
  });
  assert.equal(splitRestore.objectCount, splitArchive.objects.length);
  assert.equal(splitStorage.downloads(), splitArchive.objects.length * 2,
    'restore must read the selected generation parts exactly once');
  await verifyPrivateProductionRuntimeBundle({
    privateRoot: restoreRoot,
    bundlePath: splitRestoreBundle,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
  });

  const large = await createGeneration(4, { largeStreamPayload: true });
  const largeDocuments = fakeDocuments();
  const largeStorage = fakeStorage();
  await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: large.bundlePath,
    repositoryRoot: repository,
    expected: large.expected,
    now: '2026-08-29T15:05:00.000Z',
    sourceHead: SOURCE_HEADS[4],
    request: largeDocuments.request,
    storage: largeStorage.client,
  });
  const largeRestoreBundle = path.join(restoreRoot, 'bundle-large-stream');
  await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: largeRestoreBundle,
    repositoryRoot: repository,
    expected: large.expected,
    now: '2026-08-29T15:05:00.000Z',
    request: largeDocuments.request,
    storage: largeStorage.client,
  });
  await verifyPrivateProductionRuntimeBundle({
    privateRoot: restoreRoot,
    bundlePath: largeRestoreBundle,
    repositoryRoot: repository,
    expected: large.expected,
    now: '2026-08-29T15:05:00.000Z',
  });

  const legacyEnvelope = clone(encodedEnvelope);
  delete legacyEnvelope.contentEncoding;
  legacyEnvelope.files = legacyEnvelope.files.map(file => ({
    ...file,
    contentBase64: gunzipSync(Buffer.from(file.contentBase64, 'base64')).toString('base64'),
  }));
  const legacyArchive = gzipSync(
    Buffer.from(canonicalPrivateRuntimeJson(legacyEnvelope), 'utf8'),
    { level: 9, mtime: 0 },
  );
  const legacyObjectSha256 = crypto.createHash('sha256').update(legacyArchive).digest('hex');
  const legacyDescriptor = {
    schemaVersion: PROTECTED_PRIVATE_RUNTIME_POLICY.legacySchemaVersion,
    kind: PROTECTED_PRIVATE_RUNTIME_POLICY.legacyDescriptorKind,
    privacyClass: archiveOne.descriptor.privacyClass,
    bucketId: archiveOne.descriptor.bucketId,
    objectSha256: legacyObjectSha256,
    objectPath: `bundles/sha256/${legacyObjectSha256}.json.gz`,
    objectBytes: legacyArchive.length,
    bundleContentSha256: archiveOne.descriptor.bundleContentSha256,
    datasetId: archiveOne.descriptor.datasetId,
    productionReferenceAt: archiveOne.descriptor.productionReferenceAt,
    generatedAt: archiveOne.descriptor.generatedAt,
    sourceHead: archiveOne.descriptor.sourceHead,
    modelBinding: archiveOne.descriptor.modelBinding,
    contractHashes: archiveOne.descriptor.contractHashes,
  };
  const legacyDocuments = fakeDocuments();
  await legacyDocuments.request('', {
    method: 'POST',
    body: JSON.stringify({
      document_key: PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey,
      payload: {
        schemaVersion: PROTECTED_PRIVATE_RUNTIME_POLICY.legacySchemaVersion,
        kind: PROTECTED_PRIVATE_RUNTIME_POLICY.pointerKind,
        current: legacyDescriptor,
        previous: null,
      },
    }),
  });
  const legacyStorage = fakeStorage();
  legacyStorage.objects.set(legacyDescriptor.objectPath, legacyArchive);
  const legacyRestoreBundle = path.join(restoreRoot, 'bundle-legacy');
  await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: legacyRestoreBundle,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    request: legacyDocuments.request,
    storage: legacyStorage.client,
  });
  await verifyPrivateProductionRuntimeBundle({
    privateRoot: restoreRoot,
    bundlePath: legacyRestoreBundle,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
  });
  const rejectedLegacyBundle = path.join(restoreRoot, 'bundle-legacy-over-aggregate-bound');
  await assert.rejects(
    restoreProtectedPrivateProductionRuntime({
      privateRoot: restoreRoot,
      bundlePath: rejectedLegacyBundle,
      repositoryRoot: repository,
      expected: first.expected,
      now: '2026-08-29T11:05:00.000Z',
      request: legacyDocuments.request,
      storage: legacyStorage.client,
      policy: {
        ...PROTECTED_PRIVATE_RUNTIME_POLICY,
        maximumLegacyRawPayloadBytes: legacyEnvelope.rawPayloadBytes - 1,
      },
    }),
    error => {
      assert.match(error.message, /No compatible protected private runtime generation/);
      assert.deepEqual(error.rejectionCodes, ['ARCHIVE_ENVELOPE_DECODE']);
      assert.equal(error.message.includes('payload'), false,
        'terminal restore error must not include private rejection details');
      return true;
    },
  );
  assert.equal(await fs.lstat(rejectedLegacyBundle).catch(() => null), null,
    'a legacy archive over its aggregate bound must not leave a partial destination');

  const publishedFirst = await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: first.bundlePath,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    sourceHead: SOURCE_HEADS[0],
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(publishedFirst.published, true);
  assert.equal(publishedFirst.rollbackAvailable, false);
  assert.equal(documents.row().payload.previous, null);
  assert.equal(storage.objects.size, 1);
  assert.equal(storage.downloads(), 1, 'publication must make one byte-exact object readback');

  const equivalent = await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: first.bundlePath,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    sourceHead: SOURCE_HEADS[0],
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(equivalent.published, false);
  assert.equal(documents.row().version, 1);
  assert.equal(storage.downloads(), 2, 'idempotent publication verifies the one referenced object once');

  const sameContentNewDeploy = await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: first.bundlePath,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    sourceHead: SOURCE_HEADS[1],
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(sameContentNewDeploy.published, false);
  assert.equal(
    sameContentNewDeploy.reason,
    'protected-private-runtime-content-already-current',
  );
  assert.equal(documents.row().payload.current.sourceHead, SOURCE_HEADS[0],
    'code-only reuse must preserve the immutable generation producer');
  assert.equal(documents.row().version, 1,
    'code-only reuse must not create a new private pointer version');

  const ambiguousDocuments = fakeDocuments();
  const ambiguousStorage = fakeStorage();
  await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: first.bundlePath,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    sourceHead: SOURCE_HEADS[0],
    request: ambiguousDocuments.request,
    storage: ambiguousStorage.client,
  });
  const committedGeneration = await createGeneration(5);
  ambiguousDocuments.commitThenLosePatch();
  const recoveredCommittedPublication = await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: committedGeneration.bundlePath,
    repositoryRoot: repository,
    expected: committedGeneration.expected,
    now: '2026-08-29T16:05:00.000Z',
    sourceHead: SOURCE_HEADS[5],
    request: ambiguousDocuments.request,
    storage: ambiguousStorage.client,
  });
  assert.equal(recoveredCommittedPublication.published, true);
  assert.equal(ambiguousDocuments.row().version, 2);
  assert.equal(ambiguousStorage.objects.size, 2,
    'a committed pointer with a lost response must retain current and rollback');

  const successorManifest = JSON.parse(await fs.readFile(
    path.join(first.bundlePath, 'manifest.json'),
    'utf8',
  ));
  const predecessorManifest = clone(successorManifest);
  predecessorManifest.modelBinding = {
    ...successorManifest.modelBinding,
    modelBundleSha256: 'e'.repeat(64),
  };
  predecessorManifest.contractHashes = Object.fromEntries(
    Object.keys(successorManifest.contractHashes).map((key, index) => [
      key,
      String(index + 4).repeat(64),
    ]),
  );
  const predecessorConditions = predecessorManifest.files.find(file => file.id === 'full-conditions');
  predecessorConditions.sha256 = '9'.repeat(64);
  predecessorManifest.bundleContentSha256 = privateRuntimeBundleContentSha256(predecessorManifest);
  const publishedDescriptor = documents.row().payload.current;
  const predecessorDescriptor = {
    ...publishedDescriptor,
    modelBinding: predecessorManifest.modelBinding,
    contractHashes: predecessorManifest.contractHashes,
    bundleContentSha256: predecessorManifest.bundleContentSha256,
  };
  const successorDescriptor = {
    ...publishedDescriptor,
    sourceHead: SOURCE_HEADS[1],
  };
  const successorConditions = successorManifest.files.find(file => file.id === 'full-conditions');
  const migrationReport = {
    schemaVersion: 2,
    kind: 'RAVRADAR_POST_CUTOVER_PRIVATE_RUNTIME_REBIND',
    transitionKind: 'MODEL_BINDING_MIGRATION',
    predecessorSourceHead: predecessorDescriptor.sourceHead,
    datasetId: predecessorDescriptor.datasetId,
    sourceBundleContentSha256: predecessorDescriptor.bundleContentSha256,
    previousIntegratedBundleSha256: predecessorManifest.modelBinding.modelBundleSha256,
    currentIntegratedBundleSha256: successorManifest.modelBinding.modelBundleSha256,
    previousCandidateBundleSha256: '6'.repeat(64),
    currentCandidateBundleSha256: '7'.repeat(64),
    previousContractHashes: predecessorManifest.contractHashes,
    currentContractHashes: successorManifest.contractHashes,
    candidateRuntimeKind: 'ravScoreCandidateGWarmup',
    migratedPartCount: 673,
    changedBindingFieldCount: 680,
    copiedPrivateFileCount: 9,
    migratedConditionsBytes: successorConditions.bytes,
    migratedConditionsSha256: successorConditions.sha256,
    publicHourDeliveryRebound: false,
    migratedPublicHourPackBytes: null,
    migratedPublicHourPackSha256: null,
    measurementsChanged: false,
    candidateStatesChanged: false,
    privatePayloadIncluded: false,
  };
  assert.equal(validateSameReferencePrivateRuntimeSuccessor({
    existingDescriptor: predecessorDescriptor,
    successorDescriptor,
    predecessorManifest,
    successorManifest,
    migrationReport,
  }), true);
  assert.throws(() => validateSameReferencePrivateRuntimeSuccessor({
    existingDescriptor: predecessorDescriptor,
    successorDescriptor,
    predecessorManifest,
    successorManifest,
    migrationReport: { ...migrationReport, measurementsChanged: true },
  }), /successor evidence is invalid/);
  const contractOnlyPredecessorManifest = clone(successorManifest);
  contractOnlyPredecessorManifest.contractHashes = Object.fromEntries(
    Object.keys(successorManifest.contractHashes).map((key, index) => [
      key,
      String(index + 6).repeat(64),
    ]),
  );
  contractOnlyPredecessorManifest.bundleContentSha256 = privateRuntimeBundleContentSha256(
    contractOnlyPredecessorManifest,
  );
  const contractOnlyPredecessorDescriptor = {
    ...successorDescriptor,
    sourceHead: SOURCE_HEADS[2],
    contractHashes: contractOnlyPredecessorManifest.contractHashes,
    bundleContentSha256: contractOnlyPredecessorManifest.bundleContentSha256,
  };
  const contractOnlySuccessorDescriptor = {
    ...successorDescriptor,
    sourceHead: SOURCE_HEADS[3],
  };
  const contractOnlyReport = {
    ...migrationReport,
    transitionKind: 'CONTRACT_ONLY_REBIND',
    predecessorSourceHead: contractOnlyPredecessorDescriptor.sourceHead,
    sourceBundleContentSha256: contractOnlyPredecessorManifest.bundleContentSha256,
    previousIntegratedBundleSha256: successorManifest.modelBinding.modelBundleSha256,
    currentIntegratedBundleSha256: successorManifest.modelBinding.modelBundleSha256,
    previousCandidateBundleSha256: '7'.repeat(64),
    currentCandidateBundleSha256: '7'.repeat(64),
    previousContractHashes: contractOnlyPredecessorManifest.contractHashes,
    changedBindingFieldCount: 0,
  };
  assert.equal(validateSameReferencePrivateRuntimeSuccessor({
    existingDescriptor: contractOnlyPredecessorDescriptor,
    successorDescriptor: contractOnlySuccessorDescriptor,
    predecessorManifest: contractOnlyPredecessorManifest,
    successorManifest,
    migrationReport: contractOnlyReport,
  }), true, 'unchanged private files may be rebound to changed code contracts');
  assert.throws(() => validateSameReferencePrivateRuntimeSuccessor({
    existingDescriptor: contractOnlyPredecessorDescriptor,
    successorDescriptor: contractOnlySuccessorDescriptor,
    predecessorManifest: contractOnlyPredecessorManifest,
    successorManifest,
    migrationReport: { ...contractOnlyReport, changedBindingFieldCount: 1 },
  }), /contract-only rebind evidence is invalid/);
  const historicalRow = documents.row();
  historicalRow.payload.current = predecessorDescriptor;
  historicalRow.payload.previous = null;
  documents.setRow(historicalRow);
  assert.throws(
    () => validateProtectedPrivateRuntimePointer(historicalRow.payload),
    /incompatible modelBundleSha256/,
    'A historical current descriptor must not be accepted without exact transition evidence',
  );
  assert.doesNotThrow(() => validateProtectedPrivateRuntimePointer(historicalRow.payload, {
    allowedCurrentModelBindings: [predecessorManifest.modelBinding],
  }));
  const migratedPublication = await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: first.bundlePath,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    sourceHead: SOURCE_HEADS[1],
    sameReferenceSuccessorEvidence: { predecessorManifest, migrationReport },
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(migratedPublication.published, true);
  assert.equal(migratedPublication.reason, 'protected-private-runtime-same-reference-successor');
  assert.equal(documents.row().payload.previous.modelBinding.modelBundleSha256, 'e'.repeat(64));
  assert.doesNotThrow(() => validateProtectedPrivateRuntimePointer(documents.row().payload),
    'The published pointer must retain a validated historical rollback binding');
  const currentDescription = await describeCurrentProtectedPrivateProductionRuntime({
    request: documents.request,
  });
  assert.deepEqual(Object.keys(currentDescription).sort(), [
    'bundleContentSha256',
    'contractHashes',
    'datasetId',
    'expectedPartCount',
    'expectedZoneCount',
    'generatedAt',
    'kind',
    'modelBinding',
    'privatePayloadIncluded',
    'productionReferenceAt',
    'schemaVersion',
    'sourceHead',
  ].sort());
  assert.equal(currentDescription.sourceHead, SOURCE_HEADS[1]);
  assert.equal(currentDescription.bundleContentSha256,
    documents.row().payload.current.bundleContentSha256);
  assert.equal(currentDescription.privatePayloadIncluded, false);
  assert.doesNotMatch(JSON.stringify(currentDescription), /objectPath|objects|privacyClass|bucketId/);
  const pointerBeforeTargetSelection = documents.row();
  const targetDescription = await describeTargetProtectedPrivateProductionRuntime({
    request: documents.request,
    targetReferenceAt: documents.row().payload.previous.productionReferenceAt,
  });
  assert.equal(targetDescription.kind,
    'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_TARGET_SOURCE');
  assert.equal(targetDescription.sourceHead, SOURCE_HEADS[1],
    'equal-time target selection must prefer the current protected generation');
  const sameReferencePreviousDescription = await describeTargetProtectedPrivateProductionRuntime({
    request: documents.request,
    targetReferenceAt: documents.row().payload.previous.productionReferenceAt,
    datasetId: documents.row().payload.previous.datasetId,
    bundleContentSha256: documents.row().payload.previous.bundleContentSha256,
  });
  assert.equal(sameReferencePreviousDescription.bundleContentSha256,
    documents.row().payload.previous.bundleContentSha256,
    'a restored rollback with the same reference must select its exact dataset');
  await assert.rejects(() => describeTargetProtectedPrivateProductionRuntime({
    request: documents.request,
    targetReferenceAt: documents.row().payload.previous.productionReferenceAt,
    datasetId: 'not-the-restored-dataset',
    bundleContentSha256: documents.row().payload.previous.bundleContentSha256,
  }), /exact target reference and dataset/);
  const splitReferenceRow = documents.row();
  splitReferenceRow.payload.current.productionReferenceAt = '2026-08-29T11:00:00.000Z';
  splitReferenceRow.payload.current.generatedAt = '2026-08-29T11:05:00.000Z';
  documents.setRow(splitReferenceRow);
  const previousTargetDescription = await describeTargetProtectedPrivateProductionRuntime({
    request: documents.request,
    targetReferenceAt: splitReferenceRow.payload.previous.productionReferenceAt,
  });
  assert.equal(previousTargetDescription.bundleContentSha256,
    splitReferenceRow.payload.previous.bundleContentSha256,
    'an older exact target must select the previous protected generation');
  documents.setRow(pointerBeforeTargetSelection);

  const restoreBundle = path.join(restoreRoot, 'bundle-first');
  const downloadsBeforeCurrentRestore = storage.downloads();
  const restoredFirst = await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: restoreBundle,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(restoredFirst.restored, true);
  assert.equal(restoredFirst.rollbackSelected, false);
  assert.equal(restoredFirst.currentGenerationRejected, false);
  assert.equal(restoredFirst.rejectedGenerationCount, 0);
  assert.equal(
    storage.downloads() - downloadsBeforeCurrentRestore,
    1,
    'normal restore must not download the rollback generation',
  );
  await verifyPrivateProductionRuntimeBundle({
    privateRoot: restoreRoot,
    bundlePath: restoreBundle,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
  });

  const second = await createGeneration(1);
  const historicalAdvanceDocuments = fakeDocuments();
  const historicalAdvanceStorage = fakeStorage();
  await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: first.bundlePath,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    sourceHead: SOURCE_HEADS[0],
    request: historicalAdvanceDocuments.request,
    storage: historicalAdvanceStorage.client,
  });
  const historicalCurrentRow = historicalAdvanceDocuments.row();
  historicalCurrentRow.payload.current.modelBinding = {
    ...historicalCurrentRow.payload.current.modelBinding,
    modelBundleSha256: 'e'.repeat(64),
  };
  historicalAdvanceDocuments.setRow(historicalCurrentRow);
  const historicalAdvance = await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: second.bundlePath,
    repositoryRoot: repository,
    expected: second.expected,
    now: '2026-08-29T12:05:00.000Z',
    sourceHead: SOURCE_HEADS[1],
    request: historicalAdvanceDocuments.request,
    storage: historicalAdvanceStorage.client,
  });
  assert.equal(historicalAdvance.published, true,
    'a newer production reference must supersede a structurally valid historical model binding');
  assert.equal(
    historicalAdvanceDocuments.row().payload.previous.modelBinding.modelBundleSha256,
    'e'.repeat(64),
    'the superseded historical binding remains the exact rollback descriptor',
  );
  await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: second.bundlePath,
    repositoryRoot: repository,
    expected: second.expected,
    now: '2026-08-29T12:05:00.000Z',
    sourceHead: SOURCE_HEADS[1],
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(documents.row().version, 3);
  assert.equal(documents.row().payload.previous.objectSha256, archiveOne.descriptor.objectSha256);
  assert.equal(storage.objects.size, 2);

  const realPreviousBundle = path.join(restoreRoot, 'bundle-real-previous');
  const downloadsBeforeRealPrevious = storage.downloads();
  const realPrevious = await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: realPreviousBundle,
    repositoryRoot: repository,
    expected: {
      ...first.expected,
      datasetId: first.conditions.datasetId,
      targetReferenceAt: '2026-08-29T12:00:00.000Z',
      now: '2026-08-29T12:05:00.000Z',
    },
    now: '2026-08-29T12:05:00.000Z',
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(realPrevious.rollbackSelected, true);
  assert.equal(realPrevious.productionReferenceAt, first.conditions.productionReferenceAt);
  assert.equal(storage.downloads() - downloadsBeforeRealPrevious, 2,
    'two real different archives must select previous only after current is incompatible');

  const currentAndHistoricalPrevious = documents.row();
  currentAndHistoricalPrevious.payload.previous.modelBinding = {
    ...currentAndHistoricalPrevious.payload.previous.modelBinding,
    modelBundleSha256: 'e'.repeat(64),
  };
  documents.setRow(currentAndHistoricalPrevious);
  const mixedExpired = await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: path.join(restoreRoot, 'bundle-mixed-expired'),
    repositoryRoot: repository,
    expected: {
      ...second.expected,
      targetReferenceAt: '2026-09-01T12:00:00.000Z',
      minimumReferenceAt: '2026-08-29T12:00:00.000Z',
      minimumGeneratedAt: '2026-08-29T12:00:00.000Z',
      now: '2026-09-01T12:05:00.000Z',
    },
    now: '2026-09-01T12:05:00.000Z',
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(mixedExpired.reason, 'protected-private-runtime-expired');
  documents.setRow({
    ...currentAndHistoricalPrevious,
    payload: {
      ...currentAndHistoricalPrevious.payload,
      previous: archiveOne.descriptor,
    },
  });

  const third = await createGeneration(2);
  await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: third.bundlePath,
    repositoryRoot: repository,
    expected: third.expected,
    now: '2026-08-29T13:05:00.000Z',
    sourceHead: SOURCE_HEADS[2],
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(documents.row().version, 4);
  assert.equal(storage.objects.size, 2, 'only current and rollback objects remain');
  assert.deepEqual(storage.removed, [archiveOne.descriptor.objects[0].objectPath]);

  const expiredBundle = path.join(restoreRoot, 'bundle-expired');
  const expired = await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: expiredBundle,
    repositoryRoot: repository,
    expected: {
      ...third.expected,
      targetReferenceAt: '2026-09-01T13:00:00.000Z',
      minimumReferenceAt: '2026-08-29T13:00:00.000Z',
      minimumGeneratedAt: '2026-08-29T13:00:00.000Z',
      now: '2026-09-01T13:05:00.000Z',
    },
    now: '2026-09-01T13:05:00.000Z',
    request: documents.request,
    storage: storage.client,
  });
  assert.deepEqual(expired, {
    restored: false,
    reason: 'protected-private-runtime-expired',
    targetUnchanged: true,
    privatePayloadLogged: false,
  });
  assert.equal(await fs.lstat(expiredBundle).catch(() => null), null,
    'an expired protected runtime must remain a validated no-op');

  const pointerBeforeRegression = documents.row();
  const downloadsBeforeRegression = storage.downloads();
  await assert.rejects(
    publishProtectedPrivateProductionRuntime({
      privateRoot,
      bundlePath: first.bundlePath,
      repositoryRoot: repository,
      expected: first.expected,
      now: '2026-08-29T13:05:00.000Z',
      sourceHead: SOURCE_HEADS[0],
      request: documents.request,
      storage: storage.client,
    }),
    /regress central production state/,
  );
  assert.deepEqual(documents.row(), pointerBeforeRegression);
  assert.equal(
    storage.downloads(),
    downloadsBeforeRegression,
    'a regressive publication must stop before upload/readback egress',
  );

  const currentPath = documents.row().payload.current.objects[0].objectPath;
  const currentBytes = Buffer.from(storage.objects.get(currentPath));
  currentBytes[0] ^= 1;
  storage.objects.set(currentPath, currentBytes);
  const rollbackBundle = path.join(restoreRoot, 'bundle-rollback');
  const downloadsBeforeRollback = storage.downloads();
  const rollback = await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: rollbackBundle,
    repositoryRoot: repository,
    expected: third.expected,
    now: '2026-08-29T13:05:00.000Z',
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(rollback.rollbackSelected, true);
  assert.equal(rollback.currentGenerationRejected, true);
  assert.equal(rollback.rejectedGenerationCount, 1);
  assert.equal(rollback.productionReferenceAt, second.conditions.productionReferenceAt);
  assert.equal(
    storage.downloads() - downloadsBeforeRollback,
    2,
    'rollback restore downloads previous only after current fails verification',
  );

  const previousPath = documents.row().payload.previous.objects[0].objectPath;
  const previousBytes = Buffer.from(storage.objects.get(previousPath));
  previousBytes[0] ^= 1;
  storage.objects.set(previousPath, previousBytes);
  await assert.rejects(
    restoreProtectedPrivateProductionRuntime({
      privateRoot: restoreRoot,
      bundlePath: path.join(restoreRoot, 'bundle-none-compatible'),
      repositoryRoot: repository,
      expected: third.expected,
      now: '2026-08-29T13:05:00.000Z',
      request: documents.request,
      storage: storage.client,
    }),
    error => {
      assert.match(error.message, /No compatible protected private runtime generation/);
      assert.deepEqual(error.rejectionCodes, [
        'STORAGE_OR_OBJECT_INTEGRITY',
        'STORAGE_OR_OBJECT_INTEGRITY',
      ]);
      return true;
    },
  );

  storage.setAnonymousStatus(403);
  assert.equal((await auditProtectedPrivateRuntimeAnonymousDenial({
    request: documents.request,
    storage: storage.client,
  })).anonymousReadDenied, true);
  storage.setAnonymousStatus(400);
  assert.equal((await auditProtectedPrivateRuntimeAnonymousDenial({
    request: documents.request,
    storage: storage.client,
  })).anonymousReadDenied, true);
  storage.setAnonymousStatus(200);
  await assert.rejects(
    auditProtectedPrivateRuntimeAnonymousDenial({
      request: documents.request,
      storage: storage.client,
    }),
    /anonymously readable/,
  );

  await assert.rejects(
    buildProtectedPrivateRuntimeArchive({
      privateRoot,
      bundlePath: third.bundlePath,
      repositoryRoot: repository,
      expected: third.expected,
      now: '2026-08-29T13:05:00.000Z',
      sourceHead: SOURCE_HEADS[2],
      policy: { ...PROTECTED_PRIVATE_RUNTIME_POLICY, maximumRawPayloadBytes: 32 },
    }),
    /raw payload exceeds/,
  );
  await assert.rejects(
    buildProtectedPrivateRuntimeArchive({
      privateRoot,
      bundlePath: third.bundlePath,
      repositoryRoot: repository,
      expected: third.expected,
      now: '2026-08-29T13:05:00.000Z',
      sourceHead: SOURCE_HEADS[2],
      policy: { ...PROTECTED_PRIVATE_RUNTIME_POLICY, maximumFilePayloadBytes: 32 },
    }),
    /size limit/,
  );
  await assert.rejects(
    buildProtectedPrivateRuntimeArchive({
      privateRoot,
      bundlePath: third.bundlePath,
      repositoryRoot: repository,
      expected: third.expected,
      now: '2026-08-29T13:05:00.000Z',
      sourceHead: SOURCE_HEADS[2],
      policy: { ...PROTECTED_PRIVATE_RUNTIME_POLICY, maximumArchiveAggregateBytes: 32 },
    }),
    /compressed archive aggregate exceeds/,
  );

  // A CAS loss must never be interpreted as publication success.
  const fourth = await createGeneration(3);
  const cleanStorage = fakeStorage();
  for (const [key, value] of storage.objects) cleanStorage.objects.set(key, Buffer.from(value));
  // Restore untampered generations required by the publication readback.
  const thirdArchive = await buildProtectedPrivateRuntimeArchive({
    privateRoot,
    bundlePath: third.bundlePath,
    repositoryRoot: repository,
    expected: third.expected,
    now: '2026-08-29T13:05:00.000Z',
    sourceHead: SOURCE_HEADS[2],
  });
  for (const object of thirdArchive.objects) {
    cleanStorage.objects.set(object.descriptor.objectPath, Buffer.from(object.bytes));
  }
  documents.losePatch();
  const referencedBeforeCasLoss = new Set([
    ...documents.row().payload.current.objects.map(object => object.objectPath),
    ...documents.row().payload.previous.objects.map(object => object.objectPath),
  ]);
  await assert.rejects(
    publishProtectedPrivateProductionRuntime({
      privateRoot,
      bundlePath: fourth.bundlePath,
      repositoryRoot: repository,
      expected: fourth.expected,
      now: '2026-08-29T14:05:00.000Z',
      sourceHead: SOURCE_HEADS[3],
      request: documents.request,
      storage: cleanStorage.client,
    }),
    /compare-and-swap lost a concurrent write/,
  );
  assert.equal(documents.row().version, 4);
  assert.equal(cleanStorage.objects.size, 2,
    'a lost CAS must remove only the newly-created unreferenced object');
  assert.deepEqual(new Set(cleanStorage.objects.keys()), referencedBeforeCasLoss,
    'a lost CAS must preserve both pointer-referenced generations');
  assert.equal(cleanStorage.removed.length, 1,
    'a lost CAS must perform exactly one bounded orphan cleanup');
  assert.equal(referencedBeforeCasLoss.has(cleanStorage.removed[0]), false,
    'orphan cleanup must never delete current or previous');

  const implementation = await fs.readFile(
    'scripts/protected-private-production-runtime.mjs',
    'utf8',
  );
  assert.equal(implementation.includes('admin_document_versions'), false,
    'private runtime publication must preserve all existing admin-document history');
  assert.equal(implementation.includes('version cleanup'), false,
    'private runtime publication must not retain a hidden history-deletion path');
  assert.equal(implementation.includes('isSyntacticallyValidBase64'), true,
    'large base64 envelopes must use bounded linear syntax validation');
  assert.equal(implementation.includes("Buffer.from(file.contentBase64, 'base64')"), false,
    'restore must not allocate one decoded Buffer for an entire large cache file');
  assert.equal(implementation.includes('Readable.from(decodeBase64Chunks'), true,
    'restore must decode large cache files as bounded chunks');

  console.log('Protected private runtime storage, retention, rollback and anonymous-denial contract passes.');
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
