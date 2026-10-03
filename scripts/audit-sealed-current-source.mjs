#!/usr/bin/env node
// One owner-approved, immutable saved package. No providers, pointer or score write.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPrivateRuntimeExpectation } from './private-production-runtime-workflow.mjs';
import { verifyPrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';
import { openStagedPrivateProductionRuntime } from './staged-private-production-runtime.mjs';
import { readDmiBulkDocument } from './lib/dmi-bulk-storage.mjs';
import { assertPrivateConditionsHourly } from './lib/private-conditions-hourly.mjs';
import { PRIVATE_CONDITIONS_MAX_BYTES } from './lib/bounded-json-writer.mjs';
import { coastNormalSpeedMpsFromUv, dmiExpectedIdentityForPart,
  verifiedBulkCurrent } from './lib/ravscore-production-adapters.mjs';
import { buildCurrentSupplyMemory, currentSupplyStrength } from '../js/core/ravscore-current-supply-memory.js';

export const SEALED_CURRENT_SOURCE_TARGET = Object.freeze({
  repository: 'jakobjorgensen82-commits/RavRadar', repositoryId: 1306858343,
  runId: 37136425685, runAttempt: 1,
  sourceHead: 'bbc3c79fe555dffbff4a88af8cdf54573953efdb',
  artifactId: 11281483201, artifactName: 'ravradar-private-build-stage-37136425685-1',
  artifactDigest: 'sha256:b9089a8adb6c864e9c040f31c5cf236b6a0cb87cdcdc71f34ff1693c40f96140',
  artifactBytes: 197244788, ciphertextBytes: 197244654,
  datasetId: 'rr-20261003175138-210',
  productionReferenceAt: '2026-10-03T16:00:00.000Z', generatedAt: '2026-10-03T17:51:38.558Z',
});
export const SEALED_CURRENT_SOURCE_PARTS = Object.freeze([
  ['DK-B01-01', 'dk-b01-01-national-part-01'],
  ['DK-B01-02', 'dk-b01-02-national-part-01'],
  ['DK-B01-03', 'dk-b01-03-national-part-01'],
].map(Object.freeze));
const GROUPS = Object.freeze(['LF_LAND_POINT', 'LF_OTHER', 'NSBS', 'OTHER_DMI', 'UNMATCHED']);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = code => { throw new Error(`SEALED_CURRENT_SOURCE_${code}`); };
const close = (a, b) => finite(a) && finite(b) && Math.abs(a - b) <= 1e-9;
const round = number => finite(number) ? Math.round(number * 1e6) / 1e6 : null;
const buckets = () => Object.fromEntries(GROUPS.map(group => [group, 0]));
const hour = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:00:00\.000Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const inputTimeKey = value => {
  const ms = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(ms) || ms % 3_600_000 !== 0) fail('INPUT_TIME_INVALID');
  return new Date(ms).toISOString(); // Lookup only; original source strings are never rewritten.
};

export function validateSealedCurrentSourceTarget(artifact, run, now = new Date().toISOString()) {
  const target = SEALED_CURRENT_SOURCE_TARGET;
  if (artifact?.id !== target.artifactId || artifact.name !== target.artifactName
    || artifact.digest !== target.artifactDigest || artifact.size_in_bytes !== target.artifactBytes
    || artifact.expired !== false || !(Date.parse(artifact.expires_at) > Date.parse(now))
    || artifact.workflow_run?.id !== target.runId
    || artifact.workflow_run?.head_sha !== target.sourceHead || artifact.workflow_run?.head_branch !== 'main'
    || artifact.workflow_run?.repository_id !== target.repositoryId
    || artifact.workflow_run?.head_repository_id !== target.repositoryId
    || run?.id !== target.runId || run.run_attempt !== target.runAttempt
    || run.status !== 'completed' || run.conclusion !== 'success'
    || run.head_sha !== target.sourceHead || run.head_branch !== 'main'
    || run.path !== '.github/workflows/run-current-weather-once.yml' || run.event !== 'workflow_dispatch'
    || run.repository?.full_name !== target.repository || run.head_repository?.full_name !== target.repository) fail('TARGET_REJECTED');
  return true;
}

export async function sealedCurrentSourceExpectation(repositoryRoot, now = new Date().toISOString()) {
  const target = SEALED_CURRENT_SOURCE_TARGET;
  return { ...await buildPrivateRuntimeExpectation({ repositoryRoot,
    targetReferenceAt: target.productionReferenceAt, now }),
  datasetId: target.datasetId, productionReferenceAt: target.productionReferenceAt, generatedAt: target.generatedAt };
}

function sourceGroup(source) {
  if (source?.collection === 'dkss_lf') {
    const point = source.gridPoint;
    return Array.isArray(point) && close(point[0], 8.2713201) && close(point[1], 56.827)
      ? 'LF_LAND_POINT' : 'LF_OTHER';
  }
  return source?.collection === 'dkss_nsbs' ? 'NSBS' : 'OTHER_DMI';
}

// The original context verifier and canonical signed-strength reducer are reused.
// A time/value match is NOT a persisted causal join: that limitation is explicit.
export function summarizeSealedCurrentPart(part, bulk) {
  const state = part?.ravScoreModel?.currentState;
  if (!object(part) || !hour(state?.time) || !hour(state.currentReferenceAt)
    || !Array.isArray(state.currentEvidence) || state.currentEvidence.length > 50
    || state.currentMemoryWindowHours !== 48 || !finite(part.onshoreDirectionDeg)) fail('STATE_INVALID');
  const nativeHold = state.currentReferenceAt !== state.time && state.currentNativeHoldAuthorization !== null;
  const replay = buildCurrentSupplyMemory(state.currentEvidence, {
    referenceTime: state.time, nativeHold, nativeHoldIntervalEnds: state.currentNativeHoldIntervalEnds,
    nativeHoldReferenceTime: nativeHold ? state.currentReferenceAt : null,
  });
  if (replay.memoryReady !== state.currentMemoryReady || replay.status !== state.currentMemoryStatus
    || replay.referenceTime !== state.currentReferenceAt || replay.coverageHours !== state.currentMemoryCoverageHours
    || !(replay.supplyPotential === null ? state.supplyPotential === null : close(replay.supplyPotential, state.supplyPotential))
    || JSON.stringify(replay.evidence) !== JSON.stringify(state.currentEvidence)) fail('STATE_REPLAY_MISMATCH');
  const bulkId = `PART::${part.partId}`;
  const zone = bulk?.zones?.[bulkId];
  const rawRows = Array.isArray(zone?.hourly) ? zone.hourly : Object.values(zone?.hourly ?? {});
  const byTime = new Map();
  for (const row of rawRows) {
    const key = inputTimeKey(row?.time);
    if (byTime.has(key)) fail('DUPLICATE_INPUT_TIME');
    byTime.set(key, row);
  }
  const sourceCounts = buckets();
  const effectiveDeltaByMatchingSource = buckets();
  const directionCounts = { inbound: 0, outbound: 0, deadband: 0, missing: 0 };
  const sourceAt = (time, strength) => {
    const row = byTime.get(time);
    const source = row?.sources?.current;
    if (!finite(row?.['current-u']) || !finite(row?.['current-v'])
      || !verifiedBulkCurrent(bulk, zone, part.waterPoint, source, time,
        dmiExpectedIdentityForPart(part, bulkId))) return 'UNMATCHED';
    const normalSpeed = coastNormalSpeedMpsFromUv(row['current-u'], row['current-v'], part.onshoreDirectionDeg);
    return close(currentSupplyStrength(normalSpeed), strength) ? sourceGroup(source) : 'UNMATCHED';
  };
  const lower = Date.parse(replay.referenceTime) - 48 * 3_600_000;
  for (const evidence of state.currentEvidence) {
    if (Date.parse(evidence.time) < lower || Date.parse(evidence.time) > Date.parse(replay.referenceTime)) continue;
    directionCounts[!finite(evidence.strength) ? 'missing'
      : evidence.strength > 0 ? 'inbound' : evidence.strength < 0 ? 'outbound' : 'deadband']++;
    sourceCounts[sourceAt(evidence.time, evidence.strength)]++;
  }
  for (const row of replay.rows) {
    const group = sourceAt(row.time, row.strength);
    effectiveDeltaByMatchingSource[group] += row.supplyPotential - row.previousSupplyPotential;
  }
  const controlHours = ['2026-10-03T16:00:00.000Z', '2026-10-03T19:00:00.000Z'].map(time => {
    const raw = byTime.get(time);
    const source = raw?.sources?.current;
    const admitted = finite(raw?.['current-u']) && finite(raw?.['current-v'])
      && Boolean(verifiedBulkCurrent(bulk, zone, part.waterPoint, source, time, dmiExpectedIdentityForPart(part, bulkId)));
    const strength = admitted ? currentSupplyStrength(coastNormalSpeedMpsFromUv(
      raw['current-u'], raw['current-v'], part.onshoreDirectionDeg)) : null;
    return { time, sourceGroup: admitted ? sourceGroup(source) : 'UNMATCHED', directionClass: strength === null
      ? 'NOT_VERIFIED' : strength > 0 ? 'INBOUND' : strength < 0 ? 'OUTBOUND' : 'DEADBAND' };
  });
  return { stateReferenceAt: state.time, currentReferenceAt: state.currentReferenceAt,
    windowHours: 48, coverageHours: round(replay.coverageHours), ready: replay.memoryReady,
    storedSupply: round(state.supplyPotential), replayedSupply: round(replay.supplyPotential), replayMatched: true,
    directionCounts, sourceCounts,
    effectiveDeltaByMatchingSource: Object.fromEntries(Object.entries(effectiveDeltaByMatchingSource).map(([key, value]) => [key, round(value)])),
    attribution: 'VERIFIED_SAVED_INPUT_TIME_AND_STRENGTH_MATCH_NOT_CAUSAL_JOIN', controlHours,
    originalGribCellMask: 'NOT_IN_BASE_INVENTORY_NOT_MEASURED' };
}

export async function auditSealedCurrentSource({ repositoryRoot, privateRoot, bundlePath, now } = {}) {
  if (process.env.STAGED_PRIVATE_BUILD_MASTER_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.GH_TOKEN || process.env.GITHUB_TOKEN) fail('SECRET_PRESENT_DURING_INSPECTION');
  const expected = await sealedCurrentSourceExpectation(repositoryRoot, now);
  const verified = await verifyPrivateProductionRuntimeBundle({ repositoryRoot, privateRoot, bundlePath, expected, now });
  const payload = path.join(bundlePath, 'payload');
  const file = path.join(payload, 'data/live/conditions.json');
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > PRIVATE_CONDITIONS_MAX_BYTES) fail('CONDITIONS_BOUND');
  const conditions = JSON.parse(await fs.readFile(file, 'utf8'));
  assertPrivateConditionsHourly(conditions); // Full existing inner integrity; no materialization/repacking.
  if (conditions.datasetId !== expected.datasetId || inputTimeKey(conditions.productionReferenceAt) !== expected.productionReferenceAt
    || conditions.generatedAt !== expected.generatedAt || Object.keys(conditions.zones ?? {}).length !== 210
    || Object.keys(conditions.coastalParts?.parts ?? {}).length !== 673) fail('CONDITIONS_IDENTITY');
  const bulk = await readDmiBulkDocument(path.join(payload, 'data/live/dmi-bulk-cache.json'));
  const parts = SEALED_CURRENT_SOURCE_PARTS.map(([zoneId, partId]) => {
    const original = conditions.coastalParts.parts[partId];
    if (original?.zoneId !== zoneId || !Array.isArray(original.waterPoint)
      || !original.waterPoint.every(finite)) fail('PART_IDENTITY');
    return { zoneId, partId, ...summarizeSealedCurrentPart({ ...original, partId }, bulk) };
  });
  const report = { kind: 'SEALED_CURRENT_SOURCE_AUDIT', schemaVersion: 1,
    artifactId: SEALED_CURRENT_SOURCE_TARGET.artifactId, sourceRunId: SEALED_CURRENT_SOURCE_TARGET.runId,
    sourceHead: SEALED_CURRENT_SOURCE_TARGET.sourceHead, datasetId: expected.datasetId,
    productionReferenceAt: expected.productionReferenceAt, generatedAt: expected.generatedAt,
    authenticatedBundle: true, fileCount: verified.fileCount, parts,
    privatePayloadIncluded: false, rawVectorsIncluded: false, coordinatesIncluded: false,
    providersCalled: false, scoreGenerated: false, productionPointerUnchanged: true };
  if (Buffer.byteLength(JSON.stringify(report)) > 32 * 1024) fail('REPORT_BOUND');
  return report;
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  const arg = key => { const index = args.indexOf(key); if (index < 0 || !args[index + 1]) fail('ARGUMENT'); return args[index + 1]; };
  if (mode === 'target') {
    validateSealedCurrentSourceTarget(JSON.parse(await fs.readFile(arg('--artifact'), 'utf8')),
      JSON.parse(await fs.readFile(arg('--run'), 'utf8')));
  } else if (mode === 'open') {
    const repositoryRoot = path.resolve(arg('--repository-root'));
    const inputPath = arg('--input');
    const stat = await fs.lstat(inputPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== SEALED_CURRENT_SOURCE_TARGET.ciphertextBytes) fail('CIPHERTEXT_BOUND');
    const result = await openStagedPrivateProductionRuntime({ repositoryRoot, privateRoot: arg('--private-root'),
      bundlePath: arg('--bundle'), inputPath, expected: await sealedCurrentSourceExpectation(repositoryRoot),
      repository: SEALED_CURRENT_SOURCE_TARGET.repository, runId: String(SEALED_CURRENT_SOURCE_TARGET.runId),
      runAttempt: String(SEALED_CURRENT_SOURCE_TARGET.runAttempt), sourceHead: SEALED_CURRENT_SOURCE_TARGET.sourceHead,
      masterSecret: process.env.STAGED_PRIVATE_BUILD_MASTER_SECRET });
    if (!result.restored || !result.productionPointerUnchanged) fail('RESTORE_REJECTED');
  } else if (mode === 'inspect') {
    const result = await auditSealedCurrentSource({ repositoryRoot: path.resolve(arg('--repository-root')),
      privateRoot: arg('--private-root'), bundlePath: arg('--bundle') });
    await fs.writeFile(arg('--report'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  } else fail('MODE');
  console.log(JSON.stringify({ kind: 'SEALED_CURRENT_SOURCE_AUDIT_STEP', status: 'SUCCESS', privatePayloadIncluded: false }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(async () => {
    const mode = process.argv[2];
    const reportIndex = process.argv.indexOf('--report');
    if (reportIndex >= 0 && process.argv[reportIndex + 1]) {
      await fs.writeFile(process.argv[reportIndex + 1], JSON.stringify({
        kind: 'SEALED_CURRENT_SOURCE_AUDIT', status: 'FAILED_CLOSED',
        failedMode: ['target', 'open', 'inspect'].includes(mode) ? mode : 'ARGUMENT',
        privatePayloadIncluded: false, rawVectorsIncluded: false,
        productionPointerUnchanged: true,
      }) + '\n', { flag: 'wx', mode: 0o600 }).catch(() => {});
    }
    console.error('SEALED_CURRENT_SOURCE_AUDIT_FAILED_CLOSED'); process.exitCode = 1;
  });
}
