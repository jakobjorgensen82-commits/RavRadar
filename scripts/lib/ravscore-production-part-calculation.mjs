import { dmiMarineCollectionAllowedForZone } from './dmi-marine-zone-exclusions.mjs';
import { buildCurrentSupplyMemory, buildCurrentSupplyScoreBounds,
  deriveCurrentSupplyEvidence } from '../../js/core/ravscore-current-supply-memory.js';
import { buildBoundedCurrentTransportMemory, deriveCurrentTransportEvidence,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE }
  from '../../js/core/ravscore-regime-memory.js';
import { buildIntegratedPartScoreSeries } from './ravscore-integrated-runtime.mjs';
import { buildCandidateGRollbackPartScoreSeries } from './ravscore-candidate-g-rollback-calculation.mjs';

// Deterministic state/score fold only. The caller owns source admission and all opaque origin/result authority.
export function calculateRavScoreProductionPartSeries({ integrated, candidate }, { outflowZeroExplanationDa = null } = {}) {
  const {
    ravScoreState,
    scores,
  } = buildIntegratedPartScoreSeries(integrated);
  const {
    candidateGState,
    scores: candidateGRollbackScores,
  } = buildCandidateGRollbackPartScoreSeries(candidate, { outflowZeroExplanationDa });
  if (scores.length !== candidateGRollbackScores.length
    || scores.some((score, index) => score.time !== candidateGRollbackScores[index]?.time)) {
    throw new Error('Integrated and Candidate G rollback forecast times diverged');
  }
  return { ravScoreState, scores, candidateGState, candidateGRollbackScores };
}

// Current-memory reconstruction only. Original-source admission remains in the normal wrapper.
export function calculateRavScoreOwnerCurrentHistory({
  part, originalIntegratedState, originalCandidateGState, hourly,
}) {
  const supplyEvidence = hourly.map(row => deriveCurrentSupplyEvidence(row, {
    getNormalSpeed: value => value.currentCoastNormalSpeedMps,
    isVerified: value => value.currentProvenance?.status === 'verified',
  }));
  const transportEvidence = hourly.map(row => deriveCurrentTransportEvidence(row, {
    ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    getSpeed: value => value.currentSpeedMps,
    getAlignment: value => Number.isFinite(value.currentDirectionDeg)
      ? Math.cos((value.currentDirectionDeg - part.onshoreDirectionDeg) * Math.PI / 180) : null,
    isVerified: value => value.currentProvenance?.status === 'verified',
  }));
  const memory = buildCurrentSupplyMemory(supplyEvidence, {
    referenceTime: originalIntegratedState.time,
  });
  const bounds = buildCurrentSupplyScoreBounds(supplyEvidence, {
    referenceTime: originalIntegratedState.time,
  });
  const transport = buildBoundedCurrentTransportMemory(transportEvidence, {
    ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    referenceTime: originalCandidateGState.time,
    restartAfterVerifiedTimeGap: false,
  });
  const integratedState = { ...structuredClone(originalIntegratedState),
    currentReferenceAt: originalIntegratedState.time,
    currentMemoryReady: memory.memoryReady, currentMemoryStatus: memory.status,
    currentMemoryWindowHours: memory.windowHours,
    currentMemoryCoverageHours: memory.coverageHours,
    currentEvidence: memory.evidence, currentNativeHoldAuthorization: null,
    currentNativeHoldIntervalEnds: memory.nativeHoldIntervalEnds,
    supplyPotential: memory.supplyPotential,
    historyBounds: { ...structuredClone(originalIntegratedState.historyBounds), current: {
      lowerPotential: bounds.available ? bounds.lowerPotential : null,
      upperPotential: bounds.available ? bounds.upperPotential : null,
    } },
  };
  const candidateGState = { ...structuredClone(originalCandidateGState),
    transportReferenceAt: originalCandidateGState.time,
    transportMemoryReady: transport.memoryReady, transportMemoryStatus: transport.status,
    transportMemoryWindowHours: transport.windowHours,
    transportMemoryCoverageHours: transport.coverageHours,
    transportEvidence: transport.evidence,
    // Existing normal unverified-pause contract retains a private finite
    // point if no permitted suffix exists. It is NOT a safe/public estimate:
    // measured warmup availability below remains hard unavailable until ready.
    transportPotential: transport.result?.transportPotential ?? originalCandidateGState.transportPotential,
    outboundEpisodeEffectiveHours: transport.result?.outboundEpisodeEffectiveHours
      ?? originalCandidateGState.outboundEpisodeEffectiveHours,
  };
  const integratedCurrentFields = new Set(['currentReferenceAt', 'currentMemoryReady',
    'currentMemoryStatus', 'currentMemoryWindowHours', 'currentMemoryCoverageHours',
    'currentEvidence', 'currentNativeHoldAuthorization', 'currentNativeHoldIntervalEnds',
    'supplyPotential', 'historyBounds']);
  const candidateCurrentFields = new Set(['transportReferenceAt', 'transportMemoryReady',
    'transportMemoryStatus', 'transportMemoryWindowHours', 'transportMemoryCoverageHours',
    'transportEvidence', 'transportPotential', 'outboundEpisodeEffectiveHours']);
  for (const [before, after, allowed] of [[originalIntegratedState, integratedState, integratedCurrentFields],
    [originalCandidateGState, candidateGState, candidateCurrentFields]]) {
    if (Object.keys(before).some(key => !allowed.has(key)
      && JSON.stringify(before[key]) !== JSON.stringify(after[key]))) {
      throw new Error('Current source transition changed non-current state history');
    }
  }
  if (['waveMobilisation', 'lastMile'].some(key =>
    JSON.stringify(originalIntegratedState.historyBounds[key])
      !== JSON.stringify(integratedState.historyBounds[key]))) {
    throw new Error('Current source transition changed non-current history bounds');
  }
  return { integratedState, candidateGState,
    provedCurrentHours: supplyEvidence.filter(row => Number.isFinite(row.strength)).length,
    unknownCurrentHours: supplyEvidence.filter(row => row.strength === null).length,
  };
}

export function ravScoreOwnerCurrentHistoryStartAt(part, initialState, replaySourceStartAt,
  { requireNativeGridSampling = false } = {}) {
  const parentZoneId = part?.zoneId ?? part?.parentZoneId ?? part?.sourceZoneId;
  if ((!requireNativeGridSampling && dmiMarineCollectionAllowedForZone('dkss_lf', parentZoneId)) || !initialState) {
    return replaySourceStartAt;
  }
  const stateMs = Date.parse(initialState.time);
  const startMs = Date.parse(replaySourceStartAt);
  if (!Number.isFinite(stateMs) || !Number.isFinite(startMs)) {
    throw new Error('Current source transition requires a valid private history boundary');
  }
  return new Date(Math.min(startMs, stateMs - (requireNativeGridSampling ? 51 : 48) * 3_600_000)).toISOString();
}

// Pure current-memory reconstruction. The normal wrapper still qualifies decoder originals.
export function calculateRavScoreNewInitialCurrentApplication({
  part, zone, state, other, history, nativeCadenceHoldHours,
}) {
  const fail = () => { const error = new Error('RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY');
    error.code = 'RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY'; throw error; };
  const incomplete = state.currentMemoryReady !== true || other.transportMemoryReady !== true;
  if (incomplete && ((state.currentMemoryReady !== true
      && state.currentMemoryReady !== false)
    || (other.transportMemoryReady !== true
      && other.transportMemoryReady !== false))) fail();
  const boundary = Date.parse(state.time) - 48 * 3_600_000;
  // A real selected native sample may support a boundary hold; it is never
  // copied into intermediate hours or used to relabel old compact evidence.
  let first = -1;
  for (let i = 0; i < history.length && Date.parse(history[i].time) <= boundary; i++) {
    if (history[i].currentProvenance?.status === 'verified') first = i;
  }
  if (incomplete) {
    // Reproduce the retained partial window, including its actual missing rows.
    // Never pad it to 48h, trim a hole, or promote an old readiness flag.
    const start = Math.min(Date.parse(state.currentEvidence[0]?.time),
      Date.parse(other.transportEvidence[0]?.time));
    first = history.findIndex(row => Date.parse(row.time) === start);
  }
  if (first < 0) fail();
  const hourly = history.slice(first);
  if (!incomplete && hourly.some(row => row.currentProvenance?.status !== 'verified' && !row.currentStateOnlyHold)) fail();
  const derived = buildIntegratedPartScoreSeries({ part, zone, hourly, nativeCadenceHoldHours })
    .ravScoreState.continuationState;
  const derivedOther = buildCandidateGRollbackPartScoreSeries({ part, zone, hourly,
    nativeCadenceHoldHours, measuredColdStart: true }).candidateGState.continuationState;
  if (!incomplete && (!derived.currentMemoryReady || !derivedOther.transportMemoryReady)) fail();
  if (incomplete) {
    const sameWindow = (left, right, prefix, evidenceKey) =>
      ['ReferenceAt', 'MemoryReady', 'MemoryStatus', 'MemoryWindowHours', 'MemoryCoverageHours']
        .every(key => JSON.stringify(left[prefix + key]) === JSON.stringify(right[prefix + key]))
      && JSON.stringify(left[evidenceKey].map(row => [row.time, row.strength === null]))
        === JSON.stringify(right[evidenceKey].map(row => [row.time, row.strength === null]));
    if (!sameWindow(derived, state, 'current', 'currentEvidence')
      || !sameWindow(derivedOther, other, 'transport', 'transportEvidence')) fail();
  }
  const integratedKeys = ['currentReferenceAt', 'currentMemoryReady', 'currentMemoryStatus',
    'currentMemoryWindowHours', 'currentMemoryCoverageHours', 'currentEvidence',
    'currentNativeHoldAuthorization', 'currentNativeHoldIntervalEnds', 'supplyPotential'];
  const candidateKeys = ['transportReferenceAt', 'transportMemoryReady', 'transportMemoryStatus',
    'transportMemoryWindowHours', 'transportMemoryCoverageHours', 'transportEvidence',
    'transportPotential', 'outboundEpisodeEffectiveHours'];
  const sameCurrentPair = (integrated, candidate) =>
    integratedKeys.every(key => JSON.stringify(integrated[key]) === JSON.stringify(state[key]))
    && candidateKeys.every(key => JSON.stringify(candidate[key]) === JSON.stringify(other[key]))
    && JSON.stringify(integrated.historyBounds.current) === JSON.stringify(state.historyBounds.current);
  // Equality alone is not lineage proof; all strict original/48h checks above
  // still run. Unequal memory additionally requires the exact normal decoder
  // association and reconstruction of the preserved OLD current pair.
  if (sameCurrentPair(derived, derivedOther)) return null;
  return { hourly, incomplete, derived, derivedOther };
}

// This calculates from OLD rows; it does not authenticate or retain their origin.
export function completeRavScoreNewInitialCurrentApplication({
  part, zone, state, other, originalHourly, nativeCadenceHoldHours, calculation,
}) {
  const fail = () => { const error = new Error('RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY');
    error.code = 'RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY'; throw error; };
  const { incomplete, derived, derivedOther } = calculation;
  const integratedKeys = ['currentReferenceAt', 'currentMemoryReady', 'currentMemoryStatus',
    'currentMemoryWindowHours', 'currentMemoryCoverageHours', 'currentEvidence',
    'currentNativeHoldAuthorization', 'currentNativeHoldIntervalEnds', 'supplyPotential'];
  const candidateKeys = ['transportReferenceAt', 'transportMemoryReady', 'transportMemoryStatus',
    'transportMemoryWindowHours', 'transportMemoryCoverageHours', 'transportEvidence',
    'transportPotential', 'outboundEpisodeEffectiveHours'];
  const sameCurrentPair = (integrated, candidate) =>
    integratedKeys.every(key => JSON.stringify(integrated[key]) === JSON.stringify(state[key]))
    && candidateKeys.every(key => JSON.stringify(candidate[key]) === JSON.stringify(other[key]))
    && JSON.stringify(integrated.historyBounds.current) === JSON.stringify(state.historyBounds.current);
  if (!originalHourly) fail();
  const originalDerived = buildIntegratedPartScoreSeries({ part, zone,
    hourly: originalHourly, nativeCadenceHoldHours }).ravScoreState.continuationState;
  const originalOther = buildCandidateGRollbackPartScoreSeries({ part, zone,
    hourly: originalHourly, nativeCadenceHoldHours, measuredColdStart: true }).candidateGState.continuationState;
  if ((!incomplete && (!originalDerived.currentMemoryReady || !originalOther.transportMemoryReady))
    || !sameCurrentPair(originalDerived, originalOther)) fail();
  const integratedState = structuredClone(state), candidateGState = structuredClone(other);
  for (const key of integratedKeys) integratedState[key] = structuredClone(derived[key]);
  integratedState.historyBounds.current = structuredClone(derived.historyBounds.current);
  for (const key of candidateKeys) candidateGState[key] = structuredClone(derivedOther[key]);
  return { integratedState, candidateGState };
}
