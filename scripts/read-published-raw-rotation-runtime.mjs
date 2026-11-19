
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
import {createProtectedRavScoreCheckpointRequester, createProtectedRavScoreCheckpointVersionRequester,
  PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY, restoreProtectedRavScoreContinuationCheckpoint}
  from './protected-ravscore-continuation-checkpoint.mjs';
import {RAVSCORE_CONTINUATION_CHECKPOINT_POLICY, saveRavScoreContinuationCheckpoint}
  from './ravscore-continuation-checkpoint.mjs';


import {assertPrivateConditionsHourly} from './lib/private-conditions-hourly.mjs';
import {PRIVATE_CONDITIONS_MAX_BYTES} from './lib/bounded-json-writer.mjs';
import {PRIVATE_WEATHER_COMPONENT_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE, privateWeatherComponentMarker}
  from './lib/private-weather-component-inventory.mjs';
import {readDmiBulkDocument} from './lib/dmi-bulk-storage.mjs';
import {inspectDmiForecastFile} from './lib/dmi-forecast-file.mjs';
import {readLiveCurrentPilot} from './lib/live-current-pilot.mjs';

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

// A cache owner can compare the authenticated B pointer and S version without
// downloading either large protected payload again.
export function createRawRotationProtectedMetadataReaders() {
  const {documentRequest} = createProtectedPrivateRuntimeClients({storageBackend: 'supabase'});
  const requestVersion = createProtectedRavScoreCheckpointVersionRequester();
  const readProtectedB = async () => {
    let centralVersion;
    const identity = await describeCurrentProtectedPrivateProductionRuntime({request: async (...args) => {
      const rows = await documentRequest(...args);
      centralVersion = Number(rows?.[0]?.version);
      return rows;
    }});
    requireProof(Number.isSafeInteger(centralVersion) && centralVersion > 0, 'B_VERSION');
    return {...identity, centralVersion};
  };
  const readProtectedSVersion = async () => {
    const rows = await requestVersion(VERSION_QUERY);
    requireProof(rows.length === 1 && rows[0].document_key === KEY
      && Number.isSafeInteger(rows[0].version) && rows[0].version > 0, 'S_VERSION');
    return rows[0].version;
  };
  return {readProtectedB, readProtectedSVersion};
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
  return {data: JSON.parse(raw.toString('utf8')), sha256: crypto.createHash('sha256').update(raw).digest('hex')};
}

// Only the existing ordinary workflow after successful publication of B and S
// may call this reader. It reuses both protected readers and does not publish.
export async function readPublishedRawRotationRuntime() {
  const env = process.env;
  const head = env.GITHUB_SHA;
  const lockedHour = env.RAVRADAR_PRODUCTION_TARGET_HOUR;
  const target = lockedHour?.replace(/Z$/, '.000Z');
  const timestamp = Date.parse(target ?? '');
  requireProof(process.platform === 'linux' && env.RUNNER_ENVIRONMENT === 'github-hosted'
    && env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === REPO && env.GITHUB_WORKFLOW_REF === WORKFLOW
    && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_REF === 'refs/heads/main'
    && env.GITHUB_ACTOR === 'github-actions[bot]' && env.GITHUB_TRIGGERING_ACTOR === 'github-actions[bot]'
    && env.GITHUB_RUN_ATTEMPT === '1' && /^[1-9][0-9]{0,19}$/.test(env.GITHUB_RUN_ID ?? '')
    && /^[a-f0-9]{40}$/.test(head ?? '') && env.RAVRADAR_PRIVATE_RUNTIME_ROOT === PRIVATE_ROOT
    && env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE === BUNDLE
    && ['CURRENT_FAMILY_COLD_START', 'EPOCH_BOOTSTRAP', 'EPOCH_REENTRY', 'NATIVE_IDENTITY_RECOVERY',
      'COMPLETED_PRIVATE_RUNTIME', 'CHECKPOINT_ONLY', 'QUICK_CONFIRMATION'].every(key => env[key] === 'false')
    && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/.test(lockedHour ?? '')
    && Number.isFinite(timestamp) && timestamp % 3_600_000 === 0
    && new Date(timestamp).toISOString() === target, 'WORKFLOW');
  requireProof(execFileSync('git', ['rev-parse', 'HEAD^{commit}'], {cwd: ROOT, encoding: 'utf8'}).trim() === head, 'HEAD');

  const {readProtectedB, readProtectedSVersion} = createRawRotationProtectedMetadataReaders();
  const current = await readProtectedB();
  requireProof(current.sourceHead === head && current.productionReferenceAt === target
    && current.expectedZoneCount === 210 && current.expectedPartCount === 673
    && SHA256.test(current.bundleContentSha256), 'B_POINTER');
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
  const conditionsPath = path.join(BUNDLE, 'payload/data/live/conditions.json');
  const conditionEntry = verified.files.find(file => file.relativePath === 'data/live/conditions.json');
  requireProof(conditionEntry && SHA256.test(conditionEntry.sha256), 'B_CONDITIONS');

  const builtPath = path.join(ROOT, CHECKPOINT);
  const built = await readCheckpoint(builtPath);
  const readProtected = createProtectedRavScoreCheckpointRequester();
  const parent = await fs.realpath(os.tmpdir());
  const scratch = await fs.mkdtemp(path.join(parent, 'rr-raw-rotation-'));
  const owned = await fs.lstat(scratch, {bigint: true});
  let postedVersion;
  try {
    const expectedPath = path.join(scratch, 'from-b', CHECKPOINT);
    const postedPath = path.join(scratch, 'from-published-s', CHECKPOINT);
    await saveRavScoreContinuationCheckpoint({
      repositoryRoot: ROOT, sourcePath: conditionsPath, checkpointPath: expectedPath,
    });
    const fromB = await readCheckpoint(expectedPath);
    requireProof(fromB.data.datasetId === current.datasetId && fromB.data.productionReferenceAt === target
      && SHA256.test(fromB.data.generationSha256) && isDeepStrictEqual(fromB.data, built.data), 'B_S_LOCAL');
    const posted = await restoreProtectedRavScoreContinuationCheckpoint({
      checkpointPath: postedPath, targetReference: target,
      request: async (...args) => {
        const rows = await readProtected(...args);
        if (rows.length === 1) postedVersion = rows[0].version;
        return rows;
      },
    });
    requireProof(posted.restored === true && posted.reason === 'protected-checkpoint-restored'
      && Number.isSafeInteger(postedVersion) && postedVersion > 0, 'S_READBACK');
    const fromS = await readCheckpoint(postedPath);
    requireProof(isDeepStrictEqual(fromS.data, fromB.data), 'B_S_PUBLISHED');
  } finally {
    const actual = await fs.lstat(scratch, {bigint: true});
    requireProof(actual.isDirectory() && !actual.isSymbolicLink() && actual.dev === owned.dev
      && actual.ino === owned.ino && await fs.realpath(scratch) === scratch, 'SCRATCH_OWNERSHIP');
    await fs.rm(scratch, {recursive: true});
  }
  const verifyCurrent = async () => {
    requireProof(isDeepStrictEqual(await readProtectedB(), current), 'B_POINTER_MOVED');
    requireProof(await readProtectedSVersion() === postedVersion, 'S_VERSION_MOVED');
    requireProof((await readCheckpoint(builtPath)).sha256 === built.sha256, 'S_LOCAL_MOVED');
  };
  await verifyCurrent();
  const verify = async () => {
    await verifyCurrent();
    requireProof(isDeepStrictEqual(await verifyBundle(), verified), 'B_LOCAL_MOVED');
  };
  return Object.freeze({verified, conditionsPath, checkpoint: built.data,
    publication: Object.freeze({sourceHead: current.sourceHead, bVersion: current.centralVersion, sVersion: postedVersion}),
    boundary: Object.freeze({datasetId: current.datasetId, productionReferenceAt: target,
      bundleContentSha256: current.bundleContentSha256, checkpointGenerationSha256: built.data.generationSha256,
      conditionsSha256: conditionEntry.sha256}), verify});
}

const PACK_MAGIC = Buffer.from('RR-WEATHER-COMPONENT-PACK-1\n');
const PILOT = 'data/live/current-pilot-history.json';
const POLICY = 'data/current-regional-proxy-policy.json';
const MANIFEST = 'data/live/manifest.json';
const REGISTRY = 'data/live/coastal-parts-v2.json';
const ZONES = 'data/zones.geojson';
const BULK = 'data/live/dmi-bulk-cache.json';
const FORECAST = 'data/live/dmi-forecast-cache.json';
const ROLES = Object.freeze([
  PRIVATE_WEATHER_COMPONENT_FILES.dmiActive,
  PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate,
  PRIVATE_WEATHER_COMPONENT_FILES.currentFieldShadow,
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
// verify() checks the same bytes again after collection. This header lookup
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

async function readBoundJson(file, expected, maximum) {
  requireProof(typeof expected?.sha256 === 'string' && SHA256.test(expected.sha256)
    && Number.isSafeInteger(expected.bytes) && expected.bytes > 0 && expected.bytes <= maximum, 'JSON_BOUND');
  const stat = await fs.lstat(file, {bigint: true});
  requireProof(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1n
    && stat.size === BigInt(expected.bytes), 'JSON_SIZE');
  const bytes = await fs.readFile(file);
  requireProof(bytes.length === expected.bytes && crypto.createHash('sha256').update(bytes).digest('hex') === expected.sha256,
    'JSON_CHANGED');
  const verify = async () => {
    requireProof(sameBoundFile(stat, await fs.lstat(file, {bigint: true})), 'JSON_CHANGED');
  };
  await verify();
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
  const {verified, conditionsPath, checkpoint, boundary, verify} = await readPublishedRawRotationRuntime();
  const contents = await readBoundJson(conditionsPath,
    verified.files.find(file => file.relativePath === 'data/live/conditions.json'), PRIVATE_CONDITIONS_MAX_BYTES);
  const conditions = contents.data;
  assertPrivateConditionsHourly(conditions);
  const roles = await componentRoleBindings(verified, conditions);
  const pilot = verified.files.find(file => file.relativePath === PILOT);
  requireProof(pilot, 'PILOT_REQUIRED');
  const workingChecks = [contents.verify, await verifyWorkingWeatherFile(PILOT, pilot)];
  for (const relative of ROLES) workingChecks.push(await verifyWorkingWeatherFile(relative, roles.get(relative)));

  const manifestPath = path.join(ROOT, MANIFEST);
  const manifestStat = await fs.lstat(manifestPath, {bigint: true});
  requireProof(manifestStat.isFile() && !manifestStat.isSymbolicLink() && manifestStat.size > 0n
    && manifestStat.size <= 512n * 1024n, 'MANIFEST_REQUIRED');
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
  requireProof(registry.partCount === 673 && Object.keys(registry.zones ?? {}).length === 210, 'REGISTRY_SCOPE');
  workingChecks.push(registryFile.verify, zonesFile.verify);

  const policy = execFileSync('git', ['show', 'HEAD:' + POLICY], {cwd: ROOT, maxBuffer: 1024 * 1024});
  workingChecks.push(await verifyWorkingWeatherFile(POLICY,
    {bytes: policy.length, sha256: crypto.createHash('sha256').update(policy).digest('hex')}));

  const payload = path.join(verified.bundlePath, 'payload');
  const forecast = await inspectDmiForecastFile(path.join(payload, FORECAST));
  requireProof(forecast.continuity?.metadata.schemaVersion === 2
    && forecast.continuity.metadata.productionReferenceAt === boundary.productionReferenceAt, 'PART_CONTINUITY');
  const protectedBulk = await readDmiBulkDocument(path.join(payload, BULK));
  const dmi = new Map();
  for (const relative of roles.keys()) {
    if (relative !== PRIVATE_WEATHER_COMPONENT_FILES.currentFieldShadow) {
      dmi.set(relative, await readDmiBulkDocument(path.join(ROOT, relative)));
    }
  }
  const candidate = dmi.get(PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate) ?? null;
  const active = dmi.get(PRIVATE_WEATHER_COMPONENT_FILES.dmiActive) ?? null;
  const liveCurrentPilot = await readLiveCurrentPilot(registry);
  return Object.freeze({
    registry, conditions, checkpoint, boundary, protectedBulk, liveCurrentPilot, forecast, zones: zonesFile.data,
    progressCandidate: candidate ?? active, progressActive: active,
    historicalBulk: null, protectedCompanionContexts: [...dmi.values()],
    verify: async () => {
      await verify();
      requireProof(sameBoundFile(manifestStat, await fs.lstat(manifestPath, {bigint: true})), 'MANIFEST_CHANGED');
      for (const check of workingChecks) await check();
    },
  });
}
