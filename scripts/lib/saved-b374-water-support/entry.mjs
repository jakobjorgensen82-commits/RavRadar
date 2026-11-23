import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { ordinaryStageIdentity, runB374WaterSourceAudit } from './runner.mjs';

const execute = promisify(execFile);
const fail = code => { throw new Error(code); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const runId = 45088278207;
const source = ordinaryStageIdentity(runId);
const repoId = 1306858343;
const actionApi = `https://api.github.com/repos/${source.repository}/actions/artifacts`;
const handoff = { id: 14786022739, name: 'ravscore-operational-handoff-45088278207-1', bytes: 57055,
  sha256: '65fdda86ef17d29dfaa3e22c197f8675a9db6f557945d0c46ad76778cf21d255' };
const pages = { id: 14785674825, name: 'github-pages', bytes: 196752290,
  sha256: 'c785eef0392f4ffff79f60bdc195991c3eb0356b59b142f5a1ed3490b029fd9d' };
const manifestSha256 = 'd8ce6d6a3e26c8f3be0206f869602b3288f12aa8bbd2144cf2bf8c0641ba606c';

export function checkArtifactMetadata(meta, pin, now = Date.now()) {
  if (meta?.id !== pin.id || meta.name !== pin.name || meta.size_in_bytes !== pin.bytes
    || meta.digest !== 'sha256:' + pin.sha256 || meta.expired !== false
    || !(Date.parse(meta.created_at) <= now && now < Date.parse(meta.expires_at))
    || meta.workflow_run?.id !== runId || meta.workflow_run.repository_id !== repoId
    || meta.workflow_run.head_repository_id !== repoId || meta.workflow_run.head_branch !== 'main'
    || meta.workflow_run.head_sha !== source.sourceHead) fail('B374_PUBLIC_ARTIFACT_IDENTITY');
}

export function artifactRedirectUrl(status, destination) {
  if (status !== 302 || typeof destination !== 'string' || !destination
    || destination.length > 4096 || /[,\r\n]/.test(destination)) fail('B374_PUBLIC_ARTIFACT_REDIRECT');
  let url;
  try { url = new URL(destination); } catch { fail('B374_PUBLIC_ARTIFACT_REDIRECT'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash
    || !(url.hostname.endsWith('.blob.core.windows.net') || url.hostname.endsWith('.githubusercontent.com'))) {
    fail('B374_PUBLIC_ARTIFACT_REDIRECT');
  }
  return url;
}

export async function transferExact(response, destination, pin, signal) {
  const length = response.headers.get('content-length');
  const encoding = response.headers.get('content-encoding');
  if (response.status !== 200 || !response.body || length !== null && length !== String(pin.bytes)
    || encoding !== null && encoding.toLowerCase() !== 'identity') {
    await response.body?.cancel().catch(() => {});
    destination.destroy();
    fail('B374_PUBLIC_ARTIFACT_RESPONSE');
  }
  const digest = createHash('sha256');
  let bytes = 0;
  const bounded = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > pin.bytes) return callback(new Error('B374_PUBLIC_ARTIFACT_SIZE'));
      digest.update(chunk);
      callback(null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(response.body), bounded, destination, { signal });
  if (bytes !== pin.bytes || digest.digest('hex') !== pin.sha256) fail('B374_PUBLIC_ARTIFACT_DIGEST');
}

async function download(pin, destination, token, signal) {
  const redirect = await fetch(`${actionApi}/${pin.id}/zip`, {
    redirect: 'manual', signal, headers: { Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  await redirect.body?.cancel();
  const location = artifactRedirectUrl(redirect.status, redirect.headers.get('location'));
  const response = await fetch(location, { redirect: 'error', signal, headers: { 'Accept-Encoding': 'identity' } });
  await transferExact(response, createWriteStream(destination, { flags: 'wx', mode: 0o600 }), pin, signal);
}

async function boundPublicFiles(source374, work, token) {
  const git = async args => (await execute('git', ['-C', source374, '-c', 'core.fsmonitor=false', ...args], {
    timeout: 12_000, env: { PATH: process.env.PATH, GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_SYSTEM: '/dev/null', GIT_OPTIONAL_LOCKS: '0' },
  })).stdout.trim();
  if (await git(['rev-parse', 'HEAD']) !== source.sourceHead
    || await git(['status', '--porcelain', '--untracked-files=all']) !== '') fail('B374_ARCHIVED_READER_SOURCE');
  const load = name => import(pathToFileURL(path.join(source374, 'scripts', name)));
  const [metadata, checks, isolation] = await Promise.all([
    load('read-pages-artifact-metadata.mjs'), load('ravscore-operational-pages-recovery.mjs'),
    load('audit-saved-weather-inputs.mjs'),
  ]);
  const deadline = Date.now() + 300_000;
  const signal = AbortSignal.timeout(deadline - Date.now());
  const readMeta = async pin => {
    const result = JSON.parse(await metadata.readPagesArtifactMetadata({
      repository: source.repository, artifactId: String(pin.id), token,
    }));
    checkArtifactMetadata(result, pin);
    return result;
  };
  const [handoffMeta, pagesMeta] = await Promise.all([readMeta(handoff), readMeta(pages)]);
  if (Date.parse(handoffMeta.created_at) < Date.parse(pagesMeta.created_at)) fail('B374_PUBLIC_ARTIFACT_ORDER');
  const extract = async (mode, pin, expectedManifest) => {
    const zipPath = path.join(work, mode + '.zip');
    const output = path.join(work, mode);
    await download(pin, zipPath, token, signal);
    const args = ['-I', '-B', path.join(source374, 'scripts/extract-code-only-public-source.py'),
      '--mode', mode, '--archive', zipPath, '--expected-zip-bytes', String(pin.bytes),
      '--expected-zip-sha256', pin.sha256, '--output-directory', output,
      '--deadline-epoch-ms', String(deadline)];
    if (expectedManifest) args.push('--expected-manifest', expectedManifest);
    const { stdout } = await isolation.withoutSavedAuditSecrets(() =>
      execute('python3', args, { timeout: Math.max(1, deadline - Date.now()), maxBuffer: 65_536, signal }));
    const receipt = JSON.parse(stdout);
    if (receipt.schemaVersion !== 1 || receipt.mode !== mode || receipt.zipBytes !== pin.bytes
      || receipt.zipSha256 !== pin.sha256) fail('B374_PUBLIC_EXTRACTION_RECEIPT');
    await fs.unlink(zipPath);
    return output;
  };
  const sealed = await extract('handoff', handoff);
  const manifestPath = path.join(sealed, 'manifest.json');
  const [manifestBytes, sealBytes, handoffBytes, bindingBytes] = await Promise.all([
    fs.readFile(manifestPath),
    ...['pages-artifact-seal.json', 'handoff.json', 'target-binding.json'].map(name => fs.readFile(path.join(sealed, name))),
  ]);
  const manifest = JSON.parse(manifestBytes), seal = JSON.parse(sealBytes), facts = JSON.parse(handoffBytes);
  if (sha(manifestBytes) !== manifestSha256 || manifest.datasetId !== 'rr-20261123020235-210'
    || manifest.productionReferenceAt !== '2026-11-23T00:00:00.000Z'
    || facts.schemaVersion !== 'ravscore-operational-deploy-handoff-v2' || facts.sourceHead !== source.sourceHead
    || !['integrated', 'integrated-historical-maintenance'].includes(facts.action)
    || facts.legacySourceRequired !== false || facts.privatePayloadIncluded !== false
    || facts.checkpointDatasetId !== manifest.datasetId
    || seal.artifactId !== pages.id || seal.artifactSizeBytes !== pages.bytes || seal.artifactName !== pages.name
    || checks.normalizeArtifactDigestSha256(seal.artifactDigestSha256) !== pages.sha256
    || seal.createdAt !== new Date(pagesMeta.created_at).toISOString()) fail('B374_PUBLIC_SEAL_IDENTITY');
  checks.assertUploadedOperationalPagesTarget({
    seal, workflowIdentity: { repository: source.repository, runId, runAttempt: 1,
      headSha: source.sourceHead, ref: 'refs/heads/main', attemptId: `pages-${runId}-1` },
    targetManifest: manifest, targetModelBinding: JSON.parse(bindingBytes),
    implementationClosureSha256: seal.targetImplementationClosureSha256,
  });
  const snapshot = await extract('public', pages, manifestPath);
  const [pagesManifest, zonesBytes, routingBytes] = await Promise.all(
    ['manifest.json', 'zones.geojson', 'water-level-station-routing.json'].map(name => fs.readFile(path.join(snapshot, name))));
  if (!pagesManifest.equals(manifestBytes)) fail('B374_PUBLIC_MANIFEST_MISMATCH');
  return { manifestBytes, zonesBytes, routingBytes };
}

async function main() {
  if (process.platform !== 'linux' || process.env.GITHUB_ACTIONS !== 'true'
    || process.env.RUNNER_ENVIRONMENT !== 'github-hosted'
    || process.env.GITHUB_REPOSITORY !== source.repository || !process.env.RUNNER_TEMP) {
    fail('B374_HOSTED_READER_REQUIRED');
  }
  const [b373, b374, output, ...extra] = process.argv.slice(2);
  if (extra.length || ![b373, b374, output].every(file => file && path.isAbsolute(file))) fail('B374_ENTRY_ARGUMENTS');
  const temp = await fs.realpath(process.env.RUNNER_TEMP);
  const outputParent = await fs.realpath(path.dirname(output));
  const relativeParent = path.relative(temp, outputParent);
  if (path.isAbsolute(relativeParent) || relativeParent === '..' || relativeParent.startsWith('..' + path.sep)) {
    fail('B374_ENTRY_REPORT_PATH');
  }
  const reportPath = path.join(outputParent, path.basename(output));
  if (await fs.lstat(reportPath).catch(error => { if (error.code !== 'ENOENT') throw error; }))
    fail('B374_ENTRY_REPORT_EXISTS');
  const token = process.env.GITHUB_TOKEN, masterSecret = process.env.WEATHER_PROGRESS_MASTER_SECRET;
  if (!token || !masterSecret) fail('B374_ENTRY_CREDENTIALS_UNAVAILABLE');
  const sourceRoots = [await fs.realpath(b373), await fs.realpath(b374)];
  const work = await fs.mkdtemp(path.join(temp, 'rr-b374-public-'));
  let publicFiles;
  try {
    publicFiles = await boundPublicFiles(sourceRoots[1], work, token);
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
  const { withoutSavedAuditSecrets } = await import(pathToFileURL(path.join(
    sourceRoots[1], 'scripts/audit-saved-weather-inputs.mjs')));
  const report = await withoutSavedAuditSecrets(() => runB374WaterSourceAudit({
    sourceRoots, ...publicFiles, githubToken: token, stageMasterSecret: masterSecret,
  }));
  const bytes = JSON.stringify(report) + '\n';
  await fs.writeFile(reportPath, bytes, { flag: 'wx', mode: 0o600 });
  process.stdout.write(bytes);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    const code = /^(B374_|ORDINARY_STAGE_|SEALED_B374_|ALTERNATIVE_NORMAL_|AUTHENTICATED_INPUTS_)[A-Z0-9_]{1,74}$/
      .test(error?.message ?? '') ? error.message : 'B374_ENTRY_UNAVAILABLE';
    process.stdout.write(code + '\n');
    process.exitCode = 1;
  });
}
