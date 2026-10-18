#!/usr/bin/env node
// Stage A only: authenticated saved bytes and original-context availability.
// Default: no providers, union, scoring or remote writes. One exact opt-in
// may rebuild normal inputs/score only in private scratch; no production authority.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
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
import { canonicalSavedDmiOriginalCapture as rawCapture } from './lib/saved-dmi-original-capture.mjs';
import { unpackDmiPartContinuity, assertDmiPartContinuityTotalSize } from './lib/dmi-part-continuity.mjs';
import { originalContextForProtectedDmiCurrent } from './lib/protected-dmi-current-context.mjs';
import { createProtectedDmiNativeCurrentInspector } from './lib/protected-dmi-native-current-proofs.mjs';
import { inspectDmiForecastGridSampling } from './lib/dmi-forecast-store.mjs';
import { dmiExpectedIdentityForPart, verifiedDmiNativeComponentSource,
  eligibleDmiNativeComponentSource, verifiedBulkCurrent } from './lib/ravscore-production-adapters.mjs';
import { unpackPrivateWeatherComponentPack, privateWeatherPackJsonReadsClosed } from './lib/private-weather-component-pack.mjs';
import { safeWeatherComponentSummary } from './lib/weather-component-safe-summary.mjs';
import { weatherComponentProgressCache, withAuthenticatedWeatherProgress,
  WEATHER_PROGRESS_CIPHER_PATH, WEATHER_PROGRESS_MAX_CIPHER_BYTES } from './weather-component-progress-cache.mjs';
import { buildCurrentGridSamplingOriginalRestoreExpectation } from './lib/bounded-conditions-predecessor-transition.mjs';
import { migratePostCutoverPrivateRuntime } from './migrate-post-cutover-private-runtime.mjs';
import { SAVED_DMI_ORIGINAL_SCOPES, savedDmiOriginalHistoryDemand,
  inspectSelectedSavedDmiOriginalCaptures, createSavedDmiOriginalDependencyDiscovery }
  from './prepare-saved-dmi-original-restore.mjs';

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
  'PRIVATE_TEMP_CLEANUP_FAILED', 'BASELINE_COMPONENT_PACK_REJECTED', 'NATIVE_PROOF_INSPECTION_FAILED',
  'RAW_MANIFEST_BOUND', 'RAW_CACHE_IDENTITY_INVALID', 'RAW_FILE_INVENTORY_REJECTED', 'PROGRESS_BASELINE_TARGET_INVALID',
  'PROGRESS_BASELINE_RECONSTRUCTION_REJECTED']);
const safeProgressAuthenticationCodes = new Set(['SIZE_BUDGET_INVALID', 'REPOSITORY_INVALID', 'ROOT_INVALID',
  'BASE_INVALID', 'ENCRYPTION_KEY_UNAVAILABLE', 'ENCRYPTION_KEY_INVALID', 'BASELINE_MISMATCH',
  'PATH_INVALID', 'SYMLINK_REJECTED', 'FILE_INVALID', 'SNAPSHOT_ABSENT', 'SNAPSHOT_INVALID',
  'SNAPSHOT_SCOPE_MISMATCH', 'SNAPSHOT_AUTHENTICATION_FAILED', 'SIZE_LIMIT', 'TEMPORARY_CLEANUP_FAILED']);
const safeProgressPackCodes = new Set(['WEATHER_PACK_PATH_NOT_ALLOWLISTED', 'WEATHER_PACK_SYMLINK_REJECTED',
  'WEATHER_PACK_FILE_SIZE_INVALID', 'WEATHER_PACK_STREAM_CLOSE_UNPROVED', 'WEATHER_PACK_JSON_SIZE_INVALID',
  'WEATHER_PACK_JSON_INVALID', 'WEATHER_PACK_JSON_CLOSE_UNPROVED', 'WEATHER_PACK_CP_INVENTORY_TIMEOUT',
  'WEATHER_PACK_CP_INVENTORY_UNAVAILABLE', 'WEATHER_PACK_CP_ORIGINALS_INVALID', 'WEATHER_PACK_CP_INVENTORY_INVALID',
  'WEATHER_PACK_OM_BANK_HASH_INVALID', 'WEATHER_PACK_REQUIRED_INPUT_MISSING_OR_CHANGED',
  'WEATHER_PACK_CP_PROGRESS_WITHOUT_BANK', 'WEATHER_PACK_CP_REFERENCE_INVALID', 'WEATHER_PACK_CP_ORIGINAL_CHANGED',
  'WEATHER_PACK_SIZE_LIMIT', 'WEATHER_PACK_TRUNCATED', 'WEATHER_PACK_FORMAT_INVALID',
  'WEATHER_PACK_MANIFEST_SIZE_INVALID', 'WEATHER_PACK_MANIFEST_INVALID', 'WEATHER_PACK_ENTRY_INVALID',
  'WEATHER_PACK_SIZE_INVALID', 'WEATHER_PACK_OUTPUT_CLOSE_UNPROVED', 'WEATHER_PACK_ENTRY_HASH_INVALID',
  'WEATHER_PACK_REFERENCE_INVENTORY_MISMATCH', 'WEATHER_PACK_ARCHIVE_CLOSE_UNPROVED']);

export function savedAuditProgressAuthenticationCode(error) {
  if (safeProgressAuthenticationCodes.has(error?.progressCode)) return error.progressCode;
  // The normal unpacker emits fixed codes as Error.message. Only an entire,
  // explicitly enumerated code may cross this boundary, never raw error text.
  return safeProgressPackCodes.has(error?.message) ? error.message : 'UNCLASSIFIED';
}

// The separate preparation CLI may retain only the audit's existing fixed
// categories and the normal GCM/pack selector, never an arbitrary error string.
export function savedAuditOriginalPreparationFailureCode(error) {
  try {
    if (safeCode.has(error?.auditCode)) return error.auditCode;
    const progressCode = savedAuditProgressAuthenticationCode(error);
    if (progressCode !== 'UNCLASSIFIED') return progressCode;
  } catch { /* Unknown/accessor-backed errors have no reporting authority. */ }
  return 'SAVED_DMI_ORIGINAL_PREPARATION_REFUSED';
}

function validateProgressBaselineTargetHour(value, source = null) {
  if (value === null) return;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value
    || source !== null && Date.parse(value) <= Date.parse(source.productionReferenceAt)) fail('PROGRESS_BASELINE_TARGET_INVALID');
}

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

async function visitSavedPartCurrents(index, parts, inspectRow = () => {}, inspectPart = null) {
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
      if (inspectPart) await inspectPart(decoded.get(entry.partId), part);
      for (const row of decoded.get(entry.partId).hourly) {
        counts.rows++;
        if (!Number.isFinite(row.currentUMps) || !Number.isFinite(row.currentVMps)) continue;
        counts.finiteCurrentPairs++;
        await inspectRow(row, part);
      }
    }
    if (rawBytes !== meta.rawBytes || compressedBytes !== meta.compressedBytes) fail('CONTINUITY_INSPECTION_FAILED');
  } catch (error) {
    if (error?.originalPlanCode) throw error;
    fail('CONTINUITY_INSPECTION_FAILED');
  }
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

const RAW_MANIFEST = '.cache/dmi-grib/asset-manifest.json';
const RAW_MANIFEST_MAX_BYTES = 16 * 1024 * 1024;
const RAW_MARINE_COLLECTIONS = new Set(['dkss_idw', 'dkss_nsbs', 'dkss_lf']);
const FIXED_RAW_MANIFEST_SOURCE = '38577766010-1';
const FIXED_RAW_MANIFEST_CACHE_KEY = `dmi-grib-v4-Linux-2026-W42-${FIXED_RAW_MANIFEST_SOURCE}`;
const FIXED_RAW_PROGRESS_SOURCE = '38692413809-1';
const FIXED_RAW_PROGRESS_CACHE_KEY = `weather-private-progress-encrypted-v2-Linux-main-${FIXED_RAW_PROGRESS_SOURCE}`;
const FIXED_RAW_PROGRESS_BASELINE_TARGET = '2026-10-14T18:00:00.000Z';
const RAW_INVENTORY_MAX_FILES = 200_000;
const rawSha = value => crypto.createHash('sha256').update(value).digest('hex');

// Exact metadata projection shared only with the separately invoked original
// restore planner. Exporting it adds no audit mode, transport or write ability.
export { rawCapture as canonicalSavedDmiOriginalCapture };
const withoutAcquiredAt = capture => Object.fromEntries(Object.entries(capture).filter(([key]) => key !== 'acquiredAt'));

export function indexSavedRawManifest(document) {
  const counts = { manifestRows: 0, validMarineRows: 0, otherCollectionRows: 0, invalidRows: 0 };
  const index = { status: 'MALFORMED', counts, exact: new Map(), withoutAcquired: new Map(), assets: new Set() };
  if (!object(document) || document.schemaVersion !== 2 || !object(document.assets)) return index;
  const rows = Object.entries(document.assets);
  if (rows.length > 200_000) fail('RAW_MANIFEST_BOUND');
  index.status = 'MEASURED';
  for (const [name, asset] of rows) {
    counts.manifestRows++;
    if (object(asset) && typeof asset.collection === 'string' && !RAW_MARINE_COLLECTIONS.has(asset.collection.trim())) {
      counts.otherCollectionRows++; continue;
    }
    const capture = rawCapture(asset), href = asset?.canonicalHref;
    if (!capture || typeof href !== 'string' || !href || href.length > 8192) { counts.invalidRows++; continue; }
    const canonicalHref = href.split('?')[0].split('#')[0];
    const suffix = path.posix.extname(canonicalHref);
    const expectedName = rawSha(canonicalHref).slice(0, 24) + (suffix && suffix !== '.' ? suffix : '.grib');
    if (name !== expectedName || path.posix.basename(name) !== name || name.includes('\\')
      || rawSha(href.trim().split('?')[0].split('#')[0]) !== capture.assetIdentitySha256) {
      counts.invalidRows++; continue;
    }
    counts.validMarineRows++;
    const exact = stable(capture), relaxed = stable(withoutAcquiredAt(capture));
    index.exact.set(exact, (index.exact.get(exact) ?? 0) + 1);
    index.withoutAcquired.set(relaxed, (index.withoutAcquired.get(relaxed) ?? 0) + 1);
    index.assets.add(capture.assetIdentitySha256);
  }
  return index;
}

async function savedRawManifest(repositoryRoot) {
  const file = path.join(repositoryRoot, RAW_MANIFEST);
  let checked;
  try { checked = await noSymlinks(repositoryRoot, file); }
  catch (error) {
    if (error.code === 'ENOENT') return { ...indexSavedRawManifest(null), status: 'MISSING' };
    throw error;
  }
  const stat = await fs.lstat(checked);
  if (!stat.isFile() || stat.size < 2 || stat.size > RAW_MANIFEST_MAX_BYTES) fail('RAW_MANIFEST_BOUND');
  // No RAW file path is opened or hashed. The cache is not provenance authority.
  let document;
  try { document = JSON.parse(await fs.readFile(checked, 'utf8')); }
  catch { return indexSavedRawManifest(null); }
  return indexSavedRawManifest(document);
}

// Filename/size metadata only. A 24-hex prefix is deliberately weaker than
// the full captured asset identity and can never qualify content or new use.
export async function inspectSavedRawFileInventory(repositoryRoot) {
  try {
    const root = await fs.realpath(repositoryRoot);
    const requested = path.join(root, path.posix.dirname(RAW_MANIFEST));
    let directory;
    try { directory = await noSymlinks(root, requested); }
    catch (error) {
      if (error.code === 'ENOENT') return { status: 'MISSING', byPrefix: new Map(), fileCandidates: 0, otherRegularFiles: 0 };
      throw error;
    }
    const before = await fs.lstat(directory);
    if (!before.isDirectory() || before.isSymbolicLink()) fail('RAW_FILE_INVENTORY_REJECTED');
    const names = await fs.readdir(directory);
    if (names.length > RAW_INVENTORY_MAX_FILES) fail('RAW_FILE_INVENTORY_REJECTED');
    const byPrefix = new Map();
    let fileCandidates = 0, otherRegularFiles = 0;
    for (const name of names) {
      if (path.basename(name) !== name || /[\\/\0]/.test(name)) fail('RAW_FILE_INVENTORY_REJECTED');
      // The producer emits hash[:24] + Path(canonicalHref).suffix, or
      // '.grib' when suffix is empty. The suffix contains exactly one dot.
      const match = /^([a-f0-9]{24})(\.[^./\\?#\0]+)$/.exec(name);
      const stat = await fs.lstat(path.join(directory, name));
      if (stat.isSymbolicLink() || !stat.isFile() || !integer(stat.size)) fail('RAW_FILE_INVENTORY_REJECTED');
      if (!match) { otherRegularFiles++; continue; }
      const candidates = byPrefix.get(match[1]) ?? [];
      candidates.push(stat.size);
      byPrefix.set(match[1], candidates);
      fileCandidates++;
    }
    await noSymlinks(root, directory);
    const after = await fs.lstat(directory);
    if (!after.isDirectory() || after.isSymbolicLink() || after.dev !== before.dev || after.ino !== before.ino
      || after.mtimeMs !== before.mtimeMs) fail('RAW_FILE_INVENTORY_REJECTED');
    return { status: 'MEASURED', byPrefix, fileCandidates, otherRegularFiles };
  } catch { fail('RAW_FILE_INVENTORY_REJECTED'); }
}

const rawFileCandidateCounts = () => ({ potentialFileCandidates: 0, missing: 0, ambiguous: 0, sizeMismatch: 0 });

export function measureSavedRawCaptureMatches(document, parts, index, rawFileInventory = null) {
  const counts = { nativeCurrentRows: 0, rejectedNativeRows: 0,
    excludedByCurrentPolicyRows: 0, samplingReceiptPresentRows: 0, invalidCaptureRows: 0,
    exactCaptureMatchRows: 0, ambiguousExactCaptureRows: 0, acquiredAtOnlyMismatchRows: 0,
    assetIdentityAbsentRows: 0, otherRevisionOrContentMismatchRows: 0, unclassifiedRows: 0 };
  const filePresence = rawFileInventory ? { manifestAssetIdentityPresent: rawFileCandidateCounts(),
    unmanifestedFilenameCandidates: rawFileCandidateCounts(), manifestUnavailable: rawFileCandidateCounts() } : null;
  for (const part of parts.values()) {
    const expected = dmiExpectedIdentityForPart(part), zone = document?.zones?.[expected?.entityId];
    if (!object(zone?.hourly)) continue;
    if (Object.keys(zone.hourly).length > 10_000) fail('RAW_MANIFEST_BOUND');
    for (const row of Object.values(zone.hourly)) {
      if (!Number.isFinite(row?.['current-u']) || !Number.isFinite(row?.['current-v'])) continue;
      const source = row.sources?.current;
      counts.nativeCurrentRows++;
      if (!object(source) || ['nativeSteps', 'nativeValidTimes', 'temporalResolution', 'forecastAgeHours'].some(key => Object.hasOwn(source, key))
        || !verifiedDmiNativeComponentSource(source, row.time, 'current', expected)
        || !verifiedBulkCurrent(document, zone, part.waterPoint, source, row.time, expected)) {
        counts.rejectedNativeRows++; continue;
      }
      if (!eligibleDmiNativeComponentSource(source, row.time, 'current', expected)) {
        counts.excludedByCurrentPolicyRows++; continue;
      }
      // Receipt presence is the planner's skip rule, not a coherence assertion.
      if (source.nativeGridSampling != null) { counts.samplingReceiptPresentRows++; continue; }
      const capture = rawCapture(source);
      if (!capture) { counts.invalidCaptureRows++; continue; }
      if (filePresence) {
        const group = index.status !== 'MEASURED' ? filePresence.manifestUnavailable
          : index.assets.has(capture.assetIdentitySha256) ? filePresence.manifestAssetIdentityPresent
          : filePresence.unmanifestedFilenameCandidates;
        const candidates = rawFileInventory.byPrefix.get(capture.assetIdentitySha256.slice(0, 24)) ?? [];
        if (candidates.length === 0) group.missing++;
        else if (candidates.length > 1) group.ambiguous++;
        else if (candidates[0] !== capture.contentLengthBytes) group.sizeMismatch++;
        else group.potentialFileCandidates++;
      }
      if (index.status !== 'MEASURED') { counts.unclassifiedRows++; continue; }
      const exact = index.exact.get(stable(capture)) ?? 0;
      if (exact === 1) counts.exactCaptureMatchRows++;
      else if (exact > 1) counts.ambiguousExactCaptureRows++;
      else if (index.withoutAcquired.has(stable(withoutAcquiredAt(capture)))) counts.acquiredAtOnlyMismatchRows++;
      else if (!index.assets.has(capture.assetIdentitySha256)) counts.assetIdentityAbsentRows++;
      else counts.otherRevisionOrContentMismatchRows++;
    }
  }
  return { status: index.status, counts, ...(filePresence ? { filePresence } : {}) };
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

// Diagnostic only: exact persisted forecast source, never a donor-based receipt repair.
function savedSamplingCounter() {
  return { rows: 0, coherent: 0, unknown: 0, contradictory: 0, sourceInvalid: 0,
    coherentNativeEndpoints: 0, unknownNativeEndpoints: 0, contradictoryNativeEndpoints: 0,
    topReceipt: { absent: 0, null: 0, present: 0 },
    endpointReceipt: { absent: 0, null: 0, present: 0, invalidStep: 0 }, missingEndpointList: 0 };
}
function savedReceiptShape(value) {
  return !object(value) || !Object.hasOwn(value, 'nativeGridSampling') ? 'absent'
    : value.nativeGridSampling === null ? 'null' : 'present';
}
function savedSamplingSummary(parts, bStateTimes) {
  return { sourceScope: 'PERSISTED_ROW_SOURCES_CURRENT_NOT_REPLAY_SELECTION',
    boundaryScope: 'AUTHENTICATED_B_INTEGRATED_STATE_TIME_NOT_CENTRAL_S',
    boundaryPartsKnown: bStateTimes?.size ?? 0, boundaryPartsUnknown: parts.size - (bStateTimes?.size ?? 0),
    all: savedSamplingCounter(), atOrBeforeBState: savedSamplingCounter(),
    afterBState: savedSamplingCounter(), unknownBState: savedSamplingCounter() };
}
function countSavedSampling(summary, row, part, bStateTimes) {
  const source = row.sources.current;
  const inspected = inspectDmiForecastGridSampling(source, 'current', row.time, dmiExpectedIdentityForPart(part));
  const stateTime = bStateTimes?.get(part.partId);
  const boundary = stateTime === undefined ? 'unknownBState'
    : Date.parse(row.time) <= Date.parse(stateTime) ? 'atOrBeforeBState' : 'afterBState';
  for (const counter of [summary.all, summary[boundary]]) {
    counter.rows++;
    counter[inspected.status === 'source-invalid' ? 'sourceInvalid' : inspected.status]++;
    counter.coherentNativeEndpoints += inspected.coherentNativeCount;
    counter.unknownNativeEndpoints += inspected.unknownNativeCount;
    counter.contradictoryNativeEndpoints += inspected.contradictoryNativeCount;
    counter.topReceipt[savedReceiptShape(source)]++;
    if (!Array.isArray(source.nativeSteps)) counter.missingEndpointList++;
    else for (const step of source.nativeSteps) {
      if (!object(step)) counter.endpointReceipt.invalidStep++;
      else counter.endpointReceipt[savedReceiptShape(step)]++;
    }
  }
}
function authenticatedBStateTimes(conditions, parts, staging, sampling) {
  const times = new Map();
  for (const [partId, part] of parts) {
    const state = conditions.coastalParts.parts[partId]?.ravScoreModel?.currentState;
    try {
      staging.assertIntegratedCoastalPointContinuation(state, {
        samplingContextKey: sampling.ravScoreSamplingContextKey(part),
      });
      // No timestamp, identifier, state or exception leaves the aggregate.
      times.set(partId, state.time);
    } catch { /* No fabricated boundary for a legacy/missing/incompatible B state. */ }
  }
  return times;
}

// Inspect one authentic donor at a time, with only small PART/hour bit masks
// retained between passes. A complete proof in one donor is not a semantic
// union, an artifactgate pass, or proof that a future generation saves it.
export async function measureSavedNativeProofAvailability({ baselineIndex, progressIndex,
  parts, donorFiles, rawManifest = null, rawFileInventory = null, bStateTimes = null } = {}) {
  if (!(parts instanceof Map) || parts.size < 1 || parts.size > 673 || !object(donorFiles)
    || Object.keys(donorFiles).some(key => !NATIVE_DONORS.includes(key))
    || bStateTimes !== null && (!(bStateTimes instanceof Map) || bStateTimes.size > parts.size
      || [...bStateTimes].some(([partId, time]) => !parts.has(partId) || typeof time !== 'string'
        || !/^\d{4}-\d\d-\d\dT\d\d:00:00\.000Z$/.test(time) || !Number.isFinite(Date.parse(time))
        || new Date(Date.parse(time)).toISOString() !== time))
    || rawFileInventory !== null && (rawManifest === null || !object(rawFileInventory)
      || !(rawFileInventory.byPrefix instanceof Map) || !['MEASURED', 'MISSING'].includes(rawFileInventory.status)
      || !integer(rawFileInventory.fileCandidates) || !integer(rawFileInventory.otherRegularFiles))) fail('NATIVE_PROOF_INSPECTION_FAILED');
  const snapshots = Object.entries({ baseline: baselineIndex, progress: progressIndex }).map(([name, index]) => ({
    name, index, masks: new Map(), counts: null, embeddedGridSampling: null, donorProofs: Object.fromEntries(NATIVE_DONORS.map(label => [label,
      { status: donorFiles[label] ? 'PRESENT' : 'NOT_PRESENT', completeProofPairs: 0,
        unprovedPairs: 0, rejections: nativeRejections() }])) }));
  const rawDonors = rawManifest ? Object.fromEntries(NATIVE_DONORS.map(label => [label, { status: 'NOT_PRESENT' }])) : null;
  for (const [donorNumber, label] of NATIVE_DONORS.entries()) {
    if (!donorFiles[label]) continue;
    // Loading the next donor only happens after the preceding inspector and
    // document fall out of scope. No five-document national heap is built.
    await inspectDonor(donorFiles[label], donorNumber, label);
  }
  async function inspectDonor(file, donorNumber, label) {
    const document = await bulk(file);
    if (rawDonors) rawDonors[label] = measureSavedRawCaptureMatches(document, parts, rawManifest, rawFileInventory);
    const inspector = createProtectedDmiNativeCurrentInspector({ contexts: [document] });
    for (const snapshot of snapshots) {
      const sampling = snapshot.embeddedGridSampling ? null : savedSamplingSummary(parts, bStateTimes);
      let finiteDmiCurrentSelections = 0;
      const measured = await visitSavedPartCurrents(snapshot.index, parts, (row, part) => {
        if (row.sources?.current?.provider !== 'dmi') return;
        finiteDmiCurrentSelections++;
        if (sampling) countSavedSampling(sampling, row, part, bStateTimes);
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
      if (sampling) snapshot.embeddedGridSampling = sampling;
    }
  }
  const result = {};
  for (const snapshot of snapshots) {
    if (!snapshot.counts) {
      const sampling = savedSamplingSummary(parts, bStateTimes);
      let finiteDmiCurrentSelections = 0;
      const measured = await visitSavedPartCurrents(snapshot.index, parts, (row, part) => {
        if (row.sources?.current?.provider === 'dmi') {
          finiteDmiCurrentSelections++;
          countSavedSampling(sampling, row, part, bStateTimes);
        }
      });
      snapshot.embeddedGridSampling = sampling;
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
      counts, donorProofs: snapshot.donorProofs, embeddedGridSampling: snapshot.embeddedGridSampling };
  }
  return { geometryScope: 'AUTHENTICATED_BASELINE_PARTS_ONLY',
    selectionScope: 'PERSISTED_PART_CURRENT_CONTINUITY', registeredParts: parts.size,
    crossDonorCombinationChecked: false, nativeRowsSynthesized: false,
    artifactGatePassed: false, ...result,
    ...(rawManifest ? { rawManifestCaptureCounts: { status: rawManifest.status,
      counts: rawManifest.counts, donors: rawDonors, rawFilesOpened: false,
      rawBytesVerified: false, sourceAdmissionPerformed: false,
      ...(rawFileInventory ? { inventoryMetadataInspected: true, fileInventoryStatus: rawFileInventory.status,
        fileInventoryCandidates: rawFileInventory.fileCandidates,
        otherRegularInventoryFiles: rawFileInventory.otherRegularFiles } : {}) } } : {}) };
}

// Only the normal selected collector is observed. No native union, restore
// plan or admission is built, and each failed part stops at its FIRST failure.
export async function measureSelectedSavedDmiOriginalPreflight({ baselineIndex, parts, demands,
  protectedBulk, progressCandidate = null, targetReferenceAt } = {}) {
  if (!(parts instanceof Map) || parts.size < 1 || parts.size > 673
    || !Array.isArray(demands) || demands.length !== parts.size
    || new Set(demands.map(row => row.partId)).size !== parts.size) fail('NATIVE_PROOF_INSPECTION_FAILED');
  const result = { status: 'UNAVAILABLE', inspectionScope: 'FIRST_FAILURE_PER_PART',
    selectionScope: 'NORMAL_PRIVATE_SELECTED_SOURCES', timeRelationKind: 'TARGET_48H_DIAGNOSTIC_RELATION',
    partsExpected: parts.size, partsVisited: 0, partsPassingCollector: 0, partsFirstFailure: 0,
    fullSelectedCoverageProved: false, originalFilesAvailableProved: false, artifactGatePassed: false,
    rawFilesOpened: false, firstFailureCounts: null, reasonCounts: null, codeCounts: null, timeRelationCounts: null };
  if (!baselineIndex?.continuity) return result;
  result.firstFailureCounts = { INSPECT_ORIGINALS_REJECTED: 0, SANITIZER_LOSS_UNCOVERED: 0, HOLD_SUPPORT_UNAVAILABLE: 0 };
  result.reasonCounts = Object.fromEntries([...Object.keys(NATIVE_REJECTIONS), 'DMI_NATIVE_PROOF_INVALID',
    'SANITIZER_CURRENT_LOSS_UNCOVERED', 'HOLD_SUPPORT_UNAVAILABLE'].map(code => [code, 0]));
  result.codeCounts = { SAVED_DMI_ORIGINAL_SELECTED_ENDPOINT_UNAVAILABLE: 0, SAVED_DMI_ORIGINAL_HOLD_SUPPORT_UNAVAILABLE: 0 };
  result.timeRelationCounts = { WITHIN_TARGET_48H: 0, BEFORE_TARGET_48H: 0, AFTER_TARGET: 0, UNAVAILABLE: 0 };
  const byPart = new Map(demands.map(row => [row.partId, row]));
  const dependencyDiscovery = createSavedDmiOriginalDependencyDiscovery({ protectedBulk, progressCandidate });
  const visited = await visitSavedPartCurrents(baselineIndex, parts, () => {}, (record, part) => {
    const measured = inspectSelectedSavedDmiOriginalCaptures({ protectedBulk, progressCandidate,
      persistedHourlyByPart: new Map([[part.partId, record]]), parts: new Map([[part.partId, part]]),
      demands: [byPart.get(part.partId)], targetReferenceAt, dependencyDiscovery });
    result.partsVisited++;
    if (measured.status === 'MEASURED') { result.partsPassingCollector++; return; }
    const failure = measured.firstFailure;
    if (measured.status !== 'PARTIAL' || !object(failure)
      || !Object.hasOwn(result.firstFailureCounts, failure.branch) || !Object.hasOwn(result.reasonCounts, failure.reasonCode)
      || !Object.hasOwn(result.codeCounts, failure.code) || !Object.hasOwn(result.timeRelationCounts, failure.target48hRelation)) fail('NATIVE_PROOF_INSPECTION_FAILED');
    result.partsFirstFailure++;
    result.firstFailureCounts[failure.branch]++; result.reasonCounts[failure.reasonCode]++;
    result.codeCounts[failure.code]++; result.timeRelationCounts[failure.target48hRelation]++;
  });
  if (visited.status !== 'MEASURED' || visited.counts.entries !== parts.size
    || visited.counts.geometryMismatchEntries !== 0 || result.partsVisited !== parts.size) fail('CONTINUITY_INSPECTION_FAILED');
  result.status = result.partsFirstFailure ? 'PARTIAL' : 'MEASURED';
  return result;
}

function baseReport(status) {
  return { schemaVersion: 1, kind: 'SAVED_WEATHER_INPUT_AUDIT', status,
    protectedGenerationReadbackVerified: false, exactArchivedSourceContractsVerified: false,
    exactProgressAuthenticated: false, normalProgressBaselineUsed: false, providerRequestsPerformed: false, remoteWrites: false,
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

// Reconstruct only the normal acquisition binder in separate private scratch.
// Inspection still reads the original authenticated archive, never this successor.
export async function prepareSavedAuditProgressBaseline({ privateRoot, workRoot = privateRoot, bundlePath, descriptorPath,
  repositoryRoot = REPOSITORY, progressBaselineTargetHour = null } = {}) {
  validateProgressBaselineTargetHour(progressBaselineTargetHour);
  const ctx = await context(privateRoot, repositoryRoot);
  const resolvePrivate = value => typeof value === 'string' && inside(path.resolve(privateRoot), path.resolve(value))
    ? path.join(ctx.root, path.relative(path.resolve(privateRoot), path.resolve(value))) : value;
  workRoot = resolvePrivate(workRoot);
  bundlePath = resolvePrivate(bundlePath);
  descriptorPath = resolvePrivate(descriptorPath);
  const workingRoot = path.resolve(workRoot) === ctx.root ? ctx.root : await noSymlinks(ctx.root, workRoot);
  if (!(await fs.lstat(workingRoot)).isDirectory()) fail('PRIVATE_ROOT_INVALID');
  const checkedBundle = await noSymlinks(ctx.root, bundlePath);
  const payloadRoot = await noSymlinks(ctx.root, path.join(checkedBundle, 'payload'));
  if (progressBaselineTargetHour === null) return { repositoryRoot: payloadRoot, normalProgressBaselineUsed: false };
  const source = identity(await readJson(await noSymlinks(ctx.root, descriptorPath)));
  validateProgressBaselineTargetHour(progressBaselineTargetHour, source);
  const expected = await buildCurrentGridSamplingOriginalRestoreExpectation({
    sourceDescription: source, targetReferenceAt: progressBaselineTargetHour,
  });
  if (expected === null) fail('PROGRESS_BASELINE_RECONSTRUCTION_REJECTED');
  const outputRoot = await newOutput(ctx.root, path.join(workingRoot, 'normal-progress-baseline'));
  const targetDescriptor = await newOutput(ctx.root, path.join(workingRoot, 'normal-progress-baseline-source.json'));
  const reportPath = await newOutput(ctx.root, path.join(workingRoot, 'normal-progress-baseline-report.json'));
  // The exact current generation has already been restored and read back.
  // The normal migrant consumes its target descriptor; preserve every other
  // authenticated field and keep the original descriptor and payload untouched.
  await fs.writeFile(targetDescriptor, `${JSON.stringify({ ...source, kind: policy.targetSourceKind })}\n`,
    { flag: 'wx', mode: 0o600 });
  const report = await migratePostCutoverPrivateRuntime({ sourceRoot: payloadRoot, outputRoot,
    bundleManifestPath: await noSymlinks(ctx.root, path.join(checkedBundle, 'manifest.json')),
    predecessorDescriptorPath: targetDescriptor, predecessorRoot: null, repositoryRoot: ctx.repository,
    expectedSourceHead: source.sourceHead, reportPath, currentGridOriginalOnly: true,
    currentGridOriginalExpectation: expected,
  });
  if (report.transitionKind !== 'CURRENT_GRID_ORIGINAL_ARCHIVE_BRIDGE'
    || report.measurementsChanged !== false || report.candidateStatesChanged !== false) fail('PROGRESS_BASELINE_RECONSTRUCTION_REJECTED');
  return { repositoryRoot: outputRoot, normalProgressBaselineUsed: true };
}

export async function auditSavedWeatherInputs({ mode, privateRoot, descriptorPath, predecessorRoot,
  progressFile, progressSource, progressCacheKey, outputPath, repositoryRoot = REPOSITORY,
  includeRawManifest = false, rawCacheKey = null, rawManifestSource = null,
  includeRawFilePresence = false, progressBaselineTargetHour = null, includeSelectedCurrentPreflight = false,
  includeCurrentWindowDiagnostic = false,
  prepareCurrentForwardOriginals = false,
  repository = process.env.GITHUB_REPOSITORY, pythonExecutable = process.env.PYTHON ?? 'python',
  encryptionKey = process.env.WEATHER_PROGRESS_ENCRYPTION_KEY,
  masterSecret = process.env.WEATHER_PROGRESS_MASTER_SECRET,
  ...credentials
} = {}) {
  let work = null, safeOutput = null, phase = 'SETUP';
  let baselinePackInvocation = null;
  let normalProgressBaselineUsed = false;
  try {
    if (typeof includeCurrentWindowDiagnostic !== 'boolean') fail('MODE_INVALID');
    const currentReplayDiagnostic = includeCurrentWindowDiagnostic && progressSource === '39066350748-1';
    if (typeof prepareCurrentForwardOriginals !== 'boolean'
      || prepareCurrentForwardOriginals && !currentReplayDiagnostic) fail('MODE_INVALID');
    if (currentReplayDiagnostic && (mode !== 'audit' || includeRawManifest || includeRawFilePresence
      || includeSelectedCurrentPreflight || rawCacheKey !== null || rawManifestSource !== null
      || progressCacheKey !== 'weather-private-progress-encrypted-v2-Linux-main-39066350748-1'
      || progressBaselineTargetHour !== '2026-10-17T20:00:00.000Z')) fail('MODE_INVALID');
    if (!currentReplayDiagnostic) {
    if (includeCurrentWindowDiagnostic && (mode !== 'audit' || includeRawManifest || includeRawFilePresence
      || includeSelectedCurrentPreflight || rawCacheKey !== null || rawManifestSource !== null
      || progressSource !== '39005745097-1'
      || progressCacheKey !== 'weather-private-progress-encrypted-v2-Linux-main-39005745097-1'
      || progressBaselineTargetHour !== '2026-10-17T05:00:00.000Z')) fail('MODE_INVALID');
    }
    if (!['describe', 'audit'].includes(mode) || typeof includeRawManifest !== 'boolean'
      || typeof includeSelectedCurrentPreflight !== 'boolean'
      || typeof includeRawFilePresence !== 'boolean' || includeRawFilePresence && !includeRawManifest
      || includeRawFilePresence && rawManifestSource !== FIXED_RAW_MANIFEST_SOURCE
      || mode !== 'audit' && (includeRawManifest || rawManifestSource !== null || progressBaselineTargetHour !== null)) fail('MODE_INVALID');
    if (includeSelectedCurrentPreflight && (mode !== 'audit' || includeRawManifest || includeRawFilePresence
      || rawCacheKey !== null || rawManifestSource !== null || !SAVED_DMI_ORIGINAL_SCOPES.some(scope =>
        scope.progressSource === progressSource && scope.progressCacheKey === progressCacheKey
        && scope.progressBaselineTargetHour === progressBaselineTargetHour))) fail('MODE_INVALID');
    validateProgressBaselineTargetHour(progressBaselineTargetHour);
    if (includeRawManifest ? typeof rawCacheKey !== 'string'
      || !/^dmi-grib-v4-Linux-\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])-\d+-[1-9]\d*$/.test(rawCacheKey)
      || (rawManifestSource === null ? !rawCacheKey.endsWith(`-${progressSource}`)
        : rawManifestSource !== FIXED_RAW_MANIFEST_SOURCE || rawCacheKey !== FIXED_RAW_MANIFEST_CACHE_KEY)
      : rawCacheKey !== null || rawManifestSource !== null) fail('RAW_CACHE_IDENTITY_INVALID');
    if (rawManifestSource !== null && (progressSource !== FIXED_RAW_PROGRESS_SOURCE
      || progressCacheKey !== FIXED_RAW_PROGRESS_CACHE_KEY
      || progressBaselineTargetHour !== FIXED_RAW_PROGRESS_BASELINE_TARGET)) fail('RAW_CACHE_IDENTITY_INVALID');
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
    // Reject malformed, same-hour and older targets before any remote read.
    validateProgressBaselineTargetHour(progressBaselineTargetHour, source);
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
    const [oldProtected, oldWorkflow, oldBinding, oldStaging, oldSampling] = await Promise.all([
      importOld('scripts/protected-private-production-runtime.mjs'), importOld('scripts/private-production-runtime-workflow.mjs'), importOld('js/core/ravscore-model-contract.js'),
      importOld('scripts/lib/coastal-point-staging-contract.mjs'), importOld('scripts/lib/ravscore-sampling-context.mjs')]);
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
    const bStateTimes = authenticatedBStateTimes(conditions, parts, oldStaging, oldSampling);
    const baselineIndex = await forecastIndex(path.join(payloadRoot, 'data/live/dmi-forecast-cache.json'));
    phase = 'BASELINE_COMPONENT_AUTHENTICATION';
    let baselineComponentFiles = [];
    try {
      const componentPackPresent = manifest.files.some(file => file.relativePath === PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
      if (privateWeatherComponentMarker(conditions) && !componentPackPresent) fail('BASELINE_COMPONENT_PACK_REJECTED');
      if (componentPackPresent) baselineComponentFiles = await withoutSavedAuditSecrets(() => {
        baselinePackInvocation = unpackPrivateWeatherComponentPack({
          restoredRoot: payloadRoot, outputRoot: path.join(work, 'baseline-components'), conditions, pythonExecutable,
        });
        return baselinePackInvocation;
      });
    } catch { fail('BASELINE_COMPONENT_PACK_REJECTED'); }
    if (progressBaselineTargetHour !== null) phase = 'PROGRESS_BASELINE_RECONSTRUCTION';
    // The exact B inventory is installed BEFORE any cipher is added. Never
    // pass the audit's cipher-bearing working payload to the strict B installer.
    const progressBaseline = includeCurrentWindowDiagnostic
      ? await withoutSavedAuditSecrets(async () => {
        const { prepareSavedCurrentWindowScratch, prepareSavedCurrentReplayScratch } = await import('./saved-current-window-scratch.mjs');
        if (currentReplayDiagnostic) return prepareSavedCurrentReplayScratch({
          scratchRoot: await noSymlinks(ctx.root, path.join(ctx.root, 'current-window-source')),
          logRoot: await noSymlinks(ctx.root, path.join(ctx.root, 'current-window-logs')), payloadRoot, source });
        return prepareSavedCurrentWindowScratch({
          scratchRoot: await noSymlinks(ctx.root, path.join(ctx.root, 'current-window-source')),
          logRoot: await noSymlinks(ctx.root, path.join(ctx.root, 'current-window-logs')), payloadRoot, source });
      })
      : progressBaselineTargetHour === null
        ? { repositoryRoot: payloadRoot, normalProgressBaselineUsed: false }
        : await withoutSavedAuditSecrets(() => prepareSavedAuditProgressBaseline({ privateRoot: ctx.root, workRoot: work, bundlePath,
          descriptorPath, repositoryRoot: ctx.repository, progressBaselineTargetHour }));
    normalProgressBaselineUsed = progressBaseline.normalProgressBaselineUsed;
    const progressBaselineRoot = progressBaseline.repositoryRoot;
    const basePath = path.join(work, 'progress-base.json');
    const captured = await weatherComponentProgressCache({ mode: 'capture-base', repositoryRoot: progressBaselineRoot,
      basePath, repository, protectedBundleSha256: source.bundleContentSha256 });
    if (captured.captured !== true) fail('PROGRESS_BINDING_FAILED');
    await fs.mkdir(path.dirname(path.join(progressBaselineRoot, WEATHER_PROGRESS_CIPHER_PATH)), { recursive: true, mode: 0o700 });
    await fs.copyFile(cipher, path.join(progressBaselineRoot, WEATHER_PROGRESS_CIPHER_PATH), fs.constants.COPYFILE_EXCL);
    phase = 'PROGRESS_AUTHENTICATION';
    const measured = await withoutSavedAuditSecrets(() => withAuthenticatedWeatherProgress({ repositoryRoot: progressBaselineRoot, basePath,
      repository, encryptionKey, masterSecret, pythonExecutable }, async ({ files, capacity }) => {
      if (Object.values(capacity).some(value => !integer(value))) fail('AUDIT_COUNTER_INVALID');
      if (includeCurrentWindowDiagnostic) return {
        progress: { encryptedBytes: capacity.encryptedBytes, compressedBytes: capacity.compressedBytes,
          rawPackBytes: capacity.rawPackBytes, fileCount: capacity.fileCount, files: fileMetrics(files, progressFiles) },
        currentWindowAuthenticatedOnly: true };
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
      const rawManifest = includeRawManifest ? await savedRawManifest(ctx.repository) : null;
      const rawFileInventory = includeRawFilePresence ? await inspectSavedRawFileInventory(ctx.repository) : null;
      const nativeProofAvailability = await measureSavedNativeProofAvailability({ baselineIndex, progressIndex, parts,
        donorFiles, rawManifest, rawFileInventory, bStateTimes });
      let selectedCurrentPreflight;
      if (includeSelectedCurrentPreflight) {
        if (!normalProgressBaselineUsed) fail('PROGRESS_BASELINE_RECONSTRUCTION_REJECTED');
        if (progressSource === '38768040429-1' && (!donorFiles.progressCandidate || donorFiles.progressActive)) fail('NATIVE_PROOF_INSPECTION_FAILED');
        const normalConditions = await readJson(path.join(progressBaselineRoot, 'data/live/conditions.json'), 535_822_312);
        const demands = savedDmiOriginalHistoryDemand({ conditions: normalConditions, parts,
          targetReferenceAt: progressBaselineTargetHour });
        const selectedIndex = await forecastIndex(path.join(progressBaselineRoot, 'data/live/dmi-forecast-cache.json'));
        selectedCurrentPreflight = await measureSelectedSavedDmiOriginalPreflight({ baselineIndex: selectedIndex, parts, demands,
          protectedBulk: await bulk(donorFiles.baselineBulk), progressCandidate: await bulk(donorFiles.progressCandidate),
          targetReferenceAt: progressBaselineTargetHour });
      }
      return { progress: { encryptedBytes: capacity.encryptedBytes, compressedBytes: capacity.compressedBytes,
        rawPackBytes: capacity.rawPackBytes, fileCount: capacity.fileCount, files: fileMetrics(files, progressFiles) },
      forecasts: { baseline: forecastMetrics(baselineIndex), progress: forecastMetrics(progressIndex) },
      originalContext, nativeProofAvailability, ...(selectedCurrentPreflight ? { selectedCurrentPreflight } : {}) };
    }));
    let currentWindowScratch;
    if (includeCurrentWindowDiagnostic) {
      phase = 'CURRENT_WINDOW_PRIVATE_SCRATCH';
      try {
        const { runSavedCurrentWindowScratch, runSavedCurrentReplayScratch } = await import('./saved-current-window-scratch.mjs');
        const scratchRoot = await noSymlinks(ctx.root, path.join(ctx.root, 'current-window-source'));
        const logRoot = await noSymlinks(ctx.root, path.join(ctx.root, 'current-window-logs'));
        currentWindowScratch = currentReplayDiagnostic
          ? await runSavedCurrentReplayScratch({ scratchRoot, logRoot, basePath, source, repository,
            masterSecret, encryptionKey, pythonExecutable, privateRoot: work, bundlePath,
            prepareOriginals: prepareCurrentForwardOriginals })
          : await withoutSavedAuditSecrets(() => runSavedCurrentWindowScratch({
            scratchRoot, logRoot, basePath, source, repository, masterSecret, encryptionKey, pythonExecutable }));
      } catch (error) {
        const known = new Set(['SAVED_CURRENT_WINDOW_INPUT_CHANGED', 'SAVED_CURRENT_WINDOW_BASELINE_PAIR_REQUIRED',
          'SAVED_CURRENT_WINDOW_PROGRESS_REJECTED', 'SAVED_CURRENT_WINDOW_PROCESS_TIMEOUT',
          'SAVED_CURRENT_WINDOW_PROCESS_UNAVAILABLE', 'SAVED_CURRENT_WINDOW_LOG_BOUND', 'SAVED_CURRENT_WINDOW_SCRATCH_INVALID']);
        known.add('SAVED_CURRENT_REPLAY_ORIGIN_INPUTS_REQUIRED');
        currentWindowScratch = { status: 'UNAVAILABLE', firstErrorCode: known.has(error?.scratchCode) ? error.scratchCode : 'UNCLASSIFIED',
          providerRequestsPerformed: false, remoteWrites: false, publicationInvoked: false, productionAuthority: false, privatePayloadIncluded: false };
      }
    }
    phase = 'FINAL_READBACK';
    if (!same(await oldProtected.describeCurrentProtectedPrivateProductionRuntime(clients), source)) fail('CURRENT_GENERATION_CHANGED');
    let originalRestorePreparation;
    if (prepareCurrentForwardOriginals) {
      phase = 'FORWARD_ORIGINAL_PREPARATION';
      if (currentWindowScratch?.status !== 'FORWARD_ORIGINAL_DEPENDENCIES_PREPARED'
        || currentWindowScratch.collection?.allPartsReached !== true
        || currentWindowScratch.collection?.anotherGuardStoppedCollection !== false
        || currentWindowScratch.collection?.diagnosticUnavailableParts !== 0) fail('NATIVE_PROOF_INSPECTION_FAILED');
      const forward = await import('./lib/saved-current-forward-original-plan.mjs');
      const file = await noSymlinks(ctx.root, path.join(ctx.root, 'current-window-source', forward.SAVED_CURRENT_FORWARD_PLAN_PATH));
      const stat = await fs.lstat(file, { bigint: true });
      if (!stat.isFile() || stat.nlink !== 1n || stat.size < 2n || stat.size > 16n * 1024n * 1024n) fail('LOCAL_METADATA_INVALID');
      const bytes = await fs.readFile(file), after = await fs.lstat(file, { bigint: true });
      if (['dev', 'ino', 'size', 'mtimeNs'].some(key => stat[key] !== after[key])) fail('LOCAL_METADATA_INVALID');
      const document = forward.validateSavedCurrentForwardOriginalDocument(bytes, { parts, conditions });
      if (document.gridUnknownParts !== currentWindowScratch.collection.gridUnknownParts) fail('LOCAL_METADATA_INVALID');
      const prepare = await import('./prepare-saved-dmi-original-restore.mjs');
      const plan = prepare.buildSavedDmiOriginalRestorePlan({ captures: document.captures, source,
        demands: document.demands, executionHead: process.env.GITHUB_SHA,
        progressSource, progressCacheKey, targetReferenceAt: progressBaselineTargetHour });
      originalRestorePreparation = await prepare.writeSavedDmiOriginalRestorePlan({ repositoryRoot: ctx.repository, plan });
    }
    const report = { ...baseReport('AUDIT_COMPLETED'), protectedGenerationReadbackVerified: true,
      exactArchivedSourceContractsVerified: true, exactProgressAuthenticated: true,
      normalProgressBaselineUsed,
      capacity: { protected: { ...archive, files: protectedFiles,
        rawPayloadBytes: protectedFiles.bytes + (await fs.stat(path.join(bundlePath, 'manifest.json'))).size }, progress: measured.progress,
      limits: { archiveBytes: policy.maximumArchiveAggregateBytes, envelopeBytes: policy.maximumEnvelopeBytes,
        fileBytes: policy.maximumFilePayloadBytes, rawPayloadBytes: policy.maximumRawPayloadBytes,
        progressCipherBytes: WEATHER_PROGRESS_MAX_CIPHER_BYTES, progressPackBytes: 768 * 1024 * 1024 } },
      forecasts: measured.forecasts, originalContext: measured.originalContext,
      nativeProofAvailability: measured.nativeProofAvailability,
      ...(measured.selectedCurrentPreflight ? { selectedCurrentPreflight: measured.selectedCurrentPreflight } : {}),
      ...(currentWindowScratch ? { currentWindowScratch } : {}),
      ...(originalRestorePreparation ? { originalRestorePreparation } : {}),
      ...(includeCurrentWindowDiagnostic ? {
        localWorkScope: 'OWNED_PRIVATE_SCRATCH_ONLY', productionAuthority: false,
        semanticUnionPerformed: currentWindowScratch?.semanticUnionPerformedInPrivateScratch === true ? true : null,
        replayPerformed: null, cacheBuilt: null,
      } : {}),
      // This summary belongs to the protected, previously built baseline.
      // Acquisition progress does not contain a newly built conditions file.
      protectedBaselineComponentFallback: safeWeatherComponentSummary(conditions.weatherEngine?.componentFallback),
      resources: { maxRssBytes: process.resourceUsage().maxRSS * 1024, currentHeapBytes: process.memoryUsage().heapUsed } };
    phase = 'PRIVATE_CLEANUP';
    if (baselinePackInvocation !== null && !privateWeatherPackJsonReadsClosed(baselinePackInvocation)) fail('BASELINE_COMPONENT_PACK_REJECTED');
    try { await fs.rm(work, { recursive: true, force: true }); work = null; }
    catch { fail('PRIVATE_TEMP_CLEANUP_FAILED'); }
    await fs.writeFile(safeOutput, `${JSON.stringify(report)}\n`, { flag: 'wx', mode: 0o600 });
    return report;
  } catch (error) {
    const code = safeCode.has(error?.auditCode) ? error.auditCode
      : phase === 'PROGRESS_AUTHENTICATION' ? 'PROGRESS_AUTHENTICATION_REJECTED'
      : phase === 'PROGRESS_BASELINE_RECONSTRUCTION' ? 'PROGRESS_BASELINE_RECONSTRUCTION_REJECTED' : 'AUDIT_FAILED_CLOSED';
    const report = { ...baseReport('AUDIT_FAILED_CLOSED'), normalProgressBaselineUsed, phase, code,
      ...(includeCurrentWindowDiagnostic ? { localWorkScope: 'OWNED_PRIVATE_SCRATCH_ONLY', productionAuthority: false,
        semanticUnionPerformed: null, replayPerformed: null, cacheBuilt: null } : {}),
      ...(phase === 'PROGRESS_AUTHENTICATION' ? { progressAuthenticationCode:
        savedAuditProgressAuthenticationCode(error) } : {}) };
    if (safeOutput) await fs.writeFile(safeOutput, `${JSON.stringify(report)}\n`, { flag: 'wx', mode: 0o600 }).catch(() => {});
    return report;
  } finally {
    if (work && (baselinePackInvocation === null || privateWeatherPackJsonReadsClosed(baselinePackInvocation))
      && path.dirname(work) === await fs.realpath(privateRoot).catch(() => null)
      && path.basename(work).startsWith('saved-input-audit-')) await fs.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

// Explicit preparation operation, separate from the read-only audit modes.
// It reuses the exact archived-reader / normal baseline / GCM boundaries, but
// only a fixed private capture plan may leave the authenticated reader scope.
// No caller-supplied executor, transport, report hook or alternate output path.
export async function prepareAuthenticatedSavedDmiOriginalRestore({ privateRoot, descriptorPath, predecessorRoot,
  progressFile, progressSource, progressCacheKey, progressBaselineTargetHour, executionHead = process.env.GITHUB_SHA,
  repositoryRoot = REPOSITORY, repository = process.env.GITHUB_REPOSITORY,
  pythonExecutable = process.env.PYTHON ?? 'python', encryptionKey = process.env.WEATHER_PROGRESS_ENCRYPTION_KEY,
  masterSecret = process.env.WEATHER_PROGRESS_MASTER_SECRET, ...credentials } = {}) {
  const prepare = await import('./prepare-saved-dmi-original-restore.mjs');
  prepare.assertSavedDmiOriginalRestoreScope({ progressSource, progressCacheKey, progressBaselineTargetHour, executionHead });
  const ctx = await context(privateRoot, repositoryRoot);
  let work = null, componentInvocation = null;
  try {
    const resolvePrivate = value => typeof value === 'string' && inside(path.resolve(privateRoot), path.resolve(value))
      ? path.join(ctx.root, path.relative(path.resolve(privateRoot), path.resolve(value))) : value;
    descriptorPath = resolvePrivate(descriptorPath);
    progressFile = resolvePrivate(progressFile);
    const source = identity(await readJson(await noSymlinks(ctx.root, descriptorPath)));
    validateProgressBaselineTargetHour(progressBaselineTargetHour, source);
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')) fail('PROGRESS_IDENTITY_INVALID');
    const cipher = await noSymlinks(ctx.root, progressFile), cipherStat = await fs.lstat(cipher);
    if (!cipherStat.isFile() || cipherStat.size < 1 || cipherStat.size > WEATHER_PROGRESS_MAX_CIPHER_BYTES) fail('PROGRESS_IDENTITY_INVALID');
    const requested = path.resolve(predecessorRoot), stat = await fs.lstat(requested), predecessor = await fs.realpath(requested);
    if (!stat.isDirectory() || stat.isSymbolicLink() || inside(ctx.root, predecessor) || inside(predecessor, ctx.root)
      || inside(ctx.repository, predecessor) || inside(predecessor, ctx.repository)) fail('PREDECESSOR_ROOT_INVALID');
    const temp = [path.resolve(os.tmpdir()), ...(process.env.RUNNER_TEMP ? [path.resolve(process.env.RUNNER_TEMP)] : [])]
      .find(value => inside(value, requested));
    if (!temp) fail('PREDECESSOR_ROOT_INVALID');
    await noSymlinks(temp, requested);
    const oldImport = async relative => import(`${pathToFileURL(await noSymlinks(predecessor, path.join(predecessor, relative))).href}?savedInput=${source.sourceHead}`);
    const [oldProtected, oldWorkflow, oldBinding] = await Promise.all([
      oldImport('scripts/protected-private-production-runtime.mjs'), oldImport('scripts/private-production-runtime-workflow.mjs'),
      oldImport('js/core/ravscore-model-contract.js')]);
    if (!same(oldBinding.ravScoreModelBinding(), source.modelBinding)
      || !same(await oldWorkflow.privateRuntimeContractHashes({ repositoryRoot: predecessor }), source.contractHashes)) fail('PREDECESSOR_CONTRACT_MISMATCH');
    // Exactly the audit's closed GET/HEAD facade, never provider credentials.
    const clients = createReadOnlySavedWeatherClients(credentials);
    if (!same(await oldProtected.describeCurrentProtectedPrivateProductionRuntime(clients), source)) fail('CURRENT_GENERATION_CHANGED');
    work = await fs.mkdtemp(path.join(ctx.root, 'saved-input-original-plan-'));
    const bundlePath = path.join(work, 'bundle');
    const restored = await withoutSavedAuditSecrets(() => oldProtected.restoreProtectedPrivateProductionRuntime({ ...clients,
      privateRoot: work, bundlePath, repositoryRoot: predecessor,
      expected: { modelBinding: source.modelBinding, contractHashes: source.contractHashes,
        datasetId: source.datasetId, productionReferenceAt: source.productionReferenceAt, generatedAt: source.generatedAt,
        targetReferenceAt: source.productionReferenceAt, minimumReferenceAt: source.productionReferenceAt, minimumGeneratedAt: source.generatedAt },
    }));
    if (restored.restored !== true || restored.rollbackSelected !== false
      || restored.bundleContentSha256 !== source.bundleContentSha256) fail('EXACT_CURRENT_NOT_RESTORED');
    if (!same(await oldProtected.describeCurrentProtectedPrivateProductionRuntime(clients), source)) fail('CURRENT_GENERATION_CHANGED');
    const manifest = await readJson(path.join(bundlePath, 'manifest.json'));
    if (manifest.bundleContentSha256 !== source.bundleContentSha256) fail('BUNDLE_IDENTITY_MISMATCH');
    const payloadRoot = path.join(bundlePath, 'payload');
    // Same bounded archive measurement also releases the facade's retained
    // compressed buffers before any national donor document is opened.
    await clients.archiveMetrics();
    const originalConditions = await readJson(path.join(payloadRoot, 'data/live/conditions.json'), 535_822_312);
    const parts = originalParts(originalConditions);
    let componentFiles = [];
    const packed = manifest.files.some(file => file.relativePath === PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
    if (privateWeatherComponentMarker(originalConditions) && !packed) fail('BASELINE_COMPONENT_PACK_REJECTED');
    if (packed) componentFiles = await withoutSavedAuditSecrets(() => {
      componentInvocation = unpackPrivateWeatherComponentPack({ restoredRoot: payloadRoot,
        outputRoot: path.join(work, 'baseline-components'), conditions: originalConditions, pythonExecutable });
      return componentInvocation;
    });
    const baseline = await withoutSavedAuditSecrets(() => prepareSavedAuditProgressBaseline({ privateRoot: ctx.root, workRoot: work,
      bundlePath, descriptorPath, repositoryRoot: ctx.repository, progressBaselineTargetHour }));
    if (baseline.normalProgressBaselineUsed !== true) fail('PROGRESS_BASELINE_RECONSTRUCTION_REJECTED');
    const conditions = await readJson(path.join(baseline.repositoryRoot, 'data/live/conditions.json'), 535_822_312);
    const demands = prepare.savedDmiOriginalHistoryDemand({ conditions, parts, targetReferenceAt: progressBaselineTargetHour });
    const protectedBulk = await bulk(path.join(payloadRoot, 'data/live/dmi-bulk-cache.json'));
    const savedForecastIndex = await forecastIndex(await noSymlinks(ctx.root,
      path.join(baseline.repositoryRoot, 'data/live/dmi-forecast-cache.json')));
    const basePath = path.join(work, 'progress-base.json');
    const captured = await weatherComponentProgressCache({ mode: 'capture-base', repositoryRoot: baseline.repositoryRoot,
      basePath, repository, protectedBundleSha256: source.bundleContentSha256 });
    if (captured.captured !== true) fail('PROGRESS_BINDING_FAILED');
    await fs.mkdir(path.dirname(path.join(baseline.repositoryRoot, WEATHER_PROGRESS_CIPHER_PATH)), { recursive: true, mode: 0o700 });
    await fs.copyFile(cipher, path.join(baseline.repositoryRoot, WEATHER_PROGRESS_CIPHER_PATH), fs.constants.COPYFILE_EXCL);
    const captures = await withoutSavedAuditSecrets(() => withAuthenticatedWeatherProgress({
      repositoryRoot: baseline.repositoryRoot, basePath, repository, encryptionKey, masterSecret, pythonExecutable,
    }, async ({ files }) => {
      const candidateFile = files.find(file => file.relativePath === PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate)?.sourcePath;
      if (progressSource === '38768040429-1' && (!candidateFile
        || files.some(file => file.relativePath === PRIVATE_WEATHER_COMPONENT_FILES.dmiActive))) {
        const error = new Error('SAVED_DMI_ORIGINAL_INPUTS_UNAVAILABLE');
        error.originalPlanCode = error.message; throw error;
      }
      const progressCandidate = await bulk(candidateFile), originals = new Map();
      const demandByPart = new Map(demands.map(value => [value.partId, value]));
      const dependencyDiscovery = prepare.createSavedDmiOriginalDependencyDiscovery({ protectedBulk, progressCandidate });
      const collectPart = (record, part) => {
        for (const capture of prepare.collectSelectedSavedDmiOriginalCaptures({ protectedBulk, progressCandidate,
          persistedHourlyByPart: new Map([[part.partId, record]]), parts: new Map([[part.partId, part]]),
          demands: [demandByPart.get(part.partId)], targetReferenceAt: progressBaselineTargetHour, dependencyDiscovery })) {
          originals.set(prepare.savedOriginalCanonicalJson(capture), capture);
          if (originals.size > 4096) {
            const error = new Error('SAVED_DMI_ORIGINAL_PLAN_BOUND'); error.originalPlanCode = error.message; throw error;
          }
        }
      };
      const visited = await visitSavedPartCurrents(savedForecastIndex, parts, () => {}, collectPart);
      if (visited.status !== 'MEASURED' || visited.counts.entries !== parts.size
        || visited.counts.geometryMismatchEntries !== 0) fail('CONTINUITY_INSPECTION_FAILED');
      return [...originals].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, capture]) => capture);
    }));
    if (componentInvocation !== null && !privateWeatherPackJsonReadsClosed(componentInvocation)) fail('BASELINE_COMPONENT_PACK_REJECTED');
    if (!same(await oldProtected.describeCurrentProtectedPrivateProductionRuntime(clients), source)) fail('CURRENT_GENERATION_CHANGED');
    const plan = prepare.buildSavedDmiOriginalRestorePlan({ captures, source, demands, executionHead,
      progressSource, progressCacheKey, targetReferenceAt: progressBaselineTargetHour });
    // All authenticated local readers have closed before the only durable
    // output is created. No restored payload or successor is installed.
    await fs.rm(work, { recursive: true, force: true }); work = null;
    return await prepare.writeSavedDmiOriginalRestorePlan({ repositoryRoot: ctx.repository, plan });
  } finally {
    if (work && (componentInvocation === null || privateWeatherPackJsonReadsClosed(componentInvocation))
      && path.dirname(work) === ctx.root && path.basename(work).startsWith('saved-input-original-plan-')) {
      await fs.rm(work, { recursive: true, force: true }).catch(() => {});
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), options = { mode: args.shift() };
    const names = { '--private-root': 'privateRoot', '--descriptor': 'descriptorPath', '--predecessor-root': 'predecessorRoot',
      '--progress-file': 'progressFile', '--progress-source': 'progressSource', '--progress-cache-key': 'progressCacheKey',
      '--output': 'outputPath', '--python': 'pythonExecutable',
      '--include-raw-manifest': 'includeRawManifest', '--raw-cache-key': 'rawCacheKey',
      '--raw-manifest-source': 'rawManifestSource', '--include-raw-file-presence': 'includeRawFilePresence',
      '--include-selected-current-preflight': 'includeSelectedCurrentPreflight',
      '--include-current-window-diagnostic': 'includeCurrentWindowDiagnostic',
      '--prepare-current-forward-originals': 'prepareCurrentForwardOriginals',
      '--progress-baseline-target-hour': 'progressBaselineTargetHour' };
    while (args.length) { const key = args.shift(), value = args.shift();
      if (!names[key] || !value || value.startsWith('--') || Object.hasOwn(options, names[key])) fail('MODE_INVALID'); options[names[key]] = value; }
    for (const key of ['includeRawManifest', 'includeRawFilePresence', 'includeSelectedCurrentPreflight', 'includeCurrentWindowDiagnostic', 'prepareCurrentForwardOriginals']) {
      if (!Object.hasOwn(options, key)) continue;
      if (!['true', 'false'].includes(options[key])) fail('MODE_INVALID');
      options[key] = options[key] === 'true';
    }
    const report = await auditSavedWeatherInputs(options);
    if (options.prepareCurrentForwardOriginals && report.status === 'AUDIT_COMPLETED' && report.originalRestorePreparation && process.env.GITHUB_OUTPUT) {
      const plan = report.originalRestorePreparation;
      await fs.appendFile(process.env.GITHUB_OUTPUT,
        `preparation_status=${plan.status}\nplan_sha256=${plan.planSha256}\noriginal_count=${plan.originalCount}\nplan_bytes=${plan.planBytes}\n`);
    }
    console.log(JSON.stringify(report));
    if (report.status === 'AUDIT_FAILED_CLOSED') process.exitCode = 1;
  } catch { console.error('SAVED_WEATHER_INPUT_AUDIT_FAILED_CLOSED'); process.exitCode = 1; }
}
