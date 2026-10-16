import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// One additive offline target. This is not a hosted console or ClickHouse test.
const workflow = (await fs.readFile(new URL('../.github/workflows/deploy-trip-storage.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const ci = (await fs.readFile(new URL('../.github/workflows/validate-pull-request.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const route = 'fixed-public-rate-console-read-20261015';
assert.equal(workflow.split('          - ' + route + '\n').length, 2,
  'FIXED_CONSOLE_ROUTE_MISSING: the new source-gated read route must be explicit');
const readJob = workflow.slice(workflow.indexOf('  read-fixed-supabase-metadata:'), workflow.indexOf('  reject-unknown-operation:'));
assert.match(readJob, /fixed-public-rate-console-read-20261015/);
assert.match(readJob, /GITHUB_RUN_ATTEMPT" = 1/);
assert.match(readJob, /weather-source-gate\.mjs check/);
assert.match(readJob, /steps\.fixed_read_source\.outputs\.required.*false/);
assert.match(readJob, /check-fixed-supabase-account-read-idle\.mjs/);
assert.equal((readJob.match(/git rev-parse origin\/main\^\{commit\}/g) ?? []).length, 2);
assert.ok(readJob.indexOf('check-fixed-supabase-account-read-idle.mjs')
  < readJob.indexOf('node scripts/read-fixed-public-rate-console-log-20261015.mjs'));
assert.match(readJob, /if: inputs\.operation == 'fixed-public-rate-console-read-20261015'\n        timeout-minutes: 1\n        run: node scripts\/read-fixed-public-rate-console-log-20261015\.mjs\n        env:\n          SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
assert.doesNotMatch(readJob, /SUPABASE_DB_PASSWORD|SERVICE_ROLE|CLOUDFLARE_API|continue-on-error|workflow_dispatch.*weather/);
const unknown = workflow.slice(workflow.indexOf('  reject-unknown-operation:'), workflow.indexOf('  repair-existing-worker:'));
assert.match(unknown, /inputs\.operation != 'fixed-public-rate-console-read-20261015'/);
assert.match(ci, /node scripts\/test-fixed-public-rate-console-log-20261015\.mjs/);

assert.equal(Object.hasOwn(process.env, 'SUPABASE_ACCESS_TOKEN'), false,
  'Do not inspect or replace an ambient credential in an offline target');
const originalFetch = globalThis.fetch;
process.env.SUPABASE_ACCESS_TOKEN = 'synthetic-fixed-console-NOT-A-CREDENTIAL';
const marker = 'PUBLIC_RATE_LIMIT_RPC_REJECTED';
const sample = { marker, status: '401', error_code: 'PGRST301' };
const valid = result => new Response(JSON.stringify({ result, error: null }), { status: 200 });
const statuses = new Set(['400','401','402','403','404','409','422','429','500','502','503','504','UNKNOWN']);
const codes = new Set(['42501','22023','PGRST301','PGRST302','PGRST303','UNKNOWN']);
let requests = 0, sqlCaptured = null, cases = 0;
function inspectSql(sql) {
  if (sqlCaptured !== null) assert.equal(sql, sqlCaptured);
  sqlCaptured = sql;
  assert.match(sql, /SELECT DISTINCT\n  'PUBLIC_RATE_LIMIT_RPC_REJECTED' AS marker/);
  assert.match(sql, /source = 'function_logs'/);
  assert.match(sql, /timestamp >= '2026-10-15 00:38:45'/);
  assert.match(sql, /timestamp < '2026-10-15 00:39:00'/);
  assert.match(sql, /position\(event_message, 'PUBLIC_RATE_LIMIT_RPC_REJECTED'\) = 1/);
  assert.match(sql, /"ravradar-assistant"/);
  assert.match(sql, /LIMIT 8$/);
  assert.doesNotMatch(sql, /UNNEST|JSONExtract|requestId|request_id|execution_id|SELECT\s+\*|edge_logs|postgres_logs|13 08:41/);
  const outputSelection = sql.slice(0, sql.indexOf('\nFROM'));
  assert.doesNotMatch(outputSelection, /event_message|log_attributes|request|payload/);
}
// Exercise only the two fixed RE2-pattern contracts locally with a literal
// POSIX-space translation. This is NOT a ClickHouse SQL evaluator or proof.
function fixedTextCategory(text) {
  const extracted = [...sqlCaptured.matchAll(/extract\(event_message,\s*'([^']+)'\)/g)].map(value => value[1]);
  const routePattern = /match\(event_message,\s*'([^']+)'\)/.exec(sqlCaptured)?.[1];
  assert.equal(extracted.length, 2); assert.equal(typeof routePattern, 'string');
  const expression = pattern => new RegExp(pattern.replaceAll('[[:space:]]', '\\s'));
  if (!text.startsWith(marker) || !expression(routePattern).test(text)) return [];
  const status = expression(extracted[0]).exec(text)?.[1] ?? '';
  const code = expression(extracted[1]).exec(text)?.[1] ?? '';
  return [{ marker, status: statuses.has(status) ? status : 'UNKNOWN', error_code: codes.has(code) ? code : 'UNKNOWN' }];
}
async function runCase(label, responseFactory, expected, expectedPairs = null) {
  const module = await import('./read-fixed-public-rate-console-log-20261015.mjs?offline_fixed_console_case=' + label);
  let caseRequests = 0;
  globalThis.fetch = async (url, init) => {
    requests++; caseRequests++;
    assert.equal(url.origin, 'https://api.supabase.com');
    assert.equal(url.pathname, '/v1/projects/afqhhdrkjfjtpadntdzo/analytics/endpoints/logs');
    assert.deepEqual([...url.searchParams.keys()].sort(), ['iso_timestamp_end','iso_timestamp_start','sql']);
    assert.equal(url.searchParams.get('iso_timestamp_start'), '2026-10-15T00:38:00Z');
    assert.equal(url.searchParams.get('iso_timestamp_end'), '2026-10-15T00:39:00Z');
    inspectSql(url.searchParams.get('sql'));
    assert.equal(init.method, 'GET'); assert.equal(init.body, undefined);
    assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store'); assert.equal(init.credentials, 'omit');
    assert.equal(init.signal instanceof AbortSignal, true);
    return responseFactory();
  };
  const report = await module.readFixedPublicRateConsoleLog20261015();
  cases++;
  assert.equal(report.requestStatus, expected, label);
  assert.equal(report.recordedEventAbsenceProved, false, 'Unknown formatting or no matches never proves event absence');
  assert.equal(report.privatePayloadLogged, false);
  assert.equal(report.scope.sqlStart, '2026-10-15T00:38:45Z');
  assert.equal(report.scope.sqlEndExclusive, '2026-10-15T00:39:00Z');
  assert.deepEqual(report.pairs, expectedPairs, label);
  assert.equal(report.rowCount, expectedPairs === null ? null : expectedPairs.length);
  assert.doesNotMatch(JSON.stringify(report), /PRIVATE_RAW|synthetic-fixed-console|Bearer|requestId|request_id|execution_id/);
  assert.equal(caseRequests, 1);
  assert.equal((await module.readFixedPublicRateConsoleLog20261015()).requestStatus, 'LOG_READ_ALREADY_CONSUMED');
  assert.equal(caseRequests, 1);
}
try {
  await runCase('fixed-category', () => valid([sample]), 'RECORDED_CATEGORIES', [sample]);
  const textCases = [
    ['deno', 'PUBLIC_RATE_LIMIT_RPC_REJECTED {\n route: "ravradar-assistant", window: "minute", status: 401, requestId: "PRIVATE_RAW_ID", errorCode: "PGRST301", errorCodePresent: true, authChallengePresent: true\n}', [sample]],
    ['json', 'PUBLIC_RATE_LIMIT_RPC_REJECTED ' + JSON.stringify({ route:'ravradar-assistant',window:'hour',status:403,requestId:'PRIVATE_RAW_ID',errorCode:'42501' }), [{marker,status:'403',error_code:'42501'}]],
    ['unknown-code', 'PUBLIC_RATE_LIMIT_RPC_REJECTED { route: "ravradar-assistant", status: 503, errorCode: "PRIVATE_RAW_CODE" }', [{marker,status:'503',error_code:'UNKNOWN'}]],
    ['unknown-status', 'PUBLIC_RATE_LIMIT_RPC_REJECTED { route: "ravradar-assistant", status: 599, errorCode: null }', [{marker,status:'UNKNOWN',error_code:'UNKNOWN'}]],
    ['unknown-format', 'PUBLIC_RATE_LIMIT_RPC_REJECTED route=ravradar-assistant status=401 errorCode=PGRST301 PRIVATE_RAW_TEXT', []],
    ['other-route', 'PUBLIC_RATE_LIMIT_RPC_REJECTED { route: "trip-log", status: 401, errorCode: "PGRST301" }', []],
    ['not-marker-start', 'PRIVATE_RAW_PREFIX PUBLIC_RATE_LIMIT_RPC_REJECTED { route: "ravradar-assistant", status: 401, errorCode: "PGRST301" }', []],
  ];
  for (const [label, text, expected] of textCases) await runCase(label, () => valid(fixedTextCategory(text)),
    expected.length ? 'RECORDED_CATEGORIES' : 'NO_MATCHING_FIXED_MARKER_CATEGORIES', expected);
  for (const code of codes) await runCase('code-' + code, () => valid([{marker,status:'UNKNOWN',error_code:code}]),
    'RECORDED_CATEGORIES', [{marker,status:'UNKNOWN',error_code:code}]);
  await runCase('optional-error', () => new Response(JSON.stringify({result:[sample]}), {status:200}), 'RECORDED_CATEGORIES', [sample]);
  const failures = [
    ['extra-row', () => valid([{...sample,event_message:'PRIVATE_RAW_MESSAGE',requestId:'PRIVATE_RAW_ID'}]), 'LOG_ROW_SHAPE'],
    ['marker', () => valid([{...sample,marker:'PRIVATE_RAW_MARKER'}]), 'LOG_MARKER_NOT_ALLOWED'],
    ['status-type', () => valid([{...sample,status:401}]), 'LOG_STATUS_TYPE'],
    ['status-not-allowed', () => valid([{...sample,status:'599'}]), 'LOG_STATUS_NOT_ALLOWED'],
    ['code-type', () => valid([{...sample,error_code:null}]), 'LOG_CODE_TYPE'],
    ['code-not-allowed', () => valid([{...sample,error_code:'PRIVATE_RAW_CODE'}]), 'LOG_CODE_NOT_ALLOWED'],
    ['duplicate', () => valid([sample,sample]), 'LOG_CATEGORY_DUPLICATE'],
    ['cap', () => valid(Array(8).fill(sample)), 'LOG_ROW_CAP_REACHED'],
    ['envelope-extra', () => new Response(JSON.stringify({result:[sample],error:null,PRIVATE_RAW_KEY:'PRIVATE_RAW'}), {status:200}), 'LOG_ENVELOPE_SHAPE'],
    ['query-error', () => new Response(JSON.stringify({result:[],error:'PRIVATE_RAW_QUERY_ERROR'}), {status:200}), 'LOG_QUERY_ERROR'],
    ['error-type', () => new Response(JSON.stringify({result:[],error:{PRIVATE_RAW_KEY:1}}), {status:200}), 'LOG_ERROR_FIELD_TYPE'],
    ['result-type', () => new Response(JSON.stringify({result:null,error:null}), {status:200}), 'LOG_RESULT_TYPE'],
    ['utf8', () => new Response(Uint8Array.from([0xff]), {status:200}), 'LOG_UTF8_INVALID'],
    ['invalid-json', () => new Response('{PRIVATE_RAW', {status:200}), 'LOG_JSON_INVALID'],
    ['http', () => new Response('PRIVATE_RAW_HTTP', {status:503}), 'LOG_HTTP_REJECTED'],
    ['length', () => new Response('PRIVATE_RAW', {status:200,headers:{'content-length':'32769'}}), 'LOG_BODY_TOO_LARGE'],
    ['stream-size', () => new Response(new Uint8Array(32769), {status:200}), 'LOG_BODY_TOO_LARGE'],
    ['transport', () => { throw Error('PRIVATE_RAW_TRANSPORT'); }, 'LOG_TRANSPORT_ERROR'],
    ['held-body', () => new Response(new ReadableStream({ start() {} }), {status:200}), 'LOG_DEADLINE_EXCEEDED'],
  ];
  for (const [label, response, expected] of failures) await runCase(label, response, expected);
  const module = await import('./read-fixed-public-rate-console-log-20261015.mjs?offline_fixed_console_case=arguments');
  let extra = 0; globalThis.fetch = async () => { extra++; throw Error('MUST_NOT_RUN'); };
  assert.equal((await module.readFixedPublicRateConsoleLog20261015({sql:'arbitrary'})).requestStatus, 'LOG_ARGUMENTS_FORBIDDEN');
  assert.equal(extra, 0);
  delete process.env.SUPABASE_ACCESS_TOKEN;
  assert.equal((await module.readFixedPublicRateConsoleLog20261015()).requestStatus, 'LOG_CREDENTIAL_UNAVAILABLE');
  assert.equal(extra, 0);
  assert.equal((await module.readFixedPublicRateConsoleLog20261015()).requestStatus, 'LOG_READ_ALREADY_CONSUMED');
} finally {
  globalThis.fetch = originalFetch; delete process.env.SUPABASE_ACCESS_TOKEN;
}
console.log(JSON.stringify({status:'PASS',fixedReaderCases:cases,controlledGETs:requests,
  realNetwork:0,retries:0,bodyDeadlineMs:10000,maximumResponseBytes:32768,rowCapRejectsAt:8,
  sqlRegexStringContractsOnly:true,nativeClickHouse:'UNRUN',hostedConsoleFormat:'UNRUN',rawPayloadOutput:false}));
