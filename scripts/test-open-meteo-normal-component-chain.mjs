import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { OPEN_METEO_FUTURE_HOURS, trimOpenMeteoForecast } from './lib/open-meteo-forecast-window.mjs';
import { buildOpenMeteoIndependentHourlyComponents, fetchOpenMeteoComponentResponses } from './lib/open-meteo-hourly-components.mjs';
import { OPEN_METEO_PART_COMPONENTS, OPEN_METEO_NATIVE_NEAREST_POLICIES,
  openMeteoComponentRequestParts, openMeteoComponentGridMatches, openMeteoMfNearestGridPoint } from './lib/open-meteo-part-bank.mjs';
import { openMeteoO1280NearestGridPoint } from './lib/open-meteo-o1280-grid.mjs';

const source = fs.readFileSync(new URL('./update-weather.mjs', import.meta.url), 'utf8');
const start = source.indexOf('async function forecastFromOpenMeteo(');
const end = source.indexOf('\nfunction newerDmiRecord(', start);
assert.ok(start >= 0 && end > start);
const target = '2026-09-19T03:00:00.000Z';
const point = openMeteoMfNearestGridPoint([10, 56]);
const at = hours => new Date(Date.parse(target) + hours * 3_600_000).toISOString();

function producer({ fail = null, wrongSstCenter = false } = {}) {
  const queries = [];
  const context = vm.createContext({ URLSearchParams, OPEN_METEO_FUTURE_HOURS, trimOpenMeteoForecast,
    buildOpenMeteoIndependentHourlyComponents, fetchOpenMeteoComponentResponses,
    OPEN_METEO_PART_COMPONENTS, OPEN_METEO_NATIVE_NEAREST_POLICIES, openMeteoComponentRequestParts, openMeteoComponentGridMatches,
    zonePoint: () => point,
    fetchJson: async url => {
      const parsed = new URL(url);
      queries.push(parsed);
      const fields = parsed.searchParams.get('hourly').split(',');
      const component = fields.includes('wind_speed_10m') ? 'wind'
        : fields.includes('wave_height') ? 'wave'
          : fields.includes('sea_level_height_msl') ? 'waterLevel' : 'waterTemperature';
      if (component === fail) throw new Error('synthetic provider outage');
      const table = { wind_speed_10m: [6, 'm/s'], wind_direction_10m: [90, '°'], temperature_2m: [14, '°C'],
        wave_height: [1, 'm'], wave_peak_period: [7, 's'], wave_direction: [180, '°'],
        sea_level_height_msl: [0.2, 'm'], sea_surface_temperature: [15, '°C'] };
      const gridPoint = ['wind', 'wave'].includes(component) ? openMeteoO1280NearestGridPoint(point) : point;
      return { latitude: gridPoint[1], longitude: gridPoint[0] + (wrongSstCenter && component === 'waterTemperature' ? 0.1 : 0),
        utc_offset_seconds: 0,
        hourly: { time: [at(0), at(117), at(120)],
          ...Object.fromEntries(fields.map(field => [field, [table[field][0], table[field][0], table[field][0]]])) },
        hourly_units: Object.fromEntries(fields.map(field => [field, table[field][1]])) };
    },
  });
  vm.runInContext(`${source.slice(start, end)}\nglobalThis.run = forecastFromOpenMeteo;`, context);
  return { run: () => context.run({}, target), queries };
}

test('normal producer requests fixed models and identical locked window including H120', async () => {
  const { run, queries } = producer();
  const result = await run();
  assert.equal(queries.length, 3);
  assert.deepEqual(queries.map(url => url.searchParams.get('models')).sort(),
    ['ecmwf_ifs', 'ecmwf_wam', 'meteofrance_currents'].sort());
  assert.ok(queries.every(url => !url.searchParams.get('hourly').includes('sea_level_height_msl')));
  for (const url of queries) {
    assert.equal(url.searchParams.get('start_hour'), '2026-09-19T03:00');
    assert.equal(url.searchParams.get('end_hour'), '2026-09-24T03:00');
    assert.equal(url.searchParams.has('past_hours'), false);
    assert.equal(url.searchParams.has('forecast_hours'), false);
  }
  assert.equal(result.hourly[0].windSpeedMps, 6);
  assert.equal(result.hourly[0].wavePeriodS, 7);
  assert.equal(result.hourly[0].waterTemperatureC, 15);
  assert.equal(result.hourly[1].waterLevelTrendCm3h, null);
  assert.equal(result.hourly[2].time, at(120));
  assert.equal(result.hourly[2].waterLevelTrendCm3h, null);
});

test('normal producer keeps independent fields when wave transport fails and SST has the wrong cell', async () => {
  const result = await producer({ fail: 'wave', wrongSstCenter: true }).run();
  assert.equal(result.hourly[0].windSpeedMps, 6);
  assert.equal(result.hourly[0].waterLevelCm, null);
  assert.equal(result.hourly[0].wavePeriodS, null);
  assert.equal(result.hourly[0].waterTemperatureC, null);
  assert.deepEqual(Array.from(result.componentErrors).sort(), ['waterTemperature', 'wave']);
});
