// Import-safe normal DMI record construction. These are the producer's actual
// pure functions, shared with saved-original dependency planning; no acquisition,
// filesystem work, source-policy override or caller-provided admission seam.
import { RAVSCORE_PUBLIC_FORECAST_HOURS } from '../../js/core/ravscore-model-contract.js';
import {
  DMI_FORECAST_HOURS, createDmiForecastRecord, normalizeForecastHourly,
  inspectDmiForecastGridSampling,
} from './dmi-forecast-store.mjs';
import { buildDmiMarineComponentwiseHourly, recoverDmiMarineRunSeamHours }
  from './dmi-marine-run-seam-recovery.mjs';
import { repairWaterLevelContinuity } from './water-level-continuity.mjs';
import { dmiWaveDirectionMatchesSource } from './dmi-wave-tuple-proof.mjs';
import { createProtectedDmiNativeCurrentInspector } from './protected-dmi-native-current-proofs.mjs';
import {
  RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION, dmiExpectedIdentityForPart,
  eligibleDmiForecastComponentSource as verifiedDmiForecastComponentSource,
  eligibleDmiNativeComponentSource as verifiedDmiNativeComponentSource,
  eligibleBulkCurrent as verifiedBulkCurrent,
} from './ravscore-production-adapters.mjs';
import { FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS, bindVerifiedFeggesundWaveSource }
  from './feggesund-wave-proxy.mjs';
import { preferQualifiedDmiComponentSource } from './weather-component-selection.mjs';
import { RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS } from './ravscore-recovery-replay.mjs';

// BEGIN normal-record constants
const ACCEPTED_FORECAST_HOURS = RAVSCORE_PUBLIC_FORECAST_HOURS;
const SHORT_DMI_WATER_GAP_HOURS = 6;
const WATER_LEVEL_JUMP_WARN_CM = 35;
// END normal-record constants

// BEGIN normal-record vector
const CURRENT_VECTOR_SEMANTICS_VERSION = RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION;
// END normal-record vector

// BEGIN normal-record numbers
const num = value => value === null || value === undefined || value === '' || typeof value === 'boolean'
  ? null
  : (Number.isFinite(Number(value)) ? Number(value) : null);
// RavScore's private trust boundary is deliberately stricter than legacy UI
// normalisation: coercible strings/booleans/arrays are not physical evidence.
const ravScoreNumber = value => typeof value === 'number' && Number.isFinite(value)
  ? value
  : null;
// END normal-record numbers

// BEGIN normal-record points
function zonePoint(feature) {
  const configured = feature.properties?.dataPoint;
  if (Array.isArray(configured) && configured.length === 2 && configured.every(Number.isFinite)) return configured;
  const ring = feature.geometry?.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 3) throw new Error('Mangler dataPoint eller gyldig polygon');
  const points = ring.slice(0, -1);
  return [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length
  ];
}

function samePoint(first, second, tolerance = 1e-7) {
  return Array.isArray(first) && Array.isArray(second)
    && first.length >= 2 && second.length >= 2
    && first.slice(0, 2).every((value, index) => Number.isFinite(Number(value)) && Math.abs(Number(value) - Number(second[index])) <= tolerance);
}

function withoutCurrent(record) {
  if (!record) return null;
  const completeness = { ...(record.model?.completeness ?? {}) };
  const gridPoints = { ...(completeness.gridPoints ?? {}) };
  const collections = { ...(completeness.collections ?? {}) };
  delete gridPoints['current-u'];
  delete gridPoints['current-v'];
  delete collections['current-u'];
  delete collections['current-v'];
  Object.assign(completeness, {
    current: false,
    currentVectorSemanticsVersion: null,
    currentVectorSelection: null,
    currentPreferredDistanceKm: null,
    currentMaxDistanceKm: null,
    gridPoints,
    collections,
  });
  return {
    ...record,
    model: { ...(record.model ?? {}), completeness },
    hourly: (record.hourly ?? []).map(row => {
      const sources = { ...(row.sources ?? {}) };
      delete sources.current;
      const clean = { ...row, sources };
      for (const key of ['currentSpeedMps', 'currentDirectionDeg', 'currentUMps', 'currentVMps', 'currentProvenance']) delete clean[key];
      return clean;
    }),
  };
}

function withOnlyVerifiedCurrent(record, expectedSamplingPoint) {
  if (!record) return record;
  const completeness = record?.model?.completeness ?? {};
  const maximum = num(completeness.currentMaxDistanceKm) ?? 5;
  const validSource = source => {
    if (Number(completeness.currentVectorSemanticsVersion) !== CURRENT_VECTOR_SEMANTICS_VERSION) return false;
    if (!samePoint(completeness.samplingPoint, expectedSamplingPoint)) return false;
    if (String(source?.provider ?? '').toLowerCase() !== 'dmi') return false;
    if (Number(source?.vectorSemanticsVersion) !== CURRENT_VECTOR_SEMANTICS_VERSION || !source?.verticalLayer) return false;
    if (!samePoint(source?.samplingPoint, expectedSamplingPoint)) return false;
    if (source?.vectorSelection !== completeness.currentVectorSelection) return false;
    const point = Array.isArray(source?.gridPoint) ? source.gridPoint.slice(0, 2).map(Number) : null;
    return Boolean(point && point.every(Number.isFinite)
      && (num(source?.distanceKm) ?? Infinity) <= maximum
      && haversineKm(expectedSamplingPoint, point) <= maximum + 0.01);
  };
  let verifiedRows = 0;
  const hourly = (record.hourly ?? []).map(row => {
    const source = row?.currentProvenance?.status === 'verified' ? row.currentProvenance : row?.sources?.current;
    if (num(row?.currentUMps) !== null && num(row?.currentVMps) !== null && validSource(source)) {
      verifiedRows += 1;
      return row;
    }
    const sources = { ...(row.sources ?? {}) };
    delete sources.current;
    const clean = { ...row, sources };
    for (const key of ['currentSpeedMps', 'currentDirectionDeg', 'currentUMps', 'currentVMps', 'currentProvenance']) delete clean[key];
    return clean;
  });
  return verifiedRows ? { ...record, hourly } : withoutCurrent(record);
}

// END normal-record points

// BEGIN normal-record distance
function haversineKm(a, b) {
  const toRad = degrees => degrees * Math.PI / 180;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}


// END normal-record distance

// BEGIN normal-record collections
function dmiCollections(coastType) {
  if (coastType === 'west') return { wave: 'wam_nsb', ocean: 'dkss_nsbs' };
  if (coastType === 'limfjord') return { wave: null, ocean: 'dkss_lf' };
  return { wave: 'wam_dw', ocean: 'dkss_idw' };
}

// END normal-record collections

// BEGIN normal-record records
function bulkZoneToForecastRecord(
  feature,
  bulkCache,
  generatedAt,
  previousRecord = null,
  {
    startAt = generatedAt,
    expectedIdentity = null,
    materializeMissingHorizon = false,
    currentDecoderTransition = null,
  } = {},
) {
  const zoneId = feature.properties?.id;
  const bulkZone = bulkCache?.zones?.[zoneId];
  const point = zonePoint(feature);
  const dmiIdentity = expectedIdentity ?? {
    entityId: zoneId,
    parentZoneId: zoneId,
    entityType: 'parent-zone',
    samplingContext: 'parent-zone-water-point',
    samplingPoint: point,
  };
  const sameSamplingPoint = !previousRecord || samePoint(previousRecord.point, point);
  const compatiblePrevious = sameSamplingPoint
    ? withOnlyVerifiedCurrent(previousRecord, point)
    : null;
  const currentSemanticsValid = bulkCache?.currentVectorSemanticsVersion === CURRENT_VECTOR_SEMANTICS_VERSION
    && samePoint(bulkZone?.samplingPoint, point);
  const rows = Object.values(bulkZone?.hourly ?? {}).filter(row => Number.isFinite(Date.parse(row?.time))).sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  if (!rows.length && !materializeMissingHorizon) return null;
  const provenance = row => ({ ...(row.sources ?? {}) });
  const wind = rows.filter(row => ravScoreNumber(row['wind-speed-10m']) !== null
    && ravScoreNumber(row['wind-dir-10m']) !== null
    && verifiedDmiNativeComponentSource(provenance(row).wind, row.time, 'wind', dmiIdentity))
    .map(row => ({ step: row.time, 'wind-speed-10m': row['wind-speed-10m'], 'wind-dir-10m': row['wind-dir-10m'], provenance: { wind: provenance(row).wind } }));
  const windTail = rows.filter(row => ravScoreNumber(row['wind-tail-speed-10m']) !== null
    && ravScoreNumber(row['wind-tail-dir-10m']) !== null
    && verifiedDmiNativeComponentSource(provenance(row).windTail, row.time, 'windTail', dmiIdentity))
    .map(row => ({ step: row.time, 'wind-speed-10m': row['wind-tail-speed-10m'], 'wind-dir-10m': row['wind-tail-dir-10m'], provenance: { wind: provenance(row).windTail } }));
  const waves = rows.map(row => {
    const waveSource = verifiedDmiNativeComponentSource(
      provenance(row).wave,
      row.time,
      'wave',
      dmiIdentity,
    );
    const waveHeight = ravScoreNumber(row['significant-wave-height']);
    const wavePeriod = ravScoreNumber(row['dominant-wave-period']);
    if (!waveSource || waveHeight === null || wavePeriod === null) return null;
    const waveDirectionAttested = waveSource.optionalFieldSet.length === 1
      && waveSource.optionalFieldSet[0] === 'mean-wave-dir';
    const waveDirection = waveDirectionAttested
      ? ravScoreNumber(row['mean-wave-dir'])
      : null;
    return {
      step: row.time,
      'significant-wave-height': waveHeight,
      'mean-wave-dir': waveDirection,
      'dominant-wave-period': wavePeriod,
      provenance: { wave: waveSource },
    };
  }).filter(Boolean);
  const ocean = rows.map(row => {
    const rowCurrent = provenance(row).current;
    const rowCurrentValid = ravScoreNumber(row['current-u']) !== null
      && ravScoreNumber(row['current-v']) !== null
      && Boolean(verifiedBulkCurrent(
        bulkCache,
        bulkZone,
        point,
        rowCurrent,
        row.time,
        dmiIdentity,
      ));
    const waterLevelSource = verifiedDmiNativeComponentSource(
      provenance(row).waterLevel,
      row.time,
      'waterLevel',
      dmiIdentity,
    );
    const waterTemperatureSource = verifiedDmiNativeComponentSource(
      provenance(row).waterTemperature,
      row.time,
      'waterTemperature',
      dmiIdentity,
    );
    return {
      step: row.time,
      'sea-mean-deviation': waterLevelSource ? ravScoreNumber(row['sea-mean-deviation']) : null,
      'current-u': rowCurrentValid ? row['current-u'] : null,
      'current-v': rowCurrentValid ? row['current-v'] : null,
      'water-temperature': waterTemperatureSource ? ravScoreNumber(row['water-temperature']) : null,
      provenance: {
        current: rowCurrentValid ? provenance(row).current : null,
        waterLevel: waterLevelSource,
        waterTemperature: waterTemperatureSource,
      },
    };
  }).filter(row => ['sea-mean-deviation','current-u','current-v','water-temperature']
    .some(key => row[key] !== null));
  const sourceStrideHours = ravScoreNumber(bulkCache?.timeStrideHours);
  const sourceCadenceMinutes = (sourceStrideHours ?? 3) * 60;
  const built = buildDmiMarineComponentwiseHourly({
    wind, windTail, waves, ocean, generatedAt, startAt,
    hours: DMI_FORECAST_HOURS, sourceCadenceMinutes, expectedIdentity: dmiIdentity,
  });
  const currentAvailable = ocean.some(item => ravScoreNumber(item['current-u']) !== null && ravScoreNumber(item['current-v']) !== null);
  const waterLevelAvailable = ocean.some(item => ravScoreNumber(item['sea-mean-deviation']) !== null);
  const waterTemperatureAvailable = ocean.some(item => ravScoreNumber(item['water-temperature']) !== null);
  const marine = ocean.some(item => ravScoreNumber(item['sea-mean-deviation']) !== null && ravScoreNumber(item['current-u']) !== null && ravScoreNumber(item['current-v']) !== null);
  const windAvailable = wind.some(item => ravScoreNumber(item['wind-speed-10m']) !== null && ravScoreNumber(item['wind-dir-10m']) !== null);
  const windTailAvailable = windTail.some(item => ravScoreNumber(item['wind-speed-10m']) !== null && ravScoreNumber(item['wind-dir-10m']) !== null);
  const waveAvailable = waves.some(item => ravScoreNumber(item['significant-wave-height']) !== null
    && ravScoreNumber(item['dominant-wave-period']) !== null);
  const waveCollection = waves.find(item => item.provenance?.wave?.collection)?.provenance?.wave?.collection ?? null;
  if (!currentAvailable && !waterLevelAvailable && !waterTemperatureAvailable
    && !windAvailable && !windTailAvailable && !waveAvailable
    && !materializeMissingHorizon) return null;
  const marineContinuousHourly = recoverDmiMarineRunSeamHours({
    hourly: built.hourly, ocean, generatedAt, startAt,
    sourceCadenceMinutes, expectedIdentity: dmiIdentity,
  });
  const mergedDmiHourly = mergeHourlyPreferDmi(
    marineContinuousHourly,
    compatiblePrevious?.hourly ?? [],
    { generatedAt, startAt, expectedIdentity: dmiIdentity, currentDecoderTransition },
  );
  const mergedHourly = FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS.includes(zoneId)
    ? mergedDmiHourly.map(hour => {
      const {
        feggesundNeighborWaveSource: discardedAttestation,
        ...withoutAttestation
      } = hour;
      const attestation = verifiedFeggesundNeighborSource(
        withoutAttestation,
        dmiIdentity,
      );
      return attestation
        ? { ...withoutAttestation, feggesundNeighborWaveSource: attestation }
        : withoutAttestation;
    })
    : mergedDmiHourly;
  const oldCompleteness = compatiblePrevious?.model?.completeness ?? {};
  return createDmiForecastRecord({
    zoneId,
    point,
    generatedAt,
    hourly: mergedHourly,
    waterLevelInterpolation: compatiblePrevious?.waterLevelInterpolation ?? null,
    model: {
      ...(compatiblePrevious?.model ?? {}),
      wind: windAvailable ? 'harmonie_dini_sf-stac-grib' : compatiblePrevious?.model?.wind ?? null,
      windTail: windTailAvailable ? `${bulkZone?.collections?.['wind-tail-u-10m'] ?? 'dkss'}-stac-grib` : compatiblePrevious?.model?.windTail ?? null,
      wave: waveAvailable && waveCollection ? `${waveCollection}-stac-grib` : compatiblePrevious?.model?.wave ?? null,
      ocean: marine ? `${dmiCollections(feature.properties?.coastType).ocean}-stac-grib` : compatiblePrevious?.model?.ocean ?? null,
      completeness: {
        ...oldCompleteness,
        phase: 'bulk-stac-grib',
        ocean: marine || oldCompleteness.ocean === true,
        current: currentAvailable || oldCompleteness.current === true,
        wind: windAvailable || windTailAvailable || oldCompleteness.wind === true,
        windPrimary: windAvailable || oldCompleteness.windPrimary === true,
        windTail: windTailAvailable || oldCompleteness.windTail === true,
        wave: waveAvailable || oldCompleteness.wave === true,
        acquisitionMethod: 'whole-GRIB nearest-valid-original-grid-point',
        forecastCadenceMinutes: 60,
        sourceCadenceMinutes,
        samplingPoint: point,
        currentVectorSemanticsVersion: currentAvailable && currentSemanticsValid ? CURRENT_VECTOR_SEMANTICS_VERSION : null,
        currentVectorSelection: currentAvailable && currentSemanticsValid ? bulkCache?.currentVectorSelection : null,
        currentPreferredDistanceKm: currentAvailable && currentSemanticsValid ? bulkCache?.currentPreferredDistanceKm : null,
        currentMaxDistanceKm: currentAvailable && currentSemanticsValid ? bulkCache?.currentMaxDistanceKm : null,
        temporalInterpolation: built.interpolation,
        spatialInterpolation: false,
        gridPoints: bulkZone?.gridPoints ?? {},
        collections: bulkZone?.collections ?? {},
        bulkCacheGeneratedAt: bulkCache?.generatedAt ?? null
      }
    }
  });
}

// A protected previous DMI generation can still prove a component for the
// exact PART/hour when a newer, incomplete acquisition cannot. Rebuild its
// hourly rows from its native cache, then let the normal atomic selector
// prefer a qualified newer DMI source. Never import its scheduler cursor.
// PUBLIC-only same-original decoder preference. It changes no original and
// obtains every endpoint from the caller's actual admitted native documents.
function publicCurrentDecoderTransition(part, contexts) {
  if (!part) return null;
  const identity = dmiExpectedIdentityForPart(part);
  if (!identity) return null;
  const inspector = createProtectedDmiNativeCurrentInspector({ contexts: contexts.filter(Boolean) });
  const instant = value => typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
  const capture = source => {
    if (!source || !['dkss_idw', 'dkss_nsbs', 'dkss_lf'].includes(source.collection)
      || !instant(source.acquiredAt)
      || !Number.isSafeInteger(source.contentLengthBytes) || source.contentLengthBytes <= 0
      || !/^[a-f0-9]{64}$/.test(source.contentSha256 ?? '')
      || !/^[a-f0-9]{64}$/.test(source.assetIdentitySha256 ?? '')
      || typeof source.itemId !== 'string' || !source.itemId.trim()
      || (source.assetSizeBytes != null && source.assetSizeBytes !== source.contentLengthBytes)) return null;
    const value = { collection: source.collection, itemId: source.itemId,
      assetIdentitySha256: source.assetIdentitySha256, assetSizeBytes: source.assetSizeBytes ?? null,
      contentLengthBytes: source.contentLengthBytes, contentSha256: source.contentSha256 };
    for (const key of ['modelRun', 'nativeValidTime', 'itemCreatedAt', 'itemUpdatedAt']) {
      value[key] = instant(source[key]);
      if (value[key] === null && (key === 'modelRun' || key === 'nativeValidTime' || source[key] != null)) return null;
    }
    return value;
  };
  return (oldRow, freshRow) => {
    const oldSource = oldRow?.sources?.current, freshSource = freshRow?.sources?.current;
    if (oldRow?.time !== freshRow?.time
      || !verifiedDmiForecastComponentSource(oldSource, oldRow?.time, 'current', identity)
      || !verifiedDmiForecastComponentSource(freshSource, freshRow?.time, 'current', identity)
      || oldSource.nativeGridSampling != null
      || oldSource.nativeSteps.some(step => step.nativeGridSampling != null)
      || inspectDmiForecastGridSampling(oldSource, 'current', oldRow.time, identity).status !== 'unknown'
      || inspectDmiForecastGridSampling(freshSource, 'current', freshRow.time, identity).status !== 'coherent') return false;
    const oldProof = inspector.inspectOriginals({ part, row: oldRow });
    const freshProof = inspector.inspectOriginals({ part, row: freshRow });
    if (!oldProof.ok || !freshProof.ok || oldProof.nativeRows.length !== freshProof.nativeRows.length) return false;
    for (let index = 0; index < oldProof.nativeRows.length; index += 1) {
      const old = oldProof.nativeRows[index].source, fresh = freshProof.nativeRows[index].source;
      const oldCapture = capture(old), freshCapture = capture(fresh);
      if (!oldCapture || !freshCapture || JSON.stringify(oldCapture) !== JSON.stringify(freshCapture)
        || old.nativeGridSampling != null
        || old.gridDefinitionSha256 !== fresh.gridDefinitionSha256
        || fresh.nativeGridSampling?.coordinateInterpretation !== 'dmi-dkss-grib1-header-endpoints-v1') return false;
    }
    return true;
  };
}

function buildPartDmiForecastWithProtectedRetention(
  feature, activeBulkCache, protectedBulkCache, generatedAt,
  { startAt, expectedIdentity, persistedHourly = [], historicalBulkCache = null,
    protectPreviousDmi = false, currentDecoderTransitionPart = null },
) {
  const currentDecoderTransition = !protectPreviousDmi && currentDecoderTransitionPart
    ? publicCurrentDecoderTransition(currentDecoderTransitionPart,
      [activeBulkCache, protectedBulkCache, historicalBulkCache]) : null;
  const retained = protectedBulkCache
    ? bulkZoneToForecastRecord(feature, protectedBulkCache, generatedAt, null, {
      startAt, expectedIdentity, materializeMissingHorizon: true,
    })
    : null;
  const current = bulkZoneToForecastRecord(feature, activeBulkCache, generatedAt, retained, {
    startAt, expectedIdentity, materializeMissingHorizon: true, currentDecoderTransition,
  });
  const historical = historicalBulkCache
    ? bulkZoneToForecastRecord(feature, historicalBulkCache, generatedAt, null, {
      startAt, expectedIdentity, materializeMissingHorizon: true,
    })
    : null;
  let previousHourly = !protectPreviousDmi && historical
    ? mergeHourlyPreferDmi(persistedHourly, historical.hourly, {
      generatedAt, startAt, expectedIdentity, currentDecoderTransition,
    })
    : persistedHourly;
  if (protectPreviousDmi) {
    // Replay protects the installed generation's actual selected hourly rows.
    // Raw donor reconstruction may fill holes or supply a proved newer source,
    // but an unproved same-run spatial alternative is not a newer generation.
    // Planning, preflight and PUBLIC keep their existing default selection.
    previousHourly = persistedHourly;
    for (const donor of [historical, retained]) {
      if (!donor) continue;
      previousHourly = mergeHourlyPreferDmi(donor.hourly, previousHourly, {
        generatedAt, startAt, expectedIdentity, protectPreviousDmi: true,
      });
    }
  }
  if (!previousHourly.length) return current;
  return createDmiForecastRecord({
    zoneId: current.zoneId, point: current.point, generatedAt,
    hourly: mergeHourlyPreferDmi(current.hourly, previousHourly, {
      generatedAt, startAt, expectedIdentity, protectPreviousDmi, currentDecoderTransition,
    }),
    waterLevelInterpolation: current.waterLevelInterpolation,
    model: current.model,
  });
}

// Private recovery keeps the existing 121-row mapper and all of its admission
// rules. Only the normal state-72h + history-51h bridge may need a second
// window. Three final scalar support rows preserve the ordinary T+3 sanitizer;
// they never extend replay or the public score/state horizon.
function buildPrivateDmiRecoveryRecord(
  feature, bulkCache, generatedAt,
  { startAt, expectedIdentity, persistedHourly = [], historicalBulkCache = null,
    protectPreviousDmi = false },
) {
  const startMs = Date.parse(startAt), endMs = Date.parse(generatedAt);
  const span = (endMs - startMs) / 3_600_000;
  if (!Number.isSafeInteger(span) || span < 0
    || span > RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS + 51
    || startMs % 3_600_000 !== 0 || endMs % 3_600_000 !== 0
    || new Date(startMs).toISOString() !== startAt
    || new Date(endMs).toISOString() !== generatedAt) {
    throw new Error('DMI_PRIVATE_RECOVERY_WINDOW_INVALID');
  }
  const requiredHours = Math.max(DMI_FORECAST_HOURS, span + 1 + 3);
  let first = null;
  const hourly = [];
  for (let offset = 0; offset < requiredHours; offset += DMI_FORECAST_HOURS) {
    const windowStart = new Date(startMs + offset * 3_600_000).toISOString();
    const record = protectPreviousDmi
      ? buildPartDmiForecastWithProtectedRetention(feature, bulkCache, null, generatedAt, {
        startAt: windowStart, expectedIdentity, persistedHourly, historicalBulkCache,
        protectPreviousDmi: true,
      })
      : bulkZoneToForecastRecord(feature, bulkCache, generatedAt, null, {
        startAt: windowStart, expectedIdentity,
      });
    if (!record) continue;
    if (first === null) first = record;
    const from = startMs + offset * 3_600_000;
    const until = startMs + Math.min(requiredHours, offset + DMI_FORECAST_HOURS) * 3_600_000;
    hourly.push(...record.hourly.filter(row => Date.parse(row.time) >= from
      && Date.parse(row.time) < until));
  }
  if (first === null) return null;
  return { ...first, hourly, validFrom: hourly[0].time,
    validUntil: hourly.at(-1).time, horizonHours: hourly.length };
}

function verifiedFeggesundNeighborSource(hour, expectedIdentity) {
  const source = verifiedDmiForecastComponentSource(
    hour?.sources?.wave,
    hour?.time,
    'wave',
    expectedIdentity,
  );
  const height = ravScoreNumber(hour?.waveHeightM);
  const period = ravScoreNumber(hour?.wavePeriodS);
  const direction = source?.optionalFieldSet?.includes('mean-wave-dir')
    ? ravScoreNumber(hour?.waveDirectionDeg)
    : null;
  if (!source || height === null || height < 0 || period === null || period <= 0
    || (height > 0 && (direction === null || direction < 0 || direction >= 360))) {
    return null;
  }
  return bindVerifiedFeggesundWaveSource({
    parentZoneId: expectedIdentity.parentZoneId,
    time: hour.time,
    waveHeightM: height,
    wavePeriodS: period,
    waveDirectionDeg: direction,
    verifiedDmiSource: source,
  });
}

// END normal-record records

// BEGIN normal-record selection
const ATOMIC_COMPONENT_TUPLE_KEYS = Object.freeze({
  wind: Object.freeze(['windSpeedMps', 'windDirectionDeg']),
  wave: Object.freeze(['waveHeightM', 'wavePeriodS', 'waveDirectionDeg']),
  current: Object.freeze(['currentSpeedMps', 'currentDirectionDeg']),
  waterLevel: Object.freeze(['waterLevelCm']),
  waterTemperature: Object.freeze(['waterTemperatureC']),
});

function atomicComponentTupleValues(row, component) {
  const keys = ATOMIC_COMPONENT_TUPLE_KEYS[component];
  if (!keys) return null;
  if (component === 'waterLevel' || component === 'waterTemperature') {
    const value = ravScoreNumber(row?.[keys[0]]);
    return value === null ? null : { [keys[0]]: value };
  }
  if (component === 'current' && (row?.currentUMps != null || row?.currentVMps != null)) {
    const u = ravScoreNumber(row.currentUMps);
    const v = ravScoreNumber(row.currentVMps);
    if (u === null || v === null) return null;
    // Derived cache fields do not invalidate or supersede a complete raw pair.
    // Source admission still runs before this pair can be selected.
    return { currentSpeedMps: Number(Math.hypot(u, v).toFixed(2)),
      currentDirectionDeg: ((Math.round(Math.atan2(u, v) * 180 / Math.PI) % 360) + 360) % 360 };
  }
  if (component === 'wave') {
    const height = ravScoreNumber(row?.waveHeightM);
    const period = ravScoreNumber(row?.wavePeriodS);
    const rawDirection = row?.waveDirectionDeg === null
      || row?.waveDirectionDeg === undefined
      ? null
      : ravScoreNumber(row.waveDirectionDeg);
    const direction = rawDirection === 360 ? 0 : rawDirection;
    const directionValid = direction === null
      || (direction >= 0 && direction < 360);
    if (height === null || height < 0 || period === null || period < 0
      || !directionValid
      || (height > 0 && (period <= 0 || direction === null))) {
      return null;
    }
    return {
      waveHeightM: height,
      wavePeriodS: period,
      waveDirectionDeg: direction,
    };
  }
  const values = Object.fromEntries(keys.map(key => [key, ravScoreNumber(row?.[key])]));
  if (values[keys[1]] === 360) values[keys[1]] = 0;
  const speed = values[keys[0]];
  const direction = values[keys[1]];
  if (speed === null || speed < 0
    || direction === null || direction < 0 || direction >= 360) {
    return null;
  }
  return values;
}

function selectAtomicComponentTuple(
  primary,
  fallback,
  component,
  { attest = () => true, protectPreviousDmi = false, currentDecoderTransition = null } = {},
) {
  let selected = null;
  const candidates = [
    { row: primary, retained: false },
    { row: fallback, retained: true },
  ];
  if (protectPreviousDmi) candidates.reverse();
  for (const candidate of candidates) {
    const values = atomicComponentTupleValues(candidate.row, component);
    if (!values) continue;
    const attestation = attest(candidate.row, {
      component,
      retained: candidate.retained,
    });
    if (!attestation) continue;
    const admitted = { ...candidate, values, attestation };
    if (!selected) { selected = admitted; continue; }
    if (component === 'current' && !protectPreviousDmi && currentDecoderTransition) {
      if (currentDecoderTransition(selected.row, candidate.row)) { selected = admitted; continue; }
      if (currentDecoderTransition(candidate.row, selected.row)) continue;
    }
    const previousSource = selected.attestation;
    const oldRun = Date.parse(previousSource?.modelRun ?? '');
    const newRun = Date.parse(attestation?.modelRun ?? '');
    if (protectPreviousDmi && selected.retained
      && previousSource?.provider === 'dmi' && attestation?.provider === 'dmi'
      && Number.isFinite(oldRun) && oldRun === newRun) {
      // Native acquisition still chooses the nearest column/deepest shared
      // layer independently. Here we protect an already selected exact hour:
      // a different grid/layer is not proof of a newer official revision.
      const comparable = ['collection', 'component', 'gridDefinitionSha256',
        'verticalLayer', 'verticalLayerRankM'].every(key =>
        previousSource[key] === attestation[key])
        && ['gridPoint', 'samplingPoint'].every(key =>
          Array.isArray(previousSource[key]) && previousSource[key].length === 2
          && Array.isArray(attestation[key]) && attestation[key].length === 2
          && previousSource[key].every((value, index) =>
            Number.isFinite(value) && value === attestation[key][index]));
      if (!comparable) continue;
    }
    if (preferQualifiedDmiComponentSource(previousSource, attestation, component)) {
      selected = admitted;
    }
  }
  return selected;
}

function exactPublicForecastTimes(referenceAt) {
  const referenceMs = Date.parse(referenceAt ?? '');
  const reference = new Date(referenceMs);
  if (!Number.isFinite(referenceMs)
    || reference.toISOString() !== referenceAt
    || reference.getUTCMinutes() !== 0
    || reference.getUTCSeconds() !== 0
    || reference.getUTCMilliseconds() !== 0) {
    throw new Error('Public weather horizon requires one exact UTC production hour');
  }
  return Array.from({ length: ACCEPTED_FORECAST_HOURS }, (_, index) =>
    new Date(referenceMs + index * 3_600_000).toISOString());
}

function materializeExactPublicWeatherHorizon(hourly = [], referenceAt) {
  const rowsByTime = new Map(normalizeForecastHourly(hourly, {
    limit: Number.MAX_SAFE_INTEGER,
  }).map(row => [row.time, row]));
  return exactPublicForecastTimes(referenceAt).map(time => rowsByTime.get(time) ?? {
    time,
    windSpeedMps: null,
    windDirectionDeg: null,
    airTemperatureC: null,
    waveHeightM: null,
    waveDirectionDeg: null,
    wavePeriodS: null,
    waterLevelCm: null,
    waterLevelTrendCm3h: null,
    currentUMps: null,
    currentVMps: null,
    currentSpeedMps: null,
    currentDirectionDeg: null,
    waterTemperatureC: null,
    sources: {
      wind: { provider: 'missing', fallback: false },
      wave: { provider: 'missing', fallback: false },
      current: { provider: 'missing', fallback: false },
      waterLevel: { provider: 'missing', fallback: false },
      waterTemperature: { provider: 'missing', fallback: false },
    },
  });
}

function mergeHourlyPreferDmi(
  dmiHourly = [],
  fallbackHourly = [],
  { generatedAt = null, startAt = generatedAt, expectedIdentity = null,
    protectPreviousDmi = false, currentDecoderTransition = null } = {},
) {
  // Public records keep the exact production +0..+117 axis. Private replay
  // callers deliberately supply an earlier startAt; using generatedAt here
  // used to discard the very measured history they had just reconstructed.
  const publicTimes = exactPublicForecastTimes(startAt);
  const times = expectedIdentity
    ? Array.from({ length: DMI_FORECAST_HOURS }, (_, index) =>
      new Date(Date.parse(startAt) + index * 3_600_000).toISOString())
    : publicTimes;
  const expectedTimeSet = new Set(times);
  if (!expectedIdentity && times.length) {
    const lastPublicMs = Date.parse(times.at(-1));
    for (let offset = 1; offset <= 3; offset += 1) {
      expectedTimeSet.add(new Date(lastPublicMs + offset * 3_600_000).toISOString());
    }
  }
  const future = rows => normalizeForecastHourly(rows, { limit: Number.MAX_SAFE_INTEGER })
    .filter(item => expectedTimeSet.has(item.time));
  const dmiByTime = new Map(future(dmiHourly).map(item => [item.time, item]));
  const fallbackByTime = new Map(future(fallbackHourly).map(item => [item.time, item]));
  const merged = times.map(time => {
    const item = dmiByTime.get(time) ?? {};
    const fallback = fallbackByTime.get(time) ?? {};
    const tupleSource = (row, component, retained) => {
      if (expectedIdentity && component === 'wave'
        && !dmiWaveDirectionMatchesSource(row, row?.sources?.wave)) return null;
      if (expectedIdentity && component === 'current'
        && (ravScoreNumber(row?.currentUMps) === null
          || ravScoreNumber(row?.currentVMps) === null)) {
        return null;
      }
      const declaredComponent = component === 'wind'
        && row?.sources?.wind?.component === 'windTail'
        ? 'windTail'
        : component;
      return expectedIdentity
        ? verifiedDmiForecastComponentSource(
          row?.sources?.[component],
          time,
          declaredComponent,
          expectedIdentity,
        )
        : row?.sources?.[component] ?? (retained
          ? { provider: row?.source ?? 'open-meteo', fallback: true }
          : { provider: 'dmi', fallback: false });
    };
    const select = component => selectAtomicComponentTuple(
      item,
      fallback,
      component,
      {
        // Only the strictly admitted DMI-to-DMI PART path can protect an old
        // winner. Legacy parent display fallback keeps its DMI-first order.
        protectPreviousDmi: Boolean(expectedIdentity && protectPreviousDmi),
        currentDecoderTransition,
        attest: (row, candidate) => tupleSource(
          row,
          component,
          candidate.retained,
        ),
      },
    );
    const selectedWind = select('wind');
    const selectedWave = select('wave');
    const selectedCurrent = select('current');
    const selectedWaterLevel = expectedIdentity ? select('waterLevel') : null;
    const selectedWaterTemperature = expectedIdentity ? select('waterTemperature') : null;
    const selectedCurrentU = ravScoreNumber(selectedCurrent?.row?.currentUMps);
    const selectedCurrentV = ravScoreNumber(selectedCurrent?.row?.currentVMps);
    const selectedCurrentVectorAvailable = selectedCurrentU !== null
      && selectedCurrentV !== null;
    const mergedRow = {
      ...fallback, ...item, time,
      windSpeedMps: selectedWind?.values.windSpeedMps ?? null,
      windDirectionDeg: selectedWind?.values.windDirectionDeg ?? null,
      waveHeightM: selectedWave?.values.waveHeightM ?? null,
      waveDirectionDeg: selectedWave?.values.waveDirectionDeg ?? null,
      wavePeriodS: selectedWave?.values.wavePeriodS ?? null,
      waterLevelCm: selectedWaterLevel?.values.waterLevelCm ?? null,
      waterLevelTrendCm3h: null,
      currentSpeedMps: selectedCurrent?.values.currentSpeedMps ?? null,
      currentDirectionDeg: selectedCurrent?.values.currentDirectionDeg ?? null,
      currentUMps: selectedCurrentVectorAvailable ? selectedCurrentU : null,
      currentVMps: selectedCurrentVectorAvailable ? selectedCurrentV : null,
      airTemperatureC: ravScoreNumber(item.airTemperatureC)
        ?? ravScoreNumber(fallback.airTemperatureC)
        ?? null,
      waterTemperatureC: expectedIdentity
        ? selectedWaterTemperature?.values.waterTemperatureC ?? null
        : ravScoreNumber(item.waterTemperatureC)
        ?? ravScoreNumber(fallback.waterTemperatureC)
        ?? null,
      sources: {
        wind: selectedWind?.attestation ?? { provider: 'missing', fallback: false },
        wave: selectedWave?.attestation ?? { provider: 'missing', fallback: false },
        current: selectedCurrent?.attestation ?? { provider: 'missing', fallback: false },
        waterLevel: selectedWaterLevel?.attestation ?? { provider: 'pending', fallback: false },
        waterTemperature: expectedIdentity
          ? selectedWaterTemperature?.attestation ?? { provider: 'missing', fallback: false }
          : ravScoreNumber(item.waterTemperatureC) !== null
          ? (item.sources?.waterTemperature ?? { provider: 'dmi', fallback: false })
          : ravScoreNumber(fallback.waterTemperatureC) !== null
            ? (fallback.sources?.waterTemperature ?? { provider: fallback.source ?? 'open-meteo', fallback: true })
            : { provider: 'missing', fallback: false }
      }
    };
    if (expectedIdentity) {
      // A donor can now replace an older primary. The whole-row spread above
      // must not carry that primary's cached derived proof/bias into the new
      // tuple. The strict PART sanitizer derives these from the selected
      // source and exact T/T+3 series; current never trusts a stale parallel
      // currentProvenance in preference to the newly selected sources.current.
      for (const key of [
        'windProvenance', 'waveProvenance', 'waveInputSource',
        'waveInputUncertainty', 'waveInputNoticeId', 'feggesundNeighborWaveSource',
        'currentProvenance', 'currentStateOnlyHold', 'currentCoastNormalSpeedMps',
        'waterLevelModelCm', 'waterLevelBiasCm', 'waterLevelObservationDifferenceCm',
        'waterLevelSource', 'waterLevelProvenance', 'waterLevelReference',
        'waterTemperatureProvenance',
      ]) delete mergedRow[key];
    }
    if (Object.values(mergedRow.sources ?? {}).some(source => source?.provider !== 'dmi')) delete mergedRow.source;
    return mergedRow;
  });
  // The model's attested PART series must not be altered by the legacy
  // display-level offset interpolation. Its exact T/T+3 trend is calculated
  // from matching verified series in verifiedIntegratedPartHourly.
  const waterLevelContinuity = expectedIdentity
    ? { status: 'exact-qualified-components-no-datum-adjustment' }
    : repairWaterLevelContinuity(merged, dmiByTime, fallbackByTime, { shortDmiGapHours: SHORT_DMI_WATER_GAP_HOURS, jumpWarningCm: WATER_LEVEL_JUMP_WARN_CM });
  for (const row of merged) row.waterLevelContinuity = waterLevelContinuity;
  return normalizeForecastHourly(merged, { limit: times.length });
}

// END normal-record selection

export {
  ACCEPTED_FORECAST_HOURS,
  SHORT_DMI_WATER_GAP_HOURS,
  WATER_LEVEL_JUMP_WARN_CM,
  CURRENT_VECTOR_SEMANTICS_VERSION,
  num,
  ravScoreNumber,
  zonePoint,
  samePoint,
  withoutCurrent,
  withOnlyVerifiedCurrent,
  haversineKm,
  dmiCollections,
  bulkZoneToForecastRecord,
  publicCurrentDecoderTransition,
  buildPartDmiForecastWithProtectedRetention,
  buildPrivateDmiRecoveryRecord,
  verifiedFeggesundNeighborSource,
  ATOMIC_COMPONENT_TUPLE_KEYS,
  atomicComponentTupleValues,
  selectAtomicComponentTuple,
  exactPublicForecastTimes,
  materializeExactPublicWeatherHorizon,
  mergeHourlyPreferDmi,
};
