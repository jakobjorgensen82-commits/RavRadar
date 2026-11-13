import { dmiWeatherSourcePrecedesReserves } from './weather-component-selection.mjs';
import { eligibleStateOnlyCurrentHold as verifiedStateOnlyCurrentHold } from './live-current-source-calculation.mjs';
import { stateOnlyCurrentRowForbiddenFields, stripStateOnlyCurrentRowProjection } from './state-only-current-row-shape.mjs';
import { coastNormalSpeedMpsFromUv, projectRavScoreAdmittedCurrentVector } from './ravscore-physical-calculation.mjs';
import { FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID, FEGGESUND_WAVE_PROXY_INPUT_SOURCE,
  FEGGESUND_WAVE_PROXY_NOTICE_ID, verifyCompactFeggesundWaveProxy } from './feggesund-wave-calculation.mjs';
import { normalizeDegrees, verifiedDmiForecastSource, verifiedDmiNativeSource } from './dmi-forecast-store.mjs';
import { pythonRoundDmiSamplingCoordinate } from './ravscore-physical-calculation.mjs';
import { dmiMarineCollectionAllowedForZone } from './dmi-marine-zone-exclusions.mjs';
import { eligibleLivePilotSource as verifiedLivePilotSource } from './live-current-source-calculation.mjs';

export const RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION = 3;

// 24-40 km marine search radii as last-mile wave provenance.
export const RAVSCORE_WAM_MAX_DISTANCE_KM = Object.freeze({
  wam_dw: 2,
  wam_nsb: 8,
});
const HOUR_MS = 3_600_000;
const MAXIMUM_DMI_BRACKET_HOURS = 4;
const MAXIMUM_DMI_EDGE_MINUTES = 95;

const finite = value => typeof value === 'number' && Number.isFinite(value)
  ? value
  : null;

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

const DMI_ORIGINAL_IDENTITY_STRINGS = ['entityId', 'parentZoneId', 'entityType', 'samplingContext'];
const DMI_ORIGINAL_IDENTITY_KEYS = [...DMI_ORIGINAL_IDENTITY_STRINGS, 'samplingPoint'].sort().join(',');
const exactIdentityPoint = value => Array.isArray(value) && value.length === 2
  && value.every(item => typeof item === 'number' && Number.isFinite(item))
  && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;

/** Relate two DIFFERENT authorities without rewriting either:
 * central full-precision identity and the verbatim normal original wire one.
 * Accept only the prior exact case or the producer's exact Python seven-place
 * point, never an arbitrary point inside the old verifier's tolerance.
 */
export function dmiOriginalWireIdentityMatchesCentralIdentity(original, central) {
  if (![original, central].every(value => value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === DMI_ORIGINAL_IDENTITY_KEYS
    && exactIdentityPoint(value.samplingPoint))
    || DMI_ORIGINAL_IDENTITY_STRINGS.some(key => typeof central[key] !== 'string' || !central[key]
      || typeof original[key] !== 'string' || original[key] !== central[key])) return false;
  return original.samplingPoint.every((value, index) => value === central.samplingPoint[index])
    || original.samplingPoint.every((value, index) => value === pythonRoundDmiSamplingCoordinate(central.samplingPoint[index]));
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

// Proof authenticity is also used to read immutable original packs. Consumer
// eligibility is separate, so owner source exclusions never rewrite that proof.
export function eligibleDmiForecastComponentSource(source, rowTime, component, expectedIdentity) {
  return dmiMarineCollectionAllowedForZone(source?.collection, expectedIdentity?.parentZoneId, component)
    ? verifiedDmiForecastComponentSource(source, rowTime, component, expectedIdentity) : null;
}

export function eligibleDmiNativeComponentSource(source, rowTime, component, expectedIdentity) {
  return dmiMarineCollectionAllowedForZone(source?.collection, expectedIdentity?.parentZoneId, component)
    ? verifiedDmiNativeComponentSource(source, rowTime, component, expectedIdentity) : null;
}

export function eligibleBulkCurrent(bulkCache, bulkZone, point, source, rowTime, expectedIdentity) {
  return dmiMarineCollectionAllowedForZone(source?.collection, expectedIdentity?.parentZoneId)
    ? verifiedBulkCurrent(bulkCache, bulkZone, point, source, rowTime, expectedIdentity) : null;
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
  const provider = String(source?.provider ?? '').toLowerCase();
  const expectedFallback = provider === 'open-meteo';
  if (source?.status !== 'verified'
    || source?.vectorSemanticsVersion !== 4
    || source?.fallback !== expectedFallback
    || !samePoint(source?.samplingPoint, expectedSamplingPoint)
    || !samePoint(source?.gridPoint, source?.gridPoint)
    || finite(source?.distanceKm) === null
    || validTimeMs(source?.validTime) !== validTimeMs(rowTime)
    || !nativeTimesCoverRow(source, rowTime)
    || sourceUMps === null || sourceVMps === null
    || finite(rowUMps) === null || finite(rowVMps) === null
    || sourceUMps !== rowUMps || sourceVMps !== rowVMps) return null;
  if (provider === 'copernicus') {
    if (typeof source?.productId !== 'string' || source.productId.length === 0
      || typeof source?.datasetId !== 'string' || source.datasetId.length === 0) return null;
  } else if (provider === 'dmi') {
    const modelRunMs = validTimeMs(source?.modelRun);
    if (modelRunMs === null || modelRunMs > validTimeMs(rowTime)) return null;
  } else if (provider !== 'open-meteo') {
    return null;
  }
  return verifiedLivePilotSource(source, part, { requireStatus: true });
}

export { HOUR_MS, MAXIMUM_DMI_BRACKET_HOURS, MAXIMUM_DMI_EDGE_MINUTES, finite, validTimeMs, nativeTimesCoverRow, exactDmiIdentity, DMI_ORIGINAL_IDENTITY_STRINGS, DMI_ORIGINAL_IDENTITY_KEYS, exactIdentityPoint, samePoint, haversineKm, verifiedWamDistance };

export function sanitizeWind(hour, expectedIdentity) {
  const declaredComponent = hour?.sources?.wind?.component;
  const component = declaredComponent === 'wind' || declaredComponent === 'windTail'
    ? declaredComponent
    : null;
  const source = component
    ? eligibleDmiForecastComponentSource(
      hour.sources.wind,
      hour?.time,
      component,
      expectedIdentity,
    )
    : null;
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

export function sanitizeWave(hour, expectedIdentity) {
  const directSource = eligibleDmiForecastComponentSource(
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

export function sanitizeWaterLevel(hour, expectedIdentity) {
  const source = eligibleDmiForecastComponentSource(
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

export function sanitizeWaterTemperature(hour, expectedIdentity) {
  const source = eligibleDmiForecastComponentSource(
    hour?.sources?.waterTemperature, hour?.time, 'waterTemperature', expectedIdentity,
  );
  const temperature = finite(hour?.waterTemperatureC);
  return source && temperature !== null ? {
    waterTemperatureC: temperature,
    waterTemperatureProvenance: { ...source, status: 'verified' },
  } : {
    waterTemperatureC: null,
    waterTemperatureProvenance: { status: 'unverified', reason: 'no-exact-authorized-water-temperature-source' },
  };
}

export function calculateIntegratedPartHour(hour, bulkCache, bulkId, part) {
  const expectedDmiIdentity = dmiExpectedIdentityForPart(part, bulkId);
  let source = null, proof = null;
  const row = (() => {
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
    source = hour?.currentProvenance?.status === 'verified'
      ? hour.currentProvenance
      : hour?.sources?.current;
    proof = finite(hour?.currentUMps) !== null && finite(hour?.currentVMps) !== null
      ? eligibleBulkCurrent(
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
    const waterTemperature = sanitizeWaterTemperature(hour, expectedDmiIdentity);
    if (currentStateOnlyHold) {
      return {
        ...hourWithoutHold,
        ...wind,
        ...wave,
        ...waterLevel,
        ...waterTemperature,
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
        ...waterTemperature,
        ...projectRavScoreAdmittedCurrentVector({
          uMps: hour.currentUMps, vMps: hour.currentVMps, coastNormalSpeedMps,
        }),
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
      ...waterTemperature,
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
  })();
  // Structural/physical calculation only; regional and native capabilities remain in the normal wrapper.
  return { row, source, proof };
}

const RESERVE_FIELDS = Object.freeze([
  ['wind', ['windSpeedMps', 'windDirectionDeg'], 'windProvenance'],
  ['wave', ['waveHeightM', 'wavePeriodS', 'waveDirectionDeg'], 'waveProvenance'],
  ['waterTemperature', ['waterTemperatureC'], 'waterTemperatureProvenance'],
]);
export const SCORING_RESERVE_COMPONENTS = Object.freeze(RESERVE_FIELDS.map(([component]) => component));
const SCALAR_RESERVE_FIELDS = RESERVE_FIELDS.filter(([component]) => component !== 'wave');

export function partReserveCalculationInputs(row, productionReferenceAt, scalarPlanningOnly) {
  const fields = scalarPlanningOnly ? SCALAR_RESERVE_FIELDS : RESERVE_FIELDS;
  return fields.map(([component, names, provenanceKey]) => {
    const wholeTuple = names.every(field => finite(row[field]) !== null
      || (component === 'wave' && field === 'waveDirectionDeg' && row.waveHeightM === 0));
    const provenance = row[provenanceKey];
    const primary = wholeTuple && provenance?.status === 'verified'
      && provenance.provider === 'dmi' ? { source: provenance, row } : null;
    return { component, primary,
      skipPrimary: Boolean(scalarPlanningOnly && primary
        && dmiWeatherSourcePrecedesReserves(primary.source, productionReferenceAt)),
      skipDerived: wholeTuple && provenance?.status === 'verified-derived' };
  });
}

export function projectSelectedPartReserve(result, component, values, source) {
  const provenanceKey = RESERVE_FIELDS.find(([name]) => name === component)?.[2];
  if (!provenanceKey) throw new Error('Unknown scoring reserve component');
  result = { ...result, ...values,
      sources: { ...(result.sources ?? {}), [component]: source },
      [provenanceKey]: { ...source, status: 'verified' },
    };
    if (component === 'wave') {
      result.waveInputSource = 'DIRECT_OFFICIAL';
      result.waveInputUncertainty = 'LOW';
      result.waveInputNoticeId = null;
      delete result.feggesundNeighborWaveSource;
    }
  return result;
}
