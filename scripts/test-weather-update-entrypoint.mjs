import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { writeDmiForecastFileAtomic, isDmiForecastCheckpointStopUnproved } from './lib/dmi-forecast-file.mjs';

const producerPath = new URL('./update-weather.mjs', import.meta.url);
const sourceText = async file => (await fs.readFile(file, 'utf8')).replace(/\r\n/g, '\n');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

function inverseOceanObsSettlement(source) {
  const invert = (after, before) => {
    assert.equal(source.split(after).length, 2, 'exact OceanObs delta must occur once');
    source = source.replace(after, before);
  };
  invert("import { assertWeatherTransportSettlement, isWeatherTransportStopUnproved, throwWeatherTransportStopUnproved } from './lib/weather-transport-settlement.mjs';",
    "import { assertWeatherTransportSettlement, throwWeatherTransportStopUnproved } from './lib/weather-transport-settlement.mjs';");
  invert('    const inputs = [dmiWaterStations(), dmiLatestSeaLevels(), waterStationRouting(), cachedStationLevels(new Date().toISOString())];\n'
    + '    let values;\n'
    + '    try { values = await Promise.all(inputs); }\n'
    + '    catch (firstError) {\n'
    + '      const settled = await Promise.allSettled(inputs);\n'
    + "      if (settled.some(result => result.status === 'rejected' && isWeatherTransportStopUnproved(result.reason))) {\n"
    + '        throwWeatherTransportStopUnproved(inputs, firstError);\n'
    + '      }\n'
    + '      throw firstError;\n'
    + '    }\n'
    + '    const [rawStations, freshLevels, routing, cachedLevels] = values;\n',
  '    const [rawStations, freshLevels, routing, cachedLevels] = await Promise.all([dmiWaterStations(), dmiLatestSeaLevels(), waterStationRouting(), cachedStationLevels(new Date().toISOString())]);\n');
  const observedCatch = '    return interpolateWaterLevelAlongCoast(point, coastPath, stations, levels, { haversineKm, requireBracket: true });\n  } catch (error) {\n';
  invert(observedCatch + '    if (isWeatherTransportStopUnproved(error)) throw error;\n    assertWeatherTransportSettlement();\n', observedCatch);
  const observation = '    const observation = await observedDmiWaterLevel(feature, coastCorridors);\n';
  invert(observation + '    assertWeatherTransportSettlement();\n', observation);
  invert('  });\n  assertWeatherTransportSettlement();\n  dmiPersistentRuntime.lastObservationAt = generatedAt;\n',
    '  });\n  dmiPersistentRuntime.lastObservationAt = generatedAt;\n');
  invert('const rawStationRegistry = await dmiWaterStations().catch(error => {\n'
    + '  if (isWeatherTransportStopUnproved(error)) throw error;\n  assertWeatherTransportSettlement();\n'
    + '  return readCachedWaterStations();\n});\n',
  'const rawStationRegistry = await dmiWaterStations().catch(() => readCachedWaterStations());\n');
  invert('const qualityLevels = dmiObservationSkipReason ? await cachedStationLevels(generatedAt) : await dmiLatestSeaLevels().catch(error => {\n'
    + '  if (isWeatherTransportStopUnproved(error)) throw error;\n  assertWeatherTransportSettlement();\n'
    + '  return new Map();\n});\n',
  'const qualityLevels = dmiObservationSkipReason ? await cachedStationLevels(generatedAt) : await dmiLatestSeaLevels().catch(() => new Map());\n');
  return source;
}

function inverseLegacyTransportSettlement(source) {
  source = inverseOceanObsSettlement(source);
  const transportImport = "import { assertWeatherTransportSettlement, throwWeatherTransportStopUnproved } from './lib/weather-transport-settlement.mjs';\n";
  assert.equal(source.split(transportImport).length, 2);
  source = source.replace(transportImport, '');
  const guards = /^[ \t]*assertWeatherTransportSettlement\(\);\n/gm;
  assert.equal([...source.matchAll(guards)].length, 12);
  source = source.replace(guards, '');
  const invert = (after, before) => {
    assert.equal(source.split(after).length, 2, 'exact transport delta must occur once');
    source = source.replace(after, before);
  };
  invert('    let response = null, bodySettled = false, cancellation = null;\n', '');
  invert('      response = await fetch(url, {\n', '      const response = await fetch(url, {\n');
  invert('      const text = await response.text();\n'
    + '      bodySettled = true; // Fulfilled body consumption, before JSON parsing.\n'
    + '      const data = JSON.parse(text);\n', '      const data = await response.json();\n');
  invert('      const firstFailure = { error }; // Never use error truthiness for ownership.\n'
    + '      if (response && !bodySettled) {\n'
    + '        try {\n'
    + '          cancellation = response.body?.cancel();\n'
    + '          await cancellation;\n'
    + '          bodySettled = true;\n'
    + '        } catch {\n'
    + '          controller.abort();\n'
    + '          throwWeatherTransportStopUnproved({ response, controller, cancellation }, firstFailure.error);\n'
    + '        }\n'
    + '      }\n', '');
  invert('    } finally {\n      controller.abort();\n      clearTimeout(timeout);\n',
    '    } finally {\n      clearTimeout(timeout);\n');
  invert('      if (dmi && (!response || bodySettled)) releaseDmiRequestSlot();\n',
    '      if (dmi) releaseDmiRequestSlot();\n');
  return source;
}

// Main 42eb83053cbcc878e51faac73e803846ee54234b has a top-level updater,
// not the isolated 519 restored SOURCE/session API. This checks the actual
// DMI queue body only; it is not SOURCE, original-B/S, history or whole-job proof.
test('main updater is byte-identical outside the checkpoint import and normal queue refusal', async () => {
  const source = inverseLegacyTransportSettlement(await sourceText(producerPath));
  const currentImport = "import { readDmiForecastFile, writeDmiForecastFileAtomic, isDmiForecastCheckpointStopUnproved } from './lib/dmi-forecast-file.mjs';";
  const baselineImport = "import { readDmiForecastFile, writeDmiForecastFileAtomic } from './lib/dmi-forecast-file.mjs';";
  const refusal = "    // A live/uncertain checkpoint is not a provider miss. Preserve the actual\n    // writer refusal before any later zone, component, history or public write.\n    if (isDmiForecastCheckpointStopUnproved(error)) throw error;\n";
  assert.equal(source.split(currentImport).length, 2);
  assert.equal(source.split(refusal).length, 2);
  assert.equal(digest(source.replace(currentImport, baselineImport).replace(refusal, '')),
    'd6f2a49d1099eb2f3d024f54375af8e989d6636e7a0a0b47f0d9b75965fd0bff');
});

test('main parser policy, public readers, serializer and record writer are preserved by mechanical extraction', async () => {
  const source = await sourceText(new URL('./lib/dmi-forecast-file.mjs', import.meta.url));
  const branding = "// Actual in-process checkpoint state, not a cross-process owner or a receipt\n// that authorizes a replacement worker. Preserve an uncertain handle/stage.\nconst checkpointWriters = new Map(), checkpointStopErrors = new WeakSet();\nexport function isDmiForecastCheckpointStopUnproved(error) {\n  return checkpointStopErrors.has(error);\n}\n\n";
  assert.equal(source.split(branding).length, 2);
  let baseline = source.replace(branding, '');
  const header = 'async function inspectDmiForecastHandle(file, handle, stat, maximumRecordBytes) {\n';
  const coreStart = baseline.indexOf(header);
  const publicStart = baseline.indexOf('export async function inspectDmiForecastFile', coreStart);
  const publicEnd = baseline.indexOf('export async function readDmiForecastRecord', publicStart);
  assert.ok(coreStart > 0 && publicStart > coreStart && publicEnd > publicStart);
  const core = baseline.slice(coreStart + header.length, publicStart);
  assert.ok(core.endsWith('}\n\n'));
  const body = core.slice(0, -3);
  const checksAt = body.indexOf('  if (!equalStat(stat, await handle.stat()))');
  assert.ok(checksAt > 0);
  const call = '  let failed = false;\n  try {\n    return await inspectDmiForecastHandle(file, handle, stat, maximumRecordBytes);\n';
  const wrapper = baseline.slice(publicStart, publicEnd);
  assert.equal(wrapper.split(call).length, 2);
  // Inverse only the owned-handle extraction and its two-space indentation.
  // The resulting entire non-writer module must equal main42eb byte for byte.
  const original = wrapper.replace(call, body.slice(0, checksAt) + '  let failed = false;\n  try {\n'
    + body.slice(checksAt).replace(/^(?=.)/gm, '  '));
  baseline = baseline.slice(0, coreStart) + original + baseline.slice(publicEnd);
  const start = baseline.indexOf('export async function writeDmiForecastFileAtomic');
  const end = baseline.indexOf('// A record-at-a-time', start);
  assert.ok(start > 0 && end > start);
  assert.equal(digest(baseline.slice(0, start) + baseline.slice(end)),
    'ecf1e9813312af7244be828aa667b5753f543e8d052f8fda49dc4c562255826c');
});

test('existing 47-command source plan reaches the normal checkpoint integration exactly once', async () => {
  const scripts = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8')).scripts;
  const { expandSourceCommands } = await import('./validate-source-once.mjs');
  const commands = expandSourceCommands(scripts, 'validate:source:checks');
  assert.equal(commands.length, 47);
  const invoked = commands.flatMap(command => command.split(' '));
  assert.equal(invoked.filter(file => file === 'scripts/test-dmi-forecast-file.mjs').length, 1);
  assert.equal(invoked.filter(file => file === 'scripts/test-weather-update-entrypoint.mjs').length, 0);
  const grouped = await sourceText(new URL('./test-dmi-forecast-file.mjs', import.meta.url));
  assert.equal(grouped.split("await import('./test-weather-update-entrypoint.mjs');").length, 2);
});

test('actual DMI queue propagates an uncertain real checkpoint but preserves proved safe failure handling', async t => {
  const source = await sourceText(producerPath);
  const start = source.indexOf('for (const feature of targetFeatures) {');
  const end = source.indexOf('// DMI oceanObs hentes', start);
  assert.ok(start > 0 && end > start);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  for (const fault of ['rename-noop', 'copy-instead-of-rename', 'write-close-noop',
    'scan-close-noop', 'scan-read-and-close-noop', 'safe-sync-failure',
    'changed-valid-bytes', 'scan-close-after-error', 'rename-before-error',
    'rename-then-error', 'parser-close-noop', 'parser-read-and-close-noop',
    'parser-close-after-error', 'parser-read-and-close-after-error']) await t.test(fault, async st => {
    const uncertain = ['rename-noop', 'copy-instead-of-rename', 'write-close-noop',
      'scan-close-noop', 'scan-read-and-close-noop', 'parser-close-noop', 'parser-read-and-close-noop'].includes(fault);
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-weather-checkpoint-queue-'));
    let closeRetained;
    st.after(async () => {
      if (closeRetained) await closeRetained();
      assert.equal(path.dirname(folder), path.resolve(os.tmpdir()));
      assert.ok(path.basename(folder).startsWith('rr-weather-checkpoint-queue-'));
      await fs.rm(folder, { recursive: true, force: true });
    });
    const file = path.join(folder, 'forecast.json');
    const document = { schemaVersion: 2, zones: {}, runtime: { nextZoneCursor: 0 } };
    const original = Buffer.from(JSON.stringify(document));
    await fs.writeFile(file, original);
    document.runtime.nextZoneCursor = 1;
    const sentinel = new Error('SYNTHETIC_DMI_CHECKPOINT_FAILURE');
    const open = fs.open.bind(fs), rename = fs.rename.bind(fs), copy = fs.copyFile.bind(fs);
    st.mock.method(fs, 'rename', async (from, to) => {
      if (fault === 'rename-noop') return;
      if (fault === 'copy-instead-of-rename') return copy(from, to);
      if (fault === 'rename-before-error') throw sentinel;
      await rename(from, to);
      if (fault === 'rename-then-error') throw sentinel;
    });
    let firstScan = true;
    st.mock.method(fs, 'open', async (target, ...args) => {
      const handle = await open(target, ...args);
      if (!String(target).startsWith(file + '.forecast-stage-')) return handle;
      if (args[0] === 'r' && fault.startsWith('parser-')) {
        const read = handle.read.bind(handle), close = handle.close.bind(handle);
        let parsing = false;
        st.mock.method(handle, 'read', async (buffer, offset, length, position) => {
          if (position === 0 && length === 256 * 1024) {
            parsing = true;
            if (fault.endsWith('noop')) closeRetained = close;
            if (fault.includes('read-and-close')) throw sentinel;
          }
          return read(buffer, offset, length, position);
        });
        st.mock.method(handle, 'close', async () => {
          if (!parsing) return close();
          if (fault.endsWith('noop')) return;
          await close();
          throw fault.includes('read-and-close') ? new Error('SYNTHETIC_SECONDARY_PARSER_CLOSE') : sentinel;
        });
      }
      if (args[0] === 'wx') {
        if (fault === 'safe-sync-failure') st.mock.method(handle, 'sync', async () => { throw sentinel; });
        if (fault === 'write-close-noop') {
          closeRetained = handle.close.bind(handle);
          st.mock.method(handle, 'close', async () => {});
        }
        if (fault === 'changed-valid-bytes') {
          const sync = handle.sync.bind(handle);
          st.mock.method(handle, 'sync', async () => {
            await sync();
            const before = await fs.readFile(target, 'utf8');
            const changed = before.replace('"nextZoneCursor":1', '"nextZoneCursor":2');
            assert.notEqual(changed, before);
            assert.equal(Buffer.byteLength(changed), Buffer.byteLength(before));
            await fs.writeFile(target, changed);
          });
        }
      } else if (args[0] === 'r' && firstScan) {
        firstScan = false;
        if (fault === 'scan-close-noop' || fault === 'scan-read-and-close-noop') {
          closeRetained = handle.close.bind(handle);
          st.mock.method(handle, 'close', async () => {});
          if (fault === 'scan-read-and-close-noop') st.mock.method(handle, 'read', async () => { throw sentinel; });
        } else if (fault === 'scan-close-after-error') {
          const close = handle.close.bind(handle);
          st.mock.method(handle, 'close', async () => { await close(); throw sentinel; });
        }
      }
      return handle;
    });
    const feature = { properties: { id: 'SYNTHETIC-ZONE' } }, next = { zones: {} };
    const output = { zones: { 'SYNTHETIC-ZONE': { attempts: [] } } };
    let checkpointCalls = 0, warnings = 0;
    const scope = {
      targetFeatures: [feature], stableFeatures: [feature], adaptiveLiveBudget: 1,
      liveDmiAssigned: 0, dmiRequestBudgetUsed: 0, DMI_REQUEST_BUDGET: 1,
      dmiRateLimitTriggered: false, dmiRateLimitedUntil: 0,
      dmiAcquisitionStats: { assignedZoneIds: [], attemptedZoneIds: [], cursorAdvancedForZoneIds: [], successfulZoneIds: [] },
      dmiPersistentRuntime: {}, nextDmiForecastStore: next, output, previous: {},
      generatedAt: '2026-09-30T00:00:00.000Z', acquisitionPhase: 'synthetic', edrSuccessStreak: 0,
      recordHasAtmosphere: () => false, recordHasMarine: () => true, historyFor: () => ({}),
      fromDmi: async () => ({ dmiForecast: { hourly: [] }, current: {} }),
      mergeDmiWithFallback: value => value,
      writeDmiForecastStoreCheckpoint: async () => { checkpointCalls++; return writeDmiForecastFileAtomic(file, document); },
      isDmiForecastCheckpointStopUnproved, console: { log() {}, warn() { warnings++; } },
    };
    // Execute the actual existing queue body with the real checkpoint writer.
    // No provider or score is run, and this is not a full updater success test.
    const run = new AsyncFunction(...Object.keys(scope), `${source.slice(start, end)}; return 'QUEUE_SETTLED';`);
    const operation = run(...Object.values(scope));
    if (uncertain) await assert.rejects(operation, error => {
      assert.equal(isDmiForecastCheckpointStopUnproved(error), true);
      if (fault === 'scan-read-and-close-noop' || fault === 'parser-read-and-close-noop') assert.equal(error, sentinel);
      return true;
    });
    else assert.equal(await operation, 'QUEUE_SETTLED');
    assert.equal(checkpointCalls, 1); assert.equal(warnings, uncertain ? 0 : 1);
    assert.equal(output.zones['SYNTHETIC-ZONE'].attempts.length, uncertain ? 0 : 1);
    if (!uncertain) assert.equal(output.zones['SYNTHETIC-ZONE'].attempts[0].message,
      fault === 'changed-valid-bytes' ? 'DMI_FORECAST_FILE_WRITE_CONTENT_CHANGED' : sentinel.message);
    if (fault === 'copy-instead-of-rename' || fault === 'rename-then-error') {
      assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), document);
    } else assert.deepEqual(await fs.readFile(file), original);
  });
});

test('actual normal checkpoint chain retains its first failure and permits only proved safe fresh reuse', async t => {
  const source = await sourceText(producerPath);
  const header = 'let dmiStoreWriteChain = Promise.resolve();';
  const start = source.indexOf(header);
  const end = source.indexOf('\nconst output = {', start);
  assert.equal(source.split(header).length, 2);
  assert.ok(start > 0 && end > start);
  // Use the exact normal closure, including its rejected Promise chain. A
  // direct writer retry is not evidence that this old caller can recover.
  const createCheckpoint = new Function('writeDmiForecastFileAtomic',
    'DMI_FORECAST_STORE_PATH', 'nextDmiForecastStore',
    `${source.slice(start, end)}\nreturn writeDmiForecastStoreCheckpoint;`);
  t.mock.method(globalThis, 'fetch', async () => { assert.fail('NETWORK_FORBIDDEN'); });
  for (const fault of ['proved-closed-sync-failure', 'unproved-sync-and-close']) await t.test(fault, async st => {
    const uncertain = fault === 'unproved-sync-and-close';
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-weather-checkpoint-chain-'));
    let closeRetained;
    st.after(async () => {
      if (closeRetained) await closeRetained();
      assert.equal(path.dirname(folder), path.resolve(os.tmpdir()));
      assert.ok(path.basename(folder).startsWith('rr-weather-checkpoint-chain-'));
      await fs.rm(folder, { recursive: true, force: true });
    });
    const file = path.join(folder, 'forecast.json');
    const document = { schemaVersion: 2, zones: {}, runtime: { nextZoneCursor: 0 } };
    const original = Buffer.from(JSON.stringify(document));
    await fs.writeFile(file, original);
    document.runtime.nextZoneCursor = 1;
    const first = new Error('SYNTHETIC_CHECKPOINT_CHAIN_FIRST_FAILURE');
    const open = fs.open.bind(fs);
    let firstHandle, firstStage, stageOpens = 0, writerCalls = 0;
    st.mock.method(fs, 'open', async (target, ...args) => {
      const handle = await open(target, ...args);
      if (!String(target).startsWith(file + '.forecast-stage-')) return handle;
      stageOpens++;
      if (args[0] === 'wx' && !firstHandle) {
        firstHandle = handle; firstStage = target;
        st.mock.method(handle, 'sync', async () => { throw first; });
        if (uncertain) {
          closeRetained = handle.close.bind(handle);
          st.mock.method(handle, 'close', async () => {});
        }
      }
      return handle;
    });
    const countedWriter = (...args) => { writerCalls++; return writeDmiForecastFileAtomic(...args); };
    const checkpoint = createCheckpoint(countedWriter, file, document);
    await assert.rejects(checkpoint(), error => error === first);
    const opensAfterFirst = stageOpens;
    await assert.rejects(checkpoint(), error => error === first);
    assert.equal(writerCalls, 1, 'the rejected normal chain must not start its writer again');
    assert.equal(stageOpens, opensAfterFirst);
    assert.equal(opensAfterFirst, 1);
    assert.deepEqual(await fs.readFile(file), original);
    assert.equal(isDmiForecastCheckpointStopUnproved(first), uncertain);
    assert.equal(isDmiForecastCheckpointStopUnproved(new Error(first.message)), false);
    assert.equal(isDmiForecastCheckpointStopUnproved(first.message), false);
    assert.equal(isDmiForecastCheckpointStopUnproved({ message: first.message, code: 'DMI_FORECAST_FILE_WRITER_STOP_UNPROVED' }), false);

    const freshCheckpoint = createCheckpoint(countedWriter, file, document);
    if (uncertain) {
      assert.ok((await firstHandle.stat()).isFile());
      assert.ok((await fs.stat(firstStage)).isFile());
      await assert.rejects(writeDmiForecastFileAtomic(file, document), error => error === first);
      await assert.rejects(freshCheckpoint(), error => error === first);
      assert.equal(writerCalls, 2, 'fresh caller reaches the real writer refusal, not a replacement');
      assert.equal(stageOpens, opensAfterFirst, 'private refusal remains locked without a new file handle');
      assert.deepEqual(await fs.readFile(file), original);
      assert.ok((await firstHandle.stat()).isFile());
      assert.ok((await fs.stat(firstStage)).isFile());
    } else {
      await assert.rejects(firstHandle.stat(), { code: 'EBADF' });
      await assert.rejects(fs.stat(firstStage), { code: 'ENOENT' });
      await writeDmiForecastFileAtomic(file, document);
      assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), document);
      document.runtime.nextZoneCursor = 2;
      await freshCheckpoint();
      assert.equal(writerCalls, 2);
      assert.equal(stageOpens, opensAfterFirst + 4, 'both safe retries own one write and one shared scan/parser handle');
      assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), document);
      assert.deepEqual(await fs.readdir(folder), ['forecast.json']);
    }
  });
});
