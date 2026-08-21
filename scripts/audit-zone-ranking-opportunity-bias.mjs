#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildLocalZoneScore, selectLocalBestForDay } from '../js/core/local-zone-score.js';
import { mergeConditionDetails } from '../js/services/data-service.js';

const EXPECTED_ZONES = 210;
const EXPECTED_PARTS = 673;
const MODES = ['waders', 'beach'];
const round3 = value => Number(Number(value).toFixed(3));
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

function argumentsFor(values) {
  const after = flag => {
    const index = values.indexOf(flag);
    return index >= 0 ? values[index + 1] : null;
  };
  return {
    selfTest: values.includes('--self-test'),
    conditions: after('--conditions'),
    details: after('--details'),
    zones: after('--zones'),
    parts: after('--parts'),
    output: after('--output') || '.cache/zone-ranking-opportunity-bias.json',
    summary: after('--summary') || '.cache/zone-ranking-opportunity-bias.txt',
  };
}

function circularDifference(first, second) {
  return Math.abs(((Number(first) - Number(second) + 540) % 360) - 180);
}

export function directionCoverage(directions, tolerance = 55) {
  const valid = directions.map(Number).filter(Number.isFinite).map(value => ((value % 360) + 360) % 360);
  if (!valid.length) return 0;
  const covered = Array.from({ length: 360 }, (_, degree) =>
    valid.some(direction => circularDifference(degree, direction) <= tolerance)).filter(Boolean).length;
  return covered / 360;
}

function partsByZone(document) {
  return new Map(Object.entries(document?.zones || {}).map(([zoneId, value]) => [
    zoneId,
    Array.isArray(value) ? value : Array.isArray(value?.parts) ? value.parts : [],
  ]));
}

function supportFor(result) {
  const coverage = result?.localCoverage || {};
  const count = Number(coverage.comparisonPartCount || coverage.expectedPartCount || 0);
  if (!count) return { count: 0, ratio: null, status: coverage.status || 'unknown' };
  const support = coverage.status === 'whole-zone'
    ? count
    : coverage.status === 'only-part'
      ? 1
      : Math.max(1, Array.isArray(coverage.parts) ? coverage.parts.length : 1);
  return { count: support, ratio: support / count, status: coverage.status || 'unknown' };
}

function rankingRows(coastalParts, zoneIds, mode, { date = null } = {}) {
  return zoneIds.map(zoneId => {
    const selected = date
      ? selectLocalBestForDay({ coastalParts, zoneId, mode, date, now: 0 })
      : null;
    const result = date
      ? selected?.result
      : buildLocalZoneScore({
          coastalParts,
          zoneId,
          mode,
          time: coastalParts?.zones?.[zoneId]?.currentReferenceAt,
        });
    if (!result?.available || !Number.isFinite(Number(result.score))) return null;
    return { zoneId, score: Number(result.score), ...supportFor(result) };
  }).filter(Boolean).sort((left, right) => right.score - left.score || left.zoneId.localeCompare(right.zoneId));
}

function pearson(rows, x, y) {
  const pairs = rows.map(row => [Number(row[x]), Number(row[y])]).filter(pair => pair.every(Number.isFinite));
  if (pairs.length < 2) return null;
  const xMean = mean(pairs.map(pair => pair[0]));
  const yMean = mean(pairs.map(pair => pair[1]));
  const numerator = pairs.reduce((sum, pair) => sum + (pair[0] - xMean) * (pair[1] - yMean), 0);
  const xSquare = pairs.reduce((sum, pair) => sum + (pair[0] - xMean) ** 2, 0);
  const ySquare = pairs.reduce((sum, pair) => sum + (pair[1] - yMean) ** 2, 0);
  return xSquare > 0 && ySquare > 0 ? numerator / Math.sqrt(xSquare * ySquare) : 0;
}

function partBucket(count) {
  if (count <= 2) return '1-2';
  if (count <= 5) return '3-5';
  return '6+';
}

function aggregateBuckets(rows, slotCount) {
  return ['1-2', '3-5', '6+'].map(bucket => {
    const selected = rows.filter(row => row.partBucket === bucket);
    const appearances = selected.reduce((sum, row) => sum + row.top5Appearances, 0);
    const zoneShare = selected.length / rows.length;
    const slotShare = slotCount ? appearances / slotCount : 0;
    return {
      partBucket: bucket,
      zones: selected.length,
      zoneShare: round3(zoneShare),
      top5Appearances: appearances,
      top5SlotShare: round3(slotShare),
      overrepresentationRatio: zoneShare ? round3(slotShare / zoneShare) : null,
      meanDirectionCoverage55: round3(mean(selected.map(row => row.directionCoverage55)) || 0),
      meanTop5WinnerSupportRatio: round3(mean(selected.map(row => row.meanTop5WinnerSupportRatio).filter(Number.isFinite)) || 0),
    };
  });
}

export function buildAudit(conditions, details, zonesDocument, partsDocument) {
  const merged = mergeConditionDetails(conditions, details);
  const coastalParts = merged.coastalParts;
  assert.equal(coastalParts?.enabled, true, 'The deployed local coastal-part runtime is not enabled');
  assert.equal(Number(coastalParts.expectedPartCount), EXPECTED_PARTS, 'The audit requires all 673 coastal parts');
  assert.equal(Number(coastalParts.scoredPartCount), EXPECTED_PARTS, 'The audit requires all 673 scored coastal parts');

  const zoneNames = new Map((zonesDocument.features || []).map(feature => [
    String(feature.properties?.id || ''),
    String(feature.properties?.name || feature.properties?.id || ''),
  ]));
  const zoneIds = Object.keys(coastalParts.zones || {}).filter(zoneId => zoneNames.has(zoneId)).sort();
  assert.equal(zoneIds.length, EXPECTED_ZONES, 'The audit requires all 210 active zones');
  const configuredParts = partsByZone(partsDocument);
  const dates = [...new Set(zoneIds.flatMap(zoneId =>
    (coastalParts.zones?.[zoneId]?.hourly || []).map(row => String(row.time || '').slice(0, 10)).filter(Boolean)
  ))].sort().slice(0, 5);
  assert.equal(dates.length, 5, 'The audit requires five forecast dates');

  const rankings = [];
  for (const mode of MODES) {
    rankings.push({ context: 'current', mode, date: null, rows: rankingRows(coastalParts, zoneIds, mode) });
    for (const date of dates) rankings.push({ context: 'five-day', mode, date, rows: rankingRows(coastalParts, zoneIds, mode, { date }) });
  }
  const completeRankings = rankings.filter(ranking => ranking.rows.length >= 5);
  assert.equal(completeRankings.length, 12, 'The audit requires two current and ten five-day rankings');

  const stats = new Map(zoneIds.map(zoneId => [zoneId, {
    top5Appearances: 0,
    ranks: [],
    evaluatedContexts: 0,
    supportRatios: [],
    top5SupportRatios: [],
    onlyPartTop5Appearances: 0,
  }]));
  let slotCount = 0;
  for (const ranking of completeRankings) {
    ranking.rows.forEach((row, index) => {
      const value = stats.get(row.zoneId);
      value.evaluatedContexts += 1;
      if (Number.isFinite(row.ratio)) value.supportRatios.push(row.ratio);
      if (index < 5) {
        slotCount += 1;
        value.top5Appearances += 1;
        value.ranks.push(index + 1);
        if (Number.isFinite(row.ratio)) value.top5SupportRatios.push(row.ratio);
        if (row.status === 'only-part') value.onlyPartTop5Appearances += 1;
      }
    });
  }

  const zones = zoneIds.map(zoneId => {
    const configured = configuredParts.get(zoneId) || [];
    const runtimeCount = Number(coastalParts.zones?.[zoneId]?.expectedPartCount || configured.length);
    const directions = configured.map(part => part?.onshoreDirectionDeg).map(Number).filter(Number.isFinite);
    const value = stats.get(zoneId);
    return {
      zoneId,
      zoneName: zoneNames.get(zoneId),
      partCount: runtimeCount,
      partBucket: partBucket(runtimeCount),
      directionCoverage25: round3(directionCoverage(directions, 25)),
      directionCoverage55: round3(directionCoverage(directions, 55)),
      top5Appearances: value.top5Appearances,
      top5AppearanceRate: round3(value.top5Appearances / completeRankings.length),
      meanTop5Rank: value.ranks.length ? round3(mean(value.ranks)) : null,
      onlyPartTop5Appearances: value.onlyPartTop5Appearances,
      meanWinnerSupportRatio: value.supportRatios.length ? round3(mean(value.supportRatios)) : null,
      meanTop5WinnerSupportRatio: value.top5SupportRatios.length ? round3(mean(value.top5SupportRatios)) : null,
    };
  });

  const top5Rows = completeRankings.flatMap(ranking => ranking.rows.slice(0, 5));
  const examplePattern = /falster nord|orehoved|falster vest|nysted nor/i;
  return {
    schemaVersion: '1.0.0',
    status: 'passed-private-zone-ranking-opportunity-bias-audit',
    generatedAt: new Date().toISOString(),
    datasetId: merged.datasetId,
    productionReferenceAt: merged.productionReferenceAt || null,
    zoneCount: zoneIds.length,
    coastalPartCount: Number(coastalParts.expectedPartCount),
    rankingContextCount: completeRankings.length,
    top5SlotCount: slotCount,
    dates,
    correlations: {
      partCountVsTop5Appearances: round3(pearson(zones, 'partCount', 'top5Appearances')),
      directionCoverage55VsTop5Appearances: round3(pearson(zones, 'directionCoverage55', 'top5Appearances')),
      winnerSupportVsTop5Appearances: round3(pearson(zones, 'meanWinnerSupportRatio', 'top5Appearances')),
    },
    top5Diagnostics: {
      onlyPartSlotCount: top5Rows.filter(row => row.status === 'only-part').length,
      onlyPartSlotShare: round3(top5Rows.filter(row => row.status === 'only-part').length / top5Rows.length),
      meanWinnerSupportRatio: round3(mean(top5Rows.map(row => row.ratio).filter(Number.isFinite)) || 0),
    },
    partBuckets: aggregateBuckets(zones, slotCount),
    ownerExamples: zones.filter(row => examplePattern.test(row.zoneName)),
    zones: zones.sort((left, right) => right.top5Appearances - left.top5Appearances || right.partCount - left.partCount || left.zoneId.localeCompare(right.zoneId)),
    rankings: completeRankings.map(ranking => ({
      context: ranking.context,
      mode: ranking.mode,
      date: ranking.date,
      top5: ranking.rows.slice(0, 5).map((row, index) => ({
        rank: index + 1,
        zoneId: row.zoneId,
        zoneName: zoneNames.get(row.zoneId),
        score: row.score,
        localCoverageStatus: row.status,
        winnerSupportRatio: Number.isFinite(row.ratio) ? round3(row.ratio) : null,
      })),
    })),
    interpretationGate: 'MEASUREMENT_ONLY_NO_CORRECTION_SELECTED',
    rawWeatherValuesStored: false,
    coordinateValuesStored: false,
    scoreImpact: false,
    publicRuntime: false,
    productionGeometryChanged: false,
    landOrWaterPointsChanged: false,
    automaticActivationAllowed: false,
  };
}

function summaryText(report) {
  const buckets = report.partBuckets.map(row =>
    `${row.partBucket}: zones=${row.zones}, slotShare=${row.top5SlotShare}, overrepresentation=${row.overrepresentationRatio}`
  ).join('\n');
  const examples = report.ownerExamples.map(row =>
    `${row.zoneName}: parts=${row.partCount}, directionCoverage55=${row.directionCoverage55}, top5=${row.top5Appearances}, onlyPartTop5=${row.onlyPartTop5Appearances}`
  ).join('\n');
  return `Zone ranking opportunity-bias audit: OK\nDataset: ${report.datasetId}\n`
    + `Zones/coastal parts: ${report.zoneCount}/${report.coastalPartCount}\n`
    + `Ranking contexts/top-5 slots: ${report.rankingContextCount}/${report.top5SlotCount}\n`
    + `Part-count correlation: ${report.correlations.partCountVsTop5Appearances}\n`
    + `Direction-coverage correlation: ${report.correlations.directionCoverage55VsTop5Appearances}\n`
    + `Only-part top-5 share: ${report.top5Diagnostics.onlyPartSlotShare}\n`
    + `${buckets}\n${examples}\nScore impact: no\n`;
}

function selfTest() {
  assert.equal(round3(directionCoverage([0], 55)), 0.308);
  assert.equal(directionCoverage([0, 90, 180, 270], 55), 1);
  const rows = [
    { partCount: 1, top5Appearances: 0 },
    { partCount: 2, top5Appearances: 1 },
    { partCount: 8, top5Appearances: 4 },
  ];
  assert.ok(pearson(rows, 'partCount', 'top5Appearances') > 0.9);
  assert.equal(partBucket(2), '1-2');
  assert.equal(partBucket(3), '3-5');
  assert.equal(partBucket(6), '6+');
  assert.deepEqual(supportFor({ localCoverage: { status: 'only-part', comparisonPartCount: 8 } }), { count: 1, ratio: 0.125, status: 'only-part' });
  assert.deepEqual(supportFor({ localCoverage: { status: 'whole-zone', comparisonPartCount: 4 } }), { count: 4, ratio: 1, status: 'whole-zone' });
  console.log('Zone ranking opportunity-bias audit self-test: passed');
}

function main() {
  const args = argumentsFor(process.argv.slice(2));
  if (args.selfTest) return selfTest();
  for (const [name, value] of Object.entries(args).filter(([name]) => !['selfTest', 'output', 'summary'].includes(name))) {
    if (!value) throw new Error(`Missing --${name}`);
  }
  const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
  const report = buildAudit(read(args.conditions), read(args.details), read(args.zones), read(args.parts));
  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.mkdirSync(path.dirname(args.summary), { recursive: true });
  fs.writeFileSync(args.output, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(args.summary, summaryText(report));
  console.log(summaryText(report));
}

try {
  main();
} catch (error) {
  console.error(`Zone ranking opportunity-bias audit failed: ${error.message}`);
  process.exitCode = 1;
}
