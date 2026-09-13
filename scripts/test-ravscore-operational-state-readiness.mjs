import assert from 'node:assert/strict';
import {
  RAVSCORE_COLD_REPLAY_ID,
  RAVSCORE_RECOVERY_POLICY,
} from '../js/core/ravscore-model-contract.js';
import {
  exactNationalOperationalColdReplayInitialization,
  exactOperationalColdReplayInitialization,
} from './lib/ravscore-operational-state-readiness.mjs';

const coldState = ({ unknown = 0 } = {}) => ({
  initialStateAccepted: false,
  migrationApplied: false,
  initialStateSource: unknown === 0
    ? 'VERIFIED_PRIVATE_48H_COLD_REPLAY'
    : 'BOUNDED_PRIVATE_PARTIAL_HISTORY_COLD_REPLAY',
  continuationState: {
    time: '2026-09-12T08:00:00.000Z',
    lineage: {
      boundedUnknownPositionCount: unknown,
      completeCausalPositionCount: RAVSCORE_RECOVERY_POLICY.coldReplayHours - unknown,
      expectedCausalPositionCount: RAVSCORE_RECOVERY_POLICY.coldReplayHours,
      historyTransition: unknown === 0
        ? RAVSCORE_RECOVERY_POLICY.completeHistoryTransition
        : RAVSCORE_RECOVERY_POLICY.unknownHistoryTransition,
      recoveryId: RAVSCORE_COLD_REPLAY_ID,
      source: RAVSCORE_RECOVERY_POLICY.source,
      targetReferenceAt: '2026-09-12T08:00:00.000Z',
    },
  },
});

assert.equal(exactOperationalColdReplayInitialization(coldState()), true);
assert.equal(exactOperationalColdReplayInitialization(coldState({ unknown: 7 })), true);
assert.equal(
  exactNationalOperationalColdReplayInitialization([
    { ravScoreState: coldState() },
    { ravScoreState: coldState() },
  ], 2),
  true,
);
for (const mutate of [
  value => { value.continuationState.lineage.completeCausalPositionCount -= 1; },
  value => { value.continuationState.lineage.source = 'UNVERIFIED'; },
  value => { value.initialStateSource = 'INTEGRATED_CONTINUATION'; },
  value => { value.continuationState.lineage.targetReferenceAt = '2026-09-12T09:00:00.000Z'; },
  value => { value.continuationState.lineage.extra = true; },
]) {
  const value = coldState();
  mutate(value);
  assert.equal(exactOperationalColdReplayInitialization(value), false);
}
assert.equal(
  exactNationalOperationalColdReplayInitialization([{ ravScoreState: coldState() }], 2),
  false,
  'en delvis eller blandet national cohort må ikke godkendes',
);
assert.equal(
  exactNationalOperationalColdReplayInitialization([
    { ravScoreState: coldState() },
    { ravScoreState: coldState({ unknown: 7 }) },
  ], 2),
  false,
  'forskellige cold-replay-kildetyper må ikke blandes i den nationale cohort',
);

console.log('Operationel RavScore cold-start-readiness: bestået.');
