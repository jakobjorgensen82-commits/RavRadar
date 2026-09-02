import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import {
  controlledLiveCurrentEnabled,
  copernicusLiveRecordProjectionSha256,
  latestVerifiedNativeCadenceSampleForPart,
  mergeLiveCurrentPilotIntoRecord,
  nativeCadenceHoldHoursForPart,
  stateOnlyCurrentRowForbiddenFields,
  verifiedNativeCadenceReferenceForPart,
  verifiedStateOnlyCurrentHold,
} from './lib/live-current-pilot.mjs';
import { verifiedIntegratedPartHourly } from './lib/ravscore-production-adapters.mjs';

const canonicalJson = value => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};
const sha256 = value => `sha256:${crypto.createHash('sha256').update(canonicalJson(value)).digest('hex')}`;
const REFERENCE = '2026-09-02T08:00:00Z';
const SOURCE_TIME = '2026-09-02T07:00:00Z';
const NATIVE_TIME = '2026-09-02T11:00:00Z';
const END = '2026-09-07T05:00:00Z';
const CLOSURE_ID = sha256({ fixture: 'closure' });
const TARGET_REGISTRY_SHA = sha256({ fixture: 'targets' });
const SOURCE_ASSET_SHA = sha256({ fixture: 'source-asset' });
const SOURCE_PROOF_SHA = sha256({ fixture: 'source-proof' });
const MODEL_RUN = '2026-09-02T05:00:00Z';
const ASSIGNMENT_CONTRACT = 'current-operational-source-assignment-v1';
const ADVISORY_ASSIGNMENT_CONTRACT = 'current-advisory-past-model-field-source-assignment-v1';

const fingerprint = part => sha256({
  schemaVersion: 1,
  targets: [[
    part.partId,
    part.zoneId,
    part.waterPoint[0].toFixed(7),
    part.waterPoint[1].toFixed(7),
  ]],
});
const assignmentSha = assignment => sha256({
  schemaVersion: 1,
  contractId: ASSIGNMENT_CONTRACT,
  assignment,
});
const regionalVectorSha = ({ partId, validTime, uMps, vMps }) => sha256({
  schemaVersion: 1,
  contractId: 'regional-dmi-private-vector-commitment-v1',
  partId,
  collection: 'dkss_lf',
  modelRun: MODEL_RUN,
  validTime,
  sourceAssetSha256: SOURCE_ASSET_SHA,
  verticalLayer: 'depthbelowsea:5',
  verticalLayerRankM: '5.000',
  uMps: uMps.toFixed(5),
  vMps: vMps.toFixed(5),
});

const copPart = { partId: 'FIXTURE-COP', zoneId: 'FIXTURE-ZONE-COP', waterPoint: [0, 0] };
const regionalPart = {
  partId: 'FIXTURE-REGIONAL', zoneId: 'FIXTURE-ZONE-REGIONAL',
  waterPoint: [0, 0], onshoreDirectionDeg: 45,
};
const recordId = sha256({ fixture: 'record' });
const acquisitionId = sha256({ fixture: 'acquisition' });
const copRef = {
  partId: copPart.partId,
  validTime: REFERENCE,
  recordId,
  acquisitionId,
  source: 'copernicus-baltic-nemo',
};
const copIdentity = {
  partId: copPart.partId,
  validTime: REFERENCE,
  classification: 'COPERNICUS_BALTIC',
  source: copRef.source,
  recordId,
  acquisitionId,
  recordRefSha256: sha256({
    contractId: 'current-operational-copernicus-record-ref-v1', recordRef: copRef,
  }),
};
const copEntry = {
  recordProjectionContractId: 'copernicus-live-current-record-fixed-decimal-v1',
  recordId, acquisitionId, collectionId: CLOSURE_ID, productionReferenceAt: REFERENCE,
  partId: copPart.partId, parentZoneId: copPart.zoneId,
  targetIdentityFingerprint: fingerprint(copPart), validTime: REFERENCE,
  capturedAt: '2026-09-02T08:20:00Z', acquisitionAt: '2026-09-02T08:20:00Z',
  acquisitionStatus: 'COMPLETE',
  requestContractId: 'copernicus-current-multitime-bounded-spatial-shards-v1',
  selectionPolicyId: 'per-native-time-nearest-shared-uv-column-then-deepest-common-layer-v1',
  samplingPoint: copPart.waterPoint, provider: 'copernicus',
  sourceClass: 'supplemental-local-current', source: copRef.source,
  productId: 'BALTICSEA_ANALYSISFORECAST_PHY_003_006',
  datasetId: 'cmems_mod_bal_phy_anfc_PT1H-i', datasetVersion: '202411',
  gridPoint: copPart.waterPoint, distanceKm: 0, verticalLayer: 'depth:5',
  verticalLayerM: 5, verticalLayerRankM: 5, layerQuality: 'deepest-common-layer',
  sharedLayerCount: 1, componentPair: 'same-time-cell-layer', interpolation: false,
  vectorSemanticsVersion: 4, uMps: 0.3, vMps: -0.4,
  closureContractId: 'current-operational-673x118-closure-ready-v1',
  closureId: CLOSURE_ID, closureAssignmentSha256: assignmentSha(copIdentity),
  classification: copIdentity.classification, recordRefSha256: copIdentity.recordRefSha256,
};
copEntry.recordProjectionSha256 = copernicusLiveRecordProjectionSha256(copEntry);

const regionalEntry = ({ validTime, sourceValidTime, classification, holdAgeHours }) => {
  const uMps = 0.12345;
  const vMps = -0.23456;
  const vectorCommitmentSha256 = regionalVectorSha({
    partId: regionalPart.partId, validTime: sourceValidTime, uMps, vMps,
  });
  const identity = {
    partId: regionalPart.partId,
    validTime,
    classification,
    sourceValidTime,
    sourceModelRun: MODEL_RUN,
    sourceAssetSha256: SOURCE_ASSET_SHA,
    sourceProofSha256: SOURCE_PROOF_SHA,
    vectorCommitmentSha256,
  };
  if (classification === 'REGIONAL_DMI_DERIVED_HOLD') identity.holdAgeHours = holdAgeHours;
  const entry = {
    partId: regionalPart.partId, parentZoneId: regionalPart.zoneId,
    targetIdentityFingerprint: fingerprint(regionalPart), validTime, sourceValidTime,
    capturedAt: '2026-09-02T08:00:00Z', productionReferenceAt: REFERENCE,
    provider: 'dmi',
    sourceClass: 'owner-approved-regional-proxy', source: 'dmi-dkss-lf-regional-proxy',
    collection: 'dkss_lf', modelRun: MODEL_RUN,
    closureContractId: 'current-operational-673x118-closure-ready-v1',
    closureId: CLOSURE_ID, classification,
    closureAssignmentSha256: assignmentSha(identity), sourceAssetSha256: SOURCE_ASSET_SHA,
    sourceProofSha256: SOURCE_PROOF_SHA, vectorCommitmentSha256,
  };
  if (classification === 'REGIONAL_DMI_DERIVED_HOLD') {
    Object.assign(entry, {
      holdAgeHours, stateOnly: true, currentVectorAvailable: false, arrowAvailable: false,
    });
  } else {
    Object.assign(entry, {
      samplingPoint: regionalPart.waterPoint, gridPoint: [0.1, 0], distanceKm: 11.11949,
      verticalLayer: 'depthbelowsea:5', verticalLayerRankM: 5,
      layerQuality: 'regional-proxy-bottom-layer', componentPair: 'same-time-cell-layer',
      interpolation: false, vectorSemanticsVersion: 4, uMps, vMps,
    });
  }
  return entry;
};
const heldEntry = regionalEntry({
  validTime: REFERENCE, sourceValidTime: SOURCE_TIME,
  classification: 'REGIONAL_DMI_DERIVED_HOLD', holdAgeHours: 1,
});
const nativeEntry = regionalEntry({
  validTime: NATIVE_TIME, sourceValidTime: NATIVE_TIME,
  classification: 'REGIONAL_DMI_NATIVE',
});
const entries = [copEntry, heldEntry, nativeEntry]
  .sort((left, right) => left.validTime.localeCompare(right.validTime)
    || left.partId.localeCompare(right.partId));
const safeClosure = {
  schemaVersion: 1,
  contractId: 'current-operational-673x118-closure-safe-v1',
  closureId: CLOSURE_ID,
  status: 'READY', productionReferenceAt: REFERENCE, operationalRangeEndAt: END,
  targetCount: 673, operationalHourCount: 118, totalPairCount: 673 * 118,
  sourceOrderContractId: 'dmi-verified-then-copernicus-baltic-then-amm15-then-regional-dmi-v1',
  dmiVerifiedPairCount: 673 * 118 - 3, copernicusBalticPairCount: 1,
  copernicusAmm15PairCount: 0, regionalNativePairCount: 1,
  regionalDerivedHoldPairCount: 1, regionalResidualPairCount: 2,
  supplementalAssignmentCount: 3, missingPairCount: 0,
  copernicusCompleteWithoutSourceStage: false,
  targetRegistrySha256: TARGET_REGISTRY_SHA, dmiCurrentInputSha256: sha256({ fixture: 'dmi' }),
  dmiLedgerSha256: sha256({ fixture: 'ledger' }), dmiAttestationSha256: sha256({ fixture: 'attestation' }),
  copernicusRegistrySha256: sha256({ fixture: 'registry' }),
  copernicusShadowSha256: sha256({ fixture: 'cop-shadow' }),
  copernicusSourceStageSha256: sha256({ fixture: 'source-stage' }),
  copernicusRecordRefsSha256: sha256([copRef]),
  regionalEvidenceSha256: sha256({ fixture: 'regional-evidence' }),
  regionalPolicySha256: sha256({ fixture: 'regional-policy' }),
  regionalPairRefsSha256: sha256({ fixture: 'regional-refs' }),
  advisoryHistoryRequiredPairCount: 1,
  advisoryHistoryRequiredPairsSha256: sha256({
    contractId: 'copernicus-required-part-time-pairs-v1',
    pairs: [{ partId: copPart.partId, validTime: SOURCE_TIME }],
  }),
  advisoryHistoryAvailablePairCount: 0,
  advisoryHistoryMissingPairCount: 1,
  advisoryHistoryRecordRefsSha256: sha256([]),
  advisoryHistoryAssignmentCount: 0,
  advisoryHistoryAssignmentsSha256: sha256([]),
  supplementalAssignmentsSha256: sha256(entries.map(entry => entry.closureAssignmentSha256)),
  assignmentsSha256: sha256({ fixture: 'all-assignments' }),
  coordinatesIncluded: false, rawVectorsIncluded: false,
  partIdsIncluded: false, pairRefsIncluded: false,
};
safeClosure.safeProjectionSha256 = sha256(safeClosure);
const live = {
  schemaVersion: 1, controlledLivePilot: true, mode: 'controlled-live', enabled: true,
  credentialsIncluded: false, targetFingerprint: TARGET_REGISTRY_SHA,
  operationalClosure: safeClosure, copernicusRangeSeal: null, entries, advisoryEntries: [],
};

assert.equal(controlledLiveCurrentEnabled(live), true,
  'missing past model fields must not block operational readiness');
assert.equal(controlledLiveCurrentEnabled({ ...live, operationalClosure: null }), false);
assert.equal(controlledLiveCurrentEnabled({ ...live, entries: entries.slice(1) }), false);
assert.equal(controlledLiveCurrentEnabled({
  ...live, operationalClosure: { ...safeClosure, dmiLedgerSha256: sha256({ tampered: true }) },
}), false, 'the safe projection must reject opaque upstream-hash tampering');

const pureDmiSafeClosure = {
  ...safeClosure,
  dmiVerifiedPairCount: 673 * 118,
  copernicusBalticPairCount: 0,
  copernicusAmm15PairCount: 0,
  regionalNativePairCount: 0,
  regionalDerivedHoldPairCount: 0,
  regionalResidualPairCount: 0,
  supplementalAssignmentCount: 0,
  copernicusCompleteWithoutSourceStage: true,
  copernicusSourceStageSha256: null,
  copernicusRecordRefsSha256: sha256([]),
  advisoryHistoryRequiredPairCount: 0,
  advisoryHistoryRequiredPairsSha256: sha256({
    contractId: 'copernicus-required-part-time-pairs-v1', pairs: [],
  }),
  advisoryHistoryAvailablePairCount: 0,
  advisoryHistoryMissingPairCount: 0,
  advisoryHistoryRecordRefsSha256: sha256([]),
  advisoryHistoryAssignmentCount: 0,
  advisoryHistoryAssignmentsSha256: sha256([]),
  supplementalAssignmentsSha256: sha256([]),
};
delete pureDmiSafeClosure.safeProjectionSha256;
pureDmiSafeClosure.safeProjectionSha256 = sha256(pureDmiSafeClosure);
const pureDmiLive = {
  ...live,
  operationalClosure: pureDmiSafeClosure,
  copernicusRangeSeal: null,
  entries: [],
  advisoryEntries: [],
};
assert.equal(controlledLiveCurrentEnabled(pureDmiLive), true,
  '79,414 verified DMI assignments must remain operational without supplements');
assert.equal(controlledLiveCurrentEnabled({
  ...pureDmiLive,
  operationalClosure: null,
  copernicusRangeSeal: { status: 'COMPLETE' },
}), false, 'a legacy closure-less zero-gap Copernicus seal cannot replace the DMI closure');

const copRecord = { hourly: [{ time: REFERENCE, currentUMps: null, currentVMps: null }] };
const mergedCop = mergeLiveCurrentPilotIntoRecord(copRecord, copPart, live);
assert.equal(mergedCop.hourly[0].currentUMps, 0.3);

const regionalRecord = { hourly: [
  {
    time: REFERENCE,
    currentUMps: 9,
    currentVMps: -8,
    currentSpeedMps: 12,
    currentDirectionDeg: 123,
    currentCoastNormalSpeedMps: 7,
    coastNormalSpeedMps: 6,
    currentAlignment: 0.4,
    gridPoint: [1, 2],
    samplingPoint: [3, 4],
    arrow: { directionDeg: 123 },
    arrowSource: 'stale-current-grid',
    currentGridCell: { id: 'stale' },
    flowPoints: { current: [1, 2] },
    sources: { current: { provider: 'stale' }, wave: { provider: 'fixture-wave' } },
  },
  { time: NATIVE_TIME, currentUMps: null, currentVMps: null },
] };
const mergedRegional = mergeLiveCurrentPilotIntoRecord(regionalRecord, regionalPart, live);
assert.deepEqual(stateOnlyCurrentRowForbiddenFields(mergedRegional.hourly[0]), [],
  'state-only merge must remove every stale current vector/grid/arrow projection');
assert.deepEqual(
  Object.keys(mergedRegional.hourly[0])
    .filter(field => field.toLowerCase().startsWith('current'))
    .sort(),
  ['currentProvenance', 'currentStateOnlyHold'],
  'state-only merge may retain only the provenance and exact hold marker as current fields',
);
assert.equal(Object.hasOwn(mergedRegional.hourly[0].sources, 'current'), false,
  'state-only merge must remove a stale nested current source');
assert.equal(mergedRegional.hourly[0].sources.wave.provider, 'fixture-wave');
assert.equal(mergedRegional.hourly[0].currentProvenance.validTime, REFERENCE);
assert.equal(mergedRegional.hourly[0].currentProvenance.sourceValidTime, SOURCE_TIME);
assert.equal(mergedRegional.hourly[0].currentProvenance.holdAgeHours, 1);
assert.equal(mergedRegional.hourly[0].currentProvenance.classification, 'REGIONAL_DMI_DERIVED_HOLD');
assert.equal(mergedRegional.hourly[0].currentProvenance.status, 'verified-derived-state-only');
assert.equal(mergedRegional.hourly[0].currentProvenance.stateOnly, true);
assert.deepEqual(
  mergedRegional.hourly[0].currentStateOnlyHold,
  verifiedStateOnlyCurrentHold(
    mergedRegional.hourly[0].currentProvenance,
    REFERENCE,
    regionalPart,
  ),
  'the merge must bind the state-only hold to this exact part/hour',
);
for (const forbidden of [
  'uMps', 'vMps', 'currentUMps', 'currentVMps', 'currentSpeedMps',
  'currentDirectionDeg', 'currentCoastNormalSpeedMps', 'gridPoint', 'arrow', 'arrowSource',
]) {
  assert.equal(Object.hasOwn(mergedRegional.hourly[0].currentProvenance, forbidden), false,
    `regional state-only provenance must not publish ${forbidden}`);
  assert.equal(Object.hasOwn(mergedRegional.hourly[0].currentStateOnlyHold, forbidden), false,
    `regional state-only marker must not publish ${forbidden}`);
}
const sanitizedRegional = verifiedIntegratedPartHourly(
  mergedRegional,
  { zones: {} },
  'PART::FIXTURE-REGIONAL',
  regionalPart,
);
assert.equal(sanitizedRegional[0].currentProvenance.status, 'unverified');
assert.equal(sanitizedRegional[0].currentStateOnlyHold.validTime, REFERENCE);
assert.equal(sanitizedRegional[0].currentStateOnlyHold.sourceValidTime, SOURCE_TIME);
assert.equal(sanitizedRegional[0].currentStateOnlyHold.partId, regionalPart.partId);
assert.deepEqual(stateOnlyCurrentRowForbiddenFields(sanitizedRegional[0]), [],
  'integrated sanitizer must retain only the state marker, never a current projection');
for (const [field, poison] of [
  ['gridPoint', [1, 2]],
  ['arrow', { directionDeg: 123 }],
  ['currentAlignment', 0.5],
  ['coastNormalSpeedMps', 0.1],
  ['currentGridCell', { id: 'stale' }],
  ['rawUMps', 0.2],
  ['currentVectorAvailable', false],
]) {
  assert.throws(() => verifiedIntegratedPartHourly(
    { hourly: [{ ...mergedRegional.hourly[0], [field]: poison }] },
    { zones: {} },
    'PART::FIXTURE-REGIONAL',
    regionalPart,
  ), /cannot contain current vector or projection fields/,
  `integrated sanitizer must reject state-only ${field}`);
}
assert.equal(mergedRegional.hourly[1].currentProvenance.classification, 'REGIONAL_DMI_NATIVE');
assert.equal(nativeCadenceHoldHoursForPart(regionalPart, live), 1,
  'only the maximum explicit closure-authorized state hold may be retained');
assert.equal(verifiedNativeCadenceReferenceForPart(regionalPart, live, NATIVE_TIME), true);
assert.ok(latestVerifiedNativeCadenceSampleForPart(regionalPart, live, NATIVE_TIME));
assert.equal(latestVerifiedNativeCadenceSampleForPart(regionalPart, live, REFERENCE), null,
  'a derived hold is not an exact native source reference');

// Past model-field advisory history is closure-bound but remains outside the operational
// 79,414 assignments; an OPERATIONAL_COMPLETE seal is optional legacy evidence.
const advisoryRecordId = sha256({ fixture: 'advisory-record' });
const advisoryRef = {
  partId: copPart.partId, validTime: SOURCE_TIME, recordId: advisoryRecordId,
  acquisitionId, source: 'copernicus-baltic-nemo',
};
const operationalIdentity = {
  sealContractId: 'copernicus-current-operational118-advisory-history48-seal-v1',
  productionReferenceAt: REFERENCE,
  operationalRangeStartAt: REFERENCE,
  operationalRangeEndAt: END,
  operationalHourCount: 118,
  advisoryHistoryStartAt: '2026-08-31T08:00:00Z',
  advisoryHistoryEndAt: SOURCE_TIME,
  advisoryHistoryHourCount: 48,
  targetRegistrySha256: TARGET_REGISTRY_SHA,
  dmiCurrentInputSha256: safeClosure.dmiCurrentInputSha256,
  dmiVerifierContractId: 'dmi-native-current-provenance-v1',
  operationalRequiredPairsSha256: sha256({
    contractId: 'copernicus-required-part-time-pairs-v1',
    pairs: [{ partId: copPart.partId, validTime: REFERENCE }],
  }),
  operationalRequiredPairCount: 1,
  operationalRecordRefs: [copRef],
  operationalRecordRefsSha256: sha256([copRef]),
  advisoryHistoryRequiredPairsSha256: sha256({
    contractId: 'copernicus-required-part-time-pairs-v1',
    pairs: [{ partId: copPart.partId, validTime: SOURCE_TIME }],
  }),
  advisoryHistoryRequiredPairCount: 1,
  advisoryHistoryRecordRefs: [advisoryRef],
  advisoryHistoryRecordRefsSha256: sha256([advisoryRef]),
  advisoryHistoryAvailablePairCount: 1,
  advisoryHistoryMissingPairCount: 0,
  advisoryHistoryComplete: true,
  selectionPolicyId: 'per-native-time-nearest-shared-uv-column-then-deepest-common-layer-v1',
  acquisitionIds: [acquisitionId],
};
const operationalCollectionId = sha256(operationalIdentity);
const rangeSeal = {
  collectionId: operationalCollectionId,
  status: 'OPERATIONAL_COMPLETE',
  ...Object.fromEntries(Object.entries(operationalIdentity).filter(([key]) => ![
    'operationalRecordRefs', 'advisoryHistoryRecordRefs', 'acquisitionIds',
  ].includes(key))),
  sealedAt: '2026-09-02T08:30:00Z',
};
const advisoryEntry = {
  ...copEntry,
  recordId: advisoryRecordId,
  collectionId: CLOSURE_ID,
  validTime: SOURCE_TIME,
  classification: 'COPERNICUS_ADVISORY_PAST_MODEL_FIELD',
  recordRefSha256: sha256({
    contractId: 'current-advisory-copernicus-record-ref-v1',
    recordRef: advisoryRef,
  }),
  uMps: 0.07,
  vMps: 0.02,
};
const advisoryIdentity = {
  ...advisoryRef,
  classification: 'COPERNICUS_ADVISORY_PAST_MODEL_FIELD',
  recordRefSha256: advisoryEntry.recordRefSha256,
};
advisoryEntry.closureAssignmentSha256 = sha256({
  schemaVersion: 1,
  contractId: ADVISORY_ASSIGNMENT_CONTRACT,
  assignment: advisoryIdentity,
});
advisoryEntry.recordProjectionSha256 = copernicusLiveRecordProjectionSha256(advisoryEntry);
const pureClosure = {
  ...safeClosure,
  dmiVerifiedPairCount: 673 * 118 - 1,
  regionalNativePairCount: 0,
  regionalDerivedHoldPairCount: 0,
  regionalResidualPairCount: 0,
  supplementalAssignmentCount: 1,
  copernicusCompleteWithoutSourceStage: true,
  copernicusSourceStageSha256: null,
  advisoryHistoryAvailablePairCount: 1,
  advisoryHistoryMissingPairCount: 0,
  advisoryHistoryRecordRefsSha256: sha256([advisoryRef]),
  advisoryHistoryAssignmentCount: 1,
  advisoryHistoryAssignmentsSha256: sha256([advisoryEntry.closureAssignmentSha256]),
  supplementalAssignmentsSha256: sha256([copEntry.closureAssignmentSha256]),
};
delete pureClosure.safeProjectionSha256;
pureClosure.safeProjectionSha256 = sha256(pureClosure);
const pastModelHistoryLive = {
  ...live,
  operationalClosure: pureClosure,
  entries: [copEntry],
  copernicusRangeSeal: null,
  advisoryEntries: [advisoryEntry],
};
assert.equal(controlledLiveCurrentEnabled(pastModelHistoryLive), true);
const mergedAdvisory = mergeLiveCurrentPilotIntoRecord(
  { hourly: [{ time: SOURCE_TIME, currentUMps: null, currentVMps: null }] },
  copPart,
  pastModelHistoryLive,
);
assert.equal(mergedAdvisory.hourly[0].currentUMps, 0.07);
assert.equal(pastModelHistoryLive.operationalClosure.supplementalAssignmentCount, 1,
  'advisory history must never count as an operational assignment');
const dmiFirstRecord = {
  hourly: [{ time: SOURCE_TIME, currentUMps: 0.41, currentVMps: -0.12 }],
};
assert.equal(mergeLiveCurrentPilotIntoRecord(
  dmiFirstRecord,
  copPart,
  pastModelHistoryLive,
  { primaryCurrentVerified: () => true },
), dmiFirstRecord, 'verified local DMI must win over a bound Copernicus past field');
assert.equal(controlledLiveCurrentEnabled({
  ...pastModelHistoryLive,
  copernicusRangeSeal: rangeSeal,
}), true, 'legacy OPERATIONAL_COMPLETE proof must remain accepted');
const advisoryTamper = structuredClone(pastModelHistoryLive);
advisoryTamper.advisoryEntries[0].uMps = 0.08;
assert.equal(controlledLiveCurrentEnabled(advisoryTamper), false);
const interpolatedAdvisory = structuredClone(pastModelHistoryLive);
interpolatedAdvisory.advisoryEntries[0].interpolation = true;
interpolatedAdvisory.advisoryEntries[0].recordProjectionSha256 =
  copernicusLiveRecordProjectionSha256(interpolatedAdvisory.advisoryEntries[0]);
assert.equal(controlledLiveCurrentEnabled(interpolatedAdvisory), false,
  'past model fields must remain exact and non-interpolated');

for (const [field, value] of [
  ['uMps', 0.12345],
  ['rawU', 0.12345],
  ['eastwardCurrent', 0.12345],
  ['currentAlignment', 0.5],
  ['gridCoordinates', [8, 55]],
  ['rawVector', [0.1, 0.2]],
  ['flowPoints', [[8, 55]]],
  ['flowArrow', { directionDeg: 90 }],
  ['arrow', { directionDeg: 90 }],
  ['currentGridCell', { id: 'stale' }],
  ['currentVerified', false],
]) {
  const forbiddenHeldProjection = structuredClone(live);
  forbiddenHeldProjection.entries.find(
    entry => entry.classification === 'REGIONAL_DMI_DERIVED_HOLD',
  )[field] = value;
  assert.equal(controlledLiveCurrentEnabled(forbiddenHeldProjection), false,
    `a derived hold must fail closed if ${field} is materialized`);
}
const sourceTimeTamper = structuredClone(live);
const poisonedHold = sourceTimeTamper.entries.find(entry => entry.classification === 'REGIONAL_DMI_DERIVED_HOLD');
poisonedHold.sourceValidTime = '2026-09-02T04:00:00Z';
poisonedHold.holdAgeHours = 4;
assert.equal(controlledLiveCurrentEnabled(sourceTimeTamper), false);

// A proof may be cached only while both entry contents and array membership stay exact.
const cachedEntryMutation = structuredClone(live);
assert.equal(controlledLiveCurrentEnabled(cachedEntryMutation), true);
cachedEntryMutation.entries.find(
  entry => entry.classification === 'REGIONAL_DMI_DERIVED_HOLD',
).holdAgeHours = 2;
assert.equal(controlledLiveCurrentEnabled(cachedEntryMutation), false,
  'a cached closure proof must not survive in-place entry mutation');
const cachedMemberReplacement = structuredClone(live);
assert.equal(controlledLiveCurrentEnabled(cachedMemberReplacement), true);
cachedMemberReplacement.entries[1] = cachedMemberReplacement.entries[0];
assert.equal(controlledLiveCurrentEnabled(cachedMemberReplacement), false,
  'a cached closure proof must not survive in-place array-member replacement');
const rollback = { ...live, mode: 'dmi-only-rollback', enabled: false };
assert.equal(controlledLiveCurrentEnabled(rollback), false);
assert.equal(mergeLiveCurrentPilotIntoRecord(copRecord, copPart, rollback), copRecord);

console.log('Current operational live adapter targeted tests passed');
