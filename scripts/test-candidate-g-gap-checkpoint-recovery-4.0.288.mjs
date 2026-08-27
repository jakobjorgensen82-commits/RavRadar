import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  assessGapCheckpointRecovery,
  restoreGapCheckpoint,
} from './restore-candidate-g-gap-checkpoint.mjs';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-gap-checkpoint-target-'));
const sourceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-gap-checkpoint-source-'));
const at = hour => new Date(Date.parse('2026-08-27T00:00:00.000Z') + hour * 3_600_000).toISOString();
const state = partId => ({
  schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
  modelId: CANDIDATE_G_STATE_MODEL_ID,
  variantId: CANDIDATE_G_STATE_VARIANT_ID,
  profileId: CANDIDATE_G_STATE_PROFILE_ID,
  stateKey: `state-${partId}`,
  time: at(9),
  transportReferenceAt: at(9),
  transportPotential: 60,
  outboundEpisodeEffectiveHours: 0,
  transportMemoryReady: false,
  transportMemoryStatus: 'WINDOW_HAS_TIME_GAP',
  transportMemoryWindowHours: 48,
  transportMemoryCoverageHours: 0,
  transportEvidence: [{ time: at(0), strength: 0.2 }, { time: at(9), strength: 0.4 }],
  mobilisationPotential: 53,
});
const sourceRows = ['part-a', 'part-b'].map(partId => [partId, state(partId)]);
const sourceStateSha256 = crypto.createHash('sha256').update(JSON.stringify(sourceRows)).digest('hex');
const target = {
  datasetId: 'last-ready',
  productionReferenceAt: at(0),
  weatherMarker: 'must-remain',
  coastalParts: {
    parts: Object.fromEntries(sourceRows.map(([partId, sourceState]) => [partId, {
      current: { weather: { marker: `weather-${partId}` }, waders: { score: 80 } },
      candidateG: { currentState: { ...sourceState, time: at(0), transportReferenceAt: at(0), transportMemoryReady: true, transportMemoryStatus: 'READY', transportMemoryCoverageHours: 48, transportEvidence: [{ time: at(0), strength: 0.2 }] } },
    }])),
  },
};
const source = {
  datasetId: 'failed-fresh-checkpoint',
  productionReferenceAt: at(9),
  coastalParts: {
    parts: Object.fromEntries(sourceRows.map(([partId, currentState]) => [partId, {
      candidateG: { currentState },
    }])),
  },
};
const config = {
  schemaVersion: 1,
  enabled: true,
  targetDatasetId: target.datasetId,
  targetProductionReferenceAt: target.productionReferenceAt,
  sourceRunId: '123',
  sourceArtifactName: 'support',
  sourceDatasetId: source.datasetId,
  sourceProductionReferenceAt: source.productionReferenceAt,
  sourcePartCount: sourceRows.length,
  sourceStateSha256,
  maximumResumeGapHours: 3,
};

try {
  await fs.mkdir(path.join(root, 'data', 'admin'), { recursive: true });
  await fs.mkdir(path.join(root, 'data', 'live'), { recursive: true });
  await fs.mkdir(path.join(sourceRoot, 'data', 'live'), { recursive: true });
  await fs.writeFile(path.join(root, 'data', 'admin', 'candidate-g-gap-checkpoint-recovery.json'), JSON.stringify(config));
  await fs.writeFile(path.join(root, 'data', 'live', 'conditions.json'), JSON.stringify(target));
  await fs.writeFile(path.join(sourceRoot, 'data', 'live', 'conditions.json'), JSON.stringify(source));

  assert.equal((await assessGapCheckpointRecovery({ root, targetReference: at(11) })).required, true);
  assert.equal((await assessGapCheckpointRecovery({ root, targetReference: at(13) })).required, false,
    '09-checkpointet må ikke genbruges, hvis næste produktion ligger mere end tre timer senere');
  const restored = await restoreGapCheckpoint({ root, sourceRoot, targetReference: at(11) });
  assert.equal(restored.restored, true);
  assert.equal(restored.partCount, 2);
  assert.equal(restored.copiedWeather, false);
  assert.equal(restored.copiedScores, false);
  const result = JSON.parse(await fs.readFile(path.join(root, 'data', 'live', 'conditions.json'), 'utf8'));
  assert.equal(result.weatherMarker, 'must-remain');
  assert.equal(result.coastalParts.parts['part-a'].current.weather.marker, 'weather-part-a');
  assert.equal(result.coastalParts.parts['part-a'].current.waders.score, 80);
  const restoredState = result.coastalParts.parts['part-a'].candidateG.currentState;
  assert.equal(restoredState.time, at(9));
  assert.equal(restoredState.transportMemoryReady, false);
  assert.equal(restoredState.transportMemoryStatus, 'WINDOW_INCOMPLETE');
  assert.equal(restoredState.transportMemoryCoverageHours, 0);
  assert.deepEqual(restoredState.transportEvidence, [{ time: at(9), strength: 0.4 }]);

  source.coastalParts.parts['part-a'].candidateG.currentState.transportPotential = 99;
  await fs.writeFile(path.join(root, 'data', 'live', 'conditions.json'), JSON.stringify(target));
  await fs.writeFile(path.join(sourceRoot, 'data', 'live', 'conditions.json'), JSON.stringify(source));
  await assert.rejects(
    restoreGapCheckpoint({ root, sourceRoot, targetReference: at(11) }),
    /låste integritet/,
  );
} finally {
  await fs.rm(root, { recursive: true, force: true });
  await fs.rm(sourceRoot, { recursive: true, force: true });
}

console.log('Candidate G failed-run compact checkpoint recovery: OK');
