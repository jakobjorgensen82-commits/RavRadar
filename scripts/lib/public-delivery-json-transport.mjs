import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';
import { gunzip } from 'node:zlib';
import { PUBLIC_DELIVERY_MAX_BYTES } from '../../js/core/public-delivery-contract.js';
import { decodePublicJsonTransport } from '../../js/services/public-json-transport.js';
import { inspectPublicDeliveryTransport } from '../../js/services/public-delivery-transport-binding.js';

const unpack = promisify(gunzip);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const validEntry = entry => /^[a-f0-9]{64}$/.test(entry?.sha256 ?? '')
  && Number.isSafeInteger(entry.bytes) && entry.bytes > 0 && entry.bytes <= PUBLIC_DELIVERY_MAX_BYTES;

// A strict native reader shares the shipped transport codec and passes only
// the checked, decoded payload to the existing privacy and domain checks.
export async function readPublicDeliveryJsonBytes(bytes, entry, strictPlain = false, { includeLogicalPayload = false } = {}) {
  if (!validEntry(entry) || !(bytes instanceof Uint8Array)
      || bytes.byteLength !== entry.bytes || hash(bytes) !== entry.sha256) {
    throw new Error('Public delivery hash mismatch.');
  }
  let document;
  try { document = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new Error('Public delivery JSON invalid.'); }
  const identity = inspectPublicDeliveryTransport(document, entry, strictPlain);
  const decoded = await decodePublicJsonTransport(document);
  const result = { value: decoded.value, ...identity, outerBytes: bytes };
  if (!includeLogicalPayload) return result;
  // The shared codec has already admitted the exact single-member stream.
  // Only the native capacity audit needs those original bytes for repacking.
  const logicalPayload = identity.encoded
    ? await unpack(Buffer.from(document.dataBase64, 'base64'), { maxOutputLength: identity.logicalBytes })
    : bytes;
  if (logicalPayload.byteLength !== identity.logicalBytes || hash(logicalPayload) !== identity.logicalSha256) {
    throw new Error('PUBLIC_HOUR_CAPACITY_LOGICAL_PAYLOAD_MISMATCH');
  }
  return { ...result, logicalPayload };
}

export async function readPublicDeliveryJsonFile(file, entry, strictPlain = false) {
  const stat = await fs.lstat(file);
  if (!validEntry(entry) || !stat.isFile() || stat.isSymbolicLink()
      || stat.size !== entry.bytes) throw new Error('Invalid public delivery file size/type.');
  return readPublicDeliveryJsonBytes(await fs.readFile(file), entry, strictPlain);
}
