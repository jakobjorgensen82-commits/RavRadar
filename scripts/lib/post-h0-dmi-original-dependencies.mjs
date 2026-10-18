// Metadata-only dependencies of the caller's already priority-projected rich
// candidates. This is NOT authentication, replay admission or a union/winner
// calculation. In particular, it neither reconstructs OLD nor changes values.
import { types, isDeepStrictEqual } from 'node:util';
import { canonicalRavScoreStateOnlyCurrentHold } from '../../js/core/ravscore-integrated-state-pipeline.js';
import { assertIntegratedCoastalPointContinuation } from './coastal-point-staging-contract.mjs';
import { ravScoreSamplingContextKey } from './ravscore-sampling-context.mjs';
import { dmiExpectedIdentityForPart, assertRegionalSanitizedCurrentApplicable } from './ravscore-production-adapters.mjs';
import { dmiMarineCollectionAllowedForZone } from './dmi-marine-zone-exclusions.mjs';
import { inspectDmiForecastGridSampling, inspectDmiNativeGridSampling } from './dmi-forecast-store.mjs';
import { createProtectedDmiNativeCurrentInspector, PROTECTED_DMI_NATIVE_PROOF_LIMITS as LIMIT } from './protected-dmi-native-current-proofs.mjs';
import { latestVerifiedNativeCadenceSampleForPart, stateOnlyCurrentRowForbiddenFields } from './live-current-pilot.mjs';
import { canonicalSavedDmiOriginalCapture } from './saved-dmi-original-capture.mjs';
import { RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS } from './ravscore-recovery-replay.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const fail = code => {
  const error = new Error(`POST_H0_DMI_ORIGINAL_${code}`);
  error.originalDependencyCode = error.message;
  throw error;
};
function data(value, array = false) {
  if (!value || typeof value !== 'object' || types.isProxy(value)
    || Array.isArray(value) !== array
    || Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)
    || Object.getOwnPropertySymbols(value).length) fail('INPUT_INVALID');
  return value;
}
function own(value, key) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) return undefined;
  if (!Object.hasOwn(descriptor, 'value')) fail('INPUT_INVALID');
  return descriptor.value;
}
// Check only this PART's data, never canonicalize/clone national contexts or
// opaque registrations. Reject executable views before normal inspectors read
// them; synchronous calls plus fresh inspectors prevent a stale proof cache.
function plainTree(value, depth = 0, budget = { nodes: 0, bytes: 0, maximumNodes: 4096, maximumBytes: LIMIT.recordBytes }) {
  if (++budget.nodes > budget.maximumNodes || depth > 32) fail('INPUT_BOUND');
  if (value === undefined || value === null || typeof value === 'boolean' || finite(value)) return;
  if (typeof value === 'string') {
    budget.bytes += Buffer.byteLength(value);
    if (budget.bytes > budget.maximumBytes) fail('INPUT_BOUND');
    return;
  }
  data(value, Array.isArray(value));
  const keys = Object.keys(value);
  if (keys.length > 4096) fail('INPUT_BOUND');
  for (const key of keys) plainTree(own(value, key), depth + 1, budget);
}
function hour(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:00:00\.000Z$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail('WINDOW_INVALID');
  return Date.parse(value);
}
function currentSource(row) {
  const provenance = own(row, 'currentProvenance');
  if (provenance !== undefined && provenance !== null) plainTree(provenance);
  if (provenance?.status === 'verified') return provenance;
  const sources = own(row, 'sources');
  if (sources === undefined || sources === null) return null;
  data(sources);
  const source = own(sources, 'current');
  if (source !== undefined && source !== null) plainTree(source);
  return source ?? null;
}
function checkContexts(contexts, expected) {
  data(contexts, true);
  if (contexts.length > LIMIT.donorDocuments) fail('INPUT_BOUND');
  for (let index = 0; index < contexts.length; index++) {
    const value = own(contexts, String(index));
    if (value === null) continue; // normal optional historical donor; never an invented document
    const document = data(value);
    own(document, 'nativeCurrentOriginalScope'); // reject accessors, retain real opaque scopes
    for (const key of ['currentVectorSemanticsVersion', 'currentVectorSelection',
      'currentMaxDistanceKm', 'timeStrideHours', 'generatedAt']) plainTree(own(document, key));
    const zones = own(document, 'zones');
    if (zones === undefined) continue; // the normal inspector decides whether an opaque role proves this selection
    data(zones);
    const zone = own(zones, expected.entityId);
    if (zone === undefined) continue;
    data(zone);
    for (const key of Object.keys(expected)) plainTree(own(zone, key));
    const rows = own(zone, 'hourly');
    if (rows === undefined) continue;
    data(rows);
    const keys = Object.keys(rows);
    if (keys.length > LIMIT.donorRowsPerPart) fail('INPUT_BOUND');
    for (const key of keys) {
      const row = data(own(rows, key));
      for (const field of ['time', 'current-u', 'current-v']) plainTree(own(row, field));
      const sources = own(row, 'sources');
      if (sources !== undefined && sources !== null) {
        data(sources); plainTree(own(sources, 'current'));
      }
    }
  }
}

/**
 * The authenticated normal caller must qualify the actual OLD I/G pair and
 * supply the EXACT result of buildNewestValidRavScoreRecoverySources. Merely
 * calling this pure function, or labelling a source, establishes no authority.
 * Only state.time < row.time < target is scanned; a qualified HOLD additionally
 * requires its exact sourceValidTime row, including support at/before H0.
 */
export function collectPostH0DmiOriginalDependencies({
  part, initialSelection, targetReferenceAt, recoverySources, liveCurrentPilot = null,
} = {}) {
  data(part);
  for (const key of ['partId', 'waterPoint', 'onshoreDirectionDeg', 'zoneId', 'parentZoneId', 'sourceZoneId']) plainTree(own(part, key));
  data(initialSelection);
  if (!['EXISTING_INTEGRATED', 'INTEGRATED_CHECKPOINT'].includes(own(initialSelection, 'source'))) fail('INITIAL_SELECTION_INVALID');
  const state = own(initialSelection, 'state');
  // The full normal continuation validator consumes the state. Its 12-day
  // histories are not small native-source records; do not impose that record's
  // 32KiB/4096-node cap (nor traverse unrelated PART geometry).
  plainTree(state, 0, { nodes: 0, bytes: 0, maximumNodes: LIMIT.donorRowsPerPart * 256,
    maximumBytes: LIMIT.candidateBytesPerPart });
  try { assertIntegratedCoastalPointContinuation(state, { samplingContextKey: ravScoreSamplingContextKey(part) }); }
  catch { fail('INITIAL_STATE_INVALID'); }
  const initialStateAt = state.time, from = hour(initialStateAt), target = hour(targetReferenceAt);
  if (target < from || target - from > RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS * 3_600_000) fail('WINDOW_INVALID');
  const expected = dmiExpectedIdentityForPart(part);
  if (!expected) fail('INPUT_INVALID');
  data(recoverySources, true);
  if (recoverySources.length > LIMIT.donorDocuments) fail('INPUT_BOUND');
  const counts = { forwardCandidateRows: 0, directDmiRows: 0, unknownRows: 0,
    coherentRows: 0, unknownNativeEndpoints: 0, qualifiedRegionalRows: 0, qualifiedHolds: 0 };
  const captures = new Map(), rowsByTime = new Map(), holds = [];
  for (let index = 0; index < recoverySources.length; index++) {
    const source = data(own(recoverySources, String(index))), record = data(own(source, 'record'));
    const point = own(record, 'point'); plainTree(point);
    if (!Array.isArray(point) || point.length !== 2 || !point.every((value, i) => finite(value)
      && Math.abs(value - part.waterPoint[i]) <= 1e-7)) fail('SAMPLING_MISMATCH');
    const rows = data(own(record, 'hourly'), true);
    if (rows.length > LIMIT.donorRowsPerPart) fail('INPUT_BOUND');
    const contexts = own(source, 'nativeCurrentContexts') ?? [];
    checkContexts(contexts, expected);
    const inspector = createProtectedDmiNativeCurrentInspector({ contexts });
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = data(own(rows, String(rowIndex))), time = own(row, 'time'), ms = hour(time);
      const at = rowsByTime.get(time) ?? []; at.push(row); rowsByTime.set(time, at);
      if (ms <= from || ms >= target) continue;
      counts.forwardCandidateRows++;
      const marker = own(row, 'currentStateOnlyHold');
      if (marker !== null && marker !== undefined) {
        plainTree(marker);
        let hold;
        try { hold = canonicalRavScoreStateOnlyCurrentHold(marker, time); } catch { fail('HOLD_SUPPORT_REQUIRED'); }
        if (hold.partId !== part.partId || hold.parentZoneId !== (part.zoneId ?? part.parentZoneId ?? part.sourceZoneId)) fail('HOLD_SUPPORT_REQUIRED');
        if (!dmiMarineCollectionAllowedForZone(hold.collection, hold.parentZoneId)) fail('SOURCE_DOMAIN_EXCLUDED');
        if (stateOnlyCurrentRowForbiddenFields(row).some(key => own(row, key) != null)) fail('HOLD_SUPPORT_REQUIRED');
        try {
          if (!latestVerifiedNativeCadenceSampleForPart(part, liveCurrentPilot, hold.sourceValidTime,
            { requireNativeGridSampling: true, expectedHold: hold })) fail('HOLD_SUPPORT_REQUIRED');
        } catch { fail('HOLD_SUPPORT_REQUIRED'); }
        holds.push(hold);
      }
      const provenance = currentSource(row);
      if (provenance?.provider !== 'dmi') continue;
      const payload = ['currentUMps', 'currentVMps', 'currentSpeedMps', 'currentDirectionDeg'].map(key => own(row, key));
      if (!payload.some(finite)) continue; // normal priority's erased component is not a dependency
      if (!payload.every(finite)) fail('SELECTED_CURRENT_INVALID');
      if (!dmiMarineCollectionAllowedForZone(provenance.collection, expected.parentZoneId)) fail('SOURCE_DOMAIN_EXCLUDED');
      if (provenance.vectorSemanticsVersion === 4) {
        try { if (!assertRegionalSanitizedCurrentApplicable(row, part, liveCurrentPilot)) fail('REGIONAL_SUPPORT_REQUIRED'); }
        catch { fail('REGIONAL_SUPPORT_REQUIRED'); }
        counts.qualifiedRegionalRows++;
        continue;
      }
      counts.directDmiRows++;
      // The normal sanitizer adds exactly status/sourceClass to its derived
      // currentProvenance view (ravscore-production-adapters.mjs). Its original
      // sources.current must remain present and whole: stripping the wrapper
      // or reconstructing an original from it would defeat exact reprojection.
      const originalSources = own(row, 'sources');
      if (!originalSources) fail('SELECTED_ENDPOINT_UNAVAILABLE');
      data(originalSources);
      const original = own(originalSources, 'current');
      plainTree(original);
      const normalView = original && { ...original, status: 'verified', sourceClass: original.sourceClass
        ?? (original.vectorSemanticsVersion === 3 ? 'local-model-grid' : undefined) };
      if (!original || !isDeepStrictEqual(provenance, original)
        && !isDeepStrictEqual(provenance, normalView)) fail('SELECTED_ENDPOINT_UNAVAILABLE');
      const selected = { time, currentUMps: payload[0], currentVMps: payload[1], sources: { current: original } };
      const proof = inspector.inspectOriginals({ part, row: selected });
      if (!proof.ok) fail('SELECTED_ENDPOINT_UNAVAILABLE');
      const sampling = inspectDmiForecastGridSampling(provenance, 'current', time, expected).status;
      if (!['unknown', 'coherent'].includes(sampling)) fail('SELECTED_CURRENT_INVALID');
      counts[sampling === 'unknown' ? 'unknownRows' : 'coherentRows']++;
      for (const native of proof.nativeRows) {
        const status = inspectDmiNativeGridSampling(native.source).status;
        if (status === 'coherent') continue; // do not relabel corrected originals
        if (status !== 'unknown' || native.source.nativeGridSampling != null) fail('SELECTED_CURRENT_INVALID');
        const capture = canonicalSavedDmiOriginalCapture(native.source);
        if (!capture || capture.validTime !== new Date(native.time).toISOString().replace('.000Z', 'Z')) fail('CAPTURE_INCOMPLETE');
        counts.unknownNativeEndpoints++;
        captures.set(JSON.stringify(capture), capture); // all eleven exact capture fields, including acquiredAt
        if (captures.size > LIMIT.projectionAttempts) fail('PLAN_BOUND');
      }
    }
  }
  for (const hold of holds) {
    const support = rowsByTime.get(hold.sourceValidTime) ?? [];
    if (!support.length) fail('HOLD_SUPPORT_REQUIRED');
    let qualified = 0;
    for (const row of support) {
      const provenance = currentSource(row);
      if (!['currentSpeedMps', 'currentDirectionDeg', 'currentUMps', 'currentVMps'].some(key => finite(own(row, key)))) continue;
      try {
        if (!assertRegionalSanitizedCurrentApplicable(row, part, liveCurrentPilot)
          || ['sourceAssetSha256', 'sourceProofSha256', 'vectorCommitmentSha256', 'closureId',
            'closureContractId', 'targetIdentityFingerprint', 'parentZoneId'].some(key => provenance?.[key] !== hold[key])) fail('HOLD_SUPPORT_REQUIRED');
      } catch { fail('HOLD_SUPPORT_REQUIRED'); }
      qualified++;
    }
    if (!qualified) fail('HOLD_SUPPORT_REQUIRED');
    counts.qualifiedHolds++;
  }
  return { kind: 'POST_H0_DMI_ORIGINAL_DEPENDENCIES', initialStateAt, targetReferenceAt,
    scope: 'PRIORITY_PROJECTED_CANDIDATES_NOT_FINAL_REPLAY_UNION',
    authenticationPerformed: false, nativeAdmissionPerformed: false, actualReplayConsumptionProved: false,
    captures: [...captures].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, capture]) => capture), counts };
}
