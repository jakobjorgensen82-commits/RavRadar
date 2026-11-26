import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { downloadRawRotationReceipt, findRawRotationArtifact, readRawRotationArtifactOnce } from './find-raw-rotation-artifact.mjs';
import { DMI_PRODUCER_JOB } from './lib/terminal-dmi-cache.mjs';

const repository = 'jakobjorgensen82-commits/RavRadar';
const head = 'a'.repeat(40);
const digest = 'sha256:' + 'b'.repeat(64);
const time = seconds => `2026-11-19T08:00:${String(seconds).padStart(2, '0')}Z`;
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

function receiptArchive(names) {
  const program = [
    'import io, sys, zipfile',
    'output = io.BytesIO()',
    'with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:',
    '    for name in sys.argv[1:]: archive.writestr(name, b"{}")',
    'sys.stdout.buffer.write(output.getvalue())',
  ].join('\n');
  return execFileSync(python, ['-I', '-c', program, ...names], { timeout: 3000, maxBuffer: 4096 });
}

function directReceipt(archive, { location = 'https://test.blob.core.windows.net/receipt?synthetic=1',
  expectedDigest = 'sha256:' + createHash('sha256').update(archive).digest('hex') } = {}) {
  let requests = 0;
  return {
    requests: () => requests,
    download: kind => downloadRawRotationReceipt({ kind, artifactId: 14, digest: expectedDigest,
      token: 'synthetic-token', python, fetchImpl: async (url, options) => {
        if (++requests === 1) {
          assert.equal(url, 'https://api.github.com/repos/' + repository + '/actions/artifacts/14/zip');
          assert.equal(options.redirect, 'manual');
          assert.equal(options.headers.Authorization, 'Bearer synthetic-token');
          return new Response(null, { status: 302, headers: { location } });
        }
        assert.equal(url, location);
        assert.equal(options.redirect, 'error');
        assert.equal(options.headers, undefined);
        return new Response(archive, { headers: { 'content-length': String(archive.length) } });
      } }),
  };
}

test('RAW receipts use their exact artifact endpoint and leave credentials at GitHub', async () => {
  for (const [kind, name] of [['proof', 'handoff.json'], ['result', 'decision.json'], ['saved-coverage', 'coverage.json']]) {
    const client = directReceipt(receiptArchive([name]));
    const downloaded = await client.download(kind);
    assert.deepEqual(downloaded, { name, bytes: Buffer.from('{}') });
    assert.equal(client.requests(), 2);
  }
});

test('RAW receipt refuses a wrong digest, extra member or untrusted redirect', async () => {
  const archive = receiptArchive(['handoff.json']);
  await assert.rejects(directReceipt(archive, { expectedDigest: digest }).download('proof'), /RAW_RECEIPT_DIGEST/);
  await assert.rejects(directReceipt(receiptArchive(['handoff.json', 'extra.json'])).download('proof'), /RAW_RECEIPT_ZIP/);
  const invalid = directReceipt(archive, { location: 'https://invalid.example/receipt' });
  await assert.rejects(invalid.download('proof'), /RAW_RECEIPT_REDIRECT/);
  assert.equal(invalid.requests(), 1);
});

const successful = (name, number, start, end) => ({ name, number, status: 'completed',
  conclusion: 'success', started_at: time(start), completed_at: time(end) });

function fixture(kind = 'proof') {
  const context = { kind, head, repositoryId: 11, runId: 12, attempt: 1, now: () => Date.parse(time(20)) };
  const name = kind === 'saved-coverage'
    ? 'raw-saved-coverage-12-1'
    : `raw-rotation-${kind === 'result' ? 'result' : 'proof'}-12-1`;
  const route = `/repos/${repository}/actions/runs/12`;
  const run = { id: 12, run_attempt: 1, head_sha: head, head_branch: 'main', repository: { id: 11, full_name: repository },
    head_repository: { id: 11 }, path: '.github/workflows/run-current-weather-once.yml', event: 'workflow_dispatch',
    status: 'in_progress', conclusion: null, actor: { login: 'github-actions[bot]' },
    triggering_actor: { login: 'github-actions[bot]' } };
  const job = { id: 13, run_id: 12, run_attempt: 1, head_sha: head, head_branch: 'main',
    name: kind === 'result' ? 'Retire verified older DMI RAW archives' : DMI_PRODUCER_JOB,
    status: 'in_progress', conclusion: null, steps: kind === 'result'
      ? [successful('Publish the RAW rotation decision', 2, 6, 9)]
      : [successful('Observe exact restored RAW coverage for the locked successor before DMI', 2, 1, 4),
        successful('Publish the bounded RAW rotation handoff before DMI', 3, 6, 9),
        {name: 'Wait for the RAW rotation decision before DMI', number: 4, status: 'in_progress',
          conclusion: null, started_at: time(10)}] };
  const artifact = { id: 14, name, digest, size_in_bytes: 1024, expired: false,
    created_at: time(7), updated_at: time(7), expires_at: '2026-11-20T08:00:07Z',
    workflow_run: { id: 12, head_sha: head, head_branch: 'main', repository_id: 11, head_repository_id: 11 } };
  const listing = { total_count: 1, artifacts: [artifact] };
  const jobs = { total_count: 1, jobs: [job] };
  const calls = [];
  let onPause;
  let nextJobReadError;
  let nextListingReadError;
  const getJson = async path => {
    calls.push(path);
    if (path === `${route}/artifacts?name=${name}&per_page=2`) {
      if (nextListingReadError) {
        const error = nextListingReadError;
        nextListingReadError = undefined;
        throw error;
      }
      return listing;
    }
    if (path === `${route}/attempts/1`) return run;
    assert.equal(path, `${route}/attempts/1/jobs?per_page=100`);
    if (nextJobReadError) {
      const error = nextJobReadError;
      nextJobReadError = undefined;
      throw error;
    }
    return jobs;
  };
  const find = () => findRawRotationArtifact({...context, getJson, pause: async delay => onPause?.(delay)});
  const recheck = expected => readRawRotationArtifactOnce({...context, getJson, ...expected});
  return { find, recheck, calls, run, job, jobs, artifact, listing, afterPause: callback => { onPause = callback; },
    failNextListingRead: error => { nextListingReadError = error; },
    failNextJobRead: (error = new Error('Synthetic job metadata timeout')) => { nextJobReadError = error; } };
}

test('same-run proof and result come only from their exact completed upload steps', async () => {
  for (const kind of ['proof', 'result']) {
    const { find, calls } = fixture(kind);
    assert.deepEqual(await find(), { status: 'FOUND', artifactId: 14, digest });
    assert.equal(calls.length, 3);
  }
});

test('execution waits for real proof success and for the upstream producer to be waiting', async () => {
  const delayed = fixture();
  delayed.job.steps.at(-1).status = 'queued';
  delayed.afterPause(() => { delayed.job.steps.at(-1).status = 'in_progress'; });
  assert.deepEqual(await delayed.find(), { status: 'FOUND', artifactId: 14, digest });

  const finished = fixture();
  finished.job.steps.at(-1).status = 'completed';
  assert.deepEqual(await finished.find(), { status: 'HOLD', reason: 'producer-not-waiting' });
  const observedOnly = fixture('observe-proof');
  observedOnly.job.steps.pop();
  assert.deepEqual(await observedOnly.find(), { status: 'FOUND', artifactId: 14, digest });

  const failed = fixture();
  failed.job.steps[0].conclusion = 'failure';
  assert.deepEqual(await failed.find(), { status: 'HOLD', reason: 'observation-not-successful' });
});

test('saved RAW proof also requires the same run to complete its public weather verification', async () => {
  const subject = fixture('saved-coverage');
  subject.job.steps = [
    successful('Prove that this run saved the required DMI originals', 2, 1, 4),
    successful('Publish same-run DMI RAW coverage receipt', 3, 6, 9),
  ];
  subject.job.status = 'completed';
  subject.job.conclusion = 'success';
  assert.deepEqual(await subject.find(), { status: 'HOLD', reason: 'terminal-coverage-owner-unproved' });
  const terminal = { ...subject.job, id: 15, name: 'Require a verified current-weather deployment',
    steps: [successful('Summarize and require the complete normal production path', 2, 12, 15)] };
  subject.jobs.jobs.push(terminal);
  subject.jobs.total_count++;
  assert.deepEqual(await subject.find(), { status: 'FOUND', artifactId: 14, digest });
  terminal.steps[0].conclusion = 'failure';
  assert.deepEqual(await subject.find(), { status: 'HOLD', reason: 'terminal-coverage-owner-unproved' });
});

test('foreign or ambiguous metadata cannot expose a download ID', async () => {
  for (const change of [
    ({artifact}) => { artifact.workflow_run.head_repository_id = 17; },
    ({artifact}) => { artifact.workflow_run.head_sha = 'c'.repeat(40); },
    ({artifact}) => { artifact.expired = true; },
    ({artifact}) => { artifact.digest = 'b'.repeat(64); },
    ({artifact}) => { artifact.size_in_bytes = 16385; },
    ({artifact}) => { artifact.created_at = time(1); },
    ({listing, artifact}) => { listing.total_count = 2; listing.artifacts.push({...artifact, id: 91}); },
    ({jobs}) => { jobs.total_count++; },
    ({run}) => { run.status = 'completed'; },
  ]) {
    const subject = fixture();
    change(subject);
    const found = await subject.find();
    assert.equal(found.status, 'HOLD');
    assert.equal(Object.hasOwn(found, 'artifactId'), false);
  }
});

test('the result waits for a same-run artifact publication to become consistently visible', async () => {
  for (const lag of ['step', 'timestamp', 'job-inventory', 'artifact-inventory']) {
    const subject = fixture('result');
    const [upload] = subject.job.steps;
    subject.job.status = 'completed';
    subject.job.conclusion = 'success';
    if (lag === 'step') subject.job.steps = [{ ...upload, status: 'in_progress', conclusion: null }];
    if (lag === 'timestamp') subject.job.steps = [{ ...upload, completed_at: null }];
    if (lag === 'job-inventory') subject.jobs.total_count++;
    if (lag === 'artifact-inventory') {
      subject.listing.total_count = 1;
      subject.listing.artifacts = [];
    }
    subject.afterPause(() => {
      subject.job.steps = [upload];
      subject.jobs.total_count = 1;
      subject.listing.artifacts = [subject.artifact];
    });
    assert.deepEqual(await subject.find(), { status: 'FOUND', artifactId: 14, digest });
  }
});

test('result retries temporary metadata requests and refuses permission or contradictory publication evidence', async () => {
  for (const error of [Object.assign(new Error('Temporary'), { statusCode: 503 }),
    Object.assign(new Error('Timeout'), { name: 'TimeoutError' })]) {
    const subject = fixture('result');
    subject.failNextJobRead(error);
    assert.deepEqual(await subject.find(), { status: 'FOUND', artifactId: 14, digest });
    assert.equal(subject.calls.length, 6);
  }
  const forbidden = fixture('result');
  forbidden.failNextJobRead(Object.assign(new Error('Forbidden'), { statusCode: 403 }));
  assert.deepEqual(await forbidden.find(), { status: 'HOLD', reason: 'metadata-unavailable',
    metadataEndpoint: 'jobs', metadataCode: 'http-403', retryDelayMs: 0 });
  assert.equal(forbidden.calls.length, 3);

  for (const [change, reason] of [
    [subject => { subject.job.steps[0].conclusion = 'skipped'; }, 'upload-not-successful'],
    [subject => { subject.job.conclusion = 'failure'; subject.job.status = 'completed'; }, 'publisher-not-successful'],
    [subject => { subject.artifact.workflow_run.head_sha = 'c'.repeat(40); }, 'artifact-identity-unproved'],
    [subject => { subject.artifact.created_at = time(1); }, 'artifact-outside-upload-step'],
    [subject => { subject.listing.artifacts.push({ ...subject.artifact, id: 91 }); }, 'artifact-not-unique'],
  ]) {
    const subject = fixture('result');
    change(subject);
    subject.afterPause(() => { throw new Error('Contradictory result should not be retried'); });
    assert.deepEqual(await subject.find(), { status: 'HOLD', reason });
  }
});

test('the initial RAW handoff recovers a transient listing read before the builder publishes', async () => {
  const subject = fixture();
  subject.listing.total_count = 0;
  subject.listing.artifacts = [];
  subject.failNextListingRead(Object.assign(new Error('Briefly unavailable'), { name: 'TimeoutError' }));
  let polls = 0;
  subject.afterPause(() => {
    if (++polls !== 2) return;
    subject.listing.total_count = 1;
    subject.listing.artifacts = [subject.artifact];
  });
  assert.deepEqual(await subject.find(), { status: 'FOUND', artifactId: 14, digest });
  assert.equal(polls, 2);
});

test('initial proof discovery waits for a consistent single-artifact inventory', async () => {
  for (const totalCount of [0, 1]) {
    const subject = fixture();
    subject.listing.total_count = totalCount;
    subject.listing.artifacts = totalCount === 1 ? [] : [subject.artifact];
    subject.afterPause(() => {
      subject.listing.total_count = 1;
      subject.listing.artifacts = [subject.artifact];
    });
    assert.deepEqual(await subject.find(), { status: 'FOUND', artifactId: 14, digest });
    assert.equal(subject.calls.length, 4);
  }

  const knownProof = fixture();
  knownProof.listing.artifacts = [];
  assert.deepEqual(await knownProof.recheck({ expectedArtifactId: 14, expectedDigest: digest }), {
    status: 'HOLD', reason: 'artifact-not-unique',
  });
  assert.equal(knownProof.calls.length, 1);

  for (const totalCount of [2, '1', undefined]) {
    const subject = fixture();
    subject.listing.total_count = totalCount;
    subject.listing.artifacts = [];
    assert.deepEqual(await subject.find(), { status: 'HOLD', reason: 'artifact-not-unique' });
    assert.equal(subject.calls.length, 1);
  }
});

test('the initial handoff honours read backoff and checks the exact waiting producer again', async () => {
  const subject = fixture();
  const limited = Object.assign(new Error('Limited'), { statusCode: 403, rateLimited: true, retryDelayMs: 60_000 });
  subject.failNextJobRead(limited);
  subject.afterPause(delay => {
    assert.equal(delay, 60_000);
    subject.job.status = 'completed';
    subject.job.conclusion = 'failure';
  });
  assert.deepEqual(await subject.find(), { status: 'HOLD', reason: 'publisher-not-successful' });

  const forbidden = fixture();
  forbidden.failNextListingRead(Object.assign(new Error('Access denied'), { statusCode: 403 }));
  assert.deepEqual(await forbidden.find(), { status: 'HOLD', reason: 'metadata-unavailable',
    metadataEndpoint: 'artifact-list', metadataCode: 'http-403', retryDelayMs: 0 });
  assert.equal(forbidden.calls.length, 1);
});

test('a transient low-level proof read does not authorize retirement or poll on its own', async () => {
  const subject = fixture();
  subject.failNextListingRead(Object.assign(new Error('Temporary'), { statusCode: 503 }));
  assert.deepEqual(await subject.recheck({ expectedArtifactId: 14, expectedDigest: digest }), {
    status: 'HOLD', reason: 'metadata-temporarily-unavailable', metadataEndpoint: 'artifact-list',
    metadataCode: 'http-503', retryDelayMs: 0,
  });
  assert.equal(subject.calls.length, 1);
});

test('a result still awaiting successful publication is held at the existing deadline', async () => {
  const subject = fixture('result');
  subject.job.status = 'completed';
  subject.job.conclusion = 'success';
  subject.job.steps = [{ ...subject.job.steps[0], completed_at: null }];
  assert.deepEqual(await subject.find(), { status: 'HOLD', reason: 'result-publication-incomplete' });
  assert.equal(subject.calls.length, 180);
});

test('empty artifact listing polls to its fixed bound and reports a hold', async () => {
  const absent = fixture('result');
  absent.listing.total_count = 0;
  absent.listing.artifacts.length = 0;
  assert.deepEqual(await absent.find(), { status: 'HOLD', reason: 'artifact-not-ready' });
  assert.equal(absent.calls.length, 60);
});

test('initial rotation stops when the exact builder has failed without uploading proof', async () => {
  const subject = fixture();
  subject.listing.total_count = 0;
  subject.listing.artifacts.length = 0;
  subject.afterPause(() => {
    subject.job.status = 'completed';
    subject.job.conclusion = 'failure';
  });
  assert.deepEqual(await subject.find(), { status: 'HOLD', reason: 'producer-finished-without-proof' });
  assert.equal(subject.calls.length, 13);
});

test('RAW proof gets more time only for the exact active builder and keeps its hard deadline', async () => {
  const stillPlanning = () => {
    const subject = fixture();
    subject.listing.total_count = 0;
    subject.listing.artifacts.length = 0;
    const publication = subject.job.steps;
    subject.job.steps = [{
      name: 'Plan bounded current history from the actual selected continuation', number: 1,
      status: 'in_progress', conclusion: null, started_at: time(1),
    }];
    return {subject, publication};
  };

  const {subject, publication} = stillPlanning();
  let pauses = 0;
  subject.afterPause(() => {
    if (++pauses !== 360) return; // 18 minutes after the receiver began.
    subject.job.steps = publication;
    subject.listing.total_count = 1;
    subject.listing.artifacts.push(subject.artifact);
  });
  assert.deepEqual(await subject.find(), {status: 'FOUND', artifactId: 14, digest});
  assert.equal(pauses, 360);

  const wrongRun = stillPlanning().subject;
  wrongRun.run.head_sha = 'b'.repeat(40);
  const unrelatedStep = stillPlanning().subject;
  unrelatedStep.job.steps[0].name = 'Update DMI bulk model cache';
  const deadline = stillPlanning().subject;
  for (const [source, expectedPauses] of [[wrongRun, 300], [unrelatedStep, 300], [deadline, 499]]) {
    let waited = 0;
    source.afterPause(() => { waited++; });
    assert.deepEqual(await source.find(), {status: 'HOLD', reason: 'artifact-not-ready'});
    assert.equal(waited, expectedPauses);
  }

  const stopped = stillPlanning().subject;
  let waited = 0;
  stopped.afterPause(() => {
    if (++waited !== 305) return;
    stopped.job.status = 'completed';
    stopped.job.conclusion = 'failure';
  });
  assert.deepEqual(await stopped.find(), {status: 'HOLD', reason: 'producer-finished-without-proof'});
  assert.equal(waited, 310);
});

test('an unavailable optional builder status does not stop an arriving proof', async () => {
  const subject = fixture();
  subject.listing.total_count = 0;
  subject.listing.artifacts.length = 0;
  subject.failNextJobRead();
  subject.afterPause(() => {
    subject.listing.total_count = 1;
    subject.listing.artifacts.push(subject.artifact);
  });
  assert.deepEqual(await subject.find(), { status: 'FOUND', artifactId: 14, digest });
  assert.equal(subject.calls.length, 5);
});

test('an exact pre-write recheck never substitutes another artifact or waits for the producer', async () => {
  const subject = fixture();
  const expected = {expectedArtifactId: 14, expectedDigest: digest};
  assert.deepEqual(await subject.recheck(expected), { status: 'FOUND', artifactId: 14, digest });
  subject.job.steps.at(-1).status = 'queued';
  assert.deepEqual(await subject.recheck(expected), { status: 'PENDING' });
  subject.artifact.id++;
  assert.deepEqual(await subject.recheck(expected), { status: 'HOLD', reason: 'artifact-identity-unproved' });
  assert.equal(subject.calls.length, 7);
});
