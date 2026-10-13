import path from 'node:path';
import { pathToFileURL } from 'node:url';

// One fixed historical upload event. New, separately scoped approval is required.
const API_START = '2026-10-13T19:27:08Z';
const API_END = '2026-10-13T19:27:19Z';
const MAX_BYTES = 32768;
const MAX_ROWS = 8;
const DEADLINE_MS = 10000;
const SQL = "SELECT DISTINCT status, source_kind AS source, provider_code\nFROM\n(\n  SELECT\n    CASE WHEN source = 'storage_logs'\n      THEN toInt32OrZero(log_attributes['res.statusCode'])\n      ELSE toInt32OrZero(log_attributes['response.status_code']) END AS status,\n    CASE WHEN source = 'storage_logs' THEN 'storage' ELSE 'gateway' END AS source_kind,\n    CASE WHEN source = 'storage_logs' THEN\n      CASE WHEN mapContains(log_attributes, 'error.errorCode')\n          AND log_attributes['error.errorCode'] != '' THEN\n        CASE WHEN log_attributes['error.errorCode'] IN ('EntityTooLarge', 'ResourceAlreadyExists', 'KeyAlreadyExists', 'InvalidMimeType', 'AccessDenied', 'InternalError', 'DatabaseTimeout', 'DatabaseError', 'SlowDown', 'InvalidJWT', 'UNAUTHORIZED_MISSING_API_KEY')\n          THEN log_attributes['error.errorCode'] ELSE 'UNKNOWN' END\n      ELSE\n      CASE WHEN NOT mapContains(log_attributes, 'error.code')\n          OR log_attributes['error.code'] = '' THEN 'MISSING'\n        WHEN log_attributes['error.code'] IN ('EntityTooLarge', 'ResourceAlreadyExists', 'KeyAlreadyExists', 'InvalidMimeType', 'AccessDenied', 'InternalError', 'DatabaseTimeout', 'DatabaseError', 'SlowDown', 'InvalidJWT', 'UNAUTHORIZED_MISSING_API_KEY')\n          THEN log_attributes['error.code'] ELSE 'UNKNOWN' END\n      END\n    ELSE\n      CASE WHEN NOT mapContains(log_attributes, 'response.headers.sb_error_code')\n          OR log_attributes['response.headers.sb_error_code'] = '' THEN 'MISSING'\n        WHEN log_attributes['response.headers.sb_error_code'] IN ('EntityTooLarge', 'ResourceAlreadyExists', 'KeyAlreadyExists', 'InvalidMimeType', 'AccessDenied', 'InternalError', 'DatabaseTimeout', 'DatabaseError', 'SlowDown', 'InvalidJWT', 'UNAUTHORIZED_MISSING_API_KEY')\n          THEN log_attributes['response.headers.sb_error_code'] ELSE 'UNKNOWN' END\n    END AS provider_code\n  FROM logs\n  WHERE timestamp >= '2026-10-13 19:27:08'\n    AND timestamp < '2026-10-13 19:27:19'\n    AND\n    (\n      (source = 'storage_logs' AND log_attributes['req.method'] = 'POST'\n        AND match(log_attributes['req.url'],\n          '^/object/ravradar-private-production-runtime/operational-evidence/sha256/[0-9a-f]{64}[.]json[.]gz$'))\n      OR\n      (source = 'edge_logs' AND log_attributes['request.method'] = 'POST'\n        AND match(log_attributes['request.path'],\n          '^/storage/v1/object/ravradar-private-production-runtime/operational-evidence/sha256/[0-9a-f]{64}[.]json[.]gz$'))\n    )\n)\nORDER BY status, source, provider_code\nLIMIT 8";
const PROVIDER_CODES = new Set(["EntityTooLarge","ResourceAlreadyExists","KeyAlreadyExists","InvalidMimeType","AccessDenied","InternalError","DatabaseTimeout","DatabaseError","SlowDown","InvalidJWT","UNAUTHORIZED_MISSING_API_KEY","MISSING","UNKNOWN"]);
let requestConsumed = false;

class FixedLogFailure extends Error {
  constructor(status) {
    super('Fixed Storage upload-log read failed closed');
    this.safeStatus = status;
  }
}
const fail = status => { throw new FixedLogFailure(status); };
const exactKeys = (value, keys) => value !== null
  && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === [...keys].sort().join(',');

function report(requestStatus, httpStatus = null, pairs = null) {
  return {
    schemaVersion: 1,
    kind: 'RAVRADAR_FIXED_STORAGE_UPLOAD_LOG_READ_20261013_V1',
    requestStatus,
    httpStatus,
    rowCount: pairs === null ? null : pairs.length,
    pairs,
    privatePayloadLogged: false,
  };
}

function validateResult(bytes) {
  let text,envelope;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { fail('LOG_UTF8_INVALID'); }
  try { envelope = JSON.parse(text); }
  catch { fail('LOG_JSON_INVALID'); }
  // The public OpenAPI AnalyticsResponse_Output does not require error.
  // Accept only exact result-only as well; an absent error means none reported.
  if (!exactKeys(envelope, ['result', 'error'])
      && !exactKeys(envelope, ['result'])) fail('LOG_ENVELOPE_SHAPE');
  const queryError = Object.hasOwn(envelope, 'error') ? envelope.error : null;
  if (queryError !== null && typeof queryError !== 'string') fail('LOG_ERROR_FIELD_TYPE');
  if (queryError !== null && queryError !== '') fail('LOG_QUERY_ERROR');
  if (!Array.isArray(envelope.result)) fail('LOG_RESULT_TYPE');
  if (envelope.result.length >= MAX_ROWS) fail('LOG_ROW_CAP_REACHED');
  const pairs = [],seen = new Set();
  for (const row of envelope.result) {
    if (!exactKeys(row, ['status', 'source', 'provider_code'])) fail('LOG_ROW_SHAPE');
    if (!['storage', 'gateway'].includes(row.source)) fail('LOG_SOURCE_NOT_ALLOWED');
    if (!Number.isInteger(row.status)) fail('LOG_STATUS_TYPE');
    if (row.status < 100 || row.status > 599) fail('LOG_STATUS_RANGE');
    if (typeof row.provider_code !== 'string') fail('LOG_CODE_TYPE');
    if (!PROVIDER_CODES.has(row.provider_code)) fail('LOG_CODE_NOT_ALLOWED');
    const key = JSON.stringify([row.status,row.source,row.provider_code]);
    if (seen.has(key)) fail('LOG_CATEGORY_DUPLICATE');
    seen.add(key); pairs.push({status:row.status,source:row.source,provider_code:row.provider_code});
  }
  return pairs;
}

// No descriptor, SQL, URL, project, credential or time-window arguments.
export async function readFixedStorageUploadLog20261013() {
  if (arguments.length !== 0) return report('LOG_ARGUMENTS_FORBIDDEN');
  if (requestConsumed) return report('LOG_READ_ALREADY_CONSUMED');
  requestConsumed = true;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (typeof token !== 'string' || token.trim() === '') {
    return report('LOG_CREDENTIAL_UNAVAILABLE');
  }
  if (typeof globalThis.fetch !== 'function') return report('LOG_TRANSPORT_UNAVAILABLE');
  const url = new URL(
    'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/analytics/endpoints/logs',
  );
  url.searchParams.set('sql', SQL);
  url.searchParams.set('iso_timestamp_start', API_START);
  url.searchParams.set('iso_timestamp_end', API_END);
  const controller = new AbortController();
  let httpStatus = null;
  let reader = null;
  let deadlineExpired = false;
  let timeout;
  const deadline = new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      deadlineExpired = true;
      controller.abort();
      reject(new FixedLogFailure('LOG_DEADLINE_EXCEEDED'));
    }, DEADLINE_MS);
  });
  try {
    const read = async () => {
      const response = await globalThis.fetch(url, {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
        redirect: 'error',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      });
      if (deadlineExpired) fail('LOG_DEADLINE_EXCEEDED');
      if (!Number.isInteger(response?.status)
        || response.status < 100 || response.status > 599
        || response.redirected === true) fail('LOG_TRANSPORT_ERROR');
      httpStatus = response.status;
      if (httpStatus !== 200) fail('LOG_HTTP_REJECTED');
      const declared = response.headers.get('content-length');
      if (declared !== null) {
        if (!/^[0-9]+$/.test(declared)) fail('LOG_CONTENT_LENGTH_SHAPE');
        const declaredBytes = Number(declared);
        if (!Number.isSafeInteger(declaredBytes) || declaredBytes > MAX_BYTES) {
          fail('LOG_BODY_TOO_LARGE');
        }
      }
      if (!response.body || typeof response.body.getReader !== 'function') {
        fail('LOG_BODY_UNAVAILABLE');
      }
      reader = response.body.getReader();
      const chunks = [];
      let total = 0;
      while (true) {
        const chunk = await reader.read();
        if (deadlineExpired) fail('LOG_DEADLINE_EXCEEDED');
        if (chunk.done) break;
        if (!(chunk.value instanceof Uint8Array)) fail('LOG_SCHEMA_UNAVAILABLE');
        if (chunk.value.byteLength > MAX_BYTES - total) fail('LOG_BODY_TOO_LARGE');
        total += chunk.value.byteLength;
        chunks.push(chunk.value);
      }
      reader.releaseLock();
      reader = null;
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const pairs = validateResult(bytes);
      return report(pairs.length === 0
        ? 'NO_MATCHING_RECORDED_EVENTS' : 'RECORDED_CATEGORIES', httpStatus, pairs);
    };
    return await Promise.race([read(), deadline]);
  } catch (error) {
    return report(deadlineExpired ? 'LOG_DEADLINE_EXCEEDED'
      : error instanceof FixedLogFailure ? error.safeStatus : 'LOG_TRANSPORT_ERROR', httpStatus);
  } finally {
    clearTimeout(timeout);
    controller.abort();
    if (reader) {
      try { void reader.cancel().catch(() => {}); } catch {}
    }
  }
}

if (process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const result = process.argv.length === 2
    ? await readFixedStorageUploadLog20261013() : report('LOG_ARGUMENTS_FORBIDDEN');
  console.log(JSON.stringify(result));
  if (!['RECORDED_CATEGORIES', 'NO_MATCHING_RECORDED_EVENTS'].includes(result.requestStatus)) {
    process.exitCode = 1;
  }
}
