/**
 * RavRadar Weather Engine 2.7
 * Browser-side water-level routing, cache, failover, diagnostics and quality.
 *
 * Sprint 5 adds the active source router and cache policy. Existing callers of
 * getWaterLevel() continue to receive a compatible {status, location, forecast}
 * response.
 */

const WEATHER_ENGINE_VERSION = "2.7.0";
const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_STALE_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 8000;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 10 * 60 * 1000;

const memoryCache = new Map();
const providerState = new Map();

const WeatherHealth = {
  lastAttemptAt: null,
  lastSuccessfulAt: null,
  lastError: null,
  mode: "fallback",
  provider: null,
  consecutiveFailures: 0,
  setSuccess(provider) {
    this.lastSuccessfulAt = new Date().toISOString();
    this.lastError = null;
    this.mode = "live";
    this.provider = provider;
    this.consecutiveFailures = 0;
  },
  setFallback(error, provider = null) {
    this.lastError = String(error || "fallback");
    this.mode = "fallback";
    this.provider = provider;
    this.consecutiveFailures += 1;
  }
};

const WeatherQuality = {
  score: 0,
  reason: "uninitialized",
  source: "unknown",
  stale: false
};

const WeatherControlCenter = {
  version: WEATHER_ENGINE_VERSION,
  status: "initializing",
  updatedAt: null,
  selectedSource: null,
  attemptedSources: [],
  cache: { hit: false, stale: false, ageMs: null },
  health: null,
  quality: null,
  policy: {
    cacheTtlMs: DEFAULT_CACHE_TTL_MS,
    staleTtlMs: DEFAULT_STALE_TTL_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    failureThreshold: CIRCUIT_FAILURE_THRESHOLD,
    circuitCooldownMs: CIRCUIT_COOLDOWN_MS
  }
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeCoordinate(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cacheKey(lat, lon) {
  return `${normalizeCoordinate(lat).toFixed(3)},${normalizeCoordinate(lon).toFixed(3)}`;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function getRuntimeConfig() {
  const config = globalThis.RAVRADAR_WEATHER_CONFIG || {};
  return {
    dmiWaterLevelUrl: typeof config.dmiWaterLevelUrl === "string" ? config.dmiWaterLevelUrl : null,
    cacheTtlMs: Number.isFinite(Number(config.cacheTtlMs)) ? Number(config.cacheTtlMs) : DEFAULT_CACHE_TTL_MS,
    staleTtlMs: Number.isFinite(Number(config.staleTtlMs)) ? Number(config.staleTtlMs) : DEFAULT_STALE_TTL_MS,
    timeoutMs: Number.isFinite(Number(config.timeoutMs)) ? Number(config.timeoutMs) : DEFAULT_TIMEOUT_MS
  };
}

function providerStatus(name) {
  if (!providerState.has(name)) {
    providerState.set(name, {
      failures: 0,
      circuitOpenedAt: null,
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastError: null
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
    return false;
  }
  return true;
}

function recordProviderSuccess(name) {
  const state = providerStatus(name);
  state.failures = 0;
  state.circuitOpenedAt = null;
  state.lastSuccessAt = nowIso();
  state.lastError = null;
}

function recordProviderFailure(name, error) {
  const state = providerStatus(name);
  state.failures += 1;
  state.lastError = String(error?.message || error || "unknown error");
  if (state.failures >= CIRCUIT_FAILURE_THRESHOLD) state.circuitOpenedAt = Date.now();
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json, application/geo+json" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeForecastPoint(point, index = 0) {
  const rawTime = point?.time ?? point?.validTime ?? point?.observed ?? null;
  const date = rawTime ? new Date(rawTime) : new Date(Date.now() + index * 3600000);
  const rawLevel = point?.levelCm ?? point?.waterLevelCm ?? point?.valueCm ?? point?.value;
  const levelCm = Number(rawLevel);
  if (!Number.isFinite(levelCm)) return null;
  return {
    time: Number.isNaN(date.getTime())
      ? String(rawTime || "")
      : date.toLocaleString("da-DK", {
          weekday: "short", day: "numeric", month: "short",
          hour: "2-digit", minute: "2-digit"
        }),
    timeIso: Number.isNaN(date.getTime()) ? null : date.toISOString(),
    levelCm: Math.round(levelCm),
    trend: point?.trend || "ukendt"
  };
}

function normalizeLivePayload(payload, lat, lon) {
  const candidate = payload?.forecast ?? payload?.hourly ?? payload?.data ?? [];
  const forecast = Array.isArray(candidate)
    ? candidate.map(normalizeForecastPoint).filter(Boolean)
    : [];
  if (!forecast.length) throw new Error("DMI response contains no usable water-level points");
  return {
    status: "ok",
    location: { lat, lon },
    forecast,
    source: "dmi-live",
    provider: "dmi",
    fetchedAt: nowIso(),
    stale: false
  };
}

/**
 * Optional browser connector. The URL is deliberately runtime-configured so no
 * API key is embedded in the client. Recommended target is RavRadar's central
 * weather endpoint or a same-origin proxy.
 */
export async function fetchDMIWaterLevel(lat, lon) {
  const provider = "dmi";
  const state = providerStatus(provider);
  state.lastAttemptAt = nowIso();
  WeatherHealth.lastAttemptAt = state.lastAttemptAt;

  if (circuitIsOpen(provider)) throw new Error("DMI circuit breaker is open");

  const config = getRuntimeConfig();
  if (!config.dmiWaterLevelUrl) throw new Error("DMI water-level endpoint is not configured");

  const url = new URL(config.dmiWaterLevelUrl, globalThis.location?.href || "http://localhost/");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));

  try {
    const payload = await fetchJsonWithTimeout(url.toString(), config.timeoutMs);
    const normalized = normalizeLivePayload(payload, lat, lon);
    recordProviderSuccess(provider);
    WeatherHealth.setSuccess(provider);
    return normalized;
  } catch (error) {
    recordProviderFailure(provider, error);
    WeatherHealth.setFallback(error, provider);
    throw error;
  }
}

function createFallbackWaterLevel(lat, lon) {
  const now = new Date();
  const forecast = [];
  for (let i = 0; i < 120; i += 1) {
    const time = new Date(now.getTime() + i * 60 * 60 * 1000);
    const level = Math.round(Math.sin(i / 8) * 25);
    forecast.push({
      time: time.toLocaleString("da-DK", {
        weekday: "short", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit"
      }),
      timeIso: time.toISOString(),
      levelCm: level,
      trend: i < 1 ? "nu" : level > 0 ? "stigende" : "faldende"
    });
  }
  return {
    status: "ok",
    location: { lat, lon },
    forecast,
    source: "fallback-model",
    provider: "synthetic-fallback",
    fetchedAt: nowIso(),
    stale: false
  };
}

function readCache(lat, lon, allowStale = false) {
  const config = getRuntimeConfig();
  const entry = memoryCache.get(cacheKey(lat, lon));
  if (!entry) return null;
  const ageMs = Date.now() - entry.storedAt;
  const maxAge = allowStale ? config.staleTtlMs : config.cacheTtlMs;
  if (ageMs > maxAge) return null;
  const result = clone(entry.value);
  result.source = allowStale && ageMs > config.cacheTtlMs ? "stale-cache" : "cache";
  result.originalSource = entry.value.source;
  result.stale = ageMs > config.cacheTtlMs;
  return { result, ageMs, stale: result.stale };
}

function writeCache(lat, lon, value) {
  memoryCache.set(cacheKey(lat, lon), { storedAt: Date.now(), value: clone(value) });
}

export function clearWeatherCache() {
  memoryCache.clear();
}

export function classifyWeatherSource(result) {
  if (!result) return "none";
  return result.source || (WeatherHealth.mode === "live" ? "dmi-live" : "fallback-model");
}

export function evaluateWeatherQuality(diag) {
  let score = 0;
  let reason = "unavailable";
  if (diag?.source === "dmi-live") {
    score = 100;
    reason = "live-source";
  } else if (diag?.source === "cache" && !diag?.stale) {
    score = 85;
    reason = "fresh-cache";
  } else if (diag?.source === "stale-cache" || diag?.stale) {
    score = 60;
    reason = "stale-cache";
  } else if (diag?.source === "fallback-model") {
    score = 35;
    reason = "synthetic-fallback";
  }
  WeatherQuality.score = score;
  WeatherQuality.reason = reason;
  WeatherQuality.source = diag?.source || "unknown";
  WeatherQuality.stale = Boolean(diag?.stale);
  return clone(WeatherQuality);
}

export function getWeatherQuality() {
  return clone(WeatherQuality);
}

export function getWeatherHealth() {
  return {
    ...clone(WeatherHealth),
    providers: Object.fromEntries([...providerState.entries()].map(([name, state]) => [name, {
      ...state,
      circuitOpen: circuitIsOpen(name)
    }]))
  };
}

export function updateWeatherControlCenter(diag = {}) {
  WeatherControlCenter.status = diag.error
    ? "error"
    : diag.source === "dmi-live"
      ? "live"
      : diag.source === "cache" || diag.source === "stale-cache"
        ? "cache"
        : "fallback";
  WeatherControlCenter.updatedAt = nowIso();
  WeatherControlCenter.selectedSource = diag.source || null;
  WeatherControlCenter.attemptedSources = clone(diag.attemptedSources || []);
  WeatherControlCenter.cache = {
    hit: Boolean(diag.cacheHit),
    stale: Boolean(diag.stale),
    ageMs: Number.isFinite(diag.cacheAgeMs) ? diag.cacheAgeMs : null
  };
  WeatherControlCenter.health = getWeatherHealth();
  WeatherControlCenter.quality = evaluateWeatherQuality(diag);
  return getWeatherControlCenter();
}

export function getWeatherControlCenter() {
  return clone(WeatherControlCenter);
}

/**
 * Source order: fresh cache -> DMI live -> stale cache -> synthetic fallback.
 */
export async function getWaterLevelV27(lat, lon, options = {}) {
  const normalizedLat = normalizeCoordinate(lat);
  const normalizedLon = normalizeCoordinate(lon);
  const attemptedSources = [];

  if (!options.forceRefresh) {
    const fresh = readCache(normalizedLat, normalizedLon, false);
    if (fresh) {
      updateWeatherControlCenter({
        source: "cache", cacheHit: true, stale: false,
        cacheAgeMs: fresh.ageMs, attemptedSources: ["cache"]
      });
      return fresh.result;
    }
  }

  attemptedSources.push("dmi-live");
  try {
    const live = await fetchDMIWaterLevel(normalizedLat, normalizedLon);
    writeCache(normalizedLat, normalizedLon, live);
    updateWeatherControlCenter({ source: "dmi-live", attemptedSources });
    return live;
  } catch (error) {
    const stale = readCache(normalizedLat, normalizedLon, true);
    if (stale) {
      attemptedSources.push("stale-cache");
      updateWeatherControlCenter({
        source: "stale-cache", cacheHit: true, stale: true,
        cacheAgeMs: stale.ageMs, attemptedSources, error: null
      });
      return stale.result;
    }

    attemptedSources.push("fallback-model");
    const fallback = createFallbackWaterLevel(normalizedLat, normalizedLon);
    updateWeatherControlCenter({
      source: "fallback-model", attemptedSources,
      error: options.strict ? error : null
    });
    if (options.strict) throw error;
    return fallback;
  }
}

// Backwards-compatible public entry point now routes through Weather Engine 2.7.
export async function getWaterLevel(lat, lon, options = {}) {
  return getWaterLevelV27(lat, lon, options);
}

export async function getWeatherDiagnostics(lat, lon, options = {}) {
  let sample = null;
  let error = null;
  try {
    sample = await getWaterLevelV27(lat, lon, options);
  } catch (caught) {
    error = caught;
  }
  const control = getWeatherControlCenter();
  return {
    version: WEATHER_ENGINE_VERSION,
    healthy: WeatherHealth.mode === "live",
    mode: WeatherHealth.mode,
    lastAttemptAt: WeatherHealth.lastAttemptAt,
    lastSuccessfulAt: WeatherHealth.lastSuccessfulAt,
    lastError: error?.message || WeatherHealth.lastError,
    source: classifyWeatherSource(sample),
    provider: sample?.provider || null,
    forecastPoints: sample?.forecast?.length || 0,
    stale: Boolean(sample?.stale),
    coordinates: { lat: normalizeCoordinate(lat), lon: normalizeCoordinate(lon) },
    controlCenter: control
  };
}

export function calculateWaterLevelScore(water) {
  if (!water?.forecast?.length) return 0;
  const current = Number(water.forecast[0].levelCm);
  if (!Number.isFinite(current)) return 0;
  let score = 10;
  if (current > 20) score += 5;
  if (current < -20) score -= 5;
  return Math.max(0, Math.min(20, score));
}


// Sprint 6 - Weather Source Decision
export function getWeatherSourceDecision(controlCenter){
  const c=controlCenter||{};
  if(c.health===false) return {source:'fallback',reason:'health'};
  if(c.quality==='stale') return {source:'cache',reason:'stale-live'};
  return {source:'live',reason:'healthy'};
}
