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
  { step: generatedAt, 'wind-speed-10m': 5, 'wind-dir-10m': 180 },
  { step: new Date(Date.parse(generatedAt) + 3 * 3600000).toISOString(), 'wind-speed-10m': 8, 'wind-dir-10m': 210 }
];
const sparse = buildDmiForecastHourly({ wind: sparseWind, generatedAt, hours: 8 });
assert.equal(new Set(sparse.hourly.map(item => item.time)).size, 8, 'Alle forecast-timer skal have unikke måltidspunkter');
assert.equal(sparse.hourly[0].windSpeedMps, 5);
assert.equal(sparse.hourly[1].windSpeedMps, 5, 'Nærmeste værdi inden for 90 minutter må bruges');
assert.equal(sparse.hourly[2].windSpeedMps, 8, 'Nærmeste værdi inden for 90 minutter må bruges');
assert.equal(sparse.hourly[5].windSpeedMps, null, 'Sidste modeltrin må ikke gentages uden for tolerancen');

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
