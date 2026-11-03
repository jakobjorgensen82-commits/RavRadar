import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { constants as zlibConstants, gzipSync } from 'node:zlib';
import { Gunzip } from '../js/services/vendor/fflate-0.8.2/browser.js';
import { PUBLIC_JSON_ENVELOPE_KIND, decodePublicJsonTransport } from '../js/services/public-json-transport.js';

const HARD = 16 * 1024 * 1024;
const NativeDecompressionStream = globalThis.DecompressionStream;
const decoderDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'DecompressionStream');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const utf8 = value => Buffer.from(JSON.stringify(value), 'utf8');
const value = { schemaVersion: 3, datasetId: 'synthetic-public-transport-only', zones: [
  { id: 'synthetic', hours: [{ at: '2030-01-01T00:00:00Z', available: false }] },
], text: 'Dansk æøå, Deutsch Küste, English coast 🟠' };

function envelope(bytes, compressed = gzipSync(bytes)) {
  return { schemaVersion: 1, kind: PUBLIC_JSON_ENVELOPE_KIND, encoding: 'gzip-base64',
    decodedBytes: bytes.byteLength, decodedSha256: hash(bytes),
    compressedBytes: compressed.byteLength, compressedSha256: hash(compressed),
    dataBase64: Buffer.from(compressed).toString('base64') };
}
function replaceCompressed(document, bytes) {
  return { ...document, compressedBytes: bytes.length, compressedSha256: hash(bytes),
    dataBase64: Buffer.from(bytes).toString('base64') };
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function withOptionalHeader(compressed, nameLength = 5) {
  const first = Buffer.from(compressed.subarray(0, 10));
  first[3] = 4 | 8 | 16 | 2;
  const header = Buffer.concat([first, Buffer.from([3, 0, 1, 2, 3]),
    Buffer.from('n'.repeat(nameLength) + '\0comment\0')]);
  const crc = Buffer.alloc(2);
  crc.writeUInt16LE(crc32(header) & 0xffff);
  return Buffer.concat([header, crc, compressed.subarray(10)]);
}
function selectBackend(backend) {
  Object.defineProperty(globalThis, 'DecompressionStream', {
    configurable: true, writable: true, value: backend === 'native' ? NativeDecompressionStream : undefined,
  });
}
async function rejects(document, pattern = /^PUBLIC_JSON_/, options) {
  await assert.rejects(decodePublicJsonTransport(document, options), error =>
    error instanceof Error && pattern.test(error.message));
}

test('public JSON transport: native and pinned local fallback, no network', async t => {
  assert.match(process.versions.node, /^(?:22|24)\./, 'normal Node22 or Node24 is required');
  for (const [name, value] of Object.entries({ DecompressionStream: NativeDecompressionStream,
    Blob: globalThis.Blob, ReadableStream: globalThis.ReadableStream, WritableStream: globalThis.WritableStream,
    TextEncoder: globalThis.TextEncoder, TextDecoder: globalThis.TextDecoder })) {
    assert.equal(typeof value, 'function', 'normal native API is required: ' + name);
  }
  assert.equal(typeof globalThis.crypto?.subtle?.digest, 'function', 'native WebCrypto SHA-256 is required');
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  let fetchCalls = 0;
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true,
    value: () => { fetchCalls++; throw new Error('network forbidden in synthetic codec tests'); } });
  try {
    const good = envelope(utf8(value));
    await t.test('raw values keep exact identity and are left for normal semantic validators', async () => {
      for (const raw of [value, null, 1, 'text', [], { kind: 'some-other-format' }]) {
        const result = await decodePublicJsonTransport(raw);
        assert.strictEqual(result.value, raw);
        assert.deepEqual({ decodedBytes: result.decodedBytes, encoded: result.encoded },
          { decodedBytes: null, encoded: false });
      }
    });
    for (const backend of ['native', 'fallback']) {
      await t.test(backend, async sub => {
        selectBackend(backend);
        await sub.test('whole output and UTF-8 byte-count parity', async () => {
          assert.deepEqual(await decodePublicJsonTransport(good),
            { value, decodedBytes: utf8(value).byteLength, encoded: true });
          for (const primitive of [null, 42, 'æøå', [1, 2, 3]]) {
            assert.deepEqual((await decodePublicJsonTransport(envelope(utf8(primitive)))).value, primitive);
          }
        });
        await sub.test('stored, fixed and dynamic DEFLATE across64B and65535B block boundaries', async () => {
          let seed = 123456789;
          const text = Array.from({ length: 65540 }, () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return String.fromCharCode(32 + seed % 95);
          }).join('');
          for (const size of [0, 1, 31, 63, 64, 65, 1024, 65534, 65535, 65536]) {
            const fixture = { size, text: text.slice(0, size) };
            const bytes = utf8(fixture);
            for (const options of [{ level: 0 }, { level: 1 }, { level: 6 }, { level: 9 },
              { level: 6, strategy: zlibConstants.Z_FIXED }]) {
              const item = envelope(bytes, gzipSync(bytes, options));
              const result = await decodePublicJsonTransport(item);
              assert.deepEqual(result, { value: fixture, decodedBytes: bytes.length, encoded: true });
            }
          }
        });
        await sub.test('all optional gzip headers and long filename remain valid', async () => {
          const original = Buffer.from(good.dataBase64, 'base64');
          for (const size of [5, 100000]) {
            const changed = withOptionalHeader(original, size);
            assert.deepEqual((await decodePublicJsonTransport(replaceCompressed(good, changed))).value, value);
          }
        });
        await sub.test('exact envelope keys, types and hard bounds', async () => {
          const missing = { ...good }; delete missing.encoding;
          const symbol = { ...good, [Symbol('unexpected')]: 1 };
          for (const changed of [missing, symbol, { ...good, unexpected: true },
            { ...good, schemaVersion: '1' }, { ...good, encoding: 'gzip' },
            { ...good, decodedBytes: '1' }, { ...good, compressedBytes: '1' },
            { ...good, decodedBytes: 1.5 }, { ...good, compressedBytes: 1.5 },
            { ...good, decodedBytes: 0 }, { ...good, compressedBytes: 0 },
            { ...good, decodedBytes: HARD + 1 }, { ...good, compressedBytes: HARD + 1 },
            { ...good, decodedSha256: good.decodedSha256.toUpperCase() },
            { ...good, compressedSha256: null }]) await rejects(changed, /^PUBLIC_JSON_ENVELOPE_INVALID$/);
          for (const key of ['maxDecodedBytes', 'maxCompressedBytes']) {
            for (const bad of [0, -1, 1.5, '10', NaN, Infinity, HARD + 1]) {
              await rejects(good, /^PUBLIC_JSON_LIMIT_INVALID$/, { [key]: bad });
            }
          }
          await rejects(good, /^PUBLIC_JSON_ENVELOPE_INVALID$/, { maxDecodedBytes: good.decodedBytes - 1 });
          await rejects(good, /^PUBLIC_JSON_ENVELOPE_INVALID$/, { maxCompressedBytes: good.compressedBytes - 1 });
          assert.deepEqual((await decodePublicJsonTransport(good, {
            maxDecodedBytes: good.decodedBytes, maxCompressedBytes: good.compressedBytes,
          })).value, value);
        });
        await sub.test('base64 length, alphabet, whitespace and canonical pad bits', async () => {
          for (const dataBase64 of [null, '', good.dataBase64 + '\n',
            '?' + good.dataBase64.slice(1), '-' + good.dataBase64.slice(1),
            good.dataBase64.slice(1)]) await rejects({ ...good, dataBase64 }, /^PUBLIC_JSON_BASE64_/);
          for (const remainder of [1, 2]) {
            let padded;
            for (let size = 1; size < 100; size++) {
              const item = envelope(utf8('p'.repeat(size)));
              if (item.compressedBytes % 3 === remainder) { padded = item; break; }
            }
            assert.ok(padded);
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
            const last = padded.dataBase64.length - (remainder === 1 ? 3 : 2);
            const digit = alphabet.indexOf(padded.dataBase64[last]);
            const changed = padded.dataBase64.slice(0, last) + alphabet[digit ^ 1]
              + padded.dataBase64.slice(last + 1);
            assert.deepEqual(Buffer.from(changed, 'base64'), Buffer.from(padded.dataBase64, 'base64'));
            await rejects({ ...padded, dataBase64: changed }, /^PUBLIC_JSON_BASE64_NONCANONICAL$/);
          }
        });
        await sub.test('compressed and decoded SHA are separately enforced', async () => {
          const bytes = Buffer.from(good.dataBase64, 'base64');
          bytes[10] ^= 1;
          await rejects({ ...good, dataBase64: bytes.toString('base64') }, /^PUBLIC_JSON_COMPRESSED_SHA_MISMATCH$/);
          await rejects({ ...good, decodedSha256: '0'.repeat(64) }, /^PUBLIC_JSON_DECODED_SHA_MISMATCH$/);
        });
        await sub.test('CRC32 footer tamper is rejected even with an authentic new compressed SHA', async () => {
          const bytes = Buffer.from(good.dataBase64, 'base64');
          bytes[bytes.length - 8] ^= 1;
          await rejects(replaceCompressed(good, bytes), /^PUBLIC_JSON_GZIP_/);
        });
        await sub.test('stored-block LEN/NLEN complement is validated in both backends', async () => {
          const raw = utf8({ stored: true });
          const bytes = gzipSync(raw, { level: 0 });
          assert.equal(bytes[10] & 6, 0, 'this fixture starts with a stored block');
          bytes[13] ^= 1;
          await rejects(envelope(raw, bytes), /^PUBLIC_JSON_GZIP_INVALID$/);
        });
        await sub.test('ISIZE and declared size mismatch are rejected', async () => {
          const bytes = Buffer.from(good.dataBase64, 'base64');
          bytes.writeUInt32LE(good.decodedBytes + 1, bytes.length - 4);
          await rejects(replaceCompressed(good, bytes), /^PUBLIC_JSON_GZIP_ISIZE_MISMATCH$/);
          await rejects({ ...good, decodedBytes: good.decodedBytes + 1 }, /^PUBLIC_JSON_GZIP_ISIZE_MISMATCH$/);
          await rejects({ ...good, compressedBytes: good.compressedBytes + 1 }, /^PUBLIC_JSON_BASE64_/);
        });
        await sub.test('truncated, damaged, trailing and malformed gzip are rejected', async () => {
          const original = Buffer.from(good.dataBase64, 'base64');
          const badMagic = Buffer.from(original); badMagic[0] = 0;
          const badMethod = Buffer.from(original); badMethod[2] = 7;
          const badFlags = Buffer.from(original); badFlags[3] = 0xe0;
          const bodyCut = Buffer.concat([original.subarray(0, original.length - 9), original.subarray(-8)]);
          const bodyDamage = Buffer.from(original); bodyDamage[10] ^= 0xff;
          const unterminatedHeader = Buffer.from(original); unterminatedHeader[3] = 8;
          unterminatedHeader.fill(65, 10, unterminatedHeader.length - 8);
          const variants = { truncatedFooter: original.subarray(0, -1), shortHeader: original.subarray(0, 10),
            badMagic, badMethod, badFlags, bodyCut, bodyDamage, unterminatedHeader,
            trailing: Buffer.concat([original, Buffer.from([1, 2, 3, 4])]) };
          for (const [label, bytes] of Object.entries(variants)) {
            try { await rejects(replaceCompressed(good, bytes), /^PUBLIC_JSON_(?:GZIP_|DECODED_)/); }
            catch (error) { throw new Error('gzip rejection case: ' + label, { cause: error }); }
          }
          const optional = withOptionalHeader(original);
          optional[10] ^= 1;
          await rejects(replaceCompressed(good, optional), /^PUBLIC_JSON_GZIP_HEADER_CRC_MISMATCH$/);
        });
        await sub.test('fatal UTF-8 and invalid JSON cannot become a value', async () => {
          await rejects(envelope(Buffer.from([0xc3, 0x28])), /^PUBLIC_JSON_UTF8_OR_JSON_INVALID$/);
          await rejects(envelope(Buffer.from('{not-json}', 'utf8')), /^PUBLIC_JSON_UTF8_OR_JSON_INVALID$/);
        });
        await sub.test('known envelope is rejected at root or deeper in decoded JSON', async () => {
          for (const nested of [good, { nested: [{ envelope: good }] }]) {
            await rejects(envelope(utf8(nested)), /^PUBLIC_JSON_NESTED_ENVELOPE$/);
          }
        });
        await sub.test('concatenated gzip members are rejected on every supported native runtime', async () => {
          const empty = gzipSync(Buffer.alloc(0));
          const last = Buffer.from(good.dataBase64, 'base64');
          const combined = Buffer.concat([empty, last]);
          await rejects(replaceCompressed(good, combined), /^PUBLIC_JSON_GZIP_/);
          const tampered = Buffer.from(combined); tampered[empty.length - 8] ^= 1;
          await rejects(replaceCompressed(good, tampered), /^PUBLIC_JSON_GZIP_/);
        });
        await sub.test('zip bomb cannot exceed its declared decoded allocation', async () => {
          const inflated = Buffer.alloc(2 * 1024 * 1024, 88);
          const document = envelope(inflated);
          const compressed = Buffer.from(document.dataBase64, 'base64');
          compressed.writeUInt32LE(64, compressed.length - 4);
          const bomb = { ...replaceCompressed(document, compressed), decodedBytes: 64 };
          await rejects(bomb, /^PUBLIC_JSON_(?:DECODED_LIMIT_EXCEEDED|GZIP_INVALID)$/);
        });
      });
    }
    await t.test('single-member framing is enforced even when native accepts concatenated gzip', async () => {
      let successfulNativeFlushes = 0;
      globalThis.DecompressionStream = class {
        constructor() {
          return new TransformStream({
            transform() {},
            flush(controller) { successfulNativeFlushes++; controller.enqueue(utf8(value)); },
          });
        }
      };
      const empty = gzipSync(Buffer.alloc(0));
      const combined = Buffer.concat([empty, Buffer.from(good.dataBase64, 'base64')]);
      await rejects(replaceCompressed(good, combined), /^PUBLIC_JSON_GZIP_/);
      assert.equal(successfulNativeFlushes, 1, 'The native path itself succeeded; the explicit framing guard rejects its multi-member input');
    });
    await t.test('fallback stops after bounded small input pushes on first overrun', async () => {
      selectBackend('fallback');
      const inflated = Buffer.alloc(2 * 1024 * 1024, 88);
      const item = envelope(inflated);
      const compressed = Buffer.from(item.dataBase64, 'base64');
      compressed.writeUInt32LE(64, compressed.length - 4);
      const bomb = { ...replaceCompressed(item, compressed), decodedBytes: 64 };
      const originalPush = Gunzip.prototype.push;
      const seen = new WeakSet();
      const pushes = [];
      let largestOutput = 0;
      Gunzip.prototype.push = function (chunk, final) {
        pushes.push(chunk.length);
        if (!seen.has(this)) {
          seen.add(this);
          const callback = this.ondata;
          this.ondata = (data, done) => { largestOutput = Math.max(largestOutput, data.length); callback(data, done); };
        }
        return originalPush.call(this, chunk, final);
      };
      try { await rejects(bomb, /^PUBLIC_JSON_DECODED_LIMIT_EXCEEDED$/); }
      finally { Gunzip.prototype.push = originalPush; }
      assert.ok(pushes.length < Math.ceil(compressed.length / 64), 'must stop before processing the remaining compressed input');
      assert.ok(pushes.every(size => size <= 64), 'all pushes in this ordinary-header bomb are at most64B');
      assert.ok(largestOutput <= 128 * 1024, 'one64B input push cannot allocate the whole2MiB decoded bomb');
      console.log(JSON.stringify({ fallbackBombCompressedBytes: compressed.length, inputPushes: pushes,
        largestOutputChunkBytes: largestOutput, declaredDecodedBytes: 64 }));
    });
    await t.test('native availability selects native and never retries its errors in fallback', async () => {
      const originalPush = Gunzip.prototype.push;
      let fallbackCalls = 0;
      Gunzip.prototype.push = function (...args) { fallbackCalls++; return originalPush.apply(this, args); };
      let nativeCalls = 0;
      globalThis.DecompressionStream = class {
        constructor(format) { nativeCalls++; return new NativeDecompressionStream(format); }
      };
      try {
        assert.deepEqual((await decodePublicJsonTransport(good)).value, value);
        assert.ok(fallbackCalls > 0, 'Successful native output still needs the pinned single-member framing proof');
        fallbackCalls = 0; // From here, every native failure must produce zero validation/fallback pushes.
        const compressed = Buffer.from(good.dataBase64, 'base64');
        compressed[compressed.length - 8] ^= 1;
        await rejects(replaceCompressed(good, compressed), /^PUBLIC_JSON_GZIP_INVALID$/);
        assert.equal(nativeCalls, 2);
        assert.equal(fallbackCalls, 0);
        globalThis.DecompressionStream = class { constructor() { throw new Error('synthetic native constructor failure'); } };
        await rejects(good, /^PUBLIC_JSON_GZIP_INVALID$/);
        assert.equal(fallbackCalls, 0);
      } finally { Gunzip.prototype.push = originalPush; }
    });
    await t.test('native output overrun cancels and releases its owned reader', async () => {
      let canceled = false;
      let ownedReadable;
      globalThis.DecompressionStream = class {
        constructor() {
          ownedReadable = this.readable = new ReadableStream({
            start(controller) { controller.enqueue(new Uint8Array(good.decodedBytes + 1)); },
            cancel() { canceled = true; },
          });
          this.writable = new WritableStream({ write() {}, close() {} });
        }
      };
      await rejects(good, /^PUBLIC_JSON_DECODED_LIMIT_EXCEEDED$/);
      assert.equal(canceled, true);
      assert.equal(ownedReadable.locked, false);
    });
    await t.test('validated size and digest primitives remain fixed across async hashing', async () => {
      selectBackend('fallback');
      const document = { ...good };
      const subtle = globalThis.crypto.subtle;
      const ownDigest = Object.getOwnPropertyDescriptor(subtle, 'digest');
      const originalDigest = subtle.digest;
      let calls = 0;
      Object.defineProperty(subtle, 'digest', { configurable: true, value(...args) {
        if (calls++ === 0) Object.assign(document, { decodedBytes: HARD + 1, compressedBytes: HARD + 1,
          decodedSha256: '0'.repeat(64), compressedSha256: '0'.repeat(64), dataBase64: '' });
        return originalDigest.apply(this, args);
      } });
      try {
        assert.deepEqual(await decodePublicJsonTransport(document),
          { value, decodedBytes: good.decodedBytes, encoded: true });
      } finally {
        if (ownDigest) Object.defineProperty(subtle, 'digest', ownDigest);
        else delete subtle.digest;
      }
    });
    assert.equal(fetchCalls, 0);
    console.log(JSON.stringify({ node: process.version, nativeAndFallback: true, fetchCalls,
      providerCalls: 0, syntheticOnly: true }));
  } finally {
    if (decoderDescriptor) Object.defineProperty(globalThis, 'DecompressionStream', decoderDescriptor);
    else delete globalThis.DecompressionStream;
    if (originalFetch) Object.defineProperty(globalThis, 'fetch', originalFetch);
    else delete globalThis.fetch;
  }
});

