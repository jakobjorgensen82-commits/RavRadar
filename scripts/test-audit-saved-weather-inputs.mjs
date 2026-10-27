import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { auditSavedWeatherInputs, createReadOnlySavedWeatherClients,
  measureSavedCurrentContexts, measureSavedNativeProofAvailability, withoutSavedAuditSecrets,
  indexSavedRawManifest, measureSavedRawCaptureMatches, inspectSavedRawFileInventory,
  savedAuditProgressAuthenticationCode, CURRENT586_ENDPOINT_AUDIT,
  CURRENT586_CACHED_ORIGINAL_AUDIT } from './audit-saved-weather-inputs.mjs';
import { cachedCoherentOriginalFailureCode } from './lib/prove-cached-coherent-current-originals.mjs';
import { createPrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';
import { buildProtectedPrivateRuntimeArchive, PROTECTED_PRIVATE_RUNTIME_POLICY as policy } from './protected-private-production-runtime.mjs';
import { PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_FILES } from './lib/private-weather-component-inventory.mjs';
import { buildPrivateWeatherComponentPack } from './lib/private-weather-component-pack.mjs';
import { weatherComponentProgressCache, WEATHER_PROGRESS_CIPHER_PATH } from './weather-component-progress-cache.mjs';
import { inspectDmiForecastFile } from './lib/dmi-forecast-file.mjs';
import { packDmiPartContinuity } from './lib/dmi-part-continuity.mjs';
import { DMI_FORECAST_HOURS, buildDmiForecastHourly, inspectDmiNativeGridSampling, sameNativeIdentity } from './lib/dmi-forecast-store.mjs';
import { dmiExpectedIdentityForPart, dmiOriginalWireIdentityMatchesCentralIdentity } from './lib/ravscore-production-adapters.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { diagnoseCurrent586SelectedEndpoints, buildRavScoreRawCurrentRetention } from './plan-ravscore-current-history.mjs';
import { buildIntegratedPartScoreSeries } from './lib/ravscore-integrated-runtime.mjs';
import { discoverCommittedCoherentOriginalBootstrap } from './lib/coherent-current-original-bootstrap.mjs';
import { inverseCurrent586EndpointDiagnosticTestInput, CURRENT586_ENDPOINT_DIAGNOSTIC_TEST_REVIEW,
  inverseCurrent586IdentityRefinementTestInput, CURRENT586_IDENTITY_REFINEMENT_TEST_REVIEW,
  inverseCurrent586SharedProjectionExportTestInput, CURRENT586_SHARED_PROJECTION_EXPORT_TEST_REVIEW,
  inverseNationalCoherentWorkTestInput } from './lib/alternative-c-caller-test-input.mjs';
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
test('progress diagnostics expose only exact enumerated crypto and normal unpacker codes', () => {
  assert.equal(savedAuditProgressAuthenticationCode({ progressCode: 'BASELINE_MISMATCH', message: 'secret-error-canary' }), 'BASELINE_MISMATCH');
  for (const code of ['WEATHER_PACK_CP_INVENTORY_UNAVAILABLE', 'WEATHER_PACK_OM_BANK_HASH_INVALID',
    'WEATHER_PACK_REFERENCE_INVENTORY_MISMATCH', 'WEATHER_PACK_JSON_CLOSE_UNPROVED']) {
    assert.equal(savedAuditProgressAuthenticationCode(new Error(code)), code);
    assert.equal(savedAuditProgressAuthenticationCode(new Error(`${code}: secret-error-canary`)), 'UNCLASSIFIED');
  }
  for (const error of [null, undefined, new Error('secret-error-canary'),
    { progressCode: 'secret-error-canary', message: 'private path and diagnostic payload' }]) {
    assert.equal(savedAuditProgressAuthenticationCode(error), 'UNCLASSIFIED');
  }
});
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

function nativeFixture(part, reference = '2026-09-29T16:00:00.000Z', rawCaptures = false) {
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
    if (rawCaptures) Object.assign(source, { assetIdentitySha256: crypto.createHash('sha256')
      .update(`https://synthetic.invalid/native-${hour}.grib`).digest('hex'),
    contentLengthBytes: 1234, contentSha256: 'c'.repeat(64), assetSizeBytes: 1234, itemCreatedAt: at(-12) });
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
  nativeProofs = false, baselinePackTamper = false, packReaderBank = null, rawCaptures = false } = {}) {
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
    nativeData = nativeFixture(parts[0], conditions.productionReferenceAt, rawCaptures);
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
  if (packReaderBank) {
    assert.equal(nativeProofs, false, 'This own reader fixture does not impersonate native provenance.');
    const ledger = '{"synthetic":"reader-only component ledger"}';
    await write(source, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank, packReaderBank);
    await write(source, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents, ledger);
    conditions.weatherComponentInputs = { schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS',
      sourceSelectionApplied: true, openMeteoBankSha256: packReaderBank.bankSha256, copernicusBankSha256: null,
      selectedComponentsSha256: crypto.createHash('sha256').update(ledger).digest('hex') };
    await write(source, 'data/live/conditions.json', conditions);
    const descriptor = await buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions });
    files.push({ ...descriptor, privacyClass: 'PRIVATE_PRODUCTION_RUNTIME' });
    await write(progressRoot, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank, packReaderBank);
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
  for (const file of ['scripts/lib/coastal-point-staging-contract.mjs', 'scripts/lib/ravscore-sampling-context.mjs']) {
    await write(predecessorRoot, file, `export * from ${JSON.stringify(pathToFileURL(path.join(repositoryRoot, file)).href)};`);
  }
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
  calls, folder, source, progressRoot, privateRoot, built, saved, conditions, nativeData };
}

test('real synthetic archive + exact progress are authenticated and measured, not merged or built', async t => {
  const fixtureData = await fixture(t);
  const { options, calls, privateRoot, built, saved, source, conditions } = fixtureData;
  const report = await auditSavedWeatherInputs(options);
  assert.equal(report.status, 'AUDIT_COMPLETED', JSON.stringify(report));
  assert.equal(report.protectedGenerationReadbackVerified, true);
  assert.equal(report.exactArchivedSourceContractsVerified, true);
  assert.equal(report.exactProgressAuthenticated, true);
  assert.equal(report.normalProgressBaselineUsed, false, 'The default audit retains its original baseline.');
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

test('embedded sampling categories do not confuse genuine legacy original proof with corrected lookup proof', async t => {
  const folder = await temp(t);
  const part = { partId: 'coastal-part-sensitive', zoneId: 'zone-sensitive', waterPoint: [8, 55] };
  const parts = new Map([[part.partId, part]]);
  for (const variant of ['legacy-absent', 'legacy-null', 'coherent', 'contradictory', 'source-invalid']) {
    const f = nativeFixture(part);
    for (const native of f.native) {
      const source = native.sources.current;
      if (variant === 'legacy-null') source.nativeGridSampling = null;
      if (['coherent', 'source-invalid'].includes(variant)) source.nativeGridSampling = {
        contractId: 'dmi-native-grid-sampling-v1', elementIndex: 71,
        gridIndexIdentitySha256: 'd'.repeat(64), coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
        gridDefinitionSha256: source.gridDefinitionSha256, gridPoint: [...source.gridPoint],
        fieldSet: [...source.fieldSet], optionalFieldSet: [...source.optionalFieldSet],
      };
      if (variant === 'contradictory') source.nativeGridSampling = {};
    }
    const hourly = buildDmiForecastHourly({ ocean: f.native.map(row => ({ step: row.time,
      'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources })),
      generatedAt: f.reference, startAt: f.reference, hours: DMI_FORECAST_HOURS, sourceCadenceMinutes: 180 }).hourly;
    if (variant === 'source-invalid') hourly[0].sources.current.entityId += '-different';
    const donor = f.donor(f.native), before = JSON.stringify({ hourly, donor });
    const index = await saveContinuity(folder, variant + '-forecast.json', [part], hourly, f.reference);
    await write(folder, variant + '-donor.json', donor);
    // Synthetic diagnostic split only; the real default caller obtains this
    // time with the authenticated B producer's unchanged normal state parser.
    const bStateTimes = new Map([[part.partId, new Date(Date.parse(f.reference) + 3_600_000).toISOString()]]);
    const report = await measureSavedNativeProofAvailability({ baselineIndex: index, progressIndex: index, parts,
      donorFiles: { baselineBulk: path.join(folder, variant + '-donor.json') }, bStateTimes });
    for (const snapshot of ['baseline', 'progress']) {
      const summary = report[snapshot].embeddedGridSampling, all = summary.all;
      assert.equal(summary.sourceScope, 'PERSISTED_ROW_SOURCES_CURRENT_NOT_REPLAY_SELECTION');
      assert.equal(summary.boundaryScope, 'AUTHENTICATED_B_INTEGRATED_STATE_TIME_NOT_CENTRAL_S');
      assert.equal(summary.boundaryPartsKnown, 1); assert.equal(summary.boundaryPartsUnknown, 0);
      assert.equal(all.rows, 5); assert.equal(summary.atOrBeforeBState.rows, 2);
      assert.equal(summary.afterBState.rows, 3); assert.equal(summary.unknownBState.rows, 0);
      const expected = variant.startsWith('legacy') ? 'unknown'
        : variant === 'contradictory' ? 'contradictory' : 'coherent';
      assert.equal(all[expected], variant === 'source-invalid' ? 4 : 5);
      assert.equal(all.sourceInvalid, variant === 'source-invalid' ? 1 : 0);
      assert.equal(report[snapshot].counts.completeProofInAtLeastOneDonor, variant === 'source-invalid' ? 4 : 5,
        'normal old native proof is separate from embedded applicability status');
      if (variant.startsWith('legacy')) {
        const presence = variant === 'legacy-null' ? 'null' : 'absent';
        assert.equal(all.topReceipt[presence], 5); assert.equal(all.endpointReceipt[presence], 7);
        assert.equal(all.unknownNativeEndpoints, 7);
      }
      if (variant === 'coherent') {
        assert.equal(all.topReceipt.present, 5); assert.equal(all.endpointReceipt.present, 7);
        assert.equal(all.coherentNativeEndpoints, 7);
      }
    }
    assert.equal(JSON.stringify({ hourly, donor }), before, 'diagnosis changes no original or provenance');
    safeReport(report, folder);
    if (variant === 'legacy-absent') {
      const noBoundary = await measureSavedNativeProofAvailability({ baselineIndex: index, parts, donorFiles: {} });
      assert.equal(noBoundary.baseline.embeddedGridSampling.unknownBState.rows, 5);
      assert.equal(noBoundary.baseline.embeddedGridSampling.boundaryPartsKnown, 0);
    }
  }
  await assert.rejects(measureSavedNativeProofAvailability({ parts, donorFiles: {},
    bStateTimes: new Map([['unknown-private-part', 'secret-error-canary']]) }), /NATIVE_PROOF_INSPECTION_FAILED/);
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
  assert.equal(report.normalProgressBaselineUsed, false);
  if (mutation.wrongBaseline) assert.equal(report.progressAuthenticationCode, 'BASELINE_MISMATCH');
  if (mutation.cipherTamper) assert.equal(report.progressAuthenticationCode, 'SNAPSHOT_AUTHENTICATION_FAILED');
  assert.equal((await fs.readdir(privateRoot)).some(name => name.startsWith('saved-input-audit-')), false);
  safeReport(report, privateRoot);
});

test('explicit progress baseline target is canonical, newer and rejected before remote reads when invalid', async t => {
  const { options, calls, privateRoot, conditions } = await fixture(t);
  const originalCalls = calls.length;
  const reference = conditions.productionReferenceAt;
  for (const [i, value] of ['', 123, '2026-09-29T17:00:00Z', '2026-09-29T17:01:00.000Z',
    '2026-02-30T17:00:00.000Z', '2026-09-29T17:00:00.000+00:00', reference,
    '2026-09-29T15:00:00.000Z'].entries()) {
    const report = await auditSavedWeatherInputs({ ...options, progressBaselineTargetHour: value,
      outputPath: path.join(privateRoot, `invalid-target-${i}.json`) });
    assert.equal(report.status, 'AUDIT_FAILED_CLOSED');
    assert.equal(report.code, 'PROGRESS_BASELINE_TARGET_INVALID');
    assert.equal(report.normalProgressBaselineUsed, false);
    assert.equal(calls.length, originalCalls, 'Invalid target must be rejected before pointer/archive transport.');
    safeReport(report, privateRoot);
  }
  const described = await auditSavedWeatherInputs({ ...options, mode: 'describe',
    progressBaselineTargetHour: '2026-09-29T17:00:00.000Z',
    outputPath: path.join(privateRoot, 'describe-with-baseline.json') });
  assert.equal(described.code, 'MODE_INVALID');
  assert.equal(calls.length, originalCalls);
});

test('explicit normal baseline cannot borrow the original transition for another model family', async t => {
  const { options, privateRoot, source } = await fixture(t);
  const conditionsPath = path.join(source, 'data/live/conditions.json');
  const before = await fs.readFile(conditionsPath);
  const report = await auditSavedWeatherInputs({ ...options,
    progressBaselineTargetHour: '2026-09-29T17:00:00.000Z' });
  assert.equal(report.status, 'AUDIT_FAILED_CLOSED');
  assert.equal(report.code, 'PROGRESS_BASELINE_RECONSTRUCTION_REJECTED');
  assert.equal(report.normalProgressBaselineUsed, false);
  assert.deepEqual(await fs.readFile(conditionsPath), before);
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


function syntheticRawManifest(native) {
  return { schemaVersion: 2, assets: Object.fromEntries(native.map((row, i) => {
    const canonicalHref = `https://synthetic.invalid/native-${i * 3}.grib`;
    const source = row.sources.current;
    const name = crypto.createHash('sha256').update(canonicalHref).digest('hex').slice(0, 24) + '.grib';
    return [name, { ...source, validTime: source.nativeValidTime, canonicalHref }];
  })) };
}

async function rejectRawFileOpens(t, directory, inspect) {
  const root = await fs.realpath(directory);
  const originalOpen = fs.open, originalRead = fs.readFile;
  let attempts = 0;
  const guard = original => async (file, ...args) => {
    if (typeof file === 'string') {
      const relative = path.relative(root, path.resolve(file));
      if (relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
        && path.basename(file) !== 'asset-manifest.json') {
        attempts++;
        throw new Error('secret-error-canary: RAW file must never be opened');
      }
    }
    return original(file, ...args);
  };
  const hooks = [t.mock.method(fs, 'open', guard(originalOpen)), t.mock.method(fs, 'readFile', guard(originalRead))];
  try { return await inspect(); }
  finally {
    for (const hook of hooks.reverse()) hook.mock.restore();
    assert.equal(attempts, 0, 'Filename/size inspection must never open a RAW file.');
  }
}

test('RAW file inventory distinguishes manifested and unmanifested prefix candidates without opening bytes', async t => {
  const folder = await temp(t), raw = path.join(folder, '.cache/dmi-grib');
  await fs.mkdir(raw, { recursive: true });
  const part = { partId: 'coastal-part-sensitive', zoneId: 'zone-sensitive', waterPoint: [8, 55] };
  const f = nativeFixture(part, undefined, true), parts = new Map([[part.partId, part]]);
  const document = f.donor(f.native), manifest = syntheticRawManifest(f.native);
  const first = Object.keys(manifest.assets)[0], source = f.native[0].sources.current;
  const bytes = Buffer.alloc(source.contentLengthBytes, 31);
  await fs.writeFile(path.join(raw, first), bytes);
  await fs.writeFile(path.join(raw, `${source.assetIdentitySha256.slice(0, 24)}.grib.tmp`), bytes);
  await fs.writeFile(path.join(raw, 'asset-manifest.json'), JSON.stringify(manifest));
  const before = JSON.stringify({ document, manifest });
  await rejectRawFileOpens(t, raw, async () => {
    const inventory = await inspectSavedRawFileInventory(folder);
    assert.equal(inventory.status, 'MEASURED');
    assert.equal(inventory.fileCandidates, 1);
    assert.equal(inventory.otherRegularFiles, 2, 'A double suffix is not a normal cached_asset_path filename.');
    const index = indexSavedRawManifest(manifest);
    const measured = measureSavedRawCaptureMatches(document, parts, index, inventory);
    assert.deepEqual(measured.counts, measureSavedRawCaptureMatches(document, parts, index).counts);
    assert.deepEqual(measured.filePresence.manifestAssetIdentityPresent,
      { potentialFileCandidates: 1, missing: 1, ambiguous: 0, sizeMismatch: 0 });
    assert.deepEqual(measured.filePresence.unmanifestedFilenameCandidates,
      { potentialFileCandidates: 0, missing: 0, ambiguous: 0, sizeMismatch: 0 });
    const absent = structuredClone(manifest); delete absent.assets[first];
    const unmanifested = measureSavedRawCaptureMatches(document, parts, indexSavedRawManifest(absent), inventory);
    assert.equal(unmanifested.counts.assetIdentityAbsentRows, 1);
    assert.deepEqual(unmanifested.filePresence.unmanifestedFilenameCandidates,
      { potentialFileCandidates: 1, missing: 0, ambiguous: 0, sizeMismatch: 0 });
    const unavailable = measureSavedRawCaptureMatches(document, parts, indexSavedRawManifest(null), inventory);
    assert.deepEqual(unavailable.filePresence.manifestUnavailable,
      { potentialFileCandidates: 1, missing: 1, ambiguous: 0, sizeMismatch: 0 });
    assert.equal(unavailable.counts.unclassifiedRows, 2);
    for (const result of [measured, unmanifested, unavailable]) safeReport(result, folder);
  });
  assert.equal(JSON.stringify({ document, manifest }), before);
});

test('RAW inventory missing, collision and size mismatch remain metadata categories rather than admission', async t => {
  const folder = await temp(t), raw = path.join(folder, '.cache/dmi-grib');
  const part = { partId: 'coastal-part-sensitive', zoneId: 'zone-sensitive', waterPoint: [8, 55] };
  const f = nativeFixture(part, undefined, true), parts = new Map([[part.partId, part]]);
  const document = f.donor(f.native), index = indexSavedRawManifest(syntheticRawManifest(f.native));
  const missing = await inspectSavedRawFileInventory(folder);
  assert.equal(missing.status, 'MISSING');
  assert.deepEqual(measureSavedRawCaptureMatches(document, parts, index, missing).filePresence.manifestAssetIdentityPresent,
    { potentialFileCandidates: 0, missing: 2, ambiguous: 0, sizeMismatch: 0 });
  await fs.mkdir(raw, { recursive: true });
  const source = f.native[0].sources.current, prefix = source.assetIdentitySha256.slice(0, 24);
  await fs.writeFile(path.join(raw, `${prefix}.grib`), Buffer.alloc(source.contentLengthBytes - 1));
  await rejectRawFileOpens(t, raw, async () => {
    const measured = measureSavedRawCaptureMatches(document, parts, index, await inspectSavedRawFileInventory(folder));
    assert.deepEqual(measured.filePresence.manifestAssetIdentityPresent,
      { potentialFileCandidates: 0, missing: 1, ambiguous: 0, sizeMismatch: 1 });
    assert.equal(measured.counts.exactCaptureMatchRows, 2, 'Physical metadata cannot rewrite manifest-match counts.');
  });
  await fs.writeFile(path.join(raw, `${prefix}.bin`), Buffer.alloc(source.contentLengthBytes));
  await rejectRawFileOpens(t, raw, async () => {
    const measured = measureSavedRawCaptureMatches(document, parts, index, await inspectSavedRawFileInventory(folder));
    assert.deepEqual(measured.filePresence.manifestAssetIdentityPresent,
      { potentialFileCandidates: 0, missing: 1, ambiguous: 1, sizeMismatch: 0 },
    'Two suffix candidates remain ambiguous even when only one has the captured size.');
    safeReport(measured, folder);
  });
});

test('RAW file inventory fails closed on symlinks, nonregular entries and unknown lstat outcomes', async t => {
  const folder = await temp(t), raw = path.join(folder, '.cache/dmi-grib');
  await fs.mkdir(raw, { recursive: true });
  const target = path.join(folder, 'outside-target'); await fs.mkdir(target);
  const name = `${'a'.repeat(24)}.grib`, file = path.join(raw, name);
  await fs.symlink(target, file, process.platform === 'win32' ? 'junction' : 'dir');
  await rejectRawFileOpens(t, raw, async () => {
    await assert.rejects(inspectSavedRawFileInventory(folder), error => error.auditCode === 'RAW_FILE_INVENTORY_REJECTED');
  });
  await fs.unlink(file);
  await fs.mkdir(file);
  await assert.rejects(inspectSavedRawFileInventory(folder), error => error.auditCode === 'RAW_FILE_INVENTORY_REJECTED');
  await fs.rmdir(file);
  await fs.writeFile(file, Buffer.alloc(3));
  const originalLstat = fs.lstat;
  const hook = t.mock.method(fs, 'lstat', async (candidate, ...args) => {
    if (path.basename(String(candidate)) === name) throw new Error('secret-error-canary: unknown physical file outcome');
    return originalLstat(candidate, ...args);
  });
  try {
    await assert.rejects(inspectSavedRawFileInventory(folder), error => {
      assert.equal(error.auditCode, 'RAW_FILE_INVENTORY_REJECTED');
      assert.equal(error.message, 'RAW_FILE_INVENTORY_REJECTED'); return true;
    });
  } finally { hook.mock.restore(); }
});

test('RAW manifest counts distinguish exact, acquisition-only and revision/content absence without RAW reads', () => {
  const part = { partId: 'coastal-part-sensitive', zoneId: 'zone-sensitive', waterPoint: [8, 55] };
  const f = nativeFixture(part, undefined, true), parts = new Map([[part.partId, part]]);
  const document = f.donor(f.native), manifest = syntheticRawManifest(f.native);
  const before = JSON.stringify({ document, manifest });
  const measure = value => measureSavedRawCaptureMatches(document, parts, indexSavedRawManifest(value));
  const positive = measure(manifest);
  assert.equal(positive.counts.nativeCurrentRows, 2);
  assert.equal(positive.counts.exactCaptureMatchRows, 2);
  assert.equal(positive.counts.rejectedNativeRows, 0);
  assert.equal(positive.counts.invalidCaptureRows, 0);
  const first = Object.keys(manifest.assets)[0];
  for (const [key, value, category] of [
    ['acquiredAt', '2026-09-29T15:00:00.000001Z', 'acquiredAtOnlyMismatchRows'],
    ['contentSha256', 'd'.repeat(64), 'otherRevisionOrContentMismatchRows'],
    ['itemUpdatedAt', '2026-09-29T05:00:00.000001Z', 'otherRevisionOrContentMismatchRows'],
    ['itemId', 'different-private-item', 'otherRevisionOrContentMismatchRows'],
  ]) {
    const changed = structuredClone(manifest); changed.assets[first][key] = value;
    const result = measure(changed);
    assert.equal(result.counts[category], 1, key);
    assert.equal(result.counts.exactCaptureMatchRows, 1, key);
    safeReport(result, 'secret-error-canary');
  }
  const absent = structuredClone(manifest); delete absent.assets[first];
  assert.equal(measure(absent).counts.assetIdentityAbsentRows, 1);
  for (const mutation of [
    row => { row.assetIdentitySha256 = 'f'.repeat(64); },
    row => { row.contentLengthBytes = true; },
    row => { row.assetSizeBytes++; },
    row => { row.itemCreatedAt = 'not-a-time'; },
    row => { row.acquiredAt = '2026-02-30T00:00:00Z'; },
    row => { row.canonicalHref = 'https://synthetic.invalid/different.grib'; },
  ]) {
    const bad = structuredClone(manifest); mutation(bad.assets[first]);
    const index = indexSavedRawManifest(bad);
    assert.equal(index.counts.invalidRows, 1);
    assert.equal(measureSavedRawCaptureMatches(document, parts, index).counts.exactCaptureMatchRows, 1);
  }
  for (const malformed of [null, [], { schemaVersion: 1, assets: {} }, { schemaVersion: 2, assets: [] }]) {
    const result = measure(malformed);
    assert.equal(result.status, 'MALFORMED'); assert.equal(result.counts.unclassifiedRows, 2);
    assert.equal(result.counts.assetIdentityAbsentRows, 0, 'malformed is not evidence of absence');
  }
  const equiv = structuredClone(manifest);
  equiv.assets[first].acquiredAt = '2026-09-29T17:00:00.000000+02:00';
  assert.equal(measure(equiv).counts.exactCaptureMatchRows, 2, 'Python UTC and six-digit canonical spelling');
  const derived = structuredClone(document);
  Object.values(derived.zones)[0].hourly[f.native[0].time].sources.current.nativeSteps = [];
  assert.equal(measureSavedRawCaptureMatches(derived, parts, indexSavedRawManifest(manifest)).counts.rejectedNativeRows, 1);
  assert.equal(JSON.stringify({ document, manifest }), before);
  safeReport(positive, 'secret-error-canary');
});

test('RAW manifest receipt presence and current policy exclusions never become RAW repair needs', () => {
  const part = { partId: 'coastal-part-sensitive', zoneId: 'DK-B01-02', waterPoint: [8, 55] };
  const f = nativeFixture(part, undefined, true), parts = new Map([[part.partId, part]]);
  const native = structuredClone(f.native);
  // Deliberately contradictory metadata: presence is not a qualification claim.
  native[0].sources.current.nativeGridSampling = false;
  const document = f.donor(native), manifest = syntheticRawManifest(native);
  const first = Object.keys(manifest.assets)[0];
  manifest.assets[first].acquiredAt = '2026-09-29T15:00:00.000001Z';
  const before = JSON.stringify({ document, manifest });
  const measured = measureSavedRawCaptureMatches(document, parts, indexSavedRawManifest(manifest));
  assert.equal(inspectDmiNativeGridSampling(native[0].sources.current).status, 'contradictory');
  assert.equal(measured.counts.samplingReceiptPresentRows, 1);
  assert.equal(measured.counts.exactCaptureMatchRows, 1);
  assert.equal(measured.counts.acquiredAtOnlyMismatchRows, 0);
  assert.equal(measured.counts.excludedByCurrentPolicyRows, 0);
  assert.equal(JSON.stringify({ document, manifest }), before);
  const lfNative = structuredClone(f.native);
  lfNative[0].sources.current.collection = 'dkss_lf';
  const lfDocument = f.donor(lfNative), lfManifest = syntheticRawManifest(lfNative);
  const lfBefore = JSON.stringify({ lfDocument, lfManifest });
  const excluded = measureSavedRawCaptureMatches(lfDocument, parts, indexSavedRawManifest(lfManifest));
  assert.equal(excluded.counts.rejectedNativeRows, 0, 'genuine normal original verifier still accepts the synthetic LF row');
  assert.equal(excluded.counts.excludedByCurrentPolicyRows, 1, 'normal owner collection policy excludes LF current');
  assert.equal(excluded.counts.exactCaptureMatchRows, 1, 'eligible IDW row remains counted');
  assert.equal(JSON.stringify({ lfDocument, lfManifest }), lfBefore);
  for (const result of [measured, excluded]) {
    const { nativeCurrentRows, ...categories } = result.counts;
    assert.equal(Object.values(categories).reduce((total, value) => total + value, 0), nativeCurrentRows);
    safeReport(result, 'secret-error-canary');
  }
});

test('RAW manifest option uses the normal authenticated donor loop, leaves originals intact and remains default off', async t => {
  const f = await fixture(t, { nativeProofs: true, rawCaptures: true });
  const localRepository = path.join(f.folder, 'diagnostic-repository');
  await fs.mkdir(localRepository);
  await write(localRepository, '.cache/dmi-grib/asset-manifest.json', syntheticRawManifest(f.nativeData.native));
  const rawCacheKey = `dmi-grib-v4-Linux-2026-W40-${progressSource}`;
  const originals = new Map();
  for (const file of [f.options.progressFile, path.join(f.source, 'data/live/conditions.json'),
    path.join(localRepository, '.cache/dmi-grib/asset-manifest.json')]) originals.set(file, await fs.readFile(file));
  const report = await auditSavedWeatherInputs({ ...f.options, repositoryRoot: localRepository, includeRawManifest: true, rawCacheKey });
  assert.equal(report.status, 'AUDIT_COMPLETED', JSON.stringify(report));
  const raw = report.nativeProofAvailability.rawManifestCaptureCounts;
  assert.equal(raw.status, 'MEASURED');
  assert.equal(raw.counts.validMarineRows, 2);
  assert.deepEqual(Object.fromEntries(Object.entries(raw.donors).map(([key, row]) => [key, row.counts?.exactCaptureMatchRows])),
    { baselineBulk: 0, baselineActive: 1, baselineCandidate: 2, progressActive: 1, progressCandidate: 2 });
  assert.equal(raw.rawFilesOpened, false); assert.equal(raw.rawBytesVerified, false); assert.equal(raw.sourceAdmissionPerformed, false);
  assert.equal(Object.hasOwn(raw, 'inventoryMetadataInspected'), false, 'File metadata inspection remains default OFF.');
  assert.ok(Object.values(raw.donors).every(donor => !Object.hasOwn(donor, 'filePresence')));
  assert.equal(report.exactProgressAuthenticated, true);
  assert.equal(report.semanticUnionPerformed, false);
  // Only a manifest exists: even stat/open of a supposed GRIB cannot be needed.
  assert.deepEqual(await fs.readdir(path.join(localRepository, '.cache/dmi-grib')), ['asset-manifest.json']);
  for (const [file, bytes] of originals) assert.deepEqual(await fs.readFile(file), bytes);
  const ordinary = await auditSavedWeatherInputs({ ...f.options, repositoryRoot: localRepository,
    outputPath: path.join(f.privateRoot, 'default-report.json') });
  assert.equal(ordinary.status, 'AUDIT_COMPLETED');
  assert.equal(Object.hasOwn(ordinary.nativeProofAvailability, 'rawManifestCaptureCounts'), false);
  assert.deepEqual(ordinary.nativeProofAvailability, Object.fromEntries(Object.entries(report.nativeProofAvailability)
    .filter(([key]) => key !== 'rawManifestCaptureCounts')));
  const rawDirectory = path.join(localRepository, '.cache/dmi-grib');
  const candidate = Object.keys(syntheticRawManifest(f.nativeData.native).assets)[0];
  await fs.writeFile(path.join(rawDirectory, candidate), Buffer.alloc(f.nativeData.native[0].sources.current.contentLengthBytes, 31));
  // Reuse the actual normal donor loop and its authenticated fixture files.
  // The separate fixed-source scope test below requires the real old-family
  // baseline route; this small current-family fixture cannot impersonate it.
  const withPresence = await rejectRawFileOpens(t, rawDirectory, async () => measureSavedNativeProofAvailability({
    baselineIndex: await inspectDmiForecastFile(path.join(f.source, 'data/live/dmi-forecast-cache.json')),
    progressIndex: await inspectDmiForecastFile(path.join(f.progressRoot, 'data/live/dmi-forecast-cache.json')),
    parts: new Map(Object.entries(f.conditions.coastalParts.parts).map(([partId, part]) => [partId, { ...part, partId }])),
    donorFiles: { baselineBulk: path.join(f.source, 'data/live/dmi-bulk-cache.json'),
      baselineActive: path.join(f.source, PRIVATE_WEATHER_COMPONENT_FILES.dmiActive),
      baselineCandidate: path.join(f.source, PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate),
      progressActive: path.join(f.progressRoot, PRIVATE_WEATHER_COMPONENT_FILES.dmiActive),
      progressCandidate: path.join(f.progressRoot, PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate) },
    rawManifest: indexSavedRawManifest(syntheticRawManifest(f.nativeData.native)),
    rawFileInventory: await inspectSavedRawFileInventory(localRepository),
  }));
  const presence = withPresence.rawManifestCaptureCounts;
  assert.equal(presence.inventoryMetadataInspected, true);
  assert.equal(presence.fileInventoryStatus, 'MEASURED');
  assert.equal(presence.fileInventoryCandidates, 1);
  assert.equal(presence.otherRegularInventoryFiles, 1);
  assert.equal(presence.rawFilesOpened, false); assert.equal(presence.rawBytesVerified, false); assert.equal(presence.sourceAdmissionPerformed, false);
  assert.deepEqual(presence.counts, raw.counts);
  for (const [key, donor] of Object.entries(raw.donors)) {
    assert.deepEqual(presence.donors[key].counts, donor.counts);
  }
  assert.deepEqual(presence.donors.progressCandidate.filePresence.manifestAssetIdentityPresent,
    { potentialFileCandidates: 1, missing: 1, ambiguous: 0, sizeMismatch: 0 });
  assert.deepEqual(Object.fromEntries(Object.entries(withPresence)
    .filter(([key]) => key !== 'rawManifestCaptureCounts')), ordinary.nativeProofAvailability);
  for (const [file, bytes] of originals) assert.deepEqual(await fs.readFile(file), bytes);
  for (const options of [{ includeRawManifest: 'true', rawCacheKey },
    { includeRawManifest: true, rawCacheKey: rawCacheKey + '-other' },
    { includeRawManifest: false, rawCacheKey }]) {
    const result = await auditSavedWeatherInputs({ ...f.options, ...options,
      outputPath: path.join(f.privateRoot, 'must-not-be-written.json') });
    assert.equal(result.status, 'AUDIT_FAILED_CLOSED');
    assert.ok(['MODE_INVALID', 'RAW_CACHE_IDENTITY_INVALID'].includes(result.code));
  }
  for (const value of [report, ordinary, withPresence]) safeReport(value, f.privateRoot);
});

test('fixed older RAW source, file-presence opt-in and target guards reject invalid input before transport', async t => {
  const f = await fixture(t), calls = f.calls.length;
  const fixed = { includeRawManifest: true, rawManifestSource: '38577766010-1',
    rawCacheKey: 'dmi-grib-v4-Linux-2026-W42-38577766010-1', progressSource: '38692413809-1',
    progressCacheKey: 'weather-private-progress-encrypted-v2-Linux-main-38692413809-1',
    progressBaselineTargetHour: '2026-10-14T18:00:00.000Z' };
  const sameRunKey = `dmi-grib-v4-Linux-2026-W40-${progressSource}`;
  const cases = [
    [{ ...fixed, rawManifestSource: '38577766010-2' }, 'RAW_CACHE_IDENTITY_INVALID'],
    [{ ...fixed, rawManifestSource: 38577766010 }, 'RAW_CACHE_IDENTITY_INVALID'],
    [{ ...fixed, rawCacheKey: 'dmi-grib-v4-Linux-2026-W43-38577766010-1' }, 'RAW_CACHE_IDENTITY_INVALID'],
    [{ ...fixed, rawCacheKey: sameRunKey }, 'RAW_CACHE_IDENTITY_INVALID'],
    [{ ...fixed, rawManifestSource: null }, 'RAW_CACHE_IDENTITY_INVALID'],
    [{ ...fixed, includeRawManifest: false }, 'RAW_CACHE_IDENTITY_INVALID'],
    [{ ...fixed, mode: 'describe' }, 'MODE_INVALID'],
    [{ includeRawFilePresence: true }, 'MODE_INVALID'],
    [{ includeRawManifest: true, rawCacheKey: sameRunKey, includeRawFilePresence: true }, 'MODE_INVALID'],
    [{ includeRawFilePresence: 'true', ...fixed }, 'MODE_INVALID'],
    [{ ...fixed, progressSource }, 'RAW_CACHE_IDENTITY_INVALID'],
    [{ ...fixed, progressCacheKey: `weather-private-progress-encrypted-v2-Linux-main-${fixed.rawManifestSource}` }, 'RAW_CACHE_IDENTITY_INVALID'],
    [{ ...fixed, progressBaselineTargetHour: null }, 'RAW_CACHE_IDENTITY_INVALID'],
    [{ ...fixed, progressBaselineTargetHour: '2026-09-29T17:00:00Z' }, 'PROGRESS_BASELINE_TARGET_INVALID'],
    [{ ...fixed, progressBaselineTargetHour: f.conditions.productionReferenceAt }, 'RAW_CACHE_IDENTITY_INVALID'],
  ];
  for (const [i, [options, code]] of cases.entries()) {
    const result = await auditSavedWeatherInputs({ ...f.options, ...options,
      outputPath: path.join(f.privateRoot, `invalid-raw-source-${i}.json`) });
    assert.equal(result.status, 'AUDIT_FAILED_CLOSED'); assert.equal(result.code, code, JSON.stringify(result));
    assert.equal(f.calls.length, calls, 'Invalid RAW source/options/target cannot reach protected transport.');
    safeReport(result, f.privateRoot);
  }
  const validScope = await auditSavedWeatherInputs({ ...f.options, ...fixed, includeRawFilePresence: true,
    outputPath: path.join(f.privateRoot, 'valid-fixed-scope-wrong-original-family.json') });
  assert.equal(validScope.status, 'AUDIT_FAILED_CLOSED');
  assert.equal(validScope.phase, 'PROGRESS_BASELINE_RECONSTRUCTION');
  assert.equal(validScope.code, 'PROGRESS_BASELINE_RECONSTRUCTION_REJECTED');
  assert.ok(f.calls.length > calls, 'The exact allowed scope reaches authenticated restore but cannot bypass original-family admission.');
  assert.equal(validScope.normalProgressBaselineUsed, false);
  safeReport(validScope, f.privateRoot);
});

test('RAW manifest CLI rejects malformed boolean before any credential or input read', () => {
  for (const flag of ['--include-raw-manifest', '--include-raw-file-presence']) for (const value of ['1', 'TRUE', 'yes']) {
    const result = spawnSync(process.execPath, ['scripts/audit-saved-weather-inputs.mjs', 'audit',
      flag, value], { cwd: repositoryRoot, encoding: 'utf8' });
    assert.equal(result.status, 1); assert.equal(result.stdout, '');
    assert.equal(result.stderr.trim(), 'SAVED_WEATHER_INPUT_AUDIT_FAILED_CLOSED');
  }
});

test('selected preflight defaults OFF and rejects mixed or undeclared scopes before transport', async t => {
  const f = await fixture(t), before = f.calls.length;
  const fixed = { progressSource: '38692413809-1',
    progressCacheKey: 'weather-private-progress-encrypted-v2-Linux-main-38692413809-1',
    progressBaselineTargetHour: '2026-10-14T18:00:00.000Z', includeSelectedCurrentPreflight: true };
  const newer = { ...fixed, progressSource: '38768040429-1',
    progressCacheKey: 'weather-private-progress-encrypted-v2-Linux-main-38768040429-1',
    progressBaselineTargetHour: '2026-10-15T16:00:00.000Z' };
  for (const mutation of [
    { includeSelectedCurrentPreflight: 'true' },
    { includeSelectedCurrentPreflight: true },
    { ...fixed, mode: 'describe' }, { ...fixed, includeRawManifest: true },
    { ...fixed, includeRawFilePresence: true }, { ...fixed, rawManifestSource: '38577766010-1' },
    { ...fixed, rawCacheKey: 'dmi-grib-v4-Linux-2026-W42-38692413809-1' },
    { ...fixed, progressBaselineTargetHour: newer.progressBaselineTargetHour },
    { ...newer, progressCacheKey: fixed.progressCacheKey },
    { ...fixed, progressSource: '38692413809-2' },
  ]) {
    const report = await auditSavedWeatherInputs({ ...f.options, ...mutation });
    assert.equal(report.status, 'AUDIT_FAILED_CLOSED'); assert.equal(report.code, 'MODE_INVALID');
    assert.equal(f.calls.length, before); assert.equal(Object.hasOwn(report, 'selectedCurrentPreflight'), false);
    safeReport(report, f.privateRoot);
  }
  const ordinary = await auditSavedWeatherInputs(f.options);
  const explicitFalse = await auditSavedWeatherInputs({ ...f.options, includeSelectedCurrentPreflight: false,
    outputPath: path.join(f.privateRoot, 'explicit-false.json') });
  assert.equal(ordinary.status, 'AUDIT_COMPLETED'); assert.equal(explicitFalse.status, 'AUDIT_COMPLETED');
  assert.equal(Object.hasOwn(ordinary, 'selectedCurrentPreflight'), false);
  assert.equal(Object.hasOwn(explicitFalse, 'selectedCurrentPreflight'), false);
  const withoutResources = ({ resources, ...report }) => report;
  assert.deepEqual(withoutResources(explicitFalse), withoutResources(ordinary));
});

test('selected preflight actual CLI accepts exact true/false and rejects invalid booleans without exit13 or network', () => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP','TMPDIR','COMSPEC','PATHEXT']).has(key.toUpperCase())));
  const guard = 'data:text/javascript,' + encodeURIComponent(`globalThis.fetch=()=>{process.exit(97);};`);
  const run = args => spawnSync(process.execPath, ['--import', guard, 'scripts/audit-saved-weather-inputs.mjs', 'audit',
    ...args], { cwd: repositoryRoot, env, encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024, windowsHide: true });
  for (const value of ['true','false']) {
    const args = ['--include-selected-current-preflight', value, '--private-root', fileURLToPath(import.meta.url)];
    if (value === 'true') args.push('--progress-source', '38692413809-1', '--progress-cache-key',
      'weather-private-progress-encrypted-v2-Linux-main-38692413809-1', '--progress-baseline-target-hour', '2026-10-14T18:00:00.000Z');
    const result = run(args);
    assert.equal(result.error, undefined); assert.equal(result.signal, null); assert.equal(result.status, 1);
    assert.equal(result.stderr, ''); assert.equal(JSON.parse(result.stdout).code, 'PRIVATE_ROOT_INVALID');
  }
  for (const value of ['1','TRUE','yes']) {
    const result = run(['--include-selected-current-preflight', value]);
    assert.equal(result.status, 1); assert.equal(result.stdout, '');
    assert.equal(result.stderr.trim(), 'SAVED_WEATHER_INPUT_AUDIT_FAILED_CLOSED');
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

for (const location of ['baseline', 'progress']) for (const fault of ['close-noop', 'none'])
test('main audit pack JSON lifetime / ' + location + ' / ' + fault, { timeout: 30_000 }, async t => {
  const native = await import('node:fs');
  const { syncBuiltinESMExports } = await import('node:module');
  const childProcess = (await import('node:child_process')).default;
  const { openMeteoPartSha256 } = await import('./lib/open-meteo-part-bank.mjs');
  const body = { kind: 'RAVRADAR_PRIVATE_OPEN_METEO_PART_COMPONENT_BANK', schemaVersion: 1,
    responses: {}, records: [], syntheticReaderOnly: true };
  const packReaderBank = { ...body, bankSha256: openMeteoPartSha256(body) };
  const f = await fixture(t, { packReaderBank });
  const original = { open: fs.open, readFile: fs.readFile, mkdtemp: fs.mkdtemp, rm: fs.rm };
  const preserved = new Map();
  for (const file of [f.options.progressFile, f.options.descriptorPath,
    path.join(f.source, 'data/live/conditions.json'), path.join(f.source, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank),
    path.join(f.source, '.cache/weather-component-inputs.pack')]) preserved.set(file, await original.readFile(file));
  const archiveHashes = f.built.objects.map(row => crypto.createHash('sha256').update(row.bytes).digest('hex'));
  const privateRoot = await fs.realpath(f.privateRoot), temporaryParent = await fs.realpath(os.tmpdir());
  let armed = true, reader, fd, identity, actualClose, observationFailure, reads = 0, closes = 0, launches = 0;
  const roots = [], removals = [], hooks = [];
  const probe = () => {
    try { const stat = native.fstatSync(fd); assert.equal(stat.dev, identity.dev); assert.equal(stat.ino, identity.ino); return 'OPEN_SAME_OBJECT'; }
    catch (error) { if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') return 'CLOSED'; throw error; }
  };
  hooks.push(t.mock.method(globalThis, 'fetch', () => { throw Error('NO_REAL_NETWORK_ALLOWED'); }));
  hooks.push(t.mock.method(childProcess, 'spawn', () => { launches++; throw Error('NO_CP_OR_PROVIDER_CHILD_ALLOWED'); }));
  syncBuiltinESMExports();
  hooks.push(t.mock.method(fs, 'mkdtemp', async (...args) => {
    const folder = await Reflect.apply(original.mkdtemp, fs, args);
    if (armed && /^(saved-input-audit-|rr-encrypted-progress-)/.test(path.basename(folder))) {
      const physical = await fs.realpath(folder), stat = await fs.stat(physical);
      const kind = path.basename(folder).startsWith('saved-input-audit-') ? 'baseline' : 'progress';
      roots.push({ folder: physical, requested: path.resolve(folder), kind, dev: stat.dev, ino: stat.ino });
    }
    return folder;
  }));
  hooks.push(t.mock.method(fs, 'rm', async (file, ...args) => {
    const row = roots.find(row => row.folder === path.resolve(String(file)) || row.requested === path.resolve(String(file)));
    if (armed && row) removals.push(row.kind);
    return Reflect.apply(original.rm, fs, [file, ...args]);
  }));
  hooks.push(t.mock.method(fs, 'open', async (file, flags, ...args) => {
    const stack = new Error().stack;
    let selected = false;
    if (armed && !reader && flags === 'r' && typeof file === 'string' && stack.includes('at readSmallJson (')
      && stack.includes('private-weather-component-pack.mjs')) {
      const physical = await fs.realpath(file);
      selected = roots.some(row => row.kind === location && physical === path.join(row.folder,
        location === 'baseline' ? 'baseline-components' : 'verified', PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank));
    }
    const handle = await Reflect.apply(original.open, fs, [file, flags, ...args]);
    if (selected) {
      reader = handle; fd = handle.fd; actualClose = handle.close.bind(handle); reads++;
      try {
        identity = native.fstatSync(fd); const stat = await fs.stat(await fs.realpath(file));
        assert.equal(identity.dev, stat.dev); assert.equal(identity.ino, stat.ino);
        handle.close = async () => { closes++; if (fault !== 'close-noop') await actualClose(); };
      } catch (error) { observationFailure = { error }; throw error; }
    }
    return handle;
  }));
  try {
    const report = await auditSavedWeatherInputs(f.options); armed = false;
    if (observationFailure) throw observationFailure.error;
    if (!reader) t.diagnostic(JSON.stringify({ location, fault, status: report.status, code: report.code, phase: report.phase, roots: roots.map(row => row.kind) }));
    assert.ok(reader, 'The actual audit reached its own selected normal pack reader.');
    assert.equal(reads, 1); assert.equal(closes, 1); assert.equal(launches, 0);
    const selectedRoot = roots.find(row => row.kind === location);
    const stageExists = await fs.stat(selectedRoot.folder).then(stat => {
      assert.equal(stat.dev, selectedRoot.dev); assert.equal(stat.ino, selectedRoot.ino); return true;
    }, error => { if (error.code === 'ENOENT') return false; throw error; });
    for (const [file, bytes] of preserved) assert.deepEqual(await original.readFile(file), bytes);
    assert.deepEqual(f.built.objects.map(row => crypto.createHash('sha256').update(row.bytes).digest('hex')), archiveHashes);
    safeReport(report, f.privateRoot);
    const fdState = probe();
    t.diagnostic(JSON.stringify({ kind: 'MAIN_AUDIT_PACK_READER', location, fault, status: report.status, code: report.code ?? null,
      phase: report.phase ?? null, fdState, reads, closes, stageExists, cleanupCalls: removals.filter(kind => kind === location).length,
      auditWorkCleanupCalls: removals.filter(kind => kind === 'baseline').length, launches, originalsUnchanged: true,
      ownerClaim: 'none: physical scratch/reader lifetime only' }));
    assert.equal(fdState, fault === 'none' ? 'CLOSED' : 'OPEN_SAME_OBJECT');
    if (fault === 'none') {
      assert.equal(report.status, 'AUDIT_COMPLETED');
      assert.equal(stageExists, false); assert.equal(removals.filter(kind => kind === location).length, 1);
    } else {
      assert.equal(report.status, 'AUDIT_FAILED_CLOSED');
      assert.equal(report.code, location === 'baseline' ? 'BASELINE_COMPONENT_PACK_REJECTED' : 'PROGRESS_AUTHENTICATION_REJECTED');
      if (location === 'progress') assert.equal(report.progressAuthenticationCode, 'WEATHER_PACK_JSON_CLOSE_UNPROVED');
      assert.equal(stageExists, true); assert.equal(removals.filter(kind => kind === location).length, 0);
    }
  } finally {
    armed = false; for (const hook of hooks.reverse()) hook.mock.restore(); syncBuiltinESMExports();
    if (reader && probe() !== 'CLOSED') await actualClose();
    if (reader) assert.equal(probe(), 'CLOSED');
    for (const row of roots) {
      const stat = await fs.stat(row.folder).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (!stat) continue;
      assert.equal(stat.dev, row.dev); assert.equal(stat.ino, row.ino);
      assert.equal(path.dirname(row.folder), row.kind === 'baseline' ? privateRoot : temporaryParent);
      assert.ok(path.basename(row.folder).startsWith(row.kind === 'baseline' ? 'saved-input-audit-' : 'rr-encrypted-progress-'));
      await original.rm(row.folder, { recursive: true, force: true });
    }
  }
});

test('CURRENT586 fixed B-only endpoint diagnostic observes role evidence without admission or scope widening', async () => {
  const part = { partId: 'coastal-part-sensitive', zoneId: 'DK-B01-01',
    name: 'Synthetic diagnostic PART', waterPoint: [8, 55], landPoint: [8.001, 55], onshoreDirectionDeg: 90 };
  const reference = '2026-10-21T14:00:00.000Z';
  const f = nativeFixture(part, reference, true), complete = f.donor(f.native);
  const partial = f.donor([f.native[1]]);
  const state = buildIntegratedPartScoreSeries({ part, zone: { id: part.zoneId, onshoreDirectionDeg: 90 },
    hourly: [{ time: reference }] }).ravScoreState.continuationState;
  const conditions = { datasetId: 'rr-synthetic-diagnostic', productionReferenceAt: reference,
    coastalParts: { parts: { [part.partId]: { ravScoreModel: { currentState: state } } } } };
  const checkpoint = { datasetId: conditions.datasetId, productionReferenceAt: reference,
    generationSha256: 'a'.repeat(64), states: { [part.partId]: state } };
  const options = { registry: { partCount: 1, zones: { [part.zoneId]: [part] } }, conditions, checkpoint,
    productionReferenceAt: CURRENT586_ENDPOINT_AUDIT.targetReferenceAt, protectedBulk: partial,
    progressActive: complete, persistedHourlyByPart: new Map([[part.partId, {
      point: part.waterPoint, hourly: f.hourly }]]), zones: { features: [{ properties: { id: part.zoneId } }] },
    boundary: { datasetId: conditions.datasetId, productionReferenceAt: reference,
      bundleContentSha256: 'b'.repeat(64), conditionsSha256: 'c'.repeat(64),
      checkpointGenerationSha256: checkpoint.generationSha256 } };
  const missing = error => error.originalDependencyCode ===
    'POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_PROOF_NATIVE_ENDPOINT_MISSING';
  const before = JSON.stringify(options), beforePersisted = JSON.stringify([...options.persistedHourlyByPart]);
  assert.throws(() => buildRavScoreRawCurrentRetention(options), missing);
  const observed = diagnoseCurrent586SelectedEndpoints(options);
  const role = observed.roles['deployed-private-runtime'];
  assert.equal(observed.normalCollectorEndpointMissingParts, 1);
  assert.equal(role.firstNativeEndpointMissingParts, 1);
  assert.equal(role.originalWrapperAbsent, 1);
  assert(role.unknownSamplingRows > 0);
  assert(role.own.selectionsRejected > 0);
  assert(role.all.selectionsProved > role.own.selectionsProved);
  assert(role.all.exactNativeStepsFound > role.own.exactNativeStepsFound);
  assert.equal(observed.nativeAdmissionPerformed, false);
  assert.throws(() => buildRavScoreRawCurrentRetention(options), missing, 'diagnostic cannot repair the normal refusal');
  const companion = diagnoseCurrent586SelectedEndpoints({ ...options, protectedCompanionContexts: [complete] });
  assert.equal(companion.normalCollectorEndpointMissingParts, 0);
  assert.equal(companion.firstFailureCategory, 'NO_NORMAL_COLLECTOR_REFUSAL');
  assert.equal(companion.scope, 'FIRST_NORMAL_COLLECTOR_FAILURE_ONLY');
  for (const [category, mutate] of [
    ['onlyDerivedNativeAtTime', source => { source.forecastAgeHours = 1; }],
    ['identityMismatch', source => { source.collection = 'dkss_nsbs'; }],
    ['samplingPresenceMismatch', source => { source.nativeGridSampling = {
      contractId: 'dmi-native-grid-sampling-v1', elementIndex: 71,
      gridIndexIdentitySha256: 'd'.repeat(64), coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
      gridDefinitionSha256: source.gridDefinitionSha256, gridPoint: [...source.gridPoint],
      fieldSet: [...source.fieldSet], optionalFieldSet: [...source.optionalFieldSet] }; }],
    ['stepFieldsMismatch', source => { source.itemId += '-different'; }],
  ]) {
    const changed = structuredClone(complete);
    mutate(changed.zones[f.identity.entityId].hourly[f.native[0].time].sources.current);
    const result = diagnoseCurrent586SelectedEndpoints({ ...options, progressActive: changed });
    assert(result.roles['deployed-private-runtime'].contextMismatch[category] > 0,
      category + ': ' + JSON.stringify(result.roles['deployed-private-runtime'].contextMismatch));
    assert.throws(() => buildRavScoreRawCurrentRetention({ ...options, progressActive: changed }), missing);
    if (category === 'identityMismatch') {
      const detail = result.roles['deployed-private-runtime'].identityMismatchDetails;
      assert.equal(detail.endpointSteps, result.roles['deployed-private-runtime'].contextMismatch.identityMismatch);
      assert(detail.candidateOccurrences > 0);
      assert.equal(detail.nativeGroups.collectionFamily, detail.nativeMismatch);
      assert.equal(detail.wireMismatch, 0);
      assert.equal(detail.nativeUnclassifiedMismatch, 0);
      assert.equal(detail.countsMayOverlap, true);
      assert.equal(detail.uniqueOriginalsClaimed, false);
      assert.equal(detail.singularCauseClaimed, false);
    }
    safeReport(result, 'secret-error-canary');
  }
  // Exercise the actual private observational helper, not a duplicated comparator
  // or a new public hook. These detached probes cannot admit a forecast/native row.
  const actualPlanner = (await fs.readFile(new URL('./plan-ravscore-current-history.mjs', import.meta.url), 'utf8'))
    .replace(/\r\n/g, '\n');
  const helperBody = actualPlanner.match(/^function current586IdentityDifferenceDetails\([\s\S]+?^\}/m)?.[0];
  assert(helperBody);
  const observe = vm.runInNewContext('(' + helperBody + ')', {
    sameNativeIdentity, dmiOriginalWireIdentityMatchesCentralIdentity, structuredClone });
  const decompose = (...args) => JSON.parse(JSON.stringify(observe(...args)));
  const nativeSource = f.native[0].sources.current, forecastSource = f.hourly[0].sources.current;
  const inputsBefore = JSON.stringify([nativeSource, f.identity, forecastSource]);
  const exact = decompose(nativeSource, f.identity, forecastSource, f.identity);
  assert.equal(exact.wireMismatch, false); assert.equal(exact.nativeMismatch, false);
  assert(Object.values(exact.nativeGroups).every(value => value === false));
  for (const [group, mutate] of [
    ['collectionFamily', value => { value.collection = 'secret-error-canary'; }],
    ['modelRun', value => { value.modelRun = '2026-10-20T00:00:00Z'; }],
    ['entity', value => { value.entityId += '-secret-error-canary'; }],
    ['gridDefinition', value => { value.gridDefinitionSha256 = 'e'.repeat(64); }],
    ['gridLocation', value => { value.gridPoint[0] += 0.01; }],
    ['samplingLocation', value => { value.samplingPoint[0] += 0.01; }],
    ['distance', value => { value.distanceKm += 0.005; }],
    ['vector', value => { value.vectorSelection += '-different'; }],
    ['spatial', value => { value.spatialSelection += '-different'; }],
    ['layer', value => { value.verticalLayerRankM += 1; }],
    ['fieldSet', value => { value.fieldSet = ['current-u']; }],
  ]) {
    const changed = structuredClone(forecastSource); mutate(changed);
    const observed = decompose(nativeSource, f.identity, changed, f.identity);
    assert.equal(observed.nativeMismatch, true, group);
    assert.deepEqual(Object.keys(observed.nativeGroups).filter(key => observed.nativeGroups[key]), [group]);
    assert.equal(observed.nativeUnclassifiedMismatch, false);
    assert.equal(observed.wireMismatch, false);
    safeReport(observed, 'secret-error-canary');
  }
  const tolerance = structuredClone(forecastSource);
  tolerance.gridPoint[0] += 0.00000005; tolerance.distanceKm += 0.0005;
  const tolerated = decompose(nativeSource, f.identity, tolerance, f.identity);
  assert.equal(tolerated.nativeMismatch, false, 'normal native point/distance tolerances remain canonical');
  assert(Object.values(tolerated.nativeGroups).every(value => value === false));
  const double = structuredClone(forecastSource);
  double.collection = 'dkss_nsbs'; double.modelRun = '2026-10-20T00:00:00Z';
  const overlap = decompose(nativeSource, f.identity, double, f.identity);
  assert.equal(overlap.nativeGroups.collectionFamily, true); assert.equal(overlap.nativeGroups.modelRun, true);
  assert.equal(Object.values(overlap.nativeGroups).filter(Boolean).length, 2, 'groups are not singular causes');
  for (const wire of [null, [], { ...f.identity, unexpected: true },
    Object.fromEntries(Object.entries(f.identity).filter(([key]) => key !== 'entityId'))]) {
    const observed = decompose(nativeSource, wire, forecastSource, f.identity);
    assert.equal(observed.wireMismatch, true); assert.equal(observed.wireShapeMismatch, true);
    assert.equal(observed.nativeMismatch, false);
    safeReport(observed, 'secret-error-canary');
  }
  const wrongString = { ...f.identity, entityId: 'secret-error-canary' };
  const stringResult = decompose(nativeSource, wrongString, forecastSource, f.identity);
  assert.equal(stringResult.wireStringMismatch, true); assert.equal(stringResult.wirePointMismatch, false);
  const wrongPoint = { ...f.identity, samplingPoint: [8.01, 55] };
  const pointResult = decompose(nativeSource, wrongPoint, forecastSource, f.identity);
  assert.equal(pointResult.wirePointMismatch, true); assert.equal(pointResult.wireStringMismatch, false);
  const precisionIdentity = { ...f.identity, samplingPoint: [8.123456789, 55.123456789] };
  const wirePrecision = { ...precisionIdentity, samplingPoint: [8.1234568, 55.1234568] };
  assert.equal(decompose(nativeSource, wirePrecision, forecastSource, precisionIdentity).wireMismatch, false,
    'normal exact Python seven-place relation is reused, not a diagnostic tolerance');
  for (const observed of [exact, tolerated, overlap, stringResult, pointResult])
    safeReport(observed, 'secret-error-canary');
  assert.equal(JSON.stringify([nativeSource, f.identity, forecastSource]), inputsBefore);
  assert.equal(JSON.stringify(options), before);
  assert.equal(JSON.stringify([...options.persistedHourlyByPart]), beforePersisted);
  safeReport(observed, 'secret-error-canary');
  assert.throws(() => diagnoseCurrent586SelectedEndpoints({ ...options,
    productionReferenceAt: '2026-10-21T21:00:00.000Z' }), /FIXED_ENDPOINT_DIAGNOSTIC_SCOPE/);
  let reads = 0;
  for (const extra of [{ progressFile: '/private/cipher' }, { includeRawManifest: true },
    { includeCurrentWindowDiagnostic: true }, { progressSource: '39066350748-1' },
    { progressCacheKey: 'weather-private-progress-encrypted-v2-Linux-main-39666991481-1' }]) {
    const result = await auditSavedWeatherInputs({ mode: 'audit', includeCurrent586Endpoints: true,
      progressSource: CURRENT586_ENDPOINT_AUDIT.progressSource,
      fetchImpl: async () => { reads++; throw Error('secret-error-canary'); }, ...extra });
    assert.equal(result.status, 'AUDIT_FAILED_CLOSED'); assert.equal(result.code, 'MODE_INVALID');
  }
  assert.equal(reads, 0, 'colliding old/cipher/RAW scopes refuse before transport');
  // Execute only the actual normal finally-control seam with inert filesystem
  // functions. The installer's unknown internal close must not trigger removal
  // merely because the outer baselinePackInvocation stayed null.
  const auditSource = await fs.readFile(new URL('./audit-saved-weather-inputs.mjs', import.meta.url), 'utf8');
  const metadataBody = auditSource.match(/^function current586BootstrapObservation\([\s\S]+?^\}/m)?.[0];
  assert(metadataBody, 'exercise the actual first-failure report adapter');
  const metadataObservation = vm.runInNewContext('(' + metadataBody + ')', {});
  const metadata = metadataObservation({ discoverCommittedCoherentOriginalBootstrap }, options);
  assert.equal(metadata.scope, 'FIRST_NORMAL_COLLECTOR_FAILURE_PART_METADATA_ONLY');
  assert.equal(metadata.rawAvailability, 'NOT_PROBED');
  assert.equal(metadata.nativeAdmissionPerformed, false);
  safeReport(metadata, 'secret-error-canary');
  const summaryOnly = metadataObservation({ discoverCommittedCoherentOriginalBootstrap: () => ({
    summary: { status: 'METADATA_BOUND', rawAvailability: 'NOT_PROBED' },
    privateRequests: [{ itemId: 'secret-error-canary' }], privateBinding: { datasetId: 'rr-synthetic-input' },
  }) }, options);
  assert.deepEqual(JSON.parse(JSON.stringify(summaryOnly)), {
    status: 'METADATA_BOUND', rawAvailability: 'NOT_PROBED',
    scope: 'FIRST_NORMAL_COLLECTOR_FAILURE_PART_METADATA_ONLY' });
  for (const [message, expectedCode] of [
    ['COHERENT_ORIGINAL_BOOTSTRAP_INPUT_BOUND', 'COHERENT_ORIGINAL_BOOTSTRAP_INPUT_BOUND'],
    ['RAVSCORE_CURRENT_HISTORY_DEMAND_RETENTION_INPUT_INVALID', 'RAVSCORE_CURRENT_HISTORY_DEMAND_RETENTION_INPUT_INVALID'],
    ['COHERENT_ORIGINAL_BOOTSTRAP_SECRET_CANARY', 'UNCLASSIFIED_METADATA_PREPARATION_REFUSAL'],
    ['secret-error-canary', 'UNCLASSIFIED_METADATA_PREPARATION_REFUSAL'],
  ]) {
    const refused = metadataObservation({ discoverCommittedCoherentOriginalBootstrap: () => { throw new Error(message); } }, options);
    assert.equal(refused.status, 'PREPARATION_REFUSED');
    assert.equal(refused.refusalCode, expectedCode);
    safeReport(refused, 'secret-error-canary');
  }
  assert.match(auditSource, /bootstrapMetadata = current586BootstrapObservation\(bootstrapApi, partInputs\)/);
  assert.equal(JSON.stringify(options), before);
  assert.equal(JSON.stringify([...options.persistedHourlyByPart]), beforePersisted);
  const cleanup = auditSource.match(/    if \(work && !includeCurrent586Endpoints && \(baselinePackInvocation === null[\s\S]+?await fs\.rm\(work, \{ recursive: true, force: true \}\)\.catch\(\(\) => \{\}\);/)?.[0];
  assert(cleanup, 'qualify the actual new-mode finalizer, not a copied predicate');
  for (const [includeCurrent586Endpoints, prepareCurrent586Originals] of [[true, false], [false, false], [false, true]]) {
    let removals = 0;
    const privateRoot = path.join(os.tmpdir(), 'synthetic-unclosed-audit');
    const firstError = new Error('synthetic-first-error');
    const scope = { work: path.join(privateRoot, 'saved-input-audit-owned'), privateRoot, path,
      includeCurrent586Endpoints, includeCurrent586CachedOriginals: false, prepareCurrent586Originals, baselinePackInvocation: null,
      privateWeatherPackJsonReadsClosed: () => false, firstError,
      fs: { realpath: async () => privateRoot, rm: async () => { removals++; } } };
    await assert.rejects(vm.runInNewContext('(async () => { try { throw firstError; } finally {' + cleanup + '} })()', scope),
      error => error === firstError, 'unknown close/cleanup cannot replace the original failure');
    assert.equal(removals, includeCurrent586Endpoints || prepareCurrent586Originals ? 0 : 1,
      'new-mode uncertain work is retained; old mode behavior is unchanged');
  }
  const row = CURRENT586_ENDPOINT_DIAGNOSTIC_TEST_REVIEW;
  const exportedWhole = inverseNationalCoherentWorkTestInput((await fs.readFile(new URL('./plan-ravscore-current-history.mjs', import.meta.url), 'utf8')).replace(/\r\n/g, '\n'), row.path);
  const sharedExports = CURRENT586_SHARED_PROJECTION_EXPORT_TEST_REVIEW;
  assert.equal(Buffer.byteLength(exportedWhole), sharedExports.after.bytes);
  assert.equal(crypto.createHash('sha256').update(exportedWhole).digest('hex'), sharedExports.after.sha256);
  const refinedWhole = inverseCurrent586SharedProjectionExportTestInput(exportedWhole, row.path);
  assert.equal(Buffer.byteLength(refinedWhole), sharedExports.before.bytes);
  assert.equal(crypto.createHash('sha256').update(refinedWhole).digest('hex'), sharedExports.before.sha256);
  assert.equal(inverseCurrent586SharedProjectionExportTestInput(refinedWhole, row.path), refinedWhole,
    'The export-only inverse must not remove the identity-refinement layer');
  for (const edit of sharedExports.edits) {
    assert.equal(exportedWhole.slice(edit.offset, edit.offset + edit.after.length), edit.after);
    const changed = exportedWhole.slice(0, edit.offset) + (edit.after[0] === 'X' ? 'Y' : 'X') + exportedWhole.slice(edit.offset + 1);
    assert.throws(() => inverseCurrent586SharedProjectionExportTestInput(changed, row.path), /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
  }
  assert.throws(() => inverseCurrent586SharedProjectionExportTestInput(exportedWhole + '// unknown shared-export drift\n', row.path),
    /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
  assert.throws(() => inverseCurrent586SharedProjectionExportTestInput(exportedWhole, 'scripts/unknown.mjs'),
    /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
  const refinement = CURRENT586_IDENTITY_REFINEMENT_TEST_REVIEW;
  const whole = inverseCurrent586IdentityRefinementTestInput(refinedWhole, row.path);
  assert.equal(Buffer.byteLength(whole), refinement.before.bytes);
  assert.equal(crypto.createHash('sha256').update(whole).digest('hex'), refinement.before.sha256);
  assert.equal(inverseCurrent586IdentityRefinementTestInput(whole, row.path), whole);
  for (const edit of refinement.edits) {
    assert.equal(refinedWhole.slice(edit.offset, edit.offset + edit.after.length), edit.after);
    const changed = refinedWhole.slice(0, edit.offset) + (edit.after[0] === 'X' ? 'Y' : 'X') + refinedWhole.slice(edit.offset + 1);
    assert.throws(() => inverseCurrent586IdentityRefinementTestInput(changed, row.path), /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
  }
  assert.throws(() => inverseCurrent586IdentityRefinementTestInput(refinedWhole + '// unknown refinement drift\n', row.path),
    /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
  const old = inverseCurrent586EndpointDiagnosticTestInput(whole, row.path);
  assert.equal(Buffer.byteLength(old), row.before.bytes);
  assert.equal(crypto.createHash('sha256').update(old).digest('hex'), row.before.sha256);
  assert.equal(inverseCurrent586EndpointDiagnosticTestInput(old, row.path), old);
  for (const edit of row.edits) {
    assert.equal(whole.slice(edit.offset, edit.offset + edit.after.length), edit.after);
    const changed = whole.slice(0, edit.offset) + (edit.after[0] === 'X' ? 'Y' : 'X') + whole.slice(edit.offset + 1);
    assert.throws(() => inverseCurrent586EndpointDiagnosticTestInput(changed, row.path), /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
  }
  assert.throws(() => inverseCurrent586EndpointDiagnosticTestInput(whole + '// unknown drift\n', row.path),
    /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
});

test('CURRENT586 pilot fingerprint uses the actual normal Python target projection, not full registry JSON', async t => {
  const directory = await temp(t), registryPath = path.join(directory, 'data/live/coastal-parts-v2.json');
  const registry = { schemaVersion: 2, partCount: 2, zones: {
    'synthetic-parent-b': [{ partId: 'synthetic-part-b', sourceZoneId: 'synthetic-parent-b',
      name: 'Does not enter target identity', waterPoint: [8.123456789, 55.123456789] }],
    'synthetic-parent-a': [{ partId: 'synthetic-part-a', sourceZoneId: 'synthetic-parent-a',
      name: 'Also excluded', waterPoint: [9.765432101, 56.765432101] }],
  } };
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, JSON.stringify(registry));
  const modulePath = path.join(directory, 'scripts/lib/copernicus_target_identity.py');
  await fs.mkdir(path.dirname(modulePath), { recursive: true });
  const originalModule = await fs.readFile(new URL('./lib/copernicus_target_identity.py', import.meta.url));
  await fs.writeFile(modulePath, originalModule);
  assert.deepEqual(await fs.readFile(modulePath), originalModule);
  const audit = await fs.readFile(new URL('./audit-saved-weather-inputs.mjs', import.meta.url), 'utf8');
  const literal = audit.match(/const pilotTargetFingerprint = \(await local\(\['-c',\s*('(?:\\.|[^'\\\r\n])*')\s*,/)?.[1];
  assert(literal, 'extract exactly the actual fixed audit command, never a copied fingerprint algorithm');
  const command = vm.runInNewContext(literal, Object.create(null));
  const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
  const run = async (body, cwd, args = []) => withoutSavedAuditSecrets(async () => {
    const value = spawnSync(python, ['-c', body, ...args], { cwd, encoding: 'utf8',
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 20_000, maxBuffer: 1024 * 1024 });
    assert.equal(value.error, undefined); assert.equal(value.status, 0);
    assert.equal(value.stderr, ''); return value.stdout.trim();
  });
  const actual = await run(command, directory);
  const expected = await run('from pathlib import Path; import sys; from scripts.lib.copernicus_target_identity import target_fingerprint, targets_from_registry; print(target_fingerprint(targets_from_registry(Path(sys.argv[1]))))',
    repositoryRoot, [registryPath]);
  assert.match(actual, /^sha256:[a-f0-9]{64}$/); assert.equal(actual, expected);
  const fullRegistry = JSON.stringify(registry, (_key, value) => value && typeof value === 'object'
    && !Array.isArray(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
  assert.notEqual(actual, 'sha256:' + crypto.createHash('sha256').update(fullRegistry).digest('hex'));
  assert.match(audit, /pilotFingerprintAlgorithm: 'NORMAL_COPERNICUS_TARGET_IDENTITY'/);
});

test('CURRENT586 cached originals: separate scope rejects every mixed transport before filesystem or network', async () => {
  let reads = 0;
  for (const extra of [{ includeCurrent586CachedOriginals: 'true' }, { includeCurrent586Endpoints: true },
    { includeCurrentWindowDiagnostic: true }, { includeSelectedCurrentPreflight: true },
    { includeRawManifest: true }, { includeRawFilePresence: true }, { rawCacheKey: 'secret-error-canary' },
    { rawManifestSource: 'secret-error-canary' }, { progressFile: '/private/cipher' },
    { progressCacheKey: 'secret-error-canary' }, { progressBaselineTargetHour: '2026-10-21T20:00:00.000Z' },
    { progressSource: '39066350748-1' }, { prepareCurrentForwardOriginals: true }]) {
    const result = await auditSavedWeatherInputs({ mode: 'audit', includeCurrent586CachedOriginals: true,
      progressSource: CURRENT586_ENDPOINT_AUDIT.progressSource,
      fetchImpl: async () => { reads++; throw Error('secret-error-canary'); }, ...extra });
    assert.equal(result.status, 'AUDIT_FAILED_CLOSED'); assert.equal(result.code, 'MODE_INVALID');
    assert.equal(result.nativeAdmissionPerformed, false);
    safeReport(result, 'secret-error-canary');
  }
  assert.equal(reads, 0);
  assert.equal(CURRENT586_CACHED_ORIGINAL_AUDIT.rawCacheKey, 'dmi-grib-v4-Linux-2026-W43-39520623069-1');
  assert.equal(CURRENT586_CACHED_ORIGINAL_AUDIT.rawCacheId, 9250979458);
  assert.equal(CURRENT586_CACHED_ORIGINAL_AUDIT.rawCacheBytes, 2729841089);
});

test('CURRENT586 cached originals: exact worker refusal codes survive without raw text; uncertain scratch stays owned', async () => {
  for (const suffix of ['RAW_CAPTURE_UNAVAILABLE', 'RAW_ACQUISITION_UNRESOLVED', 'OWNED_CAPTURE_MISMATCH', 'DECODE_FAILED',
    'RAW_CAPTURE_FILE_MISSING', 'RAW_CAPTURE_METADATA_UNMATCHED_PREFIX_PRESENT',
    'RAW_CAPTURE_METADATA_UNMATCHED_PREFIX_ABSENT',
    'DECODE_MISMATCH', 'PRODUCER_PATH_INVALID', 'RAW_PATH_INVALID', 'OUTPUT_PATH_INVALID', 'OUTPUT_BOUND',
    'OUTPUT_WRITE_FAILED', 'OUTPUT_CLOSE_UNPROVED', 'ARGUMENT_INVALID', 'SUPERVISOR_ARGUMENT_INVALID',
    'SUPERVISOR_SOURCE_INVALID', 'SUPERVISOR_OUTPUT_BOUND', 'SUPERVISOR_OUTPUT_INVALID']) {
    const code = 'COHERENT_CURRENT_ORIGINAL_' + suffix;
    assert.equal(cachedCoherentOriginalFailureCode(new Error(code)), code);
  }
  for (const message of ['secret-error-canary', 'COHERENT_CURRENT_ORIGINAL_SECRET_CANARY',
    'COHERENT_CURRENT_ORIGINAL_RAW_CAPTURE_UNAVAILABLE: secret-error-canary']) {
    assert.equal(cachedCoherentOriginalFailureCode(new Error(message)), 'COHERENT_CURRENT_CACHED_PROOF_UNCLASSIFIED');
  }
  const source = await fs.readFile(new URL('./audit-saved-weather-inputs.mjs', import.meta.url), 'utf8');
  const cleanup = source.match(/    if \(work && !includeCurrent586Endpoints && \(baselinePackInvocation === null[\s\S]+?await fs\.rm\(work, \{ recursive: true, force: true \}\)\.catch\(\(\) => \{\}\);/)?.[0];
  assert(cleanup);
  const privateRoot = path.join(os.tmpdir(), 'synthetic-cached-current-owner');
  let removals = 0;
  const firstError = new Error('synthetic-first-error');
  const scope = { work: path.join(privateRoot, 'saved-input-audit-owned'), privateRoot, path,
    includeCurrent586Endpoints: false, includeCurrent586CachedOriginals: true, baselinePackInvocation: null,
    privateWeatherPackJsonReadsClosed: () => false, firstError,
    fs: { realpath: async () => privateRoot, rm: async () => { removals++; } } };
  await assert.rejects(vm.runInNewContext('(async () => { try { throw firstError; } finally {' + cleanup + '} })()', scope),
    error => error === firstError);
  assert.equal(removals, 0, 'unknown CURRENT worker/read ownership must not be discarded');
});

test('CURRENT586 restoration S facade: fixed checkpoint GET is default OFF',async()=>{
  const query='?document_key=eq.ravscore-continuation-checkpoint&select=document_key,payload,version&limit=2';
  let requested=0;
  for(const includeCurrent586Checkpoint of [undefined,false]){
    const clients=createReadOnlySavedWeatherClients({...credentials,includeCurrent586Checkpoint,
      fetchImpl:async()=>{requested++;return Response.json([]);}});
    await assert.rejects(clients.request(query),/REMOTE_TARGET_FORBIDDEN/);
  }
  assert.throws(()=>createReadOnlySavedWeatherClients({...credentials,includeCurrent586Checkpoint:'true',
    fetchImpl:async()=>{requested++;return Response.json([]);}}),/READ_CREDENTIALS_UNAVAILABLE/);
  assert.equal(requested,0);
});

test('CURRENT586 restoration S facade: only explicit fixed GET key and shape reach transport',async()=>{
  const query='?document_key=eq.ravscore-continuation-checkpoint&select=document_key,payload,version&limit=2';
  const expected=credentials.supabaseUrl+'/rest/v1/admin_documents'+query,calls=[];
  const rows=[{document_key:'ravscore-continuation-checkpoint',payload:{synthetic:true},version:7}];
  const clients=createReadOnlySavedWeatherClients({...credentials,includeCurrent586Checkpoint:true,
    fetchImpl:async(url,options)=>{calls.push({url,method:options.method,redirect:options.redirect});return Response.json(rows);}});
  assert.deepEqual(await clients.request(query),rows);
  assert.deepEqual(calls,[{url:expected,method:'GET',redirect:'error'}]);
  for(const target of [
    expected.replace('storage.example.test','other.example.test'),expected+'&extra=true',expected+'&limit=2',
    expected.replace('document_key,payload,version','document_key,version'),expected.replace('limit=2','limit=3'),
    expected.replace('eq.ravscore-continuation-checkpoint','eq.another-checkpoint')]){
    await assert.rejects(clients.guardedFetch(target),/REMOTE_TARGET_FORBIDDEN/);
  }
  await assert.rejects(clients.guardedFetch(expected,{method:'HEAD'}),/REMOTE_TARGET_FORBIDDEN/);
  for(const method of ['POST','PUT','PATCH','DELETE'])await assert.rejects(clients.guardedFetch(expected,{method}),/REMOTE_WRITE_FORBIDDEN/);
  await assert.rejects(clients.guardedFetch(expected,{body:'forbidden'}),/REMOTE_WRITE_FORBIDDEN/);
  await assert.rejects(clients.storage.uploadImmutable(),/REMOTE_WRITE_FORBIDDEN/);
  assert.equal(calls.length,1);
});

test('CURRENT586 restoration S facade: actual normal checkpoint body and shared request budgets stay bounded',async()=>{
  const {PROTECTED_RAVSCORE_CHECKPOINT_RESTORE_MAXIMUM_RESPONSE_BYTES:maximum}=await import('./protected-ravscore-continuation-checkpoint.mjs');
  assert.ok(maximum>2*1024*1024);
  const query='?document_key=eq.ravscore-continuation-checkpoint&select=document_key,payload,version&limit=2';
  const rows=[{document_key:'ravscore-continuation-checkpoint',payload:{padding:'x'.repeat(2*1024*1024)},version:7}];
  const positive=createReadOnlySavedWeatherClients({...credentials,includeCurrent586Checkpoint:true,
    fetchImpl:async()=>Response.json(rows)});
  const actual=await positive.request(query);
  assert.equal(actual[0].payload.padding.length,2*1024*1024);assert.equal(actual[0].version,7);
  let requests=0;
  const tooLarge=createReadOnlySavedWeatherClients({...credentials,includeCurrent586Checkpoint:true,
    fetchImpl:async()=>{requests++;return new Response('{}',{headers:{'content-length':String(maximum+1)}});}});
  await assert.rejects(tooLarge.request(query),/REMOTE_BODY_BOUND/);assert.equal(requests,1);
  const onlyOnce=createReadOnlySavedWeatherClients({...credentials,includeCurrent586Checkpoint:true,maximumRequests:1,
    fetchImpl:async()=>Response.json([])});
  await onlyOnce.request(query);await assert.rejects(onlyOnce.request(query),/REMOTE_READ_BOUND/);
  let now=0;
  const timed=createReadOnlySavedWeatherClients({...credentials,includeCurrent586Checkpoint:true,
    maximumMilliseconds:1000,clock:()=>now,fetchImpl:async()=>{now+=600;return Response.json([]);}});
  await timed.request(query);await assert.rejects(timed.request(query),/REMOTE_READ_BOUND/);
});

// Disse additive tilfælde beviser afslag/rapportkontrakt, IKKE den positive Python-producentkæde.
test('B-only DMI-metadata afviser alle blandede modes før I/O', async () => {
  const base = { mode: 'audit', includeDmiProcessingMetadata: true };
  for (const mutation of [{ mode: 'describe' }, { includeDmiProcessingMetadata: 'true' },
    { progressSource }, { progressFile: 'secret-error-canary' }, { progressCacheKey },
    { progressBaselineTargetHour: '2026-09-29T17:00:00.000Z' }, { includeRawManifest: true },
    { includeRawFilePresence: true }, { rawCacheKey: 'secret-error-canary' },
    { rawManifestSource: 'secret-error-canary' }, { includeSelectedCurrentPreflight: true },
    { includeCurrentWindowDiagnostic: true }, { includeCurrent586Endpoints: true },
    { includeCurrent586CachedOriginals: true }, { prepareCurrentForwardOriginals: true },
    { prepareCurrent586Originals: true }]) {
    const report = await auditSavedWeatherInputs({ ...base, ...mutation });
    assert.equal(report.status, 'AUDIT_FAILED_CLOSED'); assert.equal(report.code, 'MODE_INVALID');
    assert.equal(report.phase, 'SETUP'); assert.equal(report.providerRequestsPerformed, false);
  }
});

for (const [name, mutation, code] of [
  ['manglende kandidat', {}, 'DMI_PROCESSING_METADATA_UNAVAILABLE'],
  ['ændret B før restore', { changedAt: 2 }, 'CURRENT_GENERATION_CHANGED'],
  ['ændret B efter restore', { changedAt: 4 }, 'CURRENT_GENERATION_CHANGED'],
  ['beskadiget B', { corrupt: true }, 'PROTECTED_RESTORE_REJECTED'],
  ['forkert arkiveret kilde', { wrongContracts: true }, 'PREDECESSOR_CONTRACT_MISMATCH'],
  ['beskadiget komponentpakke', { nativeProofs: true, baselinePackTamper: true }, 'BASELINE_COMPONENT_PACK_REJECTED'],
]) test('B-only DMI-metadata: ' + name + ' giver intet falsk metadata-PASS', async t => {
  const { options, privateRoot, calls } = await fixture(t, mutation);
  const { progressSource: ignoredSource, progressFile: ignoredFile, progressCacheKey: ignoredKey, ...bOnly } = options;
  const report = await auditSavedWeatherInputs({ ...bOnly, includeDmiProcessingMetadata: true });
  assert.equal(report.status, 'AUDIT_FAILED_CLOSED'); assert.equal(report.code, code, JSON.stringify(report));
  assert.equal(report.exactProgressAuthenticated, false);
  assert.equal(report.providerRequestsPerformed, false); assert.equal(report.remoteWrites, false);
  assert.equal(Object.hasOwn(report, 'dmiProcessingMetadata'), false);
  assert.ok(calls.every(row => ['GET', 'HEAD'].includes(row.method)));
  safeReport(report, privateRoot);
});

test('DMI-metadatas lukkede rapport accepterer kun summerede faste årsager; ingen Python-PASS påstås', async () => {
  const source = await fs.readFile(new URL('./audit-saved-weather-inputs.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('function validateSavedDmiProcessingMetadataReport(');
  const end = source.indexOf('async function measureSavedDmiProcessingMetadata(', start);
  assert.ok(start >= 0 && end > start);
  const validate = vm.runInNewContext('(' + source.slice(start, end).trim() + ')', {
    same: (a, b) => JSON.stringify(a) === JSON.stringify(b), integer: Number.isSafeInteger,
    fail: code => { throw new Error(code); },
  });
  const valid = { kind: 'SAVED_DMI_PROCESSING_METADATA', status: 'MEASURED', targetCount: 673, hourCount: 118,
    collections: ['dkss_idw', 'dkss_lf', 'dkss_nsbs'].map(collection => ({ collection,
      locallySkipped: 4, missingStep: 1, incompleteStep: 1, normalStepRejected: 1, normalOutcomeRejected: 1 })) };
  assert.equal(validate(valid), valid);
  for (const mutate of [v => { v.privatePayload = 'secret-error-canary'; },
    v => { v.targetCount = 672; }, v => { v.hourCount = 117; }, v => { v.status = 'REFUSED'; },
    v => { v.collections[0].locallySkipped = 5; }, v => { v.collections[0].normalStepRejected = -1; },
    v => { v.collections[0].sourceAsset = 'secret-error-canary'; },
    v => { v.collections[0].collection = 'private-collection'; }, v => { v.collections.pop(); },
    v => { v.collections[0].missingStep = 119; }]) {
    const changed = structuredClone(valid); mutate(changed);
    assert.throws(() => validate(changed), /DMI_PROCESSING_METADATA_INVALID/);
  }
  safeReport(valid, 'private-canary');
});

test('den faktiske indlejrede DMI-læser bruger normal producent og codec på syntetiske metadata, ikke autentificeret B', async t => {
  const folder = await temp(t);
  const audit = await fs.readFile(new URL('./audit-saved-weather-inputs.mjs', import.meta.url), 'utf8');
  const prefix = 'const SAVED_DMI_PROCESSING_METADATA_READER = ';
  const start = audit.indexOf(prefix);
  const end = audit.indexOf(';\n', start);
  assert.ok(start >= 0 && end > start, 'læs præcis den indlejrede kildekonstant');
  const reader = JSON.parse(audit.slice(start + prefix.length, end));
  const setup = String.raw`
import ast
import copy
import hashlib
import importlib.util
import json
import pathlib
import sys
from datetime import datetime, timedelta, timezone

def deny_socket_events(event, args):
    if event.startswith("socket."):
        raise AssertionError("SYNTHETIC_NETWORK_FORBIDDEN")

sys.addaudithook(deny_socket_events)
root, folder = map(pathlib.Path, sys.argv[1:])
sys.path.insert(0, str(root / "scripts"))
spec = importlib.util.spec_from_file_location("synthetic_saved_dmi_producer", root / "scripts/update-dmi-bulk.py")
producer = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = producer
spec.loader.exec_module(producer)
from lib.dmi_bulk_storage import write_dmi_bulk_document

# Genbrug kun de eksisterende rene fixturefunktioner, ikke deres top-level prøver.
fixture = root / "scripts/test-copernicus-target-registry-4.0.244.py"
functions = ("utc", "write", "official_asset", "source", "processed_run", "dmi_document")
nodes = {node.name: node for node in ast.parse(fixture.read_text("utf-8")).body
         if isinstance(node, ast.FunctionDef) and node.name in functions}
assert set(nodes) == set(functions)
reference = datetime(2026, 8, 21, 8, tzinfo=timezone.utc)
at = reference.isoformat().replace("+00:00", "Z")
namespace = {"producer": producer, "copy": copy, "datetime": datetime, "timedelta": timedelta,
             "Path": pathlib.Path, "json": json, "REFERENCE": reference, "AT": at,
             "MODEL_RUN": (reference - timedelta(hours=3)).isoformat().replace("+00:00", "Z"),
             "STALE_MODEL_RUN": (reference - timedelta(hours=6)).isoformat().replace("+00:00", "Z")}
exec(compile(ast.Module(body=[nodes[name] for name in functions], type_ignores=[]), str(fixture), "exec"), namespace)
targets = [{"partId": f"synthetic-part-{i:03}", "parentZoneId": f"synthetic-zone-{i % 210:03}",
            "waterPoint": [8.0, 55.0]} for i in range(673)]
hours = producer.operational_current_valid_times(reference)
assert len(hours) == 118
# Ingen numeriske strømværdier: fixturekonstruktøren markerer resterende dele spatialt utilgængelige.
document = namespace["dmi_document"](targets, verified_hours=set())
catalogs = {}
for collection in sorted(producer.MARINE_COLLECTIONS):
    steps = document["runs"][collection]["processedSteps"]
    del steps[hours[0]]
    steps[hours[1]]["complete"] = False
    steps[hours[2]]["parserVersion"] = "synthetic-obsolete-parser"
    del steps[hours[3]]["currentPartOutcomeProof"]
    assets = [namespace["official_asset"](collection, hour) for hour in hours]
    catalogs[collection] = (namespace["MODEL_RUN"], assets,
        {"catalogInventoryComplete": True, "requiredHorizonEndCovered": True,
         "requiredRowsTruncatedByAssetLimit": 0, "officialRequiredValidTimeCount": 118,
         "officialRequiredValidTimes": hours, "officialRequiredAssets": assets})
document["diagnostics"]["currentOperationalLedger"] = producer.build_current_operational_ledger(
    document, targets, reference, catalogs)
conditions = {"productionReferenceAt": at,
    "zones": {f"synthetic-zone-{i:03}": {} for i in range(210)},
    "coastalParts": {"parts": {row["partId"]: {"zoneId": row["parentZoneId"],
        "waterPoint": row["waterPoint"]} for row in targets}}}
candidate = folder / "candidate.json"
condition_file = folder / "conditions.json"
write_dmi_bulk_document(candidate, document)
namespace["write"](condition_file, conditions)
print(json.dumps({"reference": at,
    "candidateSha256": hashlib.sha256(candidate.read_bytes()).hexdigest(),
    "conditionsSha256": hashlib.sha256(condition_file.read_bytes()).hexdigest()}))
`;
  const python = process.env.PYTHON ?? 'python';
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    /^(?:PATH|SYSTEMROOT|WINDIR|TEMP|TMP|TMPDIR|LANG|LC_ALL)$/i.test(key)));
  const options = { cwd: repositoryRoot, env, encoding: 'utf8', timeout: 30_000,
    maxBuffer: 1024 * 1024, windowsHide: true };
  const prepared = spawnSync(python, ['-I', '-c', setup, repositoryRoot, folder], options);
  assert.ifError(prepared.error);
  assert.equal(prepared.status, 0, 'normal syntetisk producent/codec skal faktisk kunne bygge input; ingen B-autoritet\n' + prepared.stderr);
  const binding = JSON.parse(prepared.stdout);
  const candidate = path.join(folder, 'candidate.json');
  const conditions = path.join(folder, 'conditions.json');
  const run = (conditionFile, conditionsSha256) => spawnSync(python,
    ['-I', '-c', reader, repositoryRoot, candidate, binding.candidateSha256,
      conditionFile, conditionsSha256, binding.reference], options);
  const result = run(conditions, binding.conditionsSha256);
  assert.ifError(result.error);
  assert.equal(result.status, 0, 'den præcise indlejrede læser skal faktisk acceptere normal syntetisk metadata\n' + result.stdout + result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    kind: 'SAVED_DMI_PROCESSING_METADATA', status: 'MEASURED', targetCount: 673, hourCount: 118,
    collections: ['dkss_idw', 'dkss_lf', 'dkss_nsbs'].map(collection => ({ collection,
      locallySkipped: 4, missingStep: 1, incompleteStep: 1, normalStepRejected: 1, normalOutcomeRejected: 1 })),
  });
  // Det ugyldige input får sin rigtige SHA: afslag skal komme fra metadata, ikke en opdigtet hash.
  const invalid = JSON.stringify({ productionReferenceAt: binding.reference, zones: {}, coastalParts: { parts: {} } });
  const invalidConditions = path.join(folder, 'invalid-conditions.json');
  await write(folder, 'invalid-conditions.json', invalid);
  const refused = run(invalidConditions, crypto.createHash('sha256').update(invalid).digest('hex'));
  assert.equal(refused.status, 1);
  assert.deepEqual(JSON.parse(refused.stdout), { kind: 'SAVED_DMI_PROCESSING_METADATA', status: 'REFUSED' });
  assert.doesNotMatch(refused.stderr, /Traceback/);
});
