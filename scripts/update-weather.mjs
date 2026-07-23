import fs from 'node:fs/promises';

const ZONES_PATH = 'data/zones.geojson';
const OUTPUT_PATH = 'data/live/conditions.json';
const DMI_ROOT = 'https://opendataapi.dmi.dk/v1/forecastedr/collections';
const REQUEST_TIMEOUT_MS = Number(process.env.WEATHER_REQUEST_TIMEOUT_MS ?? 18000);
const REQUEST_GAP_MS = Number(process.env.DMI_REQUEST_GAP_MS ?? 1400);
const DMI_MAX_RETRIES = Number(process.env.DMI_MAX_RETRIES ?? 1);
const USER_AGENT = process.env.WEATHER_USER_AGENT ?? 'RavRadar/2.4 (central weather updater)';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const num = value => Number.isFinite(Number(value)) ? Number(value) : null;
const round = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
const normalizeDegrees = value => ((value % 360) + 360) % 360;

let nextDmiRequestAt = 0;
let dmiCircuitOpen = false;
let dmiTransientFailure = false;

async function fetchJson(url, { provider, retries = 1, dmi = false } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (dmi) {
      if (dmiCircuitOpen) {
        const error = new Error('DMI-rategrænse aktiv');
        error.status = 429;
        throw error;
      }
      const wait = Math.max(0, nextDmiRequestAt - Date.now());
      if (wait) await sleep(wait);
      nextDmiRequestAt = Date.now() + REQUEST_GAP_MS;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json, application/geo+json', 'User-Agent': USER_AGENT },
        signal: controller.signal
      });
      if (response.ok) return await response.json();

      const error = new Error(`${provider}: HTTP ${response.status}`);
      error.status = response.status;
      if (dmi && response.status === 429) {
        dmiTransientFailure = true;
        if (attempt >= retries) dmiCircuitOpen = true;
      }
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        const retryAfter = Number(response.headers.get('retry-after'));
        await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : 2000 * 2 ** attempt);
        continue;
      }
      throw error;
    } catch (error) {
      lastError = error;
      if (dmi && (error?.name === 'AbortError' || error instanceof TypeError)) dmiTransientFailure = true;
      if ((error?.name === 'AbortError' || error instanceof TypeError) && attempt < retries) {
        await sleep(2000 * 2 ** attempt);
        continue;
      }
      throw error;
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
  const wind = await dmiPosition('harmonie_dini_sf', point, ['wind-speed-10m', 'wind-dir-10m']);
  const waves = collections.wave ? await dmiPosition(collections.wave, point, ['significant-wave-height', 'mean-wave-dir', 'dominant-wave-period']) : [];
  let ocean;
  try {
    ocean = await dmiPosition(collections.ocean, point, ['sea-mean-deviation', 'current-u', 'current-v', 'water-temperature']);
  } catch (error) {
    if (error?.status !== 400) throw error;
    ocean = await dmiPosition(collections.ocean, point, ['sea-mean-deviation', 'current-u', 'current-v']);
  }
  const w = nearest(wind, now);
  if (!w || num(w['wind-speed-10m']) === null) throw new Error('DMI-vinddata mangler');
  const wa = nearest(waves, now);
  const o = nearest(ocean, now);
  const o3 = atOrAfter(ocean, now + 3 * 3600000);
  const u = num(o?.['current-u']);
  const v = num(o?.['current-v']);
  const sea = num(o?.['sea-mean-deviation']);
  const sea3 = num(o3?.['sea-mean-deviation']);
  return {
    point,
    provider: 'dmi',
    providerLabel: 'DMI Open Data',
    modelSteps: { wind: w.step, wave: wa?.step ?? null, ocean: o?.step ?? null },
    current: {
      windSpeedMps: round(num(w['wind-speed-10m']), 1),
      windDirectionDeg: round(num(w['wind-dir-10m']), 0),
      waveHeightM: round(num(wa?.['significant-wave-height']), 2),
      waveDirectionDeg: round(num(wa?.['mean-wave-dir']), 0),
      wavePeriodS: round(num(wa?.['dominant-wave-period']), 1),
      waterLevelCm: sea === null ? null : round(sea * 100, 0),
      waterLevelTrendCm3h: sea === null || sea3 === null ? null : round((sea3 - sea) * 100, 0),
      currentSpeedMps: u === null || v === null ? null : round(Math.hypot(u, v), 2),
      currentDirectionDeg: u === null || v === null ? null : round(normalizeDegrees(Math.atan2(u, v) * 180 / Math.PI), 0),
      waterTemperatureC: round(num(o?.['water-temperature']), 1)
    }
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

async function readPrevious() {
  try { return JSON.parse(await fs.readFile(OUTPUT_PATH, 'utf8')); }
  catch { return { zones: {} }; }
}

async function resolveZone(feature, generatedAt, previous, { dmiOnly = false } = {}) {
  const zoneId = feature.properties?.id ?? 'Ukendt zone';
  const attempts = [];
  const providers = dmiOnly ? [['dmi', fromDmi]] : [['dmi', fromDmi], ['open-meteo', fromOpenMeteo], ['met-norway', fromMetNorway]];
  for (const [name, provider] of providers) {
    try {
      const result = await provider(feature, generatedAt);
      const history = historyFor(previous, zoneId, result.current, generatedAt);
      let forecast = previous?.zones?.[zoneId]?.forecast ?? null;
      try { forecast = await forecastFromOpenMeteo(feature); }
      catch (forecastError) { attempts.push({ provider: 'open-meteo-forecast', message: forecastError instanceof Error ? forecastError.message : String(forecastError) }); }
      return { ...result, ...history, forecast, stale: false, fallback: name !== 'dmi', attempts };
    } catch (error) {
      attempts.push({ provider: name, message: error instanceof Error ? error.message : String(error) });
      console.warn(`${zoneId}: ${name} fejlede: ${attempts.at(-1).message}`);
    }
  }
  const cached = previous?.zones?.[zoneId];
  if (cached?.current) return { ...cached, stale: true, fallback: true, provider: 'cache', providerLabel: 'Seneste cache', attempts };
  throw new Error(`${zoneId}: alle vejrkilder fejlede, og ingen cache findes`);
}

const zonesFile = JSON.parse(await fs.readFile(ZONES_PATH, 'utf8'));
const features = Array.isArray(zonesFile.features) ? zonesFile.features : [];
if (!features.length) throw new Error(`${ZONES_PATH} indeholder ingen zoner`);
const previous = await readPrevious();
const generatedAt = new Date().toISOString();
const output = {
  schemaVersion: 4, generatedAt,
  source: 'Central RavRadar weather service',
  providerPriority: ['dmi', 'open-meteo', 'met-norway', 'cache'],
  directionConventions: { windDirectionDeg: 'from', currentDirectionDeg: 'toward', waveDirectionDeg: 'from' },
  zones: {}, errors: [], retry: { dmiRetriedAfterMinutes: 0, completedAt: null }
};

for (const feature of features) {
  const zoneId = feature.properties?.id ?? 'Ukendt zone';
  try {
    output.zones[zoneId] = await resolveZone(feature, generatedAt, previous);
    console.log(`OK: ${zoneId} via ${output.zones[zoneId].provider}`);
  } catch (error) {
    output.errors.push({ zoneId, message: error.message });
  }
}

await fs.mkdir('data/live', { recursive: true });
await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);

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
}

const counts = Object.values(output.zones).reduce((acc, zone) => {
  acc[zone.provider] = (acc[zone.provider] ?? 0) + 1; return acc;
}, {});
console.log(`Skrev ${OUTPUT_PATH}. Kilder: ${JSON.stringify(counts)}. Fejl: ${output.errors.length}.`);
if (!Object.keys(output.zones).length) process.exitCode = 1;
