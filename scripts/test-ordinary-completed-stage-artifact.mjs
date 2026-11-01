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
    // Exact fixed run/head/path cross-checks refuse at metadata, before ZIP.
    for (const fixedRun of [
      {runId:'41231144384',sourceHead:'7a08f6a8dfb2131898e7270a2429c3f4f810a842',wrongPath:'.github/workflows/run-current-weather-once.yml'},
      {runId:'41256251412',sourceHead:'37a34703d9ae8bfb2c28056f21a7ea73944033ae',wrongPath:'.github/workflows/update-and-deploy.yml'},
      {runId:'87654321',sourceHead:input.sourceHead,wrongPath:'.github/workflows/update-and-deploy.yml'},
    ]) {
      let fixedRunCalls=0;
      await assert.rejects(downloadOrdinaryCompletedStageArtifact({...input,runId:fixedRun.runId,runAttempt:'1',sourceHead:fixedRun.sourceHead,
        fetchImpl:async()=>{fixedRunCalls++;return Response.json({...context(stored).run,id:Number(fixedRun.runId),run_attempt:1,
          head_sha:fixedRun.sourceHead,path:fixedRun.wrongPath});}}),
        error=>error.code==='ORDINARY_STAGE_PRODUCER_IDENTITY'&&error.message===error.code);
      assert.equal(fixedRunCalls,1);negativeCount++;
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
    console.log(JSON.stringify({ code: 'ORDINARY_STAGE_CONTRACT_PASS', positiveCount, negativeCount,
      actualNetworkRequests: 0, publicationAuthorized: false }));
  } finally { await fs.rm(own, { recursive: true, force: true }); }
});
