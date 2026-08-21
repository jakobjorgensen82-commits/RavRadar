import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const EXPECTED_ZONES = 210;
const EXPECTED_PARTS = 673;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function supportRatio(modeResult, partCount) {
  if (modeResult?.status === 'whole-zone') return 1;
  if (modeResult?.status === 'only-part') return 1 / partCount;
  const supportingParts = Array.isArray(modeResult?.parts) ? modeResult.parts.length : 0;
  if (supportingParts > 0) return clamp(supportingParts / partCount, 1 / partCount, 1);
  return Math.min(1, 2 / partCount);
}

function selectBestForDate(hourly, date, mode) {
  let best = null;
  for (const hour of hourly || []) {
    if (!String(hour?.time || '').startsWith(date)) continue;
    const result = hour?.[mode];
    const score = Number(result?.score);
    if (!Number.isFinite(score)) continue;
    if (!best || score > best.score) best = { score, result, time: hour.time };
  }
  return best;
}

export function opportunityFactor(opportunityIndex) {
  return clamp((Number(opportunityIndex) - 1) / (Math.PI - 1), 0, 1);
}

export function supportAwarePenalty(row, capPoints) {
  return capPoints * opportunityFactor(row.opportunityIndex) * (1 - clamp(row.supportRatio, 0, 1));
}

export const CANDIDATES = [
  {
    id: 'baseline',
    label: 'Ingen korrektion',
    family: 'baseline',
    penalty: () => 0,
  },
  {
    id: 'raw-count-4',
    label: 'Raa antal-straf, maks. 4 point',
    family: 'negative-control',
    penalty: (row) => Math.min(4, Math.max(0, row.partCount - 2) * 0.25),
  },
  {
    id: 'direction-only-4',
    label: 'Retningsmulighed, maks. 4 point',
    family: 'negative-control',
    penalty: (row) => 4 * opportunityFactor(row.opportunityIndex),
  },
  ...[2, 4, 6].map((capPoints) => ({
    id: `direction-support-${capPoints}`,
    label: `Retning og vinderstoette, maks. ${capPoints} point`,
    family: 'support-aware',
    penalty: (row) => supportAwarePenalty(row, capPoints),
  })),
];

function rankRows(rows, candidate) {
  return rows
    .map((row) => {
      const penalty = candidate.penalty(row);
      return { ...row, penalty, rankingScore: row.score - penalty };
    })
    .sort((left, right) => right.rankingScore - left.rankingScore || left.sourceOrder - right.sourceOrder);
}

function bucketFor(partCount) {
  if (partCount <= 2) return '1-2';
  if (partCount <= 5) return '3-5';
  return '6+';
}

function countTop5Buckets(rankings) {
  const counts = { '1-2': 0, '3-5': 0, '6+': 0 };
  for (const ranking of rankings) {
    for (const row of ranking.top5) counts[bucketFor(row.partCount)] += 1;
  }
  return counts;
}

function buildContextRows({ context, conditions, details, directionByZone, zoneOrder }) {
  const isCurrent = String(context.context || '').toLowerCase().includes('current');
  const rows = [];
  for (let sourceOrder = 0; sourceOrder < zoneOrder.length; sourceOrder += 1) {
    const zoneId = zoneOrder[sourceOrder];
    const direction = directionByZone.get(zoneId);
    if (!direction) continue;
    let selected;
    if (isCurrent) {
      const hourly = conditions?.coastalParts?.zones?.[zoneId]?.hourly || [];
      const hour = hourly[0];
      const result = hour?.[context.mode];
      const score = Number(result?.score);
      if (Number.isFinite(score)) selected = { score, result, time: hour.time };
    } else {
      selected = selectBestForDate(details?.coastalParts?.zones?.[zoneId]?.hourly, context.date, context.mode);
    }
    if (!selected) continue;
    rows.push({
      zoneId,
      zoneName: direction.name,
      sourceOrder,
      score: selected.score,
      partCount: direction.partCount,
      opportunityIndex: direction.opportunityIndex,
      supportRatio: supportRatio(selected.result, direction.partCount),
      localCoverageStatus: selected.result?.status || 'unknown',
    });
  }
  if (!rows.length) throw new Error(`Context ${context.context}/${context.mode}/${context.date || 'current'} has no local zone scores.`);
  return rows;
}

function buildExactHourRows({ time, mode, details, directionByZone, zoneOrder }) {
  const rows = [];
  for (let sourceOrder = 0; sourceOrder < zoneOrder.length; sourceOrder += 1) {
    const zoneId = zoneOrder[sourceOrder];
    const direction = directionByZone.get(zoneId);
    if (!direction) continue;
    const hour = (details?.coastalParts?.zones?.[zoneId]?.hourly || []).find((row) => row?.time === time);
    const result = hour?.[mode];
    const score = Number(result?.score);
    if (!Number.isFinite(score)) continue;
    rows.push({
      zoneId,
      zoneName: direction.name,
      sourceOrder,
      score,
      partCount: direction.partCount,
      opportunityIndex: direction.opportunityIndex,
      supportRatio: supportRatio(result, direction.partCount),
      localCoverageStatus: result?.status || 'unknown',
    });
  }
  if (!rows.length) throw new Error(`Hourly context ${time}/${mode} has no local zone scores.`);
  return rows;
}

function validateBaseline(context, rows) {
  const actual = rankRows(rows, CANDIDATES[0]).slice(0, 5);
  const expected = context.top5 || [];
  for (let index = 0; index < 5; index += 1) {
    if (actual[index]?.zoneId !== expected[index]?.zoneId || actual[index]?.score !== Number(expected[index]?.score)) {
      throw new Error(`Baseline mismatch in ${context.context}/${context.mode}/${context.date || 'current'} at rank ${index + 1}: ${actual[index]?.zoneId}/${actual[index]?.score} vs ${expected[index]?.zoneId}/${expected[index]?.score}.`);
    }
    if (Math.abs(actual[index].supportRatio - Number(expected[index].winnerSupportRatio)) > 0.001) {
      throw new Error(`Support mismatch for ${actual[index].zoneId}: ${actual[index].supportRatio} vs ${expected[index].winnerSupportRatio}.`);
    }
  }
}

function candidateSummary(candidate, baselineRankings, candidateRankings, zoneBucketCounts, ownerZoneIds) {
  const slots = candidateRankings.flatMap((ranking) => ranking.top5);
  const penalties = candidateRankings.flatMap((ranking) => ranking.all.map((row) => row.penalty));
  const top5Penalties = slots.map((row) => row.penalty);
  const bucketCounts = countTop5Buckets(candidateRankings);
  let changedRankSlots = 0;
  let changedTop5Members = 0;
  let changedTop1Contexts = 0;
  for (let index = 0; index < candidateRankings.length; index += 1) {
    const baseline = baselineRankings[index].top5;
    const current = candidateRankings[index].top5;
    const baselineSet = new Set(baseline.map((row) => row.zoneId));
    changedRankSlots += current.filter((row, rank) => row.zoneId !== baseline[rank].zoneId).length;
    changedTop5Members += current.filter((row) => !baselineSet.has(row.zoneId)).length;
    if (current[0].zoneId !== baseline[0].zoneId) changedTop1Contexts += 1;
  }
  const ownerExamples = Object.fromEntries(ownerZoneIds.map((zoneId) => [
    zoneId,
    candidateRankings.reduce((sum, ranking) => sum + Number(ranking.top5.some((row) => row.zoneId === zoneId)), 0),
  ]));
  const sixPlusZoneShare = zoneBucketCounts['6+'] / EXPECTED_ZONES;
  return {
    id: candidate.id,
    label: candidate.label,
    family: candidate.family,
    changedRankSlots,
    changedTop5Members,
    changedTop1Contexts,
    meanPenaltyAllZones: round(mean(penalties), 4),
    meanPenaltyTop5: round(mean(top5Penalties), 4),
    maximumPenalty: round(Math.max(...penalties), 4),
    top5BucketCounts: bucketCounts,
    sixPlusTop5Share: round(bucketCounts['6+'] / slots.length, 4),
    sixPlusOverrepresentation: round((bucketCounts['6+'] / slots.length) / sixPlusZoneShare, 4),
    meanTop5SupportRatio: round(mean(slots.map((row) => row.supportRatio)), 4),
    ownerExamples,
  };
}

function markdownFor(report) {
  const exampleNames = Object.fromEntries(report.ownerExamples.map((row) => [row.zoneId, row.name]));
  const tableRows = (candidates, contextCount) => candidates.map((candidate) => {
    const examples = Object.entries(candidate.ownerExamples)
      .map(([zoneId, count]) => `${exampleNames[zoneId] || zoneId}: ${count}/${contextCount}`)
      .join('; ');
    return `| ${candidate.label} | ${candidate.top5BucketCounts['6+']}/60 | ${candidate.sixPlusOverrepresentation.toFixed(2)}x | ${candidate.changedTop5Members} | ${candidate.changedTop1Contexts} | ${candidate.meanPenaltyTop5.toFixed(2)} | ${candidate.maximumPenalty.toFixed(2)} | ${examples} |`;
  });
  const candidateRows = tableRows(report.candidates, report.contextCount);
  const hourlyRows = tableRows(report.hourlySensitivity.candidates, report.hourlySensitivity.contextCount)
    .map((row) => row.replace('/60 |', `/${report.hourlySensitivity.contextCount * 5} |`));
  return `# Sammenligning af korrektioner for national zonerangering

Dato: 2026-08-21

Dataset: \`${report.datasetId}\`

Omfang: ${report.zoneCount} zoner / ${report.coastalPartCount} kystdele / ${report.contextCount} rangeringer

## Formaal

Denne private foelsomhedsanalyse sammenligner faa mulige korrektioner af de nationale top-5-lister. Den lokale RavScore, den vindende kystdel og alle offentlige forklaringer er uaendrede.

Hver rangering indeholder ${report.minimumAvailableZones}-${report.maximumAvailableZones} zoner med en gyldig lokal kystdelsscore. Zoner uden en gyldig lokal prognosetime faar ikke en kunstig fallbackscore.

| Kandidat | 6+ dele i top-5 | Overrepraesentation | Nye top-5-medlemmer | Aendrede foerstepladser | Gns. top-5-justering | Maks. justering | Eksempler |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${candidateRows.join('\n')}

## Timed foelsomhedsanalyse

Det samme kandidatinterval er desuden koert paa ${report.hourlySensitivity.contextCount} nationale timerangeringer fra ${report.hourlySensitivity.uniqueHourCount} forskellige prognosetimer og begge tilstande. Hver time indeholder ${report.hourlySensitivity.minimumAvailableZones}-${report.hourlySensitivity.maximumAvailableZones} zoner med en gyldig lokal score.

| Kandidat | 6+ dele i top-5 | Overrepraesentation | Nye top-5-medlemmer | Aendrede foerstepladser | Gns. top-5-justering | Maks. justering | Eksempler |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${hourlyRows.join('\n')}

## Vurdering

- Den raa antal-straf er kun en negativ kontrol. Den kan ikke skelne mellem mange ens retninger og mange reelt forskellige retninger.
- Den rene retningsstraf er ogsaa en negativ kontrol. Den straffer en zone, selv naar flere kystdele faktisk understoetter det gode resultat.
- De stoettebaserede kandidater justerer kun meget, naar zonen baade har stor retningsmulighed og en isoleret vinder.
- En stor zone skal fortsat kunne blive nummer et. Naar hele zonen er god, er den stoettebaserede justering derfor nul; flere stoettende dele reducerer den gradvist.
- Ingen kandidat aktiveres paa baggrund af dette ene produktionsforloeb. Resultatet bruges til at udpege et lille interval, som efterfoelgende skal koeres paa de historiske vejrsituationer.
- En fremtidig justering er en intern rangeringstilpasning. Den maa ikke fremstilles som en lavere lokal ravchance.

## Kontrol

Alle ${report.contextCount} rekonstruerede baseline-rangeringer matchede den eksisterende top-5-rangering eksakt foer korrektion. Score impact: nej. Public runtime impact: nej. Land-/vandpunkter: uaendrede.
`;
}

export function compareCandidates({ conditions, details, baselineReport, directionReport, zones }) {
  if (baselineReport.zoneCount !== EXPECTED_ZONES || baselineReport.coastalPartCount !== EXPECTED_PARTS) {
    throw new Error('Baseline report is not the complete 210/673 dataset.');
  }
  if (directionReport.zoneCount !== EXPECTED_ZONES || directionReport.partCount !== EXPECTED_PARTS) {
    throw new Error('Direction report is not the complete 210/673 dataset.');
  }
  const zoneOrder = (zones.features || []).map((feature) => feature?.properties?.id).filter(Boolean);
  if (zoneOrder.length !== EXPECTED_ZONES) throw new Error(`Expected ${EXPECTED_ZONES} zone ids, got ${zoneOrder.length}.`);
  const directionByZone = new Map(directionReport.zones.map((zone) => [zone.zoneId, zone]));
  const contexts = baselineReport.rankings.map((context) => ({
    ...context,
    rows: buildContextRows({ context, conditions, details, directionByZone, zoneOrder }),
  }));
  for (const context of contexts) validateBaseline(context, context.rows);

  const rankingsByCandidate = new Map(CANDIDATES.map((candidate) => [
    candidate.id,
    contexts.map((context) => {
      const all = rankRows(context.rows, candidate);
      return { context: context.context, mode: context.mode, date: context.date, all, top5: all.slice(0, 5) };
    }),
  ]));
  const baselineRankings = rankingsByCandidate.get('baseline');
  const zoneBucketCounts = { '1-2': 0, '3-5': 0, '6+': 0 };
  for (const zone of directionReport.zones) zoneBucketCounts[bucketFor(zone.partCount)] += 1;
  const ownerExamples = baselineReport.ownerExamples.map((row) => ({ zoneId: row.zoneId, name: row.zoneName }));
  const ownerZoneIds = ownerExamples.map((row) => row.zoneId);
  const availableZoneCounts = contexts.map((context) => context.rows.length);
  const hourlyTimes = [...new Set(zoneOrder.flatMap((zoneId) =>
    (details?.coastalParts?.zones?.[zoneId]?.hourly || []).map((row) => row?.time).filter(Boolean),
  ))].sort();
  const hourlyContexts = hourlyTimes.flatMap((time) => ['waders', 'beach'].map((mode) => ({
    context: 'hourly-sensitivity',
    mode,
    date: String(time).slice(0, 10),
    time,
    rows: buildExactHourRows({ time, mode, details, directionByZone, zoneOrder }),
  })));
  const hourlyRankingsByCandidate = new Map(CANDIDATES.map((candidate) => [
    candidate.id,
    hourlyContexts.map((context) => {
      const all = rankRows(context.rows, candidate);
      return { context: context.context, mode: context.mode, date: context.date, time: context.time, all, top5: all.slice(0, 5) };
    }),
  ]));
  const hourlyBaselineRankings = hourlyRankingsByCandidate.get('baseline');
  const hourlyAvailableZoneCounts = hourlyContexts.map((context) => context.rows.length);
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    datasetId: baselineReport.datasetId,
    zoneCount: EXPECTED_ZONES,
    coastalPartCount: EXPECTED_PARTS,
    contextCount: contexts.length,
    minimumAvailableZones: Math.min(...availableZoneCounts),
    maximumAvailableZones: Math.max(...availableZoneCounts),
    baselineReconstruction: 'exact',
    scoreImpact: false,
    publicRuntimeImpact: false,
    landOrWaterPointsChanged: false,
    ownerExamples,
    candidates: CANDIDATES.map((candidate) => candidateSummary(
      candidate,
      baselineRankings,
      rankingsByCandidate.get(candidate.id),
      zoneBucketCounts,
      ownerZoneIds,
    )),
    hourlySensitivity: {
      uniqueHourCount: hourlyTimes.length,
      contextCount: hourlyContexts.length,
      minimumAvailableZones: Math.min(...hourlyAvailableZoneCounts),
      maximumAvailableZones: Math.max(...hourlyAvailableZoneCounts),
      candidates: CANDIDATES.map((candidate) => candidateSummary(
        candidate,
        hourlyBaselineRankings,
        hourlyRankingsByCandidate.get(candidate.id),
        zoneBucketCounts,
        ownerZoneIds,
      )),
    },
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const required = ['conditions', 'details', 'baseline-report', 'direction-report', 'zones'];
  for (const key of required) if (!args[key]) throw new Error(`Missing --${key}`);
  const report = compareCandidates({
    conditions: readJson(args.conditions),
    details: readJson(args.details),
    baselineReport: readJson(args['baseline-report']),
    directionReport: readJson(args['direction-report']),
    zones: readJson(args.zones),
  });
  if (args['json-out']) {
    fs.mkdirSync(path.dirname(args['json-out']), { recursive: true });
    fs.writeFileSync(args['json-out'], `${JSON.stringify(report, null, 2)}\n`);
  }
  if (args['markdown-out']) {
    fs.mkdirSync(path.dirname(args['markdown-out']), { recursive: true });
    fs.writeFileSync(args['markdown-out'], markdownFor(report));
  }
  console.log(`Baseline reconstruction: ${report.baselineReconstruction} (${report.contextCount} contexts)`);
  for (const candidate of report.candidates) {
    console.log(`${candidate.id}: 6+ overrepresentation ${candidate.sixPlusOverrepresentation}x, new top-5 members ${candidate.changedTop5Members}, top-1 changes ${candidate.changedTop1Contexts}, max penalty ${candidate.maximumPenalty}`);
  }
  console.log(`Hourly sensitivity: ${report.hourlySensitivity.contextCount} contexts (${report.hourlySensitivity.uniqueHourCount} hours)`);
  for (const candidate of report.hourlySensitivity.candidates) {
    console.log(`hourly ${candidate.id}: 6+ overrepresentation ${candidate.sixPlusOverrepresentation}x, new top-5 members ${candidate.changedTop5Members}, top-1 changes ${candidate.changedTop1Contexts}, max penalty ${candidate.maximumPenalty}`);
  }
  console.log('Score impact: no');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`Zone ranking correction comparison failed: ${error.message}`);
    process.exitCode = 1;
  }
}
