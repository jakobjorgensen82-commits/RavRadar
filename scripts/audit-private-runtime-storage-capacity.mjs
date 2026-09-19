#!/usr/bin/env node
// Read-only metadata audit. POST is used only for Supabase's object/list API.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSupabaseAdminHeaders } from './lib/supabase-admin-rest.mjs';
import {
  PROTECTED_PRIVATE_RUNTIME_POLICY as policy,
  validateProtectedPrivateRuntimePointer,
} from './protected-private-production-runtime.mjs';

const LIMITS = Object.freeze({
  pageSize: 100, maximumRequests: 256, maximumEntries: 20_000,
  maximumPrefixes: 2_048, maximumDepth: 8, maximumResponseBytes: 2_000_000,
  timeoutMs: 10_000, totalTimeoutMs: 60_000,
});
const TARGET_BYTES = 700_000_000;
const PROGRESS_BYTES = 40_000_000;
const fail = code => { const error = new Error(code); error.auditCode = code; throw error; };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : plain(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const sum = values => {
  const result = values.reduce((total, value) => total + value, 0);
  if (!Number.isSafeInteger(result)) fail('BYTE_TOTAL_INVALID');
  return result;
};
const objects = descriptor => !descriptor ? [] : descriptor.objects ?? [{
  objectPath: descriptor.objectPath, objectBytes: descriptor.objectBytes,
}];

async function boundedJson(response, maximumBytes) {
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maximumBytes)) {
    await response.body?.cancel?.().catch(() => {});
    fail('RESPONSE_SIZE_INVALID');
  }
  if (!response.body?.getReader) fail('RESPONSE_STREAM_REQUIRED');
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      bytes += item.value.byteLength;
      if (bytes > maximumBytes) { await reader.cancel(); fail('RESPONSE_TOO_LARGE'); }
      chunks.push(Buffer.from(item.value));
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks, bytes).toString('utf8')); }
  catch { fail('RESPONSE_JSON_INVALID'); }
}

export async function auditPrivateRuntimeStorageCapacity({
  supabaseUrl = process.env.SUPABASE_URL,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  fetchImpl = globalThis.fetch,
  limits: overrides = {},
  now = () => Date.now(),
} = {}) {
  // Tests may lower limits; callers cannot expand this read's fixed bounds.
  const limits = { ...LIMITS };
  for (const [key, value] of Object.entries(overrides)) {
    if (!Object.hasOwn(LIMITS, key) || !Number.isSafeInteger(value) || value < 1 || value > LIMITS[key]) {
      fail('LIMIT_INVALID');
    }
    limits[key] = value;
  }
  const started = now();
  const errors = new Set();
  const report = {
    schemaVersion: 1, kind: 'PRIVATE_RUNTIME_STORAGE_CAPACITY_AUDIT', status: 'INCOMPLETE',
    observedAt: new Date(started).toISOString(),
    inventoryComplete: false, pointerVerified: false, bucketPrivate: null,
    bucketFileSizeLimitBytes: null, objectCount: null, physicalBytes: null,
    currentBytes: null, previousBytes: null, referencedUniqueBytes: null,
    unreferencedObjectCount: null, unreferencedBytes: null,
    missingReferencedObjectCount: null, mismatchedReferencedObjectCount: null,
    targetBytes: TARGET_BYTES, headroomBytes: null,
    candidateEstimateBasis: 'SAME_COMPRESSED_BYTES_AS_CURRENT_NOT_A_MEASUREMENT',
    candidateEstimateBytes: null, predictedPeakPhysicalBytes: null,
    predictedThreeRetainedGenerationsBytes: null,
    progressTwoSlotsBytes: PROGRESS_BYTES, progressFitsObservedHeadroom: null,
    progressFitsEstimatedPublishPeak: null,
    remoteWrites: false, objectPayloadsDownloaded: false, contentHashesVerified: false,
    objectPathsIncluded: false, privatePayloadIncluded: false, requestCount: 0,
    errors: [],
  };
  const recordError = error => errors.add(error?.auditCode ?? 'READ_FAILED');
  let base;
  let headers;
  try {
    base = new URL(supabaseUrl);
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash
      || base.pathname !== '/' || typeof serviceRoleKey !== 'string' || !serviceRoleKey.trim()) {
      fail('CREDENTIAL_CONFIGURATION_REQUIRED');
    }
    headers = buildSupabaseAdminHeaders(serviceRoleKey.trim());
  } catch { errors.add('CREDENTIAL_CONFIGURATION_REQUIRED'); }

  async function request(suffix, body) {
    if (now() - started >= limits.totalTimeoutMs) fail('AUDIT_TIME_LIMIT');
    if (++report.requestCount > limits.maximumRequests) fail('REQUEST_LIMIT');
    const timeout = Math.max(1, Math.min(limits.timeoutMs, limits.totalTimeoutMs - (now() - started)));
    let response;
    try {
      response = await fetchImpl(`${base.origin}${suffix}`, {
        method: body === undefined ? 'GET' : 'POST', headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        redirect: 'error', signal: AbortSignal.timeout(timeout),
      });
      if (!response.ok) { await response.body?.cancel?.().catch(() => {}); fail('REMOTE_READ_REJECTED'); }
      return await boundedJson(response, limits.maximumResponseBytes);
    } catch (error) {
      if (error?.auditCode) throw error;
      fail('REMOTE_READ_FAILED');
    }
  }
  const pointerSuffix = `/rest/v1/admin_documents?document_key=eq.${encodeURIComponent(policy.documentKey)}&select=document_key,payload,version&limit=2`;
  let pointerRow = null;
  let pointer = null;
  if (headers) {
    try {
      const rows = await request(pointerSuffix);
      if (!Array.isArray(rows) || rows.length !== 1 || !plain(rows[0])
        || rows[0].document_key !== policy.documentKey
        || !Number.isSafeInteger(Number(rows[0].version)) || Number(rows[0].version) < 1) {
        fail('POINTER_ROW_INVALID');
      }
      pointerRow = rows[0];
      try {
        pointer = validateProtectedPrivateRuntimePointer(pointerRow.payload, {
          allowHistoricalCurrentModelBinding: true,
        });
      } catch { fail('POINTER_SCHEMA_INVALID'); }
    } catch (error) { recordError(error); }

    try {
      const bucket = await request(`/storage/v1/bucket/${encodeURIComponent(policy.bucketId)}`);
      if (!plain(bucket) || bucket.id !== policy.bucketId || bucket.name !== policy.bucketId) {
        fail('BUCKET_IDENTITY_INVALID');
      }
      report.bucketPrivate = bucket.public === false;
      report.bucketFileSizeLimitBytes = Number.isSafeInteger(bucket.file_size_limit)
        ? bucket.file_size_limit : null;
      if (!report.bucketPrivate || report.bucketFileSizeLimitBytes < policy.maximumArchiveBytes
        || !Array.isArray(bucket.allowed_mime_types) || !bucket.allowed_mime_types.includes(policy.mimeType)) {
        errors.add('BUCKET_POLICY_INVALID');
      }
    } catch (error) { recordError(error); }

    try {
      const inventory = new Map();
      const visited = new Set();
      const seenEntries = new Set();
      const queue = [{ prefix: '', depth: 0 }];
      let entryCount = 0;
      for (let index = 0; index < queue.length; index += 1) {
        const { prefix, depth } = queue[index];
        if (visited.has(prefix)) fail('PREFIX_DUPLICATED');
        visited.add(prefix);
        for (let offset = 0; ; offset += limits.pageSize) {
          const rows = await request(`/storage/v1/object/list/${encodeURIComponent(policy.bucketId)}`, {
            prefix, limit: limits.pageSize, offset, sortBy: { column: 'name', order: 'asc' },
          });
          if (!Array.isArray(rows) || rows.length > limits.pageSize) fail('LIST_SHAPE_INVALID');
          for (const row of rows) {
            if (++entryCount > limits.maximumEntries) fail('ENTRY_LIMIT');
            if (!plain(row) || typeof row.name !== 'string' || !row.name
              || row.name.length > 1_024 || ['.', '..'].includes(row.name)
              || /[\\/\u0000-\u001f\u007f]/.test(row.name)) fail('LIST_NAME_INVALID');
            const objectPath = prefix ? `${prefix}/${row.name}` : row.name;
            if (seenEntries.has(objectPath)) fail('LIST_ENTRY_DUPLICATED');
            seenEntries.add(objectPath);
            if (row.id === null && row.metadata === null) {
              if (depth >= limits.maximumDepth) fail('DEPTH_LIMIT');
              if (queue.length >= limits.maximumPrefixes) fail('PREFIX_LIMIT');
              queue.push({ prefix: objectPath, depth: depth + 1 });
            } else {
              if (typeof row.id !== 'string' || !row.id || !plain(row.metadata)
                || !Number.isSafeInteger(row.metadata.size) || row.metadata.size < 0) {
                fail('OBJECT_SIZE_UNKNOWN');
              }
              inventory.set(objectPath, row.metadata.size);
            }
          }
          if (rows.length < limits.pageSize) break;
        }
      }
      report.inventoryComplete = true;
      report.objectCount = inventory.size;
      report.physicalBytes = sum([...inventory.values()]);
      report.headroomBytes = TARGET_BYTES - report.physicalBytes;
      report.progressFitsObservedHeadroom = report.headroomBytes >= PROGRESS_BYTES;
      if (pointer) {
        const finalRows = await request(pointerSuffix);
        if (!Array.isArray(finalRows) || finalRows.length !== 1
          || JSON.stringify(canonical(finalRows[0])) !== JSON.stringify(canonical(pointerRow))) fail('POINTER_CHANGED_DURING_AUDIT');
        const current = objects(pointer.current);
        const previous = objects(pointer.previous);
        const referenced = new Map();
        for (const item of [...current, ...previous]) {
          if (referenced.has(item.objectPath) && referenced.get(item.objectPath) !== item.objectBytes) {
            fail('POINTER_REFERENCE_CONFLICT');
          }
          referenced.set(item.objectPath, item.objectBytes);
        }
        report.missingReferencedObjectCount = [...referenced].filter(([key]) => !inventory.has(key)).length;
        report.mismatchedReferencedObjectCount = [...referenced].filter(([key, bytes]) => inventory.has(key) && inventory.get(key) !== bytes).length;
        if (report.missingReferencedObjectCount) errors.add('REFERENCED_OBJECT_MISSING');
        if (report.mismatchedReferencedObjectCount) errors.add('REFERENCED_OBJECT_SIZE_MISMATCH');
        const unreferenced = [...inventory].filter(([key]) => !referenced.has(key));
        report.unreferencedObjectCount = unreferenced.length;
        report.unreferencedBytes = sum(unreferenced.map(([, bytes]) => bytes));
        report.referencedUniqueBytes = sum([...inventory].filter(([key]) => referenced.has(key)).map(([, bytes]) => bytes));
        if (!report.missingReferencedObjectCount && !report.mismatchedReferencedObjectCount) {
          report.pointerVerified = true;
          report.currentBytes = sum(current.map(item => inventory.get(item.objectPath)));
          report.previousBytes = sum(previous.map(item => inventory.get(item.objectPath)));
          report.candidateEstimateBytes = report.currentBytes;
          report.predictedPeakPhysicalBytes = sum([report.physicalBytes, report.currentBytes]);
          report.predictedThreeRetainedGenerationsBytes = sum([report.currentBytes, report.previousBytes, report.currentBytes]);
          report.progressFitsEstimatedPublishPeak = report.predictedPeakPhysicalBytes + PROGRESS_BYTES <= TARGET_BYTES;
        }
      }
    } catch (error) { recordError(error); }
  }
  report.errors = [...errors].sort();
  report.status = report.inventoryComplete && report.pointerVerified && errors.size === 0 ? 'COMPLETE' : 'INCOMPLETE';
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--output' || !args[1]) {
    console.error('Use --output <payload-free-report.json>');
    process.exitCode = 2;
  } else {
    try {
      const report = await auditPrivateRuntimeStorageCapacity();
      await fs.writeFile(path.resolve(args[1]), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
      console.log(JSON.stringify(report));
      if (report.status !== 'COMPLETE') process.exitCode = 1;
    } catch {
      console.error('PRIVATE_RUNTIME_STORAGE_AUDIT_FAILED');
      process.exitCode = 1;
    }
  }
}
