import assert from 'node:assert/strict';
import test from 'node:test';
import { openMeteoO1280NearestGridPoint as nearest, openMeteoO1280GridMatches as matches } from './lib/open-meteo-o1280-grid.mjs';

// Independent exhaustive latitude-bracket search uses the pinned Float32
// response-coordinate arithmetic, but not the implementation's two-row lookup,
// prefix inversion or selected-index -> coordinates code path.
function allRowsReference([longitude, latitude]) {
  const f = Math.fround, lon = f(longitude), lat = f(latitude);
  const dy = f(180 / f(2560.5)), half = f(dy / 2);
  const latitudes = Array.from({ length: 2560 }, (_, row) => f(f((1279 - row) * dy) + half));
  const below = latitudes.findIndex(value => value <= lat);
  const first = below < 0 ? 2558 : Math.max(0, Math.min(2558, below - 1));
  let result = null;
  for (let row = first; row <= first + 1; row += 1) {
    const n = 20 + 4 * Math.min(row, 2559 - row);
    const dx = f(360 / n), ratio = f(lon / dx);
    const x = ratio < 0 ? -Math.round(-ratio) : Math.round(ratio);
    const actualLat = f(f((1279 - row) * dy) + half);
    const actualLon = f(x * dx);
    const distance = f(f(f(actualLat - lat) ** 2) + f(f(actualLon - lon) ** 2));
    if (!result || distance <= result.distance) {
      const wrappedX = (x + n) % n;
      const wrappedLon = f(wrappedX * dx);
      result = { distance, point: [wrappedLon >= 180 ? f(wrappedLon - 360) : wrappedLon, actualLat] };
    }
  }
  return result.point;
}

test('native nearest matches independent latitude-bracket evaluation across Danish and global points', () => {
  const points = [[10, 56], [8.1, 57.2], [12.6, 55.7], [14.9, 55.1], [0, 0], [-1, 56], [180, 0], [-180, 0],
    [179.99, 89.99], [-179.99, -89.99], [0, 90], [0, -90], [73.23, -35.12], [-60.5, 62.01]];
  // Deterministic sample: no real central/private coordinates are used.
  for (let i = 0; i < 300; i += 1) points.push([-180 + ((i * 97.31) % 360), -89 + ((i * 31.17) % 178)]);
  for (const point of points) assert.deepEqual(nearest(point), allRowsReference(point), JSON.stringify(point));
});

test('exact Float32 response coordinate is required, not merely proximity or 0.25 grid', () => {
  const point = [10.03, 56.02], native = nearest(point);
  assert.ok(matches(point, native));
  assert.ok(matches(point, native.map(value => Number(value.toPrecision(9)))));
  assert.equal(matches(point, [native[0] + 0.0001, native[1]]), false);
  assert.equal(matches(point, [10, 56]), false);
  assert.equal(matches(point, nearest([10.3, 56.02])), false, 'another sea cell is not nearest proof');
});

test('invalid values do not coerce into a grid location', () => {
  for (const point of [null, [], [10], [10, 56, 0], ['10', 56], [false, 56], [NaN, 56], [Infinity, 0], [181, 0], [0, 91]]) {
    assert.equal(nearest(point), null);
    assert.equal(matches([10, 56], point), false);
  }
});

test('dateline and hemispheres remain on the upstream coordinate domain', () => {
  assert.deepEqual(nearest([180, 56]), nearest([-180, 56]));
  for (const point of [[0, 0], [0, 90], [0, -90], [-180, -56]]) {
    const output = nearest(point);
    assert.ok(output[0] >= -180 && output[0] < 180 && Math.abs(output[1]) <= 90);
    assert.ok(matches(point, output));
  }
});
