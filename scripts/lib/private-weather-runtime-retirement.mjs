import crypto from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createR2PrivateRuntimeStorage } from './r2-private-runtime-storage.mjs';
import { canonicalPrivateRuntimeJson } from '../private-production-runtime-bundle.mjs';
import {
  PROTECTED_PRIVATE_RUNTIME_POLICY as runtime,
  validateProtectedPrivateRuntimePointer,
} from '../protected-private-production-runtime.mjs';

export const RETIREMENT_MARKER_BYTES = 16_384;
const KIND = 'RAVRADAR_PRIVATE_RUNTIME_RETIREMENT_V1';
const fail = code => {
  throw Object.assign(new Error(code), { code });
};
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = canonicalPrivateRuntimeJson;
const same = (left, right) => canonical(left) === canonical(right);
const reference = descriptor => Date.parse(descriptor.productionReferenceAt);
const parts = descriptor => descriptor?.objects ?? (descriptor ? [descriptor] : []);
const markKey = version => 'bundles/sha256/' + digest(KIND + ':' + version) + '.json.gz';

export function decodePrivateWeatherPointerRow(rows) {
  if (Array.isArray(rows) && rows.length === 0) return null;
  const row = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
  const version = Number(row?.version);
  if (row?.document_key !== runtime.documentKey || !Number.isSafeInteger(version)
      || version < 1 || version === Number.MAX_SAFE_INTEGER) {
    fail('PRIVATE_WEATHER_PUBLICATION_RETIREMENT_POINTER');
  }
  return {
    version,
    payload: validateProtectedPrivateRuntimePointer(row.payload, { allowHistoricalCurrentModelBinding: true }),
  };
}

export function assertRetirementReference(before, successorReference) {
  if (before?.payload.previous && reference(before.payload.previous) >= successorReference) {
    fail('PRIVATE_WEATHER_PUBLICATION_WAIT_FOR_LATER_REFERENCE');
  }
}

export function createPrivateWeatherRetirement(storageOptions, bucketCeilingBytes) {
  const secret = storageOptions?.secretAccessKey ?? process.env.RAVRADAR_R2_SECRET_ACCESS_KEY;
  const fetchImpl = storageOptions?.fetchImpl ?? globalThis.fetch;
  function adapter(maximumObjectBytes, fetchBound = fetchImpl) {
    return createR2PrivateRuntimeStorage({
      ...storageOptions, bucketId: runtime.bucketId, bucketCeilingBytes, maximumObjectBytes, fetchImpl: fetchBound,
    });
  }
  const small = adapter(RETIREMENT_MARKER_BYTES);
  const mac = body => crypto.createHmac('sha256', secret).update(KIND + '\0').update(canonical(body)).digest();
  async function readObject(key, limit, metadataOnly = false) {
    let status;
    let length;
    const reader = adapter(limit, async (url, request) => {
      const response = await fetchImpl(url, request);
      status = response.status;
      if (metadataOnly && response.ok) {
        const value = response.headers.get('content-length');
        length = value && /^\d+$/.test(value) ? Number(value) : null;
        await response.body?.cancel?.().catch(() => {});
        return new Response(null, { status: 204 });
      }
      return response;
    });
    try {
      const data = await reader.download(key);
      return metadataOnly ? { length } : data;
    } catch (error) {
      if (status === 404) return null;
      // The synthetic empty body above deliberately stops the ordinary
      // download before reading any archive bytes. Preserve only real status.
      if (metadataOnly && status === 200) return { length };
      throw error;
    }
  }

  async function readMarker(version) {
    const data = await readObject(markKey(version), RETIREMENT_MARKER_BYTES);
    if (data === null) return null;
    let body;
    try {
      const text = gunzipSync(data, { maxOutputLength: RETIREMENT_MARKER_BYTES }).toString('utf8');
      const envelope = JSON.parse(text);
      body = envelope.body;
      if (text !== canonical(envelope) || Object.keys(envelope).sort().join(',') !== 'body,mac'
          || body.kind !== KIND || Object.keys(body).sort().join(',') !== 'before,kind'
          || !/^[0-9a-f]{64}$/.test(envelope.mac)
          || !crypto.timingSafeEqual(mac(body), Buffer.from(envelope.mac, 'hex'))
          || Object.keys(body.before).sort().join(',') !== 'payload,version'
          || body.before.version !== version - 1) throw new Error();
      const decoded = decodePrivateWeatherPointerRow([{ document_key: runtime.documentKey, ...body.before }]);
      if (!same(decoded, body.before)) throw new Error();
    } catch {
      fail('PRIVATE_WEATHER_PUBLICATION_RETIREMENT_MARKER');
    }
    return body;
  }

  async function prepare(before, next, capacity) {
    if (!same(next.previous, before.payload.current)) fail('PRIVATE_WEATHER_PUBLICATION_RETIREMENT_SUCCESSOR');
    assertRetirementReference(before, reference(next.current));
    const version = before.version + 1;
    const body = { kind: KIND, before };
    const existing = await readMarker(version);
    if (existing === null) {
      const text = canonical({ body, mac: mac(body).toString('hex') });
      if (Buffer.byteLength(text) > RETIREMENT_MARKER_BYTES) fail('PRIVATE_WEATHER_PUBLICATION_RETIREMENT_MARKER');
      const bytes = gzipSync(text);
      await capacity(bytes.length);
      await small.uploadImmutable(markKey(version), bytes);
    }
    if (!same(await readMarker(version), body)) fail('PRIVATE_WEATHER_PUBLICATION_RETIREMENT_MARKER');
  }

  async function settle(row, freshPointer) {
    if (!row) return;
    const marker = await readMarker(row.version);
    if (!marker) return;
    const { before } = marker;
    if (!same(row.payload.previous, before.payload.current)
        || reference(row.payload.current) < reference(before.payload.current)) {
      fail('PRIVATE_WEATHER_PUBLICATION_RETIREMENT_SUCCESSOR');
    }
    const { current, previous } = row.payload;
    assertRetirementReference(before, reference(current));
    const retained = new Set([...parts(current), ...parts(previous)].map(part => part.objectPath));
    const stillExact = async () => {
      if (!same(await freshPointer(), row)) fail('PRIVATE_WEATHER_PUBLICATION_RETIREMENT_POINTER_CHANGED');
    };
    for (const part of parts(before.payload.previous)) {
      if (retained.has(part.objectPath)) continue;
      await stillExact();
      const remote = await readObject(part.objectPath, 1, true);
      if (remote === null) continue;
      if (remote.length !== part.objectBytes) fail('PRIVATE_WEATHER_PUBLICATION_RETIREMENT_OBJECT');
      await small.removeExact(part.objectPath);
      if (await readObject(part.objectPath, 1, true) !== null) {
        fail('PRIVATE_WEATHER_PUBLICATION_RETIREMENT_DELETE_UNCONFIRMED');
      }
    }
    await stillExact();
    await small.removeExact(markKey(row.version));
    if (await readMarker(row.version) !== null) {
      fail('PRIVATE_WEATHER_PUBLICATION_RETIREMENT_DELETE_UNCONFIRMED');
    }
  }
  async function assertCodeOnlyAdmissionClear(before) {
    if (await readMarker(before.version)) {
      fail('PRIVATE_WEATHER_PUBLICATION_RETIREMENT_PENDING');
    }
    if (await readMarker(before.version + 1)) {
      fail('PRIVATE_WEATHER_PUBLICATION_PENDING_POINTER_ADVANCE');
    }
  }
  return { prepare, settle, assertCodeOnlyAdmissionClear };
}
