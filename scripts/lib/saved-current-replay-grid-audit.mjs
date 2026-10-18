// Fixed, value-free observation of the ACTUAL normal updater's failed call.
// It never selects a source, supplies native proof, emits capture IDs or
// changes/retries the pipeline. Candidate counts are PRIORITY OUTPUTS. A
// separately reproduced forward gate input is still NOT a replay-union winner.
import { dmiExpectedIdentityForPart } from './ravscore-production-adapters.mjs';
import { inspectDmiForecastGridSampling } from './dmi-forecast-store.mjs';
import { isDeepStrictEqual } from 'node:util';
import { createProtectedDmiNativeCurrentInspector } from './protected-dmi-native-current-proofs.mjs';
import { buildRavScoreRecoveryReplay } from './ravscore-recovery-replay.mjs';
import { originalCurrentDecoderHistory } from './ravscore-recovery-source-priority.mjs';
const fail = () => { throw new Error('SAVED_CURRENT_REPLAY_DIAGNOSTIC_UNAVAILABLE'); };
const finite = value => typeof value === 'number' && Number.isFinite(value);
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 10_000;
const COUNTERS = Object.freeze(['sourceRecordCount', 'inputRowCount', 'beforeOrAtH0Rows', 'interiorRows',
  'atOrAfterTargetRows', 'interiorCurrentCandidates', 'interiorDmiCandidates', 'interiorUnknownCandidates',
  'interiorCoherentCandidates', 'interiorOtherSamplingCandidates', 'interiorHoldMarkers', 'holdSupportInputRows',
  'forwardGateLocalized', 'forwardGateUnavailable', 'forwardGateNotForwardStack', 'forwardGateNotReproduced',
  'forwardGateOtherStop', 'forwardGateProbeCount', 'forwardGateInterior',
  'forwardGatePriorityOld', 'forwardGatePriorityNew', 'forwardGatePriorityUnresolved',
  'forwardGatePersistedExactMatch', 'forwardGatePersistedMatchedUnknown', 'forwardGatePersistedNoExactMatch',
  'forwardGatePersistedUnavailable', 'forwardGateDecoderAssociationInconsistent', 'forwardGateNoDecoderAssociation',
  'forwardGateDecoderAssociationUnavailable',
  ...['Old', 'New'].flatMap(side => ['Absent', 'Ambiguous', 'OtherProvider', 'NoContext', 'OriginalComplete',
    'OriginalRejected', 'OriginalMissingEndpoint', 'OriginalProjectionMismatch', 'OriginalOtherRejected',
    'Coherent', 'Unknown', 'OtherSampling'].map(status => 'forwardGate' + side + status))]);

// This exact bound-module callsite is the forward loop, not OLD-history or the
// later HOLD-support pass. No exception receives a private row/identity field.
const forwardUnknown = error => error?.code === 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED'
  && error.samplingStatus === 'unknown'
  && /at currentComponent \([^\n]*ravscore-recovery-replay\.mjs:280:\d+\)/.test(error.stack ?? '')
  && /at buildRavScoreRecoveryReplay \([^\n]*ravscore-recovery-replay\.mjs:1084:\d+\)/.test(error.stack ?? '');
const currentSource = row => row?.currentProvenance?.status === 'verified'
  ? row.currentProvenance : row?.sources?.current;
// Exact selected current-input fields, not a whole weather-row equality claim.
const currentFields = row => [row?.time, row?.currentUMps, row?.currentVMps,
  row?.currentSpeedMps, row?.currentDirectionDeg];
const originalView = row => row?.sources?.current && typeof row.sources.current === 'object'
  ? [...currentFields(row), row.sources.current] : null;
const currentView = row => [...currentFields(row), currentSource(row)];

function locateForwardGate(error, sourceRecords, replayCandidate, counters, initialState, publicHourly) {
  const unavailable = key => { counters.forwardGateUnavailable = 1; counters[key] = 1; return null; };
  if (!forwardUnknown(error)) return unavailable('forwardGateNotForwardStack');
  if (typeof replayCandidate !== 'function' || !Array.isArray(publicHourly)) return unavailable('forwardGateNotReproduced');
  const rows = sourceRecords.flatMap((source, sourceIndex) => Array.isArray(source?.record?.hourly)
    ? source.record.hourly.map(row => ({ row, sourceIndex })) : []);
  if (!rows.length || rows.length > 10_000) return unavailable('forwardGateNotReproduced');
  // Do not serialize the national native donor documents per PART/probe.
  // Replay reads only these records; keep their actual row objects untouched.
  const snapshot = () => [sourceRecords.map(source => source?.record), initialState, publicHourly];
  const before = structuredClone(snapshot());
  const probe = limit => {
    if (++counters.forwardGateProbeCount > 18) return 'OTHER';
    let remaining = limit;
    const prefix = limit === rows.length ? sourceRecords : sourceRecords.map(source => {
      if (!Array.isArray(source?.record?.hourly)) return source;
      const take = Math.min(remaining, source.record.hourly.length); remaining -= take;
      // Keep exact original row/provenance objects and their opaque associations.
      return { ...source, record: { ...source.record, hourly: source.record.hourly.slice(0, take) } };
    });
    let outcome = 'SUCCESS';
    try { replayCandidate(prefix, publicHourly); } catch (failure) { outcome = forwardUnknown(failure) ? 'UNKNOWN' : 'OTHER'; }
    // Never emit stateMutationPerformed:false after detecting any mutation.
    if (!isDeepStrictEqual(snapshot(), before)) fail();
    return outcome;
  };
  const whole = probe(rows.length);
  if (whole === 'OTHER') return unavailable('forwardGateOtherStop');
  if (whole !== 'UNKNOWN') return unavailable('forwardGateNotReproduced');
  const empty = probe(0);
  if (empty === 'OTHER') return unavailable('forwardGateOtherStop');
  if (empty !== 'SUCCESS') return unavailable('forwardGateNotReproduced');
  // A prefix that hits ANY other guard (including incomplete HOLD support)
  // proves nothing about the full replay: stop, never treat it as success.
  let lower = 0, upper = rows.length;
  while (upper - lower > 1) {
    const middle = Math.floor((lower + upper) / 2), outcome = probe(middle);
    if (outcome === 'OTHER') return unavailable('forwardGateOtherStop');
    if (outcome === 'UNKNOWN') upper = middle; else lower = middle;
  }
  return rows[upper - 1];
}

function describeForwardGate(gate, { part, initialSelection, targetReferenceAt, recoverySources,
  fallbackSource, preferredSource, persistedHourly }, counters) {
  const row = gate.row, at = Date.parse(row?.time), expected = dmiExpectedIdentityForPart(part);
  if (!(at > Date.parse(initialSelection.state.time) && at < Date.parse(targetReferenceAt))
    || ![row.currentSpeedMps, row.currentDirectionDeg, row.currentUMps, row.currentVMps].every(finite)
    || inspectDmiForecastGridSampling(currentSource(row), 'current', row.time, expected).status !== 'unknown') {
    counters.forwardGateUnavailable = 1; counters.forwardGateNotReproduced = 1; return;
  }
  counters.forwardGateLocalized = 1; counters.forwardGateInterior = 1;
  const donors = [];
  for (const [side, source] of [['Old', fallbackSource], ['New', preferredSource]]) {
    const add = status => counters['forwardGate' + side + status]++;
    const matching = source?.record?.hourly?.filter(value => Date.parse(value?.time) === at) ?? [];
    if (!matching.length) { add('Absent'); donors.push(null); continue; }
    if (matching.length !== 1) { add('Ambiguous'); donors.push(null); continue; }
    const original = matching[0], provenance = currentSource(original);
    if (provenance?.provider !== 'dmi') { add('OtherProvider'); donors.push(null); continue; }
    const sampling = inspectDmiForecastGridSampling(provenance, 'current', original.time, expected).status;
    add(sampling === 'coherent' ? 'Coherent' : sampling === 'unknown' ? 'Unknown' : 'OtherSampling');
    let proof = null;
    if (!Array.isArray(source.nativeCurrentContexts) || !source.nativeCurrentContexts.length) add('NoContext');
    else {
      proof = createProtectedDmiNativeCurrentInspector({ contexts: source.nativeCurrentContexts }).inspect({ part, row: original });
      if (proof.ok) add('OriginalComplete');
      else {
        add('OriginalRejected');
        add(proof.code === 'DMI_NATIVE_PROOF_NATIVE_REFERENCE_MISSING' ? 'OriginalMissingEndpoint'
          : proof.code === 'DMI_NATIVE_PROOF_PROJECTION_MISMATCH' ? 'OriginalProjectionMismatch' : 'OriginalOtherRejected');
      }
    }
    donors.push({ row: original, sampling, proof });
  }
  const [old, fresh] = donors;
  const oldMatches = old && isDeepStrictEqual(currentView(row), currentView(old.row));
  const freshMatches = fresh && isDeepStrictEqual(currentView(row), currentView(fresh.row));
  counters[oldMatches && !freshMatches ? 'forwardGatePriorityOld'
    : freshMatches && !oldMatches ? 'forwardGatePriorityNew' : 'forwardGatePriorityUnresolved']++;
  if (!Array.isArray(persistedHourly) || originalView(row) === null) counters.forwardGatePersistedUnavailable++;
  else if (persistedHourly.some(value => isDeepStrictEqual(originalView(value), originalView(row)))) {
    counters.forwardGatePersistedExactMatch++;
    const original = row.sources.current;
    if (!Object.hasOwn(original, 'nativeGridSampling') && Array.isArray(original.nativeSteps)
      && original.nativeSteps.length > 0 && original.nativeSteps.every(step => !Object.hasOwn(step, 'nativeGridSampling')))
      counters.forwardGatePersistedMatchedUnknown++;
  } else counters.forwardGatePersistedNoExactMatch++;
  // Reuse the actual selector's invocation-local decoder association; do not
  // duplicate its capture/provenance comparator or make a new admission rule.
  if (!fresh || fresh.sampling !== 'coherent' || !fresh.proof?.ok) counters.forwardGateNoDecoderAssociation++;
  else try {
    const target = new Date(at + 3_600_000).toISOString();
    const projected = buildRavScoreRecoveryReplay({ part, initialState: null, targetReferenceAt: target,
      sourceRecords: [{ record: { point: part.waterPoint, hourly: [fresh.row] } }], publicHourly: [{ time: target }] });
    const original = originalCurrentDecoderHistory(recoverySources, projected.hourly.filter(value => Date.parse(value.time) === at), part);
    if (original) {
      // A genuinely qualified coherent successor is selected NEW, so it cannot
      // simultaneously explain a reproduced UNKNOWN gate on the OLD input.
      counters.forwardGateDecoderAssociationInconsistent++;
      counters.forwardGateLocalized = 0; counters.forwardGateUnavailable = 1;
    } else counters.forwardGateNoDecoderAssociation++;
  } catch { counters.forwardGateDecoderAssociationUnavailable++; }
}

export function summarizeSavedCurrentReplayGridFailure({ error, initialSelection, targetReferenceAt,
  recoverySources, part, establishedNativeCurrentOrigin, replayCandidate = null,
  fallbackSource = null, preferredSource = null, persistedHourly = null, publicHourly = null }) {
  if (error?.code !== 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED' || error.samplingStatus !== 'unknown'
    || !['EXISTING_INTEGRATED', 'INTEGRATED_CHECKPOINT'].includes(initialSelection?.source)
    || establishedNativeCurrentOrigin === null || establishedNativeCurrentOrigin === undefined
    || targetReferenceAt !== '2026-10-17T20:00:00.000Z'
    || !Array.isArray(recoverySources) || recoverySources.length > 8) fail();
  const stateMs = Date.parse(initialSelection.state?.time), targetMs = Date.parse(targetReferenceAt);
  if (!Number.isFinite(stateMs) || stateMs >= targetMs || stateMs % 3_600_000 !== 0) fail();
  const expected = dmiExpectedIdentityForPart(part);
  const counters = Object.fromEntries(COUNTERS.map(key => [key, 0]));
  const supportTimes = new Set();
  counters.sourceRecordCount = recoverySources.length;
  for (const source of recoverySources) {
    if (!Array.isArray(source?.record?.hourly)) continue;
    for (const row of source.record.hourly) {
      if (++counters.inputRowCount > 10_000) fail();
      const time = Date.parse(row?.time); if (!Number.isFinite(time)) fail();
      if (time <= stateMs) { counters.beforeOrAtH0Rows++; continue; }
      if (time >= targetMs) { counters.atOrAfterTargetRows++; continue; }
      counters.interiorRows++;
      if (row.currentStateOnlyHold != null) {
        counters.interiorHoldMarkers++;
        const support = Date.parse(row.currentStateOnlyHold.sourceValidTime);
        if (Number.isFinite(support)) supportTimes.add(support);
      }
      if (![row.currentSpeedMps, row.currentDirectionDeg, row.currentUMps, row.currentVMps].every(finite)) continue;
      counters.interiorCurrentCandidates++;
      const provenance = row.currentProvenance?.status === 'verified' ? row.currentProvenance : row.sources?.current;
      if (provenance?.provider !== 'dmi') continue;
      counters.interiorDmiCandidates++;
      const status = inspectDmiForecastGridSampling(provenance, 'current', row.time, expected).status;
      counters[status === 'unknown' ? 'interiorUnknownCandidates'
        : status === 'coherent' ? 'interiorCoherentCandidates' : 'interiorOtherSamplingCandidates']++;
    }
  }
  for (const source of recoverySources) for (const row of source?.record?.hourly ?? [])
    if (supportTimes.has(Date.parse(row?.time))) counters.holdSupportInputRows++;
  const gate = locateForwardGate(error, recoverySources, replayCandidate, counters, initialSelection.state, publicHourly);
  if (gate) describeForwardGate(gate, { part, initialSelection, targetReferenceAt, recoverySources,
    fallbackSource, preferredSource, persistedHourly }, counters);
  if (!Object.values(counters).every(count)) fail();
  const stack = typeof error.stack === 'string' ? error.stack : '';
  const replayStackObserved = /(?:^|\n)\s+at currentComponent\s*\(/.test(stack)
    && /(?:^|\n)\s+at buildRavScoreRecoveryReplay\s*\(/.test(stack);
  return { schemaVersion: 1, kind: 'SAVED_CURRENT_REPLAY_GRID_FIRST_STOP',
    status: replayStackObserved ? 'NORMAL_REPLAY_FIRST_STOP_OBSERVED' : 'NORMAL_PIPELINE_STOP_LOCATION_UNCONFIRMED',
    scope: 'ACTUAL_NORMAL_PRIORITY_OUTPUT_FIRST_FAILING_PART',
    guardCode: 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED', samplingStatus: 'unknown',
    initialSelectionSource: initialSelection.source, replayStackObserved, counters,
    originQualification: 'NOT_REPROVED_BY_DIAGNOSTIC', holdMarkersAreNotNativeProof: true,
    actualOffendingRowIdentified: false, fullSelectedCoverageProved: false,
    nativeAdmissionPerformed: false, stateMutationPerformed: false, continuationIssued: false,
    privatePayloadIncluded: false, valuesIncluded: false, sourceIdentifiersIncluded: false,
    coordinatesIncluded: false, timesIncluded: false, productionAuthority: false };
}

export function fixedSavedCurrentReplayGridReport(value) {
  const requiredFalse = ['actualOffendingRowIdentified', 'fullSelectedCoverageProved', 'nativeAdmissionPerformed',
    'stateMutationPerformed', 'continuationIssued', 'privatePayloadIncluded', 'valuesIncluded',
    'sourceIdentifiersIncluded', 'coordinatesIncluded', 'timesIncluded', 'productionAuthority'];
  if (value?.schemaVersion !== 1 || value.kind !== 'SAVED_CURRENT_REPLAY_GRID_FIRST_STOP'
    || !['NORMAL_REPLAY_FIRST_STOP_OBSERVED', 'NORMAL_PIPELINE_STOP_LOCATION_UNCONFIRMED'].includes(value.status)
    || value.scope !== 'ACTUAL_NORMAL_PRIORITY_OUTPUT_FIRST_FAILING_PART'
    || value.guardCode !== 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED' || value.samplingStatus !== 'unknown'
    || !['EXISTING_INTEGRATED', 'INTEGRATED_CHECKPOINT'].includes(value.initialSelectionSource)
    || typeof value.replayStackObserved !== 'boolean'
    || value.status !== (value.replayStackObserved ? 'NORMAL_REPLAY_FIRST_STOP_OBSERVED' : 'NORMAL_PIPELINE_STOP_LOCATION_UNCONFIRMED')
    || value.originQualification !== 'NOT_REPROVED_BY_DIAGNOSTIC' || value.holdMarkersAreNotNativeProof !== true
    || !value.counters || Object.keys(value.counters).sort().join(',') !== [...COUNTERS].sort().join(',')
    || !COUNTERS.every(key => count(value.counters[key])) || !requiredFalse.every(key => value[key] === false)) return null;
  return { schemaVersion: 1, kind: value.kind, status: value.status, scope: value.scope,
    guardCode: value.guardCode, samplingStatus: value.samplingStatus, initialSelectionSource: value.initialSelectionSource,
    replayStackObserved: value.replayStackObserved, counters: Object.fromEntries(COUNTERS.map(key => [key, value.counters[key]])),
    originQualification: value.originQualification, holdMarkersAreNotNativeProof: true,
    ...Object.fromEntries(requiredFalse.map(key => [key, false])) };
}
