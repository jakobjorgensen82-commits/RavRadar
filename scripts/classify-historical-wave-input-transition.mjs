#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { buildHistoricalWaveInputTransition } from './lib/historical-wave-input-transition.mjs';

function argumentsFrom(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    if (key === '--source-description') result.sourceDescriptionPath = value;
    else if (key === '--bundle') result.bundlePath = value;
    else if (key === '--contract') result.contractPath = value;
    else if (key === '--target-reference') result.targetReferenceAt = value;
    else if (key === '--output') result.outputPath = value;
    else if (key === '--github-output') result.githubOutputPath = value;
    else throw new Error(`Unknown argument: ${key}`);
  }
  for (const key of [
    'sourceDescriptionPath', 'bundlePath', 'contractPath', 'targetReferenceAt',
    'outputPath', 'githubOutputPath',
  ]) {
    if (!result[key]) throw new Error(`Historical wave classifier lacks ${key}`);
  }
  return result;
}

async function boundedJson(file, label, maximumBytes = 5 * 1024 * 1024) {
  const details = await fs.lstat(file);
  if (!details.isFile() || details.isSymbolicLink()
    || details.size < 2 || details.size > maximumBytes) {
    throw new Error(`${label} is not a bounded regular file`);
  }
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    throw new Error(`${label} cannot be parsed`);
  }
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '' && !path.isAbsolute(relative)
    && relative !== '..' && !relative.startsWith(`..${path.sep}`);
}

async function atomicWriteJson(file, value) {
  const destination = path.resolve(file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      flag: 'wx',
      mode: 0o600,
    });
    await fs.rename(temporary, destination);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

export async function classifyHistoricalWaveInputTransition(options) {
  const bundle = await fs.realpath(options.bundlePath);
  const bundleDetails = await fs.lstat(bundle);
  if (!bundleDetails.isDirectory() || bundleDetails.isSymbolicLink()) {
    throw new Error('Historical wave predecessor bundle is invalid');
  }
  const manifestPath = path.resolve(bundle, 'manifest.json');
  const conditionsPath = path.resolve(bundle, 'payload/data/live/conditions.json');
  if (!inside(bundle, manifestPath) || !inside(bundle, conditionsPath)) {
    throw new Error('Historical wave predecessor paths escape their bundle');
  }
  const [sourceDescription, manifest, contract, conditionsDetails] = await Promise.all([
    boundedJson(options.sourceDescriptionPath, 'Protected current description', 128 * 1024),
    boundedJson(manifestPath, 'Protected predecessor manifest', 256 * 1024),
    boundedJson(options.contractPath, 'Active coastal-part contract', 8 * 1024 * 1024),
    fs.lstat(conditionsPath),
  ]);
  if (!conditionsDetails.isFile() || conditionsDetails.isSymbolicLink()
    || conditionsDetails.size < 2 || conditionsDetails.size > 512 * 1024 * 1024) {
    throw new Error('Protected predecessor conditions file is invalid');
  }
  const protectedConditionsBytes = await fs.readFile(conditionsPath);
  let protectedConditions;
  try {
    protectedConditions = JSON.parse(protectedConditionsBytes.toString('utf8'));
  } catch {
    throw new Error('Protected predecessor conditions cannot be parsed');
  }
  const transition = buildHistoricalWaveInputTransition({
    sourceDescription,
    manifest,
    protectedConditions,
    protectedConditionsBytes,
    currentContract: contract,
    targetReferenceAt: options.targetReferenceAt,
    currentBinding: ravScoreModelBinding(),
  });
  if (transition) await atomicWriteJson(options.outputPath, transition);
  await fs.appendFile(options.githubOutputPath, [
    `required=${transition ? 'true' : 'false'}`,
    `mode=${transition?.replay?.mode ?? 'none'}`,
    `target_hour=${transition?.target?.productionReferenceAt ?? ''}`,
    `transition_path=${transition ? path.resolve(options.outputPath) : ''}`,
    '',
  ].join('\n'));
  return {
    required: Boolean(transition),
    affectedPartCount: transition?.scope?.affectedPartCount ?? 0,
    privatePayloadIncluded: false,
  };
}

async function main() {
  const result = await classifyHistoricalWaveInputTransition(
    argumentsFrom(process.argv.slice(2)),
  );
  console.log(JSON.stringify({
    status: result.required
      ? 'historical-wave-input-transition-required'
      : 'historical-wave-input-transition-not-applicable',
    affectedPartCount: result.affectedPartCount,
    privatePayloadIncluded: false,
  }));
}

if (process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`Historical wave input transition classification failed closed: ${error.message}`);
    process.exitCode = 1;
  });
}
