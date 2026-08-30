#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { gzip, gunzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY,
  PRIVATE_RUNTIME_REPOSITORY_ROOT,
  canonicalPrivateRuntimeJson,
  verifyPrivateProductionRuntimeBundle,
} from './private-production-runtime-bundle.mjs';
import {
  buildSupabaseAdminHeaders,
  createSupabaseAdminRequester,
} from './lib/supabase-admin-rest.mjs';
import {
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export const PROTECTED_PRIVATE_RUNTIME_POLICY = Object.freeze({
  schemaVersion: '1.0.0',
  archiveKind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_ARCHIVE',
  pointerKind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_POINTER',
  descriptorKind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_OBJECT',
  privacyClass: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass,
  documentKey: 'ravscore-private-production-runtime-pointer',
  bucketId: 'ravradar-private-production-runtime',
  mimeType: 'application/gzip',
  maximumRawPayloadBytes: 768 * 1024 * 1024,
  // Supabase Free projects accept at most one 50 MiB Storage object. Keep the
  // complete archive only while it fits that real object boundary; larger
  // generations fail closed before upload rather than relying on a bucket
  // configuration value that the project plan cannot honour.
  maximumArchiveBytes: 50 * 1024 * 1024,
  maximumEnvelopeBytes: 1_040 * 1024 * 1024,
  maximumFileCount: 33,
});

const POINTER_KEYS = Object.freeze(['schemaVersion', 'kind', 'current', 'previous']);
const DESCRIPTOR_KEYS = Object.freeze([
  'schemaVersion',
  'kind',
  'privacyClass',
  'bucketId',
  'objectPath',
  'objectSha256',
  'objectBytes',
  'bundleContentSha256',
  'datasetId',
  'productionReferenceAt',
  'generatedAt',
  'sourceHead',
  'modelBinding',
  'contractHashes',
]);
const ARCHIVE_KEYS = Object.freeze([
  'schemaVersion',
  'kind',
  'privacyClass',
  'bundleContentSha256',
  'fileCount',
  'rawPayloadBytes',
  'files',
]);
const ARCHIVE_FILE_KEYS = Object.freeze(['path', 'bytes', 'sha256', 'contentBase64']);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SOURCE_HEAD_PATTERN = /^[0-9a-f]{40}$/;
const DATASET_ID_PATTERN = /^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const isPlainObject = value => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;

function exactKeys(value, expected, label) {
  if (!isPlainObject(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort(compareText);
  const wanted = [...expected].sort(compareText);
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} has an incompatible field set`);
  }
}

function canonicalTime(value, label) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} is invalid`);
  }
  const canonical = new Date(value).toISOString();
  if (canonical !== value) throw new Error(`${label} is not canonical UTC`);
  return canonical;
}

function same(left, right) {
  return canonicalPrivateRuntimeJson(left) === canonicalPrivateRuntimeJson(right);
}

function safeArchivePath(value) {
  if (value === 'manifest.json') return value;
  if (typeof value !== 'string'
    || !value.startsWith('payload/')
    || value.includes('\\')
    || value.includes('\0')
    || path.posix.isAbsolute(value)
    || path.win32.isAbsolute(value)
    || path.posix.normalize(value) !== value
    || value.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('Private runtime archive contains an unsafe path');
  }
  return value;
}

function assertInside(parent, child, label, { strict = true } = {}) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  const valid = (!strict || relative !== '')
    && relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
  if (!valid) throw new Error(`${label} escapes its private root`);
}

async function assertPrivateRoot({ privateRoot, repositoryRoot }) {
  const root = path.resolve(privateRoot);
  const repository = path.resolve(repositoryRoot);
  const rootStat = await fs.lstat(root).catch(() => null);
  const repositoryStat = await fs.lstat(repository).catch(() => null);
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()
    || !repositoryStat?.isDirectory() || repositoryStat.isSymbolicLink()) {
    throw new Error('Private runtime root or repository root is invalid');
  }
  const realRoot = await fs.realpath(root);
  const realRepository = await fs.realpath(repository);
  const overlap = (left, right) => {
    const relative = path.relative(left, right);
    return relative === '' || (!path.isAbsolute(relative)
      && relative !== '..' && !relative.startsWith(`..${path.sep}`));
  };
  if (overlap(realRoot, realRepository) || overlap(realRepository, realRoot)) {
    throw new Error('Private runtime root must be outside the repository and web tree');
  }
  return { requestedRoot: root, root: realRoot, repository: realRepository };
}

function resolvePrivateCandidate(context, candidate, label) {
  const requested = path.resolve(candidate);
  let relative;
  try {
    assertInside(context.requestedRoot, requested, label);
    relative = path.relative(context.requestedRoot, requested);
  } catch {
    assertInside(context.root, requested, label);
    relative = path.relative(context.root, requested);
  }
  const resolved = path.resolve(context.root, relative);
  assertInside(context.root, resolved, label);
  return resolved;
}

async function readBundleEntry(file, maximumBytes) {
  const stat = await fs.lstat(file).catch(() => null);
  if (!stat?.isFile() || stat.isSymbolicLink() || stat.size > maximumBytes) {
    throw new Error('Private runtime archive source is invalid or exceeds its size limit');
  }
  const bytes = await fs.readFile(file);
  if (bytes.length !== stat.size) throw new Error('Private runtime archive source changed');
  return bytes;
}

export async function buildProtectedPrivateRuntimeArchive({
  privateRoot,
  bundlePath,
  repositoryRoot = PRIVATE_RUNTIME_REPOSITORY_ROOT,
  expected = {},
  now = new Date().toISOString(),
  sourceHead,
  policy = PROTECTED_PRIVATE_RUNTIME_POLICY,
} = {}) {
  if (!SOURCE_HEAD_PATTERN.test(String(sourceHead ?? ''))) {
    throw new Error('Private runtime archive requires an exact source head');
  }
  const verified = await verifyPrivateProductionRuntimeBundle({
    privateRoot,
    bundlePath,
    repositoryRoot,
    expected,
    now,
  });
  const entries = [{
    path: 'manifest.json',
    descriptor: null,
  }, ...verified.files.map(descriptor => ({
    path: `payload/${descriptor.relativePath}`,
    descriptor,
  }))].sort((left, right) => compareText(left.path, right.path));
  if (entries.length > policy.maximumFileCount) {
    throw new Error('Private runtime archive file count exceeds its bound');
  }
  let rawPayloadBytes = 0;
  const files = [];
  for (const entry of entries) {
    const bytes = await readBundleEntry(
      path.join(verified.bundlePath, ...entry.path.split('/')),
      policy.maximumRawPayloadBytes,
    );
    rawPayloadBytes += bytes.length;
    if (rawPayloadBytes > policy.maximumRawPayloadBytes) {
      throw new Error('Private runtime archive raw payload exceeds its bound');
    }
    const digest = sha256(bytes);
    if (entry.descriptor
      && (entry.descriptor.bytes !== bytes.length || entry.descriptor.sha256 !== digest)) {
      throw new Error('Private runtime archive source contradicts its verified manifest');
    }
    files.push({
      path: entry.path,
      bytes: bytes.length,
      sha256: digest,
      contentBase64: bytes.toString('base64'),
    });
  }
  const envelope = {
    schemaVersion: policy.schemaVersion,
    kind: policy.archiveKind,
    privacyClass: policy.privacyClass,
    bundleContentSha256: verified.bundleContentSha256,
    fileCount: files.length,
    rawPayloadBytes,
    files,
  };
  const envelopeBytes = Buffer.from(canonicalPrivateRuntimeJson(envelope), 'utf8');
  if (envelopeBytes.length > policy.maximumEnvelopeBytes) {
    throw new Error('Private runtime archive envelope exceeds its bound');
  }
  const archive = await gzipAsync(envelopeBytes, { level: 9, mtime: 0 });
  if (archive.length < 1 || archive.length > policy.maximumArchiveBytes) {
    throw new Error('Private runtime compressed archive exceeds its bound');
  }
  const objectSha256 = sha256(archive);
  const descriptor = validateProtectedPrivateRuntimeDescriptor({
    schemaVersion: policy.schemaVersion,
    kind: policy.descriptorKind,
    privacyClass: policy.privacyClass,
    bucketId: policy.bucketId,
    objectPath: `bundles/sha256/${objectSha256}.json.gz`,
    objectSha256,
    objectBytes: archive.length,
    bundleContentSha256: verified.bundleContentSha256,
    datasetId: verified.datasetId,
    productionReferenceAt: verified.productionReferenceAt,
    generatedAt: verified.generatedAt,
    sourceHead,
    modelBinding: verified.modelBinding,
    contractHashes: verified.contractHashes,
  }, { policy });
  return { archive, descriptor, verified };
}

function validateBinding(value) {
  if (!isPlainObject(value)) throw new Error('Private runtime descriptor model binding is invalid');
  const expected = ravScoreModelBinding();
  exactKeys(value, Object.keys(expected), 'Private runtime descriptor model binding');
  assertRavScoreModelBinding(value, 'Private runtime descriptor model binding');
  if (!SHA256_PATTERN.test(value.modelContractSha256)
    || !SHA256_PATTERN.test(value.modelBundleSha256)) {
    throw new Error('Private runtime descriptor model digests are invalid');
  }
  return { ...expected };
}

function validateContractHashes(value) {
  if (!isPlainObject(value)) throw new Error('Private runtime descriptor contracts are invalid');
  const keys = Object.keys(value).sort(compareText);
  if (keys.length < 3 || keys.length > 16
    || !PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.requiredContractHashKeys
      .every(key => keys.includes(key))) {
    throw new Error('Private runtime descriptor contracts are incomplete');
  }
  for (const key of keys) {
    if (!/^[a-z][A-Za-z0-9]{0,63}Sha256$/.test(key)
      || !SHA256_PATTERN.test(String(value[key] ?? ''))) {
      throw new Error('Private runtime descriptor contracts are invalid');
    }
  }
  return Object.fromEntries(keys.map(key => [key, value[key]]));
}

export function validateProtectedPrivateRuntimeDescriptor(value, {
  policy = PROTECTED_PRIVATE_RUNTIME_POLICY,
} = {}) {
  exactKeys(value, DESCRIPTOR_KEYS, 'Private runtime object descriptor');
  if (value.schemaVersion !== policy.schemaVersion
    || value.kind !== policy.descriptorKind
    || value.privacyClass !== policy.privacyClass
    || value.bucketId !== policy.bucketId
    || !SHA256_PATTERN.test(String(value.objectSha256 ?? ''))
    || value.objectPath !== `bundles/sha256/${value.objectSha256}.json.gz`
    || !Number.isSafeInteger(value.objectBytes)
    || value.objectBytes < 1
    || value.objectBytes > policy.maximumArchiveBytes
    || !SHA256_PATTERN.test(String(value.bundleContentSha256 ?? ''))
    || !DATASET_ID_PATTERN.test(String(value.datasetId ?? ''))
    || !SOURCE_HEAD_PATTERN.test(String(value.sourceHead ?? ''))) {
    throw new Error('Private runtime object descriptor is invalid');
  }
  return {
    ...value,
    productionReferenceAt: canonicalTime(
      value.productionReferenceAt,
      'Private runtime descriptor production reference',
    ),
    generatedAt: canonicalTime(value.generatedAt, 'Private runtime descriptor generation time'),
    modelBinding: validateBinding(value.modelBinding),
    contractHashes: validateContractHashes(value.contractHashes),
  };
}

export function validateProtectedPrivateRuntimePointer(value, {
  policy = PROTECTED_PRIVATE_RUNTIME_POLICY,
} = {}) {
  exactKeys(value, POINTER_KEYS, 'Private runtime pointer');
  if (value.schemaVersion !== policy.schemaVersion || value.kind !== policy.pointerKind) {
    throw new Error('Private runtime pointer identity is invalid');
  }
  const current = validateProtectedPrivateRuntimeDescriptor(value.current, { policy });
  const previous = value.previous === null
    ? null
    : validateProtectedPrivateRuntimeDescriptor(value.previous, { policy });
  if (previous) {
    const previousMs = Date.parse(previous.productionReferenceAt);
    const currentMs = Date.parse(current.productionReferenceAt);
    if (previousMs > currentMs
      || (previousMs === currentMs && previous.objectSha256 !== current.objectSha256)) {
      throw new Error('Private runtime pointer generations are not monotonic');
    }
  }
  return { schemaVersion: value.schemaVersion, kind: value.kind, current, previous };
}

function validateArchiveEnvelope(envelope, descriptor, policy) {
  exactKeys(envelope, ARCHIVE_KEYS, 'Private runtime archive');
  if (envelope.schemaVersion !== policy.schemaVersion
    || envelope.kind !== policy.archiveKind
    || envelope.privacyClass !== policy.privacyClass
    || envelope.bundleContentSha256 !== descriptor.bundleContentSha256
    || !Number.isSafeInteger(envelope.fileCount)
    || envelope.fileCount < 2
    || envelope.fileCount > policy.maximumFileCount
    || !Number.isSafeInteger(envelope.rawPayloadBytes)
    || envelope.rawPayloadBytes < 1
    || envelope.rawPayloadBytes > policy.maximumRawPayloadBytes
    || !Array.isArray(envelope.files)
    || envelope.files.length !== envelope.fileCount) {
    throw new Error('Private runtime archive descriptor is invalid');
  }
  let total = 0;
  const paths = new Set();
  const files = envelope.files.map((file, index) => {
    exactKeys(file, ARCHIVE_FILE_KEYS, `Private runtime archive file ${index}`);
    const archivePath = safeArchivePath(file.path);
    if (paths.has(archivePath)) throw new Error('Private runtime archive contains duplicate paths');
    paths.add(archivePath);
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0
      || !SHA256_PATTERN.test(String(file.sha256 ?? ''))
      || typeof file.contentBase64 !== 'string'
      || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.contentBase64)) {
      throw new Error('Private runtime archive file descriptor is invalid');
    }
    const bytes = Buffer.from(file.contentBase64, 'base64');
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) {
      throw new Error('Private runtime archive file integrity is invalid');
    }
    total += bytes.length;
    if (total > policy.maximumRawPayloadBytes) {
      throw new Error('Private runtime archive raw payload exceeds its bound');
    }
    return { path: archivePath, bytes };
  });
  const sorted = [...files].sort((left, right) => compareText(left.path, right.path));
  if (files.some((file, index) => file.path !== sorted[index].path)
    || !paths.has('manifest.json')
    || files.some(file => file.path !== 'manifest.json' && !file.path.startsWith('payload/'))
    || total !== envelope.rawPayloadBytes) {
    throw new Error('Private runtime archive inventory is invalid');
  }
  return files;
}

async function decodeArchive(archive, descriptor, policy) {
  if (!Buffer.isBuffer(archive)) archive = Buffer.from(archive);
  if (archive.length !== descriptor.objectBytes || sha256(archive) !== descriptor.objectSha256) {
    throw new Error('Protected private runtime object integrity is invalid');
  }
  let envelopeBytes;
  try {
    envelopeBytes = await gunzipAsync(archive, { maxOutputLength: policy.maximumEnvelopeBytes });
  } catch {
    throw new Error('Protected private runtime archive cannot be decompressed within its bound');
  }
  let envelope;
  try {
    envelope = JSON.parse(envelopeBytes.toString('utf8'));
  } catch {
    throw new Error('Protected private runtime archive cannot be parsed');
  }
  return validateArchiveEnvelope(envelope, descriptor, policy);
}

async function extractArchive({ archive, descriptor, privateRoot, bundlePath, repositoryRoot, policy }) {
  const context = await assertPrivateRoot({ privateRoot, repositoryRoot });
  const destination = resolvePrivateCandidate(
    context,
    bundlePath,
    'Private runtime bundle destination',
  );
  const existing = await fs.lstat(destination).catch(() => null);
  if (existing) throw new Error('Private runtime bundle destination already exists');
  const files = await decodeArchive(archive, descriptor, policy);
  const stage = `${destination}.protected-stage-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  assertInside(context.root, stage, 'Private runtime bundle stage');
  try {
    await fs.mkdir(stage, { recursive: true, mode: 0o700 });
    for (const file of files) {
      const target = path.join(stage, ...file.path.split('/'));
      assertInside(stage, target, 'Private runtime extracted file');
      await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await fs.writeFile(target, file.bytes, { flag: 'wx', mode: 0o600 });
    }
    await fs.rename(stage, destination);
  } catch (error) {
    await fs.rm(stage, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

async function invokeDocumentRequest(request, suffix, options, operation) {
  if (typeof request !== 'function') throw new Error('Private runtime pointer requester is missing');
  try {
    return await request(suffix, options, operation);
  } catch (error) {
    const wrapped = new Error(`Private runtime pointer ${operation} failed closed`);
    wrapped.code = 'PROTECTED_PRIVATE_RUNTIME_REMOTE_ERROR';
    wrapped.cause = error;
    throw wrapped;
  }
}

async function readPointerRow(request, { allowMissing, policy }) {
  const key = policy.documentKey;
  const rows = await invokeDocumentRequest(
    request,
    `?document_key=eq.${encodeURIComponent(key)}&select=document_key,payload,version&limit=2`,
    {},
    'read',
  );
  if (!Array.isArray(rows) || rows.length > 1) {
    throw new Error('Private runtime pointer readback is not unique');
  }
  if (rows.length === 0) {
    if (allowMissing) return null;
    throw new Error('Private runtime pointer readback is missing');
  }
  const row = rows[0];
  if (!isPlainObject(row)
    || row.document_key !== key
    || !Number.isSafeInteger(Number(row.version))
    || Number(row.version) < 1) {
    throw new Error('Private runtime pointer row is invalid');
  }
  return { ...row, version: Number(row.version), payload: validateProtectedPrivateRuntimePointer(row.payload, { policy }) };
}

function assertStorage(storage) {
  for (const method of ['ensurePrivateBucket', 'uploadImmutable', 'download', 'removeExact', 'anonymousStatus']) {
    if (typeof storage?.[method] !== 'function') {
      throw new Error(`Private runtime storage client lacks ${method}`);
    }
  }
}

async function verifyStoredObject(storage, descriptor) {
  const bytes = await storage.download(descriptor.objectPath);
  if (!Buffer.isBuffer(bytes)
    || bytes.length !== descriptor.objectBytes
    || sha256(bytes) !== descriptor.objectSha256) {
    throw new Error('Protected private runtime storage readback is invalid');
  }
  return bytes;
}

export async function publishProtectedPrivateProductionRuntime({
  privateRoot,
  bundlePath,
  repositoryRoot = PRIVATE_RUNTIME_REPOSITORY_ROOT,
  expected = {},
  now = new Date().toISOString(),
  sourceHead,
  request,
  storage,
  policy = PROTECTED_PRIVATE_RUNTIME_POLICY,
} = {}) {
  assertStorage(storage);
  const built = await buildProtectedPrivateRuntimeArchive({
    privateRoot,
    bundlePath,
    repositoryRoot,
    expected,
    now,
    sourceHead,
    policy,
  });
  const existing = await readPointerRow(request, { allowMissing: true, policy });
  if (existing) {
    const centralMs = Date.parse(existing.payload.current.productionReferenceAt);
    const localMs = Date.parse(built.descriptor.productionReferenceAt);
    if (centralMs > localMs) {
      throw new Error('Private runtime publication would regress central production state');
    }
    if (centralMs === localMs) {
      if (!same(existing.payload.current, built.descriptor)) {
        throw new Error('Private runtime publication conflicts at the same production reference');
      }
      await storage.ensurePrivateBucket();
      await storage.uploadImmutable(built.descriptor.objectPath, built.archive);
      await verifyStoredObject(storage, built.descriptor);
      return {
        published: false,
        reason: 'protected-private-runtime-already-current',
        centralVersion: existing.version,
        productionReferenceAt: built.descriptor.productionReferenceAt,
        bundleContentSha256: built.descriptor.bundleContentSha256,
        objectSha256: built.descriptor.objectSha256,
        rollbackAvailable: existing.payload.previous !== null,
        privatePayloadLogged: false,
      };
    }
  }

  await storage.ensurePrivateBucket();
  await storage.uploadImmutable(built.descriptor.objectPath, built.archive);
  // One byte-exact readback is required before the pointer can expose the
  // immutable object. The later pointer CAS/readback proves metadata; a second
  // full object download would add egress without strengthening that proof.
  await verifyStoredObject(storage, built.descriptor);

  const pointer = {
    schemaVersion: policy.schemaVersion,
    kind: policy.pointerKind,
    current: built.descriptor,
    previous: existing?.payload.current ?? null,
  };
  let expectedVersion;
  if (!existing) {
    const inserted = await invokeDocumentRequest(
      request,
      '?on_conflict=document_key&select=document_key,payload,version',
      {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify({ document_key: policy.documentKey, payload: pointer, updated_by: null }),
      },
      'insert',
    );
    if (!Array.isArray(inserted) || inserted.length !== 1 || Number(inserted[0].version) !== 1) {
      throw new Error('Private runtime pointer insert lost a concurrent write');
    }
    expectedVersion = 1;
  } else {
    const updated = await invokeDocumentRequest(
      request,
      `?document_key=eq.${encodeURIComponent(policy.documentKey)}&version=eq.${existing.version}&select=document_key,payload,version`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ payload: pointer, updated_by: null }),
      },
      'compare-and-swap',
    );
    if (!Array.isArray(updated)
      || updated.length !== 1
      || Number(updated[0].version) !== existing.version + 1) {
      throw new Error('Private runtime pointer compare-and-swap lost a concurrent write');
    }
    expectedVersion = existing.version + 1;
  }
  const readback = await readPointerRow(request, { allowMissing: false, policy });
  if (readback.version !== expectedVersion || !same(readback.payload, pointer)) {
    throw new Error('Private runtime pointer readback does not match the publication');
  }

  const retired = existing?.payload.previous ?? null;
  if (retired
    && retired.objectPath !== readback.payload.current.objectPath
    && retired.objectPath !== readback.payload.previous?.objectPath) {
    await storage.removeExact(retired.objectPath);
  }
  return {
    published: true,
    reason: existing ? 'protected-private-runtime-updated' : 'protected-private-runtime-inserted',
    centralVersion: expectedVersion,
    productionReferenceAt: built.descriptor.productionReferenceAt,
    bundleContentSha256: built.descriptor.bundleContentSha256,
    objectSha256: built.descriptor.objectSha256,
    rollbackAvailable: pointer.previous !== null,
    privatePayloadLogged: false,
  };
}

function assertDescriptorMatchesBundle(descriptor, verified) {
  if (descriptor.bundleContentSha256 !== verified.bundleContentSha256
    || descriptor.datasetId !== verified.datasetId
    || descriptor.productionReferenceAt !== verified.productionReferenceAt
    || descriptor.generatedAt !== verified.generatedAt
    || !same(descriptor.modelBinding, verified.modelBinding)
    || !same(descriptor.contractHashes, verified.contractHashes)) {
    throw new Error('Protected private runtime descriptor contradicts its bundle');
  }
}

function assertRestoreTime(descriptor, expected, now, policy) {
  const target = canonicalTime(expected.targetReferenceAt, 'Private runtime restore target');
  const minimumReference = canonicalTime(
    expected.minimumReferenceAt,
    'Private runtime minimum reference',
  );
  const minimumGenerated = canonicalTime(
    expected.minimumGeneratedAt,
    'Private runtime minimum generation',
  );
  const current = canonicalTime(now, 'Private runtime restore time');
  if (Date.parse(descriptor.productionReferenceAt) > Date.parse(target)
    || Date.parse(descriptor.generatedAt)
      > Date.parse(current) + PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.maximumFutureSkewMs) {
    throw new Error('Protected private runtime generation is outside restore bounds');
  }
  if (Date.parse(descriptor.productionReferenceAt) < Date.parse(minimumReference)
    || Date.parse(descriptor.generatedAt) < Date.parse(minimumGenerated)) {
    const error = new Error('Protected private runtime generation has expired');
    error.code = 'PROTECTED_PRIVATE_RUNTIME_EXPIRED';
    throw error;
  }
  if (descriptor.objectBytes > policy.maximumArchiveBytes) {
    throw new Error('Protected private runtime object exceeds restore bounds');
  }
}

export async function restoreProtectedPrivateProductionRuntime({
  privateRoot,
  bundlePath,
  repositoryRoot = PRIVATE_RUNTIME_REPOSITORY_ROOT,
  expected,
  now = new Date().toISOString(),
  request,
  storage,
  policy = PROTECTED_PRIVATE_RUNTIME_POLICY,
} = {}) {
  assertStorage(storage);
  const row = await readPointerRow(request, { allowMissing: true, policy });
  if (!row) {
    return {
      restored: false,
      reason: 'protected-private-runtime-not-found',
      targetUnchanged: true,
      privatePayloadLogged: false,
    };
  }
  await storage.ensurePrivateBucket();
  const context = await assertPrivateRoot({ privateRoot, repositoryRoot });
  const finalBundle = resolvePrivateCandidate(
    context,
    bundlePath,
    'Private runtime bundle destination',
  );
  if (await fs.lstat(finalBundle).catch(() => null)) {
    throw new Error('Private runtime restore destination already exists');
  }
  const descriptors = [row.payload.current, row.payload.previous]
    .filter(Boolean)
    .filter((descriptor, index, all) => all.findIndex(
      candidate => candidate.objectSha256 === descriptor.objectSha256,
    ) === index);
  const temporaryDirectories = [];
  const rejections = [];
  let selected = null;
  try {
    for (let index = 0; index < descriptors.length; index += 1) {
      const descriptor = descriptors[index];
      const candidate = path.join(
        context.root,
        `.protected-runtime-candidate-${process.pid}-${index}-${crypto.randomBytes(5).toString('hex')}`,
      );
      temporaryDirectories.push(candidate);
      try {
        const archive = await verifyStoredObject(storage, descriptor);
        await extractArchive({
          archive,
          descriptor,
          privateRoot: context.root,
          bundlePath: candidate,
          repositoryRoot: context.repository,
          policy,
        });
        const verified = await verifyPrivateProductionRuntimeBundle({
          privateRoot: context.root,
          bundlePath: candidate,
          repositoryRoot: context.repository,
          expected,
          now,
        });
        assertDescriptorMatchesBundle(descriptor, verified);
        // Expiry is non-blocking only after the archived generation has
        // passed the same full manifest, contract, inventory and byte-hash
        // validation as a generation that could actually be restored.
        assertRestoreTime(descriptor, expected, now, policy);
        selected = { descriptor, candidate, verified };
        // Pointer validation already proves current >= previous and rejects
        // conflicting equal-time generations. Normal restore therefore reads
        // current once; previous is downloaded only for genuine rollback.
        break;
      } catch (error) {
        rejections.push(error);
        await fs.rm(candidate, { recursive: true, force: true }).catch(() => {});
      }
    }
    if (!selected) {
      if (rejections.length === descriptors.length
        && rejections.every(error => error?.code === 'PROTECTED_PRIVATE_RUNTIME_EXPIRED')) {
        return {
          restored: false,
          reason: 'protected-private-runtime-expired',
          targetUnchanged: true,
          privatePayloadLogged: false,
        };
      }
      throw new Error('No compatible protected private runtime generation is available');
    }
    await fs.rename(selected.candidate, finalBundle);
    const selectedIndex = temporaryDirectories.indexOf(selected.candidate);
    if (selectedIndex >= 0) temporaryDirectories.splice(selectedIndex, 1);
    const rollbackSelected = selected.descriptor.objectSha256
      !== row.payload.current.objectSha256;
    return {
      restored: true,
      reason: rollbackSelected
        ? 'protected-private-runtime-rollback-restored'
        : 'protected-private-runtime-current-restored',
      centralVersion: row.version,
      productionReferenceAt: selected.descriptor.productionReferenceAt,
      bundleContentSha256: selected.descriptor.bundleContentSha256,
      objectSha256: selected.descriptor.objectSha256,
      rollbackSelected,
      currentGenerationRejected: rollbackSelected,
      rejectedGenerationCount: rejections.length,
      privatePayloadLogged: false,
    };
  } finally {
    await Promise.all(temporaryDirectories.map(directory => {
      assertInside(context.root, directory, 'Private runtime cleanup target');
      return fs.rm(directory, { recursive: true, force: true }).catch(() => {});
    }));
  }
}

export async function auditProtectedPrivateRuntimeAnonymousDenial({
  request,
  storage,
  policy = PROTECTED_PRIVATE_RUNTIME_POLICY,
} = {}) {
  assertStorage(storage);
  const row = await readPointerRow(request, { allowMissing: false, policy });
  const status = await storage.anonymousStatus(row.payload.current.objectPath);
  if (![401, 403, 404].includes(status)) {
    throw new Error('Protected private runtime object is anonymously readable');
  }
  return {
    anonymousReadDenied: true,
    statusClass: `${Math.floor(status / 100)}xx`,
    privatePayloadLogged: false,
  };
}

function safeSupabaseUrl(value) {
  const text = typeof value === 'string' ? value.trim().replace(/\/$/, '') : '';
  let parsed;
  try { parsed = new URL(text); } catch { throw new Error('SUPABASE_URL is invalid'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password
    || parsed.search || parsed.hash) {
    throw new Error('SUPABASE_URL is invalid');
  }
  return text;
}

function encodeObjectPath(objectPath) {
  return objectPath.split('/').map(encodeURIComponent).join('/');
}

export function createProtectedPrivateRuntimeClients({
  supabaseUrl = process.env.SUPABASE_URL,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  fetchImpl = globalThis.fetch,
  policy = PROTECTED_PRIVATE_RUNTIME_POLICY,
} = {}) {
  const url = safeSupabaseUrl(supabaseUrl);
  const key = typeof serviceRoleKey === 'string' ? serviceRoleKey.trim() : '';
  if (!key || typeof fetchImpl !== 'function') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY and fetch are required');
  }
  const headers = buildSupabaseAdminHeaders(key);
  const documentRequest = createSupabaseAdminRequester({
    endpoint: `${url}/rest/v1/admin_documents`,
    key,
    fetchImpl,
  });
  const bucketEndpoint = `${url}/storage/v1/bucket`;
  const objectEndpoint = `${url}/storage/v1/object`;

  async function responseText(response) {
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* safe generic error below */ }
    return { text, json };
  }
  async function ensurePrivateBucket() {
    let response = await fetchImpl(`${bucketEndpoint}/${encodeURIComponent(policy.bucketId)}`, {
      headers,
    });
    if (response.status === 404) {
      response = await fetchImpl(bucketEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: policy.bucketId,
          name: policy.bucketId,
          public: false,
          file_size_limit: policy.maximumArchiveBytes,
          allowed_mime_types: [policy.mimeType],
        }),
      });
      if (!response.ok && response.status !== 409) {
        throw new Error('Protected private runtime bucket creation failed closed');
      }
      response = await fetchImpl(`${bucketEndpoint}/${encodeURIComponent(policy.bucketId)}`, {
        headers,
      });
    }
    const parsed = await responseText(response);
    const bucket = parsed.json;
    const limit = Number(bucket?.file_size_limit);
    if (!response.ok
      || bucket?.id !== policy.bucketId
      || bucket?.name !== policy.bucketId
      || bucket?.public !== false
      || !Number.isSafeInteger(limit)
      || limit < policy.maximumArchiveBytes
      || !Array.isArray(bucket?.allowed_mime_types)
      || !bucket.allowed_mime_types.includes(policy.mimeType)) {
      throw new Error('Protected private runtime bucket policy is incompatible');
    }
    return true;
  }
  async function uploadImmutable(objectPath, bytes) {
    const response = await fetchImpl(
      `${objectEndpoint}/${encodeURIComponent(policy.bucketId)}/${encodeObjectPath(objectPath)}`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': policy.mimeType,
          'x-upsert': 'false',
        },
        body: bytes,
      },
    );
    if (response.ok) return { created: true };
    const parsed = await responseText(response);
    if ([400, 409].includes(response.status)
      && /duplicate|already exists|resource already exists/i.test(
        String(parsed.json?.message ?? parsed.json?.error ?? parsed.text),
      )) {
      return { created: false, alreadyExists: true };
    }
    throw new Error('Protected private runtime immutable upload failed closed');
  }
  async function download(objectPath) {
    const response = await fetchImpl(
      `${objectEndpoint}/authenticated/${encodeURIComponent(policy.bucketId)}/${encodeObjectPath(objectPath)}`,
      { headers },
    );
    const length = Number(response.headers?.get?.('content-length'));
    if (!response.ok
      || (Number.isFinite(length) && length > policy.maximumArchiveBytes)) {
      throw new Error('Protected private runtime download failed closed');
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > policy.maximumArchiveBytes) {
      throw new Error('Protected private runtime download exceeds its bound');
    }
    return bytes;
  }
  async function removeExact(objectPath) {
    const response = await fetchImpl(
      `${objectEndpoint}/${encodeURIComponent(policy.bucketId)}`,
      {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ prefixes: [objectPath] }),
      },
    );
    if (!response.ok) throw new Error('Protected private runtime retention cleanup failed closed');
    return true;
  }
  async function anonymousStatus(objectPath) {
    const response = await fetchImpl(
      `${objectEndpoint}/authenticated/${encodeURIComponent(policy.bucketId)}/${encodeObjectPath(objectPath)}`,
    );
    return response.status;
  }
  return {
    documentRequest,
    storage: { ensurePrivateBucket, uploadImmutable, download, removeExact, anonymousStatus },
  };
}

function parseArguments(argv) {
  const result = { mode: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (['--publish', '--restore', '--audit-anon'].includes(argument)) {
      if (result.mode) throw new Error('Use exactly one protected private runtime mode');
      result.mode = argument.slice(2);
      continue;
    }
    const value = argv[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`);
    if (argument === '--private-root') result.privateRoot = value;
    else if (argument === '--bundle') result.bundlePath = value;
    else if (argument === '--repository-root') result.repositoryRoot = value;
    else if (argument === '--expected') result.expectedPath = value;
    else if (argument === '--source-head') result.sourceHead = value;
    else if (argument === '--now') result.now = value;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!result.mode) throw new Error('Use --publish, --restore or --audit-anon');
  if (result.mode !== 'audit-anon'
    && (!result.privateRoot || !result.bundlePath || !result.expectedPath)) {
    throw new Error('Protected private runtime mode requires root, bundle and expectation');
  }
  if (result.mode === 'publish' && !result.sourceHead) {
    throw new Error('Protected private runtime publish requires --source-head');
  }
  return result;
}

async function readJson(file, label) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { throw new Error(`${label} cannot be parsed`); }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const clients = createProtectedPrivateRuntimeClients();
  let result;
  if (options.mode === 'audit-anon') {
    result = await auditProtectedPrivateRuntimeAnonymousDenial({
      request: clients.documentRequest,
      storage: clients.storage,
    });
  } else {
    const expected = await readJson(options.expectedPath, 'Private runtime expectation');
    const common = {
      privateRoot: options.privateRoot,
      bundlePath: options.bundlePath,
      repositoryRoot: options.repositoryRoot ?? PRIVATE_RUNTIME_REPOSITORY_ROOT,
      expected,
      now: options.now,
      request: clients.documentRequest,
      storage: clients.storage,
    };
    result = options.mode === 'publish'
      ? await publishProtectedPrivateProductionRuntime({ ...common, sourceHead: options.sourceHead })
      : await restoreProtectedPrivateProductionRuntime(common);
  }
  console.log(JSON.stringify({
    status: result.reason ?? 'anonymous-read-denied',
    restored: result.restored,
    published: result.published,
    rollbackAvailable: result.rollbackAvailable,
    rollbackSelected: result.rollbackSelected,
    currentGenerationRejected: result.currentGenerationRejected,
    rejectedGenerationCount: result.rejectedGenerationCount,
    anonymousReadDenied: result.anonymousReadDenied,
    privatePayloadLogged: false,
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`Protected private production runtime failed closed: ${error.message}`);
    process.exitCode = 1;
  });
}

export const DEFAULT_PROTECTED_PRIVATE_RUNTIME_ROOT = path.join(
  os.tmpdir(),
  'ravradar-private-production-runtime',
);
