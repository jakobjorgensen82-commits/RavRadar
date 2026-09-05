#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const EXACT_UTC_HOUR = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/;

function canonicalTime(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : null;
}

export function assertFreshProductionTarget({
  target,
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
  if (ageMinutes > maximumAgeMinutes) {
    throw new Error('PRODUCTION_TARGET_STALE');
  }
  return Object.freeze({
    status: 'FRESH',
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
  const result = assertFreshProductionTarget(options);
  if (options.githubOutput) {
    fs.appendFileSync(options.githubOutput, [
      `status=${result.status}`,
      `age_minutes=${result.ageMinutes}`,
      `maximum_age_minutes=${result.maximumAgeMinutes}`,
      '',
    ].join('\n'), 'utf8');
  }
  console.log(
    `Production target freshness: ${result.ageMinutes} minutes `
    + `(maximum ${result.maximumAgeMinutes}).`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'PRODUCTION_TARGET_FRESHNESS_FAILED');
    process.exitCode = 1;
  }
}
