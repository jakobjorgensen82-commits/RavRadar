import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  PUBLIC_RAVSCORE_PROFILE_SELECTION,
  integratedRavScoreReferenceReadiness,
  projectIntegratedRavScoreForPublic,
  publicRavScoreConfigurationFromDocument,
  resolvePublicRavScoreProfile,
  selectPublicRavScoreResult,
} from '../js/core/ravscore-public-model.js';
import {
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  RAVSCORE_SCORE_QUALITY,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import { evaluateRavScoreIntegrated } from '../js/core/ravscore-integrated.js';

const profile = resolvePublicRavScoreProfile({
  modelCoverageReady: true,
  modelMemoryReady: true,
  modelMigrationReady: true,
});
assert.equal(profile.activeProfileId, RAVSCORE_MODEL_ID);
assert.equal(profile.runtimeFallbackModelId, null);
assert.equal(profile.crossModelRuntimeFallbackAllowed, false);
assert.throws(() => resolvePublicRavScoreProfile({
  selection: { ...PUBLIC_RAVSCORE_PROFILE_SELECTION, runtimeFallbackModelId: 'candidate-g' },
}), /CROSS_MODEL_RUNTIME_FALLBACK_FORBIDDEN/);

const centralProfileDocument = JSON.parse(await fs.readFile(
  new URL('../data/admin/ravscore-profile-selection.json', import.meta.url),
  'utf8',
));
assert.equal(
  publicRavScoreConfigurationFromDocument(centralProfileDocument).selection.sourceVersion,
  centralProfileDocument.sourceVersion,
);
const centralSelection = publicRavScoreConfigurationFromDocument(centralProfileDocument).selection;
const centralBinding = ravScoreModelBinding();
for (const [field, expected] of Object.entries(centralBinding)) {
  const selectionField = field === 'modelId' ? 'activeModelId' : field;
  assert.equal(centralSelection[selectionField], expected,
    `central profile selection must carry exact ${field}`);
}
assert.throws(() => publicRavScoreConfigurationFromDocument(null), /central RavScore profile/);
for (const [field, value] of [
  ['sourceVersion', 'not-a-release'],
  ['status', 'unapproved'],
  ['activationAuthority', 'DEC-WRONG'],
]) {
  assert.throws(() => publicRavScoreConfigurationFromDocument({
    ...centralProfileDocument,
    [field]: value,
  }), /Ugyldig offentlig RavScore-konfiguration/,
  `central profile must fail closed for ${field}`);
}
for (const field of [
  'variantId',
  'profileId',
  'componentSchemaId',
  'explanationSchemaId',
  'rankingPolicyId',
  'bestTimePolicyId',
  'presentationPolicyId',
  'modelContractSha256',
  'modelBundleSha256',
]) {
  assert.throws(() => publicRavScoreConfigurationFromDocument({
    ...centralProfileDocument,
    [field]: `wrong-${field}`,
  }), /Ugyldig offentlig RavScore-konfiguration/,
  `central profile must fail closed for ${field}`);
}

const state = {
  currentMemoryReady: true,
  currentMemoryStatus: 'READY',
  currentTransition: 'VERIFIED_REPLAY',
  currentVerified: true,
  currentReferenceAt: '2026-08-29T09:00:00.000Z',
  supplyPotential: 80,
  waveMemoryReady: true,
  waveMemoryStatus: 'READY',
  waveLastVerifiedAt: '2026-08-29T09:00:00.000Z',
  mobilisationPotential: 70,
  lastMileMemoryReady: true,
  lastMileMemoryStatus: 'READY',
  lastMileEvidenceStatus: 'DIRECTIONAL_WAVE_EVIDENCE_READY',
  lastMileWaveActivity: 1,
  lastMileNormalAlignment: -1,
  lastMileTangentAlignment: 0,
  lastMileCoherence: 1,
  lastMileApproach: 0,
  lastMileFactor: 0.85,
  historyScoreView: {
    available: true,
    quality: RAVSCORE_SCORE_QUALITY.FULL_HISTORY,
    calibrationEligible: true,
    coverageHours: 48,
    requiredHours: 48,
    reasonCodes: [],
    conservativeTailResetApplied: false,
    current: { lowerPotential: 80, upperPotential: 80 },
    waveMobilisation: { lowerPotential: 70, upperPotential: 70 },
    lastMile: { lowerFactor: 0.85, upperFactor: 0.85 },
  },
};
const weather = {
  windSpeedMps: 5,
  waveHeightM: 1,
  wavePeriodS: 6,
  waveDirectionDeg: 270,
  currentSpeedMps: 0.12,
  currentDirectionDeg: 90,
  currentAlignment: -0.6,
  waterLevelCm: 10,
  waterLevelTrendCm3h: -2,
};
const result = evaluateRavScoreIntegrated({
  mode: 'beach',
  weather,
  zone: { onshoreDirectionDeg: 270 },
}, { state });
assert.equal(result.available, true,
  `public projection fixture must be a valid state-6 model result, got ${result.reason}`);
const projected = projectIntegratedRavScoreForPublic(result, {
  mode: 'beach',
  profile,
  context: { ...weather, currentVerified: true, waterLevelContext: result.diagnostics.waterLevelContext },
});
assert.equal(projected.scoreProfileId, RAVSCORE_MODEL_ID);
assert.deepEqual(projected.modelBinding, ravScoreModelBinding());
assert.deepEqual(Object.keys(projected.components).sort(), ['huntability', 'release', 'transport']);
assert.equal(projected.explanation.scoreIsFindProbability, false);
assert.equal(projected.explanation.transportDiagnostics.outflowWholeScoreGateApplied, false);
assert.equal(projected.explanation.waterLevelContext.currentRelation, 'OUTBOUND');
assert.ok(projected.reasons.some(reason => /beregnet lavere tre timer frem/.test(reason)));
assert.ok(projected.reasons.some(reason => /bestemmer ikke strømretningen/.test(reason)));
assert.ok(projected.reasons.some(reason => /beviser ikke fysisk koncentration/.test(reason)));
for (const forged of [
  { ...result, score: String(result.score) },
  {
    ...result,
    components: { ...result.components, mobilisation: String(result.components.mobilisation) },
  },
]) {
  assert.throws(() => projectIntegratedRavScoreForPublic(forged, {
    mode: 'beach',
    profile,
    context: weather,
  }), /lacks a required public component|incompatible model binding/,
  'public projection must reject numeric-string score fields');
}

const unavailableState = {
  currentMemoryReady: false,
  currentMemoryStatus: 'WINDOW_INCOMPLETE',
  waveMemoryReady: true,
  waveMemoryStatus: 'READY',
};
const unavailableResult = {
  available: false,
  score: null,
  modelVersion: RAVSCORE_MODEL_ID,
  modelBinding: ravScoreModelBinding(),
};
assert.deepEqual(selectPublicRavScoreResult({
  profile,
  modelResult: unavailableResult,
  modelState: unavailableState,
  mode: 'beach',
}).modelBinding, ravScoreModelBinding());
for (const forged of [
  { ...unavailableResult, modelVersion: 'FORGED' },
  { ...unavailableResult, modelBinding: { modelId: 'FORGED' } },
  { ...unavailableResult, modelBinding: { ...ravScoreModelBinding(), extra: true } },
  {
    ...unavailableResult,
    modelBinding: { ...ravScoreModelBinding(), componentSchemaId: 'forged-component' },
  },
]) {
  assert.throws(() => selectPublicRavScoreResult({
    profile,
    modelResult: forged,
    modelState: unavailableState,
    mode: 'beach',
  }), /incompatible model binding/,
  'unavailable results must never be re-stamped as the active integrated model');
}

const compactMode = {
  available: true,
  score: 60,
  modelId: RAVSCORE_MODEL_ID,
  modelContractSha256: RAVSCORE_MODEL_CONTRACT_SHA256,
  modelBundleSha256: RAVSCORE_MODEL_BUNDLE_SHA256,
  modelBinding: ravScoreModelBinding(),
};
const score = {
  time: '2026-08-29T09:00:00.000Z',
  ravScoreModel: {
    currentMemoryReady: true,
    currentMemoryStatus: 'READY',
    waveMemoryReady: true,
    waveMemoryStatus: 'MIGRATED_READY',
    lastMileMemoryReady: true,
    lastMileMemoryStatus: 'READY',
    modes: { beach: compactMode, waders: compactMode },
  },
};
const partRows = [
  { zoneId: 'Z1', ravScoreState: { migrationApplied: true }, scores: [score] },
  { zoneId: 'Z1', ravScoreState: { initialStateAccepted: true }, scores: [score] },
  { zoneId: 'Z2', ravScoreState: { migrationApplied: true }, scores: [score] },
];
const readiness = integratedRavScoreReferenceReadiness(partRows, '2026-08-29T09:30:00.000Z');
assert.equal(readiness.modelCoverageReady, true);
assert.equal(readiness.modelMemoryReady, true);
assert.equal(readiness.modelMigrationReady, true);
assert.equal(readiness.referenceZoneCount, 2);
assert.equal(readiness.referencePartCount, 3);

const mixed = structuredClone(partRows);
mixed[2].scores[0].ravScoreModel.modes.beach.modelId = 'WRONG';
assert.equal(
  integratedRavScoreReferenceReadiness(mixed, '2026-08-29T09:30:00.000Z').modelCoverageReady,
  false,
);

console.log('Integreret offentlig RavScore-profil og projektion: bestået.');
