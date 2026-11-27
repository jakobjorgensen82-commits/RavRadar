#!/usr/bin/env node
// Normal weather delivery only. The frozen archive/model readers and publisher
// remain the authority for payload, exact readback and parent CAS.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createR2PrivateRuntimeStorage } from './lib/r2-private-runtime-storage.mjs';
import { createPrivateWeatherUploadReservationR2, PRIVATE_WEATHER_PUBLICATION_POLICY,
  PRIVATE_WEATHER_UPLOAD_RESERVATION_BYTES, RESERVED_ARCHIVE_UPLOAD_KIND, RESERVED_ARCHIVE_UPLOAD_MAXIMUM_ENTRIES,
  RESERVED_ARCHIVE_UPLOAD_MAXIMUM_BYTES, privateWeatherArchivePartSha, sumPrivateWeatherArchiveReservationBytes,
  decodePrivateWeatherArchiveReservation, readPrivateWeatherArchiveUploadReservationBytes }
  from './lib/operational-evidence-r2-slots.mjs';
export { PRIVATE_WEATHER_PUBLICATION_POLICY };
import { createProtectedPrivateRuntimeClients, publishProtectedPrivateProductionRuntime,
  PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';
import { assertRetirementReference, createPrivateWeatherRetirement, decodePrivateWeatherPointerRow,
  RETIREMENT_MARKER_BYTES } from './lib/private-weather-runtime-retirement.mjs';

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


function archiveUploadReservation(options) {
  const fetchImpl = options?.fetchImpl ?? globalThis.fetch;
  const record = createPrivateWeatherUploadReservationR2({ ...options,
    fetchImpl: (url, request) => fetchImpl(url, { ...request, signal: AbortSignal.timeout(8_000) }),
  });
  let load;
  let base;
  let pending;
  const attempted = new Map();
  const recovered = new Set();
  async function recover(storage) {
    load ??= (async () => {
      base = await record.read();
      pending = [];
      for (const part of base ? decodePrivateWeatherArchiveReservation(base.bytes) : []) {
        let remote;
        try { remote = await storage.download(part.path); }
        catch {
          // A failed or absent read cannot establish that a PUT has stopped.
          pending.push(part);
          continue;
        }
        if (remote.length !== part.bytes || crypto.createHash('sha256').update(remote).digest('hex') !== privateWeatherArchivePartSha(part.path)) {
          fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_ARCHIVE_IDENTITY');
        }
        recovered.add(part.path);
      }
    })();
    await load;
    return sumPrivateWeatherArchiveReservationBytes(pending);
  }
  const encode = next => Buffer.from(JSON.stringify({
    kind: RESERVED_ARCHIVE_UPLOAD_KIND, revision: crypto.randomUUID(), pending: next,
  }));
  async function writeAndRead(bytes, expected) {
    try { await record.compareAndSwap(bytes, expected?.etag ?? null); }
    catch { /* The outcome is established by authenticated readback. */ }
    return record.read();
  }
  async function fenceUnsentReservation(bytes, observed) {
    // This process has not sent the archive PUT. Race the unanswered journal
    // write on the same ETag, retaining every previously uncertain archive.
    const fence = encode(pending);
    let current = await writeAndRead(fence, observed);
    if (current?.bytes.equals(bytes)) {
      // The original reservation won the race. Only this exact intent can
      // now be retired because we know its archive PUT was never sent.
      current = await writeAndRead(fence, current);
    }
    if (current?.bytes.equals(fence)) base = current;
  }
  async function store(next, unsentReservation = false) {
    const bytes = encode(next);
    const current = await writeAndRead(bytes, base);
    if (!current?.bytes.equals(bytes)) {
      const unchanged = current === null ? base === null
        : current.etag === base?.etag && current.bytes.equals(base.bytes);
      if (unsentReservation && unchanged) await fenceUnsentReservation(bytes, current);
      fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_WRITE_UNKNOWN');
    }
    base = current;
    pending = next;
  }
  async function upload(objectPath, request, send) {
    const digest = privateWeatherArchivePartSha(objectPath);
    if (!digest || !Buffer.isBuffer(request.body) || digest !== request.headers['x-amz-content-sha256']) {
      fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_ARCHIVE_IDENTITY');
    }
    if (attempted.get(objectPath)) throw attempted.get(objectPath);
    if (attempted.has(objectPath) || recovered.has(objectPath) || pending.some(part => part.path === objectPath)) {
      fail('PRIVATE_WEATHER_UPLOAD_ALREADY_UNRESOLVED');
    }
    // The immutable adapter can retry failed requests. Only one physical
    // PUT may be sent for this reservation, so a positive readback can retire
    // it without a delayed duplicate recreating the object after rotation.
    attempted.set(objectPath, null);
    const next = [...pending, { path: objectPath, bytes: request.body.length }];
    if (next.length > RESERVED_ARCHIVE_UPLOAD_MAXIMUM_ENTRIES || sumPrivateWeatherArchiveReservationBytes(next) > RESERVED_ARCHIVE_UPLOAD_MAXIMUM_BYTES) {
      fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_CAPACITY');
    }
    try {
      await store(next, true);
      const response = await send();
      if ([200, 201, 204, 412].includes(response.status)) {
        pending = pending.filter(part => part.path !== objectPath);
      }
      return response;
    } catch (error) {
      attempted.set(objectPath, error);
      throw error;
    }
  }
  async function finish() {
    if (base && JSON.stringify(decodePrivateWeatherArchiveReservation(base.bytes)) !== JSON.stringify(pending)) await store(pending);
  }
  async function verifyCleanupAllowed(objectPath) {
    // The frozen publisher may clean up acknowledged objects on an archive
    // readback or pre-pointer failure. Keep those bytes until the durable
    // reservation is gone, so a restart can still verify its prior write.
    if (!base || !decodePrivateWeatherArchiveReservation(base.bytes).some(part => part.path === objectPath)) return;
    if (pending.some(part => part.path === objectPath)) fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_CLEANUP_HELD');
    await finish();
  }
  return { recover, upload, finish, verifyCleanupAllowed, wasRecovered: objectPath => recovered.has(objectPath),
    pendingBytes: () => sumPrivateWeatherArchiveReservationBytes(pending ?? []) };
}

export function createPrivateWeatherPublicationStorage(options = {}, reserveRetirementMarker = false, observeInitialStock, reservation) {
  const policy = assertPrivateWeatherPublicationPolicy();
  const allowed = new Set(['storageBackend', 'accountId', 'accessKeyId', 'secretAccessKey', 'fetchImpl', 'now', 'delayImpl']);
  if (!options || Object.getPrototypeOf(options) !== Object.prototype
    || Object.keys(options).some(key => !allowed.has(key))) fail('PRIVATE_WEATHER_PUBLICATION_OPTION_INVALID');
  assertPrivateWeatherPublicationBackend(options.storageBackend);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') fail('PRIVATE_WEATHER_PUBLICATION_OPTION_INVALID');
  let storage;
  let beforeFirstPut;
  const archivePath = url => {
    const prefix = `/${PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId}/`;
    const pathname = new URL(url).pathname;
    return pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
  };
  const guardedFetch = async (url, request) => {
    const method = request?.method;
    const objectPath = reservation && (method === 'HEAD' || method === 'PUT') ? archivePath(url) : '';
    if (method === 'HEAD' && privateWeatherArchivePartSha(objectPath)) {
      const response = await fetchImpl(url, request);
      if (response.status !== 404) return response;
      await response.body?.cancel?.().catch(() => {});
      await reservation.recover(storage);
      // An earlier PUT can finish between this HEAD and recovery. Send an
      // actual fresh HEAD instead of allocating a second PUT from stale absence.
      if (reservation.wasRecovered(objectPath)) return fetchImpl(url, request);
      return response;
    }
    if (method === 'PUT') {
      // This is the frozen adapter's actual first new-object PUT boundary.
      // HEAD reuse never reaches it. A rejected admission is latched too, so
      // the existing adapter retry cannot cause another scan or any PUT.
      beforeFirstPut ??= (async () => {
        const carried = reservation ? await reservation.recover(storage) + PRIVATE_WEATHER_UPLOAD_RESERVATION_BYTES : 0;
        const usage = await storage.bucketUsage();
        if (usage.usedBytes + carried > policy.bucketCeilingBytes - policy.reserveBytes
          - PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes
          - (reserveRetirementMarker ? RETIREMENT_MARKER_BYTES : 0)) {
          fail('PRIVATE_WEATHER_PUBLICATION_GENERATION_CAPACITY');
        }
        observeInitialStock?.(usage);
      })();
      await beforeFirstPut;
      if (reservation) {
        return reservation.upload(objectPath, request, () => fetchImpl(url, request));
      }
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
  let priorRetirementSettled = false;
  const freshPointer = async () => {
    return decodePrivateWeatherPointerRow(await options.request(readQuery, {}, 'read'));
  };
  const settleBeforeMutation = async () => {
    priorSettled ??= retirement.settle(before, freshPointer);
    await priorSettled;
    priorRetirementSettled = true;
  };
  const reservation = archiveUploadReservation(storageOptions);
  let bucketUsageBeforeArchiveUpload;
  const storage = createPrivateWeatherPublicationStorage(storageOptions, true, usage => {
    if (priorRetirementSettled) bucketUsageBeforeArchiveUpload = usage;
  }, reservation);
  let bucketUsageBeforeRetirementMarker;
  const validateMarkerCapacity = async bytes => {
    await reservation.recover(storage);
    const usage = await storage.bucketUsage();
    if (usage.usedBytes + bytes + policy.reserveBytes + reservation.pendingBytes() > policy.bucketCeilingBytes) {
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
        await reservation.verifyCleanupAllowed(objectPath);
        return storage.removeExact(objectPath);
      },
    },
  });
  // Acknowledged writes are already safe to publish. A failed journal
  // cleanup carries the previous positive reservation into the next run.
  try { await reservation.finish(); } catch {}
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
  const reservation = createPrivateWeatherUploadReservationR2(storageOptions);
  const carried = await readPrivateWeatherArchiveUploadReservationBytes(reservation);
  const { usedBytes } = await createPrivateWeatherPublicationStorage(storageOptions).bucketUsage();
  if (usedBytes + carried > policy.bucketCeilingBytes - policy.reserveBytes
      - PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes - RETIREMENT_MARKER_BYTES
      - PRIVATE_WEATHER_UPLOAD_RESERVATION_BYTES) {
    fail('PRIVATE_WEATHER_PUBLICATION_GENERATION_CAPACITY');
  }
}

export async function appendPrivateWeatherPublicationSummary(result, env = process.env) {
  const summaryPath = env.GITHUB_STEP_SUMMARY;
  if (env.GITHUB_ACTIONS !== 'true' || !path.isAbsolute(summaryPath ?? '')) return;

  const counts = value => {
    const { usedBytes, objectCount } = value ?? {};
    if (!Number.isSafeInteger(usedBytes) || usedBytes < 0
      || !Number.isSafeInteger(objectCount) || objectCount < 0) return null;
    return { usedBytes, objectCount };
  };
  const openingUsage = counts(result.bucketUsageBeforeArchiveUpload);
  const openingStock = openingUsage
    ? `R2 reported ${openingUsage.usedBytes} bytes before the first new archive object, following any retirement from earlier runs. The object count was ${openingUsage.objectCount}.`
    : 'R2 bucket usage before the first new archive object was not measured.';
  const usage = counts(result.bucketUsageBeforeRetirementMarker);
  const storage = usage
    ? `R2 reported ${usage.usedBytes} bytes after archive verification and before the retirement marker upload. The object count was ${usage.objectCount}.`
    : 'R2 bucket usage before the retirement marker upload was not measured.';
  const cleanup = result.retentionCleanupComplete;
  let retirement = 'The publisher reported no retirement result.';
  if (cleanup === true) retirement = 'The retirement check completed.';
  if (cleanup === false) retirement = 'Retirement cleanup remains unresolved.';
  try {
    const stock = {
      bucketUsageBeforeArchiveUpload: openingUsage,
      bucketUsageBeforeRetirementMarker: usage,
    };
    console.log('::notice title=RavRadar R2 archive stock::' + JSON.stringify(stock));
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
