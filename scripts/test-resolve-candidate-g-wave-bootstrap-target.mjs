import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildCandidateGDerivedStateSeries,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import { candidateGStateKey } from './lib/coastal-point-staging-contract.mjs';

const HOUR_MS = 3_600_000;
const TARGET = '2026-08-30T12:00:00.000Z';
const MODE = 'candidate-g-migration';
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

function candidateTemplate(ageHours) {
  const stateMs = Date.parse(TARGET) - ageHours * HOUR_MS;
  const built = buildCandidateGDerivedStateSeries(
    Array.from({ length: 49 }, (_, index) => ({
      time: new Date(stateMs - (48 - index) * HOUR_MS).toISOString(),
      currentSpeedMps: 0.09,
      currentAlignment: 1,
      currentVerified: true,
      waveHeightM: 1.2,
      wavePeriodS: 7,
    })),
    { stateKey: `sha256:${'a'.repeat(64)}` },
  );
  assert.equal(built.continuationState.transportMemoryReady, true);
  return built.continuationState;
}

function conditionsAtAge(ageHours) {
  const template = candidateTemplate(ageHours);
  return {
    productionReferenceAt: TARGET,
    privateDiagnostic: PRIVATE_SENTINEL,
    coastalParts: {
      parts: Object.fromEntries(parts.map(part => [part.partId, {
        candidateG: {
          currentState: {
            ...structuredClone(template),
            stateKey: candidateGStateKey(part),
          },
        },
      }])),
    },
  };
}

async function runCli(name, conditions) {
  const directory = path.join(root, name);
  const conditionsPath = path.join(directory, 'conditions.json');
  const registryPath = path.join(directory, 'coastal-parts-v2.json');
  const githubOutputPath = path.join(directory, 'github-output.txt');
  await fs.mkdir(directory, { recursive: true });
  await Promise.all([
    fs.writeFile(conditionsPath, JSON.stringify(conditions)),
    fs.writeFile(registryPath, JSON.stringify(registry)),
  ]);
  const child = spawn(process.execPath, [
    CLI,
    '--conditions', conditionsPath,
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
  if (ageHours === 0) return TARGET;
  return new Date(Date.parse(TARGET) - (ageHours - 1) * HOUR_MS).toISOString();
}

async function assertAcceptedAge(ageHours) {
  const result = await runCli(`accepted-age-${ageHours}`, conditionsAtAge(ageHours));
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, '');
  const aggregate = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(aggregate).sort(), ['mode', 'part_count', 'target_hour']);
  assert.deepEqual(aggregate, {
    mode: MODE,
    target_hour: expectedTarget(ageHours),
    part_count: 673,
  });
  assert.equal(result.githubOutput, [
    `mode=${MODE}`,
    `target_hour=${expectedTarget(ageHours)}`,
    'part_count=673',
    '',
  ].join('\n'));
  const emitted = `${result.stdout}\n${result.stderr}\n${result.githubOutput}`;
  for (const forbidden of [
    PRIVATE_SENTINEL,
    'transportEvidence',
    'stateKey',
    'waterPoint',
    JSON.stringify(parts[0].waterPoint),
  ]) assert.equal(emitted.includes(forbidden), false, `output leaked ${forbidden}`);
}

try {
  await assertAcceptedAge(0);
  await assertAcceptedAge(2);
  await assertAcceptedAge(3);

  const mixed = conditionsAtAge(2);
  mixed.coastalParts.parts[parts.at(-1).partId].candidateG.currentState = {
    ...candidateTemplate(3),
    stateKey: candidateGStateKey(parts.at(-1)),
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
