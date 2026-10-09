import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  DMI_BULK_STORAGE_SCHEMA,
  decodeDmiBulkWrapper,
  readDmiBulkDocument,
  writeDmiBulkDocument,
} from './lib/dmi-bulk-storage.mjs';

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

  // Own synthetic sources: this proves storage, not native qualification.
  const registration = {
    contractId: 'dmi-native-grid-sampling-v1', elementIndex: 7,
    gridIndexIdentitySha256: 'a'.repeat(64),
    coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
    gridDefinitionSha256: 'b'.repeat(64), gridPoint: [2, 1],
    fieldSet: ['current-u', 'current-v'], optionalFieldSet: [],
  };
  const sampling = { schemaVersion: 2, zones: { 'PART::TEST': { hourly: {} } } };
  for (let index = 0; index < 41; index += 1) {
    const time = new Date(Date.UTC(2026, 9, 9, index)).toISOString().replace('.000Z', 'Z');
    sampling.zones['PART::TEST'].hourly[time] = { time, sources: { current: {
      collection: 'dkss_nsbs', modelRun: '2026-10-09T00:00:00Z',
      nativeValidTime: time, gridPoint: [2, 1], leadTimeHours: index,
      nativeGridSampling: structuredClone(registration),
    } } };
  }
  const samplingBefore = structuredClone(sampling);
  const samplingFile = path.join(directory, 'sampling.json');
  await writeDmiBulkDocument(samplingFile, sampling);
  assert.deepEqual(sampling, samplingBefore);
  const samplingStored = JSON.parse(await fs.readFile(samplingFile, 'utf8'));
  assert.equal(samplingStored.storageSchema, DMI_BULK_STORAGE_SCHEMA);
  assert.equal(samplingStored.sourceTables.spatial.length, 1);
  assert.deepEqual(samplingStored.sourceTables.spatial[0].nativeGridSampling, registration);
  assert.equal(samplingStored.sourceTables.semantics.length, 41);
  assert.ok(samplingStored.sourceTables.semantics.every(row => !Object.hasOwn(row, 'nativeGridSampling')));
  assert.equal(samplingStored.sourceTables.asset.length, 41);
  const samplingDecoded = await readDmiBulkDocument(samplingFile);
  assert.deepEqual(samplingDecoded, samplingBefore);
  const samplingHours = Object.values(samplingDecoded.zones['PART::TEST'].hourly);
  assert.throws(() => { samplingHours[0].sources.current.nativeGridSampling.fieldSet[0] = 'changed'; });
  const mutableHour = structuredClone(samplingHours[0]);
  mutableHour.sources.current.nativeGridSampling.fieldSet[0] = 'changed';
  assert.deepEqual(samplingHours[1].sources.current.nativeGridSampling.fieldSet, ['current-u', 'current-v']);

  // Existing v1 wrappers treated the formerly unknown key as semantics.
  const legacySampling = structuredClone(samplingStored);
  for (const spatial of legacySampling.sourceTables.spatial) delete spatial.nativeGridSampling;
  for (const semantics of legacySampling.sourceTables.semantics) semantics.nativeGridSampling = structuredClone(registration);
  assert.deepEqual(decodeDmiBulkWrapper(structuredClone(legacySampling)), samplingBefore);
  const duplicateSampling = structuredClone(legacySampling);
  duplicateSampling.sourceTables.spatial[0].nativeGridSampling = structuredClone(registration);
  const duplicateBefore = structuredClone(duplicateSampling);
  assert.throws(() => decodeDmiBulkWrapper(duplicateSampling));
  assert.deepEqual(duplicateSampling, duplicateBefore);

  // The two normal codecs must actually read each other's output, not merely
  // agree with independent fixture assertions. Only own bounded temp files.
  const pythonFile = path.join(directory, 'python-sampling.json');
  const pythonCode = [
    'import json, pathlib, sys',
    'sys.path.insert(0, str(pathlib.Path(sys.argv[1]) / "scripts"))',
    'from lib.dmi_bulk_storage import read_dmi_bulk_document, write_dmi_bulk_document',
    'logical = json.load(sys.stdin)',
    'write_dmi_bulk_document(sys.argv[2], logical)',
    'print(json.dumps(read_dmi_bulk_document(sys.argv[3]), allow_nan=False))',
  ].join('\n');
  const crossed = spawnSync(process.env.PYTHON || 'python', [
    '-B', '-c', pythonCode, fileURLToPath(new URL('../', import.meta.url)), pythonFile, samplingFile,
  ], {
    input: JSON.stringify(samplingBefore), encoding: 'utf8', shell: false,
    windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024,
  });
  assert.equal(crossed.error, undefined, 'Bounded Python storage codec could not execute');
  assert.equal(crossed.signal, null, 'Bounded Python storage codec was interrupted');
  assert.equal(crossed.status, 0, crossed.stderr);
  assert.deepEqual(JSON.parse(crossed.stdout), samplingBefore, 'Python must read normal Node output losslessly');
  assert.deepEqual(await readDmiBulkDocument(pythonFile), samplingBefore, 'Node must read normal Python output losslessly');
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
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
console.log('OK: DMI bulk storage is lossless, bounded and immutable for Node readers.');
