import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { gzip, gunzip } from 'node:zlib';
import { RAVSCORE_PUBLIC_FORECAST_HOURS } from '../../js/core/ravscore-model-contract.js';
import { PUBLIC_DELIVERY_MAX_BYTES } from '../../js/core/public-delivery-contract.js';
import { PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE } from './private-weather-component-inventory.mjs';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const MAGIC = Buffer.from('RR-PUBLIC-HOUR-DELIVERY-PACK-1\n');
const SHA256 = /^[a-f0-9]{64}$/;
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_PACK_BYTES = 256 * 1024 * 1024;
// The public delivery contract allows each hour shard up to 16 MiB.  The
// private continuation pack must accept the same valid source files; the old
// 8 MiB limit rejected a public shard after the public writer accepted it.
// The aggregate pack bound remains the tighter safety limit for the archive.
const MAX_RAW_ENTRY_BYTES = PUBLIC_DELIVERY_MAX_BYTES;
const MAX_COMPRESSED_ENTRY_BYTES = PUBLIC_DELIVERY_MAX_BYTES;

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) {
    throw new Error(`${label} is invalid`);
  }
}

function canonicalHour(value, label = 'Public hour delivery time') {
  const parsed = Date.parse(value ?? '');
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value
    || new Date(parsed).getUTCMinutes() !== 0 || new Date(parsed).getUTCSeconds() !== 0
    || new Date(parsed).getUTCMilliseconds() !== 0) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

async function digestFile(file) {
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(file)) {
    bytes += chunk.length;
    if (bytes > MAX_PACK_BYTES) throw new Error('PUBLIC_HOUR_PACK_SIZE_LIMIT');
    hash.update(chunk);
  }
  return { bytes, sha256: hash.digest('hex') };
}

function validateMarker(marker) {
  exactKeys(marker, ['schemaVersion', 'kind', 'privacyClass', 'datasetId',
    'productionReferenceAt', 'sourceDetailsSha256', 'modelBinding', 'forecastHours',
    'startupNationalForecast', 'startupNationalForecastSha256', 'rawBytes',
    'packBytes', 'packSha256'], 'Private public-hour marker');
  if (marker.schemaVersion !== 1
    || marker.kind !== 'PRIVATE_PUBLIC_HOUR_DELIVERY_PACK'
    || marker.privacyClass !== 'PRIVATE_PRODUCTION_RUNTIME'
    || typeof marker.datasetId !== 'string' || !marker.datasetId
    || typeof marker.productionReferenceAt !== 'string'
    || !SHA256.test(marker.sourceDetailsSha256)
    || !marker.modelBinding || typeof marker.modelBinding !== 'object'
    || !SHA256.test(marker.startupNationalForecastSha256)
    || marker.forecastHours !== RAVSCORE_PUBLIC_FORECAST_HOURS
    || !Number.isSafeInteger(marker.rawBytes) || marker.rawBytes < 1
    || !Number.isSafeInteger(marker.packBytes) || marker.packBytes < 1
    || marker.packBytes > MAX_PACK_BYTES || !SHA256.test(marker.packSha256)) {
    throw new Error('Private public-hour marker is invalid');
  }
  canonicalHour(marker.productionReferenceAt, 'Private public-hour production reference');
  validateStartupNationalForecast(marker.startupNationalForecast, marker.modelBinding,
    marker.startupNationalForecastSha256);
  return marker;
}

export function privatePublicHourDeliveryMarker(conditions) {
  if (!Object.hasOwn(conditions ?? {}, 'publicHourDelivery')) return null;
  return structuredClone(validateMarker(conditions.publicHourDelivery));
}

function validatePackManifest(manifest, marker = null) {
  exactKeys(manifest, ['schemaVersion', 'kind', 'datasetId', 'productionReferenceAt',
    'sourceDetailsSha256', 'modelBinding', 'forecastHours',
    'startupNationalForecastSha256', 'rawBytes', 'entries'],
  'Private public-hour pack manifest');
  if (manifest.schemaVersion !== 1 || manifest.kind !== 'PRIVATE_PUBLIC_HOUR_DELIVERY_PACK'
    || typeof manifest.datasetId !== 'string' || !manifest.datasetId
    || !SHA256.test(manifest.sourceDetailsSha256)
    || !manifest.modelBinding || typeof manifest.modelBinding !== 'object'
    || !SHA256.test(manifest.startupNationalForecastSha256)
    || manifest.forecastHours !== RAVSCORE_PUBLIC_FORECAST_HOURS
    || !Number.isSafeInteger(manifest.rawBytes) || manifest.rawBytes < 1
    || !Array.isArray(manifest.entries)
    || manifest.entries.length !== RAVSCORE_PUBLIC_FORECAST_HOURS) {
    throw new Error('Private public-hour pack manifest is invalid');
  }
  canonicalHour(manifest.productionReferenceAt, 'Private public-hour pack production reference');
  const seenTimes = new Set();
  const seenFiles = new Set();
  let rawBytes = 0;
  let compressedBytes = 0;
  for (const entry of manifest.entries) {
    exactKeys(entry, ['time', 'file', 'bytes', 'sha256', 'compressedBytes', 'compressedSha256'],
      'Private public-hour pack entry');
    canonicalHour(entry.time);
    if (seenTimes.has(entry.time) || seenFiles.has(entry.file)
      || entry.file !== `${entry.sha256}.json` || !SHA256.test(entry.sha256)
      || !SHA256.test(entry.compressedSha256)
      || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || entry.bytes > MAX_RAW_ENTRY_BYTES
      || !Number.isSafeInteger(entry.compressedBytes) || entry.compressedBytes < 2
      || entry.compressedBytes > MAX_COMPRESSED_ENTRY_BYTES) {
      throw new Error('Private public-hour pack entry is invalid');
    }
    seenTimes.add(entry.time);
    seenFiles.add(entry.file);
    rawBytes += entry.bytes;
    compressedBytes += entry.compressedBytes;
  }
  if (rawBytes !== manifest.rawBytes) throw new Error('Private public-hour pack raw size is invalid');
  if (marker && (manifest.datasetId !== marker.datasetId
    || manifest.productionReferenceAt !== marker.productionReferenceAt
    || manifest.sourceDetailsSha256 !== marker.sourceDetailsSha256
    || canonical(manifest.modelBinding) !== canonical(marker.modelBinding)
    || manifest.startupNationalForecastSha256 !== marker.startupNationalForecastSha256
    || manifest.forecastHours !== marker.forecastHours
    || manifest.rawBytes !== marker.rawBytes)) {
    throw new Error('Private public-hour pack does not match conditions');
  }
  return compressedBytes;
}

function validateStartupNationalForecast(value, modelBinding, expectedSha256 = null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || value.schemaVersion !== 2 || !Array.isArray(value.dates)
    || !value.modes || typeof value.modes !== 'object' || Array.isArray(value.modes)
    || canonical(value.modelBinding) !== canonical(modelBinding)) {
    throw new Error('Private public-hour startup national forecast is invalid');
  }
  const digest = sha256(canonical(value));
  if (expectedSha256 && digest !== expectedSha256) {
    throw new Error('Private public-hour startup national forecast digest is invalid');
  }
  return digest;
}

async function readPackHeader(packPath, marker = null) {
  const stat = await fs.lstat(packPath).catch(() => null);
  if (!stat?.isFile() || stat.isSymbolicLink() || stat.size < MAGIC.length + 6
    || stat.size > MAX_PACK_BYTES) throw new Error('PUBLIC_HOUR_PACK_FILE_INVALID');
  const handle = await fs.open(packPath, 'r');
  try {
    let position = 0;
    const read = async bytes => {
      const buffer = Buffer.alloc(bytes);
      let offset = 0;
      while (offset < bytes) {
        const result = await handle.read(buffer, offset, bytes - offset, position);
        if (!result.bytesRead) throw new Error('PUBLIC_HOUR_PACK_TRUNCATED');
        position += result.bytesRead;
        offset += result.bytesRead;
      }
      return buffer;
    };
    if (!(await read(MAGIC.length)).equals(MAGIC)) throw new Error('PUBLIC_HOUR_PACK_FORMAT_INVALID');
    const manifestBytes = (await read(4)).readUInt32BE();
    if (manifestBytes < 2 || manifestBytes > MAX_MANIFEST_BYTES) {
      throw new Error('PUBLIC_HOUR_PACK_MANIFEST_SIZE_INVALID');
    }
    let manifest;
    try { manifest = JSON.parse((await read(manifestBytes)).toString('utf8')); }
    catch { throw new Error('PUBLIC_HOUR_PACK_MANIFEST_INVALID'); }
    const payloadBytes = validatePackManifest(manifest, marker);
    if (position + payloadBytes !== stat.size) throw new Error('PUBLIC_HOUR_PACK_SIZE_INVALID');
    return { manifest, payloadOffset: position, bytes: stat.size };
  } finally {
    await handle.close();
  }
}

export async function inspectPrivatePublicHourDeliveryPack({ packPath, conditions } = {}) {
  const marker = privatePublicHourDeliveryMarker(conditions);
  if (!marker) throw new Error('Private conditions lack the public-hour pack marker');
  const header = await readPackHeader(packPath, marker);
  const digest = await digestFile(packPath);
  if (digest.bytes !== marker.packBytes || digest.sha256 !== marker.packSha256) {
    throw new Error('Private public-hour pack digest does not match conditions');
  }
  return { ...header, marker };
}

function validatePublicHourDocument(document, time, publicManifest) {
  if (!document || document.delivery?.schemaVersion !== 1
    || document.delivery.kind !== 'hour' || document.delivery.key !== time
    || document.delivery.sourceDetailsSha256 !== publicManifest.publicConditionDetailsSha256
    || canonical(document.delivery.modelBinding) !== canonical(publicManifest.ravScoreModelBinding)) {
    throw new Error('Public hour delivery document does not match its manifest');
  }
}

export async function buildPrivatePublicHourDeliveryPack({
  liveDirectory,
  publicManifest,
  startupNationalForecast,
  outputPath = PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.relativePath,
} = {}) {
  const hours = publicManifest?.detailDelivery?.hours;
  const times = hours && typeof hours === 'object' ? Object.keys(hours).sort() : [];
  if (publicManifest?.detailDelivery?.schemaVersion !== 1
    || publicManifest.detailDelivery.sourceDetailsSha256 !== publicManifest.publicConditionDetailsSha256
    || times.length !== RAVSCORE_PUBLIC_FORECAST_HOURS) {
    throw new Error('Public manifest lacks the complete hour delivery inventory');
  }
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-public-hour-pack-'));
  const entries = [];
  let rawBytes = 0;
  try {
    const retainedStartupNationalForecast = structuredClone(startupNationalForecast);
    const startupNationalForecastSha256 = validateStartupNationalForecast(
      retainedStartupNationalForecast,
      publicManifest.ravScoreModelBinding,
    );
    for (let index = 0; index < times.length; index += 1) {
      const time = canonicalHour(times[index]);
      const descriptor = hours[time];
      if (!descriptor || descriptor.path !== `./forecast/${descriptor.sha256}.json`
        || !SHA256.test(descriptor.sha256) || !Number.isSafeInteger(descriptor.bytes)
        || descriptor.bytes < 1 || descriptor.bytes > MAX_RAW_ENTRY_BYTES) {
        throw new Error('Public hour delivery descriptor is invalid');
      }
      const sourcePath = path.resolve(liveDirectory, descriptor.path.replace(/^\.\//, ''));
      const forecastRoot = path.resolve(liveDirectory, 'forecast');
      if (path.dirname(sourcePath) !== forecastRoot) throw new Error('Public hour delivery path escapes forecast root');
      const sourceStat = await fs.lstat(sourcePath);
      if (!sourceStat.isFile() || sourceStat.isSymbolicLink() || sourceStat.size !== descriptor.bytes) {
        throw new Error('Public hour delivery source file is invalid');
      }
      const raw = await fs.readFile(sourcePath);
      if (sha256(raw) !== descriptor.sha256) throw new Error('Public hour delivery source digest mismatch');
      let document;
      try { document = JSON.parse(raw.toString('utf8')); }
      catch { throw new Error('Public hour delivery source is not JSON'); }
      validatePublicHourDocument(document, time, publicManifest);
      const compressed = await gzipAsync(raw, { level: 9 });
      if (compressed.length > MAX_COMPRESSED_ENTRY_BYTES) throw new Error('PUBLIC_HOUR_PACK_ENTRY_SIZE_LIMIT');
      const compressedFile = path.join(temporaryRoot, `${String(index).padStart(3, '0')}.gz`);
      await fs.writeFile(compressedFile, compressed);
      entries.push({ time, file: `${descriptor.sha256}.json`, bytes: raw.length,
        sha256: descriptor.sha256, compressedBytes: compressed.length,
        compressedSha256: sha256(compressed), compressedFile });
      rawBytes += raw.length;
    }
    const manifest = {
      schemaVersion: 1,
      kind: 'PRIVATE_PUBLIC_HOUR_DELIVERY_PACK',
      datasetId: publicManifest.datasetId,
      productionReferenceAt: canonicalHour(publicManifest.productionReferenceAt,
        'Public hour pack production reference'),
      sourceDetailsSha256: publicManifest.publicConditionDetailsSha256,
      modelBinding: publicManifest.ravScoreModelBinding,
      forecastHours: RAVSCORE_PUBLIC_FORECAST_HOURS,
      startupNationalForecastSha256,
      rawBytes,
      entries: entries.map(({ compressedFile: _compressedFile, ...entry }) => entry),
    };
    validatePackManifest(manifest);
    const manifestBuffer = Buffer.from(JSON.stringify(manifest));
    if (manifestBuffer.length > MAX_MANIFEST_BYTES) throw new Error('PUBLIC_HOUR_PACK_MANIFEST_SIZE_LIMIT');
    const destination = path.resolve(outputPath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.tmp-${process.pid}-${crypto.randomUUID()}`;
    const handle = await fs.open(temporary, 'wx', 0o600);
    try {
      const length = Buffer.alloc(4);
      length.writeUInt32BE(manifestBuffer.length);
      await handle.writeFile(Buffer.concat([MAGIC, length, manifestBuffer]));
      for (const entry of entries) await handle.writeFile(await fs.readFile(entry.compressedFile));
      await handle.sync();
      await handle.close();
      const stat = await fs.stat(temporary);
      if (stat.size > MAX_PACK_BYTES) throw new Error('PUBLIC_HOUR_PACK_SIZE_LIMIT');
      await fs.rename(temporary, destination);
    } catch (error) {
      await handle.close().catch(() => {});
      await fs.unlink(temporary).catch(() => {});
      throw error;
    }
    const digest = await digestFile(destination);
    return {
      descriptor: { ...PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE, sourcePath: destination },
      marker: {
        schemaVersion: 1,
        kind: 'PRIVATE_PUBLIC_HOUR_DELIVERY_PACK',
        privacyClass: 'PRIVATE_PRODUCTION_RUNTIME',
        datasetId: manifest.datasetId,
        productionReferenceAt: manifest.productionReferenceAt,
        sourceDetailsSha256: manifest.sourceDetailsSha256,
        modelBinding: manifest.modelBinding,
        forecastHours: manifest.forecastHours,
        startupNationalForecast: retainedStartupNationalForecast,
        startupNationalForecastSha256: manifest.startupNationalForecastSha256,
        rawBytes: manifest.rawBytes,
        packBytes: digest.bytes,
        packSha256: digest.sha256,
      },
    };
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

export async function materializePrivatePublicHourDeliveryPack({
  packPath,
  conditions,
  liveDirectory,
} = {}) {
  const { manifest, payloadOffset } = await inspectPrivatePublicHourDeliveryPack({ packPath, conditions });
  const handle = await fs.open(packPath, 'r');
  const hours = {};
  let position = payloadOffset;
  try {
    await fs.mkdir(path.join(liveDirectory, 'forecast'), { recursive: true });
    for (const entry of manifest.entries) {
      const compressed = Buffer.alloc(entry.compressedBytes);
      let offset = 0;
      while (offset < compressed.length) {
        const result = await handle.read(compressed, offset, compressed.length - offset, position);
        if (!result.bytesRead) throw new Error('PUBLIC_HOUR_PACK_TRUNCATED');
        offset += result.bytesRead;
        position += result.bytesRead;
      }
      if (sha256(compressed) !== entry.compressedSha256) {
        throw new Error('PUBLIC_HOUR_PACK_COMPRESSED_DIGEST_MISMATCH');
      }
      const raw = await gunzipAsync(compressed, { maxOutputLength: MAX_RAW_ENTRY_BYTES });
      if (raw.length !== entry.bytes || sha256(raw) !== entry.sha256) {
        throw new Error('PUBLIC_HOUR_PACK_ENTRY_DIGEST_MISMATCH');
      }
      let document;
      try { document = JSON.parse(raw.toString('utf8')); }
      catch { throw new Error('PUBLIC_HOUR_PACK_ENTRY_JSON_INVALID'); }
      validatePublicHourDocument(document, entry.time, {
        publicConditionDetailsSha256: manifest.sourceDetailsSha256,
        ravScoreModelBinding: manifest.modelBinding,
      });
      const destination = path.join(liveDirectory, 'forecast', entry.file);
      const temporary = `${destination}.tmp-${process.pid}-${crypto.randomUUID()}`;
      await fs.writeFile(temporary, raw, { flag: 'wx' });
      await fs.rename(temporary, destination);
      hours[entry.time] = {
        path: `./forecast/${entry.file}`,
        sha256: entry.sha256,
        bytes: entry.bytes,
      };
    }
  } finally {
    await handle.close();
  }
  return { manifest, hours };
}

export function compactPrivateConditionsForPersistence(full, publicHourDelivery) {
  validateMarker(publicHourDelivery);
  const parts = Object.fromEntries(Object.entries(full?.coastalParts?.parts ?? {}).map(([partId, part]) => {
    const { hourly: _hourly, ...retained } = part;
    return [partId, retained];
  }));
  if (Object.keys(parts).length !== full?.coastalParts?.expectedPartCount) {
    throw new Error('Compact private conditions do not cover every coastal part');
  }
  return {
    ...full,
    coastalParts: { ...full.coastalParts, parts },
    publicHourDelivery: structuredClone(publicHourDelivery),
  };
}

export async function installPrivateConditionsAndHourPack({
  stagedConditionsPath,
  conditionsPath,
  stagedPackPath,
  packPath,
  renameImpl = fs.rename,
  removeImpl = fs.rm,
} = {}) {
  const transactionId = `${process.pid}-${crypto.randomUUID()}`;
  const rows = [
    { staged: path.resolve(stagedPackPath), destination: path.resolve(packPath) },
    { staged: path.resolve(stagedConditionsPath), destination: path.resolve(conditionsPath) },
  ].map(row => ({ ...row, previous: `${row.destination}.previous-${transactionId}`,
    previousMoved: false, installed: false }));
  for (const row of rows) {
    const staged = await fs.lstat(row.staged).catch(() => null);
    if (!staged?.isFile() || staged.isSymbolicLink()
      || path.dirname(row.staged) !== path.dirname(row.destination)
      || row.staged === row.destination) {
      throw new Error('Private conditions transaction stage is invalid');
    }
  }
  let mutationStarted = false;
  try {
    for (const row of rows) {
      const current = await fs.lstat(row.destination).catch(error => {
        if (error?.code === 'ENOENT') return null;
        throw error;
      });
      if (current && (!current.isFile() || current.isSymbolicLink())) {
        throw new Error('Private conditions transaction destination is invalid');
      }
      if (current) {
        await renameImpl(row.destination, row.previous);
        row.previousMoved = true;
      }
    }
    mutationStarted = true;
    for (const row of rows) {
      await renameImpl(row.staged, row.destination);
      row.installed = true;
    }
    await Promise.all(rows.map(row => removeImpl(row.previous, { force: true }).catch(() => {})));
    return { installed: true, fileCount: rows.length };
  } catch (error) {
    let rollbackError = null;
    if (mutationStarted || rows.some(row => row.previousMoved)) {
      for (const row of [...rows].reverse()) {
        try {
          if (row.installed) await removeImpl(row.destination, { force: true });
          if (row.previousMoved) await renameImpl(row.previous, row.destination);
        } catch (failure) {
          rollbackError ??= failure;
        }
      }
    }
    await Promise.all(rows.flatMap(row => [row.staged, row.previous]
      .map(file => removeImpl(file, { force: true }).catch(() => {}))));
    if (rollbackError) {
      const wrapped = new Error('Private conditions transaction failed and rollback was incomplete');
      wrapped.cause = error;
      throw wrapped;
    }
    throw error;
  }
}
