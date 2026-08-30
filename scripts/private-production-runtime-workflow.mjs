#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY,
  PRIVATE_RUNTIME_REPOSITORY_ROOT,
  canonicalPrivateRuntimeJson,
} from './private-production-runtime-bundle.mjs';
import {
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,
} from './lib/ravscore-continuation-implementation-contract.mjs';

export const PRIVATE_RUNTIME_FILES = Object.freeze([
  Object.freeze({ id: 'full-conditions', relativePath: 'data/live/conditions.json' }),
  Object.freeze({ id: 'dmi-forecast-cache', relativePath: 'data/live/dmi-forecast-cache.json' }),
  Object.freeze({ id: 'dmi-bulk-cache', relativePath: 'data/live/dmi-bulk-cache.json' }),
  Object.freeze({ id: 'copernicus-current-range-cache', relativePath: '.cache/copernicus-current-shadow.json' }),
  Object.freeze({ id: 'current-pilot-history', relativePath: 'data/live/current-pilot-history.json' }),
  Object.freeze({ id: 'weather-health', relativePath: 'data/live/weather-health.json' }),
  Object.freeze({ id: 'runtime-diagnostics', relativePath: 'data/live/ravradar-runtime-diagnostics.json' }),
  Object.freeze({ id: 'dmi-water-stations', relativePath: 'data/live/dmi-water-stations.json' }),
]);

export const PRIVATE_RUNTIME_CONTRACT_FILES = Object.freeze({
  continuationStateContractSha256: Object.freeze([
    ...RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,
  ]),
  fullRuntimeContractSha256: Object.freeze([
    'js/core/ravscore-model-contract.js',
    'scripts/update-dmi-bulk.py',
    'scripts/update-weather.mjs',
    'scripts/check-weather-update.py',
    'scripts/build-copernicus-target-registry.py',
    'scripts/run-copernicus-current-pilot.py',
    'scripts/check-copernicus-current-range.py',
    'scripts/build-live-current-pilot.py',
    'scripts/private-production-runtime-bundle.mjs',
    'scripts/private-production-runtime-workflow.mjs',
    'scripts/protected-private-production-runtime.mjs',
    'scripts/lib/coastal_point_staging.py',
    'scripts/lib/copernicus_current.py',
    'scripts/lib/current_field_shadow.py',
    'scripts/lib/dmi_cache_migration.py',
    'scripts/lib/dmi_grid_vector.py',
    'scripts/lib/dmi_native_provenance.py',
    'scripts/lib/coastal-point-staging-contract.mjs',
    'scripts/lib/ravscore-integrated-runtime.mjs',
    'scripts/lib/ravscore-recovery-replay.mjs',
    'scripts/lib/ravscore-sampling-context.mjs',
    'scripts/lib/dmi-forecast-store.mjs',
    'scripts/lib/current-transport-history.mjs',
    'scripts/lib/live-current-pilot.mjs',
    'scripts/lib/production-reference-time.mjs',
    'data/current-live-pilot-control.json',
    'data/current-regional-proxy-policy.json',
  ]),
  publicProjectionContractSha256: Object.freeze([
    'js/core/ravscore-model-contract.js',
    'js/core/ravscore-public-model.js',
    'js/core/ravscore-public-runtime-contract.js',
    'js/core/local-zone-score.js',
    'scripts/public-conditions-lib.mjs',
  ]),
});

export const PRIVATE_RUNTIME_PREFLIGHT_POLICY = Object.freeze({
  schemaVersion: '1.0.0',
  kind: 'RAVRADAR_PRIVATE_RUNTIME_PREFLIGHT_STATE',
  privacyClass: 'DATAMINIMIZED_PRIVATE_RUNTIME_PREFLIGHT',
  maximumStateBytes: 64 * 1024,
  expectedZoneCount: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedZoneCount,
  expectedPartCount: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedPartCount,
});

const PREFLIGHT_COLLECTIONS = Object.freeze([
  'dkss_idw',
  'dkss_nsbs',
  'dkss_lf',
  'harmonie_dini_sf',
  'wam_dw',
  'wam_nsb',
]);
const PREFLIGHT_STATE_KEYS = Object.freeze([
  'schemaVersion',
  'kind',
  'privacyClass',
  'datasetId',
  'productionReferenceAt',
  'generatedAt',
  'modelBinding',
  'contractHashes',
  'dmiRuns',
  'dmiBulkRefreshStatus',
  'oceanDiagnosticsGeneratedAt',
  'oceanDiagnosticsStatus',
  'completeDmiZones',
  'totalZones',
  'prioritizedMissingOrExpiringZones',
  'bulkRefreshStatus',
  'duplicateZones',
  'stateSha256',
]);
const SAFE_DATASET_ID = /^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SAFE_STATUS = /^[A-Za-z0-9._:-]{0,80}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const isPlainObject = value => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;
const canonicalTime = (value, label) => {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} is not a valid time`);
  }
  return new Date(value).toISOString();
};
const inside = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative !== '' && relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
};

function exactKeys(value, expected, label) {
  if (!isPlainObject(value)
    || JSON.stringify(Object.keys(value).sort(compareText))
      !== JSON.stringify([...expected].sort(compareText))) {
    throw new Error(`${label} has an incompatible field set`);
  }
}

function exactCanonicalTime(value, label) {
  const normalized = canonicalTime(value, label);
  if (normalized !== value) throw new Error(`${label} is not canonical UTC`);
  return normalized;
}

function boundedInteger(value, maximum, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new Error(`${label} is outside its aggregate bound`);
  }
  return value;
}

function safeStatus(value, label) {
  const text = String(value ?? '');
  if (!SAFE_STATUS.test(text)) throw new Error(`${label} is not a safe status token`);
  return text;
}

async function readJsonFile(root, relativePath, label, maximumBytes = 256 * 1024 * 1024) {
  const absolute = path.resolve(root, relativePath);
  if (!inside(root, absolute)) throw new Error(`${label} path escapes repository`);
  const stat = await fs.lstat(absolute).catch(() => null);
  if (!stat?.isFile() || stat.isSymbolicLink() || stat.size < 2 || stat.size > maximumBytes) {
    throw new Error(`${label} is unavailable or exceeds its read bound`);
  }
  try {
    return JSON.parse(await fs.readFile(absolute, 'utf8'));
  } catch {
    throw new Error(`${label} cannot be parsed`);
  }
}

function preflightStateDigest(state) {
  const { stateSha256: _ignored, ...unsigned } = state;
  return sha256(canonicalPrivateRuntimeJson(unsigned));
}

async function atomicWriteJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
    await fs.rename(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

export async function privateRuntimeContractHashes({
  repositoryRoot = PRIVATE_RUNTIME_REPOSITORY_ROOT,
} = {}) {
  const root = path.resolve(repositoryRoot);
  const result = {};
  for (const [contract, files] of Object.entries(PRIVATE_RUNTIME_CONTRACT_FILES)) {
    const rows = [];
    for (const relativePath of [...files].sort(compareText)) {
      const absolute = path.resolve(root, relativePath);
      if (!inside(root, absolute)) throw new Error('Private runtime contract path escapes repository');
      const bytes = await fs.readFile(absolute);
      rows.push([relativePath, sha256(bytes)]);
    }
    result[contract] = sha256(JSON.stringify(rows));
  }
  return result;
}

function assertConditionsMetadata(document) {
  if (!isPlainObject(document)
    || typeof document.datasetId !== 'string'
    || !/^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(document.datasetId)) {
    throw new Error('Private runtime source lacks a safe dataset identity');
  }
  const productionReferenceAt = canonicalTime(
    document.productionReferenceAt,
    'Private runtime production reference',
  );
  const generatedAt = canonicalTime(document.generatedAt, 'Private runtime generation time');
  const zones = document.zones;
  const parts = document.coastalParts?.parts;
  if (!isPlainObject(zones)
    || Object.keys(zones).length !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedZoneCount
    || !isPlainObject(parts)
    || Object.keys(parts).length !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedPartCount) {
    throw new Error('Private runtime source is not complete for 210 zones and 673 coastal parts');
  }
  assertRavScoreModelBinding(
    document.coastalParts?.modelBinding,
    'Private runtime source model binding',
  );
  if (JSON.stringify(document.coastalParts.modelBinding) !== JSON.stringify(ravScoreModelBinding())) {
    throw new Error('Private runtime source belongs to another RavScore model');
  }
  return { datasetId: document.datasetId, productionReferenceAt, generatedAt };
}

export async function buildPrivateRuntimeCreateSpec({
  repositoryRoot = PRIVATE_RUNTIME_REPOSITORY_ROOT,
  conditionsPath = 'data/live/conditions.json',
} = {}) {
  const root = path.resolve(repositoryRoot);
  const conditionsAbsolute = path.resolve(root, conditionsPath);
  if (!inside(root, conditionsAbsolute)) throw new Error('Private runtime conditions path escapes repository');
  let conditions;
  try {
    conditions = JSON.parse(await fs.readFile(conditionsAbsolute, 'utf8'));
  } catch {
    throw new Error('Private runtime conditions source cannot be parsed');
  }
  const metadata = assertConditionsMetadata(conditions);
  const files = [];
  for (const descriptor of PRIVATE_RUNTIME_FILES) {
    const sourcePath = path.resolve(root, descriptor.relativePath);
    if (!inside(root, sourcePath)) throw new Error('Private runtime payload path escapes repository');
    const stat = await fs.lstat(sourcePath).catch(() => null);
    if (!stat?.isFile() || stat.isSymbolicLink()) {
      throw new Error('Private runtime payload inventory is incomplete');
    }
    files.push({
      id: descriptor.id,
      sourcePath,
      relativePath: descriptor.relativePath,
      privacyClass: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass,
    });
  }
  return {
    metadata: {
      ...metadata,
      generationId: metadata.datasetId,
      zoneCount: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedZoneCount,
      partCount: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedPartCount,
      modelBinding: ravScoreModelBinding(),
      contractHashes: await privateRuntimeContractHashes({ repositoryRoot: root }),
      privacyClass: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass,
    },
    files,
  };
}

export async function buildPrivateRuntimeExpectation({
  repositoryRoot = PRIVATE_RUNTIME_REPOSITORY_ROOT,
  targetReferenceAt,
  now = new Date().toISOString(),
} = {}) {
  const target = canonicalTime(targetReferenceAt, 'Private runtime target reference');
  const currentTime = canonicalTime(now, 'Private runtime expectation time');
  const minimum = new Date(
    Date.parse(target) - 72 * 3_600_000,
  ).toISOString();
  return {
    modelBinding: ravScoreModelBinding(),
    contractHashes: await privateRuntimeContractHashes({ repositoryRoot }),
    targetReferenceAt: target,
    minimumReferenceAt: minimum,
    minimumGeneratedAt: minimum,
    now: currentTime,
  };
}

export async function buildPrivateRuntimePreflightState({
  repositoryRoot = PRIVATE_RUNTIME_REPOSITORY_ROOT,
} = {}) {
  const root = path.resolve(repositoryRoot);
  const [conditions, bulk, oceanDiagnostics, runtime, contractHashes] = await Promise.all([
    readJsonFile(root, 'data/live/conditions.json', 'Private runtime preflight conditions'),
    readJsonFile(root, 'data/live/dmi-bulk-cache.json', 'Private runtime preflight DMI bulk cache'),
    readJsonFile(root, 'data/diagnostics/dmi-ocean-diagnostics.json', 'Private runtime preflight ocean diagnostics', 4 * 1024 * 1024),
    readJsonFile(root, 'data/live/ravradar-runtime-diagnostics.json', 'Private runtime preflight diagnostics'),
    privateRuntimeContractHashes({ repositoryRoot: root }),
  ]);
  const metadata = assertConditionsMetadata(conditions);
  const dmiRuns = {};
  for (const collection of PREFLIGHT_COLLECTIONS) {
    const referenceTime = bulk?.runs?.[collection]?.referenceTime;
    if (referenceTime !== undefined && referenceTime !== null) {
      dmiRuns[collection] = canonicalTime(
        referenceTime,
        `Private runtime preflight ${collection} reference`,
      );
    }
  }
  const acquisition = runtime?.acquisition ?? {};
  const bulkDownloads = acquisition?.bulkModelDownloads ?? {};
  const forecast = runtime?.dataQuality?.forecast ?? {};
  const healthDmi = runtime?.health?.dmi ?? {};
  const unsigned = {
    schemaVersion: PRIVATE_RUNTIME_PREFLIGHT_POLICY.schemaVersion,
    kind: PRIVATE_RUNTIME_PREFLIGHT_POLICY.kind,
    privacyClass: PRIVATE_RUNTIME_PREFLIGHT_POLICY.privacyClass,
    datasetId: metadata.datasetId,
    productionReferenceAt: metadata.productionReferenceAt,
    generatedAt: metadata.generatedAt,
    modelBinding: ravScoreModelBinding(),
    contractHashes,
    dmiRuns,
    dmiBulkRefreshStatus: safeStatus(bulk?.refreshStatus, 'Private runtime DMI bulk status'),
    oceanDiagnosticsGeneratedAt: exactCanonicalTime(
      oceanDiagnostics?.generatedAt,
      'Private runtime ocean diagnostics generation',
    ),
    oceanDiagnosticsStatus: safeStatus(
      oceanDiagnostics?.refreshStatus,
      'Private runtime ocean diagnostics status',
    ),
    completeDmiZones: boundedInteger(
      forecast?.completeDmiZones,
      PRIVATE_RUNTIME_PREFLIGHT_POLICY.expectedZoneCount,
      'Private runtime complete DMI zone count',
    ),
    totalZones: boundedInteger(
      healthDmi?.totalZones,
      PRIVATE_RUNTIME_PREFLIGHT_POLICY.expectedZoneCount,
      'Private runtime total zone count',
    ),
    prioritizedMissingOrExpiringZones: boundedInteger(
      acquisition?.prioritizedMissingOrExpiringZones,
      PRIVATE_RUNTIME_PREFLIGHT_POLICY.expectedZoneCount,
      'Private runtime missing-or-expiring zone count',
    ),
    bulkRefreshStatus: safeStatus(
      bulkDownloads?.refreshStatus,
      'Private runtime bulk-download status',
    ),
    duplicateZones: boundedInteger(
      runtime?.duplicateTimes?.zones,
      PRIVATE_RUNTIME_PREFLIGHT_POLICY.expectedZoneCount,
      'Private runtime duplicate-zone count',
    ),
  };
  if (unsigned.totalZones !== PRIVATE_RUNTIME_PREFLIGHT_POLICY.expectedZoneCount) {
    throw new Error('Private runtime preflight does not cover every active zone');
  }
  const state = { ...unsigned, stateSha256: sha256(canonicalPrivateRuntimeJson(unsigned)) };
  if (Buffer.byteLength(canonicalPrivateRuntimeJson(state))
    > PRIVATE_RUNTIME_PREFLIGHT_POLICY.maximumStateBytes) {
    throw new Error('Private runtime preflight state exceeds its dataminimized bound');
  }
  return state;
}

export async function validatePrivateRuntimePreflightState(state, {
  repositoryRoot = PRIVATE_RUNTIME_REPOSITORY_ROOT,
  publicManifest,
} = {}) {
  exactKeys(state, PREFLIGHT_STATE_KEYS, 'Private runtime preflight state');
  if (Buffer.byteLength(canonicalPrivateRuntimeJson(state))
      > PRIVATE_RUNTIME_PREFLIGHT_POLICY.maximumStateBytes
    || state.schemaVersion !== PRIVATE_RUNTIME_PREFLIGHT_POLICY.schemaVersion
    || state.kind !== PRIVATE_RUNTIME_PREFLIGHT_POLICY.kind
    || state.privacyClass !== PRIVATE_RUNTIME_PREFLIGHT_POLICY.privacyClass
    || !SAFE_DATASET_ID.test(String(state.datasetId ?? ''))
    || !SHA256_PATTERN.test(String(state.stateSha256 ?? ''))
    || preflightStateDigest(state) !== state.stateSha256) {
    throw new Error('Private runtime preflight state is invalid');
  }
  const productionReferenceAt = exactCanonicalTime(
    state.productionReferenceAt,
    'Private runtime preflight production reference',
  );
  const generatedAt = exactCanonicalTime(
    state.generatedAt,
    'Private runtime preflight generation',
  );
  assertRavScoreModelBinding(state.modelBinding, 'Private runtime preflight model binding');
  if (canonicalPrivateRuntimeJson(state.modelBinding)
      !== canonicalPrivateRuntimeJson(ravScoreModelBinding())) {
    throw new Error('Private runtime preflight belongs to another model');
  }
  const expectedHashes = await privateRuntimeContractHashes({ repositoryRoot });
  if (canonicalPrivateRuntimeJson(state.contractHashes)
      !== canonicalPrivateRuntimeJson(expectedHashes)) {
    throw new Error('Private runtime preflight contract hashes are stale');
  }
  if (!isPlainObject(state.dmiRuns)
    || Object.keys(state.dmiRuns).some(key => !PREFLIGHT_COLLECTIONS.includes(key))) {
    throw new Error('Private runtime preflight DMI run inventory is invalid');
  }
  const dmiRuns = {};
  for (const [collection, referenceTime] of Object.entries(state.dmiRuns)) {
    dmiRuns[collection] = exactCanonicalTime(
      referenceTime,
      `Private runtime preflight ${collection} reference`,
    );
  }
  const normalized = {
    ...state,
    productionReferenceAt,
    generatedAt,
    dmiRuns,
    dmiBulkRefreshStatus: safeStatus(
      state.dmiBulkRefreshStatus,
      'Private runtime preflight DMI bulk status',
    ),
    oceanDiagnosticsGeneratedAt: exactCanonicalTime(
      state.oceanDiagnosticsGeneratedAt,
      'Private runtime preflight ocean diagnostics generation',
    ),
    oceanDiagnosticsStatus: safeStatus(
      state.oceanDiagnosticsStatus,
      'Private runtime preflight ocean diagnostics status',
    ),
    completeDmiZones: boundedInteger(
      state.completeDmiZones,
      PRIVATE_RUNTIME_PREFLIGHT_POLICY.expectedZoneCount,
      'Private runtime preflight complete DMI zone count',
    ),
    totalZones: boundedInteger(
      state.totalZones,
      PRIVATE_RUNTIME_PREFLIGHT_POLICY.expectedZoneCount,
      'Private runtime preflight total zone count',
    ),
    prioritizedMissingOrExpiringZones: boundedInteger(
      state.prioritizedMissingOrExpiringZones,
      PRIVATE_RUNTIME_PREFLIGHT_POLICY.expectedZoneCount,
      'Private runtime preflight missing-or-expiring zone count',
    ),
    bulkRefreshStatus: safeStatus(
      state.bulkRefreshStatus,
      'Private runtime preflight bulk-download status',
    ),
    duplicateZones: boundedInteger(
      state.duplicateZones,
      PRIVATE_RUNTIME_PREFLIGHT_POLICY.expectedZoneCount,
      'Private runtime preflight duplicate-zone count',
    ),
  };
  if (normalized.totalZones !== PRIVATE_RUNTIME_PREFLIGHT_POLICY.expectedZoneCount) {
    throw new Error('Private runtime preflight does not cover every active zone');
  }
  if (!isPlainObject(publicManifest)
    || publicManifest.schemaVersion !== 4
    || publicManifest.complete !== true
    || publicManifest.datasetId !== normalized.datasetId
    || publicManifest.generatedAt !== normalized.generatedAt
    || publicManifest.productionReferenceAt !== normalized.productionReferenceAt
    || publicManifest.zoneCount !== PRIVATE_RUNTIME_PREFLIGHT_POLICY.expectedZoneCount
    || publicManifest.coastalPartCount !== PRIVATE_RUNTIME_PREFLIGHT_POLICY.expectedPartCount
    || canonicalPrivateRuntimeJson(publicManifest.ravScoreModelBinding)
      !== canonicalPrivateRuntimeJson(normalized.modelBinding)) {
    throw new Error('Public manifest does not attest the cached private-runtime preflight state');
  }
  return normalized;
}

export async function materializePrivateRuntimePreflight({
  statePath,
  publicManifestPath,
  outputRoot,
  repositoryRoot = PRIVATE_RUNTIME_REPOSITORY_ROOT,
} = {}) {
  const repository = path.resolve(repositoryRoot);
  const output = path.resolve(outputRoot);
  if (!inside(repository, output)) throw new Error('Private runtime preflight output escapes repository');
  const [state, publicManifest] = await Promise.all([
    readJsonFile(repository, path.relative(repository, path.resolve(statePath)), 'Private runtime preflight state', PRIVATE_RUNTIME_PREFLIGHT_POLICY.maximumStateBytes),
    readJsonFile(repository, path.relative(repository, path.resolve(publicManifestPath)), 'Public preflight manifest', PRIVATE_RUNTIME_PREFLIGHT_POLICY.maximumStateBytes),
  ]);
  const verified = await validatePrivateRuntimePreflightState(state, {
    repositoryRoot: repository,
    publicManifest,
  });
  const files = new Map([
    ['data/live/conditions.json', {
      datasetId: verified.datasetId,
      generatedAt: verified.generatedAt,
      productionReferenceAt: verified.productionReferenceAt,
    }],
    ['data/live/dmi-bulk-cache.json', {
      schemaVersion: 2,
      refreshStatus: verified.dmiBulkRefreshStatus,
      runs: Object.fromEntries(Object.entries(verified.dmiRuns)
        .map(([collection, referenceTime]) => [collection, { referenceTime }])),
    }],
    ['data/diagnostics/dmi-ocean-diagnostics.json', {
      schemaVersion: 1,
      generatedAt: verified.oceanDiagnosticsGeneratedAt,
      refreshStatus: verified.oceanDiagnosticsStatus,
    }],
    ['data/live/ravradar-runtime-diagnostics.json', {
      schemaVersion: 1,
      acquisition: {
        prioritizedMissingOrExpiringZones: verified.prioritizedMissingOrExpiringZones,
        bulkModelDownloads: { refreshStatus: verified.bulkRefreshStatus, diagnostics: {} },
      },
      dataQuality: { forecast: { completeDmiZones: verified.completeDmiZones } },
      health: { dmi: { totalZones: verified.totalZones } },
      duplicateTimes: { zones: verified.duplicateZones },
    }],
  ]);
  for (const [relativePath, document] of files) {
    const target = path.resolve(output, relativePath);
    if (!inside(output, target)) throw new Error('Private runtime preflight file escapes output root');
    await atomicWriteJson(target, document);
  }
  return {
    materialized: true,
    fileCount: files.size,
    datasetId: verified.datasetId,
    privatePayloadIncluded: false,
    rawVectorsIncluded: false,
    coordinatesIncluded: false,
  };
}

async function collectFiles(root, directory = root, rows = []) {
  const children = await fs.readdir(directory, { withFileTypes: true });
  for (const child of children) {
    const absolute = path.join(directory, child.name);
    const stat = await fs.lstat(absolute);
    if (child.isSymbolicLink() || stat.isSymbolicLink()) {
      throw new Error('Restored private runtime contains a symbolic link');
    }
    if (child.isDirectory()) await collectFiles(root, absolute, rows);
    else if (child.isFile()) rows.push(path.relative(root, absolute).split(path.sep).join('/'));
    else throw new Error('Restored private runtime contains a non-regular entry');
  }
  return rows;
}

async function assertNoSymlinkComponents(root, candidate, label) {
  const relative = path.relative(root, candidate);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes its root`);
  }
  let current = root;
  for (const component of relative.split(path.sep)) {
    current = path.join(current, component);
    const stat = await fs.lstat(current).catch(error => {
      if (error?.code === 'ENOENT') return null;
      throw error;
    });
    if (!stat) continue;
    if (stat.isSymbolicLink()) throw new Error(`${label} traverses a symbolic link`);
  }
}

export async function installRestoredPrivateRuntime({
  restoredRoot,
  repositoryRoot = PRIVATE_RUNTIME_REPOSITORY_ROOT,
  renameImpl = fs.rename,
  removeImpl = fs.rm,
} = {}) {
  const requestedSourceRoot = path.resolve(restoredRoot);
  const requestedRepository = path.resolve(repositoryRoot);
  const sourceRootStat = await fs.lstat(requestedSourceRoot).catch(() => null);
  const repositoryStat = await fs.lstat(requestedRepository).catch(() => null);
  if (!sourceRootStat?.isDirectory() || sourceRootStat.isSymbolicLink()
    || !repositoryStat?.isDirectory() || repositoryStat.isSymbolicLink()) {
    throw new Error('Restored private runtime root or repository root is invalid');
  }
  const sourceRoot = await fs.realpath(requestedSourceRoot);
  const repository = await fs.realpath(requestedRepository);
  if (inside(repository, sourceRoot) || inside(sourceRoot, repository)) {
    throw new Error('Restored private runtime must remain outside the repository tree');
  }
  const actual = (await collectFiles(sourceRoot)).sort(compareText);
  const expected = PRIVATE_RUNTIME_FILES.map(file => file.relativePath).sort(compareText);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error('Restored private runtime inventory is incompatible');
  }

  const transactionId = `${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  const staged = [];
  let mutationStarted = false;
  try {
    for (const descriptor of PRIVATE_RUNTIME_FILES) {
      const source = path.resolve(sourceRoot, descriptor.relativePath);
      const destination = path.resolve(repository, descriptor.relativePath);
      if (!inside(sourceRoot, source) || !inside(repository, destination)) {
        throw new Error('Private runtime install path escapes its root');
      }
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await assertNoSymlinkComponents(repository, destination, 'Private runtime install path');
      const destinationStat = await fs.lstat(destination).catch(error => {
        if (error?.code === 'ENOENT') return null;
        throw error;
      });
      if (destinationStat && (!destinationStat.isFile() || destinationStat.isSymbolicLink())) {
        throw new Error('Private runtime install destination is not a regular file');
      }
      const temporary = `${destination}.private-restore-${transactionId}`;
      const previous = `${destination}.private-previous-${transactionId}`;
      await fs.copyFile(source, temporary, fs.constants.COPYFILE_EXCL);
      staged.push({
        temporary,
        destination,
        previous,
        destinationExisted: Boolean(destinationStat),
        previousMoved: false,
        installed: false,
      });
    }
    mutationStarted = true;
    for (const row of staged) {
      if (row.destinationExisted) {
        await renameImpl(row.destination, row.previous);
        row.previousMoved = true;
      }
      await renameImpl(row.temporary, row.destination);
      row.installed = true;
    }
    await Promise.all(staged.map(row => removeImpl(row.previous, { force: true }).catch(() => {})));
  } catch (error) {
    let rollbackError = null;
    if (mutationStarted) {
      for (const row of [...staged].reverse()) {
        try {
          if (row.installed) await removeImpl(row.destination, { force: true });
          if (row.previousMoved) await fs.rename(row.previous, row.destination);
        } catch (failure) {
          rollbackError ??= failure;
        }
      }
    }
    await Promise.all(staged.flatMap(row => [row.temporary, row.previous]
      .map(file => removeImpl(file, { force: true }).catch(() => {}))));
    if (rollbackError) {
      const wrapped = new Error('Private runtime install failed and rollback could not restore every file');
      wrapped.cause = error;
      throw wrapped;
    }
    throw error;
  }
  return {
    installed: true,
    fileCount: PRIVATE_RUNTIME_FILES.length,
    privateDataLogged: false,
  };
}

function argument(argv, name, required = true) {
  const index = argv.indexOf(name);
  const value = index >= 0 ? argv[index + 1] : null;
  if (required && (!value || value.startsWith('--'))) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const [mode, ...argv] = process.argv.slice(2);
  const repositoryRoot = argument(argv, '--repository-root', false)
    ?? PRIVATE_RUNTIME_REPOSITORY_ROOT;
  if (mode === 'create-spec') {
    const output = argument(argv, '--output');
    const spec = await buildPrivateRuntimeCreateSpec({ repositoryRoot });
    await atomicWriteJson(output, spec);
    console.log(JSON.stringify({ status: 'create-spec-ready', fileCount: spec.files.length }));
  } else if (mode === 'expected') {
    const output = argument(argv, '--output');
    const expected = await buildPrivateRuntimeExpectation({
      repositoryRoot,
      targetReferenceAt: argument(argv, '--target-reference'),
    });
    await atomicWriteJson(output, expected);
    console.log(JSON.stringify({ status: 'expectation-ready' }));
  } else if (mode === 'create-preflight') {
    const output = argument(argv, '--output');
    const state = await buildPrivateRuntimePreflightState({ repositoryRoot });
    await atomicWriteJson(output, state);
    console.log(JSON.stringify({
      status: 'preflight-state-ready',
      datasetId: state.datasetId,
      privatePayloadIncluded: false,
    }));
  } else if (mode === 'materialize-preflight') {
    const result = await materializePrivateRuntimePreflight({
      repositoryRoot,
      statePath: argument(argv, '--state'),
      publicManifestPath: argument(argv, '--public-manifest'),
      outputRoot: argument(argv, '--output-root'),
    });
    console.log(JSON.stringify(result));
  } else if (mode === 'install') {
    const result = await installRestoredPrivateRuntime({
      repositoryRoot,
      restoredRoot: argument(argv, '--restored'),
    });
    console.log(JSON.stringify(result));
  } else {
    throw new Error('Use create-spec, expected, create-preflight, materialize-preflight or install');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`Private runtime workflow integration failed closed: ${error.message}`);
    process.exitCode = 1;
  });
}
