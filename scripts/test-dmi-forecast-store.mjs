import assert from 'node:assert/strict';
import {
  DMI_FORECAST_HOURS,
  buildDmiForecastHourly,
  createDmiForecastRecord,
  dmiForecastCoverage,
  interpolateWaterLevelStations,
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
assert.equal(built.waterLevelBiasCm, 15);
assert.equal(built.hourly[0].waterLevelCm, 25, 'observeret stationstilpasning skal korrigere modelniveauet');
assert.equal(built.hourly[0].waterLevelSource, 'dmi-model-observation-corrected');
assert.equal(built.hourly.at(-1).source, 'dmi-forecast');

const record = createDmiForecastRecord({ zoneId: 'test-zone', point: [10, 56], generatedAt, hourly: built.hourly });
assert.equal(record.horizonHours, 120);
assert.ok(Date.parse(record.validUntil) - Date.parse(record.validFrom) >= 119 * 3600000);
assert.equal(selectDmiForecastAt(record, '2026-07-26T12:00:00.000Z').waterLevelCm, 30);
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
const interpolation = interpolateWaterLevelStations([1, 0], stations, levels, { haversineKm: (a, b) => Math.abs(a[0] - b[0]), maxStations: 3 });
assert.equal(interpolation.method, 'inverse-distance-3-stations');
assert.ok(interpolation.valueCm > 10 && interpolation.valueCm < 30);
assert.equal(interpolation.stations.length, 3);
assert.ok(Math.abs(interpolation.stations.reduce((sum, station) => sum + station.weight, 0) - 1) < 0.01);

console.log('DMI 120-timers Forecast Store og Water Level Engine bestået.');
