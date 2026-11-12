import { verifiedSelectedWeatherReserve } from './weather-reserve-admission.mjs';
import { FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID, FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS, FEGGESUND_WAVE_PROXY_INPUT_SOURCE, FEGGESUND_WAVE_PROXY_NOTICE_ID, FEGGESUND_WAVE_DISPOSITIONS, SOURCE_WEIGHT, SHA256, EPSILON, CLASS_RANK, FEGGESUND_WAVE_PROXY_POLICY, canonicalValue, digest, FEGGESUND_WAVE_PROXY_POLICY_SHA256, finite, round, normalizeDegrees, canonicalHour, explicitTimestamp, angularDifference, ratioClass, highestClass, contrastRatio, validateSource, orderedSources, bindVerifiedFeggesundWaveSource, directionInterpolation, buildProjection, compactProxyMetadataValid, buildFeggesundWaveProxy, verifyFeggesundWaveProxy, verifyCompactFeggesundWaveProxy, validatedCoverageEntry, orderedCoverageEntries, buildFeggesundWaveCoverageProof } from './feggesund-wave-calculation.mjs';
export { FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID, FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS, FEGGESUND_WAVE_PROXY_INPUT_SOURCE, FEGGESUND_WAVE_PROXY_NOTICE_ID, FEGGESUND_WAVE_DISPOSITIONS, FEGGESUND_WAVE_PROXY_POLICY, FEGGESUND_WAVE_PROXY_POLICY_SHA256, bindVerifiedFeggesundWaveSource, buildFeggesundWaveProxy, verifyFeggesundWaveProxy, verifyCompactFeggesundWaveProxy, buildFeggesundWaveCoverageProof };

function admittedReserveWave(hour, part, time, componentInputs) {
  if (!part || (part.zoneId ?? part.sourceZoneId) !== FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID) return false;
  return Boolean(verifiedSelectedWeatherReserve(hour, componentInputs, {
    part, validTime: time, component: 'wave',
  }));
}

export function buildFeggesundWaveInputProofEntry({ partId, time, hour, part = null, componentInputs = null } = {}) {
  const validTime = canonicalHour(time);
  if (typeof partId !== 'string' || !partId) {
    throw new Error('Feggesund wave proof requires a part id');
  }
  const height = finite(hour?.waveHeightM);
  const period = finite(hour?.wavePeriodS);
  const direction = hour?.waveDirectionDeg === null
    || hour?.waveDirectionDeg === undefined
    ? null
    : finite(hour.waveDirectionDeg);
  const source = hour?.waveInputSource;
  const directTupleValid = height !== null && height >= 0
    && period !== null && period >= 0
    && (height === 0
      ? direction === null || (direction >= 0 && direction < 360)
      : period > 0 && direction !== null && direction >= 0 && direction < 360);
  const proxyTupleValid = height !== null && height >= 0
    && period !== null && period > 0
    && (height > 0
      ? direction !== null && direction >= 0 && direction < 360
      : direction === null);
  let disposition = FEGGESUND_WAVE_DISPOSITIONS.missing;
  let accepted = false;
  if (directTupleValid && source === 'DIRECT_OFFICIAL'
    && hour?.waveProvenance?.status === 'verified'
    && (hour.waveProvenance.provider === 'dmi'
      || (part?.partId === partId && admittedReserveWave(hour, part, validTime, componentInputs)))) {
    disposition = FEGGESUND_WAVE_DISPOSITIONS.direct;
    accepted = true;
  } else if (proxyTupleValid && source === FEGGESUND_WAVE_PROXY_INPUT_SOURCE
    && hour?.waveProvenance?.status === 'verified-derived'
    && hour.waveProvenance.sourceClass === 'owner-approved-neighbor-wave-proxy') {
    disposition = FEGGESUND_WAVE_DISPOSITIONS.proxy;
    accepted = true;
  } else if ([hour?.waveHeightM, hour?.wavePeriodS, hour?.waveDirectionDeg]
    .some(value => value !== null && value !== undefined)
    || source !== null || hour?.waveInputNoticeId !== null) {
    throw new Error('Feggesund wave proof found an inconsistent accepted input');
  }
  return {
    partId,
    time: validTime,
    disposition,
    inputSha256: accepted ? digest({
      time: validTime,
      waveHeightM: height,
      wavePeriodS: period,
      waveDirectionDeg: direction,
    }) : null,
    provenanceSha256: accepted ? digest(hour.waveProvenance) : null,
  };
}
