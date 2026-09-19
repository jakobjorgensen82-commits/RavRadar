import crypto from 'node:crypto';
import fs from 'node:fs/promises';

import { ravScoreModelBinding } from '../../js/core/ravscore-model-contract.js';
import {
  PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY,
  canonicalPrivateRuntimeJson,
  privateRuntimeBundleContentSha256,
} from '../private-production-runtime-bundle.mjs';
import {
  RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION,
} from './ravscore-recovery-replay.mjs';

const SHA256 = /^[0-9a-f]{64}$/;
const SOURCE_HEAD = /^[0-9a-f]{40}$/;
const HOUR_MS = 3_600_000;

export const HISTORICAL_WAVE_INPUT_TRANSITION_POLICY = Object.freeze({
  schemaVersion: 1,
  kind: 'RAVRADAR_HISTORICAL_WAVE_INPUT_TRANSITION',
  disposition: 'HISTORICAL_WAVE_INPUT_EXPOSURE_UNRESOLVED',
  sourceDescriptionKind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_CURRENT_SOURCE',
  sourceDescriptionSchemaVersion: '1.0.0',
  sourceHead: '4bee5b0d0909b56a6f66e0f0e961f51321f9d236',
  sourceProductionReferenceAt: '2026-09-19T02:00:00.000Z',
  sourceModelBundleSha256:
    'b114d226425eefd6b7a3c8280fb19982c312f0d88d2f9351c7dc6cbc4ece8c38',
  expectedZoneCount: 210,
  expectedPartCount: 673,
  replayMode: 'genuine-cold-start',
  replayHistoryHours: 48,
});

const isObject = value => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

function exactKeys(value, expected, label) {
  if (!isObject(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label} has an incompatible exact field set`);
  }
}

function canonicalHour(value, label) {
  const milliseconds = Date.parse(value);
  if (typeof value !== 'string'
    || !Number.isFinite(milliseconds)
    || value !== new Date(milliseconds).toISOString()
    || milliseconds % HOUR_MS !== 0) {
    throw new Error(`${label} must be a canonical exact UTC hour`);
  }
  return value;
}

function canonicalTime(value, label) {
  const milliseconds = Date.parse(value);
  if (typeof value !== 'string' || !Number.isFinite(milliseconds)
    || value !== new Date(milliseconds).toISOString()) {
    throw new Error(`${label} must be canonical UTC`);
  }
  return value;
}

function same(left, right) {
  return canonicalPrivateRuntimeJson(left) === canonicalPrivateRuntimeJson(right);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function validateBindingShape(binding, label) {
  const current = ravScoreModelBinding();
  exactKeys(binding, Object.keys(current), label);
  for (const [key, value] of Object.entries(binding)) {
    if (typeof value !== 'string' || value.length < 1) {
      throw new Error(`${label} has an invalid ${key}`);
    }
  }
  return binding;
}

function expectedSourceBinding(currentBinding) {
  return {
    ...currentBinding,
    modelBundleSha256:
      HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceModelBundleSha256,
  };
}

function partIdentityRows(contract, label) {
  if (!isObject(contract)
    || contract.enabled !== true
    || contract.zoneCount !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.expectedZoneCount
    || contract.partCount !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.expectedPartCount
    || !isObject(contract.zones)
    || Object.keys(contract.zones).length
      !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.expectedZoneCount) {
    throw new Error(`${label} is not the complete active coastal-part contract`);
  }
  const rows = [];
  const partIds = new Set();
  for (const [zoneId, parts] of Object.entries(contract.zones)) {
    if (!Array.isArray(parts) || parts.length < 1) {
      throw new Error(`${label} contains an empty or invalid zone`);
    }
    for (const part of parts) {
      const partId = part?.partId;
      const point = part?.waterPoint;
      const direction = part?.onshoreDirectionDeg;
      if (typeof zoneId !== 'string' || !zoneId
        || typeof partId !== 'string' || !partId || partIds.has(partId)
        || !Array.isArray(point) || point.length !== 2
        || !point.every(Number.isFinite)
        || !Number.isFinite(direction) || direction < 0 || direction >= 360) {
        throw new Error(`${label} contains an invalid or duplicate part identity`);
      }
      partIds.add(partId);
      rows.push({
        zoneId,
        partId,
        waterPoint: [...point],
        onshoreDirectionDeg: direction,
      });
    }
  }
  rows.sort((left, right) => left.zoneId.localeCompare(right.zoneId)
    || left.partId.localeCompare(right.partId));
  if (rows.length !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.expectedPartCount) {
    throw new Error(`${label} has another active part count`);
  }
  return rows;
}

function protectedConditionsPartIdentityRows(conditions) {
  const parts = conditions?.coastalParts?.parts;
  if (!isObject(parts)
    || Object.keys(parts).length
      !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.expectedPartCount) {
    throw new Error('Protected predecessor conditions do not contain all active parts');
  }
  const rows = Object.entries(parts).map(([partId, part]) => ({
    zoneId: part?.zoneId,
    partId,
    waterPoint: part?.waterPoint,
    onshoreDirectionDeg: part?.onshoreDirectionDeg,
  })).sort((left, right) => String(left.zoneId).localeCompare(String(right.zoneId))
    || left.partId.localeCompare(right.partId));
  for (const row of rows) {
    if (typeof row.zoneId !== 'string' || !row.zoneId
      || !Array.isArray(row.waterPoint) || row.waterPoint.length !== 2
      || !row.waterPoint.every(Number.isFinite)
      || !Number.isFinite(row.onshoreDirectionDeg)
      || row.onshoreDirectionDeg < 0 || row.onshoreDirectionDeg >= 360) {
      throw new Error('Protected predecessor contains an invalid part identity');
    }
  }
  return rows;
}

export function historicalWavePartIdentitySha256(contract) {
  return sha256(Buffer.from(canonicalPrivateRuntimeJson(
    partIdentityRows(contract, 'Active coastal-part contract'),
  ), 'utf8'));
}

function manifestConditionsDescriptor(manifest) {
  if (!isObject(manifest)
    || manifest.schemaVersion !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.schemaVersion
    || manifest.kind !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.kind
    || manifest.privacyClass !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass
    || manifest.zoneCount !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.expectedZoneCount
    || manifest.partCount !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.expectedPartCount
    || !Array.isArray(manifest.files)
    || manifest.fileCount !== manifest.files.length
    || !SHA256.test(String(manifest.bundleContentSha256 ?? ''))
    || privateRuntimeBundleContentSha256(manifest) !== manifest.bundleContentSha256) {
    throw new Error('Protected predecessor manifest is invalid');
  }
  const descriptors = manifest.files.filter(file =>
    file?.id === 'full-conditions'
      && file?.relativePath === 'data/live/conditions.json');
  if (descriptors.length !== 1) {
    throw new Error('Protected predecessor manifest lacks one exact conditions file');
  }
  const descriptor = descriptors[0];
  if (!Number.isSafeInteger(descriptor.bytes) || descriptor.bytes < 2
    || !SHA256.test(String(descriptor.sha256 ?? ''))
    || descriptor.privacyClass !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass) {
    throw new Error('Protected predecessor conditions descriptor is invalid');
  }
  return descriptor;
}

export function historicalWaveExposureSourceApplies(
  sourceDescription,
  currentBinding = ravScoreModelBinding(),
) {
  validateBindingShape(currentBinding, 'Current RavScore model binding');
  if (!isObject(sourceDescription)) return false;
  const sourceBinding = sourceDescription.modelBinding;
  return currentBinding.modelBundleSha256
      !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceModelBundleSha256
    && sourceDescription.schemaVersion
      === HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceDescriptionSchemaVersion
    && sourceDescription.kind
      === HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceDescriptionKind
    && sourceDescription.sourceHead
      === HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceHead
    && sourceDescription.productionReferenceAt
      === HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceProductionReferenceAt
    && sourceDescription.expectedZoneCount
      === HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.expectedZoneCount
    && sourceDescription.expectedPartCount
      === HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.expectedPartCount
    && sourceDescription.privatePayloadIncluded === false
    && isObject(sourceBinding)
    && same(sourceBinding, expectedSourceBinding(currentBinding));
}

export function buildHistoricalWavePredecessorRestoreExpectation({
  sourceDescription,
  targetReferenceAt,
  currentBinding = ravScoreModelBinding(),
  now = new Date().toISOString(),
} = {}) {
  if (!historicalWaveExposureSourceApplies(sourceDescription, currentBinding)) {
    return null;
  }
  const sourceReferenceAt = canonicalHour(
    sourceDescription.productionReferenceAt,
    'Historical wave predecessor reference',
  );
  const target = canonicalHour(targetReferenceAt, 'Historical wave transition target');
  if (Date.parse(target) <= Date.parse(sourceReferenceAt)) {
    throw new Error('Historical wave transition requires a genuinely newer production hour');
  }
  canonicalTime(sourceDescription.generatedAt, 'Historical wave predecessor generation');
  canonicalTime(now, 'Historical wave predecessor restore time');
  if (!SHA256.test(String(sourceDescription.bundleContentSha256 ?? ''))
    || typeof sourceDescription.datasetId !== 'string'
    || !/^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(sourceDescription.datasetId)
    || !isObject(sourceDescription.contractHashes)
    || !['continuationStateContractSha256', 'fullRuntimeContractSha256',
      'publicProjectionContractSha256'].every(key =>
      SHA256.test(String(sourceDescription.contractHashes[key] ?? '')))) {
    throw new Error('Historical wave predecessor restore identity is invalid');
  }
  return Object.freeze({
    modelBinding: structuredClone(sourceDescription.modelBinding),
    contractHashes: structuredClone(sourceDescription.contractHashes),
    datasetId: sourceDescription.datasetId,
    productionReferenceAt: sourceReferenceAt,
    generatedAt: sourceDescription.generatedAt,
    targetReferenceAt: target,
    minimumReferenceAt: sourceReferenceAt,
    minimumGeneratedAt: sourceDescription.generatedAt,
    now: canonicalTime(now, 'Historical wave predecessor restore time'),
  });
}

export function buildHistoricalWaveInputTransition({
  sourceDescription,
  manifest,
  protectedConditions,
  protectedConditionsBytes,
  currentContract,
  targetReferenceAt,
  currentBinding = ravScoreModelBinding(),
} = {}) {
  validateBindingShape(currentBinding, 'Current RavScore model binding');
  if (!historicalWaveExposureSourceApplies(sourceDescription, currentBinding)) {
    return null;
  }
  const sourceReferenceAt = canonicalHour(
    sourceDescription.productionReferenceAt,
    'Historical wave predecessor reference',
  );
  const target = canonicalHour(targetReferenceAt, 'Historical wave transition target');
  if (Date.parse(target) <= Date.parse(sourceReferenceAt)) {
    throw new Error('Historical wave transition requires a genuinely newer production hour');
  }
  if (!SOURCE_HEAD.test(sourceDescription.sourceHead)
    || !SHA256.test(String(sourceDescription.bundleContentSha256 ?? ''))
    || typeof sourceDescription.datasetId !== 'string'
    || !/^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(sourceDescription.datasetId)) {
    throw new Error('Historical wave predecessor description is invalid');
  }
  const descriptor = manifestConditionsDescriptor(manifest);
  if (manifest.bundleContentSha256 !== sourceDescription.bundleContentSha256
    || manifest.datasetId !== sourceDescription.datasetId
    || manifest.productionReferenceAt !== sourceReferenceAt
    || !same(manifest.modelBinding, sourceDescription.modelBinding)) {
    throw new Error('Protected predecessor manifest contradicts its central description');
  }
  const bytes = Buffer.isBuffer(protectedConditionsBytes)
    ? protectedConditionsBytes
    : Buffer.from(String(protectedConditionsBytes ?? ''), 'utf8');
  if (bytes.length !== descriptor.bytes || sha256(bytes) !== descriptor.sha256) {
    throw new Error('Protected predecessor conditions bytes contradict the manifest');
  }
  if (!isObject(protectedConditions)
    || protectedConditions.datasetId !== sourceDescription.datasetId
    || protectedConditions.productionReferenceAt !== sourceReferenceAt
    || !same(protectedConditions.coastalParts?.modelBinding, sourceDescription.modelBinding)) {
    throw new Error('Protected predecessor conditions identity is incompatible');
  }
  const activeRows = partIdentityRows(currentContract, 'Active coastal-part contract');
  const protectedRows = protectedConditionsPartIdentityRows(protectedConditions);
  if (!same(activeRows, protectedRows)) {
    throw new Error('Historical wave transition part identities changed since the measured audit');
  }
  const partIdentitySha256 = sha256(Buffer.from(
    canonicalPrivateRuntimeJson(activeRows),
    'utf8',
  ));
  return Object.freeze({
    schemaVersion: HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.schemaVersion,
    kind: HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.kind,
    disposition: HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.disposition,
    source: Object.freeze({
      sourceHead: sourceDescription.sourceHead,
      datasetId: sourceDescription.datasetId,
      bundleContentSha256: sourceDescription.bundleContentSha256,
      conditionsSha256: descriptor.sha256,
      productionReferenceAt: sourceReferenceAt,
      modelBinding: structuredClone(sourceDescription.modelBinding),
    }),
    target: Object.freeze({
      productionReferenceAt: target,
      modelBinding: structuredClone(currentBinding),
    }),
    scope: Object.freeze({
      affectedPartCount: activeRows.length,
      partIdentitySha256,
      allActivePartsExposed: true,
      historicalStateImpactProved: false,
    }),
    replay: Object.freeze({
      mode: HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.replayMode,
      historyHours: HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.replayHistoryHours,
      integratedInitialState: 'NONE',
      candidateGInitialState: 'NONE',
      sharedQualifiedInputRequired: true,
      readinessMayBeClaimedFromTransition: false,
    }),
    privatePayloadIncluded: false,
  });
}

export function assertHistoricalWaveInputTransition(transition, {
  currentContract,
  previousConditions,
  targetReferenceAt,
  currentBinding = ravScoreModelBinding(),
} = {}) {
  exactKeys(transition, [
    'schemaVersion', 'kind', 'disposition', 'source', 'target', 'scope',
    'replay', 'privatePayloadIncluded',
  ], 'Historical wave transition');
  exactKeys(transition.source, [
    'sourceHead', 'datasetId', 'bundleContentSha256', 'conditionsSha256',
    'productionReferenceAt', 'modelBinding',
  ], 'Historical wave transition source');
  exactKeys(transition.target, ['productionReferenceAt', 'modelBinding'],
    'Historical wave transition target');
  exactKeys(transition.scope, [
    'affectedPartCount', 'partIdentitySha256', 'allActivePartsExposed',
    'historicalStateImpactProved',
  ], 'Historical wave transition scope');
  exactKeys(transition.replay, [
    'mode', 'historyHours', 'integratedInitialState', 'candidateGInitialState',
    'sharedQualifiedInputRequired', 'readinessMayBeClaimedFromTransition',
  ], 'Historical wave transition replay');
  validateBindingShape(currentBinding, 'Current RavScore model binding');
  const expectedSource = expectedSourceBinding(currentBinding);
  if (transition.schemaVersion !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.schemaVersion
    || transition.kind !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.kind
    || transition.disposition !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.disposition
    || transition.privatePayloadIncluded !== false
    || transition.source.sourceHead !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceHead
    || transition.source.productionReferenceAt
      !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceProductionReferenceAt
    || !SHA256.test(String(transition.source.bundleContentSha256 ?? ''))
    || !SHA256.test(String(transition.source.conditionsSha256 ?? ''))
    || !same(transition.source.modelBinding, expectedSource)
    || transition.target.productionReferenceAt !== canonicalHour(
      targetReferenceAt,
      'Historical wave transition target',
    )
    || !same(transition.target.modelBinding, currentBinding)
    || Date.parse(transition.target.productionReferenceAt)
      <= Date.parse(transition.source.productionReferenceAt)
    || transition.scope.affectedPartCount
      !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.expectedPartCount
    || transition.scope.partIdentitySha256
      !== historicalWavePartIdentitySha256(currentContract)
    || transition.scope.allActivePartsExposed !== true
    || transition.scope.historicalStateImpactProved !== false
    || transition.replay.mode !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.replayMode
    || transition.replay.historyHours
      !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.replayHistoryHours
    || transition.replay.integratedInitialState !== 'NONE'
    || transition.replay.candidateGInitialState !== 'NONE'
    || transition.replay.sharedQualifiedInputRequired !== true
    || transition.replay.readinessMayBeClaimedFromTransition !== false) {
    throw new Error('Historical wave transition contract is incompatible');
  }
  if (!isObject(previousConditions)
    || previousConditions.datasetId !== transition.source.datasetId
    || previousConditions.productionReferenceAt !== transition.source.productionReferenceAt
    || !same(previousConditions.coastalParts?.modelBinding, transition.source.modelBinding)
    || !same(
      protectedConditionsPartIdentityRows(previousConditions),
      partIdentityRows(currentContract, 'Active coastal-part contract'),
    )) {
    throw new Error('Installed protected predecessor does not match the historical wave transition');
  }
  return transition;
}

export function historicalWaveMeasuredColdPipelineInitialization(transition) {
  if (!isObject(transition)
    || transition.kind !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.kind
    || transition.disposition !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.disposition
    || transition.scope?.affectedPartCount
      !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.expectedPartCount
    || transition.replay?.mode !== HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.replayMode
    || transition.replay?.integratedInitialState !== 'NONE'
    || transition.replay?.candidateGInitialState !== 'NONE') {
    throw new Error('Historical wave measured-cold initialization lacks its validated transition');
  }
  return Object.freeze({
    initialSelection: Object.freeze({
      state: null,
      source: 'COLD_START',
      candidateGSourceDisposition:
        RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION,
    }),
    previousCandidateGContinuation: null,
    legacyCandidateGMigrationState: null,
    candidateGRollbackMeasuredColdStart: true,
    candidateGRollbackMeasuredWarmupContinuation: false,
  });
}

export async function loadHistoricalWaveInputTransition({
  transitionPath,
  ...expectations
} = {}) {
  if (!transitionPath) return null;
  const details = await fs.lstat(transitionPath);
  if (!details.isFile() || details.isSymbolicLink() || details.size < 2
    || details.size > 64 * 1024) {
    throw new Error('Historical wave transition file is invalid');
  }
  let transition;
  try {
    transition = JSON.parse(await fs.readFile(transitionPath, 'utf8'));
  } catch {
    throw new Error('Historical wave transition file cannot be parsed');
  }
  return assertHistoricalWaveInputTransition(transition, expectations);
}
