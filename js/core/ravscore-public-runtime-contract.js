import { ravScoreModelBinding } from './ravscore-model-contract.js';
import {
  RAVSCORE_PUBLIC_MODEL_BINDING_FIELDS,
  assertExactPublicRavScoreModelBindingShape,
} from './ravscore-public-profile-contract.js';

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
// Four missed 15-minute production opportunities cover the 45-minute watchdog
// without presenting a multi-hour outage as fresh data.
export const RAVSCORE_PUBLIC_FRESH_MAXIMUM_AGE_HOURS = 1;
export const RAVSCORE_PUBLIC_RUNTIME_AVAILABILITY_SCHEMA_VERSION =
  'ravscore-public-runtime-availability-v1';
export const RAVSCORE_PUBLIC_RUNTIME_MODE_FRESH = 'FRESH';
export const RAVSCORE_PUBLIC_RUNTIME_MODE_EMERGENCY = 'EMERGENCY_LAST_COMPLETE';
export const RAVSCORE_PUBLIC_RUNTIME_AVAILABILITY_FIELDS = Object.freeze([
  'schemaVersion',
  'mode',
  'reason',
  'datasetId',
  'generatedAt',
  'productionReferenceAt',
  'selectedReferenceAt',
  'validUntil',
  'evaluatedAt',
  'ageHours',
  'modelBinding',
]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

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
  const ageMs = evaluatedMs - Date.parse(generatedAt);
  if (ageMs < 0) throw new Error('Public RavScore manifest is from the future');
  const referenceMs = Date.parse(productionReferenceAt);
  if (evaluatedMs < referenceMs) {
    throw new Error('Public RavScore has no score hour at or before the requested time');
  }
  if (evaluatedMs > Date.parse(expectedValidUntil)) {
    throw new Error('Public RavScore score horizon has expired');
  }
  const ageHours = ageMs / 3_600_000;
  const mode = ageHours <= RAVSCORE_PUBLIC_FRESH_MAXIMUM_AGE_HOURS
    ? RAVSCORE_PUBLIC_RUNTIME_MODE_FRESH
    : RAVSCORE_PUBLIC_RUNTIME_MODE_EMERGENCY;
  const selectedHourIndex = mode === RAVSCORE_PUBLIC_RUNTIME_MODE_EMERGENCY
    ? Math.floor((evaluatedMs - referenceMs) / 3_600_000)
    : 0;
  const selectedReferenceAt = new Date(referenceMs + selectedHourIndex * 3_600_000).toISOString();
  return Object.freeze({
    schemaVersion: RAVSCORE_PUBLIC_RUNTIME_AVAILABILITY_SCHEMA_VERSION,
    mode,
    reason: mode === RAVSCORE_PUBLIC_RUNTIME_MODE_FRESH
      ? 'COMPLETE_DATASET_WITHIN_FRESH_WINDOW'
      : 'LATEST_COMPLETE_DATASET_WITHIN_SCORE_HORIZON',
    datasetId: manifest.datasetId,
    generatedAt,
    productionReferenceAt,
    selectedReferenceAt,
    validUntil: expectedValidUntil,
    evaluatedAt: new Date(evaluatedMs).toISOString(),
    ageHours,
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

