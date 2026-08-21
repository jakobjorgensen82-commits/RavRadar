import assert from 'node:assert/strict';
import { CANDIDATES, broadSupportSafeguardPenalty, buildBootstrapHourIndices, opportunityFactor, rankRows, repeatedSupportPenalty, supportAwarePenalty } from './compare-zone-ranking-correction-candidates.mjs';

assert.equal(opportunityFactor(1), 0);
assert.equal(opportunityFactor(Math.PI), 1);
assert.equal(opportunityFactor(999), 1);

assert.equal(supportAwarePenalty({ opportunityIndex: 1, supportRatio: 0 }, 4), 0);
assert.equal(supportAwarePenalty({ opportunityIndex: Math.PI, supportRatio: 1 }, 4), 0);
assert.equal(supportAwarePenalty({ opportunityIndex: Math.PI, supportRatio: 0 }, 4), 4);
assert.equal(supportAwarePenalty({ opportunityIndex: Math.PI, supportRatio: 0.5 }, 4), 2);

assert.deepEqual(
  CANDIDATES.map((candidate) => candidate.id),
  ['baseline', 'raw-count-4', 'direction-only-4', 'direction-support-2', 'direction-support-4', 'direction-support-6', 'direction-support-8', 'direction-support-10', 'direction-support-12', 'direction-support-14', 'direction-support-16', 'direction-support-18', 'direction-support-20', 'direction-repeat-18-s2', 'direction-repeat-18-s4', 'direction-repeat-18-s8', 'direction-repeat-22-s2', 'direction-repeat-22-s4', 'direction-repeat-22-s8', 'direction-repeat-26-s2', 'direction-repeat-26-s4', 'direction-repeat-26-s8', 'direction-repeat-30-s2', 'direction-repeat-30-s4', 'direction-repeat-30-s8', 'direction-broad-18', 'direction-broad-19', 'direction-broad-20', 'direction-broad-22', 'direction-broad-24', 'direction-support-4-near2'],
);

const isolatedRow={opportunityIndex:Math.PI,supportRatio:.1,partCount:10};
const repeatedRow={opportunityIndex:Math.PI,supportRatio:.3,partCount:10};
assert.equal(repeatedSupportPenalty(isolatedRow,18,2),supportAwarePenalty(isolatedRow,18));
assert.ok(repeatedSupportPenalty(repeatedRow,18,2)<supportAwarePenalty(repeatedRow,18));
assert.equal(broadSupportSafeguardPenalty({...repeatedRow,supportRatio:.5},18),0);
assert.equal(broadSupportSafeguardPenalty({...repeatedRow,supportRatio:.25},18),supportAwarePenalty({...repeatedRow,supportRatio:.25},18));
assert.ok(broadSupportSafeguardPenalty({...repeatedRow,supportRatio:.4},18)<supportAwarePenalty({...repeatedRow,supportRatio:.4},18));

const nearTie = CANDIDATES.find((candidate) => candidate.id === 'direction-support-4-near2');
const syntheticRows = [
  { zoneId: 'clear-winner', score: 100, opportunityIndex: Math.PI, supportRatio: 0, sourceOrder: 0 },
  { zoneId: 'near-tie', score: 99, opportunityIndex: 1, supportRatio: 1, sourceOrder: 1 },
  { zoneId: 'outside-band', score: 97, opportunityIndex: 1, supportRatio: 1, sourceOrder: 2 },
];
assert.deepEqual(
  rankRows(syntheticRows, nearTie).map((row) => row.zoneId),
  ['near-tie', 'clear-winner', 'outside-band'],
  'The near-tie candidate may reorder within two points but not across the protected band.',
);

const fixedRandomValues = [0, 0.5];
let randomIndex = 0;
assert.deepEqual(
  buildBootstrapHourIndices({ hourCount: 5, blockSizeHours: 3, random: () => fixedRandomValues[randomIndex++] }),
  [0, 1, 2, 2, 3],
);

console.log('Zone ranking correction candidate self-test: passed');
