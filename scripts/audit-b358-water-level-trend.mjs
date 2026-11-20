import crypto from 'node:crypto';
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
const ZONE_IDS = Object.freeze(['DK-B02-06', 'DK-B02-11', 'DK-B05-16', 'DK-B05-17']);
const FUR_ZONE = 'DK-B05-17';
const FUR_PART = 'dk-b05-17-national-part-04';
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
export function projectSourcePairs({ referenceAt, zone, storedRows, selected, index, normal, allowed, basisCheck }) {
  const output = counters();
  const sourceRows = new Map();
  const decisionsByKeys = new Map();
  const times = Array.from({ length: PUBLIC_HOURS }, (_, hour) => at(referenceAt, hour));
  for (const [hour, time] of times.entries()) {
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

async function readSelectedPublicPartWeather(module, packPath, conditions, scope) {
  const { manifest, payloadOffset, bytes } = await module.inspectPrivatePublicHourDeliveryPack({ packPath, conditions });
  if (manifest.datasetId !== TARGET.datasetId || manifest.productionReferenceAt !== TARGET.productionReferenceAt
    || manifest.entries.length !== PUBLIC_HOURS) inputFailure('PUBLIC_HOUR_BINDING');
  const selected = new Map([...scope].map(([id, zone]) => [id, { zone, rows: new Map() }]));
  let position = payloadOffset;
  const handle = await fs.open(packPath, 'r');
  try {
    for (const [hour, entry] of manifest.entries.entries()) {
      if (entry.time !== at(TARGET.productionReferenceAt, hour)) inputFailure('PUBLIC_HOUR_AXIS');
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
      if (document.delivery?.schemaVersion !== 1 || document.delivery.kind !== 'hour'
        || document.delivery.key !== entry.time || document.delivery.sourceDetailsSha256 !== manifest.sourceDetailsSha256
        || !Object.keys(manifest.modelBinding).every(key => document.delivery.modelBinding?.[key] === manifest.modelBinding[key])) {
        inputFailure('PUBLIC_HOUR_BINDING');
      }
      for (const [id, entryOutput] of selected) {
        const part = document.coastalParts?.parts?.[id];
        if (part?.id !== id || part.zoneId !== entryOutput.zone || part.current?.time !== entry.time || !part.current.weather)
          inputFailure('PUBLIC_PART_BINDING');
        const { waterLevelCm, waterLevelTrendCm3h } = part.current.weather;
        if ((waterLevelCm != null && !finite(waterLevelCm)) || (waterLevelTrendCm3h != null && !finite(waterLevelTrendCm3h)))
          inputFailure('PUBLIC_PART_WATER_TYPE');
        entryOutput.rows.set(entry.time, { waterLevelCm, waterLevelTrendCm3h });
      }
    }
  } finally { await handle.close(); }
  if (position !== bytes) inputFailure('PUBLIC_HOUR_EOF');
  return selected;
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
export function projectDkssOnsetQueue(document, referenceAt) {
  const diagnostics = document?.diagnostics;
  const queues = diagnostics?.currentAcquisitionPlan?.firstTurnOrder;
  const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 100_000 ? value : null;
  const offsets = [6, 7, 9, 10];
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
        selectedRunProcessedTime: processedTimes?.has(Date.parse(time)) ?? null };
    });
  }
  return results;
}

async function readAuthenticatedProjection({ payload, root, load }) {
  const [forecast, normal, policy, fur, publicHours, partRecovery, bulk] = await Promise.all([
    load('scripts/lib/dmi-forecast-file.mjs'), load('scripts/lib/water-source-forecast-routing.mjs'),
    load('scripts/lib/dmi-marine-zone-exclusions.mjs'), load('scripts/lib/fur-water-routing-diagnostic.mjs'),
    load('scripts/lib/public-hour-delivery-pack.mjs'), load('scripts/lib/private-dmi-recovery-record.mjs'),
    load('scripts/lib/dmi-bulk-storage.mjs'),
  ]);
  const indexed = await forecast.inspectDmiForecastFile(path.join(payload, 'data/live/dmi-forecast-cache.json'));
  if (indexed.zones.size !== 210) inputFailure('FORECAST_ZONE_INVENTORY');
  const packed = await forecast.readDmiWaterSourceContinuity(indexed);
  if (packed?.productionReferenceAt !== TARGET.productionReferenceAt) inputFailure('SOURCE_CONTINUITY_GENERATION');
  // The production reader qualifies every SOURCE hourly proof. Its internal
  // verifiedDmiSourceRows is also called by the normal router below.
  const index = await normal.unpackWaterSourceForecastContinuity(packed, TARGET.productionReferenceAt);
  const allowed = policy.dmiMarineCollectionAllowedForZone;
  const options = { normal, index, allowed, referenceAt: TARGET.productionReferenceAt };
  const zones = {};
  for (const zone of ZONE_IDS) {
    const descriptor = indexed.zones.get(zone);
    if (!descriptor) inputFailure('FORECAST_ZONE_MISSING');
    const original = await forecast.readDmiForecastRecord(indexed, descriptor);
    zones[zone] = projectSourcePairs({ ...options, zone, storedRows: hourlyIndex(original.hourly),
      selected: (_time, row) => {
        const source = levelProof(row);
        return source?.provider === 'dmi' && source.routing === 'dmi-water-source-interpolation' ? source.sourceKeys : null;
      },
    });
  }

  const conditions = JSON.parse(await fs.readFile(path.join(payload, 'data/live/conditions.json'), 'utf8'));
  const trace = conditions.furWaterRoutingDiagnostic;
  if (conditions.datasetId !== TARGET.datasetId || conditions.productionReferenceAt !== TARGET.productionReferenceAt)
    inputFailure('CONDITIONS_GENERATION');
  const targetParts = new Map(Object.entries(conditions.coastalParts?.parts ?? {})
    .filter(([, part]) => ZONE_IDS.includes(part?.zoneId) || normal.lf7WaterOnlyZone(part?.zoneId))
    .map(([id, part]) => [id, part.zoneId]));
  if (targetParts.size < 4 || targetParts.size > 64 || targetParts.get(FUR_PART) !== FUR_ZONE)
    inputFailure('PRIVATE_PART_SCOPE');
  const partWeather = await readSelectedPublicPartWeather(publicHours, path.join(payload, '.cache/public-hour-delivery.pack'),
    conditions, targetParts);
  const hasTrace = fur.validFurWaterRoutingDiagnostic(trace, { datasetId: TARGET.datasetId })
    && trace.productionReferenceAt === TARGET.productionReferenceAt && trace.generatedAt === conditions.generatedAt
    && Object.keys(trace.trace.hours).length === PUBLIC_HOURS;
  const keysByHash = new Map([...index].map(([key, record]) => [sha(JSON.stringify([key, record.point])), key]));
  const furKeys = hasTrace ? trace.trace.selectedSourceIdentitiesSha256.map(identity => keysByHash.get(identity)) : null;
  const json = async (base, relative) => {
    const name = path.join(base, relative);
    const stat = await fs.lstat(name);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 64 * 1024 * 1024) return null;
    return JSON.parse(await fs.readFile(name, 'utf8'));
  };
  const [routing, geography, registry, diagnostics] = await Promise.all([
    json(root, 'data/water-level-station-routing.json').catch(() => null),
    json(root, 'data/zones.geojson').catch(() => null),
    json(payload, 'data/live/dmi-water-stations.json'), json(payload, 'data/live/ravradar-runtime-diagnostics.json'),
  ]);
  // A tracked routing file is only a candidate. Reject whenever the active
  // hydrated configuration, selected sets or saved results do not match.
  const lf7 = qualifyLf7Reconstruction({ conditions, diagnostics, routing, features: geography?.features,
    sourceRegistry: registry?.stations, parts: partWeather, normal, index, haversineKm: partRecovery.haversineKm,
    referenceAt: TARGET.productionReferenceAt });
  const parts = {};
  for (const [id, { zone, rows }] of partWeather) {
    if (!ZONE_IDS.includes(zone)) continue;
    const provenFurSelection = id === FUR_PART && validKeys(furKeys);
    const lf7Selection = lf7.selections.get(id);
    parts[id] = {
      zone, evidence: provenFurSelection ? 'ORIGINAL_PART_SOURCE_IDENTITIES'
        : lf7Selection ? 'ORIGINAL_LF7_SELECTION_AND_VALUES_MATCH' : 'PUBLIC_VALUES_WITHOUT_PROVEN_PART_SELECTION',
      ...projectSourcePairs({ ...options, zone, storedRows: rows,
        selected: time => provenFurSelection ? furKeys : lf7Selection?.get(time),
        basisCheck: provenFurSelection ? time => trace.trace.hours[time]
          : lf7Selection ? time => ({ outputValuePresent: finite(rows.get(time)?.waterLevelCm),
            routedValuePresent: lf7Selection.has(time) }) : undefined }),
    };
  }
  const bulkOnsetQueue = await bulk.readDmiBulkDocument(path.join(payload, 'data/live/dmi-bulk-cache.json'), { expandSources: false })
    .then(document => projectDkssOnsetQueue(document, TARGET.productionReferenceAt))
    .catch(() => ({}));
  return { zoneEvidence: 'ARCHIVED_ZONE_ROUTING_SEPARATE_FROM_PUBLIC_WINNING_PART', lf7Evidence: lf7.reason,
    zones, parts, bulkOnsetQueue };
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
const metadataUrl = 'https://api.github.com/repos/' + TARGET.repository + '/actions/';
const artifactsUrl = metadataUrl + 'runs/' + TARGET.runId + '/artifacts?per_page=100';
const archiveUrl = metadataUrl + 'artifacts/' + B358_ARTIFACT.id + '/zip';

function isExactArtifact(artifact) {
  return artifact?.id === B358_ARTIFACT.id
    && artifact.digest === B358_ARTIFACT.digest && artifact.bytes === B358_ARTIFACT.bytes;
}

// Retain the normal downloader's run/attempt/job/expiry and ZIP digest checks.
// This adapter pins the one artifact before that downloader can request ZIP bytes.
export function createB358ArtifactFetch(fetchImpl) {
  const attemptsUrl = metadataUrl + 'runs/' + TARGET.runId + '/attempts/' + TARGET.runAttempt;
  const readOnly = new Set([attemptsUrl, attemptsUrl + '/jobs?per_page=100', artifactsUrl]);
  const seen = new Set();
  let artifactPinned = false, signed = null;
  return async (url, init) => {
    const href = String(url);
    if (seen.has(href) || init?.redirect !== 'manual' || (init.method ?? 'GET') !== 'GET'
      || !(readOnly.has(href) || (href === archiveUrl && artifactPinned)
        || (signed !== null && href === signed && [...new Headers(init.headers)].length === 0))) {
      inputFailure('B358_TRANSPORT_SCOPE');
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
        if (length > 4 * 1024 * 1024) inputFailure('B358_ARTIFACT_METADATA_BOUND');
        chunks.push(Buffer.from(chunk.value));
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const bytes = Buffer.concat(chunks);
    const metadata = JSON.parse(bytes);
    const name = 'ravradar-private-build-stage-' + TARGET.runId + '-' + TARGET.runAttempt;
    const matches = metadata.artifacts?.filter(artifact => artifact?.name === name);
    if (matches?.length !== 1 || !isExactArtifact({ ...matches[0], bytes: matches[0].size_in_bytes }))
      inputFailure('B358_ARTIFACT_PIN');
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

async function auditB358({ runnerTemp, githubToken, masterSecret }) {
  if (typeof runnerTemp !== 'string' || !runnerTemp || typeof githubToken !== 'string' || !githubToken
    || typeof masterSecret !== 'string' || masterSecret.length < 32) inputFailure('B358_CREDENTIALS_REQUIRED');
  const temp = await fs.realpath(runnerTemp);
  const archived = path.join(temp, 'ravradar-b358-reader99eb');
  const output = path.join(temp, 'ravradar-b358-water-audit');
  for (const directory of [archived, output]) {
    const stat = await fs.lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(directory) !== directory)
      inputFailure('B358_READER_ROOT');
  }
  const load = async relative => {
    const requested = path.join(archived, relative);
    const resolved = await fs.realpath(requested);
    if (resolved !== requested || !(await fs.lstat(requested)).isFile()) inputFailure('B358_READER_PATH');
    return import(pathToFileURL(resolved));
  };
  const mainReaders = Object.keys(ARCHIVED_READERS);
  for (const relative of mainReaders) {
    const file = path.join(archived, relative);
    if (await fs.realpath(file) !== file || sha(await fs.readFile(file)) !== ARCHIVED_READERS[relative])
      inputFailure('B358_READER_IDENTITY');
  }
  const reportPath = path.join(output, 'water-level-trend-safe.json');
  // Create the one bounded report exclusively before touching the artifact.
  const handle = await fs.open(reportPath, 'wx', 0o600);
  const cleanups = [];
  let report, phase = 'B358_ARCHIVED_READER', failed = null;
  try {
    report = await withoutSavedAuditSecrets(async () => {
      const [workflow, stage, bundle] = await Promise.all(mainReaders.map(load));
      const expected = {
        ...await workflow.buildPrivateRuntimeExpectation({
          repositoryRoot: archived, targetReferenceAt: TARGET.productionReferenceAt,
        }),
        datasetId: TARGET.datasetId, productionReferenceAt: TARGET.productionReferenceAt,
        minimumReferenceAt: TARGET.productionReferenceAt,
      };
      phase = 'B358_ARTIFACT_READ';
      const artifact = await downloadOrdinaryCompletedStageArtifact({ ...TARGET, token: githubToken,
        fetchImpl: createB358ArtifactFetch(globalThis.fetch) });
      await ownScratch(await fs.realpath(os.tmpdir()), artifact.privateDirectory, 'rr-ordinary-completed-stage-', cleanups);
      if (!isExactArtifact(artifact.artifact) || artifact.producer.conclusion !== 'success') inputFailure('B358_ARTIFACT_PIN');
      const privateRoot = await ownScratch(output, await fs.mkdtemp(path.join(output, 'decrypted-')), 'decrypted-', cleanups);
      const bundlePath = path.join(privateRoot, 'bundle');
      const args = { ...TARGET, privateRoot, bundlePath, repositoryRoot: archived, expected };
      phase = 'B358_STAGE_AUTHENTICATION';
      const restored = await stage.openStagedPrivateProductionRuntime({ ...args, inputPath: artifact.sealedPath, masterSecret });
      if (restored.restored !== true || restored.productionPointerUnchanged !== true)
        inputFailure('B358_AUTHENTICATED_STAGE_REQUIRED');
      const verified = await bundle.verifyPrivateProductionRuntimeBundle(args);
      if (!verified.verified || verified.zoneCount !== 210 || verified.partCount !== 673
        || verified.bundleContentSha256 !== restored.bundleContentSha256) inputFailure('B358_BUNDLE_IDENTITY');
      phase = 'B358_WATER_PROJECTION';
      const projection = await readAuthenticatedProjection({ payload: path.join(bundlePath, 'payload'), root: archived, load });
      phase = 'B358_FINAL_BUNDLE_READ';
      const readback = await bundle.verifyPrivateProductionRuntimeBundle(args);
      if (readback.bundleContentSha256 !== verified.bundleContentSha256 || !same(readback.files, verified.files))
        inputFailure('B358_BUNDLE_CHANGED');
      return { ...TARGET, artifactId: B358_ARTIFACT.id, publicHours: PUBLIC_HOURS, privateSupportHours: 3,
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
    failed = 'B358_SCRATCH_CLEANUP_REFUSED';
  }
  try {
    if (failed !== null || Buffer.byteLength(JSON.stringify(report)) > 48 * 1024)
      report = { reportComplete: false, privatePayloadIncluded: false, phase, reason: failed ?? 'REPORT_LIMIT' };
    await handle.writeFile(JSON.stringify(report) + '\n');
  } finally { await handle.close(); }
  return report.reportComplete;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) inputFailure('B358_FIXED_INPUT_ONLY');
    if (!await auditB358({ runnerTemp: process.env.RUNNER_TEMP, githubToken: process.env.GH_TOKEN,
      masterSecret: process.env.STAGED_PRIVATE_BUILD_MASTER_SECRET })) process.exitCode = 1;
  } catch {
    process.stderr.write('B358_PRIVATE_AUDIT_REFUSED\n');
    process.exitCode = 1;
  }
}
