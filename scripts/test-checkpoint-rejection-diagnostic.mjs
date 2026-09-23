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
  schemaVersion: '1.1.0', diagnosticMode: 'BOUNDED_STATE_BATCHES',
  checkedPartCount: 3, batchCount: 2,
  payloadReason: 'FULL_PAYLOAD_STILL_REJECTED',
  payloadBatchReasons: { P02: 2 },
  integratedReasons: { I14: 3 }, candidateReasons: { C03: 3 },
});
assert.equal(calls.length, 2);
for (const call of calls) {
  assert.match(call.url, /\/rest\/v1\/rpc\/ravradar_ravscore_checkpoint_rejection_diagnostic$/);
  assert.equal(call.options.method, 'POST');
  const sent = JSON.parse(call.options.body).p_payload;
  assert.equal(sent.privateCanary, 'do-not-log-me');
  assert.ok(Object.keys(sent.states).length <= 2,
    'the private checkpoint must never be sent to the expensive diagnostic in full');
  assert.deepEqual(Object.keys(sent.states).sort(),
    Object.keys(sent.candidateGRollbackCompanion.states).sort());
}

const allIds = Array.from({ length: 673 }, (_, index) => `private-${index}`);
const allStates = Object.fromEntries(allIds.map(id => [id, {}]));
let largeBatchCount = 0;
const largeRequest = createProtectedRavScoreCheckpointDiagnosticRequester({
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'sb_secret_test_only',
  fetchImpl: async (_url, options) => {
    const count = Object.keys(JSON.parse(options.body).p_payload.states).length;
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
assert.equal(largeResult.integratedReasons.I14, 673);
assert.deepEqual(largeResult.payloadBatchReasons, { P02: 22 });
assert.deepEqual(largeResult.candidateReasons, {});

const forbiddenSubsetRequest = createProtectedRavScoreCheckpointDiagnosticRequester({
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'sb_secret_test_only',
  fetchImpl: async (_url, options) => {
    const count = Object.keys(JSON.parse(options.body).p_payload.states).length;
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

for (const [response, safeDiagnostic] of [
  [new Response(JSON.stringify({ schemaVersion: '1.0.0', payloadReason: 'P02',
    normalizedBytes: 1_234_567,
    integratedReasons: { secretZone: 1 }, candidateReasons: {} }), { status: 200 }),
  'RESPONSE_REASON_SHAPE'],
  [new Response(JSON.stringify({ code: 'SECRET', message: 'do-not-log-me' }), { status: 400 }),
  'HTTP_400_UNKNOWN_UNCLASSIFIED'],
  [new Response(JSON.stringify({ code: '57014', message: 'statement timeout' }), { status: 500 }),
  'HTTP_500_57014_UNCLASSIFIED'],
]) {
  const failing = createProtectedRavScoreCheckpointDiagnosticRequester({
    supabaseUrl: 'https://example.supabase.co',
    serviceRoleKey: 'sb_secret_test_only',
    batchSize: 2,
    fetchImpl: async () => response,
  });
  await assert.rejects(failing(payload, reference), error => {
    assert.equal(error.message, 'Protected checkpoint diagnostic unavailable');
    assert.equal(error.safeDiagnostic, safeDiagnostic);
    assert.doesNotMatch(error.message, /secretZone|do-not-log-me|SECRET/);
    return true;
  });
}
console.log('Protected checkpoint rejection diagnostic contract passed.');
