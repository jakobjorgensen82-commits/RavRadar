export const DMI_FORECAST_HOURS = 120;
export const DMI_FORECAST_SCHEMA_VERSION = 1;

const finite = value => value === null || value === undefined || value === '' ? null : (Number.isFinite(Number(value)) ? Number(value) : null);
const round = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
export const normalizeDegrees = value => ((value % 360) + 360) % 360;
export function uvToTowardDirectionDeg(uValue, vValue) {
  const u = finite(uValue);
  const v = finite(vValue);
  return u === null || v === null ? null : normalizeDegrees(Math.atan2(u, v) * 180 / Math.PI);
}

export function interpolateWaterLevelStations(point, stations, levels, { maxStations = 2, minimumDistanceKm = 0.25, haversineKm } = {}) {
  if (!Array.isArray(point) || typeof haversineKm !== 'function') throw new TypeError('point and haversineKm are required');
  const uniqueStations = [...new Map((stations ?? []).filter(station => station?.stationId).map(station => [String(station.stationId), station])).values()];
  const candidates = uniqueStations
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

function closest(items, targetMs, toleranceMs = Number.POSITIVE_INFINITY) {
  const selected = items.reduce((best, item) => {
    const time = Date.parse(item.step ?? item.time);
    if (!Number.isFinite(time)) return best;
    const distance = Math.abs(time - targetMs);
    return !best || distance < best.distance ? { item, distance } : best;
  }, null);
  return selected && selected.distance <= toleranceMs ? selected.item : null;
}

function timeBracket(items, targetMs, { maxGapMs = 4 * 3600000, edgeToleranceMs = 95 * 60000 } = {}) {
  const ordered = (items ?? [])
    .map(item => ({ item, time: Date.parse(item?.step ?? item?.time) }))
    .filter(entry => Number.isFinite(entry.time))
    .sort((a, b) => a.time - b.time);
  if (!ordered.length) return null;
  const exact = ordered.find(entry => entry.time === targetMs);
  if (exact) return { before: exact.item, after: exact.item, ratio: 0, mode: 'exact' };
  let before = null;
  let after = null;
  for (const entry of ordered) {
    if (entry.time < targetMs) before = entry;
    else if (entry.time > targetMs) { after = entry; break; }
  }
  if (before && after && after.time - before.time <= maxGapMs) {
    return { before: before.item, after: after.item, ratio: (targetMs - before.time) / (after.time - before.time), mode: 'interpolated' };
  }
  const edge = !before ? after : (!after ? before : null);
  if (edge && Math.abs(edge.time - targetMs) <= edgeToleranceMs) {
    return { before: edge.item, after: edge.item, ratio: 0, mode: 'nearest-edge' };
  }
  return null;
}

function interpolateScalar(bracket, key) {
  if (!bracket) return null;
  const a = finite(bracket.before?.[key]);
  const b = finite(bracket.after?.[key]);
  if (a === null && b === null) return null;
  if (bracket.before === bracket.after) return a ?? b;
  if (a === null || b === null) return null;
  return a + (b - a) * bracket.ratio;
}

function directionToVector(speedValue, directionValue, { from = false } = {}) {
  const speed = finite(speedValue);
  const direction = finite(directionValue);
  if (speed === null || direction === null) return null;
  const toward = normalizeDegrees(direction + (from ? 180 : 0)) * Math.PI / 180;
  return { u: speed * Math.sin(toward), v: speed * Math.cos(toward) };
}

function vectorToDirection(uValue, vValue, { from = false } = {}) {
  const toward = uvToTowardDirectionDeg(uValue, vValue);
  return toward === null ? null : normalizeDegrees(toward + (from ? 180 : 0));
}


function interpolateDirection(bracket, directionKey, { from = false } = {}) {
  if (!bracket) return null;
  const convert = item => {
    const direction = finite(item?.[directionKey]);
    if (direction === null) return null;
    const toward = normalizeDegrees(direction + (from ? 180 : 0)) * Math.PI / 180;
    return { u: Math.sin(toward), v: Math.cos(toward) };
  };
  const a = convert(bracket.before);
  const b = convert(bracket.after);
  if (!a && !b) return null;
  if (bracket.before === bracket.after) {
    const vector = a ?? b;
    return vectorToDirection(vector.u, vector.v, { from });
  }
  if (!a || !b) return null;
  const u = a.u + (b.u - a.u) * bracket.ratio;
  const v = a.v + (b.v - a.v) * bracket.ratio;
  return vectorToDirection(u, v, { from });
}
function interpolateSpeedDirection(bracket, speedKey, directionKey, { from = false } = {}) {
  if (!bracket) return { speed: null, direction: null };
  const a = directionToVector(bracket.before?.[speedKey], bracket.before?.[directionKey], { from });
  const b = directionToVector(bracket.after?.[speedKey], bracket.after?.[directionKey], { from });
  if (!a && !b) return { speed: null, direction: null };
  if (bracket.before === bracket.after) {
    const vector = a ?? b;
    return { speed: Math.hypot(vector.u, vector.v), direction: vectorToDirection(vector.u, vector.v, { from }) };
  }
  if (!a || !b) return { speed: null, direction: null };
  const u = a.u + (b.u - a.u) * bracket.ratio;
  const v = a.v + (b.v - a.v) * bracket.ratio;
  return { speed: Math.hypot(u, v), direction: vectorToDirection(u, v, { from }) };
}

export function canonicalForecastHour(value, { ceil = false } = {}) {
  const ms = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms);
  const hadPartialHour = date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0;
  date.setUTCMinutes(0, 0, 0);
  if (ceil && hadPartialHour) date.setUTCHours(date.getUTCHours() + 1);
  return date.toISOString();
}

export function normalizeForecastHourly(hourly = [], { limit = DMI_FORECAST_HOURS } = {}) {
  const byTime = new Map();
  for (const row of hourly ?? []) {
    const ms = Date.parse(row?.time);
    if (!Number.isFinite(ms)) continue;
    const time = canonicalForecastHour(ms);
    if (!time) continue;
    const previous = byTime.get(time) ?? { time };
    const merged = { ...previous, time };
    for (const [key, value] of Object.entries(row ?? {})) {
      if (key === 'time') continue;
      // Samme tidspunkt kan komme fra flere DMI-collections. Bevar allerede
      // gyldige værdier, men udfyld tomme komponenter fra den næste række.
      if (merged[key] === null || merged[key] === undefined || merged[key] === '') merged[key] = value;
      else if (value !== null && value !== undefined && value !== '' && key === 'sources') {
        merged.sources = { ...(merged.sources ?? {}), ...value };
      }
    }
    byTime.set(time, merged);
  }
  return [...byTime.values()]
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
    .slice(0, Math.max(0, limit));
}

export function buildDmiForecastHourly({ wind = [], waves = [], ocean = [], observedWaterLevel = null, generatedAt, hours = DMI_FORECAST_HOURS, sourceCadenceMinutes = 180 } = {}) {
  const canonicalStart = canonicalForecastHour(generatedAt, { ceil: true });
  const start = Date.parse(canonicalStart);
  if (!Number.isFinite(start)) throw new Error('generatedAt must be a valid date');
  const cadenceMs = Math.max(60, Number(sourceCadenceMinutes) || 180) * 60000;
  const bracketOptions = { maxGapMs: Math.max(4 * 3600000, cadenceMs + 15 * 60000), edgeToleranceMs: Math.min(95 * 60000, cadenceMs / 2 + 5 * 60000) };
  const currentOceanBracket = timeBracket(ocean, start, bracketOptions);
  const modelCurrentSea = interpolateScalar(currentOceanBracket, 'sea-mean-deviation');
  const modelCurrentCm = modelCurrentSea === null ? null : modelCurrentSea * 100;
  const observationCm = finite(observedWaterLevel?.valueCm);
  const observationDifferenceCm = observationCm !== null && modelCurrentCm !== null ? observationCm - modelCurrentCm : null;

  const hourly = [];
  for (let index = 0; index < hours; index += 1) {
    const validMs = start + index * 3600000;
    const windBracket = timeBracket(wind, validMs, bracketOptions);
    const waveBracket = timeBracket(waves, validMs, bracketOptions);
    const oceanBracket = timeBracket(ocean, validMs, bracketOptions);
    const ocean3Bracket = timeBracket(ocean, validMs + 3 * 3600000, bracketOptions);
    const windVector = interpolateSpeedDirection(windBracket, 'wind-speed-10m', 'wind-dir-10m', { from: true });
    const waveHeight = interpolateScalar(waveBracket, 'significant-wave-height');
    const waveDirection = interpolateDirection(waveBracket, 'mean-wave-dir');
    const u = interpolateScalar(oceanBracket, 'current-u');
    const v = interpolateScalar(oceanBracket, 'current-v');
    const sea = interpolateScalar(oceanBracket, 'sea-mean-deviation');
    const sea3 = interpolateScalar(ocean3Bracket, 'sea-mean-deviation');
    hourly.push({
      time: new Date(validMs).toISOString(),
      windSpeedMps: round(windVector.speed, 1),
      windDirectionDeg: round(windVector.direction, 0),
      waveHeightM: round(waveHeight, 2),
      waveDirectionDeg: round(waveDirection, 0),
      wavePeriodS: round(interpolateScalar(waveBracket, 'dominant-wave-period'), 1),
      waterLevelCm: sea === null ? null : round(sea * 100, 0),
      waterLevelModelCm: sea === null ? null : round(sea * 100, 0),
      waterLevelBiasCm: 0,
      waterLevelObservationDifferenceCm: sea === null ? null : round(observationDifferenceCm, 0),
      waterLevelTrendCm3h: sea === null || sea3 === null ? null : round((sea3 - sea) * 100, 0),
      currentUMps: round(u, 5),
      currentVMps: round(v, 5),
      currentSpeedMps: u === null || v === null ? null : round(Math.hypot(u, v), 2),
      currentDirectionDeg: round(uvToTowardDirectionDeg(u, v), 0),
      waterTemperatureC: round(interpolateScalar(oceanBracket, 'water-temperature'), 1),
      temporalResolution: oceanBracket?.mode ?? windBracket?.mode ?? waveBracket?.mode ?? null,
      source: 'dmi-forecast',
      waterLevelSource: 'dmi-model-authoritative'
    });
  }
  return { hourly, waterLevelBiasCm: 0, observationDifferenceCm: round(observationDifferenceCm, 0), interpolation: { method: 'linear-between-model-steps', vectorInterpolation: ['wind', 'wave-direction', 'current'], sourceCadenceMinutes: Number(sourceCadenceMinutes) || 180 } };
}

export function createDmiForecastRecord({ zoneId, point, generatedAt, hourly, waterLevelInterpolation = null, model = null } = {}) {
  const validHourly = normalizeForecastHourly(hourly, { limit: DMI_FORECAST_HOURS });
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

export function selectDmiForecastAt(record, at = new Date().toISOString(), { toleranceMinutes = null } = {}) {
  const cadenceMinutes = Number(record?.model?.completeness?.forecastCadenceMinutes ?? record?.model?.forecastCadenceMinutes ?? 60);
  const resolvedToleranceMinutes = toleranceMinutes !== null && toleranceMinutes !== undefined && Number.isFinite(Number(toleranceMinutes))
    ? Number(toleranceMinutes)
    : Math.max(90, Math.min(190, Math.ceil(cadenceMinutes) + 5));
  if (!record?.hourly?.length) return null;
  const target = Date.parse(at);
  if (!Number.isFinite(target) || target < Date.parse(record.validFrom) - resolvedToleranceMinutes * 60000 || target > Date.parse(record.validUntil) + resolvedToleranceMinutes * 60000) return null;
  const selected = record.hourly.reduce((best, item) => {
    const distance = Math.abs(Date.parse(item.time) - target);
    return !best || distance < best.distance ? { item, distance } : best;
  }, null);
  if (!selected || selected.distance > resolvedToleranceMinutes * 60000) return null;
  return { ...selected.item, cacheAgeHours: round((target - Date.parse(record.generatedAt)) / 3600000, 1) };
}

export function dmiForecastCoverage(record, at = new Date().toISOString()) {
  const uniqueHourly = normalizeForecastHourly(record?.hourly ?? [], { limit: DMI_FORECAST_HOURS });
  if (!uniqueHourly.length) return { available: false, remainingHours: 0, totalHours: 0, uniqueHours: 0 };
  const validUntil = Date.parse(uniqueHourly.at(-1).time);
  const remainingHours = Math.max(0, (validUntil - Date.parse(at)) / 3600000);
  return { available: remainingHours > 0, remainingHours: round(remainingHours, 1), totalHours: uniqueHourly.length, uniqueHours: uniqueHourly.length };
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
  haversineKm,
  requireBracket = false
} = {}) {
  if (!Array.isArray(coastPath) || coastPath.length < 2) {
    return requireBracket ? null : interpolateWaterLevelStations(point, stations, levels, { maxStations: 2, minimumDistanceKm, haversineKm });
  }
  const targetProjection = projectPointOnCoastPath(point, coastPath);
  if (!targetProjection) return null;
  const uniqueStations = [...new Map((stations ?? []).filter(station => station?.stationId).map(station => [String(station.stationId), station])).values()];
  const candidates = uniqueStations.map(station => {
    const level = levels.get(station.stationId);
    const projection = projectPointOnCoastPath(station.point, coastPath);
    return { ...station, level, projection, distanceKm: haversineKm(point, station.point) };
  }).filter(item => item.level && finite(item.level.valueCm) !== null && item.projection && item.projection.distanceKm <= maxCorridorDistanceKm);
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.distanceKm - b.distanceKm);
  if (!requireBracket && candidates[0].distanceKm <= directStationKm) {
    const station = candidates[0];
    return {
      valueCm: round(finite(station.level.valueCm), 0), method: 'direct-coast-station',
      targetCoastPositionKm: round(targetProjection.alongKm, 1),
      stations: [{ stationId: station.stationId, name: station.name, valueCm: round(finite(station.level.valueCm), 0), distanceKm: round(station.distanceKm, 1), coastPositionKm: round(station.projection.alongKm, 1), side: 'direct', weight: 1, observed: station.level.observed, observationAgeMinutes: Number.isFinite(Date.parse(station.level.observed)) ? round((Date.now() - Date.parse(station.level.observed)) / 60000, 0) : null, qcStatus: station.level.qcStatus ?? null }]
    };
  }
  const before = candidates.filter(item => item.projection.alongKm <= targetProjection.alongKm).sort((a, b) => b.projection.alongKm - a.projection.alongKm)[0];
  const after = candidates.filter(item => item.projection.alongKm >= targetProjection.alongKm).sort((a, b) => a.projection.alongKm - b.projection.alongKm)[0];
  if (requireBracket && (!before || !after || before.stationId === after.stationId)) return null;
  let selected = before && after && before.stationId !== after.stationId ? [before, after] : [...candidates].sort((a, b) => Math.abs(a.projection.alongKm - targetProjection.alongKm) - Math.abs(b.projection.alongKm - targetProjection.alongKm)).slice(0, 2);
  selected = [...new Map(selected.map(item => [item.stationId, item])).values()];
  if (!selected.length || (requireBracket && selected.length !== 2)) return null;
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
