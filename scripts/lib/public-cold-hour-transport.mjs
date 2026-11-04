import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';
import { PUBLIC_DELIVERY_MAX_BYTES } from '../../js/core/public-delivery-contract.js';

const compress = promisify(gzip);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The normal compact map producer supplies the same checked, already opened
// raw bytes it used for its projection. The original path is left untouched.
export async function writeColdPublicHour({ liveDirectory, entry, raw }) {
  if (entry.kind !== 'hour' || !(raw instanceof Uint8Array) || raw.byteLength !== entry.bytes
    || raw.byteLength < 1 || raw.byteLength > PUBLIC_DELIVERY_MAX_BYTES || sha(raw) !== entry.sha256) {
    throw new Error('PUBLIC_COLD_HOURS_ORIGINAL_BINDING');
  }
  const compressed = await compress(raw, { level: 6 });
  const envelope = { schemaVersion: 1, kind: 'ravradar-public-json-gzip-v1', encoding: 'gzip-base64',
    decodedBytes: raw.byteLength, decodedSha256: entry.sha256,
    compressedBytes: compressed.length, compressedSha256: sha(compressed),
    dataBase64: compressed.toString('base64') };
  const bytes = Buffer.from(JSON.stringify(envelope) + '\n');
  if (bytes.length >= raw.byteLength || bytes.length > PUBLIC_DELIVERY_MAX_BYTES) {
    throw new Error('PUBLIC_COLD_HOURS_ENVELOPE_SIZE');
  }
  const sha256 = sha(bytes);
  const relative = './forecast/' + sha256 + '.json';
  const target = path.join(liveDirectory, relative);
  try { await fs.writeFile(target, bytes, { flag: 'wx' }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const stat = await fs.lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== bytes.length
      || !(await fs.readFile(target)).equals(bytes)) throw new Error('PUBLIC_COLD_HOURS_PHYSICAL_CONFLICT');
  }
  return { path: relative, sha256, bytes: bytes.length, rawSha256: entry.sha256, rawBytes: raw.byteLength };
}
