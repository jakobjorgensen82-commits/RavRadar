import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const REPORT_SCHEMA = 'ravradar-cutover-validation-report-v1';
const STEP_ID = /^[a-z][a-z0-9-]{0,63}$/;
const SHA = /^[a-f0-9]{40}$/;
const RUN_ID = /^[1-9][0-9]{0,19}$/;
const OUTCOMES = new Set(['success', 'failure', 'cancelled', 'skipped', 'not-run']);
const REPORT_FIELDS = Object.freeze([
  'schemaVersion', 'kind', 'privacyClass', 'status', 'sourceHead', 'runId',
  'runAttempt', 'action', 'stepCount', 'failureCount', 'steps',
  'privatePayloadIncluded',
]);
const STEP_FIELDS = Object.freeze(['id', 'required', 'outcome', 'failureReason']);

function exactFields(value, fields) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
}

function failureReason(required, outcome) {
  if (outcome === 'success') return null;
  if (outcome === 'skipped' || outcome === 'not-run') {
    return required ? 'REQUIRED_STEP_NOT_RUN' : null;
  }
  return outcome === 'cancelled' ? 'STEP_CANCELLED' : 'STEP_FAILED';
}

export function buildCutoverValidationReport({
  sourceHead,
  runId,
  runAttempt,
  action,
  steps,
} = {}) {
  if (!SHA.test(sourceHead ?? '')
    || !RUN_ID.test(String(runId ?? ''))
    || !Number.isInteger(Number(runAttempt)) || Number(runAttempt) < 1
    || action !== 'integrated-cutover'
    || !Array.isArray(steps) || steps.length < 1 || steps.length > 32) {
    throw new Error('Cutover validation report identity is invalid');
  }
  const seen = new Set();
  const canonicalSteps = steps.map(step => {
    const id = step?.id;
    const required = step?.required;
    const outcome = step?.outcome || 'not-run';
    if (!STEP_ID.test(id ?? '') || seen.has(id)
      || typeof required !== 'boolean' || !OUTCOMES.has(outcome)) {
      throw new Error('Cutover validation step is invalid');
    }
    seen.add(id);
    return {
      id,
      required,
      outcome,
      failureReason: failureReason(required, outcome),
    };
  });
  const failureCount = canonicalSteps.filter(step => step.failureReason !== null).length;
  return {
    schemaVersion: REPORT_SCHEMA,
    kind: 'INTEGRATED_CUTOVER_PREWRITE_VALIDATION',
    privacyClass: 'STEP_OUTCOMES_ONLY',
    status: failureCount === 0 ? 'PASSED' : 'FAILED',
    sourceHead,
    runId: String(runId),
    runAttempt: Number(runAttempt),
    action,
    stepCount: canonicalSteps.length,
    failureCount,
    steps: canonicalSteps,
    privatePayloadIncluded: false,
  };
}

export function validateCutoverValidationReport(report) {
  if (!exactFields(report, REPORT_FIELDS)
    || report.schemaVersion !== REPORT_SCHEMA
    || report.kind !== 'INTEGRATED_CUTOVER_PREWRITE_VALIDATION'
    || report.privacyClass !== 'STEP_OUTCOMES_ONLY'
    || !SHA.test(report.sourceHead ?? '')
    || !RUN_ID.test(report.runId ?? '')
    || !Number.isInteger(report.runAttempt) || report.runAttempt < 1
    || report.action !== 'integrated-cutover'
    || !Array.isArray(report.steps)
    || report.stepCount !== report.steps.length
    || report.stepCount < 1 || report.stepCount > 32
    || report.privatePayloadIncluded !== false) {
    throw new Error('Cutover validation report contract is invalid');
  }
  const seen = new Set();
  for (const step of report.steps) {
    if (!exactFields(step, STEP_FIELDS)
      || !STEP_ID.test(step.id ?? '') || seen.has(step.id)
      || typeof step.required !== 'boolean' || !OUTCOMES.has(step.outcome)
      || step.failureReason !== failureReason(step.required, step.outcome)) {
      throw new Error('Cutover validation report step contract is invalid');
    }
    seen.add(step.id);
  }
  const failures = report.steps.filter(step => step.failureReason !== null).length;
  if (report.failureCount !== failures
    || report.status !== (failures === 0 ? 'PASSED' : 'FAILED')) {
    throw new Error('Cutover validation report classification is invalid');
  }
  return report;
}

function parseBuildArgs(argv) {
  const values = { steps: [] };
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined) {
      throw new Error('Cutover validation build arguments are invalid');
    }
    const key = flag.slice(2);
    if (key === 'step') values.steps.push(value);
    else if (['output', 'source-head', 'run-id', 'run-attempt', 'action'].includes(key)) {
      if (values[key] !== undefined) throw new Error('Duplicate cutover validation argument');
      values[key] = value;
    } else throw new Error('Unknown cutover validation argument');
  }
  const steps = values.steps.map(value => {
    const [id, required, outcome, ...extra] = value.split('|');
    if (extra.length || !['true', 'false'].includes(required)) {
      throw new Error('Cutover validation step argument is invalid');
    }
    return { id, required: required === 'true', outcome: outcome || 'not-run' };
  });
  return {
    output: values.output,
    report: buildCutoverValidationReport({
      sourceHead: values['source-head'],
      runId: values['run-id'],
      runAttempt: Number(values['run-attempt']),
      action: values.action,
      steps,
    }),
  };
}

async function main(argv) {
  const [command, ...rest] = argv;
  if (command === 'build') {
    const { output, report } = parseBuildArgs(rest);
    if (!output) throw new Error('Cutover validation report output is required');
    await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  if (command === 'check') {
    if (rest.length !== 2 || rest[0] !== '--input') {
      throw new Error('Usage: cutover-validation-report.mjs check --input PATH');
    }
    const report = validateCutoverValidationReport(
      JSON.parse(await fs.readFile(rest[1], 'utf8')),
    );
    if (report.status !== 'PASSED') {
      throw new Error(`Cutover validation barrier failed with ${report.failureCount} collected error(s)`);
    }
    return;
  }
  throw new Error('Usage: cutover-validation-report.mjs build|check');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
