import assert from 'node:assert/strict';
import { CANDIDATES, opportunityFactor, supportAwarePenalty } from './compare-zone-ranking-correction-candidates.mjs';

assert.equal(opportunityFactor(1), 0);
assert.equal(opportunityFactor(Math.PI), 1);
assert.equal(opportunityFactor(999), 1);

assert.equal(supportAwarePenalty({ opportunityIndex: 1, supportRatio: 0 }, 4), 0);
assert.equal(supportAwarePenalty({ opportunityIndex: Math.PI, supportRatio: 1 }, 4), 0);
assert.equal(supportAwarePenalty({ opportunityIndex: Math.PI, supportRatio: 0 }, 4), 4);
assert.equal(supportAwarePenalty({ opportunityIndex: Math.PI, supportRatio: 0.5 }, 4), 2);

assert.deepEqual(
  CANDIDATES.map((candidate) => candidate.id),
  ['baseline', 'raw-count-4', 'direction-only-4', 'direction-support-2', 'direction-support-4', 'direction-support-6'],
);

console.log('Zone ranking correction candidate self-test: passed');
