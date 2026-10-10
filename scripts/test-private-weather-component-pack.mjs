import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import childProcess, { execFile } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';
import { promisify } from 'node:util';
import { buildPrivateWeatherComponentPack, unpackPrivateWeatherComponentPack } from './lib/private-weather-component-pack.mjs';
import { mergeVerifiedProtectedProgressComponents } from './lib/verified-protected-progress-components.mjs';
import { PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE,
  PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE,
  assertPrivateRuntimeInventory } from './lib/private-weather-component-inventory.mjs';
import { installRestoredPrivateRuntime, buildPrivateRuntimeCreateSpec, PRIVATE_RUNTIME_CONTRACT_FILES } from './private-production-runtime-workflow.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { mergeOpenMeteoPartBank, buildOpenMeteoPartRequest, readOpenMeteoPartResponse } from './lib/open-meteo-part-bank.mjs';

const digest = text => crypto.createHash('sha256').update(text).digest('hex');
const execFileAsync = promisify(execFile);
const reference = '2026-09-19T00:00:00.000Z';
const part = { partId: 'TEST', zoneId: 'ZONE', waterPoint: [10, 56] };
const spatialPolicies = Object.fromEntries(['wind', 'wave', 'waterLevel', 'waterTemperature']
  .map(component => [component, { policyId: 'synthetic-exact-cell-only', maximumDistanceKm: 0 }]));
const responseText = JSON.stringify({ longitude: 10, latitude: 56, utc_offset_seconds: 0,
  hourly: { time: [reference], wind_speed_10m: [4], wind_direction_10m: [90] },
  hourly_units: { wind_speed_10m: 'm/s', wind_direction_10m: '°' } });
const admission = readOpenMeteoPartResponse({ request: buildOpenMeteoPartRequest(part, {
  component: 'wind', productionReferenceAt: reference }), responseText, acquiredAt: reference }, { part, spatialPolicies });
const bank = mergeOpenMeteoPartBank(null, [admission], { parts: [part], spatialPolicies,
  retentionStartAt: reference, retentionEndAt: reference });
const ledger = '{"synthetic":"selected donor remains unchanged"}\n';
const marker = { schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS', sourceSelectionApplied: true,
  openMeteoBankSha256: bank.bankSha256, copernicusBankSha256: null, selectedComponentsSha256: digest(ledger) };
const conditions = { weatherComponentInputs: marker };

async function write(root, relative, value) {
  const target = path.join(root, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value));
}
async function fixture(t) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-weather-pack-test-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(folder)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(folder).startsWith('rr-weather-pack-test-'));
    await fs.rm(folder, { recursive: true, force: true });
  });
  const source = path.join(folder, 'source');
  await fs.mkdir(source);
  return { folder, source, output: path.join(folder, 'unpacked') };
}
async function seed(root) {
  await write(root, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank, bank);
  await write(root, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents, ledger);
  await write(root, PRIVATE_WEATHER_COMPONENT_FILES.fallbackCursor,
    { kind: 'WEATHER_COMPONENT_FALLBACK_CURSOR', schemaVersion: 1, openMeteoLastAttemptedPartId: 'TEST' });
}

test('fixed offline callers do not settle or clean inventory before the retained child closes', async t => {
  for (const caller of ['inventory', 'cp-union', 'current-union']) {
    for (const fault of ['timeout', 'kill-throws', 'process-error']) await t.test(`${caller}: ${fault}`, async t => {
      const f = await fixture(t);
      const bankPath = caller === 'current-union'
        ? PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentDonorBank
        : PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank;
      // Artificial dispatch fixture only. No child admits these placeholder
      // bank bytes, no provider/process is launched, and no result is installed.
      await write(f.source, bankPath, { bankSha256: 'synthetic-dispatch-only' });
      await write(f.source, 'data/live/coastal-parts-v2.json', {
        partCount: 1, zones: { ZONE: [{ partId: 'TEST', waterPoint: [10, 56] }] },
      });
      const child = new EventEmitter();
      child.pid = 12345; // Never passed to the OS; retained synthetic object only.
      const signals = [];
      child.kill = signal => {
        signals.push(signal);
        if (fault === 'kill-throws') throw new Error('synthetic kill failure');
        return true;
      };
      const setTimer = globalThis.setTimeout, remove = fs.rm;
      let expire, timer, launched = false, settled = false, observed, cleanupCalls = 0;
      let operation;
      const expectedMs = caller === 'inventory' ? 120_000 : 180_000;
      t.mock.method(globalThis, 'setTimeout', (callback, milliseconds, ...args) => {
        if (milliseconds === expectedMs) {
          expire = callback;
          timer = setTimer(() => {}, 2_000_000_000);
          return timer;
        }
        return setTimer(callback, milliseconds, ...args);
      });
      t.mock.method(childProcess, 'spawn', (_executable, args) => {
        assert.ok(args.includes(caller === 'inventory' ? '--storage-inventory'
          : caller === 'cp-union' ? '--merge-generations' : '--kind'));
        launched = true;
        return child;
      });
      t.mock.method(fs, 'rm', async (file, options) => {
        if (path.basename(String(file)).startsWith('rr-cp-storage-inventory-')) cleanupCalls++;
        return remove(file, options);
      });
      syncBuiltinESMExports();
      try {
        operation = caller === 'inventory'
          ? buildPrivateWeatherComponentPack({ repositoryRoot: f.source, conditions: {} })
          : mergeVerifiedProtectedProgressComponents({ root: f.source,
            progressFiles: [{ relativePath: bankPath, sourcePath: path.join(f.source, bankPath) }],
            completeFiles: [{ relativePath: bankPath, sourcePath: path.join(f.source, bankPath) }],
            progressVerifiedRoot: f.source, temporaryDirectory: f.folder, productionReferenceAt: reference });
        operation.then(value => { settled = true; observed = value; }, error => { settled = true; observed = error; });
        for (let i = 0; i < 500 && !launched && !settled; i++) {
          await new Promise(resolve => setTimer(resolve, 2));
        }
        assert.equal(launched, true, observed?.message);
        assert.equal(typeof expire, 'function');
        if (fault === 'process-error') child.emit('error', new Error('synthetic child error'));
        else assert.doesNotThrow(() => expire(), 'kill failure must not escape the timeout callback');
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(settled, false, 'failure must not release an outer finally before child close');
        assert.equal(cleanupCalls, 0, 'inventory still belongs to the unclosed child');
        assert.deepEqual(signals, ['SIGKILL']);
      } finally {
        // Test teardown proves the artificial child closed before allowing any
        // fixture cleanup, including on RED. There is no actual OS process.
        child.emit('close', 0, null);
        if (operation) await operation.catch(() => {});
        clearTimeout(timer);
        t.mock.restoreAll();
        syncBuiltinESMExports();
      }
      const prefix = caller === 'inventory' ? 'WEATHER_PACK_CP_INVENTORY'
        : caller === 'cp-union' ? 'PROTECTED_PROGRESS_CP_MERGE'
          : 'PROTECTED_PROGRESS_CURRENT_DONOR_MERGE';
      assert.equal(observed?.message, `${prefix}_${fault === 'process-error' ? 'UNAVAILABLE' : 'TIMEOUT'}`,
        'zero exit after cancellation/error must never become successful data');
      assert.equal(cleanupCalls, caller === 'inventory' ? 1 : 0);
    });
  }
});

test('inventory cancellation observes actual owned process close before temporary cleanup', async t => {
  const f = await fixture(t);
  await write(f.source, PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank,
    { bankSha256: 'synthetic-dispatch-only' });
  const spawn = childProcess.spawn, setTimer = globalThis.setTimeout, remove = fs.rm;
  let child, childClosed = false, cleanupCalls = 0;
  let closed;
  t.mock.method(childProcess, 'spawn', (_executable, args, options) => {
    assert.ok(args.includes('--storage-inventory'));
    // Actual disposable Node child, not the Python provider/model closure.
    // It has no I/O work and cannot write source, data or diagnostic payloads.
    child = spawn(process.execPath, ['--input-type=module', '--eval', 'setInterval(() => {}, 1000);'], options);
    closed = new Promise(resolve => child.once('close', () => { childClosed = true; resolve(); }));
    return child;
  });
  t.mock.method(globalThis, 'setTimeout', (callback, milliseconds, ...args) =>
    setTimer(callback, milliseconds === 120_000 ? 50 : milliseconds, ...args));
  t.mock.method(fs, 'rm', async (file, options) => {
    if (path.basename(String(file)).startsWith('rr-cp-storage-inventory-')) {
      cleanupCalls++;
      assert.equal(childClosed, true, 'actual child must close before the inventory directory is removed');
    }
    return remove(file, options);
  });
  syncBuiltinESMExports();
  try {
    await assert.rejects(buildPrivateWeatherComponentPack({ repositoryRoot: f.source, conditions: {} }),
      { message: 'WEATHER_PACK_CP_INVENTORY_TIMEOUT' });
    assert.equal(childClosed, true);
    assert.equal(cleanupCalls, 1);
  } finally {
    if (child && !childClosed) {
      child.kill('SIGKILL');
      await closed;
    }
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
});

test('fixed inventory accepts the two independent sealed extensions, never arbitrary files', () => {
  assert.equal(assertPrivateRuntimeInventory(PRIVATE_RUNTIME_BASE_FILES), false);
  assert.equal(assertPrivateRuntimeInventory([...PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE]), true);
  assert.equal(assertPrivateRuntimeInventory([...PRIVATE_RUNTIME_BASE_FILES,
    PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE]), false);
  assert.equal(assertPrivateRuntimeInventory([...PRIVATE_RUNTIME_BASE_FILES,
    PRIVATE_WEATHER_COMPONENT_PACK_FILE, PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE]), true);
  assert.throws(() => assertPrivateRuntimeInventory([...PRIVATE_RUNTIME_BASE_FILES, { id: 'credentials', relativePath: '.env' }]), /inventory is incompatible/);
  assert.throws(() => assertPrivateRuntimeInventory(PRIVATE_RUNTIME_BASE_FILES.slice(1)), /inventory is incompatible/);
});

test('actual create-spec retains legacy inventory and requires packed inputs for new marked model generation', async t => {
  const { source } = await fixture(t);
  const runtime = { datasetId: 'rr-synthetic-component-pack', productionReferenceAt: reference, generatedAt: reference,
    zones: Object.fromEntries(Array.from({ length: 210 }, (_, i) => [`ZONE-${i}`, {}])),
    coastalParts: { modelBinding: ravScoreModelBinding(),
      parts: Object.fromEntries(Array.from({ length: 673 }, (_, i) => [`PART-${i}`, {}])) } };
  for (const file of new Set(Object.values(PRIVATE_RUNTIME_CONTRACT_FILES).flat())) {
    await write(source, file, file === 'scripts/lib/private-weather-storage-abi.json'
      ? await fs.readFile(file) : 'synthetic contract bytes\n');
  }
  for (const file of PRIVATE_RUNTIME_BASE_FILES) await write(source, file.relativePath, file.id === 'full-conditions' ? runtime : {});
  assert.equal((await buildPrivateRuntimeCreateSpec({ repositoryRoot: source })).files.length, 9);
  await seed(source);
  await write(source, 'data/live/conditions.json', { ...runtime, ...conditions });
  const spec = await buildPrivateRuntimeCreateSpec({ repositoryRoot: source });
  assert.equal(spec.files.length, 10);
  assert.ok(spec.files.some(file => file.id === PRIVATE_WEATHER_COMPONENT_PACK_FILE.id));
  await fs.unlink(path.join(source, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents));
  await assert.rejects(buildPrivateRuntimeCreateSpec({ repositoryRoot: source }), /REQUIRED_INPUT/);
});

test('pack roundtrip keeps exact OM response, selection history and rotation, excludes unrelated cache files', async t => {
  const { source, output } = await fixture(t);
  await seed(source);
  await write(source, '.cache/secret-token.json', 'must not be copied');
  const descriptor = await buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions });
  assert.equal(descriptor.relativePath, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
  const restored = await unpackPrivateWeatherComponentPack({ restoredRoot: source, outputRoot: output, conditions });
  assert.equal(restored.length, 3);
  assert.equal(await fs.readFile(path.join(output, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents), 'utf8'), ledger);
  const actualBank = JSON.parse(await fs.readFile(path.join(output, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank), 'utf8'));
  assert.deepEqual(actualBank, bank);
  assert.equal(Object.values(actualBank.responses)[0].responseText, responseText);
  await assert.rejects(fs.access(path.join(output, '.cache/secret-token.json')), /ENOENT/);
});

test('used bank or selected-source ledger cannot be missing or silently changed', async t => {
  const { source } = await fixture(t);
  await assert.rejects(buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions }), /REQUIRED_INPUT/);
  await seed(source);
  await write(source, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents, 'changed ledger');
  await assert.rejects(buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions }), /REQUIRED_INPUT/);
  await write(source, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents, ledger);
  await write(source, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank, { ...bank, records: [] });
  await assert.rejects(buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions }), /OM_BANK_HASH/);
});

test('legacy without inputs needs no pack; unused progressive inputs still survive', async t => {
  const { source, output } = await fixture(t);
  assert.equal(await buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions: {} }), null);
  await seed(source);
  assert.ok(await buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions: {} }));
  const restored = await unpackPrivateWeatherComponentPack({ restoredRoot: source, outputRoot: output, conditions: {} });
  assert.equal(restored.length, 3);
});

test('new protected runtime carries non-base operational progress beyond Actions cache lifetime', async t => {
  const { source, output } = await fixture(t);
  await seed(source);
  const protectedExtensions = [
    'dmiActive', 'dmiCandidate', 'currentFieldShadow',
    'copernicusCurrentSourceStage', 'copernicusCurrentDonorBank', 'copernicusCurrentSegmentJournal',
    'openMeteoCurrentDonorBank',
    'coastalPointDmi', 'coastalPointState', 'coastalPointStatus',
    'coastalPointActivationState', 'coastalPointPendingPromotion',
  ];
  for (const key of protectedExtensions) {
    await write(source, PRIVATE_WEATHER_COMPONENT_FILES[key], { syntheticOperationalProgress: key });
  }
  // These two paths are already first-class protected-runtime base files and
  // must not be duplicated inside the extension pack.
  await write(source, PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentShadow, { base: 'copernicus' });
  await write(source, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoCurrentFallback, { base: 'open-meteo' });
  await buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions });
  const restored = await unpackPrivateWeatherComponentPack({ restoredRoot: source, outputRoot: output, conditions });
  const restoredPaths = new Set(restored.map(item => item.relativePath));
  for (const key of protectedExtensions) assert.ok(restoredPaths.has(PRIVATE_WEATHER_COMPONENT_FILES[key]), key);
  assert.ok(!restoredPaths.has(PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentShadow));
  assert.ok(!restoredPaths.has(PRIVATE_WEATHER_COMPONENT_FILES.openMeteoCurrentFallback));
});

test('pack rejects byte tampering and a marker from a different generation', async t => {
  const { source, output } = await fixture(t);
  await seed(source);
  const descriptor = await buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions });
  await assert.rejects(unpackPrivateWeatherComponentPack({ restoredRoot: source, outputRoot: output,
    conditions: { weatherComponentInputs: { ...marker, selectedComponentsSha256: 'a'.repeat(64) } } }), /MANIFEST_INVALID/);
  const bytes = await fs.readFile(descriptor.sourcePath);
  bytes[bytes.length - 1] ^= 1;
  await fs.writeFile(descriptor.sourcePath, bytes);
  await assert.rejects(unpackPrivateWeatherComponentPack({ restoredRoot: source, outputRoot: `${output}-tampered`, conditions }), /ENTRY_HASH/);
});

test('real restored-runtime installer handles nine-file legacy and transactional new input pack', async t => {
  const { folder, source } = await fixture(t);
  const repository = path.join(folder, 'repository');
  await fs.mkdir(repository);
  for (const descriptor of PRIVATE_RUNTIME_BASE_FILES) await write(source, descriptor.relativePath,
    descriptor.id === 'full-conditions' ? {} : { synthetic: descriptor.id });
  assert.equal((await installRestoredPrivateRuntime({ restoredRoot: source, repositoryRoot: repository })).fileCount, 9);
  await seed(source);
  await write(source, 'data/live/conditions.json', conditions);
  await buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions });
  // A restored bundle contains only the pack, not loose extension files.
  const basePaths = new Set(PRIVATE_RUNTIME_BASE_FILES.map(item => item.relativePath));
  for (const relative of Object.values(PRIVATE_WEATHER_COMPONENT_FILES).filter(item => !basePaths.has(item))) await fs.unlink(path.join(source, relative)).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
  const result = await installRestoredPrivateRuntime({ restoredRoot: source, repositoryRoot: repository });
  assert.equal(result.fileCount, 13);
  assert.equal(await fs.readFile(path.join(repository, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents), 'utf8'), ledger);
  const before = await fs.readFile(path.join(repository, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank));
  let calls = 0;
  await assert.rejects(installRestoredPrivateRuntime({ restoredRoot: source, repositoryRoot: repository,
    renameImpl: async (...args) => { if (++calls === 7) throw new Error('synthetic install failure'); return fs.rename(...args); },
  }), /synthetic install failure/);
  assert.deepEqual(await fs.readFile(path.join(repository, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank)), before);
});

test('component-stage cleanup preserves primary failures and stays hard after success', async t => {
  for (const failure of ['unpack', 'install', 'rollback', 'cleanup-only']) await t.test(failure, async t => {
    const { folder, source } = await fixture(t);
    const repository = path.join(folder, 'repository');
    await fs.mkdir(repository);
    for (const descriptor of PRIVATE_RUNTIME_BASE_FILES) await write(source, descriptor.relativePath,
      descriptor.id === 'full-conditions' ? conditions : { synthetic: descriptor.id });
    await seed(source);
    const packed = await buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions });
    const basePaths = new Set(PRIVATE_RUNTIME_BASE_FILES.map(item => item.relativePath));
    for (const relative of Object.values(PRIVATE_WEATHER_COMPONENT_FILES).filter(item => !basePaths.has(item))) {
      await fs.unlink(path.join(source, relative)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
    const original = Buffer.from('synthetic original kept for repair\n');
    const paths = [...basePaths, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath,
      PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents,
      PRIVATE_WEATHER_COMPONENT_FILES.fallbackCursor];
    for (const relative of paths) await write(repository, relative, original);
    if (failure === 'unpack') {
      const bytes = await fs.readFile(packed.sourcePath);
      bytes[0] ^= 1;
      await fs.writeFile(packed.sourcePath, bytes);
    }
    const sourceBytes = await fs.readFile(packed.sourcePath);
    const primary = new Error('synthetic primary install failure');
    const cleanup = new Error('synthetic component-stage cleanup failure');
    const remove = fs.rm;
    let cleanupCalls = 0, renames = 0, blockedDestination, preservedOriginal;
    const realSource = await fs.realpath(source);
    t.mock.method(fs, 'rm', async (file, options) => {
      if (String(file).startsWith(`${realSource}.weather-components-`)) {
        cleanupCalls++;
        throw cleanup;
      }
      return remove(file, options);
    });
    await assert.rejects(installRestoredPrivateRuntime({
      restoredRoot: source, repositoryRoot: repository,
      renameImpl: async (from, to) => {
        renames++;
        if (failure === 'install') throw primary;
        if (failure === 'rollback') {
          if (renames === 1) { blockedDestination = from; preservedOriginal = to; }
          if (renames === 4) throw primary;
        }
        return fs.rename(from, to);
      },
      removeImpl: async (file, options) => {
        if (file === blockedDestination) throw new Error('synthetic rollback failure');
        return remove(file, options);
      },
    }), error => {
      if (failure === 'unpack') assert.match(error.message, /WEATHER_PACK_FORMAT_INVALID/);
      else if (failure === 'install') assert.equal(error, primary);
      else if (failure === 'rollback') {
        assert.match(error.message, /rollback could not restore every file/);
        assert.equal(error.cause, primary);
      } else assert.equal(error, cleanup, 'cleanup failure alone must still reject the installation');
      return true;
    });
    assert.equal(cleanupCalls, 1, 'the owned component stage must actually attempt cleanup');
    assert.deepEqual(await fs.readFile(packed.sourcePath), sourceBytes, 'original pack is untouched');
    if (failure === 'rollback') assert.deepEqual(await fs.readFile(preservedOriginal), original);
    if (failure === 'unpack' || failure === 'install') {
      for (const relative of paths) assert.deepEqual(await fs.readFile(path.join(repository, relative)), original);
    }
    if (failure === 'cleanup-only') assert.equal(
      await fs.readFile(path.join(repository, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents), 'utf8'), ledger);
  });
});

test('unpack closes owned handles and preserves the first failure', async t => {
  for (const failure of ['mkdir', 'format', 'read', 'write', 'destination-close', 'source-close']) {
    await t.test(failure, async t => {
      const { source, output } = await fixture(t);
      await seed(source);
      const packed = await buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions });
      if (failure === 'mkdir') {
        await fs.mkdir(output);
        await write(output, 'sentinel', 'existing destination');
      }
      if (failure === 'format') {
        const bytes = await fs.readFile(packed.sourcePath);
        bytes[0] ^= 1;
        await fs.writeFile(packed.sourcePath, bytes);
      }
      const originalPack = await fs.readFile(packed.sourcePath);
      const packPath = (await fs.realpath(packed.sourcePath)).toLowerCase();
      const primary = new Error('synthetic pack I/O failure');
      const sourceClose = new Error('synthetic pack source close failure');
      const destinationClose = new Error('synthetic pack destination close failure');
      const open = fs.open;
      const handles = [];
      t.mock.method(fs, 'open', async (file, ...args) => {
        const handle = await open(file, ...args);
        const isSource = (await fs.realpath(file)).toLowerCase() === packPath;
        const close = handle.close.bind(handle);
        const tracked = { handle, close, calls: 0, isSource };
        handles.push(tracked);
        if (isSource && failure === 'read') t.mock.method(handle, 'read', async () => { throw primary; });
        if (!isSource && failure === 'write') t.mock.method(handle, 'writeFile', async () => { throw primary; });
        t.mock.method(handle, 'close', async () => {
          tracked.calls++;
          await close();
          if (isSource && failure !== 'mkdir') throw sourceClose;
          if (!isSource && ['write', 'destination-close'].includes(failure)) throw destinationClose;
        });
        return handle;
      });
      let observed;
      try {
        await unpackPrivateWeatherComponentPack({ restoredRoot: source, outputRoot: output, conditions });
      } catch (error) { observed = error; }
      const closureCounts = handles.map(item => item.calls);
      // Even the RED reproduction releases only its own leaked test handle.
      for (const item of handles) if (item.handle.fd !== -1) await item.close();
      assert.equal(handles.filter(item => item.isSource).length, 1);
      assert.ok(closureCounts.every(count => count === 1), 'every opened handle must close exactly once');
      if (failure === 'mkdir') {
        assert.equal(observed?.code, 'EEXIST');
        assert.equal(await fs.readFile(path.join(output, 'sentinel'), 'utf8'), 'existing destination');
      } else if (failure === 'format') assert.match(observed?.message ?? '', /WEATHER_PACK_FORMAT_INVALID/);
      else if (failure === 'read' || failure === 'write') assert.equal(observed, primary);
      else if (failure === 'destination-close') assert.equal(observed, destinationClose);
      else assert.equal(observed, sourceClose, 'close-only failure must still reject');
      assert.deepEqual(await fs.readFile(packed.sourcePath), originalPack);
    });
  }
});

test('conditions input marker cannot be restored with only nine legacy files', async t => {
  const { folder, source } = await fixture(t);
  const repository = path.join(folder, 'repository');
  await fs.mkdir(repository);
  for (const descriptor of PRIVATE_RUNTIME_BASE_FILES) await write(source, descriptor.relativePath,
    descriptor.id === 'full-conditions' ? conditions : {});
  await assert.rejects(installRestoredPrivateRuntime({ restoredRoot: source, repositoryRoot: repository }), /inputs pack is missing/);
  assert.deepEqual(await fs.readdir(repository), []);
});

test('real CP original static/dynamic NetCDF, receipts and cursor survive exact pack roundtrip', async t => {
  const { folder, source, output } = await fixture(t);
  const pythonExecutable = process.env.PYTHON ?? 'python';
  const cpFixture = path.join(folder, 'copernicus-fixture');
  await execFileAsync(pythonExecutable, ['scripts/test-copernicus-component-production.py', '--prepare-fixture', cpFixture],
    { windowsHide: true, timeout: 30_000, env: { ...process.env, PYTHONUTF8: '1' } });
  await seed(source);
  const cpBank = JSON.parse(await fs.readFile(path.join(cpFixture, 'bank.json'), 'utf8'));
  assert.ok(cpBank.records.length > 0);
  await write(source, PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank, await fs.readFile(path.join(cpFixture, 'bank.json')));
  await write(source, PRIVATE_WEATHER_COMPONENT_FILES.copernicusProgress, { kind: 'CP_COMPONENT_PROGRESS_CURSOR',
    schemaVersion: 1, bankSha256: cpBank.bankSha256, nextCursor: ['SYNTHETIC-PART', 'nws-wave'] });
  await fs.cp(path.join(cpFixture, 'cache'), path.join(source, '.cache/copernicus-components'), { recursive: true });
  const cpConditions = { weatherComponentInputs: { ...marker, copernicusBankSha256: cpBank.bankSha256 } };
  await buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions: cpConditions, pythonExecutable });
  const files = await unpackPrivateWeatherComponentPack({ restoredRoot: source, outputRoot: output,
    conditions: cpConditions, pythonExecutable });
  const originals = files.filter(file => file.relativePath.startsWith('.cache/copernicus-components/'));
  assert.equal(originals.filter(file => file.relativePath.endsWith('.nc')).length, 2);
  assert.equal(originals.filter(file => file.relativePath.includes('/receipts/')).length, 2);
  assert.equal(originals.filter(file => file.relativePath.includes('/static/')).length, 1);
  for (const file of files) assert.deepEqual(await fs.readFile(path.join(output, file.relativePath)),
    await fs.readFile(path.join(source, file.relativePath)));
  const originalPack = await fs.readFile(path.join(source, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath));
  for (const failure of ['inventory-read', 'cleanup-only']) await t.test(`CP inventory ${failure} with cleanup failure`, async t => {
    const open = fs.open, rm = fs.rm;
    const cleanupError = new Error('synthetic inventory cleanup error');
    const ownedInventory = value => path.dirname(path.resolve(String(value))) === path.resolve(os.tmpdir())
      && path.basename(String(value)).startsWith('rr-cp-storage-inventory-');
    const retained = [];
    t.mock.method(fs, 'open', async (file, ...args) => {
      const handle = await open(file, ...args);
      if (failure === 'inventory-read' && path.basename(String(file)) === 'inventory.json'
        && ownedInventory(path.dirname(String(file)))) {
        // The normal reader now owns a FileHandle through read and close.
        // Inject at that actual read boundary without replacing its cleanup.
        t.mock.method(handle, 'readFile', async () => {
          throw new Error('synthetic inventory read error');
        });
      }
      return handle;
    });
    t.mock.method(fs, 'rm', async (directory, ...args) => {
      if (ownedInventory(directory)) {
        retained.push(path.resolve(String(directory)));
        throw cleanupError;
      }
      return rm(directory, ...args);
    });
    let observed;
    try {
      await buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions: cpConditions, pythonExecutable });
    } catch (error) { observed = error; }
    finally {
      t.mock.restoreAll();
      for (const directory of retained) {
        assert.ok(ownedInventory(directory), 'only this test\'s captured inventory stage may be removed');
        await rm(directory, { recursive: true, force: true });
      }
    }
    assert.equal(retained.length, 1, 'cleanup is attempted on both paths');
    if (failure === 'inventory-read') assert.equal(observed?.message, 'WEATHER_PACK_JSON_INVALID');
    else assert.equal(observed, cleanupError, 'cleanup-only must still fail before replacing the pack');
    assert.deepEqual(await fs.readFile(path.join(source, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath)), originalPack);
    for (const file of originals) assert.deepEqual(await fs.readFile(path.join(output, file.relativePath)),
      await fs.readFile(path.join(source, file.relativePath)));
  });
  const staticPointer = originals.find(file => file.relativePath.includes('/static/'));
  await fs.unlink(path.join(source, staticPointer.relativePath));
  // The pointer is an optional acquisition hint. The exact immutable static
  // receipt/object referenced by the bank must still make the pack portable.
  await buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions: cpConditions, pythonExecutable });
  const originalStaticReceipt = originals.find(file => file.relativePath.includes('/receipts/')
    && path.basename(file.relativePath).startsWith(path.basename(staticPointer.relativePath, '.json')));
  await fs.unlink(path.join(source, originalStaticReceipt.relativePath));
  await assert.rejects(buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions: cpConditions, pythonExecutable }),
    /CP_ORIGINALS_INVALID/);
});
