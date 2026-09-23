import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CANDIDATE_G_OPERATIONAL_ROLLBACK_ID } from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import { RAVSCORE_ROLLBACK_ID as INTEGRATED_TRANSITION_ID } from '../js/core/ravscore-model-contract.js';
import { expectedCheckpointCasContract } from './integrated-cutover-readiness.mjs';

const sql = await fs.readFile(
  'supabase/migrations/20260923160000_checkpoint_candidate_companion_id.sql',
  'utf8',
);
assert.equal(CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
  'integrated-schema5-to-candidate-g-schema2-v2');
assert.equal(INTEGRATED_TRANSITION_ID,
  'integrated-schema6-to-candidate-g-schema2-v3');
assert.notEqual(CANDIDATE_G_OPERATIONAL_ROLLBACK_ID, INTEGRATED_TRANSITION_ID);
assert.equal((sql.match(/create or replace function public\./g) ?? []).length, 2);
for (const name of ['payload_valid', 'payload_reason']) {
  assert.match(sql, new RegExp(
    `create or replace function public\\.ravradar_ravscore_checkpoint_${name}\\(`,
  ));
}
assert.equal(sql.split(`is distinct from '${CANDIDATE_G_OPERATIONAL_ROLLBACK_ID}'`).length - 1, 2);
assert.doesNotMatch(sql, /integrated-schema6-to-candidate-g-schema2-v3/);
assert.doesNotMatch(sql,
  /create or replace function public\.ravradar_ravscore_checkpoint_(?:integrated_state_valid|candidate_state_valid|cas)\(/);
assert.doesNotMatch(sql, /\b(?:insert|update|delete|truncate|drop)\s+(?:into\s+|from\s+)?public\./i);
assert.match(sql, /ravradar_ravscore_checkpoint_candidate_state_valid\(/);
assert.match(sql, /ravradar_ravscore_checkpoint_integrated_state_valid\(/);
const cas = await expectedCheckpointCasContract();
assert.match(cas.definition,
  /is distinct from 'integrated-schema5-to-candidate-g-schema2-v2'/);
console.log('Checkpoint companion ID matches the sealed Candidate G package; native hold and CAS remain intact.');
