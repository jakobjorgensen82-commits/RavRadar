import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {verifyPrivateProductionRuntimeBundle} from './private-production-runtime-bundle.mjs';
import {buildPrivateRuntimeExpectation} from './private-production-runtime-workflow.mjs';
import {createProtectedPrivateRuntimeClients, describeCurrentProtectedPrivateProductionRuntime}
  from './protected-private-production-runtime.mjs';
import {createProtectedRavScoreCheckpointVersionRequester,
  PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY}
  from './protected-ravscore-continuation-checkpoint.mjs';
import {RAVSCORE_CONTINUATION_CHECKPOINT_POLICY, saveRavScoreContinuationCheckpoint}
  from './ravscore-continuation-checkpoint.mjs';


import {requireAssistantAfter601Binding} from './lib/assistant-later-h0-successor-source.mjs';
import {assertPrivateConditionsHourly} from './lib/private-conditions-hourly.mjs';
import {PRIVATE_CONDITIONS_MAX_BYTES} from './lib/bounded-json-writer.mjs';
import {PRIVATE_WEATHER_COMPONENT_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE, privateWeatherComponentMarker}
  from './lib/private-weather-component-inventory.mjs';
import {readDmiBulkDocument} from './lib/dmi-bulk-storage.mjs';
import {inspectDmiForecastFile} from './lib/dmi-forecast-file.mjs';
import {readCurrentPrivateRuntimeCompanionInput, readAuthenticatedCurrentCompanions}
  from './read-authenticated-dmi-current-companions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'jakobjorgensen82-commits/RavRadar';
const WORKFLOW = REPO + '/.github/workflows/run-current-weather-once.yml@refs/heads/main';
const PRIVATE_ROOT = '/tmp/ravradar-private-production-runtime';
const BUNDLE = PRIVATE_ROOT + '/bundle';
const CHECKPOINT = '.cache/ravscore-continuation-checkpoint/checkpoint.json';
const KEY = PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY;
const VERSION_QUERY = '?document_key=eq.' + encodeURIComponent(KEY) + '&select=document_key,version&limit=2';
const SHA256 = /^[a-f0-9]{64}$/;

function requireProof(condition, reason) {
  if (!condition) throw new Error('RAW_ROTATION_PUBLISHED_PAIR_' + reason);
}

async function readCheckpoint(pathname) {
  const stat = await fs.lstat(pathname, {bigint: true});
  requireProof(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1n && stat.size > 0n
    && stat.size <= BigInt(RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumSerializedBytes), 'S_FILE');
  const raw = await fs.readFile(pathname);
  const next = await fs.lstat(pathname, {bigint: true});
  requireProof(next.isFile() && !next.isSymbolicLink() && next.nlink === 1n && next.dev === stat.dev
    && next.ino === stat.ino && next.size === stat.size && next.mtimeNs === stat.mtimeNs
    && next.ctimeNs === stat.ctimeNs && BigInt(raw.length) === stat.size, 'S_CHANGED');
  return {data: JSON.parse(raw.toString('utf8')), stat, sha256: crypto.createHash('sha256').update(raw).digest('hex')};
}

// Only the existing ordinary workflow after successful publication of B and S
// may call this reader. It reuses both protected readers and does not publish.
async function readPublishedRawRotationRuntime() {
  const env = process.env;
  const head = env.GITHUB_SHA;
  const lockedHour = env.RAVRADAR_PRODUCTION_TARGET_HOUR;
  const target = lockedHour?.replace(/Z$/, '.000Z');
  const timestamp = Date.parse(target ?? '');
  const admittedAssistantSuccessor = env.OPERATIONAL_ACTION === 'integrated-historical-maintenance'
    && env.RAW_ASSISTANT_LATER_H0_UPLOAD_ADMITTED === 'true';
  requireProof(process.platform === 'linux' && env.RUNNER_ENVIRONMENT === 'github-hosted'
    && env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === REPO && env.GITHUB_WORKFLOW_REF === WORKFLOW
    && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_REF === 'refs/heads/main'
    && env.GITHUB_ACTOR === 'github-actions[bot]' && env.GITHUB_TRIGGERING_ACTOR === 'github-actions[bot]'
    && env.GITHUB_RUN_ATTEMPT === '1' && /^[1-9][0-9]{0,19}$/.test(env.GITHUB_RUN_ID ?? '')
    && /^[a-f0-9]{40}$/.test(head ?? '') && env.RAVRADAR_PRIVATE_RUNTIME_ROOT === PRIVATE_ROOT
    && env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE === BUNDLE
    && ['CURRENT_FAMILY_COLD_START', 'EPOCH_BOOTSTRAP', 'EPOCH_REENTRY', 'NATIVE_IDENTITY_RECOVERY',
      'COMPLETED_PRIVATE_RUNTIME', 'CHECKPOINT_ONLY', 'QUICK_CONFIRMATION'].every(key => env[key] === 'false')
    && (env.OPERATIONAL_ACTION === 'integrated' || admittedAssistantSuccessor)
    && env.RAW_POWERED_BY_ORDINARY_PUBLICATION === 'true'
    && env.RAW_PRIOR_CONTINUITY_SCHEMA === '2' && env.COMPLETED_STAGE_SOURCE === ''
    && env.COMPLETED_PRIVATE_RUNTIME_PIN === '' && env.QUICK_PROGRESS_SOURCE === ''
    && env.PRODUCE_HANDOFF === 'false' && env.GITHUB_JOB === 'build-and-prepare'
    && env.GITHUB_WORKSPACE === ROOT
    && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/.test(lockedHour ?? '')
    && Number.isFinite(timestamp) && timestamp % 3_600_000 === 0
    && new Date(timestamp).toISOString() === target, 'WORKFLOW');
  requireProof(execFileSync('git', ['rev-parse', 'HEAD^{commit}'], {cwd: ROOT, encoding: 'utf8'}).trim() === head, 'HEAD');

  const {documentRequest} = createProtectedPrivateRuntimeClients({storageBackend: 'supabase'});
  const describe = async () => {
    let centralVersion;
    const current = await describeCurrentProtectedPrivateProductionRuntime({request: async (...args) => {
      const rows = await documentRequest(...args);
      if (rows.length === 1) centralVersion = Number(rows[0].version);
      return rows;
    }});
    return {...current, centralVersion};
  };
  const current = await describe();
  requireProof(current.sourceHead === head && current.productionReferenceAt === target
    && current.expectedZoneCount === 210 && current.expectedPartCount === 673
    && SHA256.test(current.bundleContentSha256) && Number.isSafeInteger(current.centralVersion)
    && current.centralVersion > 0, 'B_POINTER');
  const successorBinding = admittedAssistantSuccessor ? requireAssistantAfter601Binding() : null;
  if (successorBinding) {
    requireProof(current.modelBinding?.modelBundleSha256 === successorBinding.I
      && current.contractHashes?.continuationStateContractSha256 === successorBinding.T,
    'ASSISTANT_AFTER601_BINDING');
  }
  const postedVersion = Number(env.RAW_PUBLISHED_S_VERSION);
  const postedGeneration = env.RAW_PUBLISHED_S_GENERATION_SHA256;
  requireProof(/^[1-9][0-9]*$/.test(env.RAW_PUBLISHED_S_VERSION ?? '')
    && Number.isSafeInteger(postedVersion) && SHA256.test(postedGeneration ?? ''), 'S_RECEIPT');
  const payload = path.join(BUNDLE, 'payload');
  const bundlePaths = [path.join(BUNDLE, 'manifest.json'),
    path.join(payload, 'data/live/conditions.json'), path.join(payload, FORECAST),
    path.join(payload, BULK), path.join(payload, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath)];
  const bundlePins = await Promise.all(bundlePaths.map(file => fs.lstat(file, {bigint: true})));
  const verifyBundleFiles = async () => {
    const current = await Promise.all(bundlePaths.map(file => fs.lstat(file, {bigint: true})));
    requireProof(current.every((stat, index) => sameBoundFile(bundlePins[index], stat)), 'B_LOCAL_MOVED');
  };
  const expected = await buildPrivateRuntimeExpectation({repositoryRoot: ROOT, targetReferenceAt: target});
  const verifyBundle = async () => {
    const verified = await verifyPrivateProductionRuntimeBundle({
      privateRoot: PRIVATE_ROOT, bundlePath: BUNDLE, repositoryRoot: ROOT,
      expected: {...expected, datasetId: current.datasetId, productionReferenceAt: target,
        generatedAt: current.generatedAt, bundleContentSha256: current.bundleContentSha256},
    });
    requireProof(verified.bundleContentSha256 === current.bundleContentSha256
      && isDeepStrictEqual(verified.manifest.modelBinding, current.modelBinding)
      && isDeepStrictEqual(verified.manifest.contractHashes, current.contractHashes), 'B_IDENTITY');
    return verified;
  };
  const verified = await verifyBundle();
  await verifyBundleFiles();
  const conditionsPath = path.join(BUNDLE, 'payload/data/live/conditions.json');
  const conditionEntry = verified.files.find(file => file.relativePath === 'data/live/conditions.json');
  requireProof(conditionEntry && SHA256.test(conditionEntry.sha256), 'B_CONDITIONS');

  const builtPath = path.join(ROOT, CHECKPOINT);
  const built = await readCheckpoint(builtPath);
  const readVersion = createProtectedRavScoreCheckpointVersionRequester();
  const parent = await fs.realpath(os.tmpdir());
  const scratch = await fs.mkdtemp(path.join(parent, 'rr-raw-rotation-'));
  const owned = await fs.lstat(scratch, {bigint: true});
  const expectedPath = path.join(scratch, 'checkpoint.json');
  try {
    await saveRavScoreContinuationCheckpoint({
      repositoryRoot: ROOT, sourcePath: conditionsPath, checkpointPath: expectedPath,
    });
    const fromB = await readCheckpoint(expectedPath);
    if (successorBinding) {
      requireProof(fromB.data.candidateGRollbackCompanion?.modelBinding?.modelBundleSha256 === successorBinding.C,
        'ASSISTANT_AFTER601_CHECKPOINT_BINDING');
    }
    requireProof(fromB.data.datasetId === current.datasetId && fromB.data.productionReferenceAt === target
      && fromB.data.generationSha256 === postedGeneration && isDeepStrictEqual(fromB.data, built.data), 'B_S_PUBLISHED');
  } finally {
    const actual = await fs.lstat(scratch, {bigint: true});
    requireProof(actual.isDirectory() && !actual.isSymbolicLink() && actual.dev === owned.dev
      && actual.ino === owned.ino && await fs.realpath(scratch) === scratch, 'SCRATCH_OWNERSHIP');
    await fs.rm(expectedPath, {force: true});
    await fs.rmdir(scratch);
  }
  const verifyCurrent = async () => {
    requireProof(isDeepStrictEqual(await describe(), current), 'B_POINTER_MOVED');
    const versions = await readVersion(VERSION_QUERY);
    requireProof(versions.length === 1 && versions[0].document_key === KEY
      && versions[0].version === postedVersion, 'S_VERSION_MOVED');
    requireProof(sameBoundFile(built.stat, await fs.lstat(builtPath, {bigint: true})), 'S_LOCAL_MOVED');
  };
  const verify = async () => {
    await verifyCurrent();
    await verifyBundleFiles();
  };
  return Object.freeze({verified, conditionsPath, checkpoint: built.data,
    published: Object.freeze({bSourceHead: head, bVersion: current.centralVersion, sVersion: postedVersion}),
    boundary: Object.freeze({datasetId: current.datasetId, productionReferenceAt: target,
      bundleContentSha256: current.bundleContentSha256, checkpointGenerationSha256: built.data.generationSha256,
      conditionsSha256: conditionEntry.sha256}), verify});
}

const PACK_MAGIC = Buffer.from('RR-WEATHER-COMPONENT-PACK-1\n');
const MANIFEST = 'data/live/manifest.json';
const REGISTRY = 'data/live/coastal-parts-v2.json';
const ZONES = 'data/zones.geojson';
const BULK = 'data/live/dmi-bulk-cache.json';
const FORECAST = 'data/live/dmi-forecast-cache.json';
const ROLES = Object.freeze([
  PRIVATE_WEATHER_COMPONENT_FILES.dmiActive,
  PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate,
]);

function sameBoundFile(a, b) {
  return a.isFile() && b.isFile() && !a.isSymbolicLink() && !b.isSymbolicLink()
    && a.nlink === 1n && b.nlink === 1n
    && ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'].every(key => a[key] === b[key]);
}

async function readExact(handle, bytes, position) {
  const buffer = Buffer.alloc(bytes);
  for (let offset = 0; offset < bytes;) {
    const {bytesRead} = await handle.read(buffer, offset, bytes - offset, position + offset);
    requireProof(bytesRead > 0, 'PACK_TRUNCATED');
    offset += bytesRead;
  }
  return buffer;
}

// The normal B reader has already checked the entire sealed pack. Its closing
// verify() checks the file identity before returning the proof. This lookup
// selects only the original file identities for the three fixed working roles.
async function componentRoleBindings(verified, conditions) {
  const entry = verified.files.find(file => file.id === PRIVATE_WEATHER_COMPONENT_PACK_FILE.id);
  requireProof(entry?.relativePath === PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath, 'PACK_REQUIRED');
  const file = path.join(verified.bundlePath, 'payload', entry.relativePath);
  const handle = await fs.open(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await handle.stat({bigint: true});
    requireProof(stat.isFile() && stat.nlink === 1n && stat.size === BigInt(entry.bytes)
      && sameBoundFile(stat, await fs.lstat(file, {bigint: true})), 'PACK_CHANGED');
    const prefix = await readExact(handle, PACK_MAGIC.length + 4, 0);
    requireProof(prefix.subarray(0, PACK_MAGIC.length).equals(PACK_MAGIC), 'PACK_HEADER');
    const bytes = prefix.readUInt32BE(PACK_MAGIC.length);
    requireProof(bytes >= 2 && bytes <= 32 * 1024 * 1024 && bytes + prefix.length <= entry.bytes, 'PACK_HEADER');
    const manifest = JSON.parse((await readExact(handle, bytes, prefix.length)).toString('utf8'));
    requireProof(manifest.kind === 'PRIVATE_WEATHER_COMPONENT_PACK' && manifest.schemaVersion === 1
      && Array.isArray(manifest.files) && manifest.files.length <= 65536
      && isDeepStrictEqual(manifest.marker, privateWeatherComponentMarker(conditions)), 'PACK_HEADER');
    let total = prefix.length + bytes;
    const seen = new Set();
    const selected = new Map();
    for (const row of manifest.files) {
      requireProof(typeof row.relativePath === 'string' && !seen.has(row.relativePath)
        && Number.isSafeInteger(row.bytes) && row.bytes > 0 && SHA256.test(row.sha256)
        && row.bytes <= entry.bytes - total, 'PACK_ENTRY');
      seen.add(row.relativePath);
      total += row.bytes;
      if (ROLES.includes(row.relativePath)) selected.set(row.relativePath, row);
    }
    requireProof(total === entry.bytes && sameBoundFile(stat, await handle.stat({bigint: true}))
      && sameBoundFile(stat, await fs.lstat(file, {bigint: true})), 'PACK_CHANGED');
    return selected;
  } finally {
    await handle.close();
  }
}

async function readStableJson(file, maximum) {
  const stat = await fs.lstat(file, {bigint: true});
  requireProof(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1n
    && stat.size > 0n && stat.size <= BigInt(maximum), 'JSON_SIZE');
  const bytes = await fs.readFile(file);
  const verify = async () => {
    requireProof(sameBoundFile(stat, await fs.lstat(file, {bigint: true})), 'JSON_CHANGED');
  };
  await verify();
  requireProof(BigInt(bytes.length) === stat.size, 'JSON_CHANGED');
  return {bytes, verify};
}

async function readBoundJson(file, expected, maximum) {
  requireProof(typeof expected?.sha256 === 'string' && SHA256.test(expected.sha256)
    && Number.isSafeInteger(expected.bytes) && expected.bytes > 0 && expected.bytes <= maximum, 'JSON_BOUND');
  const {bytes, verify} = await readStableJson(file, expected.bytes);
  requireProof(bytes.length === expected.bytes && crypto.createHash('sha256').update(bytes).digest('hex') === expected.sha256,
    'JSON_CHANGED');
  return {data: JSON.parse(bytes.toString('utf8')), verify};
}

async function verifyWorkingWeatherFile(relative, expected) {
  const file = path.join(ROOT, relative);
  const first = await fs.lstat(file, {bigint: true}).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (expected === undefined) {
    requireProof(first === null, 'UNBOUND_WORKING_ROLE');
    return async () => {
      const present = await fs.lstat(file).catch(error => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
      requireProof(present === null, 'WORKING_ROLE_APPEARED');
    };
  }
  requireProof(first?.isFile() && !first.isSymbolicLink() && first.nlink === 1n
    && first.size === BigInt(expected.bytes), 'WORKING_ROLE_IDENTITY');
  const handle = await fs.open(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  const stable = async () => {
    requireProof(sameBoundFile(first, await fs.lstat(file, {bigint: true})), 'WORKING_ROLE_CHANGED');
  };
  try {
    requireProof(sameBoundFile(first, await handle.stat({bigint: true})), 'WORKING_ROLE_CHANGED');
    const hash = crypto.createHash('sha256');
    for await (const bytes of handle.createReadStream({autoClose: false})) hash.update(bytes);
    requireProof(hash.digest('hex') === expected.sha256
      && sameBoundFile(first, await handle.stat({bigint: true})), 'WORKING_ROLE_CHANGED');
    await stable();
  } finally {
    await handle.close();
  }
  return stable;
}

// Fixed successor view. It reads existing files from this runner under the
// same owner. No working weather input is installed, copied or overwritten.
export async function readPublishedRawRotationInputs() {
  const {verified, conditionsPath, checkpoint, boundary, published, verify} = await readPublishedRawRotationRuntime();
  const contents = await readBoundJson(conditionsPath,
    verified.files.find(file => file.relativePath === 'data/live/conditions.json'), PRIVATE_CONDITIONS_MAX_BYTES);
  const conditions = contents.data;
  assertPrivateConditionsHourly(conditions);
  const roles = await componentRoleBindings(verified, conditions);
  const workingChecks = [contents.verify];
  for (const relative of ROLES) workingChecks.push(await verifyWorkingWeatherFile(relative, roles.get(relative)));

  const {registry, zones, forecast, protectedBulk, verify: verifyInputs} =
    await readRawRotationWeatherInputs({verified, boundary, manifestPath: path.join(ROOT, MANIFEST)});
  workingChecks.push(verifyInputs);
  const dmi = new Map();
  for (const relative of roles.keys()) {
    dmi.set(relative, await readDmiBulkDocument(path.join(ROOT, relative)));
  }
  const candidate = dmi.get(PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate) ?? null;
  const active = dmi.get(PRIVATE_WEATHER_COMPONENT_FILES.dmiActive) ?? null;
  const conditionIdentity = {datasetId: conditions.datasetId, productionReferenceAt: conditions.productionReferenceAt,
    coastalParts: {parts: Object.fromEntries(Object.keys(conditions.coastalParts.parts).map(id => [id, null]))}};
  return Object.freeze({
    registry, conditions: conditionIdentity, checkpoint, boundary, published, protectedBulk, forecast, zones,
    progressCandidate: candidate ?? active, progressActive: active,
    // This scope has proven schema2 both before calculation and after publication.
    // The ordinary historical donor and the one-time schema1 transport preparation are absent.
    historicalBulk: null, protectedCompanionContexts: [...dmi.values()], transportCaptures: [],
    verify: async () => {
      await verify();
      for (const check of workingChecks) await check();
    },
  });
}


async function readRawRotationWeatherInputs({verified, boundary, manifestPath}) {
  const manifestStat = await fs.lstat(manifestPath, {bigint: true});
  requireProof(manifestStat.isFile() && !manifestStat.isSymbolicLink() && manifestStat.nlink === 1n
    && manifestStat.size > 0n && manifestStat.size <= 512n * 1024n, 'MANIFEST_REQUIRED');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  requireProof(manifest.complete === true && manifest.datasetId === boundary.datasetId
    && manifest.productionReferenceAt === boundary.productionReferenceAt
    && manifest.generatedAt === verified.generatedAt && manifest.zoneCount === 210 && manifest.coastalPartCount === 673,
    'MANIFEST_GENERATION');
  const registryDescriptor = {bytes: manifest.coastalPartsBytes, sha256: manifest.coastalPartsSha256};
  const zonesDescriptor = {bytes: manifest.zoneRegistryBytes, sha256: manifest.zoneRegistrySha256};
  const registryFile = await readBoundJson(path.join(ROOT, REGISTRY), registryDescriptor, 16 * 1024 * 1024);
  const zonesFile = await readBoundJson(path.join(ROOT, ZONES), zonesDescriptor, 32 * 1024 * 1024);
  const registry = registryFile.data;
  return {
    registry, zones: zonesFile.data, ...await readRawRotationBulkInputs(verified, boundary, registry),
    verify: async () => {
      requireProof(sameBoundFile(manifestStat, await fs.lstat(manifestPath, {bigint: true})), 'MANIFEST_CHANGED');
      await registryFile.verify();
      await zonesFile.verify();
    },
  };
}

async function readRawRotationBulkInputs(verified, boundary, registry) {
  requireProof(registry.partCount === 673 && Object.keys(registry.zones ?? {}).length === 210, 'REGISTRY_SCOPE');
  const payload = path.join(verified.bundlePath, 'payload');
  const forecast = await inspectDmiForecastFile(path.join(payload, FORECAST));
  requireProof(forecast.continuity?.metadata.schemaVersion === 2
    && forecast.continuity.metadata.productionReferenceAt === boundary.productionReferenceAt, 'PART_CONTINUITY');
  return {forecast, protectedBulk: await readDmiBulkDocument(path.join(payload, BULK))};
}

// Read the authenticated B/S that remains live if this weather run stops.
// Use its immutable companion roles, even when the work copies were changed
// by the progressive DMI setup for the newly locked target.
export async function readRetainedRawRotationInputs({demand, assistantSuccessor = false}) {
  const boundary = demand?.rawRetention?.boundary;
  const expectedCheckpoint = demand?.sourceHashes?.checkpoint;
  const expectedRegistry = demand?.registrySha256;
  requireProof(boundary && /^sha256:[a-f0-9]{64}$/.test(expectedCheckpoint ?? '')
    && /^sha256:[a-f0-9]{64}$/.test(expectedRegistry ?? ''), 'BASELINE_INPUT');
  const {verified, conditions, conditionsSha256, originalConditions, originalConditionsSha256, verify: verifyBundle} =
    await readCurrentPrivateRuntimeCompanionInput(demand.productionReferenceAt);
  // The exact assistant transition preserves the original B while its
  // validated working S belongs to the projected conditions.
  const boundaryConditionsMatch = assistantSuccessor
    ? originalConditions !== undefined && originalConditionsSha256 === boundary.conditionsSha256
    : originalConditions === undefined && conditionsSha256 === boundary.conditionsSha256;
  requireProof(boundaryConditionsMatch && verified.datasetId === boundary.datasetId
    && verified.productionReferenceAt === boundary.productionReferenceAt
    && verified.bundleContentSha256 === boundary.bundleContentSha256, 'BASELINE_INPUT');
  const checkpointPath = path.join(ROOT, CHECKPOINT);
  const checkpoint = await readCheckpoint(checkpointPath);
  requireProof('sha256:' + checkpoint.sha256 === expectedCheckpoint
    && checkpoint.data.generationSha256 === boundary.checkpointGenerationSha256, 'BASELINE_INPUT');
  // The public manifest may be unavailable or behind the installed B/S after
  // a Pages failure. Reuse the registry from the successful normal demand.
  const registryFile = await readStableJson(path.join(ROOT, REGISTRY), 16 * 1024 * 1024);
  const zonesFile = await readStableJson(path.join(ROOT, ZONES), 32 * 1024 * 1024);
  requireProof('sha256:' + crypto.createHash('sha256').update(registryFile.bytes).digest('hex') === expectedRegistry,
    'REGISTRY_SCOPE');
  const registry = JSON.parse(registryFile.bytes.toString('utf8'));
  const inputs = await readRawRotationBulkInputs(verified, boundary, registry);
  const protectedCompanionContexts = await readAuthenticatedCurrentCompanions(verified, originalConditions ?? conditions);
  return {
    ...inputs, registry, zones: JSON.parse(zonesFile.bytes.toString('utf8')),
    conditions, checkpoint: checkpoint.data, boundary, protectedCompanionContexts,
    progressCandidate: null, progressActive: null, historicalBulk: null, transportCaptures: [],
    verify: async () => {
      await verifyBundle();
      await registryFile.verify();
      await zonesFile.verify();
      requireProof(sameBoundFile(checkpoint.stat, await fs.lstat(checkpointPath, {bigint: true})), 'S_CHANGED');
    },
  };
}
