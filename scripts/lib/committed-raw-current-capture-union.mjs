import { isDeepStrictEqual } from 'node:util';
import { assertCommittedRawRetentionInputs } from '../plan-ravscore-current-history.mjs';
import { assertDmiPartContinuityTotalSize, unpackDmiPartContinuity } from './dmi-part-continuity.mjs';
import { readDmiForecastRecord } from './dmi-forecast-file.mjs';
import { inspectDmiForecastGridSampling, inspectDmiNativeGridSampling } from './dmi-forecast-store.mjs';
import { dmiMarineCollectionAllowedForZone } from './dmi-marine-zone-exclusions.mjs';
import { createProtectedDmiNativeCurrentInspector } from './protected-dmi-native-current-proofs.mjs';
import { dmiExpectedIdentityForPart, verifiedBulkCurrent, verifiedDmiNativeComponentSource }
  from './ravscore-production-adapters.mjs';
import { canonicalSavedDmiOriginalCapture } from './saved-dmi-original-capture.mjs';

const KIND = 'PUBLISHED_ORDINARY_RAW_CAPTURE_UNION';
const MAX_CAPTURES = 4096;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function requireCoverage(condition, reason) {
  if (!condition) throw new Error('RAW_CAPTURE_UNION_' + reason);
}

function addCapture(captures, source) {
  const capture = canonicalSavedDmiOriginalCapture(source);
  requireCoverage(capture, 'CAPTURE_UNPROVED');
  captures.set(JSON.stringify(capture), capture);
  requireCoverage(captures.size <= MAX_CAPTURES, 'CAPTURE_BOUND');
}

function retainNative(captures, source, identity) {
  if (!dmiMarineCollectionAllowedForZone(source?.collection, identity.parentZoneId)) return;
  const { status } = inspectDmiNativeGridSampling(source);
  if (status === 'coherent') return;
  requireCoverage(status === 'unknown' && source.nativeGridSampling == null, 'NATIVE_UNPROVED');
  addCapture(captures, source);
}

function retainBulk(captures, documents, part, identity) {
  for (const document of documents) {
    const zone = document.zones[identity.entityId];
    if (zone === undefined) continue;
    requireCoverage(object(zone) && object(zone.hourly)
      && Object.keys(zone.hourly).length <= 10_000, 'ROLE_UNPROVED');
    for (const row of Object.values(zone.hourly)) {
      const source = row?.sources?.current;
      if (source?.provider !== 'dmi'
        || !dmiMarineCollectionAllowedForZone(source.collection, identity.parentZoneId)
        || ![row['current-u'], row['current-v']].some(Number.isFinite)) continue;
      requireCoverage([row['current-u'], row['current-v']].every(Number.isFinite)
        && verifiedDmiNativeComponentSource(source, row.time, 'current', identity)
        && verifiedBulkCurrent(document, zone, part.waterPoint, source, row.time, identity), 'NATIVE_UNPROVED');
      retainNative(captures, source, identity);
    }
  }
}

function retainSavedPart(captures, saved, documents, part, identity) {
  const originals = saved?.nativeCurrentOriginals;
  requireCoverage(originals, 'PART_UNPROVED');
  // The ordinary unpacker has already proved the bank and its exact saved rows.
  // An unselected legacy endpoint can still be required at a different hour.
  const bank = originals.bank;
  for (const { value } of bank?.nativeRows ?? []) retainNative(captures, value.source, identity);

  const unmatched = saved.hourly.filter((row, index) => {
    const source = row.sources?.current;
    if (row.currentProvenance?.provider === 'dmi' && row.currentProvenance.vectorSemanticsVersion === 3
      && [row.currentUMps, row.currentVMps].some(Number.isFinite)) {
      requireCoverage(source?.provider === 'dmi' && source.vectorSemanticsVersion === 3, 'SAVED_SOURCE_UNPROVED');
    }
    if (source?.provider !== 'dmi' || source.vectorSemanticsVersion !== 3
      || !dmiMarineCollectionAllowedForZone(source.collection, identity.parentZoneId)
      || ![row.currentUMps, row.currentVMps].some(Number.isFinite)) return false;
    const { status } = inspectDmiForecastGridSampling(source, 'current', row.time, identity);
    requireCoverage((status === 'coherent' || status === 'unknown')
      && [row.currentUMps, row.currentVMps].every(Number.isFinite), 'SAVED_SOURCE_UNPROVED');
    return status === 'unknown' && originals.coverage[index].status !== 'DMI_ORIGINAL_PROVED';
  });
  if (!unmatched.length) return;
  const inspector = createProtectedDmiNativeCurrentInspector({ contexts: documents, previousBank: bank });
  for (const row of unmatched) {
    const proof = inspector.inspectOriginals({ part, row });
    requireCoverage(proof.ok, 'SAVED_ENDPOINT_UNPROVED');
    for (const native of proof.nativeRows) retainNative(captures, native.source, identity);
  }
}

// Planning only. The production caller must independently authenticate the
// complete new B/S view, exact normal input roles, and any transport captures.
// This does not attest archive membership, future admission or deletion.
export async function collectPublishedRawCurrentCaptureUnion({
  registry, conditions, checkpoint, boundary, zones, forecast,
  protectedBulk, progressCandidate, progressActive, historicalBulk,
  protectedCompanionContexts, transportCaptures, verify,
}) {
  assertCommittedRawRetentionInputs({
    registry, conditions, checkpoint, boundary, zones,
    persistedHourlyByPart: new Map(), protectedCompanionContexts,
  });
  const { continuity } = forecast ?? {};
  const { metadata, entries } = continuity ?? {};
  requireCoverage(metadata?.schemaVersion === 2
    && metadata.productionReferenceAt === boundary.productionReferenceAt
    && metadata.partCount === registry.partCount && Array.isArray(entries)
    && entries.length === registry.partCount && registry.partCount >= 1 && registry.partCount <= 673,
  'CONTINUITY_UNPROVED');
  requireCoverage(historicalBulk === null && typeof verify === 'function'
    && Array.isArray(transportCaptures) && transportCaptures.length <= MAX_CAPTURES, 'ROLE_UNPROVED');

  const roles = [protectedBulk, progressCandidate, progressActive, ...protectedCompanionContexts];
  requireCoverage(protectedBulk !== null && protectedCompanionContexts.every(object)
    && roles.every(document => document === null
      || (object(document?.zones) && document.nativeCurrentOriginalScope === undefined)), 'ROLE_UNPROVED');
  const documents = [...new Set(roles.filter(Boolean))];
  const parts = Object.entries(registry.zones)
    .flatMap(([zoneId, entries]) => entries.map(part => ({ ...part, zoneId })));
  const pending = new Map(parts.map(part => [part.partId, part]));
  requireCoverage(parts.length === registry.partCount && pending.size === parts.length
    && Object.keys(checkpoint.states).length === parts.length
    && Object.keys(conditions.coastalParts.parts).length === parts.length, 'PART_UNPROVED');
  assertDmiPartContinuityTotalSize(metadata.rawBytes, metadata.compressedBytes);
  await verify();

  const captures = new Map();
  for (const transport of transportCaptures) {
    requireCoverage(isDeepStrictEqual(transport, canonicalSavedDmiOriginalCapture(transport)), 'CAPTURE_UNPROVED');
    addCapture(captures, transport);
  }
  let rawBytes = 0;
  let compressedBytes = 0;
  for (const descriptor of entries) {
    const entry = await readDmiForecastRecord(forecast, descriptor);
    const part = pending.get(entry.partId);
    const identity = part && dmiExpectedIdentityForPart(part);
    requireCoverage(identity && checkpoint.states[part.partId]?.time === boundary.productionReferenceAt
      && Object.hasOwn(conditions.coastalParts.parts, part.partId), 'PART_UNPROVED');
    pending.delete(part.partId);
    rawBytes += entry.rawBytes;
    compressedBytes += entry.compressedBytes;
    const saved = await unpackDmiPartContinuity({
      ...metadata, partCount: 1, rawBytes: entry.rawBytes, compressedBytes: entry.compressedBytes, entries: [entry],
    }, [part], boundary.productionReferenceAt);
    retainBulk(captures, documents, part, identity);
    retainSavedPart(captures, saved.get(part.partId), documents, part, identity);
  }
  requireCoverage(!pending.size && rawBytes === metadata.rawBytes
    && compressedBytes === metadata.compressedBytes, 'CONTINUITY_UNPROVED');
  await verify();
  return {
    schemaVersion: 1, kind: KIND, boundary: { ...boundary },
    captures: [...captures.keys()].sort().map(key => captures.get(key)),
  };
}
