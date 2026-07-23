import fs from "node:fs/promises";

const API_ROOT = "https://opendataapi.dmi.dk/v1/forecastedr/collections";
const ZONES_PATH = "data/zones.geojson";
const OUTPUT_PATH = "data/live/conditions.json";

const REQUEST_TIMEOUT_MS = Number(process.env.DMI_REQUEST_TIMEOUT_MS ?? 20_000);
const REQUEST_GAP_MS = Number(process.env.DMI_REQUEST_GAP_MS ?? 1_200);
const MAX_RETRIES = Number(process.env.DMI_MAX_RETRIES ?? 2);

const WIND_COLLECTION = "harmonie_dini_sf";
const WIND_PARAMETERS = ["wind-speed-10m", "wind-dir-10m"];
const WAVE_PARAMETERS = [
  "significant-wave-height",
  "mean-wave-dir",
  "dominant-wave-period"
];
const OCEAN_PARAMETER_SETS = [
  ["sea-mean-deviation", "current-u", "current-v", "water-temperature"],
  ["sea-mean-deviation", "current-u", "current-v"],
  ["sea-mean-deviation"]
];

const sleep = milliseconds =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

const asNumber = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const round = (value, digits = 2) =>
  Number.isFinite(value) ? Number(value.toFixed(digits)) : null;

const normalizeDegrees = value => ((value % 360) + 360) % 360;

let nextRequestTime = 0;
let rateLimitCircuitOpen = false;

async function waitForRequestSlot() {
  const delay = Math.max(0, nextRequestTime - Date.now());
  if (delay > 0) await sleep(delay);
  nextRequestTime = Date.now() + REQUEST_GAP_MS;
}

function zonePoint(feature) {
  const configured = feature.properties?.dataPoint;

  if (
    Array.isArray(configured) &&
    configured.length === 2 &&
    configured.every(Number.isFinite)
  ) {
    return configured;
  }

  const ring = feature.geometry?.coordinates?.[0];
  const zoneId = feature.properties?.id ?? "Ukendt zone";

  if (!Array.isArray(ring) || ring.length < 3) {
    throw new Error(`${zoneId}: mangler dataPoint eller gyldig polygon`);
  }

  const points = ring.at(0)?.[0] === ring.at(-1)?.[0] &&
    ring.at(0)?.[1] === ring.at(-1)?.[1]
    ? ring.slice(0, -1)
    : ring;

  return [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length
  ];
}

function collectionsFor(coastType) {
  if (coastType === "west") {
    return { wave: "wam_nsb", ocean: "dkss_nsbs" };
  }

  if (coastType === "limfjord") {
    return { wave: null, ocean: "dkss_lf" };
  }

  return { wave: "wam_dw", ocean: "dkss_idw" };
}

function retryDelay(response, attempt) {
  const retryAfter = response?.headers?.get("retry-after");

  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(1_000, seconds * 1_000);

    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(1_000, date - Date.now());
  }

  return Math.min(30_000, 2_000 * 2 ** attempt);
}

async function fetchJson(url, collection) {
  if (rateLimitCircuitOpen) {
    const error = new Error(`${collection}: DMI-rategrænse aktiv; bruger cache`);
    error.status = 429;
    throw error;
  }

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    await waitForRequestSlot();

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/geo+json, application/json",
          "User-Agent": "RavRadar/1.0"
        },
        signal: controller.signal
      });

      if (response.ok) return await response.json();

      const error = new Error(`${collection}: HTTP ${response.status}`);
      error.status = response.status;

      if (response.status === 429 && attempt >= MAX_RETRIES) {
        rateLimitCircuitOpen = true;
        console.warn(
          "DMI-rategrænse nået. Stopper yderligere API-kald og bruger cache."
        );
      }

      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < MAX_RETRIES
      ) {
        const delay = retryDelay(response, attempt);
        console.warn(
          `${error.message}; nyt forsøg om ${Math.round(delay / 1_000)} sek.`
        );
        await sleep(delay);
        continue;
      }

      throw error;
    } catch (error) {
      lastError = error;

      const temporaryNetworkError =
        error?.name === "AbortError" || error instanceof TypeError;

      if (temporaryNetworkError && attempt < MAX_RETRIES) {
        const delay = Math.min(30_000, 2_000 * 2 ** attempt);
        console.warn(
          `${collection}: midlertidig netværksfejl; nyt forsøg om ` +
          `${Math.round(delay / 1_000)} sek.`
        );
        await sleep(delay);
        continue;
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error(`${collection}: ukendt DMI-fejl`);
}

async function fetchPosition(collection, point, parameters) {
  if (!collection) return [];

  const [longitude, latitude] = point;
  const query = new URLSearchParams({
    coords: `POINT(${longitude} ${latitude})`,
    crs: "crs84",
    "parameter-name": parameters.join(","),
    f: "GeoJSON"
  });

  const url = `${API_ROOT}/${collection}/position?${query}`;
  const response = await fetchJson(url, collection);

  return (response.features ?? [])
    .map(feature => feature.properties ?? {})
    .filter(properties => properties.step)
    .sort((a, b) => Date.parse(a.step) - Date.parse(b.step));
}

async function fetchOcean(collection, point) {
  let lastError;

  for (const parameters of OCEAN_PARAMETER_SETS) {
    try {
      return await fetchPosition(collection, point, parameters);
    } catch (error) {
      lastError = error;

      if (error?.status !== 400) throw error;

      console.warn(
        `${collection}: parameterkombination afvist; prøver med færre parametre.`
      );
    }
  }

  throw lastError ?? new Error(`${collection}: havdata kunne ikke hentes`);
}

function nearestStep(steps, targetTime) {
  let best = null;

  for (const step of steps) {
    const time = Date.parse(step.step);
    if (!Number.isFinite(time)) continue;

    const distance = Math.abs(time - targetTime);
    if (!best || distance < best.distance) best = { step, distance };
  }

  return best?.step ?? null;
}

function stepAtOrAfter(steps, targetTime) {
  return (
    steps.find(step => Date.parse(step.step) >= targetTime) ??
    steps.at(-1) ??
    null
  );
}

function currentVector(uValue, vValue) {
  const u = asNumber(uValue);
  const v = asNumber(vValue);

  if (u === null || v === null) {
    return { speed: null, direction: null };
  }

  return {
    speed: Math.hypot(u, v),
    direction: normalizeDegrees(Math.atan2(u, v) * 180 / Math.PI)
  };
}

function previousSamples(previous, zoneId) {
  const samples = previous?.zones?.[zoneId]?.samples24h;
  return Array.isArray(samples) ? samples : [];
}

function buildHistory(samples, now) {
  const cutoff = now - 24 * 60 * 60 * 1_000;
  const recent = samples
    .filter(sample => Date.parse(sample.at) >= cutoff)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const windValues = recent
    .map(sample => asNumber(sample.windSpeedMps))
    .filter(Number.isFinite);

  const waveValues = recent
    .map(sample => asNumber(sample.waveHeightM))
    .filter(Number.isFinite);

  const highEnergySamples = recent.filter(sample =>
    (asNumber(sample.windSpeedMps) ?? 0) >= 9 ||
    (asNumber(sample.waveHeightM) ?? 0) >= 1.2
  );

  const lastHighEnergy = highEnergySamples.at(-1);

  return {
    samples: recent,
    summary: {
      maxWind24hMps: windValues.length
        ? round(Math.max(...windValues), 1)
        : null,
      maxWave24hM: waveValues.length
        ? round(Math.max(...waveValues), 2)
        : null,
      hoursSinceHighEnergy: lastHighEnergy
        ? round((now - Date.parse(lastHighEnergy.at)) / 3_600_000, 1)
        : null
    }
  };
}

async function readPreviousData() {
  try {
    return JSON.parse(await fs.readFile(OUTPUT_PATH, "utf8"));
  } catch {
    return { zones: {} };
  }
}

async function buildZone(feature, previous, generatedAt) {
  const properties = feature.properties ?? {};
  const zoneId = properties.id;

  if (!zoneId) throw new Error("En zone mangler id");

  const point = zonePoint(feature);
  const collections = collectionsFor(properties.coastType);
  const now = Date.parse(generatedAt);

  // Kald sendes bevidst efter hinanden for at undgå DMI-ratebegrænsning.
  const windSteps = await fetchPosition(
    WIND_COLLECTION,
    point,
    WIND_PARAMETERS
  );

  const waveSteps = collections.wave
    ? await fetchPosition(collections.wave, point, WAVE_PARAMETERS)
    : [];

  const oceanSteps = await fetchOcean(collections.ocean, point);

  const windNow = nearestStep(windSteps, now);
  if (!windNow || asNumber(windNow["wind-speed-10m"]) === null) {
    throw new Error(`${zoneId}: DMI-vinddata mangler`);
  }

  const waveNow = nearestStep(waveSteps, now);
  const oceanNow = nearestStep(oceanSteps, now);
  const oceanInThreeHours = stepAtOrAfter(
    oceanSteps,
    now + 3 * 60 * 60 * 1_000
  );

  const vector = currentVector(
    oceanNow?.["current-u"],
    oceanNow?.["current-v"]
  );

  const seaLevelNow = asNumber(oceanNow?.["sea-mean-deviation"]);
  const seaLevelLater = asNumber(
    oceanInThreeHours?.["sea-mean-deviation"]
  );

  const current = {
    windSpeedMps: round(asNumber(windNow["wind-speed-10m"]), 1),
    windDirectionDeg: round(asNumber(windNow["wind-dir-10m"]), 0),
    waveHeightM: round(
      asNumber(waveNow?.["significant-wave-height"]),
      2
    ),
    waveDirectionDeg: round(asNumber(waveNow?.["mean-wave-dir"]), 0),
    wavePeriodS: round(asNumber(waveNow?.["dominant-wave-period"]), 1),
    waterLevelCm: seaLevelNow === null
      ? null
      : round(seaLevelNow * 100, 0),
    waterLevelTrendCm3h:
      seaLevelNow === null || seaLevelLater === null
        ? null
        : round((seaLevelLater - seaLevelNow) * 100, 0),
    currentSpeedMps: round(vector.speed, 2),
    currentDirectionDeg: round(vector.direction, 0),
    waterTemperatureC: round(
      asNumber(oceanNow?.["water-temperature"]),
      1
    )
  };

  const sample = {
    at: generatedAt,
    windSpeedMps: current.windSpeedMps,
    waveHeightM: current.waveHeightM
  };

  const oldSamples = previousSamples(previous, zoneId)
    .filter(existing => existing.at !== generatedAt);

  const history = buildHistory([...oldSamples, sample], now);

  return {
    point,
    modelSteps: {
      wind: windNow.step,
      wave: waveNow?.step ?? null,
      ocean: oceanNow?.step ?? null
    },
    current,
    history: history.summary,
    samples24h: history.samples,
    stale: false
  };
}

const zonesFile = JSON.parse(await fs.readFile(ZONES_PATH, "utf8"));
const features = Array.isArray(zonesFile.features) ? zonesFile.features : [];

if (!features.length) {
  throw new Error(`${ZONES_PATH} indeholder ingen zoner`);
}

const previous = await readPreviousData();
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

for (const feature of features) {
  const zoneId = feature.properties?.id ?? "Ukendt zone";

  try {
    output.zones[zoneId] = await buildZone(
      feature,
      previous,
      generatedAt
    );
    console.log(`OK: ${zoneId}`);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : String(error);

    console.error(`FEJL: ${zoneId}: ${message}`);
    output.errors.push({ zoneId, message });

    const oldZone = previous?.zones?.[zoneId];
    if (oldZone?.current) {
      output.zones[zoneId] = {
        ...oldZone,
        stale: true,
        error: message
      };
    }
  }
}

const zoneCount = Object.keys(output.zones).length;
const freshCount = Object.values(output.zones)
  .filter(zone => zone.stale !== true)
  .length;

if (zoneCount === 0) {
  throw new Error(
    "Ingen zoner kunne opdateres, og der findes ingen tidligere gyldige data."
  );
}

await fs.mkdir("data/live", { recursive: true });
await fs.writeFile(
  OUTPUT_PATH,
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8"
);

console.log(
  `Skrev ${OUTPUT_PATH}: ${freshCount} friske zoner, ` +
  `${zoneCount - freshCount} zoner med tidligere data og ` +
  `${output.errors.length} fejl.`
);
