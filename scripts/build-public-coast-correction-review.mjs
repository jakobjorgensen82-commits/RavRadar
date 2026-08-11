#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {renderOwnerReviewHtml} from './lib/national-owner-review-html.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index < 0 ? fallback : args[index + 1];
};

function lines(geometry) {
  if (geometry?.type === 'LineString') return [geometry.coordinates];
  if (geometry?.type === 'MultiLineString') return geometry.coordinates || [];
  return [];
}

export function buildReview(geojson) {
  const grouped = new Map();
  for (const feature of geojson.features || []) {
    const props = feature.properties || {};
    const zoneId = props.zoneId || props.proposalId;
    const row = grouped.get(zoneId) || {zoneId, lines: [], feature: props};
    row.lines.push(...lines(feature.geometry));
    grouped.set(zoneId, row);
  }
  const fallbackNames = {
    'DK-B05-20': 'Nibe Bredning vest',
    'DK-B10-13': 'Bredfjed',
    'DK-B12-07': 'Mommark & Pøl Huk',
  };
  const parts = [...grouped.values()].map(row => ({
    zoneId: row.zoneId,
    partId: `corrected-${row.zoneId.toLowerCase()}`,
    name: row.feature.proposedMainZoneName || fallbackNames[row.zoneId] || row.zoneId,
    lengthKm: Number(row.feature.lengthKm || 0),
    geometry: {type: 'MultiLineString', coordinates: row.lines},
    reviewStatus: 'blocked',
    blockedReasons: ['ejerrettelse-udført'],
    reviewReason: 'Den blå linje viser rettelsen efter din seneste gennemgang. Kortet er stadig privat og ændrer ikke RavRadar.',
  }));
  return {
    schemaVersion: '1.0.0',
    status: 'private-public-coast-owner-correction-review',
    generatedAt: new Date().toISOString(),
    partCount: parts.length,
    zoneCount: parts.length,
    statusCounts: {complete: 0, partial: 0, blocked: parts.length},
    parts,
    reviewTitle: 'Kontrol af 6 udførte kystrettelser',
    reviewIntro: 'Ålsgårde/Helsingør-forslaget og Fejø/Femø-forslaget er slettet som ønsket. Her vises de seks zoner, der er bevaret eller rettet.',
    attentionLabel: '6 rettede zoner',
    allLabel: 'Alle 6',
    storageKey: 'ravradar-public-coast-owner-correction-review-v1',
    automaticActivationAllowed: false,
  };
}

async function main() {
  if (args.includes('--self-test')) {
    const report = buildReview({features: [{properties: {zoneId: 'Z', proposedMainZoneName: 'Test'}, geometry: {type: 'LineString', coordinates: [[8, 55], [8.1, 55]]}}]});
    if (report.partCount !== 1 || report.parts[0].name !== 'Test') throw new Error('Correction review self-test fejlede.');
    console.log('Public coast correction review self-test: bestået.');
    return;
  }
  const source = value('--source', '.geometry-v2-work/public-coast-owner-corrections.geojson');
  const output = value('--output', 'KYSTZONER-RETTELSER-KONTROL.html');
  const report = buildReview(JSON.parse(await fs.readFile(source, 'utf8')));
  await fs.mkdir(path.dirname(path.resolve(output)), {recursive: true});
  await fs.writeFile(output, renderOwnerReviewHtml(report));
  console.log(JSON.stringify({partCount: report.partCount, output}));
}

main().catch(error => { console.error(error.stack || error.message); process.exit(1); });
