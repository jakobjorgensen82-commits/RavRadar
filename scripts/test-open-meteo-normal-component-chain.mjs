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
const settlementSource = fs.readFileSync(new URL('./lib/weather-transport-settlement.mjs', import.meta.url), 'utf8')
  .replace(/^export /gm, '');
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
  vm.runInContext(`${settlementSource}\n${source.slice(start, end)}\nglobalThis.run = forecastFromOpenMeteo;`, context);
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

function transportContext(fetch) {
  const slice = (from, to) => {
    const a = source.indexOf(from), b = source.indexOf(to, a);
    assert.ok(a >= 0 && b > a, `actual updater extraction: ${from}`);
    return source.slice(a, b);
  };
  const sleeps = [], stages = [];
  const context = vm.createContext({ fetch, AbortController, Error, TypeError, SyntaxError,
    URLSearchParams, setTimeout, clearTimeout, console,
    REQUEST_TIMEOUT_MS: 2000, WEATHER_CACHE_ONLY: false, DMI_REQUEST_BUDGET: 6,
    DMI_REQUEST_CONCURRENCY: 1, REQUEST_GAP_MS: 0, USER_AGENT: 'synthetic-test',
    PROVIDER_FAILURE_THRESHOLD: 4, PROVIDER_COOLDOWN_MS: 600_000,
    sleep: async ms => { sleeps.push(ms); },
    OPEN_METEO_FUTURE_HOURS, trimOpenMeteoForecast,
    buildOpenMeteoIndependentHourlyComponents, fetchOpenMeteoComponentResponses,
    OPEN_METEO_PART_COMPONENTS, OPEN_METEO_NATIVE_NEAREST_POLICIES,
    openMeteoComponentRequestParts, openMeteoComponentGridMatches,
    zonePoint: () => point, canonicalForecastHour: value => value,
    withoutZoneCurrent: value => value, num: value => value, round: value => value,
    dmiForecastCoverage: () => ({ available: false }), zoneFromDmiForecastCache: () => null,
    DMI_CACHE_REFRESH_BELOW_HOURS: 24, DMI_LIVE_ZONE_BUDGET: 4,
    WEATHER_CONCURRENCY: 1, features: [{ properties: { id: 'synthetic-zone' } }],
    generatedAt: target, previous: { zones: { 'synthetic-zone': { current: { preserved: true } } } },
    nextDmiForecastStore: { zones: {} }, output: { zones: {}, errors: [] },
    reportWeatherBuildStage: (...args) => stages.push(args),
  });
  vm.runInContext(`${settlementSource}\n`
    + slice('let nextDmiRequestAt = 0;', 'let dmiWaterStationsPromise')
    + slice('async function fetchJson(', 'async function fetchAllFeatures(')
    + slice('async function fromOpenMeteo(', 'function normalizeDeg(')
    + source.slice(start, end)
    + slice('async function fallbackForZone(', 'async function readHealth(')
    + slice('async function mapWithConcurrency(', 'const { stable: stableFeatures }'), context);
  return { context, sleeps, stages,
    fetchJson: (options = {}) => context.fetchJson('https://synthetic.invalid/weather',
      { provider: 'Synthetic provider', ...options }),
    assertSettled: () => context.assertWeatherTransportSettlement(),
    active: () => vm.runInContext('activeDmiRequests', context),
    zoneJoin: () => vm.runInContext(`(async () => { ${slice(
      'await mapWithConcurrency(features, WEATHER_CONCURRENCY, async feature => {',
      'const marineCacheCompleteAtStart =')} })()`, context),
  };
}

test('legacy fetch waits for actual HTTP body cancellation before retry and DMI-slot release', async () => {
  let finishCancel, notifyCancel;
  const held = new Promise(resolve => { finishCancel = resolve; });
  const started = new Promise(resolve => { notifyCancel = resolve; });
  const signals = [];
  let calls = 0;
  const runtime = transportContext(async (_url, options) => {
    calls += 1;
    signals.push(options.signal);
    if (calls === 1) return new Response(new ReadableStream({ cancel() {
      notifyCancel(); return held;
    } }), { status: 503 });
    return new Response('{"ready":true}');
  });
  let returned = false;
  const operation = runtime.fetchJson({ dmi: true }).then(value => { returned = true; return value; });
  await started;
  assert.equal(calls, 1);
  assert.equal(returned, false);
  assert.equal(runtime.active(), 1);
  assert.deepEqual(runtime.sleeps, []);
  finishCancel();
  assert.equal((await operation).ready, true);
  assert.equal(calls, 2);
  assert.equal(runtime.active(), 0);
  assert.deepEqual(runtime.sleeps, [750]);
  assert.ok(signals.every(signal => signal.aborted));
  runtime.assertSettled();
});

test('legacy fetch distinguishes fulfilled EOF and JSON parse failure from unknown cancellation', async () => {
  let calls = 0;
  const runtime = transportContext(async () => new Response(++calls === 1 ? 'invalid-json' : '{"ready":true}'));
  await assert.rejects(runtime.fetchJson({ dmi: true }), error => error?.name === 'SyntaxError');
  runtime.assertSettled();
  assert.equal(runtime.active(), 0);
  assert.equal((await runtime.fetchJson({ dmi: true })).ready, true);
  assert.equal(calls, 2);
});

test('legacy fetch retains actual failed read/cancel and the boxed falsy first cause', async () => {
  for (const first of [0, null]) {
    let calls = 0, signal;
    const runtime = transportContext(async (_url, options) => {
      calls += 1; signal = options.signal;
      return new Response(new ReadableStream({ start(controller) { controller.error(first); } }));
    });
    let failure;
    try { await runtime.fetchJson({ dmi: true }); } catch (error) { failure = error; }
    assert.ok(failure instanceof Error);
    assert.equal(failure.cause, first);
    assert.equal(runtime.context.isWeatherTransportStopUnproved(failure), true);
    assert.equal(runtime.active(), 1, 'unproved body does not release its DMI slot');
    assert.equal(signal.aborted, true, 'abort is attempted, not treated as closed');
    assert.throws(runtime.assertSettled, error => error === failure);
    await assert.rejects(runtime.fetchJson(), error => error === failure);
    assert.equal(calls, 1);
    assert.deepEqual(runtime.sleeps, []);
  }
});

test('legacy actual component/fallback/zone join refuses uncertain HTTP cancellation before MET or writes', async () => {
  const urls = [];
  const runtime = transportContext(async url => {
    urls.push(String(url));
    return new Response(new ReadableStream({ cancel() { return Promise.reject(new Error('secondary cancel')); } }),
      { status: 503 });
  });
  let failure;
  try { await runtime.zoneJoin(); } catch (error) { failure = error; }
  assert.ok(failure instanceof Error);
  assert.equal(failure.status, 503, 'HTTP first failure survives secondary cancellation');
  assert.equal(runtime.context.isWeatherTransportStopUnproved(failure), true);
  assert.ok(urls.length > 0 && urls.length <= 2, 'only already-started component siblings may finish');
  assert.ok(urls.every(url => !url.includes('api.met.no')));
  assert.deepEqual(runtime.stages, [], 'post-join guard precedes the next build stage');
  assert.deepEqual(Object.keys(runtime.context.output.zones), []);
  assert.equal(runtime.context.previous.zones['synthetic-zone'].current.preserved, true);
  assert.throws(runtime.assertSettled, error => error === failure);
});

function oceanObsContext(fetch = async () => new Response('{}')) {
  const runtime = transportContext(fetch), warnings = [], calls = { stations: 0, levels: 0, routing: 0, cached: 0, next: 0 };
  const slice = (from, to) => {
    const a = source.indexOf(from), b = source.indexOf(to, a);
    assert.ok(a >= 0 && b > a, `actual OceanObs extraction: ${from}`);
    return source.slice(a, b);
  };
  Object.assign(runtime.context, {
    console: { warn: value => warnings.push(value), log() {} },
    WATER_STATION_INVENTORY_PATH: 'synthetic-owned-stations.json',
    fs: { readFile: async () => { calls.cached += 1; return '{"stations":[]}'; } },
    dmiWaterStations: async () => { calls.stations += 1; return []; },
    dmiLatestSeaLevels: async () => { calls.levels += 1; return new Map(); },
    waterStationRouting: async () => { calls.routing += 1; return { zones: {} }; },
    deduplicateStationSites: value => value,
    manualStationInterpolation: () => ({ valueCm: 17, method: 'synthetic-existing-route' }),
    dmiForecastStore: { waterSourceContinuity: {} },
    unpackWaterSourceForecastContinuity: async () => { calls.next += 1; return {}; },
    readCachedWaterStations: async () => { calls.next += 1; return []; },
    forecastAwareRegistry: [], dmiObservationSkipReason: null,
    dmiSeaLevelObservationRun: { succeeded: false, validLevelCount: 0 },
    updateStationObservationLifecycle: async () => { calls.next += 1; return { stations: [] }; },
    observationDue: true, coastCorridors: new Map(),
    dmiPersistentRuntime: {}, applyObservedWaterLevel: () => { calls.next += 1; },
  });
  vm.runInContext(slice('async function cachedStationLevels(', 'function stationEvent(')
    + slice('async function observedDmiWaterLevel(', 'function applyObservedWaterLevel('), runtime.context);
  return { ...runtime, warnings, calls,
    observed: () => runtime.context.observedDmiWaterLevel({ properties: { id: 'synthetic-zone' } }, new Map()),
    registry: () => vm.runInContext(`(async () => { ${slice('const rawStationRegistry =', 'const waterSourceForecastIndex =')} })()`, runtime.context),
    quality: () => vm.runInContext(`(async () => { ${slice('const qualityLevels =', 'let stationRegistry =')} })()`, runtime.context),
    observations: () => vm.runInContext(`(async () => { ${slice('if (!observationDue) {', 'function enrichZoneSources(')} })()`, runtime.context),
  };
}

test('OceanObs settlement: rejected input waits for the same held filesystem read before ordinary fallback', async () => {
  const runtime = oceanObsContext(), first = new Error('first ordinary observation failure');
  let finish, returned = false;
  const held = new Promise(resolve => { finish = resolve; });
  runtime.context.dmiWaterStations = async () => { runtime.calls.stations += 1; throw first; };
  runtime.context.fs.readFile = () => { runtime.calls.cached += 1; return held; };
  const operation = runtime.observed().then(value => { returned = true; return value; });
  try {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(returned, false, 'failed fan-in must not abandon its already-started read');
    assert.deepEqual(runtime.warnings, []);
    assert.deepEqual(runtime.calls, { stations: 1, levels: 1, routing: 1, cached: 1, next: 0 });
  } finally { finish('{"stations":[]}'); await operation; }
  assert.equal(await operation, null);
  assert.equal(runtime.warnings.length, 1);
  assert.match(runtime.warnings[0], /first ordinary observation failure/);
  runtime.assertSettled();
});

test('OceanObs settlement: first ordinary error survives a later actual sibling transport STOP', async t => {
  for (const first of [new Error('first safe input error'), 0, null]) await t.test(String(first), async () => {
    let release, sibling, returned = false;
    const headers = new Promise(resolve => { release = resolve; });
    const runtime = oceanObsContext(async () => { await headers;
      return new Response(new ReadableStream({ start(controller) { controller.error(new Error('later owned body failure')); } })); });
    runtime.context.dmiWaterStations = async () => { throw first; };
    runtime.context.dmiLatestSeaLevels = () => (sibling = runtime.fetchJson());
    const operation = runtime.observed().then(value => ({ value }), error => ({ error }))
      .then(result => { returned = true; return result; });
    try {
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(returned, false, 'first error cannot detach the actual sibling request');
    } finally { release(); await Promise.allSettled([operation, sibling]); }
    const { error } = await operation;
    assert.ok(error instanceof Error);
    if (first instanceof Error) assert.equal(error, first, 'keep exact first error identity');
    else assert.equal(error.cause, first, 'keep boxed raw first cause');
    assert.equal(runtime.context.isWeatherTransportStopUnproved(error), true);
    assert.deepEqual(runtime.warnings, []);
    assert.equal(runtime.calls.next, 0);
  });
});

test('OceanObs settlement: observed catch propagates its actual branded body error without logging', async () => {
  const first = new Error('owned observation body failure');
  const runtime = oceanObsContext(async () => new Response(new ReadableStream({ start(controller) { controller.error(first); } })));
  runtime.context.dmiWaterStations = () => runtime.fetchJson();
  await assert.rejects(runtime.observed(), error => error === first);
  assert.equal(runtime.context.isWeatherTransportStopUnproved(first), true);
  assert.deepEqual(runtime.warnings, []);
});

test('OceanObs settlement: late registry and quality catches stop before normal next read or write', async t => {
  for (const kind of ['registry', 'quality']) await t.test(kind, async () => {
    const first = new Error(`owned ${kind} body failure`);
    const runtime = oceanObsContext(async () => new Response(new ReadableStream({ start(controller) { controller.error(first); } })));
    const request = () => runtime.fetchJson();
    if (kind === 'registry') runtime.context.dmiWaterStations = request;
    else runtime.context.dmiLatestSeaLevels = request;
    await assert.rejects(runtime[kind](), error => error === first);
    assert.equal(runtime.calls.next, 0);
    assert.equal(runtime.context.isWeatherTransportStopUnproved(first), true);
  });
});

test('OceanObs settlement: global STOP precedes applying an otherwise returned observation', async () => {
  const first = new Error('other settled caller retained its actual body');
  const runtime = oceanObsContext(async () => new Response(new ReadableStream({ start(controller) { controller.error(first); } })));
  runtime.context.output.zones['synthetic-zone'] = {};
  runtime.context.observedDmiWaterLevel = async () => {
    await runtime.fetchJson().catch(() => {});
    return { valueCm: 17 };
  };
  await assert.rejects(runtime.observations(), error => error === first);
  assert.equal(runtime.calls.next, 0);
  assert.equal(runtime.context.dmiPersistentRuntime.lastObservationAt, undefined);
});

test('OceanObs settlement: ordinary settled late failures and normal observation preserve existing fallbacks', async () => {
  const runtime = oceanObsContext();
  assert.equal((await runtime.observed()).valueCm, 17);
  runtime.context.dmiWaterStations = async () => { throw new Error('ordinary station outage'); };
  await runtime.registry();
  assert.equal(runtime.calls.next, 2, 'existing cached station fallback and next continuity read');
  runtime.context.dmiLatestSeaLevels = async () => { throw new Error('ordinary levels outage'); };
  await runtime.quality();
  assert.equal(runtime.calls.next, 3, 'existing empty-level fallback reaches lifecycle caller');
  runtime.assertSettled();
});

test('cache-only normal fetchJson rejects before network, DMI slot or retry work', async () => {
  let calls = 0;
  const runtime = transportContext(async () => {
    calls += 1;
    throw new Error('synthetic fetch must not be reached');
  });
  runtime.context.WEATHER_CACHE_ONLY = true;
  await assert.rejects(runtime.fetchJson({ dmi: true }),
    error => error?.code === 'WEATHER_CACHE_ONLY_NETWORK_DISABLED');
  assert.equal(calls, 0);
  assert.equal(runtime.active(), 0);
  assert.deepEqual(runtime.sleeps, []);
  runtime.assertSettled();
});
