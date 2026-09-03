#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RAVSCORE_CALIBRATION_ELIGIBLE,
  RAVSCORE_MODEL_ID,
  RAVSCORE_ROLLBACK_ID,
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from './rollback-assets/ravscore-model-contract.js';
import {
  assertPublicRuntimePrivacy,
  buildPublicConditionDetails,
  buildPublicConditions,
  buildPublicManifest,
  compactJson,
  sha256Text,
} from './public-conditions-lib.mjs';
import {
  RAVSCORE_PUBLIC_DETAILS_KIND,
  RAVSCORE_PUBLIC_STARTUP_KIND,
  assertPublicRuntimeEnvelope,
  assertPublicRuntimeManifest,
  canonicalPublicRuntimeJson,
  publicRuntimeDocumentBody,
} from '../js/core/ravscore-public-runtime-contract.js';
import {
  assertExactPublicRavScoreProfile,
} from '../js/core/ravscore-public-profile-contract.js';

export const CANDIDATE_G_PUBLIC_ROLLBACK_AUDIT_SCHEMA =
  'candidate-g-operational-rollback-public-audit-v1';
const CANDIDATE_G_ROLLBACK_STAGE_SCHEMA =
  'candidate-g-operational-rollback-stage-v2';
const CANDIDATE_G_ROLLBACK_STAGE_MARKER =
  '.cache/candidate-g-operational-rollback/stage.json';

const EXPECTED_ZONES = 210;
const EXPECTED_PARTS = 673;
const MODES = Object.freeze(['waders', 'beach']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const FORBIDDEN_PUBLIC_KEY = /^(?:candidateG|ravScoreModel|ravScoreState|currentState|continuationState|stateKey|samplingContextKey|transportEvidence|currentEvidence|waveEvidence|rawPayload|privatePayload|privateDiagnostic|ravScoreOperationalActivation|ravScoreCandidateGRollback|ravScoreCandidateGWarmup)$/i;
const FORBIDDEN_VECTOR_KEY = /^(?:current)?[uv](?:mps)?$/i;
const PLAN_FIELDS = Object.freeze([
  'schemaVersion', 'kind', 'mode', 'sourceHead', 'datasetId', 'productionReferenceAt',
  'privateBundleContentSha256', 'sourceImplementationClosureSha256',
  'requestedImplementationClosureSha256', 'centralExpectedVersion', 'sourceModelBinding',
  'activeModelBinding', 'candidateTargetProfileSha256', 'candidateTargetProfile',
  'rollbackId', 'automaticActivationAllowed',
  'schedulerActivationAllowed', 'calibrationEligible', 'planSha256',
  'candidateFullSha256', 'privatePayloadLogged',
]);
const MODEL_BINDING_FIELDS = Object.freeze([
  'modelId', 'stateSchemaVersion', 'variantId', 'profileId', 'componentSchemaId',
  'explanationSchemaId', 'rankingPolicyId', 'bestTimePolicyId',
  'presentationPolicyId', 'modelContractSha256', 'modelBundleSha256',
]);
const CANDIDATE_TARGET_PROFILE_FIELDS = Object.freeze([
  'schemaVersion', 'sourceVersion', 'switchVersion', 'requestedProfileId',
  'activeModelId', 'stateSchemaVersion', 'variantId', 'profileId',
  'componentSchemaId', 'explanationSchemaId', 'rankingPolicyId',
  'bestTimePolicyId', 'presentationPolicyId', 'modelContractSha256',
  'modelBundleSha256', 'rollbackModelId', 'runtimeFallbackModelId',
  'modelActivationEnabled', 'automaticActivationAllowed',
  'publicAvailabilityPolicy', 'crossModelRuntimeFallbackAllowed',
  'migrationRequiredAtFirstCutover', 'status', 'activationAuthority', 'evidence',
]);
const TARGET_PROFILE_EVIDENCE_FIELDS = Object.freeze([
  'decisionId', 'exactHeadValidationRequired', 'freshProductionValidationRequired',
]);
const STAGE_MARKER_FIELDS = Object.freeze([
  'schemaVersion', 'kind', 'mode', 'sourceHead', 'datasetId',
  'productionReferenceAt', 'planSha256', 'candidateFullSha256',
  'privateBundleContentSha256', 'sourceImplementationClosureSha256',
  'requestedImplementationClosureSha256', 'candidateTargetProfileSha256',
  'modelBinding', 'automaticActivationAllowed', 'schedulerActivationAllowed',
  'publicArtifactReady', 'installed',
]);
const INSTALLED_MARKER_FIELDS = Object.freeze(['path', 'sha256', 'privacyClass']);

const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const binding = () => ravScoreModelBinding();
const canonicalSha256 = value => sha256Text(JSON.stringify(canonical(value)));

function exactKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function assertExactCandidateBinding(value, label) {
  assertRavScoreModelBinding(value, label);
  if (!same(value, binding())) throw new Error(`${label} is not the exact Candidate G bundle`);
}

function assertSealedSourceBinding(value, targetProfile, mode) {
  if (!exactKeys(value, MODEL_BINDING_FIELDS)
    || MODEL_BINDING_FIELDS.slice(0, 9)
      .some(field => !SAFE_ID_PATTERN.test(String(value?.[field] ?? '')))
    || !SHA256_PATTERN.test(String(value?.modelContractSha256 ?? ''))
    || !SHA256_PATTERN.test(String(value?.modelBundleSha256 ?? ''))
    || ![RAVSCORE_MODEL_ID, targetProfile?.rollbackModelId].includes(value.modelId)
    || (mode === 'execute' && value.modelId !== targetProfile?.rollbackModelId)) {
    throw new Error('Candidate G sealed source binding is incompatible');
  }
}

function assertSealedCandidateTargetProfile(profile, profileSha256, sourceBinding, mode) {
  const expectedBinding = binding();
  const evidence = profile?.evidence;
  if (!exactKeys(profile, CANDIDATE_TARGET_PROFILE_FIELDS)
    || !exactKeys(evidence, TARGET_PROFILE_EVIDENCE_FIELDS)
    || !SHA256_PATTERN.test(String(profileSha256 ?? ''))
    || canonicalSha256(profile) !== profileSha256
    || profile.schemaVersion !== '3.0.0'
    || !/^\d+\.\d+\.\d+$/.test(String(profile.sourceVersion ?? ''))
    || profile.switchVersion !== 'RAVSCORE-PROFILE-SWITCH-CANDIDATE-G-ROLLBACK-1.0.0'
    || profile.requestedProfileId !== expectedBinding.modelId
    || profile.activeModelId !== expectedBinding.modelId
    || MODEL_BINDING_FIELDS.slice(1).some(field => profile[field] !== expectedBinding[field])
    || !SAFE_ID_PATTERN.test(String(profile.rollbackModelId ?? ''))
    || profile.rollbackModelId === expectedBinding.modelId
    || profile.runtimeFallbackModelId !== null
    || profile.modelActivationEnabled !== true
    || profile.automaticActivationAllowed !== false
    || profile.publicAvailabilityPolicy !== 'candidate-g-local-fail-closed'
    || profile.crossModelRuntimeFallbackAllowed !== false
    || profile.migrationRequiredAtFirstCutover !== false
    || profile.status !== 'owner-approved-candidate-g-rollback-only-local-fail-closed'
    || profile.activationAuthority !== 'DEC-0110-manual-candidate-g-rollback'
    || evidence.decisionId !== 'DEC-0110'
    || evidence.exactHeadValidationRequired !== true
    || evidence.freshProductionValidationRequired !== true) {
    throw new Error('Candidate G sealed target central profile is incompatible');
  }
  assertSealedSourceBinding(sourceBinding, profile, mode);
}

export function assertCandidateGRollbackPublicScore(value,
  label = 'Candidate G public score') {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || value.available !== true
    || typeof value.score !== 'number'
    || !Number.isFinite(value.score)
    || value.score < 0
    || value.score > 100
    || value.scoreProfileId !== RAVSCORE_MODEL_ID
    || !value.components || typeof value.components !== 'object'
    || Array.isArray(value.components)
    || JSON.stringify(Object.keys(value.components).sort())
      !== JSON.stringify(['huntability', 'release', 'transport'])
    || !['huntability', 'transport', 'release'].every(key =>
      typeof value.components[key] === 'number'
      && Number.isFinite(value.components[key])
      && value.components[key] >= 0
      && value.components[key] <= 100)) {
    throw new Error(`${label} is not an available Candidate G score`);
  }
  assertExactCandidateBinding(value.modelBinding, `${label} model binding`);
  if (value.explanation) {
    const projected = Object.fromEntries(Object.keys(binding()).map(key =>
      [key, value.explanation?.[key]]));
    assertExactCandidateBinding(projected, `${label} explanation binding`);
  }
}

const assertPublicScore = assertCandidateGRollbackPublicScore;

function assertSealedStageInput(candidateFull, plan, {
  expectedSourceHead,
  expectedDatasetId,
  expectedZoneCount,
  expectedPartCount,
} = {}) {
  if (!exactKeys(plan, PLAN_FIELDS)) throw new Error('Candidate G sealed plan field set is incompatible');
  const {
    planSha256,
    candidateFullSha256,
    privatePayloadLogged,
    candidateTargetProfile,
    ...activation
  } = plan;
  if (!SHA256_PATTERN.test(String(planSha256 ?? ''))
    || !SHA256_PATTERN.test(String(candidateFullSha256 ?? ''))
    || !SHA256_PATTERN.test(String(plan.sourceImplementationClosureSha256 ?? ''))
    || !SHA256_PATTERN.test(String(plan.requestedImplementationClosureSha256 ?? ''))
    || canonicalSha256({ ...activation, candidateTargetProfile }) !== planSha256
    || canonicalSha256(candidateFull) !== candidateFullSha256
    || privatePayloadLogged !== false
    || plan.sourceHead !== expectedSourceHead
    || plan.datasetId !== expectedDatasetId
    || !/^[a-f0-9]{40}$/.test(String(plan.sourceHead ?? ''))
    || !['dry-run', 'execute'].includes(plan.mode)
    || plan.schemaVersion !== '1.0.0'
    || plan.kind !== 'RAVSCORE_CANDIDATE_G_OPERATIONAL_ROLLBACK_PLAN'
    || plan.rollbackId !== RAVSCORE_ROLLBACK_ID
    || plan.automaticActivationAllowed !== false
    || plan.schedulerActivationAllowed !== false
    || plan.calibrationEligible !== false) {
    throw new Error('Candidate G sealed plan semantics or digest is incompatible');
  }
  assertSealedCandidateTargetProfile(
    candidateTargetProfile,
    activation.candidateTargetProfileSha256,
    activation.sourceModelBinding,
    activation.mode,
  );
  assertExactCandidateBinding(plan.activeModelBinding, 'Candidate G sealed active binding');
  const embeddedFields = PLAN_FIELDS.filter(key => ![
    'candidateFullSha256', 'privatePayloadLogged', 'candidateTargetProfile',
  ].includes(key));
  if (!candidateFull || candidateFull.ravScoreCandidateGRollback !== undefined
    || candidateFull.ravScoreCandidateGWarmup !== undefined
    || candidateFull.datasetId !== plan.datasetId
    || candidateFull.productionReferenceAt !== plan.productionReferenceAt
    || !exactKeys(candidateFull.ravScoreOperationalActivation, embeddedFields)
    || !same(candidateFull.ravScoreOperationalActivation, {
      ...activation,
      planSha256,
    })) {
    throw new Error('Candidate G staged input is not the exact sealed candidate');
  }
  const runtime = candidateFull.coastalParts;
  if (!runtime || runtime.enabled !== true
    || runtime.expectedPartCount !== expectedPartCount
    || runtime.scoredPartCount !== expectedPartCount
    || Object.keys(runtime.parts ?? {}).length !== expectedPartCount
    || Object.keys(runtime.zones ?? {}).length !== expectedZoneCount
    || runtime.scoreAvailability?.allZonesActive !== true
    || runtime.scoreAvailability?.activeZoneCount !== expectedZoneCount
    || runtime.scoreAvailability?.totalZoneCount !== expectedZoneCount
    || runtime.scoreAvailability?.unavailableZoneCount !== 0) {
    throw new Error('Candidate G sealed stage input lacks national 210/673 readiness');
  }
  assertExactCandidateBinding(runtime.modelBinding, 'Candidate G sealed runtime binding');
}

function scanPublicModelClosure(value, {
  sourceModelId,
  label,
  pathPrefix = label,
} = {}) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPublicModelClosure(item, {
      sourceModelId,
      label,
      pathPrefix: `${pathPrefix}[${index}]`,
    }));
    return;
  }
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && value === sourceModelId) {
      throw new Error(`${label} contains the retired integrated model id`);
    }
    return;
  }
  if (value.modelBinding !== undefined) {
    assertExactCandidateBinding(value.modelBinding, `${pathPrefix}.modelBinding`);
  }
  if (value.ravScoreModelBinding !== undefined) {
    assertExactCandidateBinding(value.ravScoreModelBinding,
      `${pathPrefix}.ravScoreModelBinding`);
  }
  const expectedKeys = Object.keys(binding());
  if (expectedKeys.every(key => Object.hasOwn(value, key))) {
    assertExactCandidateBinding(Object.fromEntries(expectedKeys.map(key => [key, value[key]])),
      `${pathPrefix} embedded binding`);
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_PUBLIC_KEY.test(key) || FORBIDDEN_VECTOR_KEY.test(key)) {
      throw new Error(`${label} contains forbidden private field ${pathPrefix}.${key}`);
    }
    if (['modelId', 'modelVersion', 'scoreProfileId'].includes(key)
      && typeof nested === 'string'
      && nested !== RAVSCORE_MODEL_ID) {
      throw new Error(`${label} contains another score model at ${pathPrefix}.${key}`);
    }
    scanPublicModelClosure(nested, {
      sourceModelId,
      label,
      pathPrefix: `${pathPrefix}.${key}`,
    });
  }
}

function assertRuntimeEnvelope(document, {
  kind,
  datasetId,
  productionReferenceAt,
  label,
} = {}) {
  assertPublicRuntimeEnvelope(document, {
    kind,
    datasetId,
    productionReferenceAt,
    modelBinding: binding(),
    label,
  });
  const envelope = document.ravScoreRuntime;
  assertExactCandidateBinding(envelope.modelBinding, `${label} runtime binding`);
  const bodySha = sha256Text(canonicalPublicRuntimeJson(publicRuntimeDocumentBody(document)));
  if (!SHA256_PATTERN.test(String(envelope.payloadBodySha256 ?? ''))
    || envelope.payloadBodySha256 !== bodySha) {
    throw new Error(`${label} body hash is incompatible`);
  }
}

function assertScoreProfile(profile, expectedBinding, label) {
  assertExactPublicRavScoreProfile(profile, expectedBinding, label);
  if (profile.switchVersion !== 'RAVSCORE-OPERATIONAL-ROLLBACK-DEC-0110-V2'
    || profile.rollbackModelId !== null
    || profile.runtimeFallbackModelId !== null
    || profile.crossModelRuntimeFallbackAllowed !== false
    || profile.automaticActivationAllowed !== false
    || profile.memoryReferenceScope !== 'CURRENT_COMMON_ZONE_REFERENCE'
    || profile.activationState !== 'manual-candidate-g-only-local-fail-closed'
    || profile.publicAvailabilityPolicy !== 'candidate-g-local-fail-closed'
    || profile.modelCoverageReady !== true
    || profile.modelMemoryReady !== true
    || profile.modelMigrationReady !== true) {
    throw new Error(`${label} is not the exact ready Candidate G profile`);
  }
}

async function atomicWriteJson(file, value) {
  const destination = path.resolve(file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}-${crypto.randomBytes(5).toString('hex')}`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value)}\n`, { flag: 'wx', mode: 0o600 });
    await fs.rename(temporary, destination);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

export async function auditCandidateGRollbackPublicRuntime({
  candidateFull,
  plan,
  startup,
  startupText,
  details,
  detailsText,
  manifest,
  manifestText,
  coastalParts,
  coastalPartsText,
  zoneRegistry,
  zoneRegistryText,
  stageMarker,
  expectedSourceHead,
  expectedDatasetId,
  expectedZoneCount = EXPECTED_ZONES,
  expectedPartCount = EXPECTED_PARTS,
} = {}) {
  assertSealedStageInput(candidateFull, plan, {
    expectedSourceHead,
    expectedDatasetId,
    expectedZoneCount,
    expectedPartCount,
  });
  if (RAVSCORE_CALIBRATION_ELIGIBLE !== false) {
    throw new Error('Candidate G public rollback must remain calibration-ineligible');
  }
  const expectedBinding = binding();
  if (!exactKeys(stageMarker, STAGE_MARKER_FIELDS)
    || stageMarker.schemaVersion !== CANDIDATE_G_ROLLBACK_STAGE_SCHEMA
    || stageMarker.kind !== 'CANDIDATE_G_OPERATIONAL_ROLLBACK_ISOLATED_STAGE'
    || stageMarker.mode !== plan.mode
    || stageMarker.sourceHead !== plan.sourceHead
    || stageMarker.datasetId !== plan.datasetId
    || stageMarker.planSha256 !== plan.planSha256
    || stageMarker.candidateFullSha256 !== plan.candidateFullSha256
    || stageMarker.privateBundleContentSha256 !== plan.privateBundleContentSha256
    || stageMarker.sourceImplementationClosureSha256
      !== plan.sourceImplementationClosureSha256
    || stageMarker.requestedImplementationClosureSha256
      !== plan.requestedImplementationClosureSha256
    || stageMarker.candidateTargetProfileSha256 !== plan.candidateTargetProfileSha256
    || !SHA256_PATTERN.test(String(stageMarker.candidateTargetProfileSha256 ?? ''))
    || stageMarker.productionReferenceAt !== plan.productionReferenceAt
    || stageMarker.automaticActivationAllowed !== false
    || stageMarker.schedulerActivationAllowed !== false
    || stageMarker.publicArtifactReady !== false) {
    throw new Error('Candidate G isolated stage marker is incompatible');
  }
  assertExactCandidateBinding(stageMarker.modelBinding, 'Candidate G stage marker binding');

  const expectedInstalled = new Map([
    ['data/live/conditions.json', 'PRIVATE_STAGE_INPUT'],
    ['js/core/ravscore-model-contract.js', 'PUBLIC_MODEL_IMPLEMENTATION'],
    ['js/core/ravscore-model-bundle.generated.js', 'PUBLIC_MODEL_IMPLEMENTATION'],
  ]);
  if (!Array.isArray(stageMarker.installed)
    || stageMarker.installed.length !== expectedInstalled.size
    || stageMarker.installed.some(item => !exactKeys(item, INSTALLED_MARKER_FIELDS)
      || !expectedInstalled.has(item.path)
      || expectedInstalled.get(item.path) !== item.privacyClass
      || !SHA256_PATTERN.test(String(item.sha256 ?? '')))
    || new Set(stageMarker.installed.map(item => item.path)).size !== expectedInstalled.size) {
    throw new Error('Candidate G isolated stage installed-file seal is incompatible');
  }
  const installedByPath = new Map(stageMarker.installed.map(item => [item.path, item]));
  const rollbackContractText = await fs.readFile(
    fileURLToPath(new URL('./rollback-assets/ravscore-model-contract.js', import.meta.url)), 'utf8');
  const rollbackBundleText = await fs.readFile(
    fileURLToPath(new URL('./rollback-assets/ravscore-model-bundle.generated.js', import.meta.url)), 'utf8');
  const activeContractText = await fs.readFile(
    fileURLToPath(new URL('../js/core/ravscore-model-contract.js', import.meta.url)), 'utf8');
  const activeBundleText = await fs.readFile(
    fileURLToPath(new URL('../js/core/ravscore-model-bundle.generated.js', import.meta.url)), 'utf8');
  for (const [relative, text] of [
    ['data/live/conditions.json', `${JSON.stringify(candidateFull)}\n`],
    ['js/core/ravscore-model-contract.js', rollbackContractText],
    ['js/core/ravscore-model-bundle.generated.js', rollbackBundleText],
  ]) {
    if (installedByPath.get(relative)?.sha256 !== sha256Text(text)) {
      throw new Error(`Candidate G isolated stage digest mismatch for ${relative}`);
    }
  }
  if (activeContractText !== rollbackContractText || activeBundleText !== rollbackBundleText) {
    throw new Error('Candidate G isolated stage does not contain the exact active model overlay');
  }

  const expectedStartup = buildPublicConditions(candidateFull);
  const expectedDetails = buildPublicConditionDetails(candidateFull);
  const expectedStartupText = compactJson(expectedStartup);
  const expectedDetailsText = compactJson(expectedDetails);
  const expectedManifest = buildPublicManifest(candidateFull, expectedStartupText,
    expectedDetailsText, coastalPartsText, zoneRegistryText);
  if (startupText !== expectedStartupText || !same(startup, expectedStartup)) {
    throw new Error('Candidate G public startup projection is not canonical');
  }
  if (detailsText !== expectedDetailsText || !same(details, expectedDetails)) {
    throw new Error('Candidate G public detail projection is not canonical');
  }
  if (!same(manifest, expectedManifest)
    || manifestText !== `${JSON.stringify(expectedManifest, null, 2)}\n`) {
    throw new Error('Candidate G public manifest is not canonical');
  }

  assertRuntimeEnvelope(startup, {
    kind: RAVSCORE_PUBLIC_STARTUP_KIND,
    datasetId: plan.datasetId,
    productionReferenceAt: plan.productionReferenceAt,
    label: 'Candidate G startup',
  });
  assertRuntimeEnvelope(details, {
    kind: RAVSCORE_PUBLIC_DETAILS_KIND,
    datasetId: plan.datasetId,
    productionReferenceAt: plan.productionReferenceAt,
    label: 'Candidate G details',
  });
  if (manifest?.schemaVersion !== 4
    || manifest.datasetId !== plan.datasetId
    || manifest.productionReferenceAt !== plan.productionReferenceAt
    || manifest.complete !== true
    || manifest.zoneCount !== expectedZoneCount
    || manifest.coastalPartCount !== expectedPartCount
    || manifest.publicConditionsSha256 !== sha256Text(startupText)
    || manifest.publicConditionsBytes !== Buffer.byteLength(startupText)
    || manifest.publicConditionDetailsSha256 !== sha256Text(detailsText)
    || manifest.publicConditionDetailsBytes !== Buffer.byteLength(detailsText)
    || manifest.coastalPartsSha256 !== sha256Text(coastalPartsText)
    || manifest.coastalPartsBytes !== Buffer.byteLength(coastalPartsText)
    || manifest.zoneRegistrySha256 !== sha256Text(zoneRegistryText)
    || manifest.zoneRegistryBytes !== Buffer.byteLength(zoneRegistryText)) {
    throw new Error('Candidate G public manifest lacks exact dataset/hash/210/673 binding');
  }
  assertExactCandidateBinding(manifest.ravScoreModelBinding,
    'Candidate G public manifest binding');
  assertExactCandidateBinding(manifest.ravScoreRuntime?.modelBinding,
    'Candidate G public manifest runtime binding');
  assertPublicRuntimeManifest(manifest.ravScoreRuntime, {
    modelBinding: expectedBinding,
    startup: {
      payloadBodySha256: startup.ravScoreRuntime.payloadBodySha256,
      fileSha256: manifest.publicConditionsSha256,
      bytes: manifest.publicConditionsBytes,
    },
    details: {
      payloadBodySha256: details.ravScoreRuntime.payloadBodySha256,
      fileSha256: manifest.publicConditionDetailsSha256,
      bytes: manifest.publicConditionDetailsBytes,
    },
    label: 'Candidate G public manifest runtime',
  });
  assertScoreProfile(manifest.ravScoreProfile, expectedBinding,
    'Candidate G manifest score profile');
  if (manifest.ravScoreAvailability?.allZonesActive !== true
    || manifest.ravScoreAvailability?.activeZoneCount !== expectedZoneCount
    || manifest.ravScoreAvailability?.totalZoneCount !== expectedZoneCount
    || manifest.ravScoreAvailability?.unavailableZoneCount !== 0) {
    throw new Error('Candidate G public manifest availability is incomplete');
  }

  if (Object.keys(startup?.zones ?? {}).length !== expectedZoneCount
    || Object.keys(details?.zones ?? {}).length !== expectedZoneCount
    || Object.keys(startup?.coastalParts?.zones ?? {}).length !== expectedZoneCount
    || Object.keys(details?.coastalParts?.zones ?? {}).length !== expectedZoneCount
    || Object.keys(details?.coastalParts?.parts ?? {}).length !== expectedPartCount
    || coastalParts?.zoneCount !== expectedZoneCount
    || coastalParts?.partCount !== expectedPartCount
    || Object.keys(coastalParts?.zones ?? {}).length !== expectedZoneCount) {
    throw new Error('Candidate G public runtime lacks exact national 210/673 coverage');
  }
  assertScoreProfile(startup.coastalParts.scoreProfile, expectedBinding,
    'Candidate G startup score profile');
  assertScoreProfile(details.coastalParts.scoreProfile, expectedBinding,
    'Candidate G detail score profile');
  for (const [partId, part] of Object.entries(details.coastalParts.parts)) {
    for (const mode of MODES) {
      assertPublicScore(part?.current?.[mode], `Candidate G public ${mode} part ${partId}`);
    }
  }
  for (const [zoneId, zone] of Object.entries(details.coastalParts.zones)) {
    if (!Array.isArray(zone?.hourly) || zone.hourly.length < 1) {
      throw new Error(`Candidate G public zone ${zoneId} has no score horizon`);
    }
    for (const row of zone.hourly) for (const mode of MODES) {
      assertPublicScore(row?.[mode], `Candidate G public ${mode} zone ${zoneId}/${row?.time}`);
    }
  }
  const dates = startup?.nationalForecast?.dates;
  if (!Array.isArray(dates) || dates.length !== 5 || new Set(dates).size !== 5) {
    throw new Error('Candidate G public five-day date horizon is incomplete');
  }
  assertExactCandidateBinding(startup.nationalForecast.modelBinding,
    'Candidate G five-day model binding');
  for (const mode of MODES) {
    const days = startup?.nationalForecast?.modes?.[mode];
    if (!Array.isArray(days) || days.length !== 5
      || days.some(day => !dates.includes(day?.date)
        || !Array.isArray(day?.rows)
        || day.rows.length !== Math.min(5, expectedZoneCount))) {
      throw new Error(`Candidate G public five-day ${mode} ranking is incomplete`);
    }
  }

  assertPublicRuntimePrivacy(startup, 'startup');
  assertPublicRuntimePrivacy(details, 'details');
  assertPublicRuntimePrivacy(manifest, 'manifest');
  const retiredSourceModelId = plan.sourceModelBinding.modelId === RAVSCORE_MODEL_ID
    ? null
    : plan.sourceModelBinding.modelId;
  for (const [label, document] of [
    ['startup', startup],
    ['details', details],
    ['manifest', manifest],
  ]) scanPublicModelClosure(document, { sourceModelId: retiredSourceModelId, label });
  if (retiredSourceModelId
    && JSON.stringify([startup, details, manifest]).includes(retiredSourceModelId)) {
    throw new Error('Candidate G public package contains the integrated source model id');
  }
  if (zoneRegistry?.type !== 'FeatureCollection'
    || !Array.isArray(zoneRegistry.features)
    || zoneRegistry.features.length !== manifest.zoneRegistryFeatureCount) {
    throw new Error('Candidate G zone-registry binding is incompatible');
  }

  return Object.freeze({
    schemaVersion: CANDIDATE_G_PUBLIC_ROLLBACK_AUDIT_SCHEMA,
    kind: 'CANDIDATE_G_OPERATIONAL_ROLLBACK_PUBLIC_AUDIT',
    sourceHead: plan.sourceHead,
    datasetId: plan.datasetId,
    productionReferenceAt: plan.productionReferenceAt,
    planSha256: plan.planSha256,
    candidateFullSha256: plan.candidateFullSha256,
    modelBinding: expectedBinding,
    zoneCount: expectedZoneCount,
    coastalPartCount: expectedPartCount,
    publicManifestSha256: sha256Text(manifestText),
    publicConditionsSha256: sha256Text(startupText),
    publicConditionDetailsSha256: sha256Text(detailsText),
    publicArtifactReady: true,
    automaticActivationAllowed: false,
    schedulerActivationAllowed: false,
    calibrationEligible: false,
    privatePayloadLogged: false,
  });
}

function parseArguments(argv) {
  const options = {
    input: 'data/live/conditions.json',
    startup: 'data/live/public-conditions.json',
    details: 'data/live/public-condition-details.json',
    manifest: 'data/live/manifest.json',
    coastalParts: 'data/live/coastal-parts-v2.json',
    zoneRegistry: 'data/zones.geojson',
    stageMarker: CANDIDATE_G_ROLLBACK_STAGE_MARKER,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--') || value === undefined || value.startsWith('--')) {
      throw new Error(`Unknown or valueless Candidate G audit option: ${key}`);
    }
    options[key.slice(2)] = value;
    index += 1;
  }
  for (const key of ['plan', 'output', 'expected-source-head', 'expected-dataset-id']) {
    if (!options[key]) throw new Error(`Candidate G public audit requires --${key}`);
  }
  return options;
}

async function readJsonWithText(file, label) {
  try {
    const text = await fs.readFile(file, 'utf8');
    return { text, value: JSON.parse(text) };
  } catch {
    throw new Error(`${label} cannot be parsed`);
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const [candidateFullFile, planFile, startupFile, detailsFile, manifestFile,
    coastalPartsFile, zoneRegistryFile, markerFile] = await Promise.all([
    readJsonWithText(options.input, 'Candidate G staged private input'),
    readJsonWithText(options.plan, 'Candidate G sealed plan'),
    readJsonWithText(options.startup, 'Candidate G public startup'),
    readJsonWithText(options.details, 'Candidate G public details'),
    readJsonWithText(options.manifest, 'Candidate G public manifest'),
    readJsonWithText(options.coastalParts, 'Candidate G public coastal parts'),
    readJsonWithText(options.zoneRegistry, 'Candidate G public zone registry'),
    readJsonWithText(options.stageMarker, 'Candidate G isolated stage marker'),
  ]);
  const audit = await auditCandidateGRollbackPublicRuntime({
    candidateFull: candidateFullFile.value,
    plan: planFile.value,
    startup: startupFile.value,
    startupText: startupFile.text,
    details: detailsFile.value,
    detailsText: detailsFile.text,
    manifest: manifestFile.value,
    manifestText: manifestFile.text,
    coastalParts: coastalPartsFile.value,
    coastalPartsText: coastalPartsFile.text,
    zoneRegistry: zoneRegistryFile.value,
    zoneRegistryText: zoneRegistryFile.text,
    stageMarker: markerFile.value,
    expectedSourceHead: options['expected-source-head'],
    expectedDatasetId: options['expected-dataset-id'],
  });
  await atomicWriteJson(options.output, audit);
  console.log(JSON.stringify({
    status: 'candidate-g-public-rollback-audit-passed',
    datasetId: audit.datasetId,
    zoneCount: audit.zoneCount,
    coastalPartCount: audit.coastalPartCount,
    privatePayloadLogged: false,
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`Candidate G public rollback audit failed closed: ${error.message}`);
    process.exitCode = 1;
  });
}
