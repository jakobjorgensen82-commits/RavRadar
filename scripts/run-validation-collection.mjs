import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const REPORT_SCHEMA = 'ravradar-validation-collection-v2';
const NPM_RUN = /^npm run ([\w:.-]+)$/;
const SAFE_COMMAND = /^(node|python)(?: [A-Za-z0-9_./:=+-]+)+$/;
const OUTCOMES = new Set(['not-run', 'running', 'success', 'failure', 'signal', 'spawn-error']);
const FINAL_OUTCOMES = new Set(['success', 'failure', 'signal', 'spawn-error']);
const REPORT_FIELDS = Object.freeze([
  'schemaVersion', 'kind', 'privacyClass', 'status', 'rootScript',
  'planSha256', 'commandCount', 'completedCount', 'failureCount', 'commands',
  'privatePayloadIncluded',
]);
const COMMAND_FIELDS = Object.freeze([
  'index', 'command', 'outcome', 'failureReason', 'exitCode', 'signal',
]);

function exactFields(value, fields) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
}

function planSha256(rootScript, commands) {
  return crypto.createHash('sha256')
    .update(JSON.stringify({ rootScript, commands }))
    .digest('hex');
}

/** Expand the declared npm validation tree into literal node/python commands. */
export function expandValidationCommands(scripts, name, parents = []) {
  assert.ok(!parents.includes(name), `Cyclic validation script: ${[...parents, name].join(' -> ')}`);
  assert.ok(typeof scripts?.[name] === 'string' && scripts[name].trim(), `Missing validation script: ${name}`);
  return scripts[name].split(/\s*&&\s*/).flatMap(command => {
    const nested = command.match(NPM_RUN);
    if (nested) return expandValidationCommands(scripts, nested[1], [...parents, name]);
    assert.match(command, SAFE_COMMAND, `Unsupported validation command: ${command}`);
    return [command];
  });
}

function classifyExecution(result) {
  if (result?.error) {
    return { outcome: 'spawn-error', failureReason: 'COMMAND_COULD_NOT_START', exitCode: null, signal: null };
  }
  if (result?.signal) {
    return { outcome: 'signal', failureReason: 'COMMAND_TERMINATED_BY_SIGNAL', exitCode: null, signal: String(result.signal) };
  }
  if (result?.status === 0) {
    return { outcome: 'success', failureReason: null, exitCode: 0, signal: null };
  }
  if (Number.isInteger(result?.status)) {
    return { outcome: 'failure', failureReason: 'NONZERO_EXIT', exitCode: result.status, signal: null };
  }
  return { outcome: 'spawn-error', failureReason: 'COMMAND_EXIT_STATUS_MISSING', exitCode: null, signal: null };
}

function executeCommand(command) {
  const [program, ...args] = command.split(' ');
  return spawnSync(program === 'node' ? process.execPath : program, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
  });
}

function buildReport(commands, rootScript, outcomes) {
  const completedCount = outcomes.filter(item => FINAL_OUTCOMES.has(item.outcome)).length;
  const failureCount = outcomes.filter(item => FINAL_OUTCOMES.has(item.outcome)
    && item.outcome !== 'success').length;
  return {
    schemaVersion: REPORT_SCHEMA,
    kind: 'FULL_VALIDATION_ERROR_COLLECTION',
    privacyClass: 'COMMAND_OUTCOMES_ONLY',
    status: completedCount !== commands.length
      ? 'IN_PROGRESS'
      : failureCount === 0 ? 'PASSED' : 'FAILED',
    rootScript,
    planSha256: planSha256(rootScript, commands),
    commandCount: commands.length,
    completedCount,
    failureCount,
    commands: outcomes.map(item => ({ ...item })),
    privatePayloadIncluded: false,
  };
}

export function runValidationCollection(commands, {
  rootScript = 'validate',
  execute = executeCommand,
  log = console.log,
  onProgress = () => {},
} = {}) {
  assert.ok(Array.isArray(commands) && commands.length > 0, 'Validation command plan must not be empty');
  const outcomes = commands.map((command, index) => {
    assert.match(command, SAFE_COMMAND, `Unsupported validation command: ${command}`);
    return {
      index: index + 1,
      command,
      outcome: 'not-run',
      failureReason: 'COMMAND_NOT_RUN',
      exitCode: null,
      signal: null,
    };
  });
  onProgress(buildReport(commands, rootScript, outcomes));
  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index];
    outcomes[index] = {
      ...outcomes[index],
      outcome: 'running',
      failureReason: 'COMMAND_IN_PROGRESS',
    };
    onProgress(buildReport(commands, rootScript, outcomes));
    log(`VALIDATION ${index + 1}/${commands.length}: ${command}`);
    let execution;
    try {
      execution = execute(command);
    } catch (error) {
      execution = { error };
    }
    const classified = classifyExecution(execution);
    outcomes[index] = { index: index + 1, command, ...classified };
    onProgress(buildReport(commands, rootScript, outcomes));
    if (classified.outcome !== 'success') {
      log(`VALIDATION FAILED ${index + 1}/${commands.length}: ${command}`);
    }
  }
  return buildReport(commands, rootScript, outcomes);
}

export function validateValidationCollectionReport(report, {
  expectedCommands,
  expectedRootScript,
  requireComplete = false,
} = {}) {
  if (!exactFields(report, REPORT_FIELDS)
    || report.schemaVersion !== REPORT_SCHEMA
    || report.kind !== 'FULL_VALIDATION_ERROR_COLLECTION'
    || report.privacyClass !== 'COMMAND_OUTCOMES_ONLY'
    || !/^[\w:.-]+$/.test(report.rootScript ?? '')
    || !/^[a-f0-9]{64}$/.test(report.planSha256 ?? '')
    || !Array.isArray(report.commands)
    || report.commandCount !== report.commands.length
    || report.commandCount < 1
    || !Number.isSafeInteger(report.completedCount) || report.completedCount < 0
    || !Number.isSafeInteger(report.failureCount) || report.failureCount < 0
    || report.privatePayloadIncluded !== false) {
    throw new Error('Validation collection report contract is invalid');
  }
  const commands = report.commands.map(item => item?.command);
  if (report.planSha256 !== planSha256(report.rootScript, commands)
    || (expectedRootScript !== undefined && report.rootScript !== expectedRootScript)
    || (expectedCommands !== undefined
      && JSON.stringify(commands) !== JSON.stringify(expectedCommands))) {
    throw new Error('Validation collection command plan is invalid');
  }
  for (let index = 0; index < report.commands.length; index += 1) {
    const item = report.commands[index];
    if (!exactFields(item, COMMAND_FIELDS)
      || item.index !== index + 1
      || !SAFE_COMMAND.test(item.command ?? '')
      || !OUTCOMES.has(item.outcome)) {
      throw new Error('Validation collection command contract is invalid');
    }
    const validShape = item.outcome === 'not-run'
      ? item.failureReason === 'COMMAND_NOT_RUN' && item.exitCode === null && item.signal === null
      : item.outcome === 'running'
        ? item.failureReason === 'COMMAND_IN_PROGRESS' && item.exitCode === null && item.signal === null
        : item.outcome === 'success'
          ? item.failureReason === null && item.exitCode === 0 && item.signal === null
          : item.outcome === 'failure'
            ? item.failureReason === 'NONZERO_EXIT' && Number.isInteger(item.exitCode)
              && item.exitCode !== 0 && item.signal === null
            : item.outcome === 'signal'
              ? item.failureReason === 'COMMAND_TERMINATED_BY_SIGNAL'
                && item.exitCode === null && typeof item.signal === 'string' && item.signal.length > 0
              : ['COMMAND_COULD_NOT_START', 'COMMAND_EXIT_STATUS_MISSING'].includes(item.failureReason)
                && item.exitCode === null && item.signal === null;
    if (!validShape) throw new Error('Validation collection command outcome is invalid');
  }
  const completed = report.commands.filter(item => FINAL_OUTCOMES.has(item.outcome)).length;
  const failures = report.commands.filter(item => FINAL_OUTCOMES.has(item.outcome)
    && item.outcome !== 'success').length;
  const expectedStatus = completed !== report.commandCount
    ? 'IN_PROGRESS'
    : failures === 0 ? 'PASSED' : 'FAILED';
  if (report.completedCount !== completed
    || report.failureCount !== failures
    || report.status !== expectedStatus
    || (requireComplete && expectedStatus === 'IN_PROGRESS')) {
    throw new Error('Validation collection report classification is invalid');
  }
  return report;
}

export function writeReportAtomically(output, report) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const temporary = `${output}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(report, null, 2)}\n`);
  fs.renameSync(temporary, output);
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!['--script', '--output'].includes(flag) || value === undefined || values[flag]) {
      throw new Error('Usage: run-validation-collection.mjs --script NAME --output PATH');
    }
    values[flag] = value;
  }
  if (!values['--script'] || !values['--output'] || argv.length !== 4) {
    throw new Error('Usage: run-validation-collection.mjs --script NAME --output PATH');
  }
  return { script: values['--script'], output: values['--output'] };
}

function main(argv) {
  const { script, output } = parseArgs(argv);
  const scripts = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;
  const commands = expandValidationCommands(scripts, script);
  const onProgress = report => {
    validateValidationCollectionReport(report, {
      expectedCommands: commands,
      expectedRootScript: script,
    });
    writeReportAtomically(output, report);
  };
  const report = runValidationCollection(commands, { rootScript: script, onProgress });
  validateValidationCollectionReport(report, {
    expectedCommands: commands,
    expectedRootScript: script,
    requireComplete: true,
  });
  console.log(`Validation completed: ${report.commandCount} commands, ${report.failureCount} failure(s).`);
  if (report.status !== 'PASSED') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
