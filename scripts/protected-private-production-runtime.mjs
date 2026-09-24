#!/usr/bin/env node
import crypto from 'node:crypto';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { createGunzip, gzip, gunzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY,
  PRIVATE_RUNTIME_REPOSITORY_ROOT,
  canonicalPrivateRuntimeJson,
  privateRuntimeBundleContentSha256,
  verifyPrivateProductionRuntimeBundle,
} from './private-production-runtime-bundle.mjs';
import {
  buildSupabaseAdminHeaders,
  createSupabaseAdminRequester,
  readSupabaseBodyTransport,
} from './lib/supabase-admin-rest.mjs';
import {
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE,
  assertPrivateRuntimeInventory,
} from './lib/private-weather-component-inventory.mjs';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// 4.0.478 changed only DMI's time-sharing, not the persisted weather format.
// That producer file is included in the broad full-runtime source fingerprint,
// so the last 4.0.477 generation needs one exact, expiring transition. Never
// extend this to a model, continuation, public projection or arbitrary cache.
export const DMI_SCHEDULER_ONLY_PREDECESSOR = Object.freeze({
  sourceHead: '2bafe6c6e92f3531b802785b3fc8d3237c88d4e8',
  datasetId: 'rr-20260923170622-210',
  productionReferenceAt: '2026-09-23T16:00:00.000Z',
  fullRuntimeContractSha256: 'cf7517e3ed5c5dc7cf4894a434809ea796dffb32a09ed9c9eb49aebeffbb115c',
  continuationStateContractSha256: 'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587',
  publicProjectionContractSha256: 'be153999db9d196727800ff41a05b6929137392f7bb3a1fdafd19fc13eff37fe',
});

// 4.0.480 changes only derivation across adjacent DKSS-LF model runs. The
// 4.0.479 production generation remains a valid native-weather donor. Admit
// that one immutable generation, never a general version/hash mismatch.
export const DMI_MARINE_SEAM_PREDECESSOR = Object.freeze({
  sourceHead: '888d3c045e0a567db2d348f26837451b2118a9df',
  datasetId: 'rr-20260923215727-210',
  productionReferenceAt: '2026-09-23T21:00:00.000Z',
  fullRuntimeContractSha256: 'ba83fcc2049f3ec8ef624f86f9651fc96372de0cc556f80f6e72cddaef313c0a',
  continuationStateContractSha256: 'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587',
  publicProjectionContractSha256: 'be153999db9d196727800ff41a05b6929137392f7bb3a1fdafd19fc13eff37fe',
});

// 4.0.481 changes only native DMI acquisition order and adds an optional
// Copernicus next-run cache refresh. The already deployed 4.0.480 weather
// package is the sole approved predecessor, with unchanged model/state and
// public projection contracts. This is not a general source-hash bypass.
export const WEATHER_ROTATION_PREDECESSOR = Object.freeze({
  sourceHead: '38fa4c27d8ac6b1c942b807f8a36886fa0a87a8a',
  datasetId: 'rr-20260924012618-210',
  productionReferenceAt: '2026-09-24T00:00:00.000Z',
  fullRuntimeContractSha256: '2c9025dd13bed8dfd575ce09f354df579f3e9834dc82688691daf66f5bcd48f1',
  continuationStateContractSha256: 'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587',
  publicProjectionContractSha256: 'be153999db9d196727800ff41a05b6929137392f7bb3a1fdafd19fc13eff37fe',
});

function isExactDmiPredecessor(descriptor, expected, approved) {
  const contracts = descriptor?.contractHashes;
  const current = expected?.contractHashes;
  return descriptor?.sourceHead === approved.sourceHead
    && descriptor?.datasetId === approved.datasetId
    && descriptor?.productionReferenceAt === approved.productionReferenceAt
    && contracts?.fullRuntimeContractSha256 === approved.fullRuntimeContractSha256
    && contracts?.continuationStateContractSha256 === approved.continuationStateContractSha256
    && contracts?.publicProjectionContractSha256 === approved.publicProjectionContractSha256
    && contracts?.continuationStateContractSha256 === current?.continuationStateContractSha256
    && contracts?.publicProjectionContractSha256 === current?.publicProjectionContractSha256
    && same(descriptor?.modelBinding, expected?.modelBinding);
}

export function isExactDmiSchedulerPredecessor(descriptor, expected) {
  return isExactDmiPredecessor(descriptor, expected, DMI_SCHEDULER_ONLY_PREDECESSOR);
}

export function isExactDmiMarineSeamPredecessor(descriptor, expected) {
  return isExactDmiPredecessor(descriptor, expected, DMI_MARINE_SEAM_PREDECESSOR);
}

export function isExactWeatherRotationPredecessor(descriptor, expected) {
  return isExactDmiPredecessor(descriptor, expected, WEATHER_ROTATION_PREDECESSOR);
}

export const PROTECTED_PRIVATE_RUNTIME_POLICY = Object.freeze({
  schemaVersion: '2.0.0',
  legacySchemaVersion: '1.0.0',
  archiveSchemaVersion: '1.0.0',
  archiveKind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_ARCHIVE',
  pointerKind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_POINTER',
  descriptorKind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_OBJECT_SET',
  legacyDescriptorKind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_OBJECT',
  privacyClass: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass,
  documentKey: 'ravscore-private-production-runtime-pointer',
  bucketId: 'ravradar-private-production-runtime',
  mimeType: 'application/gzip',
  // The current file-compressed format may contain more than one large cache,
  // but no individual file may exceed the original 768 MiB boundary. Legacy
  // raw-base64 archives retain their original aggregate boundary.
  maximumFilePayloadBytes: 768 * 1024 * 1024,
  maximumLegacyRawPayloadBytes: 768 * 1024 * 1024,
  maximumRawPayloadBytes: 2 * 1024 * 1024 * 1024,
  // Supabase Free projects accept at most one 50 MiB Storage object. One
  // deterministic archive may therefore be split into immutable parts. The
  // stricter 50,000,000-byte part size keeps every part below the real object
  // boundary, while two complete generations remain inside 70% of 1 GB.
  maximumArchiveBytes: 50 * 1024 * 1024,
  maximumArchivePartBytes: 50_000_000,
  maximumArchiveAggregateBytes: 350_000_000,
  maximumArchiveObjectCount: 8,
  maximumEnvelopeBytes: 1_040 * 1024 * 1024,
  maximumFileCount: 33,
  currentSourceSchemaVersion: '1.0.0',
  currentSourceKind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_CURRENT_SOURCE',
  targetSourceKind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_TARGET_SOURCE',
});

const POINTER_KEYS = Object.freeze(['schemaVersion', 'kind', 'current', 'previous']);
const LEGACY_DESCRIPTOR_KEYS = Object.freeze([
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
const DESCRIPTOR_KEYS = Object.freeze([
  'schemaVersion',
  'kind',
  'privacyClass',
  'bucketId',
  'objectSha256',
  'objectBytes',
  'objectCount',
  'objects',
  'bundleContentSha256',
  'datasetId',
  'productionReferenceAt',
  'generatedAt',
  'sourceHead',
  'modelBinding',
  'contractHashes',
]);
const OBJECT_PART_KEYS = Object.freeze([
  'index',
  'objectPath',
  'objectSha256',
  'objectBytes',
]);
const LEGACY_ARCHIVE_KEYS = Object.freeze([
  'schemaVersion',
  'kind',
  'privacyClass',
  'bundleContentSha256',
  'fileCount',
  'rawPayloadBytes',
  'files',
]);
const ARCHIVE_KEYS = Object.freeze([
  ...LEGACY_ARCHIVE_KEYS,
  'contentEncoding',
]);
const ARCHIVE_FILE_KEYS = Object.freeze(['path', 'bytes', 'sha256', 'contentBase64']);
const ARCHIVE_CONTENT_ENCODING = 'GZIP_BASE64';
const SAME_REFERENCE_MIGRATION_REPORT_KEYS = Object.freeze([
  'schemaVersion',
  'kind',
  'transitionKind',
  'predecessorSourceHead',
  'datasetId',
  'sourceBundleContentSha256',
  'previousIntegratedBundleSha256',
  'currentIntegratedBundleSha256',
  'previousCandidateBundleSha256',
  'currentCandidateBundleSha256',
  'previousContractHashes',
  'currentContractHashes',
  'candidateRuntimeKind',
  'migratedPartCount',
  'changedBindingFieldCount',
  'copiedPrivateFileCount',
  'migratedConditionsBytes',
  'migratedConditionsSha256',
  'publicHourDeliveryRebound',
  'migratedPublicHourPackBytes',
  'migratedPublicHourPackSha256',
  'measurementsChanged',
  'candidateStatesChanged',
  'privatePayloadIncluded',
]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SOURCE_HEAD_PATTERN = /^[0-9a-f]{40}$/;
const DATASET_ID_PATTERN = /^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const BASE64_STREAM_CHUNK_CHARACTERS = 4 * 1024 * 1024;
const SAFE_EXTRACTION_STAGES = new Set([
  'ARCHIVE_ENVELOPE_DECODE',
  'ARCHIVE_STAGE_CREATE',
  'ARCHIVE_FILE_PATH',
  'ARCHIVE_FILE_PARENT',
  'ARCHIVE_FILE_BASE64_DECODE',
  'ARCHIVE_FILE_DECOMPRESSION',
  'ARCHIVE_FILE_INTEGRITY',
  'ARCHIVE_FILE_WRITE',
  'ARCHIVE_STAGE_COMMIT',
]);
const isPlainObject = value => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;

function assertObjectSetPolicy(policy) {
  for (const field of [
    'maximumArchiveBytes',
    'maximumArchivePartBytes',
    'maximumArchiveAggregateBytes',
    'maximumArchiveObjectCount',
  ]) {
    if (!Number.isSafeInteger(policy?.[field]) || policy[field] < 1) {
      throw new Error('Private runtime object-set policy is invalid');
    }
  }
  if (policy.maximumArchivePartBytes > policy.maximumArchiveBytes
    || BigInt(policy.maximumArchivePartBytes) * BigInt(policy.maximumArchiveObjectCount)
      < BigInt(policy.maximumArchiveAggregateBytes)) {
    throw new Error('Private runtime object-set policy is inconsistent');
  }
}

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

function isSyntacticallyValidBase64(value) {
  if (typeof value !== 'string' || value.length % 4 !== 0) return false;
  if (value.length === 0) return true;
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const alphabetEnd = value.length - padding;
  if (padding > 0 && value.length < 4) return false;
  for (let index = 0; index < alphabetEnd; index += 1) {
    const code = value.charCodeAt(index);
    const valid = (code >= 48 && code <= 57)
      || (code >= 65 && code <= 90)
      || (code >= 97 && code <= 122)
      || code === 43
      || code === 47;
    if (!valid) return false;
  }
  for (let index = alphabetEnd; index < value.length; index += 1) {
    if (value.charCodeAt(index) !== 61) return false;
  }
  return true;
}

function tagProtectedRestoreStage(error, stage) {
  if (!error || !SAFE_EXTRACTION_STAGES.has(stage)) return error;
  try {
    if (!SAFE_EXTRACTION_STAGES.has(error.protectedPrivateRuntimeStage)) {
      Object.defineProperty(error, 'protectedPrivateRuntimeStage', {
        value: stage,
        configurable: false,
        enumerable: false,
        writable: false,
      });
    }
  } catch {
    // The fixed stage is diagnostic only; never replace the real failure.
  }
  return error;
}

async function* decodeBase64Chunks(contentBase64) {
  for (let offset = 0; offset < contentBase64.length;
    offset += BASE64_STREAM_CHUNK_CHARACTERS) {
    const end = Math.min(offset + BASE64_STREAM_CHUNK_CHARACTERS, contentBase64.length);
    try {
      yield Buffer.from(contentBase64.slice(offset, end), 'base64');
    } catch (error) {
      throw tagProtectedRestoreStage(error, 'ARCHIVE_FILE_BASE64_DECODE');
    }
  }
}

async function writeDecodedArchiveFile({ file, target, contentEncoding }) {
  let byteCount = 0;
  const digest = crypto.createHash('sha256');
  const integrity = new Transform({
    transform(chunk, encoding, callback) {
      byteCount += chunk.length;
      if (byteCount > file.bytes) {
        callback(tagProtectedRestoreStage(
          new Error('Private runtime archive file exceeds its declared bound'),
          'ARCHIVE_FILE_INTEGRITY',
        ));
        return;
      }
      digest.update(chunk);
      callback(null, chunk);
    },
  });
  const destination = createWriteStream(target, { flags: 'wx', mode: 0o600 });
  destination.on('error', error => tagProtectedRestoreStage(error, 'ARCHIVE_FILE_WRITE'));
  const source = Readable.from(decodeBase64Chunks(file.contentBase64));
  try {
    if (contentEncoding === ARCHIVE_CONTENT_ENCODING) {
      const decompressor = createGunzip();
      decompressor.on('error', error => {
        tagProtectedRestoreStage(error, 'ARCHIVE_FILE_DECOMPRESSION');
      });
      await pipeline(source, decompressor, integrity, destination);
    } else {
      await pipeline(source, integrity, destination);
    }
  } catch (error) {
    throw tagProtectedRestoreStage(error, 'ARCHIVE_FILE_WRITE');
  }
  if (byteCount !== file.bytes || digest.digest('hex') !== file.sha256) {
    throw tagProtectedRestoreStage(
      new Error('Private runtime archive file integrity is invalid'),
      'ARCHIVE_FILE_INTEGRITY',
    );
  }
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
  assertObjectSetPolicy(policy);
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
      policy.maximumFilePayloadBytes,
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
    const compressed = await gzipAsync(bytes, { level: 9, mtime: 0 });
    files.push({
      path: entry.path,
      bytes: bytes.length,
      sha256: digest,
      // Compress before converting to base64. The previous raw-base64 envelope
      // could exceed V8's fixed maximum string length even while the final gzip
      // object remained safely below the storage limit.
      contentBase64: compressed.toString('base64'),
    });
  }
  const envelope = {
    schemaVersion: policy.archiveSchemaVersion,
    kind: policy.archiveKind,
    privacyClass: policy.privacyClass,
    bundleContentSha256: verified.bundleContentSha256,
    fileCount: files.length,
    rawPayloadBytes,
    contentEncoding: ARCHIVE_CONTENT_ENCODING,
    files,
  };
  const envelopeBytes = Buffer.from(canonicalPrivateRuntimeJson(envelope), 'utf8');
  if (envelopeBytes.length > policy.maximumEnvelopeBytes) {
    throw new Error('Private runtime archive envelope exceeds its bound');
  }
  const archive = await gzipAsync(envelopeBytes, { level: 9, mtime: 0 });
  if (archive.length < 1 || archive.length > policy.maximumArchiveAggregateBytes) {
    throw new Error('Private runtime compressed archive aggregate exceeds its bound');
  }
  const objectSha256 = sha256(archive);
  const objects = [];
  for (let offset = 0, index = 0; offset < archive.length; index += 1) {
    const end = Math.min(offset + policy.maximumArchivePartBytes, archive.length);
    const bytes = archive.subarray(offset, end);
    const partSha256 = sha256(bytes);
    objects.push({
      descriptor: {
        index,
        objectPath: `bundles/sha256/${objectSha256}/part-${String(index).padStart(3, '0')}-${partSha256}.json.gz.part`,
        objectSha256: partSha256,
        objectBytes: bytes.length,
      },
      bytes,
    });
    offset = end;
  }
  if (objects.length < 1 || objects.length > policy.maximumArchiveObjectCount) {
    throw new Error('Private runtime compressed archive object count exceeds its bound');
  }
  const descriptor = validateProtectedPrivateRuntimeDescriptor({
    schemaVersion: policy.schemaVersion,
    kind: policy.descriptorKind,
    privacyClass: policy.privacyClass,
    bucketId: policy.bucketId,
    objectSha256,
    objectBytes: archive.length,
    objectCount: objects.length,
    objects: objects.map(object => object.descriptor),
    bundleContentSha256: verified.bundleContentSha256,
    datasetId: verified.datasetId,
    productionReferenceAt: verified.productionReferenceAt,
    generatedAt: verified.generatedAt,
    sourceHead,
    modelBinding: verified.modelBinding,
    contractHashes: verified.contractHashes,
  }, { policy });
  return {
    archive,
    objects,
    descriptor,
    verified,
    // Aggregate-only capacity evidence. These counts contain no payload bytes,
    // identifiers, coordinates or vector values and let an offline dry-run use
    // the exact production packer without decoding or persisting the archive.
    archiveMetrics: Object.freeze({
      rawPayloadBytes,
      envelopeBytes: envelopeBytes.length,
      objectBytes: archive.length,
      objectCount: objects.length,
      largestObjectBytes: Math.max(...objects.map(object => object.bytes.length)),
    }),
  };
}

function canonicalBindingShape(value, label = 'Private runtime descriptor model binding') {
  if (!isPlainObject(value)) throw new Error('Private runtime descriptor model binding is invalid');
  const expected = ravScoreModelBinding();
  exactKeys(value, Object.keys(expected), label);
  if (!SHA256_PATTERN.test(value.modelContractSha256)
    || !SHA256_PATTERN.test(value.modelBundleSha256)) {
    throw new Error('Private runtime descriptor model digests are invalid');
  }
  for (const key of Object.keys(expected).filter(key => !key.endsWith('Sha256'))) {
    if (typeof value[key] !== 'string'
      || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/.test(value[key])) {
      throw new Error(`${label} has invalid ${key}`);
    }
  }
  return Object.fromEntries(Object.keys(expected).map(key => [key, value[key]]));
}

function validateBinding(value, {
  allowedBindings,
  allowHistorical = false,
} = {}) {
  const canonical = canonicalBindingShape(value);
  if (allowHistorical) return canonical;
  if (Array.isArray(allowedBindings)) {
    const allowed = allowedBindings.map((binding, index) => canonicalBindingShape(
      binding,
      `Allowed private runtime model binding ${index}`,
    ));
    if (!allowed.some(binding => same(binding, canonical))) {
      throw new Error('Private runtime descriptor model binding is not an allowed exact binding');
    }
  } else {
    assertRavScoreModelBinding(canonical, 'Private runtime descriptor model binding');
  }
  return canonical;
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

function validateDescriptorMetadata(value, policy, bindingOptions = {}) {
  if (value.privacyClass !== policy.privacyClass
    || value.bucketId !== policy.bucketId
    || !SHA256_PATTERN.test(String(value.objectSha256 ?? ''))
    || !Number.isSafeInteger(value.objectBytes)
    || value.objectBytes < 1
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
    modelBinding: validateBinding(value.modelBinding, bindingOptions),
    contractHashes: validateContractHashes(value.contractHashes),
  };
}

export function validateProtectedPrivateRuntimeDescriptor(value, {
  policy = PROTECTED_PRIVATE_RUNTIME_POLICY,
  allowedModelBindings,
  allowHistoricalModelBinding = false,
} = {}) {
  assertObjectSetPolicy(policy);
  if (value?.schemaVersion === policy.legacySchemaVersion) {
    exactKeys(value, LEGACY_DESCRIPTOR_KEYS, 'Private runtime legacy object descriptor');
    if (value.kind !== policy.legacyDescriptorKind
      || value.objectPath !== `bundles/sha256/${value.objectSha256}.json.gz`
      || value.objectBytes > policy.maximumArchiveBytes) {
      throw new Error('Private runtime legacy object descriptor is invalid');
    }
    return validateDescriptorMetadata(value, policy, {
      allowedBindings: allowedModelBindings,
      allowHistorical: allowHistoricalModelBinding,
    });
  }

  exactKeys(value, DESCRIPTOR_KEYS, 'Private runtime object-set descriptor');
  if (value.schemaVersion !== policy.schemaVersion
    || value.kind !== policy.descriptorKind
    || value.objectBytes > policy.maximumArchiveAggregateBytes
    || !Number.isSafeInteger(value.objectCount)
    || value.objectCount < 1
    || value.objectCount > policy.maximumArchiveObjectCount
    || !Array.isArray(value.objects)
    || value.objects.length !== value.objectCount) {
    throw new Error('Private runtime object-set descriptor is invalid');
  }
  let totalBytes = 0;
  const objects = value.objects.map((object, index) => {
    exactKeys(object, OBJECT_PART_KEYS, `Private runtime object part ${index}`);
    if (object.index !== index
      || !SHA256_PATTERN.test(String(object.objectSha256 ?? ''))
      || object.objectPath !== `bundles/sha256/${value.objectSha256}/part-${String(index).padStart(3, '0')}-${object.objectSha256}.json.gz.part`
      || !Number.isSafeInteger(object.objectBytes)
      || object.objectBytes < 1
      || object.objectBytes > policy.maximumArchivePartBytes
      || object.objectBytes > policy.maximumArchiveBytes) {
      throw new Error('Private runtime object part descriptor is invalid');
    }
    totalBytes += object.objectBytes;
    return { ...object };
  });
  if (totalBytes !== value.objectBytes) {
    throw new Error('Private runtime object-set byte total is invalid');
  }
  return validateDescriptorMetadata({ ...value, objects }, policy, {
    allowedBindings: allowedModelBindings,
    allowHistorical: allowHistoricalModelBinding,
  });
}

export function validateProtectedPrivateRuntimePointer(value, {
  policy = PROTECTED_PRIVATE_RUNTIME_POLICY,
  allowedCurrentModelBindings,
  allowHistoricalCurrentModelBinding = false,
} = {}) {
  exactKeys(value, POINTER_KEYS, 'Private runtime pointer');
  if (![policy.schemaVersion, policy.legacySchemaVersion].includes(value.schemaVersion)
    || value.kind !== policy.pointerKind) {
    throw new Error('Private runtime pointer identity is invalid');
  }
  const current = validateProtectedPrivateRuntimeDescriptor(value.current, {
    policy,
    allowedModelBindings: allowedCurrentModelBindings,
    allowHistoricalModelBinding: allowHistoricalCurrentModelBinding,
  });
  const previous = value.previous === null
    ? null
    : validateProtectedPrivateRuntimeDescriptor(value.previous, {
      policy,
      allowHistoricalModelBinding: true,
    });
  if (current.schemaVersion !== value.schemaVersion) {
    throw new Error('Private runtime pointer current generation has another schema');
  }
  if (previous) {
    const previousMs = Date.parse(previous.productionReferenceAt);
    const currentMs = Date.parse(current.productionReferenceAt);
    if (previousMs > currentMs) {
      throw new Error('Private runtime pointer generations are not monotonic');
    }
  }
  return { schemaVersion: value.schemaVersion, kind: value.kind, current, previous };
}

async function validateArchiveEnvelope(envelope, descriptor, policy) {
  const contentEncoding = envelope?.contentEncoding;
  const maximumAggregateBytes = contentEncoding === undefined
    ? policy.maximumLegacyRawPayloadBytes
    : policy.maximumRawPayloadBytes;
  exactKeys(
    envelope,
    contentEncoding === undefined ? LEGACY_ARCHIVE_KEYS : ARCHIVE_KEYS,
    'Private runtime archive',
  );
  if (envelope.schemaVersion !== policy.archiveSchemaVersion
    || envelope.kind !== policy.archiveKind
    || envelope.privacyClass !== policy.privacyClass
    || envelope.bundleContentSha256 !== descriptor.bundleContentSha256
    || !Number.isSafeInteger(envelope.fileCount)
    || envelope.fileCount < 2
    || envelope.fileCount > policy.maximumFileCount
    || !Number.isSafeInteger(envelope.rawPayloadBytes)
    || envelope.rawPayloadBytes < 1
    || envelope.rawPayloadBytes > maximumAggregateBytes
    || (contentEncoding !== undefined && contentEncoding !== ARCHIVE_CONTENT_ENCODING)
    || !Array.isArray(envelope.files)
    || envelope.files.length !== envelope.fileCount) {
    throw new Error('Private runtime archive descriptor is invalid');
  }
  let declaredTotal = 0;
  const paths = new Set();
  const files = [];
  for (let index = 0; index < envelope.files.length; index += 1) {
    const file = envelope.files[index];
    exactKeys(file, ARCHIVE_FILE_KEYS, `Private runtime archive file ${index}`);
    const archivePath = safeArchivePath(file.path);
    if (paths.has(archivePath)) throw new Error('Private runtime archive contains duplicate paths');
    paths.add(archivePath);
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0
      || file.bytes > policy.maximumFilePayloadBytes
      || !SHA256_PATTERN.test(String(file.sha256 ?? ''))
      || !isSyntacticallyValidBase64(file.contentBase64)) {
      throw new Error('Private runtime archive file descriptor is invalid');
    }
    declaredTotal += file.bytes;
    if (declaredTotal > maximumAggregateBytes) {
      throw new Error('Private runtime archive raw payload exceeds its bound');
    }
    files.push({
      path: archivePath,
      bytes: file.bytes,
      sha256: file.sha256,
      contentBase64: file.contentBase64,
    });
  }
  const sorted = [...files].sort((left, right) => compareText(left.path, right.path));
  if (files.some((file, index) => file.path !== sorted[index].path)
    || !paths.has('manifest.json')
    || files.some(file => file.path !== 'manifest.json' && !file.path.startsWith('payload/'))
    || declaredTotal !== envelope.rawPayloadBytes) {
    throw new Error('Private runtime archive inventory is invalid');
  }
  return { contentEncoding, files };
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
  return await validateArchiveEnvelope(envelope, descriptor, policy);
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
  const stage = `${destination}.protected-stage-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  assertInside(context.root, stage, 'Private runtime bundle stage');
  let extractionStage = 'ARCHIVE_ENVELOPE_DECODE';
  try {
    const decoded = await decodeArchive(archive, descriptor, policy);
    extractionStage = 'ARCHIVE_STAGE_CREATE';
    await fs.mkdir(stage, { recursive: true, mode: 0o700 });
    for (const file of decoded.files) {
      extractionStage = 'ARCHIVE_FILE_PATH';
      const target = path.join(stage, ...file.path.split('/'));
      assertInside(stage, target, 'Private runtime extracted file');
      extractionStage = 'ARCHIVE_FILE_PARENT';
      await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      extractionStage = 'ARCHIVE_FILE_WRITE';
      // Decode, decompress, hash and write in bounded chunks. A production
      // cache may be hundreds of MiB and must never require one equally large
      // decoded Buffer before it can be restored atomically.
      await writeDecodedArchiveFile({
        file,
        target,
        contentEncoding: decoded.contentEncoding,
      });
    }
    extractionStage = 'ARCHIVE_STAGE_COMMIT';
    await fs.rename(stage, destination);
  } catch (error) {
    await fs.rm(stage, { recursive: true, force: true }).catch(() => {});
    throw tagProtectedRestoreStage(error, extractionStage);
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

async function readPointerRow(request, {
  allowMissing,
  policy,
  allowedCurrentModelBindings,
  allowHistoricalCurrentModelBinding = false,
}) {
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
  return {
    ...row,
    version: Number(row.version),
    payload: validateProtectedPrivateRuntimePointer(row.payload, {
      policy,
      allowedCurrentModelBindings,
      allowHistoricalCurrentModelBinding,
    }),
  };
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

function descriptorObjects(descriptor) {
  return descriptor.schemaVersion === PROTECTED_PRIVATE_RUNTIME_POLICY.legacySchemaVersion
    ? [{
        index: 0,
        objectPath: descriptor.objectPath,
        objectSha256: descriptor.objectSha256,
        objectBytes: descriptor.objectBytes,
      }]
    : descriptor.objects;
}

function referencedObjectPaths(pointer) {
  return new Set([pointer?.current, pointer?.previous]
    .filter(Boolean)
    .flatMap(descriptor => descriptorObjects(descriptor).map(object => object.objectPath)));
}

async function verifyStoredArchive(storage, descriptor) {
  const parts = [];
  let totalBytes = 0;
  for (const object of descriptorObjects(descriptor)) {
    const bytes = await verifyStoredObject(storage, object);
    parts.push(bytes);
    totalBytes += bytes.length;
  }
  const archive = Buffer.concat(parts, totalBytes);
  if (archive.length !== descriptor.objectBytes
    || sha256(archive) !== descriptor.objectSha256) {
    throw new Error('Protected private runtime object-set readback is invalid');
  }
  return archive;
}

async function removeCreatedRuntimeIfUnreferenced({
  request,
  storage,
  objectPaths,
  policy,
  allowedCurrentModelBindings,
}) {
  let latest;
  try {
    latest = await readPointerRow(request, {
      allowMissing: true,
      policy,
      allowedCurrentModelBindings,
    });
  } catch {
    // A failed pointer reread leaves the reference state unknown. Keeping the
    // immutable object is safer than deleting something a concurrent writer
    // may already have made current or previous.
    return false;
  }
  const referencedPaths = referencedObjectPaths(latest?.payload);
  let removed = 0;
  for (const objectPath of objectPaths) {
    if (referencedPaths.has(objectPath)) continue;
    await storage.removeExact(objectPath);
    removed += 1;
  }
  return removed;
}

function exactBundleFileMap(manifest, label) {
  if (!isPlainObject(manifest)
    || manifest.schemaVersion !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.schemaVersion
    || manifest.kind !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.kind
    || manifest.privacyClass !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass
    || !Array.isArray(manifest.files)
    || manifest.fileCount !== manifest.files.length
    || manifest.zoneCount !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedZoneCount
    || manifest.partCount !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedPartCount
    || !SHA256_PATTERN.test(String(manifest.bundleContentSha256 ?? ''))
    || privateRuntimeBundleContentSha256(manifest) !== manifest.bundleContentSha256) {
    throw new Error(`${label} is invalid`);
  }
  const files = new Map();
  assertPrivateRuntimeInventory(manifest.files);
  for (const descriptor of manifest.files) {
    exactKeys(descriptor, ['id', 'relativePath', 'bytes', 'sha256', 'privacyClass'], `${label} file`);
    if (typeof descriptor.id !== 'string'
      || typeof descriptor.relativePath !== 'string'
      || !Number.isSafeInteger(descriptor.bytes)
      || descriptor.bytes < 1
      || !SHA256_PATTERN.test(String(descriptor.sha256 ?? ''))
      || descriptor.privacyClass !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass
      || files.has(descriptor.id)) {
      throw new Error(`${label} file inventory is invalid`);
    }
    files.set(descriptor.id, descriptor);
  }
  return files;
}

export function validateSameReferencePrivateRuntimeSuccessor({
  existingDescriptor,
  successorDescriptor,
  predecessorManifest,
  successorManifest,
  migrationReport,
} = {}) {
  exactKeys(migrationReport, SAME_REFERENCE_MIGRATION_REPORT_KEYS,
    'Same-reference private runtime migration report');
  const predecessorFiles = exactBundleFileMap(predecessorManifest, 'Predecessor private runtime manifest');
  const successorFiles = exactBundleFileMap(successorManifest, 'Successor private runtime manifest');
  const predecessorBinding = validateBinding(predecessorManifest.modelBinding, { allowHistorical: true });
  const successorBinding = validateBinding(successorManifest.modelBinding);
  const predecessorBindingKeys = Object.keys(predecessorBinding).sort(compareText);
  const successorBindingKeys = Object.keys(successorBinding).sort(compareText);
  const changedBindingFields = predecessorBindingKeys.filter(
    key => predecessorManifest.modelBinding[key] !== successorManifest.modelBinding[key],
  );
  const bindingOnly = migrationReport.transitionKind === 'MODEL_BINDING_METADATA_ONLY';
  const bindingMigration = bindingOnly
    || migrationReport.transitionKind === 'MODEL_BINDING_MIGRATION';
  const contractOnlyRebind = migrationReport.transitionKind === 'CONTRACT_ONLY_REBIND';
  if (!isPlainObject(existingDescriptor)
    || !isPlainObject(successorDescriptor)
    || migrationReport.schemaVersion !== 2
    || migrationReport.kind !== 'RAVRADAR_POST_CUTOVER_PRIVATE_RUNTIME_REBIND'
    || migrationReport.predecessorSourceHead !== existingDescriptor.sourceHead
    || migrationReport.sourceBundleContentSha256 !== existingDescriptor.bundleContentSha256
    || predecessorManifest.bundleContentSha256 !== existingDescriptor.bundleContentSha256
    || successorManifest.bundleContentSha256 !== successorDescriptor.bundleContentSha256
    || migrationReport.datasetId !== existingDescriptor.datasetId
    || migrationReport.datasetId !== successorDescriptor.datasetId
    || predecessorManifest.datasetId !== migrationReport.datasetId
    || successorManifest.datasetId !== migrationReport.datasetId
    || predecessorManifest.productionReferenceAt !== successorManifest.productionReferenceAt
    || predecessorManifest.productionReferenceAt !== existingDescriptor.productionReferenceAt
    || successorManifest.productionReferenceAt !== successorDescriptor.productionReferenceAt
    || predecessorManifest.generatedAt !== successorManifest.generatedAt
    || predecessorManifest.generationId !== successorManifest.generationId
    || !same(predecessorManifest.modelBinding, existingDescriptor.modelBinding)
    || !same(successorManifest.modelBinding, successorDescriptor.modelBinding)
    || !same(predecessorManifest.contractHashes, existingDescriptor.contractHashes)
    || !same(successorManifest.contractHashes, successorDescriptor.contractHashes)
    || !same(migrationReport.previousContractHashes, predecessorManifest.contractHashes)
    || !same(migrationReport.currentContractHashes, successorManifest.contractHashes)
    || migrationReport.previousIntegratedBundleSha256
      !== predecessorManifest.modelBinding.modelBundleSha256
    || migrationReport.currentIntegratedBundleSha256
      !== successorManifest.modelBinding.modelBundleSha256
    || JSON.stringify(predecessorBindingKeys) !== JSON.stringify(successorBindingKeys)
    || !SHA256_PATTERN.test(String(migrationReport.previousCandidateBundleSha256 ?? ''))
    || !SHA256_PATTERN.test(String(migrationReport.currentCandidateBundleSha256 ?? ''))
    || !['ravScoreCandidateGRollback', 'ravScoreCandidateGWarmup']
      .includes(migrationReport.candidateRuntimeKind)
    || migrationReport.migratedPartCount !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedPartCount
    || !Number.isSafeInteger(migrationReport.changedBindingFieldCount)
    || migrationReport.copiedPrivateFileCount !== predecessorFiles.size
    || migrationReport.copiedPrivateFileCount !== successorFiles.size
    || typeof migrationReport.publicHourDeliveryRebound !== 'boolean'
    || (!migrationReport.publicHourDeliveryRebound
      && (migrationReport.migratedPublicHourPackBytes !== null
        || migrationReport.migratedPublicHourPackSha256 !== null))
    || migrationReport.measurementsChanged !== false
    || migrationReport.candidateStatesChanged !== false
    || migrationReport.privatePayloadIncluded !== false) {
    throw new Error('Same-reference private runtime successor evidence is invalid');
  }
  if (bindingMigration) {
    if (JSON.stringify(changedBindingFields) !== JSON.stringify(['modelBundleSha256'])
      || (!bindingOnly && migrationReport.previousCandidateBundleSha256
        === migrationReport.currentCandidateBundleSha256)
      || migrationReport.changedBindingFieldCount
        < PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedPartCount) {
      throw new Error('Same-reference model-binding migration evidence is invalid');
    }
  } else if (contractOnlyRebind) {
    if (changedBindingFields.length !== 0
      || migrationReport.previousCandidateBundleSha256
        !== migrationReport.currentCandidateBundleSha256
      || migrationReport.changedBindingFieldCount !== 0
      || same(migrationReport.previousContractHashes, migrationReport.currentContractHashes)) {
      throw new Error('Same-reference contract-only rebind evidence is invalid');
    }
  } else {
    throw new Error('Same-reference private runtime transition kind is invalid');
  }
  if (migrationReport.publicHourDeliveryRebound
    && (!bindingMigration
      || !predecessorFiles.has(PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.id)
      || !successorFiles.has(PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.id)
      || !Number.isSafeInteger(migrationReport.migratedPublicHourPackBytes)
      || migrationReport.migratedPublicHourPackBytes < 1
      || !SHA256_PATTERN.test(String(migrationReport.migratedPublicHourPackSha256 ?? '')))) {
    throw new Error('Same-reference public-hour pack migration evidence is invalid');
  }
  if (predecessorFiles.size !== successorFiles.size
    || [...predecessorFiles.keys()].some(id => !successorFiles.has(id))) {
    throw new Error('Same-reference private runtime inventories differ');
  }
  for (const [id, predecessorFile] of predecessorFiles) {
    const successorFile = successorFiles.get(id);
    if (id === 'full-conditions') {
      if (successorFile.bytes !== migrationReport.migratedConditionsBytes
        || successorFile.sha256 !== migrationReport.migratedConditionsSha256
        || !Number.isSafeInteger(migrationReport.migratedConditionsBytes)
        || migrationReport.migratedConditionsBytes < 2
        || !SHA256_PATTERN.test(String(migrationReport.migratedConditionsSha256 ?? ''))) {
        throw new Error('Same-reference migrated conditions evidence is invalid');
      }
      if (bindingMigration && predecessorFile.sha256 === successorFile.sha256) {
        throw new Error('Same-reference binding migration did not change conditions metadata');
      }
      if (contractOnlyRebind && !same(predecessorFile, successorFile)) {
        throw new Error('Same-reference contract-only rebind changed private conditions');
      }
    } else if (id === PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.id
      && migrationReport.publicHourDeliveryRebound) {
      if (successorFile.relativePath !== predecessorFile.relativePath
        || successorFile.relativePath !== PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.relativePath
        || successorFile.privacyClass !== predecessorFile.privacyClass
        || successorFile.bytes !== migrationReport.migratedPublicHourPackBytes
        || successorFile.sha256 !== migrationReport.migratedPublicHourPackSha256
        || predecessorFile.sha256 === successorFile.sha256) {
        throw new Error('Same-reference migrated public-hour pack evidence is invalid');
      }
    } else if (!same(predecessorFile, successorFile)) {
      throw new Error(`Same-reference migration changed a non-conditions private file: ${id}`);
    }
  }
  return true;
}

export async function publishProtectedPrivateProductionRuntime({
  privateRoot,
  bundlePath,
  repositoryRoot = PRIVATE_RUNTIME_REPOSITORY_ROOT,
  expected = {},
  now = new Date().toISOString(),
  sourceHead,
  sameReferenceSuccessorEvidence,
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
  const predecessorBinding = sameReferenceSuccessorEvidence
    ? validateBinding(
      sameReferenceSuccessorEvidence.predecessorManifest?.modelBinding,
      { allowHistorical: true },
    )
    : null;
  const allowedCurrentModelBindings = predecessorBinding
    ? [ravScoreModelBinding(), predecessorBinding]
    : undefined;
  const existing = await readPointerRow(request, {
    allowMissing: true,
    policy,
    allowedCurrentModelBindings,
    // A structurally valid older generation may use the model binding that
    // was current when it was published. Read it as historical evidence so a
    // strictly newer production reference can supersede it. Same-reference
    // changes still require the exact migration evidence below.
    allowHistoricalCurrentModelBinding: true,
  });
  let sameReference = false;
  let sameContentDifferentProducer = false;
  let sameReferenceSuccessor = false;
  if (existing) {
    const centralMs = Date.parse(existing.payload.current.productionReferenceAt);
    const localMs = Date.parse(built.descriptor.productionReferenceAt);
    if (centralMs > localMs) {
      throw new Error('Private runtime publication would regress central production state');
    }
    if (centralMs === localMs) {
      if (same(existing.payload.current, built.descriptor)) {
        sameReference = true;
      } else if (same(
        { ...existing.payload.current, sourceHead: '<producer>' },
        { ...built.descriptor, sourceHead: '<producer>' },
      )) {
        // sourceHead identifies the producer of this immutable generation.
        // A later code-only deploy must not rewrite it when every byte and
        // every data/model contract is otherwise identical.
        sameReference = true;
        sameContentDifferentProducer = true;
      } else {
        if (!sameReferenceSuccessorEvidence) {
          throw new Error('Private runtime publication conflicts at the same production reference');
        }
        validateSameReferencePrivateRuntimeSuccessor({
          existingDescriptor: existing.payload.current,
          successorDescriptor: built.descriptor,
          predecessorManifest: sameReferenceSuccessorEvidence.predecessorManifest,
          successorManifest: built.verified.manifest,
          migrationReport: sameReferenceSuccessorEvidence.migrationReport,
        });
        sameReferenceSuccessor = true;
      }
    }
  }

  await storage.ensurePrivateBucket();
  const createdObjectPaths = [];
  const pointer = {
    schemaVersion: policy.schemaVersion,
    kind: policy.pointerKind,
    current: built.descriptor,
    previous: existing?.payload.current ?? null,
  };
  const uploadAndVerify = async () => {
    for (const object of built.objects) {
      const upload = await storage.uploadImmutable(object.descriptor.objectPath, object.bytes);
      if (upload?.created === true) createdObjectPaths.push(object.descriptor.objectPath);
    }
    // Every immutable part is read back byte-exactly before the pointer can
    // expose the generation. Reassembly also verifies the full archive hash.
    await verifyStoredArchive(storage, built.descriptor);
  };

  let expectedVersion;
  let readback;
  try {
    await uploadAndVerify();
    if (sameReference) {
      return {
        published: false,
        reason: sameContentDifferentProducer
          ? 'protected-private-runtime-content-already-current'
          : 'protected-private-runtime-already-current',
        centralVersion: existing.version,
        productionReferenceAt: built.descriptor.productionReferenceAt,
        bundleContentSha256: built.descriptor.bundleContentSha256,
        objectSha256: built.descriptor.objectSha256,
        objectCount: built.descriptor.objectCount,
        rollbackAvailable: existing.payload.previous !== null,
        privatePayloadLogged: false,
      };
    }
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
    readback = await readPointerRow(request, { allowMissing: false, policy });
    if (readback.version !== expectedVersion || !same(readback.payload, pointer)) {
      throw new Error('Private runtime pointer readback does not match the publication');
    }
  } catch (error) {
    let committedDespiteLostResponse = false;
    try {
      const recovered = await readPointerRow(request, {
        allowMissing: false,
        policy,
      });
      const intendedVersion = existing ? existing.version + 1 : 1;
      if (recovered.version === intendedVersion && same(recovered.payload, pointer)) {
        expectedVersion = intendedVersion;
        readback = recovered;
        committedDespiteLostResponse = true;
      }
    } catch {
      // The original publication error remains authoritative unless exact
      // pointer version and payload can be proved by readback.
    }
    if (committedDespiteLostResponse) {
      // Continue to retention and the normal success result. Never issue a
      // second write for an ambiguous response.
    } else {
      if (createdObjectPaths.length > 0) {
        try {
          await removeCreatedRuntimeIfUnreferenced({
            request,
            storage,
            objectPaths: createdObjectPaths,
            policy,
            allowedCurrentModelBindings,
          });
        } catch {
          // Preserve the publication failure. Cleanup is intentionally best
          // effort and may only target this attempt's newly-created object.
        }
      }
      throw error;
    }
  }

  const retired = existing?.payload.previous ?? null;
  let retentionCleanupFailureCount = 0;
  if (retired) {
    const retainedPaths = referencedObjectPaths(readback.payload);
    for (const object of descriptorObjects(retired)) {
      if (!retainedPaths.has(object.objectPath)) {
        try {
          await storage.removeExact(object.objectPath);
        } catch {
          // The pointer has already been committed and verified. Cleanup is
          // repairable maintenance, not evidence that publication failed.
          retentionCleanupFailureCount += 1;
        }
      }
    }
  }
  return {
    published: true,
    reason: sameReferenceSuccessor
      ? 'protected-private-runtime-same-reference-successor'
      : existing ? 'protected-private-runtime-updated' : 'protected-private-runtime-inserted',
    centralVersion: expectedVersion,
    productionReferenceAt: built.descriptor.productionReferenceAt,
    bundleContentSha256: built.descriptor.bundleContentSha256,
    objectSha256: built.descriptor.objectSha256,
    objectCount: built.descriptor.objectCount,
    rollbackAvailable: readback.payload.previous !== null,
    retentionCleanupComplete: retentionCleanupFailureCount === 0,
    retentionCleanupFailureCount,
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
  const maximumGenerationBytes = descriptor.schemaVersion === policy.legacySchemaVersion
    ? policy.maximumArchiveBytes
    : policy.maximumArchiveAggregateBytes;
  if (descriptor.objectBytes > maximumGenerationBytes) {
    throw new Error('Protected private runtime object exceeds restore bounds');
  }
}

function safeRestoreRejectionCode(error, stage) {
  const message = String(error?.message ?? '');
  if (error?.code === 'PROTECTED_PRIVATE_RUNTIME_EXPIRED') return 'EXPIRED';
  if (error?.code === 'ENOSPC') return 'FILESYSTEM_CAPACITY';
  if (error?.code === 'EACCES' || error?.code === 'EPERM') return 'FILESYSTEM_PERMISSION';
  if (error?.code === 'EROFS') return 'FILESYSTEM_READ_ONLY';
  if (error?.code === 'EMFILE' || error?.code === 'ENFILE') return 'FILESYSTEM_RESOURCE_LIMIT';
  if (SAFE_EXTRACTION_STAGES.has(error?.protectedPrivateRuntimeStage)) {
    return error.protectedPrivateRuntimeStage;
  }
  if (/download|storage readback|object integrity|object-set readback/i.test(message)) {
    return 'STORAGE_OR_OBJECT_INTEGRITY';
  }
  if (/decompress|archive|payload integrity/i.test(message)) {
    return 'ARCHIVE_OR_PAYLOAD_INTEGRITY';
  }
  if (/model binding|RavScore model/i.test(message)) return 'MODEL_BINDING';
  if (/contract hash/i.test(message)) return 'CONTRACT_HASHES';
  if (/dataset/i.test(message)) return 'DATASET_IDENTITY';
  if (/production reference|generation time|future|restore bounds/i.test(message)) {
    return 'TIME_BOUNDS';
  }
  if (/descriptor contradicts/i.test(message)) return 'DESCRIPTOR_BUNDLE_MISMATCH';
  if (/inventory|manifest|file count|file descriptor|bundle content/i.test(message)) {
    return 'BUNDLE_STRUCTURE_OR_CONTENT';
  }
  return `UNKNOWN_${String(stage).toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
}

function protectedPrivateRuntimeSourceIdentity(descriptor, kind, policy) {
  return Object.freeze({
    schemaVersion: policy.currentSourceSchemaVersion,
    kind,
    sourceHead: descriptor.sourceHead,
    datasetId: descriptor.datasetId,
    bundleContentSha256: descriptor.bundleContentSha256,
    productionReferenceAt: descriptor.productionReferenceAt,
    generatedAt: descriptor.generatedAt,
    modelBinding: structuredClone(descriptor.modelBinding),
    contractHashes: structuredClone(descriptor.contractHashes),
    expectedZoneCount: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedZoneCount,
    expectedPartCount: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedPartCount,
    privatePayloadIncluded: false,
  });
}

export async function describeCurrentProtectedPrivateProductionRuntime({
  request,
  policy = PROTECTED_PRIVATE_RUNTIME_POLICY,
} = {}) {
  const row = await readPointerRow(request, {
    allowMissing: false,
    policy,
    // A code-only successor must identify the exact current generation even
    // when its model bundle belongs to the preceding release.
    allowHistoricalCurrentModelBinding: true,
  });
  return protectedPrivateRuntimeSourceIdentity(
    row.payload.current,
    policy.currentSourceKind,
    policy,
  );
}

export async function describeTargetProtectedPrivateProductionRuntime({
  request,
  targetReferenceAt,
  policy = PROTECTED_PRIVATE_RUNTIME_POLICY,
} = {}) {
  const target = canonicalTime(
    targetReferenceAt,
    'Protected private runtime target source reference',
  );
  const row = await readPointerRow(request, {
    allowMissing: false,
    policy,
    allowHistoricalCurrentModelBinding: true,
  });
  const selected = [row.payload.current, row.payload.previous]
    .filter(Boolean)
    .find(descriptor => descriptor.productionReferenceAt === target);
  if (!selected) {
    throw new Error('No protected private runtime generation matches the exact target reference');
  }
  return protectedPrivateRuntimeSourceIdentity(selected, policy.targetSourceKind, policy);
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
  const row = await readPointerRow(request, {
    allowMissing: true,
    policy,
    // Candidate compatibility is established from the archived manifest and
    // exact bytes below. Pointer shape must not hide a compatible previous
    // merely because current belongs to another model version.
    allowHistoricalCurrentModelBinding: true,
  });
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
      const exactDmiPredecessor = isExactDmiSchedulerPredecessor(descriptor, expected)
        || isExactDmiMarineSeamPredecessor(descriptor, expected)
        || isExactWeatherRotationPredecessor(descriptor, expected);
      if (!same(descriptor.modelBinding, expected.modelBinding)
        || (!same(descriptor.contractHashes, expected.contractHashes)
          && !exactDmiPredecessor)) {
        const error = new Error('Protected private runtime generation is incompatible with this consumer');
        error.code = 'PROTECTED_PRIVATE_RUNTIME_INELIGIBLE';
        rejections.push({
          error,
          code: 'MODEL_OR_CONTRACT_INELIGIBLE',
          eligible: false,
        });
        continue;
      }
      const candidate = path.join(
        context.root,
        `.protected-runtime-candidate-${process.pid}-${index}-${crypto.randomBytes(5).toString('hex')}`,
      );
      temporaryDirectories.push(candidate);
      let rejectionStage = 'stored-object';
      try {
        const archive = await verifyStoredArchive(storage, descriptor);
        rejectionStage = 'archive-extraction';
        await extractArchive({
          archive,
          descriptor,
          privateRoot: context.root,
          bundlePath: candidate,
          repositoryRoot: context.repository,
          policy,
        });
        rejectionStage = 'bundle-verification';
        const verified = await verifyPrivateProductionRuntimeBundle({
          privateRoot: context.root,
          bundlePath: candidate,
          repositoryRoot: context.repository,
          // Verify the archive against its own exact predecessor fingerprint.
          // Its age, model, identity and immutable bytes remain fully checked.
          expected: exactDmiPredecessor
            ? { ...expected, contractHashes: descriptor.contractHashes }
            : expected,
          now,
        });
        rejectionStage = 'descriptor-readback';
        assertDescriptorMatchesBundle(descriptor, verified);
        // Expiry is non-blocking only after the archived generation has
        // passed the same full manifest, contract, inventory and byte-hash
        // validation as a generation that could actually be restored.
        rejectionStage = 'time-bounds';
        assertRestoreTime(descriptor, expected, now, policy);
        selected = { descriptor, candidate, verified, exactDmiPredecessor };
        // Pointer validation already proves current >= previous and rejects
        // conflicting equal-time generations. Normal restore therefore reads
        // current once; previous is downloaded only for genuine rollback.
        break;
      } catch (error) {
        rejections.push({
          error,
          code: safeRestoreRejectionCode(error, rejectionStage),
          eligible: true,
        });
        await fs.rm(candidate, { recursive: true, force: true }).catch(() => {});
      }
    }
    if (!selected) {
      const eligibleRejections = rejections.filter(item => item.eligible);
      if (eligibleRejections.length > 0
        && eligibleRejections.every(
          item => item.error?.code === 'PROTECTED_PRIVATE_RUNTIME_EXPIRED',
        )) {
        return {
          restored: false,
          reason: 'protected-private-runtime-expired',
          targetUnchanged: true,
          privatePayloadLogged: false,
        };
      }
      const error = new Error('No compatible protected private runtime generation is available');
      error.code = 'PROTECTED_PRIVATE_RUNTIME_NO_COMPATIBLE_GENERATION';
      error.rejectionCodes = Object.freeze(rejections.map(item => item.code));
      throw error;
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
      objectCount: descriptorObjects(selected.descriptor).length,
      rollbackSelected,
      currentGenerationRejected: rollbackSelected,
      rejectedGenerationCount: rejections.length,
      exactDmiPredecessor: selected.exactDmiPredecessor,
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
  const row = await readPointerRow(request, {
    allowMissing: false,
    policy,
    allowHistoricalCurrentModelBinding: true,
  });
  const statuses = [];
  for (const object of descriptorObjects(row.payload.current)) {
    const status = await storage.anonymousStatus(object.objectPath);
    statuses.push(status);
    if (![400, 401, 403, 404].includes(status)) {
      throw new Error('Protected private runtime object is anonymously readable');
    }
  }
  return {
    anonymousReadDenied: true,
    objectCount: statuses.length,
    statusClasses: [...new Set(statuses.map(status => `${Math.floor(status / 100)}xx`))],
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
  delayImpl = ms => new Promise(resolve => setTimeout(resolve, ms)),
  retryDelayMs = 1_000,
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

  async function retryableFetch(target, options, label, consume = null) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      let response;
      try {
        response = await fetchImpl(target, options);
        if (attempt === 1 && [429, 502, 503, 504].includes(response.status)) {
          await response.body?.cancel?.().catch(() => {});
          await delayImpl(retryDelayMs);
          continue;
        }
        return consume ? await consume(response) : response;
      } catch (error) {
        // Once headers arrived, retry interrupted transport only. A malformed,
        // oversized or incompatible object is not a transient network fault.
        if (response && error?.code !== 'SUPABASE_RESPONSE_BODY_TRANSPORT') throw error;
        if (attempt === 1) {
          await delayImpl(retryDelayMs);
          continue;
        }
        const wrapped = new Error(`Protected private runtime ${label} could not be reached`);
        wrapped.cause = error;
        throw wrapped;
      }
    }
    throw new Error(`Protected private runtime ${label} retry was exhausted`);
  }

  async function responseText(response) {
    const text = await readSupabaseBodyTransport(() => response.text());
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* safe generic error below */ }
    return { text, json };
  }
  async function readBucket() {
    return retryableFetch(`${bucketEndpoint}/${encodeURIComponent(policy.bucketId)}`, {
      headers,
    }, 'bucket read', async response => ({ response, parsed: await responseText(response) }));
  }
  async function ensurePrivateBucket() {
    let { response, parsed } = await readBucket();
    if (response.status === 404) {
      response = await retryableFetch(bucketEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: policy.bucketId,
          name: policy.bucketId,
          public: false,
          file_size_limit: policy.maximumArchiveBytes,
          allowed_mime_types: [policy.mimeType],
        }),
      }, 'bucket creation');
      if (!response.ok && response.status !== 409) {
        throw new Error('Protected private runtime bucket creation failed closed');
      }
      ({ response, parsed } = await readBucket());
    }
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
    const { response, parsed } = await retryableFetch(
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
      'immutable upload',
      async response => ({ response, parsed: response.ok ? null : await responseText(response) }),
    );
    if (response.ok) return { created: true };
    if ([400, 409].includes(response.status)
      && /duplicate|already exists|resource already exists/i.test(
        String(parsed.json?.message ?? parsed.json?.error ?? parsed.text),
      )) {
      return { created: false, alreadyExists: true };
    }
    throw new Error('Protected private runtime immutable upload failed closed');
  }
  async function download(objectPath) {
    return retryableFetch(
      `${objectEndpoint}/authenticated/${encodeURIComponent(policy.bucketId)}/${encodeObjectPath(objectPath)}`,
      { headers },
      'download',
      async response => {
        const length = Number(response.headers?.get?.('content-length'));
        if (!response.ok
          || (Number.isFinite(length) && length > policy.maximumArchiveBytes)) {
          await response.body?.cancel?.().catch(() => {});
          throw new Error('Protected private runtime download failed closed');
        }
        // Read inside the retry boundary: HTTP 200 is not evidence that the
        // object arrived. Limit chunked responses as well as Content-Length.
        const chunks = [];
        let total = 0;
        if (response.body?.getReader) {
          const reader = response.body.getReader();
          try {
            for (;;) {
              const { value, done } = await readSupabaseBodyTransport(() => reader.read());
              if (done) break;
              total += value.byteLength;
              if (total > policy.maximumArchiveBytes) {
                await reader.cancel().catch(() => {});
                throw new Error('Protected private runtime download exceeds its bound');
              }
              chunks.push(Buffer.from(value));
            }
          } finally { reader.releaseLock(); }
        } else {
          const bytes = Buffer.from(await readSupabaseBodyTransport(() => response.arrayBuffer()));
          total = bytes.length;
          chunks.push(bytes);
        }
        if (total > policy.maximumArchiveBytes) {
          throw new Error('Protected private runtime download exceeds its bound');
        }
        return Buffer.concat(chunks, total);
      },
    );
  }
  async function removeExact(objectPath) {
    const response = await retryableFetch(
      `${objectEndpoint}/${encodeURIComponent(policy.bucketId)}`,
      {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ prefixes: [objectPath] }),
      },
      'retention cleanup',
    );
    if (!response.ok) throw new Error('Protected private runtime retention cleanup failed closed');
    return true;
  }
  async function anonymousStatus(objectPath) {
    const response = await retryableFetch(
      `${objectEndpoint}/authenticated/${encodeURIComponent(policy.bucketId)}/${encodeObjectPath(objectPath)}`,
      undefined,
      'anonymous audit',
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
    if (['--publish', '--restore', '--audit-anon', '--describe-current', '--describe-target'].includes(argument)) {
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
    else if (argument === '--output') result.outputPath = value;
    else if (argument === '--target-reference') result.targetReferenceAt = value;
    else if (argument === '--same-reference-migration-report') {
      result.sameReferenceMigrationReportPath = value;
    } else if (argument === '--same-reference-predecessor-manifest') {
      result.sameReferencePredecessorManifestPath = value;
    }
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!result.mode) {
    throw new Error('Use --publish, --restore, --audit-anon, --describe-current or --describe-target');
  }
  if (!['audit-anon', 'describe-current', 'describe-target'].includes(result.mode)
    && (!result.privateRoot || !result.bundlePath || !result.expectedPath)) {
    throw new Error('Protected private runtime mode requires root, bundle and expectation');
  }
  if (result.mode === 'publish' && !result.sourceHead) {
    throw new Error('Protected private runtime publish requires --source-head');
  }
  if (['describe-current', 'describe-target'].includes(result.mode) && !result.outputPath) {
    throw new Error('Protected private runtime source description requires --output');
  }
  if (result.mode === 'describe-target' && !result.targetReferenceAt) {
    throw new Error('Protected private runtime target description requires --target-reference');
  }
  const hasSameReferenceReport = Boolean(result.sameReferenceMigrationReportPath);
  const hasSameReferenceManifest = Boolean(result.sameReferencePredecessorManifestPath);
  if (hasSameReferenceReport !== hasSameReferenceManifest || (hasSameReferenceReport && result.mode !== 'publish')) {
    throw new Error('Same-reference private runtime evidence requires both publish-only inputs');
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
  } else if (['describe-current', 'describe-target'].includes(options.mode)) {
    result = options.mode === 'describe-current'
      ? await describeCurrentProtectedPrivateProductionRuntime({
        request: clients.documentRequest,
      })
      : await describeTargetProtectedPrivateProductionRuntime({
        request: clients.documentRequest,
        targetReferenceAt: options.targetReferenceAt,
      });
    const output = path.resolve(options.outputPath);
    const temporary = `${output}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
    await fs.mkdir(path.dirname(output), { recursive: true });
    try {
      await fs.writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
      await fs.rename(temporary, output);
    } catch (error) {
      await fs.rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
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
    const sameReferenceSuccessorEvidence = options.sameReferenceMigrationReportPath
      ? {
        migrationReport: await readJson(
          options.sameReferenceMigrationReportPath,
          'Same-reference private runtime migration report',
        ),
        predecessorManifest: await readJson(
          options.sameReferencePredecessorManifestPath,
          'Same-reference predecessor private runtime manifest',
        ),
      }
      : undefined;
    result = options.mode === 'publish'
      ? await publishProtectedPrivateProductionRuntime({
        ...common,
        sourceHead: options.sourceHead,
        sameReferenceSuccessorEvidence,
      })
      : await restoreProtectedPrivateProductionRuntime(common);
  }
  console.log(JSON.stringify({
    status: options.mode === 'describe-current'
      ? 'protected-private-runtime-current-described'
      : options.mode === 'describe-target'
        ? 'protected-private-runtime-target-described'
      : result.reason ?? 'anonymous-read-denied',
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
    const rejectionSuffix = Array.isArray(error?.rejectionCodes)
      ? ` [rejection-codes: ${error.rejectionCodes.join(',')}]`
      : '';
    console.error(`Protected private production runtime failed closed: ${error.message}${rejectionSuffix}`);
    process.exitCode = 1;
  });
}

export const DEFAULT_PROTECTED_PRIVATE_RUNTIME_ROOT = path.join(
  os.tmpdir(),
  'ravradar-private-production-runtime',
);
