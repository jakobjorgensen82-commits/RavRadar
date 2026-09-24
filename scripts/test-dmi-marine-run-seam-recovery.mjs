import assert from 'node:assert/strict';
import { buildDmiForecastHourly, verifiedDmiForecastSource } from './lib/dmi-forecast-store.mjs';
import { recoverDmiMarineRunSeamHours } from './lib/dmi-marine-run-seam-recovery.mjs';

const generatedAt = '2026-09-25T06:00:00.000Z';
const at = hour => new Date(Date.parse(generatedAt) + hour * 3_600_000).toISOString();
const identity = {
  entityId: 'PART::TEST', parentZoneId: 'ZONE-TEST', entityType: 'coastal-part',
  samplingContext: 'coastal-part-water-point', samplingPoint: [10, 56],
};
const fieldSet = {
  current: ['current-u', 'current-v'],
  waterLevel: ['sea-mean-deviation'],
  waterTemperature: ['water-temperature'],
};
const componentKind = {
  current: 'ocean-current-vector', waterLevel: 'marine-water-level-scalar',
  waterTemperature: 'marine-water-temperature-scalar',
};
function source(component, hour, runHour, overrides = {}) {
  return {
    provider: 'dmi', fallback: false, collection: 'dkss_lf', collectionFamily: 'marine',
    component, componentKind: componentKind[component], fieldSet: fieldSet[component],
    optionalFieldSet: [], modelRun: at(runHour), nativeValidTime: at(hour),
    leadTimeHours: hour - runHour, ...identity,
    gridPoint: [10.02, 56.01], gridDefinitionSha256: 'a'.repeat(64), distanceKm: 1.67,
    spatialSelection: component === 'current'
      ? 'nearest-shared-grid-cell-no-spatial-interpolation'
      : 'nearest-valid-grid-cell-no-spatial-interpolation',
    spatialSemanticsVersion: 1,
    itemId: `item-${component}-${hour}`, assetIdentitySha256: 'b'.repeat(64),
    acquiredAt: generatedAt,
    ...(component === 'current' ? {
      verticalLayer: 'depthbelowsea:7', verticalLayerRankM: 7,
      vectorSelection: 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer',
      vectorSemanticsVersion: 3,
    } : {}),
    ...overrides,
  };
}
function native(hour, runHour, level, u, v, temperature, currentOverrides = {}) {
  return {
    step: at(hour), 'sea-mean-deviation': level,
    'current-u': u, 'current-v': v, 'water-temperature': temperature,
    provenance: {
      current: source('current', hour, runHour, currentOverrides),
      waterLevel: source('waterLevel', hour, runHour),
      waterTemperature: source('waterTemperature', hour, runHour),
    },
  };
}
const old = native(0, -6, 0.06, 0.04, 0.01, 13.8);
const newer = native(3, -3, -0.01, 0.02, 0.03, 13.2);
const build = ocean => buildDmiForecastHourly({
  ocean, generatedAt, hours: 5, sourceCadenceMinutes: 180,
}).hourly;
const base = build([old, newer]);
assert.equal(base[1].currentUMps, null);
assert.equal(base[1].waterLevelCm, null);
assert.equal(base[1].waterTemperatureC, null);
const repair = ocean => recoverDmiMarineRunSeamHours({
  hourly: build(ocean), ocean, generatedAt, expectedIdentity: identity,
  sourceCadenceMinutes: 180,
});
const recovered = repair([old, newer]);
assert.equal(recovered[1].currentUMps, 0.04);
assert.equal(recovered[1].waterLevelCm, 6);
assert.equal(recovered[1].waterTemperatureC, 13.8);
assert.equal(recovered[1].sources.current.modelRun, at(-6));
assert.deepEqual(recovered[1].sources.current.nativeValidTimes, [at(0)]);
assert.equal(recovered[2].currentUMps, 0.02);
assert.equal(recovered[2].waterLevelCm, -1);
assert.equal(recovered[2].waterTemperatureC, 13.2);
assert.equal(recovered[2].sources.current.modelRun, at(-3));
assert.equal(recovered[3].sources.current.temporalResolution, 'native');
for (const component of ['current', 'waterLevel', 'waterTemperature']) {
  for (const hour of [1, 2]) {
    assert.ok(verifiedDmiForecastSource(
      recovered[hour].sources[component], component, at(hour), identity,
    ), `${component} must retain native proof at seam hour ${hour}`);
  }
}
assert.deepEqual(repair([newer, old]), recovered);
assert.equal(base[1].currentUMps, null, 'recovery must not mutate its input');
assert.deepEqual(recovered[0], base[0], 'an already valid native hour is untouched');

const differentLayer = native(3, -3, -0.01, 0.02, 0.03, 13.2,
  { verticalLayer: 'depthbelowsea:1', verticalLayerRankM: 1 });
assert.equal(repair([old, differentLayer])[1].currentUMps, null,
  'a depth-layer change is not a model-run-only seam');
const distant = native(4, -3, -0.01, 0.02, 0.03, 13.2);
const distantRecovered = repair([old, distant]);
assert.equal(distantRecovered[2].currentUMps, null);
assert.equal(distantRecovered[2].waterLevelCm, null,
  'the existing 95-minute edge limit must not be extended');
console.log('DMI marine run-seam weather-producer recovery passes.');
