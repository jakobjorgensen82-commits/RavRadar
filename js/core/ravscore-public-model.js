import {
  RAVSCORE_BEST_TIME_POLICY_ID,
  RAVSCORE_COMPONENT_SCHEMA_ID,
  RAVSCORE_CURRENT_SUPPLY_POLICY,
  RAVSCORE_EXPLANATION_SCHEMA_ID,
  RAVSCORE_LAST_MILE_POLICY,
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  RAVSCORE_PRESENTATION_POLICY_ID,
  RAVSCORE_PROFILE_ID,
  RAVSCORE_RANKING_POLICY_ID,
  RAVSCORE_STATE_SCHEMA_VERSION,
  RAVSCORE_VARIANT_ID,
  RAVSCORE_WEIGHTS,
  RAVSCORE_WAVE_MOBILISATION_POLICY,
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from './ravscore-model-contract.js';
import { scoreRating } from './score-presentation.js';

export const CANDIDATE_G_ROLLBACK_MODEL_ID =
  'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3';
export const RAVSCORE_MEMORY_REFERENCE_SCOPE = 'CURRENT_COMMON_ZONE_REFERENCE';
export const RAVSCORE_PROFILE_SWITCH_VERSION = 'RAVSCORE-PROFILE-SWITCH-INTEGRATED-1.0.0';

export const PUBLIC_RAVSCORE_PROFILE_SELECTION = Object.freeze({
  schemaVersion: '3.0.0',
  switchVersion: RAVSCORE_PROFILE_SWITCH_VERSION,
  requestedProfileId: RAVSCORE_MODEL_ID,
  activeModelId: RAVSCORE_MODEL_ID,
  stateSchemaVersion: RAVSCORE_STATE_SCHEMA_VERSION,
  variantId: RAVSCORE_VARIANT_ID,
  profileId: RAVSCORE_PROFILE_ID,
  componentSchemaId: RAVSCORE_COMPONENT_SCHEMA_ID,
  explanationSchemaId: RAVSCORE_EXPLANATION_SCHEMA_ID,
  rankingPolicyId: RAVSCORE_RANKING_POLICY_ID,
  bestTimePolicyId: RAVSCORE_BEST_TIME_POLICY_ID,
  presentationPolicyId: RAVSCORE_PRESENTATION_POLICY_ID,
  modelContractSha256: RAVSCORE_MODEL_CONTRACT_SHA256,
  modelBundleSha256: RAVSCORE_MODEL_BUNDLE_SHA256,
  rollbackModelId: CANDIDATE_G_ROLLBACK_MODEL_ID,
  runtimeFallbackModelId: null,
  modelActivationEnabled: true,
  automaticActivationAllowed: false,
  publicAvailabilityPolicy: 'integrated-model-local-fail-closed',
  crossModelRuntimeFallbackAllowed: false,
  migrationRequiredAtFirstCutover: true,
});

export const PUBLIC_RAVSCORE_ACTIVATION_EVIDENCE = Object.freeze({
  decisionId: 'DEC-0110',
  exactHeadValidationRequired: true,
  freshProductionValidationRequired: true,
});

const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = value => Math.max(0, Math.min(100, Number(value)));
const hasExactRavScoreModelBinding = value => {
  try {
    return assertRavScoreModelBinding(value) === true;
  } catch {
    return false;
  }
};

function emptyReferenceReadiness() {
  return Object.freeze({
    modelCoverageReady: false,
    modelMemoryReady: false,
    modelMigrationReady: false,
    referenceZoneCount: 0,
    referencePartCount: 0,
    referenceTimes: [],
  });
}

export function integratedRavScoreReferenceReadiness(partRows = [], referenceTime = null) {
  const targetMs = Date.parse(referenceTime);
  if (!Number.isFinite(targetMs) || !Array.isArray(partRows) || partRows.length === 0) {
    return emptyReferenceReadiness();
  }
  const rowsByZone = new Map();
  for (const row of partRows) {
    if (typeof row?.zoneId !== 'string' || !row.zoneId
      || !Array.isArray(row?.scores) || row.scores.length === 0) {
      return emptyReferenceReadiness();
    }
    if (!rowsByZone.has(row.zoneId)) rowsByZone.set(row.zoneId, []);
    rowsByZone.get(row.zoneId).push(row);
  }

  const selectedEntries = [];
  const referenceTimes = [];
  for (const rows of rowsByZone.values()) {
    const scoresByRow = rows.map(row => new Map(row.scores
      .filter(score => score?.ravScoreModel && Number.isFinite(Date.parse(score.time)))
      .map(score => [new Date(score.time).toISOString(), score])));
    if (scoresByRow.some(scores => scores.size === 0)) return emptyReferenceReadiness();
    const commonTimes = [...scoresByRow[0].keys()]
      .filter(time => scoresByRow.every(scores => scores.has(time)))
      .filter(time => Date.parse(time) <= targetMs)
      .sort((left, right) => Date.parse(right) - Date.parse(left));
    const selectedTime = commonTimes[0];
    if (!selectedTime) return emptyReferenceReadiness();
    referenceTimes.push(selectedTime);
    selectedEntries.push(...scoresByRow.map((scores, index) => ({
      row: rows[index],
      score: scores.get(selectedTime),
    })));
  }
  if (selectedEntries.length !== partRows.length) return emptyReferenceReadiness();

  const coverageReady = selectedEntries.every(({ score }) =>
    ['waders', 'beach'].every(mode =>
      score.ravScoreModel?.modes?.[mode]?.available === true
      && score.ravScoreModel.modes[mode].modelId === RAVSCORE_MODEL_ID
      && hasExactRavScoreModelBinding(score.ravScoreModel.modes[mode].modelBinding)
      && score.ravScoreModel.modes[mode].modelContractSha256 === RAVSCORE_MODEL_CONTRACT_SHA256
      && score.ravScoreModel.modes[mode].modelBundleSha256 === RAVSCORE_MODEL_BUNDLE_SHA256
      && Number.isFinite(score.ravScoreModel.modes[mode].score)));
  const memoryReady = selectedEntries.every(({ score }) =>
    score.ravScoreModel.currentMemoryReady === true
      && RAVSCORE_CURRENT_SUPPLY_POLICY.readyStatuses
        .includes(score.ravScoreModel.currentMemoryStatus)
      && score.ravScoreModel.waveMemoryReady === true
      && RAVSCORE_WAVE_MOBILISATION_POLICY.readyStatuses
        .includes(score.ravScoreModel.waveMemoryStatus)
      && score.ravScoreModel.lastMileMemoryReady === true
      && RAVSCORE_LAST_MILE_POLICY.readyStatuses
        .includes(score.ravScoreModel.lastMileMemoryStatus));
  const migrationReady = selectedEntries.every(({ row }) =>
    row?.ravScoreState?.initialStateAccepted === true
      || row?.ravScoreState?.migrationApplied === true);

  return Object.freeze({
    modelCoverageReady: coverageReady,
    modelMemoryReady: memoryReady,
    modelMigrationReady: migrationReady,
    referenceZoneCount: rowsByZone.size,
    referencePartCount: selectedEntries.length,
    referenceTimes: Object.freeze([...new Set(referenceTimes)].sort()),
  });
}

export function publicRavScoreConfigurationFromDocument(document) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error('The central RavScore profile document is missing or invalid');
  }
  const configuration = Object.freeze({
    selection: Object.freeze({
      schemaVersion: document.schemaVersion,
      switchVersion: document.switchVersion,
      requestedProfileId: document.requestedProfileId,
      activeModelId: document.activeModelId,
      stateSchemaVersion: document.stateSchemaVersion,
      variantId: document.variantId,
      profileId: document.profileId,
      componentSchemaId: document.componentSchemaId,
      explanationSchemaId: document.explanationSchemaId,
      rankingPolicyId: document.rankingPolicyId,
      bestTimePolicyId: document.bestTimePolicyId,
      presentationPolicyId: document.presentationPolicyId,
      modelContractSha256: document.modelContractSha256,
      modelBundleSha256: document.modelBundleSha256,
      rollbackModelId: document.rollbackModelId,
      runtimeFallbackModelId: document.runtimeFallbackModelId,
      modelActivationEnabled: document.modelActivationEnabled,
      automaticActivationAllowed: document.automaticActivationAllowed,
      activationAuthority: document.activationAuthority,
      status: document.status,
      sourceVersion: document.sourceVersion,
      publicAvailabilityPolicy: document.publicAvailabilityPolicy,
      crossModelRuntimeFallbackAllowed: document.crossModelRuntimeFallbackAllowed,
      migrationRequiredAtFirstCutover: document.migrationRequiredAtFirstCutover,
    }),
    evidence: Object.freeze({
      decisionId: document.evidence?.decisionId ?? null,
      exactHeadValidationRequired: document.evidence?.exactHeadValidationRequired === true,
      freshProductionValidationRequired: document.evidence?.freshProductionValidationRequired === true,
    }),
  });
  // Do not let a missing/corrupt central document silently fall back to the
  // bundled defaults. Central owner-approved configuration is runtime truth;
  // the constants remain useful only for deterministic pure-model tests.
  resolvePublicRavScoreProfile(configuration);
  return configuration;
}

export function resolvePublicRavScoreProfile({
  selection = PUBLIC_RAVSCORE_PROFILE_SELECTION,
  evidence = PUBLIC_RAVSCORE_ACTIVATION_EVIDENCE,
  modelCoverageReady = false,
  modelMemoryReady = modelCoverageReady,
  modelMigrationReady = false,
} = {}) {
  const invalid = [];
  if (selection?.schemaVersion !== PUBLIC_RAVSCORE_PROFILE_SELECTION.schemaVersion) invalid.push('INVALID_SELECTION_SCHEMA');
  if (selection?.switchVersion !== RAVSCORE_PROFILE_SWITCH_VERSION) invalid.push('INVALID_SWITCH_VERSION');
  if (selection?.requestedProfileId !== RAVSCORE_MODEL_ID) invalid.push('INTEGRATED_MODEL_NOT_REQUESTED');
  if (selection?.activeModelId !== RAVSCORE_MODEL_ID) invalid.push('INVALID_ACTIVE_MODEL');
  if (selection?.stateSchemaVersion !== RAVSCORE_STATE_SCHEMA_VERSION) invalid.push('INVALID_STATE_SCHEMA');
  if (selection?.variantId !== RAVSCORE_VARIANT_ID) invalid.push('INVALID_VARIANT');
  if (selection?.profileId !== RAVSCORE_PROFILE_ID) invalid.push('INVALID_PROFILE');
  if (selection?.componentSchemaId !== RAVSCORE_COMPONENT_SCHEMA_ID) invalid.push('INVALID_COMPONENT_SCHEMA');
  if (selection?.explanationSchemaId !== RAVSCORE_EXPLANATION_SCHEMA_ID) invalid.push('INVALID_EXPLANATION_SCHEMA');
  if (selection?.rankingPolicyId !== RAVSCORE_RANKING_POLICY_ID) invalid.push('INVALID_RANKING_POLICY');
  if (selection?.bestTimePolicyId !== RAVSCORE_BEST_TIME_POLICY_ID) invalid.push('INVALID_BEST_TIME_POLICY');
  if (selection?.presentationPolicyId !== RAVSCORE_PRESENTATION_POLICY_ID) invalid.push('INVALID_PRESENTATION_POLICY');
  if (selection?.modelContractSha256 !== RAVSCORE_MODEL_CONTRACT_SHA256) invalid.push('INVALID_MODEL_CONTRACT');
  if (selection?.modelBundleSha256 !== RAVSCORE_MODEL_BUNDLE_SHA256) invalid.push('INVALID_MODEL_BUNDLE');
  if (selection?.rollbackModelId !== CANDIDATE_G_ROLLBACK_MODEL_ID) invalid.push('INVALID_EXPLICIT_ROLLBACK_MODEL');
  if (selection?.runtimeFallbackModelId !== null) invalid.push('CROSS_MODEL_RUNTIME_FALLBACK_FORBIDDEN');
  if (selection?.modelActivationEnabled !== true) invalid.push('INTEGRATED_MODEL_DISABLED');
  if (selection?.automaticActivationAllowed !== false) invalid.push('AUTOMATIC_ACTIVATION_FORBIDDEN');
  if (selection?.publicAvailabilityPolicy !== 'integrated-model-local-fail-closed') invalid.push('INVALID_PUBLIC_AVAILABILITY_POLICY');
  if (selection?.crossModelRuntimeFallbackAllowed !== false) invalid.push('CROSS_MODEL_RUNTIME_FALLBACK_FORBIDDEN');
  if (selection?.migrationRequiredAtFirstCutover !== true) invalid.push('FIRST_CUTOVER_MIGRATION_NOT_REQUIRED');
  if (evidence?.decisionId !== 'DEC-0110') invalid.push('MODEL_DECISION_MISSING');
  if (evidence?.exactHeadValidationRequired !== true) invalid.push('EXACT_HEAD_GATE_NOT_REQUIRED');
  if (evidence?.freshProductionValidationRequired !== true) invalid.push('FRESH_PRODUCTION_GATE_NOT_REQUIRED');
  const documentMetadataPresent = ['sourceVersion', 'status', 'activationAuthority']
    .some(key => Object.hasOwn(selection ?? {}, key));
  if (documentMetadataPresent) {
    if (!/^\d+\.\d+\.\d+$/.test(String(selection?.sourceVersion ?? ''))) {
      invalid.push('INVALID_PROFILE_SOURCE_VERSION');
    }
    if (!String(selection?.status ?? '').startsWith('owner-approved-integrated-model-only-')) {
      invalid.push('OWNER_APPROVED_PROFILE_STATUS_MISSING');
    }
    if (selection?.activationAuthority !== 'DEC-0110-integrated-ravscore-release-decision') {
      invalid.push('PROFILE_ACTIVATION_AUTHORITY_MISMATCH');
    }
  }
  if (invalid.length) throw new Error(`Ugyldig offentlig RavScore-konfiguration: ${invalid.join(', ')}`);

  const advisories = [];
  if (modelCoverageReady !== true) advisories.push('LOCAL_MODEL_COVERAGE_INCOMPLETE');
  if (modelMemoryReady !== true) advisories.push('LOCAL_MODEL_MEMORY_INCOMPLETE');
  if (modelMigrationReady !== true) advisories.push('MODEL_STATE_NOT_CONTINUED_OR_MIGRATED');
  return Object.freeze({
    schemaVersion: selection.schemaVersion,
    switchVersion: selection.switchVersion,
    requestedProfileId: RAVSCORE_MODEL_ID,
    activeProfileId: RAVSCORE_MODEL_ID,
    stateSchemaVersion: RAVSCORE_STATE_SCHEMA_VERSION,
    variantId: RAVSCORE_VARIANT_ID,
    profileId: RAVSCORE_PROFILE_ID,
    componentSchemaId: RAVSCORE_COMPONENT_SCHEMA_ID,
    explanationSchemaId: RAVSCORE_EXPLANATION_SCHEMA_ID,
    rankingPolicyId: RAVSCORE_RANKING_POLICY_ID,
    bestTimePolicyId: RAVSCORE_BEST_TIME_POLICY_ID,
    presentationPolicyId: RAVSCORE_PRESENTATION_POLICY_ID,
    modelContractSha256: RAVSCORE_MODEL_CONTRACT_SHA256,
    modelBundleSha256: RAVSCORE_MODEL_BUNDLE_SHA256,
    rollbackModelId: CANDIDATE_G_ROLLBACK_MODEL_ID,
    runtimeFallbackModelId: null,
    modelCoverageReady: modelCoverageReady === true,
    modelMemoryReady: modelMemoryReady === true,
    modelMigrationReady: modelMigrationReady === true,
    memoryReferenceScope: RAVSCORE_MEMORY_REFERENCE_SCOPE,
    activationState: 'integrated-model-only-local-fail-closed',
    advisories,
    publicAvailabilityPolicy: 'integrated-model-local-fail-closed',
    crossModelRuntimeFallbackAllowed: false,
    automaticActivationAllowed: false,
  });
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

function currentDiagnostics(context = {}) {
  const transition = context.currentTransition ?? null;
  const nativeCadenceHold = transition === 'NATIVE_CADENCE_HOLD';
  const verified = context.currentVerified === true && !nativeCadenceHold;
  const alignment = verified && finite(context.currentAlignment)
    ? Math.max(-1, Math.min(1, Number(context.currentAlignment)))
    : null;
  const directionDifferenceDeg = alignment === null ? null : Math.acos(alignment) * 180 / Math.PI;
  return {
    measurementStatus: verified ? 'VERIFIED' : nativeCadenceHold ? 'NATIVE_CADENCE_HOLD' : 'UNVERIFIED',
    currentVerified: verified,
    currentTransition: transition,
    currentAlignment: alignment,
    currentDirectionDifferenceDeg: directionDifferenceDeg,
    currentDirectionClass: alignment === null ? null
      : alignment >= 0.35 ? 'INBOUND'
        : alignment <= -0.35 ? 'OUTBOUND'
          : 'ALONG_COAST',
  };
}

function waterContextReason(context = {}) {
  const water = context?.waterLevelContext ?? {};
  const phase = water.phase;
  if (phase === 'FALLING') {
    const shared = 'Vandstanden er beregnet lavere tre timer frem; det er ikke i sig selv ebbe eller en tidevandsfase og bestemmer ikke strømretningen.';
    const exposure = 'Lavere vand kan blotlægge allerede afleveret eller fastholdt rav bag en revle og gøre et afgrænset område lettere at afsøge, men beviser ikke fysisk koncentration.';
    if (water.currentRelation === 'OUTBOUND') {
      return `${shared} Her falder vandet samtidig med verificeret søværts gridstrøm, som kan føre noget mobilt rav ud. ${exposure} Konteksten giver ingen RavScore-point.`;
    }
    if (water.currentRelation === 'INBOUND') {
      return `${shared} Her falder vandet samtidig med verificeret gridstrøm mod kystzonen. ${exposure} Konteksten giver ingen RavScore-point.`;
    }
    if (water.currentRelation === 'ALONG_OR_WEAK') {
      return `${shared} Den samtidige verificerede kystnormale gridstrøm er højst ±0,03 m/s og klassificeres som langs/for svag. ${exposure} Konteksten giver ingen RavScore-point.`;
    }
    return `${shared} Den samtidige strømretning er ukendt eller holdes på kildens native cadence og kan derfor ikke klassificeres sikkert. ${exposure} Konteksten giver ingen RavScore-point.`;
  }
  if (phase === 'RISING') {
    return 'Vandet er på vej op. Det ændrer adgangen, men er ikke i sig selv bevis for transport ind mod kysten og giver ingen RavScore-point.';
  }
  if (phase === 'STABLE') return 'Vandstanden er omtrent stabil og bruges kun som søgekontekst, ikke som transportpoint.';
  return 'Vandstandskonteksten er ukendt og erstatter aldrig manglende strømevidens.';
}

function componentReasons(name, value, mode, context = {}) {
  const display = Math.round(clamp(value));
  if (name === 'huntability') {
    const wind = daNumber(context.windSpeedMps);
    const waves = daNumber(context.waveHeightM);
    if (mode === 'waders') {
      const actual = wind === null
        ? 'Den aktuelle vindstyrke mangler.'
        : `Vinden er ${wind} m/s${waves === null ? '' : `, og de beregnede bølger er ${waves} m`}.`;
      if (finite(context.waveHeightM) && Number(context.waveHeightM) >= 2.5) {
        return [actual, 'Havmodellens bølger er ikke en lokal surfzone- eller sikkerhedsmåling. Waders-forholdene er derfor uafklarede; RavScore er ikke en opfordring til at gå i vandet.'];
      }
      if (display >= 80) return [actual, 'Vind- og bølgeproxyen giver relativt gode modellerede søgeforhold. Det er ikke en sikkerhedsvurdering eller en opfordring til at gå i vandet.'];
      if (display >= 45) return [actual, 'Vind- og bølgeproxyen tyder på vanskeligere, men mulig afsøgning. Det er ikke en sikkerhedsvurdering.'];
      if (display > 0) return [actual, 'Vind- og bølgeproxyen tyder på markant vanskeligere afsøgning. Det er ikke en sikkerhedsvurdering.'];
      return [actual, 'Søgeforholdsproxyen kan ikke udnytte det øvrige potentiale med waders lige nu; dette er ikke sikkerhedsråd.'];
    }
    return [wind === null
      ? 'Strandens aktuelle jagtbarhed bygger på den tilgængelige bølgekontekst.'
      : `Vinden er ${wind} m/s. Strandjagt påvirkes mindre end søgning i vandet.`];
  }
  if (name === 'transport') {
    const speed = daNumber(context.currentSpeedMps, 2);
    const direction = currentDirectionText(context.currentAlignment);
    const reasons = [speed !== null && direction
      ? `Den aktuelle verificerede modelstrøm er ${speed} m/s og går ${direction}.`
      : 'Transportleddet bygger på verificeret kystnormal modelstrøm gennem de seneste 48 timer.'];
    if (context.currentTransition === 'NATIVE_CADENCE_HOLD') {
      reasons.push('Kilden leverer på native cadence; tilstanden holdes uden at tilføje et nyt strømevidensinterval.');
    } else if (display >= 70) {
      reasons.push('Det vægtede strømforløb giver stærkt nyligt transportbevis mod kystzonen.');
    } else if (display >= 40) {
      reasons.push('Det vægtede strømforløb giver noget nyligt transportbevis mod kystzonen.');
    } else if (display > 0) {
      reasons.push('Det vægtede strømforløb giver kun svagt nyligt transportbevis mod kystzonen.');
    } else {
      reasons.push('Der er ikke dokumenteret nyligt transportbevis mod kystzonen. Det beviser ikke, at alt lokalt rav er væk.');
    }
    const factor = finite(context.lastMileFactor)
      ? Number(context.lastMileFactor).toFixed(2).replace('.', ',')
      : null;
    reasons.push(factor === null
      ? 'Det eksisterende transportbevis dæmpes højst 15 % af den energivægtede bølgeretning; bølger kan aldrig skabe eller øge tilførsel.'
      : `Det eksisterende transportbevis er ganget én gang med den afgrænsede bølgeretningsfaktor ${factor}; faktoren kan kun ligge mellem 0,85 og 1,00.`);
    reasons.push('Det sidste stykke gennem nærkyst- og surfzonen er fortsat fysisk uopløst; retningssammenhæng påvirker kun usikkerhed og forklaring.');
    return reasons;
  }
  const waves = daNumber(context.waveHeightM);
  const reasons = [waves === null
    ? 'Der mangler en gyldig bølgehøjde for denne time.'
    : `De aktuelle beregnede bølger er ${waves} m.`];
  if (context.waveTransition === 'BUILD') reasons.push('Bølgeenergien bygger modellens mobiliseringspotentiale op.');
  else if (context.waveTransition === 'DECAY') reasons.push('Lavere bølgeenergi lader modellens tidligere mobiliseringspotentiale aftage gradvist.');
  else if (context.waveMemoryStatus === 'RECOVERED_SHORT_GAP') reasons.push('Bølgerne er tilbage efter et kort hul; højst én times ny opbygning er krediteret.');
  else if (context.waveMemoryStatus === 'RESTARTED_AFTER_GAP') reasons.push('Bølgerne er tilbage efter et længere hul; modellens mobiliseringspotentiale er genstartet konservativt.');
  if (display >= 70) reasons.push('Bølgeforløbet giver stærkt relativt modelbevis for mobiliseringsmulighed.');
  else if (display >= 40) reasons.push('Bølgeforløbet giver noget relativt modelbevis for mobiliseringsmulighed.');
  else if (display > 0) reasons.push('Bølgeforløbet giver kun svagt relativt modelbevis for mobiliseringsmulighed.');
  else reasons.push('Bølgeforløbet giver ikke aktuelt modelbevis for mobiliseringsmulighed.');
  return reasons;
}

const AVAILABILITY_TEXT = Object.freeze({
  WINDOW_INCOMPLETE: 'Der er endnu ikke nok sammenhængende verificeret strømevidens til denne kystdel.',
  WINDOW_HAS_MISSING_EVIDENCE: 'Der mangler verificeret strømevidens i det nødvendige forløb.',
  WINDOW_HAS_TIME_GAP: 'Der er et hul i det sammenhængende strømforløb.',
  LATEST_SAMPLE_MISSING: 'Den seneste native modelstrømprøve mangler.',
  MISSING_INPUT: 'Den nødvendige bølgehøjde eller periode mangler for denne time.',
  DIRECT_SCORE_INPUT_MISSING: 'Et direkte, tidsbundet vejrinput mangler for denne scoretime.',
  INVALID_SCORE_QUALITY_CONTRACT: 'RavScore-resultatet mangler en gyldig historikkvalitetskontrakt.',
});

function exactScoreQualityContract(modelResult) {
  const quality = modelResult?.scoreQuality;
  const coverage = modelResult?.historyCoverageHours;
  const reasonCodes = modelResult?.historyReasonCodes;
  if (!finite(coverage)
    || coverage < 0
    || coverage > RAVSCORE_CURRENT_SUPPLY_POLICY.windowHours
    || !Array.isArray(reasonCodes)
    || reasonCodes.some(code => typeof code !== 'string'
      || !/^[A-Z][A-Z0-9_]{0,127}$/.test(code))
    || new Set(reasonCodes).size !== reasonCodes.length) return false;
  if (quality === 'FULL_HISTORY') {
    return modelResult.calibrationEligible === true
      && coverage === RAVSCORE_CURRENT_SUPPLY_POLICY.windowHours
      && reasonCodes.length === 0
      && ['EXACT_POINT_SCORE', 'CONSERVATIVE_TAIL_RESET_POINT_SCORE']
        .includes(modelResult.scoreSemantics)
      && typeof modelResult.conservativeTailResetApplied === 'boolean'
      && modelResult.conservativeTailResetApplied
        === (modelResult.scoreSemantics === 'CONSERVATIVE_TAIL_RESET_POINT_SCORE');
  }
  if (quality === 'HISTORY_INCOMPLETE') {
    return modelResult.calibrationEligible === false
      && reasonCodes.length > 0
      && modelResult.scoreSemantics === 'CONSERVATIVE_ENCLOSING_LOWER_BOUND'
      && typeof modelResult.conservativeTailResetApplied === 'boolean';
  }
  return false;
}

const SCORE_BOUND_FIELDS = Object.freeze([
  'lower', 'upper', 'modelUncertaintyPoints', 'rawLower', 'rawUpper',
]);

function exactScoreBoundsContract(modelResult) {
  if (modelResult?.available !== true) return modelResult?.scoreBounds === null;
  const bounds = modelResult?.scoreBounds;
  if (!bounds || typeof bounds !== 'object' || Array.isArray(bounds)
    || JSON.stringify(Object.keys(bounds).sort())
      !== JSON.stringify([...SCORE_BOUND_FIELDS].sort())
    || !SCORE_BOUND_FIELDS.every(field => finite(bounds[field]))
    || bounds.lower < 0 || bounds.upper > 100 || bounds.lower > bounds.upper
    || bounds.rawLower < 0 || bounds.rawUpper > 100 || bounds.rawLower > bounds.rawUpper
    || Math.abs(bounds.modelUncertaintyPoints - (bounds.upper - bounds.lower)) > 1e-9
    || modelResult.score !== bounds.lower) return false;
  if (modelResult.scoreQuality === 'FULL_HISTORY') {
    return bounds.lower === bounds.upper && bounds.rawLower === bounds.rawUpper;
  }
  return modelResult.scoreQuality === 'HISTORY_INCOMPLETE';
}

export function integratedLocalAvailability(modelResult, modelState) {
  const currentStatus = modelState?.currentMemoryStatus ?? 'MODEL_STATE_MISSING';
  const waveStatus = modelState?.waveMemoryStatus ?? 'MODEL_STATE_MISSING';
  const modelReady = modelResult?.available === true
    && finite(modelResult?.score)
    && modelResult?.modelId === RAVSCORE_MODEL_ID
    && modelResult?.modelContractSha256 === RAVSCORE_MODEL_CONTRACT_SHA256
    && modelResult?.modelBundleSha256 === RAVSCORE_MODEL_BUNDLE_SHA256;
  if (modelReady
    && exactScoreQualityContract(modelResult)
    && exactScoreBoundsContract(modelResult)) {
    return Object.freeze({
      available: true,
      code: modelResult.scoreQuality,
      messageDa: null,
    });
  }
  const code = modelReady
    ? 'INVALID_SCORE_QUALITY_CONTRACT'
    : typeof modelResult?.reason === 'string' && modelResult.reason
      ? modelResult.reason
      : modelState?.currentMemoryReady !== true ? currentStatus
        : modelState?.waveMemoryReady !== true ? waveStatus
          : 'DIRECT_SCORE_INPUT_MISSING';
  return Object.freeze({
    available: false,
    code,
    messageDa: AVAILABILITY_TEXT[code]
      ?? 'Det sammenhængende datagrundlag til kystdelens RavScore er ikke klar.',
  });
}

export function projectIntegratedRavScoreForPublic(modelResult, { mode, profile, context = {} } = {}) {
  if (profile?.activeProfileId !== RAVSCORE_MODEL_ID) {
    throw new Error('Only the resolved integrated model may be projected publicly');
  }
  let exactBinding = false;
  try {
    exactBinding = assertRavScoreModelBinding(modelResult?.modelBinding);
  } catch {
    exactBinding = false;
  }
  if (!modelResult?.available || !finite(modelResult.score)
    || modelResult.modelVersion !== RAVSCORE_MODEL_ID
    || !exactBinding) {
    throw new Error('Integrated RavScore projection has an incompatible model binding');
  }
  const rawComponents = [
    modelResult.components?.huntability,
    modelResult.components?.transport,
    modelResult.components?.mobilisation,
  ];
  if (!rawComponents.every(finite)) {
    throw new Error('Integrated RavScore projection lacks a required public component');
  }
  const [huntability, transport, release] = rawComponents
    .map(value => Math.round(clamp(value)));
  const score = Math.round(clamp(modelResult.score));
  const presentation = scoreRating(score);
  const weights = Object.freeze({
    huntability: RAVSCORE_WEIGHTS.huntability,
    transport: RAVSCORE_WEIGHTS.transport,
    release: RAVSCORE_WEIGHTS.mobilisation,
  });
  const diagnosticContext = {
    ...context,
    lastMileStatus: modelResult.diagnostics?.lastMile?.status ?? null,
    lastMileFactor: modelResult.diagnostics?.lastMile?.factor ?? null,
    waveMemoryStatus: modelResult.diagnostics?.waveMemoryStatus ?? context.waveMemoryStatus,
    waterLevelContext: modelResult.diagnostics?.waterLevelContext ?? null,
  };
  const reasonsByComponent = {
    huntability: componentReasons('huntability', huntability, mode, diagnosticContext),
    transport: componentReasons('transport', transport, mode, diagnosticContext),
    release: componentReasons('release', release, mode, diagnosticContext),
  };
  const current = currentDiagnostics(diagnosticContext);
  const modelBinding = ravScoreModelBinding();
  return {
    available: true,
    score,
    scoreBounds: { ...modelResult.scoreBounds },
    scoreQuality: modelResult.scoreQuality,
    calibrationEligible: modelResult.calibrationEligible,
    scoreSemantics: modelResult.scoreSemantics,
    conservativeTailResetApplied: modelResult.conservativeTailResetApplied,
    historyCoverageHours: modelResult.historyCoverageHours,
    historyReasonCodes: [...modelResult.historyReasonCodes],
    baseScore: score,
    level: presentation.level,
    label: presentation.label,
    components: { huntability, transport, release },
    componentReasons: reasonsByComponent,
    reasons: [
      reasonsByComponent.transport[0],
      reasonsByComponent.release[0],
      reasonsByComponent.huntability[0],
      waterContextReason(diagnosticContext),
    ],
    explanation: {
      ...modelBinding,
      switchVersion: profile.switchVersion,
      weights,
      contributions: {
        huntability: modelResult.scoreCalculation.weightedContributions.huntability,
        transport: modelResult.scoreCalculation.weightedContributions.transport,
        release: modelResult.scoreCalculation.weightedContributions.mobilisation,
      },
      rawScore: modelResult.scoreCalculation.rawScore,
      roundedScore: modelResult.scoreCalculation.roundedScore,
      finalScore: score,
      wadersHuntabilityMaximum: modelResult.scoreCalculation.wadersHuntabilityMaximum,
      wadersHuntabilityLimitApplied: modelResult.scoreCalculation.wadersHuntabilityLimitApplied,
      formula: 'Søgeforhold 20 % + relativt transportbevis mod kystzonen 50 % + bølgeenergi og mobiliseringsmulighed 30 %',
      scoreMeaning: mode === 'waders'
        ? 'Modelleret indeks over rav- og søgeforhold i vandet, begrænset af søgeforholdene'
        : 'Modelleret indeks over rav- og søgeforhold på stranden',
      transportDiagnostics: {
        engine: 'INTEGRATED_COASTAL_PROCESS',
        ...current,
        supplyPotential: modelResult.diagnostics?.supplyPotential ?? null,
        transportPotential: modelResult.components.transport,
        lastMileStatus: modelResult.diagnostics?.lastMile?.status ?? null,
        lastMileScoreEffect: modelResult.diagnostics?.lastMile?.scoreEffect ?? null,
        lastMileStructuralUncertainty:
          modelResult.diagnostics?.lastMile?.structuralUncertainty === true,
        lastMileDeliveryFactor: modelResult.diagnostics?.lastMile?.factor ?? null,
        lastMileWaveActivity: modelResult.diagnostics?.lastMile?.activity ?? null,
        lastMileApproach: modelResult.diagnostics?.lastMile?.approach ?? null,
        lastMileNormalAlignment:
          modelResult.diagnostics?.lastMile?.normalAlignment ?? null,
        lastMileTangentAlignment:
          modelResult.diagnostics?.lastMile?.tangentAlignment ?? null,
        lastMileDirectionalCoherence:
          modelResult.diagnostics?.lastMile?.coherence ?? null,
        lastMilePhysicalDeliveryResolved:
          modelResult.diagnostics?.lastMile?.physicalDeliveryResolved === false ? false : null,
        currentReferenceAt: modelResult.diagnostics?.currentReferenceAt ?? null,
        currentMemoryReady: context.currentMemoryReady === true,
        currentMemoryStatus: modelResult.diagnostics?.currentMemoryStatus ?? null,
        currentMemoryCoverageHours: context.currentMemoryCoverageHours ?? null,
        currentMemoryWindowHours: context.currentMemoryWindowHours ?? null,
        windDirectlyIncluded: false,
        outflowWholeScoreGateApplied: false,
        resolvedSurfZoneIncluded: false,
      },
      mobilisationDiagnostics: {
        mobilisationPotential: modelResult.components.mobilisation,
        waveLastVerifiedAt: modelResult.diagnostics?.waveLastVerifiedAt ?? null,
        waveMemoryStatus: modelResult.diagnostics?.waveMemoryStatus ?? null,
      },
      waterLevelContext: modelResult.diagnostics?.waterLevelContext ?? null,
      uncertainty: modelResult.confidence ?? null,
      scoreIsSafetyAdvice: false,
      scoreIsFindProbability: false,
    },
    scoreProfileId: RAVSCORE_MODEL_ID,
    modelBinding,
  };
}

export function selectPublicRavScoreResult({ profile, modelResult, modelState, mode, context = {} }) {
  if (!profile || profile.activeProfileId !== RAVSCORE_MODEL_ID) {
    throw new Error(`Unknown resolved RavScore profile: ${profile?.activeProfileId ?? 'missing'}`);
  }
  if (modelResult?.modelVersion !== RAVSCORE_MODEL_ID
    || !hasExactRavScoreModelBinding(modelResult?.modelBinding)) {
    throw new Error('Integrated RavScore selection received an incompatible model binding');
  }
  const selectedBinding = Object.freeze({ ...modelResult.modelBinding });
  const compact = modelResult?.available ? {
    ...modelResult,
    modelId: modelResult.modelVersion,
    modelContractSha256: modelResult.modelBinding?.modelContractSha256,
    modelBundleSha256: modelResult.modelBinding?.modelBundleSha256,
  } : modelResult;
  const availability = integratedLocalAvailability(compact, modelState);
  if (!availability.available) return {
    available: false,
    score: null,
    scoreBounds: null,
    scoreQuality: 'UNAVAILABLE',
    calibrationEligible: false,
    scoreSemantics: null,
    conservativeTailResetApplied: false,
    // UNAVAILABLE is not a zero-hour history statement. The direct score
    // contract failed, so no potentially forged or stale history metadata may
    // be projected into the public result.
    historyCoverageHours: null,
    historyReasonCodes: [],
    level: 'unavailable',
    label: 'RavScore midlertidigt utilgængelig',
    unavailability: availability,
    reasons: [availability.messageDa],
    scoreProfileId: RAVSCORE_MODEL_ID,
    modelBinding: selectedBinding,
  };
  return projectIntegratedRavScoreForPublic(modelResult, { mode, profile, context });
}
