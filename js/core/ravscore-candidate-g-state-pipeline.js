import {
  buildCurrentTransportPotential,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
} from './ravscore-regime-memory.js';
import {
  buildWaveMobilisationPotential,
  WAVE_MOBILISATION_RECOMMENDED_RESEARCH_PROFILE,
} from './ravscore-mobilisation-memory.js';

export const CANDIDATE_G_STATE_SCHEMA_VERSION = '1.0.0';
export const CANDIDATE_G_STATE_MODEL_ID =
  'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3';
export const CANDIDATE_G_STATE_VARIANT_ID =
  'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED';
export const CANDIDATE_G_STATE_PROFILE_ID =
  'current-0.03-0.15-in10-out8-exhaust13-wave-build4-decay48';

const finite = value => value !== null
  && value !== undefined
  && value !== ''
  && typeof value !== 'boolean'
  && Number.isFinite(Number(value));

function validTime(value) {
  return Number.isFinite(Date.parse(value));
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
    || Number(initialState.mobilisationPotential) > 100) {
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
    mobilisationPotential: row.mobilisationPotential,
  };
}

/**
 * Builds Candidate G's two causal, score-neutral state tracks from the same
 * centrally controlled hourly weather rows used by the active local score.
 *
 * Only the compact derived continuation state crosses a production-run
 * boundary. It deliberately contains no raw current vectors, weather values,
 * coordinates or private replay data.
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
  const transportRows = buildCurrentTransportPotential(ordered, {
    ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    initialState: acceptedState ? {
      time: acceptedState.time,
      transportPotential: Number(acceptedState.transportPotential),
      outboundEpisodeEffectiveHours: Number(acceptedState.outboundEpisodeEffectiveHours),
    } : null,
    getTime: sample => sample.time,
    getSpeed: sample => sample.currentSpeedMps,
    getAlignment: sample => sample.currentAlignment,
    isVerified: sample => sample.currentVerified === true,
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
