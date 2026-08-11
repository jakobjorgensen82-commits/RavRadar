#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderOwnerReviewHtml} from './lib/national-owner-review-html.mjs';

function value(args, flag, fallback) {
  const index = args.indexOf(flag);
  return index < 0 ? fallback : args[index + 1];
}

function geometryLines(geometry) {
  if (geometry?.type === 'LineString') return [geometry.coordinates];
  if (geometry?.type === 'MultiLineString') return geometry.coordinates || [];
  return [];
}

export function buildReview({candidateReport, proposalReport, proposalGeojson, zones, waddenProposal = {features: []}}) {
  const proposalRows = new Map((proposalReport.zones || []).map(row => [row.zoneId, row]));
  const zoneRows = new Map((zones.features || []).map(feature => [feature.properties?.id, feature.properties]));
  const featuresByZone = new Map();
  for (const feature of proposalGeojson.features || []) {
    const zoneId = feature.properties?.zoneId;
    if (!featuresByZone.has(zoneId)) featuresByZone.set(zoneId, []);
    featuresByZone.get(zoneId).push(feature);
  }
  const residualParts = (candidateReport.recoveryZones || [])
    .filter(row => !row.includedInPrivateCandidate)
    .map(row => {
      const proposal = proposalRows.get(row.zoneId) || {};
      const zone = zoneRows.get(row.zoneId) || {};
      const proposalFeatures = featuresByZone.get(row.zoneId) || [];
      const lines = proposalFeatures.flatMap(feature => geometryLines(feature.geometry));
      const hasOfficialProposal = lines.length > 0;
      const fallback = Array.isArray(zone.coastLine) && zone.coastLine.length > 1 ? [zone.coastLine] : [];
      const geometry = {type: 'MultiLineString', coordinates: hasOfficialProposal ? lines : fallback};
      return {
        zoneId: row.zoneId,
        partId: `residual-${row.zoneId.toLowerCase()}`,
        name: proposal.currentName || zone.name || row.zoneId,
        lengthKm: Number(proposal.coastalParts?.reduce((sum, part) => sum + Number(part.lengthKm || 0), 0).toFixed(3)),
        geometry,
        reviewStatus: 'blocked',
        blockedReasons: row.qualityFlags || [],
        reviewReason: hasOfficialProposal
          ? 'Den blå linje er den officielle kystkandidat, men den stemmer ikke sikkert med den centralt gemte hovedzone. Vurdér om placering og zonenavn hører sammen.'
          : 'Der blev ikke fundet en sikker officiel kyst i den centralt gemte hovedzone. Den blå linje er kun den gamle grove placering og må ikke godkendes som præcis kyst.',
      };
    });
  const waddenReviewIds = new Map([
    ['wadden-mainland-01', 'DK-B04-W01'],
    ['wadden-mainland-02', 'DK-B04-W02'],
    ['wadden-mainland-03', 'DK-B04-W03'],
  ]);
  const waddenParts = (waddenProposal.features || []).map(feature => ({
    zoneId: waddenReviewIds.get(feature.properties?.proposalId) || feature.properties?.proposalId,
    partId: `residual-${feature.properties?.proposalId}`,
    name: feature.properties?.proposedMainZoneName,
    lengthKm: Number(feature.properties?.lengthKm || 0),
    geometry: feature.geometry,
    reviewStatus: 'blocked',
    blockedReasons: ['ny-fastlandszone'],
    reviewReason: 'Ny relevant fastlandskyst langs Vadehavet. Den officielle GeoDanmark-linje er valgt uden overlap med Fanø, Mandø, Rømø eller eksisterende zoner. Kontrollér især om hovedzonens navn og nord/syd-grænser er forståelige.',
  }));
  const parts = [...waddenParts, ...residualParts];
  return {
    schemaVersion: '1.0.0',
    status: 'private-public-coast-residual-owner-review',
    generatedAt: new Date().toISOString(),
    partCount: parts.length,
    zoneCount: parts.length,
    statusCounts: {complete: 0, partial: 0, blocked: parts.length},
    parts,
    reviewTitle: `Slutkontrol af ${parts.length} kystzoner`,
    reviewIntro: 'Først vises tre nye fastlandszoner langs Vadehavet fra Emmerlev til Esbjerg. Derefter vises de fem øvrige zoner, hvor den gamle afgrænsning og den officielle kyst ikke kan forenes sikkert automatisk.',
    attentionLabel: `${parts.length} kræver valg`,
    allLabel: `Alle ${parts.length}`,
    storageKey: 'ravradar-public-coast-residual-review-v1',
    automaticActivationAllowed: false,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    const report = buildReview({
      candidateReport: {recoveryZones: [{zoneId: 'Z', includedInPrivateCandidate: false, qualityFlags: ['x']}]},
      proposalReport: {zones: [{zoneId: 'Z', currentName: 'Test', coastalParts: [{lengthKm: 1}]}]},
      proposalGeojson: {features: [{properties: {zoneId: 'Z'}, geometry: {type: 'LineString', coordinates: [[8, 56], [8.1, 56]]}}]},
      zones: {features: []},
      waddenProposal: {features: []},
    });
    if (report.partCount !== 1 || report.parts[0].geometry.coordinates.length !== 1) throw new Error('Residual review self-test fejlede.');
    console.log('Public coast residual review self-test: bestået.');
    return;
  }
  const candidateFile = value(args, '--candidate-report', '.geometry-v2-work/incremental-public-coast-candidate-report.json');
  const proposalFile = value(args, '--proposal-report', '.geometry-v2-work/national-coastal-parts.json');
  const proposalGeojsonFile = value(args, '--proposal-geojson', '.geometry-v2-work/national-coastal-parts.geojson');
  const zonesFile = value(args, '--zones', 'data/zones.geojson');
  const waddenFile = value(args, '--wadden-proposal', '');
  const output = value(args, '--output', 'KYSTZONER-SLUTKONTROL.html');
  const [candidateReport, proposalReport, proposalGeojson, zones] = await Promise.all(
    [candidateFile, proposalFile, proposalGeojsonFile, zonesFile].map(file => fs.readFile(file, 'utf8').then(JSON.parse)),
  );
  const waddenProposal = waddenFile ? JSON.parse(await fs.readFile(waddenFile, 'utf8')) : {features: []};
  const report = buildReview({candidateReport, proposalReport, proposalGeojson, zones, waddenProposal});
  await fs.mkdir(path.dirname(path.resolve(output)), {recursive: true});
  await fs.writeFile(output, renderOwnerReviewHtml(report));
  console.log(JSON.stringify({partCount: report.partCount, output}));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(error => { console.error(error.stack || error.message); process.exit(1); });
}
