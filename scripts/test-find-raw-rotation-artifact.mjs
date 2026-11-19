import assert from 'node:assert/strict';
import test from 'node:test';
import { findRawRotationArtifact, readRawRotationArtifactOnce } from './find-raw-rotation-artifact.mjs';
import { DMI_PRODUCER_JOB } from './lib/terminal-dmi-cache.mjs';

const repository = 'jakobjorgensen82-commits/RavRadar';
const head = 'a'.repeat(40);
const digest = 'sha256:' + 'b'.repeat(64);
const time = seconds => `2026-11-19T08:00:${String(seconds).padStart(2, '0')}Z`;
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
  const getJson = async path => {
    calls.push(path);
    if (path === `${route}/artifacts?name=${name}&per_page=2`) return listing;
    if (path === `${route}/attempts/1`) return run;
    assert.equal(path, `${route}/attempts/1/jobs?per_page=100`);
    return jobs;
  };
  const find = () => findRawRotationArtifact({...context, getJson, pause: async () => onPause?.()});
  const recheck = expected => readRawRotationArtifactOnce({...context, getJson, ...expected});
  return { find, recheck, calls, run, job, jobs, artifact, listing, afterPause: callback => { onPause = callback; } };
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
