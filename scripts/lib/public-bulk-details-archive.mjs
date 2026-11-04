import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGzip, createInflateRaw, crc32 } from 'node:zlib';

const logicalMaximum = 512 * 1024 * 1024;
const storedMaximum = 32 * 1024 * 1024;
const hash = /^[a-f0-9]{64}$/;
const archivePath = sha256 => './public-condition-details-' + sha256 + '.json.gz';

function requireValue(value, failure) {
  if (!value) throw new Error('PUBLIC_BULK_' + failure);
}

function logicalIdentity(manifest) {
  const { publicConditionDetailsSha256: sha256, publicConditionDetailsBytes: bytes } = manifest;
  requireValue(Number.isSafeInteger(bytes) && bytes >= 2 && bytes <= logicalMaximum && hash.test(sha256), 'LOGICAL_IDENTITY');
  return { bytes, sha256 };
}

export function publicBulkArchiveEntry(manifest) {
  const descriptor = manifest.publicConditionDetailsArchive;
  if (descriptor === undefined) return null;
  const fields = ['kind', 'path', 'bytes', 'sha256'];
  requireValue(manifest.detailDelivery?.schemaVersion === 1
    && descriptor !== null && typeof descriptor === 'object'
    && Object.keys(descriptor).length === fields.length && fields.every(key => Object.hasOwn(descriptor, key))
    && descriptor.kind === 'gzip-single-v1' && hash.test(descriptor.sha256)
    && descriptor.path === archivePath(descriptor.sha256)
    && Number.isSafeInteger(descriptor.bytes) && descriptor.bytes >= 18 && descriptor.bytes <= storedMaximum,
  'ARCHIVE_DESCRIPTOR');
  logicalIdentity(manifest);
  return descriptor;
}

function measureOutput({ maximum, exact = null, withCrc = false }) {
  const digest = createHash('sha256');
  let bytes = 0;
  let crc = 0;
  let sha256 = null;
  const stream = new Transform({
    transform(chunk, _encoding, done) {
      bytes += chunk.length;
      if (bytes > maximum) return done(new Error('PUBLIC_BULK_SIZE_BOUND'));
      digest.update(chunk);
      if (withCrc) crc = crc32(chunk, crc);
      done(null, chunk);
    },
    flush(done) {
      sha256 = digest.digest('hex');
      if (exact && (bytes !== exact.bytes || sha256 !== exact.sha256)) return done(new Error('PUBLIC_BULK_LOGICAL_DIGEST'));
      done();
    },
  });
  return { stream, result: () => ({ bytes, sha256, crc }) };
}

function discard() {
  return new Writable({ write(_chunk, _encoding, done) { done(); } });
}

// Both physical and logical identities are authenticated. The producer emits
// only the basic fixed gzip header; the native raw inflater must consume every
// deflate byte before the one exact CRC/ISIZE footer.
export async function verifyPublicBulkArchive({ manifest, archiveBytes, destination = discard(), signal }) {
  const entry = publicBulkArchiveEntry(manifest);
  requireValue(entry && Buffer.isBuffer(archiveBytes) && archiveBytes.length === entry.bytes, 'ARCHIVE_SIZE');
  requireValue(createHash('sha256').update(archiveBytes).digest('hex') === entry.sha256, 'ARCHIVE_DIGEST');
  const logical = logicalIdentity(manifest);
  const footer = archiveBytes.length - 8;
  requireValue(archiveBytes[0] === 31 && archiveBytes[1] === 139 && archiveBytes[2] === 8
    && archiveBytes[3] === 0 && footer > 10 && archiveBytes.readUInt32LE(footer + 4) === logical.bytes,
  'GZIP_HEADER_OR_ISIZE');
  const deflate = archiveBytes.subarray(10, footer);
  const inflate = createInflateRaw();
  const decoded = measureOutput({ maximum: logical.bytes, exact: logical, withCrc: true });
  await pipeline(Readable.from([deflate]), inflate, decoded.stream, destination, { signal });
  requireValue(inflate.bytesWritten === deflate.length && decoded.result().crc === archiveBytes.readUInt32LE(footer),
    'GZIP_MEMBER_OR_CRC');
  return { archiveBytes: entry.bytes, archiveSha256: entry.sha256, logicalBytes: logical.bytes, logicalSha256: logical.sha256 };
}

// The raw original is the existing public artifact on an exclusively owned
// build runner. This adds an immutable derivative and returns the descriptor;
// the caller may extend its manifest only after the enclosing release checks.
export async function writePublicBulkArchive({ liveDirectory, manifest }) {
  requireValue(manifest.publicConditionDetailsArchive === undefined && manifest.detailDelivery?.schemaVersion === 1, 'SOURCE_MODE');
  const logical = logicalIdentity(manifest);
  const rawPath = path.join(liveDirectory, 'public-condition-details.json');
  const stat = await fs.lstat(rawPath);
  requireValue(stat.isFile() && !stat.isSymbolicLink() && stat.size === logical.bytes, 'SOURCE_FILE');
  const temporary = path.join(liveDirectory, '.bulk-details-' + randomUUID() + '.stage');
  const input = measureOutput({ maximum: logical.bytes, exact: logical });
  const stored = measureOutput({ maximum: storedMaximum });
  const handle = await fs.open(temporary, 'wx');
  try {
    await handle.close();
    await pipeline(createReadStream(rawPath), input.stream, createGzip({ level: 6 }), stored.stream,
      createWriteStream(temporary, { flags: 'r+' }));
    const { bytes, sha256 } = stored.result();
    const completed = await fs.open(temporary, 'r+');
    try { await completed.sync(); } finally { await completed.close(); }
    const descriptor = { kind: 'gzip-single-v1', path: archivePath(sha256), bytes, sha256 };
    publicBulkArchiveEntry({ ...manifest, publicConditionDetailsArchive: descriptor });
    const target = path.join(liveDirectory, descriptor.path.slice(2));
    try {
      await fs.link(temporary, target);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const existing = await fs.lstat(target);
      requireValue(existing.isFile() && !existing.isSymbolicLink() && existing.size === bytes
        && createHash('sha256').update(await fs.readFile(target)).digest('hex') === sha256, 'IMMUTABLE_TARGET_CONFLICT');
    }
    return descriptor;
  } finally {
    await fs.unlink(temporary);
  }
}

// An authenticated compressed public file materializes into the normal raw
// snapshot filename. No partially decoded bytes become the snapshot file.
export async function restorePublicBulkArchiveFile({ manifest, archiveBytes, rawDestination, signal }) {
  requireValue(path.basename(rawDestination) === 'public-condition-details.json', 'RESTORE_DESTINATION');
  signal?.throwIfAborted();
  try {
    await fs.lstat(rawDestination);
    throw new Error('PUBLIC_BULK_RESTORE_DESTINATION_EXISTS');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const temporary = path.join(path.dirname(rawDestination), '.bulk-restore-' + randomUUID() + '.stage');
  const owner = await fs.open(temporary, 'wx');
  try {
    await owner.close();
    const receipt = await verifyPublicBulkArchive({
      manifest, archiveBytes, signal, destination: createWriteStream(temporary, { flags: 'r+' }),
    });
    const completed = await fs.open(temporary, 'r+');
    try { await completed.sync(); } finally { await completed.close(); }
    signal?.throwIfAborted();
    await fs.link(temporary, rawDestination);
    return receipt;
  } finally {
    await fs.unlink(temporary);
  }
}


export async function readVerifiedPublicBulkArchive({ manifest, archiveBytes }) {
  const logical = logicalIdentity(manifest);
  const bytes = Buffer.allocUnsafe(logical.bytes);
  let offset = 0;
  const destination = new Writable({
    write(chunk, _encoding, done) {
      bytes.set(chunk, offset);
      offset += chunk.length;
      done();
    },
  });
  await verifyPublicBulkArchive({ manifest, archiveBytes, destination });
  return bytes;
}

export async function appendPublicBulkArchive({ manifestPath, manifest }) {
  requireValue(manifest.detailDelivery?.mapHoursLandingSchema === 1, 'REQUIRES_COMPACT_DISPLAY');
  const expected = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  const stat = await fs.lstat(manifestPath);
  requireValue(stat.isFile() && !stat.isSymbolicLink() && stat.size === expected.length
    && (await fs.readFile(manifestPath)).equals(expected), 'MANIFEST_SOURCE');
  const descriptor = await writePublicBulkArchive({ liveDirectory: path.dirname(manifestPath), manifest });
  const next = Buffer.from(JSON.stringify({ ...manifest, publicConditionDetailsArchive: descriptor }, null, 2) + '\n');
  const staged = manifestPath + '.bulk-archive-' + randomUUID();
  await fs.writeFile(staged, next, { flag: 'wx' });
  requireValue((await fs.readFile(manifestPath)).equals(expected), 'MANIFEST_CHANGED');
  await fs.rename(staged, manifestPath);
  manifest.publicConditionDetailsArchive = descriptor;
}

function inside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

export async function replaceStagedBulkWithArchive({ source, target, manifest }) {
  const archive = publicBulkArchiveEntry(manifest);
  requireValue(archive && manifest.detailDelivery?.mapHoursLandingSchema === 1, 'COPY_MODE');
  const [input, output] = await Promise.all([fs.realpath(source), fs.realpath(target)]);
  requireValue(input !== output && !inside(input, output) && !inside(output, input), 'COPY_ROOTS');
  const stagedRaw = path.join(output, 'public-condition-details.json');
  const sourceArchive = path.join(input, archive.path.slice(2));
  const outputArchive = path.join(output, archive.path.slice(2));
  const archiveStat = await fs.lstat(sourceArchive);
  requireValue(archiveStat.isFile() && !archiveStat.isSymbolicLink() && archiveStat.size === archive.bytes, 'COPY_ARCHIVE_SIZE');
  const archiveBytes = await fs.readFile(sourceArchive);
  await verifyPublicBulkArchive({ manifest, archiveBytes });

  // The raw file is the existing workflow's own staging copy. Prove both
  // the authoritative source and exact copy before removing the redundant copy.
  const logical = logicalIdentity(manifest);
  const raw = path.join(input, 'public-condition-details.json');
  const originals = [];
  for (const filename of [raw, stagedRaw]) {
    const stat = await fs.lstat(filename);
    requireValue(stat.isFile() && !stat.isSymbolicLink() && stat.size === logical.bytes, 'COPY_RAW_SIZE');
    const evidence = measureOutput({ maximum: logical.bytes, exact: logical });
    await pipeline(createReadStream(filename), evidence.stream, discard());
    originals.push(stat);
  }
  await fs.writeFile(outputArchive, archiveBytes, { flag: 'wx' });
  const outputStat = await fs.lstat(outputArchive);
  requireValue(outputStat.isFile() && !outputStat.isSymbolicLink() && outputStat.size === archive.bytes
    && createHash('sha256').update(await fs.readFile(outputArchive)).digest('hex') === archive.sha256, 'COPY_ARCHIVE_READBACK');
  const current = await fs.lstat(stagedRaw);
  const before = originals[1];
  requireValue(current.isFile() && !current.isSymbolicLink() && current.dev === before.dev && current.ino === before.ino
    && current.size === before.size && current.mtimeMs === before.mtimeMs && current.ctimeMs === before.ctimeMs, 'COPY_RAW_CHANGED');
  await fs.unlink(stagedRaw);
  return archive;
}

// Storage representation is optional. The original logical byte count and
// digest remain in the manifest and are byte-verified before semantic reuse.
export function publicManifestWithoutBulkArchive(manifest) {
  publicBulkArchiveEntry(manifest);
  const { publicConditionDetailsArchive: _archive, ...logicalManifest } = manifest;
  return logicalManifest;
}
