#!/usr/bin/env node
// Exact owner-approved presence diagnosis. Never applied-routing reconstruction.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEALED_CURRENT_SOURCE_TARGET, sealedCurrentSourceExpectation } from './audit-sealed-current-source.mjs';
import { verifyPrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';
import { readDmiBulkDocument } from './lib/dmi-bulk-storage.mjs';
import { buildDmiForecastHourly, verifiedDmiForecastSource } from './lib/dmi-forecast-store.mjs';
import { inspectDmiForecastFile, readDmiForecastRecord } from './lib/dmi-forecast-file.mjs';
import { unpackDmiPartContinuity } from './lib/dmi-part-continuity.mjs';
import { dmiExpectedIdentityForPart } from './lib/ravscore-production-adapters.mjs';
import { PRIVATE_WEATHER_COMPONENT_FILES } from './lib/private-weather-component-inventory.mjs';
import { PRIVATE_CONDITIONS_MAX_BYTES } from './lib/bounded-json-writer.mjs';
import { assertPrivateConditionsHourly } from './lib/private-conditions-hourly.mjs';
import { weatherComponentProgressCache, withAuthenticatedWeatherProgress, WEATHER_PROGRESS_CIPHER_PATH } from './weather-component-progress-cache.mjs';
import { withoutSavedAuditSecrets } from './audit-saved-weather-inputs.mjs';

export const FUR_NATIVE_TARGET = Object.freeze({
  cacheId: 8470342142, runId: 37164593278, runAttempt: 1,
  sourceHead: 'a459b846d9d19351127d46bdab544e6bc50dc24b',
  cacheKey: 'weather-private-progress-encrypted-v2-Linux-main-37164593278-1',
  cacheVersion: 'eb60dda795be04d99d83cf18a2b0f726141c8e39fa6b9391c46e79bbe29087b6',
  cacheBytes: 112679349, ciphertextBytes: 112674885,
  partId: 'dk-b05-17-national-part-04', zoneId: 'DK-B05-17',
  firstHour: '2026-10-08T07:00:00.000Z', lastHour: '2026-10-08T13:00:00.000Z',
});
const hours = Object.freeze(Array.from({ length: 7 }, (_, i) =>
  new Date(Date.parse(FUR_NATIVE_TARGET.firstHour) + i * 3_600_000).toISOString()));
const fail = code => { throw new Error(`FUR_NATIVE_PRESENCE_${code}`); };
const finite = value => typeof value === 'number' && Number.isFinite(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateFurNativeTarget(cache, run) {
  const t = FUR_NATIVE_TARGET, repository = SEALED_CURRENT_SOURCE_TARGET.repository;
  if (cache?.id !== t.cacheId || cache.key !== t.cacheKey || cache.version !== t.cacheVersion
    || cache.ref !== 'refs/heads/main' || cache.size_in_bytes !== t.cacheBytes
    || run?.id !== t.runId || run.run_attempt !== t.runAttempt || run.head_sha !== t.sourceHead
    || run.status !== 'completed' || run.conclusion !== 'failure' || run.head_branch !== 'main'
    || run.path !== '.github/workflows/run-current-weather-once.yml' || run.event !== 'workflow_dispatch'
    || run.repository?.full_name !== repository || run.head_repository?.full_name !== repository) fail('TARGET_REJECTED');
  return true;
}

// Canonical scalar adapter only; no station registry, route selection or score.
// A native-backed seven-hour series is not evidence of the actually used route.
export function summarizeFurNativeEntity(bulk, entityId, expectedIdentity) {
  const zone = bulk?.zones?.[entityId];
  if (!zone) return { code: 'ENTITY_NOT_PRESENT', numericExactHours: 0, verifiedExactHours: 0, verifiedSupportedHours: 0 };
  if (!object(zone) || !object(zone.hourly) && !Array.isArray(zone.hourly)) fail('NATIVE_SHAPE');
  const rows = Array.isArray(zone.hourly) ? zone.hourly : Object.values(zone.hourly);
  const times = new Set();
  for (const row of rows) {
    const ms = Date.parse(row?.time);
    if (!Number.isFinite(ms) || times.has(ms)) fail('NATIVE_TIME');
    times.add(ms);
  }
  const built = buildDmiForecastHourly({
    ocean: rows.map(row => ({ step: row.time, 'sea-mean-deviation': row['sea-mean-deviation'],
      provenance: { waterLevel: row.sources?.waterLevel } })),
    generatedAt: bulk.generatedAt, startAt: FUR_NATIVE_TARGET.firstHour, hours: 7,
    sourceCadenceMinutes: Number(bulk.timeStrideHours ?? 3) * 60,
  });
  const verified = built.hourly.filter(row => finite(row.waterLevelCm)
    && verifiedDmiForecastSource(row.sources?.waterLevel, 'waterLevel', row.time, expectedIdentity));
  return { code: 'NATIVE_PRESENCE_MEASURED',
    numericExactHours: hours.filter(time => rows.some(row => Date.parse(row.time) === Date.parse(time)
      && finite(row['sea-mean-deviation']))).length,
    verifiedExactHours: verified.filter(row => row.sources.waterLevel.temporalResolution === 'native').length,
    verifiedSupportedHours: verified.length };
}

export function originalFurSourceInventory(bulk) {
  if (!object(bulk?.zones)) fail('ORIGINAL_SOURCE_INVENTORY');
  const ids = Object.keys(bulk.zones).filter(id => id.startsWith('SOURCE::')).sort();
  if (ids.length > 1024) fail('SCOPE');
  return ids.map(id => {
    const point = bulk.zones[id]?.samplingPoint;
    if (!Array.isArray(point) || point.length !== 2 || !point.every(finite)) fail('ORIGINAL_SOURCE_IDENTITY');
    return { entityId: id, parentZoneId: id, entityType: 'water-level-source',
      samplingContext: 'water-level-source-point', samplingPoint: [...point] };
  });
}

export function summarizeFurNativeBank(bulk, part, originalSources) {
  if (!bulk) return { code: 'BANK_NOT_PRESENT', directPartSupportedHours: 0, sourceEntitiesPresent: 0,
    sourceEntitiesWithAllSevenHours: 0, sourceSupportedHours: 0 };
  const partIdentity = dmiExpectedIdentityForPart(part);
  if (!partIdentity || !Array.isArray(originalSources) || originalSources.length > 1024
    || new Set(originalSources.map(source => source?.entityId)).size !== originalSources.length
    || originalSources.some(source => typeof source?.entityId !== 'string' || !source.entityId.startsWith('SOURCE::')
      || source.parentZoneId !== source.entityId || source.entityType !== 'water-level-source'
      || source.samplingContext !== 'water-level-source-point'
      || !Array.isArray(source.samplingPoint) || source.samplingPoint.length !== 2 || !source.samplingPoint.every(finite))) fail('SCOPE');
  const direct = summarizeFurNativeEntity(bulk, partIdentity.entityId, partIdentity);
  let sourceEntitiesPresent = 0, sourceEntitiesWithAllSevenHours = 0, sourceSupportedHours = 0;
  for (const expected of originalSources) {
    const zone = bulk?.zones?.[expected.entityId];
    if (!zone) continue;
    sourceEntitiesPresent++;
    const count = summarizeFurNativeEntity(bulk, expected.entityId, expected).verifiedSupportedHours;
    sourceEntitiesWithAllSevenHours += Number(count === 7); sourceSupportedHours += count;
  }
  return { code: 'ORIGINAL_SOURCE_INVENTORY_PRESENCE_NOT_ROUTING_JOIN',
    directPartNumericExactHours: direct.numericExactHours, directPartVerifiedExactHours: direct.verifiedExactHours,
    directPartSupportedHours: direct.verifiedSupportedHours,
    sourceEntitiesPresent, sourceEntitiesWithAllSevenHours, sourceSupportedHours };
}

async function persistedPartPresence(file, part) {
  if (!file) return { code: 'FORECAST_NOT_PRESENT', verifiedDirectPartHours: 0 };
  const index = await inspectDmiForecastFile(file);
  if (!index.continuity) return { code: 'PART_CONTINUITY_NOT_PRESENT', verifiedDirectPartHours: 0 };
  let selected = null;
  for (const descriptor of index.continuity.entries) {
    const entry = await readDmiForecastRecord(index, descriptor);
    if (entry.partId === part.partId) {
      if (selected) fail('DUPLICATE_PART');
      selected = entry;
    }
  }
  if (!selected) return { code: 'PART_NOT_PRESENT', verifiedDirectPartHours: 0 };
  const decoded = await unpackDmiPartContinuity({ ...index.continuity.metadata, partCount: 1,
    rawBytes: selected.rawBytes, compressedBytes: selected.compressedBytes, entries: [selected] },
  [part], index.continuity.metadata.productionReferenceAt);
  const record = decoded.get(part.partId);
  if (!record) fail('ORIGINAL_PART_IDENTITY');
  const identity = dmiExpectedIdentityForPart(part);
  return { code: 'PERSISTED_DIRECT_PART_NOT_PREVIOUS_ROUTED_WINNER', verifiedDirectPartHours:
    record.hourly.filter(row => hours.includes(row.time) && finite(row.waterLevelCm)
      && verifiedDmiForecastSource(row.sources?.waterLevel, 'waterLevel', row.time, identity)).length };
}

export async function auditFurNativePresence({ repositoryRoot, privateRoot, bundlePath, cipherPath,
  masterSecret = process.env.WEATHER_PROGRESS_MASTER_SECRET, pythonExecutable = process.env.PYTHON } = {}) {
  const expected = await sealedCurrentSourceExpectation(repositoryRoot);
  await verifyPrivateProductionRuntimeBundle({ repositoryRoot, privateRoot, bundlePath, expected });
  const payload = path.join(bundlePath, 'payload');
  const conditionsPath = path.join(payload, 'data/live/conditions.json');
  const stat = await fs.lstat(conditionsPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > PRIVATE_CONDITIONS_MAX_BYTES) fail('CONDITIONS_BOUND');
  let conditions = JSON.parse(await fs.readFile(conditionsPath, 'utf8'));
  assertPrivateConditionsHourly(conditions);
  const original = conditions.coastalParts?.parts?.[FUR_NATIVE_TARGET.partId];
  if (conditions.datasetId !== expected.datasetId || conditions.productionReferenceAt !== expected.productionReferenceAt
    || original?.zoneId !== FUR_NATIVE_TARGET.zoneId) fail('ORIGINAL_PART_IDENTITY');
  const part = { partId: FUR_NATIVE_TARGET.partId, zoneId: original.zoneId,
    sourceZoneId: original.sourceZoneId, parentZoneId: original.parentZoneId, waterPoint: [...original.waterPoint] };
  conditions = null;
  let originalBulk = await readDmiBulkDocument(path.join(payload, 'data/live/dmi-bulk-cache.json'));
  const originalSources = originalFurSourceInventory(originalBulk);
  const baseline = { native: summarizeFurNativeBank(originalBulk, part, originalSources),
    persisted: await persistedPartPresence(path.join(payload, 'data/live/dmi-forecast-cache.json'), part) };
  originalBulk = null; // Release the baseline native bank before reading either progress bank.
  const manifest = JSON.parse(await fs.readFile(path.join(bundlePath, 'manifest.json'), 'utf8'));
  const basePath = path.join(privateRoot, 'fur-original-progress-base.json');
  const captured = await weatherComponentProgressCache({ mode: 'capture-base', repositoryRoot: payload,
    basePath, repository: SEALED_CURRENT_SOURCE_TARGET.repository, protectedBundleSha256: manifest.bundleContentSha256 });
  if (captured.captured !== true) fail('BASE_CAPTURE');
  const cipherStat = await fs.lstat(cipherPath);
  if (!cipherStat.isFile() || cipherStat.isSymbolicLink() || cipherStat.size !== FUR_NATIVE_TARGET.ciphertextBytes) fail('CIPHER_BOUND');
  await fs.mkdir(path.join(payload, '.cache'), { recursive: true, mode: 0o700 });
  await fs.copyFile(cipherPath, path.join(payload, WEATHER_PROGRESS_CIPHER_PATH), fs.constants.COPYFILE_EXCL);
  const progress = await withoutSavedAuditSecrets(() => withAuthenticatedWeatherProgress({
    repositoryRoot: payload, basePath, repository: SEALED_CURRENT_SOURCE_TARGET.repository,
    masterSecret, pythonExecutable }, async ({ files }) => {
    const find = name => files.find(file => file.relativePath === name)?.sourcePath;
    const banks = {};
    for (const [label, name] of [['active', PRIVATE_WEATHER_COMPONENT_FILES.dmiActive],
      ['candidate', PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate]]) {
      const file = find(name);
      banks[label] = summarizeFurNativeBank(file ? await readDmiBulkDocument(file) : null, part, originalSources);
    }
    return { ...banks, persisted: await persistedPartPresence(find('data/live/dmi-forecast-cache.json'), part) };
  }));
  return { kind: 'FUR_NATIVE_PRESENCE_AUDIT', code: 'EXACT_ORIGINAL_BASELINE_AND_CACHE_AUTHENTICATED',
    targetHourCount: 7, originalSourceEntityCount: originalSources.length, baseline, progress,
    causalAttribution: 'NOT_PROVED_APPLIED_ROUTING_CONFIG_NOT_PERSISTED',
    privatePayloadIncluded: false, providersCalled: false, scoreGenerated: false,
    productionPointerUnchanged: true, nativeRowsSynthesized: false };
}

export function parseFurAuditArguments(input) {
  const [mode, ...args] = input;
  const keys = mode === 'target' ? ['--cache', '--run'] : mode === 'inspect'
    ? ['--repository-root', '--private-root', '--bundle', '--cipher', '--report'] : null;
  if (!keys || args.length !== keys.length * 2) fail('ARGUMENT');
  const values = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!keys.includes(args[i]) || Object.hasOwn(values, args[i])
      || typeof args[i + 1] !== 'string' || !args[i + 1] || args[i + 1].startsWith('--')) fail('ARGUMENT');
    values[args[i]] = args[i + 1];
  }
  if (keys.some(key => !Object.hasOwn(values, key))) fail('ARGUMENT');
  return { mode, values };
}

export function furPresenceFailureSummary(error) {
  const known = new Set(['BASELINE_MISMATCH', 'SNAPSHOT_AUTHENTICATION_FAILED', 'SNAPSHOT_SCOPE_MISMATCH',
    'SNAPSHOT_INVALID', 'SIZE_BUDGET_INVALID', 'SNAPSHOT_ABSENT', 'TEMPORARY_CLEANUP_FAILED']);
  return { kind: 'FUR_NATIVE_PRESENCE_AUDIT', status: 'FAILURE',
    code: known.has(error?.progressCode) ? error.progressCode : 'FAILED_CLOSED',
    targetHourCount: 7, privatePayloadIncluded: false, providersCalled: false, scoreGenerated: false,
    productionPointerUnchanged: true, causalAttribution: 'NOT_PROVED' };
}

async function writeSafeReport(file, report) {
  const encoded = `${JSON.stringify(report)}\n`;
  if (Buffer.byteLength(encoded) > 4096) fail('REPORT_BOUND');
  await fs.writeFile(file, encoded, { flag: 'wx', mode: 0o600 });
}

async function main() {
  const { mode, values: args } = parseFurAuditArguments(process.argv.slice(2));
  if (mode === 'target') validateFurNativeTarget(JSON.parse(await fs.readFile(args['--cache'], 'utf8')),
    JSON.parse(await fs.readFile(args['--run'], 'utf8')));
  else {
    let result;
    try {
      result = await auditFurNativePresence({ repositoryRoot: args['--repository-root'],
        privateRoot: args['--private-root'], bundlePath: args['--bundle'], cipherPath: args['--cipher'] });
    } catch (error) {
      await writeSafeReport(args['--report'], furPresenceFailureSummary(error));
      throw error;
    }
    await writeSafeReport(args['--report'], result);
  }
  console.log('FUR_NATIVE_PRESENCE_STEP_SUCCESS');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('FUR_NATIVE_PRESENCE_FAILED_CLOSED'); process.exitCode = 1; });
}
