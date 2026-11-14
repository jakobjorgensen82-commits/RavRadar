import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  decideSourceGate,
  discoverPullRequestSourceGate,
  discoverMainSourceGate,
  inspectSourceProofRenewalMetadata,
  MAIN_SOURCE_JOB,
  MAIN_SOURCE_STEP,
  sourceGateRecord,
  SOURCE_GATE_PRODUCERS,
  SOURCE_GATE_STEP,
  PULL_REQUEST_SOURCE_JOB,
  PULL_REQUEST_SOURCE_STEPS,
  PULL_REQUEST_SOURCE_WORKFLOW,
} from './lib/weather-source-gate.mjs';
import { sourceTreeProofArtifactName } from './lib/source-tree-content.mjs';

const digest = `sha256:${'d'.repeat(64)}`;
const env = {
  GITHUB_REF: 'refs/heads/main',
  GITHUB_SHA: 'a'.repeat(40),
  GITHUB_REPOSITORY: 'fixture/repo',
  GITHUB_RUN_ID: '200',
  GITHUB_RUN_ATTEMPT: '1',
};
const proof = sourceGateRecord({ ...env, GITHUB_RUN_ID: '100' }, 'success', digest);
const proofTime = '2026-09-12T01:00:00Z';
const contracts = Object.entries(SOURCE_GATE_PRODUCERS).flatMap(([path, value]) => (
  value.gates.map(gate => ({ path, workflowId: value.workflowId, ...gate }))
));
assert.equal(contracts[0].step, SOURCE_GATE_STEP);

const makeMainRun = (contract, overrides = {}) => ({
  id: 100,
  run_attempt: 1,
  head_sha: env.GITHUB_SHA,
  head_branch: 'main',
  path: contract.path,
  repository: { full_name: env.GITHUB_REPOSITORY },
  ...overrides,
});
const makeMainJob = (contract, overrides = {}) => ({
  name: contract.job,
  status: 'completed',
  conclusion: 'success',
  head_sha: env.GITHUB_SHA,
  run_id: 100,
  run_attempt: 1,
  steps: [{
    name: contract.step,
    status: 'completed',
    conclusion: 'success',
    completed_at: proofTime,
  }],
  ...overrides,
});

function mainApi(contract, { run = makeMainRun(contract), jobs = [makeMainJob(contract)], histories = new Map() } = {}) {
  return async route => {
    if (route.includes('/actions/workflows/')) {
      const workflowId = route.match(/workflows\/([^/]+)\/runs/)[1];
      const rows = histories.get(workflowId) || [];
      return { total_count: rows.length, workflow_runs: rows };
    }
    if (route.includes('/attempts/')) return { total_count: jobs.length, jobs };
    if (route.endsWith('/actions/runs/100')) return run;
    throw new Error(`Unexpected route: ${route}`);
  };
}

for (const contract of contracts) {
  const decision = await decideSourceGate(proof, env, mainApi(contract), { sourceTreeSha256: digest });
  assert.equal(decision.required, false, `${contract.path}/${contract.job}`);
}
for (const [record, currentDigest] of [
  [null, digest],
  [{ ...proof, conclusion: 'failure' }, digest],
  [{ ...proof, sourceTreeSha256: `sha256:${'e'.repeat(64)}` }, digest],
  [proof, `sha256:${'e'.repeat(64)}`],
  [{ ...proof, contractId: 'old' }, digest],
]) {
  assert.equal((await decideSourceGate(record, env, mainApi(contracts[0]), {
    sourceTreeSha256: currentDigest,
  })).required, true);
}
assert.throws(
  () => sourceGateRecord({ ...env, GITHUB_RUN_ATTEMPT: '0' }, 'success', digest),
  /exact workflow attempt/,
);

const pullRequestNumber = 278;
const pullHeadSha = 'b'.repeat(40);
const pullRunHeadSha = pullHeadSha;
const artifactName = sourceTreeProofArtifactName({ pullRequestNumber, headSha: pullHeadSha, sourceTreeSha256: digest });
const pull = {
  number: pullRequestNumber,
  state: 'closed',
  merged_at: '2026-09-12T01:30:00Z',
  merge_commit_sha: env.GITHUB_SHA,
  head: { sha: pullHeadSha, repo: { full_name: env.GITHUB_REPOSITORY } },
  base: { ref: 'main', repo: { full_name: env.GITHUB_REPOSITORY } },
};
const pullRun = {
  id: 300,
  run_attempt: 1,
  head_sha: pullRunHeadSha,
  path: PULL_REQUEST_SOURCE_WORKFLOW,
  event: 'pull_request',
  status: 'completed',
  conclusion: 'success',
  repository: { id: 42, full_name: env.GITHUB_REPOSITORY },
  head_repository: { id: 42, full_name: env.GITHUB_REPOSITORY },
  // This is the shape observed from GitHub for the repository's real PR run.
  pull_requests: [],
};
const pullJob = {
  name: PULL_REQUEST_SOURCE_JOB,
  status: 'completed',
  conclusion: 'success',
  head_sha: pullRunHeadSha,
  run_id: 300,
  run_attempt: 1,
  steps: PULL_REQUEST_SOURCE_STEPS.map(name => ({
    name,
    status: 'completed',
    conclusion: 'success',
    completed_at: proofTime,
  })),
};
const artifact = {
  id: 400,
  name: artifactName,
  expired: false,
  workflow_run: { id: 300 },
};

function pullApi({ pulls = [pull], artifacts = [artifact], run = pullRun, job = pullJob, histories = new Map() } = {}) {
  return async route => {
    if (route.includes(`/commits/${env.GITHUB_SHA}/pulls`)) return pulls;
    if (route.endsWith(`/pulls/${pullRequestNumber}`)) return pulls[0];
    if (route.includes('/actions/artifacts?')) return { total_count: artifacts.length, artifacts };
    if (route.endsWith('/actions/runs/300')) return run;
    if (route.includes('/actions/runs/300/attempts/1/jobs')) return { total_count: 1, jobs: [job] };
    if (route.includes('/actions/workflows/')) {
      const workflowId = route.match(/workflows\/([^/]+)\/runs/)[1];
      const rows = histories.get(workflowId) || [];
      return { total_count: rows.length, workflow_runs: rows };
    }
    throw new Error(`Unexpected route: ${route}`);
  };
}

const discovered = await discoverPullRequestSourceGate(env, digest, pullApi());
assert.equal(discovered.required, false);
assert.equal(discovered.record.proofKind, 'pull-request');
assert.equal(discovered.record.sourceTreeSha256, digest);
assert.equal((await decideSourceGate(discovered.record, env, pullApi(), {
  sourceTreeSha256: digest,
})).required, false);

for (const api of [
  pullApi({ artifacts: [] }),
  pullApi({ artifacts: [{ ...artifact, expired: true }] }),
  pullApi({ run: { ...pullRun, conclusion: 'failure' } }),
  pullApi({ run: { ...pullRun, head_sha: 'c'.repeat(40) } }),
  pullApi({ run: { ...pullRun, head_repository: { full_name: 'attacker/repo' } } }),
  pullApi({ job: { ...pullJob, steps: pullJob.steps.map((step, index) => (
    index === 1 ? { ...step, conclusion: 'failure' } : step
  )) } }),
  pullApi({ pulls: [{ ...pull, head: { ...pull.head, repo: { full_name: 'attacker/repo' } } }] }),
]) assert.equal((await discoverPullRequestSourceGate(env, digest, api)).required, true);

const laterId = 350;
const laterRun = {
  ...makeMainRun(contracts[0]),
  id: laterId,
  run_attempt: 1,
  conclusion: 'failure',
  updated_at: '2026-09-12T02:00:00Z',
};
const laterJob = {
  ...makeMainJob(contracts[0]),
  run_id: laterId,
  steps: [{
    name: contracts[0].step,
    status: 'completed',
    conclusion: 'failure',
    completed_at: '2026-09-12T02:00:00Z',
  }],
};
const invalidatedApi = async route => {
  if (route.endsWith(`/pulls/${pullRequestNumber}`)) return pull;
  if (route.endsWith('/actions/runs/300')) return pullRun;
  if (route.includes('/actions/runs/300/attempts/1/jobs')) return { total_count: 1, jobs: [pullJob] };
  if (route.includes(`/actions/runs/${laterId}/attempts/1/jobs`)) return { total_count: 1, jobs: [laterJob] };
  if (route.includes(`/actions/workflows/${contracts[0].workflowId}/runs`)) {
    return { total_count: 1, workflow_runs: [laterRun] };
  }
  if (route.includes('/actions/workflows/')) return { total_count: 0, workflow_runs: [] };
  throw new Error(`Unexpected route: ${route}`);
};
assert.deepEqual(
  await decideSourceGate(discovered.record, env, invalidatedApi, { sourceTreeSha256: digest }),
  { required: true, reason: 'later-source-not-green' },
);

// The ordinary manual entry shares the real reusable weather producer. A later
// source failure there must invalidate older proof just like a scheduled run.
const ordinaryWorkflow = (await readFile(new URL(
  '../.github/workflows/run-current-weather-once.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const ordinaryName = ordinaryWorkflow.match(/^  build-and-prepare:\n    name: ([^\n]+)\n/m);
assert.ok(ordinaryName, 'ordinary manual workflow retains its actual reusable job');
assert.ok(ordinaryWorkflow.includes('    uses: ./.github/workflows/reusable-weather-build.yml\n'));
const ordinaryContract = {
  path: '.github/workflows/run-current-weather-once.yml',
  workflowId: 'run-current-weather-once.yml',
  job: ordinaryName[1] + ' / build-and-prepare',
  step: SOURCE_GATE_STEP,
};
for (const [stepStatus, stepConclusion, expectedReason, wrongJob] of [
  ['completed', 'failure', 'later-source-not-green', false],
  ['in_progress', null, 'later-source-unresolved', false],
  ['completed', 'skipped', null, false],
  ['completed', 'success', null, false],
  ['completed', 'failure', 'later-source-job-step-mismatch', true],
]) {
  const runId = 351;
  const currentRun = makeMainRun(ordinaryContract, { id: runId,
    conclusion: 'failure', updated_at: '2026-09-12T02:00:00Z' });
  const currentJob = makeMainJob(ordinaryContract, { run_id: runId,
    name: wrongJob ? 'wrong-ordinary-producer' : ordinaryContract.job,
    steps: [{ name: ordinaryContract.step, status: stepStatus,
      conclusion: stepConclusion, completed_at: '2026-09-12T02:00:00Z' }] });
  const oldProofApi = pullApi({ histories: new Map([[ordinaryContract.workflowId, [currentRun]]]) });
  const api = async route => route.includes('/actions/runs/351/attempts/1/jobs')
    ? { total_count: 1, jobs: [currentJob] } : oldProofApi(route);
  const decision = await decideSourceGate(discovered.record, env, api, { sourceTreeSha256: digest });
  if (expectedReason) assert.deepEqual(decision, { required: true, reason: expectedReason });
  else assert.equal(decision.required, false, 'weather failure alone does not invalidate successful or skipped source');
}

console.log('Source gate reuses only live-verified, SHA-256-identical PR or exact-main content.');

// The mandatory native SQL leaf is part of the live immutable PR proof.
// Outer success, absence, pending or SKIP cannot substitute for its real run.
const nativeSqlStep = 'Validate native PostgreSQL checkpoint CAS on artificial data only';
assert.ok(PULL_REQUEST_SOURCE_STEPS.includes(nativeSqlStep));
// Reject source-contract regressions before the native database matrix.
// This is ordering only: every original gate stays mandatory before proof.
const {projectSourceImpactWorkflowFull}=await import('./lib/source-impact-workflow-review.mjs');
const prValidation = projectSourceImpactWorkflowFull(await readFile(
  new URL('../.github/workflows/validate-pull-request.yml', import.meta.url), 'utf8'));
function assertSourceBeforeNativeSql(source) {
  const names = [
    'Require exact pull-request source head',
    'Build deterministic source-tree content identity',
    'Diagnose normal pack-reader closure on artificial data only',
    'Restore Node22 for existing source validation',
    'Validate bounded native current diagnosis on artificial data only',
    'Validate source contracts and release governance',
    nativeSqlStep,
    'Upload independently completed native586 PostgreSQL phase',
    'Validate isolated restart and two ordinary national followers',
    'Validate durable Copernicus current-reference baseline on artificial data only',
    'Validate download-inclusive DMI capacity on artificial data only',
    'Require validated source tree to remain unchanged',
    'Upload tree-content source validation proof',
  ];
  let previous = -1;
  for (const name of names) {
    const marker = '      - name: ' + name + '\n';
    assert.equal(source.split(marker).length, 2, 'one actual mandatory gate: ' + name);
    const position = source.indexOf(marker);
    assert.ok(position > previous, 'source must precede native SQL; national gates and final proof remain after both');
    previous = position;
    const block = source.slice(position).split('\n      - ').at(0);
    assert.doesNotMatch(block, /^\s+(?:if|continue-on-error):/m, 'mandatory gates cannot be skipped or softened');
  }
}
assertSourceBeforeNativeSql(prValidation);
assert.throws(() => assertSourceBeforeNativeSql(prValidation.replace('      - name: ' + nativeSqlStep + '\n', '      - name: missing-native-sql\n')));
assert.throws(() => assertSourceBeforeNativeSql(prValidation.replace('      - name: ' + nativeSqlStep + '\n',
  '      - name: ' + nativeSqlStep + '\n        continue-on-error: true\n')));
for (const nativeOutcome of [null,
  { status: 'completed', conclusion: 'skipped' },
  { status: 'completed', conclusion: 'failure' },
  { status: 'in_progress', conclusion: null }]) {
  const job = { ...pullJob, steps: pullJob.steps.flatMap(step => step.name !== nativeSqlStep
    ? [step] : nativeOutcome === null ? [] : [{ ...step, ...nativeOutcome }]) };
  const api = pullApi({ job });
  assert.equal((await discoverPullRequestSourceGate(env, digest, api)).required, true);
  assert.equal((await decideSourceGate(discovered.record, env, api,
    { sourceTreeSha256: digest })).required, true);
}


// Exercise the actual CLI decision/output block with the existing resolver
// functions and GitHub fixtures. This is not a hosted source-proof claim.
const normalCheckSource = (await readFile(new URL('./weather-source-gate.mjs', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const normalCheckStart = '  let renewalState = null;\n  let decision = await decideSourceGate(record, env, githubJson, { sourceTreeSha256 });';
const normalCheckEnd = '\n} else {\n  throw new Error(\'Expected check, digest or record\');';
assert.equal(normalCheckSource.split(normalCheckStart).length, 2);
assert.equal(normalCheckSource.split(normalCheckEnd).length, 2);
const normalCheckBody = normalCheckSource.slice(normalCheckSource.indexOf(normalCheckStart), normalCheckSource.indexOf(normalCheckEnd));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const runNormalCheck = new AsyncFunction('record', 'env', 'sourceTreeSha256', 'githubJson',
  'decideSourceGate', 'discoverPullRequestSourceGate', 'fs', 'writeJson', 'console',
  'verifiedTargetedSourceProof', 'locatorPath', 'discoverMainSourceGate', 'inspectLaterMainEvidence',
  'access = Object.freeze({getJson:githubJson})',
  normalCheckBody + '\nreturn decision;');
const fixedReadWorkflow = (await readFile(new URL('../.github/workflows/deploy-trip-storage.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
assert.ok(fixedReadWorkflow.includes('      - name: Reject missing source proof before either fixed read\n        shell: bash\n        run: test "\${{ steps.fixed_read_source.outputs.required }}" = false'));
for (const [api, reason] of [
  [pullApi({ artifacts: [] }), 'matching-pull-request-source-proof-not-found'],
  [async () => { throw new Error('synthetic unavailable GitHub metadata'); }, 'pull-request-proof-discovery-unavailable'],
]) {
  let output = null;
  let locatorWrites = 0;
  const printed = [];
  const current = { ...env, GITHUB_OUTPUT: 'synthetic-fixed-read-source-output' };
  const decision = await runNormalCheck(null, current, digest, api,
    decideSourceGate, discoverPullRequestSourceGate,
    { appendFile: async (file, value) => { assert.equal(file, current.GITHUB_OUTPUT); assert.equal(output, null); output = value; } },
    async () => { locatorWrites += 1; },
    { log: value => { printed.push(value); } }, async () => null,
    '.cache/weather-source-validation.json', async () => ({required:true,mainAvailability:'MISSING'}), async () => null);
  assert.deepEqual(decision, { required: true, reason });
  assert.equal(locatorWrites, 0, 'failed discovery never writes a locator');
  assert.equal(output, 'required=true\nreason=' + reason + '\nsource_tree_sha256=' + digest + '\n');
  assert.deepEqual(printed, ['Source gate: required=true; reason=' + reason]);
}

// The actual CLI must persist only a successful independently verified typed
// locator. The dedicated normal consumer fixture covers its cryptographic and
// live-identity contract; this checks the final decision/output connection.
for (const required of [false, true]) {
  const context = { ...env, GITHUB_OUTPUT: 'synthetic-targeted-source-output' };
  const reason = required ? 'targeted-source-proof-unavailable'
    : 'verified-targeted-pull-request-source-content';
  const locator = { contractId: 'weather-source-targeted-impact-v1', synthetic: true };
  const writes = [];
  let output = null;
  let targetedCalls = 0;
  const result = await runNormalCheck(null, context, digest, pullApi({ artifacts: [] }),
    decideSourceGate, discoverPullRequestSourceGate,
    { appendFile: async (file, value) => {
      assert.equal(file, context.GITHUB_OUTPUT);
      assert.equal(output, null);
      output = value;
    } },
    async (file, value) => { writes.push({ file, value }); }, { log() {} },
    async (prior, actualContext, actualDigest) => {
      targetedCalls += 1;
      assert.equal(prior, null);
      assert.equal(actualContext, context);
      assert.equal(actualDigest, digest);
      return { decision: { required, reason }, record: locator };
    }, '.cache/weather-source-validation.json', async () => ({required:true,mainAvailability:'MISSING'}), async () => null);
  assert.equal(targetedCalls, 1);
  assert.deepEqual(result, { required, reason });
  assert.equal(output, `required=${required}\nreason=${reason}\nsource_tree_sha256=${digest}\n`);
  assert.deepEqual(writes, required ? []
    : [{ file: '.cache/weather-source-validation.json', value: locator }]);
}


// MAIN discovery is only an authenticated locator path into the original
// consumer. It does not trust the check-run colour or retag a same-run record.
const sourceOnly = contracts.find(row => row.job === MAIN_SOURCE_JOB && row.step === MAIN_SOURCE_STEP);
assert(sourceOnly);
const checkRun = {id:300,name:sourceOnly.job,head_sha:env.GITHUB_SHA,status:'completed',conclusion:'success',
  details_url:'https://github.com/fixture/repo/actions/runs/100/job/300'};
const sourceOnlyApi = ({check = checkRun, run = makeMainRun(sourceOnly,{event:'workflow_dispatch',status:'in_progress'}),
  job = makeMainJob(sourceOnly,{id:300}), broken = false, history = new Map()} = {}) => async route => {
  if (broken) throw new Error('synthetic unavailable source metadata');
  if (route.includes('/check-runs?')) {
    const name = new URL('https://api.github.com'+route).searchParams.get('check_name');
    return {total_count:name===sourceOnly.job?1:0,check_runs:name===sourceOnly.job?[check]:[]};
  }
  return mainApi(sourceOnly,{run,jobs:[job],histories:history})(route);
};
const mainFound = await discoverMainSourceGate(env,digest,sourceOnlyApi());
assert.equal(mainFound.required,false);
assert.equal(mainFound.reason,'verified-exact-main-source-content');
assert.equal(mainFound.record.proofKind,'main');
assert.equal(mainFound.record.runId,'100');
assert.equal((await decideSourceGate(mainFound.record,env,sourceOnlyApi(),{sourceTreeSha256:digest})).required,false,
  'Completed source job is usable from another run while the controller run remains active');
assert.equal((await discoverMainSourceGate({...env,GITHUB_RUN_ID:'100'},digest,sourceOnlyApi())).mainAvailability,'MISSING');
assert.equal((await decideSourceGate(mainFound.record,{...env,GITHUB_RUN_ID:'100'},sourceOnlyApi(),{sourceTreeSha256:digest})).required,true);
for (const [fields, availability] of [
  [{job:makeMainJob(sourceOnly,{id:300,status:'in_progress',conclusion:null,steps:[{name:MAIN_SOURCE_STEP,status:'in_progress',conclusion:null}]})},'CONTRADICTION'],
  [{job:makeMainJob(sourceOnly,{id:300,steps:[{name:MAIN_SOURCE_STEP,status:'completed',conclusion:'failure',completed_at:proofTime}]})},'CONTRADICTION'],
  [{job:makeMainJob(sourceOnly,{id:300,steps:[{name:MAIN_SOURCE_STEP,status:'completed',conclusion:'skipped',completed_at:proofTime}]})},'UNPROVED'],
  [{check:{...checkRun,head_sha:'f'.repeat(40)}},'UNPROVED'],
  [{check:{...checkRun,details_url:checkRun.details_url+'?unknown=1'}},'UNPROVED'],
  [{check:{...checkRun,details_url:'https://example.invalid/actions/runs/100/job/300'}},'UNPROVED'],
  [{run:makeMainRun(sourceOnly,{event:'workflow_dispatch',run_attempt:2})},'UNPROVED'],
  [{broken:true},'UNPROVED'],
]) {
  const actual = await discoverMainSourceGate(env,digest,sourceOnlyApi(fields));
  assert.equal(actual.required,true);
  assert.equal(actual.mainAvailability,availability);
  assert.equal(actual.record,undefined,'No locator on a red/unknown/skipped source phase');
}
// The actual normal CLI replaces an unusable existing locator only after a
// full live MAIN qualification. Local file existence is not a cache hit proof.
for (const oldLocator of [null,{contractId:'weather-source-current-change-v4',expiredSyntheticLocator:true}]) {
  const writes=[];let output;
  const current={...env,GITHUB_OUTPUT:'synthetic-main-discovery-output'};
  const result=await runNormalCheck(oldLocator,current,digest,pullApi({artifacts:[]}),
    decideSourceGate,discoverPullRequestSourceGate,{appendFile:async(_,value)=>{output=value;}},
    async(file,value)=>writes.push({file,value}),{log(){}},
    async()=>({decision:{required:true,reason:'targeted-source-proof-unavailable'},renewalState:'EXPIRED'}),
    '.cache/weather-source-validation.json',async()=>mainFound,async()=>null);
  assert.equal(result.required,false);assert.equal(result.reason,'verified-exact-main-source-content');
  assert.deepEqual(writes,[{file:'.cache/weather-source-validation.json',value:mainFound.record}]);
  assert.match(output,/^required=false\n/);
}
for (const [main, renewalState, later, expected] of [
  [{required:true,mainAvailability:'MISSING'},'EXPIRED',null,'source-proof-renewal-required'],
  [{required:true,mainAvailability:'MISSING'},'MISSING',null,'source-proof-renewal-required'],
  [{required:true,mainAvailability:'MISSING'},'UNPROVED',null,'targeted-source-proof-unavailable'],
  [{required:true,mainAvailability:'UNPROVED',reason:'main-source-proof-discovery-unavailable'},'EXPIRED',null,'main-source-proof-discovery-unavailable'],
  [{required:true,mainAvailability:'UNPROVED',reason:'later-source-not-green'},'EXPIRED',null,'later-source-not-green'],
  [{required:true,mainAvailability:'UNPROVED',reason:'later-source-unresolved'},'EXPIRED',null,'later-source-unresolved'],
]) {
  const current={...env,GITHUB_OUTPUT:'synthetic-source-renewal-output'};let writes=0;
  const result=await runNormalCheck(null,current,digest,pullApi({artifacts:[]}),
    decideSourceGate,discoverPullRequestSourceGate,{appendFile:async()=>{}},async()=>{writes++;},{log(){}},
    async()=>({decision:{required:true,reason:'targeted-source-proof-unavailable'},renewalState}),
    '.cache/weather-source-validation.json',async()=>main,async()=>later);
  assert.deepEqual(result,{required:true,reason:expected});assert.equal(writes,0);
}
const reference={repository:env.GITHUB_REPOSITORY,runId:100,runAttempt:1,pullRequest:1,
  producerHead:'b'.repeat(40),sourceTreeSha256:digest,nativeArtifactId:10,finalArtifactId:11,
  nativeArtifactDigest:'sha256:'+'1'.repeat(64),finalArtifactDigest:'sha256:'+'2'.repeat(64)};
const artifactMetadata=(id,expired)=>({id,expired,name:id===10?'native586-phase-100-1-'+reference.producerHead:
  sourceTreeProofArtifactName({pullRequestNumber:1,headSha:reference.producerHead,sourceTreeSha256:digest}),
  digest:id===10?reference.nativeArtifactDigest:reference.finalArtifactDigest,
  workflow_run:{id:100,head_sha:reference.producerHead}});
for (const [reader,expected] of [
  [async route=>artifactMetadata(Number(route.split('/').at(-1)),true),'EXPIRED'],
  [async route=>artifactMetadata(Number(route.split('/').at(-1)),false),'UNPROVED'],
  [async route=>({...artifactMetadata(Number(route.split('/').at(-1)),true),digest:'sha256:'+'f'.repeat(64)}),'UNPROVED'],
  [async route=>{if(route.includes('?'))return {total_count:0,artifacts:[]};throw new Error('synthetic404');},'MISSING'],
  [async route=>{if(route.includes('?'))return {total_count:1,artifacts:[]};throw new Error('synthetic404');},'UNPROVED'],
  [async()=>{throw new Error('synthetic transport unavailable');},'UNPROVED'],
  [async route=>{if(route.endsWith('/10'))return artifactMetadata(10,true);throw new Error('synthetic unknown second owner');},'UNPROVED'],
]) assert.equal(await inspectSourceProofRenewalMetadata(reference,env.GITHUB_REPOSITORY,reader),expected);
assert.equal(await inspectSourceProofRenewalMetadata({...reference,runAttempt:2},env.GITHUB_REPOSITORY,async()=>assert.fail()),'UNPROVED');
console.log('Normal MAIN discovery, existing/evicted locator, same-run, explicit renewal and unknown/red boundaries passed.');


// Dedicated-only discovery never scans old ordinary donors. Original cached
// ordinary/pilot v2 proof consumption remains covered by every contract above.
for(const contract of contracts.filter(row=>row.step===SOURCE_GATE_STEP)){
  let calls=0;
  const actual=await discoverMainSourceGate(env,digest,async route=>{
    calls++;assert(route.includes('/check-runs?'));
    assert.equal(new URL('https://api.github.com'+route).searchParams.get('check_name'),MAIN_SOURCE_JOB);
    return {total_count:0,check_runs:[]};
  });
  assert.equal(actual.mainAvailability,'MISSING',contract.path);assert.equal(calls,1);
}
const redRun={id:101,run_attempt:1,head_sha:env.GITHUB_SHA,head_branch:'main',path:sourceOnly.path,
  repository:{full_name:env.GITHUB_REPOSITORY},status:'completed',conclusion:'failure',updated_at:'2026-09-12T02:00:00Z'};
const actualWithLaterRed=async route=>{
  if(route.includes('/actions/workflows/watch-missed-weather-schedule.yml/'))return {total_count:1,workflow_runs:[redRun]};
  if(route.includes('/runs/101/attempts/1/jobs'))return {total_count:1,jobs:[makeMainJob(sourceOnly,{id:301,run_id:101,
    steps:[{name:MAIN_SOURCE_STEP,status:'completed',conclusion:'failure',completed_at:'2026-09-12T02:00:00Z'}]})]};
  return sourceOnlyApi()(route);
};
const newerRedDecision=await discoverMainSourceGate(env,digest,actualWithLaterRed);
assert.equal(newerRedDecision.required,true);assert.equal(newerRedDecision.reason,'later-source-not-green');
console.log('Shared ordinary check-name and actual later-red consumer regressions passed.');


// The CLI owns one existing evidence access for the entire check. Its record
// branch stays offline, so the isolated producer does not need a token merely
// to retain the actual source outcome. No second transport resets the phase.
const checkEntrance=normalCheckSource.slice(normalCheckSource.indexOf("} else if (mode === 'check') {"));
const targetedBody=normalCheckSource.slice(normalCheckSource.indexOf('async function verifiedTargetedSourceProof('),
  normalCheckSource.indexOf('\nconst mode ='));
const recordBody=normalCheckSource.slice(normalCheckSource.indexOf("} else if (mode === 'record') {"),
  normalCheckSource.indexOf("} else if (mode === 'check') {"));
assert.equal((normalCheckSource.match(/sourceImpactEvidenceAccess\(\{ env \}\)/g)||[]).length,1);
assert.match(checkEntrance,/const githubJson = access\.getJson;/);
assert.match(checkEntrance,/verifiedTargetedSourceProof\(record, env, sourceTreeSha256, access\)/);
assert.doesNotMatch(targetedBody,/sourceImpactEvidenceAccess|async function githubJson|fetch\(/);
assert.doesNotMatch(recordBody,/GITHUB_TOKEN|GH_TOKEN|import\(|fetch|access/);
assert.equal(sourceGateRecord({...env,GITHUB_TOKEN:undefined,GH_TOKEN:undefined},'success',digest).conclusion,'success');
{
  const access=Object.freeze({getJson:async()=>assert.fail('No hidden unbounded reader'),getArtifactZip:async()=>assert.fail()});
  let stages=0;
  const reader=access.getJson;
  const result=await runNormalCheck(null,{...env,GITHUB_OUTPUT:'shared-phase'},digest,reader,
    async(_,context,get)=>{assert.equal(get,reader);stages++;return {required:true,reason:'missing-or-mismatched-proof'};},
    async(context,hash,get)=>{assert.equal(get,reader);stages++;return {required:true,reason:'matching-pull-request-source-proof-not-found'};},
    {appendFile:async()=>{}},async()=>assert.fail(),{log(){}},
    async(_,context,hash,actual)=>{assert.equal(actual,access);stages++;return {decision:{required:true,reason:'targeted-source-proof-unavailable'}};},
    '.cache/weather-source-validation.json',async(context,hash,get)=>{
      assert.equal(get,reader);stages++;return {required:true,reason:'matching-dedicated-main-source-proof-not-found',mainAvailability:'MISSING'};
    },async()=>assert.fail('No duplicate negative window after discovery'),access);
  assert.equal(stages,4);assert.equal(result.required,true);
  assert.equal(result.reason,'targeted-source-proof-unavailable');
}

// Positive missing/expired artifacts request a NEW actual FULL, not reuse.
// 180 historical ordinary runs never have to be re-proved before running it.
const ordinaryHistoryContract=contracts.find(row=>row.step===SOURCE_GATE_STEP);
const longHistoryApi=({failures=0,fresh=false,trace=[]}={})=>async route=>{
  trace.push(route);
  const runs=Array.from({length:180},(_,index)=>makeMainRun(ordinaryHistoryContract,{id:1100+index,
    event:'workflow_dispatch',status:'completed',conclusion:index<failures?'failure':'success',
    updated_at:'2026-11-01T00:00:00Z'}));
  if(route.includes('/check-runs?'))return {total_count:fresh?1:0,check_runs:fresh?[checkRun]:[]};
  if(route.includes('/commits/')&&route.includes('/pulls?'))return [];
  if(route.includes('/actions/workflows/')){
    const page=Number(new URL('https://api.github.com'+route).searchParams.get('page'));
    const matches=route.includes('/'+ordinaryHistoryContract.workflowId+'/')?runs:[];
    return {total_count:matches.length,workflow_runs:matches.slice((page-1)*100,page*100)};
  }
  const id=Number(route.split('/actions/runs/')[1]?.split('/')[0]);
  if(route.includes('/attempts/')){
    const contract=id===100?sourceOnly:ordinaryHistoryContract;
    return {total_count:1,jobs:[makeMainJob(contract,{id:id===100?300:2000+id,run_id:id,
      steps:[{name:contract.step,status:'completed',conclusion:id===100?'success':'skipped',
        completed_at:id===100&&fresh?'2026-11-14T01:00:00Z':proofTime}]})]};
  }
  assert.equal(id,100);
  return makeMainRun(sourceOnly,{event:'workflow_dispatch',status:'in_progress'});
};
for(const failures of [0,30,31,180])for(const renewalState of ['MISSING','EXPIRED']){
  const trace=[],api=longHistoryApi({failures,trace});let writes=0;
  const result=await runNormalCheck(null,{...env,GITHUB_OUTPUT:'fresh-full-request'},digest,api,
    decideSourceGate,discoverPullRequestSourceGate,{appendFile:async()=>{}},async()=>{writes++;},{log(){}},
    async()=>({renewalState}),'.cache/weather-source-validation.json',discoverMainSourceGate,
    async()=>assert.fail('No proofTime=0 requirement before a real new validation'));
  assert.deepEqual(result,{required:true,reason:'source-proof-renewal-required'});
  assert.equal(writes,0,'No locator/reuse receipt before actual FULL');
  assert.equal(trace.filter(route=>route.includes('/attempts/')).length,0);
  assert.equal(trace.filter(route=>route.includes('/actions/workflows/')).length,0);
  assert.equal(trace.length,2,'Only dedicated locator and ordinary PR discovery before the positive artifact result');
}
// The particular old-history inspection limit is permission to demand FULL,
// never permission to accept an old proof or erase a known source failure.
{
  const api=longHistoryApi({failures:180});
  const initial=await decideSourceGate(proof,env,api,{sourceTreeSha256:digest});
  assert.equal(initial.reason,'source-history-inspection-limit');
  const result=await runNormalCheck(proof,{...env,GITHUB_OUTPUT:'old-history-full'},digest,api,
    decideSourceGate,discoverPullRequestSourceGate,{appendFile:async()=>{}},async()=>assert.fail(),{log(){}},
    async()=>({renewalState:'EXPIRED'}),'.cache/weather-source-validation.json',discoverMainSourceGate,async()=>assert.fail());
  assert.deepEqual(result,{required:true,reason:'source-proof-renewal-required'});
}
for(const failures of [0,30,31,180]){
  const trace=[];const actual=await discoverMainSourceGate(env,digest,longHistoryApi({failures,fresh:true,trace}));
  assert.equal(actual.required,false);assert.equal(actual.record.runId,'100');
  assert.equal(trace.length,10,'The actual new completed source step has its own fresh proofTime');
  assert.equal(trace.filter(route=>route.includes('/attempts/')).length,2);
}
for(const reason of ['later-source-not-green','later-source-unresolved','source-step-not-green',
  'proof-verification-unavailable','run-identity-changed','source-history-limit']){
  let otherStages=0;
  const result=await runNormalCheck(proof,{...env,GITHUB_OUTPUT:'preserved-hold'},digest,async()=>assert.fail(),
    async()=>({required:true,reason}),async()=>{otherStages++;return {required:true};},
    {appendFile:async()=>{}},async()=>assert.fail(),{log(){}},async()=>{otherStages++;return {renewalState:'EXPIRED'};},
    '.cache/weather-source-validation.json',async()=>{otherStages++;return {required:true,mainAvailability:'MISSING'};},async()=>assert.fail());
  assert.deepEqual(result,{required:true,reason});assert.equal(otherStages,reason==='proof-verification-unavailable'?1:0,
    'Only old unusable evidence may seek an independent dedicated proof; its miss never erases HOLD');
}
// An actual dedicated source-red/unresolved/identity/transport result is HOLD
// before PR/TARGETED discovery, even if those could supply expired metadata.
for(const fields of [
  {job:makeMainJob(sourceOnly,{id:300,steps:[{name:MAIN_SOURCE_STEP,status:'completed',conclusion:'failure',completed_at:proofTime}]})},
  {job:makeMainJob(sourceOnly,{id:300,steps:[{name:MAIN_SOURCE_STEP,status:'in_progress',conclusion:null}]})},
  {run:makeMainRun(sourceOnly,{event:'workflow_dispatch',head_sha:'f'.repeat(40)})},
  {broken:true},
]){
  let targeted=0;
  const api=sourceOnlyApi(fields);
  const expected=await discoverMainSourceGate(env,digest,api);
  const result=await runNormalCheck(null,{...env,GITHUB_OUTPUT:'actual-dedicated-hold'},digest,api,
    decideSourceGate,async()=>assert.fail('No later fallback after dedicated HOLD'),{appendFile:async()=>{}},async()=>assert.fail(),{log(){}},
    async()=>{targeted++;return {renewalState:'EXPIRED'};},'.cache/weather-source-validation.json',discoverMainSourceGate,async()=>assert.fail());
  assert.deepEqual(result,{required:true,reason:expected.reason});assert.equal(targeted,0);
}
for(const reason of ['later-source-not-green','later-source-unresolved','targeted-source-identity-mismatch']){
  const result=await runNormalCheck(null,{...env,GITHUB_OUTPUT:'targeted-preserved-hold'},digest,pullApi({artifacts:[]}),
    decideSourceGate,discoverPullRequestSourceGate,{appendFile:async()=>{}},async()=>assert.fail(),{log(){}},
    async()=>({decision:{required:true,reason},renewalState:'EXPIRED'}),'.cache/weather-source-validation.json',
    async()=>({required:true,mainAvailability:'MISSING'}),async()=>assert.fail());
  assert.deepEqual(result,{required:true,reason},'Even inconsistent expiry input cannot erase specific source-red/identity');
}
console.log('Dedicated source locator, 180-run fresh-FULL ordering, exact new proofTime and preserved HOLD cases passed.');

for(const runId of [undefined,'0','unproved']){
  const actual=await discoverMainSourceGate({...env,GITHUB_RUN_ID:runId},digest,async()=>assert.fail('No discovery without actual consumer identity'));
  assert.equal(actual.required,true);assert.equal(actual.mainAvailability,'UNPROVED');
  assert.equal(actual.reason,'main-source-discovery-identity');
}


// A real v2 locator can outlive its producer metadata. It is not reused, but
// a different exact dedicated job may supply a new independent normal proof.
const deletedProducerRecord=sourceGateRecord({...env,GITHUB_RUN_ID:'400'},'success',digest);
for(const outcome of ['new-green','missing','new-red','new-unknown']){
  const trace=[];let writes=0,targeted=0;
  const api=async route=>{
    trace.push(route);
    if(route.endsWith('/actions/runs/400'))throw new Error('Synthetic deleted old producer');
    if(outcome==='missing'){
      assert(route.includes('/check-runs?'));return {total_count:0,check_runs:[]};
    }
    if(outcome==='new-unknown')throw new Error('Synthetic unknown current source metadata');
    if(outcome==='new-red')return sourceOnlyApi({job:makeMainJob(sourceOnly,{id:300,
      steps:[{name:MAIN_SOURCE_STEP,status:'completed',conclusion:'failure',completed_at:proofTime}]})})(route);
    return longHistoryApi({failures:180,fresh:true})(route);
  };
  const result=await runNormalCheck(deletedProducerRecord,{...env,GITHUB_OUTPUT:'independent-dedicated-proof'},digest,api,
    decideSourceGate,async()=>assert.fail('Old unknown never falls through to PR discovery'),{appendFile:async()=>{}},
    async(_,record)=>{writes++;assert.equal(record.runId,'100');},{log(){}},
    async()=>{targeted++;return {renewalState:'EXPIRED'};},'.cache/weather-source-validation.json',discoverMainSourceGate,async()=>assert.fail());
  assert.equal(targeted,0);
  if(outcome==='new-green'){
    assert.equal(result.required,false);assert.equal(result.runId,'100');assert.equal(writes,1);assert.equal(trace.length,11);
  }else{
    assert.equal(result.required,true);assert.equal(writes,0);
    assert.equal(result.reason,outcome==='missing'?'proof-verification-unavailable':
      outcome==='new-red'?'later-source-not-green':'main-source-proof-discovery-unavailable');
    assert.notEqual(result.reason,'source-proof-renewal-required');
  }
}
console.log('Unusable old v2 locator: independent actual proof required; missing/red/unknown remain HOLD.');
