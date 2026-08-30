#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RAVSCORE_MIGRATION_ID,
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  RAVSCORE_PROFILE_ID,
  RAVSCORE_STATE_SCHEMA_VERSION,
  RAVSCORE_VARIANT_ID,
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import { buildIntegratedRavScoreStateSeries } from '../js/core/ravscore-integrated-state-pipeline.js';
import { buildCurrentSupplyMemory } from '../js/core/ravscore-current-supply-memory.js';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  ravScoreContinuationImplementationSha256,
} from './lib/ravscore-continuation-implementation-contract.mjs';

export const RAVSCORE_CONTINUATION_CHECKPOINT_POLICY = Object.freeze({
  schemaVersion: 2,
  status: 'ravscore-schema5-compact-continuation',
  expectedPartCount: 673,
  maximumAgeHours: 72,
  cacheNamespace: 'ravscore-continuation-schema5-v3',
});

const CHECKPOINT_KEYS = Object.freeze([
  'schemaVersion',
  'status',
  'datasetId',
  'productionReferenceAt',
  'modelBinding',
  'continuationStateContractSha256',
  'partCount',
  'stateSha256',
  'states',
  'privacy',
]);
const PRIVACY_KEYS = Object.freeze([
  'compactDerivedStateOnly',
  'weatherIncluded',
  'scoresIncluded',
  'rawVectorsIncluded',
  'coordinatesIncluded',
  'privateDataIncluded',
]);
const STATE_KEYS = Object.freeze([
  'schemaVersion',
  'modelId',
  'variantId',
  'profileId',
  'componentSchemaId',
  'explanationSchemaId',
  'rankingPolicyId',
  'bestTimePolicyId',
  'presentationPolicyId',
  'modelContractSha256',
  'modelBundleSha256',
  'samplingContextKey',
  'time',
  'currentReferenceAt',
  'currentMemoryReady',
  'currentMemoryStatus',
  'currentMemoryWindowHours',
  'currentMemoryCoverageHours',
  'currentEvidence',
  'currentNativeHoldAuthorization',
  'supplyPotential',
  'waveStateSchemaVersion',
  'wavePolicyId',
  'waveLastVerifiedAt',
  'waveMigrationSeedAt',
  'waveMemoryReady',
  'waveMemoryStatus',
  'waveEnergyScore',
  'waveMigrationSeedAwaitingReference',
  'mobilisationPotential',
  'rollbackCandidateGMobilisationPotential',
  'waveApproachState',
  'lineage',
]);
const EVIDENCE_KEYS = Object.freeze(['time', 'strength']);
const NATIVE_HOLD_AUTHORIZATION_KEYS = Object.freeze([
  'sourceClass',
  'source',
  'collection',
  'distanceKm',
]);
const LINEAGE_KEYS = Object.freeze([
  'migrationId',
  'sourceModelId',
  'sourceStateSchemaVersion',
  'migratedAt',
]);

const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const finiteTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const safeDatasetId = value => typeof value === 'string'
  && /^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
const close = (left, right) => Number.isFinite(left)
  && Number.isFinite(right)
  && Math.abs(left - right) <= 1e-9;
const canonicalTime = (value, label) => {
  if (!finiteTime(value)) throw new Error(`${label} is not a valid time`);
  const canonical = new Date(value).toISOString();
  if (canonical !== value) throw new Error(`${label} is not canonical UTC`);
  return canonical;
};
const sha256 = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const isPlainObject = value => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;

async function assertNoSymlinkComponents(file, {
  allowMissingLeaf = false,
  expectDirectory = false,
} = {}) {
  const resolved = path.resolve(file);
  const parsed = path.parse(resolved);
  const components = path.relative(parsed.root, resolved).split(path.sep).filter(Boolean);
  let current = parsed.root;
  for (let index = 0; index < components.length; index += 1) {
    current = path.join(current, components[index]);
    const stat = await fs.lstat(current).catch(error => {
      if (error?.code === 'ENOENT') return null;
      throw error;
    });
    if (!stat) {
      if (allowMissingLeaf && index === components.length - 1) return resolved;
      const error = new Error(`RavScore checkpoint path is missing: ${resolved}`);
      error.code = 'ENOENT';
      throw error;
    }
    if (stat.isSymbolicLink()) {
      throw new Error('RavScore checkpoint path must not traverse a symbolic link');
    }
    if (index === components.length - 1
      && (expectDirectory ? !stat.isDirectory() : !stat.isFile())) {
      throw new Error(expectDirectory
        ? 'RavScore checkpoint parent is not a directory'
        : 'RavScore checkpoint path is not a regular file');
    }
  }
  return resolved;
}

const readJson = async file => {
  const resolved = await assertNoSymlinkComponents(file);
  return JSON.parse(await fs.readFile(resolved, 'utf8'));
};

function assertExactKeys(value, expected, label) {
  if (!isPlainObject(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort(compareText);
  const wanted = [...expected].sort(compareText);
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} has an incompatible field set`);
  }
}

function compactLineage(value, partId) {
  if (value === null) return null;
  assertExactKeys(value, LINEAGE_KEYS, `RavScore lineage for ${partId}`);
  if (value.migrationId !== RAVSCORE_MIGRATION_ID
    || value.sourceModelId !== CANDIDATE_G_STATE_MODEL_ID
    || value.sourceStateSchemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION) {
    throw new Error(`RavScore lineage for ${partId} is incompatible`);
  }
  return {
    migrationId: value.migrationId,
    sourceModelId: value.sourceModelId,
    sourceStateSchemaVersion: value.sourceStateSchemaVersion,
    migratedAt: canonicalTime(value.migratedAt, `RavScore migration time for ${partId}`),
  };
}

function compactState(state, partId) {
  assertExactKeys(state, STATE_KEYS, `RavScore state for ${partId}`);
  const expectedBinding = ravScoreModelBinding();
  if (state.schemaVersion !== RAVSCORE_STATE_SCHEMA_VERSION
    || state.modelId !== RAVSCORE_MODEL_ID
    || state.variantId !== RAVSCORE_VARIANT_ID
    || state.profileId !== RAVSCORE_PROFILE_ID
    || state.componentSchemaId !== expectedBinding.componentSchemaId
    || state.explanationSchemaId !== expectedBinding.explanationSchemaId
    || state.rankingPolicyId !== expectedBinding.rankingPolicyId
    || state.bestTimePolicyId !== expectedBinding.bestTimePolicyId
    || state.presentationPolicyId !== expectedBinding.presentationPolicyId
    || state.modelContractSha256 !== RAVSCORE_MODEL_CONTRACT_SHA256
    || state.modelBundleSha256 !== RAVSCORE_MODEL_BUNDLE_SHA256) {
    throw new Error(`RavScore state for ${partId} has incompatible model metadata`);
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(state.samplingContextKey)) {
    throw new Error(`RavScore state for ${partId} has an invalid sampling context`);
  }
  if (!Array.isArray(state.currentEvidence)) {
    throw new Error(`RavScore state for ${partId} has invalid compact current evidence`);
  }
  const currentEvidence = state.currentEvidence.map((item, index) => {
    assertExactKeys(item, EVIDENCE_KEYS, `RavScore current evidence ${index} for ${partId}`);
    if (item.strength !== null
      && (!Number.isFinite(item.strength) || item.strength < -1 || item.strength > 1)) {
      throw new Error(`RavScore current evidence ${index} for ${partId} is invalid`);
    }
    return {
      time: canonicalTime(item.time, `RavScore current evidence time for ${partId}`),
      strength: item.strength,
    };
  });
  let currentNativeHoldAuthorization = null;
  if (state.currentNativeHoldAuthorization !== null) {
    assertExactKeys(
      state.currentNativeHoldAuthorization,
      NATIVE_HOLD_AUTHORIZATION_KEYS,
      `RavScore native-hold authorization for ${partId}`,
    );
    const authorization = state.currentNativeHoldAuthorization;
    if (authorization.sourceClass !== 'owner-approved-regional-proxy'
      || authorization.source !== 'dmi-dkss-lf-regional-proxy'
      || authorization.collection !== 'dkss_lf'
      || !Number.isFinite(authorization.distanceKm)
      || authorization.distanceKm < 0
      || authorization.distanceKm > 15) {
      throw new Error(`RavScore native-hold authorization for ${partId} is invalid`);
    }
    currentNativeHoldAuthorization = { ...authorization };
  }
  const time = canonicalTime(state.time, `RavScore state time for ${partId}`);
  const currentReferenceAt = canonicalTime(
    state.currentReferenceAt,
    `RavScore current reference for ${partId}`,
  );
  const waveLastVerifiedAt = state.waveLastVerifiedAt === null
    ? null
    : canonicalTime(state.waveLastVerifiedAt, `RavScore wave reference for ${partId}`);
  const waveMigrationSeedAt = state.waveMigrationSeedAt === null
    ? null
    : canonicalTime(state.waveMigrationSeedAt, `RavScore wave migration seed time for ${partId}`);
  const lineage = compactLineage(state.lineage, partId);
  if (lineage !== null && Date.parse(lineage.migratedAt) > Date.parse(time)) {
    throw new Error(`RavScore migration time for ${partId} is after its state`);
  }

  const compact = {
    schemaVersion: state.schemaVersion,
    modelId: state.modelId,
    variantId: state.variantId,
    profileId: state.profileId,
    componentSchemaId: state.componentSchemaId,
    explanationSchemaId: state.explanationSchemaId,
    rankingPolicyId: state.rankingPolicyId,
    bestTimePolicyId: state.bestTimePolicyId,
    presentationPolicyId: state.presentationPolicyId,
    modelContractSha256: state.modelContractSha256,
    modelBundleSha256: state.modelBundleSha256,
    samplingContextKey: state.samplingContextKey,
    time,
    currentReferenceAt,
    currentMemoryReady: state.currentMemoryReady,
    currentMemoryStatus: state.currentMemoryStatus,
    currentMemoryWindowHours: state.currentMemoryWindowHours,
    currentMemoryCoverageHours: state.currentMemoryCoverageHours,
    currentEvidence,
    currentNativeHoldAuthorization,
    supplyPotential: state.supplyPotential,
    waveStateSchemaVersion: state.waveStateSchemaVersion,
    wavePolicyId: state.wavePolicyId,
    waveLastVerifiedAt,
    waveMigrationSeedAt,
    waveMemoryReady: state.waveMemoryReady,
    waveMemoryStatus: state.waveMemoryStatus,
    waveEnergyScore: state.waveEnergyScore,
    waveMigrationSeedAwaitingReference: state.waveMigrationSeedAwaitingReference,
    mobilisationPotential: state.mobilisationPotential,
    rollbackCandidateGMobilisationPotential:
      state.rollbackCandidateGMobilisationPotential,
    waveApproachState: { ...state.waveApproachState },
    lineage,
  };

  const replayedCurrent = buildCurrentSupplyMemory(currentEvidence, {
    referenceTime: time,
    nativeHold: state.currentMemoryStatus === 'READY_NATIVE_HOLD'
      && currentNativeHoldAuthorization !== null,
  });
  const currentPotentialMatches = replayedCurrent.supplyPotential === null
    ? compact.supplyPotential === null
    : close(replayedCurrent.supplyPotential, compact.supplyPotential);
  if (replayedCurrent.memoryReady !== compact.currentMemoryReady
    || replayedCurrent.status !== compact.currentMemoryStatus
    || replayedCurrent.referenceTime !== compact.currentReferenceAt
    || replayedCurrent.requestedReferenceTime !== compact.time
    || replayedCurrent.windowHours !== compact.currentMemoryWindowHours
    || !close(replayedCurrent.coverageHours, compact.currentMemoryCoverageHours)
    || JSON.stringify(replayedCurrent.evidence) !== JSON.stringify(compact.currentEvidence)
    || !currentPotentialMatches) {
    throw new Error(`RavScore current state for ${partId} contradicts its compact evidence`);
  }

  // Reuse the model's own replay/state validator. Empty samples mean that this
  // can only continue exact schema 5; it cannot invoke the schema-2 migration.
  const validation = buildIntegratedRavScoreStateSeries([], {
    samplingContextKey: compact.samplingContextKey,
    initialState: compact,
  });
  if (!validation.initialStateAccepted
    || validation.migrationApplied
    || validation.initialStateSource !== 'INTEGRATED_CONTINUATION') {
    throw new Error(`RavScore state for ${partId} is not an exact schema-5 continuation`);
  }
  return compact;
}

function modelBinding(value, label) {
  const expected = ravScoreModelBinding();
  assertExactKeys(value, Object.keys(expected), label);
  assertRavScoreModelBinding(value, label);
  return { ...expected };
}

function rowsFromParts(document, expectedPartCount) {
  const parts = document?.coastalParts?.parts;
  if (!isPlainObject(parts)) {
    throw new Error('RavScore checkpoint source is missing coastalParts.parts');
  }
  const rows = Object.entries(parts)
    .sort(([left], [right]) => compareText(left, right))
    .map(([partId, part]) => {
      if (!partId || !isPlainObject(part)) throw new Error('RavScore checkpoint has an invalid part');
      const state = part?.ravScoreModel?.currentState;
      if (!state) {
        throw new Error(`RavScore checkpoint source has no schema-5 state for ${partId}`);
      }
      return [partId, compactState(state, partId)];
    });
  if (rows.length !== expectedPartCount) {
    throw new Error(`RavScore checkpoint requires ${expectedPartCount} parts, found ${rows.length}`);
  }
  const contexts = new Set(rows.map(([, state]) => state.samplingContextKey));
  if (contexts.size !== rows.length) {
    throw new Error('RavScore checkpoint contains duplicate sampling contexts');
  }
  return rows;
}

function validatePrivacy(value) {
  assertExactKeys(value, PRIVACY_KEYS, 'RavScore checkpoint privacy declaration');
  if (value.compactDerivedStateOnly !== true
    || value.weatherIncluded !== false
    || value.scoresIncluded !== false
    || value.rawVectorsIncluded !== false
    || value.coordinatesIncluded !== false
    || value.privateDataIncluded !== false) {
    throw new Error('RavScore checkpoint privacy declaration is invalid');
  }
  return {
    compactDerivedStateOnly: true,
    weatherIncluded: false,
    scoresIncluded: false,
    rawVectorsIncluded: false,
    coordinatesIncluded: false,
    privateDataIncluded: false,
  };
}

function validateRowsAgainstReference(rows, referenceAt, label) {
  const referenceMs = Date.parse(referenceAt);
  for (const [partId, state] of rows) {
    if (Date.parse(state.time) !== referenceMs) {
      throw new Error(`${label} state time for ${partId} does not match its production reference`);
    }
    if (Date.parse(state.currentReferenceAt) > referenceMs
      || (state.waveLastVerifiedAt !== null && Date.parse(state.waveLastVerifiedAt) > referenceMs)
      || (state.waveMigrationSeedAt !== null && Date.parse(state.waveMigrationSeedAt) > referenceMs)) {
      throw new Error(`${label} contains future state for ${partId}`);
    }
  }
}

async function atomicWrite(file, text) {
  const resolved = path.resolve(file);
  const parent = path.dirname(resolved);
  await fs.mkdir(parent, { recursive: true });
  await assertNoSymlinkComponents(parent, { expectDirectory: true });
  const existing = await fs.lstat(resolved).catch(error => {
    if (error?.code === 'ENOENT') return null;
    throw error;
  });
  if (existing && (!existing.isFile() || existing.isSymbolicLink())) {
    throw new Error('RavScore checkpoint destination is not a regular file');
  }
  const temporary = `${resolved}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  try {
    await fs.writeFile(temporary, text);
    await fs.rename(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

export async function saveRavScoreContinuationCheckpoint({
  sourcePath = 'data/live/conditions.json',
  checkpointPath = '.cache/ravscore-continuation-checkpoint/checkpoint.json',
  expectedPartCount = RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount,
  repositoryRoot,
} = {}) {
  const source = await readJson(sourcePath);
  if (!safeDatasetId(source?.datasetId)) {
    throw new Error('RavScore checkpoint source is missing its dataset identity');
  }
  const productionReferenceAt = canonicalTime(
    source.productionReferenceAt,
    'RavScore checkpoint production reference',
  );
  const rows = rowsFromParts(source, expectedPartCount);
  validateRowsAgainstReference(rows, productionReferenceAt, 'RavScore checkpoint source');
  const continuationStateContractSha256 = await ravScoreContinuationImplementationSha256({
    ...(repositoryRoot === undefined ? {} : { repositoryRoot }),
  });
  const checkpoint = {
    schemaVersion: RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.schemaVersion,
    status: RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.status,
    datasetId: source.datasetId,
    productionReferenceAt,
    modelBinding: { ...ravScoreModelBinding() },
    continuationStateContractSha256,
    partCount: rows.length,
    stateSha256: sha256(rows),
    states: Object.fromEntries(rows),
    privacy: {
      compactDerivedStateOnly: true,
      weatherIncluded: false,
      scoresIncluded: false,
      rawVectorsIncluded: false,
      coordinatesIncluded: false,
      privateDataIncluded: false,
    },
  };
  await atomicWrite(checkpointPath, `${JSON.stringify(checkpoint)}\n`);
  return {
    saved: true,
    datasetId: checkpoint.datasetId,
    productionReferenceAt,
    partCount: rows.length,
    modelId: RAVSCORE_MODEL_ID,
    stateSchemaVersion: RAVSCORE_STATE_SCHEMA_VERSION,
    modelContractSha256: RAVSCORE_MODEL_CONTRACT_SHA256,
    modelBundleSha256: RAVSCORE_MODEL_BUNDLE_SHA256,
    continuationStateContractSha256,
  };
}

function validateCheckpoint(checkpoint, expectedPartCount, expectedImplementationSha256) {
  assertExactKeys(checkpoint, CHECKPOINT_KEYS, 'RavScore checkpoint descriptor');
  if (checkpoint.schemaVersion !== RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.schemaVersion
    || checkpoint.status !== RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.status
    || !safeDatasetId(checkpoint.datasetId)
    || checkpoint.partCount !== expectedPartCount
    || !/^[0-9a-f]{64}$/.test(checkpoint.stateSha256)
    || !/^[0-9a-f]{64}$/.test(checkpoint.continuationStateContractSha256)) {
    throw new Error('RavScore checkpoint descriptor is invalid');
  }
  if (checkpoint.continuationStateContractSha256 !== expectedImplementationSha256) {
    throw new Error('RavScore checkpoint continuation implementation is incompatible');
  }
  const productionReferenceAt = canonicalTime(
    checkpoint.productionReferenceAt,
    'RavScore checkpoint production reference',
  );
  const binding = modelBinding(checkpoint.modelBinding, 'RavScore checkpoint model binding');
  const privacy = validatePrivacy(checkpoint.privacy);
  if (!isPlainObject(checkpoint.states)) throw new Error('RavScore checkpoint states are invalid');
  const rows = Object.entries(checkpoint.states)
    .sort(([left], [right]) => compareText(left, right))
    .map(([partId, state]) => [partId, compactState(state, partId)]);
  if (rows.length !== expectedPartCount || sha256(rows) !== checkpoint.stateSha256) {
    throw new Error('RavScore checkpoint state integrity is invalid');
  }
  const contexts = new Set(rows.map(([, state]) => state.samplingContextKey));
  if (contexts.size !== rows.length) {
    throw new Error('RavScore checkpoint contains duplicate sampling contexts');
  }
  validateRowsAgainstReference(rows, productionReferenceAt, 'RavScore checkpoint');
  return {
    productionReferenceAt,
    binding,
    privacy,
    rows,
    continuationStateContractSha256: checkpoint.continuationStateContractSha256,
  };
}

function nullableTimeRegression(checkpointValue, targetValue) {
  if (targetValue === null) return false;
  if (checkpointValue === null) return true;
  return Date.parse(checkpointValue) < Date.parse(targetValue);
}

function validateCheckpointForTarget(validatedCheckpoint, targetReference) {
  const requestedReferenceAt = canonicalTime(
    targetReference,
    'RavScore checkpoint target reference',
  );
  const checkpointMs = Date.parse(validatedCheckpoint.productionReferenceAt);
  const targetMs = Date.parse(requestedReferenceAt);
  if (checkpointMs > targetMs) {
    throw new Error('RavScore checkpoint is from the future relative to the bound target');
  }
  const ageHours = (targetMs - checkpointMs) / 3_600_000;
  if (ageHours > RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumAgeHours) {
    throw new Error(
      `RavScore checkpoint is older than the ${RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumAgeHours}-hour continuation limit`,
    );
  }
  return { requestedReferenceAt, targetMs, ageHours };
}

export async function loadRavScoreContinuationCheckpointForTarget({
  checkpointPath = '.cache/ravscore-continuation-checkpoint/checkpoint.json',
  targetReference,
  expectedPartCount = RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount,
  repositoryRoot,
} = {}) {
  let checkpoint;
  try {
    checkpoint = await readJson(checkpointPath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { loaded: false, reason: 'checkpoint-not-found' };
    }
    throw error;
  }

  // A present cache is authoritative evidence. Corruption, incompatible model
  // metadata, future state or excessive age must stop the build; none may be
  // silently reinterpreted as a cold start.
  const expectedImplementationSha256 = await ravScoreContinuationImplementationSha256({
    ...(repositoryRoot === undefined ? {} : { repositoryRoot }),
  });
  const validatedCheckpoint = validateCheckpoint(
    checkpoint,
    expectedPartCount,
    expectedImplementationSha256,
  );
  const target = validateCheckpointForTarget(validatedCheckpoint, targetReference);
  return {
    loaded: true,
    sourceDatasetId: checkpoint.datasetId,
    checkpointAt: validatedCheckpoint.productionReferenceAt,
    targetReferenceAt: target.requestedReferenceAt,
    ageHours: target.ageHours,
    partCount: validatedCheckpoint.rows.length,
    modelId: validatedCheckpoint.binding.modelId,
    stateSchemaVersion: validatedCheckpoint.binding.stateSchemaVersion,
    modelContractSha256: validatedCheckpoint.binding.modelContractSha256,
    modelBundleSha256: validatedCheckpoint.binding.modelBundleSha256,
    continuationStateContractSha256:
      validatedCheckpoint.continuationStateContractSha256,
    states: Object.fromEntries(validatedCheckpoint.rows),
    copiedWeather: false,
    copiedScores: false,
    copiedRawVectors: false,
    copiedCoordinates: false,
    copiedPrivateData: false,
  };
}

export async function restoreRavScoreContinuationCheckpoint({
  targetPath = 'data/live/conditions.json',
  checkpointPath = '.cache/ravscore-continuation-checkpoint/checkpoint.json',
  targetReference,
  expectedPartCount = RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount,
  repositoryRoot,
} = {}) {
  let checkpoint;
  try {
    checkpoint = await readJson(checkpointPath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { restored: false, reason: 'checkpoint-not-found', targetUnchanged: true };
    }
    throw error;
  }

  // Existing checkpoints are always validated before any freshness decision:
  // a corrupt cache is a fatal signal, never a silently ignored fallback.
  const expectedImplementationSha256 = await ravScoreContinuationImplementationSha256({
    ...(repositoryRoot === undefined ? {} : { repositoryRoot }),
  });
  const validatedCheckpoint = validateCheckpoint(
    checkpoint,
    expectedPartCount,
    expectedImplementationSha256,
  );
  const targetValidation = validateCheckpointForTarget(validatedCheckpoint, targetReference);
  const requestedReferenceAt = targetValidation.requestedReferenceAt;
  const target = await readJson(targetPath);
  const deployedReferenceAt = canonicalTime(
    target.productionReferenceAt,
    'Hydrated RavScore production reference',
  );
  const checkpointMs = Date.parse(validatedCheckpoint.productionReferenceAt);
  const targetMs = targetValidation.targetMs;
  const deployedMs = Date.parse(deployedReferenceAt);
  if (targetMs < deployedMs) {
    throw new Error('RavScore checkpoint target reference regresses deployed time');
  }
  if (checkpointMs <= deployedMs) {
    return {
      restored: false,
      reason: 'checkpoint-not-newer-than-deployed',
      checkpointAt: validatedCheckpoint.productionReferenceAt,
      targetUnchanged: true,
    };
  }

  const targetParts = target?.coastalParts?.parts;
  if (!isPlainObject(targetParts) || Object.keys(targetParts).length !== expectedPartCount) {
    throw new Error('Hydrated RavScore target has an incompatible part inventory');
  }
  const checkpointPartIds = validatedCheckpoint.rows.map(([partId]) => partId);
  const targetPartIds = Object.keys(targetParts).sort(compareText);
  if (JSON.stringify(checkpointPartIds) !== JSON.stringify(targetPartIds)) {
    throw new Error('Hydrated RavScore target and checkpoint have different parts');
  }

  const planned = [];
  for (const [partId, checkpointState] of validatedCheckpoint.rows) {
    const targetContainer = targetParts[partId]?.ravScoreModel;
    const targetState = targetContainer?.currentState;
    if (!isPlainObject(targetContainer) || !targetState) {
      throw new Error(`Hydrated RavScore target has no schema-5 continuation for ${partId}`);
    }
    const compactTargetState = compactState(targetState, partId);
    if (checkpointState.samplingContextKey !== compactTargetState.samplingContextKey) {
      throw new Error(`RavScore sampling context is incompatible for ${partId}`);
    }
    if (Date.parse(checkpointState.time) < Date.parse(compactTargetState.time)
      || Date.parse(checkpointState.currentReferenceAt)
        < Date.parse(compactTargetState.currentReferenceAt)
      || nullableTimeRegression(
        checkpointState.waveLastVerifiedAt,
        compactTargetState.waveLastVerifiedAt,
      )
      || nullableTimeRegression(
        checkpointState.waveMigrationSeedAt,
        compactTargetState.waveMigrationSeedAt,
      )) {
      throw new Error(`RavScore checkpoint state regresses time for ${partId}`);
    }
    if (Date.parse(checkpointState.time) > targetMs
      || Date.parse(checkpointState.currentReferenceAt) > targetMs
      || (checkpointState.waveLastVerifiedAt !== null
        && Date.parse(checkpointState.waveLastVerifiedAt) > targetMs)
      || (checkpointState.waveMigrationSeedAt !== null
        && Date.parse(checkpointState.waveMigrationSeedAt) > targetMs)) {
      throw new Error(`RavScore checkpoint state is from the future for ${partId}`);
    }
    planned.push({ targetContainer, checkpointState });
  }

  // Mutation starts only after every descriptor, hash, part, context and time
  // has passed. The final file replacement is atomic.
  for (const { targetContainer, checkpointState } of planned) {
    targetContainer.currentState = checkpointState;
  }
  await atomicWrite(targetPath, `${JSON.stringify(target, null, 2)}\n`);
  return {
    restored: true,
    sourceDatasetId: checkpoint.datasetId,
    checkpointAt: validatedCheckpoint.productionReferenceAt,
    partCount: planned.length,
    modelId: validatedCheckpoint.binding.modelId,
    stateSchemaVersion: validatedCheckpoint.binding.stateSchemaVersion,
    modelContractSha256: validatedCheckpoint.binding.modelContractSha256,
    modelBundleSha256: validatedCheckpoint.binding.modelBundleSha256,
    continuationStateContractSha256:
      validatedCheckpoint.continuationStateContractSha256,
    copiedWeather: false,
    copiedScores: false,
    copiedRawVectors: false,
    copiedCoordinates: false,
    copiedPrivateData: false,
  };
}

function parseArgs(argv) {
  const result = { mode: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--save') result.mode = 'save';
    else if (value === '--restore') result.mode = 'restore';
    else if (value === '--source') result.sourcePath = argv[++index];
    else if (value === '--target') result.targetPath = argv[++index];
    else if (value === '--checkpoint') result.checkpointPath = argv[++index];
    else if (value === '--target-reference') result.targetReference = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!result.mode) throw new Error('Use --save or --restore');
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = options.mode === 'save'
    ? await saveRavScoreContinuationCheckpoint(options)
    : await restoreRavScoreContinuationCheckpoint(options);
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
