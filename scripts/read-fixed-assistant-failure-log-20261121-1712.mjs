import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Fixed observations only; callers never supply SQL, project, routes or times.
const PROJECT_REF = 'afqhhdrkjfjtpadntdzo';
const FUNCTION_NAME = 'ravradar-assistant';
const OBSERVATION_1712 = Object.freeze({
  kind: 'RAVRADAR_FIXED_ASSISTANT_FAILURE_LOG_READ_20261121_1712_V1',
  startInclusive: '2026-11-21T17:12:11Z',
  endExclusive: '2026-11-21T17:12:22Z',
  includeOutputState: false,
});
const OBSERVATION_2344 = Object.freeze({
  kind: 'RAVRADAR_FIXED_ASSISTANT_FAILURE_LOG_READ_20261121_2344_V1',
  startInclusive: '2026-11-21T23:44:41Z',
  endExclusive: '2026-11-21T23:44:48Z',
  includeOutputState: true,
});
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

const OUTPUT_STATES = Object.freeze([
  'CHAT_LENGTH', 'CHAT_STOP_TEXT', 'CHAT_STOP_EMPTY', 'RESPONSES_TOKEN_LIMIT',
  'RESPONSES_COMPLETED_TEXT', 'RESPONSES_COMPLETED_NO_TEXT', 'UNKNOWN',
]);
const BASE_CATEGORY_FIELDS = Object.freeze(['stage', 'responseStatus', 'upstreamStatus', 'rejectionCode']);
const OUTPUT_CATEGORY_FIELDS = Object.freeze([...BASE_CATEGORY_FIELDS, 'providerOutputState']);

// Same ClickHouse logs/extract/CASE convention as the historical fixed reader.
// The actual logger emits no route field. Its unique marker, schema and this
// fixed function's reviewed logger own the scope; do not invent metadata columns.
function buildFixedQuery({startInclusive, endExclusive, includeOutputState}) {
  const sqlTime = value => value.slice(0, -1).replace('T', ' ');
  const outputProjection = includeOutputState ? ",\n  nullIf(output_raw, '') AS providerOutputState" : '';
  const outputExtract = includeOutputState ? `,
    extract(event_message,
      '[{,][[:space:]]*"?providerOutputState"?[[:space:]]*:[[:space:]]*"(${OUTPUT_STATES.join('|')})"[[:space:]]*[,}]') AS output_raw` : '';
  const httpFilter = includeOutputState ? "\nWHERE response_raw = '502'" : '';
  const outputSort = includeOutputState ? ', providerOutputState' : '';
  return `SELECT DISTINCT
  CASE WHEN stage_raw IN (${STAGES.map(value => "'" + value + "'").join(',')})
    THEN stage_raw ELSE 'UNKNOWN' END AS stage,
  toUInt16OrNull(response_raw) AS responseStatus,
  toUInt16OrNull(upstream_raw) AS upstreamStatus,
  nullIf(rejection_raw, '') AS rejectionCode${outputProjection}
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
      '[{,][[:space:]]*"?rejectionCode"?[[:space:]]*:[[:space:]]*"(${REJECTION_CODES.join('|')})"[[:space:]]*[,}]') AS rejection_raw${outputExtract}
  FROM logs
  WHERE source = 'function_logs'
    AND timestamp >= '${sqlTime(startInclusive)}'
    AND timestamp < '${sqlTime(endExclusive)}'
    AND position(event_message, 'RAVRADAR_ASSISTANT_FAILURE') = 1
    AND match(event_message, '^RAVRADAR_ASSISTANT_FAILURE[[:space:]]+[{]')
    AND match(event_message,
      '[{,][[:space:]]*"?schemaVersion"?[[:space:]]*:[[:space:]]*1[[:space:]]*[,}]')
)${httpFilter}
ORDER BY stage, responseStatus, upstreamStatus, rejectionCode${outputSort}
LIMIT 8`;
}

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

function report(scope, requestStatus, httpStatus = null, categories = null) {
  return {
    schemaVersion: 1,
    kind: scope.kind,
    requestStatus,
    projectRef: PROJECT_REF,
    functionName: FUNCTION_NAME,
    scope: { startInclusive: scope.startInclusive, endExclusive: scope.endExclusive },
    httpStatus,
    rowCount: categories === null ? null : categories.length,
    categories,
    privatePayloadLogged: false,
    recordedEventAbsenceProved: false,
  };
}

function validateResult(bytes, {includeOutputState}) {
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
  const categoryFields = includeOutputState ? OUTPUT_CATEGORY_FIELDS : BASE_CATEGORY_FIELDS;
  for (const row of envelope.result) {
    if (!exactKeys(row, categoryFields)) fail('LOG_ROW_SHAPE');
    if (typeof row.stage !== 'string' || !STAGES.includes(row.stage)) fail('LOG_STAGE_NOT_ALLOWED');
    if (row.responseStatus !== null && (!Number.isInteger(row.responseStatus)
      || row.responseStatus < 400 || row.responseStatus > 599)) fail('LOG_RESPONSE_STATUS_NOT_ALLOWED');
    if (includeOutputState && row.responseStatus !== 502) fail('LOG_RESPONSE_STATUS_NOT_ALLOWED');
    if (row.upstreamStatus !== null && (!Number.isInteger(row.upstreamStatus)
      || row.upstreamStatus < 100 || row.upstreamStatus > 599)) fail('LOG_UPSTREAM_STATUS_NOT_ALLOWED');
    if (row.rejectionCode !== null && (typeof row.rejectionCode !== 'string'
      || !REJECTION_CODES.includes(row.rejectionCode))) fail('LOG_REJECTION_CODE_NOT_ALLOWED');
    const safe = { stage: row.stage, responseStatus: row.responseStatus,
      upstreamStatus: row.upstreamStatus, rejectionCode: row.rejectionCode };
    if (includeOutputState) {
      if (row.providerOutputState !== null && (row.stage !== 'RESULT_EXTRACTION'
        || !OUTPUT_STATES.includes(row.providerOutputState))) fail('LOG_PROVIDER_OUTPUT_STATE_NOT_ALLOWED');
      safe.providerOutputState = row.providerOutputState;
    }
    const key = JSON.stringify(safe);
    if (seen.has(key)) fail('LOG_CATEGORY_DUPLICATE');
    seen.add(key);
    categories.push(safe);
  }
  return categories;
}

// One actual GET at most, including failed transport and a held response body.
export function readFixedAssistantFailureLog20261121_1712() {
  return readFixedObservation(OBSERVATION_1712, arguments.length);
}

export function readFixedAssistantFailureLog20261121_2344() {
  return readFixedObservation(OBSERVATION_2344, arguments.length);
}

async function readFixedObservation(scope, argumentCount) {
  if (argumentCount !== 0) return report(scope, 'LOG_ARGUMENTS_FORBIDDEN');
  if (requestConsumed) return report(scope, 'LOG_READ_ALREADY_CONSUMED');
  requestConsumed = true;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (typeof token !== 'string' || token.trim() === '') return report(scope, 'LOG_CREDENTIAL_UNAVAILABLE');
  if (typeof globalThis.fetch !== 'function') return report(scope, 'LOG_TRANSPORT_UNAVAILABLE');
  const url = new URL('https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/analytics/endpoints/logs');
  url.searchParams.set('sql', buildFixedQuery(scope));
  url.searchParams.set('iso_timestamp_start', scope.startInclusive);
  url.searchParams.set('iso_timestamp_end', scope.endExclusive);
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
      const categories = validateResult(bytes, scope);
      return report(scope, categories.length ? 'RECORDED_CATEGORIES' : 'NO_MATCHING_FIXED_MARKER_CATEGORIES', httpStatus, categories);
    };
    return await Promise.race([read(), deadline]);
  } catch (error) {
    return report(scope, deadlineExpired ? 'LOG_DEADLINE_EXCEEDED'
      : error instanceof FixedLogFailure ? error.safeStatus : 'LOG_TRANSPORT_ERROR', httpStatus);
  } finally {
    clearTimeout(timeout);
    controller.abort();
    if (reader) { try { void reader.cancel().catch(() => {}); } catch {} }
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const [option, ...extra] = process.argv.slice(2);
  const result = option === undefined
    ? await readFixedAssistantFailureLog20261121_1712()
    : option === '--observed-de-2344' && extra.length === 0
      ? await readFixedAssistantFailureLog20261121_2344()
      : report(OBSERVATION_1712, 'LOG_ARGUMENTS_FORBIDDEN');
  console.log(JSON.stringify(result));
  if (!['RECORDED_CATEGORIES', 'NO_MATCHING_FIXED_MARKER_CATEGORIES'].includes(result.requestStatus)) process.exitCode = 1;
}
