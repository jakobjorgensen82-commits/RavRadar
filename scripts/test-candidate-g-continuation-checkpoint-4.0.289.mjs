import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  restoreContinuationCheckpoint,
  saveContinuationCheckpoint,
} from './candidate-g-continuation-checkpoint.mjs';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-continuation-checkpoint-'));
const sourcePath = path.join(root, 'source.json');
const targetPath = path.join(root, 'target.json');
const checkpointPath = path.join(root, 'cache', 'checkpoint.json');
const at = hour => new Date(Date.parse('2026-08-27T00:00:00.000Z') + hour * 3_600_000).toISOString();
const state = (partId, hour, ready = false) => ({
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
  transportMemoryCoverageHours: ready ? 48 : 9,
  transportEvidence: [{ time: at(hour), strength: 0.4 }],
  mobilisationPotential: 53,
});
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
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

console.log('Candidate G generic compact continuation checkpoint: OK');
