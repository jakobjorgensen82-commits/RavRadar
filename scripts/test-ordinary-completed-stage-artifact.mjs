import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { downloadOrdinaryCompletedStageArtifact } from './ordinary-completed-stage-artifact.mjs';

const python = process.env.PYTHON || 'python';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const input = { repository: 'synthetic-owner/RavRadar', runId: '87654321', runAttempt: '2',
  sourceHead: 'a'.repeat(40), token: 'synthetic-api-token', python, now: '2026-10-19T13:00:00.000Z' };
const names = ['Update central weather cache', 'Build private production runtime bundle specification',
  'Create the next private production runtime bundle atomically',
  'Encrypt exact completed private build for late-failure recovery',
  'Save only encrypted completed private build for one day'];
const timestamp = minute => `2026-10-19T12:${String(minute).padStart(2, '0')}:00Z`;
const zipFactory = String.raw`
import io, pathlib, stat, sys, warnings, zipfile
warnings.simplefilter('ignore', UserWarning)
root=pathlib.Path(sys.argv[1]); cipher=(root/'cipher.bin').read_bytes()
class Sequential(io.BytesIO):
    def seekable(self): return False
    def seek(self, *args): raise io.UnsupportedOperation('seek')
for mode in ('stored','descriptor','traversal','extra','duplicate','link','ratio','crc','encrypted','oversize'):
    output=Sequential() if mode=='descriptor' else io.BytesIO()
    compression=zipfile.ZIP_DEFLATED if mode in ('descriptor','ratio') else zipfile.ZIP_STORED
    with zipfile.ZipFile(output,'w',compression=compression,allowZip64=True) as bundle:
        name='../sealed.bin' if mode=='traversal' else 'sealed.bin'
        info=zipfile.ZipInfo(name); info.compress_type=compression
        info.create_system=3
        info.external_attr=((stat.S_IFLNK if mode=='link' else stat.S_IFREG)|0o600)<<16
        with bundle.open(info,'w',force_zip64=True) as member:
            member.write(b'RR-PRIVATE-BUILD-STAGE-1\n'+bytes(100000) if mode=='ratio' else cipher)
        if mode=='extra': bundle.writestr('extra.txt',b'not permitted')
        if mode=='duplicate': bundle.writestr('sealed.bin',cipher)
    value=bytearray(output.getvalue())
    central=value.index(b'PK\x01\x02')
    if mode=='crc': value[central+16]^=1
    if mode=='encrypted':
        value[6]|=1; value[central+8]|=1
    if mode=='oversize': value[central+24:central+28]=(350033793).to_bytes(4,'little')
    (root/(mode+'.zip')).write_bytes(value)
`;

function context(zip) {
  const run = { id: Number(input.runId), run_attempt: Number(input.runAttempt),
    repository: { id: 123, full_name: input.repository }, head_repository: { id: 123, full_name: input.repository },
    path: '.github/workflows/run-current-weather-once.yml', event: 'workflow_dispatch', head_branch: 'main',
    head_sha: input.sourceHead, status: 'completed', conclusion: 'failure',
    run_started_at: timestamp(0), updated_at: timestamp(20) };
  const job = { id: 456, run_id: run.id, run_attempt: run.run_attempt, head_sha: run.head_sha,
    head_branch: 'main', name: 'Build and prepare weather production through reusable workflow / build-and-prepare',
    status: 'completed', conclusion: 'failure', started_at: timestamp(1), completed_at: timestamp(19),
    steps: names.map((name, index) => ({ name, number: index + 10, status: 'completed', conclusion: 'success',
      started_at: timestamp(index * 2 + 2), completed_at: timestamp(index * 2 + 3) })) };
  const artifact = { id: 789, name: `ravradar-private-build-stage-${input.runId}-${input.runAttempt}`,
    expired: false, size_in_bytes: zip.length, digest: `sha256:${sha(zip)}`,
    workflow_run: { id: run.id, repository_id: 123, head_repository_id: 123,
      head_sha: run.head_sha, head_branch: 'main' },
    created_at: timestamp(10), updated_at: timestamp(11), expires_at: '2026-10-20T12:10:00Z' };
  return { run, jobs: { total_count: 1, jobs: [job] }, artifacts: { total_count: 1, artifacts: [artifact] },
    zip, calls: [], redirect: null, downloadStatus: 200, declaredSize: null };
}

const sourceName = 'Run the one explicit owned SOURCE ordinary route';
const sourceGuardNames = ['Select one explicit legacy or SOURCE ordinary route',
  'Require current integrated SOURCE route before admin and owner work'];
const sourceRequestJobName = 'Validate the explicit SOURCE request before any operational reentry';
const sourceRequestStepName = 'Reject unknown or mixed SOURCE request before any operational reentry';

function sourceContext(zip, conclusion = 'failure') {
  const state = context(zip), job = state.jobs.jobs[0];
  state.run.conclusion = conclusion;
  job.conclusion = conclusion;
  job.steps = [
    ...sourceGuardNames.map((name, index) => ({ name, number: index * 10 + 10,
      status: 'completed', conclusion: 'success', started_at: timestamp(index * 2 + 2),
      completed_at: timestamp(index * 2 + 3) })),
    { name: sourceName, number: 30, status: 'completed', conclusion,
      started_at: timestamp(6), completed_at: timestamp(17) },
    ...names.map((name, index) => ({ name, number: index + 40, status: 'completed',
      conclusion: 'skipped', started_at: null, completed_at: null })),
  ];
  const request = { id: 455, run_id: job.run_id, run_attempt: job.run_attempt, head_sha: job.head_sha,
    head_branch: 'main', name: sourceRequestJobName, status: 'completed', conclusion: 'success',
    started_at: timestamp(0), completed_at: timestamp(1), steps: [
      { name: sourceRequestStepName, number: 2, status: 'completed', conclusion: 'success',
        started_at: timestamp(0), completed_at: timestamp(1) },
    ] };
  state.jobs = { total_count: 2, jobs: [request, job] };
  return state;
}


function transport(state) {
  const base = `https://api.github.com/repos/${input.repository}`;
  return async (url, options) => {
    state.calls.push(url);
    assert.ok(state.calls.length <= 5, 'FIXED_CALL_BOUND');
    assert.equal(options.redirect, 'manual');
    assert.ok(options.signal instanceof AbortSignal);
    if (url.startsWith(base)) assert.equal(options.headers.Authorization, `Bearer ${input.token}`);
    else assert.equal(options.headers.Authorization, undefined, 'NO_TOKEN_TO_STORAGE');
    const routes = new Map([
      [`${base}/actions/runs/${input.runId}/attempts/${input.runAttempt}`, state.run],
      [`${base}/actions/runs/${input.runId}/attempts/${input.runAttempt}/jobs?per_page=100`, state.jobs],
      [`${base}/actions/runs/${input.runId}/artifacts?per_page=100`, state.artifacts],
    ]);
    if (routes.has(url)) return new Response(JSON.stringify(routes.get(url)), { status: 200 });
    if (url === `${base}/actions/artifacts/789/zip` && state.redirect)
      return new Response(null, { status: 302, headers: { location: state.redirect } });
    assert.ok(url === `${base}/actions/artifacts/789/zip` || url === state.redirect, 'FIXED_ENDPOINT');
    return new Response(state.zip, { status: state.downloadStatus,
      headers: { 'content-length': String(state.declaredSize ?? state.zip.length) } });
  };
}

test('ORDINARY_STAGE_EXACT_ATTEMPT_CIPHERTEXT_ONLY', async () => {
  const own = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-ordinary-stage-contract-'));
  let positiveCount = 0;
  let negativeCount = 0;
  try {
    // Actual encrypted synthetic bytes and actual stdlib ZIP, not a fake ZIP or
    // a stub of the product extraction/GCM implementation. This test does not
    // assert the contents are a real model bundle or authorize their publication.
    const cipher = crypto.createCipheriv('aes-256-gcm', crypto.randomBytes(32), crypto.randomBytes(12));
    cipher.setAAD(Buffer.from(JSON.stringify({ repository: input.repository, runId: input.runId,
      runAttempt: input.runAttempt, sourceHead: input.sourceHead })));
    const sealed = Buffer.concat([Buffer.from('RR-PRIVATE-BUILD-STAGE-1\n'), crypto.randomBytes(28),
      cipher.update(crypto.randomBytes(4096)), cipher.final(), cipher.getAuthTag()]);
    await fs.writeFile(path.join(own, 'cipher.bin'), sealed, { flag: 'wx' });
    execFileSync(python, ['-c', zipFactory, own], { timeout: 30_000, maxBuffer: 4096, windowsHide: true });
    const stored = await fs.readFile(path.join(own, 'stored.zip'));
    for (const mode of ['stored', 'descriptor']) {
      const state = context(await fs.readFile(path.join(own, `${mode}.zip`)));
      if (mode === 'descriptor') {
        state.redirect = 'https://productionresultssa0.blob.core.windows.net/synthetic/artifact.zip?sig=synthetic';
        state.run.conclusion = 'cancelled'; state.jobs.jobs[0].conclusion = 'cancelled';
      }
      const result = await downloadOrdinaryCompletedStageArtifact({ ...input, fetchImpl: transport(state) });
      try {
        assert.deepEqual(await fs.readFile(result.sealedPath), sealed);
        assert.deepEqual(result.identity, { repository: input.repository, runId: input.runId,
          runAttempt: input.runAttempt, sourceHead: input.sourceHead });
        assert.equal(result.contentsAuthenticated, false);
        assert.equal(result.publicationAuthorized, false);
        assert.equal(result.sealedSha256, sha(sealed));
        assert.equal(result.requestCount, mode === 'descriptor' ? 5 : 4);
        assert.equal(await fs.stat(path.join(result.privateDirectory, 'artifact.zip')).catch(() => null), null);
        positiveCount++;
      } finally { await fs.rm(result.privateDirectory, { recursive: true, force: true }); }
    }
    const refused = async (mutate, code, maxCalls = 4) => {
      const state = context(stored);
      await mutate(state);
      await assert.rejects(downloadOrdinaryCompletedStageArtifact({ ...input, fetchImpl: transport(state) }),
        error => error.code === code && error.message === code);
      assert.ok(state.calls.length <= maxCalls);
      negativeCount++;
    };
    for (const mutate of [s => s.run.status = 'in_progress', s => s.run.conclusion = null,
      s => s.run.run_attempt++, s => s.run.head_sha = 'b'.repeat(40), s => s.run.head_branch = 'other',
      s => s.run.event = 'push', s => s.run.path = '.github/workflows/deploy-code-only-repair.yml',
      s => s.run.repository.full_name = 'other/RavRadar', s => s.run.head_repository.id++])
      await refused(mutate, 'ORDINARY_STAGE_PRODUCER_IDENTITY', 1);
    for (const mutate of [s => s.jobs.jobs[0].run_attempt++, s => s.jobs.jobs[0].head_sha = 'b'.repeat(40),
      s => s.jobs.jobs[0].status = 'in_progress', s => s.jobs.jobs[0].name = 'unrelated job'])
      await refused(mutate, 'ORDINARY_STAGE_JOB_IDENTITY', 2);
    for (let step = 0; step < 5; step++)
      for (const conclusion of ['failure', 'cancelled', 'skipped', null])
        await refused(s => s.jobs.jobs[0].steps[step].conclusion = conclusion, 'ORDINARY_STAGE_REQUIRED_STEP', 2);
    await refused(s => s.jobs.jobs[0].steps.push({ ...s.jobs.jobs[0].steps[4] }), 'ORDINARY_STAGE_REQUIRED_STEP', 2);
    await refused(s => s.jobs.jobs[0].steps[4].number = 1, 'ORDINARY_STAGE_REQUIRED_STEP', 2);
    for (const mutate of [s => s.jobs.total_count++, s => s.artifacts.total_count++])
      await refused(mutate, 'ORDINARY_STAGE_LIST_INCOMPLETE', 3);
    for (const mutate of [s => { s.artifacts.artifacts.push({ ...s.artifacts.artifacts[0] }); s.artifacts.total_count++; },
      s => s.artifacts.artifacts[0].expired = true, s => s.artifacts.artifacts[0].workflow_run.id++,
      s => s.artifacts.artifacts[0].workflow_run.repository_id++,
      s => s.artifacts.artifacts[0].workflow_run.head_sha = 'b'.repeat(40),
      s => s.artifacts.artifacts[0].name = `ravradar-private-build-stage-${input.runId}-1`,
      s => s.artifacts.artifacts[0].size_in_bytes = 999999999,
      s => s.artifacts.artifacts[0].digest = null, s => s.artifacts.artifacts[0].created_at = timestamp(0),
      s => s.artifacts.artifacts[0].expires_at = timestamp(20)])
      await refused(mutate, 'ORDINARY_STAGE_ARTIFACT_IDENTITY', 3);
    await refused(s => s.artifacts.artifacts[0].digest = `sha256:${'0'.repeat(64)}`, 'ORDINARY_STAGE_ARTIFACT_DIGEST');
    await refused(s => s.declaredSize = stored.length + 1, 'ORDINARY_STAGE_BODY_BOUND');
    await refused(s => s.zip = stored.subarray(0, stored.length - 1), 'ORDINARY_STAGE_ARTIFACT_DIGEST');
    await refused(s => s.downloadStatus = 404, 'ORDINARY_STAGE_DOWNLOAD_HTTP');
    for (const redirect of ['http://productionresultssa0.blob.core.windows.net/x',
      'https://user:secret@productionresultssa0.blob.core.windows.net/x', 'https://example.invalid/x'])
      await refused(s => s.redirect = redirect, 'ORDINARY_STAGE_REDIRECT_REFUSED');
    for (const mode of ['traversal', 'extra', 'duplicate', 'link', 'ratio', 'crc', 'encrypted', 'oversize'])
      await refused(async s => {
        s.zip = await fs.readFile(path.join(own, `${mode}.zip`));
        s.artifacts.artifacts[0].size_in_bytes = s.zip.length;
        s.artifacts.artifacts[0].digest = `sha256:${sha(s.zip)}`;
      }, 'ORDINARY_STAGE_EXTRACTION_REFUSED');
    let networkCalls = 0;
    await assert.rejects(downloadOrdinaryCompletedStageArtifact({ ...input, runAttempt: '02',
      fetchImpl: async () => { networkCalls++; } }), { code: 'ORDINARY_STAGE_REQUEST' });
    assert.equal(networkCalls, 0);
    // Additive SOURCE locator cases. Actual synthetic GCM bytes and the same
    // real stdlib ZIP/extractor are reused; no origin/owner/publication claim.
    let sourcePositiveCount = 0, sourceNegativeCount = 0;
    for (const conclusion of ['success', 'failure', 'cancelled', 'timed_out']) {
      const state = sourceContext(stored, conclusion);
      const result = await downloadOrdinaryCompletedStageArtifact({ ...input, fetchImpl: transport(state) });
      try {
        assert.deepEqual(await fs.readFile(result.sealedPath), sealed);
        assert.deepEqual(result.identity, { repository: input.repository, runId: input.runId,
          runAttempt: input.runAttempt, sourceHead: input.sourceHead });
        assert.deepEqual(result.producer.steps.map(step => step.name), [...sourceGuardNames, sourceName]);
        assert.equal(result.producer.steps.at(-1).startedAt, timestamp(6));
        assert.equal(result.producer.steps.at(-1).completedAt, timestamp(17));
        assert.equal(result.producer.conclusion, conclusion);
        assert.equal(result.contentsAuthenticated, false);
        assert.equal(result.publicationAuthorized, false);
        assert.equal(result.sealedSha256, sha(sealed));
        assert.equal(result.requestCount, 4);
        assert.equal(state.calls.length, 4);
        sourcePositiveCount++;
      } finally { await fs.rm(result.privateDirectory, { recursive: true, force: true }); }
    }
    const sourceRefused = async (mutate, code, maxCalls = 2) => {
      const state = sourceContext(stored);
      await mutate(state);
      await assert.rejects(downloadOrdinaryCompletedStageArtifact({ ...input, fetchImpl: transport(state) }),
        error => error.code === code && error.message === code);
      assert.ok(state.calls.length <= maxCalls);
      sourceNegativeCount++;
    };
    for (const mutate of [s => s.jobs.jobs[1].run_attempt++, s => s.jobs.jobs[1].head_sha = 'b'.repeat(40),
      s => s.jobs.jobs[1].status = 'in_progress', s => s.jobs.jobs[1].conclusion = 'neutral'])
      await sourceRefused(mutate, 'ORDINARY_STAGE_SOURCE_JOB_IDENTITY');
    for (const mutate of [s => s.jobs.jobs[0].conclusion = 'failure',
      s => s.jobs.jobs[0].run_attempt++, s => s.jobs.jobs[0].head_sha = 'b'.repeat(40),
      s => s.jobs.jobs[0].id = s.jobs.jobs[1].id,
      s => s.jobs.jobs[0].completed_at = timestamp(2),
      s => { s.jobs.jobs.shift(); s.jobs.total_count--; },
      s => { s.jobs.jobs.unshift(structuredClone(s.jobs.jobs[0])); s.jobs.total_count++; }])
      await sourceRefused(mutate, 'ORDINARY_STAGE_SOURCE_REQUEST_JOB');
    for (const mutate of [s => s.jobs.jobs[0].steps[0].conclusion = 'skipped',
      s => s.jobs.jobs[0].steps[0].number = 0,
      s => s.jobs.jobs[0].steps[0].completed_at = timestamp(2),
      s => s.jobs.jobs[0].steps.push({ ...s.jobs.jobs[0].steps[0] })])
      await sourceRefused(mutate, 'ORDINARY_STAGE_SOURCE_REQUEST_STEP');
    for (const mutate of [s => s.jobs.jobs[1].steps[0].conclusion = 'failure',
      s => s.jobs.jobs[1].steps[1].conclusion = 'skipped',
      s => s.jobs.jobs[1].steps[1].number = 9,
      s => s.jobs.jobs[1].steps[1].started_at = timestamp(2),
      s => s.jobs.jobs[1].steps[2].conclusion = 'neutral',
      s => s.jobs.jobs[1].steps[2].conclusion = null,
      s => s.jobs.jobs[1].steps[2].status = 'in_progress',
      s => s.jobs.jobs[1].steps[2].number = 19,
      s => s.jobs.jobs[1].steps[2].started_at = timestamp(4),
      s => s.jobs.jobs[1].steps[2].completed_at = timestamp(20),
      s => s.jobs.jobs[1].steps.push({ ...s.jobs.jobs[1].steps[2] })])
      await sourceRefused(mutate, 'ORDINARY_STAGE_SOURCE_REQUIRED_STEP');
    for (const mutate of [s => s.jobs.jobs[1].steps[3].conclusion = 'success',
      s => s.jobs.jobs[1].steps[4].status = 'in_progress',
      s => s.jobs.jobs[1].steps[4].number = 39,
      s => s.jobs.jobs[1].steps.push({ ...s.jobs.jobs[1].steps[7] })])
      await sourceRefused(mutate, 'ORDINARY_STAGE_SOURCE_LEGACY_STEP');
    // No fallback: even five forged legacy successes cannot rescue a selected,
    // failed SOURCE guard. Conversely the real cipher-preserving resume has
    // SOURCE and weather skipped, and must not become a fresh producer.
    await sourceRefused(s => {
      s.jobs.jobs[1].steps[0].conclusion = 'failure';
      for (const step of s.jobs.jobs[1].steps.slice(3)) step.conclusion = 'success';
    }, 'ORDINARY_STAGE_SOURCE_REQUIRED_STEP');
    await sourceRefused(s => s.jobs.jobs[1].steps[2].conclusion = 'skipped',
      'ORDINARY_STAGE_REQUIRED_STEP');
    await sourceRefused(s => {
      s.jobs.jobs[1].steps = s.jobs.jobs[1].steps.filter(step => step.name !== sourceName);
    }, 'ORDINARY_STAGE_REQUIRED_STEP');
    // A successful NO_WORK action has no stage. No aggregate result or success
    // marker may substitute for an actually present exact original artifact.
    await sourceRefused(s => {
      s.run.conclusion = 'success'; s.jobs.jobs[1].conclusion = 'success';
      s.jobs.jobs[1].steps[2].conclusion = 'success'; s.artifacts = { total_count: 0, artifacts: [] };
    }, 'ORDINARY_STAGE_ARTIFACT_IDENTITY', 3);
    for (const mutate of [s => s.artifacts.artifacts[0].created_at = timestamp(5),
      s => s.artifacts.artifacts[0].created_at = timestamp(18),
      s => s.artifacts.artifacts[0].updated_at = timestamp(20),
      s => s.artifacts.artifacts[0].workflow_run.id++,
      s => s.artifacts.artifacts[0].workflow_run.head_sha = 'b'.repeat(40),
      s => s.artifacts.artifacts[0].name = `ravradar-private-build-stage-${input.runId}-1`,
      s => s.artifacts.artifacts[0].expires_at = input.now])
      await sourceRefused(mutate, 'ORDINARY_STAGE_ARTIFACT_IDENTITY', 3);
    for (const mutate of [s => s.run.run_attempt++, s => s.run.head_sha = 'b'.repeat(40)])
      await sourceRefused(mutate, 'ORDINARY_STAGE_PRODUCER_IDENTITY', 1);
    await sourceRefused(s => s.artifacts.artifacts[0].digest = `sha256:${'0'.repeat(64)}`,
      'ORDINARY_STAGE_ARTIFACT_DIGEST', 4);
    console.log(JSON.stringify({ code: 'ORDINARY_STAGE_SOURCE_LOCATOR_CONTRACT_PASS', sourcePositiveCount,
      sourceNegativeCount, actualNetworkRequests: 0, contentsAuthenticated: false,
      ownerClosureClaimed: false, publicationAuthorized: false }));


    console.log(JSON.stringify({ code: 'ORDINARY_STAGE_CONTRACT_PASS', positiveCount, negativeCount,
      actualNetworkRequests: 0, publicationAuthorized: false }));
  } finally { await fs.rm(own, { recursive: true, force: true }); }
});
