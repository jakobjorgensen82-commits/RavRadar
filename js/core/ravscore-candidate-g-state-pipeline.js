import {
  buildBoundedCurrentTransportMemory,
  CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
  deriveCurrentTransportEvidence,
} from './ravscore-regime-memory.js';
import {
  buildWaveMobilisationPotential,
  WAVE_MOBILISATION_RECOMMENDED_RESEARCH_PROFILE,
} from './ravscore-mobilisation-memory.js';

export const CANDIDATE_G_STATE_SCHEMA_VERSION = '2.0.0';
export const CANDIDATE_G_STATE_MODEL_ID =
  'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3';
export const CANDIDATE_G_STATE_VARIANT_ID =
  'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED';
export const CANDIDATE_G_STATE_PROFILE_ID =
  'current-0.03-0.15-in10-out8-exhaust13-window48-boundary0-wave-build4-decay48';

const finite = value => value !== null
  && value !== undefined
  && value !== ''
  && typeof value !== 'boolean'
  && Number.isFinite(Number(value));

function validTime(value) {
  return Number.isFinite(Date.parse(value));
}

function validTransportEvidence(value, stateTime) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 49) return false;
  let previousTime = null;
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || !validTime(item.time)) return false;
    if (item.strength !== null && (!finite(item.strength)
      || Number(item.strength) < -1 || Number(item.strength) > 1)) return false;
    const time = Date.parse(item.time);
    if (previousTime !== null && time <= previousTime) return false;
    previousTime = time;
  }
  return previousTime === Date.parse(stateTime);
}

function compatibility(initialState, stateKey, firstSampleTime) {
  if (initialState === null || initialState === undefined) {
    return { accepted: false, reason: 'NO_PREVIOUS_STATE' };
  }
  if (typeof initialState !== 'object' || Array.isArray(initialState)) {
    return { accepted: false, reason: 'INVALID_PREVIOUS_STATE' };
  }
  if (initialState.schemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION) {
    return { accepted: false, reason: 'SCHEMA_VERSION_CHANGED' };
  }
  if (initialState.modelId !== CANDIDATE_G_STATE_MODEL_ID) {
    return { accepted: false, reason: 'MODEL_VERSION_CHANGED' };
  }
  if (initialState.variantId !== CANDIDATE_G_STATE_VARIANT_ID) {
    return { accepted: false, reason: 'VARIANT_CHANGED' };
  }
  if (initialState.profileId !== CANDIDATE_G_STATE_PROFILE_ID) {
    return { accepted: false, reason: 'PROFILE_CHANGED' };
  }
  if (initialState.stateKey !== stateKey) {
    return { accepted: false, reason: 'COASTAL_PART_CONTEXT_CHANGED' };
  }
  if (!validTime(initialState.time)
    || !finite(initialState.transportPotential)
    || Number(initialState.transportPotential) < 0
    || Number(initialState.transportPotential) > 100
    || !finite(initialState.outboundEpisodeEffectiveHours)
    || Number(initialState.outboundEpisodeEffectiveHours) < 0
    || !finite(initialState.mobilisationPotential)
    || Number(initialState.mobilisationPotential) < 0
    || Number(initialState.mobilisationPotential) > 100
    || typeof initialState.transportMemoryReady !== 'boolean'
    || !finite(initialState.transportMemoryCoverageHours)
    || Number(initialState.transportMemoryCoverageHours) < 0
    || Number(initialState.transportMemoryCoverageHours) > CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours
    || Number(initialState.transportMemoryWindowHours) !== CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours
    || typeof initialState.transportMemoryStatus !== 'string'
    || !validTransportEvidence(initialState.transportEvidence, initialState.time)) {
    return { accepted: false, reason: 'INVALID_PREVIOUS_STATE' };
  }
  if (firstSampleTime && Date.parse(initialState.time) > Date.parse(firstSampleTime)) {
    return { accepted: false, reason: 'PREVIOUS_STATE_IS_AFTER_FIRST_SAMPLE' };
  }
  return { accepted: true, reason: null };
}

function compactState(stateKey, row) {
  return {
    schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
    modelId: CANDIDATE_G_STATE_MODEL_ID,
    variantId: CANDIDATE_G_STATE_VARIANT_ID,
    profileId: CANDIDATE_G_STATE_PROFILE_ID,
    stateKey,
    time: row.time,
    transportPotential: row.transportPotential,
    outboundEpisodeEffectiveHours: row.outboundEpisodeEffectiveHours,
    transportMemoryReady: row.transportMemoryReady,
    transportMemoryStatus: row.transportMemoryStatus,
    transportMemoryWindowHours: row.transportMemoryWindowHours,
    transportMemoryCoverageHours: row.transportMemoryCoverageHours,
    transportEvidence: row.transportEvidence,
    mobilisationPotential: row.mobilisationPotential,
  };
}

/**
 * Builds Candidate G's two causal, score-neutral state tracks from the same
 * centrally controlled hourly weather rows used by the active local score.
 *
 * Only the compact derived continuation state crosses a production-run
 * boundary. Transport is rebuilt from a fixed trailing 48-hour window whose
 * entries are reduced to signed, coast-relative strengths. It deliberately
 * contains no raw current vectors, weather values, coordinates or private
 * replay data.
 */
export function buildCandidateGDerivedStateSeries(
  samples = [],
  {
    stateKey,
    initialState = null,
    firstSampleDurationHours = 1,
  } = {},
) {
  if (typeof stateKey !== 'string' || !stateKey.trim()) {
    throw new Error('Candidate G state requires a non-empty stateKey');
  }
  const ordered = [...(Array.isArray(samples) ? samples : [])]
    .filter(sample => validTime(sample?.time))
    .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
  for (let index = 1; index < ordered.length; index += 1) {
    if (Date.parse(ordered[index].time) === Date.parse(ordered[index - 1].time)) {
      throw new Error('Candidate G state samples must have unique times');
    }
  }

  const stateCompatibility = compatibility(initialState, stateKey, ordered[0]?.time);
  const acceptedState = stateCompatibility.accepted ? initialState : null;
  let transportEvidence = acceptedState
    ? acceptedState.transportEvidence.map(item => ({ ...item }))
    : [];
  let previousTransport = acceptedState ? {
    transportPotential: Number(acceptedState.transportPotential),
    outboundEpisodeEffectiveHours: Number(acceptedState.outboundEpisodeEffectiveHours),
    actualOutboundTransport: Number(acceptedState.outboundEpisodeEffectiveHours)
      >= CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE.exhaustedAfterEffectiveHours,
  } : {
    transportPotential: 0,
    outboundEpisodeEffectiveHours: 0,
    actualOutboundTransport: false,
  };
  let previousTransportTime = acceptedState?.time ?? null;
  const transportRows = ordered.map(sample => {
    const sameTime = previousTransportTime
      && Date.parse(previousTransportTime) === Date.parse(sample.time);
    if (!sameTime) {
      const evidence = deriveCurrentTransportEvidence(sample, {
        ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
        getTime: value => value.time,
        getSpeed: value => value.currentSpeedMps,
        getAlignment: value => value.currentAlignment,
        isVerified: value => value.currentVerified === true,
      });
      if (evidence) transportEvidence.push(evidence);
    }
    const bounded = buildBoundedCurrentTransportMemory(transportEvidence, {
      ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
      referenceTime: sample.time,
    });
    transportEvidence = bounded.evidence;
    const replayed = bounded.result;
    const verified = sample.currentVerified === true;
    const current = replayed ? {
      transportPotential: replayed.transportPotential,
      outboundEpisodeEffectiveHours: replayed.outboundEpisodeEffectiveHours,
      outboundEpisodeLossPoints: replayed.outboundEpisodeLossPoints,
      actualOutboundTransport: replayed.actualOutboundTransport,
    } : {
      ...previousTransport,
      outboundEpisodeLossPoints: previousTransport.actualOutboundTransport
        ? 100
        : Math.min(
          CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE.preExhaustionMaximumLossPoints,
          CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE.outboundPointsPerEffectiveHour
            * previousTransport.outboundEpisodeEffectiveHours,
        ),
    };
    let phase = bounded.memoryReady ? replayed?.phase ?? 'RETAINED_OR_NEUTRAL' : 'BOUNDED_MEMORY_WARMUP';
    if (sameTime) phase = verified ? 'SAME_TIME_HOLD' : 'UNVERIFIED_PAUSE';
    else if (!verified) phase = 'UNVERIFIED_PAUSE';
    const row = {
      time: new Date(sample.time).toISOString(),
      verified,
      transportPotential: current.transportPotential,
      outboundEpisodeEffectiveHours: current.outboundEpisodeEffectiveHours,
      outboundEpisodeLossPoints: current.outboundEpisodeLossPoints,
      actualOutboundTransport: current.actualOutboundTransport,
      phase,
      transportMemoryReady: bounded.memoryReady,
      transportMemoryStatus: bounded.status,
      transportMemoryWindowHours: bounded.windowHours,
      transportMemoryCoverageHours: bounded.coverageHours,
      transportEvidence: bounded.evidence.map(item => ({ ...item })),
    };
    previousTransport = current;
    previousTransportTime = row.time;
    return row;
  });
  const mobilisationRows = buildWaveMobilisationPotential(ordered, {
    ...WAVE_MOBILISATION_RECOMMENDED_RESEARCH_PROFILE,
    firstSampleDurationHours,
    initialState: acceptedState ? {
      time: acceptedState.time,
      mobilisationPotential: Number(acceptedState.mobilisationPotential),
    } : null,
    getTime: sample => sample.time,
    getWaveHeight: sample => sample.waveHeightM,
    getWavePeriod: sample => sample.wavePeriodS,
  });

  const rows = transportRows.map((transport, index) => {
    const mobilisation = mobilisationRows[index];
    if (!mobilisation || mobilisation.time !== transport.time) {
      throw new Error('Candidate G transport and mobilisation state times diverged');
    }
    const row = {
      time: transport.time,
      transportPotential: transport.transportPotential,
      outboundEpisodeEffectiveHours: transport.outboundEpisodeEffectiveHours,
      outboundEpisodeLossPoints: transport.outboundEpisodeLossPoints,
      actualOutboundTransport: transport.actualOutboundTransport,
      currentTransition: transport.phase,
      currentVerified: transport.verified,
      transportMemoryReady: transport.transportMemoryReady,
      transportMemoryStatus: transport.transportMemoryStatus,
      transportMemoryWindowHours: transport.transportMemoryWindowHours,
      transportMemoryCoverageHours: transport.transportMemoryCoverageHours,
      transportEvidence: transport.transportEvidence,
      mobilisationPotential: mobilisation.mobilisationPotential,
      waveEnergyProxy: mobilisation.waveEnergyProxy,
      waveEnergyScore: mobilisation.waveEnergyScore,
      waveMobilisationTransition: mobilisation.transition,
      waveMobilisationBuildHalfLifeHours: mobilisation.buildHalfLifeHours,
      waveMobilisationDecayHalfLifeHours: mobilisation.decayHalfLifeHours,
    };
    return {
      ...row,
      continuationState: compactState(stateKey, row),
    };
  });

  return {
    schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
    modelId: CANDIDATE_G_STATE_MODEL_ID,
    variantId: CANDIDATE_G_STATE_VARIANT_ID,
    profileId: CANDIDATE_G_STATE_PROFILE_ID,
    initialStateAccepted: stateCompatibility.accepted,
    initialStateResetReason: stateCompatibility.reason,
    rows,
    continuationState: rows.at(-1)?.continuationState ?? acceptedState ?? null,
  };
}
