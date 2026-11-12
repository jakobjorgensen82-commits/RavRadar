// Private, display-only prototype. The canonical hour and zone payloads remain unchanged.
import { assertZonePreview } from './zone-hour-preview.js?v=4.0.614&map=plain-map-v3-20261104';
import { deliverySourceSha256 } from './public-delivery-transport-binding.js?v=4.0.614&map=plain-map-v3-20261104';

export const kind = 'ravradar-plain-map-hour-v2';
export const landingKind = 'ravradar-plain-map-hour-v3';
export const maximumFrameBytes = 2 * 1024 * 1024;
const modes = ['waders', 'beach'];
const types = ['current', 'wind'];
const qualities = ['FULL_HISTORY', 'HISTORY_INCOMPLETE', 'UNAVAILABLE'];
const sourceTypes = {
  current: ['dmi-marine-grid', 'copernicus-current-grid', 'dmi-regional-proxy-grid'],
  wind: ['dmi-atmospheric-grid', 'dmi-marine-wind-grid', 'open-meteo-wind-grid'],
};
const hashPattern = /^[a-f0-9]{64}$/;
const idPattern = /^[A-Za-z0-9_-]{1,100}$/;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;
const scoreNumber = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const keys = (value, expected) => object(value) && Object.keys(value).length === expected.length
  && expected.every(key => Object.hasOwn(value, key));

function ensure(value, reason) {
  if (!value) throw new Error('MAP_HOUR_' + reason);
}

function validPoint(point) {
  return Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)
    && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
}

function bounds(value, score, fullHistory = false) {
  return keys(value, ['lower', 'upper', 'modelUncertaintyPoints', 'rawLower', 'rawUpper'])
    && Object.values(value).every(scoreNumber)
    && score === value.lower && value.lower <= value.upper && value.rawLower <= value.rawUpper
    && Math.abs(value.modelUncertaintyPoints - (value.upper - value.lower)) <= 1e-9
    && (!fullHistory || (value.lower === value.upper && value.rawLower === value.rawUpper));
}


export function plainMapHourEntries(manifest, fullEntries) {
  const rows = manifest.detailDelivery?.mapHours;
  const landingSchema = manifest.detailDelivery?.mapHoursLandingSchema;
  ensure(landingSchema === undefined || (landingSchema === 1 && rows !== undefined), 'LANDING_SCHEMA');
  if (rows === undefined) return null;
  const fullHours = fullEntries.filter(entry => entry.kind === 'hour');
  const times = fullHours.map(entry => entry.key);
  const used = new Set(fullEntries.map(entry => entry.path));
  ensure(keys(rows, times), 'INVENTORY');
  for (const entry of Object.values(rows)) {
    ensure(keys(entry, ['path', 'sha256', 'bytes']) && hashPattern.test(entry.sha256)
      && entry.path === './forecast/' + entry.sha256 + '.json' && !used.has(entry.path)
      && Number.isSafeInteger(entry.bytes) && entry.bytes > 0 && entry.bytes <= maximumFrameBytes,
    'DESCRIPTOR');
    used.add(entry.path);
  }
  return rows;
}

function assertMode(value, zoneId, { partZones, scoreRating }) {
  ensure(keys(value, ['available', 'score', 'level', 'status', 'scoreQuality', 'scoreBounds', 'winningPartId',
    'winningPartUncertain', 'possibleWinningParts', 'arrowWinner', 'preview']) && typeof value.available === 'boolean'
    && typeof value.level === 'string' && qualities.includes(value.scoreQuality)
    && typeof value.winningPartUncertain === 'boolean' && Array.isArray(value.possibleWinningParts)
    && (value.arrowWinner === null || partZones[value.arrowWinner] === zoneId), 'ZONE_MODE');
  assertZonePreview(value.preview, value);
  if (!value.available) {
    ensure(value.score === null && value.scoreBounds === null && value.scoreQuality === 'UNAVAILABLE'
      && value.level === 'unavailable' && value.status === null && value.winningPartId === null
      && value.winningPartUncertain === false && value.possibleWinningParts.length === 0, 'UNAVAILABLE_SCORE');
    return;
  }
  ensure(scoreNumber(value.score) && value.scoreQuality !== 'UNAVAILABLE'
    && value.level === scoreRating(value.score).level, 'AVAILABLE_SCORE');
  ensure(['partial-zone', 'whole-zone', 'only-part', 'several-parts'].includes(value.status), 'AVAILABLE_STATUS');
  ensure(partZones[value.winningPartId] === zoneId, 'AVAILABLE_WINNER_OWNER');
  ensure(bounds(value.scoreBounds, value.score, value.scoreQuality === 'FULL_HISTORY'), 'AVAILABLE_BOUNDS');
  let priorId = '';
  let hasWinner = false;
  for (const part of value.possibleWinningParts) {
    ensure(keys(part, ['partId', 'name', 'score', 'scoreBounds']) && partZones[part.partId] === zoneId
      && part.partId > priorId && typeof part.name === 'string' && part.name.length > 0
      && scoreNumber(part.score) && bounds(part.scoreBounds, part.score)
      && part.scoreBounds.upper >= value.score, 'POSSIBLE_WINNER');
    priorId = part.partId;
    if (part.partId === value.winningPartId && part.score === value.score) hasWinner = true;
  }
  ensure(hasWinner && value.winningPartUncertain === (value.status === 'partial-zone'
    || (value.scoreQuality === 'HISTORY_INCOMPLETE' && value.possibleWinningParts.length > 1)), 'WINNER');
}

export function assertMapHour(frame, { manifest, entry, scope }) {
  const hasLanding = frame?.kind === landingKind;
  const frameFields = ['kind', 'datasetId', 'generatedAt', 'productionReferenceAt', 'time', 'sourceDetailsSha256',
    'sourceHourSha256', 'modelBinding', 'zones', 'parts'];
  if (hasLanding) frameFields.push('landing');
  ensure(keys(frame, frameFields) && (frame.kind === kind || hasLanding)
    && (!hasLanding || keys(frame.landing, ['currentRankings', 'nationalForecast', 'parentArrows']))
    && hasLanding === (manifest.detailDelivery.mapHoursLandingSchema === 1)
    && frame.datasetId === manifest.datasetId && frame.generatedAt === manifest.generatedAt
    && frame.productionReferenceAt === manifest.productionReferenceAt
    && [frame.generatedAt, frame.productionReferenceAt, frame.time].every(iso)
    && entry.kind === 'hour' && frame.time === entry.key && frame.sourceHourSha256 === deliverySourceSha256(entry)
    && hashPattern.test(frame.sourceHourSha256) && hashPattern.test(frame.sourceDetailsSha256)
    && frame.sourceDetailsSha256 === manifest.publicConditionDetailsSha256
    && scope.sameModelBinding(frame.modelBinding, manifest.ravScoreModelBinding), 'FRAME_BINDING');
  if (hasLanding) {
    ensure(keys(frame.landing.parentArrows, scope.zoneIds), 'LANDING_PARENT_ZONES');
    for (const row of Object.values(frame.landing.parentArrows)) {
      ensure(keys(row, ['currentDirectionDeg', 'windDirectionDeg'])
        && Object.values(row).every(value => value === null || Number.isFinite(value)), 'LANDING_PARENT_ARROW');
    }
  }
  ensure(scope.zoneIds.every(zoneId => idPattern.test(zoneId)) && keys(frame.zones, scope.zoneIds)
    && object(frame.parts) && Object.keys(frame.parts).length <= Object.keys(scope.partZones).length, 'FRAME_SCOPE');
  for (const [zoneId, row] of Object.entries(frame.zones)) {
    ensure(keys(row, modes), 'ZONE_ROW');
    for (const mode of modes) assertMode(row[mode], zoneId, scope);
  }
  for (const [partId, row] of Object.entries(frame.parts)) {
    ensure(idPattern.test(partId) && Object.hasOwn(scope.partZones, partId) && keys(row, types)
      && (row.current !== null || row.wind !== null), 'PART_ROW');
    for (const type of types) {
      const value = row[type];
      if (value === null) continue;
      ensure(keys(value, ['point', 'direction', 'source', 'sourceClass', 'distanceKm'])
        && validPoint(value.point) && Number.isFinite(value.direction) && sourceTypes[type].includes(value.source)
        && (value.sourceClass === null || typeof value.sourceClass === 'string')
        && (value.distanceKm === null || Number.isFinite(value.distanceKm)), 'ARROW');
    }
  }
  return frame;
}

export async function readMapHour(bytes, { descriptor, manifest, entry, scope }) {
  ensure(bytes instanceof Uint8Array && bytes.byteLength > 0 && bytes.byteLength <= maximumFrameBytes
    && keys(descriptor, ['path', 'bytes', 'sha256']) && descriptor.bytes === bytes.byteLength
    && hashPattern.test(descriptor.sha256), 'OUTER_SIZE');
  ensure(descriptor.path === './forecast/' + descriptor.sha256 + '.json', 'OUTER_PATH');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
  ensure(sha256 === descriptor.sha256, 'OUTER_SHA');
  let frame;
  try { frame = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new Error('MAP_HOUR_OUTER_JSON'); }
  return assertMapHour(frame, { manifest, entry, scope });
}

// Feed only the existing display arrow builder. This is not full conditions or a zone panel input.
export function arrowInputs(frame, partZones) {
  const zones = Object.fromEntries(Object.entries(frame.zones).map(([zoneId, modes]) => [zoneId, {
    hourly: [{ time: frame.time, waders: { winningPartId: modes.waders.arrowWinner },
      beach: { winningPartId: modes.beach.arrowWinner } }],
  }]));
  const parts = Object.fromEntries(Object.entries(frame.parts).map(([partId, row]) => {
    const weather = {};
    const flowPoints = { sources: {}, sourceMetadata: {} };
    for (const type of types) {
      const value = row[type];
      if (value === null) continue;
      weather[type + 'DirectionDeg'] = value.direction;
      flowPoints[type] = value.point;
      flowPoints.sources[type] = value.source;
      flowPoints.sourceMetadata[type] = { sourceClass: value.sourceClass, distanceKm: value.distanceKm };
    }
    return [partId, { zoneId: partZones[partId], current: { time: frame.time, weather }, flowPoints }];
  }));
  return { enabled: true, zones, parts };
}
