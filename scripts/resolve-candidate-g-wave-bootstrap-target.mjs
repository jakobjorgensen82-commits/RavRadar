#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CANDIDATE_G_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  validateCandidateGMigrationSource,
} from '../js/core/ravscore-integrated-state-pipeline.js';
import { candidateGStateKey } from './lib/coastal-point-staging-contract.mjs';
import {
  ravScoreCandidateMigrationWaveBootstrapTargetAt,
} from './lib/ravscore-recovery-replay.mjs';

export const CANDIDATE_G_MIGRATION_PART_COUNT = 673;
export const CANDIDATE_G_WAVE_BOOTSTRAP_MODE = 'candidate-g-migration';

const DEFAULT_CONDITIONS = 'data/live/conditions.json';
const DEFAULT_REGISTRY = 'data/live/coastal-parts-v2.json';
const SAFE_ERROR = /^RAVSCORE_CANDIDATE_MIGRATION_[A-Z0-9_]+$/;
const SAFE_TARGET = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/;

function fail(code) {
  throw new Error(code);
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function immutableRegistryParts(registry) {
  if (!plainObject(registry)
    || registry.schemaVersion !== 2
    || registry.partCount !== CANDIDATE_G_MIGRATION_PART_COUNT
    || !plainObject(registry.zones)) {
    fail('RAVSCORE_CANDIDATE_MIGRATION_REGISTRY_INVALID');
  }
  const parts = [];
  for (const zoneParts of Object.values(registry.zones)) {
    if (!Array.isArray(zoneParts)) {
      fail('RAVSCORE_CANDIDATE_MIGRATION_REGISTRY_INVALID');
    }
    parts.push(...zoneParts);
  }
  const partIds = parts.map(part => part?.partId);
  if (parts.length !== CANDIDATE_G_MIGRATION_PART_COUNT
    || partIds.some(partId => typeof partId !== 'string' || !partId)
    || new Set(partIds).size !== CANDIDATE_G_MIGRATION_PART_COUNT) {
    fail('RAVSCORE_CANDIDATE_MIGRATION_REGISTRY_INVALID');
  }
  return parts;
}

function candidateConditionParts(conditions) {
  const parts = conditions?.coastalParts?.parts;
  if (!plainObject(parts)
    || Object.keys(parts).length !== CANDIDATE_G_MIGRATION_PART_COUNT) {
    fail('RAVSCORE_CANDIDATE_MIGRATION_STATE_SET_INVALID');
  }
  return parts;
}

/**
 * Validates the complete legacy Candidate G continuation set and returns only
 * the aggregate WAM acquisition target. No state, evidence, part identity or
 * coordinate is returned or emitted.
 */
export function resolveCandidateGWaveBootstrapTarget({
  conditions,
  registry,
  productionTargetAt,
}) {
  const parts = immutableRegistryParts(registry);
  const conditionParts = candidateConditionParts(conditions);
  const registryIds = new Set(parts.map(part => part.partId));
  if (Object.keys(conditionParts).some(partId => !registryIds.has(partId))) {
    fail('RAVSCORE_CANDIDATE_MIGRATION_STATE_SET_INVALID');
  }

  const targets = new Set();
  for (const part of parts) {
    const state = conditionParts[part.partId]?.candidateG?.currentState;
    if (!plainObject(state) || state.schemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION) {
      fail('RAVSCORE_CANDIDATE_MIGRATION_STATE_INVALID');
    }
    let migrated;
    let target;
    try {
      migrated = validateCandidateGMigrationSource(
        state,
        candidateGStateKey(part),
        productionTargetAt,
      );
      if (!migrated) fail('RAVSCORE_CANDIDATE_MIGRATION_STATE_INVALID');
      target = ravScoreCandidateMigrationWaveBootstrapTargetAt(
        migrated,
        productionTargetAt,
      );
    } catch {
      fail('RAVSCORE_CANDIDATE_MIGRATION_STATE_INVALID');
    }
    targets.add(target);
  }

  if (targets.size !== 1) {
    fail('RAVSCORE_CANDIDATE_MIGRATION_TARGET_MIXED');
  }
  const targetHour = [...targets][0];
  if (!SAFE_TARGET.test(targetHour)) {
    fail('RAVSCORE_CANDIDATE_MIGRATION_TARGET_INVALID');
  }
  return Object.freeze({
    mode: CANDIDATE_G_WAVE_BOOTSTRAP_MODE,
    target_hour: targetHour,
    part_count: CANDIDATE_G_MIGRATION_PART_COUNT,
  });
}

function parseArgs(argv, env = process.env) {
  const options = {
    conditionsPath: DEFAULT_CONDITIONS,
    registryPath: DEFAULT_REGISTRY,
    productionTargetAt: env.RAVRADAR_PRODUCTION_TARGET_HOUR?.trim() || null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!['--conditions', '--registry', '--production-target'].includes(key)
      || typeof value !== 'string' || !value || value.startsWith('--')) {
      fail('RAVSCORE_CANDIDATE_MIGRATION_ARGUMENTS_INVALID');
    }
    if (key === '--conditions') options.conditionsPath = value;
    if (key === '--registry') options.registryPath = value;
    if (key === '--production-target') options.productionTargetAt = value;
    index += 1;
  }
  if (!options.productionTargetAt) {
    fail('RAVSCORE_CANDIDATE_MIGRATION_ARGUMENTS_INVALID');
  }
  return options;
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    fail('RAVSCORE_CANDIDATE_MIGRATION_INPUT_INVALID');
  }
}

async function writeGithubOutput(file, result) {
  if (!file) return;
  const output = [
    `mode=${result.mode}`,
    `target_hour=${result.target_hour}`,
    `part_count=${result.part_count}`,
  ].join('\n');
  try {
    await fs.appendFile(file, `${output}\n`, 'utf8');
  } catch {
    fail('RAVSCORE_CANDIDATE_MIGRATION_OUTPUT_INVALID');
  }
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv, env);
  const [conditions, registry] = await Promise.all([
    readJson(options.conditionsPath),
    readJson(options.registryPath),
  ]);
  const result = resolveCandidateGWaveBootstrapTarget({
    conditions,
    registry,
    productionTargetAt: options.productionTargetAt,
  });
  await writeGithubOutput(env.GITHUB_OUTPUT?.trim(), result);
  console.log(JSON.stringify(result));
  return result;
}

function sanitizedError(error) {
  const message = String(error?.message || '');
  return SAFE_ERROR.test(message)
    ? message
    : 'RAVSCORE_CANDIDATE_MIGRATION_SANITIZED_FAILURE';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(sanitizedError(error));
    process.exitCode = 1;
  });
}
