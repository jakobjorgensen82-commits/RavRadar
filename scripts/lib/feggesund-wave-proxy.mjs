import crypto from 'node:crypto';

export const FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID = 'DK-B05-11';
export const FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS = Object.freeze([
  'DK-B05-10',
  'DK-B05-12',
]);
export const FEGGESUND_WAVE_PROXY_INPUT_SOURCE =
  'FEGGESUND_TWO_NEIGHBOR_WAVE_INTERPOLATION';
export const FEGGESUND_WAVE_PROXY_NOTICE_ID =
  'FEGGESUND_NEIGHBOR_WAVE_PROXY';
export const FEGGESUND_WAVE_DISPOSITIONS = Object.freeze({
  direct: 'DIRECT',
  proxy: FEGGESUND_WAVE_PROXY_INPUT_SOURCE,
  missing: 'MISSING',
});

const SOURCE_WEIGHT = 0.5;
const SHA256 = /^[0-9a-f]{64}$/;
const EPSILON = 1e-12;
const CLASS_RANK = Object.freeze({ LOW: 0, MODERATE: 1, HIGH: 2 });

export const FEGGESUND_WAVE_PROXY_POLICY = Object.freeze({
  schemaVersion: '1.0.0',
  policyId: 'feggesund-two-neighbor-wave-proxy-v1',
  targetParentZoneId: FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID,
  sourceParentZoneIds: FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS,
  sourceWeights: Object.freeze([SOURCE_WEIGHT, SOURCE_WEIGHT]),
  sourceRequirement: 'BOTH_DIRECT_VERIFIED_SAME_HOUR',
  directTargetPriority: true,
  interpolation: Object.freeze({
    height: 'SQRT_EQUAL_MEAN_HS_SQUARED',
    period: 'HS_SQUARED_WEIGHTED_MEAN',
    direction: 'HS_SQUARED_WEIGHTED_CIRCULAR_FROM_DIRECTION',
    antipodalTieBreak: 'HIGHEST_HS_SQUARED_THEN_SOURCE_ZONE_ID',
  }),
  disagreement: Object.freeze({
    directionLowMaximumDeg: 45,
    directionModerateMaximumDeg: 90,
    energyDifferenceLowMaximum: 1 / 3,
    energyDifferenceModerateMaximum: 0.6,
    periodLowMaximumRatio: 1.25,
    periodModerateMaximumRatio: 1.5,
  }),
  coordinatesIncluded: false,
  rawSourceValuesIncluded: false,
});

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, canonicalValue(nested)]));
  }
  return value;
}

function digest(value) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(canonicalValue(value)))
    .digest('hex');
}

export const FEGGESUND_WAVE_PROXY_POLICY_SHA256 = digest(
  FEGGESUND_WAVE_PROXY_POLICY,
);

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function round(value, decimals = 12) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function canonicalHour(value) {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    throw new Error('Feggesund wave proxy time must be an explicit UTC hour');
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error('Feggesund wave proxy time is invalid');
  }
  const date = new Date(parsed);
  if (date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0
    || date.getUTCMilliseconds() !== 0) {
    throw new Error('Feggesund wave proxy accepts exact forecast hours only');
  }
  return date.toISOString();
}

function explicitTimestamp(value, label) {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    throw new Error(`Feggesund wave proxy ${label} must be an explicit timestamp`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Feggesund wave proxy ${label} is invalid`);
  }
  return new Date(parsed).toISOString();
}

function angularDifference(left, right) {
  const difference = Math.abs(normalizeDegrees(left) - normalizeDegrees(right));
  return Math.min(difference, 360 - difference);
}

function ratioClass(ratio, lowMaximum, moderateMaximum) {
  if (ratio <= lowMaximum) return 'LOW';
  if (ratio <= moderateMaximum) return 'MODERATE';
  return 'HIGH';
}

function highestClass(...values) {
  return values.reduce((highest, value) => (
    CLASS_RANK[value] > CLASS_RANK[highest] ? value : highest
  ), 'LOW');
}

function contrastRatio(first, second) {
  if (first === 0 && second === 0) return 1;
  if (first <= 0 || second <= 0) return Number.POSITIVE_INFINITY;
  return Math.max(first, second) / Math.min(first, second);
}

function validateSource(source, time) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Feggesund wave proxy requires two source objects');
  }
  const sourceTime = canonicalHour(source.validTime);
  const modelRun = explicitTimestamp(source.modelRun, 'model run');
  const height = finite(source.waveHeightM);
  const period = finite(source.wavePeriodS);
  const direction = source.waveDirectionDeg === null
    || source.waveDirectionDeg === undefined
    ? null
    : finite(source.waveDirectionDeg);
  if (!FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS.includes(source.parentZoneId)
    || sourceTime !== time
    || source.provider !== 'dmi'
    || source.collection !== 'wam_dw'
    || source.component !== 'wave'
    || source.fallback !== false
    || Date.parse(modelRun) > Date.parse(time)
    || height === null || height < 0
    || period === null || period <= 0
    || !SHA256.test(source.evidenceSha256 ?? '')
    || (height > 0 && (direction === null || direction < 0 || direction >= 360))
    || (direction !== null && (direction < 0 || direction >= 360))) {
    throw new Error('Feggesund wave proxy source is incomplete or invalid');
  }
  return {
    parentZoneId: source.parentZoneId,
    validTime: sourceTime,
    provider: source.provider,
    collection: source.collection,
    component: source.component,
    fallback: false,
    modelRun,
    waveHeightM: height,
    wavePeriodS: period,
    waveDirectionDeg: direction === null ? null : normalizeDegrees(direction),
    evidenceSha256: source.evidenceSha256,
  };
}

function orderedSources(sources, time) {
  if (!Array.isArray(sources) || sources.length !== 2) {
    throw new Error('Feggesund wave proxy requires exactly two sources');
  }
  const normalized = sources.map(source => validateSource(source, time))
    .sort((left, right) => left.parentZoneId.localeCompare(right.parentZoneId));
  if (normalized.map(source => source.parentZoneId).join('|')
    !== FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS.join('|')) {
    throw new Error('Feggesund wave proxy requires the exact approved source-zone pair');
  }
  if (normalized[0].modelRun !== normalized[1].modelRun
    || normalized[0].collection !== normalized[1].collection) {
    throw new Error('Feggesund wave proxy requires one shared DMI WAM run');
  }
  return normalized;
}

export function bindVerifiedFeggesundWaveSource({
  parentZoneId,
  time,
  waveHeightM,
  wavePeriodS,
  waveDirectionDeg,
  verifiedDmiSource,
} = {}) {
  const validTime = canonicalHour(time);
  if (!verifiedDmiSource || typeof verifiedDmiSource !== 'object'
    || Array.isArray(verifiedDmiSource)
    || verifiedDmiSource.provider !== 'dmi'
    || verifiedDmiSource.collection !== 'wam_dw'
    || verifiedDmiSource.component !== 'wave'
    || verifiedDmiSource.fallback !== false
    || verifiedDmiSource.parentZoneId !== parentZoneId) {
    throw new Error('Feggesund wave proxy requires a canonical verified DMI WAM source');
  }
  const evidenceSha256 = digest({
    parentZoneId,
    validTime,
    waveHeightM,
    wavePeriodS,
    waveDirectionDeg,
    verifiedDmiSource,
  });
  return validateSource({
    parentZoneId,
    validTime,
    provider: verifiedDmiSource.provider,
    collection: verifiedDmiSource.collection,
    component: verifiedDmiSource.component,
    fallback: verifiedDmiSource.fallback,
    modelRun: verifiedDmiSource.modelRun,
    waveHeightM,
    wavePeriodS,
    waveDirectionDeg,
    evidenceSha256,
  }, validTime);
}

function directionInterpolation(sources) {
  const active = sources.filter(source => source.waveHeightM > 0);
  if (!active.length) {
    return {
      directionDeg: null,
      concentration: null,
      differenceDeg: null,
      resolution: 'CALM_NO_DIRECTION',
      disagreementClass: 'LOW',
    };
  }
  if (active.length === 1) {
    return {
      directionDeg: active[0].waveDirectionDeg,
      concentration: 1,
      differenceDeg: null,
      resolution: 'SOLE_ACTIVE_SOURCE',
      disagreementClass: 'HIGH',
    };
  }
  const differenceDeg = angularDifference(
    active[0].waveDirectionDeg,
    active[1].waveDirectionDeg,
  );
  const weighted = active.map(source => {
    const radians = source.waveDirectionDeg * Math.PI / 180;
    const weight = source.waveHeightM ** 2;
    return {
      ...source,
      weight,
      x: weight * Math.sin(radians),
      y: weight * Math.cos(radians),
    };
  });
  const weightSum = weighted.reduce((sum, source) => sum + source.weight, 0);
  const x = weighted.reduce((sum, source) => sum + source.x, 0);
  const y = weighted.reduce((sum, source) => sum + source.y, 0);
  const magnitude = Math.hypot(x, y);
  const concentration = weightSum > 0 ? magnitude / weightSum : 0;
  let directionDeg;
  let resolution = 'CIRCULAR_HS_SQUARED_WEIGHTED';
  if (magnitude <= EPSILON * weightSum) {
    const selected = [...weighted].sort((left, right) => right.weight - left.weight
      || left.parentZoneId.localeCompare(right.parentZoneId))[0];
    directionDeg = selected.waveDirectionDeg;
    resolution = 'ANTIPODAL_ENERGY_DOMINANT_TIEBREAK';
  } else {
    directionDeg = normalizeDegrees(Math.atan2(x, y) * 180 / Math.PI);
  }
  const thresholds = FEGGESUND_WAVE_PROXY_POLICY.disagreement;
  const disagreementClass = differenceDeg <= thresholds.directionLowMaximumDeg
    ? 'LOW'
    : differenceDeg <= thresholds.directionModerateMaximumDeg
      ? 'MODERATE'
      : 'HIGH';
  return {
    directionDeg: normalizeDegrees(round(directionDeg)),
    concentration: round(concentration),
    differenceDeg: round(differenceDeg),
    resolution,
    disagreementClass,
  };
}

function buildProjection({ targetEntityId, time, sources }) {
  const squaredHeights = sources.map(source => source.waveHeightM ** 2);
  const squaredHeightSum = squaredHeights[0] + squaredHeights[1];
  const waveHeightM = Math.sqrt(SOURCE_WEIGHT * squaredHeightSum);
  const wavePeriodS = squaredHeightSum > 0
    ? sources.reduce((sum, source, index) => (
      sum + squaredHeights[index] * source.wavePeriodS
    ), 0) / squaredHeightSum
    : SOURCE_WEIGHT * (sources[0].wavePeriodS + sources[1].wavePeriodS);
  const direction = directionInterpolation(sources);
  const energyDifference = squaredHeightSum > 0
    ? Math.abs(squaredHeights[0] - squaredHeights[1]) / squaredHeightSum
    : 0;
  const periodRatio = contrastRatio(
    sources[0].wavePeriodS,
    sources[1].wavePeriodS,
  );
  const thresholds = FEGGESUND_WAVE_PROXY_POLICY.disagreement;
  const energyClass = energyDifference <= thresholds.energyDifferenceLowMaximum
    ? 'LOW'
    : energyDifference <= thresholds.energyDifferenceModerateMaximum
      ? 'MODERATE'
      : 'HIGH';
  const periodClass = squaredHeightSum === 0 ? 'LOW' : ratioClass(
    periodRatio,
    thresholds.periodLowMaximumRatio,
    thresholds.periodModerateMaximumRatio,
  );
  const disagreementClass = highestClass(
    direction.disagreementClass,
    energyClass,
    periodClass,
  );
  const compactSourceEvidence = sources.map(source => ({
    parentZoneId: source.parentZoneId,
    evidenceSha256: source.evidenceSha256,
  }));
  const sourceEvidenceSha256 = digest(compactSourceEvidence);
  const sourceProjectionSha256 = digest(sources.map(source => ({
    parentZoneId: source.parentZoneId,
    validTime: source.validTime,
    waveHeightM: source.waveHeightM,
    wavePeriodS: source.wavePeriodS,
    waveDirectionDeg: source.waveDirectionDeg,
    evidenceSha256: source.evidenceSha256,
  })));
  const tuple = {
    waveHeightM: round(waveHeightM),
    wavePeriodS: round(wavePeriodS),
    waveDirectionDeg: direction.directionDeg,
  };
  const proxyWithoutProjectionHash = {
    schemaVersion: '1.0.0',
    provider: 'ravradar-derived',
    upstreamProvider: 'dmi',
    collection: 'wam_dw',
    component: 'wave',
    modelRun: sources[0].modelRun,
    sourceClass: 'owner-approved-neighbor-wave-proxy',
    fallback: true,
    evidencePolicy: 'requires-two-direct-verified-wave-proofs',
    policyId: FEGGESUND_WAVE_PROXY_POLICY.policyId,
    policySha256: FEGGESUND_WAVE_PROXY_POLICY_SHA256,
    targetEntityId,
    targetParentZoneId: FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID,
    validTime: time,
    sourceParentZoneIds: [...FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS],
    sourceWeights: [SOURCE_WEIGHT, SOURCE_WEIGHT],
    sourceEvidenceSha256,
    sourceProjectionSha256,
    disagreementClass,
    directionResolution: direction.resolution,
    directionConcentration: direction.concentration,
    directionDifferenceDeg: direction.differenceDeg,
    energyDifference: round(energyDifference),
    periodRatio: round(periodRatio),
    calibrationEligible: false,
    coordinatesIncluded: false,
    rawSourceValuesIncluded: false,
  };
  const projectionSha256 = digest({
    tuple,
    proxy: proxyWithoutProjectionHash,
  });
  return {
    ...tuple,
    proxy: {
      ...proxyWithoutProjectionHash,
      projectionSha256,
    },
  };
}

function compactProxyMetadataValid(proxy, targetEntityId, targetParentZoneId, time) {
  return Boolean(proxy
    && typeof proxy === 'object'
    && !Array.isArray(proxy)
    && proxy.schemaVersion === '1.0.0'
    && proxy.provider === 'ravradar-derived'
    && proxy.upstreamProvider === 'dmi'
    && proxy.collection === 'wam_dw'
    && proxy.component === 'wave'
    && proxy.sourceClass === 'owner-approved-neighbor-wave-proxy'
    && proxy.fallback === true
    && proxy.policyId === FEGGESUND_WAVE_PROXY_POLICY.policyId
    && proxy.policySha256 === FEGGESUND_WAVE_PROXY_POLICY_SHA256
    && proxy.targetEntityId === targetEntityId
    && proxy.targetParentZoneId === targetParentZoneId
    && proxy.validTime === time
    && proxy.sourceParentZoneIds?.length === 2
    && FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS.every(
      (zoneId, index) => proxy.sourceParentZoneIds[index] === zoneId,
    )
    && proxy.sourceWeights?.length === 2
    && proxy.sourceWeights[0] === SOURCE_WEIGHT
    && proxy.sourceWeights[1] === SOURCE_WEIGHT
    && ['LOW', 'MODERATE', 'HIGH'].includes(proxy.disagreementClass)
    && SHA256.test(proxy.sourceEvidenceSha256 ?? '')
    && SHA256.test(proxy.sourceProjectionSha256 ?? '')
    && SHA256.test(proxy.projectionSha256 ?? '')
    && Date.parse(explicitTimestamp(proxy.modelRun, 'model run')) <= Date.parse(time)
    && proxy.calibrationEligible === false
    && proxy.coordinatesIncluded === false
    && proxy.rawSourceValuesIncluded === false);
}

export function buildFeggesundWaveProxy({
  targetEntityId,
  targetParentZoneId = FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID,
  time,
  sources,
} = {}) {
  if (typeof targetEntityId !== 'string' || !targetEntityId.startsWith('PART::')
    || targetEntityId.length <= 'PART::'.length
    || targetParentZoneId !== FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID) {
    throw new Error('Feggesund wave proxy target is outside the approved exception');
  }
  const canonicalTime = canonicalHour(time);
  return buildProjection({
    targetEntityId,
    time: canonicalTime,
    sources: orderedSources(sources, canonicalTime),
  });
}

export function verifyFeggesundWaveProxy({
  targetEntityId,
  targetParentZoneId = FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID,
  time,
  sources,
  projection,
} = {}) {
  try {
    const expected = buildFeggesundWaveProxy({
      targetEntityId,
      targetParentZoneId,
      time,
      sources,
    });
    return JSON.stringify(canonicalValue(expected))
      === JSON.stringify(canonicalValue(projection));
  } catch {
    return false;
  }
}

export function verifyCompactFeggesundWaveProxy({
  targetEntityId,
  targetParentZoneId = FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID,
  time,
  projection,
} = {}) {
  try {
    const validTime = canonicalHour(time);
    const tuple = {
      waveHeightM: finite(projection?.waveHeightM),
      wavePeriodS: finite(projection?.wavePeriodS),
      waveDirectionDeg: projection?.waveDirectionDeg === null
        ? null
        : finite(projection?.waveDirectionDeg),
    };
    if (typeof targetEntityId !== 'string' || !targetEntityId.startsWith('PART::')
      || targetParentZoneId !== FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID
      || tuple.waveHeightM === null || tuple.waveHeightM < 0
      || tuple.wavePeriodS === null || tuple.wavePeriodS <= 0
      || (tuple.waveHeightM > 0 && tuple.waveDirectionDeg === null)
      || (tuple.waveDirectionDeg !== null
        && (tuple.waveDirectionDeg < 0 || tuple.waveDirectionDeg >= 360))
      || !compactProxyMetadataValid(
        projection?.proxy,
        targetEntityId,
        targetParentZoneId,
        validTime,
      )) return false;
    const { projectionSha256, ...proxyWithoutProjectionHash } = projection.proxy;
    return digest({ tuple, proxy: proxyWithoutProjectionHash }) === projectionSha256;
  } catch {
    return false;
  }
}

export function buildFeggesundWaveInputProofEntry({ partId, time, hour } = {}) {
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
    && hour.waveProvenance.provider === 'dmi') {
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

function validatedCoverageEntry(entry, partIds) {
  const validTime = canonicalHour(entry?.time);
  const disposition = entry?.disposition;
  const accepted = disposition === FEGGESUND_WAVE_DISPOSITIONS.direct
    || disposition === FEGGESUND_WAVE_DISPOSITIONS.proxy;
  if (!partIds.includes(entry?.partId)
    || !Object.values(FEGGESUND_WAVE_DISPOSITIONS).includes(disposition)
    || (accepted && (!SHA256.test(entry?.inputSha256 ?? '')
      || !SHA256.test(entry?.provenanceSha256 ?? '')))
    || (!accepted && (entry?.inputSha256 !== null
      || entry?.provenanceSha256 !== null))) {
    throw new Error('Feggesund wave coverage contains an invalid proof entry');
  }
  return { ...entry, time: validTime };
}

function orderedCoverageEntries(startAt, forecastHours, partIds, entries) {
  const byKey = new Map();
  for (const candidate of entries) {
    const entry = validatedCoverageEntry(candidate, partIds);
    const key = `${entry.partId}|${entry.time}`;
    if (byKey.has(key)) throw new Error('Feggesund wave coverage contains a duplicate');
    byKey.set(key, entry);
  }
  const ordered = [];
  for (const partId of partIds) {
    for (let index = 0; index < forecastHours; index += 1) {
      const time = new Date(Date.parse(startAt) + index * 3_600_000).toISOString();
      const entry = byKey.get(`${partId}|${time}`);
      if (!entry) throw new Error('Feggesund wave coverage lacks an exact forecast hour');
      ordered.push(entry);
    }
  }
  return ordered;
}

export function buildFeggesundWaveCoverageProof({
  forecastStartAt,
  forecastHours,
  partIds,
  entries,
} = {}) {
  const startAt = canonicalHour(forecastStartAt);
  if (forecastHours !== 118
    || !Array.isArray(partIds) || partIds.length !== 3
    || new Set(partIds).size !== partIds.length
    || !Array.isArray(entries)
    || entries.length !== partIds.length * forecastHours) {
    throw new Error('Feggesund wave coverage requires exactly 3 parts by 118 hours');
  }
  const orderedPartIds = [...partIds].sort();
  const orderedEntries = orderedCoverageEntries(
    startAt,
    forecastHours,
    orderedPartIds,
    entries,
  );
  const counts = Object.fromEntries(Object.values(FEGGESUND_WAVE_DISPOSITIONS)
    .map(disposition => [
      disposition,
      orderedEntries.filter(entry => entry.disposition === disposition).length,
    ]));
  const proof = {
    schemaVersion: '1.0.0',
    targetParentZoneId: FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID,
    policyId: FEGGESUND_WAVE_PROXY_POLICY.policyId,
    policySha256: FEGGESUND_WAVE_PROXY_POLICY_SHA256,
    forecastStartAt: startAt,
    forecastHours,
    partIds: orderedPartIds,
    counts,
    entries: orderedEntries,
  };
  return { ...proof, coverageSha256: digest(proof) };
}
