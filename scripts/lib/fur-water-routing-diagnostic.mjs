import crypto from 'node:crypto';

export const FUR_WATER_ROUTING_PART_ID = 'dk-b05-17-national-part-04';
const ZONE_ID = 'DK-B05-17';
const KIND = 'PRIVATE_FUR_WATER_ROUTING_DIAGNOSTIC';
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const finite = value => typeof value === 'number' && Number.isFinite(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => object(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const hour = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value && Date.parse(value) % 3_600_000 === 0;
const instant = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;
const FORECAST_HOURS = 118;
const TRACE_KEYS = ['partId', 'zoneId', 'contextSha256', 'configurationSha256',
  'selectionSha256', 'selectedSourceIdentitiesSha256', 'previousDiagnosticDatasetId', 'hours'];
const ROW_KEYS = ['directPartValuePresent', 'selectedSourceCount',
  'verifiedSelectedSourceCount', 'permittedSelectedSourceCount', 'routedValuePresent',
  'outputValuePresent', 'previousSourceSetAvailable'];
const ROOT_KEYS = ['schemaVersion', 'kind', 'privacyClass', 'datasetId',
  'productionReferenceAt', 'generatedAt', 'trace'];

export function validFurWaterRoutingDiagnostic(value, { datasetId } = {}) {
  if (!exactKeys(value, ROOT_KEYS) || value.schemaVersion !== 1 || value.kind !== KIND
    || value.privacyClass !== 'PRIVATE_PRODUCTION_RUNTIME'
    || typeof value.datasetId !== 'string' || !/^rr-[A-Za-z0-9._-]+$/.test(value.datasetId)
    || (datasetId !== undefined && value.datasetId !== datasetId)
    || !hour(value.productionReferenceAt)
    || !instant(value.generatedAt) || value.generatedAt < value.productionReferenceAt) return false;
  const trace = value.trace;
  if (!exactKeys(trace, TRACE_KEYS) || trace.partId !== FUR_WATER_ROUTING_PART_ID
    || trace.zoneId !== ZONE_ID || !sha(trace.contextSha256)
    || !sha(trace.configurationSha256) || !sha(trace.selectionSha256)
    || !Array.isArray(trace.selectedSourceIdentitiesSha256)
    || trace.selectedSourceIdentitiesSha256.length > 16
    || !trace.selectedSourceIdentitiesSha256.every(sha)
    || new Set(trace.selectedSourceIdentitiesSha256).size !== trace.selectedSourceIdentitiesSha256.length
    || !(trace.previousDiagnosticDatasetId === null
      || typeof trace.previousDiagnosticDatasetId === 'string'
        && /^rr-[A-Za-z0-9._-]+$/.test(trace.previousDiagnosticDatasetId))
    || !object(trace.hours) || Object.keys(trace.hours).length > FORECAST_HOURS) return false;
  return Object.entries(trace.hours).every(([time, row]) => hour(time)
    && time >= value.productionReferenceAt
    && Date.parse(time) < Date.parse(value.productionReferenceAt) + FORECAST_HOURS * 3_600_000
    && exactKeys(row, ROW_KEYS)
    && ['directPartValuePresent', 'routedValuePresent', 'outputValuePresent']
      .every(key => typeof row[key] === 'boolean')
    && ['selectedSourceCount', 'verifiedSelectedSourceCount', 'permittedSelectedSourceCount']
      .every(key => Number.isSafeInteger(row[key]) && row[key] >= 0 && row[key] <= 16)
    && row.selectedSourceCount === trace.selectedSourceIdentitiesSha256.length
    && row.permittedSelectedSourceCount <= row.verifiedSelectedSourceCount
    && row.verifiedSelectedSourceCount <= row.selectedSourceCount
    && (row.previousSourceSetAvailable === null || typeof row.previousSourceSetAvailable === 'boolean'));
}

// All inputs are the actual NORMAL routing caller's verified maps/selection.
// No private values, coordinates, source IDs or registry/config payload survive.
export function captureFurWaterRoutingDiagnostic({
  part, parentFeature, directHourly, routedHourly, sources, rows, method,
  routing, sourceMaps, verifiedRecordsByKey, collectionAllowed, previousDiagnostic, productionReferenceAt,
} = {}) {
  const zoneId = part?.sourceZoneId ?? part?.parentZoneId ?? part?.zoneId;
  if (part?.partId !== FUR_WATER_ROUTING_PART_ID || zoneId !== ZONE_ID
    || !hour(productionReferenceAt) || !Array.isArray(rows) || rows.length > 16
    || !Array.isArray(directHourly) || !Array.isArray(routedHourly)
    || !Array.isArray(sources) || !Array.isArray(sourceMaps) || sourceMaps.length !== rows.length
    || !(verifiedRecordsByKey instanceof Map) || typeof collectionAllowed !== 'function') return null;
  const contextSha256 = hash([part.partId, zoneId, part.waterPoint, part.landPoint,
    parentFeature?.properties?.coastLine, parentFeature?.properties?.onshoreDirectionDeg]);
  const sourceKey = source => String(source?.sourceKey ?? source?.stationId ?? '');
  const selectedSourceIdentitiesSha256 = rows.map(source => hash([sourceKey(source), source.point]));
  if (new Set(selectedSourceIdentitiesSha256).size !== selectedSourceIdentitiesSha256.length) return null;
  const previous = validFurWaterRoutingDiagnostic(previousDiagnostic)
    && previousDiagnostic.trace.contextSha256 === contextSha256
    ? previousDiagnostic : null;
  const previousMaps = previous ? previous.trace.selectedSourceIdentitiesSha256.map(identityHash => {
    const found = [...verifiedRecordsByKey].find(([key, record]) => hash([key, record.point]) === identityHash);
    return found === undefined ? null : found[1].rows;
  }) : [];
  const registry = sources.map(source => [sourceKey(source), String(source.stationId ?? ''),
    source.sourceType ?? null, source.point ?? null]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  const trace = {
    partId: part.partId, zoneId, contextSha256,
    configurationSha256: hash([routing?.zones?.[zoneId] ?? null, registry]),
    selectionSha256: hash([method ?? null, rows.map(source =>
      [sourceKey(source), source.weight, source.point])]),
    selectedSourceIdentitiesSha256,
    previousDiagnosticDatasetId: previous?.datasetId ?? null,
    hours: {},
  };
  directHourly.forEach((direct, index) => {
    if (!hour(direct?.time) || direct.time < productionReferenceAt
      || Date.parse(direct.time) >= Date.parse(productionReferenceAt) + FORECAST_HOURS * 3_600_000) return;
    const selected = sourceMaps.map(map => map.get(direct.time));
    const verified = selected.filter(row => row && finite(row.waterLevelCm));
    const permitted = verified.filter(row => collectionAllowed(row.sources?.waterLevel?.collection, zoneId));
    const routed = rows.length > 0 && verified.length === rows.length && permitted.length === rows.length;
    trace.hours[direct.time] = {
      directPartValuePresent: finite(direct.waterLevelCm),
      selectedSourceCount: rows.length,
      verifiedSelectedSourceCount: verified.length,
      permittedSelectedSourceCount: permitted.length,
      routedValuePresent: routed,
      outputValuePresent: finite(routedHourly[index]?.waterLevelCm),
      previousSourceSetAvailable: previousMaps.length === 0 ? null
        : previousMaps.every(map => {
          const oldSource = map?.get(direct.time);
          return oldSource && finite(oldSource.waterLevelCm)
            && collectionAllowed(oldSource.sources?.waterLevel?.collection, zoneId);
        }),
    };
  });
  return trace;
}

export function buildFurWaterRoutingDiagnostic(trace, conditions) {
  if (trace === null) return null;
  const result = { schemaVersion: 1, kind: KIND, privacyClass: 'PRIVATE_PRODUCTION_RUNTIME',
    datasetId: conditions.datasetId, productionReferenceAt: conditions.productionReferenceAt,
    generatedAt: conditions.generatedAt, trace };
  return validFurWaterRoutingDiagnostic(result) ? result : null;
}

export const FUR_DIAGNOSIS_CODES = Object.freeze([
  'TRACE_NOT_RECORDED', 'TRACE_IDENTITY_OR_FORMAT_INVALID', 'CONTEXT_CHANGED',
  'PREVIOUS_TRACE_DOES_NOT_EXPLAIN_BASELINE', 'CURRENT_OUTPUT_PRESENT_PUBLIC_MISSING',
  'DIRECT_PART_PRESENT_NOT_RETAINED', 'SELECTED_SOURCE_NOT_PERMITTED',
  'ROUTE_CHANGED_PREVIOUS_SOURCES_STILL_PRESENT',
  'ROUTE_CHANGED_PREVIOUS_SOURCES_NOT_PRESENT',
  'DIRECT_PART_AND_SELECTED_SOURCE_ABSENT', 'NOT_DETERMINED',
]);

export function classifyFurWaterLevelLoss({ previousConditions, currentConditions, time }) {
  const before = previousConditions?.furWaterRoutingDiagnostic;
  const after = currentConditions?.furWaterRoutingDiagnostic;
  if (!before || !after) return 'TRACE_NOT_RECORDED';
  if (!validFurWaterRoutingDiagnostic(before, { datasetId: previousConditions.datasetId })
    || !validFurWaterRoutingDiagnostic(after, { datasetId: currentConditions.datasetId })
    || before.productionReferenceAt !== previousConditions.productionReferenceAt
    || after.productionReferenceAt !== currentConditions.productionReferenceAt
    || before.generatedAt !== previousConditions.generatedAt
    || after.generatedAt !== currentConditions.generatedAt
    || !before.trace.hours[time] || !after.trace.hours[time]) return 'TRACE_IDENTITY_OR_FORMAT_INVALID';
  if (before.trace.contextSha256 !== after.trace.contextSha256) return 'CONTEXT_CHANGED';
  const old = before.trace.hours[time], current = after.trace.hours[time];
  if (!old.outputValuePresent) return 'PREVIOUS_TRACE_DOES_NOT_EXPLAIN_BASELINE';
  if (current.outputValuePresent) return 'CURRENT_OUTPUT_PRESENT_PUBLIC_MISSING';
  if (current.directPartValuePresent) return 'DIRECT_PART_PRESENT_NOT_RETAINED';
  if (current.verifiedSelectedSourceCount > current.permittedSelectedSourceCount)
    return 'SELECTED_SOURCE_NOT_PERMITTED';
  if (before.trace.selectionSha256 !== after.trace.selectionSha256
    && after.trace.previousDiagnosticDatasetId === before.datasetId
    && current.previousSourceSetAvailable !== null) return current.previousSourceSetAvailable
    ? 'ROUTE_CHANGED_PREVIOUS_SOURCES_STILL_PRESENT'
    : 'ROUTE_CHANGED_PREVIOUS_SOURCES_NOT_PRESENT';
  if (current.verifiedSelectedSourceCount < current.selectedSourceCount
    || current.selectedSourceCount === 0) return 'DIRECT_PART_AND_SELECTED_SOURCE_ABSENT';
  return 'NOT_DETERMINED';
}
