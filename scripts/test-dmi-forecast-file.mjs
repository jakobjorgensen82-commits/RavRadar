import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import crypto from 'node:crypto';
import { constants as bufferConstants } from 'node:buffer';
import { inspectDmiForecastFile, readDmiForecastFile, readDmiForecastRecord,
  writeDmiForecastFileAtomic, writeDmiForecastRecords, DMI_FORECAST_FILE_MAX_BYTES, hashDmiForecastDocument,
} from './lib/dmi-forecast-file.mjs';
import { PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';

async function fixture(t) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-dmi-forecast-file-'));
  t.after(async () => {
    assert.equal(path.dirname(folder), path.resolve(os.tmpdir()));
    assert.ok(path.basename(folder).startsWith('rr-dmi-forecast-file-'));
    await fs.rm(folder, { recursive: true, force: true });
  });
  return folder;
}
const document = () => ({ schemaVersion: 2, runtime: { nextZoneCursor: 0 },
  zones: { ZONE: { zoneId: 'ZONE', point: [10, 56], hourly: [{ time: '2026-09-30T00:00:00.000Z',
    sources: { wave: { title: 'Quotes " and slash \\; æøå 😀' } } }] } },
  partContinuity: { schemaVersion: 1, entries: [{ partId: 'PART', gzipBase64: 'synthetic' }] } });

test('forecast reader accepts legacy formatting and atomic writer retains the same logical document', async t => {
  const folder = await fixture(t);
  const file = path.join(folder, 'forecast.json');
  const original = document();
  assert.equal(hashDmiForecastDocument(original), crypto.createHash('sha256').update(JSON.stringify(original)).digest('hex'));
  const altered = structuredClone(original);
  altered.zones.ZONE.hourly[0].sources.wave.title += 'changed';
  assert.notEqual(hashDmiForecastDocument(original), hashDmiForecastDocument(altered));
  await fs.writeFile(file, JSON.stringify(original, null, 2));
  assert.deepEqual(await readDmiForecastFile(file), original);
  const indexed = await inspectDmiForecastFile(file);
  assert.equal(indexed.hasPartContinuity, true);
  assert.equal(indexed.zones.size, 1);
  const out = path.join(folder, 'record-output.json');
  async function* rows() { yield ['ZONE', original.zones.ZONE]; }
  await writeDmiForecastRecords(out, indexed, rows());
  assert.deepEqual(await readDmiForecastFile(out), original);
  const written = await writeDmiForecastFileAtomic(file, original);
  assert.equal(written.maximumBytes, PROTECTED_PRIVATE_RUNTIME_POLICY.maximumFilePayloadBytes);
  assert.equal(DMI_FORECAST_FILE_MAX_BYTES, PROTECTED_PRIVATE_RUNTIME_POLICY.maximumFilePayloadBytes);
  assert.equal(await fs.readFile(file, 'utf8'), `${JSON.stringify(original)}\n`);
});

test('duplicate keys, malformed JSON, bad UTF-8 and invalid domains cannot become parsed donors', async t => {
  const folder = await fixture(t);
  const file = path.join(folder, 'invalid.json');
  const cases = [
    '{"zones":{},"zones":{}}',
    '{"zones":{"ZONE":{"hourly":[]},"ZON\\u0045":{"hourly":[]}}}',
    '{"zones":{"ZONE":{"hourly":[{"sources":{"wind":{"value":1,"val\\u0075e":2}}}]}}}',
    '{"zones":{},"partContinuity":{"entries":[],"entries":[]}}',
    '{"zones":{},"partContinuity":{"entries":[{"partId":"PART"},{"partId":"PART"}]}}',
    '{"zones":{"__proto__":{"hourly":[]}}}',
    '{"zones":{},}', '{"zones":{}', '{"zones":{}} true', '{"zones":[]}',
    '{"zones":{"ZONE":{"hourly":null}}}',
    '{"zones":{},"partContinuity":{"entries":[{"partId":"PART"},]}}',
    Buffer.concat([Buffer.from('{"zones":{},"bad":"'), Buffer.from([0xff]), Buffer.from('"}')]),
  ];
  for (const body of cases) {
    await fs.writeFile(file, body);
    await assert.rejects(inspectDmiForecastFile(file), /DMI_FORECAST_FILE_/);
  }
  const nested = { zones: {}, extra: JSON.parse('['.repeat(65) + '0' + ']'.repeat(65)) };
  await fs.writeFile(file, JSON.stringify(nested));
  await assert.rejects(inspectDmiForecastFile(file), /STRUCTURE_LIMIT/);
  await fs.writeFile(file, JSON.stringify(document()));
  await assert.rejects(inspectDmiForecastFile(file, { maximumBytes: 10 }), /INVALID_SIZE/);
  await assert.rejects(inspectDmiForecastFile(file, { maximumRecordBytes: 20 }), /RECORD_SIZE_LIMIT/);
  const indexed = await inspectDmiForecastFile(file);
  await assert.rejects(readDmiForecastRecord(indexed, { offset: 0, bytes: DMI_FORECAST_FILE_MAX_BYTES,
    sha256: 'a'.repeat(64) }), /RECORD_DESCRIPTOR_INVALID/);
  const oversized = await fs.open(file, 'w');
  await oversized.truncate(DMI_FORECAST_FILE_MAX_BYTES + 1);
  await oversized.close();
  await assert.rejects(inspectDmiForecastFile(file), /INVALID_SIZE/);
});

test('framing handles string escapes and multibyte characters spanning input chunks', async t => {
  const folder = await fixture(t);
  const file = path.join(folder, 'split.json');
  for (let offset = -8; offset < 9; offset += 1) {
    const original = document();
    original.zones.ZONE.hourly[0].description = 'x'.repeat(256 * 1024 + offset) + '\\"{}[],:æ😀';
    await fs.writeFile(file, JSON.stringify(original));
    assert.deepEqual(await readDmiForecastFile(file), original);
  }
});

test('changed indexed files, failed atomic writes and failed record generators retain existing files', async t => {
  const folder = await fixture(t);
  const file = path.join(folder, 'forecast.json');
  await fs.writeFile(file, JSON.stringify(document()));
  const before = await fs.readFile(file);
  await assert.rejects(writeDmiForecastFileAtomic(file, { zones: [] }), /DMI_FORECAST_FILE_/);
  assert.deepEqual(await fs.readFile(file), before);
  const indexed = await inspectDmiForecastFile(file);
  async function* failRows() { yield ['ZONE', document().zones.ZONE]; throw new Error('synthetic'); }
  const staged = path.join(folder, 'staged.json');
  await assert.rejects(writeDmiForecastRecords(staged, indexed, failRows()), /synthetic/);
  assert.equal(await fs.stat(staged).catch(() => null), null);
  async function* duplicateRows() { yield ['ZONE', document().zones.ZONE]; yield ['ZONE', document().zones.ZONE]; }
  await assert.rejects(writeDmiForecastRecords(staged, indexed, duplicateRows()), /DUPLICATE_KEY/);
  assert.equal(await fs.stat(staged).catch(() => null), null);
  await fs.appendFile(file, ' ');
  await assert.rejects(readDmiForecastRecord(indexed, indexed.zones.get('ZONE')), /CHANGED/);
  assert.deepEqual((await fs.readdir(folder)).sort(), ['forecast.json']);
});

test('recordwise producer writer preserves JSON order and all stage limits before replacing a baseline', async t => {
  const folder = await fixture(t);
  const file = path.join(folder, 'forecast.json');
  const original = document();
  const reordered = { partContinuity: { entries: original.partContinuity.entries, schemaVersion: 1 },
    zones: { 12: original.zones.ZONE, 3: original.zones.ZONE }, runtime: { nullable: null, omitted: undefined },
    schemaVersion: 2 };
  await writeDmiForecastFileAtomic(file, reordered);
  assert.equal(await fs.readFile(file, 'utf8'), `${JSON.stringify(reordered)}\n`);
  assert.equal(hashDmiForecastDocument(reordered), crypto.createHash('sha256').update(JSON.stringify(reordered)).digest('hex'));
  const before = await fs.readFile(file);
  const invalid = [
    { ...original, zones: Object.fromEntries(Array.from({ length: 211 }, (_, i) => [`ZONE${i}`, original.zones.ZONE])) },
    { ...original, partContinuity: { entries: Array.from({ length: 674 }, (_, i) => ({ partId: `PART${i}` })) } },
    { ...original, partContinuity: { entries: [{ partId: 'PART' }, { partId: 'PART' }] } },
    { ...original, metadata: 'x'.repeat(1024 * 1024) },
    { ...original, partContinuity: { entries: [{ partId: 'PART', gzipBase64: 'x'.repeat(4 * 1024 * 1024) }] } },
    { ...original, zones: { ZONE: { hourly: [], tooDeep: JSON.parse('['.repeat(65) + '0' + ']'.repeat(65)) } } },
    { ...original, zones: { ZONE: { hourly: [],
      tooManyKeys: Object.fromEntries(Array.from({ length: 250_001 }, (_, i) => [`key${i}`, 0])) } } },
  ];
  for (const candidate of invalid) {
    await assert.rejects(writeDmiForecastFileAtomic(file, candidate), /DMI_FORECAST_FILE_/);
    assert.deepEqual(await fs.readFile(file), before);
    assert.deepEqual(await fs.readdir(folder), ['forecast.json']);
  }
});

// Opt-in because this exercises actual >256 MiB and >V8-string byte volumes,
// not a mocked lowered limit. Each record stays small; no giant input string.
test('record reader and writer process an actual forecast larger than V8 maximum string length', {
  skip: process.env.RAVRADAR_TEST_LARGE_FORECAST !== '1',
}, async t => {
  const folder = await fixture(t);
  const file = path.join(folder, 'large.json');
  const record = JSON.stringify({ zoneId: 'SYNTHETIC', point: [10, 56], hourly: [],
    padding: 'x'.repeat(3 * 1024 * 1024) });
  const handle = await fs.open(file, 'wx');
  await handle.writeFile('{"schemaVersion":2,"zones":{');
  for (let i = 0; i < 180; i += 1) {
    await handle.writeFile(`${i ? ',' : ''}"ZONE${i}":${record}`);
  }
  await handle.writeFile('}}\n');
  await handle.close();
  const size = (await fs.stat(file)).size;
  assert.ok(size > 256 * 1024 * 1024 && size > bufferConstants.MAX_STRING_LENGTH);
  const started = Date.now();
  const indexed = await inspectDmiForecastFile(file);
  assert.equal(indexed.zones.size, 180);
  const out = path.join(folder, 'copy.json');
  async function* rows() {
    for (const [id, entry] of indexed.zones) yield [id, await readDmiForecastRecord(indexed, entry)];
  }
  await writeDmiForecastRecords(out, indexed, rows());
  assert.equal((await inspectDmiForecastFile(out)).zones.size, 180);
  const producer = path.join(folder, 'producer.json');
  const sourceRecord = JSON.parse(record);
  const producerDocument = { schemaVersion: 2,
    zones: Object.fromEntries(Array.from({ length: 180 }, (_, i) => [`ZONE${i}`, sourceRecord])) };
  const producerStarted = Date.now();
  await writeDmiForecastFileAtomic(producer, producerDocument);
  const producerElapsedMs = Date.now() - producerStarted;
  const producerIndex = await inspectDmiForecastFile(producer);
  assert.ok(producerIndex.bytes > bufferConstants.MAX_STRING_LENGTH);
  assert.equal(producerIndex.zones.size, 180);
  assert.deepEqual(await readDmiForecastRecord(producerIndex, producerIndex.zones.get('ZONE179')), sourceRecord);
  t.diagnostic(JSON.stringify({ kind: 'DMI_FORECAST_LARGE_SYNTHETIC_TEST', inputBytes: size,
    outputBytes: (await fs.stat(out)).size, elapsedMs: Date.now() - started,
    producerBytes: producerIndex.bytes, producerElapsedMs,
    maxRssKiB: process.resourceUsage().maxRSS,
    maximumFileBytes: DMI_FORECAST_FILE_MAX_BYTES,
    note: 'synthetic capacity proof, not production coverage' }));
});
