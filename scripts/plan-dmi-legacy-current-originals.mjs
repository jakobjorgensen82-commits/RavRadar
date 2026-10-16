#!/usr/bin/env node
// Explicit post-materialization private request stage; no provider or replay.
import crypto from 'node:crypto';
import { fstat, fstatSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRavScoreLegacyCurrentOriginalRequests, RAVSCORE_CURRENT_HISTORY_DEMAND_PATH,
  RAVSCORE_LEGACY_CURRENT_ORIGINAL_REQUEST_PATH, RAVSCORE_LEGACY_CURRENT_ORIGINAL_SOURCE_PATHS }
  from './plan-ravscore-current-history.mjs';
import { readDmiBulkDocument } from './lib/dmi-bulk-storage.mjs';
import { inspectDmiForecastFile, readDmiForecastRecord } from './lib/dmi-forecast-file.mjs';
import { unpackDmiPartContinuity, assertDmiPartContinuityTotalSize } from './lib/dmi-part-continuity.mjs';
import { resolveProductionReferenceTime } from './lib/production-reference-time.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PATHS = Object.freeze({ registry: 'data/live/coastal-parts-v2.json',
  conditions: 'data/live/conditions.json', checkpoint: '.cache/ravscore-continuation-checkpoint/checkpoint.json',
  activation: '.cache/coastal-point-staging/activation-state-injection.json' });
const hash = bytes => 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex');
const refuse = reason => { const error = new Error('RAVSCORE_CURRENT_HISTORY_DEMAND_' + reason);
  error.code = error.message; throw error; };
function workflowTargetHour(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(value)) refuse('TARGET_REQUIRED');
  const canonical = value.length === 20 ? value.slice(0, -1) + '.000Z' : value;
  if (resolveProductionReferenceTime(canonical) !== canonical) refuse('NONCANONICAL_TIME');
  return canonical;
}
async function readFixed(relative) {
  const file = path.join(ROOT, relative), stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 2 || stat.size > 32 * 1024 * 1024) refuse('LEGACY_FILE_INVALID');
  const bytes = await fs.readFile(file);
  return { json: JSON.parse(bytes.toString('utf8')), sha256: hash(bytes) };
}
const ownedLegacyHashReaders = new Map();
async function closeOwnedLegacyHashReader(row, primary) {
  if (row.closeAttempted) refuse('LEGACY_HASH_READER_CLOSE_REPEATED');
  row.closeAttempted = true;
  try { await row.handle.close(); }
  catch (error) { primary ??= error; }
  // A fulfilled close can be a no-op. Keep the exact uncertain handle alive
  // and preserve the first failure; never retry a possibly reused numeric fd.
  try { fstatSync(row.fd); }
  catch (error) {
    if (error?.code === 'EBADF') row.closed = true;
    else primary ??= error;
  }
  if (!row.closed && !primary) {
    try { refuse('LEGACY_HASH_READER_CLOSE_UNPROVED'); }
    catch (error) { primary = error; }
  }
  if (row.closed) ownedLegacyHashReaders.delete(row.handle);
  return primary;
}
async function hashLegacyFixedFile(relative, optional = false) {
  const file = path.join(ROOT, relative);
  let stat;
  try { stat = await fs.lstat(file); }
  catch (error) { if (optional && error?.code === 'ENOENT') return null; throw error; }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 2 || stat.size > 2048 * 1024 * 1024) refuse('LEGACY_FILE_INVALID');
  const equal = (a, b) => ['dev', 'ino', 'size', 'mtimeMs'].every(key => a[key] === b[key]);
  const handle = await fs.open(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  const reader = { handle, fd: handle.fd, closeAttempted: false, closed: false };
  ownedLegacyHashReaders.set(handle, reader);
  let primary = null;
  try {
    if (!equal(stat, await handle.stat())) refuse('LEGACY_INPUT_CHANGED');
    const digest = crypto.createHash('sha256'), buffer = Buffer.allocUnsafe(256 * 1024);
    let total = 0;
    for (;;) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, total);
      if (!bytesRead) break;
      total += bytesRead;
      if (total > stat.size) refuse('LEGACY_INPUT_CHANGED');
      digest.update(buffer.subarray(0, bytesRead));
    }
    if (total !== stat.size || !equal(stat, await handle.stat()) || !equal(stat, await fs.lstat(file))) refuse('LEGACY_INPUT_CHANGED');
    return `sha256:${digest.digest('hex')}`;
  } catch (error) { primary = error; throw error; }
  finally {
    primary = await closeOwnedLegacyHashReader(reader, primary);
    if (primary) throw primary;
  }
}

async function legacyOriginalRequestsCli() {
  const productionReferenceAt = workflowTargetHour(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR);
  const history = await readFixed(RAVSCORE_CURRENT_HISTORY_DEMAND_PATH);
  if (history.json.productionReferenceAt !== productionReferenceAt) refuse('LEGACY_DEMAND_INVALID');
  const registry = await readFixed(SOURCE_PATHS.registry);
  if (registry.sha256 !== history.json.registrySha256) refuse('LEGACY_INPUT_CHANGED');
  for (const role of ['conditions', 'checkpoint', 'activation']) {
    if (await hashLegacyFixedFile(SOURCE_PATHS[role], true) !== history.json.sourceHashes?.[role]) refuse('LEGACY_INPUT_CHANGED');
  }
  const sourceHashes = {};
  for (const [role, relative] of Object.entries(RAVSCORE_LEGACY_CURRENT_ORIGINAL_SOURCE_PATHS)) {
    sourceHashes[role] = await hashLegacyFixedFile(relative, ['candidate', 'active'].includes(role));
  }
  const zones = await readFixed(RAVSCORE_LEGACY_CURRENT_ORIGINAL_SOURCE_PATHS.zones);
  if (zones.sha256 !== sourceHashes.zones) refuse('LEGACY_INPUT_CHANGED');
  const protectedBulk = await readDmiBulkDocument(path.join(ROOT, RAVSCORE_LEGACY_CURRENT_ORIGINAL_SOURCE_PATHS.deployedBulk));
  // This is the normal prefer-output candidate, not a speculative union of
  // future Python merges. The active donor is used only if candidate is absent.
  const progressRole = sourceHashes.candidate ? 'candidate' : sourceHashes.active ? 'active' : null;
  const progressCandidate = progressRole ? await readDmiBulkDocument(path.join(ROOT,
    RAVSCORE_LEGACY_CURRENT_ORIGINAL_SOURCE_PATHS[progressRole])) : null;
  const parts = new Map(Object.entries(registry.json.zones ?? {}).flatMap(([zoneId, entries]) =>
    entries.map(part => [part.partId, { ...part, zoneId }])));
  const forecast = await inspectDmiForecastFile(path.join(ROOT, RAVSCORE_LEGACY_CURRENT_ORIGINAL_SOURCE_PATHS.forecast));
  const persistedHourlyByPart = new Map();
  if (forecast.continuity) {
    const metadata = forecast.continuity.metadata;
    if (metadata.partCount !== parts.size || forecast.continuity.entries.length !== parts.size) refuse('LEGACY_FORECAST_INVALID');
    assertDmiPartContinuityTotalSize(metadata.rawBytes, metadata.compressedBytes);
    let rawBytes = 0, compressedBytes = 0, previous = null;
    for (const descriptor of forecast.continuity.entries) {
      const entry = await readDmiForecastRecord(forecast, descriptor), part = parts.get(entry.partId);
      if (!part || previous !== null && entry.partId.localeCompare(previous) <= 0) refuse('LEGACY_FORECAST_INVALID');
      previous = entry.partId; rawBytes += entry.rawBytes; compressedBytes += entry.compressedBytes;
      const decoded = await unpackDmiPartContinuity({ ...metadata, partCount: 1,
        rawBytes: entry.rawBytes, compressedBytes: entry.compressedBytes, entries: [entry] }, [part], productionReferenceAt);
      if (decoded.has(entry.partId)) persistedHourlyByPart.set(entry.partId, decoded.get(entry.partId));
    }
    if (rawBytes !== metadata.rawBytes || compressedBytes !== metadata.compressedBytes) refuse('LEGACY_FORECAST_INVALID');
  }
  const requests = buildRavScoreLegacyCurrentOriginalRequests({ registry: registry.json, zones: zones.json,
    historyDemand: history.json, historyDemandSha256: history.sha256, sourceHashes,
    protectedBulk, progressCandidate, progressRole, persistedHourlyByPart });
  // Bind actual unchanged prewrite files, not a token that could authenticate a
  // later mutated candidate. Updater independently rechecks before its writes.
  for (const [role, relative] of Object.entries(RAVSCORE_LEGACY_CURRENT_ORIGINAL_SOURCE_PATHS)) {
    if (await hashLegacyFixedFile(relative, ['candidate', 'active'].includes(role)) !== sourceHashes[role]) refuse('LEGACY_INPUT_CHANGED');
  }
  if ((await readFixed(RAVSCORE_CURRENT_HISTORY_DEMAND_PATH)).sha256 !== history.sha256
    || (await readFixed(SOURCE_PATHS.registry)).sha256 !== registry.sha256) refuse('LEGACY_INPUT_CHANGED');
  const cache = await fs.lstat(path.join(ROOT, '.cache'));
  if (!cache.isDirectory() || cache.isSymbolicLink()) refuse('LEGACY_FILE_INVALID');
  const bytes = Buffer.from(JSON.stringify(requests) + '\n');
  if (bytes.length > 192 * 1024 * 1024) refuse('LEGACY_PLAN_BOUND');
  const handle = await fs.open(path.join(ROOT, RAVSCORE_LEGACY_CURRENT_ORIGINAL_REQUEST_PATH),
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
  const ownedFd = handle.fd;
  let primary = null;
  try { await handle.writeFile(bytes); await handle.sync(); }
  catch (error) { primary = error; }
  try { await handle.close(); } catch (error) { primary ??= error; }
  if (!primary) {
    // Test the exact numeric descriptor with the OS, not the FileHandle's
    // logical closed flag or a fulfilled close promise. No-op close is failure.
    await new Promise((resolve, reject) => fstat(ownedFd, error => {
      if (error?.code === 'EBADF') resolve();
      else { try { refuse('LEGACY_WRITER_CLOSE_UNPROVED'); } catch (failure) { reject(failure); } }
    }));
  }
  if (primary) throw primary;
  const requestsSha256 = hash(bytes);
  const expectation = { productionReferenceAt: requests.productionReferenceAt, modelBinding: requests.modelBinding,
    historyDemandSha256: requests.historyDemandSha256, registrySha256: requests.registrySha256,
    sourceHashes: requests.sourceHashes, requestsSha256 };
  if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT,
    `requests_sha256=${requestsSha256}\nexpectation_json=${JSON.stringify(expectation)}\n`);
  console.log(JSON.stringify({ kind: requests.kind, requestCount: requests.reconstructionRequests.length,
    witnessCount: requests.projectionWitnesses.length, requestBytes: bytes.length, requestsSha256 }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (async () => {
    if (process.argv.length !== 2) refuse('ARGUMENTS_INVALID');
    await legacyOriginalRequestsCli();
  })().catch(error => {
    console.error(error.code ?? 'RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED'); process.exitCode = 1;
  });
}
