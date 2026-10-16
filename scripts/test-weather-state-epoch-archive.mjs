import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createWeatherStateEpochCaptureStorage, saveWeatherStateEpochArchive,
  rehydrateLocalWeatherStateEpochArchive, assertVerifiedWeatherStateEpochArchive,
  materializeWeatherStateEpochArchive, WEATHER_STATE_EPOCH_PUBLIC_FILES } from './lib/weather-state-epoch-archive.mjs';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const target = '2026-10-16T12:00:00.000Z';

// Controlled archive-kernel originals, not a claim of genuine production B/S.
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-epoch-archive-test-'));
  const raw = Buffer.from('controlled exact original B bytes');
  const object = { index: 0, objectPath: `bundles/sha256/${sha(raw)}/part-000-${sha(raw)}.json.gz.part`,
    objectBytes: raw.length, objectSha256: sha(raw) };
  const description = { sourceHead: 'a'.repeat(40), datasetId: 'original-dataset',
    productionReferenceAt: '2026-10-16T10:00:00.000Z', generatedAt: '2026-10-16T10:12:00.000Z',
    bundleContentSha256: 'b'.repeat(64), modelBinding: { modelBundleSha256: 'c'.repeat(64) },
    contractHashes: { originalContract: 'd'.repeat(64) } };
  const pointer = { document_key: 'ravscore-private-production-runtime-pointer', version: 7,
    payload: { current: { ...description, objects: [object], objectBytes: raw.length,
      objectSha256: sha(raw) }, previous: null } };
  const checkpoint = { datasetId: description.datasetId,
    productionReferenceAt: description.productionReferenceAt, originalState: { value: 1.125 } };
  const files = [];
  for (const relativePath of ['original-S.json', ...WEATHER_STATE_EPOCH_PUBLIC_FILES]) {
    const sourcePath = path.join(root, 'source', relativePath);
    await fs.mkdir(path.dirname(sourcePath), { recursive: true });
    await fs.writeFile(sourcePath, JSON.stringify(relativePath === 'original-S.json' ? checkpoint
      : relativePath === 'manifest.json' ? { datasetId: description.datasetId,
        productionReferenceAt: description.productionReferenceAt,
        ravScoreModelBinding: description.modelBinding } : { original: relativePath }) + '\n');
    files.push({ role: relativePath === 'original-S.json' ? 'checkpoint' : 'public-snapshot',
      relativePath, sourcePath });
  }
  const detailsSha256 = sha(await fs.readFile(files.find(row => row.relativePath === 'public-condition-details.json').sourcePath));
  const manifestFile = files.find(row => row.relativePath === 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestFile.sourcePath, 'utf8'));
  const detailsBytes = (await fs.stat(files.find(row => row.relativePath === 'public-condition-details.json').sourcePath)).size;
  await fs.writeFile(manifestFile.sourcePath, JSON.stringify({ ...manifest,
    publicConditionDetailsSha256: detailsSha256, publicConditionDetailsBytes: detailsBytes }) + '\n');
  const originalFileDigests = [{ relativePath: 'data/live/conditions.json', bytes: 19,
    sha256: 'e'.repeat(64) }, { relativePath: '.cache/public-hour-delivery.pack', bytes: 27,
    sha256: 'f'.repeat(64) }];
  const publicPackReference = { archivedWithinOriginalBundle: true,
    relativePath: '.cache/public-hour-delivery.pack', fileSha256: 'f'.repeat(64), bytes: 27,
    marker: { datasetId: description.datasetId, productionReferenceAt: description.productionReferenceAt,
      sourceDetailsSha256: detailsSha256, modelBinding: description.modelBinding } };
  const originals = { originalConditions: { datasetId: description.datasetId,
    productionReferenceAt: description.productionReferenceAt, publicHourDelivery: publicPackReference.marker,
    originalWeather: { untouched: true } },
    originalCheckpointPayload: checkpoint, originalDescription: description, checkpointVersion: 9,
    originalPointerRow: pointer, originalCheckpointRow: { document_key: 'ravscore-continuation-checkpoint',
      version: 9, payload: checkpoint }, publicPackReference, originalFileDigests, files };
  const stored = new Map([[object.objectPath, raw]]), writes = [], reads = [], phases = [];
  const storage = {
    async ensurePrivateBucket() {},
    async uploadImmutable(name, bytes) { writes.push(name); if (!stored.has(name)) stored.set(name, Buffer.from(bytes)); },
    async download(name) { reads.push(name); if (!stored.has(name)) throw new Error('MISSING'); return Buffer.from(stored.get(name)); },
    async anonymousStatus() { return 403; },
    async removeExact() { throw new Error('NO_REMOVE_ALLOWED'); },
  };
  const verifyOriginalSnapshot = async ({ phase, captureFiles, archivedFiles }) => {
    phases.push(phase);
    assert.equal(captureFiles.length, 1);
    assert.deepEqual(await fs.readFile(captureFiles[0].sourcePath), raw);
    if (archivedFiles) return { ...originals, files: archivedFiles };
    return originals;
  };
  const captureRoot = path.join(root, 'owned-archive');
  const capture = await createWeatherStateEpochCaptureStorage({ storage, captureRoot, objects: [object] });
  return { root, raw, object, stored, writes, reads, storage, phases, originals,
    captureRoot, capture, verifyOriginalSnapshot };
}

test('actual captured bytes save/readback/anonaudit before opaque mint and local rehydrate', async () => {
  const f = await fixture();
  try {
    const returned = await f.capture.storage.download(f.object.objectPath);
    assert.deepEqual(returned, f.raw);
    const handle = await saveWeatherStateEpochArchive({ capture: f.capture.capture, storage: f.storage,
      targetReferenceAt: target, verifyOriginalSnapshot: f.verifyOriginalSnapshot });
    const value = assertVerifiedWeatherStateEpochArchive(handle);
    assert.equal(value.originalConditions, f.originals.originalConditions);
    assert.equal(value.originalCheckpointPayload, f.originals.originalCheckpointPayload);
    assert.equal(value.publicPackReference.archivedWithinOriginalBundle, true);
    assert.equal(value.targetReferenceAt, target);
    assert.deepEqual(f.phases, ['BEFORE_SAVE', 'AFTER_SAVE']);
    assert.equal(f.reads.filter(name => name === f.object.objectPath).length, 1,
      'The genuine restore source B is downloaded once only.');
    assert(f.writes.every(name => name.startsWith(`bundles/sha256/${value.archiveId}`)));
    assert(!f.writes.includes(f.object.objectPath));
    assert.throws(() => assertVerifiedWeatherStateEpochArchive({ status: 'ARCHIVED' }), /HANDLE_INVALID/);
    const readCount = f.reads.length;
    const fresh = await rehydrateLocalWeatherStateEpochArchive({ archiveRoot: f.captureRoot,
      archiveId: value.archiveId, archiveCatalogSha256: value.archiveCatalogSha256,
      targetReferenceAt: target, verifyOriginalSnapshot: f.verifyOriginalSnapshot });
    assert.equal(assertVerifiedWeatherStateEpochArchive(fresh).archiveId, value.archiveId);
    assert.equal(f.reads.length, readCount, 'Local rehydration never downloads B again.');
    const remoteRoot = path.join(f.root, 'other-job-archive');
    const secondJob = await materializeWeatherStateEpochArchive({ storage: f.storage,
      archiveRoot: remoteRoot, archiveId: value.archiveId, archiveCatalogSha256: value.archiveCatalogSha256,
      targetReferenceAt: target, verifyOriginalSnapshot: f.verifyOriginalSnapshot });
    assert.equal(assertVerifiedWeatherStateEpochArchive(secondJob).archiveId, value.archiveId);
    assert.equal(f.reads.filter(name => name === f.object.objectPath).length, 1,
      'New job materializes only permanent archive copies, never redownloads rolling B.');
    assert.deepEqual(await fs.readFile(path.join(remoteRoot, 'original-b-000.part')), f.raw);
  } finally { await fs.rm(f.root, { recursive: true, force: true }); }
});

test('missing capture, changed B, changed S, public incomplete and changed pointer refuse mint', async () => {
  for (const mode of ['missing', 'B', 'S', 'public', 'pointer', 'source-after-save', 'public-pack-source']) {
    const f = await fixture();
    try {
      if (mode === 'B') f.stored.set(f.object.objectPath, Buffer.from('changed'));
      if (mode !== 'missing') {
        if (mode === 'B') {
          await assert.rejects(f.capture.storage.download(f.object.objectPath), /SOURCE_OBJECT_MISMATCH/);
          continue;
        }
        await f.capture.storage.download(f.object.objectPath);
      }
      const verify = async args => {
        const value = await f.verifyOriginalSnapshot(args);
        if (mode === 'S') await fs.writeFile(value.files[0].sourcePath,
          JSON.stringify({ ...f.originals.originalCheckpointPayload, originalState: { value: 8 } }));
        if (mode === 'public') return { ...value, files: value.files.slice(0, -1) };
        if (mode === 'public-pack-source') {
          const marker = { ...value.publicPackReference.marker, sourceDetailsSha256: '9'.repeat(64) };
          return { ...value, originalConditions: { ...value.originalConditions, publicHourDelivery: marker },
            publicPackReference: { ...value.publicPackReference, marker } };
        }
        if (mode === 'pointer' && args.phase === 'AFTER_SAVE') return { ...value,
          originalPointerRow: { ...value.originalPointerRow, version: 8 } };
        if (mode === 'source-after-save' && args.phase === 'AFTER_SAVE') {
          await fs.appendFile(f.originals.files[0].sourcePath, ' ');
        }
        return value;
      };
      await assert.rejects(saveWeatherStateEpochArchive({ capture: f.capture.capture, storage: f.storage,
        targetReferenceAt: target, verifyOriginalSnapshot: verify }));
    } finally { await fs.rm(f.root, { recursive: true, force: true }); }
  }
});

test('wrong readback, anonymous access and local byte mutation are never archive proof', async () => {
  for (const mode of ['readback', 'anonymous', 'local']) {
    const f = await fixture();
    try {
      await f.capture.storage.download(f.object.objectPath);
      if (mode === 'readback') {
        const normal = f.storage.download;
        f.storage.download = async name => f.writes.includes(name) ? Buffer.from('wrong') : normal(name);
      }
      if (mode === 'anonymous') f.storage.anonymousStatus = async () => 200;
      if (mode !== 'local') {
        await assert.rejects(saveWeatherStateEpochArchive({ capture: f.capture.capture, storage: f.storage,
          targetReferenceAt: target, verifyOriginalSnapshot: f.verifyOriginalSnapshot }));
        continue;
      }
      const handle = await saveWeatherStateEpochArchive({ capture: f.capture.capture, storage: f.storage,
        targetReferenceAt: target, verifyOriginalSnapshot: f.verifyOriginalSnapshot });
      const value = assertVerifiedWeatherStateEpochArchive(handle);
      await fs.appendFile(path.join(f.captureRoot, 'original-b-000.part'), 'changed');
      await assert.rejects(rehydrateLocalWeatherStateEpochArchive({ archiveRoot: f.captureRoot,
        archiveId: value.archiveId, archiveCatalogSha256: value.archiveCatalogSha256,
        targetReferenceAt: target, verifyOriginalSnapshot: f.verifyOriginalSnapshot }));
    } finally { await fs.rm(f.root, { recursive: true, force: true }); }
  }
});

test('first genuine-validator refusal survives cleanup and never authorizes SAVE or another capture', async () => {
  const f = await fixture();
  try {
    await f.capture.storage.download(f.object.objectPath);
    const source = await fs.readFile(f.originals.files[0].sourcePath);
    const first = Object.assign(new Error('controlled private validation refusal'), { code: 'CONTROLLED_ORIGINAL_REFUSAL' });
    await assert.rejects(saveWeatherStateEpochArchive({ capture: f.capture.capture, storage: f.storage,
      targetReferenceAt: target, verifyOriginalSnapshot: async () => { throw first; } }), error => error === first);
    assert.equal(f.writes.length, 0);
    assert.deepEqual(await fs.readFile(f.originals.files[0].sourcePath), source);
    await assert.rejects(f.capture.storage.download(f.object.objectPath), /CAPTURE_CLOSED/);
  } finally { await fs.rm(f.root, { recursive: true, force: true }); }
});
