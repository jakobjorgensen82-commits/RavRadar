import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';
import {
  controlledLiveCurrentEnabled,
  flattenCoastalPartsWithParentZoneId,
  latestVerifiedNativeCadenceSampleForPart,
  mergeLiveCurrentPilotIntoRecord,
  nativeCadenceHoldHoursForPart,
  verifiedLivePilotSource,
  verifiedNativeCadenceReferenceForPart,
} from './lib/live-current-pilot.mjs';
import { flowPointsFromForecastRecord } from './lib/flow-points-from-forecast-record.mjs';
import { buildFlowArrowCandidates } from '../js/map/map-view.js';

const part = { partId: 'P1', zoneId: 'Z1', waterPoint: [10, 55] };
const canonicalJson = value => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};
const sha256 = value => `sha256:${crypto.createHash('sha256').update(
  typeof value === 'string' ? value : canonicalJson(value),
).digest('hex')}`;
const fingerprint = value => {
  const payload = JSON.stringify({
    schemaVersion: 1,
    targets: [[
      value.partId,
      value.zoneId,
      value.waterPoint[0].toFixed(7),
      value.waterPoint[1].toFixed(7),
    ]],
  });
  return `sha256:${crypto.createHash('sha256').update(payload).digest('hex')}`;
};
const projectionPayload = entry => ({
  contractId: 'copernicus-live-current-record-fixed-decimal-v1',
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
  samplingPoint: entry.samplingPoint.map(value => value.toFixed(7)),
  gridPoint: entry.gridPoint.map(value => value.toFixed(7)),
  distanceKm: entry.distanceKm.toFixed(5),
  verticalLayer: entry.verticalLayer,
  verticalLayerM: entry.verticalLayerM.toFixed(5),
  layerQuality: entry.layerQuality,
  sharedLayerCount: String(entry.sharedLayerCount),
  componentPair: entry.componentPair,
  interpolation: entry.interpolation,
  vectorSemanticsVersion: String(entry.vectorSemanticsVersion),
  uMps: entry.uMps.toFixed(5),
  vMps: entry.vMps.toFixed(5),
});
const REFERENCE_AT = '2026-08-18T13:00:00Z';
const FUTURE_AT = '2026-08-23T10:00:00Z';
const ACQUISITION_AT = '2026-08-18T13:20:00Z';
const SEALED_AT = '2026-08-18T13:30:00Z';
const ACQUISITION_ID = sha256('fixture-acquisition');
const RECORD_IDS = [sha256('fixture-record-current'), sha256('fixture-record-future')];
const recordRefs = [REFERENCE_AT, FUTURE_AT].map((validTime, index) => ({
  partId: part.partId,
  validTime,
  recordId: RECORD_IDS[index],
  acquisitionId: ACQUISITION_ID,
  source: 'copernicus-baltic-nemo',
}));
const requiredPairs = recordRefs.map(({ partId, validTime }) => ({ partId, validTime }));
const sealWithoutIdentity = {
  status: 'COMPLETE',
  productionReferenceAt: REFERENCE_AT,
  rangeStartAt: '2026-08-16T13:00:00Z',
  rangeEndAt: FUTURE_AT,
  coldBridgeHours: 48,
  publicHourCount: 118,
  targetRegistrySha256: fingerprint(part),
  dmiCurrentInputSha256: sha256('fixture-dmi-input'),
  dmiVerifierContractId: 'dmi-native-current-provenance-v1',
  requiredPairsSha256: sha256({
    contractId: 'copernicus-required-part-time-pairs-v1',
    pairs: requiredPairs,
  }),
  requiredPairCount: recordRefs.length,
  selectionPolicyId: 'per-native-time-nearest-shared-uv-column-then-deepest-common-layer-v1',
  recordRefsSha256: sha256(recordRefs),
  recordRefs,
  acquisitionIds: [ACQUISITION_ID],
  sealedAt: SEALED_AT,
};
const collectionId = sha256(Object.fromEntries(Object.entries(sealWithoutIdentity)
  .filter(([key]) => !['status', 'sealedAt'].includes(key))));
const copernicusRangeSeal = {
  collectionId,
  ...Object.fromEntries(Object.entries(sealWithoutIdentity)
    .filter(([key]) => !['recordRefs', 'acquisitionIds'].includes(key))),
};
const dmiSource = {
  provider: 'dmi', vectorSemanticsVersion: 3, verticalLayer: 'depthbelowsea:7',
  vectorSelection: 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer',
  samplingPoint: part.waterPoint, gridPoint: [10.01, 55], distanceKm: 0.64,
};
const makeCopernicusEntry = (validTime, recordId, uMps, vMps) => {
  const entry = {
  recordProjectionContractId: 'copernicus-live-current-record-fixed-decimal-v1',
  recordId, acquisitionId: ACQUISITION_ID, collectionId,
  productionReferenceAt: REFERENCE_AT,
  partId: 'P1', parentZoneId: 'Z1', validTime,
  capturedAt: ACQUISITION_AT, acquisitionAt: ACQUISITION_AT,
  acquisitionStatus: 'COMPLETE',
  requestContractId: 'copernicus-current-multitime-bounded-spatial-shards-v1',
  selectionPolicyId: 'per-native-time-nearest-shared-uv-column-then-deepest-common-layer-v1',
  targetIdentityFingerprint: fingerprint(part),
  samplingPoint: part.waterPoint, provider: 'copernicus', sourceClass: 'supplemental-local-current',
  source: 'copernicus-baltic-nemo',
  productId: 'BALTICSEA_ANALYSISFORECAST_PHY_003_006',
  datasetId: 'cmems_mod_bal_phy_anfc_PT1H-i', datasetVersion: '202411',
  gridPoint: [10.02, 55],
  distanceKm: 1.28, verticalLayer: 'depth:12', verticalLayerM: 12, verticalLayerRankM: 12,
  layerQuality: 'deepest-common-layer', sharedLayerCount: 2,
  componentPair: 'same-time-cell-layer', interpolation: false, vectorSemanticsVersion: 4,
  uMps, vMps,
  };
  entry.recordProjectionSha256 = sha256(projectionPayload(entry));
  return entry;
};
const copernicusEntry = makeCopernicusEntry(REFERENCE_AT, RECORD_IDS[0], 0.3, -0.4);
const futureCopernicusEntry = makeCopernicusEntry(FUTURE_AT, RECORD_IDS[1], -0.12, 0.05);
// These two values are independently generated by Python's canonical_sha256
// and live_record_projection_sha256. They lock the Python producer and JS
// consumer to one byte-identical cross-language contract.
assert.equal(collectionId, 'sha256:466a9fda13879e285b1150b9cdcc58f8927731c0ee97eedc98d967b07d3432bc');
assert.equal(copernicusEntry.recordProjectionSha256,
  'sha256:1bdd8d50a587d21d6d0c9ba02526a985547495fe93342d75de6d1280dcd8e767');
const legacyLive = {
  schemaVersion: 1, controlledLivePilot: true, mode: 'controlled-live', enabled: true,
  credentialsIncluded: false, targetFingerprint: fingerprint(part), copernicusRangeSeal,
  entries: [copernicusEntry, futureCopernicusEntry],
};
const zeroGapSealIdentity = {
  productionReferenceAt: REFERENCE_AT,
  rangeStartAt: '2026-08-16T13:00:00Z',
  rangeEndAt: FUTURE_AT,
  coldBridgeHours: 48,
  publicHourCount: 118,
  targetRegistrySha256: fingerprint(part),
  dmiCurrentInputSha256: sha256('fixture-zero-gap-dmi-input'),
  dmiVerifierContractId: 'dmi-native-current-provenance-v1',
  requiredPairsSha256: sha256({
    contractId: 'copernicus-required-part-time-pairs-v1', pairs: [],
  }),
  requiredPairCount: 0,
  selectionPolicyId: 'per-native-time-nearest-shared-uv-column-then-deepest-common-layer-v1',
  recordRefs: [],
  recordRefsSha256: sha256([]),
  acquisitionIds: [],
};
const zeroGapLive = {
  ...legacyLive,
  copernicusRangeSeal: {
    collectionId: sha256(zeroGapSealIdentity),
    status: 'COMPLETE',
    ...Object.fromEntries(Object.entries(zeroGapSealIdentity)
      .filter(([key]) => !['recordRefs', 'acquisitionIds'].includes(key))),
    sealedAt: SEALED_AT,
  },
  entries: [],
};
assert.equal(controlledLiveCurrentEnabled(zeroGapLive), false,
  'a legacy closure-less zero-gap seal must fail closed under the mandatory operationalClosure v2 contract');

const ADVISORY_AT = '2026-08-18T12:00:00Z';
const ADVISORY_RECORD_ID = sha256('fixture-record-advisory');
const advisoryRequiredPairs = [{ partId: part.partId, validTime: ADVISORY_AT }];
const operationalLive = withMeasuredAdvisory => {
  const advisoryHistoryRecordRefs = withMeasuredAdvisory ? [{
    partId: part.partId,
    validTime: ADVISORY_AT,
    recordId: ADVISORY_RECORD_ID,
    acquisitionId: ACQUISITION_ID,
    source: 'copernicus-baltic-nemo',
  }] : [];
  const operationalIdentity = {
    sealContractId: 'copernicus-current-operational118-advisory-history48-seal-v1',
    productionReferenceAt: REFERENCE_AT,
    operationalRangeStartAt: REFERENCE_AT,
    operationalRangeEndAt: FUTURE_AT,
    operationalHourCount: 118,
    advisoryHistoryStartAt: '2026-08-16T13:00:00Z',
    advisoryHistoryEndAt: '2026-08-18T12:00:00Z',
    advisoryHistoryHourCount: 48,
    targetRegistrySha256: fingerprint(part),
    dmiCurrentInputSha256: sha256('fixture-operational-dmi-input'),
    dmiVerifierContractId: 'dmi-native-current-provenance-v1',
    operationalRequiredPairsSha256: sha256({
      contractId: 'copernicus-required-part-time-pairs-v1', pairs: requiredPairs,
    }),
    operationalRequiredPairCount: recordRefs.length,
    operationalRecordRefs: recordRefs,
    operationalRecordRefsSha256: sha256(recordRefs),
    advisoryHistoryRequiredPairsSha256: sha256({
      contractId: 'copernicus-required-part-time-pairs-v1', pairs: advisoryRequiredPairs,
    }),
    advisoryHistoryRequiredPairCount: 1,
    advisoryHistoryRecordRefs,
    advisoryHistoryRecordRefsSha256: sha256(advisoryHistoryRecordRefs),
    advisoryHistoryAvailablePairCount: advisoryHistoryRecordRefs.length,
    advisoryHistoryMissingPairCount: 1 - advisoryHistoryRecordRefs.length,
    advisoryHistoryComplete: advisoryHistoryRecordRefs.length === 1,
    selectionPolicyId: 'per-native-time-nearest-shared-uv-column-then-deepest-common-layer-v1',
    acquisitionIds: [ACQUISITION_ID],
  };
  const operationalCollectionId = sha256(operationalIdentity);
  const resign = entry => {
    const projected = { ...entry, collectionId: operationalCollectionId };
    projected.recordProjectionSha256 = sha256(projectionPayload(projected));
    return projected;
  };
  const entries = [resign(copernicusEntry), resign(futureCopernicusEntry)];
  if (withMeasuredAdvisory) {
    entries.unshift(resign(makeCopernicusEntry(ADVISORY_AT, ADVISORY_RECORD_ID, 0.08, 0.03)));
  }
  return {
    ...legacyLive,
    copernicusRangeSeal: {
      collectionId: operationalCollectionId,
      status: 'OPERATIONAL_COMPLETE',
      ...Object.fromEntries(Object.entries(operationalIdentity)
        .filter(([key]) => ![
          'operationalRecordRefs', 'advisoryHistoryRecordRefs', 'acquisitionIds',
        ].includes(key))),
      sealedAt: SEALED_AT,
    },
    entries,
  };
};
const operationWithoutHistory = operationalLive(false);
assert.equal(controlledLiveCurrentEnabled(operationWithoutHistory), false,
  'a legacy OPERATIONAL_COMPLETE seal without operationalClosure v2 must fail closed');
const operationWithMeasuredHistory = operationalLive(true);
assert.equal(controlledLiveCurrentEnabled(operationWithMeasuredHistory), false,
  'legacy measured advisory history cannot replace the mandatory operationalClosure v2 proof');
assert.equal(controlledLiveCurrentEnabled({
  ...operationWithoutHistory,
  copernicusRangeSeal: {
    ...operationWithoutHistory.copernicusRangeSeal,
    advisoryHistoryMissingPairCount: 0,
  },
}), false, 'tampered advisory-history completeness must fail the whole operation seal closed');

const OPERATIONAL_CLOSURE_CONTRACT = 'current-operational-673x118-closure-ready-v2';
const OPERATIONAL_ASSIGNMENT_CONTRACT = 'current-operational-source-assignment-v2';
const TOTAL_OPERATIONAL_PAIRS = 673 * 118;
const REGIONAL_SOURCE_ASSET_SHA = sha256('fixture-regional-source-asset');
const REGIONAL_SOURCE_PROOF_SHA = sha256('fixture-regional-source-proof');
const exactHour = value => new Date(value).toISOString().replace('.000Z', 'Z');
const regionalVectorCommitmentSha = entry => sha256({
  schemaVersion: 1,
  contractId: 'regional-dmi-private-vector-commitment-v1',
  partId: entry.partId,
  collection: 'dkss_lf',
  modelRun: entry.modelRun,
  validTime: entry.sourceValidTime,
  sourceAssetSha256: entry.sourceAssetSha256,
  verticalLayer: entry.verticalLayer,
  verticalLayerRankM: entry.verticalLayerRankM.toFixed(3),
  uMps: entry.uMps.toFixed(5),
  vMps: entry.vMps.toFixed(5),
});
const buildOperationalLive = rawEntries => {
  const closureId = sha256({
    fixture: 'legacy-live-current-v2-closure',
    pairs: rawEntries.map(entry => [entry.partId, entry.validTime, entry.source]),
  });
  const entries = rawEntries.map(rawEntry => {
    if (rawEntry.provider === 'copernicus') {
      const entry = {
        ...rawEntry,
        collectionId: closureId,
        productionReferenceAt: REFERENCE_AT,
        validTime: exactHour(rawEntry.validTime),
        closureContractId: OPERATIONAL_CLOSURE_CONTRACT,
        closureId,
        classification: rawEntry.source === 'copernicus-nws-amm15'
          ? 'COPERNICUS_AMM15'
          : 'COPERNICUS_BALTIC',
      };
      const recordRef = {
        partId: entry.partId,
        validTime: entry.validTime,
        recordId: entry.recordId,
        acquisitionId: entry.acquisitionId,
        source: entry.source,
      };
      entry.recordRefSha256 = sha256({
        contractId: 'current-operational-copernicus-record-ref-v1',
        recordRef,
      });
      entry.closureAssignmentSha256 = sha256({
        schemaVersion: 1,
        contractId: OPERATIONAL_ASSIGNMENT_CONTRACT,
        assignment: {
          ...recordRef,
          classification: entry.classification,
          recordRefSha256: entry.recordRefSha256,
        },
      });
      entry.recordProjectionSha256 = sha256(projectionPayload(entry));
      return entry;
    }

    const entry = {
      ...rawEntry,
      productionReferenceAt: REFERENCE_AT,
      validTime: exactHour(rawEntry.validTime),
      sourceValidTime: exactHour(rawEntry.sourceValidTime ?? rawEntry.validTime),
      modelRun: exactHour(rawEntry.modelRun),
      sourceAssetSha256: rawEntry.sourceAssetSha256 ?? REGIONAL_SOURCE_ASSET_SHA,
      sourceProofSha256: rawEntry.sourceProofSha256 ?? REGIONAL_SOURCE_PROOF_SHA,
      classification: 'REGIONAL_DMI_NATIVE',
      closureContractId: OPERATIONAL_CLOSURE_CONTRACT,
      closureId,
    };
    entry.vectorCommitmentSha256 = regionalVectorCommitmentSha(entry);
    entry.closureAssignmentSha256 = sha256({
      schemaVersion: 1,
      contractId: OPERATIONAL_ASSIGNMENT_CONTRACT,
      assignment: {
        partId: entry.partId,
        validTime: entry.validTime,
        classification: entry.classification,
        sourceValidTime: entry.sourceValidTime,
        sourceModelRun: entry.modelRun,
        sourceAssetSha256: entry.sourceAssetSha256,
        sourceProofSha256: entry.sourceProofSha256,
        vectorCommitmentSha256: entry.vectorCommitmentSha256,
      },
    });
    return entry;
  }).sort((left, right) => left.validTime.localeCompare(right.validTime)
    || left.partId.localeCompare(right.partId));
  const copernicusBalticPairCount = entries
    .filter(entry => entry.classification === 'COPERNICUS_BALTIC').length;
  const copernicusAmm15PairCount = entries
    .filter(entry => entry.classification === 'COPERNICUS_AMM15').length;
  const regionalNativePairCount = entries
    .filter(entry => entry.classification === 'REGIONAL_DMI_NATIVE').length;
  const supplementalAssignments = entries.map(entry => entry.closureAssignmentSha256);
  const copernicusRefs = entries
    .filter(entry => entry.provider === 'copernicus')
    .map(entry => ({
      partId: entry.partId,
      validTime: entry.validTime,
      recordId: entry.recordId,
      acquisitionId: entry.acquisitionId,
      source: entry.source,
    }));
  const operationalClosure = {
    schemaVersion: 2,
    contractId: 'current-operational-673x118-closure-safe-v2',
    closureId,
    status: 'READY',
    productionReferenceAt: REFERENCE_AT,
    operationalRangeEndAt: FUTURE_AT,
    targetCount: 673,
    operationalHourCount: 118,
    totalPairCount: TOTAL_OPERATIONAL_PAIRS,
    sourceOrderContractId:
      'dmi-verified-then-copernicus-baltic-then-amm15-then-regional-dmi-then-open-meteo-v2',
    dmiVerifiedPairCount: TOTAL_OPERATIONAL_PAIRS - entries.length,
    copernicusBalticPairCount,
    copernicusAmm15PairCount,
    regionalNativePairCount,
    regionalDerivedHoldPairCount: 0,
    regionalResidualPairCount: regionalNativePairCount,
    openMeteoRequiredPairCount: 0,
    openMeteoPairCount: 0,
    supplementalAssignmentCount: entries.length,
    missingPairCount: 0,
    copernicusCompleteWithoutSourceStage: false,
    copernicusSourceStageStatus: 'READY',
    copernicusBoundedProgressAccepted: false,
    targetRegistrySha256: fingerprint(part),
    dmiCurrentInputSha256: sha256('fixture-v2-dmi-input'),
    dmiLedgerSha256: sha256('fixture-v2-dmi-ledger'),
    dmiAttestationSha256: sha256('fixture-v2-dmi-attestation'),
    copernicusRegistrySha256: sha256('fixture-v2-copernicus-registry'),
    copernicusShadowSha256: sha256('fixture-v2-copernicus-shadow'),
    copernicusSourceStageSha256: sha256('fixture-v2-copernicus-source-stage'),
    copernicusRecordRefsSha256: sha256(copernicusRefs),
    regionalEvidenceSha256: sha256('fixture-v2-regional-evidence'),
    regionalPolicySha256: sha256('fixture-v2-regional-policy'),
    regionalPairRefsSha256: sha256('fixture-v2-regional-pairs'),
    openMeteoDocumentSha256: sha256('fixture-v2-open-meteo-document'),
    openMeteoRecordRefsSha256: sha256([]),
    openMeteoPhysicalScope: 'eulerian-waves-and-tides-combined-surface-current',
    openMeteoScoreInputPolicyId:
      'combined-current-single-channel-no-wave-or-tide-reprojection-v1',
    openMeteoCalibrationEligible: false,
    advisoryHistoryRequiredPairCount: 0,
    advisoryHistoryRequiredPairsSha256: sha256({
      contractId: 'copernicus-required-part-time-pairs-v1',
      pairs: [],
    }),
    advisoryHistoryAvailablePairCount: 0,
    advisoryHistoryMissingPairCount: 0,
    advisoryHistoryRecordRefsSha256: sha256([]),
    advisoryHistoryAssignmentCount: 0,
    advisoryHistoryAssignmentsSha256: sha256([]),
    supplementalAssignmentsSha256: sha256(supplementalAssignments),
    assignmentsSha256: sha256('fixture-v2-all-assignments'),
    coordinatesIncluded: false,
    rawVectorsIncluded: false,
    partIdsIncluded: false,
    pairRefsIncluded: false,
  };
  operationalClosure.safeProjectionSha256 = sha256(operationalClosure);
  return {
    schemaVersion: 1,
    controlledLivePilot: true,
    mode: 'controlled-live',
    enabled: true,
    credentialsIncluded: false,
    targetFingerprint: fingerprint(part),
    operationalClosure,
    copernicusRangeSeal: null,
    entries,
    advisoryEntries: [],
  };
};
const live = buildOperationalLive([copernicusEntry, futureCopernicusEntry]);

const regionalPart = { partId: 'R1', zoneId: 'ZR', waterPoint: [11, 56] };
const regionalEntry = {
  partId: 'R1', parentZoneId: 'ZR', validTime: REFERENCE_AT,
  sourceValidTime: REFERENCE_AT, productionReferenceAt: REFERENCE_AT,
  capturedAt: '2026-08-18T13:20:00Z',
  targetIdentityFingerprint: fingerprint(regionalPart),
  samplingPoint: regionalPart.waterPoint, provider: 'dmi', sourceClass: 'owner-approved-regional-proxy',
  source: 'dmi-dkss-lf-regional-proxy', collection: 'dkss_lf',
  modelRun: '2026-08-18T00:00:00Z', gridPoint: [11.1, 56],
  distanceKm: 6.2, verticalLayer: 'depthbelowsea:5', verticalLayerRankM: 5,
  componentPair: 'same-time-cell-layer', interpolation: false, vectorSemanticsVersion: 4,
  uMps: 0.1, vMps: 0.2,
};
const regionalLive = buildOperationalLive([
  copernicusEntry, futureCopernicusEntry, regionalEntry,
]);
const flattenedRegionalParts = flattenCoastalPartsWithParentZoneId({
  zones: { ZR: [{ partId: 'R1', zoneId: 'STALE', waterPoint: regionalPart.waterPoint }] },
});
assert.equal(flattenedRegionalParts.length, 1);
assert.equal(flattenedRegionalParts[0].zoneId, 'ZR',
  'the authoritative parent-zone map key must survive flattening and override stale embedded context');
assert.equal(verifiedNativeCadenceReferenceForPart(
  flattenedRegionalParts[0], regionalLive, '2026-08-18T13:00:00.000Z'), true,
  'the final audit must recognize native-cadence evidence after flattening coastal parts');
assert.equal(nativeCadenceHoldHoursForPart(regionalPart, regionalLive), 0,
  'a native regional row is evidence, but only an explicit closure-bound state-only row authorizes held hours');
const regionalReferenceSample = latestVerifiedNativeCadenceSampleForPart(
  { ...regionalPart, onshoreDirectionDeg: 45 },
  regionalLive,
  '2026-08-18T13:00:00.000Z',
);
assert.equal(regionalReferenceSample?.time, '2026-08-18T13:00:00.000Z');
assert.equal(regionalReferenceSample?.currentVerified, true);
assert.ok(Number.isFinite(regionalReferenceSample?.currentSpeedMps));
assert.ok(Number.isFinite(regionalReferenceSample?.currentAlignment));
assert.deepEqual(Object.keys(regionalReferenceSample).sort(), [
  'currentAlignment', 'currentProvenance', 'currentSpeedMps', 'currentVerified', 'time',
].sort(), 'referenceprøven må kun føre den minimale source-bound hold-proveniens videre');
assert.deepEqual(regionalReferenceSample.currentProvenance, {
  status: 'verified',
  sourceClass: 'owner-approved-regional-proxy',
  source: 'dmi-dkss-lf-regional-proxy',
  collection: 'dkss_lf',
  distanceKm: 6.2,
});
const regionalReferenceText = JSON.stringify(regionalReferenceSample).toLowerCase();
for (const forbidden of [
  'umps', 'vmps', 'samplingpoint', 'gridpoint', 'waterpoint', 'coordinates',
  'latitude', 'longitude',
]) {
  assert.equal(regionalReferenceText.includes(forbidden), false,
    `native reference projection must not retain ${forbidden}`);
}

for (const [exactNormalSpeedMps, expectedLegacySpeedMps] of [
  [0.0349, 0.03],
  [0.035, 0.04],
]) {
  const boundaryDocument = buildOperationalLive([
    copernicusEntry,
    futureCopernicusEntry,
    { ...regionalEntry, uMps: exactNormalSpeedMps, vMps: 0 },
  ]);
  const exactProjection = latestVerifiedNativeCadenceSampleForPart(
    { ...regionalPart, onshoreDirectionDeg: 90 },
    boundaryDocument,
    '2026-08-18T13:00:00.000Z',
    { projection: 'integrated-exact' },
  );
  const legacyProjection = latestVerifiedNativeCadenceSampleForPart(
    { ...regionalPart, onshoreDirectionDeg: 90 },
    boundaryDocument,
    '2026-08-18T13:00:00.000Z',
    { projection: 'candidate-g-legacy-quantized' },
  );
  assert.equal(exactProjection?.currentSpeedMps, exactNormalSpeedMps,
    'the integrated migration reference must retain exact verified U/V-derived speed');
  assert.equal(exactProjection?.currentAlignment, 1);
  assert.equal(legacyProjection?.currentSpeedMps, expectedLegacySpeedMps,
    'the rollback oracle keeps its historical display-quantized projection');
}

for (const [label, poisonedEntry] of [
  ['wrong source', { ...regionalEntry, source: 'dmi-unapproved-regional-proxy' }],
  ['wrong grid', { ...regionalEntry, gridPoint: [12, 56] }],
  ['future model run', { ...regionalEntry, modelRun: '2026-08-18T13:00:00.000Z' }],
  ['wrong valid time', { ...regionalEntry, validTime: '2026-08-18T13:00:00.000Z' }],
  ['stale acquisition', { ...regionalEntry, capturedAt: '2026-08-17T12:00:00.000Z' }],
  ['wrong distance', { ...regionalEntry, distanceKm: 15.1 }],
]) {
  assert.equal(latestVerifiedNativeCadenceSampleForPart(
    { ...regionalPart, onshoreDirectionDeg: 45 },
    { ...regionalLive, entries: [...live.entries, poisonedEntry] },
    '2026-08-18T13:00:00.000Z',
  ), null, `${label} must not authorize a native hold`);
}
assert.equal(latestVerifiedNativeCadenceSampleForPart(
  { ...regionalPart, onshoreDirectionDeg: 45 }, regionalLive, '2026-08-18T16:00:01.000Z'), null,
'a native measurement older than three hours must not seed Candidate G');
assert.equal(verifiedNativeCadenceReferenceForPart(
  regionalPart, regionalLive, '2026-08-18T13:00:00.000Z'), true);
assert.equal(verifiedNativeCadenceReferenceForPart(
  regionalPart, regionalLive, '2026-08-18T14:00:00.000Z'), false,
'a held state must reference a real native source row, not an invented intermediate hour');
assert.equal(nativeCadenceHoldHoursForPart(part, live), 0,
  'Copernicus entries must not receive native-cadence hold permission');
const record = {
  model: { completeness: {
    currentVectorSemanticsVersion: 3, currentVectorSelection: dmiSource.vectorSelection,
    currentMaxDistanceKm: 5, samplingPoint: part.waterPoint, gridPoints: {},
  } },
  hourly: [
    { time: '2026-08-18T12:00:00.000Z', currentUMps: 0.1, currentVMps: 0.2, currentSpeedMps: 0.22, currentDirectionDeg: 27, sources: { current: dmiSource } },
    { time: '2026-08-18T13:00:00.000Z', currentUMps: null, currentVMps: null, sources: { current: { provider: 'missing' } } },
    { time: '2026-08-18T14:00:00.000Z', currentUMps: null, currentVMps: null, sources: { current: { provider: 'missing' } } },
    { time: '2026-08-23T10:00:00.000Z', currentUMps: null, currentVMps: null, sources: { current: { provider: 'missing' } } },
  ],
};
const merged = mergeLiveCurrentPilotIntoRecord(record, part, live, {
  primaryCurrentVerified: row => row.time === '2026-08-18T12:00:00.000Z',
});
assert.equal(merged.hourly[0].sources.current.provider, 'dmi', 'Gyldig lokal DMI skal altid vinde.');
assert.equal(merged.hourly[1].sources.current.provider, 'copernicus');
assert.equal(merged.hourly[1].currentSpeedMps, 0.5);
assert.equal(merged.hourly[1].currentDirectionDeg, 143);
assert.equal(merged.hourly[2].currentUMps, null, 'Et nabotidspunkt må ikke udfyldes ved interpolation.');
assert.equal(merged.hourly[3].currentUMps, -0.12,
  'Target+117 must remain valid because acquisition freshness is measured against productionReferenceAt, not validTime.');
assert.ok(verifiedLivePilotSource(merged.hourly[1].currentProvenance, part, { requireStatus: true }));
assert.ok(verifiedLivePilotSource(merged.hourly[3].currentProvenance, part, { requireStatus: true }));
const resignedProjection = overrides => {
  const value = { ...merged.hourly[1].currentProvenance, ...overrides };
  value.recordProjectionSha256 = sha256(projectionPayload(value));
  return value;
};
assert.equal(verifiedLivePilotSource(
  resignedProjection({ verticalLayerRankM: 13 }), part, { requireStatus: true },
), null, 'the independently mutable layer-rank field must still equal the sealed physical layer');
assert.equal(verifiedLivePilotSource(
  resignedProjection({ distanceKm: 0.01 }), part, { requireStatus: true },
), null, 'declared distance must agree with the exact grid point, not merely remain under 5 km');
assert.equal(verifiedLivePilotSource(resignedProjection({
  acquisitionAt: '2026-08-18T13:20:00', capturedAt: '2026-08-18T13:20:00',
}), part, { requireStatus: true }), null,
'timezone-free timestamps are not provenance evidence');

// A document proof may be cached for performance, but later mutation of an
// entry or in-place replacement of array members must never reuse that proof.
const mutableLive = structuredClone(live);
assert.equal(mergeLiveCurrentPilotIntoRecord(record, part, mutableLive, {
  primaryCurrentVerified: row => row.time === '2026-08-18T12:00:00.000Z',
}).hourly[1].currentUMps, 0.3);
mutableLive.entries[0].verticalLayerRankM = 13;
assert.equal(mergeLiveCurrentPilotIntoRecord(record, part, mutableLive, {
  primaryCurrentVerified: row => row.time === '2026-08-18T12:00:00.000Z',
}).hourly[1].currentUMps, null, 'a cached proof must not survive entry mutation');
const replacedLive = structuredClone(live);
mergeLiveCurrentPilotIntoRecord(record, part, replacedLive, { primaryCurrentVerified: () => false });
replacedLive.entries[1] = replacedLive.entries[0];
assert.equal(controlledLiveCurrentEnabled(replacedLive), false,
  'the explicit document gate must reject cached proof reuse after in-place array-member replacement');
for (const malformedEntry of [
  { ...copernicusEntry, uMps: '0.3' },
  { ...copernicusEntry, distanceKm: '1.28' },
  { ...copernicusEntry, vectorSemanticsVersion: '4' },
  { ...copernicusEntry, samplingPoint: ['10', 55] },
  { ...copernicusEntry, productId: '' },
  { ...copernicusEntry, datasetVersion: 'stale-version' },
  { ...copernicusEntry, partId: 'OTHER' },
  { ...copernicusEntry, parentZoneId: 'OTHER' },
  { ...copernicusEntry, targetIdentityFingerprint: 'sha256:wrong' },
  { ...copernicusEntry, capturedAt: '2026-08-10T13:00:00.000Z' },
]) {
  const malformedMerge = mergeLiveCurrentPilotIntoRecord(
    record,
    part,
    { ...live, entries: [malformedEntry, futureCopernicusEntry] },
    { primaryCurrentVerified: row => row.time === '2026-08-18T12:00:00.000Z' },
  );
  assert.equal(malformedMerge.hourly[1].currentUMps, null,
    'coercible or incompletely identified live-current evidence must fail closed');
}
assert.equal(nativeCadenceHoldHoursForPart(regionalPart, {
  ...regionalLive,
  entries: [...live.entries, { ...regionalEntry, modelRun: null }],
}), 0, 'regional cadence hold requires a real model run no newer than the valid time');

for (const poisonedDocument of [
  { ...live, copernicusRangeSeal: { ...copernicusRangeSeal, requiredPairCount: 1 } },
  { ...live, copernicusRangeSeal: { ...copernicusRangeSeal, recordRefsSha256: sha256('wrong-refs') } },
  { ...live, entries: [{ ...copernicusEntry, uMps: 0.31 }, futureCopernicusEntry] },
  { ...live, entries: [{ ...copernicusEntry, gridPoint: [10.03, 55] }, futureCopernicusEntry] },
  { ...live, entries: [{ ...copernicusEntry, collectionId: sha256('wrong-collection') }, futureCopernicusEntry] },
  { ...live, entries: [copernicusEntry, { ...futureCopernicusEntry, acquisitionAt: '2026-08-19T00:00:00Z', capturedAt: '2026-08-19T00:00:00Z' }] },
]) {
  const poisoned = mergeLiveCurrentPilotIntoRecord(record, part, poisonedDocument, {
    primaryCurrentVerified: row => row.time === '2026-08-18T12:00:00.000Z',
  });
  assert.equal(poisoned.hourly[1].currentUMps, null,
    'A broken range seal, raw vector, grid/link identity or future acquisition must disable the entire supplemental projection.');
}
assert.equal(mergeLiveCurrentPilotIntoRecord(record, part, {
  ...live,
  copernicusRangeSeal: null,
}, { primaryCurrentVerified: () => false }).hourly[1].currentUMps, 0.3,
'operationalClosure v2 is authoritative for target..+117 when advisory history is explicitly empty');

const flow = flowPointsFromForecastRecord(
  merged,
  part.waterPoint,
  '2026-08-18T13:00:00.000Z',
  part,
);
assert.deepEqual(flow.current, [10.02, 55]);
assert.equal(flow.sources.current, 'copernicus-current-grid');
const dmiFlow = flowPointsFromForecastRecord(
  merged,
  part.waterPoint,
  '2026-08-18T12:00:00.000Z',
  part,
);
assert.equal(dmiFlow.sources.current, 'dmi-marine-grid');

const rollback = mergeLiveCurrentPilotIntoRecord(record, part, { ...live, mode: 'dmi-only-rollback', enabled: false });
assert.equal(rollback.hourly[1].currentUMps, null, 'Rollback må ikke føre supplerende strøm til score.');
const tooFar = { ...merged.hourly[1].currentProvenance, gridPoint: [10.3, 55], distanceKm: 20 };
assert.equal(verifiedLivePilotSource(tooFar, part, { requireStatus: true }), null, 'En fjern, ikke-godkendt celle skal afvises.');

const features = { type: 'FeatureCollection', features: [{ properties: { id: 'Z1', zoneStatus: 'active', dataPoint: [10, 55] } }] };
const coastalParts = { enabled: true, zones: {
  Z1: { currentReferenceAt: '2026-08-18T13:00:00.000Z' },
}, parts: {
  P1: { zoneId: 'Z1', flowPoints: flow, current: { time: '2026-08-18T13:00:00.000Z', weather: { currentDirectionDeg: 143 } } },
} };
const arrows = buildFlowArrowCandidates(features, () => ({ current: {}, flowPoints: {} }), coastalParts, 10);
assert.equal(arrows.length, 1);
assert.equal(arrows[0].source, 'copernicus-current-grid');
assert.deepEqual(arrows[0].point, [10.02, 55]);

const [buildWorkflow, updateWeather, packageRelease] = await Promise.all([
  readProductionWorkflowSource('build'),
  fs.readFile('scripts/update-weather.mjs', 'utf8'),
  fs.readFile('scripts/package-release.mjs', 'utf8'),
]);
const buildPosition = buildWorkflow.indexOf('name: Build public seven-day current history and controlled live selection');
const weatherPosition = buildWorkflow.indexOf('name: Update central weather cache');
assert.ok(buildPosition >= 0 && buildPosition < weatherPosition, 'Livehistorikken skal bygges før score og pile.');
assert.match(updateWeather, /mergeLiveCurrentPilotIntoRecord/);
assert.match(updateWeather, /current-pilot-history\.json/);
assert.match(updateWeather, /latestVerifiedNativeCadenceSampleForPart/,
  'weather build must fetch the last exact native-cadence row before the public window');
assert.match(updateWeather, /resolveNativeCadenceReferenceSample/,
  'weather build must pass a data-minimised native-reference resolver into integrated state replay');
for (const token of [
  'nativeCadenceHoldHours,',
  'resolveNativeCadenceReferenceSample:',
  'currentMemoryReady: candidate.transportMemoryReady',
  'currentMemoryStatus: candidate.transportMemoryStatus',
]) assert.ok(updateWeather.includes(token), `weather build must bind the cadence-hold proof without inventing hours: ${token}`);
assert.ok(!packageRelease.includes("'data/live/*'"), 'Onlinehistorikken må ikke udelukkes af releasepakken.');

console.log('OK: DMI-først, eksakt Copernicus-fletning, rigtig pilcelle og DMI-only rollback er regressionslåst.');
