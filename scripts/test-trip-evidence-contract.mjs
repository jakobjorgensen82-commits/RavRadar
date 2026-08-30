import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  TRIP_EVIDENCE_SCHEMA_VERSION,
  PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG,
  RECONSTRUCTED_RAVSCORE_QUALITY_FLAG,
  UNATTESTED_RAVSCORE_QUALITY_FLAG,
  assertTripEvidencePrivacy,
  buildTripEvidence,
  completeTripEvidence,
  createCalibrationFeatureSnapshot,
  createForecastSnapshotReference,
  createTripStartRecord,
  migrateLegacyUnattestedObservationColumns,
  toObservationTripColumns
} from '../js/services/trip-evidence-contract.js';
import {
  beginTripEvidence,
  finishTripEvidence,
  listPendingTripEvidence,
  loadActiveTripEvidence,
  markTripEvidenceStopped,
  markTripEvidenceSubmitted,
  tripEvidenceStorageKeys
} from '../js/services/trip-evidence-store.js';
import { uploadPendingTripEvidence } from '../js/services/trip-evidence-upload.js';
import { createTripEvidenceController } from '../js/services/trip-evidence-controller.js';
import { createTripStartFromPublicState } from '../js/services/trip-evidence-public-adapter.js';
import { buildPublicConditionDetails } from './public-conditions-lib.mjs';
import { createPublicTripEvidenceRuntime } from '../js/services/trip-evidence-runtime.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const verifiedOnlyTrust = Object.freeze({
  schemaVersion: 1,
  status: 'VERIFIED_ONLY',
  calibrationEligible: true,
  hardObservedOuttransportEligible: true,
  incidentId: null,
  affectedPartCount: 0,
  syntheticSampleCount: 0,
  activeUntil: null
});

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
  manifest: { datasetId: 'rr-20260821025000-210', ravScoreEvidenceTrust: verifiedOnlyTrust },
  conditions: {
    datasetId: 'rr-20260821025000-210',
    generatedAt: '2026-08-21T02:50:00.000Z',
    ravScoreEvidenceTrust: verifiedOnlyTrust,
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
  tripId: '11111111-1111-4111-8111-111111111111',
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
  calibrationFeatures,
  forecastCalibrationEligible: true,
  dataQualityFlags: []
};

const { dataQualityFlags: omittedInputFlags, ...inputWithoutQualityFlags } = input;
assert.equal(omittedInputFlags.length, 0);
assert.throws(() => buildTripEvidence(inputWithoutQualityFlags), /Datakvalitetsflag skal være en liste/);
assert.throws(() => buildTripEvidence({ ...input, dataQualityFlags: undefined }), /Datakvalitetsflag skal være en liste/);
assert.throws(() => buildTripEvidence({ ...input, forecastCalibrationEligible: undefined }), /eksplicit kalibreringsstatus/);

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
assert.equal(columns.actual_zone_id, 'zone-42');
assert.equal(columns.actual_coastal_part_id, 'zone-42-part-2');
assert.equal('zone_id' in columns, false);
assert.equal(columns.forecast_snapshot_id, 'rr-20260821025000-210');
assert.equal(columns.calibration_features.totalScore, 63);
assertTripEvidencePrivacy(columns);
const legacyObservationColumns = structuredClone(columns);
delete legacyObservationColumns.data_quality_flags;
const migratedLegacyObservationColumns = migrateLegacyUnattestedObservationColumns(legacyObservationColumns);
assert.equal(migratedLegacyObservationColumns.calibration_eligible, false);
assert.deepEqual(migratedLegacyObservationColumns.data_quality_flags, [UNATTESTED_RAVSCORE_QUALITY_FLAG]);
assert.ok(migratedLegacyObservationColumns.calibration_features.reasonCodes.includes(UNATTESTED_RAVSCORE_QUALITY_FLAG));
assert.throws(() => migrateLegacyUnattestedObservationColumns({
  ...columns,
  data_quality_flags: null
}), /Datakvalitetsflag/);

const startRecord = createTripStartRecord({
  tripId: input.tripId,
  startedAt: input.startedAt,
  mode: input.mode,
  zoneId: input.zoneId,
  coastalPartId: input.coastalPartId,
  forecastSnapshot: input.forecastSnapshot,
  calibrationFeatures,
  forecastCalibrationEligible: true,
  dataQualityFlags: []
});
assert.throws(() => createTripStartRecord({
  tripId: input.tripId,
  startedAt: input.startedAt,
  mode: input.mode,
  zoneId: input.zoneId,
  coastalPartId: input.coastalPartId,
  forecastSnapshot: input.forecastSnapshot,
  calibrationFeatures,
  dataQualityFlags: [],
}), /eksplicit kalibreringsstatus/);
assert.throws(() => createTripStartRecord({
  tripId: input.tripId,
  startedAt: input.startedAt,
  mode: input.mode,
  zoneId: input.zoneId,
  coastalPartId: input.coastalPartId,
  forecastSnapshot: input.forecastSnapshot,
  calibrationFeatures,
  forecastCalibrationEligible: true,
  dataQualityFlags: undefined,
}), /Datakvalitetsflag skal være en liste/);
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

const legacyActiveStorage = new MemoryStorage();
const legacyActive = structuredClone(startRecord);
delete legacyActive.forecastCalibrationEligible;
delete legacyActive.dataQualityFlags;
legacyActiveStorage.setItem(tripEvidenceStorageKeys.active, JSON.stringify(legacyActive));
const migratedLegacyActive = loadActiveTripEvidence(legacyActiveStorage);
assert.equal(migratedLegacyActive.forecastCalibrationEligible, false);
assert.deepEqual(migratedLegacyActive.dataQualityFlags, [UNATTESTED_RAVSCORE_QUALITY_FLAG]);
assert.ok(migratedLegacyActive.calibrationFeatures.reasonCodes.includes(UNATTESTED_RAVSCORE_QUALITY_FLAG));
markTripEvidenceStopped(input.endedAt, legacyActiveStorage);
const completedLegacyActive = finishTripEvidence({
  zoneId: input.zoneId,
  coastalPartId: input.coastalPartId,
  searchCoverage: 'normal',
  found: false,
  grams: null
}, legacyActiveStorage);
assert.equal(completedLegacyActive.calibrationEligible, false);
assert.deepEqual(completedLegacyActive.dataQualityFlags, [UNATTESTED_RAVSCORE_QUALITY_FLAG]);

const legacyPendingStorage = new MemoryStorage();
const legacyPending = structuredClone(evidence);
delete legacyPending.dataQualityFlags;
legacyPendingStorage.setItem(tripEvidenceStorageKeys.pending, JSON.stringify([legacyPending]));
const [migratedLegacyPending] = listPendingTripEvidence(legacyPendingStorage);
assert.equal(migratedLegacyPending.calibrationEligible, false);
assert.deepEqual(migratedLegacyPending.dataQualityFlags, [UNATTESTED_RAVSCORE_QUALITY_FLAG]);
assert.ok(migratedLegacyPending.calibrationFeatures.reasonCodes.includes(UNATTESTED_RAVSCORE_QUALITY_FLAG));

const storage = new MemoryStorage();
beginTripEvidence({
  tripId: input.tripId,
  startedAt: input.startedAt,
  mode: input.mode,
  zoneId: input.zoneId,
  coastalPartId: input.coastalPartId,
  forecastSnapshot: input.forecastSnapshot,
  calibrationFeatures,
  forecastCalibrationEligible: true,
  dataQualityFlags: [],
  route: [{ latitude: 55.1, longitude: 8.2 }]
}, storage);
assert.equal(loadActiveTripEvidence(storage).tripId, input.tripId);
markTripEvidenceStopped(input.endedAt, storage);
assert.equal(loadActiveTripEvidence(storage).stoppedAt, input.endedAt);
assert.doesNotMatch([...storage.values.values()].join(''), /latitude|longitude|route/i);
assert.throws(() => beginTripEvidence(input, storage), /allerede en aktiv/);
assert.throws(() => finishTripEvidence({
  endedAt: input.endedAt,
  zoneId: input.zoneId,
  coastalPartId: input.coastalPartId,
  searchCoverage: 'invalid',
  found: false
}, storage), /Søgegrundighed/);
assert.equal(loadActiveTripEvidence(storage).tripId, input.tripId);
const queued = finishTripEvidence({
  zoneId: input.zoneId,
  coastalPartId: input.coastalPartId,
  searchCoverage: 'normal',
  found: false
}, storage);
assert.equal(loadActiveTripEvidence(storage), null);
assert.equal(listPendingTripEvidence(storage).length, 1);
assert.equal(markTripEvidenceSubmitted(queued.tripId, storage), true);
assert.equal(listPendingTripEvidence(storage).length, 0);
assert.equal(markTripEvidenceSubmitted(queued.tripId, storage), false);

beginTripEvidence({
  tripId: '22222222-2222-4222-8222-222222222222',
  startedAt: input.startedAt,
  mode: input.mode,
  zoneId: input.zoneId,
  coastalPartId: input.coastalPartId,
  forecastSnapshot: input.forecastSnapshot,
  calibrationFeatures,
  forecastCalibrationEligible: true,
  dataQualityFlags: []
}, storage);
finishTripEvidence({
  endedAt: input.endedAt,
  zoneId: input.zoneId,
  coastalPartId: input.coastalPartId,
  searchCoverage: 'normal',
  found: true,
  grams: 4
}, storage);
const persisted = [];
const uploadSuccess = await uploadPendingTripEvidence({
  storage,
  persist: async (payload, options) => {
    assertTripEvidencePrivacy(payload);
    assert.equal(options.conflictTarget, 'trip_id');
    persisted.push(payload);
  }
});
assert.deepEqual({ ...uploadSuccess, failures: [] }, { attempted: 1, submitted: 1, failed: 0, failures: [] });
assert.equal(persisted[0].trip_id, '22222222-2222-4222-8222-222222222222');
assert.equal(listPendingTripEvidence(storage).length, 0);

beginTripEvidence({
  tripId: '33333333-3333-4333-8333-333333333333',
  startedAt: input.startedAt,
  mode: input.mode,
  zoneId: input.zoneId,
  coastalPartId: input.coastalPartId,
  forecastSnapshot: input.forecastSnapshot,
  calibrationFeatures,
  forecastCalibrationEligible: true,
  dataQualityFlags: []
}, storage);
finishTripEvidence({
  endedAt: input.endedAt,
  zoneId: input.zoneId,
  coastalPartId: input.coastalPartId,
  searchCoverage: 'normal',
  found: false
}, storage);
const uploadFailure = await uploadPendingTripEvidence({
  storage,
  persist: async () => { throw new Error('offline'); }
});
assert.equal(uploadFailure.failed, 1);
assert.equal(uploadFailure.failures[0].message, 'offline');
assert.equal(listPendingTripEvidence(storage).length, 1);

const controllerStorage = new MemoryStorage();
let dialogAnswer = null;
const controller = createTripEvidenceController({
  storage: controllerStorage,
  openDialog: async () => dialogAnswer,
  persist: async payload => assertTripEvidencePrivacy(payload)
});
controller.start({
  tripId: '44444444-4444-4444-8444-444444444444',
  startedAt: input.startedAt,
  mode: input.mode,
  zoneId: input.zoneId,
  coastalPartId: input.coastalPartId,
  forecastSnapshot: input.forecastSnapshot,
  calibrationFeatures,
  forecastCalibrationEligible: true,
  dataQualityFlags: []
});
const deferred = await controller.stop({
  endedAt: input.endedAt,
  zones: [{ id: input.zoneId, name: 'Testzone' }],
  coastalParts: [{ id: input.coastalPartId, zoneId: input.zoneId, name: 'Testdel' }]
});
assert.equal(deferred.status, 'deferred');
assert.equal(controller.active().stoppedAt, input.endedAt);
dialogAnswer = {
  zoneId: input.zoneId,
  coastalPartId: input.coastalPartId,
  searchCoverage: 'normal',
  found: false,
  grams: null
};
const submitted = await controller.resume({
  zones: [{ id: input.zoneId, name: 'Testzone' }],
  coastalParts: [{ id: input.coastalPartId, zoneId: input.zoneId, name: 'Testdel' }]
});
assert.equal(submitted.status, 'submitted');
assert.equal(controller.active(), null);
assert.equal(listPendingTripEvidence(controllerStorage).length, 0);

const publicStart = createTripStartFromPublicState({
  tripId: '55555555-5555-4555-8555-555555555555',
  startedAt: input.startedAt,
  mode: 'waders',
  zoneId: 'zone-42',
  coastalPartId: 'zone-42-part-2',
  manifest: { datasetId: 'rr-20260821025000-210', ravScoreEvidenceTrust: verifiedOnlyTrust },
  conditions: {
    available: true,
    datasetId: 'rr-20260821025000-210',
    productionReferenceAt: '2026-08-21T02:00:00.000Z',
    ravScoreEvidenceTrust: verifiedOnlyTrust,
    coastalParts: { evidenceTrust: verifiedOnlyTrust },
    generatedAt: '2026-08-21T02:50:00.000Z',
    zones: {
      'zone-42': {
        current: {
          windSpeedMps: 8.4,
          windDirectionDeg: 275,
          waveHeightM: 1.4,
          wavePeriodS: 6.8,
          waveDirectionDeg: 282,
          currentSpeedMps: 0.31,
          currentDirectionDeg: 268,
          waterLevelCm: 22,
          waterLevelTrendCm3h: -8
        },
        history: { maxWave24hM: 2.1, hoursSinceHighEnergy: 7 }
      }
    }
  },
  coastalPart: {
    zoneId: 'zone-42',
    candidateG: { evidenceTrust: verifiedOnlyTrust },
    current: {
      time: '2026-08-21T03:00:00.000Z',
      waders: { score: 63, components: { huntability: 74, transport: 61, release: 58 } }
    }
  },
  appVersion: '4.0.242',
  modelVersion: 'ravscore-4.0.242'
});
assert.equal(publicStart.calibrationFeatures.waterLevelM, 0.22);
assert.equal(publicStart.calibrationFeatures.waterLevelTrendM3h, -0.08);
assert.equal(publicStart.calibrationFeatures.mobilisationScore, 58);
assert.equal(publicStart.forecastSnapshot.validAt, '2026-08-21T03:00:00.000Z');
assert.throws(() => createTripStartFromPublicState({
  ...publicStart,
  zoneId: 'zone-99',
  coastalPart: { zoneId: 'zone-42' }
}), /tilhører ikke den valgte zone/);

const runtimeStorage = new MemoryStorage();
let runtimeNow = input.startedAt;
const runtimeContext = {
  mode: 'waders',
  zoneId: 'zone-42',
  coastalPartId: 'zone-42-part-2',
  manifest: { datasetId: 'rr-20260821025000-210', ravScoreEvidenceTrust: verifiedOnlyTrust },
  conditions: {
    available: true,
    datasetId: 'rr-20260821025000-210',
    productionReferenceAt: '2026-08-21T02:00:00.000Z',
    ravScoreEvidenceTrust: verifiedOnlyTrust,
    coastalParts: { evidenceTrust: verifiedOnlyTrust },
    zones: {
      'zone-42': {
        current: {
          windSpeedMps: 8.4,
          windDirectionDeg: 275,
          waveHeightM: 1.4,
          wavePeriodS: 6.8,
          waveDirectionDeg: 282,
          currentSpeedMps: 0.31,
          currentDirectionDeg: 268,
          waterLevelCm: 22,
          waterLevelTrendCm3h: -8
        },
        history: { maxWave24hM: 2.1, hoursSinceHighEnergy: 7 }
      }
    }
  },
  coastalPart: {
    zoneId: 'zone-42',
    candidateG: { evidenceTrust: verifiedOnlyTrust },
    current: {
      time: '2026-08-21T03:00:00.000Z',
      waders: { score: 63, components: { huntability: 74, transport: 61, release: 58 } }
    }
  },
  zones: [{ id: 'zone-42', name: 'Testzone' }],
  coastalParts: [{ id: 'zone-42-part-2', zoneId: 'zone-42', name: 'Testdel' }],
  appVersion: '4.0.242',
  modelVersion: 'ravscore-4.0.242'
};
const fallbackDatasetId = 'rr-20260821010000-210';
const fallbackManifestTrustSha = 'f'.repeat(64);
const fallbackContext = {
  ...runtimeContext,
  manifest: {
    ...runtimeContext.manifest,
    recoveryFallback: {
      schemaVersion: 2,
      status: 'active-last-verified',
      datasetId: fallbackDatasetId,
      generatedAt: '2026-08-21T01:50:00.000Z',
      publicConditionsSha256: 'e'.repeat(64),
      publicConditionDetailsSha256: 'd'.repeat(64),
      ravScoreEvidenceTrust: verifiedOnlyTrust,
      ravScoreEvidenceTrustSha256: fallbackManifestTrustSha
    }
  },
  conditions: {
    ...runtimeContext.conditions,
    datasetId: fallbackDatasetId,
    generatedAt: '2026-08-21T01:50:00.000Z',
    recoveryFallbackActive: true,
    recoveryFallback: {
      status: 'active-last-verified',
      datasetId: fallbackDatasetId,
      generatedAt: '2026-08-21T01:50:00.000Z',
      publicConditionsSha256: 'e'.repeat(64),
      publicConditionDetailsSha256: 'd'.repeat(64),
      ravScoreEvidenceTrust: verifiedOnlyTrust,
      ravScoreEvidenceTrustSha256: fallbackManifestTrustSha
    },
    ravScoreEvidenceTrust: verifiedOnlyTrust
  }
};
const fallbackStart = createTripStartFromPublicState({
  ...fallbackContext,
  tripId: '88888888-8888-4888-8888-888888888888',
  startedAt: input.startedAt
});
assert.deepEqual(fallbackStart.dataQualityFlags, [PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG]);
assert.equal(fallbackStart.forecastCalibrationEligible, false);
assert.equal(fallbackStart.forecastSnapshot.id, fallbackDatasetId);
const reconstructedTrust = Object.freeze({
  schemaVersion: 1,
  status: 'ACTIVE_RECONSTRUCTED_DERIVED_EVIDENCE',
  incidentId: 'RRGAP-2026-08-29-CANDIDATE-G-01',
  decisionId: 'DEC-0109',
  method: 'LINEAR_INTERPOLATION_OF_DERIVED_SIGNED_TRANSPORT_STRENGTH',
  evidenceClassification: 'RECONSTRUCTED_DERIVED_NOT_MEASURED',
  calibrationEligible: false,
  hardObservedOuttransportEligible: false,
  descriptorSha256: 'c'.repeat(64),
  affectedPartCount: 673,
  syntheticSampleCount: 2020,
  activeUntil: '2026-08-31T09:00:00.000Z'
});
const updaterSyntheticAt = '2026-08-29T06:00:00.000Z';
const updaterActiveUntil = '2026-08-31T06:00:00.000Z';
const updaterAggregateTrust = {
  ...reconstructedTrust,
  affectedPartCount: 1,
  syntheticSampleCount: 1,
  activeUntil: updaterActiveUntil,
};
const updaterStyleFull = {
  datasetId: 'rr-20260829090000-1',
  generatedAt: '2026-08-29T09:00:00.000Z',
  productionReferenceAt: '2026-08-29T09:00:00.000Z',
  zones: {
    'zone-42': {
      forecast: { hourly: [] },
    },
  },
  coastalParts: {
    schemaVersion: 1,
    enabled: true,
    generatedAt: '2026-08-29T09:00:00.000Z',
    productionReferenceAt: '2026-08-29T09:00:00.000Z',
    expectedPartCount: 1,
    scoredPartCount: 1,
    evidenceTrust: updaterAggregateTrust,
    zones: {
      'zone-42': {
        expectedPartCount: 1,
        scoredPartCount: 1,
        currentReferenceAt: '2026-08-29T09:00:00.000Z',
        hourly: [{
          time: '2026-08-29T09:00:00.000Z',
          waders: { available: true, score: 63, winningPartId: 'zone-42-part-2' },
          beach: { available: true, score: 60, winningPartId: 'zone-42-part-2' },
        }],
      },
    },
    parts: {
      'zone-42-part-2': {
        zoneId: 'zone-42',
        current: {
          time: '2026-08-29T09:00:00.000Z',
          waders: { score: 63, components: { huntability: 74, transport: 61, release: 58 } },
          beach: { score: 60, components: { huntability: 68, transport: 61, release: 58 } },
        },
        candidateG: {
          evidenceTrust: {
            status: 'ACTIVE_RECONSTRUCTED_DERIVED_EVIDENCE',
            evidenceClassification: 'RECONSTRUCTED_DERIVED_NOT_MEASURED',
            calibrationEligible: false,
            hardObservedOuttransportEligible: false,
            incidentId: 'RRGAP-2026-08-29-CANDIDATE-G-01',
            syntheticSampleCount: 1,
            activeUntil: updaterActiveUntil,
          },
          currentState: {
            transportEvidence: [{
              time: updaterSyntheticAt,
              strength: 0.25,
              provenance: 'OWNER_AUTHORIZED_LINEAR_INTERPOLATION_DERIVED_STRENGTH',
              incidentId: 'RRGAP-2026-08-29-CANDIDATE-G-01',
            }],
          },
          modes: {
            waders: { available: true, score: 63 },
            beach: { available: true, score: 60 },
          },
        },
      },
    },
  },
};
const projectedDetails = buildPublicConditionDetails(updaterStyleFull);
const projectedPart = projectedDetails.coastalParts.parts['zone-42-part-2'];
assert.deepEqual(projectedDetails.coastalParts.evidenceTrust, projectedDetails.ravScoreEvidenceTrust);
assert.deepEqual(projectedPart.candidateG.evidenceTrust, projectedDetails.ravScoreEvidenceTrust);
assert.deepEqual(projectedPart.candidateG.modes.waders.evidenceTrust, projectedDetails.ravScoreEvidenceTrust);
const projectedReconstructedStart = createTripStartFromPublicState({
  tripId: 'abababab-abab-4bab-8bab-abababababab',
  startedAt: '2026-08-29T09:05:00.000Z',
  mode: 'waders',
  zoneId: 'zone-42',
  coastalPartId: 'zone-42-part-2',
  manifest: {
    datasetId: updaterStyleFull.datasetId,
    ravScoreEvidenceTrust: projectedDetails.ravScoreEvidenceTrust,
  },
  conditions: {
    available: true,
    datasetId: updaterStyleFull.datasetId,
    generatedAt: updaterStyleFull.generatedAt,
    productionReferenceAt: updaterStyleFull.productionReferenceAt,
    ravScoreEvidenceTrust: projectedDetails.ravScoreEvidenceTrust,
    coastalParts: projectedDetails.coastalParts,
    zones: runtimeContext.conditions.zones,
  },
  coastalPart: projectedPart,
  appVersion: '4.0.311',
  modelVersion: 'ravscore-candidate-g',
});
assert.deepEqual(projectedReconstructedStart.dataQualityFlags, [RECONSTRUCTED_RAVSCORE_QUALITY_FLAG]);
assert.equal(projectedReconstructedStart.forecastCalibrationEligible, false);
const reconstructedStart = createTripStartFromPublicState({
  ...runtimeContext,
  tripId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  startedAt: input.startedAt,
  manifest: { ...runtimeContext.manifest, ravScoreEvidenceTrust: reconstructedTrust },
  conditions: {
    ...runtimeContext.conditions,
    ravScoreEvidenceTrust: reconstructedTrust,
    coastalParts: { ...runtimeContext.conditions.coastalParts, evidenceTrust: reconstructedTrust }
  },
  coastalPart: {
    ...runtimeContext.coastalPart,
    candidateG: { evidenceTrust: reconstructedTrust }
  }
});
assert.deepEqual(reconstructedStart.dataQualityFlags, [RECONSTRUCTED_RAVSCORE_QUALITY_FLAG]);
assert.equal(reconstructedStart.forecastCalibrationEligible, false);
assert.throws(() => createTripStartFromPublicState({
  ...runtimeContext,
  tripId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  startedAt: input.startedAt,
  conditions: {
    ...runtimeContext.conditions,
    coastalParts: { evidenceTrust: { ...verifiedOnlyTrust, calibrationEligible: false } }
  }
}), /Start-, detalje- og den valgte kystdels RavScore-evidens matcher ikke/);
assert.throws(() => createTripStartFromPublicState({
  ...runtimeContext,
  tripId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  startedAt: input.startedAt,
  coastalPart: {
    ...runtimeContext.coastalPart,
    candidateG: undefined
  }
}), /Start-, detalje- og den valgte kystdels RavScore-evidens matcher ikke/);
assert.throws(() => createTripStartFromPublicState({
  ...runtimeContext,
  tripId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  startedAt: input.startedAt,
  coastalPart: {
    ...runtimeContext.coastalPart,
    candidateG: {
      evidenceTrust: { ...verifiedOnlyTrust, calibrationEligible: false }
    }
  }
}), /Start-, detalje- og den valgte kystdels RavScore-evidens matcher ikke/);
assert.throws(() => createTripStartFromPublicState({
  ...runtimeContext,
  tripId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  startedAt: input.startedAt,
  coastalPart: {
    ...runtimeContext.coastalPart,
    candidateG: {
      evidenceTrust: { ...verifiedOnlyTrust, unexpected: true }
    }
  }
}), /Start-, detalje- og den valgte kystdels RavScore-evidens matcher ikke/);
const fallbackRuntimeStorage = new MemoryStorage();
const fallbackRuntime = createPublicTripEvidenceRuntime({
  storage: fallbackRuntimeStorage,
  getContext: () => fallbackContext,
  now: () => input.startedAt,
});
const fallbackRuntimeStart = fallbackRuntime.start(null, {
  tripId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  startedAt: input.startedAt,
});
assert.deepEqual(fallbackRuntimeStart.dataQualityFlags, [PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG]);
assert.equal(fallbackRuntimeStart.forecastCalibrationEligible, false);
assert.throws(() => createTripStartFromPublicState({
  ...fallbackContext,
  tripId: '99999999-9999-4999-8999-999999999999',
  startedAt: input.startedAt,
  manifest: {
    ...fallbackContext.manifest,
    recoveryFallback: {
      ...fallbackContext.manifest.recoveryFallback,
      ravScoreEvidenceTrust: { ...verifiedOnlyTrust, status: 'ACTIVE_RECONSTRUCTED_DERIVED_EVIDENCE' }
    }
  }
}), /matcher ikke|inkonsistent|hashbinding/);
const runtime = createPublicTripEvidenceRuntime({
  storage: runtimeStorage,
  getContext: () => runtimeContext,
  now: () => runtimeNow,
  createTripId: () => '66666666-6666-4666-8666-666666666666',
  openStartDialog: async () => ({ mode: 'waders', zoneId: 'zone-42', coastalPartId: 'zone-42-part-2' }),
  openDialog: async () => ({
    zoneId: 'zone-42',
    coastalPartId: 'zone-42-part-2',
    searchCoverage: 'thorough',
    found: false,
    grams: null
  }),
  persist: async payload => assertTripEvidencePrivacy(payload)
});
assert.equal(runtime.start().tripId, '66666666-6666-4666-8666-666666666666');
assert.equal(runtime.active().startedAt, input.startedAt);
runtimeNow = input.endedAt;
const runtimeResult = await runtime.stop();
assert.equal(runtimeResult.status, 'submitted');
assert.deepEqual(runtimeResult.answer, { found: false, grams: null, zoneId: 'zone-42', observedDate: '2026-08-21' });
assert.equal(runtime.active(), null);

const promptedRuntimeStorage = new MemoryStorage();
const promptedRuntime = createPublicTripEvidenceRuntime({
  storage: promptedRuntimeStorage,
  getContext: selection => ({ ...runtimeContext, ...selection }),
  now: () => input.startedAt,
  createTripId: () => '77777777-7777-4777-8777-777777777777',
  openStartDialog: async () => ({ mode: 'waders', zoneId: 'zone-42', coastalPartId: 'zone-42-part-2' }),
  openDialog: async () => null
});
const promptedStart = await promptedRuntime.startWithPrompt();
assert.equal(promptedStart.status, 'started');
assert.equal(promptedRuntime.active().tripId, '77777777-7777-4777-8777-777777777777');

const noFind = buildTripEvidence({ ...input, found: false, grams: 99 });
assert.equal(noFind.grams, null);
assert.equal(toObservationTripColumns(noFind).result, 'none');

for (const dataQualityFlags of [
  [RECONSTRUCTED_RAVSCORE_QUALITY_FLAG],
  [PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG],
  [PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG, RECONSTRUCTED_RAVSCORE_QUALITY_FLAG],
  [UNATTESTED_RAVSCORE_QUALITY_FLAG]
]) {
  const nonCalibration = buildTripEvidence({
    ...input,
    forecastCalibrationEligible: false,
    dataQualityFlags,
    calibrationFeatures: { ...calibrationFeatures, reasonCodes: [...calibrationFeatures.reasonCodes, ...dataQualityFlags] }
  });
  assert.equal(nonCalibration.calibrationEligible, false);
  assert.deepEqual(toObservationTripColumns(nonCalibration).data_quality_flags, dataQualityFlags);
}
assert.throws(() => buildTripEvidence({
  ...input,
  forecastCalibrationEligible: false,
  dataQualityFlags: ['unknown-quality'],
  calibrationFeatures: { ...calibrationFeatures, reasonCodes: ['unknown-quality'] }
}), /ukendt eller ikke-kanonisk/);
assert.throws(() => buildTripEvidence({
  ...input,
  forecastCalibrationEligible: false,
  dataQualityFlags: [RECONSTRUCTED_RAVSCORE_QUALITY_FLAG, PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG],
  calibrationFeatures: {
    ...calibrationFeatures,
    reasonCodes: [RECONSTRUCTED_RAVSCORE_QUALITY_FLAG, PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG]
  }
}), /ikke-kanonisk/);
assert.throws(() => buildTripEvidence({
  ...input,
  forecastCalibrationEligible: false,
  dataQualityFlags: [RECONSTRUCTED_RAVSCORE_QUALITY_FLAG],
  calibrationFeatures: {
    ...calibrationFeatures,
    reasonCodes: [RECONSTRUCTED_RAVSCORE_QUALITY_FLAG, RECONSTRUCTED_RAVSCORE_QUALITY_FLAG]
  }
}), /ikke entydigt bundet/);
assert.throws(() => buildTripEvidence({
  ...input,
  forecastCalibrationEligible: false,
  dataQualityFlags: [RECONSTRUCTED_RAVSCORE_QUALITY_FLAG]
}), /ikke entydigt bundet/);
assert.throws(() => buildTripEvidence({
  ...input,
  forecastCalibrationEligible: false,
  dataQualityFlags: []
}), /udelukket fra kalibrering/);

assert.throws(() => buildTripEvidence({ ...input, coastalPartId: '' }), /Kystdel/);
assert.throws(() => buildTripEvidence({ ...input, searchCoverage: 'unknown' }), /Søgegrundighed/);
assert.throws(() => buildTripEvidence({ ...input, endedAt: input.startedAt }), /efter starttid/);
assert.throws(() => buildTripEvidence({
  ...input,
  forecastSnapshot: { ...input.forecastSnapshot, issuedAt: '2026-08-21T03:11:00.000Z' }
}), /udstedt efter/);
assert.throws(() => assertTripEvidencePrivacy({ nested: { gpsTrack: [] } }), /Præcis position/);
assert.doesNotThrow(() => assertTripEvidencePrivacy({ gps: null }));
assert.throws(() => assertTripEvidencePrivacy({ gps: {} }), /Præcis position/);
assert.throws(() => assertTripEvidencePrivacy({ latitude: 0 }), /Præcis position/);
assert.throws(() => assertTripEvidencePrivacy({ route: [] }), /Præcis position/);
assert.throws(() => assertTripEvidencePrivacy({ nested: { location: {} } }), /Præcis position/);
assert.doesNotThrow(() => assertTripEvidencePrivacy({ nested: { location: null } }));
const browserPrivacySource = fs.readFileSync('js/services/trip-evidence-contract.js', 'utf8');
const edgePrivacySource = fs.readFileSync('supabase/functions/_shared/trip-storage.js', 'utf8');
const browserLocationPattern = browserPrivacySource.match(/const FORBIDDEN_REMOTE_KEY = (\/[^\r\n]+\/i);/)?.[1];
const edgeLocationPattern = edgePrivacySource.match(/const PRIVATE_LOCATION_KEY_PATTERN = (\/[^\r\n]+\/i);/)?.[1];
assert.ok(browserLocationPattern, 'Browserens private lokationsmønster mangler.');
assert.equal(browserLocationPattern, edgeLocationPattern, 'Browser og Edge skal afvise præcis samme private lokationsaliaser.');

const migration = fs.readFileSync('supabase/migrations/20260821_trip_evidence_contract.sql', 'utf8');
for (const column of [
  'schema_version', 'trip_id', 'trip_started_at', 'trip_ended_at', 'search_minutes',
  'client_observation_id', 'search_coverage', 'actual_zone_id', 'actual_coastal_part_id',
  'forecast_zone_id', 'forecast_coastal_part_id',
  'calibration_eligible', 'calibration_features', 'found', 'forecast_snapshot_id',
  'forecast_issued_at', 'forecast_valid_at', 'forecast_captured_at'
]) assert.match(migration, new RegExp(`\\b${column}\\b`));
assert.match(migration, /alter table public\.observations/);
assert.match(migration, /observations_id_seq/);
assert.match(migration, /actual_zone_id = forecast_zone_id/);
assert.doesNotMatch(migration, /\bzone_id = forecast_zone_id/);
assert.doesNotMatch(migration, /public\.ravradar_observations/);
assert.doesNotMatch(migration, /\b(?:delete|update)\s+(?:from\s+)?observations\b/i);
assert.doesNotMatch(migration, /\b(?:latitude|longitude|gps|route|track)\b/i);

const dialogSource = fs.readFileSync('js/ui/trip-evidence-dialog.js', 'utf8');
for (const key of ['trip.form.resultTitle', 'trip.form.found', 'trip.form.actualCoast', 'trip.form.coveragePartial', 'trip.form.coverageNormal', 'trip.form.coverageThorough', 'trip.form.answerLater', 'trip.form.discard', 'trip.form.submit', 'trip.form.startTitle', 'trip.form.howWillSearch', 'trip.form.start']) {
  assert.match(dialogSource, new RegExp(`t\\(['\"]${key.replaceAll('.', '\\.')}['\"]\\)`));
}
assert.match(dialogSource, /t\('trip\.form\.privacy'\)/);
assert.doesNotMatch(dialogSource, /\.innerHTML\s*=/);
assert.doesNotMatch(dialogSource, /\b(?:fetch|geolocation|localStorage)\b/);

const observationServiceSource = fs.readFileSync('js/services/observation-service.js', 'utf8');
const submitObservationFunctionSource = fs.readFileSync('supabase/functions/submit-observation/index.ts', 'utf8');
const tripStoreSource = fs.readFileSync('supabase/functions/_shared/trip-store.ts', 'utf8');
assert.match(observationServiceSource, /export async function submitTripEvidenceObservation/);
assert.match(observationServiceSource, /hunt_mode:columns\.hunt_mode/);
assert.match(observationServiceSource, /id:existing\?\.id\|\|columns\.trip_id/);
assert.match(observationServiceSource, /\/functions\/v1\/submit-observation/);
assert.match(submitObservationFunctionSource, /storeObservation/);
assert.match(tripStoreSource, /on_conflict=client_observation_id/);
assert.match(tripStoreSource, /resolution=ignore-duplicates/);
assert.match(observationServiceSource, /client_observation_id:clientObservationId/);
assert.match(observationServiceSource, /route,track,position,coordinates,latitude,longitude,location/);
assert.match(observationServiceSource, /gps:null/);

const appSource = fs.readFileSync('app.js', 'utf8');
assert.match(appSource, /const TRIP_EVIDENCE_INTEGRATION_V2 = true/);
assert.match(appSource, /createPublicTripEvidenceRuntime/);
assert.match(appSource, /persist: submitTripEvidenceObservation/);
assert.match(appSource, /state\.conditions\?\.coastalParts\?\.parts/);
assert.match(appSource, /manifest:\s*activeManifest/);
assert.doesNotMatch(appSource, /installTripEvidenceLegacyBridge/);
assert.doesNotMatch(appSource, /(?:startTrip|stopTrip|resumeTripTracking|pendingTripPrompt)\s*\(/);
assert.doesNotMatch(appSource.slice(appSource.indexOf('const TRIP_EVIDENCE_INTEGRATION_V2 = true')), /\b(?:geolocation|latitude|longitude|coordinates|route|track)\b/i);

const legacyBridgeSource = fs.readFileSync('js/services/trip-evidence-legacy-bridge.js', 'utf8');
assert.match(legacyBridgeSource, /onTripChange\(handle\)/);
assert.match(legacyBridgeSource, /trip\.id, startedAt: trip\.startedAt/);
assert.match(legacyBridgeSource, /response: answer \? \(answer\.found \? 'yes' : 'no'\) : 'v2-deferred'/);
assert.doesNotMatch(legacyBridgeSource, /\b(?:gps|geolocation|coordinates|route|track)\b/i);

const evidenceSchemaSource = fs.readFileSync('docs/research/trip-evidence-v2.schema.json', 'utf8');
const evidenceSchema = JSON.parse(evidenceSchemaSource);
assert.equal(evidenceSchema.properties.schemaVersion.const, 2);
assert.equal(evidenceSchema.additionalProperties, false);
assert.equal(evidenceSchema.$defs.calibrationFeatures.additionalProperties, false);
for (const key of ['tripStartedAt', 'tripEndedAt', 'searchMinutes', 'coastalPartId', 'forecastSnapshotId', 'calibrationFeatures']) {
  assert.ok(evidenceSchema.required.includes(key), `${key} skal være påkrævet i JSON-kontrakten`);
}
assert.doesNotMatch(evidenceSchemaSource, /"(?:latitude|longitude|gps|route|track|u|v)"\s*:/i);

console.log('Trip evidence contract: OK');
