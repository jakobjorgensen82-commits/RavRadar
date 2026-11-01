import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
import { reviewedFixedAssistantFailureLegacyWorkflow } from './lib/fixed-assistant-failure-workflow-review.mjs';

// One normal offline caller target. No hosted logs, SQL engine or real token.
const text = async file => (await fs.readFile(new URL('../' + file, import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const workflow = await text('.github/workflows/deploy-trip-storage.yml');
const edge = await text('supabase/functions/ravradar-assistant/index.ts');
const contract = await text('supabase/functions/_shared/rav-assistant-contract.ts');
const route = 'fixed-assistant-failure-log-read-20261101';
assert.equal(workflow.split('          - ' + route + '\n').length, 2);
const readJob = workflow.slice(workflow.indexOf('  read-fixed-supabase-metadata:'), workflow.indexOf('  reject-unknown-operation:'));
assert.match(readJob, new RegExp("inputs.operation == '" + route + "'"));
for (const expression of [/GITHUB_RUN_ATTEMPT" = 1/, /weather-source-gate\.mjs check/,
  /steps\.fixed_read_source\.outputs\.required.*false/, /check-fixed-supabase-account-read-idle\.mjs/]) assert.match(readJob, expression);
assert.equal((readJob.match(/git fetch --no-tags origin \+refs\/heads\/main:refs\/remotes\/origin\/main/g) ?? []).length, 2);
assert.doesNotMatch(readJob, /--depth|--shallow|--deepen/);
assert.equal((readJob.match(/git rev-parse origin\/main\^\{commit\}/g) ?? []).length, 2);
assert.ok(readJob.indexOf('check-fixed-supabase-account-read-idle.mjs') < readJob.indexOf('node scripts/read-fixed-assistant-failure-log-20261101.mjs'));
assert.match(readJob, /if: inputs\.operation == 'fixed-assistant-failure-log-read-20261101'\n        timeout-minutes: 1\n        run: node scripts\/read-fixed-assistant-failure-log-20261101\.mjs\n        env:\n          SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
assert.doesNotMatch(readJob, /SUPABASE_DB_PASSWORD|SERVICE_ROLE|CLOUDFLARE_API|continue-on-error/);
for (const historical of ['typed-trip-catalog-read','fixed-public-rate-log-read',
  'fixed-public-rate-log-read-20261013','fixed-public-rate-console-read-20261015',
  'fixed-storage-upload-log-read-20261013']) assert.ok(readJob.includes("inputs.operation == '" + historical + "'"));
const unknown = workflow.slice(workflow.indexOf('  reject-unknown-operation:'), workflow.indexOf('  repair-existing-worker:'));
assert.ok(unknown.includes("inputs.operation != '" + route + "'"));

// The new caller above always sees raw current source. Historical consumers
// receive only this exact whole reviewed transition, never an arbitrary strip.
const digest = value => createHash('sha256').update(value).digest('hex');
const review = JSON.parse(await text('scripts/lib/fixed-assistant-failure-workflow-review.json'));
assert.equal(review.sourceHead, '14ade133b7f3b9557f312630a5b557086245b938');
const legacyWorkflow = reviewedFixedAssistantFailureLegacyWorkflow(workflow);
assert.equal(digest(legacyWorkflow), review.workflowBeforeSha256);
assert.equal(reviewedFixedAssistantFailureLegacyWorkflow(legacyWorkflow), legacyWorkflow);
assert.equal(reviewedFixedAssistantFailureLegacyWorkflow(workflow.replaceAll('\n','\r\n')), legacyWorkflow);
const legacyReadJob = legacyWorkflow.slice(legacyWorkflow.indexOf('  read-fixed-supabase-metadata:'), legacyWorkflow.indexOf('  reject-unknown-operation:'));
assert.doesNotMatch(legacyReadJob, /fixed-assistant-failure-log-read-20261101/);
let workflowInverseCases = 3;
for (const [before,after] of [
  ['test "$GITHUB_RUN_ATTEMPT" = 1','test "$GITHUB_RUN_ATTEMPT" = 2'],
  ['node scripts/weather-source-gate.mjs check','node scripts/weather-source-gate.mjs unknown'],
  ['node scripts/check-fixed-supabase-account-read-idle.mjs','node scripts/check-fixed-supabase-account-read-idle.mjs --unknown'],
  [route,route+'-unknown'],
]) {
  assert.notEqual(workflow.replace(before,after),workflow);
  assert.throws(()=>reviewedFixedAssistantFailureLegacyWorkflow(workflow.replace(before,after)), /FIXED_ASSISTANT_WORKFLOW_UNREVIEWED_BYTES/);
  workflowInverseCases++;
}

// Execute only the two actual historical oracle bodies, not their broad test
// programs. Both fail on the raw additive workflow and pass after exact inverse.
const integrated = await text('scripts/test-integrated-cutover-readiness.mjs');
const integratedStart = integrated.indexOf('const typedConsoleReadStep=');
const integratedEnd = integrated.indexOf('// Actual fixed reader idle guard',integratedStart);
assert(integratedStart >= 0 && integratedEnd > integratedStart);
const integratedOracle = integrated.slice(integratedStart,integratedEnd);
assert.equal(digest(integratedOracle),review.historicalOracleSha256.integrated);
assert.throws(()=>runInNewContext(integratedOracle,{assert,typedActualReadJob:readJob}), /two unchanged historical readers/);
runInNewContext(integratedOracle,{assert,typedActualReadJob:legacyReadJob});
const sourceValidation = await text('scripts/test-source-validation-once.mjs');
const sourceStart = sourceValidation.indexOf('const consoleOperation =');
const sourceEnd = sourceValidation.indexOf('\nconsole.log(`Source validation:',sourceStart);
const sourceOracle = sourceValidation.slice(sourceStart,sourceEnd);
assert(sourceStart >= 0 && sourceEnd > sourceStart);
assert.equal(digest(sourceOracle),review.historicalOracleSha256.sourceValidation);
const grammarStart = sourceValidation.indexOf('function operationAllows(job,operation)');
const grammarEnd = sourceValidation.indexOf('\n}\n',grammarStart)+3;
const grammar = sourceValidation.slice(grammarStart,grammarEnd);
const jobsStart = sourceValidation.indexOf('const fixedJobsSource =');
const jobsEnd = sourceValidation.indexOf('// A source fallback',jobsStart);
const jobsParser = sourceValidation.slice(jobsStart,jobsEnd);
assert(grammarStart >= 0 && grammarEnd > grammarStart && jobsStart >= 0 && jobsEnd > jobsStart);
const ci = await text('.github/workflows/validate-pull-request.yml');
const runSourceOracle = current => runInNewContext(grammar+'\n'+jobsParser+'\n'+sourceOracle,{
  assert,fixedWorkflow:current,
  actualFixedReadJob:current.slice(current.indexOf('  read-fixed-supabase-metadata:'),current.indexOf('  reject-unknown-operation:')),
  fs:{readFileSync(file,encoding){assert.equal(file,'.github/workflows/validate-pull-request.yml');assert.equal(encoding,'utf8');return ci;}},
});
assert.throws(()=>runSourceOracle(workflow),error=>error.code==='ERR_ASSERTION'&&error.actual===5&&error.expected===4);
runSourceOracle(legacyWorkflow);

// The new registry has its own exact additive proof. The completed admin
// fixture remains pinned to its original reviewed 14ade133 CODE and DATA.
const registryRaw = await text('scripts/lib/source-impact-domain-owners-594.json');
assert.equal(digest(registryRaw),review.registryAfterSha256);
const registry = JSON.parse(registryRaw), priorRegistry = structuredClone(registry);
for (const owner of review.registryDelta.owners) {
  const index = priorRegistry.owners.findIndex(value=>value.path===owner.path);
  assert(index>=0);assert.deepEqual(priorRegistry.owners[index],owner);priorRegistry.owners.splice(index,1);
}
for (const [file,entry] of Object.entries(review.registryDelta.newSources)) {
  assert.deepEqual(priorRegistry.sources[file],entry);delete priorRegistry.sources[file];
}
for (const [file,fields] of Object.entries(review.registryDelta.sourceArrayAdditions)) for (const [field,values] of Object.entries(fields)) for (const value of values) {
  const index = priorRegistry.sources[file][field].indexOf(value);assert(index>=0);priorRegistry.sources[file][field].splice(index,1);
}
for (const file of review.registryDelta.resourceFiles) {
  const index = priorRegistry.resourceFiles.indexOf(file);assert(index>=0);priorRegistry.resourceFiles.splice(index,1);
}
for (const [file,pairs] of Object.entries(review.registryDelta.exactSourceTransitions)) {
  assert.deepEqual(priorRegistry.exactSourceTransitions[file],pairs);delete priorRegistry.exactSourceTransitions[file];
}
assert.equal(priorRegistry.owners.length,90);
assert.equal(digest(JSON.stringify(priorRegistry,null,2)+'\n'),review.registryBeforeSha256);
assert.match(await text('scripts/test-source-impact-domain-plan.mjs'), /const adminReviewedHead='14ade133b7f3b9557f312630a5b557086245b938'/);

// Exercise the actual logger body. Remove only this exact TypeScript signature.
const signature = 'function reportAssistantFailure(stage: string, upstreamStatus: number | null, rejectionCode: string | null, responseStatus: number) {';
const loggerStart = edge.indexOf(signature), loggerEnd = edge.indexOf('\nDeno.serve(', loggerStart);
assert(loggerStart >= 0 && loggerEnd > loggerStart);
const rejectionBlock = /export const RAV_ASSISTANT_REJECTION_CODES = Object\.freeze\(\[([\s\S]*?)\]\);/.exec(contract);
assert(rejectionBlock);
const codes = [...rejectionBlock[1].matchAll(/"([A-Z_]+)"/g)].map(match => match[1]);
assert.equal(codes.length, 18);
const stagesBlock = /const stages = (\[[^\n]+\]);/.exec(edge.slice(loggerStart, loggerEnd));
assert(stagesBlock);
const stages = [...JSON.parse(stagesBlock[1]), 'UNKNOWN'];
let emitted = null;
const logger = runInNewContext(edge.slice(loggerStart, loggerEnd).replace(signature,
  'function reportAssistantFailure(stage, upstreamStatus, rejectionCode, responseStatus) {')
  + '\nreportAssistantFailure;', {
  RAV_ASSISTANT_REJECTION_CODES: codes,
  console: { warn(marker, value) { emitted = { marker, value: JSON.parse(JSON.stringify(value)) }; } },
});
logger('UPSTREAM_REQUEST', null, null, 504);
assert.equal(emitted.marker, 'RAVRADAR_ASSISTANT_FAILURE');
assert.deepEqual(Object.keys(emitted.value).sort(), ['rejectionCode','responseStatus','schemaVersion','stage','upstreamStatus']);
assert.deepEqual(emitted.value, {schemaVersion:1,stage:'UPSTREAM_REQUEST',responseStatus:504,upstreamStatus:null,rejectionCode:null});
logger('PRIVATE_RAW_STAGE', 999, 'PRIVATE_RAW_CODE', 399);
assert.deepEqual(emitted.value, {schemaVersion:1,stage:'UNKNOWN',responseStatus:null,upstreamStatus:null,rejectionCode:null});

assert.equal(Object.hasOwn(process.env, 'SUPABASE_ACCESS_TOKEN'), false,
  'Never inspect or replace an ambient credential in this offline target');
const originalFetch = globalThis.fetch;
process.env.SUPABASE_ACCESS_TOKEN = 'synthetic-fixed-assistant-NOT-A-CREDENTIAL';
const sample = {stage:'UPSTREAM_REQUEST',responseStatus:504,upstreamStatus:null,rejectionCode:null};
const valid = result => new Response(JSON.stringify({result,error:null}), {status:200});
let requests = 0, cases = 0, sqlCaptured = null;
function inspectSql(sql) {
  if (sqlCaptured !== null) assert.equal(sql, sqlCaptured);
  sqlCaptured = sql;
  assert.match(sql, /^SELECT DISTINCT\n  CASE WHEN stage_raw IN /);
  assert.match(sql, /source = 'function_logs'/);
  assert.match(sql, /timestamp >= '2026-11-01 00:27:03'/);
  assert.match(sql, /timestamp < '2026-11-01 00:27:16'/);
  assert.match(sql, /position\(event_message, 'RAVRADAR_ASSISTANT_FAILURE'\) = 1/);
  assert.match(sql, /LIMIT 8$/);
  assert.doesNotMatch(sql, /route|function_id|UNNEST|JSONExtract|requestId|execution_id|SELECT\s+\*|edge_logs|postgres_logs/);
  const output = sql.slice(0, sql.indexOf('\nFROM'));
  assert.doesNotMatch(output, /event_message|log_attributes|request|payload|question/);
  for (const stage of stages) assert.ok(sql.includes("'" + stage + "'"));
  for (const code of codes) assert.ok(sql.includes(code));
}
// Only literal fixed RE2 pattern contracts are checked here. This is not a
// ClickHouse evaluator, hosted format proof, or synthetic SQL execution claim.
function fixedTextCategories(message) {
  assert(sqlCaptured);
  const patterns = [...sqlCaptured.matchAll(/extract\(event_message,\s*'([^']+)'\)/g)].map(match => match[1]);
  const filters = [...sqlCaptured.matchAll(/match\(event_message,\s*'([^']+)'\)/g)].map(match => match[1]);
  assert.equal(patterns.length, 4); assert.equal(filters.length, 2);
  const expression = pattern => new RegExp(pattern.replaceAll('[[:space:]]', '\\s'));
  if (!message.startsWith('RAVRADAR_ASSISTANT_FAILURE') || !filters.every(pattern=>expression(pattern).test(message))) return [];
  const values = patterns.map(pattern => expression(pattern).exec(message)?.[1] ?? '');
  return [{stage:stages.includes(values[0])?values[0]:'UNKNOWN',
    responseStatus:values[1] === '' || values[1] === 'null'?null:Number(values[1]),
    upstreamStatus:values[2] === '' || values[2] === 'null'?null:Number(values[2]),
    rejectionCode:values[3] || null}];
}
async function runCase(label, responseFactory, expectedStatus, expectedCategories = null) {
  const module = await import('./read-fixed-assistant-failure-log-20261101.mjs?offline_fixed_assistant=' + label);
  let caseRequests = 0;
  globalThis.fetch = async (url, init) => {
    requests++; caseRequests++;
    assert.equal(url.origin, 'https://api.supabase.com');
    assert.equal(url.pathname, '/v1/projects/afqhhdrkjfjtpadntdzo/analytics/endpoints/logs');
    assert.deepEqual([...url.searchParams.keys()].sort(), ['iso_timestamp_end','iso_timestamp_start','sql']);
    assert.equal(url.searchParams.get('iso_timestamp_start'), '2026-11-01T00:27:03Z');
    assert.equal(url.searchParams.get('iso_timestamp_end'), '2026-11-01T00:27:16Z');
    inspectSql(url.searchParams.get('sql'));
    assert.equal(init.method, 'GET'); assert.equal(init.body, undefined);
    assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store'); assert.equal(init.credentials, 'omit');
    assert.equal(init.signal instanceof AbortSignal, true);
    return responseFactory();
  };
  const report = await module.readFixedAssistantFailureLog20261101();
  cases++;
  assert.equal(report.requestStatus, expectedStatus, label);
  assert.equal(report.recordedEventAbsenceProved, false);
  assert.equal(report.privatePayloadLogged, false);
  assert.equal(report.functionName, 'ravradar-assistant');
  assert.deepEqual(report.scope, {startInclusive:'2026-11-01T00:27:03Z',endExclusive:'2026-11-01T00:27:16Z'});
  assert.deepEqual(report.categories, expectedCategories, label);
  assert.equal(report.rowCount, expectedCategories === null ? null : expectedCategories.length);
  assert.doesNotMatch(JSON.stringify(report), /PRIVATE_RAW|NOT-A-CREDENTIAL|Bearer|requestId|execution_id|question|event_message/);
  assert.equal(caseRequests, 1);
  assert.equal((await module.readFixedAssistantFailureLog20261101()).requestStatus, 'LOG_READ_ALREADY_CONSUMED');
  assert.equal(caseRequests, 1);
}
try {
  await runCase('actual-safe-category', () => valid([sample]), 'RECORDED_CATEGORIES', [sample]);
  logger('UPSTREAM_REQUEST', null, null, 504);
  const deno = 'RAVRADAR_ASSISTANT_FAILURE {\n schemaVersion: 1,\n stage: "UPSTREAM_REQUEST",\n responseStatus: 504,\n upstreamStatus: null,\n rejectionCode: null\n}';
  const json = emitted.marker + ' ' + JSON.stringify(emitted.value);
  for (const [label,message,rows] of [
    ['deno-format',deno,[sample]], ['json-format',json,[sample]],
    ['not-prefix','PRIVATE_RAW_PREFIX '+json,[]],
    ['marker-suffix',json.replace('RAVRADAR_ASSISTANT_FAILURE','RAVRADAR_ASSISTANT_FAILURE_OTHER'),[]],
    ['wrong-schema',json.replace('"schemaVersion":1','"schemaVersion":2'),[]],
    ['unknown-format','RAVRADAR_ASSISTANT_FAILURE PRIVATE_RAW',[]],
    ['unknown-code',deno.replace('rejectionCode: null','rejectionCode: "PRIVATE_RAW_CODE"'),[sample]],
  ]) await runCase(label,()=>valid(fixedTextCategories(message)),rows.length?'RECORDED_CATEGORIES':'NO_MATCHING_FIXED_MARKER_CATEGORIES',rows);
  for (const stage of stages) {
    const row = {...sample,stage};
    await runCase('stage-'+stage,()=>valid([row]),'RECORDED_CATEGORIES',[row]);
  }
  for (const code of codes) {
    logger('RESULT_VALIDATION', 200, code, 502);
    const expected = {stage:'RESULT_VALIDATION',responseStatus:502,upstreamStatus:200,rejectionCode:code};
    await runCase('code-'+code,()=>valid(fixedTextCategories(emitted.marker+' '+JSON.stringify(emitted.value))), 'RECORDED_CATEGORIES',[expected]);
  }
  const seven = stages.map(stage=>({...sample,stage}));
  await runCase('seven-rows',()=>valid(seven),'RECORDED_CATEGORIES',seven);
  await runCase('optional-error',()=>new Response(JSON.stringify({result:[sample]}),{status:200}),'RECORDED_CATEGORIES',[sample]);
  await runCase('null-fields',()=>valid([{stage:'UNKNOWN',responseStatus:null,upstreamStatus:null,rejectionCode:null}]),'RECORDED_CATEGORIES',[{stage:'UNKNOWN',responseStatus:null,upstreamStatus:null,rejectionCode:null}]);
  const failures = [
    ['extra-row',()=>valid([{...sample,event_message:'PRIVATE_RAW_QUESTION'}]),'LOG_ROW_SHAPE'],
    ['stage',()=>valid([{...sample,stage:'PRIVATE_RAW'}]),'LOG_STAGE_NOT_ALLOWED'],
    ['response-type',()=>valid([{...sample,responseStatus:'504'}]),'LOG_RESPONSE_STATUS_NOT_ALLOWED'],
    ['response-range',()=>valid([{...sample,responseStatus:399}]),'LOG_RESPONSE_STATUS_NOT_ALLOWED'],
    ['upstream-range',()=>valid([{...sample,upstreamStatus:600}]),'LOG_UPSTREAM_STATUS_NOT_ALLOWED'],
    ['rejection',()=>valid([{...sample,rejectionCode:'PRIVATE_RAW'}]),'LOG_REJECTION_CODE_NOT_ALLOWED'],
    ['duplicate',()=>valid([sample,sample]),'LOG_CATEGORY_DUPLICATE'],
    ['cap',()=>valid(Array(8).fill(sample)),'LOG_ROW_CAP_REACHED'],
    ['envelope',()=>new Response(JSON.stringify({result:[sample],error:null,PRIVATE_RAW:'PRIVATE_RAW'}),{status:200}),'LOG_ENVELOPE_SHAPE'],
    ['query-error',()=>new Response(JSON.stringify({result:[],error:'PRIVATE_RAW_QUERY'}),{status:200}),'LOG_QUERY_ERROR'],
    ['error-type',()=>new Response(JSON.stringify({result:[],error:{PRIVATE_RAW:1}}),{status:200}),'LOG_ERROR_FIELD_TYPE'],
    ['result-type',()=>valid(null),'LOG_RESULT_TYPE'],
    ['utf8',()=>new Response(Uint8Array.from([255]),{status:200}),'LOG_UTF8_INVALID'],
    ['json',()=>new Response('{PRIVATE_RAW',{status:200}),'LOG_JSON_INVALID'],
    ['http',()=>new Response('PRIVATE_RAW',{status:503}),'LOG_HTTP_REJECTED'],
    ['content-length-shape',()=>new Response('PRIVATE_RAW',{status:200,headers:{'content-length':'oops'}}),'LOG_CONTENT_LENGTH_SHAPE'],
    ['content-length-cap',()=>new Response('PRIVATE_RAW',{status:200,headers:{'content-length':'32769'}}),'LOG_BODY_TOO_LARGE'],
    ['stream-cap',()=>new Response(new Uint8Array(32769),{status:200}),'LOG_BODY_TOO_LARGE'],
    ['missing-body',()=>new Response(null,{status:200}),'LOG_BODY_UNAVAILABLE'],
    ['transport',()=>{throw Error('PRIVATE_RAW_TRANSPORT');},'LOG_TRANSPORT_ERROR'],
    ['held-fetch',()=>new Promise(()=>{}),'LOG_DEADLINE_EXCEEDED'],
    ['held-body',()=>new Response(new ReadableStream({start(){}}),{status:200}),'LOG_DEADLINE_EXCEEDED'],
  ];
  for (const [label,response,expected] of failures) await runCase(label,response,expected);
  const module = await import('./read-fixed-assistant-failure-log-20261101.mjs?offline_fixed_assistant=arguments');
  let extra = 0; globalThis.fetch = async()=>{extra++;throw Error('MUST_NOT_RUN');};
  assert.equal((await module.readFixedAssistantFailureLog20261101({sql:'arbitrary',project:'other',start:'other'})).requestStatus,'LOG_ARGUMENTS_FORBIDDEN');
  assert.equal(extra,0);
  delete process.env.SUPABASE_ACCESS_TOKEN;
  assert.equal((await module.readFixedAssistantFailureLog20261101()).requestStatus,'LOG_CREDENTIAL_UNAVAILABLE');
  assert.equal((await module.readFixedAssistantFailureLog20261101()).requestStatus,'LOG_READ_ALREADY_CONSUMED');
  assert.equal(extra,0);
} finally {
  globalThis.fetch = originalFetch;
  delete process.env.SUPABASE_ACCESS_TOKEN;
}
console.log(JSON.stringify({status:'PASS',fixedReaderCases:cases,controlledGETs:requests,
  workflowInverseCases,historicalOracleBodiesPreserved:true,historicalBeforeFailAfterPass:2,additiveRegistryInverseProved:true,
  realNetwork:0,retries:0,bodyDeadlineMs:10000,maximumResponseBytes:32768,rowCapRejectsAt:8,
  actualLoggerBodyExecuted:true,sqlRegexStringContractsOnly:true,nativeClickHouse:'UNRUN',
  hostedConsoleFormat:'UNRUN',rawPayloadOutput:false}));
