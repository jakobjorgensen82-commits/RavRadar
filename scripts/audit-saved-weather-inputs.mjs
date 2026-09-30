#!/usr/bin/env node
// Stage A only: authenticated saved bytes and original-context availability.
// No provider, semantic union, score/cache build, promotion or remote writes.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as protectedApi from './protected-private-production-runtime.mjs';
import { buildSupabaseAdminHeaders } from './lib/supabase-admin-rest.mjs';
import { createR2PrivateRuntimeStorage } from './lib/r2-private-runtime-storage.mjs';
import { PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_FILES,
  PRIVATE_WEATHER_COMPONENT_PACK_FILE, PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE,
  privateWeatherComponentMarker } from './lib/private-weather-component-inventory.mjs';
import { inspectDmiForecastFile, readDmiForecastRecord } from './lib/dmi-forecast-file.mjs';
import { readDmiBulkDocument } from './lib/dmi-bulk-storage.mjs';
import { unpackDmiPartContinuity, assertDmiPartContinuityTotalSize } from './lib/dmi-part-continuity.mjs';
import { originalContextForProtectedDmiCurrent } from './lib/protected-dmi-current-context.mjs';
import { createProtectedDmiNativeCurrentInspector } from './lib/protected-dmi-native-current-proofs.mjs';
import { unpackPrivateWeatherComponentPack } from './lib/private-weather-component-pack.mjs';
import { safeWeatherComponentSummary } from './lib/weather-component-safe-summary.mjs';
import { weatherComponentProgressCache, withAuthenticatedWeatherProgress,
  WEATHER_PROGRESS_CIPHER_PATH, WEATHER_PROGRESS_MAX_CIPHER_BYTES } from './weather-component-progress-cache.mjs';

const REPOSITORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = protectedApi.PROTECTED_PRIVATE_RUNTIME_POLICY;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const stable = value => JSON.stringify(value, (_key, item) => object(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const same = (a, b) => stable(a) === stable(b);
const fail = code => { const error = new Error(code); error.auditCode = code; throw error; };
const inside = (root, file) => { const rel = path.relative(root, file); return rel === ''
  || rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); };
const integer = value => Number.isSafeInteger(value) && value >= 0;
const safeCode = new Set(['MODE_INVALID', 'PRIVATE_ROOT_INVALID', 'PRIVATE_PATH_INVALID',
  'LOCAL_METADATA_INVALID', 'SOURCE_IDENTITY_INVALID', 'PREDECESSOR_ROOT_INVALID',
  'PREDECESSOR_CONTRACT_MISMATCH', 'CURRENT_GENERATION_CHANGED', 'PROTECTED_RESTORE_REJECTED',
  'EXACT_CURRENT_NOT_RESTORED', 'BUNDLE_IDENTITY_MISMATCH', 'READ_CREDENTIALS_UNAVAILABLE',
  'REMOTE_WRITE_FORBIDDEN', 'REMOTE_READ_BOUND', 'REMOTE_READ_CONCURRENT', 'REMOTE_READ_FAILED',
  'REMOTE_TARGET_FORBIDDEN', 'REMOTE_BODY_BOUND',
  'REMOTE_REDIRECT_FORBIDDEN', 'POINTER_READ_FAILED', 'PRIVATE_BUCKET_UNAVAILABLE',
  'ARCHIVE_MEASUREMENT_INVALID', 'PROGRESS_IDENTITY_INVALID', 'PROGRESS_BINDING_FAILED',
  'PROGRESS_AUTHENTICATION_REJECTED', 'FORECAST_INSPECTION_FAILED', 'ORIGINAL_GEOMETRY_INVALID',
  'BULK_CONTEXT_INVALID', 'CONTINUITY_INSPECTION_FAILED', 'AUDIT_COUNTER_INVALID', 'OUTPUT_ALREADY_EXISTS',
  'PRIVATE_TEMP_CLEANUP_FAILED', 'BASELINE_COMPONENT_PACK_REJECTED', 'NATIVE_PROOF_INSPECTION_FAILED']);

function identity(value) {
  const keys = 'bundleContentSha256,contractHashes,datasetId,expectedPartCount,expectedZoneCount,generatedAt,kind,modelBinding,privatePayloadIncluded,productionReferenceAt,schemaVersion,sourceHead';
  if (!object(value) || Object.keys(value).sort().join(',') !== keys
    || value.schemaVersion !== '1.0.0' || value.kind !== policy.currentSourceKind
    || !/^[a-f0-9]{40}$/.test(value.sourceHead ?? '') || !/^[a-f0-9]{64}$/.test(value.bundleContentSha256 ?? '')
    || !/^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value.datasetId ?? '')
    || value.expectedPartCount !== 673 || value.expectedZoneCount !== 210 || value.privatePayloadIncluded !== false
    || !object(value.modelBinding) || !object(value.contractHashes)
    || Object.keys(value.contractHashes).length < 3 || Object.keys(value.contractHashes).length > 16
    || !['continuationStateContractSha256', 'fullRuntimeContractSha256', 'publicProjectionContractSha256']
      .every(key => Object.hasOwn(value.contractHashes, key))
    || Object.entries(value.contractHashes).some(([key, hash]) => !/^[a-z][A-Za-z0-9]{0,63}Sha256$/.test(key)
      || !/^[a-f0-9]{64}$/.test(hash))) fail('SOURCE_IDENTITY_INVALID');
  for (const field of ['productionReferenceAt', 'generatedAt']) if (typeof value[field] !== 'string'
    || !Number.isFinite(Date.parse(value[field])) || new Date(value[field]).toISOString() !== value[field]) fail('SOURCE_IDENTITY_INVALID');
  return value;
}

// Credentials may be write-capable; this facade is not. Archived readers only
// receive these methods, never a mutating storage client or unrestricted fetch.
export function createReadOnlySavedWeatherClients({
  supabaseUrl = process.env.SUPABASE_URL, serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  accountId = process.env.RAVRADAR_R2_ACCOUNT_ID, accessKeyId = process.env.RAVRADAR_R2_ACCESS_KEY_ID,
  secretAccessKey = process.env.RAVRADAR_R2_SECRET_ACCESS_KEY, fetchImpl = globalThis.fetch,
  describeOnly = false, maximumRequests = 40, maximumMilliseconds = 300_000,
  clock = () => performance.now(),
} = {}) {
  let base;
  try { base = new URL(supabaseUrl); } catch { fail('READ_CREDENTIALS_UNAVAILABLE'); }
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash
    || typeof serviceRoleKey !== 'string' || !serviceRoleKey.trim()
    || !integer(maximumRequests) || maximumRequests < 1 || maximumRequests > 40
    || !integer(maximumMilliseconds) || maximumMilliseconds < 1 || maximumMilliseconds > 300_000) fail('READ_CREDENTIALS_UNAVAILABLE');
  if (!describeOnly && (!/^[a-f0-9]{32}$/.test(accountId ?? '') || !accessKeyId || !secretAccessKey)) fail('READ_CREDENTIALS_UNAVAILABLE');
  const r2Origin = describeOnly ? null : `https://${accountId}.eu.r2.cloudflarestorage.com`;
  const bucketPath = `/${policy.bucketId}`;
  let requests = 0, transferredBytes = 0, currentDescriptor = null;
  let networkMilliseconds = 0, reading = false, timedOut = false;
  const objects = new Map();
  const allowedObjects = new Set();
  async function guardedFetch(target, options = {}) {
    const method = String(options.method ?? 'GET').toUpperCase();
    if (!['GET', 'HEAD'].includes(method) || options.body != null) fail('REMOTE_WRITE_FORBIDDEN');
    let url;
    try { url = new URL(target); } catch { fail('REMOTE_TARGET_FORBIDDEN'); }
    const pointer = method === 'GET' && url.origin === base.origin && url.pathname === '/rest/v1/admin_documents'
      && [...url.searchParams.keys()].sort().join(',') === 'document_key,limit,select'
      && url.searchParams.get('document_key') === `eq.${policy.documentKey}`
      && url.searchParams.get('select') === 'document_key,payload,version' && url.searchParams.get('limit') === '2';
    const bucket = method === 'HEAD' && url.origin === r2Origin && url.pathname === bucketPath && !url.search;
    const objectPath = url.pathname.startsWith(`${bucketPath}/`) ? url.pathname.slice(bucketPath.length + 1) : null;
    const archive = method === 'GET' && url.origin === r2Origin && !url.search && allowedObjects.has(objectPath);
    if (url.username || url.password || url.hash || !(pointer || bucket || archive)) fail('REMOTE_TARGET_FORBIDDEN');
    if (reading) fail('REMOTE_READ_CONCURRENT');
    if (timedOut || requests >= maximumRequests || networkMilliseconds >= maximumMilliseconds) fail('REMOTE_READ_BOUND');
    const started = clock();
    if (!Number.isFinite(started)) fail('REMOTE_READ_BOUND');
    const allowance = Math.min(60_000, maximumMilliseconds - networkMilliseconds);
    requests++; reading = true;
    const controller = new AbortController();
    const boundError = Object.assign(new Error('REMOTE_READ_BOUND'), { auditCode: 'REMOTE_READ_BOUND' });
    let response = null, reader = null, expired = false, rejectDeadline;
    const deadline = new Promise((_resolve, reject) => { rejectDeadline = reject; });
    deadline.catch(() => {});
    const cancelUnawaited = () => {
      try { Promise.resolve(reader ? reader.cancel() : response?.body?.cancel?.()).catch(() => {}); } catch {}
    };
    const expire = () => {
      if (expired) return;
      expired = true; timedOut = true; controller.abort();
      cancelUnawaited(); rejectDeadline(boundError);
    };
    const timer = setTimeout(expire, allowance);
    const assertTime = () => {
      const elapsed = clock() - started;
      if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= allowance) expire();
      if (expired) throw boundError;
    };
    const readWithinBudget = async operation => {
      Promise.resolve(operation).catch(() => {});
      assertTime();
      const result = await Promise.race([operation, deadline]);
      assertTime();
      return result;
    };
    const chunks = []; let bytes = 0;
    try {
      const fetchPromise = Promise.resolve().then(() => fetchImpl(url.href, { ...options, method,
        redirect: 'error', signal: controller.signal }));
      // A non-cooperative transport may settle after timeout. Cancel its late
      // body, and keep this client closed rather than start an overlapping GET.
      fetchPromise.then(lateResponse => {
        if (expired) { try { Promise.resolve(lateResponse.body?.cancel?.()).catch(() => {}); } catch {} }
      }, () => {});
      response = await readWithinBudget(fetchPromise);
      if (response.redirected || response.status >= 300 && response.status < 400) fail('REMOTE_REDIRECT_FORBIDDEN');
      const maximum = archive ? policy.maximumArchiveBytes : 2 * 1024 * 1024;
      const declared = response.headers?.get?.('content-length');
      if (declared != null && (!/^\d+$/.test(declared) || Number(declared) > maximum)) fail('REMOTE_BODY_BOUND');
      if (method === 'HEAD') {
        await readWithinBudget(Promise.resolve(response.body?.cancel?.()));
        return new Response(null, { status: response.status });
      }
      if (response.body) {
        reader = response.body.getReader();
        while (true) {
          const item = await readWithinBudget(reader.read()); if (item.done) break;
          bytes += item.value.byteLength; transferredBytes += item.value.byteLength;
          if (bytes > maximum || transferredBytes > 2 * policy.maximumArchiveAggregateBytes + 16 * 1024 * 1024) fail('REMOTE_BODY_BOUND');
          chunks.push(Buffer.from(item.value));
        }
      }
      assertTime();
    } catch (error) {
      if (!expired) {
        try { await readWithinBudget(Promise.resolve(reader ? reader.cancel() : response?.body?.cancel?.())); }
        catch (cleanupError) { if (expired) throw boundError; }
      }
      if (expired) throw boundError;
      if (safeCode.has(error?.auditCode)) throw error;
      fail('REMOTE_READ_FAILED');
    } finally {
      clearTimeout(timer);
      const elapsed = clock() - started;
      // Only active HTTP/body-read sections consume the five-minute total.
      // Offline archive/crypto/native-proof CPU between requests does not.
      networkMilliseconds += Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : allowance;
      if (expired || !Number.isFinite(elapsed) || elapsed < 0) timedOut = true;
      try { reader?.releaseLock(); } catch {}
      reading = false;
    }
    const body = Buffer.concat(chunks, bytes);
    if (pointer && response.ok) {
      let rows;
      try { rows = JSON.parse(body.toString('utf8')); } catch { fail('POINTER_READ_FAILED'); }
      const descriptor = rows?.[0]?.payload?.current;
      if (object(descriptor)) {
        // The original protected reader performs full descriptor validation.
        // Only the current generation's narrow immutable paths can be fetched.
        currentDescriptor = descriptor;
        allowedObjects.clear();
        for (const entry of descriptor.objects ?? [descriptor]) if (typeof entry?.objectPath === 'string'
          && /^bundles\/sha256\/(?:[a-f0-9]{64}\.json\.gz|[a-f0-9]{64}\/part-\d{3}-[a-f0-9]{64}\.json\.gz\.part)$/.test(entry.objectPath)) allowedObjects.add(entry.objectPath);
      }
    }
    if (archive && response.ok) objects.set(objectPath, body);
    return new Response(body, { status: response.status, headers: response.headers });
  }
  const request = async (suffix = '', options = {}) => {
    const response = await guardedFetch(`${base.origin}/rest/v1/admin_documents${suffix}`,
      { ...options, headers: buildSupabaseAdminHeaders(serviceRoleKey) });
    if (!response.ok) fail('POINTER_READ_FAILED');
    try { return await response.json(); } catch { fail('POINTER_READ_FAILED'); }
  };
  let storage;
  if (!describeOnly) {
    const r2 = createR2PrivateRuntimeStorage({ accountId, accessKeyId, secretAccessKey,
      bucketId: policy.bucketId, maximumObjectBytes: policy.maximumArchiveBytes,
      fetchImpl: guardedFetch, delayImpl: async () => {} });
    storage = { download: r2.download, ensurePrivateBucket: r2.ensurePrivateBucket,
      uploadImmutable: async () => fail('REMOTE_WRITE_FORBIDDEN'), removeExact: async () => fail('REMOTE_WRITE_FORBIDDEN'),
      anonymousStatus: async () => fail('REMOTE_TARGET_FORBIDDEN') };
  }
  return { request, storage, guardedFetch,
    async archiveMetrics() {
      const entries = currentDescriptor?.objects ?? (currentDescriptor ? [currentDescriptor] : []);
      if (!entries.length || entries.length !== objects.size) fail('ARCHIVE_MEASUREMENT_INVALID');
      const buffers = entries.map(entry => objects.get(entry.objectPath));
      if (buffers.some((bytes, i) => !bytes || bytes.length !== entries[i].objectBytes)) fail('ARCHIVE_MEASUREMENT_INVALID');
      let envelopeBytes = 0;
      await pipeline(Readable.from(buffers), createGunzip(), new Writable({ write(chunk, _encoding, done) {
        envelopeBytes += chunk.length;
        if (envelopeBytes > policy.maximumEnvelopeBytes) done(Object.assign(new Error('ARCHIVE_MEASUREMENT_INVALID'), { auditCode: 'ARCHIVE_MEASUREMENT_INVALID' }));
        else done();
      } }));
      const result = { objectBytes: buffers.reduce((sum, bytes) => sum + bytes.length, 0),
        objectCount: buffers.length, largestObjectBytes: Math.max(...buffers.map(bytes => bytes.length)), envelopeBytes };
      objects.clear();
      return result;
    },
  };
}

async function noSymlinks(root, candidate, { missingLeaf = false } = {}) {
  const requested = path.resolve(candidate);
  if (!inside(root, requested) || requested === root) fail('PRIVATE_PATH_INVALID');
  const segments = path.relative(root, requested).split(path.sep); let current = root;
  for (let i = 0; i < segments.length; i++) {
    current = path.join(current, segments[i]);
    const stat = await fs.lstat(current).catch(error => { if (missingLeaf && i === segments.length - 1 && error.code === 'ENOENT') return null; throw error; });
    if (!stat) return requested;
    if (stat.isSymbolicLink() || i < segments.length - 1 && !stat.isDirectory()) fail('PRIVATE_PATH_INVALID');
  }
  return requested;
}
async function context(privateRoot, repositoryRoot) {
  const requested = path.resolve(privateRoot);
  const stat = await fs.lstat(requested);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('PRIVATE_ROOT_INVALID');
  const root = await fs.realpath(requested), repository = await fs.realpath(repositoryRoot);
  const requestedTemps = [path.resolve(os.tmpdir()), ...(process.env.RUNNER_TEMP ? [path.resolve(process.env.RUNNER_TEMP)] : [])];
  const temps = await Promise.all(requestedTemps.map(temp => fs.realpath(temp)));
  if (inside(root, repository) || inside(repository, root) || !temps.some(temp => root !== temp && inside(temp, root))) fail('PRIVATE_ROOT_INVALID');
  // A symlink in an ancestor must not make an outside path appear private.
  const temp = [...requestedTemps, ...temps].find(item => inside(item, requested));
  if (!temp) fail('PRIVATE_ROOT_INVALID');
  await noSymlinks(temp, requested);
  return { root, repository };
}
async function readJson(file, maximum = 1024 * 1024) {
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 2 || stat.size > maximum) fail('LOCAL_METADATA_INVALID');
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { fail('LOCAL_METADATA_INVALID'); }
}
async function newOutput(root, file) {
  const target = await noSymlinks(root, file, { missingLeaf: true });
  if (await fs.lstat(target).catch(error => { if (error.code === 'ENOENT') return null; throw error; })) fail('OUTPUT_ALREADY_EXISTS');
  return target;
}
const fixedFiles = new Map([...PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE,
  PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE].map(file => [file.relativePath, file.id]));
const progressFiles = new Map(Object.entries(PRIVATE_WEATHER_COMPONENT_FILES).map(([id, file]) => [file, id]));
progressFiles.set('data/live/dmi-forecast-cache.json', 'dmiForecast');
progressFiles.set('data/live/dmi-water-stations.json', 'dmiStations');
function fileMetrics(files, names) {
  const named = {}; let bytes = 0, largestFileBytes = 0, otherFiles = 0, otherBytes = 0;
  for (const file of files) {
    if (!integer(file.bytes)) fail('AUDIT_COUNTER_INVALID');
    bytes += file.bytes; largestFileBytes = Math.max(largestFileBytes, file.bytes);
    const name = names.get(file.relativePath);
    if (name) named[name] = file.bytes;
    else { otherFiles++; otherBytes += file.bytes; }
  }
  return { fileCount: files.length, bytes, largestFileBytes, named, otherFiles, otherBytes };
}
async function forecastIndex(file) {
  if (!file) return null;
  try { return await inspectDmiForecastFile(file); } catch { fail('FORECAST_INSPECTION_FAILED'); }
}
function forecastMetrics(index) {
  return index ? { status: 'PRESENT', bytes: index.bytes, zoneCount: index.zones.size,
    largestRecordBytes: index.largestRecordBytes, continuityEntries: index.continuity?.entries.length ?? 0,
    maximumBytes: policy.maximumFilePayloadBytes } : { status: 'NOT_PRESENT' };
}
function originalParts(conditions) {
  if (!object(conditions?.zones) || Object.keys(conditions.zones).length !== 210
    || !object(conditions.coastalParts?.parts) || Object.keys(conditions.coastalParts.parts).length !== 673) fail('ORIGINAL_GEOMETRY_INVALID');
  const parts = new Map();
  for (const [partId, row] of Object.entries(conditions.coastalParts.parts)) {
    if (!partId || !object(row) || typeof row.zoneId !== 'string' || !Object.hasOwn(conditions.zones, row.zoneId)
      || !Array.isArray(row.waterPoint) || row.waterPoint.length !== 2 || !row.waterPoint.every(Number.isFinite)
      || Math.abs(row.waterPoint[0]) > 180 || Math.abs(row.waterPoint[1]) > 90) fail('ORIGINAL_GEOMETRY_INVALID');
    parts.set(partId, { partId, zoneId: row.zoneId, waterPoint: row.waterPoint,
      landPoint: row.landPoint, onshoreDirectionDeg: row.onshoreDirectionDeg });
  }
  return parts;
}
async function bulk(file) { if (!file) return null; try { return await readDmiBulkDocument(file); } catch { fail('BULK_CONTEXT_INVALID'); } }

async function visitSavedPartCurrents(index, parts, inspectRow = () => {}) {
  const counts = { entries: 0, rows: 0, finiteCurrentPairs: 0, geometryMismatchEntries: 0 };
  if (!index?.continuity) return { status: 'NOT_PRESENT', counts };
  const meta = index.continuity.metadata;
  if (meta.partCount !== parts.size || index.continuity.entries.length !== parts.size) fail('CONTINUITY_INSPECTION_FAILED');
  let rawBytes = 0, compressedBytes = 0, lastId = null;
  try {
    if (!integer(meta.rawBytes) || meta.rawBytes < 1 || !integer(meta.compressedBytes) || meta.compressedBytes < 1) fail('CONTINUITY_INSPECTION_FAILED');
    assertDmiPartContinuityTotalSize(meta.rawBytes, meta.compressedBytes);
    for (const descriptor of index.continuity.entries) {
      const entry = await readDmiForecastRecord(index, descriptor);
      const part = parts.get(entry.partId);
      if (!part || lastId !== null && entry.partId.localeCompare(lastId) <= 0) fail('CONTINUITY_INSPECTION_FAILED');
      lastId = entry.partId;
      // Same existing per-entry validator, bounded to one authentic entry.
      // Original aggregate framing is independently checked below.
      const decoded = await unpackDmiPartContinuity({ ...meta, partCount: 1, rawBytes: entry.rawBytes,
        compressedBytes: entry.compressedBytes, entries: [entry] }, [part], meta.productionReferenceAt);
      rawBytes += entry.rawBytes; compressedBytes += entry.compressedBytes; counts.entries++;
      if (!decoded.has(entry.partId)) { counts.geometryMismatchEntries++; continue; }
      for (const row of decoded.get(entry.partId).hourly) {
        counts.rows++;
        if (!Number.isFinite(row.currentUMps) || !Number.isFinite(row.currentVMps)) continue;
        counts.finiteCurrentPairs++;
        await inspectRow(row, part);
      }
    }
    if (rawBytes !== meta.rawBytes || compressedBytes !== meta.compressedBytes) fail('CONTINUITY_INSPECTION_FAILED');
  } catch { fail('CONTINUITY_INSPECTION_FAILED'); }
  return { status: 'MEASURED', rawBytes, compressedBytes, counts };
}

export async function measureSavedCurrentContexts(index, parts, baselineContext, progressContext) {
  const counts = { baselineContextAccepted: 0, progressContextAccepted: 0,
    eitherContextAccepted: 0, baselineOnly: 0, progressOnly: 0, noSavedContext: 0 };
  const measured = await visitSavedPartCurrents(index, parts, (row, part) => {
    const oldAccepted = Boolean(originalContextForProtectedDmiCurrent(row, [baselineContext], `PART::${part.partId}`, part));
    const progressAccepted = Boolean(originalContextForProtectedDmiCurrent(row, [progressContext], `PART::${part.partId}`, part));
    if (oldAccepted) counts.baselineContextAccepted++;
    if (progressAccepted) counts.progressContextAccepted++;
    if (oldAccepted || progressAccepted) counts.eitherContextAccepted++; else counts.noSavedContext++;
    if (oldAccepted && !progressAccepted) counts.baselineOnly++;
    if (progressAccepted && !oldAccepted) counts.progressOnly++;
  });
  return { ...measured, counts: { ...measured.counts, ...counts } };
}

const NATIVE_DONORS = Object.freeze(['baselineBulk', 'baselineActive', 'baselineCandidate',
  'progressActive', 'progressCandidate']);
const NATIVE_REJECTIONS = Object.freeze({
  DMI_NATIVE_PROOF_SELECTION_INVALID: 'invalidSelection',
  DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING: 'missingEndpoint',
  DMI_NATIVE_PROOF_NATIVE_CONFLICT: 'conflictingNative',
  DMI_NATIVE_PROOF_PROJECTION_MISMATCH: 'projectionMismatch',
  DMI_NATIVE_PROOF_ENDPOINT_MISMATCH: 'endpointMismatch',
  DMI_NATIVE_PROOF_CONTEXT_INVALID: 'invalidContext',
  DMI_NATIVE_PROOF_CONTEXT_CONFLICT: 'invalidContext',
  DMI_NATIVE_PROOF_DONOR_BOUND: 'donorBound',
});
const nativeRejections = () => Object.fromEntries([...new Set(Object.values(NATIVE_REJECTIONS)),
  'otherRejected'].map(key => [key, 0]));

// Inspect one authentic donor at a time, with only small PART/hour bit masks
// retained between passes. A complete proof in one donor is not a semantic
// union, an artifactgate pass, or proof that a future generation saves it.
export async function measureSavedNativeProofAvailability({ baselineIndex, progressIndex,
  parts, donorFiles } = {}) {
  if (!(parts instanceof Map) || parts.size < 1 || parts.size > 673 || !object(donorFiles)
    || Object.keys(donorFiles).some(key => !NATIVE_DONORS.includes(key))) fail('NATIVE_PROOF_INSPECTION_FAILED');
  const snapshots = Object.entries({ baseline: baselineIndex, progress: progressIndex }).map(([name, index]) => ({
    name, index, masks: new Map(), counts: null, donorProofs: Object.fromEntries(NATIVE_DONORS.map(label => [label,
      { status: donorFiles[label] ? 'PRESENT' : 'NOT_PRESENT', completeProofPairs: 0,
        unprovedPairs: 0, rejections: nativeRejections() }])) }));
  for (const [donorNumber, label] of NATIVE_DONORS.entries()) {
    if (!donorFiles[label]) continue;
    // Loading the next donor only happens after the preceding inspector and
    // document fall out of scope. No five-document national heap is built.
    await inspectDonor(donorFiles[label], donorNumber, label);
  }
  async function inspectDonor(file, donorNumber, label) {
    const document = await bulk(file);
    const inspector = createProtectedDmiNativeCurrentInspector({ contexts: [document] });
    for (const snapshot of snapshots) {
      let finiteDmiCurrentSelections = 0;
      const measured = await visitSavedPartCurrents(snapshot.index, parts, (row, part) => {
        if (row.sources?.current?.provider !== 'dmi') return;
        finiteDmiCurrentSelections++;
        const key = `${part.partId}\u0000${row.time}`;
        if (!snapshot.masks.has(key)) {
          if (snapshot.masks.size >= 673 * 121) fail('NATIVE_PROOF_INSPECTION_FAILED');
          snapshot.masks.set(key, 0);
        }
        const result = inspector.inspect({ part, row });
        const counts = snapshot.donorProofs[label];
        if (result?.ok === true) {
          counts.completeProofPairs++;
          snapshot.masks.set(key, snapshot.masks.get(key) | (1 << donorNumber));
        } else {
          counts.unprovedPairs++;
          const reason = Object.hasOwn(NATIVE_REJECTIONS, result?.code)
            ? NATIVE_REJECTIONS[result.code] : 'otherRejected';
          counts.rejections[reason]++;
        }
      });
      const counts = { ...measured.counts, finiteDmiCurrentSelections,
        nonDmiCurrentSelections: measured.counts.finiteCurrentPairs - finiteDmiCurrentSelections };
      if (snapshot.counts && !same(snapshot.counts, counts)) fail('NATIVE_PROOF_INSPECTION_FAILED');
      snapshot.counts = counts;
    }
  }
  const result = {};
  for (const snapshot of snapshots) {
    if (!snapshot.counts) {
      let finiteDmiCurrentSelections = 0;
      const measured = await visitSavedPartCurrents(snapshot.index, parts, row => {
        if (row.sources?.current?.provider === 'dmi') finiteDmiCurrentSelections++;
      });
      snapshot.counts = { ...measured.counts, finiteDmiCurrentSelections,
        nonDmiCurrentSelections: measured.counts.finiteCurrentPairs - finiteDmiCurrentSelections };
    }
    const counts = { ...snapshot.counts, completeProofInAtLeastOneDonor: 0,
      completeProofInBaselineDonor: 0, completeProofInProgressDonor: 0,
      baselineOnlyCompleteProof: 0, progressOnlyCompleteProof: 0, notProvedInAnyDonor: 0 };
    for (const mask of snapshot.masks.values()) {
      const baseline = Boolean(mask & 7), progress = Boolean(mask & 24);
      if (mask) counts.completeProofInAtLeastOneDonor++;
      if (baseline) counts.completeProofInBaselineDonor++;
      if (progress) counts.completeProofInProgressDonor++;
      if (baseline && !progress) counts.baselineOnlyCompleteProof++;
      if (progress && !baseline) counts.progressOnlyCompleteProof++;
    }
    counts.notProvedInAnyDonor = counts.finiteDmiCurrentSelections - counts.completeProofInAtLeastOneDonor;
    result[snapshot.name] = { status: snapshot.index?.continuity ? 'MEASURED' : 'NOT_PRESENT',
      counts, donorProofs: snapshot.donorProofs };
  }
  return { geometryScope: 'AUTHENTICATED_BASELINE_PARTS_ONLY',
    selectionScope: 'PERSISTED_PART_CURRENT_CONTINUITY', registeredParts: parts.size,
    crossDonorCombinationChecked: false, nativeRowsSynthesized: false,
    artifactGatePassed: false, ...result };
}

function baseReport(status) {
  return { schemaVersion: 1, kind: 'SAVED_WEATHER_INPUT_AUDIT', status,
    protectedGenerationReadbackVerified: false, exactArchivedSourceContractsVerified: false,
    exactProgressAuthenticated: false, providerRequestsPerformed: false, remoteWrites: false,
    semanticUnionPerformed: false, replayPerformed: false, cacheBuilt: false,
    futureContextPersistenceProved: false, publicDeploymentProved: false, privatePayloadIncluded: false };
}

// Existing credential-free pack validation may spawn Python. Do not let those
// local children inherit storage, provider or GitHub credentials. The network
// clients and decryption arguments have already captured their exact inputs.
export async function withoutSavedAuditSecrets(inspect) {
  const removed = Object.entries(process.env).filter(([key]) => /(?:SECRET|TOKEN|PASSWORD|API_KEY|ACCESS_KEY)/i.test(key)
    || /^(?:SUPABASE_|RAVRADAR_R2_|WEATHER_PROGRESS_|DMI_|COPERNICUS|CMEMS_|OPEN_METEO_|MET_NORWAY_)/i.test(key));
  try {
    for (const [key] of removed) delete process.env[key];
    return await inspect();
  } finally {
    for (const [key, value] of removed) process.env[key] = value;
  }
}

export async function auditSavedWeatherInputs({ mode, privateRoot, descriptorPath, predecessorRoot,
  progressFile, progressSource, progressCacheKey, outputPath, repositoryRoot = REPOSITORY,
  repository = process.env.GITHUB_REPOSITORY, pythonExecutable = process.env.PYTHON ?? 'python',
  encryptionKey = process.env.WEATHER_PROGRESS_ENCRYPTION_KEY,
  masterSecret = process.env.WEATHER_PROGRESS_MASTER_SECRET,
  ...credentials
} = {}) {
  let work = null, safeOutput = null, phase = 'SETUP';
  try {
    if (!['describe', 'audit'].includes(mode)) fail('MODE_INVALID');
    const ctx = await context(privateRoot, repositoryRoot);
    // Windows may spell the same verified temp root with its 8.3 alias. Map
    // only lexical children of that already checked root, then inspect every
    // child component for symlinks using the canonical spelling.
    const resolvePrivate = value => typeof value === 'string' && inside(path.resolve(privateRoot), path.resolve(value))
      ? path.join(ctx.root, path.relative(path.resolve(privateRoot), path.resolve(value))) : value;
    descriptorPath = resolvePrivate(descriptorPath);
    progressFile = resolvePrivate(progressFile);
    outputPath = resolvePrivate(outputPath);
    safeOutput = await newOutput(ctx.root, outputPath);
    if (mode === 'describe') {
      const descriptor = await newOutput(ctx.root, descriptorPath);
      if (descriptor === safeOutput) fail('PRIVATE_PATH_INVALID');
      phase = 'DESCRIBE';
      const clients = createReadOnlySavedWeatherClients({ ...credentials, describeOnly: true });
      const source = identity(await protectedApi.describeCurrentProtectedPrivateProductionRuntime(clients));
      await fs.writeFile(descriptor, `${JSON.stringify(source)}\n`, { flag: 'wx', mode: 0o600 });
      const report = baseReport('SOURCE_DESCRIBED');
      await fs.writeFile(safeOutput, `${JSON.stringify(report)}\n`, { flag: 'wx', mode: 0o600 });
      return report;
    }
    phase = 'SOURCE_VALIDATION';
    const source = identity(await readJson(await noSymlinks(ctx.root, descriptorPath)));
    if (!/^\d+-[1-9]\d*$/.test(progressSource ?? '') || progressCacheKey !== `weather-private-progress-encrypted-v2-Linux-main-${progressSource}`
      || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')) fail('PROGRESS_IDENTITY_INVALID');
    const cipher = await noSymlinks(ctx.root, progressFile);
    const cipherStat = await fs.lstat(cipher);
    if (!cipherStat.isFile() || cipherStat.size < 1 || cipherStat.size > WEATHER_PROGRESS_MAX_CIPHER_BYTES) fail('PROGRESS_IDENTITY_INVALID');
    const requestedPredecessor = path.resolve(predecessorRoot);
    const predecessorStat = await fs.lstat(requestedPredecessor);
    const predecessor = await fs.realpath(requestedPredecessor);
    if (!predecessorStat.isDirectory() || predecessorStat.isSymbolicLink()
      || inside(ctx.root, predecessor) || inside(predecessor, ctx.root)
      || inside(ctx.repository, predecessor) || inside(predecessor, ctx.repository)) fail('PREDECESSOR_ROOT_INVALID');
    const predecessorTemp = [path.resolve(os.tmpdir()), ...(process.env.RUNNER_TEMP ? [path.resolve(process.env.RUNNER_TEMP)] : [])]
      .find(temp => inside(temp, requestedPredecessor));
    if (!predecessorTemp) fail('PREDECESSOR_ROOT_INVALID');
    await noSymlinks(predecessorTemp, requestedPredecessor);
    const importOld = async relative => import(`${pathToFileURL(await noSymlinks(predecessor, path.join(predecessor, relative))).href}?savedInput=${source.sourceHead}`);
    const [oldProtected, oldWorkflow, oldBinding] = await Promise.all([
      importOld('scripts/protected-private-production-runtime.mjs'), importOld('scripts/private-production-runtime-workflow.mjs'), importOld('js/core/ravscore-model-contract.js')]);
    if (!same(oldBinding.ravScoreModelBinding(), source.modelBinding)
      || !same(await oldWorkflow.privateRuntimeContractHashes({ repositoryRoot: predecessor }), source.contractHashes)) fail('PREDECESSOR_CONTRACT_MISMATCH');
    const clients = createReadOnlySavedWeatherClients(credentials);
    if (!same(await oldProtected.describeCurrentProtectedPrivateProductionRuntime(clients), source)) fail('CURRENT_GENERATION_CHANGED');
    work = await fs.mkdtemp(path.join(ctx.root, 'saved-input-audit-'));
    const bundlePath = path.join(work, 'bundle');
    phase = 'PROTECTED_RESTORE';
    const restored = await withoutSavedAuditSecrets(() => oldProtected.restoreProtectedPrivateProductionRuntime({ ...clients,
      privateRoot: work, bundlePath, repositoryRoot: predecessor,
      expected: { modelBinding: source.modelBinding, contractHashes: source.contractHashes,
        datasetId: source.datasetId, productionReferenceAt: source.productionReferenceAt, generatedAt: source.generatedAt,
        targetReferenceAt: source.productionReferenceAt, minimumReferenceAt: source.productionReferenceAt, minimumGeneratedAt: source.generatedAt },
    })).catch(() => fail('PROTECTED_RESTORE_REJECTED'));
    if (restored.restored !== true || restored.rollbackSelected !== false || restored.bundleContentSha256 !== source.bundleContentSha256) fail('EXACT_CURRENT_NOT_RESTORED');
    if (!same(await oldProtected.describeCurrentProtectedPrivateProductionRuntime(clients), source)) fail('CURRENT_GENERATION_CHANGED');
    const manifest = await readJson(path.join(bundlePath, 'manifest.json'));
    if (manifest.bundleContentSha256 !== source.bundleContentSha256) fail('BUNDLE_IDENTITY_MISMATCH');
    phase = 'CAPACITY';
    const archive = await clients.archiveMetrics();
    const payloadRoot = path.join(bundlePath, 'payload');
    const protectedFiles = fileMetrics(manifest.files, fixedFiles);
    const conditions = await readJson(path.join(payloadRoot, 'data/live/conditions.json'), 535_822_312);
    const parts = originalParts(conditions);
    const baselineIndex = await forecastIndex(path.join(payloadRoot, 'data/live/dmi-forecast-cache.json'));
    phase = 'BASELINE_COMPONENT_AUTHENTICATION';
    let baselineComponentFiles = [];
    try {
      const componentPackPresent = manifest.files.some(file => file.relativePath === PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
      if (privateWeatherComponentMarker(conditions) && !componentPackPresent) fail('BASELINE_COMPONENT_PACK_REJECTED');
      if (componentPackPresent) baselineComponentFiles = await withoutSavedAuditSecrets(() => unpackPrivateWeatherComponentPack({
        restoredRoot: payloadRoot, outputRoot: path.join(work, 'baseline-components'), conditions, pythonExecutable,
      }));
    } catch { fail('BASELINE_COMPONENT_PACK_REJECTED'); }
    const basePath = path.join(work, 'progress-base.json');
    const captured = await weatherComponentProgressCache({ mode: 'capture-base', repositoryRoot: payloadRoot,
      basePath, repository, protectedBundleSha256: source.bundleContentSha256 });
    if (captured.captured !== true) fail('PROGRESS_BINDING_FAILED');
    await fs.mkdir(path.dirname(path.join(payloadRoot, WEATHER_PROGRESS_CIPHER_PATH)), { recursive: true, mode: 0o700 });
    await fs.copyFile(cipher, path.join(payloadRoot, WEATHER_PROGRESS_CIPHER_PATH), fs.constants.COPYFILE_EXCL);
    phase = 'PROGRESS_AUTHENTICATION';
    const measured = await withoutSavedAuditSecrets(() => withAuthenticatedWeatherProgress({ repositoryRoot: payloadRoot, basePath,
      repository, encryptionKey, masterSecret, pythonExecutable }, async ({ files, capacity }) => {
      if (Object.values(capacity).some(value => !integer(value))) fail('AUDIT_COUNTER_INVALID');
      phase = 'SAVED_INPUT_INSPECTION';
      const progressIndex = await forecastIndex(files.find(file => file.relativePath === 'data/live/dmi-forecast-cache.json')?.sourcePath);
      const donorFiles = {
        baselineBulk: path.join(payloadRoot, 'data/live/dmi-bulk-cache.json'),
        baselineActive: baselineComponentFiles.find(file => file.relativePath === PRIVATE_WEATHER_COMPONENT_FILES.dmiActive)?.sourcePath,
        baselineCandidate: baselineComponentFiles.find(file => file.relativePath === PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate)?.sourcePath,
        progressActive: files.find(file => file.relativePath === PRIVATE_WEATHER_COMPONENT_FILES.dmiActive)?.sourcePath,
        progressCandidate: files.find(file => file.relativePath === PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate)?.sourcePath,
      };
      // Keep the old context-only metric distinct from native proof. Release
      // these two document references before the bounded one-donor scan below.
      const originalContext = await (async () => {
        const baselineBulk = await bulk(donorFiles.baselineBulk), progressBulk = await bulk(donorFiles.progressActive);
        return { geometryScope: 'AUTHENTICATED_BASELINE_PARTS_ONLY', registeredParts: parts.size,
          progressActiveContextPresent: progressBulk !== null,
          baseline: await measureSavedCurrentContexts(baselineIndex, parts, baselineBulk, progressBulk),
          progress: await measureSavedCurrentContexts(progressIndex, parts, baselineBulk, progressBulk) };
      })();
      const nativeProofAvailability = await measureSavedNativeProofAvailability({ baselineIndex, progressIndex, parts, donorFiles });
      return { progress: { encryptedBytes: capacity.encryptedBytes, compressedBytes: capacity.compressedBytes,
        rawPackBytes: capacity.rawPackBytes, fileCount: capacity.fileCount, files: fileMetrics(files, progressFiles) },
      forecasts: { baseline: forecastMetrics(baselineIndex), progress: forecastMetrics(progressIndex) },
      originalContext, nativeProofAvailability };
    }));
    phase = 'FINAL_READBACK';
    if (!same(await oldProtected.describeCurrentProtectedPrivateProductionRuntime(clients), source)) fail('CURRENT_GENERATION_CHANGED');
    const report = { ...baseReport('AUDIT_COMPLETED'), protectedGenerationReadbackVerified: true,
      exactArchivedSourceContractsVerified: true, exactProgressAuthenticated: true,
      capacity: { protected: { ...archive, files: protectedFiles,
        rawPayloadBytes: protectedFiles.bytes + (await fs.stat(path.join(bundlePath, 'manifest.json'))).size }, progress: measured.progress,
      limits: { archiveBytes: policy.maximumArchiveAggregateBytes, envelopeBytes: policy.maximumEnvelopeBytes,
        fileBytes: policy.maximumFilePayloadBytes, rawPayloadBytes: policy.maximumRawPayloadBytes,
        progressCipherBytes: WEATHER_PROGRESS_MAX_CIPHER_BYTES, progressPackBytes: 768 * 1024 * 1024 } },
      forecasts: measured.forecasts, originalContext: measured.originalContext,
      nativeProofAvailability: measured.nativeProofAvailability,
      // This summary belongs to the protected, previously built baseline.
      // Acquisition progress does not contain a newly built conditions file.
      protectedBaselineComponentFallback: safeWeatherComponentSummary(conditions.weatherEngine?.componentFallback),
      resources: { maxRssBytes: process.resourceUsage().maxRSS * 1024, currentHeapBytes: process.memoryUsage().heapUsed } };
    phase = 'PRIVATE_CLEANUP';
    try { await fs.rm(work, { recursive: true, force: true }); work = null; }
    catch { fail('PRIVATE_TEMP_CLEANUP_FAILED'); }
    await fs.writeFile(safeOutput, `${JSON.stringify(report)}\n`, { flag: 'wx', mode: 0o600 });
    return report;
  } catch (error) {
    const code = safeCode.has(error?.auditCode) ? error.auditCode
      : phase === 'PROGRESS_AUTHENTICATION' ? 'PROGRESS_AUTHENTICATION_REJECTED' : 'AUDIT_FAILED_CLOSED';
    const report = { ...baseReport('AUDIT_FAILED_CLOSED'), phase, code };
    if (safeOutput) await fs.writeFile(safeOutput, `${JSON.stringify(report)}\n`, { flag: 'wx', mode: 0o600 }).catch(() => {});
    return report;
  } finally {
    if (work && path.dirname(work) === await fs.realpath(privateRoot).catch(() => null)
      && path.basename(work).startsWith('saved-input-audit-')) await fs.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), options = { mode: args.shift() };
    const names = { '--private-root': 'privateRoot', '--descriptor': 'descriptorPath', '--predecessor-root': 'predecessorRoot',
      '--progress-file': 'progressFile', '--progress-source': 'progressSource', '--progress-cache-key': 'progressCacheKey',
      '--output': 'outputPath', '--python': 'pythonExecutable' };
    while (args.length) { const key = args.shift(), value = args.shift();
      if (!names[key] || !value || value.startsWith('--') || Object.hasOwn(options, names[key])) fail('MODE_INVALID'); options[names[key]] = value; }
    const report = await auditSavedWeatherInputs(options);
    console.log(JSON.stringify(report));
    if (report.status === 'AUDIT_FAILED_CLOSED') process.exitCode = 1;
  } catch { console.error('SAVED_WEATHER_INPUT_AUDIT_FAILED_CLOSED'); process.exitCode = 1; }
}
