import {
  ONE_TIME_GAP_RECONSTRUCTION_DECISION_ID,
  ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID,
  RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION,
  RECONSTRUCTED_TRANSPORT_EVIDENCE_METHOD,
  RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS,
} from './ravscore-regime-memory.js';

const VERIFIED_ONLY_FIELDS = Object.freeze([
  'schemaVersion',
  'status',
  'calibrationEligible',
  'hardObservedOuttransportEligible',
  'incidentId',
  'affectedPartCount',
  'syntheticSampleCount',
  'activeUntil',
]);
const RECONSTRUCTED_FIELDS = Object.freeze([
  'schemaVersion',
  'status',
  'incidentId',
  'decisionId',
  'method',
  'evidenceClassification',
  'calibrationEligible',
  'hardObservedOuttransportEligible',
  'descriptorSha256',
  'affectedPartCount',
  'syntheticSampleCount',
  'activeUntil',
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export const RAVSCORE_VERIFIED_EVIDENCE_TRUST = Object.freeze({
  schemaVersion: 1,
  status: 'VERIFIED_ONLY',
  calibrationEligible: true,
  hardObservedOuttransportEligible: true,
  incidentId: null,
  affectedPartCount: 0,
  syntheticSampleCount: 0,
  activeUntil: null,
});

function exactPlainKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  const actual = Object.keys(value).sort();
  const fields = [...expected].sort();
  return (prototype === Object.prototype || prototype === null)
    && actual.length === fields.length
    && actual.every((field, index) => field === fields[index]);
}

export function assertRavScoreVerifiedEvidenceTrust(
  value,
  label = 'RavScore evidence trust',
) {
  const expected = RAVSCORE_VERIFIED_EVIDENCE_TRUST;
  if (!exactPlainKeys(value, VERIFIED_ONLY_FIELDS)
    || VERIFIED_ONLY_FIELDS.some(field => value[field] !== expected[field])) {
    throw new Error(`${label} is not the exact VERIFIED_ONLY contract`);
  }
  return expected;
}

export function assertRavScoreEvidenceTrust(
  value,
  label = 'RavScore evidence trust',
) {
  if (value?.status === RAVSCORE_VERIFIED_EVIDENCE_TRUST.status) {
    return assertRavScoreVerifiedEvidenceTrust(value, label);
  }
  const activeUntil = typeof value?.activeUntil === 'string'
    && Number.isFinite(Date.parse(value.activeUntil))
    ? new Date(value.activeUntil).toISOString()
    : null;
  if (!exactPlainKeys(value, RECONSTRUCTED_FIELDS)
    || value.schemaVersion !== 1
    || value.status !== RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS
    || value.incidentId !== ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID
    || value.decisionId !== ONE_TIME_GAP_RECONSTRUCTION_DECISION_ID
    || value.method !== RECONSTRUCTED_TRANSPORT_EVIDENCE_METHOD
    || value.evidenceClassification !== RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION
    || value.calibrationEligible !== false
    || value.hardObservedOuttransportEligible !== false
    || !SHA256_PATTERN.test(String(value.descriptorSha256 ?? ''))
    || !Number.isSafeInteger(value.affectedPartCount)
    || value.affectedPartCount < 1
    || value.affectedPartCount > 673
    || !Number.isSafeInteger(value.syntheticSampleCount)
    || value.syntheticSampleCount < value.affectedPartCount
    || activeUntil === null
    || value.activeUntil !== activeUntil) {
    throw new Error(`${label} is not an exact supported trust contract`);
  }
  return Object.freeze({ ...value });
}

export function ravScoreVerifiedEvidenceTrust() {
  return RAVSCORE_VERIFIED_EVIDENCE_TRUST;
}
