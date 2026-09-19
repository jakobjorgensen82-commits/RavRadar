import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('./update-weather.mjs', import.meta.url), 'utf8');
const start = source.indexOf('function retainOnlyDmiWaterLevel(');
const end = source.indexOf('\nfunction haversineKm(', start);
assert.ok(start >= 0 && end > start);
const context = vm.createContext({});
vm.runInContext(`${source.slice(start, end)}\nglobalThis.clean = retainOnlyDmiZoneWaterLevel;`, context);
const at = '2026-09-19T00:00:00.000Z';

test('cached reserve current, forecast and history levels cannot return to public fields', () => {
  for (const provider of ['open-meteo', 'copernicus']) {
    const row = { time: at, at, windSpeedMps: 8, waveHeightM: 1, waterTemperatureC: 15,
      waterLevelCm: 50, waterLevelTrendCm3h: 9, waterLevelFallbackOffsetCm: 20,
      sources: { waterLevel: { provider } }, waterLevelProvenance: { provider: 'dmi', status: 'verified' } };
    const zone = context.clean({ provider: 'dmi-cache', current: row,
      waterLevel: { source: provider, modelBiasCm: 20 },
      forecast: { provider: 'mixed', hourly: [row] }, samples24h: [row], samples72h: [row] });
    for (const cleaned of [zone.current, zone.forecast.hourly[0], zone.samples24h[0], zone.samples72h[0]]) {
      assert.equal(cleaned.waterLevelCm, null);
      assert.equal(cleaned.waterLevelTrendCm3h, null);
      assert.equal(cleaned.waterLevelFallbackOffsetCm, undefined);
      assert.equal(cleaned.waveHeightM, 1);
      assert.equal(cleaned.windSpeedMps, 8);
      assert.equal(cleaned.waterTemperatureC, 15);
    }
    assert.equal(zone.waterLevel.modelBiasCm, null);
    assert.equal(zone.sources.waterLevel.provider, 'missing');
  }
});

test('existing DMI current/forecast and exact matching DMI history survive unchanged', () => {
  const row = { time: at, waterLevelCm: 12, waterLevelTrendCm3h: 3,
    sources: { waterLevel: { provider: 'dmi' } } };
  const sample = { at, waterLevelCm: 12, waterLevelTrendCm3h: 3, windSpeedMps: 7 };
  const zone = context.clean({ provider: 'mixed', current: row,
    forecast: { provider: 'mixed', hourly: [row] }, samples72h: [sample] });
  assert.equal(zone.current, row);
  assert.equal(zone.forecast.hourly[0], row);
  assert.equal(zone.samples72h[0], sample);
  const unknown = context.clean({ provider: 'mixed', samples72h: [{ ...sample, at: '2026-09-18T23:00:00.000Z' }] });
  assert.equal(unknown.samples72h[0].waterLevelCm, null);
  assert.equal(unknown.samples72h[0].windSpeedMps, 7);
});

test('matching DMI history level does not authenticate a different retained trend', () => {
  const dmi = { time: at, waterLevelCm: 12, waterLevelTrendCm3h: 3,
    sources: { waterLevel: { provider: 'dmi' } } };
  for (const trend of [99, null, undefined]) {
    const sample = { at, waterLevelCm: 12, waterLevelTrendCm3h: trend, waveHeightM: 1 };
    const zone = context.clean({ forecast: { hourly: [dmi] }, samples24h: [sample], samples72h: [sample] });
    for (const row of [zone.samples24h[0], zone.samples72h[0]]) {
      assert.equal(row.waterLevelCm, 12);
      assert.equal(row.waterLevelTrendCm3h, null);
      assert.equal(row.waveHeightM, 1);
    }
  }
});
