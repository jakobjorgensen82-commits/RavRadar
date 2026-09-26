// Failed-run acquisition recovery, not a score/state or admin-config donor.
// Inputs have already passed the encrypted pack's authentication and hashes.
import fs from 'node:fs/promises';
import path from 'node:path';
import { PRIVATE_WEATHER_PROGRESS_ONLY_FILES as FILES } from './private-weather-progress-files.mjs';
import { DMI_FORECAST_HOURS, normalizeForecastHourly } from './dmi-forecast-store.mjs';
import { verifiedDmiForecastComponentSource } from './ravscore-production-adapters.mjs';
import { preferQualifiedDmiComponentSource } from './weather-component-selection.mjs';
import { hasValue } from './weather-component-needs.mjs';

const HOUR = 3_600_000;
const CLOCK_SKEW = 5 * 60_000;
const MAX_BYTES = 256 * 1024 * 1024;
const COMPONENTS = ['wind', 'wave', 'current', 'waterLevel', 'waterTemperature'];
const FIELDS = {
  wind: ['windSpeedMps', 'windDirectionDeg', 'windProvenance'],
  wave: ['waveHeightM', 'wavePeriodS', 'waveDirectionDeg', 'waveProvenance',
    'waveInputSource', 'waveInputUncertainty', 'waveInputNoticeId', 'feggesundNeighborWaveSource'],
  current: ['currentUMps', 'currentVMps', 'currentSpeedMps', 'currentDirectionDeg',
    'currentCoastNormalSpeedMps', 'currentProvenance', 'currentStateOnlyHold'],
  waterLevel: ['waterLevelCm', 'waterLevelModelCm', 'waterLevelBiasCm',
    'waterLevelObservationDifferenceCm', 'waterLevelTrendCm3h', 'waterLevelSource',
    'waterLevelProvenance', 'waterLevelReference'],
  waterTemperature: ['waterTemperatureC', 'waterTemperatureProvenance'],
};
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const instant = value => typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ? Date.parse(value) : NaN;
const exactHour = value => Number.isFinite(instant(value)) && instant(value) % HOUR === 0;
const point = value => Array.isArray(value) && value.length === 2 && value.every(finite)
  && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
const samePoint = (a, b) => point(a) && point(b) && a.every((v, i) => Math.abs(v - b[i]) <= 1e-7);
const copy = value => structuredClone(value);
const safeId = value => typeof value === 'string' && value.length > 0 && value.length < 256
  && !['__proto__', 'constructor', 'prototype'].includes(value);

function expectedZones(features) {
  if (!Array.isArray(features) || !features.length) return null;
  const result = new Map();
  for (const feature of features) {
    const id = feature?.properties?.id;
    if (!safeId(id) || result.has(id)) return null;
    let location = feature.properties?.dataPoint;
    if (!point(location)) {
      // Same fallback as the producer's zonePoint; do not use a PART point
      // to authorise a parent-zone forecast store.
      const ring = feature?.geometry?.coordinates?.[0];
      if (!Array.isArray(ring) || ring.length < 3 || !ring.every(point)) return null;
      const rows = ring.slice(0, -1);
      location = [0, 1].map(axis => rows.reduce((sum, row) => sum + row[axis], 0) / rows.length);
    }
    result.set(id, location);
  }
  return result;
}

function storeShape(store) {
  return object(store) && object(store.zones)
    && Object.values(store.zones).every(record => object(record) && Array.isArray(record.hourly));
}

function admittedSource(row, component, identity) {
  if (!hasValue(row, component)) return null;
  // A vector must remain one acquisition, including both U/V when present.
  if (component === 'current' && (row.currentUMps != null || row.currentVMps != null)
    && !(finite(row.currentUMps) && finite(row.currentVMps))) return null;
  return verifiedDmiForecastComponentSource(row.sources?.[component], row.time,
    component === 'wind' && row.sources?.wind?.component === 'windTail' ? 'windTail' : component,
    identity);
}

function sameActiveGeometry(store, zones) {
  // The producer indexes its cursor in prioritizeDmiFeatures' canonical
  // localeCompare order, not FeatureCollection/object insertion order.
  const order = (a, b) => a.localeCompare(b);
  const ids = Object.keys(store.zones).sort(order);
  const expected = [...zones.keys()].sort(order);
  return JSON.stringify(ids) === JSON.stringify(expected)
    && ids.every(id => store.zones[id].zoneId === id && samePoint(store.zones[id].point, zones.get(id)));
}

function recoverRuntime(complete, progress, zones, restored, stats) {
  const newer = progress.runtime;
  const older = complete.runtime;
  if (!object(newer) || !sameActiveGeometry(complete, zones) || !sameActiveGeometry(progress, zones)
    || !Number.isInteger(newer.nextZoneCursor) || newer.nextZoneCursor < 0 || newer.nextZoneCursor >= zones.size
    || !Number.isFinite(instant(newer.lastAttemptAt)) || instant(newer.lastAttemptAt) > restored + CLOCK_SKEW
    || (Number.isFinite(instant(older?.lastAttemptAt)) && instant(newer.lastAttemptAt) <= instant(older.lastAttemptAt))) return;
  const recovered = { ...(object(older) ? copy(older) : {}), nextZoneCursor: newer.nextZoneCursor,
    lastAttemptAt: newer.lastAttemptAt };
  for (const key of ['lastAttemptedZoneId', 'lastSuccessfulZoneId']) {
    if (zones.has(newer[key])) recovered[key] = newer[key];
  }
  if (Number.isFinite(instant(newer.lastSuccessAt)) && instant(newer.lastSuccessAt) <= restored + CLOCK_SKEW
    && (!Number.isFinite(instant(recovered.lastSuccessAt)) || instant(newer.lastSuccessAt) >= instant(recovered.lastSuccessAt))) {
    recovered.lastSuccessAt = newer.lastSuccessAt;
  }
  const edr = newer.rateLimits?.forecastEdr;
  if (object(edr)) {
    const old = recovered.rateLimits?.forecastEdr ?? {};
    const next = { ...old };
    for (const key of ['last429At', 'lastSuccessAt']) {
      if (Number.isFinite(instant(edr[key])) && instant(edr[key]) <= restored + CLOCK_SKEW
        && (!Number.isFinite(instant(old[key])) || instant(edr[key]) >= instant(old[key]))) next[key] = edr[key];
    }
    // Do not erase a newer protected cooldown with an older/null snapshot.
    if (Number.isFinite(instant(edr.rateLimitedUntil)) && instant(edr.rateLimitedUntil) > restored
      && (!Number.isFinite(instant(old.rateLimitedUntil)) || instant(edr.rateLimitedUntil) > instant(old.rateLimitedUntil))) {
      next.rateLimitedUntil = edr.rateLimitedUntil;
    }
    if (Number.isSafeInteger(edr.successStreak) && edr.successStreak >= 0) next.successStreak = edr.successStreak;
    recovered.rateLimits = { ...(recovered.rateLimits ?? {}), forecastEdr: next };
  }
  complete.runtime = recovered;
  stats.runtimeRecovered = true;
}

export function mergeVerifiedDmiForecastProgress(complete, progress, {
  features, productionReferenceAt, restoredAt = new Date().toISOString(),
} = {}) {
  const stats = { status: 'RETAINED', recoveredComponents: 0, rejectedRecords: 0, runtimeRecovered: false };
  if (!storeShape(complete) || !storeShape(progress)) return { document: complete, stats, code: 'DMI_FORECAST_SHAPE_REJECTED' };
  const zones = expectedZones(features);
  const reference = instant(productionReferenceAt);
  const restored = instant(restoredAt);
  if (!zones || !exactHour(productionReferenceAt) || !Number.isFinite(restored)) {
    return { document: complete, stats, code: 'DMI_FORECAST_CONTEXT_REJECTED' };
  }
  const document = copy(complete);
  for (const [zoneId, candidate] of Object.entries(progress.zones)) {
    const location = zones.get(zoneId);
    const previous = complete.zones[zoneId];
    if (!location || candidate.zoneId !== zoneId || !samePoint(candidate.point, location)
      || (previous && (previous.zoneId !== zoneId || !samePoint(previous.point, location)))
      || !Number.isFinite(instant(candidate.generatedAt)) || instant(candidate.generatedAt) > restored + CLOCK_SKEW
      || new Set(candidate.hourly.filter(row => exactHour(row?.time)).map(row => instant(row.time))).size
        !== candidate.hourly.filter(row => exactHour(row?.time)).length
      || (previous && (previous.hourly.some(row => !exactHour(row?.time))
        || new Set(previous.hourly.map(row => instant(row.time))).size !== previous.hourly.length))) {
      stats.rejectedRecords += 1;
      continue;
    }
    const identity = { entityId: zoneId, parentZoneId: zoneId, entityType: 'parent-zone',
      samplingContext: 'parent-zone-water-point', samplingPoint: location };
    // This is the producer's rolling H0..H120 forecast, not score history.
    // Keep EVERY still-current baseline tuple; expire only forecast hours
    // outside that same window before the shared normalizer's first121 cap.
    // Actual 24/72h samples, selected-component/history banks and score state
    // live in other protected files and are not rewritten by this helper.
    const inWindow = row => exactHour(row?.time) && instant(row.time) >= reference
      && instant(row.time) < reference + DMI_FORECAST_HOURS * HOUR;
    const oldRows = (previous?.hourly ?? []).filter(inWindow);
    const oldByTime = new Map(oldRows.map(row => [new Date(row.time).toISOString(), row]));
    const admitted = [];
    let recovered = 0;
    let unproved = false;
    for (const row of candidate.hourly) {
      if (!inWindow(row)) continue;
      const clean = { time: new Date(row.time).toISOString(), sources: {} };
      for (const component of COMPONENTS) {
        const source = admittedSource(row, component, identity);
        if (!source) {
          if (hasValue(row, component)) unproved = true;
          continue;
        }
        const old = oldByTime.get(clean.time);
        const existing = old && admittedSource(old, component, identity);
        if (existing && !preferQualifiedDmiComponentSource(existing, source, component)) continue;
        for (const field of FIELDS[component]) if (Object.hasOwn(row, field)) clean[field] = copy(row[field]);
        clean.sources[component] = copy(row.sources[component]);
        recovered += 1;
      }
      if (Object.keys(clean.sources).length) admitted.push(clean);
    }
    if (unproved) stats.rejectedRecords += 1;
    if (!admitted.length) continue;
    const hourly = normalizeForecastHourly([...oldRows, ...admitted], {
      limit: DMI_FORECAST_HOURS,
      preferCompleteComponent: (oldRow, newRow, component) => {
        const newer = admittedSource(newRow, component, identity);
        if (!newer) return false;
        const older = admittedSource(oldRow, component, identity);
        return !older || preferQualifiedDmiComponentSource(older, newer, component);
      },
    });
    document.zones[zoneId] = { ...(previous ? copy(previous) : { schemaVersion: 1, zoneId,
      point: copy(location), source: 'dmi', model: null, waterLevelInterpolation: null }),
      generatedAt: Number.isFinite(instant(previous?.generatedAt)) && instant(previous.generatedAt) > instant(candidate.generatedAt)
        ? previous.generatedAt : candidate.generatedAt,
      hourly, validFrom: hourly[0].time, validUntil: hourly.at(-1).time, horizonHours: hourly.length };
    stats.recoveredComponents += recovered;
  }
  if (sameActiveGeometry(complete, zones)) recoverRuntime(document, progress, zones, restored, stats);
  if (stats.recoveredComponents || stats.runtimeRecovered) stats.status = 'MERGED';
  return { document: stats.status === 'MERGED' ? document : complete, stats,
    code: stats.rejectedRecords ? 'DMI_FORECAST_RECORDS_REJECTED' : null };
}

const stationKey = row => safeId(row?.sourceKey) && (typeof row?.stationId === 'string' || Number.isSafeInteger(row?.stationId))
  ? JSON.stringify([row.sourceKey, row.stationId]) : null;

export function mergeVerifiedStationObservationProgress(complete, progress, {
  productionReferenceAt, restoredAt = new Date().toISOString(),
  stationGraceHours = Number(process.env.STATION_CACHE_GRACE_HOURS ?? 6),
} = {}) {
  const stats = { status: 'RETAINED', recoveredObservations: 0, rejectedRecords: 0 };
  if (!object(complete) || !Array.isArray(complete.stations) || !object(progress) || !Array.isArray(progress.stations)) {
    return { document: complete, stats, code: 'DMI_STATION_SHAPE_REJECTED' };
  }
  const reference = instant(productionReferenceAt);
  const restored = instant(restoredAt);
  if (!exactHour(productionReferenceAt) || !Number.isFinite(restored) || !finite(stationGraceHours) || stationGraceHours < 1) {
    return { document: complete, stats, code: 'DMI_STATION_CONTEXT_REJECTED' };
  }
  const latest = new Map();
  const ambiguous = new Set();
  for (const row of progress.stations) {
    const key = stationKey(row);
    if (!key || latest.has(key)) { if (key) ambiguous.add(key); stats.rejectedRecords += 1; continue; }
    latest.set(key, row);
  }
  const document = copy(complete);
  const known = new Set();
  for (const row of complete.stations) {
    const key = stationKey(row);
    if (known.has(key)) ambiguous.add(key);
    known.add(key);
  }
  stats.rejectedRecords += [...latest.keys()].filter(key => !known.has(key)).length;
  for (const previous of document.stations) {
    const key = stationKey(previous);
    const newer = latest.get(key);
    if (!newer || ambiguous.has(key)) continue;
    const observed = instant(newer.lastObservationAt);
    const expiry = Math.min(instant(newer.forecastCacheValidUntil), observed + stationGraceHours * HOUR);
    if (!samePoint(previous.point, newer.point) || previous.sourceType !== newer.sourceType
      || previous.sourceType !== 'observation-station' || !finite(newer.lastObservationValueCm)
      || !Number.isFinite(observed) || observed > reference || observed > restored + CLOCK_SKEW
      || !Number.isFinite(expiry) || expiry < reference
      || (finite(previous.lastObservationValueCm) && Number.isFinite(instant(previous.lastObservationAt))
        && observed <= instant(previous.lastObservationAt))) {
      stats.rejectedRecords += 1;
      continue;
    }
    // Only the observation tuple changes. Source geometry, admin choices and
    // descriptive/forecast fields remain those of the protected registry.
    previous.lastObservationAt = new Date(observed).toISOString();
    previous.lastObservationValueCm = newer.lastObservationValueCm;
    previous.hasEverDelivered = true;
    previous.firstObservationAt ??= previous.lastObservationAt;
    previous.forecastCacheValidUntil = new Date(expiry).toISOString();
    previous.forecastCacheGeneratedAt = previous.lastObservationAt;
    previous.deliveryStatus = 'temporarily-missing'; // recovered, not freshly observed by this run
    stats.recoveredObservations += 1;
  }
  if (stats.recoveredObservations) stats.status = 'MERGED';
  return { document: stats.status === 'MERGED' ? document : complete, stats,
    code: stats.rejectedRecords ? 'DMI_STATION_RECORDS_REJECTED' : null };
}

async function readJson(file) {
  const info = await fs.lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size < 1 || info.size > MAX_BYTES) throw new Error('invalid');
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export async function reconcileDmiProgressFiles({
  root, files, temporaryDirectory, productionReferenceAt, restoredAt = new Date().toISOString(),
}) {
  const extras = new Set(Object.values(FILES));
  const selected = files.filter(file => extras.has(file.relativePath));
  const output = files.filter(file => !extras.has(file.relativePath));
  const summary = { schemaVersion: 1, forecast: { status: 'NOT_PRESENT', recoveredComponents: 0,
    rejectedRecords: 0, runtimeRecovered: false }, stations: { status: 'NOT_PRESENT', recoveredObservations: 0,
    rejectedRecords: 0 }, codes: [] };
  for (const file of selected) {
    const forecast = file.relativePath === FILES.dmiForecastStore;
    const name = forecast ? 'forecast' : 'stations';
    try {
      const [complete, progress] = await Promise.all([readJson(path.join(root, file.relativePath)), readJson(file.sourcePath)]);
      const result = forecast
        ? mergeVerifiedDmiForecastProgress(complete, progress, {
          features: (await readJson(path.join(root, 'data/zones.geojson'))).features, productionReferenceAt, restoredAt,
        })
        : mergeVerifiedStationObservationProgress(complete, progress, { productionReferenceAt, restoredAt });
      summary[name] = result.stats;
      if (result.code) summary.codes.push(result.code);
      if (result.stats.status !== 'MERGED') continue;
      const bytes = Buffer.from(`${JSON.stringify(result.document)}\n`);
      if (bytes.length > MAX_BYTES) throw new Error('invalid');
      const sourcePath = path.join(temporaryDirectory, `merged-dmi-progress-${name}.json`);
      await fs.writeFile(sourcePath, bytes, { flag: 'wx', mode: 0o600 });
      output.push({ ...file, sourcePath });
    } catch {
      summary[name] = forecast
        ? { status: 'RETAINED', recoveredComponents: 0, rejectedRecords: 0, runtimeRecovered: false }
        : { status: 'RETAINED', recoveredObservations: 0, rejectedRecords: 0 };
      summary.codes.push(forecast ? 'DMI_FORECAST_RECOVERY_UNAVAILABLE' : 'DMI_STATION_RECOVERY_UNAVAILABLE');
    }
  }
  return { files: output, summary };
}
