import fs from 'node:fs/promises';
import { writePublicRuntimeFromFull } from './public-conditions-lib.mjs';
import { recommendWaterStationBracket } from '../js/core/water-station-routing.js';
import {
  DMI_FORECAST_HOURS,
  buildDmiForecastHourly,
  createDmiForecastRecord,
  dmiForecastCoverage,
  normalizeForecastHourly,
  interpolateWaterLevelStations,
  interpolateWaterLevelAlongCoast,
  selectDmiForecastAt
} from './lib/dmi-forecast-store.mjs';
import { buildDataQuality } from './lib/data-quality.mjs';
import { repairWaterLevelContinuity } from './lib/water-level-continuity.mjs';
import { countDmiBackedZones, createPersistentDmiStore, prioritizeDmiFeatures, summarizeAvailableCoverage } from './lib/dmi-acquisition-state.mjs';
import { buildWaterSourceForecastIndex, applyWaterSourceForecastStatus, applyWaterSourceRouting } from './lib/water-source-forecast-routing.mjs';

const ZONES_PATH = 'data/zones.geojson';
const OUTPUT_PATH = 'data/live/conditions.json';
const DMI_ROOT = 'https://opendataapi.dmi.dk/v1/forecastedr/collections';
const DMI_OCEAN_OBS_ROOT = 'https://opendataapi.dmi.dk/v2/oceanObs/collections';
const HEALTH_PATH = 'data/live/weather-health.json';
const DMI_FORECAST_STORE_PATH = 'data/live/dmi-forecast-cache.json';
const DMI_BULK_CACHE_PATH = 'data/live/dmi-bulk-cache.json';
const RUNTIME_DIAGNOSTICS_PATH = 'data/live/ravradar-runtime-diagnostics.json';
const WATER_STATION_ROUTING_PATH = 'data/water-level-station-routing.json';
const WATER_STATION_INVENTORY_PATH = 'data/live/dmi-water-stations.json';
const OFFICIAL_WATER_STATION_SUPPLEMENT_PATH = 'data/dmi-official-water-stations.json';
const WATER_STATION_ROUTING_AUDIT_PATH = 'data/live/water-station-routing-audit.json';
const WATER_STATION_NOTIFICATIONS_PATH = 'data/live/water-station-notifications.json';
const ACCEPTED_FORECAST_HOURS = 118;
const SHORT_DMI_WATER_GAP_HOURS = 6;
const WATER_LEVEL_JUMP_WARN_CM = 35;
const ALERT_MAX_PER_24H = Number(process.env.WEATHER_ALERT_MAX_PER_24H ?? 2);
const ALERT_FAILURE_MINUTES = Number(process.env.WEATHER_ALERT_FAILURE_MINUTES ?? 60);
const REQUEST_TIMEOUT_MS = Number(process.env.WEATHER_REQUEST_TIMEOUT_MS ?? 30000);
const DMI_OCEAN_REQUEST_TIMEOUT_MS = Number(process.env.DMI_OCEAN_REQUEST_TIMEOUT_MS ?? 60000);
const REQUEST_GAP_MS = Number(process.env.DMI_REQUEST_GAP_MS ?? 12000);
const DMI_MAX_RETRIES = Number(process.env.DMI_MAX_RETRIES ?? 0);
const DMI_LIVE_ZONE_BUDGET = Math.max(1, Number(process.env.DMI_LIVE_ZONE_BUDGET ?? 4));
const DMI_RETRY_JITTER_MIN_MS = Math.max(0, Number(process.env.DMI_RETRY_JITTER_MIN_MS ?? 30000));
const DMI_RETRY_JITTER_MAX_MS = Math.max(DMI_RETRY_JITTER_MIN_MS, Number(process.env.DMI_RETRY_JITTER_MAX_MS ?? 180000));
const DMI_REQUEST_BUDGET = Math.max(1, Number(process.env.DMI_REQUEST_BUDGET ?? 6));
const DMI_REQUEST_CONCURRENCY = Math.max(1, Number(process.env.DMI_REQUEST_CONCURRENCY ?? 1));
const DMI_CACHE_REFRESH_BELOW_HOURS = Math.max(1, Number(process.env.DMI_CACHE_REFRESH_BELOW_HOURS ?? 24));
const DMI_SCHEDULE_INTERVAL_MINUTES = Math.max(1, Number(process.env.DMI_SCHEDULE_INTERVAL_MINUTES ?? 10));
const DMI_OBSERVATION_INTERVAL_MINUTES = Math.max(10, Number(process.env.DMI_OBSERVATION_INTERVAL_MINUTES ?? 60));
const STATION_CACHE_GRACE_HOURS = Math.max(1, Number(process.env.STATION_CACHE_GRACE_HOURS ?? 6));
const DMI_DEPLOYED_CACHE_URL = process.env.DMI_DEPLOYED_CACHE_URL ?? null;
const WEATHER_CONCURRENCY = Math.max(1, Number(process.env.WEATHER_CONCURRENCY ?? 6));
const PROVIDER_FAILURE_THRESHOLD = Math.max(1, Number(process.env.WEATHER_PROVIDER_FAILURE_THRESHOLD ?? 4));
const PROVIDER_COOLDOWN_MS = Number(process.env.WEATHER_PROVIDER_COOLDOWN_MS ?? 10 * 60 * 1000);
const USER_AGENT = process.env.WEATHER_USER_AGENT ?? 'RavRadar/2.4 (central weather updater)';
const APP_VERSION = JSON.parse(await fs.readFile('package.json', 'utf8')).version;
const PIPELINE_RUN_ID = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT ?? '1'}` : `local-${Date.now()}`;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const num = value => value === null || value === undefined || value === '' ? null : (Number.isFinite(Number(value)) ? Number(value) : null);
const round = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
const normalizeDegrees = value => ((value % 360) + 360) % 360;
const randomJitterMs = () => DMI_RETRY_JITTER_MIN_MS + Math.floor(Math.random() * Math.max(1, DMI_RETRY_JITTER_MAX_MS - DMI_RETRY_JITTER_MIN_MS + 1));
function parseRetryAfterMs(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const when = Date.parse(value);
  return Number.isFinite(when) ? Math.max(0, when - Date.now()) : null;
}

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
let dmiSeaLevelObservationRun = { attempted: false, succeeded: false, parameters: {}, featureCount: 0, validLevelCount: 0, error: null };
const DMI_WATER_LEVEL_PARAMETER_IDS = ['sealev_ln', 'sealev_dvr', 'sea_reg'];
let waterStationRoutingPromise = null;

async function waterStationRouting() {
  if (!waterStationRoutingPromise) {
    waterStationRoutingPromise = fs.readFile(WATER_STATION_ROUTING_PATH, 'utf8')
      .then(text => JSON.parse(text))
      .then(data => data?.zones && typeof data.zones === 'object' ? data : { schemaVersion: 1, zones: {} })
      .catch(() => ({ schemaVersion: 1, zones: {} }));
  }
  return waterStationRoutingPromise;
}


async function fetchJson(url, { provider, retries = 1, dmi = false, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
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
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
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
      lastError = error?.name === 'AbortError' ? new Error(`${provider}: timeout after ${timeoutMs} ms`) : error;
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
        dmiPersistentRuntime.rateLimits ??= {};
        dmiPersistentRuntime.rateLimits.forecastEdr = { ...(dmiPersistentRuntime.rateLimits.forecastEdr ?? {}), rateLimitedUntil: new Date(dmiRateLimitedUntil).toISOString(), last429At: new Date().toISOString() };
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


async function readCachedWaterStations() {
  try { const doc=JSON.parse(await fs.readFile(WATER_STATION_INVENTORY_PATH,'utf8')); return Array.isArray(doc.stations)?doc.stations:[]; } catch { return []; }
}
async function readOfficialWaterStationSupplement(){
  try { const doc=JSON.parse(await fs.readFile(OFFICIAL_WATER_STATION_SUPPLEMENT_PATH,'utf8')); return Array.isArray(doc.stations)?doc.stations:[]; } catch { return []; }
}

function stationEffectiveStatus(properties, now = Date.now()) {
  const from = Date.parse(properties?.operationFrom ?? properties?.validFrom ?? '') || null;
  const to = Date.parse(properties?.operationTo ?? properties?.validTo ?? '') || null;
  if (from && from > now) return 'future';
  if (to && to < now) return 'historical';
  return String(properties?.status ?? '').toLowerCase() === 'active' ? 'active' : 'known';
}

function stationRegistryRecord(station, previous = null, seenAt = new Date().toISOString()) {
  const properties = { ...(previous?.properties ?? {}), ...(station?.properties ?? {}) };
  const registryStatus = stationEffectiveStatus(properties, Date.parse(seenAt));
  return {
    ...(previous ?? {}), sourceKey: station.sourceKey ?? previous?.sourceKey ?? `oceanobs:${String(station.stationId)}`, sourceType: station.sourceType ?? previous?.sourceType ?? 'observation-station', sourceTypes: station.sourceTypes ?? previous?.sourceTypes ?? ['observation','forecast'], stationId: String(station.stationId), name: station.name ?? previous?.name ?? 'DMI station', point: station.point ?? previous?.point,
    properties, registryStatus,
    firstSeenAt: previous?.firstSeenAt ?? seenAt, lastSeenAt: seenAt,
    lastActiveSeenAt: registryStatus === 'active' ? seenAt : (previous?.lastActiveSeenAt ?? null),
    hasEverDelivered: Boolean(previous?.hasEverDelivered || previous?.lastObservationAt || Number.isFinite(Number(previous?.lastObservationValueCm))),
    firstObservationAt: previous?.firstObservationAt ?? null,
    lastObservationAt: previous?.lastObservationAt ?? null,
    lastObservationValueCm: previous?.lastObservationValueCm ?? null,
    consecutiveMissingObservationRuns: previous?.consecutiveMissingObservationRuns ?? 0,
    deliveryStatus: previous?.deliveryStatus ?? 'unknown',
    forecastCacheGeneratedAt: previous?.forecastCacheGeneratedAt ?? null,
    forecastCacheValidUntil: previous?.forecastCacheValidUntil ?? null,
    forecastCacheStatus: previous?.forecastCacheStatus ?? 'unknown',
    overallUsabilityStatus: previous?.overallUsabilityStatus ?? 'unknown',
    forecastCacheZoneIds: Array.isArray(previous?.forecastCacheZoneIds) ? previous.forecastCacheZoneIds : []
  };
}


function stationForecastCacheIndex(forecastStore, generatedAt) {
  const index = new Map();
  for (const [zoneId, record] of Object.entries(forecastStore?.zones ?? {})) {
    const validUntilMs = Date.parse(record?.validUntil ?? '');
    if (!Number.isFinite(validUntilMs)) continue;
    const stations = record?.waterLevelInterpolation?.stations ?? [];
    for (const item of stations) {
      const stationId = String(item?.stationId ?? '');
      if (!stationId) continue;
      const current = index.get(stationId) ?? { generatedAt: null, validUntil: null, zoneIds: [] };
      if (!current.validUntil || validUntilMs > Date.parse(current.validUntil)) {
        current.generatedAt = record?.generatedAt ?? forecastStore?.generatedAt ?? generatedAt;
        current.validUntil = new Date(validUntilMs).toISOString();
      }
      if (!current.zoneIds.includes(zoneId)) current.zoneIds.push(zoneId);
      index.set(stationId, current);
    }
  }
  return index;
}

function applyStationForecastCacheStatus(stations, forecastStore, generatedAt) {
  const now = Date.parse(generatedAt);
  const index = stationForecastCacheIndex(forecastStore, generatedAt);
  return stations.map(station => {
    const cached = index.get(String(station.stationId));
    const inheritedUntil = Date.parse(station.forecastCacheValidUntil ?? '');
    const observationUntil = Number.isFinite(Date.parse(station.lastObservationAt ?? ''))
      ? Date.parse(station.lastObservationAt) + STATION_CACHE_GRACE_HOURS * 3600000
      : NaN;
    const candidates = [cached?.validUntil ? Date.parse(cached.validUntil) : NaN, inheritedUntil, observationUntil].filter(Number.isFinite);
    const candidateUntil = candidates.length ? Math.max(...candidates) : NaN;
    const validUntil = Number.isFinite(candidateUntil) ? new Date(candidateUntil).toISOString() : null;
    const cacheValid = validUntil ? Date.parse(validUntil) >= now : false;
    const forecastCacheStatus = cacheValid ? 'valid' : validUntil ? 'expired' : 'none';
    const observationUsable = station.deliveryStatus === 'delivering' || station.deliveryStatus === 'temporarily-missing';
    const lifecycleKnown = station.deliveryStatus && station.deliveryStatus !== 'unknown';
    const sourceForecastUsable = station.sourceForecastStatus === 'receiving' && Number(station.sourceForecastHours ?? 0) >= 96;
    const overallUsabilityStatus = sourceForecastUsable ? 'forecast-series' : observationUsable ? 'live-or-recent-observation' : cacheValid ? 'forecast-cache-only' : lifecycleKnown ? 'unavailable' : 'unknown';
    return {...station,
      forecastCacheGeneratedAt: cached?.generatedAt ?? station.forecastCacheGeneratedAt ?? null,
      forecastCacheValidUntil: validUntil,
      forecastCacheStatus,
      forecastCacheZoneIds: cached?.zoneIds ?? station.forecastCacheZoneIds ?? [],
      overallUsabilityStatus
    };
  });
}

async function cachedStationLevels(generatedAt) {
  const doc = await fs.readFile(WATER_STATION_INVENTORY_PATH, 'utf8').then(JSON.parse).catch(() => ({ stations: [] }));
  const now = Date.parse(generatedAt);
  const levels = new Map();
  for (const station of doc.stations ?? []) {
    const validUntil = Date.parse(station.forecastCacheValidUntil ?? '');
    const value = Number(station.lastObservationValueCm);
    if (!Number.isFinite(validUntil) || validUntil < now || !Number.isFinite(value)) continue;
    levels.set(String(station.stationId), {stationId:String(station.stationId),valueCm:value,
      observed:station.lastObservationAt ?? station.forecastCacheGeneratedAt ?? generatedAt,
      qcStatus:'cached-station-value',cacheSource:true,cacheValidUntil:station.forecastCacheValidUntil});
  }
  return levels;
}

function stationEvent(type, station, generatedAt, details = {}) {
  return { id: `${type}:${station.stationId}:${generatedAt}`, type, stationId: String(station.stationId), stationName: station.name, generatedAt, ...details };
}

async function updateStationObservationLifecycle(stations, levels, generatedAt, { observationAttempted = true, forecastStore = null } = {}) {
  const previousDoc = await fs.readFile(WATER_STATION_INVENTORY_PATH, 'utf8').then(JSON.parse).catch(() => ({ notifications: [] }));
  const previousById = new Map((previousDoc.stations ?? []).map(station => [String(station.stationId), station]));
  const notifications = [];
  const updated = stations.map(station => {
    const previous = previousById.get(String(station.stationId)) ?? station;
    const level = levels.get(String(station.stationId));
    let next = { ...station };
    if (level?.cacheSource && Number.isFinite(Number(level.valueCm))) {
      next = { ...next, hasEverDelivered: true, firstObservationAt: previous.firstObservationAt ?? previous.lastObservationAt ?? level.observed ?? generatedAt, lastObservationAt: previous.lastObservationAt ?? level.observed ?? null, lastObservationValueCm: Number.isFinite(Number(previous.lastObservationValueCm)) ? Number(previous.lastObservationValueCm) : round(Number(level.valueCm), 1), consecutiveMissingObservationRuns: previous.consecutiveMissingObservationRuns ?? 0, deliveryStatus: previous.deliveryStatus === 'never-delivered' ? 'temporarily-missing' : (previous.deliveryStatus ?? 'temporarily-missing') };
    } else if (level && Number.isFinite(Number(level.valueCm))) {
      const firstDelivery = !previous.hasEverDelivered;
      const resumed = previous.hasEverDelivered && ['temporarily-missing','not-delivering'].includes(previous.deliveryStatus);
      next = {
        ...next,
        hasEverDelivered: true,
        firstObservationAt: previous.firstObservationAt ?? level.observed ?? generatedAt,
        lastObservationAt: level.observed ?? generatedAt,
        lastObservationValueCm: round(Number(level.valueCm), 1),
        consecutiveMissingObservationRuns: 0,
        deliveryStatus: 'delivering'
      };
      if (firstDelivery) notifications.push(stationEvent('first-observation', next, generatedAt, { message: `${next.name} har leveret sin første brugbare vandstandsmåling til RavRadar.` }));
      else if (resumed) notifications.push(stationEvent('delivery-resumed', next, generatedAt, { message: `${next.name} leverer igen vandstandsmålinger efter et udfald.` }));
    } else if (observationAttempted && previous.hasEverDelivered) {
      const misses = Number(previous.consecutiveMissingObservationRuns ?? 0) + 1;
      const deliveryStatus = misses >= 3 ? 'not-delivering' : 'temporarily-missing';
      next = { ...next, consecutiveMissingObservationRuns: misses, deliveryStatus };
      if (misses === 3) notifications.push(stationEvent('delivery-stopped', next, generatedAt, { message: `${next.name} har manglet brugbare målinger i tre observationkørsler.`, consecutiveMissingObservationRuns: misses }));
    }
    return next;
  });
  const cacheAware = applyStationForecastCacheStatus(updated, forecastStore, generatedAt);
  for (const station of cacheAware) {
    const previous = previousById.get(String(station.stationId));
    if (station.forecastCacheStatus === 'valid' && previous?.forecastCacheStatus !== 'valid') notifications.push(stationEvent('forecast-cache-available', station, generatedAt, { message: `${station.name} kan fortsat bruges via gyldig prognosecache til ${station.forecastCacheValidUntil}.` }));
    if (station.forecastCacheStatus === 'expired' && previous?.forecastCacheStatus === 'valid') notifications.push(stationEvent('forecast-cache-expired', station, generatedAt, { message: `${station.name}s prognosecache er udløbet.` }));
  }
  const recent = [...notifications, ...(previousDoc.notifications ?? [])]
    .filter((item, index, all) => all.findIndex(other => other.id === item.id) === index)
    .slice(0, 250);
  const document = {
    ...previousDoc,
    schemaVersion: 3,
    generatedAt,
    source: 'persistent-dmi-station-registry-with-observation-lifecycle',
    stations: cacheAware,
    notifications: recent,
    summary: {
      total: cacheAware.length,
      delivering: cacheAware.filter(station => station.deliveryStatus === 'delivering').length,
      temporarilyMissing: cacheAware.filter(station => station.deliveryStatus === 'temporarily-missing').length,
      notDelivering: cacheAware.filter(station => station.deliveryStatus === 'not-delivering').length,
      neverDelivered: cacheAware.filter(station => !station.hasEverDelivered).length,
      forecastCacheValid: cacheAware.filter(station => station.forecastCacheStatus === 'valid').length,
      cacheOnlyUsable: cacheAware.filter(station => station.overallUsabilityStatus === 'forecast-cache-only').length,
      unavailable: cacheAware.filter(station => station.overallUsabilityStatus === 'unavailable').length,
      newNotifications: notifications.length
    }
  };
  await fs.writeFile(WATER_STATION_INVENTORY_PATH, `${JSON.stringify(document, null, 2)}\n`);
  await fs.writeFile(WATER_STATION_NOTIFICATIONS_PATH, `${JSON.stringify({ schemaVersion: 1, generatedAt, notifications: recent, newNotifications: notifications }, null, 2)}\n`);
  return { stations: cacheAware, notifications, document };
}

async function dmiWaterStations() {
  if (!dmiWaterStationsPromise) {
    dmiWaterStationsPromise = (async () => {
      const [cached, officialSupplement] = await Promise.all([readCachedWaterStations(), readOfficialWaterStationSupplement()]);
      try {
        const features = await fetchAllFeatures(`${DMI_OCEAN_OBS_ROOT}/station/items`, {}, { provider: 'DMI oceanObs stations', retries: DMI_MAX_RETRIES, dmi: false }, { pageSize: 1000, maxPages: 20 });
        const fetched = features.map(feature => ({ sourceKey:`oceanobs:${String(feature.properties?.stationId ?? feature.properties?.id ?? '')}`, sourceType:'observation-station', sourceTypes:['observation','forecast'], stationId: String(feature.properties?.stationId ?? feature.properties?.id ?? ''), name: feature.properties?.name ?? feature.properties?.stationName ?? feature.properties?.countryName ?? 'DMI station', point: feature.geometry?.coordinates, properties: feature.properties ?? {} })).filter(station => station.stationId && Array.isArray(station.point) && station.point.length === 2);
        const now = new Date().toISOString();
        const merged = new Map(cached.map(station => [String(station.sourceKey ?? `${station.sourceType==='forecast-point'?'tidewater':'oceanobs'}:${station.stationId}`), station]));
        for (const station of officialSupplement) {
          const sourceKey=String(station.sourceKey ?? `tidewater:${station.stationId}`);
          if (!merged.has(sourceKey)) merged.set(sourceKey, stationRegistryRecord({...station,sourceKey,sourceType:'forecast-point',sourceTypes:['forecast']}, null, now));
        }
        for (const station of fetched) merged.set(station.sourceKey, stationRegistryRecord(station, merged.get(station.sourceKey), now));
        const fetchedKeys = new Set(fetched.map(item => item.sourceKey));
        for (const [sourceKey, station] of merged) {
          if (fetchedKeys.has(sourceKey) || station.sourceType === 'forecast-point') continue;
          merged.set(sourceKey, { ...station, registryStatus: station.registryStatus === 'active' ? 'not-returned-this-run' : (station.registryStatus ?? 'known'), lastSeenAt: station.lastSeenAt ?? null });
        }
        const stations = [...merged.values()].filter(station => station.stationId && Array.isArray(station.point) && station.point.length === 2);
        const cachedKeys = new Set(cached.map(station => String(station.sourceKey ?? `${station.sourceType==='forecast-point'?'tidewater':'oceanobs'}:${station.stationId}`)));
        const newStationNotifications = stations.filter(station => !cachedKeys.has(String(station.sourceKey))).map(station => stationEvent('station-discovered', station, now, { message: `${station.name} er ny i RavRadars vandstandskilderegister.` }));
        if (newStationNotifications.length) console.log(`${newStationNotifications.length} nye vandstandskilder opdaget.`);
        return stations;
      } catch (error) {
        if (cached.length) { console.warn(`DMI stationsregister kunne ikke opdateres; bruger ${cached.length} persistente vandstandskilder`); return cached; }
        throw error;
      }
    })();
  }
  return dmiWaterStationsPromise;
}

async function dmiLatestSeaLevels() {
  if (!dmiLatestSeaLevelPromise) {
    dmiSeaLevelObservationRun = { attempted: true, succeeded: false, parameters: {}, featureCount: 0, validLevelCount: 0, error: null };
    dmiLatestSeaLevelPromise = (async () => {
      const latest = new Map();
      const failures = [];
      for (const parameterId of DMI_WATER_LEVEL_PARAMETER_IDS) {
        try {
          const features = await fetchAllFeatures(`${DMI_OCEAN_OBS_ROOT}/observation/items`, {
            parameterId, period: 'latest-hour', sortorder: 'observed,DESC'
          }, {
            provider: `DMI oceanObs water level ${parameterId}`, retries: DMI_MAX_RETRIES, dmi: false
          }, { pageSize: 1000, maxPages: 20 });
          let valid = 0;
          for (const feature of features) {
            const p = feature.properties ?? {};
            const stationId = String(p.stationId ?? '');
            const value = num(p.value);
            if (!stationId || value === null || !Number.isFinite(Date.parse(p.observed ?? ''))) continue;
            valid += 1;
            const existing = latest.get(stationId);
            if (!existing || Date.parse(p.observed) > Date.parse(existing.observed)) {
              latest.set(stationId, { stationId, valueCm: value, observed: p.observed, qcStatus: p.qcStatus ?? null, parameterId });
            }
          }
          dmiSeaLevelObservationRun.parameters[parameterId] = { ok: true, features: features.length, valid };
          dmiSeaLevelObservationRun.featureCount += features.length;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          dmiSeaLevelObservationRun.parameters[parameterId] = { ok: false, features: 0, valid: 0, error: message };
          failures.push(`${parameterId}: ${message}`);
        }
      }
      dmiSeaLevelObservationRun.validLevelCount = latest.size;
      dmiSeaLevelObservationRun.succeeded = latest.size > 0;
      if (!dmiSeaLevelObservationRun.succeeded) {
        dmiSeaLevelObservationRun.error = failures.length ? failures.join(' | ') : 'DMI OceanObs returned no valid water-level observations';
        const error = new Error(dmiSeaLevelObservationRun.error);
        error.code = 'DMI_OCEANOBS_NO_VALID_LEVELS';
        throw error;
      }
      return latest;
    })().catch(error => {
      dmiSeaLevelObservationRun.error ??= error instanceof Error ? error.message : String(error);
      throw error;
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

const FJORD_INTERPOLATION_RULES = [
  {
    id: 'mariager-fjord-mouth',
    zonePattern: /(øster hurup|als odde|helberskov|mariager fjord)/i,
    stationPatterns: [/hals/i, /(als odde|helberskov|\bals\b)/i],
    maxStationDistanceKm: 95
  }
];

function interpolateAllowedFjord(feature, point, stations, levels) {
  const zoneName = `${feature?.properties?.name ?? ''} ${feature?.properties?.id ?? ''}`;
  const rule = FJORD_INTERPOLATION_RULES.find(item => item.zonePattern.test(zoneName));
  if (!rule) return null;
  const selected = [];
  for (const pattern of rule.stationPatterns) {
    const candidates = stations
      .filter(station => pattern.test(String(station.name ?? '')) && levels.get(station.stationId))
      .map(station => ({ ...station, level: levels.get(station.stationId), distanceKm: haversineKm(point, station.point) }))
      .filter(item => item.distanceKm <= rule.maxStationDistanceKm)
      .sort((a,b)=>a.distanceKm-b.distanceKm);
    if (candidates[0]) selected.push(candidates[0]);
  }
  if (selected.length !== 2 || selected[0].stationId === selected[1].stationId) return null;
  const inverse = selected.map(item => 1 / Math.max(0.25, item.distanceKm));
  const total = inverse.reduce((a,b)=>a+b,0);
  const weights = inverse.map(value=>value/total);
  const valueCm = selected.reduce((sum,item,index)=>sum + Number(item.level.valueCm) * weights[index],0);
  return {
    valueCm: round(valueCm,0), method: 'fjord-bracket-2-stations', fjordRuleId: rule.id,
    stations: selected.map((item,index)=>({ stationId:item.stationId, name:item.name, valueCm:round(Number(item.level.valueCm),0), distanceKm:round(item.distanceKm,1), side:index===0?'fjord-side-a':'fjord-side-b', weight:round(weights[index],3), observed:item.level.observed, observationAgeMinutes:Number.isFinite(Date.parse(item.level.observed))?round((Date.now()-Date.parse(item.level.observed))/60000,0):null, qcStatus:item.level.qcStatus??null }))
  };
}

function manualStationInterpolation(feature, point, stations, levels, route) {
  const requested = Array.isArray(route?.stations) ? route.stations : [];
  if (!route?.enabled || !requested.length) return null;
  const byId = new Map(stations.map(station => [String(station.stationId), station]));
  const selected = requested.map((entry, index) => {
    const station = byId.get(String(entry.stationId));
    const level = station ? levels.get(station.stationId) : null;
    if (!station || !level || !Number.isFinite(Number(level.valueCm))) return null;
    return { ...station, level, requestedWeight: num(entry.weight), role: entry.role ?? (index === 0 ? 'primary' : 'secondary'), distanceKm: haversineKm(point, station.point) };
  }).filter(Boolean);
  if (!selected.length) return null;
  if (route.requireAll !== false && selected.length !== requested.length) return null;
  let weights;
  if (route.method === 'manual-weights' && selected.every(item => item.requestedWeight !== null && item.requestedWeight >= 0)) {
    const total = selected.reduce((sum, item) => sum + item.requestedWeight, 0);
    if (!(total > 0)) return null;
    weights = selected.map(item => item.requestedWeight / total);
  } else if (selected.length === 1) {
    weights = [1];
  } else {
    const inverse = selected.map(item => 1 / Math.max(0.25, item.distanceKm));
    const total = inverse.reduce((sum, value) => sum + value, 0);
    weights = inverse.map(value => value / total);
  }
  const valueCm = selected.reduce((sum, item, index) => sum + Number(item.level.valueCm) * weights[index], 0);
  return {
    valueCm: round(valueCm, 0), method: selected.length === 1 ? 'admin-selected-station' : 'admin-selected-interpolation',
    routingSource: 'data/water-level-station-routing.json', routingReviewed: route.reviewed === true,
    stations: selected.map((item, index) => ({ stationId: item.stationId, name: item.name, valueCm: round(Number(item.level.valueCm), 0), distanceKm: round(item.distanceKm, 1), side: item.role, weight: round(weights[index], 3), observed: item.level.observed, observationAgeMinutes: Number.isFinite(Date.parse(item.level.observed)) ? round((Date.now() - Date.parse(item.level.observed)) / 60000, 0) : null, qcStatus: item.level.qcStatus ?? null }))
  };
}

function topologyStationInterpolation(feature, point, stations, levels) {
  const recommendation = recommendWaterStationBracket({ zoneId: feature.properties?.id, zoneName: feature.properties?.name, point, coastLine: featureCoastLine(feature), onshoreDirectionDeg: feature.properties?.onshoreDirectionDeg, stations, levels, haversineKm });
  if (!recommendation.completeBracket || recommendation.stations.length !== 2) return null;
  const selected = recommendation.stations;
  const valueCm = selected.reduce((sum, item) => sum + Number(item.level.valueCm) * item.weight, 0);
  return {
    valueCm: round(valueCm, 0), method: 'topology-bracket-2-stations', routingMethod: recommendation.method, routingRuleId: recommendation.ruleId ?? null,
    stations: selected.map(item => ({ stationId: item.stationId, name: item.name, valueCm: round(Number(item.level.valueCm),0), distanceKm: round(item.distanceKm,1), alongCoastKm: round(item.alongKm,1), crossCoastKm: round(item.crossKm,1), side: item.role, weight: round(item.weight,3), observed: item.level.observed, observationAgeMinutes: Number.isFinite(Date.parse(item.level.observed)) ? round((Date.now()-Date.parse(item.level.observed))/60000,0) : null, qcStatus: item.level.qcStatus ?? null }))
  };
}

async function observedDmiWaterLevel(feature, coastCorridors) {
  try {
    const [rawStations, freshLevels, routing, cachedLevels] = await Promise.all([dmiWaterStations(), dmiLatestSeaLevels(), waterStationRouting(), cachedStationLevels(new Date().toISOString())]);
    const levels = new Map(cachedLevels);
    for (const [stationId, level] of freshLevels) levels.set(String(stationId), level);
    const stations = deduplicateStationSites(rawStations, levels);
    const point = zonePoint(feature);
    const explicit = manualStationInterpolation(feature, point, stations, levels, routing.zones?.[feature.properties?.id]);
    if (explicit) return explicit;
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
    const topology = topologyStationInterpolation(feature, point, stations, levels);
    if (topology) return topology;
    const fjord = interpolateAllowedFjord(feature, point, stations, levels);
    if (fjord) return fjord;
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
    source: ['direct-zone-station','direct-coast-station','admin-selected-station'].includes(observation.method) ? 'dmi-observation-direct' : 'dmi-observation-coast-interpolation',
    reference: observation.method === 'admin-selected-station' ? 'Administratorvalgt DMI-målestation' : observation.method === 'admin-selected-interpolation' ? 'Administratorvalgt interpolation mellem DMI-målestationer' : ['direct-zone-station','direct-coast-station'].includes(observation.method) ? 'Aktuel DMI-målestation ved zonen' : observation.method === 'topology-bracket-2-stations' ? 'Aktuel DMI-vandstand interpoleret mellem stationer på modsatte sider langs den lokale kystlinje' : observation.method === 'fjord-bracket-2-stations' ? 'Aktuel DMI-vandstand interpoleret mellem to stationer på hver sin side af samme fjord' : 'Aktuel DMI-vandstand interpoleret mellem én station på hver side langs samme kystkorridor',
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


async function writeWaterStationRoutingAudit(features, stations, generatedAt) {
  const zones = {}, counts = { totalZones: 0, completeBracket: 0, incompleteBracket: 0, noCandidates: 0, namedRules: 0 };
  for (const feature of features) {
    const point = zonePoint(feature), recommendation = recommendWaterStationBracket({ zoneId: feature.properties?.id, zoneName: feature.properties?.name, point, coastLine: featureCoastLine(feature), onshoreDirectionDeg: feature.properties?.onshoreDirectionDeg, stations, haversineKm });
    counts.totalZones += 1; counts[recommendation.completeBracket ? 'completeBracket' : 'incompleteBracket'] += 1;
    if (!recommendation.candidates.length) counts.noCandidates += 1; if (recommendation.ruleId) counts.namedRules += 1;
    zones[feature.properties?.id] = { zoneName: feature.properties?.name, method: recommendation.method, ruleId: recommendation.ruleId ?? null, completeBracket: recommendation.completeBracket, reason: recommendation.reason, stations: recommendation.stations.map(item => ({ sourceKey:item.sourceKey??null,stationId:item.stationId,name:item.name,role:item.role,distanceKm:round(item.distanceKm,1),alongCoastKm:round(item.alongKm,1),crossCoastKm:round(item.crossKm,1),weight:round(item.weight,3),registryStatus:item.registryStatus??item.properties?.status??null })), candidates: recommendation.candidates.map(item => ({ sourceKey:item.sourceKey??null,stationId:item.stationId,name:item.name,distanceKm:round(item.distanceKm,1),alongCoastKm:round(item.alongKm,1),crossCoastKm:round(item.crossKm,1),registryStatus:item.registryStatus??item.properties?.status??null })) };
  }
  const doc = { schemaVersion: 2, generatedAt, description: 'Automatisk topologiaudit: stationer skal indramme zonen fra modsatte sider langs den lokale kystlinje.', stationInventoryCount: stations.length, counts, zones };
  await fs.writeFile(WATER_STATION_ROUTING_AUDIT_PATH, `${JSON.stringify(doc,null,2)}\n`);
  return doc;
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
  const wind = rows.filter(row => num(row['wind-speed-10m']) !== null && num(row['wind-dir-10m']) !== null).map(row => ({ step: row.time, 'wind-speed-10m': num(row['wind-speed-10m']), 'wind-dir-10m': num(row['wind-dir-10m']) }));
  const waves = rows.filter(row => ['significant-wave-height','mean-wave-dir','dominant-wave-period'].some(key => num(row[key]) !== null)).map(row => ({ step: row.time, 'significant-wave-height': num(row['significant-wave-height']), 'mean-wave-dir': num(row['mean-wave-dir']), 'dominant-wave-period': num(row['dominant-wave-period']) }));
  const ocean = rows.filter(row => ['sea-mean-deviation','current-u','current-v','water-temperature'].some(key => num(row[key]) !== null)).map(row => ({ step: row.time, 'sea-mean-deviation': num(row['sea-mean-deviation']), 'current-u': num(row['current-u']), 'current-v': num(row['current-v']), 'water-temperature': num(row['water-temperature']) }));
  const sourceCadenceMinutes = Number(bulkCache?.timeStrideHours ?? 3) * 60;
  const built = buildDmiForecastHourly({ wind, waves, ocean, generatedAt, hours: DMI_FORECAST_HOURS, sourceCadenceMinutes });
  const marine = ocean.some(item => num(item['sea-mean-deviation']) !== null && num(item['current-u']) !== null && num(item['current-v']) !== null);
  const windAvailable = wind.some(item => num(item['wind-speed-10m']) !== null && num(item['wind-dir-10m']) !== null);
  const waveRequired = dmiCollections(feature.properties?.coastType).wave !== null;
  const waveAvailable = !waveRequired || waves.some(item => num(item['significant-wave-height']) !== null);
  if (!marine && !windAvailable && !waveAvailable) return null;
  const mergedHourly = mergeHourlyPreferDmi(built.hourly, previousRecord?.hourly ?? [], { generatedAt });
  const oldCompleteness = previousRecord?.model?.completeness ?? {};
  return createDmiForecastRecord({
    zoneId,
    point: zonePoint(feature),
    generatedAt,
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
        forecastCadenceMinutes: 60,
        sourceCadenceMinutes,
        temporalInterpolation: built.interpolation,
        spatialInterpolation: false,
        gridPoints: bulkZone.gridPoints ?? {},
        collections: bulkZone.collections ?? {},
        bulkCacheGeneratedAt: bulkCache.generatedAt ?? null
      }
    }
  });
}

function mergeBulkCacheIntoForecastStore(features, bulkCache, store, generatedAt) {
  const stats = { available: Boolean(bulkCache), zonesExamined: 0, zonesMerged: 0, marineZones: 0, waterLevelZones: 0, currentZones: 0, windZones: 0, waveZones: 0, bulkMarineCandidateZones: 0, conversionLossZones: [], conversionHealthy: true, errors: [] };
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
      const selected = selectDmiForecastAt(record, generatedAt);
      const hasCurrent = selected?.currentSpeedMps != null && selected?.currentDirectionDeg != null;
      const hasWaterLevel = selected?.waterLevelCm != null;
      const hasWind = selected?.windSpeedMps != null && selected?.windDirectionDeg != null;
      const hasWave = selected?.waveHeightM != null;
      if (hasCurrent && hasWaterLevel) stats.marineZones += 1;
      if (hasCurrent) stats.currentZones += 1;
      if (hasWaterLevel) stats.waterLevelZones += 1;
      if (hasWind) stats.windZones += 1;
      if (hasWave) stats.waveZones += 1;
      const bulkRows = Object.values(bulkCache.zones?.[zoneId]?.hourly ?? {});
      const bulkHasMarine = bulkRows.some(row => num(row?.['current-u']) !== null && num(row?.['current-v']) !== null && num(row?.['sea-mean-deviation']) !== null);
      if (bulkHasMarine) stats.bulkMarineCandidateZones += 1;
      if (bulkHasMarine && (!hasCurrent || !hasWaterLevel)) stats.conversionLossZones.push(zoneId);
    } catch (error) {
      stats.errors.push({ zoneId, message: error instanceof Error ? error.message : String(error) });
    }
  }
  stats.conversionLossPercent = stats.bulkMarineCandidateZones ? round(stats.conversionLossZones.length / stats.bulkMarineCandidateZones * 100, 1) : 0;
  stats.conversionHealthy = stats.conversionLossPercent <= 5;
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
    provider: 'DMI', retries: DMI_MAX_RETRIES, dmi: true, timeoutMs: DMI_OCEAN_REQUEST_TIMEOUT_MS
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
    const attempts = [
      ['sea-mean-deviation', 'current-u', 'current-v', 'water-temperature'],
      ['sea-mean-deviation', 'current-u', 'current-v'],
      ['sea-mean-deviation']
    ];
    let lastOceanError = null;
    for (const parameters of attempts) {
      try {
        ocean = await dmiPosition(collections.ocean, point, parameters);
        if (ocean.length) break;
      } catch (error) {
        lastOceanError = error;
        const retryableSplit = error?.status === 400 || /timeout after/i.test(error?.message ?? '');
        if (!retryableSplit) throw error;
      }
    }
    if (!ocean.length && lastOceanError) throw lastOceanError;
  } catch (error) {
    componentErrors.push({ component: 'ocean', collection: collections.ocean, message: error instanceof Error ? error.message : String(error) });
    throw error;
  }
  const oceanHasWaterLevel = ocean.some(item => num(item['sea-mean-deviation']) !== null);
  const oceanHasCurrent = ocean.some(item => num(item['current-u']) !== null && num(item['current-v']) !== null);
  const oceanHasTemperature = ocean.some(item => num(item['water-temperature']) !== null);
  if (!oceanHasWaterLevel && !oceanHasCurrent && !oceanHasTemperature) {
    const error = new Error('DMI-havdata gav ingen brugbare marine komponenter');
    error.code = 'DMI_NO_USABLE_COMPONENTS';
    throw error;
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
    point, flowPoints: flowPointsFromForecastRecord(feature, forecastRecord), provider: 'dmi', providerLabel: includeAtmosphere ? 'DMI Open Data' : 'DMI havdata + Open-Meteo fallback',
    modelSteps: { wind: w?.step ?? null, wave: wa?.step ?? null, ocean: o?.step ?? null },
    dmiCompleteness: completeness,
    current: {
      windSpeedMps: currentForecast.windSpeedMps, windDirectionDeg: currentForecast.windDirectionDeg,
      waveHeightM: currentForecast.waveHeightM, waveDirectionDeg: currentForecast.waveDirectionDeg,
      wavePeriodS: currentForecast.wavePeriodS, waterLevelCm: currentForecast.waterLevelCm,
      waterLevelTrendCm3h: currentForecast.waterLevelTrendCm3h, currentUMps: currentForecast.currentUMps ?? null, currentVMps: currentForecast.currentVMps ?? null,
      currentSpeedMps: currentForecast.currentSpeedMps, currentDirectionDeg: currentForecast.currentDirectionDeg, waterTemperatureC: currentForecast.waterTemperatureC
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

function mergeHourlyPreferDmi(dmiHourly = [], fallbackHourly = [], { generatedAt = null } = {}) {
  const cutoffMs = Number.isFinite(Date.parse(generatedAt)) ? Date.parse(generatedAt) - 65 * 60000 : -Infinity;
  const future = rows => normalizeForecastHourly(rows, { limit: Number.MAX_SAFE_INTEGER }).filter(item => Date.parse(item.time) >= cutoffMs);
  const dmiByTime = new Map(future(dmiHourly).map(item => [item.time, item]));
  const fallbackByTime = new Map(future(fallbackHourly).map(item => [item.time, item]));
  const times = [...new Set([...dmiByTime.keys(), ...fallbackByTime.keys()])].sort((a, b) => Date.parse(a) - Date.parse(b));
  const merged = times.map(time => {
    const item = dmiByTime.get(time) ?? {};
    const fallback = fallbackByTime.get(time) ?? {};
    const mergedRow = {
      ...fallback, ...item, time,
      windSpeedMps: item.windSpeedMps ?? fallback.windSpeedMps ?? null,
      windDirectionDeg: item.windDirectionDeg ?? fallback.windDirectionDeg ?? null,
      waveHeightM: item.waveHeightM ?? fallback.waveHeightM ?? null,
      waveDirectionDeg: item.waveDirectionDeg ?? fallback.waveDirectionDeg ?? null,
      wavePeriodS: item.wavePeriodS ?? fallback.wavePeriodS ?? null,
      waterLevelCm: null,
      waterLevelTrendCm3h: null,
      currentSpeedMps: item.currentSpeedMps ?? fallback.currentSpeedMps ?? null,
      currentDirectionDeg: item.currentDirectionDeg ?? fallback.currentDirectionDeg ?? null,
      waterTemperatureC: item.waterTemperatureC ?? fallback.waterTemperatureC ?? null,
      sources: {
        wind: (item.windSpeedMps != null && item.windDirectionDeg != null) ? { provider: 'dmi', fallback: false } : (fallback.windSpeedMps != null && fallback.windDirectionDeg != null) ? { provider: fallback.source ?? 'open-meteo', fallback: true } : { provider: 'missing', fallback: false },
        wave: item.waveHeightM != null ? { provider: 'dmi', fallback: false } : fallback.waveHeightM != null ? { provider: fallback.source ?? 'open-meteo', fallback: true } : { provider: 'missing', fallback: false },
        current: (item.currentSpeedMps != null && item.currentDirectionDeg != null) ? { provider: 'dmi', fallback: false } : (fallback.currentSpeedMps != null && fallback.currentDirectionDeg != null) ? { provider: fallback.source ?? 'open-meteo', fallback: true } : { provider: 'missing', fallback: false },
        waterLevel: { provider: 'pending', fallback: false },
        waterTemperature: item.waterTemperatureC != null ? { provider: 'dmi', fallback: false } : fallback.waterTemperatureC != null ? { provider: fallback.source ?? 'open-meteo', fallback: true } : { provider: 'missing', fallback: false }
      }
    };
    if (Object.values(mergedRow.sources ?? {}).some(source => source?.provider !== 'dmi')) delete mergedRow.source;
    return mergedRow;
  });
  const waterLevelContinuity = repairWaterLevelContinuity(merged, dmiByTime, fallbackByTime, { shortDmiGapHours: SHORT_DMI_WATER_GAP_HOURS, jumpWarningCm: WATER_LEVEL_JUMP_WARN_CM });
  for (const row of merged) row.waterLevelContinuity = waterLevelContinuity;
  return normalizeForecastHourly(merged, { limit: ACCEPTED_FORECAST_HOURS });
}

function componentSource(provider, zone, component, generatedAt, extra = {}) {
  const validTime = component === 'wind' ? zone?.modelSteps?.wind : component === 'wave' ? zone?.modelSteps?.wave : zone?.modelSteps?.ocean;
  return {
    provider,
    providerLabel: zone?.providerLabel ?? provider,
    collection: component === 'wind' ? zone?.dmiCompleteness?.collections?.wind ?? zone?.model?.wind ?? null : component === 'wave' ? zone?.dmiCompleteness?.collections?.wave ?? zone?.model?.wave ?? null : zone?.waterLevel?.diagnostic?.modelCollection ?? zone?.model?.ocean ?? null,
    modelRun: zone?.forecast?.generatedAt ?? zone?.dmiCache?.generatedAt ?? null,
    validTime: validTime ?? null,
    fetchedAt: generatedAt,
    cacheAgeHours: zone?.dmiCache?.cacheAgeHours ?? null,
    fallback: provider !== 'dmi',
    ...extra
  };
}

function componentHasValue(zone, component) {
  const keys = component === 'wind' ? ['windSpeedMps','windDirectionDeg']
    : component === 'wave' ? ['waveHeightM']
    : component === 'current' ? ['currentSpeedMps','currentDirectionDeg']
    : component === 'waterLevel' ? ['waterLevelCm']
    : ['waterTemperatureC'];
  return keys.every(key => zone?.current?.[key] !== null && zone?.current?.[key] !== undefined);
}

function sourceForComponent(zone, component, generatedAt) {
  if (!componentHasValue(zone, component)) {
    return componentSource('missing', zone, component, generatedAt, {
      providerLabel: 'Mangler data', fallback: false,
      fallbackReason: 'Ingen gyldig værdi fra DMI eller fallback'
    });
  }
  const p = zone?.provider ?? 'unknown';
  return componentSource(p, zone, component, generatedAt, {
    fallbackReason: zone?.fallback ? (zone?.attempts?.at(-1)?.message ?? 'Primær DMI-kilde var ikke komplet') : null
  });
}

function mergeDmiWithFallback(dmiResult, fallbackZone) {
  if (!fallbackZone) return dmiResult;
  const groups = {
    wind: ['windSpeedMps','windDirectionDeg'],
    wave: ['waveHeightM','waveDirectionDeg','wavePeriodS'],
    current: ['currentSpeedMps','currentDirectionDeg'],
    waterLevel: ['waterLevelCm','waterLevelTrendCm3h'],
    waterTemperature: ['waterTemperatureC']
  };
  const mergedCurrent = {};
  const sources = {};
  for (const [component, keys] of Object.entries(groups)) {
    const dmiHas = keys.every(key => dmiResult.current?.[key] !== null && dmiResult.current?.[key] !== undefined);
    const fallbackHas = keys.every(key => fallbackZone.current?.[key] !== null && fallbackZone.current?.[key] !== undefined);
    for (const key of keys) mergedCurrent[key] = dmiResult.current?.[key] ?? fallbackZone.current?.[key] ?? null;
    sources[component] = dmiHas
      ? componentSource('dmi', dmiResult, component, dmiResult.generatedAt ?? new Date().toISOString(), { fallback: false })
      : fallbackHas
        ? componentSource(fallbackZone.provider ?? 'fallback', fallbackZone, component, fallbackZone.generatedAt ?? new Date().toISOString(), { fallback: true, fallbackReason: 'DMI-komponenten manglede og blev udfyldt fra fallback' })
        : componentSource('missing', fallbackZone, component, fallbackZone.generatedAt ?? new Date().toISOString(), { fallback: false, providerLabel: 'Mangler data', fallbackReason: 'Ingen gyldig værdi fra DMI eller fallback' });
  }
  const dmiForecast = dmiResult.dmiForecast ?? dmiResult.forecast ?? null;
  if (dmiForecast) {
    dmiForecast.hourly = mergeHourlyPreferDmi(dmiForecast.hourly, fallbackZone.forecast?.hourly ?? [], { generatedAt: dmiForecast.generatedAt });
    dmiForecast.validFrom = dmiForecast.hourly[0]?.time ?? dmiForecast.validFrom;
    dmiForecast.validUntil = dmiForecast.hourly.at(-1)?.time ?? dmiForecast.validUntil;
    dmiForecast.horizonHours = dmiForecast.hourly.length;
  }
  const mergedForecast = dmiForecast ? { provider: 'mixed', providerLabel: 'DMI med komponentvis fallback', generatedAt: dmiForecast.generatedAt, validUntil: dmiForecast.validUntil, hourly: dmiForecast.hourly } : fallbackZone.forecast;
  return {
    ...fallbackZone,
    ...dmiResult,
    provider: 'mixed',
    providerLabel: 'Blandede datakilder',
    current: mergedCurrent,
    forecast: mergedForecast,
    sources,
    modelSteps: {
      wind: dmiResult.modelSteps?.wind ?? fallbackZone.modelSteps?.wind ?? null,
      wave: dmiResult.modelSteps?.wave ?? fallbackZone.modelSteps?.wave ?? null,
      ocean: dmiResult.modelSteps?.ocean ?? fallbackZone.modelSteps?.ocean ?? null
    }
  };
}

function componentForecastHorizonHours(record, generatedAt, keys) {
  const start = Date.parse(generatedAt);
  if (!Number.isFinite(start)) return 0;
  const validTimes = normalizeForecastHourly(record?.hourly ?? [], { limit: Number.MAX_SAFE_INTEGER })
    .filter(row => keys.every(key => row?.[key] !== null && row?.[key] !== undefined))
    .map(row => Date.parse(row.time))
    .filter(time => Number.isFinite(time) && time >= start - 65 * 60000);
  return validTimes.length ? Math.max(0, (Math.max(...validTimes) - start) / 3600000) : 0;
}

function recordHasMarine(record, generatedAt) {
  const coverage = dmiForecastCoverage(record, generatedAt);
  const completeness = record?.model?.completeness ?? {};
  return coverage.available && completeness.ocean === true
    && componentForecastHorizonHours(record, generatedAt, ['waterLevelCm','currentSpeedMps','currentDirectionDeg']) >= 24;
}

function recordHasAtmosphere(record, generatedAt) {
  const coverage = dmiForecastCoverage(record, generatedAt);
  const completeness = record?.model?.completeness ?? {};
  const windHours = componentForecastHorizonHours(record, generatedAt, ['windSpeedMps','windDirectionDeg']);
  const waveHours = componentForecastHorizonHours(record, generatedAt, ['waveHeightM']);
  return coverage.available && completeness.wind === true && completeness.wave === true
    && windHours >= 96 && waveHours >= 24;
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
    displaySource: num(currentForecast?.waterLevelCm) !== null ? (currentForecast?.waterLevelSource ?? (fromCache ? 'dmi-model-cache' : 'dmi-model-authoritative')) : 'missing',
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

function normalizeDeg(value) { const n = num(value); return n === null ? null : ((n % 360) + 360) % 360; }
function angularDifference(a, b) { const x = normalizeDeg(a), y = normalizeDeg(b); return x === null || y === null ? null : Math.abs(((x - y + 540) % 360) - 180); }
function directionAlignment(directionDeg, targetDeg) {
  const d = angularDifference(directionDeg, targetDeg);
  if (d === null) return null;
  if (d <= 25) return 1; if (d <= 55) return .65; if (d <= 90) return .2; if (d <= 130) return -.35; return -.8;
}
function effectiveCurrentAlignment(feature, directionDeg) {
  const p = feature?.properties ?? {};
  const anchors = Array.isArray(p.directionAnchors) && p.directionAnchors.length
    ? p.directionAnchors
    : [{ onshoreDirectionDeg: p.onshoreDirectionDeg, weight: 1 }];
  const rows = anchors.map(anchor => ({ alignment: directionAlignment(directionDeg, anchor?.onshoreDirectionDeg), weight: Math.max(.1, num(anchor?.weight) ?? 1) }))
    .filter(row => row.alignment !== null);
  if (!rows.length) return null;
  const best = Math.max(...rows.map(row => row.alignment));
  const positive = rows.filter(row => row.alignment > 0);
  if (!positive.length) return best;
  const weighted = positive.reduce((sum, row) => sum + row.alignment * row.weight, 0) / positive.reduce((sum, row) => sum + row.weight, 0);
  return Math.max(-.8, Math.min(1, best * .7 + weighted * .3));
}
function durationAndMomentum(samples, predicate, contribution) {
  let duration = 0, momentum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i];
    if (!predicate(sample)) continue;
    const nextAt = i + 1 < samples.length ? Date.parse(samples[i + 1].at) : Date.parse(sample.at) + 3600000;
    const hours = Math.max(0, Math.min(2, (nextAt - Date.parse(sample.at)) / 3600000));
    duration += hours;
    momentum += contribution(sample) * hours;
  }
  return { duration: round(duration, 1), momentum: round(momentum, 3) };
}
function lastContiguousEvent(samples, predicate) {
  let end = -1;
  for (let i = samples.length - 1; i >= 0; i -= 1) { if (predicate(samples[i])) { end = i; break; } }
  if (end < 0) return null;
  let start = end;
  while (start > 0 && predicate(samples[start - 1]) && Date.parse(samples[start].at) - Date.parse(samples[start - 1].at) <= 2 * 3600000) start -= 1;
  const startAt = Date.parse(samples[start].at), endAt = Date.parse(samples[end].at);
  return { startAt: samples[start].at, endAt: samples[end].at, durationHours: round(Math.max(1, (endAt - startAt) / 3600000 + 1), 1) };
}
function historyFor(previous, zoneId, current, generatedAt, feature = null) {
  const cutoff = Date.parse(generatedAt) - 24 * 3600000;
  const currentAlignment = effectiveCurrentAlignment(feature, current.currentDirectionDeg);
  const samples = [...(previous?.zones?.[zoneId]?.samples24h ?? []), {
    at: generatedAt,
    windSpeedMps: current.windSpeedMps,
    windDirectionDeg: current.windDirectionDeg,
    waveHeightM: current.waveHeightM,
    currentSpeedMps: current.currentSpeedMps,
    currentDirectionDeg: current.currentDirectionDeg,
    currentAlignment,
    waterLevelCm: current.waterLevelCm,
    waterLevelTrendCm3h: current.waterLevelTrendCm3h
  }].filter(sample => Date.parse(sample.at) >= cutoff)
    .filter((sample, index, all) => all.findIndex(item => item.at === sample.at) === index)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const winds = samples.map(s => num(s.windSpeedMps)).filter(Number.isFinite);
  const waves = samples.map(s => num(s.waveHeightM)).filter(Number.isFinite);
  const high = samples.filter(s => (num(s.windSpeedMps) ?? 0) >= 9 || (num(s.waveHeightM) ?? 0) >= 1.2).at(-1);
  const strongEvent = lastContiguousEvent(samples, s => (num(s.windSpeedMps) ?? 0) >= 14 || (num(s.waveHeightM) ?? 0) >= 1.5);
  const inbound = durationAndMomentum(samples, s => (num(s.currentAlignment) ?? -1) >= .2 && (num(s.currentSpeedMps) ?? 0) > 0,
    s => Math.max(0, num(s.currentAlignment) ?? 0) * (num(s.currentSpeedMps) ?? 0));
  const outbound = durationAndMomentum(samples, s => (num(s.currentAlignment) ?? 1) <= -.35 && (num(s.currentSpeedMps) ?? 0) > 0,
    s => Math.abs(Math.min(0, num(s.currentAlignment) ?? 0)) * (num(s.currentSpeedMps) ?? 0));
  const alignments = samples.map(s => num(s.currentAlignment)).filter(Number.isFinite);
  const stability = alignments.length >= 2 ? Math.max(0, 1 - (Math.max(...alignments) - Math.min(...alignments)) / 1.8) : null;
  const strongHoursSinceEnd = strongEvent ? round((Date.parse(generatedAt) - Date.parse(strongEvent.endAt)) / 3600000, 1) : null;
  const mobilisationPotential = Math.max(0, Math.min(100,
    (winds.length ? Math.min(55, Math.max(...winds) / 14 * 55) : 0) +
    (waves.length ? Math.min(35, Math.max(...waves) / 1.5 * 35) : 0) +
    (strongEvent ? Math.min(10, strongEvent.durationHours * 2) : 0)));
  const inboundMomentum = Math.max(0, Math.min(100, inbound.momentum * 85));
  const outboundPressure = Math.max(0, Math.min(100, outbound.momentum * 85));
  const nearshorePotential = Math.max(0, Math.min(100, mobilisationPotential * .45 + inboundMomentum * .65 - outboundPressure * .55));
  let eventPhase = 'rolig fase';
  if (strongEvent && strongHoursSinceEnd !== null && strongHoursSinceEnd <= 1) eventPhase = 'højenergifase';
  else if (strongEvent && strongHoursSinceEnd !== null && strongHoursSinceEnd <= 18 && inbound.duration > 0) eventPhase = 'efterstorm/indtransport';
  else if (nearshorePotential >= 55) eventPhase = 'vedvarende nærkystpotentiale';
  else if (outboundPressure >= 35) eventPhase = 'udtransport/nedbrydning';
  else if (inbound.duration > 0) eventPhase = 'indtransport opbygges';
  return {
    samples24h: samples,
    history: {
      maxWind24hMps: winds.length ? round(Math.max(...winds), 1) : null,
      maxWave24hM: waves.length ? round(Math.max(...waves), 2) : null,
      hoursSinceHighEnergy: high ? round((Date.parse(generatedAt) - Date.parse(high.at)) / 3600000, 1) : null,
      strongEventDurationHours: strongEvent?.durationHours ?? null,
      hoursSinceStrongEventEnd: strongHoursSinceEnd,
      inboundCurrentDurationHours: inbound.duration,
      inboundCurrentMomentum: inboundMomentum === 0 && inbound.duration === 0 ? 0 : round(inboundMomentum, 1),
      outboundCurrentDurationHours: outbound.duration,
      outboundCurrentPressure: outboundPressure === 0 && outbound.duration === 0 ? 0 : round(outboundPressure, 1),
      currentDirectionStability: stability === null ? null : round(stability, 2),
      mobilisationPotential: round(mobilisationPotential, 1),
      nearshorePotential: round(nearshorePotential, 1),
      eventPhase,
      stateModelMode: 'shadow-v1'
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

function flowPointsFromForecastRecord(feature, record) {
  const fallback = zonePoint(feature);
  const grid = record?.model?.completeness?.gridPoints ?? {};
  const pointFor = (...keys) => {
    for (const key of keys) {
      const row = grid?.[key];
      const lon = Number(row?.longitude), lat = Number(row?.latitude);
      if (Number.isFinite(lon) && Number.isFinite(lat)) return [lon, lat];
    }
    return fallback;
  };
  const currentGrid = pointFor('current-u', 'current-v');
  const windGrid = pointFor('wind-u-10m', 'wind-v-10m');
  const waveGrid = pointFor('significant-wave-height', 'mean-wave-dir');
  return { current: currentGrid, wind: windGrid, wave: waveGrid, sources: { current: grid?.['current-u'] && grid?.['current-v'] ? 'dmi-marine-grid' : 'zone-marine-anchor', wind: grid?.['wind-u-10m'] && grid?.['wind-v-10m'] ? 'dmi-atmospheric-grid' : 'zone-marine-anchor', wave: grid?.['significant-wave-height'] ? 'dmi-wave-grid' : 'zone-marine-anchor' } };
}

function zoneFromDmiForecastCache(feature, record, generatedAt) {
  const selected = selectDmiForecastAt(record, generatedAt);
  if (!selected) return null;
  const remaining = (record.hourly ?? []).filter(item => Date.parse(item.time) >= Date.parse(generatedAt) - 30 * 60000);
  return {
    point: zonePoint(feature),
    flowPoints: flowPointsFromForecastRecord(feature, record),
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
      currentUMps: selected.currentUMps ?? null,
      currentVMps: selected.currentVMps ?? null,
      currentSpeedMps: selected.currentSpeedMps ?? null,
      currentDirectionDeg: selected.currentDirectionDeg ?? null,
      waterTemperatureC: selected.waterTemperatureC ?? null
    },
    waterLevel: {
      source: selected.waterLevelCm != null ? (selected.waterLevelSource ?? 'dmi-model-cache') : 'missing',
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

async function fallbackForZone(feature, generatedAt, previous, attempts) {
  for (const [name, provider] of [['open-meteo', fromOpenMeteo], ['met-norway', fromMetNorway]]) {
    try {
      const result = await provider(feature, generatedAt);
      let forecast = previous?.zones?.[feature.properties?.id]?.forecast ?? null;
      try { forecast = await forecastFromOpenMeteo(feature); }
      catch (forecastError) { attempts.push({ provider: 'open-meteo-forecast', message: forecastError instanceof Error ? forecastError.message : String(forecastError) }); }
      return { ...result, forecast, stale: false, fallback: true, attempts };
    } catch (error) {
      attempts.push({ provider: name, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return null;
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
    nextDmiForecastStore.zones[zoneId] = { ...existingRecord, hourly: normalizeForecastHourly(existingRecord?.hourly ?? []) };
    if (dmiOnly) {
      const history = historyFor(previous, zoneId, healthyCachedDmi.current, generatedAt, feature);
      return { ...healthyCachedDmi, ...history, stale: false, fallback: false, attempts, acquisition: { mode: 'dmi-cache-only', remainingHours: existingCoverage.remainingHours } };
    }
    const fallback = await fallbackForZone(feature, generatedAt, previous, attempts);
    const merged = fallback ? mergeDmiWithFallback(healthyCachedDmi, fallback) : healthyCachedDmi;
    const history = historyFor(previous, zoneId, merged.current, generatedAt, feature);
    return { ...merged, ...history, stale: false, fallback: Boolean(fallback), attempts, acquisition: { mode: fallback ? 'cache-first-dmi-component-fill' : 'cache-first-dmi-only', remainingHours: existingCoverage.remainingHours } };
  }

  if (allowLiveDmi) try {
    const result = await fromDmi(feature, generatedAt);
    const history = historyFor(previous, zoneId, result.current, generatedAt, feature);
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
    nextDmiForecastStore.zones[zoneId] = { ...dmiForecastStore.zones[zoneId], hourly: normalizeForecastHourly(dmiForecastStore.zones[zoneId]?.hourly ?? []) };
    const fallback = dmiOnly ? null : await fallbackForZone(feature, generatedAt, previous, attempts);
    const merged = fallback ? mergeDmiWithFallback(cachedDmi, fallback) : cachedDmi;
    const history = historyFor(previous, zoneId, merged.current, generatedAt, feature);
    return { ...merged, ...history, stale: false, fallback: Boolean(fallback), attempts };
  }
  attempts.push({ provider: 'dmi-cache', message: 'Ingen gyldig DMI-prognose i 120-timers cache' });
  if (dmiOnly) throw new Error(`${zoneId}: DMI live og DMI cache fejlede`);

  const fallback = await fallbackForZone(feature, generatedAt, previous, attempts);
  if (fallback) {
    const history = historyFor(previous, zoneId, fallback.current, generatedAt, feature);
    return { ...fallback, ...history };
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
  const total = Object.keys(output.zones ?? {}).length;
  const cache = output.weatherEngine?.dmiForecastCache ?? {};
  const complete = cache.completeZones ?? 0;
  const actualComplete = Object.values(output.zones ?? {}).filter(zone =>
    componentHasValue(zone, 'wind') && componentHasValue(zone, 'wave') &&
    componentHasValue(zone, 'current') && componentHasValue(zone, 'waterLevel')).length;
  const userDataHealthy = total > 0 && actualComplete / total >= 0.95;
  const dmiCompletePercent = total ? round(complete / total * 100, 1) : 0;
  const conversionHealthy = output.weatherEngine?.acquisition?.bulkModelDownloads?.conversionHealthy !== false;
  const dmiHealthy = total > 0 && dmiCompletePercent >= 80 && !dmiTransientFailure && conversionHealthy;
  const degraded = !dmiHealthy || !userDataHealthy;
  const failureSince = dmiTransientFailure ? (previousHealth.dmi?.consecutiveFailureSince ?? nowIso) : null;
  const failureMinutes = failureSince ? Math.max(0, Math.round((now - Date.parse(failureSince)) / 60000)) : 0;
  const recentAlerts = (previousHealth.alertHistory ?? []).filter(item => now - Date.parse(item.sentAt) < 24 * 3600000);
  const alertEligible = dmiTransientFailure && failureMinutes >= ALERT_FAILURE_MINUTES && recentAlerts.length < ALERT_MAX_PER_24H;
  const alertHistory = alertEligible ? [...recentAlerts, { sentAt: nowIso, reason: 'Brugerdata har været utilstrækkelige i længere tid', dmiZones: complete, totalZones: total }] : recentAlerts;
  return {
    generatedAt: nowIso,
    status: userDataHealthy ? (degraded ? 'degraded' : 'ok') : (actualComplete / Math.max(1,total) >= 0.9 ? 'degraded' : (failureMinutes >= ALERT_FAILURE_MINUTES ? 'alarm' : 'warning')),
    serviceStatus: actualComplete / Math.max(1,total) >= 0.9 ? 'degraded' : 'alarm',
    userForecastStatus: userDataHealthy ? 'ok' : (actualComplete / Math.max(1,total) >= 0.9 ? 'warning' : 'alarm'),
    dmiCoverageStatus: dmiHealthy ? 'ok' : 'alarm',
    apiConnectivityStatus: dmiHttp429Count > 0 ? 'rate-limited' : 'ok',
    userData: { healthy: userDataHealthy, completeZones: actualComplete, totalZones: total, coveragePercent: total ? round(actualComplete / total * 100, 1) : 0 },
    dmi: {
      healthy: dmiHealthy, zonesFromDmi: cache.availableZones ?? cache.zones ?? 0, totalZones: total,
      coveragePercent: dmiCompletePercent, completeZones: complete,
      componentCoverage: {
        wind: cache.windZones ?? 0, wave: cache.waveZones ?? 0,
        current: cache.currentZones ?? 0, waterLevel: cache.waterLevelZones ?? 0
      },
      consecutiveFailureSince: failureSince, failureMinutes,
      lastSuccessfulAt: (cache.availableZones ?? 0) > 0 ? nowIso : (previousHealth.dmi?.lastSuccessfulAt ?? null),
      lastApiSuccessAt: output.weatherEngine?.providers?.DMI?.lastSuccessAt ?? previousHealth.dmi?.lastApiSuccessAt ?? null,
      lastObservationSuccessAt: output.weatherEngine?.providers?.['DMI oceanObs water level']?.lastSuccessAt ?? previousHealth.dmi?.lastObservationSuccessAt ?? null,
      lastCoverageImprovementAt: complete > (previousHealth.dmi?.completeZones ?? 0) ? nowIso : (previousHealth.dmi?.lastCoverageImprovementAt ?? null),
      pipeline: {
        acquisition: { status: dmiTransientFailure ? 'degraded' : 'healthy' },
        conversion: { status: conversionHealthy ? 'healthy' : 'degraded' },
        horizon: { status: (cache.minimumRemainingHours ?? 0) >= 110 ? 'healthy' : 'critical', minimumRemainingHours: cache.minimumRemainingHours ?? null },
        observations: { status: output.dataQuality?.observations?.currentRun?.attempted === false ? 'cached' : ((output.dataQuality?.observations?.stationsFetched ?? 0)>0 ? 'healthy' : 'degraded') },
        acquisitionHealthy: !dmiTransientFailure,
        conversionHealthy,
        bulkMarineCandidateZones: output.weatherEngine?.acquisition?.bulkModelDownloads?.bulkMarineCandidateZones ?? 0,
        conversionLossZones: output.weatherEngine?.acquisition?.bulkModelDownloads?.conversionLossZones ?? [],
        conversionLossPercent: output.weatherEngine?.acquisition?.bulkModelDownloads?.conversionLossPercent ?? 0
      }
    },
    alerts: { maxPer24Hours: ALERT_MAX_PER_24H, sentLast24Hours: alertHistory.length, shouldNotifyAdministrator: alertEligible, nextAllowedAfter: alertHistory.length >= ALERT_MAX_PER_24H ? alertHistory[0].sentAt : null },
    providers: output.weatherEngine?.providers ?? {},
    dmiForecastCache: cache,
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
// 4.0.10: Forecast EDR is controlled only by its channel-specific cooldown.
// The legacy global cooldown is deleted so old state cannot block healthy EDR calls.
const persistedCooldown = Date.parse(dmiPersistentRuntime.rateLimits?.forecastEdr?.rateLimitedUntil ?? '');
if (Number.isFinite(persistedCooldown) && persistedCooldown > Date.now()) dmiRateLimitedUntil = persistedCooldown;
else dmiPersistentRuntime.rateLimits.forecastEdr.rateLimitedUntil = null;
delete dmiPersistentRuntime.rateLimitedUntil;
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
  nextDmiForecastStore,
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
    output.zones[zoneId] = await resolveZone(feature, generatedAt, previous, nextDmiForecastStore, nextDmiForecastStore, { allowLiveDmi: false });
    console.log(`OK: ${zoneId} via ${output.zones[zoneId].provider}`);
  } catch (error) {
    output.errors.push({ zoneId, message: error instanceof Error ? error.message : String(error) });
  }
});

const marineCacheCompleteAtStart = activeZoneIds.every(zoneId => recordHasMarine(nextDmiForecastStore.zones?.[zoneId], generatedAt));
const atmosphereCacheCompleteAtStart = activeZoneIds.every(zoneId => recordHasAtmosphere(nextDmiForecastStore.zones?.[zoneId], generatedAt));
const acquisitionPhase = !atmosphereCacheCompleteAtStart ? 'dmi-atmosphere-repair' : !marineCacheCompleteAtStart ? 'dmi-marine-repair' : 'dmi-component-refresh';
const cursorStart = Math.max(0, Number(dmiPersistentRuntime.nextZoneCursor) || 0) % Math.max(1, stableFeatures.length);
const rotatedStable = [...stableFeatures.slice(cursorStart), ...stableFeatures.slice(0, cursorStart)];
const eligibleFeatures = rotatedStable.filter(feature => {
  const zoneId = feature.properties?.id;
  const repairState = dmiPersistentRuntime.zoneRepairState?.[zoneId];
  const nextEligibleAt = Date.parse(repairState?.nextEligibleAt ?? '');
  return !(Number.isFinite(nextEligibleAt) && nextEligibleAt > Date.now());
});
// Vind og marine repareres uafhængigt. Atmosfæremangler prioriteres, fordi en
// ufuldstændig marinezone aldrig må blokere DMI-vind for resten af Danmark.
const targetFeatures = eligibleFeatures
  .filter(feature => {
    const record = nextDmiForecastStore.zones?.[feature.properties?.id];
    return !recordHasAtmosphere(record, generatedAt) || !recordHasMarine(record, generatedAt);
  })
  .sort((a, b) => {
    const aMissingWind = !recordHasAtmosphere(nextDmiForecastStore.zones?.[a.properties?.id], generatedAt);
    const bMissingWind = !recordHasAtmosphere(nextDmiForecastStore.zones?.[b.properties?.id], generatedAt);
    return Number(bMissingWind) - Number(aMissingWind);
  });

const edrState = dmiPersistentRuntime.rateLimits?.forecastEdr ?? {};
const edrSuccessStreak = Math.max(0, Number(edrState.successStreak) || 0);
const adaptiveLiveBudget = edrSuccessStreak < 3 ? 1 : edrSuccessStreak < 6 ? Math.min(2, DMI_LIVE_ZONE_BUDGET) : DMI_LIVE_ZONE_BUDGET;
let liveDmiAssigned = 0;
for (const feature of targetFeatures) {
  if (liveDmiAssigned >= adaptiveLiveBudget || dmiRequestBudgetUsed >= DMI_REQUEST_BUDGET) break;
  if (dmiRateLimitTriggered || Date.now() < dmiRateLimitedUntil) break;
  const zoneId = feature.properties?.id ?? 'Ukendt zone';
  liveDmiAssigned += 1;
  dmiAcquisitionStats.assignedZoneIds.push(zoneId);
  dmiAcquisitionStats.attemptedZoneIds.push(zoneId);
  dmiPersistentRuntime.lastAttemptedZoneId = zoneId;
  dmiPersistentRuntime.lastAttemptAt = new Date().toISOString();
  try {
    const existingRecord = nextDmiForecastStore.zones?.[zoneId];
    const includeAtmosphere = !recordHasAtmosphere(existingRecord, generatedAt);
    const dmiResult = await fromDmi(feature, generatedAt, { includeAtmosphere });
    const merged = mergeDmiWithFallback(dmiResult, output.zones[zoneId]);
    nextDmiForecastStore.zones[zoneId] = merged.dmiForecast;
    const forecast = {
      provider: 'dmi', providerLabel: merged.providerLabel,
      generatedAt: merged.dmiForecast.generatedAt,
      validUntil: merged.dmiForecast.validUntil,
      hourly: merged.dmiForecast.hourly
    };
    const { dmiForecast, ...publicResult } = merged;
    const history = historyFor(previous, zoneId, publicResult.current, generatedAt, feature);
    output.zones[zoneId] = { ...publicResult, ...history, forecast, stale: false, fallback: !recordHasAtmosphere(merged.dmiForecast, generatedAt) || !recordHasMarine(merged.dmiForecast, generatedAt), attempts: output.zones[zoneId]?.attempts ?? [], acquisition: { mode: acquisitionPhase } };
    const stableIndex = stableFeatures.findIndex(item => item.properties?.id === zoneId);
    dmiPersistentRuntime.nextZoneCursor = stableFeatures.length ? (stableIndex + 1) % stableFeatures.length : 0;
    dmiAcquisitionStats.cursorAdvancedForZoneIds.push(zoneId);
    dmiPersistentRuntime.lastSuccessfulZoneId = zoneId;
    dmiPersistentRuntime.lastSuccessAt = new Date().toISOString();
    dmiAcquisitionStats.successfulZoneIds.push(zoneId);
    dmiPersistentRuntime.rateLimits ??= {};
    dmiPersistentRuntime.rateLimits.forecastEdr = { ...(dmiPersistentRuntime.rateLimits.forecastEdr ?? {}), rateLimitedUntil: null, successStreak: edrSuccessStreak + dmiAcquisitionStats.successfulZoneIds.length, lastSuccessAt: new Date().toISOString() };
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
    const terminalNoProgress = ['DMI_NO_USABLE_COMPONENTS'].includes(error?.code) || /mangler vandstand og strøm|ingen brugbare marine komponenter/i.test(message);
    if (terminalNoProgress) {
      const stableIndex = stableFeatures.findIndex(item => item.properties?.id === zoneId);
      dmiPersistentRuntime.nextZoneCursor = stableFeatures.length ? (stableIndex + 1) % stableFeatures.length : 0;
      dmiAcquisitionStats.cursorAdvancedForZoneIds.push(zoneId);
      dmiPersistentRuntime.zoneRepairState ??= {};
      dmiPersistentRuntime.zoneRepairState[zoneId] = { lastAttemptAt: new Date().toISOString(), result: 'no-new-marine-components', nextEligibleAt: new Date(Date.now() + 12 * 3600000).toISOString() };
      continue;
    }
    // Netværksfejl uden 429 prøves igen senere.
    break;
  }
}


// DMI oceanObs hentes højst én gang pr. datatype og deles af alle zoner.
// ForecastEDR og OceanObs har uafhængig fejlhåndtering; en forecast-429 må ikke
// blokere vandstandsobservationer fra den separate OceanObs-tjeneste.
const lastObservationSuccessMs = Date.parse(dmiPersistentRuntime.observations?.lastSuccessfulAt ?? '');
const lastObservationMs = Date.parse(dmiPersistentRuntime.lastObservationAt ?? '');
const observationDue = !Number.isFinite(lastObservationSuccessMs) || !Number.isFinite(lastObservationMs) || Date.now() - lastObservationMs >= DMI_OBSERVATION_INTERVAL_MINUTES * 60000;
if (!observationDue) {
  dmiObservationSkipReason = 'skipped-until-hourly-observation-window';
} else {
  await mapWithConcurrency(features, WEATHER_CONCURRENCY, async feature => {
    const zoneId = feature.properties?.id;
    const observation = await observedDmiWaterLevel(feature, coastCorridors);
    if (zoneId && output.zones[zoneId]) applyObservedWaterLevel(output.zones[zoneId], feature, observation, generatedAt);
  });
  dmiPersistentRuntime.lastObservationAt = generatedAt;
  dmiPersistentRuntime.observations ??= {};
  dmiPersistentRuntime.observations.lastAttemptAt = generatedAt;
  if (dmiSeaLevelObservationRun.succeeded && dmiSeaLevelObservationRun.validLevelCount > 0) {
    dmiPersistentRuntime.observations.lastSuccessfulAt = generatedAt;
  }
}


function enrichZoneSources(zone, generatedAt) {
  const existing = zone.sources ?? {};
  const groups = ['wind','wave','current','waterLevel','waterTemperature'];
  zone.sources = Object.fromEntries(groups.map(component => [component, existing[component] ?? sourceForComponent(zone, component, generatedAt)]));
  zone.sourceSummary = Object.fromEntries(groups.map(component => [component, zone.sources[component]?.provider ?? 'unknown']));
  return zone;
}

function buildRuntimeDiagnostics(output, health) {
  const zones = Object.entries(output.zones ?? {});
  const components = ['wind','wave','current','waterLevel','waterTemperature'];
  const componentCoverage = Object.fromEntries(components.map(component => {
    const providers = {};
    let missing = 0;
    for (const [, zone] of zones) {
      const provider = zone.sources?.[component]?.provider ?? 'unknown';
      providers[provider] = (providers[provider] ?? 0) + 1;
      const keys = component === 'wind' ? ['windSpeedMps','windDirectionDeg'] : component === 'wave' ? ['waveHeightM'] : component === 'current' ? ['currentSpeedMps','currentDirectionDeg'] : component === 'waterLevel' ? ['waterLevelCm'] : ['waterTemperatureC'];
      if (!keys.every(k => zone.current?.[k] !== null && zone.current?.[k] !== undefined)) missing += 1;
    }
    return [component, { totalZones: zones.length, providers, missing }];
  }));
  return {
    schemaVersion: 1,
    generatedAt: output.generatedAt,
    version: APP_VERSION,
    health,
    componentCoverage,
    forecastCompleteness: (() => {
      const horizons = [6, 24, 48, ACCEPTED_FORECAST_HOURS];
      const componentKeys = { wind: ['windSpeedMps','windDirectionDeg'], wave: ['waveHeightM'], current: ['currentSpeedMps','currentDirectionDeg'], waterLevel: ['waterLevelCm'] };
      const rows = Object.fromEntries(horizons.map(hours => {
        let completeZones = 0, completeHours = 0, totalHours = 0;
        for (const [, zone] of zones) {
          const hourly = normalizeForecastHourly(zone.forecast?.hourly ?? []).slice(0, hours);
          let zoneComplete = hourly.length > 0;
          for (const row of hourly) {
            totalHours += 1;
            const complete = Object.values(componentKeys).every(keys => keys.every(key => row[key] !== null && row[key] !== undefined));
            if (complete) completeHours += 1; else zoneComplete = false;
          }
          if (zoneComplete && hourly.length >= hours) completeZones += 1;
        }
        return [String(hours), { completeZones, totalZones: zones.length, completeHours, totalHours, completeHoursPercent: totalHours ? round(completeHours / totalHours * 100, 1) : 0 }];
      }));
      return rows;
    })(),
    componentHorizonCoverage: Object.fromEntries(components.map(component => {
      const keys = component === 'wind' ? ['windSpeedMps','windDirectionDeg'] : component === 'wave' ? ['waveHeightM'] : component === 'current' ? ['currentSpeedMps','currentDirectionDeg'] : component === 'waterLevel' ? ['waterLevelCm'] : ['waterTemperatureC'];
      const horizons=[6,24,48,ACCEPTED_FORECAST_HOURS]; const summary={};
      for(const hours of horizons){let zonesComplete=0,validHours=0,totalHours=0;for(const [,zone] of zones){const hourly=normalizeForecastHourly(zone.forecast?.hourly??[]).slice(0,hours);const valid=hourly.filter(row=>keys.every(k=>row[k]!=null)).length;validHours+=valid;const expected=Math.min(hours,hourly.length);totalHours+=expected;if(expected>0&&valid===expected)zonesComplete++;}summary[hours]={zonesComplete,totalZones:zones.length,validHours,totalHours,percent:totalHours?round(validHours/totalHours*100,1):0};}
      return [component,summary];
    })),
    freshness: {
      conditionsGeneratedAt: output.generatedAt,
      minimumRemainingHours: output.weatherEngine?.dmiForecastCache?.minimumRemainingHours ?? null,
      maximumRemainingHours: output.weatherEngine?.dmiForecastCache?.maximumRemainingHours ?? null
    },
    duplicateTimes: { zones: output.weatherEngine?.dmiForecastCache?.duplicateTimestampZones ?? 0 },
    rateLimits: {
      http429Count: output.weatherEngine?.acquisition?.http429Count ?? 0,
      stoppedByHttp429: output.weatherEngine?.acquisition?.stoppedByHttp429 ?? false,
      rateLimitedUntil: output.weatherEngine?.acquisition?.persistentRateLimitedUntil ?? null
    },
    observations: output.dataQuality?.observations ?? {},
    acquisition: output.weatherEngine?.acquisition ?? {},
    dataQuality: output.dataQuality ?? {},
    zoneSamples: Object.fromEntries(zones.slice(0, 25))
  };
}

function summarizeDmiComponentCoverage(records, generatedAt) {
  const rows = Object.values(records ?? {}).filter(record => dmiForecastCoverage(record, generatedAt).available);
  const has = (record, predicate) => normalizeForecastHourly(record?.hourly ?? []).some(predicate);
  const horizonStats = keys => {
    const values = rows.map(record => componentForecastHorizonHours(record, generatedAt, keys));
    return {
      zonesWithAnyData: values.filter(value => value > 0).length,
      zonesWith24Hours: values.filter(value => value >= 24).length,
      zonesWith96Hours: values.filter(value => value >= 96).length,
      averageHours: values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length, 1) : 0,
      minimumHours: values.length ? round(Math.min(...values), 1) : 0,
      maximumHours: values.length ? round(Math.max(...values), 1) : 0
    };
  };
  const summary = {
    availableZones: rows.length,
    windZones: rows.filter(record => has(record, item => item.windSpeedMps !== null && item.windDirectionDeg !== null)).length,
    waveZones: rows.filter(record => has(record, item => item.waveHeightM !== null)).length,
    currentZones: rows.filter(record => has(record, item => item.currentSpeedMps !== null && item.currentDirectionDeg !== null)).length,
    waterLevelZones: rows.filter(record => has(record, item => item.waterLevelCm !== null)).length,
    componentHorizonCoverage: {
      wind: horizonStats(['windSpeedMps','windDirectionDeg']),
      wave: horizonStats(['waveHeightM']),
      current: horizonStats(['currentSpeedMps','currentDirectionDeg']),
      waterLevel: horizonStats(['waterLevelCm'])
    },
    completeZones: rows.filter(record => componentForecastHorizonHours(record, generatedAt, ['windSpeedMps','windDirectionDeg']) >= 96
      && componentForecastHorizonHours(record, generatedAt, ['waveHeightM']) >= 24
      && componentForecastHorizonHours(record, generatedAt, ['currentSpeedMps','currentDirectionDeg']) >= 24
      && componentForecastHorizonHours(record, generatedAt, ['waterLevelCm']) >= 24).length,
    duplicateTimestampZones: rows.filter(record => {
      const raw = (record?.hourly ?? []).filter(item => Number.isFinite(Date.parse(item?.time)));
      return new Set(raw.map(item => new Date(Date.parse(item.time)).toISOString())).size !== raw.length;
    }).length
  };
  return summary;
}

output.weatherEngine = {
  version: '2.18.0',
  concurrency: WEATHER_CONCURRENCY,
  dmiRequestConcurrency: DMI_REQUEST_CONCURRENCY,
  dmiRequestGapMs: REQUEST_GAP_MS,
  dmiRequestTimeoutMs: REQUEST_TIMEOUT_MS,
  providerPriority: output.providerPriority,
  acquisition: (() => { const pending = targetFeatures.length; return { strategy: 'bulk-stac-grib-first-with-sequential-edr-repair', bulkModelDownloads: { ...dmiBulkMergeStats, cacheGeneratedAt: dmiBulkCache?.generatedAt ?? null, method: dmiBulkCache?.method ?? null, runs: dmiBulkCache?.runs ?? {}, diagnostics: dmiBulkCache?.diagnostics ?? null }, phase: acquisitionPhase, marineCacheCompleteAtStart, atmosphereCacheCompleteAtStart, liveZoneBudget: DMI_LIVE_ZONE_BUDGET, adaptiveLiveZoneBudget: adaptiveLiveBudget, liveZonesAssigned: liveDmiAssigned, assignedZoneIds: dmiAcquisitionStats.assignedZoneIds, attemptedZones: dmiAcquisitionStats.attemptedZoneIds.length, attemptedZoneIds: dmiAcquisitionStats.attemptedZoneIds, successfulZones: dmiAcquisitionStats.successfulZoneIds.length, successfulZoneIds: dmiAcquisitionStats.successfulZoneIds, stoppedAfterRateLimitZones: dmiAcquisitionStats.stoppedZoneIds.length, stoppedZoneIds: dmiAcquisitionStats.stoppedZoneIds, requestBudget: DMI_REQUEST_BUDGET, requestsUsed: dmiRequestBudgetUsed, http429Count: dmiHttp429Count, stoppedByHttp429: dmiRateLimitTriggered, persistentRateLimitedUntil: dmiPersistentRuntime.rateLimits?.forecastEdr?.rateLimitedUntil ?? null, rateLimits: dmiPersistentRuntime.rateLimits ?? {}, nextZoneCursor: dmiPersistentRuntime.nextZoneCursor, cursorAdvancedForZoneIds: dmiAcquisitionStats.cursorAdvancedForZoneIds, cacheRefreshBelowHours: DMI_CACHE_REFRESH_BELOW_HOURS, cacheRetention: 'until-forecast-expiry', observationAcquisition: dmiObservationSkipReason ?? 'attempted-once-and-shared', fallbackPolicy: 'DMI is authoritative. Short DMI gaps are interpolated from DMI; fallback is only used as continuous bias-adjusted blocks when DMI is absent.', prioritizedMissingOrExpiringZones: pending, scheduleIntervalMinutes: DMI_SCHEDULE_INTERVAL_MINUTES, observationIntervalMinutes: DMI_OBSERVATION_INTERVAL_MINUTES, estimatedRunsAtCurrentBudget: Math.ceil(pending / Math.max(1, DMI_LIVE_ZONE_BUDGET)), optimisticMinutesToFullCache: Math.ceil(pending / Math.max(1, DMI_LIVE_ZONE_BUDGET)) * DMI_SCHEDULE_INTERVAL_MINUTES }; })(),
  providers: Object.fromEntries([...providerRuntime.entries()].map(([name, state]) => [name, {
    ...state,
    circuitOpen: providerCircuitOpen(name),
    averageLatencyMs: state.requests ? round(state.latencyTotalMs / state.requests, 0) : null
  }]))
};

for (const record of Object.values(nextDmiForecastStore.zones ?? {})) {
  record.hourly = normalizeForecastHourly(record.hourly ?? []);
}
for (const zone of Object.values(output.zones ?? {})) {
  if (zone.forecast?.hourly) zone.forecast.hourly = normalizeForecastHourly(zone.forecast.hourly);
}

nextDmiForecastStore.generatedAt = generatedAt;
nextDmiForecastStore.runtime = { ...dmiPersistentRuntime };
delete nextDmiForecastStore.runtime.rateLimitedUntil;
nextDmiForecastStore.coverage = summarizeAvailableCoverage(nextDmiForecastStore.zones, generatedAt, dmiForecastCoverage, round);
nextDmiForecastStore.dataQuality = summarizeDmiComponentCoverage(nextDmiForecastStore.zones, generatedAt);
output.weatherEngine.dmiForecastCache = { ...nextDmiForecastStore.coverage, ...nextDmiForecastStore.dataQuality };
const rawStationRegistry = await dmiWaterStations().catch(() => readCachedWaterStations());
const waterSourceForecastIndex = buildWaterSourceForecastIndex(rawStationRegistry, dmiBulkCache, generatedAt);
const forecastAwareRegistry = applyWaterSourceForecastStatus(rawStationRegistry, waterSourceForecastIndex, generatedAt, { minimumHours: 96 });
const qualityLevels = dmiObservationSkipReason ? await cachedStationLevels(generatedAt) : await dmiLatestSeaLevels().catch(() => new Map());
const observationResultUsable = !dmiObservationSkipReason && dmiSeaLevelObservationRun.succeeded && dmiSeaLevelObservationRun.validLevelCount > 0;
const stationLifecycle = await updateStationObservationLifecycle(forecastAwareRegistry, qualityLevels, generatedAt, { observationAttempted: observationResultUsable, forecastStore: nextDmiForecastStore });
const stationRegistry = stationLifecycle.stations;
const activeWaterRouting = await waterStationRouting();
const waterSourceApplication = applyWaterSourceRouting({ features, output, forecastStore: nextDmiForecastStore, sources: stationRegistry, index: waterSourceForecastIndex, routing: activeWaterRouting, haversineKm, generatedAt });
const stationRoutingAudit = await writeWaterStationRoutingAudit(features, stationRegistry.filter(station => station.routingEligible || station.overallUsabilityStatus !== 'unavailable'), generatedAt);
const qualityStations = stationRegistry;
for (const zone of Object.values(output.zones)) enrichZoneSources(zone, generatedAt);
const freshObservationCount = [...qualityLevels.values()].filter(level => !level?.cacheSource).length;
output.dataQuality = buildDataQuality(output, { stationsFetched: qualityStations.length, stationsWithFreshLevel: freshObservationCount });
output.dataQuality.stationRouting = { ...stationRoutingAudit.counts, productionApplication: waterSourceApplication.audit };
output.dataQuality.stationLifecycle = stationLifecycle.document.summary;
output.dataQuality.stationNotifications = stationLifecycle.notifications;
const waterSourceAudit = {
  schemaVersion: 1,
  generatedAt,
  summary: {
    total: stationRegistry.length,
    observationStations: stationRegistry.filter(source => source.sourceType === 'observation-station').length,
    forecastPoints: stationRegistry.filter(source => source.sourceType === 'forecast-point').length,
    receivingForecast: stationRegistry.filter(source => source.sourceForecastStatus === 'receiving').length,
    routingEligible: stationRegistry.filter(source => source.routingEligible).length
  },
  sources: stationRegistry.map(source => ({
    sourceKey: source.sourceKey ?? null,
    stationId: String(source.stationId ?? ''),
    name: source.name ?? null,
    sourceType: source.sourceType ?? 'observation-station',
    registryStatus: source.registryStatus ?? null,
    point: source.point ?? null,
    observationStatus: source.deliveryStatus ?? 'unknown',
    forecastStatus: source.sourceForecastStatus ?? 'not-receiving',
    forecastHours: Number(source.sourceForecastHours ?? 0),
    forecastGeneratedAt: source.sourceForecastGeneratedAt ?? null,
    forecastValidUntil: source.sourceForecastValidUntil ?? null,
    routingEligible: Boolean(source.routingEligible)
  }))
};
await fs.mkdir('data/diagnostics', { recursive: true });
await fs.writeFile('data/diagnostics/water-source-audit.json', `${JSON.stringify(waterSourceAudit, null, 2)}\n`);
dmiPersistentRuntime.observations ??= {};
const currentObservationSummary = output.dataQuality?.observations ?? {};
if (observationResultUsable && (currentObservationSummary.stationsWithFreshLevel ?? 0) > 0) {
  dmiPersistentRuntime.observations.lastSuccessfulAt = generatedAt;
  dmiPersistentRuntime.observations.lastSuccessfulInventory = currentObservationSummary;
}
output.dataQuality.observations = {
  ...currentObservationSummary,
  currentRun: { attempted: !dmiObservationSkipReason, succeeded: observationResultUsable, skipReason: dmiObservationSkipReason, validLevelCount: dmiSeaLevelObservationRun.validLevelCount, featureCount: dmiSeaLevelObservationRun.featureCount, parameters: dmiSeaLevelObservationRun.parameters, error: dmiSeaLevelObservationRun.error },
  lastSuccessfulAt: dmiPersistentRuntime.observations.lastSuccessfulAt ?? null,
  lastSuccessfulInventory: dmiPersistentRuntime.observations.lastSuccessfulInventory ?? null
};
await fs.mkdir('data/live', { recursive: true });
await writeDmiForecastStoreCheckpoint();

const fallbackZoneIds = Object.entries(output.zones)
  .filter(([, zone]) => zone.provider !== 'dmi')
  .map(([zoneId]) => zoneId);

if (dmiTransientFailure && fallbackZoneIds.length) {
  output.retry = {
    dmiRetriedAfterMinutes: null,
    completedAt: null,
    nextCentralAttemptMinutes: null,
    reason: 'DMI transient failure; fallback cache published immediately; next attempt follows workflow schedule and persisted cooldown'
  };
  console.log('DMI fejlede midlertidigt. Fallback-data er gemt; næste planlagte centrale kørsel forsøger igen, når DMI-cooldown er udløbet.');
}

// Alle filer fra samme kørsel får samme dataset-id. Frontenden må ikke blande filer fra forskellige kørsler.
output.datasetId = `rr-${generatedAt.replace(/[^0-9]/g,'').slice(0,14)}-${Object.keys(output.zones).length}`;
// Conditions skrives først. Den offentlige runtime og manifestet bygges derefter af én fælles, deterministisk funktion.
await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
await writePublicRuntimeFromFull(output);
const previousHealth = await readHealth();
const weatherHealth = buildWeatherHealth(previousHealth, output, generatedAt);
await fs.writeFile(HEALTH_PATH, `${JSON.stringify(weatherHealth, null, 2)}\n`);
await fs.writeFile(RUNTIME_DIAGNOSTICS_PATH, `${JSON.stringify(buildRuntimeDiagnostics(output, weatherHealth), null, 2)}\n`);

const counts = Object.values(output.zones).reduce((acc, zone) => {
  acc[zone.provider] = (acc[zone.provider] ?? 0) + 1; return acc;
}, {});
console.log(`Skrev ${OUTPUT_PATH}. Kilder: ${JSON.stringify(counts)}. Fejl: ${output.errors.length}.`);
if (!Object.keys(output.zones).length) process.exitCode = 1;
