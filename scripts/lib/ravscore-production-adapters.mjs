import {
  RAVSCORE_WEIGHTS,
  ravScoreModelBinding,
} from '../../js/core/ravscore-model-contract.js';
import {
  normalizeDegrees,
  normalizeForecastHourly,
  uvToTowardDirectionDeg,
  verifiedDmiForecastSource,
  verifiedDmiNativeSource,
} from './dmi-forecast-store.mjs';
import {
  stateOnlyCurrentRowForbiddenFields,
  stripStateOnlyCurrentRowProjection,
  verifiedLivePilotSource,
  verifiedStateOnlyCurrentHold,
} from './live-current-pilot.mjs';
import {
  FEGGESUND_WAVE_PROXY_INPUT_SOURCE,
  FEGGESUND_WAVE_PROXY_NOTICE_ID,
  FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID,
  verifyCompactFeggesundWaveProxy,
} from './feggesund-wave-proxy.mjs';

export const RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION = 3;
export const RAVSCORE_LOCAL_MARGIN_POINTS = 7;
// DMI's documented WAM grids are approximately 1 km (DW) and 5 km (NSB).
// Keep a bounded coastal wet-cell margin without admitting the generic
// 24-40 km marine search radii as last-mile wave provenance.
export const RAVSCORE_WAM_MAX_DISTANCE_KM = Object.freeze({
  wam_dw: 2,
  wam_nsb: 8,
});
const HOUR_MS = 3_600_000;
const MAXIMUM_DMI_BRACKET_HOURS = 4;
const MAXIMUM_DMI_EDGE_MINUTES = 95;

// Production weather and provenance are JSON numbers, never coercible values.
// Treat booleans, numeric strings, arrays and custom objects as missing so a
// malformed cache cannot accidentally become a zero/current proof.
const finite = value => typeof value === 'number' && Number.isFinite(value)
  ? value
  : null;

const scoreQualityRank = value => value === 'FULL_HISTORY' ? 0
  : value === 'HISTORY_INCOMPLETE' ? 1
    : 2;
const SCORE_BOUND_FIELDS = Object.freeze([
  'lower', 'upper', 'modelUncertaintyPoints', 'rawLower', 'rawUpper',
]);

function exactAvailableScoreContract(value) {
  const bounds = value?.scoreBounds;
  if (value?.available !== true
    || finite(value.score) === null
    || !bounds || typeof bounds !== 'object' || Array.isArray(bounds)
    || JSON.stringify(Object.keys(bounds).sort())
      !== JSON.stringify([...SCORE_BOUND_FIELDS].sort())
    || SCORE_BOUND_FIELDS.some(field => finite(bounds[field]) === null)
    || bounds.lower < 0 || bounds.upper > 100 || bounds.lower > bounds.upper
    || bounds.rawLower < 0 || bounds.rawUpper > 100 || bounds.rawLower > bounds.rawUpper
    || Math.abs(bounds.modelUncertaintyPoints - (bounds.upper - bounds.lower)) > 1e-9
    || value.score !== bounds.lower
    || finite(value.historyCoverageHours) === null
    || value.historyCoverageHours < 0 || value.historyCoverageHours > 48
    || !Array.isArray(value.historyReasonCodes)
    || value.historyReasonCodes.some(code => typeof code !== 'string'
      || !/^[A-Z][A-Z0-9_]{0,127}$/.test(code))
    || new Set(value.historyReasonCodes).size !== value.historyReasonCodes.length
    || typeof value.conservativeTailResetApplied !== 'boolean') return false;
  if (value.scoreQuality === 'FULL_HISTORY') {
    return typeof value.calibrationEligible === 'boolean'
      && value.historyCoverageHours === 48
      && value.historyReasonCodes.length === 0
      && bounds.lower === bounds.upper
      && bounds.rawLower === bounds.rawUpper
      && ['EXACT_POINT_SCORE', 'CONSERVATIVE_TAIL_RESET_POINT_SCORE']
        .includes(value.scoreSemantics)
      && value.conservativeTailResetApplied
        === (value.scoreSemantics === 'CONSERVATIVE_TAIL_RESET_POINT_SCORE');
  }
  return value.scoreQuality === 'HISTORY_INCOMPLETE'
    && value.calibrationEligible === false
    && value.historyReasonCodes.length > 0
    && value.scoreSemantics === 'CONSERVATIVE_ENCLOSING_LOWER_BOUND';
}

const round = (value, digits) => Number.isFinite(value)
  ? Number(value.toFixed(digits))
  : null;

export function coastNormalSpeedMpsFromUv(uMps, vMps, onshoreDirectionDeg) {
  const u = finite(uMps);
  const v = finite(vMps);
  const onshore = finite(onshoreDirectionDeg);
  if (u === null || v === null || onshore === null || onshore < 0 || onshore > 360) return null;
  const radians = normalizeDegrees(onshore) * Math.PI / 180;
  const value = u * Math.sin(radians) + v * Math.cos(radians);
  return Math.abs(value) < Number.EPSILON ? 0 : value;
}

const validTimeMs = value => typeof value === 'string'
  && value.length > 0
  && Number.isFinite(Date.parse(value))
  ? Date.parse(value)
  : null;

function nativeTimesCoverRow(provenance, rowTime, {
  maximumBracketHours = MAXIMUM_DMI_BRACKET_HOURS,
  maximumEdgeMinutes = MAXIMUM_DMI_EDGE_MINUTES,
  providerHourlyAllowed = false,
} = {}) {
  const rowMs = validTimeMs(rowTime);
  if (rowMs === null || !Array.isArray(provenance?.nativeValidTimes)
    || provenance.nativeValidTimes.length < 1
    || provenance.nativeValidTimes.some(value => validTimeMs(value) === null)) return false;
  const nativeTimes = [...new Set(provenance.nativeValidTimes.map(validTimeMs))]
    .sort((left, right) => left - right);
  const resolution = String(provenance?.temporalResolution ?? '').toLowerCase();
  if (resolution === 'exact' || resolution === 'native') {
    return nativeTimes.length === 1 && nativeTimes[0] === rowMs;
  }
  if (resolution === 'interpolated') {
    return nativeTimes.length === 2
      && nativeTimes[0] < rowMs
      && rowMs < nativeTimes[1]
      && nativeTimes[1] - nativeTimes[0] <= maximumBracketHours * HOUR_MS;
  }
  if (resolution === 'nearest-edge') {
    return nativeTimes.length === 1
      && Math.abs(nativeTimes[0] - rowMs) <= maximumEdgeMinutes * 60_000;
  }
  return providerHourlyAllowed
    && resolution === 'provider-hourly'
    && nativeTimes.length === 1
    && nativeTimes[0] === rowMs;
}

function exactDmiIdentity(source, expectedIdentity) {
  return Boolean(expectedIdentity
    && typeof expectedIdentity.entityId === 'string' && expectedIdentity.entityId
    && typeof expectedIdentity.parentZoneId === 'string' && expectedIdentity.parentZoneId
    && typeof expectedIdentity.entityType === 'string' && expectedIdentity.entityType
    && typeof expectedIdentity.samplingContext === 'string' && expectedIdentity.samplingContext
    && samePoint(expectedIdentity.samplingPoint, expectedIdentity.samplingPoint)
    && source?.entityId === expectedIdentity.entityId
    && source?.parentZoneId === expectedIdentity.parentZoneId
    && source?.entityType === expectedIdentity.entityType
    && source?.samplingContext === expectedIdentity.samplingContext
    && samePoint(source?.samplingPoint, expectedIdentity.samplingPoint));
}

export function dmiExpectedIdentityForPart(part, bulkId = `PART::${part?.partId ?? ''}`) {
  const expectedId = `PART::${part?.partId ?? ''}`;
  const parentZoneId = part?.sourceZoneId ?? part?.parentZoneId ?? part?.zoneId;
  if (typeof part?.partId !== 'string' || !part.partId
    || bulkId !== expectedId
    || typeof parentZoneId !== 'string' || !parentZoneId
    || !samePoint(part?.waterPoint, part?.waterPoint)) return null;
  return {
    entityId: bulkId,
    parentZoneId,
    entityType: 'coastal-part',
    samplingContext: 'coastal-part-water-point',
    samplingPoint: part.waterPoint.slice(0, 2),
  };
}

/**
 * Exact DMI forecast-time proof shared by target scoring and private replay.
 * Every native endpoint, collection, component, acquisition and spatial field
 * is verified by the canonical forecast-store contract. The consumer must also
 * supply the exact central entity identity; a self-consistent forged source is
 * not enough.
 */
export function verifiedDmiForecastComponentSource(
  source,
  rowTime,
  component,
  expectedIdentity,
) {
  if (!exactDmiIdentity(source, expectedIdentity)) return null;
  const verified = verifiedDmiForecastSource(source, component, rowTime, expectedIdentity);
  if (!verified || (component === 'wave' && !verifiedWamDistance(verified, expectedIdentity))) {
    return null;
  }
  return verified;
}

/**
 * Raw bulk-cache rows precede hourly interpolation and therefore carry one
 * `nativeValidTime`, not the derived row's `nativeValidTimes` bracket.
 */
export function verifiedDmiNativeComponentSource(
  source,
  rowTime,
  component,
  expectedIdentity,
) {
  if (!exactDmiIdentity(source, expectedIdentity)) return null;
  const verified = verifiedDmiNativeSource(source, component, rowTime);
  if (!verified || (component === 'wave' && !verifiedWamDistance(verified, expectedIdentity))) {
    return null;
  }
  return verified;
}

function samePoint(first, second, tolerance = 1e-7) {
  return Array.isArray(first) && Array.isArray(second)
    && first.length === 2 && second.length === 2
    && first.every((value, index) => finite(value) !== null
      && finite(second[index]) !== null
      && Math.abs(value - second[index]) <= tolerance);
}

function haversineKm(first, second) {
  if (!samePoint(first, first) || !samePoint(second, second)) return Infinity;
  const radians = degrees => degrees * Math.PI / 180;
  const [lon1, lat1] = first.map(Number);
  const [lon2, lat2] = second.map(Number);
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const term = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(term), Math.sqrt(Math.max(0, 1 - term)));
}

function verifiedWamDistance(source, expectedIdentity) {
  const maximum = RAVSCORE_WAM_MAX_DISTANCE_KM[source?.collection];
  const declared = finite(source?.distanceKm);
  const physical = haversineKm(expectedIdentity?.samplingPoint, source?.gridPoint);
  return Number.isFinite(maximum)
    && declared !== null
    && declared >= 0
    && declared <= maximum
    && Number.isFinite(physical)
    && physical <= maximum;
}

/**
 * Fail-closed proof that a DMI U/V pair belongs to the exact approved sampling
 * point and to the repository's declared vector semantics. Raw U/V never leave
 * the private producer; this function only returns compact proof metadata.
 */
export function verifiedBulkCurrent(
  bulkCache,
  bulkZone,
  expectedSamplingPoint,
  source,
  rowTime = null,
  expectedIdentity = null,
) {
  if (bulkCache?.currentVectorSemanticsVersion !== RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION) return null;
  if (!samePoint(bulkZone?.samplingPoint, expectedSamplingPoint)) return null;
  if (!exactDmiIdentity(bulkZone, expectedIdentity)
    || !exactDmiIdentity(source, expectedIdentity)) return null;
  if (source?.vectorSemanticsVersion !== RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION) return null;
  if (source?.fallback !== false) return null;
  const temporalProof = Array.isArray(source?.nativeValidTimes)
    ? verifiedDmiForecastComponentSource(source, rowTime, 'current', expectedIdentity)
    : verifiedDmiNativeComponentSource(source, rowTime, 'current', expectedIdentity);
  if (!temporalProof) return null;
  if (!source?.verticalLayer || !samePoint(source?.samplingPoint, expectedSamplingPoint)) return null;
  if (source?.vectorSelection !== bulkCache?.currentVectorSelection) return null;
  const distance = finite(source?.distanceKm) ?? Infinity;
  const maximum = finite(bulkCache?.currentMaxDistanceKm) ?? 5;
  if (distance > maximum) return null;
  const gridPoint = Array.isArray(source?.gridPoint)
    ? source.gridPoint.slice(0, 2)
    : null;
  if (!gridPoint || gridPoint.length !== 2 || gridPoint.some(value => finite(value) === null)) return null;
  if (haversineKm(expectedSamplingPoint, gridPoint) > maximum + 0.01) return null;
  return {
    verticalLayer: source.verticalLayer,
    gridPoint,
    samplingPoint: expectedSamplingPoint,
  };
}

export function verifiedControlledLiveCurrentSource(source, rowTime, part, rowUMps, rowVMps) {
  const expectedSamplingPoint = part?.waterPoint;
  const sourceUMps = finite(source?.uMps);
  const sourceVMps = finite(source?.vMps);
  if (source?.status !== 'verified'
    || source?.vectorSemanticsVersion !== 4
    || source?.fallback !== false
    || !samePoint(source?.samplingPoint, expectedSamplingPoint)
    || !samePoint(source?.gridPoint, source?.gridPoint)
    || finite(source?.distanceKm) === null
    || validTimeMs(source?.validTime) !== validTimeMs(rowTime)
    || !nativeTimesCoverRow(source, rowTime)
    || sourceUMps === null || sourceVMps === null
    || finite(rowUMps) === null || finite(rowVMps) === null
    || sourceUMps !== rowUMps || sourceVMps !== rowVMps) return null;
  const provider = String(source?.provider ?? '').toLowerCase();
  if (provider === 'copernicus') {
    if (typeof source?.productId !== 'string' || source.productId.length === 0
      || typeof source?.datasetId !== 'string' || source.datasetId.length === 0) return null;
  } else if (provider === 'dmi') {
    const modelRunMs = validTimeMs(source?.modelRun);
    if (modelRunMs === null || modelRunMs > validTimeMs(rowTime)) return null;
  }
  return verifiedLivePilotSource(source, part, { requireStatus: true });
}

function sanitizeWind(hour, expectedIdentity) {
  const source = verifiedDmiForecastComponentSource(
    hour?.sources?.wind,
    hour?.time,
    'wind',
    expectedIdentity,
  );
  const speed = finite(hour?.windSpeedMps);
  const direction = finite(hour?.windDirectionDeg);
  const valid = source && speed !== null && speed >= 0
    && direction !== null && direction >= 0 && direction <= 360;
  return valid ? {
    windSpeedMps: speed,
    windDirectionDeg: normalizeDegrees(direction),
    windProvenance: { ...source, status: 'verified' },
  } : {
    windSpeedMps: null,
    windDirectionDeg: null,
    windProvenance: { status: 'unverified', reason: 'no-exact-authorized-wind-source' },
  };
}

function sanitizeWave(hour, expectedIdentity) {
  const directSource = verifiedDmiForecastComponentSource(
    hour?.sources?.wave,
    hour?.time,
    'wave',
    expectedIdentity,
  );
  const height = finite(hour?.waveHeightM);
  const period = finite(hour?.wavePeriodS);
  const direction = hour?.waveDirectionDeg === null || hour?.waveDirectionDeg === undefined
    ? null
    : finite(hour.waveDirectionDeg);
  const directionValueValid = direction === null
    || (direction >= 0 && direction < 360);
  const proxyVerified = !directSource
    && expectedIdentity?.parentZoneId === FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID
    && verifyCompactFeggesundWaveProxy({
      targetEntityId: expectedIdentity?.entityId,
      targetParentZoneId: expectedIdentity?.parentZoneId,
      time: hour?.time,
      projection: {
        waveHeightM: height,
        wavePeriodS: period,
        waveDirectionDeg: direction,
        proxy: hour?.sources?.wave,
      },
    });
  const directionAttested = proxyVerified
    || (Array.isArray(directSource?.optionalFieldSet)
      && directSource.optionalFieldSet.length === 1
      && directSource.optionalFieldSet[0] === 'mean-wave-dir');
  const valid = (directSource || proxyVerified) && height !== null && height >= 0
    && period !== null && period >= 0
    && directionValueValid;
  return valid ? {
    waveHeightM: height,
    wavePeriodS: period,
    // Height/period remain usable for mobilisation and Candidate G rollback,
    // but the integrated last-mile state receives a direction only when the
    // canonical source verifier proves `mean-wave-dir` on every native step.
    waveDirectionDeg: direction !== null && directionAttested
      ? normalizeDegrees(direction)
      : null,
    waveProvenance: proxyVerified
      ? { ...hour.sources.wave, status: 'verified-derived' }
      : { ...directSource, status: 'verified' },
    waveInputSource: proxyVerified
      ? FEGGESUND_WAVE_PROXY_INPUT_SOURCE
      : 'DIRECT_OFFICIAL',
    waveInputUncertainty: proxyVerified
      ? hour.sources.wave.disagreementClass
      : 'LOW',
    waveInputNoticeId: proxyVerified
      ? FEGGESUND_WAVE_PROXY_NOTICE_ID
      : null,
  } : {
    waveHeightM: null,
    wavePeriodS: null,
    waveDirectionDeg: null,
    waveProvenance: { status: 'unverified', reason: 'no-exact-authorized-wave-source' },
    waveInputSource: null,
    waveInputUncertainty: null,
    waveInputNoticeId: null,
  };
}

function sanitizeWaterLevel(hour, expectedIdentity) {
  const source = verifiedDmiForecastComponentSource(
    hour?.sources?.waterLevel,
    hour?.time,
    'waterLevel',
    expectedIdentity,
  );
  const level = finite(hour?.waterLevelCm);
  return source && level !== null ? {
    waterLevelCm: level,
    waterLevelTrendCm3h: null,
    waterLevelProvenance: { ...source, status: 'verified' },
  } : {
    waterLevelCm: null,
    waterLevelTrendCm3h: null,
    waterLevelProvenance: { status: 'unverified', reason: 'no-exact-dmi-water-level-source' },
  };
}

function sameDmiSeries(left, right) {
  return left?.status === 'verified'
    && right?.status === 'verified'
    && left.provider === 'dmi'
    && right.provider === 'dmi'
    && left.collection === right.collection
    && left.modelRun === right.modelRun
    && left.component === right.component
    && left.componentKind === right.componentKind
    && left.entityId === right.entityId
    && left.parentZoneId === right.parentZoneId
    && left.entityType === right.entityType
    && left.samplingContext === right.samplingContext
    && left.gridDefinitionSha256 === right.gridDefinitionSha256
    && left.spatialSelection === right.spatialSelection
    && left.spatialSemanticsVersion === right.spatialSemanticsVersion
    && left.vectorSelection === right.vectorSelection
    && left.vectorSemanticsVersion === right.vectorSemanticsVersion
    && samePoint(left.samplingPoint, right.samplingPoint)
    && samePoint(left.gridPoint, right.gridPoint);
}

/**
 * The integrated model may consume current only when the exact hourly U/V pair
 * is backed by verified DMI provenance or the separately controlled live pilot.
 */
export function verifiedIntegratedPartHourly(record, bulkCache, bulkId, part) {
  const expectedDmiIdentity = dmiExpectedIdentityForPart(part, bulkId);
  const sanitized = normalizeForecastHourly(record?.hourly ?? []).map(hour => {
    const holdProvenance = hour?.currentProvenance;
    const currentStateOnlyHold = verifiedStateOnlyCurrentHold(
      holdProvenance,
      hour?.time,
      part,
    );
    const hasStateOnlyHoldSignal = hour?.currentStateOnlyHold !== null
      && hour?.currentStateOnlyHold !== undefined
      || holdProvenance?.status === 'verified-derived-state-only'
      || holdProvenance?.classification === 'REGIONAL_DMI_DERIVED_HOLD'
      || holdProvenance?.stateOnly === true;
    if (hasStateOnlyHoldSignal && !currentStateOnlyHold) {
      throw new Error('Integrated current sanitizer rejected an invalid state-only hold');
    }
    if (hour?.currentStateOnlyHold !== null
      && hour?.currentStateOnlyHold !== undefined
      && JSON.stringify(hour.currentStateOnlyHold) !== JSON.stringify(currentStateOnlyHold)) {
      throw new Error('Integrated current sanitizer found a mismatched state-only hold marker');
    }
    if (currentStateOnlyHold && stateOnlyCurrentRowForbiddenFields(hour)
      .some(field => hour[field] !== null && hour[field] !== undefined)) {
      throw new Error('Integrated state-only hold cannot contain current vector or projection fields');
    }
    const { currentStateOnlyHold: _discardedHold, ...plainHourWithoutHold } = hour;
    const hourWithoutHold = currentStateOnlyHold
      ? stripStateOnlyCurrentRowProjection(plainHourWithoutHold)
      : plainHourWithoutHold;
    const source = hour?.currentProvenance?.status === 'verified'
      ? hour.currentProvenance
      : hour?.sources?.current;
    const proof = finite(hour?.currentUMps) !== null && finite(hour?.currentVMps) !== null
      ? verifiedBulkCurrent(
        bulkCache,
        bulkCache?.zones?.[bulkId],
        part?.waterPoint,
        source,
        hour?.time,
        expectedDmiIdentity,
      ) || verifiedControlledLiveCurrentSource(
        source,
        hour?.time,
        part,
        hour?.currentUMps,
        hour?.currentVMps,
      )
      : null;
    const wind = sanitizeWind(hour, expectedDmiIdentity);
    const wave = sanitizeWave(hour, expectedDmiIdentity);
    const waterLevel = sanitizeWaterLevel(hour, expectedDmiIdentity);
    if (currentStateOnlyHold) {
      return {
        ...hourWithoutHold,
        ...wind,
        ...wave,
        ...waterLevel,
        currentProvenance: {
          status: 'unverified',
          reason: 'closure-verified-exact-state-only-hold',
        },
        currentStateOnlyHold,
      };
    }
    const coastNormalSpeedMps = proof
      ? coastNormalSpeedMpsFromUv(
        hour.currentUMps,
        hour.currentVMps,
        part?.onshoreDirectionDeg,
      )
      : null;
    if (proof && coastNormalSpeedMps !== null) {
      const currentUMps = finite(hour.currentUMps);
      const currentVMps = finite(hour.currentVMps);
      // The score must be derived from the exact U/V pair whose provenance was
      // proved above. Never trust parallel cached speed/direction fields: they
      // could be stale or internally contradictory even when the vector itself
      // is valid. Preserve the established forecast precision while keeping raw
      // U/V inside the private producer.
      return {
        ...hourWithoutHold,
        ...wind,
        ...wave,
        ...waterLevel,
        currentSpeedMps: round(Math.hypot(currentUMps, currentVMps), 2),
        currentDirectionDeg: normalizeDegrees(round(
          uvToTowardDirectionDeg(currentUMps, currentVMps),
          0,
        )),
        currentCoastNormalSpeedMps: coastNormalSpeedMps,
        currentProvenance: {
          ...(source ?? {}),
          status: 'verified',
          sourceClass: source?.sourceClass
            ?? (source?.vectorSemanticsVersion === 3 ? 'local-model-grid' : undefined),
        },
      };
    }
    return {
      ...hourWithoutHold,
      ...wind,
      ...wave,
      ...waterLevel,
      currentUMps: null,
      currentVMps: null,
      currentSpeedMps: null,
      currentDirectionDeg: null,
      currentCoastNormalSpeedMps: null,
      currentProvenance: {
        status: 'unverified',
        reason: 'no-time-specific-verified-water-column',
      },
    };
  });
  const byTime = new Map(sanitized.map(row => [row.time, row]));
  return sanitized.map(row => {
    if (finite(row.waterLevelCm) === null) return row;
    const future = byTime.get(new Date(Date.parse(row.time) + 3 * HOUR_MS).toISOString());
    if (finite(future?.waterLevelCm) === null
      || !sameDmiSeries(row.waterLevelProvenance, future?.waterLevelProvenance)) return row;
    return {
      ...row,
      waterLevelTrendCm3h: round(future.waterLevelCm - row.waterLevelCm, 0),
    };
  });
}

/**
 * Collapse all coastal-part results into one public zone/hour result. A zone is
 * unavailable unless every expected part has a score for the exact hour.
 */
export function buildIntegratedZoneHourlyProjection({
  rows,
  expectedPartCount,
  selectedMode,
  marginPoints = RAVSCORE_LOCAL_MARGIN_POINTS,
} = {}) {
  if (!Array.isArray(rows) || !Number.isInteger(expectedPartCount)
    || expectedPartCount < 1 || typeof selectedMode !== 'function'
    || finite(marginPoints) === null || marginPoints < 0) {
    throw new Error('Integrated zone projection requires rows, expected part count and mode selector');
  }
  const partIds = rows.map(row => row?.partId);
  if (partIds.some(partId => typeof partId !== 'string' || partId.length === 0)
    || new Set(partIds).size !== partIds.length
    || rows.length > expectedPartCount) {
    throw new Error('Integrated zone projection requires unique expected coastal parts');
  }
  const times = [...new Set(rows.flatMap(row => (row.scores ?? []).map(score => score.time)))].sort();
  return times.map(time => {
    const result = { time };
    for (const mode of ['waders', 'beach']) {
      const evaluated = rows.map(row => {
        const scoreRow = row.scores.find(score => score.time === time);
        const detail = scoreRow ? selectedMode(scoreRow, mode) : null;
        return {
          partId: row.partId,
          name: row.name,
          score: detail?.score,
          detail,
          weather: scoreRow?.weather,
          scoreContractValid: exactAvailableScoreContract(detail),
        };
      });
      const available = evaluated.filter(row => row.scoreContractValid);
      if (available.length !== expectedPartCount) {
        const missingExpectedPartCount = Math.max(0, expectedPartCount - evaluated.length);
        const unavailableParts = evaluated.filter(row => !row.scoreContractValid).map(row => ({
          partId: row.partId,
          name: row.name,
          code: row.detail?.available === true
            ? 'INTEGRATED_RAVSCORE_QUALITY_INVALID'
            : row.detail?.unavailability?.code ?? 'INTEGRATED_RAVSCORE_MISSING',
          reason: row.detail?.available === true
            ? 'RavScore-resultatets kvalitets- eller intervalkontrakt er ugyldig for denne kystdel.'
            : row.detail?.unavailability?.messageDa
              ?? 'RavScore-datagrundlaget mangler for denne kystdel.',
        }));
        const reasons = [...new Set([
          ...unavailableParts.map(part => part.reason),
          ...(missingExpectedPartCount > 0
            ? ['En eller flere forventede kystdele mangler helt for denne time.']
            : []),
        ])];
        const unavailabilityCode = missingExpectedPartCount > 0
          ? 'INTEGRATED_RAVSCORE_PART_COVERAGE_INCOMPLETE'
          : 'INTEGRATED_RAVSCORE_LOCAL_DATA_INCOMPLETE';
        result[mode] = {
          modelBinding: ravScoreModelBinding(),
          status: 'unavailable',
          available: false,
          score: null,
          scoreBounds: null,
          scoreQuality: 'UNAVAILABLE',
          calibrationEligible: false,
          scoreSemantics: null,
          conservativeTailResetApplied: false,
          historyCoverageHours: null,
          historyReasonCodes: [],
          validPartCount: available.length,
          expectedPartCount,
          unavailableParts,
          reasons,
          unavailability: {
            available: false,
            code: unavailabilityCode,
            messageDa: reasons.join(' '),
            policy: 'integrated-model-local-fail-closed',
            validPartCount: available.length,
            expectedPartCount,
          },
        };
        continue;
      }
      available.sort((left, right) => right.score - left.score
        || scoreQualityRank(left.detail?.scoreQuality)
          - scoreQualityRank(right.detail?.scoreQuality)
        || left.partId.localeCompare(right.partId));
      const winner = available[0];
      const high = winner.score;
      const low = available.at(-1).score;
      const lower = Math.max(...available.map(row => row.detail.scoreBounds.lower));
      const upper = Math.max(...available.map(row => row.detail.scoreBounds.upper));
      const rawLower = Math.max(...available.map(row => row.detail.scoreBounds.rawLower));
      const rawUpper = Math.max(...available.map(row => row.detail.scoreBounds.rawUpper));
      const historyIncomplete = available.some(row =>
        row.detail.scoreQuality === 'HISTORY_INCOMPLETE');
      const calibrationInputLocked = available.some(row =>
        row.detail.calibrationEligible !== true);
      const historyCoverageHours = Math.min(...available
        .map(row => row.detail.historyCoverageHours));
      const historyReasonCodes = [...new Set(available
        .flatMap(row => row.detail.scoreQuality === 'HISTORY_INCOMPLETE'
          ? row.detail.historyReasonCodes : []))].sort();
      const conservativeTailResetApplied = historyIncomplete
        ? available.some(row => row.detail.conservativeTailResetApplied === true)
        : winner.detail.conservativeTailResetApplied === true;
      const possibleWinningParts = available
        .filter(row => row.detail.scoreBounds.upper >= lower)
        .sort((left, right) => left.partId.localeCompare(right.partId))
        .map(row => ({
          partId: row.partId,
          name: row.name,
          score: row.score,
          scoreBounds: { ...row.detail.scoreBounds },
        }));
      const winningPartUncertain = historyIncomplete
        && possibleWinningParts.some(part => part.partId !== winner.partId);
      const near = available.filter(row => high - row.score <= marginPoints);
      const status = high - low <= marginPoints
        ? 'whole-zone'
        : near.length === 1 ? 'only-part' : 'several-parts';
      const weather = winner.weather ?? {};
      const proxyWaveInputs = available
        .map(row => row.weather ?? {})
        .filter(candidate =>
          candidate.waveInputSource === FEGGESUND_WAVE_PROXY_INPUT_SOURCE
          && ['LOW', 'MODERATE', 'HIGH'].includes(candidate.waveInputUncertainty)
          && candidate.waveInputNoticeId === FEGGESUND_WAVE_PROXY_NOTICE_ID);
      const aggregateWaveInputQuality = proxyWaveInputs.length > 0
        ? {
          waveInputSource: FEGGESUND_WAVE_PROXY_INPUT_SOURCE,
          waveInputUncertainty: proxyWaveInputs
            .map(candidate => candidate.waveInputUncertainty)
            .sort((left, right) =>
              ['LOW', 'MODERATE', 'HIGH'].indexOf(right)
              - ['LOW', 'MODERATE', 'HIGH'].indexOf(left))[0],
          waveInputNoticeId: FEGGESUND_WAVE_PROXY_NOTICE_ID,
        }
        : {
          waveInputSource: weather.waveInputSource,
          waveInputUncertainty: weather.waveInputUncertainty,
          waveInputNoticeId: weather.waveInputNoticeId,
        };
      const explanation = winner.detail?.explanation ?? {};
      result[mode] = {
        modelBinding: ravScoreModelBinding(),
        available: true,
        status,
        score: lower,
        scoreBounds: {
          lower,
          upper,
          modelUncertaintyPoints: upper - lower,
          rawLower,
          rawUpper,
        },
        winningPartId: winner.partId,
        winningPartName: winner.name,
        winningPartUncertain,
        possibleWinningPartCount: possibleWinningParts.length,
        possibleWinningParts,
        scoreSpread: high - low,
        comparisonPartCount: available.length,
        scoreQuality: historyIncomplete ? 'HISTORY_INCOMPLETE' : 'FULL_HISTORY',
        calibrationEligible: !historyIncomplete && !calibrationInputLocked,
        scoreSemantics: historyIncomplete
          ? 'CONSERVATIVE_ENCLOSING_LOWER_BOUND'
          : conservativeTailResetApplied
            ? 'CONSERVATIVE_TAIL_RESET_POINT_SCORE'
            : 'EXACT_POINT_SCORE',
        conservativeTailResetApplied,
        historyCoverageHours,
        historyReasonCodes,
        components: winner.detail?.components ?? {},
        componentReasons: winner.detail?.componentReasons ?? {},
        explanation: {
          ...explanation,
          transportDiagnostics: {
            ...(explanation.transportDiagnostics ?? {}),
            coastTransportExplanation: explanation.transportDiagnostics?.coastTransportExplanation,
          },
        },
        weather: {
          windSpeedMps: weather.windSpeedMps,
          windDirectionDeg: weather.windDirectionDeg,
          waveHeightM: weather.waveHeightM,
          wavePeriodS: weather.wavePeriodS,
          waveDirectionDeg: weather.waveDirectionDeg,
          ...aggregateWaveInputQuality,
          waterLevelCm: weather.waterLevelCm,
          waterLevelTrendCm3h: weather.waterLevelTrendCm3h,
          currentSpeedMps: weather.currentSpeedMps,
          currentDirectionDeg: weather.currentDirectionDeg,
          waterTemperatureC: weather.waterTemperatureC,
          currentProvenance: weather.currentProvenance,
        },
        parts: status === 'whole-zone'
          ? []
          : near.map(({ partId, name, score, detail }) => ({
            partId,
            name,
            score,
            scoreQuality: detail.scoreQuality,
            scoreBounds: { ...detail.scoreBounds },
            historyCoverageHours: detail.historyCoverageHours,
            historyReasonCodes: [...detail.historyReasonCodes],
          })),
      };
    }
    return result;
  });
}

export function buildIntegratedPartPublicProjection({
  row,
  score,
  scoreProfile,
  selectedMode,
  flowPoints,
} = {}) {
  if (!row || typeof selectedMode !== 'function' || !scoreProfile) {
    throw new Error('Integrated part projection requires row, profile and mode selector');
  }
  const ravScoreModel = score?.ravScoreModel ? {
    ...ravScoreModelBinding(),
    weights: RAVSCORE_WEIGHTS,
    scoreImpact: 'active-public',
    automaticActivationAllowed: false,
    publicScoreChanged: scoreProfile.activeProfileId === ravScoreModelBinding().modelId,
    referenceAt: score.ravScoreModel.referenceAt,
    currentReferenceAt: score.ravScoreModel.currentReferenceAt,
    currentTransition: score.ravScoreModel.publicContext?.currentTransition ?? null,
    currentMemoryReady: score.ravScoreModel.currentMemoryReady,
    currentMemoryStatus: score.ravScoreModel.currentMemoryStatus,
    currentMemoryCoverageHours: score.ravScoreModel.currentMemoryCoverageHours,
    currentMemoryWindowHours: score.ravScoreModel.currentMemoryWindowHours,
    waveLastVerifiedAt: score.ravScoreModel.waveLastVerifiedAt,
    waveMemoryReady: score.ravScoreModel.waveMemoryReady,
    waveMemoryStatus: score.ravScoreModel.waveMemoryStatus,
    lastMileWaveReferenceAt: score.ravScoreModel.lastMileWaveReferenceAt,
    lastMileMemoryReady: score.ravScoreModel.lastMileMemoryReady,
    lastMileMemoryStatus: score.ravScoreModel.lastMileMemoryStatus,
    migrationApplied: row.ravScoreState?.migrationApplied === true,
    migrationId: row.ravScoreState?.migrationId ?? null,
    initialStateAccepted: row.ravScoreState?.initialStateAccepted ?? null,
    initialStateSource: row.ravScoreState?.initialStateSource ?? null,
    currentState: score.ravScoreModel.continuationState,
    modes: score.ravScoreModel.modes,
  } : null;
  return {
    zoneId: row.zoneId,
    name: row.name,
    marineCoverage: row.marineCoverage,
    landPoint: row.landPoint,
    waterPoint: row.waterPoint,
    onshoreDirectionDeg: row.onshoreDirectionDeg,
    onshoreDirectionSource: row.onshoreDirectionSource,
    flowPoints,
    current: score ? {
      ...score,
      ravScoreModel: undefined,
      waders: selectedMode(score, 'waders'),
      beach: selectedMode(score, 'beach'),
    } : null,
    ravScoreModel,
  };
}
