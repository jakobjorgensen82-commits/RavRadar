import assert from 'node:assert/strict';
import { createProtectedPrivateRuntimeClients, PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';

const base = { supabaseUrl: 'https://synthetic.supabase.co', serviceRoleKey: 'synthetic',
  delayImpl: async () => {}, retryDelayMs: 0 };
const objectPath = 'bundles/sha256/synthetic.json.gz';
function interrupted() {
  let reads = 0;
  return new Response(new ReadableStream({ pull(controller) {
    if (reads++ === 0) controller.enqueue(new Uint8Array([1, 2]));
    else controller.error(new Error('synthetic interrupted transfer'));
  } }));
}
let calls = 0;
const retried = createProtectedPrivateRuntimeClients({ ...base, fetchImpl: async () =>
  ++calls === 1 ? interrupted() : new Response(new Uint8Array([3, 4, 5])) });
assert.deepEqual(await retried.storage.download(objectPath), Buffer.from([3, 4, 5]));
assert.equal(calls, 2, 'partial first response must not be appended to the retry');

calls = 0;
const broken = createProtectedPrivateRuntimeClients({ ...base, fetchImpl: async () => {
  calls++; return interrupted();
} });
await assert.rejects(broken.storage.download(objectPath), /could not be reached/);
assert.equal(calls, 2, 'transport retries remain bounded');

calls = 0;
let cancelled = false;
const oversized = createProtectedPrivateRuntimeClients({ ...base,
  policy: { ...PROTECTED_PRIVATE_RUNTIME_POLICY, maximumArchiveBytes: 3 },
  fetchImpl: async () => {
    calls++;
    return new Response(new ReadableStream({ pull(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3, 4]));
    }, cancel() { cancelled = true; } }));
  } });
await assert.rejects(oversized.storage.download(objectPath), /exceeds its bound/);
assert.equal(calls, 1, 'size violations are never transient errors');
assert.equal(cancelled, true, 'oversized chunked transfer is cancelled');

const bucket = { id: PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId,
  name: PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId, public: false,
  file_size_limit: PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveBytes,
  allowed_mime_types: [PROTECTED_PRIVATE_RUNTIME_POLICY.mimeType] };
calls = 0;
const bucketRetry = createProtectedPrivateRuntimeClients({ ...base, fetchImpl: async () =>
  ++calls === 1 ? interrupted() : Response.json(bucket) });
assert.equal(await bucketRetry.storage.ensurePrivateBucket(), true);
assert.equal(calls, 2);

calls = 0;
const malformed = createProtectedPrivateRuntimeClients({ ...base, fetchImpl: async () => {
  calls++; return new Response('invalid bucket JSON');
} });
await assert.rejects(malformed.storage.ensurePrivateBucket(), /policy is incompatible/);
assert.equal(calls, 1, 'invalid completed JSON must not be retried');

calls = 0;
const immutable = createProtectedPrivateRuntimeClients({ ...base, fetchImpl: async (url, options) => {
  calls++;
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['x-upsert'], 'false');
  assert.deepEqual(options.body, Buffer.from('same bytes'));
  if (calls === 1) return { status: 409, ok: false, text: async () => { throw new Error('lost duplicate receipt'); } };
  return Response.json({ message: 'already exists' }, { status: 409 });
} });
assert.deepEqual(await immutable.storage.uploadImmutable(objectPath, Buffer.from('same bytes')),
  { created: false, alreadyExists: true });
assert.equal(calls, 2, 'an identical immutable upload may retry a lost duplicate receipt');
console.log('Protected Storage body retry: 6 focused cases passed.');
