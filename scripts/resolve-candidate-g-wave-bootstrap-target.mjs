#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CANDIDATE_G_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  validateCandidateGMigrationSource,
} from '../js/core/ravscore-integrated-state-pipeline.js';
import {
  assertCandidateGRollbackContinuationForStateKey,
} from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import { candidateGStateKey } from './lib/coastal-point-staging-contract.mjs';
import {
  LEGACY_CANDIDATE_G_MODEL_ID,
  LEGACY_CANDIDATE_G_PROFILE_ID,
  LEGACY_CANDIDATE_G_VARIANT_ID,
} from './lib/ravscore-legacy-candidate-g-source.mjs';
import {
  ravScoreCandidateMigrationWaveBootstrapTargetAt,
} from './lib/ravscore-recovery-replay.mjs';

export const CANDIDATE_G_MIGRATION_PART_COUNT = 673;
export const CANDIDATE_G_MIGRATION_ZONE_COUNT = 210;
export const CANDIDATE_G_WAVE_BOOTSTRAP_MODE = 'candidate-g-migration';
export const CANDIDATE_G_COLD_START_WAVE_BOOTSTRAP_MODE = 'genuine-cold-start';

const DEFAULT_CONDITIONS = 'data/live/conditions.json';
const DEFAULT_REGISTRY = 'data/live/coastal-parts-v2.json';
const SAFE_ERROR = /^RAVSCORE_CANDIDATE_MIGRATION_[A-Z0-9_]+$/;
const SAFE_TARGET = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/;
const SAFE_TARGET_INPUT = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/;
const CANDIDATE_G_NOT_READY_STATUSES = new Set([
  'LATEST_SAMPLE_MISSING',
  'WINDOW_HAS_MISSING_EVIDENCE',
  'WINDOW_INCOMPLETE',
  'WINDOW_HAS_TIME_GAP',
]);

function fail(code) {
  throw new Error(code);
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function finitePoint(value) {
  return Array.isArray(value)
    && value.length === 2
    && value.every(item => typeof item === 'number' && Number.isFinite(item));
}

export function legacyCandidateGStateKey(part) {
  if (typeof part?.partId !== 'string' || !part.partId
    || !finitePoint(part.waterPoint)
    || typeof part.onshoreDirectionDeg !== 'number'
    || !Number.isFinite(part.onshoreDirectionDeg)
    || part.onshoreDirectionDeg < 0
    || part.onshoreDirectionDeg > 360) {
    fail('RAVSCORE_CANDIDATE_MIGRATION_REGISTRY_INVALID');
  }
  const context = JSON.stringify({
    partId: part.partId,
    waterPoint: part.waterPoint,
    onshoreDirectionDeg: part.onshoreDirectionDeg,
    modelId: LEGACY_CANDIDATE_G_MODEL_ID,
    variantId: LEGACY_CANDIDATE_G_VARIANT_ID,
    profileId: LEGACY_CANDIDATE_G_PROFILE_ID,
  });
  return `sha256:${crypto.createHash('sha256').update(context).digest('hex')}`;
}

function normalizedWamTarget(value) {
  if (typeof value !== 'string' || !SAFE_TARGET_INPUT.test(value)) {
    fail('RAVSCORE_CANDIDATE_MIGRATION_TARGET_INVALID');
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    fail('RAVSCORE_CANDIDATE_MIGRATION_TARGET_INVALID');
  }
  const normalized = new Date(parsed).toISOString().replace('.000Z', 'Z');
  if (value.replace('.000Z', 'Z') !== normalized || !SAFE_TARGET.test(normalized)) {
    fail('RAVSCORE_CANDIDATE_MIGRATION_TARGET_INVALID');
  }
  return normalized;
}

function assertCanonicalCandidateGState(state, expectedStateKey, productionTargetAt) {
  try {
    assertCandidateGRollbackContinuationForStateKey(
      state,
      expectedStateKey,
      'Candidate G first-cutover rollback continuation',
    );
  } catch {
    fail('RAVSCORE_CANDIDATE_MIGRATION_STATE_INVALID');
  }
  const ready = state.transportMemoryReady === true;
  const canonicalMemory = ready
    ? state.transportMemoryStatus === 'READY'
      && state.transportMemoryCoverageHours === 48
    : CANDIDATE_G_NOT_READY_STATUSES.has(state.transportMemoryStatus)
      && typeof state.transportMemoryCoverageHours === 'number'
      && Number.isFinite(state.transportMemoryCoverageHours)
      && state.transportMemoryCoverageHours >= 0
      && state.transportMemoryCoverageHours < 48;
  if (!canonicalMemory
    || Date.parse(state.time) > Date.parse(productionTargetAt)) {
    fail('RAVSCORE_CANDIDATE_MIGRATION_STATE_INVALID');
  }
  return ready;
}

function immutableRegistryParts(registry, { legacySource = false } = {}) {
  if (!plainObject(registry)
    || registry.schemaVersion !== 2
    || registry.partCount !== CANDIDATE_G_MIGRATION_PART_COUNT
    || registry.zoneCount !== CANDIDATE_G_MIGRATION_ZONE_COUNT
    || !plainObject(registry.zones)
    || Object.keys(registry.zones).length !== CANDIDATE_G_MIGRATION_ZONE_COUNT) {
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
    || new Set(partIds).size !== CANDIDATE_G_MIGRATION_PART_COUNT
    || parts.some(part => !finitePoint(part?.waterPoint)
      || typeof part?.onshoreDirectionDeg !== 'number'
      || !Number.isFinite(part.onshoreDirectionDeg)
      || part.onshoreDirectionDeg < 0
      || (legacySource
        ? part.onshoreDirectionDeg > 360
        : part.onshoreDirectionDeg >= 360))) {
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
  sourceRegistry,
  registry,
  productionTargetAt,
}) {
  const productionTargetHour = normalizedWamTarget(productionTargetAt);
  const sourceParts = immutableRegistryParts(sourceRegistry, { legacySource: true });
  const activeParts = immutableRegistryParts(registry);
  const conditionParts = candidateConditionParts(conditions);
  const sourceById = new Map(sourceParts.map(part => [part.partId, part]));
  const activeById = new Map(activeParts.map(part => [part.partId, part]));
  const conditionIds = Object.keys(conditionParts);
  if (conditionIds.some(partId => !sourceById.has(partId) || !activeById.has(partId))
    || sourceParts.some(part => !activeById.has(part.partId))) {
    fail('RAVSCORE_CANDIDATE_MIGRATION_STATE_SET_INVALID');
  }

  const targets = new Set();
  let coldStartRequired = false;
  for (const sourcePart of sourceParts) {
    const activePart = activeById.get(sourcePart.partId);
    const state = conditionParts[sourcePart.partId]?.candidateG?.currentState;
    if (!plainObject(state) || state.schemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION) {
      fail('RAVSCORE_CANDIDATE_MIGRATION_STATE_INVALID');
    }
    const sourceStateKey = legacyCandidateGStateKey(sourcePart);
    let activeStateKey;
    try {
      activeStateKey = candidateGStateKey(activePart);
    } catch {
      fail('RAVSCORE_CANDIDATE_MIGRATION_REGISTRY_INVALID');
    }
    const migrationReady = assertCanonicalCandidateGState(
      state,
      sourceStateKey,
      productionTargetHour,
    );
    if (!migrationReady || sourceStateKey !== activeStateKey) {
      coldStartRequired = true;
    }
    if (!migrationReady) continue;
    let migrated;
    let target;
    try {
      migrated = validateCandidateGMigrationSource(
        state,
        sourceStateKey,
        productionTargetHour,
      );
      if (!migrated) fail('RAVSCORE_CANDIDATE_MIGRATION_STATE_INVALID');
      target = ravScoreCandidateMigrationWaveBootstrapTargetAt(
        migrated,
        productionTargetHour,
      );
    } catch {
      fail('RAVSCORE_CANDIDATE_MIGRATION_STATE_INVALID');
    }
    targets.add(normalizedWamTarget(target));
  }

  if (coldStartRequired) {
    return Object.freeze({
      mode: CANDIDATE_G_COLD_START_WAVE_BOOTSTRAP_MODE,
      target_hour: productionTargetHour,
      part_count: CANDIDATE_G_MIGRATION_PART_COUNT,
      source_validated: true,
    });
  }

  if (targets.size !== 1) {
    fail('RAVSCORE_CANDIDATE_MIGRATION_TARGET_MIXED');
  }
  const targetHour = [...targets][0];
  return Object.freeze({
    mode: CANDIDATE_G_WAVE_BOOTSTRAP_MODE,
    target_hour: targetHour,
    part_count: CANDIDATE_G_MIGRATION_PART_COUNT,
    source_validated: true,
  });
}

function parseArgs(argv, env = process.env) {
  const options = {
    conditionsPath: DEFAULT_CONDITIONS,
    sourceRegistryPath: null,
    registryPath: DEFAULT_REGISTRY,
    productionTargetAt: env.RAVRADAR_PRODUCTION_TARGET_HOUR?.trim() || null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!['--conditions', '--source-registry', '--registry', '--production-target'].includes(key)
      || typeof value !== 'string' || !value || value.startsWith('--')) {
      fail('RAVSCORE_CANDIDATE_MIGRATION_ARGUMENTS_INVALID');
    }
    if (key === '--conditions') options.conditionsPath = value;
    if (key === '--source-registry') options.sourceRegistryPath = value;
    if (key === '--registry') options.registryPath = value;
    if (key === '--production-target') options.productionTargetAt = value;
    index += 1;
  }
  if (!options.productionTargetAt || !options.sourceRegistryPath) {
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
    `source_validated=${result.source_validated}`,
  ].join('\n');
  try {
    await fs.appendFile(file, `${output}\n`, 'utf8');
  } catch {
    fail('RAVSCORE_CANDIDATE_MIGRATION_OUTPUT_INVALID');
  }
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv, env);
  const [conditions, sourceRegistry, registry] = await Promise.all([
    readJson(options.conditionsPath),
    readJson(options.sourceRegistryPath),
    readJson(options.registryPath),
  ]);
  const result = resolveCandidateGWaveBootstrapTarget({
    conditions,
    sourceRegistry,
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
