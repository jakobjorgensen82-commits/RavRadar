// Fixed, value-free observation of the ACTUAL normal updater's failed call.
// It never selects a source, supplies native proof, emits capture IDs or
// changes/retries the pipeline. Counts are PRIORITY OUTPUTS, not replay-union
// coverage and not identification of the actual offending row.
import { dmiExpectedIdentityForPart } from './ravscore-production-adapters.mjs';
import { inspectDmiForecastGridSampling } from './dmi-forecast-store.mjs';
const fail = () => { throw new Error('SAVED_CURRENT_REPLAY_DIAGNOSTIC_UNAVAILABLE'); };
const finite = value => typeof value === 'number' && Number.isFinite(value);
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 10_000;
const COUNTERS = Object.freeze(['sourceRecordCount', 'inputRowCount', 'beforeOrAtH0Rows', 'interiorRows',
  'atOrAfterTargetRows', 'interiorCurrentCandidates', 'interiorDmiCandidates', 'interiorUnknownCandidates',
  'interiorCoherentCandidates', 'interiorOtherSamplingCandidates', 'interiorHoldMarkers', 'holdSupportInputRows']);

export function summarizeSavedCurrentReplayGridFailure({ error, initialSelection, targetReferenceAt,
  recoverySources, part, establishedNativeCurrentOrigin }) {
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
