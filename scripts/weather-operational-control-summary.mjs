#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTCOMES = new Set(['success', 'failure', 'cancelled', 'skipped']);
const KINDS = new Set(['diagnostic', 'operation', 'safety']);

function parseCheck(value) {
  const [id, kind, outcome] = String(value ?? '').split('|');
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(id ?? '')
    || !KINDS.has(kind)
    || !OUTCOMES.has(outcome)) {
    throw new Error('Operational control checks must be id|kind|outcome');
  }
  return { id, kind, outcome };
}

export function buildWeatherOperationalControlSummary({
  sourceHead,
  runId,
  runAttempt,
  checks,
} = {}) {
  if (!/^[a-f0-9]{40}$/.test(String(sourceHead ?? ''))
    || !/^[1-9][0-9]*$/.test(String(runId ?? ''))
    || !/^[1-9][0-9]*$/.test(String(runAttempt ?? ''))
    || !Array.isArray(checks)
    || checks.length === 0) {
    throw new Error('Operational control summary input is incomplete');
  }
  const parsed = checks.map(parseCheck);
  if (new Set(parsed.map(check => check.id)).size !== parsed.length) {
    throw new Error('Operational control summary contains duplicate checks');
  }
  const failures = parsed.filter(check => ['failure', 'cancelled'].includes(check.outcome));
  const safetyFailures = failures.filter(check => check.kind === 'safety');
  return {
    schemaVersion: 'ravradar-weather-operational-control-summary-v1',
    status: failures.length ? 'DEGRADED' : 'PASSED',
    deploymentDisposition: safetyFailures.length
      ? 'BLOCK_UNSAFE_ARTIFACT'
      : 'CONTINUE_WITH_VALID_WEATHER',
    sourceHead,
    runId: String(runId),
    runAttempt: String(runAttempt),
    checks: parsed,
    failureCount: failures.length,
    diagnosticFailureCount: failures.filter(check => check.kind === 'diagnostic').length,
    operationFailureCount: failures.filter(check => check.kind === 'operation').length,
    safetyFailureCount: safetyFailures.length,
    failureIds: failures.map(check => check.id),
    privatePayloadIncluded: false,
  };
}

function values(arguments_, name) {
  return arguments_.flatMap((value, index) => value === name && arguments_[index + 1]
    ? [arguments_[index + 1]]
    : []);
}

function value(arguments_, name) {
  const found = values(arguments_, name);
  if (found.length !== 1) throw new Error(`Expected exactly one ${name}`);
  return found[0];
}

async function main() {
  const arguments_ = process.argv.slice(2);
  const output = value(arguments_, '--output');
  const report = buildWeatherOperationalControlSummary({
    sourceHead: value(arguments_, '--source-head'),
    runId: value(arguments_, '--run-id'),
    runAttempt: value(arguments_, '--run-attempt'),
    checks: values(arguments_, '--check'),
  });
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Operational controls: ${report.status}; ${report.failureCount} findings; ${report.deploymentDisposition}`);
  if (report.failureIds.length) {
    console.warn(`Operational control findings: ${report.failureIds.join(', ')}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
