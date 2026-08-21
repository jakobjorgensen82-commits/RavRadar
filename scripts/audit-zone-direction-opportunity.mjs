import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_EXPECTED_ZONES = 210;
const DEFAULT_EXPECTED_PARTS = 673;
const STRICT_WINDOW_DEG = 25;
const USEFUL_WINDOW_DEG = 55;

function normalizeDirection(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return ((number % 360) + 360) % 360;
}

function circularDistance(a, b) {
  const difference = Math.abs(a - b) % 360;
  return Math.min(difference, 360 - difference);
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function pearson(left, right) {
  if (left.length !== right.length || left.length < 2) return 0;
  const leftMean = mean(left);
  const rightMean = mean(right);
  let numerator = 0;
  let leftSquare = 0;
  let rightSquare = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    numerator += leftDelta * rightDelta;
    leftSquare += leftDelta ** 2;
    rightSquare += rightDelta ** 2;
  }
  const denominator = Math.sqrt(leftSquare * rightSquare);
  return denominator ? numerator / denominator : 0;
}

export function analyzeZoneDirections(rawDirections) {
  const directions = [...new Set(rawDirections.map(normalizeDirection).filter((value) => value !== null))];
  if (!directions.length) throw new Error('A zone must contain at least one valid onshore direction.');

  let strictHits = 0;
  let usefulHits = 0;
  let positiveAlignmentSum = 0;
  let bestDistanceSum = 0;

  for (let currentDirection = 0; currentDirection < 360; currentDirection += 1) {
    const bestDistance = Math.min(...directions.map((direction) => circularDistance(currentDirection, direction)));
    if (bestDistance <= STRICT_WINDOW_DEG) strictHits += 1;
    if (bestDistance <= USEFUL_WINDOW_DEG) usefulHits += 1;
    positiveAlignmentSum += Math.max(0, Math.cos((bestDistance * Math.PI) / 180));
    bestDistanceSum += bestDistance;
  }

  return {
    uniqueDirectionCount: directions.length,
    strictCaptureShare: strictHits / 360,
    usefulCaptureShare: usefulHits / 360,
    meanPositiveAlignment: positiveAlignmentSum / 360,
    meanBestDistanceDeg: bestDistanceSum / 360,
  };
}

function bucketFor(partCount) {
  if (partCount <= 2) return '1-2';
  if (partCount <= 5) return '3-5';
  return '6+';
}

function summarizeBucket(rows, bucket) {
  const selected = rows.filter((row) => row.partCountBucket === bucket);
  return {
    bucket,
    zoneCount: selected.length,
    meanPartCount: round(mean(selected.map((row) => row.partCount)), 3),
    meanUniqueDirectionCount: round(mean(selected.map((row) => row.uniqueDirectionCount)), 3),
    meanStrictCaptureShare: round(mean(selected.map((row) => row.strictCaptureShare)), 4),
    meanUsefulCaptureShare: round(mean(selected.map((row) => row.usefulCaptureShare)), 4),
    meanOpportunityIndex: round(mean(selected.map((row) => row.opportunityIndex)), 4),
  };
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

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function markdownFor(report) {
  const examples = report.examples.map((row) =>
    `| ${row.name} | ${row.partCount} | ${row.uniqueDirectionCount} | ${formatPercent(row.strictCaptureShare)} | ${formatPercent(row.usefulCaptureShare)} | ${row.opportunityIndex.toFixed(2)}x |`,
  );
  const buckets = report.buckets.map((bucket) =>
    `| ${bucket.bucket} | ${bucket.zoneCount} | ${bucket.meanPartCount.toFixed(1)} | ${formatPercent(bucket.meanStrictCaptureShare)} | ${formatPercent(bucket.meanUsefulCaptureShare)} | ${bucket.meanOpportunityIndex.toFixed(2)}x |`,
  );

  return `# Vejruafhaengigt audit af zonernes retningsmulighed

Dato: 2026-08-21

Dataset: \`${report.datasetVersion}\`

Omfang: ${report.zoneCount} zoner / ${report.partCount} kystdele

## Formaal

Auditten undersoeger, om zoner med mange forskelligt vendte kystdele faar flere muligheder for at finde en hoejt scorende del. Den roterer en taenkt stroemretning gennem alle 360 grader. Dermed er resultatet uafhaengigt af dagens konkrete vejr.

Den aendrer ikke RavScore, rangering, produktionsdata eller land-/vandpunkter.

## Resultat efter antal kystdele

| Kystdele | Zoner | Gns. dele | Staerk retning (+/-25 grader) | Brugbar retning (+/-55 grader) | Retningsmulighed mod en enkelt retning |
| --- | ---: | ---: | ---: | ---: | ---: |
${buckets.join('\n')}

Sammenhaengen mellem antal kystdele og den vejruafhaengige retningsmulighed er \`${report.correlations.partCountVsOpportunityIndex}\`. Sammenhaengen mellem antal unikke retninger og retningsmuligheden er \`${report.correlations.uniqueDirectionCountVsOpportunityIndex}\`.

## De to rejste eksempler

| Zone | Kystdele | Unikke retninger | Staerk retning | Brugbar retning | Retningsmulighed |
| --- | ---: | ---: | ---: | ---: | ---: |
${examples.join('\n')}

## Samlet vurdering

- Problemet er reelt: forskelligt vendte kystdele giver en systematisk mulighedsfordel, selv uden et bestemt vejrsystem.
- Raat antal kystdele er ikke i sig selv et godt korrektionsgrundlag. Flere dele med samme retning giver naesten ingen ekstra retningsmulighed.
- En fast straf ved mere end to kystdele vil derfor ramme for bredt. Det friske vejraudit viste desuden, at gruppen med 3-5 dele samlet var omtrent proportionalt repraesenteret, mens gruppen med mindst 6 dele var tydeligt overrepraesenteret.
- Den lokale viste RavScore boer fortsat beskrive den bedste faktiske kystdel. En eventuel korrektion boer kun paavirke nationale sammenligninger som "Bedste omraader" og "5 dages RavRadar".
- En kandidat skal vaere begraenset og kombinere effektiv retningsdaekning med stoetten fra zonens andre kystdele. En zone skal ikke straffes, hvis flere dele reelt har gode forhold.

## Naeste beslutningspunkt

Sammenlign faa, forklarlige korrektioner mod baade dette vejruafhaengige audit og flere historiske vejrsituationer. Ingen formel maa aktiveres, foer den er vurderet mod hele landet, scoreforklaringerne og de to nationale top-5-visninger.
`;
}

export function buildDirectionOpportunityReport(partsData, zonesData) {
  const zoneNames = new Map(
    (zonesData.features || []).map((feature) => [feature?.properties?.id, feature?.properties?.name]),
  );
  const baseline = analyzeZoneDirections([0]);
  const rows = Object.entries(partsData.zones || {}).map(([zoneId, parts]) => {
    if (!Array.isArray(parts) || !parts.length) throw new Error(`Zone ${zoneId} has no coastal parts.`);
    const analysis = analyzeZoneDirections(parts.map((part) => part.onshoreDirectionDeg));
    return {
      zoneId,
      name: zoneNames.get(zoneId) || zoneId,
      partCount: parts.length,
      partCountBucket: bucketFor(parts.length),
      ...Object.fromEntries(Object.entries(analysis).map(([key, value]) => [key, round(value, 6)])),
      opportunityIndex: round(analysis.meanPositiveAlignment / baseline.meanPositiveAlignment, 6),
    };
  });
  const partCount = rows.reduce((sum, row) => sum + row.partCount, 0);
  const examplePatterns = [/falster nord|orehoved/i, /falster vest|nysted nor/i];
  const examples = examplePatterns.map((pattern) => rows.find((row) => pattern.test(row.name))).filter(Boolean);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    datasetVersion: partsData.datasetVersion || 'unknown',
    sourceRunId: partsData.sourceRunId || null,
    scoreImpact: false,
    publicRuntimeImpact: false,
    zoneCount: rows.length,
    partCount,
    method: {
      sampledDirections: 360,
      strictWindowDeg: STRICT_WINDOW_DEG,
      usefulWindowDeg: USEFUL_WINDOW_DEG,
      opportunityBaseline: 'one onshore direction',
    },
    correlations: {
      partCountVsOpportunityIndex: round(pearson(rows.map((row) => row.partCount), rows.map((row) => row.opportunityIndex)), 4),
      uniqueDirectionCountVsOpportunityIndex: round(pearson(rows.map((row) => row.uniqueDirectionCount), rows.map((row) => row.opportunityIndex)), 4),
    },
    buckets: ['1-2', '3-5', '6+'].map((bucket) => summarizeBucket(rows, bucket)),
    examples,
    zones: rows.sort((left, right) => right.opportunityIndex - left.opportunityIndex || right.partCount - left.partCount || left.zoneId.localeCompare(right.zoneId)),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.parts || !args.zones) {
    throw new Error('Usage: node scripts/audit-zone-direction-opportunity.mjs --parts <coastal-parts-v2.json> --zones <zones.geojson> [--json-out <report.json>] [--markdown-out <report.md>]');
  }
  const report = buildDirectionOpportunityReport(readJson(args.parts), readJson(args.zones));
  const expectedZones = Number(args['expected-zones'] || DEFAULT_EXPECTED_ZONES);
  const expectedParts = Number(args['expected-parts'] || DEFAULT_EXPECTED_PARTS);
  if (report.zoneCount !== expectedZones || report.partCount !== expectedParts) {
    throw new Error(`Incomplete dataset: expected ${expectedZones}/${expectedParts}, got ${report.zoneCount}/${report.partCount}.`);
  }
  if (args['json-out']) {
    fs.mkdirSync(path.dirname(args['json-out']), { recursive: true });
    fs.writeFileSync(args['json-out'], `${JSON.stringify(report, null, 2)}\n`);
  }
  if (args['markdown-out']) {
    fs.mkdirSync(path.dirname(args['markdown-out']), { recursive: true });
    fs.writeFileSync(args['markdown-out'], markdownFor(report));
  }
  console.log(`Zones/coastal parts: ${report.zoneCount}/${report.partCount}`);
  console.log(`Part-count correlation: ${report.correlations.partCountVsOpportunityIndex}`);
  console.log(`Unique-direction correlation: ${report.correlations.uniqueDirectionCountVsOpportunityIndex}`);
  for (const bucket of report.buckets) {
    console.log(`${bucket.bucket} parts: ${bucket.zoneCount} zones, opportunity ${bucket.meanOpportunityIndex}x, useful coverage ${formatPercent(bucket.meanUsefulCaptureShare)}`);
  }
  for (const example of report.examples) {
    console.log(`${example.name}: ${example.partCount} parts, opportunity ${example.opportunityIndex}x, useful coverage ${formatPercent(example.usefulCaptureShare)}`);
  }
  console.log('Score impact: no');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
