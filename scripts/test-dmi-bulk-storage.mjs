import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
console.log('OK: DMI bulk storage is lossless, bounded and immutable for Node readers.');
