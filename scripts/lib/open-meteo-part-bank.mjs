import { createHash } from 'node:crypto';
import { buildOpenMeteoHourlyComponents, openMeteoUtcTime } from './open-meteo-hourly-components.mjs';
import { openMeteoO1280GridMatches } from './open-meteo-o1280-grid.mjs';

// Private, response-bound PART input. These are native provider candidates,
// not permission to overwrite DMI. Water level is an exclusively DMI field.
export const OPEN_METEO_PART_BANK_KIND = 'RAVRADAR_PRIVATE_OPEN_METEO_PART_COMPONENT_BANK';
export const OPEN_METEO_PART_COMPONENTS = Object.freeze(['wind', 'wave', 'waterTemperature']);
export const OPEN_METEO_PART_RESPONSE_MAX_BYTES = 16 * 1024 * 1024;
export const OPEN_METEO_PART_BANK_MAX_BYTES = 256 * 1024 * 1024;
const HOUR = 3_600_000;
export const OPEN_METEO_SOURCE_CONTRACT_REVISION = 'e669e6293ce2f0c70646fd61af8fe0c529fc0c53';
export const OPEN_METEO_COMPONENT_MODELS = Object.freeze({
  wind: 'ecmwf_ifs025', wave: 'ecmwf_wam025',
  waterTemperature: 'meteofrance_currents',
});
// The 025 mapping above is the preserved v2 request contract, not the normal
// native policy. Existing distance-qualified callers keep their original proof.
export const OPEN_METEO_NATIVE_NEAREST_POLICIES = Object.freeze({
  wind: Object.freeze({ policyId: 'open-meteo-ifs-o1280-native-nearest-v1', kind: 'native-nearest',
    model: 'ecmwf_ifs', grid: 'open-meteo-o1280', cellSelection: 'nearest', sourceRevision: OPEN_METEO_SOURCE_CONTRACT_REVISION }),
  wave: Object.freeze({ policyId: 'open-meteo-wam-o1280-native-nearest-v1', kind: 'native-nearest',
    model: 'ecmwf_wam', grid: 'open-meteo-o1280', cellSelection: 'nearest', sourceRevision: OPEN_METEO_SOURCE_CONTRACT_REVISION }),
  waterTemperature: Object.freeze({ policyId: 'open-meteo-sst-mf-native-nearest-v1', kind: 'native-nearest',
    model: 'meteofrance_currents', grid: 'open-meteo-mf-1-12', cellSelection: 'nearest', sourceRevision: OPEN_METEO_SOURCE_CONTRACT_REVISION }),
  waterLevel: Object.freeze({ policyId: 'water-level-dmi-only-v1', kind: 'not-admitted' }),
});
const ENDPOINTS = Object.freeze({ weather: 'https://api.open-meteo.com/v1/forecast', marine: 'https://marine-api.open-meteo.com/v1/marine' });
const FIELDS = Object.freeze({
  wind: ['wind_speed_10m', 'wind_direction_10m'],
  wave: ['wave_height', 'wave_peak_period', 'wave_direction'],
  waterTemperature: ['sea_surface_temperature'],
});
const checkedIndexes = new WeakMap();
const finite = value => typeof value === 'number' && Number.isFinite(value);
const fail = code => { throw new Error(code); };
const stable = value => JSON.stringify(value, function (_key, item) {
  return item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item;
});
export const openMeteoPartSha256 = value => createHash('sha256').update(typeof value === 'string' ? value : stable(value)).digest('hex');
const same = (a, b) => stable(a) === stable(b);
const point = value => Array.isArray(value) && value.length === 2 && value.every(finite)
  && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
const exactHour = value => openMeteoUtcTime(value) === value;
const exactInstant = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;
const keyOf = (identity, time, component) => stable([identity, time, component]);
const storedRecord = record => ({ recordId: record.recordId, partId: record.partId,
  validTime: record.validTime, component: record.component, values: record.values,
  evidenceId: record.source.evidenceId });

export function openMeteoPartIdentity(part) {
  const parentZoneId = part?.zoneId ?? part?.sourceZoneId;
  if (typeof part?.partId !== 'string' || !part.partId.trim() || part.partId !== part.partId.trim()
    || typeof parentZoneId !== 'string' || !parentZoneId || !point(part?.waterPoint)) {
    fail('OPEN_METEO_PART_IDENTITY_INVALID');
  }
  return { entityId: `PART::${part.partId}`, parentZoneId, entityType: 'coastal-part',
    samplingContext: 'coastal-part-water-point', samplingPoint: [...part.waterPoint] };
}

function checkedPolicies(policies) {
  const result = {};
  for (const component of OPEN_METEO_PART_COMPONENTS) {
    const policy = policies?.[component];
    if (policy?.kind !== undefined) {
      if (!same(policy, OPEN_METEO_NATIVE_NEAREST_POLICIES[component])) fail('OPEN_METEO_PART_NATIVE_POLICY_INVALID');
      result[component] = structuredClone(policy);
      continue;
    }
    if (typeof policy?.policyId !== 'string' || !policy.policyId
      || !finite(policy.maximumDistanceKm) || policy.maximumDistanceKm < 0) {
      fail('OPEN_METEO_PART_SPATIAL_POLICY_REQUIRED');
    }
    result[component] = { policyId: policy.policyId, maximumDistanceKm: policy.maximumDistanceKm };
    if (policy.cellSelection !== undefined) result[component].cellSelection = policy.cellSelection;
  }
  return result;
}

function distanceKm(a, b) {
  const radians = n => n * Math.PI / 180;
  const dl = radians(b[0] - a[0]);
  const dp = radians(b[1] - a[1]);
  const term = Math.sin(dp / 2) ** 2 + Math.cos(radians(a[1])) * Math.cos(radians(b[1])) * Math.sin(dl / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(term), Math.sqrt(Math.max(0, 1 - term)));
}

// A combined best_match response does not identify the grid/model of each
// variable. Keep atomic tuples on one explicitly selected model. SST is the
// supplemental MF SST reader, not the MF currents model itself; both share a
// native grid but have different masks, so SST requires explicit nearest mode.
// See docs/ai/OPEN_METEO_COMPONENT_SOURCE_CONTRACT_2026-09-19.md.
export function openMeteoComponentRequestParts(component, { cellSelection, spatialPolicy } = {}) {
  if (component === 'waterLevel') fail('OPEN_METEO_WATER_LEVEL_DMI_ONLY');
  if (!OPEN_METEO_PART_COMPONENTS.includes(component)) fail('OPEN_METEO_PART_COMPONENT_INVALID');
  let model = OPEN_METEO_COMPONENT_MODELS[component];
  if (spatialPolicy?.kind !== undefined) {
    if (!same(spatialPolicy, OPEN_METEO_NATIVE_NEAREST_POLICIES[component])) fail('OPEN_METEO_PART_NATIVE_POLICY_INVALID');
    if (spatialPolicy.kind === 'not-admitted') fail('OPEN_METEO_PART_COMPONENT_NOT_ADMITTED');
    if (cellSelection !== undefined && cellSelection !== 'nearest') fail('OPEN_METEO_PART_CELL_SELECTION_INVALID');
    cellSelection = 'nearest';
    model = spatialPolicy.model;
  } else if (component === 'waterTemperature') {
    if (cellSelection !== 'nearest') fail('OPEN_METEO_SST_EXPLICIT_NEAREST_POLICY_REQUIRED');
  } else if (cellSelection !== undefined && cellSelection !== 'sea') {
    fail('OPEN_METEO_PART_CELL_SELECTION_INVALID');
  }
  const channel = component === 'wind' ? 'weather' : 'marine';
  return { channel, endpoint: ENDPOINTS[channel], query: {
    hourly: FIELDS[component].join(','), timezone: 'GMT', wind_speed_unit: 'ms',
    cell_selection: cellSelection ?? 'sea', models: model,
  } };
}

// Reproduce the pinned upstream Float32 regular-grid selection, not a new
// RavRadar geometry or proximity policy. nearest never moves to a masked
// neighbour: a masked/no-data center must remain missing.
export function openMeteoMfNearestGridPoint(samplingPoint) {
  if (!point(samplingPoint)) fail('OPEN_METEO_PART_IDENTITY_INVALID');
  const f = Math.fround;
  const dx = f(1 / 12);
  const lonMin = f(-180 + f(1 / 24));
  const latMin = f(-80 + f(1 / 24));
  let x = Math.round(f(f(f(samplingPoint[0]) - lonMin) / dx));
  const y = Math.round(f(f(f(samplingPoint[1]) - latMin) / dx));
  if (x === -1) x = 0;
  else if (x === 4320 || x === 4321) x = 4319;
  if (x < 0 || x >= 4320 || y < 0 || y >= 2041) return null;
  return [f(lonMin + f(x * dx)), f(latMin + f(y * dx))];
}

export function openMeteoSstGridMatches(samplingPoint, gridPoint) {
  const expected = openMeteoMfNearestGridPoint(samplingPoint);
  // Upstream writes the Float's round-trip decimal representation. Compare in
  // that same precision, not with an invented distance/coordinate tolerance.
  return expected !== null && point(gridPoint)
    && gridPoint.every((value, index) => Math.fround(value) === expected[index]);
}

// Shared with the legacy parent-zone caller; this never creates a PART identity.
export function openMeteoComponentGridMatches(component, samplingPoint, gridPoint, spatialPolicy) {
  if (!same(spatialPolicy, OPEN_METEO_NATIVE_NEAREST_POLICIES[component])
    || spatialPolicy?.kind !== 'native-nearest') return false;
  return spatialPolicy.grid === 'open-meteo-o1280'
    ? openMeteoO1280GridMatches(samplingPoint, gridPoint) : openMeteoSstGridMatches(samplingPoint, gridPoint);
}

export function buildOpenMeteoPartRequest(part, { component, cellSelection, productionReferenceAt, spatialPolicy } = {}) {
  const identity = openMeteoPartIdentity(part);
  if (!exactHour(productionReferenceAt)) fail('OPEN_METEO_PART_REQUEST_INVALID');
  const { channel, endpoint, query: componentQuery } = openMeteoComponentRequestParts(component, { cellSelection, spatialPolicy });
  const endAt = new Date(Date.parse(productionReferenceAt) + 120 * HOUR).toISOString();
  // Explicit UTC bounds include H118..H120 support; never depend on today's
  // midnight or the producer's wall clock to identify the forecast window.
  const query = {
    latitude: String(identity.samplingPoint[1]), longitude: String(identity.samplingPoint[0]),
    ...componentQuery,
    start_hour: productionReferenceAt.slice(0, 16), end_hour: endAt.slice(0, 16),
  };
  const native = spatialPolicy?.kind === 'native-nearest';
  const request = { contractId: native ? 'open-meteo-part-component-request-v3' : 'open-meteo-part-component-request-v2', identity,
    component, cellSelection: query.cell_selection, channel, productionReferenceAt, endAt, endpoint, query,
    ...(native ? { spatialPolicy: structuredClone(spatialPolicy) } : {}) };
  return { ...request, requestSha256: openMeteoPartSha256(request) };
}

function validateRequest(request, part) {
  const expected = buildOpenMeteoPartRequest(part, request);
  if (!same(expected, request)) fail('OPEN_METEO_PART_REQUEST_BINDING_INVALID');
}

function componentValues(row, component) {
  if (component === 'wind') return finite(row.windSpeedMps) && finite(row.windDirectionDeg)
    ? { windSpeedMps: row.windSpeedMps, windDirectionDeg: row.windDirectionDeg } : null;
  if (component === 'wave') return finite(row.waveHeightM) && finite(row.wavePeriodS)
    && (row.waveHeightM === 0 || finite(row.waveDirectionDeg))
    ? { waveHeightM: row.waveHeightM, wavePeriodS: row.wavePeriodS, waveDirectionDeg: row.waveDirectionDeg } : null;
  return finite(row.waterTemperatureC) ? { waterTemperatureC: row.waterTemperatureC } : null;
}

export function readOpenMeteoPartResponse({ request, responseText, acquiredAt }, {
  part, spatialPolicies, onInvalid = () => {},
} = {}) {
  validateRequest(request, part);
  const policies = checkedPolicies(spatialPolicies);
  if (!exactInstant(acquiredAt) || typeof responseText !== 'string'
    || Buffer.byteLength(responseText) > OPEN_METEO_PART_RESPONSE_MAX_BYTES) fail('OPEN_METEO_PART_RESPONSE_INVALID');
  let document;
  try { document = JSON.parse(responseText); } catch { fail('OPEN_METEO_PART_RESPONSE_INVALID'); }
  const gridPoint = [document?.longitude, document?.latitude];
  if (!point(gridPoint) || document?.utc_offset_seconds !== 0) fail('OPEN_METEO_PART_RESPONSE_LOCATION_OR_TIME_INVALID');
  const policy = policies[request.component];
  if (policy.kind === 'not-admitted') fail('OPEN_METEO_PART_COMPONENT_NOT_ADMITTED');
  const native = request.contractId === 'open-meteo-part-component-request-v3';
  if (native !== (policy.kind === 'native-nearest')) fail('OPEN_METEO_PART_POLICY_CONTRACT_MISMATCH');
  if (native) {
    if (!same(request.spatialPolicy, policy)) fail('OPEN_METEO_PART_POLICY_CONTRACT_MISMATCH');
    if (!openMeteoComponentGridMatches(request.component, request.identity.samplingPoint, gridPoint, policy)) {
      fail('OPEN_METEO_PART_NATIVE_RESPONSE_GRID_MISMATCH');
    }
  } else if (request.component === 'waterTemperature') {
    if (policies.waterTemperature.cellSelection !== 'nearest') fail('OPEN_METEO_SST_EXPLICIT_NEAREST_POLICY_REQUIRED');
    if (!openMeteoSstGridMatches(request.identity.samplingPoint, gridPoint)) fail('OPEN_METEO_SST_RESPONSE_GRID_MISMATCH');
  }
  const sourceResponseSha256 = openMeteoPartSha256(responseText);
  const evidence = { request, responseText, acquiredAt };
  const evidenceId = openMeteoPartSha256(evidence);
  const distance = distanceKm(request.identity.samplingPoint, gridPoint);
  const rows = buildOpenMeteoHourlyComponents(request.channel === 'weather' ? document : null,
    request.channel === 'marine' ? document : null,
    { onInvalidField: (field, code) => { if (FIELDS[request.component].includes(field)) onInvalid(code); } });
  const records = [];
  for (const row of rows) {
    if (row.time < request.productionReferenceAt || row.time > request.endAt) continue;
    for (const component of [request.component]) {
      const values = componentValues(row, component);
      if (!values) continue;
      if (!native && distance > policies[component].maximumDistanceKm) {
        onInvalid('OPEN_METEO_PART_RESPONSE_DISTANCE_EXCEEDED');
        continue;
      }
      const source = { provider: 'open-meteo', fallback: true, ...request.identity,
        component, validTime: row.time, acquiredAt, gridPoint, distanceKm: distance,
        spatialPolicy: policies[component], spatialSelection: request.cellSelection === 'nearest'
          ? 'provider-nearest-native-center' : 'provider-sea-cell',
        requestSha256: request.requestSha256, sourceResponseSha256, evidenceId,
        model: component === 'waterTemperature' ? 'meteofrance_sea_surface_temperature' : request.query.models,
        modelRun: null, modelReference: null, requestedModel: request.query.models,
        sourceContractRevision: OPEN_METEO_SOURCE_CONTRACT_REVISION,
        temporalResolution: 'provider-hourly', calibrationEligible: false,
        ...(native ? { supplierInterpolationPossible: true, nativeTimeExact: false } : {}),
        ...(component === 'wind' ? { units: 'm/s,degrees', directionConvention: 'from' } : {}),
        ...(component === 'wave' ? { units: 'm,s,degrees', periodSemantics: 'peak', directionConvention: 'from' } : {}),
        ...(component === 'waterTemperature' ? { units: 'celsius', physicalScope: 'sea-surface-temperature' } : {}),
      };
      const record = { contractId: 'open-meteo-part-component-record-v1',
        partId: part.partId, validTime: row.time, component, values, source };
      records.push({ ...record, recordId: openMeteoPartSha256(record) });
    }
  }
  return { evidenceId, evidence, records };
}

function partMap(parts) {
  const result = new Map();
  for (const part of parts ?? []) {
    openMeteoPartIdentity(part);
    if (result.has(part.partId)) fail('OPEN_METEO_PART_TARGET_DUPLICATE');
    result.set(part.partId, part);
  }
  if (!result.size) fail('OPEN_METEO_PART_TARGETS_EMPTY');
  return result;
}

function retentionInterval(startAt, endAt) {
  if (!exactHour(startAt) || !exactHour(endAt) || endAt < startAt) fail('OPEN_METEO_PART_RETENTION_INTERVAL_REQUIRED');
  return { startAt, endAt };
}

function validateBankEnvelope(bank) {
  if (bank?.schemaVersion !== 1 || bank.kind !== OPEN_METEO_PART_BANK_KIND
    || !Array.isArray(bank.records) || !bank.responses || typeof bank.responses !== 'object'
    || Array.isArray(bank.responses) || Buffer.byteLength(JSON.stringify(bank)) > OPEN_METEO_PART_BANK_MAX_BYTES) {
    fail('OPEN_METEO_PART_BANK_INVALID');
  }
  const { bankSha256, ...content } = bank;
  if (bankSha256 !== openMeteoPartSha256(content)) fail('OPEN_METEO_PART_BANK_HASH_INVALID');
  retentionInterval(bank.retention?.startAt, bank.retention?.endAt);
}

export function validateOpenMeteoPartBank(bank, { parts, spatialPolicies } = {}) {
  const targets = partMap(parts);
  checkedPolicies(spatialPolicies);
  validateBankEnvelope(bank);
  const expectedById = new Map();
  // Decode each response once, not once for each of its 121 hourly records.
  for (const [evidenceId, evidence] of Object.entries(bank.responses)) {
    // Historical non-admitted level bytes cannot invalidate valid siblings,
    // nor can they acquire a capability for the runtime index.
    if (evidence?.request?.component === 'waterLevel') continue;
    const entityId = evidence?.request?.identity?.entityId;
    const part = targets.get(typeof entityId === 'string' ? entityId.replace(/^PART::/, '') : '');
    if (!part) fail('OPEN_METEO_PART_BANK_TARGET_INVALID');
    const parsed = readOpenMeteoPartResponse(evidence, { part, spatialPolicies });
    if (parsed.evidenceId !== evidenceId) fail('OPEN_METEO_PART_BANK_EVIDENCE_INVALID');
    for (const record of parsed.records) expectedById.set(record.recordId, record);
  }
  const index = new Map();
  for (const record of bank.records) {
    if (record?.component === 'waterLevel'
      && bank.responses[record.evidenceId]?.request?.component === 'waterLevel') continue;
    if (!exactHour(record?.validTime) || record.validTime < bank.retention.startAt
      || record.validTime > bank.retention.endAt) fail('OPEN_METEO_PART_BANK_RETENTION_INVALID');
    const expected = expectedById.get(record?.recordId);
    if (!expected || !same(record, storedRecord(expected))) fail('OPEN_METEO_PART_BANK_RECORD_INVALID');
    const key = keyOf(expected.source.entityId, expected.validTime, expected.component);
    if (index.has(key)) fail('OPEN_METEO_PART_BANK_DUPLICATE');
    index.set(key, structuredClone(expected));
  }
  const handle = Object.freeze({ recordCount: index.size });
  checkedIndexes.set(handle, index);
  return handle;
}

export function selectedOpenMeteoPartRecord(index, { part, validTime, component } = {}) {
  if (!checkedIndexes.has(index) || !exactHour(validTime)
    || !OPEN_METEO_PART_COMPONENTS.includes(component)) return null;
  const identity = openMeteoPartIdentity(part);
  const record = checkedIndexes.get(index).get(keyOf(identity.entityId, validTime, component));
  if (!record || !Object.entries(identity).every(([key, value]) => same(record.source[key], value))) return null;
  return structuredClone(record);
}

export function createOpenMeteoPartBankBuilder(previous, {
  parts, spatialPolicies, retentionStartAt, retentionEndAt,
} = {}) {
  const targets = partMap(parts);
  const options = { parts, spatialPolicies };
  checkedPolicies(spatialPolicies);
  const retention = retentionInterval(retentionStartAt, retentionEndAt);
  const retired = { outsideRetention: 0, changedOrRemovedTarget: 0, dmiOnlyWaterLevel: 0 };
  let reusable = null;
  if (previous) {
    validateBankEnvelope(previous);
    const reusableResponses = Object.fromEntries(Object.entries(previous.responses).filter(([, evidence]) => {
      if (evidence?.request?.component === 'waterLevel') return false;
      const identity = evidence?.request?.identity;
      const part = targets.get(typeof identity?.entityId === 'string' ? identity.entityId.replace(/^PART::/, '') : '');
      return part && same(identity, openMeteoPartIdentity(part));
    }));
    const records = previous.records.filter(record => {
      if (!exactHour(record?.validTime)) fail('OPEN_METEO_PART_BANK_RECORD_INVALID');
      if (!Object.hasOwn(previous.responses, record.evidenceId)) fail('OPEN_METEO_PART_BANK_EVIDENCE_INVALID');
      if (record.component === 'waterLevel'
        && previous.responses[record.evidenceId]?.request?.component === 'waterLevel') {
        retired.dmiOnlyWaterLevel += 1;
        return false;
      }
      if (record.validTime < retention.startAt || record.validTime > retention.endAt) {
        retired.outsideRetention += 1;
        return false;
      }
      if (!Object.hasOwn(reusableResponses, record.evidenceId)) {
        retired.changedOrRemovedTarget += 1;
        return false;
      }
      return true;
    });
    const used = new Set(records.map(record => record.evidenceId));
    const content = { schemaVersion: 1, kind: OPEN_METEO_PART_BANK_KIND, retention, records,
      responses: Object.fromEntries(Object.entries(reusableResponses).filter(([id]) => used.has(id))) };
    reusable = { ...content, bankSha256: openMeteoPartSha256(content) };
  }
  const retained = reusable ? checkedIndexes.get(validateOpenMeteoPartBank(reusable, options)) : new Map();
  const responses = structuredClone(reusable?.responses ?? {});
  const add = admission => {
    // Never trust the caller's computed records; rebuild from the bound bytes.
    const entityId = admission?.evidence?.request?.identity?.entityId;
    const part = targets.get(typeof entityId === 'string' ? entityId.replace(/^PART::/, '') : '');
    if (!part) fail('OPEN_METEO_PART_BANK_TARGET_INVALID');
    const parsed = readOpenMeteoPartResponse(admission.evidence, { part, spatialPolicies });
    responses[parsed.evidenceId] = structuredClone(parsed.evidence);
    for (const record of parsed.records) {
      if (record.validTime < retention.startAt || record.validTime > retention.endAt) continue;
      const key = keyOf(record.source.entityId, record.validTime, record.component);
      // Unknown model age is useful for holes, not proof of a newer forecast.
      if (!retained.has(key)) retained.set(key, structuredClone(record));
    }
  };
  const snapshot = () => {
    const records = [...retained.values()].sort((a, b) => a.validTime.localeCompare(b.validTime)
      || a.partId.localeCompare(b.partId) || a.component.localeCompare(b.component));
    const used = new Set(records.map(record => record.source.evidenceId));
    const content = { schemaVersion: 1, kind: OPEN_METEO_PART_BANK_KIND, retention, records: records.map(storedRecord),
      responses: Object.fromEntries(Object.entries(responses).filter(([id]) => used.has(id))) };
    const bank = { ...content, bankSha256: openMeteoPartSha256(content) };
    if (Buffer.byteLength(JSON.stringify(bank)) > OPEN_METEO_PART_BANK_MAX_BYTES) fail('OPEN_METEO_PART_BANK_BUDGET_EXCEEDED');
    return structuredClone(bank);
  };
  const has = (part, validTime, component) => retained.has(keyOf(openMeteoPartIdentity(part).entityId, validTime, component));
  return Object.freeze({ add, snapshot, has, retired: Object.freeze(retired) });
}

export function mergeOpenMeteoPartBank(previous, admissions, options = {}) {
  const builder = createOpenMeteoPartBankBuilder(previous, options);
  for (const admission of admissions ?? []) builder.add(admission);
  return builder.snapshot();
}

// One-time native recovery from two separately authenticated private runtime
// generations. The newer bank owns conflicts; the older bank may fill only
// exact component/part/hour holes after its original response bytes have
// passed the same admission path as a live provider response.
export function backfillVerifiedOpenMeteoPartBank(latest, complete, options = {}) {
  if (!latest && !complete) return null;
  const validation = { parts: options.parts, spatialPolicies: options.spatialPolicies };
  if (latest) validateOpenMeteoPartBank(latest, validation);
  if (complete) validateOpenMeteoPartBank(complete, validation);
  const builder = createOpenMeteoPartBankBuilder(latest, options);
  if (builder.retired.changedOrRemovedTarget !== 0) {
    fail('OPEN_METEO_PART_RECOVERY_TARGET_CHANGED');
  }
  const evidenceIds = new Set((complete?.records ?? []).map(record => record.evidenceId));
  for (const evidenceId of evidenceIds) {
    const evidence = complete.responses[evidenceId];
    if (!evidence) fail('OPEN_METEO_PART_RECOVERY_EVIDENCE_MISSING');
    builder.add({ evidence });
  }
  const result = builder.snapshot();
  validateOpenMeteoPartBank(result, validation);
  const inRetention = record => record.validTime >= result.retention.startAt
    && record.validTime <= result.retention.endAt;
  // Stored records intentionally omit the full private source; independent
  // bank validation above already binds each partId to its original response.
  const exactKey = record => stable([record.partId, record.validTime, record.component]);
  const expected = new Map();
  for (const record of (latest?.records ?? []).filter(inRetention)) {
    expected.set(exactKey(record), record.recordId);
  }
  for (const record of (complete?.records ?? []).filter(inRetention)) {
    if (!expected.has(exactKey(record))) expected.set(exactKey(record), record.recordId);
  }
  const actual = new Map(result.records.map(record => [exactKey(record), record.recordId]));
  if (actual.size < expected.size || [...expected].some(([key, id]) => actual.get(key) !== id)) {
    fail('OPEN_METEO_PART_RECOVERY_LOST_VALID_RECORD');
  }
  return result;
}
