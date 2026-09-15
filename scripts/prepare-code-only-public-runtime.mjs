#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertPublicRuntimePrivacy,
  sha256Text,
  writePublicRuntimeFromFull,
} from './public-conditions-lib.mjs';
import {
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import { assertBindingUpgrade } from './migrate-post-cutover-private-runtime.mjs';

export const CODE_ONLY_SNAPSHOT_FILES = Object.freeze({
  manifest: 'manifest.json',
  publicConditions: 'public-conditions.json',
  publicConditionDetails: 'public-condition-details.json',
  coastalParts: 'coastal-parts-v2.json',
  zoneRegistry: 'zones.geojson',
  waterLevelRouting: 'water-level-station-routing.json',
});

export const CODE_ONLY_MAXIMUM_PUBLIC_DETAILS_BYTES = 192 * 1024 * 1024;

const SHA256 = /^[a-f0-9]{64}$/;
const DERIVED_HASH_KEYS = new Set([
  'coastalPartsSha256',
  'fileSha256',
  'modelBundleSha256',
  'payloadBodySha256',
  'publicConditionDetailsSha256',
  'publicConditionsSha256',
  'zoneRegistrySha256',
]);

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function normalizeCodeOnlyProjection(value) {
  if (Array.isArray(value)) return value.map(normalizeCodeOnlyProjection);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    DERIVED_HASH_KEYS.has(key) ? '<code-only-derived-hash>' : normalizeCodeOnlyProjection(child),
  ]));
}

export function assertZoneRegistryVersionOnly(liveRegistry, installedRegistry, releaseVersion) {
  if (!isPlainObject(liveRegistry) || !isPlainObject(installedRegistry)) {
    throw new Error('Code-only zone registry is invalid');
  }
  const normalizedLive = structuredClone(liveRegistry);
  const normalizedInstalled = structuredClone(installedRegistry);
  normalizedLive.version = '<release-version>';
  normalizedInstalled.version = '<release-version>';
  if (canonical(normalizedLive) !== canonical(normalizedInstalled)) {
    throw new Error('Code-only zone registry changes more than its top-level version');
  }
  if (installedRegistry.version !== releaseVersion) {
    throw new Error('Code-only zone registry does not use the release version');
  }
}

export function assertCodeOnlyModelBinding(liveBinding, currentBinding) {
  assertRavScoreModelBinding(currentBinding, 'Current code-only target binding');
  assertBindingUpgrade(liveBinding, currentBinding, 'Code-only model binding', {
    requireChange: false,
  });
}

export function manifestBoundedPublicDetailsBytes(value) {
  if (!Number.isSafeInteger(value)
      || value < 2
      || value > CODE_ONLY_MAXIMUM_PUBLIC_DETAILS_BYTES) {
    throw new Error('Live public detail runtime manifest size is outside its safe bound');
  }
  return value;
}

function assertSame(left, right, label) {
  if (canonical(left) !== canonical(right)) throw new Error(`${label} mismatch`);
}

function assertProjectionEquivalent(liveValue, generatedValue, label) {
  assertSame(
    normalizeCodeOnlyProjection(liveValue),
    normalizeCodeOnlyProjection(generatedValue),
    label,
  );
}

async function readRegularFile(file, label, maximumBytes) {
  const stat = await fs.lstat(file).catch(() => null);
  if (!stat?.isFile() || stat.isSymbolicLink() || stat.size < 2 || stat.size > maximumBytes) {
    throw new Error(`${label} is unavailable or outside its size bound`);
  }
  return fs.readFile(file, 'utf8');
}

async function readJson(file, label, maximumBytes) {
  const text = await readRegularFile(file, label, maximumBytes);
  try {
    return { text, value: JSON.parse(text) };
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

async function atomicWrite(file, text) {
  const destination = path.resolve(file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}-${crypto.randomBytes(5).toString('hex')}`;
  try {
    await fs.writeFile(temporary, text, { flag: 'wx' });
    await fs.rename(temporary, destination);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function assertSeparateRegularDirectory(repositoryRoot, requested) {
  const repository = await fs.realpath(path.resolve(repositoryRoot));
  const candidateRequested = path.resolve(requested);
  const stat = await fs.lstat(candidateRequested).catch(() => null);
  if (!stat?.isDirectory() || stat.isSymbolicLink()) {
    throw new Error('Code-only snapshot root is not a regular directory');
  }
  const candidate = await fs.realpath(candidateRequested);
  const relation = path.relative(repository, candidate);
  if (!relation || (!relation.startsWith(`..${path.sep}`) && relation !== '..')) {
    throw new Error('Code-only snapshot must remain outside the repository');
  }
  return { repository, snapshot: candidate };
}

function assertDigest(text, expected, label) {
  if (!SHA256.test(String(expected ?? '')) || sha256Text(text) !== expected) {
    throw new Error(`${label} digest mismatch`);
  }
}

function assertByteCount(text, expected, label) {
  if (!Number.isSafeInteger(expected) || expected < 2 || Buffer.byteLength(text) !== expected) {
    throw new Error(`${label} byte count mismatch`);
  }
}

export async function prepareCodeOnlyPublicRuntime({
  repositoryRoot,
  snapshotRoot,
  reportPath,
} = {}) {
  const { repository, snapshot } = await assertSeparateRegularDirectory(repositoryRoot, snapshotRoot);
  const paths = Object.fromEntries(Object.entries(CODE_ONLY_SNAPSHOT_FILES)
    .map(([key, filename]) => [key, path.join(snapshot, filename)]));
  const manifestSource = await readJson(paths.manifest, 'Live public manifest', 1024 * 1024);
  const manifest = manifestSource.value;
  if (manifest.schemaVersion !== 4 || manifest.complete !== true
      || manifest.zoneCount !== 210 || manifest.coastalPartCount !== 673) {
    throw new Error('Live code-only source is not a complete 210/673 schema-4 artifact');
  }
  const publicDetailsMaximumBytes = manifestBoundedPublicDetailsBytes(
    manifest.publicConditionDetailsBytes,
  );

  const [
    publicSource,
    detailsSource,
    coastalPartsSource,
    zoneRegistrySource,
    routingSource,
    fullSource,
    versionSource,
  ] = await Promise.all([
    readJson(paths.publicConditions, 'Live public startup runtime', 32 * 1024 * 1024),
    readJson(paths.publicConditionDetails, 'Live public detail runtime', publicDetailsMaximumBytes),
    readJson(paths.coastalParts, 'Live public coastal-part registry', 16 * 1024 * 1024),
    readJson(paths.zoneRegistry, 'Live public zone registry', 32 * 1024 * 1024),
    readJson(paths.waterLevelRouting, 'Live public water-level routing', 4 * 1024 * 1024),
    readJson(path.join(repository, 'data/live/conditions.json'), 'Restored private conditions', 256 * 1024 * 1024),
    readJson(path.join(repository, 'version.json'), 'Release version', 16 * 1024),
  ]);
  assertDigest(publicSource.text, manifest.publicConditionsSha256, 'Live public startup runtime');
  assertByteCount(publicSource.text, manifest.publicConditionsBytes, 'Live public startup runtime');
  assertDigest(detailsSource.text, manifest.publicConditionDetailsSha256, 'Live public detail runtime');
  assertByteCount(detailsSource.text, manifest.publicConditionDetailsBytes, 'Live public detail runtime');
  assertDigest(coastalPartsSource.text, manifest.coastalPartsSha256, 'Live public coastal-part registry');
  assertByteCount(coastalPartsSource.text, manifest.coastalPartsBytes, 'Live public coastal-part registry');
  assertDigest(zoneRegistrySource.text, manifest.zoneRegistrySha256, 'Live public zone registry');
  assertByteCount(zoneRegistrySource.text, manifest.zoneRegistryBytes, 'Live public zone registry');

  const liveBinding = manifest.ravScoreModelBinding;
  const currentBinding = ravScoreModelBinding();
  assertCodeOnlyModelBinding(liveBinding, currentBinding);
  assertSame(publicSource.value?.ravScoreRuntime?.modelBinding, liveBinding,
    'Live startup model binding');
  assertSame(detailsSource.value?.ravScoreRuntime?.modelBinding, liveBinding,
    'Live detail model binding');
  assertSame(fullSource.value?.coastalParts?.modelBinding, currentBinding,
    'Migrated private model binding');

  for (const [label, document] of [
    ['Live startup runtime', publicSource.value],
    ['Live detail runtime', detailsSource.value],
    ['Restored private runtime', fullSource.value],
  ]) {
    if (document?.datasetId !== manifest.datasetId
        || document?.productionReferenceAt !== manifest.productionReferenceAt) {
      throw new Error(`${label} does not match the live manifest identity`);
    }
  }
  if (Object.keys(fullSource.value?.zones ?? {}).length !== manifest.zoneCount
      || Object.keys(fullSource.value?.coastalParts?.parts ?? {}).length !== manifest.coastalPartCount
      || fullSource.value?.coastalParts?.expectedPartCount !== manifest.coastalPartCount) {
    throw new Error('Restored private runtime does not match the live 210/673 inventory');
  }
  if (coastalPartsSource.value?.zoneCount !== manifest.zoneCount
      || coastalPartsSource.value?.partCount !== manifest.coastalPartCount) {
    throw new Error('Live coastal-part registry does not match the public manifest');
  }
  if (routingSource.value?.schemaVersion !== 1) {
    throw new Error('Live water-level routing has an unexpected schema');
  }
  const releaseVersion = String(versionSource.value?.version ?? '');
  if (!/^4\.0\.[0-9]+$/.test(releaseVersion)) throw new Error('Release version is invalid');

  const installedZoneRegistry = structuredClone(zoneRegistrySource.value);
  installedZoneRegistry.version = releaseVersion;
  assertZoneRegistryVersionOnly(zoneRegistrySource.value, installedZoneRegistry, releaseVersion);
  await Promise.all([
    atomicWrite(path.join(repository, 'data/zones.geojson'), `${JSON.stringify(installedZoneRegistry, null, 2)}\n`),
    atomicWrite(path.join(repository, 'data/live/coastal-parts-v2.json'), coastalPartsSource.text),
    atomicWrite(path.join(repository, 'data/water-level-station-routing.json'), routingSource.text),
  ]);

  const generated = await writePublicRuntimeFromFull(fullSource.value, {
    publicPath: path.join(repository, 'data/live/public-conditions.json'),
    detailsPath: path.join(repository, 'data/live/public-condition-details.json'),
    manifestPath: path.join(repository, 'data/live/manifest.json'),
    coastalPartsPath: path.join(repository, 'data/live/coastal-parts-v2.json'),
    zoneRegistryPath: path.join(repository, 'data/zones.geojson'),
  });
  assertPublicRuntimePrivacy(generated.publicDocument, 'Code-only startup runtime');
  assertPublicRuntimePrivacy(generated.detailsDocument, 'Code-only detail runtime');
  assertPublicRuntimePrivacy(generated.manifest, 'Code-only public manifest');
  assertProjectionEquivalent(publicSource.value, generated.publicDocument,
    'Code-only startup projection');
  assertProjectionEquivalent(detailsSource.value, generated.detailsDocument,
    'Code-only detail projection');
  assertProjectionEquivalent(manifest, generated.manifest,
    'Code-only manifest projection');

  const report = {
    schemaVersion: 1,
    kind: 'RAVRADAR_CODE_ONLY_PUBLIC_RUNTIME_REUSE',
    datasetId: manifest.datasetId,
    productionReferenceAt: manifest.productionReferenceAt,
    releaseVersion,
    zoneCount: manifest.zoneCount,
    coastalPartCount: manifest.coastalPartCount,
    sourcePublicManifestSha256: sha256Text(manifestSource.text),
    generatedPublicManifestSha256: sha256Text(`${JSON.stringify(generated.manifest, null, 2)}\n`),
    waterLevelRoutingSha256: sha256Text(routingSource.text),
    weatherValuesChanged: false,
    scoresChanged: false,
    geometryChanged: false,
    providerRequestsPerformed: false,
    privatePayloadIncluded: false,
  };
  await atomicWrite(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

function argument(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0 || !argv[index + 1]) throw new Error(`Missing ${name}`);
  return argv[index + 1];
}

async function main() {
  const report = await prepareCodeOnlyPublicRuntime({
    repositoryRoot: argument(process.argv.slice(2), '--repository-root'),
    snapshotRoot: argument(process.argv.slice(2), '--snapshot-root'),
    reportPath: argument(process.argv.slice(2), '--report'),
  });
  console.log(JSON.stringify({
    status: 'code-only-runtime-reused',
    datasetId: report.datasetId,
    zoneCount: report.zoneCount,
    coastalPartCount: report.coastalPartCount,
    providerRequestsPerformed: false,
    privatePayloadIncluded: false,
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
