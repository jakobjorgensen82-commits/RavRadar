import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { auditSavedWeatherInputs, createReadOnlySavedWeatherClients,
  measureSavedCurrentContexts, measureSavedNativeProofAvailability, withoutSavedAuditSecrets } from './audit-saved-weather-inputs.mjs';
import { createPrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';
import { buildProtectedPrivateRuntimeArchive, PROTECTED_PRIVATE_RUNTIME_POLICY as policy } from './protected-private-production-runtime.mjs';
import { PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_FILES } from './lib/private-weather-component-inventory.mjs';
import { buildPrivateWeatherComponentPack } from './lib/private-weather-component-pack.mjs';
import { weatherComponentProgressCache, WEATHER_PROGRESS_CIPHER_PATH } from './weather-component-progress-cache.mjs';
import { inspectDmiForecastFile } from './lib/dmi-forecast-file.mjs';
import { packDmiPartContinuity } from './lib/dmi-part-continuity.mjs';
import { DMI_FORECAST_HOURS, buildDmiForecastHourly } from './lib/dmi-forecast-store.mjs';
import { dmiExpectedIdentityForPart } from './lib/ravscore-production-adapters.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { buildCurrentSupplyMemory } from '../js/core/ravscore-current-supply-memory.js';
import { spawnSync } from 'node:child_process';
import { summarizeSealedCurrentPart, summarizeSealedCurrentNationalParts, validateSealedCurrentSourceTarget,
  SEALED_CURRENT_SOURCE_TARGET as sealedTarget } from './audit-sealed-current-source.mjs';
// The new fixed package has its own immutable target; keep old audit tests intact.
await import('./test-sealed-arrow-score-audit.mjs');

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const credentials = { supabaseUrl: 'https://storage.example.test', serviceRoleKey: 'sb_secret_synthetic-never-real',
  accountId: 'a'.repeat(32), accessKeyId: 'synthetic-access', secretAccessKey: 'synthetic-secret' };
const pointerUrl = `${credentials.supabaseUrl}/rest/v1/admin_documents?document_key=eq.${policy.documentKey}&select=document_key,payload,version&limit=2`;
const encryptionKey = Buffer.alloc(32, 52).toString('base64');
const repository = 'owner/synthetic';
const progressSource = '123456-1';
const progressCacheKey = `weather-private-progress-encrypted-v2-Linux-main-${progressSource}`;
async function temp(t) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-saved-input-test-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  return folder;
}
async function write(root, relative, value) {
  const destination = path.join(root, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value));
}
function safeReport(report, privateRoot) {
  const json = JSON.stringify(report);
  for (const forbidden of ['synthetic-secret', 'synthetic-access', 'sb_secret_', 'rr-synthetic-input',
    'secret-error-canary', 'bundleContentSha256', 'contractHashes', 'bundles/', 'coastal-part-sensitive',
    'currentUMps', 'samplingPoint', 'waterPoint', privateRoot]) assert.equal(json.includes(forbidden), false, forbidden);
}

function nativeFixture(part, reference = '2026-09-29T16:00:00.000Z') {
  const identity = dmiExpectedIdentityForPart(part), epoch = Date.parse(reference);
  // Persisted Python DMI output does not use JavaScript's .000Z spelling.
  // The audit must consume these exact strings, not rewrite the fixture.
  const at = hour => new Date(epoch + hour * 3_600_000).toISOString().replace('.000Z', 'Z');
  const vectorSelection = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
  const native = [0, 3].map(hour => {
    const source = { provider: 'dmi', fallback: false, collection: 'dkss_idw', collectionFamily: 'marine',
      componentKind: 'ocean-current-vector', fieldSet: ['current-u', 'current-v'],
      spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation', vectorSemanticsVersion: 3,
      vectorSelection, verticalLayer: 'depth:1', verticalLayerRankM: 1, ...identity, component: 'current',
      modelRun: at(-12), itemId: `synthetic-private-item-${hour}`, assetIdentitySha256: 'a'.repeat(64),
      nativeValidTime: at(hour), leadTimeHours: hour + 12, acquiredAt: at(-1), itemUpdatedAt: at(-11),
      optionalFieldSet: [], samplingPoint: [...part.waterPoint], gridPoint: [...part.waterPoint],
      gridDefinitionSha256: 'b'.repeat(64), distanceKm: 0, spatialSemanticsVersion: 1 };
    return { time: at(hour), 'current-u': 0.1 + hour / 10, 'current-v': 0.2 + hour / 10, sources: { current: source } };
  });
  const header = { currentVectorSemanticsVersion: 3, currentVectorSelection: vectorSelection,
    currentMaxDistanceKm: 5, timeStrideHours: 3, generatedAt: at(0).replace('Z', '.123456+00:00') };
  const donor = selected => ({ ...header, zones: { [identity.entityId]: { ...identity,
    hourly: Object.fromEntries(selected.map(row => [row.time, structuredClone(row)])) } } });
  const hourly = buildDmiForecastHourly({ ocean: native.map(row => ({ step: row.time,
    'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources })),
    generatedAt: at(0), startAt: at(0), hours: DMI_FORECAST_HOURS, sourceCadenceMinutes: 180 }).hourly;
  // Two native endpoints, two interpolated hours and the existing one-hour
  // nearest-native tail. Do not silently redefine the producer's coverage.
  assert.equal(hourly.filter(row => Number.isFinite(row.currentUMps)).length, 5);
  return { identity, hourly, native, donor, reference };
}

async function saveContinuity(root, relative, parts, firstHourly, reference) {
  const emptyHourly = Array.from({ length: DMI_FORECAST_HOURS }, (_, i) => ({
    time: new Date(Date.parse(reference) + i * 3_600_000).toISOString(), sources: {} }));
  const records = new Map(parts.map((part, i) => [part.partId, { zoneId: `PART::${part.partId}`,
    point: part.waterPoint, hourly: i === 0 ? firstHourly : emptyHourly }]));
  await write(root, relative, { zones: {}, partContinuity: await packDmiPartContinuity(records, parts, reference) });
  return inspectDmiForecastFile(path.join(root, relative));
}

test('read facade rejects mutations and every undeclared endpoint before transport', async () => {
  let requests = 0;
  const clients = createReadOnlySavedWeatherClients({ ...credentials, fetchImpl: async () => { requests++; return Response.json([]); } });
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) await assert.rejects(clients.guardedFetch(pointerUrl, { method }), /REMOTE_WRITE_FORBIDDEN/);
  await assert.rejects(clients.guardedFetch(pointerUrl, { body: 'secret-error-canary' }), /REMOTE_WRITE_FORBIDDEN/);
  for (const url of [pointerUrl.replace('storage.example.test', 'other.example.test'), `${pointerUrl}&limit=2`,
    `${pointerUrl}&extra=true`, `${credentials.supabaseUrl}/storage/v1/bucket/${policy.bucketId}`,
    `https://${credentials.accountId}.eu.r2.cloudflarestorage.com/${policy.bucketId}?list-type=2`,
    `https://${credentials.accountId}.eu.r2.cloudflarestorage.com/${policy.bucketId}/bundles/sha256/${'b'.repeat(64)}.json.gz`]) {
    await assert.rejects(clients.guardedFetch(url), /REMOTE_TARGET_FORBIDDEN/);
  }
  await assert.rejects(clients.storage.uploadImmutable(), /REMOTE_WRITE_FORBIDDEN/);
  await assert.rejects(clients.storage.removeExact(), /REMOTE_WRITE_FORBIDDEN/);
  await assert.rejects(clients.storage.anonymousStatus(), /REMOTE_TARGET_FORBIDDEN/);
  assert.equal(requests, 0);
});

test('read bodies, requests and redirects retain their original bounds', async () => {
  for (const response of [() => new Response('{}', { headers: { 'content-length': '3000000' } }),
    () => new Response(Buffer.alloc(2 * 1024 * 1024 + 1))]) {
    const client = createReadOnlySavedWeatherClients({ ...credentials, fetchImpl: async () => response() });
    await assert.rejects(client.guardedFetch(pointerUrl), /REMOTE_BODY_BOUND/);
  }
  const redirect = createReadOnlySavedWeatherClients({ ...credentials, fetchImpl: async () => new Response(null, { status: 302, headers: { location: 'https://other.example.test' } }) });
  await assert.rejects(redirect.guardedFetch(pointerUrl), /REMOTE_REDIRECT_FORBIDDEN/);
  const once = createReadOnlySavedWeatherClients({ ...credentials, maximumRequests: 1, fetchImpl: async () => Response.json([]) });
  await once.guardedFetch(pointerUrl);
  await assert.rejects(once.guardedFetch(pointerUrl), /REMOTE_READ_BOUND/);
});

test('offline CPU gaps do not consume the unchanged cumulative HTTP/body budget', async () => {
  let now = 0, requests = 0;
  const signals = [];
  const durations = [3, 4, 5];
  const client = createReadOnlySavedWeatherClients({ ...credentials, maximumMilliseconds: 12,
    clock: () => now, fetchImpl: async (_url, { signal }) => {
      signals.push(signal); now += durations[requests++]; return Response.json([]);
    } });
  now += 900_000; // Offline work before the first actual read.
  await client.guardedFetch(pointerUrl);
  now += 900_000; // Dense native-proof CPU between protected pointer readbacks.
  await client.guardedFetch(pointerUrl);
  assert.equal(requests, 2);
  assert.ok(signals.every(signal => !signal.aborted));
  now += 900_000;
  await assert.rejects(client.guardedFetch(pointerUrl), /REMOTE_READ_BOUND/);
  assert.equal(requests, 3, '3+4+5 active milliseconds reach the original 12ms test cap');
  await assert.rejects(client.guardedFetch(pointerUrl), /REMOTE_READ_BOUND/);
  assert.equal(requests, 3, 'a timed-out client cannot issue a follow-up read');
});

test('body reads count toward both remaining aggregate time and the fixed 60-second request cap', async () => {
  let now = 0, requestSignal;
  const client = createReadOnlySavedWeatherClients({ ...credentials, maximumMilliseconds: 8, clock: () => now,
    fetchImpl: async (_url, { signal }) => {
      requestSignal = signal; now += 2;
      let reads = 0;
      return new Response(new ReadableStream({ pull(controller) {
        if (++reads === 1) { now += 3; controller.enqueue(new TextEncoder().encode('[]')); }
        else { now += 4; controller.close(); }
      } }, { highWaterMark: 0 }));
    } });
  await assert.rejects(client.guardedFetch(pointerUrl), /REMOTE_READ_BOUND/);
  assert.equal(requestSignal.aborted, true);
  let requestCount = 0;
  const perRequest = createReadOnlySavedWeatherClients({ ...credentials, clock: () => now,
    fetchImpl: async () => { requestCount++; now += 60_000; return Response.json([]); } });
  await assert.rejects(perRequest.guardedFetch(pointerUrl), /REMOTE_READ_BOUND/);
  await assert.rejects(perRequest.guardedFetch(pointerUrl), /REMOTE_READ_BOUND/);
  assert.equal(requestCount, 1, 'unused five-minute budget never permits a >60-second request or overlap after timeout');
});

test('failed fetch and failed body consumption are charged and cannot leak transport diagnostics', async () => {
  let now = 0, attempts = 0;
  const client = createReadOnlySavedWeatherClients({ ...credentials, maximumMilliseconds: 10, clock: () => now,
    fetchImpl: async () => {
      attempts++;
      if (attempts === 1) { now += 3; throw new Error('secret-error-canary'); }
      if (attempts === 2) {
        return new Response(new ReadableStream({ pull(controller) {
          now += 4; controller.error(new Error('secret-error-canary'));
        } }, { highWaterMark: 0 }));
      }
      now += 3; return Response.json([]);
    } });
  for (let i = 0; i < 2; i++) await assert.rejects(client.guardedFetch(pointerUrl), error =>
    error.message === 'REMOTE_READ_FAILED' && error.auditCode === 'REMOTE_READ_FAILED');
  now += 900_000;
  await assert.rejects(client.guardedFetch(pointerUrl), /REMOTE_READ_BOUND/);
  assert.equal(attempts, 3, 'failed transport/body time remains debited before the next read');
});

test('simultaneous reads are rejected without transport or spending another request allowance', async () => {
  let release, requests = 0;
  const wait = new Promise(resolve => { release = resolve; });
  const client = createReadOnlySavedWeatherClients({ ...credentials, maximumRequests: 2,
    fetchImpl: async () => { if (++requests === 1) await wait; return Response.json([]); } });
  const first = client.guardedFetch(pointerUrl);
  await assert.rejects(client.guardedFetch(pointerUrl), /REMOTE_READ_CONCURRENT/);
  assert.equal(requests, 1);
  release(); await first;
  await client.guardedFetch(pointerUrl);
  assert.equal(requests, 2);
  await assert.rejects(client.guardedFetch(pointerUrl), /REMOTE_READ_BOUND/);
});

test('real timers bound non-cooperative fetch/body promises and cancel late responses', async () => {
  let deliver, signal, cancelled = 0, calls = 0;
  const client = createReadOnlySavedWeatherClients({ ...credentials, maximumMilliseconds: 15,
    fetchImpl: async (_url, options) => {
      calls++; signal = options.signal;
      return new Promise(resolve => { deliver = resolve; });
    } });
  await assert.rejects(client.guardedFetch(pointerUrl), /REMOTE_READ_BOUND/);
  assert.equal(signal.aborted, true);
  deliver(new Response(new ReadableStream({ cancel() { cancelled++; } })));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(cancelled, 1);
  await assert.rejects(client.guardedFetch(pointerUrl), /REMOTE_READ_BOUND/);
  assert.equal(calls, 1);
  let bodyCancelled = false;
  const bodyClient = createReadOnlySavedWeatherClients({ ...credentials, maximumMilliseconds: 15,
    fetchImpl: async () => new Response(new ReadableStream({
      pull() { return new Promise(() => {}); },
      cancel() { bodyCancelled = true; return new Promise(() => {}); },
    }, { highWaterMark: 0 })) });
  await assert.rejects(bodyClient.guardedFetch(pointerUrl), /REMOTE_READ_BOUND/);
  assert.equal(bodyCancelled, true, 'even a stalled cancellation cannot hold the caller beyond its deadline');
});

test('successful requests clear their timers instead of aborting while offline work continues', async () => {
  let signal;
  const client = createReadOnlySavedWeatherClients({ ...credentials, maximumMilliseconds: 30,
    fetchImpl: async (_url, options) => { signal = options.signal; return Response.json([]); } });
  await client.guardedFetch(pointerUrl);
  await new Promise(resolve => setTimeout(resolve, 45));
  assert.equal(signal.aborted, false);
  await client.guardedFetch(pointerUrl);
});

test('offline subprocess scope removes secrets and restores them even after failure', async () => {
  const keys = ['RAVRADAR_R2_SECRET_ACCESS_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'WEATHER_PROGRESS_MASTER_SECRET',
    'DMI_API_KEY', 'COPERNICUSMARINE_SERVICE_USERNAME', 'GH_TOKEN', 'SYNTHETIC_PASSWORD'];
  const original = keys.map(key => process.env[key]);
  try {
    for (const key of keys) process.env[key] = 'secret-error-canary';
    await assert.rejects(withoutSavedAuditSecrets(async () => {
      for (const key of keys) assert.equal(process.env[key], undefined);
      assert.ok(process.env.PATH || process.env.Path);
      throw new Error('fixed synthetic failure');
    }), /fixed synthetic failure/);
    for (const key of keys) assert.equal(process.env[key], 'secret-error-canary');
  } finally { keys.forEach((key, i) => { if (original[i] === undefined) delete process.env[key]; else process.env[key] = original[i]; }); }
});

async function fixture(t, { corrupt = false, changedAt = Infinity, wrongContracts = false,
  wrongBaseline = false, cipherTamper = false, forecastAbsent = false,
  nativeProofs = false, baselinePackTamper = false } = {}) {
  const folder = await temp(t);
  const source = path.join(folder, 'source'), privateRoot = path.join(folder, 'private'),
    buildRoot = path.join(folder, 'build'), predecessorRoot = path.join(folder, 'old-reader'), progressRoot = path.join(folder, 'progress');
  for (const dir of [source, privateRoot, buildRoot, predecessorRoot, progressRoot]) await fs.mkdir(dir);
  const conditions = { datasetId: 'rr-synthetic-input', productionReferenceAt: '2026-09-29T16:00:00.000Z', generatedAt: '2026-09-29T17:56:36.000Z',
    weatherEngine: { componentFallback: { before: { wind: { required: 10, valid: 3, missing: 7 } },
      openMeteo: { requests: 7, deferred: 2, privateError: 'secret-error-canary' },
      copernicus: { status: 'SECRET_ERROR_CANARY', transportFailure: 'secret-error-canary' },
      arbitraryPrivatePayload: { currentUMps: 52, password: 'secret-error-canary' } } },
    zones: Object.fromEntries(Array.from({ length: 210 }, (_, i) => [`zone-${i}`, {}])),
    coastalParts: { modelBinding: ravScoreModelBinding(), parts: Object.fromEntries(Array.from({ length: 673 }, (_, i) =>
      [`part-${i}`, { zoneId: `zone-${i % 210}`, waterPoint: [8, 55], landPoint: [8, 55.01], onshoreDirectionDeg: 0 }])) } };
  const contractHashes = Object.fromEntries(['continuationStateContractSha256', 'fullRuntimeContractSha256', 'publicProjectionContractSha256'].map(key => [key, 'b'.repeat(64)]));
  const files = [];
  for (const descriptor of PRIVATE_RUNTIME_BASE_FILES) {
    const value = descriptor.id === 'full-conditions' ? conditions
      : ['dmi-forecast-cache', 'dmi-bulk-cache'].includes(descriptor.id) ? { zones: {} } : {};
    await write(source, descriptor.relativePath, value);
    files.push({ ...descriptor, sourcePath: path.join(source, descriptor.relativePath), privacyClass: 'PRIVATE_PRODUCTION_RUNTIME' });
  }
  let nativeData;
  if (nativeProofs) {
    const parts = Object.entries(conditions.coastalParts.parts).map(([partId, part]) => ({ partId, ...part }));
    nativeData = nativeFixture(parts[0], conditions.productionReferenceAt);
    await saveContinuity(source, 'data/live/dmi-forecast-cache.json', parts, nativeData.hourly, nativeData.reference);
    await saveContinuity(progressRoot, 'data/live/dmi-forecast-cache.json', parts, nativeData.hourly, nativeData.reference);
    await write(source, 'data/live/dmi-bulk-cache.json', nativeData.donor([]));
    await write(source, PRIVATE_WEATHER_COMPONENT_FILES.dmiActive, nativeData.donor(nativeData.native.slice(0, 1)));
    await write(source, PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate, nativeData.donor(nativeData.native));
    const ledger = '{"synthetic":"private selection ledger"}';
    await write(source, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents, ledger);
    conditions.weatherComponentInputs = { schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS',
      sourceSelectionApplied: true, openMeteoBankSha256: null, copernicusBankSha256: null,
      selectedComponentsSha256: crypto.createHash('sha256').update(ledger).digest('hex') };
    await write(source, 'data/live/conditions.json', conditions);
    const descriptor = await buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions });
    files.push({ ...descriptor, privacyClass: 'PRIVATE_PRODUCTION_RUNTIME' });
    if (baselinePackTamper) {
      // The outer archive below authenticates these bytes. The inner pack's
      // own selected-input hashes must still reject the damaged payload.
      const bytes = await fs.readFile(descriptor.sourcePath); bytes[bytes.length - 1] ^= 1;
      await fs.writeFile(descriptor.sourcePath, bytes);
    }
  }
  const bundlePath = path.join(buildRoot, 'bundle');
  await createPrivateProductionRuntimeBundle({ privateRoot: buildRoot, bundlePath, repositoryRoot: source, files,
    metadata: { datasetId: conditions.datasetId, productionReferenceAt: conditions.productionReferenceAt, generatedAt: conditions.generatedAt,
      generationId: 'synthetic-input-audit', zoneCount: 210, partCount: 673, modelBinding: ravScoreModelBinding(), contractHashes, privacyClass: 'PRIVATE_PRODUCTION_RUNTIME' } });
  const built = await buildProtectedPrivateRuntimeArchive({ privateRoot: buildRoot, bundlePath, repositoryRoot: source, sourceHead: 'c'.repeat(40) });
  await write(predecessorRoot, 'package.json', { type: 'module' });
  await write(predecessorRoot, 'scripts/protected-private-production-runtime.mjs', `export * from ${JSON.stringify(pathToFileURL(path.join(repositoryRoot, 'scripts/protected-private-production-runtime.mjs')).href)};`);
  await write(predecessorRoot, 'scripts/private-production-runtime-workflow.mjs', `export const privateRuntimeContractHashes = async () => (${JSON.stringify(wrongContracts ? { ...contractHashes, fullRuntimeContractSha256: 'd'.repeat(64) } : contractHashes)});`);
  await write(predecessorRoot, 'js/core/ravscore-model-contract.js', `export const ravScoreModelBinding = () => (${JSON.stringify(ravScoreModelBinding())});`);
  await write(progressRoot, 'data/live/conditions.json', conditions);
  await write(progressRoot, '.cache/dmi-active-complete.json', nativeProofs ? nativeData.donor(nativeData.native.slice(1))
    : { zones: {}, weatherEngine: { componentFallback: { openMeteo: { requests: 999 } } } });
  if (nativeProofs) {
    await write(progressRoot, PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate, nativeData.donor(nativeData.native));
    await fs.copyFile(path.join(source, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents),
      path.join(progressRoot, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents));
  } else if (!forecastAbsent) await write(progressRoot, 'data/live/dmi-forecast-cache.json', { zones: {} });
  const basePath = path.join(progressRoot, 'base.json');
  const captured = await weatherComponentProgressCache({ mode: 'capture-base', repositoryRoot: progressRoot, repository,
    basePath, protectedBundleSha256: wrongBaseline ? 'f'.repeat(64) : built.descriptor.bundleContentSha256 });
  assert.equal(captured.captured, true);
  const saved = await weatherComponentProgressCache({ mode: 'save', repositoryRoot: progressRoot, repository, basePath, encryptionKey });
  assert.equal(saved.saved, true, JSON.stringify(saved));
  const progressFile = path.join(privateRoot, 'progress.encrypted');
  await fs.copyFile(path.join(progressRoot, WEATHER_PROGRESS_CIPHER_PATH), progressFile);
  if (cipherTamper) { const bytes = await fs.readFile(progressFile); bytes[bytes.length - 1] ^= 1; await fs.writeFile(progressFile, bytes); }
  const calls = []; let pointerReads = 0;
  const fetchImpl = async (url, options) => {
    const target = new URL(url); calls.push({ method: options.method, path: target.pathname });
    assert.ok(['GET', 'HEAD'].includes(options.method)); assert.equal(options.redirect, 'error');
    if (target.pathname === '/rest/v1/admin_documents') {
      const current = structuredClone(built.descriptor);
      if (++pointerReads >= changedAt) current.sourceHead = 'e'.repeat(40);
      return Response.json([{ document_key: policy.documentKey, version: 1, payload: { schemaVersion: policy.schemaVersion, kind: policy.pointerKind, current, previous: null } }]);
    }
    if (target.pathname === `/${policy.bucketId}` && options.method === 'HEAD') return new Response(null, { status: 200 });
    const item = built.objects.find(entry => target.pathname === `/${policy.bucketId}/${entry.descriptor.objectPath}`);
    assert.ok(item, 'only exact current R2 objects may be read');
    const bytes = Buffer.from(item.bytes); if (corrupt) bytes[0] ^= 1;
    return new Response(bytes);
  };
  const descriptorPath = path.join(privateRoot, 'source.json');
  const described = await auditSavedWeatherInputs({ mode: 'describe', privateRoot, descriptorPath,
    outputPath: path.join(privateRoot, 'describe.json'), ...credentials, fetchImpl });
  assert.equal(described.status, 'SOURCE_DESCRIBED', JSON.stringify(described));
  return { options: { mode: 'audit', privateRoot, descriptorPath, predecessorRoot, progressFile, progressSource,
    progressCacheKey, repository, encryptionKey, outputPath: path.join(privateRoot, 'audit.json'), ...credentials, fetchImpl },
  calls, folder, source, privateRoot, built, saved, conditions };
}

test('real synthetic archive + exact progress are authenticated and measured, not merged or built', async t => {
  const fixtureData = await fixture(t);
  const { options, calls, privateRoot, built, saved, source, conditions } = fixtureData;
  const report = await auditSavedWeatherInputs(options);
  assert.equal(report.status, 'AUDIT_COMPLETED', JSON.stringify(report));
  assert.equal(report.protectedGenerationReadbackVerified, true);
  assert.equal(report.exactArchivedSourceContractsVerified, true);
  assert.equal(report.exactProgressAuthenticated, true);
  assert.equal(report.semanticUnionPerformed, false); assert.equal(report.cacheBuilt, false);
  assert.equal(report.futureContextPersistenceProved, false); assert.equal(report.publicDeploymentProved, false);
  for (const key of ['objectBytes', 'objectCount', 'largestObjectBytes', 'envelopeBytes', 'rawPayloadBytes']) {
    assert.equal(report.capacity.protected[key], built.archiveMetrics[key], key);
  }
  assert.equal(report.capacity.progress.encryptedBytes, saved.encryptedBytes);
  assert.equal(report.capacity.protected.files.fileCount, 9);
  assert.equal(report.forecasts.baseline.status, 'PRESENT'); assert.equal(report.forecasts.progress.status, 'PRESENT');
  assert.equal(report.originalContext.registeredParts, 673);
  assert.equal(report.originalContext.baseline.status, 'NOT_PRESENT');
  assert.equal(report.nativeProofAvailability.baseline.status, 'NOT_PRESENT');
  assert.equal(report.nativeProofAvailability.baseline.donorProofs.baselineActive.status, 'NOT_PRESENT');
  assert.equal(report.nativeProofAvailability.artifactGatePassed, false);
  assert.equal(report.protectedBaselineComponentFallback.openMeteo.requests, 7,
    'the authenticated protected conditions summary is not replaced by a progress-file value');
  assert.equal(report.protectedBaselineComponentFallback.before.wind.valid, 3);
  assert.equal(report.protectedBaselineComponentFallback.copernicus.status, null);
  assert.equal(report.protectedBaselineComponentFallback.copernicus.transportFailure, null);
  assert.equal(Object.hasOwn(report.protectedBaselineComponentFallback, 'arbitraryPrivatePayload'), false);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(source, 'data/live/conditions.json'))), conditions);
  assert.deepEqual((await fs.readdir(privateRoot)).sort(), ['audit.json', 'describe.json', 'progress.encrypted', 'source.json']);
  assert.ok(calls.every(call => ['GET', 'HEAD'].includes(call.method)));
  safeReport(report, privateRoot);
});

test('authenticated baseline component pack and exact progress expose all five native donors without installing them', async t => {
  const { options, privateRoot, source } = await fixture(t, { nativeProofs: true });
  const report = await auditSavedWeatherInputs(options);
  assert.equal(report.status, 'AUDIT_COMPLETED', JSON.stringify(report));
  const native = report.nativeProofAvailability;
  assert.equal(native.geometryScope, 'AUTHENTICATED_BASELINE_PARTS_ONLY');
  assert.equal(native.selectionScope, 'PERSISTED_PART_CURRENT_CONTINUITY');
  assert.equal(native.registeredParts, 673);
  assert.equal(native.crossDonorCombinationChecked, false);
  assert.equal(native.nativeRowsSynthesized, false);
  assert.equal(native.artifactGatePassed, false);
  for (const snapshot of ['baseline', 'progress']) {
    assert.equal(report.originalContext[snapshot].counts.baselineContextAccepted, 5);
    assert.equal(native[snapshot].counts.finiteDmiCurrentSelections, 5);
    assert.equal(native[snapshot].counts.completeProofInAtLeastOneDonor, 5);
    assert.equal(native[snapshot].counts.completeProofInBaselineDonor, 5);
    assert.equal(native[snapshot].counts.completeProofInProgressDonor, 5);
    assert.equal(native[snapshot].counts.notProvedInAnyDonor, 0);
    const counts = Object.fromEntries(Object.entries(native[snapshot].donorProofs)
      .map(([name, proof]) => [name, proof.completeProofPairs]));
    assert.deepEqual(counts, { baselineBulk: 0, baselineActive: 1, baselineCandidate: 5,
      progressActive: 2, progressCandidate: 5 });
    assert.equal(native[snapshot].donorProofs.baselineBulk.rejections.missingEndpoint, 5,
      'an intact original header cannot stand in for absent authentic U/V endpoints');
  }
  assert.equal(report.futureContextPersistenceProved, false);
  assert.equal(report.semanticUnionPerformed, false);
  assert.equal(report.capacity.protected.files.fileCount, 10);
  assert.deepEqual((await fs.readdir(privateRoot)).sort(), ['audit.json', 'describe.json', 'progress.encrypted', 'source.json']);
  await assert.rejects(fs.access(path.join(source, 'baseline-components')));
  safeReport(report, privateRoot);
});

test('outer archive authentication cannot excuse a corrupt inner baseline component pack', async t => {
  const { options, privateRoot } = await fixture(t, { nativeProofs: true, baselinePackTamper: true });
  const report = await auditSavedWeatherInputs(options);
  assert.equal(report.status, 'AUDIT_FAILED_CLOSED');
  assert.equal(report.code, 'BASELINE_COMPONENT_PACK_REJECTED', JSON.stringify(report));
  assert.equal(report.exactProgressAuthenticated, false);
  assert.equal((await fs.readdir(privateRoot)).some(name => name.startsWith('saved-input-audit-')), false);
  safeReport(report, privateRoot);
});

test('single-donor native availability distinguishes header-only, split endpoints, changed tuple and geometry', async t => {
  const folder = await temp(t);
  const part = { partId: 'coastal-part-sensitive', zoneId: 'zone-sensitive', waterPoint: [8, 55] };
  const fixtureData = nativeFixture(part), parts = new Map([[part.partId, part]]);
  const index = await saveContinuity(folder, 'forecast.json', [part], fixtureData.hourly, fixtureData.reference);
  const donorFiles = {};
  for (const [label, rows] of [['baselineBulk', []], ['baselineActive', fixtureData.native.slice(0, 1)],
    ['progressActive', fixtureData.native.slice(1)]]) {
    await write(folder, `${label}.json`, fixtureData.donor(rows));
    donorFiles[label] = path.join(folder, `${label}.json`);
  }
  const savedSource = structuredClone(fixtureData.hourly[1].sources.current);
  const report = await measureSavedNativeProofAvailability({ baselineIndex: index, progressIndex: index, parts, donorFiles });
  for (const snapshot of ['baseline', 'progress']) {
    assert.equal(report[snapshot].counts.finiteDmiCurrentSelections, 5);
    assert.equal(report[snapshot].counts.completeProofInAtLeastOneDonor, 3,
      'endpoints split between two donors do not prove an interpolated selection in either single donor');
    assert.equal(report[snapshot].counts.baselineOnlyCompleteProof, 1);
    assert.equal(report[snapshot].counts.progressOnlyCompleteProof, 2);
    assert.equal(report[snapshot].counts.notProvedInAnyDonor, 2);
  }
  assert.equal(report.crossDonorCombinationChecked, false);
  assert.deepEqual(fixtureData.hourly[1].sources.current, savedSource);
  const changedTuple = structuredClone(fixtureData.native);
  changedTuple[0]['current-u'] += 0.1;
  await write(folder, 'changed-tuple.json', fixtureData.donor(changedTuple));
  const changed = await measureSavedNativeProofAvailability({ baselineIndex: index, parts,
    donorFiles: { baselineBulk: path.join(folder, 'changed-tuple.json') } });
  assert.equal(changed.baseline.counts.completeProofInAtLeastOneDonor, 2);
  assert.equal(changed.baseline.donorProofs.baselineBulk.rejections.projectionMismatch, 3);
  const moved = await measureSavedNativeProofAvailability({ baselineIndex: index,
    parts: new Map([[part.partId, { ...part, waterPoint: [8.1, 55] }]]), donorFiles });
  assert.equal(moved.baseline.counts.geometryMismatchEntries, 1);
  assert.equal(moved.baseline.counts.finiteDmiCurrentSelections, 0);
  assert.equal(moved.baseline.counts.completeProofInAtLeastOneDonor, 0);
  const absent = await measureSavedNativeProofAvailability({ baselineIndex: index, parts, donorFiles: {} });
  assert.equal(absent.baseline.counts.finiteDmiCurrentSelections, 5);
  assert.equal(absent.baseline.counts.notProvedInAnyDonor, 5);
  assert.ok(Object.values(absent.baseline.donorProofs).every(donor => donor.status === 'NOT_PRESENT'));
  await assert.rejects(measureSavedNativeProofAvailability({ parts, donorFiles: { 'secret-error-canary': '/private/path' } }), /NATIVE_PROOF_INSPECTION_FAILED/);
  await assert.rejects(measureSavedNativeProofAvailability({ parts: new Map(), donorFiles: {} }), /NATIVE_PROOF_INSPECTION_FAILED/);
  for (const value of [report, changed, moved, absent]) safeReport(value, folder);
});

for (const [name, mutation, code] of [
  ['tampered archive', { corrupt: true }, 'PROTECTED_RESTORE_REJECTED'],
  ['changed pointer before restore', { changedAt: 2 }, 'CURRENT_GENERATION_CHANGED'],
  ['changed pointer after inspection', { changedAt: 5 }, 'CURRENT_GENERATION_CHANGED'],
  ['wrong original producer contract', { wrongContracts: true }, 'PREDECESSOR_CONTRACT_MISMATCH'],
  ['wrong progress baseline', { wrongBaseline: true }, 'PROGRESS_AUTHENTICATION_REJECTED'],
  ['tampered progress', { cipherTamper: true }, 'PROGRESS_AUTHENTICATION_REJECTED'],
]) test(`${name} fails closed with no payload and removes private working files`, async t => {
  const { options, privateRoot } = await fixture(t, mutation);
  const report = await auditSavedWeatherInputs(options);
  assert.equal(report.status, 'AUDIT_FAILED_CLOSED'); assert.equal(report.code, code, JSON.stringify(report));
  assert.equal(report.exactProgressAuthenticated, false);
  assert.equal((await fs.readdir(privateRoot)).some(name => name.startsWith('saved-input-audit-')), false);
  safeReport(report, privateRoot);
});

test('legacy progress without optional forecast is explicit NOT_PRESENT, not semantic completeness', async t => {
  const { options } = await fixture(t, { forecastAbsent: true });
  const report = await auditSavedWeatherInputs(options);
  assert.equal(report.status, 'AUDIT_COMPLETED', JSON.stringify(report));
  assert.equal(report.forecasts.progress.status, 'NOT_PRESENT');
  assert.equal(report.originalContext.progress.status, 'NOT_PRESENT');
  assert.equal(report.semanticUnionPerformed, false);
});

test('private working-directory cleanup failure cannot publish an AUDIT_COMPLETED report', async t => {
  const { options, privateRoot } = await fixture(t);
  const realRemove = fs.rm;
  let failed = false;
  try {
    fs.rm = async (file, ...args) => {
      if (!failed && path.basename(String(file)).startsWith('saved-input-audit-')) {
        failed = true;
        throw new Error('secret-error-canary: private cleanup path');
      }
      return realRemove(file, ...args);
    };
    const report = await auditSavedWeatherInputs(options);
    assert.equal(report.status, 'AUDIT_FAILED_CLOSED');
    assert.equal(report.code, 'PRIVATE_TEMP_CLEANUP_FAILED');
    safeReport(report, privateRoot);
    assert.equal((await fs.readdir(privateRoot)).some(name => name.startsWith('saved-input-audit-')), false,
      'failure cleanup is retried without reporting success');
    const saved = JSON.parse(await fs.readFile(options.outputPath, 'utf8'));
    assert.equal(saved.status, 'AUDIT_FAILED_CLOSED');
  } finally { fs.rm = realRemove; }
});

test('wrong exact cache key, outside cipher and symlinked paths fail closed', async t => {
  const { options, folder, privateRoot } = await fixture(t);
  const wrong = await auditSavedWeatherInputs({ ...options, progressCacheKey: `${progressCacheKey}-other` });
  assert.equal(wrong.code, 'PROGRESS_IDENTITY_INVALID');
  const outside = await auditSavedWeatherInputs({ ...options, outputPath: path.join(privateRoot, 'outside-report.json'), progressFile: path.join(folder, 'outside.encrypted') });
  assert.equal(outside.code, 'PRIVATE_PATH_INVALID');
  const linked = path.join(folder, 'linked-private');
  await fs.symlink(privateRoot, linked, process.platform === 'win32' ? 'junction' : 'dir');
  const report = await auditSavedWeatherInputs({ ...options, privateRoot: linked, outputPath: path.join(linked, 'linked-report.json') });
  assert.equal(report.code, 'PRIVATE_ROOT_INVALID'); safeReport(report, privateRoot);
  const linkedChild = path.join(privateRoot, 'linked-child');
  await fs.symlink(folder, linkedChild, process.platform === 'win32' ? 'junction' : 'dir');
  const child = await auditSavedWeatherInputs({ ...options, outputPath: path.join(linkedChild, 'must-not-write.json') });
  assert.equal(child.code, 'PRIVATE_PATH_INVALID');
  await assert.rejects(fs.access(path.join(folder, 'must-not-write.json')));
});

test('saved original-current-context availability detects loss at the prospective active-context boundary', async t => {
  const folder = await temp(t);
  const part = { partId: 'coastal-part-sensitive', zoneId: 'zone-sensitive', waterPoint: [8, 55], onshoreDirectionDeg: 90 };
  const identity = dmiExpectedIdentityForPart(part);
  const epoch = Date.parse('2026-09-29T16:00:00.000Z'), at = n => new Date(epoch + n * 3_600_000).toISOString();
  const vectorSelection = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
  const step = { itemId: 'synthetic-private-item', assetIdentitySha256: 'a'.repeat(64), nativeValidTime: at(0), leadTimeHours: 12, acquiredAt: at(-1), itemUpdatedAt: at(-11), optionalFieldSet: [] };
  const source = { provider: 'dmi', fallback: false, collection: 'dkss_idw', collectionFamily: 'marine',
    componentKind: 'ocean-current-vector', fieldSet: ['current-u', 'current-v'],
    spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation', vectorSemanticsVersion: 3,
    vectorSelection, verticalLayer: 'depth:1', verticalLayerRankM: 1, ...identity, component: 'current',
    modelRun: at(-12), ...step, samplingPoint: [...part.waterPoint], gridPoint: [...part.waterPoint],
    gridDefinitionSha256: 'b'.repeat(64), distanceKm: 0, spatialSemanticsVersion: 1,
    temporalResolution: 'native', nativeValidTimes: [at(0)], nativeSteps: [step] };
  const hourly = Array.from({ length: DMI_FORECAST_HOURS }, (_, i) => ({ time: at(i),
    currentUMps: i ? null : 0.1, currentVMps: i ? null : 0.2, sources: i ? {} : { current: source } }));
  const records = new Map([[part.partId, { zoneId: identity.entityId, point: part.waterPoint, hourly }]]);
  const continuity = await packDmiPartContinuity(records, [part], at(0));
  const forecastFile = path.join(folder, 'forecast.json');
  await write(folder, 'forecast.json', { zones: {}, partContinuity: continuity });
  const index = await inspectDmiForecastFile(forecastFile);
  const parts = new Map([[part.partId, part]]);
  const baseline = { currentVectorSemanticsVersion: 3, currentVectorSelection: vectorSelection,
    currentMaxDistanceKm: 5, zones: { [identity.entityId]: { ...identity } } };
  const counts = await measureSavedCurrentContexts(index, parts, baseline, { ...baseline, zones: {} });
  assert.equal(counts.counts.finiteCurrentPairs, 1);
  assert.equal(counts.counts.baselineContextAccepted, 1);
  assert.equal(counts.counts.progressContextAccepted, 0);
  assert.equal(counts.counts.baselineOnly, 1);
  assert.equal(counts.counts.noSavedContext, 0);
  const neither = await measureSavedCurrentContexts(index, parts, null, { ...baseline, zones: {} });
  assert.equal(neither.counts.noSavedContext, 1);
  const moved = await measureSavedCurrentContexts(index, new Map([[part.partId, { ...part, waterPoint: [8.1, 55] }]]), baseline, baseline);
  assert.equal(moved.counts.geometryMismatchEntries, 1);
  assert.equal(moved.counts.finiteCurrentPairs, 0);
  safeReport(counts, folder);
  const changedSource = { ...baseline, currentVectorSelection: 'secret-error-canary' };
  const changed = await measureSavedCurrentContexts(index, parts, changedSource, null);
  assert.equal(changed.counts.noSavedContext, 1, 'an arbitrary header cannot replace the original context');
  for (const damaged of [
    { ...continuity, rawBytes: 3 * 1024 * 1024 * 1024 },
    { ...continuity, compressedBytes: 200 * 1024 * 1024 },
    { ...continuity, entries: [{ ...continuity.entries[0], rawSha256: 'f'.repeat(64) }] },
    { ...continuity, entries: [{ ...continuity.entries[0], compressedSha256: 'f'.repeat(64) }] },
    { ...continuity, productionReferenceAt: at(1) },
  ]) {
    await write(folder, 'damaged.json', { zones: {}, partContinuity: damaged });
    const invalid = await inspectDmiForecastFile(path.join(folder, 'damaged.json'));
    await assert.rejects(measureSavedCurrentContexts(invalid, parts, baseline, baseline), /CONTINUITY_INSPECTION_FAILED/);
  }
});

test('audit source has no production entrypoint or publication calls', async () => {
  const source = await fs.readFile(new URL('./audit-saved-weather-inputs.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /import\s*\(?\s*['"][^'"]*update-weather/);
  assert.doesNotMatch(source, /mode:\s*['"](?:save|restore)['"]/);
  assert.doesNotMatch(source, /buildRavScoreProductionPartSeries|mergeVerifiedProtectedProgressComponents|\.uploadImmutable\(/);
});

test('sealed diagnosis pins the exact artifact, original attempt, repository, digest and expiry', () => {
  const artifact = { id: sealedTarget.artifactId, name: sealedTarget.artifactName,
    digest: sealedTarget.artifactDigest, size_in_bytes: sealedTarget.artifactBytes,
    expired: false, expires_at: '2026-10-04T18:34:41Z', workflow_run: {
      id: sealedTarget.runId, head_sha: sealedTarget.sourceHead, head_branch: 'main',
      repository_id: sealedTarget.repositoryId, head_repository_id: sealedTarget.repositoryId } };
  const run = { id: sealedTarget.runId, run_attempt: 1, head_sha: sealedTarget.sourceHead,
    status: 'completed', conclusion: 'success', head_branch: 'main', event: 'workflow_dispatch',
    path: '.github/workflows/run-current-weather-once.yml',
    repository: { full_name: sealedTarget.repository }, head_repository: { full_name: sealedTarget.repository } };
  const now = '2026-10-03T20:00:00.000Z';
  assert.equal(validateSealedCurrentSourceTarget(artifact, run, now), true);
  for (const delta of [{ id: artifact.id + 1 }, { digest: 'sha256:' + '0'.repeat(64) },
    { expired: true }, { size_in_bytes: artifact.size_in_bytes + 1 },
    { workflow_run: { ...artifact.workflow_run, head_repository_id: 1 } }]) {
    assert.throws(() => validateSealedCurrentSourceTarget({ ...artifact, ...delta }, run, now), /TARGET_REJECTED/);
  }
  for (const delta of [{ run_attempt: 2 }, { head_sha: 'a'.repeat(40) }, { status: 'in_progress' },
    { head_repository: { full_name: 'untrusted/fork' } }]) {
    assert.throws(() => validateSealedCurrentSourceTarget(artifact, { ...run, ...delta }, now), /TARGET_REJECTED/);
  }
  assert.throws(() => validateSealedCurrentSourceTarget(artifact, run, '2026-10-04T18:34:41.000Z'), /TARGET_REJECTED/);
});

test('sealed current diagnosis reuses actual verifier/replay and publishes only bounded aggregates', () => {
  const reference = '2026-10-03T16:00:00.000Z', epoch = Date.parse(reference);
  const part = { partId: 'dk-b01-02-national-part-01', zoneId: 'DK-B01-02',
    waterPoint: [8.2713201, 56.827], onshoreDirectionDeg: 90 };
  const fixture = nativeFixture(part, reference); // Same existing native-source fixture.
  const evidence = Array.from({ length: 49 }, (_, i) => ({
    time: new Date(epoch + (i - 48) * 3_600_000).toISOString(), strength: 1 }));
  const replay = buildCurrentSupplyMemory(evidence, { referenceTime: reference });
  part.ravScoreModel = { currentState: { time: reference, currentReferenceAt: reference,
    currentEvidence: evidence, currentNativeHoldAuthorization: null, currentNativeHoldIntervalEnds: [],
    currentMemoryWindowHours: 48, currentMemoryReady: replay.memoryReady,
    currentMemoryStatus: replay.status, currentMemoryCoverageHours: replay.coverageHours,
    supplyPotential: replay.supplyPotential } };
  const native = evidence.map((item, i) => {
    const time = item.time.replace('.000Z', 'Z');
    return { time, 'current-u': 0.15, 'current-v': 0, sources: { current: {
      ...fixture.native[0].sources.current, collection: 'dkss_lf',
      gridPoint: [8.2713201, 56.827], distanceKm: 0,
      modelRun: new Date(epoch - 60 * 3_600_000).toISOString().replace('.000Z', 'Z'),
      itemUpdatedAt: new Date(epoch - 59 * 3_600_000).toISOString().replace('.000Z', 'Z'),
      nativeValidTime: time, leadTimeHours: i + 12,
    } } };
  });
  const bulk = fixture.donor(native);
  const before = JSON.stringify({ part, bulk });
  const measured = summarizeSealedCurrentPart(part, bulk);
  assert.equal(measured.replayedSupply, 100);
  assert.equal(measured.sourceCounts.LF_LAND_POINT, 49);
  assert.equal(measured.effectiveDeltaByMatchingSource.LF_LAND_POINT, 100);
  assert.equal(measured.directionCounts.inbound, 49);
  assert.match(measured.attribution, /NOT_CAUSAL_JOIN$/);
  assert.equal(measured.originalGribCellMask, 'NOT_IN_BASE_INVENTORY_NOT_MEASURED');
  assert.equal(JSON.stringify({ part, bulk }), before, 'inspection is byte-neutral in memory');
  safeReport(measured, 'secret-error-canary');
  assert.equal(JSON.stringify(measured).includes('8.2713201'), false);
  const zoneIds = [part.zoneId, ...Array.from({ length: 209 }, (_, i) => `SYNTHETIC-Z${i}`)];
  const nationalParts = Object.fromEntries(Array.from({ length: 673 }, (_, i) => [
    i === 0 ? part.partId : `synthetic-part-${i}`,
    { ...structuredClone(part), zoneId: zoneIds[i % 210] },
  ]));
  const nationalBefore = JSON.stringify(nationalParts);
  const national = summarizeSealedCurrentNationalParts(nationalParts, bulk, zoneIds);
  assert.equal(national.partCount, 673);
  assert.equal(national.zoneCount, 210);
  assert.equal(national.replayedPartCount, 673);
  assert.equal(national.readyPartCount, 673);
  assert.equal(national.allStatesReplayed, true);
  assert.equal(national.sourceCounts.LF_LAND_POINT, 49);
  assert.equal(national.sourceCounts.UNMATCHED, 672 * 49, 'missing matching bulk is not fabricated source attribution');
  assert.equal(national.byZone.length, 210);
  assert.equal(national.byZone.reduce((sum, zone) => sum + zone.parts, 0), 673);
  assert.match(national.pointClassification, /NOT_GLOBAL_LAND_MASK$/);
  assert.ok(Buffer.byteLength(JSON.stringify({ parts: [measured, measured, measured], national })) < 32 * 1024);
  safeReport(national, 'secret-error-canary');
  assert.equal(JSON.stringify(national).includes('8.2713201'), false);
  assert.equal(JSON.stringify(nationalParts), nationalBefore, 'all-part inspection leaves input unchanged');
  const absentState = structuredClone(nationalParts);
  delete absentState['synthetic-part-672'].ravScoreModel.currentState;
  const absent = summarizeSealedCurrentNationalParts(absentState, bulk, zoneIds);
  assert.equal(absent.stateAbsentPartCount, 1);
  assert.equal(absent.replayedPartCount, 672);
  assert.equal(absent.allStatesReplayed, false, 'absent state must not be reported as verified replay');
  assert.throws(() => summarizeSealedCurrentNationalParts(nationalParts, bulk, zoneIds.slice(1)), /NATIONAL_IDENTITY/);
  const wrongIdentity = structuredClone(nationalParts);
  wrongIdentity['synthetic-part-1'].zoneId = 'OUTSIDE-FIXED-ZONES';
  assert.throws(() => summarizeSealedCurrentNationalParts(wrongIdentity, bulk, zoneIds), /PART_IDENTITY/);
  const wrongState = structuredClone(nationalParts);
  wrongState['synthetic-part-1'].ravScoreModel.currentState.supplyPotential--;
  assert.throws(() => summarizeSealedCurrentNationalParts(wrongState, bulk, zoneIds), /STATE_REPLAY_MISMATCH/);
  const mismatched = structuredClone(bulk);
  Object.values(mismatched.zones)[0].hourly[native[0].time]['current-u'] = 0;
  const mixed = summarizeSealedCurrentPart(part, mismatched);
  assert.equal(mixed.sourceCounts.LF_LAND_POINT, 48);
  assert.equal(mixed.sourceCounts.UNMATCHED, 1);
  const noOriginalContext = summarizeSealedCurrentPart(part, { zones: bulk.zones });
  assert.equal(noOriginalContext.sourceCounts.UNMATCHED, 49);
  const bad = structuredClone(part);
  bad.ravScoreModel.currentState.supplyPotential--;
  assert.throws(() => summarizeSealedCurrentPart(bad, bulk), /STATE_REPLAY_MISMATCH/);
  const duplicate = structuredClone(bulk);
  Object.values(duplicate.zones)[0].hourly[reference] = native.at(-1);
  assert.throws(() => summarizeSealedCurrentPart(part, duplicate), /DUPLICATE_INPUT_TIME/);
});

test('sealed CLI failure never logs private path or exception payload', async t => {
  const directory = await temp(t);
  const reportPath = path.join(directory, 'safe.json');
  const outcome = spawnSync(process.execPath, ['scripts/audit-sealed-current-source.mjs', 'open',
    '--repository-root', repositoryRoot, '--input', path.join(directory, 'secret-error-canary-missing.bin'),
    '--report', reportPath], { cwd: repositoryRoot, encoding: 'utf8',
    env: { ...process.env, STAGED_PRIVATE_BUILD_MASTER_SECRET: 'sb_secret_synthetic-never-real' } });
  assert.equal(outcome.status, 1);
  assert.equal(outcome.stdout, '');
  assert.equal(outcome.stderr.trim(), 'SEALED_CURRENT_SOURCE_AUDIT_FAILED_CLOSED');
  const failure = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  assert.deepEqual(failure, { kind: 'SEALED_CURRENT_SOURCE_AUDIT', status: 'FAILED_CLOSED',
    failedMode: 'open', privatePayloadIncluded: false, rawVectorsIncluded: false, productionPointerUnchanged: true });
  safeReport(failure, directory);
});
