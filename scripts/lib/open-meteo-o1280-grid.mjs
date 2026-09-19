// Reproduce Open-Meteo's *response-coordinate contract*, not a new geographic
// quality radius or wet-cell search. The upstream GaussianGrid implementation
// uses analytic latitude spacing and Float32 arithmetic; using ideal ECMWF
// Gaussian latitude tables instead would NOT match this API's own coordinates.
// Source: https://github.com/open-meteo/open-meteo/blob/e669e6293ce2f0c70646fd61af8fe0c529fc0c53/Sources/App/Domains/GaussianGrid.swift
// Methods: GridType.nxOf/integral/getPos, findPointXY, getCoordinates.
export const OPEN_METEO_O1280_SOURCE_REVISION = 'e669e6293ce2f0c70646fd61af8fe0c529fc0c53';
const f = Math.fround;
const LINES = 1280;
const ROWS = 2 * LINES;
const COUNT = 4 * LINES * (LINES + 9);
const DY = f(f(180) / f(f(2 * f(LINES)) + f(0.5)));
const halfDy = f(DY / 2);
const validPoint = point => Array.isArray(point) && point.length === 2
  && point.every(value => typeof value === 'number' && Number.isFinite(value))
  && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
const width = row => 20 + 4 * (row < LINES ? row : ROWS - row - 1);
const prefix = row => row < LINES ? 2 * row * row + 18 * row
  : COUNT - (2 * (ROWS - row) ** 2 + 18 * (ROWS - row));
// Swift round(Float) uses halfway-away-from-zero; Math.round does not.
const roundAway = value => value < 0 ? -Math.round(-value) : Math.round(value);
const rowLatitude = row => f(f(f(LINES - row - 1) * DY) + halfDy);
const distanceSquared = (lat, lon, actualLat, actualLon) => {
  const deltaLat = f(actualLat - lat), deltaLon = f(actualLon - lon);
  return f(f(deltaLat ** 2) + f(deltaLon ** 2));
};

function upstreamCoordinates(index) {
  const halfIndex = index < COUNT / 2 ? index : COUNT - index - 1;
  const halfRow = Math.trunc(f(f(f(Math.sqrt(f(f(2 * f(halfIndex)) + 81))) - 9) / 2));
  const row = index < COUNT / 2 ? halfRow : ROWS - 1 - halfRow;
  if (row < 0 || row >= ROWS) return null;
  const x = index - prefix(row), dx = f(360 / f(width(row)));
  const lon = f(f(x) * dx);
  return [lon >= 180 ? f(lon - 360) : lon, rowLatitude(row)];
}

/** Exact upstream native-nearest center; never tries another sea/land cell. */
export function openMeteoO1280NearestGridPoint(samplingPoint) {
  if (!validPoint(samplingPoint)) return null;
  const [lon, lat] = samplingPoint.map(f);
  const upperEstimate = Math.trunc(f(f(f(LINES) - 1) - f(f(lat - halfDy) / DY)));
  const row = Math.max(0, Math.min(ROWS - 2, upperEstimate));
  const candidates = [row, row + 1].map(y => {
    const nx = width(y), dx = f(360 / f(nx));
    const x = roundAway(f(lon / dx));
    return { index: prefix(y) + ((x + nx) % nx),
      squared: distanceSquared(lat, lon, rowLatitude(y), f(f(x) * dx)) };
  });
  // Upstream deliberately chooses the second row on an exact distance tie.
  return upstreamCoordinates(candidates[candidates[0].squared < candidates[1].squared ? 0 : 1].index);
}

export function openMeteoO1280GridMatches(samplingPoint, returnedPoint) {
  const expected = openMeteoO1280NearestGridPoint(samplingPoint);
  // API JSON serialises modelLat/modelLon as Float's round-trip decimal form.
  return expected !== null && validPoint(returnedPoint)
    && returnedPoint.every((value, index) => f(value) === expected[index]);
}
