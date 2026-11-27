// Six operational-evidence slots and one weather archive reservation record.
// The conditional transports have fixed keys and expose no delete or mutation retry.
import crypto from 'node:crypto';
import { createR2PrivateRuntimeStorage } from './r2-private-runtime-storage.mjs';
import { PRIVATE_WEATHER_PUBLICATION_POLICY, readPrivateWeatherArchiveUploadReservationBytes }
  from '../publish-private-weather-runtime.mjs';
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

export const PRIVATE_WEATHER_UPLOAD_RESERVATION_BYTES = 16_384;

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
