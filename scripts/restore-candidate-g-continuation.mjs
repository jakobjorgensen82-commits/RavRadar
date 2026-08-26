import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import { buildBoundedCurrentTransportMemory } from '../js/core/ravscore-regime-memory.js';

const DEFAULT_CONFIG = 'data/admin/candidate-g-continuation-recovery.json';
const DEFAULT_TARGET = 'data/live/conditions.json';
const STATE_KEYS = Object.freeze([
  'schemaVersion',
  'modelId',
  'variantId',
  'profileId',
  'stateKey',
  'time',
  'transportReferenceAt',
  'transportPotential',
  'outboundEpisodeEffectiveHours',
  'transportMemoryReady',
  'transportMemoryStatus',
  'transportMemoryWindowHours',
  'transportMemoryCoverageHours',
  'transportEvidence',
  'mobilisationPotential',
]);
const LEGACY_STATE_KEYS = Object.freeze(STATE_KEYS.filter(key => key !== 'transportReferenceAt'));

const finite = value => typeof value === 'number' && Number.isFinite(value);
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function parseArgs(argv) {
  const result = { check: false, root: '.', sourceRoot: null, githubOutput: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--check') result.check = true;
    else if (value === '--root') result.root = argv[++index];
    else if (value === '--source-root') result.sourceRoot = argv[++index];
    else if (value === '--github-output') result.githubOutput = argv[++index];
    else throw new Error(`Ukendt argument: ${value}`);
  }
  return result;
}

function validateState(state, partId) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error(`Candidate G continuation mangler for kystdel ${partId}`);
  }
  const keys = Object.keys(state).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...STATE_KEYS].sort())
    && JSON.stringify(keys) !== JSON.stringify([...LEGACY_STATE_KEYS].sort())) {
    throw new Error(`Candidate G continuation har en uventet datakontrakt for kystdel ${partId}`);
  }
  if (state.schemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION
    || state.modelId !== CANDIDATE_G_STATE_MODEL_ID
    || state.variantId !== CANDIDATE_G_STATE_VARIANT_ID
    || state.profileId !== CANDIDATE_G_STATE_PROFILE_ID) {
    throw new Error(`Candidate G continuation har forkert modelidentitet for kystdel ${partId}`);
  }
  const transportReferenceAt = state.transportReferenceAt ?? state.time;
  if (typeof state.stateKey !== 'string' || !state.stateKey
    || !validTime(state.time)
    || !validTime(transportReferenceAt)
    || Date.parse(transportReferenceAt) > Date.parse(state.time)
    || (Date.parse(state.time) - Date.parse(transportReferenceAt)) / 3_600_000 > 3
    || !finite(state.transportPotential) || state.transportPotential < 0 || state.transportPotential > 100
    || !finite(state.outboundEpisodeEffectiveHours) || state.outboundEpisodeEffectiveHours < 0
    || typeof state.transportMemoryReady !== 'boolean'
    || typeof state.transportMemoryStatus !== 'string'
    || state.transportMemoryWindowHours !== 48
    || !finite(state.transportMemoryCoverageHours) || state.transportMemoryCoverageHours < 0 || state.transportMemoryCoverageHours > 48
    || !finite(state.mobilisationPotential) || state.mobilisationPotential < 0 || state.mobilisationPotential > 100
    || !Array.isArray(state.transportEvidence) || state.transportEvidence.length < 1 || state.transportEvidence.length > 49) {
    throw new Error(`Candidate G continuation er ugyldig for kystdel ${partId}`);
  }
  let previous = null;
  for (const evidence of state.transportEvidence) {
    if (!evidence || Object.keys(evidence).sort().join(',') !== 'strength,time'
      || !validTime(evidence.time)
      || (evidence.strength !== null && (!finite(evidence.strength) || evidence.strength < -1 || evidence.strength > 1))) {
      throw new Error(`Candidate G transporthukommelse er ugyldig for kystdel ${partId}`);
    }
    const current = Date.parse(evidence.time);
    if (previous !== null && current <= previous) {
      throw new Error(`Candidate G transporthukommelse er ikke kronologisk for kystdel ${partId}`);
    }
    previous = current;
  }
  if (previous !== Date.parse(transportReferenceAt)) {
    throw new Error(`Candidate G transporthukommelse slutter ikke ved transportreferencen for kystdel ${partId}`);
  }
}

function continuationRows(document, { requireAccepted }) {
  const parts = document?.coastalParts?.parts;
  if (!parts || typeof parts !== 'object' || Array.isArray(parts)) {
    throw new Error('Candidate G-kystdele mangler i conditions.json');
  }
  return Object.entries(parts).sort(([left], [right]) => left.localeCompare(right)).map(([partId, part]) => {
    if (requireAccepted && part?.candidateG?.initialStateAccepted !== true) {
      throw new Error(`Kildens Candidate G-tilstand var ikke videreført for kystdel ${partId}`);
    }
    const state = part?.candidateG?.currentState;
    validateState(state, partId);
    return [partId, state];
  });
}

function rowsHash(rows) {
  return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

function poisonedLineageDetected(config, target) {
  const policy = config?.poisonedLineage;
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return false;
  if (policy.kind === 'accepted-cadence-phase-window-incomplete') {
    if (!validTime(policy.datasetGeneratedAtNotBefore)
      || !validTime(policy.datasetGeneratedAtBefore)
      || !finite(policy.minimumAffectedPartRatio)
      || Number(policy.minimumAffectedPartRatio) <= 0
      || Number(policy.minimumAffectedPartRatio) > 1
      || !finite(policy.minimumCoverageHours)
      || !finite(policy.maximumCoverageHoursExclusive)
      || Number(policy.minimumCoverageHours) < 0
      || Number(policy.maximumCoverageHoursExclusive) <= Number(policy.minimumCoverageHours)
      || !validTime(target?.generatedAt)) {
      throw new Error('Candidate G recovery har en ugyldig cadence-phase-kontrakt');
    }
    const generatedAt = Date.parse(target.generatedAt);
    if (generatedAt < Date.parse(policy.datasetGeneratedAtNotBefore)
      || generatedAt >= Date.parse(policy.datasetGeneratedAtBefore)) return false;
    const rows = continuationRows(target, { requireAccepted: false });
    const affected = rows.filter(([partId, state]) => {
      const candidate = target.coastalParts.parts[partId]?.candidateG;
      return candidate?.initialStateAccepted === true
        && state.transportMemoryReady === false
        && state.transportMemoryStatus === 'WINDOW_INCOMPLETE'
        && Number(state.transportMemoryCoverageHours) >= Number(policy.minimumCoverageHours)
        && Number(state.transportMemoryCoverageHours) < Number(policy.maximumCoverageHoursExclusive)
        && state.transportEvidence.every(item => Number.isFinite(item?.strength));
    }).length;
    return affected / rows.length >= Number(policy.minimumAffectedPartRatio);
  }
  if (!validTime(policy.resetReferenceAt)
    || !validTime(policy.datasetGeneratedAtNotBefore)
    || !validTime(policy.datasetGeneratedAtBefore)
    || !finite(policy.minimumAffectedPartRatio)
    || Number(policy.minimumAffectedPartRatio) <= 0
    || Number(policy.minimumAffectedPartRatio) > 1
    || !validTime(target?.generatedAt)) {
    throw new Error('Candidate G recovery har en ugyldig poisoned-lineage-kontrakt');
  }
  const generatedAt = Date.parse(target.generatedAt);
  if (generatedAt < Date.parse(policy.datasetGeneratedAtNotBefore)
    || generatedAt >= Date.parse(policy.datasetGeneratedAtBefore)) return false;
  const resetReferenceAt = Date.parse(policy.resetReferenceAt);
  const rows = continuationRows(target, { requireAccepted: false });
  const affected = rows.filter(([, state]) => {
    const earliestEvidenceAt = Date.parse(state.transportEvidence[0]?.time);
    return Number.isFinite(earliestEvidenceAt) && earliestEvidenceAt >= resetReferenceAt;
  }).length;
  return affected / rows.length >= Number(policy.minimumAffectedPartRatio);
}

function recoveryRequired(config, target) {
  if (config.enabled !== true) return false;
  const poisonedLineage = poisonedLineageDetected(config, target);
  if (config.restoreStrategy === 'merge-transport-evidence') return poisonedLineage;
  return target.datasetId === config.targetDatasetId || poisonedLineage;
}

function mergeTransportEvidence(sourceState, targetState, partId) {
  validateState(targetState, partId);
  for (const key of ['schemaVersion', 'modelId', 'variantId', 'profileId', 'stateKey']) {
    if (sourceState[key] !== targetState[key]) {
      throw new Error(`Candidate G recovery matcher ikke målets modelkontekst for kystdel ${partId}`);
    }
  }
  const byTime = new Map();
  for (const item of [...sourceState.transportEvidence, ...targetState.transportEvidence]) {
    const existing = byTime.get(item.time);
    if (existing && existing.strength !== item.strength) {
      throw new Error(`Candidate G recovery har modstridende transportbevis for kystdel ${partId}`);
    }
    byTime.set(item.time, { ...item });
  }
  const combined = [...byTime.values()]
    .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
  const referenceTime = targetState.transportReferenceAt ?? targetState.time;
  const bounded = buildBoundedCurrentTransportMemory(combined, { referenceTime });
  const replayed = bounded.result;
  const merged = {
    ...targetState,
    transportPotential: replayed?.transportPotential ?? targetState.transportPotential,
    outboundEpisodeEffectiveHours: replayed?.outboundEpisodeEffectiveHours
      ?? targetState.outboundEpisodeEffectiveHours,
    transportMemoryReady: bounded.memoryReady,
    transportMemoryStatus: bounded.status,
    transportMemoryWindowHours: bounded.windowHours,
    transportMemoryCoverageHours: bounded.coverageHours,
    transportEvidence: bounded.evidence.map(item => ({ ...item })),
  };
  validateState(merged, partId);
  return merged;
}

async function writeGithubOutput(file, values) {
  if (!file) return;
  await fs.appendFile(file, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''));
}

export async function assessRecovery({ root = '.', githubOutput = null } = {}) {
  const absoluteRoot = path.resolve(root);
  const config = await readJson(path.join(absoluteRoot, DEFAULT_CONFIG));
  const target = await readJson(path.join(absoluteRoot, DEFAULT_TARGET));
  const required = recoveryRequired(config, target);
  const result = {
    required,
    targetDatasetId: target.datasetId ?? null,
    sourceRunId: String(config.sourceRunId ?? ''),
    sourceDatasetId: config.sourceDatasetId ?? null,
  };
  await writeGithubOutput(githubOutput, {
    required: required ? 'true' : 'false',
    source_run_id: result.sourceRunId,
    source_dataset_id: result.sourceDatasetId ?? '',
  });
  return result;
}

export async function restoreContinuation({ root = '.', sourceRoot } = {}) {
  if (!sourceRoot) throw new Error('--source-root er påkrævet ved genoptagelse');
  const absoluteRoot = path.resolve(root);
  const absoluteSource = path.resolve(sourceRoot);
  const config = await readJson(path.join(absoluteRoot, DEFAULT_CONFIG));
  const targetPath = path.join(absoluteRoot, DEFAULT_TARGET);
  const target = await readJson(targetPath);
  if (!recoveryRequired(config, target)) {
    return { restored: false, reason: 'target-dataset-does-not-require-recovery', targetDatasetId: target.datasetId ?? null };
  }
  const sourceManifest = await readJson(path.join(absoluteSource, 'data/live/manifest.json'));
  const source = await readJson(path.join(absoluteSource, 'data/live/conditions.json'));
  if (sourceManifest.datasetId !== config.sourceDatasetId || source.datasetId !== config.sourceDatasetId) {
    throw new Error('Recovery-kildens manifest og conditions matcher ikke det eksakt godkendte datasæt');
  }
  const sourceRows = continuationRows(source, { requireAccepted: true });
  if (sourceRows.length !== config.sourcePartCount) {
    throw new Error(`Recovery-kilden har ${sourceRows.length} kystdele; ${config.sourcePartCount} kræves`);
  }
  if (rowsHash(sourceRows) !== config.sourceStateSha256) {
    throw new Error('Recovery-kildens kompakte Candidate G-tilstand matcher ikke den godkendte integritet');
  }
  const targetParts = target?.coastalParts?.parts;
  if (!targetParts || Object.keys(targetParts).length !== sourceRows.length) {
    throw new Error('Måldatasættets kystdele matcher ikke recovery-kilden');
  }
  const sourcePartIds = new Set(sourceRows.map(([partId]) => partId));
  if (Object.keys(targetParts).some(partId => !sourcePartIds.has(partId))) {
    throw new Error('Måldatasættets kystdelsidentiteter matcher ikke recovery-kilden');
  }
  const strategy = config.restoreStrategy ?? 'replace-state';
  if (!['replace-state', 'merge-transport-evidence'].includes(strategy)) {
    throw new Error('Candidate G recovery har en ukendt restore-strategi');
  }
  let recoveredReadyPartCount = 0;
  for (const [partId, state] of sourceRows) {
    if (!targetParts[partId]?.candidateG) {
      throw new Error(`Måldatasættet mangler Candidate G for kystdel ${partId}`);
    }
    const restoredState = strategy === 'merge-transport-evidence'
      ? mergeTransportEvidence(state, targetParts[partId].candidateG.currentState, partId)
      : structuredClone(state);
    targetParts[partId].candidateG.currentState = restoredState;
    if (restoredState.transportMemoryReady === true
      && restoredState.transportMemoryStatus === 'READY') recoveredReadyPartCount += 1;
  }
  if (strategy === 'merge-transport-evidence') {
    const minimumReadyRatio = Number(config.minimumRecoveredReadyPartRatio);
    if (!(minimumReadyRatio > 0 && minimumReadyRatio <= 1)
      || recoveredReadyPartCount / sourceRows.length < minimumReadyRatio) {
      throw new Error('Candidate G recovery kunne ikke genskabe den krævede READY-dækning');
    }
  }
  const temporary = `${targetPath}.candidate-g-recovery-${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(target, null, 2)}\n`);
  await fs.rename(temporary, targetPath);
  const times = sourceRows.map(([, state]) => state.time).sort();
  return {
    restored: true,
    sourceDatasetId: source.datasetId,
    targetDatasetId: target.datasetId,
    partCount: sourceRows.length,
    strategy,
    recoveredReadyPartCount,
    oldestStateAt: times[0],
    newestStateAt: times.at(-1),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = options.check
    ? await assessRecovery(options)
    : await restoreContinuation(options);
  console.log(JSON.stringify(result));
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? '')) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
