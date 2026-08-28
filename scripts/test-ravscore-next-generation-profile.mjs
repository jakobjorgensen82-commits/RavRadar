import assert from 'node:assert/strict';
import { NEXT_RAVSCORE_MODEL_ID, evaluateNextGenerationRavScore } from '../js/core/ravscore-next-generation.js';
import {
  NEXT_PUBLIC_RAVSCORE_PROFILE_SELECTION,
  NEXT_RAVSCORE_AVAILABILITY_POLICY,
  compactNextRavScoreEvaluation,
  nextRavScoreReferenceReadiness,
  resolveNextPublicRavScoreProfile,
  selectNextPublicRavScoreResult,
} from '../js/core/ravscore-next-generation-profile.js';

const candidate = evaluateNextGenerationRavScore({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 90 },
  weather: {
    windSpeedMps: 4,
    waveHeightM: 1,
    wavePeriodS: 8,
    waveDirectionDeg: 270,
    waterLevelCm: 10,
    waterLevelTrendCm3h: 3,
  },
}, { memory: { transportPotential: 70, mobilisationPotential: 60 } });

const profile = resolveNextPublicRavScoreProfile({
  selection: NEXT_PUBLIC_RAVSCORE_PROFILE_SELECTION,
  modelCoverageReady: true,
  modelMemoryReady: true,
});
assert.equal(profile.activeProfileId, NEXT_RAVSCORE_MODEL_ID);
assert.equal(profile.publicAvailabilityPolicy, NEXT_RAVSCORE_AVAILABILITY_POLICY);
assert.equal(profile.rollbackProfileId, null);
assert.equal(profile.legacyPublicFallbackAllowed, false);
assert.equal(profile.automaticActivationAllowed, false);

const state = {
  transportMemoryReady: true,
  transportMemoryStatus: 'READY',
  transportMemoryCoverageHours: 48,
  transportMemoryWindowHours: 48,
};
const publicResult = selectNextPublicRavScoreResult({
  profile,
  ravScore: compactNextRavScoreEvaluation(candidate),
  state,
  mode: 'beach',
});
assert.equal(publicResult.available, true);
assert.equal(publicResult.scoreProfileId, NEXT_RAVSCORE_MODEL_ID);
assert.equal(publicResult.modelContractVersion, candidate.contractVersion);
assert.equal(publicResult.stateSchemaVersion, candidate.stateSchemaVersion);
assert.equal(publicResult.explanation.causalExplanation.physicalCoupling.supplyCountedOnce, true);
assert.equal(publicResult.explanation.causalExplanation.waterLevel.scoreImpact.coastalSupply, 0);
assert.equal(publicResult.explanation.causalExplanation.waterLevel.gridCurrentVectorAdded, false);
assert.ok(publicResult.explanation.uncertainty.limitations.length > 0);
assert.equal(publicResult.explanation.weights, null);
assert.equal(publicResult.explanation.contributions, null);
assert.equal(publicResult.explanation.transportDiagnostics.surfZoneResolved, false);
assert.equal(publicResult.explanation.empiricalFindAccuracyClaimed, false);

for (const status of ['WINDOW_INCOMPLETE', 'WINDOW_HAS_MISSING_EVIDENCE', 'WINDOW_HAS_TIME_GAP', 'LATEST_SAMPLE_MISSING']) {
  const unavailable = selectNextPublicRavScoreResult({
    profile,
    ravScore: candidate,
    state: { ...state, transportMemoryReady: false, transportMemoryStatus: status },
    mode: 'beach',
  });
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.score, null);
}

const time = '2026-08-28T12:00:00.000Z';
const readiness = nextRavScoreReferenceReadiness([{ zoneId: 'z1', scores: [{
  time,
  ravScore: {
    transportMemoryReady: true,
    transportMemoryStatus: 'READY',
    modes: {
      beach: { available: true, modelId: NEXT_RAVSCORE_MODEL_ID, score: 60 },
      waders: { available: true, modelId: NEXT_RAVSCORE_MODEL_ID, score: 50 },
    },
  },
}] }], time);
assert.equal(readiness.modelCoverageReady, true);
assert.equal(readiness.modelMemoryReady, true);

assert.throws(() => resolveNextPublicRavScoreProfile({
  selection: { ...NEXT_PUBLIC_RAVSCORE_PROFILE_SELECTION, rollbackProfileId: 'legacy' },
}), /PUBLIC_ROLLBACK_PROFILE_FORBIDDEN/);
assert.throws(() => resolveNextPublicRavScoreProfile({
  selection: { ...NEXT_PUBLIC_RAVSCORE_PROFILE_SELECTION, prePublicWarmupAccepted: true },
}), /PREPUBLIC_WARMUP_FORBIDDEN/);

console.log('OK: næste RavScore-profil er modelren, lokalt fail-closed og uden legacyrollback.');
