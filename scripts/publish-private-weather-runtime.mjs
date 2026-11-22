#!/usr/bin/env node
// Normal weather delivery only. The frozen archive/model readers and publisher
// remain the authority for payload, exact readback and parent CAS.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createR2PrivateRuntimeStorage } from './lib/r2-private-runtime-storage.mjs';
import { createProtectedPrivateRuntimeClients, publishProtectedPrivateProductionRuntime,
  PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';
import { assertRetirementReference, createPrivateWeatherRetirement, decodePrivateWeatherPointerRow,
  RETIREMENT_MARKER_BYTES } from './lib/private-weather-runtime-retirement.mjs';

// DEC-0255: internal, weather-only transport budget. No environment/CLI override.
export const PRIVATE_WEATHER_PUBLICATION_POLICY = Object.freeze({
  bucketCeilingBytes: 2_500_000_000,
  reserveBytes: 100_000_000,
});
const fail = code => { throw Object.assign(new Error(code), { code }); };
export function assertPrivateWeatherPublicationPolicy(value = PRIVATE_WEATHER_PUBLICATION_POLICY) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype
    || Object.keys(value).sort().join(',') !== 'bucketCeilingBytes,reserveBytes'
    || !Number.isSafeInteger(value.bucketCeilingBytes)
    || !Number.isSafeInteger(value.reserveBytes) || value.reserveBytes < 0
    || value.bucketCeilingBytes !== PRIVATE_WEATHER_PUBLICATION_POLICY.bucketCeilingBytes
    || value.reserveBytes !== PRIVATE_WEATHER_PUBLICATION_POLICY.reserveBytes
    || value.bucketCeilingBytes - value.reserveBytes < PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes) {
    fail('PRIVATE_WEATHER_PUBLICATION_POLICY_INVALID');
  }
  return Object.freeze({ ...value });
}

export function assertPrivateWeatherPublicationBackend(value = process.env.RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND ?? 'supabase') {
  if (value !== 'r2') fail('PRIVATE_WEATHER_PUBLICATION_BACKEND_MISMATCH');
}

export function createPrivateWeatherPublicationStorage(options = {}, reserveRetirementMarker = false, observeInitialStock) {
  const policy = assertPrivateWeatherPublicationPolicy();
  const allowed = new Set(['storageBackend', 'accountId', 'accessKeyId', 'secretAccessKey', 'fetchImpl', 'now', 'delayImpl']);
  if (!options || Object.getPrototypeOf(options) !== Object.prototype
    || Object.keys(options).some(key => !allowed.has(key))) fail('PRIVATE_WEATHER_PUBLICATION_OPTION_INVALID');
  assertPrivateWeatherPublicationBackend(options.storageBackend);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') fail('PRIVATE_WEATHER_PUBLICATION_OPTION_INVALID');
  let storage;
  let beforeFirstPut;
  const guardedFetch = async (url, request) => {
    if (request?.method === 'PUT') {
      // This is the frozen adapter's actual first new-object PUT boundary.
      // HEAD reuse never reaches it. A rejected admission is latched too, so
      // the existing adapter retry cannot cause another scan or any PUT.
      beforeFirstPut ??= (async () => {
        const usage = await storage.bucketUsage();
        if (usage.usedBytes > policy.bucketCeilingBytes - policy.reserveBytes
          - PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes
          - (reserveRetirementMarker ? RETIREMENT_MARKER_BYTES : 0)) {
          fail('PRIVATE_WEATHER_PUBLICATION_GENERATION_CAPACITY');
        }
        observeInitialStock?.(usage);
      })();
      await beforeFirstPut;
    }
    // Preserve the URL and the whole request object, including auth, body,
    // redirect policy and any abort signal. No new retry or response handling.
    return fetchImpl(url, request);
  };
  storage = createR2PrivateRuntimeStorage({
    ...options,
    bucketId: PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId,
    maximumObjectBytes: PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveBytes,
    bucketCeilingBytes: policy.bucketCeilingBytes,
    fetchImpl: guardedFetch,
  });
  return storage;
}

export async function publishPrivateWeatherRuntime(options, storageOptions) {
  if (!options || Object.hasOwn(options, 'storage') || Object.hasOwn(options, 'policy')) {
    fail('PRIVATE_WEATHER_PUBLICATION_OPTION_INVALID');
  }
  const policy = PRIVATE_WEATHER_PUBLICATION_POLICY;
  const retirement = createPrivateWeatherRetirement(storageOptions, policy.bucketCeilingBytes);
  let before, lastRead, readQuery, priorSettled;
  const freshPointer = async () => {
    return decodePrivateWeatherPointerRow(await options.request(readQuery, {}, 'read'));
  };
  const settleBeforeMutation = async () => {
    priorSettled ??= retirement.settle(before, freshPointer);
    await priorSettled;
  };
  let bucketUsageBeforeArchiveUpload;
  const storage = createPrivateWeatherPublicationStorage(storageOptions, true, usage => {
    bucketUsageBeforeArchiveUpload = usage;
  });
  let bucketUsageBeforeRetirementMarker;
  const validateMarkerCapacity = async bytes => {
    const usage = await storage.bucketUsage();
    if (usage.usedBytes + bytes + policy.reserveBytes > policy.bucketCeilingBytes) {
      fail('PRIVATE_WEATHER_PUBLICATION_GENERATION_CAPACITY');
    }
    bucketUsageBeforeRetirementMarker = usage;
  };
  const createdPaths = new Set();
  const currentPaths = new Set();
  let pointerWriteStarted = false;
  const result = await publishProtectedPrivateProductionRuntime({
    ...options,
    request: async (query, request, phase) => {
      if (phase === 'read') {
        const rows = await options.request(query, request, phase);
        lastRead = decodePrivateWeatherPointerRow(rows);
        if (!readQuery) {
          readQuery = query;
          before = lastRead;
          const current = before?.payload.current;
          for (const part of current?.objects ?? (current ? [current] : [])) currentPaths.add(part.objectPath);
        }
        return rows;
      }
      if (phase === 'compare-and-swap') {
        await settleBeforeMutation();
        const next = decodePrivateWeatherPointerRow([{
          document_key: PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey,
          version: before.version + 1,
          payload: JSON.parse(request.body).payload,
        }]).payload;
        await retirement.prepare(before, next, validateMarkerCapacity);
      }
      if (phase === 'compare-and-swap' || phase === 'insert') pointerWriteStarted = true;
      return options.request(query, request, phase);
    },
    storage: {
      ...storage,
      async uploadImmutable(objectPath, bytes) {
        if (!currentPaths.has(objectPath)) await settleBeforeMutation();
        const result = await storage.uploadImmutable(objectPath, bytes);
        if (result.created === true) createdPaths.add(objectPath);
        return result;
      },
      async removeExact(objectPath) {
        // A read of the old pointer after a lost response cannot exclude a
        // later commit. Keep this candidate's parts once its write may have
        // reached Supabase.
        if (pointerWriteStarted && createdPaths.has(objectPath)) {
          fail('PRIVATE_WEATHER_PUBLICATION_CANDIDATE_HELD_AFTER_POINTER_WRITE');
        }
        // On success the frozen publisher requests deletion of the exact old
        // previous parts. Their authenticated marker owns this cleanup now.
        if (pointerWriteStarted) return true;
        return storage.removeExact(objectPath);
      },
    },
  });
  const observed = { ...result, bucketUsageBeforeArchiveUpload, bucketUsageBeforeRetirementMarker };
  try {
    await retirement.settle(lastRead, freshPointer);
    return observed;
  } catch {
    return { ...observed, retentionCleanupComplete: false, retentionCleanupFailureCount: 1 };
  }
}

export function privateWeatherPublicationArguments(argv) {
  if (argv[0] !== '--publish') fail('PRIVATE_WEATHER_PUBLICATION_ARGUMENT_INVALID');
  const names = new Map([
    ['--private-root', 'privateRoot'], ['--bundle', 'bundlePath'],
    ['--repository-root', 'repositoryRoot'], ['--expected', 'expectedPath'],
    ['--source-head', 'sourceHead'],
    ['--same-reference-migration-report', 'migrationReportPath'],
    ['--same-reference-predecessor-manifest', 'predecessorManifestPath'],
  ]);
  const parsed = {};
  for (let index = 1; index < argv.length; index += 2) {
    const key = names.get(argv[index]), value = argv[index + 1];
    if (!key || Object.hasOwn(parsed, key) || typeof value !== 'string' || !value || value.startsWith('--')) {
      fail('PRIVATE_WEATHER_PUBLICATION_ARGUMENT_INVALID');
    }
    parsed[key] = value;
  }
  if (['privateRoot', 'bundlePath', 'repositoryRoot', 'expectedPath', 'sourceHead'].some(key => !parsed[key])
    || Boolean(parsed.migrationReportPath) !== Boolean(parsed.predecessorManifestPath)) {
    fail('PRIVATE_WEATHER_PUBLICATION_ARGUMENT_INVALID');
  }
  return parsed;
}
async function readJson(file, role) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { fail(`PRIVATE_WEATHER_PUBLICATION_${role}_INVALID`); }
}
export async function checkCodeOnlyPrivateWeatherRebind(request, storageOptions, targetReferenceAt) {
  const fresh = async () => decodePrivateWeatherPointerRow(await request(
    `?document_key=eq.${encodeURIComponent(PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey)}&select=document_key,payload,version&limit=2`,
    {}, 'read',
  ));
  const before = await fresh();
  if (!before) fail('PRIVATE_WEATHER_PUBLICATION_RETIREMENT_POINTER');
  const liveReference = Date.parse(before.payload.current.productionReferenceAt);
  if (targetReferenceAt !== undefined
      && (!/^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(targetReferenceAt)
        || Date.parse(targetReferenceAt) !== liveReference)) {
    fail('PRIVATE_WEATHER_PUBLICATION_REBIND_TARGET_CHANGED');
  }
  assertRetirementReference(before, liveReference);
  const policy = PRIVATE_WEATHER_PUBLICATION_POLICY;
  const retirement = createPrivateWeatherRetirement(storageOptions, policy.bucketCeilingBytes);
  await retirement.assertCodeOnlyAdmissionClear(before);
  const { usedBytes } = await createPrivateWeatherPublicationStorage(storageOptions).bucketUsage();
  if (usedBytes > policy.bucketCeilingBytes - policy.reserveBytes
      - PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes - RETIREMENT_MARKER_BYTES) {
    fail('PRIVATE_WEATHER_PUBLICATION_GENERATION_CAPACITY');
  }
}

export async function appendPrivateWeatherPublicationSummary(result, env = process.env) {
  const summaryPath = env.GITHUB_STEP_SUMMARY;
  if (env.GITHUB_ACTIONS !== 'true' || !path.isAbsolute(summaryPath ?? '')) return;

  const openingUsage = result.bucketUsageBeforeArchiveUpload;
  const openingStock = openingUsage
    ? `R2 reported ${openingUsage.usedBytes} bytes before the first new archive object, following any retirement from earlier runs. The object count was ${openingUsage.objectCount}.`
    : 'R2 bucket usage before the first new archive object was not measured.';
  const usage = result.bucketUsageBeforeRetirementMarker;
  const storage = usage
    ? `R2 reported ${usage.usedBytes} bytes after archive verification and before the retirement marker upload. The object count was ${usage.objectCount}.`
    : 'R2 bucket usage before the retirement marker upload was not measured.';
  const cleanup = result.retentionCleanupComplete;
  let retirement = 'The publisher reported no retirement result.';
  if (cleanup === true) retirement = 'The retirement check completed.';
  if (cleanup === false) retirement = 'Retirement cleanup remains unresolved.';
  try {
    await fs.appendFile(summaryPath, `\n### Private weather archive storage\n\n${openingStock}\n\n${storage}\n\n${retirement}\n`);
  } catch {
    console.warn('PRIVATE_WEATHER_PUBLICATION_SUMMARY_UNAVAILABLE');
  }
}

async function main() {
  assertPrivateWeatherPublicationPolicy();
  assertPrivateWeatherPublicationBackend();
  const parsed = privateWeatherPublicationArguments(process.argv.slice(2));
  const { expectedPath, migrationReportPath, predecessorManifestPath, ...options } = parsed;
  const expected = await readJson(expectedPath, 'EXPECTED');
  const sameReferenceSuccessorEvidence = migrationReportPath ? {
    migrationReport: await readJson(migrationReportPath, 'MIGRATION_REPORT'),
    predecessorManifest: await readJson(predecessorManifestPath, 'PREDECESSOR_MANIFEST'),
  } : undefined;
  // The existing document requester retains its own authenticated protocol.
  // Its default storage is deliberately not used for this publication.
  const clients = createProtectedPrivateRuntimeClients();
  const result = await publishPrivateWeatherRuntime({
    ...options,
    expected,
    request: clients.documentRequest,
    ...(sameReferenceSuccessorEvidence ? { sameReferenceSuccessorEvidence } : {}),
  });
  console.log(JSON.stringify({ status: result.reason, published: result.published,
    rollbackAvailable: result.rollbackAvailable, objectCount: result.objectCount,
    retentionCleanupComplete: result.retentionCleanupComplete,
    retentionCleanupFailureCount: result.retentionCleanupFailureCount, privatePayloadLogged: false }));
  await appendPrivateWeatherPublicationSummary(result);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    let fixed;
    for (let current = error, depth = 0; current && depth < 5; current = current.cause, depth += 1) {
      if (/^PRIVATE_WEATHER_PUBLICATION_[A-Z_]+$/.test(current.code ?? '')) { fixed = current.code; break; }
    }
    console.error(`Protected private production runtime failed closed: ${fixed ?? error.message}`);
    process.exitCode = 1;
  });
}
