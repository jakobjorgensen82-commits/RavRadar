import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  TRIP_EVIDENCE_SCHEMA_VERSION,
  assertTripEvidencePrivacy,
  buildTripEvidence,
  completeTripEvidence,
  createCalibrationFeatureSnapshot,
  createForecastSnapshotReference,
  createTripStartRecord,
  toObservationTripColumns
} from '../js/services/trip-evidence-contract.js';

const calibrationFeatures = createCalibrationFeatureSnapshot({
  modelVersion: 'ravscore-4.0.242',
  appVersion: '4.0.242',
  totalScore: 63,
  huntabilityScore: 74,
  transportScore: 61,
  mobilisationScore: 58,
  windSpeedMs: 8.4,
  windDirectionDeg: 275,
  waveHeightM: 1.4,
  wavePeriodS: 6.8,
  waveDirectionDeg: 282,
  currentSpeedMs: 0.31,
  currentDirectionDeg: 268,
  waterLevelM: 0.22,
  waterLevelTrendM3h: -0.08,
  maxWaveHeight24hM: 2.1,
  hoursSinceEnergyPeak: 7,
  sustainedOnshoreHours: 5,
  reasonCodes: ['falling-water', 'recent-wave-energy']
});
assert.equal(Object.keys(calibrationFeatures).includes('u'), false);
assert.equal(Object.keys(calibrationFeatures).includes('v'), false);

const snapshotReference = createForecastSnapshotReference({
  manifest: { datasetId: 'rr-20260821025000-210' },
  conditions: {
    datasetId: 'rr-20260821025000-210',
    generatedAt: '2026-08-21T02:50:00.000Z',
    productionReferenceAt: '2026-08-21T02:00:00.000Z'
  },
  validAt: '2026-08-21T03:30:00.000Z',
  capturedAt: '2026-08-21T03:10:00.000Z'
});
assert.deepEqual(snapshotReference, {
  id: 'rr-20260821025000-210',
  issuedAt: '2026-08-21T02:00:00.000Z',
  validAt: '2026-08-21T03:30:00.000Z',
  capturedAt: '2026-08-21T03:10:00.000Z'
});
assert.throws(() => createForecastSnapshotReference({
  manifest: { datasetId: 'dataset-a' },
  conditions: { datasetId: 'dataset-b', generatedAt: '2026-08-21T02:50:00.000Z' },
  capturedAt: '2026-08-21T03:10:00.000Z'
}), /ikke samme datasæt/);

const input = {
  tripId: 'trip-20260821-001',
  startedAt: '2026-08-21T03:10:00.000Z',
  endedAt: '2026-08-21T04:00:00.000Z',
  mode: 'waders',
  zoneId: 'zone-42',
  coastalPartId: 'zone-42-part-2',
  searchCoverage: 'thorough',
  found: true,
  grams: '12.5',
  route: [{ latitude: 55.1, longitude: 8.2 }],
  forecastSnapshot: {
    id: 'rr-20260821025000-210',
    issuedAt: '2026-08-21T02:50:00.000Z',
    validAt: '2026-08-21T03:30:00.000Z',
    capturedAt: '2026-08-21T03:10:00.000Z'
  },
  calibrationFeatures
};

const evidence = buildTripEvidence(input);
assert.equal(evidence.schemaVersion, TRIP_EVIDENCE_SCHEMA_VERSION);
assert.equal(evidence.searchMinutes, 50);
assert.equal(evidence.observedAt, '2026-08-21T03:35:00.000Z');
assert.equal(evidence.grams, 12.5);
assert.equal(evidence.calibrationEligible, true);
assert.equal('route' in evidence, false);

const columns = toObservationTripColumns(evidence);
assert.equal(columns.schema_version, 2);
assert.equal(columns.result, 'medium');
assert.equal(columns.coastal_part_id, 'zone-42-part-2');
assert.equal(columns.forecast_snapshot_id, 'rr-20260821025000-210');
assert.equal(columns.calibration_features.totalScore, 63);
assertTripEvidencePrivacy(columns);

const startRecord = createTripStartRecord({
  tripId: input.tripId,
  startedAt: input.startedAt,
  mode: input.mode,
  zoneId: input.zoneId,
  coastalPartId: input.coastalPartId,
  forecastSnapshot: input.forecastSnapshot,
  calibrationFeatures
});
const completed = completeTripEvidence(startRecord, {
  endedAt: input.endedAt,
  zoneId: input.zoneId,
  coastalPartId: 'zone-42-part-3',
  searchCoverage: input.searchCoverage,
  found: input.found,
  grams: input.grams
});
assert.equal(completed.calibrationEligible, false);
assert.equal(completed.forecastCoastalPartId, 'zone-42-part-2');
assert.equal(completed.coastalPartId, 'zone-42-part-3');

const noFind = buildTripEvidence({ ...input, found: false, grams: 99 });
assert.equal(noFind.grams, null);
assert.equal(toObservationTripColumns(noFind).result, 'none');

assert.throws(() => buildTripEvidence({ ...input, coastalPartId: '' }), /Kystdel/);
assert.throws(() => buildTripEvidence({ ...input, searchCoverage: 'unknown' }), /Søgegrundighed/);
assert.throws(() => buildTripEvidence({ ...input, endedAt: input.startedAt }), /efter starttid/);
assert.throws(() => buildTripEvidence({
  ...input,
  forecastSnapshot: { ...input.forecastSnapshot, issuedAt: '2026-08-21T03:11:00.000Z' }
}), /udstedt efter/);
assert.throws(() => assertTripEvidencePrivacy({ nested: { gpsTrack: [] } }), /Præcis position/);

const migration = fs.readFileSync('supabase/migrations/20260821_trip_evidence_contract.sql', 'utf8');
for (const column of [
  'schema_version', 'trip_id', 'trip_started_at', 'trip_ended_at', 'search_minutes',
  'search_coverage', 'coastal_part_id', 'forecast_zone_id', 'forecast_coastal_part_id',
  'calibration_eligible', 'calibration_features', 'found', 'forecast_snapshot_id',
  'forecast_issued_at', 'forecast_valid_at', 'forecast_captured_at'
]) assert.match(migration, new RegExp(`\\b${column}\\b`));
assert.doesNotMatch(migration, /\b(?:delete|update)\s+(?:from\s+)?ravradar_observations\b/i);
assert.doesNotMatch(migration, /\b(?:latitude|longitude|gps|route|track)\b/i);

console.log('Trip evidence contract: OK');
