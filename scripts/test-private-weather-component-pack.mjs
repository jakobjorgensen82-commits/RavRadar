import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { buildPrivateWeatherComponentPack, unpackPrivateWeatherComponentPack } from './lib/private-weather-component-pack.mjs';
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
  for (const file of new Set(Object.values(PRIVATE_RUNTIME_CONTRACT_FILES).flat())) await write(source, file, 'synthetic contract bytes\n');
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
  const staticPointer = originals.find(file => file.relativePath.includes('/static/'));
  await fs.unlink(path.join(source, staticPointer.relativePath));
  await assert.rejects(buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions: cpConditions, pythonExecutable }),
    /CP_ORIGINALS_INVALID/);
});
