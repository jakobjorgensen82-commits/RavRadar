import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  TRIP_EVIDENCE_SCHEMA_VERSION,
  GLOBAL_WARMUP_CALIBRATION_LOCK_REASON,
  HISTORY_INCOMPLETE_RAVSCORE_QUALITY_FLAG,
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
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { resolvePublicRavScoreProfile } from '../js/core/ravscore-public-model.js';
import {
  projectTripStoragePayload,
} from '../js/services/calibration-eligibility.js';
import {
  ravScorePublicHorizonValidUntil,
  selectPublicRuntimeAvailability,
} from '../js/core/ravscore-public-runtime-contract.js';

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

const publicBinding = ravScoreModelBinding();
const publicProfile = resolvePublicRavScoreProfile({
  modelCoverageReady: true,
  modelMemoryReady: true,
  modelMigrationReady: true,
});
function createScoreAvailability(allCurrentScoresFullHistory = true) {
  const historyIncomplete = !allCurrentScoresFullHistory;
  return Object.freeze({
    schemaVersion: 2,
    policy: 'integrated-model-local-fail-closed',
    allZonesActive: true,
    activeZoneCount: 210,
    unavailableZoneCount: 0,
    totalZoneCount: 210,
    allCurrentScoresFullHistory,
    fullHistoryModeCount: historyIncomplete ? 419 : 420,
    historyIncompleteModeCount: historyIncomplete ? 1 : 0,
    historyIncompleteZoneCount: historyIncomplete ? 1 : 0,
    evaluatedAt: '2026-08-21T02:50:00.000Z',
    unavailableZones: [],
    historyIncompleteZones: historyIncomplete ? [{
      zoneId: 'zone-99',
      zoneName: 'Global warmup-zone',
      modes: ['waders'],
      historyCoverageHours: 19,
      historyReasonCodes: ['CURRENT_HISTORY_INCOMPLETE'],
    }] : [],
  });
}
const fullHistoryScoreAvailability = createScoreAvailability(true);
const globalWarmupScoreAvailability = createScoreAvailability(false);

function createPublicManifest({
  datasetId,
  generatedAt,
  productionReferenceAt,
  evidenceTrust = verifiedOnlyTrust,
  scoreAvailability = fullHistoryScoreAvailability,
}) {
  return {
    datasetId,
    complete: true,
    generatedAt,
    productionReferenceAt,
    validUntil: ravScorePublicHorizonValidUntil(productionReferenceAt),
    zoneCount: 210,
    coastalPartCount: 673,
    ravScoreModelBinding: publicBinding,
    ravScoreEvidenceTrust: evidenceTrust,
    ravScoreAvailability: scoreAvailability,
    publicConditionsSha256: 'a'.repeat(64),
    publicConditionsBytes: 1,
    publicConditionDetailsSha256: 'b'.repeat(64),
    publicConditionDetailsBytes: 1,
    ravScoreRuntime: {
      schemaVersion: '1.0.0',
      modelBinding: publicBinding,
      startup: {
        kind: 'RAVSCORE_PUBLIC_STARTUP',
        payloadBodySha256: 'c'.repeat(64),
        fileSha256: 'a'.repeat(64),
        bytes: 1,
      },
      details: {
        kind: 'RAVSCORE_PUBLIC_DETAILS',
        payloadBodySha256: 'd'.repeat(64),
        fileSha256: 'b'.repeat(64),
        bytes: 1,
      },
    },
  };
}
const calibrationFeatures = createCalibrationFeatureSnapshot({
  modelVersion: publicBinding.modelId,
  modelBinding: publicBinding,
  appVersion: '4.0.242',
  totalScore: 63,
  scoreBoundLower:63,
  scoreBoundUpper:63,
  scoreBoundModelUncertaintyPoints:0,
  scoreBoundRawLower:63,
  scoreBoundRawUpper:63,
  scoreQuality:'FULL_HISTORY',
  scoreSemantics:'EXACT_POINT_SCORE',
  scoreCalibrationEligible:true,
  conservativeTailResetApplied:false,
  historyCoverageHours:48,
  historyReasonCodes:[],
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

const inputLockedCalibrationFeatures = createCalibrationFeatureSnapshot({
  ...calibrationFeatures,
  scoreCalibrationEligible:false,
});
const inputLockedEvidence = buildTripEvidence({
  ...input,
  calibrationFeatures:inputLockedCalibrationFeatures,
  forecastCalibrationEligible:false,
});
assert.equal(inputLockedEvidence.calibrationEligible,false,
  'FULL_HISTORY with an independent input lock must stay out of observation calibration');
assert.throws(() => buildTripEvidence({
  ...input,
  calibrationFeatures:inputLockedCalibrationFeatures,
  forecastCalibrationEligible:true,
}), /inputlåst RavScore|kalibreringsstatus/,
'a client must not override the score-level input ceiling');

const columns = toObservationTripColumns(evidence);
assert.equal(columns.schema_version, TRIP_EVIDENCE_SCHEMA_VERSION);
assert.equal(columns.result, 'medium');
assert.equal(columns.actual_zone_id, 'zone-42');
assert.equal(columns.actual_coastal_part_id, 'zone-42-part-2');
assert.equal('zone_id' in columns, false);
assert.equal(columns.forecast_snapshot_id, 'rr-20260821025000-210');
assert.equal(columns.calibration_features.totalScore, 63);
assertTripEvidencePrivacy(columns);
const projectedCurrentColumns = projectTripStoragePayload(columns, { omitNull: true });
assert.ok(Object.hasOwn(projectedCurrentColumns, 'data_quality_flags'));
assert.deepEqual(projectedCurrentColumns.data_quality_flags, []);
const legacyObservationColumns = { ...structuredClone(columns), schema_version: 2 };
delete legacyObservationColumns.data_quality_flags;
const migratedLegacyObservationColumns = migrateLegacyUnattestedObservationColumns(legacyObservationColumns);
assert.equal(migratedLegacyObservationColumns.calibration_eligible, false);
assert.deepEqual(migratedLegacyObservationColumns.data_quality_flags, [UNATTESTED_RAVSCORE_QUALITY_FLAG]);
assert.ok(migratedLegacyObservationColumns.calibration_features.reasonCodes.includes(UNATTESTED_RAVSCORE_QUALITY_FLAG));
assert.throws(() => migrateLegacyUnattestedObservationColumns({
  ...legacyObservationColumns,
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
legacyActive.schemaVersion = 2;
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
legacyPending.schemaVersion = 2;
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

const freshManifest = createPublicManifest({
  datasetId: 'rr-20260821025000-210',
  generatedAt: '2026-08-21T02:50:00.000Z',
  productionReferenceAt: '2026-08-21T02:00:00.000Z',
});
const freshConditions = {
  available: true,
  datasetId: freshManifest.datasetId,
  productionReferenceAt: freshManifest.productionReferenceAt,
  generatedAt: freshManifest.generatedAt,
  ravScoreEvidenceTrust: verifiedOnlyTrust,
  ravScoreRuntime: { modelBinding: publicBinding },
  coastalParts: {
    modelBinding: publicBinding,
    evidenceTrust: verifiedOnlyTrust,
    scoreAvailability: freshManifest.ravScoreAvailability,
  },
  publicRuntimeAvailability: selectPublicRuntimeAvailability(freshManifest, {
    now: Date.parse(input.startedAt),
    modelBinding: publicBinding,
  }),
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
        waterLevelTrendCm3h: -8,
      },
      history: { maxWave24hM: 2.1, hoursSinceHighEnergy: 7 },
    },
  },
};
const freshCoastalPart = {
  zoneId: 'zone-42',
  ravScoreEvidenceTrust: verifiedOnlyTrust,
  current: {
    time: '2026-08-21T03:00:00.000Z',
    waders: {
      score: 63,
      scoreQuality: 'FULL_HISTORY',
      scoreBounds:{lower:63,upper:63,modelUncertaintyPoints:0,rawLower:63,rawUpper:63},
      scoreSemantics:'EXACT_POINT_SCORE',
      calibrationEligible:true,
      conservativeTailResetApplied:false,
      historyCoverageHours:48,
      historyReasonCodes:[],
      components: { huntability: 74, transport: 61, release: 58 },
      modelBinding: publicBinding,
    },
  },
};
const publicStartInput = {
  tripId: '55555555-5555-4555-8555-555555555555',
  startedAt: input.startedAt,
  mode: 'waders',
  zoneId: 'zone-42',
  coastalPartId: 'zone-42-part-2',
  manifest: freshManifest,
  conditions: freshConditions,
  coastalPart: freshCoastalPart,
  appVersion: '4.0.242',
  modelVersion: publicBinding.modelId,
  modelBinding: publicBinding,
};
const publicStart = createTripStartFromPublicState(publicStartInput);
assert.equal(publicStart.calibrationFeatures.waterLevelM, 0.22);
assert.equal(publicStart.calibrationFeatures.waterLevelTrendM3h, -0.08);
assert.equal(publicStart.calibrationFeatures.mobilisationScore, 58);
assert.equal(publicStart.forecastSnapshot.validAt, '2026-08-21T03:00:00.000Z');
assert.equal(publicStart.forecastCalibrationEligible, true);
assert.equal(publicStart.calibrationFeatures.reasonCodes
  .includes(GLOBAL_WARMUP_CALIBRATION_LOCK_REASON), false);

const globalWarmupManifest = createPublicManifest({
  datasetId: freshManifest.datasetId,
  generatedAt: freshManifest.generatedAt,
  productionReferenceAt: freshManifest.productionReferenceAt,
  scoreAvailability: globalWarmupScoreAvailability,
});
const globalWarmupConditions = {
  ...freshConditions,
  coastalParts: {
    ...freshConditions.coastalParts,
    scoreAvailability: globalWarmupScoreAvailability,
  },
  publicRuntimeAvailability: selectPublicRuntimeAvailability(globalWarmupManifest, {
    now: Date.parse(input.startedAt),
    modelBinding: publicBinding,
  }),
};
const globalWarmupStart = createTripStartFromPublicState({
  ...publicStartInput,
  tripId: '57575757-5757-4575-8575-575757575757',
  manifest: globalWarmupManifest,
  conditions: globalWarmupConditions,
});
assert.deepEqual(globalWarmupStart.dataQualityFlags, []);
assert.equal(globalWarmupStart.forecastCalibrationEligible, false);
assert.equal(globalWarmupStart.calibrationFeatures.reasonCodes
  .filter(reason => reason === GLOBAL_WARMUP_CALIBRATION_LOCK_REASON).length, 1);
const completedGlobalWarmup = completeTripEvidence(globalWarmupStart, {
  endedAt: input.endedAt,
  zoneId: input.zoneId,
  coastalPartId: input.coastalPartId,
  searchCoverage: 'normal',
  found: false,
  grams: null,
});
const globalWarmupColumns = toObservationTripColumns(completedGlobalWarmup);
assert.equal(completedGlobalWarmup.calibrationEligible, false);
assert.equal(globalWarmupColumns.calibration_eligible, false);
assert.deepEqual(globalWarmupColumns.data_quality_flags, []);
assert.deepEqual(globalWarmupColumns.weather_snapshot.calibrationFeatures,
  globalWarmupColumns.calibration_features);

const delayedWarmupStorage = new MemoryStorage();
delayedWarmupStorage.setItem(tripEvidenceStorageKeys.pending,
  JSON.stringify([completedGlobalWarmup]));
const postWarmupStart = createTripStartFromPublicState({
  ...publicStartInput,
  tripId: '58585858-5858-4585-8585-585858585858',
});
assert.equal(postWarmupStart.forecastCalibrationEligible, true);
assert.equal(postWarmupStart.calibrationFeatures.reasonCodes
  .includes(GLOBAL_WARMUP_CALIBRATION_LOCK_REASON), false);
const [delayedWarmupRetry] = listPendingTripEvidence(delayedWarmupStorage);
assert.equal(delayedWarmupRetry.calibrationEligible, false);
assert.ok(delayedWarmupRetry.calibrationFeatures.reasonCodes
  .includes(GLOBAL_WARMUP_CALIBRATION_LOCK_REASON));
const delayedWarmupPayloads = [];
const delayedWarmupUpload = await uploadPendingTripEvidence({
  storage: delayedWarmupStorage,
  persist: async payload => delayedWarmupPayloads.push(payload),
});
assert.deepEqual(delayedWarmupUpload, { attempted: 1, submitted: 1, failed: 0, failures: [] });
assert.equal(delayedWarmupPayloads[0].calibration_eligible, false);
assert.deepEqual(delayedWarmupPayloads[0].data_quality_flags, []);
assert.ok(delayedWarmupPayloads[0].calibration_features.reasonCodes
  .includes(GLOBAL_WARMUP_CALIBRATION_LOCK_REASON));

assert.throws(() => createTripStartFromPublicState({
  ...publicStartInput,
  tripId: '59595959-5959-4595-8595-595959595959',
  conditions: {
    ...freshConditions,
    coastalParts: {
      ...freshConditions.coastalParts,
      scoreAvailability: globalWarmupScoreAvailability,
    },
  },
}), /globale RavScore-historikkvalitet.*manifestbundet/);
assert.throws(() => createTripStartRecord({
  ...globalWarmupStart,
  calibrationFeatures: {
    ...globalWarmupStart.calibrationFeatures,
    reasonCodes: [
      ...globalWarmupStart.calibrationFeatures.reasonCodes,
      GLOBAL_WARMUP_CALIBRATION_LOCK_REASON,
    ],
  },
}), /SCORE_QUALITY|scorekvalitet|Scorekvalitet|kalibreringsstatus/i);
assert.throws(() => createTripStartRecord({
  ...globalWarmupStart,
  forecastCalibrationEligible: true,
}), /kalibreringsstatus|kalibrering/i);

const historyIncompleteStart = createTripStartFromPublicState({
  ...publicStartInput,
  tripId: '56565656-5656-4565-8565-565656565656',
  manifest: globalWarmupManifest,
  conditions: globalWarmupConditions,
  coastalPart: {
    ...freshCoastalPart,
    current: {
      ...freshCoastalPart.current,
      waders: {
        ...freshCoastalPart.current.waders,
        scoreQuality: 'HISTORY_INCOMPLETE',
        scoreBounds:{lower:63,upper:77,modelUncertaintyPoints:14,rawLower:63,rawUpper:77},
        scoreSemantics:'CONSERVATIVE_ENCLOSING_LOWER_BOUND',
        calibrationEligible:false,
        conservativeTailResetApplied:false,
        historyCoverageHours:19,
        historyReasonCodes:['CURRENT_HISTORY_INCOMPLETE'],
      },
    },
  },
});
assert.deepEqual(historyIncompleteStart.dataQualityFlags, [HISTORY_INCOMPLETE_RAVSCORE_QUALITY_FLAG]);
assert.equal(historyIncompleteStart.forecastCalibrationEligible, false);
assert.ok(historyIncompleteStart.calibrationFeatures.reasonCodes.includes(HISTORY_INCOMPLETE_RAVSCORE_QUALITY_FLAG));
assert.equal(historyIncompleteStart.calibrationFeatures.scoreQuality,'HISTORY_INCOMPLETE');
assert.equal(historyIncompleteStart.calibrationFeatures.scoreSemantics,
  'CONSERVATIVE_ENCLOSING_LOWER_BOUND');
assert.deepEqual({
  lower:historyIncompleteStart.calibrationFeatures.scoreBoundLower,
  upper:historyIncompleteStart.calibrationFeatures.scoreBoundUpper,
  span:historyIncompleteStart.calibrationFeatures.scoreBoundModelUncertaintyPoints,
},{lower:63,upper:77,span:14});
assert.deepEqual(historyIncompleteStart.calibrationFeatures.historyReasonCodes,
  ['CURRENT_HISTORY_INCOMPLETE']);
assert.equal(historyIncompleteStart.calibrationFeatures.reasonCodes
  .includes(GLOBAL_WARMUP_CALIBRATION_LOCK_REASON), false);
assert.throws(() => createTripStartRecord({
  ...historyIncompleteStart,
  calibrationFeatures: {
    ...historyIncompleteStart.calibrationFeatures,
    reasonCodes: [
      ...historyIncompleteStart.calibrationFeatures.reasonCodes,
      GLOBAL_WARMUP_CALIBRATION_LOCK_REASON,
    ],
  },
}), /SCORE_QUALITY|scorekvalitet|Scorekvalitet|kalibreringsstatus/i);
assert.throws(() => createTripStartFromPublicState({
  ...publicStartInput,
  zoneId: 'zone-99',
  coastalPart: { zoneId: 'zone-42' }
}), /tilhører ikke den valgte zone/);

const runtimeStorage = new MemoryStorage();
let runtimeNow = input.startedAt;
const runtimeContext = {
  ...publicStartInput,
  tripId: undefined,
  startedAt: undefined,
  zones: [{ id: 'zone-42', name: 'Testzone' }],
  coastalParts: [{ id: 'zone-42-part-2', zoneId: 'zone-42', name: 'Testdel' }],
};
const fallbackDatasetId = 'rr-20260821010000-210';
const fallbackManifest = createPublicManifest({
  datasetId: fallbackDatasetId,
  generatedAt: '2026-08-21T01:50:00.000Z',
  productionReferenceAt: '2026-08-21T01:00:00.000Z',
});
const fallbackAvailability = selectPublicRuntimeAvailability(fallbackManifest, {
  now: Date.parse(input.startedAt),
  modelBinding: publicBinding,
});
const fallbackWeather = {
  ...freshConditions.zones['zone-42'].current,
  time: fallbackAvailability.selectedReferenceAt,
};
const fallbackContext = {
  ...runtimeContext,
  manifest: fallbackManifest,
  conditions: {
    ...runtimeContext.conditions,
    datasetId: fallbackDatasetId,
    generatedAt: '2026-08-21T01:50:00.000Z',
    productionReferenceAt: '2026-08-21T01:00:00.000Z',
    detailsAvailable: true,
    publicRuntimeAvailability: fallbackAvailability,
    coastalParts: {
      modelBinding: publicBinding,
      evidenceTrust: verifiedOnlyTrust,
      scoreAvailability: fallbackManifest.ravScoreAvailability,
      zones: {
        'zone-42': { currentReferenceAt: fallbackAvailability.selectedReferenceAt },
      },
    },
    zones: {
      'zone-42': {
        ...runtimeContext.conditions.zones['zone-42'],
        currentReferenceAt: fallbackAvailability.selectedReferenceAt,
      },
    },
    ravScoreEvidenceTrust: verifiedOnlyTrust,
  },
  coastalPart: {
    ...runtimeContext.coastalPart,
    current: {
      ...runtimeContext.coastalPart.current,
      time: fallbackAvailability.selectedReferenceAt,
      weather: fallbackWeather,
      waders: {
        ...runtimeContext.coastalPart.current.waders,
        weather: fallbackWeather,
      },
    },
  },
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
    modelBinding: publicBinding,
    scoreProfile: publicProfile,
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
          waders: { available: true, score: 63, winningPartId: 'zone-42-part-2', components: { huntability: 74, transport: 61, release: 58 }, modelBinding: publicBinding },
          beach: { available: true, score: 60, winningPartId: 'zone-42-part-2', components: { huntability: 68, transport: 61, release: 58 }, modelBinding: publicBinding },
        }],
      },
    },
    parts: {
      'zone-42-part-2': {
        zoneId: 'zone-42',
        current: {
          time: '2026-08-29T09:00:00.000Z',
          waders: { available: true, score: 63, components: { huntability: 74, transport: 61, release: 58 }, modelBinding: publicBinding },
          beach: { available: true, score: 60, components: { huntability: 68, transport: 61, release: 58 }, modelBinding: publicBinding },
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
assert.throws(
  () => buildPublicConditionDetails(updaterStyleFull),
  /exact VERIFIED_ONLY contract/,
  'abandoned reconstructed Candidate G evidence must never enter a new public projection',
);
assert.throws(() => createTripStartFromPublicState({
  ...runtimeContext,
  tripId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  startedAt: input.startedAt,
  manifest: { ...runtimeContext.manifest, ravScoreEvidenceTrust: reconstructedTrust },
  conditions: {
    ...runtimeContext.conditions,
    ravScoreEvidenceTrust: reconstructedTrust,
    coastalParts: { ...runtimeContext.conditions.coastalParts, evidenceTrust: reconstructedTrust },
  },
  coastalPart: {
    ...runtimeContext.coastalPart,
    ravScoreEvidenceTrust: reconstructedTrust,
  },
}), /exact VERIFIED_ONLY contract/, 'new trips must reject abandoned reconstructed evidence');
assert.throws(() => createTripStartFromPublicState({
  ...runtimeContext,
  tripId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  startedAt: input.startedAt,
  conditions: {
    ...runtimeContext.conditions,
    coastalParts: {
      ...runtimeContext.conditions.coastalParts,
      evidenceTrust: { ...verifiedOnlyTrust, calibrationEligible: false },
    }
  }
}), /Start-, detalje- og den valgte kystdels RavScore-evidens matcher ikke/);
assert.throws(() => createTripStartFromPublicState({
  ...runtimeContext,
  tripId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  startedAt: input.startedAt,
  coastalPart: {
    ...runtimeContext.coastalPart,
    ravScoreEvidenceTrust: undefined,
    integrated: undefined,
    candidateG: undefined,
  }
}), /Start-, detalje- og den valgte kystdels RavScore-evidens matcher ikke/);
assert.throws(() => createTripStartFromPublicState({
  ...runtimeContext,
  tripId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  startedAt: input.startedAt,
  coastalPart: {
    ...runtimeContext.coastalPart,
    ravScoreEvidenceTrust: { ...verifiedOnlyTrust, calibrationEligible: false },
  }
}), /Start-, detalje- og den valgte kystdels RavScore-evidens matcher ikke/);
assert.throws(() => createTripStartFromPublicState({
  ...runtimeContext,
  tripId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  startedAt: input.startedAt,
  coastalPart: {
    ...runtimeContext.coastalPart,
    ravScoreEvidenceTrust: { ...verifiedOnlyTrust, unexpected: true },
  }
}), /Start-, detalje- og den valgte kystdels RavScore-evidens matcher ikke/);
const uniformlyTamperedTrust = { ...verifiedOnlyTrust, unexpected: true };
assert.throws(() => createTripStartFromPublicState({
  ...runtimeContext,
  tripId: '12121212-1212-4212-8212-121212121212',
  startedAt: input.startedAt,
  manifest: { ...runtimeContext.manifest, ravScoreEvidenceTrust: uniformlyTamperedTrust },
  conditions: {
    ...runtimeContext.conditions,
    ravScoreEvidenceTrust: uniformlyTamperedTrust,
    coastalParts: { ...runtimeContext.conditions.coastalParts, evidenceTrust: uniformlyTamperedTrust },
  },
  coastalPart: { ...runtimeContext.coastalPart, ravScoreEvidenceTrust: uniformlyTamperedTrust },
}), /exact VERIFIED_ONLY contract/);
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
  conditions: {
    ...fallbackContext.conditions,
    publicRuntimeAvailability: {
      ...fallbackContext.conditions.publicRuntimeAvailability,
      ageHours: fallbackContext.conditions.publicRuntimeAvailability.ageHours + 1,
    },
  },
}), /availability marker/);
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
  [HISTORY_INCOMPLETE_RAVSCORE_QUALITY_FLAG],
  [PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG, HISTORY_INCOMPLETE_RAVSCORE_QUALITY_FLAG],
  [PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG, RECONSTRUCTED_RAVSCORE_QUALITY_FLAG],
  [UNATTESTED_RAVSCORE_QUALITY_FLAG]
]) {
  const historyIncomplete=dataQualityFlags.includes(HISTORY_INCOMPLETE_RAVSCORE_QUALITY_FLAG);
  const qualityFeatures=historyIncomplete?{
    ...calibrationFeatures,
    scoreQuality:'HISTORY_INCOMPLETE',
    scoreSemantics:'CONSERVATIVE_ENCLOSING_LOWER_BOUND',
    scoreCalibrationEligible:false,
    scoreBoundUpper:77,
    scoreBoundModelUncertaintyPoints:14,
    scoreBoundRawUpper:77,
    historyCoverageHours:19,
    historyReasonCodes:['CURRENT_HISTORY_INCOMPLETE'],
  }:calibrationFeatures;
  const nonCalibration = buildTripEvidence({
    ...input,
    forecastCalibrationEligible: false,
    dataQualityFlags,
    calibrationFeatures: { ...qualityFeatures, reasonCodes: [...qualityFeatures.reasonCodes, ...dataQualityFlags] }
  });
  assert.equal(nonCalibration.calibrationEligible, false);
  assert.deepEqual(toObservationTripColumns(nonCalibration).data_quality_flags, dataQualityFlags);
}
for(const mutate of [
  features=>{delete features.scoreSemantics;},
  features=>{features.scoreBoundUpper=62;},
  features=>{features.scoreBoundModelUncertaintyPoints=1;},
  features=>{features.historyCoverageHours=47;},
  features=>{features.conservativeTailResetApplied=true;},
]){
  const forged=structuredClone(calibrationFeatures);
  mutate(forged);
  assert.throws(()=>buildTripEvidence({...input,calibrationFeatures:forged}),
    /score|Score|mangler|ugyldig|SCORE_/,
    'manglende eller forfalskede immutable scorequality-felter skal afvises');
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
const browserPrivacySource = fs.readFileSync('js/services/calibration-eligibility.js', 'utf8');
const edgePrivacySource = fs.readFileSync('supabase/functions/_shared/trip-storage.js', 'utf8');
const browserLocationPattern = browserPrivacySource.match(/const PRIVATE_LOCATION_KEY_PATTERN = (\/[^\r\n]+\/i);/)?.[1];
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
assert.equal((observationServiceSource.match(/columns=structuredClone\(columns\|\|\{\}\)/g) || []).length, 2);
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
assert.match(appSource, /const TRIP_EVIDENCE_INTEGRATION_V3 = true/);
assert.match(appSource, /createPublicTripEvidenceRuntime/);
assert.match(appSource, /persist: submitTripEvidenceObservation/);
assert.match(appSource, /state\.conditions\?\.coastalParts\?\.parts/);
assert.match(appSource, /manifest:\s*activeManifest/);
assert.doesNotMatch(appSource, /installTripEvidenceLegacyBridge/);
assert.doesNotMatch(appSource, /(?:startTrip|stopTrip|resumeTripTracking|pendingTripPrompt)\s*\(/);
assert.doesNotMatch(appSource.slice(appSource.indexOf('const TRIP_EVIDENCE_INTEGRATION_V3 = true')), /\b(?:geolocation|latitude|longitude|coordinates|route|track)\b/i);

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
