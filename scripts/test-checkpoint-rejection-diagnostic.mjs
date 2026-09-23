import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  createProtectedRavScoreCheckpointDiagnosticRequester,
} from './protected-ravscore-continuation-checkpoint.mjs';

const sql = await fs.readFile(
  'supabase/migrations/20260923130000_checkpoint_rejection_diagnostic.sql', 'utf8',
);
for (const marker of [
  'create or replace function public.ravradar_ravscore_checkpoint_integrated_state_reason(',
  'create or replace function public.ravradar_ravscore_checkpoint_candidate_state_reason(',
  'create or replace function public.ravradar_ravscore_checkpoint_payload_reason(',
  'create or replace function public.ravradar_ravscore_checkpoint_rejection_diagnostic(',
  'security definer',
  'grant execute on function public.ravradar_ravscore_checkpoint_rejection_diagnostic(jsonb,timestamptz)',
  'to service_role;',
]) assert.ok(sql.includes(marker), `Diagnostic migration is missing ${marker}`);
assert.doesNotMatch(sql, /\b(?:insert|update|delete|truncate)\s+(?:into\s+|from\s+)?public\./i,
  'The rejection diagnostic must not write production rows');
assert.doesNotMatch(sql, /grant execute on function public\.ravradar_ravscore_checkpoint_rejection_diagnostic\(jsonb,timestamptz\)\s+to\s+(?:public|anon|authenticated)/i);

const reference = '2026-09-23T12:00:00.000Z';
const payload = {
  productionReferenceAt: reference, privateCanary: 'do-not-log-me',
  states: { secretA: {}, secretB: {}, secretC: {} },
  candidateGRollbackCompanion: {
    states: { secretA: {}, secretB: {}, secretC: {} },
  },
};
const calls = [];
const request = createProtectedRavScoreCheckpointDiagnosticRequester({
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'sb_secret_test_only',
  batchSize: 2,
  fetchImpl: async (url, options) => {
    calls.push({ url, options });
    const partCount = Object.keys(JSON.parse(options.body).p_payload.states).length;
    return new Response(JSON.stringify({
      schemaVersion: '1.0.0', payloadReason: 'P02',
      normalizedBytes: 1_234_567,
      integratedReasons: { I14: partCount }, candidateReasons: { C03: partCount },
    }), { status: 200 });
  },
});
assert.deepEqual(await request(payload, reference), {
  schemaVersion: '1.2.0', diagnosticMode: 'FULL_PAYLOAD',
  checkedPartCount: 3, batchCount: 1,
  payloadReason: 'P02',
  integratedReasons: { I14: 3 }, candidateReasons: { C03: 3 },
  diagnosticAnomalies: {},
});
assert.equal(calls.length, 1);
for (const call of calls) {
  assert.match(call.url, /\/rest\/v1\/rpc\/ravradar_ravscore_checkpoint_rejection_diagnostic$/);
  assert.equal(call.options.method, 'POST');
  const sent = JSON.parse(call.options.body).p_payload;
  assert.equal(sent.privateCanary, 'do-not-log-me');
  assert.equal(Object.keys(sent.states).length, 3);
  assert.deepEqual(Object.keys(sent.states).sort(),
    Object.keys(sent.candidateGRollbackCompanion.states).sort());
}

const apparentlyValid = createProtectedRavScoreCheckpointDiagnosticRequester({
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'sb_secret_test_only',
  fetchImpl: async () => new Response(JSON.stringify({
    schemaVersion: '1.0.0', payloadReason: 'PASS', normalizedBytes: 100,
    integratedReasons: {}, candidateReasons: {},
  }), { status: 200 }),
});
assert.equal((await apparentlyValid(payload, reference)).payloadReason, 'PASS',
  'A validator/CAS disagreement must be visible rather than hidden');

const allIds = Array.from({ length: 673 }, (_, index) => `private-${index}`);
const allStates = Object.fromEntries(allIds.map(id => [id, {}]));
let largeBatchCount = 0;
const largeRequest = createProtectedRavScoreCheckpointDiagnosticRequester({
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'sb_secret_test_only',
  fetchImpl: async (_url, options) => {
    const count = Object.keys(JSON.parse(options.body).p_payload.states).length;
    if (count > 32) return new Response(JSON.stringify({ code: '57014' }), { status: 500 });
    assert.ok(count >= 1 && count <= 32);
    largeBatchCount += 1;
    return new Response(JSON.stringify({
      schemaVersion: '1.0.0', payloadReason: 'P02', normalizedBytes: 20_000,
      integratedReasons: { I14: count }, candidateReasons: {},
    }), { status: 200 });
  },
});
const largeResult = await largeRequest({
  productionReferenceAt: reference, states: allStates,
  candidateGRollbackCompanion: { states: allStates },
}, reference);
assert.equal(largeBatchCount, 22);
assert.equal(largeResult.checkedPartCount, 673);
assert.equal(largeResult.expectedPartCount, 673);
assert.equal(largeResult.batchFailure, null);
assert.equal(largeResult.diagnosticMode, 'FULL_THEN_BOUNDED_STATE_BATCHES');
assert.equal(largeResult.payloadReason, 'UNAVAILABLE');
assert.equal(largeResult.fullPayloadDiagnostic, 'HTTP_500_57014_UNCLASSIFIED');
assert.equal(largeResult.integratedReasons.I14, 673);
assert.deepEqual(largeResult.payloadBatchReasons, { P02: 22 });
assert.deepEqual(largeResult.candidateReasons, {});
assert.deepEqual(largeResult.diagnosticAnomalies, {});

const forbiddenSubsetRequest = createProtectedRavScoreCheckpointDiagnosticRequester({
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'sb_secret_test_only',
  fetchImpl: async (_url, options) => {
    const count = Object.keys(JSON.parse(options.body).p_payload.states).length;
    if (count > 32) return new Response(JSON.stringify({ code: '57014' }), { status: 500 });
    return new Response(JSON.stringify({
      schemaVersion: '1.0.0', payloadReason: 'P01', normalizedBytes: 20_000,
      integratedReasons: { I01: count }, candidateReasons: {},
    }), { status: 200 });
  },
});
const forbiddenSubset = await forbiddenSubsetRequest({
  productionReferenceAt: reference, states: allStates,
  candidateGRollbackCompanion: { states: allStates },
}, reference);
assert.deepEqual(forbiddenSubset.payloadBatchReasons, { P01: 22 });
assert.deepEqual(forbiddenSubset.integratedReasons, { I01: 673 });

const anomalous = createProtectedRavScoreCheckpointDiagnosticRequester({
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'sb_secret_test_only',
  batchSize: 2,
  fetchImpl: async () => new Response(JSON.stringify({
    schemaVersion: '1.0.0', payloadReason: 'P02', normalizedBytes: 100,
    integratedReasons: { I14: 1, privateZoneId: 'do-not-log-me' },
    candidateReasons: { C03: 1 },
  }), { status: 200 }),
});
const anomalousResult = await anomalous(payload, reference);
assert.deepEqual(anomalousResult.integratedReasons, { I14: 2 });
assert.deepEqual(anomalousResult.candidateReasons, { C03: 2 });
assert.deepEqual(anomalousResult.diagnosticAnomalies,
  { integratedReasonsUnknownCodes: 2, integratedReasonsUnexpectedEntries: 2 });
assert.doesNotMatch(JSON.stringify(anomalousResult), /privateZoneId|do-not-log-me/);

const impossibleCount = createProtectedRavScoreCheckpointDiagnosticRequester({
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'sb_secret_test_only',
  batchSize: 2,
  fetchImpl: async () => new Response(JSON.stringify({
    schemaVersion: '1.0.0', payloadReason: 'P04', normalizedBytes: 100,
    integratedReasons: {}, candidateReasons: { C03: 700 },
  }), { status: 200 }),
});
const impossibleResult = await impossibleCount(payload, reference);
assert.deepEqual(impossibleResult.candidateReasons, {});
assert.deepEqual(impossibleResult.diagnosticAnomalies,
  { candidateReasonsRejectedC03: 2, candidateReasonsUnexpectedEntries: 2 });
assert.equal(impossibleResult.payloadReason, 'P04');

for (const [response, safeDiagnostic] of [
  [new Response(JSON.stringify({ code: 'SECRET', message: 'do-not-log-me' }), { status: 400 }),
  'HTTP_400_UNKNOWN_UNCLASSIFIED'],
  [new Response(JSON.stringify({ code: '57014', message: 'statement timeout' }), { status: 500 }),
  'HTTP_500_57014_UNCLASSIFIED'],
]) {
  const failing = createProtectedRavScoreCheckpointDiagnosticRequester({
    supabaseUrl: 'https://example.supabase.co',
    serviceRoleKey: 'sb_secret_test_only',
    batchSize: 2,
    fetchImpl: async () => response.clone(),
  });
  const result = await failing(payload, reference);
  assert.equal(result.fullPayloadDiagnostic, safeDiagnostic);
  assert.equal(result.batchFailure, safeDiagnostic);
  assert.equal(result.checkedPartCount, 0);
  assert.equal(result.expectedPartCount, 3);
  assert.doesNotMatch(JSON.stringify(result), /secretZone|do-not-log-me|SECRET/);
}
console.log('Protected checkpoint rejection diagnostic contract passed.');
