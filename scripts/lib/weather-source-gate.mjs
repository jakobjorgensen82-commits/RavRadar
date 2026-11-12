import { sourceTreeProofArtifactName } from './source-tree-content.mjs';

// Cache entries and artifacts are locators. GitHub's immutable job/step
// evidence plus an equal SHA-256 content manifest is the proof.
export const SOURCE_GATE_CONTRACT = 'weather-source-gate-content-v2';
export const SOURCE_GATE_STEP = 'Run fast source gate before expensive data refresh';
export const SOURCE_CODE_STEP = 'Qualify exact Source code before private hydration';
export const SOURCE_CODE_STEP_ID = 'source-code-before-hydration';
export const SOURCE_PR_NATIVE_CONTRACT = 'RAVRADAR_SOURCE_AFTER598_PR_NATIVE_POSTGRES_PHASE_V1';
const SOURCE_PR_LOCATOR_KEYS = ['contractId','repository','headSha','producerHeadSha','sourceTreeSha256',
  'pullRequestNumber','runId','runAttempt','jobId','artifactId','artifactDigest','proofSha256'];
// This is the existing typed PR locator schema. It grants no authority alone:
// the normal consumer independently reads its origin; the Source entry also
// requires the genuinely successful earlier consumer step in the current job.
export function assertSourcePrNativeLocator(record, identity, sourceTreeSha256) {
  const fail=()=>{throw new Error('SOURCE_ENTRY_CURRENT_SOURCE_LOCATOR');};
  const oid=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
  const digest=value=>typeof value==='string'&&/^sha256:[a-f0-9]{64}$/.test(value);
  const positive=value=>Number.isSafeInteger(value)&&value>0;
  if(!record||Object.getPrototypeOf(record)!==Object.prototype
    ||Object.keys(record).sort().join(',')!==[...SOURCE_PR_LOCATOR_KEYS].sort().join(',')
    ||record.contractId!==SOURCE_PR_NATIVE_CONTRACT||record.repository!==identity.GITHUB_REPOSITORY
    ||identity.GITHUB_REF!=='refs/heads/main'||!oid(record.headSha)||record.headSha!==identity.GITHUB_SHA
    ||!oid(record.producerHeadSha)||record.producerHeadSha===record.headSha
    ||!digest(record.sourceTreeSha256)||record.sourceTreeSha256!==sourceTreeSha256
    ||!digest(record.artifactDigest)||!/^[a-f0-9]{64}$/.test(record.proofSha256??'')
    ||typeof record.runId!=='string'||!/^[1-9][0-9]*$/.test(record.runId)
    ||!positive(Number(record.runId))||record.runId===String(identity.GITHUB_RUN_ID)
    ||record.runAttempt!==1
    ||!['pullRequestNumber','jobId','artifactId'].every(key=>positive(record[key])))fail();
}
// The existing Source boundary has one fixed bootstrap, before any private
// central read. This validates the security frame, not a whole-file hash.
export function assertSourceCodeBeforeHydrationWorkflow(source) {
  const fail=()=>{throw new Error('SOURCE_CODE_WORKFLOW_ORDER');};
  if(typeof source!=='string'||Buffer.byteLength(source)>1024*1024)fail();
  source=source.replace(/\r\n/g,'\n');
  const heads=[...source.matchAll(/^      - (?:name|uses): ([^\n]+)\n/gm)];
  const blocks=heads.map((row,i)=>({name:row[1],start:row.index,
    text:source.slice(row.index,heads[i+1]?.index??source.length)}));
  const one=name=>{const rows=blocks.filter(row=>row.name===name);if(rows.length!==1)fail();return rows[0];};
  const gate=one(SOURCE_CODE_STEP),node=one('Set up Node.js'),
    central=one('Read exact centrally active operational RavScore'),
    action=one('Run the one explicit owned SOURCE ordinary route');
  const expected=['Record the actual epoch build start before checkout','actions/checkout@v7',
    'Require checked-out HEAD to equal current origin/main','Set up Node.js'];
  const before=blocks.filter(row=>row.start<gate.start);
  if(JSON.stringify(before.map(row=>row.name))!==JSON.stringify(expected)
    ||blocks.indexOf(gate)!==blocks.indexOf(node)+1
    ||!(gate.start<central.start&&central.start<action.start)
    ||!gate.text.includes('        id: '+SOURCE_CODE_STEP_ID+'\n')
    ||!/^        run: node scripts\/weather-source-gate\.mjs source-before-hydration\n/m.test(gate.text)
    ||/^        (?:if|continue-on-error|working-directory):/m.test(gate.text)
    ||/\bsecrets\./.test(source.slice(0,gate.start)+gate.text)
    ||!/^        uses: \.\/\.github\/actions\/save-owned-dmi-grib\n/m.test(action.text)
    ||!action.text.includes('          operation: source\n'))fail();
}

// Saved-weather repair already has a source-proof step before private access.
// Reuse that placement, rather than adding another gate or checking hydrated data.
export function assertSourceCodeBeforeSavedWeatherWorkflow(source) {
  const fail=()=>{throw new Error('SOURCE_CODE_ONLY_WORKFLOW_ORDER');};
  if(typeof source!=='string'||Buffer.byteLength(source)>1024*1024)fail();
  source=source.replace(/\r\n/g,'\n');
  const jobs=[...source.matchAll(/^  ([A-Za-z0-9_-]+):\n/gm)];
  const selected=jobs.filter(row=>row[1]==='build-code-only');
  if(selected.length!==1)fail();
  const at=jobs.indexOf(selected[0]),job=source.slice(selected[0].index,jobs[at+1]?.index??source.length);
  const heads=[...job.matchAll(/^      - (?:name|uses): ([^\n]+)\n/gm)];
  const blocks=heads.map((row,i)=>({name:row[1],start:row.index,text:job.slice(row.index,heads[i+1]?.index??job.length)}));
  const matches=blocks.filter(row=>row.name==='Reuse exact successful pull-request source proof');
  if(matches.length!==1)fail();
  const gate=matches[0],before=blocks.filter(row=>row.start<gate.start);
  const expected=['actions/checkout@v7','Validate exact manual code-only authority and main',
    'actions/setup-node@v7','actions/setup-python@v7',
    'Install private weather-component verification dependencies','Seal exact integrated implementation identity'];
  if(JSON.stringify(before.map(row=>row.name))!==JSON.stringify(expected)
    ||!/^        id: source-proof\n/m.test(gate.text)
    ||!/^        run: node scripts\/weather-source-gate\.mjs check-before-private\n/m.test(gate.text)
    ||/^        (?:if|continue-on-error|working-directory):/m.test(gate.text)
    ||/\bsecrets\./.test(job.slice(0,gate.start)+gate.text))fail();
}

// Pure metadata inspection only; the normal entry reads the actual run/job itself.
export function verifySourceNormalEarlyCodeExecution({record,identity,run,job,sourceTreeSha256,workflowSource,observedAt}){
  const need=(value,code)=>{if(!value)throw Object.assign(new Error('SOURCE_ENTRY_'+code),{code:'SOURCE_ENTRY_'+code});};
  assertSourcePrNativeLocator(record,identity,sourceTreeSha256);
  need(run.id===Number(identity.GITHUB_RUN_ID)
    &&run.run_attempt===Number(identity.GITHUB_RUN_ATTEMPT),'CURRENT_SOURCE_RUN');
  assertSourceCodeBeforeHydrationWorkflow(workflowSource);
  const gateName=SOURCE_CODE_STEP;
  need(Array.isArray(job.steps)&&job.steps.length>0&&job.steps.length<=512,'CURRENT_SOURCE_STEPS');
  const actual=name=>{
    const rows=job.steps.filter(step=>step?.name===name);need(rows.length===1,'CURRENT_SOURCE_STEPS');
    const step=rows[0];need(Number.isSafeInteger(step.number)&&step.number>0,'CURRENT_SOURCE_STEPS');return step;
  };
  const code=actual(gateName),central=actual('Read exact centrally active operational RavScore'),
    active=actual('Run the one explicit owned SOURCE ordinary route');
  for(const step of [code,central])need(step.status==='completed'&&step.conclusion==='success','CURRENT_SOURCE_STEPS');
  need(active.status==='in_progress'&&active.conclusion===null&&active.completed_at===null,'CURRENT_SOURCE_STEPS');
  const stamp=value=>{
    const time=Date.parse(value??'');need(typeof value==='string'&&Number.isFinite(time)
      &&new Date(time).toISOString()===value.replace(/(?<!\.\d{3})Z$/,'.000Z'),'CURRENT_SOURCE_ORDER');return time;
  };
  const times=[stamp(job.started_at),stamp(code.started_at),stamp(code.completed_at),
    stamp(central.started_at),stamp(central.completed_at),stamp(active.started_at)];
  need(code.number<central.number&&central.number<active.number
    &&times.every((value,index)=>index===0||times[index-1]<=value)
    &&Number.isSafeInteger(observedAt)&&times.at(-1)<=observedAt,'CURRENT_SOURCE_ORDER');
}

export const PULL_REQUEST_SOURCE_WORKFLOW = '.github/workflows/validate-pull-request.yml';
export const PULL_REQUEST_SOURCE_JOB = 'Source validation and release gate';
export const PULL_REQUEST_SOURCE_STEPS = Object.freeze([
  'Require exact pull-request source head',
  'Validate source contracts and release governance',
  'Validate native PostgreSQL checkpoint CAS on artificial data only',
  'Require validated source tree to remain unchanged',
  'Upload tree-content source validation proof',
]);

const producer = (workflowId, gates) => Object.freeze({
  workflowId,
  gates: Object.freeze(gates.map(gate => Object.freeze({ ...gate }))),
});

export const SOURCE_GATE_PRODUCERS = Object.freeze({
  '.github/workflows/update-and-deploy.yml': producer('update-and-deploy.yml', [{
    job: 'Build and prepare weather production through reusable workflow / build-and-prepare',
    step: SOURCE_GATE_STEP,
  }]),
  '.github/workflows/run-current-weather-once.yml': producer('run-current-weather-once.yml', [{
    job: 'Build and prepare weather production through reusable workflow / build-and-prepare',
    step: SOURCE_GATE_STEP,
  }]),
  '.github/workflows/validate-copernicus-current-pilot.yml': producer(
    'validate-copernicus-current-pilot.yml',
    [
      { job: 'validate', step: 'Run exact-main source gate before private acquisition' },
      { job: 'operational-118-preflight', step: 'Run exact-main source gate before one-off acquisition' },
    ],
  ),
});

const required = reason => ({ required: true, reason });
const validSha = value => /^[a-f0-9]{40}$/.test(value || '');
const validSha256 = value => /^sha256:[a-f0-9]{64}$/.test(value || '');
const validPositiveInteger = value => Number.isSafeInteger(value) && value >= 1;

function producerForPath(path) {
  return typeof path === 'string' && Object.hasOwn(SOURCE_GATE_PRODUCERS, path)
    ? SOURCE_GATE_PRODUCERS[path]
    : null;
}

function completeJobs(result) {
  return result && Array.isArray(result.jobs)
    && Number.isSafeInteger(result.total_count)
    && result.total_count >= 0
    && result.total_count <= 100
    && result.jobs.length === result.total_count;
}

function inspectProducerJobs(jobs, gateProducer, identity) {
  const knownStepNames = new Set(gateProducer.gates.map(gate => gate.step));
  const matches = [];
  let ranProducerJobWithoutGate = false;
  for (const job of jobs) {
    const jobContracts = gateProducer.gates.filter(gate => gate.job === job.name);
    const steps = Array.isArray(job.steps) ? job.steps : null;
    if (jobContracts.length > 0) {
      if (job.head_sha !== identity.headSha || job.run_id !== identity.runId
          || job.run_attempt !== identity.runAttempt) {
        return { reason: 'job-identity-mismatch' };
      }
      if (!steps) return { reason: 'invalid-job-steps' };
    }
    if (!steps) continue;
    let matchesInJob = 0;
    for (const step of steps) {
      const contract = jobContracts.find(candidate => candidate.step === step.name);
      if (contract) {
        matches.push({ job, step });
        matchesInJob += 1;
      } else if (knownStepNames.has(step.name)) {
        return { reason: 'source-job-step-mismatch' };
      }
    }
    if (jobContracts.length > 0 && job.conclusion !== 'skipped' && matchesInJob === 0) {
      ranProducerJobWithoutGate = true;
    }
  }
  return { matches, ranProducerJobWithoutGate };
}

function pullRequestIdentity(run, record, repository, pull) {
  if (run.id !== Number(record.runId) || run.run_attempt !== record.runAttempt
      || run.head_sha !== record.runHeadSha || run.path !== PULL_REQUEST_SOURCE_WORKFLOW
      || run.event !== 'pull_request' || run.status !== 'completed'
      || run.conclusion !== 'success' || run.repository?.full_name !== repository
      || run.head_repository?.full_name !== repository
      || record.runHeadSha !== record.producerHeadSha) return false;
  // GitHub's run endpoint legitimately returns pull_requests: [] for same-repo
  // PR runs. Bind through the independently fetched PR instead of trusting that
  // optional projection, while still requiring the run/job head to be exact.
  return pull?.number === record.pullRequestNumber
    && pull.state === 'closed' && typeof pull.merged_at === 'string'
    && pull.merge_commit_sha === record.headSha
    && pull.head?.sha === record.producerHeadSha
    && pull.head?.repo?.full_name === repository
    && pull.base?.ref === 'main'
    && pull.base?.repo?.full_name === repository;
}

function inspectPullRequestJobs(jobs, record) {
  const matches = jobs.filter(job => job.name === PULL_REQUEST_SOURCE_JOB);
  if (matches.length !== 1) return { reason: 'pull-request-source-job-mismatch' };
  const job = matches[0];
  if (job.run_id !== Number(record.runId) || job.run_attempt !== record.runAttempt
      || job.head_sha !== record.runHeadSha || job.status !== 'completed'
      || job.conclusion !== 'success' || !Array.isArray(job.steps)) {
    return { reason: 'pull-request-source-job-identity-mismatch' };
  }
  for (const name of PULL_REQUEST_SOURCE_STEPS) {
    const steps = job.steps.filter(step => step.name === name);
    if (steps.length !== 1 || steps[0].status !== 'completed' || steps[0].conclusion !== 'success') {
      return { reason: 'pull-request-source-step-not-green' };
    }
  }
  const sourceStep = job.steps.find(step => (
    step.name === 'Validate source contracts and release governance'
  ));
  const proofTime = Date.parse(sourceStep.completed_at);
  if (!Number.isFinite(proofTime)) return { reason: 'missing-proof-time' };
  return { proofTime };
}

export function sourceGateRecord(env, conclusion, sourceTreeSha256) {
  if (!['success', 'failure', 'cancelled'].includes(conclusion)) throw new Error('Invalid source outcome');
  const runId = Number(env.GITHUB_RUN_ID);
  const runAttempt = Number(env.GITHUB_RUN_ATTEMPT);
  if (!validSha(env.GITHUB_SHA) || env.GITHUB_REF !== 'refs/heads/main'
      || !validSha256(sourceTreeSha256)) {
    throw new Error('Source proof must belong to an exact main content tree');
  }
  if (!/^\d+$/.test(env.GITHUB_RUN_ID || '') || !validPositiveInteger(runId)
      || !/^\d+$/.test(env.GITHUB_RUN_ATTEMPT || '') || !validPositiveInteger(runAttempt)) {
    throw new Error('Source proof must belong to an exact workflow attempt');
  }
  return {
    contractId: SOURCE_GATE_CONTRACT,
    repository: env.GITHUB_REPOSITORY,
    headSha: env.GITHUB_SHA,
    sourceTreeSha256,
    proofKind: 'main',
    producerHeadSha: env.GITHUB_SHA,
    runHeadSha: env.GITHUB_SHA,
    runId: String(env.GITHUB_RUN_ID),
    runAttempt,
    conclusion,
  };
}

export async function inspectLaterMainEvidence({ env, proofTime, record, getJson }) {
  const runs = [];
  for (const [producerPath, historyProducer] of Object.entries(SOURCE_GATE_PRODUCERS)) {
    let completeHistory = false;
    let historyTotal = null;
    let producerRunCount = 0;
    for (let page = 1; page <= 10; page += 1) {
      const history = await getJson(
        `/repos/${env.GITHUB_REPOSITORY}/actions/workflows/${historyProducer.workflowId}`
        + `/runs?head_sha=${env.GITHUB_SHA}&branch=main&per_page=100&page=${page}`,
      );
      if (!Array.isArray(history.workflow_runs) || !Number.isSafeInteger(history.total_count)
          || history.total_count < 0 || history.workflow_runs.length > 100
          || (historyTotal !== null && history.total_count !== historyTotal)) {
        return required('invalid-source-history');
      }
      historyTotal = history.total_count;
      producerRunCount += history.workflow_runs.length;
      runs.push(...history.workflow_runs.map(item => ({ item, producerPath, gateProducer: historyProducer })));
      if (producerRunCount >= historyTotal) {
        completeHistory = true;
        break;
      }
    }
    if (!completeHistory) return required('source-history-limit');
  }
  const newer = [];
  for (const candidate of runs) {
    const { item } = candidate;
    if (String(item.id) === String(env.GITHUB_RUN_ID) || String(item.id) === record.runId
        || item.conclusion === 'success') continue;
    const updatedAt = Date.parse(item.updated_at);
    if (!Number.isFinite(updatedAt)) return required('source-history-time-unknown');
    if (updatedAt >= proofTime) newer.push(candidate);
  }
  if (newer.length > 30) return required('source-history-inspection-limit');
  for (const candidate of newer) {
    const { item, producerPath, gateProducer: laterProducer } = candidate;
    if (item.head_sha !== env.GITHUB_SHA || item.head_branch !== 'main'
        || item.path !== producerPath || producerForPath(item.path) !== laterProducer
        || item.repository?.full_name !== env.GITHUB_REPOSITORY
        || !validPositiveInteger(item.id) || !validPositiveInteger(item.run_attempt)) {
      return required('source-history-identity-mismatch');
    }
    const evidence = await getJson(
      `/repos/${env.GITHUB_REPOSITORY}/actions/runs/${item.id}`
      + `/attempts/${item.run_attempt}/jobs?per_page=100`,
    );
    if (!completeJobs(evidence)) return required('incomplete-later-jobs');
    const later = inspectProducerJobs(evidence.jobs, laterProducer, {
      headSha: env.GITHUB_SHA,
      runId: item.id,
      runAttempt: item.run_attempt,
    });
    if (later.reason) return required(`later-${later.reason}`);
    if (later.ranProducerJobWithoutGate) return required('later-source-evidence-missing');
    for (const match of later.matches) {
      const step = match.step;
      if (step.conclusion === 'skipped') continue;
      if (step.status !== 'completed') return required('later-source-unresolved');
      const completedAt = Date.parse(step.completed_at);
      if (!Number.isFinite(completedAt)) return required('later-source-time-unknown');
      if (completedAt >= proofTime && step.conclusion !== 'success') return required('later-source-not-green');
    }
  }
  return null;
}

export async function decideSourceGate(record, env, getJson, { sourceTreeSha256 } = {}) {
  if (env.GITHUB_REF !== 'refs/heads/main') return required('not-main');
  const proofRunId = Number(record?.runId);
  if (!record || record.contractId !== SOURCE_GATE_CONTRACT
      || record.repository !== env.GITHUB_REPOSITORY
      || !validSha(record.headSha) || record.headSha !== env.GITHUB_SHA
      || !validSha256(sourceTreeSha256) || record.sourceTreeSha256 !== sourceTreeSha256
      || !['main', 'pull-request'].includes(record.proofKind)
      || !validSha(record.producerHeadSha) || !validSha(record.runHeadSha)
      || !/^\d+$/.test(record.runId || '') || !validPositiveInteger(proofRunId)
      || !validPositiveInteger(record.runAttempt)
      || record.runId === String(env.GITHUB_RUN_ID)) {
    return required('missing-or-mismatched-proof');
  }
  if (record.conclusion !== 'success') return required('previous-source-not-green');
  try {
    const base = `/repos/${env.GITHUB_REPOSITORY}/actions/runs/${record.runId}`;
    const latest = await getJson(base);
    let proofTime;
    if (record.proofKind === 'main') {
      if (latest.id !== proofRunId || latest.run_attempt !== record.runAttempt
          || latest.head_sha !== env.GITHUB_SHA || latest.head_branch !== 'main'
          || latest.repository?.full_name !== env.GITHUB_REPOSITORY) {
        return required('run-identity-changed');
      }
      const gateProducer = producerForPath(latest.path);
      if (!gateProducer) return required('unknown-source-producer');
      const result = await getJson(`${base}/attempts/${record.runAttempt}/jobs?per_page=100`);
      if (!completeJobs(result)) return required('incomplete-job-evidence');
      const proof = inspectProducerJobs(result.jobs, gateProducer, {
        headSha: env.GITHUB_SHA,
        runId: proofRunId,
        runAttempt: record.runAttempt,
      });
      if (proof.reason) return required(proof.reason);
      if (proof.matches.length !== 1) return required('source-job-step-mismatch');
      const sourceStep = proof.matches[0].step;
      if (sourceStep.status !== 'completed' || sourceStep.conclusion !== 'success') {
        return required('source-step-not-green');
      }
      proofTime = Date.parse(sourceStep.completed_at);
      if (!Number.isFinite(proofTime)) return required('missing-proof-time');
    } else {
      const pull = validPositiveInteger(record.pullRequestNumber)
        ? await getJson(`/repos/${env.GITHUB_REPOSITORY}/pulls/${record.pullRequestNumber}`)
        : null;
      if (!pullRequestIdentity(latest, record, env.GITHUB_REPOSITORY, pull)) {
        return required('pull-request-source-identity-mismatch');
      }
      const result = await getJson(`${base}/attempts/${record.runAttempt}/jobs?per_page=100`);
      if (!completeJobs(result)) return required('incomplete-job-evidence');
      const proof = inspectPullRequestJobs(result.jobs, record);
      if (proof.reason) return required(proof.reason);
      proofTime = proof.proofTime;
    }
    const later = await inspectLaterMainEvidence({ env, proofTime, record, getJson });
    if (later) return later;
    return {
      required: false,
      reason: record.proofKind === 'main'
        ? 'verified-exact-main-source-content'
        : 'verified-identical-pull-request-source-content',
      runId: record.runId,
    };
  } catch {
    return required('proof-verification-unavailable');
  }
}

export async function discoverPullRequestSourceGate(env, sourceTreeSha256, getJson) {
  if (env.GITHUB_REF !== 'refs/heads/main' || !validSha(env.GITHUB_SHA)
      || !validSha256(sourceTreeSha256)) {
    return required('pull-request-proof-discovery-not-applicable');
  }
  try {
    const pulls = await getJson(
      `/repos/${env.GITHUB_REPOSITORY}/commits/${env.GITHUB_SHA}/pulls?per_page=100`,
    );
    if (!Array.isArray(pulls) || pulls.length > 100) return required('pull-request-proof-list-invalid');
    const candidates = pulls.filter(pull => (
      validPositiveInteger(pull.number) && pull.state === 'closed'
      && typeof pull.merged_at === 'string' && pull.merge_commit_sha === env.GITHUB_SHA
      && validSha(pull.head?.sha) && pull.head?.repo?.full_name === env.GITHUB_REPOSITORY
      && pull.base?.ref === 'main' && pull.base?.repo?.full_name === env.GITHUB_REPOSITORY
    ));
    for (const pull of candidates) {
      const artifactName = sourceTreeProofArtifactName({
        pullRequestNumber: pull.number,
        headSha: pull.head.sha,
        sourceTreeSha256,
      });
      const artifactResult = await getJson(
        `/repos/${env.GITHUB_REPOSITORY}/actions/artifacts?name=${encodeURIComponent(artifactName)}&per_page=100`,
      );
      if (!Array.isArray(artifactResult.artifacts)
          || !Number.isSafeInteger(artifactResult.total_count)
          || artifactResult.total_count !== artifactResult.artifacts.length
          || artifactResult.total_count > 100) {
        return required('pull-request-proof-artifacts-incomplete');
      }
      const artifacts = artifactResult.artifacts.filter(artifact => (
        artifact.name === artifactName && artifact.expired === false
        && validPositiveInteger(artifact.id) && validPositiveInteger(artifact.workflow_run?.id)
      )).sort((left, right) => right.id - left.id);
      for (const artifact of artifacts) {
        const runId = artifact.workflow_run.id;
        const run = await getJson(`/repos/${env.GITHUB_REPOSITORY}/actions/runs/${runId}`);
        const record = {
          contractId: SOURCE_GATE_CONTRACT,
          repository: env.GITHUB_REPOSITORY,
          headSha: env.GITHUB_SHA,
          sourceTreeSha256,
          proofKind: 'pull-request',
          pullRequestNumber: pull.number,
          producerHeadSha: pull.head.sha,
          runHeadSha: run.head_sha,
          runId: String(runId),
          runAttempt: run.run_attempt,
          conclusion: 'success',
        };
        if (!validSha(record.runHeadSha) || !validPositiveInteger(record.runAttempt)
            || !pullRequestIdentity(run, record, env.GITHUB_REPOSITORY, pull)) continue;
        const jobs = await getJson(
          `/repos/${env.GITHUB_REPOSITORY}/actions/runs/${runId}`
          + `/attempts/${record.runAttempt}/jobs?per_page=100`,
        );
        if (!completeJobs(jobs) || inspectPullRequestJobs(jobs.jobs, record).reason) continue;
        return { required: false, reason: 'discovered-identical-pull-request-source-content', record };
      }
    }
    return required('matching-pull-request-source-proof-not-found');
  } catch {
    return required('pull-request-proof-discovery-unavailable');
  }
}
