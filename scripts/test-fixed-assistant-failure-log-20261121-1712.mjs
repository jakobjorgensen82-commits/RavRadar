import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync,spawnSync} from 'node:child_process';
import {sourceCommandsForChangedPaths,buildSourceValidationPlan} from './validate-source-once.mjs';
import {isFixedAssistant1712WorkflowAddition,currentSourceTargets,currentWorkflowTargets,
  CURRENT_CONTRACT_COMMANDS} from './source-current-contract-plan.mjs';

// Offline fixtures. No hosted logs, SQL engine or real credentials.
const readerPath = './read-fixed-assistant-failure-log-20261121-1712.mjs';
const source = await fs.readFile(new URL(readerPath, import.meta.url), 'utf8');
const start = '2026-11-21T17:12:11Z', end = '2026-11-21T17:12:22Z';
const outputStart = '2026-11-21T23:44:41Z', outputEnd = '2026-11-21T23:44:48Z';
const outputStates = [
  'CHAT_LENGTH', 'CHAT_STOP_TEXT', 'CHAT_STOP_EMPTY', 'RESPONSES_TOKEN_LIMIT',
  'RESPONSES_COMPLETED_TEXT', 'RESPONSES_COMPLETED_NO_TEXT', 'UNKNOWN',
];
assert.equal(Date.parse(end) - Date.parse(start), 11_000);
assert.equal(Date.parse(outputEnd) - Date.parse(outputStart), 7_000);
const list = name => [...source.match(new RegExp('const ' + name + ' = Object.freeze\\(\\[([\\s\\S]*?)\\]\\);'))[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const stages = list('STAGES'), codes = list('REJECTION_CODES');

// Aktuel routing/adgang testes direkte. Arkivbytes bruges kun til kendt additiv afgrænsning.
const workflowPath='.github/workflows/deploy-trip-storage.yml';
const workflow=await fs.readFile(new URL('../'+workflowPath,import.meta.url),'utf8');
const archivedWorkflow=execFileSync('git',['-c','protocol.allow=never','cat-file','blob',
  '9ac7c1f6ed5b8959053efa8685e2b92270f13ca2:'+workflowPath],{
  cwd:new URL('../',import.meta.url),encoding:'utf8',timeout:10000,maxBuffer:128*1024,windowsHide:true,
  env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'},
});
// Kendt additivt testeksemplar på autentisk arkivindgang. Det aktuelle workflow er ikke helfilslåst.
const route="fixed-assistant-failure-log-read-20261121-1712";
const outputRoute="fixed-assistant-failure-log-read-20261121-2344";
const outputOption='--observed-de-2344';
let knownAddition=archivedWorkflow;
for(const [before,after]of [
  [
    "          - fixed-assistant-failure-log-read-20261101\n",
    "          - fixed-assistant-failure-log-read-20261101\n          - fixed-assistant-failure-log-read-20261121-1712\n"
  ],
  [
    " || inputs.operation == 'fixed-assistant-failure-log-read-20261101'",
    " || inputs.operation == 'fixed-assistant-failure-log-read-20261101' || inputs.operation == 'fixed-assistant-failure-log-read-20261121-1712'"
  ],
  [
    " && inputs.operation != 'fixed-assistant-failure-log-read-20261101'",
    " && inputs.operation != 'fixed-assistant-failure-log-read-20261101' && inputs.operation != 'fixed-assistant-failure-log-read-20261121-1712'"
  ],
  [
    "      - name: Read the one fixed 13 October Storage upload-log interval\n",
    "      - name: Read only the fixed 21 November 17:12 assistant failure categories\n        if: inputs.operation == 'fixed-assistant-failure-log-read-20261121-1712'\n        timeout-minutes: 1\n        run: node scripts/read-fixed-assistant-failure-log-20261121-1712.mjs\n        env:\n          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}\n\n      - name: Read the one fixed 13 October Storage upload-log interval\n"
  ]
]){
  assert.equal(knownAddition.split(before).length,2);knownAddition=knownAddition.replace(before,()=>after);
}
assert.equal(isFixedAssistant1712WorkflowAddition(archivedWorkflow,knownAddition),true);
const positions=[...workflow.matchAll(/^  ([a-z][a-z0-9-]+):\n/gm)];
const jobs=positions.map((m,i)=>({id:m[1],source:workflow.slice(m.index,positions[i+1]?.index??workflow.length)}));
// Samme lukkede operationsgrammatik som de eksisterende workflowprøver.
function operationAllows(job,operation){
  const expression=/^    if: \$\{\{ (.+) \}\}$/m.exec(job)?.[1];
  assert.ok(expression,'Hvert job skal have en eksplicit operationsbetingelse.');
  return expression.split(' || ').some(disjunction=>disjunction.split(' && ').every(clause=>{
    const match=/^inputs\.operation (==|!=) '([a-z0-9-]*)'$/.exec(clause);
    assert.ok(match,'Ukendt routinggrammatik må ikke accepteres.');
    return match[1]==='=='?operation===match[2]:operation!==match[2];
  }));
}
assert.equal(new Set(jobs.map(job=>job.id)).size,jobs.length);
const selected=operation=>jobs.filter(job=>operationAllows(job.source,operation)).map(job=>job.id);
assert.deepEqual(selected(route),['read-fixed-supabase-metadata']);
assert.deepEqual(selected(route+'-unknown'),['reject-unknown-operation']);
assert.deepEqual(selected(outputRoute),['read-fixed-supabase-metadata']);
assert.deepEqual(selected(outputRoute+'-unknown'),['reject-unknown-operation']);
assert.deepEqual(selected('fixed-assistant-failure-log-read-20261101'),['read-fixed-supabase-metadata']);
for(const [operation,job]of [['fixed-account-activity-hook-catalog-read','read-fixed-supabase-metadata'],
 ['fixed-account-activity-hook-enable','configure-fixed-account-activity-hook'],
 ['fixed-account-activity-hook-disable','configure-fixed-account-activity-hook']]){
  assert.deepEqual(selected(operation),[job],'A known fixed hook operation selects exactly its own job');
  assert.deepEqual(selected(operation+'-unknown'),['reject-unknown-operation']);
}
assert.equal(workflow.split('          - '+route+'\n').length,2);
assert.equal(workflow.split('          - '+outputRoute+'\n').length,2);
const job=jobs.find(row=>row.id==='read-fixed-supabase-metadata').source;
assert.ok(job.indexOf('test "$GITHUB_REPOSITORY" = jakobjorgensen82-commits/RavRadar')<job.indexOf('uses: actions/checkout@v7'));
for(const guard of ['test "$GITHUB_EVENT_NAME" = workflow_dispatch','test "$GITHUB_REF" = refs/heads/main',
  'test "$GITHUB_RUN_ATTEMPT" = 1','node scripts/weather-source-gate.mjs check',
  'steps.fixed_read_source.outputs.required','node scripts/check-fixed-supabase-account-read-idle.mjs'])assert.ok(job.includes(guard));
assert.match(job,/run: test "\$\{\{ steps\.fixed_read_source\.outputs\.required \}\}" = false/);
assert.equal(job.split('git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main').length,3);
assert.equal(job.split('git rev-parse HEAD^{commit}').length,3);
assert.equal(job.split('git rev-parse origin/main^{commit}').length,3);
assert.ok(job.indexOf('check-fixed-supabase-account-read-idle.mjs')<job.indexOf('node scripts/read-fixed-assistant-failure-log-20261121-1712.mjs'));
assert.match(job,/if: inputs\.operation == 'fixed-assistant-failure-log-read-20261121-1712'\n        timeout-minutes: 1\n        run: node scripts\/read-fixed-assistant-failure-log-20261121-1712\.mjs\n        env:\n          SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
// Kun den nye datobundne læser må få token på netop denne operation.
const stepPositions=[...job.matchAll(/^      - (?:name:|uses:).+$/gm)];
const credentialSteps=stepPositions.map((m,i)=>job.slice(m.index,stepPositions[i+1]?.index??job.length))
  .filter(source=>source.includes('SUPABASE_ACCESS_TOKEN:'));
const selectedCredentialSteps=credentialSteps.filter(source=>{
  const condition=/^        if: inputs\.operation == '([a-z0-9-]+)'$/m.exec(source);
  assert.ok(condition,'Et tokenbærende trin skal beholde sin faste operationsbetingelse.');
  return condition[1]===route;
});
assert.equal(selectedCredentialSteps.length,1);
assert.ok(selectedCredentialSteps[0].includes('run: node scripts/read-fixed-assistant-failure-log-20261121-1712.mjs'));
const outputCredentialSteps=credentialSteps.filter(step=>step.includes("if: inputs.operation == '"+outputRoute+"'"));
assert.equal(outputCredentialSteps.length,1);
assert.ok(outputCredentialSteps[0].includes('        timeout-minutes: 1\n'
  +'        run: node scripts/read-fixed-assistant-failure-log-20261121-1712.mjs '+outputOption+'\n'
  +'        env:\n          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}\n'));
assert.ok(job.indexOf(outputCredentialSteps[0])>job.indexOf('check-fixed-supabase-account-read-idle.mjs'));
assert.doesNotMatch(job,/--depth|--shallow|--deepen|continue-on-error|SUPABASE_DB_PASSWORD|SERVICE_ROLE|CLOUDFLARE_API|supabase db|functions deploy|wrangler|upload-artifact|cache\/save/);
assert.deepEqual(workflow.match(/^permissions:\n(?:  [^\n]+\n)+/gm),[
  'permissions:\n  contents: read\n  actions: read\n  pull-requests: read\n']);
assert.doesNotMatch(workflow,/^[ \t]+permissions:/m);
let workflowChecks=0;
for(const [before,after]of [
  [archivedWorkflow,archivedWorkflow],[knownAddition,knownAddition],
  [null,knownAddition],[archivedWorkflow,null],[archivedWorkflow,knownAddition+'\n# Ukendt ændring\n'],
  [archivedWorkflow,knownAddition.replace('test "$GITHUB_RUN_ATTEMPT" = 1','test "$GITHUB_RUN_ATTEMPT" = 2')],
  [archivedWorkflow,knownAddition.replace('  pull-requests: read','  pull-requests: write')],
  [archivedWorkflow,knownAddition.replace('node scripts/weather-source-gate.mjs check','node scripts/weather-source-gate.mjs unknown')],
  [archivedWorkflow,knownAddition.replace('check-fixed-supabase-account-read-idle.mjs','check-fixed-supabase-account-read-idle.mjs --unknown')],
  [archivedWorkflow,knownAddition.replace('read-fixed-assistant-failure-log-20261121-1712.mjs','read-fixed-assistant-failure-log-20261121-1712.mjs --sql ANY')],
  [archivedWorkflow,knownAddition.replace("inputs.operation == '"+route+"'","inputs.operation != '"+route+"'")],
  [archivedWorkflow,knownAddition.replaceAll('\n','\r\n')],
]){assert.equal(isFixedAssistant1712WorkflowAddition(before,after),false);workflowChecks++;}
const diagnosticCommands=CURRENT_CONTRACT_COMMANDS.assistantDiagnostic1712;
const sharedWorkflowOwners=[
  {area:'assistantDiagnostic',commands:CURRENT_CONTRACT_COMMANDS.assistantDiagnostic},
  {area:'assistantDiagnostic1712',commands:diagnosticCommands},
];
for(const file of ['scripts/read-fixed-assistant-failure-log-20261121-1712.mjs',
  'scripts/test-fixed-assistant-failure-log-20261121-1712.mjs']){
  assert.deepEqual(currentSourceTargets(file).owners,[sharedWorkflowOwners[1]]);
}
assert.deepEqual(currentSourceTargets(workflowPath).owners,sharedWorkflowOwners);
assert.deepEqual(currentWorkflowTargets(workflowPath).owners,sharedWorkflowOwners);
assert.deepEqual(diagnosticCommands,['node scripts/test-fixed-assistant-failure-log-20261121-1712.mjs']);
assert.deepEqual(sourceCommandsForChangedPaths([workflowPath,'scripts/read-fixed-assistant-failure-log-20261121-1712.mjs']),[
  'node scripts/test-fixed-assistant-failure-log-20261101.mjs',...diagnosticCommands]);
assert.equal(currentSourceTargets('scripts/test-integrated-cutover-readiness.mjs').owners
  .some(owner=>sharedWorkflowOwners.some(testOwner=>owner.area===testOwner.area)),false);
assert.throws(()=>sourceCommandsForChangedPaths(['.github/workflows/unclassified-assistant-diagnostic.yml']),
  /SOURCE_CHANGED_OWNER_REQUIRED/);
const packageScripts=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8')).scripts;
const normalPlan=buildSourceValidationPlan(packageScripts);
assert.equal([...normalPlan.preflight,...normalPlan.remaining,normalPlan.gate]
  .some(command=>command.includes('test-integrated-cutover-readiness.mjs')),false);
assert.equal(currentSourceTargets('scripts/read-fixed-assistant-failure-log-unknown.mjs'),null);
assert.equal(Object.hasOwn(process.env,'SUPABASE_ACCESS_TOKEN'),false);
let cliChecks=0;
for(const [args,status]of [[[],'LOG_CREDENTIAL_UNAVAILABLE'],[[outputOption],'LOG_CREDENTIAL_UNAVAILABLE'],
  [['--help'],'LOG_ARGUMENTS_FORBIDDEN'],[['--sql','ANY'],'LOG_ARGUMENTS_FORBIDDEN'],
  [[outputOption,'--sql','ANY'],'LOG_ARGUMENTS_FORBIDDEN']]){
  const child=spawnSync(process.execPath,['scripts/read-fixed-assistant-failure-log-20261121-1712.mjs',...args],{
    cwd:new URL('../',import.meta.url),env:process.env,encoding:'utf8',timeout:5000,maxBuffer:32768,windowsHide:true,
  });
  assert.equal(child.status,1);assert.equal(child.stderr,'');
  assert.equal(JSON.parse(child.stdout).requestStatus,status);cliChecks++;
}

assert.equal(Object.hasOwn(process.env, 'SUPABASE_ACCESS_TOKEN'), false,
  'En eksisterende hemmelighed må aldrig læses eller erstattes af denne fixture');
const originalFetch = globalThis.fetch;
process.env.SUPABASE_ACCESS_TOKEN = 'synthetic-fixed-assistant-NOT-A-CREDENTIAL';
const sample = { stage:'RESULT_VALIDATION', responseStatus:502, upstreamStatus:200, rejectionCode:'RESULT_EVIDENCE_UNKNOWN' };
const valid = result => new Response(JSON.stringify({ result, error:null }), { status:200 });
let requests = 0, cases = 0, sqlCaptured = null, historicalSql = null, outputSql = null;

function inspectSql(sql) {
  assert.equal(sql, historicalSql.replace('2026-11-01 00:27:03','2026-11-21 17:12:11')
    .replace('2026-11-01 00:27:16','2026-11-21 17:12:22'), 'The default call keeps the same fixed query.');
  if (sqlCaptured !== null) assert.equal(sql, sqlCaptured);
  sqlCaptured = sql;
  assert.match(sql, /^SELECT DISTINCT\n  CASE WHEN stage_raw IN /);
  assert.match(sql, /source = 'function_logs'/);
  assert.match(sql, /timestamp >= '2026-11-21 17:12:11'/);
  assert.match(sql, /timestamp < '2026-11-21 17:12:22'/);
  assert.match(sql, /position\(event_message, 'RAVRADAR_ASSISTANT_FAILURE'\) = 1/);
  assert.match(sql, /LIMIT 8$/);
  assert.doesNotMatch(sql, /2026-11-01|route|function_id|UNNEST|JSONExtract|requestId|execution_id|SELECT\s+\*|edge_logs|postgres_logs/);
  assert.doesNotMatch(sql.slice(0, sql.indexOf('\nFROM')), /event_message|log_attributes|request|payload|question/);
  for (const stage of stages) assert.ok(sql.includes("'" + stage + "'"));
  for (const code of codes) assert.ok(sql.includes(code));
}

// Kontrol af de eksisterende faste regexstrenge; ingen påstand om ClickHouse-eksekvering.
function fixedTextCategories(message, sql = sqlCaptured, withOutput = false) {
  const patterns = [...sql.matchAll(/extract\(event_message,\s*'([^']+)'\)/g)].map(m => m[1]);
  const filters = [...sql.matchAll(/match\(event_message,\s*'([^']+)'\)/g)].map(m => m[1]);
  assert.equal(patterns.length, withOutput ? 5 : 4); assert.equal(filters.length, 2);
  const regex = p => new RegExp(p.replaceAll('[[:space:]]', '\\s'));
  if (!message.startsWith('RAVRADAR_ASSISTANT_FAILURE') || !filters.every(p => regex(p).test(message))) return [];
  const values = patterns.map(p => regex(p).exec(message)?.[1] ?? '');
  if (withOutput && values[1] !== '502') return [];
  const category = { stage:stages.includes(values[0]) ? values[0] : 'UNKNOWN',
    responseStatus:!values[1] || values[1] === 'null' ? null : Number(values[1]),
    upstreamStatus:!values[2] || values[2] === 'null' ? null : Number(values[2]),
    rejectionCode:values[3] || null };
  if (withOutput) category.providerOutputState = values[4] || null;
  return [category];
}

function inspectOutputSql(sql) {
  if (outputSql !== null) assert.equal(sql, outputSql);
  outputSql = sql;
  const projection = ",\n  nullIf(output_raw, '') AS providerOutputState";
  const extraction = ',\n    extract(event_message,\n'
    + '      \'[{,][[:space:]]*"?providerOutputState"?[[:space:]]*:[[:space:]]*"('
    + outputStates.join('|') + ')"[[:space:]]*[,}]\') AS output_raw';
  const filter = "\nWHERE response_raw = '502'";
  for(const addition of [projection,extraction,filter]) assert.equal(sql.split(addition).length,2);
  assert.equal(sql.replace(projection,'').replace(extraction,'').replace(filter,'')
    .replace(', providerOutputState\nLIMIT 8','\nLIMIT 8')
    .replace('2026-11-21 23:44:41','2026-11-21 17:12:11')
    .replace('2026-11-21 23:44:48','2026-11-21 17:12:22'), sqlCaptured);
}

async function runCase(label, responseFactory, status, categories = null, withOutput = false) {
  const module = await import(readerPath + '?offline_1712=' + label);
  const read = withOutput ? module.readFixedAssistantFailureLog20261121_2344 : module.readFixedAssistantFailureLog20261121_1712;
  const scope = {startInclusive:withOutput ? outputStart : start, endExclusive:withOutput ? outputEnd : end};
  let count = 0;
  globalThis.fetch = async (url, init) => {
    requests++; count++;
    assert.equal(url.origin, 'https://api.supabase.com');
    assert.equal(url.pathname, '/v1/projects/afqhhdrkjfjtpadntdzo/analytics/endpoints/logs');
    assert.deepEqual([...url.searchParams.keys()].sort(), ['iso_timestamp_end','iso_timestamp_start','sql']);
    assert.equal(url.searchParams.get('iso_timestamp_start'), scope.startInclusive);
    assert.equal(url.searchParams.get('iso_timestamp_end'), scope.endExclusive);
    (withOutput ? inspectOutputSql : inspectSql)(url.searchParams.get('sql'));
    assert.equal(init.method, 'GET'); assert.equal(init.body, undefined);
    assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store'); assert.equal(init.credentials, 'omit');
    assert.equal(init.signal instanceof AbortSignal, true);
    return responseFactory();
  };
  const result = await read();
  cases++;
  assert.equal(result.kind, 'RAVRADAR_FIXED_ASSISTANT_FAILURE_LOG_READ_20261121_' + (withOutput ? '2344' : '1712') + '_V1');
  assert.equal(result.requestStatus, status, label);
  assert.equal(result.recordedEventAbsenceProved, false);
  assert.equal(result.privatePayloadLogged, false);
  assert.equal(result.functionName, 'ravradar-assistant');
  assert.deepEqual(result.scope, scope);
  assert.deepEqual(result.categories, categories, label);
  assert.equal(result.rowCount, categories === null ? null : categories.length);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_RAW|NOT-A-CREDENTIAL|Bearer|requestId|execution_id|question|event_message/);
  assert.equal(count, 1);
  assert.equal((await read()).requestStatus, 'LOG_READ_ALREADY_CONSUMED');
  const other = withOutput ? module.readFixedAssistantFailureLog20261121_1712 : module.readFixedAssistantFailureLog20261121_2344;
  assert.equal((await other()).requestStatus, 'LOG_READ_ALREADY_CONSUMED');
  assert.equal(count, 1);
}

try {
  const historical = await import('./read-fixed-assistant-failure-log-20261101.mjs?offline_1712=historical-query');
  globalThis.fetch = async (url, init) => {
    assert.equal(init.method,'GET');
    assert.equal(url.searchParams.get('iso_timestamp_start'),'2026-11-01T00:27:03Z');
    assert.equal(url.searchParams.get('iso_timestamp_end'),'2026-11-01T00:27:16Z');
    assert.equal(historicalSql,null);
    historicalSql = url.searchParams.get('sql');
    return valid([sample]);
  };
  assert.deepEqual((await historical.readFixedAssistantFailureLog20261101()).categories,[sample]);
  for (const [label, row] of [
    ['validation', sample],
    ['extraction', { ...sample, stage:'RESULT_EXTRACTION', rejectionCode:'RESULT_NOT_OBJECT' }],
    ['body', { ...sample, stage:'UPSTREAM_JSON_PARSE', rejectionCode:null }],
    ['unknown', { stage:'UNKNOWN', responseStatus:null, upstreamStatus:null, rejectionCode:null }],
  ]) await runCase(label, () => valid([row]), 'RECORDED_CATEGORIES', [row]);
  await runCase('empty', () => valid([]), 'NO_MATCHING_FIXED_MARKER_CATEGORIES', []);
  const messages = [
    ['json', 'RAVRADAR_ASSISTANT_FAILURE ' + JSON.stringify({schemaVersion:1,...sample,question:'PRIVATE_RAW'}), [sample]],
    ['deno', 'RAVRADAR_ASSISTANT_FAILURE {\n schemaVersion: 1,\n stage: "RESULT_VALIDATION",\n responseStatus: 502,\n upstreamStatus: 200,\n rejectionCode: "RESULT_EVIDENCE_UNKNOWN"\n}', [sample]],
    ['prefix', 'OTHER RAVRADAR_ASSISTANT_FAILURE ' + JSON.stringify({schemaVersion:1,...sample}), []],
    ['schema', 'RAVRADAR_ASSISTANT_FAILURE ' + JSON.stringify({schemaVersion:2,...sample}), []],
  ];
  for (const [label, message, rows] of messages) {
    const projected = fixedTextCategories(message);
    assert.deepEqual(projected, rows);
    await runCase(label, () => valid(projected), rows.length ? 'RECORDED_CATEGORIES' : 'NO_MATCHING_FIXED_MARKER_CATEGORIES', rows);
  }
  for (const [label, response, status] of [
    ['raw-row', () => valid([{...sample,event_message:'PRIVATE_RAW'}]), 'LOG_ROW_SHAPE'],
    ['stage', () => valid([{...sample,stage:'PRIVATE_RAW'}]), 'LOG_STAGE_NOT_ALLOWED'],
    ['response-type', () => valid([{...sample,responseStatus:'502'}]), 'LOG_RESPONSE_STATUS_NOT_ALLOWED'],
    ['response-range', () => valid([{...sample,responseStatus:399}]), 'LOG_RESPONSE_STATUS_NOT_ALLOWED'],
    ['upstream-range', () => valid([{...sample,upstreamStatus:600}]), 'LOG_UPSTREAM_STATUS_NOT_ALLOWED'],
    ['rejection', () => valid([{...sample,rejectionCode:'PRIVATE_RAW'}]), 'LOG_REJECTION_CODE_NOT_ALLOWED'],
    ['duplicate', () => valid([sample,sample]), 'LOG_CATEGORY_DUPLICATE'],
    ['cap', () => valid(Array(8).fill(sample)), 'LOG_ROW_CAP_REACHED'],
    ['envelope', () => new Response(JSON.stringify({result:[],error:null,PRIVATE_RAW:'PRIVATE_RAW'})), 'LOG_ENVELOPE_SHAPE'],
    ['query-error', () => new Response(JSON.stringify({result:[],error:'PRIVATE_RAW'})), 'LOG_QUERY_ERROR'],
    ['error-type', () => new Response(JSON.stringify({result:[],error:{PRIVATE_RAW:1}})), 'LOG_ERROR_FIELD_TYPE'],
    ['result-type', () => valid(null), 'LOG_RESULT_TYPE'],
    ['utf8', () => new Response(Uint8Array.from([255])), 'LOG_UTF8_INVALID'],
    ['json-invalid', () => new Response('{PRIVATE_RAW'), 'LOG_JSON_INVALID'],
    ['http', () => new Response('PRIVATE_RAW',{status:403}), 'LOG_HTTP_REJECTED'],
    ['length-shape', () => new Response('PRIVATE_RAW',{headers:{'content-length':'oops'}}), 'LOG_CONTENT_LENGTH_SHAPE'],
    ['length-cap', () => new Response('PRIVATE_RAW',{headers:{'content-length':'32769'}}), 'LOG_BODY_TOO_LARGE'],
    ['stream-cap', () => new Response(new Uint8Array(32769)), 'LOG_BODY_TOO_LARGE'],
    ['missing-body', () => new Response(null), 'LOG_BODY_UNAVAILABLE'],
    ['transport', () => {throw Error('PRIVATE_RAW');}, 'LOG_TRANSPORT_ERROR'],
    ['held-fetch', () => new Promise(() => {}), 'LOG_DEADLINE_EXCEEDED'],
    ['held-body', () => new Response(new ReadableStream({start(){}})), 'LOG_DEADLINE_EXCEEDED'],
  ]) await runCase(label, response, status);
  const output = {...sample,stage:'RESULT_EXTRACTION',rejectionCode:'RESULT_NOT_OBJECT',providerOutputState:'CHAT_LENGTH'};
  const accepted = outputStates.map(providerOutputState=>({...output,providerOutputState}));
  await runCase('output-categories',()=>valid(accepted),'RECORDED_CATEGORIES',accepted,true);
  for(const row of accepted) {
    const message = 'RAVRADAR_ASSISTANT_FAILURE ' + JSON.stringify({schemaVersion:1,...row,question:'PRIVATE_RAW'});
    assert.deepEqual(fixedTextCategories(message,outputSql,true),[row]);
    assert.deepEqual(fixedTextCategories(message.replace('"responseStatus":502','"responseStatus":503'),outputSql,true),[]);
    assert.deepEqual(fixedTextCategories('OTHER '+message,outputSql,true),[]);
    assert.deepEqual(fixedTextCategories(message.replace('"schemaVersion":1','"schemaVersion":2'),outputSql,true),[]);
  }
  const validation = {...sample,providerOutputState:null};
  await runCase('output-absent',()=>valid([validation]),'RECORDED_CATEGORIES',[validation],true);
  for (const [label, row, status] of [
    ['output-raw-field',{...output,event_message:'PRIVATE_RAW'},'LOG_ROW_SHAPE'],
    ['output-missing-field',sample,'LOG_ROW_SHAPE'],
    ['output-other-status',{...output,responseStatus:503},'LOG_RESPONSE_STATUS_NOT_ALLOWED'],
    ['output-unrecognized',{...output,providerOutputState:'PRIVATE_RAW'},'LOG_PROVIDER_OUTPUT_STATE_NOT_ALLOWED'],
    ['output-wrong-stage',{...output,stage:'RESULT_VALIDATION'},'LOG_PROVIDER_OUTPUT_STATE_NOT_ALLOWED'],
  ]) await runCase(label,()=>valid([row]),status,null,true);
  const module = await import(readerPath + '?offline_1712=arguments');
  let extra = 0; globalThis.fetch = async () => {extra++; throw Error('MUST_NOT_RUN');};
  const forbidden = {get sql(){throw Error('PRIVATE_RAW');}};
  assert.equal((await module.readFixedAssistantFailureLog20261121_1712(forbidden)).requestStatus, 'LOG_ARGUMENTS_FORBIDDEN');
  assert.equal((await module.readFixedAssistantFailureLog20261121_2344(forbidden)).requestStatus, 'LOG_ARGUMENTS_FORBIDDEN');
  delete process.env.SUPABASE_ACCESS_TOKEN;
  assert.equal((await module.readFixedAssistantFailureLog20261121_1712()).requestStatus, 'LOG_CREDENTIAL_UNAVAILABLE');
  assert.equal((await module.readFixedAssistantFailureLog20261121_1712()).requestStatus, 'LOG_READ_ALREADY_CONSUMED');
  assert.equal(extra, 0);
} finally {
  globalThis.fetch = originalFetch;
  delete process.env.SUPABASE_ACCESS_TOKEN;
}
console.log(JSON.stringify({status:'PASS',cases,controlledGETs:requests,scopeSeconds:11,
  legacyQueryPreserved:true,outputScopeSeconds:7,outputStateEnumCount:outputStates.length,
  realNetwork:0,retries:0,deadlineMs:10000,
  maximumResponseBytes:32768,rowCapRejectsAt:8,rawPayloadOutput:false,
  nativeClickHouse:'UNRUN',hostedConsoleFormat:'UNRUN',workflowWiring:'SOURCE_ONLY_TESTED_NOT_HOSTED',
  workflowChecks,cliChecks,currentWorkflowReadDirectly:true,historicalWorkflowUsedOnlyForBoundedDelta:true}));
