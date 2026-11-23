import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { isDeepStrictEqual as b374Equal } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { gunzip } from 'node:zlib';

import { downloadOrdinaryCompletedStageArtifact } from './ordinary-completed-stage-artifact.mjs';
import { withoutSavedAuditSecrets } from './audit-saved-weather-inputs.mjs';

const unzip = promisify(gunzip);
const HOUR = 3_600_000;
const PUBLIC_HOURS = 118;
const TARGET = Object.freeze({
  repository: 'jakobjorgensen82-commits/RavRadar', runId: '44701860497', runAttempt: '1',
  sourceHead: '99eb3b556aa2ab900501491455bfdad41e7cf06f', datasetId: 'rr-20261120100201-210',
  productionReferenceAt: '2026-11-20T08:00:00.000Z',
});
const B361_TARGET = Object.freeze({
  repository: TARGET.repository, runId: '44810601191', runAttempt: '1',
  sourceHead: '257d1cb527ab734d935d71a75608982f12fdc61e', datasetId: 'rr-20261120221503-210',
  productionReferenceAt: '2026-11-20T20:00:00.000Z',
});
const B361_OFFSETS = Object.freeze([5, 25, 26, 27, 29, 35, 36]);
const B361_PUBLIC_MANIFEST_SHA256 = 'd608a4f5a27db157541a7cb743d170d3605090c534ee5f546a5703b89d483596';
const B361_SOURCE_DETAILS_SHA256 = 'ab7c57ff3d74c70c9bcf5ceb397700b48f362fda01797bf665de3fc5b4f09a9f';
const B363_TARGET = Object.freeze({
  repository: TARGET.repository, runId: '44865684276', runAttempt: '1',
  sourceHead: '8851651b5908f37a1db3486a98d50ffd1231ff9c', datasetId: 'rr-20261121061419-210',
  productionReferenceAt: '2026-11-21T04:00:00.000Z',
});
const B363_PAIRS = Object.freeze([0, 3]);
const B363_HOURS = Object.freeze([0, 3, 6]);
const B363_PUBLIC_MANIFEST_SHA256 = '8f8c9532d9aa2125b92a63af6b16ca99b2e122b77ca824ea739b26c0ef848b2f';
const B363_SOURCE_DETAILS_SHA256 = 'da024324b0651ce806e06b250056d300ce9a81f187dbe8cbf1f236ef16a87875';
const B365_TARGET = Object.freeze({
  repository: TARGET.repository, runId: '44903468590', runAttempt: '1',
  sourceHead: '995c2359cada1708f0e67ca5b14fecc5dd9c573d', datasetId: 'rr-20261121140639-210',
  productionReferenceAt: '2026-11-21T12:00:00.000Z',
});
const B365_PAIRS = Object.freeze([0, 1, 3, 4]);
const B365_HOURS = Object.freeze([0, 1, 3, 4, 6, 7]);
const B365_PUBLIC_MANIFEST_SHA256 = 'ef4f40c9e3e26ca51985b2930685de66c1d8e72ff9073c349bb2837465411a98';
const B365_SOURCE_DETAILS_SHA256 = '8894575776901c36313703fe7b5cacd9e47a23865f586c195bb0f3191b773759';
const B368_TARGET = Object.freeze({
  repository: TARGET.repository, runId: '44966186686', runAttempt: '1',
  sourceHead: '931157c353a652aa213c7e7be6af446e48374861', datasetId: 'rr-20261122020536-210',
  productionReferenceAt: '2026-11-22T00:00:00.000Z',
});
const B368_PAIRS = Object.freeze([0, 1, 2]);
const B368_HOURS = Object.freeze([0, 1, 2, 3, 4, 5]);
const B368_PUBLIC_MANIFEST_SHA256 = '042dc155197c0e1cb2c813e6bc7daaf7127ad2f33b619a720fa1b69cf592b60a';
const B368_SOURCE_DETAILS_SHA256 = '919827e7599d1dffb8197343d526d73e067e74fe39a2858f1f1d8d41afe78213';
const ZONE_IDS = Object.freeze(['DK-B02-06', 'DK-B02-11', 'DK-B05-16', 'DK-B05-17']);
const FUR_ZONE = 'DK-B05-17';
const FUR_PART = 'dk-b05-17-national-part-04';
const SIBIRIEN_ZONE = 'DK-B02-06';
const SIBIRIEN_PART = 'dk-b02-06-national-part-02';
const finite = value => typeof value === 'number' && Number.isFinite(value);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const at = (start, hour) => new Date(Date.parse(start) + hour * HOUR).toISOString();
const levelProof = row => row?.sources?.waterLevel;
const validKeys = keys => Array.isArray(keys) && keys.length > 0 && keys.length <= 16
  && keys.every(key => typeof key === 'string' && key.length > 0 && key.length < 256)
  && new Set(keys).size === keys.length;

function counters() {
  return {
    withLevel: 0, withTrend: 0, unroutedOrUnbound: 0, recordedBasisMismatch: 0,
    missingTrendReasons: { unroutedOrUnbound: 0, recordedBasisMismatch: 0,
      missingQualifiedFutureEndpoint: 0, incompatibleFutureEndpoint: 0, compatibleEndpoint: 0 },
    missingQualifiedFutureEndpoint: 0, incompatibleFutureEndpoint: 0, compatibleEndpoint: 0,
    comparableButStoredTrendMissing: 0, nonComparableButStoredTrendPresent: 0,
    changesAtIncompatibleEndpoint: { modelRun: 0, collection: 0, grid: 0, identity: 0, zonePolicy: 0 },
  };
}

function inputFailure(code) {
  throw Object.assign(new Error(code), { safeCode: code });
}

function readbackRouter(normal, index, zone, keys, times) {
  const sources = keys.map(key => {
    const original = index.get(key);
    return { sourceKey: key, stationId: key, point: original?.point };
  });
  const simulated = normal.applyVerifiedWaterSourceRoutingToPartHourly({
    part: { partId: 'READBACK-ONLY', zoneId: zone, waterPoint: [0, 0] },
    parentFeature: { properties: {} }, hourly: times.map(time => ({ time })),
    sources, index, haversineKm: () => 1,
    routing: { zones: { [zone]: { enabled: true, requireAll: true,
      stations: keys.map(key => ({ sourceKey: key })) } } },
  });
  return new Map(simulated.hourly.map(row => [row.time, row]));
}

function differenceFlags(source, future, allowed, zone) {
  return {
    modelRun: source.modelRun !== future.modelRun,
    collection: source.collection !== future.collection,
    grid: source.gridDefinitionSha256 !== future.gridDefinitionSha256 || !same(source.gridPoint, future.gridPoint),
    identity: source.entityId !== future.entityId || source.provider !== future.provider,
    zonePolicy: !allowed(future.collection, zone, 'waterLevel'),
  };
}

// Routes supplied here are only the source sets archived by the original
// normal zone caller, or the exact Fur part set bound by its original trace.
export function projectSourcePairs({ referenceAt, zone, storedRows, selected, index, normal, allowed, basisCheck, offsets }) {
  const output = counters();
  const sourceRows = new Map();
  const decisionsByKeys = new Map();
  const hours = offsets ?? Array.from({ length: PUBLIC_HOURS }, (_, hour) => hour);
  const times = hours.map(hour => at(referenceAt, hour));
  for (const [position, time] of times.entries()) {
    const hour = hours[position];
    const stored = storedRows.get(time);
    const keys = selected(time, stored);
    const trace = basisCheck?.(time);
    if (trace && (finite(stored?.waterLevelCm) !== trace.outputValuePresent)) inputFailure('FUR_TRACE_OUTPUT_MISMATCH');
    if (validKeys(keys) && keys.every(key => index.has(key))) {
      for (const key of keys) if (!sourceRows.has(key))
        sourceRows.set(key, new Map(index.get(key).hourly.map(row => [row.time, row])));
      const group = JSON.stringify(keys);
      if (!decisionsByKeys.has(group)) decisionsByKeys.set(group, readbackRouter(normal, index, zone, keys, times));
    }
    const normalRow = decisionsByKeys.get(JSON.stringify(keys))?.get(time);
    const present = finite(normalRow?.waterLevelCm);
    if (trace && present !== trace.routedValuePresent) inputFailure('FUR_TRACE_ROUTE_MISMATCH');
    if (!finite(stored?.waterLevelCm)) continue;
    output.withLevel++;
    const knownTrend = finite(stored.waterLevelTrendCm3h);
    output.withTrend += Number(knownTrend);
    const count = reason => {
      output[reason]++;
      if (!knownTrend) output.missingTrendReasons[reason]++;
    };
    if (!validKeys(keys) || trace?.routedValuePresent === false) {
      count('unroutedOrUnbound');
      continue;
    }
    if (!present || !same(levelProof(normalRow)?.sourceKeys, keys)) {
      count('recordedBasisMismatch');
      continue;
    }
    if (!trace) {
      // Stored zone SOURCE metadata binds T to the exact packed SOURCE versions.
      const recorded = levelProof(stored);
      const replayed = levelProof(normalRow);
      if (!same(recorded.collections, replayed.collections) || !same(recorded.modelRuns, replayed.modelRuns)
        || !same(recorded.nativeValidTimes, replayed.nativeValidTimes)) {
        count('recordedBasisMismatch');
        continue;
      }
    }
    const futureTime = at(referenceAt, hour + 3);
    const future = keys.map(key => sourceRows.get(key).get(futureTime));
    const normalComparable = finite(normalRow.waterLevelTrendCm3h);
    if (future.some(row => !finite(row?.waterLevelCm))) {
      if (normalComparable) inputFailure('NORMAL_ROUTE_PARITY');
      count('missingQualifiedFutureEndpoint');
    } else if (!normalComparable) {
      count('incompatibleFutureEndpoint');
      const changes = Object.keys(output.changesAtIncompatibleEndpoint).filter(reason => keys.some((key, i) => {
        const oldProof = levelProof(sourceRows.get(key).get(time));
        return differenceFlags(oldProof, levelProof(future[i]), allowed, zone)[reason];
      }));
      if (!changes.length) inputFailure('NORMAL_ROUTE_PARITY');
      for (const reason of changes) output.changesAtIncompatibleEndpoint[reason]++;
    } else {
      count('compatibleEndpoint');
    }
    output.comparableButStoredTrendMissing += Number(normalComparable && !knownTrend);
    output.nonComparableButStoredTrendPresent += Number(!normalComparable && knownTrend);
  }
  return output;
}

function hourlyIndex(rows) {
  if (!Array.isArray(rows) || rows.length > 121 || new Set(rows.map(row => row?.time)).size !== rows.length)
    inputFailure('FORECAST_HOUR_INVENTORY');
  return new Map(rows.map(row => [row.time, row]));
}

async function readSelectedPublicPartWeather(module, packPath, conditions, scope, { target = TARGET, publicEvidence, offsets, sourceDetailsSha256, expectedModelBinding } = {}) {
  const { manifest, payloadOffset, bytes } = await module.inspectPrivatePublicHourDeliveryPack({ packPath, conditions });
  if (manifest.datasetId !== target.datasetId || manifest.productionReferenceAt !== target.productionReferenceAt
    || manifest.entries.length !== PUBLIC_HOURS
    || (sourceDetailsSha256 && manifest.sourceDetailsSha256 !== sourceDetailsSha256)
    || (expectedModelBinding && !b374Equal(manifest.modelBinding, expectedModelBinding))) inputFailure('PUBLIC_HOUR_BINDING');
  const selected = new Map([...scope].map(([id, zone]) => [id, { zone, rows: new Map() }]));
  let position = payloadOffset;
  const handle = await fs.open(packPath, 'r');
  try {
    for (const [hour, entry] of manifest.entries.entries()) {
      if (entry.time !== at(target.productionReferenceAt, hour)) inputFailure('PUBLIC_HOUR_AXIS');
      if (offsets && !offsets.includes(hour)) {
        position += entry.compressedBytes;
        continue;
      }
      const compressed = Buffer.alloc(entry.compressedBytes);
      let read = 0;
      while (read < compressed.length) {
        const { bytesRead } = await handle.read(compressed, read, compressed.length - read, position + read);
        if (!bytesRead) inputFailure('PUBLIC_HOUR_TRUNCATED');
        read += bytesRead;
      }
      position += compressed.length;
      if (sha(compressed) !== entry.compressedSha256) inputFailure('PUBLIC_HOUR_COMPRESSED_DIGEST');
      const raw = await unzip(compressed, { maxOutputLength: entry.bytes });
      if (raw.length !== entry.bytes || sha(raw) !== entry.sha256) inputFailure('PUBLIC_HOUR_DIGEST');
      const document = JSON.parse(raw.toString('utf8'));
      if (document.datasetId !== conditions.datasetId || document.generatedAt !== conditions.generatedAt
        || document.productionReferenceAt !== conditions.productionReferenceAt
        || document.delivery?.schemaVersion !== 1 || document.delivery.kind !== 'hour'
        || document.delivery.key !== entry.time || document.delivery.sourceDetailsSha256 !== manifest.sourceDetailsSha256
        || !Object.keys(manifest.modelBinding).every(key => document.delivery.modelBinding?.[key] === manifest.modelBinding[key])) {
        inputFailure('PUBLIC_HOUR_BINDING');
      }
      publicEvidence?.collect(hour, document.coastalParts?.parts);
      for (const [id, entryOutput] of selected) {
        const part = document.coastalParts?.parts?.[id];
        if (part?.id !== id || part.zoneId !== entryOutput.zone || part.current?.time !== entry.time || !part.current.weather)
          inputFailure('PUBLIC_PART_BINDING');
        const { waterLevelCm, waterLevelTrendCm3h } = part.current.weather;
        if ((waterLevelCm != null && !finite(waterLevelCm)) || (waterLevelTrendCm3h != null && !finite(waterLevelTrendCm3h)))
          inputFailure('PUBLIC_PART_WATER_TYPE');
        entryOutput.rows.set(entry.time, { time: entry.time, waterLevelCm, waterLevelTrendCm3h });
      }
    }
  } finally { await handle.close(); }
  if (position !== bytes) inputFailure('PUBLIC_HOUR_EOF');
  return selected;
}

export function projectSibirienDirectWater({ part, direct, publicPart, adapter,
  referenceAt = TARGET.productionReferenceAt, offsets = [6, 7] }) {
  const unknown = reason => ({ status: 'UNKNOWN', reason });
  if (part?.partId !== SIBIRIEN_PART || part.zoneId !== SIBIRIEN_ZONE || publicPart?.zone !== SIBIRIEN_ZONE
    || !(publicPart.rows instanceof Map)
    || !Array.isArray(direct?.hourly) || direct.hourly.length !== 121
    || !same(direct.point, part.waterPoint)
    || direct.hourly.some((row, hour) => row?.time !== at(referenceAt, hour)))
    return unknown('SIBIRIEN_DIRECT_PART_UNBOUND');
  const bulkId = 'PART::' + SIBIRIEN_PART;
  const hours = offsets.map(hour => {
    const before = direct.hourly[hour], after = direct.hourly[hour + 3];
    const observed = publicPart.rows.get(before.time), observedFuture = publicPart.rows.get(after.time);
    if (observed?.time !== before.time || observedFuture?.time !== after.time)
      return { hour, ...unknown('SIBIRIEN_PUBLIC_TIME_UNBOUND') };
    // Exercise the actual PART water sanitizer and series predicate. Other
    // fields are unrelated and are not needed for this read-only observation.
    const sample = [before, after].map(row => ({ time: row.time, waterLevelCm: row.waterLevelCm,
      sources: { waterLevel: levelProof(row) } }));
    const [start, future] = adapter.verifiedIntegratedPartHourly({ hourly: sample }, null, bulkId, part);
    if (start?.time !== before.time || future?.time !== after.time)
      return { hour, ...unknown('SIBIRIEN_DIRECT_TIME_UNBOUND') };
    const directLevelVerified = finite(start.waterLevelCm);
    const directFutureVerified = finite(future.waterLevelCm);
    const directTrendPresent = finite(start.waterLevelTrendCm3h);
    const publicLevelPresent = finite(observed.waterLevelCm);
    const publicTrendPresent = finite(observed.waterLevelTrendCm3h);
    const sourceOverrideProved = publicLevelPresent && (before.waterLevelCm === null
      || (directTrendPresent && observed.waterLevelTrendCm3h === null && start.waterLevelCm === observed.waterLevelCm));
    let directPair = 'DIRECT_ENDPOINT_UNQUALIFIED';
    if (directLevelVerified && directFutureVerified) {
      const left = start.waterLevelProvenance, right = future.waterLevelProvenance;
      directPair = directTrendPresent ? 'COMPARABLE_DIRECT_SERIES'
        : left.modelRun !== right.modelRun ? 'DIRECT_MODEL_RUN_DIFFERS'
          : left.collection !== right.collection ? 'DIRECT_COLLECTION_DIFFERS' : 'DIRECT_GRID_OR_OTHER_SERIES_DIFFERS';
    }
    return { hour, directLevelVerified, directFutureVerified, directTrendPresent, directPair,
      publicLevelPresent, publicFutureLevelPresent: finite(observedFuture.waterLevelCm), publicTrendPresent,
      sourceOverride: sourceOverrideProved ? 'PROVED' : 'UNKNOWN' };
  });
  return { status: 'OBSERVED', hours };
}

async function readSibirienDirectWater({ indexed, forecast, conditions, publicPart, load, target = TARGET, offsets }) {
  const original = conditions.coastalParts?.parts?.[SIBIRIEN_PART];
  const bank = indexed.continuity;
  const ids = Object.keys(conditions.coastalParts?.parts ?? {}).sort((a, b) => a.localeCompare(b));
  const unknown = reason => ({ status: 'UNKNOWN', reason });
  if (original?.zoneId !== SIBIRIEN_ZONE || ids.length !== 673
    || bank?.metadata?.partCount !== ids.length || bank.entries.length !== ids.length
    || bank.metadata.productionReferenceAt !== target.productionReferenceAt || publicPart?.zone !== SIBIRIEN_ZONE)
    return unknown('SIBIRIEN_DIRECT_PART_UNBOUND');
  try {
    const entry = await forecast.readDmiForecastRecord(indexed, bank.entries[ids.indexOf(SIBIRIEN_PART)]);
    if (entry.partId !== SIBIRIEN_PART || !same(entry.point, original.waterPoint))
      return unknown('SIBIRIEN_DIRECT_PART_UNBOUND');
    const [continuity, adapter] = await Promise.all([load('scripts/lib/dmi-part-continuity.mjs'),
      load('scripts/lib/ravscore-production-adapters.mjs')]);
    const part = { ...original, partId: SIBIRIEN_PART };
    // The bundle already authenticates the entire original bank. This
    // one-entry view reuses its normal bounded byte/identity validation
    // without decompressing the other 672 original PART records.
    const qualified = await continuity.unpackDmiPartContinuity({
      ...bank.metadata, partCount: 1, entries: [entry], rawBytes: entry.rawBytes, compressedBytes: entry.compressedBytes,
    }, [part], target.productionReferenceAt);
    return projectSibirienDirectWater({ part, direct: qualified.get(SIBIRIEN_PART), publicPart, adapter, referenceAt: target.productionReferenceAt, offsets });
  } catch {
    return unknown('SIBIRIEN_VERIFIED_DIRECT_READ_REFUSED');
  }
}

export function qualifyLf7Reconstruction({ conditions, diagnostics, routing, features, sourceRegistry,
  parts, normal, index, haversineKm, referenceAt }) {
  const unknown = reason => ({ reason, selections: new Map() });
  const observed = diagnostics?.lf7WaterRouting;
  if (diagnostics?.datasetId !== conditions.datasetId || diagnostics.productionReferenceAt !== referenceAt
    || diagnostics.generatedAt !== conditions.generatedAt || observed?.referenceAt !== referenceAt
    || observed?.kind !== 'LF7_WATER_ROUTING_OBSERVATION' || ![1, 2].includes(observed.schemaVersion))
    return unknown('ORIGINAL_LF7_OBSERVATION_UNAVAILABLE');
  if (normal.waterRoutingConfigurationSha256(routing) !== observed.configurationSha256)
    return unknown('ORIGINAL_ROUTING_CONFIGURATION_UNPROVED');
  if (!Array.isArray(features) || !Array.isArray(sourceRegistry))
    return unknown('ORIGINAL_REGISTRY_OR_FEATURES_UNPROVED');
  const byZone = new Map(features.map(feature => [feature.properties?.id, feature]));
  const lf7 = Object.entries(conditions.coastalParts.parts)
    .filter(([, part]) => normal.lf7WaterOnlyZone(part.zoneId));
  if (lf7.length !== observed.expectedPartCount || lf7.length !== observed.observedPartCount
    || lf7.length * PUBLIC_HOURS !== observed.expectedPartHours
    || new Set(lf7.map(([, part]) => part.zoneId)).size !== 7)
    return unknown('ORIGINAL_LF7_SCOPE_UNPROVED');
  const times = Array.from({ length: PUBLIC_HOURS }, (_, hour) => at(referenceAt, hour));
  const selections = new Map();
  const selectedProofs = [], publicValues = [];
  let routed = 0, comparable = 0;
  for (const [partId, part] of lf7) {
    const originalPart = parts.get(partId);
    if (!originalPart || !byZone.has(part.zoneId)) return unknown('ORIGINAL_LF7_PART_UNPROVED');
    const replay = normal.applyVerifiedWaterSourceRoutingToPartHourly({
      part: { partId, zoneId: part.zoneId, waterPoint: part.waterPoint, landPoint: part.landPoint },
      parentFeature: byZone.get(part.zoneId), sources: sourceRegistry, hourly: times.map(time => ({ time })),
      index, routing, haversineKm, diagnosticReferenceAt: referenceAt,
    });
    const selection = replay.waterRoutingObservation?.selectionSha256;
    if (!/^[a-f0-9]{64}$/.test(selection ?? '')) return unknown('ORIGINAL_LF7_SELECTION_UNPROVED');
    selectedProofs.push([partId, selection]);
    const byTime = new Map();
    for (const result of replay.hourly) {
      const actual = originalPart.rows.get(result.time);
      if (!actual) return unknown('ARCHIVED_PUBLIC_HOUR_UNPROVED');
      publicValues.push([partId, result.time, actual.waterLevelCm ?? null, actual.waterLevelTrendCm3h ?? null]);
      if (!finite(result.waterLevelCm)) continue;
      const keys = levelProof(result)?.sourceKeys;
      if (!validKeys(keys) || (actual.waterLevelCm ?? null) !== result.waterLevelCm
        || (actual.waterLevelTrendCm3h ?? null) !== (result.waterLevelTrendCm3h ?? null))
        return unknown('ARCHIVED_LF7_VALUE_REPLAY_DIFFERS');
      byTime.set(result.time, keys);
      routed++;
      comparable += Number(finite(result.waterLevelTrendCm3h));
    }
    selections.set(partId, byTime);
  }
  if (sha(JSON.stringify(selectedProofs.sort((a,b) => a[0].localeCompare(b[0])))) !== observed.selectionSha256)
    return unknown('ORIGINAL_LF7_SELECTION_DIGEST_DIFFERS');
  if (sha(JSON.stringify(publicValues.sort((a,b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))))
      !== observed.computedValuesSha256 || observed.counts?.computedValueMismatchHours !== 0
    || routed !== observed.counts.routedHours || comparable !== observed.counts.comparableT3Hours
    || routed - comparable !== observed.counts.unknownT3Hours) return unknown('ORIGINAL_LF7_OUTCOME_DIGEST_DIFFERS');
  return { reason: 'ORIGINAL_LF7_SELECTION_AND_VALUES_MATCH', selections };
}

// Only fixed times and established diagnostics survive this projection.
export function projectDkssOnsetQueue(document, referenceAt, offsets = [6, 7, 9, 10],
  includeObservedDemand = false, includeQualification = false) {
  const diagnostics = document?.diagnostics;
  const queues = diagnostics?.currentAcquisitionPlan?.firstTurnOrder;
  const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 100_000 ? value : null;
  const results = {};
  for (const collection of ['dkss_idw', 'dkss_nsbs', 'dkss_lf']) {
    const entry = queues?.[collection];
    if (entry?.available !== true || entry.collection !== collection
      || Date.parse(entry.productionReferenceAt) !== Date.parse(referenceAt)
      || !Array.isArray(entry.orderedHours) || entry.orderedHours.length > 512) continue;
    const processed = document?.runs?.[collection];
    const processedTimes = Date.parse(processed?.referenceTime) === Date.parse(entry.modelRun)
      && Array.isArray(processed?.processedValidTimes) && processed.processedValidTimes.length <= 512
      ? new Set(processed.processedValidTimes.map(value => Date.parse(value))) : null;
    results[collection] = offsets.map(offset => {
      const time = at(referenceAt, offset);
      const rows = entry.orderedHours.filter(candidate => Date.parse(candidate?.validTime) === Date.parse(time));
      const row = rows.length === 1 ? rows[0] : null;
      return { offset, firstQueueRank: count(row?.rank),
        retainedGapCount: count(row?.retainedScalarGapPairCount),
        waterLevelWasRequired: Array.isArray(row?.missingComponentKinds)
          ? row.missingComponentKinds.includes('waterLevel') : null,
        selectedRunProcessedTime: processedTimes?.has(Date.parse(time)) ?? null,
        ...(includeQualification ? {
          maintenance: typeof entry.maintenance === 'boolean' ? entry.maintenance : null,
          retainedScalarPlanQualified: typeof row?.retainedScalarPlanQualified === 'boolean'
            ? row.retainedScalarPlanQualified : null,
        } : {}),
        ...(includeObservedDemand ? {
          offeredModelRun: Number.isFinite(Date.parse(entry.modelRun))
            ? new Date(Date.parse(entry.modelRun)).toISOString() : null,
          classifierPriority: count(row?.classifierPriority),
          currentMissingPairCount: count(row?.currentMissingPairCount),
          currentUpgradePairCount: count(row?.currentUpgradePairCount),
          regionalCurrentPotentialPairCount: count(row?.regionalCurrentPotentialPairCount),
          missingComponentKinds: Array.isArray(row?.missingComponentKinds)
            ? ['configuration', 'current', 'currentUpgrade', 'regionalCurrent', 'waterLevel', 'waterTemperature', 'windTail']
              .filter(kind => row.missingComponentKinds.includes(kind)) : null,
        } : {}) };
    });
  }
  return results;
}

function projectFixedOnsetDmiEvidence(document, referenceAt, hours) {
  const plan = document?.diagnostics?.qualifiedScalarAcquisitionPlan;
  let qualification = 'UNKNOWN';
  if (plan?.present === true && plan.valid === true && plan.sourceAdmission === false
    && plan.scope === 'qualified-retained-value-gaps-before-native-takeover') {
    qualification = 'QUALIFIED_ADVISORY';
  } else if (plan?.present === true && plan.valid === false
    && plan.failureCode === 'QUALIFIED_SCALAR_PLAN_UNUSABLE'
    && plan.scope === 'conservative-native-priority') {
    qualification = 'UNUSABLE_CONSERVATIVE';
  }
  return {
    retainedScalarPlanQualification: qualification,
    preAcquisitionWaterTrendGap: 'UNKNOWN_MASK_NOT_ARCHIVED',
    bulkOnsetQueue: projectDkssOnsetQueue(document, referenceAt, hours, true, true),
  };
}

export function projectB365DmiEvidence(document) {
  return projectFixedOnsetDmiEvidence(document, B365_TARGET.productionReferenceAt, B365_HOURS);
}

export function projectB368DmiEvidence(document) {
  return projectFixedOnsetDmiEvidence(document, B368_TARGET.productionReferenceAt, B368_HOURS);
}

export function createB361PublicEndpointEvidence() {
  return createPublicEndpointEvidence(B361_TARGET, B361_OFFSETS, 'B361', 586);
}

export function createB363PublicEndpointEvidence(expectedParts) {
  if (!(expectedParts instanceof Map) || expectedParts.size !== 673) inputFailure('B363_PUBLIC_PART_INVENTORY');
  return createPublicEndpointEvidence(B363_TARGET, B363_PAIRS, 'B363', 0, expectedParts);
}

export function createB365PublicEndpointEvidence(expectedParts) {
  if (!(expectedParts instanceof Map) || expectedParts.size !== 673) inputFailure('B365_PUBLIC_PART_INVENTORY');
  return createPublicEndpointEvidence(B365_TARGET, B365_PAIRS, 'B365', 0, expectedParts);
}

export function createB368PublicEndpointEvidence(expectedParts) {
  if (!(expectedParts instanceof Map) || expectedParts.size !== 673) inputFailure('B368_PUBLIC_PART_INVENTORY');
  return createPublicEndpointEvidence(B368_TARGET, B368_PAIRS, 'B368', 0, expectedParts);
}

function createPublicEndpointEvidence(target, offsets, label, expectedFirstTrend, expectedParts) {
  const requests = new Set(offsets.flatMap(hour => [hour, hour + 3]));
  const rows = new Map();
  return {
    collect(hour, parts) {
      if (!requests.has(hour)) return;
      const entries = Object.entries(parts ?? {});
      if (entries.length !== 673 || rows.has(hour)) inputFailure(label + '_PUBLIC_PART_INVENTORY');
      const time = at(target.productionReferenceAt, hour);
      rows.set(hour, new Map(entries.map(([id, part]) => {
        if (part?.id !== id || part.current?.time !== time || !part.current.weather
            || (expectedParts && (!expectedParts.has(id) || part.zoneId !== expectedParts.get(id))))
          inputFailure(label + '_PUBLIC_PART_BINDING');
        const { waterLevelCm, waterLevelTrendCm3h } = part.current.weather;
        if ((waterLevelCm != null && !finite(waterLevelCm)) || (waterLevelTrendCm3h != null && !finite(waterLevelTrendCm3h)))
          inputFailure(label + '_PUBLIC_PART_WATER_TYPE');
        return [id, [finite(waterLevelCm), finite(waterLevelTrendCm3h)]];
      })));
    },
    finish() {
      const counts = offsets.map(offset => {
        const start = rows.get(offset), support = rows.get(offset + 3);
        if (!start || !support || [...start.keys()].some(id => !support.has(id)))
          inputFailure(label + '_PUBLIC_HOUR_UNBOUND');
        let withBothLevels = 0, trendPresent = 0, missingDespiteBoth = 0;
        for (const [id, [level, trend]] of start) {
          const both = level && support.get(id)[0];
          withBothLevels += Number(both);
          trendPresent += Number(trend);
          missingDespiteBoth += Number(both && !trend);
        }
        return { offset, time: at(target.productionReferenceAt, offset),
          withBothLevels, trendPresent, missingDespiteBoth };
      });
      const first = counts[0];
      const firstStart = rows.get(offsets[0]);
      if ([...firstStart.values()].some(([level]) => !level) || first.trendPresent !== expectedFirstTrend
          || (label === 'B361' && (first.withBothLevels !== 673 || first.missingDespiteBoth !== 87)))
        inputFailure(label + '_KNOWN_PUBLIC_OBSERVATION_MISMATCH');
      return counts;
    },
  };
}

async function readAuthenticatedProjection({ payload, root, load, target = TARGET }) {
  const isB361 = target === B361_TARGET;
  const isB363 = target === B363_TARGET;
  const isB365 = target === B365_TARGET;
  const isB368 = target === B368_TARGET;
  const fixedStart = isB363 || isB365 || isB368;
  const pairOffsets = isB368 ? B368_PAIRS : isB365 ? B365_PAIRS : isB363 ? B363_PAIRS : isB361 ? B361_OFFSETS : undefined;
  const endpointHours = isB368 ? B368_HOURS : isB365 ? B365_HOURS : isB363 ? B363_HOURS : undefined;
  const sourceDetailsSha256 = isB368 ? B368_SOURCE_DETAILS_SHA256 : isB365 ? B365_SOURCE_DETAILS_SHA256
    : isB363 ? B363_SOURCE_DETAILS_SHA256 : isB361 ? B361_SOURCE_DETAILS_SHA256 : undefined;
  const publicEvidence = isB361 ? createB361PublicEndpointEvidence() : null;
  const [forecast, normal, policy, fur, publicHours, partRecovery, bulk] = await Promise.all([
    load('scripts/lib/dmi-forecast-file.mjs'), load('scripts/lib/water-source-forecast-routing.mjs'),
    load('scripts/lib/dmi-marine-zone-exclusions.mjs'), load('scripts/lib/fur-water-routing-diagnostic.mjs'),
    load('scripts/lib/public-hour-delivery-pack.mjs'), load('scripts/lib/private-dmi-recovery-record.mjs'),
    load('scripts/lib/dmi-bulk-storage.mjs'),
  ]);
  const indexed = await forecast.inspectDmiForecastFile(path.join(payload, 'data/live/dmi-forecast-cache.json'));
  if (indexed.zones.size !== 210) inputFailure('FORECAST_ZONE_INVENTORY');
  const packed = await forecast.readDmiWaterSourceContinuity(indexed);
  if (packed?.productionReferenceAt !== target.productionReferenceAt) inputFailure('SOURCE_CONTINUITY_GENERATION');
  // The production reader qualifies every SOURCE hourly proof. Its internal
  // verifiedDmiSourceRows is also called by the normal router below.
  const index = await normal.unpackWaterSourceForecastContinuity(packed, target.productionReferenceAt);
  const allowed = policy.dmiMarineCollectionAllowedForZone;
  const options = { normal, index, allowed, referenceAt: target.productionReferenceAt };
  const zones = {}, routedZoneOffsets = {};
  for (const zone of ZONE_IDS) {
    const descriptor = indexed.zones.get(zone);
    if (!descriptor) inputFailure('FORECAST_ZONE_MISSING');
    const original = await forecast.readDmiForecastRecord(indexed, descriptor);
    const selected = (_time, row) => {
      const source = levelProof(row);
      return source?.provider === 'dmi' && source.routing === 'dmi-water-source-interpolation' ? source.sourceKeys : null;
    };
    const scope = { ...options, zone, storedRows: hourlyIndex(original.hourly), selected };
    zones[zone] = projectSourcePairs({ ...scope, offsets: fixedStart ? pairOffsets : undefined });
    if (pairOffsets) routedZoneOffsets[zone] = pairOffsets.map(offset => {
      const { withLevel, withTrend, missingTrendReasons, changesAtIncompatibleEndpoint } =
        projectSourcePairs({ ...scope, offsets: [offset] });
      return { offset, withLevel, withTrend, missingTrendReasons, changesAtIncompatibleEndpoint };
    });
  }

  const conditions = JSON.parse(await fs.readFile(path.join(payload, 'data/live/conditions.json'), 'utf8'));
  const trace = conditions.furWaterRoutingDiagnostic;
  if (conditions.datasetId !== target.datasetId || conditions.productionReferenceAt !== target.productionReferenceAt)
    inputFailure('CONDITIONS_GENERATION');
  const knownParts = Object.entries(conditions.coastalParts?.parts ?? {});
  const targetParts = new Map(knownParts
    .filter(([id, part]) => fixedStart ? [FUR_PART, SIBIRIEN_PART].includes(id)
      : ZONE_IDS.includes(part?.zoneId) || normal.lf7WaterOnlyZone(part?.zoneId))
    .map(([id, part]) => [id, part.zoneId]));
  if (targetParts.size < (fixedStart ? 2 : 4) || targetParts.size > 64 || targetParts.get(FUR_PART) !== FUR_ZONE
      || (fixedStart && targetParts.get(SIBIRIEN_PART) !== SIBIRIEN_ZONE)) inputFailure('PRIVATE_PART_SCOPE');
  const expectedParts = fixedStart ? new Map(knownParts.map(([id, part]) => [id, part.zoneId])) : null;
  const exactEvidence = isB368 ? createB368PublicEndpointEvidence(expectedParts)
    : isB365 ? createB365PublicEndpointEvidence(expectedParts)
    : isB363 ? createB363PublicEndpointEvidence(expectedParts) : publicEvidence;
  const partWeather = await readSelectedPublicPartWeather(publicHours, path.join(payload, '.cache/public-hour-delivery.pack'),
    conditions, targetParts, { target, publicEvidence: exactEvidence,
      offsets: endpointHours, sourceDetailsSha256 });
  const directArchive = await readSibirienDirectWater({ indexed, forecast, conditions,
    publicPart: partWeather.get(SIBIRIEN_PART), load, target, offsets: pairOffsets });
  // Exact archived direct bindings do not identify the final selected PART
  // series when Sibirien lacks an original routed selection observation.
  const sibirienDirectWater = fixedStart && directArchive.status === 'OBSERVED' ? {
    ...directArchive, evidence: 'ARCHIVED_DIRECT_PART_AND_PUBLIC_VALUES_FINAL_SOURCE_UNKNOWN',
    hours: directArchive.hours.map(({ sourceOverride, ...hour }) => ({
      ...hour, archivedDirectResultDiffersFromPublic: sourceOverride === 'PROVED',
    })),
  } : directArchive;
  const hasTrace = fur.validFurWaterRoutingDiagnostic(trace, { datasetId: target.datasetId })
    && trace.productionReferenceAt === target.productionReferenceAt && trace.generatedAt === conditions.generatedAt
    && Object.keys(trace.trace.hours).length === PUBLIC_HOURS;
  const keysByHash = new Map([...index].map(([key, record]) => [sha(JSON.stringify([key, record.point])), key]));
  const furKeys = hasTrace ? trace.trace.selectedSourceIdentitiesSha256.map(identity => keysByHash.get(identity)) : null;
  const json = async (base, relative) => {
    const name = path.join(base, relative);
    const stat = await fs.lstat(name);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 64 * 1024 * 1024) return null;
    return JSON.parse(await fs.readFile(name, 'utf8'));
  };
  let lf7 = { reason: 'FULL_LF7_RECONSTRUCTION_OUTSIDE_FIXED_THREE_HOUR_SCOPE', selections: new Map() };
  if (!fixedStart) {
    const [routing, geography, registry, diagnostics] = await Promise.all([
      json(root, 'data/water-level-station-routing.json').catch(() => null),
      json(root, 'data/zones.geojson').catch(() => null),
      json(payload, 'data/live/dmi-water-stations.json'), json(payload, 'data/live/ravradar-runtime-diagnostics.json'),
    ]);
    // A tracked routing file is only a candidate. Reject whenever the active
    // hydrated configuration, selected sets or saved results do not match.
    lf7 = qualifyLf7Reconstruction({ conditions, diagnostics, routing, features: geography?.features,
      sourceRegistry: registry?.stations, parts: partWeather, normal, index, haversineKm: partRecovery.haversineKm,
      referenceAt: target.productionReferenceAt });
  }
  const parts = {};
  for (const [id, { zone, rows }] of partWeather) {
    if (!ZONE_IDS.includes(zone)) continue;
    const provenFurSelection = id === FUR_PART && validKeys(furKeys);
    const lf7Selection = lf7.selections.get(id);
    parts[id] = {
      zone, evidence: provenFurSelection ? 'ORIGINAL_PART_SOURCE_IDENTITIES'
        : lf7Selection ? 'ORIGINAL_LF7_SELECTION_AND_VALUES_MATCH' : 'PUBLIC_VALUES_WITHOUT_PROVEN_PART_SELECTION',
      ...projectSourcePairs({ ...options, zone, storedRows: rows, offsets: fixedStart ? pairOffsets : undefined,
        selected: time => provenFurSelection ? furKeys : lf7Selection?.get(time),
        basisCheck: provenFurSelection ? time => trace.trace.hours[time]
          : lf7Selection ? time => ({ outputValuePresent: finite(rows.get(time)?.waterLevelCm),
            routedValuePresent: lf7Selection.has(time) }) : undefined }),
    };
  }
  const queueOffsets = isB363 ? [0, 1, 2, 3, 6] : isB361
    ? [...new Set(B361_OFFSETS.flatMap(hour => [hour, hour + 3]))].sort((a, b) => a - b) : undefined;
  const projectOnsetEvidence = isB368 ? projectB368DmiEvidence : isB365 ? projectB365DmiEvidence : null;
  const bulkProjection = await bulk.readDmiBulkDocument(path.join(payload, 'data/live/dmi-bulk-cache.json'), { expandSources: false })
    .then(document => projectOnsetEvidence ? projectOnsetEvidence(document)
      : { bulkOnsetQueue: projectDkssOnsetQueue(document, target.productionReferenceAt, queueOffsets, isB363) })
    .catch(() => projectOnsetEvidence ? projectOnsetEvidence(null) : { bulkOnsetQueue: {} });
  const { bulkOnsetQueue } = bulkProjection;
  return { zoneEvidence: 'ARCHIVED_ZONE_ROUTING_SEPARATE_FROM_PUBLIC_WINNING_PART', lf7Evidence: lf7.reason,
    zones, parts, bulkOnsetQueue, sibirienDirectWater,
    ...(exactEvidence ? { nationalPublicEndpointPresence: exactEvidence.finish(), routedZoneOffsets,
      publicManifestReceiptSha256: isB368 ? B368_PUBLIC_MANIFEST_SHA256 : isB365 ? B365_PUBLIC_MANIFEST_SHA256
        : isB363 ? B363_PUBLIC_MANIFEST_SHA256 : B361_PUBLIC_MANIFEST_SHA256,
      sourceDetailsSha256 } : {}),
    ...(projectOnsetEvidence ? {
      retainedScalarPlanQualification: bulkProjection.retainedScalarPlanQualification,
      preAcquisitionWaterTrendGap: bulkProjection.preAcquisitionWaterTrendGap,
    } : {}),
    ...(fixedStart ? {
      queueEvidence: Object.keys(bulkOnsetQueue).length ? 'FIRST_COLLECTION_TURN_AND_RUN_ASSET_LEVEL_ONLY'
        : 'UNKNOWN_FIRST_TURN_OR_PROCESSED_LEDGER_UNAVAILABLE',
    } : {}) };
}


const ARCHIVED_READERS = Object.freeze({
  'scripts/private-production-runtime-workflow.mjs': 'f2dbd4219c61b4f936acdf0baa3f553cf9dd699c221af250df9cbed64a7138fa',
  'scripts/staged-private-production-runtime.mjs': 'd2dc355951de8eeafe717da55e9ac73bd5dc1388abada20d34a50401e6628436',
  'scripts/private-production-runtime-bundle.mjs': '2eeff25c6d6e769c7a5d9b414bfed574e0105e7cb24d0bd1578e7700781d5529',
});

export const B358_ARTIFACT = Object.freeze({
  id: 14622782203, bytes: 258070752,
  digest: 'sha256:9b43be2665c623f5034938b6f6a9924f3bd45c38aafde8b20ed2175784f6731e',
});
export const B361_ARTIFACT = Object.freeze({
  id: 14676798657, bytes: 258872168,
  digest: 'sha256:49a2a8eb748f05a9b419ed648bff9ff6698014401fb34a4a3ff68fbb79a46255',
});

export const B363_ARTIFACT = Object.freeze({
  id: 14696629646, bytes: 260332852,
  digest: 'sha256:e3fecb39d3140aa3bc3d0b5611fef3c0ae75eef48756434b780ee07b33fa6626',
});

export function createB363ArtifactFetch(fetchImpl) {
  return createFixedArtifactFetch(fetchImpl, B363_TARGET, B363_ARTIFACT, 'B363');
}

export const B365_ARTIFACT = Object.freeze({
  id: 14712116358, bytes: 259601038,
  digest: 'sha256:5bab261f17debf1b9d5cb53cb0957572148413ca72a306f07a4063c1bdbeb454',
});

export function createB365ArtifactFetch(fetchImpl) {
  return createFixedArtifactFetch(fetchImpl, B365_TARGET, B365_ARTIFACT, 'B365');
}

export const B368_ARTIFACT = Object.freeze({
  id: 14737045530, bytes: 259729859,
  digest: 'sha256:c60ae9c00f6753c41d4dece5f0307a12e580ff53c0064b79f7708068964d7b1f',
});

export function createB368ArtifactFetch(fetchImpl) {
  return createFixedArtifactFetch(fetchImpl, B368_TARGET, B368_ARTIFACT, 'B368');
}

const FIXED_EPISODES = new Map([
  [TARGET, { label: 'B358', exactArtifact: B358_ARTIFACT, fixedTransport: createB358ArtifactFetch,
    readers: 'ravradar-b358-reader99eb', output: 'ravradar-b358-water-audit' }],
  [B361_TARGET, { label: 'B361', exactArtifact: B361_ARTIFACT, fixedTransport: createB361ArtifactFetch,
    readers: 'ravradar-b361-reader257d', output: 'ravradar-b361-water-audit' }],
  [B363_TARGET, { label: 'B363', exactArtifact: B363_ARTIFACT, fixedTransport: createB363ArtifactFetch,
    readers: 'ravradar-b363-reader8851', output: 'ravradar-b363-water-audit' }],
  [B365_TARGET, { label: 'B365', exactArtifact: B365_ARTIFACT, fixedTransport: createB365ArtifactFetch,
    readers: 'ravradar-b365-reader995c', output: 'ravradar-b365-water-audit' }],
  [B368_TARGET, { label: 'B368', exactArtifact: B368_ARTIFACT, fixedTransport: createB368ArtifactFetch,
    readers: 'ravradar-b368-reader9311', output: 'ravradar-b368-water-audit' }],
]);

function isExactArtifact(artifact, expected) {
  return artifact?.id === expected.id
    && artifact.digest === expected.digest && artifact.bytes === expected.bytes;
}

// Retain the normal downloader's run/attempt/job/expiry and ZIP digest checks.
// This adapter pins the one artifact before that downloader can request ZIP bytes.
export function createB358ArtifactFetch(fetchImpl) {
  return createFixedArtifactFetch(fetchImpl, TARGET, B358_ARTIFACT, 'B358');
}

export function createB361ArtifactFetch(fetchImpl) {
  return createFixedArtifactFetch(fetchImpl, B361_TARGET, B361_ARTIFACT, 'B361');
}

function createFixedArtifactFetch(fetchImpl, target, artifact, label) {
  const metadataUrl = 'https://api.github.com/repos/' + target.repository + '/actions/';
  const artifactsUrl = metadataUrl + 'runs/' + target.runId + '/artifacts?per_page=100';
  const archiveUrl = metadataUrl + 'artifacts/' + artifact.id + '/zip';
  const attemptsUrl = metadataUrl + 'runs/' + target.runId + '/attempts/' + target.runAttempt;
  const readOnly = new Set([attemptsUrl, attemptsUrl + '/jobs?per_page=100', artifactsUrl]);
  const seen = new Set();
  let artifactPinned = false, signed = null;
  return async (url, init) => {
    const href = String(url);
    if (seen.has(href) || init?.redirect !== 'manual' || (init.method ?? 'GET') !== 'GET'
      || !(readOnly.has(href) || (href === archiveUrl && artifactPinned)
        || (signed !== null && href === signed && [...new Headers(init.headers)].length === 0))) {
      inputFailure(label + '_TRANSPORT_SCOPE');
    }
    seen.add(href);
    const response = await fetchImpl(url, init);
    if (href === archiveUrl && response.status === 302) signed = response.headers.get('location');
    if (href !== artifactsUrl || response.status !== 200) return response;
    const chunks = [], reader = response.body.getReader();
    let length = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > 4 * 1024 * 1024) inputFailure(label + '_ARTIFACT_METADATA_BOUND');
        chunks.push(Buffer.from(chunk.value));
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const bytes = Buffer.concat(chunks);
    const metadata = JSON.parse(bytes);
    const name = 'ravradar-private-build-stage-' + target.runId + '-' + target.runAttempt;
    const matches = metadata.artifacts?.filter(artifact => artifact?.name === name);
    if (matches?.length !== 1 || !isExactArtifact({ ...matches[0], bytes: matches[0].size_in_bytes }, artifact))
      inputFailure(label + '_ARTIFACT_PIN');
    artifactPinned = true;
    return new Response(bytes, { status: 200 });
  };
}

async function ownScratch(parent, directory, prefix, tasks) {
  const absolute = path.resolve(directory);
  const real = await fs.realpath(absolute);
  const first = await fs.lstat(absolute, { bigint: true });
  if (!first.isDirectory() || first.isSymbolicLink() || real !== absolute || path.dirname(real) !== parent
    || !path.basename(real).startsWith(prefix)) inputFailure('B358_SCRATCH_OWNER');
  tasks.push(async () => {
    const stat = await fs.lstat(real, { bigint: true });
    if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(real) !== real
      || stat.ino !== first.ino || stat.dev !== first.dev || stat.birthtimeNs !== first.birthtimeNs)
      inputFailure('B358_SCRATCH_OWNER');
    await fs.rm(real, { recursive: true, force: false });
  });
  return real;
}

async function auditFixedWaterTrend({ runnerTemp, githubToken, masterSecret, target }) {
  const episode = FIXED_EPISODES.get(target);
  if (!episode) inputFailure('FIXED_WATER_AUDIT_EPISODE');
  const { label, exactArtifact, fixedTransport } = episode;
  if (typeof runnerTemp !== 'string' || !runnerTemp || typeof githubToken !== 'string' || !githubToken
    || typeof masterSecret !== 'string' || masterSecret.length < 32) inputFailure(label + '_CREDENTIALS_REQUIRED');
  const temp = await fs.realpath(runnerTemp);
  const archived = path.join(temp, episode.readers);
  const output = path.join(temp, episode.output);
  for (const directory of [archived, output]) {
    const stat = await fs.lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(directory) !== directory)
      inputFailure(label + '_READER_ROOT');
  }
  const load = async relative => {
    const requested = path.join(archived, relative);
    const resolved = await fs.realpath(requested);
    if (resolved !== requested || !(await fs.lstat(requested)).isFile()) inputFailure(label + '_READER_PATH');
    return import(pathToFileURL(resolved));
  };
  const mainReaders = Object.keys(ARCHIVED_READERS);
  for (const relative of mainReaders) {
    const file = path.join(archived, relative);
    if (await fs.realpath(file) !== file || sha(await fs.readFile(file)) !== ARCHIVED_READERS[relative])
      inputFailure(label + '_READER_IDENTITY');
  }
  const reportPath = path.join(output, 'water-level-trend-safe.json');
  // Create the one bounded report exclusively before touching the artifact.
  const handle = await fs.open(reportPath, 'wx', 0o600);
  const cleanups = [];
  let report, phase = label + '_ARCHIVED_READER', failed = null;
  try {
    report = await withoutSavedAuditSecrets(async () => {
      const [workflow, stage, bundle] = await Promise.all(mainReaders.map(load));
      const expected = {
        ...await workflow.buildPrivateRuntimeExpectation({
          repositoryRoot: archived, targetReferenceAt: target.productionReferenceAt,
        }),
        datasetId: target.datasetId, productionReferenceAt: target.productionReferenceAt,
        minimumReferenceAt: target.productionReferenceAt,
      };
      phase = label + '_ARTIFACT_READ';
      const artifact = await downloadOrdinaryCompletedStageArtifact({ ...target, token: githubToken,
        fetchImpl: fixedTransport(globalThis.fetch) });
      await ownScratch(await fs.realpath(os.tmpdir()), artifact.privateDirectory, 'rr-ordinary-completed-stage-', cleanups);
      if (!isExactArtifact(artifact.artifact, exactArtifact) || artifact.producer.conclusion !== 'success') inputFailure(label + '_ARTIFACT_PIN');
      const privateRoot = await ownScratch(output, await fs.mkdtemp(path.join(output, 'decrypted-')), 'decrypted-', cleanups);
      const bundlePath = path.join(privateRoot, 'bundle');
      const args = { ...target, privateRoot, bundlePath, repositoryRoot: archived, expected };
      phase = label + '_STAGE_AUTHENTICATION';
      const restored = await stage.openStagedPrivateProductionRuntime({ ...args, inputPath: artifact.sealedPath, masterSecret });
      if (restored.restored !== true || restored.productionPointerUnchanged !== true)
        inputFailure(label + '_AUTHENTICATED_STAGE_REQUIRED');
      const verified = await bundle.verifyPrivateProductionRuntimeBundle(args);
      if (!verified.verified || verified.zoneCount !== 210 || verified.partCount !== 673
        || verified.bundleContentSha256 !== restored.bundleContentSha256) inputFailure(label + '_BUNDLE_IDENTITY');
      phase = label + '_WATER_PROJECTION';
      const projection = await readAuthenticatedProjection({ payload: path.join(bundlePath, 'payload'), root: archived, load, target });
      phase = label + '_FINAL_BUNDLE_READ';
      const readback = await bundle.verifyPrivateProductionRuntimeBundle(args);
      if (readback.bundleContentSha256 !== verified.bundleContentSha256 || !same(readback.files, verified.files))
        inputFailure(label + '_BUNDLE_CHANGED');
      return { ...target, artifactId: exactArtifact.id, publicHours: PUBLIC_HOURS, privateSupportHours: 3,
        bundleContentSha256: verified.bundleContentSha256, reportComplete: true, privatePayloadIncluded: false, ...projection };
    });
  } catch (error) {
    const fixedCode = error?.safeCode;
    failed = /^[A-Z][A-Z0-9_]{1,70}$/.test(fixedCode ?? '') ? fixedCode
      : /^ORDINARY_STAGE_[A-Z_]{1,60}$/.test(error?.code ?? '') ? error.code : 'READ_REFUSED';
  }
  try {
    while (cleanups.length) await cleanups.pop()();
  } catch {
    failed = label + '_SCRATCH_CLEANUP_REFUSED';
  }
  try {
    if (failed !== null || Buffer.byteLength(JSON.stringify(report)) > 48 * 1024)
      report = { reportComplete: false, privatePayloadIncluded: false, phase, reason: failed ?? 'REPORT_LIMIT' };
    await handle.writeFile(JSON.stringify(report) + '\n');
  } finally { await handle.close(); }
  return report.reportComplete;
}

const b374Exec = promisify(execFile);
const B374_REPO_ID = 1306858343;
export const B374_H0 = '2026-11-23T00:00:00.000Z';
export const B374_H3 = '2026-11-23T03:00:00.000Z';
const B374_SLOTS = [B374_H0, B374_H3];
export const B374_SCOPE = Object.freeze([
  ['DK-B04-07', 'dk-b04-07-national-part-02'],
  ['DK-B04-07', 'dk-b04-07-national-part-03'],
  ['DK-B04-07', 'dk-b04-07-national-part-04'],
  ['DK-B04-07', 'dk-b04-07-national-part-05'],
  ['DK-B04-08', 'dk-b04-08-national-part-01-locality-01'],
  ['DK-B04-08', 'dk-b04-08-national-part-01-locality-02'],
].map(Object.freeze));

const b374Fail = status => { throw new Error(status); };
const b374SourceKey = source => String(source?.sourceKey ?? source?.stationId ?? '');
const b374At = (record, time) => record?.hourly.find(row => row.time === time);
const b374Series = row => {
  const source = row?.sources?.waterLevel;
  return source?.provider === 'dmi'
    ? [source.entityId, source.collection, source.modelRun, source.gridDefinitionSha256, source.gridPoint]
    : null;
};
const b374Qualifies = (row, initial, zoneId, normal) => Number.isFinite(row?.waterLevelCm)
  && b374Series(row) !== null && b374Equal(b374Series(initial), b374Series(row))
  && normal.collectionAllowedForZone(row.sources.waterLevel.collection, zoneId, 'waterLevel');

function b374SelectRoute(normal, part, feature, stationRegistry, index, routing) {
  return normal.applyVerifiedWaterSourceRoutingToPartHourly({
    part, parentFeature: feature, hourly: B374_SLOTS.map(time => ({ time })),
    sources: stationRegistry, index, routing, haversineKm: normal.haversineKm,
    diagnosticReferenceAt: B374_H0,
  });
}

function b374NormalDecision(zoneId, partId, publicHours, result) {
  const observation = result.romoWaterTrendObservation;
  const [initial, future] = result.hourly;
  const keys = initial?.waterLevelProvenance?.sourceKeys;
  if (observation?.zoneId !== zoneId || observation?.partId !== partId
    || observation.selectedPath !== 'ROUTED_SOURCE' || !observation.selectedSourceT3Qualified
    || observation.seriesMatch !== false || observation.comparisonUsed !== false
    || !Array.isArray(keys) || keys.length === 0 || keys.length > 16
    || new Set(keys).size !== keys.length || !b374Equal(keys, future?.waterLevelProvenance?.sourceKeys)
    || !B374_SLOTS.every((time, offset) => Number.isFinite(result.hourly[offset]?.waterLevelCm)
      && result.hourly[offset].waterLevelCm === publicHours.get(time)?.waterLevelCm)
    || publicHours.get(B374_H0)?.waterLevelTrendCm3h !== null) b374Fail('SEALED_B374_ROUTE_MISMATCH');
  return keys;
}

// Pure projection. The caller authenticates both B archives, geometry, public
// hour member and installed normal module before it constructs these inputs.
export function auditB374WaterSourceSupport({
  normal, cases, stationRegistry, routing, routingConfigurationSha256, sealedIndex,
  activeBulk, protectedBulk, historicalBulk, retainedIndex,
}) {
  if (!/^[0-9a-f]{64}$/.test(routingConfigurationSha256 ?? '')
    || normal.waterRoutingConfigurationSha256(routing) !== routingConfigurationSha256) {
    b374Fail('SEALED_B374_ROUTING_CONFIGURATION_MISMATCH');
  }
  if (!(cases instanceof Map) || cases.size !== B374_SCOPE.length || !Array.isArray(stationRegistry)
    || !(sealedIndex instanceof Map) || !(retainedIndex instanceof Map)
    || !activeBulk?.zones || !protectedBulk?.zones
    || (historicalBulk !== null && !historicalBulk?.zones)) b374Fail('AUTHENTICATED_INPUTS_REQUIRED');

  const chosen = B374_SCOPE.map(([zoneId, partId]) => {
    const item = cases.get(partId);
    if (item?.part?.partId !== partId || item.part.zoneId !== zoneId
      || item.feature?.properties?.id !== zoneId || !(item.publicHours instanceof Map)) {
      b374Fail('SEALED_B374_PART_SCOPE_MISMATCH');
    }
    const result = b374SelectRoute(normal, item.part, item.feature, stationRegistry, sealedIndex, routing);
    return { zoneId, partId, keys: b374NormalDecision(zoneId, partId, item.publicHours, result) };
  });

  const selectedKeys = new Set(chosen.flatMap(row => row.keys));
  const selectedStations = stationRegistry.filter(source => selectedKeys.has(b374SourceKey(source)));
  if (selectedStations.length !== selectedKeys.size
    || new Set(selectedStations.map(b374SourceKey)).size !== selectedKeys.size) b374Fail('SEALED_B374_STATIONS_MISMATCH');
  const build = (bulk, options) => normal.buildWaterSourceForecastIndex(selectedStations, bulk, B374_H0, options);
  const union = build(activeBulk, { protectedBulkCache: protectedBulk, historicalBulkCache: historicalBulk,
    retainedSourceIndex: retainedIndex });
  const banks = [
    ['ACTIVE_CANDIDATE', build(activeBulk)],
    ['PROTECTED_BULK', build(protectedBulk)],
    ['HISTORICAL_BULK', build(historicalBulk)],
    ['RETAINED_SOURCE', build(null, { retainedSourceIndex: retainedIndex })],
  ];
  for (const key of selectedKeys) {
    const record = union.get(key);
    const sealed = sealedIndex.get(key);
    if (!record || !sealed
      || !b374Equal(record.point, sealed.point)
      || !b374Equal(JSON.parse(JSON.stringify(record.hourly)), sealed.hourly)) b374Fail('SEALED_B374_SOURCE_UNION_MISMATCH');
  }

  const parts = chosen.map(({ zoneId, partId, keys }) => {
    const supports = keys.map(key => {
      const record = union.get(key);
      const initial = b374At(record, B374_H0);
      const selectedFuture = b374At(record, B374_H3);
      if (b374Qualifies(selectedFuture, initial, zoneId, normal)) return { selectedFuture, banks: [], conflict: false };
      const alternatives = banks.flatMap(([bank, index]) => {
        const future = b374At(index.get(key), B374_H3);
        return b374Qualifies(future, initial, zoneId, normal) ? [{ bank, future }] : [];
      });
      return {
        selectedFuture: alternatives[0]?.future,
        banks: alternatives.map(row => row.bank),
        conflict: new Set(alternatives.map(row => row.future.waterLevelCm)).size > 1,
      };
    });
    const candidateBanks = banks.map(([bank]) => bank)
      .filter(bank => supports.some(support => support.banks.includes(bank)));
    if (supports.some(support => support.conflict)) return { partId, decision: 'CONFLICTING_SUPPORT', candidateBanks };
    if (supports.some(support => !support.selectedFuture)) return { partId, decision: 'QUALIFIED_SUPPORT_MISSING', candidateBanks };

    // Confirm the isolated comparison with the actual normal route. This
    // creates a fresh in-memory view and never replaces any saved row.
    const possible = new Map(sealedIndex);
    keys.forEach((key, i) => {
      const record = sealedIndex.get(key);
      possible.set(key, { ...record, hourly: record.hourly.map(row =>
        row.time === B374_H3 ? supports[i].selectedFuture : row) });
    });
    const { part, feature, publicHours } = cases.get(partId);
    const result = b374SelectRoute(normal, part, feature, stationRegistry, possible, routing);
    const initial = result.hourly[0];
    if (result.romoWaterTrendObservation?.comparisonUsed !== true
      || !b374Equal(keys, initial?.waterLevelProvenance?.sourceKeys)
      || initial.waterLevelCm !== publicHours.get(B374_H0).waterLevelCm) b374Fail('ALTERNATIVE_NORMAL_PREDICATE_MISMATCH');
    return { partId, decision: 'QUALIFIED_SUPPORT_EXISTS', candidateBanks };
  });

  return { kind: 'B374_WATER_SOURCE_SUPPORT_AUDIT_V1', parts };
}

const B374_REPO = 'jakobjorgensen82-commits/RavRadar';
const B374_API = 'https://api.github.com/repos/' + B374_REPO;
const B374_ATTEMPT = 1;
const B374_TARGETS = [
  { runId: 45065945955, head: '82c1bbbd2d1abf5817adfd151d684e6aa5bf50ec',
    id: 14776736823, bytes: 258439378, digest: 'sha256:a10527f1fd648d6efd2216ef2e206432312d1e8d6d673f0dee506c60fea251ce',
    datasetId: 'rr-20261122220312-210', reference: '2026-11-22T20:00:00.000Z', jobId: 137342354268,
    bundleSha256: '8377b81b913776b7ad9d45d80091c0b1166c57d4bfa3bf496a4688a038551e81' },
  { runId: 45088278207, head: 'fdf7078929d477092e247a4bee00146952aeebc7',
    id: 14786056986, bytes: 260527732, digest: 'sha256:29b2fe3a1f88236d976e9876cdc3be62942be089098fc22a1371d32c8477bc6c',
    datasetId: 'rr-20261123020235-210', reference: B374_H0, jobId: 137412108521,
    bundleSha256: 'e7ce1396bf0ba43c2b9441aaa420c198183b54639551344ad3e04176cc9b62b5' },
];
const B374_CURRENT = B374_TARGETS[1];
// Observed from the exact authenticated job 137412108521 restore receipt
// (step 59, 00:23:54.2458511Z). Both B373 create/seal steps emitted this SHA.
const B374_RESTORED_INPUT_SHA = '8377b81b913776b7ad9d45d80091c0b1166c57d4bfa3bf496a4688a038551e81';
const B374_MANIFEST_SHA = 'd8ce6d6a3e26c8f3be0206f869602b3288f12aa8bbd2144cf2bf8c0641ba606c';
const B374_ZONES_SHA = 'cd2ff012e1c5b9c8536ed02e13c756ed3cc982780a9c901cc67a33059a5a4086';
const B374_ROUTING_FILE_SHA = '9a814f69bab416f419aed65787796e9d8b53036f216691edbbdd7ca94e39d7b1';
const B374_ROUTING_CONFIG_SHA = '167a62644387018349e0d16837f953e7b8c7b0b364ca21ec6ad5345728e4d4ee';

export function b374StageIdentity(runNumber) {
  const target = B374_TARGETS.find(row => row.runId === runNumber);
  if (!target) b374Fail('B374_UNPINNED_STAGE');
  return { repository: B374_REPO, runId: String(target.runId), runAttempt: String(B374_ATTEMPT), sourceHead: target.head };
}

const B374_RESTORE_STEP = 'Verify and restore the private production runtime bundle';
const B374_INSTALLED_STEP = 'Install only the allowlisted restored private runtime files';
const B374_SELECTOR_STEP = 'Classify one-time DMI PART continuity donor';
const B374_DONOR_STEP = 'Restore exact previous native DMI donor without older score state';
const B374_COPY_STEP = 'Preserve deployed DMI zone cache as safe fallback';
const B374_BUILD_STEP = 'Update central weather cache';
const B374_MODIFIED_INPUT_STEPS = [
  'Preserve original pairs and rebind metadata before new-hour source reconstruction',
  'Preserve nationwide originals before new-hour current-grid reconstruction',
  'Rebind the exact bounded-conditions predecessor before installation',
  'Rebind exact 11Z private state without changing weather measurements',
  'Import exact public Candidate G runtime only for first integrated bootstrap',
  'Reapply exact verified weather sources after private runtime installation',
  'Reconcile the paired 15Z originals with the working weather sources',
];

export function b374VerifyNormalInputSteps(job) {
  if (job?.id !== B374_CURRENT.jobId || job.head_sha !== B374_CURRENT.head || job.run_id !== B374_CURRENT.runId
    || job.run_attempt !== B374_ATTEMPT || job.conclusion !== 'success') b374Fail('B374_PRODUCER_JOB_IDENTITY');
  function step(name, conclusion) {
    const matches = job?.steps?.filter(item => item.name === name) ?? [];
    const only = matches[0];
    if (matches.length !== 1 || only.status !== 'completed' || only.conclusion !== conclusion
      || !Number.isSafeInteger(only.number)) b374Fail('B374_ACTUAL_STEP_BINDING');
    return only;
  }
  const restore = step(B374_RESTORE_STEP, 'success');
  const chain = [restore, step(B374_INSTALLED_STEP, 'success'), step(B374_SELECTOR_STEP, 'success'),
    step(B374_DONOR_STEP, 'skipped'), step(B374_COPY_STEP, 'success'), step(B374_BUILD_STEP, 'success')];
  if (restore.number !== 59 || chain[2].number !== 66 || chain[3].number !== 67) b374Fail('B374_ACTUAL_STEP_NUMBER');
  if (!chain.every((item, i) => i === 0 || item.number > chain[i - 1].number)) b374Fail('B374_ACTUAL_STEP_ORDER');
  const exactHandoff = step('Verify rebuilt closure exactly matches the run-bound source handoff', 'skipped');
  if (exactHandoff.number !== 150 || exactHandoff.number >= chain[5].number) b374Fail('B374_ACTUAL_STEP_ORDER');
  for (const name of B374_MODIFIED_INPUT_STEPS) {
    if (step(name, 'skipped').number >= chain[4].number) b374Fail('B374_ACTUAL_STEP_ORDER');
  }
  if (!(Date.parse(restore.started_at) <= Date.parse(restore.completed_at))) b374Fail('B374_ACTUAL_STEP_CLOCK');
  return restore;
}

async function b374SourceModules(root, target) {
  const directory = await fs.realpath(root);
  const git = async args => (await b374Exec('git', ['-C', directory, ...args], { timeout: 12_000 })).stdout.trim();
  if (await git(['rev-parse', 'HEAD']) !== target.head
    || await git(['status', '--porcelain', '--untracked-files=all']) !== '') b374Fail('B374_ARCHIVED_READER_SOURCE');
  const load = async relative => {
    const file = path.join(directory, relative);
    if (await fs.realpath(file) !== file || !(await fs.lstat(file)).isFile()) b374Fail('B374_ARCHIVED_READER_PATH');
    return import(pathToFileURL(file));
  };
  const [stage, workflow] = await Promise.all([load('scripts/staged-private-production-runtime.mjs'),
    load('scripts/private-production-runtime-workflow.mjs')]);
  const expected = await workflow.buildPrivateRuntimeExpectation({
    repositoryRoot: directory, targetReferenceAt: target.reference,
  });
  return { load, directory, stage, expected };
}

async function b374OpenStage(target, modules, privateRoot, token, masterSecret, artifacts) {
  const identity = b374StageIdentity(target.runId);
  let producerJobs;
  const observe = async (url, options) => {
    const response = await fetch(url, options);
    if (target === B374_CURRENT && url === `${B374_API}/actions/runs/${target.runId}/attempts/1/jobs?per_page=100`
      && response.status === 200) producerJobs = response.clone().json().catch(() => null);
    return response;
  };
  const downloaded = await withoutSavedAuditSecrets(() => downloadOrdinaryCompletedStageArtifact({
    ...identity, token, fetchImpl: createFixedArtifactFetch(observe, identity, target, 'B374'),
  }));
  await ownScratch(await fs.realpath(os.tmpdir()), downloaded.privateDirectory, 'rr-ordinary-completed-stage-', artifacts);
  if (downloaded.producer.jobId !== target.jobId || downloaded.artifact.id !== target.id || downloaded.artifact.bytes !== target.bytes
    || downloaded.artifact.digest !== target.digest) b374Fail('B374_PINNED_STAGE_MISMATCH');
  const bundlePath = path.join(privateRoot, 'bundle');
  const { reference, datasetId } = target;
  await fs.mkdir(privateRoot, { mode: 0o700 });
  const result = await withoutSavedAuditSecrets(() => modules.stage.openStagedPrivateProductionRuntime({
    inputPath: downloaded.sealedPath, privateRoot, bundlePath, repositoryRoot: modules.directory,
    expected: { ...modules.expected, datasetId, productionReferenceAt: reference, minimumReferenceAt: reference,
      minimumGeneratedAt: reference },
    ...identity, masterSecret,
  }));
  const manifest = JSON.parse(await fs.readFile(path.join(bundlePath, 'manifest.json')));
  if (result.restored !== true || result.productionPointerUnchanged !== true
    || manifest.bundleContentSha256 !== result.bundleContentSha256 || manifest.bundleContentSha256 !== target.bundleSha256
    || manifest.productionReferenceAt !== reference || manifest.datasetId !== datasetId
    || !b374Equal(manifest.modelBinding, modules.expected.modelBinding) || !b374Equal(manifest.contractHashes, modules.expected.contractHashes)) {
    b374Fail('B374_STAGE_BUNDLE_IDENTITY');
  }
  const jobs = await producerJobs;
  const job = jobs?.jobs?.find(row => row.id === downloaded.producer.jobId);
  if (target === B374_CURRENT && (!job || job.run_id !== target.runId || job.run_attempt !== B374_ATTEMPT
    || job.head_sha !== target.head)) b374Fail('B374_PRODUCER_JOB_IDENTITY');
  return { manifest, job, payload: path.join(bundlePath, 'payload') };
}


// Runner-only entry point. Supply pinned public files and both checked-out
// historical readers in the authorized GitHub-hosted runner.
async function b374ReadBoundStages({
  sourceRoots, manifestBytes, zonesBytes, routingBytes, githubToken, stageMasterSecret,
}) {
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_ENVIRONMENT !== 'github-hosted'
    || process.env.GITHUB_REPOSITORY !== B374_REPO || !process.env.RUNNER_TEMP) b374Fail('B374_HOSTED_READER_REQUIRED');
  if (sha(manifestBytes) !== B374_MANIFEST_SHA || sha(zonesBytes) !== B374_ZONES_SHA
    || sha(routingBytes) !== B374_ROUTING_FILE_SHA) b374Fail('B374_PUBLIC_FILE_DIGEST');
  const publicManifest = JSON.parse(manifestBytes);
  const geometry = JSON.parse(zonesBytes);
  const routing = JSON.parse(routingBytes);
  if (publicManifest.datasetId !== B374_CURRENT.datasetId || publicManifest.productionReferenceAt !== B374_H0
    || publicManifest.zoneRegistrySha256 !== B374_ZONES_SHA) b374Fail('B374_PUBLIC_GENERATION_IDENTITY');
  const work = await fs.mkdtemp(path.join(await fs.realpath(process.env.RUNNER_TEMP), 'rr-b374-audit-'));
  const artifactDirectories = [];
  try {
    const older = await b374SourceModules(sourceRoots[0], B374_TARGETS[0]);
    const newer = await b374SourceModules(sourceRoots[1], B374_CURRENT);
    const b374 = await b374OpenStage(B374_CURRENT, newer, path.join(work, 'b374'), githubToken, stageMasterSecret, artifactDirectories);
    b374VerifyNormalInputSteps(b374.job);
    const b373 = await b374OpenStage(B374_TARGETS[0], older, path.join(work, 'b373'), githubToken, stageMasterSecret, artifactDirectories);
    if (B374_RESTORED_INPUT_SHA !== b373.manifest.bundleContentSha256) b374Fail('B374_PREDECESSOR_NOT_B373');
    const [forecast, router, restrictions, partRecovery, bulk, companion, publicHours] = await Promise.all([
      'dmi-forecast-file', 'water-source-forecast-routing', 'dmi-marine-zone-exclusions', 'private-dmi-recovery-record',
      'dmi-bulk-storage', 'private-weather-component-pack', 'public-hour-delivery-pack',
    ].map(name => newer.load(`scripts/lib/${name}.mjs`)));
    const read = async (root, relative) => JSON.parse(await fs.readFile(path.join(root, relative)));
    const fromCache = b => forecast.inspectDmiForecastFile(path.join(b.payload, 'data/live/dmi-forecast-cache.json'));
    const [thisCache, previousCache] = await Promise.all([fromCache(b374), fromCache(b373)]);
    if (!previousCache.hasPartContinuity || ![1, 2].includes(previousCache.continuity?.metadata.schemaVersion)) {
      b374Fail('B374_HISTORICAL_DONOR_STATE_UNPROVED');
    }
    const unpackIndex = async (cache, target) => {
      const packed = await forecast.readDmiWaterSourceContinuity(cache);
      if (packed?.productionReferenceAt !== target.reference) b374Fail('B374_SOURCE_CONTINUITY_IDENTITY');
      return router.unpackWaterSourceForecastContinuity(packed, B374_H0);
    };
    const [conditions, stationDocument, diagnostics] = await Promise.all([
      'conditions', 'dmi-water-stations', 'ravradar-runtime-diagnostics',
    ].map(name => read(b374.payload, `data/live/${name}.json`)));
    if (diagnostics.lf7WaterRouting?.configurationSha256 !== B374_ROUTING_CONFIG_SHA) b374Fail('B374_ROUTING_DIGEST_UNPROVED');
    const companions = path.join(work, 'dmi-companions');
    const descriptor = b374.manifest.files.find(row => row.relativePath === '.cache/weather-component-inputs.pack');
    await withoutSavedAuditSecrets(() => companion.unpackPrivateWeatherComponentCompanions({
      restoredRoot: b374.payload, outputRoot: companions, conditions, expectedPackDescriptor: descriptor,
    }));
    const [activeBulk, protectedBulk, sealedIndex, retainedIndex, hours] = await Promise.all([
      bulk.readDmiBulkDocument(path.join(companions, '.cache/dmi-candidate-progress.json')),
      bulk.readDmiBulkDocument(path.join(b373.payload, 'data/live/dmi-bulk-cache.json')),
      unpackIndex(thisCache, B374_CURRENT), unpackIndex(previousCache, B374_TARGETS[0]),
      readSelectedPublicPartWeather(publicHours, path.join(b374.payload, '.cache/public-hour-delivery.pack'), conditions,
        new Map(B374_SCOPE.map(([zone, id]) => [id, zone])), { target: { ...B374_CURRENT, productionReferenceAt: B374_H0 },
          offsets: [0, 3], sourceDetailsSha256: publicManifest.publicConditionDetailsSha256,
          expectedModelBinding: publicManifest.ravScoreModelBinding }),
    ]);
    const cases = new Map(B374_SCOPE.map(([zoneId, partId]) => {
      const part = conditions.coastalParts?.parts?.[partId];
      if (part?.zoneId !== zoneId) b374Fail('B374_PRIVATE_PART_IDENTITY');
      return [partId, { part: { ...part, partId },
        feature: geometry.features.find(candidate => candidate.properties?.id === zoneId), publicHours: hours.get(partId)?.rows }];
    }));
    return auditB374WaterSourceSupport({
      normal: { ...router, collectionAllowedForZone: restrictions.dmiMarineCollectionAllowedForZone,
        haversineKm: partRecovery.haversineKm },
      cases, stationRegistry: stationDocument.stations, routing, routingConfigurationSha256: B374_ROUTING_CONFIG_SHA, sealedIndex,
      activeBulk, protectedBulk, historicalBulk: null, retainedIndex,
    });
  } finally {
    try { while (artifactDirectories.length) await artifactDirectories.pop()(); }
    finally { await fs.rm(work, { recursive: true, force: true }); }
  }
}


const B374_STAGE_IDENTITY = b374StageIdentity(45088278207);
const B374_ACTIONS_ARTIFACT_API = 'https://api.github.com/repos/' + B374_STAGE_IDENTITY.repository + '/actions/artifacts';
const handoff = { id: 14786022739, name: 'ravscore-operational-handoff-45088278207-1', bytes: 57055,
  sha256: '65fdda86ef17d29dfaa3e22c197f8675a9db6f557945d0c46ad76778cf21d255' };
const pages = { id: 14785674825, name: 'github-pages', bytes: 196752290,
  sha256: 'c785eef0392f4ffff79f60bdc195991c3eb0356b59b142f5a1ed3490b029fd9d' };

export function b374CheckArtifactMetadata(meta, pin, now = Date.now()) {
  if (meta?.id !== pin.id || meta.name !== pin.name || meta.size_in_bytes !== pin.bytes
    || meta.digest !== 'sha256:' + pin.sha256 || meta.expired !== false
    || !(Date.parse(meta.created_at) <= now && now < Date.parse(meta.expires_at))
    || meta.workflow_run?.id !== Number(B374_STAGE_IDENTITY.runId) || meta.workflow_run.repository_id !== B374_REPO_ID
    || meta.workflow_run.head_repository_id !== B374_REPO_ID || meta.workflow_run.head_branch !== 'main'
    || meta.workflow_run.head_sha !== B374_STAGE_IDENTITY.sourceHead) b374Fail('B374_PUBLIC_ARTIFACT_IDENTITY');
}

export function b374ArtifactRedirectUrl(status, destination) {
  if (status !== 302 || typeof destination !== 'string' || !destination
    || destination.length > 4096 || /[,\r\n]/.test(destination)) b374Fail('B374_PUBLIC_ARTIFACT_REDIRECT');
  let url;
  try { url = new URL(destination); } catch { b374Fail('B374_PUBLIC_ARTIFACT_REDIRECT'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash
    || !(url.hostname.endsWith('.blob.core.windows.net') || url.hostname.endsWith('.githubusercontent.com'))) {
    b374Fail('B374_PUBLIC_ARTIFACT_REDIRECT');
  }
  return url;
}

export async function b374TransferExact(response, destination, pin, signal) {
  const length = response.headers.get('content-length');
  const encoding = response.headers.get('content-encoding');
  if (response.status !== 200 || !response.body || length !== null && length !== String(pin.bytes)
    || encoding !== null && encoding.toLowerCase() !== 'identity') {
    await response.body?.cancel().catch(() => {});
    destination.destroy();
    b374Fail('B374_PUBLIC_ARTIFACT_RESPONSE');
  }
  const digest = crypto.createHash('sha256');
  let bytes = 0;
  const bounded = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > pin.bytes) return callback(new Error('B374_PUBLIC_ARTIFACT_SIZE'));
      digest.update(chunk);
      callback(null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(response.body), bounded, destination, { signal });
  if (bytes !== pin.bytes || digest.digest('hex') !== pin.sha256) b374Fail('B374_PUBLIC_ARTIFACT_DIGEST');
}

async function b374DownloadPublic(pin, destination, token, signal) {
  const redirect = await fetch(`${B374_ACTIONS_ARTIFACT_API}/${pin.id}/zip`, {
    redirect: 'manual', signal, headers: { Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  await redirect.body?.cancel();
  const location = b374ArtifactRedirectUrl(redirect.status, redirect.headers.get('location'));
  const response = await fetch(location, { redirect: 'error', signal, headers: { 'Accept-Encoding': 'identity' } });
  await b374TransferExact(response, createWriteStream(destination, { flags: 'wx', mode: 0o600 }), pin, signal);
}

async function b374BoundPublicFiles(source374, work, token) {
  const git = async args => (await b374Exec('git', ['-C', source374, '-c', 'core.fsmonitor=false', ...args], {
    timeout: 12_000, env: { PATH: process.env.PATH, GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_SYSTEM: '/dev/null', GIT_OPTIONAL_LOCKS: '0' },
  })).stdout.trim();
  if (await git(['rev-parse', 'HEAD']) !== B374_STAGE_IDENTITY.sourceHead
    || await git(['status', '--porcelain', '--untracked-files=all']) !== '') b374Fail('B374_ARCHIVED_READER_SOURCE');
  const load = name => import(pathToFileURL(path.join(source374, 'scripts', name)));
  const [metadata, checks] = await Promise.all([load('read-pages-artifact-metadata.mjs'),
    load('ravscore-operational-pages-recovery.mjs')]);
  const deadline = Date.now() + 300_000;
  const signal = AbortSignal.timeout(deadline - Date.now());
  const readMeta = async pin => {
    const result = JSON.parse(await metadata.readPagesArtifactMetadata({
      repository: B374_STAGE_IDENTITY.repository, artifactId: String(pin.id), token,
    }));
    b374CheckArtifactMetadata(result, pin);
    return result;
  };
  const [handoffMeta, pagesMeta] = await Promise.all([readMeta(handoff), readMeta(pages)]);
  if (Date.parse(handoffMeta.created_at) < Date.parse(pagesMeta.created_at)) b374Fail('B374_PUBLIC_ARTIFACT_ORDER');
  const extract = async (mode, pin, expectedManifest) => {
    const zipPath = path.join(work, mode + '.zip');
    const output = path.join(work, mode);
    await b374DownloadPublic(pin, zipPath, token, signal);
    const args = ['-I', '-B', path.join(source374, 'scripts/extract-code-only-public-B374_STAGE_IDENTITY.py'),
      '--mode', mode, '--archive', zipPath, '--expected-zip-bytes', String(pin.bytes),
      '--expected-zip-sha256', pin.sha256, '--output-directory', output,
      '--deadline-epoch-ms', String(deadline)];
    if (expectedManifest) args.push('--expected-manifest', expectedManifest);
    const { stdout } = await withoutSavedAuditSecrets(() =>
      b374Exec('python3', args, { timeout: Math.max(1, deadline - Date.now()), maxBuffer: 65_536, signal }));
    const receipt = JSON.parse(stdout);
    if (receipt.schemaVersion !== 1 || receipt.mode !== mode || receipt.zipBytes !== pin.bytes
      || receipt.zipSha256 !== pin.sha256) b374Fail('B374_PUBLIC_EXTRACTION_RECEIPT');
    await fs.unlink(zipPath);
    return output;
  };
  const sealed = await extract('handoff', handoff);
  const manifestPath = path.join(sealed, 'manifest.json');
  const [manifestBytes, sealBytes, handoffBytes, bindingBytes] = await Promise.all([
    fs.readFile(manifestPath),
    ...['pages-artifact-seal.json', 'handoff.json', 'target-binding.json'].map(name => fs.readFile(path.join(sealed, name))),
  ]);
  const manifest = JSON.parse(manifestBytes), seal = JSON.parse(sealBytes), facts = JSON.parse(handoffBytes);
  if (sha(manifestBytes) !== B374_MANIFEST_SHA || manifest.datasetId !== 'rr-20261123020235-210'
    || manifest.productionReferenceAt !== '2026-11-23T00:00:00.000Z'
    || facts.schemaVersion !== 'ravscore-operational-deploy-handoff-v2' || facts.sourceHead !== B374_STAGE_IDENTITY.sourceHead
    || !['integrated', 'integrated-historical-maintenance'].includes(facts.action)
    || facts.legacySourceRequired !== false || facts.privatePayloadIncluded !== false
    || facts.checkpointDatasetId !== manifest.datasetId
    || seal.artifactId !== pages.id || seal.artifactSizeBytes !== pages.bytes || seal.artifactName !== pages.name
    || checks.normalizeArtifactDigestSha256(seal.artifactDigestSha256) !== pages.sha256
    || seal.createdAt !== new Date(pagesMeta.created_at).toISOString()) b374Fail('B374_PUBLIC_SEAL_IDENTITY');
  checks.assertUploadedOperationalPagesTarget({
    seal, workflowIdentity: { repository: B374_STAGE_IDENTITY.repository, runId: Number(B374_STAGE_IDENTITY.runId), runAttempt: 1,
      headSha: B374_STAGE_IDENTITY.sourceHead, ref: 'refs/heads/main', attemptId: `pages-${B374_STAGE_IDENTITY.runId}-1` },
    targetManifest: manifest, targetModelBinding: JSON.parse(bindingBytes),
    implementationClosureSha256: seal.targetImplementationClosureSha256,
  });
  const snapshot = await extract('public', pages, manifestPath);
  const [pagesManifest, zonesBytes, routingBytes] = await Promise.all(
    ['manifest.json', 'zones.geojson', 'water-level-station-routing.json'].map(name => fs.readFile(path.join(snapshot, name))));
  if (!pagesManifest.equals(manifestBytes)) b374Fail('B374_PUBLIC_MANIFEST_MISMATCH');
  return { manifestBytes, zonesBytes, routingBytes };
}

async function b374Entry(argv) {
  if (process.platform !== 'linux' || process.env.GITHUB_ACTIONS !== 'true'
    || process.env.RUNNER_ENVIRONMENT !== 'github-hosted'
    || process.env.GITHUB_REPOSITORY !== B374_STAGE_IDENTITY.repository || !process.env.RUNNER_TEMP) {
    b374Fail('B374_HOSTED_READER_REQUIRED');
  }
  const [b373, b374, output, ...extra] = argv;
  if (extra.length || ![b373, b374, output].every(file => file && path.isAbsolute(file))) b374Fail('B374_ENTRY_ARGUMENTS');
  const temp = await fs.realpath(process.env.RUNNER_TEMP);
  const outputParent = await fs.realpath(path.dirname(output));
  const relativeParent = path.relative(temp, outputParent);
  if (path.isAbsolute(relativeParent) || relativeParent === '..' || relativeParent.startsWith('..' + path.sep)) {
    b374Fail('B374_ENTRY_REPORT_PATH');
  }
  const reportPath = path.join(outputParent, path.basename(output));
  if (await fs.lstat(reportPath).catch(error => { if (error.code !== 'ENOENT') throw error; }))
    b374Fail('B374_ENTRY_REPORT_EXISTS');
  const token = process.env.GITHUB_TOKEN, masterSecret = process.env.WEATHER_PROGRESS_MASTER_SECRET;
  if (!token || !masterSecret) b374Fail('B374_ENTRY_CREDENTIALS_UNAVAILABLE');
  const sourceRoots = [await fs.realpath(b373), await fs.realpath(b374)];
  const work = await fs.mkdtemp(path.join(temp, 'rr-b374-public-'));
  let publicFiles;
  try {
    publicFiles = await b374BoundPublicFiles(sourceRoots[1], work, token);
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
  const report = await withoutSavedAuditSecrets(() => b374ReadBoundStages({
    sourceRoots, ...publicFiles, githubToken: token, stageMasterSecret: masterSecret,
  }));
  const bytes = JSON.stringify(report) + '\n';
  await fs.writeFile(reportPath, bytes, { flag: 'wx', mode: 0o600 });
  process.stdout.write(bytes);
}


if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--b374') {
    try { await b374Entry(process.argv.slice(3)); }
    catch (error) {
      const code = /^(B374_|ORDINARY_STAGE_|SEALED_B374_|ALTERNATIVE_NORMAL_|AUTHENTICATED_INPUTS_)[A-Z0-9_]{1,74}$/
        .test(error?.message ?? '') ? error.message : 'B374_ENTRY_UNAVAILABLE';
      process.stdout.write(code + '\n');
      process.exitCode = 1;
    }
  } else {
  const target = process.argv.length === 2 ? TARGET : process.argv.length === 3
    ? { '--b361': B361_TARGET, '--b363': B363_TARGET, '--b365': B365_TARGET, '--b368': B368_TARGET }[process.argv[2]] : null;
  try {
    if (!FIXED_EPISODES.has(target)) inputFailure('B358_FIXED_INPUT_ONLY');
    if (!await auditFixedWaterTrend({ runnerTemp: process.env.RUNNER_TEMP, githubToken: process.env.GH_TOKEN,
      masterSecret: process.env.STAGED_PRIVATE_BUILD_MASTER_SECRET, target }))
      process.exitCode = 1;
  } catch {
    process.stderr.write((FIXED_EPISODES.get(target)?.label ?? 'B358') + '_PRIVATE_AUDIT_REFUSED\n');
    process.exitCode = 1;
  }
  }
}
