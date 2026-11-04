// Delivery-only projection of an already produced, verified public time.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { exactMapZoneScore } from '../../js/services/map-forecast-view.js';
import { assertMapHour, kind, landingKind, maximumFrameBytes, plainMapHourEntries } from '../../js/services/plain-map-hour.js';
import { scoreRating } from '../../js/core/score-presentation.js';
import { addNationalRanking, compareNationalRankingRows } from '../../js/core/zone-ranking.js';
import { normalizeZoneRegistry } from '../../js/services/zone-registry.js';
import { sameRavScoreModelBinding } from '../../js/core/ravscore-public-runtime-contract.js';
import { PUBLIC_DELIVERY_MAX_BYTES, publicDeliveryEntries } from '../../js/core/public-delivery-contract.js';

const modes = ['waders', 'beach'];
const sourceTypes = {
  current: ['dmi-marine-grid', 'copernicus-current-grid', 'dmi-regional-proxy-grid'],
  wind: ['dmi-atmospheric-grid', 'dmi-marine-wind-grid', 'open-meteo-wind-grid'],
};
const hashPattern = /^[a-f0-9]{64}$/;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value, expected) => object(value) && Object.keys(value).length === expected.length
  && expected.every(key => Object.hasOwn(value, key));
const encode = value => new TextEncoder().encode(JSON.stringify(value) + '\n');
const sha = value => createHash('sha256').update(value).digest('hex');

function ensure(value, reason) {
  if (!value) throw new Error('MAP_HOUR_' + reason);
}

function validPoint(point) {
  return Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)
    && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
}

const metrics = [
  'windSpeedMps', 'windDirectionDeg', 'waveHeightM', 'waterLevelCm',
  'currentSpeedMps', 'currentDirectionDeg', 'waterLevelTrendCm3h', 'waterTemperatureC',
];

function projectZonePreview(result) {
  const weather = result.available && result.localWeather ? {
    ...Object.fromEntries(metrics.map(key => [key, result.localWeather[key] ?? null])),
    waveInputNoticeId: result.localWeather.waveInputNoticeId ?? null,
  } : null;
  return {
    partName: result.available ? result.localPartName : null,
    historyCoverageHours: result.historyCoverageHours ?? null,
    historyReasonCodes: result.historyReasonCodes ?? [],
    weather,
  };
}


function displayScore(value, arrowWinner) {
  return {
    available: value.available,
    score: value.score,
    level: value.level,
    status: value.status ?? null,
    scoreQuality: value.scoreQuality,
    scoreBounds: value.scoreBounds,
    winningPartId: value.winningPartId ?? null,
    winningPartUncertain: value.winningPartUncertain ?? false,
    possibleWinningParts: value.possibleWinningParts ?? [],
    arrowWinner,
    preview: projectZonePreview(value),
  };
}

function arrow(part, type, time) {
  const { weather, time: partTime } = part.current ?? {};
  const source = part.flowPoints?.sources?.[type];
  const point = part.flowPoints?.[type];
  const input = weather?.[type + 'DirectionDeg'];
  if (partTime !== time || (weather?.time && weather.time !== time)
    || !Array.isArray(point) || !validPoint(point.slice(0, 2)) || !sourceTypes[type].includes(source)
    || input === null || input === undefined || input === '' || !Number.isFinite(Number(input))) return null;
  const info = part.flowPoints.sourceMetadata?.[type];
  return {
    point: point.slice(0, 2),
    direction: Number(input),
    source,
    sourceClass: typeof info?.sourceClass === 'string' ? info.sourceClass : null,
    distanceKm: Number.isFinite(info?.distanceKm) ? info.distanceKm : null,
  };
}

// The calling build must have already verified the exact full hour through the normal public gates.
function projectMapHour({ manifest, entry, fullHour, exactMapZoneScore, scope }) {
  const time = entry.key;
  ensure(entry.kind === 'hour' && hashPattern.test(entry.sha256)
    && fullHour.delivery?.kind === 'hour' && fullHour.delivery.key === time
    && fullHour.delivery.sourceDetailsSha256 === manifest.publicConditionDetailsSha256
    && fullHour.datasetId === manifest.datasetId && fullHour.generatedAt === manifest.generatedAt
    && fullHour.productionReferenceAt === manifest.productionReferenceAt, 'INPUT_BINDING');
  ensure(fullHour.coastalParts?.enabled === true, 'SOURCE_DISABLED');
  ensure(keys(fullHour.coastalParts.zones, scope.zoneIds), 'SOURCE_ZONE_SCOPE');
  ensure(keys(fullHour.coastalParts.parts, Object.keys(scope.partZones)), 'SOURCE_PART_SCOPE');
  const zones = {};
  const parts = {};
  const landingScores = scope.landing ? Object.fromEntries(modes.map(mode => [mode, {}])) : null;
  const conditions = { mapForecastTime: time, coastalParts: fullHour.coastalParts };
  for (const zoneId of scope.zoneIds) {
    const rows = fullHour.coastalParts.zones[zoneId].hourly;
    ensure(Array.isArray(rows) && rows.length === 1 && rows[0].time === time, 'SOURCE_TIME');
    zones[zoneId] = Object.fromEntries(modes.map(mode => {
      const value = exactMapZoneScore({ conditions, time, zoneId, mode });
      ensure(value?.time === time, 'SOURCE_SCORE');
      if (landingScores) landingScores[mode][zoneId] = value;
      return [mode, displayScore(value, rows[0][mode]?.winningPartId ?? null)];
    }));
  }
  for (const [partId, part] of Object.entries(fullHour.coastalParts.parts)) {
    ensure(part.zoneId === scope.partZones[partId], 'SOURCE_PART_OWNER');
    const current = arrow(part, 'current', time);
    const wind = arrow(part, 'wind', time);
    if (current || wind) parts[partId] = { current, wind };
  }
  const frame = { kind: landingScores ? landingKind : kind, datasetId: manifest.datasetId, generatedAt: manifest.generatedAt,
    productionReferenceAt: manifest.productionReferenceAt, time,
    sourceDetailsSha256: manifest.publicConditionDetailsSha256, sourceHourSha256: entry.sha256,
    modelBinding: fullHour.delivery.modelBinding, zones, parts };
  if (landingScores) {
    const { features, coastZones } = scope.landing;
    const currentRankings = Object.fromEntries(modes.map(mode => {
      const ranked = features.map(feature => {
        const zone = feature.properties;
        return addNationalRanking({ zone, result: landingScores[mode][zone.id] }, coastZones[zone.id]);
      }).filter(row => row.result.available).sort(compareNationalRankingRows).slice(0, 5);
      return [mode, ranked.map(row => ({
        zoneId: row.zone.id, score: row.result.score, scoreQuality: row.result.scoreQuality,
        scoreBounds: row.result.scoreBounds, rankingScore: row.rankingScore, rankingDisplayScore: row.rankingDisplayScore,
      }))];
    }));
    ensure(fullHour.nationalForecast?.schemaVersion === 2
      && scope.sameModelBinding(fullHour.nationalForecast.modelBinding, manifest.ravScoreModelBinding),
    'LANDING_NATIONAL_SOURCE');
    const parentArrows = Object.fromEntries(scope.zoneIds.map(zoneId => {
      const original = fullHour.zones[zoneId]?.forecast?.hourly?.[0];
      ensure(original?.time === time, 'LANDING_PARENT_TIME');
      const readDirection = key => {
        const value = original[key];
        return value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
          ? null : Number(value);
      };
      return [zoneId, { currentDirectionDeg: readDirection('currentDirectionDeg'),
        windDirectionDeg: readDirection('windDirectionDeg') }];
    }));
    frame.landing = { currentRankings, nationalForecast: fullHour.nationalForecast, parentArrows };
  }
  assertMapHour(frame, { manifest, entry, scope });
  const bytes = encode(frame);
  ensure(bytes.byteLength <= maximumFrameBytes, 'LIMIT');
  return { frame, bytes };
}

export function createMapHourWriter({ manifest, coastalParts, zoneIds, liveDirectory, zoneRegistry = null }) {
  const partZones = Object.create(null);
  ensure(keys(coastalParts?.zones, zoneIds), 'REGISTRY_ZONES');
  for (const zoneId of zoneIds) {
    const parts = coastalParts.zones[zoneId];
    ensure(Array.isArray(parts) && parts.length > 0, 'REGISTRY_PARTS');
    for (const part of parts) {
      ensure(part.sourceZoneId === zoneId && typeof part.partId === 'string'
        && !Object.hasOwn(partZones, part.partId), 'REGISTRY_PART_OWNER');
      partZones[part.partId] = zoneId;
    }
  }
  ensure(zoneIds.length === manifest.zoneCount
    && Object.keys(partZones).length === manifest.coastalPartCount, 'REGISTRY_COVERAGE');

  let landing = null;
  if (zoneRegistry) {
    const registry = normalizeZoneRegistry(zoneRegistry);
    const activeIds = new Set(registry.active.map(feature => feature.properties.id));
    ensure(registry.counts.registered === manifest.zoneRegistryFeatureCount && registry.duplicates.length === 0
      && activeIds.size === zoneIds.length && zoneIds.every(id => activeIds.has(id)), 'LANDING_ZONE_SCOPE');
    landing = { features: registry.active, coastZones: coastalParts.zones };
  }
  const scope = { zoneIds, partZones, sameModelBinding: sameRavScoreModelBinding, scoreRating, landing };
  const directory = path.join(liveDirectory, 'forecast');
  const descriptors = {};
  const pathFor = descriptor => path.join(directory, descriptor.sha256 + '.json');
  async function write(entry, fullHour) {
    ensure(!Object.hasOwn(descriptors, entry.key), 'DUPLICATE_TIME');
    const { bytes } = projectMapHour({ manifest, entry, fullHour, exactMapZoneScore, scope });
    const sha256 = sha(bytes);
    const descriptor = { path: './forecast/' + sha256 + '.json', sha256, bytes: bytes.byteLength };
    const target = pathFor(descriptor);
    try {
      await fs.writeFile(target, bytes, { flag: 'wx' });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const previous = await fs.lstat(target);
      ensure(previous.isFile() && !previous.isSymbolicLink() && previous.size === bytes.byteLength
        && sha(await fs.readFile(target)) === sha256, 'EXISTING_FRAME_MISMATCH');
    }
    descriptors[entry.key] = descriptor;
  }
  return {
    descriptors,
    write,
    async writeRestored(entry) {
      ensure(hashPattern.test(entry.sha256) && entry.path === './forecast/' + entry.sha256 + '.json'
        && Number.isSafeInteger(entry.bytes) && entry.bytes > 0 && entry.bytes <= PUBLIC_DELIVERY_MAX_BYTES,
      'RESTORED_DESCRIPTOR');
      const input = pathFor(entry);
      const stat = await fs.lstat(input);
      ensure(stat.isFile() && !stat.isSymbolicLink() && stat.size === entry.bytes, 'RESTORED_SIZE');
      const bytes = await fs.readFile(input);
      ensure(bytes.byteLength === entry.bytes && sha(bytes) === entry.sha256, 'RESTORED_SHA');
      await write(entry, JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
      return bytes;
    },
  };
}

// Called after the ordinary unmodified model producer has written its manifest,
// and before the public sharing index and release seal bind the final bytes.
export async function appendPublicMapHours({ manifestPath, manifest, zoneRegistryPath = null, encodeColdHours = false }) {
  const liveDirectory = path.dirname(manifestPath);
  const registryPath = path.join(liveDirectory, 'coastal-parts-v2.json');
  ensure(manifest.detailDelivery?.mapHours === undefined
    && manifest.detailDelivery?.coldHoursSchema === undefined, 'MANIFEST_ALREADY_EXTENDED');
  ensure(!encodeColdHours || zoneRegistryPath, 'COLD_HOURS_REQUIRES_LANDING');
  const priorManifest = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  const manifestStat = await fs.lstat(manifestPath);
  ensure(manifestStat.isFile() && !manifestStat.isSymbolicLink() && manifestStat.size === priorManifest.length
    && (await fs.readFile(manifestPath)).equals(priorManifest), 'MANIFEST_SOURCE');
  const registryStat = await fs.lstat(registryPath);
  ensure(registryStat.isFile() && !registryStat.isSymbolicLink() && registryStat.size === manifest.coastalPartsBytes
    && registryStat.size > 0 && registryStat.size <= 16 * 1024 * 1024, 'REGISTRY_SIZE');
  const registryBytes = await fs.readFile(registryPath);
  ensure(registryBytes.length === registryStat.size && sha(registryBytes) === manifest.coastalPartsSha256, 'REGISTRY_SHA');
  const coastalParts = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(registryBytes));
  let zoneRegistry = null;
  if (zoneRegistryPath) {
    const stat = await fs.lstat(zoneRegistryPath);
    ensure(stat.isFile() && !stat.isSymbolicLink() && stat.size === manifest.zoneRegistryBytes
      && stat.size > 0 && stat.size <= 16 * 1024 * 1024, 'LANDING_ZONE_FILE');
    const bytes = await fs.readFile(zoneRegistryPath);
    ensure(bytes.length === stat.size && sha(bytes) === manifest.zoneRegistrySha256, 'LANDING_ZONE_SHA');
    zoneRegistry = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  }
  const fullEntries = publicDeliveryEntries(manifest);
  const zoneIds = fullEntries.filter(entry => entry.kind === 'zone').map(entry => entry.key);
  const workingManifest = zoneRegistry ? { ...manifest, detailDelivery: { ...manifest.detailDelivery, mapHoursLandingSchema: 1 } } : manifest;
  const writer = createMapHourWriter({ manifest: workingManifest, coastalParts, zoneIds, liveDirectory, zoneRegistry });
  const hours = { ...workingManifest.detailDelivery.hours };
  let index = 0;
  const transport = encodeColdHours ? await import('./public-cold-hour-transport.mjs') : null;
  const { RAW_PUBLIC_HOUR_COUNT, publicDeliveryTransportEntries } =
    await import('../../js/services/public-delivery-transport-binding.js');
  for (const entry of fullEntries) {
    if (entry.kind !== 'hour') continue;
    const raw = await writer.writeRestored(entry);
    if (index++ >= RAW_PUBLIC_HOUR_COUNT && transport) {
      hours[entry.key] = await transport.writeColdPublicHour({ liveDirectory, entry, raw });
    }
  }
  const detailDelivery = { ...workingManifest.detailDelivery, hours, mapHours: writer.descriptors,
    ...(transport ? { coldHoursSchema: 1 } : {}) };
  const finalManifest = { ...manifest, detailDelivery };
  plainMapHourEntries(finalManifest, publicDeliveryTransportEntries(finalManifest));
  const nextManifest = Buffer.from(JSON.stringify({ ...manifest, detailDelivery }, null, 2) + '\n');
  const temporaryManifest = manifestPath + '.map-hours-' + randomUUID();
  await fs.writeFile(temporaryManifest, nextManifest, { flag: 'wx' });
  ensure((await fs.readFile(manifestPath)).equals(priorManifest), 'MANIFEST_CHANGED');
  await fs.rename(temporaryManifest, manifestPath);
  manifest.detailDelivery = detailDelivery;
}
