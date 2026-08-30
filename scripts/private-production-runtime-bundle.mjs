#!/usr/bin/env node
import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import {
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';

export const PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY = Object.freeze({
  schemaVersion: '1.0.0',
  kind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_BUNDLE',
  privacyClass: 'PRIVATE_PRODUCTION_RUNTIME',
  expectedZoneCount: 210,
  expectedPartCount: 673,
  manifestName: 'manifest.json',
  payloadDirectoryName: 'payload',
  maximumFutureSkewMs: 5 * 60 * 1000,
  requiredContractHashKeys: Object.freeze([
    'continuationStateContractSha256',
    'fullRuntimeContractSha256',
    'publicProjectionContractSha256',
  ]),
});

export const PRIVATE_RUNTIME_REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const MANIFEST_KEYS = Object.freeze([
  'schemaVersion',
  'kind',
  'privacyClass',
  'datasetId',
  'productionReferenceAt',
  'generatedAt',
  'generationId',
  'zoneCount',
  'partCount',
  'modelBinding',
  'contractHashes',
  'fileCount',
  'files',
  'bundleContentSha256',
]);
const FILE_KEYS = Object.freeze([
  'id',
  'relativePath',
  'bytes',
  'sha256',
  'privacyClass',
]);
const METADATA_KEYS = Object.freeze([
  'datasetId',
  'productionReferenceAt',
  'generatedAt',
  'generationId',
  'zoneCount',
  'partCount',
  'modelBinding',
  'contractHashes',
  'privacyClass',
]);
const SOURCE_FILE_KEYS = Object.freeze([
  'id',
  'sourcePath',
  'relativePath',
  'privacyClass',
]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const DATASET_ID_PATTERN = /^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const GENERATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const FILE_ID_PATTERN = /^[a-z][a-z0-9._-]{0,63}$/;
const CONTRACT_HASH_KEY_PATTERN = /^[a-z][A-Za-z0-9]{0,63}Sha256$/;

const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
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

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(item => canonicalValue(item));
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort(compareText).map(key => [
    key,
    canonicalValue(value[key]),
  ]));
}

export function canonicalPrivateRuntimeJson(value) {
  return JSON.stringify(canonicalValue(value));
}

const sha256Buffer = value => crypto.createHash('sha256').update(value).digest('hex');

function manifestBody(manifest) {
  const { bundleContentSha256: _ignored, ...body } = manifest;
  return body;
}

export function privateRuntimeBundleContentSha256(manifest) {
  return sha256Buffer(Buffer.from(canonicalPrivateRuntimeJson(manifestBody(manifest)), 'utf8'));
}

function canonicalTime(value, label) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} is not a valid time`);
  }
  const canonical = new Date(value).toISOString();
  if (canonical !== value) throw new Error(`${label} is not canonical UTC`);
  return canonical;
}

function isWithin(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!path.isAbsolute(relative)
    && relative !== '..'
    && !relative.startsWith(`..${path.sep}`));
}

async function realDirectory(directory, label) {
  const resolved = path.resolve(directory);
  const details = await fs.lstat(resolved).catch(error => {
    if (error?.code === 'ENOENT') throw new Error(`${label} does not exist`);
    throw error;
  });
  if (!details.isDirectory() || details.isSymbolicLink()) {
    throw new Error(`${label} must be a real directory`);
  }
  const real = await fs.realpath(resolved);
  return real;
}

async function privatePathContext({ privateRoot, candidatePath, repositoryRoot, label }) {
  const requestedPrivateRoot = path.resolve(privateRoot);
  const realPrivateRoot = await realDirectory(privateRoot, 'Private runtime root');
  const realRepositoryRoot = await realDirectory(repositoryRoot, 'Repository root');
  if (isWithin(realRepositoryRoot, realPrivateRoot)
    || isWithin(realPrivateRoot, realRepositoryRoot)) {
    throw new Error('Private runtime root must be outside the repository and its web tree');
  }
  const requestedCandidate = path.resolve(candidatePath);
  const relative = isWithin(requestedPrivateRoot, requestedCandidate)
    ? path.relative(requestedPrivateRoot, requestedCandidate)
    : isWithin(realPrivateRoot, requestedCandidate)
      ? path.relative(realPrivateRoot, requestedCandidate)
      : null;
  if (relative === null || relative === '') {
    throw new Error(`${label} must be a strict descendant of the private runtime root`);
  }
  const resolvedCandidate = path.resolve(realPrivateRoot, relative);
  return { realPrivateRoot, realRepositoryRoot, resolvedCandidate };
}

async function ensureSafeParent(candidatePath, realPrivateRoot) {
  const parent = path.dirname(candidatePath);
  await fs.mkdir(parent, { recursive: true, mode: 0o700 });
  const realParent = await fs.realpath(parent);
  if (!isWithin(realPrivateRoot, realParent)) {
    throw new Error('Private runtime path escapes through a symlinked parent');
  }
  return realParent;
}

function safeRelativePath(value, label) {
  if (typeof value !== 'string'
    || !value
    || value.includes('\\')
    || value.includes('\0')
    || path.posix.isAbsolute(value)
    || path.win32.isAbsolute(value)
    || path.posix.normalize(value) !== value
    || value.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error(`${label} is not a safe relative path`);
  }
  if (value === PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.manifestName) {
    throw new Error(`${label} conflicts with the private manifest`);
  }
  return value;
}

function privateFilesystemPath(root, relativePath) {
  return path.join(root, ...relativePath.split('/'));
}

function canonicalContractHashes(value, label = 'Private runtime contract hashes') {
  if (!isPlainObject(value)) throw new Error(`${label} must be an object`);
  const keys = Object.keys(value).sort(compareText);
  if (keys.length > 16
    || !PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.requiredContractHashKeys
      .every(key => keys.includes(key))) {
    throw new Error(`${label} does not contain every required contract`);
  }
  for (const key of keys) {
    if (!CONTRACT_HASH_KEY_PATTERN.test(key) || !SHA256_PATTERN.test(String(value[key] ?? ''))) {
      throw new Error(`${label} contains an invalid contract digest`);
    }
  }
  return Object.fromEntries(keys.map(key => [key, value[key]]));
}

function canonicalModelBinding(value, label = 'Private runtime model binding') {
  const expected = ravScoreModelBinding();
  exactKeys(value, Object.keys(expected), label);
  assertRavScoreModelBinding(value, label);
  return { ...expected };
}

function validateMetadata(metadata, { exact = true } = {}) {
  if (!isPlainObject(metadata)) throw new Error('Private runtime metadata must be an object');
  if (exact) exactKeys(metadata, METADATA_KEYS, 'Private runtime metadata');
  if (!DATASET_ID_PATTERN.test(String(metadata.datasetId ?? ''))) {
    throw new Error('Private runtime dataset identity is invalid');
  }
  if (!GENERATION_ID_PATTERN.test(String(metadata.generationId ?? ''))) {
    throw new Error('Private runtime generation identity is invalid');
  }
  if (metadata.zoneCount !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedZoneCount
    || metadata.partCount !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedPartCount) {
    throw new Error('Private runtime coverage must be exactly 210 zones and 673 parts');
  }
  if (metadata.privacyClass !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass) {
    throw new Error('Private runtime privacy class is invalid');
  }
  return {
    datasetId: metadata.datasetId,
    productionReferenceAt: canonicalTime(
      metadata.productionReferenceAt,
      'Private runtime production reference',
    ),
    generatedAt: canonicalTime(metadata.generatedAt, 'Private runtime generation time'),
    generationId: metadata.generationId,
    zoneCount: metadata.zoneCount,
    partCount: metadata.partCount,
    modelBinding: canonicalModelBinding(metadata.modelBinding),
    contractHashes: canonicalContractHashes(metadata.contractHashes),
    privacyClass: metadata.privacyClass,
  };
}

function validateSourceSpecs(files) {
  if (!Array.isArray(files) || files.length < 1 || files.length > 32) {
    throw new Error('Private runtime bundle requires between 1 and 32 files');
  }
  const ids = new Set();
  const paths = new Set();
  return files.map((file, index) => {
    if (!isPlainObject(file)) throw new Error(`Private runtime source ${index} is invalid`);
    exactKeys(file, SOURCE_FILE_KEYS, `Private runtime source ${index}`);
    if (!FILE_ID_PATTERN.test(String(file.id ?? ''))) {
      throw new Error(`Private runtime source ${index} has an invalid id`);
    }
    const relativePath = safeRelativePath(
      file.relativePath,
      `Private runtime source path for ${file.id}`,
    );
    const normalizedPath = process.platform === 'win32'
      ? relativePath.toLowerCase()
      : relativePath;
    if (ids.has(file.id) || paths.has(normalizedPath)) {
      throw new Error('Private runtime source ids and paths must be unique');
    }
    ids.add(file.id);
    paths.add(normalizedPath);
    if (file.privacyClass !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass) {
      throw new Error(`Private runtime source ${file.id} has an invalid privacy class`);
    }
    if (typeof file.sourcePath !== 'string' || !file.sourcePath) {
      throw new Error(`Private runtime source ${file.id} has no source path`);
    }
    return {
      id: file.id,
      sourcePath: path.resolve(file.sourcePath),
      relativePath,
      privacyClass: file.privacyClass,
    };
  }).sort((left, right) => compareText(left.id, right.id));
}

async function copyAndDigest(sourcePath, destinationPath) {
  const before = await fs.lstat(sourcePath).catch(error => {
    if (error?.code === 'ENOENT') throw new Error('Private runtime source file is missing');
    throw error;
  });
  if (!before.isFile() || before.isSymbolicLink()) {
    throw new Error('Private runtime source must be a real regular file');
  }
  await fs.mkdir(path.dirname(destinationPath), { recursive: true, mode: 0o700 });
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      bytes += chunk.length;
      callback(null, chunk);
    },
  });
  try {
    await pipeline(
      fsSync.createReadStream(sourcePath),
      meter,
      fsSync.createWriteStream(destinationPath, { flags: 'wx', mode: 0o600 }),
    );
  } catch (error) {
    await fs.rm(destinationPath, { force: true }).catch(() => {});
    throw error;
  }
  const after = await fs.lstat(sourcePath);
  if (!after.isFile()
    || after.isSymbolicLink()
    || before.size !== after.size
    || before.mtimeMs !== after.mtimeMs) {
    await fs.rm(destinationPath, { force: true }).catch(() => {});
    throw new Error('Private runtime source changed while it was bundled');
  }
  return { bytes, sha256: hash.digest('hex') };
}

async function digestFile(filePath) {
  const before = await fs.lstat(filePath).catch(error => {
    if (error?.code === 'ENOENT') throw new Error('Private runtime payload file is missing');
    throw error;
  });
  if (!before.isFile() || before.isSymbolicLink()) {
    throw new Error('Private runtime payload must be a real regular file');
  }
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  const stream = fsSync.createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk);
    bytes += chunk.length;
  }
  const after = await fs.lstat(filePath);
  if (!after.isFile()
    || after.isSymbolicLink()
    || before.size !== after.size
    || before.mtimeMs !== after.mtimeMs) {
    throw new Error('Private runtime payload changed while it was verified');
  }
  return { bytes, sha256: hash.digest('hex') };
}

async function walkPayload(directory, relative = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(error => {
    if (error?.code === 'ENOENT') throw new Error('Private runtime payload directory is missing');
    throw error;
  });
  const files = [];
  const directories = [];
  for (const entry of entries.sort((left, right) => compareText(left.name, right.name))) {
    const nested = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error('Private runtime payload cannot contain symlinks');
    if (entry.isDirectory()) {
      directories.push(nested);
      const children = await walkPayload(path.join(directory, entry.name), nested);
      files.push(...children.files);
      directories.push(...children.directories);
    } else if (entry.isFile()) {
      files.push(nested);
    } else {
      throw new Error('Private runtime payload can contain only regular files');
    }
  }
  return { files, directories };
}

function expectedPayloadDirectories(files) {
  const directories = new Set();
  for (const file of files) {
    const parts = file.relativePath.split('/');
    for (let index = 1; index < parts.length; index += 1) {
      directories.add(parts.slice(0, index).join('/'));
    }
  }
  return [...directories].sort(compareText);
}

function validateManifestShape(manifest) {
  exactKeys(manifest, MANIFEST_KEYS, 'Private runtime bundle manifest');
  if (manifest.schemaVersion !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.schemaVersion
    || manifest.kind !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.kind
    || manifest.privacyClass !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass) {
    throw new Error('Private runtime bundle identity is incompatible');
  }
  const metadata = validateMetadata(manifest, { exact: false });
  if (!Array.isArray(manifest.files)
    || manifest.files.length < 1
    || manifest.files.length > 32
    || manifest.fileCount !== manifest.files.length) {
    throw new Error('Private runtime file inventory is invalid');
  }
  const ids = new Set();
  const paths = new Set();
  const files = manifest.files.map((file, index) => {
    exactKeys(file, FILE_KEYS, `Private runtime file descriptor ${index}`);
    if (!FILE_ID_PATTERN.test(String(file.id ?? ''))
      || !Number.isSafeInteger(file.bytes)
      || file.bytes < 0
      || !SHA256_PATTERN.test(String(file.sha256 ?? ''))
      || file.privacyClass !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass) {
      throw new Error(`Private runtime file descriptor ${index} is invalid`);
    }
    const relativePath = safeRelativePath(
      file.relativePath,
      `Private runtime file path for ${file.id}`,
    );
    const normalizedPath = process.platform === 'win32'
      ? relativePath.toLowerCase()
      : relativePath;
    if (ids.has(file.id) || paths.has(normalizedPath)) {
      throw new Error('Private runtime file ids and paths must be unique');
    }
    ids.add(file.id);
    paths.add(normalizedPath);
    return { ...file, relativePath };
  });
  const sorted = [...files].sort((left, right) => compareText(left.id, right.id));
  if (canonicalPrivateRuntimeJson(files) !== canonicalPrivateRuntimeJson(sorted)) {
    throw new Error('Private runtime file inventory is not canonical');
  }
  if (!SHA256_PATTERN.test(String(manifest.bundleContentSha256 ?? ''))
    || privateRuntimeBundleContentSha256(manifest) !== manifest.bundleContentSha256) {
    throw new Error('Private runtime bundle manifest integrity is invalid');
  }
  return { ...metadata, files, bundleContentSha256: manifest.bundleContentSha256 };
}

function sameCanonical(left, right) {
  return canonicalPrivateRuntimeJson(left) === canonicalPrivateRuntimeJson(right);
}

function validateExpectations(validated, expected = {}) {
  if (!isPlainObject(expected)) throw new Error('Private runtime expectation must be an object');
  if (expected.datasetId !== undefined && validated.datasetId !== expected.datasetId) {
    throw new Error('Private runtime bundle belongs to another dataset');
  }
  if (expected.generationId !== undefined && validated.generationId !== expected.generationId) {
    throw new Error('Private runtime bundle belongs to another generation');
  }
  if (expected.productionReferenceAt !== undefined
    && validated.productionReferenceAt !== canonicalTime(
      expected.productionReferenceAt,
      'Expected private runtime production reference',
    )) {
    throw new Error('Private runtime bundle has another production reference');
  }
  if (expected.generatedAt !== undefined
    && validated.generatedAt !== canonicalTime(
      expected.generatedAt,
      'Expected private runtime generation time',
    )) {
    throw new Error('Private runtime bundle has another generation time');
  }
  if (expected.contractHashes !== undefined) {
    const hashes = canonicalContractHashes(expected.contractHashes, 'Expected contract hashes');
    if (!sameCanonical(validated.contractHashes, hashes)) {
      throw new Error('Private runtime bundle has incompatible contract hashes');
    }
  }
  const expectedBinding = expected.modelBinding === undefined
    ? ravScoreModelBinding()
    : canonicalModelBinding(expected.modelBinding, 'Expected private runtime model binding');
  if (!sameCanonical(validated.modelBinding, expectedBinding)) {
    throw new Error('Private runtime bundle belongs to another RavScore model');
  }
}

async function readAndValidateManifest(bundlePath) {
  const rootEntries = await fs.readdir(bundlePath, { withFileTypes: true }).catch(error => {
    if (error?.code === 'ENOENT') throw new Error('Private runtime bundle is missing');
    throw error;
  });
  const rootNames = rootEntries.map(entry => entry.name).sort(compareText);
  const expectedRootNames = [
    PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.manifestName,
    PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.payloadDirectoryName,
  ].sort(compareText);
  if (JSON.stringify(rootNames) !== JSON.stringify(expectedRootNames)
    || rootEntries.some(entry => entry.isSymbolicLink())
    || !rootEntries.find(entry => entry.name === PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.manifestName)
      ?.isFile()
    || !rootEntries.find(entry => entry.name === PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.payloadDirectoryName)
      ?.isDirectory()) {
    throw new Error('Private runtime bundle directory inventory is invalid');
  }
  const manifestPath = path.join(
    bundlePath,
    PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.manifestName,
  );
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch {
    throw new Error('Private runtime bundle manifest cannot be parsed');
  }
  return { manifest, validated: validateManifestShape(manifest) };
}

export async function createPrivateProductionRuntimeBundle({
  privateRoot,
  bundlePath,
  repositoryRoot = PRIVATE_RUNTIME_REPOSITORY_ROOT,
  metadata,
  files,
} = {}) {
  const context = await privatePathContext({
    privateRoot,
    candidatePath: bundlePath,
    repositoryRoot,
    label: 'Private runtime bundle path',
  });
  const canonicalMetadata = validateMetadata(metadata);
  const sources = validateSourceSpecs(files);
  await ensureSafeParent(context.resolvedCandidate, context.realPrivateRoot);
  try {
    await fs.lstat(context.resolvedCandidate);
    throw new Error('Private runtime bundle destination already exists');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const stage = `${context.resolvedCandidate}.stage-${process.pid}-${crypto.randomBytes(8).toString('hex')}`;
  const payloadRoot = path.join(
    stage,
    PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.payloadDirectoryName,
  );
  try {
    await fs.mkdir(payloadRoot, { recursive: true, mode: 0o700 });
    const descriptors = [];
    for (const source of sources) {
      const destination = privateFilesystemPath(payloadRoot, source.relativePath);
      const digest = await copyAndDigest(source.sourcePath, destination);
      descriptors.push({
        id: source.id,
        relativePath: source.relativePath,
        bytes: digest.bytes,
        sha256: digest.sha256,
        privacyClass: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass,
      });
    }
    const manifest = {
      schemaVersion: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.schemaVersion,
      kind: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.kind,
      privacyClass: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass,
      datasetId: canonicalMetadata.datasetId,
      productionReferenceAt: canonicalMetadata.productionReferenceAt,
      generatedAt: canonicalMetadata.generatedAt,
      generationId: canonicalMetadata.generationId,
      zoneCount: canonicalMetadata.zoneCount,
      partCount: canonicalMetadata.partCount,
      modelBinding: canonicalMetadata.modelBinding,
      contractHashes: canonicalMetadata.contractHashes,
      fileCount: descriptors.length,
      files: descriptors,
      bundleContentSha256: null,
    };
    manifest.bundleContentSha256 = privateRuntimeBundleContentSha256(manifest);
    const manifestText = `${canonicalPrivateRuntimeJson(manifest)}\n`;
    await fs.writeFile(
      path.join(stage, PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.manifestName),
      manifestText,
      { flag: 'wx', mode: 0o600 },
    );
    await fs.rename(stage, context.resolvedCandidate);
    return {
      created: true,
      privacyClass: manifest.privacyClass,
      fileCount: manifest.fileCount,
      zoneCount: manifest.zoneCount,
      partCount: manifest.partCount,
      modelBinding: manifest.modelBinding,
      bundleContentSha256: manifest.bundleContentSha256,
    };
  } catch (error) {
    await fs.rm(stage, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

export async function verifyPrivateProductionRuntimeBundle({
  privateRoot,
  bundlePath,
  repositoryRoot = PRIVATE_RUNTIME_REPOSITORY_ROOT,
  expected = {},
  now = new Date().toISOString(),
} = {}) {
  const context = await privatePathContext({
    privateRoot,
    candidatePath: bundlePath,
    repositoryRoot,
    label: 'Private runtime bundle path',
  });
  const bundleDetails = await fs.lstat(context.resolvedCandidate).catch(error => {
    if (error?.code === 'ENOENT') throw new Error('Private runtime bundle is missing');
    throw error;
  });
  if (!bundleDetails.isDirectory() || bundleDetails.isSymbolicLink()) {
    throw new Error('Private runtime bundle must be a real directory');
  }
  const realBundle = await fs.realpath(context.resolvedCandidate);
  if (!isWithin(context.realPrivateRoot, realBundle)) {
    throw new Error('Private runtime bundle escapes through a symlink');
  }
  const { manifest, validated } = await readAndValidateManifest(realBundle);
  validateExpectations(validated, expected);
  const nowMs = Date.parse(canonicalTime(now, 'Private runtime verification time'));
  if (Date.parse(validated.generatedAt)
    > nowMs + PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.maximumFutureSkewMs) {
    throw new Error('Private runtime bundle generation is from the future');
  }

  const payloadRoot = path.join(
    realBundle,
    PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.payloadDirectoryName,
  );
  const inventory = await walkPayload(payloadRoot);
  const expectedFiles = validated.files.map(file => file.relativePath).sort(compareText);
  const expectedDirectories = expectedPayloadDirectories(validated.files);
  if (JSON.stringify(inventory.files.sort(compareText)) !== JSON.stringify(expectedFiles)
    || JSON.stringify(inventory.directories.sort(compareText))
      !== JSON.stringify(expectedDirectories)) {
    throw new Error('Private runtime payload inventory does not match its manifest');
  }
  for (const descriptor of validated.files) {
    const digest = await digestFile(privateFilesystemPath(payloadRoot, descriptor.relativePath));
    if (digest.bytes !== descriptor.bytes || digest.sha256 !== descriptor.sha256) {
      throw new Error('Private runtime payload integrity is invalid');
    }
  }
  return {
    verified: true,
    privacyClass: validated.privacyClass,
    datasetId: validated.datasetId,
    productionReferenceAt: validated.productionReferenceAt,
    generatedAt: validated.generatedAt,
    generationId: validated.generationId,
    zoneCount: validated.zoneCount,
    partCount: validated.partCount,
    modelBinding: validated.modelBinding,
    contractHashes: validated.contractHashes,
    fileCount: validated.files.length,
    files: validated.files,
    bundleContentSha256: validated.bundleContentSha256,
    manifest,
    bundlePath: realBundle,
  };
}

function validateRestoreTimes(verified, {
  targetReferenceAt,
  minimumReferenceAt,
  minimumGeneratedAt,
  now,
}) {
  const target = canonicalTime(targetReferenceAt, 'Private runtime restore target reference');
  const minimum = canonicalTime(minimumReferenceAt, 'Private runtime minimum reference');
  const currentTime = canonicalTime(now, 'Private runtime restore time');
  if (Date.parse(minimum) > Date.parse(target)) {
    throw new Error('Private runtime restore bounds are inverted');
  }
  if (Date.parse(verified.productionReferenceAt) > Date.parse(target)) {
    throw new Error('Private runtime bundle is from the future relative to its restore target');
  }
  if (Date.parse(verified.productionReferenceAt) < Date.parse(minimum)) {
    throw new Error('Private runtime bundle would regress the production reference');
  }
  if (Date.parse(verified.generatedAt)
    > Date.parse(currentTime) + PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.maximumFutureSkewMs) {
    throw new Error('Private runtime bundle generation is from the future');
  }
  if (minimumGeneratedAt !== undefined
    && Date.parse(verified.generatedAt) < Date.parse(canonicalTime(
      minimumGeneratedAt,
      'Private runtime minimum generation time',
    ))) {
    throw new Error('Private runtime bundle would regress the generation time');
  }
}

export async function restorePrivateProductionRuntimeBundle({
  privateRoot,
  bundlePath,
  outputPath,
  repositoryRoot = PRIVATE_RUNTIME_REPOSITORY_ROOT,
  expected,
  targetReferenceAt,
  minimumReferenceAt,
  minimumGeneratedAt,
  now = new Date().toISOString(),
} = {}) {
  if (!expected?.contractHashes) {
    throw new Error('Private runtime restore requires current expected contract hashes');
  }
  const outputContext = await privatePathContext({
    privateRoot,
    candidatePath: outputPath,
    repositoryRoot,
    label: 'Private runtime restore output',
  });
  await ensureSafeParent(outputContext.resolvedCandidate, outputContext.realPrivateRoot);
  try {
    await fs.lstat(outputContext.resolvedCandidate);
    throw new Error('Private runtime restore output already exists');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const verified = await verifyPrivateProductionRuntimeBundle({
    privateRoot,
    bundlePath,
    repositoryRoot,
    expected,
    now,
  });
  validateRestoreTimes(verified, {
    targetReferenceAt,
    minimumReferenceAt,
    minimumGeneratedAt,
    now,
  });

  const stage = `${outputContext.resolvedCandidate}.stage-${process.pid}-${crypto.randomBytes(8).toString('hex')}`;
  const sourcePayloadRoot = path.join(
    verified.bundlePath,
    PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.payloadDirectoryName,
  );
  try {
    await fs.mkdir(stage, { recursive: true, mode: 0o700 });
    for (const descriptor of verified.files) {
      const source = privateFilesystemPath(sourcePayloadRoot, descriptor.relativePath);
      const destination = privateFilesystemPath(stage, descriptor.relativePath);
      const digest = await copyAndDigest(source, destination);
      if (digest.bytes !== descriptor.bytes || digest.sha256 !== descriptor.sha256) {
        throw new Error('Private runtime payload changed during restore');
      }
    }
    await fs.rename(stage, outputContext.resolvedCandidate);
    return {
      restored: true,
      targetWasAbsent: true,
      atomicDirectoryPublication: true,
      privacyClass: verified.privacyClass,
      fileCount: verified.fileCount,
      zoneCount: verified.zoneCount,
      partCount: verified.partCount,
      modelBinding: verified.modelBinding,
      bundleContentSha256: verified.bundleContentSha256,
    };
  } catch (error) {
    await fs.rm(stage, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

function parseArguments(argv) {
  const [mode, ...rest] = argv;
  if (!['create', 'verify', 'restore'].includes(mode)) {
    throw new Error('Use create, verify or restore');
  }
  const result = { mode };
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    const value = rest[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`);
    if (argument === '--private-root') result.privateRoot = value;
    else if (argument === '--bundle') result.bundlePath = value;
    else if (argument === '--repository-root') result.repositoryRoot = value;
    else if (argument === '--spec') result.specPath = value;
    else if (argument === '--expected') result.expectedPath = value;
    else if (argument === '--output') result.outputPath = value;
    else if (argument === '--now') result.now = value;
    else throw new Error(`Unknown argument: ${argument}`);
    index += 1;
  }
  if (!result.privateRoot || !result.bundlePath) {
    throw new Error('--private-root and --bundle are required');
  }
  return result;
}

async function readJson(file, label) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    throw new Error(`${label} cannot be parsed`);
  }
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  const common = {
    privateRoot: arguments_.privateRoot,
    bundlePath: arguments_.bundlePath,
    repositoryRoot: arguments_.repositoryRoot ?? PRIVATE_RUNTIME_REPOSITORY_ROOT,
  };
  let result;
  if (arguments_.mode === 'create') {
    if (!arguments_.specPath) throw new Error('Create requires --spec');
    const spec = await readJson(arguments_.specPath, 'Private runtime create spec');
    result = await createPrivateProductionRuntimeBundle({ ...spec, ...common });
  } else {
    const expected = arguments_.expectedPath
      ? await readJson(arguments_.expectedPath, 'Private runtime expectation')
      : {};
    if (arguments_.mode === 'verify') {
      result = await verifyPrivateProductionRuntimeBundle({
        ...common,
        expected,
        now: arguments_.now,
      });
    } else {
      if (!arguments_.outputPath) throw new Error('Restore requires --output');
      result = await restorePrivateProductionRuntimeBundle({
        ...common,
        outputPath: arguments_.outputPath,
        expected,
        targetReferenceAt: expected.targetReferenceAt,
        minimumReferenceAt: expected.minimumReferenceAt,
        minimumGeneratedAt: expected.minimumGeneratedAt,
        now: arguments_.now,
      });
    }
  }
  // Deliberately omit dataset ids, generation ids, paths and file descriptors
  // from CLI output. Workflow logs only receive structural success evidence.
  console.log(JSON.stringify({
    status: arguments_.mode === 'create' ? 'created'
      : arguments_.mode === 'verify' ? 'verified' : 'restored',
    privacyClass: result.privacyClass,
    fileCount: result.fileCount,
    zoneCount: result.zoneCount,
    partCount: result.partCount,
    modelId: result.modelBinding.modelId,
    stateSchemaVersion: result.modelBinding.stateSchemaVersion,
    modelContractSha256: result.modelBinding.modelContractSha256,
    modelBundleSha256: result.modelBinding.modelBundleSha256,
    bundleContentSha256: result.bundleContentSha256,
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`Private production runtime bundle failed closed: ${error.message}`);
    process.exitCode = 1;
  });
}

export const DEFAULT_PRIVATE_RUNTIME_ROOT = path.join(
  os.tmpdir(),
  'ravradar-private-production-runtime',
);
