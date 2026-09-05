export const TERMINAL_DMI_CACHE_CONTRACT = 'terminal-dmi-cache-exact-main-v1';
export const LEGACY_DMI_CACHE_KEY = /^dmi-zone-cache-v1-Linux-(\d{4}-W\d{2})-(\d+)-(\d+)$/;
export const DMI_PRODUCER_JOB = 'Build and prepare weather production through reusable workflow / build-and-prepare';
export const DMI_PRODUCER_STEP = 'Update DMI bulk model cache';
export const DMI_CACHE_SAVE_STEP = 'Save progressive private DMI zone cache';
export const DMI_TERMINAL_STEP = 'Require successful DMI producer before current supplement';
const PRODUCTION_WORKFLOW = '.github/workflows/update-and-deploy.yml';
const REPOSITORY_NAME = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function finiteTime(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function parseLegacyDmiCache(cache) {
  if (!cache || cache.ref !== 'refs/heads/main'
      || !Number.isSafeInteger(cache.id) || cache.id < 1
      || !Number.isSafeInteger(cache.size_in_bytes) || cache.size_in_bytes < 1
      || !/^[a-f0-9]{64}$/.test(cache.version || '')
      || finiteTime(cache.created_at) === null) return null;
  const match = LEGACY_DMI_CACHE_KEY.exec(cache.key || '');
  if (!match) return null;
  const runId = Number(match[2]);
  const runAttempt = Number(match[3]);
  if (!Number.isSafeInteger(runId) || runId < 1
      || !Number.isSafeInteger(runAttempt) || runAttempt < 1) return null;
  return { cache, runId, runAttempt };
}

function successfulStep(job, name) {
  const matches = (job.steps || []).filter(step => step.name === name);
  if (matches.length !== 1 || matches[0].status !== 'completed'
      || matches[0].conclusion !== 'success') return null;
  const startedAt = finiteTime(matches[0].started_at);
  const completedAt = finiteTime(matches[0].completed_at);
  if (!Number.isSafeInteger(matches[0].number) || matches[0].number < 1
      || startedAt === null || completedAt === null || startedAt > completedAt) return null;
  return { ...matches[0], startedAt, completedAt };
}

export async function selectTerminalDmiCache(caches, repository, getJson) {
  if (!Array.isArray(caches) || !REPOSITORY_NAME.test(repository || '')
      || typeof getJson !== 'function') throw new Error('Invalid terminal DMI cache resolver input');
  const candidates = caches
    .map(parseLegacyDmiCache)
    .filter(Boolean)
    .sort((left, right) => (
      finiteTime(right.cache.created_at) - finiteTime(left.cache.created_at)
      || right.cache.id - left.cache.id
    ));

  for (const candidate of candidates) {
    const base = `/repos/${repository}/actions/runs/${candidate.runId}`;
    const attemptBase = `${base}/attempts/${candidate.runAttempt}`;
    if (caches.filter(item => (
      item?.ref === 'refs/heads/main' && item?.key === candidate.cache.key
    )).length !== 1) continue;
    let run;
    try {
      run = await getJson(attemptBase);
    } catch (error) {
      if (error?.status === 404) continue;
      throw error;
    }
    if (run?.id !== candidate.runId || run.run_attempt !== candidate.runAttempt
        || run.head_branch !== 'main' || !/^[a-f0-9]{40}$/.test(run.head_sha || '')
        || run.path !== PRODUCTION_WORKFLOW
        || run.repository?.full_name !== repository) continue;

    let evidence;
    try {
      evidence = await getJson(
        `${attemptBase}/jobs?per_page=100`,
      );
    } catch (error) {
      if (error?.status === 404) continue;
      throw error;
    }
    if (!Array.isArray(evidence?.jobs) || !Number.isSafeInteger(evidence.total_count)
        || evidence.total_count > 100 || evidence.jobs.length !== evidence.total_count) continue;
    const jobs = evidence.jobs.filter(job => job.name === DMI_PRODUCER_JOB);
    if (jobs.length !== 1) continue;
    const job = jobs[0];
    if (job.run_id !== candidate.runId || job.run_attempt !== candidate.runAttempt
        || job.head_branch !== 'main' || job.head_sha !== run.head_sha) continue;

    const producer = successfulStep(job, DMI_PRODUCER_STEP);
    const save = successfulStep(job, DMI_CACHE_SAVE_STEP);
    const terminal = successfulStep(job, DMI_TERMINAL_STEP);
    if (!producer || !save || !terminal
        || !(producer.number < save.number && save.number < terminal.number)
        || producer.completedAt > save.startedAt
        || save.completedAt > terminal.startedAt) continue;
    const createdAt = finiteTime(candidate.cache.created_at);
    if (createdAt < save.startedAt - 1_000 || createdAt > save.completedAt + 2_000) continue;

    return {
      contractId: TERMINAL_DMI_CACHE_CONTRACT,
      key: candidate.cache.key,
      cacheId: candidate.cache.id,
      cacheVersion: candidate.cache.version,
      sizeInBytes: candidate.cache.size_in_bytes,
      createdAt: candidate.cache.created_at,
      runId: candidate.runId,
      runAttempt: candidate.runAttempt,
      headSha: run.head_sha,
    };
  }
  return null;
}
