import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildIntegratedRavScoreStateSeries,
  RAVSCORE_STATE_ONLY_CURRENT_HOLD_CLOSURE_CONTRACT_ID,
} from '../js/core/ravscore-integrated-state-pipeline.js';
import {
  RAVSCORE_COLD_REPLAY_ID,
  RAVSCORE_MIGRATION_ID,
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  RAVSCORE_PROFILE_ID,
  RAVSCORE_RECOVERY_POLICY,
  RAVSCORE_STATE_SCHEMA_VERSION,
  RAVSCORE_VARIANT_ID,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  buildCandidateGDerivedStateSeries,
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import { candidateGStateKey } from './lib/coastal-point-staging-contract.mjs';
import {
  CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
} from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import {
  ravScoreModelBinding as candidateGRollbackModelBinding,
} from './rollback-assets/ravscore-model-contract.js';
import {
  RAVSCORE_CONTINUATION_COMPATIBLE_PREDECESSORS,
  loadRavScoreContinuationCheckpointForTarget,
  RAVSCORE_CONTINUATION_CHECKPOINT_POLICY,
  restoreRavScoreContinuationCheckpoint,
  saveRavScoreContinuationCheckpoint,
} from './ravscore-continuation-checkpoint.mjs';
import {
  RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,
  RAVSCORE_CONTINUATION_IMPLEMENTATION_NORMALIZATION_ID,
  RAVSCORE_CONTINUATION_IMPLEMENTATION_REPOSITORY_ROOT,
  ravScoreContinuationImplementationSha256,
} from './lib/ravscore-continuation-implementation-contract.mjs';

const PART_COUNT = RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount;
const START = Date.parse('2026-08-01T00:00:00.000Z');
const atHour = hour => new Date(START + hour * 3_600_000).toISOString();
const contextFor = partId => `sha256:${crypto.createHash('sha256').update(partId).digest('hex')}`;
const clone = value => JSON.parse(JSON.stringify(value));
const writeJson = (file, value) => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const sha256 = value => crypto.createHash('sha256')
  .update(JSON.stringify(value))
  .digest('hex');

const samples = Array.from({ length: 53 }, (_, hour) => ({
  time: atHour(hour),
  currentSpeedMps: 0.12,
  currentAlignment: 0.75,
  currentVerified: true,
  waveHeightM: 1.2,
  wavePeriodS: 6,
  waveDirectionDeg: 270,
}));
const fixtureSeries = buildIntegratedRavScoreStateSeries(samples, {
  samplingContextKey: contextFor('fixture'),
  onshoreDirectionDeg: 90,
});
const targetStateTemplate = fixtureSeries.rows[48].continuationState;
const checkpointStateTemplate = fixtureSeries.rows[49].continuationState;
const advancedStateTemplate = fixtureSeries.rows[50].continuationState;
const futureStateTemplate = fixtureSeries.rows[52].continuationState;
assert.equal(targetStateTemplate.currentMemoryReady, true);
assert.equal(targetStateTemplate.waveMemoryReady, true);
const regionalAuthorization = {
  sourceClass: 'owner-approved-regional-proxy',
  source: 'dmi-dkss-lf-regional-proxy',
  collection: 'dkss_lf',
  distanceKm: 6.2,
};
const nativeHoldSha256 = `sha256:${'b'.repeat(64)}`;
const nativeHoldStateTemplate = buildIntegratedRavScoreStateSeries([{
  ...samples[48],
  currentProvenance: { status: 'verified', ...regionalAuthorization },
}, {
  time: atHour(49),
  currentSpeedMps: null,
  currentAlignment: null,
  currentVerified: false,
  currentStateOnlyHold: {
    contractId: 'regional-dmi-exact-state-only-hold-v1',
    status: 'verified-derived-state-only',
    classification: 'REGIONAL_DMI_DERIVED_HOLD',
    stateOnly: true,
    partId: 'FIXTURE-REGIONAL',
    parentZoneId: 'FIXTURE-ZONE',
    targetIdentityFingerprint: contextFor('fixture'),
    validTime: atHour(49),
    sourceValidTime: atHour(48),
    holdAgeHours: 1,
    provider: 'dmi',
    sourceClass: regionalAuthorization.sourceClass,
    source: regionalAuthorization.source,
    collection: regionalAuthorization.collection,
    modelRun: atHour(0),
    closureContractId: RAVSCORE_STATE_ONLY_CURRENT_HOLD_CLOSURE_CONTRACT_ID,
    closureId: nativeHoldSha256,
    closureAssignmentSha256: nativeHoldSha256,
    sourceAssetSha256: nativeHoldSha256,
    sourceProofSha256: nativeHoldSha256,
    vectorCommitmentSha256: nativeHoldSha256,
  },
  waveHeightM: 1.2,
  wavePeriodS: 6,
  waveDirectionDeg: 270,
}], {
  samplingContextKey: contextFor('fixture'),
  onshoreDirectionDeg: 90,
  nativeCadenceHoldHours: 3,
}).rows.at(-1).continuationState;
assert.equal(nativeHoldStateTemplate.currentReferenceAt, atHour(48));
assert.notEqual(nativeHoldStateTemplate.currentMemoryStatus, 'READY_NATIVE_HOLD',
  'the regression must cover a real native hold before 48-hour history is ready');

const partIds = Array.from({ length: PART_COUNT }, (_, index) => `part-${String(index + 1).padStart(3, '0')}`);
const partFor = partId => ({
  partId,
  zoneId: 'fixture-zone',
  landPoint: [10, 56],
  waterPoint: [10.01, 56.01],
  onshoreDirectionDeg: 90,
});
const stateFor = (template, partId) => ({
  ...clone(template),
  samplingContextKey: contextFor(partId),
});
const candidateTemplateByReference = new Map();
const candidateStateFor = (partId, productionReferenceAt) => {
  let template = candidateTemplateByReference.get(productionReferenceAt);
  if (!template) {
    const referenceMs = Date.parse(productionReferenceAt);
    const rows = Array.from({ length: 49 }, (_, index) => ({
      time: new Date(referenceMs - (48 - index) * 3_600_000).toISOString(),
      currentSpeedMps: 0.12,
      currentAlignment: 0.75,
      currentVerified: true,
      waveHeightM: 1.2,
      wavePeriodS: 6,
    }));
    template = buildCandidateGDerivedStateSeries(rows, {
      stateKey: candidateGStateKey(partFor('candidate-template')),
    }).continuationState;
    candidateTemplateByReference.set(productionReferenceAt, template);
  }
  return {
    ...clone(template),
    stateKey: candidateGStateKey(partFor(partId)),
  };
};
const partsFor = (template, { reverse = false } = {}) => Object.fromEntries(
  [...partIds]
    .sort((left, right) => reverse ? right.localeCompare(left) : left.localeCompare(right))
    .map(partId => [partId, {
      ...partFor(partId),
      label: `safe-${partId}`,
      ravScoreModel: {
        currentState: stateFor(template, partId),
      },
    }]),
);
const candidateRollbackDescriptorFor = (parts, productionReferenceAt) => ({
  schemaVersion: '1.0.0',
  kind: 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME',
  privacyClass: 'PRIVATE_PRODUCTION_RUNTIME',
  sourceModelBinding: ravScoreModelBinding(),
  rollbackModelBinding: candidateGRollbackModelBinding(),
  rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
  automaticActivationAllowed: false,
  publicDuringNormalOperation: false,
  runtime: {
    modelBinding: candidateGRollbackModelBinding(),
    expectedPartCount: Object.keys(parts).length,
    scoredPartCount: Object.keys(parts).length,
    scoreProfile: {
      modelCoverageReady: true,
      modelMemoryReady: true,
      modelMigrationReady: true,
    },
    parts: Object.fromEntries(Object.keys(parts).map(partId => [partId, {
      ravScoreModel: {
        currentState: candidateStateFor(partId, productionReferenceAt),
      },
    }])),
  },
});
const documentFor = ({
  datasetId,
  productionReferenceAt,
  template,
  reverse = false,
} = {}) => {
  const parts = partsFor(template, { reverse });
  return {
    datasetId,
    productionReferenceAt,
    harmlessSentinel: { preserved: true },
    coastalParts: { parts },
    ravScoreCandidateGRollback:
      candidateRollbackDescriptorFor(parts, productionReferenceAt),
  };
};

function assertNoPrivateCheckpointFields(value) {
  const forbidden = new Set([
    'u',
    'v',
    'umps',
    'vmps',
    'currentumps',
    'currentvmps',
    'waterpoint',
    'coordinates',
    'latitude',
    'longitude',
    'weather',
    'forecast',
    'payload',
    'score',
  ]);
  const visit = current => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!current || typeof current !== 'object') return;
    for (const [key, child] of Object.entries(current)) {
      assert.equal(forbidden.has(key.toLowerCase()), false, `forbidden checkpoint key: ${key}`);
      visit(child);
    }
  };
  visit(value);
}

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ravscore-schema6-checkpoint-'));
const sourcePath = path.join(tempRoot, 'source.json');
const nativeHoldSourcePath = path.join(tempRoot, 'source-native-hold.json');
const alternateSourcePath = path.join(tempRoot, 'source-alternate.json');
const targetPath = path.join(tempRoot, 'target.json');
const checkpointPath = path.join(tempRoot, 'checkpoint.json');
const nativeHoldCheckpointPath = path.join(tempRoot, 'checkpoint-native-hold.json');
const alternateCheckpointPath = path.join(tempRoot, 'checkpoint-alternate.json');
const lineageCheckpointPath = path.join(tempRoot, 'checkpoint-lineage.json');
const boundedCheckpointPath = path.join(tempRoot, 'checkpoint-bounded.json');
const oversizedCheckpointPath = path.join(tempRoot, 'checkpoint-oversized.json');
const predecessorCheckpointPath = path.join(tempRoot, 'checkpoint-predecessor.json');
const invalidPredecessorCheckpointPath =
  path.join(tempRoot, 'checkpoint-predecessor-invalid.json');
const unknownImplementationCheckpointPath =
  path.join(tempRoot, 'checkpoint-unknown-implementation.json');
const missingCheckpointPath = path.join(tempRoot, 'missing', 'checkpoint.json');

const checkpointWithImplementation = (checkpoint, implementationSha256) => {
  const result = clone(checkpoint);
  result.continuationStateContractSha256 = implementationSha256;
  result.generationSha256 = sha256({
    schemaVersion: result.schemaVersion,
    status: result.status,
    datasetId: result.datasetId,
    productionReferenceAt: result.productionReferenceAt,
    modelBinding: result.modelBinding,
    candidateModelBinding: result.candidateGRollbackCompanion.modelBinding,
    continuationStateContractSha256: implementationSha256,
    rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
    partCount: result.partCount,
    stateSha256: result.stateSha256,
    candidateStateSha256: result.candidateGRollbackCompanion.stateSha256,
  });
  result.candidateGRollbackCompanion.generationSha256 =
    result.generationSha256;
  return result;
};

async function assertRestoreRejectsWithoutMutation({
  target,
  checkpoint,
  targetReference = atHour(50),
  message,
}) {
  await writeJson(targetPath, target);
  await writeJson(checkpointPath, checkpoint);
  const before = await fs.readFile(targetPath, 'utf8');
  await assert.rejects(
    restoreRavScoreContinuationCheckpoint({ targetPath, checkpointPath, targetReference }),
    message,
  );
  assert.equal(await fs.readFile(targetPath, 'utf8'), before, 'a rejected restore must be byte-unchanged');
}

try {
  const source = documentFor({
    datasetId: 'rr-schema6-checkpoint-source',
    productionReferenceAt: atHour(49),
    template: checkpointStateTemplate,
    reverse: true,
  });
  await writeJson(sourcePath, source);
  const continuationStateContractSha256 =
    await ravScoreContinuationImplementationSha256();
  const saved = await saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath });
  const nativeHoldSource = clone(source);
  nativeHoldSource.datasetId = 'rr-schema6-native-hold-checkpoint-source';
  nativeHoldSource.coastalParts.parts[partIds[0]].ravScoreModel.currentState =
    stateFor(nativeHoldStateTemplate, partIds[0]);
  await writeJson(nativeHoldSourcePath, nativeHoldSource);
  const nativeHoldSaved = await saveRavScoreContinuationCheckpoint({
    sourcePath: nativeHoldSourcePath, checkpointPath: nativeHoldCheckpointPath,
  });
  assert.equal(nativeHoldSaved.saved, true,
    'a verified regional hold with incomplete history must be checkpointable');
  assert.equal(saved.saved, true);
  assert.equal(saved.datasetId, source.datasetId);
  assert.equal(saved.productionReferenceAt, atHour(49));
  assert.equal(saved.partCount, PART_COUNT);
  assert.equal(saved.candidateGRollbackPartCount, PART_COUNT);
  assert.equal(saved.modelId, RAVSCORE_MODEL_ID);
  assert.equal(saved.stateSchemaVersion, RAVSCORE_STATE_SCHEMA_VERSION);
  assert.equal(saved.modelContractSha256, RAVSCORE_MODEL_CONTRACT_SHA256);
  assert.equal(
    RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumSerializedBytes,
    16 * 1024 * 1024,
  );
  assert.equal(RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumPartIdLength, 100);
  assert.equal(saved.modelBundleSha256, RAVSCORE_MODEL_BUNDLE_SHA256);
  assert.equal(saved.continuationStateContractSha256, continuationStateContractSha256);
  assert.match(saved.generationSha256, /^[0-9a-f]{64}$/);
  assert.match(saved.candidateGRollbackStateSha256, /^[0-9a-f]{64}$/);

  const checkpointText = await fs.readFile(checkpointPath, 'utf8');
  const checkpoint = JSON.parse(checkpointText);
  assert.equal(saved.checkpointSerializedBytes, Buffer.byteLength(checkpointText, 'utf8'));
  await fs.writeFile(boundedCheckpointPath, 'preserve-existing-checkpoint\n');
  const boundedBefore = await fs.readFile(boundedCheckpointPath, 'utf8');
  await assert.rejects(
    saveRavScoreContinuationCheckpoint({
      sourcePath,
      checkpointPath: boundedCheckpointPath,
      maximumSerializedBytes: saved.checkpointSerializedBytes - 1,
    }),
    /serialized limit/,
    'a checkpoint one byte above its configured cap must fail before replacement',
  );
  assert.equal(
    await fs.readFile(boundedCheckpointPath, 'utf8'),
    boundedBefore,
    'an over-cap checkpoint must not overwrite the prior target',
  );
  await fs.writeFile(
    oversizedCheckpointPath,
    Buffer.alloc(RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumSerializedBytes + 1),
  );
  await assert.rejects(
    loadRavScoreContinuationCheckpointForTarget({
      checkpointPath: oversizedCheckpointPath,
      targetReference: atHour(50),
    }),
    /serialized limit/,
    'an oversized protected restore input must fail before JSON parsing',
  );
  assert.equal(checkpoint.schemaVersion, 5);
  assert.equal(checkpoint.status, 'ravscore-schema6-with-measured-candidate-g-continuation');
  assert.equal(
    checkpoint.continuationStateContractSha256,
    continuationStateContractSha256,
  );
  assert.deepEqual(checkpoint.modelBinding, ravScoreModelBinding());
  assert.equal(checkpoint.partCount, PART_COUNT);
  assert.deepEqual(Object.keys(checkpoint.states), [...partIds].sort());
  assert.equal(checkpoint.candidateGRollbackCompanion.generationSha256,
    checkpoint.generationSha256);
  assert.equal(checkpoint.candidateGRollbackCompanion.partCount, PART_COUNT);
  assert.deepEqual(checkpoint.candidateGRollbackCompanion.modelBinding,
    candidateGRollbackModelBinding());
  assert.deepEqual(Object.keys(checkpoint.candidateGRollbackCompanion.states),
    [...partIds].sort());
  assert.equal(checkpoint.privacy.compactDerivedStateOnly, true);
  assert.equal(checkpoint.privacy.weatherIncluded, false);
  assert.equal(checkpoint.privacy.scoresIncluded, false);
  assert.equal(checkpoint.privacy.rawVectorsIncluded, false);
  assert.equal(checkpoint.privacy.coordinatesIncluded, false);
  assert.equal(checkpoint.privacy.privateDataIncluded, false);
  assertNoPrivateCheckpointFields(checkpoint);
  for (const [partId, state] of Object.entries(checkpoint.states)) {
    assert.equal(state.schemaVersion, RAVSCORE_STATE_SCHEMA_VERSION);
    assert.equal(state.modelId, RAVSCORE_MODEL_ID);
    assert.equal(state.variantId, RAVSCORE_VARIANT_ID);
    assert.equal(state.profileId, RAVSCORE_PROFILE_ID);
    const expectedBinding = ravScoreModelBinding();
    for (const [key, expected] of Object.entries(expectedBinding)) {
      const stateKey = key === 'stateSchemaVersion' ? 'schemaVersion' : key;
      assert.equal(state[stateKey], expected, `${partId} state must carry exact ${key}`);
    }
    assert.equal(state.modelContractSha256, RAVSCORE_MODEL_CONTRACT_SHA256);
    assert.equal(state.modelBundleSha256, RAVSCORE_MODEL_BUNDLE_SHA256);
    assert.equal(state.samplingContextKey, contextFor(partId));
  }

  assert.deepEqual(RAVSCORE_CONTINUATION_COMPATIBLE_PREDECESSORS, [{
    sourceVersion: '4.0.429',
    sourceHead: '4bee5b0d0909b56a6f66e0f0e961f51321f9d236',
    implementationSha256:
      '91251f6b38835040250cd5283d2b701aab38bb23f2a4a0014baa1128d59c78f4',
    compatibilityReason: 'MEASURED_WARMUP_CHECKPOINT_STORAGE_SUCCESSOR',
  }, {
    sourceVersion: '4.0.320',
    sourceHead: '7198b685f4bc9d86bd6432b049380f4279ab797c',
    implementationSha256:
      '082a5187f569518c0474590e924ccd17fce760d494a1da4a593de551e440cf91',
    compatibilityReason: 'CHECKPOINT_STORAGE_BOUNDARY_ONLY',
  }]);
  const predecessor = RAVSCORE_CONTINUATION_COMPATIBLE_PREDECESSORS[0];
  const legacyCheckpoint = clone(checkpoint);
  legacyCheckpoint.schemaVersion = 4;
  legacyCheckpoint.status = 'ravscore-schema6-with-candidate-g-rollback-companion';
  legacyCheckpoint.candidateGRollbackCompanion.schemaVersion = 1;
  legacyCheckpoint.candidateGRollbackCompanion.status = 'candidate-g-rollback-ready-companion';
  const predecessorCheckpoint = checkpointWithImplementation(
    legacyCheckpoint,
    predecessor.implementationSha256,
  );
  await writeJson(predecessorCheckpointPath, predecessorCheckpoint);
  const futureRejectedPredecessor =
    await fs.readFile(predecessorCheckpointPath, 'utf8');
  await assert.rejects(
    loadRavScoreContinuationCheckpointForTarget({
      checkpointPath: predecessorCheckpointPath,
      targetReference: atHour(48),
    }),
    /future relative to the bound target/,
    'a compatible predecessor must pass target validation before reattestation',
  );
  assert.equal(
    await fs.readFile(predecessorCheckpointPath, 'utf8'),
    futureRejectedPredecessor,
    'a future predecessor checkpoint must remain byte-unchanged',
  );
  const predecessorLoaded = await loadRavScoreContinuationCheckpointForTarget({
    checkpointPath: predecessorCheckpointPath,
    targetReference: atHour(50),
  });
  assert.equal(predecessorLoaded.loaded, true);
  assert.equal(
    predecessorLoaded.reason,
    'checkpoint-ready-after-compatible-predecessor-reattest',
  );
  assert.equal(
    predecessorLoaded.continuationReattestedFromImplementationSha256,
    predecessor.implementationSha256,
  );
  assert.equal(
    predecessorLoaded.continuationReattestedFromSourceHead,
    predecessor.sourceHead,
  );
  assert.equal(
    predecessorLoaded.continuationStateContractSha256,
    continuationStateContractSha256,
  );
  const reattestedPredecessor = JSON.parse(
    await fs.readFile(predecessorCheckpointPath, 'utf8'),
  );
  assert.equal(
    reattestedPredecessor.continuationStateContractSha256,
    continuationStateContractSha256,
  );
  assert.notEqual(
    reattestedPredecessor.generationSha256,
    predecessorCheckpoint.generationSha256,
  );
  assert.equal(
    reattestedPredecessor.candidateGRollbackCompanion.generationSha256,
    reattestedPredecessor.generationSha256,
  );
  assert.deepEqual(reattestedPredecessor.states, predecessorCheckpoint.states);
  assert.equal(reattestedPredecessor.schemaVersion, 5);
  assert.equal(reattestedPredecessor.candidateGRollbackCompanion.schemaVersion, 2);
  assert.deepEqual(
    reattestedPredecessor.candidateGRollbackCompanion.states,
    predecessorCheckpoint.candidateGRollbackCompanion.states,
  );
  assert.deepEqual(reattestedPredecessor.privacy, predecessorCheckpoint.privacy);
  assertNoPrivateCheckpointFields(reattestedPredecessor);
  const predecessorReloaded = await loadRavScoreContinuationCheckpointForTarget({
    checkpointPath: predecessorCheckpointPath,
    targetReference: atHour(50),
  });
  assert.equal(predecessorReloaded.reason, 'checkpoint-ready');
  assert.equal(
    predecessorReloaded.continuationReattestedFromImplementationSha256,
    null,
  );

  const invalidPredecessorCheckpoint = checkpointWithImplementation(
    checkpoint,
    predecessor.implementationSha256,
  );
  invalidPredecessorCheckpoint.privacy.weatherIncluded = true;
  await writeJson(invalidPredecessorCheckpointPath, invalidPredecessorCheckpoint);
  await assert.rejects(
    loadRavScoreContinuationCheckpointForTarget({
      checkpointPath: invalidPredecessorCheckpointPath,
      targetReference: atHour(50),
    }),
    /privacy declaration is invalid/,
    'a predecessor hash must not bypass current privacy validation',
  );
  assert.equal(
    JSON.parse(await fs.readFile(invalidPredecessorCheckpointPath, 'utf8'))
      .continuationStateContractSha256,
    predecessor.implementationSha256,
    'an invalid predecessor must not be reattested',
  );

  const unknownImplementationCheckpoint = checkpointWithImplementation(
    checkpoint,
    'f'.repeat(64),
  );
  await writeJson(
    unknownImplementationCheckpointPath,
    unknownImplementationCheckpoint,
  );
  await assert.rejects(
    loadRavScoreContinuationCheckpointForTarget({
      checkpointPath: unknownImplementationCheckpointPath,
      targetReference: atHour(50),
    }),
    /continuation implementation is incompatible/,
    'only the one exact predecessor implementation may be reattested',
  );

  const lineagePartId = 'lineage-part';
  const lineageDocument = lineage => {
    const lineagePart = {
      ...partFor(lineagePartId),
      ravScoreModel: {
        currentState: {
          ...stateFor(checkpointStateTemplate, lineagePartId),
          lineage,
        },
      },
    };
    const parts = { [lineagePartId]: lineagePart };
    return {
      datasetId: 'rr-schema6-lineage',
      productionReferenceAt: atHour(49),
      coastalParts: { parts },
      ravScoreCandidateGRollback: candidateRollbackDescriptorFor(parts, atHour(49)),
    };
  };
  const migrationLineage = {
    currentEvidenceSource: RAVSCORE_RECOVERY_POLICY.candidateMigrationCurrentEvidenceSource,
    migrationId: RAVSCORE_MIGRATION_ID,
    sourceModelId: CANDIDATE_G_STATE_MODEL_ID,
    sourceStateSchemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
    migratedAt: atHour(48),
    waveApproachBootstrapHours:
      RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours,
    waveApproachMaximumOmittedMomentShare:
      RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachMaximumOmittedMomentShare,
    waveApproachMaximumScoreErrorBeforeRounding:
      RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachMaximumScoreErrorBeforeRounding,
  };
  await writeJson(sourcePath, lineageDocument(migrationLineage));
  await saveRavScoreContinuationCheckpoint({
    sourcePath,
    checkpointPath: lineageCheckpointPath,
    expectedPartCount: 1,
  });
  assert.deepEqual(
    JSON.parse(await fs.readFile(lineageCheckpointPath, 'utf8')).states[lineagePartId].lineage,
    migrationLineage,
    'the complete Candidate-G migration lineage must survive checkpointing exactly',
  );

  const coldReplayLineage = {
    boundedUnknownPositionCount: 0,
    completeCausalPositionCount: RAVSCORE_RECOVERY_POLICY.coldReplayHours,
    expectedCausalPositionCount: RAVSCORE_RECOVERY_POLICY.coldReplayHours,
    historyTransition: RAVSCORE_RECOVERY_POLICY.completeHistoryTransition,
    recoveryId: RAVSCORE_COLD_REPLAY_ID,
    source: RAVSCORE_RECOVERY_POLICY.source,
    targetReferenceAt: atHour(48),
  };
  await writeJson(sourcePath, lineageDocument(coldReplayLineage));
  await saveRavScoreContinuationCheckpoint({
    sourcePath,
    checkpointPath: lineageCheckpointPath,
    expectedPartCount: 1,
  });
  assert.deepEqual(
    JSON.parse(await fs.readFile(lineageCheckpointPath, 'utf8')).states[lineagePartId].lineage,
    coldReplayLineage,
    'the verified cold-replay lineage must survive checkpointing exactly',
  );

  await writeJson(sourcePath, lineageDocument({
    ...migrationLineage,
    unexpectedPrivateField: 'reject',
  }));
  await assert.rejects(
    saveRavScoreContinuationCheckpoint({
      sourcePath,
      checkpointPath: lineageCheckpointPath,
      expectedPartCount: 1,
    }),
    /lineage.*incompatible/,
    'unknown lineage fields must fail closed',
  );
  await writeJson(sourcePath, lineageDocument({
    ...coldReplayLineage,
    targetReferenceAt: atHour(50),
  }));
  await assert.rejects(
    saveRavScoreContinuationCheckpoint({
      sourcePath,
      checkpointPath: lineageCheckpointPath,
      expectedPartCount: 1,
    }),
    /lineage time.*after its state/,
    'future cold-replay lineage must fail closed',
  );

  const loaded = await loadRavScoreContinuationCheckpointForTarget({
    checkpointPath,
    targetReference: atHour(50),
  });
  assert.equal(loaded.loaded, true);
  assert.equal(loaded.reason, 'checkpoint-ready');
  assert.equal(loaded.continuationAvailable, true);
  assert.equal(loaded.checkpointAt, atHour(49));
  assert.equal(loaded.targetReferenceAt, atHour(50));
  assert.equal(loaded.ageHours, 1);
  assert.equal(loaded.partCount, PART_COUNT);
  assert.equal(
    loaded.continuationStateContractSha256,
    continuationStateContractSha256,
  );
  assert.deepEqual(loaded.states, checkpoint.states);
  assert.deepEqual(
    loaded.candidateGRollbackStates,
    checkpoint.candidateGRollbackCompanion.states,
  );
  assert.equal(
    Object.values(loaded.candidateGRollbackStates).every(state =>
      state.transportMemoryReady === true
      && state.transportMemoryStatus === 'READY'
      && state.transportMemoryCoverageHours === 48),
    true,
    'checkpoint-only recovery must carry 673 exact READY Candidate G states',
  );
  assert.equal(loaded.generationSha256, checkpoint.generationSha256);
  assert.equal(loaded.copiedWeather, false);
  assert.equal(loaded.copiedScores, false);
  assert.equal(loaded.copiedRawVectors, false);
  assert.equal(loaded.copiedCoordinates, false);
  assert.equal(loaded.copiedPrivateData, false);
  assert.deepEqual(
    await loadRavScoreContinuationCheckpointForTarget({
      checkpointPath: missingCheckpointPath,
      targetReference: atHour(50),
    }),
    { loaded: false, reason: 'checkpoint-not-found' },
  );
  assert.equal(
    (await loadRavScoreContinuationCheckpointForTarget({
      checkpointPath,
      targetReference: atHour(49 + RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumAgeHours),
    })).loaded,
    true,
    'the exact maximum continuation age remains admissible',
  );
  const expiredContinuation = await loadRavScoreContinuationCheckpointForTarget({
    checkpointPath,
    targetReference: atHour(50 + RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumAgeHours),
  });
  assert.equal(expiredContinuation.loaded, true);
  assert.equal(expiredContinuation.continuationAvailable, false);
  assert.equal(
    expiredContinuation.reason,
    'checkpoint-continuation-expired-companion-ready',
  );
  assert.deepEqual(expiredContinuation.states, {});
  assert.equal(
    Object.keys(expiredContinuation.candidateGRollbackStates).length,
    PART_COUNT,
    'an expired schema-6 continuation must retain its separately verified rollback companion',
  );

  // Source insertion order cannot alter either the sorted rows or their hash.
  const alternateSource = documentFor({
    datasetId: source.datasetId,
    productionReferenceAt: atHour(49),
    template: checkpointStateTemplate,
    reverse: false,
  });
  await writeJson(alternateSourcePath, alternateSource);
  await saveRavScoreContinuationCheckpoint({
    sourcePath: alternateSourcePath,
    checkpointPath: alternateCheckpointPath,
  });
  assert.equal(
    await fs.readFile(alternateCheckpointPath, 'utf8'),
    checkpointText,
    'sorted schema-6 checkpoints must be byte-deterministic',
  );

  // Model metadata alone cannot make changed continuation code compatible.
  assert.equal(
    RAVSCORE_CONTINUATION_IMPLEMENTATION_NORMALIZATION_ID,
    'utf8-bomless-lf-v2',
  );
  const lineEndingRepositoryRoots = {
    lf: path.join(tempRoot, 'line-ending-repository-lf'),
    crlf: path.join(tempRoot, 'line-ending-repository-crlf'),
  };
  for (const [lineEnding, repositoryRoot] of
    Object.entries(lineEndingRepositoryRoots)) {
    for (const relativePath of RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES) {
      const sourceImplementationPath = path.join(
        RAVSCORE_CONTINUATION_IMPLEMENTATION_REPOSITORY_ROOT,
        relativePath,
      );
      const implementationPath = path.join(repositoryRoot, relativePath);
      await fs.mkdir(path.dirname(implementationPath), { recursive: true });
      const normalizedSource = (await fs.readFile(sourceImplementationPath, 'utf8'))
        .replace(/^\uFEFF/, '')
        .replace(/\r\n?/g, '\n');
      await fs.writeFile(
        implementationPath,
        lineEnding === 'crlf' ? normalizedSource.replace(/\n/g, '\r\n') : normalizedSource,
      );
    }
  }
  assert.equal(
    await ravScoreContinuationImplementationSha256({
      repositoryRoot: lineEndingRepositoryRoots.lf,
    }),
    await ravScoreContinuationImplementationSha256({
      repositoryRoot: lineEndingRepositoryRoots.crlf,
    }),
    'continuation implementation hash must be identical on Linux and Windows checkouts',
  );

  for (const [driftIndex, driftedRelativePath] of
    RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES.entries()) {
    const driftedRepositoryRoot = path.join(tempRoot, `drifted-repository-${driftIndex}`);
    for (const relativePath of RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES) {
      const sourceImplementationPath = path.join(
        RAVSCORE_CONTINUATION_IMPLEMENTATION_REPOSITORY_ROOT,
        relativePath,
      );
      const driftedImplementationPath = path.join(driftedRepositoryRoot, relativePath);
      await fs.mkdir(path.dirname(driftedImplementationPath), { recursive: true });
      await fs.copyFile(sourceImplementationPath, driftedImplementationPath);
    }
    await fs.appendFile(path.join(driftedRepositoryRoot, driftedRelativePath), '\n');
    await assert.rejects(
      loadRavScoreContinuationCheckpointForTarget({
        checkpointPath,
        targetReference: atHour(50),
        repositoryRoot: driftedRepositoryRoot,
      }),
      /continuation implementation is incompatible/,
      `continuation drift in ${driftedRelativePath} must be rejected`,
    );
  }

  const target = documentFor({
    datasetId: 'rr-schema6-deployed',
    productionReferenceAt: atHour(48),
    template: targetStateTemplate,
  });
  await writeJson(targetPath, target);
  const restored = await restoreRavScoreContinuationCheckpoint({
    targetPath,
    checkpointPath,
    targetReference: atHour(50),
  });
  assert.equal(restored.restored, true);
  assert.equal(restored.partCount, PART_COUNT);
  assert.equal(restored.modelId, RAVSCORE_MODEL_ID);
  assert.equal(restored.stateSchemaVersion, RAVSCORE_STATE_SCHEMA_VERSION);
  assert.equal(restored.modelContractSha256, RAVSCORE_MODEL_CONTRACT_SHA256);
  assert.equal(restored.modelBundleSha256, RAVSCORE_MODEL_BUNDLE_SHA256);
  assert.equal(
    restored.continuationStateContractSha256,
    continuationStateContractSha256,
  );
  assert.equal(restored.copiedWeather, false);
  assert.equal(restored.copiedScores, false);
  assert.equal(restored.copiedRawVectors, false);
  assert.equal(restored.copiedCoordinates, false);
  assert.equal(restored.copiedPrivateData, false);
  const restoredTarget = JSON.parse(await fs.readFile(targetPath, 'utf8'));
  assert.deepEqual(restoredTarget.harmlessSentinel, target.harmlessSentinel);
  for (const partId of partIds) {
    assert.deepEqual(
      restoredTarget.coastalParts.parts[partId].ravScoreModel.currentState,
      checkpoint.states[partId],
    );
  }

  // First rollout has no schema-6 cache. It must be a pure no-op so the score
  // pipeline, and only the score pipeline, can migrate the hydrated schema 2.
  const firstRolloutTarget = clone(target);
  for (const part of Object.values(firstRolloutTarget.coastalParts.parts)) {
    part.candidateG = { currentState: { schemaVersion: '2.0.0' } };
    delete part.ravScoreModel;
  }
  await writeJson(targetPath, firstRolloutTarget);
  const firstRolloutBefore = await fs.readFile(targetPath, 'utf8');
  assert.deepEqual(
    await restoreRavScoreContinuationCheckpoint({
      targetPath,
      checkpointPath: missingCheckpointPath,
      targetReference: atHour(50),
    }),
    { restored: false, reason: 'checkpoint-not-found', targetUnchanged: true },
  );
  assert.equal(await fs.readFile(targetPath, 'utf8'), firstRolloutBefore);

  // A valid but non-newer cache is also byte-preserving.
  const alreadyDeployed = documentFor({
    datasetId: 'rr-schema6-already-deployed',
    productionReferenceAt: atHour(49),
    template: checkpointStateTemplate,
  });
  await writeJson(targetPath, alreadyDeployed);
  const alreadyDeployedBefore = await fs.readFile(targetPath, 'utf8');
  const nonNewer = await restoreRavScoreContinuationCheckpoint({
    targetPath,
    checkpointPath,
    targetReference: atHour(50),
  });
  assert.equal(nonNewer.restored, false);
  assert.equal(nonNewer.reason, 'checkpoint-not-newer-than-deployed');
  assert.equal(nonNewer.targetUnchanged, true);
  assert.equal(await fs.readFile(targetPath, 'utf8'), alreadyDeployedBefore);

  const badHash = clone(checkpoint);
  badHash.stateSha256 = '0'.repeat(64);
  await assertRestoreRejectsWithoutMutation({
    target,
    checkpoint: badHash,
    message: /integrity/,
  });

  const privateField = clone(checkpoint);
  privateField.states[partIds[0]].rawUMps = 0.1;
  await assertRestoreRejectsWithoutMutation({
    target,
    checkpoint: privateField,
    message: /field set/,
  });

  const wrongBinding = clone(checkpoint);
  wrongBinding.modelBinding.componentSchemaId = 'wrong-component-contract';
  await assertRestoreRejectsWithoutMutation({
    target,
    checkpoint: wrongBinding,
    message: /incompatible componentSchemaId/,
  });

  const companion672 = clone(checkpoint);
  delete companion672.candidateGRollbackCompanion.states[partIds[0]];
  await assertRestoreRejectsWithoutMutation({
    target,
    checkpoint: companion672,
    message: /companion state integrity/,
  });

  const companionTamper = clone(checkpoint);
  companionTamper.candidateGRollbackCompanion.states[partIds[0]].transportPotential += 1;
  await assertRestoreRejectsWithoutMutation({
    target,
    checkpoint: companionTamper,
    message: /Candidate G rollback companion|integrity/,
  });

  const companionPrivateField = clone(checkpoint);
  companionPrivateField.candidateGRollbackCompanion.states[partIds[0]].currentUMps = 0.1;
  await assertRestoreRejectsWithoutMutation({
    target,
    checkpoint: companionPrivateField,
    message: /field set/,
  });

  const nextGenerationSource = documentFor({
    datasetId: 'rr-schema6-next-generation',
    productionReferenceAt: atHour(50),
    template: advancedStateTemplate,
  });
  await writeJson(alternateSourcePath, nextGenerationSource);
  await saveRavScoreContinuationCheckpoint({
    sourcePath: alternateSourcePath,
    checkpointPath: alternateCheckpointPath,
  });
  const nextGeneration = JSON.parse(await fs.readFile(alternateCheckpointPath, 'utf8'));
  const crossGeneration = clone(checkpoint);
  crossGeneration.candidateGRollbackCompanion =
    nextGeneration.candidateGRollbackCompanion;
  await assertRestoreRejectsWithoutMutation({
    target,
    checkpoint: crossGeneration,
    message: /companion descriptor is incompatible|generation is invalid/,
  });

  const wrongContextTarget = clone(target);
  wrongContextTarget.coastalParts.parts[partIds[0]].ravScoreModel.currentState.samplingContextKey =
    contextFor('different-sampling-context');
  await assertRestoreRejectsWithoutMutation({
    target: wrongContextTarget,
    checkpoint,
    message: /sampling context is incompatible/,
  });

  const candidateGOnlyTarget = clone(target);
  delete candidateGOnlyTarget.coastalParts.parts[partIds[0]].ravScoreModel;
  candidateGOnlyTarget.coastalParts.parts[partIds[0]].candidateG = {
    currentState: { schemaVersion: '2.0.0' },
  };
  await assertRestoreRejectsWithoutMutation({
    target: candidateGOnlyTarget,
    checkpoint,
    message: /no schema-6 continuation/,
  });

  // The checkpoint is globally newer, but one part would regress its state.
  const regressionSource = documentFor({
    datasetId: 'rr-schema6-regression-source',
    productionReferenceAt: atHour(49),
    template: checkpointStateTemplate,
  });
  await writeJson(sourcePath, regressionSource);
  await saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath });
  const advancedTarget = documentFor({
    datasetId: 'rr-schema6-advanced-target',
    productionReferenceAt: atHour(48),
    template: targetStateTemplate,
  });
  advancedTarget.coastalParts.parts[partIds[0]].ravScoreModel.currentState =
    stateFor(advancedStateTemplate, partIds[0]);
  await writeJson(targetPath, advancedTarget);
  const advancedBefore = await fs.readFile(targetPath, 'utf8');
  await assert.rejects(
    restoreRavScoreContinuationCheckpoint({
      targetPath,
      checkpointPath,
      targetReference: atHour(51),
    }),
    /regresses time/,
  );
  assert.equal(await fs.readFile(targetPath, 'utf8'), advancedBefore);

  // A descriptor or any contained state after the final bound target is fatal.
  const futureSource = documentFor({
    datasetId: 'rr-schema6-future-source',
    productionReferenceAt: atHour(52),
    template: futureStateTemplate,
  });
  await writeJson(sourcePath, futureSource);
  await saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath });
  await assertRestoreRejectsWithoutMutation({
    target,
    checkpoint: JSON.parse(await fs.readFile(checkpointPath, 'utf8')),
    targetReference: atHour(51),
    message: /future relative to the bound target/,
  });

  const futureStateSource = documentFor({
    datasetId: 'rr-schema6-state-after-source',
    productionReferenceAt: atHour(48),
    template: checkpointStateTemplate,
  });
  await writeJson(sourcePath, futureStateSource);
  await assert.rejects(
    saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath }),
    /does not match its production reference/,
  );

  const mixedStateSource = documentFor({
    datasetId: 'rr-schema6-mixed-state-times',
    productionReferenceAt: atHour(49),
    template: checkpointStateTemplate,
  });
  mixedStateSource.coastalParts.parts[partIds[0]].ravScoreModel.currentState =
    stateFor(targetStateTemplate, partIds[0]);
  await writeJson(sourcePath, mixedStateSource);
  await assert.rejects(
    saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath }),
    /does not match its production reference/,
    'a fresh descriptor cannot conceal one older continuation state',
  );

  const incompleteSource = documentFor({
    datasetId: 'rr-schema6-incomplete',
    productionReferenceAt: atHour(49),
    template: checkpointStateTemplate,
  });
  delete incompleteSource.coastalParts.parts[partIds[0]];
  await writeJson(sourcePath, incompleteSource);
  await assert.rejects(
    saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath }),
    /requires 673 parts/,
  );

  const unsafePartIdSource = documentFor({
    datasetId: 'rr-schema6-unsafe-part-id',
    productionReferenceAt: atHour(49),
    template: checkpointStateTemplate,
  });
  unsafePartIdSource.coastalParts.parts['unsafe part id'] =
    unsafePartIdSource.coastalParts.parts[partIds[0]];
  delete unsafePartIdSource.coastalParts.parts[partIds[0]];
  await writeJson(sourcePath, unsafePartIdSource);
  await assert.rejects(
    saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath }),
    /ASCII token of at most 100 characters/,
  );

  const incompleteCompanionSource = documentFor({
    datasetId: 'rr-schema6-incomplete-companion',
    productionReferenceAt: atHour(49),
    template: checkpointStateTemplate,
  });
  delete incompleteCompanionSource.ravScoreCandidateGRollback.runtime.parts[partIds[0]];
  incompleteCompanionSource.ravScoreCandidateGRollback.runtime.scoredPartCount -= 1;
  await writeJson(sourcePath, incompleteCompanionSource);
  await assert.rejects(
    saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath }),
    /runtime is not complete and READY|different parts/,
    'a 672-part rollback companion must fail before checkpoint publication',
  );

  const warmupSource = documentFor({
    datasetId: 'rr-schema6-measured-warmup',
    productionReferenceAt: atHour(49),
    template: checkpointStateTemplate,
  });
  const warmupIds = partIds.slice(0, 3);
  warmupSource.coastalParts.parts = Object.fromEntries(warmupIds.map(id =>
    [id, warmupSource.coastalParts.parts[id]]));
  warmupSource.coastalParts.parts[warmupIds[0]].ravScoreModel.currentState =
    stateFor(nativeHoldStateTemplate, warmupIds[0]);
  const measuredStates = Object.fromEntries(warmupIds.map((id, index) => {
    const samples = Array.from({ length: index === 2 ? 50 : 10 }, (_, hour) => ({
      time: atHour(index === 2 ? hour : 40 + hour), currentSpeedMps: 0.12, currentAlignment: 0.75,
      currentVerified: index === 2 ? hour !== 49 : index === 0 || hour !== 3,
      waveHeightM: 1.2, wavePeriodS: 6,
    }));
    const state = buildCandidateGDerivedStateSeries(samples, {
      stateKey: candidateGStateKey(partFor(id)),
      nativeCadenceHoldHours: 3,
    }).continuationState;
    assert.equal(state.transportMemoryReady, index === 2);
    if (index === 2) assert.equal(state.transportReferenceAt, atHour(48));
    return [id, { ravScoreModel: { currentState: state } }];
  }));
  delete warmupSource.ravScoreCandidateGRollback;
  warmupSource.ravScoreCandidateGWarmup = {
    schemaVersion: '1.0.0', kind: 'PRIVATE_CANDIDATE_G_MEASURED_WARMUP_RUNTIME',
    privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', status: 'BUILDING_MEASURED_ONLY',
    evidencePolicy: 'MEASURED_ONLY', syntheticHistoryAllowed: false,
    sourceModelBinding: ravScoreModelBinding(), candidateModelBinding: candidateGRollbackModelBinding(),
    automaticActivationAllowed: false, publicDuringNormalOperation: false,
    runtime: { status: 'BUILDING_MEASURED_ONLY', modelBinding: candidateGRollbackModelBinding(),
      expectedPartCount: 3, measuredPartCount: 3, parts: measuredStates },
  };
  await writeJson(sourcePath, warmupSource);
  await saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath, expectedPartCount: 3 });
  const warmupCheckpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
  const resumedWarmup = await loadRavScoreContinuationCheckpointForTarget({
    checkpointPath, expectedPartCount: 3, targetReference: atHour(50),
  });
  assert.equal(resumedWarmup.continuationAvailable, true);
  assert.deepEqual(resumedWarmup.candidateGRollbackStates,
    Object.fromEntries(warmupIds.map(id => [id, measuredStates[id].ravScoreModel.currentState])));
  assert.equal(Object.values(resumedWarmup.candidateGRollbackStates)
    .filter(state => state.transportMemoryReady === false).length, 2,
  'persisting measured progress must never promote rollback readiness');
  assertNoPrivateCheckpointFields(warmupCheckpoint);
  const forgedLegacy = clone(warmupCheckpoint);
  forgedLegacy.schemaVersion = 4;
  forgedLegacy.status = 'ravscore-schema6-with-candidate-g-rollback-companion';
  forgedLegacy.candidateGRollbackCompanion.schemaVersion = 1;
  forgedLegacy.candidateGRollbackCompanion.status = 'candidate-g-rollback-ready-companion';
  await writeJson(checkpointPath, checkpointWithImplementation(forgedLegacy,
    continuationStateContractSha256));
  await assert.rejects(loadRavScoreContinuationCheckpointForTarget({
    checkpointPath, expectedPartCount: 3, targetReference: atHour(50),
  }), /not exact measured continuation/, 'legacy READY schema cannot disguise warmup state');

  console.log('Schema-6 RavScore continuation checkpoint contract passes.');
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
