export const DMI_FORECAST_HOURS = 120;
export const DMI_FORECAST_SCHEMA_VERSION = 1;

const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;
const round = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
const normalizeDegrees = value => ((value % 360) + 360) % 360;

export function interpolateWaterLevelStations(point, stations, levels, { maxStations = 2, minimumDistanceKm = 0.25, haversineKm } = {}) {
  if (!Array.isArray(point) || typeof haversineKm !== 'function') throw new TypeError('point and haversineKm are required');
  const candidates = stations
    .map(station => ({ ...station, level: levels.get(station.stationId), distanceKm: haversineKm(point, station.point) }))
    .filter(item => item.level && finite(item.level.valueCm) !== null && Number.isFinite(item.distanceKm))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, Math.max(1, maxStations));
  if (!candidates.length) return null;
  if (candidates.length === 1 || candidates[0].distanceKm < minimumDistanceKm) {
    const station = candidates[0];
    return {
      valueCm: round(finite(station.level.valueCm), 0),
      method: 'nearest-station',
      stations: [{ stationId: station.stationId, name: station.name, valueCm: round(finite(station.level.valueCm), 0), distanceKm: round(station.distanceKm, 1), weight: 1, observed: station.level.observed, observationAgeMinutes: Number.isFinite(Date.parse(station.level.observed)) ? round((Date.now() - Date.parse(station.level.observed)) / 60000, 0) : null, qcStatus: station.level.qcStatus ?? null }]
    };
  }
  const inverseDistances = candidates.map(item => 1 / Math.max(item.distanceKm, minimumDistanceKm));
  const total = inverseDistances.reduce((sum, value) => sum + value, 0);
  const weights = inverseDistances.map(value => value / total);
  const valueCm = candidates.reduce((sum, item, index) => sum + finite(item.level.valueCm) * weights[index], 0);
  return {
    valueCm: round(valueCm, 0),
    method: `inverse-distance-${candidates.length}-stations`,
    stations: candidates.map((item, index) => ({
      stationId: item.stationId,
      name: item.name,
      valueCm: round(finite(item.level.valueCm), 0),
      distanceKm: round(item.distanceKm, 1),
      weight: round(weights[index], 3),
      observed: item.level.observed,
      observationAgeMinutes: Number.isFinite(Date.parse(item.level.observed)) ? round((Date.now() - Date.parse(item.level.observed)) / 60000, 0) : null,
      qcStatus: item.level.qcStatus ?? null
    }))
  };
}

function closest(items, targetMs) {
  return items.reduce((best, item) => {
    const time = Date.parse(item.step ?? item.time);
    if (!Number.isFinite(time)) return best;
    const distance = Math.abs(time - targetMs);
    return !best || distance < best.distance ? { item, distance } : best;
  }, null)?.item ?? null;
}

export function buildDmiForecastHourly({ wind = [], waves = [], ocean = [], observedWaterLevel = null, generatedAt, hours = DMI_FORECAST_HOURS } = {}) {
  const start = Date.parse(generatedAt);
  if (!Number.isFinite(start)) throw new Error('generatedAt must be a valid date');
  const oceanCurrent = closest(ocean, start);
  const modelCurrentCm = finite(oceanCurrent?.['sea-mean-deviation']) === null ? null : finite(oceanCurrent['sea-mean-deviation']) * 100;
  const observationCm = finite(observedWaterLevel?.valueCm);
  const observationDifferenceCm = observationCm !== null && modelCurrentCm !== null ? observationCm - modelCurrentCm : null;
  const waterLevelBiasCm = 0;

  const hourly = [];
  for (let index = 0; index < hours; index += 1) {
    const validMs = start + index * 3600000;
    const w = closest(wind, validMs);
    const wa = closest(waves, validMs);
    const o = closest(ocean, validMs);
    const o3 = closest(ocean, validMs + 3 * 3600000);
    const u = finite(o?.['current-u']);
    const v = finite(o?.['current-v']);
    const sea = finite(o?.['sea-mean-deviation']);
    const sea3 = finite(o3?.['sea-mean-deviation']);
    const timeSource = o?.step ?? w?.step ?? wa?.step ?? new Date(validMs).toISOString();
    hourly.push({
      time: new Date(Date.parse(timeSource) || validMs).toISOString(),
      windSpeedMps: round(finite(w?.['wind-speed-10m']), 1),
      windDirectionDeg: round(finite(w?.['wind-dir-10m']), 0),
      waveHeightM: round(finite(wa?.['significant-wave-height']), 2),
      waveDirectionDeg: round(finite(wa?.['mean-wave-dir']), 0),
      wavePeriodS: round(finite(wa?.['dominant-wave-period']), 1),
      waterLevelCm: sea === null ? null : round(sea * 100, 0),
      waterLevelModelCm: sea === null ? null : round(sea * 100, 0),
      waterLevelBiasCm: 0,
      waterLevelObservationDifferenceCm: sea === null ? null : round(observationDifferenceCm, 0),
      waterLevelTrendCm3h: sea === null || sea3 === null ? null : round((sea3 - sea) * 100, 0),
      currentSpeedMps: u === null || v === null ? null : round(Math.hypot(u, v), 2),
      currentDirectionDeg: u === null || v === null ? null : round(normalizeDegrees(Math.atan2(u, v) * 180 / Math.PI), 0),
      waterTemperatureC: round(finite(o?.['water-temperature']), 1),
      source: 'dmi-forecast',
      waterLevelSource: 'dmi-model-authoritative'
    });
  }
  return { hourly, waterLevelBiasCm: 0, observationDifferenceCm: round(observationDifferenceCm, 0) };
}

export function createDmiForecastRecord({ zoneId, point, generatedAt, hourly, waterLevelInterpolation = null, model = null } = {}) {
  const validHourly = (hourly ?? []).filter(item => Number.isFinite(Date.parse(item.time))).sort((a, b) => Date.parse(a.time) - Date.parse(b.time)).slice(0, DMI_FORECAST_HOURS);
  if (!validHourly.length) throw new Error(`DMI forecast for ${zoneId ?? 'zone'} has no valid hourly values`);
  return {
    schemaVersion: DMI_FORECAST_SCHEMA_VERSION,
    zoneId,
    point,
    source: 'dmi',
    generatedAt,
    validFrom: validHourly[0].time,
    validUntil: validHourly.at(-1).time,
    horizonHours: validHourly.length,
    model,
    waterLevelInterpolation,
    hourly: validHourly
  };
}

export function selectDmiForecastAt(record, at = new Date().toISOString(), { toleranceMinutes = 90 } = {}) {
  if (!record?.hourly?.length) return null;
  const target = Date.parse(at);
  if (!Number.isFinite(target) || target < Date.parse(record.validFrom) - toleranceMinutes * 60000 || target > Date.parse(record.validUntil) + toleranceMinutes * 60000) return null;
  const selected = record.hourly.reduce((best, item) => {
    const distance = Math.abs(Date.parse(item.time) - target);
    return !best || distance < best.distance ? { item, distance } : best;
  }, null);
  if (!selected || selected.distance > toleranceMinutes * 60000) return null;
  return { ...selected.item, cacheAgeHours: round((target - Date.parse(record.generatedAt)) / 3600000, 1) };
}

export function dmiForecastCoverage(record, at = new Date().toISOString()) {
  if (!record?.validUntil) return { available: false, remainingHours: 0, totalHours: 0 };
  const remainingHours = Math.max(0, (Date.parse(record.validUntil) - Date.parse(at)) / 3600000);
  return { available: remainingHours > 0, remainingHours: round(remainingHours, 1), totalHours: record.hourly?.length ?? 0 };
}

function localKm(point, origin) {
  const latScale = 111.32;
  const lonScale = 111.32 * Math.cos((origin[1] ?? 56) * Math.PI / 180);
  return [(point[0] - origin[0]) * lonScale, (point[1] - origin[1]) * latScale];
}

export function projectPointOnCoastPath(point, path) {
  if (!Array.isArray(point) || !Array.isArray(path) || path.length < 2) return null;
  let cumulativeKm = 0;
  let best = null;
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i], b = path[i + 1];
    if (!Array.isArray(a) || !Array.isArray(b)) continue;
    const av = localKm(a, point), bv = localKm(b, point);
    const vx = bv[0] - av[0], vy = bv[1] - av[1];
    const length2 = vx * vx + vy * vy;
    const t = length2 ? Math.max(0, Math.min(1, -(av[0] * vx + av[1] * vy) / length2)) : 0;
    const px = av[0] + t * vx, py = av[1] + t * vy;
    const distanceKm = Math.hypot(px, py);
    const segmentKm = Math.sqrt(length2);
    const alongKm = cumulativeKm + t * segmentKm;
    if (!best || distanceKm < best.distanceKm) best = { distanceKm, alongKm, segmentIndex: i, fraction: t };
    cumulativeKm += segmentKm;
  }
  return best;
}

export function interpolateWaterLevelAlongCoast(point, coastPath, stations, levels, {
  directStationKm = 8,
  maxCorridorDistanceKm = 25,
  minimumDistanceKm = 0.25,
  haversineKm
} = {}) {
  if (!Array.isArray(coastPath) || coastPath.length < 2) return interpolateWaterLevelStations(point, stations, levels, { maxStations: 2, minimumDistanceKm, haversineKm });
  const targetProjection = projectPointOnCoastPath(point, coastPath);
  if (!targetProjection) return null;
  const candidates = stations.map(station => {
    const level = levels.get(station.stationId);
    const projection = projectPointOnCoastPath(station.point, coastPath);
    return { ...station, level, projection, distanceKm: haversineKm(point, station.point) };
  }).filter(item => item.level && finite(item.level.valueCm) !== null && item.projection && item.projection.distanceKm <= maxCorridorDistanceKm);
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.distanceKm - b.distanceKm);
  if (candidates[0].distanceKm <= directStationKm) {
    const station = candidates[0];
    return {
      valueCm: round(finite(station.level.valueCm), 0), method: 'direct-coast-station',
      targetCoastPositionKm: round(targetProjection.alongKm, 1),
      stations: [{ stationId: station.stationId, name: station.name, valueCm: round(finite(station.level.valueCm), 0), distanceKm: round(station.distanceKm, 1), coastPositionKm: round(station.projection.alongKm, 1), side: 'direct', weight: 1, observed: station.level.observed, observationAgeMinutes: Number.isFinite(Date.parse(station.level.observed)) ? round((Date.now() - Date.parse(station.level.observed)) / 60000, 0) : null, qcStatus: station.level.qcStatus ?? null }]
    };
  }
  const before = candidates.filter(item => item.projection.alongKm <= targetProjection.alongKm).sort((a, b) => b.projection.alongKm - a.projection.alongKm)[0];
  const after = candidates.filter(item => item.projection.alongKm >= targetProjection.alongKm).sort((a, b) => a.projection.alongKm - b.projection.alongKm)[0];
  let selected = before && after && before.stationId !== after.stationId ? [before, after] : [...candidates].sort((a, b) => Math.abs(a.projection.alongKm - targetProjection.alongKm) - Math.abs(b.projection.alongKm - targetProjection.alongKm)).slice(0, 2);
  selected = [...new Map(selected.map(item => [item.stationId, item])).values()];
  if (!selected.length) return null;
  const alongDistances = selected.map(item => Math.max(Math.abs(item.projection.alongKm - targetProjection.alongKm), minimumDistanceKm));
  const inverses = alongDistances.map(value => 1 / value);
  const total = inverses.reduce((sum, value) => sum + value, 0);
  const weights = inverses.map(value => value / total);
  const valueCm = selected.reduce((sum, item, index) => sum + finite(item.level.valueCm) * weights[index], 0);
  return {
    valueCm: round(valueCm, 0), method: selected.length === 2 && before && after ? 'coast-bracket-2-stations' : `coast-nearest-${selected.length}-stations`, targetCoastPositionKm: round(targetProjection.alongKm, 1),
    stations: selected.map((item, index) => ({ stationId: item.stationId, name: item.name, valueCm: round(finite(item.level.valueCm), 0), distanceKm: round(item.distanceKm, 1), coastDistanceKm: round(alongDistances[index], 1), coastPositionKm: round(item.projection.alongKm, 1), side: item.projection.alongKm < targetProjection.alongKm ? 'before' : 'after', weight: round(weights[index], 3), observed: item.level.observed, observationAgeMinutes: Number.isFinite(Date.parse(item.level.observed)) ? round((Date.now() - Date.parse(item.level.observed)) / 60000, 0) : null, qcStatus: item.level.qcStatus ?? null }))
  };
}
