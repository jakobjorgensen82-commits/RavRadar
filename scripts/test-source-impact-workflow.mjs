import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {projectSourceImpactWorkflowFull,SOURCE_IMPACT_FULL_WORKFLOW_ORIGIN,
  SOURCE_IMPACT_FULL_WORKFLOW_SHA256,SOURCE_IMPACT_FULL_STEP_CONDITION,SOURCE_IMPACT_CONTROL_TARGETS,
  SOURCE_IMPACT_PR_READ_GRANT,inverseSourceImpactPrReadGrant,inverseSourceImpactSdkEarlyLinux,
  SOURCE_IMPACT_HOUR_EARLY_LINUX_REVIEW,inverseSourceImpactHourEarlyLinux}
  from './lib/source-impact-workflow-review.mjs';
import {inverseSourceImpactDmiPython,SOURCE_IMPACT_DMI_PYTHON_REVIEW,SOURCE_IMPACT_DMI_REQUIREMENTS_REVIEW,reviewedSourcePrWorkflowOrdinaryView} from './lib/source-impact-workflow-review.mjs';
import {verifyWorkflow,inverseSourceBeforePostgresWorkflow,inverseCandidatePublicSourceRunLine,
  CURRENT_JOB,AFTER_JOB,verifyReviewed90Workflow} from './national584-source-evidence.mjs';
import {inverseCurrent586PhaseUpload} from './native-postgres-evidence.mjs';

// Read-only normal caller/contract target. No source suite, SQL, API or provider.
const actualSource=reviewedSourcePrWorkflowOrdinaryView(fs.readFileSync(new URL('../.github/workflows/validate-pull-request.yml',import.meta.url),'utf8').replace(/\r\n/g,'\n'));
const source=inverseSourceImpactDmiPython(actualSource);
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const git=(ref,file)=>execFileSync('git',['show',ref+':'+file],{maxBuffer:65536,timeout:10000,
  env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',
    GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'},stdio:['ignore','pipe','pipe']}).toString();
const workflow='.github/workflows/validate-pull-request.yml',origin=git(SOURCE_IMPACT_FULL_WORKFLOW_ORIGIN,workflow);
assert.equal(sha(actualSource),SOURCE_IMPACT_DMI_REQUIREMENTS_REVIEW.afterSha256);
assert.equal(sha(source),SOURCE_IMPACT_DMI_PYTHON_REVIEW.beforeSha256);
assert.equal(Buffer.byteLength(actualSource),SOURCE_IMPACT_DMI_REQUIREMENTS_REVIEW.afterBytes);
assert(actualSource.indexOf('uses: actions/setup-python@v7')<actualSource.indexOf('Build deterministic source-tree content identity'));
assert(actualSource.indexOf('Install declared DMI dependencies')<actualSource.indexOf('Build deterministic source-tree content identity'));
assert.equal(actualSource.split("--timeout 15 --retries 0 --only-binary=:all: -r requirements-dmi.txt").length,2);
assert.equal(actualSource.split("import requests.adapters; import urllib3.util.retry; import eccodes; assert eccodes.codes_get_api_version() == '2.48.2'").length,2);
const failedRequestsOnly=SOURCE_IMPACT_DMI_REQUIREMENTS_REVIEW.hunks.reduce((value,hunk)=>value.replace(hunk.after,hunk.before),actualSource);
assert.equal(sha(failedRequestsOnly),SOURCE_IMPACT_DMI_PYTHON_REVIEW.afterSha256);
assert.equal(inverseSourceImpactDmiPython(failedRequestsOnly),source,'The genuine7428 historical bytes still have their exact whole407a inverse');
for(const mutation of [actualSource+'\n# UNKNOWN_DMI_ENVIRONMENT_VARIANT\n',
  actualSource.replace('python-version: "3.12"','python-version: "3.11"'),
  actualSource.replace("-r requirements-dmi.txt","-r requirements.txt"),
  actualSource.replace("codes_get_api_version() == '2.48.2'","codes_get_api_version() == '2.48.0'"),
  actualSource.replace('timeout-minutes: 2','timeout-minutes: 3')]){
  assert.equal(inverseSourceImpactDmiPython(mutation),mutation);assert.throws(()=>projectSourceImpactWorkflowFull(mutation));
}

assert.equal(sha(origin),SOURCE_IMPACT_FULL_WORKFLOW_SHA256);
assert.equal(projectSourceImpactWorkflowFull(source),origin,'WHOLE qualified 334 FULL bytes are preserved');
assert.equal(projectSourceImpactWorkflowFull(origin),origin);
verifyWorkflow(source);verifyWorkflow(origin);let passed=1;

// Actual authenticated commit->PR discovery needs the single inherited read grant.
function assertSourcePrDiscoveryReadGrant(value){
  assert.deepEqual(value.match(/^permissions:\n(?:  [^\n]+\n)+/gm)??[],
    ['permissions:\n  contents: read\n  actions: read\n  pull-requests: read\n']);
  assert.doesNotMatch(value,/^[ \t]+permissions:/m,'No job override may erase the inherited grant');
}
// Only the old grant oracle sees the exact SDK predecessor. The raw source
// above/below still owns the real SDK/full projection and unknown mutations.
const beforeHourEarlyLinux=inverseSourceImpactHourEarlyLinux(source);
const beforeSdkEarlyLinux=inverseSourceImpactSdkEarlyLinux(beforeHourEarlyLinux);
assert.equal(sha(beforeSdkEarlyLinux),SOURCE_IMPACT_PR_READ_GRANT.afterSha256);
assertSourcePrDiscoveryReadGrant(source);
const beforePrReadGrant=inverseSourceImpactPrReadGrant(beforeSdkEarlyLinux);
assert.equal(sha(beforePrReadGrant),SOURCE_IMPACT_PR_READ_GRANT.beforeSha256);
assert.equal(projectSourceImpactWorkflowFull(beforePrReadGrant),origin,'Exact old input remains admitted');
assert.equal(inverseSourceImpactPrReadGrant(inverseSourceImpactSdkEarlyLinux(inverseSourceImpactHourEarlyLinux(source.replaceAll('\n','\r\n')))),beforePrReadGrant);passed++;
for(const changed of [source.replace('  pull-requests: read\n',''),
  source.replace('  pull-requests: read','  pull-requests: write'),
  source.replace('  pull-requests: read\n','  pull-requests: read\n  pull-requests: read\n'),
  source.replace('  pull-requests: read\n','  pull-requests: read\n  issues: read\n'),
  source.replace('  validate:\n','  validate:\n    permissions: {}\n')]){
  assert.notEqual(changed,source);assert.throws(()=>assertSourcePrDiscoveryReadGrant(changed));
  if(sha(changed)!==SOURCE_IMPACT_PR_READ_GRANT.beforeSha256){
    assert.throws(()=>projectSourceImpactWorkflowFull(changed));assert.throws(()=>verifyWorkflow(changed));
  }else assert.equal(projectSourceImpactWorkflowFull(changed),origin);
  passed++;
}

// The new raw caller runs the hour-format target before SDK and every matrix
// step; only the exact outer inverse exposes the unchanged65cbe predecessor.
const hourReview=SOURCE_IMPACT_HOUR_EARLY_LINUX_REVIEW;
assert.equal(Buffer.byteLength(source),hourReview.afterBytes);assert.equal(sha(source),hourReview.afterSha256);
assert.equal(sha(beforeHourEarlyLinux),hourReview.beforeSha256);
assert.equal(beforeHourEarlyLinux.replace(hourReview.before,hourReview.after),source);
assert.equal(projectSourceImpactWorkflowFull(beforeHourEarlyLinux),origin);
assert.equal(inverseSourceImpactHourEarlyLinux(beforeHourEarlyLinux),beforeHourEarlyLinux);
const earlyStart=source.indexOf('      - name: Diagnose normal pack-reader closure on artificial data only\n');
const earlyEnd=source.indexOf('\n      - ',earlyStart+1),earlyStep=source.slice(earlyStart,earlyEnd);
assert(earlyStart>=0&&earlyEnd>earlyStart);
assert(earlyStep.includes('        timeout-minutes: 3\n'));
assert(earlyStep.includes('        run: >-\n'+hourReview.after));
assert.equal(source.split('node scripts/test-production-hour-lock-4.0.236.mjs &&\n').length,2);
const matrixStart=source.indexOf('      - name: Validate source contracts and release governance\n');
assert(matrixStart>earlyStart);
passed++;
for(const changed of [source.replace(hourReview.after,hourReview.before),
  source.replace(hourReview.after,hourReview.after.replace('4.0.236.mjs','4.0.236.mjs --unknown')),
  source.replace(hourReview.after,hourReview.after+hourReview.after),
  source+'\n# UNREVIEWED_HOUR_TARGET_CI\n']){
  if(changed===beforeHourEarlyLinux){assert.equal(projectSourceImpactWorkflowFull(changed),origin);}
  else {assert.equal(inverseSourceImpactHourEarlyLinux(changed),changed);assert.throws(()=>projectSourceImpactWorkflowFull(changed));assert.throws(()=>verifyWorkflow(changed));}
  passed++;
}

// Exercise the same existing current -> genuine historical workflow route
// used by test-account-statistics-assistant-callers and workflow-order checks.
const actual=inverseCurrent586PhaseUpload(inverseSourceBeforePostgresWorkflow(source));
verifyWorkflow(actual);
const historical=inverseCandidatePublicSourceRunLine(actual).replace(CURRENT_JOB,AFTER_JOB);
const recorded=git('b02745d6d2987ed0fd2913623b3809fd0ea02dd6',workflow);
assert.equal(historical,recorded);verifyReviewed90Workflow(historical);passed++;

// Execute the unmodified normal source-workflow section of the existing order
// caller, rather than importing its unrelated production/deploy test domains.
const order=fs.readFileSync(new URL('./test-workflow-validation-order-4.0.108.mjs',import.meta.url),'utf8');
const begin="const actualPullRequestValidation = fs.readFileSync(`${workflowDirectory}/validate-pull-request.yml`, 'utf8').replace(/\\r\\n/g, '\\n');";
const end="const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));";
assert.equal(order.split(begin).length,2);const start=order.indexOf(begin),finish=order.indexOf(end,start);
assert(finish>start);
new Function('fs','workflowDirectory','verifyCurrentNationalWorkflow','inverseSourceBeforePostgresWorkflow',
  'CURRENT_SOURCE_JOB','REVIEWED90_SOURCE_JOB','assert',order.slice(start,finish))(
  fs,fileURLToPath(new URL('../.github/workflows',import.meta.url)),verifyWorkflow,
  inverseSourceBeforePostgresWorkflow,CURRENT_JOB,AFTER_JOB,assert);
passed++;
const parityBegin='let sourceGatePathCount = 0;',parityEnd='assert.equal(sourceGatePathCount, 6,';
assert.equal(order.split(parityBegin).length,2);const parityStart=order.indexOf(parityBegin);
const parityFinish=order.indexOf(parityEnd,parityStart);assert(parityFinish>parityStart);
const markers=order.slice(order.indexOf('const sourceGateRequirementMarkers = ['),
  order.indexOf('const assertCopernicusSegmentJournal = '));
const parity=new Function('fs','workflowDirectory','sourceGateWorkflowNames','projectSourceImpactWorkflowFull','assert',
  markers+order.slice(parityStart,parityFinish)+'\nreturn sourceGatePathCount;');
assert.equal(parity(fs,fileURLToPath(new URL('../.github/workflows',import.meta.url)),
  ['validate-pull-request.yml'],projectSourceImpactWorkflowFull,assert),1);
passed++;

const rows=[...source.matchAll(/^      - (?:name|uses):[^\n]*\n/gm)];assert.equal(rows.length,21);
const blocks=rows.map((row,index)=>source.slice(row.index,rows[index+1]?.index??source.length));
for(let index=0;index<blocks.length;index++){
  const occurrences=blocks[index].split(SOURCE_IMPACT_FULL_STEP_CONDITION).length-1;
  assert.equal(occurrences,index>=4&&index<=18?1:0,'Only actual runtime steps 6–20 are conditional');
}
assert.equal(source.split('        if: ').length-1,15);
assert.equal(blocks[3].split('          GITHUB_TOKEN: ${{ github.token }}\n').length-1,1);
assert.equal(blocks[3].split('        run: node scripts/weather-source-gate.mjs impact-digest\n').length-1,1);
assert.equal(blocks[5].includes('uses: actions/setup-python@v7'),true);
for(const command of SOURCE_IMPACT_CONTROL_TARGETS){
  assert.equal(source.split(command+'\n').length-1,1,'Controller target appears exactly once');
  assert(blocks[6].includes('          && '+command+'\n'),'Controller target runs in actual step 8 after Python setup');
}
assert(blocks[20].includes("path: ${{ steps.source-content.outputs.receipt_path || '.cache/source-tree-content-proof.json' }}"));
passed++;

// The actual step-5 bridge reports only the closed FULL selection/reason.
// The workflow entrance and every runtime condition above remain unchanged.
const bridge=fs.readFileSync(new URL('./weather-source-gate.mjs',import.meta.url),'utf8').replace(/\r\n/g,'\n');
assert(bridge.includes("reason_code=${reasonCode}"));
assert(bridge.includes("JSON.stringify({selection: 'FULL', reason_code: reasonCode})"));
for(const reason of ['COMPLETE_DIFF_REQUIRES_FULL','CUMULATIVE_DIFF_REQUIRES_FULL',
  'FULL_BASELINE_NOT_QUALIFIED','NO_QUALIFIED_FULL_ANCESTOR','TARGETED_PRECONDITION_UNAVAILABLE'])assert(bridge.includes("'"+reason+"'"));
assert(!bridge.includes('JSON.stringify(impact)'));passed++;

const once=(from,to)=>{assert.equal(source.split(from).length,2);return source.replace(from,()=>to);};
const mutations=[
  source.replace(SOURCE_IMPACT_FULL_STEP_CONDITION,''),
  source.replace(SOURCE_IMPACT_FULL_STEP_CONDITION,SOURCE_IMPACT_FULL_STEP_CONDITION.replace('!=','==')),
  source.replace(SOURCE_IMPACT_FULL_STEP_CONDITION,'        if: always()\n'),
  once('      - name: Validate native PostgreSQL checkpoint CAS on artificial data only\n'+SOURCE_IMPACT_FULL_STEP_CONDITION,
    '      - name: Validate native PostgreSQL checkpoint CAS on artificial data only\n'),
  once('      - name: Validate isolated restart and two ordinary national followers\n'+SOURCE_IMPACT_FULL_STEP_CONDITION,
    '      - name: Validate isolated restart and two ordinary national followers\n'),
  once('      - name: Require validated source tree to remain unchanged\n',
    '      - name: Require validated source tree to remain unchanged\n'+SOURCE_IMPACT_FULL_STEP_CONDITION),
  once('      - name: Upload tree-content source validation proof\n',
    '      - name: Upload tree-content source validation proof\n'+SOURCE_IMPACT_FULL_STEP_CONDITION),
  once('      - name: Build deterministic source-tree content identity\n',
    '      - name: Build deterministic source-tree content identity\n        continue-on-error: true\n'),
  once('        run: node scripts/weather-source-gate.mjs impact-digest\n',
    '        run: node scripts/weather-source-gate.mjs digest\n'),
  once('  contents: read\n','  contents: write\n'),
  source.replace('          GITHUB_TOKEN: ${{ github.token }}\n','          GITHUB_TOKEN: ${{ secrets.UNRELATED }}\n'),
  once('          node scripts/native-postgres-evidence.mjs\n','          true\n'),
  once('        run: node scripts/national584-source-evidence.mjs\n','        run: true\n'),
  source.replace('run: npm run validate:source &&','run: true &&'),
  once('          && '+SOURCE_IMPACT_CONTROL_TARGETS[0]+'\n',''),
  once('          && '+SOURCE_IMPACT_CONTROL_TARGETS[5]+'\n',
    '          && '+SOURCE_IMPACT_CONTROL_TARGETS[5]+'\n          && '+SOURCE_IMPACT_CONTROL_TARGETS[5]+'\n'),
  once("path: ${{ steps.source-content.outputs.receipt_path || '.cache/source-tree-content-proof.json' }}",
    'path: .cache/source-targeted-impact-proof.json'),
  once('          node scripts/test-post-cutover-migration-routing.mjs &&\n',''),
  once('      - name: Validate bounded native current diagnosis on artificial data only\n',
    '      - name: Changed native gate\n'),
  source+'\n# unreviewed workflow delta\n',
];
for(const changed of mutations){assert.throws(()=>projectSourceImpactWorkflowFull(changed));assert.throws(()=>verifyWorkflow(changed));passed++;}
console.log(JSON.stringify({kind:'SOURCE_IMPACT_WORKFLOW_NORMAL_CALLER_TARGET',passed,failed:0,
  declaredSteps:rows.length,runtimeSteps:rows.length+1,fullControlTargets:SOURCE_IMPACT_CONTROL_TARGETS.length,
  wholeQualifiedFullProjectionSha256:sha(origin),genuineHistoricalWorkflowPreserved:true,
  sourceCommandsExecuted:0,nativeSqlExecuted:false,liveApiRequests:0,production:false,deliveryAuthority:false}));
