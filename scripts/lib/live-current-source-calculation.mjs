import { stateOnlyCurrentRowFieldForbidden } from './state-only-current-row-shape.mjs';
import { RAVSCORE_STATE_ONLY_CURRENT_HOLD_CLOSURE_CONTRACT_ID } from '../../js/core/ravscore-integrated-state-pipeline.js';
import crypto from 'node:crypto';
import { dmiMarineCollectionAllowedForZone } from './dmi-marine-zone-exclusions.mjs';

const COPERNICUS_SOURCES = new Set(['copernicus-baltic-nemo', 'copernicus-nws-amm15']);
const COPERNICUS_SOURCE_CONTRACTS = new Map([
  ['copernicus-baltic-nemo', Object.freeze({
    productId: 'BALTICSEA_ANALYSISFORECAST_PHY_003_006',
    datasetId: 'cmems_mod_bal_phy_anfc_PT1H-i',
    datasetVersion: '202411',
  })],
  ['copernicus-nws-amm15', Object.freeze({
    productId: 'NWSHELF_ANALYSISFORECAST_PHY_004_013',
    datasetId: 'cmems_mod_nws_phy-cur_anfc_1.5km-3D_PT1H-i',
    datasetVersion: '202511',
  })],
]);
const REGIONAL_SOURCE = 'dmi-dkss-lf-regional-proxy';
const OPEN_METEO_SOURCE = 'open-meteo-meteofrance-currents';
const OPEN_METEO_MODEL = 'meteofrance_currents';
const OPEN_METEO_REQUEST_CONTRACT_ID = 'open-meteo-marine-exact-residual-multilocation-v1';
const OPEN_METEO_SELECTION_POLICY_ID = 'explicit-meteofrance-currents-sea-cell-v1';
const OPEN_METEO_RECORD_PROJECTION_CONTRACT_ID = 'open-meteo-live-current-record-fixed-decimal-v1';
const OPEN_METEO_RECORD_REF_CONTRACT_ID = 'open-meteo-current-record-ref-v1';
const OPEN_METEO_PHYSICAL_SCOPE = 'eulerian-waves-and-tides-combined-surface-current';
const OPEN_METEO_SCORE_INPUT_POLICY_ID = 'combined-current-single-channel-no-wave-or-tide-reprojection-v1';
const REGIONAL_CAPTURE_VALID_TOLERANCE_HOURS = 12;
const COPERNICUS_COLD_BRIDGE_HOURS = 48;
const COPERNICUS_PUBLIC_HOUR_COUNT = 118;
const COPERNICUS_PUBLIC_END_OFFSET_HOURS = COPERNICUS_PUBLIC_HOUR_COUNT - 1;
const COPERNICUS_DMI_VERIFIER_CONTRACT_ID = 'dmi-native-current-provenance-v1';
const COPERNICUS_SELECTION_POLICY_ID = 'per-native-time-nearest-shared-uv-column-then-deepest-common-layer-v1';
const COPERNICUS_REQUEST_CONTRACT_ID = 'copernicus-current-multitime-bounded-spatial-shards-v1';
const COPERNICUS_LEGACY_HISTORY_REQUEST_CONTRACT_ID = 'copernicus-current-schema1-history-migration-v1';
const COPERNICUS_RECORD_PROJECTION_CONTRACT_ID = 'copernicus-live-current-record-fixed-decimal-v1';
const COPERNICUS_MODEL_REFERENCE_PROJECTION_CONTRACT_ID = 'copernicus-live-current-record-fixed-decimal-model-reference-v2';
const COPERNICUS_REQUIRED_PAIRS_CONTRACT_ID = 'copernicus-required-part-time-pairs-v1';
const COPERNICUS_OPERATIONAL_SEAL_CONTRACT_ID = 'copernicus-current-operational118-advisory-history48-seal-v1';
const CURRENT_OPERATIONAL_CLOSURE_CONTRACT_ID =
  RAVSCORE_STATE_ONLY_CURRENT_HOLD_CLOSURE_CONTRACT_ID;
const CURRENT_OPERATIONAL_CLOSURE_SAFE_CONTRACT_ID = 'current-operational-673x118-closure-safe-v3';
const CURRENT_OPERATIONAL_ASSIGNMENT_CONTRACT_ID = 'current-operational-source-assignment-v3';
const CURRENT_ADVISORY_ASSIGNMENT_CONTRACT_ID = 'current-advisory-past-model-field-source-assignment-v1';
const CURRENT_ADVISORY_RECORD_REF_CONTRACT_ID = 'current-advisory-copernicus-record-ref-v1';
const CURRENT_OPERATIONAL_SOURCE_ORDER_CONTRACT_ID = 'dmi-verified-then-copernicus-baltic-then-amm15-then-regional-dmi-then-open-meteo-v2';
const REGIONAL_VECTOR_COMMITMENT_CONTRACT_ID = 'regional-dmi-private-vector-commitment-v1';
const CURRENT_OPERATIONAL_TARGET_COUNT = 673;
const CURRENT_OPERATIONAL_TOTAL_PAIR_COUNT = 673 * 118;
const COPERNICUS_BALTIC_CLASSIFICATION = 'COPERNICUS_BALTIC';
const COPERNICUS_AMM15_CLASSIFICATION = 'COPERNICUS_AMM15';
const COPERNICUS_ADVISORY_CLASSIFICATION = 'COPERNICUS_ADVISORY_PAST_MODEL_FIELD';
const REGIONAL_NATIVE_CLASSIFICATION = 'REGIONAL_DMI_NATIVE';
const REGIONAL_HOLD_CLASSIFICATION = 'REGIONAL_DMI_DERIVED_HOLD';
const OPEN_METEO_CLASSIFICATION = 'OPEN_METEO_COMBINED_CURRENT';
export const REGIONAL_STATE_ONLY_HOLD_MARKER_CONTRACT_ID =
  'regional-dmi-exact-state-only-hold-v1';
const REGIONAL_REFERENCE_CONTRACT_ID =
  'regional-dmi-private-native-cadence-reference-v1';
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;

const finite = value => typeof value === 'number' && Number.isFinite(value)
  ? value
  : null;
const rounded = (value, digits) => Number(Number(value).toFixed(digits));
const canonicalTime = value => {
  const explicitUtcOffset = typeof value === 'string'
    && /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  const parsed = explicitUtcOffset ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => (
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    )).join(',')}}`;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError('Non-finite canonical JSON number');
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new TypeError('Unsupported canonical JSON value');
  return serialized;
}

function canonicalSha256(value) {
  return `sha256:${crypto.createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')}`;
}

function exactUtcHour(value) {
  const canonical = canonicalTime(value);
  if (!canonical) return null;
  const date = new Date(canonical);
  if (date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) return null;
  return canonical.replace('.000Z', 'Z');
}

function shiftedHour(value, hours) {
  const canonical = exactUtcHour(value);
  if (!canonical) return null;
  return new Date(Date.parse(canonical) + hours * 3_600_000).toISOString().replace('.000Z', 'Z');
}

function exactPoint(value) {
  return Array.isArray(value) && value.length === 2
    && finite(value[0]) !== null && finite(value[1]) !== null
    ? [value[0], value[1]]
    : null;
}

function fixedDecimal(value, places) {
  const numeric = finite(value);
  if (numeric === null || !Number.isInteger(places) || places < 0) return null;
  const rounded = Number(numeric.toFixed(places));
  if (Math.abs(numeric - rounded) > 10 ** (-(places + 3))) return null;
  return (Object.is(rounded, -0) ? 0 : rounded).toFixed(places);
}

function exactString(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function currentModelReferenceBinding(entry) {
  const proof = entry?.modelReference;
  const fields = ['kind', 'payloadSha256', 'modelRun', 'validTime', 'referenceVariable',
    'referenceIndex', 'forecastPeriodVariable', 'forecastPeriodChecked', 'leadSeconds'];
  if (!exactObjectFields(proof, fields)
    || proof.kind !== 'subset-forecast-reference-time'
    || !SHA256_PATTERN.test(entry.subsetSha256 ?? '') || proof.payloadSha256 !== entry.subsetSha256
    || proof.modelRun !== entry.modelRun || !exactUtcHour(proof.modelRun)
    || proof.validTime !== entry.validTime || !exactUtcHour(proof.validTime)
    || exactString(proof.referenceVariable) === null
    || (proof.referenceIndex !== null && (!Number.isInteger(proof.referenceIndex) || proof.referenceIndex < 0))
    || (proof.forecastPeriodVariable !== null && exactString(proof.forecastPeriodVariable) === null)
    || proof.forecastPeriodChecked !== (proof.forecastPeriodVariable !== null)
    || !Number.isFinite(proof.leadSeconds) || proof.leadSeconds < 0
    || proof.leadSeconds !== (Date.parse(proof.validTime) - Date.parse(proof.modelRun)) / 1000
    || !canonicalTime(entry.acquisitionAt) || Date.parse(proof.modelRun) > Date.parse(entry.acquisitionAt)) return null;
  return { modelRun: proof.modelRun, subsetSha256: entry.subsetSha256, modelReferenceSha256: canonicalSha256(proof) };
}

function copernicusRecordProjectionPayload(entry) {
  const contract = entry?.recordProjectionContractId;
  if (![COPERNICUS_RECORD_PROJECTION_CONTRACT_ID, COPERNICUS_MODEL_REFERENCE_PROJECTION_CONTRACT_ID].includes(contract)) return null;
  // v1 binds acquisition time, not a response forecast-reference time. Do not
  // admit appended, unbound metadata as authority to replace aged valid DMI.
  const modelBinding = contract === COPERNICUS_MODEL_REFERENCE_PROJECTION_CONTRACT_ID ? currentModelReferenceBinding(entry) : {};
  if (!modelBinding || (contract === COPERNICUS_RECORD_PROJECTION_CONTRACT_ID
    && (entry.modelRun != null || entry.modelReference != null))) return null;
  const samplingPoint = exactPoint(entry.samplingPoint);
  const gridPoint = exactPoint(entry.gridPoint);
  const sharedLayerCount = entry.sharedLayerCount;
  if (!samplingPoint || !gridPoint || !Number.isInteger(sharedLayerCount) || sharedLayerCount < 1) return null;
  const decimalValues = {
    samplingLongitude: fixedDecimal(samplingPoint[0], 7),
    samplingLatitude: fixedDecimal(samplingPoint[1], 7),
    gridLongitude: fixedDecimal(gridPoint[0], 7),
    gridLatitude: fixedDecimal(gridPoint[1], 7),
    distanceKm: fixedDecimal(entry.distanceKm, 5),
    verticalLayerM: fixedDecimal(entry.verticalLayerM, 5),
    uMps: fixedDecimal(entry.uMps, 5),
    vMps: fixedDecimal(entry.vMps, 5),
  };
  if (Object.values(decimalValues).some(value => value === null)) return null;
  const stringFields = [
    'recordId', 'acquisitionId', 'collectionId', 'productionReferenceAt',
    'partId', 'parentZoneId', 'targetIdentityFingerprint', 'validTime',
    'acquisitionAt', 'acquisitionStatus', 'requestContractId', 'selectionPolicyId',
    'provider', 'sourceClass', 'source', 'productId', 'datasetId', 'datasetVersion',
    'verticalLayer', 'layerQuality', 'componentPair',
  ];
  if (stringFields.some(field => exactString(entry[field]) === null)) return null;
  if (!SHA256_PATTERN.test(entry.recordId)
    || !SHA256_PATTERN.test(entry.acquisitionId)
    || !SHA256_PATTERN.test(entry.collectionId)
    || !SHA256_PATTERN.test(entry.targetIdentityFingerprint)
    || entry.interpolation !== false
    || entry.vectorSemanticsVersion !== 4) return null;
  return {
    contractId: contract,
    ...modelBinding,
    recordId: entry.recordId,
    acquisitionId: entry.acquisitionId,
    collectionId: entry.collectionId,
    productionReferenceAt: entry.productionReferenceAt,
    partId: entry.partId,
    parentZoneId: entry.parentZoneId,
    targetIdentityFingerprint: entry.targetIdentityFingerprint,
    validTime: entry.validTime,
    acquisitionAt: entry.acquisitionAt,
    acquisitionStatus: entry.acquisitionStatus,
    requestContractId: entry.requestContractId,
    selectionPolicyId: entry.selectionPolicyId,
    provider: entry.provider,
    sourceClass: entry.sourceClass,
    source: entry.source,
    productId: entry.productId,
    datasetId: entry.datasetId,
    datasetVersion: entry.datasetVersion,
    samplingPoint: [decimalValues.samplingLongitude, decimalValues.samplingLatitude],
    gridPoint: [decimalValues.gridLongitude, decimalValues.gridLatitude],
    distanceKm: decimalValues.distanceKm,
    verticalLayer: entry.verticalLayer,
    verticalLayerM: decimalValues.verticalLayerM,
    layerQuality: entry.layerQuality,
    sharedLayerCount: String(sharedLayerCount),
    componentPair: entry.componentPair,
    interpolation: entry.interpolation,
    vectorSemanticsVersion: String(entry.vectorSemanticsVersion),
    uMps: decimalValues.uMps,
    vMps: decimalValues.vMps,
  };
}

export function copernicusLiveRecordProjectionSha256(entry) {
  const payload = copernicusRecordProjectionPayload(entry);
  return payload === null ? null : canonicalSha256(payload);
}

function verifiedCopernicusRecordProjection(entry) {
  if (!SHA256_PATTERN.test(entry?.recordProjectionSha256 ?? '')) return false;
  return copernicusLiveRecordProjectionSha256(entry) === entry.recordProjectionSha256;
}

function openMeteoRecordProjectionPayload(entry) {
  if (!entry || entry.recordProjectionContractId !== OPEN_METEO_RECORD_PROJECTION_CONTRACT_ID) return null;
  if (entry.modelRun != null || entry.modelReference != null) return null;
  const samplingPoint = exactPoint(entry.samplingPoint);
  const gridPoint = exactPoint(entry.gridPoint);
  if (!samplingPoint || !gridPoint) return null;
  const decimalValues = {
    samplingLongitude: fixedDecimal(samplingPoint[0], 7),
    samplingLatitude: fixedDecimal(samplingPoint[1], 7),
    gridLongitude: fixedDecimal(gridPoint[0], 7),
    gridLatitude: fixedDecimal(gridPoint[1], 7),
    distanceKm: fixedDecimal(entry.distanceKm, 5),
    uMps: fixedDecimal(entry.uMps, 5),
    vMps: fixedDecimal(entry.vMps, 5),
  };
  if (Object.values(decimalValues).some(value => value === null)) return null;
  const stringFields = [
    'recordId', 'collectionId', 'productionReferenceAt', 'partId', 'parentZoneId',
    'targetIdentityFingerprint', 'validTime', 'acquisitionAt', 'requestContractId',
    'selectionPolicyId', 'provider', 'sourceClass', 'source', 'model',
    'physicalScope', 'scoreInputPolicyId', 'verticalLayer', 'layerQuality',
    'componentPair',
  ];
  if (stringFields.some(field => exactString(entry[field]) === null)
    || !SHA256_PATTERN.test(entry.recordId)
    || !SHA256_PATTERN.test(entry.collectionId)
    || !SHA256_PATTERN.test(entry.targetIdentityFingerprint)
    || entry.calibrationEligible !== false
    || entry.interpolation !== false
    || entry.vectorSemanticsVersion !== 4) return null;
  return {
    contractId: OPEN_METEO_RECORD_PROJECTION_CONTRACT_ID,
    recordId: entry.recordId,
    collectionId: entry.collectionId,
    productionReferenceAt: entry.productionReferenceAt,
    partId: entry.partId,
    parentZoneId: entry.parentZoneId,
    targetIdentityFingerprint: entry.targetIdentityFingerprint,
    validTime: entry.validTime,
    acquisitionAt: entry.acquisitionAt,
    requestContractId: entry.requestContractId,
    selectionPolicyId: entry.selectionPolicyId,
    provider: entry.provider,
    sourceClass: entry.sourceClass,
    source: entry.source,
    model: entry.model,
    physicalScope: entry.physicalScope,
    scoreInputPolicyId: entry.scoreInputPolicyId,
    calibrationEligible: entry.calibrationEligible,
    samplingPoint: [decimalValues.samplingLongitude, decimalValues.samplingLatitude],
    gridPoint: [decimalValues.gridLongitude, decimalValues.gridLatitude],
    distanceKm: decimalValues.distanceKm,
    verticalLayer: entry.verticalLayer,
    layerQuality: entry.layerQuality,
    componentPair: entry.componentPair,
    interpolation: entry.interpolation,
    vectorSemanticsVersion: String(entry.vectorSemanticsVersion),
    uMps: decimalValues.uMps,
    vMps: decimalValues.vMps,
  };
}

export function openMeteoLiveRecordProjectionSha256(entry) {
  const payload = openMeteoRecordProjectionPayload(entry);
  return payload === null ? null : canonicalSha256(payload);
}

function verifiedOpenMeteoRecordProjection(entry) {
  return SHA256_PATTERN.test(entry?.recordProjectionSha256 ?? '')
    && openMeteoLiveRecordProjectionSha256(entry) === entry.recordProjectionSha256;
}

function exactObjectFields(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join('\u0000') === [...expected].sort().join('\u0000');
}

function point(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const longitude = finite(value[0]);
  const latitude = finite(value[1]);
  return longitude === null || latitude === null ? null : [longitude, latitude];
}

function samePoint(first, second, tolerance = 1e-7) {
  const a = point(first);
  const b = point(second);
  return Boolean(a && b && Math.abs(a[0] - b[0]) <= tolerance && Math.abs(a[1] - b[1]) <= tolerance);
}

function expectedParentZoneId(part) {
  const value = part?.zoneId ?? part?.parentZoneId ?? part?.sourceZoneId;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function targetIdentityFingerprint(part) {
  const samplingPoint = point(part?.waterPoint);
  const parentZoneId = expectedParentZoneId(part);
  if (typeof part?.partId !== 'string' || part.partId.length === 0
    || parentZoneId === null || !samplingPoint) return null;
  const payload = JSON.stringify({
    schemaVersion: 1,
    targets: [[
      part.partId,
      parentZoneId,
      samplingPoint[0].toFixed(7),
      samplingPoint[1].toFixed(7),
    ]],
  });
  return `sha256:${crypto.createHash('sha256').update(payload).digest('hex')}`;
}

function captureMatchesValidTime(source, maximumHours) {
  const capturedAt = canonicalTime(source?.capturedAt);
  const validTime = canonicalTime(source?.validTime);
  return capturedAt !== null && validTime !== null
    && Math.abs(Date.parse(validTime) - Date.parse(capturedAt)) <= maximumHours * 3_600_000;
}

function regionalSampleTimeValid(source) {
  const referenceAt = exactUtcHour(source?.productionReferenceAt);
  const capturedAt = canonicalTime(source?.capturedAt);
  const validTime = canonicalTime(source?.validTime);
  if (!referenceAt || !capturedAt || !validTime) return false;
  if (Date.parse(validTime) >= Date.parse(referenceAt)) {
    return Date.parse(validTime) <= Date.parse(shiftedHour(
      referenceAt,
      COPERNICUS_PUBLIC_END_OFFSET_HOURS,
    ));
  }
  return captureMatchesValidTime(source, REGIONAL_CAPTURE_VALID_TOLERANCE_HOURS);
}

function haversineKm(first, second) {
  const a = point(first);
  const b = point(second);
  if (!a || !b) return Infinity;
  const radians = degrees => degrees * Math.PI / 180;
  const dLat = radians(b[1] - a[1]);
  const dLon = radians(b[0] - a[0]);
  const lat1 = radians(a[1]);
  const lat2 = radians(b[1]);
  const term = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(term), Math.sqrt(Math.max(0, 1 - term)));
}

export function verifiedLivePilotSource(source, part, { requireStatus = false } = {}) {
  if (!source || (requireStatus && source.status !== 'verified')) return null;
  const expectedSamplingPoint = part?.waterPoint;
  const parentZoneId = expectedParentZoneId(part);
  const identityFingerprint = targetIdentityFingerprint(part);
  if (typeof part?.partId !== 'string' || part.partId.length === 0
    || parentZoneId === null
    || source.partId !== part.partId
    || source.parentZoneId !== parentZoneId
    || source.targetIdentityFingerprint !== identityFingerprint) return null;
  if (source.controlledLivePilot !== true || source.vectorSemanticsVersion !== 4) return null;
  if (exactString(source.componentPair) === null
    || source.interpolation !== false
    || typeof source.verticalLayer !== 'string'
    || source.verticalLayer.length === 0) return null;
  if (!samePoint(source.samplingPoint, expectedSamplingPoint)) return null;
  const gridPoint = point(source.gridPoint);
  const distanceKm = finite(source.distanceKm);
  if (!gridPoint || distanceKm === null || distanceKm < 0) return null;

  let maximumDistanceKm;
  let arrowSource;
  if (
    source.sourceClass === 'supplemental-local-current'
    && String(source.provider ?? '').toLowerCase() === 'copernicus'
    && COPERNICUS_SOURCES.has(source.source)
  ) {
    const contract = COPERNICUS_SOURCE_CONTRACTS.get(source.source);
    if (!contract
      || source.productId !== contract.productId
      || source.datasetId !== contract.datasetId
      || source.datasetVersion !== contract.datasetVersion
      || source.acquisitionStatus !== 'COMPLETE'
      || source.componentPair !== 'same-time-cell-layer'
      || source.selectionPolicyId !== COPERNICUS_SELECTION_POLICY_ID
      || source.capturedAt !== source.acquisitionAt
      || finite(source.verticalLayerM) === null
      || finite(source.verticalLayerRankM) === null
      || source.verticalLayerM !== source.verticalLayerRankM
      || !Number.isInteger(source.sharedLayerCount)
      || source.sharedLayerCount < 1
      || !verifiedCopernicusRecordProjection(source)) return null;
    const productionReferenceAt = exactUtcHour(source.productionReferenceAt);
    const validTime = exactUtcHour(source.validTime);
    const acquisitionAt = canonicalTime(source.acquisitionAt);
    if (!productionReferenceAt || !validTime || !acquisitionAt
      || Date.parse(validTime) < Date.parse(shiftedHour(productionReferenceAt, -COPERNICUS_COLD_BRIDGE_HOURS))
      || Date.parse(validTime) > Date.parse(shiftedHour(productionReferenceAt, COPERNICUS_PUBLIC_END_OFFSET_HOURS))) return null;
    if (Date.parse(validTime) >= Date.parse(productionReferenceAt)) {
      if (source.requestContractId !== COPERNICUS_REQUEST_CONTRACT_ID) return null;
    } else if (![COPERNICUS_REQUEST_CONTRACT_ID, COPERNICUS_LEGACY_HISTORY_REQUEST_CONTRACT_ID]
      .includes(source.requestContractId)) return null;
    maximumDistanceKm = 5;
    arrowSource = 'copernicus-current-grid';
  } else if (
    source.sourceClass === 'external-combined-surface-current'
    && String(source.provider ?? '').toLowerCase() === 'open-meteo'
    && source.source === OPEN_METEO_SOURCE
  ) {
    const productionReferenceAt = exactUtcHour(source.productionReferenceAt);
    const validTime = exactUtcHour(source.validTime);
    const acquisitionAt = canonicalTime(source.acquisitionAt);
    if (source.model !== OPEN_METEO_MODEL
      || source.requestContractId !== OPEN_METEO_REQUEST_CONTRACT_ID
      || source.selectionPolicyId !== OPEN_METEO_SELECTION_POLICY_ID
      || source.physicalScope !== OPEN_METEO_PHYSICAL_SCOPE
      || source.scoreInputPolicyId !== OPEN_METEO_SCORE_INPUT_POLICY_ID
      || source.calibrationEligible !== false
      || source.capturedAt !== source.acquisitionAt
      || source.verticalLayer !== 'surface'
      || source.layerQuality !== 'combined-surface-current'
      || source.componentPair !== 'derived-speed-toward-direction-same-hour'
      || !verifiedOpenMeteoRecordProjection(source)
      || !productionReferenceAt || !validTime || !acquisitionAt
      || Date.parse(validTime) < Date.parse(productionReferenceAt)
      || Date.parse(validTime) > Date.parse(shiftedHour(
        productionReferenceAt, COPERNICUS_PUBLIC_END_OFFSET_HOURS,
      ))) return null;
    maximumDistanceKm = 15;
    arrowSource = 'supplemental-current-grid';
  } else if (
    source.sourceClass === 'owner-approved-regional-proxy'
    && String(source.provider ?? '').toLowerCase() === 'dmi'
    && source.source === REGIONAL_SOURCE
    && source.collection === 'dkss_lf'
  ) {
    const modelRun = canonicalTime(source.modelRun);
    const validTime = canonicalTime(source.validTime);
    const sourceValidTime = canonicalTime(source.sourceValidTime);
    if (!modelRun || !validTime || !sourceValidTime
      || Date.parse(modelRun) > Date.parse(sourceValidTime)
      || source.classification !== REGIONAL_NATIVE_CLASSIFICATION
      || source.componentPair !== 'same-time-cell-layer'
      || sourceValidTime !== validTime
      || !regionalSampleTimeValid({ ...source, validTime: source.sourceValidTime })) return null;
    maximumDistanceKm = 15;
    arrowSource = 'dmi-regional-proxy-grid';
  } else {
    return null;
  }
  const physicalDistanceKm = haversineKm(expectedSamplingPoint, gridPoint);
  if (distanceKm > maximumDistanceKm
    || physicalDistanceKm > maximumDistanceKm + 0.01
    || Math.abs(physicalDistanceKm - distanceKm) > 0.02) return null;
  return { gridPoint, distanceKm, maximumDistanceKm, arrowSource };
}

export function eligibleLivePilotSource(source, part, options = {}) {
  return dmiMarineCollectionAllowedForZone(source?.collection, expectedParentZoneId(part))
    ? verifiedLivePilotSource(source, part, options) : null;
}

export { COPERNICUS_SOURCES, COPERNICUS_SOURCE_CONTRACTS, REGIONAL_SOURCE, OPEN_METEO_SOURCE, OPEN_METEO_MODEL, OPEN_METEO_REQUEST_CONTRACT_ID, OPEN_METEO_SELECTION_POLICY_ID, OPEN_METEO_RECORD_PROJECTION_CONTRACT_ID, OPEN_METEO_RECORD_REF_CONTRACT_ID, OPEN_METEO_PHYSICAL_SCOPE, OPEN_METEO_SCORE_INPUT_POLICY_ID, REGIONAL_CAPTURE_VALID_TOLERANCE_HOURS, COPERNICUS_COLD_BRIDGE_HOURS, COPERNICUS_PUBLIC_HOUR_COUNT, COPERNICUS_PUBLIC_END_OFFSET_HOURS, COPERNICUS_DMI_VERIFIER_CONTRACT_ID, COPERNICUS_SELECTION_POLICY_ID, COPERNICUS_REQUEST_CONTRACT_ID, COPERNICUS_LEGACY_HISTORY_REQUEST_CONTRACT_ID, COPERNICUS_RECORD_PROJECTION_CONTRACT_ID, COPERNICUS_MODEL_REFERENCE_PROJECTION_CONTRACT_ID, COPERNICUS_REQUIRED_PAIRS_CONTRACT_ID, COPERNICUS_OPERATIONAL_SEAL_CONTRACT_ID, CURRENT_OPERATIONAL_CLOSURE_CONTRACT_ID, CURRENT_OPERATIONAL_CLOSURE_SAFE_CONTRACT_ID, CURRENT_OPERATIONAL_ASSIGNMENT_CONTRACT_ID, CURRENT_ADVISORY_ASSIGNMENT_CONTRACT_ID, CURRENT_ADVISORY_RECORD_REF_CONTRACT_ID, CURRENT_OPERATIONAL_SOURCE_ORDER_CONTRACT_ID, REGIONAL_VECTOR_COMMITMENT_CONTRACT_ID, CURRENT_OPERATIONAL_TARGET_COUNT, CURRENT_OPERATIONAL_TOTAL_PAIR_COUNT, COPERNICUS_BALTIC_CLASSIFICATION, COPERNICUS_AMM15_CLASSIFICATION, COPERNICUS_ADVISORY_CLASSIFICATION, REGIONAL_NATIVE_CLASSIFICATION, REGIONAL_HOLD_CLASSIFICATION, OPEN_METEO_CLASSIFICATION, REGIONAL_REFERENCE_CONTRACT_ID, SHA256_PATTERN, finite, rounded, canonicalTime, canonicalJson, canonicalSha256, exactUtcHour, shiftedHour, exactPoint, fixedDecimal, exactString, currentModelReferenceBinding, copernicusRecordProjectionPayload, verifiedCopernicusRecordProjection, openMeteoRecordProjectionPayload, verifiedOpenMeteoRecordProjection, exactObjectFields, point, samePoint, expectedParentZoneId, targetIdentityFingerprint, captureMatchesValidTime, regionalSampleTimeValid, haversineKm };

const REGIONAL_STATE_ONLY_HOLD_MARKER_FIELDS = Object.freeze([
  'contractId',
  'status',
  'classification',
  'stateOnly',
  'partId',
  'parentZoneId',
  'targetIdentityFingerprint',
  'validTime',
  'sourceValidTime',
  'holdAgeHours',
  'provider',
  'sourceClass',
  'source',
  'collection',
  'modelRun',
  'closureContractId',
  'closureId',
  'closureAssignmentSha256',
  'sourceAssetSha256',
  'sourceProofSha256',
  'vectorCommitmentSha256',
]);
const REGIONAL_HOLD_FORBIDDEN_VECTOR_FIELDS = Object.freeze([
  'samplingPoint', 'samplePoint', 'samplingCoordinates', 'gridPoint', 'gridIndex',
  'gridCell', 'gridCoordinates', 'nativeGrid', 'distanceKm', 'verticalLayer',
  'verticalLayerM', 'verticalLayerRankM', 'layerQuality', 'componentPair',
  'interpolation', 'vectorSemanticsVersion', 'vectorSelection', 'rawVector',
  'uMps', 'vMps', 'rawU', 'rawV', 'rawUMps', 'rawVMps', 'uo', 'vo',
  'eastwardCurrent', 'northwardCurrent', 'eastwardSeaWaterVelocity',
  'northwardSeaWaterVelocity', 'currentUMps', 'currentVMps',
  'currentSpeedMps', 'currentDirectionDeg', 'currentCoastNormalSpeedMps',
  'currentAlignment', 'currentGridPoint', 'currentSamplingPoint', 'currentVector',
  'currentArrow', 'currentArrowSource', 'flowPoints', 'arrow', 'arrowSource',
]);
function regionalHoldSourceForbiddenFields(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return [];
  return Object.keys(source).filter(field => {
    if (REGIONAL_HOLD_FORBIDDEN_VECTOR_FIELDS.includes(field)) return true;
    const normalized = String(field).replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (['currentvectoravailable', 'arrowavailable'].includes(normalized)) return false;
    if (['currentprovenance', 'currentstateonlyhold'].includes(normalized)) return true;
    return stateOnlyCurrentRowFieldForbidden(field);
  });
}

export function eligibleStateOnlyCurrentHold(source, rowTime, part) {
  return dmiMarineCollectionAllowedForZone(source?.collection, expectedParentZoneId(part))
    ? verifiedStateOnlyCurrentHold(source, rowTime, part) : null;
}

export function verifiedStateOnlyCurrentHold(source, rowTime, part) {
  const rowCanonical = canonicalTime(rowTime);
  const validTime = exactUtcHour(source?.validTime);
  const sourceValidTime = exactUtcHour(source?.sourceValidTime);
  const modelRun = exactUtcHour(source?.modelRun);
  const parentZoneId = expectedParentZoneId(part);
  const holdAgeHours = source?.holdAgeHours;
  if (!rowCanonical || !validTime || !sourceValidTime || !modelRun
    || canonicalTime(validTime) !== rowCanonical
    || source?.validTime !== validTime
    || source?.sourceValidTime !== sourceValidTime
    || source?.modelRun !== modelRun
    || Date.parse(modelRun) > Date.parse(sourceValidTime)
    || !Number.isInteger(holdAgeHours) || holdAgeHours < 1 || holdAgeHours > 3
    || Date.parse(validTime) - Date.parse(sourceValidTime) !== holdAgeHours * 3_600_000
    || source?.status !== 'verified-derived-state-only'
    || source?.classification !== REGIONAL_HOLD_CLASSIFICATION
    || source?.stateOnly !== true
    || source?.currentVectorAvailable !== false
    || source?.arrowAvailable !== false
    || source?.controlledLivePilot !== true
    || source?.temporalResolution !== 'native-cadence-derived-state-hold'
    || source?.fallback !== false
    || !Array.isArray(source?.nativeValidTimes)
    || source.nativeValidTimes.length !== 1
    || canonicalTime(source.nativeValidTimes[0]) !== canonicalTime(sourceValidTime)
    || source?.partId !== part?.partId
    || parentZoneId === null
    || source?.parentZoneId !== parentZoneId
    || source?.targetIdentityFingerprint !== targetIdentityFingerprint(part)
    || source?.provider !== 'dmi'
    || source?.sourceClass !== 'owner-approved-regional-proxy'
    || source?.source !== REGIONAL_SOURCE
    || source?.collection !== 'dkss_lf'
    || source?.closureContractId !== CURRENT_OPERATIONAL_CLOSURE_CONTRACT_ID
    || !SHA256_PATTERN.test(source?.closureId ?? '')
    || !SHA256_PATTERN.test(source?.closureAssignmentSha256 ?? '')
    || !SHA256_PATTERN.test(source?.sourceAssetSha256 ?? '')
    || !SHA256_PATTERN.test(source?.sourceProofSha256 ?? '')
    || !SHA256_PATTERN.test(source?.vectorCommitmentSha256 ?? '')
    || regionalHoldSourceForbiddenFields(source).length > 0
    || !regionalSampleTimeValid(source)) return null;
  const identity = {
    partId: source.partId,
    validTime,
    classification: REGIONAL_HOLD_CLASSIFICATION,
    sourceValidTime,
    sourceModelRun: modelRun,
    sourceAssetSha256: source.sourceAssetSha256,
    sourceProofSha256: source.sourceProofSha256,
    vectorCommitmentSha256: source.vectorCommitmentSha256,
    holdAgeHours,
  };
  if (canonicalSha256({
    schemaVersion: 1,
    contractId: CURRENT_OPERATIONAL_ASSIGNMENT_CONTRACT_ID,
    assignment: identity,
  }) !== source.closureAssignmentSha256) return null;
  const marker = {
    contractId: REGIONAL_STATE_ONLY_HOLD_MARKER_CONTRACT_ID,
    status: source.status,
    classification: source.classification,
    stateOnly: true,
    partId: source.partId,
    parentZoneId: source.parentZoneId,
    targetIdentityFingerprint: source.targetIdentityFingerprint,
    validTime,
    sourceValidTime,
    holdAgeHours,
    provider: source.provider,
    sourceClass: source.sourceClass,
    source: source.source,
    collection: source.collection,
    modelRun,
    closureContractId: source.closureContractId,
    closureId: source.closureId,
    closureAssignmentSha256: source.closureAssignmentSha256,
    sourceAssetSha256: source.sourceAssetSha256,
    sourceProofSha256: source.sourceProofSha256,
    vectorCommitmentSha256: source.vectorCommitmentSha256,
  };
  return exactObjectFields(marker, REGIONAL_STATE_ONLY_HOLD_MARKER_FIELDS)
    ? marker
    : null;
}

export { REGIONAL_STATE_ONLY_HOLD_MARKER_FIELDS, REGIONAL_HOLD_FORBIDDEN_VECTOR_FIELDS, regionalHoldSourceForbiddenFields };
