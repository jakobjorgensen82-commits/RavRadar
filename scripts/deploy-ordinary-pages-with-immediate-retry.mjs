import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readBoundedPublicManifest } from './lib/pages-generation-order.mjs';
import { runSealedPagesDeployment, hasSealedPagesRetryEvidence, hasSealedPagesTerminalEvidence, hasSealedPagesCreateRejectionEvidence, hasSealedPagesNoPostEvidence } from './lib/run-sealed-pages-deployment.mjs';
import { classifyPagesStatus } from './lib/pages-per-artifact-identity.mjs';
import { publishSealedPagesWithRecovery } from './lib/publish-sealed-pages-with-recovery.mjs';
import { getOrdinaryPagesRetryDeadline, MINIMUM_RECOVERY_WINDOW_MS, ORDINARY_PAGES_RETRY_POLL_MS,
  NORMAL_PAGES_COMPLETION_RESERVE_MS, hasOrdinaryPagesWriteBudget } from './lib/pages-sealed-retry-decision.mjs';
import { classifyProductionTargetFreshness } from './check-production-target-freshness.mjs';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';
import { createProtectedPrivateRuntimeClients } from './protected-private-production-runtime.mjs';
import { readProtectedPagesWriterSnapshot } from './protected-operational-reentry-evidence.mjs';

const api = 'https://api.github.com';
const repo = 'jakobjorgensen82-commits/RavRadar';
const publicBase = 'https://ravradar.dk/';
const minute = 60_000;
const retryPollMs = ORDINARY_PAGES_RETRY_POLL_MS;
const firstPollMs = 10 * minute;
const fixedRunId = /^[1-9]\d{0,15}$/;
const hex40 = /^[0-9a-f]{40}$/;

// No Pages write exists outside the accounted transport invocation below.
let transportInvocations = 0;
const transportOutcomes = [];

async function readJson(url, { headers, maximumBytes = 256 * 1024 } = {}) {
  const response = await fetch(url, { redirect: 'error', headers, signal: AbortSignal.timeout(12_000) });
  assert(response.status === 200 && response.url === url && !response.redirected, 'PAGES_RETRY_READ_FAILED');
  return JSON.parse(await readBoundedPublicManifest(response, maximumBytes));
}

async function main(env) {
  assert(env.GITHUB_REPOSITORY === repo && env.GITHUB_API_URL === api && env.GITHUB_REF === 'refs/heads/main'
    && env.GITHUB_WORKFLOW === 'Run current RavRadar weather once' && env.GITHUB_EVENT_NAME === 'workflow_dispatch'
    && env.GITHUB_RUN_ATTEMPT === '1' && env.GITHUB_ACTOR === 'github-actions[bot]'
    && env.GITHUB_TRIGGERING_ACTOR === 'github-actions[bot]' && env.RAVRADAR_ORDINARY_PAGES_RETRY === 'true'
    && env.RAVRADAR_PAGES_ARTIFACT_NAME === 'github-pages' && fixedRunId.test(env.GITHUB_RUN_ID ?? '') && hex40.test(env.GITHUB_SHA ?? '')
    && /^\S{1,4096}$/.test(env.GH_TOKEN ?? ''), 'PAGES_RETRY_ORDINARY_SCOPE_REQUIRED');
  const githubHeaders = { Authorization: 'Bearer ' + env.GH_TOKEN, Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28', 'Cache-Control': 'no-cache' };
  const github = route => readJson(api + '/repos/' + repo + route, { headers: githubHeaders });
  const runId = Number(env.GITHUB_RUN_ID);
  const run = await github('/actions/runs/' + runId);
  assert(run.id === runId && run.run_attempt === 1 && run.head_sha === env.GITHUB_SHA
    && run.head_branch === 'main' && run.status === 'in_progress'
    && run.event === 'workflow_dispatch' && run.actor?.login === 'github-actions[bot]',
  'PAGES_RETRY_RUN_IDENTITY');
  const deadline = getOrdinaryPagesRetryDeadline({
    createdAt: run.created_at, startedAt: run.run_started_at,
    jobStartedMs: Number(env.RAVRADAR_PAGES_JOB_STARTED_MS), nowMs: Date.now(),
  });
  const timeRemainingMs = () => deadline - Date.now();

  const handoff = path.resolve(env.RAVRADAR_OPERATIONAL_HANDOFF);
  const readHandoff = async file => JSON.parse(await fs.readFile(path.join(handoff, file), 'utf8'));
  const [seal, candidate, predecessor] = await Promise.all([
    readHandoff('pages-artifact-seal.json'), readHandoff('manifest.json'), readHandoff('source-manifest.json'),
  ]);
  assert(seal.targetPublicManifestSha256 === sha256CanonicalJson(candidate)
    && predecessor.complete === true && predecessor.zoneCount === 210 && predecessor.coastalPartCount === 673,
  'PAGES_RETRY_HANDOFF_INVALID');
  const predecessorSha256 = sha256CanonicalJson(predecessor);
  const clients=createProtectedPrivateRuntimeClients({storageBackend:'supabase',supabaseUrl:env.SUPABASE_URL,
    serviceRoleKey:env.SUPABASE_SERVICE_ROLE_KEY,fetchImpl:(url,options={})=>{
      const remaining=Math.floor(deadline-Date.now()-NORMAL_PAGES_COMPLETION_RESERVE_MS);
      assert(remaining>0,'PAGES_RETRY_WRITER_FENCE_UNPROVED');
      return fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(Math.min(12_000,remaining))});
    }});
  const writerOwner={repository:repo,runId,runAttempt:1,headSha:env.GITHUB_SHA,attemptId:seal.attemptId};
  let writerSnapshot;
  let observations = 0;
  const readPublic = async () => {
    const url = new URL('data/live/manifest.json', publicBase);
    url.searchParams.set('pages-retry', env.GITHUB_RUN_ID + '-' + (++observations));
    const document = await readJson(url.href, { headers: { 'Cache-Control': 'no-cache' }, maximumBytes: 512 * 1024 });
    return sha256CanonicalJson(document);
  };
  const revalidateWriter = async () => {
    const [main, currentRun] = await Promise.all([github('/git/ref/heads/main'), github('/actions/runs/' + runId)]);
    const checked = execFileSync('git', ['rev-parse', 'HEAD^{commit}'], { encoding: 'utf8', timeout: 5_000 }).trim();
    classifyProductionTargetFreshness({ target: candidate.productionReferenceAt, maximumAgeMinutes: 240 });
    if(!(main.ref === 'refs/heads/main' && main.object?.type === 'commit' && main.object.sha === env.GITHUB_SHA
      && checked === env.GITHUB_SHA && currentRun.id === runId && currentRun.run_attempt === 1
      && currentRun.head_sha === env.GITHUB_SHA && currentRun.status === 'in_progress'))return false;
    try{
      const proof=await readProtectedPagesWriterSnapshot({request:clients.documentRequest,storage:clients.storage,
        repository:repo,owner:writerOwner,seal,sourceManifest:predecessor,expectedSnapshot:writerSnapshot});
      writerSnapshot=proof.snapshotSha256;
      return true;
    }catch{return false;}
  };
  const receiptDir = await fs.realpath(env.RUNNER_TEMP);
  const deliveries = [];
  const submit = async (expectedSeal, deliveryOrdinal) => {
    transportInvocations++;
    let delivery;
    try {
      delivery = await runSealedPagesDeployment({
    env, seal: expectedSeal, expectedBaseUrl: publicBase, deliveryOrdinal,
    waitMs: deliveryOrdinal === 1 ? firstPollMs : retryPollMs,
    cancelAtDeadline: true, absoluteDeadlineMs: deadline, completionReserveMs: NORMAL_PAGES_COMPLETION_RESERVE_MS,
    beforeCreate: async intent => {
      const pollMs = deliveryOrdinal === 1 ? firstPollMs : retryPollMs;
      if (!hasOrdinaryPagesWriteBudget(timeRemainingMs(), pollMs)) return false;
      if (await readPublic() !== predecessorSha256) return false;
      if (deliveryOrdinal === 2) {
        const first = deliveries[0];
        if (timeRemainingMs() < MINIMUM_RECOVERY_WINDOW_MS || !hasSealedPagesRetryEvidence(first) || first?.outcome !== 'FAILED') return false;
        const url = first.receipt.statusUrl;
        const response = await readJson(url, { headers: githubHeaders, maximumBytes: 64 * 1024 });
        const observed = classifyPagesStatus({ status: 200, url, data: response }, first.receipt);
        if (observed.outcome !== 'FAILED' || observed.code !== first.code) return false;
      }
      const currentSeal = await readHandoff('pages-artifact-seal.json');
      if (sha256CanonicalJson(currentSeal) !== sha256CanonicalJson(expectedSeal)) return false;
      if (!await revalidateWriter()) return false;
      if (!hasOrdinaryPagesWriteBudget(timeRemainingMs(), pollMs)) return false;
      const file = path.join(receiptDir, 'rr-pages-' + runId + '-' + deliveryOrdinal + '.json');
      await fs.writeFile(file, JSON.stringify(intent) + '\n', { flag: 'wx', mode: 0o600 });
      return true;
    },
    });
    } catch (error) {
      transportOutcomes.push(error);
      throw error;
    }
    transportOutcomes.push(delivery);
    deliveries.push(delivery);
    return delivery;
  };
  const result = await publishSealedPagesWithRecovery({
    seal, predecessorSha256, submit, readPublic, revalidateWriter, timeRemainingMs,
  });
  if (result.kind !== 'VERIFY_PUBLIC') {
    const closed = new Set(['deployment_failed', 'deployment_cancelled', 'deployment_content_failed']);
    const terminal = deliveries.length > 0 && transportInvocations === transportOutcomes.length
      && transportInvocations === deliveries.length
      && transportOutcomes.every((delivery, index) => delivery === deliveries[index])
      && deliveries.every(delivery =>
        (delivery.outcome === 'FAILED' && hasSealedPagesTerminalEvidence(delivery)
          && delivery.receipt && closed.has(delivery.code))
        || (delivery.outcome === 'REJECTED' && hasSealedPagesCreateRejectionEvidence(delivery)));
    if (terminal && await readPublic() === predecessorSha256) {
      const ordinals = deliveries.map(delivery => delivery.request.deliveryOrdinal);
      assert(ordinals.every((ordinal, index) => ordinal === index + 1), 'PAGES_RETRY_DELIVERY_SEQUENCE');
      await fs.appendFile(env.GITHUB_OUTPUT, 'closed_unpublished=true\n');
    }
    console.error('PAGES_RETRY_DIAGNOSTIC ' + JSON.stringify({
      stage: result.stage ?? 'PUBLICATION_GATE', code: result.diagnostic ?? result.reason,
    }));
    throw new Error('PAGES_RETRY_PUBLICATION_UNPROVED');
  }
  assert(result.delivery?.receipt?.pageUrl, 'PAGES_RETRY_PUBLICATION_UNPROVED');
  await fs.appendFile(env.GITHUB_OUTPUT, 'page_url=' + result.delivery.receipt.pageUrl + '\n');
  console.log('PAGES_DEPLOY_DELIVERY_ATTEMPTS=' + result.attempts);
}

main(process.env).catch(async error => {
  if (transportInvocations === transportOutcomes.length && transportOutcomes.every(hasSealedPagesNoPostEvidence)) {
    // Includes a caller refusal before transport. After any attempted POST,
    // only the normal terminal/public evidence above can close the owner.
    try { await fs.appendFile(process.env.GITHUB_OUTPUT, 'closed_unpublished=true\n'); }
    catch { /* No closure output is safer than claiming an unrecorded proof. */ }
  }
  const known = new Set(['PAGES_RETRY_READ_FAILED', 'PAGES_RETRY_ORDINARY_SCOPE_REQUIRED',
    'PAGES_RETRY_RUN_IDENTITY', 'PAGES_RETRY_HANDOFF_INVALID', 'PAGES_RETRY_DELIVERY_SEQUENCE',
    'PAGES_RETRY_PUBLICATION_UNPROVED', 'PAGES_RETRY_JOB_CLOCK']);
  const code = known.has(error?.message) ? error.message : 'PAGES_RETRY_FAILED_CLOSED';
  console.error(code);
  process.exitCode = 1;
});
