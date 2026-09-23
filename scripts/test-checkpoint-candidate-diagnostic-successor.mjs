import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  createProtectedRavScoreCheckpointDiagnosticRequester,
} from './protected-ravscore-continuation-checkpoint.mjs';

const sql = await fs.readFile(
  'supabase/migrations/20260923150000_checkpoint_candidate_diagnostic_correction.sql',
  'utf8',
);
assert.equal((sql.match(/create or replace function public\./g) ?? []).length, 1,
  'Only the read-only reason function may change');
assert.match(sql, /create or replace function public\.ravradar_ravscore_checkpoint_candidate_state_reason\(/);
assert.doesNotMatch(sql, /create or replace function public\.ravradar_ravscore_checkpoint_(?:candidate_state_valid|payload_valid|cas)\(/);
assert.match(sql, /return 'C07';/);
assert.match(sql, /return 'C08';/);
assert.match(sql, /return null;/);
assert.doesNotMatch(sql, /return v_status <> 'READY'/,
  'The previous diagnostic returned boolean text rather than a reason code');
assert.match(sql, /interval '3 hours'/,
  'The Candidate G native-cadence time bound must remain visible');
assert.doesNotMatch(sql, /\b(?:insert|update|delete|truncate|drop)\s+(?:into\s+|from\s+)?public\./i);

const reference = '2026-09-23T05:00:00.000Z';
const payload = {
  productionReferenceAt: reference,
  states: { opaque1: {}, opaque2: {} },
  candidateGRollbackCompanion: { states: { opaque1: {}, opaque2: {} } },
};
const diagnose = createProtectedRavScoreCheckpointDiagnosticRequester({
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'sb_secret_test_only',
  fetchImpl: async () => new Response(JSON.stringify({
    schemaVersion: '1.0.0', payloadReason: 'P04', normalizedBytes: 200,
    integratedReasons: {}, candidateReasons: { C07: 1, C08: 1 },
  }), { status: 200 }),
});
const result = await diagnose(payload, reference);
assert.deepEqual(result.candidateReasons, { C07: 1, C08: 1 });
assert.deepEqual(result.diagnosticAnomalies, {});
assert.equal(result.payloadReason, 'P04');
assert.doesNotMatch(JSON.stringify(result), /opaque1|opaque2|sb_secret/);
console.log('Candidate G diagnostic returns bounded status and coverage codes without changing CAS.');
