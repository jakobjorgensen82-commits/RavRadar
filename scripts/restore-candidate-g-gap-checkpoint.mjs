#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBoundedCurrentTransportMemory } from '../js/core/ravscore-regime-memory.js';

const DEFAULT_CONFIG = 'data/admin/candidate-g-gap-checkpoint-recovery.json';
const DEFAULT_TARGET = 'data/live/conditions.json';
const finiteTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const rowsFor = document => Object.entries(document?.coastalParts?.parts || {})
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([partId, part]) => [partId, part?.candidateG?.currentState]);
const rowsHash = rows => crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');

function parseArgs(argv) {
  const result = { check: false, root: '.', sourceRoot: null, githubOutput: null, targetReference: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--check') result.check = true;
    else if (value === '--root') result.root = argv[++index];
    else if (value === '--source-root') result.sourceRoot = argv[++index];
    else if (value === '--github-output') result.githubOutput = argv[++index];
    else if (value === '--target-reference') result.targetReference = argv[++index];
    else throw new Error(`Ukendt argument: ${value}`);
  }
  return result;
}

function requiredFor(config, target, targetReference) {
  if (config?.enabled !== true
    || target?.datasetId !== config.targetDatasetId
    || target?.productionReferenceAt !== config.targetProductionReferenceAt) return false;
  if (!finiteTime(config.sourceProductionReferenceAt) || !finiteTime(targetReference)) return false;
  const gapHours = (Date.parse(targetReference) - Date.parse(config.sourceProductionReferenceAt)) / 3_600_000;
  return gapHours >= 0 && gapHours <= Number(config.maximumResumeGapHours);
}

async function githubOutput(file, values) {
  if (!file) return;
  await fs.appendFile(file, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''));
}

export async function assessGapCheckpointRecovery({ root = '.', targetReference, githubOutput: output = null } = {}) {
  const absoluteRoot = path.resolve(root);
  const [config, target] = await Promise.all([
    readJson(path.join(absoluteRoot, DEFAULT_CONFIG)),
    readJson(path.join(absoluteRoot, DEFAULT_TARGET)),
  ]);
  const required = requiredFor(config, target, targetReference);
  const result = {
    required,
    sourceRunId: String(config.sourceRunId || ''),
    sourceArtifactName: String(config.sourceArtifactName || ''),
    sourceDatasetId: config.sourceDatasetId || null,
  };
  await githubOutput(output, {
    required: required ? 'true' : 'false',
    source_run_id: result.sourceRunId,
    source_artifact_name: result.sourceArtifactName,
  });
  return result;
}

function validateSourceState(state, partId) {
  if (!state || !finiteTime(state.time) || !finiteTime(state.transportReferenceAt)
    || !Array.isArray(state.transportEvidence) || state.transportEvidence.length < 2) {
    throw new Error(`Recovery-kilden mangler gyldig kompakt state for kystdel ${partId}`);
  }
  for (const evidence of state.transportEvidence) {
    if (!finiteTime(evidence?.time) || !Number.isFinite(evidence?.strength)) {
      throw new Error(`Recovery-kilden har ugyldig transport-evidens for kystdel ${partId}`);
    }
  }
}

function sanitizedSuffixState(sourceState, targetState, partId) {
  validateSourceState(sourceState, partId);
  if (!targetState || sourceState.stateKey !== targetState.stateKey
    || sourceState.modelId !== targetState.modelId
    || sourceState.variantId !== targetState.variantId
    || sourceState.profileId !== targetState.profileId) {
    throw new Error(`Recovery-kildens modelkontekst matcher ikke målet for kystdel ${partId}`);
  }
  const bounded = buildBoundedCurrentTransportMemory(sourceState.transportEvidence, {
    referenceTime: sourceState.transportReferenceAt,
    restartAfterVerifiedTimeGap: true,
  });
  if (bounded.recovery?.reason !== 'VERIFIED_TIME_GAP_SUFFIX_RESTART'
    || bounded.memoryReady !== false
    || bounded.status !== 'WINDOW_INCOMPLETE'
    || bounded.evidence.length < 1) {
    throw new Error(`Recovery-kilden indeholder ikke det forventede verificerede tidsgab for kystdel ${partId}`);
  }
  return {
    ...sourceState,
    transportPotential: bounded.result?.transportPotential ?? 0,
    outboundEpisodeEffectiveHours: bounded.result?.outboundEpisodeEffectiveHours ?? 0,
    transportMemoryReady: false,
    transportMemoryStatus: bounded.status,
    transportMemoryWindowHours: bounded.windowHours,
    transportMemoryCoverageHours: bounded.coverageHours,
    transportEvidence: bounded.evidence.map(item => ({ ...item })),
  };
}

export async function restoreGapCheckpoint({ root = '.', sourceRoot, targetReference } = {}) {
  if (!sourceRoot) throw new Error('--source-root er påkrævet');
  const absoluteRoot = path.resolve(root);
  const absoluteSource = path.resolve(sourceRoot);
  const config = await readJson(path.join(absoluteRoot, DEFAULT_CONFIG));
  const targetPath = path.join(absoluteRoot, DEFAULT_TARGET);
  const [target, source] = await Promise.all([
    readJson(targetPath),
    readJson(path.join(absoluteSource, 'data/live/conditions.json')),
  ]);
  if (!requiredFor(config, target, targetReference)) {
    return { restored: false, reason: 'target-or-resume-hour-not-eligible' };
  }
  if (source.datasetId !== config.sourceDatasetId
    || source.productionReferenceAt !== config.sourceProductionReferenceAt) {
    throw new Error('Recovery-kildens datasæt eller produktionstime matcher ikke den låste kontrakt');
  }
  const sourceRows = rowsFor(source);
  if (sourceRows.length !== Number(config.sourcePartCount) || rowsHash(sourceRows) !== config.sourceStateSha256) {
    throw new Error('Recovery-kildens kompakte Candidate G-state matcher ikke den låste integritet');
  }
  const targetParts = target?.coastalParts?.parts || {};
  if (Object.keys(targetParts).length !== sourceRows.length) throw new Error('Målets kystdele matcher ikke recovery-kilden');
  let discardedEvidenceCount = 0;
  for (const [partId, sourceState] of sourceRows) {
    const candidate = targetParts[partId]?.candidateG;
    if (!candidate) throw new Error(`Målet mangler Candidate G for kystdel ${partId}`);
    const restored = sanitizedSuffixState(sourceState, candidate.currentState, partId);
    discardedEvidenceCount += sourceState.transportEvidence.length - restored.transportEvidence.length;
    candidate.currentState = restored;
  }
  const temporary = `${targetPath}.candidate-g-gap-checkpoint-${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(target, null, 2)}\n`);
  await fs.rename(temporary, targetPath);
  return {
    restored: true,
    sourceDatasetId: source.datasetId,
    partCount: sourceRows.length,
    checkpointAt: config.sourceProductionReferenceAt,
    discardedEvidenceCount,
    copiedWeather: false,
    copiedScores: false,
    copiedRawVectors: false,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = options.check
    ? await assessGapCheckpointRecovery(options)
    : await restoreGapCheckpoint(options);
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

