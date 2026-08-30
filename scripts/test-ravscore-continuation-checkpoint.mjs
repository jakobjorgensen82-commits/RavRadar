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
  RAVSCORE_PROFILE_ID,
  RAVSCORE_STATE_SCHEMA_VERSION,
  RAVSCORE_VARIANT_ID,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  loadRavScoreContinuationCheckpointForTarget,
  RAVSCORE_CONTINUATION_CHECKPOINT_POLICY,
  restoreRavScoreContinuationCheckpoint,
  saveRavScoreContinuationCheckpoint,
} from './ravscore-continuation-checkpoint.mjs';
import {
  RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,
  RAVSCORE_CONTINUATION_IMPLEMENTATION_REPOSITORY_ROOT,
  ravScoreContinuationImplementationSha256,
} from './lib/ravscore-continuation-implementation-contract.mjs';

const PART_COUNT = RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount;
const START = Date.parse('2026-08-01T00:00:00.000Z');
const atHour = hour => new Date(START + hour * 3_600_000).toISOString();
const contextFor = partId => `sha256:${crypto.createHash('sha256').update(partId).digest('hex')}`;
const clone = value => JSON.parse(JSON.stringify(value));
const writeJson = (file, value) => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);

const samples = Array.from({ length: 53 }, (_, hour) => ({
  time: atHour(hour),
  currentSpeedMps: 0.12,
  currentAlignment: 0.75,
  currentVerified: true,
  waveHeightM: 1.2,
  wavePeriodS: 6,
}));
const fixtureSeries = buildIntegratedRavScoreStateSeries(samples, {
  samplingContextKey: contextFor('fixture'),
});
const targetStateTemplate = fixtureSeries.rows[48].continuationState;
const checkpointStateTemplate = fixtureSeries.rows[49].continuationState;
const advancedStateTemplate = fixtureSeries.rows[50].continuationState;
const futureStateTemplate = fixtureSeries.rows[52].continuationState;
assert.equal(targetStateTemplate.currentMemoryReady, true);
assert.equal(targetStateTemplate.waveMemoryReady, true);

const partIds = Array.from({ length: PART_COUNT }, (_, index) => `part-${String(index + 1).padStart(3, '0')}`);
const stateFor = (template, partId) => ({
  ...clone(template),
  samplingContextKey: contextFor(partId),
});
const partsFor = (template, { reverse = false } = {}) => Object.fromEntries(
  [...partIds]
    .sort((left, right) => reverse ? right.localeCompare(left) : left.localeCompare(right))
    .map(partId => [partId, {
      label: `safe-${partId}`,
      ravScoreModel: {
        currentState: stateFor(template, partId),
      },
    }]),
);
const documentFor = ({
  datasetId,
  productionReferenceAt,
  template,
  reverse = false,
} = {}) => ({
  datasetId,
  productionReferenceAt,
  harmlessSentinel: { preserved: true },
  coastalParts: { parts: partsFor(template, { reverse }) },
});

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

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ravscore-schema4-checkpoint-'));
const sourcePath = path.join(tempRoot, 'source.json');
const alternateSourcePath = path.join(tempRoot, 'source-alternate.json');
const targetPath = path.join(tempRoot, 'target.json');
const checkpointPath = path.join(tempRoot, 'checkpoint.json');
const alternateCheckpointPath = path.join(tempRoot, 'checkpoint-alternate.json');
const missingCheckpointPath = path.join(tempRoot, 'missing', 'checkpoint.json');

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
    datasetId: 'rr-schema4-checkpoint-source',
    productionReferenceAt: atHour(49),
    template: checkpointStateTemplate,
    reverse: true,
  });
  await writeJson(sourcePath, source);
  const continuationStateContractSha256 =
    await ravScoreContinuationImplementationSha256();
  const saved = await saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath });
  assert.deepEqual(saved, {
    saved: true,
    datasetId: source.datasetId,
    productionReferenceAt: atHour(49),
    partCount: PART_COUNT,
    modelId: RAVSCORE_MODEL_ID,
    stateSchemaVersion: RAVSCORE_STATE_SCHEMA_VERSION,
    modelContractSha256: RAVSCORE_MODEL_CONTRACT_SHA256,
    modelBundleSha256: RAVSCORE_MODEL_BUNDLE_SHA256,
    continuationStateContractSha256,
  });

  const checkpointText = await fs.readFile(checkpointPath, 'utf8');
  const checkpoint = JSON.parse(checkpointText);
  assert.equal(checkpoint.schemaVersion, 2);
  assert.equal(checkpoint.status, 'ravscore-schema4-compact-continuation');
  assert.equal(
    checkpoint.continuationStateContractSha256,
    continuationStateContractSha256,
  );
  assert.deepEqual(checkpoint.modelBinding, ravScoreModelBinding());
  assert.equal(checkpoint.partCount, PART_COUNT);
  assert.deepEqual(Object.keys(checkpoint.states), [...partIds].sort());
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

  const loaded = await loadRavScoreContinuationCheckpointForTarget({
    checkpointPath,
    targetReference: atHour(50),
  });
  assert.equal(loaded.loaded, true);
  assert.equal(loaded.checkpointAt, atHour(49));
  assert.equal(loaded.targetReferenceAt, atHour(50));
  assert.equal(loaded.ageHours, 1);
  assert.equal(loaded.partCount, PART_COUNT);
  assert.equal(
    loaded.continuationStateContractSha256,
    continuationStateContractSha256,
  );
  assert.deepEqual(loaded.states, checkpoint.states);
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
  await assert.rejects(
    loadRavScoreContinuationCheckpointForTarget({
      checkpointPath,
      targetReference: atHour(50 + RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumAgeHours),
    }),
    /older than the 72-hour continuation limit/,
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
    'sorted schema-4 checkpoints must be byte-deterministic',
  );

  // Model metadata alone cannot make changed continuation code compatible.
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
    datasetId: 'rr-schema4-deployed',
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

  // First rollout has no schema-4 cache. It must be a pure no-op so the score
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
    datasetId: 'rr-schema4-already-deployed',
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
    message: /no schema-4 continuation/,
  });

  // The checkpoint is globally newer, but one part would regress its state.
  const regressionSource = documentFor({
    datasetId: 'rr-schema4-regression-source',
    productionReferenceAt: atHour(49),
    template: checkpointStateTemplate,
  });
  await writeJson(sourcePath, regressionSource);
  await saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath });
  const advancedTarget = documentFor({
    datasetId: 'rr-schema4-advanced-target',
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
    datasetId: 'rr-schema4-future-source',
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
    datasetId: 'rr-schema4-state-after-source',
    productionReferenceAt: atHour(48),
    template: checkpointStateTemplate,
  });
  await writeJson(sourcePath, futureStateSource);
  await assert.rejects(
    saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath }),
    /does not match its production reference/,
  );

  const mixedStateSource = documentFor({
    datasetId: 'rr-schema4-mixed-state-times',
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
    datasetId: 'rr-schema4-incomplete',
    productionReferenceAt: atHour(49),
    template: checkpointStateTemplate,
  });
  delete incompleteSource.coastalParts.parts[partIds[0]];
  await writeJson(sourcePath, incompleteSource);
  await assert.rejects(
    saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath }),
    /requires 673 parts/,
  );

  console.log('Schema-4 RavScore continuation checkpoint contract passes.');
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
