import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import {
  PRIVATE_RUNTIME_CAPACITY_POLICY,
  PRIVATE_RUNTIME_CONTRACT_FILES,
  PRIVATE_RUNTIME_FILES,
  buildPrivateRuntimeCreateSpec,
  buildPrivateRuntimeExpectation,
  buildPrivateRuntimeIncrementalSizeDryRun,
  buildPrivateRuntimeIncrementalSizeProjection,
  buildPrivateRuntimePreflightState,
  installRestoredPrivateRuntime,
  materializePrivateRuntimePreflight,
  privateRuntimeContractHashes,
  validatePrivateRuntimePreflightState,
} from './private-production-runtime-workflow.mjs';

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-private-workflow-'));
const repository = path.join(temp, 'repository');
const restored = path.join(temp, 'private', 'restored');
const sourceRepository = path.resolve('.');

try {
  await fs.mkdir(repository, { recursive: true });
  const contractFiles = [...new Set(Object.values(PRIVATE_RUNTIME_CONTRACT_FILES).flat())];
  for (const relative of contractFiles) {
    const destination = path.join(repository, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(path.join(sourceRepository, relative), destination);
  }

  const zones = Object.fromEntries(Array.from({ length: 210 }, (_, index) => [`z-${index}`, {}]));
  const parts = Object.fromEntries(Array.from({ length: 673 }, (_, index) => [`p-${index}`, {}]));
  const conditions = {
    datasetId: 'rr-synthetic-private-workflow',
    generatedAt: '2026-08-29T10:05:00.000Z',
    productionReferenceAt: '2026-08-29T10:00:00.000Z',
    zones,
    coastalParts: { modelBinding: ravScoreModelBinding(), parts },
  };
  for (const descriptor of PRIVATE_RUNTIME_FILES) {
    const destination = path.join(repository, descriptor.relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    let value = `synthetic-${descriptor.id}\n`;
    if (descriptor.id === 'full-conditions') value = `${JSON.stringify(conditions)}\n`;
    if (descriptor.id === 'dmi-bulk-cache') value = `${JSON.stringify({
      schemaVersion: 2,
      refreshStatus: 'complete',
      runs: {
        dkss_idw: { referenceTime: '2026-08-29T06:00:00.000Z' },
        wam_dw: { referenceTime: '2026-08-29T06:00:00.000Z' },
      },
    })}\n`;
    if (descriptor.id === 'runtime-diagnostics') value = `${JSON.stringify({
      acquisition: {
        prioritizedMissingOrExpiringZones: 0,
        bulkModelDownloads: { refreshStatus: 'complete' },
      },
      dataQuality: { forecast: { completeDmiZones: 210 } },
      health: { dmi: { totalZones: 210 } },
      duplicateTimes: { zones: 0 },
    })}\n`;
    await fs.writeFile(destination, value);
  }
  await fs.mkdir(path.join(repository, 'data', 'diagnostics'), { recursive: true });
  await fs.writeFile(
    path.join(repository, 'data', 'diagnostics', 'dmi-ocean-diagnostics.json'),
    `${JSON.stringify({
      schemaVersion: 1,
      generatedAt: conditions.generatedAt,
      refreshStatus: 'complete',
    })}\n`,
  );

  const hashes = await privateRuntimeContractHashes({ repositoryRoot: repository });
  assert.deepEqual(Object.keys(hashes).sort(), [
    'continuationStateContractSha256',
    'fullRuntimeContractSha256',
    'publicProjectionContractSha256',
  ]);
  assert.ok(Object.values(hashes).every(value => /^[a-f0-9]{64}$/.test(value)));

  for (const [contract, relativePaths] of Object.entries(PRIVATE_RUNTIME_CONTRACT_FILES)) {
    for (const relativePath of relativePaths) {
      const absolute = path.join(repository, relativePath);
      const original = await fs.readFile(absolute);
      await fs.writeFile(absolute, Buffer.concat([original, Buffer.from('\n')]));
      const drifted = await privateRuntimeContractHashes({ repositoryRoot: repository });
      assert.notEqual(
        drifted[contract],
        hashes[contract],
        `${contract} drift in ${relativePath} must invalidate the private bundle contract`,
      );
      await fs.writeFile(absolute, original);
    }
  }

  const spec = await buildPrivateRuntimeCreateSpec({ repositoryRoot: repository });
  assert.equal(spec.metadata.zoneCount, 210);
  assert.equal(spec.metadata.partCount, 673);
  assert.deepEqual(spec.metadata.modelBinding, ravScoreModelBinding());
  assert.equal(spec.files.length, PRIVATE_RUNTIME_FILES.length);

  const expected = await buildPrivateRuntimeExpectation({
    repositoryRoot: repository,
    targetReferenceAt: '2026-08-29T11:00:00Z',
    now: '2026-08-29T11:05:00Z',
  });
  assert.equal(expected.targetReferenceAt, '2026-08-29T11:00:00.000Z');
  assert.equal(expected.minimumReferenceAt, '2026-08-26T11:00:00.000Z');
  assert.deepEqual(expected.contractHashes, hashes);

  const preflightState = await buildPrivateRuntimePreflightState({
    repositoryRoot: repository,
  });
  assert.match(preflightState.stateSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(preflightState.dmiRuns, {
    dkss_idw: '2026-08-29T06:00:00.000Z',
    wam_dw: '2026-08-29T06:00:00.000Z',
  });
  assert.equal(preflightState.completeDmiZones, 210);
  assert.equal(preflightState.totalZones, 210);
  assert.equal(JSON.stringify(preflightState).includes('coordinates'), false);
  assert.equal(JSON.stringify(preflightState).includes('currentUMps'), false);

  const capacityRoot = path.join(temp, 'private', 'capacity');
  const capacityBundle = path.join(capacityRoot, 'bundle');
  const capacityCheckpoint = path.join(
    repository,
    '.cache',
    'ravscore-continuation-checkpoint',
    'checkpoint.json',
  );
  const checkpointText = '{"synthetic":"aggregate-size-only"}\n';
  await fs.mkdir(path.dirname(capacityCheckpoint), { recursive: true });
  await fs.writeFile(capacityCheckpoint, checkpointText);
  await fs.mkdir(capacityRoot, { recursive: true });
  assert.equal(PRIVATE_RUNTIME_CAPACITY_POLICY.reservePercent, 30);
  assert.equal(PRIVATE_RUNTIME_CAPACITY_POLICY.usableBudgetPercent, 70);
  assert.equal(PRIVATE_RUNTIME_CAPACITY_POLICY.conservativeMonthDays, 31);
  assert.equal(PRIVATE_RUNTIME_CAPACITY_POLICY.scheduledFullBuildsPerDay, 60);
  assert.equal(PRIVATE_RUNTIME_CAPACITY_POLICY.scheduledFullBuildsPerMonth, 1_860);
  assert.equal(PRIVATE_RUNTIME_CAPACITY_POLICY.normalObjectReadsPerFullBuild, 2);
  assert.equal(PRIVATE_RUNTIME_CAPACITY_POLICY.rollbackObjectReadsPerFullBuild, 3);
  assert.equal(PRIVATE_RUNTIME_CAPACITY_POLICY.retainedObjectGenerations, 2);
  assert.equal(
    PRIVATE_RUNTIME_CAPACITY_POLICY.monthlyUncachedEgressQuotaBytes,
    5_000_000_000,
  );
  assert.equal(PRIVATE_RUNTIME_CAPACITY_POLICY.storageQuotaBytes, 1_000_000_000);
  assert.equal(PRIVATE_RUNTIME_CAPACITY_POLICY.databaseSizeQuotaBytes, 500_000_000);
  assert.equal(PRIVATE_RUNTIME_CAPACITY_POLICY.checkpointMaximumSerializedBytes, 16 * 1024 * 1024);
  assert.equal(PRIVATE_RUNTIME_CAPACITY_POLICY.checkpointRpcMetadataResponsesPerFullBuild, 2);
  assert.equal(PRIVATE_RUNTIME_CAPACITY_POLICY.checkpointRpcMetadataBytesPerResponse, 4 * 1024);
  assert.equal(
    PRIVATE_RUNTIME_CAPACITY_POLICY.checkpointFullRestoreEnvelopeBytesPerRead,
    4 * 1024,
  );
  assert.equal(PRIVATE_RUNTIME_CAPACITY_POLICY.checkpointBindingRestoresPerMonth, 60);
  assert.deepEqual(
    PRIVATE_RUNTIME_CAPACITY_POLICY.checkpointRestoreScenariosPerMonth,
    [1, 31, 60, 1_860],
  );
  assert.equal(
    PRIVATE_RUNTIME_CAPACITY_POLICY.scheduledFullBuildsPerDay
      * PRIVATE_RUNTIME_CAPACITY_POLICY.conservativeMonthDays,
    PRIVATE_RUNTIME_CAPACITY_POLICY.scheduledFullBuildsPerMonth,
  );
  const capacity = await buildPrivateRuntimeIncrementalSizeDryRun({
    privateRoot: capacityRoot,
    bundlePath: capacityBundle,
    repositoryRoot: repository,
    sourceHead: 'a'.repeat(40),
    now: conditions.generatedAt,
  });
  assert.equal('status' in capacity, false,
    'an offline size dry-run must never expose a final capacity-passed status');
  assert.equal(
    capacity.kind,
    'RAVRADAR_PRIVATE_RUNTIME_INCREMENTAL_SIZE_DRY_RUN',
  );
  assert.equal(capacity.incrementalGate.scope, 'INCREMENTAL_PRIVATE_RUNTIME_ONLY');
  assert.equal(capacity.incrementalGate.status, 'WITHIN_INCREMENTAL_SIZE_BOUNDS');
  assert.equal(capacity.incrementalGate.fullCutoverCapacityEvaluated, false);
  assert.equal(capacity.measurements.rawPayloadBytes > 0, true);
  assert.equal(capacity.measurements.archiveObjectBytes > 0, true);
  assert.equal(capacity.measurements.checkpointAvailable, true);
  assert.equal(
    capacity.measurements.checkpointSerializedBytes,
    Buffer.byteLength(checkpointText),
  );
  assert.equal(capacity.measurements.checkpointDisposition, 'CHECKPOINT_SIZE_MEASURED');
  assert.equal(capacity.measurements.checkpointAbsenceAttestedByRuntimeAudit, false);
  const archiveObjectBytes = capacity.measurements.archiveObjectBytes;
  assert.equal(
    capacity.egress.normalPerFullBuildBytes,
    archiveObjectBytes * 2,
  );
  assert.equal(
    capacity.egress.rollbackPerFullBuildBytes,
    archiveObjectBytes * 3,
  );
  assert.equal(capacity.egress.reservePercent, 30);
  assert.equal(capacity.egress.usableBudgetPercent, 70);
  assert.equal(capacity.egress.usableBudgetBytes, 3_500_000_000);
  assert.equal(capacity.egress.conservativeMonthDays, 31);
  assert.equal(capacity.egress.scheduledFullBuildsPerDay, 60);
  assert.equal(capacity.egress.scheduledFullBuildsPerMonth, 1_860);
  assert.equal(capacity.egress.normalObjectReadsPerFullBuild, 2);
  assert.equal(capacity.egress.rollbackObjectReadsPerFullBuild, 3);
  assert.equal(
    capacity.egress.projectedMonthlyNormalBytes,
    archiveObjectBytes * 2 * 1_860,
  );
  assert.equal(
    capacity.egress.projectedMonthlyRollbackBytes,
    archiveObjectBytes * 3 * 1_860,
  );
  assert.equal(capacity.storage.reservePercent, 30);
  assert.equal(capacity.storage.usableBudgetPercent, 70);
  assert.equal(capacity.storage.usableBudgetBytes, 700_000_000);
  assert.equal(capacity.storage.retainedObjectGenerations, 2);
  assert.equal(capacity.storage.retainedStorageBytes, archiveObjectBytes * 2);
  assert.equal(capacity.database.usableBudgetBytes, 350_000_000);
  assert.equal(capacity.database.checkpointProjectionBasis, 'MEASURED_SERIALIZED_BYTES');
  assert.equal(capacity.database.projectedCheckpointBytes, Buffer.byteLength(checkpointText));
  assert.equal(capacity.database.withinIncrementalBound, true);
  assert.equal(capacity.database.currentDatabaseSizeIncluded, false);
  assert.equal(
    capacity.checkpointDatabaseEgress.projectedCheckpointBytes,
    Buffer.byteLength(checkpointText),
  );
  assert.equal(capacity.checkpointDatabaseEgress.rpcMetadataResponsesPerFullBuild, 2);
  assert.equal(capacity.checkpointDatabaseEgress.rpcMetadataBytesPerResponse, 4 * 1024);
  assert.equal(capacity.checkpointDatabaseEgress.rpcMetadataPerFullBuildBytes, 8 * 1024);
  assert.equal(
    capacity.checkpointDatabaseEgress.projectedMonthlyRpcMetadataBytes,
    8 * 1024 * 1_860,
  );
  assert.deepEqual(
    capacity.checkpointDatabaseEgress.restoreScenarios.map(
      scenario => [scenario.restoresPerMonth, scenario.role],
    ),
    [
      [1, 'INFORMATIONAL_SCENARIO'],
      [31, 'INFORMATIONAL_SCENARIO'],
      [60, 'BINDING_PLANNING_LIMIT'],
      [1_860, 'NON_BINDING_ALL_BUILD_STRESS'],
    ],
  );
  assert.deepEqual(capacity.cutoverGate, {
    status: 'BLOCKED_PENDING_LIVE_BEFORE_AFTER_AND_OTHER_EGRESS',
    cutoverEligible: false,
    liveSupabaseBeforeAfterMeasurementRequired: true,
    liveSupabaseBeforeAfterMeasurementIncluded: false,
    otherUnifiedEgressProjectionRequired: true,
    otherUnifiedEgressProjectionIncluded: false,
    liveDatabaseSizeMeasurementRequired: true,
    liveDatabaseSizeMeasurementIncluded: false,
    observedCheckpointRestoreRateRequired: true,
    observedCheckpointRestoreRateIncluded: false,
    checkpointDatabaseEgressIncluded: true,
    checkpointDatabaseStorageIncluded: true,
  });
  assert.equal(capacity.controls.supabaseRequestAttempted, false);
  assert.equal(capacity.controls.privatePayloadArtifactUploaded, false);
  await assert.rejects(fs.lstat(capacityBundle), error => error?.code === 'ENOENT');

  const quotaForUsableBytes = usableBytes => Number(
    (BigInt(usableBytes) * 100n + 69n) / 70n,
  );
  const projectionWithUsableBudgets = ({
    egressUsableBytes,
    storageUsableBytes = 700_000_000,
  }) => buildPrivateRuntimeIncrementalSizeProjection({
    archiveObjectBytes,
    checkpointSerializedBytes: Buffer.byteLength(checkpointText),
    policy: {
      ...PRIVATE_RUNTIME_CAPACITY_POLICY,
      monthlyUncachedEgressQuotaBytes: quotaForUsableBytes(egressUsableBytes),
      storageQuotaBytes: quotaForUsableBytes(storageUsableBytes),
    },
  });
  const normalMonthlyBytes = archiveObjectBytes * 2 * 1_860;
  const rollbackMonthlyBytes = archiveObjectBytes * 3 * 1_860;
  const checkpointMonthlyBytes = 8 * 1024 * 1_860
    + (Buffer.byteLength(checkpointText) + 4 * 1024) * 60;
  const normalCombinedMonthlyBytes = normalMonthlyBytes + checkpointMonthlyBytes;
  const rollbackCombinedMonthlyBytes = rollbackMonthlyBytes + checkpointMonthlyBytes;
  const retainedStorageBytes = archiveObjectBytes * 2;
  const normalBoundary = projectionWithUsableBudgets({
    egressUsableBytes: normalCombinedMonthlyBytes,
  });
  assert.equal(normalBoundary.egress.usableBudgetBytes, normalCombinedMonthlyBytes);
  assert.equal(normalBoundary.egress.normalWithinBudget, true);
  assert.equal(
    normalBoundary.egress.rollbackWithinBudget,
    rollbackMonthlyBytes <= normalCombinedMonthlyBytes,
  );
  assert.equal(normalBoundary.egress.normalWithCheckpointWithinBudget, true);
  assert.equal(normalBoundary.egress.rollbackWithCheckpointWithinBudget, false);
  const normalOneByteOver = projectionWithUsableBudgets({
    egressUsableBytes: normalCombinedMonthlyBytes - 1,
  });
  assert.equal(normalOneByteOver.egress.normalWithCheckpointWithinBudget, false);
  const rollbackBoundary = projectionWithUsableBudgets({
    egressUsableBytes: rollbackCombinedMonthlyBytes,
    storageUsableBytes: retainedStorageBytes,
  });
  assert.equal(rollbackBoundary.egress.usableBudgetBytes, rollbackCombinedMonthlyBytes);
  assert.equal(rollbackBoundary.egress.rollbackWithinBudget, true);
  assert.equal(rollbackBoundary.egress.rollbackWithCheckpointWithinBudget, true);
  assert.equal(rollbackBoundary.storage.usableBudgetBytes, retainedStorageBytes);
  assert.equal(rollbackBoundary.storage.withinBudget, true);
  assert.equal(
    rollbackBoundary.incrementalGate.status,
    'WITHIN_INCREMENTAL_SIZE_BOUNDS',
  );
  const rollbackOneByteOver = projectionWithUsableBudgets({
    egressUsableBytes: rollbackCombinedMonthlyBytes - 1,
    storageUsableBytes: retainedStorageBytes,
  });
  assert.equal(rollbackOneByteOver.egress.rollbackWithCheckpointWithinBudget, false);
  assert.equal(
    rollbackOneByteOver.incrementalGate.status,
    'EXCEEDS_INCREMENTAL_SIZE_BOUNDS',
  );
  const storageOneByteOver = projectionWithUsableBudgets({
    egressUsableBytes: rollbackCombinedMonthlyBytes,
    storageUsableBytes: retainedStorageBytes - 1,
  });
  assert.equal(storageOneByteOver.storage.withinBudget, false);
  assert.equal(
    storageOneByteOver.incrementalGate.status,
    'EXCEEDS_INCREMENTAL_SIZE_BOUNDS',
  );
  const conservativeCheckpointProjection =
    buildPrivateRuntimeIncrementalSizeProjection({ archiveObjectBytes: 1 });
  assert.equal(
    conservativeCheckpointProjection.checkpointDatabaseEgress.checkpointProjectionBasis,
    'POLICY_MAXIMUM_SERIALIZED_BYTES',
  );
  assert.equal(
    conservativeCheckpointProjection.checkpointDatabaseEgress.projectedCheckpointBytes,
    16 * 1024 * 1024,
  );
  const bindingRestore = conservativeCheckpointProjection
    .checkpointDatabaseEgress.restoreScenarios
    .find(scenario => scenario.role === 'BINDING_PLANNING_LIMIT');
  const allBuildStress = conservativeCheckpointProjection
    .checkpointDatabaseEgress.restoreScenarios
    .find(scenario => scenario.role === 'NON_BINDING_ALL_BUILD_STRESS');
  assert.equal(bindingRestore.restoresPerMonth, 60);
  assert.equal(bindingRestore.normalWithinUsableUnifiedEgressBudget, true);
  assert.equal(allBuildStress.restoresPerMonth, 1_860);
  assert.equal(allBuildStress.normalWithinUsableUnifiedEgressBudget, false);
  assert.equal(
    conservativeCheckpointProjection.incrementalGate.status,
    'WITHIN_INCREMENTAL_SIZE_BOUNDS',
    'the explicit 60-restore planning limit is binding; all-build is a visible stress case',
  );
  assert.equal(conservativeCheckpointProjection.cutoverGate.cutoverEligible, false);
  assert.throws(
    () => buildPrivateRuntimeIncrementalSizeProjection({
      archiveObjectBytes: 1,
      checkpointSerializedBytes: 16 * 1024 * 1024 + 1,
    }),
    /checkpoint capacity projection size is invalid/,
  );
  for (const [field, invalidValue] of Object.entries({
    reservePercent: 29,
    usableBudgetPercent: 69,
    conservativeMonthDays: 30,
    scheduledFullBuildsPerDay: 59,
    scheduledFullBuildsPerMonth: 1_859,
    normalObjectReadsPerFullBuild: 1,
    rollbackObjectReadsPerFullBuild: 2,
    retainedObjectGenerations: 1,
    databaseSizeQuotaBytes: 499_999_999,
    checkpointMaximumSerializedBytes: 16 * 1024 * 1024 - 1,
    checkpointRpcMetadataResponsesPerFullBuild: 1,
    checkpointRpcMetadataBytesPerResponse: 4 * 1024 - 1,
    checkpointFullRestoreEnvelopeBytesPerRead: 4 * 1024 - 1,
    checkpointBindingRestoresPerMonth: 59,
    checkpointRestoreScenariosPerMonth: [1, 31, 60],
  })) {
    assert.throws(
      () => buildPrivateRuntimeIncrementalSizeProjection({
        archiveObjectBytes,
        policy: { ...PRIVATE_RUNTIME_CAPACITY_POLICY, [field]: invalidValue },
      }),
      /capacity policy is invalid/,
      'incremental projection must reject drift in ' + field,
    );
  }

  await fs.rm(capacityCheckpoint);
  await assert.rejects(
    buildPrivateRuntimeIncrementalSizeDryRun({
      privateRoot: capacityRoot,
      bundlePath: capacityBundle,
      repositoryRoot: repository,
      sourceHead: 'a'.repeat(40),
      now: conditions.generatedAt,
    }),
    /requires the measured-warmup runtime audit/,
  );
  await assert.rejects(fs.lstat(capacityBundle), error => error?.code === 'ENOENT');
  const capacityRuntimeAudit = path.join(
    repository,
    '.geometry-v2-work',
    'ravscore-integrated-public-runtime-audit.json',
  );
  await fs.mkdir(path.dirname(capacityRuntimeAudit), { recursive: true });
  await fs.writeFile(
    capacityRuntimeAudit,
    JSON.stringify({
      status: 'passed',
      rollback: {
        status: 'BUILDING_MEASURED_ONLY',
        activationReady: false,
      },
    }) + '\n',
  );
  const measuredWarmupCapacity = await buildPrivateRuntimeIncrementalSizeDryRun({
    privateRoot: capacityRoot,
    bundlePath: capacityBundle,
    repositoryRoot: repository,
    sourceHead: 'a'.repeat(40),
    now: conditions.generatedAt,
    runtimeAuditPath: path.relative(repository, capacityRuntimeAudit),
  });
  assert.equal(measuredWarmupCapacity.measurements.checkpointAvailable, false);
  assert.equal(measuredWarmupCapacity.measurements.checkpointSerializedBytes, null);
  assert.equal(
    measuredWarmupCapacity.measurements.checkpointDisposition,
    'NOT_APPLICABLE_DURING_MEASURED_WARMUP',
  );
  assert.equal(
    measuredWarmupCapacity.measurements.checkpointAbsenceAttestedByRuntimeAudit,
    true,
  );
  assert.equal(
    measuredWarmupCapacity.checkpointDatabaseEgress.checkpointProjectionBasis,
    'POLICY_MAXIMUM_SERIALIZED_BYTES',
  );
  assert.equal(
    measuredWarmupCapacity.checkpointDatabaseEgress.projectedCheckpointBytes,
    16 * 1024 * 1024,
  );
  assert.equal(measuredWarmupCapacity.cutoverGate.cutoverEligible, false);
  await fs.writeFile(
    capacityRuntimeAudit,
    JSON.stringify({
      status: 'passed',
      rollback: { status: 'READY', activationReady: true },
    }) + '\n',
  );
  await assert.rejects(
    buildPrivateRuntimeIncrementalSizeDryRun({
      privateRoot: capacityRoot,
      bundlePath: capacityBundle,
      repositoryRoot: repository,
      sourceHead: 'a'.repeat(40),
      now: conditions.generatedAt,
      runtimeAuditPath: path.relative(repository, capacityRuntimeAudit),
    }),
    /lacks the explicit measured-warmup N\/A attestation/,
  );
  await assert.rejects(
    buildPrivateRuntimeIncrementalSizeDryRun({
      privateRoot: capacityRoot,
      bundlePath: repository,
      repositoryRoot: repository,
      sourceHead: 'a'.repeat(40),
      now: conditions.generatedAt,
    }),
    /strict descendant|outside the repository|escapes/,
  );
  assert.equal((await fs.lstat(repository)).isDirectory(), true,
    'rejected capacity paths must never be removed during cleanup');
  const capacityText = JSON.stringify([capacity, measuredWarmupCapacity]);
  for (const forbidden of [
    'datasetId',
    'generationId',
    'sourceHead',
    'coordinates',
    'currentUMps',
    'currentVMps',
  ]) {
    assert.equal(capacityText.includes(forbidden), false,
      `capacity evidence must omit ${forbidden}`);
  }

  const publicManifest = {
    schemaVersion: 4,
    complete: true,
    datasetId: conditions.datasetId,
    generatedAt: conditions.generatedAt,
    productionReferenceAt: conditions.productionReferenceAt,
    zoneCount: 210,
    coastalPartCount: 673,
    ravScoreModelBinding: ravScoreModelBinding(),
  };
  await validatePrivateRuntimePreflightState(preflightState, {
    repositoryRoot: repository,
    publicManifest,
  });
  await assert.rejects(
    validatePrivateRuntimePreflightState(preflightState, {
      repositoryRoot: repository,
      publicManifest: { ...publicManifest, datasetId: 'rr-not-deployed' },
    }),
    /does not attest/,
  );
  await assert.rejects(
    validatePrivateRuntimePreflightState({ ...preflightState, duplicateZones: 1 }, {
      repositoryRoot: repository,
      publicManifest,
    }),
    /state is invalid/,
  );
  await assert.rejects(
    validatePrivateRuntimePreflightState({
      ...preflightState,
      coordinates: [[9.5, 56.2]],
    }, {
      repositoryRoot: repository,
      publicManifest,
    }),
    /incompatible field set/,
  );

  const preflightCache = path.join(repository, '.cache', 'weather-preflight-state');
  const preflightWork = path.join(repository, '.cache', 'weather-preflight-work');
  await fs.mkdir(preflightCache, { recursive: true });
  await fs.writeFile(path.join(preflightCache, 'state.json'), `${JSON.stringify(preflightState)}\n`);
  await fs.writeFile(path.join(preflightCache, 'public-manifest.json'), `${JSON.stringify(publicManifest)}\n`);
  const materialized = await materializePrivateRuntimePreflight({
    repositoryRoot: repository,
    statePath: path.join(preflightCache, 'state.json'),
    publicManifestPath: path.join(preflightCache, 'public-manifest.json'),
    outputRoot: preflightWork,
  });
  assert.deepEqual(materialized, {
    materialized: true,
    fileCount: 4,
    datasetId: conditions.datasetId,
    privatePayloadIncluded: false,
    rawVectorsIncluded: false,
    coordinatesIncluded: false,
  });
  assert.deepEqual(
    JSON.parse(await fs.readFile(path.join(preflightWork, 'data/live/conditions.json'), 'utf8')),
    {
      datasetId: conditions.datasetId,
      generatedAt: conditions.generatedAt,
      productionReferenceAt: conditions.productionReferenceAt,
    },
  );
  const materializedRelativePaths = [
    'data/live/conditions.json',
    'data/live/dmi-bulk-cache.json',
    'data/diagnostics/dmi-ocean-diagnostics.json',
    'data/live/ravradar-runtime-diagnostics.json',
  ].sort();
  const materializedDocuments = [];
  for (const relativePath of materializedRelativePaths) {
    materializedDocuments.push(JSON.parse(await fs.readFile(
      path.join(preflightWork, ...relativePath.split('/')),
      'utf8',
    )));
  }
  const materializedText = JSON.stringify(materializedDocuments);
  for (const forbidden of [
    'coordinates',
    'waterPoint',
    'landPoint',
    'currentUMps',
    'currentVMps',
    'coastalParts',
  ]) {
    assert.equal(materializedText.includes(forbidden), false,
      `materialized preflight must omit ${forbidden}`);
  }
  assert.equal(materializedText.includes('"zones":{'), false,
    'materialized preflight must omit full zone payloads');

  for (const descriptor of PRIVATE_RUNTIME_FILES) {
    const destination = path.join(restored, descriptor.relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, `restored-${descriptor.id}\n`);
  }
  const installed = await installRestoredPrivateRuntime({
    restoredRoot: restored,
    repositoryRoot: repository,
  });
  assert.deepEqual(installed, {
    installed: true,
    fileCount: PRIVATE_RUNTIME_FILES.length,
    privateDataLogged: false,
  });
  assert.equal(
    await fs.readFile(path.join(repository, PRIVATE_RUNTIME_FILES[0].relativePath), 'utf8'),
    `restored-${PRIVATE_RUNTIME_FILES[0].id}\n`,
  );

  const rollbackSource = path.join(temp, 'private', 'rollback-source');
  const beforeFailedInstall = new Map();
  for (const descriptor of PRIVATE_RUNTIME_FILES) {
    const source = path.join(rollbackSource, descriptor.relativePath);
    await fs.mkdir(path.dirname(source), { recursive: true });
    await fs.writeFile(source, `next-${descriptor.id}\n`);
    const destination = path.join(repository, descriptor.relativePath);
    beforeFailedInstall.set(descriptor.relativePath, await fs.readFile(destination));
  }
  let renameCalls = 0;
  await assert.rejects(
    installRestoredPrivateRuntime({
      restoredRoot: rollbackSource,
      repositoryRoot: repository,
      renameImpl: async (...arguments_) => {
        renameCalls += 1;
        if (renameCalls === 4) throw new Error('synthetic mid-install failure');
        return fs.rename(...arguments_);
      },
    }),
    /synthetic mid-install failure/,
  );
  for (const descriptor of PRIVATE_RUNTIME_FILES) {
    assert.deepEqual(
      await fs.readFile(path.join(repository, descriptor.relativePath)),
      beforeFailedInstall.get(descriptor.relativePath),
      `failed install must restore ${descriptor.id} byte-for-byte`,
    );
  }

  await fs.writeFile(path.join(restored, 'unexpected-private.bin'), 'synthetic');
  await assert.rejects(
    installRestoredPrivateRuntime({ restoredRoot: restored, repositoryRoot: repository }),
    /inventory is incompatible/,
  );
  const operationalPreflightWorkflow = await fs.readFile(
    path.join(sourceRepository, '.github/workflows/validate-copernicus-current-pilot.yml'),
    'utf8',
  );
  const capacityStepStart = operationalPreflightWorkflow.indexOf(
    '- name: Measure incremental production-equivalent private runtime size without Supabase',
  );
  const safeEvidenceStepStart = operationalPreflightWorkflow.indexOf(
    '- name: Report only privacy-safe 118-hour evidence',
    capacityStepStart,
  );
  assert.equal(capacityStepStart > 0 && safeEvidenceStepStart > capacityStepStart, true);
  const capacityWorkflowSection = operationalPreflightWorkflow.slice(
    capacityStepStart,
    safeEvidenceStepStart,
  );
  for (const required of [
    'private-production-runtime-workflow.mjs incremental-size-dry-run',
    '--source-head "$GITHUB_SHA"',
    '--runtime-audit "$RAVRADAR_PRIVATE_PREFLIGHT_REPORT"',
    'ravscore-private-runtime-incremental-size-safe.json',
    'Require only conservative incremental private runtime size bounds',
    '$report.kind == "RAVRADAR_PRIVATE_RUNTIME_INCREMENTAL_SIZE_DRY_RUN"',
    '$report.incrementalGate.scope == "INCREMENTAL_PRIVATE_RUNTIME_ONLY"',
    '$report.incrementalGate.status == "WITHIN_INCREMENTAL_SIZE_BOUNDS"',
    '$report.incrementalGate.fullCutoverCapacityEvaluated == false',
    '$report.egress.reservePercent == 30',
    '$report.egress.usableBudgetPercent == 70',
    '$report.egress.conservativeMonthDays == 31',
    '$report.egress.scheduledFullBuildsPerDay == 60',
    '$report.egress.scheduledFullBuildsPerMonth == 1860',
    '$report.egress.normalObjectReadsPerFullBuild == 2',
    '$report.egress.rollbackObjectReadsPerFullBuild == 3',
    '$report.storage.retainedObjectGenerations == 2',
    '$report.database.quotaBytes == 500000000',
    '$report.database.usableBudgetBytes == 350000000',
    '$report.checkpointDatabaseEgress.maximumSerializedBytes == 16777216',
    '$report.egress.monthlyQuotaBytes == 5000000000',
    '$report.storage.quotaBytes == 1000000000',
    '$report.checkpointDatabaseEgress.rpcMetadataResponsesPerFullBuild == 2',
    '$report.checkpointDatabaseEgress.rpcMetadataBytesPerResponse == 4096',
    '$report.checkpointDatabaseEgress.bindingRestoresPerMonth == 60',
    'NON_BINDING_ALL_BUILD_STRESS',
    'NOT_APPLICABLE_DURING_MEASURED_WARMUP',
    'BLOCKED_PENDING_LIVE_BEFORE_AFTER_AND_OTHER_EGRESS',
    '$report.cutoverGate.cutoverEligible == false',
    '$report.cutoverGate.liveSupabaseBeforeAfterMeasurementRequired == true',
    '$report.cutoverGate.otherUnifiedEgressProjectionRequired == true',
    '$report.cutoverGate.liveDatabaseSizeMeasurementRequired == true',
    '$report.cutoverGate.observedCheckpointRestoreRateRequired == true',
    '$report.cutoverGate.checkpointDatabaseEgressIncluded == true',
    '$report.cutoverGate.checkpointDatabaseStorageIncluded == true',
    '$report.controls.supabaseRequestAttempted == false',
    '$report.controls.privatePayloadArtifactUploaded == false',
    'Report only aggregate incremental private runtime size evidence',
    'egress: (.egress | {',
    'storage: (.storage | {',
    'database,',
    'checkpointDatabaseEgress,',
    'projectedMonthlyNormalBytes',
    'projectedMonthlyRollbackBytes',
    'Live Supabase egress/database before-and-after measurements',
    'all other unified egress remain mandatory before cutover',
  ]) {
    assert.equal(capacityWorkflowSection.includes(required), true,
      `operational capacity preflight must include ${required}`);
  }
  for (const forbidden of [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'actions/upload-artifact',
    'Require conservative Supabase runtime capacity before cutover',
    'Report only aggregate Supabase capacity evidence',
    'ravscore-private-runtime-capacity-safe.json',
    'private-production-runtime-workflow.mjs capacity-dry-run',
    '.status == "passed"',
    'fullCutoverCapacityEvaluated == true',
  ]) {
    assert.equal(capacityWorkflowSection.includes(forbidden), false,
      `capacity dry-run must not include ${forbidden}`);
  }
  const safeArtifactSection = operationalPreflightWorkflow.slice(
    operationalPreflightWorkflow.indexOf('- name: Upload only the privacy-safe preflight evidence'),
  );
  assert.equal(
    safeArtifactSection.includes('ravscore-private-runtime-incremental-size-safe.json'),
    false,
    'incremental size metrics must not be uploaded as a GitHub artifact',
  );
  console.log('Private runtime workflow spec, 72-hour expectation and exact allowlisted install pass.');
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
