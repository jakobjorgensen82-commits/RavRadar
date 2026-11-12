import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const closureEvidence = new WeakSet();
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
    const closed = job.steps.filter(item => item.name === CLOSED_STEP);
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
    state: roles.some(role => role.state === 'PUBLIC_TARGET_REQUIRED') ? 'PUBLIC_TARGET_REQUIRED'
      : roles.some(role => role.state === 'CLOSED_UNPUBLISHED') ? 'CLOSED_UNPUBLISHED' : 'NO_POST' });
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
  const last = await read(root); assertRun(last);
  if (last.updated_at !== first.updated_at || last.conclusion !== first.conclusion || last.path !== first.path)
    throw new Error('PAGES_OWNER_RUN_CHANGED_DURING_READ');
  const result = classifyCompletePagesJobs(jobs, owner, first.path);
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
