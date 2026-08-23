import { CANDIDATE_G_STATE_MODEL_ID } from './ravscore-candidate-g-state-pipeline.js';

export const LEGACY_RAVSCORE_PROFILE_ID = 'RRS-CURRENT-B0-4.0.247';
export const CANDIDATE_G_RAVSCORE_PROFILE_ID = CANDIDATE_G_STATE_MODEL_ID;
export const CANDIDATE_G_MEMORY_REFERENCE_SCOPE = 'CURRENT_COMMON_ZONE_REFERENCE';

export const PUBLIC_RAVSCORE_PROFILE_SELECTION = Object.freeze({
  schemaVersion: '1.1.0',
  switchVersion: 'RAVSCORE-PROFILE-SWITCH-4.0.264',
  requestedProfileId: LEGACY_RAVSCORE_PROFILE_ID,
  rollbackProfileId: LEGACY_RAVSCORE_PROFILE_ID,
  candidateProfileId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
  candidateActivationEnabled: false,
  prePublicWarmupAccepted: false,
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

const emptyCandidateReferenceReadiness = () => Object.freeze({
  candidateMemoryReady: false,
  candidateWarmupEligible: false,
  referenceZoneCount: 0,
  referencePartCount: 0,
});

/**
 * Resolves the Candidate G memory gate at the common current reference for
 * every coastal part in a zone. Later forecast gaps remain fail-closed inside
 * their own bounded state rows, but they must not retroactively classify the
 * current, continuous warmup window as a gap.
 */
export function candidateGReferenceReadiness(partRows = [], referenceTime = null) {
  const targetMs = Date.parse(referenceTime);
  if (!Number.isFinite(targetMs) || !Array.isArray(partRows) || partRows.length === 0) {
    return emptyCandidateReferenceReadiness();
  }

  const rowsByZone = new Map();
  for (const row of partRows) {
    if (typeof row?.zoneId !== 'string' || !row.zoneId || !Array.isArray(row.scores) || row.scores.length === 0) {
      return emptyCandidateReferenceReadiness();
    }
    if (!rowsByZone.has(row.zoneId)) rowsByZone.set(row.zoneId, []);
    rowsByZone.get(row.zoneId).push(row);
  }

  const selectedScores = [];
  for (const rows of rowsByZone.values()) {
    const scoresByRow = rows.map(row => new Map(row.scores
      .filter(score => score?.candidateG && Number.isFinite(Date.parse(score.time)))
      .map(score => [new Date(score.time).toISOString(), score])));
    if (scoresByRow.some(scores => scores.size === 0)) return emptyCandidateReferenceReadiness();
    const commonTimes = [...scoresByRow[0].keys()]
      .filter(time => scoresByRow.every(scores => scores.has(time)))
      .sort((left, right) => {
        const distance = Math.abs(Date.parse(left) - targetMs) - Math.abs(Date.parse(right) - targetMs);
        return distance || Date.parse(left) - Date.parse(right);
      });
    const selectedTime = commonTimes[0];
    if (!selectedTime) return emptyCandidateReferenceReadiness();
    selectedScores.push(...scoresByRow.map(scores => scores.get(selectedTime)));
  }

  if (selectedScores.length !== partRows.length) return emptyCandidateReferenceReadiness();
  const memoryReady = selectedScores.every(score =>
    score.candidateG.transportMemoryReady === true
    && score.candidateG.transportMemoryStatus === 'READY');
  const warmupEligible = selectedScores.every(score => {
    const ready = score.candidateG.transportMemoryReady === true;
    const status = score.candidateG.transportMemoryStatus;
    return (ready && status === 'READY') || (!ready && status === 'WINDOW_INCOMPLETE');
  });
  return Object.freeze({
    candidateMemoryReady: memoryReady,
    candidateWarmupEligible: warmupEligible,
    referenceZoneCount: rowsByZone.size,
    referencePartCount: selectedScores.length,
  });
}

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
    if (rounded >= 70) return 'Strømmen gennem de seneste timer giver stærke tegn på transport af rav ind mod kysten.';
    if (rounded >= 40) return 'Strømmen gennem de seneste timer giver nogen tegn på transport af rav ind mod kysten.';
    if (rounded > 0) return 'Strømmen gennem de seneste timer giver kun svage tegn på transport af rav ind mod kysten.';
    return 'Strømforløbet giver ikke tegn på, at rav er ført ind mod kysten.';
  }
  if (rounded >= 70) return 'Bølgerne gennem de seneste døgn har givet gode muligheder for at løsne rav fra havbunden.';
  if (rounded >= 40) return 'Bølgerne gennem de seneste døgn har givet nogen mulighed for at løsne rav fra havbunden.';
  if (rounded > 0) return 'Bølgerne gennem de seneste døgn har kun givet svage muligheder for at løsne rav fra havbunden.';
  return 'Der er ikke tegn på, at bølgerne har løsnet rav fra havbunden.';
}

function activationEvidenceReady(evidence = {}) {
  return typeof evidence.freshFinalShadowRunId === 'string'
    && evidence.freshFinalShadowRunId.length > 0
    && typeof evidence.ownerReviewDecisionId === 'string'
    && evidence.ownerReviewDecisionId.length > 0;
}

function ownerApprovedPrePublicWarmup(selection = {}, evidence = {}) {
  return selection.prePublicWarmupAccepted === true
    && selection.automaticActivationAllowed === false
    && typeof selection.activationAuthority === 'string'
    && selection.activationAuthority.length > 0
    && typeof selection.status === 'string'
    && selection.status.startsWith('owner-approved-pre-public-')
    && typeof evidence.ownerReviewDecisionId === 'string'
    && evidence.ownerReviewDecisionId.length > 0;
}

export function publicRavScoreConfigurationFromDocument(document) {
  if (!document || typeof document !== 'object') {
    return Object.freeze({
      selection: PUBLIC_RAVSCORE_PROFILE_SELECTION,
      evidence: PUBLIC_RAVSCORE_ACTIVATION_EVIDENCE,
    });
  }
  return Object.freeze({
    selection: Object.freeze({
      schemaVersion: document.schemaVersion,
      switchVersion: document.switchVersion,
      requestedProfileId: document.requestedProfileId,
      rollbackProfileId: document.rollbackProfileId,
      candidateProfileId: document.candidateProfileId,
      candidateActivationEnabled: document.candidateActivationEnabled,
      prePublicWarmupAccepted: document.prePublicWarmupAccepted,
      automaticActivationAllowed: document.automaticActivationAllowed,
      activationAuthority: document.activationAuthority,
      status: document.status,
      sourceVersion: document.sourceVersion,
    }),
    evidence: Object.freeze({
      freshFinalShadowRunId: document.evidence?.freshFinalShadowRunId ?? null,
      ownerReviewDecisionId: document.evidence?.ownerReviewDecisionId ?? null,
    }),
  });
}

export function resolvePublicRavScoreProfile({
  selection = PUBLIC_RAVSCORE_PROFILE_SELECTION,
  evidence = PUBLIC_RAVSCORE_ACTIVATION_EVIDENCE,
  candidateCoverageReady = false,
  candidateMemoryReady = candidateCoverageReady,
  candidateWarmupEligible = false,
} = {}) {
  const rollbackProfileId = selection?.rollbackProfileId === LEGACY_RAVSCORE_PROFILE_ID
    ? selection.rollbackProfileId
    : LEGACY_RAVSCORE_PROFILE_ID;
  const requestedProfileId = KNOWN_PROFILE_IDS.has(selection?.requestedProfileId)
    ? selection.requestedProfileId
    : rollbackProfileId;
  const candidateRequested = requestedProfileId === CANDIDATE_G_RAVSCORE_PROFILE_ID;
  const warmupAccepted = candidateRequested
    && ownerApprovedPrePublicWarmup(selection, evidence);
  const blockers = [];
  if (!KNOWN_PROFILE_IDS.has(selection?.requestedProfileId)) blockers.push('UNKNOWN_REQUESTED_PROFILE');
  if (selection?.schemaVersion !== PUBLIC_RAVSCORE_PROFILE_SELECTION.schemaVersion) blockers.push('INVALID_SELECTION_SCHEMA');
  if (selection?.switchVersion !== PUBLIC_RAVSCORE_PROFILE_SELECTION.switchVersion) blockers.push('INVALID_SWITCH_VERSION');
  if (selection?.rollbackProfileId !== LEGACY_RAVSCORE_PROFILE_ID) blockers.push('INVALID_ROLLBACK_PROFILE');
  if (selection?.candidateProfileId !== CANDIDATE_G_RAVSCORE_PROFILE_ID) blockers.push('INVALID_CANDIDATE_PROFILE');
  if (selection?.automaticActivationAllowed !== false) blockers.push('AUTOMATIC_ACTIVATION_FORBIDDEN');
  if (candidateRequested && selection?.candidateActivationEnabled !== true) blockers.push('CANDIDATE_ACTIVATION_DISABLED');
  if (candidateRequested && candidateCoverageReady !== true) blockers.push('CANDIDATE_COVERAGE_INCOMPLETE');
  if (candidateRequested && candidateMemoryReady !== true && !warmupAccepted) blockers.push('CANDIDATE_MEMORY_INCOMPLETE');
  if (candidateRequested && candidateMemoryReady !== true && warmupAccepted
    && candidateWarmupEligible !== true) blockers.push('CANDIDATE_MEMORY_GAP');
  if (candidateRequested && !activationEvidenceReady(evidence) && !warmupAccepted) {
    blockers.push('FINAL_SHADOW_OR_OWNER_REVIEW_MISSING');
  }

  const candidateActive = candidateRequested && blockers.length === 0;
  return Object.freeze({
    schemaVersion: selection?.schemaVersion ?? '1.0.0',
    switchVersion: selection?.switchVersion ?? 'UNKNOWN_SWITCH_VERSION',
    requestedProfileId,
    activeProfileId: candidateActive ? CANDIDATE_G_RAVSCORE_PROFILE_ID : rollbackProfileId,
    rollbackProfileId,
    candidateProfileId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
    candidateCoverageReady: candidateCoverageReady === true,
    candidateMemoryReady: candidateMemoryReady === true,
    candidateWarmupEligible: candidateWarmupEligible === true,
    candidateMemoryReferenceScope: CANDIDATE_G_MEMORY_REFERENCE_SCOPE,
    freshFinalShadowPassed: typeof evidence?.freshFinalShadowRunId === 'string'
      && evidence.freshFinalShadowRunId.length > 0,
    ownerReviewApproved: typeof evidence?.ownerReviewDecisionId === 'string'
      && evidence.ownerReviewDecisionId.length > 0,
    prePublicWarmupAccepted: warmupAccepted,
    activationState: candidateActive
      ? (candidateMemoryReady === true ? 'candidate-active' : 'candidate-active-pre-public-warmup')
      : 'legacy-active-score-neutral',
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
      formula: 'Søgeforhold 20 % + transport mod kysten 50 % + rav i bevægelse 30 %',
      scoreMeaning: mode === 'waders'
        ? 'Ravmulighed ved søgning i vandet, begrænset af søgeforholdene'
        : 'Ravmulighed ved søgning på stranden',
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
    prePublicWarmupAccepted: false,
    automaticActivationAllowed: false,
  });
}
