import fs from 'node:fs/promises';
import path from 'node:path';
import { constants as bufferConstants } from 'node:buffer';
import { randomUUID } from 'node:crypto';

const DEFAULT_BUFFER_BYTES = 1024 * 1024;
const STRING_HEADROOM_BYTES = 1024 * 1024;

// Every later private-runtime reader still uses JSON.parse on one UTF-8 text.
// Stay below V8's string ceiling as well as the protected runtime's larger
// per-file allowance. The byte bound is deliberately conservative for UTF-8.
export const PRIVATE_CONDITIONS_MAX_BYTES =
  bufferConstants.MAX_STRING_LENGTH - STRING_HEADROOM_BYTES;

function jsonScalar(value, inArray) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  }
  if (typeof value === 'bigint') {
    throw new TypeError('Do not know how to serialize a BigInt');
  }
  if (['undefined', 'function', 'symbol'].includes(typeof value)) {
    return inArray ? 'null' : undefined;
  }
  return null;
}

function jsonValue(value) {
  return value && typeof value === 'object' && typeof value.toJSON === 'function'
    ? value.toJSON()
    : value;
}

/**
 * Atomically write compact JSON without ever constructing the complete JSON
 * string in memory. The old destination remains untouched on every failure.
 */
export async function writeBoundedJsonAtomic(file, value, {
  maximumBytes = PRIVATE_CONDITIONS_MAX_BYTES,
  bufferBytes = DEFAULT_BUFFER_BYTES,
  mode = 0o600,
} = {}) {
  if (typeof file !== 'string' || !file
    || !Number.isSafeInteger(maximumBytes) || maximumBytes < 2
    || !Number.isSafeInteger(bufferBytes) || bufferBytes < 1) {
    throw new Error('BOUNDED_JSON_WRITER_ARGUMENTS_INVALID');
  }
  const destination = path.resolve(file);
  const parent = path.dirname(destination);
  await fs.mkdir(parent, { recursive: true });
  const existing = await fs.lstat(destination).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (existing && (!existing.isFile() || existing.isSymbolicLink())) {
    throw new Error('BOUNDED_JSON_DESTINATION_INVALID');
  }
  const temporary = path.join(parent,
    `.${path.basename(destination)}.${randomUUID()}.tmp`);
  const handle = await fs.open(temporary, 'wx', mode);
  let pending = [];
  let pendingBytes = 0;
  let bytes = 0;
  const topLevelBytes = {};
  const ancestors = new WeakSet();

  const flush = async () => {
    if (!pending.length) return;
    await handle.writeFile(pending.join(''), 'utf8');
    pending = [];
    pendingBytes = 0;
  };
  const append = async text => {
    const nextBytes = Buffer.byteLength(text, 'utf8');
    if (bytes + nextBytes > maximumBytes) {
      throw new Error('BOUNDED_JSON_MAXIMUM_BYTES_EXCEEDED');
    }
    bytes += nextBytes;
    pending.push(text);
    pendingBytes += nextBytes;
    if (pendingBytes >= bufferBytes) await flush();
  };
  const writeValue = async (input, inArray = false, depth = 0, alreadyConverted = false) => {
    const converted = alreadyConverted ? input : jsonValue(input);
    const scalar = jsonScalar(converted, inArray);
    if (scalar !== null) {
      if (scalar !== undefined) await append(scalar);
      return scalar !== undefined;
    }
    if (!converted || typeof converted !== 'object') {
      throw new Error('BOUNDED_JSON_VALUE_INVALID');
    }
    if (ancestors.has(converted)) {
      throw new TypeError('Converting circular structure to JSON');
    }
    ancestors.add(converted);
    try {
      if (Array.isArray(converted)) {
        await append('[');
        for (let index = 0; index < converted.length; index += 1) {
          if (index > 0) await append(',');
          await writeValue(converted[index], true, depth + 1);
        }
        await append(']');
        return true;
      }
      await append('{');
      let written = 0;
      for (const key of Object.keys(converted)) {
        const child = jsonValue(converted[key]);
        const childScalar = jsonScalar(child, false);
        if (childScalar === undefined) continue;
        if (written > 0) await append(',');
        await append(`${JSON.stringify(key)}:`);
        const before = bytes;
        await writeValue(child, false, depth + 1, true);
        if (depth === 0) topLevelBytes[key] = bytes - before;
        written += 1;
      }
      await append('}');
      return true;
    } finally {
      ancestors.delete(converted);
    }
  };

  try {
    const wrote = await writeValue(value, false);
    if (!wrote) throw new Error('BOUNDED_JSON_ROOT_INVALID');
    await append('\n');
    await flush();
    await handle.sync();
    await handle.close();
    await fs.rename(temporary, destination);
    return { bytes, maximumBytes, topLevelBytes };
  } catch (error) {
    await handle.close().catch(() => {});
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}
