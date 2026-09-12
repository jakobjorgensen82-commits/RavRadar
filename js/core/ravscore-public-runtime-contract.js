import { ravScoreModelBinding } from './ravscore-model-contract.js';
import {
  RAVSCORE_PUBLIC_MODEL_BINDING_FIELDS,
  assertExactPublicRavScoreModelBindingShape,
} from './ravscore-public-profile-contract.js';
import {
  assertRavScoreVerifiedEvidenceTrust,
} from './ravscore-evidence-trust-contract.js';
import {
  assertPublicWeatherSourceAge,
  publicWeatherAgeReferenceAt,
} from './ravscore-public-weather-source-age.js';

export const RAVSCORE_PUBLIC_RUNTIME_SCHEMA_VERSION = '1.0.0';
export const RAVSCORE_PUBLIC_STARTUP_KIND = 'RAVSCORE_PUBLIC_STARTUP';
export const RAVSCORE_PUBLIC_DETAILS_KIND = 'RAVSCORE_PUBLIC_DETAILS';
export const RAVSCORE_PUBLIC_RUNTIME_ENVELOPE_FIELDS = Object.freeze([
  'schemaVersion',
  'kind',
  'datasetId',
  'productionReferenceAt',
  'modelBinding',
  'payloadBodySha256',
]);
export const RAVSCORE_PUBLIC_MANIFEST_RUNTIME_FIELDS = Object.freeze([
  'schemaVersion',
  'modelBinding',
  'startup',
  'details',
]);
export const RAVSCORE_PUBLIC_RUNTIME_DESCRIPTOR_FIELDS = Object.freeze([
  'kind',
  'payloadBodySha256',
  'fileSha256',
  'bytes',
]);
export const RAVSCORE_PUBLIC_ZONE_COUNT = 210;
export const RAVSCORE_PUBLIC_COASTAL_PART_COUNT = 673;
// The public hourly axis belongs to the shared four-file runtime contract,
// so the same horizon remains verifiable when the canonical contract is
// overlaid by the sealed Candidate G rollback model.
export const RAVSCORE_PUBLIC_FORECAST_HOURS = 118;
export const RAVSCORE_INTEGRATED_AVAILABILITY_SCHEMA_VERSION = 2;
export const RAVSCORE_INTEGRATED_AVAILABILITY_POLICY =
  'integrated-model-local-fail-closed';
export const RAVSCORE_CANDIDATE_G_AVAILABILITY_POLICY =
  'candidate-g-local-fail-closed';
export const RAVSCORE_PUBLIC_SCORE_MODES = Object.freeze(['waders', 'beach']);
export const RAVSCORE_INTEGRATED_AVAILABILITY_FIELDS = Object.freeze([
  'schemaVersion',
  'policy',
  'allZonesActive',
  'activeZoneCount',
  'unavailableZoneCount',
  'totalZoneCount',
  'allCurrentScoresFullHistory',
  'fullHistoryModeCount',
  'historyIncompleteModeCount',
  'historyIncompleteZoneCount',
  'evaluatedAt',
  'unavailableZones',
  'historyIncompleteZones',
]);
// Four missed 15-minute production opportunities cover the 45-minute watchdog
// without presenting a multi-hour outage as fresh data.
export const RAVSCORE_PUBLIC_FRESH_MAXIMUM_AGE_HOURS = 1;
export const RAVSCORE_PUBLIC_RUNTIME_AVAILABILITY_SCHEMA_VERSION =
  'ravscore-public-runtime-availability-v2';
export const RAVSCORE_PUBLIC_RUNTIME_MODE_FRESH = 'FRESH';
export const RAVSCORE_PUBLIC_RUNTIME_MODE_EMERGENCY = 'EMERGENCY_LAST_COMPLETE';
export const RAVSCORE_PUBLIC_RUNTIME_AVAILABILITY_FIELDS = Object.freeze([
  'schemaVersion',
  'mode',
  'reason',
  'datasetId',
  'generatedAt',
  'productionReferenceAt',
  'ageReferenceAt',
  'selectedReferenceAt',
  'validUntil',
  'evaluatedAt',
  'ageHours',
  'weatherSourceAge',
  'modelBinding',
]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const PUBLIC_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const RAVSCORE_HISTORY_COVERAGE_HOURS = 48;

function exactKeys(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  return actual.length === expected.length
    && actual.every((field, index) => field === expected[index]);
}

function canonicalTime(value) {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  const canonical = new Date(parsed).toISOString();
  return canonical === value ? canonical : null;
}

function exactUtcHour(value) {
  const canonical = canonicalTime(value);
  if (!canonical) return null;
  const date = new Date(canonical);
  return date.getUTCMinutes() === 0
    && date.getUTCSeconds() === 0
    && date.getUTCMilliseconds() === 0
    ? canonical
    : null;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(item => canonicalValue(item));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().flatMap(key => {
    const nested = value[key];
    if (nested === undefined || typeof nested === 'function' || typeof nested === 'symbol') return [];
    return [[key, canonicalValue(nested)]];
  }));
}

function strictCount(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a strict non-negative safe integer`);
  }
  return value;
}

function exactModeList(value, label) {
  if (!Array.isArray(value) || value.length < 1
    || value.some(mode => !RAVSCORE_PUBLIC_SCORE_MODES.includes(mode))
    || new Set(value).size !== value.length) {
    throw new Error(`${label} must contain unique supported score modes`);
  }
  return [...value];
}

function exactStringList(value, label, { pattern = null } = {}) {
  if (!Array.isArray(value) || value.length < 1
    || value.some(item => typeof item !== 'string' || item.length < 1
      || item.length > 1000 || (pattern && !pattern.test(item)))
    || new Set(value).size !== value.length) {
    throw new Error(`${label} must contain unique safe strings`);
  }
  return [...value];
}

function exactZoneId(value, label) {
  if (typeof value !== 'string' || !PUBLIC_ID_PATTERN.test(value)) {
    throw new Error(`${label} must be a safe public zone id`);
  }
  return value;
}

function zoneNameFor(zoneId, zoneNames) {
  const candidate = zoneNames instanceof Map
    ? zoneNames.get(zoneId)
    : zoneNames?.[zoneId];
  return typeof candidate === 'string' && candidate.length > 0 && candidate.length <= 500
    ? candidate : zoneId;
}

function exactScoreRow(zone, referenceAt, label) {
  const rows = Array.isArray(zone?.hourly) ? zone.hourly : [];
  const matches = rows.filter(row => row?.time === referenceAt);
  if (matches.length !== 1) {
    throw new Error(`${label} must contain exactly one score row at the availability reference`);
  }
  return matches[0];
}

function unavailableReasons(result) {
  const direct = Array.isArray(result?.reasons)
    ? result.reasons.filter(reason => typeof reason === 'string' && reason.length > 0)
    : [];
  const fallback = typeof result?.unavailability?.messageDa === 'string'
    && result.unavailability.messageDa.length > 0
    ? [result.unavailability.messageDa]
    : ['Datagrundlaget er ikke sammenhængende.'];
  return [...new Set(direct.length ? direct : fallback)];
}

function assertUnavailableScore(result, label) {
  const unavailability = result?.unavailability;
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || result.available !== false
    || result.score !== null
    || result.scoreQuality !== 'UNAVAILABLE'
    || result.scoreBounds !== null
    || result.calibrationEligible !== false
    || result.scoreSemantics !== null
    || result.conservativeTailResetApplied !== false
    || result.historyCoverageHours !== null
    || !Array.isArray(result.historyReasonCodes)
    || result.historyReasonCodes.length !== 0
    || !unavailability
    || typeof unavailability !== 'object'
    || Array.isArray(unavailability)
    || unavailability.available !== false
    || typeof unavailability.code !== 'string'
    || !REASON_CODE_PATTERN.test(unavailability.code)
    || typeof unavailability.messageDa !== 'string'
    || unavailability.messageDa.length < 1
    || unavailability.messageDa.length > 1000
    || !Array.isArray(result.reasons)
    || result.reasons.length < 1
    || result.reasons.some(reason => typeof reason !== 'string'
      || reason.length < 1 || reason.length > 1000)
    || new Set(result.reasons).size !== result.reasons.length) {
    throw new Error(`${label} is not an explicit valid local UNAVAILABLE result`);
  }
  try {
    assertExactPublicRavScoreModelBindingShape(
      result.modelBinding,
      `${label} model binding`,
    );
  } catch {
    throw new Error(`${label} is not an explicit valid local UNAVAILABLE result`);
  }
  const zoneAggregate = result.status === 'unavailable';
  const expectedUnavailabilityFields = zoneAggregate
    ? ['available', 'code', 'messageDa', 'policy', 'validPartCount', 'expectedPartCount']
    : ['available', 'code', 'messageDa'];
  if (!exactKeys(unavailability, expectedUnavailabilityFields)
    || (zoneAggregate && (unavailability.policy !== RAVSCORE_INTEGRATED_AVAILABILITY_POLICY
      || !Number.isSafeInteger(result.validPartCount) || result.validPartCount < 0
      || !Number.isSafeInteger(result.expectedPartCount) || result.expectedPartCount < 1
      || result.validPartCount >= result.expectedPartCount
      || unavailability.validPartCount !== result.validPartCount
      || unavailability.expectedPartCount !== result.expectedPartCount
      || !Array.isArray(result.unavailableParts)
      || result.unavailableParts.some(part => !exactKeys(part, [
        'partId', 'name', 'code', 'reason',
      ]) || typeof part.partId !== 'string' || !PUBLIC_ID_PATTERN.test(part.partId)
        || typeof part.name !== 'string' || part.name.length < 1 || part.name.length > 500
        || typeof part.code !== 'string' || !REASON_CODE_PATTERN.test(part.code)
        || typeof part.reason !== 'string' || part.reason.length < 1
        || part.reason.length > 1000)
      || new Set(result.unavailableParts.map(part => part.partId)).size
        !== result.unavailableParts.length))) {
    throw new Error(`${label} has an inexact local UNAVAILABLE explanation`);
  }
}

function assertAvailableHistoryScore(result, label) {
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || result.available !== true
    || typeof result.score !== 'number' || !Number.isFinite(result.score)
    || result.score < 0 || result.score > 100
    || !['FULL_HISTORY', 'HISTORY_INCOMPLETE'].includes(result.scoreQuality)
    || typeof result.calibrationEligible !== 'boolean'
    || !Number.isFinite(result.historyCoverageHours)
    || result.historyCoverageHours < 0
    || result.historyCoverageHours > RAVSCORE_HISTORY_COVERAGE_HOURS
    || !Array.isArray(result.historyReasonCodes)
    || result.historyReasonCodes.some(code => typeof code !== 'string'
      || !REASON_CODE_PATTERN.test(code))
    || new Set(result.historyReasonCodes).size !== result.historyReasonCodes.length) {
    throw new Error(`${label} is not an explicit valid available score result`);
  }
  if (result.scoreQuality === 'FULL_HISTORY'
    && (result.historyCoverageHours !== RAVSCORE_HISTORY_COVERAGE_HOURS
      || result.historyReasonCodes.length !== 0)) {
    throw new Error(`${label} does not carry one exact full-history window`);
  }
  if (result.scoreQuality === 'HISTORY_INCOMPLETE'
    && (result.calibrationEligible !== false || result.historyReasonCodes.length < 1)) {
    throw new Error(`${label} does not explain its incomplete history`);
  }
}

export function assertIntegratedPublicScoreResult(result, label = 'integrated public score') {
  if (result?.available === false) assertUnavailableScore(result, label);
  else assertAvailableHistoryScore(result, label);
  return true;
}

export function buildIntegratedPublicScoreAvailability({
  zones,
  referenceAt,
  zoneNames = {},
} = {}) {
  if (!zones || typeof zones !== 'object' || Array.isArray(zones)) {
    throw new Error('Integrated score availability requires a score-zone object');
  }
  const evaluatedAt = canonicalTime(referenceAt);
  if (!evaluatedAt) {
    throw new Error('Integrated score availability requires one canonical reference time');
  }
  const zoneIds = Object.keys(zones).sort();
  if (zoneIds.length < 1 || new Set(zoneIds).size !== zoneIds.length) {
    throw new Error('Integrated score availability requires unique public zones');
  }
  const unavailableZones = [];
  const historyIncompleteZones = [];
  let fullHistoryModeCount = 0;
  let historyIncompleteModeCount = 0;
  for (const zoneId of zoneIds) {
    exactZoneId(zoneId, 'Integrated score availability zone id');
    const row = exactScoreRow(zones[zoneId], evaluatedAt, `Integrated score zone ${zoneId}`);
    const unavailableModes = [];
    const reasons = [];
    const historyIncompleteModes = [];
    const historyCoverageHours = [];
    const historyReasonCodes = [];
    for (const mode of RAVSCORE_PUBLIC_SCORE_MODES) {
      const result = row?.[mode];
      if (result?.available === false) {
        assertUnavailableScore(result, `Integrated score zone ${zoneId} ${mode}`);
        unavailableModes.push(mode);
        reasons.push(...unavailableReasons(result));
        continue;
      }
      assertAvailableHistoryScore(result, `Integrated score zone ${zoneId} ${mode}`);
      if (result.scoreQuality === 'FULL_HISTORY') {
        fullHistoryModeCount += 1;
      } else {
        historyIncompleteModeCount += 1;
        historyIncompleteModes.push(mode);
        historyCoverageHours.push(result.historyCoverageHours);
        historyReasonCodes.push(...result.historyReasonCodes);
      }
    }
    const zoneName = zoneNameFor(zoneId, zoneNames);
    if (unavailableModes.length) {
      unavailableZones.push({
        zoneId,
        zoneName,
        modes: unavailableModes,
        reasons: [...new Set(reasons)],
      });
    }
    if (historyIncompleteModes.length) {
      historyIncompleteZones.push({
        zoneId,
        zoneName,
        modes: historyIncompleteModes,
        historyCoverageHours: Math.min(...historyCoverageHours),
        historyReasonCodes: [...new Set(historyReasonCodes)].sort(),
      });
    }
  }
  const totalZoneCount = zoneIds.length;
  const unavailableModeCount = unavailableZones
    .reduce((count, zone) => count + zone.modes.length, 0);
  return {
    schemaVersion: RAVSCORE_INTEGRATED_AVAILABILITY_SCHEMA_VERSION,
    policy: RAVSCORE_INTEGRATED_AVAILABILITY_POLICY,
    allZonesActive: unavailableZones.length === 0,
    activeZoneCount: totalZoneCount - unavailableZones.length,
    unavailableZoneCount: unavailableZones.length,
    totalZoneCount,
    allCurrentScoresFullHistory:
      unavailableModeCount === 0 && historyIncompleteModeCount === 0,
    fullHistoryModeCount,
    historyIncompleteModeCount,
    historyIncompleteZoneCount: historyIncompleteZones.length,
    evaluatedAt,
    unavailableZones,
    historyIncompleteZones,
  };
}

export function assertIntegratedPublicScoreAvailability(value, {
  zoneIds = null,
  zones = null,
  label = 'integrated public score availability',
} = {}) {
  if (!exactKeys(value, RAVSCORE_INTEGRATED_AVAILABILITY_FIELDS)
    || value.schemaVersion !== RAVSCORE_INTEGRATED_AVAILABILITY_SCHEMA_VERSION
    || value.policy !== RAVSCORE_INTEGRATED_AVAILABILITY_POLICY
    || typeof value.allZonesActive !== 'boolean'
    || typeof value.allCurrentScoresFullHistory !== 'boolean'
    || !canonicalTime(value.evaluatedAt)) {
    throw new Error(`${label} has an inexact integrated availability contract`);
  }
  for (const field of [
    'activeZoneCount', 'unavailableZoneCount', 'totalZoneCount',
    'fullHistoryModeCount', 'historyIncompleteModeCount', 'historyIncompleteZoneCount',
  ]) strictCount(value[field], `${label}.${field}`);
  if (!Array.isArray(value.unavailableZones)
    || !Array.isArray(value.historyIncompleteZones)) {
    throw new Error(`${label} lacks its exact local availability lists`);
  }
  const expectedZoneIds = zoneIds === null
    ? null : [...zoneIds].map(zoneId => exactZoneId(zoneId, `${label} zone id`));
  if ((expectedZoneIds && new Set(expectedZoneIds).size !== expectedZoneIds.length)
    || (expectedZoneIds && value.totalZoneCount !== expectedZoneIds.length)
    || value.activeZoneCount + value.unavailableZoneCount !== value.totalZoneCount
    || value.allZonesActive !== (value.unavailableZoneCount === 0)
    || value.unavailableZoneCount !== value.unavailableZones.length
    || value.historyIncompleteZoneCount !== value.historyIncompleteZones.length) {
    throw new Error(`${label} has inconsistent zone counts`);
  }
  const zoneIdSet = expectedZoneIds ? new Set(expectedZoneIds) : null;
  const unavailableKeys = new Set();
  const unavailableZoneIds = new Set();
  let unavailableModeCount = 0;
  for (const zone of value.unavailableZones) {
    if (!exactKeys(zone, ['zoneId', 'zoneName', 'modes', 'reasons'])) {
      throw new Error(`${label} has an inexact unavailable-zone entry`);
    }
    const zoneId = exactZoneId(zone.zoneId, `${label} unavailable zone id`);
    if ((zoneIdSet && !zoneIdSet.has(zoneId))
      || unavailableZoneIds.has(zoneId)
      || typeof zone.zoneName !== 'string' || zone.zoneName.length < 1
      || zone.zoneName.length > 500) {
      throw new Error(`${label} has an invalid unavailable zone`);
    }
    const modes = exactModeList(zone.modes, `${label} unavailable modes`);
    exactStringList(zone.reasons, `${label} unavailable reasons`);
    unavailableZoneIds.add(zoneId);
    unavailableModeCount += modes.length;
    for (const mode of modes) {
      const key = `${zoneId}\u0000${mode}`;
      if (unavailableKeys.has(key)) throw new Error(`${label} repeats an unavailable mode`);
      unavailableKeys.add(key);
    }
  }
  const historyIncompleteKeys = new Set();
  const historyIncompleteZoneIds = new Set();
  let declaredHistoryIncompleteModeCount = 0;
  for (const zone of value.historyIncompleteZones) {
    if (!exactKeys(zone, [
      'zoneId', 'zoneName', 'modes', 'historyCoverageHours', 'historyReasonCodes',
    ])) throw new Error(`${label} has an inexact history-incomplete entry`);
    const zoneId = exactZoneId(zone.zoneId, `${label} history-incomplete zone id`);
    if ((zoneIdSet && !zoneIdSet.has(zoneId))
      || historyIncompleteZoneIds.has(zoneId)
      || typeof zone.zoneName !== 'string' || zone.zoneName.length < 1
      || zone.zoneName.length > 500
      || !Number.isFinite(zone.historyCoverageHours)
      || zone.historyCoverageHours < 0
      || zone.historyCoverageHours > RAVSCORE_HISTORY_COVERAGE_HOURS) {
      throw new Error(`${label} has an invalid history-incomplete zone`);
    }
    const modes = exactModeList(zone.modes, `${label} history-incomplete modes`);
    exactStringList(zone.historyReasonCodes, `${label} history reason codes`, {
      pattern: REASON_CODE_PATTERN,
    });
    declaredHistoryIncompleteModeCount += modes.length;
    historyIncompleteZoneIds.add(zoneId);
    for (const mode of modes) {
      const key = `${zoneId}\u0000${mode}`;
      if (historyIncompleteKeys.has(key) || unavailableKeys.has(key)) {
        throw new Error(`${label} repeats or overlaps a current score mode`);
      }
      historyIncompleteKeys.add(key);
    }
  }
  if (value.historyIncompleteModeCount !== declaredHistoryIncompleteModeCount
    || value.fullHistoryModeCount + value.historyIncompleteModeCount
      + unavailableModeCount !== value.totalZoneCount * RAVSCORE_PUBLIC_SCORE_MODES.length
    || value.allCurrentScoresFullHistory
      !== (unavailableModeCount === 0 && value.historyIncompleteModeCount === 0)) {
    throw new Error(`${label} has inconsistent current score-quality counts`);
  }
  if (zones !== null) {
    const declaredNames = new Map([
      ...value.unavailableZones.map(zone => [zone.zoneId, zone.zoneName]),
      ...value.historyIncompleteZones.map(zone => [zone.zoneId, zone.zoneName]),
    ]);
    const expected = buildIntegratedPublicScoreAvailability({
      zones,
      referenceAt: value.evaluatedAt,
      zoneNames: declaredNames,
    });
    if (canonicalPublicRuntimeJson(value) !== canonicalPublicRuntimeJson(expected)) {
      throw new Error(`${label} does not match its exact current score rows`);
    }
  }
  return true;
}

export function buildPublicScoreAvailability({
  policy,
  zones,
  referenceAt,
  zoneNames = {},
} = {}) {
  const integrated = buildIntegratedPublicScoreAvailability({
    zones,
    referenceAt,
    zoneNames,
  });
  if (policy === RAVSCORE_INTEGRATED_AVAILABILITY_POLICY) return integrated;
  if (policy !== RAVSCORE_CANDIDATE_G_AVAILABILITY_POLICY
    || integrated.allZonesActive !== true
    || integrated.allCurrentScoresFullHistory !== true) {
    throw new Error('Candidate G public availability requires one complete full-history package');
  }
  return {
    ...integrated,
    policy: RAVSCORE_CANDIDATE_G_AVAILABILITY_POLICY,
  };
}

export function assertCandidateGPublicScoreAvailability(value, {
  zoneIds = null,
  zones = null,
  label = 'Candidate G public score availability',
} = {}) {
  if (!exactKeys(value, RAVSCORE_INTEGRATED_AVAILABILITY_FIELDS)
    || value.schemaVersion !== RAVSCORE_INTEGRATED_AVAILABILITY_SCHEMA_VERSION
    || value.policy !== RAVSCORE_CANDIDATE_G_AVAILABILITY_POLICY
    || value.allZonesActive !== true
    || value.activeZoneCount !== RAVSCORE_PUBLIC_ZONE_COUNT
    || value.unavailableZoneCount !== 0
    || value.totalZoneCount !== RAVSCORE_PUBLIC_ZONE_COUNT
    || value.allCurrentScoresFullHistory !== true
    || value.fullHistoryModeCount
      !== RAVSCORE_PUBLIC_ZONE_COUNT * RAVSCORE_PUBLIC_SCORE_MODES.length
    || value.historyIncompleteModeCount !== 0
    || value.historyIncompleteZoneCount !== 0
    || !canonicalTime(value.evaluatedAt)
    || !Array.isArray(value.unavailableZones) || value.unavailableZones.length !== 0
    || !Array.isArray(value.historyIncompleteZones)
    || value.historyIncompleteZones.length !== 0) {
    throw new Error(`${label} has an inexact Candidate G availability contract`);
  }
  const expectedZoneIds = zoneIds === null
    ? null : [...zoneIds].map(zoneId => exactZoneId(zoneId, `${label} zone id`));
  if (expectedZoneIds
    && (expectedZoneIds.length !== RAVSCORE_PUBLIC_ZONE_COUNT
      || new Set(expectedZoneIds).size !== expectedZoneIds.length)) {
    throw new Error(`${label} does not cover the exact national zone set`);
  }
  if (zones !== null) {
    const expected = buildPublicScoreAvailability({
      policy: RAVSCORE_CANDIDATE_G_AVAILABILITY_POLICY,
      zones,
      referenceAt: value.evaluatedAt,
    });
    if (canonicalPublicRuntimeJson(value) !== canonicalPublicRuntimeJson(expected)) {
      throw new Error(`${label} does not match its exact Candidate G score rows`);
    }
  }
  return true;
}

export function assertPublicScoreAvailability(value, options = {}) {
  if (value?.policy === RAVSCORE_INTEGRATED_AVAILABILITY_POLICY) {
    return assertIntegratedPublicScoreAvailability(value, options);
  }
  if (value?.policy === RAVSCORE_CANDIDATE_G_AVAILABILITY_POLICY) {
    return assertCandidateGPublicScoreAvailability(value, options);
  }
  throw new Error(`${options.label ?? 'public score availability'} has an unknown policy`);
}

export function canonicalPublicRuntimeJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function publicRuntimeDocumentBody(document) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) return null;
  const { ravScoreRuntime: _binding, ...body } = document;
  return body;
}

export function sameRavScoreModelBinding(left, right) {
  try {
    assertExactPublicRavScoreModelBindingShape(left, 'left RavScore model binding');
    assertExactPublicRavScoreModelBindingShape(right, 'right RavScore model binding');
    return RAVSCORE_PUBLIC_MODEL_BINDING_FIELDS.every(key => left[key] === right[key]);
  } catch {
    return false;
  }
}

export function assertPublicRuntimeEnvelope(document, {
  kind,
  datasetId = null,
  productionReferenceAt = null,
  payloadBodySha256 = null,
  modelBinding = ravScoreModelBinding(),
  label = 'public RavScore payload',
} = {}) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error(`${label} is missing`);
  }
  const envelope = document.ravScoreRuntime;
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    throw new Error(`${label} lacks a RavScore runtime envelope`);
  }
  if (!exactKeys(envelope, RAVSCORE_PUBLIC_RUNTIME_ENVELOPE_FIELDS)) {
    throw new Error(`${label} has an inexact runtime envelope field set`);
  }
  if (envelope.schemaVersion !== RAVSCORE_PUBLIC_RUNTIME_SCHEMA_VERSION) {
    throw new Error(`${label} has an incompatible runtime schema`);
  }
  if (envelope.kind !== kind) throw new Error(`${label} has an incompatible payload kind`);
  if (!document.datasetId || envelope.datasetId !== document.datasetId) {
    throw new Error(`${label} has an inconsistent dataset id`);
  }
  if (datasetId !== null && document.datasetId !== datasetId) {
    throw new Error(`${label} belongs to another dataset`);
  }
  const documentReference = document.productionReferenceAt ?? null;
  if (envelope.productionReferenceAt !== documentReference) {
    throw new Error(`${label} has an inconsistent production reference`);
  }
  if (productionReferenceAt !== null && documentReference !== productionReferenceAt) {
    throw new Error(`${label} belongs to another production reference`);
  }
  if (!SHA256_PATTERN.test(String(envelope.payloadBodySha256 ?? ''))) {
    throw new Error(`${label} lacks a valid body digest`);
  }
  if (payloadBodySha256 !== null && envelope.payloadBodySha256 !== payloadBodySha256) {
    throw new Error(`${label} has an incompatible body digest`);
  }
  assertExactPublicRavScoreModelBindingShape(envelope.modelBinding, `${label} model binding`);
  assertExactPublicRavScoreModelBindingShape(modelBinding, `expected ${label} model binding`);
  if (!sameRavScoreModelBinding(envelope.modelBinding, modelBinding)) {
    throw new Error(`${label} belongs to another RavScore model bundle`);
  }
  return true;
}
export function assertPublicRuntimeDescriptor(descriptor, {
  kind,
  payloadBodySha256 = null,
  fileSha256 = null,
  bytes = null,
  label = 'public RavScore runtime descriptor',
} = {}) {
  if (!exactKeys(descriptor, RAVSCORE_PUBLIC_RUNTIME_DESCRIPTOR_FIELDS)) {
    throw new Error(`${label} has an inexact runtime descriptor field set`);
  }
  if (descriptor.kind !== kind) throw new Error(`${label} has an incompatible payload kind`);
  if (!SHA256_PATTERN.test(String(descriptor.payloadBodySha256 ?? ''))
    || (payloadBodySha256 !== null && descriptor.payloadBodySha256 !== payloadBodySha256)) {
    throw new Error(`${label} has an incompatible body digest`);
  }
  if (!SHA256_PATTERN.test(String(descriptor.fileSha256 ?? ''))
    || (fileSha256 !== null && descriptor.fileSha256 !== fileSha256)) {
    throw new Error(`${label} has an incompatible file digest`);
  }
  if (!Number.isSafeInteger(descriptor.bytes) || descriptor.bytes < 1
    || (bytes !== null && descriptor.bytes !== bytes)) {
    throw new Error(`${label} has an incompatible byte count`);
  }
  return true;
}

export function assertPublicRuntimeManifest(runtime, {
  modelBinding = ravScoreModelBinding(),
  startup = {},
  details = {},
  label = 'public RavScore manifest runtime',
} = {}) {
  if (!exactKeys(runtime, RAVSCORE_PUBLIC_MANIFEST_RUNTIME_FIELDS)) {
    throw new Error(`${label} has an inexact manifest runtime field set`);
  }
  if (runtime.schemaVersion !== RAVSCORE_PUBLIC_RUNTIME_SCHEMA_VERSION) {
    throw new Error(`${label} has an incompatible runtime schema`);
  }
  assertExactPublicRavScoreModelBindingShape(runtime.modelBinding, `${label} model binding`);
  assertExactPublicRavScoreModelBindingShape(modelBinding, `expected ${label} model binding`);
  if (!sameRavScoreModelBinding(runtime.modelBinding, modelBinding)) {
    throw new Error(`${label} belongs to another RavScore model bundle`);
  }
  assertPublicRuntimeDescriptor(runtime.startup, {
    ...startup,
    kind: RAVSCORE_PUBLIC_STARTUP_KIND,
    label: `${label} startup`,
  });
  assertPublicRuntimeDescriptor(runtime.details, {
    ...details,
    kind: RAVSCORE_PUBLIC_DETAILS_KIND,
    label: `${label} details`,
  });
  return true;
}
export function ravScorePublicHorizonValidUntil(productionReferenceAt) {
  const reference = exactUtcHour(productionReferenceAt);
  if (!reference) throw new Error('Public RavScore production reference must be one exact UTC hour');
  return new Date(Date.parse(reference)
    + (RAVSCORE_PUBLIC_FORECAST_HOURS - 1) * 3_600_000).toISOString();
}

export function selectPublicRuntimeAvailability(manifest, {
  now = Date.now(),
  modelBinding = ravScoreModelBinding(),
} = {}) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)
    || manifest.complete !== true
    || typeof manifest.datasetId !== 'string' || !manifest.datasetId
    || manifest.zoneCount !== RAVSCORE_PUBLIC_ZONE_COUNT
    || manifest.coastalPartCount !== RAVSCORE_PUBLIC_COASTAL_PART_COUNT) {
    throw new Error('Public RavScore availability requires one complete 210/673 manifest');
  }
  const evaluatedMs = typeof now === 'number' && Number.isFinite(now) ? now : Number.NaN;
  const generatedAt = canonicalTime(manifest.generatedAt);
  const productionReferenceAt = exactUtcHour(manifest.productionReferenceAt);
  const expectedValidUntil = productionReferenceAt
    ? ravScorePublicHorizonValidUntil(productionReferenceAt)
    : null;
  if (!Number.isFinite(evaluatedMs) || !generatedAt || !productionReferenceAt
    || manifest.validUntil !== expectedValidUntil) {
    throw new Error('Public RavScore manifest lacks its exact common score horizon');
  }
  assertExactPublicRavScoreModelBindingShape(
    manifest.ravScoreModelBinding,
    'public manifest RavScore model binding',
  );
  assertExactPublicRavScoreModelBindingShape(modelBinding, 'expected public RavScore model binding');
  if (!sameRavScoreModelBinding(manifest.ravScoreModelBinding, modelBinding)) {
    throw new Error('Public RavScore emergency data belongs to another model or state binding');
  }
  assertRavScoreVerifiedEvidenceTrust(
    manifest.ravScoreEvidenceTrust,
    'public manifest RavScore evidence trust',
  );
  assertPublicWeatherSourceAge(manifest.weatherSourceAge, {
    productionReferenceAt,
  });
  assertPublicRuntimeManifest(manifest.ravScoreRuntime, {
    modelBinding: manifest.ravScoreModelBinding,
    startup: {
      fileSha256: manifest.publicConditionsSha256,
      bytes: manifest.publicConditionsBytes,
    },
    details: {
      fileSha256: manifest.publicConditionDetailsSha256,
      bytes: manifest.publicConditionDetailsBytes,
    },
    label: 'Public RavScore availability manifest runtime',
  });
  if (evaluatedMs < Date.parse(generatedAt)) {
    throw new Error('Public RavScore manifest is from the future');
  }
  const referenceMs = Date.parse(productionReferenceAt);
  if (evaluatedMs < referenceMs) {
    throw new Error('Public RavScore has no score hour at or before the requested time');
  }
  if (evaluatedMs > Date.parse(expectedValidUntil)) {
    throw new Error('Public RavScore score horizon has expired');
  }
  // generatedAt is only packaging time. The conservative source-age reference
  // is the oldest comparable attested model run (bounded by H0). Providers
  // without a true comparable model issuance remain explicitly unknown.
  const ageReferenceAt = publicWeatherAgeReferenceAt(manifest.weatherSourceAge);
  const ageHours = (evaluatedMs - Date.parse(ageReferenceAt)) / 3_600_000;
  const hasUnknownComparableAge = manifest.weatherSourceAge.unknownComparableAgeCount > 0;
  const mode = !hasUnknownComparableAge
    && ageHours <= RAVSCORE_PUBLIC_FRESH_MAXIMUM_AGE_HOURS
    ? RAVSCORE_PUBLIC_RUNTIME_MODE_FRESH
    : RAVSCORE_PUBLIC_RUNTIME_MODE_EMERGENCY;
  const selectedHourIndex = Math.floor((evaluatedMs - referenceMs) / 3_600_000);
  if (selectedHourIndex < 0 || selectedHourIndex >= RAVSCORE_PUBLIC_FORECAST_HOURS) {
    throw new Error('Public RavScore does not cover the requested UTC hour');
  }
  const selectedReferenceAt = new Date(referenceMs + selectedHourIndex * 3_600_000).toISOString();
  const requestedUtcHour = new Date(Math.floor(evaluatedMs / 3_600_000) * 3_600_000).toISOString();
  if (selectedReferenceAt !== requestedUtcHour) {
    throw new Error('Public RavScore does not cover the exact requested UTC hour');
  }
  return Object.freeze({
    schemaVersion: RAVSCORE_PUBLIC_RUNTIME_AVAILABILITY_SCHEMA_VERSION,
    mode,
    reason: mode === RAVSCORE_PUBLIC_RUNTIME_MODE_FRESH
      ? 'COMPLETE_DATASET_WITHIN_FRESH_WINDOW'
      : hasUnknownComparableAge
        ? 'LATEST_COMPLETE_DATASET_WITH_UNKNOWN_SOURCE_AGE'
        : 'LATEST_COMPLETE_DATASET_WITHIN_SCORE_HORIZON',
    datasetId: manifest.datasetId,
    generatedAt,
    productionReferenceAt,
    ageReferenceAt,
    selectedReferenceAt,
    validUntil: expectedValidUntil,
    evaluatedAt: new Date(evaluatedMs).toISOString(),
    ageHours,
    weatherSourceAge: Object.freeze({ ...manifest.weatherSourceAge }),
    modelBinding: manifest.ravScoreModelBinding,
  });
}

export function assertPublicRuntimeAvailability(value, manifest, options = {}) {
  if (!exactKeys(value, RAVSCORE_PUBLIC_RUNTIME_AVAILABILITY_FIELDS)) {
    throw new Error('Public RavScore availability marker has an inexact field set');
  }
  const expected = selectPublicRuntimeAvailability(manifest, {
    ...options,
    now: Date.parse(value.evaluatedAt),
  });
  if (canonicalPublicRuntimeJson(value) !== canonicalPublicRuntimeJson(expected)) {
    throw new Error('Public RavScore availability marker does not match its manifest');
  }
  return true;
}
