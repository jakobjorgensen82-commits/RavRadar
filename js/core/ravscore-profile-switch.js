import { CANDIDATE_G_STATE_MODEL_ID } from './ravscore-candidate-g-state-pipeline.js';

export const LEGACY_RAVSCORE_PROFILE_ID = 'RRS-CURRENT-B0-4.0.247';
export const CANDIDATE_G_RAVSCORE_PROFILE_ID = CANDIDATE_G_STATE_MODEL_ID;
export const CANDIDATE_G_MEMORY_REFERENCE_SCOPE = 'CURRENT_COMMON_ZONE_REFERENCE';

export const PUBLIC_RAVSCORE_PROFILE_SELECTION = Object.freeze({
  schemaVersion: '2.0.0',
  switchVersion: 'RAVSCORE-PROFILE-SWITCH-4.0.277',
  requestedProfileId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
  rollbackProfileId: null,
  candidateProfileId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
  candidateActivationEnabled: true,
  prePublicWarmupAccepted: true,
  automaticActivationAllowed: false,
  publicAvailabilityPolicy: 'candidate-g-local-fail-closed',
  legacyPublicFallbackAllowed: false,
});

export const PUBLIC_RAVSCORE_ACTIVATION_EVIDENCE = Object.freeze({
  freshFinalShadowRunId: null,
  ownerReviewDecisionId: null,
});

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

  const selectedEntries = [];
  for (const rows of rowsByZone.values()) {
    const scoresByRow = rows.map(row => new Map(row.scores
      .filter(score => score?.candidateG && Number.isFinite(Date.parse(score.time)))
      .map(score => [new Date(score.time).toISOString(), score])));
    if (scoresByRow.some(scores => scores.size === 0)) return emptyCandidateReferenceReadiness();
    const commonTimes = [...scoresByRow[0].keys()]
      .filter(time => scoresByRow.every(scores => scores.has(time)))
      .filter(time => Date.parse(time) <= targetMs)
      .sort((left, right) => Date.parse(right) - Date.parse(left));
    const selectedTime = commonTimes[0];
    if (!selectedTime) return emptyCandidateReferenceReadiness();
    selectedEntries.push(...scoresByRow.map((scores, index) => ({
      row: rows[index],
      score: scores.get(selectedTime),
    })));
  }

  if (selectedEntries.length !== partRows.length) return emptyCandidateReferenceReadiness();
  const memoryReady = selectedEntries.every(({ score }) =>
    score.candidateG.transportMemoryReady === true
    && score.candidateG.transportMemoryStatus === 'READY');
  const continuousOrLocalContextReset = selectedEntries.every(({ row }) =>
    row?.candidateGState?.initialStateAccepted === true
    || row?.candidateGState?.initialStateResetReason === 'COASTAL_PART_CONTEXT_CHANGED');
  const localContextResetCount = selectedEntries.filter(({ row }) =>
    row?.candidateGState?.initialStateAccepted !== true
    && row?.candidateGState?.initialStateResetReason === 'COASTAL_PART_CONTEXT_CHANGED').length;
  const localContextResetLimit = Math.max(1, Math.floor(partRows.length * 0.01));
  const warmupEligible = continuousOrLocalContextReset
    && localContextResetCount <= localContextResetLimit
    && selectedEntries.every(({ score }) => {
    const ready = score.candidateG.transportMemoryReady === true;
    const status = score.candidateG.transportMemoryStatus;
    return (ready && status === 'READY') || (!ready && status === 'WINDOW_INCOMPLETE');
  });
  return Object.freeze({
    candidateMemoryReady: memoryReady,
    candidateWarmupEligible: warmupEligible,
    referenceZoneCount: rowsByZone.size,
    referencePartCount: selectedEntries.length,
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

function daNumber(value, digits = 1) {
  return finite(value) ? Number(value).toFixed(digits).replace('.', ',') : null;
}

function currentDirectionText(alignment) {
  if (!finite(alignment)) return null;
  if (Number(alignment) >= 0.35) return 'ind mod kystdelen';
  if (Number(alignment) <= -0.35) return 'væk fra kystdelen';
  return 'mest langs kysten';
}

function buildComponentReasons(name, value, mode, context = {}) {
  const rounded = Math.round(clamp(value));
  if (name === 'huntability') {
    const wind = daNumber(context.windSpeedMps);
    const waves = daNumber(context.waveHeightM);
    if (mode === 'waders') {
      const actual = wind === null
        ? 'Den aktuelle vindstyrke mangler.'
        : `Vinden er ${wind} m/s${waves === null ? '' : `, og de beregnede bølger er ${waves} m`}.`;
      if (rounded >= 80) return [actual, 'Det giver gode muligheder for at lyse gennem vandet med waders.'];
      if (rounded >= 45) return [actual, 'Vindens krusninger gør det sværere, men stadig muligt, at lyse gennem vandet.'];
      if (rounded > 0) return [actual, 'Vindens krusninger gør det markant sværere at afsøge vandet effektivt.'];
      return [actual, 'Vindens krusninger gør det ikke realistisk at udnytte ravpotentialet med waders lige nu.'];
    }
    return [wind === null
      ? 'Ved strandjagt trækker manglende wadersforhold ikke RavScoren ned.'
      : `Vinden er ${wind} m/s. Ved strandjagt trækker wadersforholdene ikke RavScoren ned.`];
  }
  if (name === 'transport') {
    if (context.actualOutboundTransport === true) {
      return ['Den kraftige fralandsstrøm har varet længe nok til, at transporten mod kysten er brugt op.'];
    }
    const speed = daNumber(context.currentSpeedMps, 2);
    const direction = currentDirectionText(context.currentAlignment);
    const reasons = [speed !== null && direction
      ? `Den aktuelle strøm er ${speed} m/s og går ${direction}.`
      : 'Transporten bygger på det dokumenterede strømforløb gennem de seneste timer.'];
    const phase = context.currentTransition;
    if (phase === 'INBOUND_BUILDUP') reasons.push('Den indgående strøm bygger transporten mod kysten op time for time.');
    else if (phase === 'OUTBOUND_EROSION') {
      const hours = daNumber(context.outboundEpisodeEffectiveHours);
      reasons.push(hours === null
        ? 'Strøm væk fra kysten er begyndt at trække transportscoren ned.'
        : `Strøm væk fra kysten har reduceret transportscoren i cirka ${hours} effektiv${Number(context.outboundEpisodeEffectiveHours) === 1 ? '' : 'e'} time${Number(context.outboundEpisodeEffectiveHours) === 1 ? '' : 'r'}.`);
    } else if (phase === 'PASSIVE_NEUTRAL_DECAY') reasons.push('Strømmen giver hverken tydelig ind- eller udtransport, så tidligere opbygget transport aftager langsomt.');
    else if (phase === 'NATIVE_CADENCE_HOLD') reasons.push('Den godkendte strømkilde måler hver tredje time. Næste måling er endnu ikke kommet, så den senest dokumenterede transporttilstand bevares uden at lægge ny bevægelse til.');
    else if (phase === 'UNVERIFIED_PAUSE') reasons.push('Der mangler en verificeret strømmåling for denne time. Zonen får derfor ingen offentlig score, før datagrundlaget igen hænger sammen.');
    else if (rounded >= 70) reasons.push('De seneste timers samlede strømforløb giver stærke tegn på transport ind mod kysten.');
    else if (rounded >= 40) reasons.push('De seneste timers samlede strømforløb giver nogen transport ind mod kysten.');
    else if (rounded > 0) reasons.push('De seneste timers samlede strømforløb giver kun svag transport ind mod kysten.');
    else reasons.push('Strømforløbet giver ikke tegn på, at rav er ført ind mod kysten.');
    return reasons;
  }
  const waves = daNumber(context.waveHeightM);
  const reasons = [waves === null
    ? 'Der mangler en ny bølgehøjde for denne time.'
    : `De aktuelle beregnede bølger er ${waves} m.`];
  if (context.waveMobilisationTransition === 'build') reasons.push('Bølgeforløbet bygger lige nu muligheden op for, at allerede tilgængeligt rav er løsnet og holdes i bevægelse.');
  else if (context.waveMobilisationTransition === 'decay') reasons.push('Bølgerne er roligere end den tidligere tilstand, så den opbyggede virkning aftager gradvist.');
  else if (context.waveMobilisationTransition === 'missing-hold') reasons.push('Den senest dokumenterede bølgetilstand holdes uændret, indtil en ny måling findes.');
  else if (rounded >= 70) reasons.push('Bølgeforløbet gennem de seneste døgn har givet gode muligheder for at sætte allerede tilgængeligt rav i bevægelse.');
  else if (rounded >= 40) reasons.push('Bølgeforløbet gennem de seneste døgn har givet nogen mulighed for at sætte allerede tilgængeligt rav i bevægelse.');
  else if (rounded > 0) reasons.push('Bølgeforløbet gennem de seneste døgn har kun givet svage muligheder for at sætte allerede tilgængeligt rav i bevægelse.');
  else reasons.push('Bølgeforløbet giver ikke tegn på, at allerede tilgængeligt rav er sat i bevægelse.');
  return reasons;
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
    && (selection.status.startsWith('owner-approved-pre-public-')
      || selection.status.startsWith('owner-approved-candidate-g-only-'))
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
      publicAvailabilityPolicy: document.publicAvailabilityPolicy,
      legacyPublicFallbackAllowed: document.legacyPublicFallbackAllowed,
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
  const invalid = [];
  if (selection?.schemaVersion !== PUBLIC_RAVSCORE_PROFILE_SELECTION.schemaVersion) invalid.push('INVALID_SELECTION_SCHEMA');
  if (selection?.switchVersion !== PUBLIC_RAVSCORE_PROFILE_SELECTION.switchVersion) invalid.push('INVALID_SWITCH_VERSION');
  if (selection?.requestedProfileId !== CANDIDATE_G_RAVSCORE_PROFILE_ID) invalid.push('CANDIDATE_G_NOT_REQUESTED');
  if (selection?.candidateProfileId !== CANDIDATE_G_RAVSCORE_PROFILE_ID) invalid.push('INVALID_CANDIDATE_PROFILE');
  if (selection?.candidateActivationEnabled !== true) invalid.push('CANDIDATE_G_DISABLED');
  if (selection?.rollbackProfileId !== null) invalid.push('PUBLIC_ROLLBACK_PROFILE_FORBIDDEN');
  if (selection?.legacyPublicFallbackAllowed !== false) invalid.push('LEGACY_PUBLIC_FALLBACK_FORBIDDEN');
  if (selection?.publicAvailabilityPolicy !== 'candidate-g-local-fail-closed') invalid.push('INVALID_PUBLIC_AVAILABILITY_POLICY');
  if (selection?.automaticActivationAllowed !== false) invalid.push('AUTOMATIC_ACTIVATION_FORBIDDEN');
  if (invalid.length) throw new Error(`Ugyldig offentlig RavScore-konfiguration: ${invalid.join(', ')}`);
  const warmupAccepted = ownerApprovedPrePublicWarmup(selection, evidence);
  const advisories = [];
  if (candidateCoverageReady !== true) advisories.push('LOCAL_CANDIDATE_COVERAGE_INCOMPLETE');
  if (candidateMemoryReady !== true) advisories.push('LOCAL_CANDIDATE_MEMORY_INCOMPLETE');
  if (candidateWarmupEligible !== true) advisories.push('LOCAL_CANDIDATE_MEMORY_GAPS');
  return Object.freeze({
    schemaVersion: selection?.schemaVersion ?? '1.0.0',
    switchVersion: selection?.switchVersion ?? 'UNKNOWN_SWITCH_VERSION',
    requestedProfileId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
    activeProfileId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
    rollbackProfileId: null,
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
    activationState: 'candidate-g-only-local-fail-closed',
    fallbackReason: null,
    advisories,
    publicAvailabilityPolicy: 'candidate-g-local-fail-closed',
    legacyPublicFallbackAllowed: false,
    automaticActivationAllowed: false,
  });
}

const MEMORY_REASON_TEXT = Object.freeze({
  WINDOW_INCOMPLETE: 'Der er endnu ikke nok sammenhængende strømdata til at beregne zonens RavScore.',
  WINDOW_HAS_MISSING_EVIDENCE: 'Der mangler en eller flere dokumenterede strømtimer i det nødvendige forløb.',
  WINDOW_HAS_TIME_GAP: 'Der er et hul i det sammenhængende strømforløb, som RavScore kræver.',
  LATEST_SAMPLE_MISSING: 'Den nyeste strømtime mangler, så zonens aktuelle RavScore kan ikke beregnes.',
});

export function candidateGLocalAvailability(candidate, candidateState) {
  const status = candidateState?.transportMemoryStatus ?? 'CANDIDATE_G_STATE_MISSING';
  const candidateReady = candidate?.available === true
    && finite(candidate?.score)
    && candidate?.modelId === CANDIDATE_G_RAVSCORE_PROFILE_ID;
  if (candidateState?.transportMemoryReady === true && status === 'READY' && candidateReady) {
    return Object.freeze({ available: true, code: 'READY', messageDa: null });
  }
  const code = candidateReady ? status : 'CANDIDATE_G_SCORE_MISSING';
  return Object.freeze({
    available: false,
    code,
    messageDa: MEMORY_REASON_TEXT[code]
      ?? (code === 'CANDIDATE_G_SCORE_MISSING'
        ? 'De nødvendige data til Candidate G mangler for denne kystdel og dette tidspunkt.'
        : 'Det sammenhængende datagrundlag til zonens RavScore er ikke klar.'),
  });
}

export function projectCandidateGForPublic(candidate, { mode, profile, context = {} } = {}) {
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
    huntability: buildComponentReasons('huntability', huntability, mode, context),
    transport: buildComponentReasons('transport', transport, mode, context),
    release: buildComponentReasons('release', release, mode, context),
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

export function selectPublicRavScoreResult({ profile, candidateG, candidateState, mode, context = {} }) {
  if (!profile || profile.activeProfileId !== CANDIDATE_G_RAVSCORE_PROFILE_ID) {
    throw new Error(`Unknown resolved RavScore profile: ${profile?.activeProfileId ?? 'missing'}`);
  }
  const availability = candidateGLocalAvailability(candidateG, candidateState);
  if (!availability.available) return {
    available: false,
    score: null,
    level: 'unavailable',
    label: 'RavScore midlertidigt utilgængelig',
    unavailability: availability,
    reasons: [availability.messageDa],
    scoreProfileId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
  };
  return projectCandidateGForPublic(candidateG, { mode, profile, context });
}

export function rollbackPublicRavScoreSelection() {
  throw new Error('Offentlig rollback til den gamle RavScore-model er fjernet. Candidate G fejler lokalt og lukket.');
}
