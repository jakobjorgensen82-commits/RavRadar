#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderOwnerReviewHtml} from './lib/national-owner-review-html.mjs';

function value(args, flag, fallback) {
  const index = args.indexOf(flag);
  return index < 0 ? fallback : args[index + 1];
}

function collectParts(payload, names = {parts: []}) {
  const namesById = new Map((names.parts || []).map(row => [row.finalPartId || row.partId, row.suggestedName || row.name]));
  const parts = [];
  if (payload.type === 'FeatureCollection') {
    for (const feature of payload.features || []) {
      const properties = feature.properties || {};
      const zoneId = properties.zoneId;
      const partId = properties.finalPartId || properties.partId;
      if (!zoneId || !partId || !feature.geometry) continue;
      parts.push({
        zoneId,
        partId,
        name: namesById.get(partId) || zoneId,
        lengthKm: Number(properties.lengthKm || geometryLengthKm(feature.geometry)),
        geometry: feature.geometry,
        reviewStatus: 'complete',
        blockedReasons: [],
        reviewReason: 'Aktiv, godkendt kystdel. Kortet er et privat visuelt audit og ændrer ikke produktionen.',
      });
    }
    return parts.sort((left, right) => left.zoneId.localeCompare(right.zoneId) || left.partId.localeCompare(right.partId));
  }
  for (const [zoneId, entry] of Object.entries(payload.zones || {})) {
    const rows = Array.isArray(entry) ? entry : Array.isArray(entry?.parts) ? entry.parts : [entry];
    for (const [index, row] of rows.entries()) {
      if (!row?.geometry) continue;
      parts.push({
        zoneId,
        partId: row.partId || `${zoneId}-part-${String(index + 1).padStart(2, '0')}`,
        name: row.name || row.partName || zoneId,
        lengthKm: Number(row.lengthKm || geometryLengthKm(row.geometry)),
        geometry: row.geometry,
        reviewStatus: 'complete',
        blockedReasons: [],
        reviewReason: 'Aktiv, godkendt kystdel. Kortet er et privat visuelt audit og ændrer ikke produktionen.',
      });
    }
  }
  return parts.sort((left, right) => left.zoneId.localeCompare(right.zoneId) || left.partId.localeCompare(right.partId));
}

function geometryLines(geometry) {
  if (geometry?.type === 'LineString') return [geometry.coordinates];
  if (geometry?.type === 'MultiLineString') return geometry.coordinates || [];
  return [];
}

function geometryLengthKm(geometry) {
  const radiusKm = 6371.0088;
  let total = 0;
  for (const coordinates of geometryLines(geometry)) {
    for (let index = 1; index < coordinates.length; index += 1) {
      const [leftLon, leftLat] = coordinates[index - 1].map(Number);
      const [rightLon, rightLat] = coordinates[index].map(Number);
      const lat1 = leftLat * Math.PI / 180;
      const lat2 = rightLat * Math.PI / 180;
      const deltaLat = (rightLat - leftLat) * Math.PI / 180;
      const deltaLon = (rightLon - leftLon) * Math.PI / 180;
      const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
      total += 2 * radiusKm * Math.asin(Math.min(1, Math.sqrt(haversine)));
    }
  }
  return Number(total.toFixed(3));
}

export function buildReview(payload, assemblyAudit = {}, names = {parts: []}) {
  const parts = collectParts(payload, names);
  const zoneCount = new Set(parts.map(part => part.zoneId)).size;
  const overview = {
    zoneId: 'DK-NATIONAL-AUDIT',
    partId: 'national-active-coast-overview',
    name: 'Hele Danmarks aktive kyst',
    lengthKm: 0,
    geometry: {type: 'MultiLineString', coordinates: parts.flatMap(part => geometryLines(part.geometry))},
    reviewStatus: 'complete',
    blockedReasons: [],
    reviewReason: 'Samlet landsvisning til visuel kontrol af dækning, fremmed geometri og usammenhængende kyst.',
  };
  const reviewParts = [overview, ...parts];
  return {
    schemaVersion: '1.0.0',
    status: 'private-active-coast-visual-audit',
    generatedAt: new Date().toISOString(),
    partCount: reviewParts.length,
    zoneCount,
    statusCounts: {complete: reviewParts.length, partial: 0, blocked: 0},
    parts: reviewParts,
    reviewTitle: `Privat nataudit · ${zoneCount} zoner · ${parts.length} kystdele`,
    reviewIntro: `Den blå linje er den produktionsverificerede kyst. Auditstatus: ${assemblyAudit.status || 'ukendt'}. Overlap: ${assemblyAudit.overlapPairCount ?? 'ukendt'}. Uafklarede relevante huller: ${assemblyAudit.unresolvedRelevantGapCount ?? 'ukendt'}.`,
    attentionLabel: 'Dokumenterede problemer: 0',
    allLabel: `Oversigt + ${parts.length}`,
    storageKey: 'ravradar-private-active-coast-visual-audit-v1',
    automaticActivationAllowed: false,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    const review = buildReview({zones: {Z1: {parts: [{partId: 'p1', name: 'Test', geometry: {type: 'LineString', coordinates: [[8, 55], [8.1, 55]]}}]}}}, {overlapPairCount: 0, unresolvedRelevantGapCount: 0});
    if (review.partCount !== 2 || review.zoneCount !== 1 || review.parts[0].partId !== 'national-active-coast-overview' || review.parts[1].partId !== 'p1') throw new Error('Active coast visual audit self-test fejlede.');
    console.log('Active coast visual audit self-test: bestået.');
    return;
  }
  const source = value(args, '--source', 'data/geometry-v2/active-national-coastal-parts/coastal-parts.geojson');
  const auditFile = value(args, '--audit', 'data/geometry-v2/active-national-coastal-parts/assembly-audit.json');
  const namesFile = value(args, '--names', 'data/geometry-v2/active-national-coastal-parts/part-names.json');
  const output = value(args, '--output', '.owner-review/active-coast-night-audit/index.html');
  const [payload, audit, names] = await Promise.all([source, auditFile, namesFile].map(file => fs.readFile(file, 'utf8').then(JSON.parse)));
  const review = buildReview(payload, audit, names);
  await fs.mkdir(path.dirname(path.resolve(output)), {recursive: true});
  await fs.writeFile(output, renderOwnerReviewHtml(review));
  console.log(JSON.stringify({partCount: review.partCount, zoneCount: review.zoneCount, output}));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(error => { console.error(error.stack || error.message); process.exit(1); });
}
