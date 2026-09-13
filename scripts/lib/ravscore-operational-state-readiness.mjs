import {
  RAVSCORE_COLD_REPLAY_ID,
  RAVSCORE_RECOVERY_POLICY,
} from '../../js/core/ravscore-model-contract.js';

const COLD_REPLAY_LINEAGE_KEYS = Object.freeze([
  'boundedUnknownPositionCount',
  'completeCausalPositionCount',
  'expectedCausalPositionCount',
  'historyTransition',
  'recoveryId',
  'source',
  'targetReferenceAt',
]);

const exactKeys = (value, expected) => value
  && typeof value === 'object'
  && !Array.isArray(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());

export function exactOperationalColdReplayInitialization(value) {
  const state = value?.continuationState;
  const lineage = state?.lineage;
  const completeCount = lineage?.completeCausalPositionCount;
  const unknownCount = lineage?.boundedUnknownPositionCount;
  const targetMs = Date.parse(lineage?.targetReferenceAt);
  const stateMs = Date.parse(state?.time);
  const expectedSource = unknownCount === 0
    ? 'VERIFIED_PRIVATE_48H_COLD_REPLAY'
    : 'BOUNDED_PRIVATE_PARTIAL_HISTORY_COLD_REPLAY';
  return value?.initialStateAccepted === false
    && value?.migrationApplied === false
    && value?.initialStateSource === expectedSource
    && exactKeys(lineage, COLD_REPLAY_LINEAGE_KEYS)
    && lineage.recoveryId === RAVSCORE_COLD_REPLAY_ID
    && lineage.source === RAVSCORE_RECOVERY_POLICY.source
    && lineage.expectedCausalPositionCount === RAVSCORE_RECOVERY_POLICY.coldReplayHours
    && Number.isSafeInteger(completeCount)
    && Number.isSafeInteger(unknownCount)
    && completeCount >= 0
    && unknownCount >= 0
    && completeCount + unknownCount === RAVSCORE_RECOVERY_POLICY.coldReplayHours
    && lineage.historyTransition === (unknownCount > 0
      ? RAVSCORE_RECOVERY_POLICY.unknownHistoryTransition
      : RAVSCORE_RECOVERY_POLICY.completeHistoryTransition)
    && Number.isFinite(targetMs)
    && Number.isFinite(stateMs)
    && targetMs <= stateMs;
}

export function exactNationalOperationalColdReplayInitialization(
  partRows,
  expectedPartCount,
) {
  const exactRows = Number.isSafeInteger(expectedPartCount)
    && expectedPartCount > 0
    && Array.isArray(partRows)
    && partRows.length === expectedPartCount
    && partRows.every(row => exactOperationalColdReplayInitialization(row?.ravScoreState));
  return exactRows
    && new Set(partRows.map(row => row.ravScoreState.initialStateSource)).size === 1;
}
