import { PUBLIC_DELIVERY_MAX_BYTES, publicDeliveryEntries } from '../core/public-delivery-contract.js?v=4.0.594';
import { PUBLIC_JSON_ENVELOPE_KIND } from './public-json-transport.js?v=4.0.594&transport=public-json-bridge-20261103';

export const RAW_PUBLIC_HOUR_COUNT = 12;
const HASH = /^[a-f0-9]{64}$/;
const owns = (value, key) => Object.hasOwn(value, key);

// Keep the existing manifest descriptor as the physical file identity. Only
// the compact display generation may extend the 106 cold hour descriptors.
export function publicDeliveryTransportEntries(manifest, entries = publicDeliveryEntries(manifest)) {
  const schema = manifest?.detailDelivery?.coldHoursSchema;
  if (schema !== undefined && (schema !== 1 || manifest.detailDelivery.mapHoursLandingSchema !== 1
      || !manifest.detailDelivery.mapHours)) throw new Error('PUBLIC_COLD_HOURS_SCHEMA');
  let hourIndex = 0;
  for (const entry of entries) {
    const packed = entry.kind === 'hour' && hourIndex++ >= RAW_PUBLIC_HOUR_COUNT && schema === 1;
    const hasRaw = owns(entry, 'rawSha256') || owns(entry, 'rawBytes');
    if (schema === 1) {
      const descriptor = manifest.detailDelivery[entry.kind === 'hour' ? 'hours' : 'zones'][entry.key];
      const required = packed ? ['path', 'sha256', 'bytes', 'rawSha256', 'rawBytes'] : ['path', 'sha256', 'bytes'];
      if (Object.keys(descriptor).length !== required.length || required.some(key => !owns(descriptor, key))) {
        throw new Error('PUBLIC_COLD_HOURS_DESCRIPTOR');
      }
    }
    if (packed !== hasRaw || (packed && (!HASH.test(entry.rawSha256 ?? '') || entry.rawSha256 === entry.sha256
      || !Number.isSafeInteger(entry.rawBytes) || entry.rawBytes <= entry.bytes
      || entry.rawBytes > PUBLIC_DELIVERY_MAX_BYTES))) throw new Error('PUBLIC_COLD_HOURS_DESCRIPTOR');
  }
  return entries;
}

export function deliverySourceSha256(entry) {
  return entry.rawSha256 ?? entry.sha256;
}

export function inspectPublicDeliveryTransport(value, entry, strictPlain = false) {
  const encoded = value?.kind === PUBLIC_JSON_ENVELOPE_KIND;
  const identity = {
    encoded,
    logicalSha256: encoded ? value.decodedSha256 : entry.sha256,
    logicalBytes: encoded ? value.decodedBytes : entry.bytes,
  };
  assertPublicDeliveryTransportIdentity(identity, entry, strictPlain);
  return identity;
}

export function assertPublicDeliveryTransportIdentity(identity, entry, strictPlain = false) {
  if (entry.rawSha256 !== undefined) {
    if (!identity?.encoded || identity.logicalSha256 !== entry.rawSha256
      || identity.logicalBytes !== entry.rawBytes) throw new Error('PUBLIC_COLD_HOURS_LOGICAL_BINDING');
  } else if (strictPlain && identity?.encoded) {
    throw new Error('PUBLIC_COLD_HOURS_UNEXPECTED_ENVELOPE');
  }
}
