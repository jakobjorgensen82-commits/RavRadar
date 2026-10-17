// Read-only diagnostic projection. Never returns a continuation or admission.
import { buildRavScorePermittedCurrentHistory } from './ravscore-recovery-replay.mjs';
import { buildIntegratedPartScoreSeries } from './ravscore-integrated-runtime.mjs';
import { buildCandidateGRollbackPartScoreSeries, assertCandidateGRollbackContinuation } from './ravscore-candidate-g-rollback-runtime.mjs';
import { assertIntegratedCoastalPointContinuation } from './coastal-point-staging-contract.mjs';
import { ravScoreSamplingContextKey } from './ravscore-sampling-context.mjs';

const SUFFIXES = Object.freeze(['ReferenceAt', 'MemoryReady', 'MemoryStatus', 'MemoryWindowHours', 'MemoryCoverageHours']);
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const fail = () => { throw new Error('RAVSCORE_CURRENT_WINDOW_DIAGNOSTIC_UNAVAILABLE'); };
function candidateFamilies(sourceRecords, hourly) {
  const times = new Set(hourly.map(row => Date.parse(row.time)));
  const result = { scope: 'INPUT_CANDIDATES_NOT_SELECTED_SOURCE_COUNTS', rowCount: 0,
    dmi: { dkss_idw: 0, dkss_nsbs: 0, dkss_lf: 0 }, copernicusCount: 0, openMeteoCount: 0,
    otherOrUnclassifiedCount: 0, dmiNewCoordinateMetadataCount: 0, dmiWithoutNewCoordinateMetadataCount: 0 };
  for (const source of sourceRecords) for (const row of source?.record?.hourly ?? []) {
    if (!times.has(Date.parse(row?.time))) continue;
    const evidence = row.currentProvenance?.status === 'verified' ? row.currentProvenance : row.sources?.current;
    if (!evidence || !Number.isFinite(row.currentSpeedMps)) continue;
    if (++result.rowCount > 8192) fail();
    if (evidence.provider === 'dmi' && Object.hasOwn(result.dmi, evidence.collection)) {
      result.dmi[evidence.collection]++;
      const modern = evidence.nativeGridSampling?.coordinateInterpretation === 'dmi-dkss-grib1-header-endpoints-v1';
      result[modern ? 'dmiNewCoordinateMetadataCount' : 'dmiWithoutNewCoordinateMetadataCount']++;
    } else if (evidence.provider === 'copernicus') result.copernicusCount++;
    else if (evidence.provider === 'open-meteo') result.openMeteoCount++;
    else result.otherOrUnclassifiedCount++;
  }
  return result;
}
function compareWindow(saved, derived, prefix, evidenceKey) {
  const original = saved[evidenceKey], rebuilt = derived[evidenceKey];
  // The normal 48h history retains up to 3h of causal native support.
  if (!Array.isArray(original) || !Array.isArray(rebuilt) || original.length > 52 || rebuilt.length > 52) fail();
  const indexed = rows => {
    const result = new Map();
    for (const row of rows) {
      if (!row || typeof row.time !== 'string' || !Number.isFinite(Date.parse(row.time))
          || result.has(row.time) || !(row.strength === null || typeof row.strength === 'number' && Number.isFinite(row.strength))) fail();
      result.set(row.time, row.strength === null);
    }
    return result;
  };
  const old = indexed(original), next = indexed(rebuilt);
  let commonTimeCount = 0, unknownToKnownCount = 0, knownToUnknownCount = 0;
  for (const [time, unknown] of old) if (next.has(time)) {
    commonTimeCount++;
    if (unknown && next.get(time) === false) unknownToKnownCount++;
    if (!unknown && next.get(time) === true) knownToUnknownCount++;
  }
  const metadata = Object.fromEntries(SUFFIXES.map(suffix => {
    const left = saved[prefix + suffix], right = derived[prefix + suffix];
    const comparison = equal(left, right) ? 'SAME'
      : suffix === 'MemoryReady' && typeof left === 'boolean' && typeof right === 'boolean'
        ? left ? 'TRUE_TO_FALSE' : 'FALSE_TO_TRUE'
        : (suffix === 'MemoryWindowHours' || suffix === 'MemoryCoverageHours')
          && Number.isFinite(left) && Number.isFinite(right) ? right > left ? 'INCREASED' : 'DECREASED'
          : 'CHANGED';
    return [suffix, comparison];
  }));
  let orderedTimeMismatchCount = 0;
  for (let index = 0; index < Math.max(original.length, rebuilt.length); index++)
    if (original[index]?.time !== rebuilt[index]?.time) orderedTimeMismatchCount++;
  const evidence = {
    savedRowCount: original.length, reconstructedRowCount: rebuilt.length, commonTimeCount,
    savedOnlyTimeCount: original.length - commonTimeCount,
    reconstructedOnlyTimeCount: rebuilt.length - commonTimeCount,
    orderedTimeMismatchCount, unknownToKnownCount, knownToUnknownCount,
    nullMaskMismatchAtSameTimeCount: unknownToKnownCount + knownToUnknownCount,
  };
  const metadataMatches = Object.values(metadata).every(value => value === 'SAME');
  const timeNullMaskMatches = equal(original.map(row => [row.time, row.strength === null]),
    rebuilt.map(row => [row.time, row.strength === null]));
  const sameWindow = metadataMatches && timeNullMaskMatches;
  const category = sameWindow ? 'SAME_WINDOW'
    : evidence.savedOnlyTimeCount || evidence.reconstructedOnlyTimeCount || orderedTimeMismatchCount
      ? 'TIME_WINDOW_SHAPE_CHANGED'
      : knownToUnknownCount ? 'SAVED_KNOWN_BECOMES_UNKNOWN'
      : unknownToKnownCount ? 'NEW_VALID_EVIDENCE_FILLS_SAVED_UNKNOWN'
      : 'METADATA_ONLY_DIFFERENCE';
  return { metadata, evidence, metadataMatches, timeNullMaskMatches, sameWindow, category };
}
function reconstructWindow({
  part, zone, initialSelection, previousCandidateGContinuation,
  recoverySources, liveCurrentPilot = null, nativeCadenceHoldHours = 0,
} = {}, setPhase) {
  setPhase('SAVED_PAIR_VALIDATION');
  const state = initialSelection?.state, other = previousCandidateGContinuation;
  if (!state || !other || state.time !== other.time || !Array.isArray(recoverySources)) fail();
  assertIntegratedCoastalPointContinuation(state, { samplingContextKey: ravScoreSamplingContextKey(part) });
  assertCandidateGRollbackContinuation(other, part);
  const incomplete = state.currentMemoryReady !== true || other.transportMemoryReady !== true;
  if (!incomplete || ![true, false].includes(state.currentMemoryReady)
      || ![true, false].includes(other.transportMemoryReady)) fail();
  // This is exactly the existing guard's bounded reconstruction, not a new
  // selector, relaxed validator or claim that the saved pair may be replaced.
  setPhase('STRICT_CURRENT_HISTORY');
  const history = buildRavScorePermittedCurrentHistory({ part, referenceAt: state.time,
    sourceRecords: recoverySources, requireNativeGridSampling: true, liveCurrentPilot,
    preserveNativeCadenceHolds: true });
  const start = Math.min(Date.parse(state.currentEvidence[0]?.time), Date.parse(other.transportEvidence[0]?.time));
  const first = history.findIndex(row => Date.parse(row.time) === start);
  if (first < 0 || !Number.isFinite(start)) fail();
  const hourly = history.slice(first);
  setPhase('INTEGRATED_RECONSTRUCTION');
  const derived = buildIntegratedPartScoreSeries({ part, zone, hourly, nativeCadenceHoldHours }).ravScoreState.continuationState;
  setPhase('CANDIDATE_G_RECONSTRUCTION');
  const derivedOther = buildCandidateGRollbackPartScoreSeries({ part, zone, hourly,
    nativeCadenceHoldHours, measuredColdStart: true }).candidateGState.continuationState;
  setPhase('FIXED_REPORT_PROJECTION');
  const integrated = compareWindow(state, derived, 'current', 'currentEvidence');
  const candidateG = compareWindow(other, derivedOther, 'transport', 'transportEvidence');
  return {
    schemaVersion: 1, kind: 'RAVSCORE_INITIAL_CURRENT_WINDOW_DIAGNOSTIC', status: 'COMPARED',
    scope: 'EXISTING_INCOMPLETE_PAIR_SAME_WINDOW_GUARD',
    initialSelectionSource: ['POINT_ACTIVATION', 'EXISTING_INTEGRATED', 'INTEGRATED_CHECKPOINT',
      'COLD_START', 'CANDIDATE_G_MIGRATION'].includes(initialSelection.source) ? initialSelection.source : 'UNCLASSIFIED',
    savedPairValidatedByCurrentContracts: true,
    savedPairNativeGridOrigin: 'NOT_ESTABLISHED_BY_COMPACT_STATE',
    selectedHistory: {
      rowCount: hourly.length,
      verifiedVectorCount: hourly.filter(row => row.currentProvenance?.status === 'verified').length,
      stateOnlyHoldCount: hourly.filter(row => row.currentStateOnlyHold != null).length,
      missingCount: hourly.filter(row => row.currentProvenance?.status !== 'verified' && row.currentStateOnlyHold == null).length,
      sourceFamilyNotPreservedByCompactProjection: true,
    },
    inputCandidateFamilies: candidateFamilies(recoverySources, hourly),
    integrated, candidateG,
    sameWindowGuardMatches: integrated.sameWindow && candidateG.sameWindow,
    privatePayloadIncluded: false, valuesIncluded: false, sourceIdentifiersIncluded: false,
    coordinatesIncluded: false, timesIncluded: false, stateMutationPerformed: false,
    continuationIssued: false, productionAuthority: false,
  };
}

// A failed strict source/hold reconstruction is explicit absence of a report,
// never a retry with weaker options, direct evidence arrays or another window.
export function summarizeRavScoreInitialCurrentWindow(options = {}) {
  let phase = 'INPUT_VALIDATION';
  try { return reconstructWindow(options, value => { phase = value; }); }
  catch (error) {
    const known = new Set(['DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED',
      'RAVSCORE_RECOVERY_REPLAY_SAMPLING_MISMATCH', 'RAVSCORE_RECOVERY_REPLAY_STATE_ONLY_HOLD_INVALID',
      'RAVSCORE_RECOVERY_REPLAY_STATE_ONLY_HOLD_CONTEXT_MISMATCH', 'RAVSCORE_RECOVERY_REPLAY_NATIVE_REFERENCE_INVALID',
      'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED', 'RAVSCORE_RECOVERY_REPLAY_CONFLICT',
      'RAVSCORE_CURRENT_WINDOW_DIAGNOSTIC_UNAVAILABLE']);
    const code = known.has(error?.code) ? error.code : known.has(error?.message) ? error.message : 'UNCLASSIFIED';
    return { schemaVersion: 1, kind: 'RAVSCORE_INITIAL_CURRENT_WINDOW_DIAGNOSTIC',
      status: 'UNAVAILABLE', phase, code, fallbackPerformed: false,
      privatePayloadIncluded: false, valuesIncluded: false, sourceIdentifiersIncluded: false,
      coordinatesIncluded: false, timesIncluded: false, stateMutationPerformed: false,
      continuationIssued: false, productionAuthority: false };
  }
}
