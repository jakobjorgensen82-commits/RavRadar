// Private, EU-jurisdiction R2 adapter for the immutable production-runtime
// archives. It uses Node's built-in crypto so an exact historical reader can
// run from a detached checkout without installing a different dependency set.
import crypto from 'node:crypto';

const OBJECT_PATH = /^bundles\/sha256\/[0-9a-f]{64}(?:\.json\.gz|\/part-[0-9]{3}-[0-9a-f]{64}\.json\.gz\.part)$/;
const ACCOUNT_ID = /^[0-9a-f]{32}$/;
const BUCKET_ID = /^[a-z0-9][a-z0-9-]{1,62}$/;
const MAX_LIST_PAGES = 10;
const MAX_LIST_BODY_BYTES = 2_000_000;
class R2BodyTransportError extends Error {}
// The bucket is dedicated to this pipeline. This is well below R2's 10 GB-
// month Standard free allowance, leaving room for other account usage. It is
// a local safety ceiling, not a Cloudflare account-wide spending cap.
export const R2_PRIVATE_RUNTIME_BUCKET_CEILING_BYTES = 2_000_000_000;
// Keep one maximum normal immutable part free beyond the entire pre-CAS peak.
// Pointer/S metadata live in protected documents, not this dedicated R2 bucket.
export const R2_PRIVATE_RUNTIME_PREFLIGHT_MARGIN_BYTES = 50_000_000;
export const R2_PRIVATE_RUNTIME_CAPACITY_DEADLINE_MS = 60_000;

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hmac = (key, value) => crypto.createHmac('sha256', key).update(value).digest();
const awsEncode = value => encodeURIComponent(value).replace(/[!'()*]/g,
  character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);

function safeObjectPath(value) {
  if (typeof value !== 'string' || !OBJECT_PATH.test(value)) {
    throw new Error('R2 private runtime object path is invalid');
  }
  return value;
}

function decodeXmlText(value) {
  return value.replace(/&(?:amp|lt|gt|quot|apos|#(?:x[0-9a-fA-F]+|[0-9]+));/g,
    entity => {
      const names = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
      if (names[entity]) return names[entity];
      const number = entity.startsWith('&#x')
        ? Number.parseInt(entity.slice(3, -1), 16)
        : Number.parseInt(entity.slice(2, -1), 10);
      if (!Number.isSafeInteger(number) || number < 0 || number > 0x10ffff) {
        throw new Error('R2 object listing has an invalid XML entity');
      }
      return String.fromCodePoint(number);
    });
}

function xmlField(xml, name) {
  const match = new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`).exec(xml);
  return match ? decodeXmlText(match[1]) : null;
}

function parseListing(xml) {
  if (typeof xml !== 'string' || xml.length > MAX_LIST_BODY_BYTES
    || !/<ListBucketResult(?:\s|>)/.test(xml)
    || !/<\/ListBucketResult>/.test(xml)) {
    throw new Error('R2 object listing is malformed or oversized');
  }
  const blocks = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)];
  const keyCount = xmlField(xml, 'KeyCount');
  if (keyCount !== null && Number(keyCount) !== blocks.length) {
    throw new Error('R2 object listing key count is inconsistent');
  }
  let bytes = 0;
  for (const [, block] of blocks) {
    const size = xmlField(block, 'Size');
    if (!/^(0|[1-9][0-9]*)$/.test(String(size))
      || !Number.isSafeInteger(Number(size))) {
      throw new Error('R2 object listing has an invalid size');
    }
    bytes += Number(size);
    if (!Number.isSafeInteger(bytes)) throw new Error('R2 object listing size overflow');
  }
  const truncated = xmlField(xml, 'IsTruncated');
  if (!['true', 'false'].includes(truncated)) {
    throw new Error('R2 object listing has no valid completion flag');
  }
  const nextToken = truncated === 'true' ? xmlField(xml, 'NextContinuationToken') : null;
  if (truncated === 'true' && !nextToken) {
    throw new Error('R2 object listing has no continuation token');
  }
  return { bytes, objectCount: blocks.length, nextToken };
}

function signedHeaders({ method, host, pathname, query, body, accessKeyId,
  secretAccessKey, date, extraHeaders }) {
  const stamp = date.toISOString().replace(/[:-]|\.[0-9]{3}/g, '');
  const day = stamp.slice(0, 8);
  const payloadHash = sha256(body ?? Buffer.alloc(0));
  const headers = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': stamp,
    ...extraHeaders,
  };
  const names = Object.keys(headers).sort();
  const canonicalHeaders = names.map(name => `${name}:${String(headers[name]).trim()}\n`).join('');
  const signedHeaderNames = names.join(';');
  const canonicalRequest = [method, pathname, query, canonicalHeaders,
    signedHeaderNames, payloadHash].join('\n');
  const scope = `${day}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', stamp, scope,
    sha256(canonicalRequest)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, day),
    'auto'), 's3'), 'aws4_request');
  const signature = crypto.createHmac('sha256', signingKey)
    .update(stringToSign).digest('hex');
  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaderNames}, Signature=${signature}`,
  };
}

async function readBoundedBody(response, limit) {
  const declared = response.headers?.get?.('content-length');
  if (declared !== null && declared !== undefined
    && (!/^(0|[1-9][0-9]*)$/.test(declared) || Number(declared) > limit)) {
    await response.body?.cancel?.().catch(() => {});
    throw new Error('R2 private runtime response exceeds its byte bound');
  }
  const chunks = [];
  let total = 0;
  if (!response.body?.getReader) {
    throw new Error('R2 private runtime response has no bounded stream');
  }
  const reader = response.body.getReader();
  try {
    for (;;) {
      let chunk;
      try { chunk = await reader.read(); }
      catch (cause) { throw new R2BodyTransportError('R2 response stream was interrupted', { cause }); }
      const { value, done } = chunk;
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => {});
        throw new Error('R2 private runtime response exceeds its byte bound');
      }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, total);
}

// One closed prewrite phase. No global fetch/default storage/upload override,
// no caller-selected clock or timeout, and no Source/original admission.
export async function withR2PrivateRuntimeCapacityDeadline(operation) {
  if (arguments.length !== 1 || typeof operation !== 'function') {
    throw new Error('R2 private runtime capacity operation is invalid');
  }
  const started = performance.now(), controller = new AbortController();
  const expired = () => Object.assign(new Error('R2 private runtime capacity deadline expired'),
    {code: 'R2_PRIVATE_RUNTIME_CAPACITY_TIMEOUT'});
  const abort = () => { if (!controller.signal.aborted) controller.abort(expired()); };
  const timer = setTimeout(abort, R2_PRIVATE_RUNTIME_CAPACITY_DEADLINE_MS);
  const assertWithinDeadline = () => {
    // Synchronous local packing cannot be preempted by a timer. Check elapsed
    // monotonic time too, so a delayed event loop never authorizes late HTTP/SQL.
    if (performance.now() - started >= R2_PRIVATE_RUNTIME_CAPACITY_DEADLINE_MS) abort();
    if (controller.signal.aborted) throw controller.signal.reason;
  };
  const fetchImpl = async (target, options = {}) => {
    assertWithinDeadline();
    if (!['HEAD', 'GET'].includes(options.method) || options.body !== undefined
      || options.redirect !== 'manual') {
      throw new Error('R2 private runtime capacity transport is read-only');
    }
    const response = await globalThis.fetch(target, {...options, signal: controller.signal});
    try { assertWithinDeadline(); }
    catch (error) { await response.body?.cancel?.().catch(() => {}); throw error; }
    return response; // The same abort signal controls the actual response body.
  };
  const delayImpl = ms => {
    assertWithinDeadline();
    return new Promise((resolve, reject) => {
      let pause;
      const cleanup = () => { clearTimeout(pause); controller.signal.removeEventListener('abort', onAbort); };
      const onAbort = () => { cleanup(); reject(controller.signal.reason); };
      pause = setTimeout(() => {
        cleanup();
        try { assertWithinDeadline(); resolve(); } catch (error) { reject(error); }
      }, ms);
      controller.signal.addEventListener('abort', onAbort, {once: true});
    });
  };
  try {
    assertWithinDeadline();
    const result = await operation(Object.freeze({assertWithinDeadline, fetchImpl, delayImpl}));
    assertWithinDeadline();
    return result;
  } catch (error) {
    assertWithinDeadline(); // Keep the fixed timeout code through ordinary transport wrappers.
    throw error;
  } finally {
    clearTimeout(timer);
    abort(); // Also release any pending request/body/retry wait on failure.
  }
}

export function createR2PrivateRuntimeStorage({
  accountId = process.env.RAVRADAR_R2_ACCOUNT_ID,
  accessKeyId = process.env.RAVRADAR_R2_ACCESS_KEY_ID,
  secretAccessKey = process.env.RAVRADAR_R2_SECRET_ACCESS_KEY,
  bucketId,
  maximumObjectBytes,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  delayImpl = ms => new Promise(resolve => setTimeout(resolve, ms)),
  bucketCeilingBytes = R2_PRIVATE_RUNTIME_BUCKET_CEILING_BYTES,
} = {}) {
  if (!ACCOUNT_ID.test(String(accountId ?? ''))
    || !BUCKET_ID.test(String(bucketId ?? ''))
    || !String(accessKeyId ?? '').trim()
    || !String(secretAccessKey ?? '').trim()
    || !Number.isSafeInteger(maximumObjectBytes)
    || maximumObjectBytes < 1
    || !Number.isSafeInteger(bucketCeilingBytes)
    || bucketCeilingBytes < maximumObjectBytes
    || typeof fetchImpl !== 'function') {
    throw new Error('R2 private runtime configuration is incomplete');
  }
  const host = `${accountId}.eu.r2.cloudflarestorage.com`;
  const root = `https://${host}/${bucketId}`;
  const basePath = `/${bucketId}`;

  async function request(method, objectPath = null, { query = [], body = null,
    extraHeaders = {}, authenticated = true } = {}) {
    const pathname = objectPath === null ? basePath
      : `${basePath}/${safeObjectPath(objectPath).split('/').map(awsEncode).join('/')}`;
    const canonicalQuery = [...query].sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${awsEncode(key)}=${awsEncode(value)}`).join('&');
    const url = `${root}${pathname.slice(basePath.length)}${canonicalQuery ? `?${canonicalQuery}` : ''}`;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      let response;
      try {
        const headers = authenticated ? signedHeaders({
          method, host, pathname, query: canonicalQuery, body, accessKeyId,
          secretAccessKey, date: now(), extraHeaders,
        }) : extraHeaders;
        response = await fetchImpl(url, {
          method, headers, body: body ?? undefined, redirect: 'manual',
        });
        if (attempt === 1 && [429, 502, 503, 504].includes(response.status)) {
          await response.body?.cancel?.().catch(() => {});
          await delayImpl(1_000);
          continue;
        }
        return response;
      } catch (error) {
        if (response || attempt === 2) {
          const wrapped = new Error('R2 private runtime request failed closed');
          wrapped.cause = error;
          throw wrapped;
        }
        await delayImpl(1_000);
      }
    }
    throw new Error('R2 private runtime retry was exhausted');
  }

  async function boundedGet(objectPath, query, limit, failureMessage) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await request('GET', objectPath, { query });
      if (!response.ok) {
        await response.body?.cancel?.().catch(() => {});
        throw new Error(failureMessage);
      }
      try { return await readBoundedBody(response, limit); }
      catch (error) {
        if (!(error instanceof R2BodyTransportError) || attempt === 2) throw error;
        await delayImpl(1_000);
      }
    }
    throw new Error(failureMessage);
  }

  async function bucketUsage() {
    let token = null;
    let usedBytes = 0;
    let objectCount = 0;
    const seenTokens = new Set();
    for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
      const query = [['list-type', '2'], ['max-keys', '1000']];
      if (token) query.push(['continuation-token', token]);
      const xml = (await boundedGet(null, query, MAX_LIST_BODY_BYTES,
        'R2 private runtime bucket listing failed closed')).toString('utf8');
      const listing = parseListing(xml);
      usedBytes += listing.bytes;
      objectCount += listing.objectCount;
      if (!Number.isSafeInteger(usedBytes)
        || usedBytes > bucketCeilingBytes) {
        throw new Error('R2 private runtime bucket exceeds its safety ceiling');
      }
      if (!listing.nextToken) return { usedBytes, objectCount };
      if (seenTokens.has(listing.nextToken)) {
        throw new Error('R2 private runtime bucket listing repeated a page');
      }
      seenTokens.add(listing.nextToken);
      token = listing.nextToken;
    }
    throw new Error('R2 private runtime bucket listing exceeds its page bound');
  }

  async function ensurePrivateBucket() {
    const response = await request('HEAD');
    await response.body?.cancel?.().catch(() => {});
    if (!response.ok) throw new Error('Private EU R2 bucket is not available');
    return true;
  }

  // Strict HEAD metadata is capacity-only; legacy upload keeps its whole contract.
  async function capacityImmutableObjectExists(objectPath, expectedBytes) {
    safeObjectPath(objectPath);
    if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 1
      || expectedBytes > maximumObjectBytes) {
      throw new Error('R2 private runtime object exceeds its size bound');
    }
    const response = await request('HEAD', objectPath);
    await response.body?.cancel?.().catch(() => {});
    if (response.status === 404) return false;
    if (response.status !== 200) {
      throw new Error('R2 private runtime object existence check failed closed');
    }
    const declared = response.headers?.get?.('content-length');
    if (!/^(0|[1-9][0-9]*)$/.test(String(declared))
      || !Number.isSafeInteger(Number(declared)) || Number(declared) !== expectedBytes) {
      throw new Error('R2 private runtime immutable object size is inconsistent');
    }
    return true;
  }

  async function inspectImmutableCapacity(descriptors) {
    if (arguments.length !== 1 || !Array.isArray(descriptors)
      || descriptors.length < 1 || descriptors.length > 8) {
      throw new Error('R2 private runtime capacity descriptors are invalid');
    }
    const paths = new Set(), selected = [];
    // Validate and snapshot the entire closed list before the first HTTP read.
    for (const [index, descriptor] of descriptors.entries()) {
      if (!descriptor || Object.getPrototypeOf(descriptor) !== Object.prototype
        || Object.keys(descriptor).sort().join(',') !== 'index,objectBytes,objectPath,objectSha256'
        || Object.values(Object.getOwnPropertyDescriptors(descriptor)).some(value => value.get || value.set)
        || descriptor.index !== index || paths.has(descriptor.objectPath)
        || !/^[a-f0-9]{64}$/.test(String(descriptor.objectSha256))
        || !Number.isSafeInteger(descriptor.objectBytes) || descriptor.objectBytes < 1
        || descriptor.objectBytes > maximumObjectBytes) {
        throw new Error('R2 private runtime capacity descriptor is invalid');
      }
      safeObjectPath(descriptor.objectPath);
      if (!descriptor.objectPath.endsWith('-' + descriptor.objectSha256 + '.json.gz.part')
        || !descriptor.objectPath.includes('/part-' + String(index).padStart(3, '0') + '-')) {
        throw new Error('R2 private runtime capacity descriptor path is inconsistent');
      }
      paths.add(descriptor.objectPath);
      selected.push({objectPath: descriptor.objectPath, objectBytes: descriptor.objectBytes});
    }
    let missingObjectBytes = 0, missingObjectCount = 0;
    for (const descriptor of selected) {
      if (!await capacityImmutableObjectExists(descriptor.objectPath, descriptor.objectBytes)) {
        missingObjectBytes += descriptor.objectBytes;
        missingObjectCount += 1;
      }
    }
    // Count the complete dedicated bucket, including retained originals and
    // any unreferenced objects. Future retention never finances this upload.
    const {usedBytes, objectCount} = await bucketUsage();
    const projectedPeakBytes = usedBytes + missingObjectBytes
      + R2_PRIVATE_RUNTIME_PREFLIGHT_MARGIN_BYTES;
    if (!Number.isSafeInteger(projectedPeakBytes) || projectedPeakBytes > bucketCeilingBytes) {
      throw new Error('R2 private runtime prewrite capacity would exceed its safety ceiling');
    }
    return Object.freeze({kind: 'R2_PRIVATE_RUNTIME_PREWRITE_CAPACITY_V1',
      usedBytes, bucketObjectCount: objectCount, preparedObjectCount: selected.length,
      missingObjectCount, missingObjectBytes,
      reservedMarginBytes: R2_PRIVATE_RUNTIME_PREFLIGHT_MARGIN_BYTES,
      projectedPeakBytes, ceilingBytes: bucketCeilingBytes,
      remainingBytesAfterMargin: bucketCeilingBytes - projectedPeakBytes});
  }

  async function uploadImmutable(objectPath, bytes) {
    safeObjectPath(objectPath);
    if (!Buffer.isBuffer(bytes) || bytes.length < 1
      || bytes.length > maximumObjectBytes) {
      throw new Error('R2 private runtime upload exceeds its object bound');
    }
    // Existing immutable content may be retried even if the bucket has since
    // reached its safety ceiling. The caller always verifies byte-exact readback.
    const existing = await request('HEAD', objectPath);
    await existing.body?.cancel?.().catch(() => {});
    if (existing.ok) return { created: false, alreadyExists: true };
    if (existing.status !== 404) {
      throw new Error('R2 private runtime object existence check failed closed');
    }
    const { usedBytes } = await bucketUsage();
    if (usedBytes + bytes.length > bucketCeilingBytes) {
      throw new Error('R2 private runtime upload would exceed its safety ceiling');
    }
    const response = await request('PUT', objectPath, {
      body: bytes,
      extraHeaders: {
        'content-type': 'application/gzip',
        'if-none-match': '*',
      },
    });
    await response.body?.cancel?.().catch(() => {});
    if (response.ok) return { created: true };
    if (response.status === 412) return { created: false, alreadyExists: true };
    throw new Error('R2 private runtime immutable upload failed closed');
  }

  async function download(objectPath) {
    return boundedGet(safeObjectPath(objectPath), [], maximumObjectBytes,
      'R2 private runtime download failed closed');
  }

  async function removeExact(objectPath) {
    const response = await request('DELETE', safeObjectPath(objectPath));
    await response.body?.cancel?.().catch(() => {});
    if (!response.ok) throw new Error('R2 private runtime retention cleanup failed closed');
    return true;
  }

  async function anonymousStatus(objectPath) {
    const response = await request('GET', safeObjectPath(objectPath), {
      authenticated: false, extraHeaders: { range: 'bytes=0-0' },
    });
    await response.body?.cancel?.().catch(() => {});
    return response.status;
  }

  return { ensurePrivateBucket, uploadImmutable, download, removeExact,
    anonymousStatus, bucketUsage, inspectImmutableCapacity };
}
