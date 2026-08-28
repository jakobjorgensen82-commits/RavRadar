import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  NEXT_RAVSCORE_CONTRACT_VERSION,
  NEXT_RAVSCORE_MODEL_ID,
  NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-next-generation.js';
import { selectLocalBestForDay } from '../js/core/local-zone-score.js';
import { createTripStartFromPublicState } from '../js/services/trip-evidence-public-adapter.js';
import { buildImmutableWeatherSnapshot } from '../js/services/observation-service.js';

const app = fs.readFileSync('app.js', 'utf8');
const observations = fs.readFileSync('js/services/observation-service.js', 'utf8');
assert.match(app, /coastalPart\?\.current\?\.\[state\.mode\]\?\.scoreProfileId/);
assert.match(app, /coastalParts\?\.scoreProfile\?\.activeProfileId/);
assert.match(observations, /model_version:scoreResult\?\.scoreProfileId\?\?prediction\?\.modelVersion/);
assert.match(observations, /modelVersion:scoreResult\?\.scoreProfileId\?\?prediction\?\.modelVersion/);
assert.match(observations, /modelContractVersion:scoreResult\?\.modelContractVersion\?\?null/);
assert.match(observations, /stateSchemaVersion:scoreResult\?\.stateSchemaVersion\?\?null/);

const modelState = {
  score: 64,
  components: { huntability: 70, transport: 58, release: 76 },
  scoreProfileId: NEXT_RAVSCORE_MODEL_ID,
  modelContractVersion: NEXT_RAVSCORE_CONTRACT_VERSION,
  stateSchemaVersion: NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
  explanationContractVersion: NEXT_RAVSCORE_CONTRACT_VERSION,
};
const record = createTripStartFromPublicState({
  tripId: '00000000-0000-4000-8000-000000000001',
  startedAt: '2026-08-28T12:00:00.000Z',
  mode: 'beach',
  zoneId: 'zone-1',
  coastalPartId: 'part-1',
  appVersion: '4.0.305',
  modelVersion: modelState.scoreProfileId,
  manifest: { datasetId: 'dataset-1', generatedAt: '2026-08-28T11:00:00.000Z' },
  conditions: {
    available: true,
    datasetId: 'dataset-1',
    generatedAt: '2026-08-28T11:00:00.000Z',
    zones: { 'zone-1': { current: {
      windSpeedMps: 5, windDirectionDeg: 270, waveHeightM: 1.2, wavePeriodS: 7,
      waveDirectionDeg: 280, currentSpeedMps: 0.1, currentDirectionDeg: 90,
      waterLevelCm: 12, waterLevelTrendCm3h: -2,
    }, history: {} } },
  },
  coastalPart: {
    zoneId: 'zone-1',
    current: { time: '2026-08-28T12:00:00.000Z', beach: modelState },
  },
});
assert.equal(record.calibrationFeatures.modelVersion, NEXT_RAVSCORE_MODEL_ID);
assert.equal(record.calibrationFeatures.modelContractVersion, NEXT_RAVSCORE_CONTRACT_VERSION);
assert.equal(record.calibrationFeatures.stateSchemaVersion, NEXT_RAVSCORE_STATE_SCHEMA_VERSION);
assert.equal(record.calibrationFeatures.explanationContractVersion, NEXT_RAVSCORE_CONTRACT_VERSION);
assert.equal(record.calibrationFeatures.totalScore, 64);
assert.equal(record.calibrationFeatures.huntabilityScore, 70);
assert.equal(record.calibrationFeatures.transportScore, 58);
assert.equal(record.calibrationFeatures.mobilisationScore, 76);

const observationSnapshot = buildImmutableWeatherSnapshot(
  { generatedAt: '2026-08-28T11:00:00.000Z', time: '2026-08-28T12:00:00.000Z' },
  modelState,
  null,
  { capturedAt: '2026-08-28T12:01:00.000Z' },
);
assert.equal(observationSnapshot.schemaVersion, 4);
assert.equal(observationSnapshot.score.modelVersion, NEXT_RAVSCORE_MODEL_ID);
assert.equal(observationSnapshot.score.modelContractVersion, NEXT_RAVSCORE_CONTRACT_VERSION);
assert.equal(observationSnapshot.score.stateSchemaVersion, NEXT_RAVSCORE_STATE_SCHEMA_VERSION);
assert.equal(observationSnapshot.score.explanationContractVersion, NEXT_RAVSCORE_CONTRACT_VERSION);

const localBest = selectLocalBestForDay({
  coastalParts: {
    enabled: true,
    generatedAt: '2026-08-28T06:00:00.000Z',
    zones: { 'zone-1': { hourly: [
      { time: '2026-08-28T08:00:00.000Z', weather: { waterLevelCm: 0, waterLevelTrendCm3h: 6 }, beach: { score: 60, status: 'whole-zone', comparisonPartCount: 2, winningPartId: 'part-1' } },
      { time: '2026-08-28T09:00:00.000Z', weather: { waterLevelCm: 0, waterLevelTrendCm3h: -6 }, beach: { score: 60, status: 'whole-zone', comparisonPartCount: 2, winningPartId: 'part-1' } },
    ] } },
    parts: { 'part-1': { current: {} } },
  },
  zoneId: 'zone-1',
  mode: 'beach',
  date: '2026-08-28',
});
assert.equal(localBest.hour.time, '2026-08-28T09:00:00.000Z',
  'Femdøgnsvisningen skal foretrække faldende vand ved en ellers identisk RavScore');

console.log('OK: konto-, tur- og observationskæder binder den offentlige score til den integrerede model-id.');
