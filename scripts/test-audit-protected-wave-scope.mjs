import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { auditProtectedWaveScope, createReadOnlyProtectedWaveClients, sanitizeProtectedWaveReport } from './audit-protected-wave-scope.mjs';
import { createPrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';
import { buildProtectedPrivateRuntimeArchive, PROTECTED_PRIVATE_RUNTIME_POLICY as policy } from './protected-private-production-runtime.mjs';
import { PRIVATE_RUNTIME_FILES as PRIVATE_RUNTIME_BASE_FILES } from './private-production-runtime-workflow.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const credentials = { supabaseUrl: 'https://storage.example.test', serviceRoleKey: 'sb_secret_synthetic-only' };
const pointerUrl = `${credentials.supabaseUrl}/rest/v1/admin_documents?document_key=eq.${policy.documentKey}&select=document_key,payload,version&limit=2`;

function inspectClient(fetchImpl) {
  let guardedFetch;
  const clients = createReadOnlyProtectedWaveClients({ ...credentials, fetchImpl,
    protectedApi: { PROTECTED_PRIVATE_RUNTIME_POLICY: policy, createProtectedPrivateRuntimeClients(options) {
      guardedFetch = options.fetchImpl;
      return { documentRequest: async () => {}, storage: {} };
    } },
  });
  return { clients, fetch: (...args) => guardedFetch(...args) };
}

test('all write verbs and out-of-scope targets are rejected before transport', async () => {
  let requests = 0;
  const guarded = inspectClient(async () => { requests++; return Response.json({}); });
  for (const method of ['POST', 'PATCH', 'DELETE', 'PUT']) {
    await assert.rejects(guarded.fetch(pointerUrl, { method }), /REMOTE_WRITE_FORBIDDEN/);
  }
  for (const url of [pointerUrl.replace('storage.example.test', 'elsewhere.example.test'),
    `${pointerUrl}&extra=1`, `${pointerUrl}&limit=2`, `${credentials.supabaseUrl}/storage/v1/object/list/${policy.bucketId}`]) {
    await assert.rejects(guarded.fetch(url), /REMOTE_TARGET_FORBIDDEN/);
  }
  await assert.rejects(guarded.clients.storage.uploadImmutable(), /REMOTE_WRITE_FORBIDDEN/);
  await assert.rejects(guarded.clients.storage.removeExact(), /REMOTE_WRITE_FORBIDDEN/);
  assert.equal(requests, 0);
});

test('missing private bucket cannot trigger bucket creation; metadata bodies are bounded', async () => {
  const methods = [];
  const missing = inspectClient(async (_url, options) => { methods.push(options.method); return new Response('', { status: 404 }); });
  await assert.rejects(missing.clients.storage.ensurePrivateBucket(), /PRIVATE_BUCKET_UNAVAILABLE/);
  assert.deepEqual(methods, ['GET']);
  const declared = inspectClient(async () => new Response('{}', { headers: { 'content-length': String(3 * 1024 * 1024) } }));
  await assert.rejects(declared.fetch(pointerUrl), /REMOTE_BODY_BOUND/);
  const streamed = inspectClient(async () => new Response(Buffer.alloc(2 * 1024 * 1024 + 1)));
  await assert.rejects((await streamed.fetch(pointerUrl)).text(), /REMOTE_BODY_BOUND/);
});

async function fixture(t, { corrupt = false, changed = false, wrongContracts = false } = {}) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-protected-wave-test-'));
  t.after(() => fs.rm(temp, { recursive: true, force: true }));
  const source = path.join(temp, 'source');
  const privateRoot = path.join(temp, 'private');
  const buildRoot = path.join(temp, 'build');
  const predecessorRoot = path.join(temp, 'old-reader');
  const rawDirectory = path.join(temp, 'raw');
  for (const folder of [source, privateRoot, buildRoot, predecessorRoot, rawDirectory]) await fs.mkdir(folder);
  const conditions = { datasetId: 'rr-synthetic-wave-audit', productionReferenceAt: '2026-09-18T10:00:00.000Z', generatedAt: '2026-09-18T10:05:00.000Z',
    zones: Object.fromEntries(Array.from({ length: 210 }, (_, index) => [`z-${index}`, {}])),
    coastalParts: { modelBinding: ravScoreModelBinding(), parts: Object.fromEntries(Array.from({ length: 673 }, (_, index) => [`p-${index}`, {}])) } };
  const contractHashes = Object.fromEntries(['continuationStateContractSha256', 'fullRuntimeContractSha256', 'publicProjectionContractSha256'].map(key => [key, 'b'.repeat(64)]));
  const files = [];
  for (const descriptor of PRIVATE_RUNTIME_BASE_FILES) {
    const sourcePath = path.join(source, descriptor.relativePath);
    await fs.mkdir(path.dirname(sourcePath), { recursive: true });
    await fs.writeFile(sourcePath, JSON.stringify(descriptor.id === 'full-conditions' ? conditions : descriptor.id === 'dmi-bulk-cache' ? { zones: {} } : {}));
    files.push({ ...descriptor, sourcePath, privacyClass: 'PRIVATE_PRODUCTION_RUNTIME' });
  }
  const bundlePath = path.join(buildRoot, 'bundle');
  await createPrivateProductionRuntimeBundle({ privateRoot: buildRoot, bundlePath, repositoryRoot: source, files,
    metadata: { datasetId: conditions.datasetId, productionReferenceAt: conditions.productionReferenceAt, generatedAt: conditions.generatedAt,
      generationId: 'synthetic-wave-audit', zoneCount: 210, partCount: 673, modelBinding: ravScoreModelBinding(), contractHashes, privacyClass: 'PRIVATE_PRODUCTION_RUNTIME' } });
  const built = await buildProtectedPrivateRuntimeArchive({ privateRoot: buildRoot, bundlePath, repositoryRoot: source, sourceHead: 'a'.repeat(40) });
  // Test-only archived-module facades exercise the real bundle reader/validator.
  // Production receives an untouched git archive of the exact descriptor head.
  await fs.mkdir(path.join(predecessorRoot, 'scripts'));
  await fs.mkdir(path.join(predecessorRoot, 'js/core'), { recursive: true });
  await fs.writeFile(path.join(predecessorRoot, 'package.json'), '{"type":"module"}');
  await fs.writeFile(path.join(predecessorRoot, 'scripts/protected-private-production-runtime.mjs'), `export * from ${JSON.stringify(pathToFileURL(path.join(repositoryRoot, 'scripts/protected-private-production-runtime.mjs')).href)};`);
  await fs.writeFile(path.join(predecessorRoot, 'scripts/private-production-runtime-workflow.mjs'), `export const privateRuntimeContractHashes = async () => (${JSON.stringify(wrongContracts ? { ...contractHashes, fullRuntimeContractSha256: 'c'.repeat(64) } : contractHashes)});`);
  await fs.writeFile(path.join(predecessorRoot, 'js/core/ravscore-model-contract.js'), `export const ravScoreModelBinding = () => (${JSON.stringify(ravScoreModelBinding())});`);
  await fs.writeFile(path.join(rawDirectory, 'asset-manifest.json'), '{"assets":{}}');
  const calls = [];
  let pointerReads = 0;
  const fetchImpl = async (url, options) => {
    const target = new URL(url);
    calls.push({ path: target.pathname, method: options.method });
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    if (target.pathname === '/rest/v1/admin_documents') {
      const current = structuredClone(built.descriptor);
      if (++pointerReads > 1 && changed) current.sourceHead = 'd'.repeat(40);
      return Response.json([{ document_key: policy.documentKey, version: 1, payload: { schemaVersion: policy.schemaVersion, kind: policy.pointerKind, current, previous: null } }]);
    }
    if (target.pathname === `/storage/v1/bucket/${policy.bucketId}`) return Response.json({ id: policy.bucketId, name: policy.bucketId, public: false,
      file_size_limit: policy.maximumArchiveBytes, allowed_mime_types: [policy.mimeType] });
    const item = built.objects.find(object => target.pathname === `/storage/v1/object/authenticated/${policy.bucketId}/${object.descriptor.objectPath}`);
    assert.ok(item, 'only exact protected objects are requested');
    const bytes = Buffer.from(item.bytes);
    if (corrupt) bytes[0] ^= 1;
    return new Response(bytes);
  };
  const descriptorPath = path.join(privateRoot, 'source.json');
  const described = await auditProtectedWaveScope({ mode: 'describe', privateRoot, descriptorPath, outputPath: path.join(privateRoot, 'describe.json'), ...credentials, fetchImpl });
  assert.equal(described.status, 'SOURCE_DESCRIBED', JSON.stringify(described));
  const options = { mode: 'audit', privateRoot, descriptorPath, predecessorRoot, rawDirectory,
    outputPath: path.join(privateRoot, 'audit.json'), ...credentials, fetchImpl };
  return { options, calls, privateRoot, conditions, source };
}

test('actual protected archive validation binds scope without asserting public deployment or historical state', async t => {
  const { options, calls, privateRoot, conditions, source } = await fixture(t);
  const report = await auditProtectedWaveScope(options);
  assert.equal(report.status, 'AUDIT_COMPLETED', JSON.stringify(report));
  assert.equal(report.productionGenerationProved, true);
  assert.equal(report.protectedGenerationReadbackVerified, true);
  assert.equal(report.exactArchivedSourceContractsVerified, true);
  assert.equal(report.publicDeploymentProved, false);
  assert.equal(report.historicalStateImpactProved, false);
  assert.equal(report.wave.activeProtectedParts.registeredParts, 673);
  assert.equal(report.wave.counts.rowsComparedAtSavedGrid, 0);
  assert.ok(calls.every(call => call.method === 'GET'));
  assert.deepEqual((await fs.readdir(privateRoot)).sort(), ['audit.json', 'describe.json', 'source.json']);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(source, 'data/live/conditions.json'))), conditions);
  for (const prohibited of ['sb_secret', 'rr-synthetic', 'modelBinding', 'bundleContentSha256', 'bundles/', privateRoot]) assert.equal(JSON.stringify(report).includes(prohibited), false);
});

for (const [title, mutation, code] of [
  ['corrupt protected archive', { corrupt: true }, 'PROTECTED_RESTORE_REJECTED'],
  ['changed protected current generation', { changed: true }, 'CURRENT_GENERATION_CHANGED'],
  ['wrong archived contracts', { wrongContracts: true }, 'PREDECESSOR_CONTRACT_MISMATCH'],
]) test(`${title} fails closed without lifting production proof`, async t => {
  const { options, calls } = await fixture(t, mutation);
  const report = await auditProtectedWaveScope(options);
  assert.equal(report.status, 'AUDIT_FAILED_CLOSED');
  assert.equal(report.productionGenerationProved, false);
  assert.equal(report.code, code, JSON.stringify(report));
  if (!mutation.corrupt) assert.equal(calls.some(call => call.path.includes('/object/')), false);
});

test('report sanitizer refuses unbound scope and invalid counters', () => {
  assert.throws(() => sanitizeProtectedWaveReport({ schemaVersion: 'dmi-wave-period-evidence-v1', stage: 'grib', status: 'AUDIT_COMPLETED' }), /AUDIT_REPORT_INVALID/);
  assert.throws(() => sanitizeProtectedWaveReport({ schemaVersion: 'dmi-wave-period-evidence-v1', stage: 'grib', status: 'AUDIT_COMPLETED',
    providerRequestsPerformed: false, inputFilesModified: false, coordinatesIncluded: false, rawScalarsIncluded: false, sourceIdentifiersIncluded: false,
    protectedPartScope: { provided: true, candidateAndConditionsFileBindingVerified: true }, counts: { entities: -1 } }), /AUDIT_COUNTER_INVALID/);
});
