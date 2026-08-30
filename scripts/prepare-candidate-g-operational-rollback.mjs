#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertRavScoreModelBinding as assertIntegratedBinding,
  ravScoreModelBinding as integratedModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
  buildCandidateGDerivedStateSeries,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  assertRavScoreVerifiedEvidenceTrust,
} from '../js/core/ravscore-evidence-trust-contract.js';
import {
  CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
  assertCandidateGRollbackBinding,
} from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import {
  RAVSCORE_CALIBRATION_ELIGIBLE,
  assertRavScoreModelBinding as assertCandidateBinding,
  ravScoreModelBinding as candidateModelBinding,
} from './rollback-assets/ravscore-model-contract.js';

export const CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY = Object.freeze({
  schemaVersion: '1.0.0',
  kind: 'RAVSCORE_CANDIDATE_G_OPERATIONAL_ROLLBACK_PLAN',
  expectedZoneCount: 210,
  expectedPartCount: 673,
  maximumRuntimeAgeHours: 6,
  dryRunMode: 'dry-run',
  executeMode: 'execute',
  executeConfirmation: 'EXECUTE-CANDIDATE-G-ROLLBACK',
  manualEventName: 'workflow_dispatch',
  mainRef: 'refs/heads/main',
});

const SOURCE_HEAD_PATTERN = /^[0-9a-f]{40}$/;
const DATASET_ID_PATTERN = /^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const isPlainObject = value => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : isPlainObject(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => crypto.createHash('sha256')
  .update(typeof value === 'string' || Buffer.isBuffer(value)
    ? value
    : JSON.stringify(canonical(value)))
  .digest('hex');
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

function canonicalTime(value, label) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} is invalid`);
  }
  const result = new Date(value).toISOString();
  if (result !== value) throw new Error(`${label} is not canonical UTC`);
  return result;
}

function exactKeys(value, expected, label) {
  if (!isPlainObject(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label} has an incompatible field set`);
  }
}

function assertManualMode({
  mode = CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.dryRunMode,
  sourceHead,
  eventName,
  ref,
  githubSha,
  confirmation,
} = {}) {
  if (![CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.dryRunMode,
    CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.executeMode].includes(mode)) {
    throw new Error('Candidate G rollback mode must be dry-run or execute');
  }
  if (!SOURCE_HEAD_PATTERN.test(String(sourceHead ?? ''))) {
    throw new Error('Candidate G rollback requires an exact 40-character source head');
  }
  if (mode === CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.executeMode
    && (eventName !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.manualEventName
      || ref !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.mainRef
      || githubSha !== sourceHead
      || confirmation !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.executeConfirmation)) {
    throw new Error('Candidate G rollback execute requires exact manual-dispatch authorization');
  }
  return mode;
}

function assertState(state, partId) {
  if (!isPlainObject(state)
    || state.schemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION
    || state.modelId !== CANDIDATE_G_STATE_MODEL_ID
    || state.variantId !== CANDIDATE_G_STATE_VARIANT_ID
    || state.profileId !== CANDIDATE_G_STATE_PROFILE_ID
    || typeof state.stateKey !== 'string'
    || !state.stateKey) {
    throw new Error(`Candidate G rollback state for ${partId} is incompatible`);
  }
  const validated = buildCandidateGDerivedStateSeries([], {
    stateKey: state.stateKey,
    initialState: state,
  });
  if (!validated.initialStateAccepted
    || !same(validated.continuationState, state)
    || state.transportMemoryReady !== true
    || state.transportMemoryStatus !== 'READY') {
    throw new Error(`Candidate G rollback state for ${partId} is not a READY exact continuation`);
  }
}

function assertPublicMode(mode, label, binding) {
  if (!isPlainObject(mode)
    || mode.available !== true
    || typeof mode.score !== 'number'
    || !Number.isFinite(mode.score)
    || mode.score < 0
    || mode.score > 100
    || mode.scoreProfileId !== binding.modelId
    || !same(mode.modelBinding, binding)
    || !isPlainObject(mode.components)
    || JSON.stringify(Object.keys(mode.components).sort())
      !== JSON.stringify(['huntability', 'release', 'transport'])
    || !['huntability', 'transport', 'release'].every(key =>
      typeof mode.components[key] === 'number'
      && Number.isFinite(mode.components[key])
      && mode.components[key] >= 0
      && mode.components[key] <= 100)) {
    throw new Error(`${label} is not an exact available Candidate G score`);
  }
  assertCandidateBinding(mode.modelBinding, `${label} model binding`);
}

function assertNoRawVectors(value, label, depth = 0) {
  if (depth > 18) throw new Error(`${label} exceeds the rollback privacy depth`);
  if (Array.isArray(value)) {
    for (const child of value) assertNoRawVectors(child, label, depth + 1);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (['currentumps', 'currentvmps', 'rawu', 'rawv', 'rawumps', 'rawvmps'].includes(normalized)
      || /raw.*(?:u|v)(?:mps)?$/.test(normalized)) {
      throw new Error(`${label} contains a forbidden raw current-vector field`);
    }
    assertNoRawVectors(child, label, depth + 1);
  }
}

function validateRollbackEnvelope(full, {
  expectedDatasetId,
  expectedSourceHead,
  now,
  maximumRuntimeAgeHours,
} = {}) {
  if (!isPlainObject(full) || !DATASET_ID_PATTERN.test(String(full.datasetId ?? ''))) {
    throw new Error('Private runtime lacks a safe dataset identity');
  }
  if (full.datasetId !== expectedDatasetId) {
    throw new Error('Candidate G rollback dataset does not match the manually expected dataset');
  }
  if (!SOURCE_HEAD_PATTERN.test(String(expectedSourceHead ?? ''))) {
    throw new Error('Candidate G rollback source-head expectation is invalid');
  }
  const reference = canonicalTime(
    full.productionReferenceAt,
    'Candidate G rollback production reference',
  );
  const current = canonicalTime(now, 'Candidate G rollback validation time');
  const ageHours = (Date.parse(current) - Date.parse(reference)) / 3_600_000;
  if (ageHours < -5 / 60 || ageHours > maximumRuntimeAgeHours) {
    throw new Error('Candidate G rollback source runtime is not fresh enough for activation');
  }
  assertIntegratedBinding(
    full.coastalParts?.modelBinding,
    'Candidate G rollback integrated source binding',
  );
  if (!same(full.coastalParts.modelBinding, integratedModelBinding())) {
    throw new Error('Candidate G rollback source is not the exact integrated model');
  }
  const envelope = full.ravScoreCandidateGRollback;
  exactKeys(envelope, [
    'schemaVersion',
    'kind',
    'privacyClass',
    'sourceModelBinding',
    'rollbackModelBinding',
    'rollbackId',
    'automaticActivationAllowed',
    'publicDuringNormalOperation',
    'runtime',
  ], 'Candidate G private rollback envelope');
  if (envelope.schemaVersion !== '1.0.0'
    || envelope.kind !== 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME'
    || envelope.privacyClass !== 'PRIVATE_PRODUCTION_RUNTIME'
    || envelope.rollbackId !== CANDIDATE_G_OPERATIONAL_ROLLBACK_ID
    || envelope.automaticActivationAllowed !== false
    || envelope.publicDuringNormalOperation !== false
    || !same(envelope.sourceModelBinding, integratedModelBinding())
    || !same(envelope.rollbackModelBinding, candidateModelBinding())) {
    throw new Error('Candidate G private rollback envelope is incompatible');
  }
  assertCandidateBinding(envelope.rollbackModelBinding, 'Candidate G rollback binding');
  const runtime = envelope.runtime;
  assertRavScoreVerifiedEvidenceTrust(
    runtime?.evidenceTrust,
    'Candidate G rollback evidence trust',
  );
  if (!isPlainObject(runtime)
    || !same(runtime.modelBinding, candidateModelBinding())
    || runtime.enabled !== true
    || runtime.expectedPartCount !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.expectedPartCount
    || runtime.scoredPartCount !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.expectedPartCount
    || runtime.scoreAvailability?.allZonesActive !== true
    || runtime.scoreAvailability?.totalZoneCount
      !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.expectedZoneCount
    || runtime.scoreAvailability?.unavailableZoneCount !== 0
    || !isPlainObject(runtime.parts)
    || Object.keys(runtime.parts).length
      !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.expectedPartCount
    || !isPlainObject(runtime.zones)
    || Object.keys(runtime.zones).length
      !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.expectedZoneCount) {
    throw new Error('Candidate G rollback runtime lacks exact national 210/673 readiness');
  }
  if (!same(Object.keys(runtime.zones).sort(), Object.keys(full.zones ?? {}).sort())) {
    throw new Error('Candidate G rollback runtime and private weather have different zones');
  }
  const seenParts = new Set();
  for (const [partId, part] of Object.entries(runtime.parts)) {
    if (!isPlainObject(part)
      || typeof part.zoneId !== 'string'
      || !Object.hasOwn(runtime.zones, part.zoneId)
      || seenParts.has(partId)) {
      throw new Error('Candidate G rollback part inventory is inconsistent');
    }
    seenParts.add(partId);
    assertState(part.ravScoreModel?.currentState, partId);
    for (const mode of ['waders', 'beach']) {
      assertPublicMode(part.current?.[mode], `Candidate G ${mode} for ${partId}`,
        candidateModelBinding());
    }
  }
  for (const [zoneId, zone] of Object.entries(runtime.zones)) {
    if (!Array.isArray(zone?.hourly) || zone.hourly.length < 1) {
      throw new Error(`Candidate G rollback zone ${zoneId} has no forecast`);
    }
    for (const row of zone.hourly) {
      canonicalTime(row?.time, `Candidate G rollback forecast time for ${zoneId}`);
      for (const mode of ['waders', 'beach']) {
        assertPublicMode(row?.[mode], `Candidate G ${mode} for ${zoneId}/${row?.time}`,
          candidateModelBinding());
      }
    }
  }
  assertNoRawVectors(runtime, 'Candidate G private rollback runtime');
  return { runtime, productionReferenceAt: reference };
}

export function prepareCandidateGOperationalRollback(full, {
  expectedDatasetId,
  sourceHead,
  mode = CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.dryRunMode,
  eventName = null,
  ref = null,
  githubSha = null,
  confirmation = null,
  privateBundleContentSha256,
  sourceImplementationClosureSha256,
  requestedImplementationClosureSha256,
  centralExpectedVersion,
  sourceModel = 'integrated',
  now = new Date().toISOString(),
  maximumRuntimeAgeHours = CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.maximumRuntimeAgeHours,
} = {}) {
  assertCandidateGRollbackBinding();
  const resolvedMode = assertManualMode({
    mode,
    sourceHead,
    eventName,
    ref,
    githubSha,
    confirmation,
  });
  if (!SHA256_PATTERN.test(String(privateBundleContentSha256 ?? ''))) {
    throw new Error('Candidate G rollback requires the verified private bundle digest');
  }
  if (!SHA256_PATTERN.test(String(sourceImplementationClosureSha256 ?? ''))
    || !SHA256_PATTERN.test(String(requestedImplementationClosureSha256 ?? ''))) {
    throw new Error('Candidate G rollback requires exact sealed source/target implementation closures');
  }
  if (!Number.isSafeInteger(Number(centralExpectedVersion))
    || Number(centralExpectedVersion) < 0) {
    throw new Error('Candidate G rollback requires an exact central CAS version');
  }
  if (!['integrated', 'candidate-g'].includes(sourceModel)
    || (resolvedMode === CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.executeMode
      && sourceModel !== 'integrated')) {
    throw new Error('Candidate G rollback source model is incompatible with its mode');
  }
  if (RAVSCORE_CALIBRATION_ELIGIBLE !== false) {
    throw new Error('Candidate G rollback must never be calibration eligible');
  }
  const validated = validateRollbackEnvelope(full, {
    expectedDatasetId,
    expectedSourceHead: sourceHead,
    now,
    maximumRuntimeAgeHours,
  });
  const activation = {
    schemaVersion: CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.schemaVersion,
    kind: CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.kind,
    mode: resolvedMode,
    sourceHead,
    datasetId: full.datasetId,
    productionReferenceAt: validated.productionReferenceAt,
    privateBundleContentSha256,
    sourceImplementationClosureSha256,
    requestedImplementationClosureSha256,
    centralExpectedVersion: Number(centralExpectedVersion),
    sourceModelBinding: sourceModel === 'candidate-g'
      ? candidateModelBinding() : integratedModelBinding(),
    activeModelBinding: candidateModelBinding(),
    rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
    automaticActivationAllowed: false,
    schedulerActivationAllowed: false,
    calibrationEligible: false,
  };
  const candidateFull = structuredClone(full);
  delete candidateFull.ravScoreCandidateGRollback;
  candidateFull.coastalParts = structuredClone(validated.runtime);
  candidateFull.ravScoreOperationalActivation = {
    ...activation,
    planSha256: sha256(activation),
  };
  return Object.freeze({
    candidateFull,
    plan: Object.freeze({
      ...activation,
      planSha256: sha256(activation),
      candidateFullSha256: sha256(candidateFull),
      privatePayloadLogged: false,
    }),
  });
}

const PREPARED_ACTIVATION_FIELDS = Object.freeze([
  'schemaVersion',
  'kind',
  'mode',
  'sourceHead',
  'datasetId',
  'productionReferenceAt',
  'privateBundleContentSha256',
  'sourceImplementationClosureSha256',
  'requestedImplementationClosureSha256',
  'centralExpectedVersion',
  'sourceModelBinding',
  'activeModelBinding',
  'rollbackId',
  'automaticActivationAllowed',
  'schedulerActivationAllowed',
  'calibrationEligible',
]);

/**
 * Revalidates the sealed hand-off between private rollback preparation and an
 * isolated public staging directory. It deliberately accepts both dry-run and
 * execute plans: authorization is enforced while the plan is created, while
 * this boundary proves that no byte or model binding changed afterwards.
 */
export function assertPreparedCandidateGOperationalRollback(candidateFull, plan, {
  expectedMode = null,
  expectedSourceHead = null,
  expectedDatasetId = null,
} = {}) {
  exactKeys(plan, [
    ...PREPARED_ACTIVATION_FIELDS,
    'planSha256',
    'candidateFullSha256',
    'privatePayloadLogged',
  ], 'Candidate G sealed rollback plan');
  const {
    planSha256,
    candidateFullSha256,
    privatePayloadLogged,
    ...activation
  } = plan;
  exactKeys(activation, PREPARED_ACTIVATION_FIELDS, 'Candidate G rollback activation');
  if (!SHA256_PATTERN.test(String(planSha256 ?? ''))
    || !SHA256_PATTERN.test(String(candidateFullSha256 ?? ''))
    || planSha256 !== sha256(activation)
    || privatePayloadLogged !== false) {
    throw new Error('Candidate G rollback plan seal is incompatible');
  }
  if (!isPlainObject(candidateFull)
    || candidateFull.ravScoreCandidateGRollback !== undefined
    || candidateFull.datasetId !== activation.datasetId
    || candidateFull.productionReferenceAt !== activation.productionReferenceAt
    || candidateFullSha256 !== sha256(candidateFull)) {
    throw new Error('Candidate G rollback candidate-full seal is incompatible');
  }
  exactKeys(candidateFull.ravScoreOperationalActivation, [
    ...PREPARED_ACTIVATION_FIELDS,
    'planSha256',
  ], 'Candidate G embedded activation');
  if (!same(candidateFull.ravScoreOperationalActivation, {
    ...activation,
    planSha256,
  })) {
    throw new Error('Candidate G embedded activation differs from the sealed plan');
  }
  if (![CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.dryRunMode,
    CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.executeMode].includes(activation.mode)
    || (expectedMode !== null && activation.mode !== expectedMode)
    || (expectedSourceHead !== null && activation.sourceHead !== expectedSourceHead)
    || (expectedDatasetId !== null && activation.datasetId !== expectedDatasetId)
    || !SOURCE_HEAD_PATTERN.test(String(activation.sourceHead ?? ''))
    || !DATASET_ID_PATTERN.test(String(activation.datasetId ?? ''))
    || !validTimeForPreparedPlan(activation.productionReferenceAt)
    || !SHA256_PATTERN.test(String(activation.privateBundleContentSha256 ?? ''))
    || !SHA256_PATTERN.test(String(activation.sourceImplementationClosureSha256 ?? ''))
    || !SHA256_PATTERN.test(String(activation.requestedImplementationClosureSha256 ?? ''))
    || !Number.isSafeInteger(Number(activation.centralExpectedVersion))
    || Number(activation.centralExpectedVersion) < 0
    || activation.schemaVersion !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.schemaVersion
    || activation.kind !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.kind
    || activation.rollbackId !== CANDIDATE_G_OPERATIONAL_ROLLBACK_ID
    || activation.automaticActivationAllowed !== false
    || activation.schedulerActivationAllowed !== false
    || activation.calibrationEligible !== false) {
    throw new Error('Candidate G rollback activation semantics are incompatible');
  }
  const sourceModel = activation.sourceModelBinding?.modelId === candidateModelBinding().modelId
    ? 'candidate-g' : 'integrated';
  if (activation.mode === CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.executeMode
    && sourceModel !== 'integrated') {
    throw new Error('Candidate G execute plan may only begin from integrated');
  }
  if (sourceModel === 'candidate-g') {
    assertCandidateBinding(activation.sourceModelBinding, 'Candidate G refresh source model binding');
  } else {
    assertIntegratedBinding(activation.sourceModelBinding, 'Candidate G source model binding');
  }
  assertCandidateBinding(activation.activeModelBinding, 'Candidate G active model binding');
  if (!same(activation.sourceModelBinding, sourceModel === 'candidate-g'
    ? candidateModelBinding() : integratedModelBinding())
    || !same(activation.activeModelBinding, candidateModelBinding())) {
    throw new Error('Candidate G rollback activation has a mixed model binding');
  }

  const runtime = candidateFull.coastalParts;
  if (!isPlainObject(runtime)
    || !same(runtime.modelBinding, candidateModelBinding())
    || !isPlainObject(runtime.parts)
    || Object.keys(runtime.parts).length
      !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.expectedPartCount
    || !isPlainObject(runtime.zones)
    || Object.keys(runtime.zones).length
      !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.expectedZoneCount
    || runtime.enabled !== true
    || runtime.expectedPartCount !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.expectedPartCount
    || runtime.scoredPartCount !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.expectedPartCount
    || runtime.scoreAvailability?.allZonesActive !== true
    || runtime.scoreAvailability?.totalZoneCount
      !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.expectedZoneCount
    || runtime.scoreAvailability?.unavailableZoneCount !== 0) {
    throw new Error('Candidate G staged runtime lacks exact national 210/673 readiness');
  }
  assertCandidateBinding(runtime.modelBinding, 'Candidate G staged runtime binding');
  const profile = runtime.scoreProfile;
  if (!isPlainObject(profile)
    || profile.activeProfileId !== activation.activeModelBinding.modelId
    || profile.requestedProfileId !== activation.activeModelBinding.modelId
    || profile.stateSchemaVersion !== activation.activeModelBinding.stateSchemaVersion
    || profile.variantId !== activation.activeModelBinding.variantId
    || profile.profileId !== activation.activeModelBinding.profileId
    || profile.componentSchemaId !== activation.activeModelBinding.componentSchemaId
    || profile.explanationSchemaId !== activation.activeModelBinding.explanationSchemaId
    || profile.presentationPolicyId !== activation.activeModelBinding.presentationPolicyId
    || profile.modelContractSha256 !== activation.activeModelBinding.modelContractSha256
    || profile.modelBundleSha256 !== activation.activeModelBinding.modelBundleSha256
    || profile.runtimeFallbackModelId !== null
    || profile.crossModelRuntimeFallbackAllowed !== false
    || profile.automaticActivationAllowed !== false
    || profile.modelCoverageReady !== true
    || profile.modelMemoryReady !== true
    || profile.modelMigrationReady !== true) {
    throw new Error('Candidate G staged score profile is incompatible');
  }
  for (const [partId, part] of Object.entries(runtime.parts)) {
    assertState(part?.ravScoreModel?.currentState, partId);
    for (const mode of ['waders', 'beach']) {
      assertPublicMode(part?.current?.[mode], `Candidate G staged ${mode} for ${partId}`,
        activation.activeModelBinding);
    }
  }
  for (const [zoneId, zone] of Object.entries(runtime.zones)) {
    if (!Array.isArray(zone?.hourly) || zone.hourly.length < 1) {
      throw new Error(`Candidate G staged zone ${zoneId} has no forecast`);
    }
    for (const row of zone.hourly) {
      canonicalTime(row?.time, `Candidate G staged forecast time for ${zoneId}`);
      for (const mode of ['waders', 'beach']) {
        assertPublicMode(row?.[mode], `Candidate G staged ${mode} for ${zoneId}/${row?.time}`,
          activation.activeModelBinding);
      }
    }
  }
  assertNoRawVectors(candidateFull, 'Candidate G staged private runtime');
  return true;
}

function validTimeForPreparedPlan(value) {
  try {
    canonicalTime(value, 'Candidate G rollback production reference');
    return true;
  } catch {
    return false;
  }
}

async function atomicWriteJson(file, value) {
  const destination = path.resolve(file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value)}\n`, { flag: 'wx', mode: 0o600 });
    await fs.rename(temporary, destination);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function parseArguments(argv) {
  const result = {
    mode: CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.dryRunMode,
    sourceModel: 'integrated',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`);
    if (argument === '--input') result.input = value;
    else if (argument === '--output') result.output = value;
    else if (argument === '--plan') result.plan = value;
    else if (argument === '--mode') result.mode = value;
    else if (argument === '--source-model') result.sourceModel = value;
    else if (argument === '--expected-dataset-id') result.expectedDatasetId = value;
    else if (argument === '--source-head') result.sourceHead = value;
    else if (argument === '--private-bundle-sha256') result.privateBundleContentSha256 = value;
    else if (argument === '--source-implementation-closure-sha256') {
      result.sourceImplementationClosureSha256 = value;
    } else if (argument === '--requested-implementation-closure-sha256') {
      result.requestedImplementationClosureSha256 = value;
    }
    else if (argument === '--central-expected-version') result.centralExpectedVersion = Number(value);
    else if (argument === '--now') result.now = value;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  for (const key of ['input', 'output', 'plan', 'expectedDatasetId', 'sourceHead',
    'privateBundleContentSha256', 'sourceImplementationClosureSha256',
    'requestedImplementationClosureSha256', 'centralExpectedVersion']) {
    if (result[key] === undefined || result[key] === null || result[key] === '') {
      throw new Error(`Candidate G rollback preparation requires ${key}`);
    }
  }
  return result;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  let full;
  try {
    full = JSON.parse(await fs.readFile(options.input, 'utf8'));
  } catch {
    throw new Error('Candidate G rollback private input cannot be parsed');
  }
  const prepared = prepareCandidateGOperationalRollback(full, {
    ...options,
    eventName: process.env.GITHUB_EVENT_NAME ?? null,
    ref: process.env.GITHUB_REF ?? null,
    githubSha: process.env.GITHUB_SHA ?? null,
    confirmation: process.env.RAVRADAR_CANDIDATE_G_ROLLBACK_CONFIRMATION ?? null,
  });
  await atomicWriteJson(options.output, prepared.candidateFull);
  await atomicWriteJson(options.plan, prepared.plan);
  console.log(JSON.stringify({
    status: options.mode === CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.executeMode
      ? 'candidate-g-rollback-execute-plan-ready'
      : 'candidate-g-rollback-dry-run-ready',
    zoneCount: Object.keys(prepared.candidateFull.coastalParts.zones).length,
    partCount: Object.keys(prepared.candidateFull.coastalParts.parts).length,
    privatePayloadLogged: false,
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`Candidate G operational rollback preparation failed closed: ${error.message}`);
    process.exitCode = 1;
  });
}
