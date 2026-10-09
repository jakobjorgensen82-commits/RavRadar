import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import crypto from 'node:crypto';
import { constants as bufferConstants } from 'node:buffer';
import { inspectDmiForecastFile, readDmiForecastFile, readDmiForecastRecord,
  writeDmiForecastFileAtomic, writeDmiForecastRecords, DMI_FORECAST_FILE_MAX_BYTES, hashDmiForecastDocument,
  isDmiForecastCheckpointStopUnproved,
} from './lib/dmi-forecast-file.mjs';
import { PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';
import { assertUsableDmiProgressRecovery } from './lib/verified-dmi-progress-inputs.mjs';
import { buildWaterSourceForecastIndex, packWaterSourceForecastContinuity,
  unpackWaterSourceForecastContinuity } from './lib/water-source-forecast-routing.mjs';
import { dmiWaterSourceFixture } from './test-helpers/dmi-water-source-fixture.mjs';

// Keep the normal caller regression in the existing single source-test group.
// node:test runs these same-process tests serially; no extra workflow leaf.
await import('./test-weather-update-entrypoint.mjs');

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

for (const fault of ['rename-noop', 'copy-instead-of-rename']) test(`normal DMI checkpoint refuses unproved publication: ${fault}`, async t => {
  const folder = await fixture(t), file = path.join(folder, 'forecast.json');
  const original = Buffer.from(JSON.stringify(document()));
  await fs.writeFile(file, original);
  const next = document(); next.runtime.nextZoneCursor = 1;
  const copy = fs.copyFile.bind(fs);
  let stage;
  t.mock.method(fs, 'rename', async (from, to) => {
    stage = from;
    if (fault === 'copy-instead-of-rename') await copy(from, to);
  });
  await assert.rejects(writeDmiForecastFileAtomic(file, next), /PUBLICATION_UNPROVED/);
  assert.ok((await fs.stat(stage)).isFile(), 'uncertain publication retains its actual stage');
  if (fault === 'rename-noop') assert.deepEqual(await fs.readFile(file), original);
  else assert.deepEqual(await readDmiForecastFile(file), next);
  let opens = 0;
  const open = fs.open.bind(fs);
  t.mock.method(fs, 'open', async (...args) => { opens++; return open(...args); });
  await assert.rejects(writeDmiForecastFileAtomic(file, next), error => {
    assert.equal(isDmiForecastCheckpointStopUnproved(error), true);
    assert.equal(isDmiForecastCheckpointStopUnproved(new Error(error.message)), false);
    return true;
  });
  assert.equal(opens, 0, 'no replacement checkpoint after ambiguous publication');
});

for (const fault of ['close-noop', 'sync-and-close-noop', 'short-write', 'safe-sync-failure',
  'rename-before-error', 'rename-then-error', 'cleanup-noop']) test(`normal DMI checkpoint retains uncertainty and permits proved safe reuse: ${fault}`, async t => {
  const folder = await fixture(t), file = path.join(folder, 'forecast.json');
  const original = Buffer.from(JSON.stringify(document()));
  await fs.writeFile(file, original);
  const next = document(); next.runtime.nextZoneCursor = 1;
  const open = fs.open.bind(fs), rename = fs.rename.bind(fs), unlink = fs.unlink.bind(fs);
  const sentinel = new Error('SYNTHETIC_DMI_CHECKPOINT_PRIMARY');
  let stage, ownHandle, closeOwn, closes = 0, renames = 0, unlinks = 0;
  const hooks = [];
  hooks.push(t.mock.method(fs, 'open', async (target, ...args) => {
    const handle = await open(target, ...args);
    if (String(target).startsWith(file + '.forecast-stage-') && args[0] === 'wx') {
      stage = target; ownHandle = handle; closeOwn = handle.close.bind(handle);
      if (fault.includes('close-noop')) t.mock.method(handle, 'close', async () => { closes++; });
      if (fault === 'short-write') t.mock.method(handle, 'writeFile', async () => {});
      if (['sync-and-close-noop', 'safe-sync-failure', 'cleanup-noop'].includes(fault)) {
        t.mock.method(handle, 'sync', async () => { throw sentinel; });
      }
    }
    return handle;
  }));
  hooks.push(t.mock.method(fs, 'rename', async (...args) => {
    renames++;
    if (fault === 'rename-before-error') throw sentinel;
    const result = await rename(...args);
    if (fault === 'rename-then-error') throw sentinel;
    return result;
  }));
  hooks.push(t.mock.method(fs, 'unlink', async target => {
    unlinks++;
    if (fault !== 'cleanup-noop') return unlink(target);
  }));
  let first;
  await assert.rejects(writeDmiForecastFileAtomic(file, next), error => {
    first = error;
    if (['sync-and-close-noop', 'safe-sync-failure', 'cleanup-noop', 'rename-before-error', 'rename-then-error'].includes(fault)) assert.equal(error, sentinel);
    else assert.match(error.message, fault === 'short-write' ? /WRITE_INCOMPLETE/ : /WRITER_STOP_UNPROVED/);
    return true;
  });
  const safe = ['short-write', 'safe-sync-failure', 'rename-before-error', 'rename-then-error'].includes(fault);
  assert.equal(isDmiForecastCheckpointStopUnproved(first), !safe);
  if (fault === 'rename-then-error') assert.deepEqual(await readDmiForecastFile(file), next);
  else assert.deepEqual(await fs.readFile(file), original);
  assert.equal(renames, fault.startsWith('rename-') ? 1 : 0);
  if (fault.includes('close-noop')) {
    assert.equal(closes, 1); assert.equal(unlinks, 0);
    assert.ok((await ownHandle.stat()).isFile());
  } else await assert.rejects(ownHandle.stat(), { code: 'EBADF' });
  if (safe || fault === 'rename-then-error') await assert.rejects(fs.stat(stage), { code: 'ENOENT' });
  else assert.ok((await fs.stat(stage)).isFile());
  for (const hook of hooks) hook.mock.restore();
  if (safe) {
    await writeDmiForecastFileAtomic(file, next);
    assert.deepEqual(await readDmiForecastFile(file), next);
    assert.deepEqual(await fs.readdir(folder), ['forecast.json']);
  } else {
    await assert.rejects(writeDmiForecastFileAtomic(file, next), error => error === first);
    // Test-only closure after awaited normal refusal. Runtime cannot release,
    // relabel or clean this retained writer through an error-string match.
    if (fault.includes('close-noop')) await closeOwn();
  }
});

for (const fault of ['changed-valid-bytes', 'scan-close-noop', 'scan-read-and-close-noop',
  'scan-close-after-error']) test(`normal DMI checkpoint verifies its own bounded stage scan: ${fault}`, async t => {
  const folder = await fixture(t), file = path.join(folder, 'forecast.json');
  const original = Buffer.from(JSON.stringify(document()));
  await fs.writeFile(file, original);
  const next = document(); next.runtime.nextZoneCursor = 1;
  const open = fs.open.bind(fs), sentinel = new Error('SYNTHETIC_DMI_SCAN_PRIMARY');
  if (fault === 'changed-valid-bytes') next.zones.ZONE.padding = 'x'.repeat(512 * 1024);
  let stage, scanHandle, closeScan, scanCloses = 0, largestRead = 0, bytesRead = 0;
  const hook = t.mock.method(fs, 'open', async (target, ...args) => {
    const handle = await open(target, ...args);
    if (!String(target).startsWith(file + '.forecast-stage-')) return handle;
    stage = target;
    if (args[0] === 'wx' && fault === 'changed-valid-bytes') {
      const sync = handle.sync.bind(handle);
      t.mock.method(handle, 'sync', async () => {
        await sync();
        const before = await fs.readFile(target, 'utf8');
        const changed = before.replace('"nextZoneCursor":1', '"nextZoneCursor":2');
        assert.notEqual(changed, before);
        assert.equal(Buffer.byteLength(changed), Buffer.byteLength(before));
        await fs.writeFile(target, changed);
      });
    }
    if (args[0] === 'r' && !scanHandle) {
      scanHandle = handle; closeScan = handle.close.bind(handle);
      const read = handle.read.bind(handle);
      let parsing = false;
      t.mock.method(handle, 'read', async (buffer, offset, length, position) => {
        largestRead = Math.max(largestRead, buffer.length);
        if (fault === 'scan-read-and-close-noop') throw sentinel;
        if (position === 0 && bytesRead > 0) parsing = true;
        const result = await read(buffer, offset, length, position);
        if (!parsing) bytesRead += result.bytesRead;
        return result;
      });
      t.mock.method(handle, 'close', async () => {
        scanCloses++;
        if (fault.endsWith('noop')) return;
        await closeScan();
        if (fault === 'scan-close-after-error') throw sentinel;
      });
    }
    return handle;
  });
  let first;
  await assert.rejects(writeDmiForecastFileAtomic(file, next), error => {
    first = error;
    if (fault === 'scan-read-and-close-noop' || fault === 'scan-close-after-error') assert.equal(error, sentinel);
    else assert.match(error.message, fault === 'changed-valid-bytes' ? /WRITE_CONTENT_CHANGED/ : /WRITER_STOP_UNPROVED/);
    return true;
  });
  const uncertain = fault.endsWith('noop');
  assert.equal(isDmiForecastCheckpointStopUnproved(first), uncertain);
  assert.equal(scanCloses, 1);
  assert.equal(largestRead, 256 * 1024, 'the full-file scan has a fixed bounded buffer');
  if (fault !== 'scan-read-and-close-noop') {
    assert.equal(bytesRead, Buffer.byteLength(JSON.stringify(next) + '\n'));
  }
  assert.deepEqual(await fs.readFile(file), original);
  hook.mock.restore();
  if (uncertain) {
    assert.ok((await scanHandle.stat()).isFile());
    assert.ok((await fs.stat(stage)).isFile());
    await assert.rejects(writeDmiForecastFileAtomic(file, next), error => error === first);
    await closeScan(); // Test-only disposal, never runtime adoption/release.
  } else {
    await assert.rejects(scanHandle.stat(), { code: 'EBADF' });
    assert.deepEqual(await fs.readdir(folder), ['forecast.json']);
    await writeDmiForecastFileAtomic(file, next);
    assert.deepEqual(await readDmiForecastFile(file), next);
  }
});

for (const fault of ['parser-close-noop', 'parser-read-and-close-noop',
  'parser-close-after-error', 'parser-read-and-close-after-error']) test(`normal DMI checkpoint owns the parser handle through publication: ${fault}`, async t => {
  let closeParser;
  t.after(async () => { if (closeParser) await closeParser().catch(() => {}); });
  const folder = await fixture(t), file = path.join(folder, 'forecast.json');
  const original = Buffer.from(JSON.stringify(document()));
  await fs.writeFile(file, original);
  const next = document(); next.runtime.nextZoneCursor = 1;
  const open = fs.open.bind(fs), primary = new Error('SYNTHETIC_DMI_PARSER_READ');
  const secondary = new Error('SYNTHETIC_DMI_PARSER_CLOSE'), modes = [];
  let stage, parserHandle, parserReads = 0, parserCloses = 0;
  const hook = t.mock.method(fs, 'open', async (target, ...args) => {
    const handle = await open(target, ...args);
    if (!String(target).startsWith(file + '.forecast-stage-')) return handle;
    stage = target; modes.push(args[0]);
    if (args[0] !== 'r') return handle;
    const read = handle.read.bind(handle), close = handle.close.bind(handle);
    let parsing = false;
    t.mock.method(handle, 'read', async (buffer, offset, length, position) => {
      // The actual Cursor requests its fixed 256 KiB buffer at position zero.
      // The preceding hashscan requests only the bytes of this small fixture.
      if (position === 0 && length === 256 * 1024) {
        parsing = true; parserReads++; parserHandle = handle; closeParser = close;
        if (fault.includes('read-and-close')) throw primary;
      }
      return read(buffer, offset, length, position);
    });
    t.mock.method(handle, 'close', async () => {
      if (!parsing) return close();
      parserCloses++;
      if (fault.endsWith('noop')) return;
      await close();
      throw secondary;
    });
    return handle;
  });
  let first;
  await assert.rejects(writeDmiForecastFileAtomic(file, next), error => {
    first = error;
    if (fault.includes('read-and-close')) assert.equal(error, primary);
    else if (fault.endsWith('after-error')) assert.equal(error, secondary);
    else assert.match(error.message, /WRITER_STOP_UNPROVED/);
    return true;
  }).finally(() => t.diagnostic(`actual stage opens: ${modes.join(',')}; parser reads: ${parserReads}`));
  const uncertain = fault.endsWith('noop');
  assert.equal(isDmiForecastCheckpointStopUnproved(first), uncertain);
  assert.equal(parserReads, 1); assert.equal(parserCloses, 1);
  assert.deepEqual(modes, ['wx', 'r'], 'parser and full-byte scan share the tracked read handle');
  assert.deepEqual(await fs.readFile(file), original);
  hook.mock.restore();
  if (uncertain) {
    assert.ok((await parserHandle.stat()).isFile());
    assert.ok((await fs.stat(stage)).isFile());
    await assert.rejects(writeDmiForecastFileAtomic(file, next), error => error === first);
  } else {
    await assert.rejects(parserHandle.stat(), { code: 'EBADF' });
    assert.deepEqual(await fs.readdir(folder), ['forecast.json']);
    await writeDmiForecastFileAtomic(file, next);
    assert.deepEqual(await readDmiForecastFile(file), next);
  }
});

test('recordwise forecast copy preserves SOURCE bank independently of zones and PART continuity', async t => {
  const folder = await fixture(t), file = path.join(folder, 'source.json'), output = path.join(folder, 'copy.json');
  const referenceAt = '2026-09-30T00:00:00.000Z';
  const source = { sourceKey: 'tidewater:COPY', stationId: 'COPY', point: [11, 56], sourceType: 'forecast-point' };
  const native = { generatedAt: referenceAt, timeStrideHours: 3, zones: { 'SOURCE::tidewater:COPY': {
    hourly: Object.fromEntries(Array.from({ length: 41 }, (_, i) => {
      const time = new Date(Date.parse(referenceAt) + i * 3 * 3600000).toISOString();
      return [time, dmiWaterSourceFixture(source, time, i, referenceAt)];
    })),
  } } };
  const bank = buildWaterSourceForecastIndex([source], native, referenceAt);
  const original = { ...document(), waterSourceContinuity: await packWaterSourceForecastContinuity(bank, referenceAt) };
  await writeDmiForecastFileAtomic(file, original);
  const bytesBefore = await fs.readFile(file), index = await inspectDmiForecastFile(file);
  assert.equal(index.zones.size, 1);
  assert.equal(index.continuity.entries.length, 1);
  assert.equal(index.waterSourceContinuity.entries.length, 1);
  assert.equal(Object.hasOwn(index.metadata, 'waterSourceContinuity'), false,
    'SOURCE entries are not read as one unbounded metadata value.');
  async function* zones() {
    for (const [id, entry] of index.zones) yield [id, await readDmiForecastRecord(index, entry)];
  }
  await writeDmiForecastRecords(output, index, zones());
  const copied = await readDmiForecastFile(output);
  assert.deepEqual(copied, original);
  assert.deepEqual(await fs.readFile(file), bytesBefore);
  assert.deepEqual((await unpackWaterSourceForecastContinuity(copied.waterSourceContinuity, referenceAt))
    .get(source.sourceKey).hourly, bank.get(source.sourceKey).hourly);
  const overCount = { ...original, waterSourceContinuity: { ...original.waterSourceContinuity,
    entries: Array.from({ length: 513 }, (_, i) => ({ ...original.waterSourceContinuity.entries[0], sourceKey: `tidewater:${i}` })) } };
  await assert.rejects(writeDmiForecastFileAtomic(file, overCount), /DMI_FORECAST_FILE_STRUCTURE_LIMIT/);
  assert.deepEqual(await fs.readFile(file), bytesBefore, 'Over-bound writes never replace a valid original.');
});

test('actual forecast readers preserve primary failure when owned close also fails', async t => {
  for (const operation of ['inspect', 'record']) await t.test(operation, async child => {
    const folder = await fixture(child), file = path.join(folder, 'forecast.json');
    await fs.writeFile(file, JSON.stringify(document()));
    const index = await inspectDmiForecastFile(file);
    const descriptor = { ...index.zones.get('ZONE'), sha256: '0'.repeat(64) };
    if (operation === 'inspect') await fs.writeFile(file, '{"zones":invalid}');
    const open = fs.open.bind(fs), secondary = new Error('SYNTHETIC_CLOSE_FAILURE');
    let closed = 0;
    child.mock.method(fs, 'open', async (...args) => {
      const handle = await open(...args), close = handle.close.bind(handle);
      child.mock.method(handle, 'close', async () => {
        await close(); closed++; throw secondary;
      });
      return handle;
    });
    await assert.rejects(operation === 'inspect' ? inspectDmiForecastFile(file)
      : readDmiForecastRecord(index, descriptor), error => {
      assert.notEqual(error, secondary);
      assert.equal(error.message, operation === 'inspect'
        ? 'DMI_FORECAST_FILE_INVALID_JSON' : 'DMI_FORECAST_FILE_CHANGED');
      return true;
    });
    assert.equal(closed, 1);
  });
});

test('actual forecast readers keep close-only failure hard', async t => {
  for (const operation of ['inspect', 'record']) await t.test(operation, async child => {
    const folder = await fixture(child), file = path.join(folder, 'forecast.json');
    await fs.writeFile(file, JSON.stringify(document()));
    const index = await inspectDmiForecastFile(file), descriptor = index.zones.get('ZONE');
    const open = fs.open.bind(fs), secondary = new Error('SYNTHETIC_CLOSE_ONLY');
    let closed = 0;
    child.mock.method(fs, 'open', async (...args) => {
      const handle = await open(...args), close = handle.close.bind(handle);
      child.mock.method(handle, 'close', async () => {
        await close(); closed++; throw secondary;
      });
      return handle;
    });
    await assert.rejects(operation === 'inspect' ? inspectDmiForecastFile(file)
      : readDmiForecastRecord(index, descriptor), error => error === secondary);
    assert.equal(closed, 1);
  });
});

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

test('exact recovery accepts verified no-change but rejects missing or rejected recovery summaries', () => {
  const summary = status => ({ forecast: { status, recoveredComponents: 0, rejectedRecords: 0, runtimeRecovered: false } });
  for (const status of ['MERGED', 'ACCEPTED_NO_CHANGE', 'NOT_PRESENT']) assert.equal(assertUsableDmiProgressRecovery(summary(status)), true);
  for (const value of [null, {}, summary('REJECTED'), summary('RETAINED')]) {
    assert.throws(() => assertUsableDmiProgressRecovery(value), /DMI_FORECAST_PROGRESS_RECOVERY_REQUIRED/);
  }
  assert.throws(() => assertUsableDmiProgressRecovery(summary('NOT_PRESENT'), { allowAbsent: false }), /REQUIRED/);
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
