import { CANDIDATE_G_STATE_MODEL_ID } from './ravscore-candidate-g-state-pipeline.js';

export const LEGACY_RAVSCORE_PROFILE_ID = 'RRS-CURRENT-B0-4.0.247';
export const CANDIDATE_G_RAVSCORE_PROFILE_ID = CANDIDATE_G_STATE_MODEL_ID;

export const PUBLIC_RAVSCORE_PROFILE_SELECTION = Object.freeze({
  schemaVersion: '1.0.0',
  switchVersion: 'RAVSCORE-PROFILE-SWITCH-4.0.260',
  requestedProfileId: LEGACY_RAVSCORE_PROFILE_ID,
  rollbackProfileId: LEGACY_RAVSCORE_PROFILE_ID,
  candidateProfileId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
  candidateActivationEnabled: false,
  automaticActivationAllowed: false,
});

export const PUBLIC_RAVSCORE_ACTIVATION_EVIDENCE = Object.freeze({
  freshFinalShadowRunId: null,
  ownerReviewDecisionId: null,
});

const KNOWN_PROFILE_IDS = new Set([
  LEGACY_RAVSCORE_PROFILE_ID,
  CANDIDATE_G_RAVSCORE_PROFILE_ID,
]);
const finite = value => value !== null
  && value !== undefined
  && value !== ''
  && typeof value !== 'boolean'
  && Number.isFinite(Number(value));
const clamp = value => Math.max(0, Math.min(100, Number(value)));

function rating(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return { label: 'Ingen data', level: 'unavailable' };
  if (value >= 75) return { label: 'God', level: 'good' };
  if (value >= 55) return { label: 'Middel', level: 'fair' };
  if (value >= 35) return { label: 'Svag', level: 'weak' };
  return { label: 'Dårlig', level: 'poor' };
}

function componentReason(name, value, mode) {
  const rounded = Math.round(clamp(value));
  if (name === 'huntability') {
    if (mode === 'waders') {
      if (rounded >= 80) return 'Vind og krusninger giver gode forhold for at afsøge vandet med waders.';
      if (rounded >= 45) return 'Vind og krusninger gør det sværere, men stadig muligt, at afsøge vandet med waders.';
      if (rounded > 0) return 'Vind og krusninger gør wadersjagten markant mindre effektiv.';
      return 'Vinden gør det ikke realistisk at udnytte ravpotentialet med waders lige nu.';
    }
    return 'Strandjagtens ravpotentiale begrænses ikke af wadersforholdene.';
  }
  if (name === 'transport') {
    if (rounded >= 70) return 'Strømforløbet har bygget et stærkt transportpotentiale ind mod kysten.';
    if (rounded >= 40) return 'Strømforløbet giver et middel transportpotentiale mod kysten.';
    if (rounded > 0) return 'Strømforløbet giver kun et svagt transportpotentiale mod kysten.';
    return 'Strømforløbet giver intet tilbageværende transportpotentiale mod kysten.';
  }
  if (rounded >= 70) return 'Bølgeenergien har opbygget et højt mobiliseringspotentiale.';
  if (rounded >= 40) return 'Bølgeenergien giver et middel mobiliseringspotentiale.';
  if (rounded > 0) return 'Bølgeenergien giver kun et lavt mobiliseringspotentiale.';
  return 'Bølgeenergien har ikke opbygget et dokumenteret mobiliseringspotentiale.';
}

function activationEvidenceReady(evidence = {}) {
  return typeof evidence.freshFinalShadowRunId === 'string'
    && evidence.freshFinalShadowRunId.length > 0
    && typeof evidence.ownerReviewDecisionId === 'string'
    && evidence.ownerReviewDecisionId.length > 0;
}

export function resolvePublicRavScoreProfile({
  selection = PUBLIC_RAVSCORE_PROFILE_SELECTION,
  evidence = PUBLIC_RAVSCORE_ACTIVATION_EVIDENCE,
  candidateCoverageReady = false,
} = {}) {
  const rollbackProfileId = selection?.rollbackProfileId === LEGACY_RAVSCORE_PROFILE_ID
    ? selection.rollbackProfileId
    : LEGACY_RAVSCORE_PROFILE_ID;
  const requestedProfileId = KNOWN_PROFILE_IDS.has(selection?.requestedProfileId)
    ? selection.requestedProfileId
    : rollbackProfileId;
  const candidateRequested = requestedProfileId === CANDIDATE_G_RAVSCORE_PROFILE_ID;
  const blockers = [];
  if (!KNOWN_PROFILE_IDS.has(selection?.requestedProfileId)) blockers.push('UNKNOWN_REQUESTED_PROFILE');
  if (selection?.switchVersion !== PUBLIC_RAVSCORE_PROFILE_SELECTION.switchVersion) blockers.push('INVALID_SWITCH_VERSION');
  if (selection?.rollbackProfileId !== LEGACY_RAVSCORE_PROFILE_ID) blockers.push('INVALID_ROLLBACK_PROFILE');
  if (selection?.candidateProfileId !== CANDIDATE_G_RAVSCORE_PROFILE_ID) blockers.push('INVALID_CANDIDATE_PROFILE');
  if (candidateRequested && selection?.candidateActivationEnabled !== true) blockers.push('CANDIDATE_ACTIVATION_DISABLED');
  if (candidateRequested && candidateCoverageReady !== true) blockers.push('CANDIDATE_COVERAGE_INCOMPLETE');
  if (candidateRequested && !activationEvidenceReady(evidence)) blockers.push('FINAL_SHADOW_OR_OWNER_REVIEW_MISSING');

  const candidateActive = candidateRequested && blockers.length === 0;
  return Object.freeze({
    schemaVersion: selection?.schemaVersion ?? '1.0.0',
    switchVersion: selection?.switchVersion ?? 'UNKNOWN_SWITCH_VERSION',
    requestedProfileId,
    activeProfileId: candidateActive ? CANDIDATE_G_RAVSCORE_PROFILE_ID : rollbackProfileId,
    rollbackProfileId,
    candidateProfileId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
    candidateCoverageReady: candidateCoverageReady === true,
    freshFinalShadowPassed: typeof evidence?.freshFinalShadowRunId === 'string'
      && evidence.freshFinalShadowRunId.length > 0,
    ownerReviewApproved: typeof evidence?.ownerReviewDecisionId === 'string'
      && evidence.ownerReviewDecisionId.length > 0,
    activationState: candidateActive ? 'candidate-active' : 'legacy-active-score-neutral',
    fallbackReason: blockers[0] ?? null,
    automaticActivationAllowed: false,
  });
}

export function projectCandidateGForPublic(candidate, { mode, profile } = {}) {
  if (profile?.activeProfileId !== CANDIDATE_G_RAVSCORE_PROFILE_ID) {
    throw new Error('Candidate G may only be projected by the resolved active Candidate G profile');
  }
  if (!candidate?.available || !finite(candidate.score)) {
    throw new Error('Candidate G projection is unavailable; mixed public score profiles are forbidden');
  }
  if (candidate.modelId !== CANDIDATE_G_RAVSCORE_PROFILE_ID) {
    throw new Error('Candidate G projection model does not match the resolved public profile');
  }
  const huntability = finite(candidate?.components?.huntability)
    ? Math.round(clamp(candidate.components.huntability)) : null;
  const transport = finite(candidate?.components?.transportAndDelivery)
    ? Math.round(clamp(candidate.components.transportAndDelivery)) : null;
  const release = finite(candidate?.components?.mobilisation)
    ? Math.round(clamp(candidate.components.mobilisation)) : null;
  if (![huntability, transport, release].every(finite)) {
    throw new Error('Candidate G projection lacks a required public component');
  }
  const score = Math.round(clamp(candidate.score));
  const scoreRating = rating(score);
  const weights = Object.freeze({ huntability: 0.20, transport: 0.50, release: 0.30 });
  const contributions = {
    huntability: Math.round(huntability * weights.huntability),
    transport: Math.round(transport * weights.transport),
    release: Math.round(release * weights.release),
  };
  const componentReasons = {
    huntability: [componentReason('huntability', huntability, mode)],
    transport: [componentReason('transport', transport, mode)],
    release: [componentReason('release', release, mode)],
  };
  const outflowReason = candidate.outflowExhaustionGateApplied === true
    ? candidate.outflowExhaustionExplanationDa : null;
  const reasons = outflowReason
    ? [outflowReason]
    : [componentReasons.transport[0], componentReasons.release[0], componentReasons.huntability[0]];

  return {
    available: true,
    score,
    baseScore: score,
    level: scoreRating.level,
    label: scoreRating.label,
    components: { huntability, transport, release },
    componentReasons,
    reasons,
    explanation: {
      modelId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
      switchVersion: profile.switchVersion,
      weights,
      contributions,
      rawScore: candidate.additiveScore ?? score,
      finalScore: score,
      formula: 'Jagtbarhed 20 % + transport 50 % + mobilisering 30 %',
      scoreMeaning: mode === 'waders'
        ? 'Ravpotentiale for wadersjagt, begrænset af jagtbarheden'
        : 'Ravpotentiale for strandjagt',
      transportDiagnostics: {
        transportPotential: candidate?.components?.transport ?? null,
        transportAndDelivery: transport,
        outflowExhaustionGateApplied: candidate.outflowExhaustionGateApplied === true,
      },
      mobilisationDiagnostics: { mobilisationPotential: release },
      outflowExhaustion: {
        applied: candidate.outflowExhaustionGateApplied === true,
        explanationDa: outflowReason,
      },
      scoreIsSafetyAdvice: false,
    },
    scoreProfileId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
  };
}

export function selectPublicRavScoreResult({ profile, legacy, candidateG, mode }) {
  if (!profile || profile.activeProfileId === LEGACY_RAVSCORE_PROFILE_ID) return legacy;
  if (profile.activeProfileId !== CANDIDATE_G_RAVSCORE_PROFILE_ID) {
    throw new Error(`Unknown resolved RavScore profile: ${profile.activeProfileId}`);
  }
  return projectCandidateGForPublic(candidateG, { mode, profile });
}

export function rollbackPublicRavScoreSelection(selection = PUBLIC_RAVSCORE_PROFILE_SELECTION) {
  return Object.freeze({
    ...selection,
    requestedProfileId: LEGACY_RAVSCORE_PROFILE_ID,
    rollbackProfileId: LEGACY_RAVSCORE_PROFILE_ID,
    candidateActivationEnabled: false,
    automaticActivationAllowed: false,
  });
}
