import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './lib/private-weather-component-pack.mjs';
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
    'decodeDmiBulkWrapper', 'ownFileDescriptorIdentity', 'ownedFileDescriptorClosed', 'ROOT',
    '"use strict";\n' + section('const CAPABILITIES =', 'export const CURRENT_FAMILY_COLD_START_CONTEXT_ENV')
      + section('const SCALARS =', 'async function sourceTuple()')
      + section('function scalarBulk(', 'function mint(')
      + '\nreturn { acquisitions, verifyScalarAcquisition };')(
    fs, path, crypto, isDeepStrictEqual, readDmiBulkDocument, writeDmiBulkDocument,
    decodeDmiBulkWrapper, ownFileDescriptorIdentity, ownedFileDescriptorClosed, coldRoot);
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
  const state = { payload, verified: { files: [{ relativePath: 'data/live/dmi-bulk-cache.json',
    bytes: before.length, sha256: hash(before) }] } };
  const acquired = await cold.acquisitions(state, workRoot);
  assert.equal(acquired.predecessor, null);
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
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
console.log('OK: DMI bulk storage is lossless, bounded and immutable for Node readers.');
