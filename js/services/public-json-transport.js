// Public transport only. Callers keep their existing semantic validators after decoding.
export const PUBLIC_JSON_ENVELOPE_KIND = 'ravradar-public-json-gzip-v1';

const HARD_MAX_BYTES = 16 * 1024 * 1024;
const FALLBACK_INPUT_CHUNK_BYTES = 64;
const ENVELOPE_KEYS = Object.freeze([
  'schemaVersion', 'kind', 'encoding', 'decodedBytes', 'decodedSha256',
  'compressedBytes', 'compressedSha256', 'dataBase64',
]);
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function invalid(code) {
  return new Error('PUBLIC_JSON_' + code);
}

function positiveLimit(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= HARD_MAX_BYTES;
}

function isKnownEnvelope(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && value.kind === PUBLIC_JSON_ENVELOPE_KIND;
}

function updateCrc(crc, bytes) {
  for (let index = 0; index < bytes.length; index++) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 255] ^ (crc >>> 8);
  }
  return crc >>> 0;
}

function crc32(bytes) {
  return (updateCrc(0xffffffff, bytes) ^ 0xffffffff) >>> 0;
}

function uint32le(bytes, offset) {
  return (bytes[offset] | bytes[offset + 1] << 8 | bytes[offset + 2] << 16
    | bytes[offset + 3] << 24) >>> 0;
}

function base64Digit(code) {
  if (code >= 65 && code <= 90) return code - 65;
  if (code >= 97 && code <= 122) return code - 71;
  if (code >= 48 && code <= 57) return code + 4;
  return code === 43 ? 62 : code === 47 ? 63 : -1;
}

function decodeCanonicalBase64(text, expectedBytes) {
  if (typeof text !== 'string' || text.length !== 4 * Math.ceil(expectedBytes / 3)) {
    throw invalid('BASE64_INVALID');
  }
  const padding = (3 - expectedBytes % 3) % 3;
  const dataLength = text.length - padding;
  for (let index = 0; index < dataLength; index++) {
    if (base64Digit(text.charCodeAt(index)) < 0) throw invalid('BASE64_INVALID');
  }
  for (let index = dataLength; index < text.length; index++) {
    if (text.charCodeAt(index) !== 61) throw invalid('BASE64_INVALID');
  }
  const last = base64Digit(text.charCodeAt(dataLength - 1));
  if (padding === 2 && (last & 15) !== 0 || padding === 1 && (last & 3) !== 0) {
    throw invalid('BASE64_NONCANONICAL');
  }
  const bytes = new Uint8Array(expectedBytes);
  let offset = 0;
  for (let index = 0; index < text.length; index += 4) {
    const a = base64Digit(text.charCodeAt(index));
    const b = base64Digit(text.charCodeAt(index + 1));
    const c = text.charCodeAt(index + 2) === 61 ? 0 : base64Digit(text.charCodeAt(index + 2));
    const d = text.charCodeAt(index + 3) === 61 ? 0 : base64Digit(text.charCodeAt(index + 3));
    bytes[offset++] = a << 2 | b >>> 4;
    if (offset < expectedBytes) bytes[offset++] = b << 4 | c >>> 2;
    if (offset < expectedBytes) bytes[offset++] = c << 6 | d;
  }
  return bytes;
}

async function sha256(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

// Parse once before streaming. In particular, a long optional header must not
// be repeatedly rescanned by the fallback on each small compressed input chunk.
function gzipHeaderEnd(bytes, decodedBytes) {
  const footer = bytes.length - 8;
  if (bytes.length < 18 || bytes[0] !== 31 || bytes[1] !== 139
    || bytes[2] !== 8 || (bytes[3] & 0xe0) !== 0) throw invalid('GZIP_HEADER_INVALID');
  if (uint32le(bytes, bytes.length - 4) !== decodedBytes) throw invalid('GZIP_ISIZE_MISMATCH');
  const flags = bytes[3];
  let offset = 10;
  if (flags & 4) {
    if (offset + 2 > footer) throw invalid('GZIP_HEADER_INVALID');
    const length = bytes[offset] | bytes[offset + 1] << 8;
    offset += 2 + length;
    if (offset > footer) throw invalid('GZIP_HEADER_INVALID');
  }
  for (const flag of [8, 16]) {
    if (flags & flag) {
      while (offset < footer && bytes[offset] !== 0) offset++;
      if (offset >= footer) throw invalid('GZIP_HEADER_INVALID');
      offset++;
    }
  }
  if (flags & 2) {
    if (offset + 2 > footer) throw invalid('GZIP_HEADER_INVALID');
    if ((crc32(bytes.subarray(0, offset)) & 0xffff) !== (bytes[offset] | bytes[offset + 1] << 8)) {
      throw invalid('GZIP_HEADER_CRC_MISMATCH');
    }
    offset += 2;
  }
  if (offset >= footer) throw invalid('GZIP_HEADER_INVALID');
  return offset;
}

function decodedCollector(expectedBytes, compressed) {
  // One bounded output allocation, no unbounded Response.arrayBuffer/gunzipSync.
  const bytes = new Uint8Array(expectedBytes);
  let length = 0;
  let crc = 0xffffffff;
  return {
    accept(chunk) {
      if (!(chunk instanceof Uint8Array)) throw invalid('GZIP_OUTPUT_INVALID');
      if (chunk.byteLength > expectedBytes - length) throw invalid('DECODED_LIMIT_EXCEEDED');
      bytes.set(chunk, length);
      length += chunk.byteLength;
      crc = updateCrc(crc, chunk);
    },
    finish() {
      if (length !== expectedBytes) throw invalid('DECODED_SIZE_MISMATCH');
      if (((crc ^ 0xffffffff) >>> 0) !== uint32le(compressed, compressed.length - 8)) {
        throw invalid('GZIP_CRC_MISMATCH');
      }
      return bytes;
    },
  };
}

async function nativeGunzip(bytes, collector) {
  // Presence selects native permanently for this call. Construction, stream,
  // CRC, truncation and cancellation failures never select the fallback.
  const stream = new Blob([bytes]).stream().pipeThrough(new globalThis.DecompressionStream('gzip'));
  const reader = stream.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      collector.accept(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function fallbackGunzip(bytes, headerEnd, collector) {
  const { Gunzip } = await import('./vendor/fflate-0.8.2/browser.js');
  let ended = false;
  const decoder = new Gunzip(chunk => {
    collector.accept(chunk);
    // fflate0.8.2's pinned Inflate.c invokes ondata before discarding consumed
    // input. Its terminal DEFLATE bit cursor is required to prove that exactly
    // eight footer bytes remain; CRC/ISIZE alone cannot detect a truncated body
    // that the permissive inflater finishes using a byte from the footer.
    const state = decoder.s;
    if (state?.f && !state.l) {
      if (ended || !Number.isSafeInteger(state.p) || state.p < 0
        || !Number.isSafeInteger(decoder.r) || !(decoder.p instanceof Uint8Array)
        || decoder.r - decoder.p.length + Math.ceil(state.p / 8) !== bytes.length - 8) {
        throw invalid('GZIP_LENGTH_MISMATCH');
      }
      ended = true;
    }
  });
  decoder.onmember = () => { throw invalid('GZIP_MULTIPLE_MEMBERS'); };
  // Header bytes contain no DEFLATE output; feed them once, then bound every
  // DEFLATE input push. Stop synchronously on the first output overrun.
  decoder.push(bytes.subarray(0, headerEnd), false);
  for (let offset = headerEnd; offset < bytes.length; offset += FALLBACK_INPUT_CHUNK_BYTES) {
    decoder.push(bytes.subarray(offset, offset + FALLBACK_INPUT_CHUNK_BYTES), false);
  }
  decoder.push(new Uint8Array(0), true);
  if (!ended) throw invalid('GZIP_TRUNCATED');
}

// Native gzip implementations differ on concatenated members. After native
// success, use the pinned frame cursor to require exactly one member. Discard
// these validation chunks: native bytes remain the result, with no second
// decoded allocation and no retry/fallback after any native failure.
async function verifySingleGzipMember(bytes, headerEnd, expectedBytes) {
  let length = 0;
  await fallbackGunzip(bytes, headerEnd, {
    accept(chunk) {
      if (!(chunk instanceof Uint8Array)) throw invalid('GZIP_OUTPUT_INVALID');
      if (chunk.byteLength > expectedBytes - length) throw invalid('DECODED_LIMIT_EXCEEDED');
      length += chunk.byteLength;
    },
  });
  if (length !== expectedBytes) throw invalid('DECODED_SIZE_MISMATCH');
}

function rejectNestedEnvelope(value) {
  const pending = [value];
  while (pending.length) {
    const item = pending.pop();
    if (isKnownEnvelope(item)) throw invalid('NESTED_ENVELOPE');
    if (item !== null && typeof item === 'object') {
      for (const key of Object.keys(item)) {
        if (item[key] !== null && typeof item[key] === 'object') pending.push(item[key]);
      }
    }
  }
}

/**
 * Decode only the public transport envelope. Raw JSON keeps its exact identity.
 * The returned value must still pass the caller's unchanged semantic validator.
 */
export async function decodePublicJsonTransport(document, {
  maxDecodedBytes = HARD_MAX_BYTES,
  maxCompressedBytes = HARD_MAX_BYTES,
} = {}) {
  if (!positiveLimit(maxDecodedBytes) || !positiveLimit(maxCompressedBytes)) {
    throw invalid('LIMIT_INVALID');
  }
  if (!isKnownEnvelope(document)) return { value: document, decodedBytes: null, encoded: false };
  const keys = Reflect.ownKeys(document);
  // Capture primitives before the first await: later caller mutation must not
  // change the validated allocation bounds or either expected digest.
  const { schemaVersion, kind, encoding, decodedBytes, decodedSha256,
    compressedBytes, compressedSha256, dataBase64 } = document;
  if (keys.length !== ENVELOPE_KEYS.length || !ENVELOPE_KEYS.every(key => keys.includes(key))
    || schemaVersion !== 1 || kind !== PUBLIC_JSON_ENVELOPE_KIND || encoding !== 'gzip-base64'
    || !positiveLimit(decodedBytes) || decodedBytes > maxDecodedBytes
    || !positiveLimit(compressedBytes) || compressedBytes > maxCompressedBytes
    || typeof decodedSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(decodedSha256)
    || typeof compressedSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(compressedSha256)) {
    throw invalid('ENVELOPE_INVALID');
  }
  const compressed = decodeCanonicalBase64(dataBase64, compressedBytes);
  if (await sha256(compressed) !== compressedSha256) throw invalid('COMPRESSED_SHA_MISMATCH');
  const headerEnd = gzipHeaderEnd(compressed, decodedBytes);
  const collector = decodedCollector(decodedBytes, compressed);
  try {
    if (typeof globalThis.DecompressionStream === 'function') {
      await nativeGunzip(compressed, collector);
      await verifySingleGzipMember(compressed, headerEnd, decodedBytes);
    } else await fallbackGunzip(compressed, headerEnd, collector);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PUBLIC_JSON_')) throw error;
    throw invalid('GZIP_INVALID');
  }
  const decoded = collector.finish();
  if (await sha256(decoded) !== decodedSha256) throw invalid('DECODED_SHA_MISMATCH');
  let value;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded));
  } catch {
    throw invalid('UTF8_OR_JSON_INVALID');
  }
  rejectNestedEnvelope(value);
  return { value, decodedBytes: decoded.byteLength, encoded: true };
}

