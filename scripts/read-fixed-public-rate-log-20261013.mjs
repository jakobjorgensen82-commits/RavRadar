import path from 'node:path';
import { pathToFileURL } from 'node:url';

// One approved historical event, not a reusable log/query client.
const PROJECT_REF = 'afqhhdrkjfjtpadntdzo';
const API_START = '2026-10-13T08:41:00Z';
const API_END = '2026-10-13T08:43:00Z';
const SQL_START = '2026-10-13T08:41:58Z';
const SQL_END = '2026-10-13T08:42:09Z';
const MAX_BYTES = 32768;
const MAX_ROWS = 8;
const DEADLINE_MS = 10000;
const SQL = `SELECT DISTINCT status, error_code
FROM
(
  SELECT
    CASE
      WHEN source = 'edge_logs'
        THEN toInt32OrZero(log_attributes['response.status_code'])
      ELSE NULL
    END AS status,
    CASE
      WHEN source = 'edge_logs' THEN
        CASE
          WHEN NOT mapContains(log_attributes, 'response.status_code')
            THEN 'LOG_FIELDS_UNAVAILABLE'
          WHEN NOT mapContains(log_attributes, 'response.headers.sb_error_code')
            OR log_attributes['response.headers.sb_error_code'] = ''
            THEN 'NOT_RECORDED'
          WHEN log_attributes['response.headers.sb_error_code']
            = 'UNAUTHORIZED_MISSING_API_KEY'
            THEN 'UNAUTHORIZED_MISSING_API_KEY'
          WHEN log_attributes['response.headers.sb_error_code'] IN
            ('42501', '22023', '42P01', '42883', '25006', '53100',
             '53200', '53300', '53400', '55P03', '57014', '57P03', '40P01',
             'PGRST301', 'PGRST302', 'PGRST303')
            THEN log_attributes['response.headers.sb_error_code']
          ELSE 'UNRECOGNIZED_CODE'
        END
      ELSE
        CASE
          WHEN NOT mapContains(log_attributes, 'parsed.sql_state_code')
            THEN 'LOG_FIELDS_UNAVAILABLE'
          WHEN log_attributes['parsed.sql_state_code'] = ''
            THEN 'NOT_RECORDED'
          WHEN log_attributes['parsed.sql_state_code'] IN
            ('42501', '22023', '42P01', '42883', '25006', '53100',
             '53200', '53300', '53400', '55P03', '57014', '57P03', '40P01')
            THEN log_attributes['parsed.sql_state_code']
          ELSE 'UNRECOGNIZED_CODE'
        END
    END AS error_code
  FROM logs
  WHERE timestamp >= '2026-10-13 08:41:58'
    AND timestamp < '2026-10-13 08:42:09'
    AND
    (
      (
        source = 'edge_logs'
        AND log_attributes['request.method'] = 'POST'
        AND log_attributes['request.path']
          = '/rest/v1/rpc/consume_public_request_limit'
      )
      OR
      (
        source = 'postgres_logs'
        AND log_attributes['parsed.error_severity'] IN ('ERROR', 'FATAL', 'PANIC')
        AND log_attributes['parsed.user_name'] = 'authenticator'
        AND match(log_attributes['parsed.query'],
          '(?i)(^|[^a-z0-9_])consume_public_request_limit([^a-z0-9_]|$)')
      )
    )
)
ORDER BY status, error_code
LIMIT 8`;

const PG_CODES = new Set([
  '42501', '22023', '42P01', '42883', '25006', '53100',
  '53200', '53300', '53400', '55P03', '57014', '57P03', '40P01',
]);
const GATEWAY_CODES = new Set([
  ...PG_CODES, 'PGRST301', 'PGRST302', 'PGRST303',
  'UNAUTHORIZED_MISSING_API_KEY', 'NOT_RECORDED', 'UNRECOGNIZED_CODE',
]);
let requestConsumed = false;

class FixedLogFailure extends Error {
  constructor(status) {
    super('Fixed public rate-log read failed closed');
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
    kind: 'RAVRADAR_FIXED_PUBLIC_RATE_LOG_READ_20261013_V1',
    requestStatus,
    projectRef: PROJECT_REF,
    scope: {
      apiStart: API_START, apiEnd: API_END,
      sqlStart: SQL_START, sqlEndExclusive: SQL_END,
    },
    httpStatus,
    rowCount: pairs === null ? null : pairs.length,
    pairs,
    privatePayloadLogged: false,
  };
}


// Only bounded structural enums survive a rejected response. Never retain
// its field names, values, rows or query/error text, and do not relax parsing.
let envelopeDiagnostic = null;
const diagnosticType = value => value === null ? 'NULL'
  : Array.isArray(value) ? 'ARRAY'
  : typeof value === 'object' ? 'OBJECT'
  : typeof value === 'string' ? 'STRING'
  : typeof value === 'number' ? 'NUMBER'
  : typeof value === 'boolean' ? 'BOOLEAN' : 'UNKNOWN';
function rememberEnvelopeDiagnostic(value) {
  const topType=diagnosticType(value);
  let keyProfile='NOT_OBJECT', resultType='ABSENT', errorType='ABSENT';
  if (topType === 'OBJECT') {
    const hasResult=Object.hasOwn(value,'result'), hasError=Object.hasOwn(value,'error');
    const extras=Object.keys(value).some(key=>key !== 'result' && key !== 'error');
    keyProfile = hasResult && hasError ? (extras ? 'PAIR_WITH_EXTRAS' : 'EXACT_PAIR')
      : hasResult ? (extras ? 'RESULT_WITH_EXTRAS' : 'RESULT_ONLY')
      : hasError ? (extras ? 'ERROR_WITH_EXTRAS' : 'ERROR_ONLY')
      : extras ? 'OTHER_FIELDS_ONLY' : 'EMPTY_OBJECT';
    if (hasResult) resultType=diagnosticType(value.result);
    if (hasError) errorType=diagnosticType(value.error);
  }
  envelopeDiagnostic=Object.freeze({topType,keyProfile,resultType,errorType});
}
export function fixedLogEnvelopeDiagnostic20261013() {
  return envelopeDiagnostic;
}
export function fixedLogEnvelopeAnnotation20261013() {
  const value=envelopeDiagnostic;
  return '::error title=Fixed Supabase log envelope::code=LOG_ENVELOPE_SHAPE'
    + ' top=' + (value?.topType ?? 'UNKNOWN')
    + ' keys=' + (value?.keyProfile ?? 'UNKNOWN')
    + ' result=' + (value?.resultType ?? 'UNKNOWN')
    + ' error=' + (value?.errorType ?? 'UNKNOWN');
}

function validateResult(bytes) {
  let text,envelope;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { fail('LOG_UTF8_INVALID'); }
  try { envelope = JSON.parse(text); }
  catch { fail('LOG_JSON_INVALID'); }
  rememberEnvelopeDiagnostic(envelope);
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
    if (!exactKeys(row, ['status', 'error_code'])) fail('LOG_ROW_SHAPE');
    if (typeof row.error_code !== 'string') fail('LOG_CODE_TYPE');
    if (row.error_code === 'LOG_FIELDS_UNAVAILABLE') fail('LOG_FIELDS_UNAVAILABLE');
    if (row.status === null) {
      if (!PG_CODES.has(row.error_code)
        && !['NOT_RECORDED','UNRECOGNIZED_CODE'].includes(row.error_code)) fail('LOG_CODE_NOT_ALLOWED');
    } else {
      if (!Number.isInteger(row.status)) fail('LOG_STATUS_TYPE');
      if (row.status < 100 || row.status > 599) fail('LOG_STATUS_RANGE');
      if (!GATEWAY_CODES.has(row.error_code)) fail('LOG_CODE_NOT_ALLOWED');
    }
    const key = JSON.stringify([row.status,row.error_code]);
    if (seen.has(key)) fail('LOG_CATEGORY_DUPLICATE');
    seen.add(key); pairs.push({status:row.status,error_code:row.error_code});
  }
  return pairs;
}

// No descriptor, SQL, URL, project, credential or time-window arguments.
export async function readFixedPublicRateLog20261013() {
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
    ? await readFixedPublicRateLog20261013() : report('LOG_ARGUMENTS_FORBIDDEN');
  console.log(JSON.stringify(result));
  if (result.requestStatus === 'LOG_ENVELOPE_SHAPE') console.error(fixedLogEnvelopeAnnotation20261013());
  if (!['RECORDED_CATEGORIES', 'NO_MATCHING_RECORDED_EVENTS'].includes(result.requestStatus)) {
    process.exitCode = 1;
  }
}
