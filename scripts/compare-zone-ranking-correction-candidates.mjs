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

function quantile(values, probability) {
  const sorted = [...values].sort((left, right) => left - right);
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

export function buildBootstrapHourIndices({ hourCount, blockSizeHours, random }) {
  const indices = [];
  while (indices.length < hourCount) {
    const start = Math.floor(random() * hourCount);
    for (let offset = 0; offset < blockSizeHours && indices.length < hourCount; offset += 1) {
      indices.push((start + offset) % hourCount);
    }
  }
  return indices;
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

export function repeatedSupportPenalty(row, capPoints, evidenceScale) {
  const ratio = clamp(row.supportRatio, 0, 1);
  const supportingPartCount = Math.max(1, Math.round(ratio * Math.max(1, row.partCount)));
  const unsupportedShare = (1 - ratio) * Math.exp(-(supportingPartCount - 1) / evidenceScale);
  return capPoints * opportunityFactor(row.opportunityIndex) * unsupportedShare;
}

export function broadSupportSafeguardPenalty(row, capPoints) {
  const ratio = clamp(row.supportRatio, 0, 1);
  if (ratio >= 0.5) return 0;
  const broadSupportFactor = ratio <= 0.25 ? 1 : (0.5 - ratio) / 0.25;
  return supportAwarePenalty(row, capPoints) * broadSupportFactor;
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
  ...[2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map((capPoints) => ({
    id: `direction-support-${capPoints}`,
    label: `Retning og vinderstoette, maks. ${capPoints} point`,
    family: 'support-aware',
    penalty: (row) => supportAwarePenalty(row, capPoints),
  })),
  ...[18, 22, 26, 30].flatMap((capPoints) => [2, 4, 8].map((evidenceScale) => ({
    id: `direction-repeat-${capPoints}-s${evidenceScale}`,
    label: `Retning og gentaget støtte, maks. ${capPoints} point, skala ${evidenceScale}`,
    family: 'repeated-support-aware',
    penalty: (row) => repeatedSupportPenalty(row, capPoints, evidenceScale),
  }))),
  ...[18, 19, 20, 22, 24].map((capPoints) => ({
    id: `direction-broad-${capPoints}`,
    label: `Retning med bredt støtteværn, maks. ${capPoints} point`,
    family: 'broad-support-safeguard',
    penalty: (row) => broadSupportSafeguardPenalty(row, capPoints),
  })),
  {
    id: 'direction-support-4-near2',
    label: 'Retning og vinderstoette, maks. 4 point, kun naesten lige scorer',
    family: 'support-aware-near-tie',
    nearTieBandPoints: 2,
    penalty: (row) => supportAwarePenalty(row, 4),
  },
];

export function rankRows(rows, candidate) {
  const decorated = rows.map((row) => {
    const penalty = candidate.penalty(row);
    return { ...row, penalty, rankingScore: row.score - penalty };
  });
  if (!candidate.nearTieBandPoints) {
    return decorated.sort((left, right) => right.rankingScore - left.rankingScore || left.sourceOrder - right.sourceOrder);
  }
  const rawOrder = decorated.sort((left, right) => right.score - left.score || left.sourceOrder - right.sourceOrder);
  const ranked = [];
  for (let start = 0; start < rawOrder.length;) {
    const anchorScore = rawOrder[start].score;
    let end = start + 1;
    while (end < rawOrder.length && anchorScore - rawOrder[end].score <= candidate.nearTieBandPoints) end += 1;
    ranked.push(...rawOrder.slice(start, end).sort(
      (left, right) => right.rankingScore - left.rankingScore || right.score - left.score || left.sourceOrder - right.sourceOrder,
    ));
    start = end;
  }
  return ranked;
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
  let baselineSixPlusTop1Contexts = 0;
  let retainedSixPlusTop1Contexts = 0;
  const changedTop1Leads = [];
  const changedTop1SupportRatios = [];
  const changedTop1ByStatus = { 'only-part': 0, 'several-parts': 0, 'whole-zone': 0, unknown: 0 };
  const changedTop1ByLead = { '0-1': 0, '1-2': 0, '2-4': 0, '4+': 0 };
  for (let index = 0; index < candidateRankings.length; index += 1) {
    const baseline = baselineRankings[index].top5;
    const current = candidateRankings[index].top5;
    const baselineSet = new Set(baseline.map((row) => row.zoneId));
    changedRankSlots += current.filter((row, rank) => row.zoneId !== baseline[rank].zoneId).length;
    changedTop5Members += current.filter((row) => !baselineSet.has(row.zoneId)).length;
    if (baseline[0].partCount >= 6) {
      baselineSixPlusTop1Contexts += 1;
      if (current[0].zoneId === baseline[0].zoneId) retainedSixPlusTop1Contexts += 1;
    }
    if (current[0].zoneId !== baseline[0].zoneId) {
      changedTop1Contexts += 1;
      const lead = Math.max(0, baseline[0].score - baseline[1].score);
      changedTop1Leads.push(lead);
      changedTop1SupportRatios.push(baseline[0].supportRatio);
      const status = Object.hasOwn(changedTop1ByStatus, baseline[0].localCoverageStatus)
        ? baseline[0].localCoverageStatus
        : 'unknown';
      changedTop1ByStatus[status] += 1;
      const leadBucket = lead <= 1 ? '0-1' : lead <= 2 ? '1-2' : lead <= 4 ? '2-4' : '4+';
      changedTop1ByLead[leadBucket] += 1;
    }
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
    top1Safeguards: {
      baselineSixPlusTop1Contexts,
      retainedSixPlusTop1Contexts,
      changedSixPlusTop1Contexts: baselineSixPlusTop1Contexts - retainedSixPlusTop1Contexts,
      wholeZoneWinnerChanges: changedTop1ByStatus['whole-zone'],
      changedTop1ByStatus,
      changedTop1ByLead,
      meanChangedWinnerLead: round(mean(changedTop1Leads), 4),
      maximumChangedWinnerLead: round(changedTop1Leads.length ? Math.max(...changedTop1Leads) : 0, 4),
      maximumChangedWinnerSupportRatio: round(changedTop1SupportRatios.length ? Math.max(...changedTop1SupportRatios) : 0, 4),
      changedWinnersWithQuarterZoneSupport: changedTop1SupportRatios.filter((value) => value >= 0.25).length,
      changedWinnersWithHalfZoneSupport: changedTop1SupportRatios.filter((value) => value >= 0.5).length,
    },
    ownerExamples,
  };
}

function compactBootstrapMetrics(baselineRankings, candidateRankings, selectedContextIndices, sixPlusZoneShare) {
  let sixPlusSlots = 0;
  let changedTop1 = 0;
  let changedMembers = 0;
  for (const contextIndex of selectedContextIndices) {
    const baseline = baselineRankings[contextIndex].top5;
    const candidate = candidateRankings[contextIndex].top5;
    const baselineSet = new Set(baseline.map((row) => row.zoneId));
    sixPlusSlots += candidate.filter((row) => row.partCount >= 6).length;
    if (candidate[0].zoneId !== baseline[0].zoneId) changedTop1 += 1;
    changedMembers += candidate.filter((row) => !baselineSet.has(row.zoneId)).length;
  }
  const contextCount = selectedContextIndices.length;
  return {
    sixPlusOverrepresentation: (sixPlusSlots / (contextCount * 5)) / sixPlusZoneShare,
    changedTop1Rate: changedTop1 / contextCount,
    changedMemberRate: changedMembers / (contextCount * 5),
  };
}

function summarizeBootstrap(values) {
  return {
    p05: round(quantile(values, 0.05), 4),
    median: round(quantile(values, 0.5), 4),
    p95: round(quantile(values, 0.95), 4),
  };
}

function buildHourlyBootstrap({ hourlyTimes, rankingsByCandidate, zoneBucketCounts, iterations = 1000, blockSizeHours = 12, seed = 20260821 }) {
  const random = seededRandom(seed);
  const sixPlusZoneShare = zoneBucketCounts['6+'] / EXPECTED_ZONES;
  const samples = new Map(CANDIDATES.map((candidate) => [candidate.id, {
    sixPlusOverrepresentation: [],
    changedTop1Rate: [],
    changedMemberRate: [],
  }]));
  const baselineRankings = rankingsByCandidate.get('baseline');
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const selectedHours = buildBootstrapHourIndices({ hourCount: hourlyTimes.length, blockSizeHours, random });
    const selectedContexts = selectedHours.flatMap((hourIndex) => [hourIndex * 2, hourIndex * 2 + 1]);
    for (const candidate of CANDIDATES) {
      const metrics = compactBootstrapMetrics(
        baselineRankings,
        rankingsByCandidate.get(candidate.id),
        selectedContexts,
        sixPlusZoneShare,
      );
      for (const key of Object.keys(metrics)) samples.get(candidate.id)[key].push(metrics[key]);
    }
  }
  return {
    method: 'circular paired-mode block bootstrap',
    iterations,
    blockSizeHours,
    seed,
    candidates: CANDIDATES.map((candidate) => ({
      id: candidate.id,
      label: candidate.label,
      sixPlusOverrepresentation: summarizeBootstrap(samples.get(candidate.id).sixPlusOverrepresentation),
      changedTop1Rate: summarizeBootstrap(samples.get(candidate.id).changedTop1Rate),
      changedMemberRate: summarizeBootstrap(samples.get(candidate.id).changedMemberRate),
    })),
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
  const bootstrapRows = report.hourlyBootstrap.candidates.map((candidate) =>
    `| ${candidate.label} | ${candidate.sixPlusOverrepresentation.median.toFixed(2)}x (${candidate.sixPlusOverrepresentation.p05.toFixed(2)}-${candidate.sixPlusOverrepresentation.p95.toFixed(2)}) | ${(candidate.changedTop1Rate.median * 100).toFixed(1)}% (${(candidate.changedTop1Rate.p05 * 100).toFixed(1)}-${(candidate.changedTop1Rate.p95 * 100).toFixed(1)}%) | ${(candidate.changedMemberRate.median * 100).toFixed(1)}% (${(candidate.changedMemberRate.p05 * 100).toFixed(1)}-${(candidate.changedMemberRate.p95 * 100).toFixed(1)}%) |`,
  );
  const safeguardRows = report.hourlySensitivity.candidates
    .filter((candidate) => candidate.family.startsWith('support-aware'))
    .map((candidate) => {
      const safeguards = candidate.top1Safeguards;
      return `| ${candidate.label} | ${safeguards.retainedSixPlusTop1Contexts}/${safeguards.baselineSixPlusTop1Contexts} | ${safeguards.wholeZoneWinnerChanges} | ${safeguards.changedTop1ByStatus['only-part']} | ${safeguards.changedTop1ByStatus['several-parts']} | ${safeguards.maximumChangedWinnerLead.toFixed(2)} |`;
    });
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

### Stabilitet ved sammenhaengende vejrfaser

En deterministisk blok-bootstrap med ${report.hourlyBootstrap.iterations} gentagelser og ${report.hourlyBootstrap.blockSizeHours}-timers blokke bevarer korte sammenhaengende vejrfaser og de to tilstande som par. Intervallerne er 5.-95.-percentiler og er en foelsomhedstest, ikke uafhaengige historiske aar.

| Kandidat | 6+ overrepraesentation, median (5-95%) | Aendrede foerstepladser | Nye top-5-medlemmer |
| --- | ---: | ---: | ---: |
${bootstrapRows.join('\n')}

### Beskyttelse af reelle foerstepladser

| Kandidat | Bevarede 6+-foerstepladser | Aendrede hel-zone-vindere | Aendrede isolerede vindere | Aendrede fler-del-vindere | Stoerste oprindelige forspring der flyttes |
| --- | ---: | ---: | ---: | ---: | ---: |
${safeguardRows.join('\n')}

En hel-zone-vinder faar nul stoettebaseret justering. En isoleret vinder kan fortsat beholde foerstepladsen, naar dens oprindelige scoreforspring er stoerre end den konkrete, begraensede justering.

## Vurdering

- Den raa antal-straf er kun en negativ kontrol. Den kan ikke skelne mellem mange ens retninger og mange reelt forskellige retninger.
- Den rene retningsstraf er ogsaa en negativ kontrol. Den straffer en zone, selv naar flere kystdele faktisk understoetter det gode resultat.
- De stoettebaserede kandidater justerer kun meget, naar zonen baade har stor retningsmulighed og en isoleret vinder.
- En stor zone skal fortsat kunne blive nummer et. Naar hele zonen er god, er den stoettebaserede justering derfor nul; flere stoettende dele reducerer den gradvist.
- Naer-lighedsvarianten maa kun omrokere zoner inden for to point fra gruppens bedste raascore. Den er mindre effektiv mod skaevheden, men giver en enkel garanti mod at klart forskellige scorer bytter plads.
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
  const hourlyBootstrap = buildHourlyBootstrap({ hourlyTimes, rankingsByCandidate: hourlyRankingsByCandidate, zoneBucketCounts });
  const temporalIndices = { calibration: [], holdout: [] };
  for (let hourIndex = 0; hourIndex < hourlyTimes.length; hourIndex += 1) {
    const target = Math.floor(hourIndex / 12) % 2 === 0 ? temporalIndices.calibration : temporalIndices.holdout;
    target.push(hourIndex * 2, hourIndex * 2 + 1);
  }
  const temporalCandidates = indices => CANDIDATES.map((candidate) => candidateSummary(
    candidate,
    indices.map(index => hourlyBaselineRankings[index]),
    indices.map(index => hourlyRankingsByCandidate.get(candidate.id)[index]),
    zoneBucketCounts,
    ownerZoneIds,
  ));
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
    hourlyBootstrap,
    hourlyTemporalSplit: {
      method: 'alternating 12-hour blocks with paired modes',
      calibrationContextCount: temporalIndices.calibration.length,
      holdoutContextCount: temporalIndices.holdout.length,
      calibrationCandidates: temporalCandidates(temporalIndices.calibration),
      holdoutCandidates: temporalCandidates(temporalIndices.holdout),
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
    console.log(`hourly ${candidate.id}: 6+ overrepresentation ${candidate.sixPlusOverrepresentation}x, new top-5 members ${candidate.changedTop5Members}, top-1 changes ${candidate.changedTop1Contexts}, max penalty ${candidate.maximumPenalty}, whole-zone changes ${candidate.top1Safeguards.wholeZoneWinnerChanges}, isolated changes ${candidate.top1Safeguards.changedTop1ByStatus['only-part']}, multi-part changes ${candidate.top1Safeguards.changedTop1ByStatus['several-parts']}, quarter-zone changes ${candidate.top1Safeguards.changedWinnersWithQuarterZoneSupport}, half-zone changes ${candidate.top1Safeguards.changedWinnersWithHalfZoneSupport}, max support ${candidate.top1Safeguards.maximumChangedWinnerSupportRatio}, max changed lead ${candidate.top1Safeguards.maximumChangedWinnerLead}, retained 6+ top-1 ${candidate.top1Safeguards.retainedSixPlusTop1Contexts}/${candidate.top1Safeguards.baselineSixPlusTop1Contexts}`);
  }
  for (const candidate of report.hourlyBootstrap.candidates) {
    console.log(`bootstrap ${candidate.id}: 6+ median ${candidate.sixPlusOverrepresentation.median}x [${candidate.sixPlusOverrepresentation.p05}, ${candidate.sixPlusOverrepresentation.p95}], top-1 median ${round(candidate.changedTop1Rate.median * 100, 2)}%`);
  }
  console.log('Score impact: no');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`Zone ranking correction comparison failed: ${error.message}`);
    process.exitCode = 1;
  }
}
