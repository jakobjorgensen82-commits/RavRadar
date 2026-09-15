#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  PRIVATE_RUNTIME_FILES,
  privateRuntimeContractHashes,
} from './private-production-runtime-workflow.mjs';
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

const INTEGRATED_BINDING_KEYS = Object.freeze(Object.keys(POST_CUTOVER_PREDECESSOR.modelBinding));
const PRIVATE_STATE_KEYS = new Set(['currentState', 'continuationState']);
const SHA256 = /^[a-f0-9]{64}$/;

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
  assertBindingUpgrade(previousBinding, currentBinding, label);
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
      value.modelBundleSha256 = currentBinding.modelBundleSha256;
      changedPaths.push(joinedPath(prefix, 'modelBundleSha256'));
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
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function importPredecessorModules(predecessorRoot) {
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
  const query = `?predecessor=${POST_CUTOVER_PREDECESSOR.sourceHead}`;
  const [staging, integrated, candidate] = await Promise.all([
    import(`${stagingUrl.href}${query}`),
    import(`${integratedUrl.href}${query}`),
    import(`${candidateUrl.href}${query}`),
  ]);
  return { staging, integrated, candidate };
}

async function assertExactRuntimeInventory(sourceRoot) {
  const expected = PRIVATE_RUNTIME_FILES.map(item => item.relativePath).sort();
  const actual = [];
  async function walk(directory, relative = '') {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const childRelative = relative ? path.join(relative, entry.name) : entry.name;
      const child = path.join(directory, entry.name);
      const stat = await fs.lstat(child);
      if (stat.isSymbolicLink()) throw new Error('Private runtime inventory contains a symbolic link');
      if (stat.isDirectory()) await walk(child, childRelative);
      else if (stat.isFile()) actual.push(childRelative.split(path.sep).join('/'));
      else throw new Error('Private runtime inventory contains a non-regular entry');
    }
  }
  await walk(sourceRoot);
  if (!same(actual.sort(), expected)) throw new Error('Private runtime inventory is not the exact nine-file allowlist');
}

export function validatePredecessorManifest(manifest, oldIntegratedBinding) {
  if (!isPlainObject(manifest)
      || manifest.datasetId !== POST_CUTOVER_PREDECESSOR.datasetId
      || manifest.bundleContentSha256 !== POST_CUTOVER_PREDECESSOR.bundleContentSha256
      || manifest.zoneCount !== POST_CUTOVER_PREDECESSOR.expectedZoneCount
      || manifest.partCount !== POST_CUTOVER_PREDECESSOR.expectedPartCount) {
    throw new Error('Protected predecessor bundle identity is not exact');
  }
  assertSame(manifest.modelBinding, POST_CUTOVER_PREDECESSOR.modelBinding, 'Protected bundle model binding');
  assertSame(manifest.modelBinding, oldIntegratedBinding, 'Archived-source model binding');
  assertSame(manifest.contractHashes, POST_CUTOVER_PREDECESSOR.contractHashes, 'Protected bundle contract hashes');
}

function validateAndMigrateConditions({
  source,
  oldStaging,
  oldIntegratedBinding,
  oldCandidateBinding,
  currentIntegratedBinding,
  currentCandidateBinding,
}) {
  if (!isPlainObject(source)
      || source.datasetId !== POST_CUTOVER_PREDECESSOR.datasetId
      || Object.keys(source.zones ?? {}).length !== POST_CUTOVER_PREDECESSOR.expectedZoneCount
      || Object.keys(source.coastalParts?.parts ?? {}).length !== POST_CUTOVER_PREDECESSOR.expectedPartCount) {
    throw new Error('Predecessor conditions do not contain the exact expected dataset');
  }
  oldIntegratedBinding.assertRavScoreModelBinding(
    source.coastalParts.modelBinding,
    'Predecessor coastal-parts binding',
  );
  assertSame(source.coastalParts.modelBinding, POST_CUTOVER_PREDECESSOR.modelBinding,
    'Predecessor coastal-parts binding');
  assertRavScoreModelBinding(currentIntegratedBinding, 'Current integrated model binding');
  assertBindingUpgrade(source.coastalParts.modelBinding, currentIntegratedBinding,
    'Integrated model binding');
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
  const errors = [];
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
      oldStaging.assertIntegratedCoastalPointContinuation(originalWrapper.currentState, {
        samplingContextKey: oldIdentity.samplingContextKey,
        label: `Part ${partId} predecessor continuation`,
      });
      assertRavScoreModelBinding(
        bindingFromWrapper(migratedWrapper, `Part ${partId} migrated wrapper`),
        `Part ${partId} migrated wrapper binding`,
      );
      if (migratedWrapper.currentState?.modelBundleSha256
          !== POST_CUTOVER_PREDECESSOR.modelBinding.modelBundleSha256) {
        throw new Error('continuation does not carry the predecessor bundle hash');
      }
      migratedWrapper.currentState.modelBundleSha256 = currentIntegratedBinding.modelBundleSha256;
      exactAllowedPaths.add(
        `coastalParts.parts.${partId}.ravScoreModel.currentState.modelBundleSha256`,
      );
      assertIntegratedCoastalPointContinuation(migratedWrapper.currentState, {
        samplingContextKey: currentIdentity.samplingContextKey,
        label: `Part ${partId} migrated continuation`,
      });
    } catch (error) {
      errors.push(`${partId}: ${error.message}`);
    }
  }

  const candidateRoots = [
    ['ravScoreCandidateGRollback', 'rollbackModelBinding'],
    ['ravScoreCandidateGWarmup', 'candidateModelBinding'],
  ].filter(([root]) => source[root] !== undefined);
  if (candidateRoots.length !== 1) errors.push('Exactly one private Candidate G runtime root is required');
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
      errors.push(`${rootName}: ${error.message}`);
    }
  }
  if (errors.length) {
    throw new Error(`Private runtime migration rejected ${errors.length} independent error(s): ${errors.join(' | ')}`);
  }
  const [candidateRootName, candidateBindingName] = candidateRoots[0];
  const requiredMetadataPaths = [
    'coastalParts.modelBinding.modelBundleSha256',
    'coastalParts.scoreProfile.modelBundleSha256',
    ...partIds.map(partId =>
      `coastalParts.parts.${partId}.ravScoreModel.modelBundleSha256`),
    `${candidateRootName}.sourceModelBinding.modelBundleSha256`,
    `${candidateRootName}.${candidateBindingName}.modelBundleSha256`,
    `${candidateRootName}.runtime.modelBinding.modelBundleSha256`,
    ...(source[candidateRootName]?.runtime?.scoreProfile
      ? [`${candidateRootName}.runtime.scoreProfile.modelBundleSha256`] : []),
  ];
  const missingRequiredMetadata = requiredMetadataPaths
    .filter(pathValue => !exactAllowedPaths.has(pathValue));
  if (missingRequiredMetadata.length) {
    throw new Error(`Private runtime migration missed required model metadata: ${missingRequiredMetadata.join(', ')}`);
  }
  const staleBundlePaths = collectBundleHashPaths(migrated, new Set([
    predecessorIntegratedBinding.modelBundleSha256,
    predecessorCandidateBinding.modelBundleSha256,
  ]));
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
  return { migrated, changedPaths, candidateRoot: candidateRootName, partCount: partIds.length };
}

export async function migratePostCutoverPrivateRuntime({
  sourceRoot,
  outputRoot,
  bundleManifestPath,
  predecessorRoot,
  repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  expectedSourceHead,
  reportPath,
} = {}) {
  if (expectedSourceHead !== POST_CUTOVER_PREDECESSOR.sourceHead) {
    throw new Error('Post-cutover migration is authorized only for the exact predecessor source head');
  }
  const repository = await fs.realpath(path.resolve(repositoryRoot));
  const source = await assertDirectoryOutside(repository, sourceRoot, 'Predecessor restored runtime');
  const predecessor = await assertDirectoryOutside(repository, predecessorRoot, 'Archived predecessor source');
  const output = path.resolve(outputRoot);
  const outputRelative = path.relative(repository, output);
  if (!outputRelative || (!outputRelative.startsWith(`..${path.sep}`) && outputRelative !== '..')) {
    throw new Error('Migrated runtime output must remain outside the repository');
  }
  if (await fs.lstat(output).catch(() => null)) throw new Error('Migrated runtime output already exists');
  await assertExactRuntimeInventory(source);
  const modules = await importPredecessorModules(predecessor);
  const oldIntegrated = modules.integrated.ravScoreModelBinding();
  const oldCandidate = modules.candidate.ravScoreModelBinding();
  assertSame(oldIntegrated, POST_CUTOVER_PREDECESSOR.modelBinding, 'Archived predecessor integrated binding');
  if (oldCandidate.modelBundleSha256 !== POST_CUTOVER_PREDECESSOR.candidateBundleSha256) {
    throw new Error('Archived predecessor Candidate G bundle is not exact');
  }
  const manifest = await readJson(bundleManifestPath, 'Protected predecessor bundle manifest');
  // The protected manifest was sealed from the hydrated production workspace
  // after central configuration and generated runtime files were installed.
  // A raw Git archive is therefore not a byte-identical reconstruction of the
  // workspace whose contract hashes the bundle records. Keep the exact sealed
  // hashes, content hash and source-model identity as independent checks, while
  // using the exact archived source only for its unchanged validators.
  validatePredecessorManifest(manifest, oldIntegrated);
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
    oldStaging: modules.staging,
    oldIntegratedBinding: modules.integrated,
    oldCandidateBinding: modules.candidate,
    currentIntegratedBinding: currentIntegrated,
    currentCandidateBinding: currentCandidate,
  });

  const temporary = `${output}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  try {
    await fs.mkdir(temporary, { recursive: false });
    for (const descriptor of PRIVATE_RUNTIME_FILES) {
      const from = path.join(source, descriptor.relativePath);
      const to = path.join(temporary, descriptor.relativePath);
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.copyFile(from, to, fs.constants.COPYFILE_EXCL);
    }
    await atomicWriteJson(path.join(temporary, 'data/live/conditions.json'), result.migrated);
    for (const descriptor of PRIVATE_RUNTIME_FILES.filter(item => item.id !== 'full-conditions')) {
      const [before, after] = await Promise.all([
        fs.readFile(path.join(source, descriptor.relativePath)),
        fs.readFile(path.join(temporary, descriptor.relativePath)),
      ]);
      if (!before.equals(after)) throw new Error(`${descriptor.id} changed during migration`);
    }
    await assertExactRuntimeInventory(temporary);
    await fs.rename(temporary, output);
  } catch (error) {
    await fs.rm(temporary, { recursive: true, force: true }).catch(() => {});
    throw error;
  }

  const report = {
    schemaVersion: 1,
    kind: 'RAVRADAR_POST_CUTOVER_PRIVATE_RUNTIME_BINDING_MIGRATION',
    predecessorSourceHead: POST_CUTOVER_PREDECESSOR.sourceHead,
    datasetId: POST_CUTOVER_PREDECESSOR.datasetId,
    sourceBundleContentSha256: POST_CUTOVER_PREDECESSOR.bundleContentSha256,
    previousIntegratedBundleSha256: oldIntegrated.modelBundleSha256,
    currentIntegratedBundleSha256: currentIntegrated.modelBundleSha256,
    previousCandidateBundleSha256: oldCandidate.modelBundleSha256,
    currentCandidateBundleSha256: currentCandidate.modelBundleSha256,
    previousContractHashes: POST_CUTOVER_PREDECESSOR.contractHashes,
    currentContractHashes,
    candidateRuntimeKind: result.candidateRoot,
    migratedPartCount: result.partCount,
    changedBindingFieldCount: result.changedPaths.length,
    copiedPrivateFileCount: PRIVATE_RUNTIME_FILES.length,
    measurementsChanged: false,
    candidateStatesChanged: false,
    privatePayloadIncluded: false,
  };
  await atomicWriteJson(reportPath, report);
  return report;
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
    predecessorRoot: argument(argv, '--predecessor-root'),
    repositoryRoot: argument(argv, '--repository-root'),
    expectedSourceHead: argument(argv, '--expected-source-head'),
    reportPath: argument(argv, '--report'),
  });
  console.log(JSON.stringify({
    status: 'post-cutover-private-runtime-migrated',
    migratedPartCount: report.migratedPartCount,
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
