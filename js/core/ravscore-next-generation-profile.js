import { NEXT_RAVSCORE_MODEL_ID } from './ravscore-next-generation.js';

export const NEXT_RAVSCORE_MEMORY_REFERENCE_SCOPE = 'CURRENT_COMMON_ZONE_REFERENCE';
export const NEXT_RAVSCORE_AVAILABILITY_POLICY = 'ravscore-local-fail-closed';
export const NEXT_RAVSCORE_SWITCH_SCHEMA_VERSION = '3.0.0';

export const NEXT_PUBLIC_RAVSCORE_PROFILE_SELECTION = Object.freeze({
  schemaVersion: NEXT_RAVSCORE_SWITCH_SCHEMA_VERSION,
  switchVersion: 'RAVSCORE-PROFILE-SWITCH-4.0.306',
  requestedProfileId: NEXT_RAVSCORE_MODEL_ID,
  rollbackProfileId: null,
  modelProfileId: NEXT_RAVSCORE_MODEL_ID,
  publicModelEnabled: true,
  prePublicWarmupAccepted: false,
  automaticActivationAllowed: false,
  publicAvailabilityPolicy: NEXT_RAVSCORE_AVAILABILITY_POLICY,
  legacyPublicFallbackAllowed: false,
});

const finite = value => value !== null
  && value !== undefined
  && value !== ''
  && typeof value !== 'boolean'
  && Number.isFinite(Number(value));
const clamp = value => Math.max(0, Math.min(100, Number(value)));

export function compactNextRavScoreEvaluation(result) {
  if (!result?.available || !finite(result.score)) {
    return Object.freeze({
      available: false,
      score: null,
      reason: result?.reason ?? 'RAVSCORE_NOT_AVAILABLE',
    });
  }
  const explanation = result.explanation || {};
  return Object.freeze({
    available: true,
    score: Number(result.score),
    modelId: result.modelId ?? result.modelVersion,
    components: result.components,
    contractVersion: result.contractVersion,
    stateSchemaVersion: result.stateSchemaVersion,
    explanation: Object.freeze({
      contractVersion: explanation.contractVersion ?? result.contractVersion,
      causalOrder: explanation.causalOrder,
      scoreMeaning: explanation.scoreMeaning,
      coastalSupply: explanation.coastalSupply,
      mobilisation: explanation.mobilisation,
      nearshoreSupport: explanation.nearshoreSupport,
      waterLevel: explanation.waterLevel,
      huntability: explanation.huntability,
      physicalCoupling: explanation.physicalCoupling,
      modeLimit: explanation.modeLimit,
      finalScore: explanation.finalScore,
      empiricalFindAccuracyClaimed: false,
      safetyAdviceIncluded: false,
    }),
    confidence: result.confidence ? Object.freeze({
      modelMaturity: result.confidence.modelMaturity,
      modelConfidence: result.confidence.modelConfidence,
      limitations: Object.freeze([...(result.confidence.limitations || [])]),
    }) : null,
    physicalOpportunity: result.components?.physicalOpportunity ?? null,
    nearshoreSupport: result.components?.nearshoreSupport ?? null,
    wadersHuntabilityMaximum: result.diagnostics?.wadersHuntabilityMaximum ?? null,
    wadersHuntabilityLimitApplied: explanation.modeLimit?.applied === true,
    empiricalFindAccuracyClaimed: false,
  });
}

const emptyReadiness = () => Object.freeze({
  modelCoverageReady: false,
  modelMemoryReady: false,
  referenceZoneCount: 0,
  referencePartCount: 0,
});

export function nextRavScoreReferenceReadiness(partRows = [], referenceTime = null) {
  const targetMs = Date.parse(referenceTime);
  if (!Number.isFinite(targetMs) || !Array.isArray(partRows) || partRows.length === 0) return emptyReadiness();
  const rowsByZone = new Map();
  for (const row of partRows) {
    if (typeof row?.zoneId !== 'string' || !row.zoneId || !Array.isArray(row.scores) || row.scores.length === 0) {
      return emptyReadiness();
    }
    if (!rowsByZone.has(row.zoneId)) rowsByZone.set(row.zoneId, []);
    rowsByZone.get(row.zoneId).push(row);
  }
  const selected = [];
  for (const rows of rowsByZone.values()) {
    const byRow = rows.map(row => new Map(row.scores
      .filter(score => score?.ravScore && Number.isFinite(Date.parse(score.time)))
      .map(score => [new Date(score.time).toISOString(), score])));
    if (byRow.some(scores => scores.size === 0)) return emptyReadiness();
    const common = [...byRow[0].keys()]
      .filter(time => byRow.every(scores => scores.has(time)))
      .filter(time => Date.parse(time) <= targetMs)
      .sort((left, right) => Date.parse(right) - Date.parse(left));
    if (!common[0]) return emptyReadiness();
    selected.push(...byRow.map((scores, index) => ({ row: rows[index], score: scores.get(common[0]) })));
  }
  if (selected.length !== partRows.length) return emptyReadiness();
  const modelCoverageReady = selected.every(({ score }) => ['waders', 'beach'].every(mode =>
    score.ravScore?.modes?.[mode]?.available === true
    && score.ravScore.modes[mode].modelId === NEXT_RAVSCORE_MODEL_ID
    && finite(score.ravScore.modes[mode].score)));
  const modelMemoryReady = selected.every(({ score }) =>
    score.ravScore?.transportMemoryReady === true
    && score.ravScore?.transportMemoryStatus === 'READY');
  return Object.freeze({
    modelCoverageReady,
    modelMemoryReady,
    referenceZoneCount: rowsByZone.size,
    referencePartCount: selected.length,
  });
}

export function nextPublicRavScoreConfigurationFromDocument(document) {
  if (!document || typeof document !== 'object') {
    return Object.freeze({ selection: NEXT_PUBLIC_RAVSCORE_PROFILE_SELECTION, evidence: Object.freeze({}) });
  }
  return Object.freeze({
    selection: Object.freeze({
      schemaVersion: document.schemaVersion,
      switchVersion: document.switchVersion,
      requestedProfileId: document.requestedProfileId,
      rollbackProfileId: document.rollbackProfileId,
      modelProfileId: document.modelProfileId,
      publicModelEnabled: document.publicModelEnabled,
      prePublicWarmupAccepted: document.prePublicWarmupAccepted,
      automaticActivationAllowed: document.automaticActivationAllowed,
      activationAuthority: document.activationAuthority,
      status: document.status,
      sourceVersion: document.sourceVersion,
      publicAvailabilityPolicy: document.publicAvailabilityPolicy,
      legacyPublicFallbackAllowed: document.legacyPublicFallbackAllowed,
    }),
    evidence: Object.freeze({ ...(document.evidence || {}) }),
  });
}

export function resolveNextPublicRavScoreProfile({
  selection = NEXT_PUBLIC_RAVSCORE_PROFILE_SELECTION,
  modelCoverageReady = false,
  modelMemoryReady = false,
} = {}) {
  const invalid = [];
  if (selection?.schemaVersion !== NEXT_RAVSCORE_SWITCH_SCHEMA_VERSION) invalid.push('INVALID_SELECTION_SCHEMA');
  if (selection?.switchVersion !== NEXT_PUBLIC_RAVSCORE_PROFILE_SELECTION.switchVersion) invalid.push('INVALID_SWITCH_VERSION');
  if (selection?.requestedProfileId !== NEXT_RAVSCORE_MODEL_ID) invalid.push('NEXT_MODEL_NOT_REQUESTED');
  if (selection?.modelProfileId !== NEXT_RAVSCORE_MODEL_ID) invalid.push('INVALID_MODEL_PROFILE');
  if (selection?.publicModelEnabled !== true) invalid.push('NEXT_MODEL_DISABLED');
  if (selection?.prePublicWarmupAccepted !== false) invalid.push('PREPUBLIC_WARMUP_FORBIDDEN');
  if (selection?.rollbackProfileId !== null) invalid.push('PUBLIC_ROLLBACK_PROFILE_FORBIDDEN');
  if (selection?.legacyPublicFallbackAllowed !== false) invalid.push('LEGACY_PUBLIC_FALLBACK_FORBIDDEN');
  if (selection?.publicAvailabilityPolicy !== NEXT_RAVSCORE_AVAILABILITY_POLICY) invalid.push('INVALID_PUBLIC_AVAILABILITY_POLICY');
  if (selection?.automaticActivationAllowed !== false) invalid.push('AUTOMATIC_ACTIVATION_FORBIDDEN');
  if (invalid.length) throw new Error(`Ugyldig offentlig RavScore-konfiguration: ${invalid.join(', ')}`);
  return Object.freeze({
    schemaVersion: selection.schemaVersion,
    switchVersion: selection.switchVersion,
    requestedProfileId: NEXT_RAVSCORE_MODEL_ID,
    activeProfileId: NEXT_RAVSCORE_MODEL_ID,
    rollbackProfileId: null,
    modelProfileId: NEXT_RAVSCORE_MODEL_ID,
    modelCoverageReady: modelCoverageReady === true,
    modelMemoryReady: modelMemoryReady === true,
    modelMemoryReferenceScope: NEXT_RAVSCORE_MEMORY_REFERENCE_SCOPE,
    activationState: 'next-ravscore-only-local-fail-closed',
    publicAvailabilityPolicy: NEXT_RAVSCORE_AVAILABILITY_POLICY,
    legacyPublicFallbackAllowed: false,
    automaticActivationAllowed: false,
  });
}

const MEMORY_REASON_TEXT = Object.freeze({
  WINDOW_INCOMPLETE: 'Der er endnu ikke nok sammenhængende strømdata til at beregne zonens RavScore.',
  WINDOW_HAS_MISSING_EVIDENCE: 'Der mangler en eller flere dokumenterede strømtimer i det nødvendige forløb.',
  WINDOW_HAS_TIME_GAP: 'Der er et hul i det sammenhængende strømforløb, som RavScore kræver.',
  LATEST_SAMPLE_MISSING: 'Den nyeste strømtime mangler, så zonens aktuelle RavScore ikke kan beregnes.',
});

export function nextRavScoreLocalAvailability(candidate, state) {
  const status = state?.transportMemoryStatus ?? 'RAVSCORE_STATE_MISSING';
  const ready = candidate?.available === true
    && finite(candidate?.score)
    && candidate?.modelId === NEXT_RAVSCORE_MODEL_ID;
  if (state?.transportMemoryReady === true && status === 'READY' && ready) {
    return Object.freeze({ available: true, code: 'READY', messageDa: null });
  }
  const code = ready ? status : 'RAVSCORE_SCORE_MISSING';
  return Object.freeze({
    available: false,
    code,
    messageDa: MEMORY_REASON_TEXT[code]
      ?? (code === 'RAVSCORE_SCORE_MISSING'
        ? 'De nødvendige data til RavScore mangler for denne kystdel og dette tidspunkt.'
        : 'Det sammenhængende datagrundlag til zonens RavScore er ikke klar.'),
  });
}

function rating(score) {
  if (!finite(score)) return { label: 'Ingen data', level: 'unavailable' };
  if (score >= 75) return { label: 'God', level: 'good' };
  if (score >= 55) return { label: 'Middel', level: 'fair' };
  if (score >= 35) return { label: 'Svag', level: 'weak' };
  return { label: 'Dårlig', level: 'poor' };
}

function componentReasons(candidate, mode, context) {
  const supply = Math.round(clamp(candidate.components.coastalSupply));
  const mobilisation = Math.round(clamp(candidate.components.mobilisation));
  const huntability = Math.round(clamp(candidate.components.huntability));
  return {
    huntability: [candidate.explanation?.waterLevel?.huntabilityBonusPoints > 0
      ? `${mode === 'waders' ? 'Søgeforholdene i vandet' : 'Søgeforholdene på stranden'} er ${huntability}/100; faldende vand giver en begrænset mulighed for et smallere, mere koncentreret søgebånd, hvor den lokale bund faktisk danner det.`
      : `${mode === 'waders' ? 'Søgeforholdene i vandet' : 'Søgeforholdene på stranden'} er ${huntability}/100 ud fra vind og bølger.`],
    transport: [context?.gridOutflowEvidenceActive === true
      ? 'Fralandsrettet gridstrøm dæmper den dokumenterede kystnære tilførselsevidens; den beviser ikke, at stranden eller surfzonen er tømt for rav.'
      : `Det dokumenterede kystnære tilførselspotentiale er ${supply}/100.`],
    release: [`Den kausale bølgeenergihukommelse giver mobilisering ${mobilisation}/100.`],
  };
}

export function projectNextRavScoreForPublic(candidate, { mode, profile, context = {} } = {}) {
  if (profile?.activeProfileId !== NEXT_RAVSCORE_MODEL_ID) throw new Error('Den nye RavScore kræver den aktive nye profil');
  if (!candidate?.available || !finite(candidate.score) || candidate.modelId !== NEXT_RAVSCORE_MODEL_ID) {
    throw new Error('Den nye RavScore-projektion er utilgængelig eller modelmismatchet');
  }
  const score = Math.round(clamp(candidate.score));
  const grade = rating(score);
  const components = {
    huntability: Math.round(clamp(candidate.components.huntability)),
    transport: Math.round(clamp(candidate.components.coastalSupply)),
    release: Math.round(clamp(candidate.components.mobilisation)),
  };
  const reasonsByComponent = componentReasons(candidate, mode, context);
  return {
    available: true,
    score,
    baseScore: score,
    level: grade.level,
    label: grade.label,
    components,
    componentReasons: reasonsByComponent,
    reasons: [reasonsByComponent.transport[0], reasonsByComponent.release[0], reasonsByComponent.huntability[0]],
    explanation: {
      modelId: NEXT_RAVSCORE_MODEL_ID,
      switchVersion: profile.switchVersion,
      weights: null,
      contributions: null,
      rawScore: candidate.explanation?.physicalCoupling?.nearshoreOpportunity ?? score,
      finalScore: score,
      formula: 'Kystnær tilførsel og mobilisering kobles først; nærkyststøtte og søgeforhold kan derefter kun begrænse muligheden.',
      scoreMeaning: 'Fysisk begrundet ravjagtmulighed – ikke en procentchance for fund',
      causalComponents: candidate.components,
      causalExplanation: candidate.explanation,
      transportDiagnostics: {
        engine: 'RAVSCORE_COASTAL_CAUSAL_CHAIN',
        transportPotential: candidate.components.coastalSupply,
        deliveryPotential: candidate.components.nearshoreSupport,
        transportAndDelivery: candidate.components.physicalOpportunity,
        transportReferenceAt: context.transportReferenceAt ?? null,
        transportMemoryReady: context.transportMemoryReady === true,
        transportMemoryStatus: context.transportMemoryStatus ?? null,
        transportMemoryCoverageHours: finite(context.transportMemoryCoverageHours)
          ? Number(context.transportMemoryCoverageHours) : null,
        transportMemoryWindowHours: finite(context.transportMemoryWindowHours)
          ? Number(context.transportMemoryWindowHours) : null,
        measurementStatus: context.measurementStatus ?? null,
        currentTransition: context.currentTransition ?? null,
        currentDirectionClass: context.currentDirectionClass ?? null,
        currentDirectionDifferenceDeg: finite(context.currentDirectionDifferenceDeg)
          ? Number(context.currentDirectionDifferenceDeg) : null,
        outboundEpisodeEffectiveHours: finite(context.outboundEpisodeEffectiveHours)
          ? Number(context.outboundEpisodeEffectiveHours) : null,
        outboundEpisodeLossPoints: finite(context.outboundEpisodeLossPoints)
          ? Number(context.outboundEpisodeLossPoints) : null,
        gridOutflowEvidenceActive: context.gridOutflowEvidenceActive === true,
        beachOrSurfZoneDepletionClaimed: false,
        windDirectlyIncluded: false,
        surfZoneResolved: false,
      },
      mobilisationDiagnostics: { mobilisationPotential: candidate.components.mobilisation },
      uncertainty: candidate.confidence,
      scoreIsSafetyAdvice: false,
      empiricalFindAccuracyClaimed: false,
    },
    scoreProfileId: NEXT_RAVSCORE_MODEL_ID,
    modelContractVersion: candidate.contractVersion ?? candidate.explanation?.contractVersion ?? null,
    stateSchemaVersion: candidate.stateSchemaVersion ?? null,
    explanationContractVersion: candidate.explanation?.contractVersion ?? candidate.contractVersion ?? null,
  };
}

export function selectNextPublicRavScoreResult({ profile, ravScore, state, mode, context = {} }) {
  if (!profile || profile.activeProfileId !== NEXT_RAVSCORE_MODEL_ID) {
    throw new Error(`Ukendt offentlig RavScore-profil: ${profile?.activeProfileId ?? 'mangler'}`);
  }
  const availability = nextRavScoreLocalAvailability(ravScore, state);
  if (!availability.available) return {
    available: false,
    score: null,
    level: 'unavailable',
    label: 'RavScore midlertidigt utilgængelig',
    unavailability: availability,
    reasons: [availability.messageDa],
    scoreProfileId: NEXT_RAVSCORE_MODEL_ID,
  };
  return projectNextRavScoreForPublic(ravScore, {
    mode,
    profile,
    context: {
      ...context,
      transportReferenceAt: context.transportReferenceAt ?? state?.transportReferenceAt ?? null,
      transportMemoryReady: context.transportMemoryReady ?? state?.transportMemoryReady ?? false,
      transportMemoryStatus: context.transportMemoryStatus ?? state?.transportMemoryStatus ?? null,
      transportMemoryCoverageHours: context.transportMemoryCoverageHours
        ?? state?.transportMemoryCoverageHours ?? null,
      transportMemoryWindowHours: context.transportMemoryWindowHours
        ?? state?.transportMemoryWindowHours ?? null,
    },
  });
}

export function rollbackNextPublicRavScoreSelection() {
  throw new Error('Offentlig komponent- eller legacyrollback er forbudt; rollback sker atomisk til sidste fuldt verificerede artifact.');
}
