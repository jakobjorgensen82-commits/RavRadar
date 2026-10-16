// Additive private preservation only. This archive never grants weather/state
// admission, replaces a rolling pointer, or deletes an original.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { constants, fstatSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { isDeepStrictEqual as equal } from 'node:util';

export const WEATHER_STATE_EPOCH_PUBLIC_FILES = Object.freeze(['manifest.json',
  'public-conditions.json', 'public-condition-details.json', 'coastal-parts-v2.json',
  'zones.geojson', 'water-level-station-routing.json']);
const REPOSITORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHA = /^[a-f0-9]{64}$/, OBJECT = /^bundles\/sha256\/[a-f0-9]{64}(?:\.json\.gz|\/part-\d{3}-[a-f0-9]{64}\.json\.gz\.part)$/;
const CHUNK = 24 * 1024 * 1024, MAX_OBJECT = 50_000_000, MAX_B = 350_000_000;
const MAX_FILE = 512 * 1024 * 1024, MAX_TOTAL = 2 * 1024 * 1024 * 1024, MAX_CATALOG = 1024 * 1024;
const captures = new WeakMap(), archives = new WeakMap(), retainedHandles = new Set();
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw new Error('WEATHER_STATE_EPOCH_ARCHIVE_' + code); };
const same = (left, right, code) => { if (!equal(left, right)) fail(code); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const canonical = value => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
  : plain(value) ? '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}'
    : JSON.stringify(value);
const identity = stat => ['dev', 'ino', 'mode', 'size', 'mtimeNs', 'ctimeNs'].map(key => stat[key]);
const inside = (root, child) => { const rel = path.relative(root, child);
  return rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel); };
function time(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))
    || new Date(value).toISOString() !== value) fail('TIME_INVALID');
  return value;
}
async function noLinks(filename) {
  let at = path.parse(filename).root;
  for (const segment of path.relative(at, filename).split(path.sep).filter(Boolean)) {
    at = path.join(at, segment); if ((await fs.lstat(at)).isSymbolicLink()) fail('PATH_INVALID');
  }
}
async function privateRoot(root, create = false) {
  if (typeof root !== 'string' || !path.isAbsolute(root) || path.resolve(root) === path.parse(root).root
    || path.resolve(root) === REPOSITORY || inside(REPOSITORY, path.resolve(root))) fail('PRIVATE_ROOT_INVALID');
  await noLinks(path.dirname(root));
  if (create) await fs.mkdir(root, { mode: 0o700 });
  await noLinks(root); if (!(await fs.lstat(root)).isDirectory()) fail('PRIVATE_ROOT_INVALID');
  return fs.realpath(root);
}
async function closeOwned(handle, first) {
  const fd = handle.fd;
  try { await handle.close(); } catch (error) { first ??= error; }
  let closed = false;
  try { fstatSync(fd); } catch (error) { closed = error.code === 'EBADF'; if (!closed) first ??= error; }
  if (closed) retainedHandles.delete(handle); else first ??= new Error('WEATHER_STATE_EPOCH_ARCHIVE_CLOSE_UNPROVED');
  if (first) throw first;
}
async function writeOwned(filename, bytes) {
  await noLinks(path.dirname(filename));
  const handle = await fs.open(filename, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL
    | (constants.O_NOFOLLOW ?? 0), 0o600);
  retainedHandles.add(handle); let first;
  try { await handle.writeFile(bytes); await handle.sync(); } catch (error) { first = error; }
  await closeOwned(handle, first);
}
async function readMeasured(filename, maximum, consume = null) {
  await noLinks(filename);
  const before = await fs.lstat(filename, { bigint: true });
  if (!before.isFile() || before.size < 1n || before.size > BigInt(maximum)) fail('FILE_INVALID');
  const handle = await fs.open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  retainedHandles.add(handle); let first, result;
  try {
    const opened = await handle.stat({ bigint: true });
    same(identity(before).slice(0, -1), identity(opened).slice(0, -1), 'INPUT_CHANGED');
    if (process.platform !== 'win32') same(identity(before), identity(opened), 'INPUT_CHANGED');
    const digest = crypto.createHash('sha256'); let bytes = 0, index = 0;
    while (bytes < Number(before.size)) {
      const buffer = Buffer.allocUnsafe(Math.min(CHUNK, Number(before.size) - bytes));
      let filled = 0;
      while (filled < buffer.length) {
        const read = await handle.read(buffer, filled, buffer.length - filled, null);
        if (read.bytesRead === 0) fail('INPUT_CHANGED');
        filled += read.bytesRead;
      }
      const chunk = buffer; bytes += chunk.length;
      if (bytes > maximum || BigInt(bytes) > before.size) fail('INPUT_CHANGED');
      digest.update(chunk); if (consume) await consume(chunk, index++);
    }
    if ((await handle.read(Buffer.alloc(1), 0, 1, null)).bytesRead !== 0) fail('INPUT_CHANGED');
    if (BigInt(bytes) !== before.size) fail('INPUT_CHANGED');
    same(identity(await handle.stat({ bigint: true })), identity(opened), 'INPUT_CHANGED');
    same(identity(await fs.lstat(filename, { bigint: true })), identity(before), 'INPUT_CHANGED');
    result = { bytes, sha256: digest.digest('hex') };
  } catch (error) { first = error; }
  await closeOwned(handle, first); return result;
}
async function readBuffer(filename, maximum) {
  const chunks = []; await readMeasured(filename, maximum, chunk => { chunks.push(Buffer.from(chunk)); });
  return Buffer.concat(chunks);
}
function objectsChecked(objects) {
  if (!Array.isArray(objects) || objects.length < 1 || objects.length > 8) fail('OBJECTS_INVALID');
  let total = 0;
  const checked = objects.map((row, index) => {
    if (!plain(row) || row.index !== index || !OBJECT.test(row.objectPath ?? '')
      || !SHA.test(row.objectSha256 ?? '') || !Number.isSafeInteger(row.objectBytes)
      || row.objectBytes < 1 || row.objectBytes > MAX_OBJECT) fail('OBJECTS_INVALID');
    total += row.objectBytes;
    return Object.freeze({ index, objectPath: row.objectPath, objectSha256: row.objectSha256, objectBytes: row.objectBytes });
  });
  if (total > MAX_B || new Set(checked.map(row => row.objectPath)).size !== checked.length) fail('OBJECTS_INVALID');
  return Object.freeze(checked);
}
function storageChecked(storage) {
  for (const method of ['ensurePrivateBucket', 'uploadImmutable', 'download', 'anonymousStatus']) {
    if (typeof storage?.[method] !== 'function') fail('STORAGE_INVALID');
  }
}
export async function createWeatherStateEpochCaptureStorage({ storage, captureRoot, objects } = {}) {
  storageChecked(storage); const selected = objectsChecked(objects), root = await privateRoot(captureRoot, true);
  const token = Object.freeze({}), state = { root, objects: selected, files: new Map(), saving: false, closed: false };
  captures.set(token, state);
  const wrapper = { ...storage, async download(objectPath) {
    if (state.closed || state.saving) fail('CAPTURE_CLOSED');
    const descriptor = selected.find(row => row.objectPath === objectPath);
    if (!descriptor) fail('UNSELECTED_OBJECT');
    if (state.files.has(objectPath)) fail('DUPLICATE_SOURCE_DOWNLOAD');
    const bytes = await storage.download(objectPath);
    if (!Buffer.isBuffer(bytes) || bytes.length !== descriptor.objectBytes || sha(bytes) !== descriptor.objectSha256) fail('SOURCE_OBJECT_MISMATCH');
    const localFile = `original-b-${String(descriptor.index).padStart(3, '0')}.part`;
    const sourcePath = path.join(root, localFile);
    await writeOwned(sourcePath, bytes);
    same(await readMeasured(sourcePath, MAX_OBJECT), { bytes: bytes.length, sha256: sha(bytes) }, 'CAPTURE_READBACK');
    state.files.set(objectPath, Object.freeze({ ...descriptor, localFile, sourcePath }));
    return bytes; // Same actual Buffer continues into the genuine original verifier.
  } };
  return Object.freeze({ storage: Object.freeze(wrapper), capture: token });
}
function snapshotMetadata(snapshot, bObjects, targetReferenceAt) {
  if (!plain(snapshot) || !plain(snapshot.originalConditions) || !plain(snapshot.originalCheckpointPayload)
    || !plain(snapshot.originalDescription) || !plain(snapshot.originalPointerRow)
    || !plain(snapshot.originalCheckpointRow) || !Array.isArray(snapshot.files)
    || !Array.isArray(snapshot.originalFileDigests)) fail('SNAPSHOT_INVALID');
  const d = snapshot.originalDescription, p = snapshot.originalPointerRow, s = snapshot.originalCheckpointRow;
  if (p.document_key !== 'ravscore-private-production-runtime-pointer' || !Number.isSafeInteger(p.version) || p.version < 1
    || !plain(p.payload?.current) || s.document_key !== 'ravscore-continuation-checkpoint'
    || !Number.isSafeInteger(snapshot.checkpointVersion) || snapshot.checkpointVersion < 1
    || s.version !== snapshot.checkpointVersion) fail('SNAPSHOT_INVALID');
  same(s.payload, snapshot.originalCheckpointPayload, 'CHECKPOINT_ROW_MISMATCH');
  for (const field of ['sourceHead', 'datasetId', 'productionReferenceAt', 'generatedAt', 'bundleContentSha256', 'modelBinding', 'contractHashes']) {
    same(p.payload.current[field], d[field], 'POINTER_DESCRIPTION_MISMATCH');
  }
  same(objectsChecked(p.payload.current.objects ?? [{ index: 0, objectPath: p.payload.current.objectPath,
    objectBytes: p.payload.current.objectBytes, objectSha256: p.payload.current.objectSha256 }]), bObjects, 'POINTER_OBJECTS_MISMATCH');
  time(d.productionReferenceAt); time(d.generatedAt);
  if (Date.parse(time(targetReferenceAt)) <= Date.parse(d.productionReferenceAt)) fail('TARGET_NOT_NEWER');
  for (const document of [snapshot.originalConditions, snapshot.originalCheckpointPayload]) {
    if (document.datasetId !== d.datasetId || document.productionReferenceAt !== d.productionReferenceAt) fail('ORIGINAL_IDENTITY_MISMATCH');
  }
  const digests = snapshot.originalFileDigests.map(row => {
    if (!plain(row) || typeof row.relativePath !== 'string' || row.relativePath.includes('..')
      || path.isAbsolute(row.relativePath) || !SHA.test(row.sha256 ?? '')
      || !Number.isSafeInteger(row.bytes) || row.bytes < 1 || row.bytes > MAX_TOTAL) fail('ORIGINAL_DIGEST_INVALID');
    return { relativePath: row.relativePath, bytes: row.bytes, sha256: row.sha256 };
  }).sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'en'));
  if (!digests.length || new Set(digests.map(row => row.relativePath)).size !== digests.length
    || !digests.some(row => row.relativePath === 'data/live/conditions.json')) fail('ORIGINAL_DIGEST_INVALID');
  const pack = snapshot.publicPackReference;
  if (!plain(pack) || pack.archivedWithinOriginalBundle !== true
    || pack.relativePath !== '.cache/public-hour-delivery.pack' || !SHA.test(pack.fileSha256 ?? '')
    || !Number.isSafeInteger(pack.bytes) || pack.bytes < 1 || !plain(pack.marker)) fail('PUBLIC_PACK_INVALID');
  if (!digests.some(row => row.relativePath === pack.relativePath && row.bytes === pack.bytes && row.sha256 === pack.fileSha256)) fail('PUBLIC_PACK_NOT_IN_B');
  same(snapshot.originalConditions.publicHourDelivery, pack.marker, 'PUBLIC_PACK_MARKER_MISMATCH');
  const expectedFiles = ['original-S.json', ...WEATHER_STATE_EPOCH_PUBLIC_FILES].sort();
  same(snapshot.files.map(row => row.relativePath).sort(), expectedFiles, 'PUBLIC_SNAPSHOT_INCOMPLETE');
  for (const row of snapshot.files) {
    if (!plain(row) || !path.isAbsolute(row.sourcePath ?? '')
      || inside(REPOSITORY, path.resolve(row.sourcePath))
      || row.role !== (row.relativePath === 'original-S.json' ? 'checkpoint' : 'public-snapshot')) fail('SNAPSHOT_FILE_INVALID');
  }
  return { originalDescription: structuredClone(d), originalPointerRow: structuredClone(p),
    checkpointVersion: snapshot.checkpointVersion, checkpointDocumentKey: s.document_key,
    publicPackReference: structuredClone(pack), originalFileDigests: digests };
}
async function measureSnapshot(snapshot, bObjects, targetReferenceAt) {
  const metadata = snapshotMetadata(snapshot, bObjects, targetReferenceAt), files = [];
  let total = bObjects.reduce((sum, row) => sum + row.objectBytes, 0);
  for (const row of [...snapshot.files].sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'en'))) {
    const measured = await readMeasured(row.sourcePath, row.role === 'checkpoint' ? 16 * 1024 * 1024 : MAX_FILE);
    total += measured.bytes; if (total > MAX_TOTAL) fail('TOTAL_SIZE_LIMIT');
    files.push({ role: row.role, relativePath: row.relativePath, ...measured });
  }
  const checkpoint = snapshot.files.find(row => row.role === 'checkpoint');
  const parsed = JSON.parse((await readBuffer(checkpoint.sourcePath, 16 * 1024 * 1024)).toString('utf8'));
  same(parsed, snapshot.originalCheckpointPayload, 'CHECKPOINT_BYTES_MISMATCH');
  const manifestFile = snapshot.files.find(row => row.relativePath === 'manifest.json');
  const manifest = JSON.parse((await readBuffer(manifestFile.sourcePath, MAX_CATALOG)).toString('utf8'));
  if (manifest.datasetId !== metadata.originalDescription.datasetId
    || manifest.productionReferenceAt !== metadata.originalDescription.productionReferenceAt) fail('PUBLIC_IDENTITY_MISMATCH');
  const packMarker = metadata.publicPackReference.marker;
  if (!SHA.test(manifest.publicConditionDetailsSha256 ?? '')
    || manifest.publicConditionDetailsSha256 !== packMarker.sourceDetailsSha256) fail('PUBLIC_PACK_SOURCE_MISMATCH');
  same(manifest.ravScoreModelBinding, packMarker.modelBinding, 'PUBLIC_PACK_MODEL_MISMATCH');
  for (const [name, key] of [['public-conditions.json', 'publicConditions'], ['public-condition-details.json', 'publicConditionDetails'],
    ['coastal-parts-v2.json', 'coastalParts'], ['zones.geojson', 'zoneRegistry']]) {
    const row = files.find(file => file.relativePath === name);
    if (Object.hasOwn(manifest, key + 'Sha256') && (manifest[key + 'Sha256'] !== row.sha256 || manifest[key + 'Bytes'] !== row.bytes)) fail('PUBLIC_MANIFEST_MISMATCH');
  }
  return { metadata, files };
}
async function storedExact(storage, objectPath, bytes) {
  if (!OBJECT.test(objectPath) || bytes.length < 1 || bytes.length > MAX_OBJECT) fail('STORED_OBJECT_INVALID');
  await storage.uploadImmutable(objectPath, bytes);
  const readback = await storage.download(objectPath);
  if (!Buffer.isBuffer(readback) || !readback.equals(bytes)) fail('STORAGE_READBACK_MISMATCH');
  if (![400, 401, 403, 404].includes(await storage.anonymousStatus(objectPath))) fail('ANONYMOUS_ACCESS');
}
function freezeTree(value) {
  const seen = new WeakSet(), pending = [value];
  while (pending.length) {
    const item = pending.pop(); if (!item || typeof item !== 'object' || seen.has(item)) continue;
    seen.add(item); Object.freeze(item); for (const child of Object.values(item)) if (child && typeof child === 'object') pending.push(child);
  }
  return value;
}
function mint(snapshot, catalog, catalogSha256) {
  const handle = Object.freeze({});
  archives.set(handle, freezeTree({ originalConditions: snapshot.originalConditions,
    originalCheckpointPayload: snapshot.originalCheckpointPayload, originalDescription: snapshot.originalDescription,
    checkpointVersion: snapshot.checkpointVersion, publicPackReference: snapshot.publicPackReference,
    archiveId: catalog.archiveId, archiveCatalogSha256: catalogSha256,
    originalFileDigests: snapshot.originalFileDigests, targetReferenceAt: catalog.targetReferenceAt }));
  return handle;
}
export function assertVerifiedWeatherStateEpochArchive(handle) {
  const value = archives.get(handle); if (!value) fail('HANDLE_INVALID'); return value;
}
export async function saveWeatherStateEpochArchive({ capture, storage, targetReferenceAt, verifyOriginalSnapshot } = {}) {
  const state = captures.get(capture); storageChecked(storage);
  if (!state || state.saving || state.closed || typeof verifyOriginalSnapshot !== 'function') fail('CAPTURE_INVALID');
  state.saving = true;
  try {
    if (state.files.size !== state.objects.length) fail('CAPTURE_INCOMPLETE');
    const captureFiles = state.objects.map(row => state.files.get(row.objectPath));
    for (const row of captureFiles) same(await readMeasured(row.sourcePath, MAX_OBJECT),
      { bytes: row.objectBytes, sha256: row.objectSha256 }, 'CAPTURE_CHANGED');
    const before = await verifyOriginalSnapshot({ phase: 'BEFORE_SAVE', captureFiles });
    const measured = await measureSnapshot(before, state.objects, targetReferenceAt);
    const sourceIdentity = { schemaVersion: 1, kind: 'RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE',
      admission: 'NO_ADMISSION', targetReferenceAt, source: measured.metadata,
      originalBObjects: state.objects, originalFiles: measured.files };
    const archiveId = sha(Buffer.from(canonical(sourceIdentity)));
    if (archiveId === measured.metadata.originalPointerRow.payload.current.objectSha256) fail('ARCHIVE_ID_COLLISION');
    const catalog = { ...sourceIdentity, archiveId, bObjects: [], files: [] };
    await storage.ensurePrivateBucket({ allowCreate: false });
    let partIndex = 0;
    const objectPathFor = digest => `bundles/sha256/${archiveId}/part-${String(partIndex++).padStart(3, '0')}-${digest}.json.gz.part`;
    for (const row of captureFiles) {
      const bytes = await readBuffer(row.sourcePath, MAX_OBJECT), objectPath = objectPathFor(row.objectSha256);
      await storedExact(storage, objectPath, bytes);
      catalog.bObjects.push({ ...state.objects[row.index], localFile: row.localFile, archivedObjectPath: objectPath });
    }
    for (let fileIndex = 0; fileIndex < measured.files.length; fileIndex += 1) {
      const expected = measured.files[fileIndex], source = before.files.find(row => row.relativePath === expected.relativePath);
      const localFile = `original-file-${String(fileIndex).padStart(3, '0')}.bin`, destination = path.join(state.root, localFile);
      await noLinks(state.root);
      const output = await fs.open(destination, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600);
      retainedHandles.add(output); let first; const chunks = [];
      try {
        const actual = await readMeasured(source.sourcePath, MAX_FILE, async (raw, chunkIndex) => {
          await output.writeFile(raw);
          const compressed = gzipSync(raw, { level: 6 }), compressedSha256 = sha(compressed), objectPath = objectPathFor(compressedSha256);
          const chunkFile = `transport-${String(fileIndex).padStart(3, '0')}-${String(chunkIndex).padStart(3, '0')}.gz`;
          await writeOwned(path.join(state.root, chunkFile), compressed);
          await storedExact(storage, objectPath, compressed);
          chunks.push({ objectPath, bytes: compressed.length, sha256: compressedSha256,
            rawBytes: raw.length, rawSha256: sha(raw), localFile: chunkFile });
        });
        same(actual, { bytes: expected.bytes, sha256: expected.sha256 }, 'SOURCE_FILE_CHANGED');
        await output.sync();
      } catch (error) { first = error; }
      await closeOwned(output, first);
      same(await readMeasured(destination, MAX_FILE), { bytes: expected.bytes, sha256: expected.sha256 }, 'LOCAL_COPY_MISMATCH');
      catalog.files.push({ ...expected, localFile, encoding: 'GZIP_CHUNKS_OF_EXACT_ORIGINAL_BYTES', chunks });
    }
    const catalogBytes = gzipSync(Buffer.from(canonical(catalog)), { level: 9 });
    if (catalogBytes.length > MAX_CATALOG) fail('CATALOG_SIZE_LIMIT');
    const catalogSha256 = sha(catalogBytes), catalogObjectPath = `bundles/sha256/${archiveId}.json.gz`;
    await writeOwned(path.join(state.root, 'catalog.json.gz'), catalogBytes);
    await storedExact(storage, catalogObjectPath, catalogBytes);
    freezeTree(catalog);
    const archivedFiles = catalog.files.map(row => ({ role: row.role, relativePath: row.relativePath,
      sourcePath: path.join(state.root, row.localFile) }));
    const after = await verifyOriginalSnapshot({ phase: 'AFTER_SAVE', captureFiles, archivedFiles, catalog });
    same(await measureSnapshot(after, state.objects, targetReferenceAt), measured, 'ORIGINALS_CHANGED');
    // An archive copy is not proof that the genuine source survived unchanged.
    // Re-read the original paths too, even when the callback uses owned copies.
    for (const expected of measured.files) {
      const source = before.files.find(row => row.relativePath === expected.relativePath);
      same(await readMeasured(source.sourcePath, MAX_FILE),
        { bytes: expected.bytes, sha256: expected.sha256 }, 'SOURCE_FILE_CHANGED');
    }
    same(await readMeasured(path.join(state.root, 'catalog.json.gz'), MAX_CATALOG),
      { bytes: catalogBytes.length, sha256: catalogSha256 }, 'CATALOG_CHANGED');
    for (const row of captureFiles) same(await readMeasured(row.sourcePath, MAX_OBJECT),
      { bytes: row.objectBytes, sha256: row.objectSha256 }, 'CAPTURE_CHANGED');
    state.closed = true; return mint(after, catalog, catalogSha256);
  } catch (error) { state.closed = true; throw error; }
}

// Cross-process use requires the trusted installer-bound catalog SHA and all
// actual local original bytes, plus the genuine historical validator again.
// No WeakMap/status receipt from another process is accepted as admission.
export async function rehydrateLocalWeatherStateEpochArchive({ archiveRoot, archiveId,
  archiveCatalogSha256, targetReferenceAt, verifyOriginalSnapshot } = {}) {
  if (!SHA.test(archiveId ?? '') || !SHA.test(archiveCatalogSha256 ?? '')
    || typeof verifyOriginalSnapshot !== 'function') fail('REHYDRATE_INVALID');
  const root = await privateRoot(archiveRoot), bytes = await readBuffer(path.join(root, 'catalog.json.gz'), MAX_CATALOG);
  if (sha(bytes) !== archiveCatalogSha256) fail('CATALOG_DIGEST_MISMATCH');
  const catalog = JSON.parse(gunzipSync(bytes, { maxOutputLength: MAX_CATALOG }).toString('utf8'));
  if (catalog.schemaVersion !== 1 || catalog.kind !== 'RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE'
    || catalog.admission !== 'NO_ADMISSION' || catalog.archiveId !== archiveId
    || catalog.targetReferenceAt !== time(targetReferenceAt)) fail('CATALOG_INVALID');
  freezeTree(catalog);
  const sourceIdentity = { schemaVersion: catalog.schemaVersion, kind: catalog.kind, admission: catalog.admission,
    targetReferenceAt: catalog.targetReferenceAt, source: catalog.source,
    originalBObjects: catalog.originalBObjects, originalFiles: catalog.originalFiles };
  if (sha(Buffer.from(canonical(sourceIdentity))) !== archiveId) fail('CATALOG_IDENTITY_MISMATCH');
  const objects = objectsChecked(catalog.originalBObjects), captureFiles = [];
  if (!Array.isArray(catalog.bObjects) || catalog.bObjects.length !== objects.length
    || !Array.isArray(catalog.files) || catalog.files.length !== WEATHER_STATE_EPOCH_PUBLIC_FILES.length + 1) fail('CATALOG_INVENTORY_INVALID');
  let partIndex = 0;
  for (let index = 0; index < objects.length; index += 1) {
    const row = catalog.bObjects[index], expected = objects[index], localFile = `original-b-${String(index).padStart(3, '0')}.part`;
    same({ index: row.index, objectPath: row.objectPath, objectBytes: row.objectBytes, objectSha256: row.objectSha256 }, expected, 'CATALOG_OBJECT_MISMATCH');
    if (row.localFile !== localFile || row.archivedObjectPath !== `bundles/sha256/${archiveId}/part-${String(partIndex++).padStart(3, '0')}-${expected.objectSha256}.json.gz.part`) fail('CATALOG_OBJECT_MISMATCH');
    const sourcePath = path.join(root, localFile);
    same(await readMeasured(sourcePath, MAX_OBJECT), { bytes: expected.objectBytes, sha256: expected.objectSha256 }, 'LOCAL_B_CHANGED');
    captureFiles.push({ ...expected, localFile, sourcePath });
  }
  const archivedFiles = [];
  for (let index = 0; index < catalog.files.length; index += 1) {
    const row = catalog.files[index], expected = catalog.originalFiles[index], localFile = `original-file-${String(index).padStart(3, '0')}.bin`;
    same({ role: row.role, relativePath: row.relativePath, bytes: row.bytes, sha256: row.sha256 }, expected, 'CATALOG_FILE_MISMATCH');
    if (row.localFile !== localFile || row.encoding !== 'GZIP_CHUNKS_OF_EXACT_ORIGINAL_BYTES'
      || !Array.isArray(row.chunks) || !row.chunks.length || row.chunks.length > 24) fail('CATALOG_FILE_INVALID');
    const aggregate = crypto.createHash('sha256'); let total = 0;
    for (let chunkIndex = 0; chunkIndex < row.chunks.length; chunkIndex += 1) {
      const chunk = row.chunks[chunkIndex], expectedLocal = `transport-${String(index).padStart(3, '0')}-${String(chunkIndex).padStart(3, '0')}.gz`;
      if (chunk.localFile !== expectedLocal || !SHA.test(chunk.sha256 ?? '')
        || chunk.objectPath !== `bundles/sha256/${archiveId}/part-${String(partIndex++).padStart(3, '0')}-${chunk.sha256}.json.gz.part`
        || !SHA.test(chunk.rawSha256 ?? '') || !Number.isSafeInteger(chunk.rawBytes) || chunk.rawBytes < 1 || chunk.rawBytes > CHUNK) fail('CATALOG_CHUNK_INVALID');
      const compressed = await readBuffer(path.join(root, expectedLocal), MAX_OBJECT);
      if (compressed.length !== chunk.bytes || sha(compressed) !== chunk.sha256) fail('LOCAL_TRANSPORT_CHANGED');
      const raw = gunzipSync(compressed, { maxOutputLength: CHUNK });
      if (raw.length !== chunk.rawBytes || sha(raw) !== chunk.rawSha256) fail('LOCAL_TRANSPORT_CHANGED');
      aggregate.update(raw); total += raw.length;
    }
    if (total !== row.bytes || aggregate.digest('hex') !== row.sha256) fail('LOCAL_TRANSPORT_CHANGED');
    const sourcePath = path.join(root, localFile);
    same(await readMeasured(sourcePath, MAX_FILE), { bytes: row.bytes, sha256: row.sha256 }, 'LOCAL_ORIGINAL_CHANGED');
    archivedFiles.push({ role: row.role, relativePath: row.relativePath, sourcePath });
  }
  const before = await verifyOriginalSnapshot({ phase: 'REHYDRATE_BEFORE', captureFiles, archivedFiles, catalog });
  const measured = await measureSnapshot(before, objects, targetReferenceAt);
  same(measured.metadata, catalog.source, 'REHYDRATE_ORIGINALS_MISMATCH');
  same(measured.files, catalog.originalFiles, 'REHYDRATE_ORIGINALS_MISMATCH');
  const after = await verifyOriginalSnapshot({ phase: 'REHYDRATE_AFTER', captureFiles, archivedFiles, catalog });
  same(await measureSnapshot(after, objects, targetReferenceAt), measured, 'ORIGINALS_CHANGED');
  for (const row of captureFiles) same(await readMeasured(row.sourcePath, MAX_OBJECT),
    { bytes: row.objectBytes, sha256: row.objectSha256 }, 'LOCAL_B_CHANGED');
  same(await readMeasured(path.join(root, 'catalog.json.gz'), MAX_CATALOG),
    { bytes: bytes.length, sha256: archiveCatalogSha256 }, 'CATALOG_CHANGED');
  return mint(after, catalog, archiveCatalogSha256);
}

// One authenticated remote materialization per new job; later planner/updater
// processes use only the closed local files and the installer-bound SHA.
// The deadline is checked around completed operations, never represented as a
// cancellation/closure receipt for an unresolved storage request.
export async function materializeWeatherStateEpochArchive({ storage, archiveRoot, archiveId,
  archiveCatalogSha256, targetReferenceAt, verifyOriginalSnapshot } = {}) {
  storageChecked(storage);
  if (!SHA.test(archiveId ?? '') || !SHA.test(archiveCatalogSha256 ?? '')
    || typeof verifyOriginalSnapshot !== 'function') fail('REHYDRATE_INVALID');
  const deadline = performance.now() + 30 * 60 * 1000;
  const checkDeadline = () => { if (performance.now() >= deadline) fail('MATERIALIZE_DEADLINE'); };
  const root = await privateRoot(archiveRoot, true);
  const catalogObjectPath = `bundles/sha256/${archiveId}.json.gz`;
  checkDeadline(); const bytes = await storage.download(catalogObjectPath); checkDeadline();
  if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > MAX_CATALOG
    || sha(bytes) !== archiveCatalogSha256) fail('CATALOG_DIGEST_MISMATCH');
  const catalog = JSON.parse(gunzipSync(bytes, { maxOutputLength: MAX_CATALOG }).toString('utf8'));
  if (catalog.schemaVersion !== 1 || catalog.kind !== 'RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE'
    || catalog.admission !== 'NO_ADMISSION' || catalog.archiveId !== archiveId
    || catalog.targetReferenceAt !== time(targetReferenceAt)) fail('CATALOG_INVALID');
  const sourceIdentity = { schemaVersion: catalog.schemaVersion, kind: catalog.kind, admission: catalog.admission,
    targetReferenceAt: catalog.targetReferenceAt, source: catalog.source,
    originalBObjects: catalog.originalBObjects, originalFiles: catalog.originalFiles };
  if (sha(Buffer.from(canonical(sourceIdentity))) !== archiveId) fail('CATALOG_IDENTITY_MISMATCH');
  const objects = objectsChecked(catalog.originalBObjects), selected = [];
  if (!Array.isArray(catalog.bObjects) || catalog.bObjects.length !== objects.length
    || !Array.isArray(catalog.files) || catalog.files.length !== WEATHER_STATE_EPOCH_PUBLIC_FILES.length + 1) fail('CATALOG_INVENTORY_INVALID');
  let partIndex = 0, totalBytes = bytes.length, totalRaw = 0;
  const select = (objectPath, localFile, objectBytes, objectSha256) => {
    if (!Number.isSafeInteger(objectBytes) || objectBytes < 1 || objectBytes > MAX_OBJECT
      || !SHA.test(objectSha256 ?? '') || selected.length >= 128
      || objectPath !== `bundles/sha256/${archiveId}/part-${String(partIndex++).padStart(3, '0')}-${objectSha256}.json.gz.part`) fail('CATALOG_OBJECT_MISMATCH');
    totalBytes += objectBytes; if (totalBytes > 2_000_000_000) fail('TOTAL_SIZE_LIMIT');
    selected.push({ objectPath, localFile, bytes: objectBytes, sha256: objectSha256 });
  };
  for (let index = 0; index < objects.length; index += 1) {
    const row = catalog.bObjects[index], original = objects[index], localFile = `original-b-${String(index).padStart(3, '0')}.part`;
    same({ index: row.index, objectPath: row.objectPath, objectBytes: row.objectBytes, objectSha256: row.objectSha256 }, original, 'CATALOG_OBJECT_MISMATCH');
    if (row.localFile !== localFile) fail('CATALOG_OBJECT_MISMATCH');
    select(row.archivedObjectPath, localFile, original.objectBytes, original.objectSha256);
  }
  for (let index = 0; index < catalog.files.length; index += 1) {
    const row = catalog.files[index], expected = catalog.originalFiles[index];
    same({ role: row.role, relativePath: row.relativePath, bytes: row.bytes, sha256: row.sha256 }, expected, 'CATALOG_FILE_MISMATCH');
    if (row.localFile !== `original-file-${String(index).padStart(3, '0')}.bin`
      || row.encoding !== 'GZIP_CHUNKS_OF_EXACT_ORIGINAL_BYTES' || !Number.isSafeInteger(row.bytes)
      || row.bytes < 1 || row.bytes > MAX_FILE || !Array.isArray(row.chunks)
      || row.chunks.length < 1 || row.chunks.length > 24) fail('CATALOG_FILE_INVALID');
    totalRaw += row.bytes; if (totalRaw > MAX_TOTAL) fail('TOTAL_SIZE_LIMIT');
    let rawBytes = 0;
    for (let chunkIndex = 0; chunkIndex < row.chunks.length; chunkIndex += 1) {
      const chunk = row.chunks[chunkIndex], localFile = `transport-${String(index).padStart(3, '0')}-${String(chunkIndex).padStart(3, '0')}.gz`;
      if (chunk.localFile !== localFile || !SHA.test(chunk.rawSha256 ?? '')
        || !Number.isSafeInteger(chunk.rawBytes) || chunk.rawBytes < 1 || chunk.rawBytes > CHUNK) fail('CATALOG_CHUNK_INVALID');
      rawBytes += chunk.rawBytes; select(chunk.objectPath, localFile, chunk.bytes, chunk.sha256);
    }
    if (rawBytes !== row.bytes) fail('CATALOG_CHUNK_INVALID');
  }
  if (![400, 401, 403, 404].includes(await storage.anonymousStatus(catalogObjectPath))) fail('ANONYMOUS_ACCESS');
  await writeOwned(path.join(root, 'catalog.json.gz'), bytes);
  for (const object of selected) {
    checkDeadline(); const body = await storage.download(object.objectPath); checkDeadline();
    if (!Buffer.isBuffer(body) || body.length !== object.bytes || sha(body) !== object.sha256) fail('STORAGE_READBACK_MISMATCH');
    if (![400, 401, 403, 404].includes(await storage.anonymousStatus(object.objectPath))) fail('ANONYMOUS_ACCESS');
    await writeOwned(path.join(root, object.localFile), body);
  }
  for (const row of catalog.files) {
    checkDeadline(); await noLinks(root);
    const handle = await fs.open(path.join(root, row.localFile), constants.O_WRONLY | constants.O_CREAT
      | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600);
    retainedHandles.add(handle); let first;
    try {
      const aggregate = crypto.createHash('sha256'); let rawBytes = 0;
      for (const chunk of row.chunks) {
        checkDeadline(); const compressed = await readBuffer(path.join(root, chunk.localFile), MAX_OBJECT);
        if (compressed.length !== chunk.bytes || sha(compressed) !== chunk.sha256) fail('LOCAL_TRANSPORT_CHANGED');
        const raw = gunzipSync(compressed, { maxOutputLength: CHUNK });
        if (raw.length !== chunk.rawBytes || sha(raw) !== chunk.rawSha256) fail('LOCAL_TRANSPORT_CHANGED');
        aggregate.update(raw); rawBytes += raw.length; await handle.writeFile(raw);
      }
      if (rawBytes !== row.bytes || aggregate.digest('hex') !== row.sha256) fail('LOCAL_TRANSPORT_CHANGED');
      await handle.sync();
    } catch (error) { first = error; }
    await closeOwned(handle, first);
  }
  checkDeadline();
  const handle = await rehydrateLocalWeatherStateEpochArchive({ archiveRoot: root, archiveId,
    archiveCatalogSha256, targetReferenceAt, verifyOriginalSnapshot });
  checkDeadline(); return handle;
}
