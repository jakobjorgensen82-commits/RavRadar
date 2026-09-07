#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const EXACT_UTC_HOUR = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/;

function canonicalTime(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : null;
}

export function classifyProductionTargetFreshness({
  target,
  operationalRangeEnd,
  maximumAgeMinutes,
  now = new Date().toISOString(),
  maximumFutureMinutes = 5,
}) {
  const canonicalTarget = canonicalTime(target);
  const canonicalNow = canonicalTime(now);
  if (!EXACT_UTC_HOUR.test(target ?? '')
    || canonicalTarget?.replace('.000Z', 'Z') !== target
    || canonicalNow === null) {
    throw new Error('PRODUCTION_TARGET_TIME_INVALID');
  }
  const derivedOperationalRangeEnd = new Date(
    Date.parse(canonicalTarget) + 117 * 3_600_000,
  ).toISOString().replace('.000Z', 'Z');
  if (operationalRangeEnd !== undefined
    && (!EXACT_UTC_HOUR.test(operationalRangeEnd ?? '')
      || canonicalTime(operationalRangeEnd)?.replace('.000Z', 'Z') !== operationalRangeEnd
      || operationalRangeEnd !== derivedOperationalRangeEnd)) {
    throw new Error('PRODUCTION_TARGET_HORIZON_INVALID');
  }
  if (!Number.isInteger(maximumAgeMinutes)
    || maximumAgeMinutes < 15 || maximumAgeMinutes > 360
    || !Number.isInteger(maximumFutureMinutes)
    || maximumFutureMinutes < 0 || maximumFutureMinutes > 15) {
    throw new Error('PRODUCTION_TARGET_FRESHNESS_POLICY_INVALID');
  }
  const ageMinutes = (Date.parse(canonicalNow) - Date.parse(canonicalTarget)) / 60_000;
  if (ageMinutes < -maximumFutureMinutes) {
    throw new Error('PRODUCTION_TARGET_FROM_FUTURE');
  }
  if (Date.parse(canonicalNow) > Date.parse(derivedOperationalRangeEnd)) {
    throw new Error('PRODUCTION_TARGET_EXPIRED');
  }
  return Object.freeze({
    status: ageMinutes > maximumAgeMinutes ? 'STALE_TARGET_VALID' : 'FRESH',
    target,
    checkedAt: canonicalNow,
    ageMinutes: Number(ageMinutes.toFixed(3)),
    maximumAgeMinutes,
  });
}

function argumentsFrom(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === '--target') options.target = value;
    else if (key === '--operational-range-end') options.operationalRangeEnd = value;
    else if (key === '--maximum-age-minutes') options.maximumAgeMinutes = Number(value);
    else if (key === '--now') options.now = value;
    else if (key === '--github-output') options.githubOutput = value;
    else throw new Error(`Unknown freshness argument: ${key}`);
    index += 1;
  }
  return options;
}

function main() {
  const options = argumentsFrom(process.argv.slice(2));
  const result = classifyProductionTargetFreshness(options);
  if (options.githubOutput) {
    fs.appendFileSync(options.githubOutput, [
      `status=${result.status}`,
      `age_minutes=${result.ageMinutes}`,
      `maximum_age_minutes=${result.maximumAgeMinutes}`,
      '',
    ].join('\n'), 'utf8');
  }
  const message = `Production target freshness: ${result.ageMinutes} minutes `
    + `(preferred maximum ${result.maximumAgeMinutes}); status=${result.status}.`;
  if (result.status === 'STALE_TARGET_VALID') {
    console.warn(
      '::warning title=Stale but valid weather target::'
      + `${message} Continue with structurally valid future rows and prioritize refresh.`,
    );
  } else {
    console.log(message);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'PRODUCTION_TARGET_FRESHNESS_FAILED');
    process.exitCode = 1;
  }
}
