import fs from 'node:fs/promises';
import {
  DMI_FORECAST_HOURS,
  buildDmiForecastHourly,
  createDmiForecastRecord,
  dmiForecastCoverage,
  interpolateWaterLevelStations,
  selectDmiForecastAt
} from './lib/dmi-forecast-store.mjs';

const ZONES_PATH = 'data/zones.geojson';
const OUTPUT_PATH = 'data/live/conditions.json';
const DMI_ROOT = 'https://opendataapi.dmi.dk/v1/forecastedr/collections';
const DMI_OCEAN_OBS_ROOT = 'https://opendataapi.dmi.dk/v2/oceanObs/collections';
const HEALTH_PATH = 'data/live/weather-health.json';
const DMI_FORECAST_STORE_PATH = 'data/live/dmi-forecast-cache.json';
const ALERT_MAX_PER_24H = Number(process.env.WEATHER_ALERT_MAX_PER_24H ?? 2);
const ALERT_FAILURE_MINUTES = Number(process.env.WEATHER_ALERT_FAILURE_MINUTES ?? 60);
const REQUEST_TIMEOUT_MS = Number(process.env.WEATHER_REQUEST_TIMEOUT_MS ?? 18000);
const REQUEST_GAP_MS = Number(process.env.DMI_REQUEST_GAP_MS ?? 1400);
const DMI_MAX_RETRIES = Number(process.env.DMI_MAX_RETRIES ?? 1);
const WEATHER_CONCURRENCY = Math.max(1, Number(process.env.WEATHER_CONCURRENCY ?? 6));
const PROVIDER_FAILURE_THRESHOLD = Math.max(1, Number(process.env.WEATHER_PROVIDER_FAILURE_THRESHOLD ?? 4));
const PROVIDER_COOLDOWN_MS = Number(process.env.WEATHER_PROVIDER_COOLDOWN_MS ?? 10 * 60 * 1000);
const USER_AGENT = process.env.WEATHER_USER_AGENT ?? 'RavRadar/2.4 (central weather updater)';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const num = value => Number.isFinite(Number(value)) ? Number(value) : null;
const round = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
const normalizeDegrees = value => ((value % 360) + 360) % 360;

let nextDmiRequestAt = 0;
let dmiTransientFailure = false;
const providerRuntime = new Map();

function providerState(name) {
  if (!providerRuntime.has(name)) providerRuntime.set(name, { failures: 0, circuitOpenedAt: null, lastAttemptAt: null, lastSuccessAt: null, lastError: null, requests: 0, successes: 0, latencyTotalMs: 0 });
  return providerRuntime.get(name);
}

function providerCircuitOpen(name) {
  const state = providerState(name);
  if (!state.circuitOpenedAt) return false;
  if (Date.now() - state.circuitOpenedAt >= PROVIDER_COOLDOWN_MS) { state.circuitOpenedAt = null; state.failures = 0; return false; }
  return true;
}
let dmiWaterStationsPromise = null;
let dmiLatestSeaLevelPromise = null;

async function fetchJson(url, { provider, retries = 1, dmi = false } = {}) {
  const state = providerState(provider);
  if (providerCircuitOpen(provider)) {
    const error = new Error(`${provider}: circuit breaker active`);
    error.code = 'CIRCUIT_OPEN';
    throw error;
  }
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (dmi) {
      const wait = Math.max(0, nextDmiRequestAt - Date.now());
      if (wait) await sleep(wait);
      nextDmiRequestAt = Date.now() + REQUEST_GAP_MS;
    }
    const startedAt = Date.now();
    state.lastAttemptAt = new Date().toISOString();
    state.requests += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json, application/geo+json', 'User-Agent': USER_AGENT },
        signal: controller.signal
      });
      if (!response.ok) {
        const error = new Error(`${provider}: HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      const data = await response.json();
      state.failures = 0;
      state.circuitOpenedAt = null;
      state.lastSuccessAt = new Date().toISOString();
      state.lastError = null;
      state.successes += 1;
      state.latencyTotalMs += Date.now() - startedAt;
      return data;
    } catch (error) {
      lastError = error?.name === 'AbortError' ? new Error(`${provider}: timeout after ${REQUEST_TIMEOUT_MS} ms`) : error;
      state.failures += 1;
      state.lastError = lastError instanceof Error ? lastError.message : String(lastError);
      state.latencyTotalMs += Date.now() - startedAt;
      if (state.failures >= PROVIDER_FAILURE_THRESHOLD) state.circuitOpenedAt = Date.now();
      if (dmi && (error?.status === 429 || error?.name === 'AbortError' || error instanceof TypeError)) dmiTransientFailure = true;
      const retryable = error?.status === 429 || error?.status >= 500 || error?.name === 'AbortError' || error instanceof TypeError;
      if (!retryable || attempt >= retries) throw lastError;
      const retryAfter = Number(error?.retryAfter);
      await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : Math.min(5000, 750 * 2 ** attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError ?? new Error(`${provider}: ukendt fejl`);
}

function zonePoint(feature) {
  const configured = feature.properties?.dataPoint;
  if (Array.isArray(configured) && configured.length === 2 && configured.every(Number.isFinite)) return configured;
  const ring = feature.geometry?.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 3) throw new Error('Mangler dataPoint eller gyldig polygon');
  const points = ring.slice(0, -1);
  return [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length
  ];
}


function haversineKm(a, b) {
  const toRad = degrees => degrees * Math.PI / 180;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function dmiWaterStations() {
  if (!dmiWaterStationsPromise) {
    const query = new URLSearchParams({ limit: '1000', status: 'Active' });
    dmiWaterStationsPromise = fetchJson(`${DMI_OCEAN_OBS_ROOT}/station/items?${query}`, {
      provider: 'DMI oceanObs stations', retries: DMI_MAX_RETRIES, dmi: true
    }).then(data => (data.features ?? []).map(feature => ({
      stationId: String(feature.properties?.stationId ?? feature.properties?.id ?? ''),
      name: feature.properties?.name ?? feature.properties?.stationName ?? feature.properties?.countryName ?? 'DMI station',
      point: feature.geometry?.coordinates,
      properties: feature.properties ?? {}
    })).filter(station => station.stationId && Array.isArray(station.point) && station.point.length === 2));
  }
  return dmiWaterStationsPromise;
}

async function dmiLatestSeaLevels() {
  if (!dmiLatestSeaLevelPromise) {
    const query = new URLSearchParams({
      limit: '1000', parameterId: 'sealev_ln', period: 'latest-hour', sortorder: 'observed,DESC'
    });
    dmiLatestSeaLevelPromise = fetchJson(`${DMI_OCEAN_OBS_ROOT}/observation/items?${query}`, {
      provider: 'DMI oceanObs water level', retries: DMI_MAX_RETRIES, dmi: true
    }).then(data => {
      const latest = new Map();
      for (const feature of data.features ?? []) {
        const p = feature.properties ?? {};
        const stationId = String(p.stationId ?? '');
        const value = num(p.value);
        if (!stationId || value === null) continue;
        const existing = latest.get(stationId);
        if (!existing || Date.parse(p.observed) > Date.parse(existing.observed)) {
          latest.set(stationId, { stationId, valueCm: value, observed: p.observed, qcStatus: p.qcStatus ?? null });
        }
      }
      return latest;
    });
  }
  return dmiLatestSeaLevelPromise;
}

async function interpolatedDmiWaterLevel(point) {
  try {
    const [stations, levels] = await Promise.all([dmiWaterStations(), dmiLatestSeaLevels()]);
    return interpolateWaterLevelStations(point, stations, levels, { haversineKm, maxStations: 2 });
  } catch (error) {
    dmiTransientFailure = true;
    console.warn(`DMI stationsvandstand fejlede: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function dmiCollections(coastType) {
  if (coastType === 'west') return { wave: 'wam_nsb', ocean: 'dkss_nsbs' };
  if (coastType === 'limfjord') return { wave: null, ocean: 'dkss_lf' };
  return { wave: 'wam_dw', ocean: 'dkss_idw' };
}

async function dmiPosition(collection, point, parameters) {
  if (!collection) return [];
  const [longitude, latitude] = point;
  const query = new URLSearchParams({
    coords: `POINT(${longitude} ${latitude})`, crs: 'crs84',
    'parameter-name': parameters.join(','), f: 'GeoJSON'
  });
  const apiKey = process.env.DMI_API_KEY;
  if (apiKey) query.set('api-key', apiKey);
  const data = await fetchJson(`${DMI_ROOT}/${collection}/position?${query}`, {
    provider: 'DMI', retries: DMI_MAX_RETRIES, dmi: true
  });
  return (data.features ?? []).map(feature => feature.properties ?? {})
    .filter(item => item.step).sort((a, b) => Date.parse(a.step) - Date.parse(b.step));
}

function nearest(items, target) {
  return items.reduce((best, item) => {
    const distance = Math.abs(Date.parse(item.step ?? item.time) - target);
    return !best || distance < best.distance ? { item, distance } : best;
  }, null)?.item ?? null;
}

function atOrAfter(items, target) {
  return items.find(item => Date.parse(item.step ?? item.time) >= target) ?? items.at(-1) ?? null;
}

async function fromDmi(feature, generatedAt) {
  const point = zonePoint(feature);
  const collections = dmiCollections(feature.properties?.coastType);
  const now = Date.parse(generatedAt);
  const [wind, waves, oceanResult, stationWaterLevel] = await Promise.all([
    dmiPosition('harmonie_dini_sf', point, ['wind-speed-10m', 'wind-dir-10m']),
    collections.wave ? dmiPosition(collections.wave, point, ['significant-wave-height', 'mean-wave-dir', 'dominant-wave-period']) : Promise.resolve([]),
    (async () => {
      try {
        return await dmiPosition(collections.ocean, point, ['sea-mean-deviation', 'current-u', 'current-v', 'water-temperature']);
      } catch (error) {
        if (error?.status !== 400) throw error;
        return dmiPosition(collections.ocean, point, ['sea-mean-deviation', 'current-u', 'current-v']);
      }
    })(),
    interpolatedDmiWaterLevel(point)
  ]);
  const ocean = oceanResult;
  const w = nearest(wind, now);
  if (!w || num(w['wind-speed-10m']) === null) throw new Error('DMI-vinddata mangler');
  const wa = nearest(waves, now);
  const o = nearest(ocean, now);
  const o3 = atOrAfter(ocean, now + 3 * 3600000);
  const u = num(o?.['current-u']);
  const v = num(o?.['current-v']);
  const sea = num(o?.['sea-mean-deviation']);
  const sea3 = num(o3?.['sea-mean-deviation']);
  const dmiForecast = buildDmiForecastHourly({
    wind, waves, ocean, observedWaterLevel: stationWaterLevel, generatedAt, hours: DMI_FORECAST_HOURS
  });
  const zoneId = feature.properties?.id ?? 'Ukendt zone';
  const forecastRecord = createDmiForecastRecord({
    zoneId,
    point,
    generatedAt,
    hourly: dmiForecast.hourly,
    waterLevelInterpolation: stationWaterLevel,
    model: { wind: 'harmonie_dini_sf', wave: collections.wave, ocean: collections.ocean }
  });
  const currentForecast = selectDmiForecastAt(forecastRecord, generatedAt) ?? dmiForecast.hourly[0];
  return {
    point,
    provider: 'dmi',
    providerLabel: 'DMI Open Data',
    modelSteps: { wind: w.step, wave: wa?.step ?? null, ocean: o?.step ?? null },
    current: {
      windSpeedMps: currentForecast.windSpeedMps,
      windDirectionDeg: currentForecast.windDirectionDeg,
      waveHeightM: currentForecast.waveHeightM,
      waveDirectionDeg: currentForecast.waveDirectionDeg,
      wavePeriodS: currentForecast.wavePeriodS,
      waterLevelCm: currentForecast.waterLevelCm,
      waterLevelTrendCm3h: currentForecast.waterLevelTrendCm3h,
      currentSpeedMps: currentForecast.currentSpeedMps,
      currentDirectionDeg: currentForecast.currentDirectionDeg,
      waterTemperatureC: currentForecast.waterTemperatureC
    },
    waterLevel: {
      source: stationWaterLevel ? 'dmi-model-observation-corrected' : 'dmi-model',
      reference: stationWaterLevel ? 'DMI model (authoritative); nearby DMI observations shown only as diagnostics' : 'DMI sea-mean-deviation',
      interpolation: stationWaterLevel ?? null,
      modelBiasCm: dmiForecast.waterLevelBiasCm
    },
    dmiForecast: forecastRecord
  };
}

function currentFromHourly(data, variable, target = Date.now()) {
  const times = data?.hourly?.time ?? [];
  let best = -1;
  let distance = Infinity;
  for (let index = 0; index < times.length; index += 1) {
    const d = Math.abs(Date.parse(`${times[index]}Z`) - target);
    if (d < distance) { distance = d; best = index; }
  }
  return best >= 0 ? data.hourly?.[variable]?.[best] ?? null : null;
}

async function fromOpenMeteo(feature, generatedAt) {
  const [longitude, latitude] = zonePoint(feature);
  const weatherQuery = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    current: 'wind_speed_10m,wind_direction_10m', wind_speed_unit: 'ms', timezone: 'GMT', forecast_days: '1'
  });
  const marineQuery = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    current: 'wave_height,wave_direction,wave_period,sea_level_height_msl,sea_surface_temperature,ocean_current_velocity,ocean_current_direction',
    hourly: 'sea_level_height_msl', velocity_unit: 'ms', timezone: 'GMT', forecast_days: '1', cell_selection: 'sea'
  });
  const [weather, marine] = await Promise.all([
    fetchJson(`https://api.open-meteo.com/v1/forecast?${weatherQuery}`, { provider: 'Open-Meteo', retries: 2 }),
    fetchJson(`https://marine-api.open-meteo.com/v1/marine?${marineQuery}`, { provider: 'Open-Meteo Marine', retries: 2 })
  ]);
  const c = marine.current ?? {};
  const sea = num(c.sea_level_height_msl);
  const sea3 = num(currentFromHourly(marine, 'sea_level_height_msl', Date.parse(generatedAt) + 3 * 3600000));
  return {
    point: [longitude, latitude], provider: 'open-meteo', providerLabel: 'Open-Meteo Marine',
    modelSteps: { wind: weather.current?.time ?? null, wave: marine.current?.time ?? null, ocean: marine.current?.time ?? null },
    current: {
      windSpeedMps: round(num(weather.current?.wind_speed_10m), 1),
      windDirectionDeg: round(num(weather.current?.wind_direction_10m), 0),
      waveHeightM: round(num(c.wave_height), 2),
      waveDirectionDeg: round(num(c.wave_direction), 0),
      wavePeriodS: round(num(c.wave_period), 1),
      waterLevelCm: sea === null ? null : round(sea * 100, 0),
      waterLevelTrendCm3h: sea === null || sea3 === null ? null : round((sea3 - sea) * 100, 0),
      currentSpeedMps: round(num(c.ocean_current_velocity), 2),
      currentDirectionDeg: round(num(c.ocean_current_direction), 0),
      waterTemperatureC: round(num(c.sea_surface_temperature), 1)
    }
  };
}

async function fromMetNorway(feature) {
  const [longitude, latitude] = zonePoint(feature);
  const query = new URLSearchParams({ lat: String(latitude), lon: String(longitude) });
  const data = await fetchJson(`https://api.met.no/weatherapi/locationforecast/2.0/compact?${query}`, {
    provider: 'MET Norway', retries: 2
  });
  const instant = data?.properties?.timeseries?.[0]?.data?.instant?.details;
  if (!instant || num(instant.wind_speed) === null) throw new Error('MET Norway-vinddata mangler');
  return {
    point: [longitude, latitude], provider: 'met-norway', providerLabel: 'MET Norway',
    modelSteps: { wind: data.properties.timeseries[0].time, wave: null, ocean: null },
    current: {
      windSpeedMps: round(num(instant.wind_speed), 1), windDirectionDeg: round(num(instant.wind_from_direction), 0),
      waveHeightM: null, waveDirectionDeg: null, wavePeriodS: null,
      waterLevelCm: null, waterLevelTrendCm3h: null, currentSpeedMps: null, currentDirectionDeg: null,
      waterTemperatureC: null
    }
  };
}

function historyFor(previous, zoneId, current, generatedAt) {
  const cutoff = Date.parse(generatedAt) - 24 * 3600000;
  const samples = [...(previous?.zones?.[zoneId]?.samples24h ?? []), {
    at: generatedAt, windSpeedMps: current.windSpeedMps, waveHeightM: current.waveHeightM
  }].filter(sample => Date.parse(sample.at) >= cutoff)
    .filter((sample, index, all) => all.findIndex(item => item.at === sample.at) === index)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const winds = samples.map(s => num(s.windSpeedMps)).filter(Number.isFinite);
  const waves = samples.map(s => num(s.waveHeightM)).filter(Number.isFinite);
  const high = samples.filter(s => (num(s.windSpeedMps) ?? 0) >= 9 || (num(s.waveHeightM) ?? 0) >= 1.2).at(-1);
  return {
    samples24h: samples,
    history: {
      maxWind24hMps: winds.length ? round(Math.max(...winds), 1) : null,
      maxWave24hM: waves.length ? round(Math.max(...waves), 2) : null,
      hoursSinceHighEnergy: high ? round((Date.parse(generatedAt) - Date.parse(high.at)) / 3600000, 1) : null
    }
  };
}



function hourlyValue(data, variable, index) {
  const value = data?.hourly?.[variable]?.[index];
  return num(value);
}

async function forecastFromOpenMeteo(feature) {
  const [longitude, latitude] = zonePoint(feature);
  const weatherQuery = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    hourly: 'wind_speed_10m,wind_direction_10m,temperature_2m',
    wind_speed_unit: 'ms', timezone: 'Europe/Copenhagen', forecast_days: '5'
  });
  const marineQuery = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    hourly: 'wave_height,wave_direction,wave_period,sea_level_height_msl,sea_surface_temperature,ocean_current_velocity,ocean_current_direction',
    velocity_unit: 'ms', timezone: 'Europe/Copenhagen', forecast_days: '5', cell_selection: 'sea'
  });
  const [weather, marine] = await Promise.all([
    fetchJson(`https://api.open-meteo.com/v1/forecast?${weatherQuery}`, { provider: 'Open-Meteo forecast', retries: 2 }),
    fetchJson(`https://marine-api.open-meteo.com/v1/marine?${marineQuery}`, { provider: 'Open-Meteo Marine forecast', retries: 2 })
  ]);
  const times = weather?.hourly?.time ?? marine?.hourly?.time ?? [];
  const marineIndex = new Map((marine?.hourly?.time ?? []).map((time, index) => [time, index]));
  const hourly = times.slice(0, 120).map((time, index) => {
    const mi = marineIndex.get(time) ?? index;
    const sea = hourlyValue(marine, 'sea_level_height_msl', mi);
    const sea3 = hourlyValue(marine, 'sea_level_height_msl', Math.min(mi + 3, (marine?.hourly?.time?.length ?? 1) - 1));
    return {
      time,
      windSpeedMps: round(hourlyValue(weather, 'wind_speed_10m', index), 1),
      windDirectionDeg: round(hourlyValue(weather, 'wind_direction_10m', index), 0),
      airTemperatureC: round(hourlyValue(weather, 'temperature_2m', index), 1),
      waveHeightM: round(hourlyValue(marine, 'wave_height', mi), 2),
      waveDirectionDeg: round(hourlyValue(marine, 'wave_direction', mi), 0),
      wavePeriodS: round(hourlyValue(marine, 'wave_period', mi), 1),
      waterLevelCm: sea === null ? null : round(sea * 100, 0),
      waterLevelTrendCm3h: sea === null || sea3 === null ? null : round((sea3 - sea) * 100, 0),
      currentSpeedMps: round(hourlyValue(marine, 'ocean_current_velocity', mi), 2),
      currentDirectionDeg: round(hourlyValue(marine, 'ocean_current_direction', mi), 0),
      waterTemperatureC: round(hourlyValue(marine, 'sea_surface_temperature', mi), 1)
    };
  });
  if (!hourly.some(item => item.windSpeedMps !== null)) throw new Error('5-dages prognose mangler vinddata');
  return { provider: 'open-meteo', providerLabel: 'Open-Meteo 5-day forecast', hourly };
}

async function readDmiForecastStore() {
  try {
    const parsed = JSON.parse(await fs.readFile(DMI_FORECAST_STORE_PATH, 'utf8'));
    return parsed?.zones && typeof parsed.zones === 'object' ? parsed : { schemaVersion: 1, zones: {} };
  } catch {
    return { schemaVersion: 1, zones: {} };
  }
}

function zoneFromDmiForecastCache(feature, record, generatedAt) {
  const selected = selectDmiForecastAt(record, generatedAt);
  if (!selected) return null;
  const remaining = (record.hourly ?? []).filter(item => Date.parse(item.time) >= Date.parse(generatedAt) - 30 * 60000);
  return {
    point: zonePoint(feature),
    provider: 'dmi-cache',
    providerLabel: 'DMI 5-døgns prognosecache',
    modelSteps: { wind: selected.time, wave: selected.time, ocean: selected.time },
    current: {
      windSpeedMps: selected.windSpeedMps ?? null,
      windDirectionDeg: selected.windDirectionDeg ?? null,
      waveHeightM: selected.waveHeightM ?? null,
      waveDirectionDeg: selected.waveDirectionDeg ?? null,
      wavePeriodS: selected.wavePeriodS ?? null,
      waterLevelCm: selected.waterLevelCm ?? null,
      waterLevelTrendCm3h: selected.waterLevelTrendCm3h ?? null,
      currentSpeedMps: selected.currentSpeedMps ?? null,
      currentDirectionDeg: selected.currentDirectionDeg ?? null,
      waterTemperatureC: selected.waterTemperatureC ?? null
    },
    waterLevel: {
      source: selected.waterLevelSource ?? 'dmi-model-cache',
      reference: 'Cached DMI model forecast',
      interpolation: record.waterLevelInterpolation ?? null,
      modelBiasCm: selected.waterLevelBiasCm ?? null
    },
    forecast: {
      provider: 'dmi-cache',
      providerLabel: 'DMI cached 5-day forecast',
      generatedAt: record.generatedAt,
      validUntil: record.validUntil,
      hourly: remaining
    },
    dmiCache: { generatedAt: record.generatedAt, validUntil: record.validUntil, cacheAgeHours: selected.cacheAgeHours }
  };
}

async function readPrevious() {
  try { return JSON.parse(await fs.readFile(OUTPUT_PATH, 'utf8')); }
  catch { return { zones: {} }; }
}

async function resolveZone(feature, generatedAt, previous, dmiForecastStore, nextDmiForecastStore, { dmiOnly = false } = {}) {
  const zoneId = feature.properties?.id ?? 'Ukendt zone';
  const attempts = [];

  try {
    const result = await fromDmi(feature, generatedAt);
    const history = historyFor(previous, zoneId, result.current, generatedAt);
    nextDmiForecastStore.zones[zoneId] = result.dmiForecast;
    const forecast = {
      provider: 'dmi',
      providerLabel: 'DMI 5-day forecast',
      generatedAt: result.dmiForecast.generatedAt,
      validUntil: result.dmiForecast.validUntil,
      hourly: result.dmiForecast.hourly
    };
    const { dmiForecast, ...publicResult } = result;
    return { ...publicResult, ...history, forecast, stale: false, fallback: false, attempts };
  } catch (error) {
    attempts.push({ provider: 'dmi', message: error instanceof Error ? error.message : String(error) });
    console.warn(`${zoneId}: dmi fejlede: ${attempts.at(-1).message}`);
  }

  const cachedDmi = zoneFromDmiForecastCache(feature, dmiForecastStore?.zones?.[zoneId], generatedAt);
  if (cachedDmi) {
    const history = historyFor(previous, zoneId, cachedDmi.current, generatedAt);
    nextDmiForecastStore.zones[zoneId] = dmiForecastStore.zones[zoneId];
    return { ...cachedDmi, ...history, stale: false, fallback: false, attempts };
  }
  attempts.push({ provider: 'dmi-cache', message: 'Ingen gyldig DMI-prognose i 120-timers cache' });
  if (dmiOnly) throw new Error(`${zoneId}: DMI live og DMI cache fejlede`);

  for (const [name, provider] of [['open-meteo', fromOpenMeteo], ['met-norway', fromMetNorway]]) {
    try {
      const result = await provider(feature, generatedAt);
      const history = historyFor(previous, zoneId, result.current, generatedAt);
      let forecast = previous?.zones?.[zoneId]?.forecast ?? null;
      try { forecast = await forecastFromOpenMeteo(feature); }
      catch (forecastError) { attempts.push({ provider: 'open-meteo-forecast', message: forecastError instanceof Error ? forecastError.message : String(forecastError) }); }
      return { ...result, ...history, forecast, stale: false, fallback: true, attempts };
    } catch (error) {
      attempts.push({ provider: name, message: error instanceof Error ? error.message : String(error) });
      console.warn(`${zoneId}: ${name} fejlede: ${attempts.at(-1).message}`);
    }
  }
  const cached = previous?.zones?.[zoneId];
  if (cached?.current) return { ...cached, stale: true, fallback: true, provider: 'cache', providerLabel: 'Seneste cache', attempts };
  throw new Error(`${zoneId}: alle vejrkilder fejlede, og ingen cache findes`);
}


async function readHealth() {
  try { return JSON.parse(await fs.readFile(HEALTH_PATH, 'utf8')); }
  catch { return { alertHistory: [], consecutiveFailureSince: null, lastSuccessfulDmiAt: null }; }
}

function buildWeatherHealth(previousHealth, output, nowIso) {
  const now = Date.parse(nowIso);
  const dmiCount = Object.values(output.zones).filter(zone => zone.provider === 'dmi').length;
  const total = Object.keys(output.zones).length;
  const dmiHealthy = total > 0 && dmiCount / total >= 0.8 && !dmiTransientFailure;
  const failureSince = dmiHealthy ? null : (previousHealth.consecutiveFailureSince ?? nowIso);
  const failureMinutes = failureSince ? Math.max(0, Math.round((now - Date.parse(failureSince)) / 60000)) : 0;
  const recentAlerts = (previousHealth.alertHistory ?? []).filter(item => now - Date.parse(item.sentAt) < 24 * 3600000);
  const alertEligible = !dmiHealthy && failureMinutes >= ALERT_FAILURE_MINUTES && recentAlerts.length < ALERT_MAX_PER_24H;
  const alertHistory = alertEligible
    ? [...recentAlerts, { sentAt: nowIso, reason: 'DMI-data har været utilstrækkelige i længere tid', dmiZones: dmiCount, totalZones: total }]
    : recentAlerts;
  return {
    generatedAt: nowIso,
    status: dmiHealthy ? 'ok' : (failureMinutes >= ALERT_FAILURE_MINUTES ? 'alarm' : 'warning'),
    dmi: { healthy: dmiHealthy, zonesFromDmi: dmiCount, totalZones: total, coveragePercent: total ? round(dmiCount / total * 100, 1) : 0, consecutiveFailureSince: failureSince, failureMinutes, lastSuccessfulAt: dmiHealthy ? nowIso : (previousHealth.lastSuccessfulDmiAt ?? null) },
    alerts: { maxPer24Hours: ALERT_MAX_PER_24H, sentLast24Hours: alertHistory.length, shouldNotifyAdministrator: alertEligible, nextAllowedAfter: alertHistory.length >= ALERT_MAX_PER_24H ? alertHistory[0].sentAt : null },
    providers: output.weatherEngine?.providers ?? {},
    dmiForecastCache: output.weatherEngine?.dmiForecastCache ?? { zones: 0, minimumRemainingHours: 0, maximumRemainingHours: 0 },
    alertHistory
  };
}

const zonesFile = JSON.parse(await fs.readFile(ZONES_PATH, 'utf8'));
const features = Array.isArray(zonesFile.features) ? zonesFile.features : [];
if (!features.length) throw new Error(`${ZONES_PATH} indeholder ingen zoner`);
const previous = await readPrevious();
const dmiForecastStore = await readDmiForecastStore();
const nextDmiForecastStore = { schemaVersion: 1, generatedAt: null, horizonHours: DMI_FORECAST_HOURS, zones: {} };
const generatedAt = new Date().toISOString();
const output = {
  schemaVersion: 4, generatedAt,
  source: 'Central RavRadar weather service',
  providerPriority: ['dmi', 'dmi-cache', 'open-meteo', 'met-norway', 'cache'],
  directionConventions: { windDirectionDeg: 'from', currentDirectionDeg: 'toward', waveDirectionDeg: 'from' },
  zones: {}, errors: [], retry: { dmiRetriedAfterMinutes: 0, completedAt: null }
};

async function mapWithConcurrency(items, concurrency, worker) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item) await worker(item);
    }
  });
  await Promise.all(workers);
}

await mapWithConcurrency(features, WEATHER_CONCURRENCY, async feature => {
  const zoneId = feature.properties?.id ?? 'Ukendt zone';
  try {
    output.zones[zoneId] = await resolveZone(feature, generatedAt, previous, dmiForecastStore, nextDmiForecastStore);
    console.log(`OK: ${zoneId} via ${output.zones[zoneId].provider}`);
  } catch (error) {
    output.errors.push({ zoneId, message: error instanceof Error ? error.message : String(error) });
  }
});

output.weatherEngine = {
  version: '2.8.0',
  concurrency: WEATHER_CONCURRENCY,
  providerPriority: output.providerPriority,
  providers: Object.fromEntries([...providerRuntime.entries()].map(([name, state]) => [name, {
    ...state,
    circuitOpen: providerCircuitOpen(name),
    averageLatencyMs: state.requests ? round(state.latencyTotalMs / state.requests, 0) : null
  }]))
};

const dmiCoverage = Object.values(nextDmiForecastStore.zones).map(record => dmiForecastCoverage(record, generatedAt));
nextDmiForecastStore.generatedAt = generatedAt;
nextDmiForecastStore.coverage = {
  zones: dmiCoverage.filter(item => item.available).length,
  minimumRemainingHours: dmiCoverage.length ? round(Math.min(...dmiCoverage.map(item => item.remainingHours)), 1) : 0,
  maximumRemainingHours: dmiCoverage.length ? round(Math.max(...dmiCoverage.map(item => item.remainingHours)), 1) : 0
};
output.weatherEngine.dmiForecastCache = nextDmiForecastStore.coverage;
await fs.mkdir('data/live', { recursive: true });
await fs.writeFile(DMI_FORECAST_STORE_PATH, `${JSON.stringify(nextDmiForecastStore, null, 2)}\n`);
await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
const previousHealth = await readHealth();
const weatherHealth = buildWeatherHealth(previousHealth, output, generatedAt);
await fs.writeFile(HEALTH_PATH, `${JSON.stringify(weatherHealth, null, 2)}\n`);

const fallbackZoneIds = Object.entries(output.zones)
  .filter(([, zone]) => zone.provider !== 'dmi')
  .map(([zoneId]) => zoneId);

if (dmiTransientFailure && fallbackZoneIds.length) {
  // Vent aldrig inde i samme GitHub-job. Den planlagte centrale kørsel starter igen
  // fem minutter senere og forsøger automatisk DMI først.
  output.retry = {
    dmiRetriedAfterMinutes: null,
    completedAt: null,
    nextCentralAttemptMinutes: 5,
    reason: 'DMI transient failure; fallback cache published immediately'
  };
  console.log('DMI fejlede midlertidigt. Fallback-data er gemt; næste centrale kørsel forsøger DMI igen om ca. 5 minutter.');
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
const previousHealth = await readHealth();
const weatherHealth = buildWeatherHealth(previousHealth, output, generatedAt);
await fs.writeFile(HEALTH_PATH, `${JSON.stringify(weatherHealth, null, 2)}\n`);
}

const counts = Object.values(output.zones).reduce((acc, zone) => {
  acc[zone.provider] = (acc[zone.provider] ?? 0) + 1; return acc;
}, {});
console.log(`Skrev ${OUTPUT_PATH}. Kilder: ${JSON.stringify(counts)}. Fejl: ${output.errors.length}.`);
if (!Object.keys(output.zones).length) process.exitCode = 1;
