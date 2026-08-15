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

function validFallback(value) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const longitude = coordinate(value[0]);
  const latitude = coordinate(value[1]);
  return longitude === null || latitude === null ? null : [longitude, latitude];
}

export function flowPointsFromForecastRecord(record, fallbackPoint) {
  const fallback = validFallback(fallbackPoint);
  const grid = record?.model?.completeness?.gridPoints ?? {};
  const currentGrid = exactGridPair(grid, 'current-u', 'current-v');
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
