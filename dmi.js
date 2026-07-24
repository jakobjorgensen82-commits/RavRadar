/**
 * RavRadar Weather Engine 2.7
 * Browser-side provider routing, cache, failover, diagnostics and quality.
 *
 * Priority: DMI -> Open-Meteo Marine -> MET Norway -> cache -> synthetic fallback.
 * Existing callers of getWaterLevel() keep the compatible
 * { status, location, forecast } contract.
 */

const WEATHER_ENGINE_VERSION = "2.7.0";
const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_STALE_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 1;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 10 * 60 * 1000;
const CACHE_PREFIX = "ravradar-weather-v27:";

const memoryCache = new Map();
const providerState = new Map();

const WeatherHealth = {
  lastAttemptAt: null,
  lastSuccessfulAt: null,
  lastError: null,
  mode: "fallback",
  provider: null
};

const WeatherQuality = { score: 0, reason: "uninitialized", source: "unknown", stale: false, completeness: 0 };

const WeatherControlCenter = {
  version: WEATHER_ENGINE_VERSION,
  status: "initializing",
  updatedAt: null,
  selectedSource: null,
  selectedProvider: null,
  attemptedSources: [],
  cache: { hit: false, stale: false, ageMs: null },
  health: null,
  quality: null,
  policy: null
};

const nowIso = () => new Date().toISOString();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;

function normalizeCoordinate(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cacheKey(lat, lon) {
  return `${normalizeCoordinate(lat).toFixed(3)},${normalizeCoordinate(lon).toFixed(3)}`;
}

function runtimeConfig() {
  const cfg = globalThis.RAVRADAR_WEATHER_CONFIG || {};
  return {
    dmiWaterLevelUrl: typeof cfg.dmiWaterLevelUrl === "string" ? cfg.dmiWaterLevelUrl : null,
    openMeteoMarineUrl: typeof cfg.openMeteoMarineUrl === "string" ? cfg.openMeteoMarineUrl : "https://marine-api.open-meteo.com/v1/marine",
    metNorwayUrl: typeof cfg.metNorwayUrl === "string" ? cfg.metNorwayUrl : "https://api.met.no/weatherapi/locationforecast/2.0/compact",
    cacheTtlMs: finite(cfg.cacheTtlMs) ?? DEFAULT_CACHE_TTL_MS,
    staleTtlMs: finite(cfg.staleTtlMs) ?? DEFAULT_STALE_TTL_MS,
    timeoutMs: finite(cfg.timeoutMs) ?? DEFAULT_TIMEOUT_MS,
    retries: Math.max(0, Math.floor(finite(cfg.retries) ?? DEFAULT_RETRIES)),
    disableSyntheticFallback: Boolean(cfg.disableSyntheticFallback)
  };
}

function providerStatus(name) {
  if (!providerState.has(name)) {
    providerState.set(name, {
      failures: 0,
      circuitOpenedAt: null,
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastError: null,
      lastStatus: "idle",
      latencyMs: null,
      attempts: 0
    });
  }
  return providerState.get(name);
}

function circuitIsOpen(name) {
  const state = providerStatus(name);
  if (!state.circuitOpenedAt) return false;
  if (Date.now() - state.circuitOpenedAt >= CIRCUIT_COOLDOWN_MS) {
    state.circuitOpenedAt = null;
    state.failures = 0;
    state.lastStatus = "half-open";
    return false;
  }
  return true;
}

function recordSuccess(name, startedAt) {
  const state = providerStatus(name);
  state.failures = 0;
  state.circuitOpenedAt = null;
  state.lastSuccessAt = nowIso();
  state.lastError = null;
  state.lastStatus = "ok";
  state.latencyMs = Date.now() - startedAt;
  WeatherHealth.lastSuccessfulAt = state.lastSuccessAt;
  WeatherHealth.lastError = null;
  WeatherHealth.mode = "live";
  WeatherHealth.provider = name;
}

function recordFailure(name, error, startedAt) {
  const state = providerStatus(name);
  state.failures += 1;
  state.lastError = String(error?.message || error || "unknown error");
  state.lastStatus = "error";
  state.latencyMs = Date.now() - startedAt;
  if (state.failures >= CIRCUIT_FAILURE_THRESHOLD) state.circuitOpenedAt = Date.now();
  WeatherHealth.lastError = state.lastError;
}

async function fetchJsonWithPolicy(url, provider) {
  if (circuitIsOpen(provider)) throw new Error(`${provider} circuit breaker is open`);
  const config = runtimeConfig();
  const state = providerStatus(provider);
  let lastError;
  for (let attempt = 0; attempt <= config.retries; attempt += 1) {
    const startedAt = Date.now();
    state.lastAttemptAt = nowIso();
    state.attempts += 1;
    WeatherHealth.lastAttemptAt = state.lastAttemptAt;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json, application/geo+json" },
        signal: controller.signal
      });
      if (!response.ok) {
        const error = new Error(`${provider}: HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      const payload = await response.json();
      recordSuccess(provider, startedAt);
      return payload;
    } catch (error) {
      lastError = error?.name === "AbortError" ? new Error(`${provider}: timeout after ${config.timeoutMs} ms`) : error;
      recordFailure(provider, lastError, startedAt);
      const retryable = error?.name === "AbortError" || error instanceof TypeError || error?.status === 429 || error?.status >= 500;
      if (!retryable || attempt >= config.retries) break;
      await sleep(Math.min(4000, 350 * (2 ** attempt)));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error(`${provider}: unknown failure`);
}

function pointTime(rawTime, index) {
  const date = rawTime ? new Date(rawTime) : new Date(Date.now() + index * 3600000);
  return {
    time: Number.isNaN(date.getTime()) ? String(rawTime || "") : date.toLocaleString("da-DK", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    timeIso: Number.isNaN(date.getTime()) ? null : date.toISOString()
  };
}

function normalizeForecastPoint(point, index = 0) {
  const levelCm = finite(point?.levelCm ?? point?.waterLevelCm ?? point?.valueCm ?? point?.value);
  if (levelCm === null) return null;
  const time = pointTime(point?.time ?? point?.validTime ?? point?.observed, index);
  return { ...time, levelCm: Math.round(levelCm), trend: point?.trend || "ukendt" };
}

function normalizeDmiPayload(payload, lat, lon) {
  const candidate = payload?.forecast ?? payload?.hourly ?? payload?.data ?? [];
  const forecast = Array.isArray(candidate) ? candidate.map(normalizeForecastPoint).filter(Boolean) : [];
  if (!forecast.length) throw new Error("DMI response contains no usable water-level points");
  return { status: "ok", location: { lat, lon }, forecast, source: "dmi-live", provider: "dmi", fetchedAt: nowIso(), stale: false };
}

function normalizeOpenMeteoPayload(payload, lat, lon) {
  const times = payload?.hourly?.time ?? [];
  const levels = payload?.hourly?.sea_level_height_msl ?? payload?.hourly?.sea_level_height ?? [];
  const forecast = times.map((time, index) => {
    const metres = finite(levels[index]);
    return metres === null ? null : normalizeForecastPoint({ time, levelCm: metres * 100 }, index);
  }).filter(Boolean);
  if (!forecast.length) throw new Error("Open-Meteo response contains no usable sea-level points");
  return { status: "ok", location: { lat, lon }, forecast, source: "open-meteo-live", provider: "open-meteo", fetchedAt: nowIso(), stale: false };
}

function normalizeMetPayload(payload, lat, lon) {
  const series = payload?.properties?.timeseries ?? [];
  const forecast = series.map((item, index) => {
    const details = item?.data?.instant?.details ?? {};
    const level = finite(details.sea_surface_height ?? details.sea_level_height ?? details.sea_level);
    return level === null ? null : normalizeForecastPoint({ time: item.time, levelCm: Math.abs(level) < 20 ? level * 100 : level }, index);
  }).filter(Boolean);
  if (!forecast.length) throw new Error("MET Norway has no water-level parameter for this location");
  return { status: "ok", location: { lat, lon }, forecast, source: "met-norway-live", provider: "met-norway", fetchedAt: nowIso(), stale: false };
}

export async function fetchDMIWaterLevel(lat, lon) {
  const config = runtimeConfig();
  if (!config.dmiWaterLevelUrl) throw new Error("DMI water-level endpoint is not configured");
  const url = new URL(config.dmiWaterLevelUrl, globalThis.location?.href || "http://localhost/");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  return normalizeDmiPayload(await fetchJsonWithPolicy(url.toString(), "dmi"), lat, lon);
}

export async function fetchOpenMeteoWaterLevel(lat, lon) {
  const config = runtimeConfig();
  const url = new URL(config.openMeteoMarineUrl);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("hourly", "sea_level_height_msl");
  url.searchParams.set("timezone", "GMT");
  url.searchParams.set("forecast_days", "5");
  url.searchParams.set("cell_selection", "sea");
  return normalizeOpenMeteoPayload(await fetchJsonWithPolicy(url.toString(), "open-meteo"), lat, lon);
}

export async function fetchMetNorwayWaterLevel(lat, lon) {
  const config = runtimeConfig();
  const url = new URL(config.metNorwayUrl);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  return normalizeMetPayload(await fetchJsonWithPolicy(url.toString(), "met-norway"), lat, lon);
}

function createFallbackWaterLevel(lat, lon) {
  const now = new Date();
  const forecast = Array.from({ length: 120 }, (_, i) => {
    const time = new Date(now.getTime() + i * 3600000);
    const levelCm = Math.round(Math.sin(i / 8) * 25);
    return { ...pointTime(time.toISOString(), i), levelCm, trend: i < 1 ? "nu" : levelCm > 0 ? "stigende" : "faldende" };
  });
  return { status: "ok", location: { lat, lon }, forecast, source: "fallback-model", provider: "synthetic-fallback", fetchedAt: nowIso(), stale: false };
}

function persistentStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

function writeCache(lat, lon, value) {
  const entry = { storedAt: Date.now(), value: clone(value) };
  const key = cacheKey(lat, lon);
  memoryCache.set(key, entry);
  try { persistentStorage()?.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry)); } catch { /* quota/privacy mode */ }
}

function rawCache(lat, lon) {
  const key = cacheKey(lat, lon);
  if (memoryCache.has(key)) return memoryCache.get(key);
  try {
    const raw = persistentStorage()?.getItem(`${CACHE_PREFIX}${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch { /* malformed/unavailable cache */ }
  return null;
}

function readCache(lat, lon, allowStale = false) {
  const config = runtimeConfig();
  const entry = rawCache(lat, lon);
  if (!entry?.value || !Number.isFinite(entry.storedAt)) return null;
  const ageMs = Date.now() - entry.storedAt;
  const maxAge = allowStale ? config.staleTtlMs : config.cacheTtlMs;
  if (ageMs > maxAge) return null;
  const result = clone(entry.value);
  const stale = ageMs > config.cacheTtlMs;
  result.source = stale ? "stale-cache" : "cache";
  result.originalSource = entry.value.source;
  result.stale = stale;
  return { result, ageMs, stale };
}

export function clearWeatherCache() {
  memoryCache.clear();
  const storage = persistentStorage();
  if (!storage) return;
  try {
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) storage.removeItem(key);
    }
  } catch { /* ignored */ }
}

export function classifyWeatherSource(result) {
  return result?.source || "none";
}

function completenessFor(result) {
  const points = result?.forecast ?? [];
  if (!points.length) return 0;
  return Math.round(points.filter(point => Number.isFinite(Number(point.levelCm)) && point.timeIso).length / points.length * 100);
}

export function evaluateWeatherQuality(diag = {}) {
  const source = diag.source || "unknown";
  const base = { "dmi-live": 100, "open-meteo-live": 88, "met-norway-live": 72, cache: 82, "stale-cache": 55, "fallback-model": 25 }[source] ?? 0;
  const completeness = finite(diag.completeness) ?? 100;
  const stalePenalty = diag.stale ? 15 : 0;
  const score = Math.max(0, Math.min(100, Math.round(base * (completeness / 100) - stalePenalty)));
  Object.assign(WeatherQuality, {
    score,
    reason: source === "fallback-model" ? "synthetic-fallback" : source === "stale-cache" ? "stale-cache" : `${source || "unknown"}-quality`,
    source,
    stale: Boolean(diag.stale),
    completeness
  });
  return clone(WeatherQuality);
}

export function getWeatherQuality() { return clone(WeatherQuality); }

export function getWeatherHealth() {
  return {
    ...clone(WeatherHealth),
    providers: Object.fromEntries([...providerState.entries()].map(([name, state]) => [name, { ...state, circuitOpen: circuitIsOpen(name) }]))
  };
}

export function updateWeatherControlCenter(diag = {}) {
  const live = String(diag.source || "").endsWith("-live");
  WeatherControlCenter.status = diag.error ? "error" : live ? "live" : diag.cacheHit ? "cache" : "fallback";
  WeatherControlCenter.updatedAt = nowIso();
  WeatherControlCenter.selectedSource = diag.source || null;
  WeatherControlCenter.selectedProvider = diag.provider || null;
  WeatherControlCenter.attemptedSources = clone(diag.attemptedSources || []);
  WeatherControlCenter.cache = { hit: Boolean(diag.cacheHit), stale: Boolean(diag.stale), ageMs: finite(diag.cacheAgeMs) };
  WeatherControlCenter.policy = { ...runtimeConfig(), dmiWaterLevelUrl: runtimeConfig().dmiWaterLevelUrl ? "configured" : "not-configured", circuitFailureThreshold: CIRCUIT_FAILURE_THRESHOLD, circuitCooldownMs: CIRCUIT_COOLDOWN_MS };
  WeatherControlCenter.health = getWeatherHealth();
  WeatherControlCenter.quality = evaluateWeatherQuality(diag);
  return getWeatherControlCenter();
}

export function getWeatherControlCenter() { return clone(WeatherControlCenter); }

/** Priority: DMI -> Open-Meteo Marine -> MET Norway -> cache -> fallback. */
export async function getWaterLevelV27(lat, lon, options = {}) {
  const normalizedLat = normalizeCoordinate(lat);
  const normalizedLon = normalizeCoordinate(lon);
  const attemptedSources = [];

  if (!options.forceRefresh) {
    const fresh = readCache(normalizedLat, normalizedLon, false);
    if (fresh) {
      updateWeatherControlCenter({ source: "cache", provider: fresh.result.provider, cacheHit: true, stale: false, cacheAgeMs: fresh.ageMs, attemptedSources: ["cache"], completeness: completenessFor(fresh.result) });
      return fresh.result;
    }
  }

  const providers = [
    ["dmi", fetchDMIWaterLevel],
    ["open-meteo", fetchOpenMeteoWaterLevel],
    ["met-norway", fetchMetNorwayWaterLevel]
  ];
  let lastError = null;
  for (const [name, connector] of providers) {
    attemptedSources.push(name);
    try {
      const live = await connector(normalizedLat, normalizedLon);
      writeCache(normalizedLat, normalizedLon, live);
      updateWeatherControlCenter({ source: live.source, provider: name, attemptedSources, completeness: completenessFor(live) });
      return live;
    } catch (error) {
      lastError = error;
      const state = providerStatus(name);
      if (state.lastError !== String(error?.message || error)) recordFailure(name, error, Date.now());
    }
  }

  const stale = readCache(normalizedLat, normalizedLon, true);
  if (stale) {
    attemptedSources.push("stale-cache");
    WeatherHealth.mode = "cache";
    updateWeatherControlCenter({ source: "stale-cache", provider: stale.result.provider, cacheHit: true, stale: true, cacheAgeMs: stale.ageMs, attemptedSources, completeness: completenessFor(stale.result) });
    return stale.result;
  }

  WeatherHealth.mode = "fallback";
  WeatherHealth.provider = null;
  WeatherHealth.lastError = String(lastError?.message || lastError || "all providers failed");
  if (options.strict || runtimeConfig().disableSyntheticFallback) {
    updateWeatherControlCenter({ source: "none", attemptedSources, error: lastError || new Error("all providers failed"), completeness: 0 });
    throw lastError || new Error("All weather providers failed");
  }
  attemptedSources.push("fallback-model");
  const fallback = createFallbackWaterLevel(normalizedLat, normalizedLon);
  updateWeatherControlCenter({ source: fallback.source, provider: fallback.provider, attemptedSources, completeness: completenessFor(fallback) });
  return fallback;
}

export async function getWaterLevel(lat, lon, options = {}) { return getWaterLevelV27(lat, lon, options); }

export async function getWeatherDiagnostics(lat, lon, options = {}) {
  let sample = null;
  let error = null;
  try { sample = await getWaterLevelV27(lat, lon, options); } catch (caught) { error = caught; }
  return {
    version: WEATHER_ENGINE_VERSION,
    healthy: String(sample?.source || "").endsWith("-live"),
    mode: WeatherHealth.mode,
    lastAttemptAt: WeatherHealth.lastAttemptAt,
    lastSuccessfulAt: WeatherHealth.lastSuccessfulAt,
    lastError: error?.message || WeatherHealth.lastError,
    source: classifyWeatherSource(sample),
    provider: sample?.provider || null,
    forecastPoints: sample?.forecast?.length || 0,
    completeness: completenessFor(sample),
    stale: Boolean(sample?.stale),
    coordinates: { lat: normalizeCoordinate(lat), lon: normalizeCoordinate(lon) },
    controlCenter: getWeatherControlCenter()
  };
}

export function getWeatherSourceDecision(controlCenter = getWeatherControlCenter()) {
  const source = controlCenter?.selectedSource;
  if (String(source || "").endsWith("-live")) return { source: "live", provider: controlCenter.selectedProvider, reason: "healthy-provider" };
  if (source === "cache" || source === "stale-cache") return { source: "cache", provider: controlCenter.selectedProvider, reason: source };
  return { source: "fallback", provider: controlCenter?.selectedProvider || null, reason: controlCenter?.health?.lastError || "providers-unavailable" };
}

export function calculateWaterLevelScore(water) {
  if (!water?.forecast?.length) return 0;
  const current = finite(water.forecast[0].levelCm);
  if (current === null) return 0;
  let score = 10;
  if (current > 20) score += 5;
  if (current < -20) score -= 5;
  return Math.max(0, Math.min(20, score));
}
