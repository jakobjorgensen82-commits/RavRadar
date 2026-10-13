import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import crypto from 'node:crypto';
import { assertExactRuntimeInventory, copyPrivateRuntimeInventory } from './migrate-post-cutover-private-runtime.mjs';
import { assertRestoredOriginalInventory, assertMetadataOnlyMigrationResult,
  classifyVerifiedRuntimeMigration } from './migrate-post-cutover-private-runtime.mjs';
import { privateRuntimeBundleContentSha256 } from './private-production-runtime-bundle.mjs';
import { PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE } from './lib/private-weather-component-inventory.mjs';

const marker = { schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS', sourceSelectionApplied: true,
  openMeteoBankSha256: null, copernicusBankSha256: null, selectedComponentsSha256: 'a'.repeat(64) };
async function fixture(t, extended = false) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-private-migration-inventory-'));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('rr-private-migration-inventory-'));
    await fs.rm(root, { recursive: true, force: true });
  });
  const source = path.join(root, 'source');
  const output = path.join(root, 'output');
  const files = extended ? [...PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE] : PRIVATE_RUNTIME_BASE_FILES;
  for (const descriptor of files) {
    const file = path.join(source, descriptor.relativePath);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, descriptor.id === 'full-conditions'
      ? JSON.stringify(extended ? { weatherComponentInputs: marker } : { legacy: true })
      : descriptor.id === PRIVATE_WEATHER_COMPONENT_PACK_FILE.id
        ? Buffer.from([0, 1, 255, 13, 10, 128, 4]) : `original-${descriptor.id}\n`);
  }
  return { root, source, output, files };
}

for (const extended of [false, true]) {
  test(`migration preserves the exact ${extended ? 'ten-file component' : 'nine-file legacy'} generation byte for byte`, async t => {
    const { source, output, files } = await fixture(t, extended);
    const inventory = await assertExactRuntimeInventory(source);
    assert.deepEqual(inventory, files);
    await copyPrivateRuntimeInventory(source, output, inventory);
    assert.deepEqual(await assertExactRuntimeInventory(output), files);
    for (const file of files) assert.deepEqual(await fs.readFile(path.join(output, file.relativePath)),
      await fs.readFile(path.join(source, file.relativePath)));
    await assert.rejects(copyPrivateRuntimeInventory(source, output, inventory), /EEXIST/);
  });
}

test('migration rejects an omitted marked pack, an extra input file and an extra directory', async t => {
  const { source } = await fixture(t, true);
  await fs.unlink(path.join(source, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath));
  await assert.rejects(assertExactRuntimeInventory(source), /marker requires its preserved input pack/);
  await fs.writeFile(path.join(source, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath), 'unchanged-pack');
  const unknown = path.join(source, '.cache', 'unbound-input.json');
  await fs.writeFile(unknown, '{}');
  await assert.rejects(assertExactRuntimeInventory(source), /unapproved file/);
  await fs.unlink(unknown);
  await fs.mkdir(path.join(source, '.cache', 'unbound'));
  await assert.rejects(assertExactRuntimeInventory(source), /unapproved directory/);
});

test('migration cannot silently drop the new extension during copy', async t => {
  const { source, output } = await fixture(t, true);
  await assert.rejects(copyPrivateRuntimeInventory(source, output, PRIVATE_RUNTIME_BASE_FILES), /copy inventory/);
  await assert.rejects(fs.stat(output), /ENOENT/);
});

test('pre-write preservation rechecks actual original bytes, manifest and exact inventory', async t => {
  const { source, files } = await fixture(t, true);
  const manifest = { files: await Promise.all(files.map(async file => {
    const bytes = await fs.readFile(path.join(source, file.relativePath));
    return { ...file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  })) };
  manifest.bundleContentSha256 = privateRuntimeBundleContentSha256(manifest);
  assert.deepEqual(await assertRestoredOriginalInventory(source, manifest), files);
  const file = path.join(source, files[1].relativePath);
  const original = await fs.readFile(file);
  await fs.appendFile(file, 'changed');
  await assert.rejects(assertRestoredOriginalInventory(source, manifest), /original file bytes/);
  await fs.writeFile(file, original);
  const altered = structuredClone(manifest); altered.files[1].sha256 = 'f'.repeat(64);
  await assert.rejects(assertRestoredOriginalInventory(source, altered), /manifest content hash/);
  await fs.writeFile(path.join(source, 'extra.json'), '{}');
  await assert.rejects(assertRestoredOriginalInventory(source, manifest), /unapproved file/);
});

test('pre-write metadata-only requirement uses the actual normal difference and counts', () => {
  const source = { binding: { modelBundleSha256: 'a'.repeat(64) }, currentState: {
    historyBounds: { lastMile: { minimumFactorTrack: [0] } } } };
  const migrated = structuredClone(source); migrated.binding.modelBundleSha256 = 'b'.repeat(64);
  const result = () => ({ transitionKind: classifyVerifiedRuntimeMigration({ source, migrated,
    bindingMetadataPaths: ['binding.modelBundleSha256'],
    verifiedChangedPaths: ['binding.modelBundleSha256', ...(migrated.currentState.historyBounds.lastMile.minimumFactorTrack[0] === 0
      ? [] : ['currentState.historyBounds.lastMile.minimumFactorTrack.0'])] }),
    repairedContinuationCount: 0, recomputedModeCount: 0, recomputedZoneCount: 0 });
  assert.doesNotThrow(() => assertMetadataOnlyMigrationResult(result()));
  for (const key of ['repairedContinuationCount', 'recomputedModeCount', 'recomputedZoneCount']) {
    assert.throws(() => assertMetadataOnlyMigrationResult({ ...result(), [key]: 1 }), /actual metadata-only/);
  }
  assert.throws(() => assertMetadataOnlyMigrationResult({ transitionKind: 'MODEL_BINDING_METADATA_ONLY' }), /actual metadata-only/);
  assert.throws(() => assertMetadataOnlyMigrationResult({ ...result(), transitionKind: 'MODEL_BINDING_MIGRATION' }), /actual metadata-only/);
});

// The fixed admission used by the normal preserved-original gate is not a
// caller-supplied set of interchangeable bundle identities.
test('userdata prewrite: historical fixed current050000-to130000 admission remains exact', async () => {
  const { assertUserdataPrewriteBindings } = await import('./migrate-post-cutover-private-runtime.mjs');
  const { ravScoreModelBinding } = await import('../js/core/ravscore-model-contract.js');
  const { ravScoreModelBinding: candidateBinding } = await import('./rollback-assets/ravscore-model-contract.js');
  const { privateRuntimeContractHashes } = await import('./private-production-runtime-workflow.mjs');
  const currentHashes = await privateRuntimeContractHashes({ repositoryRoot: path.resolve('.') });
  const identity = { modelBinding: { modelBundleSha256: 'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb' },
    contractHashes: { continuationStateContractSha256: '4115f37178ff3d8eab540f3d9355a1275a13a9dd3a896e07f06673564e76ee51' } };
  const previousCandidate = { modelBundleSha256: '8d9142b5f7d9b5a3e5a0f3593e73df0c7ffaf3d80c036317967cb713f09197e3' };
  const actual = [identity, previousCandidate,
    { ...ravScoreModelBinding(), modelBundleSha256: '249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932' },
    { ...candidateBinding(), modelBundleSha256: '55fd7dfa5ee36596c729d93225a448ea5b8f1e7142c44b8b1bda5c3d4d84c957' },
    { ...currentHashes, continuationStateContractSha256: 'a5430dd21e3135d6efc09e22df3dd0cdcafee723f962ff1d3cb52e7765b2aaa0' }];
  assert.doesNotThrow(() => assertUserdataPrewriteBindings(...actual));
  const intermediary = structuredClone(actual);
  intermediary[0].modelBinding.modelBundleSha256 = '34a25729a3dbddc8c73870a69f7b3a6899c7f1df9829c8078782139ff4e0e839';
  intermediary[0].contractHashes.continuationStateContractSha256 = '6c09a8e7dcb5a7aadb439db79a6f5d555fb7dba77d444ad1fc7cc03b65c152ef';
  intermediary[1].modelBundleSha256 = 'd064d3501541cdaa09fe6bf0fb073feeecf59fdacfa623d4006c7442d69dad72';
  assert.throws(() => assertUserdataPrewriteBindings(...intermediary), /outside its exact successor/);
  for (const [index, nested, key] of [[0,'modelBinding','modelBundleSha256'],[0,'contractHashes','continuationStateContractSha256'],
    [1,null,'modelBundleSha256'],[2,null,'modelBundleSha256'],[3,null,'modelBundleSha256'],[4,null,'continuationStateContractSha256']]) {
    const changed = structuredClone(actual);
    (nested ? changed[index][nested] : changed[index])[key] = 'f'.repeat(64);
    assert.throws(() => assertUserdataPrewriteBindings(...changed), /outside its exact successor/);
  }
});
test('userdata prewrite: normal wrapper cannot bypass original inventory with merely correct hashes', async t => {
  const { verifyUserdataPrewritePreservation } = await import('./migrate-post-cutover-private-runtime.mjs');
  const { source, output } = await fixture(t);
  let pointerReads = 0;
  await assert.rejects(verifyUserdataPrewritePreservation({ sourceRoot: source, outputRoot: output,
    repositoryRoot: path.resolve('.'), predecessorDescriptorPath: path.join(source,'missing-authenticated-descriptor.json'),
    request: async () => { pointerReads++; throw new Error('unexpected pointer request'); } }));
  assert.equal(pointerReads, 0);
});

test('prewrite packed hourly: exact normal whole-document boundary preserves metadata-only and rejects value changes', async () => {
  const source = await fs.readFile(new URL('./migrate-post-cutover-private-runtime.mjs', import.meta.url), 'utf8');
  const { migrateExactModelBindingMetadata } = await import('./migrate-post-cutover-private-runtime.mjs');
  const { hydratePrivateConditionsHourly, packPrivateConditionsHourly } = await import('./lib/private-conditions-hourly.mjs');
  const { ravScoreModelBinding } = await import('../js/core/ravscore-model-contract.js');
  const { ravScoreModelBinding: candidateBinding } = await import('./rollback-assets/ravscore-model-contract.js');
  const exactSlice = (start, end) => {
    assert.equal(source.split(start).length, 2);
    const offset = source.indexOf(start);
    const finish = source.indexOf(end, offset);
    assert.ok(finish > offset);
    return source.slice(offset, finish);
  };
  // Run the actual normal verifier's contiguous comparison block, not a
  // parallel comparator. Authentication, full 673-state validation and
  // filesystem/manifest receipts remain separate existing gate coverage.
  const declarations = [
    exactSlice('function isPlainObject(value) {', '\nexport function sameStructuredValue'),
    exactSlice('function joinedPath(prefix, key) {', '\nfunction addExactChangedPaths'),
  ].join('\n');
  const body = exactSlice('  const original = ', '\n  await assertRestoredOriginalInventory(source, manifest);');
  const compare = new Function('readJson', 'path', 'hydratePrivateConditionsHourly',
    'migrateExactModelBindingMetadata', `${declarations}\nreturn async function(originalDocument, preparedDocument, identity, oldCandidate, currentIntegrated, currentCandidate) {
      const source = originalDocument, output = preparedDocument;
      const modules = { candidate: { ravScoreModelBinding: () => oldCandidate } };
      ${body}
    };`)(async value => JSON.parse(JSON.stringify(value)), { join: value => value },
      hydratePrivateConditionsHourly, migrateExactModelBindingMetadata);
  const currentIntegrated = ravScoreModelBinding(), currentCandidate = candidateBinding();
  const previousIntegrated = { ...currentIntegrated, modelBundleSha256: 'a'.repeat(64) };
  const previousCandidate = { ...currentCandidate, modelBundleSha256: 'b'.repeat(64) };
  const original = { datasetId: 'rr-packed-prewrite-fixture', productionReferenceAt: '2026-10-12T12:00:00.000Z',
    zones: {}, coastalParts: { modelBinding: previousIntegrated, parts: {}, zones: {} } };
  for (let index = 0; index < 210; index++) {
    const id = `zone-${index}`;
    original.zones[id] = { forecast: { hourly: [{ time: original.productionReferenceAt, temperatureC: 11 }] } };
    original.coastalParts.zones[id] = { hourly: [{ time: original.productionReferenceAt,
      beach: { modelBinding: previousIntegrated, score: 37 },
      candidate: { modelBinding: previousCandidate, score: 52 } }] };
  }
  const originalPacked = packPrivateConditionsHourly(original);
  const originalBytes = JSON.stringify(originalPacked);
  const prepared = hydratePrivateConditionsHourly(JSON.parse(originalBytes));
  migrateExactModelBindingMetadata(prepared, previousIntegrated, currentIntegrated);
  migrateExactModelBindingMetadata(prepared, previousCandidate, currentCandidate);
  const preparedPacked = packPrivateConditionsHourly(prepared);
  assert.notEqual(originalPacked.privateZoneHourly.zones['zone-209'].score.rawSha256,
    preparedPacked.privateZoneHourly.zones['zone-209'].score.rawSha256);
  const check = (first, second) => compare(first, second,
    { modelBinding: previousIntegrated }, previousCandidate, currentIntegrated, currentCandidate);
  await assert.doesNotReject(check(originalPacked, preparedPacked));
  await assert.doesNotReject(check(original, prepared), 'Unpacked authenticated predecessors remain compatible');
  for (const mutate of [
    value => { value.zones['zone-209'].forecast.hourly[0].temperatureC = 12; },
    value => { value.coastalParts.zones['zone-209'].hourly[0].beach.score = 38; },
    value => { value.coastalParts.zones['zone-209'].hourly[0].candidate.score = 53; },
  ]) {
    const changed = hydratePrivateConditionsHourly(JSON.parse(JSON.stringify(preparedPacked)));
    mutate(changed);
    await assert.rejects(check(originalPacked, packPrivateConditionsHourly(changed)),
      /changes more than exact binding metadata/);
  }
  const corrupt = JSON.parse(JSON.stringify(preparedPacked));
  corrupt.privateZoneHourly.zones['zone-209'].score.gzipSha256 = 'f'.repeat(64);
  await assert.rejects(check(originalPacked, corrupt), /PRIVATE_CONDITIONS_HOURLY_GZIP_HASH_MISMATCH/);
  assert.equal(JSON.stringify(originalPacked), originalBytes, 'Original packed source is never modified');
});

test('account assistant prewrite: genuine current source matches only its exact installed200000 successor', async () => {
  const { assertAccountAssistantPrewriteBindings } = await import('./migrate-post-cutover-private-runtime.mjs');
  const { ravScoreModelBinding } = await import('../js/core/ravscore-model-contract.js');
  const { ravScoreModelBinding: candidateBinding } = await import('./rollback-assets/ravscore-model-contract.js');
  const { privateRuntimeContractHashes } = await import('./private-production-runtime-workflow.mjs');
  const identity = { modelBinding: { modelBundleSha256: '249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932' },
    contractHashes: { continuationStateContractSha256: 'a5430dd21e3135d6efc09e22df3dd0cdcafee723f962ff1d3cb52e7765b2aaa0' } };
  const previousCandidate = { modelBundleSha256: '55fd7dfa5ee36596c729d93225a448ea5b8f1e7142c44b8b1bda5c3d4d84c957' };
  const actual = [identity, previousCandidate, ravScoreModelBinding(), candidateBinding(),
    await privateRuntimeContractHashes({ repositoryRoot: path.resolve('.') })];
  assert.doesNotThrow(() => assertAccountAssistantPrewriteBindings(...actual));
  for (const [index, nested, key] of [[0,'modelBinding','modelBundleSha256'],[0,'contractHashes','continuationStateContractSha256'],
    [1,null,'modelBundleSha256'],[2,null,'modelBundleSha256'],[3,null,'modelBundleSha256'],[4,null,'continuationStateContractSha256']]) {
    const changed = structuredClone(actual);
    (nested ? changed[index][nested] : changed[index])[key] = 'f'.repeat(64);
    assert.throws(() => assertAccountAssistantPrewriteBindings(...changed), /outside its exact successor/);
  }
  const older = structuredClone(actual);
  older[0].modelBinding.modelBundleSha256 = 'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb';
  assert.throws(() => assertAccountAssistantPrewriteBindings(...older), /outside its exact successor/);
});

test('account assistant prewrite: wrapper cannot replace authenticated originals with matching hashes', async t => {
  const { verifyAccountAssistantPrewritePreservation } = await import('./migrate-post-cutover-private-runtime.mjs');
  const { source, output } = await fixture(t);
  let pointerReads = 0;
  await assert.rejects(verifyAccountAssistantPrewritePreservation({ sourceRoot: source, outputRoot: output,
    repositoryRoot: path.resolve('.'), predecessorDescriptorPath: path.join(source,'missing-authenticated-descriptor.json'),
    request: async () => { pointerReads++; throw new Error('unexpected pointer request'); } }));
  assert.equal(pointerReads, 0);
});

test('prewrite CLI: all fixed intents are mutually exclusive before client construction', async () => {
  const { assertExclusivePrewriteIntent } = await import('./migrate-post-cutover-private-runtime.mjs');
  const flags = ['--verify-assistant-prewrite', '--verify-userdata-prewrite', '--verify-account-assistant-prewrite'];
  assert.doesNotThrow(() => assertExclusivePrewriteIntent([]));
  for (const first of flags) {
    assert.doesNotThrow(() => assertExclusivePrewriteIntent([first]));
    for (const second of flags) assert.throws(() => assertExclusivePrewriteIntent([first,second]), /ambiguous/);
    assert.throws(() => assertExclusivePrewriteIntent([first,'--owner-current-original']), /owner-current-original/);
  }
});
