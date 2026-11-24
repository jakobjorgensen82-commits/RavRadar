import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFile, mkdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { readBoundedPublicManifest } from './lib/pages-generation-order.mjs';
import { DMI_PRODUCER_JOB, successfulStep } from './lib/terminal-dmi-cache.mjs';

const REPOSITORY = 'jakobjorgensen82-commits/RavRadar';
const WORKFLOW = '.github/workflows/run-current-weather-once.yml';
const OBSERVE = 'Observe exact restored RAW coverage for the locked successor before DMI';
const PROOF_UPLOAD = 'Publish the bounded RAW rotation handoff before DMI';
const PROOF_WAIT = 'Wait for the RAW rotation decision before DMI';
const RESULT_JOB = 'Retire verified older DMI RAW archives';
const RESULT_UPLOAD = 'Publish the RAW rotation decision';
const SAVED_OBSERVATION = 'Prove that this run saved the required DMI originals';
const SAVED_UPLOAD = 'Publish same-run DMI RAW coverage receipt';
const TERMINAL_JOB = 'Require a verified current-weather deployment';
const TERMINAL_STEP = 'Summarize and require the complete normal production path';
const SHA40 = /^[a-f0-9]{40}$/;
const ARTIFACT_DIGEST = /^sha256:[a-f0-9]{64}$/;
const MAX_ARTIFACT_BYTES = 16 * 1024;
const MAX_RECEIPT_BYTES = 1024;
const RECEIPT_FILES = Object.freeze({ proof: 'handoff.json', result: 'decision.json', 'saved-coverage': 'coverage.json' });
const POLL_MS = 3000;
const RETRYABLE_RESULT_OBSERVATIONS = new Set([
  'artifact-inventory-incomplete', 'incomplete-jobs', 'result-publication-incomplete',
]);
const TEMPORARY_METADATA_HTTP = [429, 500, 502, 503, 504];
const TEMPORARY_METADATA_CONNECTION = ['EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET'];
const MISSING_PROOF_PRODUCER_POLL_INTERVAL = 10;
const DEADLINE_MS = { proof: 15 * 60_000, 'observe-proof': 90_000, result: 180_000, 'saved-coverage': 30_000 };
const positive = value => Number.isSafeInteger(value) && value > 0;
const timestamp = value => typeof value === 'string' ? Date.parse(value) : NaN;
const hold = reason => ({ status: 'HOLD', reason });
const pending = () => ({ status: 'PENDING' });

function temporaryMetadataRead(error) {
  return TEMPORARY_METADATA_HTTP.includes(error?.statusCode)
    || (error?.statusCode === 403 && error.rateLimited === true)
    || ['TimeoutError', 'AbortError'].includes(error?.name)
    || TEMPORARY_METADATA_CONNECTION.includes(error?.cause?.code ?? error?.code);
}

function metadataHttpError(response) {
  const retryAfter = response.headers.get('retry-after') ?? '';
  const reset = response.headers.get('x-ratelimit-reset') ?? '';
  const exhausted = response.headers.get('x-ratelimit-remaining') === '0';
  const retryAfterMs = /^\d{1,10}$/.test(retryAfter) ? Number(retryAfter) * 1000 : 0;
  const resetDelayMs = exhausted && /^\d{1,10}$/.test(reset) ? Number(reset) * 1000 - Date.now() : 0;
  const rateLimited = response.status === 429 || (response.status === 403 && (exhausted || retryAfterMs > 0));
  const retryDelayMs = Math.max(0, retryAfterMs, resetDelayMs) || (rateLimited ? 60_000 : 0);
  return Object.assign(new Error('RAW_ARTIFACT_METADATA_HTTP'), {
    statusCode: response.status, rateLimited, retryDelayMs,
  });
}

function normalRun(run, { repositoryId, runId, attempt, head }) {
  return run?.id === runId && run.run_attempt === attempt && run.head_sha === head && run.head_branch === 'main'
    && run.repository?.id === repositoryId && run.repository.full_name === REPOSITORY
    && run.head_repository?.id === repositoryId && run.path === WORKFLOW && run.event === 'workflow_dispatch'
    && run.status === 'in_progress' && run.conclusion === null
    && run.actor?.login === 'github-actions[bot]' && run.triggering_actor?.login === 'github-actions[bot]';
}

function exactArtifact(row, { name, repositoryId, runId, head }, now) {
  return row?.name === name && positive(row.id) && row.expired === false
    && positive(row.size_in_bytes) && row.size_in_bytes <= MAX_ARTIFACT_BYTES
    && ARTIFACT_DIGEST.test(row.digest ?? '') && timestamp(row.expires_at) > now
    && row.workflow_run?.id === runId && row.workflow_run?.head_sha === head
    && row.workflow_run?.head_branch === 'main' && row.workflow_run?.repository_id === repositoryId
    && row.workflow_run?.head_repository_id === repositoryId;
}

function publicationStep(response, { kind, runId, attempt, head }) {
  if (!Array.isArray(response?.jobs) || response.total_count !== response.jobs.length
      || response.jobs.length > 100) return hold('incomplete-jobs');
  const result = kind === 'result';
  const jobs = response.jobs.filter(job => job?.name === (result ? RESULT_JOB : DMI_PRODUCER_JOB));
  if (jobs.length !== 1) return jobs.length === 0 ? null : hold('ambiguous-publisher');
  const [job] = jobs;
  if (!positive(job.id) || job.run_id !== runId || job.run_attempt !== attempt || job.head_sha !== head
      || job.head_branch !== 'main' || !Array.isArray(job.steps)) return hold('publisher-identity-unproved');
  if (!(job.status === 'in_progress' && job.conclusion === null)
      && !(job.status === 'completed' && job.conclusion === 'success')) {
    if (result && job.conclusion === null && ['queued', 'pending', 'waiting', 'completed'].includes(job.status)) {
      return hold('result-publication-incomplete');
    }
    return hold('publisher-not-successful');
  }

  const saved = kind === 'saved-coverage';
  const uploadName = saved ? SAVED_UPLOAD : result ? RESULT_UPLOAD : PROOF_UPLOAD;
  const upload = successfulStep(job, uploadName);
  if (!upload) {
    const rows = job.steps.filter(step => step?.name === uploadName);
    const [row] = rows;
    // GitHub can expose a finalized artifact before the upload step's conclusion
    // or timestamps are visible. Poll again without admitting the artifact.
    if (result && rows.length <= 1 && (!row
      || (row.conclusion === null && ['queued', 'pending', 'in_progress', 'completed'].includes(row.status))
      || (row.status === 'completed' && row.conclusion === 'success'
        && (row.started_at == null || row.completed_at == null)))) return hold('result-publication-incomplete');
    return job.status === 'completed' || rows.length > 1 || row?.status === 'completed'
      ? hold('upload-not-successful') : null;
  }
  if (result) return upload;
  const observed = successfulStep(job, saved ? SAVED_OBSERVATION : OBSERVE);
  if (!observed || observed.number >= upload.number || observed.completedAt > upload.startedAt) {
    return hold('observation-not-successful');
  }
  if (kind === 'proof') {
    const waiting = job.steps.filter(step => step?.name === PROOF_WAIT);
    if (job.status !== 'in_progress' || waiting.length > 1 || waiting[0]?.status === 'completed') {
      return hold('producer-not-waiting');
    }
    if (waiting.length === 0 || waiting[0].status === 'queued' || waiting[0].status === 'pending') return null;
    const [step] = waiting;
    if (step.status !== 'in_progress' || step.conclusion !== null || !positive(step.number)
        || step.number <= upload.number || !(timestamp(step.started_at) >= upload.completedAt)) {
      return hold('producer-not-waiting');
    }
  }
  if (saved) {
    const terminal = response.jobs.filter(row => row?.name === TERMINAL_JOB);
    const [completion] = terminal;
    const finalized = successfulStep(completion ?? {}, TERMINAL_STEP);
    if (job.status !== 'completed' || terminal.length !== 1 || completion.run_id !== runId
        || completion.run_attempt !== attempt || completion.head_sha !== head || completion.head_branch !== 'main'
        || completion.status !== 'completed' || completion.conclusion !== 'success'
        || !finalized || finalized.startedAt < upload.completedAt) {
      return hold('terminal-coverage-owner-unproved');
    }
  }
  return upload;
}

// Use the same authenticated read again immediately before each retirement.
// The receiver must also authenticate the downloaded contents independently.
export async function readRawRotationArtifactOnce({ kind, repositoryId, runId, attempt, head, getJson,
  expectedArtifactId, expectedDigest, now = Date.now, inspectMissingProofProducer = false } = {}) {
  if (!Object.hasOwn(DEADLINE_MS, kind) || !positive(repositoryId) || !positive(runId) || attempt !== 1
      || typeof head !== 'string' || !SHA40.test(head) || typeof getJson !== 'function'
      || (expectedArtifactId !== undefined && !positive(expectedArtifactId))
      || (expectedDigest !== undefined && (typeof expectedDigest !== 'string' || !ARTIFACT_DIGEST.test(expectedDigest)))) {
    return hold('invalid-context');
  }
  const label = kind === 'saved-coverage' ? 'raw-saved-coverage' : kind === 'result' ? 'raw-rotation-result' : 'raw-rotation-proof';
  const name = `${label}-${runId}-${attempt}`;
  const context = { kind, name, repositoryId, runId, attempt, head };
  const runPath = `/repos/${REPOSITORY}/actions/runs/${runId}`;
  const attemptPath = `${runPath}/attempts/${attempt}`;
  const readMetadata = async (endpoint, route) => {
    try { return await getJson(route); }
    catch (cause) {
      throw Object.assign(new Error('RAW_ARTIFACT_METADATA_READ', { cause }), { endpoint });
    }
  };
  try {
    const listing = await readMetadata('artifact-list', `${runPath}/artifacts?name=${name}&per_page=2`);
    if (!Array.isArray(listing?.artifacts) || listing.total_count > 1 || listing.artifacts.length > 1) {
      return hold('artifact-not-unique');
    }
    if (listing.total_count !== listing.artifacts.length) {
      return hold(kind === 'result' ? 'artifact-inventory-incomplete' : 'artifact-not-unique');
    }
    if (!listing.total_count) {
      if (kind === 'proof' && inspectMissingProofProducer) {
        let response;
        try {
          response = await getJson(`${attemptPath}/jobs?per_page=100`);
        } catch {
          // A failed optional observation says nothing about an absent proof.
          return pending();
        }
        if (Array.isArray(response?.jobs) && response.total_count === response.jobs.length
            && response.jobs.length <= 100) {
          const producers = response.jobs.filter(job => job?.name === DMI_PRODUCER_JOB);
          const [producer] = producers;
          if (producers.length === 1 && positive(producer.id) && producer.run_id === runId
              && producer.run_attempt === attempt && producer.head_sha === head && producer.head_branch === 'main'
              && producer.status === 'completed') {
            const upload = Array.isArray(producer.steps) ? producer.steps.filter(step => step?.name === PROOF_UPLOAD) : [];
            if (['failure', 'cancelled', 'timed_out', 'skipped'].includes(producer.conclusion)
                || (upload.length === 1 && upload[0].status === 'completed' && upload[0].conclusion === 'skipped')) {
              return hold('producer-finished-without-proof');
            }
          }
        }
      }
      return pending();
    }
    const [artifact] = listing.artifacts;
    if (!exactArtifact(artifact, context, now())
        || (expectedArtifactId !== undefined && artifact.id !== expectedArtifactId)
        || (expectedDigest !== undefined && artifact.digest !== expectedDigest)) {
      return hold('artifact-identity-unproved');
    }
    const [run, jobs] = await Promise.all([
      readMetadata('attempt', attemptPath),
      readMetadata('jobs', `${attemptPath}/jobs?per_page=100`),
    ]);
    if (!normalRun(run, context)) return hold('run-not-current');
    const upload = publicationStep(jobs, context);
    if (!upload) return pending();
    if (upload.status === 'HOLD') return upload;
    const created = timestamp(artifact.created_at), updated = timestamp(artifact.updated_at);
    if (!(created >= upload.startedAt - 1000 && updated >= created && updated <= upload.completedAt + 2000)) {
      return hold('artifact-outside-upload-step');
    }
    return { status: 'FOUND', artifactId: artifact.id, digest: artifact.digest };
  } catch (error) {
    const cause = error?.cause;
    const temporary = (kind === 'proof' || kind === 'result') && temporaryMetadataRead(cause);
    const status = cause?.statusCode;
    return {
      ...hold(temporary ? 'metadata-temporarily-unavailable' : 'metadata-unavailable'),
      metadataEndpoint: error?.endpoint ?? 'response-validation',
      metadataCode: Number.isInteger(status) && status >= 100 && status <= 599
        ? `http-${status}` : temporary ? 'transport' : 'unreadable',
      retryDelayMs: temporary && positive(cause?.retryDelayMs) ? cause.retryDelayMs : 0,
    };
  }
}

export async function findRawRotationArtifact({ pause = wait, signal, ...context } = {}) {
  if (!Object.hasOwn(DEADLINE_MS, context.kind)) return hold('invalid-context');
  const lookups = Math.ceil(DEADLINE_MS[context.kind] / POLL_MS);
  let lastIncompleteObservation;
  let delay = POLL_MS;
  try {
    for (let poll = 0; poll < lookups && !signal?.aborted; poll += 1) {
      if (poll) await pause(delay, undefined, { signal });
      delay = POLL_MS;
      const finding = await readRawRotationArtifactOnce({
        ...context, inspectMissingProofProducer: poll % MISSING_PROOF_PRODUCER_POLL_INTERVAL === 0,
      });
      if (signal?.aborted) break;
      if (finding.status === 'PENDING') continue;
      const retryable = finding.reason === 'metadata-temporarily-unavailable'
        || (context.kind === 'result' && RETRYABLE_RESULT_OBSERVATIONS.has(finding.reason));
      if (!retryable) return finding;
      lastIncompleteObservation = finding;
      delay = Math.max(POLL_MS, finding.retryDelayMs ?? 0);
      if (delay >= DEADLINE_MS[context.kind]) return finding;
    }
  } catch {
    if (!signal?.aborted) return hold('metadata-unavailable');
  }
  return lastIncompleteObservation ?? hold('artifact-not-ready');
}

// The finder already proved the artifact identity. Fetch its exact ZIP without
// listing the run again, and verify the digest before opening the single file.
export async function downloadRawRotationReceipt({ kind, artifactId, digest, token,
  fetchImpl = fetch, python = 'python3' } = {}) {
  if (!Object.hasOwn(RECEIPT_FILES, kind) || !positive(artifactId) || !ARTIFACT_DIGEST.test(digest ?? '')
    || typeof token !== 'string' || !/^\S{1,4096}$/.test(token)) throw new Error('RAW_RECEIPT_IDENTITY');

  const signal = AbortSignal.timeout(15_000);
  const route = `https://api.github.com/repos/${REPOSITORY}/actions/artifacts/${artifactId}/zip`;
  const response = await fetchImpl(route, { redirect: 'manual', cache: 'no-store', signal,
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10' } });
  await response.body?.cancel();
  const location = response.headers.get('location');
  if (response.status !== 302 || !location) throw new Error('RAW_RECEIPT_HTTP');
  const storage = new URL(location);
  if (storage.protocol !== 'https:' || storage.username || storage.password || storage.port || storage.hash
    || !['.blob.core.windows.net', '.githubusercontent.com'].some(suffix => storage.hostname.endsWith(suffix))) {
    throw new Error('RAW_RECEIPT_REDIRECT');
  }

  // The short-lived storage URL already authenticates this request.
  const archive = await fetchImpl(storage.href, { redirect: 'error', cache: 'no-store', signal });
  const contentLength = archive.headers.get('content-length');
  if (archive.status !== 200 || !archive.body || ![null, 'identity'].includes(archive.headers.get('content-encoding'))
    || (contentLength !== null && (!/^[1-9][0-9]*$/.test(contentLength) || Number(contentLength) > MAX_ARTIFACT_BYTES))) {
    await archive.body?.cancel();
    throw new Error('RAW_RECEIPT_HTTP');
  }
  const reader = archive.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ARTIFACT_BYTES) throw new Error('RAW_RECEIPT_SIZE');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const zip = Buffer.concat(chunks, size);
  if (!size || (contentLength !== null && size !== Number(contentLength))
    || 'sha256:' + createHash('sha256').update(zip).digest('hex') !== digest) throw new Error('RAW_RECEIPT_DIGEST');

  const name = RECEIPT_FILES[kind];
  const extractor = [
    'import io, sys, zipfile',
    'archive = zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))',
    'assert archive.namelist() == [sys.argv[1]]',
    'member = archive.infolist()[0]',
    'assert not member.is_dir() and not (member.flag_bits & 1) and 0 < member.file_size <= int(sys.argv[2])',
    'data = archive.read(member)',
    'assert len(data) == member.file_size',
    'sys.stdout.buffer.write(data)',
  ].join('\n');
  try {
    const bytes = execFileSync(python, ['-I', '-c', extractor, name, String(MAX_RECEIPT_BYTES)],
      { input: zip, timeout: 3000, maxBuffer: 4096, windowsHide: true,
        env: { PATH: process.env.PATH }, stdio: ['pipe', 'pipe', 'pipe'] });
    if (!bytes.length || bytes.length > MAX_RECEIPT_BYTES) throw new Error();
    return { name, bytes };
  } catch {
    throw new Error('RAW_RECEIPT_ZIP');
  }
}

async function main(env, args) {
  const option = args.length === 1 && args[0].startsWith('--') ? args[0].slice(2) : '';
  const download = option.startsWith('download-');
  const kind = download ? option.slice('download-'.length) : option;
  if (env.GITHUB_REPOSITORY !== REPOSITORY || env.GITHUB_API_URL !== 'https://api.github.com'
      || env.GITHUB_WORKFLOW_REF !== `${REPOSITORY}/${WORKFLOW}@refs/heads/main`
      || env.GITHUB_ACTIONS !== 'true' || env.RUNNER_ENVIRONMENT !== 'github-hosted'
      || env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_EVENT_NAME !== 'workflow_dispatch'
      || env.GITHUB_ACTOR !== 'github-actions[bot]' || env.GITHUB_TRIGGERING_ACTOR !== 'github-actions[bot]'
      || !/^\S{1,4096}$/.test(env.GITHUB_TOKEN ?? '') || !env.GITHUB_OUTPUT
      || ![env.GITHUB_REPOSITORY_ID, env.GITHUB_RUN_ID, env.GITHUB_RUN_ATTEMPT]
        .every(value => /^[1-9][0-9]{0,15}$/.test(value ?? '')) || !Object.hasOwn(DEADLINE_MS, kind)) {
    if (download) throw new Error('RAW_RECEIPT_CONTEXT');
    if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, 'artifact_status=hold\nartifact_reason=invalid-context\n');
    return;
  }
  if (download) {
    const { name, bytes } = await downloadRawRotationReceipt({ kind,
      artifactId: Number(env.RAW_ROTATION_ARTIFACT_ID), digest: env.RAW_ROTATION_ARTIFACT_DIGEST, token: env.GITHUB_TOKEN });
    const parent = path.resolve(env.RUNNER_TEMP);
    if (await realpath(parent) !== parent) throw new Error('RAW_RECEIPT_DIRECTORY');
    const directory = path.join(parent, 'ravradar-raw-rotation-received');
    await mkdir(directory, { mode: 0o700 });
    await writeFile(path.join(directory, name), bytes, { flag: 'wx', mode: 0o600 });
    return;
  }
  const signal = AbortSignal.timeout(DEADLINE_MS[kind]);
  const finding = await findRawRotationArtifact({ kind, repositoryId: Number(env.GITHUB_REPOSITORY_ID),
    runId: Number(env.GITHUB_RUN_ID), attempt: Number(env.GITHUB_RUN_ATTEMPT), head: env.GITHUB_SHA, signal,
    getJson: async route => {
      const response = await fetch('https://api.github.com' + route, {
        method: 'GET', redirect: 'error', cache: 'no-store',
        signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]),
        headers: { Authorization: 'Bearer ' + env.GITHUB_TOKEN, Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2026-03-10' },
      });
      if (response.status !== 200) {
        const error = metadataHttpError(response);
        await response.body?.cancel().catch(() => {});
        throw error;
      }
      return JSON.parse(await readBoundedPublicManifest(response));
    },
  });
  if (finding.status !== 'FOUND') console.log('RAW_ROTATION_ARTIFACT_HOLD ' + kind + ' ' + finding.reason);
  if (finding.metadataEndpoint) {
    console.log('RAW_ROTATION_METADATA_READ ' + kind + ' ' + finding.metadataEndpoint + ' ' + finding.metadataCode);
  }
  await appendFile(env.GITHUB_OUTPUT, finding.status === 'FOUND'
    ? `artifact_status=found\nartifact_id=${finding.artifactId}\nartifact_digest=${finding.digest}\n`
    : `artifact_status=hold\nartifact_reason=${finding.reason}\n`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try { await main(process.env, process.argv.slice(2)); }
  catch { console.error('RAW_ROTATION_ARTIFACT_FINDER_REFUSED'); process.exitCode = 1; }
}
