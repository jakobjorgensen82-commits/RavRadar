import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import test from 'node:test';
import { createWeatherStateEpochCaptureStorage, saveWeatherStateEpochArchive,
  assertVerifiedWeatherStateEpochArchive, saveUnpairedWeatherRestartArchive,
  rehydrateLocalUnpairedWeatherRestartArchive, materializeUnpairedWeatherRestartArchive,
  assertVerifiedUnpairedWeatherRestartArchive, WEATHER_STATE_EPOCH_PUBLIC_FILES }
  from './lib/weather-state-epoch-archive.mjs';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = value => Buffer.from(JSON.stringify(value) + '\n');
const TARGET = '2026-10-19T00:00:00.000Z';
const B_TIME = '2026-10-18T23:00:00.000Z';
const S_TIME = '2026-10-18T20:00:00.000Z';
const PUBLIC_TIME = '2026-10-16T10:00:00.000Z';
const KERNEL = fileURLToPath(new URL('./lib/weather-state-epoch-archive.mjs', import.meta.url));
const OLD_BYTES = 33438;
const OLD_SHA = '8a6e2847b16413b20e901fbeb317e92c9d596aeb664bad7c0914134b9f995641';
function registry() {
  let next = 0;
  const zones = Object.fromEntries(Array.from({ length: 210 }, (_, zone) => {
    const id = 'SYNTHETIC-ONLY-' + zone;
    return [id, Array.from({ length: zone < 43 ? 4 : 3 }, () => ({
      partId: 'SYNTHETIC-PART-' + next++, zoneId: id, waterPoint: [10, 56], landPoint: [9.999, 56],
    }))];
  }));
  assert.equal(next, 673);
  return { schemaVersion: 2, enabled: true, zoneCount: 210, partCount: 673, zones };
}
async function ownedRoot(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-unpaired-archive-test-'));
  t.after(async () => {
    const real = await fs.realpath(root), parent = await fs.realpath(os.tmpdir());
    assert.equal(path.dirname(real), parent);
    assert(path.basename(real).startsWith('rr-unpaired-archive-test-'));
    await fs.rm(real, { recursive: true, force: false });
  });
  return root;
}

// Real kernel I/O and immutable-storage interface, but SYNTHETIC originals.
// This callback does NOT prove a normal B bundle, genuine cloud row or issued
// C/I/T. The fixed authenticated old-reader callback is a separate product seam.
async function fixture(t, { derived = true, paired = false } = {}) {
  const root = await ownedRoot(t), source = path.join(root, 'source');
  await fs.mkdir(source);
  const raw = Buffer.from('SYNTHETIC original B transport bytes, not a real archive');
  const object = { index: 0, objectPath: `bundles/sha256/${sha(raw)}/part-000-${sha(raw)}.json.gz.part`,
    objectBytes: raw.length, objectSha256: sha(raw) };
  const binding = { modelBundleSha256: 'c'.repeat(64) };
  const description = { sourceHead: 'a'.repeat(40), datasetId: 'rr-synthetic-current-B',
    productionReferenceAt: B_TIME, generatedAt: '2026-10-18T23:10:00.000Z',
    bundleContentSha256: 'b'.repeat(64), modelBinding: binding,
    contractHashes: { continuationStateContractSha256: 'd'.repeat(64) } };
  const pointer = { document_key: 'ravscore-private-production-runtime-pointer', version: 19,
    payload: { current: { ...description, objects: [object], objectBytes: raw.length,
      objectSha256: sha(raw) }, previous: null } };
  const checkpoint = { datasetId: paired ? description.datasetId : 'rr-synthetic-older-central-S',
    productionReferenceAt: paired ? B_TIME : S_TIME, generationSha256: 'e'.repeat(64),
    modelBinding: { modelBundleSha256: 'f'.repeat(64) }, originalState: { untouched: 1.125 } };
  const derivedCheckpoint = { datasetId: description.datasetId, productionReferenceAt: B_TIME,
    generationSha256: '1'.repeat(64), modelBinding: binding, derivedOnly: true };
  const centralRegistry = registry(), files = [];
  const documents = new Map([
    ['original-S.json', checkpoint], ['registry.json', centralRegistry],
    ...WEATHER_STATE_EPOCH_PUBLIC_FILES.filter(name => name !== 'manifest.json')
      .map(name => [name, { syntheticPublicFile: name, oldPublicWeatherUnchanged: true }]),
  ]);
  if (derived && !paired) documents.set('B-derived-S.json', derivedCheckpoint);
  const manifest = { schemaVersion: 4, complete: true, zoneCount: 210, coastalPartCount: 673,
    datasetId: paired ? description.datasetId : 'rr-synthetic-public-independent',
    productionReferenceAt: paired ? B_TIME : PUBLIC_TIME, ravScoreModelBinding: binding };
  for (const [name, key] of [['public-conditions.json', 'publicConditions'],
    ['public-condition-details.json', 'publicConditionDetails'], ['coastal-parts-v2.json', 'coastalParts'],
    ['zones.geojson', 'zoneRegistry']]) {
    manifest[key + 'Bytes'] = json(documents.get(name)).length;
    manifest[key + 'Sha256'] = sha(json(documents.get(name)));
  }
  documents.set('manifest.json', manifest);
  for (const [relativePath, document] of documents) {
    const sourcePath = path.join(source, relativePath);
    await fs.writeFile(sourcePath, json(document), { flag: 'wx' });
    files.push({ relativePath, sourcePath, role: relativePath === 'original-S.json' ? 'checkpoint'
      : relativePath === 'registry.json' ? 'registry' : relativePath === 'B-derived-S.json'
        ? 'b-derived-checkpoint' : 'public-snapshot' });
  }
  const packMarker = { datasetId: description.datasetId, productionReferenceAt: B_TIME,
    sourceDetailsSha256: manifest.publicConditionDetailsSha256, modelBinding: binding };
  const originals = { originalConditions: { datasetId: description.datasetId, productionReferenceAt: B_TIME,
      coastalParts: { modelBinding: binding }, publicHourDelivery: packMarker, oldStateArchiveOnly: true },
    originalDescription: description, originalPointerRow: pointer,
    originalCheckpointRow: { document_key: 'ravscore-continuation-checkpoint', version: 11, payload: checkpoint },
    originalCheckpointPayload: checkpoint, checkpointVersion: 11, registry: centralRegistry,
    originalFileDigests: [{ relativePath: 'data/live/conditions.json', bytes: 23, sha256: '2'.repeat(64) },
      { relativePath: '.cache/public-hour-delivery.pack', bytes: 27, sha256: '3'.repeat(64) }],
    publicPackReference: { archivedWithinOriginalBundle: true, relativePath: '.cache/public-hour-delivery.pack',
      fileSha256: '3'.repeat(64), bytes: 27, marker: packMarker },
    files: paired ? files.filter(row => row.role !== 'registry') : files };
  if (derived && !paired) originals.bDerivedCheckpointPayload = derivedCheckpoint;
  const stored = new Map([[object.objectPath, Buffer.from(raw)]]), writes = [], reads = [], anon = [], phases = [], ensures = [];
  const storage = {
    async ensurePrivateBucket(options) { ensures.push(options); assert.deepEqual(options, { allowCreate: false }); },
    async uploadImmutable(name, bytes) {
      writes.push(name);
      if (stored.has(name)) assert.deepEqual(stored.get(name), bytes, 'Immutable overwrite forbidden');
      else stored.set(name, Buffer.from(bytes));
    },
    async download(name) { reads.push(name); assert(stored.has(name), 'SYNTHETIC_OBJECT_MISSING'); return Buffer.from(stored.get(name)); },
    async anonymousStatus(name) { anon.push(name); return 403; },
    async removeExact() { assert.fail('Archive preservation must never prune or delete'); },
  };
  const verifyOriginalSnapshot = async ({ phase, captureFiles, archivedFiles }) => {
    phases.push(phase);
    assert.equal(captureFiles.length, 1);
    assert.deepEqual(await fs.readFile(captureFiles[0].sourcePath), raw);
    return { ...structuredClone(originals), files: archivedFiles ?? originals.files };
  };
  const captureRoot = path.join(root, 'owned-archive');
  const capture = await createWeatherStateEpochCaptureStorage({ storage, captureRoot, objects: [object] });
  await capture.storage.download(object.objectPath);
  const originalPins = async () => ({ raw: sha(stored.get(object.objectPath)),
    files: await Promise.all(files.map(async row => [row.relativePath, sha(await fs.readFile(row.sourcePath))])),
    pointer: structuredClone(originals.originalPointerRow), central: structuredClone(originals.originalCheckpointRow) });
  const before = await originalPins();
  const save = (verify = verifyOriginalSnapshot) => saveUnpairedWeatherRestartArchive({ capture: capture.capture,
    storage, targetReferenceAt: TARGET, verifyOriginalSnapshot: verify });
  return { root, source, raw, object, originals, stored, writes, reads, anon, phases, ensures,
    storage, captureRoot, capture, verifyOriginalSnapshot, originalPins, before, save };
}
function localOptions(f, facts) {
  return { archiveRoot: f.captureRoot, archiveId: facts.archiveId,
    archiveCatalogSha256: facts.archiveCatalogSha256, targetReferenceAt: TARGET,
    verifyOriginalSnapshot: f.verifyOriginalSnapshot };
}

test('unpaired archive keeps B, older central S, optional B-derived S, public and registry separate', async t => {
  for (const derived of [true, false]) await t.test('B-derived checkpoint ' + derived, async t => {
    const f = await fixture(t, { derived });
    const cap = await f.save(), facts = assertVerifiedUnpairedWeatherRestartArchive(cap);
    assert.equal(facts.kind, 'RAVRADAR_UNPAIRED_WEATHER_RESTART_ARCHIVE');
    assert.equal(facts.paired, false); assert.equal(facts.admission, 'NO_ADMISSION');
    assert.equal(facts.targetReferenceAt, TARGET);
    assert.equal(facts.B.description.productionReferenceAt, B_TIME);
    assert.equal(facts.S.productionReferenceAt, S_TIME); assert.equal(facts.S.version, 11);
    assert.equal(facts.S.documentKey, 'ravscore-continuation-checkpoint');
    assert.equal(facts.public.manifest.productionReferenceAt, PUBLIC_TIME);
    assert.equal(facts.public.manifestSha256, sha(await fs.readFile(path.join(f.source, 'manifest.json'))));
    assert.equal(facts.registry.value.partCount, 673); assert.equal(Object.keys(facts.registry.value.zones).length, 210);
    assert.equal(facts.registry.rawSha256, sha(await fs.readFile(path.join(f.source, 'registry.json'))));
    assert.equal(facts.public.files.length, 6);
    assert.equal(Object.isFrozen(facts), true); assert.equal(Object.isFrozen(facts.S.payload), true);
    assert.equal(Object.isFrozen(facts.registry.value.zones), true);
    if (derived) {
      assert.equal(facts.B.derivedCheckpoint.kind, 'B_DERIVED_NORMAL_CHECKPOINT_ARCHIVE_ONLY');
      assert.equal(facts.B.derivedCheckpoint.payload.derivedOnly, true);
      assert.equal(facts.B.derivedCheckpoint.productionReferenceAt, B_TIME);
      assert.notDeepEqual(facts.B.derivedCheckpoint.payload, facts.S.payload);
    } else assert.equal(facts.B.derivedCheckpoint, null);
    assert.deepEqual(f.phases, ['UNPAIRED_BEFORE_SAVE', 'UNPAIRED_AFTER_SAVE']);
    assert.deepEqual(await f.originalPins(), f.before);
    assert(f.writes.length > 1); assert(f.writes.every(name => name.startsWith(`bundles/sha256/${facts.archiveId}`)));
    assert(!f.writes.includes(f.object.objectPath));
    for (const name of f.writes) {
      assert(f.reads.includes(name), 'Every immutable write has real readback');
      assert(f.anon.includes(name), 'Every immutable write has anonymous-access denial');
    }
    assert(f.ensures.length > 0);
    assert.throws(() => assertVerifiedUnpairedWeatherRestartArchive(structuredClone(cap)), /UNPAIRED_HANDLE_INVALID/);
    assert.throws(() => assertVerifiedUnpairedWeatherRestartArchive({ ...facts }), /UNPAIRED_HANDLE_INVALID/);
    assert.throws(() => assertVerifiedWeatherStateEpochArchive(cap), /HANDLE_INVALID/);
  });
});

test('unpaired normal local rehydrate and fresh-job remote materialize require exact closed bytes', async t => {
  const f = await fixture(t), first = await f.save(), facts = assertVerifiedUnpairedWeatherRestartArchive(first);
  const reads = f.reads.length;
  const local = await rehydrateLocalUnpairedWeatherRestartArchive(localOptions(f, facts));
  assert.deepEqual(assertVerifiedUnpairedWeatherRestartArchive(local), facts);
  assert.notEqual(local, first); assert.equal(f.reads.length, reads, 'Local readback performs no storage request');
  const remoteRoot = path.join(f.root, 'new-job-archive');
  const remote = await materializeUnpairedWeatherRestartArchive({ ...localOptions(f, facts), storage: f.storage, archiveRoot: remoteRoot });
  assert.deepEqual(assertVerifiedUnpairedWeatherRestartArchive(remote), facts);
  assert.deepEqual(await fs.readFile(path.join(remoteRoot, 'original-b-000.part')), f.raw);
  assert.equal(f.reads.filter(name => name === f.object.objectPath).length, 1, 'No rolling B re-download for archived materialization');
  assert.deepEqual(f.phases, ['UNPAIRED_BEFORE_SAVE', 'UNPAIRED_AFTER_SAVE',
    'UNPAIRED_REHYDRATE_BEFORE', 'UNPAIRED_REHYDRATE_AFTER', 'UNPAIRED_REHYDRATE_BEFORE', 'UNPAIRED_REHYDRATE_AFTER']);
  assert.deepEqual(await f.originalPins(), f.before);
  await assert.rejects(materializeUnpairedWeatherRestartArchive({ ...localOptions(f, facts), storage: f.storage,
    archiveRoot: remoteRoot }), { code: 'EEXIST' });
  assert.deepEqual(await fs.readFile(path.join(remoteRoot, 'original-b-000.part')), f.raw);
});

test('unpaired unknown writes, changed sources, invalid transport and symlinks never mint authority', async t => {
  await t.test('actual write then lost reply closes capture and never retries', async t => {
    const f = await fixture(t), normal = f.storage.uploadImmutable;
    const first = Object.assign(new Error('SYNTHETIC_WRITE_COMMITTED_REPLY_LOST'), { code: 'SYNTHETIC_REPLY_LOST' });
    f.storage.uploadImmutable = async (...args) => { await normal(...args); throw first; };
    await assert.rejects(f.save(), error => error === first);
    assert.equal(f.writes.length, 1); assert(f.stored.has(f.writes[0]));
    await assert.rejects(f.save(), /UNPAIRED_CAPTURE_INVALID/);
    await assert.rejects(f.capture.storage.download(f.object.objectPath), /CAPTURE_CLOSED/);
    assert.equal(f.writes.length, 1); assert.deepEqual(await f.originalPins(), f.before);
  });
  for (const mode of ['pointer-version', 'S-version', 'S-payload', 'public-source', 'registry-source']) {
    await t.test('changed ' + mode, async t => {
      const f = await fixture(t);
      await assert.rejects(f.save(async args => {
        const value = await f.verifyOriginalSnapshot(args);
        if (args.phase !== 'UNPAIRED_AFTER_SAVE') return value;
        if (mode === 'pointer-version') value.originalPointerRow.version++;
        if (mode === 'S-version') { value.originalCheckpointRow.version++; value.checkpointVersion++; }
        if (mode === 'S-payload') {
          value.originalCheckpointRow.payload.originalState.untouched = 9;
          value.originalCheckpointPayload.originalState.untouched = 9;
        }
        if (mode === 'public-source') await fs.appendFile(path.join(f.source, 'manifest.json'), ' ');
        if (mode === 'registry-source') await fs.appendFile(path.join(f.source, 'registry.json'), ' ');
        return value;
      }), /UNPAIRED_/);
      assert.equal(f.originals.originalPointerRow.version, 19);
      assert.equal(f.originals.originalCheckpointRow.version, 11);
      assert.equal(sha(f.stored.get(f.object.objectPath)), f.before.raw);
    });
  }
  for (const mode of ['readback', 'anonymous']) await t.test('rejected remote ' + mode, async t => {
    const f = await fixture(t);
    if (mode === 'readback') {
      const normal = f.storage.download;
      f.storage.download = async name => f.writes.includes(name) ? Buffer.from('wrong saved bytes') : normal(name);
    } else f.storage.anonymousStatus = async () => 200;
    await assert.rejects(f.save(), /STORAGE_READBACK_MISMATCH|ANONYMOUS_ACCESS/);
    assert.deepEqual(await f.originalPins(), f.before);
  });
  for (const mode of ['B', 'transport', 'catalog', 'catalog-layout']) await t.test('changed local ' + mode, async t => {
    const f = await fixture(t), facts = assertVerifiedUnpairedWeatherRestartArchive(await f.save());
    const catalogPath = path.join(f.captureRoot, 'unpaired-catalog.json.gz');
    const compressed = await fs.readFile(catalogPath), catalog = JSON.parse(gunzipSync(compressed));
    let expectedSha = facts.archiveCatalogSha256;
    if (mode === 'B') await fs.appendFile(path.join(f.captureRoot, 'original-b-000.part'), 'changed');
    if (mode === 'transport') await fs.appendFile(path.join(f.captureRoot, catalog.files[0].chunks[0].localFile), 'changed');
    if (mode === 'catalog') await fs.appendFile(catalogPath, 'changed');
    if (mode === 'catalog-layout') {
      catalog.files[0].chunks[0].objectPath = 'bundles/sha256/' + '0'.repeat(64) + '.json.gz';
      const changed = gzipSync(json(catalog)); await fs.writeFile(catalogPath, changed); expectedSha = sha(changed);
    }
    await assert.rejects(rehydrateLocalUnpairedWeatherRestartArchive({ ...localOptions(f, facts), archiveCatalogSha256: expectedSha }),
      /UNPAIRED_/);
    assert.deepEqual(await f.originalPins(), f.before);
  });
  await t.test('real directory symlink cannot substitute an original path', async t => {
    const f = await fixture(t), linked = path.join(f.root, 'linked-source');
    await fs.symlink(f.source, linked, 'junction');
    await assert.rejects(f.save(async args => {
      const value = await f.verifyOriginalSnapshot(args);
      return { ...value, files: value.files.map(row => ({ ...row, sourcePath: path.join(linked, row.relativePath) })) };
    }), /PATH_INVALID/);
    assert.equal(f.writes.length, 0); assert.deepEqual(await f.originalPins(), f.before);
  });
});

test('the whole old paired kernel remains exact and its genuine opaque cap is not an unpaired cap', async t => {
  const bytes = Buffer.from((await fs.readFile(KERNEL, 'utf8')).replace(/\r\n?/g, '\n'));
  assert(bytes.length > OLD_BYTES); assert.equal(sha(bytes.subarray(0, OLD_BYTES)), OLD_SHA);
  const f = await fixture(t, { paired: true });
  const paired = await saveWeatherStateEpochArchive({ capture: f.capture.capture, storage: f.storage,
    targetReferenceAt: TARGET, verifyOriginalSnapshot: f.verifyOriginalSnapshot });
  const facts = assertVerifiedWeatherStateEpochArchive(paired);
  assert.equal(facts.originalDescription.productionReferenceAt, B_TIME);
  assert.equal(facts.originalCheckpointPayload.productionReferenceAt, B_TIME);
  assert.throws(() => assertVerifiedUnpairedWeatherRestartArchive(paired), /UNPAIRED_HANDLE_INVALID/);
  assert.deepEqual(await f.originalPins(), f.before);
});
