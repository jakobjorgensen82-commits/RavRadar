#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { fstatSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveCodeOnlyPublicSource } from './resolve-code-only-public-source.mjs';
import { manifestBoundedPublicDetailsBytes } from './prepare-code-only-public-runtime.mjs';
import { normalizeArtifactDigestSha256, sha256CanonicalJson,
  RAVSCORE_OPERATIONAL_PAGES_ARTIFACT_SEAL_SCHEMA } from './ravscore-operational-pages-recovery.mjs';
import { assertExactPublicRavScoreModelBindingShape } from '../js/core/ravscore-public-profile-contract.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const EXTRACTOR = fileURLToPath(new URL('./extract-code-only-public-source.py', import.meta.url));
const MiB = 1024 * 1024;
// New stricter aggregate acquisition ceiling; old curl retries had no shared total.
const TOTAL_MS = 6 * 60 * 1000;
const API_BYTES = MiB;
const HANDOFF_BYTES = 10 * MiB;
const SHA = /^[a-f0-9]{64}$/;
const FILES = Object.freeze([
  ['data/live/manifest.json', 'manifest.json', MiB],
  ['data/live/public-conditions.json', 'public-conditions.json', 32 * MiB],
  ['data/live/public-condition-details.json', 'public-condition-details.json', null],
  ['data/live/coastal-parts-v2.json', 'coastal-parts-v2.json', 16 * MiB],
  ['data/zones.geojson', 'zones.geojson', 32 * MiB],
  ['data/water-level-station-routing.json', 'water-level-station-routing.json', 4 * MiB],
]);
const fail = code => { throw new Error(code); };
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const canonicalHash = sha256CanonicalJson;
const inside = (base, child) => {
  const relative = path.relative(base, child);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
};

function neutralEnvironment(extra = {}) {
  const result = {};
  for (const name of ['PATH', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP',
    'HOME', 'LANG', 'LC_ALL', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'CURL_CA_BUNDLE',
    'RUNNER_TRACKING_ID']) {
    if (process.env[name] !== undefined) result[name] = process.env[name];
  }
  return { ...result, ...extra };
}

function remaining(deadline) {
  const ms = Math.floor(deadline - performance.now());
  if (ms < 1) fail('PUBLIC_ACQUISITION_DEADLINE');
  return ms;
}

// No caller-supplied executable or callback. All call sites below own a fixed command.
async function child(command, args, { deadline, env, input = '', maximumOutput = 65536 }) {
  const timeout = remaining(deadline);
  return await new Promise((resolve, reject) => {
    let first = null;
    let killed = false;
    const stdout = [];
    const stderr = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    const processGroup = process.platform !== 'win32';
    const owned = spawn(command, args, {
      cwd: ROOT, env, shell: false, detached: processGroup,
      stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
    });
    const stop = error => {
      first ??= { error };
      if (killed || !owned.pid) return;
      killed = true;
      try {
        if (processGroup) process.kill(-owned.pid, 'SIGKILL');
        else owned.kill('SIGKILL');
      } catch (killError) { first ??= { error: killError }; }
    };
    const timer = setTimeout(() => stop(new Error('PUBLIC_ACQUISITION_DEADLINE')), timeout);
    owned.once('error', error => { first ??= { error }; });
    owned.stdin.on('error', error => stop(error));
    owned.stdout.on('data', chunk => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maximumOutput) stop(new Error('PUBLIC_ACQUISITION_CHILD_OUTPUT_BOUND'));
      else stdout.push(chunk);
    });
    owned.stderr.on('data', chunk => {
      stderrBytes += chunk.length;
      if (stderrBytes > 65536) stop(new Error('PUBLIC_ACQUISITION_CHILD_ERROR_BOUND'));
      else if (command === 'python3') stderr.push(chunk);
    });
    // A killed or errored child is never called closed until this actual event.
    owned.once('close', (code, signal) => {
      clearTimeout(timer);
      // Direct-child close is not a claim that its process group has disappeared.
      if (processGroup && owned.pid) {
        let absent = false;
        try { process.kill(-owned.pid, 0); }
        catch (error) { absent = Object.hasOwn(error ?? {}, 'code') && error.code === 'ESRCH'; }
        if (!absent) stop(new Error('PUBLIC_ACQUISITION_CHILD_GROUP_UNCONFIRMED'));
      }
      if (command === 'curl') {
        const values = Buffer.concat(stdout).toString('utf8').trim().split('\t');
        const http = /^[0-9]{3}$/.test(values[0] ?? '') ? values[0] : 'unknown';
        const declared = /^[0-9]{1,20}$/.test(values[1] ?? '') ? values[1] : 'unknown';
        const received = /^[0-9]{1,20}$/.test(values[2] ?? '') ? values[2] : 'unknown';
        const name = path.basename(args[args.indexOf('--output') + 1]);
        const cap = args[args.indexOf('--max-filesize') + 1];
        console.log(`Public snapshot file=${name} bound=${cap} http=${http} declared=${declared} received=${received} curl_exit=${code ?? 'unknown'}`);
      }
      if (command === 'python3') {
        const diagnostic = Buffer.concat(stderr).toString('utf8').trim();
        if (/^PUBLIC_SELECTED_FILE_BOUND:(manifest\.json|public-conditions\.json|public-condition-details\.json|coastal-parts-v2\.json|zones\.geojson|water-level-station-routing\.json|pages-artifact-seal\.json|handoff\.json|target-binding\.json):[0-9]{1,16}:[0-9]{1,16}$/.test(diagnostic)) {
          const [, name, cap, declared] = diagnostic.split(':');
          console.error(`Public snapshot file=${name} bound=${cap} declared=${declared} extraction=refused`);
        }
      }
      if (first !== null) reject(first.error);
      else if (code !== 0 || signal !== null) reject(new Error('PUBLIC_ACQUISITION_CHILD_FAILED'));
      else resolve(Buffer.concat(stdout));
    });
    owned.stdin.end(input);
  });
}

async function regularBytes(file, cap) {
  const before = await fs.lstat(file);
  if (!before.isFile() || before.isSymbolicLink() || before.size < 1 || before.size > cap)
    fail('PUBLIC_ACQUISITION_LOCAL_FILE_BOUND');
  const bytes = await fs.readFile(file);
  const after = await fs.lstat(file);
  if (bytes.length !== before.size || after.size !== before.size
    || before.dev !== after.dev || before.ino !== after.ino
    || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs)
    fail('PUBLIC_ACQUISITION_LOCAL_FILE_CHANGED');
  return bytes;
}
const jsonFile = async (file, cap = API_BYTES) => JSON.parse(await regularBytes(file, cap));

async function digestFile(file, expectedBytes, cap, deadline) {
  const before = await fs.lstat(file);
  if (!before.isFile() || before.isSymbolicLink() || before.size !== expectedBytes
    || before.size < 1 || before.size > cap) fail('PUBLIC_ARCHIVE_SIZE_MISMATCH');
  const fd = await fs.open(file, 'r');
  const ownDescriptor = fd.fd;
  let first = null;
  let result;
  try {
    const opened = await fd.stat();
    if (opened.dev !== before.dev || opened.ino !== before.ino || opened.size !== before.size)
      fail('PUBLIC_ARCHIVE_IDENTITY_MISMATCH');
    const digest = crypto.createHash('sha256');
    const chunk = Buffer.alloc(64 * 1024);
    let count = 0;
    while (true) {
      remaining(deadline);
      const { bytesRead } = await fd.read(chunk, 0, chunk.length, null);
      if (bytesRead === 0) break;
      count += bytesRead;
      if (count > expectedBytes) fail('PUBLIC_ARCHIVE_SIZE_MISMATCH');
      digest.update(chunk.subarray(0, bytesRead));
    }
    const after = await fd.stat();
    if (count !== expectedBytes || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs)
      fail('PUBLIC_ARCHIVE_CHANGED');
    result = digest.digest('hex');
  } catch (error) { first = { error }; }
  try { await fd.close(); } catch (error) { first ??= { error }; }
  let physicallyClosed = false;
  try { fstatSync(ownDescriptor); }
  catch (error) { physicallyClosed = Object.hasOwn(error ?? {}, 'code') && error.code === 'EBADF'; }
  if (!physicallyClosed) first ??= { error: new Error('PUBLIC_ARCHIVE_CLOSE_UNCONFIRMED') };
  if (first !== null) throw first.error;
  return result;
}

async function download(url, file, cap, deadline, authenticated = false) {
  const seconds = Math.max(1, Math.floor(remaining(deadline) / 1000));
  const args = ['--disable', '--fail', '--silent', '--show-error', '--location',
    '--retry', '3', '--retry-max-time', String(seconds), '--connect-timeout', '10',
    '--max-time', String(Math.min(60, seconds)), '--max-filesize', String(cap),
    '--proto', '=https', '--proto-redir', '=https', '--output', file,
    '--write-out', '%{http_code}\t%header{content-length}\t%{size_download}\n'];
  let input = '';
  if (authenticated) {
    const token = process.env.GH_TOKEN;
    if (!/^[A-Za-z0-9_]+$/.test(token ?? '')) fail('PUBLIC_ACQUISITION_GITHUB_AUTH_REQUIRED');
    args.push('--header', 'Accept: application/vnd.github+json', '--header',
      'X-GitHub-Api-Version: 2022-11-28', '--config', '-');
    input = `header = "Authorization: Bearer ${token}"\n`;
  } else args.push('--header', 'Cache-Control: no-cache');
  args.push(url);
  await child('curl', args, { deadline, env: neutralEnvironment(), input });
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > cap)
    fail('PUBLIC_ACQUISITION_DOWNLOADED_FILE_BOUND');
}

async function stageRoots() {
  const snapshot = await fs.realpath(process.env.RAVRADAR_CODE_ONLY_PUBLIC_SNAPSHOT);
  const work = await fs.realpath(process.env.RAVRADAR_OPERATIONAL_WORK);
  for (const root of [snapshot, work]) {
    if (root === ROOT || inside(ROOT, root) || !inside(await fs.realpath(os.tmpdir()), root))
      fail('PUBLIC_ACQUISITION_ROOT_INVALID');
  }
  return { snapshot, work };
}

function checkedArtifact(meta, { id, name, runId, head, cap }) {
  const digest = normalizeArtifactDigestSha256(meta?.digest);
  if (!Number.isSafeInteger(meta?.id) || meta.id < 1 || id && meta.id !== id
    || meta.name !== name || meta.expired !== false
    || meta.workflow_run?.id !== runId || meta.workflow_run?.head_sha !== head
    || !Number.isSafeInteger(meta.size_in_bytes) || meta.size_in_bytes < 1
    || meta.size_in_bytes > cap || !SHA.test(digest)) fail('PUBLIC_ARTIFACT_IDENTITY_MISMATCH');
  return { id: meta.id, bytes: meta.size_in_bytes, digest };
}

async function extract(mode, archive, expected, output, manifest, deadline) {
  const args = ['-I', '-B', EXTRACTOR, '--mode', mode, '--archive', archive,
    '--expected-zip-bytes', String(expected.bytes), '--expected-zip-sha256', expected.digest,
    '--output-directory', output, '--deadline-epoch-ms', String(Date.now() + remaining(deadline))];
  if (manifest) args.push('--expected-manifest', manifest);
  const result = JSON.parse(await child('python3', args, {
    deadline, env: neutralEnvironment({ PYTHONUTF8: '1' }), maximumOutput: 65536,
  }));
  const names = mode === 'handoff'
    ? ['manifest.json', 'pages-artifact-seal.json', 'handoff.json', 'target-binding.json']
    : FILES.map(file => file[1]);
  if (result?.schemaVersion !== 1 || result.mode !== mode || result.zipSha256 !== expected.digest
    || result.zipBytes !== expected.bytes || !Array.isArray(result.selectedFiles)
    || result.selectedFiles.length !== names.length
    || !same(result.selectedFiles.map(file => file.name).sort(), [...names].sort())
    || mode === 'public' && (!Number.isSafeInteger(result.tarBytesScanned) || result.tarBytesScanned < 1))
    fail('PUBLIC_EXTRACTION_RECEIPT_INVALID');
  const publicManifest = manifest ? await jsonFile(manifest) : null;
  for (const selected of result.selectedFiles) {
    const cap = mode === 'handoff' ? MiB
      : FILES.find(file => file[1] === selected.name)[2]
        ?? manifestBoundedPublicDetailsBytes(publicManifest.publicConditionDetailsBytes);
    if (!Number.isSafeInteger(selected.bytes) || selected.bytes < 1 || selected.bytes > cap
      || !SHA.test(selected.sha256)
      || await digestFile(path.join(output, selected.name), selected.bytes, cap, deadline) !== selected.sha256)
      fail('PUBLIC_EXTRACTED_FILE_DIGEST_MISMATCH');
    console.log(`Public snapshot file=${selected.name} bound=${cap} actual=${selected.bytes} sha256=${selected.sha256}`);
  }
  return result;
}

export function selectPublicAcquisition(current, manifest, recoverPublicRunId) {
  if (recoverPublicRunId !== '' || current?.model !== 'integrated'
    || current.status !== 'INTEGRATED_ACTIVE' || current.pending !== false)
    return { mode: 'existing-public-route' };
  const selected = resolveCodeOnlyPublicSource({ current, publicManifest: manifest });
  if (selected.status === 'KNOWN_PUBLIC_SOURCE_REPAIR') return { mode: 'existing-public-route' };
  if (selected.status !== 'CENTRAL_AND_PUBLIC_MATCH') fail('PUBLIC_SOURCE_SELECTION_INVALID');
  return { mode: 'sealed-active-artifact', selected };
}

async function acquire() {
  const deadline = performance.now() + TOTAL_MS;
  const { snapshot, work } = await stageRoots();
  if ((await fs.readdir(snapshot)).length !== 0) fail('PUBLIC_SNAPSHOT_NOT_EMPTY');
  const capture = path.join(work, 'public-acquisition-current.json');
  await child(process.execPath, [fileURLToPath(new URL('./ravscore-operational-activation.mjs', import.meta.url)),
    'read', '--output', capture], { deadline, env: neutralEnvironment({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }) });
  const current = await jsonFile(capture);
  const manifestPath = path.join(snapshot, 'manifest.json');
  const base = new URL(process.env.RAVRADAR_PUBLIC_BASE_URL);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash)
    fail('PUBLIC_SOURCE_URL_INVALID');
  const nonce = `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`;
  if (!/^[1-9][0-9]*-[1-9][0-9]*$/.test(nonce)) fail('PUBLIC_SOURCE_RUN_INVALID');
  const publicUrl = relative => `${base.href.replace(/\/$/, '')}/${relative}?code-only=${nonce}`;
  await download(publicUrl(FILES[0][0]), manifestPath, MiB, deadline);
  const manifestBytes = await regularBytes(manifestPath, MiB);
  const manifest = JSON.parse(manifestBytes);
  const detailCap = manifestBoundedPublicDetailsBytes(manifest.publicConditionDetailsBytes);
  const files = FILES.map(([remote, local, cap]) => ({ remote, local, cap: cap ?? detailCap }));
  const selection = selectPublicAcquisition(current, manifest, process.env.RECOVER_PUBLIC_RUN_ID ?? '');
  let artifact = null;
  if (selection.mode === 'existing-public-route') {
    for (const file of files.slice(1)) await download(publicUrl(file.remote),
      path.join(snapshot, file.local), file.cap, deadline);
  } else {
    const selected = selection.selected;
    if (!/^[a-f0-9]{40}$/.test(selected.sourceHead ?? '')
      || !/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA ?? '')) fail('PUBLIC_SOURCE_HEAD_INVALID');
    const coordinates = /^pages-([1-9][0-9]*)-([1-9][0-9]*)$/.exec(selected.deploymentId);
    if (!coordinates) fail('PUBLIC_DEPLOYMENT_ID_INVALID');
    const runId = Number(coordinates[1]); const runAttempt = Number(coordinates[2]);
    if (!Number.isSafeInteger(runId) || !Number.isSafeInteger(runAttempt)) fail('PUBLIC_RUN_INVALID');
    const repository = process.env.GITHUB_REPOSITORY;
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')) fail('PUBLIC_REPOSITORY_INVALID');
    const apiBase = `https://api.github.com/repos/${repository}`;
    const stage = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-code-only-sealed-'));
    let apiNumber = 0;
    const api = async relative => {
      const output = path.join(stage, `metadata-${++apiNumber}.json`);
      await download(`${apiBase}/${relative}`, output, API_BYTES, deadline, true);
      return await jsonFile(output);
    };
    const run = await api(`actions/runs/${runId}/attempts/${runAttempt}`);
    if (run.id !== runId || run.run_attempt !== runAttempt || run.head_sha !== selected.sourceHead
      || run.head_branch !== 'main') fail('PUBLIC_SOURCE_ATTEMPT_MISMATCH');
    await child('git', ['merge-base', '--is-ancestor', selected.sourceHead, process.env.GITHUB_SHA],
      { deadline, env: neutralEnvironment() });
    const list = await api(`actions/runs/${runId}/artifacts?per_page=100`);
    if (!Array.isArray(list.artifacts) || list.total_count !== list.artifacts.length
      || list.artifacts.length > 100) fail('PUBLIC_HANDOFF_LIST_INCOMPLETE');
    const name = `ravscore-operational-handoff-${runId}-${runAttempt}`;
    const matches = list.artifacts.filter(item => item.name === name);
    if (matches.length !== 1) fail('PUBLIC_HANDOFF_NOT_UNIQUE');
    const handoffArtifact = checkedArtifact(await api(`actions/artifacts/${matches[0].id}`),
      { id: matches[0].id, name, runId, head: selected.sourceHead, cap: HANDOFF_BYTES });
    const handoffZip = path.join(stage, 'handoff.zip');
    await download(`${apiBase}/actions/artifacts/${handoffArtifact.id}/zip`, handoffZip,
      handoffArtifact.bytes, deadline, true);
    if (await digestFile(handoffZip, handoffArtifact.bytes, HANDOFF_BYTES, deadline)
      !== handoffArtifact.digest) fail('PUBLIC_HANDOFF_DIGEST_MISMATCH');
    const handoffRoot = path.join(stage, 'handoff');
    await extract('handoff', handoffZip, handoffArtifact, handoffRoot, null, deadline);
    const [seal, handoff, binding, handoffManifest] = await Promise.all([
      jsonFile(path.join(handoffRoot, 'pages-artifact-seal.json')),
      jsonFile(path.join(handoffRoot, 'handoff.json')),
      jsonFile(path.join(handoffRoot, 'target-binding.json')),
      regularBytes(path.join(handoffRoot, 'manifest.json'), MiB),
    ]);
    assertExactPublicRavScoreModelBindingShape(binding, { label: 'Selected active public source binding' });
    const sealFields = ['schemaVersion', 'repository', 'runId', 'runAttempt', 'headSha', 'ref',
      'attemptId', 'artifactId', 'artifactName', 'artifactDigestSha256', 'artifactSizeBytes',
      'targetPublicManifestSha256', 'targetImplementationClosureSha256', 'targetModelBinding',
      'createdAt', 'privatePayloadIncluded'];
    if (!handoffManifest.equals(manifestBytes)
      || handoff.schemaVersion !== 'ravscore-operational-deploy-handoff-v2'
      || !['integrated', 'integrated-historical-maintenance'].includes(handoff.action)
      || handoff.legacySourceRequired !== false || handoff.privatePayloadIncluded !== false
      || handoff.sourceHead !== selected.sourceHead || handoff.checkpointDatasetId !== manifest.datasetId
      || seal.schemaVersion !== RAVSCORE_OPERATIONAL_PAGES_ARTIFACT_SEAL_SCHEMA
      || !same(Object.keys(seal).sort(), sealFields.sort())
      || new Date(seal.createdAt).toISOString() !== seal.createdAt
      || seal.repository !== repository || seal.runId !== runId || seal.runAttempt !== runAttempt
      || seal.attemptId !== selected.deploymentId || seal.headSha !== selected.sourceHead
      || seal.ref !== 'refs/heads/main' || seal.artifactName !== 'github-pages'
      || seal.privatePayloadIncluded !== false
      || seal.targetPublicManifestSha256 !== selected.publicManifestSha256
      || seal.targetImplementationClosureSha256 !== selected.implementationClosureSha256
      || !same(seal.targetModelBinding, binding) || !same(binding, current.modelBinding)
      || !same(binding, manifest.ravScoreModelBinding)) fail('PUBLIC_SEAL_CONTEXT_MISMATCH');
    const archiveCap = files.reduce((total, file) => total + file.cap, 0);
    const artifactMetadata = await api(`actions/artifacts/${seal.artifactId}`);
    artifact = checkedArtifact(artifactMetadata,
      { id: seal.artifactId, name: 'github-pages', runId, head: selected.sourceHead, cap: archiveCap });
    if (artifact.bytes !== seal.artifactSizeBytes
      || artifact.digest !== normalizeArtifactDigestSha256(seal.artifactDigestSha256)
      || new Date(artifactMetadata.created_at).toISOString() !== seal.createdAt)
      fail('PUBLIC_ARTIFACT_SEAL_MISMATCH');
    const archive = path.join(stage, 'pages.zip');
    await download(`${apiBase}/actions/artifacts/${artifact.id}/zip`, archive,
      artifact.bytes, deadline, true);
    if (await digestFile(archive, artifact.bytes, archiveCap, deadline) !== artifact.digest)
      fail('PUBLIC_ARTIFACT_DIGEST_MISMATCH');
    const extracted = path.join(stage, 'snapshot');
    await extract('public', archive, artifact, extracted, manifestPath, deadline);
    if (!(await regularBytes(path.join(extracted, 'manifest.json'), MiB)).equals(manifestBytes))
      fail('PUBLIC_ARTIFACT_MANIFEST_BYTES_MISMATCH');
    for (const file of files.slice(1)) {
      remaining(deadline);
      const source = path.join(extracted, file.local);
      const stat = await fs.lstat(source);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > file.cap)
        fail('PUBLIC_EXTRACTED_FILE_BOUND');
      await fs.rename(source, path.join(snapshot, file.local));
    }
    // Keep the private stage for existing runner cleanup. No application cleanup
    // may infer safe deletion from child-close or FileHandle.close() alone.
  }
  remaining(deadline);
  await fs.writeFile(path.join(work, 'public-acquisition.json'), JSON.stringify({
    schemaVersion: 'ravradar-code-only-public-acquisition-v1', mode: selection.mode,
    centralSha256: canonicalHash(current), manifestSha256: hash(manifestBytes),
    artifactId: artifact?.id ?? null, artifactDigestSha256: artifact?.digest ?? null,
    artifactBytes: artifact?.bytes ?? null, privatePayloadRead: false,
  }) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(`Public source acquisition completed: ${selection.mode}; private payload read: false.`);
}

async function assertCurrent() {
  const { snapshot, work } = await stageRoots();
  const receipt = await jsonFile(path.join(work, 'public-acquisition.json'));
  if (receipt.schemaVersion !== 'ravradar-code-only-public-acquisition-v1'
    || !['existing-public-route', 'sealed-active-artifact'].includes(receipt.mode))
    fail('PUBLIC_ACQUISITION_RECEIPT_INVALID');
  if (receipt.mode !== 'sealed-active-artifact') return;
  const before = await jsonFile(path.join(work, 'public-acquisition-current.json'));
  const current = await jsonFile(path.join(work, 'current.json'));
  if (!same(before, current) || canonicalHash(current) !== receipt.centralSha256
    || hash(await regularBytes(path.join(snapshot, 'manifest.json'), MiB)) !== receipt.manifestSha256)
    fail('PUBLIC_SOURCE_IDENTITY_CHANGED_AFTER_ACQUISITION');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const action = process.argv[2];
  Promise.resolve().then(() => {
    if (process.platform !== 'linux') fail('PUBLIC_ACQUISITION_REQUIRES_NORMAL_LINUX_RUNNER');
    if (process.argv.length !== 3) fail('PUBLIC_ACQUISITION_ARGUMENTS_INVALID');
    if (action === 'acquire') return acquire();
    if (action === 'assert-current') return assertCurrent();
    fail('PUBLIC_ACQUISITION_ACTION_INVALID');
  }).catch(error => {
    const reason = /^PUBLIC_[A-Z0-9_]+$/.test(error?.message ?? '')
      ? error.message : 'PUBLIC_ACQUISITION_FAILED';
    console.error(`Public source acquisition refused: ${reason}; no source was reselected.`);
    process.exitCode = 1;
  });
}
