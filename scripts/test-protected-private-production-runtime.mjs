import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { gzipSync, gunzipSync } from 'node:zlib';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import {
  PRIVATE_RUNTIME_REPOSITORY_ROOT,
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
  LATEST_WEATHER_PREDECESSOR,
  PRIVATE_HOURLY_V1_PREDECESSOR,
  EXACT_WEATHER_PAIR_MODEL_BUNDLE_SHA256,
  PROTECTED_PRIVATE_RUNTIME_POLICY,
  auditProtectedPrivateRuntimeAnonymousDenial,
  buildProtectedPrivateRuntimeArchive,
  createProtectedPrivateRuntimeClients,
  describeCurrentProtectedPrivateProductionRuntime,
  describeTargetProtectedPrivateProductionRuntime,
  publishProtectedPrivateProductionRuntime,
  restoreExactProtectedPrivateWeatherPair,
  restoreExactPreviousDmiBulkDonor,
  restoreProtectedPrivateProductionRuntime,
  isExactDmiMarineSeamPredecessor,
  isExactDmiSchedulerPredecessor,
  isExactWeatherRotationPredecessor,
  isExactMarineComponentPredecessor,
  isApprovedExactWeatherPredecessor,
  isExactHistoricalWeatherPairGeneration,
  migrateProtectedPrivateRuntimeToR2,
  validateSameReferencePrivateRuntimeSuccessor,
  validateProtectedPrivateRuntimePointer,
} from './protected-private-production-runtime.mjs';
import { SOURCE_GATE_PRODUCERS } from './lib/weather-source-gate.mjs';
import { OWNER_CURRENT_DOMAIN_PREDECESSOR }
  from './lib/bounded-conditions-predecessor-transition.mjs';

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
  const legacyCompatibleContracts = {
    ...baselineContracts,
    continuationStateContractSha256:
      DMI_SCHEDULER_ONLY_PREDECESSOR.continuationStateContractSha256,
    // Historical one-time fixtures retain their exact Top5 projection. They
    // must not renew admission against the later Top20 public projection.
    publicProjectionContractSha256:
      DMI_SCHEDULER_ONLY_PREDECESSOR.publicProjectionContractSha256,
  };
  assert.notEqual(baselineContracts.continuationStateContractSha256,
    legacyCompatibleContracts.continuationStateContractSha256,
    'the current release must not silently reuse the old continuation contract');
  assert.notEqual(
    baselineContracts.publicProjectionContractSha256,
    DMI_SCHEDULER_ONLY_PREDECESSOR.publicProjectionContractSha256,
    'Top20 changes the projection; old one-time admission must remain closed',
  );
  assert.equal(legacyCompatibleContracts.continuationStateContractSha256,
    DMI_MARINE_SEAM_PREDECESSOR.continuationStateContractSha256);
  assert.equal(legacyCompatibleContracts.publicProjectionContractSha256,
    DMI_MARINE_SEAM_PREDECESSOR.publicProjectionContractSha256);
  assert.equal(legacyCompatibleContracts.continuationStateContractSha256,
    WEATHER_ROTATION_PREDECESSOR.continuationStateContractSha256);
  assert.equal(legacyCompatibleContracts.publicProjectionContractSha256,
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
    contractHashes: legacyCompatibleContracts,
  };
  assert.equal(isExactDmiSchedulerPredecessor(schedulerPredecessor, schedulerExpected), true);
  assert.equal(isExactDmiSchedulerPredecessor(schedulerPredecessor, {
    ...schedulerExpected, contractHashes: baselineContracts,
  }), false, 'current Top20 must not inherit the historical scheduler exception');
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
    expected: { ...await buildPrivateRuntimeExpectation({
      repositoryRoot: repository,
      targetReferenceAt: '2026-09-23T18:00:00.000Z',
      now: '2026-09-23T18:05:00.000Z',
    }), contractHashes: legacyCompatibleContracts },
    now: '2026-09-23T18:05:00.000Z',
    request: bridgeDocuments.request,
    storage: bridgeStorage.client,
  });
  const beforeOriginalCheckDownloads = bridgeStorage.downloads();
  const originalTarget = path.join(restoreRoot, 'owner-original-not-current');
  await assert.rejects(() => restoreProtectedPrivateProductionRuntime({ privateRoot: restoreRoot,
    bundlePath: originalTarget, repositoryRoot: repository,
    expected: { ...clone(OWNER_CURRENT_DOMAIN_PREDECESSOR),
      ownerCurrentDomainTransition: 'EXACT_ORIGINAL_RESTORE_V1',
      targetReferenceAt: '2026-10-04T16:00:00.000Z',
      minimumReferenceAt: OWNER_CURRENT_DOMAIN_PREDECESSOR.productionReferenceAt,
      minimumGeneratedAt: OWNER_CURRENT_DOMAIN_PREDECESSOR.generatedAt },
    now: '2026-10-04T18:00:00.000Z', request: bridgeDocuments.request, storage: bridgeStorage.client }),
  /no longer the exact protected current/);
  assert.equal(bridgeStorage.downloads(), beforeOriginalCheckDownloads,
    'A stale original must be rejected before archive download or fallback');
  await assert.rejects(fs.lstat(originalTarget), { code: 'ENOENT' });
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
    expected: { ...await buildPrivateRuntimeExpectation({
      repositoryRoot: repository,
      targetReferenceAt: '2026-09-23T22:00:00.000Z',
      now: '2026-09-23T22:05:00.000Z',
    }), contractHashes: legacyCompatibleContracts },
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
    expected: { ...await buildPrivateRuntimeExpectation({
      repositoryRoot: repository,
      targetReferenceAt: '2026-09-24T02:00:00.000Z',
      now: '2026-09-24T02:05:00.000Z',
    }), contractHashes: legacyCompatibleContracts },
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
  const hourlyV1Predecessor = {
    ...PRIVATE_HOURLY_V1_PREDECESSOR,
    modelBinding: ravScoreModelBinding(),
    contractHashes: {
      continuationStateContractSha256: PRIVATE_HOURLY_V1_PREDECESSOR.continuationStateContractSha256,
      fullRuntimeContractSha256: PRIVATE_HOURLY_V1_PREDECESSOR.fullRuntimeContractSha256,
      publicProjectionContractSha256: PRIVATE_HOURLY_V1_PREDECESSOR.publicProjectionContractSha256,
    },
  };
  const hourlyV2Expected = {
    modelBinding: ravScoreModelBinding(), contractHashes: {
      ...baselineContracts,
      // This historical one-time v1 -> v2 fixture predates both Top20 and
      // the CP child-close continuation successor. Neither current contract
      // may renew the old exact-predecessor exception.
      continuationStateContractSha256: PRIVATE_HOURLY_V1_PREDECESSOR.continuationStateContractSha256,
      publicProjectionContractSha256: PRIVATE_HOURLY_V1_PREDECESSOR.publicProjectionContractSha256,
    },
  };
  assert.equal(isApprovedExactWeatherPredecessor(hourlyV1Predecessor, {
    ...hourlyV2Expected, contractHashes: baselineContracts,
  }), false, 'current Top20 must not inherit the historical hourly-v1 exception');
  assert.equal(isApprovedExactWeatherPredecessor(hourlyV1Predecessor, {
    ...hourlyV2Expected, contractHashes: {
      ...hourlyV2Expected.contractHashes,
      continuationStateContractSha256: baselineContracts.continuationStateContractSha256,
    },
  }), false, 'current CP continuation must not inherit the historical hourly-v1 exception');
  assert.equal(isApprovedExactWeatherPredecessor(hourlyV1Predecessor, hourlyV2Expected), true);
  for (const change of [
    { sourceHead: SOURCE_HEADS[0] },
    { datasetId: 'rr-wrong-generation' },
    { productionReferenceAt: '2026-09-27T03:00:00.000Z' },
    { contractHashes: { ...hourlyV1Predecessor.contractHashes,
      fullRuntimeContractSha256: 'a'.repeat(64) } },
    { modelBinding: { ...hourlyV1Predecessor.modelBinding, modelBundleSha256: 'a'.repeat(64) } },
  ]) {
    assert.equal(isApprovedExactWeatherPredecessor(
      { ...hourlyV1Predecessor, ...change }, hourlyV2Expected), false);
  }
  const latestWeatherPredecessor = {
    ...LATEST_WEATHER_PREDECESSOR,
    modelBinding: ravScoreModelBinding(),
    contractHashes: {
      continuationStateContractSha256: LATEST_WEATHER_PREDECESSOR.continuationStateContractSha256,
      fullRuntimeContractSha256: LATEST_WEATHER_PREDECESSOR.fullRuntimeContractSha256,
      publicProjectionContractSha256: LATEST_WEATHER_PREDECESSOR.publicProjectionContractSha256,
    },
  };
  const historicalPairExpected = {
    modelBinding: ravScoreModelBinding(),
    contractHashes: baselineContracts,
  };
  for (const [member, approved] of [
    [completeWeatherPredecessor, COMPLETE_WEATHER_PREDECESSOR],
    [latestWeatherPredecessor, LATEST_WEATHER_PREDECESSOR],
  ]) {
    const oldMember = { ...member, modelBinding: {
      ...member.modelBinding,
      modelBundleSha256: EXACT_WEATHER_PAIR_MODEL_BUNDLE_SHA256,
    } };
    assert.equal(isExactHistoricalWeatherPairGeneration(
      oldMember, historicalPairExpected, approved), true);
    assert.equal(isExactHistoricalWeatherPairGeneration(
      member, historicalPairExpected, approved), false);
    assert.equal(isExactHistoricalWeatherPairGeneration({
      ...oldMember,
      contractHashes: { ...oldMember.contractHashes,
        fullRuntimeContractSha256: 'a'.repeat(64) },
    }, historicalPairExpected, approved), false);
  }
  assert.equal(isApprovedExactWeatherPredecessor(latestWeatherPredecessor, schedulerExpected), false);
  for (const change of [
    { datasetId: COMPLETE_WEATHER_PREDECESSOR.datasetId },
    { productionReferenceAt: COMPLETE_WEATHER_PREDECESSOR.productionReferenceAt },
    { contractHashes: { ...latestWeatherPredecessor.contractHashes,
      fullRuntimeContractSha256: COMPLETE_WEATHER_PREDECESSOR.fullRuntimeContractSha256 } },
  ]) {
    assert.equal(isApprovedExactWeatherPredecessor(
      { ...latestWeatherPredecessor, ...change }, schedulerExpected,
    ), false);
  }
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
    expected: { ...await buildPrivateRuntimeExpectation({
      repositoryRoot: repository,
      targetReferenceAt: '2026-09-24T10:00:00.000Z',
      now: '2026-09-24T10:05:00.000Z',
    }), contractHashes: legacyCompatibleContracts },
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
    expected: { ...await buildPrivateRuntimeExpectation({
      repositoryRoot: repository,
      targetReferenceAt: '2026-09-24T17:00:00.000Z',
      now: '2026-09-24T17:05:00.000Z',
    }), contractHashes: legacyCompatibleContracts },
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
  const pairedDocuments = fakeDocuments();
  const pairedStorage = fakeStorage();
  const pairedTarget = '2026-09-24T17:00:00.000Z';
  const pairedNow = '2026-09-24T17:05:00.000Z';
  const pairedExpected = await buildPrivateRuntimeExpectation({
    repositoryRoot: repository, targetReferenceAt: pairedTarget, now: pairedNow,
  });
  pairedExpected.contractHashes = legacyCompatibleContracts;
  await publishProtectedPrivateProductionRuntime({
    privateRoot, bundlePath: completeGeneration.bundlePath, repositoryRoot: repository,
    expected: { ...pairedExpected, contractHashes: completeWeatherPredecessor.contractHashes },
    now: pairedNow, sourceHead: COMPLETE_WEATHER_PREDECESSOR.sourceHead,
    request: pairedDocuments.request, storage: pairedStorage.client,
  });
  const latestGeneration = await createGeneration(12, {
    metadataOverride: {
      datasetId: LATEST_WEATHER_PREDECESSOR.datasetId,
      generatedAt: '2026-09-24T16:30:02.000Z',
      productionReferenceAt: LATEST_WEATHER_PREDECESSOR.productionReferenceAt,
    },
    contractHashesOverride: latestWeatherPredecessor.contractHashes,
  });
  await publishProtectedPrivateProductionRuntime({
    privateRoot, bundlePath: latestGeneration.bundlePath, repositoryRoot: repository,
    expected: { ...pairedExpected, contractHashes: latestWeatherPredecessor.contractHashes },
    now: pairedNow, sourceHead: LATEST_WEATHER_PREDECESSOR.sourceHead,
    request: pairedDocuments.request, storage: pairedStorage.client,
  });
  await assert.rejects(() => restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: path.join(restoreRoot, 'unsafe-single-latest-or-older'),
    repositoryRoot: repository,
    expected: pairedExpected,
    now: pairedNow,
    request: pairedDocuments.request,
    storage: pairedStorage.client,
  }), /requires paired 11Z\/15Z restore/);
  const latestPairPath = path.join(restoreRoot, 'weather-pair-latest');
  const completePairPath = path.join(restoreRoot, 'weather-pair-complete');
  const pairResult = await restoreExactProtectedPrivateWeatherPair({
    privateRoot: restoreRoot,
    latestBundlePath: latestPairPath,
    completeBundlePath: completePairPath,
    repositoryRoot: repository,
    expected: pairedExpected,
    now: pairedNow,
    request: pairedDocuments.request,
    storage: pairedStorage.client,
  });
  assert.equal(pairResult.restored, true);
  assert.equal(pairResult.centralVersion, pairedDocuments.row().version);
  for (const [bundlePath, approved] of [
    [latestPairPath, latestWeatherPredecessor],
    [completePairPath, completeWeatherPredecessor],
  ]) {
    const manifest = JSON.parse(await fs.readFile(path.join(bundlePath, 'manifest.json'), 'utf8'));
    assert.equal(manifest.datasetId, approved.datasetId);
    await verifyPrivateProductionRuntimeBundle({
      privateRoot: restoreRoot, bundlePath, repositoryRoot: repository,
      expected: { ...pairedExpected, contractHashes: approved.contractHashes }, now: pairedNow,
    });
  }
  const badPairRow = pairedDocuments.row();
  badPairRow.payload.previous.datasetId = 'rr-unapproved-weather-donor';
  pairedDocuments.setRow(badPairRow);
  const rejectedLatestPath = path.join(restoreRoot, 'weather-pair-rejected-latest');
  const rejectedCompletePath = path.join(restoreRoot, 'weather-pair-rejected-complete');
  await assert.rejects(() => restoreExactProtectedPrivateWeatherPair({
    privateRoot: restoreRoot, latestBundlePath: rejectedLatestPath,
    completeBundlePath: rejectedCompletePath, repositoryRoot: repository,
    expected: pairedExpected, now: pairedNow,
    request: pairedDocuments.request, storage: pairedStorage.client,
  }), /exact protected 11Z\/15Z weather pair/);
  assert.equal(await fs.lstat(rejectedLatestPath).catch(() => null), null);
  assert.equal(await fs.lstat(rejectedCompletePath).catch(() => null), null);
  pairedDocuments.setRow({ ...badPairRow, payload: {
    ...badPairRow.payload,
    previous: { ...badPairRow.payload.previous,
      datasetId: COMPLETE_WEATHER_PREDECESSOR.datasetId },
  } });
  const corruptedPath = pairedDocuments.row().payload.previous.objects[0].objectPath;
  const originalObject = pairedStorage.objects.get(corruptedPath);
  pairedStorage.objects.set(corruptedPath, Buffer.from('corrupt protected donor'));
  await assert.rejects(() => restoreExactProtectedPrivateWeatherPair({
    privateRoot: restoreRoot, latestBundlePath: rejectedLatestPath,
    completeBundlePath: rejectedCompletePath, repositoryRoot: repository,
    expected: pairedExpected, now: pairedNow,
    request: pairedDocuments.request, storage: pairedStorage.client,
  }), /storage readback|object integrity|archive/i);
  assert.equal(await fs.lstat(rejectedLatestPath).catch(() => null), null);
  assert.equal(await fs.lstat(rejectedCompletePath).catch(() => null), null);
  pairedStorage.objects.set(corruptedPath, originalObject);
  let pairedRenameCount = 0;
  await assert.rejects(() => restoreExactProtectedPrivateWeatherPair({
    privateRoot: restoreRoot, latestBundlePath: rejectedLatestPath,
    completeBundlePath: rejectedCompletePath, repositoryRoot: repository,
    expected: pairedExpected, now: pairedNow,
    request: pairedDocuments.request, storage: pairedStorage.client,
    renameImpl: async (source, destination) => {
      pairedRenameCount += 1;
      if (pairedRenameCount === 2) throw new Error('synthetic second rename failure');
      await fs.rename(source, destination);
    },
  }), /synthetic second rename failure/);
  assert.equal(pairedRenameCount, 2);
  assert.equal(await fs.lstat(rejectedLatestPath).catch(() => null), null);
  assert.equal(await fs.lstat(rejectedCompletePath).catch(() => null), null);
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
  const priorEncoderEnvelope = { ...encodedEnvelope, files: await Promise.all(encodedEnvelope.files.map(async file => ({
    path: file.path,
    bytes: file.bytes,
    sha256: file.sha256,
    contentBase64: gzipSync(await fs.readFile(path.join(first.bundlePath, file.path)),
      { level: 9, mtime: 0 }).toString('base64'),
  }))) };
  assert.deepEqual(archiveOne.archive,
    gzipSync(Buffer.from(canonicalPrivateRuntimeJson(priorEncoderEnvelope), 'utf8'), { level: 9, mtime: 0 }),
    'pre-allocation guards must not change any bytes from the prior file-compressed encoder');
  const exactEnvelopeBytes = gunzipSync(archiveOne.archive).length;
  const buildFirstArchive = policy => buildProtectedPrivateRuntimeArchive({
    privateRoot, bundlePath: first.bundlePath, repositoryRoot: repository,
    expected: first.expected, now: '2026-08-29T11:05:00.000Z', sourceHead: SOURCE_HEADS[0], policy,
  });
  assert.deepEqual((await buildFirstArchive({
    ...PROTECTED_PRIVATE_RUNTIME_POLICY, maximumEnvelopeBytes: exactEnvelopeBytes,
  })).archive, archiveOne.archive,
  'an exact envelope byte boundary must preserve the existing canonical archive bytes');

  // These tiny policy limits exercise the real guard without allocating a huge
  // fixture. Observe the dangerous operations, not just the eventual rejection.
  const originalBufferToString = Buffer.prototype.toString;
  let guardedBase64Allocations = 0;
  try {
    Buffer.prototype.toString = function (encoding, ...arguments_) {
      if (encoding === 'base64') guardedBase64Allocations += 1;
      return originalBufferToString.call(this, encoding, ...arguments_);
    };
    await assert.rejects(buildFirstArchive({
      ...PROTECTED_PRIVATE_RUNTIME_POLICY, maximumEnvelopeBytes: 1,
    }), /base64 content exceeds its string bound/);
  } finally { Buffer.prototype.toString = originalBufferToString; }
  assert.equal(guardedBase64Allocations, 0,
    'oversized base64 must be rejected before Buffer.toString allocates it');

  const firstTwoBase64Lengths = encodedEnvelope.files.slice(0, 2).map(file => file.contentBase64.length);
  const cumulativeBase64Bound = firstTwoBase64Lengths.reduce((sum, length) => sum + length, 0) - 1;
  assert.ok(firstTwoBase64Lengths.every(length => length <= cumulativeBase64Bound),
    'each fixture string fits alone, while the second exceeds their cumulative bound');
  guardedBase64Allocations = 0;
  try {
    Buffer.prototype.toString = function (encoding, ...arguments_) {
      if (encoding === 'base64') guardedBase64Allocations += 1;
      return originalBufferToString.call(this, encoding, ...arguments_);
    };
    await assert.rejects(buildFirstArchive({
      ...PROTECTED_PRIVATE_RUNTIME_POLICY, maximumEnvelopeBytes: cumulativeBase64Bound,
    }), /base64 content exceeds its string bound/);
  } finally { Buffer.prototype.toString = originalBufferToString; }
  assert.equal(guardedBase64Allocations, 1,
    'cumulative overflow must reject before allocating the second individually valid base64 string');

  assert.ok(encodedEnvelope.files.every(file => file.contentBase64.length < exactEnvelopeBytes - 1));
  const originalJsonStringify = JSON.stringify;
  let guardedEnvelopeAllocations = 0;
  try {
    JSON.stringify = function (value, ...arguments_) {
      if (value?.kind === PROTECTED_PRIVATE_RUNTIME_POLICY.archiveKind
        && value.files?.some(file => file.contentBase64.length > 0)) guardedEnvelopeAllocations += 1;
      return originalJsonStringify.call(this, value, ...arguments_);
    };
    await assert.rejects(buildFirstArchive({
      ...PROTECTED_PRIVATE_RUNTIME_POLICY, maximumEnvelopeBytes: exactEnvelopeBytes - 1,
    }), /envelope exceeds its string bound/);
  } finally { JSON.stringify = originalJsonStringify; }
  assert.equal(guardedEnvelopeAllocations, 0,
    'combined envelope overflow must be rejected before canonical payload stringify');

  const escapedMetadataPolicy = {
    ...PROTECTED_PRIVATE_RUNTIME_POLICY,
    archiveKind: `${PROTECTED_PRIVATE_RUNTIME_POLICY.archiveKind}\u0000\n\"\\æ🦀\ud800`,
  };
  const escapedMetadataArchive = await buildFirstArchive(escapedMetadataPolicy);
  const escapedEnvelopeBytes = gunzipSync(escapedMetadataArchive.archive).length;
  assert.deepEqual((await buildFirstArchive({
    ...escapedMetadataPolicy, maximumEnvelopeBytes: escapedEnvelopeBytes,
  })).archive, escapedMetadataArchive.archive,
  'metadata escaping, multibyte UTF-8 and lone surrogates must be measured exactly');
  await assert.rejects(buildFirstArchive({
    ...escapedMetadataPolicy, maximumEnvelopeBytes: escapedEnvelopeBytes - 1,
  }), /envelope exceeds its string bound/);
  for (const invalidBound of [0, -1, NaN, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(buildFirstArchive({
      ...PROTECTED_PRIVATE_RUNTIME_POLICY, maximumEnvelopeBytes: invalidBound,
    }), /object-set policy is invalid/);
  }
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
  const migratedStorage = fakeStorage();
  const migrated = await migrateProtectedPrivateRuntimeToR2({
    request: splitDocuments.request,
    sourceStorage: splitStorage.client,
    targetStorage: migratedStorage.client,
    policy: splitPolicy,
  });
  assert.equal(migrated.migrated, true);
  assert.equal(migrated.pointerUnchanged, true);
  assert.equal(migrated.objectCount, splitArchive.objects.length);
  assert.deepEqual(migratedStorage.objects, splitStorage.objects,
    'migration must copy exact bytes without changing the central pointer');
  const migrationPointerBefore = splitDocuments.row();
  await migrateProtectedPrivateRuntimeToR2({
    request: splitDocuments.request,
    sourceStorage: splitStorage.client,
    targetStorage: migratedStorage.client,
    policy: splitPolicy,
  });
  assert.deepEqual(splitDocuments.row(), migrationPointerBefore,
    'idempotent migration must not write the production pointer');
  migratedStorage.objects.set(splitArchive.objects[0].descriptor.objectPath, Buffer.from('tampered'));
  await assert.rejects(
    migrateProtectedPrivateRuntimeToR2({
      request: splitDocuments.request,
      sourceStorage: splitStorage.client,
      targetStorage: migratedStorage.client,
      policy: splitPolicy,
    }),
    /storage readback is invalid/,
    'an existing R2 object collision must fail rather than overwrite',
  );

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
  for (const [label, boundedDocuments, boundedStorage, envelope] of [
    ['current', splitDocuments, splitStorage, encodedEnvelope],
    ['legacy', legacyDocuments, legacyStorage, legacyEnvelope],
  ]) {
    const envelopeLength = Buffer.byteLength(canonicalPrivateRuntimeJson(envelope), 'utf8');
    const boundedBundle = path.join(restoreRoot, `bundle-${label}-envelope-exact`);
    await restoreProtectedPrivateProductionRuntime({
      privateRoot: restoreRoot, bundlePath: boundedBundle, repositoryRoot: repository,
      expected: first.expected, now: '2026-08-29T11:05:00.000Z',
      request: boundedDocuments.request, storage: boundedStorage.client,
      policy: { ...splitPolicy, maximumEnvelopeBytes: envelopeLength },
    });
    for (const entry of envelope.files) {
      assert.deepEqual(await fs.readFile(path.join(boundedBundle, entry.path)),
        await fs.readFile(path.join(first.bundlePath, entry.path)),
        `${label} exact-bound restore must reproduce each original file byte-for-byte`);
    }
    const failedBundle = path.join(restoreRoot, `bundle-${label}-envelope-over-bound`);
    let unsafeDecodedStrings = 0;
    try {
      Buffer.prototype.toString = function (encoding, ...arguments_) {
        if (encoding === 'utf8' && this.length === envelopeLength) unsafeDecodedStrings += 1;
        return originalBufferToString.call(this, encoding, ...arguments_);
      };
      await assert.rejects(restoreProtectedPrivateProductionRuntime({
        privateRoot: restoreRoot, bundlePath: failedBundle, repositoryRoot: repository,
        expected: first.expected, now: '2026-08-29T11:05:00.000Z',
        request: boundedDocuments.request, storage: boundedStorage.client,
        policy: { ...splitPolicy, maximumEnvelopeBytes: envelopeLength - 1 },
      }), error => {
        assert.match(error.message, /No compatible protected private runtime generation/);
        assert.deepEqual(error.rejectionCodes, ['ARCHIVE_ENVELOPE_DECODE']);
        return true;
      });
    } finally { Buffer.prototype.toString = originalBufferToString; }
    assert.equal(unsafeDecodedStrings, 0, `${label} decoder must reject before UTF-8 string allocation`);
    assert.equal(await fs.lstat(failedBundle).catch(() => null), null,
      `${label} decoder overflow must not install a partial bundle`);
  }
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
  assert.throws(() => validateSameReferencePrivateRuntimeSuccessor({
    existingDescriptor: predecessorDescriptor,
    successorDescriptor,
    predecessorManifest,
    successorManifest,
    migrationReport: { ...migrationReport,
      transitionKind: 'OWNER_CURRENT_ORIGINAL_ARCHIVE_BRIDGE' },
  }), /owner original archive bridge is not the exact original-to-successor binding/,
  'A generic binding report cannot become an owner-original bridge by relabelling its kind');
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

  await test('ordinary protected restore requires an existing bucket without changing publication defaults', async () => {
    const bucketPath = `/storage/v1/bucket/${PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId}`;
    const objectPrefix = `/storage/v1/object/authenticated/${PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId}/`;
    const originalPointer = documents.row();
    for (const missing of [true, false]) {
      const calls = [];
      const clients = createProtectedPrivateRuntimeClients({
        supabaseUrl: 'https://synthetic-project.supabase.co',
        serviceRoleKey: 'synthetic-service-role-key',
        storageBackend: 'supabase',
        fetchImpl: async (url, options = {}) => {
          const pathname = new URL(url).pathname;
          const method = options.method ?? 'GET';
          calls.push({ method, pathname });
          assert.equal(method, 'GET', 'ordinary restore must never create, overwrite or remove remote storage');
          if (pathname === '/rest/v1/admin_documents') {
            return new Response(JSON.stringify([originalPointer]), { status: 200 });
          }
          if (pathname === bucketPath) {
            return missing ? new Response('', { status: 404 }) : new Response(JSON.stringify({
              id: PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId,
              name: PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId,
              public: false,
              file_size_limit: PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveBytes,
              allowed_mime_types: [PROTECTED_PRIVATE_RUNTIME_POLICY.mimeType],
            }), { status: 200 });
          }
          assert.ok(pathname.startsWith(objectPrefix), 'only the selected synthetic archive may be read');
          const objectPath = decodeURIComponent(pathname.slice(objectPrefix.length));
          assert.equal(objectPath, originalPointer.payload.current.objects[0].objectPath);
          const bytes = storage.objects.get(objectPath);
          assert.ok(Buffer.isBuffer(bytes));
          return new Response(bytes, { status: 200, headers: { 'content-length': String(bytes.length) } });
        },
      });
      const bundlePath = path.join(restoreRoot, missing ? 'existing-only-missing' : 'existing-only-restored');
      const restore = restoreProtectedPrivateProductionRuntime({
        privateRoot: restoreRoot, bundlePath, repositoryRoot: repository,
        expected: first.expected, now: '2026-08-29T11:05:00.000Z',
        request: clients.documentRequest, storage: clients.storage,
      });
      if (missing) {
        await assert.rejects(restore, /restore requires an existing bucket/);
        assert.deepEqual(calls, [
          { method: 'GET', pathname: '/rest/v1/admin_documents' },
          { method: 'GET', pathname: bucketPath },
        ]);
        assert.equal(await fs.lstat(bundlePath).catch(() => null), null);
      } else {
        const restored = await restore;
        assert.equal(restored.restored, true);
        assert.equal(restored.rollbackSelected, false);
        assert.equal(calls.filter(call => call.pathname.startsWith(objectPrefix)).length, 1);
        await verifyPrivateProductionRuntimeBundle({
          privateRoot: restoreRoot, bundlePath, repositoryRoot: repository,
          expected: first.expected, now: '2026-08-29T11:05:00.000Z',
        });
      }
      assert.deepEqual(documents.row(), originalPointer);
    }
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
  const exactDonorPath = path.join(restoreRoot, 'previous-dmi-donor.json');
  const exactDonor = await restoreExactPreviousDmiBulkDonor({
    privateRoot: restoreRoot,
    outputPath: exactDonorPath,
    repositoryRoot: repository,
    currentReferenceAt: second.conditions.productionReferenceAt,
    currentBundleContentSha256: documents.row().payload.current.bundleContentSha256,
    previousReferenceAt: first.conditions.productionReferenceAt,
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(exactDonor.restored, true);
  assert.equal(await fs.readFile(exactDonorPath, 'utf8'),
    'synthetic-generation-0-dmi-bulk-cache\n');
  await assert.rejects(restoreExactPreviousDmiBulkDonor({
    privateRoot: restoreRoot,
    outputPath: path.join(restoreRoot, 'wrong-dmi-donor.json'),
    repositoryRoot: repository,
    currentReferenceAt: second.conditions.productionReferenceAt,
    currentBundleContentSha256: documents.row().payload.current.bundleContentSha256,
    previousReferenceAt: '2026-08-29T09:00:00.000Z',
    request: documents.request,
    storage: storage.client,
  }), /GENERATIONS_UNAVAILABLE/);

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
  const cleanupFailureDocuments = fakeDocuments();
  cleanupFailureDocuments.setRow(documents.row());
  const cleanupFailureStorage = fakeStorage();
  for (const [objectPath, bytes] of storage.objects) {
    cleanupFailureStorage.objects.set(objectPath, Buffer.from(bytes));
  }
  const cleanupAttempts = [];
  const cleanupFailurePublication = await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: third.bundlePath,
    repositoryRoot: repository,
    expected: third.expected,
    now: '2026-08-29T13:05:00.000Z',
    sourceHead: SOURCE_HEADS[2],
    request: cleanupFailureDocuments.request,
    storage: {
      ...cleanupFailureStorage.client,
      removeExact: async objectPath => {
        cleanupAttempts.push(objectPath);
        throw new Error('SYNTHETIC_PRIVATE_CLEANUP_ERROR');
      },
    },
  });
  assert.equal(cleanupFailurePublication.published, true,
    'best-effort retention failure must not misreport the verified publication as failed');
  assert.equal(cleanupFailurePublication.retentionCleanupComplete, false);
  assert.equal(cleanupFailurePublication.retentionCleanupFailureCount, 1);
  assert.equal(cleanupFailureDocuments.row().version, 4);
  assert.equal(cleanupFailureStorage.objects.size, 3,
    'failed cleanup preserves the retired object rather than silently removing it');
  assert.deepEqual(cleanupAttempts, [archiveOne.descriptor.objects[0].objectPath],
    'cleanup still targets only the retired generation, never current or rollback');
  const cleanedPublication = await publishProtectedPrivateProductionRuntime({
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
  assert.equal(cleanedPublication.retentionCleanupComplete, true);
  assert.equal(cleanedPublication.retentionCleanupFailureCount, 0);
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

  await test('private publication cannot recover an unverified archive from a concurrent exact pointer', async () => {
    const originalPointer = documents.row();
    const concurrentArchive = await buildProtectedPrivateRuntimeArchive({
      privateRoot,
      bundlePath: fourth.bundlePath,
      repositoryRoot: repository,
      expected: fourth.expected,
      now: '2026-08-29T14:05:00.000Z',
      sourceHead: SOURCE_HEADS[3],
    });
    const concurrentPointer = {
      document_key: originalPointer.document_key,
      version: originalPointer.version + 1,
      payload: {
        schemaVersion: PROTECTED_PRIVATE_RUNTIME_POLICY.schemaVersion,
        kind: PROTECTED_PRIVATE_RUNTIME_POLICY.pointerKind,
        current: concurrentArchive.descriptor,
        previous: originalPointer.payload.current,
      },
    };
    assert.ok(originalPointer.payload.previous,
      'the case must include an actual retired generation that recovery must not clean');
    assert.notEqual(originalPointer.payload.previous.objectSha256,
      concurrentPointer.payload.previous.objectSha256);

    for (const phase of ['upload', 'download', 'integrity']) {
      const failedDocuments = fakeDocuments();
      failedDocuments.setRow(originalPointer);
      const failedStorage = fakeStorage();
      for (const [objectPath, bytes] of cleanStorage.objects) {
        failedStorage.objects.set(objectPath, Buffer.from(bytes));
      }
      for (const object of concurrentArchive.objects) {
        failedStorage.objects.set(object.descriptor.objectPath, Buffer.from(object.bytes));
      }
      const originalObjects = new Map([...failedStorage.objects].map(([objectPath, bytes]) =>
        [objectPath, Buffer.from(bytes)]));
      const primaryFailure = new Error('synthetic pre-commit ' + phase + ' failure');
      let pointerReads = 0;
      let pointerWrites = 0;
      let failureInjected = false;
      const request = async (suffix, options = {}) => {
        if ((options.method ?? 'GET') === 'GET') pointerReads += 1;
        else pointerWrites += 1;
        return failedDocuments.request(suffix, options);
      };
      const client = {
        ...failedStorage.client,
        uploadImmutable: async (objectPath, bytes) => {
          if (phase === 'upload') {
            failureInjected = true;
            failedDocuments.setRow(concurrentPointer);
            throw primaryFailure;
          }
          return failedStorage.client.uploadImmutable(objectPath, bytes);
        },
        download: async objectPath => {
          failureInjected = true;
          failedDocuments.setRow(concurrentPointer);
          if (phase === 'download') throw primaryFailure;
          const bytes = await failedStorage.client.download(objectPath);
          bytes[0] ^= 1;
          return bytes;
        },
      };
      await assert.rejects(publishProtectedPrivateProductionRuntime({
        privateRoot,
        bundlePath: fourth.bundlePath,
        repositoryRoot: repository,
        expected: fourth.expected,
        now: '2026-08-29T14:05:00.000Z',
        sourceHead: SOURCE_HEADS[3],
        request,
        storage: client,
      }), error => {
        if (phase === 'integrity') {
          assert.equal(error.message, 'Protected private runtime storage readback is invalid');
        } else assert.equal(error, primaryFailure,
          'the first storage error must remain the rejection, not pointer recovery');
        return true;
      });
      assert.equal(failureInjected, true, phase);
      assert.equal(pointerWrites, 0,
        phase + ': an unverified archive must never attempt a pointer write');
      assert.equal(pointerReads, 1,
        phase + ': an unverified archive must not enter lost-response recovery');
      assert.deepEqual(failedDocuments.row(), concurrentPointer,
        phase + ': the exact independently committed pointer must remain untouched');
      assert.deepEqual(failedStorage.objects, originalObjects,
        phase + ': every existing original byte must survive the failed publication');
      assert.deepEqual(failedStorage.removed, [],
        phase + ': neither referenced originals nor retired objects may be cleaned');
    }
  });

  await test('current-grid original receivers keep exact family, inventory and current-only bytes', async () => {
    const { withFrozenI71Source } = await import('./check-native-identity-frozen-i71-source.mjs');
    const actualGrid = await import('./lib/bounded-conditions-predecessor-transition.mjs');
    await withFrozenI71Source(async sourceRepository => {
    // This is the issued220 receiver phase, not admission of today's new binding.
    const frozenHead = '37e657867ff0f8c31f8e8489e5c9a1cf235192f9';
    // Reuse the reviewed national fixture's read-only Git module namespace.
    // These normal old factories create synthetic original archives, not
    // relabelled current bundles, authenticated production B/S or numeric proof.
    const { registerHooks } = await import('node:module');
    const { execFileSync } = await import('node:child_process');
    const { pathToFileURL, fileURLToPath } = await import('node:url');
    const frozenImport = relative => import(pathToFileURL(path.join(sourceRepository, relative)).href);
    const { restoreProtectedPrivateProductionRuntime, describeCurrentProtectedPrivateProductionRuntime }
      = await frozenImport('scripts/protected-private-production-runtime.mjs');
    const { verifyPrivateProductionRuntimeBundle }
      = await frozenImport('scripts/private-production-runtime-bundle.mjs');
    // Whole reviewed producer succession, not a relabelled original family.
    const producerPath = 'scripts/update-dmi-bulk.py';
    const beforeCommit = 'ebf322b8bb4d188fc59f8da8380543b879be4ca8';
    const afterCommit = 'ca8273d58fb37a567ae22c955f0a530c78449bd0';
    const fixedStageCommit = '564864050e6d4d148d593e3a5cff5c9fb1f0bf66';
    const sourceAt = commit => execFileSync('git', ['show', `${commit}:${producerPath}`],
      { cwd: sourceRepository, encoding: 'utf8' });
    const oldProducer = sourceAt(beforeCommit), reviewedProducer = sourceAt(afterCommit);
    const previousProducer = sourceAt('78697847aa66ac62648f4b7ada1c482e5dea7e7d');
    const fixedStageProducer = sourceAt(fixedStageCommit);
    const currentProducer = (await fs.readFile(path.join(sourceRepository, producerPath), 'utf8'))
      .replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const digest = value => crypto.createHash('sha256').update(value).digest('hex');
    assert.equal(digest(oldProducer), '8ff4a5b6f50d3f2d4e177fcf8c55048051266ded1a196151d6adff9427829ce2');
    assert.equal(digest(reviewedProducer), '242844d0da14fc64ce8ebbf48bdab1e49450822cd193cd231667013e216b160e');
    assert.equal(digest(previousProducer), 'ec7fde66daeab835b6a852d47ed98b14fd289dc462a6b0d0d46318ffc2b4b6b8');
    assert.equal(digest(fixedStageProducer), '4d32d7314d8c2bc2c6592de9baa6a06732ac43a79892afc455d4b39e1eeec3ae',
      'the historical fixed-stage original-restore successor must remain byte-exact');
    assert.equal(digest(currentProducer), '47652a732030bb89eb8b333db3a4b348f8801b3a78c46931a0439872a382b864',
      'the fixture also exercises the actual causal OLD-to-NEW original-recovery producer');
    const causalDelta = execFileSync('git', ['diff', '--no-ext-diff', '--no-textconv', '--unified=3',
      fixedStageCommit, frozenHead, '--', producerPath], { cwd: sourceRepository, encoding: 'utf8' });
    assert.equal(causalDelta.includes('\\ No newline at end of file'), false);
    const causalPieces = causalDelta.split(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@[^\n]*\n/m);
    assert.ok(causalPieces.length > 1 && (causalPieces.length - 1) % 3 === 0);
    const causalRestored = currentProducer.split('\n');
    for (let index = causalPieces.length - 3; index >= 1; index -= 3) {
      const offset = Number(causalPieces[index]) - 1;
      const count = causalPieces[index + 1] === undefined ? 1 : Number(causalPieces[index + 1]);
      const lines = causalPieces[index + 2].split('\n');
      const afterLines = lines.filter(line => /^[ +]/.test(line)).map(line => line.slice(1));
      const beforeLines = lines.filter(line => /^[ -]/.test(line)).map(line => line.slice(1));
      assert.equal(afterLines.length, count);
      assert.deepEqual(causalRestored.slice(offset, offset + count), afterLines);
      causalRestored.splice(offset, count, ...beforeLines);
    }
    assert.equal(causalRestored.join('\n'), fixedStageProducer,
      'whole causal OLD-to-NEW inverse must recover every byte of the unchanged fixed-stage producer');
    let scopeProducer = fixedStageProducer;
    const undoObserved = (after, before, count = 1) => {
      assert.equal(scopeProducer.split(after).length, count + 1);
      scopeProducer = scopeProducer.split(after).join(before);
    };
    undoObserved('                _exact_original_refuse("METADATA_UNAVAILABLE" if metadata_path is not None else "ASSET_UNAVAILABLE")',
      '                _exact_original_refuse("UNAVAILABLE")');
    undoObserved('    "METADATA_UNAVAILABLE", "ASSET_UNAVAILABLE",\n', '');
    assert.equal(digest(scopeProducer), '438cffd7673d4087564258d97b33746363020af0e04b4fbe7629f0f77a5255df',
      'whole failure-stage inverse must recover every byte of the reviewed observed-original successor');
    undoObserved('def _exact_raw_state(*, observed_names=None):', 'def _exact_raw_state():');
    undoObserved('        if observed_names is not None:\n            observed_names.add(entry.name)\n', '');
    undoObserved('def read_exact_original_restore_plan(*, observed_names=None):', 'def read_exact_original_restore_plan():');
    undoObserved('    _exact_raw_state(observed_names=observed_names)\n', '    _exact_raw_state()\n', 2);
    undoObserved('def _reuse_exact_original_file(capture, *, work_deadline, observed_names=None):',
      'def _reuse_exact_original_file(capture, *, work_deadline):');
    undoObserved('    observed_names = set() if observed_names is None else observed_names\n', '', 2);
    undoObserved('    manifest, _ = _exact_raw_state(observed_names=observed_names)\n', '    manifest, _ = _exact_raw_state()\n');
    undoObserved('    local_names = {name for name in observed_names if name.startswith(prefix)}',
      '    local_names = {entry.name for entry in RAW_DIR.iterdir() if entry.name.startswith(prefix)}');
    undoObserved('def restore_exact_original_assets(originals, *, report=None, observed_names=None):',
      'def restore_exact_original_assets(originals, *, report=None):');
    undoObserved('_reuse_exact_original_file(capture, work_deadline=WORK_DEADLINE, observed_names=observed_names)',
      '_reuse_exact_original_file(capture, work_deadline=WORK_DEADLINE)');
    undoObserved('        observed_names = set()\n        plan = read_exact_original_restore_plan(observed_names=observed_names)\n'
      + '        restore_exact_original_assets(plan["originals"], report=report, observed_names=observed_names)',
    '        plan = read_exact_original_restore_plan()\n        restore_exact_original_assets(plan["originals"], report=report)');
    assert.equal(digest(scopeProducer), '2baae40108bb084f950ec5474fa1c01c0289cc7e83072f44df5fe64726acff2c',
      'whole observation inverse must recover every byte of the reviewed fixed-scope successor');
    const scopedSuccessor = "            or (binding[\"progressSource\"], binding[\"progressCacheKey\"], binding[\"targetReferenceAt\"]) not in (\n                (\"38692413809-1\", \"weather-private-progress-encrypted-v2-Linux-main-38692413809-1\", \"2026-10-14T18:00:00.000Z\"),\n                (\"38768040429-1\", \"weather-private-progress-encrypted-v2-Linux-main-38768040429-1\", \"2026-10-15T16:00:00.000Z\"))\n";
    const priorScope = "            or binding[\"progressSource\"] != \"38692413809-1\"\n            or binding[\"progressCacheKey\"] != \"weather-private-progress-encrypted-v2-Linux-main-38692413809-1\"\n            or binding[\"targetReferenceAt\"] != \"2026-10-14T18:00:00.000Z\"\n";
    assert.equal(scopeProducer.split(scopedSuccessor).length, 2);
    const localFirstProducer = scopeProducer.replace(scopedSuccessor, () => priorScope);
    assert.equal(digest(localFirstProducer), '3058225fb5ea65e647d8e9ffa90e2c9eed1a8f836cefa6a21efa283a2e13525f',
      'whole scope inverse must retain every byte of the reviewed local-first original-restore source');
    const localStart = localFirstProducer.indexOf('def _reuse_exact_original_file(');
    const localEnd = localFirstProducer.indexOf('def restore_exact_original_assets(', localStart);
    assert.ok(localStart >= 0 && localEnd > localStart);
    assert.equal(localFirstProducer.split('def _reuse_exact_original_file(').length, 2);
    const localCall = '            if _reuse_exact_original_file(capture, work_deadline=WORK_DEADLINE):\n'
      + '                report["reusedAssetCount"] += 1\n'
      + '                continue\n';
    assert.equal(localFirstProducer.split(localCall).length, 2);
    assert.equal((localFirstProducer.slice(0, localStart) + localFirstProducer.slice(localEnd))
      .replace(localCall, ''), previousProducer,
    'whole local-first inverse must recover every byte of the unchanged issued original-restore producer');
    const delta = execFileSync('git', ['diff', '--no-ext-diff', '--no-textconv', '--unified=3',
      beforeCommit, afterCommit, '--', producerPath], { cwd: sourceRepository, encoding: 'utf8' });
    assert.equal(delta.includes('\\ No newline at end of file'), false);
    const pieces = delta.split(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@[^\n]*\n/m);
    assert.ok(pieces.length > 1 && (pieces.length - 1) % 3 === 0);
    const restored = reviewedProducer.split('\n');
    for (let index = pieces.length - 3; index >= 1; index -= 3) {
      const offset = Number(pieces[index]) - 1;
      const count = pieces[index + 1] === undefined ? 1 : Number(pieces[index + 1]);
      const lines = pieces[index + 2].split('\n');
      const afterLines = lines.filter(line => /^[ +]/.test(line)).map(line => line.slice(1));
      const beforeLines = lines.filter(line => /^[ -]/.test(line)).map(line => line.slice(1));
      assert.equal(afterLines.length, count);
      assert.deepEqual(restored.slice(offset, offset + count), afterLines);
      restored.splice(offset, count, ...beforeLines);
    }
    assert.equal(restored.join('\n'), oldProducer, 'whole inverse must recover the unchanged EBF producer');
    const successorDelta = execFileSync('git', ['diff', '--no-ext-diff', '--no-textconv', '--unified=3',
      afterCommit, frozenHead, '--', producerPath], { cwd: sourceRepository, encoding: 'utf8' });
    assert.equal(successorDelta.includes('\\ No newline at end of file'), false);
    const successorPieces = successorDelta.split(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@[^\n]*\n/m);
    assert.ok(successorPieces.length > 1 && (successorPieces.length - 1) % 3 === 0);
    const successorRestored = currentProducer.split('\n');
    for (let index = successorPieces.length - 3; index >= 1; index -= 3) {
      const offset = Number(successorPieces[index]) - 1;
      const count = successorPieces[index + 1] === undefined ? 1 : Number(successorPieces[index + 1]);
      const lines = successorPieces[index + 2].split('\n');
      const afterLines = lines.filter(line => /^[ +]/.test(line)).map(line => line.slice(1));
      const beforeLines = lines.filter(line => /^[ -]/.test(line)).map(line => line.slice(1));
      assert.equal(afterLines.length, count);
      assert.deepEqual(successorRestored.slice(offset, offset + count), afterLines);
      successorRestored.splice(offset, count, ...beforeLines);
    }
    assert.equal(successorRestored.join('\n'), reviewedProducer,
      'whole cache-only inverse must retain every byte of the issued history producer');
    const admissionSource = await fs.readFile(path.join(sourceRepository,
      'scripts/lib/bounded-conditions-predecessor-transition.mjs'), 'utf8');
    const admissionStart = admissionSource.indexOf('const gridSha256 =');
    const admissionEnd = admissionSource.indexOf('function currentGridSamplingManifestMatches(', admissionStart);
    assert.ok(admissionStart >= 0 && admissionEnd > admissionStart);
    const actualFs = (await import('node:fs')).default;
    const createAdmitter = filesystem => Function('crypto', 'fs', 'path', 'PRIVATE_RUNTIME_REPOSITORY_ROOT',
      admissionSource.slice(admissionStart, admissionEnd)
      + '; return currentGridSamplingReviewedProducer;')(crypto, filesystem, path, sourceRepository);
    const admits = createAdmitter(actualFs);
    assert.equal(admits(oldProducer), true);
    assert.equal(admits(reviewedProducer), true);
    assert.equal(admits(previousProducer), true);
    assert.equal(admits(fixedStageProducer), true);
    assert.equal(admits(currentProducer), true);
    const reviewedHelpers = [
      'scripts/lib/dmi_legacy_current_originals.py',
      'scripts/lib/dmi_legacy_current_recovery.py',
      'scripts/lib/dmi-legacy-current-originals.mjs',
      'scripts/lib/saved-dmi-original-capture.mjs',
      'scripts/lib/saved-dmi-original-dependencies.mjs',
      'scripts/plan-dmi-legacy-current-originals.mjs',
      'scripts/plan-ravscore-current-history.mjs',
      'scripts/update-weather.mjs',
      'scripts/prepare-saved-dmi-original-restore.mjs',
    ];
    const actualHelperPaths = Function('crypto', admissionSource.slice(admissionStart, admissionEnd)
      + '; return Object.keys(CURRENT_GRID_SAMPLING_NATIVE_ORIGINAL_HELPERS);')(crypto);
    assert.deepEqual(actualHelperPaths, reviewedHelpers,
      'the causal producer requires the whole exact reviewed decoder/planner/caller chain');
    const withoutHelpers = createAdmitter({ readFileSync() {
      assert.fail('historical producer admission must not read newer reconstruction helpers');
    } });
    for (const historical of [oldProducer, reviewedProducer, previousProducer, fixedStageProducer]) {
      assert.equal(withoutHelpers(historical), true);
    }
    for (const relative of reviewedHelpers) {
      const helperPath = path.join(sourceRepository, relative);
      let changedReads = 0;
      const changedHelper = createAdmitter({ readFileSync(file, encoding) {
        const original = actualFs.readFileSync(file, encoding);
        if (file !== helperPath) return original;
        changedReads++;
        return original + '\n# changed reviewed dependency\n';
      } });
      assert.equal(changedHelper(currentProducer), false, `${relative}: changed helper must refuse admission`);
      assert.equal(changedReads, 1, `${relative}: the actual gate must read the changed helper`);
      let missingReads = 0;
      const missingHelper = createAdmitter({ readFileSync(file, encoding) {
        if (file !== helperPath) return actualFs.readFileSync(file, encoding);
        missingReads++;
        throw Object.assign(new Error('synthetic missing reviewed dependency'), { code: 'ENOENT' });
      } });
      assert.equal(missingHelper(currentProducer), false, `${relative}: missing helper must refuse admission`);
      assert.equal(missingReads, 1, `${relative}: the actual gate must read the missing helper`);
    }
    assert.equal(createAdmitter({ readFileSync() {
      throw Object.assign(new Error('synthetic missing directory'), { code: 'ENOTDIR' });
    } })(currentProducer), false);
    const deniedHelperRead = Object.assign(new Error('synthetic denied helper read'), { code: 'EACCES' });
    assert.throws(() => createAdmitter({ readFileSync() { throw deniedHelperRead; } })(currentProducer),
      error => error === deniedHelperRead, 'unexpected helper I/O failures must preserve their exact cause');
    for (const changed of [oldProducer + '# changed\n', reviewedProducer + '# changed\n',
      previousProducer + '# changed\n', fixedStageProducer + '# changed\n', currentProducer + '# changed\n', '']) {
      assert.equal(admits(changed), false, 'unknown or changed producer bytes must not gain SOURCE admission');
    }
    const base = '9c74feaa4bdb5b93964a8a1e267b18c880223c00';
    const query = 'current_grid_receiver_original';
    const isOriginal = value => typeof value === 'string' && value.startsWith('file:')
      && new URL(value).searchParams.get(query) === base;
    const originalImport = relative => {
      const url = pathToFileURL(path.resolve(sourceRepository, relative));
      url.searchParams.set(query, base);
      return import(url.href);
    };
    const originalBodies = new Map();
    const hook = registerHooks({
      resolve(specifier, context, next) {
        if (!isOriginal(specifier)
          && !(isOriginal(context.parentURL) && /^\.{1,2}\//.test(specifier))) return next(specifier, context);
        const url = new URL(specifier, context.parentURL);
        url.searchParams.set(query, base);
        return { url: url.href, shortCircuit: true };
      },
      load(url, context, next) {
        if (!isOriginal(url)) return next(url, context);
        const relative = path.relative(sourceRepository, fileURLToPath(url)).replace(/\\/g, '/');
        assert.match(relative, /^(?:js\/core\/|scripts\/)[A-Za-z0-9_./-]+\.(?:mjs|js)$/);
        assert.equal(relative.split('/').includes('..'), false);
        if (!originalBodies.has(relative)) originalBodies.set(relative,
          execFileSync('git', ['show', `${base}:${relative}`], { cwd: sourceRepository, encoding: 'utf8' }));
        return { format: 'module', source: originalBodies.get(relative), shortCircuit: true };
      },
    });
    try {
      const [oldBundle, oldArchive, oldI, oldC, grid, inventory] = await Promise.all([
        originalImport('scripts/private-production-runtime-bundle.mjs'),
        originalImport('scripts/protected-private-production-runtime.mjs'),
        originalImport('js/core/ravscore-model-contract.js'),
        originalImport('scripts/rollback-assets/ravscore-model-contract.js'),
        frozenImport('scripts/lib/bounded-conditions-predecessor-transition.mjs'),
        frozenImport('scripts/lib/private-weather-component-inventory.mjs'),
      ]);
      const policy = grid.CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY;
      assert.deepEqual(oldI.ravScoreModelBinding(), policy.sourceModelBinding);
      assert.deepEqual(oldC.ravScoreModelBinding(), policy.sourceCandidateModelBinding);
      const now = '2026-10-11T17:10:00.000Z';
      const reference = '2026-10-11T16:00:00.000Z';
      const generatedAt = '2026-10-11T16:05:00.000Z';
      const extras = [[], [inventory.PRIVATE_WEATHER_COMPONENT_PACK_FILE],
        [inventory.PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE],
        [inventory.PRIVATE_WEATHER_COMPONENT_PACK_FILE, inventory.PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE]];
      async function originalFixture(label, files) {
        const specs = [];
        const bytesByPath = new Map();
        for (const item of files) {
          const bytes = Buffer.from(`synthetic-original-${label}-${item.id}\n`);
          const sourcePath = path.join(repository, `grid-${label}-${item.id}.fixture`);
          await fs.writeFile(sourcePath, bytes, { flag: 'wx' });
          specs.push({ ...item, sourcePath, privacyClass: 'PRIVATE_PRODUCTION_RUNTIME' });
          bytesByPath.set(item.relativePath, bytes);
        }
        const bundlePath = path.join(privateRoot, `grid-original-${label}`);
        await oldBundle.createPrivateProductionRuntimeBundle({ privateRoot, bundlePath,
          repositoryRoot: repository, files: specs, metadata: {
            datasetId: `rr-current-grid-${label}`, productionReferenceAt: reference, generatedAt,
            generationId: `grid-original-${label}`, zoneCount: 210, partCount: 673,
            modelBinding: oldI.ravScoreModelBinding(), contractHashes: clone(policy.sourceContractHashes),
            privacyClass: 'PRIVATE_PRODUCTION_RUNTIME',
          } });
        const archive = await oldArchive.buildProtectedPrivateRuntimeArchive({ privateRoot,
          bundlePath, repositoryRoot: repository, sourceHead: base, now });
        return { bundlePath, archive, bytesByPath,
          manifestBytes: await fs.readFile(path.join(bundlePath, 'manifest.json')) };
      }
      for (let i = 0; i < extras.length; i += 1) {
        const fixture = await originalFixture(`inventory-${i}`,
          [...inventory.PRIVATE_RUNTIME_BASE_FILES, ...extras[i]]);
        assert.equal(fixture.archive.objects.length, 1, 'small synthetic archive has exactly one storage object');
        // Same original envelope/manifest/payload, different storage encoding.
        // Thus previous can really satisfy this SAME expected identity, rather
        // than being ineligible on content/time before the no-fallback guard.
        const previousBytes = gzipSync(gunzipSync(fixture.archive.archive), { level: 0, mtime: 0 });
        const previousSha = crypto.createHash('sha256').update(previousBytes).digest('hex');
        const previousObject = { index: 0, objectSha256: previousSha, objectBytes: previousBytes.length,
          objectPath: `bundles/sha256/${previousSha}/part-000-${previousSha}.json.gz.part` };
        const previousDescriptor = { ...clone(fixture.archive.descriptor), objectSha256: previousSha,
          objectBytes: previousBytes.length, objectCount: 1, objects: [previousObject] };
        assert.notEqual(previousSha, fixture.archive.descriptor.objectSha256);
        const docs = fakeDocuments();
        docs.setRow({ document_key: PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey, version: 1,
          payload: { schemaVersion: PROTECTED_PRIVATE_RUNTIME_POLICY.schemaVersion,
            kind: PROTECTED_PRIVATE_RUNTIME_POLICY.pointerKind,
            current: fixture.archive.descriptor, previous: previousDescriptor } });
        const store = fakeStorage();
        for (const item of fixture.archive.objects) {
          store.objects.set(item.descriptor.objectPath, Buffer.from(item.bytes));
        }
        store.objects.set(previousObject.objectPath, previousBytes);
        const source = await describeCurrentProtectedPrivateProductionRuntime({ request: docs.request });
        const expected = await grid.buildCurrentGridSamplingOriginalRestoreExpectation({
          sourceDescription: source, targetReferenceAt: reference, now });
        assert.ok(expected, 'requires genuine normal-generated current-only successor; no guard mock or skip');
        assert.strictEqual(grid.assertCurrentGridSamplingOriginalExpectation(expected), expected);
        assert.equal(await actualGrid.buildCurrentGridSamplingOriginalRestoreExpectation({
          sourceDescription: source, targetReferenceAt: reference, now }), null,
        'the current native-identity binding must not borrow the issued220 receiver');
        assert.throws(() => actualGrid.assertCurrentGridSamplingOriginalExpectation(expected),
          /not the exact reviewed native-grid SOURCE successor/);
        const pointerBefore = docs.row();
        const objectsBefore = new Map([...store.objects].map(([key, value]) => [key, Buffer.from(value)]));
        let pointerReads = 0;
        let bucketReads = 0;
        const downloads = [];
        const request = async (suffix, options = {}) => {
          assert.equal(options.method ?? 'GET', 'GET', 'restore must not write its pointer');
          pointerReads += 1;
          return docs.request(suffix, options);
        };
        const storage = { ...store.client,
          ensurePrivateBucket: async options => {
            assert.deepEqual(options, { allowCreate: false }); bucketReads += 1;
            return store.client.ensurePrivateBucket(options);
          },
          download: async key => { downloads.push(key); return store.client.download(key); },
        };
        let attempt = 0;
        const restore = expectation => {
          const bundlePath = path.join(restoreRoot, `grid-${i}-restore-${attempt++}`);
          return { bundlePath, run: () => restoreProtectedPrivateProductionRuntime({
            privateRoot: restoreRoot, bundlePath, repositoryRoot: repository,
            expected: expectation, now, request, storage }) };
        };
        async function refused(expectation, pattern, reads, buckets, objectCount) {
          const before = [pointerReads, bucketReads, downloads.length];
          const call = restore(expectation);
          await assert.rejects(call.run, pattern);
          assert.deepEqual([pointerReads, bucketReads, downloads.length],
            [before[0] + reads, before[1] + buckets, before[2] + objectCount]);
          await assert.rejects(fs.lstat(call.bundlePath), { code: 'ENOENT' });
        }
        if (i === 0) {
          docs.setRow({ ...clone(pointerBefore), payload: { ...clone(pointerBefore.payload),
            current: previousDescriptor, previous: null } });
          const previousControl = restore(expected);
          assert.equal((await previousControl.run()).restored, true,
            'the exact alternate storage object really passes the same receiver/expectation');
          assert.deepEqual(await fs.readFile(path.join(previousControl.bundlePath, 'manifest.json')),
            fixture.manifestBytes);
          docs.setRow(pointerBefore);
          for (const invalid of [
            { ...expected, currentGridSamplingTransition: true },
            { ...expected, ownerCurrentDomainTransition: 'EXACT_ORIGINAL_RESTORE_V1' },
            { ...expected, modelBinding: { ...expected.modelBinding,
              modelBundleSha256: grid.CURRENT_GRID_SAMPLING_DELIVERED_575_POLICY.sourceModelBinding.modelBundleSha256 } },
            { ...expected, contractHashes: { ...expected.contractHashes,
              continuationStateContractSha256: grid.CURRENT_GRID_SAMPLING_DELIVERED_575_POLICY.sourceContractHashes.continuationStateContractSha256 } },
          ]) await refused(invalid, /exact original expectation/, 0, 0, 0);
          for (const field of ['sourceHead', 'datasetId', 'productionReferenceAt', 'generatedAt',
            'bundleContentSha256', 'modelBinding', 'contractHashes']) {
            const changed = clone(pointerBefore);
            changed.payload.current[field] = field === 'sourceHead' ? 'b'.repeat(40)
              : field === 'datasetId' ? 'rr-other-grid-original'
              : field === 'productionReferenceAt' ? '2026-10-11T17:00:00.000Z'
              : field === 'generatedAt' ? '2026-10-11T16:06:00.000Z'
              : field === 'bundleContentSha256' ? 'f'.repeat(64)
              : field === 'modelBinding' ? clone(grid.CURRENT_GRID_SAMPLING_DELIVERED_575_POLICY.sourceModelBinding)
              : clone(grid.CURRENT_GRID_SAMPLING_DELIVERED_575_POLICY.sourceContractHashes);
            docs.setRow(changed);
            await refused(expected, { code: 'PROTECTED_PRIVATE_RUNTIME_INELIGIBLE' }, 1, 0, 0);
          }
          docs.setRow(pointerBefore);
          const currentKey = fixture.archive.objects[0].descriptor.objectPath;
          const corrupt = Buffer.from(store.objects.get(currentKey)); corrupt[0] ^= 1;
          store.objects.set(currentKey, corrupt);
          const beforeDownloads = downloads.length;
          await refused(expected, { code: 'PROTECTED_PRIVATE_RUNTIME_NO_COMPATIBLE_GENERATION' }, 1, 1, 1);
          assert.deepEqual(downloads.slice(beforeDownloads), [currentKey], 'never download previous on typed-current failure');
          store.objects.set(currentKey, Buffer.from(objectsBefore.get(currentKey)));
        }
        const positive = restore(expected);
        const result = await positive.run();
        assert.equal(result.restored, true);
        assert.equal(result.rollbackSelected, false);
        assert.equal(result.productionReferenceAt, reference, 'same-reference original is not new-T recomputation');
        const verified = await verifyPrivateProductionRuntimeBundle({ privateRoot: restoreRoot,
          bundlePath: positive.bundlePath, repositoryRoot: repository, expected, now });
        assert.equal(verified.fileCount, 9 + extras[i].length);
        assert.deepEqual(verified.files.map(({ id, relativePath }) => ({ id, relativePath })),
          [...inventory.PRIVATE_RUNTIME_BASE_FILES, ...extras[i]].sort((a, b) => a.id < b.id ? -1 : 1));
        assert.deepEqual(await fs.readFile(path.join(positive.bundlePath, 'manifest.json')), fixture.manifestBytes);
        for (const [relative, bytes] of fixture.bytesByPath) {
          assert.deepEqual(await fs.readFile(path.join(positive.bundlePath, 'payload', relative)), bytes);
          assert.deepEqual(await fs.readFile(path.join(fixture.bundlePath, 'payload', relative)), bytes);
        }
        if (i === 0) {
          const copied = path.join(positive.bundlePath, 'payload', inventory.PRIVATE_RUNTIME_BASE_FILES[0].relativePath);
          const unchanged = await fs.readFile(copied);
          const corrupt = Buffer.from(unchanged); corrupt[0] ^= 1;
          await fs.writeFile(copied, corrupt);
          await assert.rejects(() => verifyPrivateProductionRuntimeBundle({ privateRoot: restoreRoot,
            bundlePath: positive.bundlePath, repositoryRoot: repository, expected, now }), /payload integrity/);
          await fs.writeFile(copied, unchanged);
        }
        assert.deepEqual(docs.row(), pointerBefore);
        assert.deepEqual(store.objects, objectsBefore);
        assert.deepEqual(store.removed, []);
        assert.deepEqual(await fs.readFile(path.join(fixture.bundlePath, 'manifest.json')), fixture.manifestBytes);
      }
      // A self-consistent old archive is still not a complete production bundle.
      const incomplete = await originalFixture('missing-file', inventory.PRIVATE_RUNTIME_BASE_FILES.slice(1));
      const descriptor = incomplete.archive.descriptor;
      const docs = fakeDocuments();
      docs.setRow({ document_key: PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey, version: 1,
        payload: { schemaVersion: PROTECTED_PRIVATE_RUNTIME_POLICY.schemaVersion,
          kind: PROTECTED_PRIVATE_RUNTIME_POLICY.pointerKind, current: descriptor, previous: null } });
      const incompleteExpected = await grid.buildCurrentGridSamplingOriginalRestoreExpectation({
        sourceDescription: await describeCurrentProtectedPrivateProductionRuntime({ request: docs.request }),
        targetReferenceAt: reference, now });
      assert.ok(incompleteExpected);
      await assert.rejects(() => verifyPrivateProductionRuntimeBundle({ privateRoot,
        bundlePath: incomplete.bundlePath, repositoryRoot: repository, expected: incompleteExpected, now }),
      /production inventory is incompatible/);
    } finally { hook.deregister(); }
    });
  });

  const implementation = (await fs.readFile(
    'scripts/protected-private-production-runtime.mjs',
    'utf8',
  )).replace(/\r\n/g, '\n');
  const limitStart = implementation.indexOf('function effectiveEnvelopeByteLimit(policy) {');
  const limitEnd = implementation.indexOf('\nfunction archiveEnvelopeByteLength(', limitStart);
  assert.ok(limitStart >= 0 && limitEnd > limitStart);
  const effectiveLimit = (declared, runtime) => runInNewContext(
    `${implementation.slice(limitStart, limitEnd)}\neffectiveEnvelopeByteLimit(policy)`, {
      policy: { maximumEnvelopeBytes: declared },
      PROTECTED_PRIVATE_RUNTIME_POLICY,
      bufferConstants: { MAX_STRING_LENGTH: runtime },
    });
  assert.equal(effectiveLimit(100, 64), 64, 'runtime string cap must dominate a larger declared cap');
  assert.equal(effectiveLimit(32, 64), 32, 'a tightened caller cap must remain effective');
  assert.equal(effectiveLimit(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
    PROTECTED_PRIVATE_RUNTIME_POLICY.maximumEnvelopeBytes, 'caller policy must not expand the default cap');
  assert.equal(implementation.includes("import { constants as bufferConstants } from 'node:buffer'"), true,
    'the production cap must come from this Node runtime, not a guessed V8 constant');
  // Execute the actual CLI projection without invoking providers or storage.
  // The output must expose the existing fixed counters, not the failed path,
  // raw exception or private descriptor from the publication result.
  const projectionStart = implementation.indexOf('  console.log(JSON.stringify({\n    status: options.mode');
  const projectionEnd = implementation.indexOf('\n  }));', projectionStart);
  assert.ok(projectionStart >= 0 && projectionEnd > projectionStart,
    'the protected runtime CLI must keep an explicit bounded result projection');
  const projectCli = result => {
    const lines = [];
    runInNewContext(implementation.slice(projectionStart, projectionEnd + '\n  }));'.length), {
      options: { mode: 'publish' },
      result: { ...result, privateDiagnostic: 'SYNTHETIC_PRIVATE_CLEANUP_ERROR',
        objectPath: 'private/synthetic-do-not-log', rawPayload: { secret: 'DO_NOT_LOG' } },
      console: { log: line => lines.push(line) },
    });
    assert.equal(lines.length, 1);
    assert.doesNotMatch(lines[0], /SYNTHETIC_PRIVATE_CLEANUP_ERROR|synthetic-do-not-log|DO_NOT_LOG|privateDiagnostic|objectPath|rawPayload/);
    return JSON.parse(lines[0]);
  };
  const failedCleanupLog = projectCli(cleanupFailurePublication);
  assert.equal(failedCleanupLog.published, true);
  assert.equal(failedCleanupLog.retentionCleanupComplete, false);
  assert.equal(failedCleanupLog.retentionCleanupFailureCount, 1);
  assert.equal(failedCleanupLog.privatePayloadLogged, false);
  const successfulCleanupLog = projectCli(cleanedPublication);
  assert.equal(successfulCleanupLog.retentionCleanupComplete, true);
  assert.equal(successfulCleanupLog.retentionCleanupFailureCount, 0);
  const noCleanupLog = projectCli({ reason: 'protected-private-runtime-already-current' });
  assert.equal(Object.hasOwn(noCleanupLog, 'retentionCleanupComplete'), false);
  assert.equal(Object.hasOwn(noCleanupLog, 'retentionCleanupFailureCount'), false,
    'absence of a cleanup attempt must not be reported as a measured zero');
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

  // Controlled normal fetch: no provider, bucket mutation or private payload.
  await test('immutable upload rejection exposes only fixed safe response fields', async () => {
    const bytes = Buffer.from('synthetic-upload-body');
    const objectPath = 'bundles/sha256/SYNTHETIC_PRIVATE_OBJECT';
    const secret = 'SYNTHETIC_PRIVATE_RESPONSE_DO_NOT_LOG';
    const execute = async responses => {
      let calls = 0;
      let delays = 0;
      const client = createProtectedPrivateRuntimeClients({
        supabaseUrl: 'https://synthetic-project.supabase.co',
        serviceRoleKey: secret,
        storageBackend: 'supabase',
        delayImpl: async () => { delays += 1; },
        fetchImpl: async (url, options) => {
          assert.equal(url, 'https://synthetic-project.supabase.co/storage/v1/object/'
            + PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId + '/' + objectPath);
          assert.equal(options.method, 'POST');
          assert.equal(options.headers['x-upsert'], 'false');
          assert.equal(options.headers['Content-Type'], PROTECTED_PRIVATE_RUNTIME_POLICY.mimeType);
          assert.equal(options.body, bytes, 'the same immutable upload bytes must be used');
          const value = responses[calls++];
          assert.ok(value, 'no extra upload, readback, pointer write or cleanup request');
          if (value instanceof Error) throw value;
          return value;
        },
      });
      let result, error;
      try { result = await client.storage.uploadImmutable(objectPath, bytes); }
      catch (caught) { error = caught; }
      assert.equal(calls, responses.length);
      return { result, error, calls, delays };
    };
    const check = (error, status, providerCode) => {
      assert.equal(error?.code, 'PROTECTED_PRIVATE_RUNTIME_UPLOAD_RESPONSE');
      assert.deepEqual(error.diagnostic, {
        stage: 'immutable-upload-response', httpStatus: status,
        providerCode, requestBytes: bytes.byteLength,
      });
      assert.equal(Object.isFrozen(error.diagnostic), true);
      assert.equal(error.message, 'Protected private runtime immutable upload failed closed '
        + JSON.stringify(error.diagnostic));
      assert.doesNotMatch(error.message + JSON.stringify(error),
        /SYNTHETIC_PRIVATE|apikey|Authorization|objectPath|responseBody|statusCode/);
      assert.equal(Object.hasOwn(error, 'cause'), false);
    };
    for (const [status, body, code] of [
      [403, { code: 'AccessDenied', message: secret, details: { path: objectPath } }, 'AccessDenied'],
      [413, { code: 'EntityTooLarge', message: secret, statusCode: '400' }, 'EntityTooLarge'],
      [400, { error: 'InvalidMimeType', message: secret }, 'InvalidMimeType'],
      [401, { code: secret, error: secret, message: secret }, 'UNKNOWN'],
      [400, { code: { value: secret }, error: 401 }, 'UNKNOWN'],
      [400, { message: secret }, 'MISSING'],
      [403, {}, 'MISSING'],
    ]) {
      const value = await execute([Response.json(body, { status })]);
      check(value.error, status, code);
      assert.equal(value.result, undefined);
      assert.equal(value.delays, 0);
    }
    const malformed = await execute([new Response(secret, { status: 413 })]);
    check(malformed.error, 413, 'MISSING');
    // Existing retry count remains two; report only the response that refused
    // this final attempt, never infer a successful or durable earlier upload.
    const retried = await execute([
      Response.json({ code: 'InternalError', message: secret }, { status: 503 }),
      Response.json({ code: 'AccessDenied', message: secret }, { status: 403 }),
    ]);
    check(retried.error, 403, 'AccessDenied');
    assert.equal(retried.delays, 1);
    const transportCause = new Error(secret);
    const transport = await execute([transportCause, transportCause]);
    assert.equal(transport.error.message, 'Protected private runtime immutable upload could not be reached');
    assert.equal(transport.error.cause, transportCause, 'old first-cause identity remains intact');
    assert.equal(transport.error.diagnostic, undefined, 'no invented HTTP status without a response');
    assert.equal(transport.delays, 1);
    for (const status of [400, 409]) {
      const duplicate = await execute([Response.json({ message: 'resource already exists' }, { status })]);
      assert.equal(duplicate.error, undefined);
      assert.deepEqual(duplicate.result, { created: false, alreadyExists: true });
      assert.equal(duplicate.delays, 0);
    }
    // Supabase's formatter emits the finite duplicate code in code/error.
    // A duplicate disposition is not a verified readback or pointer commit.
    for (const status of [400, 409]) {
      for (const field of ['code', 'error']) {
        for (const code of ['KeyAlreadyExists', 'ResourceAlreadyExists']) {
          const duplicate = await execute([Response.json({ [field]: code }, { status })]);
          assert.equal(duplicate.error, undefined);
          assert.deepEqual(duplicate.result, { created: false, alreadyExists: true });
          assert.equal(duplicate.calls, 1, 'a code-only duplicate never adds a request');
          assert.equal(duplicate.delays, 0);
        }
      }
    }
    for (const [status, body, providerCode] of [
      [400, { code: 'keyalreadyexists' }, 'UNKNOWN'],
      [409, { error: ' ResourceAlreadyExists' }, 'UNKNOWN'],
      [400, { code: 'KeyAlreadyExistsSuffix' }, 'UNKNOWN'],
      [409, { code: ['KeyAlreadyExists'] }, 'UNKNOWN'],
      [400, { error: { code: 'ResourceAlreadyExists' } }, 'UNKNOWN'],
      [409, { errorCode: 'KeyAlreadyExists' }, 'MISSING'],
      [403, { code: 'KeyAlreadyExists' }, 'KeyAlreadyExists'],
      [422, { error: 'ResourceAlreadyExists' }, 'ResourceAlreadyExists'],
      [400, { code: null }, 'MISSING'],
      [409, 'KeyAlreadyExists', 'MISSING'],
    ]) {
      const refused = await execute([Response.json(body, { status })]);
      check(refused.error, status, providerCode);
      assert.equal(refused.result, undefined);
      assert.equal(refused.calls, 1);
      assert.equal(refused.delays, 0);
    }
    const created = await execute([new Response('', { status: 200 })]);
    assert.equal(created.error, undefined);
    assert.deepEqual(created.result, { created: true });
    assert.equal(created.delays, 0);
  });

  await test('immutable upload retries a gateway 520 only within the existing two attempts', async () => {
    const bytes = Buffer.from('synthetic-gateway-upload');
    const objectPath = 'operational-evidence/sha256/' + 'a'.repeat(64) + '.json.gz';
    const privateMarker = 'SYNTHETIC_PRIVATE_GATEWAY_RESPONSE';
    for (const [finalStatus, finalBody, expected] of [
      [200, '', { created: true }],
      [400, JSON.stringify({ message: 'resource already exists' }), { created: false, alreadyExists: true }],
      [409, JSON.stringify({ message: 'resource already exists' }), { created: false, alreadyExists: true }],
      [403, JSON.stringify({ code: 'AccessDenied', message: privateMarker }), null],
      [520, privateMarker, null],
    ]) {
      const events = [];
      let calls = 0;
      let firstOptions;
      const client = createProtectedPrivateRuntimeClients({
        supabaseUrl: 'https://synthetic-project.supabase.co',
        serviceRoleKey: 'synthetic-not-a-credential',
        storageBackend: 'supabase',
        delayImpl: async milliseconds => {
          assert.equal(milliseconds, 1000, 'the existing default delay is unchanged');
          assert.deepEqual(events, ['post-1', 'cancel-1']);
          events.push('delay');
        },
        fetchImpl: async (url, options) => {
          calls += 1;
          assert.ok(calls <= 2, 'never a third request, pointer mutation or implicit readback');
          assert.equal(url, 'https://synthetic-project.supabase.co/storage/v1/object/'
            + PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId + '/' + objectPath);
          assert.equal(options.method, 'POST');
          assert.equal(options.headers['x-upsert'], 'false');
          assert.equal(options.headers['Content-Type'], PROTECTED_PRIVATE_RUNTIME_POLICY.mimeType);
          assert.equal(options.body, bytes, 'same actual immutable Buffer, not regenerated bytes');
          if (calls === 1) {
            firstOptions = options;
            events.push('post-1');
            return new Response(new ReadableStream({
              start(controller) { controller.enqueue(new TextEncoder().encode(privateMarker)); },
              cancel() { events.push('cancel-1'); },
            }), { status: 520 });
          }
          assert.equal(options, firstOptions, 'the same complete request options are retried');
          assert.deepEqual(events, ['post-1', 'cancel-1', 'delay']);
          events.push('post-2');
          return new Response(finalBody, { status: finalStatus });
        },
      });
      let result;
      let error;
      try { result = await client.storage.uploadImmutable(objectPath, bytes); }
      catch (caught) { error = caught; }
      assert.equal(calls, 2);
      assert.deepEqual(events, ['post-1', 'cancel-1', 'delay', 'post-2']);
      if (expected) {
        assert.equal(error, undefined);
        assert.deepEqual(result, expected, 'upload disposition only; publication still requires its existing readback');
      } else {
        assert.equal(result, undefined);
        assert.equal(error?.code, 'PROTECTED_PRIVATE_RUNTIME_UPLOAD_RESPONSE');
        assert.deepEqual(error.diagnostic, {
          stage: 'immutable-upload-response', httpStatus: finalStatus,
          providerCode: finalStatus === 403 ? 'AccessDenied' : 'MISSING',
          requestBytes: bytes.byteLength,
        });
        assert.equal(Object.isFrozen(error.diagnostic), true);
        assert.doesNotMatch(error.message + JSON.stringify(error),
          /SYNTHETIC_PRIVATE|synthetic-not-a-credential|operational-evidence|apikey|Authorization/);
      }
    }
  });

  await test('the new gateway retry never expands bucket, cleanup or anonymous calls', async () => {
    for (const operation of ['bucket', 'cleanup', 'anonymous']) {
      let calls = 0;
      let delays = 0;
      const client = createProtectedPrivateRuntimeClients({
        supabaseUrl: 'https://synthetic-project.supabase.co',
        serviceRoleKey: 'synthetic-not-a-credential',
        storageBackend: 'supabase',
        delayImpl: async () => { delays += 1; },
        fetchImpl: async () => {
          calls += 1;
          return new Response('SYNTHETIC_PRIVATE_GATEWAY_RESPONSE', { status: 520 });
        },
      });
      if (operation === 'bucket') {
        await assert.rejects(client.storage.ensurePrivateBucket({ allowCreate: false }),
          /bucket policy is incompatible/);
      } else if (operation === 'cleanup') {
        await assert.rejects(client.storage.removeExact('synthetic-existing-object.json.gz'),
          /retention cleanup failed closed/);
      } else {
        assert.equal(await client.storage.anonymousStatus('synthetic-existing-object.json.gz'), 520);
      }
      assert.equal(calls, 1, 'only immutable uploads gain the 520 retry');
      assert.equal(delays, 0, 'no new retry delay outside the upload boundary');
    }
  });

  console.log('Protected private runtime storage, retention, rollback and anonymous-denial contract passes.');
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}

await test('SOURCE normal progress: genuine installed packed B survives absent S without false restore', async () => {
  const { registerHooks } = await import('node:module');
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const moduleUrl = new URL('./protected-private-production-runtime.mjs', import.meta.url);
  const repositoryUrl = new URL('../', import.meta.url).href;
  const query = 'source-owner-test=' + crypto.randomUUID();
  // Fresh, actual ESM module graph. Only test observation exports are appended;
  // imports, module initialization, issuer and all validators execute unchanged.
  const observation = registerHooks({
    resolve(specifier, context, next) {
      const result = next(specifier, context);
      if (result.url.startsWith(repositoryUrl) && /\.(?:mjs|js)$/.test(new URL(result.url).pathname)) {
        const url = new URL(result.url); url.search = query;
        return { ...result, url: url.href };
      }
      return result;
    },
    load(url, context, next) {
      const result = next(url, context);
      if (url.startsWith(moduleUrl.href + '?')) return { ...result, source: String(result.source)
        + '\nexport { captureSourceDeadlineProcess, issuePrivateSourceJobDeadline, restoreSourceOriginals, sourceOriginalResultOwners, retainedSourceOriginalOwners, runSourceNormalDeployedBulkCopy, sourceJobDeadlineBrands, hashSourceOriginalBundleRow, sourceOriginalBundleHashAdmissions };\n' };
      if (new URL(url).protocol === 'file:' && new URL(url).pathname.endsWith('/weather-component-progress-cache.mjs')) {
        return { ...result, source: String(result.source) + '\nexport { retainedSourceProgressOwners, sourceProgressPipeline, ownSourceProgressHandle, inspectOwnedSourceProgress };\n'
        + (String(result.source).includes('async function closeSourceProgressOwnerFileStreams(')
          ? '\nexport { closeSourceProgressOwnerFileStreams };\n' : '') };
      }
      return result;
    },
  });
  const hooks = await import(moduleUrl.href + '?' + query);
  const workflow = await import(new URL('./private-production-runtime-workflow.mjs?' + query, import.meta.url));
  const progress = await import(new URL('./weather-component-progress-cache.mjs?' + query, import.meta.url));
  const bundleModule = await import(new URL('./private-production-runtime-bundle.mjs?' + query, import.meta.url));
  const { PRIVATE_WEATHER_COMPONENT_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE } =
    await import(new URL('./lib/private-weather-component-inventory.mjs?' + query, import.meta.url));
  const { buildOpenMeteoPartRequest, readOpenMeteoPartResponse, mergeOpenMeteoPartBank, OPEN_METEO_NATIVE_NEAREST_POLICIES } =
    await import(new URL('./lib/open-meteo-part-bank.mjs?' + query, import.meta.url));
  const { openMeteoO1280NearestGridPoint } = await import(new URL('./lib/open-meteo-o1280-grid.mjs?' + query, import.meta.url));
  const head = execFileSync('git', ['rev-parse', 'HEAD^{commit}'], { cwd: PRIVATE_RUNTIME_REPOSITORY_ROOT, encoding: 'utf8' }).trim();
  const environment = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'fixture/repo',
    GITHUB_RUN_ID: '200', GITHUB_RUN_ATTEMPT: '2', GITHUB_SHA: head, GITHUB_REF: 'refs/heads/main',
    RUNNER_NAME: 'source-materializer-fixture', RUNNER_OS: 'Linux', RUNNER_TRACKING_ID: 'synthetic-marker',
    RAVRADAR_SOURCE_EXTENDED_PROVIDER_BOOTSTRAP: 'false', WEATHER_PROGRESS_ENCRYPTION_KEY: Buffer.alloc(32, 73).toString('base64') };
  const priorEnvironment = new Map(Object.keys(environment).map(key => [key, process.env[key]]));
  Object.assign(process.env, environment);
  // One coherent synthetic wall/monotonic relationship for this handoff test.
  // Real Windows clock drift was separately rejected by the unchanged A2 guard;
  // this fixture is not actual hosted clock/deadline evidence and never resets.
  const realNow = Date.now, wallStart = Date.now(), monoStart = performance.now();
  Date.now = () => wallStart + Math.floor(performance.now() - monoStart);
  const sample = () => { const monoBefore = performance.now(), wall = Date.now(), monoAfter = performance.now(); return { monoBefore, wall, monoAfter }; };
  async function holder() {
    const identity = hooks.captureSourceDeadlineProcess();
    const run = { id: 200, run_attempt: 2, head_sha: head, head_branch: 'main',
      path: '.github/workflows/update-and-deploy.yml', status: 'in_progress', conclusion: null,
      event: 'schedule', repository: { full_name: 'fixture/repo' }, head_repository: { full_name: 'fixture/repo' } };
    let calls = 0;
    const issued = await hooks.issuePrivateSourceJobDeadline(identity, { async readJsonWithTiming(route) {
      const before = sample(); calls++;
      assert.equal(route, '/repos/fixture/repo/actions/runs/200/attempts/2' + (calls === 2 ? '/jobs?per_page=100' : ''));
      const json = calls === 1 ? run : { total_count: 1, jobs: [{ id: 300, run_id: 200, head_sha: head,
        name: SOURCE_GATE_PRODUCERS[run.path].gates[0].job, status: 'in_progress', conclusion: null,
        completed_at: null, runner_id: 400, runner_name: environment.RUNNER_NAME,
        started_at: new Date(before.wall - 600000).toISOString() }] };
      return { before, after: sample(), serverDate: new Date(before.wall).toUTCString(), hasNextPage: false, json };
    } });
    assert.equal(calls, 2); return issued;
  }
  const targetText = (await fs.readFile(new URL('./test-protected-private-production-runtime.mjs', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  const first = targetText.indexOf('const clone = value =>'), end = targetText.indexOf('\ntry {\n  await fs.mkdir(repository', first);
  const setupEnd = targetText.indexOf('\n  const baselineContracts =', end);
  assert.ok(first > 0 && end > first && setupEnd > end);
  const fixtureContext = { fs, os, path, crypto, process, Buffer, PRIVATE_RUNTIME_FILES, PRIVATE_RUNTIME_CONTRACT_FILES,
    ravScoreModelBinding, buildPrivateRuntimeCreateSpec: workflow.buildPrivateRuntimeCreateSpec,
    buildPrivateRuntimeExpectation: workflow.buildPrivateRuntimeExpectation,
    createPrivateProductionRuntimeBundle: bundleModule.createPrivateProductionRuntimeBundle };
  // Reuse ONLY the existing synthetic data/store factory, not extracted product
  // bodies. RAM-source reads keep the fixture tied to the selected source bytes.
  const setup = targetText.slice(end + '\ntry {'.length, setupEnd)
    .replace('await fs.copyFile(source, destination);', 'await fs.writeFile(destination, await fs.readFile(source));');
  const fixture = await Function(...Object.keys(fixtureContext), 'return (async()=>{\n'
    + targetText.slice(first, end) + setup
    + '\nreturn { temp, repository, privateRoot, restoreRoot, createGeneration, fakeDocuments, fakeStorage }; })()')(...Object.values(fixtureContext));
  const { repository, privateRoot, restoreRoot, createGeneration, fakeDocuments, fakeStorage } = fixture;
  const write = async (root, relative, value) => { const file = path.join(root, relative); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, typeof value === 'string' ? value : JSON.stringify(value)); };
  const digest = value => crypto.createHash('sha256').update(value).digest('hex');
  const documents = fakeDocuments(), storage = fakeStorage();
  let reads = 0, expected, injectFailure = false, injected = 0;
  const realLstat = fs.lstat;
  async function restore(label) {
    const issued = await holder();
    const bundlePath = path.join(restoreRoot, label);
    const result = await hooks.restoreSourceOriginals(issued, 'single', { privateRoot: restoreRoot, bundlePath,
      repositoryRoot: repository, expected, now: '2026-08-29T11:05:00.000Z', storage: storage.client,
      request: async (...args) => { reads++; return documents.request(...args); } });
    const outputPath = path.join(restoreRoot, label + '-materialized');
    await bundleModule.restorePrivateProductionRuntimeBundle({ privateRoot: restoreRoot, bundlePath, outputPath,
      repositoryRoot: repository, expected, targetReferenceAt: expected.targetReferenceAt,
      minimumReferenceAt: expected.minimumReferenceAt, minimumGeneratedAt: expected.minimumGeneratedAt,
      now: '2026-08-29T11:05:00.000Z' });
    return { issued, result, outputPath, state: hooks.sourceOriginalResultOwners.get(result) };
  }
  try {
    const reference = '2026-08-29T10:00:00.000Z';
    const part = { partId: 'TEST', zoneId: 'ZONE', waterPoint: [10, 56] };
    const spatialPolicies = OPEN_METEO_NATIVE_NEAREST_POLICIES;
    const gridPoint = openMeteoO1280NearestGridPoint(part.waterPoint);
    const responseText = JSON.stringify({ longitude: gridPoint[0], latitude: gridPoint[1], utc_offset_seconds: 0,
      hourly: { time: [reference], wind_speed_10m: [4], wind_direction_10m: [90] }, hourly_units: { wind_speed_10m: 'm/s', wind_direction_10m: '°' } });
    const admission = readOpenMeteoPartResponse({ request: buildOpenMeteoPartRequest(part, { component: 'wind', productionReferenceAt: reference,
      spatialPolicy: spatialPolicies.wind }), responseText, acquiredAt: reference }, { part, spatialPolicies });
    const bank = mergeOpenMeteoPartBank(null, [admission], { parts: [part], spatialPolicies, retentionStartAt: reference, retentionEndAt: reference });
    const ledger = '{"synthetic":"original selected donor"}\n';
    const marker = { schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS', sourceSelectionApplied: true,
      openMeteoBankSha256: bank.bankSha256, copernicusBankSha256: null, selectedComponentsSha256: digest(ledger) };
    await write(repository, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank, bank);
    await write(repository, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents, ledger);
    await write(repository, PRIVATE_WEATHER_COMPONENT_FILES.fallbackCursor, { kind: 'WEATHER_COMPONENT_FALLBACK_CURSOR', schemaVersion: 1, openMeteoLastAttemptedPartId: 'TEST' });
    const generation = await createGeneration(0, { metadataOverride: { weatherComponentInputs: marker } }); expected = generation.expected;
    const emptyHolder = await holder();
    const emptyResult = await hooks.restoreSourceOriginals(emptyHolder, 'single', { privateRoot: restoreRoot,
      bundlePath: path.join(restoreRoot, 'absent'), repositoryRoot: repository, expected,
      now: '2026-08-29T11:05:00.000Z', storage: storage.client, request: documents.request });
    assert.equal(emptyResult.restored, false);
    assert.deepEqual(await progress.installSourceOriginalProgress(emptyHolder, emptyResult),
      { progressInspected: false, reason: 'protected-original-absent' });
    assert.equal(hooks.sourceOriginalResultOwners.get(emptyResult).workingGeneration, undefined);
    await hooks.publishProtectedPrivateProductionRuntime({ privateRoot, bundlePath: generation.bundlePath,
      repositoryRoot: repository, expected, now: '2026-08-29T11:05:00.000Z', sourceHead: head,
      request: documents.request, storage: storage.client });
    const owned = await restore('baseline-without-s');
    const originalRows = [...owned.state.bundles[0].rows.values()].map(row => ({
      row, path: row.path, stat: row.stat, sha256: row.sha256, fd: row.handle.fd,
    }));
    await assert.rejects(workflow.installSourceOriginalPrivateRuntime({}, owned.result,
      { restoredRoot: owned.outputPath, repositoryRoot: repository }), /DEADLINE_NOT_ISSUED/);
    const installed = await workflow.installSourceOriginalPrivateRuntime(owned.issued, owned.result,
      { restoredRoot: owned.outputPath, repositoryRoot: repository });
    assert.equal(installed.installed, true);
    assert.equal(installed.fileCount, 13);
    assert.equal(owned.state.preparedInstall.completed, true);
    assert.ok(owned.state.preparedInstall.packInvocation instanceof Promise);
    assert.equal((await owned.state.preparedInstall.packInvocation).length, 3);
    const before = owned.state.workingReaders.map(row => ({
      row, path: row.path, stat: row.stat, sha256: row.sha256, fd: row.handle.fd,
    }));
    const binding = owned.state.progressBinding;
    assert.equal(owned.state.workingGeneration, undefined);
    await assert.rejects(fs.lstat(path.join(repository, progress.WEATHER_PROGRESS_CIPHER_PATH)),
      error => error.code === 'ENOENT');
    // Genuine B issuer/restore and existing real handles, not a cache issuer.
    const { createRequire, syncBuiltinESMExports } = await import('node:module');
    const childProcess = createRequire(import.meta.url)('node:child_process');
    const realExecFileSync = childProcess.execFileSync;
    let actualGitReads = 0;
    childProcess.execFileSync = function(file, args, ...rest) {
      if (file === 'git' && args?.join('\0') === 'rev-parse\0HEAD^{commit}') actualGitReads++;
      return Reflect.apply(realExecFileSync, this, [file, args, ...rest]);
    };
    syncBuiltinESMExports();
    const immutableBChecks = [];
    const fixtureRealRoot = await fs.realpath(fixture.temp);
    const assertOwnFixturePath = file => {
      const relative = path.relative(fixtureRealRoot, path.resolve(file));
      assert.ok(relative !== '' && !path.isAbsolute(relative)
        && relative !== '..' && !relative.startsWith('..' + path.sep));
    };
    const genuineB = async label => {
      const value = await restore('immutable-b-' + label);
      const row = value.state.bundles[0].rows.get('payload/data/live/conditions.json');
      assert.ok(row && value.state.phase === 'READY');
      return { ...value, row };
    };
    const countRealReads = row => {
      const own = Object.getOwnPropertyDescriptor(row.handle, 'read'), read = row.handle.read;
      let count = 0;
      row.handle.read = function(...args) { count++; return Reflect.apply(read, this, args); };
      return { count: () => count, restore() {
        if (own) Object.defineProperty(row.handle, 'read', own); else delete row.handle.read;
      } };
    };
    const hashB = value => hooks.hashSourceOriginalBundleRow(value.state, value.row);
    const certificate = value => hooks.sourceOriginalBundleHashAdmissions.get(value.row);
    const prime = async label => { const value = await genuineB(label); await hashB(value); return value; };
    try {
      const value = await genuineB('read-count'), counter = countRealReads(value.row);
      const clock = hooks.sourceJobDeadlineBrands.get(value.issued), initialCutoff = clock.deadline;
      try {
        const gitBefore = actualGitReads, monoBefore = clock.clock.lastMono;
        await hashB(value); const firstReads = counter.count(), firstGit = actualGitReads;
        assert.ok(firstReads > 0 && firstGit > gitBefore, 'miss executes the whole real read and native Git');
        assert.ok(clock.clock.lastMono > monoBefore && clock.deadline <= initialCutoff);
        const previous = certificate(value);
        const monoAfterFirst = clock.clock.lastMono;
        await hashB(value);
        assert.ok(actualGitReads > firstGit && clock.clock.lastMono > monoAfterFirst,
          'every reuse still checks the actual Git/process and issued clock');
        if (process.platform === 'linux') {
          assert.equal(counter.count(), firstReads, 'a hit reuses a previous digest, never a new byte read');
          assert.ok(previous && Object.isFrozen(previous) && previous.handle === value.row.handle);
          assert.equal(certificate(value), previous);
        } else {
          assert.ok(counter.count() > firstReads, 'non-Linux must keep the unchanged whole read');
          assert.equal(previous, undefined); assert.equal(certificate(value), undefined);
        }
        const cloned = { ...value.row, immutableDigest: value.row.sha256 };
        const beforeClone = counter.count();
        await hooks.hashSourceOriginalBundleRow(value.state, cloned);
        assert.ok(counter.count() > beforeClone); assert.equal(hooks.sourceOriginalBundleHashAdmissions.get(cloned), undefined);
        for (const field of ['stat', 'directories']) {
          const original = value.row[field], readsBeforeChange = counter.count();
          value.row[field] = field === 'stat' ? { ...original } : [...original];
          try { await hashB(value); assert.ok(counter.count() > readsBeforeChange, 'changed operands require the full read'); }
          finally { value.row[field] = original; }
          assert.equal(certificate(value), previous, 'changed operands never refresh the old admission');
        }
      } finally { counter.restore(); }
      immutableBChecks.push('genuine-miss-hit-or-platform-fallback-and-forgery');

      // Forward the real stat unchanged, but race one certificate operand after
      // the hit's first snapshot, during its second genuine named/FD check.
      // Linux must fall through to full hash and reject, never return a stale hit.
      if (process.platform === 'linux') {
        const race = await prime('second-check-race'), admission = certificate(race);
        const handle = race.row.handle, ownStat = Object.getOwnPropertyDescriptor(handle, 'stat'), realStat = handle.stat;
        const counter = countRealReads(race.row); let statCalls = 0;
        handle.stat = async function(...args) {
          const result = await Reflect.apply(realStat, this, args);
          if (++statCalls === 2) race.row.sha256 = '0'.repeat(64);
          return result;
        };
        try {
          await assert.rejects(hashB(race), /SOURCE_ORIGINAL_BYTES_CHANGED/);
          assert.ok(statCalls >= 2 && counter.count() > 0, 'raced hit must perform the unchanged real full read');
          assert.equal(certificate(race), admission, 'raced operands cannot refresh an admission');
        } finally {
          counter.restore(); if (ownStat) Object.defineProperty(handle, 'stat', ownStat); else delete handle.stat;
        }
      }

      const identity = await prime('changed-process'), oldSha = process.env.GITHUB_SHA;
      process.env.GITHUB_SHA = '0'.repeat(40);
      try { await assert.rejects(hashB(identity), /SOURCE_JOB_PROCESS_IDENTITY_CHANGED/); }
      finally { process.env.GITHUB_SHA = oldSha; }
      const expired = await prime('expired-clock');
      hooks.sourceJobDeadlineBrands.get(expired.issued).endEpoch = Date.now() - 1;
      await assert.rejects(hashB(expired), /SOURCE_JOB_DEADLINE_EXPIRED/);
      const retained = await prime('first-failure'), firstRaw = Object.freeze({ synthetic: 'first raw cause' });
      assert.equal(hooks.retainSourceOriginalProgressFailure(retained.issued, firstRaw), firstRaw);
      await assert.rejects(hashB(retained), error => error === firstRaw);
      await assert.rejects(hooks.hashSourceOriginalBundleRow({ holder: {} }, value.row), /SOURCE_JOB_DEADLINE_NOT_ISSUED/);
      immutableBChecks.push('fresh-native-git-process-clock-and-first-error');

      const changed = await prime('changed-bytes'), oldIdentity = changed.row.stat, oldAdmission = certificate(changed);
      const bytes = await fs.readFile(changed.row.path), modified = Buffer.from(bytes); modified[0] ^= 1;
      assertOwnFixturePath(changed.row.path);
      await fs.writeFile(changed.row.path, modified);
      realExecFileSync(process.env.PYTHON || 'python', ['-I', '-B', '-c',
        'import os,sys;os.utime(sys.argv[1],ns=(int(sys.argv[2]),int(sys.argv[3])))', changed.row.path,
        String(oldIdentity.atimeNs), String(oldIdentity.mtimeNs)]);
      const changedStat = await fs.lstat(changed.row.path, { bigint: true });
      assert.equal(changedStat.mtimeNs, oldIdentity.mtimeNs);
      if (process.platform === 'linux') assert.notEqual(changedStat.ctimeNs, oldIdentity.ctimeNs);
      await assert.rejects(hashB(changed), /SOURCE_ORIGINAL_(FILE|BYTES)_CHANGED/);
      assert.equal(changed.row.stat, oldIdentity); assert.equal(certificate(changed), oldAdmission);
      immutableBChecks.push('changed-bytes-restored-mtime-no-repin');

      const exchanged = await prime('directory-exchange'), directory = path.dirname(exchanged.row.path);
      assertOwnFixturePath(directory);
      await fs.rename(directory, directory + '.own-negative-held'); await fs.mkdir(directory);
      await assert.rejects(hashB(exchanged), /SOURCE_ORIGINAL_DIRECTORY_CHANGED/);
      const linked = await prime('hardlink'), linkedPath = linked.row.path + '.own-negative-link';
      assertOwnFixturePath(linkedPath); await fs.link(linked.row.path, linkedPath);
      await assert.rejects(hashB(linked), /SOURCE_ORIGINAL_FILE_CHANGED/);
      immutableBChecks.push('directory-exchange-and-hardlink');

      const closed = await prime('closed-handle'), oldFd = closed.row.handle.fd;
      await closed.row.handle.close(); const reopened = await fs.open(closed.row.path, 'r');
      try {
        assert.equal(closed.row.handle.fd, -1); assert.ok(oldFd >= 0 && reopened.fd >= 0);
        await assert.rejects(hashB(closed), error => error.code === 'EBADF' || error.code === 'ERR_INVALID_STATE');
      } finally { await reopened.close(); }
      immutableBChecks.push('closed-real-handle-and-reopen');

      const operand = await prime('changed-digest'), oldDigest = operand.row.sha256, operandAdmission = certificate(operand);
      operand.row.sha256 = '0'.repeat(64);
      await assert.rejects(hashB(operand), /SOURCE_ORIGINAL_BYTES_CHANGED/);
      assert.equal(certificate(operand), operandAdmission);
      assert.notEqual(operand.row.sha256, oldDigest, 'no producer or test repins the refused digest');
      immutableBChecks.push('changed-certificate-operands-never-refreshed');

      const working = owned.state.workingReaders[0], workingReads = countRealReads(working);
      try {
        await hooks.hashSourceOriginalBundleRow(owned.state, working); const count = workingReads.count();
        await hooks.hashSourceOriginalBundleRow(owned.state, working);
        assert.ok(count > 0 && workingReads.count() > count);
        assert.equal(hooks.sourceOriginalBundleHashAdmissions.get(working), undefined);
      } finally { workingReads.restore(); }
      const unknown = await prime('unknown-time'), knownStat = unknown.row.stat;
      unknown.row.stat = { ...knownStat, ctimeNs: Number(knownStat.ctimeNs) };
      await assert.rejects(hashB(unknown), /SOURCE_ORIGINAL_FILE_CHANGED/);
      immutableBChecks.push('working-row-and-unknown-timestamp-not-admitted');
      assert.equal(immutableBChecks.length, 7);
      console.log(JSON.stringify({ immutableBNormalDigestAdmission: 'PASS', attackGroups: immutableBChecks,
        forwardingActualGitReads: actualGitReads, actualPlatform: process.platform,
        actualLinuxReuse: process.platform === 'linux' ? 'PASS' : 'UNRUN', newByteReadsOnHit: process.platform === 'linux' ? false : 'UNRUN',
        secondCheckOperandRace: process.platform === 'linux' ? 'PASS' : 'UNRUN',
        oldHashFunctionReplaced: false, newOwnerOrFdLifetime: false, sourceAdmission: false, realNetwork: 0 }));
    } finally { childProcess.execFileSync = realExecFileSync; syncBuiltinESMExports(); }

    const readsBeforeProgress = reads;
    // The real normal C caller authenticates absence, then invokes P's guarded
    // B-working admission. No prelude state, result flag or owner is fabricated.
    const actual = await progress.installSourceOriginalProgress(owned.issued, owned.result);
    assert.deepEqual(actual, { progressInspected: false, status: 'CACHE_MISS',
      code: 'SNAPSHOT_ABSENT', applied: false, workingUnchanged: true });
    const cacheOwner = [...progress.retainedSourceProgressOwners].at(-1);
    assert.equal(cacheOwner.holder, owned.issued);
    assert.equal(cacheOwner.miss, actual);
    assert.equal(cacheOwner.result, null);
    assert.equal(cacheOwner.unionInvocation, null);
    assert.equal(cacheOwner.temporary, null);
    assert.equal(cacheOwner.packInvocation, null);
    assert.equal(cacheOwner.streams.length, 0);
    assert.equal(reads, readsBeforeProgress, 'no second moving B pointer');
    assert.equal(owned.state.workingOperation.kind, 'baseline-working-read');
    assert.equal(owned.state.workingOperation.actual, actual);
    assert.equal(owned.state.workingOperation.input, cacheOwner);
    assert.equal(owned.state.workingOperation.completed, true);
    assert.equal(owned.state.activeOperation, null);
    assert.equal(owned.state.workingGeneration.inputKind, 'installed-protected-baseline');
    assert.equal(owned.state.workingGeneration.originalBinding, binding);
    assert.equal(owned.state.progressBinding, binding);
    assert.deepEqual(owned.state.workingGeneration.rows, before.map(item => item.row));
    assert.equal(owned.state.workingGeneration.rows.length, 13);
    await hooks.assertSourceOriginalProgress(owned.issued);
    for (const old of [...originalRows, ...before]) {
      assert.equal(old.row.path, old.path);
      assert.equal(old.row.stat, old.stat);
      assert.equal(old.row.sha256, old.sha256);
      assert.equal(old.row.handle.fd, old.fd);
      const held = await old.row.handle.stat({ bigint: true });
      assert.equal(held.dev, old.stat.dev);
      assert.equal(held.ino, old.stat.ino);
      assert.equal(digest(await fs.readFile(old.path)), old.sha256);
    }
    await assert.rejects(fs.lstat(path.join(repository, progress.WEATHER_PROGRESS_CIPHER_PATH)),
      error => error.code === 'ENOENT');
    assert.equal(Object.hasOwn(actual, 'saved'), false);
    assert.equal(Object.hasOwn(actual, 'sourceComplete'), false);
    assert.equal(Object.hasOwn(actual, 'workingInstalled'), false);
    assert.equal(Object.hasOwn(owned.state, 'dmiOperation'), false);

    // Actual P -> S copy from the genuine installed B/missing-S admission above.
    // No producer/prelude/completed flags are manufactured by this fixture.
    await hooks.runSourceNormalDeployedBulkCopy(owned.issued);
    const deployedCopy = owned.state.normalDeployedCopy;
    assert.equal(deployedCopy.completed, true);
    assert.equal(owned.state.activeOperation, null);
    const canonicalRepository = owned.state.context.repository;
    assert.equal(await fs.realpath(repository), canonicalRepository);
    assert.equal(deployedCopy.row.path, path.join(canonicalRepository, '.cache/deployed-dmi-bulk-cache.json'));
    const sCopyOwners = [...progress.retainedSourceProgressOwners].filter(owner =>
      owner.holder === owned.issued && owner.writers?.some(writer => writer.path === deployedCopy.row.path));
    assert.equal(sCopyOwners.length, 1, 'observe the actual S owner that performed the copy');
    assert.equal(sCopyOwners[0].writers.length, 1);
    assert.equal(sCopyOwners[0].writers[0].closed, true, 'actual writer EBADF was proved');
    assert.deepEqual(sCopyOwners[0].handles, [], 'S must never open a redundant readonly handle');
    const completion = progress.sourceNormalDeployedCopyCompletion(owned.issued);
    assert.deepEqual(Object.keys(completion).sort(), ['bytes', 'closed', 'input', 'sha256']);
    assert.equal(Object.hasOwn(completion, 'row'), false, 'S completion is writer-only');
    const pCopyReaders = owned.state.operationReaders.filter(row => row.path === deployedCopy.row.path);
    assert.deepEqual(pCopyReaders, [deployedCopy.row], 'P owns exactly the one actual readback reader');
    assert.ok(deployedCopy.row.handle.fd >= 0);
    const heldCopy = await deployedCopy.row.handle.stat({ bigint: true });
    assert.equal(heldCopy.isFile(), true);
    assert.equal(heldCopy.dev, deployedCopy.row.stat.dev);
    assert.equal(heldCopy.ino, deployedCopy.row.stat.ino);
    assert.equal(deployedCopy.row.sha256, before.find(item => item.row.path === path.join(canonicalRepository, 'data/live/dmi-bulk-cache.json')).sha256);
    assert.deepEqual(await fs.readFile(deployedCopy.row.path),
      await fs.readFile(path.join(repository, 'data/live/dmi-bulk-cache.json')));
    await hooks.assertSourceOriginalProgress(owned.issued);
    for (const old of [...originalRows, ...before]) {
      assert.equal(old.row.path, old.path); assert.equal(old.row.stat, old.stat);
      assert.equal(old.row.sha256, old.sha256); assert.equal(old.row.handle.fd, old.fd);
    }
    // Only actual internal S calls and genuine owners minted by the existing
    // B/S fixture. No producer/T/hosted ACK or final SOURCE release is invented.
    const streamFs = await import('node:fs');
    assert.equal(cacheOwner.root, canonicalRepository);
    const streamDirectory = path.join(canonicalRepository, '.cache/source19-owned-stream-test');
    await fs.mkdir(streamDirectory, { recursive: false });
    const streamInput = path.join(streamDirectory, 'input.bin');
    const streamBody = Buffer.from('synthetic-owned-stream-not-weather\n');
    await fs.writeFile(streamInput, streamBody);
    const ordinaryOutput = path.join(streamDirectory, 'normal.bin');
    await progress.sourceProgressPipeline(cacheOwner, streamFs.createReadStream(streamInput),
      streamFs.createWriteStream(ordinaryOutput, { flags: 'wx', mode: 0o600 }));
    assert.deepEqual(await fs.readFile(ordinaryOutput), streamBody);
    assert.equal(progress.retainedSourceProgressOwners.has(cacheOwner), true);
    const closeMiss = await progress.inspectOwnedSourceProgress({ repositoryRoot: canonicalRepository }, owned.issued);
    const closeOwner = [...progress.retainedSourceProgressOwners].find(owner => owner.miss === closeMiss);
    assert.ok(closeOwner && closeOwner.holder === owned.issued);
    assert.deepEqual(closeOwner.streams, []);
    // A real fs stream's close callback may return success WITHOUT closing its
    // real descriptor. The OLD pipeline Promise accepts that; the new gate must
    // reject while the actual FD and genuine owner remain retained.
    const noOpOutput = path.join(streamDirectory, 'close-noop.bin');
    let noOpFd = null, closeCalls = 0;
    const noOpWriter = streamFs.createWriteStream(noOpOutput, { flags: 'wx', mode: 0o600,
      fs: { ...streamFs, close(fd, callback) { closeCalls++; callback(null); } } });
    noOpWriter.once('open', fd => { noOpFd = fd; });
    try {
      await assert.rejects(progress.sourceProgressPipeline(closeOwner,
        streamFs.createReadStream(streamInput), noOpWriter), /SOURCE_PROGRESS_STREAM_CLOSE_UNPROVED/);
      assert.equal(closeCalls, 1);
      assert.equal(streamFs.fstatSync(noOpFd).isFile(), true, 'no-op callback did not physically close');
      assert.equal(progress.retainedSourceProgressOwners.has(closeOwner), true);
      const first = closeOwner.failure[0];
      await assert.rejects(progress.closeSourceProgressOwnerFileStreams(closeOwner), error => error === first);
      assert.equal(closeCalls, 1, 'uncertain close must never be retried');
    } finally {
      // Test-owned cleanup only after physical retention measurements; never a
      // production release or retry through the stream's injected close method.
      if (noOpFd !== null) {
        try { streamFs.fstatSync(noOpFd); streamFs.closeSync(noOpFd); }
        catch (error) { if (error?.code !== 'EBADF') throw error; }
      }
    }
    const borrowed = await progress.ownSourceProgressHandle(cacheOwner, streamInput,
      { bytes: streamBody.length, sha256: digest(streamBody) });
    const borrowedFd = borrowed.handle.fd;
    const borrowedStream = borrowed.handle.createReadStream({ autoClose: false });
    await progress.sourceProgressPipeline(cacheOwner, borrowedStream,
      streamFs.createWriteStream(path.join(streamDirectory, 'borrowed.bin'), { flags: 'wx', mode: 0o600 }));
    await progress.closeSourceProgressOwnerFileStreams(cacheOwner);
    assert.equal(borrowedStream.autoClose, false);
    assert.equal(borrowedStream.destroyed, false);
    assert.equal(borrowed.handle.fd, borrowedFd);
    assert.equal(streamFs.fstatSync(borrowedFd).isFile(), true, 'borrowed reader remains with its real owner');
    const originalLstat = fs.lstat;
    fs.lstat = async (file, ...args) => { if (file === streamInput) throw null; return originalLstat(file, ...args); };
    try { await assert.rejects(progress.closeSourceProgressOwnerFileStreams(cacheOwner), error => error === null); }
    finally { fs.lstat = originalLstat; }
    assert.deepEqual(cacheOwner.failure, [null]);
    await assert.rejects(progress.closeSourceProgressOwnerFileStreams(cacheOwner), error => error === null);
    assert.equal(streamFs.fstatSync(borrowedFd).isFile(), true);
    assert.equal(progress.retainedSourceProgressOwners.has(cacheOwner), true);
    assert.equal(owned.state.activeOperation, null);
    assert.equal(owned.state.artifact, undefined);
    console.log(JSON.stringify({ sourceProgressPhysicalStreams: 'PASS', ownStreamsClosed: true,
      closeNoopRefused: true, closeCalls, borrowedReaderRetained: true, firstRawNullRetained: true,
      sourceComplete: false, realNetwork: 0 }));
    console.log(JSON.stringify({ normalPackedBaselineMiss: 'PASS', installedFiles: 13,
      sameOriginalAndWorkingHandles: true, originalPinsUnchanged: true,
      missRemainsMiss: true, missingBRefused: true, producerEntered: false, realNetwork: 0 }));
  } finally {
    injectFailure = false; fs.lstat = realLstat;
    // Test-owned cleanup only after retention measurements; not SOURCE release.
    for (const owner of progress.retainedSourceProgressOwners) {
      for (const row of owner.handles) if (row.handle.fd >= 0) await row.handle.close();
      if (owner.temporary) await owner.temporary.cleanup();
    }
    for (const owner of hooks.retainedSourceOriginalOwners) {
      const rows = new Set([...owner.bundles.flatMap(bundle => [...bundle.rows.values()]), ...(owner.operationReaders ?? []), ...(owner.workingReaders ?? [])]);
      for (const row of rows) if (row.handle.fd >= 0) await row.handle.close();
    }
    for (const [key, value] of priorEnvironment) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    Date.now = realNow;
    observation.deregister();
    await fs.rm(fixture.temp, { recursive: true, force: true });
  }
});

await test('SOURCE normal progress: final raw null retains genuine B and unfinished baseline admission', async () => {
  const { registerHooks } = await import('node:module');
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const moduleUrl = new URL('./protected-private-production-runtime.mjs', import.meta.url);
  const repositoryUrl = new URL('../', import.meta.url).href;
  const query = 'source-owner-test=' + crypto.randomUUID();
  // Fresh, actual ESM module graph. Only test observation exports are appended;
  // imports, module initialization, issuer and all validators execute unchanged.
  const observation = registerHooks({
    resolve(specifier, context, next) {
      const result = next(specifier, context);
      if (result.url.startsWith(repositoryUrl) && /\.(?:mjs|js)$/.test(new URL(result.url).pathname)) {
        const url = new URL(result.url); url.search = query;
        return { ...result, url: url.href };
      }
      return result;
    },
    load(url, context, next) {
      const result = next(url, context);
      if (url.startsWith(moduleUrl.href + '?')) return { ...result, source: String(result.source)
        + '\nexport { captureSourceDeadlineProcess, issuePrivateSourceJobDeadline, restoreSourceOriginals, sourceOriginalResultOwners, retainedSourceOriginalOwners, runSourceNormalDeployedBulkCopy };\n' };
      if (new URL(url).protocol === 'file:' && new URL(url).pathname.endsWith('/weather-component-progress-cache.mjs')) {
        return { ...result, source: String(result.source) + '\nexport { retainedSourceProgressOwners };\n' };
      }
      return result;
    },
  });
  const hooks = await import(moduleUrl.href + '?' + query);
  const workflow = await import(new URL('./private-production-runtime-workflow.mjs?' + query, import.meta.url));
  const progress = await import(new URL('./weather-component-progress-cache.mjs?' + query, import.meta.url));
  const bundleModule = await import(new URL('./private-production-runtime-bundle.mjs?' + query, import.meta.url));
  const { PRIVATE_WEATHER_COMPONENT_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE } =
    await import(new URL('./lib/private-weather-component-inventory.mjs?' + query, import.meta.url));
  const { buildOpenMeteoPartRequest, readOpenMeteoPartResponse, mergeOpenMeteoPartBank, OPEN_METEO_NATIVE_NEAREST_POLICIES } =
    await import(new URL('./lib/open-meteo-part-bank.mjs?' + query, import.meta.url));
  const { openMeteoO1280NearestGridPoint } = await import(new URL('./lib/open-meteo-o1280-grid.mjs?' + query, import.meta.url));
  const head = execFileSync('git', ['rev-parse', 'HEAD^{commit}'], { cwd: PRIVATE_RUNTIME_REPOSITORY_ROOT, encoding: 'utf8' }).trim();
  const environment = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'fixture/repo',
    GITHUB_RUN_ID: '200', GITHUB_RUN_ATTEMPT: '2', GITHUB_SHA: head, GITHUB_REF: 'refs/heads/main',
    RUNNER_NAME: 'source-materializer-fixture', RUNNER_OS: 'Linux', RUNNER_TRACKING_ID: 'synthetic-marker',
    RAVRADAR_SOURCE_EXTENDED_PROVIDER_BOOTSTRAP: 'false', WEATHER_PROGRESS_ENCRYPTION_KEY: Buffer.alloc(32, 73).toString('base64') };
  const priorEnvironment = new Map(Object.keys(environment).map(key => [key, process.env[key]]));
  Object.assign(process.env, environment);
  // One coherent synthetic wall/monotonic relationship for this handoff test.
  // Real Windows clock drift was separately rejected by the unchanged A2 guard;
  // this fixture is not actual hosted clock/deadline evidence and never resets.
  const realNow = Date.now, wallStart = Date.now(), monoStart = performance.now();
  Date.now = () => wallStart + Math.floor(performance.now() - monoStart);
  const sample = () => { const monoBefore = performance.now(), wall = Date.now(), monoAfter = performance.now(); return { monoBefore, wall, monoAfter }; };
  async function holder() {
    const identity = hooks.captureSourceDeadlineProcess();
    const run = { id: 200, run_attempt: 2, head_sha: head, head_branch: 'main',
      path: '.github/workflows/update-and-deploy.yml', status: 'in_progress', conclusion: null,
      event: 'schedule', repository: { full_name: 'fixture/repo' }, head_repository: { full_name: 'fixture/repo' } };
    let calls = 0;
    const issued = await hooks.issuePrivateSourceJobDeadline(identity, { async readJsonWithTiming(route) {
      const before = sample(); calls++;
      assert.equal(route, '/repos/fixture/repo/actions/runs/200/attempts/2' + (calls === 2 ? '/jobs?per_page=100' : ''));
      const json = calls === 1 ? run : { total_count: 1, jobs: [{ id: 300, run_id: 200, head_sha: head,
        name: SOURCE_GATE_PRODUCERS[run.path].gates[0].job, status: 'in_progress', conclusion: null,
        completed_at: null, runner_id: 400, runner_name: environment.RUNNER_NAME,
        started_at: new Date(before.wall - 600000).toISOString() }] };
      return { before, after: sample(), serverDate: new Date(before.wall).toUTCString(), hasNextPage: false, json };
    } });
    assert.equal(calls, 2); return issued;
  }
  const targetText = (await fs.readFile(new URL('./test-protected-private-production-runtime.mjs', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  const first = targetText.indexOf('const clone = value =>'), end = targetText.indexOf('\ntry {\n  await fs.mkdir(repository', first);
  const setupEnd = targetText.indexOf('\n  const baselineContracts =', end);
  assert.ok(first > 0 && end > first && setupEnd > end);
  const fixtureContext = { fs, os, path, crypto, process, Buffer, PRIVATE_RUNTIME_FILES, PRIVATE_RUNTIME_CONTRACT_FILES,
    ravScoreModelBinding, buildPrivateRuntimeCreateSpec: workflow.buildPrivateRuntimeCreateSpec,
    buildPrivateRuntimeExpectation: workflow.buildPrivateRuntimeExpectation,
    createPrivateProductionRuntimeBundle: bundleModule.createPrivateProductionRuntimeBundle };
  // Reuse ONLY the existing synthetic data/store factory, not extracted product
  // bodies. RAM-source reads keep the fixture tied to the selected source bytes.
  const setup = targetText.slice(end + '\ntry {'.length, setupEnd)
    .replace('await fs.copyFile(source, destination);', 'await fs.writeFile(destination, await fs.readFile(source));');
  const fixture = await Function(...Object.keys(fixtureContext), 'return (async()=>{\n'
    + targetText.slice(first, end) + setup
    + '\nreturn { temp, repository, privateRoot, restoreRoot, createGeneration, fakeDocuments, fakeStorage }; })()')(...Object.values(fixtureContext));
  const { repository, privateRoot, restoreRoot, createGeneration, fakeDocuments, fakeStorage } = fixture;
  const write = async (root, relative, value) => { const file = path.join(root, relative); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, typeof value === 'string' ? value : JSON.stringify(value)); };
  const digest = value => crypto.createHash('sha256').update(value).digest('hex');
  const documents = fakeDocuments(), storage = fakeStorage();
  let reads = 0, expected, injectFailure = false, injected = 0;
  const realLstat = fs.lstat;
  async function restore(label) {
    const issued = await holder();
    const bundlePath = path.join(restoreRoot, label);
    const result = await hooks.restoreSourceOriginals(issued, 'single', { privateRoot: restoreRoot, bundlePath,
      repositoryRoot: repository, expected, now: '2026-08-29T11:05:00.000Z', storage: storage.client,
      request: async (...args) => { reads++; return documents.request(...args); } });
    const outputPath = path.join(restoreRoot, label + '-materialized');
    await bundleModule.restorePrivateProductionRuntimeBundle({ privateRoot: restoreRoot, bundlePath, outputPath,
      repositoryRoot: repository, expected, targetReferenceAt: expected.targetReferenceAt,
      minimumReferenceAt: expected.minimumReferenceAt, minimumGeneratedAt: expected.minimumGeneratedAt,
      now: '2026-08-29T11:05:00.000Z' });
    return { issued, result, outputPath, state: hooks.sourceOriginalResultOwners.get(result) };
  }
  try {
    const reference = '2026-08-29T10:00:00.000Z';
    const part = { partId: 'TEST', zoneId: 'ZONE', waterPoint: [10, 56] };
    const spatialPolicies = OPEN_METEO_NATIVE_NEAREST_POLICIES;
    const gridPoint = openMeteoO1280NearestGridPoint(part.waterPoint);
    const responseText = JSON.stringify({ longitude: gridPoint[0], latitude: gridPoint[1], utc_offset_seconds: 0,
      hourly: { time: [reference], wind_speed_10m: [4], wind_direction_10m: [90] }, hourly_units: { wind_speed_10m: 'm/s', wind_direction_10m: '°' } });
    const admission = readOpenMeteoPartResponse({ request: buildOpenMeteoPartRequest(part, { component: 'wind', productionReferenceAt: reference,
      spatialPolicy: spatialPolicies.wind }), responseText, acquiredAt: reference }, { part, spatialPolicies });
    const bank = mergeOpenMeteoPartBank(null, [admission], { parts: [part], spatialPolicies, retentionStartAt: reference, retentionEndAt: reference });
    const ledger = '{"synthetic":"original selected donor"}\n';
    const marker = { schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS', sourceSelectionApplied: true,
      openMeteoBankSha256: bank.bankSha256, copernicusBankSha256: null, selectedComponentsSha256: digest(ledger) };
    await write(repository, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank, bank);
    await write(repository, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents, ledger);
    await write(repository, PRIVATE_WEATHER_COMPONENT_FILES.fallbackCursor, { kind: 'WEATHER_COMPONENT_FALLBACK_CURSOR', schemaVersion: 1, openMeteoLastAttemptedPartId: 'TEST' });
    const generation = await createGeneration(0, { metadataOverride: { weatherComponentInputs: marker } }); expected = generation.expected;
    await hooks.publishProtectedPrivateProductionRuntime({ privateRoot, bundlePath: generation.bundlePath,
      repositoryRoot: repository, expected, now: '2026-08-29T11:05:00.000Z', sourceHead: head,
      request: documents.request, storage: storage.client });
    const owned = await restore('baseline-late-miss-failure');
    const installed = await workflow.installSourceOriginalPrivateRuntime(owned.issued, owned.result,
      { restoredRoot: owned.outputPath, repositoryRoot: repository });
    assert.equal(installed.installed, true);
    assert.equal(installed.fileCount, 13);
    const original = [...owned.state.bundles[0].rows.values()];
    const working = [...owned.state.workingReaders];
    const before = [...original, ...working].map(row => ({ row, path: row.path, stat: row.stat,
      sha256: row.sha256, fd: row.handle.fd, bytes: row.bytes }));
    const binding = owned.state.progressBinding;
    const cipherPath = path.join(repository, progress.WEATHER_PROGRESS_CIPHER_PATH);
    await assert.rejects(realLstat(cipherPath), error => error.code === 'ENOENT');
    let observedInput = null;
    fs.lstat = async function (...args) {
      const input = owned.state.workingOperation?.input;
      // Actual same-owner C input + fixed normal path are phase evidence.
      // Do NOT filter on admission fields: assertions below must detect eager
      // completed/generation publication or premature active-operation release.
      if (injectFailure && !injected && input?.holder === owned.issued
        && input.miss === owned.state.workingOperation.actual
        && input.miss?.code === 'SNAPSHOT_ABSENT'
        && String(args[0]) === path.join(input.root, progress.WEATHER_PROGRESS_CIPHER_PATH)) {
        observedInput = input;
        injected++;
        throw null;
      }
      return Reflect.apply(realLstat, this, args);
    };
    injectFailure = true;
    let caught = null, returned = false;
    try { await progress.installSourceOriginalProgress(owned.issued, owned.result); returned = true; }
    catch (error) { caught = [error]; }
    injectFailure = false;
    assert.equal(injected, 1, 'actual final missing-S recheck reached');
    assert.equal(returned, false);
    assert.deepEqual(caught, [null], 'preserve raw falsy first cause');
    assert.equal(observedInput.holder, owned.issued);
    assert.equal(owned.state.workingOperation.input, observedInput);
    assert.equal(owned.state.workingOperation.kind, 'baseline-working-read');
    assert.equal(owned.state.workingOperation.completed, false);
    assert.notEqual(owned.state.activeOperation, null);
    assert.equal(owned.state.workingGeneration, undefined);
    assert.equal(owned.state.phase, 'RETAINED');
    assert.deepEqual(owned.state.firstFailure, [null]);
    assert.deepEqual(observedInput.failure, [null]);
    assert.equal(observedInput.result, null);
    assert.equal(observedInput.unionInvocation, null);
    assert.equal(observedInput.temporary, null);
    assert.equal(observedInput.packInvocation, null);
    assert.equal(observedInput.streams.length, 0);
    assert.equal(owned.state.progressBinding, binding);
    assert.deepEqual(owned.state.workingReaders, working);
    let subsequent = null;
    try { await hooks.assertSourceOriginalProgress(owned.issued); }
    catch (error) { subsequent = [error]; }
    assert.deepEqual(subsequent, [null], 'retained owner must not admit a later caller');
    for (const old of before) {
      assert.equal(old.row.path, old.path);
      assert.equal(old.row.stat, old.stat);
      assert.equal(old.row.sha256, old.sha256);
      assert.equal(old.row.bytes, old.bytes);
      assert.equal(old.row.handle.fd, old.fd);
      const held = await old.row.handle.stat({ bigint: true });
      assert.equal(held.dev, old.stat.dev);
      assert.equal(held.ino, old.stat.ino);
      assert.equal(digest(await fs.readFile(old.path)), old.sha256);
    }
    await assert.rejects(realLstat(cipherPath), error => error.code === 'ENOENT');
    assert.equal(Object.hasOwn(owned.state, 'dmiOperation'), false);
    console.log(JSON.stringify({ normalBaselineLateNull: 'PASS', installedFiles: 13,
      injectedAtActualFinalMissRecheck: 1, firstRawCauseNull: true,
      retainedOriginalAndWorkingHandles: true, activeUnfinishedOperation: true,
      publishedWorkingGeneration: false, producerEntered: false, realNetwork: 0 }));
  } finally {
    injectFailure = false; fs.lstat = realLstat;
    // Test-owned cleanup only after retention measurements; not SOURCE release.
    for (const owner of progress.retainedSourceProgressOwners) {
      for (const row of owner.handles) if (row.handle.fd >= 0) await row.handle.close();
      if (owner.temporary) await owner.temporary.cleanup();
    }
    for (const owner of hooks.retainedSourceOriginalOwners) {
      const rows = new Set([...owner.bundles.flatMap(bundle => [...bundle.rows.values()]), ...(owner.operationReaders ?? []), ...(owner.workingReaders ?? [])]);
      for (const row of rows) if (row.handle.fd >= 0) await row.handle.close();
    }
    for (const [key, value] of priorEnvironment) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    Date.now = realNow;
    observation.deregister();
    await fs.rm(fixture.temp, { recursive: true, force: true });
  }
});

async function sourceNormalCurrentFixture() {
  const { ravScoreModelBinding: integratedModelBinding } = await import('../js/core/ravscore-model-contract.js');
  const { ravScoreModelBinding: candidateModelBinding } = await import('./rollback-assets/ravscore-model-contract.js');
  const { CANDIDATE_G_OPERATIONAL_ROLLBACK_ID } = await import('./lib/ravscore-candidate-g-rollback-runtime.mjs');
  const { buildIntegratedCutoverReadiness } = await import('./integrated-cutover-readiness.mjs');
  const { candidateGOperationalProfileDocument, operationalActivationTransition,
    operationalIntegratedReturnTransition, prepareIntegratedOperationalReturn,
    RAVSCORE_INTEGRATED_RETURN_POLICY, RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY,
    RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY, resolveOperationalRavScoreModel,
    operationalResolvedBindingCurrent } = await import('./ravscore-operational-activation.mjs');
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;

const sha256 = value => crypto.createHash('sha256')
  .update(typeof value === 'string' ? value : JSON.stringify(canonical(value)))
  .digest('hex');

const sourceHead = 'a'.repeat(40);

const now = '2026-08-29T13:00:00.000Z';

const defaultImplementationClosureSha256 = 'a'.repeat(64);

const integratedProfile = JSON.parse(await fs.readFile(
  new URL('../data/admin/ravscore-profile-selection.json', import.meta.url), 'utf8'));

const integratedProfileRow = Object.freeze({ version: 7, payload: integratedProfile });

const candidateProfile = candidateGOperationalProfileDocument(integratedProfile);

const candidateProfileRow = Object.freeze({ version: 8, payload: candidateProfile });

const readiness = await buildIntegratedCutoverReadiness(sourceHead, {
  publicImplementationClosureSha256: defaultImplementationClosureSha256,
});

function manifest(binding, datasetId, productionReferenceAt) {
  return Object.freeze({
    schemaVersion: 4,
    datasetId,
    productionReferenceAt,
    complete: true,
    zoneCount: 210,
    coastalPartCount: 673,
    ravScoreModelBinding: structuredClone(binding),
  });
}

function verification(model, binding, publicManifest, head = sourceHead) {
  return Object.freeze({
    schemaVersion: 'ravscore-operational-pages-verification-v1',
    status: 'passed',
    sourceHead: head,
    datasetId: publicManifest.datasetId,
    productionReferenceAt: publicManifest.productionReferenceAt,
    model,
    modelBinding: structuredClone(binding),
    implementationClosureSha256: defaultImplementationClosureSha256,
    publicManifestSha256: sha256(publicManifest),
    zoneCount: 210,
    coastalPartCount: 673,
    privatePayloadRead: false,
  });
}

function integratedAudit(binding = integratedModelBinding(), {
  rollbackStatus = 'READY',
  allCurrentScoresFullHistory = true,
  currentUnavailableModeCount = 0,
} = {}) {
  const rollbackActivationReady = rollbackStatus === 'READY';
  const currentFullHistoryModeCount = allCurrentScoresFullHistory ? 420 : 0;
  const currentHistoryIncompleteModeCount = allCurrentScoresFullHistory
    ? 0
    : 420 - currentUnavailableModeCount;
  return Object.freeze({
    schemaVersion: 1,
    status: 'passed',
    model: Object.freeze({
      modelId: binding.modelId,
      stateSchemaVersion: binding.stateSchemaVersion,
      modelContractSha256: binding.modelContractSha256,
      modelBundleSha256: binding.modelBundleSha256,
    }),
    coverage: Object.freeze({
      expectedZoneCount: 210,
      zoneCount: 210,
      expectedPartCount: 673,
      partCount: 673,
    }),
    history: Object.freeze({
      allCurrentScoresFullHistory,
      currentFullHistoryModeCount,
      currentHistoryIncompleteModeCount,
      currentUnavailableModeCount,
    }),
    rollback: Object.freeze({
      status: rollbackStatus,
      activationReady: rollbackActivationReady,
      descriptorValid: true,
      generationReferenceBound: true,
      runtimePartCount: 673,
      readyPartCount: rollbackActivationReady ? 673 : 0,
      reconstructedFromIntegratedState: false,
    }),
    payload: Object.freeze({
      privacyContractPassed: true,
      publicStateOrEvidenceIncluded: false,
      publicRawVectorIncluded: false,
      publicUnapprovedCoordinateIncluded: false,
      publicShadowIncluded: false,
    }),
    errors: Object.freeze([]),
    errorCounts: Object.freeze({}),
  });
}

function candidatePlan({
  mode = 'execute',
  centralExpectedVersion,
  sourceBinding,
  datasetId,
  productionReferenceAt,
  salt,
  sourceImplementationClosureSha256 = defaultImplementationClosureSha256,
  requestedImplementationClosureSha256 = defaultImplementationClosureSha256,
  targetBinding = candidateModelBinding(),
  targetProfile = candidateProfile,
}) {
  const activation = {
    schemaVersion: '1.0.0',
    kind: 'RAVSCORE_CANDIDATE_G_OPERATIONAL_ROLLBACK_PLAN',
    mode,
    sourceHead,
    datasetId,
    productionReferenceAt,
    privateBundleContentSha256: salt.repeat(64),
    sourceImplementationClosureSha256,
    requestedImplementationClosureSha256,
    centralExpectedVersion,
    sourceModelBinding: structuredClone(sourceBinding),
    activeModelBinding: structuredClone(targetBinding),
    candidateTargetProfileSha256: sha256(targetProfile),
    rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
    automaticActivationAllowed: false,
    schedulerActivationAllowed: false,
    calibrationEligible: false,
  };
  const planBody = {
    ...activation,
    candidateTargetProfile: structuredClone(targetProfile),
  };
  return Object.freeze({
    ...planBody,
    planSha256: sha256(planBody),
    candidateFullSha256: String.fromCharCode(salt.charCodeAt(0) + 1).repeat(64),
    privatePayloadLogged: false,
  });
}

const integratedH0 = manifest(integratedModelBinding(),
  'rr-20260829110000-210', '2026-08-29T11:00:00.000Z');

const candidateH0 = manifest(candidateModelBinding(),
  'rr-20260829120000-210', '2026-08-29T12:00:00.000Z');

const integratedH0Verification = verification('integrated', integratedModelBinding(), integratedH0);

const candidateH0Verification = verification('candidate-g', candidateModelBinding(), candidateH0);

const rollbackPlan = candidatePlan({
  centralExpectedVersion: 0,
  sourceBinding: integratedModelBinding(),
  datasetId: candidateH0.datasetId,
  productionReferenceAt: candidateH0.productionReferenceAt,
  salt: '1',
});

const rollbackBegin = operationalActivationTransition({
  action: 'begin',
  currentRow: null,
  currentProfileRow: integratedProfileRow,
  expectedVersion: 0,
  plan: rollbackPlan,
  sourceManifest: integratedH0,
  sourceVerification: integratedH0Verification,
  requestedManifest: candidateH0,
  sourceDeploymentId: 'pages-integrated-h0',
  deploymentId: 'run-rollback-h1',
  now,
});

const rollbackPendingRow = Object.freeze({ version: 1, payload: rollbackBegin.document });

const rollbackComplete = operationalActivationTransition({
  action: 'complete',
  currentRow: rollbackPendingRow,
  expectedVersion: 1,
  plan: rollbackPlan,
  publicManifest: candidateH0,
  publicVerification: candidateH0Verification,
  deploymentId: 'pages-candidate-h0',
  now: '2026-08-29T13:01:00.000Z',
});

const candidateActiveRow = Object.freeze({ version: 2, payload: rollbackComplete.document });

const integratedH1 = manifest(integratedModelBinding(),
  'rr-20260829130000-210', '2026-08-29T13:00:00.000Z');

const integratedH1Audit = integratedAudit();

const integratedH1Verification = verification('integrated', integratedModelBinding(), integratedH1);

const returnPlan = prepareIntegratedOperationalReturn({
  currentRow: candidateActiveRow,
  currentProfileRow: candidateProfileRow,
  sourceHead,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  readiness,
  sourceImplementationClosureSha256: defaultImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: RAVSCORE_INTEGRATED_RETURN_POLICY.manualEventName,
  ref: RAVSCORE_INTEGRATED_RETURN_POLICY.mainRef,
  githubSha: sourceHead,
  confirmation: RAVSCORE_INTEGRATED_RETURN_POLICY.confirmation,
});

const returnBegin = operationalIntegratedReturnTransition({
  action: 'return-begin',
  currentRow: candidateActiveRow,
  currentProfileRow: candidateProfileRow,
  expectedVersion: 2,
  plan: returnPlan,
  readiness,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  sourceManifest: candidateH0,
  sourceVerification: candidateH0Verification,
  sourceDeploymentId: 'ignored-current-row-wins',
  deploymentId: 'run-integrated-return-h1',
});

const returnPendingRow = Object.freeze({ version: 3, payload: returnBegin.document });

const returnComplete = operationalIntegratedReturnTransition({
  action: 'return-complete',
  currentRow: returnPendingRow,
  expectedVersion: 3,
  plan: returnPlan,
  readiness,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  publicVerification: integratedH1Verification,
  deploymentId: 'pages-integrated-h1',
});

const integratedActiveRow = Object.freeze({ version: 4, payload: returnComplete.document });

// The complete normal rollback/return constructors above produce this row.
// These are synthetic transport inputs, never hosted activation evidence.
assert.deepEqual(returnComplete.centralTargetProfile, integratedProfile);
const resolved = resolveOperationalRavScoreModel(integratedActiveRow,
  { profileRow: integratedProfileRow, allowPending: true });
assert.equal(resolved.model, 'integrated');
assert.equal(operationalResolvedBindingCurrent(resolved), true);
const centralRows = Object.freeze([
  Object.freeze({ document_key: RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY,
    ...integratedActiveRow }),
  Object.freeze({ document_key: RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY,
    ...integratedProfileRow }),
]);
return { centralRows, integratedProfile, readiness };
}

await test('SOURCE normal route uses genuine current central factory and its issued deadline', async () => {
  const { registerHooks } = await import('node:module');
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const moduleUrl = new URL('./protected-private-production-runtime.mjs', import.meta.url);
  const repositoryUrl = new URL('../', import.meta.url).href;
  const query = 'source-normal-route-test=' + crypto.randomUUID();
  const observation = registerHooks({
    resolve(specifier, context, next) {
      const result = next(specifier, context);
      if (result.url.startsWith(repositoryUrl) && /\.(?:mjs|js)$/.test(new URL(result.url).pathname)) {
        const url = new URL(result.url); url.search = query;
        return { ...result, url: url.href };
      }
      return result;
    },
    load(url, context, next) {
      const result = next(url, context);
      if (url.startsWith(moduleUrl.href + '?')) return { ...result, source: String(result.source)
        + '\nexport { captureSourceDeadlineProcess, issuePrivateSourceJobDeadline, readSourceOperationalRoute, sourceJobDeadlineBrands };\n' };
      return result;
    },
  });
  const normal = await import(moduleUrl.href + '?' + query);
  const metadata = await import(new URL('./weather-source-gate.mjs?' + query, import.meta.url));
  const source = await sourceNormalCurrentFixture();
  const head = execFileSync('git', ['rev-parse', 'HEAD^{commit}'], {
    cwd: PRIVATE_RUNTIME_REPOSITORY_ROOT, encoding: 'utf8',
  }).trim();
  const environment = {
    GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'fixture/repo', GITHUB_RUN_ID: '200',
    GITHUB_RUN_ATTEMPT: '2', GITHUB_SHA: head, GITHUB_REF: 'refs/heads/main',
    RUNNER_NAME: 'source-normal-route-fixture', RUNNER_OS: 'Linux',
    RUNNER_TRACKING_ID: 'synthetic-metadata-only', RAVRADAR_SOURCE_EXTENDED_PROVIDER_BOOTSTRAP: 'false',
    GITHUB_TOKEN: 'synthetic-source-token', SUPABASE_URL: 'https://fixture.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_synthetic_source_fixture',
  };
  const requestKeys = ['INPUT_PRODUCE_WEATHER_HANDOFF', 'INPUT_PRODUCE_WEATHER_HANDOFF_CONFIRMATION',
    'INPUT_RAVSCORE_INTEGRATED_WEATHER_HANDOFF_RUN_ID', 'INPUT_RAVSCORE_CANDIDATE_G_ROLLBACK_MODE',
    'INPUT_RAVSCORE_CANDIDATE_G_ROLLBACK_CONFIRMATION', 'INPUT_RAVSCORE_INTEGRATED_FIRST_CUTOVER',
    'INPUT_RAVSCORE_INTEGRATED_FIRST_CUTOVER_CONFIRMATION', 'INPUT_RAVSCORE_INTEGRATED_RETURN',
    'INPUT_RAVSCORE_INTEGRATED_RETURN_CONFIRMATION', 'INPUT_QUICK_CONFIRMATION', 'INPUT_QUICK_PROGRESS_SOURCE'];
  const prior = new Map([...Object.keys(environment), ...requestKeys].map(key => [key, process.env[key]]));
  for (const key of requestKeys) delete process.env[key];
  Object.assign(process.env, environment);
  const originalFetch = globalThis.fetch;
  const requests = [];
  let centralRows = source.centralRows;
  globalThis.fetch = async (request, options) => {
    const url = String(request); requests.push(url);
    assert.equal(options.redirect === undefined || options.redirect === 'error', true);
    let value;
    if (url === 'https://api.github.com/repos/fixture/repo/actions/runs/200/attempts/2') {
      assert.equal(options.headers.Authorization, 'Bearer synthetic-source-token');
      value = { id: 200, run_attempt: 2, head_sha: head, head_branch: 'main',
        path: '.github/workflows/update-and-deploy.yml', status: 'in_progress', conclusion: null,
        event: 'schedule', repository: { full_name: 'fixture/repo' }, head_repository: { full_name: 'fixture/repo' } };
    } else if (url === 'https://api.github.com/repos/fixture/repo/actions/runs/200/attempts/2/jobs?per_page=100') {
      value = { total_count: 1, jobs: [{ id: 300, run_id: 200, head_sha: head,
        name: SOURCE_GATE_PRODUCERS['.github/workflows/update-and-deploy.yml'].gates[0].job,
        status: 'in_progress', conclusion: null, completed_at: null, runner_id: 400,
        runner_name: environment.RUNNER_NAME, started_at: new Date(Date.now() - 600000).toISOString() }] };
    } else {
      assert.equal(url, 'https://fixture.invalid/rest/v1/admin_documents?select=document_key,payload,version&document_key=in.(ravscore-operational-model-activation,ravscore-profile-selection)');
      assert.equal(options.method ?? 'GET', 'GET');
      assert.equal(options.headers.apikey, environment.SUPABASE_SERVICE_ROLE_KEY);
      value = centralRows;
    }
    return new Response(JSON.stringify(value), { status: 200, headers: { date: new Date().toUTCString() } });
  };
  const issue = async () => normal.issuePrivateSourceJobDeadline(
    normal.captureSourceDeadlineProcess(), metadata.createWeatherGithubMetadataClient());
  try {
    // Use the normal timed transport and the private real issuer, not a caller
    // deadline or completed flag. Clocks are untouched; clock refusal is FAIL.
    const holder = await issue();
    const state = normal.sourceJobDeadlineBrands.get(holder);
    const issuedCutoff = state.deadline;
    const route = await normal.readSourceOperationalRoute(holder);
    assert.equal(route.action, 'integrated');
    assert.equal(route.bindingCurrent, true);
    assert.equal(route.resolved.model, 'integrated');
    assert.deepEqual(route.operationalRow, source.centralRows[0]);
    assert.deepEqual(route.profileRow, source.centralRows[1]);
    assert.strictEqual(state.normalRoute, route);
    assert.ok(state.deadline <= issuedCutoff, 'same issued deadline must not renew');
    assert.equal(state.originalOwner, undefined, 'route does not fabricate B');
    assert.equal(state.normalPrelude, undefined, 'route is not a completed prelude');
    assert.equal(requests.length, 3, 'two timed metadata reads and one atomic central GET');
    await assert.rejects(normal.readSourceOperationalRoute(holder), /SOURCE_NORMAL_ROUTE_ALREADY_SELECTED/);
    assert.equal(requests.length, 3, 'reused holder refuses before another central read');
    const invalid = await issue();
    centralRows = structuredClone(source.centralRows);
    centralRows[1].payload.modelBundleSha256 = '0'.repeat(64);
    await assert.rejects(normal.readSourceOperationalRoute(invalid));
    const invalidState = normal.sourceJobDeadlineBrands.get(invalid);
    assert.equal(invalidState.normalRoute, undefined);
    assert.equal(invalidState.originalOwner, undefined);
    assert.equal(invalidState.normalPrelude, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of prior) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    observation.deregister();
  }
});

await test('SOURCE artifact binding checks actual normal bundle bytes without issuing completion', async () => {
  const { registerHooks } = await import('node:module');
  const moduleUrl = new URL('./protected-private-production-runtime.mjs', import.meta.url);
  const query = 'source-artifact-binding=' + crypto.randomUUID();
  const observation = registerHooks({
    load(url, context, next) {
      const result = next(url, context);
      if (url === moduleUrl.href + '?' + query) return { ...result,
        source: String(result.source) + '\nexport { assertSourceNormalArtifactBinding };\n' };
      return result;
    },
  });
  const normal = await import(moduleUrl.href + '?' + query);
  // Reuse the whole existing normal synthetic bundle factory. Its deliberately
  // minimal conditions are NOT Weather/provider/state/physical-stop evidence.
  const target = (await fs.readFile(new URL('./test-protected-private-production-runtime.mjs',
    import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  const first = target.indexOf('const clone = value =>');
  const setupStart = target.indexOf('\ntry {\n  await fs.mkdir(repository', first);
  const setupEnd = target.indexOf('\n  const baselineContracts =', setupStart);
  assert.ok(first > 0 && setupStart > first && setupEnd > setupStart);
  const context = { fs, os, path, crypto, process, Buffer, PRIVATE_RUNTIME_FILES,
    PRIVATE_RUNTIME_CONTRACT_FILES, ravScoreModelBinding, buildPrivateRuntimeCreateSpec,
    buildPrivateRuntimeExpectation, createPrivateProductionRuntimeBundle };
  const setup = target.slice(setupStart + '\ntry {'.length, setupEnd)
    .replace('await fs.copyFile(source, destination);', 'await fs.writeFile(destination, await fs.readFile(source));');
  const fixture = await Function(...Object.keys(context), 'return (async()=>{\n'
    + target.slice(first, setupStart) + setup
    + '\nreturn { temp, repository, privateRoot, createGeneration }; })()')(...Object.values(context));
  const handles = [];
  const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const inputRows = async spec => {
    const rows = new Map();
    for (const file of spec.files) {
      const handle = await fs.open(file.sourcePath, 'r'); handles.push(handle);
      const stat = await handle.stat({ bigint: true });
      const bytes = await handle.readFile();
      rows.set(file.relativePath, { handle, stat, bytes: bytes.length,
        sha256: hash(bytes), original: bytes });
    }
    return rows;
  };
  const unchanged = async rows => {
    for (const row of rows.values()) {
      assert.equal((await row.handle.stat({ bigint: true })).ino, row.stat.ino);
      const buffer = Buffer.alloc(row.bytes);
      const { bytesRead } = await row.handle.read(buffer, 0, buffer.length, 0);
      assert.equal(bytesRead, row.bytes);
      assert.deepEqual(buffer, row.original);
    }
  };
  try {
    const original = await fixture.createGeneration(0);
    const originalManifest = await fs.readFile(path.join(original.bundlePath, 'manifest.json'));
    const spec = await buildPrivateRuntimeCreateSpec({ repositoryRoot: fixture.repository });
    const rows = await inputRows(spec);
    const nextPath = path.join(fixture.privateRoot, 'source-artifact-binding-next');
    await createPrivateProductionRuntimeBundle({ privateRoot: fixture.privateRoot,
      bundlePath: nextPath, repositoryRoot: fixture.repository, ...spec });
    const verified = await verifyPrivateProductionRuntimeBundle({ privateRoot: fixture.privateRoot,
      bundlePath: nextPath, repositoryRoot: fixture.repository, expected: original.expected,
      now: '2026-08-29T11:05:00.000Z' });
    assert.equal(normal.assertSourceNormalArtifactBinding(spec, rows, verified), undefined);
    // No state/owner/operation can be issued by the comparison's return value.
    assert.equal(Object.hasOwn(verified, 'sourceComplete'), false);
    assert.equal(Object.hasOwn(verified, 'workingOperation'), false);
    await unchanged(rows);
    for (const key of ['generationId', 'datasetId', 'generatedAt', 'productionReferenceAt']) {
      const changed = structuredClone(verified); changed[key] += '-changed';
      assert.throws(() => normal.assertSourceNormalArtifactBinding(spec, rows, changed),
        /ARTIFACT_BUNDLE_CHANGED/);
    }
    const missing = structuredClone(verified); missing.files.pop();
    assert.throws(() => normal.assertSourceNormalArtifactBinding(spec, rows, missing), /ARTIFACT_BUNDLE_CHANGED/);
    const duplicate = structuredClone(verified); duplicate.files[1] = { ...duplicate.files[0] };
    assert.throws(() => normal.assertSourceNormalArtifactBinding(spec, rows, duplicate), /ARTIFACT_INPUT_BYTES_CHANGED/);
    const wrongId = structuredClone(verified); wrongId.files[0].id = 'different-fixed-id';
    assert.throws(() => normal.assertSourceNormalArtifactBinding(spec, rows, wrongId), /ARTIFACT_INPUT_BYTES_CHANGED/);
    const wrongPrivacy = structuredClone(verified); wrongPrivacy.files[0].privacyClass = 'PUBLIC';
    assert.throws(() => normal.assertSourceNormalArtifactBinding(spec, rows, wrongPrivacy), /ARTIFACT_INPUT_BYTES_CHANGED/);
    // A second genuinely built and normally verified bundle may be internally
    // valid yet differ from the retained input. Never treat verify:true as the
    // same-input proof. Atomic replacement preserves the old actual fd bytes.
    const changedFile = spec.files.find(file => file.id === 'dmi-bulk-cache');
    assert.ok(changedFile);
    const replacement = changedFile.sourcePath + '.source-artifact-test';
    await fs.writeFile(replacement, 'different synthetic input\n', { flag: 'wx' });
    let changedFiles = spec.files;
    if (process.platform === 'linux') {
      // Genuine Linux atomic replacement with the ORIGINAL fd still open.
      // Windows does not acquire a false pass by closing that fd first.
      await fs.rename(replacement, changedFile.sourcePath);
      assert.notEqual((await fs.lstat(changedFile.sourcePath, { bigint: true })).ino,
        rows.get(changedFile.relativePath).stat.ino);
    } else {
      // Portable byte-binding negative: copy genuinely DIFFERENT input bytes
      // through the unchanged normal bundle producer. This is not atomic proof.
      changedFiles = spec.files.map(file => file === changedFile
        ? { ...file, sourcePath: replacement } : file);
    }
    const changedPath = path.join(fixture.privateRoot, 'source-artifact-binding-changed');
    await createPrivateProductionRuntimeBundle({ privateRoot: fixture.privateRoot,
      bundlePath: changedPath, repositoryRoot: fixture.repository, ...spec, files: changedFiles });
    const changed = await verifyPrivateProductionRuntimeBundle({ privateRoot: fixture.privateRoot,
      bundlePath: changedPath, repositoryRoot: fixture.repository, expected: original.expected,
      now: '2026-08-29T11:05:00.000Z' });
    assert.equal(changed.verified, true);
    assert.throws(() => normal.assertSourceNormalArtifactBinding(spec, rows, changed), /ARTIFACT_INPUT_BYTES_CHANGED/);
    await unchanged(rows);
    assert.deepEqual(await fs.readFile(path.join(original.bundlePath, 'manifest.json')), originalManifest);
    const oldVerified = await verifyPrivateProductionRuntimeBundle({ privateRoot: fixture.privateRoot,
      bundlePath: original.bundlePath, repositoryRoot: fixture.repository, expected: original.expected,
      now: '2026-08-29T11:05:00.000Z' });
    assert.equal(oldVerified.verified, true);
  } finally {
    for (const handle of handles) if (handle.fd >= 0) await handle.close();
    observation.deregister();
    // Only this factory's own files, after all synchronous/local consumers and
    // actual readers have closed. This is not SOURCE/native owner cleanup.
    assert.ok(fixture.temp.startsWith(path.join(os.tmpdir(), 'ravradar-protected-private-runtime-')));
    await fs.rm(fixture.temp, { recursive: true, force: true });
  }
});

await test('SOURCE fixed successor keeps genuine B paths and same-owner handles', {
  skip: process.platform !== 'linux' ? 'fixed Linux successor destination; not a Windows proof' : false,
}, async () => {
  const { registerHooks } = await import('node:module');
  const { execFileSync } = await import('node:child_process');
  const moduleUrl = new URL('./protected-private-production-runtime.mjs', import.meta.url);
  const repositoryUrl = new URL('../', import.meta.url).href;
  const query = 'source-fixed-successor-test=' + crypto.randomUUID();
  const observation = registerHooks({
    resolve(specifier, context, next) {
      const result = next(specifier, context);
      if (result.url.startsWith(repositoryUrl) && /\.(?:mjs|js)$/.test(new URL(result.url).pathname)) {
        const url = new URL(result.url); url.search = query;
        return { ...result, url: url.href };
      }
      return result;
    },
    load(url, context, next) {
      const result = next(url, context);
      if (url.startsWith(moduleUrl.href + '?')) return { ...result, source: String(result.source)
        + '\nexport { captureSourceDeadlineProcess, issuePrivateSourceJobDeadline, readSourceOperationalRoute, sourceNormalArtifactBundlePath, restoreSourceOriginals, sourceOriginalResultOwners, retainedSourceOriginalOwners };\n' };
      if (new URL(url).protocol === 'file:' && new URL(url).pathname.endsWith('/weather-component-progress-cache.mjs')) {
        return { ...result, source: String(result.source) + '\nexport { retainedSourceProgressOwners };\n' };
      }
      return result;
    },
  });
  const hooks = await import(moduleUrl.href + '?' + query);
  const workflow = await import(new URL('./private-production-runtime-workflow.mjs?' + query, import.meta.url));
  const progress = await import(new URL('./weather-component-progress-cache.mjs?' + query, import.meta.url));
  const bundle = await import(new URL('./private-production-runtime-bundle.mjs?' + query, import.meta.url));
  const metadata = await import(new URL('./weather-source-gate.mjs?' + query, import.meta.url));
  const central = await sourceNormalCurrentFixture();
  const head = execFileSync('git', ['rev-parse', 'HEAD^{commit}'], {
    cwd: PRIVATE_RUNTIME_REPOSITORY_ROOT, encoding: 'utf8',
  }).trim();
  const environment = {
    GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'fixture/repo', GITHUB_RUN_ID: '200',
    GITHUB_RUN_ATTEMPT: '2', GITHUB_SHA: head, GITHUB_REF: 'refs/heads/main',
    RUNNER_NAME: 'source-fixed-successor-fixture', RUNNER_OS: 'Linux',
    RUNNER_TRACKING_ID: 'synthetic-metadata-only', RAVRADAR_SOURCE_EXTENDED_PROVIDER_BOOTSTRAP: 'false',
    GITHUB_TOKEN: 'synthetic-source-token', SUPABASE_URL: 'https://fixture.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_synthetic_source_fixture',
    WEATHER_PROGRESS_ENCRYPTION_KEY: Buffer.alloc(32, 73).toString('base64'),
  };
  const requestKeys = ['INPUT_PRODUCE_WEATHER_HANDOFF', 'INPUT_PRODUCE_WEATHER_HANDOFF_CONFIRMATION',
    'INPUT_RAVSCORE_INTEGRATED_WEATHER_HANDOFF_RUN_ID', 'INPUT_RAVSCORE_CANDIDATE_G_ROLLBACK_MODE',
    'INPUT_RAVSCORE_CANDIDATE_G_ROLLBACK_CONFIRMATION', 'INPUT_RAVSCORE_INTEGRATED_FIRST_CUTOVER',
    'INPUT_RAVSCORE_INTEGRATED_FIRST_CUTOVER_CONFIRMATION', 'INPUT_RAVSCORE_INTEGRATED_RETURN',
    'INPUT_RAVSCORE_INTEGRATED_RETURN_CONFIRMATION', 'INPUT_QUICK_CONFIRMATION', 'INPUT_QUICK_PROGRESS_SOURCE'];
  const prior = new Map([...Object.keys(environment), ...requestKeys].map(key => [key, process.env[key]]));
  for (const key of requestKeys) delete process.env[key];
  Object.assign(process.env, environment);
  const originalFetch = globalThis.fetch;
  let metadataReads = 0;
  globalThis.fetch = async (request, options) => {
    const url = String(request); let value;
    assert.equal(options.redirect === undefined || options.redirect === 'error', true);
    if (url === 'https://api.github.com/repos/fixture/repo/actions/runs/200/attempts/2') {
      assert.equal(options.headers.Authorization, 'Bearer synthetic-source-token'); metadataReads++;
      value = { id: 200, run_attempt: 2, head_sha: head, head_branch: 'main',
        path: '.github/workflows/update-and-deploy.yml', status: 'in_progress', conclusion: null,
        event: 'schedule', repository: { full_name: 'fixture/repo' }, head_repository: { full_name: 'fixture/repo' } };
    } else if (url === 'https://api.github.com/repos/fixture/repo/actions/runs/200/attempts/2/jobs?per_page=100') {
      metadataReads++;
      value = { total_count: 1, jobs: [{ id: 300, run_id: 200, head_sha: head,
        name: SOURCE_GATE_PRODUCERS['.github/workflows/update-and-deploy.yml'].gates[0].job,
        status: 'in_progress', conclusion: null, completed_at: null, runner_id: 400,
        runner_name: environment.RUNNER_NAME, started_at: new Date(Date.now() - 600000).toISOString() }] };
    } else {
      assert.equal(url, 'https://fixture.invalid/rest/v1/admin_documents?select=document_key,payload,version&document_key=in.(ravscore-operational-model-activation,ravscore-profile-selection)');
      assert.equal(options.method ?? 'GET', 'GET');
      assert.equal(options.headers.apikey, environment.SUPABASE_SERVICE_ROLE_KEY);
      value = central.centralRows;
    }
    return new Response(JSON.stringify(value), { status: 200, headers: { date: new Date().toUTCString() } });
  };
  const fixedRoot = '/tmp/ravradar-private-production-runtime';
  let fixedStat = null, fixture = null, firstFailure = null;
  const digest = value => crypto.createHash('sha256').update(value).digest('hex');
  try {
    // Exclusive fixture acquisition, NEVER adoption/removal of an existing root.
    await fs.mkdir(fixedRoot);
    fixedStat = await fs.lstat(fixedRoot, { bigint: true });
    assert.equal(fixedStat.isDirectory() && !fixedStat.isSymbolicLink(), true);
    const target = (await fs.readFile(new URL('./test-protected-private-production-runtime.mjs', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
    const first = target.indexOf('const clone = value =>'), end = target.indexOf('\ntry {\n  await fs.mkdir(repository', first);
    const setupEnd = target.indexOf('\n  const baselineContracts =', end);
    assert.ok(first > 0 && end > first && setupEnd > end);
    const context = { fs, os, path, crypto, process, Buffer, PRIVATE_RUNTIME_FILES, PRIVATE_RUNTIME_CONTRACT_FILES,
      ravScoreModelBinding, buildPrivateRuntimeCreateSpec: workflow.buildPrivateRuntimeCreateSpec,
      buildPrivateRuntimeExpectation: workflow.buildPrivateRuntimeExpectation,
      createPrivateProductionRuntimeBundle: bundle.createPrivateProductionRuntimeBundle };
    const setup = target.slice(end + '\ntry {'.length, setupEnd)
      .replace('await fs.copyFile(source, destination);', 'await fs.writeFile(destination, await fs.readFile(source));');
    fixture = await Function(...Object.keys(context), 'return (async()=>{\n' + target.slice(first, end) + setup
      + '\nreturn { temp, repository, privateRoot, createGeneration, fakeDocuments, fakeStorage }; })()')(...Object.values(context));
    const generation = await fixture.createGeneration(0);
    const documents = fixture.fakeDocuments(), storage = fixture.fakeStorage();
    await hooks.publishProtectedPrivateProductionRuntime({ privateRoot: fixture.privateRoot, bundlePath: generation.bundlePath,
      repositoryRoot: fixture.repository, expected: generation.expected, now: '2026-08-29T11:05:00.000Z', sourceHead: head,
      request: documents.request, storage: storage.client });
    const holder = await hooks.issuePrivateSourceJobDeadline(hooks.captureSourceDeadlineProcess(),
      metadata.createWeatherGithubMetadataClient());
    assert.equal(metadataReads, 2, 'normal timed transport; no clock/deadline replacement');
    assert.equal((await hooks.readSourceOperationalRoute(holder)).action, 'integrated');
    const originalPath = path.join(fixedRoot, 'bundle'), restoredPath = path.join(fixedRoot, 'restored');
    const original = await hooks.restoreSourceOriginals(holder, 'single', {
      privateRoot: fixedRoot, bundlePath: originalPath, repositoryRoot: fixture.repository,
      expected: generation.expected, now: '2026-08-29T11:05:00.000Z', request: documents.request, storage: storage.client });
    const owner = hooks.sourceOriginalResultOwners.get(original);
    assert.ok(owner && owner.holder === holder);
    await bundle.restorePrivateProductionRuntimeBundle({ privateRoot: fixedRoot, bundlePath: originalPath,
      outputPath: restoredPath, repositoryRoot: fixture.repository, expected: generation.expected,
      targetReferenceAt: generation.expected.targetReferenceAt, minimumReferenceAt: generation.expected.minimumReferenceAt,
      minimumGeneratedAt: generation.expected.minimumGeneratedAt, now: '2026-08-29T11:05:00.000Z' });
    assert.equal((await workflow.installSourceOriginalPrivateRuntime(holder, original, {
      restoredRoot: restoredPath, repositoryRoot: fixture.repository })).installed, true);
    const miss = await progress.installSourceOriginalProgress(holder, original);
    assert.equal(miss.status, 'CACHE_MISS'); assert.equal(miss.code, 'SNAPSHOT_ABSENT');
    await hooks.assertSourceOriginalProgress(holder);
    const originalDescriptor = structuredClone(owner.bundles[0].descriptor);
    const originalManifest = await fs.readFile(path.join(originalPath, 'manifest.json'));
    const originalDirectory = await fs.lstat(originalPath, { bigint: true });
    const pinned = [...owner.bundles[0].rows.values()].map(row => ({ row, path: row.path,
      stat: row.stat, sha256: row.sha256, fd: row.handle.fd }));
    assert.throws(() => hooks.sourceNormalArtifactBundlePath({}), /DEADLINE_NOT_ISSUED/);
    const successor = hooks.sourceNormalArtifactBundlePath(holder);
    assert.equal(successor, '/tmp/ravradar-private-production-runtime/bundle-source-successor');
    assert.notEqual(successor, originalPath);
    await assert.rejects(fs.lstat(successor), { code: 'ENOENT' });
    // Real normal spec/create/verify with the same live B owner. This is NOT
    // a fabricated DMI/tail operation, H-close receipt or SOURCE completion.
    const spec = await workflow.buildPrivateRuntimeCreateSpec({ repositoryRoot: fixture.repository });
    await bundle.createPrivateProductionRuntimeBundle({ privateRoot: fixedRoot, bundlePath: successor,
      repositoryRoot: fixture.repository, ...spec });
    const verified = await bundle.verifyPrivateProductionRuntimeBundle({ privateRoot: fixedRoot,
      bundlePath: successor, repositoryRoot: fixture.repository, expected: generation.expected,
      now: '2026-08-29T11:05:00.000Z' });
    assert.equal(verified.fileCount, spec.files.length);
    await assert.rejects(() => bundle.createPrivateProductionRuntimeBundle({ privateRoot: fixedRoot,
      bundlePath: successor, repositoryRoot: fixture.repository, ...spec }), /already exists/);
    await hooks.assertSourceOriginalProgress(holder);
    assert.deepEqual(owner.bundles[0].descriptor, originalDescriptor);
    assert.equal(owner.bundles[0].selected.finalBundle, originalPath);
    assert.deepEqual(await fs.readFile(path.join(originalPath, 'manifest.json')), originalManifest);
    const currentDirectory = await fs.lstat(originalPath, { bigint: true });
    assert.equal(currentDirectory.dev, originalDirectory.dev); assert.equal(currentDirectory.ino, originalDirectory.ino);
    for (const old of pinned) {
      assert.equal(old.row.path, old.path); assert.equal(old.row.stat, old.stat);
      assert.equal(old.row.sha256, old.sha256); assert.equal(old.row.handle.fd, old.fd);
      const held = await old.row.handle.stat({ bigint: true });
      assert.equal(held.dev, old.stat.dev); assert.equal(held.ino, old.stat.ino);
      assert.equal(digest(await fs.readFile(old.path)), old.sha256);
    }
    assert.equal(owner.activeOperation, null); assert.equal(owner.dmiOperation, undefined);
    assert.equal(Object.hasOwn(verified, 'sourceComplete'), false);
    assert.equal(Object.hasOwn(verified, 'uploaded'), false);
    assert.equal(owner.artifact, undefined, 'normal bundle verification is not SOURCE artifact admission');
  } catch (error) { firstFailure = [error]; }
  finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of prior) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    observation.deregister();
    try {
      // Only test-owned resources, after all measurements. Never SOURCE release.
      for (const owner of progress.retainedSourceProgressOwners) {
        for (const row of owner.handles) if (row.handle.fd >= 0) await row.handle.close();
        if (owner.temporary) await owner.temporary.cleanup();
      }
      for (const owner of hooks.retainedSourceOriginalOwners) {
        const rows = new Set([...owner.bundles.flatMap(item => [...item.rows.values()]),
          ...(owner.operationReaders ?? []), ...(owner.workingReaders ?? [])]);
        for (const row of rows) if (row.handle.fd >= 0) await row.handle.close();
      }
      if (fixedStat !== null) {
        const current = await fs.lstat(fixedRoot, { bigint: true });
        assert.equal(current.dev, fixedStat.dev); assert.equal(current.ino, fixedStat.ino);
        assert.equal(current.isDirectory() && !current.isSymbolicLink(), true);
        await fs.rm(fixedRoot, { recursive: true });
      }
      if (fixture) await fs.rm(fixture.temp, { recursive: true });
    } catch (cleanup) { if (firstFailure === null) firstFailure = [cleanup]; }
  }
  if (firstFailure !== null) throw firstFailure[0];
});

await test('SOURCE disposition writer: physical close before normal artifact continuation', async () => {
  const { registerHooks } = await import('node:module');
  const { fstatSync } = await import('node:fs');
  const moduleUrl = new URL('./protected-private-production-runtime.mjs', import.meta.url);
  moduleUrl.search = 'source-disposition-test=' + crypto.randomUUID();
  const observation = registerHooks({
    load(url, context, next) {
      const result = next(url, context);
      if (url === moduleUrl.href) return { ...result, source: String(result.source)
        + '\nexport { writeSourceArtifactDispositionFile };\n' };
      return result;
    },
  });
  const normal = await import(moduleUrl.href);
  const parent = await fs.realpath(os.tmpdir());
  const temp = await fs.mkdtemp(path.join(parent, 'ravradar-source-disposition-'));
  const contents = '{"synthetic":"disposition-only"}\n';
  const rows = [];
  const failures = [];
  const observed = [];
  try {
    for (const mode of ['close-noop', 'normal-close', 'write-null', 'sync-error', 'close-error']) {
      const filename = path.join(temp, mode + '.json');
      const handle = await fs.open(filename, 'wx', 0o600);
      const writer = { handle, fd: handle.fd, closed: false };
      const original = { close: handle.close.bind(handle), writeFile: handle.writeFile.bind(handle), sync: handle.sync.bind(handle) };
      rows.push({ filename, writer, original });
      const first = mode === 'write-null' ? null : Object.freeze({ synthetic: mode });
      let closeCalls = 0, nextConsumer = false, caught = null;
      handle.close = async () => {
        closeCalls++;
        if (mode === 'close-noop') return;
        if (mode === 'close-error') throw first;
        return original.close();
      };
      if (mode === 'write-null') handle.writeFile = async () => { throw first; };
      if (mode === 'sync-error') handle.sync = async () => { throw first; };
      // This is the actual internal writer used by the normal disposition
      // caller. No B/P/S ownership, producer completion or T is fabricated.
      try { await normal.writeSourceArtifactDispositionFile(writer, contents); nextConsumer = true; }
      catch (error) { caught = [error]; }
      let physicallyClosed = false;
      try { fstatSync(writer.fd); }
      catch (error) { assert.equal(error.code, 'EBADF'); physicallyClosed = true; }
      try {
        if (mode === 'normal-close') {
          assert.equal(caught, null); assert.equal(nextConsumer, true);
          assert.equal(writer.closed, true); assert.equal(physicallyClosed, true);
          assert.equal(closeCalls, 1);
        } else {
          assert.ok(caught, mode + ' must refuse before the next artifact consumer');
          assert.equal(nextConsumer, false); assert.equal(writer.closed, false);
          assert.equal(physicallyClosed, false, 'unknown close retains the actual descriptor');
          if (mode === 'close-noop') {
            assert.equal(caught[0].message, 'SOURCE_ORIGINAL_ARTIFACT_DISPOSITION_CLOSE_UNPROVED');
            assert.equal(closeCalls, 1);
          } else {
            assert.equal(caught[0], first, 'preserve the exact first raw exception');
            assert.equal(closeCalls, mode === 'close-error' ? 1 : 0,
              'failed write/sync must not acquire a new cleanup/retry path');
          }
        }
        assert.equal(await fs.readFile(filename, 'utf8'), mode === 'write-null' ? '' : contents);
      } catch (error) { failures.push(error); }
      observed.push({ mode, closeCalls, physicallyClosed, nextConsumer, retained: !physicallyClosed });
    }
  } finally {
    // Test-owned cleanup only, after measuring retained failure descriptors.
    // The production helper neither deletes files nor retries close.
    for (const { filename, writer, original } of rows) {
      if (writer.handle.fd >= 0) {
        const ownedFd = writer.handle.fd;
        await original.close();
        assert.throws(() => fstatSync(ownedFd), error => error.code === 'EBADF');
      }
      await fs.unlink(filename);
    }
    assert.deepEqual(await fs.readdir(temp), []);
    assert.equal(path.dirname(temp), parent);
    await fs.rmdir(temp);
    observation.deregister();
  }
  console.log(JSON.stringify({ dispositionWriterCases: observed, cases: observed.length,
    ownedCleanup: true, realNetwork: 0, fullSourceJob: false, nativeLinux: false }));
  if (failures.length) throw failures[0];
});

await test('SOURCE private final owner: exact init operands, real file closure and genuine non-admission', async () => {
  const { registerHooks } = await import('node:module');
  const { execFileSync } = await import('node:child_process');
  const { fstatSync } = await import('node:fs');
  const source = (await fs.readFile(new URL('./protected-private-production-runtime.mjs', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
  const start = source.indexOf('async function beginSourceNormalProducerSession(holder) {');
  const end = source.indexOf('\nasync function runSourceDmiCohort(', start);
  const constructor = source.slice(start, end);
  assert.ok(start > 0 && end > start);
  // SOURCE-ONLY: these are the actual sole constructor and actual downstream
  // exact-null operands. No Linux producer/admission is simulated on Windows.
  assert.match(constructor, /firstNormalFailure: null, finalSaveFailure: null/);
  assert.equal((source.match(/sourceDmiCohorts\.set\(operation, state\)/g) ?? []).length, 1);
  for (const name of ['stageSourceNormalArtifact', 'publishSourceNormalArtifact']) {
    const at = source.indexOf('async function ' + name + '(');
    const next = source.indexOf('\nasync function ', at + 1);
    const body = source.slice(at, next);
    assert.match(body, /state\.firstNormalFailure !== null/);
    assert.match(body, /state\.finalSaveFailure !== null/);
  }
  assert.match(source, /await publishSourceNormalArtifact\(holder, operation\);\n  return finalizeSourceNormalOwner\(holder, operation\);/);
  const moduleUrl = new URL('./protected-private-production-runtime.mjs', import.meta.url);
  const repositoryUrl = new URL('../', import.meta.url).href;
  const query = 'source-final-owner-test=' + crypto.randomUUID();
  const observation = registerHooks({
    resolve(specifier, context, next) {
      const result = next(specifier, context);
      if (result.url.startsWith(repositoryUrl) && /\.(?:mjs|js)$/.test(new URL(result.url).pathname)) {
        const url = new URL(result.url); url.search = query; return { ...result, url: url.href };
      }
      return result;
    },
    load(url, context, next) {
      const result = next(url, context);
      if (url.startsWith(moduleUrl.href + '?')) return { ...result, source: String(result.source)
        + '\nexport { captureSourceDeadlineProcess, issuePrivateSourceJobDeadline, restoreSourceOriginals, sourceOriginalResultOwners, retainedSourceOriginalOwners, finalizeSourceNormalOwner, sourceFinalDistinctReaderRows, closeSourceFinalReader, sourceFinalOwnedCatalog, removeSourceFinalOwnedCatalog };\n' };
      return result;
    },
  });
  const hooks = await import(moduleUrl.href + '?' + query);
  const head = execFileSync('git', ['rev-parse', 'HEAD^{commit}'], { cwd: PRIVATE_RUNTIME_REPOSITORY_ROOT, encoding: 'utf8' }).trim();
  const environment = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'fixture/repo',
    GITHUB_RUN_ID: '200', GITHUB_RUN_ATTEMPT: '2', GITHUB_SHA: head, GITHUB_REF: 'refs/heads/main',
    RUNNER_NAME: 'source-final-owner-fixture', RUNNER_OS: 'Linux', RUNNER_TRACKING_ID: 'synthetic-marker',
    RAVRADAR_SOURCE_EXTENDED_PROVIDER_BOOTSTRAP: 'false' };
  const prior = new Map(Object.keys(environment).map(key => [key, process.env[key]]));
  Object.assign(process.env, environment);
  const realNow = Date.now, wallStart = Date.now(), monoStart = performance.now();
  Date.now = () => wallStart + Math.floor(performance.now() - monoStart);
  const sample = () => { const monoBefore = performance.now(), wall = Date.now(), monoAfter = performance.now(); return { monoBefore, wall, monoAfter }; };
  async function holder() {
    const identity = hooks.captureSourceDeadlineProcess(); let calls = 0;
    const run = { id: 200, run_attempt: 2, head_sha: head, head_branch: 'main', path: '.github/workflows/update-and-deploy.yml',
      status: 'in_progress', conclusion: null, event: 'schedule', repository: { full_name: 'fixture/repo' }, head_repository: { full_name: 'fixture/repo' } };
    const value = await hooks.issuePrivateSourceJobDeadline(identity, { async readJsonWithTiming(route) {
      const before = sample(); calls++;
      assert.equal(route, '/repos/fixture/repo/actions/runs/200/attempts/2' + (calls === 2 ? '/jobs?per_page=100' : ''));
      const json = calls === 1 ? run : { total_count: 1, jobs: [{ id: 300, run_id: 200, head_sha: head,
        name: SOURCE_GATE_PRODUCERS[run.path].gates[0].job, status: 'in_progress', conclusion: null, completed_at: null,
        runner_id: 400, runner_name: environment.RUNNER_NAME, started_at: new Date(before.wall - 600000).toISOString() }] };
      return { before, after: sample(), serverDate: new Date(before.wall).toUTCString(), hasNextPage: false, json };
    } });
    assert.equal(calls, 2); return value;
  }
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-source19-final-owner-kernel-'));
  const root = await fs.realpath(temporary), opened = [];
  const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  async function row(name) {
    const file = path.join(root, name), body = Buffer.from('synthetic-owner-close-only\n');
    await fs.writeFile(file, body, { flag: 'wx', mode: 0o600 });
    const handle = await fs.open(file, 'r'); opened.push(handle);
    return { handle, path: file, stat: await handle.stat({ bigint: true }), bytes: body.length, sha256: digest(body) };
  }
  const journal = () => ({ fd: null, closeAttempted: false, closed: false, firstFailure: null });
  const storage = Object.fromEntries(['ensurePrivateBucket', 'uploadImmutable', 'download', 'removeExact', 'anonymousStatus']
    .map(key => [key, async () => { throw new Error('UNEXPECTED_STORAGE'); }]));
  const options = request => ({ privateRoot: root, bundlePath: path.join(root, 'absent-b'), repositoryRoot: PRIVATE_RUNTIME_REPOSITORY_ROOT,
    expected: {}, now: '2026-10-16T12:00:00.000Z', storage, request });
  try {
    const first = await row('one.bin'), fd = first.handle.fd;
    const distinct = hooks.sourceFinalDistinctReaderRows([first, { ...first }]);
    assert.deepEqual(distinct, [first], 'dedup by the actual FileHandle, never a numeric fd');
    assert.throws(() => hooks.sourceFinalDistinctReaderRows([first, { ...first, sha256: '0'.repeat(64) }]), /FINAL_READER_IDENTITY_CONFLICT/);
    const firstJournal = journal(); await hooks.closeSourceFinalReader(first, firstJournal);
    assert.equal(firstJournal.closed, true); assert.throws(() => fstatSync(fd), error => error.code === 'EBADF');
    await assert.rejects(hooks.closeSourceFinalReader(first, firstJournal), /FINAL_READER_CLOSE_REUSED/);
    const noOp = await row('noop.bin'), noOpClose = noOp.handle.close.bind(noOp.handle); let noOpCalls = 0;
    noOp.handle.close = async () => { noOpCalls++; }; const noOpJournal = journal();
    try {
      await assert.rejects(hooks.closeSourceFinalReader(noOp, noOpJournal), /FINAL_READER_CLOSE_UNPROVED/);
      assert.equal(noOpCalls, 1); assert.equal(fstatSync(noOp.handle.fd).isFile(), true);
      const original = noOpJournal.firstFailure[0];
      await assert.rejects(hooks.closeSourceFinalReader(noOp, noOpJournal), error => error === original);
      assert.equal(noOpCalls, 1);
    } finally { noOp.handle.close = noOpClose; await noOpClose(); }
    const raw = await row('null.bin'), rawClose = raw.handle.close.bind(raw.handle); let rawCalls = 0;
    raw.handle.close = async () => { rawCalls++; await rawClose(); throw null; };
    const rawJournal = journal();
    await assert.rejects(hooks.closeSourceFinalReader(raw, rawJournal), error => error === null);
    assert.equal(rawJournal.closed, true); assert.deepEqual(rawJournal.firstFailure, [null]);
    await assert.rejects(hooks.closeSourceFinalReader(raw, rawJournal), error => error === null);
    assert.equal(rawCalls, 1);
    const cleanupRoot = path.join(root, 'catalog'); await fs.mkdir(cleanupRoot);
    const known = path.join(cleanupRoot, 'inventory.json'); await fs.writeFile(known, '{}\n', { flag: 'wx' });
    const knownRow = { path: known, stat: await fs.lstat(known, { bigint: true }), bytes: 3, sha256: digest('{}\n') };
    const born = await fs.lstat(cleanupRoot, { bigint: true });
    await fs.writeFile(path.join(cleanupRoot, 'unknown'), 'not-owned\n', { flag: 'wx' });
    await assert.rejects(hooks.sourceFinalOwnedCatalog(cleanupRoot, born, [knownRow]), /FINAL_CLEANUP_UNKNOWN_ENTRY/);
    assert.equal((await fs.readdir(cleanupRoot)).length, 2);
    await fs.unlink(path.join(cleanupRoot, 'unknown'));
    const catalog = await hooks.sourceFinalOwnedCatalog(cleanupRoot, born, [knownRow]);
    await hooks.removeSourceFinalOwnedCatalog(catalog); assert.equal(catalog.completed, true);
    await assert.rejects(fs.lstat(cleanupRoot), error => error.code === 'ENOENT');
    const issued = await holder(); let reads = 0;
    const absent = await hooks.restoreSourceOriginals(issued, 'single', options(async () => { reads++; return []; }));
    assert.equal(absent.restored, false); assert.equal(reads, 1);
    const owner = hooks.sourceOriginalResultOwners.get(absent);
    await assert.rejects(hooks.finalizeSourceNormalOwner(issued, absent), /DMI_WORKING_OPERATION_REQUIRED/);
    const original = owner.firstFailure[0];
    assert.equal(owner.phase, 'RETAINED'); assert.equal(owner.finalOwnerRelease.phase, 'RETAINED');
    assert.equal(hooks.retainedSourceOriginalOwners.has(owner), true);
    assert.deepEqual(owner.finalOwnerRelease.closedReaders, []);
    await assert.rejects(hooks.finalizeSourceNormalOwner(issued, absent), error => error === original);
    const rawHolder = await holder();
    // The normal pointer client intentionally wraps request errors. Inject the
    // raw local first error before that wrapper, in actual storage validation.
    const rawStorage = Object.defineProperty({ ...storage }, 'ensurePrivateBucket', { get() { throw null; } });
    await assert.rejects(hooks.restoreSourceOriginals(rawHolder, 'single',
      { ...options(async () => { throw new Error('UNEXPECTED_POINTER'); }), storage: rawStorage }), error => error === null);
    const rawOwner = [...hooks.retainedSourceOriginalOwners].find(value => value.holder === rawHolder);
    assert.deepEqual(rawOwner.firstFailure, [null]);
    await assert.rejects(hooks.finalizeSourceNormalOwner(rawHolder, absent), error => error === null);
    assert.equal(hooks.retainedSourceOriginalOwners.has(rawOwner), true);
    console.log(JSON.stringify({ finalOwnerKernel: 'PASS', exactConstructorNullGate: 'SOURCE_ONLY_PASS',
      actualFileHandleDedup: true, physicalEBADF: true, noOpCloseRetained: true, firstRawNullRetained: true,
      exactCatalogOnly: true, genuineMissingBRetained: true, fabricatedHolder: false, fabricatedHostedAck: false,
      completedPublication: 'UNRUN', cpKernelEchild: 'UNRUN', sourceAdmission: false, realNetwork: 0 }));
  } finally {
    for (const handle of opened) if (handle.fd >= 0) await handle.close();
    for (const [key, value] of prior) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    Date.now = realNow; observation.deregister();
    assert.equal(path.dirname(root), await fs.realpath(os.tmpdir()));
    assert.match(path.basename(root), /^rr-source19-final-owner-kernel-/);
    await fs.rm(root, { recursive: true, force: false }); // Fixture-only own temporary root.
  }
});
