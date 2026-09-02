import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  buildBoundedCurrentTransportMemory,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
} from '../js/core/ravscore-regime-memory.js';
import { candidateGStateKey } from './lib/coastal-point-staging-contract.mjs';
import {
  CANDIDATE_G_CONTINUATION_FIELDS,
  CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
  assertCandidateGRollbackBinding,
  assertCandidateGRollbackContinuation,
  buildCandidateGRollbackPartScoreSeries,
} from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import {
  RAVSCORE_CALIBRATION_ELIGIBLE,
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from './rollback-assets/ravscore-model-contract.js';

const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const digest = value => crypto.createHash('sha256')
  .update(JSON.stringify(canonical(value)))
  .digest('hex');
const HOUR_MS = 3_600_000;
const baseMs = Date.parse('2026-08-29T12:00:00.000Z');
const time = offset => new Date(baseMs + offset * HOUR_MS).toISOString();
const part = {
  partId: 'ROLLBACK-SYNTHETIC-PART-1',
  zoneId: 'ROLLBACK-SYNTHETIC-ZONE-1',
  waterPoint: [8, 55],
  onshoreDirectionDeg: 90,
};
const zone = { id: 'ROLLBACK-SYNTHETIC-ZONE-1', onshoreDirectionDeg: 90 };

assertCandidateGRollbackBinding();
assert.equal(RAVSCORE_MODEL_ID, CANDIDATE_G_STATE_MODEL_ID);
assert.equal(RAVSCORE_CALIBRATION_ELIGIBLE, false);
assert.equal(digest(RAVSCORE_MODEL_CONTRACT), RAVSCORE_MODEL_CONTRACT_SHA256);
assert.notEqual(RAVSCORE_MODEL_CONTRACT_SHA256, RAVSCORE_MODEL_BUNDLE_SHA256);
assert.deepEqual(Object.keys(ravScoreModelBinding()).sort(), [
  'bestTimePolicyId',
  'componentSchemaId',
  'explanationSchemaId',
  'modelBundleSha256',
  'modelContractSha256',
  'modelId',
  'presentationPolicyId',
  'profileId',
  'rankingPolicyId',
  'stateSchemaVersion',
  'variantId',
]);
assert.throws(
  () => assertRavScoreModelBinding({ ...ravScoreModelBinding(), extra: true }),
  /incompatible (?:exact key|field) set/,
);

const legacyEvidence = Array.from({ length: 49 }, (_, index) => ({
  time: time(index - 48),
  strength: index >= 36 ? 0.5 : 0,
}));
const legacyOracle = buildBoundedCurrentTransportMemory(legacyEvidence, {
  ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
  referenceTime: time(0),
  restartAfterVerifiedTimeGap: true,
});
assert.equal(legacyOracle.memoryReady, true);
const legacyState = {
  schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
  modelId: CANDIDATE_G_STATE_MODEL_ID,
  variantId: CANDIDATE_G_STATE_VARIANT_ID,
  profileId: CANDIDATE_G_STATE_PROFILE_ID,
  stateKey: candidateGStateKey(part),
  time: time(0),
  transportReferenceAt: time(0),
  transportPotential: legacyOracle.result.transportPotential,
  outboundEpisodeEffectiveHours: legacyOracle.result.outboundEpisodeEffectiveHours,
  transportMemoryReady: true,
  transportMemoryStatus: legacyOracle.status,
  transportMemoryWindowHours: legacyOracle.windowHours,
  transportMemoryCoverageHours: legacyOracle.coverageHours,
  transportEvidence: legacyOracle.evidence,
  mobilisationPotential: 64,
};
const weather = offset => ({
  time: time(offset),
  windSpeedMps: 5,
  windDirectionDeg: 270,
  waveHeightM: 1,
  wavePeriodS: 6,
  waveDirectionDeg: 270,
  waterLevelCm: 12,
  waterLevelTrendCm3h: -2,
  waterTemperatureC: 15,
  currentSpeedMps: 0.09,
  currentDirectionDeg: 90,
  currentUMps: 987.123,
  currentVMps: -654.321,
  currentProvenance: {
    status: 'verified',
    provider: 'synthetic-grid',
    gridPoint: [8.01, 55.01],
    samplingPoint: [8, 55],
    rawUMps: 987.123,
    rawVMps: -654.321,
  },
});

const direct = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [weather(1)],
  legacyCandidateGMigrationState: legacyState,
});
const warm = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [weather(2)],
  previousCandidateGContinuation: direct.candidateGState.continuationState,
});
assert.equal(direct.candidateGState.initialStateSource, 'LEGACY_SCHEMA2_MIGRATION');
assert.equal(warm.candidateGState.initialStateSource, 'PREVIOUS_PRIVATE_ROLLBACK');
assert.deepEqual(Object.keys(warm.candidateGState.continuationState).sort(),
  [...CANDIDATE_G_CONTINUATION_FIELDS].sort());
assertCandidateGRollbackContinuation(warm.candidateGState.continuationState, part);

for (const field of [
  'windSpeedMps', 'windDirectionDeg', 'waveHeightM', 'wavePeriodS',
  'waveDirectionDeg', 'waterLevelCm', 'waterLevelTrendCm3h',
  'waterTemperatureC', 'currentSpeedMps', 'currentDirectionDeg',
]) for (const invalidValue of ['1.5', false, [1.5]]) {
  assert.throws(() => buildCandidateGRollbackPartScoreSeries({
    part,
    zone,
    hourly: [{ ...weather(1), [field]: invalidValue }],
    legacyCandidateGMigrationState: legacyState,
  }), /strict finite JSON number in range/,
  `${field} must reject non-number ${JSON.stringify(invalidValue)}`);
}
for (const invalidDirection of ['90', false, [90]]) {
  assert.throws(() => buildCandidateGRollbackPartScoreSeries({
    part: { ...part, onshoreDirectionDeg: invalidDirection },
    zone,
    hourly: [weather(1)],
    legacyCandidateGMigrationState: legacyState,
  }), /strict numeric onshore direction/);
}

for (const mode of ['beach', 'waders']) {
  const actual = warm.scores[0].candidateG.publicModes[mode];
  assert.equal(actual.available, true);
  assert.deepEqual(actual.modelBinding, ravScoreModelBinding());
  assert.equal(actual.scoreQuality, 'FULL_HISTORY');
  assert.equal(actual.historyCoverageHours, 48);
  assert.equal(actual.scoreBounds.lower, actual.score);
  assert.equal(actual.scoreBounds.upper, actual.score);
  assert.equal(actual.scoreBounds.modelUncertaintyPoints, 0);
}
const warmReadyState = warm.candidateGState.rows[0];
assert.equal(warmReadyState.transportMemoryReady, true);
assert.equal(warmReadyState.transportMemoryStatus, 'READY');
assert.equal(warmReadyState.transportMemoryWindowHours, 48);
assert.equal(warmReadyState.transportMemoryCoverageHours, 48);
assert.equal(warm.scores[0].candidateG.rollbackId,
  CANDIDATE_G_OPERATIONAL_ROLLBACK_ID);

const serialized = JSON.stringify(warm);
assert.equal(serialized.includes('987.123'), false);
assert.equal(serialized.includes('-654.321'), false);
for (const forbidden of [
  'currentUMps', 'currentVMps', 'rawUMps', 'rawVMps', 'gridPoint', 'samplingPoint',
  'waterPoint', 'landPoint', 'coordinates',
]) {
  assert.equal(serialized.includes(`"${forbidden}"`), false,
    `rollback output must not retain ${forbidden}`);
}

assert.throws(() => buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [weather(1)],
  previousCandidateGContinuation: {
    ...legacyState,
    schemaVersion: 'ravscore-integrated-state-v4',
  },
}), /exact Candidate G schema-2 state/,
'integrated schema-4 state must never reconstruct the quantized Candidate G oracle');

assert.throws(() => buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [weather(2)],
  previousCandidateGContinuation: direct.candidateGState.continuationState,
  legacyCandidateGMigrationState: legacyState,
}), /may not be hybridized/,
'previous private Candidate state and one-shot migration state must never be mixed');
assert.throws(() => buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [weather(1)],
}), /requires an exact previous private or one-time legacy continuation/,
'missing protected Candidate continuation must fail closed instead of truncating wave memory');

const regionalProvenance = Object.freeze({
  status: 'verified',
  sourceClass: 'owner-approved-regional-proxy',
  source: 'dmi-dkss-lf-regional-proxy',
  collection: 'dkss_lf',
  distanceKm: 6.2,
});
const dmiProvenance = Object.freeze({
  status: 'verified',
  sourceClass: 'local-grid',
  source: 'dmi-local-grid',
  collection: 'dkss',
});
const copernicusProvenance = Object.freeze({
  status: 'verified',
  sourceClass: 'local-grid',
  source: 'copernicus-local-grid',
  collection: 'cmems',
});
const verifiedWeather = (offset, provenance) => ({
  ...weather(offset),
  currentProvenance: provenance,
});
const regionalWeather = (offset, currentSpeedMps = 0.09, currentDirectionDeg = 90) => ({
  ...verifiedWeather(offset, regionalProvenance),
  currentSpeedMps,
  currentDirectionDeg,
});
const missingWeather = offset => ({
  ...weather(offset),
  currentSpeedMps: null,
  currentDirectionDeg: null,
  currentProvenance: { status: 'unverified', reason: 'NO_EXACT_CURRENT' },
});
const HOLD_SHA = `sha256:${'a'.repeat(64)}`;
const stateOnlyCurrentHold = (validOffset, sourceOffset) => ({
  contractId: 'regional-dmi-exact-state-only-hold-v1',
  status: 'verified-derived-state-only',
  classification: 'REGIONAL_DMI_DERIVED_HOLD',
  stateOnly: true,
  partId: part.partId,
  parentZoneId: part.zoneId,
  targetIdentityFingerprint: HOLD_SHA,
  validTime: time(validOffset),
  sourceValidTime: time(sourceOffset),
  holdAgeHours: validOffset - sourceOffset,
  provider: 'dmi',
  sourceClass: regionalProvenance.sourceClass,
  source: regionalProvenance.source,
  collection: regionalProvenance.collection,
  modelRun: time(-60),
  closureContractId: 'current-operational-673x118-closure-ready-v1',
  closureId: HOLD_SHA,
  closureAssignmentSha256: HOLD_SHA,
  sourceAssetSha256: HOLD_SHA,
  sourceProofSha256: HOLD_SHA,
  vectorCommitmentSha256: HOLD_SHA,
});
const heldWeather = (validOffset, sourceOffset) => {
  const {
    currentUMps: _discardedU,
    currentVMps: _discardedV,
    currentSpeedMps: _discardedSpeed,
    currentDirectionDeg: _discardedDirection,
    ...stateOnlyWeather
  } = missingWeather(validOffset);
  return {
    ...stateOnlyWeather,
    currentStateOnlyHold: stateOnlyCurrentHold(validOffset, sourceOffset),
  };
};
for (const [field, value] of [
  ['rawU', 0.1],
  ['eastwardCurrent', 0.1],
  ['currentAlignment', 0.5],
  ['coastNormalSpeedMps', 0.1],
  ['currentVerified', false],
  ['gridCoordinates', [8, 55]],
  ['rawVector', [0.1, 0.2]],
  ['flowArrow', { directionDeg: 90 }],
]) {
  assert.throws(() => buildCandidateGRollbackPartScoreSeries({
    part,
    zone,
    hourly: [{ ...heldWeather(1, 0), [field]: value }],
    legacyCandidateGMigrationState: legacyState,
    nativeCadenceHoldHours: 3,
  }), /cannot contain a vector or projection/,
  `Candidate G must reject state-only hold field ${field}`);
}
const transition = (run, index = -1) =>
  run.scores.at(index).candidateG.publicContext.currentTransition;
const stateTransition = (run, index = -1) =>
  run.candidateGState.rows.at(index).currentTransition;

// Candidate G historically received 0.01 m/s and whole-degree projections.
// Exact integrated values stay exact in the integrated branch, but are not a
// valid Candidate continuation/reference until projected at that boundary.
const legacySpeed = value => Number(value.toFixed(2));
assert.equal(legacySpeed(0.0349), 0.03);
assert.equal(legacySpeed(0.035), 0.04);
for (const exactSpeed of [0.0349, 0.035]) {
  assert.throws(() => buildCandidateGRollbackPartScoreSeries({
    part,
    zone,
    hourly: [regionalWeather(1, exactSpeed)],
    legacyCandidateGMigrationState: legacyState,
    nativeCadenceHoldHours: 3,
  }), /legacy-quantized speed and direction projection/,
  `exact ${exactSpeed} m/s must not enter the Candidate G regional branch unprojected`);
}
assert.throws(() => buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [regionalWeather(1, 0.03, 89.5)],
  legacyCandidateGMigrationState: legacyState,
  nativeCadenceHoldHours: 3,
}), /legacy-quantized speed and direction projection/,
'a sub-degree regional direction must not enter the Candidate G branch unprojected');

const phase0Low = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [regionalWeather(1, legacySpeed(0.0349))],
  legacyCandidateGMigrationState: legacyState,
  nativeCadenceHoldHours: 3,
});
const phase0High = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [regionalWeather(1, legacySpeed(0.035))],
  legacyCandidateGMigrationState: legacyState,
  nativeCadenceHoldHours: 3,
});
assert.equal(phase0Low.candidateGState.initialStateSource, 'LEGACY_SCHEMA2_MIGRATION');
assert.equal(phase0High.candidateGState.initialStateSource, 'LEGACY_SCHEMA2_MIGRATION');
assert.equal(phase0Low.candidateGState.continuationState.transportEvidence.at(-1).strength, 0,
  '0.0349 m/s must remain the historical 0.03 m/s Candidate deadband value');
assert.ok(phase0High.candidateGState.continuationState.transportEvidence.at(-1).strength > 0,
  '0.035 m/s must remain the historical 0.04 m/s Candidate value');

const regionalReference = (speed = 0.03) => ({
  time: time(1),
  currentSpeedMps: speed,
  currentAlignment: 1,
  currentVerified: true,
  currentProvenance: regionalProvenance,
});
const phase1 = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [heldWeather(2, 1)],
  previousCandidateGContinuation: phase0Low.candidateGState.continuationState,
  nativeCadenceHoldHours: 3,
  nativeCadenceReferenceSample: regionalReference(0.03),
});
const phase2 = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [heldWeather(3, 1)],
  previousCandidateGContinuation: phase1.candidateGState.continuationState,
  nativeCadenceHoldHours: 3,
  nativeCadenceReferenceSample: regionalReference(0.03),
});
assert.equal(phase0Low.scores[0].candidateG.publicContext.currentVerified, true,
  'native phase 0 must be the real verified regional measurement');
assert.equal(transition(phase1), 'NATIVE_CADENCE_HOLD',
  'native phase 1 must hold only from the source-bound phase-0 measurement');
assert.equal(transition(phase2), 'NATIVE_CADENCE_HOLD',
  'native phase 2 must continue from the same source-bound phase-0 measurement');
assert.equal(phase1.candidateGState.initialStateSource, 'PREVIOUS_PRIVATE_ROLLBACK');
assert.equal(phase2.candidateGState.initialStateSource, 'PREVIOUS_PRIVATE_ROLLBACK');
assert.equal(phase2.candidateGState.continuationState.transportReferenceAt, time(1));

const phase1High = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [heldWeather(2, 1)],
  previousCandidateGContinuation: phase0High.candidateGState.continuationState,
  nativeCadenceHoldHours: 3,
  nativeCadenceReferenceSample: regionalReference(0.04),
});
assert.equal(transition(phase1High), 'NATIVE_CADENCE_HOLD');
for (const [exactSpeed, continuation] of [
  [0.0349, phase0Low.candidateGState.continuationState],
  [0.035, phase0High.candidateGState.continuationState],
]) {
  assert.throws(() => buildCandidateGRollbackPartScoreSeries({
    part,
    zone,
    hourly: [heldWeather(2, 1)],
    previousCandidateGContinuation: continuation,
    nativeCadenceHoldHours: 3,
    nativeCadenceReferenceSample: regionalReference(exactSpeed),
  }), /not the legacy-quantized projection/,
  `exact ${exactSpeed} m/s must not masquerade as a Candidate G continuation reference`);
}
assert.throws(() => buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [heldWeather(2, 1)],
  previousCandidateGContinuation: phase0Low.candidateGState.continuationState,
  nativeCadenceHoldHours: 3,
  nativeCadenceReferenceSample: {
    ...regionalReference(0.03),
    currentAlignment: Math.cos(0.4 * Math.PI / 180),
  },
}), /not the legacy-quantized projection/,
'a non-whole-degree reference alignment must fail closed');
assert.throws(() => buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [heldWeather(2, 1)],
  previousCandidateGContinuation: phase0Low.candidateGState.continuationState,
  nativeCadenceHoldHours: 3,
  nativeCadenceReferenceSample: {
    ...regionalReference(0.03),
    currentUMps: 0.03,
  },
}), /lacks exact regional source authorization/,
'the bounded Candidate reference must reject hidden raw-vector fields');

const regionalThenExactHold = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [regionalWeather(1), heldWeather(2, 1)],
  legacyCandidateGMigrationState: legacyState,
  nativeCadenceHoldHours: 3,
});
assert.equal(transition(regionalThenExactHold), 'NATIVE_CADENCE_HOLD');
const regionalThenUnmarked = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [regionalWeather(1), missingWeather(2)],
  legacyCandidateGMigrationState: legacyState,
  nativeCadenceHoldHours: 3,
  scoreStartAt: time(3),
});
assert.equal(stateTransition(regionalThenUnmarked), 'UNVERIFIED_PAUSE',
  'a neighbouring missing hour without its own closure marker must not inherit hold');

assert.throws(() => buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [verifiedWeather(1, dmiProvenance), missingWeather(2)],
  legacyCandidateGMigrationState: legacyState,
  nativeCadenceHoldHours: 3,
}), /exact READY 48-hour state/,
'an UNVERIFIED_PAUSE state must never be projected as an exact rollback score');
for (const [label, provenance] of [
  ['DMI exact', dmiProvenance],
  ['Copernicus exact', copernicusProvenance],
]) {
  const exactThenMissing = buildCandidateGRollbackPartScoreSeries({
    part,
    zone,
    hourly: [verifiedWeather(1, provenance), missingWeather(2)],
    legacyCandidateGMigrationState: legacyState,
    nativeCadenceHoldHours: 3,
    scoreStartAt: time(3),
  });
  assert.equal(exactThenMissing.scores.length, 0,
    `${label} source-authorization fixture must remain state-only`);
  assert.equal(stateTransition(exactThenMissing), 'UNVERIFIED_PAUSE',
    `${label} must never authorize a regional native-cadence hold`);
}

const sourceSwitch = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [
    regionalWeather(1),
    verifiedWeather(2, dmiProvenance),
    missingWeather(3),
  ],
  legacyCandidateGMigrationState: legacyState,
  nativeCadenceHoldHours: 3,
  scoreStartAt: time(4),
});
assert.equal(stateTransition(sourceSwitch), 'UNVERIFIED_PAUSE',
  'an exact local source must revoke a prior regional hold authorization');
const regionalLabelWithoutVector = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [
    { ...missingWeather(1), currentProvenance: regionalProvenance },
    missingWeather(2),
  ],
  legacyCandidateGMigrationState: legacyState,
  nativeCadenceHoldHours: 3,
  scoreStartAt: time(3),
});
assert.equal(stateTransition(regionalLabelWithoutVector), 'UNVERIFIED_PAUSE',
  'a regional provenance label without a finite speed/direction pair is not verified evidence');

const regionalSeed = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [regionalWeather(1)],
  legacyCandidateGMigrationState: legacyState,
  nativeCadenceHoldHours: 3,
});
const warmRegionalReference = {
  time: time(1),
  currentSpeedMps: 0.09,
  currentAlignment: 1,
  currentVerified: true,
  currentProvenance: regionalProvenance,
};
const warmRegionalHold = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [heldWeather(2, 1)],
  previousCandidateGContinuation: regionalSeed.candidateGState.continuationState,
  nativeCadenceHoldHours: 3,
  nativeCadenceReferenceSample: warmRegionalReference,
});
assert.equal(transition(warmRegionalHold), 'NATIVE_CADENCE_HOLD');
const warmWithoutSourceAuthorization = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [heldWeather(2, 1)],
  previousCandidateGContinuation: regionalSeed.candidateGState.continuationState,
  nativeCadenceHoldHours: 3,
  scoreStartAt: time(3),
});
assert.equal(stateTransition(warmWithoutSourceAuthorization), 'UNVERIFIED_PAUSE',
  'schema-2 state alone cannot prove a regional hold across a production run');
assert.throws(() => buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [heldWeather(2, 1)],
  previousCandidateGContinuation: regionalSeed.candidateGState.continuationState,
  nativeCadenceHoldHours: 3,
  nativeCadenceReferenceSample: {
    ...warmRegionalReference,
    currentProvenance: {
      status: 'verified',
      sourceClass: 'local-grid',
      source: 'dmi-local-grid',
      collection: 'dkss',
      distanceKm: 2,
    },
  },
}), /lacks exact regional source authorization/);
assert.throws(() => buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [heldWeather(2, 1)],
  previousCandidateGContinuation: direct.candidateGState.continuationState,
  nativeCadenceHoldHours: 3,
  nativeCadenceReferenceSample: {
    ...warmRegionalReference,
    time: time(0),
  },
}), /not the exact continuation evidence/,
'an older regional reference may not launder a newer DMI/Copernicus continuation into hold');

const ambiguousLegacyState = {
  ...legacyState,
  transportEvidence: legacyState.transportEvidence.map((item, index) => index === 40
    ? { ...item, strength: null }
    : item),
};
const historyIncompleteExactHold = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [heldWeather(1, 0)],
  previousCandidateGContinuation: ambiguousLegacyState,
  nativeCadenceHoldHours: 3,
  nativeCadenceReferenceSample: {
    ...warmRegionalReference,
    time: time(0),
  },
  scoreStartAt: time(2),
});
assert.equal(stateTransition(historyIncompleteExactHold), 'NATIVE_CADENCE_HOLD',
  'an exact operational marker may hold its own target despite older incomplete history');
assert.equal(historyIncompleteExactHold.candidateGState.continuationState.transportEvidence
  .some(item => item.strength === null), true);

const restartedRegionalHold = buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly: [
    regionalWeather(1),
    missingWeather(2),
    heldWeather(3, 1),
    regionalWeather(4),
    heldWeather(5, 4),
  ],
  legacyCandidateGMigrationState: legacyState,
  nativeCadenceHoldHours: 3,
  scoreStartAt: time(6),
});
assert.equal(stateTransition(restartedRegionalHold, -4), 'UNVERIFIED_PAUSE',
  'an unmarked gap must immediately revoke Candidate G hold authorization');
assert.equal(stateTransition(restartedRegionalHold, -3), 'UNVERIFIED_PAUSE',
  'a later marker may not skip across the earlier unmarked gap');
assert.equal(stateTransition(restartedRegionalHold, -2), 'BOUNDED_MEMORY_WARMUP',
  'a new direct regional row must restart a measured-only bounded suffix');
assert.equal(stateTransition(restartedRegionalHold), 'NATIVE_CADENCE_HOLD',
  'the restarted direct regional row must authorize its own exact next hold');
assert.equal(
  restartedRegionalHold.candidateGState.continuationState.transportReferenceAt,
  time(4),
  'the restarted hold must reference only the new direct regional source time',
);
assert.equal(restartedRegionalHold.candidateGState.continuationState.transportEvidence
  .some(item => item.strength === null), true,
  'the exact hold must not erase the earlier historical unknown from readiness');

console.log('Candidate G operational rollback oracle, separate continuation, source hold, binding and privacy: bestået.');
