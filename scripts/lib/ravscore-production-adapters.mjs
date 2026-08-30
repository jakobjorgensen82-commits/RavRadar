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
import { verifiedLivePilotSource } from './live-current-pilot.mjs';

export const RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION = 3;
export const RAVSCORE_LOCAL_MARGIN_POINTS = 7;
const HOUR_MS = 3_600_000;
const MAXIMUM_DMI_BRACKET_HOURS = 4;
const MAXIMUM_DMI_EDGE_MINUTES = 95;

// Production weather and provenance are JSON numbers, never coercible values.
// Treat booleans, numeric strings, arrays and custom objects as missing so a
// malformed cache cannot accidentally become a zero/current proof.
const finite = value => typeof value === 'number' && Number.isFinite(value)
  ? value
  : null;

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
  return verifiedDmiForecastSource(source, component, rowTime, expectedIdentity);
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
  return verifiedDmiNativeSource(source, component, rowTime);
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
  return 6371 * 2 * Math.atan2(Math.sqrt(term), Math.sqrt(Math.max(0, 1 - term)));
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
  const source = verifiedDmiForecastComponentSource(
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
  const valid = source && height !== null && height >= 0
    && period !== null && period >= 0
    && (direction === null || (direction >= 0 && direction <= 360));
  return valid ? {
    waveHeightM: height,
    wavePeriodS: period,
    waveDirectionDeg: direction === null ? null : normalizeDegrees(direction),
    waveProvenance: { ...source, status: 'verified' },
  } : {
    waveHeightM: null,
    wavePeriodS: null,
    waveDirectionDeg: null,
    waveProvenance: { status: 'unverified', reason: 'no-exact-authorized-wave-source' },
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
        ...hour,
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
      ...hour,
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
        };
      });
      const available = evaluated.filter(row => row.detail?.available === true
        && Number.isFinite(row.score));
      if (available.length !== expectedPartCount) {
        const missingExpectedPartCount = Math.max(0, expectedPartCount - evaluated.length);
        const unavailableParts = evaluated.filter(row => row.detail?.available !== true).map(row => ({
          partId: row.partId,
          name: row.name,
          code: row.detail?.unavailability?.code ?? 'INTEGRATED_RAVSCORE_MISSING',
          reason: row.detail?.unavailability?.messageDa
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
        || left.partId.localeCompare(right.partId));
      const winner = available[0];
      const high = winner.score;
      const low = available.at(-1).score;
      const near = available.filter(row => high - row.score <= marginPoints);
      const status = high - low <= marginPoints
        ? 'whole-zone'
        : near.length === 1 ? 'only-part' : 'several-parts';
      const weather = winner.weather ?? {};
      const explanation = winner.detail?.explanation ?? {};
      result[mode] = {
        modelBinding: ravScoreModelBinding(),
        available: true,
        status,
        score: high,
        winningPartId: winner.partId,
        winningPartName: winner.name,
        scoreSpread: high - low,
        comparisonPartCount: available.length,
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
          waterLevelCm: weather.waterLevelCm,
          waterLevelTrendCm3h: weather.waterLevelTrendCm3h,
          currentSpeedMps: weather.currentSpeedMps,
          currentDirectionDeg: weather.currentDirectionDeg,
          waterTemperatureC: weather.waterTemperatureC,
          currentProvenance: weather.currentProvenance,
        },
        parts: status === 'whole-zone'
          ? []
          : near.map(({ partId, name, score }) => ({ partId, name, score })),
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
