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
  PRIVATE_WEATHER_COMPONENT_PACK_FILE,
  assertPrivateRuntimeInventory,
  privateWeatherComponentMarker,
} from './lib/private-weather-component-inventory.mjs';
import {
  assertIntegratedCoastalPointContinuation,
  assertCandidateGCoastalPointRollbackContinuation,
  coastalPointStageIdentity,
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

export const POST_CUTOVER_PREDECESSOR = Object.freeze({
  sourceHead: 'fa418f43bbd070c446ed19b6587541b93af89599',
  datasetId: 'rr-20260914180039-210',
  bundleContentSha256: '033fd85bf79776256083da4e5bca8e8164c8056350b2bb9b1acb7b57cac5ef6b',
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
    modelBundleSha256: '327b989b731e6e84bf05bdb6bd54707d47c04d5bdf80038d437332e84a4c8e01',
  }),
  candidateBundleSha256: '1ccbb10ed3e89f9c8336539a2c566d7ab6efd099bf3e9d1598dbb31e84d5c3a1',
  contractHashes: Object.freeze({
    continuationStateContractSha256: 'e272bd48de768e593904a362df92f40b5e5ab2c3dac0263216518d04b8bf4ea1',
    fullRuntimeContractSha256: '8de96f0a37a0411a8e65173f864f297eb8ea02108c5261ab3e073219562d74f9',
    publicProjectionContractSha256: '0c31005b572bb9e3cf93e83e055bc6976e83e0bb9be5a2a3c7c11284dc172ab5',
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

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function same(left, right) {
  return canonical(left) === canonical(right);
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
      || value.kind !== 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_CURRENT_SOURCE'
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

export function migrateExactModelBindingMetadata(
  root,
  previousBinding,
  currentBinding,
  { label = 'Saved runtime model metadata' } = {},
) {
  assertBindingUpgrade(previousBinding, currentBinding, label, { requireChange: false });
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
      visit(child, joinedPath(prefix, key));
    }
  }
  visit(root);
  return changedPaths;
}

function collectBundleHashPaths(root, hashes) {
  const paths = [];
  function visit(value, prefix = '') {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, joinedPath(prefix, index)));
      return;
    }
    if (!isPlainObject(value)) return;
    for (const [key, child] of Object.entries(value)) {
      const childPath = joinedPath(prefix, key);
      if (key === 'modelBundleSha256' && hashes.has(child)) paths.push(childPath);
      visit(child, childPath);
    }
  }
  visit(root);
  return paths;
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
  if ([...bindingPaths].some(value => !value.endsWith('.modelBundleSha256'))) {
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

async function readJson(file, label) {
  let text;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch {
    throw new Error(`${label} cannot be read`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

async function atomicWriteJson(file, value) {
  const target = path.resolve(file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  const text = `${JSON.stringify(value, null, 2)}\n`;
  try {
    await fs.writeFile(temporary, text, { flag: 'wx' });
    await fs.rename(temporary, target);
    return {
      bytes: Buffer.byteLength(text),
      sha256: crypto.createHash('sha256').update(text).digest('hex'),
    };
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
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

export async function assertExactRuntimeInventory(sourceRoot) {
  const allowed = [...PRIVATE_RUNTIME_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE];
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

export async function copyPrivateRuntimeInventory(sourceRoot, outputRoot, inventory) {
  assertPrivateRuntimeInventory(inventory);
  assertSame(await assertExactRuntimeInventory(sourceRoot), inventory, 'Private runtime copy inventory');
  for (const descriptor of inventory) {
    const from = path.join(sourceRoot, descriptor.relativePath);
    const to = path.join(outputRoot, descriptor.relativePath);
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to, fs.constants.COPYFILE_EXCL);
    // The bounded extension can be large: hash streams, never buffer both copies.
    const [before, after] = await Promise.all([
      digestPrivateRuntimeFile(from), digestPrivateRuntimeFile(to),
    ]);
    assertSame(before, after, `${descriptor.id} unchanged migration copy`);
  }
}

export function validatePredecessorManifest(
  manifest,
  oldIntegratedBinding,
  predecessor = POST_CUTOVER_PREDECESSOR,
) {
  if (!isPlainObject(manifest)
      || manifest.datasetId !== predecessor.datasetId
      || manifest.bundleContentSha256 !== predecessor.bundleContentSha256
      || manifest.productionReferenceAt !== predecessor.productionReferenceAt
      || manifest.generatedAt !== predecessor.generatedAt
      || manifest.zoneCount !== predecessor.expectedZoneCount
      || manifest.partCount !== predecessor.expectedPartCount) {
    throw new Error('Protected predecessor bundle identity is not exact');
  }
  assertSame(manifest.modelBinding, predecessor.modelBinding, 'Protected bundle model binding');
  assertSame(manifest.modelBinding, oldIntegratedBinding, 'Archived-source model binding');
  assertSame(manifest.contractHashes, predecessor.contractHashes, 'Protected bundle contract hashes');
}

function validateAndMigrateConditions({
  source,
  predecessor,
  oldStaging,
  oldIntegratedBinding,
  oldCandidateBinding,
  currentIntegratedBinding,
  currentCandidateBinding,
}) {
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
  oldCandidateBinding.assertRavScoreModelBinding(oldCandidateBinding.ravScoreModelBinding(),
    'Predecessor Candidate G binding');
  assertCandidateBinding(currentCandidateBinding, 'Current Candidate G binding');
  assertBindingUpgrade(oldCandidateBinding.ravScoreModelBinding(), currentCandidateBinding,
    'Candidate G model binding', { requireChange: false });

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
    transitionKind: classifyVerifiedRuntimeMigration({
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
} = {}) {
  if (!SOURCE_HEAD.test(String(expectedSourceHead ?? ''))) {
    throw new Error('Post-cutover migration requires an exact predecessor source head');
  }
  const predecessorIdentity = validatePredecessorIdentity(
    await readJson(predecessorDescriptorPath, 'Current private runtime source identity'),
    expectedSourceHead,
  );
  const repository = await fs.realpath(path.resolve(repositoryRoot));
  const source = await assertDirectoryOutside(repository, sourceRoot, 'Predecessor restored runtime');
  const predecessor = await assertDirectoryOutside(repository, predecessorRoot, 'Archived predecessor source');
  const output = path.resolve(outputRoot);
  const outputRelative = path.relative(repository, output);
  if (!outputRelative || (!outputRelative.startsWith(`..${path.sep}`) && outputRelative !== '..')) {
    throw new Error('Migrated runtime output must remain outside the repository');
  }
  if (await fs.lstat(output).catch(() => null)) throw new Error('Migrated runtime output already exists');
  const runtimeFiles = await assertExactRuntimeInventory(source);
  const modules = await importPredecessorModules(predecessor, expectedSourceHead);
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
  const currentContractHashes = await privateRuntimeContractHashes({ repositoryRoot: repository });
  const currentIntegrated = ravScoreModelBinding();
  const currentCandidate = candidateModelBinding();
  const conditionsPath = path.join(source, 'data/live/conditions.json');
  const conditions = await readJson(conditionsPath, 'Predecessor private conditions');
  if (conditions.productionReferenceAt !== manifest.productionReferenceAt
      || conditions.generatedAt !== manifest.generatedAt) {
    throw new Error('Predecessor conditions do not match the protected bundle timestamps');
  }
  const result = validateAndMigrateConditions({
    source: conditions,
    predecessor: predecessorIdentity,
    oldStaging: modules.staging,
    oldIntegratedBinding: modules.integrated,
    oldCandidateBinding: modules.candidate,
    currentIntegratedBinding: currentIntegrated,
    currentCandidateBinding: currentCandidate,
  });

  const temporary = `${output}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  let migratedConditionsDigest;
  try {
    await fs.mkdir(temporary, { recursive: false });
    await copyPrivateRuntimeInventory(source, temporary, runtimeFiles);
    if (result.transitionKind !== 'CONTRACT_ONLY_REBIND') {
      migratedConditionsDigest = await atomicWriteJson(
        path.join(temporary, 'data/live/conditions.json'),
        result.migrated,
      );
    } else {
      migratedConditionsDigest = await digestPrivateRuntimeFile(path.join(temporary, 'data/live/conditions.json'));
    }
    assertSame(await assertExactRuntimeInventory(temporary), runtimeFiles, 'Migrated runtime preserved file inventory');
    await fs.rename(temporary, output);
  } catch (error) {
    await fs.rm(temporary, { recursive: true, force: true }).catch(() => {});
    throw error;
  }

  const report = {
    schemaVersion: 1,
    kind: 'RAVRADAR_POST_CUTOVER_PRIVATE_RUNTIME_REBIND',
    transitionKind: result.transitionKind,
    predecessorSourceHead: predecessorIdentity.sourceHead,
    datasetId: predecessorIdentity.datasetId,
    sourceBundleContentSha256: predecessorIdentity.bundleContentSha256,
    previousIntegratedBundleSha256: oldIntegrated.modelBundleSha256,
    currentIntegratedBundleSha256: currentIntegrated.modelBundleSha256,
    previousCandidateBundleSha256: oldCandidate.modelBundleSha256,
    currentCandidateBundleSha256: currentCandidate.modelBundleSha256,
    previousContractHashes: predecessorIdentity.contractHashes,
    currentContractHashes,
    candidateRuntimeKind: result.candidateRoot,
    migratedPartCount: result.partCount,
    changedBindingFieldCount: result.changedPaths.length,
    copiedPrivateFileCount: runtimeFiles.length,
    migratedConditionsBytes: migratedConditionsDigest.bytes,
    migratedConditionsSha256: migratedConditionsDigest.sha256,
    measurementsChanged: false,
    candidateStatesChanged: false,
    privatePayloadIncluded: false,
  };
  await atomicWriteJson(reportPath, report);
  return {
    ...report,
    repairedContinuationCount: result.repairedContinuationCount,
    recomputedModeCount: result.recomputedModeCount,
    recomputedZoneCount: result.recomputedZoneCount,
  };
}

function argument(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0 || !argv[index + 1]) throw new Error(`Missing ${name}`);
  return argv[index + 1];
}

async function main() {
  const argv = process.argv.slice(2);
  const report = await migratePostCutoverPrivateRuntime({
    sourceRoot: argument(argv, '--source'),
    outputRoot: argument(argv, '--output'),
    bundleManifestPath: argument(argv, '--bundle-manifest'),
    predecessorDescriptorPath: argument(argv, '--predecessor-descriptor'),
    predecessorRoot: argument(argv, '--predecessor-root'),
    repositoryRoot: argument(argv, '--repository-root'),
    expectedSourceHead: argument(argv, '--expected-source-head'),
    reportPath: argument(argv, '--report'),
  });
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
