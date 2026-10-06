// The persisted JSON shape is unchanged. Read one bounded zone/continuity
// entry at a time so a valid national file never requires a national string.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { TextDecoder } from 'node:util';
import { PROTECTED_PRIVATE_RUNTIME_POLICY } from '../protected-private-production-runtime.mjs';

export const DMI_FORECAST_FILE_MAX_BYTES = PROTECTED_PRIVATE_RUNTIME_POLICY.maximumFilePayloadBytes;
export const DMI_FORECAST_RECORD_MAX_BYTES = 64 * 1024 * 1024;
const CHUNK_BYTES = 256 * 1024;
const MAX_DEPTH = 64;
const MAX_KEYS = 250_000;
const MAX_ZONES = 210;
const MAX_PARTS = 673;
const MAX_METADATA_BYTES = 1024 * 1024;
const MAX_CONTINUITY_ENTRY_BYTES = 4 * 1024 * 1024;
const MAX_WATER_SOURCE_ENTRIES = 256;
const MAX_WATER_SOURCE_ENTRY_BYTES = 1024 * 1024;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const invalid = code => { throw new Error(`DMI_FORECAST_FILE_${code}`); };
const whitespace = byte => byte === 32 || byte === 9 || byte === 10 || byte === 13;
const delimiter = byte => whitespace(byte) || byte === 44 || byte === 125 || byte === 93;
const safeId = value => typeof value === 'string' && value.length > 0 && value.length < 256
  && !['__proto__', 'constructor', 'prototype'].includes(value);

// JSON.parse validates grammar/escapes. This second bounded pass rejects
// duplicate object keys (including escaped aliases) at every depth.
function uniqueKeys(text) {
  const stack = [];
  let keys = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      const start = i;
      for (i += 1; i < text.length; i += 1) {
        if (text[i] === '\\') i += 1;
        else if (text[i] === '"') break;
      }
      const frame = stack.at(-1);
      if (frame?.keys && frame.expectKey) {
        const key = JSON.parse(text.slice(start, i + 1));
        if (frame.keys.has(key)) invalid('DUPLICATE_KEY');
        frame.keys.add(key);
        frame.expectKey = false;
        if (++keys > MAX_KEYS) invalid('STRUCTURE_LIMIT');
      }
    } else if (char === '{' || char === '[') {
      stack.push(char === '{' ? { keys: new Set(), expectKey: true } : {});
      if (stack.length > MAX_DEPTH) invalid('STRUCTURE_LIMIT');
    } else if (char === '}' || char === ']') stack.pop();
    else if (char === ',' && stack.at(-1)?.keys) stack.at(-1).expectKey = true;
  }
}

function parseBytes(bytes) {
  let text;
  let value;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    value = JSON.parse(text);
  } catch { invalid('INVALID_JSON'); }
  uniqueKeys(text);
  return value;
}

async function regularFile(file, maximumBytes) {
  let stat;
  try { stat = await fs.lstat(file); }
  catch (error) { invalid(error?.code === 'ENOENT' ? 'MISSING' : 'READ_UNAVAILABLE'); }
  if (!stat.isFile() || stat.isSymbolicLink()) invalid('INVALID_FILE');
  if (stat.size < 2 || stat.size > maximumBytes) invalid('INVALID_SIZE');
  return stat;
}

function equalStat(a, b) {
  return a.dev === b.dev && a.ino === b.ino && a.size === b.size && a.mtimeMs === b.mtimeMs;
}

class Cursor {
  constructor(handle, maximumRecordBytes) {
    this.handle = handle;
    this.maximumRecordBytes = maximumRecordBytes;
    this.buffer = Buffer.alloc(0);
    this.offset = 0;
    this.position = 0;
    this.readPosition = 0;
  }
  async fill() {
    if (this.offset < this.buffer.length) return true;
    const bytes = Buffer.allocUnsafe(CHUNK_BYTES);
    const result = await this.handle.read(bytes, 0, bytes.length, this.readPosition);
    this.readPosition += result.bytesRead;
    this.buffer = bytes.subarray(0, result.bytesRead);
    this.offset = 0;
    return result.bytesRead > 0;
  }
  async peek() { return await this.fill() ? this.buffer[this.offset] : null; }
  consume(count = 1) { this.offset += count; this.position += count; }
  async space() {
    while (await this.fill()) {
      const start = this.offset;
      while (this.offset < this.buffer.length && whitespace(this.buffer[this.offset])) this.offset += 1;
      this.position += this.offset - start;
      if (this.offset < this.buffer.length) break;
    }
  }
  async expect(byte) {
    await this.space();
    if (await this.peek() !== byte) invalid('INVALID_JSON');
    this.consume();
  }
  async raw(maximum = this.maximumRecordBytes) {
    await this.space();
    const start = this.position;
    const first = await this.peek();
    if (first === null || [44, 58, 93, 125].includes(first)) invalid('INVALID_JSON');
    const compound = first === 123 || first === 91;
    const stringRoot = first === 34;
    let inString = false;
    let escaped = false;
    let depth = 0;
    let total = 0;
    const pieces = [];
    let done = false;
    while (!done && await this.fill()) {
      const from = this.offset;
      while (this.offset < this.buffer.length) {
        const byte = this.buffer[this.offset];
        if (!compound && !stringRoot && delimiter(byte)) { done = true; break; }
        this.consume();
        if (inString) {
          if (escaped) escaped = false;
          else if (byte === 92) escaped = true;
          else if (byte === 34) {
            inString = false;
            if (stringRoot) { done = true; break; }
          }
        } else if (byte === 34) inString = true;
        else if (byte === 123 || byte === 91) {
          depth += 1;
          if (depth > MAX_DEPTH) invalid('STRUCTURE_LIMIT');
        } else if (byte === 125 || byte === 93) {
          depth -= 1;
          if (compound && depth === 0) { done = true; break; }
        }
      }
      const piece = this.buffer.subarray(from, this.offset);
      total += piece.length;
      if (total > maximum) invalid('RECORD_SIZE_LIMIT');
      if (piece.length) pieces.push(piece);
    }
    if (!total || inString || depth !== 0) invalid('INVALID_JSON');
    const bytes = Buffer.concat(pieces, total);
    return { value: parseBytes(bytes), offset: start, bytes: total, sha256: digest(bytes) };
  }
  async object(visitor) {
    await this.expect(123);
    const seen = new Set();
    await this.space();
    if (await this.peek() === 125) { this.consume(); return; }
    for (;;) {
      if (await this.peek() !== 34) invalid('INVALID_JSON');
      const key = (await this.raw(4096)).value;
      if (seen.has(key)) invalid('DUPLICATE_KEY');
      seen.add(key);
      if (seen.size > MAX_KEYS) invalid('STRUCTURE_LIMIT');
      await this.expect(58);
      await visitor(key);
      await this.space();
      const byte = await this.peek();
      if (byte === 125) { this.consume(); return; }
      if (byte !== 44) invalid('INVALID_JSON');
      this.consume();
      await this.space();
    }
  }
  async array(visitor) {
    await this.expect(91);
    await this.space();
    if (await this.peek() === 93) { this.consume(); return; }
    let index = 0;
    for (;;) {
      await visitor(index++);
      await this.space();
      const byte = await this.peek();
      if (byte === 93) { this.consume(); return; }
      if (byte !== 44) invalid('INVALID_JSON');
      this.consume();
      await this.space();
    }
  }
}

export async function inspectDmiForecastFile(file, {
  maximumBytes = DMI_FORECAST_FILE_MAX_BYTES,
  maximumRecordBytes = DMI_FORECAST_RECORD_MAX_BYTES,
} = {}) {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 2 || maximumBytes > DMI_FORECAST_FILE_MAX_BYTES
    || !Number.isSafeInteger(maximumRecordBytes) || maximumRecordBytes < 2
    || maximumRecordBytes > DMI_FORECAST_RECORD_MAX_BYTES) invalid('BOUNDS_INVALID');
  const stat = await regularFile(file, maximumBytes);
  const handle = await fs.open(file, 'r');
  const cursor = new Cursor(handle, maximumRecordBytes);
  const result = { file: path.resolve(file), bytes: stat.size, stat, metadata: {}, zones: new Map(),
    zoneGeometry: {}, hasPartContinuity: false, continuity: null,
    waterSourceContinuity: null, largestRecordBytes: 0 };
  const descriptor = row => {
    result.largestRecordBytes = Math.max(result.largestRecordBytes, row.bytes);
    return { offset: row.offset, bytes: row.bytes, sha256: row.sha256 };
  };
  let failed = false;
  try {
    if (!equalStat(stat, await handle.stat())) invalid('CHANGED');
    let sawZones = false;
    let metadataBytes = 0;
    await cursor.object(async key => {
      if (!safeId(key)) invalid('INVALID_KEY');
      if (key === 'zones') {
        sawZones = true;
        await cursor.object(async id => {
          if (!safeId(id) || result.zones.size >= MAX_ZONES) invalid('STRUCTURE_LIMIT');
          const row = await cursor.raw();
          if (!plain(row.value) || !Array.isArray(row.value.hourly)) invalid('SHAPE_INVALID');
          result.zones.set(id, descriptor(row));
          result.zoneGeometry[id] = { zoneId: row.value.zoneId,
            point: Array.isArray(row.value.point) && row.value.point.length === 2
              && row.value.point.every(value => typeof value === 'number' && Number.isFinite(value))
              ? row.value.point : null };
        });
      } else if (key === 'partContinuity' || key === 'waterSourceContinuity') {
        const isWaterSource = key === 'waterSourceContinuity';
        await cursor.space();
        if (await cursor.peek() !== 123) {
          const row = await cursor.raw(MAX_METADATA_BYTES);
          if (row.value !== null) invalid('SHAPE_INVALID');
          result.metadata[key] = null;
          return;
        }
        if (!isWaterSource) result.hasPartContinuity = true;
        const continuity = { metadata: {}, entries: [] };
        result[isWaterSource ? 'waterSourceContinuity' : 'continuity'] = continuity;
        let sawEntries = false;
        await cursor.object(async name => {
          if (!safeId(name)) invalid('INVALID_KEY');
          if (name === 'entries') {
            sawEntries = true;
            const ids = new Set();
            await cursor.array(async index => {
              if (index >= (isWaterSource ? MAX_WATER_SOURCE_ENTRIES : MAX_PARTS)) invalid('STRUCTURE_LIMIT');
              const row = await cursor.raw(Math.min(isWaterSource ? MAX_WATER_SOURCE_ENTRY_BYTES
                : MAX_CONTINUITY_ENTRY_BYTES, maximumRecordBytes));
              const id = row.value?.[isWaterSource ? 'sourceKey' : 'partId'];
              if (!plain(row.value) || !safeId(id) || ids.has(id)) invalid('SHAPE_INVALID');
              ids.add(id);
              continuity.entries.push(descriptor(row));
            });
          } else {
            const row = await cursor.raw(MAX_METADATA_BYTES);
            metadataBytes += row.bytes;
            if (metadataBytes > 8 * MAX_METADATA_BYTES) invalid('STRUCTURE_LIMIT');
            continuity.metadata[name] = row.value;
          }
        });
        if (!sawEntries) invalid('SHAPE_INVALID');
      } else {
        const row = await cursor.raw(MAX_METADATA_BYTES);
        metadataBytes += row.bytes;
        if (metadataBytes > 8 * MAX_METADATA_BYTES) invalid('STRUCTURE_LIMIT');
        result.metadata[key] = row.value;
      }
    });
    await cursor.space();
    if (await cursor.peek() !== null || !sawZones) invalid('INVALID_JSON');
    if (!equalStat(stat, await handle.stat())) invalid('CHANGED');
    return result;
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    // Close only our own handle; do not mask an earlier read/validation error.
    try { await handle.close(); } catch (error) { if (!failed) throw error; }
  }
}

export async function readDmiForecastRecord(index, descriptor) {
  if (!Number.isSafeInteger(descriptor?.offset) || descriptor.offset < 0
    || !Number.isSafeInteger(descriptor?.bytes) || descriptor.bytes < 2
    || descriptor.bytes > DMI_FORECAST_RECORD_MAX_BYTES
    || descriptor.offset + descriptor.bytes > index.bytes
    || !/^[a-f0-9]{64}$/.test(descriptor.sha256)) invalid('RECORD_DESCRIPTOR_INVALID');
  const stat = await regularFile(index.file, DMI_FORECAST_FILE_MAX_BYTES);
  if (!equalStat(index.stat, stat)) invalid('CHANGED');
  const handle = await fs.open(index.file, 'r');
  let failed = false;
  try {
    if (!equalStat(index.stat, await handle.stat())) invalid('CHANGED');
    const bytes = Buffer.allocUnsafe(descriptor.bytes);
    let read = 0;
    while (read < bytes.length) {
      const result = await handle.read(bytes, read, bytes.length - read, descriptor.offset + read);
      if (!result.bytesRead) invalid('CHANGED');
      read += result.bytesRead;
    }
    if (digest(bytes) !== descriptor.sha256 || !equalStat(index.stat, await handle.stat())) invalid('CHANGED');
    return parseBytes(bytes);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try { await handle.close(); } catch (error) { if (!failed) throw error; }
  }
}

export async function readDmiForecastFile(file, options) {
  const index = await inspectDmiForecastFile(file, options);
  const document = { ...index.metadata, zones: {} };
  for (const [id, descriptor] of index.zones) document.zones[id] = await readDmiForecastRecord(index, descriptor);
  if (index.continuity) {
    const entries = [];
    for (const descriptor of index.continuity.entries) entries.push(await readDmiForecastRecord(index, descriptor));
    document.partContinuity = { ...index.continuity.metadata, entries };
  }
  if (index.waterSourceContinuity) document.waterSourceContinuity = await readDmiWaterSourceContinuity(index);
  return document;
}

export async function readDmiWaterSourceContinuity(index) {
  if (!index.waterSourceContinuity) return index.metadata.waterSourceContinuity ?? null;
  const entries = [];
  for (const descriptor of index.waterSourceContinuity.entries) entries.push(await readDmiForecastRecord(index, descriptor));
  return { ...index.waterSourceContinuity.metadata, entries };
}

// The same JSON ordering/equality semantics as the old national stringify,
// but no serialized value exceeds one bounded record. This is not a scientific
// validity check: consumers still apply the existing provenance/tuple rules.
function* documentJsonChunks(document) {
  const valueText = (value, maximum) => {
    const text = JSON.stringify(value);
    if (typeof text !== 'string' || Buffer.byteLength(text) > maximum) invalid('RECORD_SIZE_LIMIT');
    return text;
  };
  if (!plain(document) || !plain(document.zones)) invalid('SHAPE_INVALID');
  yield '{';
  let first = true;
  for (const [key, value] of Object.entries(document)) {
    if (value === undefined || typeof value === 'function' || typeof value === 'symbol') continue;
    if (!first) yield ',';
    yield `${JSON.stringify(key)}:`;
    if (key === 'zones') {
      yield '{';
      let firstZone = true;
      for (const [id, zone] of Object.entries(value)) {
        if (!firstZone) yield ',';
        yield `${JSON.stringify(id)}:`;
        yield valueText(zone, DMI_FORECAST_RECORD_MAX_BYTES);
        firstZone = false;
      }
      yield '}';
    } else if ((key === 'partContinuity' || key === 'waterSourceContinuity') && plain(value)) {
      yield '{';
      let firstField = true;
      for (const [name, entry] of Object.entries(value)) {
        if (entry === undefined || typeof entry === 'function' || typeof entry === 'symbol') continue;
        if (!firstField) yield ',';
        yield `${JSON.stringify(name)}:`;
        if (name === 'entries' && Array.isArray(entry)) {
          yield '[';
          for (let index = 0; index < entry.length; index += 1) {
            if (index) yield ',';
            yield valueText(entry[index], key === 'waterSourceContinuity'
              ? MAX_WATER_SOURCE_ENTRY_BYTES : MAX_CONTINUITY_ENTRY_BYTES);
          }
          yield ']';
        } else yield valueText(entry, MAX_METADATA_BYTES);
        firstField = false;
      }
      yield '}';
    } else yield valueText(value, MAX_METADATA_BYTES);
    first = false;
  }
  yield '}';
}

export function hashDmiForecastDocument(document) {
  const hash = crypto.createHash('sha256');
  for (const chunk of documentJsonChunks(document)) hash.update(chunk);
  return hash.digest('hex');
}

export async function writeDmiForecastFileAtomic(file, document) {
  const destination = path.resolve(file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const old = await fs.lstat(destination).catch(error => {
    if (error?.code === 'ENOENT') return null;
    throw error;
  });
  if (old && (!old.isFile() || old.isSymbolicLink())) invalid('INVALID_FILE');
  const temporary = `${destination}.forecast-stage-${crypto.randomUUID()}`;
  const handle = await fs.open(temporary, 'wx', 0o600);
  let bytes = 0;
  let pending = [];
  let pendingBytes = 0;
  const flush = async () => {
    if (!pending.length) return;
    await handle.writeFile(pending.join(''));
    pending = [];
    pendingBytes = 0;
  };
  const append = async text => {
    const length = Buffer.byteLength(text);
    bytes += length;
    if (bytes > DMI_FORECAST_FILE_MAX_BYTES) invalid('INVALID_SIZE');
    // Do not copy a whole large record into an aggregate pending string.
    if (length >= CHUNK_BYTES) {
      await flush();
      await handle.writeFile(text);
    } else {
      pending.push(text);
      pendingBytes += length;
      if (pendingBytes >= CHUNK_BYTES) await flush();
    }
  };
  try {
    // Native stringify per bounded zone/PART is substantially cheaper than
    // an async scalar traversal of every proof field in the national store.
    // The complete stage still passes the same parser and structural checks.
    for (const chunk of documentJsonChunks(document)) await append(chunk);
    await append('\n');
    await flush();
    await handle.sync();
    await handle.close();
    await inspectDmiForecastFile(temporary);
    await fs.rename(temporary, destination);
    return { bytes, maximumBytes: DMI_FORECAST_FILE_MAX_BYTES };
  } catch (error) {
    await handle.close().catch(() => {});
    await fs.unlink(temporary).catch(() => {});
    throw error;
  }
}

// A record-at-a-time output stage for recovery. The existing installComponents
// transaction owns the eventual baseline replacement. No partial stage escapes.
export async function writeDmiForecastRecords(file, index, zoneRecords, metadata = index.metadata) {
  const handle = await fs.open(file, 'wx', 0o600);
  let bytes = 0;
  const append = async text => {
    bytes += Buffer.byteLength(text);
    if (bytes > DMI_FORECAST_FILE_MAX_BYTES) invalid('INVALID_SIZE');
    await handle.writeFile(text);
  };
  try {
    await append('{');
    let first = true;
    for (const [key, value] of Object.entries(metadata)) {
      if (!first) await append(',');
      if (key === 'waterSourceContinuity') {
        // A qualified merged bank follows the same bounded recordwise path as
        // an unchanged indexed bank, never a whole-bank metadata stringify.
        if (!plain(value) || !Array.isArray(value.entries)) invalid('SHAPE_INVALID');
        await append('"waterSourceContinuity":{');
        let firstField = true;
        for (const [name, field] of Object.entries(value)) {
          if (!firstField) await append(',');
          await append(`${JSON.stringify(name)}:`);
          if (name === 'entries') {
            await append('[');
            for (let i = 0; i < field.length; i++) {
              if (i) await append(',');
              const text = JSON.stringify(field[i]);
              if (Buffer.byteLength(text) > MAX_WATER_SOURCE_ENTRY_BYTES) invalid('RECORD_SIZE_LIMIT');
              await append(text);
            }
            await append(']');
          } else {
            const text = JSON.stringify(field);
            if (Buffer.byteLength(text) > MAX_METADATA_BYTES) invalid('RECORD_SIZE_LIMIT');
            await append(text);
          }
          firstField = false;
        }
        await append('}');
      } else await append(`${JSON.stringify(key)}:${JSON.stringify(value)}`);
      first = false;
    }
    // Preserve independently bounded SOURCE entries when no qualified merged
    // replacement was supplied. Do not turn their bank into national metadata.
    if (index.waterSourceContinuity && !Object.hasOwn(metadata, 'waterSourceContinuity')) {
      if (!first) await append(',');
      await append('"waterSourceContinuity":{');
      for (const [key, value] of Object.entries(index.waterSourceContinuity.metadata)) {
        await append(`${JSON.stringify(key)}:${JSON.stringify(value)},`);
      }
      await append('"entries":[');
      let firstEntry = true;
      for (const entry of index.waterSourceContinuity.entries) {
        if (!firstEntry) await append(',');
        await append(JSON.stringify(await readDmiForecastRecord(index, entry)));
        firstEntry = false;
      }
      await append(']}');
      first = false;
    }
    if (!first) await append(',');
    await append('"zones":{');
    first = true;
    for await (const [id, value] of zoneRecords) {
      if (!first) await append(',');
      const text = JSON.stringify(value);
      if (Buffer.byteLength(text) > DMI_FORECAST_RECORD_MAX_BYTES) invalid('RECORD_SIZE_LIMIT');
      await append(`${JSON.stringify(id)}:${text}`);
      first = false;
    }
    await append('}');
    if (index.continuity) {
      await append(',"partContinuity":{');
      for (const [key, value] of Object.entries(index.continuity.metadata)) {
        await append(`${JSON.stringify(key)}:${JSON.stringify(value)},`);
      }
      await append('"entries":[');
      first = true;
      for (const entry of index.continuity.entries) {
        if (!first) await append(',');
        await append(JSON.stringify(await readDmiForecastRecord(index, entry)));
        first = false;
      }
      await append(']}');
    }
    await append('}\n');
    await handle.sync();
    await handle.close();
    await inspectDmiForecastFile(file);
    return { bytes, maximumBytes: DMI_FORECAST_FILE_MAX_BYTES };
  } catch (error) {
    await handle.close().catch(() => {});
    await fs.unlink(file).catch(() => {});
    throw error;
  }
}
