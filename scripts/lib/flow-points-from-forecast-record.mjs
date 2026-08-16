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

function exactCurrentGrid(record, expectedSamplingPoint) {
  const completeness = record?.model?.completeness ?? {};
  if (Number(completeness.currentVectorSemanticsVersion) !== 2) return null;
  if (!samePoint(completeness.samplingPoint, expectedSamplingPoint)) return null;
  const grid = completeness.gridPoints ?? {};
  const first = grid['current-u'];
  const second = grid['current-v'];
  const point = exactGridPair(grid, 'current-u', 'current-v');
  if (!point || !first?.verticalLayer || first.verticalLayer !== second?.verticalLayer) return null;
  const firstDistance = coordinate(first?.distanceKm);
  const secondDistance = coordinate(second?.distanceKm);
  const maximumDistance = coordinate(completeness.currentMaxDistanceKm) ?? 5;
  if (firstDistance === null || secondDistance === null || Math.max(firstDistance, secondDistance) > maximumDistance) return null;
  if (haversineKm(expectedSamplingPoint, point) > maximumDistance + 0.01) return null;
  return point;
}

function validFallback(value) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const longitude = coordinate(value[0]);
  const latitude = coordinate(value[1]);
  return longitude === null || latitude === null ? null : [longitude, latitude];
}

export function flowPointsFromForecastRecord(record, fallbackPoint) {
  const fallback = validFallback(fallbackPoint);
  const grid = record?.model?.completeness?.gridPoints ?? {};
  const currentGrid = exactCurrentGrid(record, fallback);
  const primaryWindGrid = exactGridPair(grid, 'wind-u-10m', 'wind-v-10m');
  const marineWindGrid = primaryWindGrid ? null : exactGridPair(grid, 'wind-tail-u-10m', 'wind-tail-v-10m');
  const windGrid = primaryWindGrid || marineWindGrid;
  const waveRow = grid?.['significant-wave-height'];
  const waveLon = coordinate(waveRow?.longitude);
  const waveLat = coordinate(waveRow?.latitude);
  const waveGrid = waveLon !== null && waveLat !== null ? [waveLon, waveLat] : null;
  return {
    current: currentGrid || fallback,
    wind: windGrid || fallback,
    wave: waveGrid || fallback,
    sources: {
      current: currentGrid ? 'dmi-marine-grid' : 'zone-marine-anchor',
      wind: primaryWindGrid ? 'dmi-atmospheric-grid' : marineWindGrid ? 'dmi-marine-wind-grid' : 'zone-marine-anchor',
      wave: waveGrid ? 'dmi-wave-grid' : 'zone-marine-anchor'
    }
  };
}
