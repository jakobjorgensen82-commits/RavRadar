import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  CANDIDATE_G_RAVSCORE_PROFILE_ID,
  LEGACY_RAVSCORE_PROFILE_ID,
  PUBLIC_RAVSCORE_PROFILE_SELECTION,
  resolvePublicRavScoreProfile,
  rollbackPublicRavScoreSelection,
  selectPublicRavScoreResult,
} from '../js/core/ravscore-profile-switch.js';
import { CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA } from '../js/core/ravscore-candidate-g.js';

const legacy = Object.freeze({
  available: true,
  score: 47,
  components: { huntability: 50, transport: 40, release: 55 },
  explanation: { weights: { huntability: 0.25, transport: 0.40, release: 0.35 } },
});
const candidateG = Object.freeze({
  available: true,
  modelId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
  score: 68,
  components: {
    huntability: 72,
    transport: 84,
    transportAndDelivery: 80,
    mobilisation: 64,
  },
  additiveScore: 73.6,
  outflowExhaustionGateApplied: false,
  outflowExhaustionExplanationDa: null,
});
const approvedCandidateSelection = Object.freeze({
  ...PUBLIC_RAVSCORE_PROFILE_SELECTION,
  requestedProfileId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
  candidateActivationEnabled: true,
});
const approvedEvidence = Object.freeze({
  freshFinalShadowRunId: 'synthetic-green-final-shadow',
  ownerReviewDecisionId: 'synthetic-owner-approval',
});

assert.equal(PUBLIC_RAVSCORE_PROFILE_SELECTION.requestedProfileId, LEGACY_RAVSCORE_PROFILE_ID);
assert.equal(PUBLIC_RAVSCORE_PROFILE_SELECTION.candidateActivationEnabled, false);
assert.equal(PUBLIC_RAVSCORE_PROFILE_SELECTION.automaticActivationAllowed, false);

const productionProfile = resolvePublicRavScoreProfile({ candidateCoverageReady: true });
assert.equal(productionProfile.activeProfileId, LEGACY_RAVSCORE_PROFILE_ID);
assert.equal(productionProfile.activationState, 'legacy-active-score-neutral');
assert.equal(selectPublicRavScoreResult({ profile: productionProfile, legacy, candidateG, mode: 'beach' }), legacy);

const blockedCandidate = resolvePublicRavScoreProfile({
  selection: approvedCandidateSelection,
  candidateCoverageReady: true,
});
assert.equal(blockedCandidate.activeProfileId, LEGACY_RAVSCORE_PROFILE_ID);
assert.equal(blockedCandidate.fallbackReason, 'FINAL_SHADOW_OR_OWNER_REVIEW_MISSING');

const incompleteCandidate = resolvePublicRavScoreProfile({
  selection: approvedCandidateSelection,
  evidence: approvedEvidence,
  candidateCoverageReady: false,
});
assert.equal(incompleteCandidate.activeProfileId, LEGACY_RAVSCORE_PROFILE_ID);
assert.equal(incompleteCandidate.fallbackReason, 'CANDIDATE_COVERAGE_INCOMPLETE');

const candidateProfile = resolvePublicRavScoreProfile({
  selection: approvedCandidateSelection,
  evidence: approvedEvidence,
  candidateCoverageReady: true,
});
assert.equal(candidateProfile.activeProfileId, CANDIDATE_G_RAVSCORE_PROFILE_ID);
assert.equal(candidateProfile.automaticActivationAllowed, false);
const projected = selectPublicRavScoreResult({
  profile: candidateProfile,
  legacy,
  candidateG,
  mode: 'waders',
});
assert.equal(projected.score, 68);
assert.deepEqual(projected.components, { huntability: 72, transport: 80, release: 64 });
assert.deepEqual(projected.explanation.weights, { huntability: 0.20, transport: 0.50, release: 0.30 });
assert.equal(projected.explanation.scoreIsSafetyAdvice, false);
assert.equal(projected.scoreProfileId, CANDIDATE_G_RAVSCORE_PROFILE_ID);

assert.throws(() => selectPublicRavScoreResult({
  profile: candidateProfile,
  legacy,
  candidateG: { available: false, score: null },
  mode: 'beach',
}), /mixed public score profiles are forbidden/);

assert.throws(() => selectPublicRavScoreResult({
  profile: candidateProfile,
  legacy,
  candidateG: { ...candidateG, modelId: 'OLDER-CANDIDATE' },
  mode: 'beach',
}), /does not match the resolved public profile/);

const exhausted = selectPublicRavScoreResult({
  profile: candidateProfile,
  legacy,
  candidateG: {
    ...candidateG,
    score: 0,
    components: { ...candidateG.components, transport: 0, transportAndDelivery: 0 },
    outflowExhaustionGateApplied: true,
    outflowExhaustionExplanationDa: CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA,
  },
  mode: 'beach',
});
assert.equal(exhausted.score, 0);
assert.deepEqual(exhausted.reasons, [CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA]);

const rollbackSelection = rollbackPublicRavScoreSelection(approvedCandidateSelection);
const rollbackProfile = resolvePublicRavScoreProfile({
  selection: rollbackSelection,
  evidence: approvedEvidence,
  candidateCoverageReady: true,
});
assert.equal(rollbackProfile.activeProfileId, LEGACY_RAVSCORE_PROFILE_ID);
assert.equal(selectPublicRavScoreResult({ profile: rollbackProfile, legacy, candidateG, mode: 'beach' }), legacy);

const unknownProfile = resolvePublicRavScoreProfile({
  selection: { ...PUBLIC_RAVSCORE_PROFILE_SELECTION, requestedProfileId: 'UNKNOWN' },
  candidateCoverageReady: true,
});
assert.equal(unknownProfile.activeProfileId, LEGACY_RAVSCORE_PROFILE_ID);
assert.equal(unknownProfile.fallbackReason, 'UNKNOWN_REQUESTED_PROFILE');

const mismatchedCandidateProfile = resolvePublicRavScoreProfile({
  selection: { ...approvedCandidateSelection, candidateProfileId: 'UNKNOWN-CANDIDATE' },
  evidence: approvedEvidence,
  candidateCoverageReady: true,
});
assert.equal(mismatchedCandidateProfile.activeProfileId, LEGACY_RAVSCORE_PROFILE_ID);
assert.equal(mismatchedCandidateProfile.fallbackReason, 'INVALID_CANDIDATE_PROFILE');

const mismatchedSwitchVersion = resolvePublicRavScoreProfile({
  selection: { ...approvedCandidateSelection, switchVersion: 'OLDER-SWITCH' },
  evidence: approvedEvidence,
  candidateCoverageReady: true,
});
assert.equal(mismatchedSwitchVersion.activeProfileId, LEGACY_RAVSCORE_PROFILE_ID);
assert.equal(mismatchedSwitchVersion.fallbackReason, 'INVALID_SWITCH_VERSION');

const updater = fs.readFileSync('scripts/update-weather.mjs', 'utf8');
for (const marker of [
  'resolvePublicRavScoreProfile',
  'selectPublicRavScoreResult',
  'candidateCoverageReady',
  'scoreProfile',
]) assert.ok(updater.includes(marker), `Den centrale pipeline mangler ${marker}`);

console.log('Versionsbundet RavScore-profilomskifter og fail-closed rollback: OK');
