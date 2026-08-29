export const TRIP_STORAGE_SHARD_COUNT = 10;
export const TRIP_STORAGE_REQUIRED_SHARD_NAMES = Object.freeze(
  Array.from({ length: TRIP_STORAGE_SHARD_COUNT }, (_, index) => `ravradar-trips-${index}`),
);
export const LEGACY_D1_ACTIVATION_EVIDENCE = Object.freeze({
  repository: 'jakobjorgensen82-commits/RavRadar',
  runId: 33024408547,
  headSha: '5c7f774d3f09a527628d97e08c3900d49eb41a89',
  headBranch: 'main',
  event: 'workflow_dispatch',
  workflowPath: '.github/workflows/deploy-trip-storage.yml',
});
export const LEGACY_D1_ACTIVATION_JOB_NAME = 'Validate, migrate and deploy trip storage';
export const LEGACY_D1_ACTIVATION_D1_STEPS = Object.freeze([
  'Prepare ten EU-restricted D1 shards and schema',
  'Require safe D1 storage headroom',
  'Install the private Worker secret',
  'Deploy the private D1 gateway',
  'Verify Worker boundary before migration',
  'Idempotently migrate existing Supabase trips',
  'Configure normal Cloudflare D1 mode',
  'Deploy all version-controlled Edge functions',
  'Reconcile trips written during the D1 cutover',
  'Verify public Edge boundaries without creating data',
]);
export const LEGACY_D1_ACTIVATION_SUPABASE_ROLLBACK_STEP = 'Configure explicit Supabase rollback mode';

function fail(message) {
  throw new Error(`TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID: ${message}`);
}

export function classifyExistingTripStorageDatabases(existingDatabases) {
  if (!Array.isArray(existingDatabases)) fail('Cloudflare-databaselisten mangler.');
  if (existingDatabases.length === 0) return 'fresh';
  if (existingDatabases.length !== TRIP_STORAGE_SHARD_COUNT) {
    fail('Kun nul databaser eller det komplette dokumenterede sæt på ti kan klassificeres sikkert.');
  }
  const names = existingDatabases.map(database => database?.name);
  if (names.some(name => typeof name !== 'string') || new Set(names).size !== names.length) {
    fail('Databasenavne mangler eller er dublerede.');
  }
  if (names.some(name => !TRIP_STORAGE_REQUIRED_SHARD_NAMES.includes(name))
    || TRIP_STORAGE_REQUIRED_SHARD_NAMES.some(name => !names.includes(name))) {
    fail('Det eksisterende databasesæt er ikke eksakt ravradar-trips-0..9.');
  }
  if (existingDatabases.some(database => database?.jurisdiction !== 'eu')) {
    fail('Alle dokumenterede legacy-shards skal have uforanderlig EU-jurisdiktion.');
  }
  return 'legacy';
}

export function assertBoundLegacyActivationEvidence(evidence = LEGACY_D1_ACTIVATION_EVIDENCE) {
  if (evidence?.repository !== 'jakobjorgensen82-commits/RavRadar'
    || evidence?.runId !== 33024408547
    || evidence?.headSha !== '5c7f774d3f09a527628d97e08c3900d49eb41a89'
    || evidence?.headBranch !== 'main'
    || evidence?.event !== 'workflow_dispatch'
    || evidence?.workflowPath !== '.github/workflows/deploy-trip-storage.yml') {
    fail('Den kildebundne legacy-run/head-evidens er ændret.');
  }
  return evidence;
}

function exactStep(steps, name) {
  const matches = steps.filter(step => step?.name === name);
  if (matches.length !== 1) fail(`Legacy-jobbet skal indeholde præcis ét bundet step: ${name}.`);
  return matches[0];
}

function assertLegacyActivationJobEvidence(payload, { hasNextPage = false } = {}) {
  if (hasNextPage || payload?.total_count !== 1 || !Array.isArray(payload?.jobs) || payload.jobs.length !== 1) {
    fail('Legacy-runbeviset skal have præcis ét upagineret job.');
  }
  const job = payload.jobs[0];
  if (job?.name !== LEGACY_D1_ACTIVATION_JOB_NAME
    || job?.run_attempt !== 1
    || job?.status !== 'completed'
    || job?.conclusion !== 'success'
    || !Array.isArray(job?.steps)) {
    fail('Legacy-jobbets navn, forsøg, status, konklusion eller steps matcher ikke aktiveringen.');
  }
  for (const name of LEGACY_D1_ACTIVATION_D1_STEPS) {
    const step = exactStep(job.steps, name);
    if (step?.status !== 'completed' || step?.conclusion !== 'success') {
      fail(`Det bundne D1-step er ikke completed/success: ${name}.`);
    }
  }
  const rollback = exactStep(job.steps, LEGACY_D1_ACTIVATION_SUPABASE_ROLLBACK_STEP);
  if (rollback?.status !== 'completed' || rollback?.conclusion !== 'skipped') {
    fail('Supabase-rollback-steppet skal være completed/skipped i legacy-D1-runnet.');
  }
}

export async function verifyLegacyActivationEvidence({
  fetchImpl = globalThis.fetch,
  githubToken,
  repository,
} = {}) {
  const evidence = assertBoundLegacyActivationEvidence();
  if (repository !== evidence.repository) fail('Workflowet kører ikke i evidensens repository.');
  if (typeof githubToken !== 'string' || !githubToken.trim()) fail('GitHub-token til read-only runbevis mangler.');
  const response = await fetchImpl(
    `https://api.github.com/repos/${evidence.repository}/actions/runs/${evidence.runId}`,
    {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${githubToken.trim()}`,
        'x-github-api-version': '2022-11-28',
      },
    },
  );
  if (!response?.ok) fail(`GitHub-runbeviset kunne ikke læses (${response?.status ?? 'ukendt'}).`);
  const run = await response.json();
  if (run?.id !== evidence.runId
    || run?.head_sha !== evidence.headSha
    || run?.head_branch !== evidence.headBranch
    || run?.event !== evidence.event
    || run?.path !== evidence.workflowPath
    || run?.status !== 'completed'
    || run?.conclusion !== 'success') {
    fail('GitHub-runbeviset matcher ikke den dokumenterede legacy-D1-aktivering.');
  }
  const jobsResponse = await fetchImpl(
    `https://api.github.com/repos/${evidence.repository}/actions/runs/${evidence.runId}/jobs?filter=latest&per_page=100`,
    {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${githubToken.trim()}`,
        'x-github-api-version': '2022-11-28',
      },
    },
  );
  if (!jobsResponse?.ok) fail(`GitHub-jobbeviset kunne ikke læses (${jobsResponse?.status ?? 'ukendt'}).`);
  const linkHeader = jobsResponse.headers?.get?.('link') || '';
  const jobs = await jobsResponse.json();
  assertLegacyActivationJobEvidence(jobs, { hasNextPage: /rel="next"/i.test(linkHeader) });
  return evidence;
}
