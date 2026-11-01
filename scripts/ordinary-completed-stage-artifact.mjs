// A locator/downloader for an unpublished ordinary build, NOT publish admission.
// The original identity is passed unchanged to the existing GCM opener later.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';

const execute = promisify(execFile);
const WORKFLOW = '.github/workflows/run-current-weather-once.yml';
const JOB = 'Build and prepare weather production through reusable workflow / build-and-prepare';
const STEPS = Object.freeze([
  'Update central weather cache',
  'Build private production runtime bundle specification',
  'Create the next private production runtime bundle atomically',
  'Encrypt exact completed private build for late-failure recovery',
  'Save only encrypted completed private build for one day',
]);
const TERMINAL = new Set(['success', 'failure', 'cancelled', 'timed_out']);
const MAX_SEALED = PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes + 32 * 1024 + 1024;
const MAX_ZIP = MAX_SEALED + 1024 * 1024;
const MAX_JSON = 4 * 1024 * 1024;
const EXTRACTOR = fileURLToPath(new URL('./extract-ordinary-completed-stage.py', import.meta.url));
const fail = code => { throw Object.assign(new Error(code), { code }); };
const require = (value, code) => { if (!value) fail(code); };
const positive = value => Number.isSafeInteger(value) && value > 0;
const id = value => typeof value === 'string' && /^[1-9][0-9]*$/.test(value)
  && positive(Number(value)) && String(Number(value)) === value;
const time = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)
  && Number.isFinite(Date.parse(value)) ? Date.parse(value) : NaN;

async function readBody(response, maximum, onChunk) {
  require(response?.body?.getReader, 'ORDINARY_STAGE_BODY_UNAVAILABLE');
  const length = response.headers.get('content-length');
  require(length === null || (/^(0|[1-9][0-9]*)$/.test(length)
    && Number.isSafeInteger(Number(length)) && Number(length) <= maximum), 'ORDINARY_STAGE_BODY_BOUND');
  const reader = response.body.getReader();
  let bytes = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      require(part.value instanceof Uint8Array, 'ORDINARY_STAGE_BODY_INVALID');
      bytes += part.value.byteLength;
      require(bytes <= maximum, 'ORDINARY_STAGE_BODY_BOUND');
      await onChunk(part.value);
    }
    require(length === null || bytes === Number(length), 'ORDINARY_STAGE_BODY_LENGTH');
    return bytes;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

// Only these fixed historical attempts have a separately authenticated workflow.
// No caller-selectable workflow and no general update-and-deploy admission.
function producerWorkflow(identity) {
  if (identity.runId === '41231144384') {
    if (identity.runAttempt !== '1' || identity.sourceHead !== '7a08f6a8dfb2131898e7270a2429c3f4f810a842')
      fail('ORDINARY_STAGE_PRODUCER_IDENTITY');
    return '.github/workflows/update-and-deploy.yml';
  }
  if (identity.runId === '41256251412'
    && (identity.runAttempt !== '1' || identity.sourceHead !== '37a34703d9ae8bfb2c28056f21a7ea73944033ae'))
    fail('ORDINARY_STAGE_PRODUCER_IDENTITY');
  return WORKFLOW;
}

function assertRun(run, identity, now) {
  const { repository, runId, runAttempt, sourceHead } = identity;
  require(positive(run?.id) && positive(run?.run_attempt)
    && String(run.id) === runId && String(run.run_attempt) === runAttempt
    && run.repository?.full_name === repository && run.head_repository?.full_name === repository
    && positive(run.repository?.id) && run.head_repository?.id === run.repository.id
    && run.path === producerWorkflow(identity) && run.event === 'workflow_dispatch' && run.head_branch === 'main'
    && run.head_sha === sourceHead && run.status === 'completed' && TERMINAL.has(run.conclusion)
    && Number.isFinite(time(run.run_started_at)) && time(run.run_started_at) <= time(run.updated_at)
    && time(run.updated_at) <= now, 'ORDINARY_STAGE_PRODUCER_IDENTITY');
}

function completeList(value, key) {
  require(Number.isSafeInteger(value?.total_count) && value.total_count >= 0
    && value.total_count <= 100 && Array.isArray(value[key])
    && value[key].length === value.total_count, 'ORDINARY_STAGE_LIST_INCOMPLETE');
  return value[key];
}

function producerJob(value, run) {
  const jobs = completeList(value, 'jobs');
  const matching = jobs.filter(job => job?.name === JOB);
  require(matching.length === 1, 'ORDINARY_STAGE_JOB_IDENTITY');
  const job = matching[0];
  require(positive(job.id) && job.run_id === run.id && job.run_attempt === run.run_attempt
    && job.head_sha === run.head_sha && job.head_branch === 'main'
    && job.status === 'completed' && TERMINAL.has(job.conclusion)
    && time(job.started_at) >= time(run.run_started_at)
    && time(job.completed_at) >= time(job.started_at)
    && time(job.completed_at) <= time(run.updated_at)
    && Array.isArray(job.steps) && job.steps.length <= 512, 'ORDINARY_STAGE_JOB_IDENTITY');
  let previousNumber = 0;
  let previousEnd = time(job.started_at);
  const steps = STEPS.map(name => {
    const matchingSteps = job.steps.filter(step => step?.name === name);
    require(matchingSteps.length === 1, 'ORDINARY_STAGE_REQUIRED_STEP');
    const step = matchingSteps[0];
    require(positive(step.number) && step.number > previousNumber
      && step.status === 'completed' && step.conclusion === 'success'
      && time(step.started_at) >= previousEnd && time(step.completed_at) >= time(step.started_at)
      && time(step.completed_at) <= time(job.completed_at), 'ORDINARY_STAGE_REQUIRED_STEP');
    previousNumber = step.number;
    previousEnd = time(step.completed_at);
    return { name, number: step.number, startedAt: step.started_at, completedAt: step.completed_at };
  });
  return { job, steps };
}

/** Downloads ciphertext only. Caller must later use the normal GCM opener,
 * source compatibility, fresh predecessor/write admission and all delivery gates.
 * Successful ownership of privateDirectory transfers to the caller for cleanup.
 * No environment secret is read here, and no raw server response is logged. */
export async function downloadOrdinaryCompletedStageArtifact({ repository, runId, runAttempt,
  sourceHead, token, fetchImpl = globalThis.fetch, python = process.env.PYTHON || 'python',
  now = new Date().toISOString() } = {}) {
  require(typeof repository === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)
    && id(runId) && id(runAttempt) && /^[a-f0-9]{40}$/.test(sourceHead ?? '')
    && typeof token === 'string' && token.length > 0 && !/[\r\n]/.test(token)
    && typeof fetchImpl === 'function' && typeof python === 'string' && python.length > 0
    && Number.isFinite(time(now)), 'ORDINARY_STAGE_REQUEST');
  const identity = Object.freeze({ repository, runId, runAttempt, sourceHead });
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'RavRadar-ordinary-completed-stage',
    'Cache-Control': 'no-cache' };
  const signal = AbortSignal.timeout(180_000);
  const base = `https://api.github.com/repos/${repository}`;
  let requests = 0;
  let own;
  const request = async (url, authenticated = true) => {
    require(++requests <= 5, 'ORDINARY_STAGE_REQUEST_BOUND');
    try {
      return await fetchImpl(url, { headers: authenticated ? headers : {}, redirect: 'manual', signal });
    } catch { fail('ORDINARY_STAGE_TRANSPORT_FAILED'); }
  };
  const json = async url => {
    const response = await request(url);
    require(response?.status === 200, 'ORDINARY_STAGE_METADATA_HTTP');
    const chunks = [];
    await readBody(response, MAX_JSON, part => { chunks.push(Buffer.from(part)); });
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { fail('ORDINARY_STAGE_METADATA_JSON'); }
  };
  try {
    const run = await json(`${base}/actions/runs/${runId}/attempts/${runAttempt}`);
    assertRun(run, identity, time(now));
    const { job, steps } = producerJob(await json(
      `${base}/actions/runs/${runId}/attempts/${runAttempt}/jobs?per_page=100`), run);
    const artifacts = completeList(await json(`${base}/actions/runs/${runId}/artifacts?per_page=100`), 'artifacts');
    const name = `ravradar-private-build-stage-${runId}-${runAttempt}`;
    const matching = artifacts.filter(artifact => artifact?.name === name);
    require(matching.length === 1, 'ORDINARY_STAGE_ARTIFACT_IDENTITY');
    const artifact = matching[0];
    const upload = steps.at(-1);
    require(positive(artifact.id) && artifact.expired === false
      && artifact.workflow_run?.id === run.id
      && artifact.workflow_run?.repository_id === run.repository.id
      && artifact.workflow_run?.head_repository_id === run.repository.id
      && artifact.workflow_run?.head_sha === sourceHead && artifact.workflow_run?.head_branch === 'main'
      && /^sha256:[a-f0-9]{64}$/.test(artifact.digest ?? '')
      && positive(artifact.size_in_bytes) && artifact.size_in_bytes <= MAX_ZIP
      && time(artifact.created_at) >= time(upload.startedAt)
      && time(artifact.created_at) <= time(upload.completedAt)
      && time(artifact.updated_at) >= time(artifact.created_at)
      && time(artifact.updated_at) <= time(job.completed_at)
      && time(artifact.expires_at) > time(now), 'ORDINARY_STAGE_ARTIFACT_IDENTITY');
    let response = await request(`${base}/actions/artifacts/${artifact.id}/zip`);
    if (response?.status === 302) {
      let location;
      try { location = new URL(response.headers.get('location')); }
      catch { fail('ORDINARY_STAGE_REDIRECT_REFUSED'); }
      require(location.protocol === 'https:' && !location.username && !location.password
        && !location.port && !location.hash && (location.hostname.endsWith('.blob.core.windows.net')
          || location.hostname.endsWith('.githubusercontent.com')), 'ORDINARY_STAGE_REDIRECT_REFUSED');
      await response.body?.cancel();
      response = await request(location.href, false); // Never forward the GitHub bearer to storage.
    }
    require(response?.status === 200 && [null, 'identity'].includes(response.headers.get('content-encoding')),
      'ORDINARY_STAGE_DOWNLOAD_HTTP');
    own = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'rr-ordinary-completed-stage-'));
    const zipPath = path.join(own, 'artifact.zip');
    const sealedPath = path.join(own, 'sealed.bin');
    const output = await fs.open(zipPath, 'wx', 0o600);
    const hash = crypto.createHash('sha256');
    let count;
    try {
      count = await readBody(response, artifact.size_in_bytes, async chunk => {
        hash.update(chunk);
        for (let offset = 0; offset < chunk.length;) {
          const written = await output.write(chunk, offset);
          require(written.bytesWritten > 0, 'ORDINARY_STAGE_WRITE_FAILED');
          offset += written.bytesWritten;
        }
      });
      await output.sync();
    } finally { await output.close(); }
    require(count === artifact.size_in_bytes && `sha256:${hash.digest('hex')}` === artifact.digest,
      'ORDINARY_STAGE_ARTIFACT_DIGEST');
    let extracted;
    try {
      const child = await execute(python, [EXTRACTOR, zipPath, sealedPath],
        { timeout: 100_000, maxBuffer: 4096, windowsHide: true });
      require(child.stderr === '', 'ORDINARY_STAGE_EXTRACTION_REFUSED');
      extracted = JSON.parse(child.stdout);
    } catch (error) {
      const code = String(error?.stderr ?? '').trim();
      const failure = Object.assign(new Error('ORDINARY_STAGE_EXTRACTION_REFUSED'),
        { code: 'ORDINARY_STAGE_EXTRACTION_REFUSED' });
      failure.extractorCode = /^ORDINARY_STAGE_ZIP_REFUSED_(INPUT|ZIP_PREFLIGHT|MEMBER|SIZE|COPY_CRC|INPUT_IDENTITY)$/.test(code)
        ? code : 'ORDINARY_STAGE_ZIP_REFUSED_UNKNOWN';
      throw failure;
    }
    const stat = await fs.lstat(sealedPath);
    require(extracted?.code === 'ORDINARY_STAGE_CIPHERTEXT_EXTRACTED'
      && extracted.contentsAuthenticated === false && extracted.publicationAuthorized === false
      && stat.isFile() && !stat.isSymbolicLink() && positive(stat.size) && stat.size <= MAX_SEALED
      && extracted.bytes === stat.size && /^[a-f0-9]{64}$/.test(extracted.sha256 ?? ''),
      'ORDINARY_STAGE_EXTRACTION_REFUSED');
    await fs.unlink(zipPath);
    return { code: 'ORDINARY_STAGE_CIPHERTEXT_LOCATED', identity,
      producer: { workflow: producerWorkflow(identity), jobId: job.id, conclusion: run.conclusion, steps },
      artifact: { id: artifact.id, name, digest: artifact.digest, bytes: artifact.size_in_bytes,
        createdAt: artifact.created_at, expiresAt: artifact.expires_at },
      privateDirectory: own, sealedPath, sealedBytes: stat.size, sealedSha256: extracted.sha256,
      requestCount: requests, contentsAuthenticated: false, publicationAuthorized: false };
  } catch (error) {
    if (own) await fs.rm(own, { recursive: true, force: true }).catch(() => {});
    if (/^ORDINARY_STAGE_[A-Z_]+$/.test(error?.code ?? '')) throw error;
    fail('ORDINARY_STAGE_READ_FAILED');
  }
}
