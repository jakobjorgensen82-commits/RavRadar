import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPublicWeatherSourceAge } from '../js/core/ravscore-public-weather-source-age.js';

const reference = '2026-09-19T00:00:00.000Z';
const modelRun = '2026-09-18T00:00:00Z';
const hash = `sha256:${'a'.repeat(64)}`;
const cp = { status: 'verified', provider: 'copernicus', modelRun, subsetSha256: hash,
  modelReference: { kind: 'subset-forecast-reference-time', payloadSha256: hash,
    modelRun, validTime: '2026-09-19T00:00:00Z' } };
function build(source) {
  return buildPublicWeatherSourceAge({ productionReferenceAt: reference,
    partSourceRows: Array.from({ length: 673 }, (_, i) => ({ partId: `P${i}`,
      selectedReferenceAt: reference, waveProvenance: source })) });
}

test('public age includes proved CP model reference, not acquisition time', () => {
  const result = build({ ...cp, acquiredAt: reference });
  assert.equal(result.knownCount, 673);
  assert.equal(result.unknownComparableAgeCount, 2019);
  assert.equal(result.oldestKnownSourceReferenceAt, '2026-09-18T00:00:00.000Z');
});

test('unbound, wrong-time and future reserve references stay unknown', () => {
  for (const source of [
    { status: 'verified', provider: 'open-meteo', model: 'ecmwf_ifs025', acquiredAt: reference },
    { ...cp, modelReference: null },
    { ...cp, subsetSha256: `sha256:${'b'.repeat(64)}` },
    { ...cp, modelReference: { ...cp.modelReference, validTime: modelRun } },
    { ...cp, modelRun: '2026-09-20T00:00:00Z',
      modelReference: { ...cp.modelReference, modelRun: '2026-09-20T00:00:00Z' } },
  ]) assert.equal(build(source).knownCount, 0);
});
