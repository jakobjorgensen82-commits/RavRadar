import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_INPUT_BYTES = 512 * 1024 * 1024;
const MAX_ZONE_COUNT = 210;
const MAX_PART_COUNT = 673;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{0,127}$/;
const MODES = Object.freeze(['waders', 'beach']);

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function exactSafeId(value, label) {
  if (typeof value !== 'string' || !SAFE_ID.test(value)) {
    throw new Error(`${label} is not a safe public identifier`);
  }
  return value;
}

function exactSafeCode(value) {
  return typeof value === 'string' && SAFE_CODE.test(value)
    ? value
    : 'INTEGRATED_RAVSCORE_REASON_UNAVAILABLE';
}

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function canonicalTime(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : null;
}

function latestRowAtOrBefore(rows, referenceAt) {
  const referenceMs = Date.parse(referenceAt ?? '');
  if (!Array.isArray(rows) || !Number.isFinite(referenceMs)) return null;
  return rows.reduce((selected, row) => {
    const rowMs = Date.parse(row?.time ?? '');
    if (!Number.isFinite(rowMs) || rowMs > referenceMs) return selected;
    if (!selected || rowMs > Date.parse(selected.time)) return row;
    return selected;
  }, null);
}

function sortedCountRows(counts, key) {
  return [...counts.entries()]
    .map(([value, count]) => ({ [key]: value, count }))
    .sort((left, right) => left[key].localeCompare(right[key]));
}

export function buildSafeIntegratedBuildFailureReport(full) {
  const weatherZones = safeObject(full?.zones);
  const coastalParts = safeObject(full?.coastalParts);
  const scoreZones = safeObject(coastalParts.zones);
  const parts = safeObject(coastalParts.parts);
  const weatherZoneIds = Object.keys(weatherZones).map(value =>
    exactSafeId(value, 'Weather zone id'));
  const scoreZoneIds = Object.keys(scoreZones).map(value =>
    exactSafeId(value, 'Score zone id'));
  const partIds = Object.keys(parts).map(value =>
    exactSafeId(value, 'Coastal-part id'));
  const partIdSet = new Set(partIds);
  if (weatherZoneIds.length > MAX_ZONE_COUNT
    || scoreZoneIds.length > MAX_ZONE_COUNT
    || partIds.length > MAX_PART_COUNT) {
    throw new Error('Integrated build failure report exceeds its public identifier bounds');
  }

  const availability = safeObject(coastalParts.scoreAvailability);
  const productionReferenceAt = canonicalTime(full?.productionReferenceAt);
  const evaluatedAt = canonicalTime(availability.evaluatedAt)
    ?? productionReferenceAt;
  const declaredUnavailable = Array.isArray(availability.unavailableZones)
    ? availability.unavailableZones : [];
  if (declaredUnavailable.length > MAX_ZONE_COUNT) {
    throw new Error('Integrated build failure report has too many unavailable zones');
  }
  const declaredUnavailableIds = declaredUnavailable.map(entry =>
    exactSafeId(entry?.zoneId, 'Unavailable zone id'));
  if (new Set(declaredUnavailableIds).size !== declaredUnavailableIds.length) {
    throw new Error('Integrated build failure report has duplicate unavailable zones');
  }

  const codeCounts = new Map();
  let unavailableZoneModeCount = 0;
  let unavailablePartOccurrenceCount = 0;
  const zones = declaredUnavailable.map(entry => {
    const zoneId = exactSafeId(entry?.zoneId, 'Unavailable zone id');
    if (!Object.hasOwn(scoreZones, zoneId)) {
      throw new Error('Unavailable zone is absent from the score package');
    }
    const modes = Array.isArray(entry?.modes)
      ? [...new Set(entry.modes.filter(mode => MODES.includes(mode)))].sort()
      : [];
    unavailableZoneModeCount += modes.length;
    const current = latestRowAtOrBefore(scoreZones[zoneId]?.hourly, evaluatedAt);
    const partCodes = new Map();
    for (const mode of modes) {
      const result = safeObject(current?.[mode]);
      const rows = Array.isArray(result.unavailableParts)
        ? result.unavailableParts : [];
      if (rows.length > MAX_PART_COUNT) {
        throw new Error('Integrated build failure report has too many part failures');
      }
      for (const row of rows) {
        const partId = exactSafeId(row?.partId, 'Unavailable coastal-part id');
        if (!partIdSet.has(partId)) {
          throw new Error('Unavailable coastal-part is absent from the score package');
        }
        const code = exactSafeCode(row?.code);
        unavailablePartOccurrenceCount += 1;
        codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
        const codes = partCodes.get(partId) ?? new Set();
        codes.add(code);
        partCodes.set(partId, codes);
      }
      if (rows.length === 0) {
        const code = exactSafeCode(result?.unavailability?.code);
        codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
      }
    }
    return {
      zoneId,
      modes,
      partFailureCount: partCodes.size,
      partFailures: [...partCodes.entries()]
        .map(([partId, codes]) => ({ partId, codes: [...codes].sort() }))
        .sort((left, right) => left.partId.localeCompare(right.partId)),
    };
  }).sort((left, right) => left.zoneId.localeCompare(right.zoneId));

  const weatherZoneSet = new Set(weatherZoneIds);
  const scoreZoneSet = new Set(scoreZoneIds);
  const missingWeatherZoneIds = scoreZoneIds.filter(zoneId => !weatherZoneSet.has(zoneId)).sort();
  const missingScoreZoneIds = weatherZoneIds.filter(zoneId => !scoreZoneSet.has(zoneId)).sort();
  const declaredExpectedPartCount = safeCount(coastalParts.expectedPartCount);
  const declaredScoredPartCount = safeCount(coastalParts.scoredPartCount);
  return {
    schemaVersion: 1,
    kind: 'RAVSCORE_INTEGRATED_BUILD_FAILURE_SAFE',
    privacyClass: 'PUBLIC_IDENTIFIERS_AND_AGGREGATE_COUNTS_ONLY',
    status: 'incomplete',
    productionReferenceAt,
    evaluatedAt,
    coverage: {
      weatherZoneCount: weatherZoneIds.length,
      scoreZoneCount: scoreZoneIds.length,
      partCount: partIds.length,
      expectedPartCount: declaredExpectedPartCount,
      scoredPartCount: declaredScoredPartCount,
      allZonesActive: availability.allZonesActive === true,
      unavailableZoneCount: zones.length,
      missingWeatherZoneCount: missingWeatherZoneIds.length,
      missingScoreZoneCount: missingScoreZoneIds.length,
      missingWeatherZoneIds,
      missingScoreZoneIds,
    },
    failures: {
      unavailableZoneModeCount,
      unavailablePartOccurrenceCount,
      codeCounts: sortedCountRows(codeCounts, 'code'),
      zones,
    },
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!['--input', '--output'].includes(flag) || !value) {
      throw new Error('Usage: report-ravscore-integrated-build-failure-safe.mjs --input PATH --output PATH');
    }
    args[flag.slice(2)] = value;
  }
  if (!args.input || !args.output) {
    throw new Error('Both --input and --output are required');
  }
  return args;
}

async function main(argv) {
  const args = parseArgs(argv);
  const stat = await fs.stat(args.input);
  if (stat.size < 2 || stat.size > MAX_INPUT_BYTES) {
    throw new Error('Integrated build input is outside the bounded diagnostic size');
  }
  const full = JSON.parse(await fs.readFile(args.input, 'utf8'));
  const report = buildSafeIntegratedBuildFailureReport(full);
  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
