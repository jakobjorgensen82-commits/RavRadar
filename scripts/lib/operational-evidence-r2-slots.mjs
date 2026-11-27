// Six operational-evidence slots and one weather archive reservation record.
// The conditional transports have fixed keys and expose no delete or mutation retry.
import crypto from 'node:crypto';
import { createR2PrivateRuntimeStorage } from './r2-private-runtime-storage.mjs';
import { PROTECTED_PRIVATE_RUNTIME_POLICY } from '../protected-private-production-runtime.mjs';
import { RETIREMENT_MARKER_BYTES } from './private-weather-runtime-retirement.mjs';

export const OPERATIONAL_EVIDENCE_SLOT_LIMIT = 6;
export const OPERATIONAL_EVIDENCE_SLOT_BYTES = 10 * 1024 * 1024 + 16 * 1024;
const digest = body => crypto.createHash('sha256').update(body).digest('hex');
const hmac = (key, body) => crypto.createHmac('sha256', key).update(body).digest();
const validEtag = value => typeof value === 'string' && /^"[a-zA-Z0-9-]{1,128}"$/.test(value);

function fixedR2ConditionalObject({
  accountId, accessKeyId, secretAccessKey, fetchImpl, now, objectPath, maximumBytes,
}) {
  const host = `${accountId}.eu.r2.cloudflarestorage.com`;
  async function request(method, object, body = null, etag = undefined) {
    const pathname = objectPath(object), stamp = now().toISOString().replace(/[:-]|\.[0-9]{3}/g, ''), day = stamp.slice(0, 8);
    const headers = { host, 'x-amz-date': stamp, 'x-amz-content-sha256': digest(body ?? Buffer.alloc(0)) };
    if (method === 'PUT') {
      headers['content-type'] = 'application/octet-stream';
      if (etag === null) headers['if-none-match'] = '*';
      else {
        if (!validEtag(etag)) throw new Error('OPERATIONAL_SLOT_ETAG_INVALID');
        headers['if-match'] = etag;
      }
    }
    const names = Object.keys(headers).sort(), signed = names.join(';');
    const canonical = [method, pathname, '', names.map(name => `${name}:${headers[name]}\n`).join(''), signed,
      headers['x-amz-content-sha256']].join('\n');
    const scope = `${day}/auto/s3/aws4_request`;
    const key = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, day), 'auto'), 's3'), 'aws4_request');
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${crypto.createHmac('sha256', key).update(['AWS4-HMAC-SHA256', stamp, scope, digest(canonical)].join('\n')).digest('hex')}`;
    return fetchImpl(`https://${host}${pathname}`, { method, headers, body: body ?? undefined, redirect: 'manual' });
  }
  async function read(object) {
    const response = await request('GET', object);
    if (response.status === 404) { await response.body?.cancel?.(); return null; }
    if (response.status !== 200) { await response.body?.cancel?.(); throw new Error('OPERATIONAL_SLOT_READ_REFUSED'); }
    const etag = response.headers.get('etag'), declared = response.headers.get('content-length');
    if (!validEtag(etag) || (declared !== null && (!/^[1-9][0-9]*$/.test(declared)
      || Number(declared) > maximumBytes))) {
      await response.body?.cancel?.(); throw new Error('OPERATIONAL_SLOT_HEADERS_INVALID');
    }
    if (!response.body?.getReader) throw new Error('OPERATIONAL_SLOT_STREAM_REQUIRED');
    const reader = response.body.getReader(), chunks = []; let length = 0;
    try {
      for (;;) {
        const next = await reader.read(); if (next.done) break;
        length += next.value.byteLength;
        if (length > maximumBytes) { await reader.cancel(); throw new Error('OPERATIONAL_SLOT_BYTE_BOUND'); }
        chunks.push(Buffer.from(next.value));
      }
    } finally { reader.releaseLock(); }
    if (length === 0 || (declared !== null && length !== Number(declared))) throw new Error('OPERATIONAL_SLOT_LENGTH_INVALID');
    return { etag, bytes: Buffer.concat(chunks, length) };
  }
  async function compareAndSwap(object, bytes, etag) {
    if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > maximumBytes)
      throw new Error('OPERATIONAL_SLOT_BYTE_BOUND');
    // The same key's condition is checked by R2 at commit. Keys are NEVER deleted,
    // so a late initial If-None-Match cannot resurrect a retired generation.
    const response = await request('PUT', object, bytes, etag);
    await response.body?.cancel?.();
    if (![200, 201, 204].includes(response.status)) throw new Error(response.status === 412
      ? 'OPERATIONAL_SLOT_CAS_LOST' : 'OPERATIONAL_SLOT_WRITE_UNKNOWN');
  }
  return { read, compareAndSwap };
}

// DEC-0255: internal, weather-only transport budget. No environment/CLI override.
export const PRIVATE_WEATHER_PUBLICATION_POLICY = Object.freeze({
  bucketCeilingBytes: 2_500_000_000,
  reserveBytes: 100_000_000,
});
export const PRIVATE_WEATHER_UPLOAD_RESERVATION_BYTES = 16_384;

const ARCHIVE_PART_PATH = /^bundles\/sha256\/([0-9a-f]{64})(?:\.json\.gz|\/part-[0-9]{3}-([0-9a-f]{64})\.json\.gz\.part)$/;
// The same private key can contain the original pending-only journal.
export const RESERVED_ARCHIVE_UPLOAD_KIND = 'RAVRADAR_PRIVATE_WEATHER_ARCHIVE_UPLOAD_V1';
export const ARCHIVE_UPLOAD_JOURNAL_KIND = 'RAVRADAR_PRIVATE_WEATHER_ARCHIVE_UPLOAD_V2';
export const RESERVED_ARCHIVE_UPLOAD_MAXIMUM_ENTRIES = 16;
// Keep the unknown-byte bound within one weather generation, including the journal.
export const RESERVED_ARCHIVE_UPLOAD_MAXIMUM_BYTES = PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes
  - PRIVATE_WEATHER_UPLOAD_RESERVATION_BYTES;
export const privateWeatherArchivePartSha = objectPath => {
  const match = ARCHIVE_PART_PATH.exec(objectPath);
  return match?.[2] ?? match?.[1];
};
export const sumPrivateWeatherArchiveReservationBytes = objects => objects
  .reduce((total, object) => total + (object.status === 'present' ? 0 : object.bytes), 0);

const hash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);

export function decodePrivateWeatherArchiveReservation(bytes) {
  try {
    const text = bytes.toString('utf8');
    const record = JSON.parse(text);
    if (JSON.stringify(record) !== text || !/^[0-9a-f-]{36}$/.test(record.revision)) throw new Error();
    const legacy = record.kind === RESERVED_ARCHIVE_UPLOAD_KIND;
    if (legacy) {
      if (Object.keys(record).join(',') !== 'kind,revision,pending'
          || !Array.isArray(record.pending)) throw new Error();
    } else if (record.kind !== ARCHIVE_UPLOAD_JOURNAL_KIND
      || Object.keys(record).join(',') !== 'kind,revision,objects,intents') throw new Error();
    const objects = legacy ? record.pending : record.objects;
    const intents = legacy ? [] : record.intents;
    if (!Array.isArray(objects) || objects.length > RESERVED_ARCHIVE_UPLOAD_MAXIMUM_ENTRIES
        || !Array.isArray(intents) || intents.length > RESERVED_ARCHIVE_UPLOAD_MAXIMUM_ENTRIES) throw new Error();
    const paths = new Map();
    for (const part of objects) {
      if (!part || Object.keys(part).join(',') !== (legacy ? 'path,bytes' : 'path,bytes,status,created')
          || typeof part.path !== 'string' || !privateWeatherArchivePartSha(part.path) || paths.has(part.path)
          || !Number.isSafeInteger(part.bytes) || part.bytes < 1
          || part.bytes > PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveBytes) throw new Error();
      if (!legacy && (!['pending', 'present', 'deleting'].includes(part.status)
          || typeof part.created !== 'boolean' || (part.status === 'deleting' && !part.created)
          || (part.status === 'pending' && part.created))) throw new Error();
      paths.set(part.path, legacy ? { ...part, status: 'pending', created: false } : part);
    }
    const afterHashes = new Set();
    for (const intent of intents) {
      if (!intent || Object.keys(intent).join(',') !== 'beforeVersion,beforeSha256,previousSha256,afterSha256,paths,successorSha256'
          || !Number.isSafeInteger(intent.beforeVersion) || intent.beforeVersion < 0
          || intent.beforeVersion === Number.MAX_SAFE_INTEGER
          || ![intent.beforeSha256, intent.previousSha256, intent.afterSha256].every(hash)
          || afterHashes.has(intent.afterSha256)
          || !Array.isArray(intent.paths) || intent.paths.length < 1
          || intent.paths.length > PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveObjectCount
          || new Set(intent.paths).size !== intent.paths.length
          || intent.paths.some(objectPath => paths.get(objectPath)?.status !== 'present')
          || (intent.successorSha256 !== null && (!hash(intent.successorSha256)
            || intent.successorSha256 === intent.afterSha256))) throw new Error();
      afterHashes.add(intent.afterSha256);
    }
    const normalized = [...paths.values()];
    if (sumPrivateWeatherArchiveReservationBytes(normalized) > RESERVED_ARCHIVE_UPLOAD_MAXIMUM_BYTES) throw new Error();
    return { objects: normalized, intents };
  } catch {
    const code = 'PRIVATE_WEATHER_UPLOAD_RESERVATION_INVALID';
    throw Object.assign(new Error(code), { code });
  }
}

export async function readPrivateWeatherArchiveUploadReservationBytes(record) {
  const found = await record.read();
  return found ? sumPrivateWeatherArchiveReservationBytes(decodePrivateWeatherArchiveReservation(found.bytes).objects) : 0;
}

export function createPrivateWeatherUploadReservationR2({
  accountId = process.env.RAVRADAR_R2_ACCOUNT_ID,
  accessKeyId = process.env.RAVRADAR_R2_ACCESS_KEY_ID,
  secretAccessKey = process.env.RAVRADAR_R2_SECRET_ACCESS_KEY,
  fetchImpl = globalThis.fetch, now = () => new Date(),
} = {}) {
  const bucketId = PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId;
  // Keep the same EU account, credential and argument validation as the archive writer.
  createR2PrivateRuntimeStorage({ accountId, accessKeyId, secretAccessKey, fetchImpl, now,
    bucketId, maximumObjectBytes: PRIVATE_WEATHER_UPLOAD_RESERVATION_BYTES });
  const record = fixedR2ConditionalObject({
    accountId, accessKeyId, secretAccessKey, fetchImpl, now,
    objectPath: () => `/${bucketId}/operational-evidence/weather-archive-upload/v1.json`,
    maximumBytes: PRIVATE_WEATHER_UPLOAD_RESERVATION_BYTES,
  });
  return { read: () => record.read(), compareAndSwap: (bytes, etag) => record.compareAndSwap(undefined, bytes, etag) };
}

export function createOperationalEvidenceR2Slots({
  accountId = process.env.RAVRADAR_R2_ACCOUNT_ID,
  accessKeyId = process.env.RAVRADAR_R2_ACCESS_KEY_ID,
  secretAccessKey = process.env.RAVRADAR_R2_SECRET_ACCESS_KEY,
  bucketId, fetchImpl = globalThis.fetch, now = () => new Date(),
  delayImpl = ms => new Promise(resolve => setTimeout(resolve, ms)),
} = {}) {
  // Reuse the normal credential/bucket admission and whole-bucket safety bound.
  // Its model-bound implementation is unchanged. Its immutable PUT is never used.
  const normal = createR2PrivateRuntimeStorage({ accountId, accessKeyId, secretAccessKey,
    bucketId, fetchImpl, now, delayImpl, maximumObjectBytes: OPERATIONAL_EVIDENCE_SLOT_BYTES,
    bucketCeilingBytes: PRIVATE_WEATHER_PUBLICATION_POLICY.bucketCeilingBytes - PRIVATE_WEATHER_PUBLICATION_POLICY.reserveBytes });
  const transport = fixedR2ConditionalObject({
    accountId, accessKeyId, secretAccessKey, fetchImpl, now, maximumBytes: OPERATIONAL_EVIDENCE_SLOT_BYTES,
    objectPath(slot) {
      if (!Number.isInteger(slot) || slot < 1 || slot > OPERATIONAL_EVIDENCE_SLOT_LIMIT)
        throw new Error('OPERATIONAL_SLOT_ID_INVALID');
      return `/${bucketId}/operational-evidence/slots/v3/slot-${slot}.bin`;
    },
  });
  const read = async slot => {
    const found = await transport.read(slot);
    return found === null ? null : { slot, ...found };
  };
  const reservation = createPrivateWeatherUploadReservationR2({ accountId, accessKeyId, secretAccessKey, fetchImpl, now });
  return Object.freeze({ read, compareAndSwap: transport.compareAndSwap, ensurePrivateBucket: normal.ensurePrivateBucket,
    bucketUsage: normal.bucketUsage,
    archiveUploadReservationBytes: () => readPrivateWeatherArchiveUploadReservationBytes(reservation),
    // Preserve the normal next-generation admission, including its marker.
    maximumBucketBytes: PRIVATE_WEATHER_PUBLICATION_POLICY.bucketCeilingBytes - PRIVATE_WEATHER_PUBLICATION_POLICY.reserveBytes
      - PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes - RETIREMENT_MARKER_BYTES
      - PRIVATE_WEATHER_UPLOAD_RESERVATION_BYTES });
}
