import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  controlledLiveCurrentEnabled,
  mergeLiveCurrentPilotIntoRecord,
  openMeteoLiveRecordProjectionSha256,
} from './lib/live-current-pilot.mjs';
import { integratedInputCalibrationEligible } from './lib/ravscore-integrated-runtime.mjs';

const canonicalJson = value => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => (
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
};
const sha256 = value => `sha256:${crypto.createHash('sha256')
  .update(canonicalJson(value), 'utf8').digest('hex')}`;
const fingerprint = part => sha256({
  schemaVersion: 1,
  targets: [[
    part.partId,
    part.zoneId,
    part.waterPoint[0].toFixed(7),
    part.waterPoint[1].toFixed(7),
  ]],
});

const part = { partId: 'P1', zoneId: 'Z1', waterPoint: [10, 55] };
const referenceAt = '2026-09-05T01:00:00Z';
const acquiredAt = '2026-09-05T01:20:00Z';
const closureId = sha256('closure');
const recordId = sha256('open-meteo-record');
const ref = {
  partId: part.partId,
  validTime: referenceAt,
  recordId,
  source: 'open-meteo-meteofrance-currents',
};
const recordRefSha256 = sha256({
  contractId: 'open-meteo-current-record-ref-v1',
  recordRef: ref,
});
const assignmentIdentity = {
  ...ref,
  classification: 'OPEN_METEO_COMBINED_CURRENT',
  model: 'meteofrance_currents',
  acquiredAt,
  recordRefSha256,
  physicalScope: 'eulerian-waves-and-tides-combined-surface-current',
  scoreInputPolicyId: 'combined-current-single-channel-no-wave-or-tide-reprojection-v1',
  calibrationEligible: false,
};
const closureAssignmentSha256 = sha256({
  schemaVersion: 1,
  contractId: 'current-operational-source-assignment-v2',
  assignment: assignmentIdentity,
});
const entry = {
  recordProjectionContractId: 'open-meteo-live-current-record-fixed-decimal-v1',
  recordId,
  collectionId: closureId,
  productionReferenceAt: referenceAt,
  partId: part.partId,
  parentZoneId: part.zoneId,
  targetIdentityFingerprint: fingerprint(part),
  validTime: referenceAt,
  capturedAt: acquiredAt,
  acquisitionAt: acquiredAt,
  acquiredAt,
  requestContractId: 'open-meteo-marine-exact-residual-multilocation-v1',
  selectionPolicyId: 'explicit-meteofrance-currents-sea-cell-v1',
  samplingPoint: part.waterPoint,
  provider: 'open-meteo',
  sourceClass: 'external-combined-surface-current',
  source: 'open-meteo-meteofrance-currents',
  model: 'meteofrance_currents',
  physicalScope: 'eulerian-waves-and-tides-combined-surface-current',
  scoreInputPolicyId: 'combined-current-single-channel-no-wave-or-tide-reprojection-v1',
  calibrationEligible: false,
  gridPoint: part.waterPoint,
  distanceKm: 0,
  verticalLayer: 'surface',
  layerQuality: 'combined-surface-current',
  componentPair: 'derived-speed-toward-direction-same-hour',
  interpolation: false,
  vectorSemanticsVersion: 4,
  uMps: 0.25,
  vMps: 0,
  closureContractId: 'current-operational-673x118-closure-ready-v2',
  closureId,
  closureAssignmentSha256,
  classification: 'OPEN_METEO_COMBINED_CURRENT',
  recordRefSha256,
};
entry.recordProjectionSha256 = openMeteoLiveRecordProjectionSha256(entry);
assert.match(entry.recordProjectionSha256, /^sha256:[0-9a-f]{64}$/);

const closure = {
  schemaVersion: 2,
  contractId: 'current-operational-673x118-closure-safe-v2',
  closureId,
  status: 'READY',
  productionReferenceAt: referenceAt,
  operationalRangeEndAt: '2026-09-09T22:00:00Z',
  targetCount: 673,
  operationalHourCount: 118,
  totalPairCount: 673 * 118,
  sourceOrderContractId: 'dmi-verified-then-copernicus-baltic-then-amm15-then-regional-dmi-then-open-meteo-v2',
  dmiVerifiedPairCount: (673 * 118) - 1,
  copernicusBalticPairCount: 0,
  copernicusAmm15PairCount: 0,
  regionalNativePairCount: 0,
  regionalDerivedHoldPairCount: 0,
  regionalResidualPairCount: 0,
  openMeteoRequiredPairCount: 1,
  openMeteoPairCount: 1,
  supplementalAssignmentCount: 1,
  supplementalAssignmentsSha256: sha256([closureAssignmentSha256]),
  missingPairCount: 0,
  copernicusCompleteWithoutSourceStage: false,
  copernicusSourceStageStatus: 'READY',
  copernicusBoundedProgressAccepted: false,
  targetRegistrySha256: fingerprint(part),
  dmiCurrentInputSha256: sha256('dmi'),
  dmiLedgerSha256: sha256('ledger'),
  dmiAttestationSha256: sha256('attestation'),
  copernicusRegistrySha256: sha256('registry'),
  copernicusShadowSha256: sha256('shadow'),
  copernicusSourceStageSha256: sha256('stage'),
  copernicusRecordRefsSha256: sha256([]),
  regionalEvidenceSha256: sha256('regional'),
  regionalPolicySha256: sha256('policy'),
  regionalPairRefsSha256: sha256([]),
  openMeteoDocumentSha256: sha256('open-meteo-document'),
  openMeteoRecordRefsSha256: sha256([ref]),
  openMeteoPhysicalScope: 'eulerian-waves-and-tides-combined-surface-current',
  openMeteoScoreInputPolicyId: 'combined-current-single-channel-no-wave-or-tide-reprojection-v1',
  openMeteoCalibrationEligible: false,
  assignmentsSha256: sha256('all-assignments'),
  advisoryHistoryRequiredPairCount: 0,
  advisoryHistoryRequiredPairsSha256: sha256('advisory-required'),
  advisoryHistoryAvailablePairCount: 0,
  advisoryHistoryMissingPairCount: 0,
  advisoryHistoryRecordRefsSha256: sha256([]),
  advisoryHistoryAssignmentCount: 0,
  advisoryHistoryAssignmentsSha256: sha256([]),
  coordinatesIncluded: false,
  rawVectorsIncluded: false,
  partIdsIncluded: false,
  pairRefsIncluded: false,
};
closure.safeProjectionSha256 = sha256(closure);
const document = {
  schemaVersion: 1,
  controlledLivePilot: true,
  mode: 'controlled-live',
  enabled: true,
  credentialsIncluded: false,
  targetFingerprint: fingerprint(part),
  copernicusRangeSeal: null,
  operationalClosure: closure,
  entries: [entry],
  advisoryEntries: [],
};

assert.equal(controlledLiveCurrentEnabled(document), true);
const original = {
  hourly: [{
    time: '2026-09-05T01:00:00.000Z',
    waveHeightM: 0.7,
    waterLevelCm: 12,
    currentUMps: null,
    currentVMps: null,
    sources: { wave: { provider: 'dmi' }, waterLevel: { provider: 'dmi' } },
  }],
};
const merged = mergeLiveCurrentPilotIntoRecord(original, part, document);
assert.equal(merged.hourly[0].currentUMps, 0.25);
assert.equal(merged.hourly[0].waveHeightM, 0.7);
assert.equal(merged.hourly[0].waterLevelCm, 12);
assert.equal(merged.hourly[0].sources.wave.provider, 'dmi');
assert.equal(merged.hourly[0].sources.waterLevel.provider, 'dmi');
assert.equal(merged.hourly[0].currentProvenance.calibrationEligible, false);
assert.equal(merged.hourly[0].currentProvenance.scoreInputPolicyId,
  'combined-current-single-channel-no-wave-or-tide-reprojection-v1');
assert.equal(integratedInputCalibrationEligible(merged.hourly[0]), false);

const primary = {
  hourly: [{ ...original.hourly[0], currentUMps: 0.1, currentVMps: 0.2 }],
};
assert.deepEqual(
  mergeLiveCurrentPilotIntoRecord(primary, part, document, { primaryCurrentVerified: () => true }),
  primary,
  'Verified DMI must supersede the final fallback.',
);

for (const mutation of [
  { physicalScope: 'ocean-current-only' },
  { scoreInputPolicyId: 'reproject-wave-and-tide' },
  { calibrationEligible: true },
  { source: 'open-meteo-unbound' },
]) {
  const poisoned = { ...entry, ...mutation };
  const poisonedDocument = { ...document, entries: [poisoned] };
  assert.equal(controlledLiveCurrentEnabled(poisonedDocument), false);
}

assert.throws(() => integratedInputCalibrationEligible({
  currentProvenance: {
    ...merged.hourly[0].currentProvenance,
    physicalScope: 'ocean-current-only',
  },
}), /calibration contract is invalid/);

console.log('OK: Open-Meteo is closure-bound, final-priority, single-channel and calibration-ineligible.');
