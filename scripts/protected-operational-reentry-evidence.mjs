#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { gzip, gunzip } from 'node:zlib';

import { assertExactPublicRavScoreModelBindingShape } from '../js/core/ravscore-public-profile-contract.js';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';
import {
  PROTECTED_PRIVATE_RUNTIME_POLICY,
  createProtectedPrivateRuntimeClients,
} from './protected-private-production-runtime.mjs';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export const PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY = Object.freeze({
  schemaVersion: '1.0.0',
  pointerKind: 'RAVRADAR_OPERATIONAL_REENTRY_EVIDENCE_POINTER',
  descriptorKind: 'RAVRADAR_OPERATIONAL_REENTRY_EVIDENCE_OBJECT',
  archiveKind: 'RAVRADAR_OPERATIONAL_REENTRY_EVIDENCE_ARCHIVE',
  documentKey: 'ravscore-operational-reentry-evidence-pointer',
  bucketId: PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId,
  maximumArchiveBytes: 10 * 1024 * 1024,
  maximumEnvelopeBytes: 24 * 1024 * 1024,
  maximumFileBytes: 8 * 1024 * 1024,
  maximumFileCount: 16,
});

const REQUIRED_FILES = Object.freeze([
  'checkpoint-disposition.json',
  'checkpoint-runtime-audit.json',
  'handoff.json',
  'manifest.json',
  'pages-artifact-seal.json',
  'public-audit.json',
  'target-binding.json',
  'target-bundle.generated.js',
  'target-contract.js',
  'target-public-closure.json',
]);
const OPTIONAL_FILES = Object.freeze([
  'code-only-reuse.json',
  'integrated-readiness.json',
  'legacy-source-attestation.json',
  'legacy-source-manifest.json',
  'plan.json',
]);
const ALLOWED_FILES = new Set([...REQUIRED_FILES, ...OPTIONAL_FILES]);
const IGNORED_TRANSIENT_FILES = new Set([
  'source-deployment-id.txt',
  'source-manifest.json',
  'source-verification.json',
]);
const POINTER_KEYS = Object.freeze(['schemaVersion', 'kind', 'current', 'previous']);
const DESCRIPTOR_KEYS = Object.freeze([
  'schemaVersion',
  'kind',
  'bucketId',
  'objectPath',
  'objectSha256',
  'objectBytes',
  'deploymentId',
  'repository',
  'runId',
  'runAttempt',
  'sourceHead',
  'datasetId',
  'productionReferenceAt',
  'publicManifestSha256',
  'implementationClosureSha256',
  'modelBindingSha256',
  'createdAt',
]);
const ARCHIVE_KEYS = Object.freeze(['schemaVersion', 'kind', 'descriptor', 'fileCount', 'files']);
const FILE_KEYS = Object.freeze(['path', 'bytes', 'sha256', 'contentBase64']);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const HEAD_PATTERN = /^[0-9a-f]{40}$/;
const DEPLOYMENT_PATTERN = /^pages-(?:recovery-)?[1-9][0-9]*-[1-9][0-9]*$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}\/[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;
const DATASET_PATTERN = /^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/;
const FORBIDDEN_PAYLOAD_PATTERN = /"(?:waterPoint|landPoint|currentUMps|currentVMps|rawPayload|privatePayload)"/i;

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const same = (left, right) => sha256CanonicalJson(left) === sha256CanonicalJson(right);
const isObject = value => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;

function exactKeys(value, keys, label) {
  if (!isObject(value)) throw new Error(`${label} is not an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} has unknown or missing fields`);
  }
}

function canonicalTime(value, label) {
  if (typeof value !== 'string') throw new Error(`${label} is invalid`);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`${label} is not canonical UTC`);
  }
  return value;
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${label} is invalid`);
  return value;
}

function parseDeploymentIdentity(deploymentId) {
  if (!DEPLOYMENT_PATTERN.test(String(deploymentId ?? ''))) {
    throw new Error('Operational evidence deployment id is invalid');
  }
  const match = String(deploymentId).match(/^pages-(?:recovery-)?([1-9][0-9]*)-([1-9][0-9]*)$/);
  return { runId: Number(match[1]), runAttempt: Number(match[2]) };
}

export function validateProtectedOperationalEvidenceDescriptor(value, {
  policy = PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY,
} = {}) {
  exactKeys(value, DESCRIPTOR_KEYS, 'Operational evidence descriptor');
  const identity = parseDeploymentIdentity(value.deploymentId);
  if (value.schemaVersion !== policy.schemaVersion
    || value.kind !== policy.descriptorKind
    || value.bucketId !== policy.bucketId
    || !SHA256_PATTERN.test(String(value.objectSha256 ?? ''))
    || value.objectPath !== `operational-evidence/sha256/${value.objectSha256}.json.gz`
    || !Number.isSafeInteger(value.objectBytes)
    || value.objectBytes < 1
    || value.objectBytes > policy.maximumArchiveBytes
    || !REPOSITORY_PATTERN.test(String(value.repository ?? ''))
    || value.runId !== identity.runId
    || value.runAttempt !== identity.runAttempt
    || !HEAD_PATTERN.test(String(value.sourceHead ?? ''))
    || !DATASET_PATTERN.test(String(value.datasetId ?? ''))
    || !SHA256_PATTERN.test(String(value.publicManifestSha256 ?? ''))
    || !SHA256_PATTERN.test(String(value.implementationClosureSha256 ?? ''))
    || !SHA256_PATTERN.test(String(value.modelBindingSha256 ?? ''))) {
    throw new Error('Operational evidence descriptor is invalid');
  }
  canonicalTime(value.productionReferenceAt, 'Operational evidence production reference');
  canonicalTime(value.createdAt, 'Operational evidence creation time');
  return structuredClone(value);
}

export function validateProtectedOperationalEvidencePointer(value, {
  policy = PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY,
} = {}) {
  exactKeys(value, POINTER_KEYS, 'Operational evidence pointer');
  if (value.schemaVersion !== policy.schemaVersion || value.kind !== policy.pointerKind) {
    throw new Error('Operational evidence pointer identity is invalid');
  }
  const current = validateProtectedOperationalEvidenceDescriptor(value.current, { policy });
  const previous = value.previous === null
    ? null
    : validateProtectedOperationalEvidenceDescriptor(value.previous, { policy });
  if (previous?.deploymentId === current.deploymentId) {
    throw new Error('Operational evidence pointer duplicates a deployment');
  }
  return { schemaVersion: value.schemaVersion, kind: value.kind, current, previous };
}

function validateManifest(manifest) {
  if (!isObject(manifest)
    || manifest.schemaVersion !== 4
    || manifest.complete !== true
    || manifest.zoneCount !== 210
    || manifest.coastalPartCount !== 673
    || !DATASET_PATTERN.test(String(manifest.datasetId ?? ''))) {
    throw new Error('Operational evidence manifest is not complete');
  }
  canonicalTime(manifest.productionReferenceAt, 'Operational evidence manifest reference');
  assertExactPublicRavScoreModelBindingShape(manifest.ravScoreModelBinding, {
    label: 'Operational evidence manifest binding',
  });
  return manifest;
}

function descriptorFromFiles(files, { deploymentId, repository, policy, objectSha256 = null, objectBytes = null }) {
  const byPath = new Map(files.map(file => [file.path, file]));
  for (const required of REQUIRED_FILES) {
    if (!byPath.has(required)) throw new Error(`Operational evidence lacks ${required}`);
  }
  const parseJson = file => {
    try { return JSON.parse(Buffer.from(byPath.get(file).contentBase64, 'base64').toString('utf8')); }
    catch { throw new Error(`Operational evidence ${file} is not JSON`); }
  };
  const manifest = validateManifest(parseJson('manifest.json'));
  const handoff = parseJson('handoff.json');
  const seal = parseJson('pages-artifact-seal.json');
  const binding = parseJson('target-binding.json');
  const closure = parseJson('target-public-closure.json');
  const contractText = Buffer.from(byPath.get('target-contract.js').contentBase64, 'base64')
    .toString('utf8');
  const bundleText = Buffer.from(byPath.get('target-bundle.generated.js').contentBase64, 'base64')
    .toString('utf8');
  const identity = parseDeploymentIdentity(deploymentId);
  if (handoff.schemaVersion !== 'ravscore-operational-deploy-handoff-v2'
    || handoff.privatePayloadIncluded !== false
    || seal.schemaVersion !== 'ravscore-operational-pages-artifact-seal-v1'
    || seal.privatePayloadIncluded !== false
    || seal.attemptId !== deploymentId
    || seal.repository !== repository
    || seal.runId !== identity.runId
    || seal.runAttempt !== identity.runAttempt
    || !HEAD_PATTERN.test(String(seal.headSha ?? ''))
    || handoff.sourceHead !== seal.headSha
    || seal.targetPublicManifestSha256 !== sha256CanonicalJson(manifest)
    || seal.targetModelBinding === undefined
    || sha256CanonicalJson(seal.targetModelBinding) !== sha256CanonicalJson(binding)
    || !SHA256_PATTERN.test(String(seal.targetImplementationClosureSha256 ?? ''))) {
    throw new Error('Operational evidence identities do not bind exactly');
  }
  assertExactPublicRavScoreModelBindingShape(binding, {
    label: 'Operational evidence target binding',
  });
  const expectedModel = String(binding.modelId).startsWith('RRS-CANDIDATE-G-')
    ? 'candidate-g'
    : String(binding.modelId).startsWith('RRS-COASTAL-PROCESS-INTEGRATED-')
      ? 'integrated'
      : null;
  if (expectedModel === null) throw new Error('Operational evidence model is unsupported');
  if (closure?.schemaVersion !== 'ravscore-public-browser-closure-v1'
    || !Array.isArray(closure.files)
    || closure.files.length < 1
    || contractText.length < 1
    || bundleText.length < 1) {
    throw new Error('Operational evidence implementation closure is invalid');
  }
  return {
    schemaVersion: policy.schemaVersion,
    kind: policy.descriptorKind,
    bucketId: policy.bucketId,
    objectPath: objectSha256
      ? `operational-evidence/sha256/${objectSha256}.json.gz`
      : null,
    objectSha256,
    objectBytes,
    deploymentId,
    repository,
    runId: identity.runId,
    runAttempt: identity.runAttempt,
    sourceHead: seal.headSha,
    datasetId: manifest.datasetId,
    productionReferenceAt: manifest.productionReferenceAt,
    publicManifestSha256: seal.targetPublicManifestSha256,
    implementationClosureSha256: seal.targetImplementationClosureSha256,
    modelBindingSha256: sha256CanonicalJson(binding),
    createdAt: canonicalTime(seal.createdAt, 'Operational evidence artifact creation time'),
  };
}

async function collectFiles(directory, policy) {
  const root = path.resolve(directory);
  const entries = await fs.readdir(root, { withFileTypes: true });
  const names = entries.map(entry => entry.name).sort();
  if (entries.some(entry => !entry.isFile()
      || (!ALLOWED_FILES.has(entry.name) && !IGNORED_TRANSIENT_FILES.has(entry.name)))
    || names.filter(name => ALLOWED_FILES.has(name)).length > policy.maximumFileCount) {
    throw new Error('Operational evidence directory contains an unknown entry');
  }
  const files = [];
  for (const name of names.filter(item => ALLOWED_FILES.has(item))) {
    const bytes = await fs.readFile(path.join(root, name));
    if (bytes.length < 1 || bytes.length > policy.maximumFileBytes) {
      throw new Error(`Operational evidence file ${name} is outside its size bound`);
    }
    if (FORBIDDEN_PAYLOAD_PATTERN.test(bytes.toString('utf8'))) {
      throw new Error(`Operational evidence file ${name} contains a forbidden private field`);
    }
    files.push({
      path: name,
      bytes: bytes.length,
      sha256: sha256(bytes),
      contentBase64: bytes.toString('base64'),
    });
  }
  return files;
}

export async function buildProtectedOperationalEvidenceArchive({
  directory,
  deploymentId,
  repository,
  policy = PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY,
} = {}) {
  if (!REPOSITORY_PATTERN.test(String(repository ?? ''))) {
    throw new Error('Operational evidence repository is invalid');
  }
  const files = await collectFiles(directory, policy);
  const unboundDescriptor = descriptorFromFiles(files, {
    deploymentId,
    repository,
    policy,
  });
  const envelope = {
    schemaVersion: policy.schemaVersion,
    kind: policy.archiveKind,
    descriptor: {
      ...unboundDescriptor,
      objectPath: '<content-addressed>',
      objectSha256: '0'.repeat(64),
      objectBytes: 0,
    },
    fileCount: files.length,
    files,
  };
  const envelopeBytes = Buffer.from(JSON.stringify(envelope));
  if (envelopeBytes.length > policy.maximumEnvelopeBytes) {
    throw new Error('Operational evidence envelope exceeds its size bound');
  }
  const archive = await gzipAsync(envelopeBytes, { level: 9, mtime: 0 });
  if (archive.length < 1 || archive.length > policy.maximumArchiveBytes) {
    throw new Error('Operational evidence archive exceeds its size bound');
  }
  const objectSha256 = sha256(archive);
  const descriptor = validateProtectedOperationalEvidenceDescriptor({
    ...unboundDescriptor,
    objectPath: `operational-evidence/sha256/${objectSha256}.json.gz`,
    objectSha256,
    objectBytes: archive.length,
  }, { policy });
  return { archive, descriptor };
}

async function decodeArchive(archive, descriptor, policy) {
  if (!Buffer.isBuffer(archive)
    || archive.length !== descriptor.objectBytes
    || sha256(archive) !== descriptor.objectSha256) {
    throw new Error('Operational evidence object integrity is invalid');
  }
  let envelope;
  try {
    const bytes = await gunzipAsync(archive, { maxOutputLength: policy.maximumEnvelopeBytes });
    envelope = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error('Operational evidence archive cannot be decoded');
  }
  exactKeys(envelope, ARCHIVE_KEYS, 'Operational evidence archive');
  if (envelope.schemaVersion !== policy.schemaVersion
    || envelope.kind !== policy.archiveKind
    || !Number.isSafeInteger(envelope.fileCount)
    || envelope.fileCount < REQUIRED_FILES.length
    || envelope.fileCount > policy.maximumFileCount
    || !Array.isArray(envelope.files)
    || envelope.files.length !== envelope.fileCount) {
    throw new Error('Operational evidence archive identity is invalid');
  }
  const files = envelope.files.map((file, index) => {
    exactKeys(file, FILE_KEYS, `Operational evidence file ${index}`);
    if (!ALLOWED_FILES.has(file.path)
      || !Number.isSafeInteger(file.bytes)
      || file.bytes < 1
      || file.bytes > policy.maximumFileBytes
      || !SHA256_PATTERN.test(String(file.sha256 ?? ''))
      || typeof file.contentBase64 !== 'string') {
      throw new Error('Operational evidence file descriptor is invalid');
    }
    const bytes = Buffer.from(file.contentBase64, 'base64');
    if (bytes.length !== file.bytes
      || sha256(bytes) !== file.sha256
      || bytes.toString('base64') !== file.contentBase64
      || FORBIDDEN_PAYLOAD_PATTERN.test(bytes.toString('utf8'))) {
      throw new Error('Operational evidence file integrity is invalid');
    }
    return { ...file };
  });
  const paths = files.map(file => file.path);
  if (new Set(paths).size !== paths.length
    || paths.some((file, index) => file !== [...paths].sort()[index])) {
    throw new Error('Operational evidence file inventory is invalid');
  }
  const archivedDescriptor = descriptorFromFiles(files, {
    deploymentId: descriptor.deploymentId,
    repository: descriptor.repository,
    policy,
    objectSha256: descriptor.objectSha256,
    objectBytes: descriptor.objectBytes,
  });
  if (!same(archivedDescriptor, descriptor)
    || !same(envelope.descriptor, {
      ...descriptor,
      objectPath: '<content-addressed>',
      objectSha256: '0'.repeat(64),
      objectBytes: 0,
    })) {
    throw new Error('Operational evidence descriptor contradicts its archive');
  }
  return files;
}

async function requestDocument(request, suffix, options, label) {
  try { return await request(suffix, options, label); }
  catch (error) {
    const wrapped = new Error(`Operational evidence ${label} failed closed`);
    wrapped.cause = error;
    throw wrapped;
  }
}

async function readPointer(request, { allowMissing, policy }) {
  const rows = await requestDocument(
    request,
    `?document_key=eq.${encodeURIComponent(policy.documentKey)}&select=document_key,payload,version&limit=2`,
    {},
    'pointer read',
  );
  if (!Array.isArray(rows) || rows.length > 1) {
    throw new Error('Operational evidence pointer readback is not unique');
  }
  if (rows.length === 0) {
    if (allowMissing) return null;
    throw new Error('Operational evidence pointer is missing');
  }
  const row = rows[0];
  if (!isObject(row)
    || row.document_key !== policy.documentKey
    || !Number.isSafeInteger(Number(row.version))
    || Number(row.version) < 1) {
    throw new Error('Operational evidence pointer row is invalid');
  }
  return {
    ...row,
    version: Number(row.version),
    payload: validateProtectedOperationalEvidencePointer(row.payload, { policy }),
  };
}

async function verifyObject(storage, descriptor, policy) {
  const archive = await storage.download(descriptor.objectPath);
  await decodeArchive(archive, descriptor, policy);
  return archive;
}

function descriptors(pointer) {
  return [pointer?.current, pointer?.previous].filter(Boolean);
}

async function removeCreatedEvidenceIfUnreferenced({
  request,
  storage,
  objectPath,
  policy,
}) {
  let latest;
  try {
    latest = await readPointer(request, { allowMissing: true, policy });
  } catch {
    // If the pointer cannot be reread, its reference state is unknown. Keep
    // the immutable object rather than risk deleting a committed generation.
    return false;
  }
  const referencedPaths = new Set(descriptors(latest?.payload).map(item => item.objectPath));
  if (referencedPaths.has(objectPath)) return false;
  await storage.removeExact(objectPath);
  return true;
}

export async function publishProtectedOperationalEvidence({
  directory,
  deploymentId,
  retainDeploymentId = null,
  retainPublicManifestSha256 = null,
  requireRetained = false,
  repository,
  request,
  storage,
  policy = PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY,
} = {}) {
  if (retainDeploymentId !== null && retainPublicManifestSha256 !== null) {
    throw new Error('Select retained operational evidence by one identity');
  }
  if (retainPublicManifestSha256 !== null
    && !SHA256_PATTERN.test(String(retainPublicManifestSha256))) {
    throw new Error('Retained operational evidence manifest hash is invalid');
  }
  const built = await buildProtectedOperationalEvidenceArchive({
    directory,
    deploymentId,
    repository,
    policy,
  });
  const existing = await readPointer(request, { allowMissing: true, policy });
  const existingDescriptors = descriptors(existing?.payload);
  const retained = retainDeploymentId !== null
    ? existingDescriptors.find(item => item.deploymentId === retainDeploymentId) ?? null
    : retainPublicManifestSha256 !== null
      ? existingDescriptors.find(
        item => item.publicManifestSha256 === retainPublicManifestSha256,
      ) ?? null
      : null;
  const retainingNew = retainDeploymentId === deploymentId
    || retainPublicManifestSha256 === built.descriptor.publicManifestSha256;
  if (requireRetained && !retainingNew && !retained) {
    throw new Error('Operational evidence cannot evict the exact active source');
  }
  const sameDeployment = existingDescriptors.find(
    item => item.deploymentId === deploymentId,
  ) ?? null;
  if (sameDeployment && !same(sameDeployment, built.descriptor)) {
    throw new Error('Operational evidence conflicts for one deployment id');
  }
  await storage.ensurePrivateBucket();
  const upload = await storage.uploadImmutable(built.descriptor.objectPath, built.archive);
  await verifyObject(storage, built.descriptor, policy);

  const other = retained && retained.deploymentId !== deploymentId
    ? retained
    : existingDescriptors.find(item => item.deploymentId !== deploymentId) ?? null;
  const pointer = {
    schemaVersion: policy.schemaVersion,
    kind: policy.pointerKind,
    current: built.descriptor,
    previous: other,
  };
  if (existing && same(existing.payload, pointer)) {
    return {
      published: false,
      reason: 'protected-operational-evidence-already-current',
      centralVersion: existing.version,
      deploymentId,
      retainedDeploymentId: other?.deploymentId ?? null,
      objectSha256: built.descriptor.objectSha256,
      privatePayloadIncluded: false,
    };
  }

  const expectedVersion = existing ? existing.version + 1 : 1;
  let readback;
  try {
    let rows;
    if (!existing) {
      rows = await requestDocument(request, '?on_conflict=document_key&select=document_key,payload,version', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify({ document_key: policy.documentKey, payload: pointer, updated_by: null }),
      }, 'pointer insert');
    } else {
      rows = await requestDocument(
        request,
        `?document_key=eq.${encodeURIComponent(policy.documentKey)}&version=eq.${existing.version}&select=document_key,payload,version`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ payload: pointer, updated_by: null }),
        },
        'pointer compare-and-swap',
      );
    }
    if (!Array.isArray(rows) || rows.length !== 1 || Number(rows[0].version) !== expectedVersion) {
      throw new Error('Operational evidence pointer compare-and-swap lost a concurrent write');
    }
    readback = await readPointer(request, { allowMissing: false, policy });
    if (readback.version !== expectedVersion || !same(readback.payload, pointer)) {
      throw new Error('Operational evidence pointer readback does not match publication');
    }
  } catch (error) {
    let committedDespiteLostResponse = false;
    try {
      const recovered = await readPointer(request, { allowMissing: false, policy });
      if (recovered.version === expectedVersion && same(recovered.payload, pointer)) {
        readback = recovered;
        committedDespiteLostResponse = true;
      }
    } catch {
      // The original error remains authoritative unless exact version and
      // payload are proved by a fresh readback. Never retry an ambiguous write.
    }
    if (!committedDespiteLostResponse) {
      if (upload?.created === true) {
        try {
          await removeCreatedEvidenceIfUnreferenced({
            request,
            storage,
            objectPath: built.descriptor.objectPath,
            policy,
          });
        } catch {
          // Best-effort cleanup may only remove this attempt's new immutable
          // object. Preserve the authoritative publication error.
        }
      }
      throw error;
    }
  }

  const retainedPaths = new Set(descriptors(readback.payload).map(item => item.objectPath));
  let cleanupFailureCount = 0;
  for (const retired of existingDescriptors) {
    if (!retainedPaths.has(retired.objectPath)) {
      try { await storage.removeExact(retired.objectPath); }
      catch { cleanupFailureCount += 1; }
    }
  }
  return {
    published: true,
    reason: existing
      ? 'protected-operational-evidence-updated'
      : 'protected-operational-evidence-inserted',
    centralVersion: expectedVersion,
    deploymentId,
    retainedDeploymentId: other?.deploymentId ?? null,
    objectSha256: built.descriptor.objectSha256,
    objectCreated: upload?.created === true,
    retentionCleanupComplete: cleanupFailureCount === 0,
    retentionCleanupFailureCount: cleanupFailureCount,
    privatePayloadIncluded: false,
  };
}

export async function restoreProtectedOperationalEvidence({
  directory,
  deploymentId = null,
  publicManifestSha256 = null,
  repository = null,
  request,
  storage,
  policy = PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY,
} = {}) {
  if ((deploymentId === null) === (publicManifestSha256 === null)) {
    throw new Error('Select operational evidence by exactly one identity');
  }
  if (deploymentId !== null) parseDeploymentIdentity(deploymentId);
  if (publicManifestSha256 !== null
    && !SHA256_PATTERN.test(String(publicManifestSha256))) {
    throw new Error('Operational evidence public manifest hash is invalid');
  }
  const row = await readPointer(request, { allowMissing: false, policy });
  const descriptor = descriptors(row.payload).find(
    item => deploymentId !== null
      ? item.deploymentId === deploymentId
      : item.publicManifestSha256 === publicManifestSha256,
  );
  if (!descriptor) throw new Error('Exact protected operational evidence is unavailable');
  if (repository !== null && descriptor.repository !== repository) {
    throw new Error('Protected operational evidence belongs to another repository');
  }
  await storage.ensurePrivateBucket();
  const archive = await storage.download(descriptor.objectPath);
  const files = await decodeArchive(archive, descriptor, policy);
  const destination = path.resolve(directory);
  const existing = await fs.lstat(destination).catch(() => null);
  if (existing) throw new Error('Operational evidence restore destination already exists');
  const stage = `${destination}.stage-${process.pid}-${crypto.randomBytes(5).toString('hex')}`;
  try {
    await fs.mkdir(stage, { recursive: true, mode: 0o700 });
    for (const file of files) {
      await fs.writeFile(
        path.join(stage, file.path),
        Buffer.from(file.contentBase64, 'base64'),
        { mode: 0o600, flag: 'wx' },
      );
    }
    await fs.rename(stage, destination);
  } catch (error) {
    await fs.rm(stage, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
  return {
    restored: true,
    centralVersion: row.version,
    deploymentId: descriptor.deploymentId,
    publicManifestSha256: descriptor.publicManifestSha256,
    implementationClosureSha256: descriptor.implementationClosureSha256,
    sourceHead: descriptor.sourceHead,
    privatePayloadIncluded: false,
  };
}

function parseArgs(argv) {
  const result = { mode: null, requireRetained: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (['--publish', '--restore'].includes(argument)) {
      if (result.mode) throw new Error('Use exactly one operational evidence mode');
      result.mode = argument.slice(2);
      continue;
    }
    if (argument === '--require-retained') {
      result.requireRetained = true;
      continue;
    }
    const value = argv[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`);
    if (argument === '--directory') result.directory = value;
    else if (argument === '--deployment-id') result.deploymentId = value;
    else if (argument === '--public-manifest-sha256') result.publicManifestSha256 = value;
    else if (argument === '--retain-deployment-id') result.retainDeploymentId = value;
    else if (argument === '--retain-public-manifest-sha256') result.retainPublicManifestSha256 = value;
    else if (argument === '--repository') result.repository = value;
    else if (argument === '--output') result.output = value;
    else throw new Error(`Unknown operational evidence argument: ${argument}`);
  }
  if (!result.mode || !result.directory || !result.output) {
    throw new Error('Operational evidence mode, directory and output are required');
  }
  if (result.mode === 'publish' && (!result.repository || !result.deploymentId)) {
    throw new Error('Operational evidence publication requires repository');
  }
  if (result.mode === 'restore'
    && (Boolean(result.deploymentId) === Boolean(result.publicManifestSha256))) {
    throw new Error('Operational evidence restore requires exactly one identity');
  }
  return result;
}

async function writeJsonAtomic(file, value) {
  const target = path.resolve(file);
  const temporary = `${target}.tmp-${process.pid}-${crypto.randomBytes(5).toString('hex')}`;
  await fs.mkdir(path.dirname(target), { recursive: true });
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8', mode: 0o600, flag: 'wx',
    });
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  // Operational evidence is a separate, small Supabase object family. The
  // R2 cutover only moves the large production weather/runtime generations.
  const clients = createProtectedPrivateRuntimeClients({ storageBackend: 'supabase' });
  const result = options.mode === 'publish'
    ? await publishProtectedOperationalEvidence({
      directory: options.directory,
      deploymentId: options.deploymentId ?? null,
      publicManifestSha256: options.publicManifestSha256 ?? null,
      retainDeploymentId: options.retainDeploymentId ?? null,
      retainPublicManifestSha256: options.retainPublicManifestSha256 ?? null,
      requireRetained: options.requireRetained,
      repository: options.repository,
      request: clients.documentRequest,
      storage: clients.storage,
    })
    : await restoreProtectedOperationalEvidence({
      directory: options.directory,
      deploymentId: options.deploymentId,
      repository: options.repository ?? null,
      request: clients.documentRequest,
      storage: clients.storage,
    });
  await writeJsonAtomic(options.output, result);
  console.log(`${options.mode === 'publish' ? 'Published' : 'Restored'} protected operational evidence.`);
}

const isDirect = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  main().catch(error => {
    console.error(`Protected operational evidence stopped safely: ${error.message}`);
    process.exitCode = 1;
  });
}
