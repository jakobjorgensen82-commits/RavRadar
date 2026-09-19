import { verifiedLivePilotSource } from './live-current-pilot.mjs';
import { verifiedDmiForecastSource } from './dmi-forecast-store.mjs';
import { verifiedSelectedWeatherReserve } from './weather-reserve-admission.mjs';

function coordinate(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return null;
  return Number(value);
}

function exactGridPair(grid, firstKey, secondKey) {
  const first = grid?.[firstKey];
  const second = grid?.[secondKey];
  const firstLon = coordinate(first?.longitude);
  const firstLat = coordinate(first?.latitude);
  const secondLon = coordinate(second?.longitude);
  const secondLat = coordinate(second?.latitude);
  if ([firstLon, firstLat, secondLon, secondLat].some(value => value === null)) return null;
  if (Math.abs(firstLon - secondLon) > 1e-7 || Math.abs(firstLat - secondLat) > 1e-7) return null;
  return [firstLon, firstLat];
}

function samePoint(first, second, tolerance = 1e-7) {
  const a = validFallback(first);
  const b = validFallback(second);
  return Boolean(a && b
    && Math.abs(a[0] - b[0]) <= tolerance
    && Math.abs(a[1] - b[1]) <= tolerance);
}

function haversineKm(first, second) {
  const a = validFallback(first);
  const b = validFallback(second);
  if (!a || !b) return Infinity;
  const radians = degrees => degrees * Math.PI / 180;
  const dLat = radians(b[1] - a[1]);
  const dLon = radians(b[0] - a[0]);
  const lat1 = radians(a[1]);
  const lat2 = radians(b[1]);
  const term = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(term), Math.sqrt(1 - term));
}

function exactCurrentGrid(record, expectedSamplingPoint, at = null, part = null) {
  const completeness = record?.model?.completeness ?? {};
  const maximumDistance = coordinate(completeness.currentMaxDistanceKm) ?? 5;
  let rows = [...(record?.hourly ?? [])].sort((a, b) => Date.parse(a?.time ?? '') - Date.parse(b?.time ?? ''));
  const target = Date.parse(at ?? '');
  if (Number.isFinite(target) && rows.length) {
    // Naar en bestemt visningstid er valgt, maa pilen kun bruge netop den
    // times celle. Manglende stroem paa tidspunktet skal ikke skjules ved at
    // hente en anden times celle.
    rows = rows.filter(row => Date.parse(row?.time ?? '') === target);
  }
  for (const row of rows) {
    if (coordinate(row?.currentUMps) === null || coordinate(row?.currentVMps) === null) continue;
    const source = row?.currentProvenance?.status === 'verified' ? row.currentProvenance : row?.sources?.current;
    const liveProof = verifiedLivePilotSource(source, part, { requireStatus: true });
    if (liveProof) return {
      point: liveProof.gridPoint,
      source: liveProof.arrowSource,
      sourceClass: liveProof.arrowSource === 'dmi-regional-proxy-grid'
        ? 'owner-approved-regional-proxy'
        : 'supplemental-local-current',
      distanceKm: liveProof.distanceKm,
    };
    if (Number(completeness.currentVectorSemanticsVersion) !== 3) continue;
    if (!samePoint(completeness.samplingPoint, expectedSamplingPoint)) continue;
    if (String(source?.provider ?? '').toLowerCase() !== 'dmi') continue;
    if (Number(source?.vectorSemanticsVersion) !== 3 || !source?.verticalLayer) continue;
    if (!samePoint(source?.samplingPoint, expectedSamplingPoint)) continue;
    if (completeness.currentVectorSelection && source?.vectorSelection !== completeness.currentVectorSelection) continue;
    const point = validFallback(source?.gridPoint);
    const distance = coordinate(source?.distanceKm);
    if (!point || distance === null || distance > maximumDistance) continue;
    if (haversineKm(expectedSamplingPoint, point) > maximumDistance + 0.01) continue;
    return {
      point,
      source: 'dmi-marine-grid',
      sourceClass: 'local-model-grid',
      distanceKm: distance,
    };
  }
  return null;
}

function validFallback(value) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const longitude = coordinate(value[0]);
  const latitude = coordinate(value[1]);
  return longitude === null || latitude === null ? null : [longitude, latitude];
}

export function flowPointsFromForecastRecord(record, fallbackPoint, at = null, part = null, componentInputs = {}) {
  const fallback = validFallback(fallbackPoint);
  const grid = record?.model?.completeness?.gridPoints ?? {};
  const currentGrid = exactCurrentGrid(record, fallback, at, part);
  const targetMs = Date.parse(at ?? '');
  const exactRow = Number.isFinite(targetMs)
    ? (record?.hourly ?? []).find(row => Date.parse(row?.time ?? '') === targetMs)
    : null;
  const exactSource = component => {
    const source = exactRow?.sources?.[component];
    const identity = part ? {
      entityId: `PART::${part.partId}`, parentZoneId: part.zoneId ?? part.parentZoneId,
      entityType: 'coastal-part', samplingContext: 'coastal-part-water-point',
      samplingPoint: fallback,
    } : {
      entityId: record?.zoneId, parentZoneId: record?.zoneId,
      entityType: 'parent-zone', samplingContext: 'parent-zone-water-point', samplingPoint: fallback,
    };
    const dmi = verifiedDmiForecastSource(source, component === 'wind' ? source?.component : component,
      exactRow?.time, identity);
    if (dmi) return dmi;
    if (!part) return null;
    const reserve = verifiedSelectedWeatherReserve(exactRow, componentInputs, {
      part, validTime: exactRow?.time, component,
    });
    return reserve?.source ?? null;
  };
  const windSource = exactSource('wind');
  const waveSource = exactSource('wave');
  // Global cache metadata can describe a different time/model/grid. Use it
  // only for the legacy untimed view, never to locate a selected-hour arrow.
  const primaryWindGrid = Number.isFinite(targetMs)
    ? windSource?.provider === 'dmi' && windSource.component === 'wind' ? validFallback(windSource.gridPoint) : null
    : exactGridPair(grid, 'wind-u-10m', 'wind-v-10m');
  const marineWindGrid = Number.isFinite(targetMs)
    ? windSource?.component === 'windTail' ? validFallback(windSource.gridPoint) : null
    : primaryWindGrid ? null : exactGridPair(grid, 'wind-tail-u-10m', 'wind-tail-v-10m');
  const reserveWindGrid = windSource?.provider === 'open-meteo' ? validFallback(windSource.gridPoint) : null;
  const windGrid = primaryWindGrid || marineWindGrid || reserveWindGrid;
  const waveRow = grid?.['significant-wave-height'];
  const waveLon = coordinate(waveRow?.longitude);
  const waveLat = coordinate(waveRow?.latitude);
  const waveGrid = Number.isFinite(targetMs)
    ? validFallback(waveSource?.gridPoint)
    : waveLon !== null && waveLat !== null ? [waveLon, waveLat] : null;
  const sourceMetadata = currentGrid ? {
    current: {
      source: currentGrid.source,
      sourceClass: currentGrid.sourceClass,
      distanceKm: currentGrid.distanceKm,
    },
  } : {};
  return {
    current: currentGrid?.point || fallback,
    wind: windGrid || fallback,
    wave: waveGrid || fallback,
    sources: {
      current: currentGrid?.source || 'zone-marine-anchor',
      wind: primaryWindGrid ? 'dmi-atmospheric-grid' : marineWindGrid ? 'dmi-marine-wind-grid'
        : reserveWindGrid ? 'open-meteo-wind-grid' : 'zone-marine-anchor',
      wave: waveGrid ? ['open-meteo', 'copernicus'].includes(waveSource?.provider)
        ? `${waveSource.provider}-wave-grid` : 'dmi-wave-grid' : 'zone-marine-anchor'
    },
    ...(currentGrid ? { sourceMetadata } : {}),
  };
}
