export const DMI_FORECAST_HOURS = 120;
export const DMI_FORECAST_SCHEMA_VERSION = 1;

// Score-bearing DMI values cross a strict numeric trust boundary here. JSON
// strings, booleans and arrays are not physical observations, even when
// JavaScript could coerce them into a finite Number.
const finite = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
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

function samePoint(first, second, tolerance = 1e-7) {
  return Array.isArray(first) && Array.isArray(second)
    && first.length === 2 && second.length === 2
    && first.every((value, index) => typeof value === 'number'
      && Number.isFinite(value)
      && typeof second[index] === 'number'
      && Number.isFinite(second[index])
      && Math.abs(value - second[index]) <= tolerance);
}

const COMPONENT_COLLECTIONS = Object.freeze({
  wind: new Set(['harmonie_dini_sf']),
  windTail: new Set(['dkss_idw', 'dkss_nsbs', 'dkss_lf']),
  wave: new Set(['wam_dw', 'wam_nsb']),
  current: new Set(['dkss_idw', 'dkss_nsbs', 'dkss_lf']),
  waterLevel: new Set(['dkss_idw', 'dkss_nsbs', 'dkss_lf']),
  waterTemperature: new Set(['dkss_idw', 'dkss_nsbs', 'dkss_lf'])
});
const COMPONENT_KIND = Object.freeze({
  wind: 'atmospheric-wind-vector',
  windTail: 'marine-wind-tail-vector',
  wave: 'wave-mobilisation-tuple',
  current: 'ocean-current-vector',
  waterLevel: 'marine-water-level-scalar',
  waterTemperature: 'marine-water-temperature-scalar'
});
const COMPONENT_FIELD_SET = Object.freeze({
  wind: ['wind-u-10m', 'wind-v-10m'],
  windTail: ['wind-tail-u-10m', 'wind-tail-v-10m'],
  wave: ['significant-wave-height', 'dominant-wave-period'],
  current: ['current-u', 'current-v'],
  waterLevel: ['sea-mean-deviation'],
  waterTemperature: ['water-temperature']
});
const COMPONENT_SPATIAL_SELECTION = Object.freeze({
  wind: 'nearest-shared-grid-cell-no-spatial-interpolation',
  windTail: 'nearest-shared-grid-cell-no-spatial-interpolation',
  wave: 'nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation',
  current: 'nearest-shared-grid-cell-no-spatial-interpolation',
  waterLevel: 'nearest-valid-grid-cell-no-spatial-interpolation',
  waterTemperature: 'nearest-valid-grid-cell-no-spatial-interpolation'
});
const COLLECTION_FAMILY = Object.freeze({
  harmonie_dini_sf: 'wind',
  wam_dw: 'wave', wam_nsb: 'wave',
  dkss_idw: 'marine', dkss_nsbs: 'marine', dkss_lf: 'marine'
});
const SHA256 = /^[0-9a-f]{64}$/;
const explicitTimestampMs = value => {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};
const exactStringArray = (value, expected) => Array.isArray(value)
  && value.length === expected.length
  && value.every((item, index) => item === expected[index]);
const exactFinitePoint = value => Array.isArray(value)
  && value.length === 2
  && value.every(item => typeof item === 'number' && Number.isFinite(item));
function haversinePointKm(first, second) {
  if (!exactFinitePoint(first) || !exactFinitePoint(second)) return null;
  const toRadians = value => value * Math.PI / 180;
  const [longitude1, latitude1] = first;
  const [longitude2, latitude2] = second;
  const latitudeDelta = toRadians(latitude2 - latitude1);
  const longitudeDelta = toRadians(longitude2 - longitude1);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(latitude1)) * Math.cos(toRadians(latitude2))
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
const sourceKey = component => component === 'windTail' ? 'wind' : component;

export function verifiedDmiNativeSource(source, component, nativeTime) {
  const runMs = explicitTimestampMs(source?.modelRun);
  const validMs = explicitTimestampMs(source?.nativeValidTime);
  const expectedValidMs = explicitTimestampMs(nativeTime);
  const lead = source?.leadTimeHours;
  const physicalDistanceKm = haversinePointKm(source?.samplingPoint, source?.gridPoint);
  if (!(
    source?.provider === 'dmi'
    && source.fallback === false
    && COMPONENT_COLLECTIONS[component]?.has(source.collection)
    && source.collectionFamily === COLLECTION_FAMILY[source.collection]
    && source.component === component
    && source.componentKind === COMPONENT_KIND[component]
    && exactStringArray(source.fieldSet, COMPONENT_FIELD_SET[component])
    && Array.isArray(source.optionalFieldSet)
    && (component === 'wave'
      ? source.optionalFieldSet.length <= 1
        && source.optionalFieldSet.every(value => value === 'mean-wave-dir')
      : source.optionalFieldSet.length === 0)
    && typeof source.entityId === 'string' && source.entityId
    && typeof source.parentZoneId === 'string' && source.parentZoneId
    && typeof source.entityType === 'string' && source.entityType
    && typeof source.samplingContext === 'string' && source.samplingContext
    && exactFinitePoint(source.samplingPoint)
    && exactFinitePoint(source.gridPoint)
    && SHA256.test(source.gridDefinitionSha256 ?? '')
    && typeof source.distanceKm === 'number' && Number.isFinite(source.distanceKm) && source.distanceKm >= 0
    && physicalDistanceKm !== null && Math.abs(source.distanceKm - physicalDistanceKm) <= 0.02
    && source.spatialSemanticsVersion === 1
    && source.spatialSelection === COMPONENT_SPATIAL_SELECTION[component]
    && Number.isFinite(runMs) && Number.isFinite(validMs) && validMs >= runMs
    && validMs === expectedValidMs
    && typeof lead === 'number' && Number.isFinite(lead)
    && Math.abs(lead - (validMs - runMs) / 3600000) <= 0.002
    && typeof source.itemId === 'string' && source.itemId.trim()
    && SHA256.test(source.assetIdentitySha256 ?? '')
    && Number.isFinite(explicitTimestampMs(source.acquiredAt))
    && (source.itemCreatedAt == null || Number.isFinite(explicitTimestampMs(source.itemCreatedAt)))
    && (source.itemUpdatedAt == null || Number.isFinite(explicitTimestampMs(source.itemUpdatedAt)))
  )) return null;
  if (component === 'current' && !(
    source.vectorSemanticsVersion === 3
    && source.vectorSelection === 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer'
    && source.distanceKm <= 5
    && typeof source.verticalLayer === 'string' && source.verticalLayer
    && typeof source.verticalLayerRankM === 'number' && Number.isFinite(source.verticalLayerRankM)
  )) return null;
  if (['wind', 'windTail'].includes(component) && !(
    source.vectorSemanticsVersion === 1
    && source.vectorSelection === 'nearest-shared-grid-cell-no-spatial-interpolation'
  )) return null;
  if (component === 'wave' && source.optionalFieldSet.some(value => value !== 'mean-wave-dir')) return null;
  return source;
}

function provenanceAt(item, component) {
  return verifiedDmiNativeSource(
    item?.provenance?.[sourceKey(component)],
    component,
    item?.step ?? item?.time,
  );
}

function sameNativeIdentity(before, after, component) {
  return Boolean(before && after
    && before.collection === after.collection
    && before.collectionFamily === after.collectionFamily
    && before.modelRun === after.modelRun
    && before.component === after.component
    && before.componentKind === after.componentKind
    && before.entityId === after.entityId
    && before.parentZoneId === after.parentZoneId
    && before.entityType === after.entityType
    && before.samplingContext === after.samplingContext
    && before.gridDefinitionSha256 === after.gridDefinitionSha256
    && before.spatialSelection === after.spatialSelection
    && before.spatialSemanticsVersion === after.spatialSemanticsVersion
    && before.vectorSelection === after.vectorSelection
    && before.vectorSemanticsVersion === after.vectorSemanticsVersion
    && exactStringArray(before.fieldSet, COMPONENT_FIELD_SET[component])
    && exactStringArray(after.fieldSet, COMPONENT_FIELD_SET[component])
    && samePoint(before.gridPoint, after.gridPoint)
    && samePoint(before.samplingPoint, after.samplingPoint)
    && Math.abs(before.distanceKm - after.distanceKm) <= 0.001
    && (component !== 'current' || (
      before.verticalLayer === after.verticalLayer
      && before.verticalLayerRankM === after.verticalLayerRankM
      && before.vectorSemanticsVersion === after.vectorSemanticsVersion
      && before.vectorSelection === after.vectorSelection
    ))
  );
}

const NATIVE_STEP_KEYS = new Set([
  'itemId', 'assetIdentitySha256', 'nativeValidTime', 'leadTimeHours',
  'acquiredAt', 'optionalFieldSet', 'itemCreatedAt', 'itemUpdatedAt',
]);

function matchesExpectedIdentity(source, expectedIdentity) {
  return Boolean(expectedIdentity
    && typeof expectedIdentity.entityId === 'string' && expectedIdentity.entityId
    && typeof expectedIdentity.parentZoneId === 'string' && expectedIdentity.parentZoneId
    && typeof expectedIdentity.entityType === 'string' && expectedIdentity.entityType
    && typeof expectedIdentity.samplingContext === 'string' && expectedIdentity.samplingContext
    && exactFinitePoint(expectedIdentity.samplingPoint)
    && source?.entityId === expectedIdentity.entityId
    && source?.parentZoneId === expectedIdentity.parentZoneId
    && source?.entityType === expectedIdentity.entityType
    && source?.samplingContext === expectedIdentity.samplingContext
    && samePoint(source?.samplingPoint, expectedIdentity.samplingPoint));
}

function reconstructNativeEndpoint(source, step) {
  const endpoint = {
    ...source,
    itemId: step.itemId,
    assetIdentitySha256: step.assetIdentitySha256,
    nativeValidTime: step.nativeValidTime,
    leadTimeHours: step.leadTimeHours,
    acquiredAt: step.acquiredAt,
    optionalFieldSet: step.optionalFieldSet,
  };
  for (const key of ['nativeValidTimes', 'nativeSteps', 'temporalResolution', 'forecastAgeHours']) delete endpoint[key];
  for (const key of ['itemCreatedAt', 'itemUpdatedAt']) {
    if (Object.hasOwn(step, key)) endpoint[key] = step[key];
    else delete endpoint[key];
  }
  return endpoint;
}

/**
 * Verify one derived/interpolated DMI source against an exact consumer entity.
 * Every declared native step is reconstructed and passed through the raw native
 * verifier; the derived row is accepted only for the store's bounded temporal
 * modes and one unchanged collection/entity/grid/run tuple.
 */
export function verifiedDmiForecastSource(source, component, rowTime, expectedIdentity) {
  const rowMs = explicitTimestampMs(rowTime);
  const runMs = explicitTimestampMs(source?.modelRun);
  if (!Number.isFinite(rowMs) || !Number.isFinite(runMs) || runMs > rowMs
    || !matchesExpectedIdentity(source, expectedIdentity)
    || typeof source?.leadTimeHours !== 'number' || !Number.isFinite(source.leadTimeHours)
    || Math.abs(source.leadTimeHours - (rowMs - runMs) / 3600000) > 0.02
    || !Array.isArray(source?.nativeValidTimes)
    || !Array.isArray(source?.nativeSteps)
    || source.nativeValidTimes.length < 1
    || source.nativeValidTimes.length !== source.nativeSteps.length) return null;

  const nativeTimes = source.nativeValidTimes.map(explicitTimestampMs);
  if (nativeTimes.some(value => !Number.isFinite(value))
    || new Set(nativeTimes).size !== nativeTimes.length
    || nativeTimes.some((value, index) => index > 0 && value <= nativeTimes[index - 1])) return null;
  const resolution = String(source.temporalResolution ?? '').toLowerCase();
  const temporalValid = resolution === 'native' || resolution === 'exact'
    ? nativeTimes.length === 1 && nativeTimes[0] === rowMs
    : resolution === 'interpolated'
      ? nativeTimes.length === 2 && nativeTimes[0] < rowMs && rowMs < nativeTimes[1]
        && nativeTimes[1] - nativeTimes[0] <= 4 * 3600000
      : resolution === 'nearest-edge'
        ? nativeTimes.length === 1 && Math.abs(nativeTimes[0] - rowMs) <= 95 * 60000
        : false;
  if (!temporalValid) return null;

  const endpoints = [];
  for (let index = 0; index < source.nativeSteps.length; index += 1) {
    const step = source.nativeSteps[index];
    if (!step || typeof step !== 'object' || Array.isArray(step)
      || Object.keys(step).some(key => !NATIVE_STEP_KEYS.has(key))
      || step.nativeValidTime !== source.nativeValidTimes[index]) return null;
    const endpoint = reconstructNativeEndpoint(source, step);
    const verified = verifiedDmiNativeSource(endpoint, component, step.nativeValidTime);
    if (!verified) return null;
    endpoints.push(verified);
  }
  if (endpoints.slice(1).some(endpoint => !sameNativeIdentity(endpoints[0], endpoint, component))) return null;

  const selectedStep = source.nativeSteps.find(step => (
    step.itemId === source.itemId
    && step.assetIdentitySha256 === source.assetIdentitySha256
    && step.nativeValidTime === source.nativeValidTime
    && step.acquiredAt === source.acquiredAt
    && (step.itemCreatedAt ?? null) === (source.itemCreatedAt ?? null)
    && (step.itemUpdatedAt ?? null) === (source.itemUpdatedAt ?? null)
  ));
  if (!selectedStep) return null;
  const expectedOptional = component === 'wave'
    && endpoints.every(endpoint => endpoint.optionalFieldSet.includes('mean-wave-dir'))
    ? ['mean-wave-dir']
    : [];
  if (!exactStringArray(source.optionalFieldSet, expectedOptional)) return null;
  return source;
}

function sameNativeSeries(bracket, component) {
  if (!bracket || bracket.before === bracket.after) return true;
  const before = provenanceAt(bracket.before, component);
  const after = provenanceAt(bracket.after, component);
  return sameNativeIdentity(before, after, component);
}

function componentBracket(items, targetMs, component, options) {
  const bracket = timeBracket(items, targetMs, options);
  return sameNativeSeries(bracket, component) ? bracket : null;
}

function componentSource(bracket, component, targetMs, generatedAt) {
  if (!bracket) return null;
  const before = provenanceAt(bracket.before, component);
  const after = provenanceAt(bracket.after, component);
  const selected = before ?? after;
  if (!selected) return null;
  const modelRunMs = Date.parse(selected.modelRun);
  const generatedMs = Date.parse(generatedAt);
  const nativeValidTimes = [...new Set([before?.nativeValidTime, after?.nativeValidTime].filter(Boolean))];
  const nativeSteps = [before, after]
    .filter(Boolean)
    .filter((value, index, all) => all.findIndex(candidate => candidate.nativeValidTime === value.nativeValidTime && candidate.itemId === value.itemId) === index)
    .map(source => ({
      itemId: source.itemId,
      assetIdentitySha256: source.assetIdentitySha256,
      nativeValidTime: source.nativeValidTime,
      leadTimeHours: source.leadTimeHours,
      acquiredAt: source.acquiredAt,
      optionalFieldSet: [...source.optionalFieldSet],
      ...(source.itemCreatedAt ? { itemCreatedAt: source.itemCreatedAt } : {}),
      ...(source.itemUpdatedAt ? { itemUpdatedAt: source.itemUpdatedAt } : {})
    }));
  const optionalFieldSet = component === 'wave'
    && [before, after].filter(Boolean).every(source => source.optionalFieldSet.includes('mean-wave-dir'))
    ? ['mean-wave-dir']
    : [];
  return {
    ...selected,
    optionalFieldSet,
    leadTimeHours: Number.isFinite(modelRunMs) ? round((targetMs - modelRunMs) / 3600000, 2) : null,
    forecastAgeHours: Number.isFinite(modelRunMs) && Number.isFinite(generatedMs) ? round((generatedMs - modelRunMs) / 3600000, 2) : null,
    temporalResolution: bracket.mode === 'exact' ? 'native' : bracket.mode,
    nativeValidTimes,
    nativeSteps,
    fallback: false,
  };
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
  // An equally weighted antipodal pair has no defined circular mean. Do not
  // turn floating-point residue into an arbitrary physical direction.
  if (Math.hypot(u, v) < 1e-9) return null;
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

export function buildDmiForecastHourly({ wind = [], windTail = [], waves = [], ocean = [], observedWaterLevel = null, generatedAt, startAt = generatedAt, hours = DMI_FORECAST_HOURS, sourceCadenceMinutes = 180 } = {}) {
  const canonicalStart = canonicalForecastHour(startAt, { ceil: true });
  const start = Date.parse(canonicalStart);
  if (!Number.isFinite(start)) throw new Error('generatedAt must be a valid date');
  const cadenceMs = Math.max(60, Number(sourceCadenceMinutes) || 180) * 60000;
  const bracketOptions = { maxGapMs: Math.max(4 * 3600000, cadenceMs + 15 * 60000), edgeToleranceMs: Math.min(95 * 60000, cadenceMs / 2 + 5 * 60000) };
  const currentOceanBracket = componentBracket(ocean, start, 'waterLevel', bracketOptions);
  const modelCurrentSea = interpolateScalar(currentOceanBracket, 'sea-mean-deviation');
  const modelCurrentCm = modelCurrentSea === null ? null : modelCurrentSea * 100;
  const observationCm = finite(observedWaterLevel?.valueCm);
  const observationDifferenceCm = observationCm !== null && modelCurrentCm !== null ? observationCm - modelCurrentCm : null;

  const hourly = [];
  for (let index = 0; index < hours; index += 1) {
    const validMs = start + index * 3600000;
    const windBracket = componentBracket(wind, validMs, 'wind', bracketOptions);
    const windTailBracket = componentBracket(windTail, validMs, 'windTail', bracketOptions);
    const waveBracket = componentBracket(waves, validMs, 'wave', bracketOptions);
    const currentBracket = componentBracket(ocean, validMs, 'current', bracketOptions);
    const waterLevelBracket = componentBracket(ocean, validMs, 'waterLevel', bracketOptions);
    const waterLevel3Bracket = componentBracket(ocean, validMs + 3 * 3600000, 'waterLevel', bracketOptions);
    const waterTemperatureBracket = componentBracket(ocean, validMs, 'waterTemperature', bracketOptions);
    const windVector = interpolateSpeedDirection(windBracket, 'wind-speed-10m', 'wind-dir-10m', { from: true });
    const windTailVector = interpolateSpeedDirection(windTailBracket, 'wind-speed-10m', 'wind-dir-10m', { from: true });
    const primaryWindAvailable = windVector.speed !== null && windVector.direction !== null;
    const selectedWind = primaryWindAvailable ? windVector : windTailVector;
    const windSource = primaryWindAvailable ? 'harmonie_dini_sf' : (windTailVector.speed !== null && windTailVector.direction !== null ? 'dkss' : null);
    const waveHeight = interpolateScalar(waveBracket, 'significant-wave-height');
    const wavePeriod = interpolateScalar(waveBracket, 'dominant-wave-period');
    const waveDirectionBracket = waveBracket && [waveBracket.before, waveBracket.after]
      .every((item, index, all) => index > 0 && item === all[index - 1]
        || provenanceAt(item, 'wave')?.optionalFieldSet?.includes('mean-wave-dir'))
      ? waveBracket
      : null;
    const waveDirection = interpolateDirection(waveDirectionBracket, 'mean-wave-dir');
    const u = interpolateScalar(currentBracket, 'current-u');
    const v = interpolateScalar(currentBracket, 'current-v');
    const sea = interpolateScalar(waterLevelBracket, 'sea-mean-deviation');
    const waterLevelTrendCompatible = waterLevelBracket && waterLevel3Bracket && sameNativeIdentity(
      provenanceAt(waterLevelBracket.before, 'waterLevel') ?? provenanceAt(waterLevelBracket.after, 'waterLevel'),
      provenanceAt(waterLevel3Bracket.before, 'waterLevel') ?? provenanceAt(waterLevel3Bracket.after, 'waterLevel'),
      'waterLevel'
    );
    const sea3 = waterLevelTrendCompatible ? interpolateScalar(waterLevel3Bracket, 'sea-mean-deviation') : null;
    const selectedWindComponent = primaryWindAvailable ? 'wind' : 'windTail';
    const windProvenance = componentSource(primaryWindAvailable ? windBracket : windTailBracket, selectedWindComponent, validMs, generatedAt);
    const waveProvenance = componentSource(waveBracket, 'wave', validMs, generatedAt);
    const currentProvenance = componentSource(currentBracket, 'current', validMs, generatedAt);
    const waterLevelProvenance = componentSource(waterLevelBracket, 'waterLevel', validMs, generatedAt);
    const waterTemperatureProvenance = componentSource(waterTemperatureBracket, 'waterTemperature', validMs, generatedAt);
    hourly.push({
      time: new Date(validMs).toISOString(),
      windSpeedMps: round(selectedWind.speed, 1),
      windDirectionDeg: round(selectedWind.direction, 0),
      waveHeightM: round(waveHeight, 2),
      waveDirectionDeg: round(waveDirection, 0),
      wavePeriodS: round(wavePeriod, 1),
      waterLevelCm: sea === null ? null : round(sea * 100, 0),
      waterLevelModelCm: sea === null ? null : round(sea * 100, 0),
      waterLevelBiasCm: 0,
      waterLevelObservationDifferenceCm: sea === null ? null : round(observationDifferenceCm, 0),
      waterLevelTrendCm3h: sea === null || sea3 === null ? null : round((sea3 - sea) * 100, 0),
      currentUMps: round(u, 5),
      currentVMps: round(v, 5),
      currentSpeedMps: u === null || v === null ? null : round(Math.hypot(u, v), 2),
      currentDirectionDeg: round(uvToTowardDirectionDeg(u, v), 0),
      waterTemperatureC: round(interpolateScalar(waterTemperatureBracket, 'water-temperature'), 1),
      temporalResolution: currentBracket?.mode ?? waterLevelBracket?.mode ?? (primaryWindAvailable ? windBracket?.mode : windTailBracket?.mode) ?? waveBracket?.mode ?? null,
      source: 'dmi-forecast',
      sources: {
        wind: windSource && windProvenance ? windProvenance : { provider: 'missing', collection: null, fallback: false },
        wave: waveHeight !== null && wavePeriod !== null && waveProvenance ? waveProvenance : { provider: 'missing', fallback: false },
        current: u !== null && v !== null && currentProvenance ? currentProvenance : { provider: 'missing', fallback: false },
        waterLevel: sea !== null && waterLevelProvenance ? waterLevelProvenance : { provider: 'missing', fallback: false },
        waterTemperature: interpolateScalar(waterTemperatureBracket, 'water-temperature') !== null && waterTemperatureProvenance ? waterTemperatureProvenance : { provider: 'missing', fallback: false }
      },
      waterLevelSource: 'dmi-model-authoritative'
    });
  }
  return { hourly, waterLevelBiasCm: 0, observationDifferenceCm: round(observationDifferenceCm, 0), interpolation: { method: 'linear-within-model-steps', modelBoundaryInterpolation: false, windPriority: ['harmonie_dini_sf', 'dkss'], vectorInterpolation: ['wind', 'wave-direction', 'current'], sourceCadenceMinutes: Number(sourceCadenceMinutes) || 180 } };
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
