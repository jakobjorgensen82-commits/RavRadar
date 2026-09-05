import crypto from 'node:crypto';

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
const COPERNICUS_FUTURE_ACQUISITION_FRESHNESS_HOURS = 4;
const COPERNICUS_DMI_VERIFIER_CONTRACT_ID = 'dmi-native-current-provenance-v1';
const COPERNICUS_SELECTION_POLICY_ID = 'per-native-time-nearest-shared-uv-column-then-deepest-common-layer-v1';
const COPERNICUS_REQUEST_CONTRACT_ID = 'copernicus-current-multitime-bounded-spatial-shards-v1';
const COPERNICUS_LEGACY_HISTORY_REQUEST_CONTRACT_ID = 'copernicus-current-schema1-history-migration-v1';
const COPERNICUS_RECORD_PROJECTION_CONTRACT_ID = 'copernicus-live-current-record-fixed-decimal-v1';
const COPERNICUS_REQUIRED_PAIRS_CONTRACT_ID = 'copernicus-required-part-time-pairs-v1';
const COPERNICUS_OPERATIONAL_SEAL_CONTRACT_ID = 'copernicus-current-operational118-advisory-history48-seal-v1';
const CURRENT_OPERATIONAL_CLOSURE_CONTRACT_ID = 'current-operational-673x118-closure-ready-v2';
const CURRENT_OPERATIONAL_CLOSURE_SAFE_CONTRACT_ID = 'current-operational-673x118-closure-safe-v2';
const CURRENT_OPERATIONAL_ASSIGNMENT_CONTRACT_ID = 'current-operational-source-assignment-v2';
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
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
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
const STATE_ONLY_CURRENT_ROW_FORBIDDEN_EXACT_FIELDS = new Set([
  'current', 'u', 'v', 'umps', 'vmps', 'rawu', 'rawv', 'rawumps', 'rawvmps',
  'uo', 'vo', 'eastwardcurrent', 'northwardcurrent',
  'eastwardseawatervelocity', 'northwardseawatervelocity',
  'samplingpoint', 'samplepoint', 'samplingcoordinates', 'gridpoint', 'gridindex',
  'gridcell', 'gridcoordinates', 'nativegrid', 'distancekm', 'verticallayer', 'verticallayerm',
  'verticallayerrankm', 'layerquality', 'sharedlayercount', 'componentpair',
  'interpolation', 'vectorsemanticsversion', 'vectorselection', 'vector', 'rawvector',
  'coastnormal', 'coastnormalspeedmps', 'coastnormalcurrentmps',
  'onshorecurrentmps', 'crossshorecurrentmps', 'alongshorecurrentmps',
  'flowpoints', 'flowarrow', 'flowarrows',
  'arrow', 'arrowsource', 'arrowavailable',
]);

function stateOnlyCurrentRowFieldForbidden(field) {
  const normalized = String(field).replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (STATE_ONLY_CURRENT_ROW_FORBIDDEN_EXACT_FIELDS.has(normalized)) return true;
  if (normalized.startsWith('arrow')) return true;
  if (!normalized.startsWith('current')) return false;
  return !['currentprovenance', 'currentstateonlyhold'].includes(normalized);
}

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

export function stateOnlyCurrentRowForbiddenFields(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return [];
  return Object.keys(row).filter(stateOnlyCurrentRowFieldForbidden);
}

export function stripStateOnlyCurrentRowProjection(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return {};
  const stripped = Object.fromEntries(Object.entries(row)
    .filter(([field]) => !stateOnlyCurrentRowFieldForbidden(field)));
  if (stripped.sources && typeof stripped.sources === 'object'
    && !Array.isArray(stripped.sources)) {
    const sources = { ...stripped.sources };
    delete sources.current;
    stripped.sources = sources;
  }
  return stripped;
}
const COPERNICUS_RANGE_SEAL_FIELDS = Object.freeze([
  'collectionId',
  'status',
  'productionReferenceAt',
  'rangeStartAt',
  'rangeEndAt',
  'coldBridgeHours',
  'publicHourCount',
  'targetRegistrySha256',
  'dmiCurrentInputSha256',
  'dmiVerifierContractId',
  'requiredPairsSha256',
  'requiredPairCount',
  'selectionPolicyId',
  'recordRefsSha256',
  'sealedAt',
]);
const COPERNICUS_OPERATIONAL_RANGE_SEAL_FIELDS = Object.freeze([
  'collectionId',
  'status',
  'sealContractId',
  'productionReferenceAt',
  'operationalRangeStartAt',
  'operationalRangeEndAt',
  'operationalHourCount',
  'advisoryHistoryStartAt',
  'advisoryHistoryEndAt',
  'advisoryHistoryHourCount',
  'targetRegistrySha256',
  'dmiCurrentInputSha256',
  'dmiVerifierContractId',
  'operationalRequiredPairsSha256',
  'operationalRequiredPairCount',
  'operationalRecordRefsSha256',
  'advisoryHistoryRequiredPairsSha256',
  'advisoryHistoryRequiredPairCount',
  'advisoryHistoryRecordRefsSha256',
  'advisoryHistoryAvailablePairCount',
  'advisoryHistoryMissingPairCount',
  'advisoryHistoryComplete',
  'selectionPolicyId',
  'sealedAt',
]);
const COPERNICUS_DOCUMENT_PROOFS = new WeakMap();
const CLOSURE_DOCUMENT_PROOFS = new WeakMap();
const ADVISORY_DOCUMENT_PROOFS = new WeakMap();
const CURRENT_OPERATIONAL_CLOSURE_SAFE_FIELDS = Object.freeze([
  'schemaVersion', 'contractId', 'closureId', 'safeProjectionSha256', 'status', 'productionReferenceAt',
  'operationalRangeEndAt', 'targetCount', 'operationalHourCount', 'totalPairCount',
  'sourceOrderContractId', 'dmiVerifiedPairCount', 'copernicusBalticPairCount',
  'copernicusAmm15PairCount', 'regionalNativePairCount',
  'regionalDerivedHoldPairCount', 'regionalResidualPairCount',
  'openMeteoRequiredPairCount', 'openMeteoPairCount',
  'supplementalAssignmentCount', 'missingPairCount',
  'copernicusCompleteWithoutSourceStage', 'copernicusSourceStageStatus',
  'copernicusBoundedProgressAccepted', 'targetRegistrySha256',
  'dmiCurrentInputSha256', 'dmiLedgerSha256', 'dmiAttestationSha256',
  'copernicusRegistrySha256', 'copernicusShadowSha256',
  'copernicusSourceStageSha256', 'copernicusRecordRefsSha256',
  'regionalEvidenceSha256', 'regionalPolicySha256', 'regionalPairRefsSha256',
  'openMeteoDocumentSha256', 'openMeteoRecordRefsSha256',
  'openMeteoPhysicalScope', 'openMeteoScoreInputPolicyId',
  'openMeteoCalibrationEligible',
  'advisoryHistoryRequiredPairCount', 'advisoryHistoryRequiredPairsSha256',
  'advisoryHistoryAvailablePairCount', 'advisoryHistoryMissingPairCount',
  'advisoryHistoryRecordRefsSha256', 'advisoryHistoryAssignmentCount',
  'advisoryHistoryAssignmentsSha256',
  'supplementalAssignmentsSha256', 'assignmentsSha256', 'coordinatesIncluded',
  'rawVectorsIncluded', 'partIdsIncluded', 'pairRefsIncluded',
]);
const SOURCE_ORDER = new Map([
  ['copernicus-baltic-nemo', 0],
  ['copernicus-nws-amm15', 1],
  [REGIONAL_SOURCE, 2],
  [OPEN_METEO_SOURCE, 3],
]);

// This module is a model-input trust boundary. JSON numbers are accepted;
// numeric strings, booleans and other coercible values are not evidence.
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

function copernicusRecordProjectionPayload(entry) {
  if (!entry || entry.recordProjectionContractId !== COPERNICUS_RECORD_PROJECTION_CONTRACT_ID) return null;
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
    contractId: COPERNICUS_RECORD_PROJECTION_CONTRACT_ID,
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

function basicControlledLiveDocument(document) {
  return document?.schemaVersion === 1
    && document?.controlledLivePilot === true
    && document?.mode === 'controlled-live'
    && document?.enabled === true
    && document?.credentialsIncluded === false
    && typeof document?.targetFingerprint === 'string'
    && SHA256_PATTERN.test(document.targetFingerprint)
    && Array.isArray(document?.entries)
    && Array.isArray(document?.advisoryEntries);
}

function buildCopernicusDocumentProof(document) {
  if (!basicControlledLiveDocument(document)) return null;
  const seal = document.copernicusRangeSeal;
  const operationalSeal = seal?.status === 'OPERATIONAL_COMPLETE';
  const sealFields = operationalSeal
    ? COPERNICUS_OPERATIONAL_RANGE_SEAL_FIELDS
    : COPERNICUS_RANGE_SEAL_FIELDS;
  if (!exactObjectFields(seal, sealFields)
    || (!operationalSeal && seal.status !== 'COMPLETE')
    || seal.dmiVerifierContractId !== COPERNICUS_DMI_VERIFIER_CONTRACT_ID
    || seal.selectionPolicyId !== COPERNICUS_SELECTION_POLICY_ID
    || seal.targetRegistrySha256 !== document.targetFingerprint
    || !SHA256_PATTERN.test(seal.collectionId)
    || !SHA256_PATTERN.test(seal.targetRegistrySha256)
    || !SHA256_PATTERN.test(seal.dmiCurrentInputSha256)
    || (operationalSeal
      ? (seal.sealContractId !== COPERNICUS_OPERATIONAL_SEAL_CONTRACT_ID
        || seal.operationalHourCount !== COPERNICUS_PUBLIC_HOUR_COUNT
        || seal.advisoryHistoryHourCount !== COPERNICUS_COLD_BRIDGE_HOURS
        || !SHA256_PATTERN.test(seal.operationalRequiredPairsSha256)
        || !SHA256_PATTERN.test(seal.operationalRecordRefsSha256)
        || !SHA256_PATTERN.test(seal.advisoryHistoryRequiredPairsSha256)
        || !SHA256_PATTERN.test(seal.advisoryHistoryRecordRefsSha256)
        || !Number.isInteger(seal.operationalRequiredPairCount)
        || seal.operationalRequiredPairCount < 0
        || !Number.isInteger(seal.advisoryHistoryRequiredPairCount)
        || seal.advisoryHistoryRequiredPairCount < 0
        || !Number.isInteger(seal.advisoryHistoryAvailablePairCount)
        || seal.advisoryHistoryAvailablePairCount < 0
        || !Number.isInteger(seal.advisoryHistoryMissingPairCount)
        || seal.advisoryHistoryMissingPairCount < 0
        || seal.advisoryHistoryAvailablePairCount + seal.advisoryHistoryMissingPairCount
          !== seal.advisoryHistoryRequiredPairCount
        || seal.advisoryHistoryComplete !== (seal.advisoryHistoryMissingPairCount === 0))
      : (seal.coldBridgeHours !== COPERNICUS_COLD_BRIDGE_HOURS
        || seal.publicHourCount !== COPERNICUS_PUBLIC_HOUR_COUNT
        || !SHA256_PATTERN.test(seal.requiredPairsSha256)
        || !SHA256_PATTERN.test(seal.recordRefsSha256)
        || !Number.isInteger(seal.requiredPairCount)
        || seal.requiredPairCount < 0))) return null;
  const referenceAt = exactUtcHour(seal.productionReferenceAt);
  const rangeStartAt = exactUtcHour(
    operationalSeal ? seal.advisoryHistoryStartAt : seal.rangeStartAt,
  );
  const rangeEndAt = exactUtcHour(
    operationalSeal ? seal.operationalRangeEndAt : seal.rangeEndAt,
  );
  const sealedAt = canonicalTime(seal.sealedAt);
  if (!referenceAt || !rangeStartAt || !rangeEndAt || !sealedAt
    || rangeStartAt !== shiftedHour(referenceAt, -COPERNICUS_COLD_BRIDGE_HOURS)
    || rangeEndAt !== shiftedHour(referenceAt, COPERNICUS_PUBLIC_END_OFFSET_HOURS)
    || (operationalSeal
      && (exactUtcHour(seal.operationalRangeStartAt) !== referenceAt
        || exactUtcHour(seal.advisoryHistoryEndAt) !== shiftedHour(referenceAt, -1)))
    || Math.abs(Date.parse(sealedAt) - Date.parse(referenceAt))
      > COPERNICUS_FUTURE_ACQUISITION_FRESHNESS_HOURS * 3_600_000) return null;

  const copernicusEntries = document.entries.filter(entry => (
    entry?.provider === 'copernicus'
    || entry?.sourceClass === 'supplemental-local-current'
    || entry?.recordProjectionContractId === COPERNICUS_RECORD_PROJECTION_CONTRACT_ID
  ));
  const expectedEntryCount = operationalSeal
    ? seal.operationalRequiredPairCount + seal.advisoryHistoryAvailablePairCount
    : seal.requiredPairCount;
  if (copernicusEntries.length !== expectedEntryCount) return null;
  const entryMembership = new WeakSet();
  const entrySha256ByObject = new WeakMap();
  const refs = [];
  const seenPairs = new Set();
  const seenRecordIds = new Set();
  for (const entry of copernicusEntries) {
    const validTime = exactUtcHour(entry?.validTime);
    const acquisitionAt = canonicalTime(entry?.acquisitionAt);
    if (entry?.provider !== 'copernicus'
      || entry?.sourceClass !== 'supplemental-local-current'
      || entry?.collectionId !== seal.collectionId
      || entry?.productionReferenceAt !== seal.productionReferenceAt
      || entry?.acquisitionStatus !== 'COMPLETE'
      || entry?.selectionPolicyId !== COPERNICUS_SELECTION_POLICY_ID
      || entry?.capturedAt !== entry?.acquisitionAt
      || !validTime || !acquisitionAt
      || Date.parse(validTime) < Date.parse(rangeStartAt)
      || Date.parse(validTime) > Date.parse(rangeEndAt)
      || Date.parse(acquisitionAt) > Date.parse(sealedAt)
      || !verifiedCopernicusRecordProjection(entry)) return null;
    const contract = COPERNICUS_SOURCE_CONTRACTS.get(entry.source);
    if (!contract
      || entry.productId !== contract.productId
      || entry.datasetId !== contract.datasetId
      || entry.datasetVersion !== contract.datasetVersion
      || entry.componentPair !== 'same-time-cell-layer'
      || entry.interpolation !== false
      || entry.vectorSemanticsVersion !== 4
      || finite(entry.verticalLayerM) === null
      || finite(entry.verticalLayerRankM) === null
      || entry.verticalLayerM !== entry.verticalLayerRankM) return null;
    const validAtOrAfterReference = Date.parse(validTime) >= Date.parse(referenceAt);
    if (validAtOrAfterReference
      && (entry.requestContractId !== COPERNICUS_REQUEST_CONTRACT_ID
        || Math.abs(Date.parse(acquisitionAt) - Date.parse(referenceAt))
          > COPERNICUS_FUTURE_ACQUISITION_FRESHNESS_HOURS * 3_600_000)) return null;
    if (!validAtOrAfterReference
      && ![COPERNICUS_REQUEST_CONTRACT_ID, COPERNICUS_LEGACY_HISTORY_REQUEST_CONTRACT_ID]
        .includes(entry.requestContractId)) return null;
    const pairKey = `${entry.partId}\u0000${validTime}`;
    if (seenPairs.has(pairKey) || seenRecordIds.has(entry.recordId)) return null;
    seenPairs.add(pairKey);
    seenRecordIds.add(entry.recordId);
    refs.push({
      partId: entry.partId,
      validTime,
      recordId: entry.recordId,
      acquisitionId: entry.acquisitionId,
      source: entry.source,
    });
    entryMembership.add(entry);
    entrySha256ByObject.set(entry, canonicalSha256(entry));
  }
  refs.sort((left, right) => left.validTime.localeCompare(right.validTime)
    || left.partId.localeCompare(right.partId));
  const operationalRefs = refs.filter(row => Date.parse(row.validTime) >= Date.parse(referenceAt));
  const advisoryHistoryRefs = refs.filter(row => Date.parse(row.validTime) < Date.parse(referenceAt));
  if (operationalSeal) {
    const operationalPairs = operationalRefs.map(({ partId, validTime }) => ({ partId, validTime }));
    if (operationalRefs.length !== seal.operationalRequiredPairCount
      || advisoryHistoryRefs.length !== seal.advisoryHistoryAvailablePairCount
      || canonicalSha256(operationalRefs) !== seal.operationalRecordRefsSha256
      || canonicalSha256(advisoryHistoryRefs) !== seal.advisoryHistoryRecordRefsSha256
      || canonicalSha256({
        contractId: COPERNICUS_REQUIRED_PAIRS_CONTRACT_ID,
        pairs: operationalPairs,
      }) !== seal.operationalRequiredPairsSha256) return null;
  } else {
    const pairs = refs.map(({ partId, validTime }) => ({ partId, validTime }));
    if (canonicalSha256(refs) !== seal.recordRefsSha256
      || canonicalSha256({ contractId: COPERNICUS_REQUIRED_PAIRS_CONTRACT_ID, pairs })
        !== seal.requiredPairsSha256) return null;
  }
  const acquisitionIds = [...new Set(refs.map(row => row.acquisitionId))].sort();
  const collectionIdentity = operationalSeal ? {
    sealContractId: seal.sealContractId,
    productionReferenceAt: seal.productionReferenceAt,
    operationalRangeStartAt: seal.operationalRangeStartAt,
    operationalRangeEndAt: seal.operationalRangeEndAt,
    operationalHourCount: seal.operationalHourCount,
    advisoryHistoryStartAt: seal.advisoryHistoryStartAt,
    advisoryHistoryEndAt: seal.advisoryHistoryEndAt,
    advisoryHistoryHourCount: seal.advisoryHistoryHourCount,
    targetRegistrySha256: seal.targetRegistrySha256,
    dmiCurrentInputSha256: seal.dmiCurrentInputSha256,
    dmiVerifierContractId: seal.dmiVerifierContractId,
    operationalRequiredPairsSha256: seal.operationalRequiredPairsSha256,
    operationalRequiredPairCount: seal.operationalRequiredPairCount,
    operationalRecordRefs: operationalRefs,
    operationalRecordRefsSha256: seal.operationalRecordRefsSha256,
    advisoryHistoryRequiredPairsSha256: seal.advisoryHistoryRequiredPairsSha256,
    advisoryHistoryRequiredPairCount: seal.advisoryHistoryRequiredPairCount,
    advisoryHistoryRecordRefs: advisoryHistoryRefs,
    advisoryHistoryRecordRefsSha256: seal.advisoryHistoryRecordRefsSha256,
    advisoryHistoryAvailablePairCount: seal.advisoryHistoryAvailablePairCount,
    advisoryHistoryMissingPairCount: seal.advisoryHistoryMissingPairCount,
    advisoryHistoryComplete: seal.advisoryHistoryComplete,
    selectionPolicyId: seal.selectionPolicyId,
    acquisitionIds,
  } : {
    productionReferenceAt: seal.productionReferenceAt,
    rangeStartAt: seal.rangeStartAt,
    rangeEndAt: seal.rangeEndAt,
    coldBridgeHours: seal.coldBridgeHours,
    publicHourCount: seal.publicHourCount,
    targetRegistrySha256: seal.targetRegistrySha256,
    dmiCurrentInputSha256: seal.dmiCurrentInputSha256,
    dmiVerifierContractId: seal.dmiVerifierContractId,
    requiredPairsSha256: seal.requiredPairsSha256,
    requiredPairCount: seal.requiredPairCount,
    selectionPolicyId: seal.selectionPolicyId,
    recordRefs: refs,
    recordRefsSha256: seal.recordRefsSha256,
    acquisitionIds,
  };
  if (canonicalSha256(collectionIdentity) !== seal.collectionId) return null;
  return Object.freeze({
    entries: document.entries,
    entryOrder: Object.freeze([...document.entries]),
    entryCount: document.entries.length,
    entryMembership,
    entrySha256ByObject,
    sealSha256: canonicalSha256(seal),
  });
}

function copernicusDocumentProof(document) {
  if (!document || typeof document !== 'object') return null;
  const cached = COPERNICUS_DOCUMENT_PROOFS.get(document);
  try {
    if (cached
      && cached.entries === document.entries
      && cached.entryCount === document.entries?.length
      && cached.entryOrder.every((entry, index) => document.entries[index] === entry)
      && cached.sealSha256 === canonicalSha256(document.copernicusRangeSeal)) return cached;
    const proof = buildCopernicusDocumentProof(document);
    if (proof) COPERNICUS_DOCUMENT_PROOFS.set(document, proof);
    else COPERNICUS_DOCUMENT_PROOFS.delete(document);
    return proof;
  } catch {
    COPERNICUS_DOCUMENT_PROOFS.delete(document);
    return null;
  }
}

function verifiedCopernicusDocumentEntry(document, entry) {
  const closureProof = operationalClosureDocumentProof(document);
  const advisoryProof = advisoryDocumentProof(document);
  const closureMember = closureProof?.entryMembership.has(entry);
  const advisoryMember = advisoryProof?.entryMembership.has(entry);
  if (!closureMember && !advisoryMember) return false;
  try {
    const proof = closureMember ? closureProof : advisoryProof;
    return proof.entrySha256ByObject.get(entry) === canonicalSha256(entry)
      && proof.assignmentShaByObject.get(entry) === entry.closureAssignmentSha256
      && verifiedCopernicusRecordProjection(entry);
  } catch {
    return false;
  }
}

function verifiedOpenMeteoDocumentEntry(document, entry) {
  const proof = operationalClosureDocumentProof(document);
  if (!proof?.entryMembership.has(entry)) return false;
  try {
    return proof.entrySha256ByObject.get(entry) === canonicalSha256(entry)
      && proof.assignmentShaByObject.get(entry) === entry.closureAssignmentSha256
      && verifiedOpenMeteoRecordProjection(entry);
  } catch {
    return false;
  }
}

function closureAssignmentIdentity(entry) {
  const validTime = exactUtcHour(entry?.validTime);
  if (!validTime || entry.validTime !== validTime || exactString(entry.partId) === null) return null;
  if ([COPERNICUS_BALTIC_CLASSIFICATION, COPERNICUS_AMM15_CLASSIFICATION]
    .includes(entry.classification)) {
    const expectedSource = entry.classification === COPERNICUS_BALTIC_CLASSIFICATION
      ? 'copernicus-baltic-nemo'
      : 'copernicus-nws-amm15';
    const ref = {
      partId: entry.partId,
      validTime,
      recordId: entry.recordId,
      acquisitionId: entry.acquisitionId,
      source: entry.source,
    };
    if (entry.source !== expectedSource
      || !SHA256_PATTERN.test(entry.recordId ?? '')
      || !SHA256_PATTERN.test(entry.acquisitionId ?? '')
      || !SHA256_PATTERN.test(entry.recordRefSha256 ?? '')
      || entry.recordRefSha256 !== canonicalSha256({
        contractId: 'current-operational-copernicus-record-ref-v1', recordRef: ref,
      })) return null;
    return { ...ref, classification: entry.classification, recordRefSha256: entry.recordRefSha256 };
  }
  if (entry.classification === OPEN_METEO_CLASSIFICATION) {
    const acquiredAt = canonicalTime(entry.acquiredAt);
    const ref = {
      partId: entry.partId,
      validTime,
      recordId: entry.recordId,
      source: entry.source,
    };
    if (!acquiredAt
      || entry.source !== OPEN_METEO_SOURCE
      || entry.model !== OPEN_METEO_MODEL
      || entry.physicalScope !== OPEN_METEO_PHYSICAL_SCOPE
      || entry.scoreInputPolicyId !== OPEN_METEO_SCORE_INPUT_POLICY_ID
      || entry.calibrationEligible !== false
      || !SHA256_PATTERN.test(entry.recordId ?? '')
      || !SHA256_PATTERN.test(entry.recordRefSha256 ?? '')
      || entry.recordRefSha256 !== canonicalSha256({
        contractId: OPEN_METEO_RECORD_REF_CONTRACT_ID, recordRef: ref,
      })) return null;
    return {
      ...ref,
      classification: OPEN_METEO_CLASSIFICATION,
      model: entry.model,
      acquiredAt: entry.acquiredAt,
      recordRefSha256: entry.recordRefSha256,
      physicalScope: entry.physicalScope,
      scoreInputPolicyId: entry.scoreInputPolicyId,
      calibrationEligible: false,
    };
  }
  if (![REGIONAL_NATIVE_CLASSIFICATION, REGIONAL_HOLD_CLASSIFICATION]
    .includes(entry.classification)) return null;
  const sourceValidTime = exactUtcHour(entry.sourceValidTime);
  const sourceModelRun = exactUtcHour(entry.modelRun);
  if (!sourceValidTime || entry.sourceValidTime !== sourceValidTime
    || !sourceModelRun || entry.modelRun !== sourceModelRun
    || Date.parse(sourceModelRun) > Date.parse(sourceValidTime)
    || !SHA256_PATTERN.test(entry.sourceAssetSha256 ?? '')
    || !SHA256_PATTERN.test(entry.sourceProofSha256 ?? '')
    || !SHA256_PATTERN.test(entry.vectorCommitmentSha256 ?? '')) return null;
  const identity = {
    partId: entry.partId,
    validTime,
    classification: entry.classification,
    sourceValidTime,
    sourceModelRun,
    sourceAssetSha256: entry.sourceAssetSha256,
    sourceProofSha256: entry.sourceProofSha256,
    vectorCommitmentSha256: entry.vectorCommitmentSha256,
  };
  if (entry.classification === REGIONAL_NATIVE_CLASSIFICATION) {
    const vectorCommitment = canonicalSha256({
      schemaVersion: 1,
      contractId: REGIONAL_VECTOR_COMMITMENT_CONTRACT_ID,
      partId: entry.partId,
      collection: 'dkss_lf',
      modelRun: sourceModelRun,
      validTime: sourceValidTime,
      sourceAssetSha256: entry.sourceAssetSha256,
      verticalLayer: entry.verticalLayer,
      verticalLayerRankM: fixedDecimal(entry.verticalLayerRankM, 3),
      uMps: fixedDecimal(entry.uMps, 5),
      vMps: fixedDecimal(entry.vMps, 5),
    });
    if (sourceValidTime !== validTime
      || Object.hasOwn(entry, 'holdAgeHours')
      || Object.hasOwn(entry, 'stateOnly')
      || Object.hasOwn(entry, 'currentVectorAvailable')
      || Object.hasOwn(entry, 'arrowAvailable')
      || vectorCommitment !== entry.vectorCommitmentSha256) return null;
  } else {
    if (!Number.isInteger(entry.holdAgeHours) || entry.holdAgeHours < 1 || entry.holdAgeHours > 3
      || Date.parse(validTime) - Date.parse(sourceValidTime) !== entry.holdAgeHours * 3_600_000
      || entry.stateOnly !== true
      || entry.currentVectorAvailable !== false
      || entry.arrowAvailable !== false
      || regionalHoldSourceForbiddenFields(entry).length > 0) return null;
    identity.holdAgeHours = entry.holdAgeHours;
  }
  return identity;
}

function buildOperationalClosureDocumentProof(document) {
  if (!basicControlledLiveDocument(document)) return null;
  const value = document.operationalClosure;
  if (!exactObjectFields(value, CURRENT_OPERATIONAL_CLOSURE_SAFE_FIELDS)
    || value.schemaVersion !== 2
    || value.contractId !== CURRENT_OPERATIONAL_CLOSURE_SAFE_CONTRACT_ID
    || value.status !== 'READY'
    || value.targetCount !== CURRENT_OPERATIONAL_TARGET_COUNT
    || value.operationalHourCount !== COPERNICUS_PUBLIC_HOUR_COUNT
    || value.totalPairCount !== CURRENT_OPERATIONAL_TOTAL_PAIR_COUNT
    || value.sourceOrderContractId !== CURRENT_OPERATIONAL_SOURCE_ORDER_CONTRACT_ID
    || value.missingPairCount !== 0
    || value.coordinatesIncluded !== false
    || value.rawVectorsIncluded !== false
    || value.partIdsIncluded !== false
    || value.pairRefsIncluded !== false
    || value.targetRegistrySha256 !== document.targetFingerprint) return null;
  const safeWithoutIdentity = Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== 'safeProjectionSha256'),
  );
  if (!SHA256_PATTERN.test(value.safeProjectionSha256 ?? '')
    || canonicalSha256(safeWithoutIdentity) !== value.safeProjectionSha256) return null;
  const referenceAt = exactUtcHour(value.productionReferenceAt);
  const endAt = exactUtcHour(value.operationalRangeEndAt);
  if (!referenceAt || !endAt
    || shiftedHour(referenceAt, COPERNICUS_PUBLIC_END_OFFSET_HOURS) !== endAt) return null;
  const counts = [
    value.dmiVerifiedPairCount, value.copernicusBalticPairCount,
    value.copernicusAmm15PairCount, value.regionalNativePairCount,
    value.regionalDerivedHoldPairCount, value.regionalResidualPairCount,
    value.openMeteoRequiredPairCount, value.openMeteoPairCount,
    value.supplementalAssignmentCount, value.missingPairCount,
    value.advisoryHistoryRequiredPairCount, value.advisoryHistoryAvailablePairCount,
    value.advisoryHistoryMissingPairCount, value.advisoryHistoryAssignmentCount,
  ];
  if (counts.some(count => !Number.isInteger(count) || count < 0)
    || value.regionalResidualPairCount
      !== value.regionalNativePairCount + value.regionalDerivedHoldPairCount
    || value.openMeteoRequiredPairCount !== value.openMeteoPairCount
    || value.supplementalAssignmentCount !== value.copernicusBalticPairCount
      + value.copernicusAmm15PairCount + value.regionalResidualPairCount
      + value.openMeteoPairCount
    || value.dmiVerifiedPairCount + value.supplementalAssignmentCount
      !== CURRENT_OPERATIONAL_TOTAL_PAIR_COUNT
    || value.advisoryHistoryAvailablePairCount + value.advisoryHistoryMissingPairCount
      !== value.advisoryHistoryRequiredPairCount
    || value.advisoryHistoryAssignmentCount !== value.advisoryHistoryAvailablePairCount
    || document.entries.length !== value.supplementalAssignmentCount) return null;
  const requiredHashes = [
    'closureId', 'targetRegistrySha256', 'dmiCurrentInputSha256', 'dmiLedgerSha256',
    'dmiAttestationSha256', 'copernicusRegistrySha256', 'copernicusShadowSha256',
    'copernicusRecordRefsSha256', 'regionalEvidenceSha256', 'regionalPolicySha256',
    'regionalPairRefsSha256', 'supplementalAssignmentsSha256', 'assignmentsSha256',
    'openMeteoDocumentSha256', 'openMeteoRecordRefsSha256',
    'advisoryHistoryRequiredPairsSha256', 'advisoryHistoryRecordRefsSha256',
    'advisoryHistoryAssignmentsSha256',
  ];
  if (requiredHashes.some(field => !SHA256_PATTERN.test(value[field] ?? ''))) return null;
  if (value.openMeteoPhysicalScope !== OPEN_METEO_PHYSICAL_SCOPE
    || value.openMeteoScoreInputPolicyId !== OPEN_METEO_SCORE_INPUT_POLICY_ID
    || value.openMeteoCalibrationEligible !== false) return null;
  if (value.copernicusCompleteWithoutSourceStage === true) {
    if (value.copernicusSourceStageSha256 !== null
      || value.copernicusSourceStageStatus !== 'NOT_APPLICABLE'
      || value.copernicusBoundedProgressAccepted !== false
      || value.regionalResidualPairCount !== 0
      || value.openMeteoPairCount !== 0
      || value.copernicusBalticPairCount !== 0
      || value.copernicusAmm15PairCount !== 0) return null;
  } else if (value.copernicusCompleteWithoutSourceStage !== false
    || !SHA256_PATTERN.test(value.copernicusSourceStageSha256 ?? '')
    || value.copernicusSourceStageStatus !== 'READY'
    || value.copernicusBoundedProgressAccepted !== false) return null;

  const entryMembership = new Set();
  const entrySha256ByObject = new Map();
  const assignmentShaByObject = new Map();
  const assignmentHashes = [];
  const seenPairs = new Set();
  const classCounts = new Map([
    [COPERNICUS_BALTIC_CLASSIFICATION, 0],
    [COPERNICUS_AMM15_CLASSIFICATION, 0],
    [REGIONAL_NATIVE_CLASSIFICATION, 0],
    [REGIONAL_HOLD_CLASSIFICATION, 0],
    [OPEN_METEO_CLASSIFICATION, 0],
  ]);
  let previousKey = null;
  for (const entry of document.entries) {
    const identity = closureAssignmentIdentity(entry);
    if (!identity
      || entry.closureContractId !== CURRENT_OPERATIONAL_CLOSURE_CONTRACT_ID
      || entry.closureId !== value.closureId
      || !SHA256_PATTERN.test(entry.closureAssignmentSha256 ?? '')) return null;
    const assignmentSha = canonicalSha256({
      schemaVersion: 1,
      contractId: CURRENT_OPERATIONAL_ASSIGNMENT_CONTRACT_ID,
      assignment: identity,
    });
    if (assignmentSha !== entry.closureAssignmentSha256) return null;
    const key = `${entry.validTime}\u0000${entry.partId}`;
    if (seenPairs.has(key) || (previousKey !== null && key <= previousKey)
      || Date.parse(entry.validTime) < Date.parse(referenceAt)
      || Date.parse(entry.validTime) > Date.parse(endAt)) return null;
    previousKey = key;
    seenPairs.add(key);
    classCounts.set(entry.classification, (classCounts.get(entry.classification) ?? -1) + 1);
    assignmentHashes.push(assignmentSha);
    entryMembership.add(entry);
    entrySha256ByObject.set(entry, canonicalSha256(entry));
    assignmentShaByObject.set(entry, assignmentSha);
  }
  if (classCounts.get(COPERNICUS_BALTIC_CLASSIFICATION) !== value.copernicusBalticPairCount
    || classCounts.get(COPERNICUS_AMM15_CLASSIFICATION) !== value.copernicusAmm15PairCount
    || classCounts.get(REGIONAL_NATIVE_CLASSIFICATION) !== value.regionalNativePairCount
    || classCounts.get(REGIONAL_HOLD_CLASSIFICATION) !== value.regionalDerivedHoldPairCount
    || classCounts.get(OPEN_METEO_CLASSIFICATION) !== value.openMeteoPairCount
    || canonicalSha256(assignmentHashes) !== value.supplementalAssignmentsSha256) return null;
  return Object.freeze({
    entries: document.entries,
    entryOrder: Object.freeze([...document.entries]),
    entryCount: document.entries.length,
    entryMembership,
    entrySha256ByObject,
    assignmentShaByObject,
    closureSha256: canonicalSha256(value),
  });
}

function operationalClosureDocumentProof(document) {
  if (!document || typeof document !== 'object') return null;
  const cached = CLOSURE_DOCUMENT_PROOFS.get(document);
  try {
    if (cached
      && cached.entries === document.entries
      && cached.entryCount === document.entries?.length
      && cached.entryOrder.every((entry, index) => document.entries[index] === entry)
      && cached.closureSha256 === canonicalSha256(document.operationalClosure)
      && cached.entryOrder.every(entry => cached.entrySha256ByObject.get(entry) === canonicalSha256(entry))) {
      return cached;
    }
    const proof = buildOperationalClosureDocumentProof(document);
    if (proof) CLOSURE_DOCUMENT_PROOFS.set(document, proof);
    else CLOSURE_DOCUMENT_PROOFS.delete(document);
    return proof;
  } catch {
    CLOSURE_DOCUMENT_PROOFS.delete(document);
    return null;
  }
}

function advisoryClosureAssignmentIdentity(entry) {
  const validTime = exactUtcHour(entry?.validTime);
  if (!validTime || validTime !== entry.validTime
    || entry.classification !== COPERNICUS_ADVISORY_CLASSIFICATION
    || exactString(entry.partId) === null) return null;
  const ref = {
    partId: entry.partId,
    validTime,
    recordId: entry.recordId,
    acquisitionId: entry.acquisitionId,
    source: entry.source,
  };
  if (!COPERNICUS_SOURCES.has(entry.source)
    || !SHA256_PATTERN.test(entry.recordId ?? '')
    || !SHA256_PATTERN.test(entry.acquisitionId ?? '')
    || !SHA256_PATTERN.test(entry.recordRefSha256 ?? '')
    || entry.recordRefSha256 !== canonicalSha256({
      contractId: CURRENT_ADVISORY_RECORD_REF_CONTRACT_ID,
      recordRef: ref,
    })) return null;
  return {
    ...ref,
    classification: COPERNICUS_ADVISORY_CLASSIFICATION,
    recordRefSha256: entry.recordRefSha256,
  };
}

function buildAdvisoryDocumentProof(document) {
  if (!basicControlledLiveDocument(document)) return null;
  const closureProof = operationalClosureDocumentProof(document);
  const value = document.operationalClosure;
  const advisory = document.advisoryEntries;
  if (!closureProof || advisory.length !== value.advisoryHistoryAssignmentCount) return null;
  const referenceAt = exactUtcHour(value.productionReferenceAt);
  const historyStartAt = referenceAt ? shiftedHour(referenceAt, -COPERNICUS_COLD_BRIDGE_HOURS) : null;
  const historyEndAt = referenceAt ? shiftedHour(referenceAt, -1) : null;
  if (!referenceAt || !historyStartAt || !historyEndAt) return null;

  const entryMembership = new WeakSet();
  const entrySha256ByObject = new WeakMap();
  const assignmentShaByObject = new WeakMap();
  const refs = [];
  const assignmentHashes = [];
  const seenPairs = new Set();
  let previousKey = null;
  for (const entry of advisory) {
    const identity = advisoryClosureAssignmentIdentity(entry);
    const assignmentSha = identity && canonicalSha256({
      schemaVersion: 1,
      contractId: CURRENT_ADVISORY_ASSIGNMENT_CONTRACT_ID,
      assignment: identity,
    });
    const validTime = identity?.validTime;
    const contract = COPERNICUS_SOURCE_CONTRACTS.get(entry?.source);
    const key = identity ? `${identity.validTime}\u0000${identity.partId}` : null;
    if (!identity
      || entry.closureContractId !== CURRENT_OPERATIONAL_CLOSURE_CONTRACT_ID
      || entry.closureId !== value.closureId
      || assignmentSha !== entry.closureAssignmentSha256
      || entry.collectionId !== value.closureId
      || entry.productionReferenceAt !== referenceAt
      || entry.provider !== 'copernicus'
      || entry.sourceClass !== 'supplemental-local-current'
      || entry.acquisitionStatus !== 'COMPLETE'
      || entry.selectionPolicyId !== COPERNICUS_SELECTION_POLICY_ID
      || entry.capturedAt !== entry.acquisitionAt
      || ![COPERNICUS_REQUEST_CONTRACT_ID, COPERNICUS_LEGACY_HISTORY_REQUEST_CONTRACT_ID]
        .includes(entry.requestContractId)
      || !contract
      || entry.productId !== contract.productId
      || entry.datasetId !== contract.datasetId
      || entry.datasetVersion !== contract.datasetVersion
      || entry.componentPair !== 'same-time-cell-layer'
      || entry.interpolation !== false
      || entry.vectorSemanticsVersion !== 4
      || finite(entry.verticalLayerM) === null
      || entry.verticalLayerM !== entry.verticalLayerRankM
      || !verifiedCopernicusRecordProjection(entry)
      || Date.parse(validTime) < Date.parse(historyStartAt)
      || Date.parse(validTime) > Date.parse(historyEndAt)
      || seenPairs.has(key)
      || (previousKey !== null && key <= previousKey)) return null;
    previousKey = key;
    seenPairs.add(key);
    refs.push({
      partId: identity.partId,
      validTime: identity.validTime,
      recordId: identity.recordId,
      acquisitionId: identity.acquisitionId,
      source: identity.source,
    });
    assignmentHashes.push(assignmentSha);
    entryMembership.add(entry);
    entrySha256ByObject.set(entry, canonicalSha256(entry));
    assignmentShaByObject.set(entry, assignmentSha);
  }
  if (refs.length !== value.advisoryHistoryAvailablePairCount
    || refs.length + value.advisoryHistoryMissingPairCount
      !== value.advisoryHistoryRequiredPairCount
    || canonicalSha256(refs) !== value.advisoryHistoryRecordRefsSha256
    || canonicalSha256(assignmentHashes) !== value.advisoryHistoryAssignmentsSha256) return null;

  const seal = document.copernicusRangeSeal;
  if (seal !== null) {
    if (seal?.status !== 'OPERATIONAL_COMPLETE') return null;
    const sealedEntries = [...advisory, ...document.entries.filter(
      entry => entry?.provider === 'copernicus',
    )].map(entry => {
      const projected = { ...entry, collectionId: seal.collectionId };
      projected.recordProjectionSha256 = copernicusLiveRecordProjectionSha256(projected);
      return projected;
    });
    if (!buildCopernicusDocumentProof({ ...document, entries: sealedEntries })) return null;
  }
  return Object.freeze({
    entries: advisory,
    entryOrder: Object.freeze([...advisory]),
    entryCount: advisory.length,
    entryMembership,
    entrySha256ByObject,
    assignmentShaByObject,
    closureSha256: canonicalSha256(value),
    sealSha256: seal === null ? null : canonicalSha256(seal),
  });
}

function advisoryDocumentProof(document) {
  if (!document || typeof document !== 'object') return null;
  const cached = ADVISORY_DOCUMENT_PROOFS.get(document);
  try {
    const sealSha256 = document.copernicusRangeSeal == null
      ? null
      : canonicalSha256(document.copernicusRangeSeal);
    if (cached
      && cached.entries === document.advisoryEntries
      && cached.entryCount === document.advisoryEntries?.length
      && cached.entryOrder.every((entry, index) => document.advisoryEntries[index] === entry)
      && cached.closureSha256 === canonicalSha256(document.operationalClosure)
      && cached.sealSha256 === sealSha256
      && cached.entryOrder.every(entry => cached.entrySha256ByObject.get(entry) === canonicalSha256(entry))) {
      return cached;
    }
    const proof = buildAdvisoryDocumentProof(document);
    if (proof) ADVISORY_DOCUMENT_PROOFS.set(document, proof);
    else ADVISORY_DOCUMENT_PROOFS.delete(document);
    return proof;
  } catch {
    ADVISORY_DOCUMENT_PROOFS.delete(document);
    return null;
  }
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
    ))
      && Math.abs(Date.parse(capturedAt) - Date.parse(referenceAt))
        <= COPERNICUS_FUTURE_ACQUISITION_FRESHNESS_HOURS * 3_600_000;
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

export function controlledLiveCurrentEnabled(document) {
  return operationalClosureDocumentProof(document) !== null
    && advisoryDocumentProof(document) !== null;
}

/**
 * The coastal-parts source stores the parent zone as the key in `zones`.
 * Preserve that authoritative binding when consumers need a flat part list;
 * otherwise native-cadence evidence cannot be matched to its parent zone.
 */
export function flattenCoastalPartsWithParentZoneId(document) {
  return Object.entries(document?.zones ?? {}).flatMap(([zoneId, parts]) => (
    Array.isArray(parts) ? parts.map(part => ({ ...part, zoneId })) : []
  ));
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
      if (source.requestContractId !== COPERNICUS_REQUEST_CONTRACT_ID
        || Math.abs(Date.parse(acquisitionAt) - Date.parse(productionReferenceAt))
          > COPERNICUS_FUTURE_ACQUISITION_FRESHNESS_HOURS * 3_600_000) return null;
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
      ))
      || Math.abs(Date.parse(acquisitionAt) - Date.parse(productionReferenceAt))
        > COPERNICUS_FUTURE_ACQUISITION_FRESHNESS_HOURS * 3_600_000) return null;
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

function verifiedEntry(entry, part, document) {
  const closureProof = operationalClosureDocumentProof(document);
  const advisoryProof = advisoryDocumentProof(document);
  const closureMember = closureProof?.entryMembership.has(entry);
  const advisoryMember = advisoryProof?.entryMembership.has(entry);
  if (!closureMember && !advisoryMember) return null;
  try {
    const proof = closureMember ? closureProof : advisoryProof;
    if (proof.entrySha256ByObject.get(entry) !== canonicalSha256(entry)
      || proof.assignmentShaByObject.get(entry) !== entry?.closureAssignmentSha256) return null;
  } catch {
    return null;
  }
  const validTime = canonicalTime(entry?.validTime);
  if (!validTime || entry?.partId !== part?.partId
    || entry?.parentZoneId !== expectedParentZoneId(part)
    || entry?.targetIdentityFingerprint !== targetIdentityFingerprint(part)) return null;
  if (entry?.classification === REGIONAL_HOLD_CLASSIFICATION) {
    const modelRun = canonicalTime(entry?.modelRun);
    const sourceValidTime = canonicalTime(entry?.sourceValidTime);
    if (!closureMember
      || entry?.provider !== 'dmi'
      || entry?.sourceClass !== 'owner-approved-regional-proxy'
      || entry?.source !== REGIONAL_SOURCE
      || entry?.collection !== 'dkss_lf'
      || !modelRun
      || !sourceValidTime
      || Date.parse(modelRun) > Date.parse(sourceValidTime)
      || !regionalSampleTimeValid({ ...entry, validTime: entry.sourceValidTime })) return null;
    return {
      entry,
      validTime,
      stateOnly: true,
      source: {
        ...entry,
        status: 'verified-derived-state-only',
        controlledLivePilot: true,
        temporalResolution: 'native-cadence-derived-state-hold',
        nativeValidTimes: [sourceValidTime],
        fallback: false,
      },
    };
  }
  const uMps = finite(entry?.uMps);
  const vMps = finite(entry?.vMps);
  if (!validTime || uMps === null || vMps === null
    || entry?.vectorSemanticsVersion !== 4
    || !['same-time-cell-layer', 'derived-speed-toward-direction-same-hour']
      .includes(entry?.componentPair)
    || entry?.interpolation !== false) return null;
  const provider = String(entry?.provider ?? '').toLowerCase();
  if (provider === 'copernicus') {
    if (typeof entry?.productId !== 'string' || entry.productId.length === 0
      || typeof entry?.datasetId !== 'string' || entry.datasetId.length === 0
      || !verifiedCopernicusDocumentEntry(document, entry)) return null;
  } else if (provider === 'dmi') {
    if (!closureMember) return null;
    const modelRun = canonicalTime(entry?.modelRun);
    const sourceValidTime = canonicalTime(entry?.sourceValidTime);
    if (!modelRun || !sourceValidTime
      || Date.parse(modelRun) > Date.parse(sourceValidTime)) return null;
  } else if (provider === 'open-meteo') {
    if (!closureMember
      || entry?.classification !== OPEN_METEO_CLASSIFICATION
      || !verifiedOpenMeteoDocumentEntry(document, entry)) return null;
  } else {
    return null;
  }
  const source = {
    ...entry,
    productionReferenceAt: entry?.productionReferenceAt
      ?? document?.copernicusRangeSeal?.productionReferenceAt,
    status: 'verified',
    controlledLivePilot: true,
    vectorSelection: 'dmi-local-then-copernicus-local-then-owner-approved-regional-proxy-then-open-meteo-combined-current',
    temporalResolution: 'native',
    nativeValidTimes: [entry.sourceValidTime ?? validTime],
    fallback: provider === 'open-meteo',
  };
  const proof = verifiedLivePilotSource(source, part, { requireStatus: true });
  return proof ? { entry, source, validTime, uMps, vMps, proof } : null;
}

/**
 * Reduces one already closure-bound derived hold to the only marker allowed to
 * cross the weather sanitizer. The marker binds one exact part/hour pair to
 * one earlier verified regional source commitment and deliberately contains
 * no coordinate, vector, speed, direction or arrow field.
 */
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

/**
 * Returns only the part's closure-declared upper bound. This value is never an
 * authorization by itself; each held hour must also carry its exact marker.
 */
export function nativeCadenceHoldHoursForPart(part, document) {
  if (!controlledLiveCurrentEnabled(document)) return 0;
  return Math.max(0, ...(document.entries ?? [])
    .map(raw => verifiedEntry(raw, part, document))
    .filter(candidate => candidate?.stateOnly === true)
    .map(candidate => candidate.entry.holdAgeHours));
}

export function verifiedNativeCadenceReferenceForPart(part, document, referenceAt) {
  const reference = canonicalTime(referenceAt);
  if (!reference || !controlledLiveCurrentEnabled(document)) return false;
  return (document.entries ?? []).some(raw => {
    const candidate = verifiedEntry(raw, part, document);
    return candidate?.validTime === reference
      && candidate.entry.classification === REGIONAL_NATIVE_CLASSIFICATION
      && candidate.entry.sourceClass === 'owner-approved-regional-proxy'
      && candidate.entry.source === REGIONAL_SOURCE
      && candidate.entry.collection === 'dkss_lf';
  });
}

/**
 * Returns only an exact closure-authorized native model-field sample. It never
 * searches backwards or grants a free hold; held target hours already exist
 * as explicit REGIONAL_DMI_DERIVED_HOLD entries in the live document.
 */
export function latestVerifiedNativeCadenceSampleForPart(
  part,
  document,
  referenceAt,
  { projection = 'integrated-exact' } = {},
) {
  if (!['integrated-exact', 'candidate-g-legacy-quantized'].includes(projection)) {
    throw new Error('Native-cadence reference projection is invalid');
  }
  const reference = canonicalTime(referenceAt);
  const onshoreDirectionDeg = finite(part?.onshoreDirectionDeg);
  if (!reference || onshoreDirectionDeg === null || !controlledLiveCurrentEnabled(document)) return null;
  const latest = (document.entries ?? [])
    .map(raw => verifiedEntry(raw, part, document))
    .find(candidate => candidate?.validTime === reference
      && candidate.entry.classification === REGIONAL_NATIVE_CLASSIFICATION
      && candidate.entry.sourceClass === 'owner-approved-regional-proxy'
      && candidate.entry.source === REGIONAL_SOURCE
      && candidate.entry.collection === 'dkss_lf') ?? null;
  if (!latest) return null;
  const exactCurrentSpeedMps = Math.hypot(latest.uMps, latest.vMps);
  const exactCurrentDirectionDeg = ((Math.atan2(latest.uMps, latest.vMps) * 180 / Math.PI) + 360) % 360;
  const currentSpeedMps = projection === 'candidate-g-legacy-quantized'
    ? rounded(exactCurrentSpeedMps, 2)
    : exactCurrentSpeedMps;
  const currentDirectionDeg = projection === 'candidate-g-legacy-quantized'
    ? rounded(exactCurrentDirectionDeg, 0)
    : exactCurrentDirectionDeg;
  return {
    time: latest.validTime,
    currentSpeedMps,
    currentAlignment: Math.cos((currentDirectionDeg - onshoreDirectionDeg) * Math.PI / 180),
    currentVerified: true,
    currentProvenance: {
      status: 'verified',
      sourceClass: 'owner-approved-regional-proxy',
      source: REGIONAL_SOURCE,
      collection: 'dkss_lf',
      distanceKm: latest.proof.distanceKm,
    },
  };
}

export function mergeLiveCurrentPilotIntoRecord(record, part, document, { primaryCurrentVerified = () => false } = {}) {
  if (!record || !Array.isArray(record.hourly) || !controlledLiveCurrentEnabled(document)) return record;
  const candidates = new Map();
  for (const raw of [...(document.advisoryEntries ?? []), ...(document.entries ?? [])]) {
    const candidate = verifiedEntry(raw, part, document);
    if (!candidate) continue;
    const previous = candidates.get(candidate.validTime);
    if (!previous || (SOURCE_ORDER.get(candidate.entry.source) ?? 99) < (SOURCE_ORDER.get(previous.entry.source) ?? 99)) {
      candidates.set(candidate.validTime, candidate);
    }
  }
  if (!candidates.size) return record;

  let supplementalHours = 0;
  let stateOnlyHoldHours = 0;
  const hourly = record.hourly.map(row => {
    if (finite(row?.currentUMps) !== null && finite(row?.currentVMps) !== null && primaryCurrentVerified(row)) return row;
    const candidate = candidates.get(canonicalTime(row?.time));
    if (!candidate) return row;
    if (candidate.stateOnly === true) {
      const currentStateOnlyHold = verifiedStateOnlyCurrentHold(
        candidate.source,
        row?.time,
        part,
      );
      if (!currentStateOnlyHold) return row;
      stateOnlyHoldHours += 1;
      return {
        ...stripStateOnlyCurrentRowProjection(row),
        currentProvenance: candidate.source,
        currentStateOnlyHold,
      };
    }
    supplementalHours += 1;
    const currentSpeedMps = Math.hypot(candidate.uMps, candidate.vMps);
    const currentDirectionDeg = ((Math.atan2(candidate.uMps, candidate.vMps) * 180 / Math.PI) + 360) % 360;
    return {
      ...row,
      currentUMps: rounded(candidate.uMps, 5),
      currentVMps: rounded(candidate.vMps, 5),
      currentSpeedMps: rounded(currentSpeedMps, 2),
      currentDirectionDeg: rounded(currentDirectionDeg, 0),
      temporalResolution: row?.temporalResolution ?? 'native',
      sources: { ...(row?.sources ?? {}), current: candidate.source },
      currentProvenance: candidate.source,
    };
  });
  if (!supplementalHours && !stateOnlyHoldHours) return record;
  if (!supplementalHours) return { ...record, hourly };
  return {
    ...record,
    hourly,
    model: {
      ...(record.model ?? {}),
      completeness: {
        ...(record.model?.completeness ?? {}),
        current: true,
        controlledLiveCurrentPilot: true,
        controlledLiveCurrentPilotMode: document.mode,
        supplementalCurrentHours: supplementalHours,
      },
    },
  };
}
