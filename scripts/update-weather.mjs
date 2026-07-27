import fs from 'node:fs/promises';
import {
  DMI_FORECAST_HOURS,
  buildDmiForecastHourly,
  createDmiForecastRecord,
  dmiForecastCoverage,
  interpolateWaterLevelStations,
  interpolateWaterLevelAlongCoast,
  selectDmiForecastAt
} from './lib/dmi-forecast-store.mjs';
import { buildDataQuality } from './lib/data-quality.mjs';
import { countDmiBackedZones, createPersistentDmiStore, prioritizeDmiFeatures, summarizeAvailableCoverage } from './lib/dmi-acquisition-state.mjs';

const ZONES_PATH = 'data/zones.geojson';
const OUTPUT_PATH = 'data/live/conditions.json';
const DMI_ROOT = 'https://opendataapi.dmi.dk/v1/forecastedr/collections';
const DMI_OCEAN_OBS_ROOT = 'https://opendataapi.dmi.dk/v2/oceanObs/collections';
const HEALTH_PATH = 'data/live/weather-health.json';
const DMI_FORECAST_STORE_PATH = 'data/live/dmi-forecast-cache.json';
const DMI_BULK_CACHE_PATH = 'data/live/dmi-bulk-cache.json';
const ALERT_MAX_PER_24H = Number(process.env.WEATHER_ALERT_MAX_PER_24H ?? 2);
const ALERT_FAILURE_MINUTES = Number(process.env.WEATHER_ALERT_FAILURE_MINUTES ?? 60);
const REQUEST_TIMEOUT_MS = Number(process.env.WEATHER_REQUEST_TIMEOUT_MS ?? 30000);
const REQUEST_GAP_MS = Number(process.env.DMI_REQUEST_GAP_MS ?? 12000);
const DMI_MAX_RETRIES = Number(process.env.DMI_MAX_RETRIES ?? 0);
const DMI_LIVE_ZONE_BUDGET = Math.max(1, Number(process.env.DMI_LIVE_ZONE_BUDGET ?? 4));
const DMI_REQUEST_BUDGET = Math.max(1, Number(process.env.DMI_REQUEST_BUDGET ?? 6));
const DMI_REQUEST_CONCURRENCY = Math.max(1, Number(process.env.DMI_REQUEST_CONCURRENCY ?? 1));
const DMI_CACHE_REFRESH_BELOW_HOURS = Math.max(1, Number(process.env.DMI_CACHE_REFRESH_BELOW_HOURS ?? 24));
const DMI_SCHEDULE_INTERVAL_MINUTES = Math.max(1, Number(process.env.DMI_SCHEDULE_INTERVAL_MINUTES ?? 10));
const DMI_OBSERVATION_INTERVAL_MINUTES = Math.max(10, Number(process.env.DMI_OBSERVATION_INTERVAL_MINUTES ?? 60));
const DMI_DEPLOYED_CACHE_URL = process.env.DMI_DEPLOYED_CACHE_URL ?? null;
const WEATHER_CONCURRENCY = Math.max(1, Number(process.env.WEATHER_CONCURRENCY ?? 6));
const PROVIDER_FAILURE_THRESHOLD = Math.max(1, Number(process.env.WEATHER_PROVIDER_FAILURE_THRESHOLD ?? 4));
const PROVIDER_COOLDOWN_MS = Number(process.env.WEATHER_PROVIDER_COOLDOWN_MS ?? 10 * 60 * 1000);
const USER_AGENT = process.env.WEATHER_USER_AGENT ?? 'RavRadar/2.4 (central weather updater)';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const num = value => value === null || value === undefined || value === '' ? null : (Number.isFinite(Number(value)) ? Number(value) : null);
const round = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
const normalizeDegrees = value => ((value % 360) + 360) % 360;

let nextDmiRequestAt = 0;
let activeDmiRequests = 0;
const dmiRequestWaiters = [];

async function acquireDmiRequestSlot() {
  if (activeDmiRequests < DMI_REQUEST_CONCURRENCY) { activeDmiRequests += 1; return; }
  await new Promise(resolve => dmiRequestWaiters.push(resolve));
  activeDmiRequests += 1;
}

function releaseDmiRequestSlot() {
  activeDmiRequests = Math.max(0, activeDmiRequests - 1);
  dmiRequestWaiters.shift()?.();
}
let dmiTransientFailure = false;
let dmiRateLimitedUntil = 0;
let dmiRequestBudgetUsed = 0;
let dmiRateLimitTriggered = false;
let dmiHttp429Count = 0;
const dmiAcquisitionStats = { assignedZoneIds: [], attemptedZoneIds: [], successfulZoneIds: [], stoppedZoneIds: [], cursorAdvancedForZoneIds: [] };
let dmiObservationSkipReason = null;
let dmiPersistentRuntime = {
  nextZoneCursor: 0,
  rateLimitedUntil: null,
  lastAttemptedZoneId: null,
  lastAttemptAt: null,
  lastSuccessfulZoneId: null,
  lastSuccessAt: null,
  lastObservationAt: null
};
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
  if (dmi && dmiRequestBudgetUsed >= DMI_REQUEST_BUDGET) {
    const error = new Error(`${provider}: DMI requestbudget opbrugt (${DMI_REQUEST_BUDGET} kald)`);
    error.code = 'DMI_REQUEST_BUDGET_EXHAUSTED';
    throw error;
  }
  if (dmi && Date.now() < dmiRateLimitedUntil) {
    const seconds = Math.ceil((dmiRateLimitedUntil - Date.now()) / 1000);
    const error = new Error(`${provider}: DMI rate-limit cooldown active (${seconds}s tilbage)`);
    error.code = 'DMI_RATE_LIMIT_COOLDOWN';
    throw error;
  }
  const state = providerState(provider);
  if (providerCircuitOpen(provider)) {
    const error = new Error(`${provider}: circuit breaker active`);
    error.code = 'CIRCUIT_OPEN';
    throw error;
  }
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (dmi) {
      if (dmiRequestBudgetUsed >= DMI_REQUEST_BUDGET) {
        const error = new Error(`${provider}: DMI requestbudget opbrugt (${DMI_REQUEST_BUDGET} kald)`);
        error.code = 'DMI_REQUEST_BUDGET_EXHAUSTED';
        throw error;
      }
      dmiRequestBudgetUsed += 1;
      await acquireDmiRequestSlot();
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
        const retryAfterHeader = response.headers.get('retry-after');
        if (retryAfterHeader) error.retryAfter = Number(retryAfterHeader);
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
      if (dmi && error?.status === 429) {
        dmiRateLimitTriggered = true;
        dmiHttp429Count += 1;
        const retryAfterSeconds = Number(error?.retryAfter);
        const cooldownMs = Number.isFinite(retryAfterSeconds) ? Math.max(60_000, retryAfterSeconds * 1000) : 15 * 60 * 1000;
        dmiRateLimitedUntil = Math.max(dmiRateLimitedUntil, Date.now() + cooldownMs);
        dmiPersistentRuntime.rateLimitedUntil = new Date(dmiRateLimitedUntil).toISOString();
        state.circuitOpenedAt = Date.now();
        throw lastError;
      }
      const retryable = error?.status >= 500 || error?.name === 'AbortError' || error instanceof TypeError;
      if (!retryable || attempt >= retries) throw lastError;
      await sleep(Math.min(5000, 750 * 2 ** attempt));
    } finally {
      clearTimeout(timeout);
      if (dmi) releaseDmiRequestSlot();
    }
  }
  throw lastError ?? new Error(`${provider}: ukendt fejl`);
}


async function fetchAllFeatures(baseUrl, params, options = {}, { pageSize = 1000, maxPages = 20 } = {}) {
  const all = [];
  let nextUrl = null;
  for (let page = 0; page < maxPages; page += 1) {
    const query = new URLSearchParams({ ...params, limit: String(pageSize), offset: String(page * pageSize) });
    const data = await fetchJson(nextUrl ?? `${baseUrl}?${query}`, options);
    const features = Array.isArray(data.features) ? data.features : [];
    all.push(...features);
    nextUrl = (data.links ?? []).find(link => link?.rel === 'next' && link?.href)?.href ?? null;
    if (!nextUrl && features.length < pageSize) break;
  }
  return all;
}

function pointInRing(point, ring) {
  if (!Array.isArray(ring) || ring.length < 3) return false;
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    const intersects = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInFeature(point, feature) {
  const geometry = feature?.geometry;
  if (!geometry) return false;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  return polygons.some(polygon => pointInRing(point, polygon[0]) && !(polygon.slice(1).some(hole => pointInRing(point, hole))));
}

function stationSiteKey(station) {
  const normalizedName = String(station.name ?? '')
    .toLocaleLowerCase('da-DK')
    .replace(/\b(havn|station)\b/g, '')
    .replace(/\b[ivx]+\b$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const [lon, lat] = station.point ?? [];
  return `${normalizedName}|${Number(lon).toFixed(3)}|${Number(lat).toFixed(3)}`;
}

function deduplicateStationSites(stations, levels) {
  const bySite = new Map();
  for (const station of stations) {
    const level = levels.get(station.stationId);
    if (!level || !Number.isFinite(Number(level.valueCm))) continue;
    const key = stationSiteKey(station);
    const existing = bySite.get(key);
    const candidateTime = Date.parse(level.observed) || 0;
    const existingTime = existing ? (Date.parse(levels.get(existing.stationId)?.observed) || 0) : -1;
    if (!existing || candidateTime > existingTime) bySite.set(key, station);
  }
  return [...bySite.values()];
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
    dmiWaterStationsPromise = fetchAllFeatures(`${DMI_OCEAN_OBS_ROOT}/station/items`, { status: 'Active' }, {
      provider: 'DMI oceanObs stations', retries: DMI_MAX_RETRIES, dmi: true
    }).then(features => features.map(feature => ({
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
    dmiLatestSeaLevelPromise = fetchAllFeatures(`${DMI_OCEAN_OBS_ROOT}/observation/items`, {
      parameterId: 'sealev_ln', period: 'latest-hour', sortorder: 'observed,DESC'
    }, {
      provider: 'DMI oceanObs water level', retries: DMI_MAX_RETRIES, dmi: true
    }, { pageSize: 1000, maxPages: 20 }).then(features => {
      const latest = new Map();
      for (const feature of features) {
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


function featureCoastLine(feature) {
  const line = feature?.properties?.coastLine;
  return Array.isArray(line) && line.length >= 2 ? line : [zonePoint(feature)];
}

function endpointDistanceKm(a, b) { return haversineKm(a, b); }
function featureDistanceKm(a, b) {
  const aa = featureCoastLine(a), bb = featureCoastLine(b);
  let best = Infinity;
  for (const x of [aa[0], aa.at(-1)]) for (const y of [bb[0], bb.at(-1)]) best = Math.min(best, endpointDistanceKm(x, y));
  return best;
}

function buildCoastCorridors(allFeatures) {
  const groups = new Map();
  for (const feature of allFeatures) {
    const key = `${feature.properties?.batch ?? 'legacy'}|${feature.properties?.coastType ?? 'unknown'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(feature);
  }
  const byZone = new Map();
  for (const features of groups.values()) {
    const remaining = new Set(features);
    while (remaining.size) {
      const seed = remaining.values().next().value;
      const component = [seed]; remaining.delete(seed);
      let changed = true;
      while (changed) {
        changed = false;
        for (const candidate of [...remaining]) {
          if (component.some(item => featureDistanceKm(item, candidate) <= 30)) { component.push(candidate); remaining.delete(candidate); changed = true; }
        }
      }
      component.sort((a,b)=>String(a.properties?.id).localeCompare(String(b.properties?.id), 'en', {numeric:true}));
      let path = [];
      for (const feature of component) {
        let line = [...featureCoastLine(feature)];
        if (path.length) {
          const end = path.at(-1);
          if (haversineKm(end, line.at(-1)) < haversineKm(end, line[0])) line.reverse();
        }
        if (path.length && haversineKm(path.at(-1), line[0]) < 0.1) line = line.slice(1);
        path.push(...line);
      }
      for (const feature of component) byZone.set(feature.properties?.id, path);
    }
  }
  return byZone;
}

async function observedDmiWaterLevel(feature, coastCorridors) {
  try {
    const [rawStations, levels] = await Promise.all([dmiWaterStations(), dmiLatestSeaLevels()]);
    const stations = deduplicateStationSites(rawStations, levels);
    const point = zonePoint(feature);
    const inside = stations
      .filter(station => pointInFeature(station.point, feature))
      .sort((a, b) => haversineKm(point, a.point) - haversineKm(point, b.point));
    if (inside.length) {
      const station = inside[0];
      const level = levels.get(station.stationId);
      return {
        valueCm: round(Number(level.valueCm), 0),
        method: 'direct-zone-station',
        stations: [{ stationId: station.stationId, name: station.name, valueCm: round(Number(level.valueCm), 0), distanceKm: round(haversineKm(point, station.point), 1), side: 'inside-zone', weight: 1, observed: level.observed, observationAgeMinutes: Number.isFinite(Date.parse(level.observed)) ? round((Date.now() - Date.parse(level.observed)) / 60000, 0) : null, qcStatus: level.qcStatus ?? null }]
      };
    }
    const coastPath = coastCorridors.get(feature.properties?.id);
    return interpolateWaterLevelAlongCoast(point, coastPath, stations, levels, { haversineKm, requireBracket: true });
  } catch (error) {
    if (!['DMI_RATE_LIMIT_COOLDOWN', 'CIRCUIT_OPEN'].includes(error?.code) && error?.status !== 429) {
      console.warn(`DMI kystvandstand fejlede: ${error instanceof Error ? error.message : String(error)}`);
    }
    return null;
  }
}

function applyObservedWaterLevel(zone, feature, observation, generatedAt) {
  if (!zone?.current || !observation || !Number.isFinite(Number(observation.valueCm))) return zone;
  const previousValue = num(zone.current.waterLevelCm);
  zone.current.waterLevelCm = observation.valueCm;
  zone.waterLevel = {
    ...(zone.waterLevel ?? {}),
    source: ['direct-zone-station','direct-coast-station'].includes(observation.method) ? 'dmi-observation-direct' : 'dmi-observation-coast-interpolation',
    reference: ['direct-zone-station','direct-coast-station'].includes(observation.method) ? 'Aktuel DMI-målestation ved zonen' : 'Aktuel DMI-vandstand interpoleret mellem én station på hver side langs samme kystkorridor',
    interpolation: observation,
    diagnostic: {
      ...(zone.waterLevel?.diagnostic ?? {}), zoneId: feature.properties?.id, zoneName: feature.properties?.name, generatedAt,
      displayValueCm: observation.valueCm, displaySource: observation.method, fallbackModelValueCm: previousValue,
      observationInterpolatedCm: observation.valueCm, observationMethod: observation.method, observationStations: observation.stations,
      observationUsedForDisplay: true
    }
  };
  return zone;
}


async function readDmiBulkCache() {
  try {
    const parsed = JSON.parse(await fs.readFile(DMI_BULK_CACHE_PATH, 'utf8'));
    return [1, 2].includes(parsed?.schemaVersion) && parsed?.zones ? parsed : null;
  } catch {
    return null;
  }
}

function bulkZoneToForecastRecord(feature, bulkCache, generatedAt, previousRecord = null) {
  const zoneId = feature.properties?.id;
  const bulkZone = bulkCache?.zones?.[zoneId];
  const rows = Object.values(bulkZone?.hourly ?? {}).filter(row => Number.isFinite(Date.parse(row?.time))).sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  if (!rows.length) return null;
  const wind = rows.map(row => ({ step: row.time, 'wind-speed-10m': num(row['wind-speed-10m']), 'wind-dir-10m': num(row['wind-dir-10m']) }));
  const waves = rows.map(row => ({ step: row.time, 'significant-wave-height': num(row['significant-wave-height']), 'mean-wave-dir': num(row['mean-wave-dir']), 'dominant-wave-period': num(row['dominant-wave-period']) }));
  const ocean = rows.map(row => ({ step: row.time, 'sea-mean-deviation': num(row['sea-mean-deviation']), 'current-u': num(row['current-u']), 'current-v': num(row['current-v']), 'water-temperature': num(row['water-temperature']) }));
  const built = buildDmiForecastHourly({ wind, waves, ocean, generatedAt, hours: DMI_FORECAST_HOURS });
  const marine = ocean.some(item => num(item['sea-mean-deviation']) !== null && num(item['current-u']) !== null && num(item['current-v']) !== null);
  const windAvailable = wind.some(item => num(item['wind-speed-10m']) !== null && num(item['wind-dir-10m']) !== null);
  const waveRequired = dmiCollections(feature.properties?.coastType).wave !== null;
  const waveAvailable = !waveRequired || waves.some(item => num(item['significant-wave-height']) !== null);
  if (!marine && !windAvailable && !waveAvailable) return null;
  const mergedHourly = mergeHourlyPreferDmi(built.hourly, previousRecord?.hourly ?? []);
  const oldCompleteness = previousRecord?.model?.completeness ?? {};
  return createDmiForecastRecord({
    zoneId,
    point: zonePoint(feature),
    generatedAt: bulkCache.generatedAt ?? generatedAt,
    hourly: mergedHourly,
    waterLevelInterpolation: previousRecord?.waterLevelInterpolation ?? null,
    model: {
      ...(previousRecord?.model ?? {}),
      wind: windAvailable ? 'harmonie_dini_sf-stac-grib' : previousRecord?.model?.wind ?? null,
      wave: waveAvailable && waveRequired ? `${dmiCollections(feature.properties?.coastType).wave}-stac-grib` : previousRecord?.model?.wave ?? null,
      ocean: marine ? `${dmiCollections(feature.properties?.coastType).ocean}-stac-grib` : previousRecord?.model?.ocean ?? null,
      completeness: {
        ...oldCompleteness,
        phase: 'bulk-stac-grib',
        ocean: marine || oldCompleteness.ocean === true,
        current: marine || oldCompleteness.current === true,
        wind: windAvailable || oldCompleteness.wind === true,
        wave: waveAvailable || oldCompleteness.wave === true,
        acquisitionMethod: 'whole-GRIB nearest-valid-original-grid-point',
        spatialInterpolation: false,
        gridPoints: bulkZone.gridPoints ?? {},
        collections: bulkZone.collections ?? {}
      }
    }
  });
}

function mergeBulkCacheIntoForecastStore(features, bulkCache, store, generatedAt) {
  const stats = { available: Boolean(bulkCache), zonesExamined: 0, zonesMerged: 0, marineZones: 0, windZones: 0, waveZones: 0, errors: [] };
  if (!bulkCache) return stats;
  for (const feature of features) {
    const zoneId = feature.properties?.id;
    if (!zoneId || !bulkCache.zones?.[zoneId]) continue;
    stats.zonesExamined += 1;
    try {
      const record = bulkZoneToForecastRecord(feature, bulkCache, generatedAt, store.zones?.[zoneId] ?? null);
      if (!record) continue;
      store.zones[zoneId] = record;
      stats.zonesMerged += 1;
      if (record.model?.completeness?.ocean) stats.marineZones += 1;
      if (record.model?.completeness?.wind) stats.windZones += 1;
      if (record.model?.completeness?.wave) stats.waveZones += 1;
    } catch (error) {
      stats.errors.push({ zoneId, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return stats;
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

async function fromDmi(feature, generatedAt, { includeAtmosphere = false } = {}) {
  const point = zonePoint(feature);
  const collections = dmiCollections(feature.properties?.coastType);
  const now = Date.parse(generatedAt);
  const componentErrors = [];

  // Fase 1 prioriterer de havdata, RavRadar er mest afhængig af: vandstand,
  // strøm og temperatur. Vind og bølger hentes først, når alle zoner har en
  // gyldig marin DMI-cache. Det holder DMI-forbruget nede under opvarmningen.
  let ocean = [];
  try {
    try {
      ocean = await dmiPosition(collections.ocean, point, ['sea-mean-deviation', 'current-u', 'current-v', 'water-temperature']);
    } catch (error) {
      if (error?.status !== 400) throw error;
      ocean = await dmiPosition(collections.ocean, point, ['sea-mean-deviation', 'current-u', 'current-v']);
    }
  } catch (error) {
    componentErrors.push({ component: 'ocean', collection: collections.ocean, message: error instanceof Error ? error.message : String(error) });
    throw error;
  }
  if (!ocean.some(item => num(item['sea-mean-deviation']) !== null || (num(item['current-u']) !== null && num(item['current-v']) !== null))) {
    throw new Error('DMI-havdata mangler vandstand og strøm');
  }

  let wind = [];
  let waves = [];
  if (includeAtmosphere) {
    try {
      wind = await dmiPosition('harmonie_dini_sf', point, ['wind-speed-10m', 'wind-dir-10m']);
    } catch (error) {
      componentErrors.push({ component: 'wind', collection: 'harmonie_dini_sf', message: error instanceof Error ? error.message : String(error) });
    }
    if (collections.wave) {
      try {
        waves = await dmiPosition(collections.wave, point, ['significant-wave-height', 'mean-wave-dir', 'dominant-wave-period']);
      } catch (error) {
        componentErrors.push({ component: 'wave', collection: collections.wave, message: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  const stationWaterLevel = null;
  const w = nearest(wind, now);
  const wa = nearest(waves, now);
  const o = nearest(ocean, now);
  const dmiForecast = buildDmiForecastHourly({ wind, waves, ocean, observedWaterLevel: stationWaterLevel, generatedAt, hours: DMI_FORECAST_HOURS });
  const zoneId = feature.properties?.id ?? 'Ukendt zone';
  const completeness = {
    phase: includeAtmosphere ? 'full-dmi' : 'marine-first',
    wind: wind.some(item => num(item['wind-speed-10m']) !== null),
    wave: !collections.wave || waves.some(item => num(item['significant-wave-height']) !== null),
    ocean: ocean.some(item => num(item['sea-mean-deviation']) !== null),
    current: ocean.some(item => num(item['current-u']) !== null && num(item['current-v']) !== null),
    componentErrors
  };
  const forecastRecord = createDmiForecastRecord({
    zoneId, point, generatedAt, hourly: dmiForecast.hourly,
    waterLevelInterpolation: stationWaterLevel,
    model: { wind: completeness.wind ? 'harmonie_dini_sf' : null, wave: completeness.wave && collections.wave ? collections.wave : null, ocean: collections.ocean, completeness }
  });
  const currentForecast = selectDmiForecastAt(forecastRecord, generatedAt) ?? dmiForecast.hourly[0];
  return {
    point, provider: 'dmi', providerLabel: includeAtmosphere ? 'DMI Open Data' : 'DMI havdata + Open-Meteo fallback',
    modelSteps: { wind: w?.step ?? null, wave: wa?.step ?? null, ocean: o?.step ?? null },
    dmiCompleteness: completeness,
    current: {
      windSpeedMps: currentForecast.windSpeedMps, windDirectionDeg: currentForecast.windDirectionDeg,
      waveHeightM: currentForecast.waveHeightM, waveDirectionDeg: currentForecast.waveDirectionDeg,
      wavePeriodS: currentForecast.wavePeriodS, waterLevelCm: currentForecast.waterLevelCm,
      waterLevelTrendCm3h: currentForecast.waterLevelTrendCm3h, currentSpeedMps: currentForecast.currentSpeedMps,
      currentDirectionDeg: currentForecast.currentDirectionDeg, waterTemperatureC: currentForecast.waterTemperatureC
    },
    waterLevel: {
      source: 'dmi-model-authoritative',
      reference: 'DMI sea-mean-deviation',
      interpolation: null, modelBiasCm: dmiForecast.waterLevelBiasCm,
      diagnostic: waterLevelDiagnostic({ feature, point, collections, currentForecast, stationWaterLevel, forecastRecord, generatedAt })
    },
    dmiForecast: forecastRecord
  };
}

function mergeHourlyPreferDmi(dmiHourly = [], fallbackHourly = []) {
  const fallbackByTime = new Map((fallbackHourly ?? []).map(item => [item.time, item]));
  return (dmiHourly ?? []).map((item, index) => {
    const fallback = fallbackByTime.get(item.time) ?? fallbackHourly?.[index] ?? {};
    return {
      ...fallback,
      ...item,
      windSpeedMps: item.windSpeedMps ?? fallback.windSpeedMps ?? null,
      windDirectionDeg: item.windDirectionDeg ?? fallback.windDirectionDeg ?? null,
      waveHeightM: item.waveHeightM ?? fallback.waveHeightM ?? null,
      waveDirectionDeg: item.waveDirectionDeg ?? fallback.waveDirectionDeg ?? null,
      wavePeriodS: item.wavePeriodS ?? fallback.wavePeriodS ?? null,
      waterLevelCm: item.waterLevelCm ?? fallback.waterLevelCm ?? null,
      waterLevelTrendCm3h: item.waterLevelTrendCm3h ?? fallback.waterLevelTrendCm3h ?? null,
      currentSpeedMps: item.currentSpeedMps ?? fallback.currentSpeedMps ?? null,
      currentDirectionDeg: item.currentDirectionDeg ?? fallback.currentDirectionDeg ?? null,
      waterTemperatureC: item.waterTemperatureC ?? fallback.waterTemperatureC ?? null
    };
  });
}

function mergeDmiWithFallback(dmiResult, fallbackZone) {
  if (!fallbackZone) return dmiResult;
  const mergedCurrent = {};
  for (const key of ['windSpeedMps','windDirectionDeg','waveHeightM','waveDirectionDeg','wavePeriodS','waterLevelCm','waterLevelTrendCm3h','currentSpeedMps','currentDirectionDeg','waterTemperatureC']) {
    mergedCurrent[key] = dmiResult.current?.[key] ?? fallbackZone.current?.[key] ?? null;
  }
  const dmiForecast = dmiResult.dmiForecast;
  if (dmiForecast) dmiForecast.hourly = mergeHourlyPreferDmi(dmiForecast.hourly, fallbackZone.forecast?.hourly ?? []);
  return {
    ...fallbackZone,
    ...dmiResult,
    provider: 'dmi',
    providerLabel: dmiResult.providerLabel,
    current: mergedCurrent,
    modelSteps: {
      wind: dmiResult.modelSteps?.wind ?? fallbackZone.modelSteps?.wind ?? null,
      wave: dmiResult.modelSteps?.wave ?? fallbackZone.modelSteps?.wave ?? null,
      ocean: dmiResult.modelSteps?.ocean ?? fallbackZone.modelSteps?.ocean ?? null
    }
  };
}

function recordHasMarine(record, generatedAt) {
  const coverage = dmiForecastCoverage(record, generatedAt);
  const completeness = record?.model?.completeness ?? {};
  return coverage.available && completeness.ocean === true;
}

function recordHasAtmosphere(record, generatedAt) {
  const coverage = dmiForecastCoverage(record, generatedAt);
  const completeness = record?.model?.completeness ?? {};
  return coverage.available && completeness.wind === true && completeness.wave === true;
}

function waterLevelDiagnostic({ feature, point, collections, currentForecast, stationWaterLevel, forecastRecord, generatedAt, fromCache = false } = {}) {
  const modelCm = num(currentForecast?.waterLevelModelCm ?? currentForecast?.waterLevelCm);
  const observedCm = num(stationWaterLevel?.valueCm);
  return {
    zoneId: feature?.properties?.id ?? forecastRecord?.zoneId ?? null,
    zoneName: feature?.properties?.name ?? null,
    point,
    generatedAt,
    displayValueCm: num(currentForecast?.waterLevelCm),
    displaySource: currentForecast?.waterLevelSource ?? (fromCache ? 'dmi-model-cache' : 'dmi-model-authoritative'),
    modelValueCm: modelCm,
    modelStep: currentForecast?.time ?? null,
    modelCollection: collections?.ocean ?? forecastRecord?.model?.ocean ?? null,
    observationInterpolatedCm: observedCm,
    modelObservationDifferenceCm: modelCm !== null && observedCm !== null ? round(observedCm - modelCm, 0) : null,
    observationMethod: stationWaterLevel?.method ?? null,
    observationStations: stationWaterLevel?.stations ?? [],
    observationUsedForDisplay: false,
    cache: fromCache ? { generatedAt: forecastRecord?.generatedAt ?? null, validUntil: forecastRecord?.validUntil ?? null } : null
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

function newerDmiRecord(a, b) {
  if (!a) return b;
  if (!b) return a;
  const aGenerated = Date.parse(a.generatedAt ?? '');
  const bGenerated = Date.parse(b.generatedAt ?? '');
  if (Number.isFinite(aGenerated) && Number.isFinite(bGenerated) && aGenerated !== bGenerated) return bGenerated > aGenerated ? b : a;
  return Date.parse(b.validUntil ?? '') > Date.parse(a.validUntil ?? '') ? b : a;
}

function mergeDmiStores(...stores) {
  const valid = stores.filter(store => store?.zones && typeof store.zones === 'object');
  const merged = { schemaVersion: 2, zones: {}, runtime: {} };
  for (const store of valid) {
    for (const [zoneId, record] of Object.entries(store.zones ?? {})) merged.zones[zoneId] = newerDmiRecord(merged.zones[zoneId], record);
    const candidateRuntime = store.runtime ?? {};
    const currentAttempt = Date.parse(merged.runtime.lastAttemptAt ?? '');
    const candidateAttempt = Date.parse(candidateRuntime.lastAttemptAt ?? '');
    if (!Number.isFinite(currentAttempt) || candidateAttempt > currentAttempt) merged.runtime = { ...merged.runtime, ...candidateRuntime };
  }
  return merged;
}

async function readDmiForecastStore() {
  let local = { schemaVersion: 1, zones: {} };
  try {
    const parsed = JSON.parse(await fs.readFile(DMI_FORECAST_STORE_PATH, 'utf8'));
    if (parsed?.zones && typeof parsed.zones === 'object') local = parsed;
  } catch {}
  if (!DMI_DEPLOYED_CACHE_URL) return local;
  try {
    const remote = await fetchJson(DMI_DEPLOYED_CACHE_URL, { provider: 'Deployed DMI cache', retries: 1 });
    const merged = mergeDmiStores(local, remote);
    console.log(`DMI-cache sammenflettet: lokal=${Object.keys(local.zones ?? {}).length}, deployed=${Object.keys(remote.zones ?? {}).length}, resultat=${Object.keys(merged.zones).length}`);
    return merged;
  } catch (error) {
    console.warn(`Kun lokal DMI-cache bruges; deployed cache kunne ikke hentes: ${error instanceof Error ? error.message : String(error)}`);
    return local;
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
      modelBiasCm: selected.waterLevelBiasCm ?? null,
      diagnostic: waterLevelDiagnostic({ feature, point: zonePoint(feature), collections: { ocean: record?.model?.ocean }, currentForecast: selected, stationWaterLevel: record.waterLevelInterpolation ?? null, forecastRecord: record, generatedAt, fromCache: true })
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

async function resolveZone(feature, generatedAt, previous, dmiForecastStore, nextDmiForecastStore, { dmiOnly = false, allowLiveDmi = true } = {}) {
  const zoneId = feature.properties?.id ?? 'Ukendt zone';
  const attempts = [];

  const existingRecord = dmiForecastStore?.zones?.[zoneId];
  const existingCoverage = dmiForecastCoverage(existingRecord, generatedAt);
  const healthyCachedDmi = existingCoverage.available && existingCoverage.remainingHours > DMI_CACHE_REFRESH_BELOW_HOURS
    ? zoneFromDmiForecastCache(feature, existingRecord, generatedAt)
    : null;
  if (healthyCachedDmi) {
    const history = historyFor(previous, zoneId, healthyCachedDmi.current, generatedAt);
    nextDmiForecastStore.zones[zoneId] = existingRecord;
    return { ...healthyCachedDmi, ...history, stale: false, fallback: false, attempts, acquisition: { mode: 'cache-first', remainingHours: existingCoverage.remainingHours } };
  }

  if (allowLiveDmi) try {
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
  } else {
    attempts.push({ provider: 'dmi', message: `Live DMI udsat til en senere rullende kørsel (op til ${DMI_LIVE_ZONE_BUDGET} zoner pr. kørsel)` });
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
  const dmiCounts = countDmiBackedZones(output.zones);
  const dmiCount = dmiCounts.total;
  const liveDmiCount = dmiCounts.live;
  const total = Object.keys(output.zones).length;
  const dmiHealthy = total > 0 && dmiCount / total >= 0.8 && !dmiTransientFailure;
  const failureSince = dmiHealthy ? null : (previousHealth.dmi?.consecutiveFailureSince ?? previousHealth.consecutiveFailureSince ?? nowIso);
  const failureMinutes = failureSince ? Math.max(0, Math.round((now - Date.parse(failureSince)) / 60000)) : 0;
  const recentAlerts = (previousHealth.alertHistory ?? []).filter(item => now - Date.parse(item.sentAt) < 24 * 3600000);
  const alertEligible = !dmiHealthy && failureMinutes >= ALERT_FAILURE_MINUTES && recentAlerts.length < ALERT_MAX_PER_24H;
  const alertHistory = alertEligible
    ? [...recentAlerts, { sentAt: nowIso, reason: 'DMI-data har været utilstrækkelige i længere tid', dmiZones: dmiCount, totalZones: total }]
    : recentAlerts;
  return {
    generatedAt: nowIso,
    status: dmiHealthy ? 'ok' : (failureMinutes >= ALERT_FAILURE_MINUTES ? 'alarm' : 'warning'),
    dmi: { healthy: dmiHealthy, zonesFromDmi: dmiCount, totalZones: total, coveragePercent: total ? round(dmiCount / total * 100, 1) : 0, consecutiveFailureSince: failureSince, failureMinutes, lastSuccessfulAt: liveDmiCount > 0 ? nowIso : (previousHealth.dmi?.lastSuccessfulAt ?? previousHealth.lastSuccessfulDmiAt ?? null) },
    alerts: { maxPer24Hours: ALERT_MAX_PER_24H, sentLast24Hours: alertHistory.length, shouldNotifyAdministrator: alertEligible, nextAllowedAfter: alertHistory.length >= ALERT_MAX_PER_24H ? alertHistory[0].sentAt : null },
    providers: output.weatherEngine?.providers ?? {},
    dmiForecastCache: output.weatherEngine?.dmiForecastCache ?? { zones: 0, minimumRemainingHours: 0, maximumRemainingHours: 0 },
    alertHistory
  };
}

const zonesFile = JSON.parse(await fs.readFile(ZONES_PATH, 'utf8'));
const features = Array.isArray(zonesFile.features) ? zonesFile.features : [];
if (!features.length) throw new Error(`${ZONES_PATH} indeholder ingen zoner`);
const coastCorridors = buildCoastCorridors(features);
const previous = await readPrevious();
const dmiForecastStore = await readDmiForecastStore();
const dmiBulkCache = await readDmiBulkCache();
const generatedAt = new Date().toISOString();
const activeZoneIds = features.map(feature => feature.properties?.id).filter(Boolean);
const nextDmiForecastStore = createPersistentDmiStore(dmiForecastStore, activeZoneIds, DMI_FORECAST_HOURS);
const dmiBulkMergeStats = mergeBulkCacheIntoForecastStore(features, dmiBulkCache, nextDmiForecastStore, generatedAt);
dmiPersistentRuntime = nextDmiForecastStore.runtime;
const persistedCooldown = Date.parse(dmiPersistentRuntime.rateLimitedUntil ?? '');
if (Number.isFinite(persistedCooldown) && persistedCooldown > Date.now()) dmiRateLimitedUntil = persistedCooldown;
else dmiPersistentRuntime.rateLimitedUntil = null;
let dmiStoreWriteChain = Promise.resolve();
async function writeDmiForecastStoreCheckpoint() {
  const payload = `${JSON.stringify(nextDmiForecastStore, null, 2)}\n`;
  dmiStoreWriteChain = dmiStoreWriteChain.then(async () => {
    await fs.mkdir('data/live', { recursive: true });
    const temporaryPath = `${DMI_FORECAST_STORE_PATH}.tmp`;
    await fs.writeFile(temporaryPath, payload);
    await fs.rename(temporaryPath, DMI_FORECAST_STORE_PATH);
  });
  return dmiStoreWriteChain;
}
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

const { stable: stableFeatures } = prioritizeDmiFeatures(
  features,
  dmiForecastStore,
  generatedAt,
  dmiForecastCoverage,
  dmiPersistentRuntime.nextZoneCursor
);

// Først bygges en komplet og robust Open-Meteo/fallback-visning for alle zoner.
// DMI-køen nedenfor erstatter derefter de felter, der lykkes, uden at en DMI-fejl
// kan efterlade en zone uden vind eller bølger.
await mapWithConcurrency(features, WEATHER_CONCURRENCY, async feature => {
  const zoneId = feature.properties?.id ?? 'Ukendt zone';
  try {
    output.zones[zoneId] = await resolveZone(feature, generatedAt, previous, dmiForecastStore, nextDmiForecastStore, { allowLiveDmi: false });
    console.log(`OK: ${zoneId} via ${output.zones[zoneId].provider}`);
  } catch (error) {
    output.errors.push({ zoneId, message: error instanceof Error ? error.message : String(error) });
  }
});

const marineCacheCompleteAtStart = activeZoneIds.every(zoneId => recordHasMarine(nextDmiForecastStore.zones?.[zoneId], generatedAt));
const acquisitionPhase = marineCacheCompleteAtStart ? 'dmi-wind-wave-enrichment' : 'dmi-marine-cache-warmup';
const cursorStart = Math.max(0, Number(dmiPersistentRuntime.nextZoneCursor) || 0) % Math.max(1, stableFeatures.length);
const rotatedStable = [...stableFeatures.slice(cursorStart), ...stableFeatures.slice(0, cursorStart)];
const targetFeatures = rotatedStable.filter(feature => {
  const zoneId = feature.properties?.id;
  const record = nextDmiForecastStore.zones?.[zoneId];
  return acquisitionPhase === 'dmi-marine-cache-warmup'
    ? !recordHasMarine(record, generatedAt)
    : !recordHasAtmosphere(record, generatedAt);
});

let liveDmiAssigned = 0;
for (const feature of targetFeatures) {
  if (liveDmiAssigned >= DMI_LIVE_ZONE_BUDGET || dmiRequestBudgetUsed >= DMI_REQUEST_BUDGET) break;
  if (dmiRateLimitTriggered || Date.now() < dmiRateLimitedUntil) break;
  const zoneId = feature.properties?.id ?? 'Ukendt zone';
  liveDmiAssigned += 1;
  dmiAcquisitionStats.assignedZoneIds.push(zoneId);
  dmiAcquisitionStats.attemptedZoneIds.push(zoneId);
  dmiPersistentRuntime.lastAttemptedZoneId = zoneId;
  dmiPersistentRuntime.lastAttemptAt = new Date().toISOString();
  try {
    const dmiResult = await fromDmi(feature, generatedAt, { includeAtmosphere: acquisitionPhase === 'dmi-wind-wave-enrichment' });
    const merged = mergeDmiWithFallback(dmiResult, output.zones[zoneId]);
    nextDmiForecastStore.zones[zoneId] = merged.dmiForecast;
    const forecast = {
      provider: 'dmi', providerLabel: merged.providerLabel,
      generatedAt: merged.dmiForecast.generatedAt,
      validUntil: merged.dmiForecast.validUntil,
      hourly: merged.dmiForecast.hourly
    };
    const { dmiForecast, ...publicResult } = merged;
    const history = historyFor(previous, zoneId, publicResult.current, generatedAt);
    output.zones[zoneId] = { ...publicResult, ...history, forecast, stale: false, fallback: acquisitionPhase !== 'dmi-wind-wave-enrichment', attempts: output.zones[zoneId]?.attempts ?? [], acquisition: { mode: acquisitionPhase } };
    const stableIndex = stableFeatures.findIndex(item => item.properties?.id === zoneId);
    dmiPersistentRuntime.nextZoneCursor = stableFeatures.length ? (stableIndex + 1) % stableFeatures.length : 0;
    dmiAcquisitionStats.cursorAdvancedForZoneIds.push(zoneId);
    dmiPersistentRuntime.lastSuccessfulZoneId = zoneId;
    dmiPersistentRuntime.lastSuccessAt = new Date().toISOString();
    dmiAcquisitionStats.successfulZoneIds.push(zoneId);
    await writeDmiForecastStoreCheckpoint();
    console.log(`DMI succes: ${zoneId} (${acquisitionPhase})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.zones[zoneId].attempts = [...(output.zones[zoneId]?.attempts ?? []), { provider: 'dmi', message }];
    console.warn(`${zoneId}: DMI-kø fejlede: ${message}`);
    if (error?.status === 429 || dmiRateLimitTriggered) {
      dmiAcquisitionStats.stoppedZoneIds.push(zoneId);
      break;
    }
    // Cursoren flyttes ikke ved timeout/fejl. Zonen prøves igen i næste kørsel.
    break;
  }
}


// DMI oceanObs hentes højst én gang pr. datatype og deles af alle zoner. Hvis ForecastEDR
// allerede har udløst 429/cooldown, springes observationerne helt over i denne kørsel.
const lastObservationMs = Date.parse(dmiPersistentRuntime.lastObservationAt ?? '');
const observationDue = !Number.isFinite(lastObservationMs) || Date.now() - lastObservationMs >= DMI_OBSERVATION_INTERVAL_MINUTES * 60000;
if (dmiRateLimitTriggered || Date.now() < dmiRateLimitedUntil) {
  dmiObservationSkipReason = dmiRateLimitTriggered ? 'skipped-after-http-429' : 'skipped-during-persisted-cooldown';
} else if (!observationDue) {
  dmiObservationSkipReason = 'skipped-until-hourly-observation-window';
} else {
  await mapWithConcurrency(features, WEATHER_CONCURRENCY, async feature => {
    const zoneId = feature.properties?.id;
    const observation = await observedDmiWaterLevel(feature, coastCorridors);
    if (zoneId && output.zones[zoneId]) applyObservedWaterLevel(output.zones[zoneId], feature, observation, generatedAt);
  });
  dmiPersistentRuntime.lastObservationAt = generatedAt;
}

output.weatherEngine = {
  version: '2.13.0',
  concurrency: WEATHER_CONCURRENCY,
  dmiRequestConcurrency: DMI_REQUEST_CONCURRENCY,
  dmiRequestGapMs: REQUEST_GAP_MS,
  dmiRequestTimeoutMs: REQUEST_TIMEOUT_MS,
  providerPriority: output.providerPriority,
  acquisition: (() => { const pending = targetFeatures.length; return { strategy: 'bulk-stac-grib-first-with-sequential-edr-repair', bulkModelDownloads: { ...dmiBulkMergeStats, cacheGeneratedAt: dmiBulkCache?.generatedAt ?? null, method: dmiBulkCache?.method ?? null, runs: dmiBulkCache?.runs ?? {}, diagnostics: dmiBulkCache?.diagnostics ?? null }, phase: acquisitionPhase, marineCacheCompleteAtStart, liveZoneBudget: DMI_LIVE_ZONE_BUDGET, liveZonesAssigned: liveDmiAssigned, assignedZoneIds: dmiAcquisitionStats.assignedZoneIds, attemptedZones: dmiAcquisitionStats.attemptedZoneIds.length, attemptedZoneIds: dmiAcquisitionStats.attemptedZoneIds, successfulZones: dmiAcquisitionStats.successfulZoneIds.length, successfulZoneIds: dmiAcquisitionStats.successfulZoneIds, stoppedAfterRateLimitZones: dmiAcquisitionStats.stoppedZoneIds.length, stoppedZoneIds: dmiAcquisitionStats.stoppedZoneIds, requestBudget: DMI_REQUEST_BUDGET, requestsUsed: dmiRequestBudgetUsed, http429Count: dmiHttp429Count, stoppedByHttp429: dmiRateLimitTriggered, persistentRateLimitedUntil: dmiPersistentRuntime.rateLimitedUntil, nextZoneCursor: dmiPersistentRuntime.nextZoneCursor, cursorAdvancedForZoneIds: dmiAcquisitionStats.cursorAdvancedForZoneIds, cacheRefreshBelowHours: DMI_CACHE_REFRESH_BELOW_HOURS, cacheRetention: 'until-forecast-expiry', observationAcquisition: dmiObservationSkipReason ?? 'attempted-once-and-shared', fallbackPolicy: 'Open-Meteo used until DMI component is cached; DMI values override component-by-component', prioritizedMissingOrExpiringZones: pending, scheduleIntervalMinutes: DMI_SCHEDULE_INTERVAL_MINUTES, observationIntervalMinutes: DMI_OBSERVATION_INTERVAL_MINUTES, estimatedRunsAtCurrentBudget: Math.ceil(pending / Math.max(1, DMI_LIVE_ZONE_BUDGET)), optimisticMinutesToFullCache: Math.ceil(pending / Math.max(1, DMI_LIVE_ZONE_BUDGET)) * DMI_SCHEDULE_INTERVAL_MINUTES }; })(),
  providers: Object.fromEntries([...providerRuntime.entries()].map(([name, state]) => [name, {
    ...state,
    circuitOpen: providerCircuitOpen(name),
    averageLatencyMs: state.requests ? round(state.latencyTotalMs / state.requests, 0) : null
  }]))
};

nextDmiForecastStore.generatedAt = generatedAt;
nextDmiForecastStore.runtime = { ...dmiPersistentRuntime, rateLimitedUntil: Date.now() < dmiRateLimitedUntil ? new Date(dmiRateLimitedUntil).toISOString() : null };
nextDmiForecastStore.coverage = summarizeAvailableCoverage(nextDmiForecastStore.zones, generatedAt, dmiForecastCoverage, round);
output.weatherEngine.dmiForecastCache = nextDmiForecastStore.coverage;
const [qualityStations, qualityLevels] = dmiObservationSkipReason
  ? [[], new Map()]
  : await Promise.all([dmiWaterStations().catch(() => []), dmiLatestSeaLevels().catch(() => new Map())]);
output.dataQuality = buildDataQuality(output, { stationsFetched: qualityStations.length, stationsWithFreshLevel: qualityLevels.size });
await fs.mkdir('data/live', { recursive: true });
await writeDmiForecastStoreCheckpoint();
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
    nextCentralAttemptMinutes: null,
    reason: 'DMI transient failure; fallback cache published immediately; next attempt follows workflow schedule and persisted cooldown'
  };
  console.log('DMI fejlede midlertidigt. Fallback-data er gemt; næste planlagte centrale kørsel forsøger igen, når DMI-cooldown er udløbet.');
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
