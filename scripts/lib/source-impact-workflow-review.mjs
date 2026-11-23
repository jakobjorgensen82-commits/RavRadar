import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// One reviewed controller delta against the actually qualified 334 FULL path.
// This does not qualify a run or turn skipped SQL/national steps into success.
// Historical oracles receive the original WHOLE workflow after this contract
// has checked every new selection field and the exact new target registration.
export const SOURCE_IMPACT_FULL_WORKFLOW_ORIGIN='334ab797ab8f2eedd077a50dec8fc4b6a80c9127';
export const SOURCE_IMPACT_FULL_WORKFLOW_SHA256='0876eeadcf5ca712b5dcf054515829c12afe8637f6511e90b52aa87030a33f43';
export const SOURCE_IMPACT_FULL_STEP_CONDITION="        if: ${{ steps.source-content.outputs.selection != 'TARGETED' }}\n";
export const SOURCE_IMPACT_CONTROL_TARGETS=Object.freeze([
  'node scripts/test-source-impact-plan.mjs',
  'node scripts/test-source-impact-git-diff.mjs',
  'node --test scripts/test-source-impact-full-baseline.mjs',
  'node scripts/test-source-targeted-receipt.mjs',
  'node scripts/test-source-targeted-producer.mjs',
  'node scripts/test-source-targeted-consumer.mjs',
  'node scripts/test-source-impact-workflow.mjs',
]);
const ROUTING='          node scripts/test-post-cutover-migration-routing.mjs &&\n';
const TOKEN='          GITHUB_TOKEN: ${{ github.token }}\n';
const OLD_PATH='          path: .cache/source-tree-content-proof.json\n';
const NEW_PATH="          path: ${{ steps.source-content.outputs.receipt_path || '.cache/source-tree-content-proof.json' }}\n";
const TARGETS=SOURCE_IMPACT_CONTROL_TARGETS.map(command=>'          && '+command+'\n').join('');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const once=(source,from,to)=>{assert.equal(source.split(from).length,2,'Exact once-only reviewed workflow field required');
  return source.replace(from,()=>to);};

// Historical test fixture only. Run 1487 completed this workflow before the
// installation step stopped running the old blanket tests.
export function readHistoricalSourceSetupWorkflow(){
  return execFileSync('git',['-c','protocol.allow=never','cat-file','blob',
    '89ee37b537279253f72ce77df60ac90d4671a1a6:.github/workflows/validate-pull-request.yml'],{
    cwd:fileURLToPath(new URL('../../',import.meta.url)),encoding:'utf8',timeout:10000,maxBuffer:65536,
    env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'},
  });
}


// Fælles lukket miljøinverse. Ingen kildekvalifikation eller ny historisk pin.
export const OWNED_CACHE_NATIVE_EARLY_NODE24="      # Kun runtimeklargøring; faktisk nativearbejde vælges og kvalificeres normalt.\n      - name: Set up Node24 for selected owned-cache native contracts\n        uses: actions/setup-node@v7\n        with:\n          node-version: 24\n      - name: Retain actual Node24 executable for selected native contracts\n        shell: bash\n        run: |\n          set -euo pipefail\n          node -e \"const fs=require('node:fs');const p=fs.realpathSync(process.execPath);if(process.platform!=='linux'||process.versions.node.split('.')[0]!=='24'||/[\\r\\n]/.test(p))throw Error('SOURCE_NATIVE_NODE24_REQUIRED');fs.appendFileSync(process.env.GITHUB_ENV,'RAVRADAR_SOURCE_NODE24='+p+'\\n');\"\n\n";
const OWNED_CACHE_NATIVE_NODE22_ANCHOR="      - uses: actions/setup-node@v7\n        with:\n          node-version: 22\n";
export const OWNED_CACHE_NATIVE_EARLY_STEP_NAMES=Object.freeze([
  'Set up Node24 for selected owned-cache native contracts',
  'Retain actual Node24 executable for selected native contracts',
]);
const HISTORICAL_NATIONAL_STEP='Validate isolated restart and two ordinary national followers';
export const TARGETED_SOURCE_STEP_NAMES=Object.freeze(['Set up job','Run actions/checkout@v7','Require exact pull-request source head',
  'Run actions/setup-node@v7','Build deterministic source-tree content identity',
  'Diagnose normal pack-reader closure on artificial data only','Run actions/setup-python@v7',
  'Install source-gate dependencies','Set up Node24 for isolated acquisition contracts',
  'Install exact local cache-action dependencies without scripts','Verify locked cache API distribution without runtime calls',
  'Validate isolated acquisition ownership and raw-save cohort','Restore Node22 for existing source validation',
  'Validate bounded native current diagnosis on artificial data only','Validate source contracts and release governance',
  'Validate native PostgreSQL checkpoint CAS on artificial data only','Upload independently completed native586 PostgreSQL phase',
  HISTORICAL_NATIONAL_STEP,
  'Validate durable Copernicus current-reference baseline on artificial data only',
  'Validate download-inclusive DMI capacity on artificial data only','Require validated source tree to remain unchanged',
  'Upload tree-content source validation proof']);
export const TARGETED_DMI_PYTHON_SOURCE_STEP_NAMES=Object.freeze([
  ...TARGETED_SOURCE_STEP_NAMES.slice(0,4),'Run actions/setup-python@v7',
  'Install declared requests dependency before source planning',
  ...TARGETED_SOURCE_STEP_NAMES.slice(4,6),...TARGETED_SOURCE_STEP_NAMES.slice(7)]);
export const TARGETED_DMI_REQUIREMENTS_SOURCE_STEP_NAMES=Object.freeze(
  TARGETED_DMI_PYTHON_SOURCE_STEP_NAMES.map((name,index)=>index===5?'Install declared DMI dependencies before source planning':name));
export const TARGETED_OWNED_CACHE_NATIVE_SOURCE_STEP_NAMES=Object.freeze([
  ...TARGETED_DMI_REQUIREMENTS_SOURCE_STEP_NAMES.slice(0,3),...OWNED_CACHE_NATIVE_EARLY_STEP_NAMES,
  ...TARGETED_DMI_REQUIREMENTS_SOURCE_STEP_NAMES.slice(3),
]);

const CURRENT_SOURCE_STEP_NAMES=Object.freeze(TARGETED_OWNED_CACHE_NATIVE_SOURCE_STEP_NAMES
  .filter(name=>name!==HISTORICAL_NATIONAL_STEP));
const CURRENT_FULL_ONLY_STEPS=new Set(TARGETED_OWNED_CACHE_NATIVE_SOURCE_STEP_NAMES.slice(9,23));

const DMI_PYTHON_WORKFLOW_SHA256='742835aa72adb58c50f6f404f5c3c1308a7c11b0038a528a9b5a1ac6253b3cff';
const DMI_REQUIREMENTS_WORKFLOW_SHA256='2947d429c6df45cfc415ace970f4e5efc89410ca60d277de19529dde73882843';

// Samme normale stepform læses af CURRENT-forbrugeren og native-genbrug.
export function verifyTargetedSourceStepShape(job,workflowText){
  assert.equal(arguments.length,2);assert(Array.isArray(job.steps));
  const one=rows=>{assert.equal(rows.length,1);return rows[0];};
  const time=value=>{const n=Date.parse(value);assert(Number.isFinite(n));return n;};
  const modern=workflowText!==undefined;
  const current=modern&&hasDependencyOnlySourceSetup(workflowText);
  const currentReview=current?verifyCurrentSourceWorkflow(workflowText):null;
  // Project only the already reviewed whole CURRENT registration before the
  // independent owned-cache step shape; neither inverse grants source authority.
  const workflow=modern&&!current?inverseSourceImpactFullCurrent(workflowText):null;
  const previous=workflow===null?null:inverseOwnedCacheNativeWorkflow(workflow);
  const ownedCacheNative=current||previous!==workflow;
  const workflowHash=previous===null?null:sha(previous);
  if(modern&&!current)assert([DMI_PYTHON_WORKFLOW_SHA256,DMI_REQUIREMENTS_WORKFLOW_SHA256].includes(workflowHash),'EXACT_DMI_PYTHON_WORKFLOW_REQUIRED');
  if(ownedCacheNative&&!current)assert.equal(workflowHash,DMI_REQUIREMENTS_WORKFLOW_SHA256,'EXACT_OWNED_CACHE_NATIVE_PREDECESSOR_REQUIRED');
  const names=currentReview?currentReview.stepNames:ownedCacheNative?TARGETED_OWNED_CACHE_NATIVE_SOURCE_STEP_NAMES
    :modern?(workflowHash===DMI_PYTHON_WORKFLOW_SHA256?TARGETED_DMI_PYTHON_SOURCE_STEP_NAMES:TARGETED_DMI_REQUIREMENTS_SOURCE_STEP_NAMES):TARGETED_SOURCE_STEP_NAMES;
  assert.deepEqual(job.steps.filter(value=>value.number<=names.length).map(value=>value.number),Array.from({length:names.length},(_,i)=>i+1));
  for(let i=0;i<names.length;i++){
    const step=one(job.steps.filter(value=>value.number===i+1));assert.equal(step.name,names[i]);assert.equal(step.status,'completed');
    const oldIndex=ownedCacheNative?(i<3?i:i<5?-1:i-2):i;
    const skipped=currentReview?CURRENT_FULL_ONLY_STEPS.has(step.name)
      :modern?oldIndex>=7&&oldIndex<=20:i>=5&&i<=19;
    assert.equal(step.conclusion,skipped?'skipped':'success');
  }
  const selected=one(job.steps.filter(step=>step.name==='Build deterministic source-tree content identity'));
  const unchanged=one(job.steps.filter(step=>step.name==='Require validated source tree to remain unchanged'));
  const uploaded=one(job.steps.filter(step=>step.name==='Upload tree-content source validation proof'));
  assert(time(selected.started_at)<=time(selected.completed_at));assert(time(selected.completed_at)<=time(unchanged.started_at));
  assert(time(unchanged.started_at)<=time(unchanged.completed_at));assert(time(unchanged.completed_at)<=time(uploaded.started_at));assert(time(uploaded.started_at)<=time(uploaded.completed_at));
  return {proofTime:time(selected.completed_at),earliestArtifact:time(selected.started_at),latestArtifact:time(uploaded.completed_at)};
}

export function inverseOwnedCacheNativeWorkflow(value){
  assert.equal(arguments.length,1);assert.equal(typeof value,'string');
  const source=value.replace(/\r\n/g,'\n');
  if(!source.includes(OWNED_CACHE_NATIVE_EARLY_STEP_NAMES[0]))return source;
  return once(source,OWNED_CACHE_NATIVE_EARLY_NODE24+OWNED_CACHE_NATIVE_NODE22_ANCHOR,
    OWNED_CACHE_NATIVE_NODE22_ANCHOR);
}
export function isAdditiveOwnedCacheNativeWorkflowChange(before,after){
  if(arguments.length!==2||typeof before!=='string'||typeof after!=='string')return false;
  try{
    const old=before.replace(/\r\n/g,'\n'),next=after.replace(/\r\n/g,'\n');
    return old!==next&&inverseOwnedCacheNativeWorkflow(old)===old
      &&inverseOwnedCacheNativeWorkflow(next)===old;
  }catch{return false;}
}

export function hasDependencyOnlySourceSetup(value){
  if(typeof value!=='string')return false;
  const source=value.replace(/\r\n/g,'\n');
  if(!source.includes('      - name: '+OWNED_CACHE_NATIVE_EARLY_STEP_NAMES[0]+'\n'))return false;
  const start=source.indexOf('      - name: Install source-gate dependencies\n');
  if(start<0)return false;
  const end=source.indexOf('\n      - ',start+1),block=source.slice(start,end<0?undefined:end);
  return !block.includes('scripts/test-');
}

// Current source execution is checked by its actual read-only job, critical
// entrypoints and ordered source/PG/upload evidence. It is not projected into
// a historical whole-workflow hash or a claim to the old blanket self-tests.
export function verifyCurrentSourceWorkflow(value){
  assert.equal(arguments.length,1);assert.equal(typeof value,'string');
  const source=value.replace(/\r\n/g,'\n').replace(/^ *#[^\n]*\n/gm,'');
  assert(hasDependencyOnlySourceSetup(source),'CURRENT_SOURCE_DEPENDENCY_ONLY_SETUP_REQUIRED');
  assert.deepEqual(source.match(/^[a-z][a-z-]*:/gm),['name:','on:','permissions:','concurrency:','jobs:']);
  assert.match(source,/\non:\n  pull_request:\n\npermissions:\n  contents: read\n  actions: read\n  pull-requests: read\n\nconcurrency:/);
  assert.match(source,/\njobs:\n  validate:\n    name: Source validation and release gate\n    runs-on: ubuntu-24\.04\n    timeout-minutes: 180\n    steps:\n/);
  assert.deepEqual(source.slice(source.indexOf('\njobs:')).match(/^  \S[^\n]*:/gm),['  validate:']);
  assert.doesNotMatch(source,/^[ \t]+(?:permissions|continue-on-error|defaults|strategy|needs):|\bsecrets\.|:\s*write\b/m);
  const rows=[...source.matchAll(/^      - (name|uses):([^\n]+)\n/gm)];
  const blocks=rows.map((row,index)=>source.slice(row.index,rows[index+1]?.index??source.length));
  const names=rows.map(row=>(row[1]==='uses'?'Run ':'')+row[2].trim());
  const historicalNational=names.includes(HISTORICAL_NATIONAL_STEP);
  const stepNames=historicalNational?TARGETED_OWNED_CACHE_NATIVE_SOURCE_STEP_NAMES:CURRENT_SOURCE_STEP_NAMES;
  assert.deepEqual(names,stepNames.slice(1));
  assert.deepEqual(source.match(/^ {6}- .+$/gm),rows.map(row=>row[0].trimEnd()));
  const block=name=>blocks[names.indexOf(name)];
  const run=name=>{
    const value=block(name),match=/\n        run: ([^\n]*)\n/.exec(value);
    assert(match,'CURRENT_SOURCE_RUN_REQUIRED: '+name);
    if(!['>-','|'].includes(match[1]))return match[1];
    return value.slice(match.index+match[0].length).split('\n')
      .filter(line=>line.startsWith('          ')).map(line=>line.trim()).join(' ');
  };
  for(const name of names){
    const conditions=block(name).match(/^ +if: .*\n/gm)??[];
    assert.deepEqual(conditions,CURRENT_FULL_ONLY_STEPS.has(name)?[SOURCE_IMPACT_FULL_STEP_CONDITION]:[],'CURRENT_SOURCE_STEP_CONDITION');
  }
  assert.deepEqual(source.match(/^        id: .+$/gm),['        id: source-content']);
  const proofEnvironment=[
    '          GITHUB_TOKEN: ${{ github.token }}',
    '          SOURCE_GATE_HEAD_SHA: ${{ github.event.pull_request.head.sha }}',
    '          PULL_REQUEST_NUMBER: ${{ github.event.pull_request.number }}',
  ];
  const proofSteps=['Build deterministic source-tree content identity',
    'Validate native PostgreSQL checkpoint CAS on artificial data only'];
  if(historicalNational)proofSteps.push(HISTORICAL_NATIONAL_STEP);
  for(const name of proofSteps){
    assert.deepEqual(block(name).match(/^          [A-Z][A-Z0-9_]*: .+$/gm),proofEnvironment);
  }
  assert(block('Run actions/checkout@v7').includes('fetch-depth: 0')
    &&block('Run actions/checkout@v7').includes('ref: ${{ github.event.pull_request.head.sha }}'));
  assert(run('Require exact pull-request source head').includes('test "$(git rev-parse HEAD^{commit})" = "$EXPECTED_HEAD_SHA"'));
  assert.match(block('Set up Node24 for selected owned-cache native contracts'),/\n        uses: actions\/setup-node@v7\n        with:\n          node-version: 24\n/);
  assert.match(block('Retain actual Node24 executable for selected native contracts'),/process\.versions\.node\.split\('\.'\)\[0\]!=='24'/);
  assert.match(block('Retain actual Node24 executable for selected native contracts'),/RAVRADAR_SOURCE_NODE24=/);
  assert.equal(run('Install source-gate dependencies'),
    'python -m pip install --disable-pip-version-check -r requirements-dmi.txt -r requirements-geometry.txt -r requirements-copernicus.txt');
  assert.equal(run('Build deterministic source-tree content identity'),'node scripts/weather-source-gate.mjs impact-digest');
  assert.equal(run('Validate source contracts and release governance'),
    'npm run validate:source && node scripts/test-fixed-public-rate-log-20261013.mjs && node scripts/test-fixed-storage-upload-log-20261013.mjs && node scripts/test-fixed-public-rate-console-log-20261015.mjs && node scripts/test-prepare-candidate-g-operational-rollback.mjs && node scripts/test-candidate-g-rollback-public-stage.mjs');
  assert.equal(run('Validate native PostgreSQL checkpoint CAS on artificial data only'),
    'set -euo pipefail node --test scripts/test-native-postgres-evidence.mjs node scripts/native-postgres-evidence.mjs');
  if(historicalNational)assert.equal(run(HISTORICAL_NATIONAL_STEP),'node scripts/national584-source-evidence.mjs');
  for(const [name,markers] of [
    ['Upload independently completed native586 PostgreSQL phase',[
      'uses: actions/upload-artifact@v7','name: native586-phase-${{ github.run_id }}-${{ github.run_attempt }}-${{ github.event.pull_request.head.sha }}',
      'path: .cache/native-postgres-phase-proof.json','if-no-files-found: error']],
    ['Require validated source tree to remain unchanged',[
      'tracked_status="$(git status --short --untracked-files=no)"','if [[ -n "$tracked_status" ]]','exit 1','test -z "$tracked_status"']],
    ['Upload tree-content source validation proof',[
      'uses: actions/upload-artifact@v7','name: ${{ steps.source-content.outputs.artifact_name }}',
      "path: ${{ steps.source-content.outputs.receipt_path || '.cache/source-tree-content-proof.json' }}",'if-no-files-found: error']],
  ])for(const marker of markers)assert(block(name).includes(marker),'CURRENT_SOURCE_CRITICAL_FRAME: '+marker);
  assert.doesNotMatch(source,/\b(?:curl|wget|supabase|wrangler)\s|DMI_API_KEY|COPERNICUSMARINE_SERVICE_PASSWORD|SUPABASE_SERVICE_ROLE_KEY/);
  return {scope:'CURRENT_SOURCE_WORKFLOW',dependencySetupOnly:true,
    historicalBlanketExecuted:false,sourceBeforeNative:true,nativeUploadNumber:20,stepNames,historicalNational};
}

// Exact test-only outer inverse: the hour-lock target is selected before SDK
// in the same existing three-minute Linux step. The SDK history below is intact.
export const SOURCE_IMPACT_HOUR_EARLY_LINUX_REVIEW=Object.freeze({
  "beforeSha256": "65cbe5b0149c83c73626c759b7eb2404ae326c4c8267a740fb1082d7fcb6685a",
  "afterSha256": "407a84f9a0159fff736b04624d029208451ef27e241a078eb8a0b4d16406469e",
  "beforeBytes": 9344,
  "afterBytes": 9408,
  "before": "          node scripts/reclaim-runner-android-sdk.mjs &&\n",
  "after": "          node scripts/test-production-hour-lock-4.0.236.mjs &&\n          node scripts/reclaim-runner-android-sdk.mjs &&\n"
});
export function inverseSourceImpactHourEarlyLinux(value){
  assert.equal(arguments.length,1);assert.equal(typeof value,'string');
  const source=value.replace(/\r\n/g,'\n'),review=SOURCE_IMPACT_HOUR_EARLY_LINUX_REVIEW;
  if(sha(source)!==review.afterSha256)return source;
  assert.equal(Buffer.byteLength(source),review.afterBytes);
  const before=once(source,review.after,review.before);
  assert.equal(Buffer.byteLength(before),review.beforeBytes);
  assert.equal(sha(before),review.beforeSha256,'Exact whole hour-lock Linux predecessor');
  assert.equal(once(before,review.before,review.after),source,'Exact hour-lock Linux round trip');
  return before;
}

// The actual fixed SDK caller runs before the same existing short Linux matrix.
// Only this exact whole workflow may inverse the reviewed command and timeout.
export const SOURCE_IMPACT_SDK_EARLY_LINUX_REVIEW=Object.freeze({
  beforeSha256:'45b1a6f3dba31711b8fa8d4cff8776c3f7daa024acc798c4da76bee4615eced1',
  afterSha256:'65cbe5b0149c83c73626c759b7eb2404ae326c4c8267a740fb1082d7fcb6685a',
  before:"        timeout-minutes: 2\n        run: >-\n          node scripts/test-post-cutover-migration-routing.mjs &&\n",
  after:"        timeout-minutes: 3\n        run: >-\n          node scripts/reclaim-runner-android-sdk.mjs &&\n          node scripts/test-post-cutover-migration-routing.mjs &&\n",
});
export function inverseSourceImpactSdkEarlyLinux(value){
  assert.equal(arguments.length,1);assert.equal(typeof value,'string');
  const source=value.replace(/\r\n/g,'\n'),review=SOURCE_IMPACT_SDK_EARLY_LINUX_REVIEW;
  if(sha(source)!==review.afterSha256)return source;
  const before=once(source,review.after,review.before);
  assert.equal(sha(before),review.beforeSha256,'Exact whole SDK early-Linux predecessor');
  assert.equal(once(before,review.before,review.after),source,'Exact SDK early-Linux round trip');
  return before;
}


export const SOURCE_IMPACT_PR_READ_GRANT=Object.freeze({
  "workflow": ".github/workflows/validate-pull-request.yml",
  "beforeSha256": "3838f9009f7df679581cea1a54eeba535bf4b0c90ae6e786691ba46dedd5afc5",
  "afterSha256": "45b1a6f3dba31711b8fa8d4cff8776c3f7daa024acc798c4da76bee4615eced1",
  "before": "permissions:\n  contents: read\n  actions: read\n",
  "after": "permissions:\n  contents: read\n  actions: read\n  pull-requests: read\n"
});
// Test-only: exact whole grant inverse before unchanged qualified FULL oracles.
export function inverseSourceImpactPrReadGrant(value){
  assert.equal(arguments.length,1);assert.equal(typeof value,'string');
  let source=value.replace(/\r\n/g,'\n');
  if(sha(source)!==SOURCE_IMPACT_PR_READ_GRANT.afterSha256)return source;
  source=once(source,SOURCE_IMPACT_PR_READ_GRANT.after,SOURCE_IMPACT_PR_READ_GRANT.before);
  assert.equal(sha(source),SOURCE_IMPACT_PR_READ_GRANT.beforeSha256,'Exact whole PR-read predecessor');
  return source;
}

export const SOURCE_IMPACT_DMI_PYTHON_REVIEW=Object.freeze({
  "beforeSha256": "407a84f9a0159fff736b04624d029208451ef27e241a078eb8a0b4d16406469e",
  "afterSha256": "742835aa72adb58c50f6f404f5c3c1308a7c11b0038a528a9b5a1ac6253b3cff",
  "beforeBytes": 9408,
  "afterBytes": 9822,
  "oldPythonStep": "      - uses: actions/setup-python@v7\n        if: ${{ steps.source-content.outputs.selection != 'TARGETED' }}\n        with:\n          python-version: \"3.12\"\n\n",
  "buildStepHeader": "      - name: Build deterministic source-tree content identity\n",
  "earlyEnvironment": "      # Environment only: the unchanged producer still verifies the whole\n      # real plan and ROOT review before any target or source receipt.\n      - uses: actions/setup-python@v7\n        with:\n          python-version: \"3.12\"\n\n      - name: Install declared requests dependency before source planning\n        timeout-minutes: 2\n        run: >-\n          python -m pip install --disable-pip-version-check --no-input\n          --timeout 15 --retries 0 --only-binary=:all: 'requests>=2.32,<3'\n          && python -c \"import requests.adapters; import urllib3.util.retry\"\n\n"
});
export const SOURCE_IMPACT_DMI_REQUIREMENTS_REVIEW=Object.freeze({
  "beforeSha256": "742835aa72adb58c50f6f404f5c3c1308a7c11b0038a528a9b5a1ac6253b3cff",
  "afterSha256": "2947d429c6df45cfc415ace970f4e5efc89410ca60d277de19529dde73882843",
  "beforeBytes": 9822,
  "afterBytes": 9891,
  "hunks": [
    {
      "before": "Install declared requests dependency before source planning",
      "after": "Install declared DMI dependencies before source planning"
    },
    {
      "before": "--timeout 15 --retries 0 --only-binary=:all: 'requests>=2.32,<3'",
      "after": "--timeout 15 --retries 0 --only-binary=:all: -r requirements-dmi.txt"
    },
    {
      "before": "&& python -c \"import requests.adapters; import urllib3.util.retry\"",
      "after": "&& python -c \"import requests.adapters; import urllib3.util.retry; import eccodes; assert eccodes.codes_get_api_version() == '2.48.2'\""
    }
  ]
});
export function inverseSourceImpactDmiPython(value){
  assert.equal(arguments.length,1);assert.equal(typeof value,'string');
  let source=inverseSourceImpactFullCurrent(value);const review=SOURCE_IMPACT_DMI_PYTHON_REVIEW;
  if(sha(source)===SOURCE_IMPACT_DMI_REQUIREMENTS_REVIEW.afterSha256){
    const correction=SOURCE_IMPACT_DMI_REQUIREMENTS_REVIEW;assert.equal(Buffer.byteLength(source),correction.afterBytes);
    for(const hunk of correction.hunks)source=once(source,hunk.after,hunk.before);
    assert.equal(Buffer.byteLength(source),correction.beforeBytes);assert.equal(sha(source),correction.beforeSha256);
  }
  if(sha(source)!==review.afterSha256)return source;
  assert.equal(Buffer.byteLength(source),review.afterBytes);
  source=once(source,review.earlyEnvironment+review.buildStepHeader,review.buildStepHeader);
  const anchor='      - name: Install source-gate dependencies\n';
  source=once(source,anchor,review.oldPythonStep+anchor);
  assert.equal(Buffer.byteLength(source),review.beforeBytes);assert.equal(sha(source),review.beforeSha256);
  return source;
}

// FULL-testen har et fast budget på 480 sekunder; den autentiske form med 300 sekunder bevares.
export const SOURCE_IMPACT_FULL_CURRENT_COMMAND='timeout --signal=KILL 480s node --test scripts/test-source-current-contracts.mjs';
export const SOURCE_IMPACT_FULL_CURRENT_PREVIOUS_COMMAND='timeout --signal=KILL 300s node --test scripts/test-source-current-contracts.mjs';
export function inverseSourceImpactFullCurrent(value){
  assert.equal(arguments.length,1);assert.equal(typeof value,'string');
  const source=value.replace(/\r\n/g,'\n');
  if(!source.includes('test-source-current-contracts.mjs'))return source;
  const anchor='          && node scripts/test-source-impact-workflow.mjs\n';
  const commands=[SOURCE_IMPACT_FULL_CURRENT_COMMAND,SOURCE_IMPACT_FULL_CURRENT_PREVIOUS_COMMAND]
    .filter(command=>source.includes('          && '+command+'\n'));
  assert.equal(commands.length,1,'Kun én præcis aktuel eller historisk FULL/CURRENT-kalder');
  const addition='          && '+commands[0]+'\n';
  const before=once(source,anchor+addition,anchor);
  assert.equal(sha(inverseOwnedCacheNativeWorkflow(before)),SOURCE_IMPACT_DMI_REQUIREMENTS_REVIEW.afterSha256,
    'Kun den præcise eksisterende FULL-kalder kan få hele CURRENT');
  assert.equal(once(before,anchor,anchor+addition),source,'Hele CURRENT-registreringen har præcis inverse');
  return before;
}

export function projectSourceImpactWorkflowFull(value){
  assert.equal(arguments.length,1);assert.equal(typeof value,'string');
  let source=inverseSourceImpactPrReadGrant(inverseSourceImpactSdkEarlyLinux(inverseSourceImpactHourEarlyLinux(inverseSourceImpactDmiPython(inverseOwnedCacheNativeWorkflow(value)))));
  if(sha(source)===SOURCE_IMPACT_FULL_WORKFLOW_SHA256)return source;
  const selected=/steps\.source-content\.outputs\.(?:selection|receipt_path)|test-source-(?:impact|targeted)-/.test(source);
  if(selected){
    const rows=[...source.matchAll(/^      - (?:name|uses):[^\n]*\n/gm)];
    // GitHub adds Set up job as step 1: 21 YAML entries retain runtime 2–22.
    assert.equal(rows.length,21,'Keep 21 declared steps and GitHub Set up job: 22 runtime steps');
    const blocks=rows.map((row,index)=>source.slice(row.index,rows[index+1]?.index??source.length));
    assert(blocks[3].startsWith('      - name: Build deterministic source-tree content identity\n'));
    blocks[3]=once(blocks[3],'        run: node scripts/weather-source-gate.mjs impact-digest\n',
      '        run: node scripts/weather-source-gate.mjs digest\n');
    blocks[3]=once(blocks[3],TOKEN,'');
    for(let index=4;index<=18;index++){
      const header=rows[index][0];blocks[index]=once(blocks[index],header+SOURCE_IMPACT_FULL_STEP_CONDITION,header);
    }
    assert(blocks[5].startsWith('      - uses: actions/setup-python@v7\n'));
    assert(blocks[6].startsWith('      - name: Install source-gate dependencies\n'));
    blocks[6]=once(blocks[6],TARGETS,'');
    assert(blocks[19].startsWith('      - name: Require validated source tree to remain unchanged\n'));
    assert(blocks[20].startsWith('      - name: Upload tree-content source validation proof\n'));
    blocks[20]=once(blocks[20],NEW_PATH,OLD_PATH);
    source=source.slice(0,rows[0].index)+blocks.join('');
    source=once(source,ROUTING,'');
    assert.equal(sha(source),SOURCE_IMPACT_FULL_WORKFLOW_SHA256,
      'Only the reviewed selection/token/targets/receipt path and early routing may differ from qualified 334 FULL');
    return source;
  }
  if(source.includes('test-post-cutover-migration-routing.mjs')){
    source=once(source,ROUTING,'');
    assert.equal(sha(source),SOURCE_IMPACT_FULL_WORKFLOW_SHA256,
      'Only the already reviewed normal early routing addition may differ from qualified 334 FULL');
  }
  // Genuine older workflows still pass through their unchanged old oracles.
  return source;
}
