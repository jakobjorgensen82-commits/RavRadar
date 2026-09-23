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
const payload = { productionReferenceAt: reference, privateCanary: 'do-not-log-me' };
let call;
const request = createProtectedRavScoreCheckpointDiagnosticRequester({
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'sb_secret_test_only',
  fetchImpl: async (url, options) => {
    call = { url, options };
    return new Response(JSON.stringify({
      schemaVersion: '1.0.0', payloadReason: 'P02',
      normalizedBytes: 1_234_567,
      integratedReasons: { I14: 51 }, candidateReasons: { C03: 2 },
    }), { status: 200 });
  },
});
assert.deepEqual(await request(payload, reference), {
  schemaVersion: '1.0.0', payloadReason: 'P02',
  normalizedBytes: 1_234_567,
  integratedReasons: { I14: 51 }, candidateReasons: { C03: 2 },
});
assert.match(call.url, /\/rest\/v1\/rpc\/ravradar_ravscore_checkpoint_rejection_diagnostic$/);
assert.equal(call.options.method, 'POST');
assert.equal(JSON.parse(call.options.body).p_payload.privateCanary, 'do-not-log-me');

for (const response of [
  new Response(JSON.stringify({ schemaVersion: '1.0.0', payloadReason: 'P02',
    normalizedBytes: 1_234_567,
    integratedReasons: { secretZone: 1 }, candidateReasons: {} }), { status: 200 }),
  new Response(JSON.stringify({ code: 'SECRET', message: 'do-not-log-me' }), { status: 400 }),
]) {
  const failing = createProtectedRavScoreCheckpointDiagnosticRequester({
    supabaseUrl: 'https://example.supabase.co',
    serviceRoleKey: 'sb_secret_test_only',
    fetchImpl: async () => response,
  });
  await assert.rejects(failing(payload, reference), error => {
    assert.equal(error.message, 'Protected checkpoint diagnostic unavailable');
    assert.doesNotMatch(error.message, /secretZone|do-not-log-me|SECRET/);
    return true;
  });
}
console.log('Protected checkpoint rejection diagnostic contract passed.');
