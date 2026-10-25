import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { ownFileDescriptorIdentity, ownedFileDescriptorClosed,
  buildPrivateWeatherComponentPack, unpackPrivateWeatherComponentPack } from './lib/private-weather-component-pack.mjs';
import {
  DMI_BULK_STORAGE_SCHEMA,
  decodeDmiBulkWrapper,
  readDmiBulkDocument,
  writeDmiBulkDocument,
} from './lib/dmi-bulk-storage.mjs';
import { inspectDmiForecastFile, readDmiForecastRecord, writeDmiForecastRecords,
  readDmiForecastFile, writeDmiForecastFileAtomic, DMI_FORECAST_FILE_MAX_BYTES } from './lib/dmi-forecast-file.mjs';
import { withoutCurrent } from './lib/private-dmi-recovery-record.mjs';
import { PRIVATE_WEATHER_COMPONENT_PACK_FILE } from './lib/private-weather-component-inventory.mjs';
import { packDmiPartContinuity, unpackDmiPartContinuity, assertDmiPartContinuityTotalSize }
  from './lib/dmi-part-continuity.mjs';

const source = Object.freeze({
  collection: 'dkss_lf', modelRun: '2026-09-08T12:00:00Z', itemId: 'private-test',
  gridPoint: Object.freeze([1, 2]), provider: 'dmi', future: Object.freeze({ nested: true }),
  ['__proto__']: Object.freeze({ safe: true }),
});
const logical = { schemaVersion: 2, zones: { 'PART::T': { hourly: {
  '2026-09-08T12:00:00Z': { time: '2026-09-08T12:00:00Z', sources: {
    current: { ...source, gridPoint: [1, 2] }, wave: { ...source, gridPoint: [1, 2] },
  } },
} } } };
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-dmi-storage-'));
try {
  const file = path.join(directory, 'dmi.json');
  await writeDmiBulkDocument(file, logical);
  const stored = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(stored.storageSchema, DMI_BULK_STORAGE_SCHEMA);
  const decoded = await readDmiBulkDocument(file);
  assert.equal(decoded.zones['PART::T'].hourly['2026-09-08T12:00:00Z'].sources.current.provider, 'dmi');
  assert.deepEqual(decoded.zones['PART::T'].hourly['2026-09-08T12:00:00Z'].sources.current.__proto__, { safe: true });
  assert.equal(Object.getPrototypeOf(decoded.zones['PART::T'].hourly['2026-09-08T12:00:00Z'].sources.current), Object.prototype);
  assert.doesNotThrow(() => structuredClone(decoded.zones['PART::T'].hourly['2026-09-08T12:00:00Z'].sources.current));
  assert.throws(() => { decoded.zones['PART::T'].hourly['2026-09-08T12:00:00Z'].sources.current.provider = 'other'; });
  const malformed = structuredClone(stored);
  malformed.document.zones['PART::T'].hourly['2026-09-08T12:00:00Z'].sources.current.$dmiSource[0] = true;
  const malformedBefore = structuredClone(malformed);
  assert.throws(() => decodeDmiBulkWrapper(malformed));
  assert.deepEqual(malformed, malformedBefore);

  const collision = structuredClone(logical);
  collision.zones['PART::T'].hourly['2026-09-08T12:00:00Z'].sources.current.future = { nested: 'first' };
  collision.zones['PART::T'].hourly['2026-09-08T12:00:00Z'].sources.wave.future = { nested: 'second' };
  await writeDmiBulkDocument(file, collision);
  const distinct = await readDmiBulkDocument(file);
  assert.equal(distinct.zones['PART::T'].hourly['2026-09-08T12:00:00Z'].sources.current.future.nested, 'first');
  assert.equal(distinct.zones['PART::T'].hourly['2026-09-08T12:00:00Z'].sources.wave.future.nested, 'second');

  const previousBytes = await fs.readFile(file);
  collision.zones['PART::T'].hourly['2026-09-08T12:00:00Z'].sources.wave.$dmiSource = [0, 0, 0];
  const invalidBefore = structuredClone(collision);
  await assert.rejects(writeDmiBulkDocument(file, collision));
  assert.deepEqual(collision, invalidBefore);
  assert.deepEqual(await fs.readFile(file), previousBytes);

  const deep = JSON.parse(previousBytes.toString('utf8'));
  let cursor = deep.sourceTables.semantics[0];
  for (let index = 0; index < 70; index += 1) { cursor.deep = {}; cursor = cursor.deep; }
  assert.throws(() => decodeDmiBulkWrapper(deep));

  // Exercise the actual C constructor and authenticated immutable reader with
  // normal filesystem/codec/descriptor functions. Only the surrounding B/S
  // authentication is outside this small unit; the full prepare/load proof is
  // separate. No product function or storage/closure check is replaced.
  const productRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const caller = await fs.readFile(path.join(productRoot, 'scripts/current-family-cold-start.mjs'), 'utf8');
  const section = (start, end) => {
    const at = caller.indexOf(start), to = caller.indexOf(end, at + start.length);
    assert(at >= 0 && to > at, 'The actual cold-storage function boundaries must exist.');
    return caller.slice(at, to);
  };
  const coldRoot = path.join(directory, 'cold-source'), workRoot = path.join(directory, 'cold-work');
  const payload = path.join(directory, 'cold-original'), bulkFile = path.join(payload, 'data/live/dmi-bulk-cache.json');
  await fs.mkdir(path.join(coldRoot, '.cache'), { recursive: true });
  await fs.mkdir(workRoot);
  const cold = new Function('fs', 'path', 'crypto', 'equal', 'readDmiBulkDocument', 'writeDmiBulkDocument',
    'decodeDmiBulkWrapper', 'ownFileDescriptorIdentity', 'ownedFileDescriptorClosed',
    'inspectDmiForecastFile', 'readDmiForecastRecord', 'writeDmiForecastRecords',
    'DMI_FORECAST_FILE_MAX_BYTES', 'withoutCurrent', 'packDmiPartContinuity', 'unpackDmiPartContinuity', 'assertDmiPartContinuityTotalSize', 'ROOT',
    '"use strict";\n' + section('const CAPABILITIES =', 'export const CURRENT_FAMILY_COLD_START_CONTEXT_ENV')
      + section('const SCALARS =', 'async function sourceTuple()')
      + section('function decodedBulkBytes(', 'function mint(')
      + '\nreturn { acquisitions, verifyScalarAcquisition, originalFixedAcquisitions, verifyRetiredActive, verifyRetiredWorkingInputs, retireFixedInput, verifyScalarForecast, retiredFiles: RETIRED_CURRENT_FILES };')(
    fs, path, crypto, isDeepStrictEqual, readDmiBulkDocument, writeDmiBulkDocument,
    decodeDmiBulkWrapper, ownFileDescriptorIdentity, ownedFileDescriptorClosed,
    inspectDmiForecastFile, readDmiForecastRecord, writeDmiForecastRecords,
    DMI_FORECAST_FILE_MAX_BYTES, withoutCurrent, packDmiPartContinuity, unpackDmiPartContinuity, assertDmiPartContinuityTotalSize, coldRoot);
  const scalarSource = { collection: 'dkss_nsbs', modelRun: '2026-10-18T00:00:00.000Z',
    itemId: 'synthetic-scalar-storage-only', provider: 'dmi', gridPoint: [1, 2],
    samplingPoint: [10, 56], samplingContext: 'synthetic-scalar-storage',
    assetIdentitySha256: 'a'.repeat(64), contentSha256: 'b'.repeat(64),
    sourceRegistrySha256: 'c'.repeat(64), samplingPointSha256: 'd'.repeat(64) };
  const hourly = Object.fromEntries(Array.from({ length: 121 }, (_, index) => {
    const time = new Date(Date.parse('2026-10-18T00:00:00.000Z') + index * 3600000).toISOString();
    return [time, { time, 'sea-mean-deviation': 3, 'current-u': 7, 'current-v': 8,
      sources: { waterLevel: scalarSource, current: scalarSource } }];
  }));
  await writeDmiBulkDocument(bulkFile, { schemaVersion: 2, zones: { sample: { hourly } } });
  const before = await fs.readFile(bulkFile);
  const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const forecastRelative = 'data/live/dmi-forecast-cache.json', forecastFile = path.join(payload, forecastRelative);
  // Two normal PART records contain scalar weather not present in bulk or
  // zone rows. A CURRENT-only cold start must keep every one of these 121
  // rows, including support rows 118..120, through normal save/restore.
  const scalarParts = [
    { partId: 'test-old-PART', zoneId: 'DK-B01-01', waterPoint: [10, 56] },
    { partId: 'test-old-PART-B', zoneId: 'DK-B01-01', waterPoint: [10.1, 56.1] },
  ];
  const partReferenceAt = Object.keys(hourly)[0];
  const partRecords = new Map(scalarParts.map((part, partIndex) => [part.partId, {
    zoneId: 'PART::' + part.partId, point: part.waterPoint,
    hourly: Object.keys(hourly).map((time, index) => ({ time,
      windSpeedMps: 2 + partIndex + index / 1000, windDirectionDeg: 40 + index,
      waveHeightM: 0.2 + index / 1000, wavePeriodS: 4 + partIndex,
      waveDirectionDeg: 45 + index, waterLevelCm: index - 20, waterTemperatureC: 12 + partIndex,
      currentUMps: 0.3, currentVMps: 0.4, currentSpeedMps: 0.5, currentDirectionDeg: 36,
      currentCoastNormalSpeedMps: 0.1,
      ...(index % 2 ? { currentStateOnlyHold: { synthetic: true } } : {}),
      currentProvenance: { syntheticOld: true },
      sources: Object.fromEntries(['wind', 'wave', 'waterLevel', 'waterTemperature', 'current'].map(component =>
        [component, { ...scalarSource, itemId: 'saved-part-only-' + partIndex + '-' + component,
          samplingPoint: part.waterPoint, ...(component === 'current' ? { vectorSemanticsVersion: 3 } : {}) }])),
    })),
  }]));
  const partPack = await packDmiPartContinuity(partRecords, scalarParts, partReferenceAt,
    { nativeCurrentProofsByPart: new Map(scalarParts.map(part => [part.partId, null])) });
  const savedPartRows = await unpackDmiPartContinuity(partPack, scalarParts, partReferenceAt);
  assert(savedPartRows.get(scalarParts[0].partId).nativeCurrentOriginals.coverage.some(row =>
    row.status === 'DMI_SELECTION_PROOF_NOT_STORED' && row.sampling === 'source-invalid'));
  const expectedScalarParts = new Map(scalarParts.map(part => [part.partId,
    partRecords.get(part.partId).hourly.map(row => {
      const clean = { ...row, sources: { ...row.sources } };
      delete clean.sources.current;
      for (const key of ['currentUMps', 'currentVMps', 'currentSpeedMps', 'currentDirectionDeg',
        'currentProvenance', 'currentCoastNormalSpeedMps', 'currentStateOnlyHold']) delete clean[key];
      return clean;
    })]));
  const assertScalarParts = async document => {
    assert(document.partContinuity, 'CURRENT_ONLY_COLD_START_MUST_PRESERVE_SCALAR_PART_HOURS');
    assert.equal(document.partContinuity.schemaVersion, 1, 'Only a scalar working view; no old native bank.');
    const decoded = await unpackDmiPartContinuity(document.partContinuity, scalarParts, partReferenceAt);
    assert.equal(decoded.size, scalarParts.length);
    for (const part of scalarParts) {
      assert.deepEqual(decoded.get(part.partId).hourly, expectedScalarParts.get(part.partId));
      assert.equal(decoded.get(part.partId).nativeCurrentOriginals, undefined);
    }
  };
  const forecastDocument = { schemaVersion: 2, runtime: { nextZoneCursor: 7 },
    zones: { sample: { zoneId: 'sample', point: [10, 56], model: { completeness: {
      current: true, currentVectorSelection: 'native', gridPoints: { 'current-u': [1, 2], wave: [1, 2] },
    } }, hourly: [{ time: Object.keys(hourly)[0], windSpeedMps: 2, windDirectionDeg: 3,
      waveHeightM: 4, wavePeriodS: 5, waveDirectionDeg: 6, waterTemperatureC: 7, waterLevelCm: 8,
      currentUMps: 9, currentVMps: 10, currentSpeedMps: 11, currentDirectionDeg: 12,
      currentCoastNormalSpeedMps: 13, currentStateOnlyHold: true, currentProvenance: { status: 'old-test' },
      sources: { current: { provider: 'dmi' }, wind: { provider: 'dmi' }, waterLevel: { provider: 'dmi' } } }] } },
    partContinuity: partPack,
    waterSourceContinuity: { schemaVersion: 1, entries: [{ sourceKey: 'test-water-source',
      hourly: [{ time: Object.keys(hourly)[0], waterLevelCm: 8 }] }] } };
  await writeDmiForecastFileAtomic(forecastFile, forecastDocument);
  const originalForecast = await fs.readFile(forecastFile);
  const preservedPartSnapshot = { originalConditions: { coastalParts: {
    parts: Object.fromEntries(scalarParts.map(part => [part.partId, part])),
  } } };
  const state = { payload, snapshot: preservedPartSnapshot, verified: { files: [{ relativePath: 'data/live/dmi-bulk-cache.json',
    bytes: before.length, sha256: hash(before) },
    { relativePath: forecastRelative, bytes: originalForecast.length, sha256: hash(originalForecast) }] } };
  const resetMixed = async () => {
    await fs.mkdir(path.join(coldRoot, 'data/live'), { recursive: true });
    // OLD working bulk is legitimately materialized before prepare. Its raw
    // bytes differ from the normal stored wrapper but decoded identity agrees.
    await fs.writeFile(path.join(coldRoot, 'data/live/dmi-bulk-cache.json'), JSON.stringify(await readDmiBulkDocument(bulkFile)));
    await fs.copyFile(bulkFile, path.join(coldRoot, '.cache/deployed-dmi-bulk-cache.json'));
    await fs.copyFile(forecastFile, path.join(coldRoot, forecastRelative));
  };
  await resetMixed();
  const baselinePath = path.join(coldRoot, 'data/live/conditions.json');
  const checkpointPath = path.join(coldRoot, '.cache/ravscore-continuation-checkpoint/checkpoint.json');
  await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
  await fs.writeFile(baselinePath, 'OLD authentication baseline');
  await fs.writeFile(checkpointPath, 'OLD working S required by Python retention');
  const acquired = await cold.acquisitions(state, workRoot);
  assert.equal(acquired.predecessor, null);
  const locator = value => ({ workRoot: path.dirname(value.outputSeed.path),
    retiredActive: value.retiredActive, retiredInputs: value.retiredInputs, forecastSeed: value.forecastSeed });
  await cold.verifyRetiredWorkingInputs(state, await cold.originalFixedAcquisitions(state), locator(acquired));
  const scalarForecast = await readDmiForecastFile(path.join(coldRoot, forecastRelative));
  await assertScalarParts(scalarForecast);
  // The normal schema1 predecessor is also readable without inventing an
  // original bank or admitting its CURRENT family to the scalar working view.
  const legacyForecastFile = path.join(directory, 'schema1-original-forecast.json');
  await writeDmiForecastFileAtomic(legacyForecastFile, { ...forecastDocument,
    partContinuity: await packDmiPartContinuity(partRecords, scalarParts, partReferenceAt) });
  const legacyForecastBytes = await fs.readFile(legacyForecastFile);
  await cold.verifyScalarForecast({ path: legacyForecastFile, bytes: legacyForecastBytes.length,
    sha256: hash(legacyForecastBytes) }, acquired.forecastSeed, workRoot,
  preservedPartSnapshot.originalConditions.coastalParts.parts);
  assert.deepEqual(scalarForecast.waterSourceContinuity, forecastDocument.waterSourceContinuity);
  assert.deepEqual(scalarForecast.runtime, forecastDocument.runtime);
  const scalarHour = scalarForecast.zones.sample.hourly[0];
  for (const key of ['windSpeedMps', 'windDirectionDeg', 'waveHeightM', 'wavePeriodS',
    'waveDirectionDeg', 'waterTemperatureC', 'waterLevelCm']) {
    assert.equal(scalarHour[key], forecastDocument.zones.sample.hourly[0][key]);
  }
  for (const key of ['currentUMps', 'currentVMps', 'currentSpeedMps', 'currentDirectionDeg',
    'currentProvenance', 'currentCoastNormalSpeedMps', 'currentStateOnlyHold']) assert.equal(Object.hasOwn(scalarHour, key), false);
  assert.equal(Object.hasOwn(scalarHour.sources, 'current'), false);
  assert.equal(scalarForecast.zones.sample.model.completeness.current, false);
  assert.deepEqual(await fs.readFile(forecastFile), originalForecast);
  assert.equal(await fs.readFile(baselinePath, 'utf8'), 'OLD authentication baseline');
  assert.equal(await fs.readFile(checkpointPath, 'utf8'), 'OLD working S required by Python retention');
  const expected = { zones: { sample: { hourly: Object.fromEntries(Object.entries(hourly).map(([time, row]) => [
    time, { time, 'sea-mean-deviation': row['sea-mean-deviation'], sources: { waterLevel: scalarSource } },
  ])) } }, schemaVersion: 2 };
  const installed = await fs.readFile(acquired.rows.outputPath.path);
  assert.equal(JSON.parse(installed).storageSchema, DMI_BULK_STORAGE_SCHEMA);
  assert(installed.length < Buffer.byteLength(JSON.stringify(expected)), 'Repeated provenance must stay dictionary encoded.');
  for (const row of [acquired.outputSeed, acquired.rows.deployedFallbackPath, acquired.rows.publishedBaselinePath]) {
    assert.deepEqual(await fs.readFile(row.path), installed);
    await cold.verifyScalarAcquisition(row, expected);
    await assert.rejects(cold.verifyScalarAcquisition({ ...row, sha256: '0'.repeat(64) }, expected), /FILE_IDENTITY/);
    const changed = structuredClone(expected);
    changed.zones.sample.hourly[Object.keys(hourly)[0]]['sea-mean-deviation'] = 4;
    await assert.rejects(cold.verifyScalarAcquisition(row, changed), /ACQUISITION_CHANGED/);
  }
  await fs.writeFile(acquired.rows.outputPath.path, '{"zones":{}}\n');
  await cold.verifyScalarAcquisition(acquired.outputSeed, expected);
  await assert.rejects(cold.acquisitions(state, workRoot), /UNOWNED_FIXED_CANDIDATE/);
  assert.deepEqual(await fs.readFile(bulkFile), before, 'The authenticated original must remain byte-identical.');

  // Regression: OLD active + a partial NEW DMI generation. Exercise the real
  // pack producer/unpacker and constructor, not a synthetic READY exemption.
  const candidatePath = path.join(coldRoot, '.cache/dmi-candidate-progress.json');
  const activePath = path.join(coldRoot, '.cache/dmi-active-complete.json');
  const oldDocument = { schemaVersion: 2, zones: { sample: { hourly } } };
  await writeDmiBulkDocument(candidatePath, oldDocument);
  await writeDmiBulkDocument(activePath, oldDocument);
  const oldCandidate = await fs.readFile(candidatePath), oldActive = await fs.readFile(activePath);
  const expectedRetired = ['.cache/dmi-active-complete.json', '.cache/current-field-shadow.json',
    '.cache/copernicus-current-shadow.json', '.cache/copernicus-current-source-stage.json',
    '.cache/copernicus-current-donor-bank.json', '.cache/copernicus-current-segment-journal.json',
    '.cache/open-meteo-current-fallback.json', '.cache/open-meteo-current-donor-bank.json',
    'data/live/current-pilot-history.json', '.cache/coastal-point-staging/dmi.json',
    '.cache/coastal-point-staging/state.json', '.cache/coastal-point-staging/status.json',
    '.cache/coastal-point-staging/activation-state-injection.json', '.cache/coastal-point-staging/pending-promotion.json'];
  assert.deepEqual(Object.values(cold.retiredFiles), expectedRetired);
  const currentOriginals = {};
  for (const [id, relative] of Object.entries(cold.retiredFiles)) {
    const target = path.join(coldRoot, relative); await fs.mkdir(path.dirname(target), { recursive: true });
    if (id === 'pointPromotion') { currentOriginals[id] = null; continue; }
    if (id !== 'active') await fs.writeFile(target, JSON.stringify({ schemaVersion: 1, oldCurrentInput: id }) + '\n');
    currentOriginals[id] = await fs.readFile(target);
  }
  const pilotRelative = 'data/live/current-pilot-history.json';
  await fs.copyFile(path.join(coldRoot, pilotRelative), path.join(payload, pilotRelative));
  const pilotFile = { relativePath: pilotRelative, bytes: currentOriginals.pilot.length, sha256: hash(currentOriginals.pilot) };
  // Scalar progress is deliberately retained, not swept with current inputs.
  const cursorPath = path.join(coldRoot, '.cache/weather-component-fallback-cursor.json');
  await fs.writeFile(cursorPath, '{"schemaVersion":1,"nextScalar":7}\n');
  const scalarCursor = await fs.readFile(cursorPath);
  await resetMixed();
  const packed = await buildPrivateWeatherComponentPack({ repositoryRoot: coldRoot,
    outputRoot: payload, conditions: {}, includeOperationalProgress: true });
  const oldPack = await fs.readFile(packed.sourcePath);
  const packedState = { payload, snapshot: preservedPartSnapshot, verified: { files: [...state.verified.files, pilotFile,
    { relativePath: '.cache/weather-component-inputs.pack', bytes: oldPack.length, sha256: hash(oldPack) }] } };
  // An armed admin promotion is NOT disposable current history. Authenticate
  // its whole-pack presence/absence before ANY mutable working operation.
  // These are storage-contract fixtures, not a synthetic READY/CAS grant.
  const pendingPath = path.join(coldRoot, cold.retiredFiles.pointPromotion);
  const pendingBytes = Buffer.from(JSON.stringify({ schemaVersion: 1,
    preparedAt: '2026-10-18T00:00:00.000Z', documentKey: 'direction-reviews',
    expectedVersion: 7, revisions: ['synthetic-request'], partIds: ['test-old-PART'],
    payload: { schemaVersion: 3, zones: {} } }) + '\n');
  await fs.writeFile(pendingPath, pendingBytes);
  const pendingPayload = path.join(directory, 'pending-original-B'); await fs.mkdir(pendingPayload);
  const pendingPack = await buildPrivateWeatherComponentPack({ repositoryRoot: coldRoot,
    outputRoot: pendingPayload, conditions: {}, includeOperationalProgress: true });
  for (const row of [...state.verified.files, pilotFile]) {
    const target = path.join(pendingPayload, row.relativePath); await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(payload, row.relativePath), target);
  }
  const pendingPackBytes = await fs.readFile(pendingPack.sourcePath);
  const pendingState = { payload: pendingPayload, snapshot: preservedPartSnapshot, verified: { files: [...state.verified.files, pilotFile,
    { relativePath: '.cache/weather-component-inputs.pack', bytes: pendingPackBytes.length, sha256: hash(pendingPackBytes) }] } };
  const unchangedPaths = [...Object.values(cold.retiredFiles), '.cache/dmi-candidate-progress.json',
    'data/live/dmi-bulk-cache.json', '.cache/deployed-dmi-bulk-cache.json', forecastRelative,
    'data/live/conditions.json', '.cache/ravscore-continuation-checkpoint/checkpoint.json',
    '.cache/weather-component-fallback-cursor.json'];
  const workingSnapshot = async () => Promise.all(unchangedPaths.map(async relative => {
    const file = path.join(coldRoot, relative);
    try { return [relative, await fs.readFile(file)]; }
    catch (error) { if (error.code === 'ENOENT') return [relative, null]; throw error; }
  }));
  for (const kind of ['authenticated', 'foreign', 'changed', 'missing']) {
    await fs.writeFile(pendingPath, kind === 'changed' ? '{"changedPending":true}' : pendingBytes);
    if (kind === 'missing') await fs.unlink(pendingPath);
    const snapshot = await workingSnapshot();
    const pendingWork = path.join(directory, 'pending-refusal-' + kind); await fs.mkdir(pendingWork);
    await assert.rejects(cold.acquisitions(kind === 'foreign' ? packedState : pendingState, pendingWork),
      error => error.code === 'CURRENT_FAMILY_COLD_START_' + (kind === 'authenticated' ? 'PENDING_POINT_PROMOTION' : 'FILE_IDENTITY'));
    assert.deepEqual(await workingSnapshot(), snapshot,
      'Pending refusal must preserve conditions/S/candidate/active/all mixed and staging working files.');
    assert.deepEqual(await fs.readdir(pendingWork), [], 'Refuse before even the first working predecessor copy.');
    assert.deepEqual(await fs.readFile(pendingPack.sourcePath), pendingPackBytes);
    assert.deepEqual(await fs.readFile(packed.sourcePath), oldPack);
  }
  await fs.rm(pendingPath, { force: true });
  const activeWork = path.join(directory, 'cold-active-work'); await fs.mkdir(activeWork);
  const withActive = await cold.acquisitions(packedState, activeWork);
  // OLD implementation fails HERE: it leaves the authenticated old active
  // available to the later pack and next ordinary READY branch.
  await assert.rejects(fs.access(activePath), error => error.code === 'ENOENT');
  assert.deepEqual(await fs.readFile(withActive.retiredActive.path), oldActive);
  assert.deepEqual(await fs.readFile(packed.sourcePath), oldPack);
  assert.deepEqual(await fs.readFile(bulkFile), before);
  const originalPair = await cold.originalFixedAcquisitions(packedState);
  const context = locator(withActive);
  await cold.verifyRetiredActive(originalPair.active, context);
  await cold.verifyRetiredWorkingInputs(packedState, originalPair, context);
  for (const [id, relative] of Object.entries(cold.retiredFiles)) {
    await assert.rejects(fs.access(path.join(coldRoot, relative)), error => error.code === 'ENOENT');
    if (currentOriginals[id] === null) assert.equal(withActive.retiredInputs[id], null);
    else assert.deepEqual(await fs.readFile(withActive.retiredInputs[id].path), currentOriginals[id]);
  }
  assert.deepEqual(await fs.readFile(cursorPath), scalarCursor);
  const newHour = Object.keys(hourly)[0];
  const partial = { schemaVersion: 2, zones: { sample: { hourly: {
    [newHour]: { time: newHour, 'sea-mean-deviation': 3, 'current-u': 0.03, 'current-v': 0.04,
      sources: { current: { ...scalarSource, itemId: 'synthetic-new-partial-current' } } },
  } } } };
  await writeDmiBulkDocument(candidatePath, partial);
  // Deliberately no READY promotion. The actual new pack/normal restore must
  // contain the partial candidate, never the retired OLD active.
  const nextRoot = path.join(directory, 'new-partial-pack');
  await fs.mkdir(nextRoot);
  const nextPack = await buildPrivateWeatherComponentPack({ repositoryRoot: coldRoot,
    outputRoot: nextRoot, conditions: {}, includeOperationalProgress: true });
  assert(nextPack);
  const followerRoot = path.join(directory, 'ordinary-follower-inputs');
  const restored = await unpackPrivateWeatherComponentPack({ restoredRoot: nextRoot,
    outputRoot: followerRoot, conditions: {}, includeOperationalProgress: true });
  assert(restored.some(row => row.relativePath === '.cache/dmi-candidate-progress.json'));
  for (const relative of expectedRetired) assert(!restored.some(row => row.relativePath === relative),
    'No OLD current/staging alias may enter the ordinary follower pack.');
  assert(!restored.some(row => row.relativePath === '.cache/dmi-active-complete.json'));
  await assert.rejects(fs.access(path.join(followerRoot, '.cache/dmi-active-complete.json')),
    error => error.code === 'ENOENT');
  assert.deepEqual(await readDmiBulkDocument(path.join(followerRoot, '.cache/dmi-candidate-progress.json')), partial);
  const followerForecast = await readDmiForecastFile(path.join(followerRoot, forecastRelative));
  await assertScalarParts(followerForecast);
  assert.deepEqual(followerForecast.waterSourceContinuity, forecastDocument.waterSourceContinuity);
  assert.deepEqual(await fs.readFile(path.join(followerRoot, '.cache/weather-component-fallback-cursor.json')), scalarCursor);
  assert.deepEqual(await fs.readFile(packed.sourcePath), oldPack, 'The whole authenticated original pack is unchanged.');
  // A later normal producer may legitimately create NEW active. Re-reading
  // the retired OLD receipt must not remove or overwrite that new working file.
  await writeDmiBulkDocument(activePath, partial);
  const newActive = await fs.readFile(activePath);
  // Re-load verification reads ONLY OLD preserved copies, even after all
  // normal NEW producer paths have changed. It cannot remove a new product.
  const newWorking = {};
  for (const [id, relative] of Object.entries(cold.retiredFiles)) {
    const target = path.join(coldRoot, relative); await fs.mkdir(path.dirname(target), { recursive: true });
    if (id !== 'active') await fs.writeFile(target, JSON.stringify({ newProduct: id }));
    newWorking[relative] = await fs.readFile(target);
  }
  await fs.writeFile(path.join(coldRoot, forecastRelative), '{"newProduct":"forecast"}');
  await fs.writeFile(path.join(coldRoot, 'data/live/dmi-bulk-cache.json'), '{"newProduct":"bulk"}');
  await fs.writeFile(path.join(coldRoot, '.cache/deployed-dmi-bulk-cache.json'), '{"newProduct":"deployed"}');
  await cold.verifyRetiredActive(originalPair.active, context);
  await cold.verifyRetiredWorkingInputs(packedState, originalPair, context);
  for (const [relative, bytes] of Object.entries(newWorking)) assert.deepEqual(await fs.readFile(path.join(coldRoot, relative)), bytes);
  assert.equal(await fs.readFile(path.join(coldRoot, forecastRelative), 'utf8'), '{"newProduct":"forecast"}');
  assert.deepEqual(await fs.readFile(activePath), newActive);
  await fs.writeFile(withActive.retiredActive.path, 'changed private receipt');
  await assert.rejects(cold.verifyRetiredActive(originalPair.active, context), /FILE_IDENTITY/);
  await fs.writeFile(withActive.retiredActive.path, oldActive);

  // Each additional fixed path is bound to its own genuine whole-pack/base
  // entry, not merely present in an allowlist. Test the same real owned move.
  for (const [id, relative] of Object.entries(cold.retiredFiles)) {
    if (id === 'active') continue;
    await fs.writeFile(path.join(coldRoot, relative), 'foreign ' + id);
    const negativeWork = path.join(directory, 'foreign-current-' + id); await fs.mkdir(negativeWork);
    await assert.rejects(cold.retireFixedInput(originalPair.working[id], negativeWork, id), /FILE_IDENTITY/);
    assert.equal(await fs.readFile(path.join(coldRoot, relative), 'utf8'), 'foreign ' + id);
  }
  await assert.rejects(cold.retireFixedInput(originalPair.active, activeWork, '../escape'), /FILE_PATH/);
  await assert.rejects(cold.verifyRetiredWorkingInputs(packedState, originalPair, {
    ...context, retiredInputs: { ...context.retiredInputs, foreign: null },
  }), /FILE_IDENTITY/);
  const realSeedBytes = await fs.readFile(withActive.forecastSeed.path);
  for (const kind of ['old-part-bank', 'water-source-loss', 'scalar-loss', 'part-scalar-loss',
    'part-current-return', 'part-total-drift', 'part-duplicate', 'part-digest-drift']) {
    const bad = structuredClone(scalarForecast);
    if (kind === 'old-part-bank') bad.partContinuity = forecastDocument.partContinuity;
    if (kind === 'water-source-loss') delete bad.waterSourceContinuity;
    if (kind === 'scalar-loss') bad.zones.sample.hourly[0].waveHeightM = null;
    if (kind === 'part-total-drift') bad.partContinuity.rawBytes++;
    if (kind === 'part-duplicate') bad.partContinuity.entries[1] = structuredClone(bad.partContinuity.entries[0]);
    if (kind === 'part-digest-drift') bad.partContinuity.entries[0].compressedSha256 = '0'.repeat(64);
    if (kind === 'part-scalar-loss' || kind === 'part-current-return') {
      const lost = new Map(scalarParts.map(part => [part.partId, { zoneId: 'PART::' + part.partId,
        point: part.waterPoint, hourly: structuredClone(expectedScalarParts.get(part.partId)) }]));
      if (kind === 'part-scalar-loss') lost.get(scalarParts[0].partId).hourly[120].waveHeightM = null;
      else Object.assign(lost.get(scalarParts[0].partId).hourly[120], partRecords.get(scalarParts[0].partId).hourly[120]);
      bad.partContinuity = await packDmiPartContinuity(lost, scalarParts, partReferenceAt);
    }
    if (kind === 'part-duplicate') {
      // The normal atomic writer rejects duplicate entries before installing
      // them; this is an earlier safe refusal, not a verifier bypass.
      await assert.rejects(writeDmiForecastFileAtomic(withActive.forecastSeed.path, bad), /DMI_FORECAST_FILE_SHAPE_INVALID/);
      assert.deepEqual(await fs.readFile(withActive.forecastSeed.path), realSeedBytes);
      continue;
    }
    await writeDmiForecastFileAtomic(withActive.forecastSeed.path, bad);
    const bytes = await fs.readFile(withActive.forecastSeed.path);
    await assert.rejects(cold.verifyScalarForecast(withActive.retiredInputs.forecast,
      { path: withActive.forecastSeed.path, bytes: bytes.length, sha256: hash(bytes) }, activeWork,
      preservedPartSnapshot.originalConditions.coastalParts.parts), kind === 'part-digest-drift'
      ? /DMI_PART_CONTINUITY_COMPRESSED_DIGEST_INVALID/ : /FILE_IDENTITY/);
    await fs.writeFile(withActive.forecastSeed.path, realSeedBytes);
  }
  await cold.verifyRetiredWorkingInputs(packedState, originalPair, context);
  assert.deepEqual(await fs.readFile(forecastFile), originalForecast);
  assert.equal(await fs.readFile(baselinePath, 'utf8'), 'OLD authentication baseline');
  assert.equal(await fs.readFile(checkpointPath, 'utf8'), 'OLD working S required by Python retention');

  // The two mixed stores require authentic OLD identity, not just parseable
  // files. A representation-only change is accepted above; changed content or
  // a missing expected forecast is not an empty-cache permission.
  for (const kind of ['bulk-drift', 'forecast-drift', 'forecast-missing']) {
    await fs.writeFile(candidatePath, oldCandidate);
    for (const [id, relative] of Object.entries(cold.retiredFiles)) {
      if (currentOriginals[id] === null) await fs.rm(path.join(coldRoot, relative), { force: true });
      else await fs.writeFile(path.join(coldRoot, relative), currentOriginals[id]);
    }
    await resetMixed();
    if (kind === 'bulk-drift') {
      const drift = await readDmiBulkDocument(bulkFile);
      drift.zones.sample.hourly[Object.keys(hourly)[0]]['sea-mean-deviation'] = 99;
      await fs.writeFile(path.join(coldRoot, 'data/live/dmi-bulk-cache.json'), JSON.stringify(drift));
    } else if (kind === 'forecast-drift') {
      await fs.writeFile(path.join(coldRoot, forecastRelative), '{"zones":{}}');
    } else await fs.unlink(path.join(coldRoot, forecastRelative));
    const negativeWork = path.join(directory, 'mixed-' + kind); await fs.mkdir(negativeWork);
    await assert.rejects(cold.acquisitions(packedState, negativeWork), /FILE_IDENTITY/);
    assert.deepEqual(await fs.readFile(forecastFile), originalForecast);
    assert.deepEqual(await fs.readFile(bulkFile), before);
    assert.deepEqual(await fs.readFile(packed.sourcePath), oldPack);
  }

  // Normal local negatives: a missing, foreign, changed, linked or stale
  // installed working file is never an authenticated absence.
  for (const kind of ['missing', 'foreign', 'changed', 'symlink', 'stale-destination', 'rename-race']) {
    await fs.writeFile(candidatePath, oldCandidate);
    await fs.rm(activePath, { force: true });
    await fs.writeFile(activePath, oldActive);
    const negativeWork = path.join(directory, 'cold-active-' + kind); await fs.mkdir(negativeWork);
    let selectedState = packedState;
    if (kind === 'missing') await fs.unlink(activePath);
    if (kind === 'foreign') {
      selectedState = state; // Neither working file exists in the authentic pack.
      await fs.unlink(candidatePath); // Reach the active guard, not the old candidate guard.
    }
    if (kind === 'changed') await fs.writeFile(activePath, 'changed old active');
    if (kind === 'symlink') {
      await fs.unlink(activePath);
      await fs.symlink(payload, activePath, process.platform === 'win32' ? 'junction' : 'dir');
    }
    if (kind === 'stale-destination') await fs.writeFile(path.join(negativeWork, 'original-working-active.json'), 'foreign');
    const normalRename = fs.rename;
    if (kind === 'rename-race') {
      // Inject an actual file mutation at the final move boundary. The real
      // rename still runs; all normal hashes/inode/closure checks stay active.
      fs.rename = async (from, to) => {
        if (from === activePath) await fs.writeFile(activePath, 'raced working file');
        return normalRename(from, to);
      };
    }
    try { await assert.rejects(cold.acquisitions(selectedState, negativeWork), /FILE_IDENTITY|FILE_CHANGED|FILE_PATH|SYMLINK/); }
    finally { fs.rename = normalRename; }
    assert.deepEqual(await fs.readFile(packed.sourcePath), oldPack);
    assert.deepEqual(await fs.readFile(bulkFile), before);
    if (kind === 'rename-race') {
      assert.equal(await fs.readFile(path.join(negativeWork, 'original-working-active.json'), 'utf8'), 'raced working file',
        'Unexpected moved bytes stay private for diagnosis; no deletion or automatic retry.');
    }
  }

  // Actual caller wrappers: check fixed reopening/ordinary forwarding only.
  // This controlled return is NOT a genuine cold capability or GCM proof.
  const tupleBody = section('export const CURRENT_FAMILY_COLD_START_REENTRY_SCOPE =', 'function readOnlyExistingColdArchiveStorage(')
    .replace('export const CURRENT_FAMILY_COLD_START_REENTRY_SCOPE =', 'const CURRENT_FAMILY_COLD_START_REENTRY_SCOPE =');
  const wrapperBody = section('export async function prepareCurrentFamilyColdStart(', 'async function prepareCurrentFamilyColdStartOwned(')
    .replace('export async function prepareCurrentFamilyColdStart(', 'async function prepareCurrentFamilyColdStart(')
    .replace('export async function reopenCurrentFamilyColdStart(', 'async function reopenCurrentFamilyColdStart(');
  const calls = [], returned = Object.freeze({ capability: Object.freeze({}), contextPath:'controlled-only', contextSha256:'0'.repeat(64) });
  const wrappers = new Function('need','prepareCurrentFamilyColdStartOwned',tupleBody+wrapperBody
    +'\nreturn {prepareCurrentFamilyColdStart,reopenCurrentFamilyColdStart,scope:CURRENT_FAMILY_COLD_START_REENTRY_SCOPE};')(
    (ok,code)=>{if(!ok)throw new Error('CURRENT_FAMILY_COLD_START_'+code);},
    async options=>{calls.push(options);return returned;});
  assert(Object.isFrozen(wrappers.scope));
  assert.equal(wrappers.scope.progressSource,'39886354260-1');
  const options={workRoot:'controlled-work',publicRoot:'controlled-public',targetReferenceAt:wrappers.scope.targetReferenceAt};
  assert.equal(await wrappers.prepareCurrentFamilyColdStart(options),returned);
  assert.deepEqual(calls.pop(),options,'Normal prepare does not get the reopening option.');
  for(const mutation of [{archiveId:'0'.repeat(64)},{targetReferenceAt:'2026-10-23T02:00:00.000Z'},
    {archiveId:undefined},{targetReferenceAt:undefined}]){
    await assert.rejects(wrappers.reopenCurrentFamilyColdStart({...options,archiveId:wrappers.scope.archiveId,...mutation}),/ARCHIVED_SOURCE/);
    assert.equal(calls.length,0);
  }
  assert.equal(await wrappers.reopenCurrentFamilyColdStart({...options,archiveId:wrappers.scope.archiveId}),returned);
  assert.deepEqual(calls.pop(),{...options,expectedExistingArchiveId:wrappers.scope.archiveId});
  const ownedBody=section('async function prepareCurrentFamilyColdStartOwned(', 'export async function loadCurrentFamilyColdStartForTarget(');
  assert(ownedBody.indexOf('await saveWeatherStateEpochArchive(')<ownedBody.indexOf('await acquisitions(state, workRoot)'));
  assert(ownedBody.includes(': readOnlyExistingColdArchiveStorage(objects, expectedExistingArchiveId)'));
  assert(ownedBody.indexOf(': readOnlyExistingColdArchiveStorage(objects, expectedExistingArchiveId)')
    <ownedBody.indexOf('await createWeatherStateEpochCaptureStorage('));
  assert(ownedBody.includes('targetReferenceAt, verifyOriginalSnapshot });'));
  assert(!ownedBody.includes('verifyOriginalSnapshot, expectedExistingArchiveId'),
    'The common archive kernel keeps its exact installed model-bound API and bytes.');
  // The real WeakMap/scoped accessor refuses fabricated objects before looking
  // up paths or descriptors. A genuine reopened-capability/GCM roundtrip remains
  // the combined integration target, not a fabricated unit positive.
  const accessBody=section('function scoped(', 'export function currentFamilyColdStartScoreInputs(')
    .replace('export function currentFamilyColdStartProgressUnionScope(', 'function currentFamilyColdStartProgressUnionScope(');
  const union = new Function('equal','ROOT','PRIVATE_WEATHER_COMPONENT_PACK_FILE',
    section('const CAPABILITIES =','export const CURRENT_FAMILY_COLD_START_CONTEXT_ENV')
    +section('const sha =','function hour(')+accessBody+'\nreturn currentFamilyColdStartProgressUnionScope;')(
      isDeepStrictEqual,coldRoot,PRIVATE_WEATHER_COMPONENT_PACK_FILE);
  for(const value of [null,{},Object.freeze({status:'VERIFIED'})])
    assert.throws(()=>union(value,{registry:{},targetReferenceAt:wrappers.scope.targetReferenceAt}),/CAPABILITY/);

  // SOURCE native input-copy unit: use the actual private caller closures, as
  // above, without exporting a helper or starting the national native factory.
  {
    const fixtureText = await fs.readFile(path.join(productRoot, 'scripts/fixtures/source19-current-normal-inputs.mjs'), 'utf8');
    const fragment = (start, end) => {
      assert.equal(fixtureText.split(start).length, 2); assert.equal(fixtureText.split(end).length, 2);
      const at = fixtureText.indexOf(start), to = fixtureText.indexOf(end, at + start.length);
      assert(to > at); return fixtureText.slice(at, to);
    };
    const body = fragment('const sha =', 'const load =') + fragment('const inside =', 'function hour(')
      + fragment('async function noLinks(', 'function cloneSource(');
    const actual = io => new Function('assert', 'crypto', 'fs', 'path', 'isDeepStrictEqual', 'DMI_FORECAST_FILE_MAX_BYTES',
      '"use strict";\n' + body + '\nreturn {copyInputs, ADMIN, PROVIDERS};')(
        assert, crypto, io, path, isDeepStrictEqual, DMI_FORECAST_FILE_MAX_BYTES);
    const normal = actual(fs), forecast = 'data/live/dmi-forecast-cache.json';
    const leaves = [forecast, 'data/live/dmi-bulk-cache.json', 'data/zones.geojson'];
    let sequence = 0;
    const sample = async (name, raw = Buffer.from('{"normal":{"retained":true}}\n')) => {
      const root = path.join(directory, 'source19-copy-' + sequence++), input = path.join(root, 'input'), output = path.join(root, 'output');
      const source = path.join(input, name), target = path.join(output, name);
      await fs.mkdir(path.dirname(source), {recursive: true}); await fs.writeFile(source, raw);
      return {input, output, source, target, raw, row: {relativePath: name, bytes: raw.length, sha256: hash(raw)},
        allowed: normal.ADMIN.includes(name) ? normal.ADMIN : normal.PROVIDERS};
    };
    const copy = (value, caller = normal) => caller.copyInputs(value.input, value.output, [value.row], value.allowed);
    for (const name of leaves) {
      const value = await sample(name);
      assert.deepEqual([...await copy(value)], [name]);
      assert.deepEqual(await fs.readFile(value.target), value.raw);
    }

    // Rejection-only stat probes: no large/sparse file, fake successful read,
    // reduced bound, or capacity claim. At the selected exact bound, stop at
    // readFile BEFORE returning bytes; one byte above it must stop earlier.
    assert(DMI_FORECAST_FILE_MAX_BYTES > 256 * 1024 * 1024);
    for (const name of leaves) for (const side of ['source', 'target']) for (const delta of [0, 1]) {
      const value = await sample(name), focus = value[side], stop = new Error('size-probe-before-byte-return');
      const maximum = name === forecast ? DMI_FORECAST_FILE_MAX_BYTES : 256 * 1024 * 1024;
      let readReached = false;
      const probe = actual({...fs,
        lstat: async (file, options) => {
          const stat = await fs.lstat(file, options);
          return file === focus && options?.bigint
            ? Object.assign(Object.create(Object.getPrototypeOf(stat)), stat, {size: BigInt(maximum + delta)}) : stat;
        },
        readFile: async (file, ...args) => {
          if (file === focus) {readReached = true; throw stop;}
          return fs.readFile(file, ...args);
        },
      });
      await assert.rejects(copy(value, probe), delta === 0 ? error => error === stop : {code: 'ERR_ASSERTION'});
      assert.equal(readReached, delta === 0, name + ' ' + side + ' exact owner/default bound');
    }

    // Real small files still face whole-byte identity, full JSON and recursive
    // fixture-only refusal before any target exists.
    for (const kind of ['hash', 'bytes', 'json', 'fixtureOnly', 'syntheticDetails', 'syntheticPublicProjection']) {
      const raw = Buffer.from(kind === 'json' ? '{"incomplete":' : kind.startsWith('synthetic') || kind === 'fixtureOnly'
        ? JSON.stringify({nested: [{[kind]: false}]}) : '{"normal":true}');
      const value = await sample(forecast, raw);
      if (kind === 'hash') value.row.sha256 = '0'.repeat(64);
      if (kind === 'bytes') value.row.bytes++;
      await assert.rejects(copy(value), kind === 'json' ? SyntaxError : kind === 'hash' || kind === 'bytes'
        ? /Actual prepared provider\/admin input/ : /Not a normal full-runtime input/);
      await assert.rejects(fs.lstat(value.target), {code: 'ENOENT'});
    }
    const invalidPath = await sample(forecast);
    await assert.rejects(normal.copyInputs(invalidPath.input, invalidPath.output,
      [{...invalidPath.row, relativePath: '../escape.json'}], ['../escape.json']), {code: 'ERR_ASSERTION'});
    await assert.rejects(normal.copyInputs(invalidPath.input, invalidPath.output,
      [{...invalidPath.row, relativePath: forecast + '.foreign'}], normal.PROVIDERS), /Only exact normal input leaves/);
    for (const side of ['input', 'output']) {
      const value = await sample(forecast), link = value[side] + '-link';
      // Precreate the real parent instead of creating it through the link.
      // Resolve only the owned target, never the exposed link path.
      await fs.mkdir(path.dirname(value.target), {recursive: true});
      await fs.symlink(await fs.realpath(value[side]), link, process.platform === 'win32' ? 'junction' : 'dir');
      assert((await fs.lstat(link)).isSymbolicLink());
      assert((await fs.stat(path.join(link, path.dirname(forecast)))).isDirectory());
      value[side] = link;
      await assert.rejects(copy(value), /Private native path contains a link/);
    }

    // The actual before/after identity and single-link guards remain active;
    // inject only rejecting metadata changes around the real small read.
    for (const field of ['nlink', 'dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) {
      const value = await sample(forecast); let stats = 0;
      const changed = actual({...fs, lstat: async (file, options) => {
        const stat = await fs.lstat(file, options);
        if (file !== value.source || !options?.bigint) return stat;
        if (++stats !== (field === 'nlink' ? 1 : 2)) return stat;
        return Object.assign(Object.create(Object.getPrototypeOf(stat)), stat, {[field]: stat[field] + 1n});
      }});
      await assert.rejects(copy(value, changed), field === 'nlink' ? {code: 'ERR_ASSERTION'} : /Input changed while reading/);
      await assert.rejects(fs.lstat(value.target), {code: 'ENOENT'});
    }
  }

} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
console.log('OK: DMI bulk storage is lossless, bounded and immutable for Node readers.');
