import assert from 'node:assert/strict';
import {
  DMI_FORECAST_HOURS,
  buildDmiForecastHourly,
  createDmiForecastRecord,
  dmiForecastCoverage,
  interpolateWaterLevelStations,
  normalizeForecastHourly,
  selectDmiForecastAt
} from './lib/dmi-forecast-store.mjs';

const generatedAt = '2026-07-24T12:00:00.000Z';
const native = (component, collection, step, modelRun = generatedAt, overrides = {}) => ({
  [component]: {
    provider: 'dmi', collection, modelRun, nativeValidTime: step,
    ...(component === 'current' ? {
      gridPoint: [10.02, 56.01], samplingPoint: [10, 56],
      verticalLayer: 'depthbelowsea:7', verticalLayerRankM: 7, distanceKm: 1.7,
      vectorSelection: 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer', vectorSemanticsVersion: 3
    } : {}),
    ...overrides
  }
});
const series = (parameter, mapper) => Array.from({ length: 130 }, (_, i) => ({
  step: new Date(Date.parse(generatedAt) + i * 3600000).toISOString(),
  [parameter]: mapper(i)
}));
const wind = Array.from({ length: 130 }, (_, i) => ({ step: new Date(Date.parse(generatedAt) + i * 3600000).toISOString(), 'wind-speed-10m': 8 + i / 100, 'wind-dir-10m': 270 }));
const waves = Array.from({ length: 130 }, (_, i) => ({ step: new Date(Date.parse(generatedAt) + i * 3600000).toISOString(), 'significant-wave-height': 1.2, 'mean-wave-dir': 280, 'dominant-wave-period': 6 }));
const ocean = Array.from({ length: 130 }, (_, i) => ({ step: new Date(Date.parse(generatedAt) + i * 3600000).toISOString(), 'sea-mean-deviation': 0.10 + i * 0.001, 'current-u': 0.1, 'current-v': 0.2, 'water-temperature': 15 }));

const built = buildDmiForecastHourly({ wind, waves, ocean, observedWaterLevel: { valueCm: 25 }, generatedAt });
assert.equal(built.hourly.length, DMI_FORECAST_HOURS);
assert.equal(built.waterLevelBiasCm, 0);
assert.equal(built.observationDifferenceCm, 15);
assert.equal(built.hourly[0].waterLevelCm, 10, 'DMI-modelvandstanden skal forblive autoritativ');
assert.equal(built.hourly[0].waterLevelSource, 'dmi-model-authoritative');
assert.equal(built.hourly.at(-1).source, 'dmi-forecast');


const sparseWind = [
  { step: generatedAt, 'wind-speed-10m': 5, 'wind-dir-10m': 180, provenance: native('wind', 'harmonie_dini_sf', generatedAt) },
  { step: new Date(Date.parse(generatedAt) + 3 * 3600000).toISOString(), 'wind-speed-10m': 8, 'wind-dir-10m': 210, provenance: native('wind', 'harmonie_dini_sf', new Date(Date.parse(generatedAt) + 3 * 3600000).toISOString()) }
];
const sparse = buildDmiForecastHourly({ wind: sparseWind, generatedAt, hours: 8 });
assert.equal(new Set(sparse.hourly.map(item => item.time)).size, 8, 'Alle forecast-timer skal have unikke måltidspunkter');
assert.equal(sparse.hourly[0].windSpeedMps, 5);
assert.ok(Math.abs(sparse.hourly[1].windSpeedMps - 5.8) < 0.01, 'Vind skal vektorinterpoleres mellem modeltrin');
assert.ok(Math.abs(sparse.hourly[2].windSpeedMps - 6.8) < 0.01, 'Vind skal vektorinterpoleres mellem modeltrin');
assert.equal(sparse.hourly[5].windSpeedMps, null, 'Sidste modeltrin må ikke gentages uden for tolerancen');

const windTail = [
  { step: new Date(Date.parse(generatedAt) + 3 * 3600000).toISOString(), 'wind-speed-10m': 20, 'wind-dir-10m': 90, provenance: native('wind', 'dkss', new Date(Date.parse(generatedAt) + 3 * 3600000).toISOString()) },
  { step: new Date(Date.parse(generatedAt) + 6 * 3600000).toISOString(), 'wind-speed-10m': 23, 'wind-dir-10m': 90, provenance: native('wind', 'dkss', new Date(Date.parse(generatedAt) + 6 * 3600000).toISOString()) }
];
const chainedWind = buildDmiForecastHourly({ wind: sparseWind, windTail, generatedAt, hours: 7 });
assert.equal(chainedWind.hourly[3].sources.wind.collection, 'harmonie_dini_sf', 'HARMONIE skal vinde ved overlap');
assert.equal(chainedWind.hourly[3].windSpeedMps, 8, 'DKSS maa ikke overskrive HARMONIE ved samme tidspunkt');
assert.equal(chainedWind.hourly[5].sources.wind.collection, 'dkss', 'DKSS skal overtage efter HARMONIE-horisonten');
assert.equal(chainedWind.hourly[5].sources.wind.modelRun, generatedAt);
assert.equal(chainedWind.hourly[5].sources.wind.leadTimeHours, 5);
assert.equal(chainedWind.hourly[5].sources.wind.forecastAgeHours, 0);
assert.equal(chainedWind.hourly[5].sources.wind.temporalResolution, 'interpolated');
assert.deepEqual(chainedWind.hourly[5].sources.wind.nativeValidTimes, [windTail[0].step, windTail[1].step]);
assert.ok(chainedWind.hourly[5].windSpeedMps > 20 && chainedWind.hourly[5].windSpeedMps < 23, 'DKSS-halen skal kun interpoleres inden for DKSS-serien');
assert.equal(chainedWind.interpolation.modelBoundaryInterpolation, false);

const normalized = normalizeForecastHourly([
  { time: generatedAt, windSpeedMps: 4 },
  { time: generatedAt, waveHeightM: 0.5 },
  { time: new Date(Date.parse(generatedAt) + 3600000).toISOString(), windSpeedMps: 5 }
]);
assert.equal(normalized.length, 2, 'Dublerede tidsstempler skal samles');
assert.equal(normalized[0].windSpeedMps, 4);
assert.equal(normalized[0].waveHeightM, 0.5);

const record = createDmiForecastRecord({ zoneId: 'test-zone', point: [10, 56], generatedAt, hourly: built.hourly });
assert.equal(record.horizonHours, 120);
assert.ok(Date.parse(record.validUntil) - Date.parse(record.validFrom) >= 119 * 3600000);
assert.equal(selectDmiForecastAt(record, '2026-07-26T12:00:00.000Z').waterLevelCm, 15);
assert.equal(selectDmiForecastAt(record, '2026-07-30T12:00:00.000Z'), null, 'udløbet DMI-cache må ikke bruges');
assert.equal(dmiForecastCoverage(record, generatedAt).totalHours, 120);

const stations = [
  { stationId: 'A', name: 'A', point: [0, 0] },
  { stationId: 'B', name: 'B', point: [2, 0] },
  { stationId: 'C', name: 'C', point: [4, 0] }
];
const levels = new Map([
  ['A', { valueCm: 10, observed: generatedAt }],
  ['B', { valueCm: 30, observed: generatedAt }],
  ['C', { valueCm: 50, observed: generatedAt }]
]);
const interpolation = interpolateWaterLevelStations([1, 0], stations, levels, { haversineKm: (a, b) => Math.abs(a[0] - b[0]), maxStations: 2 });
assert.equal(interpolation.method, 'inverse-distance-2-stations');
assert.ok(interpolation.valueCm > 10 && interpolation.valueCm < 30);
assert.equal(interpolation.stations.length, 2);
assert.equal(interpolation.stations[0].valueCm, 10, 'Diagnosen skal indeholde stationens rå DMI-værdi');
assert.ok(Object.hasOwn(interpolation.stations[0], 'observationAgeMinutes'), 'Diagnosen skal indeholde observationsalder');
assert.ok(Math.abs(interpolation.stations.reduce((sum, station) => sum + station.weight, 0) - 1) < 0.01);

console.log('DMI 120-timers Forecast Store og Water Level Engine bestået.');

// 4.0.13 regression: STAC bulk forecasts are intentionally sampled every
// three hours. A current timestamp can therefore be slightly more than 90
// minutes from the nearest model step because workflow execution adds seconds
// and minutes. The record cadence must control the default selection tolerance.
{
  const record = createDmiForecastRecord({
    zoneId: 'cadence-test',
    point: [10, 56],
    generatedAt: '2026-07-28T12:00:00.000Z',
    hourly: [
      { time: '2026-07-28T12:00:00.000Z', currentSpeedMps: 0.2 },
      { time: '2026-07-28T18:00:00.000Z', currentSpeedMps: 0.3 }
    ],
    model: { completeness: { forecastCadenceMinutes: 180 } }
  });
  const selected = selectDmiForecastAt(record, '2026-07-28T15:00:30.000Z');
  assert.equal(selected?.time, '2026-07-28T18:00:00.000Z');
  assert.equal(selectDmiForecastAt(record, '2026-07-28T15:00:30.000Z', { toleranceMinutes: 90 }), null);
}

// 4.0.14 regression: interpolate native current components, not direction angles.
{
  const sparseOcean = [
    { step: generatedAt, 'sea-mean-deviation': 0.0, 'current-u': 0.2, 'current-v': 0.0, 'water-temperature': 10, provenance: { ...native('current', 'dkss_idw', generatedAt), ...native('waterLevel', 'dkss_idw', generatedAt), ...native('waterTemperature', 'dkss_idw', generatedAt) } },
    { step: new Date(Date.parse(generatedAt) + 3 * 3600000).toISOString(), 'sea-mean-deviation': 0.3, 'current-u': 0.0, 'current-v': 0.2, 'water-temperature': 13, provenance: { ...native('current', 'dkss_idw', new Date(Date.parse(generatedAt) + 3 * 3600000).toISOString()), ...native('waterLevel', 'dkss_idw', new Date(Date.parse(generatedAt) + 3 * 3600000).toISOString()), ...native('waterTemperature', 'dkss_idw', new Date(Date.parse(generatedAt) + 3 * 3600000).toISOString()) } }
  ];
  const interpolated = buildDmiForecastHourly({ ocean: sparseOcean, generatedAt, hours: 4, sourceCadenceMinutes: 180 });
  assert.equal(interpolated.hourly[1].waterLevelCm, 10);
  assert.equal(interpolated.hourly[2].waterLevelCm, 20);
  assert.ok(interpolated.hourly[1].currentDirectionDeg > 45 && interpolated.hourly[1].currentDirectionDeg < 90);
  assert.equal(interpolated.hourly[1].temporalResolution, 'interpolated');
  assert.equal(interpolated.hourly[3].temporalResolution, 'exact');
  assert.equal(interpolated.hourly[1].sources.current.collection, 'dkss_idw');
  assert.equal(interpolated.hourly[1].sources.waterLevel.temporalResolution, 'interpolated');
}

// Cachede native trin fra forskellige modelkørsler må ikke sammensys ved interpolation.
{
  const laterRun = '2026-07-24T15:00:00.000Z';
  const mixedRuns = [
    { step: generatedAt, 'wind-speed-10m': 5, 'wind-dir-10m': 180, provenance: native('wind', 'harmonie_dini_sf', generatedAt, generatedAt) },
    { step: laterRun, 'wind-speed-10m': 8, 'wind-dir-10m': 210, provenance: native('wind', 'harmonie_dini_sf', laterRun, laterRun) }
  ];
  const guarded = buildDmiForecastHourly({ wind: mixedRuns, generatedAt, hours: 4 });
  assert.equal(guarded.hourly[1].windSpeedMps, null);
  assert.equal(guarded.hourly[2].windSpeedMps, null);
  assert.equal(guarded.hourly[0].sources.wind.modelRun, generatedAt);
  assert.equal(guarded.hourly[3].sources.wind.modelRun, laterRun);

  const mixedIdentity = [mixedRuns[0], { step: laterRun, 'wind-speed-10m': 8, 'wind-dir-10m': 210 }];
  const identityGuarded = buildDmiForecastHourly({ wind: mixedIdentity, generatedAt, hours: 4 });
  assert.equal(identityGuarded.hourly[1].windSpeedMps, null, 'nyt identificeret trin må ikke interpoleres med gammel uidentificeret cache');
}

// 4.0.229 regression: DMI's dybeste gyldige lag kan variere mellem native
// tidstrin. De eksakte trin skal bevares, men timerne imellem maa aldrig blande
// to dybder eller to vandkolonner til en kunstig stroemvektor.
{
  const later = new Date(Date.parse(generatedAt) + 3 * 3600000).toISOString();
  const layerTransition = [
    { step: generatedAt, 'current-u': 0.20, 'current-v': 0.05, provenance: native('current', 'dkss_idw', generatedAt, generatedAt, { verticalLayer: 'depthbelowsea:9', verticalLayerRankM: 9 }) },
    { step: later, 'current-u': 0.05, 'current-v': 0.20, provenance: native('current', 'dkss_idw', later, generatedAt, { verticalLayer: 'surface:0', verticalLayerRankM: 0 }) }
  ];
  const guarded = buildDmiForecastHourly({ ocean: layerTransition, generatedAt, hours: 4, sourceCadenceMinutes: 180 });
  assert.equal(guarded.hourly[0].currentUMps, 0.2);
  assert.equal(guarded.hourly[0].sources.current.verticalLayer, 'depthbelowsea:9');
  assert.equal(guarded.hourly[1].currentUMps, null, 'der maa ikke interpoleres paa tvaers af dybdelag');
  assert.equal(guarded.hourly[2].currentVMps, null, 'lagovergangen skal vaere et aerligt datagab');
  assert.equal(guarded.hourly[3].currentVMps, 0.2);
  assert.equal(guarded.hourly[3].sources.current.verticalLayer, 'surface:0');
}
