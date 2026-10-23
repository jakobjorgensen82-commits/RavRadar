// PRIVATE CALLER-ONLY PROTOTYPE. No installer, CLI, metadata transition or
// model authority is introduced here. The unchanged current-family origin
// reader remains the sole origin issuer. A JSON context is only a locator.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual as equal } from 'node:util';
import { createProtectedPrivateRuntimeClients, describeCurrentProtectedPrivateProductionRuntime,
  validateProtectedPrivateRuntimePointer, PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';
import { createProtectedRavScoreCheckpointRequester, restoreProtectedRavScoreContinuationCheckpoint }
  from './protected-ravscore-continuation-checkpoint.mjs';
import { verifyPrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';
import { saveRavScoreContinuationCheckpoint } from './ravscore-continuation-checkpoint.mjs';
import { privateRuntimeContractHashes } from './private-production-runtime-workflow.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateBinding } from './rollback-assets/ravscore-model-contract.js';
import { readEstablishedNativeCurrentOrigin } from './lib/established-native-current-origin.mjs';
import { createWeatherStateEpochCaptureStorage, saveWeatherStateEpochArchive,
  rehydrateLocalWeatherStateEpochArchive, assertVerifiedWeatherStateEpochArchive,
  WEATHER_STATE_EPOCH_PUBLIC_FILES } from './lib/weather-state-epoch-archive.mjs';
import { hydratePrivateConditionsHourly } from './lib/private-conditions-hourly.mjs';
import { inspectPrivatePublicHourDeliveryPack } from './lib/public-hour-delivery-pack.mjs';
import { withoutCurrent } from './lib/private-dmi-recovery-record.mjs';
import { decodeDmiBulkWrapper, readDmiBulkDocument, writeDmiBulkDocument } from './lib/dmi-bulk-storage.mjs';
import { ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './lib/private-weather-component-pack.mjs';
import { PRIVATE_WEATHER_COMPONENT_PACK_FILE } from './lib/private-weather-component-inventory.mjs';
import { inspectDmiForecastFile, readDmiForecastRecord, writeDmiForecastRecords,
  DMI_FORECAST_FILE_MAX_BYTES } from './lib/dmi-forecast-file.mjs';
import { packDmiPartContinuity, unpackDmiPartContinuity, assertDmiPartContinuityTotalSize }
  from './lib/dmi-part-continuity.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAPABILITIES = new WeakMap(), FAILED_CLOSES = new Map();
const SHA = /^[a-f0-9]{64}$/, MB = 1024 * 1024;
export const CURRENT_FAMILY_COLD_START_CONTEXT_ENV = Object.freeze({
  path: 'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_PATH',
  sha256: 'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_SHA256',
});
const SCALARS = Object.freeze(['wind-speed-10m', 'wind-dir-10m', 'wind-tail-u-10m',
  'wind-tail-v-10m', 'wind-tail-speed-10m', 'wind-tail-dir-10m', 'significant-wave-height',
  'dominant-wave-period', 'mean-wave-dir', 'sea-mean-deviation', 'water-temperature']);
const SCALAR_COMPONENTS = Object.freeze(['wind', 'windTail', 'wave', 'waterLevel', 'waterTemperature']);
const FIXED_CANDIDATE = path.join(ROOT, '.cache/dmi-candidate-progress.json');
const FIXED_ACTIVE = path.join(ROOT, '.cache/dmi-active-complete.json');
// Fixed mutable aliases only. OLD B/S/conditions and scalar reserve banks are
// never retired. These files otherwise survive into the next ordinary pack.
const RETIRED_CURRENT_FILES = Object.freeze({
  active: '.cache/dmi-active-complete.json',
  regional: '.cache/current-field-shadow.json',
  copernicusShadow: '.cache/copernicus-current-shadow.json',
  copernicusStage: '.cache/copernicus-current-source-stage.json',
  copernicusDonor: '.cache/copernicus-current-donor-bank.json',
  copernicusJournal: '.cache/copernicus-current-segment-journal.json',
  openMeteoFallback: '.cache/open-meteo-current-fallback.json',
  openMeteoDonor: '.cache/open-meteo-current-donor-bank.json',
  pilot: 'data/live/current-pilot-history.json',
  pointDmi: '.cache/coastal-point-staging/dmi.json',
  pointState: '.cache/coastal-point-staging/state.json',
  pointStatus: '.cache/coastal-point-staging/status.json',
  pointInjection: '.cache/coastal-point-staging/activation-state-injection.json',
  pointPromotion: '.cache/coastal-point-staging/pending-promotion.json',
});
const MIXED_BULK_FILES = Object.freeze({
  bulk: 'data/live/dmi-bulk-cache.json', deployed: '.cache/deployed-dmi-bulk-cache.json',
});
const FORECAST_FILE = 'data/live/dmi-forecast-cache.json';
const RETIRED_WORKING_FILES = Object.freeze({ ...RETIRED_CURRENT_FILES, ...MIXED_BULK_FILES, forecast: FORECAST_FILE });
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const same = (a, b, code) => { if (!equal(a, b)) fail(code); };
const fail = code => { throw Object.assign(new Error('CURRENT_FAMILY_COLD_START_' + code),
  { code: 'CURRENT_FAMILY_COLD_START_' + code }); };
const need = (condition, code) => { if (!condition) fail(code); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const jsonBytes = value => Buffer.from(JSON.stringify(value) + '\n');
const digest = value => sha(jsonBytes(value));
function hour(value) {
  need(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value, 'TARGET');
  return value;
}
function inside(root, file) {
  const relative = path.relative(root, file);
  return relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}
async function noLinks(file) {
  let at = path.parse(file).root;
  for (const segment of path.relative(at, file).split(path.sep).filter(Boolean)) {
    at = path.join(at, segment); need(!(await fs.lstat(at)).isSymbolicLink(), 'SYMLINK');
  }
}
async function exactBytes(file, expected = null, maximum = 768 * MB, digestOnly = false) {
  need(path.isAbsolute(file) && !FAILED_CLOSES.has(file), 'FILE_PATH'); await noLinks(file);
  const before = await fs.lstat(file, { bigint: true });
  need(before.isFile() && before.nlink === 1n && before.size > 0n && before.size <= BigInt(maximum), 'FILE_SIZE');
  const identity = stat => [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs];
  let handle, fd, owned, bytes, first;
  try {
    handle = await fs.open(file, 'r'); fd = handle.fd; owned = ownFileDescriptorIdentity(fd);
    same(identity(await handle.stat({ bigint: true })), identity(before), 'FILE_CHANGED');
    let measured;
    if (digestOnly) {
      const hash = crypto.createHash('sha256'), chunk = Buffer.alloc(256 * 1024); let size = 0;
      for (;;) {
        const read = await handle.read(chunk, 0, chunk.length, null);
        if (read.bytesRead === 0) break;
        size += read.bytesRead; need(size <= maximum, 'FILE_SIZE');
        hash.update(chunk.subarray(0, read.bytesRead));
      }
      need(BigInt(size) === before.size, 'FILE_SIZE');
      bytes = measured = { bytes: size, sha256: hash.digest('hex') };
    } else {
      bytes = await handle.readFile(); need(bytes.length <= maximum && BigInt(bytes.length) === before.size, 'FILE_SIZE');
      measured = { bytes: bytes.length, sha256: sha(bytes) };
    }
    same(identity(await handle.stat({ bigint: true })), identity(before), 'FILE_CHANGED');
    same(identity(await fs.lstat(file, { bigint: true })), identity(before), 'FILE_CHANGED');
    if (expected) same(measured, { bytes: expected.bytes, sha256: expected.sha256 }, 'FILE_IDENTITY');
  } catch (error) { first = error; }
  if (handle) {
    try { await handle.close(); } catch (error) { first ??= error; }
    if (!await ownedFileDescriptorClosed(fd, owned)) {
      FAILED_CLOSES.set(file, handle); first ??= new Error('CURRENT_FAMILY_COLD_START_CLOSE_UNPROVED');
    }
  }
  if (first) throw first; return bytes;
}
async function writeNew(file, bytes) {
  await noLinks(path.dirname(file));
  const handle = await fs.open(file, 'wx', 0o600), fd = handle.fd, owned = ownFileDescriptorIdentity(handle.fd);
  let first;
  try { await handle.writeFile(bytes); await handle.sync(); } catch (error) { first = error; }
  try { await handle.close(); } catch (error) { first ??= error; }
  if (!await ownedFileDescriptorClosed(fd, owned)) {
    FAILED_CLOSES.set(file, handle); first ??= new Error('CURRENT_FAMILY_COLD_START_CLOSE_UNPROVED');
  }
  if (first) throw first;
  same(await exactBytes(file), bytes, 'WRITE_READBACK');
}
async function sourceTuple() {
  return { integrated: ravScoreModelBinding().modelBundleSha256,
    candidate: candidateBinding().modelBundleSha256,
    contracts: await privateRuntimeContractHashes() };
}
async function currentRows(clients, checkpointRequest) {
  const read = async (request, key) => {
    const rows = await request(`?document_key=eq.${key}&select=document_key,payload,version&limit=2`, {}, 'read');
    need(Array.isArray(rows) && rows.length === 1 && rows[0].document_key === key
      && Number.isSafeInteger(Number(rows[0].version)) && Number(rows[0].version) > 0, 'CURRENT_ROWS');
    return { ...rows[0], version: Number(rows[0].version) };
  };
  const pointer = await read(clients.documentRequest, 'ravscore-private-production-runtime-pointer');
  validateProtectedPrivateRuntimePointer(pointer.payload, { allowHistoricalCurrentModelBinding: true });
  return { pointer, checkpoint: await read(checkpointRequest, 'ravscore-continuation-checkpoint') };
}
function objectsOf(descriptor) {
  return descriptor.objects ?? [{ index: 0, objectPath: descriptor.objectPath,
    objectBytes: descriptor.objectBytes, objectSha256: descriptor.objectSha256 }];
}
function rowIdentity(rows) {
  return { pointer: rows.pointer, checkpoint: { document_key: rows.checkpoint.document_key,
    version: rows.checkpoint.version, generationSha256: rows.checkpoint.payload.generationSha256,
    payloadSha256: digest(rows.checkpoint.payload) } };
}
async function assertActualPublicManifest(publicRoot, description) {
  const local = await exactBytes(path.join(publicRoot, 'manifest.json'), null, MB);
  const value = JSON.parse(local);
  need(value.datasetId === description.datasetId && value.productionReferenceAt === description.productionReferenceAt,
    'PUBLIC_IDENTITY_CHANGED');
  same(value.ravScoreModelBinding, description.modelBinding, 'PUBLIC_BINDING_CHANGED');
  const response = await fetch('https://ravradar.dk/data/live/manifest.json', {
    redirect: 'error', cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(20000) });
  need(response.status === 200 && !response.redirected && response.body?.getReader, 'PUBLIC_READ');
  const reader = response.body.getReader(), chunks = []; let size = 0, first;
  try {
    for (;;) {
      const row = await reader.read(); if (row.done) break;
      size += row.value.byteLength; need(size <= MB, 'PUBLIC_SIZE'); chunks.push(Buffer.from(row.value));
    }
  } catch (error) { first = error; }
  finally {
    if (first) { try { await reader.cancel(); } catch { /* Keep first failure. */ } }
    reader.releaseLock();
  }
  if (first) throw first;
  same(Buffer.concat(chunks, size), local, 'ACTUAL_PUBLIC_CHANGED');
}
async function authenticate({ workRoot, publicRoot, expectedRows = null, expectedIdentity = null,
  expectedTuple = null, expectedRegistry = null }) {
  const clients = createProtectedPrivateRuntimeClients(), checkpointRequest = createProtectedRavScoreCheckpointRequester();
  const tuple = await sourceTuple(); if (expectedTuple) same(tuple, expectedTuple, 'SOURCE_CHANGED');
  const registryBytes = await exactBytes(path.join(ROOT, 'data/live/coastal-parts-v2.json'), null, 16 * MB);
  const registry = JSON.parse(registryBytes), registrySha256 = 'sha256:' + sha(registryBytes);
  need(registry.zoneCount === 210 && registry.partCount === 673, 'REGISTRY');
  if (expectedRegistry) same(registry, expectedRegistry, 'REGISTRY_CHANGED');
  const rows = await currentRows(clients, checkpointRequest);
  if (expectedRows) same(rows, expectedRows, 'CURRENT_CHANGED');
  if (expectedIdentity) same(rowIdentity(rows), expectedIdentity, 'CURRENT_CHANGED');
  const descriptor = rows.pointer.payload.current;
  need(descriptor.modelBinding.modelBundleSha256 === tuple.integrated
    && rows.checkpoint.payload.modelBinding.modelBundleSha256 === tuple.integrated
    && rows.checkpoint.payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256 === tuple.candidate,
  'NOT_CURRENT_FAMILY');
  const description = await describeCurrentProtectedPrivateProductionRuntime({ request: clients.documentRequest });
  await assertActualPublicManifest(publicRoot, description);
  const privateRoot = process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT, bundlePath = process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE;
  need(path.isAbsolute(privateRoot ?? '') && path.isAbsolute(bundlePath ?? '')
    && path.dirname(bundlePath) === privateRoot, 'NORMAL_B_PATHS');
  const verified = await verifyPrivateProductionRuntimeBundle({ privateRoot, bundlePath, repositoryRoot: ROOT,
    expected: { modelBinding: description.modelBinding, contractHashes: description.contractHashes,
      datasetId: description.datasetId, productionReferenceAt: description.productionReferenceAt,
      generatedAt: description.generatedAt, bundleContentSha256: description.bundleContentSha256 } });
  const payload = path.join(bundlePath, 'payload'), conditionsPath = path.join(payload, 'data/live/conditions.json');
  const conditionFile = verified.files.find(row => row.relativePath === 'data/live/conditions.json');
  need(conditionFile, 'B_CONDITIONS');
  const conditionBytes = await exactBytes(conditionsPath, conditionFile, 256 * MB), compact = JSON.parse(conditionBytes);
  same(await exactBytes(path.join(ROOT, 'data/live/conditions.json'), conditionFile, 256 * MB), conditionBytes, 'WORKING_B_CHANGED');
  const origin = await readEstablishedNativeCurrentOrigin(registry); need(origin, 'NORMAL_ORIGIN_UNAVAILABLE');
  const derivedPath = path.join(workRoot, 'b-derived-S-' + crypto.randomUUID() + '.json');
  // The ordinary protected-S reader deliberately accepts only this dedicated
  // .cache suffix; give each immutable authentication pass its own owned root.
  const protectedPath = path.join(workRoot, 'protected-S-' + crypto.randomUUID(),
    '.cache/ravscore-continuation-checkpoint/checkpoint.json');
  await saveRavScoreContinuationCheckpoint({ sourcePath: conditionsPath, checkpointPath: derivedPath, repositoryRoot: ROOT });
  await restoreProtectedRavScoreContinuationCheckpoint({ checkpointPath: protectedPath,
    targetReference: description.productionReferenceAt, request: checkpointRequest });
  const checkpointBytes = await exactBytes(derivedPath, null, 16 * MB), checkpoint = JSON.parse(checkpointBytes);
  same(checkpoint, JSON.parse(await exactBytes(protectedPath, null, 16 * MB)), 'NORMAL_B_S_PARITY');
  same(checkpoint, rows.checkpoint.payload, 'PROTECTED_S_CHANGED');
  const publicPack = verified.files.find(row => row.relativePath === '.cache/public-hour-delivery.pack');
  need(publicPack, 'B_PUBLIC_PACK');
  await inspectPrivatePublicHourDeliveryPack({ packPath: path.join(payload, publicPack.relativePath), conditions: compact });
  same(await currentRows(clients, checkpointRequest), rows, 'CURRENT_CHANGED');
  const originalFiles = [{ role: 'checkpoint', relativePath: 'original-S.json', sourcePath: derivedPath },
    ...WEATHER_STATE_EPOCH_PUBLIC_FILES.map(relativePath => ({ role: 'public-snapshot', relativePath,
      sourcePath: path.join(publicRoot, relativePath) }))];
  return { clients, checkpointRequest, rows, tuple, registry, registrySha256, descriptor, origin, payload, verified,
    snapshot: { originalConditions: hydratePrivateConditionsHourly(compact), originalCheckpointPayload: checkpoint,
      originalDescription: description, checkpointVersion: rows.checkpoint.version,
      originalPointerRow: rows.pointer, originalCheckpointRow: rows.checkpoint,
      originalFileDigests: verified.files.map(({ relativePath, bytes, sha256 }) => ({ relativePath, bytes, sha256 })),
      publicPackReference: { archivedWithinOriginalBundle: true, relativePath: publicPack.relativePath,
        fileSha256: publicPack.sha256, bytes: publicPack.bytes, marker: compact.publicHourDelivery }, files: originalFiles } };
}
function decodedBulkBytes(bytes) {
  const parsed = JSON.parse(bytes);
  // Same stored/legacy dispatch as the normal readDmiBulkDocument reader,
  // applied to descriptor-owned bytes so materialization is not identity drift.
  need(plain(parsed), 'BULK_DOCUMENT');
  if (Object.hasOwn(parsed, 'storageSchema')) return decodeDmiBulkWrapper(parsed, { storedBytes: bytes.length });
  need(plain(parsed.zones), 'BULK_DOCUMENT'); return parsed;
}
function scalarBulk(document) {
  need(plain(document) && plain(document.zones), 'BULK_DOCUMENT');
  const zones = Object.fromEntries(Object.entries(document.zones).map(([zoneId, zone]) => {
    need(plain(zone) && plain(zone.hourly), 'BULK_ZONE');
    const hourly = Object.fromEntries(Object.entries(zone.hourly).map(([time, row]) => {
      need(plain(row), 'BULK_ROW');
      const selected = Object.fromEntries(['time', ...SCALARS].filter(key => Object.hasOwn(row, key))
        .map(key => [key, structuredClone(row[key])]));
      selected.sources = Object.fromEntries(SCALAR_COMPONENTS.filter(key => Object.hasOwn(row.sources ?? {}, key))
        .map(key => [key, structuredClone(row.sources[key])]));
      return [time, selected];
    }));
    const selected = { hourly };
    for (const key of ['point', 'name', 'lon', 'lat', 'entityId', 'parentZoneId', 'entityType',
      'samplingContext', 'samplingPoint']) if (Object.hasOwn(zone, key)) selected[key] = structuredClone(zone[key]);
    for (const container of ['gridPoints', 'collections']) if (plain(zone[container])) {
      selected[container] = Object.fromEntries(SCALARS.filter(key => Object.hasOwn(zone[container], key))
        .map(key => [key, structuredClone(zone[container][key])]));
    }
    return [zoneId, selected];
  }));
  const result = { zones };
  for (const key of ['schemaVersion', 'provider', 'generatedAt', 'zoneRegistrySignature', 'sourceUpdatedAt',
    'method', 'hours', 'timeStrideHours', 'spatialProvenanceVersion', 'privateReplayRetentionHours',
    'currentVectorSemanticsVersion', 'currentVectorSelection', 'currentPreferredDistanceKm', 'currentMaxDistanceKm'])
    if (Object.hasOwn(document, key)) result[key] = structuredClone(document[key]);
  return result;
}
async function acquisitions(state, workRoot) {
  const descriptor = state.verified.files.find(row => row.relativePath === 'data/live/dmi-bulk-cache.json');
  need(descriptor, 'B_BULK'); const file = path.join(state.payload, descriptor.relativePath);
  await exactBytes(file, descriptor, 256 * MB);
  const originalBulk = await readDmiBulkDocument(file), document = scalarBulk(originalBulk);
  await exactBytes(file, descriptor, 256 * MB);
  // Exactly one normal working-output exception. No caller chooses a path.
  // B (including its whole component pack) is already durably archived above.
  // Before replacing the normal installed working copy, identify its exact
  // original packed bytes or require its authentic absence, and retain them.
  const originals = await originalFixedAcquisitions(state), original = originals.candidate;
  await assertNoPendingPointPromotion(originals);
  const before = await fs.lstat(FIXED_CANDIDATE).catch(error => {
    if (error.code === 'ENOENT') return null; throw error;
  });
  let predecessor = null;
  if (original !== null) {
    need(before !== null, 'ORIGINAL_CANDIDATE_MISSING');
    const bytes = await exactBytes(FIXED_CANDIDATE, original.descriptor, 256 * MB);
    same(bytes, original.bytes, 'ORIGINAL_CANDIDATE_CHANGED');
    const preservedPath = path.join(workRoot, 'original-working-candidate.json');
    await writeNew(preservedPath, bytes);
    predecessor = { path: preservedPath, ...original.descriptor, packSha256: original.packSha256 };
  } else need(before === null, 'UNOWNED_FIXED_CANDIDATE');
  await noLinks(path.dirname(FIXED_CANDIDATE));
  need(await fs.lstat(FIXED_CANDIDATE + '.tmp').then(() => false, error => {
    if (error.code === 'ENOENT') return true; throw error;
  }), 'CANDIDATE_STAGE_COLLISION');
  if (predecessor) await exactBytes(FIXED_CANDIDATE, predecessor, 256 * MB);
  else need(await fs.lstat(FIXED_CANDIDATE).then(() => false, error => {
    if (error.code === 'ENOENT') return true; throw error;
  }), 'UNOWNED_FIXED_CANDIDATE');
  // The authenticated old active is archived, then moved out of future normal
  // consumers. Never leave a scalar-only document under the READY active name.
  const retiredInputs = {};
  for (const id of Object.keys(RETIRED_CURRENT_FILES)) {
    retiredInputs[id] = await retireFixedInput(originals.working[id], workRoot, id);
  }
  const retiredActive = retiredInputs.active;
  await writeDmiBulkDocument(FIXED_CANDIDATE, document);
  same(await readDmiBulkDocument(FIXED_CANDIDATE), document, 'CANDIDATE_SEED_READBACK');
  const installed = await exactBytes(FIXED_CANDIDATE, null, 256 * MB);
  // Preserve the normal lossless stored representation, not an expanded JSON
  // copy. Repeated source provenance may legitimately exceed the stored-byte
  // bound after decoding. Immutable copies still use exclusive owned writes,
  // exact byte hashes and the unchanged 256-MiB stored-file limit.
  const rows = {}, seedPath = path.join(workRoot, 'acquisition-output-seed.json'), seedBytes = installed;
  await writeNew(seedPath, seedBytes);
  for (const [role, name] of Object.entries({
    deployedFallbackPath: 'acquisition-fallback.json', publishedBaselinePath: 'acquisition-published-baseline.json' })) {
    const destination = path.join(workRoot, name);
    await writeNew(destination, seedBytes);
    rows[role] = { path: destination, bytes: seedBytes.length, sha256: sha(seedBytes) };
  }
  rows.outputPath = { path: FIXED_CANDIDATE, bytes: installed.length, sha256: sha(installed) };
  // The workflow materializes these OLD aliases before prepare. Authenticate
  // decoded parity with B, preserving their actual physical representations.
  for (const [id, relative] of Object.entries(MIXED_BULK_FILES)) {
    const working = path.join(ROOT, relative), bytes = await exactBytes(working, null, 256 * MB);
    same(decodedBulkBytes(bytes), originalBulk, 'FILE_IDENTITY');
    const original = { descriptor: { bytes: bytes.length, sha256: sha(bytes) },
      sourceSha256: descriptor.sha256, packSha256: null };
    retiredInputs[id] = await retireFixedInput(original, workRoot, id);
    await writeNew(working, seedBytes);
    same(await readDmiBulkDocument(working), document, 'CANDIDATE_SEED_READBACK');
  }
  const forecast = state.verified.files.find(row => row.relativePath === FORECAST_FILE);
  need(forecast, 'FILE_IDENTITY');
  await exactBytes(path.join(state.payload, FORECAST_FILE), forecast, DMI_FORECAST_FILE_MAX_BYTES, true);
  retiredInputs.forecast = await retireFixedInput({ descriptor: forecast, packSha256: null }, workRoot, 'forecast');
  const forecastSeed = await seedScalarForecast(retiredInputs.forecast, workRoot,
    state.snapshot?.originalConditions?.coastalParts?.parts);
  return { rows, predecessor, retiredActive, retiredInputs, forecastSeed,
    outputSeed: { path: seedPath, bytes: seedBytes.length, sha256: sha(seedBytes) } };
}
async function verifyScalarAcquisition(row, originalBulk) {
  const bytes = await exactBytes(row.path, row, 256 * MB);
  // Decode only the bytes actually authenticated through the owned descriptor;
  // do not reopen a path between the hash check and semantic comparison.
  same(decodeDmiBulkWrapper(JSON.parse(bytes), { storedBytes: bytes.length }),
    originalBulk, 'ACQUISITION_CHANGED');
}
// Same bounded v1 pack header used by the ordinary protected-quick caller.
// This selects preservation identity only, NEVER current provenance/admission.
// The whole pack is independently authenticated by the unchanged normal B
// verifier, and its original bytes stay inside the generic immutable archive.
async function originalFixedAcquisitions(state) {
  const descriptor = state.verified.files.find(row => row.relativePath === '.cache/weather-component-inputs.pack');
  const selected = { candidate: null, active: null, working: Object.fromEntries(
    Object.keys(RETIRED_CURRENT_FILES).map(id => [id, null])) };
  if (descriptor) {
    const bytes = await exactBytes(path.join(state.payload, descriptor.relativePath), descriptor, 768 * MB);
    const magic = Buffer.from('RR-WEATHER-COMPONENT-PACK-1\n');
    need(bytes.subarray(0, magic.length).equals(magic) && bytes.length >= magic.length + 4, 'ORIGINAL_PACK_FORMAT');
    const size = bytes.readUInt32BE(magic.length);
    need(size >= 2 && size <= 32 * MB && magic.length + 4 + size <= bytes.length, 'ORIGINAL_PACK_HEADER');
    const manifest = JSON.parse(bytes.subarray(magic.length + 4, magic.length + 4 + size));
    need(manifest.kind === 'PRIVATE_WEATHER_COMPONENT_PACK' && manifest.schemaVersion === 1
      && Array.isArray(manifest.files) && manifest.files.length <= 65536, 'ORIGINAL_PACK_HEADER');
    let at = magic.length + 4 + size; const paths = new Set();
    for (const row of manifest.files) {
      need(typeof row.relativePath === 'string' && !paths.has(row.relativePath)
        && Number.isSafeInteger(row.bytes) && row.bytes > 0 && SHA.test(row.sha256 ?? '')
        && at + row.bytes <= bytes.length, 'ORIGINAL_PACK_ENTRY');
      paths.add(row.relativePath);
      const id = Object.keys(RETIRED_CURRENT_FILES).find(key => RETIRED_CURRENT_FILES[key] === row.relativePath);
      if (id !== undefined || row.relativePath === '.cache/dmi-candidate-progress.json') {
        need(row.bytes <= (id === undefined ? 256 : 768) * MB,
          id === undefined ? 'ORIGINAL_CANDIDATE_SIZE' : 'FILE_SIZE');
        const actual = bytes.subarray(at, at + row.bytes);
        need(sha(actual) === row.sha256, id === undefined ? 'ORIGINAL_CANDIDATE_HASH' : 'FILE_IDENTITY');
        const original = { descriptor: { bytes: row.bytes, sha256: row.sha256 }, bytes: actual,
          packSha256: descriptor.sha256 };
        if (id === undefined) selected.candidate = original;
        else selected.working[id] = original;
      }
      at += row.bytes;
    }
    need(at === bytes.length, 'ORIGINAL_PACK_SIZE');
  }
  // Base shadows/pilot can also occur in the pack. Both genuine descriptions
  // must agree; neither a caller receipt nor a newer working file replaces B.
  for (const [id, relative] of Object.entries(RETIRED_CURRENT_FILES)) {
    const base = state.verified.files.find(row => row.relativePath === relative);
    if (!base) continue;
    const bytes = await exactBytes(path.join(state.payload, relative), base, 768 * MB);
    if (selected.working[id]) same(selected.working[id].bytes, bytes, 'FILE_IDENTITY');
    else selected.working[id] = { descriptor: base, bytes, packSha256: null };
  }
  selected.active = selected.working.active; return selected;
}
async function assertNoPendingPointPromotion(originals) {
  const original = originals.working.pointPromotion;
  const working = path.join(ROOT, RETIRED_CURRENT_FILES.pointPromotion);
  const before = await fs.lstat(working, { bigint: true }).catch(error => {
    if (error.code === 'ENOENT') return null; throw error;
  });
  // Authentic absence requires absence in both B/pack and the working view.
  // A changed/foreign/missing expected document is not a cancellation grant.
  if (original === null) { need(before === null, 'FILE_IDENTITY'); return; }
  need(before !== null, 'FILE_IDENTITY');
  await exactBytes(working, original.descriptor, 768 * MB, true);
  // Presence blocks even when it might be old/stale: only the existing normal
  // activation path may validate readiness and fresh central compare-and-swap.
  // This check precedes EVERY mutable working copy/retire/scalar operation.
  fail('PENDING_POINT_PROMOTION');
}
async function retireFixedInput(original, workRoot, id) {
  need(Object.hasOwn(RETIRED_WORKING_FILES, id), 'FILE_PATH');
  const working = path.join(ROOT, RETIRED_WORKING_FILES[id]);
  const maximum = id === 'forecast' ? DMI_FORECAST_FILE_MAX_BYTES : 768 * MB;
  const before = await fs.lstat(working, { bigint: true }).catch(error => {
    if (error.code === 'ENOENT') return null; throw error;
  });
  if (original === null) { need(before === null, 'FILE_IDENTITY'); return null; }
  need(before !== null && before.isFile() && !before.isSymbolicLink() && before.nlink === 1n, 'FILE_IDENTITY');
  await exactBytes(working, original.descriptor, maximum, true);
  const preservedPath = path.join(workRoot, 'original-working-' + id + '.json');
  await noLinks(workRoot);
  need(await fs.lstat(preservedPath).then(() => false, error => {
    if (error.code === 'ENOENT') return true; throw error;
  }), 'FILE_PATH');
  const identity = stat => [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs];
  same(identity(await fs.lstat(working, { bigint: true })), identity(before), 'FILE_CHANGED');
  // No copy+unlink fallback. Unknown move outcome stops with all moved bytes
  // retained; the job must not blindly repeat prepare.
  await fs.rename(working, preservedPath);
  const moved = await fs.lstat(preservedPath, { bigint: true });
  same([moved.dev, moved.ino, moved.size, moved.mtimeNs],
    [before.dev, before.ino, before.size, before.mtimeNs], 'FILE_CHANGED');
  await exactBytes(preservedPath, original.descriptor, maximum, true);
  need(await fs.lstat(working).then(() => false, error => {
    if (error.code === 'ENOENT') return true; throw error;
  }), 'FILE_CHANGED');
  return { path: preservedPath, bytes: original.descriptor.bytes, sha256: original.descriptor.sha256,
    sourceSha256: original.sourceSha256 ?? original.descriptor.sha256, packSha256: original.packSha256 };
}
async function verifyRetiredInput(original, row, workRoot, id) {
  if (original === null) { need(row === null, 'FILE_IDENTITY'); return; }
  need(row?.path === path.join(workRoot, 'original-working-' + id + '.json')
    && row.packSha256 === original.packSha256
    && row.sourceSha256 === (original.sourceSha256 ?? original.descriptor.sha256), 'FILE_IDENTITY');
  same({ bytes: row.bytes, sha256: row.sha256 },
    { bytes: original.descriptor.bytes, sha256: original.descriptor.sha256 }, 'FILE_IDENTITY');
  await exactBytes(row.path, original.descriptor,
    id === 'forecast' ? DMI_FORECAST_FILE_MAX_BYTES : 768 * MB, true);
  // Only OLD private copies are read. NEW producer files are never retired,
  // overwritten or mistaken for evidence when the locator is loaded again.
}
async function verifyRetiredActive(original, context) {
  await verifyRetiredInput(original, context.retiredActive, context.workRoot, 'active');
}
function scalarForecastRecord(record) {
  const selected = withoutCurrent(record);
  if (selected) selected.hourly = selected.hourly.map(row => {
    const { currentStateOnlyHold: _hold, currentCoastNormalSpeedMps: _normal, ...rest } = row; return rest;
  });
  return selected;
}
// Validate the WHOLE saved envelope/domain/totals before any one-entry codec
// view is made. Only descriptors/identity are retained; no decoded national bank.
async function scalarPartInventory(index, originalParts) {
  if (index.continuity === null) return null;
  const { metadata, entries } = index.continuity;
  same(Object.keys(metadata).sort(), ['schemaVersion', 'kind', 'productionReferenceAt',
    'partCount', 'rawBytes', 'compressedBytes'].sort(), 'FILE_IDENTITY');
  need([1, 2].includes(metadata.schemaVersion)
    && metadata.kind === 'PRIVATE_DMI_PART_HOURLY_CONTINUITY'
    && Number.isSafeInteger(metadata.partCount) && metadata.partCount >= 1 && metadata.partCount <= 673
    && metadata.partCount === entries.length
    && Number.isSafeInteger(metadata.rawBytes) && metadata.rawBytes >= 1
    && Number.isSafeInteger(metadata.compressedBytes) && metadata.compressedBytes >= 1, 'FILE_IDENTITY');
  hour(metadata.productionReferenceAt);
  assertDmiPartContinuityTotalSize(metadata.rawBytes, metadata.compressedBytes);
  const rows = []; let rawBytes = 0, compressedBytes = 0, lastId = null;
  for (const descriptor of entries) {
    const entry = await readDmiForecastRecord(index, descriptor);
    need(plain(entry) && typeof entry.partId === 'string' && entry.partId.length > 0
      && (lastId === null || entry.partId.localeCompare(lastId) > 0)
      && Array.isArray(entry.point) && entry.point.length === 2 && entry.point.every(Number.isFinite)
      && Number.isSafeInteger(entry.rawBytes) && entry.rawBytes >= 2
      && Number.isSafeInteger(entry.compressedBytes) && entry.compressedBytes >= 2, 'FILE_IDENTITY');
    rawBytes += entry.rawBytes; compressedBytes += entry.compressedBytes;
    need(Number.isSafeInteger(rawBytes) && Number.isSafeInteger(compressedBytes), 'FILE_IDENTITY');
    assertDmiPartContinuityTotalSize(rawBytes, compressedBytes);
    // Schema2's ordinary reader needs the OLD authenticated parent-zone ID.
    // Its point is always the saved entry point, never new admin geometry.
    const oldPart = originalParts?.[entry.partId];
    if (metadata.schemaVersion === 2) need(plain(oldPart) && oldPart.partId === entry.partId
      && typeof oldPart.zoneId === 'string' && oldPart.zoneId.length > 0, 'FILE_IDENTITY');
    rows.push({ descriptor, part: { partId: entry.partId, waterPoint: entry.point,
      ...(metadata.schemaVersion === 2 ? { zoneId: oldPart.zoneId } : {}) } });
    lastId = entry.partId;
  }
  need(rawBytes === metadata.rawBytes && compressedBytes === metadata.compressedBytes, 'FILE_IDENTITY');
  return { metadata, rows };
}
async function readScalarPart(index, inventory, row) {
  const entry = await readDmiForecastRecord(index, row.descriptor);
  // Normal saved-original bank validation stays intact, including null-bank
  // coverage and all corrupt-schema2 refusals. This grants no current admission.
  const decoded = await unpackDmiPartContinuity({ ...inventory.metadata, partCount: 1,
    rawBytes: entry.rawBytes, compressedBytes: entry.compressedBytes, entries: [entry] },
  [row.part], inventory.metadata.productionReferenceAt);
  need(decoded.size === 1 && decoded.has(row.part.partId), 'FILE_IDENTITY');
  return decoded.get(row.part.partId);
}
async function scalarPartContinuity(index, originalParts) {
  const inventory = await scalarPartInventory(index, originalParts);
  if (inventory === null) return null;
  const result = { ...inventory.metadata, schemaVersion: 1, rawBytes: 0, compressedBytes: 0, entries: [] };
  for (const row of inventory.rows) {
    const original = await readScalarPart(index, inventory, row);
    const scalar = scalarForecastRecord({ ...original, zoneId: 'PART::' + row.part.partId });
    // No options means the ordinary schema1 codec: scalar storage, not a
    // fabricated native-original bank. OLD B and original schema2 bytes remain.
    const one = await packDmiPartContinuity(new Map([[row.part.partId, scalar]]),
      [row.part], inventory.metadata.productionReferenceAt);
    result.entries.push(one.entries[0]); result.rawBytes += one.rawBytes;
    result.compressedBytes += one.compressedBytes;
    assertDmiPartContinuityTotalSize(result.rawBytes, result.compressedBytes);
  }
  return result;
}
async function verifyScalarParts(before, after, originalParts) {
  const oldParts = await scalarPartInventory(before, originalParts);
  const newParts = await scalarPartInventory(after, originalParts);
  if (oldParts === null) { need(newParts === null, 'FILE_IDENTITY'); return; }
  need(newParts !== null && newParts.metadata.schemaVersion === 1, 'FILE_IDENTITY');
  const withoutSize = ({ rawBytes: _raw, compressedBytes: _compressed, schemaVersion: _schema, ...rest }) => rest;
  same(withoutSize(newParts.metadata), withoutSize(oldParts.metadata), 'FILE_IDENTITY');
  for (let i = 0; i < oldParts.rows.length; i++) {
    const oldRow = oldParts.rows[i], newRow = newParts.rows[i];
    same(newRow.part.partId, oldRow.part.partId, 'FILE_IDENTITY');
    same(newRow.part.waterPoint, oldRow.part.waterPoint, 'FILE_IDENTITY');
    const original = await readScalarPart(before, oldParts, oldRow);
    const scalar = await readScalarPart(after, newParts, newRow);
    same(scalar, { point: original.point, hourly: scalarForecastRecord(original).hourly }, 'FILE_IDENTITY');
  }
}
async function verifyScalarForecast(original, seed, workRoot, originalParts) {
  need(seed?.path === path.join(workRoot, 'scalar-forecast-seed.json'), 'FILE_PATH');
  await exactBytes(seed.path, seed, DMI_FORECAST_FILE_MAX_BYTES, true);
  const before = await inspectDmiForecastFile(original.path), after = await inspectDmiForecastFile(seed.path);
  const metadata = { ...before.metadata }; delete metadata.partContinuity;
  same(after.metadata, metadata, 'FILE_IDENTITY');
  await verifyScalarParts(before, after, originalParts);
  same([...after.zones.keys()], [...before.zones.keys()], 'FILE_IDENTITY');
  for (const [id, row] of before.zones) {
    same(await readDmiForecastRecord(after, after.zones.get(id)),
      scalarForecastRecord(await readDmiForecastRecord(before, row)), 'FILE_IDENTITY');
  }
  const oldWater = before.waterSourceContinuity, newWater = after.waterSourceContinuity;
  same(newWater?.metadata ?? null, oldWater?.metadata ?? null, 'FILE_IDENTITY');
  need((newWater?.entries.length ?? 0) === (oldWater?.entries.length ?? 0), 'FILE_IDENTITY');
  for (let i = 0; i < (oldWater?.entries.length ?? 0); i++) {
    same(await readDmiForecastRecord(after, newWater.entries[i]),
      await readDmiForecastRecord(before, oldWater.entries[i]), 'FILE_IDENTITY');
  }
  await exactBytes(original.path, original, DMI_FORECAST_FILE_MAX_BYTES, true);
  await exactBytes(seed.path, seed, DMI_FORECAST_FILE_MAX_BYTES, true);
}
async function seedScalarForecast(original, workRoot, originalParts) {
  const index = await inspectDmiForecastFile(original.path), metadata = { ...index.metadata };
  delete metadata.partContinuity;
  const continuity = await scalarPartContinuity(index, originalParts);
  if (continuity !== null) metadata.partContinuity = continuity;
  async function* zones() {
    for (const [id, row] of index.zones) yield [id, scalarForecastRecord(await readDmiForecastRecord(index, row))];
  }
  const seedPath = path.join(workRoot, 'scalar-forecast-seed.json');
  // The ordinary writer otherwise re-appends OLD native PART continuity. Use
  // only the normal scalar projection, preserving independent SOURCE entries.
  await writeDmiForecastRecords(seedPath, { ...index, continuity: null }, zones(), metadata);
  const seed = { path: seedPath, ...await exactBytes(seedPath, null, DMI_FORECAST_FILE_MAX_BYTES, true) };
  await verifyScalarForecast(original, seed, workRoot, originalParts);
  const working = path.join(ROOT, FORECAST_FILE);
  await noLinks(path.dirname(working));
  // Exclusive copy of the normal recordwise result, not national stringify.
  await fs.copyFile(seedPath, working, fs.constants.COPYFILE_EXCL);
  await exactBytes(seedPath, seed, DMI_FORECAST_FILE_MAX_BYTES, true);
  await exactBytes(working, seed, DMI_FORECAST_FILE_MAX_BYTES, true);
  return seed;
}
async function verifyRetiredWorkingInputs(state, originals, context) {
  need(plain(context.retiredInputs), 'FILE_IDENTITY');
  same(Object.keys(context.retiredInputs).sort(), Object.keys(RETIRED_WORKING_FILES).sort(), 'FILE_IDENTITY');
  for (const id of Object.keys(RETIRED_CURRENT_FILES)) {
    await verifyRetiredInput(originals.working[id], context.retiredInputs[id], context.workRoot, id);
  }
  same(context.retiredActive, context.retiredInputs.active, 'FILE_IDENTITY');
  const descriptor = state.verified.files.find(row => row.relativePath === 'data/live/dmi-bulk-cache.json');
  need(descriptor, 'FILE_IDENTITY');
  const originalBytes = await exactBytes(path.join(state.payload, descriptor.relativePath), descriptor, 256 * MB);
  const originalBulk = decodedBulkBytes(originalBytes);
  for (const id of Object.keys(MIXED_BULK_FILES)) {
    const row = context.retiredInputs[id];
    need(row?.path === path.join(context.workRoot, 'original-working-' + id + '.json')
      && row.sourceSha256 === descriptor.sha256 && row.packSha256 === null, 'FILE_IDENTITY');
    const bytes = await exactBytes(row.path, row, 256 * MB);
    same(decodedBulkBytes(bytes), originalBulk, 'FILE_IDENTITY');
  }
  const forecast = state.verified.files.find(row => row.relativePath === FORECAST_FILE);
  need(forecast, 'FILE_IDENTITY');
  await exactBytes(path.join(state.payload, FORECAST_FILE), forecast, DMI_FORECAST_FILE_MAX_BYTES, true);
  await verifyRetiredInput({ descriptor: forecast, packSha256: null }, context.retiredInputs.forecast,
    context.workRoot, 'forecast');
  await verifyScalarForecast(context.retiredInputs.forecast, context.forecastSeed, context.workRoot,
    state.snapshot?.originalConditions?.coastalParts?.parts);
}
function mint(state, archive, context) {
  const archived = assertVerifiedWeatherStateEpochArchive(archive);
  same(archived.originalDescription, state.snapshot.originalDescription, 'ARCHIVED_SOURCE');
  same(archived.originalCheckpointPayload, state.snapshot.originalCheckpointPayload, 'ARCHIVED_S');
  same(archived.originalConditions, state.snapshot.originalConditions, 'ARCHIVED_B');
  const capability = Object.freeze({}); CAPABILITIES.set(capability, { state, archive, archived, context });
  return capability;
}
export const CURRENT_FAMILY_COLD_START_REENTRY_SCOPE = Object.freeze({
  progressSource: '39886354260-1',
  archiveId: '775f99a210b899eacd3ee056f4daae56c20fc3258e64691d4e0544aabd04d3fb',
  targetReferenceAt: '2026-10-23T01:00:00.000Z',
});
// This is a transport boundary, not normal uploadImmutable's HEAD/PUT path.
// Source B can only be captured by its already authenticated exact object keys;
// archived objects can only be read under this exact immutable archive ID.
function readOnlyExistingColdArchiveStorage(objects, archiveId) {
  need(SHA.test(archiveId ?? '') && Array.isArray(objects) && objects.length >= 1 && objects.length <= 8, 'ARCHIVED_SOURCE');
  const sourceKeys = new Set(objects.map(row => row.objectPath));
  need(sourceKeys.size === objects.length, 'ARCHIVED_SOURCE');
  const root = 'bundles/sha256/' + archiveId, catalog = root + '.json.gz';
  const archived = key => typeof key === 'string' && (key === catalog
    || new RegExp('^' + root + '/part-[0-9]{3}-[a-f0-9]{64}\\.json\\.gz\\.part$').test(key));
  const account = process.env.RAVRADAR_R2_ACCOUNT_ID;
  need(/^[a-f0-9]{32}$/.test(account ?? ''), 'ARCHIVED_SOURCE');
  const origin = 'https://' + account + '.eu.r2.cloudflarestorage.com';
  // Fixed actual bucket. No Supabase Storage fallback, listing or mutating verb.
  const bucket = '/' + PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId;
  const transport = createProtectedPrivateRuntimeClients({ storageBackend: 'r2',
    fetchImpl: async (target, options = {}) => {
      let url; try { url = new URL(target); } catch { fail('ARCHIVED_SOURCE'); }
      const method = String(options.method ?? 'GET').toUpperCase();
      const key = url.pathname.startsWith(bucket + '/') ? url.pathname.slice(bucket.length + 1) : null;
      need(!url.username && !url.password && !url.search && !url.hash && url.origin === origin
        && options.body == null && (method === 'HEAD' && url.pathname === bucket
          || method === 'GET' && (sourceKeys.has(key) || archived(key))), 'ARCHIVED_SOURCE');
      return fetch(url.href, { ...options, redirect: 'error' });
    } }).storage;
  return Object.freeze({
    async ensurePrivateBucket() { return transport.ensurePrivateBucket({ allowCreate: false }); },
    async download(key) {
      need(sourceKeys.has(key) || archived(key), 'ARCHIVED_SOURCE');
      return transport.download(key);
    },
    async uploadImmutable(key, bytes) {
      need(archived(key) && Buffer.isBuffer(bytes), 'ARCHIVED_SOURCE');
      const existing = await transport.download(key);
      need(Buffer.isBuffer(existing) && existing.equals(bytes), 'ARCHIVED_SOURCE');
      // No upload call, PUT fallback, replacement, creation or retention action.
    },
    async anonymousStatus(key) {
      need(archived(key), 'ARCHIVED_SOURCE'); return transport.anonymousStatus(key);
    },
  });
}
export async function prepareCurrentFamilyColdStart({ workRoot, publicRoot, targetReferenceAt } = {}) {
  return prepareCurrentFamilyColdStartOwned({ workRoot, publicRoot, targetReferenceAt });
}
export async function reopenCurrentFamilyColdStart({ workRoot, publicRoot, targetReferenceAt, archiveId } = {}) {
  need(archiveId === CURRENT_FAMILY_COLD_START_REENTRY_SCOPE.archiveId
    && targetReferenceAt === CURRENT_FAMILY_COLD_START_REENTRY_SCOPE.targetReferenceAt, 'ARCHIVED_SOURCE');
  return prepareCurrentFamilyColdStartOwned({ workRoot, publicRoot, targetReferenceAt,
    expectedExistingArchiveId: archiveId });
}
async function prepareCurrentFamilyColdStartOwned({ workRoot, publicRoot, targetReferenceAt,
  expectedExistingArchiveId = null } = {}) {
  targetReferenceAt = hour(targetReferenceAt);
  need(path.isAbsolute(workRoot ?? '') && path.isAbsolute(publicRoot ?? ''), 'WORK_PATHS');
  workRoot = path.resolve(workRoot); publicRoot = path.resolve(publicRoot);
  need(workRoot !== ROOT && !inside(ROOT, workRoot) && publicRoot !== ROOT && !inside(ROOT, publicRoot)
    && workRoot !== publicRoot && !inside(workRoot, publicRoot) && !inside(publicRoot, workRoot), 'WORK_PATHS');
  await noLinks(path.dirname(workRoot)); await noLinks(publicRoot);
  await fs.mkdir(workRoot, { mode: 0o700 });
  const state = await authenticate({ workRoot, publicRoot });
  need(Date.parse(targetReferenceAt) > Date.parse(state.descriptor.productionReferenceAt), 'TARGET_NOT_NEWER');
  const archiveRoot = path.join(workRoot, 'archive'), objects = objectsOf(state.descriptor);
  const storage = expectedExistingArchiveId === null ? state.clients.storage
    : readOnlyExistingColdArchiveStorage(objects, expectedExistingArchiveId);
  const capture = await createWeatherStateEpochCaptureStorage({ storage, captureRoot: archiveRoot, objects });
  for (const object of objects) await capture.storage.download(object.objectPath);
  const verifyOriginalSnapshot = async ({ captureFiles, archivedFiles }) => {
    same(captureFiles.map(({ index, objectPath, objectBytes, objectSha256 }) => ({ index, objectPath, objectBytes, objectSha256 })),
      objects, 'CAPTURE_OBJECTS');
    const fresh = await authenticate({ workRoot, publicRoot, expectedRows: state.rows,
      expectedTuple: state.tuple, expectedRegistry: state.registry });
    return { ...fresh.snapshot, files: archivedFiles ?? state.snapshot.files };
  };
  // The common archive kernel stays model-byte-identical. In reopen mode the
  // fixed readonly facade rejects another computed archive prefix before its
  // first object GET; only the bucket's read-only HEAD can precede that refusal.
  const archive = await saveWeatherStateEpochArchive({ capture: capture.capture, storage,
    targetReferenceAt, verifyOriginalSnapshot });
  const archived = assertVerifiedWeatherStateEpochArchive(archive), acquired = await acquisitions(state, workRoot);
  const context = { schemaVersion: 1, kind: 'CURRENT_FAMILY_CALLER_ONLY_COLD_START_LOCATOR',
    targetReferenceAt, workRoot, publicRoot, archiveRoot, archiveId: archived.archiveId,
    archiveCatalogSha256: archived.archiveCatalogSha256, originalBoundary: rowIdentity(state.rows),
    sourceTuple: state.tuple, registrySha256: state.registrySha256,
    acquisition: acquired.rows, outputSeed: acquired.outputSeed, fixedPredecessor: acquired.predecessor,
    retiredActive: acquired.retiredActive, retiredInputs: acquired.retiredInputs, forecastSeed: acquired.forecastSeed };
  const contextPath = path.join(workRoot, 'context.json'), bytes = jsonBytes(context);
  await writeNew(contextPath, bytes);
  return Object.freeze({ capability: mint(state, archive, context), contextPath, contextSha256: sha(bytes) });
}
export async function loadCurrentFamilyColdStartForTarget({ contextPath, contextSha256, targetReferenceAt } = {}) {
  hour(targetReferenceAt); need(path.isAbsolute(contextPath ?? '') && SHA.test(contextSha256 ?? ''), 'CONTEXT_ARGUMENTS');
  const bytes = await exactBytes(contextPath, null, 4 * MB); need(sha(bytes) === contextSha256, 'CONTEXT_SHA');
  const context = JSON.parse(bytes);
  need(context.schemaVersion === 1 && context.kind === 'CURRENT_FAMILY_CALLER_ONLY_COLD_START_LOCATOR'
    && context.targetReferenceAt === targetReferenceAt && path.dirname(contextPath) === context.workRoot
    && context.archiveRoot === path.join(context.workRoot, 'archive')
    && context.workRoot !== ROOT && !inside(ROOT, context.workRoot), 'CONTEXT_IDENTITY');
  const state = await authenticate({ workRoot: context.workRoot, publicRoot: context.publicRoot,
    expectedIdentity: context.originalBoundary, expectedTuple: context.sourceTuple });
  need(state.registrySha256 === context.registrySha256, 'REGISTRY_CHANGED');
  const verifyOriginalSnapshot = async ({ captureFiles, archivedFiles }) => {
    same(captureFiles.map(({ index, objectPath, objectBytes, objectSha256 }) => ({ index, objectPath, objectBytes, objectSha256 })),
      objectsOf(state.descriptor), 'CAPTURE_OBJECTS');
    const fresh = await authenticate({ workRoot: context.workRoot, publicRoot: context.publicRoot,
      expectedRows: state.rows, expectedTuple: state.tuple, expectedRegistry: state.registry });
    return { ...fresh.snapshot, files: archivedFiles };
  };
  const archive = await rehydrateLocalWeatherStateEpochArchive({ archiveRoot: context.archiveRoot,
    archiveId: context.archiveId, archiveCatalogSha256: context.archiveCatalogSha256,
    targetReferenceAt, verifyOriginalSnapshot });
  const originalBulk = scalarBulk(await readDmiBulkDocument(path.join(state.payload, 'data/live/dmi-bulk-cache.json')));
  need(context.outputSeed?.path === path.join(context.workRoot, 'acquisition-output-seed.json'), 'ACQUISITION_PATH');
  await verifyScalarAcquisition(context.outputSeed, originalBulk);
  const originals = await originalFixedAcquisitions(state), original = originals.candidate;
  await verifyRetiredActive(originals.active, context);
  await verifyRetiredWorkingInputs(state, originals, context);
  if (original === null) need(context.fixedPredecessor === null, 'ORIGINAL_CANDIDATE_CHANGED');
  else {
    const row = context.fixedPredecessor;
    need(row?.path === path.join(context.workRoot, 'original-working-candidate.json')
      && row.packSha256 === original.packSha256, 'ORIGINAL_CANDIDATE_CHANGED');
    same(await exactBytes(row.path, original.descriptor, 256 * MB), original.bytes, 'ORIGINAL_CANDIDATE_CHANGED');
  }
  for (const [role, name] of Object.entries({ outputPath: 'acquisition-output.json',
    deployedFallbackPath: 'acquisition-fallback.json', publishedBaselinePath: 'acquisition-published-baseline.json' })) {
    const row = context.acquisition?.[role];
    need(row?.path === (role === 'outputPath' ? FIXED_CANDIDATE : path.join(context.workRoot, name)), 'ACQUISITION_PATH');
    if (role === 'outputPath') {
      // The normal producer owns this mutable output after the immutable seed
      // was supplied. Its new rows still need the unchanged native/proof gates;
      // this capability never authenticates or admits those numeric rows.
      await noLinks(row.path); const info = await fs.lstat(row.path);
      need(info.isFile() && info.nlink === 1 && info.size >= 2 && info.size <= 256 * MB, 'ACQUISITION_OUTPUT');
    } else await verifyScalarAcquisition(row, originalBulk);
  }
  return mint(state, archive, context);
}
function scoped(capability, { registry, targetReferenceAt } = {}) {
  const value = CAPABILITIES.get(capability); need(value, 'CAPABILITY');
  same(registry, value.state.registry, 'REGISTRY_CHANGED');
  need(targetReferenceAt === value.context.targetReferenceAt, 'TARGET_CHANGED'); return value;
}
export function currentFamilyColdStartProgressUnionScope(capability, scope) {
  const value = scoped(capability, scope), files = value.state.verified.files;
  const conditionsFile = files.find(row => row.relativePath === 'data/live/conditions.json');
  const componentPackFile = files.find(row => row.relativePath === PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
  need(conditionsFile && componentPackFile, 'FILE_IDENTITY');
  return Object.freeze({ repositoryRoot: ROOT,
    protectedBundleContentSha256: value.state.descriptor.bundleContentSha256,
    conditionsFile: Object.freeze({ ...conditionsFile }), componentPackFile: Object.freeze({ ...componentPackFile }),
    targetReferenceAt: value.context.targetReferenceAt, registrySha256: value.context.registrySha256 });
}
export function currentFamilyColdStartScoreInputs(capability, scope) {
  const value = scoped(capability, scope);
  return Object.freeze({ previousCoastalParts: null, previousCandidateGRollbackRuntime: null,
    pointStateInjections: Object.freeze({}), checkpointStates: Object.freeze({}),
    checkpointCandidateGRollbackStates: Object.freeze({}), deployedBulkCache: null,
    historicalDmiBulkCache: null, persistedDmiPartRows: new Map(), previousCurrentSourceDomainTransitions: null,
    candidateGBootstrapMode: 'integrated-state-less-recovery', candidateGSourceValidated: false,
    stateLessRecovery: true, establishedNativeCurrentOrigin: value.state.origin });
}
export function currentFamilyColdStartScalarRecord(capability, record) {
  need(CAPABILITIES.has(capability), 'CAPABILITY'); const selected = withoutCurrent(record);
  if (selected) selected.hourly = selected.hourly.map(row => {
    const { currentStateOnlyHold: _hold, currentCoastNormalSpeedMps: _normal, ...rest } = row; return rest;
  });
  return selected;
}
export function currentFamilyColdStartAcquisitionChoices(capability) {
  const value = CAPABILITIES.get(capability); need(value, 'CAPABILITY');
  return Object.freeze(Object.fromEntries(Object.entries(value.context.acquisition).map(([role, row]) => [role, row.path])));
}
export function currentFamilyColdStartBoundary(capability, scope) {
  const value = scoped(capability, scope);
  return Object.freeze({ schemaVersion: 1, kind: 'ARCHIVE_BACKED_CALLER_ONLY_CURRENT_COLD_BOUNDARY',
    selection: 'MEASURED_COLD_WITHOUT_OLD_CURRENT_STATE', targetReferenceAt: value.context.targetReferenceAt,
    archiveId: value.archived.archiveId, archiveCatalogSha256: value.archived.archiveCatalogSha256,
    bundleContentSha256: value.state.descriptor.bundleContentSha256,
    generationSha256: value.state.rows.checkpoint.payload.generationSha256,
    pointerVersion: value.state.rows.pointer.version, checkpointVersion: value.state.rows.checkpoint.version,
    registrySha256: value.context.registrySha256, sourceTuple: structuredClone(value.state.tuple) });
}
// Eviction scope only. This is NOT a committed-old-S retention assertion and
// grants no CURRENT admission. The normal caller must bind its complete input
// hashes separately. Python remeasures the actual catalog and old S bytes.
export function currentFamilyColdStartRawRetention(capability, scope) {
  const value = scoped(capability, scope), old = value.state.descriptor;
  const conditions = value.state.verified.files.find(row => row.relativePath === 'data/live/conditions.json');
  return Object.freeze({ schemaVersion: 1, kind: 'ARCHIVE_ISOLATED_COLD_RAW_RETENTION',
    boundary: Object.freeze({ datasetId: old.datasetId, productionReferenceAt: old.productionReferenceAt,
      bundleContentSha256: old.bundleContentSha256,
      checkpointGenerationSha256: value.state.rows.checkpoint.payload.generationSha256,
      conditionsSha256: conditions.sha256 }),
    archive: Object.freeze({ archiveId: value.archived.archiveId,
      archiveCatalogSha256: value.archived.archiveCatalogSha256,
      catalogPath: path.join(value.context.archiveRoot, 'catalog.json.gz'),
      pointerVersion: value.state.rows.pointer.version, checkpointVersion: value.state.rows.checkpoint.version,
      targetReferenceAt: value.context.targetReferenceAt, registrySha256: value.context.registrySha256,
      selection: 'MEASURED_COLD_WITHOUT_OLD_CURRENT_STATE' }), captures: Object.freeze([]) });
}
