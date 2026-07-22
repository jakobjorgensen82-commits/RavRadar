import fs from "node:fs/promises";

const API_ROOT = "https://opendataapi.dmi.dk/v1/forecastedr/collections";
const OUTPUT_PATH = "data/live/conditions.json";
const ZONES_PATH = "data/zones.geojson";
const REQUEST_TIMEOUT_MS = 30_000;

const round = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
const asNumber = value => Number.isFinite(Number(value)) ? Number(value) : null;
const normalizeDegrees = value => ((value % 360) + 360) % 360;

function vectorToSpeedDirection(uValue, vValue) {
  const u = asNumber(uValue);
  const v = asNumber(vValue);
  if (u === null || v === null) return { speed: null, direction: null };
  return {
    speed: Math.hypot(u, v),
    // Ocean-current direction is expressed as the direction the water moves toward.
    direction: normalizeDegrees(Math.atan2(u, v) * 180 / Math.PI)
  };
}

function pointForZone(zone) {
  const configured = zone.properties?.dataPoint;
  if (Array.isArray(configured) && configured.length === 2 && configured.every(Number.isFinite)) return configured;

  const ring = zone.geometry?.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 3) throw new Error(`${zone.properties?.id}: mangler gyldigt datapunkt`);
  const points = ring.slice(0, -1);
  return [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length
  ];
}

function modelCollections(coastType) {
  if (coastType === "west") return { wave: "wam_nsb", ocean: "dkss_nsbs" };
  if (coastType === "limfjord") return { wave: null, ocean: "dkss_lf" };
  return { wave: "wam_dw", ocean: "dkss_idw" };
}

async function fetchPosition(collection, point, parameters) {
  if (!collection) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const [lon, lat] = point;
  const query = new URLSearchParams({
    coords: `POINT(${lon} ${lat})`,
    crs: "crs84",
    "parameter-name": parameters.join(","),
    f: "GeoJSON"
  });
  const url = `${API_ROOT}/${collection}/position?${query}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/geo+json, application/json" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`${collection}: HTTP ${response.status}`);
    const body = await response.json();
    return (body.features || [])
      .map(feature => feature.properties || {})
      .filter(properties => properties.step)
      .sort((a, b) => new Date(a.step) - new Date(b.step));
  } finally {
    clearTimeout(timer);
  }
}

function nearestStep(steps, targetMs = Date.now()) {
  return steps.reduce((best, step) => {
    const distance = Math.abs(new Date(step.step).getTime() - targetMs);
    return !best || distance < best.distance ? { step, distance } : best;
  }, null)?.step || null;
}

function stepAtOrAfter(steps, targetMs) {
  return steps.find(step => new Date(step.step).getTime() >= targetMs) || steps.at(-1) || null;
}

function previousSamples(previous, zoneId) {
  const samples = previous?.zones?.[zoneId]?.samples24h;
  return Array.isArray(samples) ? samples : [];
}

function buildHistory(samples, nowMs) {
  const cutoff = nowMs - 24 * 60 * 60 * 1000;
  const recent = samples.filter(sample => new Date(sample.at).getTime() >= cutoff);
  const winds = recent.map(sample => asNumber(sample.windSpeedMps)).filter(Number.isFinite);
  const waves = recent.map(sample => asNumber(sample.waveHeightM)).filter(Number.isFinite);
  const highEnergy = recent.filter(sample => (asNumber(sample.windSpeedMps) ?? 0) >= 9 || (asNumber(sample.waveHeightM) ?? 0) >= 1.2);
  const lastHigh = highEnergy.at(-1);

  return {
    samples: recent,
    summary: {
      maxWind24hMps: winds.length ? round(Math.max(...winds), 1) : null,
      maxWave24hM: waves.length ? round(Math.max(...waves), 2) : null,
      hoursSinceHighEnergy: lastHigh ? round((nowMs - new Date(lastHigh.at).getTime()) / 3_600_000, 1) : null
    }
  };
}

async function readPrevious() {
  try {
    return JSON.parse(await fs.readFile(OUTPUT_PATH, "utf8"));
  } catch {
    return { zones: {} };
  }
}

async function buildZoneCondition(feature, previous, generatedAt) {
  const zone = feature.properties;
  const point = pointForZone(feature);
  const collections = modelCollections(zone.coastType);
  const nowMs = new Date(generatedAt).getTime();

  const [windSteps, waveSteps, oceanSteps] = await Promise.all([
    fetchPosition("harmonie_dini_sf", point, ["wind-speed-10m", "wind-dir-10m"]),
    fetchPosition(collections.wave, point, ["significant-wave-height", "mean-wave-dir", "dominant-wave-period"]),
    fetchPosition(collections.ocean, point, ["sea-mean-deviation", "current-u", "current-v", "water-temperature-1m"])
  ]);

  const windNow = nearestStep(windSteps, nowMs);
  if (!windNow || asNumber(windNow["wind-speed-10m"]) === null) throw new Error(`${zone.id}: DMI vinddata mangler`);

  const waveNow = nearestStep(waveSteps, nowMs);
  const oceanNow = nearestStep(oceanSteps, nowMs);
  const ocean3h = stepAtOrAfter(oceanSteps, nowMs + 3 * 60 * 60 * 1000);
  const current = vectorToSpeedDirection(oceanNow?.["current-u"], oceanNow?.["current-v"]);
  const seaNowM = asNumber(oceanNow?.["sea-mean-deviation"]);
  const sea3hM = asNumber(ocean3h?.["sea-mean-deviation"]);

  const currentValues = {
    windSpeedMps: round(asNumber(windNow["wind-speed-10m"]), 1),
    windDirectionDeg: round(asNumber(windNow["wind-dir-10m"]), 0), // meteorological: direction wind comes from
    waveHeightM: round(asNumber(waveNow?.["significant-wave-height"]), 2),
    waveDirectionDeg: round(asNumber(waveNow?.["mean-wave-dir"]), 0),
    wavePeriodS: round(asNumber(waveNow?.["dominant-wave-period"]), 1),
    waterLevelCm: seaNowM === null ? null : round(seaNowM * 100, 0),
    waterLevelTrendCm3h: seaNowM === null || sea3hM === null ? null : round((sea3hM - seaNowM) * 100, 0),
    currentSpeedMps: round(current.speed, 2),
    currentDirectionDeg: round(current.direction, 0), // direction current moves toward
    waterTemperatureC: round(asNumber(oceanNow?.["water-temperature-1m"]), 1)
  };

  const oldSamples = previousSamples(previous, zone.id);
  const newSample = { at: generatedAt, windSpeedMps: currentValues.windSpeedMps, waveHeightM: currentValues.waveHeightM };
  const deDuplicated = oldSamples.filter(sample => sample.at !== generatedAt);
  const history = buildHistory([...deDuplicated, newSample], nowMs);

  return {
    point,
    modelSteps: {
      wind: windNow.step,
      wave: waveNow?.step || null,
      ocean: oceanNow?.step || null
    },
    current: currentValues,
    history: history.summary,
    samples24h: history.samples
  };
}

const zones = JSON.parse(await fs.readFile(ZONES_PATH, "utf8"));
const previous = await readPrevious();
const generatedAt = new Date().toISOString();
const output = {
  schemaVersion: 2,
  generatedAt,
  source: "DMI Open Data Forecast EDR API",
  directionConventions: {
    windDirectionDeg: "from",
    currentDirectionDeg: "toward",
    waveDirectionDeg: "from"
  },
  zones: {},
  errors: []
};

for (const feature of zones.features) {
  const id = feature.properties.id;
  try {
    output.zones[id] = await buildZoneCondition(feature, previous, generatedAt);
    console.log(`OK: ${id}`);
  } catch (error) {
    console.error(`FEJL: ${id}: ${error.message}`);
    output.errors.push({ zoneId: id, message: error.message });
    const previousZone = previous?.zones?.[id];
    if (previousZone?.current) output.zones[id] = { ...previousZone, stale: true, error: error.message };
  }
}

if (!Object.keys(output.zones).length) throw new Error("Ingen zoner kunne opdateres; eksisterende datafil bevares");
await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Skrev ${OUTPUT_PATH} med ${Object.keys(output.zones).length} zoner.`);
