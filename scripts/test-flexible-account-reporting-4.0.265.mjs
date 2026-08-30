import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ACCOUNT_TRIP_REPORT_SOURCE,
  HISTORICAL_SNAPSHOT_UNAVAILABLE,
  buildAccountTripReport,
  toAccountObservationColumns
} from '../js/services/account-trip-report-contract.js';
import {
  beginTripEvidence,
  discardActiveTripEvidence,
  listPendingTripEvidence,
  loadActiveTripEvidence
} from '../js/services/trip-evidence-store.js';
import { createTripEvidenceController } from '../js/services/trip-evidence-controller.js';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const tripId = '88888888-8888-4888-8888-888888888888';
const report = buildAccountTripReport({
  tripId,
  startedAt: '2026-08-22T18:00:00.000Z',
  searchMinutes: 90,
  mode: 'beach',
  zoneId: 'DK-B04-12',
  coastalPartId: 'DK-B04-12-P01',
  searchCoverage: 'normal',
  found: true,
  grams: 4.7
}, { now: Date.parse('2026-08-23T08:00:00.000Z') });

assert.equal(report.reportSource, ACCOUNT_TRIP_REPORT_SOURCE);
assert.equal(report.tripEndedAt, '2026-08-22T19:30:00.000Z');
assert.equal(report.observedAt, '2026-08-22T18:45:00.000Z');
assert.equal(report.calibrationEligible, false);
assert.equal(report.historicalSnapshotStatus, HISTORICAL_SNAPSHOT_UNAVAILABLE);

const columns = toAccountObservationColumns(report);
assert.equal(columns.schema_version, 1, 'Efterregistrering bruger den bagudkompatible historiske observationskontrakt.');
assert.equal(columns.forecast_target_at, report.observedAt);
assert.equal(columns.calibration_eligible, false);
assert.equal(columns.forecast_snapshot_id, null);
assert.equal(columns.calibration_features, null);
assert.deepEqual(columns.data_quality_flags, [
  'account-manual',
  'historical-snapshot-unavailable',
  'not-calibration-eligible'
]);
assert.equal('weather_snapshot' in columns, false, 'Kontrakten må ikke opfinde et vejrsnapshot.');
assert.equal(JSON.stringify(columns).match(/latitude|longitude|coordinates|route|track/gi), null);

assert.throws(() => buildAccountTripReport({
  tripId,
  startedAt: '2026-08-23T08:00:00.000Z',
  searchMinutes: 60,
  mode: 'beach',
  zoneId: 'DK-B04-12',
  coastalPartId: 'DK-B04-12-P01',
  searchCoverage: 'normal',
  found: false
}, { now: Date.parse('2026-08-23T08:00:00.000Z') }), /slutte i fremtiden/);
assert.throws(() => buildAccountTripReport({
  tripId,
  startedAt: report.tripStartedAt,
  searchMinutes: report.searchMinutes,
  mode: report.mode,
  zoneId: report.zoneId,
  coastalPartId: '',
  searchCoverage: report.searchCoverage,
  found: report.found
}, { now: Date.parse('2026-08-23T08:00:00.000Z') }), /Kystdel/);
assert.throws(() => buildAccountTripReport({
  tripId,
  startedAt: report.tripStartedAt,
  searchMinutes: report.searchMinutes,
  mode: report.mode,
  zoneId: report.zoneId,
  coastalPartId: report.coastalPartId,
  searchCoverage: report.searchCoverage,
  found: true,
  grams: 10000.1
}, { now: Date.parse('2026-08-23T08:00:00.000Z') }), /0 og 10000/);

const store = new MemoryStorage();
const activeModelBinding = ravScoreModelBinding();
const startInput = {
  tripId: '99999999-9999-4999-8999-999999999999',
  startedAt: '2026-08-23T06:00:00.000Z',
  mode: 'waders',
  zoneId: 'DK-B04-12',
  coastalPartId: 'DK-B04-12-P01',
  forecastSnapshot: {
    id: 'rr-test-210',
    issuedAt: '2026-08-23T05:00:00.000Z',
    validAt: '2026-08-23T06:00:00.000Z',
    capturedAt: '2026-08-23T06:00:00.000Z'
  },
  forecastCalibrationEligible: true,
  dataQualityFlags: [],
  calibrationFeatures: {
    modelVersion: activeModelBinding.modelId, appVersion: '4.0.317',
    modelStateVersion: activeModelBinding.stateSchemaVersion,
    modelVariantId: activeModelBinding.variantId,
    modelProfileId: activeModelBinding.profileId,
    modelComponentSchemaId: activeModelBinding.componentSchemaId,
    modelExplanationSchemaId: activeModelBinding.explanationSchemaId,
    modelRankingPolicyId: activeModelBinding.rankingPolicyId,
    modelBestTimePolicyId: activeModelBinding.bestTimePolicyId,
    modelPresentationPolicyId: activeModelBinding.presentationPolicyId,
    modelContractSha256: activeModelBinding.modelContractSha256,
    modelBundleSha256: activeModelBinding.modelBundleSha256,
    totalScore: 50, scoreBoundLower: 50, scoreBoundUpper: 50,
    scoreBoundModelUncertaintyPoints: 0, scoreBoundRawLower: 50,
    scoreBoundRawUpper: 50, historyCoverageHours: 48,
    scoreQuality: 'FULL_HISTORY', scoreSemantics: 'EXACT_POINT_SCORE',
    scoreCalibrationEligible: true, conservativeTailResetApplied: false,
    historyReasonCodes: [],
    huntabilityScore: 50, transportScore: 50, mobilisationScore: 50,
    reasonCodes: []
  }
};
beginTripEvidence(startInput, store);
assert.equal(discardActiveTripEvidence(store).tripId, startInput.tripId);
assert.equal(loadActiveTripEvidence(store), null);
assert.equal(listPendingTripEvidence(store).length, 0);

let persistCalls = 0;
const controllerStore = new MemoryStorage();
const controller = createTripEvidenceController({
  storage: controllerStore,
  openDialog: async () => ({ action: 'discard' }),
  persist: async () => { persistCalls += 1; }
});
controller.start(startInput);
const discarded = await controller.stop({
  endedAt: '2026-08-23T07:00:00.000Z',
  zones: [{ id: 'DK-B04-12', name: 'Testområde' }],
  coastalParts: [{ id: 'DK-B04-12-P01', zoneId: 'DK-B04-12', name: 'Teststrækning' }]
});
assert.equal(discarded.status, 'discarded');
assert.equal(controller.active(), null);
assert.equal(listPendingTripEvidence(controllerStore).length, 0);
assert.equal(persistCalls, 0, 'Fravalg må hverken oprette køpost eller kalde Supabase-tjenesten.');

const dialog = fs.readFileSync('js/ui/trip-evidence-dialog.js', 'utf8');
const account = fs.readFileSync('js/ui/account-panel.js', 'utf8');
const observationService = fs.readFileSync('js/services/observation-service.js', 'utf8');
const submitObservationFunction = fs.readFileSync('supabase/functions/submit-observation/index.ts', 'utf8');
const tripStore = fs.readFileSync('supabase/functions/_shared/trip-store.ts', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');

for (const marker of [
  'trip.form.reportTitle',
  'trip.form.startedAt',
  'trip.form.minutes',
  'trip.form.discard',
  'trip.form.answerLater',
  'trip.form.actualCoast',
  'trip.form.reportIntro'
]) assert.ok(dialog.includes(marker), `Turformularen mangler teksten: ${marker}`);
assert.match(dialog, /name:\s*'startedAt',\s*type:\s*'datetime-local'/, 'Efterregistrering skal have ét tydeligt felt med både dato og klokkeslæt.');
assert.doesNotMatch(dialog, /name:\s*'startedAt'[^}\n]*\bvalue\s*:/, 'Dato og klokkeslæt må ikke være forudfyldt; brugeren skal selv vælge dem.');
assert.equal((dialog.match(/function appendReportQuestions/g) || []).length, 1);
assert.match(dialog, /openTripEvidenceDialog[\s\S]*appendReportQuestions/);
assert.match(dialog, /openAccountTripReportDialog[\s\S]*appendReportQuestions/);
assert.match(account, /submitAccountTripReportObservation\(toAccountObservationColumns\(report\)\)/);
assert.match(observationService, /\/functions\/v1\/submit-observation/);
assert.match(submitObservationFunction, /storeObservation/);
assert.match(tripStore, /rest\/v1\/observations\?on_conflict=client_observation_id/);
assert.match(tripStore, /activeTripStorageMode\(\) === "supabase"/);
assert.match(tripStore, /if \(mode === "maintenance"\) throw new GatewayError\(503, "TRIP_STORAGE_MAINTENANCE"\)/);
assert.doesNotMatch(observationService, /rest\/v1\/(?:manual_reports|account_reports|trip_reports)/);
assert.match(observationService, /historicalSnapshotStatus:HISTORICAL_SNAPSHOT_UNAVAILABLE/);
assert.match(app, /status==='discarded'/);

console.log('Fleksibel kontoindberetning: samme turpost, valgt tid, ingen opdigtet vejrsnapshot og sikkert fravalg består.');
