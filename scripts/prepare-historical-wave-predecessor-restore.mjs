#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import {
  HISTORICAL_WAVE_INPUT_TRANSITION_POLICY,
  buildHistoricalWavePredecessorRestoreExpectation,
} from './lib/historical-wave-input-transition.mjs';

function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    if (key === '--source-description') result.sourceDescriptionPath = value;
    else if (key === '--target-reference') result.targetReferenceAt = value;
    else if (key === '--output') result.outputPath = value;
    else if (key === '--github-output') result.githubOutputPath = value;
    else if (key === '--now') result.now = value;
    else throw new Error(`Unknown argument: ${key}`);
  }
  for (const key of [
    'sourceDescriptionPath', 'targetReferenceAt', 'outputPath', 'githubOutputPath',
  ]) if (!result[key]) throw new Error(`Historical predecessor restore lacks ${key}`);
  return result;
}

async function readDescription(file) {
  const details = await fs.lstat(file);
  if (!details.isFile() || details.isSymbolicLink()
    || details.size < 2 || details.size > 128 * 1024) {
    throw new Error('Protected current description is invalid');
  }
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { throw new Error('Protected current description cannot be parsed'); }
}

async function atomicWriteJson(file, value) {
  const destination = path.resolve(file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      flag: 'wx', mode: 0o600,
    });
    await fs.rename(temporary, destination);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

export async function prepareHistoricalWavePredecessorRestore(options) {
  const expectation = buildHistoricalWavePredecessorRestoreExpectation({
    sourceDescription: await readDescription(options.sourceDescriptionPath),
    targetReferenceAt: options.targetReferenceAt,
    currentBinding: ravScoreModelBinding(),
    now: options.now ?? new Date().toISOString(),
  });
  if (expectation) await atomicWriteJson(options.outputPath, expectation);
  await fs.appendFile(options.githubOutputPath, [
    `required=${expectation ? 'true' : 'false'}`,
    `source_head=${expectation
      ? HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceHead : ''}`,
    `expected_path=${expectation ? path.resolve(options.outputPath) : ''}`,
    '',
  ].join('\n'));
  return {
    required: Boolean(expectation),
    privatePayloadIncluded: false,
  };
}

async function main() {
  const result = await prepareHistoricalWavePredecessorRestore(
    parseArguments(process.argv.slice(2)),
  );
  console.log(JSON.stringify({
    status: result.required
      ? 'historical-wave-predecessor-restore-required'
      : 'historical-wave-predecessor-restore-not-applicable',
    privatePayloadIncluded: false,
  }));
}

if (process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`Historical wave predecessor restore preparation failed closed: ${error.message}`);
    process.exitCode = 1;
  });
}
