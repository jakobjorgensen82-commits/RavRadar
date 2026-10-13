#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { gzip, gunzip } from 'node:zlib';

import { assertExactPublicRavScoreModelBindingShape } from '../js/core/ravscore-public-profile-contract.js';
import { sha256CanonicalJson, assertUploadedOperationalPagesTarget } from './ravscore-operational-pages-recovery.mjs';
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
const PRE_ACTIVATION_FILES = new Set([...REQUIRED_FILES.filter(name => name !== 'handoff.json'), 'pre-activation.json']);
const PRE_ACTIVATION_POLICY = Object.freeze({ ...PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY,
  descriptorKind: 'RAVRADAR_PRE_ACTIVATION_EDGE_TARGET_OBJECT',
  archiveKind: 'RAVRADAR_PRE_ACTIVATION_EDGE_TARGET_ARCHIVE' });
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
  const hasPhase = Object.hasOwn(value ?? {}, 'preActivation');
  exactKeys(value, hasPhase ? [...POINTER_KEYS, 'preActivation'] : POINTER_KEYS, 'Operational evidence pointer');
  if (value.schemaVersion !== (hasPhase ? '2.0.0' : policy.schemaVersion) || value.kind !== policy.pointerKind) {
    throw new Error('Operational evidence pointer identity is invalid');
  }
  const current = validateProtectedOperationalEvidenceDescriptor(value.current, { policy });
  const previous = value.previous === null
    ? null
    : validateProtectedOperationalEvidenceDescriptor(value.previous, { policy });
  if (previous?.deploymentId === current.deploymentId) {
    throw new Error('Operational evidence pointer duplicates a deployment');
  }
  const preActivation = hasPhase && value.preActivation !== null
    ? validatePhaseSlot(value.preActivation) : null;
  return { schemaVersion: value.schemaVersion, kind: value.kind, current, previous,
    ...(hasPhase ? { preActivation } : {}) };
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
  const preActivation = policy.archiveKind === PRE_ACTIVATION_POLICY.archiveKind;
  for (const required of preActivation ? PRE_ACTIVATION_FILES : REQUIRED_FILES) {
    if (!byPath.has(required)) throw new Error(`Operational evidence lacks ${required}`);
  }
  const parseJson = file => {
    try { return JSON.parse(Buffer.from(byPath.get(file).contentBase64, 'base64').toString('utf8')); }
    catch { throw new Error(`Operational evidence ${file} is not JSON`); }
  };
  const manifest = validateManifest(parseJson('manifest.json'));
  const handoff = preActivation ? null : parseJson('handoff.json');
  const phase = preActivation ? parseJson('pre-activation.json') : null;
  const seal = parseJson('pages-artifact-seal.json');
  const binding = parseJson('target-binding.json');
  const closure = parseJson('target-public-closure.json');
  const contractText = Buffer.from(byPath.get('target-contract.js').contentBase64, 'base64')
    .toString('utf8');
  const bundleText = Buffer.from(byPath.get('target-bundle.generated.js').contentBase64, 'base64')
    .toString('utf8');
  const identity = parseDeploymentIdentity(deploymentId);
  if ((!preActivation && (handoff.schemaVersion !== 'ravscore-operational-deploy-handoff-v2'
    || handoff.privatePayloadIncluded !== false))
    || seal.schemaVersion !== 'ravscore-operational-pages-artifact-seal-v1'
    || seal.privatePayloadIncluded !== false
    || seal.attemptId !== deploymentId
    || seal.repository !== repository
    || seal.runId !== identity.runId
    || seal.runAttempt !== identity.runAttempt
    || !HEAD_PATTERN.test(String(seal.headSha ?? ''))
    || (!preActivation && handoff.sourceHead !== seal.headSha)
    || seal.targetPublicManifestSha256 !== sha256CanonicalJson(manifest)
    || seal.targetModelBinding === undefined
    || sha256CanonicalJson(seal.targetModelBinding) !== sha256CanonicalJson(binding)
    || !SHA256_PATTERN.test(String(seal.targetImplementationClosureSha256 ?? ''))) {
    throw new Error('Operational evidence identities do not bind exactly');
  }
  assertExactPublicRavScoreModelBindingShape(binding, {
    label: 'Operational evidence target binding',
  });
  if (preActivation) {
    exactKeys(phase, ['schemaVersion','sourceHead','sourceCurrent','sourceCurrentSha256','checkpointOutcomes','privatePayloadIncluded'], 'Pre-activation phase');
    if (phase.schemaVersion !== 'ravradar-current-grid-pre-activation-v1'
      || phase.sourceHead !== seal.headSha || phase.privatePayloadIncluded !== false
      || phase.sourceCurrent?.pending !== false || phase.sourceCurrent?.model !== 'integrated'
      || phase.sourceCurrentSha256 !== sha256CanonicalJson(phase.sourceCurrent))
      throw new Error('Pre-activation source identity is invalid');
    assertPhaseCheckpoint(files, phase);
    if (byPath.has('handoff.json') || byPath.has('plan.json') || byPath.has('integrated-readiness.json'))
      throw new Error('Pre-activation target must not claim completed handoff/readiness/plan');
    assertUploadedOperationalPagesTarget({ seal, targetManifest: manifest, targetModelBinding: binding,
      implementationClosureSha256: seal.targetImplementationClosureSha256, workflowIdentity: {
        repository, runId: identity.runId, runAttempt: identity.runAttempt, headSha: seal.headSha,
        ref: 'refs/heads/main', attemptId: deploymentId } });
  }
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
  const allowed = policy.archiveKind === PRE_ACTIVATION_POLICY.archiveKind ? PRE_ACTIVATION_FILES : ALLOWED_FILES;
  const root = path.resolve(directory);
  const entries = await fs.readdir(root, { withFileTypes: true });
  const names = entries.map(entry => entry.name).sort();
  if (entries.some(entry => !entry.isFile()
      || (!allowed.has(entry.name) && !IGNORED_TRANSIENT_FILES.has(entry.name)))
    || names.filter(name => allowed.has(name)).length > policy.maximumFileCount) {
    throw new Error('Operational evidence directory contains an unknown entry');
  }
  const files = [];
  for (const name of names.filter(item => allowed.has(item))) {
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
  const allowed = policy.archiveKind === PRE_ACTIVATION_POLICY.archiveKind ? PRE_ACTIVATION_FILES : ALLOWED_FILES;
  const minimumFiles = policy.archiveKind === PRE_ACTIVATION_POLICY.archiveKind ? PRE_ACTIVATION_FILES.size : REQUIRED_FILES.length;
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
    || envelope.fileCount < minimumFiles
    || envelope.fileCount > policy.maximumFileCount
    || !Array.isArray(envelope.files)
    || envelope.files.length !== envelope.fileCount) {
    throw new Error('Operational evidence archive identity is invalid');
  }
  const files = envelope.files.map((file, index) => {
    exactKeys(file, FILE_KEYS, `Operational evidence file ${index}`);
    if (!allowed.has(file.path)
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
function retainedDescriptors(pointer) {
  return [...descriptors(pointer), pointer?.preActivation?.originalTarget, pointer?.preActivation?.target].filter(Boolean);
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
  const referencedPaths = new Set(retainedDescriptors(latest?.payload).map(item => item.objectPath));
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
    schemaVersion: Object.hasOwn(existing?.payload ?? {}, 'preActivation') ? '2.0.0' : policy.schemaVersion,
    kind: policy.pointerKind,
    current: built.descriptor,
    previous: other,
    ...(Object.hasOwn(existing?.payload ?? {}, 'preActivation')
      ? { preActivation: existing.payload.preActivation } : {}),
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

  const retainedPaths = new Set(retainedDescriptors(readback.payload).map(item => item.objectPath));
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


function phasePolicy() { return PRE_ACTIVATION_POLICY; }
const phaseDocumentRows=new WeakMap();
function phaseSourceMatches(current,phase,target) {
  if(same(current,phase.sourceCurrent))return true;
  // Only a real normal central read may establish this second branch. A JSON
  // caller flag or receipt cannot stand in for the existing source-reconcile CAS.
  const row=phaseDocumentRows.get(current)?.operational,source=phase.sourceCurrent;
  if(!row||!['PENDING_SOURCE_RECONCILED','FAILED_RUN_SOURCE_RECONCILED'].includes(row.payload.failureCode)
    ||current.centralVersion<=source.centralVersion||current.pending||current.model!=='integrated'
    ||sha256CanonicalJson(current.requestedModelBinding)!==target.modelBindingSha256)return false;
  const expected={...source,centralVersion:current.centralVersion,sourceHead:target.sourceHead,
    sourceModelBinding:source.modelBinding,requestedModelBinding:current.requestedModelBinding,
    sourcePublicManifestSha256:source.publicManifestSha256,requestedPublicManifestSha256:target.publicManifestSha256,
    sourceImplementationClosureSha256:source.activeImplementationClosureSha256,
    requestedImplementationClosureSha256:target.implementationClosureSha256,
    sourceDeploymentId:source.deploymentId,requestedAt:current.requestedAt,transitionKind:row.payload.transitionKind};
  return row.payload.transitionKind==='INTEGRATED_RETURN'&&same(current,expected);
}
function phaseOwner(value) {
  exactKeys(value, ['repository','runId','runAttempt','headSha','attemptId'], 'Pre-activation owner');
  const parsed = parseDeploymentIdentity(value.attemptId);
  if (!REPOSITORY_PATTERN.test(value.repository) || !HEAD_PATTERN.test(value.headSha)
    || value.runId !== parsed.runId || value.runAttempt !== parsed.runAttempt
    || ![`pages-${value.runId}-${value.runAttempt}`,`pages-recovery-${value.runId}-${value.runAttempt}`].includes(value.attemptId))
    throw new Error('Pre-activation owner identity is invalid');
  return structuredClone(value);
}
function ownerFromDescriptor(d) {
  return phaseOwner({repository:d.repository,runId:d.runId,runAttempt:d.runAttempt,
    headSha:d.sourceHead,attemptId:d.deploymentId});
}
function validatePhaseSlot(value) {
  exactKeys(value,['originalTarget','target','owner'],'Pre-activation slot');
  const originalTarget=validateProtectedOperationalEvidenceDescriptor(value.originalTarget,{policy:phasePolicy()});
  const target=validateProtectedOperationalEvidenceDescriptor(value.target,{policy:phasePolicy()});
  const owner=phaseOwner(value.owner);
  for(const key of ['repository','sourceHead','datasetId','productionReferenceAt','publicManifestSha256',
    'implementationClosureSha256','modelBindingSha256'])
    if(originalTarget[key]!==target[key]) throw new Error('Pre-activation target generation changed');
  if(owner.repository!==target.repository || owner.headSha!==target.sourceHead)
    throw new Error('Pre-activation owner source changed');
  return {originalTarget,target,owner};
}
function requireTerminalOwner(attempt,owner) {
  phaseOwner(owner);
  if(!isObject(attempt) || attempt.id!==owner.runId || attempt.run_attempt!==owner.runAttempt
    || attempt.head_sha!==owner.headSha || attempt.head_branch!=='main'
    || attempt.repository?.full_name!==owner.repository || attempt.status!=='completed'
    || !['success','failure','cancelled','timed_out','action_required','neutral','skipped','stale'].includes(attempt.conclusion))
    throw new Error('Pre-activation writer is active, unknown or not the exact terminal owner');
}
async function phaseFiles(storage,descriptor) {
  return decodeArchive(await storage.download(descriptor.objectPath),descriptor,phasePolicy());
}
const phaseJson=(files,name)=>JSON.parse(Buffer.from(files.find(f=>f.path===name).contentBase64,'base64'));
function assertPhaseCheckpoint(files,phase) {
  const d=phaseJson(files,'checkpoint-disposition.json'),audit=phaseJson(files,'checkpoint-runtime-audit.json');
  exactKeys(d,['bindingSha256','checkpointRequired','datasetId','disposition','privatePayloadIncluded',
    'rollbackActivationReady','rollbackStatus','runtimeAuditSha256','schemaVersion','sourceHead'],'Phase checkpoint disposition');
  const manifest=phaseJson(files,'manifest.json'),{bindingSha256,...bound}=d;
  if(d.schemaVersion!=='ravscore-continuation-checkpoint-disposition-v1'
    ||d.sourceHead!==phase.sourceHead||d.datasetId!==manifest.datasetId||d.datasetId!==audit.datasetId
    ||d.privatePayloadIncluded!==false||bindingSha256!==sha256CanonicalJson(bound)
    ||d.runtimeAuditSha256!==sha256CanonicalJson(audit))throw new Error('Pre-activation checkpoint binding differs');
  exactKeys(phase.checkpointOutcomes,['build','save','publish'],'Pre-activation checkpoint outcomes');
  const measured=d.disposition==='NOT_APPLICABLE_DURING_MEASURED_WARMUP';
  if(!['READY_PUBLISHED','MEASURED_WARMUP_PUBLISHED','NOT_APPLICABLE_DURING_MEASURED_WARMUP'].includes(d.disposition)
    ||d.rollbackActivationReady!==(d.disposition==='READY_PUBLISHED')
    ||d.rollbackStatus!==(d.disposition==='READY_PUBLISHED'?'READY':'BUILDING_MEASURED_ONLY')
    ||d.checkpointRequired!==!measured
    ||Object.values(phase.checkpointOutcomes).some(v=>v!==(measured?'skipped':'success')))
    throw new Error('Pre-activation checkpoint outcome differs');
  return d;
}
function phaseTargetCompleted(current,d) {
  return current.pending===false && current.model==='integrated'
    && current.sourceHead===d.sourceHead && current.datasetId===d.datasetId
    && current.productionReferenceAt===d.productionReferenceAt
    && current.publicManifestSha256===d.publicManifestSha256
    && current.activeImplementationClosureSha256===d.implementationClosureSha256
    && sha256CanonicalJson(current.modelBinding)===d.modelBindingSha256;
}
async function phaseCurrent(request) {
  const {resolveOperationalRavScoreModel,operationalResolvedBindingCurrent,
    RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY:operationalKey,
    RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY:profileKey}=await import('./ravscore-operational-activation.mjs');
  const rows=await requestDocument(request,
    '?select=document_key,payload,version&document_key=in.('+operationalKey+','+profileKey+')',{},'pre-activation current/profile read');
  if(!Array.isArray(rows)||rows.length!==2) throw new Error('Pre-activation central rows missing');
  const byKey=new Map();
  for(const row of rows){
    if(![operationalKey,profileKey].includes(row?.document_key)||byKey.has(row.document_key)
      ||!Number.isSafeInteger(Number(row.version))||Number(row.version)<1) throw new Error('Pre-activation central rows ambiguous');
    byKey.set(row.document_key,row);
  }
  const current=resolveOperationalRavScoreModel(byKey.get(operationalKey),{profileRow:byKey.get(profileKey),allowPending:true});
  const value={...current,bindingCurrent:operationalResolvedBindingCurrent(current)};
  phaseDocumentRows.set(value,{operational:byKey.get(operationalKey),profile:byKey.get(profileKey)});
  return value;
}
async function phaseCas(request,existing,pointer) {
  const policy=PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY,expected=existing.version+1;
  try {
    const rows=await requestDocument(request,'?document_key=eq.'+encodeURIComponent(policy.documentKey)
      +'&version=eq.'+existing.version+'&select=document_key,payload,version',
      {method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({payload:pointer,updated_by:null})},'pre-activation compare-and-swap');
    if(!Array.isArray(rows)||rows.length!==1||Number(rows[0].version)!==expected) throw new Error('Pre-activation CAS lost');
    const row=await readPointer(request,{allowMissing:false,policy});
    if(row.version!==expected||!same(row.payload,pointer)) throw new Error('Pre-activation readback differs');
    return row;
  } catch(first) {
    try { const row=await readPointer(request,{allowMissing:false,policy});
      if(row.version===expected&&same(row.payload,pointer)) return row; } catch {}
    throw first; // never retry an ambiguous write, including falsy first causes
  }
}
export async function inspectProtectedPreActivationTarget({request,storage,repository}={}) {
  if(!REPOSITORY_PATTERN.test(repository??'')) throw new Error('Pre-activation repository invalid');
  const row=await readPointer(request,{allowMissing:true,policy:PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY});
  if(!row?.payload.preActivation) return {action:'NONE',privatePayloadIncluded:false};
  const slot=validatePhaseSlot(row.payload.preActivation);
  if(slot.target.repository!==repository) throw new Error('Pre-activation repository differs');
  const files=await phaseFiles(storage,slot.target);
  return {action:'PRE_ACTIVATION_PRESENT',centralVersion:row.version,slot,
    phase:phaseJson(files,'pre-activation.json'),privatePayloadIncluded:false};
}
export function classifyProtectedPreActivationReentry({evidence,current,attempt,repository,sourceHead}={}) {
  if(evidence?.action==='NONE') return 'NONE';
  if(evidence?.action!=='PRE_ACTIVATION_PRESENT') throw new Error('Unknown pre-activation evidence');
  const slot=validatePhaseSlot(evidence.slot),d=slot.target,phase=evidence.phase;
  if(d.repository!==repository||d.sourceHead!==sourceHead
    ||phase.sourceCurrentSha256!==sha256CanonicalJson(phase.sourceCurrent)) throw new Error('Pre-activation source identity changed');
  // Pending recovery keeps its original full handoff and normal terminal checks.
  if(current.pending===true) {
    if(current.sourceHead!==d.sourceHead || current.requestedPublicManifestSha256!==d.publicManifestSha256
      || current.requestedImplementationClosureSha256!==d.implementationClosureSha256
      || sha256CanonicalJson(current.requestedModelBinding)!==d.modelBindingSha256
      || current.sourcePublicManifestSha256!==phase.sourceCurrent.publicManifestSha256
      || !same(current.sourceModelBinding,phase.sourceCurrent.modelBinding))
      throw new Error('Pre-activation pending transition differs');
    return 'PENDING_PRE_ACTIVATION';
  }
  requireTerminalOwner(attempt,slot.owner);
  if(phaseTargetCompleted(current,d)) return 'COMPLETED_PRE_ACTIVATION';
  if(!phaseSourceMatches(current,phase,d)||current.pending!==false) throw new Error('Pre-activation source state changed');
  return 'PRE_ACTIVATION_RESUME';
}
export async function classifyProtectedPreActivationCurrent({request,storage,repository,sourceHead,attempt}={}) {
  const evidence=await inspectProtectedPreActivationTarget({request,storage,repository});
  if(evidence.action==='NONE')return {action:'NONE'};
  return {action:classifyProtectedPreActivationReentry({evidence,current:await phaseCurrent(request),attempt,repository,sourceHead})};
}
export async function publishProtectedPreActivationTarget({directory,deploymentId,repository,request,storage}={}) {
  const policy=PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY;
  const built=await buildProtectedOperationalEvidenceArchive({directory,deploymentId,repository,policy:phasePolicy()});
  const files=await decodeArchive(built.archive,built.descriptor,phasePolicy());
  const phase=phaseJson(files,'pre-activation.json'),current=await phaseCurrent(request);
  if(!phaseSourceMatches(current,phase,built.descriptor)||current.pending) throw new Error('Pre-activation source changed before publication');
  const existing=await readPointer(request,{allowMissing:false,policy});
  const active=descriptors(existing.payload).find(d=>d.deploymentId===current.deploymentId);
  if(!active||active.repository!==repository||active.publicManifestSha256!==current.publicManifestSha256
    ||active.implementationClosureSha256!==current.activeImplementationClosureSha256
    ||active.modelBindingSha256!==sha256CanonicalJson(current.modelBinding)) throw new Error('Exact active source evidence missing');
  await verifyObject(storage,active,policy);
  const owner=ownerFromDescriptor(built.descriptor),old=existing.payload.preActivation;
  if(old) {
    validatePhaseSlot(old);
    if(!same(old.owner,owner)) throw new Error('Pre-activation caller does not own the slot');
    if(old.target.deploymentId===deploymentId) {
      if(!same(old.target,built.descriptor)) throw new Error('One deploymentId has changed target bytes');
      await verifyObject(storage,built.descriptor,phasePolicy());
      return {published:false,centralVersion:existing.version,slot:old};
    }
    const original=await phaseFiles(storage,old.originalTarget);
    // A new attempt may have a new genuine seal, never different target content.
    if(!same(original.filter(f=>f.path!=='pages-artifact-seal.json'),files.filter(f=>f.path!=='pages-artifact-seal.json')))
      throw new Error('Recovery attempted to substitute target bytes');
  }
  const slot=validatePhaseSlot({originalTarget:old?.originalTarget??built.descriptor,target:built.descriptor,owner});
  await storage.ensurePrivateBucket();
  const upload=await storage.uploadImmutable(built.descriptor.objectPath,built.archive);
  await verifyObject(storage,built.descriptor,phasePolicy());
  let row;
  try {row=await phaseCas(request,existing,{...existing.payload,schemaVersion:'2.0.0',preActivation:slot});}
  catch(first){if(upload?.created===true){try{await removeCreatedEvidenceIfUnreferenced({request,storage,objectPath:built.descriptor.objectPath,policy});}catch{}}throw first;}
  return {published:true,centralVersion:row.version,slot};
}
export async function claimProtectedPreActivationTarget({request,storage,repository,sourceHead,owner,attempt}={}) {
  phaseOwner(owner);
  if(owner.attemptId!==`pages-recovery-${owner.runId}-${owner.runAttempt}`)throw new Error('Recovery requires its fixed distinct attempt identity');
  if(owner.repository!==repository||owner.headSha!==sourceHead) throw new Error('Recovery owner source differs');
  const policy=PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY;
  const existing=await readPointer(request,{allowMissing:false,policy});
  const evidence=await inspectProtectedPreActivationTarget({request,storage,repository});
  if(evidence.centralVersion!==existing.version||!same(evidence.slot,existing.payload.preActivation)) throw new Error('Recovery phase raced');
  if(same(owner,evidence.slot.owner)) throw new Error('A live owner is not a terminal takeover');
  const current=await phaseCurrent(request);
  if(classifyProtectedPreActivationReentry({evidence,current,attempt,repository,sourceHead})!=='PRE_ACTIVATION_RESUME')
    throw new Error('Recovery requires a terminal pre-activation source');
  const {classifyProductionTargetFreshness}=await import('./check-production-target-freshness.mjs');
  classifyProductionTargetFreshness({target:evidence.slot.target.productionReferenceAt,maximumAgeMinutes:150});
  const slot={...evidence.slot,owner};
  const written=await phaseCas(request,existing,{...existing.payload,preActivation:slot});
  return {claimed:true,centralVersion:written.version,slot};
}
export async function restoreProtectedPreActivationTarget({directory,request,storage,repository,owner}={}) {
  const evidence=await inspectProtectedPreActivationTarget({request,storage,repository});
  if(evidence.action==='NONE'||!same(evidence.slot.owner,phaseOwner(owner))) throw new Error('Recovery restore requires actual owner');
  const files=await phaseFiles(storage,evidence.slot.target),destination=path.resolve(directory);
  try {await fs.lstat(destination);throw new Error('Pre-activation restore destination exists');}
  catch(error){if(error?.code!=='ENOENT')throw error;}
  const stage=destination+'.stage-'+process.pid+'-'+crypto.randomBytes(5).toString('hex');
  try {await fs.mkdir(stage,{recursive:true,mode:0o700});
    for(const file of files)await fs.writeFile(path.join(stage,file.path),Buffer.from(file.contentBase64,'base64'),{flag:'wx',mode:0o600});
    const fresh=await inspectProtectedPreActivationTarget({request,storage,repository});
    if(!same(fresh.slot,evidence.slot))throw new Error('Pre-activation owner changed before restore');
    await fs.rename(stage,destination);
  }catch(first){await fs.rm(stage,{recursive:true,force:true}).catch(()=>{});throw first;}
  return {restored:true,slot:evidence.slot,privatePayloadIncluded:false};
}
export async function prepareProtectedPreActivationHandoff({directory,request,storage,repository,owner,readiness,plan}={}) {
  const evidence=await inspectProtectedPreActivationTarget({request,storage,repository});
  if(evidence.action==='NONE'||!same(evidence.slot.owner,phaseOwner(owner)))throw new Error('Handoff requires current recovery owner');
  const files=await collectFiles(directory,phasePolicy());
  const descriptor=descriptorFromFiles(files,{deploymentId:owner.attemptId,repository,policy:phasePolicy()});
  const sealed=await phaseFiles(storage,evidence.slot.target);
  if(!same(files,sealed)||descriptor.deploymentId!==evidence.slot.target.deploymentId)
    throw new Error('Recovery handoff does not use the newly sealed exact target');
  const phase=phaseJson(files,'pre-activation.json'),manifest=phaseJson(files,'manifest.json');
  const current=await phaseCurrent(request);
  if(!phaseSourceMatches(current,phase,evidence.slot.target)||current.pending)throw new Error('Recovery source changed before handoff');
  const {assertIntegratedHistoricalMaintenancePlan}=await import('./ravscore-operational-activation.mjs');
  assertIntegratedHistoricalMaintenancePlan(plan,{expectedSourceHead:owner.headSha,
    currentRow:phaseDocumentRows.get(current).operational,currentProfileRow:phaseDocumentRows.get(current).profile,
    expectedCentralVersion:current.centralVersion,publicManifest:manifest,
    publicAudit:phaseJson(files,'public-audit.json'),readiness});
  if(!same(plan.sourceModelBinding,current.modelBinding)
    ||plan.sourceImplementationClosureSha256!==current.activeImplementationClosureSha256
    ||plan.requestedImplementationClosureSha256!==evidence.slot.target.implementationClosureSha256
    ||plan.integratedManifestSha256!==evidence.slot.target.publicManifestSha256
    ||sha256CanonicalJson(plan.activeModelBinding)!==evidence.slot.target.modelBindingSha256)
    throw new Error('Recovery plan endpoint differs');
  const d=assertPhaseCheckpoint(files,phase),o=phase.checkpointOutcomes;
  const handoff={schemaVersion:'ravscore-operational-deploy-handoff-v2',action:'integrated-historical-maintenance',
    sourceHead:owner.headSha,centralVersion:current.centralVersion,legacySourceRequired:false,
    checkpointDisposition:d.disposition,checkpointDispositionSha256:d.bindingSha256,checkpointDatasetId:d.datasetId,
    checkpointRuntimeAuditSha256:d.runtimeAuditSha256,checkpointBuildOutcome:o.build,checkpointSaveOutcome:o.save,
    checkpointPublishOutcome:o.publish,privatePayloadIncluded:false};
  for(const [name,value] of [['integrated-readiness.json',readiness],['plan.json',plan],['handoff.json',handoff]])
    await fs.writeFile(path.join(directory,name),JSON.stringify(value),{flag:'wx',mode:0o600});
  await fs.unlink(path.join(directory,'pre-activation.json'));
  // Validate the resulting ordinary archive, rather than marking a target-only
  // package complete. A late error retains the remote phase for the next owner.
  await buildProtectedOperationalEvidenceArchive({directory,deploymentId:owner.attemptId,repository});
  return {prepared:true,handoff,activeDeploymentId:current.deploymentId,
    implementationClosureSha256:evidence.slot.target.implementationClosureSha256};
}
export async function clearProtectedPreActivationTarget({request,storage,repository,sourceHead,baseUrl,fetchImpl=fetch}={}) {
  const policy=PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY;
  const row=await readPointer(request,{allowMissing:true,policy});
  if(!row?.payload.preActivation)return {cleared:false,reason:'no-pre-activation'};
  const slot=validatePhaseSlot(row.payload.preActivation),d=slot.target;
  if(d.repository!==repository||d.sourceHead!==sourceHead)throw new Error('Pre-activation completion source differs');
  const current=await phaseCurrent(request);
  if(!phaseTargetCompleted(current,d))throw new Error('Pre-activation target is not actually active');
  const files=await phaseFiles(storage,d);
  const {verifyRavScoreOperationalPagesDeployment}=await import('./verify-ravscore-operational-pages-deployment.mjs');
  const verification=await verifyRavScoreOperationalPagesDeployment({baseUrl,sourceHead,expectedModel:'integrated',fetchImpl,
      expectedManifest:phaseJson(files,'manifest.json'),expectedBinding:phaseJson(files,'target-binding.json'),
      expectedContractText:Buffer.from(files.find(f=>f.path==='target-contract.js').contentBase64,'base64').toString('utf8'),
      expectedBundleText:Buffer.from(files.find(f=>f.path==='target-bundle.generated.js').contentBase64,'base64').toString('utf8'),
      expectedPublicClosure:phaseJson(files,'target-public-closure.json'),observationNonce:'pre-activation-complete-'+crypto.randomBytes(12).toString('hex')});
  if(verification?.schemaVersion!=='ravscore-operational-pages-verification-v1'||verification.status!=='passed'
    ||verification.sourceHead!==d.sourceHead||verification.publicManifestSha256!==d.publicManifestSha256
    ||verification.implementationClosureSha256!==d.implementationClosureSha256||verification.datasetId!==d.datasetId
    ||verification.productionReferenceAt!==d.productionReferenceAt||verification.zoneCount!==210||verification.coastalPartCount!==673
    ||verification.privatePayloadRead!==false||sha256CanonicalJson(verification.modelBinding)!==d.modelBindingSha256)
    throw new Error('Pre-activation full public verification differs');
  if(!same(current,await phaseCurrent(request)))throw new Error('Pre-activation central completion changed during verification');
  const fresh=await readPointer(request,{allowMissing:false,policy});
  if(fresh.version!==row.version||!same(fresh.payload,row.payload))throw new Error('Pre-activation slot changed before clear');
  // The verified phase is finished. Restore the exact original four-field
  // pointer schema so existing rollback/source readers remain admissible.
  // No descriptor, archive, original pin or completed target is rewritten.
  const clearedPointer = validateProtectedOperationalEvidencePointer({
    schemaVersion: policy.schemaVersion, kind: row.payload.kind,
    current: row.payload.current, previous: row.payload.previous,
  }, {policy});
  await phaseCas(request,row,clearedPointer);
  // Preserve all immutable phase archives for lineage; no cleanup is proof.
  return {cleared:true,privatePayloadIncluded:false};
}


function parseArgs(argv) {
  const result = { mode: null, requireRetained: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (['--publish', '--restore', '--publish-pre-activation', '--inspect-pre-activation', '--classify-pre-activation', '--claim-pre-activation', '--restore-pre-activation', '--prepare-pre-activation-handoff', '--clear-pre-activation', '--assert-pre-activation-owner'].includes(argument)) {
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
    else if (['--attempt','--readiness','--plan','--base-url'].includes(argument)) result[argument.slice(2)] = value;
    else throw new Error(`Unknown operational evidence argument: ${argument}`);
  }
  if (!result.mode || (!['inspect-pre-activation','classify-pre-activation','claim-pre-activation','clear-pre-activation','assert-pre-activation-owner'].includes(result.mode) && !result.directory) || !result.output) {
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
  const own = () => phaseOwner({repository:process.env.GITHUB_REPOSITORY,runId:Number(process.env.GITHUB_RUN_ID),
    runAttempt:Number(process.env.GITHUB_RUN_ATTEMPT),headSha:process.env.GITHUB_SHA,
    attemptId:options.deploymentId??('pages-recovery-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT)});
  const common={request:clients.documentRequest,storage:clients.storage,repository:options.repository};
  const read=async name=>JSON.parse(await fs.readFile(options[name],'utf8'));
  let result;
  if(options.mode==='publish-pre-activation'){
    const owner=own();if(owner.repository!==options.repository||owner.attemptId!==options.deploymentId)throw new Error('Phase CLI owner mismatch');
    result=await publishProtectedPreActivationTarget({...common,directory:options.directory,deploymentId:options.deploymentId});
  }else if(options.mode==='inspect-pre-activation')result=await inspectProtectedPreActivationTarget(common);
  else if(options.mode==='classify-pre-activation')result=await classifyProtectedPreActivationCurrent({...common,
    sourceHead:process.env.GITHUB_SHA,attempt:await read('attempt')});
  else if(options.mode==='claim-pre-activation')result=await claimProtectedPreActivationTarget({...common,
    sourceHead:process.env.GITHUB_SHA,owner:own(),attempt:await read('attempt')});
  else if(options.mode==='restore-pre-activation')result=await restoreProtectedPreActivationTarget({...common,directory:options.directory,owner:own()});
  else if(options.mode==='prepare-pre-activation-handoff')result=await prepareProtectedPreActivationHandoff({...common,
    directory:options.directory,owner:own(),readiness:await read('readiness'),plan:await read('plan')});
  else if(options.mode==='clear-pre-activation')result=await clearProtectedPreActivationTarget({...common,
    sourceHead:process.env.GITHUB_SHA,baseUrl:options['base-url']});
  else if(options.mode==='assert-pre-activation-owner'){
    const state=await inspectProtectedPreActivationTarget(common),current=await phaseCurrent(clients.documentRequest);
    if(state.action==='NONE'||!same(state.slot.owner,own())||!phaseSourceMatches(current,state.phase,state.slot.target))throw new Error('Phase owner/source changed before Edge write');
    result={owned:true,privatePayloadIncluded:false};
  }
  else result = options.mode === 'publish'
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
      deploymentId: options.deploymentId ?? null,
      publicManifestSha256: options.publicManifestSha256 ?? null,
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
