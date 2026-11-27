#!/usr/bin/env node
// Normal weather delivery only. The frozen archive/model readers and publisher
// remain the authority for payload, exact readback and parent CAS.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrivateRuntimeJson } from './private-production-runtime-bundle.mjs';
import { createR2PrivateRuntimeStorage } from './lib/r2-private-runtime-storage.mjs';
import { createPrivateWeatherUploadReservationR2, PRIVATE_WEATHER_PUBLICATION_POLICY,
  PRIVATE_WEATHER_UPLOAD_RESERVATION_BYTES, ARCHIVE_UPLOAD_JOURNAL_KIND, RESERVED_ARCHIVE_UPLOAD_MAXIMUM_ENTRIES,
  RESERVED_ARCHIVE_UPLOAD_MAXIMUM_BYTES, privateWeatherArchivePartSha, privateWeatherArchivePartGroup,
  sumPrivateWeatherArchiveReservationBytes,
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


async function hasR2MissingObjectCode(response) {
  if (!/^application\/xml(?:[ \t]*;[ \t]*charset=utf-8)?$/i.test(response.headers.get('content-type') ?? '')
      || !response.body?.getReader) return false;
  const maximum = 4096;
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^[1-9][0-9]*$/.test(declared) || Number(declared) > maximum)) return false;
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > maximum) return false;
      chunks.push(Buffer.from(next.value));
    }
    if (declared !== null && size !== Number(declared)) return false;
    const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, size));
    return /^(?:<\?xml version="1\.0"(?: encoding="UTF-8")?\?>\s*)?<Error>\s*<Code>NoSuchKey<\/Code>(?:\s*<(Message|Resource|RequestId|HostId|Key|BucketName)>[^<>]*<\/\1>)*\s*<\/Error>\s*$/.test(text);
  } catch {
    return false;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function orphanArchiveTransport(options, objectPath) {
  const fetchImpl = options?.fetchImpl ?? globalThis.fetch;
  const bucketId = PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId;
  let deleteSent = false;
  let missing = false;
  const storage = createR2PrivateRuntimeStorage({
    ...options, bucketId, maximumObjectBytes: PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveBytes,
    fetchImpl: async (url, request) => {
      const method = request?.method;
      if (!privateWeatherArchivePartSha(objectPath) || new URL(url).pathname !== '/' + bucketId + '/' + objectPath
          || !request.headers?.authorization || request.redirect !== 'manual'
          || (method !== 'GET' && method !== 'DELETE')) fail('PRIVATE_WEATHER_ORPHAN_TRANSPORT_IDENTITY');
      if (method === 'DELETE') {
        if (deleteSent) fail('PRIVATE_WEATHER_ORPHAN_DELETE_ALREADY_SENT');
        deleteSent = true;
      }
      const response = await fetchImpl(url, { ...request, cache: 'no-store', signal: AbortSignal.timeout(8_000) });
      if (method === 'GET') missing = response.status === 404 && await hasR2MissingObjectCode(response);
      return response;
    },
  });
  return {
    async read() {
      missing = false;
      try { return await storage.download(objectPath); }
      catch (error) {
        if (missing) return null;
        throw error;
      }
    },
    remove: () => storage.removeExact(objectPath),
  };
}

function archiveUploadReservation(options) {
  const fetchImpl = options?.fetchImpl ?? globalThis.fetch;
  const record = createPrivateWeatherUploadReservationR2({ ...options,
    fetchImpl: (url, request) => fetchImpl(url, { ...request, signal: AbortSignal.timeout(8_000) }),
  });
  const fingerprint = value => crypto.createHash('sha256').update(canonicalPrivateRuntimeJson(value)).digest('hex');
  let load;
  let base;
  let state = { objects: [], intents: [] };
  const attempted = new Map();
  const acknowledged = new Set();
  const object = objectPath => state.objects.find(part => part.path === objectPath);
  const pendingBytes = () => sumPrivateWeatherArchiveReservationBytes(state.objects);
  function observeBytes(objectPath, bytes) {
    const part = object(objectPath);
    if (!part || part.status !== 'pending') return;
    if (bytes.length !== part.bytes || crypto.createHash('sha256').update(bytes).digest('hex') !== privateWeatherArchivePartSha(objectPath)) {
      fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_ARCHIVE_IDENTITY');
    }
    state = { ...state, objects: state.objects.map(entry => entry === part
      ? { ...part, status: 'present', created: part.created || acknowledged.has(objectPath) } : entry) };
  }
  async function recover(storage) {
    load ??= (async () => {
      base = await record.read();
      if (base) state = decodePrivateWeatherArchiveReservation(base.bytes);
      for (const part of state.objects) {
        if (part.status !== 'pending') continue;
        let remote;
        try { remote = await storage.download(part.path); }
        catch { continue; } // Absence does not establish that a PUT has stopped.
        observeBytes(part.path, remote);
      }
    })();
    await load;
  }
  function encode(next) {
    const bytes = Buffer.from(JSON.stringify({
      kind: ARCHIVE_UPLOAD_JOURNAL_KIND, revision: crypto.randomUUID(), ...next,
    }));
    if (bytes.length > PRIVATE_WEATHER_UPLOAD_RESERVATION_BYTES
        || next.objects.length > RESERVED_ARCHIVE_UPLOAD_MAXIMUM_ENTRIES
        || sumPrivateWeatherArchiveReservationBytes(next.objects) > RESERVED_ARCHIVE_UPLOAD_MAXIMUM_BYTES) {
      fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_CAPACITY');
    }
    decodePrivateWeatherArchiveReservation(bytes);
    return bytes;
  }
  async function writeAndRead(bytes, expected) {
    try { await record.compareAndSwap(bytes, expected?.etag ?? null); }
    catch { /* The outcome is established by authenticated readback. */ }
    try { return await record.read(); }
    catch { return record.read(); }
  }
  async function fenceUnsentReservation(bytes, observed) {
    // Race the unanswered journal write while retaining older obligations.
    const fence = encode(state);
    let current = await writeAndRead(fence, observed);
    if (current?.bytes.equals(bytes)) current = await writeAndRead(fence, current);
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
    state = next;
  }
  async function flush() {
    const previous = base ? decodePrivateWeatherArchiveReservation(base.bytes) : { objects: [], intents: [] };
    if (JSON.stringify(previous) !== JSON.stringify(state)) await store(state);
  }
  function withoutPaths(paths, snapshot = state) {
    return {
      objects: snapshot.objects.filter(part => !paths.has(part.path)),
      intents: snapshot.intents.map(intent => ({ ...intent, paths: intent.paths.filter(item => !paths.has(item)) }))
        .filter(intent => intent.paths.length > 0),
    };
  }
  async function upload(objectPath, request, send) {
    const digest = privateWeatherArchivePartSha(objectPath);
    if (!digest || !Buffer.isBuffer(request.body) || digest !== request.headers['x-amz-content-sha256']) {
      fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_ARCHIVE_IDENTITY');
    }
    if (attempted.get(objectPath)) throw attempted.get(objectPath);
    if (attempted.has(objectPath) || object(objectPath)) fail('PRIVATE_WEATHER_UPLOAD_ALREADY_UNRESOLVED');
    // Only one physical PUT for this durable reservation.
    attempted.set(objectPath, null);
    const part = { path: objectPath, bytes: request.body.length, status: 'pending', created: false };
    try {
      await store({ ...state, objects: [...state.objects, part] }, true);
      const response = await send();
      if ([200, 201, 204].includes(response.status)) acknowledged.add(objectPath);
      else if (response.status === 412) state = withoutPaths(new Set([objectPath]));
      return response;
    } catch (error) {
      attempted.set(objectPath, error);
      throw error;
    }
  }
  function observePointer(pointer) {
    if (!pointer) return;
    const proof = fingerprint(pointer);
    const previous = fingerprint(pointer.payload.previous);
    const transferred = new Set();
    for (const archive of [pointer.payload.current, pointer.payload.previous].filter(Boolean)) {
      for (const part of archive.objects ?? [archive]) {
        const tracked = object(part.objectPath);
        if (tracked?.status !== 'present') continue;
        if (tracked.bytes !== part.objectBytes) fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_ARCHIVE_IDENTITY');
        transferred.add(part.objectPath);
      }
    }
    const intents = [];
    for (const intent of state.intents) {
      if (pointer.version === intent.beforeVersion && proof !== intent.beforeSha256) {
        fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_POINTER_CHANGED');
      }
      if (pointer.version !== intent.beforeVersion + 1 || previous !== intent.previousSha256) {
        intents.push(intent);
        continue;
      }
      if (intent.successorSha256 !== null && intent.successorSha256 !== proof) {
        fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_SUCCESSOR_CHANGED');
      }
      if (proof === intent.afterSha256) {
        for (const objectPath of intent.paths) transferred.add(objectPath);
      } else {
        intents.push({ ...intent, successorSha256: proof });
      }
    }
    state = withoutPaths(transferred, { ...state, intents });
  }
  async function preparePointer(before, after, freshPointer) {
    if (!state.objects.length && !state.intents.length) return flush();
    const beforeSha256 = fingerprint(before);
    if (fingerprint(await freshPointer()) !== beforeSha256) fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_POINTER_CHANGED');
    observePointer(before);
    const afterSha256 = fingerprint(after);
    if (state.intents.some(intent => intent.afterSha256 === afterSha256)) {
      fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_POINTER_UNRESOLVED');
    }
    const archive = after.payload.current;
    const paths = (archive.objects ?? [archive]).filter(part => object(part.objectPath))
      .map(part => part.objectPath);
    if (paths.some(objectPath => object(objectPath)?.status !== 'present')) {
      fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_ARCHIVE_IDENTITY');
    }
    if (paths.length === 0) return flush();
    const intent = { beforeVersion: before?.version ?? 0, beforeSha256,
      previousSha256: fingerprint(before?.payload.current ?? null), afterSha256, paths, successorSha256: null };
    await store({ ...state, intents: [...state.intents, intent] });
  }
  async function finish(pointer, freshPointer) {
    if (!load) return;
    if (state.objects.some(part => part.status === 'present')) {
      if (fingerprint(await freshPointer()) !== fingerprint(pointer)) fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_POINTER_CHANGED');
      observePointer(pointer);
    }
    await flush();
  }
  async function settleOneOrphan(storage, incoming, before, freshPointer) {
    if (!before) return;
    await recover(storage);
    const beforeSha = fingerprint(before);
    const activeGroup = privateWeatherArchivePartGroup(incoming);
    if (!activeGroup) fail('PRIVATE_WEATHER_ORPHAN_TRANSPORT_IDENTITY');
    const live = [before.payload.current, before.payload.previous].filter(Boolean)
      .flatMap(archive => archive.objects ?? [archive]);
    const protectedPaths = new Set(live.map(part => part.objectPath));
    const eligible = part => part.created && !protectedPaths.has(part.path)
      && privateWeatherArchivePartGroup(part.path) !== activeGroup
      && state.intents.filter(intent => intent.paths.includes(part.path)).every(intent => {
        const successorVersion = intent.beforeVersion + 1;
        return intent.successorSha256 !== null && (before.version > successorVersion
          || (before.version === successorVersion && beforeSha === intent.successorSha256));
      });
    const candidate = state.objects.find(part => part.status === 'present' && eligible(part))
      ?? state.objects.find(part => part.status === 'orphan-deleting' && eligible(part));
    if (!candidate) return;
    const { path: objectPath, bytes: expectedBytes } = candidate;
    const remote = orphanArchiveTransport(options, objectPath);
    async function requireUnchangedOwners() {
      if (fingerprint(await freshPointer()) !== beforeSha) fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_POINTER_CHANGED');
      const current = await record.read();
      if (!current || current.etag !== base?.etag || !current.bytes.equals(base.bytes)) {
        fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_WRITE_UNKNOWN');
      }
    }
    await requireUnchangedOwners();
    const bytes = await remote.read();
    if (candidate.status === 'present') {
      // The first probe must positively bind the exact physical object.
      if (!bytes || bytes.length !== expectedBytes
          || crypto.createHash('sha256').update(bytes).digest('hex') !== privateWeatherArchivePartSha(objectPath)) return;
      // Fences older journal intents before any DELETE can leave here. A
      // later job may verify absence but cannot send another physical DELETE.
      await store({ ...state, objects: state.objects.map(part => part === candidate
        ? { ...part, status: 'orphan-deleting' } : part) });
      await requireUnchangedOwners();
      try { await remote.remove(); } catch { /* Only authenticated readback settles absence. */ }
      if (await remote.read() !== null) return;
    } else if (bytes !== null) {
      return;
    }
    await requireUnchangedOwners();
    await store(withoutPaths(new Set([objectPath])));
  }
  async function removeCreated(objectPath, remove) {
    const part = object(objectPath);
    if (!part) return remove();
    // This is only the frozen publisher's own pre-pointer cleanup edge.
    if (!acknowledged.has(objectPath) || state.intents.some(intent => intent.paths.includes(objectPath))) {
      fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_CLEANUP_HELD');
    }
    await store({ ...state, objects: state.objects.map(entry => entry === part
      ? { ...part, status: 'deleting', created: true } : entry) });
    const removed = await remove();
    await store(withoutPaths(new Set([objectPath])));
    return removed;
  }
  return { recover, upload, observeBytes, pendingBytes, flush, preparePointer, finish, removeCreated, settleOneOrphan,
    wasRecovered: objectPath => object(objectPath)?.status === 'present',
    deletionUnresolved: objectPath => ['deleting', 'orphan-deleting'].includes(object(objectPath)?.status) };
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
      await reservation.recover(storage);
      if ([200, 404].includes(response.status)) await reservation.beforeArchive(storage, objectPath);
      if (reservation.deletionUnresolved(objectPath)) {
        await response.body?.cancel?.().catch(() => {});
        fail('PRIVATE_WEATHER_UPLOAD_RESERVATION_CLEANUP_HELD');
      }
      if (response.status !== 404) return response;
      await response.body?.cancel?.().catch(() => {});
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
        await reservation?.recover(storage);
        const carried = reservation ? reservation.pendingBytes() + PRIVATE_WEATHER_UPLOAD_RESERVATION_BYTES : 0;
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
  let before, lastRead, readQuery, priorSettled, orphanSettled;
  let priorRetirementSettled = false;
  const freshPointer = async () => {
    return decodePrivateWeatherPointerRow(await options.request(readQuery, { cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' } }, 'read'));
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
  }, { ...reservation, beforeArchive(activeStorage, objectPath) {
    // Run after the incoming HEAD and before any new archive PUT or stock measurement.
    orphanSettled ??= reservation.settleOneOrphan(activeStorage, objectPath, before, freshPointer).catch(() => {});
    return orphanSettled;
  } });
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
  let pointerIntentStarted = false;
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
      if (phase === 'compare-and-swap' || phase === 'insert') {
        await settleBeforeMutation();
        const next = decodePrivateWeatherPointerRow([{
          document_key: PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey,
          version: (before?.version ?? 0) + 1,
          payload: JSON.parse(request.body).payload,
        }]);
        // Keep positive ownership even if the later B-intent write never starts.
        await reservation.flush();
        if (phase === 'compare-and-swap') await retirement.prepare(before, next.payload, validateMarkerCapacity);
        pointerIntentStarted = true;
        await reservation.preparePointer(before, next, freshPointer);
      }
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
      async download(objectPath) {
        const bytes = await storage.download(objectPath);
        reservation.observeBytes(objectPath, bytes);
        return bytes;
      },
      async removeExact(objectPath) {
        // An uncertain journal intent or B response keeps the candidate.
        // The old B row alone cannot exclude a late commit.
        if (pointerIntentStarted && createdPaths.has(objectPath)) {
          fail('PRIVATE_WEATHER_PUBLICATION_CANDIDATE_HELD_AFTER_POINTER_WRITE');
        }
        // On success the frozen publisher requests deletion of the exact old
        // previous parts. Their authenticated marker owns this cleanup now.
        if (pointerIntentStarted) return true;
        return reservation.removeCreated(objectPath, () => storage.removeExact(objectPath));
      },
    },
  });
  // The frozen publisher has verified B. Keep ownership for a later run if
  // the authenticated transfer cannot be durably recorded now.
  try { await reservation.finish(lastRead, freshPointer); } catch {}
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
