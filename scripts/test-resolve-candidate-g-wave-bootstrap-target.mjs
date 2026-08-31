import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildCandidateGDerivedStateSeries,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  legacyCandidateGStateKey,
  resolveCandidateGWaveBootstrapTarget,
} from './resolve-candidate-g-wave-bootstrap-target.mjs';

const HOUR_MS = 3_600_000;
const TARGET = '2026-08-30T12:00:00.000Z';
const WAM_TARGET = '2026-08-30T12:00:00Z';
const MIGRATION_MODE = 'candidate-g-migration';
const COLD_START_MODE = 'genuine-cold-start';
const PRIVATE_SENTINEL = 'DO_NOT_EMIT_PRIVATE_MIGRATION_SENTINEL';
const CLI = path.resolve('scripts/resolve-candidate-g-wave-bootstrap-target.mjs');
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-candidate-target-'));

const zones = Object.fromEntries(
  Array.from({ length: 210 }, (_, index) => [`zone-${String(index).padStart(3, '0')}`, []]),
);
const zoneIds = Object.keys(zones);
const parts = Array.from({ length: 673 }, (_, index) => ({
  partId: `part-${String(index).padStart(3, '0')}`,
  waterPoint: [8 + (index % 17) / 1000, 55 + (index % 19) / 1000],
  onshoreDirectionDeg: index % 360,
}));
parts.forEach((part, index) => zones[zoneIds[index % zoneIds.length]].push(part));
const registry = {
  schemaVersion: 2,
  enabled: true,
  partCount: 673,
  zoneCount: 210,
  auditMarker: PRIVATE_SENTINEL,
  zones,
};

function candidateTemplate(ageHours, historyHours = 48) {
  const stateMs = Date.parse(TARGET) - ageHours * HOUR_MS;
  const built = buildCandidateGDerivedStateSeries(
    Array.from({ length: historyHours + 1 }, (_, index) => ({
      time: new Date(stateMs - (historyHours - index) * HOUR_MS).toISOString(),
      currentSpeedMps: 0.09,
      currentAlignment: 1,
      currentVerified: true,
      waveHeightM: 1.2,
      wavePeriodS: 7,
    })),
    { stateKey: `sha256:${'a'.repeat(64)}` },
  );
  assert.equal(built.continuationState.transportMemoryReady, historyHours === 48);
  return built.continuationState;
}

function registryParts(document) {
  return Object.values(document.zones).flat();
}

function conditionsAtAge(ageHours, historyHours = 48, sourceRegistry = registry) {
  const template = candidateTemplate(ageHours, historyHours);
  const sourceParts = registryParts(sourceRegistry);
  return {
    productionReferenceAt: TARGET,
    privateDiagnostic: PRIVATE_SENTINEL,
    coastalParts: {
      parts: Object.fromEntries(sourceParts.map(part => [part.partId, {
        candidateG: {
          currentState: {
            ...structuredClone(template),
            stateKey: legacyCandidateGStateKey(part),
          },
        },
      }])),
    },
  };
}

async function runCli(name, conditions, {
  sourceRegistry = registry,
  activeRegistry = registry,
} = {}) {
  const directory = path.join(root, name);
  const conditionsPath = path.join(directory, 'conditions.json');
  const sourceRegistryPath = path.join(directory, 'source-coastal-parts-v2.json');
  const registryPath = path.join(directory, 'coastal-parts-v2.json');
  const githubOutputPath = path.join(directory, 'github-output.txt');
  await fs.mkdir(directory, { recursive: true });
  await Promise.all([
    fs.writeFile(conditionsPath, JSON.stringify(conditions)),
    fs.writeFile(sourceRegistryPath, JSON.stringify(sourceRegistry)),
    fs.writeFile(registryPath, JSON.stringify(activeRegistry)),
  ]);
  const child = spawn(process.execPath, [
    CLI,
    '--conditions', conditionsPath,
    '--source-registry', sourceRegistryPath,
    '--registry', registryPath,
    '--production-target', TARGET,
  ], {
    cwd: process.cwd(),
    env: { ...process.env, GITHUB_OUTPUT: githubOutputPath },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const [code] = await once(child, 'close');
  let githubOutput = '';
  try { githubOutput = await fs.readFile(githubOutputPath, 'utf8'); }
  catch (error) { if (error?.code !== 'ENOENT') throw error; }
  return { code, stdout, stderr, githubOutput };
}

function expectedTarget(ageHours) {
  if (ageHours === 0) return WAM_TARGET;
  return new Date(Date.parse(TARGET) - (ageHours - 1) * HOUR_MS)
    .toISOString()
    .replace('.000Z', 'Z');
}

function assertPrivacySafe(result) {
  const emitted = `${result.stdout}\n${result.stderr}\n${result.githubOutput}`;
  for (const forbidden of [
    PRIVATE_SENTINEL,
    'transportEvidence',
    'stateKey',
    'waterPoint',
    JSON.stringify(parts[0].waterPoint),
  ]) assert.equal(emitted.includes(forbidden), false, `output leaked ${forbidden}`);
}

function assertAcceptedAggregate(result, expected) {
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, '');
  const aggregate = JSON.parse(result.stdout);
  assert.deepEqual(
    Object.keys(aggregate).sort(),
    ['mode', 'part_count', 'source_validated', 'target_hour'],
  );
  assert.deepEqual(aggregate, {
    mode: expected.mode,
    target_hour: expected.targetHour,
    part_count: 673,
    source_validated: true,
  });
  assert.match(aggregate.target_hour, /^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/);
  assert.equal(aggregate.target_hour.includes('.000Z'), false);
  assert.equal(result.githubOutput, [
    `mode=${expected.mode}`,
    `target_hour=${expected.targetHour}`,
    'part_count=673',
    'source_validated=true',
    '',
  ].join('\n'));
  assertPrivacySafe(result);
}

async function assertRegistryRejected(name, {
  sourceRegistry = registry,
  activeRegistry = registry,
  conditions = conditionsAtAge(0, 48, sourceRegistry),
} = {}) {
  const result = await runCli(name, conditions, { sourceRegistry, activeRegistry });
  assert.notEqual(result.code, 0);
  assert.equal(result.stdout, '');
  assert.equal(
    result.stderr.trim(),
    'RAVSCORE_CANDIDATE_MIGRATION_REGISTRY_INVALID',
  );
  assert.equal(result.githubOutput, '');
  assertPrivacySafe(result);
}

async function assertAcceptedAge(ageHours) {
  const result = await runCli(`accepted-age-${ageHours}`, conditionsAtAge(ageHours));
  assertAcceptedAggregate(result, {
    mode: MIGRATION_MODE,
    targetHour: expectedTarget(ageHours),
  });
}

try {
  await assertAcceptedAge(0);
  await assertAcceptedAge(2);
  await assertAcceptedAge(3);

  const warmup = conditionsAtAge(2, 12);
  const warmupResult = await runCli('all-warmup', warmup);
  assertAcceptedAggregate(warmupResult, {
    mode: COLD_START_MODE,
    targetHour: WAM_TARGET,
  });

  const mixedReadiness = conditionsAtAge(2);
  mixedReadiness.coastalParts.parts[parts.at(-1).partId].candidateG.currentState = {
    ...candidateTemplate(2, 12),
    stateKey: legacyCandidateGStateKey(parts.at(-1)),
  };
  const mixedReadinessResult = await runCli('mixed-ready-warmup', mixedReadiness);
  assertAcceptedAggregate(mixedReadinessResult, {
    mode: COLD_START_MODE,
    targetHour: WAM_TARGET,
  });

  const historicalSourceRegistry = structuredClone(registry);
  const historicalSourcePart = historicalSourceRegistry.zones[zoneIds[0]][0];
  historicalSourcePart.onshoreDirectionDeg = 360;
  const activeRegistry = structuredClone(registry);
  const historicalConditions = conditionsAtAge(2, 48, historicalSourceRegistry);
  const sourceBefore = structuredClone(historicalSourceRegistry);
  const activeBefore = structuredClone(activeRegistry);
  const conditionsBefore = structuredClone(historicalConditions);
  const directHistorical = resolveCandidateGWaveBootstrapTarget({
    conditions: historicalConditions,
    sourceRegistry: historicalSourceRegistry,
    registry: activeRegistry,
    productionTargetAt: TARGET,
  });
  assert.deepEqual(directHistorical, {
    mode: COLD_START_MODE,
    target_hour: WAM_TARGET,
    part_count: 673,
    source_validated: true,
  });
  assert.deepEqual(historicalSourceRegistry, sourceBefore);
  assert.deepEqual(activeRegistry, activeBefore);
  assert.deepEqual(historicalConditions, conditionsBefore);
  assert.deepEqual(historicalSourcePart.waterPoint, activeRegistry.zones[zoneIds[0]][0].waterPoint);
  const historicalContextResult = await runCli(
    'historical-360-source-context',
    historicalConditions,
    { sourceRegistry: historicalSourceRegistry, activeRegistry },
  );
  assertAcceptedAggregate(historicalContextResult, {
    mode: COLD_START_MODE,
    targetHour: WAM_TARGET,
  });

  const sourceMetadataTamper = structuredClone(registry);
  sourceMetadataTamper.zoneCount = 209;
  await assertRegistryRejected('source-zone-count-metadata-tamper', {
    sourceRegistry: sourceMetadataTamper,
  });

  const activeMetadataTamper = structuredClone(registry);
  activeMetadataTamper.zoneCount = 211;
  await assertRegistryRejected('active-zone-count-metadata-tamper', {
    activeRegistry: activeMetadataTamper,
  });

  const active209Zones = structuredClone(registry);
  const removedActiveZone = zoneIds.at(-1);
  active209Zones.zones[zoneIds[0]].push(...active209Zones.zones[removedActiveZone]);
  delete active209Zones.zones[removedActiveZone];
  await assertRegistryRejected('active-actual-209-zones', {
    activeRegistry: active209Zones,
  });

  const source211Zones = structuredClone(registry);
  source211Zones.zones['zone-extra'] = [];
  await assertRegistryRejected('source-actual-211-zones', {
    sourceRegistry: source211Zones,
  });

  const emptyActiveZones = structuredClone(registry);
  emptyActiveZones.zones = {};
  await assertRegistryRejected('active-empty-zones', {
    activeRegistry: emptyActiveZones,
  });

  const mixed = conditionsAtAge(2);
  mixed.coastalParts.parts[parts.at(-1).partId].candidateG.currentState = {
    ...candidateTemplate(3),
    stateKey: legacyCandidateGStateKey(parts.at(-1)),
  };
  const mixedResult = await runCli('mixed-targets', mixed);
  assert.notEqual(mixedResult.code, 0);
  assert.equal(mixedResult.stdout, '');
  assert.equal(mixedResult.stderr.trim(), 'RAVSCORE_CANDIDATE_MIGRATION_TARGET_MIXED');
  assert.equal(mixedResult.githubOutput, '');

  const missing = conditionsAtAge(0);
  delete missing.coastalParts.parts[parts[0].partId].candidateG.currentState;
  const missingResult = await runCli('missing-state', missing);
  assert.notEqual(missingResult.code, 0);
  assert.equal(missingResult.stdout, '');
  assert.equal(missingResult.stderr.trim(), 'RAVSCORE_CANDIDATE_MIGRATION_STATE_INVALID');
  assert.equal(missingResult.githubOutput, '');

  const wrongSchema = conditionsAtAge(0);
  wrongSchema.coastalParts.parts[parts[0].partId].candidateG.currentState.schemaVersion = '2.1.0';
  const wrongSchemaResult = await runCli('wrong-schema-state', wrongSchema);
  assert.notEqual(wrongSchemaResult.code, 0);
  assert.equal(wrongSchemaResult.stdout, '');
  assert.equal(wrongSchemaResult.stderr.trim(), 'RAVSCORE_CANDIDATE_MIGRATION_STATE_INVALID');
  assert.equal(wrongSchemaResult.githubOutput, '');

  const malformed = conditionsAtAge(2, 12);
  malformed.coastalParts.parts[parts[0].partId].candidateG.currentState.privateDiagnostic =
    PRIVATE_SENTINEL;
  const malformedResult = await runCli('malformed-state', malformed);
  assert.notEqual(malformedResult.code, 0);
  assert.equal(malformedResult.stdout, '');
  assert.equal(malformedResult.stderr.trim(), 'RAVSCORE_CANDIDATE_MIGRATION_STATE_INVALID');
  assert.equal(malformedResult.githubOutput, '');
  assertPrivacySafe(malformedResult);

  const tamperedSourceConditions = conditionsAtAge(2);
  const tamperedSourceRegistry = structuredClone(registry);
  tamperedSourceRegistry.zones[zoneIds[0]][0].onshoreDirectionDeg = 1;
  const tamperedSourceResult = await runCli(
    'tampered-source-context',
    tamperedSourceConditions,
    { sourceRegistry: tamperedSourceRegistry },
  );
  assert.notEqual(tamperedSourceResult.code, 0);
  assert.equal(tamperedSourceResult.stdout, '');
  assert.equal(
    tamperedSourceResult.stderr.trim(),
    'RAVSCORE_CANDIDATE_MIGRATION_STATE_INVALID',
  );
  assert.equal(tamperedSourceResult.githubOutput, '');
  assertPrivacySafe(tamperedSourceResult);

  const invalid = conditionsAtAge(0);
  invalid.coastalParts.parts[parts[0].partId].candidateG.currentState.stateKey =
    PRIVATE_SENTINEL;
  const invalidResult = await runCli('invalid-state', invalid);
  assert.notEqual(invalidResult.code, 0);
  assert.equal(invalidResult.stdout, '');
  assert.equal(invalidResult.stderr.trim(), 'RAVSCORE_CANDIDATE_MIGRATION_STATE_INVALID');
  assert.equal(invalidResult.githubOutput, '');
  assert.equal(`${invalidResult.stdout}${invalidResult.stderr}`.includes(PRIVATE_SENTINEL), false);
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

console.log('Candidate G aggregate wave-bootstrap-target: bestået.');
