import assert from 'node:assert/strict';
import {
  createProtectedRavScoreCheckpointRequester,
  createProtectedRavScoreCheckpointVersionRequester,
  createProtectedRavScoreCheckpointRpcRequester,
} from './protected-ravscore-continuation-checkpoint.mjs';

const reference = '2026-09-19T00:00:00.000Z';
const rpcBody = {
  p_expected_version: 7,
  p_payload: { productionReferenceAt: reference },
  p_target_reference: reference,
};
const variants = [
  [createProtectedRavScoreCheckpointRequester,
    '?document_key=eq.ravscore-continuation-checkpoint&select=document_key,payload,version&limit=2', []],
  [createProtectedRavScoreCheckpointVersionRequester,
    '?document_key=eq.ravscore-continuation-checkpoint&select=document_key,version&limit=2', []],
  [createProtectedRavScoreCheckpointRpcRequester, rpcBody, { disposition: 'already-current' }],
];
for (const [factory, input, result] of variants) {
  for (const streamed of [false, true]) {
    const requests = [];
    const request = factory({
      supabaseUrl: 'https://example.invalid', serviceRoleKey: 'synthetic-key',
      retryDelayMs: 0, delayImpl: async () => {}, logger: () => {},
      fetchImpl: async (_url, options) => {
        requests.push(structuredClone(options));
        if (requests.length > 1) return new Response(JSON.stringify(result));
        return streamed
          ? new Response(new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{'));
              controller.error(new TypeError('synthetic body reset'));
            },
          }))
          : { ok: true, status: 200, text: async () => { throw new TypeError('synthetic body reset'); } };
      },
    });
    assert.deepEqual(await request(input), result);
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[0], requests[1], 'retry must preserve exact method, headers and serialized CAS payload');
  }
  for (const failure of ['oversized', 'invalid-json', 'persistent-transport']) {
    let calls = 0;
    const request = factory({
      supabaseUrl: 'https://example.invalid', serviceRoleKey: 'synthetic-key',
      retryDelayMs: 0, delayImpl: async () => {}, logger: () => {},
      fetchImpl: async () => {
        calls += 1;
        if (failure === 'oversized') return new Response('[]', { headers: { 'content-length': String(64 * 1024 * 1024) } });
        if (failure === 'invalid-json') return new Response('{invalid');
        return { ok: true, status: 200, text: async () => { throw new TypeError('synthetic body reset'); } };
      },
    });
    await assert.rejects(() => request(input));
    assert.equal(calls, failure === 'persistent-transport' ? 2 : 1,
      'only transport is retried; bounds and JSON remain hard failures');
  }
}
console.log('OK: bounded body transport retry preserves idempotent checkpoint CAS and rejects malformed/oversized responses.');
