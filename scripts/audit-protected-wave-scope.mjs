#!/usr/bin/env node
// Diagnostic only: exact old reader + its protected current generation + cached
// original GRIB. No promotion, weather acquisition, bucket creation or writes.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as currentProtected from './protected-private-production-runtime.mjs';
import { buildSupabaseAdminHeaders } from './lib/supabase-admin-rest.mjs';

const REPOSITORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fail = code => { const error = new Error(code); error.auditCode = code; throw error; };
const inside = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return relative === '' || relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
const stable = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const same = (a, b) => stable(a) === stable(b);
function validateIdentity(value) {
  const keys = 'bundleContentSha256,contractHashes,datasetId,expectedPartCount,expectedZoneCount,generatedAt,kind,modelBinding,privatePayloadIncluded,productionReferenceAt,schemaVersion,sourceHead';
  if (!value || Object.keys(value).sort().join(',') !== keys
    || value.schemaVersion !== '1.0.0' || value.kind !== 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_CURRENT_SOURCE'
    || !/^[a-f0-9]{40}$/.test(value.sourceHead ?? '') || !/^[a-f0-9]{64}$/.test(value.bundleContentSha256 ?? '')
    || !/^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value.datasetId ?? '')
    || value.expectedPartCount !== 673 || value.expectedZoneCount !== 210 || value.privatePayloadIncluded !== false
    || !value.modelBinding || typeof value.modelBinding !== 'object' || Array.isArray(value.modelBinding)
    || !value.contractHashes || typeof value.contractHashes !== 'object' || Array.isArray(value.contractHashes)
    || Object.keys(value.contractHashes).length < 3 || Object.keys(value.contractHashes).length > 16
    || !['continuationStateContractSha256', 'fullRuntimeContractSha256', 'publicProjectionContractSha256'].every(key => Object.hasOwn(value.contractHashes, key))
    || Object.entries(value.contractHashes).some(([key, hash]) => !/^[a-z][A-Za-z0-9]{0,63}Sha256$/.test(key) || !/^[a-f0-9]{64}$/.test(hash))) fail('SOURCE_IDENTITY_INVALID');
  for (const field of ['productionReferenceAt', 'generatedAt']) {
    if (typeof value[field] !== 'string' || !Number.isFinite(Date.parse(value[field]))
      || new Date(value[field]).toISOString() !== value[field]) fail('SOURCE_IDENTITY_INVALID');
  }
}

export function createReadOnlyProtectedWaveClients({
  protectedApi = currentProtected, supabaseUrl = process.env.SUPABASE_URL,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl = globalThis.fetch,
} = {}) {
  let base;
  try { base = new URL(supabaseUrl); } catch { fail('READ_CREDENTIALS_UNAVAILABLE'); }
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/'
    || base.search || base.hash || typeof serviceRoleKey !== 'string' || !serviceRoleKey.trim()) fail('READ_CREDENTIALS_UNAVAILABLE');
  const policy = protectedApi.PROTECTED_PRIVATE_RUNTIME_POLICY;
  const bucketPath = `/storage/v1/bucket/${encodeURIComponent(policy.bucketId)}`;
  const objectPrefix = `/storage/v1/object/authenticated/${encodeURIComponent(policy.bucketId)}/`;
  const started = Date.now();
  let requests = 0;
  async function readOnlyFetch(target, options = {}) {
    const url = new URL(target);
    if (String(options.method ?? 'GET').toUpperCase() !== 'GET') fail('REMOTE_WRITE_FORBIDDEN');
    if (++requests > 40 || Date.now() - started > 300_000) fail('REMOTE_READ_BOUND');
    const pointerRead = url.pathname === '/rest/v1/admin_documents'
      && [...url.searchParams.keys()].sort().join(',') === 'document_key,limit,select'
      && url.searchParams.get('document_key') === `eq.${policy.documentKey}`
      && url.searchParams.get('select') === 'document_key,payload,version'
      && url.searchParams.get('limit') === '2';
    const objectRead = url.pathname.startsWith(objectPrefix) && !url.search
      && /^bundles\/sha256\/(?:[a-f0-9]{64}\.json\.gz|[a-f0-9]{64}\/part-\d{3}-[a-f0-9]{64}\.json\.gz\.part)$/.test(url.pathname.slice(objectPrefix.length));
    if (url.origin !== base.origin || url.username || url.password || url.hash
      || !(pointerRead || objectRead || url.pathname === bucketPath && !url.search)) fail('REMOTE_TARGET_FORBIDDEN');
    const response = await fetchImpl(url.href, { ...options, method: 'GET', redirect: 'error',
      signal: AbortSignal.timeout(Math.max(1, Math.min(60_000, 300_000 - (Date.now() - started)))) });
    const maximum = objectRead ? policy.maximumArchiveBytes : 2 * 1024 * 1024;
    const declared = response.headers?.get?.('content-length');
    if (declared !== null && declared !== undefined && (!/^\d+$/.test(declared) || Number(declared) > maximum)) {
      await response.body?.cancel?.().catch(() => {});
      fail('REMOTE_BODY_BOUND');
    }
    if (!response.body) return response;
    const reader = response.body.getReader();
    let received = 0;
    return new Response(new ReadableStream({
      async pull(controller) {
        try {
          const item = await reader.read();
          if (item.done) { controller.close(); return; }
          received += item.value.byteLength;
          if (received > maximum) { await reader.cancel(); fail('REMOTE_BODY_BOUND'); }
          controller.enqueue(item.value);
        } catch (error) { controller.error(error); }
      },
      cancel: () => reader.cancel(),
    }), { status: response.status, statusText: response.statusText, headers: response.headers });
  }
  const client = protectedApi.createProtectedPrivateRuntimeClients({
    supabaseUrl: base.origin, serviceRoleKey, fetchImpl: readOnlyFetch,
  });
  return {
    request: client.documentRequest,
    storage: {
      ...client.storage,
      // Deliberately NOT client.ensurePrivateBucket: that can POST on 404.
      async ensurePrivateBucket() {
        const response = await readOnlyFetch(`${base.origin}${bucketPath}`, { headers: buildSupabaseAdminHeaders(serviceRoleKey) });
        if (!response.ok) { await response.body?.cancel?.().catch(() => {}); fail('PRIVATE_BUCKET_UNAVAILABLE'); }
        const text = await response.text();
        if (Buffer.byteLength(text) > 64 * 1024) fail('BUCKET_METADATA_INVALID');
        let bucket;
        try { bucket = JSON.parse(text); } catch { fail('BUCKET_METADATA_INVALID'); }
        if (bucket.id !== policy.bucketId || bucket.name !== policy.bucketId || bucket.public !== false
          || !Number.isSafeInteger(Number(bucket.file_size_limit)) || Number(bucket.file_size_limit) < policy.maximumArchiveBytes
          || !Array.isArray(bucket.allowed_mime_types) || !bucket.allowed_mime_types.includes(policy.mimeType)) fail('PRIVATE_BUCKET_POLICY_INVALID');
        return true;
      },
      uploadImmutable: async () => fail('REMOTE_WRITE_FORBIDDEN'),
      removeExact: async () => fail('REMOTE_WRITE_FORBIDDEN'),
    },
  };
}

async function privateContext(privateRoot, repositoryRoot) {
  const requested = path.resolve(privateRoot);
  const details = await fs.lstat(requested);
  if (!details.isDirectory() || details.isSymbolicLink()) fail('PRIVATE_ROOT_INVALID');
  const root = await fs.realpath(requested);
  const repository = await fs.realpath(repositoryRoot);
  const tempRoots = [await fs.realpath(os.tmpdir())];
  if (process.env.RUNNER_TEMP) tempRoots.push(await fs.realpath(process.env.RUNNER_TEMP));
  if (inside(repository, root) || inside(root, repository)
    || !tempRoots.some(parent => root !== parent && inside(parent, root))) fail('PRIVATE_ROOT_INVALID');
  return { root, repository };
}
async function boundedJson(file, maximum = 1024 * 1024) {
  const details = await fs.lstat(file);
  if (!details.isFile() || details.isSymbolicLink() || details.size < 2 || details.size > maximum) fail('LOCAL_METADATA_INVALID');
  return JSON.parse(await fs.readFile(file, 'utf8'));
}
async function privateOutput(root, file) {
  const destination = path.resolve(file);
  const parent = await fs.realpath(path.dirname(destination));
  if (!inside(root, parent) || destination === root) fail('PRIVATE_OUTPUT_INVALID');
  if (await fs.lstat(destination).catch(error => { if (error.code === 'ENOENT') return null; throw error; })) fail('OUTPUT_ALREADY_EXISTS');
  return destination;
}

const COUNT_KEYS = ('entities rows periodRows waveSourceRows nativeWaveSourceRows nonNativeOrIncompleteSourceRows uniqueReferencedAssets '
  + 'manifestAssets invalidManifestEntries missingManifestAssets ambiguousManifestAssets sourceManifestMatchedRows sourceManifestMismatchRows '
  + 'missingAssetFiles unsafeAssetFiles assetByteMismatch assetHashMismatch verifiedAssets verifiedAssetBytes hashedAssetBytes verifiedSourceRows '
  + 'inspectedAssets gribReadErrors messages pp1dMessages mwpMessages otherPeriodMessages assetsWithPp1d assetsWithMwp assetsWithBoth '
  + 'unsupportedGridMessages unsupportedPeriodUnitMessages messageTimeMismatch rowsComparedAtSavedGrid rowsWithoutPp1dAtSavedGrid '
  + 'rowsWithAmbiguousPp1d rowsWithoutMwpAtSavedGrid rowsWithAmbiguousMwp rowsSavedPeriodEqualsPp1d rowsSavedPeriodDiffersFromPp1d '
  + 'rowsSavedPeriodEqualsMwpOnly rowsSavedPeriodEqualsBoth rowsSavedPeriodEqualsNeither entitiesWithSavedPeriodDifferentFromPp1d '
  + 'assetsSkippedByBudget rowsSkippedByBudget').split(' ');
const GROUP_KEYS = ['entities', 'nativeWaveSourceRows', 'rowsComparedAtSavedGrid', 'rowsSavedPeriodDiffersFromPp1d', 'entitiesWithSavedPeriodDifferentFromPp1d'];
const GROUPS = ['coastal-part', 'parent-zone', 'water-level-source', 'private-stage', 'private-research', 'other'];
const ACTIVE_KEYS = ('registeredParts nativeRowsWithExactPartIdentity nativeRowsWithPartIdentityMismatch verifiedSourceRows comparedRows '
  + 'differentPeriodRowsBeforeH0 differentPeriodRowsAtH0 differentPeriodRowsAfterH0 partsWithDifferentPeriod partsWithDifferentPeriodAtOrBeforeH0').split(' ');
function counters(value, keys) {
  return Object.fromEntries(keys.map(key => {
    if (!Number.isSafeInteger(value?.[key]) || value[key] < 0) fail('AUDIT_COUNTER_INVALID');
    return [key, value[key]];
  }));
}
export function sanitizeProtectedWaveReport(report) {
  if (report?.schemaVersion !== 'dmi-wave-period-evidence-v1' || report.stage !== 'grib'
    || !['AUDIT_COMPLETED', 'BOUNDED_PARTIAL'].includes(report.status)
    || report.providerRequestsPerformed !== false || report.inputFilesModified !== false
    || report.coordinatesIncluded !== false || report.rawScalarsIncluded !== false || report.sourceIdentifiersIncluded !== false
    || report.protectedPartScope?.provided !== true || report.protectedPartScope?.candidateAndConditionsFileBindingVerified !== true) fail('AUDIT_REPORT_INVALID');
  return {
    status: report.status, counts: counters(report.counts, COUNT_KEYS),
    entityGroups: Object.fromEntries(GROUPS.map(group => [group, counters(report.entityGroups?.[group], GROUP_KEYS)])),
    activeProtectedParts: counters(report.protectedPartScope.counts, ACTIVE_KEYS),
    numericComparisonScope: 'EXACT_PERSISTED_NATIVE_GRID_CELL_ONLY',
    oldSamplerWinnerReplayed: false, historicalStateImpactProved: false,
  };
}

export async function auditProtectedWaveScope({
  mode, privateRoot, descriptorPath, predecessorRoot, rawDirectory, outputPath,
  repositoryRoot = REPOSITORY, pythonExecutable = process.env.PYTHON ?? 'python',
  supabaseUrl, serviceRoleKey, fetchImpl,
} = {}) {
  let work = null;
  let phase = 'SETUP';
  let protectedVerified = false;
  try {
    if (!['describe', 'audit'].includes(mode)) fail('MODE_INVALID');
    const context = await privateContext(privateRoot, repositoryRoot);
    const output = await privateOutput(context.root, outputPath);
    if (mode === 'describe') {
      const descriptor = await privateOutput(context.root, descriptorPath);
      if (output === descriptor) fail('PRIVATE_OUTPUT_INVALID');
      phase = 'DESCRIBE';
      const clients = createReadOnlyProtectedWaveClients({ supabaseUrl, serviceRoleKey, fetchImpl });
      const source = await currentProtected.describeCurrentProtectedPrivateProductionRuntime(clients);
      validateIdentity(source);
      await fs.writeFile(descriptor, `${JSON.stringify(source)}\n`, { flag: 'wx', mode: 0o600 });
      const report = { schemaVersion: 1, kind: 'PROTECTED_WAVE_SCOPE_AUDIT', status: 'SOURCE_DESCRIBED',
        protectedGenerationReadbackVerified: false, productionGenerationProved: false, publicDeploymentProved: false,
        historicalStateImpactProved: false, providerRequestsPerformed: false, remoteWrites: false, privatePayloadIncluded: false };
      await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
      return report;
    }
    phase = 'SOURCE_VALIDATION';
    const identity = await boundedJson(descriptorPath);
    validateIdentity(identity);
    const predecessor = await fs.realpath(predecessorRoot);
    if (inside(context.root, predecessor) || inside(predecessor, context.root)
      || inside(context.repository, predecessor) || inside(predecessor, context.repository)) fail('PREDECESSOR_ROOT_INVALID');
    // The workflow must archive exactly identity.sourceHead from the trusted
    // repository before secrets are supplied. All archived contract hashes are
    // independently checked below; no current-code rebind is performed.
    const oldImport = relative => import(`${pathToFileURL(path.join(predecessor, relative)).href}?waveScope=${identity.sourceHead}`);
    const [oldProtected, oldWorkflow, oldBinding] = await Promise.all([
      oldImport('scripts/protected-private-production-runtime.mjs'),
      oldImport('scripts/private-production-runtime-workflow.mjs'),
      oldImport('js/core/ravscore-model-contract.js'),
    ]);
    if (!same(oldBinding.ravScoreModelBinding(), identity.modelBinding)
      || !same(await oldWorkflow.privateRuntimeContractHashes({ repositoryRoot: predecessor }), identity.contractHashes)) fail('PREDECESSOR_CONTRACT_MISMATCH');
    const clients = createReadOnlyProtectedWaveClients({ protectedApi: oldProtected, supabaseUrl, serviceRoleKey, fetchImpl });
    const current = await oldProtected.describeCurrentProtectedPrivateProductionRuntime(clients);
    if (!same(current, identity)) fail('CURRENT_GENERATION_CHANGED');
    work = await fs.mkdtemp(path.join(context.root, 'protected-wave-scope-'));
    const bundlePath = path.join(work, 'bundle');
    const expected = { modelBinding: identity.modelBinding, contractHashes: identity.contractHashes,
      datasetId: identity.datasetId, productionReferenceAt: identity.productionReferenceAt, generatedAt: identity.generatedAt,
      targetReferenceAt: identity.productionReferenceAt, minimumReferenceAt: identity.productionReferenceAt,
      minimumGeneratedAt: identity.generatedAt };
    phase = 'PROTECTED_RESTORE';
    const restored = await oldProtected.restoreProtectedPrivateProductionRuntime({
      ...clients, privateRoot: work, bundlePath, repositoryRoot: predecessor, expected,
    }).catch(error => { if (error?.auditCode) throw error; fail('PROTECTED_RESTORE_REJECTED'); });
    if (restored.restored !== true || restored.rollbackSelected !== false
      || restored.bundleContentSha256 !== identity.bundleContentSha256) fail('EXACT_CURRENT_NOT_RESTORED');
    if (!same(await oldProtected.describeCurrentProtectedPrivateProductionRuntime(clients), identity)) fail('CURRENT_GENERATION_CHANGED');
    const manifest = await boundedJson(path.join(bundlePath, 'manifest.json'));
    if (manifest.bundleContentSha256 !== identity.bundleContentSha256) fail('BUNDLE_IDENTITY_MISMATCH');
    protectedVerified = true;
    phase = 'WAVE_SCOPE';
    const raw = await fs.realpath(rawDirectory);
    if (!(await fs.lstat(rawDirectory)).isDirectory() || (await fs.lstat(rawDirectory)).isSymbolicLink()) fail('RAW_DIRECTORY_INVALID');
    const pythonOutput = path.join(work, 'wave-evidence.json');
    await new Promise((resolve, reject) => {
      const child = spawn(pythonExecutable, [path.join(REPOSITORY, 'scripts/audit-dmi-wave-period-evidence.py'),
        '--candidate', path.join(bundlePath, 'payload/data/live/dmi-bulk-cache.json'),
        '--protected-conditions', path.join(bundlePath, 'payload/data/live/conditions.json'),
        '--bundle-manifest', path.join(bundlePath, 'manifest.json'), '--raw-dir', raw,
        '--stage', 'grib', '--max-assets', '512', '--max-bytes', String(2560 * 1024 * 1024),
        '--max-seconds', '600', '--output', pythonOutput],
      { windowsHide: true, stdio: 'ignore', env: { ...process.env, PYTHONUTF8: '1' } });
      const timer = setTimeout(() => { child.kill(); reject(Object.assign(new Error('WAVE_AUDIT_TIMEOUT'), { auditCode: 'WAVE_AUDIT_TIMEOUT' })); }, 630_000);
      child.once('error', () => { clearTimeout(timer); reject(Object.assign(new Error('WAVE_AUDIT_FAILED'), { auditCode: 'WAVE_AUDIT_FAILED' })); });
      child.once('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(Object.assign(new Error('WAVE_AUDIT_FAILED'), { auditCode: 'WAVE_AUDIT_FAILED' })); });
    });
    const wave = sanitizeProtectedWaveReport(await boundedJson(pythonOutput));
    const report = { schemaVersion: 1, kind: 'PROTECTED_WAVE_SCOPE_AUDIT', status: wave.status,
      protectedGenerationReadbackVerified: true, exactArchivedSourceContractsVerified: true,
      productionGenerationProved: true, publicDeploymentProved: false,
      protectedProductionReferenceAt: identity.productionReferenceAt,
      oldSamplerWinnerReplayed: false, historicalStateImpactProved: false,
      providerRequestsPerformed: false, remoteWrites: false, privatePayloadIncluded: false, wave };
    await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    return report;
  } catch (error) {
    const report = { schemaVersion: 1, kind: 'PROTECTED_WAVE_SCOPE_AUDIT', status: 'AUDIT_FAILED_CLOSED',
      phase, code: error?.auditCode ?? 'BOUNDED_DIAGNOSTIC_FAILED',
      protectedGenerationReadbackVerified: protectedVerified, productionGenerationProved: protectedVerified,
      publicDeploymentProved: false, historicalStateImpactProved: false,
      providerRequestsPerformed: false, remoteWrites: false, privatePayloadIncluded: false };
    // Only write to an already checked private output; otherwise return the
    // fixed payload-free failure via stdout without guessing another path.
    try {
      const context = await privateContext(privateRoot, repositoryRoot);
      await fs.writeFile(await privateOutput(context.root, outputPath), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    } catch { /* exclusive output may already exist */ }
    return report;
  } finally {
    if (work && path.dirname(work) === await fs.realpath(privateRoot).catch(() => null)
      && path.basename(work).startsWith('protected-wave-scope-')) await fs.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const values = { mode: args.shift() };
  const names = { '--private-root': 'privateRoot', '--descriptor': 'descriptorPath', '--predecessor-root': 'predecessorRoot',
    '--raw-dir': 'rawDirectory', '--output': 'outputPath' };
  let invalid = false;
  while (args.length) {
    const key = names[args.shift()];
    const value = args.shift();
    if (!key || !value || values[key]) { invalid = true; break; }
    values[key] = value;
  }
  if (invalid) { console.error('PROTECTED_WAVE_AUDIT_ARGUMENT_INVALID'); process.exitCode = 1; }
  else {
    const report = await auditProtectedWaveScope(values);
    console.log(JSON.stringify(report));
    if (report.status === 'AUDIT_FAILED_CLOSED') process.exitCode = 1;
  }
}
