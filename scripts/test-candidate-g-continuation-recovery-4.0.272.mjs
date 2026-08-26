import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  assessRecovery,
  restoreContinuation,
} from './restore-candidate-g-continuation.mjs';

const workflow = await fs.readFile('.github/workflows/update-and-deploy.yml', 'utf8');
for (const marker of [
  'RAVRADAR_HYDRATE_TIMEOUT_SECONDS: 180',
  'actions: read',
  'actions/download-artifact@v8',
  'run-id: ${{ steps.candidate-g-recovery.outputs.source_run_id }}',
  'node scripts/restore-candidate-g-continuation.mjs',
]) {
  assert.match(workflow, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `produktionsworkflowet mangler recovery-kontrakten: ${marker}`);
}

const targetRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-candidate-g-target-'));
const sourceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-candidate-g-source-'));
const state = partId => ({
  schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
  modelId: CANDIDATE_G_STATE_MODEL_ID,
  variantId: CANDIDATE_G_STATE_VARIANT_ID,
  profileId: CANDIDATE_G_STATE_PROFILE_ID,
  stateKey: `state-key-${partId}`,
  time: '2026-08-24T15:00:00.000Z',
  transportPotential: partId === 'part-a' ? 61 : 42,
  outboundEpisodeEffectiveHours: 0,
  transportMemoryReady: false,
  transportMemoryStatus: 'WINDOW_INCOMPLETE',
  transportMemoryWindowHours: 48,
  transportMemoryCoverageHours: 30,
  transportEvidence: [
    { time: '2026-08-24T12:00:00.000Z', strength: 0.2 },
    { time: '2026-08-24T15:00:00.000Z', strength: 0.4 },
  ],
  mobilisationPotential: 53,
});
const sourceRows = ['part-a', 'part-b'].map(partId => [partId, state(partId)]);
const sourceHash = crypto.createHash('sha256').update(JSON.stringify(sourceRows)).digest('hex');
const sourceConditions = {
  datasetId: 'source-healthy',
  coastalParts: {
    parts: Object.fromEntries(sourceRows.map(([partId, currentState]) => [partId, {
      candidateG: { initialStateAccepted: true, currentState },
    }])),
  },
};
const targetConditions = {
  datasetId: 'target-later-in-poisoned-lineage',
  generatedAt: '2026-08-24T17:22:23.341Z',
  untouchedWeatherMarker: 'must-remain-identical',
  coastalParts: {
    parts: Object.fromEntries(sourceRows.map(([partId]) => [partId, {
      zoneId: `zone-${partId}`,
      current: { weather: { marker: `weather-${partId}` } },
      candidateG: {
        initialStateAccepted: false,
        initialStateResetReason: 'NO_PREVIOUS_STATE',
        currentState: {
          ...state(partId),
          time: '2026-08-24T17:00:00.000Z',
          transportPotential: 0,
          transportMemoryCoverageHours: 2,
          transportEvidence: [
            { time: '2026-08-24T15:00:00.000Z', strength: 0.1 },
            { time: '2026-08-24T17:00:00.000Z', strength: 0.2 },
          ],
          mobilisationPotential: 0,
        },
      },
    }])),
  },
};
const config = {
  schemaVersion: 1,
  enabled: true,
  targetDatasetId: 'target-bad',
  poisonedLineage: {
    resetReferenceAt: '2026-08-24T15:00:00.000Z',
    datasetGeneratedAtNotBefore: '2026-08-24T15:56:47.000Z',
    datasetGeneratedAtBefore: '2026-08-25T16:00:00.000Z',
    minimumAffectedPartRatio: 0.99,
  },
  sourceRunId: '12345',
  sourceDatasetId: 'source-healthy',
  sourcePartCount: 2,
  sourceStateSha256: sourceHash,
};

try {
  await fs.mkdir(path.join(targetRoot, 'data', 'admin'), { recursive: true });
  await fs.mkdir(path.join(targetRoot, 'data', 'live'), { recursive: true });
  await fs.mkdir(path.join(sourceRoot, 'data', 'live'), { recursive: true });
  await fs.writeFile(path.join(targetRoot, 'data', 'admin', 'candidate-g-continuation-recovery.json'), JSON.stringify(config));
  await fs.writeFile(path.join(targetRoot, 'data', 'live', 'conditions.json'), JSON.stringify(targetConditions));
  await fs.writeFile(path.join(sourceRoot, 'data', 'live', 'manifest.json'), JSON.stringify({ datasetId: 'source-healthy' }));
  await fs.writeFile(path.join(sourceRoot, 'data', 'live', 'conditions.json'), JSON.stringify(sourceConditions));

  const assessment = await assessRecovery({ root: targetRoot });
  assert.equal(assessment.required, true);
  assert.equal(assessment.sourceRunId, '12345');

  const restored = await restoreContinuation({ root: targetRoot, sourceRoot });
  assert.equal(restored.restored, true);
  assert.equal(restored.partCount, 2);
  const result = JSON.parse(await fs.readFile(path.join(targetRoot, 'data', 'live', 'conditions.json'), 'utf8'));
  assert.equal(result.datasetId, 'target-later-in-poisoned-lineage');
  assert.equal(result.untouchedWeatherMarker, 'must-remain-identical');
  assert.equal(result.coastalParts.parts['part-a'].current.weather.marker, 'weather-part-a');
  assert.deepEqual(result.coastalParts.parts['part-a'].candidateG.currentState, state('part-a'));
  assert.equal(result.coastalParts.parts['part-a'].candidateG.initialStateResetReason, 'NO_PREVIOUS_STATE');

  const postAssessment = await assessRecovery({ root: targetRoot });
  assert.equal(postAssessment.required, false,
    'the restored pre-reset history must make the one-time recovery dormant immediately');

  await fs.writeFile(path.join(targetRoot, 'data', 'live', 'conditions.json'), JSON.stringify(targetConditions));
  sourceConditions.coastalParts.parts['part-a'].candidateG.currentState.transportPotential = 99;
  await fs.writeFile(path.join(sourceRoot, 'data', 'live', 'conditions.json'), JSON.stringify(sourceConditions));
  await assert.rejects(
    restoreContinuation({ root: targetRoot, sourceRoot }),
    /matcher ikke den godkendte integritet/,
  );

  const phaseTime = hour => new Date(Date.parse('2026-08-24T15:00:00.000Z')
    + (hour * 3_600_000)).toISOString();
  const healthyPhaseState = partId => ({
    ...state(partId),
    time: phaseTime(48),
    transportReferenceAt: phaseTime(48),
    transportMemoryReady: true,
    transportMemoryStatus: 'READY',
    transportMemoryCoverageHours: 48,
    transportEvidence: Array.from({ length: 17 }, (_, index) => ({
      time: phaseTime(index * 3),
      strength: partId === 'part-a' ? 0.2 : -0.1,
    })),
  });
  const poisonedPhaseState = partId => ({
    ...healthyPhaseState(partId),
    time: phaseTime(49),
    transportReferenceAt: phaseTime(49),
    transportMemoryReady: false,
    transportMemoryStatus: 'WINDOW_INCOMPLETE',
    transportMemoryCoverageHours: 46,
    transportEvidence: [
      ...healthyPhaseState(partId).transportEvidence.slice(1),
      { time: phaseTime(49), strength: partId === 'part-a' ? 0.2 : -0.1 },
    ],
  });
  const phaseSourceRows = ['part-a', 'part-b']
    .map(partId => [partId, healthyPhaseState(partId)]);
  const phaseSourceHash = crypto.createHash('sha256')
    .update(JSON.stringify(phaseSourceRows)).digest('hex');
  const phaseSourceConditions = {
    datasetId: 'source-before-phase-shift',
    coastalParts: {
      parts: Object.fromEntries(phaseSourceRows.map(([partId, currentState]) => [partId, {
        candidateG: { initialStateAccepted: true, currentState },
      }])),
    },
  };
  const phaseTargetConditions = {
    datasetId: 'target-after-phase-shift',
    generatedAt: '2026-08-26T16:30:00.000Z',
    coastalParts: {
      parts: Object.fromEntries(['part-a', 'part-b'].map(partId => [partId, {
        candidateG: {
          initialStateAccepted: true,
          initialStateResetReason: null,
          currentState: poisonedPhaseState(partId),
        },
      }])),
    },
  };
  const phaseConfig = {
    schemaVersion: 1,
    enabled: true,
    restoreStrategy: 'merge-transport-evidence',
    targetDatasetId: 'target-after-phase-shift',
    minimumRecoveredReadyPartRatio: 1,
    poisonedLineage: {
      kind: 'accepted-cadence-phase-window-incomplete',
      datasetGeneratedAtNotBefore: '2026-08-26T16:00:00.000Z',
      datasetGeneratedAtBefore: '2026-08-27T00:00:00.000Z',
      minimumAffectedPartRatio: 1,
      minimumCoverageHours: 45,
      maximumCoverageHoursExclusive: 48,
    },
    sourceRunId: '67890',
    sourceDatasetId: 'source-before-phase-shift',
    sourcePartCount: 2,
    sourceStateSha256: phaseSourceHash,
  };
  await fs.writeFile(path.join(targetRoot, 'data', 'admin', 'candidate-g-continuation-recovery.json'),
    JSON.stringify(phaseConfig));
  await fs.writeFile(path.join(targetRoot, 'data', 'live', 'conditions.json'),
    JSON.stringify(phaseTargetConditions));
  await fs.writeFile(path.join(sourceRoot, 'data', 'live', 'manifest.json'),
    JSON.stringify({ datasetId: 'source-before-phase-shift' }));
  await fs.writeFile(path.join(sourceRoot, 'data', 'live', 'conditions.json'),
    JSON.stringify(phaseSourceConditions));

  const phaseAssessment = await assessRecovery({ root: targetRoot });
  assert.equal(phaseAssessment.required, true);
  const phaseRestored = await restoreContinuation({ root: targetRoot, sourceRoot });
  assert.equal(phaseRestored.strategy, 'merge-transport-evidence');
  assert.equal(phaseRestored.recoveredReadyPartCount, 2);
  const phaseResult = JSON.parse(await fs.readFile(
    path.join(targetRoot, 'data', 'live', 'conditions.json'), 'utf8'));
  for (const part of Object.values(phaseResult.coastalParts.parts)) {
    assert.equal(part.candidateG.currentState.transportMemoryReady, true);
    assert.equal(part.candidateG.currentState.transportMemoryStatus, 'READY');
    assert.equal(part.candidateG.currentState.transportMemoryCoverageHours, 48);
    assert.equal(part.candidateG.currentState.transportEvidence.length, 18,
      'recovery must retain the real compact predecessor for the next rolling boundary');
  }
  const phasePostAssessment = await assessRecovery({ root: targetRoot });
  assert.equal(phasePostAssessment.required, false,
    'the cadence-phase recovery must become dormant after READY coverage is restored');

  console.log('OK: kun kompakt, eksakt verificeret Candidate G-fortsættelse genoptages eller cadence-samles.');
} finally {
  await fs.rm(targetRoot, { recursive: true, force: true });
  await fs.rm(sourceRoot, { recursive: true, force: true });
}
