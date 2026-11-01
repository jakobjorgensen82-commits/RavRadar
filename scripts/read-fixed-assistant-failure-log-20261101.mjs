import path from 'node:path';
import { pathToFileURL } from 'node:url';

// One fixed observation; no caller-selected SQL, project, route or time window.
const PROJECT_REF = 'afqhhdrkjfjtpadntdzo';
const FUNCTION_NAME = 'ravradar-assistant';
const START = '2026-11-01T00:27:03Z';
const END_EXCLUSIVE = '2026-11-01T00:27:16Z';
const MAX_BYTES = 32768;
const MAX_ROWS = 8;
const DEADLINE_MS = 10000;
const STAGES = Object.freeze([
  'UPSTREAM_REQUEST', 'UPSTREAM_HTTP_REJECTED', 'UPSTREAM_JSON_PARSE',
  'UPSTREAM_ENVELOPE_REJECTED', 'RESULT_EXTRACTION', 'RESULT_VALIDATION', 'UNKNOWN',
]);
const REJECTION_CODES = Object.freeze([
  'RESULT_LOCALE_UNSUPPORTED', 'RESULT_NOT_OBJECT', 'RESULT_KEYS_INVALID',
  'RESULT_SCHEMA_INVALID', 'RESULT_LOCALE_MISMATCH', 'RESULT_DISPOSITION_INVALID',
  'RESULT_ANSWER_EMPTY', 'RESULT_ANSWER_TOO_LONG', 'RESULT_ANSWER_SECURITY',
  'RESULT_EVIDENCE_ARRAY_INVALID', 'RESULT_EVIDENCE_COUNT_EXCEEDED',
  'RESULT_EVIDENCE_DUPLICATE', 'RESULT_EVIDENCE_UNKNOWN',
  'RESULT_OUT_OF_SCOPE_EVIDENCE', 'RESULT_ANSWER_EVIDENCE_MISSING',
  'CANONICAL_UNIT_MISSING', 'CANONICAL_ANSWER_EMPTY', 'CANONICAL_ANSWER_SECURITY',
]);

// Same ClickHouse logs/extract/CASE convention as the historical fixed reader.
// The actual logger emits no route field. Its unique marker, schema and this
// fixed function's reviewed logger own the scope; do not invent metadata columns.
const SQL = `SELECT DISTINCT
  CASE WHEN stage_raw IN (${STAGES.map(value => "'" + value + "'").join(',')})
    THEN stage_raw ELSE 'UNKNOWN' END AS stage,
  toUInt16OrNull(response_raw) AS responseStatus,
  toUInt16OrNull(upstream_raw) AS upstreamStatus,
  nullIf(rejection_raw, '') AS rejectionCode
FROM
(
  SELECT
    extract(event_message,
      '[{,][[:space:]]*"?stage"?[[:space:]]*:[[:space:]]*"(${STAGES.join('|')})"[[:space:]]*[,}]') AS stage_raw,
    extract(event_message,
      '[{,][[:space:]]*"?responseStatus"?[[:space:]]*:[[:space:]]*([45][0-9]{2}|null)[[:space:]]*[,}]') AS response_raw,
    extract(event_message,
      '[{,][[:space:]]*"?upstreamStatus"?[[:space:]]*:[[:space:]]*([1-5][0-9]{2}|null)[[:space:]]*[,}]') AS upstream_raw,
    extract(event_message,
      '[{,][[:space:]]*"?rejectionCode"?[[:space:]]*:[[:space:]]*"(${REJECTION_CODES.join('|')})"[[:space:]]*[,}]') AS rejection_raw
  FROM logs
  WHERE source = 'function_logs'
    AND timestamp >= '2026-11-01 00:27:03'
    AND timestamp < '2026-11-01 00:27:16'
    AND position(event_message, 'RAVRADAR_ASSISTANT_FAILURE') = 1
    AND match(event_message, '^RAVRADAR_ASSISTANT_FAILURE[[:space:]]+[{]')
    AND match(event_message,
      '[{,][[:space:]]*"?schemaVersion"?[[:space:]]*:[[:space:]]*1[[:space:]]*[,}]')
)
ORDER BY stage, responseStatus, upstreamStatus, rejectionCode
LIMIT 8`;

let requestConsumed = false;
class FixedLogFailure extends Error {
  constructor(status) {
    super('Fixed assistant failure-log read failed closed');
    this.safeStatus = status;
  }
}
const fail = status => { throw new FixedLogFailure(status); };
const exactKeys = (value, keys) => value !== null
  && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === [...keys].sort().join(',');

function report(requestStatus, httpStatus = null, categories = null) {
  return {
    schemaVersion: 1,
    kind: 'RAVRADAR_FIXED_ASSISTANT_FAILURE_LOG_READ_20261101_V1',
    requestStatus,
    projectRef: PROJECT_REF,
    functionName: FUNCTION_NAME,
    scope: { startInclusive: START, endExclusive: END_EXCLUSIVE },
    httpStatus,
    rowCount: categories === null ? null : categories.length,
    categories,
    privatePayloadLogged: false,
    recordedEventAbsenceProved: false,
  };
}

function validateResult(bytes) {
  let envelope;
  try { envelope = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch (error) { fail(error instanceof SyntaxError ? 'LOG_JSON_INVALID' : 'LOG_UTF8_INVALID'); }
  // Keep the reviewed exact result-only / result+error envelope. Unknown
  // shapes and raw query errors are discarded rather than rendered or retried.
  if (!exactKeys(envelope, ['result', 'error'])
    && !exactKeys(envelope, ['result'])) fail('LOG_ENVELOPE_SHAPE');
  const queryError = Object.hasOwn(envelope, 'error') ? envelope.error : null;
  if (queryError !== null && typeof queryError !== 'string') fail('LOG_ERROR_FIELD_TYPE');
  if (queryError !== null && queryError !== '') fail('LOG_QUERY_ERROR');
  if (!Array.isArray(envelope.result)) fail('LOG_RESULT_TYPE');
  if (envelope.result.length >= MAX_ROWS) fail('LOG_ROW_CAP_REACHED');
  const categories = [], seen = new Set();
  for (const row of envelope.result) {
    if (!exactKeys(row, ['stage', 'responseStatus', 'upstreamStatus', 'rejectionCode'])) fail('LOG_ROW_SHAPE');
    if (typeof row.stage !== 'string' || !STAGES.includes(row.stage)) fail('LOG_STAGE_NOT_ALLOWED');
    if (row.responseStatus !== null && (!Number.isInteger(row.responseStatus)
      || row.responseStatus < 400 || row.responseStatus > 599)) fail('LOG_RESPONSE_STATUS_NOT_ALLOWED');
    if (row.upstreamStatus !== null && (!Number.isInteger(row.upstreamStatus)
      || row.upstreamStatus < 100 || row.upstreamStatus > 599)) fail('LOG_UPSTREAM_STATUS_NOT_ALLOWED');
    if (row.rejectionCode !== null && (typeof row.rejectionCode !== 'string'
      || !REJECTION_CODES.includes(row.rejectionCode))) fail('LOG_REJECTION_CODE_NOT_ALLOWED');
    const safe = { stage: row.stage, responseStatus: row.responseStatus,
      upstreamStatus: row.upstreamStatus, rejectionCode: row.rejectionCode };
    const key = JSON.stringify(safe);
    if (seen.has(key)) fail('LOG_CATEGORY_DUPLICATE');
    seen.add(key);
    categories.push(safe);
  }
  return categories;
}

// One actual GET at most, including failed transport and a held response body.
export async function readFixedAssistantFailureLog20261101() {
  if (arguments.length !== 0) return report('LOG_ARGUMENTS_FORBIDDEN');
  if (requestConsumed) return report('LOG_READ_ALREADY_CONSUMED');
  requestConsumed = true;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (typeof token !== 'string' || token.trim() === '') return report('LOG_CREDENTIAL_UNAVAILABLE');
  if (typeof globalThis.fetch !== 'function') return report('LOG_TRANSPORT_UNAVAILABLE');
  const url = new URL('https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/analytics/endpoints/logs');
  url.searchParams.set('sql', SQL);
  url.searchParams.set('iso_timestamp_start', START);
  url.searchParams.set('iso_timestamp_end', END_EXCLUSIVE);
  const controller = new AbortController();
  let httpStatus = null, reader = null, deadlineExpired = false, timeout;
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
        redirect: 'error', cache: 'no-store', credentials: 'omit', signal: controller.signal,
      });
      if (deadlineExpired) fail('LOG_DEADLINE_EXCEEDED');
      if (!Number.isInteger(response?.status) || response.status < 100
        || response.status > 599 || response.redirected === true) fail('LOG_TRANSPORT_ERROR');
      httpStatus = response.status;
      if (httpStatus !== 200) fail('LOG_HTTP_REJECTED');
      const declared = response.headers.get('content-length');
      if (declared !== null) {
        if (!/^[0-9]+$/.test(declared)) fail('LOG_CONTENT_LENGTH_SHAPE');
        const declaredBytes = Number(declared);
        if (!Number.isSafeInteger(declaredBytes) || declaredBytes > MAX_BYTES) fail('LOG_BODY_TOO_LARGE');
      }
      if (!response.body || typeof response.body.getReader !== 'function') fail('LOG_BODY_UNAVAILABLE');
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
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const categories = validateResult(bytes);
      return report(categories.length ? 'RECORDED_CATEGORIES' : 'NO_MATCHING_FIXED_MARKER_CATEGORIES', httpStatus, categories);
    };
    return await Promise.race([read(), deadline]);
  } catch (error) {
    return report(deadlineExpired ? 'LOG_DEADLINE_EXCEEDED'
      : error instanceof FixedLogFailure ? error.safeStatus : 'LOG_TRANSPORT_ERROR', httpStatus);
  } finally {
    clearTimeout(timeout);
    controller.abort();
    if (reader) { try { void reader.cancel().catch(() => {}); } catch {} }
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const result = process.argv.length === 2
    ? await readFixedAssistantFailureLog20261101() : report('LOG_ARGUMENTS_FORBIDDEN');
  console.log(JSON.stringify(result));
  if (!['RECORDED_CATEGORIES', 'NO_MATCHING_FIXED_MARKER_CATEGORIES'].includes(result.requestStatus)) process.exitCode = 1;
}
