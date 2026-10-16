#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  PRIVATE_RUNTIME_FILES,
  privateRuntimeContractHashes,
} from './private-production-runtime-workflow.mjs';
import {
  PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE,
  PRIVATE_WEATHER_COMPONENT_PACK_FILE,
  assertPrivateRuntimeInventory,
  privateWeatherComponentMarker,
} from './lib/private-weather-component-inventory.mjs';
import {
  privatePublicHourDeliveryMarker,
} from './lib/public-hour-delivery-pack.mjs';
import { rebindPublicHourPackExact } from './lib/rebind-public-hour-pack-exact.mjs';
import { hydratePrivateConditionsHourly, packPrivateConditionsHourly } from './lib/private-conditions-hourly.mjs';
import {
  buildPublicConditionDetails,
  compactJson,
  sha256Text,
} from './public-conditions-lib.mjs';
import { canonicalPublicRuntimeJson } from '../js/core/ravscore-public-runtime-contract.js';
import {
  assertIntegratedCoastalPointContinuation,
  assertCandidateGCoastalPointRollbackContinuation,
  coastalPointStageIdentity,
  assertArchivedOwnerCurrentIntegratedOriginal,
  assertWaterLevelOnlyIntegratedOriginal,
  assertPost576CurrentGridIntegratedOriginal,
} from './lib/coastal-point-staging-contract.mjs';
import {
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  assertExactPublicRavScoreProfile,
} from '../js/core/ravscore-public-profile-contract.js';
import {
  buildIntegratedRavScoreStateSeries,
} from '../js/core/ravscore-integrated-state-pipeline.js';
import { evaluateRavScoreIntegrated } from '../js/core/ravscore-integrated.js';
import { selectPublicRavScoreResult } from '../js/core/ravscore-public-model.js';
import {
  buildIntegratedZoneHourlyProjection,
} from './lib/ravscore-production-adapters.mjs';
import {
  compactIntegratedRavScoreMode,
  integratedInputCalibrationEligible,
} from './lib/ravscore-integrated-runtime.mjs';
import {
  reconstructIntegratedEvaluationState,
} from './audit-ravscore-integrated-public-runtime.mjs';
import {
  assertRavScoreModelBinding as assertCandidateBinding,
  ravScoreModelBinding as candidateModelBinding,
} from './rollback-assets/ravscore-model-contract.js';
import { assertRuntimeBindingRegistry } from './runtime-binding-registry.mjs';
import { writeBoundedJsonAtomic } from './lib/bounded-json-writer.mjs';
import { readOwnerCurrentTransitionArchive, retainOwnerCurrentTransitionOriginal }
  from './lib/ravscore-production-part-pipeline.mjs';
import { dmiMarineCollectionAllowedForZone } from './lib/dmi-marine-zone-exclusions.mjs';
import { OWNER_CURRENT_DOMAIN_PREDECESSOR, buildOwnerCurrentOriginalRestoreExpectation }
  from './lib/bounded-conditions-predecessor-transition.mjs';
import { CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY as CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY,
  assertCurrentGridSamplingOriginalExpectation }
  from './lib/bounded-conditions-predecessor-transition.mjs';
import { PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY, privateRuntimeBundleContentSha256 }
  from './private-production-runtime-bundle.mjs';
import { createProtectedPrivateRuntimeClients, describeTargetProtectedPrivateProductionRuntime }
  from './protected-private-production-runtime.mjs';

assertRuntimeBindingRegistry();

// Exact protected predecessor currently referenced by the central runtime
// pointer.  This is intentionally pinned to the sealed non-sensitive
// identity of the last successful integrated generation; it must move only
// when a later protected runtime is actually published and its identity is
// reviewed together with the migration.
export const POST_CUTOVER_PREDECESSOR = Object.freeze({
  sourceHead: 'a6d89798c76a5218c5d699961474f4259835dfb9',
  datasetId: 'rr-20260921170645-210',
  productionReferenceAt: '2026-09-21T16:00:00.000Z',
  generatedAt: '2026-09-21T17:06:45.191Z',
  bundleContentSha256: '4e2cc7ab3e5fa7fdb26cb243c9f1847e964c2a67c6c991445ab3ec3d215dd37d',
  modelBinding: Object.freeze({
    modelId: 'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0',
    stateSchemaVersion: '6.0.0',
    variantId: 'COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2',
    profileId: 'cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5',
    componentSchemaId: 'ravscore-components-huntability-delivery-mobilisation-bounds-v5',
    explanationSchemaId: 'ravscore-explanation-integrated-bounds-v5',
    rankingPolicyId: 'direction-broad-19-history-tie-v2',
    bestTimePolicyId: 'score-history-water-tie-earliest-v3',
    presentationPolicyId: 'score-bands-35-55-75-exceptional90-v1',
    modelContractSha256: 'a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b',
    modelBundleSha256: '14f3f0c9b1d91df0d23f94e1d56852a34f8d6a232e23da74590921be8f058904',
  }),
  candidateBundleSha256: '618b2b44c93316f6798a17fbbd020cdacda9aff73bfde4cbbbaa05d3fa197ace',
  contractHashes: Object.freeze({
    continuationStateContractSha256: '9702630e114ab4cd09b185b397b302afcaf4a81881f6aae3ec0b6995419525e0',
    fullRuntimeContractSha256: 'c3bc7a5f3bc0e1c6129a3d9decb1d354698007b22063c804a3e367e0b8424328',
    publicProjectionContractSha256: '21deee2a5a93b17057af94b02a2ca228ad475c6cd4870004fc4d0bbf1a3b24be',
  }),
  expectedZoneCount: 210,
  expectedPartCount: 673,
});

const INTEGRATED_BINDING_KEYS = Object.freeze(Object.keys(ravScoreModelBinding()));
const PRIVATE_STATE_KEYS = new Set(['currentState', 'continuationState']);
const SHA256 = /^[a-f0-9]{64}$/;
const SOURCE_HEAD = /^[a-f0-9]{40}$/;
const DATASET_ID = /^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const PREDECESSOR_IDENTITY_KEYS = Object.freeze([
  'schemaVersion',
  'kind',
  'sourceHead',
  'datasetId',
  'bundleContentSha256',
  'productionReferenceAt',
  'generatedAt',
  'modelBinding',
  'contractHashes',
  'expectedZoneCount',
  'expectedPartCount',
  'privatePayloadIncluded',
]);

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function sameStructuredValue(left, right) {
  // Do not serialize the whole runtime to one comparison string.  The
  // Candidate G continuation contains 673 part states and can be larger
  // than V8's maximum string length even though the JSON itself is valid.
  // Compare the canonical object shape directly instead; keys are sorted so
  // this preserves the old order-independent contract without allocating a
  // potentially unbounded intermediate string.
  const pending = [[left, right]];
  while (pending.length) {
    const [currentLeft, currentRight] = pending.pop();
    if (Object.is(currentLeft, currentRight)) continue;
    if (currentLeft === null || currentRight === null
        || typeof currentLeft !== typeof currentRight) return false;
    if (typeof currentLeft !== 'object') return false;

    const leftIsArray = Array.isArray(currentLeft);
    if (leftIsArray !== Array.isArray(currentRight)) return false;
    if (leftIsArray) {
      if (currentLeft.length !== currentRight.length) return false;
      for (let index = 0; index < currentLeft.length; index += 1) {
        pending.push([currentLeft[index], currentRight[index]]);
      }
      continue;
    }

    const leftKeys = Object.keys(currentLeft).sort();
    const rightKeys = Object.keys(currentRight).sort();
    if (leftKeys.length !== rightKeys.length) return false;
    for (let index = 0; index < leftKeys.length; index += 1) {
      if (leftKeys[index] !== rightKeys[index]) return false;
      pending.push([currentLeft[leftKeys[index]], currentRight[rightKeys[index]]]);
    }
  }
  return true;
}

function same(left, right) {
  return sameStructuredValue(left, right);
}

function assertSame(left, right, label) {
  if (!same(left, right)) throw new Error(`${label} mismatch`);
}

function exactKeys(value, expected, label) {
  if (!isPlainObject(value)
      || !same(Object.keys(value).sort(), [...expected].sort())) {
    throw new Error(`${label} has an incompatible field set`);
  }
}

export function validatePredecessorIdentity(value, expectedSourceHead) {
  exactKeys(value, PREDECESSOR_IDENTITY_KEYS, 'Current private runtime source identity');
  exactKeys(value.modelBinding, INTEGRATED_BINDING_KEYS,
    'Current private runtime source model binding');
  const contractKeys = Object.keys(value.contractHashes ?? {});
  if (value.schemaVersion !== '1.0.0'
      || value.kind !== 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_TARGET_SOURCE'
      || !SOURCE_HEAD.test(String(expectedSourceHead ?? ''))
      || value.sourceHead !== expectedSourceHead
      || !DATASET_ID.test(String(value.datasetId ?? ''))
      || !SHA256.test(String(value.bundleContentSha256 ?? ''))
      || !Number.isFinite(Date.parse(value.productionReferenceAt))
      || !Number.isFinite(Date.parse(value.generatedAt))
      || !isPlainObject(value.contractHashes)
      || value.expectedZoneCount !== 210
      || value.expectedPartCount !== 673
      || value.privatePayloadIncluded !== false
      || contractKeys.length < 3
      || contractKeys.length > 16
      || contractKeys.some(key => !/^[a-z][A-Za-z0-9]{0,63}Sha256$/.test(key)
        || !SHA256.test(String(value.contractHashes[key] ?? '')))) {
    throw new Error('Current private runtime source identity is invalid');
  }
  return structuredClone(value);
}

export function assertBindingUpgrade(previous, current, label, { requireChange = true } = {}) {
  if (!isPlainObject(previous) || !isPlainObject(current)) {
    throw new Error(`${label} is missing`);
  }
  const previousKeys = Object.keys(previous).sort();
  const currentKeys = Object.keys(current).sort();
  if (!same(previousKeys, currentKeys)) throw new Error(`${label} key set changed`);
  const changed = previousKeys.filter(key => previous[key] !== current[key]);
  if (changed.some(key => key !== 'modelBundleSha256')) {
    throw new Error(`${label} changes more than the implementation bundle hash`);
  }
  if (requireChange && !changed.length) throw new Error(`${label} does not require migration`);
  if (!SHA256.test(previous.modelBundleSha256) || !SHA256.test(current.modelBundleSha256)) {
    throw new Error(`${label} has an invalid implementation bundle hash`);
  }
}

function bindingFromWrapper(wrapper, label) {
  if (!isPlainObject(wrapper)) throw new Error(`${label} is missing`);
  return Object.fromEntries(INTEGRATED_BINDING_KEYS.map(key => [key, wrapper[key]]));
}

function joinedPath(prefix, key) {
  return prefix ? `${prefix}.${key}` : String(key);
}

function collectChangedPaths(before, after, prefix = '') {
  if (Object.is(before, after)) return [];
  if (Array.isArray(before) || Array.isArray(after)) {
    if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length) {
      return [prefix];
    }
    return before.flatMap((value, index) => collectChangedPaths(
      value,
      after[index],
      joinedPath(prefix, index),
    ));
  }
  if (!isPlainObject(before) || !isPlainObject(after)) return [prefix];
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return keys.flatMap(key => collectChangedPaths(
    before[key],
    after[key],
    joinedPath(prefix, key),
  ));
}

function addExactChangedPaths(allowed, before, after, prefix) {
  const changed = collectChangedPaths(before, after, prefix);
  changed.forEach(pathValue => allowed.add(pathValue));
  return changed;
}

export function registerChangedBindingMetadata({
  exactAllowedPaths,
  bindingMetadataPaths,
  before,
  after,
  prefix,
  fields,
} = {}) {
  if (!(exactAllowedPaths instanceof Set)
      || !(bindingMetadataPaths instanceof Set)
      || !isPlainObject(before)
      || !isPlainObject(after)
      || typeof prefix !== 'string'
      || !prefix
      || !Array.isArray(fields)
      || fields.length === 0) {
    throw new Error('Changed binding metadata registration is invalid');
  }
  const changed = [];
  for (const field of fields) {
    if (typeof field !== 'string' || !field) {
      throw new Error('Changed binding metadata field is invalid');
    }
    const fieldPath = joinedPath(prefix, field);
    const fieldChanges = collectChangedPaths(before[field], after[field], fieldPath);
    for (const pathValue of fieldChanges) {
      if (!isBindingMetadataPath(pathValue)) {
        throw new Error(`Changed binding metadata path is not classified: ${pathValue}`);
      }
      exactAllowedPaths.add(pathValue);
      bindingMetadataPaths.add(pathValue);
      changed.push(pathValue);
    }
  }
  return changed;
}

function scoreAvailabilitySignature(value) {
  return {
    available: value?.available === true,
    scoreQuality: value?.scoreQuality ?? null,
    calibrationEligible: value?.calibrationEligible === true,
    scoreSemantics: value?.scoreSemantics ?? null,
    conservativeTailResetApplied: value?.conservativeTailResetApplied === true,
    historyCoverageHours: value?.historyCoverageHours ?? null,
    historyReasonCodes: Array.isArray(value?.historyReasonCodes)
      ? [...value.historyReasonCodes].sort() : [],
    reason: value?.available === false ? value?.reason ?? null : null,
    readiness: value?.available === false ? value?.readiness ?? null : null,
  };
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function migratedPublicContext(part, wrapper, evaluationState) {
  const weather = part?.current?.weather ?? {};
  const currentAlignment = finiteNumber(weather.currentDirectionDeg)
    && finiteNumber(part?.onshoreDirectionDeg)
    ? Math.cos((weather.currentDirectionDeg - part.onshoreDirectionDeg) * Math.PI / 180)
    : null;
  return {
    windSpeedMps: weather.windSpeedMps,
    waveHeightM: weather.waveHeightM,
    currentSpeedMps: weather.currentSpeedMps,
    currentCoastNormalSpeedMps: evaluationState.currentCoastNormalSpeedMps,
    currentAlignment,
    currentVerified: evaluationState.currentVerified === true,
    currentTransition: wrapper.currentTransition ?? null,
    currentReferenceAt: wrapper.currentReferenceAt ?? null,
    currentReferenceProvenance: weather.currentProvenance ?? null,
    currentMemoryReady: wrapper.currentMemoryReady === true,
    currentMemoryStatus: wrapper.currentMemoryStatus ?? null,
    currentMemoryCoverageHours: wrapper.currentMemoryCoverageHours ?? null,
    currentMemoryWindowHours: wrapper.currentMemoryWindowHours ?? null,
    waveLastVerifiedAt: wrapper.waveLastVerifiedAt ?? null,
    waveMemoryReady: wrapper.waveMemoryReady === true,
    waveMemoryStatus: wrapper.waveMemoryStatus ?? null,
    lastMileWaveReferenceAt: evaluationState.lastMileWaveReferenceAt ?? null,
    lastMileMemoryReady: evaluationState.lastMileMemoryReady === true,
    lastMileMemoryStatus: evaluationState.lastMileMemoryStatus ?? null,
  };
}

export function reconcileIntegratedCurrentPartProjection({
  part,
  scoreProfile,
} = {}) {
  if (!isPlainObject(part?.ravScoreModel)
      || !isPlainObject(part?.current)
      || !isPlainObject(part.current.weather)
      || !isPlainObject(scoreProfile)) {
    throw new Error('Current part projection is incomplete');
  }
  const wrapper = part.ravScoreModel;
  const weather = part.current.weather;
  const evaluationState = reconstructIntegratedEvaluationState(
    wrapper.currentState,
    wrapper,
    weather,
    wrapper.modes?.waders,
    part.onshoreDirectionDeg,
  );
  const inputCalibrationEligible = integratedInputCalibrationEligible(weather);
  const modes = Object.fromEntries(['waders', 'beach'].map(mode => [
    mode,
    compactIntegratedRavScoreMode(evaluateRavScoreIntegrated({
      mode,
      weather,
      zone: { onshoreDirectionDeg: part.onshoreDirectionDeg },
    }, { state: evaluationState }), { inputCalibrationEligible }),
  ]));
  for (const mode of ['waders', 'beach']) {
    if (!same(
      scoreAvailabilitySignature(wrapper.modes?.[mode]),
      scoreAvailabilitySignature(modes[mode]),
    )) {
      throw new Error(`${mode} availability or history classification changed during repair`);
    }
  }
  const context = migratedPublicContext(part, wrapper, evaluationState);
  const modelState = { ...wrapper, modes };
  const current = {
    ...part.current,
    ...Object.fromEntries(['waders', 'beach'].map(mode => [
      mode,
      selectPublicRavScoreResult({
        profile: scoreProfile,
        modelResult: modes[mode],
        modelState,
        mode,
        context,
      }),
    ])),
  };
  return { modes, current };
}

const EXACT_LAST_MILE_REPAIR_PREFIXES = Object.freeze([
  'historyBounds.lastMile.minimumFactorTrack',
  'historyBounds.lastMile.maximumFactorTrack',
]);

function exactLastMileRepairPath(pathValue) {
  return EXACT_LAST_MILE_REPAIR_PREFIXES.some(prefix => (
    pathValue === prefix || pathValue.startsWith(`${prefix}.`)
  ));
}

export function reconcileIntegratedContinuation({
  originalState,
  migratedState,
  assertPredecessor,
  canonicalizeCurrent,
} = {}) {
  if (typeof assertPredecessor !== 'function'
      || typeof canonicalizeCurrent !== 'function') {
    throw new Error('Integrated continuation reconciliation requires both validators');
  }
  let predecessorError = null;
  try {
    assertPredecessor(originalState);
  } catch (error) {
    predecessorError = error instanceof Error ? error : new Error(String(error));
  }
  const canonicalState = canonicalizeCurrent(migratedState);
  const repairPaths = collectChangedPaths(migratedState, canonicalState);
  const forbiddenRepairPaths = repairPaths.filter(pathValue => (
    !exactLastMileRepairPath(pathValue)
  ));
  if (forbiddenRepairPaths.length) {
    throw new Error(
      `Current continuation repair changed forbidden paths: ${forbiddenRepairPaths.join(', ')}`,
    );
  }
  if (predecessorError && repairPaths.length === 0) {
    throw new Error(
      `Predecessor continuation was rejected without the exact last-mile repair: ${predecessorError.message}`,
    );
  }
  return {
    canonicalState,
    repairPaths,
    predecessorValidationRecovered: predecessorError !== null,
  };
}

export function summarizeIndependentErrors(errors, { maximumGroups = 8 } = {}) {
  const groups = new Map();
  for (const entry of Array.isArray(errors) ? errors : []) {
    const scope = String(entry?.scope ?? 'unknown');
    const rawMessage = String(entry?.message ?? 'Unknown error');
    const message = rawMessage
      .split(scope).join('<item>')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 320);
    const current = groups.get(message) ?? { count: 0, examples: [] };
    current.count += 1;
    if (current.examples.length < 3) current.examples.push(scope);
    groups.set(message, current);
  }
  const ordered = [...groups.entries()]
    .sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0]));
  const summary = ordered.slice(0, maximumGroups).map(([message, group]) => (
    `${group.count}x ${message} [examples: ${group.examples.join(', ')}]`
  ));
  if (ordered.length > maximumGroups) {
    summary.push(`${ordered.length - maximumGroups} additional error group(s) omitted`);
  }
  return summary.join(' | ');
}

function exactBindingCarrier(value, previousBinding) {
  return INTEGRATED_BINDING_KEYS.every(key => value[key] === previousBinding[key]);
}

function exactProfileCarrier(value, previousBinding) {
  if (!Object.hasOwn(value, 'requestedProfileId')
      || !Object.hasOwn(value, 'activeProfileId')) return false;
  try {
    assertExactPublicRavScoreProfile(value, previousBinding, 'Saved runtime score profile');
    return true;
  } catch {
    return false;
  }
}

function exactCompactResultCarrier(value, previousBinding) {
  if (value.modelId !== previousBinding.modelId
      || value.modelVersion !== previousBinding.modelId
      || value.modelContractSha256 !== previousBinding.modelContractSha256
      || value.modelBundleSha256 !== previousBinding.modelBundleSha256
      || !isPlainObject(value.modelBinding)) return false;
  return exactBindingCarrier(value.modelBinding, previousBinding);
}

function exactMetadataCarrier(value, previousBinding) {
  if (!isPlainObject(value)) return false;
  return exactBindingCarrier(value, previousBinding)
    || exactProfileCarrier(value, previousBinding)
    || exactCompactResultCarrier(value, previousBinding);
}

function validatedHistoricalCurrentSourceArchive(root) {
  if (!Object.hasOwn(root, 'ravScoreCurrentSourceDomainTransitions')) return false;
  const archive = root.ravScoreCurrentSourceDomainTransitions;
  const parts = root.coastalParts?.parts;
  if (!isPlainObject(archive) || !isPlainObject(parts)) {
    throw new Error('Private current source transition archive requires its complete part identities');
  }
  if (typeof root.productionReferenceAt !== 'string') {
    throw new Error('Private current source transition archive requires its locked production reference');
  }
  const activeParts = Object.entries(parts).map(([partId, part]) => {
    if (!isPlainObject(part) || (part.partId !== undefined && part.partId !== partId)) {
      throw new Error('Private current source transition archive has an incompatible active part');
    }
    return { ...part, partId };
  });
  // Validate the entire exact private envelope and original state pair FIRST.
  // This is historical control material, not current metadata or initializer.
  readOwnerCurrentTransitionArchive(archive, activeParts, {
    targetReferenceAt: root.productionReferenceAt,
  });
  return true;
}

export function migrateExactModelBindingMetadata(
  root,
  previousBinding,
  currentBinding,
  { label = 'Saved runtime model metadata' } = {},
) {
  assertBindingUpgrade(previousBinding, currentBinding, label, { requireChange: false });
  const preserveHistoricalArchive = validatedHistoricalCurrentSourceArchive(root);
  const bindingChanged = previousBinding.modelBundleSha256
    !== currentBinding.modelBundleSha256;
  const changedPaths = [];
  function visit(value, prefix = '') {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, joinedPath(prefix, index)));
      return;
    }
    if (!isPlainObject(value)) return;
    if (Object.hasOwn(value, 'modelBundleSha256')
        && value.modelBundleSha256 === previousBinding.modelBundleSha256) {
      if (!exactMetadataCarrier(value, previousBinding)) {
        throw new Error(`${label} has an unrecognized or conflicting old bundle hash at ${prefix}`);
      }
      if (bindingChanged) {
        value.modelBundleSha256 = currentBinding.modelBundleSha256;
        changedPaths.push(joinedPath(prefix, 'modelBundleSha256'));
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if (PRIVATE_STATE_KEYS.has(key)) continue;
      if (prefix === '' && preserveHistoricalArchive
        && key === 'ravScoreCurrentSourceDomainTransitions') continue;
      visit(child, joinedPath(prefix, key));
    }
  }
  visit(root);
  return changedPaths;
}

export function collectBundleHashPaths(root, hashes) {
  const preserveHistoricalArchive = validatedHistoricalCurrentSourceArchive(root);
  const paths = [];
  function visit(value, prefix = '') {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, joinedPath(prefix, index)));
      return;
    }
    if (!isPlainObject(value)) return;
    for (const [key, child] of Object.entries(value)) {
      // Only the already validated ROOT archive is historical. Any nested or
      // unrelated old hash remains a hard stale-current-metadata finding.
      if (prefix === '' && preserveHistoricalArchive
        && key === 'ravScoreCurrentSourceDomainTransitions') continue;
      const childPath = joinedPath(prefix, key);
      if (key === 'modelBundleSha256' && hashes.has(child)) paths.push(childPath);
      visit(child, childPath);
    }
  }
  visit(root);
  return paths;
}

function isBindingMetadataPath(pathValue) {
  return pathValue.endsWith('.modelBundleSha256')
    || /^publicHourDelivery\.(sourceDetailsSha256|startupNationalForecastSha256|rawBytes|packBytes|packSha256)$/.test(pathValue);
}

export function allowedChange(pathValue, exactAllowedPaths = []) {
  const allowed = exactAllowedPaths instanceof Set
    ? exactAllowedPaths : new Set(exactAllowedPaths);
  return allowed.has(pathValue);
}

// Called only after predecessor/current validators and the exact repair
// allowlist have succeeded. Classify the actual full-document difference,
// never a repair counter or the fact that a bundle hash changed.
export function classifyVerifiedRuntimeMigration({
  source,
  migrated,
  bindingMetadataPaths,
  verifiedChangedPaths,
} = {}) {
  if (!isPlainObject(source) || !isPlainObject(migrated)) {
    throw new Error('Runtime migration classification requires both complete documents');
  }
  const bindingPaths = new Set(bindingMetadataPaths);
  const allowedPaths = new Set(verifiedChangedPaths);
  if ([...bindingPaths].some(value => !isBindingMetadataPath(value))) {
    throw new Error('Runtime migration binding proof contains a non-binding path');
  }
  const changedPaths = collectChangedPaths(source, migrated);
  if (changedPaths.some(value => !allowedPaths.has(value))
      || [...allowedPaths].some(value => !changedPaths.includes(value))) {
    throw new Error('Runtime migration does not match its exact verified changes');
  }
  if (changedPaths.length === 0) return 'CONTRACT_ONLY_REBIND';
  const semanticChanges = changedPaths.filter(value => !bindingPaths.has(value));
  if (semanticChanges.length === 0) return 'MODEL_BINDING_METADATA_ONLY';
  if (!semanticChanges.some(value =>
    /^coastalParts\.parts\.[^.]+\.ravScoreModel\.currentState\.historyBounds\.lastMile\.(minimumFactorTrack|maximumFactorTrack)(\.|$)/.test(value))) {
    throw new Error('Runtime semantic changes lack the verified narrow last-mile repair');
  }
  return 'MODEL_BINDING_MIGRATION';
}

export function classifyOwnerCurrentArchiveBridge({ source, migrated,
  bindingMetadataPaths, verifiedChangedPaths } = {}) {
  const expectedArchiveHolder = {};
  preserveOwnerCurrentOriginalPairs(source, expectedArchiveHolder);
  assertSame(migrated.ravScoreCurrentSourceDomainTransitions,
    expectedArchiveHolder.ravScoreCurrentSourceDomainTransitions, 'True original-pair archive');
  const before = { ...source };
  const after = { ...migrated };
  delete before.ravScoreCurrentSourceDomainTransitions;
  delete after.ravScoreCurrentSourceDomainTransitions;
  const archivePaths = collectChangedPaths(source.ravScoreCurrentSourceDomainTransitions,
    migrated.ravScoreCurrentSourceDomainTransitions, 'ravScoreCurrentSourceDomainTransitions');
  const allChanges = collectChangedPaths(source, migrated);
  const allowed = new Set(verifiedChangedPaths);
  if (allChanges.some(value => !allowed.has(value))
    || [...allowed].some(value => !allChanges.includes(value))) {
    throw new Error('Owner current archive bridge has unverified changes');
  }
  const technicalKind = classifyVerifiedRuntimeMigration({ source: before, migrated: after,
    bindingMetadataPaths, verifiedChangedPaths: [...allowed].filter(value => !archivePaths.includes(value)) });
  if (technicalKind !== 'MODEL_BINDING_METADATA_ONLY') {
    throw new Error('Owner current archive bridge must change only binding metadata and true originals');
  }
  // Deliberately distinct from the existing same-T metadata-only CAS authority.
  // This private bridge is consumed by normal NEW-T reconstruction, not a
  // declaration that the old current contributions have become permitted.
  return 'OWNER_CURRENT_ORIGINAL_ARCHIVE_BRIDGE';
}

async function assertDirectoryOutside(repositoryRoot, requested, label) {
  const root = path.resolve(repositoryRoot);
  const candidate = path.resolve(requested);
  const stat = await fs.lstat(candidate).catch(() => null);
  if (!stat?.isDirectory() || stat.isSymbolicLink()) throw new Error(`${label} is not a regular directory`);
  const [realRoot, realCandidate] = await Promise.all([fs.realpath(root), fs.realpath(candidate)]);
  const relation = path.relative(realRoot, realCandidate);
  if (!relation || (!relation.startsWith(`..${path.sep}`) && relation !== '..')) {
    throw new Error(`${label} must remain outside the repository`);
  }
  return realCandidate;
}

async function readJson(file, label, originalDescriptor = null) {
  let text;
  try {
    if (originalDescriptor) {
      // Hash the SAME bytes that are parsed, not an earlier path observation.
      const raw = await fs.readFile(file);
      assertSame({ bytes: raw.length, sha256: crypto.createHash('sha256').update(raw).digest('hex') },
        { bytes: originalDescriptor.bytes, sha256: originalDescriptor.sha256 },
        `${label} sealed original bytes`);
      text = raw.toString('utf8');
    } else text = await fs.readFile(file, 'utf8');
  } catch {
    throw new Error(`${label} cannot be read${originalDescriptor ? ' as its sealed original bytes' : ''}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export async function atomicWriteJson(file, value) {
  const target = path.resolve(file);
  // The migrated conditions document can contain all 673 parts and the full
  // continuation history.  JSON.stringify(value, null, 2) creates one V8
  // string for that entire document and is the exact source of the recurring
  // `Invalid string length` failure.  Reuse the bounded writer used by the
  // normal weather path so this migration has the same streaming guarantee.
  await writeBoundedJsonAtomic(target, value);
  return digestPrivateRuntimeFile(target);
}

async function importPredecessorModules(predecessorRoot, sourceHead) {
  const stagingUrl = pathToFileURL(path.join(
    predecessorRoot,
    'scripts/lib/coastal-point-staging-contract.mjs',
  ));
  const integratedUrl = pathToFileURL(path.join(
    predecessorRoot,
    'js/core/ravscore-model-contract.js',
  ));
  const candidateUrl = pathToFileURL(path.join(
    predecessorRoot,
    'scripts/rollback-assets/ravscore-model-contract.js',
  ));
  const query = `?predecessor=${sourceHead}`;
  const [staging, integrated, candidate] = await Promise.all([
    import(`${stagingUrl.href}${query}`),
    import(`${integratedUrl.href}${query}`),
    import(`${candidateUrl.href}${query}`),
  ]);
  return { staging, integrated, candidate };
}

// No archived model import/copy/evaluation. These are the existing full
// canonical validators, restricted to the approved original physical contracts.
// In particular, the original integrated state is validated BEFORE its hash
// metadata is migrated. Neither an archive nor a hash stamp is a validator.
function ownerCurrentOriginalValidators(integrated = OWNER_CURRENT_DOMAIN_PREDECESSOR.modelBinding) {
  const waterOnly=integrated.modelBundleSha256
    === '4ebe158f68954f32b47cb71d5222ab0cf676faaf4b323d743f9d43bf34a63a51';
  const currentCandidate = candidateModelBinding();
  if (currentCandidate.modelContractSha256
    !== 'c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8') {
    throw new Error('Owner current transition has another Candidate G physical contract');
  }
  const candidate = { ...currentCandidate,
    modelBundleSha256: waterOnly
      ? '3e5aae87b19934091a7882fbd8f5b5570b7c83ba786ea6f3bac52a8fd71fcd1e'
      : '28a69936b3d9a9c655e967c5e0c352d8401e5894ef3011bbfc55c85ad37f7ce7' };
  const bindingValidator = binding => ({
    ravScoreModelBinding: () => structuredClone(binding),
    assertRavScoreModelBinding: (value, label) => assertSame(value, binding, label),
  });
  return {
    integrated: bindingValidator(integrated), candidate: bindingValidator(candidate),
    staging: { coastalPointStageIdentity,
      assertCandidateGCoastalPointRollbackContinuation,
      assertIntegratedCoastalPointContinuation: (state, options) => {
        if (state?.modelBundleSha256 !== integrated.modelBundleSha256) {
          throw new Error('Owner current original has another integrated implementation');
        }
        return waterOnly ? assertWaterLevelOnlyIntegratedOriginal(state,options)
          : assertArchivedOwnerCurrentIntegratedOriginal(state, options);
      },
    },
  };
}

// Only the selected post-576 I/C/T original family validation. No historical repair, arbitrary binding,
// archive import, metadata-only admission or new native evidence is created.
function currentGridOriginalValidators() {
  const policy = CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY;
  const bindingValidator = binding => ({
    ravScoreModelBinding: () => structuredClone(binding),
    assertRavScoreModelBinding: (value, label) => assertSame(value, binding, label),
  });
  return {
    integrated: bindingValidator(policy.sourceModelBinding),
    candidate: bindingValidator(policy.sourceCandidateModelBinding),
    staging: { coastalPointStageIdentity,
      assertCandidateGCoastalPointRollbackContinuation,
      assertIntegratedCoastalPointContinuation: assertPost576CurrentGridIntegratedOriginal,
    },
  };
}

function assertCurrentGridOriginalMigrationIdentity(identity, expected) {
  const original = assertCurrentGridSamplingOriginalExpectation(expected);
  const policy = CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY;
  if (identity.schemaVersion !== policy.sourceDescriptionSchemaVersion
    || identity.kind !== policy.restoredSourceDescriptionKind
    || identity.expectedZoneCount !== policy.expectedZoneCount
    || identity.expectedPartCount !== policy.expectedPartCount
    || identity.privatePayloadIncluded !== false
    || ['sourceHead', 'datasetId', 'bundleContentSha256',
      'productionReferenceAt', 'generatedAt'].some(key => identity[key] !== original[key])
    || !same(identity.modelBinding, original.modelBinding)
    || !same(identity.contractHashes, original.contractHashes)
    || Date.parse(original.targetReferenceAt) <= Date.parse(original.productionReferenceAt)) {
    throw new Error('Current-grid migration is not the prepared original and a strictly newer target');
  }
  // TARGET_SOURCE is compared as itself. Never relabel it to CURRENT_SOURCE
  // to reconstruct or fabricate the normally prepared expectation.
}

export function validateCurrentGridOriginalPairGeneration(source) {
  const policy = CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY;
  const partMap = source?.coastalParts?.parts;
  const weatherZones = source?.zones;
  const scoreZones = source?.coastalParts?.zones;
  const reference = source?.productionReferenceAt;
  if (!isPlainObject(source) || !isPlainObject(partMap)
    || !isPlainObject(weatherZones) || !isPlainObject(scoreZones)
    || Object.keys(partMap).length !== policy.expectedPartCount
    || Object.keys(weatherZones).length !== policy.expectedZoneCount
    || !same(Object.keys(weatherZones).sort(), Object.keys(scoreZones).sort())
    || typeof reference !== 'string' || !Number.isFinite(Date.parse(reference))
    || Date.parse(reference) % 3_600_000 !== 0
    || new Date(reference).toISOString() !== reference) {
    throw new Error('Current-grid originals require the exact canonical national generation');
  }
  assertSame(source.coastalParts.modelBinding, policy.sourceModelBinding,
    'Current-grid original integrated binding');
  const roots = [
    ['ravScoreCandidateGRollback', 'rollbackModelBinding'],
    ['ravScoreCandidateGWarmup', 'candidateModelBinding'],
  ].filter(([root]) => Object.hasOwn(source, root));
  if (roots.length !== 1) throw new Error('Current-grid originals require exactly one Candidate runtime');
  const [rootName, bindingName] = roots[0];
  const measuredWarmup = rootName === 'ravScoreCandidateGWarmup';
  const descriptor = source[rootName];
  const candidateParts = descriptor?.runtime?.parts;
  const partIds = Object.keys(partMap).sort();
  if (!isPlainObject(descriptor) || !isPlainObject(candidateParts)
    || !same(Object.keys(candidateParts).sort(), partIds)) {
    throw new Error('Current-grid original Candidate inventory differs from all active parts');
  }
  assertSame(descriptor.sourceModelBinding, policy.sourceModelBinding,
    'Current-grid original Candidate source binding');
  assertSame(descriptor[bindingName], policy.sourceCandidateModelBinding,
    'Current-grid original Candidate descriptor binding');
  assertSame(descriptor.runtime.modelBinding, policy.sourceCandidateModelBinding,
    'Current-grid original Candidate runtime binding');
  const activeParts = [];
  const errors = [];
  for (const partId of partIds) {
    try {
      const part = partMap[partId];
      const candidatePart = candidateParts[partId];
      if (!isPlainObject(part) || !isPlainObject(candidatePart)
        || part.partId !== undefined && part.partId !== partId
        || candidatePart.partId !== undefined && candidatePart.partId !== partId
        || typeof part.zoneId !== 'string' || !Object.hasOwn(weatherZones, part.zoneId)
        || !measuredWarmup && candidatePart.zoneId !== part.zoneId) {
        throw new Error('original map key or parent-zone identity is incompatible');
      }
      const activePart = { ...part, partId };
      const identity = coastalPointStageIdentity(activePart);
      const integratedWrapper = part.ravScoreModel;
      const candidateWrapper = candidatePart.ravScoreModel;
      assertSame(bindingFromWrapper(integratedWrapper, `Part ${partId} original I wrapper`),
        policy.sourceModelBinding, `Part ${partId} original I wrapper binding`);
      if (measuredWarmup) {
        // The normal measured-warmup producer stores only this two-level
        // envelope. Its exact selected-family Candidate binding and matching part map bind
        // the state to the authenticated integrated part identity above.
        exactKeys(candidatePart, ['ravScoreModel'], `Part ${partId} original warmup part`);
        exactKeys(candidateWrapper, ['currentState'], `Part ${partId} original warmup wrapper`);
      } else {
        const candidateIdentity = coastalPointStageIdentity({ ...candidatePart, partId });
        if (identity.samplingContextKey !== candidateIdentity.samplingContextKey
          || identity.expectedCandidateGStateKey !== candidateIdentity.expectedCandidateGStateKey) {
          throw new Error('original I/C sampling identities differ');
        }
        assertSame(bindingFromWrapper(candidateWrapper, `Part ${partId} original C wrapper`),
          policy.sourceCandidateModelBinding, `Part ${partId} original C wrapper binding`);
      }
      const integrated = integratedWrapper.currentState;
      const candidate = candidateWrapper.currentState;
      if (assertPost576CurrentGridIntegratedOriginal(integrated, {
        samplingContextKey: identity.samplingContextKey,
        label: `Part ${partId} exact original integrated state`,
      }) !== integrated || assertCandidateGCoastalPointRollbackContinuation(candidate,
        identity.expectedCandidateGStateKey,
        { label: `Part ${partId} exact original Candidate state` }) !== candidate) {
        throw new Error('original validator replaced or normalized its state');
      }
      if (integrated.time !== candidate.time
        || !Number.isFinite(Date.parse(integrated.time))
        || Date.parse(integrated.time) > Date.parse(reference)) {
        throw new Error('original pair time is incompatible with its generation');
      }
      activeParts.push(activePart);
    } catch (error) {
      errors.push({ scope: partId, message: error.message });
    }
  }
  if (errors.length) throw new Error(
    `Current-grid originals rejected ${errors.length} part pair(s): ${summarizeIndependentErrors(errors)}`,
  );
  // Inventory/control validation ONLY. No durability, fresh sampling, usable
  // memory or production-preservation receipt follows from this return value.
  return { activeParts, candidateRoot: rootName };
}

function currentGridControlRecord(source, part, candidateRoot) {
  const integrated = part.ravScoreModel.currentState;
  const candidate = source[candidateRoot].runtime.parts[part.partId].ravScoreModel.currentState;
  const pair = { schemaVersion: 1, parentZoneId: part.zoneId, partId: part.partId,
    referenceAt: integrated.time, originalIntegratedState: integrated,
    originalCandidateGState: candidate };
  return dmiMarineCollectionAllowedForZone('dkss_lf', part.zoneId)
    ? { ...pair, kind: 'PRIVATE_CURRENT_DECODER_TRANSITION',
      coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1' }
    : { ...pair, kind: 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION',
      excludedCollection: 'dkss_lf', provedCurrentHours: 0, unknownCurrentHours: 49 };
}

export function retainCurrentGridOriginalControlArchive(source, migrated) {
  const { activeParts, candidateRoot } = validateCurrentGridOriginalPairGeneration(source);
  const originalParts = readOwnerCurrentTransitionArchive(source.ravScoreCurrentSourceDomainTransitions,
    activeParts, { targetReferenceAt: source.productionReferenceAt });
  for (const part of activeParts) {
    const previous = originalParts[part.partId] ?? null;
    // The WHOLE existing first record stays unchanged, not just its two raw
    // states. A first older LF archive is not an archive of the current FFC pair.
    const record = retainOwnerCurrentTransitionOriginal(previous === null
      ? currentGridControlRecord(source, part, candidateRoot) : null, previous, part);
    if (previous !== null) assertSame(record, previous, `Part ${part.partId} first original control record`);
    originalParts[part.partId] = record;
  }
  const archive = { schemaVersion: 1, kind: 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION_ARCHIVE',
    privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', parts: originalParts };
  assertSame(Object.keys(archive.parts).sort(), activeParts.map(part => part.partId).sort(),
    'Current-grid original control archive national inventory');
  migrated.ravScoreCurrentSourceDomainTransitions = archive;
  return archive;
}

export function classifyCurrentGridOriginalArchiveBridge({ source, migrated,
  bindingMetadataPaths, verifiedChangedPaths } = {}) {
  const { activeParts, candidateRoot } = validateCurrentGridOriginalPairGeneration(source);
  const archive = migrated?.ravScoreCurrentSourceDomainTransitions;
  exactKeys(archive, ['schemaVersion', 'kind', 'privacyClass', 'parts'],
    'Current-grid original control archive');
  if (archive.schemaVersion !== 1 || archive.kind !== 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION_ARCHIVE'
    || archive.privacyClass !== 'PRIVATE_PRODUCTION_RUNTIME' || !isPlainObject(archive.parts)
    || !same(Object.keys(archive.parts).sort(), activeParts.map(part => part.partId).sort())) {
    throw new Error('Current-grid original bridge lacks its exact national control archive');
  }
  const previous = readOwnerCurrentTransitionArchive(source.ravScoreCurrentSourceDomainTransitions,
    activeParts, { targetReferenceAt: source.productionReferenceAt });
  for (const part of activeParts) {
    const record = archive.parts[part.partId];
    // Normal record validator, one part at a time. Do not allocate a second
    // entire 673-pair expected archive merely to classify the real difference.
    retainOwnerCurrentTransitionOriginal(null, record, part);
    assertSame(record, previous[part.partId]
      ?? currentGridControlRecord(source, part, candidateRoot),
    `Part ${part.partId} exact original control archive record`);
  }
  const allChanges = collectChangedPaths(source, migrated);
  const allowed = new Set(verifiedChangedPaths);
  if (allChanges.some(value => !allowed.has(value))
    || [...allowed].some(value => !allChanges.includes(value))) {
    throw new Error('Current-grid original archive bridge has unverified changes');
  }
  const archivePath = value => value === 'ravScoreCurrentSourceDomainTransitions'
    || value.startsWith('ravScoreCurrentSourceDomainTransitions.');
  const before = { ...source };
  const after = { ...migrated };
  delete before.ravScoreCurrentSourceDomainTransitions;
  delete after.ravScoreCurrentSourceDomainTransitions;
  if (classifyVerifiedRuntimeMigration({ source: before, migrated: after,
    bindingMetadataPaths, verifiedChangedPaths: [...allowed].filter(value => !archivePath(value)),
  }) !== 'MODEL_BINDING_METADATA_ONLY') {
    throw new Error('Current-grid bridge must preserve every value outside exact bindings and original control records');
  }
  // NOT same-T metadata CAS; normal NEW-T reconstruction must qualify fresh
  // grid evidence. Durable complete old B/S is a separate mandatory gate.
  return 'CURRENT_GRID_ORIGINAL_ARCHIVE_BRIDGE';
}

export function preserveOwnerCurrentOriginalPairs(source, migrated) {
  const partMap = source.coastalParts?.parts;
  const activeParts = Object.entries(partMap ?? {}).map(([partId, part]) => ({ ...part, partId }));
  if (activeParts.length !== 673) throw new Error('Original-pair archive requires all 673 active identities');
  // Parent identities come from the authenticated original runtime, not a
  // spelling convention: legitimate island zones have additional ID segments.
  const weatherZones = source.zones;
  const scoreZones = source.coastalParts?.zones;
  if (!isPlainObject(weatherZones) || !isPlainObject(scoreZones)
    || Object.keys(weatherZones).length !== 210 || Object.keys(scoreZones).length !== 210
    || Object.keys(weatherZones).some(zoneId => !Object.hasOwn(scoreZones, zoneId))
    || Object.entries(partMap).some(([partId, part]) => !isPlainObject(part)
    || (part.partId !== undefined && part.partId !== partId)
    || typeof part.zoneId !== 'string' || !Object.hasOwn(weatherZones, part.zoneId))) {
    throw new Error('Original-pair archive requires exact parent-zone and part identities');
  }
  const roots = ['ravScoreCandidateGRollback', 'ravScoreCandidateGWarmup']
    .filter(key => Object.hasOwn(source, key));
  if (roots.length !== 1) throw new Error('Original-pair archive requires one Candidate G runtime');
  const originalParts = readOwnerCurrentTransitionArchive(source.ravScoreCurrentSourceDomainTransitions,
    activeParts, { targetReferenceAt: source.productionReferenceAt });
  for (const part of activeParts) {
    if (dmiMarineCollectionAllowedForZone('dkss_lf', part.zoneId)) continue;
    const originalIntegratedState = part.ravScoreModel?.currentState;
    const originalCandidateGState = source[roots[0]].runtime?.parts?.[part.partId]?.ravScoreModel?.currentState;
    const record = { schemaVersion: 1, kind: 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION',
      parentZoneId: part.zoneId, partId: part.partId, excludedCollection: 'dkss_lf',
      referenceAt: originalIntegratedState?.time,
      // This bridge does not evaluate input. Every slot remains unproved;
      // actual permitted-source reconstruction takes place only at NEW T.
      provedCurrentHours: 0, unknownCurrentHours: 49,
      originalIntegratedState: structuredClone(originalIntegratedState),
      originalCandidateGState: structuredClone(originalCandidateGState) };
    originalParts[part.partId] = retainOwnerCurrentTransitionOriginal(record,
      originalParts[part.partId] ?? null, part);
  }
  const archive = { schemaVersion: 1, kind: 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION_ARCHIVE',
    privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', parts: originalParts };
  readOwnerCurrentTransitionArchive(archive, activeParts, { targetReferenceAt: source.productionReferenceAt });
  migrated.ravScoreCurrentSourceDomainTransitions = archive;
  return archive;
}

export async function assertExactRuntimeInventory(sourceRoot) {
  const allowed = [...PRIVATE_RUNTIME_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE,
    PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE];
  const byPath = new Map(allowed.map(item => [item.relativePath, item]));
  const directories = new Set(allowed.flatMap(({ relativePath }) => {
    const segments = relativePath.split('/');
    return segments.slice(0, -1).map((_, index) => segments.slice(0, index + 1).join('/'));
  }));
  const actual = [];
  async function walk(directory, relative = '') {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const childRelative = relative ? path.join(relative, entry.name) : entry.name;
      const child = path.join(directory, entry.name);
      const stat = await fs.lstat(child);
      if (stat.isSymbolicLink()) throw new Error('Private runtime inventory contains a symbolic link');
      const normalized = childRelative.split(path.sep).join('/');
      if (stat.isDirectory()) {
        if (!directories.has(normalized)) throw new Error('Private runtime inventory contains an unapproved directory');
        await walk(child, childRelative);
      } else if (stat.isFile()) {
        if (!byPath.has(normalized)) throw new Error('Private runtime inventory contains an unapproved file');
        actual.push(byPath.get(normalized));
      }
      else throw new Error('Private runtime inventory contains a non-regular entry');
    }
  }
  await walk(sourceRoot);
  const hasExtension = assertPrivateRuntimeInventory(actual);
  const conditions = await readJson(path.join(sourceRoot, 'data/live/conditions.json'), 'Private runtime conditions inventory');
  if (privateWeatherComponentMarker(conditions) && !hasExtension) {
    throw new Error('Private runtime component marker requires its preserved input pack');
  }
  const hasPublicHourDelivery = actual.some(item =>
    item.id === PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.id);
  if (Boolean(privatePublicHourDeliveryMarker(conditions)) !== hasPublicHourDelivery) {
    throw new Error('Private runtime public-hour marker requires its preserved pack');
  }
  return allowed.filter(item => actual.includes(item));
}

async function digestPrivateRuntimeFile(filePath) {
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
    bytes += chunk.length;
  }
  return { bytes, sha256: hash.digest('hex') };
}

function currentGridOriginalManifestFiles(manifest) {
  if (manifest.schemaVersion !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.schemaVersion
    || manifest.kind !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.kind
    || manifest.privacyClass !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass
    || manifest.fileCount !== manifest.files.length
    || privateRuntimeBundleContentSha256(manifest) !== manifest.bundleContentSha256) {
    throw new Error('Current-grid original sealed manifest is invalid');
  }
  const files = new Map();
  for (const file of manifest.files) {
    exactKeys(file, ['id', 'relativePath', 'bytes', 'sha256', 'privacyClass'],
      'Current-grid original sealed file');
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0
      || !SHA256.test(file.sha256)
      || file.privacyClass !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass
      || files.has(file.id)) {
      throw new Error('Current-grid original sealed file inventory is invalid');
    }
    files.set(file.id, Object.freeze({ ...file }));
  }
  return files;
}

export async function assertRestoredOriginalInventory(sourceRoot, manifest) {
  assertPrivateRuntimeInventory(manifest.files);
  assertSame(privateRuntimeBundleContentSha256(manifest), manifest.bundleContentSha256,
    'Preserved original manifest content hash');
  const inventory = await assertExactRuntimeInventory(sourceRoot);
  assertSame([...inventory].sort((a, b) => a.id.localeCompare(b.id)),
    manifest.files.map(({ id, relativePath }) => ({ id, relativePath }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    'Preserved original file inventory');
  for (const file of manifest.files) {
    assertSame(await digestPrivateRuntimeFile(path.join(sourceRoot, file.relativePath)),
      { bytes: file.bytes, sha256: file.sha256 }, 'Preserved original file bytes');
  }
  return inventory;
}

export function assertMetadataOnlyMigrationResult(result) {
  if (result.transitionKind !== 'MODEL_BINDING_METADATA_ONLY'
    || result.repairedContinuationCount !== 0 || result.recomputedModeCount !== 0
    || result.recomputedZoneCount !== 0) {
    throw new Error('Assistant successor requires the actual metadata-only migration');
  }
}

// This rechecks the SAME normal migration's retained source and output after
// local preparation. The workflow must first run that migration with its hard
// metadata-only requirement; an independently supplied report is not authority.
export function assertUserdataPrewriteBindings(identity, previousCandidate, currentIntegrated, currentCandidate, currentContractHashes) {
  if (identity.modelBinding.modelBundleSha256 !== 'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb'
    || previousCandidate.modelBundleSha256 !== '8d9142b5f7d9b5a3e5a0f3593e73df0c7ffaf3d80c036317967cb713f09197e3'
    || currentIntegrated.modelBundleSha256 !== '249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932'
    || currentCandidate.modelBundleSha256 !== '55fd7dfa5ee36596c729d93225a448ea5b8f1e7142c44b8b1bda5c3d4d84c957'
    || identity.contractHashes.continuationStateContractSha256 !== '4115f37178ff3d8eab540f3d9355a1275a13a9dd3a896e07f06673564e76ee51'
    || currentContractHashes.continuationStateContractSha256 !== 'a5430dd21e3135d6efc09e22df3dd0cdcafee723f962ff1d3cb52e7765b2aaa0') {
    throw new Error('Userdata pre-write proof is outside its exact successor');
  }
}

// Separate fixed successor. Never reinterpret the historic userdata grant.
export function assertAccountAssistantPrewriteBindings(identity, previousCandidate, currentIntegrated, currentCandidate, currentContractHashes) {
  if (identity.modelBinding.modelBundleSha256 !== '249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932'
    || previousCandidate.modelBundleSha256 !== '55fd7dfa5ee36596c729d93225a448ea5b8f1e7142c44b8b1bda5c3d4d84c957'
    || currentIntegrated.modelBundleSha256 !== 'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5'
    || currentCandidate.modelBundleSha256 !== '2fdc7426ea99382731c6f4d118eacf4fc271f505fcf121bc67c5349c62938af9'
    || identity.contractHashes.continuationStateContractSha256 !== 'a5430dd21e3135d6efc09e22df3dd0cdcafee723f962ff1d3cb52e7765b2aaa0'
    || currentContractHashes.continuationStateContractSha256 !== '7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b') {
    throw new Error('Account/assistant pre-write proof is outside its exact successor');
  }
}

// Resolve only the three fixed CLI intents before constructing any client.
export function assertExclusivePrewriteIntent(argv) {
  const flags = ['--verify-assistant-prewrite', '--verify-userdata-prewrite', '--verify-account-assistant-prewrite'];
  const selected = argv.filter(value => flags.includes(value));
  if (selected.length > 1) throw new Error('Pre-write intent is ambiguous');
  if (selected.length && argv.includes('--current-grid-original')) {
    throw new Error('Pre-write intent cannot use the current-grid-original route');
  }
  if (selected.length && argv.includes('--owner-current-original')) {
    throw new Error('Pre-write intent cannot use the owner-current-original route');
  }
}

export async function verifyAccountAssistantPrewritePreservation(options = {}) {
  return verifyBindingPrewritePreservation(options, 'account-assistant');
}

export async function verifyAssistantPrewritePreservation(options = {}) {
  return verifyBindingPrewritePreservation(options, 'assistant');
}

export async function verifyUserdataPrewritePreservation(options = {}) {
  return verifyBindingPrewritePreservation(options, 'userdata');
}

async function verifyBindingPrewritePreservation({ sourceRoot, outputRoot,
  bundleManifestPath, predecessorDescriptorPath, request,
  predecessorRoot, repositoryRoot, expectedSourceHead, reportPath } = {}, intent) {
  const identity = validatePredecessorIdentity(
    await readJson(predecessorDescriptorPath, 'Preserved predecessor identity'), expectedSourceHead);
  const repository = await fs.realpath(repositoryRoot);
  const source = await assertDirectoryOutside(repository, sourceRoot, 'Preserved original runtime');
  const output = await assertDirectoryOutside(repository, outputRoot, 'Prepared successor runtime');
  const predecessor = await assertDirectoryOutside(repository, predecessorRoot, 'Original reader source');
  const modules = await importPredecessorModules(predecessor, expectedSourceHead);
  const manifest = await readJson(bundleManifestPath, 'Preserved original manifest');
  validatePredecessorManifest(manifest, modules.integrated.ravScoreModelBinding(), identity);
  const oldReader = await import(pathToFileURL(path.join(predecessor,
    'scripts/private-production-runtime-bundle.mjs')).href);
  await oldReader.verifyPrivateProductionRuntimeBundle({
    privateRoot: path.dirname(path.dirname(bundleManifestPath)),
    bundlePath: path.dirname(bundleManifestPath), repositoryRoot: predecessor,
    expected: { modelBinding: identity.modelBinding, contractHashes: identity.contractHashes,
      datasetId: identity.datasetId, productionReferenceAt: identity.productionReferenceAt },
  });
  const inventory = await assertRestoredOriginalInventory(source, manifest);
  assertSame(await assertExactRuntimeInventory(output), inventory, 'Prepared successor inventory');
  const report = await readJson(reportPath, 'Same normal migration result');
  const currentIntegrated = ravScoreModelBinding();
  const currentCandidate = candidateModelBinding();
  if (intent === 'account-assistant') {
    assertAccountAssistantPrewriteBindings(identity, modules.candidate.ravScoreModelBinding(),
      currentIntegrated, currentCandidate, await privateRuntimeContractHashes({ repositoryRoot: repository }));
  } else if (intent === 'userdata') {
    assertUserdataPrewriteBindings(identity, modules.candidate.ravScoreModelBinding(),
      currentIntegrated, currentCandidate, await privateRuntimeContractHashes({ repositoryRoot: repository }));
  } else if (identity.modelBinding.modelBundleSha256 !== 'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb'
    || modules.candidate.ravScoreModelBinding().modelBundleSha256 !== '8d9142b5f7d9b5a3e5a0f3593e73df0c7ffaf3d80c036317967cb713f09197e3'
    || currentIntegrated.modelBundleSha256 !== '34a25729a3dbddc8c73870a69f7b3a6899c7f1df9829c8078782139ff4e0e839'
    || currentCandidate.modelBundleSha256 !== 'd064d3501541cdaa09fe6bf0fb073feeecf59fdacfa623d4006c7442d69dad72') {
    throw new Error('Assistant pre-write proof is outside its exact successor');
  }
  if (report.schemaVersion !== 2 || report.kind !== 'RAVRADAR_POST_CUTOVER_PRIVATE_RUNTIME_REBIND'
    || report.transitionKind !== 'MODEL_BINDING_METADATA_ONLY' || report.migratedPartCount !== 673
    || report.measurementsChanged !== false || report.candidateStatesChanged !== false
    || report.privatePayloadIncluded !== false || report.copiedPrivateFileCount !== inventory.length) {
    throw new Error('Assistant pre-write normal migration result is invalid');
  }
  for (const [key, value] of Object.entries({ predecessorSourceHead: identity.sourceHead,
    datasetId: identity.datasetId, sourceBundleContentSha256: identity.bundleContentSha256,
    previousIntegratedBundleSha256: identity.modelBinding.modelBundleSha256,
    currentIntegratedBundleSha256: currentIntegrated.modelBundleSha256,
    previousCandidateBundleSha256: modules.candidate.ravScoreModelBinding().modelBundleSha256,
    currentCandidateBundleSha256: currentCandidate.modelBundleSha256,
    previousContractHashes: identity.contractHashes,
    currentContractHashes: await privateRuntimeContractHashes({ repositoryRoot: repository }) })) {
    assertSame(report[key], value, 'Same normal migration identity');
  }
  for (const file of manifest.files) {
    const expected = file.id === 'full-conditions'
      ? { bytes: report.migratedConditionsBytes, sha256: report.migratedConditionsSha256 }
      : file.id === PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.id && report.publicHourDeliveryRebound
        ? { bytes: report.migratedPublicHourPackBytes, sha256: report.migratedPublicHourPackSha256 }
        : { bytes: file.bytes, sha256: file.sha256 };
    assertSame(await digestPrivateRuntimeFile(path.join(output, file.relativePath)), expected,
      'Same normal migration output bytes');
  }
  // Check the actual whole condition documents as well as their byte receipts.
  const original = hydratePrivateConditionsHourly(await readJson(path.join(source, 'data/live/conditions.json'), 'Original conditions'));
  const prepared = hydratePrivateConditionsHourly(await readJson(path.join(output, 'data/live/conditions.json'), 'Prepared conditions'));
  const bindingPaths = [
    ...migrateExactModelBindingMetadata(original, identity.modelBinding, currentIntegrated),
    ...migrateExactModelBindingMetadata(original, modules.candidate.ravScoreModelBinding(), currentCandidate),
  ];
  for (const [partId, part] of Object.entries(original.coastalParts?.parts ?? {})) {
    const sampling = coastalPointStageIdentity({ ...part, partId });
    modules.staging.assertIntegratedCoastalPointContinuation(part.ravScoreModel?.currentState,
      { samplingContextKey: sampling.samplingContextKey });
    if (part.ravScoreModel.currentState.modelBundleSha256 !== identity.modelBinding.modelBundleSha256) {
      throw new Error('Assistant original continuation has another binding');
    }
    part.ravScoreModel.currentState.modelBundleSha256 = currentIntegrated.modelBundleSha256;
    assertIntegratedCoastalPointContinuation(part.ravScoreModel.currentState,
      { samplingContextKey: sampling.samplingContextKey });
  }
  const remaining = collectChangedPaths(original, prepared);
  if (!bindingPaths.length || remaining.some(key =>
    !/^publicHourDelivery\.(sourceDetailsSha256|startupNationalForecastSha256|rawBytes|packBytes|packSha256)$/.test(key))) {
    throw new Error('Assistant prepared runtime changes more than exact binding metadata');
  }
  await assertRestoredOriginalInventory(source, manifest);
  const fresh = await describeTargetProtectedPrivateProductionRuntime({ request,
    targetReferenceAt: identity.productionReferenceAt });
  assertSame(fresh, identity, 'Fresh selected protected generation');
  return { preserved: true, fileCount: inventory.length, privatePayloadIncluded: false };
}

export async function copyPrivateRuntimeInventory(sourceRoot, outputRoot, inventory, {
  skipRelativePaths = [],
  expectedFileDigests = null,
} = {}) {
  assertPrivateRuntimeInventory(inventory);
  assertSame(await assertExactRuntimeInventory(sourceRoot), inventory, 'Private runtime copy inventory');
  const skipped = new Set(skipRelativePaths);
  for (const descriptor of inventory) {
    if (skipped.has(descriptor.relativePath)) continue;
    const from = path.join(sourceRoot, descriptor.relativePath);
    const to = path.join(outputRoot, descriptor.relativePath);
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to, fs.constants.COPYFILE_EXCL);
    // The bounded extension can be large: hash streams, never buffer both copies.
    const [before, after] = await Promise.all([
      digestPrivateRuntimeFile(from), digestPrivateRuntimeFile(to),
    ]);
    assertSame(before, after, `${descriptor.id} unchanged migration copy`);
    if (expectedFileDigests) {
      const original = expectedFileDigests.get(descriptor.id);
      if (!original || original.relativePath !== descriptor.relativePath) {
        throw new Error('Private runtime copy lacks its exact original descriptor');
      }
      const expected = { bytes: original.bytes, sha256: original.sha256 };
      assertSame(before, expected, `${descriptor.id} sealed original input`);
      assertSame(after, expected, `${descriptor.id} sealed original copy`);
    }
  }
}

export function validatePredecessorManifest(
  manifest,
  oldIntegratedBinding,
  predecessor = POST_CUTOVER_PREDECESSOR,
) {
  const expected = {
    datasetId: predecessor?.datasetId,
    bundleContentSha256: predecessor?.bundleContentSha256,
    productionReferenceAt: predecessor?.productionReferenceAt,
    generatedAt: predecessor?.generatedAt,
    zoneCount: predecessor?.expectedZoneCount,
    partCount: predecessor?.expectedPartCount,
  };
  const actual = isPlainObject(manifest)
    ? Object.fromEntries(Object.keys(expected).map(key => [key, manifest[key]]))
    : null;
  const mismatches = actual === null
    ? ['manifest']
    : Object.keys(expected).filter(key => actual[key] !== expected[key]);
  if (mismatches.length) {
    const details = mismatches.map(key => ({
      field: key,
      expected: expected[key] ?? null,
      actual: actual?.[key] ?? null,
    }));
    throw new Error(`Protected predecessor bundle identity is not exact: ${JSON.stringify(details)}`);
  }
  assertSame(manifest.modelBinding, predecessor.modelBinding, 'Protected bundle model binding');
  assertSame(manifest.modelBinding, oldIntegratedBinding, 'Archived-source model binding');
  assertSame(manifest.contractHashes, predecessor.contractHashes, 'Protected bundle contract hashes');
}

async function validateAndMigrateConditions({
  source,
  predecessor,
  oldStaging,
  oldIntegratedBinding,
  oldCandidateBinding,
  currentIntegratedBinding,
  currentCandidateBinding,
  publicHourPackSourcePath,
  publicHourPackTargetPath,
  ownerCurrentOriginalOnly = false,
  currentGridOriginalOnly = false,
}) {
  if (ownerCurrentOriginalOnly && currentGridOriginalOnly) {
    throw new Error('Original migration policies cannot be combined');
  }
  // All 673 old I/C pairs are validated BEFORE cloning or stamping a working
  // successor. This is original-control validation, not native-current proof.
  if (currentGridOriginalOnly) validateCurrentGridOriginalPairGeneration(source);
  if (!isPlainObject(source)
      || source.datasetId !== predecessor.datasetId
      || Object.keys(source.zones ?? {}).length !== predecessor.expectedZoneCount
      || Object.keys(source.coastalParts?.parts ?? {}).length !== predecessor.expectedPartCount) {
    throw new Error('Predecessor conditions do not contain the exact expected dataset');
  }
  oldIntegratedBinding.assertRavScoreModelBinding(
    source.coastalParts.modelBinding,
    'Predecessor coastal-parts binding',
  );
  assertSame(source.coastalParts.modelBinding, predecessor.modelBinding,
    'Predecessor coastal-parts binding');
  assertRavScoreModelBinding(currentIntegratedBinding, 'Current integrated model binding');
  assertBindingUpgrade(source.coastalParts.modelBinding, currentIntegratedBinding,
    'Integrated model binding', { requireChange: false });
  if (currentGridOriginalOnly) assertBindingUpgrade(source.coastalParts.modelBinding,
    currentIntegratedBinding, 'Current-grid integrated successor');
  oldCandidateBinding.assertRavScoreModelBinding(oldCandidateBinding.ravScoreModelBinding(),
    'Predecessor Candidate G binding');
  assertCandidateBinding(currentCandidateBinding, 'Current Candidate G binding');
  assertBindingUpgrade(oldCandidateBinding.ravScoreModelBinding(), currentCandidateBinding,
    'Candidate G model binding', { requireChange: false });
  if (currentGridOriginalOnly) assertBindingUpgrade(oldCandidateBinding.ravScoreModelBinding(),
    currentCandidateBinding, 'Current-grid Candidate G successor');

  const predecessorIntegratedBinding = oldIntegratedBinding.ravScoreModelBinding();
  const predecessorCandidateBinding = oldCandidateBinding.ravScoreModelBinding();
  const migrated = structuredClone(source);
  const integratedMetadataPaths = migrateExactModelBindingMetadata(
    migrated,
    predecessorIntegratedBinding,
    currentIntegratedBinding,
    { label: 'Integrated saved runtime metadata' },
  );
  const candidateMetadataPaths = migrateExactModelBindingMetadata(
    migrated,
    predecessorCandidateBinding,
    currentCandidateBinding,
    { label: 'Candidate G saved runtime metadata' },
  );
  const exactAllowedPaths = new Set([
    ...integratedMetadataPaths,
    ...candidateMetadataPaths,
  ]);
  const bindingMetadataPaths = new Set(exactAllowedPaths);
  const errors = [];
  let repairedContinuationCount = 0;
  let recomputedModeCount = 0;
  let recomputedZoneCount = 0;
  const zonesRequiringProjection = new Set();
  const partIds = Object.keys(source.coastalParts.parts).sort();
  for (const partId of partIds) {
    try {
      const originalPart = source.coastalParts.parts[partId];
      const migratedPart = migrated.coastalParts.parts[partId];
      if (originalPart?.partId !== undefined && originalPart.partId !== partId) {
        throw new Error('partId field disagrees with map key');
      }
      const identityInput = { ...originalPart, partId };
      const oldIdentity = oldStaging.coastalPointStageIdentity(identityInput);
      const currentIdentity = coastalPointStageIdentity(identityInput);
      if (oldIdentity.samplingContextKey !== currentIdentity.samplingContextKey
          || oldIdentity.expectedCandidateGStateKey !== currentIdentity.expectedCandidateGStateKey) {
        throw new Error('sampling identity changed');
      }
      const originalWrapper = originalPart?.ravScoreModel;
      const migratedWrapper = migratedPart?.ravScoreModel;
      oldIntegratedBinding.assertRavScoreModelBinding(
        bindingFromWrapper(originalWrapper, `Part ${partId} wrapper`),
        `Part ${partId} predecessor wrapper binding`,
      );
      assertRavScoreModelBinding(
        bindingFromWrapper(migratedWrapper, `Part ${partId} migrated wrapper`),
        `Part ${partId} migrated wrapper binding`,
      );
      if (migratedWrapper.currentState?.modelBundleSha256
          !== predecessor.modelBinding.modelBundleSha256) {
        throw new Error('continuation does not carry the predecessor bundle hash');
      }
      if (predecessorIntegratedBinding.modelBundleSha256
          !== currentIntegratedBinding.modelBundleSha256) {
        migratedWrapper.currentState.modelBundleSha256 = currentIntegratedBinding.modelBundleSha256;
        exactAllowedPaths.add(
          `coastalParts.parts.${partId}.ravScoreModel.currentState.modelBundleSha256`,
        );
        bindingMetadataPaths.add(
          `coastalParts.parts.${partId}.ravScoreModel.currentState.modelBundleSha256`,
        );
      }
      const reconciliation = reconcileIntegratedContinuation({
        originalState: originalWrapper.currentState,
        migratedState: migratedWrapper.currentState,
        assertPredecessor: state => oldStaging.assertIntegratedCoastalPointContinuation(state, {
          samplingContextKey: oldIdentity.samplingContextKey,
          label: `Part ${partId} predecessor continuation`,
        }),
        canonicalizeCurrent: state => {
          assertIntegratedCoastalPointContinuation(state, {
            samplingContextKey: currentIdentity.samplingContextKey,
            label: `Part ${partId} migrated continuation`,
          });
          const replay = buildIntegratedRavScoreStateSeries([], {
            samplingContextKey: currentIdentity.samplingContextKey,
            initialState: state,
          });
          if (replay.initialStateAccepted !== true
              || replay.initialStateSource !== 'INTEGRATED_CONTINUATION'
              || !isPlainObject(replay.continuationState)) {
            throw new Error(`Part ${partId} current continuation repair is not canonical`);
          }
          return replay.continuationState;
        },
      });
      if (ownerCurrentOriginalOnly && reconciliation.repairPaths.length) {
        throw new Error('Owner current metadata bridge must not repair or recompute state');
      }
      if (currentGridOriginalOnly && reconciliation.repairPaths.length) {
        throw new Error('Current-grid original bridge must not repair or recompute state');
      }
      migratedWrapper.currentState = reconciliation.canonicalState;
      for (const repairPath of reconciliation.repairPaths) {
        exactAllowedPaths.add(
          `coastalParts.parts.${partId}.ravScoreModel.currentState.${repairPath}`,
        );
      }
      if (reconciliation.repairPaths.length > 0) {
        repairedContinuationCount += 1;
        const projection = reconcileIntegratedCurrentPartProjection({
          part: migratedPart,
          scoreProfile: migrated.coastalParts.scoreProfile,
        });
        let currentProjectionChanged = false;
        for (const mode of ['waders', 'beach']) {
          const modelPrefix = `coastalParts.parts.${partId}.ravScoreModel.modes.${mode}`;
          const currentPrefix = `coastalParts.parts.${partId}.current.${mode}`;
          const modelChanges = addExactChangedPaths(
            exactAllowedPaths,
            migratedWrapper.modes?.[mode],
            projection.modes[mode],
            modelPrefix,
          );
          const publicChanges = addExactChangedPaths(
            exactAllowedPaths,
            migratedPart.current?.[mode],
            projection.current[mode],
            currentPrefix,
          );
          if (modelChanges.length || publicChanges.length) recomputedModeCount += 1;
          if (publicChanges.length) currentProjectionChanged = true;
        }
        migratedWrapper.modes = projection.modes;
        migratedPart.current = projection.current;
        if (currentProjectionChanged) {
          if (typeof migratedPart.zoneId !== 'string' || !migratedPart.zoneId) {
            throw new Error('current projection has no parent zone');
          }
          zonesRequiringProjection.add(migratedPart.zoneId);
        }
      }
    } catch (error) {
      errors.push({ scope: partId, message: error.message });
    }
  }

  for (const zoneId of [...zonesRequiringProjection].sort()) {
    try {
      const zone = migrated.coastalParts.zones?.[zoneId];
      if (!isPlainObject(zone)
          || !Number.isInteger(zone.expectedPartCount)
          || !Array.isArray(zone.hourly)
          || typeof zone.currentReferenceAt !== 'string') {
        throw new Error('current score-zone projection is incomplete');
      }
      const zoneParts = Object.entries(migrated.coastalParts.parts)
        .filter(([, part]) => part?.zoneId === zoneId)
        .map(([partId, part]) => ({
          partId,
          name: part.name,
          scores: [part.current],
        }));
      const projected = buildIntegratedZoneHourlyProjection({
        rows: zoneParts,
        expectedPartCount: zone.expectedPartCount,
        selectedMode: (scoreRow, mode) => scoreRow?.[mode],
        marginPoints: migrated.coastalParts.marginPoints,
      });
      if (projected.length !== 1 || projected[0]?.time !== zone.currentReferenceAt) {
        throw new Error('current score-zone projection does not match its exact reference hour');
      }
      const indexes = zone.hourly
        .map((row, index) => row?.time === zone.currentReferenceAt ? index : -1)
        .filter(index => index >= 0);
      if (indexes.length !== 1) {
        throw new Error('current score-zone reference hour is not unique');
      }
      const index = indexes[0];
      const zoneChanges = addExactChangedPaths(
        exactAllowedPaths,
        zone.hourly[index],
        projected[0],
        `coastalParts.zones.${zoneId}.hourly.${index}`,
      );
      if (zoneChanges.length) {
        zone.hourly[index] = projected[0];
        recomputedZoneCount += 1;
      }
    } catch (error) {
      errors.push({ scope: zoneId, message: error.message });
    }
  }

  const candidateRoots = [
    ['ravScoreCandidateGRollback', 'rollbackModelBinding'],
    ['ravScoreCandidateGWarmup', 'candidateModelBinding'],
  ].filter(([root]) => source[root] !== undefined);
  if (candidateRoots.length !== 1) errors.push({
    scope: 'candidate-runtime',
    message: 'Exactly one private Candidate G runtime root is required',
  });
  if (candidateRoots.length === 1) {
    const [rootName, bindingName] = candidateRoots[0];
    try {
      const originalDescriptor = source[rootName];
      const migratedDescriptor = migrated[rootName];
      assertSame(originalDescriptor.sourceModelBinding, oldIntegratedBinding.ravScoreModelBinding(),
        `${rootName} predecessor source binding`);
      assertSame(originalDescriptor[bindingName], oldCandidateBinding.ravScoreModelBinding(),
        `${rootName} predecessor Candidate G binding`);
      assertSame(originalDescriptor.runtime?.modelBinding, oldCandidateBinding.ravScoreModelBinding(),
        `${rootName} predecessor runtime binding`);
      assertSame(migratedDescriptor.sourceModelBinding, currentIntegratedBinding,
        `${rootName} migrated source binding`);
      assertSame(migratedDescriptor[bindingName], currentCandidateBinding,
        `${rootName} migrated Candidate G binding`);
      assertSame(migratedDescriptor.runtime?.modelBinding, currentCandidateBinding,
        `${rootName} migrated runtime binding`);
      const candidatePartIds = Object.keys(originalDescriptor.runtime?.parts ?? {}).sort();
      if (!same(candidatePartIds, partIds)) throw new Error('Candidate G runtime part inventory differs');
      for (const partId of candidatePartIds) {
        const identity = oldStaging.coastalPointStageIdentity({
          ...source.coastalParts.parts[partId],
          partId,
        });
        const originalState = originalDescriptor.runtime.parts[partId]?.ravScoreModel?.currentState;
        const migratedState = migratedDescriptor.runtime.parts[partId]?.ravScoreModel?.currentState;
        oldStaging.assertCandidateGCoastalPointRollbackContinuation(
          originalState,
          identity.expectedCandidateGStateKey,
          { label: `Part ${partId} predecessor Candidate G continuation` },
        );
        assertCandidateGCoastalPointRollbackContinuation(
          migratedState,
          identity.expectedCandidateGStateKey,
          { label: `Part ${partId} migrated Candidate G continuation` },
        );
        if (!same(originalState, migratedState)) throw new Error(`Part ${partId} Candidate G state changed`);
      }
    } catch (error) {
      errors.push({ scope: rootName, message: error.message });
    }
  }
  if (errors.length) {
    throw new Error(
      `Private runtime migration rejected ${errors.length} independent error(s): ${summarizeIndependentErrors(errors)}`,
    );
  }
  const ownerArchiveRequired=ownerCurrentOriginalOnly
    && source.coastalParts.modelBinding?.modelBundleSha256
      === OWNER_CURRENT_DOMAIN_PREDECESSOR.modelBinding.modelBundleSha256;
  if (ownerArchiveRequired) {
    preserveOwnerCurrentOriginalPairs(source, migrated);
    for (const changed of collectChangedPaths(source.ravScoreCurrentSourceDomainTransitions,
      migrated.ravScoreCurrentSourceDomainTransitions, 'ravScoreCurrentSourceDomainTransitions')) {
      exactAllowedPaths.add(changed);
    }
  }
  let publicHourDeliveryRebound = false;
  if (currentGridOriginalOnly) {
    retainCurrentGridOriginalControlArchive(source, migrated);
    for (const changed of collectChangedPaths(source.ravScoreCurrentSourceDomainTransitions,
      migrated.ravScoreCurrentSourceDomainTransitions, 'ravScoreCurrentSourceDomainTransitions')) {
      exactAllowedPaths.add(changed);
    }
  }
  const sourcePublicHourMarker = privatePublicHourDeliveryMarker(source);
  if (sourcePublicHourMarker
      && sourcePublicHourMarker.modelBinding.modelBundleSha256
        !== currentIntegratedBinding.modelBundleSha256) {
    if (typeof publicHourPackSourcePath !== 'string'
        || typeof publicHourPackTargetPath !== 'string') {
      throw new Error('Private public-hour pack rebind paths are missing');
    }
    // The main metadata pass already upgraded every recognized nested model
    // carrier in this marker. Do not clone the predecessor again here: that
    // would silently put an old binding back into the retained forecast.
    const targetMarker = structuredClone(migrated.publicHourDelivery);
    targetMarker.modelBinding = structuredClone(currentIntegratedBinding);
    targetMarker.startupNationalForecast = {
      ...targetMarker.startupNationalForecast,
      modelBinding: structuredClone(currentIntegratedBinding),
    };
    targetMarker.startupNationalForecastSha256 = sha256Text(
      canonicalPublicRuntimeJson(targetMarker.startupNationalForecast),
    );
    const targetDetailsSha256 = sha256Text(
      compactJson(buildPublicConditionDetails(migrated)),
    );
    targetMarker.sourceDetailsSha256 = targetDetailsSha256;
    migrated.publicHourDelivery = targetMarker;
    const rebound = await rebindPublicHourPackExact({
      sourcePackPath: publicHourPackSourcePath,
      sourceConditions: source,
      targetConditions: migrated,
      targetDetailsSha256,
      outputPath: publicHourPackTargetPath,
      rebindDocumentMetadata: (document, time) => {
        const changed = migrateExactModelBindingMetadata(
          document,
          predecessorIntegratedBinding,
          currentIntegratedBinding,
          { label: `Public hour ${time} model metadata` },
        );
        if (!changed.some(path => path === 'coastalParts.modelBinding.modelBundleSha256')) {
          throw new Error(`Public hour ${time} did not rebind its nested coastal model`);
        }
      },
    });
    Object.assign(migrated.publicHourDelivery, rebound);
    const publicHourDeliveryMetadataChanges = new Set(registerChangedBindingMetadata({
      exactAllowedPaths,
      bindingMetadataPaths,
      before: sourcePublicHourMarker,
      after: migrated.publicHourDelivery,
      prefix: 'publicHourDelivery',
      fields: [
        'sourceDetailsSha256',
        'startupNationalForecastSha256',
        'rawBytes',
        'packBytes',
        'packSha256',
      ],
    }));
    for (const requiredPath of [
      'publicHourDelivery.sourceDetailsSha256',
      'publicHourDelivery.startupNationalForecastSha256',
      'publicHourDelivery.packSha256',
    ]) {
      if (!publicHourDeliveryMetadataChanges.has(requiredPath)) {
        throw new Error(`Private public-hour pack rebind did not change ${requiredPath}`);
      }
    }
    publicHourDeliveryRebound = true;
  }
  const [candidateRootName, candidateBindingName] = candidateRoots[0];
  const requiredMetadataPaths = [
    ...(predecessorIntegratedBinding.modelBundleSha256
        !== currentIntegratedBinding.modelBundleSha256 ? [
          'coastalParts.modelBinding.modelBundleSha256',
          'coastalParts.scoreProfile.modelBundleSha256',
          ...partIds.map(partId =>
            `coastalParts.parts.${partId}.ravScoreModel.modelBundleSha256`),
        ] : []),
    ...(predecessorCandidateBinding.modelBundleSha256
        !== currentCandidateBinding.modelBundleSha256 ? [
          `${candidateRootName}.sourceModelBinding.modelBundleSha256`,
          `${candidateRootName}.${candidateBindingName}.modelBundleSha256`,
          `${candidateRootName}.runtime.modelBinding.modelBundleSha256`,
          ...(source[candidateRootName]?.runtime?.scoreProfile
            ? [`${candidateRootName}.runtime.scoreProfile.modelBundleSha256`] : []),
        ] : []),
  ];
  const missingRequiredMetadata = requiredMetadataPaths
    .filter(pathValue => !exactAllowedPaths.has(pathValue));
  if (missingRequiredMetadata.length) {
    throw new Error(`Private runtime migration missed required model metadata: ${missingRequiredMetadata.join(', ')}`);
  }
  const staleBundleHashes = new Set();
  if (predecessorIntegratedBinding.modelBundleSha256
      !== currentIntegratedBinding.modelBundleSha256) {
    staleBundleHashes.add(predecessorIntegratedBinding.modelBundleSha256);
  }
  if (predecessorCandidateBinding.modelBundleSha256
      !== currentCandidateBinding.modelBundleSha256) {
    staleBundleHashes.add(predecessorCandidateBinding.modelBundleSha256);
  }
  const staleBundlePaths = collectBundleHashPaths(migrated, staleBundleHashes);
  if (staleBundlePaths.length) {
    throw new Error(`Private runtime migration left old bundle hashes at: ${staleBundlePaths.join(', ')}`);
  }
  const changedPaths = collectChangedPaths(source, migrated);
  const forbiddenChanges = changedPaths
    .filter(change => !allowedChange(change, exactAllowedPaths));
  if (forbiddenChanges.length) {
    throw new Error(`Private runtime migration changed forbidden paths: ${forbiddenChanges.join(', ')}`);
  }
  const changedPathSet = new Set(changedPaths);
  const missingChanges = [...exactAllowedPaths]
    .filter(pathValue => !changedPathSet.has(pathValue));
  if (missingChanges.length || changedPathSet.size !== exactAllowedPaths.size) {
    throw new Error(`Private runtime migration did not change its exact metadata allowlist: ${missingChanges.join(', ')}`);
  }
  return {
    migrated,
    changedPaths,
    candidateRoot: candidateRootName,
    partCount: partIds.length,
    repairedContinuationCount,
    recomputedModeCount,
    recomputedZoneCount,
    publicHourDeliveryRebound,
    transitionKind: currentGridOriginalOnly ? classifyCurrentGridOriginalArchiveBridge({
      source, migrated, bindingMetadataPaths, verifiedChangedPaths: exactAllowedPaths,
    }) : ownerArchiveRequired ? classifyOwnerCurrentArchiveBridge({
      source, migrated, bindingMetadataPaths, verifiedChangedPaths: exactAllowedPaths,
    }) : classifyVerifiedRuntimeMigration({
      source,
      migrated,
      bindingMetadataPaths,
      verifiedChangedPaths: exactAllowedPaths,
    }),
  };
}

export async function migratePostCutoverPrivateRuntime({
  sourceRoot,
  outputRoot,
  bundleManifestPath,
  predecessorDescriptorPath,
  predecessorRoot,
  repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  expectedSourceHead,
  reportPath,
  ownerCurrentOriginalOnly = false,
  currentGridOriginalOnly = false,
  currentGridOriginalExpectation = null,
  metadataOnly = false,
} = {}) {
  return migratePrivateRuntimeCore({ sourceRoot, outputRoot, bundleManifestPath,
    predecessorDescriptorPath, predecessorRoot, repositoryRoot, expectedSourceHead,
    reportPath, ownerCurrentOriginalOnly, currentGridOriginalOnly,
    currentGridOriginalExpectation, metadataOnly });
}

const ownedI71WorkingContexts = new WeakMap();
const ownedI71WorkingFailurePhases = new WeakMap();
export function ownedI71WorkingFailurePhase(error) {
  return error && typeof error === 'object' ? ownedI71WorkingFailurePhases.get(error) ?? null : null;
}
async function ownedI71WorkingStage(phase, operation) {
  try { return await operation(); }
  catch (error) {
    if (error && typeof error === 'object' && !ownedI71WorkingFailurePhases.has(error)) {
      ownedI71WorkingFailurePhases.set(error, phase);
    }
    throw error;
  }
}
async function migratePrivateRuntimeCore({
  sourceRoot, outputRoot, bundleManifestPath, predecessorDescriptorPath, predecessorRoot,
  repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  expectedSourceHead, reportPath, ownerCurrentOriginalOnly = false,
  currentGridOriginalOnly = false, currentGridOriginalExpectation = null,
  metadataOnly = false, ownedI71WorkingContext = null,
} = {}) {
  const owned = ownedI71WorkingContext === null ? null : ownedI71WorkingContexts.get(ownedI71WorkingContext);
  if (ownedI71WorkingContext !== null && (!owned || !metadataOnly
    || currentGridOriginalOnly || ownerCurrentOriginalOnly || currentGridOriginalExpectation !== null)) {
    throw new Error('Owned I71 working migration requires its actual sealed metadata-only context');
  }
  if (currentGridOriginalOnly && metadataOnly
    || ownerCurrentOriginalOnly && currentGridOriginalOnly
    || !currentGridOriginalOnly && currentGridOriginalExpectation !== null) {
    throw new Error('Original migration policy or typed expectation is incompatible');
  }
  if (!SOURCE_HEAD.test(String(expectedSourceHead ?? ''))) {
    throw new Error('Post-cutover migration requires an exact predecessor source head');
  }
  const predecessorIdentity = owned ? owned.identity : validatePredecessorIdentity(
    await readJson(predecessorDescriptorPath, 'Current private runtime source identity'),
    expectedSourceHead,
  );
  const repository = await fs.realpath(path.resolve(repositoryRoot));
  if (owned && (repository !== owned.repository || path.resolve(sourceRoot) !== owned.sourceRoot
    || path.resolve(bundleManifestPath) !== owned.bundleManifestPath
    || path.resolve(predecessorRoot) !== owned.predecessorRoot || expectedSourceHead !== owned.identity.sourceHead)) {
    throw new Error('Owned I71 working paths do not match the actual fixed-source writer');
  }
  if (currentGridOriginalOnly) {
    assertCurrentGridOriginalMigrationIdentity(predecessorIdentity, currentGridOriginalExpectation);
    const actualRepository = await fs.realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
    if (repository !== actualRepository) {
      throw new Error('Current-grid original migration requires the actual reviewed repository');
    }
  }
  const source = await assertDirectoryOutside(repository, sourceRoot, 'Predecessor restored runtime');
  const predecessor = ownerCurrentOriginalOnly || currentGridOriginalOnly ? null
    : await assertDirectoryOutside(repository, predecessorRoot, 'Archived predecessor source');
  const output = path.resolve(outputRoot);
  const outputRelative = path.relative(repository, output);
  if (!outputRelative || (!outputRelative.startsWith(`..${path.sep}`) && outputRelative !== '..')) {
    throw new Error('Migrated runtime output must remain outside the repository');
  }
  if (await fs.lstat(output).catch(() => null)) throw new Error('Migrated runtime output already exists');
  const runtimeFiles = await assertExactRuntimeInventory(source);
  if (ownerCurrentOriginalOnly) {
    const expectation = buildOwnerCurrentOriginalRestoreExpectation({
      sourceDescription: { ...predecessorIdentity,
        kind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_CURRENT_SOURCE' },
      targetReferenceAt: predecessorIdentity.productionReferenceAt,
      currentBinding: ravScoreModelBinding(),
      currentContractHashes: await privateRuntimeContractHashes({ repositoryRoot: repository }) });
    if (!expectation) throw new Error('Owner current migration is not its exact original transition');
  }
  const modules = currentGridOriginalOnly ? currentGridOriginalValidators()
    : ownerCurrentOriginalOnly ? ownerCurrentOriginalValidators(predecessorIdentity.modelBinding)
    : await importPredecessorModules(predecessor, expectedSourceHead);
  const oldIntegrated = modules.integrated.ravScoreModelBinding();
  const oldCandidate = modules.candidate.ravScoreModelBinding();
  assertSame(oldIntegrated, predecessorIdentity.modelBinding, 'Archived predecessor integrated binding');
  const manifest = await readJson(bundleManifestPath, 'Protected predecessor bundle manifest');
  // The protected manifest was sealed from the hydrated production workspace
  // after central configuration and generated runtime files were installed.
  // A raw Git archive is therefore not a byte-identical reconstruction of the
  // workspace whose contract hashes the bundle records. Keep the exact sealed
  // hashes, content hash and source-model identity as independent checks, while
  // using the exact archived source only for its unchanged validators.
  validatePredecessorManifest(manifest, oldIntegrated, predecessorIdentity);
  assertPrivateRuntimeInventory(manifest.files);
  assertSame(manifest.files.map(({ id, relativePath }) => ({ id, relativePath }))
    .sort((a, b) => a.id.localeCompare(b.id)), [...runtimeFiles].sort((a, b) => a.id.localeCompare(b.id)),
  'Protected predecessor preserved file inventory');
  const originalFiles = currentGridOriginalOnly ? currentGridOriginalManifestFiles(manifest) : null;
  if (metadataOnly) await assertRestoredOriginalInventory(source, manifest);
  const currentContractHashes = await privateRuntimeContractHashes({ repositoryRoot: repository });
  if (currentGridOriginalOnly) {
    const oldContracts = CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY.sourceContractHashes;
    exactKeys(currentContractHashes, Object.keys(oldContracts), 'Current-grid successor contract hashes');
    if (currentContractHashes.fullRuntimeContractSha256 !== oldContracts.fullRuntimeContractSha256
      || currentContractHashes.publicProjectionContractSha256 !== oldContracts.publicProjectionContractSha256
      || !SHA256.test(currentContractHashes.continuationStateContractSha256)
      || currentContractHashes.continuationStateContractSha256 === oldContracts.continuationStateContractSha256) {
      throw new Error('Current-grid original migration lacks its genuine NEW-T contract successor');
    }
  }
  const currentIntegrated = ravScoreModelBinding();
  const currentCandidate = candidateModelBinding();
  const conditionsPath = path.join(source, 'data/live/conditions.json');
  const conditions = await readJson(conditionsPath, 'Predecessor private conditions',
    originalFiles?.get('full-conditions') ?? null);
  if (originalFiles) {
    const publicMarker = privatePublicHourDeliveryMarker(conditions);
    const publicFile = originalFiles.get(PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.id);
    if (Boolean(publicMarker) !== Boolean(publicFile)) {
      throw new Error('Current-grid original public-hour pack inventory differs');
    }
    if (publicFile) assertSame({ bytes: publicMarker.packBytes, sha256: publicMarker.packSha256 },
      { bytes: publicFile.bytes, sha256: publicFile.sha256 },
      'Current-grid original sealed public-hour pack marker');
  }
  const packedZoneHourly = Object.hasOwn(conditions, 'privateZoneHourly');
  if (conditions.productionReferenceAt !== manifest.productionReferenceAt
      || conditions.generatedAt !== manifest.generatedAt) {
    throw new Error('Predecessor conditions do not match the protected bundle timestamps');
  }
  const temporary = `${output}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  let migratedConditionsDigest;
  let migrationResult;
  try {
    await fs.mkdir(temporary, { recursive: false });
    const result = await validateAndMigrateConditions({
      source: hydratePrivateConditionsHourly(conditions),
      predecessor: predecessorIdentity,
      oldStaging: modules.staging,
      oldIntegratedBinding: modules.integrated,
      oldCandidateBinding: modules.candidate,
      currentIntegratedBinding: currentIntegrated,
      currentCandidateBinding: currentCandidate,
      publicHourPackSourcePath: path.join(source, PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.relativePath),
      publicHourPackTargetPath: path.join(temporary, PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.relativePath),
      ownerCurrentOriginalOnly,
      currentGridOriginalOnly,
    });
    if (metadataOnly) assertMetadataOnlyMigrationResult(result);
    await copyPrivateRuntimeInventory(source, temporary, runtimeFiles, {
      expectedFileDigests: originalFiles,
      skipRelativePaths: result.publicHourDeliveryRebound
        ? [PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.relativePath]
        : [],
    });
    if (originalFiles && result.publicHourDeliveryRebound) {
      // The normal rebind already checks each actually read compressed/raw
      // hour against the sealed conditions marker. Its source pack is skipped
      // by copy, so separately retain the original sealed whole-file check.
      const original = originalFiles.get(PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.id);
      assertSame(await digestPrivateRuntimeFile(path.join(source, original.relativePath)),
        { bytes: original.bytes, sha256: original.sha256 },
        'Current-grid sealed original public-hour pack after rebind');
    }
    if (result.transitionKind !== 'CONTRACT_ONLY_REBIND') {
      migratedConditionsDigest = await atomicWriteJson(
        path.join(temporary, 'data/live/conditions.json'),
        packedZoneHourly ? packPrivateConditionsHourly(result.migrated) : result.migrated,
      );
    } else {
      migratedConditionsDigest = await digestPrivateRuntimeFile(path.join(temporary, 'data/live/conditions.json'));
    }
    assertSame(await assertExactRuntimeInventory(temporary), runtimeFiles, 'Migrated runtime preserved file inventory');
    if (metadataOnly) await assertRestoredOriginalInventory(source, manifest);
    await fs.rename(temporary, output);
    migrationResult = result;
  } catch (error) {
    await fs.rm(temporary, { recursive: true, force: true }).catch(() => {});
    throw error;
  }

  const report = {
    schemaVersion: 2,
    kind: owned ? 'RAVRADAR_OWNED_I71_NATIVE_IDENTITY_WORKING_REBIND' : 'RAVRADAR_POST_CUTOVER_PRIVATE_RUNTIME_REBIND',
    ...(owned ? { admission: 'NO_ADMISSION', protectedSourceClaimed: false,
      sourceKind: 'RAVRADAR_NATIVE_IDENTITY_OWNED_I71_WORKING_SOURCE' } : {}),
    transitionKind: migrationResult.transitionKind,
    predecessorSourceHead: predecessorIdentity.sourceHead,
    datasetId: predecessorIdentity.datasetId,
    sourceBundleContentSha256: predecessorIdentity.bundleContentSha256,
    previousIntegratedBundleSha256: oldIntegrated.modelBundleSha256,
    currentIntegratedBundleSha256: currentIntegrated.modelBundleSha256,
    previousCandidateBundleSha256: oldCandidate.modelBundleSha256,
    currentCandidateBundleSha256: currentCandidate.modelBundleSha256,
    previousContractHashes: predecessorIdentity.contractHashes,
    currentContractHashes,
    candidateRuntimeKind: migrationResult.candidateRoot,
    migratedPartCount: migrationResult.partCount,
    changedBindingFieldCount: migrationResult.changedPaths.length,
    copiedPrivateFileCount: runtimeFiles.length,
    migratedConditionsBytes: migratedConditionsDigest.bytes,
    migratedConditionsSha256: migratedConditionsDigest.sha256,
    publicHourDeliveryRebound: migrationResult.publicHourDeliveryRebound,
    migratedPublicHourPackBytes: migrationResult.publicHourDeliveryRebound
      ? privatePublicHourDeliveryMarker(migrationResult.migrated).packBytes
      : null,
    migratedPublicHourPackSha256: migrationResult.publicHourDeliveryRebound
      ? privatePublicHourDeliveryMarker(migrationResult.migrated).packSha256
      : null,
    measurementsChanged: false,
    candidateStatesChanged: false,
    privatePayloadIncluded: false,
  };
  await atomicWriteJson(reportPath, report);
  return {
    ...report,
    repairedContinuationCount: migrationResult.repairedContinuationCount,
    recomputedModeCount: migrationResult.recomputedModeCount,
    recomputedZoneCount: migrationResult.recomputedZoneCount,
  };
}

// LOCAL metadata utility only. Paths identify owned input bytes, not protected
// authority. The production recovery caller must independently prove original
// B/S and old GCM before using this output; this API never grants admission.
export async function migrateOwnedI71NativeIdentityWorkingRuntime(options) {
  if (!isPlainObject(options)
    || Object.keys(options).sort().join(',') !== 'outputRoot,privateRoot,reportPath,sourceRoot') {
    throw new Error('Owned I71 utility accepts only four local working paths; NO_ADMISSION');
  }
  const { repository, privateRoot, sourceRoot, outputRoot, reportPath } = await ownedI71WorkingStage('LOCATIONS', async () => {
    const repository = await fs.realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
    const directory = async requested => {
      const absolute = path.resolve(requested), stat = await fs.lstat(absolute);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Owned I71 paths require regular directories');
      const real = await fs.realpath(absolute), relative = path.relative(repository, real);
      if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..')) {
        throw new Error('Owned I71 paths must remain outside the repository');
      }
      return real;
    };
    const absent = async file => {
      try { await fs.lstat(file); return false; }
      catch (error) { if (error?.code === 'ENOENT') return true; throw error; }
    };
    const privateRoot = await directory(options.privateRoot), sourceRoot = await directory(options.sourceRoot);
    const outputRoot = path.resolve(options.outputRoot), reportPath = path.resolve(options.reportPath);
    const within = child => {
      const relative = path.relative(privateRoot, child);
      return relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
    };
    if (!within(sourceRoot) || !within(outputRoot) || !within(reportPath)
      || !await absent(outputRoot) || !await absent(reportPath)) {
      throw new Error('Owned I71 source/output/report must remain exclusively inside the private root');
    }
    for (const existing of [sourceRoot, path.dirname(outputRoot), path.dirname(reportPath)]) {
      let current = privateRoot;
      for (const segment of path.relative(privateRoot, existing).split(path.sep).filter(Boolean)) {
        current = path.join(current, segment);
        if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Owned I71 working paths must not traverse symlinks');
      }
    }
    return { repository, privateRoot, sourceRoot, outputRoot, reportPath };
  });
  const { withFrozenI71Source } = await ownedI71WorkingStage('SOURCE', () => import('./check-native-identity-frozen-i71-source.mjs'));
  return ownedI71WorkingStage('SOURCE', () => withFrozenI71Source(async frozenRoot => ownedI71WorkingStage('OWNED_BUNDLE', async () => {
    const load = relative => ownedI71WorkingStage('SOURCE', () => import(pathToFileURL(path.join(frozenRoot, relative)).href));
    const [oldWorkflow, oldBundle, oldModel, oldCandidate] = await Promise.all([
      load('scripts/private-production-runtime-workflow.mjs'), load('scripts/private-production-runtime-bundle.mjs'),
      load('js/core/ravscore-model-contract.js'), load('scripts/rollback-assets/ravscore-model-contract.js'),
    ]);
    const oldIntegrated = oldModel.ravScoreModelBinding(), oldCandidateBinding = oldCandidate.ravScoreModelBinding();
    if (oldIntegrated.modelBundleSha256 !== '994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399'
      || oldCandidateBinding.modelBundleSha256 !== 'd192e060cf47fde07a1ae2faf9a8db913dbbf4e1325cbf7bf2e33c720982e8d9') {
      throw new Error('Owned working source is not the genuine fixed I71/C69 implementation');
    }
    assertBindingUpgrade(oldIntegrated, ravScoreModelBinding(), 'Owned I71 integrated successor');
    assertBindingUpgrade(oldCandidateBinding, candidateModelBinding(), 'Owned I71 Candidate successor');
    const conditions = hydratePrivateConditionsHourly(await readJson(path.join(sourceRoot, 'data/live/conditions.json'), 'Owned I71 conditions'));
    oldModel.assertRavScoreModelBinding(conditions.coastalParts?.modelBinding, 'Owned I71 original working binding');
    if (!DATASET_ID.test(String(conditions.datasetId ?? '')) || Object.keys(conditions.zones ?? {}).length !== 210
      || Object.keys(conditions.coastalParts?.parts ?? {}).length !== 673) {
      throw new Error('Owned I71 working source lacks its real whole210/673 generation');
    }
    const contractHashes = await ownedI71WorkingStage('SOURCE', () => oldWorkflow.privateRuntimeContractHashes({ repositoryRoot: frozenRoot }));
    if (contractHashes.continuationStateContractSha256 !== '0f6c182ab2ffa7d9d0153706277aa3f7b582327be7dda02842a9c8b995568d4a') {
      throw new Error('Owned working source lacks genuine frozen I71/T12');
    }
    const descriptors = [...oldWorkflow.PRIVATE_RUNTIME_FILES];
    for (const optional of [PRIVATE_WEATHER_COMPONENT_PACK_FILE, PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE]) {
      if (await fs.lstat(path.join(sourceRoot, optional.relativePath)).catch(error => {
        if (error?.code === 'ENOENT') return null; throw error;
      })) descriptors.push(optional);
    }
    assertPrivateRuntimeInventory(descriptors);
    const files = [];
    for (const descriptor of descriptors) {
      let current = sourceRoot;
      for (const segment of descriptor.relativePath.split('/')) {
        current = path.join(current, segment);
        if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Owned working inventory traverses a symlink');
      }
      if (!(await fs.lstat(current)).isFile()) throw new Error('Owned I71 working payload must be a regular file');
      files.push({ ...descriptor, sourcePath: current, privacyClass: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass });
    }
    const bundlePath = path.join(privateRoot, 'owned-i71-working-bundle');
    const created = await oldBundle.createPrivateProductionRuntimeBundle({ privateRoot, bundlePath,
      repositoryRoot: frozenRoot, metadata: {
        datasetId: conditions.datasetId, generationId: conditions.datasetId,
        productionReferenceAt: conditions.productionReferenceAt, generatedAt: conditions.generatedAt,
        zoneCount: 210, partCount: 673, modelBinding: oldIntegrated, contractHashes,
        privacyClass: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass,
      }, files });
    if (created.created !== true) throw new Error('Actual owned I71 bundle writer did not complete');
    const bundleManifestPath = path.join(bundlePath, 'manifest.json');
    const manifest = await readJson(bundleManifestPath, 'Actual owned I71 manifest');
    const expected = { modelBinding: oldIntegrated, contractHashes,
      datasetId: conditions.datasetId, productionReferenceAt: conditions.productionReferenceAt,
      bundleContentSha256: created.bundleContentSha256 };
    await oldBundle.verifyPrivateProductionRuntimeBundle({ privateRoot, bundlePath, repositoryRoot: frozenRoot, expected });
    const payloadRoot = path.join(bundlePath, 'payload');
    await assertRestoredOriginalInventory(payloadRoot, manifest);
    const context = Object.freeze({});
    const identity = Object.freeze({ schemaVersion: '1.0.0',
      kind: 'RAVRADAR_NATIVE_IDENTITY_OWNED_I71_WORKING_SOURCE',
      sourceHead: '37e657867ff0f8c31f8e8489e5c9a1cf235192f9',
      datasetId: manifest.datasetId, productionReferenceAt: manifest.productionReferenceAt,
      generatedAt: manifest.generatedAt, bundleContentSha256: created.bundleContentSha256,
      modelBinding: oldIntegrated, contractHashes, expectedZoneCount: 210, expectedPartCount: 673,
      privatePayloadIncluded: false });
    ownedI71WorkingContexts.set(context, { identity, repository, sourceRoot: payloadRoot,
      bundleManifestPath, predecessorRoot: frozenRoot });
    try {
      let report;
      try {
        report = await migratePrivateRuntimeCore({ sourceRoot: payloadRoot, outputRoot,
          bundleManifestPath, predecessorRoot: frozenRoot, repositoryRoot: repository,
          expectedSourceHead: identity.sourceHead, reportPath, metadataOnly: true,
          ownedI71WorkingContext: context });
      } catch (error) {
        if (error && typeof error === 'object') ownedI71WorkingFailurePhases.set(error, 'NEW_METADATA');
        throw error;
      }
      await assertRestoredOriginalInventory(payloadRoot, manifest);
      await oldBundle.verifyPrivateProductionRuntimeBundle({ privateRoot, bundlePath, repositoryRoot: frozenRoot, expected });
      if (report.admission !== 'NO_ADMISSION' || report.protectedSourceClaimed !== false) {
        throw new Error('Owned local migration must never imply protected or numeric admission');
      }
      return { ...report, ownedBundlePath: bundlePath, workingRoot: outputRoot };
    } finally { ownedI71WorkingContexts.delete(context); }
  })));
}

function argument(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0 || !argv[index + 1]) throw new Error(`Missing ${name}`);
  return argv[index + 1];
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.includes('--current-grid-original') && argv.includes('--current-grid-original-expectation')) {
    throw new Error('Prepared current-grid expectation requires its original-only mode');
  }
  assertExclusivePrewriteIntent(argv);
  const options = {
    sourceRoot: argument(argv, '--source'),
    outputRoot: argument(argv, '--output'),
    bundleManifestPath: argument(argv, '--bundle-manifest'),
    predecessorDescriptorPath: argument(argv, '--predecessor-descriptor'),
    predecessorRoot: argv.includes('--owner-current-original') || argv.includes('--current-grid-original')
      ? null : argument(argv, '--predecessor-root'),
    ownerCurrentOriginalOnly: argv.includes('--owner-current-original'),
    currentGridOriginalOnly: argv.includes('--current-grid-original'),
    currentGridOriginalExpectation: argv.includes('--current-grid-original')
      ? await readJson(argument(argv, '--current-grid-original-expectation'),
        'Prepared current-grid original expectation') : null,
    metadataOnly: argv.includes('--metadata-only'),
    repositoryRoot: argument(argv, '--repository-root'),
    expectedSourceHead: argument(argv, '--expected-source-head'),
    reportPath: argument(argv, '--report'),
  };
  if (argv.includes('--verify-account-assistant-prewrite')) {
    const { documentRequest } = createProtectedPrivateRuntimeClients({ storageBackend: 'supabase' });
    await verifyAccountAssistantPrewritePreservation({ ...options, request: documentRequest });
    console.log('Account/assistant original preservation reverified before binding installation.');
    return;
  }
  if (argv.includes('--verify-userdata-prewrite')) {
    if (argv.includes('--verify-assistant-prewrite')) throw new Error('Pre-write intent is ambiguous');
    const { documentRequest } = createProtectedPrivateRuntimeClients({ storageBackend: 'supabase' });
    await verifyUserdataPrewritePreservation({ ...options, request: documentRequest });
    console.log('Userdata original preservation reverified before binding installation.');
    return;
  }
  if (argv.includes('--verify-assistant-prewrite')) {
    const { documentRequest } = createProtectedPrivateRuntimeClients({ storageBackend: 'supabase' });
    await verifyAssistantPrewritePreservation({ ...options, request: documentRequest });
    console.log('Assistant original preservation reverified before binding installation.');
    return;
  }
  const report = await migratePostCutoverPrivateRuntime(options);
  console.log(JSON.stringify({
    status: 'post-cutover-private-runtime-migrated',
    migratedPartCount: report.migratedPartCount,
    repairedContinuationCount: report.repairedContinuationCount,
    recomputedModeCount: report.recomputedModeCount,
    recomputedZoneCount: report.recomputedZoneCount,
    copiedPrivateFileCount: report.copiedPrivateFileCount,
    measurementsChanged: report.measurementsChanged,
    privatePayloadIncluded: false,
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`Post-cutover private runtime migration failed closed: ${error.message}`);
    process.exitCode = 1;
  });
}
