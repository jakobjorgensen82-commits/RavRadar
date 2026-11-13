import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const closureEvidence = new WeakSet();
const publicCompletionObservations = new WeakMap();
// An authenticated unresolved observation is never closure or retry authority.
export function authenticPagesPublicCompletionObservation(error, owner) {
  const value = publicCompletionObservations.get(error);
  return value && sameOwner(value.owner, owner) ? value : null;
}
function canonicalObservation(value) {
  return Array.isArray(value) ? value.map(canonicalObservation)
    : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort()
      .map(key => [key, canonicalObservation(value[key])])) : value;
}
const legacyNoPostJobs = new WeakSet();
const historicalCreateRejectedJobs = new WeakSet();
// One reviewed historical pre-POST failure. This is not a diagnostic-code
// allowlist: both the complete authenticated log and the exact four Git blobs
// must match before the existing all-writer closure classifier can use it.
// Review receipt: 6543a2b53c4bf5e95fe37953bb12aa18ad345497c6713c49169d026ed3744cd2.
const LEGACY_NO_POST = Object.freeze({
  repository: 'jakobjorgensen82-commits/RavRadar', runId: 43216888462, runAttempt: 1,
  headSha: '8fc381d77e486f74cf34e667c9b73b528e954422', attemptId: 'pages-43216888462-1',
  jobId: 131250455281, logBytes: 57470,
  logSha256: 'facdee9288b534608d410f598fb3aba68929a293de821d4c90e8fdbe05d4f2bc',
  signedLogHost: 'productionresultssa15.blob.core.windows.net',
  sources: Object.freeze([
    ['scripts/lib/run-sealed-pages-deployment.mjs', 15287, 'e0716c3652d38c6463808807cdc5454ab13c7e8ab78ceaddf58b25ddc7b3265d'],
    ['scripts/deploy-ordinary-pages-with-immediate-retry.mjs', 9570, 'dd88f9aa9c2b8b7362f792c92eb7fc251271eec2a6aff33733f524e8ec97787f'],
    ['scripts/lib/publish-sealed-pages-with-recovery.mjs', 4240, 'fb2f6fe6a2248f873db3541edf30739e9a678494dd2f49b9aa0bea60f97e55f4'],
    ['scripts/lib/pages-per-artifact-identity.mjs', 17363, '6552fc80948cfdbfa6dcfde5b5517cc5eefbea8a3faff15fc6ab499db84ff79c'],
  ].map(Object.freeze)),
});
// One reviewed historical POST received an explicit create HTTP404 before ACK.
// This authenticates an old event, not a per-head source-test cohort. Its full
// private log is never checked in. It is CLOSED_UNPUBLISHED, never NO_POST,
// retry permission, or public success. Future transports brand rejection directly.
const HISTORICAL_CREATE_REJECTED = Object.freeze({
  repository: 'jakobjorgensen82-commits/RavRadar', runId: 43336157644, runAttempt: 1,
  headSha: 'd7a9a21afd013b386d211bdb540a719050a489de', attemptId: 'pages-43336157644-1',
  jobId: 131660621931, logBytes: 165780,
  logSha256: '790e62b97560bfded6657cc0b914a3243521d3ac25868d3405a74a37a287c969',
  signedLogHost: 'productionresultssa7.blob.core.windows.net',
  sources: Object.freeze([
    ['scripts/lib/run-sealed-pages-deployment.mjs', 16183, 'ad8949e751ae86bba14112871e394752c06325e71c9799e020ac05a4f2fc7002'],
    ['scripts/deploy-ordinary-pages-with-immediate-retry.mjs', 10359, '43f457b6601d296ab9e472645245ee6f87d9e4314139702c59922253ce62491e'],
    ['scripts/lib/publish-sealed-pages-with-recovery.mjs', 4240, 'fb2f6fe6a2248f873db3541edf30739e9a678494dd2f49b9aa0bea60f97e55f4'],
    ['scripts/lib/pages-per-artifact-identity.mjs', 17709, 'ea886adac1195fde7c5e47c9b34a32db107b18991532931573a846586ca03b16'],
    ['.github/actions/deploy-ravradar-pages/action.yml', 1834, 'cfa8db3446bb7a337bf8bbb48b296f338ce8b4793c63b2a36c23bcc4d042d347'],
    ['.github/workflows/reusable-pages-deploy.yml', 68679, 'afed40be3c1126da6f367ffea18ef4299e5df71068823e3570cb984c4ae90619'],
  ].map(Object.freeze)),
});
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const WRITER_ROLES = Object.freeze([
  ['ordinary', 'Deploy prepared Pages artifact', 'Deploy to GitHub Pages'],
  ['pre-activation', 'Deploy exact pre-activation Pages artifact', 'Deploy to GitHub Pages'],
  ['exact-target-recovery', 'Redeploy only a helper-proven exact sealed Pages target', 'Redeploy the exact sealed Pages target'],
]);
const CLOSED_STEP = 'Confirm scheduled Pages writes are terminal and unpublished';
const terminalConclusions = new Set(['success', 'failure', 'cancelled', 'timed_out', 'action_required', 'neutral', 'skipped', 'stale']);
const REENTRY_CALLERS = ['Finish an interrupted generation before new work',
  'Require terminal operational recovery before production', 'resume'];
const ORDINARY_CALLERS = ['Deploy prepared Pages artifact through reusable workflow', 'Deploy verified code-only artifact'];
const CALLER_PATHS = new Set(['.github/workflows/run-current-weather-once.yml', '.github/workflows/update-and-deploy.yml',
  '.github/workflows/deploy-code-only-repair.yml', '.github/workflows/resume-operational-checkpoint.yml']);
function writerNames(role, leaf) {
  const prefixes = role === 'ordinary' ? ORDINARY_CALLERS : REENTRY_CALLERS;
  return new Set([leaf, ...prefixes.map(prefix => prefix + ' / ' + leaf),
    ...(role === 'pre-activation' ? REENTRY_CALLERS.map(prefix => prefix + ' / resume-pre-activation-pages / ' + leaf) : [])]);
}
function skippedWrapperNames(role) {
  return new Set(role === 'ordinary' ? ORDINARY_CALLERS : role === 'pre-activation'
    ? REENTRY_CALLERS.map(prefix => prefix + ' / resume-pre-activation-pages') : []);
}
const sameOwner = (left, right) => ['repository', 'runId', 'runAttempt', 'headSha', 'attemptId']
  .every(key => left?.[key] === right?.[key]);

export function hasAuthenticPagesAttemptClosure(value, owner) {
  return closureEvidence.has(value) && sameOwner(value.owner, owner);
}

// A step conclusion is only Actions metadata. A failed official action can
// leave a Pages write unresolved; only our later successful closure step closes
// such a write. Every configured writer role is examined in the complete list.
function classifyCompletePagesJobs(jobs, owner, callerPath) {
  const roles = [];
  for (const [role, name, stepName] of WRITER_ROLES) {
    const names = writerNames(role, name), wrappers = skippedWrapperNames(role);
    const selected = jobs.filter(job => names.has(job.name) || wrappers.has(job.name));
    if (selected.length > 1) throw new Error('PAGES_OWNER_WRITER_ROLE_AMBIGUOUS');
    if (!selected.length) {
      if (role === 'ordinary' && callerPath === '.github/workflows/resume-operational-checkpoint.yml') continue;
      throw new Error('PAGES_OWNER_WRITER_ROLE_MISSING');
    }
    const job = selected[0];
    if (job.status !== 'completed' || !terminalConclusions.has(job.conclusion))
      throw new Error('PAGES_OWNER_WRITER_ACTIVE_OR_UNKNOWN');
    if (job.conclusion === 'skipped') { roles.push({ role, state: 'NO_POST' }); continue; }
    if (wrappers.has(job.name)) throw new Error('PAGES_OWNER_EXECUTED_WRAPPER_WITHOUT_CHILD');
    const steps = job.steps?.filter(step => step.name === stepName) ?? [];
    if (steps.length !== 1) throw new Error('PAGES_OWNER_WRITER_STEP_UNKNOWN');
    const step = steps[0];
    if (step.status !== 'completed') throw new Error('PAGES_OWNER_WRITER_STEP_ACTIVE');
    if (step.conclusion === 'skipped') { roles.push({ role, state: 'NO_POST' }); continue; }
    if (step.conclusion === 'success') { roles.push({ role, state: 'PUBLIC_TARGET_REQUIRED' }); continue; }
    if (role === 'ordinary' && legacyNoPostJobs.has(job)) { roles.push({ role, state: 'NO_POST' }); continue; }
    if (role === 'ordinary' && historicalCreateRejectedJobs.has(job)) {
      roles.push({ role, state: 'CLOSED_UNPUBLISHED', reason: 'CREATE_HTTP_404_REJECTED', postAttempted: true });
      continue;
    }
    const closed = job.steps.filter(item => item.name === CLOSED_STEP);
    if (role === 'ordinary' && job.conclusion === 'failure' && step.conclusion === 'failure'
      && Number.isSafeInteger(step.number) && step.number > 0 && Number.isFinite(Date.parse(step.completed_at))
      && (closed.length === 0 || (closed.length === 1 && closed[0].status === 'completed'
        && closed[0].conclusion === 'skipped' && Number.isSafeInteger(closed[0].number)
        && closed[0].number > step.number))) {
      roles.push({ role, state: 'PUBLIC_TARGET_UNRESOLVED' });
      continue;
    }
    if (role === 'exact-target-recovery' || !['failure', 'cancelled'].includes(step.conclusion)
      || closed.length !== 1 || closed[0].status !== 'completed' || closed[0].conclusion !== 'success'
      || !Number.isSafeInteger(step.number) || !Number.isSafeInteger(closed[0].number)
      || closed[0].number <= step.number || !Number.isFinite(Date.parse(step.completed_at))
      || !Number.isFinite(Date.parse(closed[0].started_at))
      || Date.parse(closed[0].started_at) < Date.parse(step.completed_at))
      throw new Error('PAGES_OWNER_WRITE_CLOSURE_UNKNOWN');
    roles.push({ role, state: 'CLOSED_UNPUBLISHED' });
  }
  for (const job of jobs) {
    if (job.steps?.some(step => WRITER_ROLES.some(([, , name]) => step.name === name))
      && !WRITER_ROLES.some(([role, name]) => writerNames(role, name).has(job.name)))
      throw new Error('PAGES_OWNER_WRITER_ROLE_UNKNOWN');
  }
  return Object.freeze({ owner: Object.freeze({ ...owner }), roles: Object.freeze(roles.map(Object.freeze)),
    state: roles.some(role => role.state === 'PUBLIC_TARGET_UNRESOLVED') ? 'PUBLIC_TARGET_UNRESOLVED'
      : roles.some(role => role.state === 'PUBLIC_TARGET_REQUIRED') ? 'PUBLIC_TARGET_REQUIRED'
      : roles.some(role => role.state === 'CLOSED_UNPUBLISHED') ? 'CLOSED_UNPUBLISHED' : 'NO_POST' });
}

async function qualifyReviewedHistoricalJob(jobs, owner, fetchImpl, token, reviewed) {
  if (!sameOwner(owner, reviewed)) return null;
  const rejected = reviewed === HISTORICAL_CREATE_REJECTED;
  const failure = rejected ? 'PAGES_OWNER_REJECTED_CREATE_' : 'PAGES_OWNER_LEGACY_';
  const selected = jobs.filter(job => job.id === reviewed.jobId);
  if (selected.length !== 1) throw new Error(failure + 'JOB_UNPROVED');
  const job = selected[0], one = name => job.steps?.filter(step => step.name === name) ?? [];
  const reserve = one('Reserve this exact Pages writer before its first POST');
  const deploy = one('Deploy to GitHub Pages'), closed = one(CLOSED_STEP);
  if (job.name !== 'Deploy prepared Pages artifact through reusable workflow / Deploy prepared Pages artifact'
    || job.status !== 'completed' || job.conclusion !== 'failure'
    || reserve.length !== 1 || reserve[0].number !== 30 || reserve[0].status !== 'completed' || reserve[0].conclusion !== 'success'
    || deploy.length !== 1 || deploy[0].number !== 31 || deploy[0].status !== 'completed' || deploy[0].conclusion !== 'failure'
    || closed.length !== 1 || closed[0].number !== 32 || closed[0].status !== 'completed' || closed[0].conclusion !== 'skipped')
    throw new Error(failure + 'STEP_UNPROVED');
  const gitEnv = { ...Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP']
    .filter(key => typeof process.env[key] === 'string').map(key => [key, process.env[key]])),
    GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1', GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null' };
  try {
    for (const [file, bytes, hash] of reviewed.sources) {
      const raw = execFileSync('git', ['-c', 'protocol.allow=never', '-C', ROOT, 'cat-file', 'blob', owner.headSha + ':' + file],
        { env: gitEnv, timeout: 5000, maxBuffer: 128 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
      if (raw.length !== bytes || sha256(raw) !== hash) throw new Error('source');
    }
  } catch { throw new Error(failure + 'SOURCE_UNPROVED'); }
  const apiUrl = `https://api.github.com/repos/${owner.repository}/actions/jobs/${reviewed.jobId}/logs`;
  const signal = AbortSignal.timeout(30_000);
  let response;
  try {
    response = await fetchImpl(apiUrl, { redirect: 'manual', cache: 'no-store', signal,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'RavRadar-Pages-owner-closure' } });
    if (response.url !== apiUrl || response.redirected !== false) throw new Error('route');
    if (response.status === 302) {
      const target = new URL(response.headers.get('location'));
      if (target.protocol !== 'https:' || target.hostname !== reviewed.signedLogHost
        || target.username || target.password || target.port || target.hash || target.pathname === '/') throw new Error('redirect');
      await response.body?.cancel();
      // The signed blob URL receives no GitHub Authorization header.
      response = await fetchImpl(target.href, { redirect: 'error', cache: 'no-store', signal });
      if (response.url !== target.href || response.redirected !== false) throw new Error('blob route');
    }
    if (response.status !== 200) throw new Error('status');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('body');
    const chunks = []; let bytes = 0;
    try {
      for (;;) {
        const next = await reader.read(); if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > (rejected ? 256 : 128) * 1024) { await reader.cancel(); throw new Error('limit'); }
        chunks.push(next.value);
      }
    } finally { reader.releaseLock(); }
    const raw = Buffer.concat(chunks, bytes);
    if (raw.length !== reviewed.logBytes || sha256(raw) !== reviewed.logSha256) throw new Error('digest');
    new TextDecoder('utf-8', { fatal: true }).decode(raw);
  } catch { throw new Error(failure + 'LOG_UNPROVED'); }
  return job;
}

export async function readAuthenticPagesAttemptClosure({ owner, fetchImpl = fetch,
  token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN } = {}) {
  if (!owner || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}\/[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(owner.repository ?? '')
    || !Number.isSafeInteger(owner.runId) || owner.runId < 1 || !Number.isSafeInteger(owner.runAttempt) || owner.runAttempt < 1
    || !/^[a-f0-9]{40}$/.test(owner.headSha ?? '')
    || ![`pages-${owner.runId}-${owner.runAttempt}`, `pages-recovery-${owner.runId}-${owner.runAttempt}`].includes(owner.attemptId)
    || typeof token !== 'string' || !token) throw new Error('PAGES_OWNER_AUTHENTICATION_MISSING');
  const root = `https://api.github.com/repos/${owner.repository}/actions/runs/${owner.runId}`;
  const read = async url => {
    let response;
    try { response = await fetchImpl(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'RavRadar-Pages-owner-closure' } }); }
    catch { throw new Error('PAGES_OWNER_READ_UNPROVED'); }
    if (!response.ok) throw new Error('PAGES_OWNER_READ_REJECTED');
    try { return await response.json(); } catch { throw new Error('PAGES_OWNER_RESPONSE_UNPROVED'); }
  };
  const assertRun = run => {
    if (run?.id !== owner.runId || run.run_attempt !== owner.runAttempt || run.head_sha !== owner.headSha
      || run.head_branch !== 'main' || run.repository?.full_name !== owner.repository
      || run.status !== 'completed' || !terminalConclusions.has(run.conclusion) || !CALLER_PATHS.has(run.path))
      throw new Error('PAGES_OWNER_RUN_ACTIVE_CHANGED_OR_UNKNOWN');
  };
  const first = await read(root); assertRun(first);
  const jobs = []; let count;
  for (let page = 1; page <= 50; page++) {
    const result = await read(`${root}/attempts/${owner.runAttempt}/jobs?per_page=100&page=${page}`);
    if (!Number.isSafeInteger(result?.total_count) || result.total_count < 0 || result.total_count > 5000
      || !Array.isArray(result.jobs) || result.jobs.length > 100
      || (count !== undefined && count !== result.total_count)) throw new Error('PAGES_OWNER_JOB_LIST_INCOMPLETE');
    count = result.total_count; jobs.push(...result.jobs);
    if (jobs.length >= count) break;
    if (result.jobs.length !== 100) throw new Error('PAGES_OWNER_JOB_LIST_INCOMPLETE');
  }
  if (jobs.length !== count || count === 0 || new Set(jobs.map(job => job.id)).size !== count
    || jobs.some(job => !Number.isSafeInteger(job.id) || job.id < 1 || job.run_id !== owner.runId
      || job.run_attempt !== owner.runAttempt || job.head_sha !== owner.headSha || typeof job.name !== 'string'))
    throw new Error('PAGES_OWNER_JOB_LIST_UNBOUND');
  const legacyNoPost = await qualifyReviewedHistoricalJob(jobs, owner, fetchImpl, token, LEGACY_NO_POST);
  const createRejected = await qualifyReviewedHistoricalJob(jobs, owner, fetchImpl, token, HISTORICAL_CREATE_REJECTED);
  const last = await read(root); assertRun(last);
  if (last.updated_at !== first.updated_at || last.conclusion !== first.conclusion || last.path !== first.path)
    throw new Error('PAGES_OWNER_RUN_CHANGED_DURING_READ');
  if (legacyNoPost) legacyNoPostJobs.add(legacyNoPost);
  if (createRejected) historicalCreateRejectedJobs.add(createRejected);
  const result = classifyCompletePagesJobs(jobs, owner, first.path);
  if (result.state === 'PUBLIC_TARGET_UNRESOLVED') {
    const error = new Error('PAGES_OWNER_WRITE_CLOSURE_UNKNOWN');
    if (first.conclusion === 'failure' && Number.isFinite(Date.parse(first.updated_at))
      && owner.attemptId === `pages-${owner.runId}-${owner.runAttempt}`
      && result.roles.every(role => role.role === 'ordinary'
        ? role.state === 'PUBLIC_TARGET_UNRESOLVED'
        : ['NO_POST', 'CLOSED_UNPUBLISHED'].includes(role.state))) {
      publicCompletionObservations.set(error, Object.freeze({ ...result,
        metadataSha256: crypto.createHash('sha256').update(JSON.stringify(canonicalObservation({run:first,jobs}))).digest('hex') }));
    }
    throw error; // Default callers still have no closure or public-success proof.
  }
  closureEvidence.add(result);
  return result;
}

export function exactPagesAttemptStep(jobs, { runId, runAttempt, headSha, attemptId = `pages-${runId}-${runAttempt}` }) {
  const recovery = attemptId === `pages-recovery-${runId}-${runAttempt}`;
  if (!recovery && attemptId !== `pages-${runId}-${runAttempt}`) throw new Error('Pages attempt identity differs');
  const jobName = recovery ? 'Deploy exact pre-activation Pages artifact' : 'Deploy prepared Pages artifact';
  const selected = jobs.filter(job => Number(job.run_id) === Number(runId)
    && Number(job.run_attempt) === Number(runAttempt) && job.head_sha === headSha
    && (job.name === jobName || job.name?.endsWith(' / ' + jobName)));
  if (selected.length !== 1) throw new Error('Expected one unambiguous exact-run Pages deployment job');
  const steps = selected[0].steps?.filter(step => step.name === 'Deploy to GitHub Pages') ?? [];
  if (steps.length !== 1) throw new Error('Expected one exact Pages deployment step');
  if (!['success', 'failure', 'cancelled', 'skipped'].includes(steps[0].conclusion)) {
    throw new Error('Pages deployment step is not terminal');
  }
  return steps[0].conclusion;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [file, runId, runAttempt, headSha, attemptId] = process.argv.slice(2);
  if (!/^[a-f0-9]{40}$/.test(headSha ?? '')) throw new Error('Missing exact attempt head');
  const document = JSON.parse(await fs.readFile(file, 'utf8'));
  console.log(exactPagesAttemptStep(document.jobs ?? [], { runId, runAttempt, headSha, attemptId }));
}
