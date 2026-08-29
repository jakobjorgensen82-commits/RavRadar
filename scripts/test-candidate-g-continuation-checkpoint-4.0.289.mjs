import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  restoreContinuationCheckpoint,
  saveContinuationCheckpoint,
} from './candidate-g-continuation-checkpoint.mjs';
import {
  buildCandidateGDerivedStateSeries,
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  buildBoundedCurrentTransportMemory,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
} from '../js/core/ravscore-regime-memory.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-continuation-checkpoint-'));
const sourcePath = path.join(root, 'source.json');
const targetPath = path.join(root, 'target.json');
const checkpointPath = path.join(root, 'cache', 'checkpoint.json');
const at = hour => new Date(Date.parse('2026-08-27T00:00:00.000Z') + hour * 3_600_000).toISOString();
const state = (partId, hour, ready = false) => {
  const firstEvidenceHour = ready ? hour - 48 : Math.max(0, hour - 9);
  const transportEvidence = Array.from(
    { length: hour - firstEvidenceHour + 1 },
    (_, index) => ({ time: at(firstEvidenceHour + index), strength: 0.4 }),
  );
  return ({
  schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
  modelId: CANDIDATE_G_STATE_MODEL_ID,
  variantId: CANDIDATE_G_STATE_VARIANT_ID,
  profileId: CANDIDATE_G_STATE_PROFILE_ID,
  stateKey: `state-${partId}`,
  time: at(hour),
  transportReferenceAt: at(hour),
  transportPotential: 34,
  outboundEpisodeEffectiveHours: 0,
  transportMemoryReady: ready,
  transportMemoryStatus: ready ? 'READY' : 'WINDOW_INCOMPLETE',
  transportMemoryWindowHours: 48,
  transportMemoryCoverageHours: ready ? 48 : hour - firstEvidenceHour,
  transportEvidence,
  mobilisationPotential: 53,
  });
};
const candidateGTransportOracle = value => buildBoundedCurrentTransportMemory(
  value.transportEvidence,
  {
    ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    referenceTime: value.transportReferenceAt,
    restartAfterVerifiedTimeGap: true,
  },
);
const parts = ['part-a', 'part-b'];
const source = {
  datasetId: 'failed-after-runtime-generation',
  productionReferenceAt: at(9),
  weatherMarker: 'source-weather-must-not-copy',
  coastalParts: { parts: Object.fromEntries(parts.map(partId => [partId, {
    current: { beach: { score: 88 }, weather: { marker: 'source' } },
    candidateG: { currentState: state(partId, 9) },
  }])) },
};
const target = {
  datasetId: 'last-deployed',
  productionReferenceAt: at(0),
  weatherMarker: 'target-weather-must-remain',
  coastalParts: { parts: Object.fromEntries(parts.map(partId => [partId, {
    current: { beach: { score: 71 }, weather: { marker: 'target' } },
    candidateG: { currentState: state(partId, 0, true) },
  }])) },
};

try {
  await fs.writeFile(sourcePath, JSON.stringify(source));
  await fs.writeFile(targetPath, JSON.stringify(target));
  const saved = await saveContinuationCheckpoint({ sourcePath, checkpointPath, expectedPartCount: 2 });
  assert.equal(saved.partCount, 2);
  const checkpointText = await fs.readFile(checkpointPath, 'utf8');
  for (const forbidden of ['source-weather-must-not-copy', '"score"', 'uMps', 'vMps', 'waterPoint', 'gridPoint']) {
    assert.equal(checkpointText.includes(forbidden), false, `Checkpointet lækker ${forbidden}`);
  }
  const restored = await restoreContinuationCheckpoint({
    targetPath,
    checkpointPath,
    targetReference: at(11),
    expectedPartCount: 2,
  });
  assert.equal(restored.restored, true);
  const result = JSON.parse(await fs.readFile(targetPath, 'utf8'));
  assert.equal(result.weatherMarker, 'target-weather-must-remain');
  assert.equal(result.coastalParts.parts['part-a'].current.weather.marker, 'target');
  assert.equal(result.coastalParts.parts['part-a'].current.beach.score, 71);
  assert.equal(result.coastalParts.parts['part-a'].candidateG.currentState.time, at(9));

  await fs.writeFile(targetPath, JSON.stringify(target));
  assert.equal((await restoreContinuationCheckpoint({ targetPath, checkpointPath, targetReference: at(8), expectedPartCount: 2 })).reason,
    'checkpoint-is-after-target-reference');
  assert.equal((await restoreContinuationCheckpoint({ targetPath, checkpointPath, targetReference: at(82), expectedPartCount: 2 })).reason,
    'checkpoint-too-old');

  const corrupted = JSON.parse(checkpointText);
  corrupted.states['part-a'].transportPotential = 99;
  await fs.writeFile(checkpointPath, JSON.stringify(corrupted));
  await assert.rejects(
    restoreContinuationCheckpoint({ targetPath, checkpointPath, targetReference: at(11), expectedPartCount: 2 }),
    /integriteten/,
  );

  const futureSource = structuredClone(source);
  futureSource.coastalParts.parts['part-a'].candidateG.currentState.time = at(10);
  await fs.writeFile(sourcePath, JSON.stringify(futureSource));
  await assert.rejects(
    saveContinuationCheckpoint({ sourcePath, checkpointPath, expectedPartCount: 2 }),
    /fremtidig state/,
  );

  const transitionSource = structuredClone(source);
  transitionSource.datasetId = 'failed-next-generation-runtime';
  transitionSource.productionReferenceAt = at(10);
  for (const partId of parts) {
    transitionSource.coastalParts.parts[partId] = {
      current: { beach: { score: 99 }, weather: { marker: 'next-generation-source' } },
      ravScore: {
        currentState: {
          ...state(partId, 10, true),
          schemaVersion: '3.0.0',
          modelId: 'RRS-COASTAL-CAUSAL-CHAIN-1',
          variantId: 'COASTAL-SUPPLY-MOBILISATION-DELIVERY-1',
          profileId: 'coastal-supply-smooth-in6.578813-out8.312951-window48-boundary0-wave-build4-decay48',
          outboundEpisodeEffectiveHours: 14,
        },
      },
    };
  }
  await fs.writeFile(sourcePath, JSON.stringify(transitionSource));
  await fs.writeFile(targetPath, JSON.stringify(target));
  await saveContinuationCheckpoint({ sourcePath, checkpointPath, expectedPartCount: 2 });
  const transitionCheckpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
  transitionCheckpoint.status = 'ravscore-compact-continuation';
  await fs.writeFile(checkpointPath, JSON.stringify(transitionCheckpoint));
  const transitioned = await restoreContinuationCheckpoint({
    targetPath,
    checkpointPath,
    targetReference: at(11),
    expectedPartCount: 2,
  });
  assert.equal(transitioned.restored, true);
  assert.equal(transitioned.adaptedPartCount, 2);
  assert.equal(transitioned.adaptation, 'INTERRUPTED_NEXT_GENERATION_TO_CANDIDATE_G');
  const transitionResult = JSON.parse(await fs.readFile(targetPath, 'utf8'));
  const transitionState = transitionResult.coastalParts.parts['part-a'].candidateG.currentState;
  assert.equal(transitionState.schemaVersion, CANDIDATE_G_STATE_SCHEMA_VERSION);
  assert.equal(transitionState.modelId, CANDIDATE_G_STATE_MODEL_ID);
  assert.equal(transitionState.variantId, CANDIDATE_G_STATE_VARIANT_ID);
  assert.equal(transitionState.profileId, CANDIDATE_G_STATE_PROFILE_ID);
  assert.equal(transitionState.time, at(10));
  const transitionOracle = candidateGTransportOracle(
    transitionSource.coastalParts.parts['part-a'].ravScore.currentState,
  );
  assert.equal(
    transitionState.outboundEpisodeEffectiveHours,
    transitionOracle.result.outboundEpisodeEffectiveHours,
  );
  assert.deepEqual(
    transitionState.transportEvidence,
    transitionSource.coastalParts.parts['part-a'].ravScore.currentState.transportEvidence,
  );
  assert.equal(
    transitionState.transportPotential,
    transitionOracle.result.transportPotential,
  );
  assert.equal(
    transitionState.mobilisationPotential,
    transitionSource.coastalParts.parts['part-a'].ravScore.currentState.mobilisationPotential,
  );
  assert.equal(transitionState.transportMemoryCoverageHours, 48);
  const continued = buildCandidateGDerivedStateSeries([{
    time: at(11),
    currentVerified: true,
    currentSpeedMps: 0.1,
    currentAlignment: 1,
    waveHeightM: 1,
    wavePeriodS: 6,
  }], {
    stateKey: transitionState.stateKey,
    initialState: transitionState,
  });
  assert.equal(continued.initialStateAccepted, true);
  assert.equal(continued.initialStateResetReason, null);
  assert.equal(continued.rows[0].transportMemoryReady, true);
  assert.equal(continued.rows[0].transportMemoryStatus, 'READY');
  const canonicalCandidateState = {
    ...transitionSource.coastalParts.parts['part-a'].ravScore.currentState,
    schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
    modelId: CANDIDATE_G_STATE_MODEL_ID,
    variantId: CANDIDATE_G_STATE_VARIANT_ID,
    profileId: CANDIDATE_G_STATE_PROFILE_ID,
    transportPotential: transitionOracle.result.transportPotential,
    outboundEpisodeEffectiveHours: transitionOracle.result.outboundEpisodeEffectiveHours,
  };
  const canonicalContinuation = buildCandidateGDerivedStateSeries([{
    time: at(11),
    currentVerified: true,
    currentSpeedMps: 0.1,
    currentAlignment: 1,
    waveHeightM: 1,
    wavePeriodS: 6,
  }], {
    stateKey: canonicalCandidateState.stateKey,
    initialState: canonicalCandidateState,
  });
  assert.deepEqual(continued, canonicalContinuation);
  assert.equal(transitionResult.weatherMarker, 'target-weather-must-remain');
  assert.equal(transitionResult.coastalParts.parts['part-a'].current.beach.score, 71);

  for (const outboundHours of [12, 13, 14]) {
    const boundarySource = structuredClone(transitionSource);
    boundarySource.datasetId = `candidate-g-outbound-boundary-${outboundHours}`;
    for (const partId of parts) {
      const evidence = Array.from({ length: 49 }, (_, index) => ({
        time: at(10 - 48 + index),
        strength: index >= 49 - outboundHours ? -1 : 1,
      }));
      const nextState = boundarySource.coastalParts.parts[partId].ravScore.currentState;
      nextState.transportEvidence = evidence;
      nextState.transportPotential = 77;
      nextState.outboundEpisodeEffectiveHours = 2;
    }
    await fs.writeFile(sourcePath, JSON.stringify(boundarySource));
    await fs.writeFile(targetPath, JSON.stringify(target));
    await saveContinuationCheckpoint({ sourcePath, checkpointPath, expectedPartCount: 2 });
    const boundaryRestore = await restoreContinuationCheckpoint({
      targetPath,
      checkpointPath,
      targetReference: at(11),
      expectedPartCount: 2,
    });
    assert.equal(boundaryRestore.restored, true);
    assert.equal(boundaryRestore.adaptedPartCount, 2);
    const boundaryResult = JSON.parse(await fs.readFile(targetPath, 'utf8'));
    const restoredBoundaryState = boundaryResult.coastalParts.parts['part-a'].candidateG.currentState;
    const boundaryOracle = candidateGTransportOracle(
      boundarySource.coastalParts.parts['part-a'].ravScore.currentState,
    );
    assert.equal(restoredBoundaryState.transportPotential, boundaryOracle.result.transportPotential);
    assert.equal(
      restoredBoundaryState.outboundEpisodeEffectiveHours,
      boundaryOracle.result.outboundEpisodeEffectiveHours,
    );
    assert.equal(restoredBoundaryState.outboundEpisodeEffectiveHours, outboundHours);
    assert.equal(restoredBoundaryState.transportPotential > 0, outboundHours === 12);
  }

  const inboundResetSource = structuredClone(transitionSource);
  inboundResetSource.datasetId = 'candidate-g-inbound-reset';
  for (const partId of parts) {
    const evidence = Array.from({ length: 49 }, (_, index) => ({
      time: at(10 - 48 + index),
      strength: index >= 43 && index < 48 ? -1 : 1,
    }));
    const nextState = inboundResetSource.coastalParts.parts[partId].ravScore.currentState;
    nextState.transportEvidence = evidence;
    nextState.transportPotential = 1;
    nextState.outboundEpisodeEffectiveHours = 99;
  }
  await fs.writeFile(sourcePath, JSON.stringify(inboundResetSource));
  await fs.writeFile(targetPath, JSON.stringify(target));
  await saveContinuationCheckpoint({ sourcePath, checkpointPath, expectedPartCount: 2 });
  assert.equal((await restoreContinuationCheckpoint({
    targetPath,
    checkpointPath,
    targetReference: at(11),
    expectedPartCount: 2,
  })).restored, true);
  const inboundResetResult = JSON.parse(await fs.readFile(targetPath, 'utf8'));
  assert.equal(
    inboundResetResult.coastalParts.parts['part-a'].candidateG.currentState.outboundEpisodeEffectiveHours,
    0,
  );

  for (const scenario of [
    {
      id: 'neutral-ready',
      evidence: Array.from({ length: 49 }, (_, index) => ({
        time: at(10 - 48 + index),
        strength: 0,
      })),
      expectedReady: true,
    },
    {
      id: 'incomplete-window',
      evidence: Array.from({ length: 7 }, (_, index) => ({
        time: at(4 + index),
        strength: 0.4,
      })),
      expectedReady: false,
    },
  ]) {
    const scenarioSource = structuredClone(transitionSource);
    scenarioSource.datasetId = `candidate-g-${scenario.id}`;
    for (const partId of parts) {
      const nextState = scenarioSource.coastalParts.parts[partId].ravScore.currentState;
      nextState.transportEvidence = scenario.evidence.map(item => ({ ...item }));
      const oracle = candidateGTransportOracle(nextState);
      nextState.transportMemoryReady = oracle.memoryReady;
      nextState.transportMemoryStatus = oracle.status;
      nextState.transportMemoryWindowHours = oracle.windowHours;
      nextState.transportMemoryCoverageHours = oracle.coverageHours;
      nextState.transportPotential = 83;
      nextState.outboundEpisodeEffectiveHours = 17;
    }
    await fs.writeFile(sourcePath, JSON.stringify(scenarioSource));
    await fs.writeFile(targetPath, JSON.stringify(target));
    await saveContinuationCheckpoint({ sourcePath, checkpointPath, expectedPartCount: 2 });
    assert.equal((await restoreContinuationCheckpoint({
      targetPath,
      checkpointPath,
      targetReference: at(11),
      expectedPartCount: 2,
    })).restored, true);
    const scenarioResult = JSON.parse(await fs.readFile(targetPath, 'utf8'));
    const restoredScenario = scenarioResult.coastalParts.parts['part-a'].candidateG.currentState;
    const scenarioOracle = candidateGTransportOracle(
      scenarioSource.coastalParts.parts['part-a'].ravScore.currentState,
    );
    assert.equal(restoredScenario.transportMemoryReady, scenario.expectedReady);
    assert.equal(restoredScenario.transportMemoryStatus, scenarioOracle.status);
    assert.equal(restoredScenario.transportMemoryCoverageHours, scenarioOracle.coverageHours);
    assert.equal(restoredScenario.transportPotential, scenarioOracle.result.transportPotential);
    assert.equal(
      restoredScenario.outboundEpisodeEffectiveHours,
      scenarioOracle.result.outboundEpisodeEffectiveHours,
    );
  }

  const missingEvidenceSource = structuredClone(transitionSource);
  missingEvidenceSource.coastalParts.parts['part-a'].ravScore.currentState.transportEvidence[10].strength = null;
  await fs.writeFile(sourcePath, JSON.stringify(missingEvidenceSource));
  await assert.rejects(
    saveContinuationCheckpoint({ sourcePath, checkpointPath, expectedPartCount: 2 }),
    /Ugyldig kompakt transport-evidens/,
  );

  const metadataMismatchSource = structuredClone(transitionSource);
  metadataMismatchSource.datasetId = 'candidate-g-metadata-oracle-mismatch';
  for (const partId of parts) {
    const nextState = metadataMismatchSource.coastalParts.parts[partId].ravScore.currentState;
    nextState.transportMemoryReady = false;
    nextState.transportMemoryStatus = 'WINDOW_INCOMPLETE';
    nextState.transportMemoryCoverageHours = 47;
  }
  await fs.writeFile(sourcePath, JSON.stringify(metadataMismatchSource));
  await fs.writeFile(targetPath, JSON.stringify(target));
  await saveContinuationCheckpoint({ sourcePath, checkpointPath, expectedPartCount: 2 });
  const targetBeforeMetadataMismatch = await fs.readFile(targetPath, 'utf8');
  const metadataMismatch = await restoreContinuationCheckpoint({
    targetPath,
    checkpointPath,
    targetReference: at(11),
    expectedPartCount: 2,
  });
  assert.equal(metadataMismatch.restored, false);
  assert.equal(metadataMismatch.reason, 'checkpoint-model-context-incompatible');
  assert.equal(metadataMismatch.targetUnchanged, true);
  assert.equal(await fs.readFile(targetPath, 'utf8'), targetBeforeMetadataMismatch);

  const excessiveReferenceGapSource = structuredClone(transitionSource);
  excessiveReferenceGapSource.coastalParts.parts['part-a'].ravScore.currentState.transportReferenceAt = at(6);
  await fs.writeFile(sourcePath, JSON.stringify(excessiveReferenceGapSource));
  await assert.rejects(
    saveContinuationCheckpoint({ sourcePath, checkpointPath, expectedPartCount: 2 }),
    /Ugyldig kompakt Candidate G-state/,
  );

  const mixedSource = structuredClone(transitionSource);
  mixedSource.datasetId = 'mixed-model-runtime';
  mixedSource.coastalParts.parts['part-a'] = {
    ...mixedSource.coastalParts.parts['part-a'],
    candidateG: { currentState: state('part-a', 10, true) },
  };
  delete mixedSource.coastalParts.parts['part-a'].ravScore;
  await fs.writeFile(sourcePath, JSON.stringify(mixedSource));
  await fs.writeFile(targetPath, JSON.stringify(target));
  await saveContinuationCheckpoint({ sourcePath, checkpointPath, expectedPartCount: 2 });
  const targetBeforeMixedRestore = await fs.readFile(targetPath, 'utf8');
  const mixed = await restoreContinuationCheckpoint({
    targetPath,
    checkpointPath,
    targetReference: at(11),
    expectedPartCount: 2,
  });
  assert.equal(mixed.restored, false);
  assert.equal(mixed.reason, 'checkpoint-model-context-mixed');
  assert.equal(mixed.sourceContextCount, 2);
  assert.equal(mixed.targetUnchanged, true);
  assert.equal(await fs.readFile(targetPath, 'utf8'), targetBeforeMixedRestore);

  const regressedSource = structuredClone(source);
  regressedSource.datasetId = 'per-part-time-regression';
  regressedSource.productionReferenceAt = at(10);
  regressedSource.coastalParts.parts['part-a'].candidateG.currentState = state('part-a', -1, true);
  await fs.writeFile(sourcePath, JSON.stringify(regressedSource));
  await fs.writeFile(targetPath, JSON.stringify(target));
  await saveContinuationCheckpoint({ sourcePath, checkpointPath, expectedPartCount: 2 });
  const targetBeforeRegressedRestore = await fs.readFile(targetPath, 'utf8');
  const regressed = await restoreContinuationCheckpoint({
    targetPath,
    checkpointPath,
    targetReference: at(11),
    expectedPartCount: 2,
  });
  assert.equal(regressed.restored, false);
  assert.equal(regressed.reason, 'checkpoint-state-regression');
  assert.equal(regressed.regressedPartCount, 1);
  assert.equal(regressed.targetUnchanged, true);
  assert.equal(await fs.readFile(targetPath, 'utf8'), targetBeforeRegressedRestore);

  const unsupportedSource = structuredClone(transitionSource);
  unsupportedSource.datasetId = 'unsupported-model-runtime';
  for (const partId of parts) {
    unsupportedSource.coastalParts.parts[partId].ravScore.currentState.modelId = 'UNSUPPORTED-MODEL';
  }
  await fs.writeFile(sourcePath, JSON.stringify(unsupportedSource));
  await fs.writeFile(targetPath, JSON.stringify(target));
  const targetBeforeUnsupportedRestore = await fs.readFile(targetPath, 'utf8');
  await assert.rejects(
    saveContinuationCheckpoint({ sourcePath, checkpointPath, expectedPartCount: 2 }),
    /state og rekonstruktionsproveniens matcher ikke/,
  );
  assert.equal(await fs.readFile(targetPath, 'utf8'), targetBeforeUnsupportedRestore);

  const matchedUnknownSource = structuredClone(source);
  matchedUnknownSource.datasetId = 'matched-unknown-source';
  const matchedUnknownTarget = structuredClone(target);
  for (const partId of parts) {
    matchedUnknownSource.coastalParts.parts[partId].candidateG.currentState.modelId = 'UNKNOWN-MODEL';
    matchedUnknownTarget.coastalParts.parts[partId].candidateG.currentState.modelId = 'UNKNOWN-MODEL';
  }
  await fs.writeFile(sourcePath, JSON.stringify(matchedUnknownSource));
  await fs.writeFile(targetPath, JSON.stringify(matchedUnknownTarget));
  const targetBeforeMatchedUnknownRestore = await fs.readFile(targetPath, 'utf8');
  await assert.rejects(
    saveContinuationCheckpoint({ sourcePath, checkpointPath, expectedPartCount: 2 }),
    /state og rekonstruktionsproveniens matcher ikke/,
  );
  assert.equal(await fs.readFile(targetPath, 'utf8'), targetBeforeMatchedUnknownRestore);

  const matchedSchemaThreeTarget = structuredClone(target);
  for (const partId of parts) {
    matchedSchemaThreeTarget.coastalParts.parts[partId].candidateG.currentState = {
      ...transitionSource.coastalParts.parts[partId].ravScore.currentState,
      time: at(0),
      transportReferenceAt: at(0),
      transportEvidence: state(partId, 0, true).transportEvidence,
    };
  }
  await fs.writeFile(sourcePath, JSON.stringify(transitionSource));
  await fs.writeFile(targetPath, JSON.stringify(matchedSchemaThreeTarget));
  await saveContinuationCheckpoint({ sourcePath, checkpointPath, expectedPartCount: 2 });
  const targetBeforeMatchedSchemaThreeRestore = await fs.readFile(targetPath, 'utf8');
  const matchedSchemaThree = await restoreContinuationCheckpoint({
    targetPath,
    checkpointPath,
    targetReference: at(11),
    expectedPartCount: 2,
  });
  assert.equal(matchedSchemaThree.restored, false);
  assert.equal(matchedSchemaThree.reason, 'checkpoint-model-context-incompatible');
  assert.equal(matchedSchemaThree.targetUnchanged, true);
  assert.equal(await fs.readFile(targetPath, 'utf8'), targetBeforeMatchedSchemaThreeRestore);
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

console.log('Candidate G generic compact continuation checkpoint: OK');
