#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { assertRavScoreModelBinding, ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { selectRavScoreProductionInitialState, ravScoreOwnerCurrentHistoryStartAt }
  from './lib/ravscore-production-part-pipeline.mjs';
import { ravScoreRecoverySourceStartAt, RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS,
  RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES } from './lib/ravscore-recovery-replay.mjs';
import { ravScoreSamplingContextKey } from './lib/ravscore-sampling-context.mjs';
import { dmiExpectedIdentityForPart } from './lib/ravscore-production-adapters.mjs';
import { assertCoastalPointActivationStateInjection } from './lib/coastal-point-staging-contract.mjs';
import { assertPrivateConditionsHourly } from './lib/private-conditions-hourly.mjs';
import { loadRavScoreContinuationCheckpointForTarget } from './ravscore-continuation-checkpoint.mjs';
import { resolveProductionReferenceTime } from './lib/production-reference-time.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOUR = 3_600_000;
const SHA = /^sha256:[a-f0-9]{64}$/;
const hash = bytes => `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const SOURCE_PATHS = Object.freeze({
  registry: 'data/live/coastal-parts-v2.json',
  conditions: 'data/live/conditions.json',
  checkpoint: '.cache/ravscore-continuation-checkpoint/checkpoint.json',
  activation: '.cache/coastal-point-staging/activation-state-injection.json',
});
export const RAVSCORE_CURRENT_HISTORY_DEMAND_PATH = '.cache/ravscore-current-history-demand.json';

function refuse(reason) {
  const error = new Error(`RAVSCORE_CURRENT_HISTORY_DEMAND_${reason}`);
  error.code = `RAVSCORE_CURRENT_HISTORY_DEMAND_${reason}`;
  throw error;
}
function exactHour(value) {
  if (typeof value !== 'string' || !value) refuse('TARGET_REQUIRED');
  const canonical = resolveProductionReferenceTime(value);
  if (canonical !== value) refuse('NONCANONICAL_TIME');
  return canonical;
}
function workflowTargetHour(value) {
  if (typeof value !== 'string' || !value) refuse('TARGET_REQUIRED');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(value)) refuse('NONCANONICAL_TIME');
  // Only the normal workflow boundary has two equivalent serializations.
  // Authenticated states/endpoints below keep their exact-hour byte contract.
  return exactHour(value.length === 20 ? `${value.slice(0, -1)}.000Z` : value);
}

// Acquisition/retention only. No selected state or sampling receipt is returned,
// rewritten, upgraded or admitted here. The real two-model pipeline still owns
// pair validation and the strict NEW-current assertions after source selection.
export function planRavScoreCurrentHistoryForPart({
  part, existingPart = null, checkpointStates = {}, pointStateInjections = {},
  targetReferenceAt, stateLessRecovery = false,
} = {}) {
  const target = exactHour(targetReferenceAt);
  if (typeof stateLessRecovery !== 'boolean') refuse('MODE_INVALID');
  const identity = dmiExpectedIdentityForPart(part);
  if (!identity || typeof part?.zoneId !== 'string' || !part.zoneId) refuse('IDENTITY_INVALID');
  const samplingContextKey = ravScoreSamplingContextKey(part);
  const selected = selectRavScoreProductionInitialState({
    part, existingPart, checkpointStates, pointStateInjections, targetReferenceAt: target,
    candidateGBootstrapMode: stateLessRecovery
      ? RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES.integratedStateLessRecovery
      : RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES.automatic,
    candidateGSourceValidated: false,
  });
  if (!['EXISTING_INTEGRATED', 'INTEGRATED_CHECKPOINT', 'POINT_ACTIVATION', 'COLD_START']
    .includes(selected.source)) refuse('NON_INTEGRATED_ROUTE');
  const state = selected.state;
  if ((selected.source === 'COLD_START') !== (state === null)) refuse('STATE_SOURCE_MISMATCH');
  const initialStateAt = state === null ? null : exactHour(state.time);
  if (initialStateAt !== null) {
    const age = (Date.parse(target) - Date.parse(initialStateAt)) / HOUR;
    if (age < 0 || age > RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS
      || (selected.source === 'POINT_ACTIVATION' && initialStateAt !== target)) refuse('STATE_TIME_INVALID');
  }
  const startAt = ravScoreOwnerCurrentHistoryStartAt(part, state,
    ravScoreRecoverySourceStartAt(state, target), { requireNativeGridSampling: true });
  const span = (Date.parse(target) - Date.parse(exactHour(startAt))) / HOUR;
  // 51 = the existing strict owner helper's 48h window + three endpoint-support
  // hours; 72 = the normal selector's maximum continuation age. No wall clock.
  if (!Number.isSafeInteger(span) || span < 0
    || span > RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS + 51) refuse('RANGE_INVALID');
  return {
    partId: part.partId, zoneId: part.zoneId, parentZoneId: identity.parentZoneId,
    entityId: identity.entityId, samplingPoint: [...identity.samplingPoint], samplingContextKey,
    initialSource: selected.source, initialStateAt,
    initialStateSha256: state === null ? null : hash(JSON.stringify(state)),
    startAt, endAt: target,
  };
}

export function buildRavScoreCurrentHistoryDemand({
  registry, conditions, checkpoint, activationPairs = {}, productionReferenceAt,
  registrySha256, sourceHashes, stateLessRecovery = false,
} = {}) {
  const target = exactHour(productionReferenceAt);
  if (!object(registry) || registry.schemaVersion !== 2 || registry.enabled !== true
    || !object(registry.zones) || !Number.isSafeInteger(registry.partCount) || registry.partCount < 1
    || !Number.isSafeInteger(registry.zoneCount) || registry.zoneCount < 1
    || Object.keys(registry.zones).length !== registry.zoneCount || !SHA.test(registrySha256)
    || !object(conditions) || !object(activationPairs)
    || !object(sourceHashes)
    || JSON.stringify(Object.keys(sourceHashes).sort()) !== '["activation","checkpoint","conditions"]'
    || Object.values(sourceHashes).some(value => value !== null && !SHA.test(value))) refuse('ENVELOPE_INVALID');
  if (conditions.coastalParts) {
    assertRavScoreModelBinding(conditions.coastalParts.modelBinding, 'Current-history baseline binding');
    if (!object(conditions.coastalParts.parts)) refuse('BASELINE_INVALID');
  }
  if (!object(checkpoint) || typeof checkpoint.loaded !== 'boolean') refuse('CHECKPOINT_INVALID');
  const checkpointStates = checkpoint.loaded && checkpoint.continuationAvailable ? checkpoint.states : {};
  if (!object(checkpointStates)) refuse('CHECKPOINT_INVALID');
  const pointStateInjections = Object.fromEntries(Object.entries(activationPairs)
    .map(([id, pair]) => [id, pair.integratedState]));
  const seen = new Set();
  const demands = [];
  for (const [zoneId, parts] of Object.entries(registry.zones)) {
    if (!Array.isArray(parts) || !parts.length) refuse('REGISTRY_INVALID');
    for (const entry of parts) {
      if (!object(entry) || seen.has(entry.partId)) refuse('REGISTRY_INVALID');
      seen.add(entry.partId);
      const part = { ...entry, zoneId };
      demands.push(planRavScoreCurrentHistoryForPart({
        part, existingPart: conditions.coastalParts?.parts?.[part.partId] ?? null,
        checkpointStates, pointStateInjections, targetReferenceAt: target, stateLessRecovery,
      }));
    }
  }
  if (demands.length !== registry.partCount
    || Object.keys(activationPairs).some(id => !seen.has(id))) refuse('REGISTRY_INVENTORY_MISMATCH');
  demands.sort((left, right) => left.partId < right.partId ? -1 : left.partId > right.partId ? 1 : 0);
  return {
    schemaVersion: 1, kind: 'RAVSCORE_CURRENT_HISTORY_ACQUISITION_DEMAND',
    productionReferenceAt: target, modelBinding: { ...ravScoreModelBinding() },
    registrySha256, sourceHashes: { ...sourceHashes }, demands,
  };
}

async function readFixed(relative, optional = false) {
  try {
    const bytes = await fs.readFile(path.join(ROOT, relative));
    return { bytes, json: JSON.parse(bytes.toString('utf8')), sha256: hash(bytes) };
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return null;
    throw error;
  }
}
function environmentBoolean(name) {
  const value = process.env[name] ?? 'false';
  if (!['true', 'false'].includes(value)) refuse('ENVIRONMENT_INVALID');
  return value === 'true';
}
async function main() {
  if (process.argv.length !== 2) refuse('ARGUMENTS_INVALID');
  const productionReferenceAt = workflowTargetHour(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR);
  const baselineRequired = environmentBoolean('RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE');
  const stateLessRecovery = environmentBoolean('RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED');
  const registry = await readFixed(SOURCE_PATHS.registry);
  const baseline = await readFixed(SOURCE_PATHS.conditions, !baselineRequired);
  const conditions = baseline?.json ?? { zones: {} };
  if (baselineRequired && (!object(conditions.zones) || !object(conditions.coastalParts?.parts))) {
    refuse('BASELINE_REQUIRED');
  }
  // The compact part states are not inside the compressed zone-hour arrays.
  // Validate the existing lossless pack without materializing another hour copy.
  assertPrivateConditionsHourly(conditions);
  const activation = await readFixed(SOURCE_PATHS.activation, true);
  const activationPairs = activation ? assertCoastalPointActivationStateInjection(activation.json) : {};
  // This is the SAME normal cache validator/compatible-reattest operation used
  // by Weather. It may update only its usual cache checkpoint, never B/S.
  const checkpoint = await loadRavScoreContinuationCheckpointForTarget({
    checkpointPath: path.join(ROOT, SOURCE_PATHS.checkpoint),
    targetReference: productionReferenceAt, repositoryRoot: ROOT,
  });
  const checkpointFile = await readFixed(SOURCE_PATHS.checkpoint, true);
  if (checkpoint.loaded !== Boolean(checkpointFile)
    || (checkpoint.loaded && (checkpointFile.json.generationSha256 !== checkpoint.generationSha256
      || checkpointFile.json.productionReferenceAt !== checkpoint.checkpointAt
      || (checkpoint.continuationAvailable
        && !isDeepStrictEqual(checkpointFile.json.states, checkpoint.states))))) {
    refuse('CHECKPOINT_CHANGED');
  }
  // The hash describes post-validation/normal-reattest cache bytes, not a new
  // authentication token. The returned genuine states determine demand only.
  const demand = buildRavScoreCurrentHistoryDemand({
    registry: registry.json, conditions, checkpoint, activationPairs, productionReferenceAt,
    registrySha256: registry.sha256,
    sourceHashes: { conditions: baseline?.sha256 ?? null,
      checkpoint: checkpointFile?.sha256 ?? null, activation: activation?.sha256 ?? null },
    stateLessRecovery,
  });
  // Existing private .cache only; no directory creation, original rewrite,
  // provider operation, public artifact, checkpoint save or state promotion.
  await fs.writeFile(path.join(ROOT, RAVSCORE_CURRENT_HISTORY_DEMAND_PATH),
    `${JSON.stringify(demand)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ kind: demand.kind, partCount: demand.demands.length,
    maximumSpanHours: Math.max(...demand.demands.map(row =>
      (Date.parse(row.endAt) - Date.parse(row.startAt)) / HOUR)) }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.code ?? 'RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED'); process.exitCode = 1; });
}
