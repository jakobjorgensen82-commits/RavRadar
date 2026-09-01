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
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
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
const SOURCE_ORDER = new Map([
  ['copernicus-baltic-nemo', 0],
  ['copernicus-nws-amm15', 1],
  [REGIONAL_SOURCE, 2],
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
    && Array.isArray(document?.entries);
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
  const proof = copernicusDocumentProof(document);
  if (!proof?.entryMembership.has(entry)) return false;
  try {
    return proof.entrySha256ByObject.get(entry) === canonicalSha256(entry)
      && verifiedCopernicusRecordProjection(entry);
  } catch {
    return false;
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
  return copernicusDocumentProof(document) !== null;
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
  if (source.componentPair !== 'same-time-cell-layer'
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
    source.sourceClass === 'owner-approved-regional-proxy'
    && String(source.provider ?? '').toLowerCase() === 'dmi'
    && source.source === REGIONAL_SOURCE
    && source.collection === 'dkss_lf'
  ) {
    const modelRun = canonicalTime(source.modelRun);
    const validTime = canonicalTime(source.validTime);
    if (!modelRun || !validTime || Date.parse(modelRun) > Date.parse(validTime)
      || !captureMatchesValidTime(source, REGIONAL_CAPTURE_VALID_TOLERANCE_HOURS)) return null;
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
  const validTime = canonicalTime(entry?.validTime);
  const uMps = finite(entry?.uMps);
  const vMps = finite(entry?.vMps);
  if (!validTime || uMps === null || vMps === null
    || entry?.vectorSemanticsVersion !== 4
    || entry?.componentPair !== 'same-time-cell-layer'
    || entry?.interpolation !== false) return null;
  if (entry?.partId !== part?.partId || entry?.parentZoneId !== part?.zoneId) return null;
  const provider = String(entry?.provider ?? '').toLowerCase();
  if (provider === 'copernicus') {
    if (typeof entry?.productId !== 'string' || entry.productId.length === 0
      || typeof entry?.datasetId !== 'string' || entry.datasetId.length === 0
      || !verifiedCopernicusDocumentEntry(document, entry)) return null;
  } else if (provider === 'dmi') {
    const modelRun = canonicalTime(entry?.modelRun);
    if (!modelRun || Date.parse(modelRun) > Date.parse(validTime)) return null;
  } else {
    return null;
  }
  const source = {
    ...entry,
    status: 'verified',
    controlledLivePilot: true,
    vectorSelection: 'dmi-local-then-copernicus-local-then-owner-approved-regional-proxy',
    temporalResolution: 'native',
    nativeValidTimes: [validTime],
    fallback: false,
  };
  const proof = verifiedLivePilotSource(source, part, { requireStatus: true });
  return proof ? { entry, source, validTime, uMps, vMps, proof } : null;
}

/**
 * The owner-approved DKSS Limfjord proxy is published on its native
 * three-hour cadence. Candidate G may retain the last derived transport state
 * between those native samples, but this function deliberately returns no
 * permission for Copernicus or unverified/mismatched entries.
 */
export function nativeCadenceHoldHoursForPart(part, document) {
  if (!controlledLiveCurrentEnabled(document)) return 0;
  const approvedRegionalEntry = (document.entries ?? []).some(raw => {
    const candidate = verifiedEntry(raw, part, document);
    return candidate?.entry?.sourceClass === 'owner-approved-regional-proxy'
      && candidate.entry.source === REGIONAL_SOURCE
      && candidate.entry.collection === 'dkss_lf';
  });
  return approvedRegionalEntry ? 3 : 0;
}

export function verifiedNativeCadenceReferenceForPart(part, document, referenceAt) {
  const reference = canonicalTime(referenceAt);
  if (!reference || nativeCadenceHoldHoursForPart(part, document) !== 3) return false;
  return (document.entries ?? []).some(raw => {
    const candidate = verifiedEntry(raw, part, document);
    return candidate?.validTime === reference
      && candidate.entry.sourceClass === 'owner-approved-regional-proxy'
      && candidate.entry.source === REGIONAL_SOURCE
      && candidate.entry.collection === 'dkss_lf';
  });
}

/**
 * Returns the latest exact, verified native-cadence measurement immediately
 * before a production window. The result is deliberately reduced to the
 * values Candidate G needs to derive coast-relative transport evidence plus
 * the minimal non-coordinate source proof needed to authorize a native hold;
 * raw U/V components and coordinates never leave this helper.
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
  const holdHours = nativeCadenceHoldHoursForPart(part, document);
  if (!reference || onshoreDirectionDeg === null || holdHours !== 3) return null;
  const referenceMs = Date.parse(reference);
  const latest = (document.entries ?? [])
    .map(raw => verifiedEntry(raw, part, document))
    .filter(candidate => {
      if (!candidate
        || candidate.entry.sourceClass !== 'owner-approved-regional-proxy'
        || candidate.entry.source !== REGIONAL_SOURCE
        || candidate.entry.collection !== 'dkss_lf') return false;
      const ageHours = (referenceMs - Date.parse(candidate.validTime)) / 3_600_000;
      return ageHours > 0 && ageHours <= holdHours;
    })
    .sort((left, right) => Date.parse(right.validTime) - Date.parse(left.validTime))[0] ?? null;
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
  for (const raw of document.entries ?? []) {
    const candidate = verifiedEntry(raw, part, document);
    if (!candidate) continue;
    const previous = candidates.get(candidate.validTime);
    if (!previous || (SOURCE_ORDER.get(candidate.entry.source) ?? 99) < (SOURCE_ORDER.get(previous.entry.source) ?? 99)) {
      candidates.set(candidate.validTime, candidate);
    }
  }
  if (!candidates.size) return record;

  let supplementalHours = 0;
  const hourly = record.hourly.map(row => {
    if (finite(row?.currentUMps) !== null && finite(row?.currentVMps) !== null && primaryCurrentVerified(row)) return row;
    const candidate = candidates.get(canonicalTime(row?.time));
    if (!candidate) return row;
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
  if (!supplementalHours) return record;
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
