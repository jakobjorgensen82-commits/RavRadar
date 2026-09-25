import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWeatherComponentNeeds, openMeteoGapPairsFromWeatherNeeds } from './lib/weather-component-needs.mjs';

const reference = '2026-09-19T00:00:00.000Z';
const at = offset => new Date(Date.parse(reference) + offset * 3_600_000).toISOString();
const parts = [{ partId: 'P1', zoneId: 'Z1', waterPoint: [10, 56] }];
const validRows = () => Array.from({ length: 121 }, (_, i) => ({ time: at(i),
  windSpeedMps: 5, windDirectionDeg: 90, waveHeightM: 1, wavePeriodS: 6, waveDirectionDeg: 180,
  waterLevelCm: 10, waterLevelTrendCm3h: i < 118 ? 0 : null, waterTemperatureC: 15,
  ...Object.fromEntries(['wind', 'wave', 'waterLevel', 'waterTemperature'].map(component => [
    `${component}Provenance`, { status: 'verified', provider: 'dmi', modelRun: at(-6) },
  ])),
}));
const plan = rows => buildWeatherComponentNeeds({ parts, productionReferenceAt: reference, readVerifiedHourly: () => rows });

test('fully admitted components do not trigger fallback merely because its bank is empty', () => {
  const result = plan(validRows());
  assert.equal(result.needs.length, 0);
  assert.equal(result.privateSupportNeeds.length, 0);
  assert.equal(openMeteoGapPairsFromWeatherNeeds(result).length, 0);
  for (const stats of Object.values(result.summary)) {
    assert.equal(stats.required, 118);
    assert.equal(stats.valid, 118);
    assert.equal(stats.missing, 0);
  }
});

test('planner separates actual gaps, retained aged DMI and future DMI upgrade work', () => {
  const rows = validRows();
  rows[0].windDirectionDeg = null;
  rows[1].waveProvenance.modelRun = at(-96);
  rows[2].waveProvenance.modelRun = at(-95);
  rows[3].waterTemperatureProvenance = { status: 'verified', provider: 'open-meteo', modelRun: null };
  const result = plan(rows);
  assert.deepEqual(result.needs, [
    { partId: 'P1', component: 'wind', validTime: at(0), purpose: 'GAP', gapReason: 'VALUE_GAP' },
    { partId: 'P1', component: 'wave', validTime: at(1), purpose: 'AGED_DMI_CHALLENGE', protectedModelRun: at(-96) },
  ]);
  assert.deepEqual(result.dmiUpgradeNeeds, [{ partId: 'P1', component: 'waterTemperature', validTime: at(3) }]);
  assert.deepEqual(result.copernicusUpgradeNeeds, [{ partId: 'P1', component: 'waterTemperature',
    validTime: at(3), purpose: 'OPEN_METEO_UPGRADE' }]);
  assert.deepEqual(openMeteoGapPairsFromWeatherNeeds(result), [{ partId: 'P1', component: 'wind', validTime: at(0) }]);
  assert.equal(result.summary.wave.valid, 118, 'aged DMI remains valid while being challenged');
  assert.equal(result.summary.wave.missing, 0);
});

test('Copernicus upgrade work targets only admitted Open-Meteo wave and temperature', () => {
  const rows = validRows();
  rows[0].waveProvenance.provider = 'open-meteo';
  rows[1].waterTemperatureProvenance.provider = 'open-meteo';
  rows[2].windProvenance.provider = 'open-meteo';
  rows[3].waterLevelProvenance.provider = 'open-meteo';
  const result = plan(rows);
  assert.deepEqual(result.copernicusUpgradeNeeds, [
    { partId: 'P1', component: 'wave', validTime: at(0), purpose: 'OPEN_METEO_UPGRADE' },
    { partId: 'P1', component: 'waterTemperature', validTime: at(1), purpose: 'OPEN_METEO_UPGRADE' },
  ]);
  assert.equal(result.needs.some(row => row.component === 'wave' || row.component === 'waterTemperature'), false);
  assert.equal(result.needs.some(row => row.component === 'waterLevel'), true,
    'reserve-labelled water level remains a DMI-only gap');
  assert.equal(result.copernicusUpgradeNeeds.some(row => row.component === 'wind'), false,
    'do not invent a Copernicus wind product');
  assert.deepEqual(openMeteoGapPairsFromWeatherNeeds(result), []);
});

test('last three public water trends schedule exact private support through H120', () => {
  const rows = validRows();
  for (const i of [115, 116, 117]) rows[i].waterLevelTrendCm3h = null;
  const result = plan(rows);
  assert.deepEqual(result.needs.map(row => [row.validTime, row.gapReason]), [
    [at(115), 'TREND_GAP'], [at(116), 'TREND_GAP'], [at(117), 'TREND_GAP'],
  ]);
  assert.deepEqual(result.privateSupportNeeds.map(row => row.validTime), [at(118), at(119), at(120)]);
  assert.deepEqual(openMeteoGapPairsFromWeatherNeeds(result), []);
  assert.deepEqual(result.dmiOnlyNeeds, result.needs);
  assert.equal(result.summary.waterLevel.valid, 118);
  assert.equal(result.summary.waterLevel.missing, 0);
  assert.equal(result.summary.waterLevel.trendMissing, 3);
});

test('reserve-labelled water level is a DMI-only gap and aged DMI level is never challenged', () => {
  const rows = validRows();
  rows[0].waterLevelProvenance.provider = 'open-meteo';
  rows[1].waterLevelProvenance.modelRun = at(-96);
  const result = plan(rows);
  assert.equal(result.summary.waterLevel.missing, 1);
  assert.equal(result.summary.waterLevel.reserve, 0);
  assert.equal(result.summary.waterLevel.agedDmiChallenges, 0);
  assert.equal(result.needs.length, 1);
  assert.equal(result.dmiOnlyNeeds[0].validTime, at(0));
  assert.deepEqual(openMeteoGapPairsFromWeatherNeeds(result), []);
});

test('untested raw values, duplicate hours and ambiguous PART inventory are not complete data', () => {
  const rows = validRows();
  rows[0].windProvenance.status = 'unverified';
  assert.equal(plan(rows).summary.wind.missing, 1);
  assert.throws(() => plan([...rows, rows[0]]), /DUPLICATE_HOUR/);
  assert.throws(() => buildWeatherComponentNeeds({ parts: [...parts, parts[0]], productionReferenceAt: reference,
    readVerifiedHourly: validRows }), /PART_DOMAIN/);
});
