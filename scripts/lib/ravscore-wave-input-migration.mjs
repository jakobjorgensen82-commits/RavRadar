import crypto from 'node:crypto';
import { RAVSCORE_PUBLIC_FORECAST_HOURS } from '../../js/core/ravscore-model-contract.js';
import { classifyWavePhysicalTuple } from '../../js/core/ravscore-mobilisation-memory.js';
import { buildRavScoreProductionPartSeries } from './ravscore-production-part-pipeline.mjs';
import { buildRavScoreRecoveryReplay, RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION,
  RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS } from './ravscore-recovery-replay.mjs';
import { assertIntegratedCoastalPointContinuation } from './coastal-point-staging-contract.mjs';
import { assertCandidateGRollbackContinuation } from './ravscore-candidate-g-rollback-runtime.mjs';
import { ravScoreSamplingContextKey } from './ravscore-sampling-context.mjs';
import { dmiExpectedIdentityForPart, verifiedDmiForecastComponentSource,
  verifiedIntegratedPartHourly } from './ravscore-production-adapters.mjs';

const HOUR = 3_600_000;
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const encoded = value => JSON.stringify(canonical(value));
const digest = value => crypto.createHash('sha256').update(encoded(value)).digest('hex');
const same = (left, right) => encoded(left) === encoded(right);
const hour = value => {
  const ms = Date.parse(value);
  if (typeof value !== 'string' || !Number.isFinite(ms)
      || value !== new Date(ms).toISOString() || ms % HOUR !== 0) {
    throw new Error('Wave input migration requires canonical exact UTC hours');
  }
  return ms;
};
const waveKeys = ['waveHeightM', 'wavePeriodS', 'waveDirectionDeg', 'waveProvenance',
  'waveInputSource', 'waveInputUncertainty', 'waveInputNoticeId'];
const waterLevelKeys = ['waterLevelCm', 'waterLevelTrendCm3h', 'waterLevelProvenance'];
function withoutWave(row, waterLevelSanitized = false) {
  const result = structuredClone(row);
  waveKeys.forEach(key => delete result[key]);
  if (waterLevelSanitized) waterLevelKeys.forEach(key => delete result[key]);
  if (result.sources) {
    delete result.sources.wave;
    if (waterLevelSanitized) delete result.sources.waterLevel;
    if (!Object.keys(result.sources).length) delete result.sources;
  }
  return result;
}

function waterLevelSanitizationOracle(record, part) {
  // Reuse the real production sanitizer and its whole-record T+3 DMI-series
  // decision. Supply only the water component to this read-only oracle; its
  // unrelated synthetic missing outputs are never used as migrated inputs.
  // The actual before/after rows remain intact and all other fields are still
  // compared below, including wind, current, temperature and their provenance.
  let rows = null;
  return () => {
    if (rows === null) {
      const waterRecord = { point: record.point, hourly: record.hourly.map(row => ({
        time: row.time, waterLevelCm: row.waterLevelCm,
        waterLevelTrendCm3h: row.waterLevelTrendCm3h,
        sources: { waterLevel: row.sources?.waterLevel },
      })) };
      rows = new Map(verifiedIntegratedPartHourly(waterRecord, null,
        `PART::${part.partId}`, part).map(row => [row.time, row]));
    }
    return rows;
  };
}

function isStateNeutralWaterLevelSanitization(previous, next, oracle) {
  const water = row => Object.fromEntries(waterLevelKeys.map(key => [key, row[key] ?? null]));
  const previousSource = previous.sources?.waterLevel;
  const nextSource = next.sources?.waterLevel;
  if (same(water(previous), water(next)) && same(previousSource, nextSource)) return false;
  // Only removal of unavailable/unqualified input is allowed, never a new
  // finite level/trend or fabricated/upgraded source authority.
  for (const key of ['waterLevelCm', 'waterLevelTrendCm3h']) {
    if (!same(previous[key] ?? null, next[key] ?? null)
        && (next[key] !== null || (previous[key] !== null && previous[key] !== undefined
          && !Number.isFinite(previous[key])))) return false;
  }
  if (nextSource !== null && nextSource !== undefined && !same(previousSource, nextSource)) return false;
  const expected = oracle().get(previous.time);
  if (!expected || !same(water(next), water(expected))) return false;
  // A retained valid DMI level still needs its exact source. This also avoids
  // turning removal of a good source into a way to manufacture a missing value.
  if (Number.isFinite(expected.waterLevelCm)
      && (!same(previousSource, nextSource)
        || !same(previous.waterLevelProvenance, next.waterLevelProvenance))) return false;
  return true;
}
function waveTuple(row) {
  return [row.waveHeightM ?? null, row.wavePeriodS ?? null, row.waveDirectionDeg ?? null];
}
function provedPeak(row, part) {
  const physical = classifyWavePhysicalTuple(row);
  const source = verifiedDmiForecastComponentSource(row.sources?.wave, row.time,
    'wave', dmiExpectedIdentityForPart(part));
  const direction = Number.isFinite(row.waveDirectionDeg) && row.waveDirectionDeg >= 0
    && row.waveDirectionDeg < 360;
  const directionAttested = same(source?.optionalFieldSet, ['mean-wave-dir']);
  return Boolean(physical.available && source && (direction ? directionAttested
    : !physical.active && same(source.optionalFieldSet, [])
      && (row.waveDirectionDeg === null || row.waveDirectionDeg === undefined)));
}
function rowsByTime(record, part) {
  if (!record || !same(record.point, part.waterPoint) || !Array.isArray(record.hourly)) {
    throw new Error('Wave input migration requires the exact PART sampling record');
  }
  const rows = new Map();
  for (const row of record.hourly) {
    hour(row?.time);
    if (rows.has(row.time)) throw new Error('Wave input migration rejects ambiguous duplicate hours');
    rows.set(row.time, row);
  }
  return rows;
}

// Inputs must come from the exact old protected runtime and the qualified new
// decoder/selector. This helper does not manufacture PP1D evidence from legacy
// labels, mutate caches, rebind a model, or approve a publication.
export function classifyPeakPeriodInputChanges({ part, previousRecord, correctedRecord,
  targetReferenceAt } = {}) {
  const target = hour(targetReferenceAt);
  const before = rowsByTime(previousRecord, part), after = rowsByTime(correctedRecord, part);
  if (!same([...before.keys()].sort(), [...after.keys()].sort())) {
    throw new Error('Peak correction cannot add or remove weather rows');
  }
  const affectedTimes = [], historicalTimes = [], unprovenRemovedTimes = [];
  const stateNeutralWaterLevelSanitizedTimes = [];
  const waterOracle = waterLevelSanitizationOracle(previousRecord, part);
  let attestationOnlyCount = 0;
  for (const [time, next] of after) {
    const previous = before.get(time);
    const waterSanitized = isStateNeutralWaterLevelSanitization(previous, next, waterOracle);
    if (!same(withoutWave(previous, waterSanitized), withoutWave(next, waterSanitized))) {
      throw new Error('Peak correction changed a non-wave input');
    }
    if (waterSanitized) stateNeutralWaterLevelSanitizedTimes.push(time);
    if (same(Object.fromEntries(waveKeys.map(key => [key, previous[key] ?? null])),
      Object.fromEntries(waveKeys.map(key => [key, next[key] ?? null])))
      && same(previous.sources?.wave, next.sources?.wave)) continue;
    const nextProved = provedPeak(next, part);
    const nextEmpty = waveTuple(next).every(value => value === null);
    if (!nextProved && !nextEmpty) throw new Error('Corrected wave input lacks qualified peak-period evidence');
    if (nextEmpty && provedPeak(previous, part)) {
      throw new Error('Peak correction must retain an existing qualified wave tuple');
    }
    if (nextProved && (previous.waveHeightM !== next.waveHeightM
        || previous.waveDirectionDeg !== next.waveDirectionDeg)) {
      throw new Error('Peak correction cannot change wave height or direction');
    }
    if (!same(waveTuple(previous), waveTuple(next))) {
      affectedTimes.push(time);
      if (hour(time) <= target) historicalTimes.push(time);
      if (nextEmpty) unprovenRemovedTimes.push(time);
    } else if (!same(previous.sources?.wave, next.sources?.wave)) attestationOnlyCount += 1;
  }
  affectedTimes.sort(); historicalTimes.sort(); unprovenRemovedTimes.sort(); stateNeutralWaterLevelSanitizedTimes.sort();
  return { partId: part.partId, samplingContextKey: ravScoreSamplingContextKey(part),
    affectedTimes, historicalTimes, unprovenRemovedTimes, attestationOnlyCount, stateNeutralWaterLevelSanitizedTimes,
    firstChangedAt: affectedTimes[0] ?? null,
    previousRecordSha256: digest(previousRecord), correctedRecordSha256: digest(correctedRecord),
    privatePayloadIncluded: false };
}

function compatiblePreChangePair(baseline, part, firstChangedAt, targetReferenceAt) {
  if (!baseline?.integratedState || !baseline?.candidateGState) return null;
  try {
    const integrated = baseline.integratedState, candidate = baseline.candidateGState;
    const baselineMs = hour(integrated.time), targetMs = hour(targetReferenceAt);
    if (integrated.time !== candidate.time || baselineMs >= hour(firstChangedAt)
        || baselineMs > targetMs || (targetMs - baselineMs) / HOUR > RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS) return null;
    assertIntegratedCoastalPointContinuation(integrated, { samplingContextKey: ravScoreSamplingContextKey(part) });
    assertCandidateGRollbackContinuation(candidate, part);
    return { integratedState: structuredClone(integrated), candidateGState: structuredClone(candidate) };
  } catch { return null; }
}

function pipelinePair(options, part, targetReferenceAt) {
  const integratedState = options?.initialSelection?.state;
  const candidateGState = options?.previousCandidateGContinuation;
  if (!integratedState && !candidateGState
      && options?.initialSelection?.source === 'COLD_START'
      && options.candidateGRollbackMeasuredColdStart === true
      && options.initialSelection.candidateGSourceDisposition === RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION) return null;
  if (!integratedState || !candidateGState || options.legacyCandidateGMigrationState
      || options.candidateGRollbackMeasuredColdStart === true
      || integratedState.time !== candidateGState.time
      || hour(integratedState.time) > hour(targetReferenceAt)) {
    throw new Error('Input transition requires one exact integrated/Candidate G continuation pair');
  }
  // A different old bundle is not implicitly rebased here. The old-reader
  // transition must prove algorithm/input equivalence before supplying a
  // current-contract pair; otherwise the old state remains unaccepted.
  assertIntegratedCoastalPointContinuation(integratedState, { samplingContextKey: ravScoreSamplingContextKey(part) });
  assertCandidateGRollbackContinuation(candidateGState, part);
  return { integratedState, candidateGState };
}

/**
 * Producer integration boundary for an already verified selected-input pair.
 *
 * previousRecord MUST be the old reader's actual selected input, bound to the
 * protected predecessor, not old raw cache re-read through today's selector.
 * Its complete migration scope must have been established before this call.
 * This function neither proves those external origins nor opens a publisher.
 * It does provide the whole atomic option set consumed by the real production
 * part pipeline, so the caller cannot accidentally replay integrated only.
 */
export function preparePeakPeriodProductionTransition({ part, previousRecord,
  correctedRecord, targetReferenceAt, previousProductionReferenceAt,
  currentPipelineOptions, preChangePairs = [] } = {}) {
  const target = hour(targetReferenceAt);
  const predecessor = hour(previousProductionReferenceAt);
  if (target < predecessor) throw new Error('Input migration target predates its protected predecessor');
  if (!Array.isArray(preChangePairs)) throw new Error('Input migration pre-change pairs must be an array');
  const currentPair = pipelinePair(currentPipelineOptions, part, targetReferenceAt);
  if (currentPair && hour(currentPair.integratedState.time) > predecessor) {
    throw new Error('Input migration continuation is newer than its protected predecessor');
  }
  const before = rowsByTime(previousRecord, part), after = rowsByTime(correctedRecord, part);
  if (!same([...before.keys()].sort(), [...after.keys()].sort())) {
    throw new Error('Input migration requires an exact old/new selected-hour inventory');
  }
  const consumedThrough = currentPair ? hour(currentPair.integratedState.time) : -Infinity;
  const unconsumedChangedTimes = [], consumedNonWaveChangedTimes = [];
  const waterOracle = waterLevelSanitizationOracle(previousRecord, part);
  // A new forecast or causal bridge after the saved state is normal input,
  // not a correction to already consumed history. Still feed its actual new
  // values to both models. Never use this normalization before the state time.
  const consumedComparison = { ...previousRecord, hourly: previousRecord.hourly.map(row => {
    const next = after.get(row.time);
    if (hour(row.time) > consumedThrough) {
      if (!same(row, next)) unconsumedChangedTimes.push(row.time);
      return next;
    }
    const waterSanitized = isStateNeutralWaterLevelSanitization(row, next, waterOracle);
    if (!same(withoutWave(row, waterSanitized), withoutWave(next, waterSanitized))) consumedNonWaveChangedTimes.push(row.time);
    return row;
  }) };
  if (consumedNonWaveChangedTimes.length) {
    const error = new Error('Historical non-wave component selection changed; a peak-only migration cannot rebind it');
    error.code = 'RAVSCORE_INPUT_MIGRATION_OTHER_CONSUMED_COMPONENT_CHANGED';
    throw error;
  }
  const common = { part, previousRecord: consumedComparison, correctedRecord, targetReferenceAt };
  const changes = classifyPeakPeriodInputChanges(common);
  let baseline = null;
  if (changes.historicalTimes.length) {
    const candidates = [...preChangePairs, ...(currentPair ? [currentPair] : [])]
      .map(pair => compatiblePreChangePair(pair, part, changes.firstChangedAt, targetReferenceAt))
      .filter(Boolean).sort((a, b) => hour(b.integratedState.time) - hour(a.integratedState.time));
    if (candidates.length > 1 && candidates.some(candidate =>
      candidate.integratedState.time === candidates[0].integratedState.time
        && !same(candidates[0], candidate))) throw new Error('Input migration has conflicting same-time state pairs');
    baseline = candidates[0] ?? null;
  }
  const plan = planPeakPeriodStateMigration({ ...common, baseline });
  // Honest replay at the same hour is useful offline, but no existing
  // CONTRACT_ONLY_REBIND/METADATA_ONLY handoff authorizes changed history.
  const selectedRowsChanged = [...before].some(([time, row]) => !same(row, after.get(time)));
  if (selectedRowsChanged && target === predecessor) {
    const error = new Error('Changed selected input requires a genuinely newer production reference or a separate exact input-repair publication contract');
    error.code = 'RAVSCORE_INPUT_MIGRATION_SAME_REFERENCE_UNSUPPORTED';
    throw error;
  }
  const pipelineOptions = { ...currentPipelineOptions,
    recoverySources: [{ label: 'verified-input-transition', record: structuredClone(correctedRecord) }],
    publicHourly: correctedRecord.hourly.filter(row => hour(row.time) >= target
      && hour(row.time) < target + RAVSCORE_PUBLIC_FORECAST_HOURS * HOUR)
      .map(row => structuredClone(row)).sort((a, b) => a.time.localeCompare(b.time)) };
  if (plan.disposition !== 'UNCHANGED_STATE') {
    const cold = plan.disposition === 'AFFECTED_PART_BOUNDED_COLD_REPLAY';
    Object.assign(pipelineOptions, {
      initialSelection: cold ? { state: null, source: 'COLD_START',
        candidateGSourceDisposition: RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION }
        : { state: structuredClone(baseline.integratedState), source: 'INTEGRATED_CHECKPOINT' },
      previousCandidateGContinuation: cold ? null : structuredClone(baseline.candidateGState),
      legacyCandidateGMigrationState: null,
      candidateGRollbackMeasuredColdStart: cold,
      candidateGRollbackMeasuredWarmupContinuation: !cold && baseline.candidateGState.transportMemoryReady !== true,
    });
  }
  return { pipelineOptions, plan: { ...plan,
    previousRecordSha256: digest(previousRecord),
    consumedThrough: currentPair?.integratedState.time ?? null,
    unconsumedChangedTimes: unconsumedChangedTimes.sort(),
    stateNeutralDisposition: plan.stateNeutralWaterLevelSanitizedTimes.length
      ? 'WATER_LEVEL_SANITIZED_STATE_UNCHANGED' : null,
    publicProjectionRebuildRequired: selectedRowsChanged,
    transitionKind: plan.disposition === 'UNCHANGED_STATE'
      ? 'UNCHANGED_CONSUMED_INPUT' : 'VERIFIED_SELECTED_INPUT_CORRECTION',
    publicationDisposition: plan.disposition === 'UNCHANGED_STATE'
      ? 'NORMAL_GENERATION_CONTRACT' : 'GENUINELY_NEWER_REFERENCE_REQUIRED' } };
}

export function planPeakPeriodStateMigration({ part, previousRecord, correctedRecord,
  targetReferenceAt, baseline = null } = {}) {
  const changes = classifyPeakPeriodInputChanges({ part, previousRecord, correctedRecord, targetReferenceAt });
  const target = hour(targetReferenceAt);
  const publicHourly = correctedRecord.hourly.filter(row => hour(row.time) >= target
    && hour(row.time) < target + RAVSCORE_PUBLIC_FORECAST_HOURS * HOUR).sort((a, b) => a.time.localeCompare(b.time));
  if (!publicHourly.some(row => row.time === targetReferenceAt)) throw new Error('Peak migration requires its exact public target row');
  if (!changes.firstChangedAt) return { ...changes, disposition: 'UNCHANGED_STATE',
    reason: changes.stateNeutralWaterLevelSanitizedTimes.length
      ? 'WATER_LEVEL_SANITIZED_STATE_UNCHANGED' : 'NO_CHANGED_NUMERIC_WAVE_INPUT',
    baselineTime: null, statePairSha256: null };
  // Future forecast rows have not contributed to the H0 continuation. Keep
  // that state and let the normal forecast projection consume corrected input.
  if (!changes.historicalTimes.length) return { ...changes, disposition: 'UNCHANGED_STATE',
    reason: 'FUTURE_ONLY_INPUT_CHANGE', baselineTime: null, statePairSha256: null };
  const pair = compatiblePreChangePair(baseline, part, changes.firstChangedAt, targetReferenceAt);
  let completeSuffix = false;
  if (pair) {
    // The normal recovery reader verifies provenance, vectors and sampling.
    // Invalid raw evidence still throws: it is not downgraded to a missing row.
    const recovery = buildRavScoreRecoveryReplay({ part, initialState: pair.integratedState,
      targetReferenceAt, sourceRecords: [{ record: correctedRecord }], publicHourly });
    const historical = new Map(recovery.hourly.filter(row => hour(row.time) < target).map(row => [row.time, row]));
    completeSuffix = true;
    for (let at = hour(pair.integratedState.time) + HOUR; at < target; at += HOUR) {
      const row = historical.get(new Date(at).toISOString());
      const physical = classifyWavePhysicalTuple(row ?? {});
      if (!row || row.currentProvenance?.status !== 'verified' || !physical.available
          || (physical.active && !Number.isFinite(row.waveDirectionDeg))) completeSuffix = false;
    }
  }
  return { ...changes,
    disposition: pair && completeSuffix ? 'PRE_CHANGE_SUFFIX_REPLAY' : 'AFFECTED_PART_BOUNDED_COLD_REPLAY',
    reason: pair ? completeSuffix ? 'EXACT_PRE_CHANGE_PAIR_AND_VERIFIED_SUFFIX' : 'INCOMPLETE_VERIFIED_SUFFIX'
      : 'NO_COMPATIBLE_PRE_CHANGE_PAIR',
    baselineTime: pair && completeSuffix ? pair.integratedState.time : null,
    statePairSha256: pair && completeSuffix ? digest(pair) : null };
}

export function replayPeakPeriodStateMigration({ part, zone, previousRecord, correctedRecord,
  targetReferenceAt, baseline = null } = {}) {
  const plan = planPeakPeriodStateMigration({ part, previousRecord, correctedRecord, targetReferenceAt, baseline });
  if (plan.disposition === 'UNCHANGED_STATE') return { plan, series: null, targetStatePair: null };
  const cold = plan.disposition === 'AFFECTED_PART_BOUNDED_COLD_REPLAY';
  const initialSelection = cold ? { state: null, source: 'COLD_START',
    candidateGSourceDisposition: RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION }
    : { state: structuredClone(baseline.integratedState), source: 'INTEGRATED_CHECKPOINT' };
  const target = hour(targetReferenceAt);
  const series = buildRavScoreProductionPartSeries({ part, zone, initialSelection,
    previousCandidateGContinuation: cold ? null : structuredClone(baseline.candidateGState),
    candidateGRollbackMeasuredColdStart: cold,
    candidateGRollbackMeasuredWarmupContinuation: !cold && baseline.candidateGState.transportMemoryReady !== true,
    targetReferenceAt, recoverySources: [{ record: correctedRecord }],
    publicHourly: correctedRecord.hourly.filter(row => hour(row.time) >= target
      && hour(row.time) < target + RAVSCORE_PUBLIC_FORECAST_HOURS * HOUR).sort((a, b) => a.time.localeCompare(b.time)),
  });
  const integratedState = series.scores.find(row => row.time === targetReferenceAt)?.ravScoreModel?.continuationState;
  const candidateGState = series.candidateGRollbackScores.find(row => row.time === targetReferenceAt)?.candidateG?.continuationState;
  if (!integratedState || !candidateGState || integratedState.time !== candidateGState.time
      || integratedState.time !== targetReferenceAt) throw new Error('Peak migration did not produce one atomic target state pair');
  return { plan, series, targetStatePair: { integratedState, candidateGState } };
}
