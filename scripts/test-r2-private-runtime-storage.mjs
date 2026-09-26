import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createR2PrivateRuntimeStorage } from './lib/r2-private-runtime-storage.mjs';

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const objects = new Map();
const calls = [];
const accountId = 'a'.repeat(32);
const bucketId = 'ravradar-private-production-runtime';
const object = Buffer.from('exact private runtime test bytes');
const digest = sha256(object);
const objectPath = `bundles/sha256/${digest}/part-000-${digest}.json.gz.part`;

function listing() {
  const entries = [...objects].map(([key, bytes]) =>
    `<Contents><Key>${key}</Key><Size>${bytes.length}</Size></Contents>`).join('');
  return `<?xml version="1.0"?><ListBucketResult><KeyCount>${objects.size}</KeyCount>`
    + `${entries}<IsTruncated>false</IsTruncated></ListBucketResult>`;
}

async function fakeFetch(url, options = {}) {
  const address = new URL(url);
  const method = options.method ?? 'GET';
  const headers = new Headers(options.headers);
  calls.push({ address, method, headers });
  assert.equal(address.host, `${accountId}.eu.r2.cloudflarestorage.com`);
  const signed = headers.has('authorization');
  if (signed) {
    assert.match(headers.get('authorization'),
      /^AWS4-HMAC-SHA256 Credential=synthetic-id\/[0-9]{8}\/auto\/s3\/aws4_request, SignedHeaders=.*?, Signature=[0-9a-f]{64}$/);
    assert.match(headers.get('x-amz-content-sha256'), /^[0-9a-f]{64}$/);
  }
  if (method === 'HEAD' && address.pathname === `/${bucketId}`) {
    return new Response(null, { status: 200 });
  }
  if (address.searchParams.get('list-type') === '2') {
    return new Response(listing(), { status: 200 });
  }
  const key = decodeURIComponent(address.pathname.slice(`/${bucketId}/`.length));
  if (!signed) return new Response('', { status: 403 });
  if (method === 'HEAD') {
    return new Response(null, { status: objects.has(key) ? 200 : 404 });
  }
  if (method === 'PUT') {
    assert.equal(headers.get('if-none-match'), '*');
    if (objects.has(key)) return new Response('', { status: 412 });
    objects.set(key, Buffer.from(options.body));
    return new Response('', { status: 200 });
  }
  if (method === 'DELETE') {
    objects.delete(key);
    return new Response(null, { status: 204 });
  }
  if (method === 'GET' && objects.has(key)) {
    const bytes = objects.get(key);
    return new Response(bytes, {
      status: 200, headers: { 'content-length': String(bytes.length) },
    });
  }
  return new Response('', { status: 404 });
}

const client = createR2PrivateRuntimeStorage({
  accountId,
  accessKeyId: 'synthetic-id',
  secretAccessKey: 'synthetic-secret',
  bucketId,
  maximumObjectBytes: 50,
  bucketCeilingBytes: 100,
  fetchImpl: fakeFetch,
  now: () => new Date('2026-09-26T00:00:00.000Z'),
  delayImpl: async () => {},
});
await client.ensurePrivateBucket();
assert.deepEqual(await client.bucketUsage(), { usedBytes: 0, objectCount: 0 });
assert.deepEqual(await client.uploadImmutable(objectPath, object), { created: true });
assert.equal((await client.download(objectPath)).equals(object), true);
assert.deepEqual(await client.uploadImmutable(objectPath, object),
  { created: false, alreadyExists: true });
assert.equal(await client.anonymousStatus(objectPath), 403);
assert.deepEqual(await client.bucketUsage(), {
  usedBytes: object.length, objectCount: 1,
});
assert.equal(calls.some(call => call.method === 'GET'
  && call.headers.get('range') === 'bytes=0-0'
  && !call.headers.has('authorization')), true);
await assert.rejects(client.uploadImmutable('../escape', object), /object path is invalid/);
await assert.rejects(client.uploadImmutable(objectPath, Buffer.alloc(51)), /object bound/);
await client.removeExact(objectPath);
assert.deepEqual(await client.bucketUsage(), { usedBytes: 0, objectCount: 0 });

const fullBucketClient = createR2PrivateRuntimeStorage({
  accountId,
  accessKeyId: 'synthetic-id',
  secretAccessKey: 'synthetic-secret',
  bucketId,
  maximumObjectBytes: 50,
  bucketCeilingBytes: 50,
  fetchImpl: async (url, options) => {
    if (options.method === 'HEAD') return new Response(null, { status: 404 });
    if (options.method === 'GET' && new URL(url).searchParams.has('list-type')) {
      return new Response('<?xml version="1.0"?><ListBucketResult>'
        + '<Contents><Key>existing</Key><Size>49</Size></Contents>'
        + '<KeyCount>1</KeyCount><IsTruncated>false</IsTruncated></ListBucketResult>');
    }
    throw new Error('a full bucket must not reach the upload');
  },
  now: () => new Date('2026-09-26T00:00:00.000Z'),
});
await assert.rejects(fullBucketClient.uploadImmutable(objectPath, object), /safety ceiling/);

let interruptedReadCount = 0;
const interruptedClient = createR2PrivateRuntimeStorage({
  accountId,
  accessKeyId: 'synthetic-id',
  secretAccessKey: 'synthetic-secret',
  bucketId,
  maximumObjectBytes: 50,
  bucketCeilingBytes: 100,
  fetchImpl: async () => {
    interruptedReadCount += 1;
    if (interruptedReadCount === 1) {
      return new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1]));
          controller.error(new Error('synthetic interrupted R2 body'));
        },
      }), { status: 200 });
    }
    return new Response(object, { status: 200 });
  },
  now: () => new Date('2026-09-26T00:00:00.000Z'),
  delayImpl: async () => {},
});
assert.equal((await interruptedClient.download(objectPath)).equals(object), true);
assert.equal(interruptedReadCount, 2);
console.log('Private EU R2 object, immutability, anonymous denial and quota ceiling: passed.');
