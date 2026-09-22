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
import { PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';
import { PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE } from './lib/private-weather-component-inventory.mjs';
import { privatePublicHourDeliveryMarker } from './lib/public-hour-delivery-pack.mjs';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';

export const CODE_ONLY_SNAPSHOT_FILES = Object.freeze({
  manifest: 'manifest.json',
  publicConditions: 'public-conditions.json',
  publicConditionDetails: 'public-condition-details.json',
  coastalParts: 'coastal-parts-v2.json',
  zoneRegistry: 'zones.geojson',
  waterLevelRouting: 'water-level-station-routing.json',
});

// The complete 210/673 production detail package is currently just under
// 300 MiB. Keep an explicit bounded read rather than an unbounded fetch, but
// leave headroom for the same public contract to grow without rejecting a
// valid, manifest-bound production package.
export const CODE_ONLY_MAXIMUM_PUBLIC_DETAILS_BYTES = 512 * 1024 * 1024;
// The protected restore has already verified the exact file bytes and SHA-256
// from its sealed bundle manifest before the runtime is installed atomically.
// Reuse the same per-file safety policy when that installed runtime is parsed;
// a smaller independent limit can reject a valid, already-verified cache.
export const CODE_ONLY_MAXIMUM_PRIVATE_CONDITIONS_BYTES =
  PROTECTED_PRIVATE_RUNTIME_POLICY.maximumFilePayloadBytes;
export const RUNTIME_REUSE_MODES = Object.freeze({
  CODE_ONLY: 'code-only-reuse',
  SAVED_WEATHER: 'saved-weather-continuation',
  POST_CUTOVER_REPAIR: 'post-cutover-last-mile-repair',
  CONTRACT_REBIND: 'post-cutover-contract-rebind',
});

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

export function assertContractOnlyModelBinding(liveBinding, currentBinding) {
  assertCodeOnlyModelBinding(liveBinding, currentBinding);
  assertSame(liveBinding, currentBinding, 'Contract-only model binding');
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

export function assertProjectionEquivalent(liveValue, generatedValue, label) {
  assertSame(
    normalizeCodeOnlyProjection(liveValue),
    normalizeCodeOnlyProjection(generatedValue),
    label,
  );
}

function withoutKeys(value, keys) {
  const cloned = structuredClone(value);
  keys.forEach(key => delete cloned[key]);
  return cloned;
}

function partNonScoreProjection(part) {
  const projected = structuredClone(part);
  if (isPlainObject(projected.current)) {
    delete projected.current.waders;
    delete projected.current.beach;
  }
  return projected;
}

function scoreZoneTimeAxes(zones) {
  return Object.fromEntries(Object.entries(zones ?? {}).map(([zoneId, zone]) => [
    zoneId,
    {
      expectedPartCount: zone?.expectedPartCount,
      scoredPartCount: zone?.scoredPartCount,
      currentReferenceAt: zone?.currentReferenceAt,
      times: Array.isArray(zone?.hourly) ? zone.hourly.map(row => row?.time) : null,
    },
  ]));
}

function detailedScoreProjection(document) {
  const coastal = document?.coastalParts;
  return {
    parts: Object.fromEntries(Object.entries(coastal?.parts ?? {}).map(([partId, part]) => [
      partId,
      { waders: part?.current?.waders, beach: part?.current?.beach },
    ])),
    zones: Object.fromEntries(Object.entries(coastal?.zones ?? {}).map(([zoneId, zone]) => [
      zoneId,
      (zone?.hourly ?? []).map(row => ({
        time: row?.time,
        waders: row?.waders,
        beach: row?.beach,
      })),
    ])),
  };
}

export function assertPostCutoverRepairProjection(liveStartup, liveDetails, generatedStartup,
  generatedDetails) {
  assertSame(
    withoutKeys(liveStartup, ['ravScoreRuntime', 'nationalForecast', 'zones', 'coastalParts']),
    withoutKeys(generatedStartup, ['ravScoreRuntime', 'nationalForecast', 'zones', 'coastalParts']),
    'Post-cutover startup non-score envelope',
  );
  assertSame(liveStartup?.zones, generatedStartup?.zones,
    'Post-cutover startup weather');
  assertSame(
    withoutKeys(liveDetails, ['ravScoreRuntime', 'zones', 'coastalParts']),
    withoutKeys(generatedDetails, ['ravScoreRuntime', 'zones', 'coastalParts']),
    'Post-cutover detail non-score envelope',
  );
  assertSame(liveDetails?.zones, generatedDetails?.zones,
    'Post-cutover detailed weather');

  const liveCoastal = liveDetails?.coastalParts;
  const generatedCoastal = generatedDetails?.coastalParts;
  assertSame(
    withoutKeys(liveCoastal, ['modelBinding', 'scoreProfile', 'parts', 'zones']),
    withoutKeys(generatedCoastal, ['modelBinding', 'scoreProfile', 'parts', 'zones']),
    'Post-cutover coastal runtime non-score metadata',
  );
  const livePartIds = Object.keys(liveCoastal?.parts ?? {}).sort();
  const generatedPartIds = Object.keys(generatedCoastal?.parts ?? {}).sort();
  assertSame(livePartIds, generatedPartIds, 'Post-cutover coastal-part inventory');
  for (const partId of livePartIds) {
    assertSame(
      partNonScoreProjection(liveCoastal.parts[partId]),
      partNonScoreProjection(generatedCoastal.parts[partId]),
      `Post-cutover coastal-part weather and geometry ${partId}`,
    );
  }
  assertSame(
    scoreZoneTimeAxes(liveCoastal?.zones),
    scoreZoneTimeAxes(generatedCoastal?.zones),
    'Post-cutover score-zone time axes',
  );
  if (canonical(normalizeCodeOnlyProjection(detailedScoreProjection(liveDetails)))
      === canonical(normalizeCodeOnlyProjection(detailedScoreProjection(generatedDetails)))) {
    throw new Error('Post-cutover score repair did not change any derived score');
  }
}

export function normalizeRuntimeReuseMode(value) {
  const mode = value ?? RUNTIME_REUSE_MODES.CODE_ONLY;
  if (!Object.values(RUNTIME_REUSE_MODES).includes(mode)) {
    throw new Error('Unknown protected runtime reuse mode');
  }
  return mode;
}

export function runtimeReuseSemantics(value) {
  const mode = normalizeRuntimeReuseMode(value);
  const savedWeatherContinuation = mode === RUNTIME_REUSE_MODES.SAVED_WEATHER;
  const postCutoverRepair = mode === RUNTIME_REUSE_MODES.POST_CUTOVER_REPAIR;
  const contractOnlyRebind = mode === RUNTIME_REUSE_MODES.CONTRACT_REBIND;
  return {
    mode,
    savedWeatherContinuation,
    postCutoverRepair,
    contractOnlyRebind,
    reportKind: savedWeatherContinuation
      ? 'RAVRADAR_SAVED_WEATHER_PUBLIC_RUNTIME_CONTINUATION'
      : postCutoverRepair
        ? 'RAVRADAR_POST_CUTOVER_SCORE_REPAIR'
        : contractOnlyRebind
          ? 'RAVRADAR_POST_CUTOVER_CONTRACT_REBIND'
          : 'RAVRADAR_CODE_ONLY_PUBLIC_RUNTIME_REUSE',
    savedProtectedRuntimeReused:
      savedWeatherContinuation || postCutoverRepair || contractOnlyRebind,
    publicRuntimeAdvanced: savedWeatherContinuation,
    weatherValuesChanged: savedWeatherContinuation,
    scoresChanged: savedWeatherContinuation || postCutoverRepair,
  };
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
  mode: requestedMode,
  allowEqualSavedWeatherReference = false,
} = {}) {
  const semantics = runtimeReuseSemantics(requestedMode);
  const {
    mode,
    savedWeatherContinuation,
    postCutoverRepair,
  } = semantics;
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
    readJson(
      path.join(repository, 'data/live/conditions.json'),
      'Restored private conditions',
      CODE_ONLY_MAXIMUM_PRIVATE_CONDITIONS_BYTES,
    ),
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
  if (semantics.contractOnlyRebind) {
    assertContractOnlyModelBinding(liveBinding, currentBinding);
  } else {
    assertCodeOnlyModelBinding(liveBinding, currentBinding);
  }
  assertSame(publicSource.value?.ravScoreRuntime?.modelBinding, liveBinding,
    'Live startup model binding');
  assertSame(detailsSource.value?.ravScoreRuntime?.modelBinding, liveBinding,
    'Live detail model binding');
  assertSame(fullSource.value?.coastalParts?.modelBinding, currentBinding,
    'Migrated private model binding');

  for (const [label, document] of [
    ['Live startup runtime', publicSource.value],
    ['Live detail runtime', detailsSource.value],
  ]) {
    if (document?.datasetId !== manifest.datasetId
        || document?.productionReferenceAt !== manifest.productionReferenceAt) {
      throw new Error(`${label} does not match the live manifest identity`);
    }
  }
  if (!savedWeatherContinuation) {
    if (fullSource.value?.datasetId !== manifest.datasetId
        || fullSource.value?.productionReferenceAt !== manifest.productionReferenceAt) {
      throw new Error('Restored private runtime does not match the live manifest identity');
    }
  } else {
    const liveReference = Date.parse(manifest.productionReferenceAt ?? '');
    const savedReference = Date.parse(fullSource.value?.productionReferenceAt ?? '');
    if (!fullSource.value?.datasetId
        || !Number.isFinite(liveReference)
        || !Number.isFinite(savedReference)
        || savedReference < liveReference
        || savedReference === liveReference && !allowEqualSavedWeatherReference) {
      throw new Error('Saved weather continuation must strictly advance the public production hour');
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
    hourDeliveryPackPath: privatePublicHourDeliveryMarker(fullSource.value)
      ? path.join(repository, PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.relativePath)
      : null,
  });
  assertPublicRuntimePrivacy(generated.publicDocument, 'startup');
  assertPublicRuntimePrivacy(generated.detailsDocument, 'details');
  assertPublicRuntimePrivacy(generated.manifest, 'manifest');
  if (!savedWeatherContinuation && !postCutoverRepair) {
    assertProjectionEquivalent(publicSource.value, generated.publicDocument,
      'Code-only startup projection');
    assertProjectionEquivalent(detailsSource.value, generated.detailsDocument,
      'Code-only detail projection');
    // Delivery files are a new deterministic partition, not changed weather or
    // scores. The complete startup/detail semantic oracle is still compared
    // immediately above; no other manifest field is exempt from equivalence.
    const { detailDelivery: _previousDelivery, ...previousManifest } = manifest;
    const { detailDelivery: _newDelivery, ...nextManifest } = generated.manifest;
    assertProjectionEquivalent(previousManifest, nextManifest,
      'Code-only manifest projection');
  } else if (postCutoverRepair) {
    assertPostCutoverRepairProjection(
      publicSource.value,
      detailsSource.value,
      generated.publicDocument,
      generated.detailsDocument,
    );
    if (generated.manifest.datasetId !== manifest.datasetId
        || generated.manifest.productionReferenceAt !== manifest.productionReferenceAt) {
      throw new Error('Post-cutover score repair changed the protected runtime identity');
    }
  } else if (generated.manifest.datasetId !== fullSource.value.datasetId
      || generated.manifest.productionReferenceAt !== fullSource.value.productionReferenceAt) {
    throw new Error('Saved weather continuation did not preserve the protected runtime identity');
  }

  const report = {
    schemaVersion: 1,
    kind: semantics.reportKind,
    mode,
    sourceDatasetId: manifest.datasetId,
    datasetId: generated.manifest.datasetId,
    productionReferenceAt: generated.manifest.productionReferenceAt,
    releaseVersion,
    zoneCount: manifest.zoneCount,
    coastalPartCount: manifest.coastalPartCount,
    sourcePublicManifestSha256: sha256Text(manifestSource.text),
    sourcePublicManifestCanonicalSha256: sha256CanonicalJson(manifestSource.value),
    generatedPublicManifestSha256: sha256Text(`${JSON.stringify(generated.manifest, null, 2)}\n`),
    waterLevelRoutingSha256: sha256Text(routingSource.text),
    publicRuntimeAdvanced: semantics.publicRuntimeAdvanced,
    savedProtectedRuntimeReused: semantics.savedProtectedRuntimeReused,
    weatherValuesChanged: semantics.weatherValuesChanged,
    scoresChanged: semantics.scoresChanged,
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

function optionalArgument(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0) return undefined;
  if (!argv[index + 1] || argv[index + 1].startsWith('--')) {
    throw new Error(`Missing ${name}`);
  }
  return argv[index + 1];
}

function hasFlag(argv, name) {
  return argv.includes(name);
}

async function main() {
  const argv = process.argv.slice(2);
  const report = await prepareCodeOnlyPublicRuntime({
    repositoryRoot: argument(argv, '--repository-root'),
    snapshotRoot: argument(argv, '--snapshot-root'),
    reportPath: argument(argv, '--report'),
    mode: optionalArgument(argv, '--mode'),
    allowEqualSavedWeatherReference: hasFlag(argv, '--allow-equal-saved-weather-reference'),
  });
  const status = {
    [RUNTIME_REUSE_MODES.CODE_ONLY]: 'code-only-runtime-reused',
    [RUNTIME_REUSE_MODES.SAVED_WEATHER]: 'saved-weather-runtime-continued',
    [RUNTIME_REUSE_MODES.POST_CUTOVER_REPAIR]: 'post-cutover-score-repaired',
    [RUNTIME_REUSE_MODES.CONTRACT_REBIND]: 'post-cutover-contract-rebound',
  }[report.mode];
  console.log(JSON.stringify({
    status,
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
