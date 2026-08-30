#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ravScoreModelBinding as integratedBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  ravScoreModelBinding as candidateBinding,
} from './rollback-assets/ravscore-model-contract.js';
import {
  assertExactPublicRavScoreModelBindingShape,
  assertExactPublicRavScoreProfile,
  assertSameExactPublicRavScoreProfile,
} from '../js/core/ravscore-public-profile-contract.js';
import {
  RAVSCORE_PUBLIC_DETAILS_KIND,
  RAVSCORE_PUBLIC_STARTUP_KIND,
  assertPublicRuntimeEnvelope,
  assertPublicRuntimeManifest,
} from '../js/core/ravscore-public-runtime-contract.js';
import {
  assertRavScorePublicBrowserClosure,
  computeRavScorePublicBrowserClosure,
  ravScorePublicEntrypointDescriptor,
} from './lib/ravscore-public-browser-closure.mjs';

export const RAVSCORE_OPERATIONAL_PAGES_VERIFICATION_SCHEMA =
  'ravscore-operational-pages-verification-v1';
export const RAVSCORE_SEALED_PUBLIC_IMPLEMENTATION_SCHEMA =
  'ravscore-sealed-public-implementation-v1';

const MODEL_MODES = Object.freeze({
  integrated: Object.freeze({
    binding: integratedBinding,
    contractPath: 'js/core/ravscore-model-contract.js',
    bundlePath: 'js/core/ravscore-model-bundle.generated.js',
    profile: Object.freeze({
      schemaVersion: '3.0.0',
      switchVersion: 'RAVSCORE-PROFILE-SWITCH-INTEGRATED-1.0.0',
      rollbackModelId: 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3',
      activationState: 'integrated-model-only-local-fail-closed',
      publicAvailabilityPolicy: 'integrated-model-local-fail-closed',
    }),
  }),
  'candidate-g': Object.freeze({
    binding: candidateBinding,
    contractPath: 'scripts/rollback-assets/ravscore-model-contract.js',
    bundlePath: 'scripts/rollback-assets/ravscore-model-bundle.generated.js',
    profile: Object.freeze({
      schemaVersion: '2.0.0',
      switchVersion: 'RAVSCORE-OPERATIONAL-ROLLBACK-DEC-0108-V1',
      rollbackModelId: null,
      activationState: 'manual-candidate-g-only-local-fail-closed',
      publicAvailabilityPolicy: 'candidate-g-local-fail-closed',
    }),
  }),
});
const PUBLIC_FILES = Object.freeze([
  'data/live/public-conditions.json',
  'data/live/public-condition-details.json',
  'data/live/coastal-parts-v2.json',
  'data/zones.geojson',
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const REQUIRED_PUBLIC_CLOSURE_FILES = Object.freeze([
  'js/core/best-time-selector.js',
  'js/core/local-zone-score.js',
  'js/services/rav-assistant.js',
  'js/services/trip-evidence-public-adapter.js',
]);

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

function assertExactBinding(value, expected, label) {
  assertExactPublicRavScoreModelBindingShape(value, label);
  if (!same(value, expected)) throw new Error(`${label} is not exact`);
}

function bodySha256(document) {
  const { ravScoreRuntime: _envelope, ...body } = document;
  return sha256(JSON.stringify(canonical(body)));
}

function assertOperationalProfileControls(profile, mode, label) {
  const expected = MODEL_MODES[mode].profile;
  if (profile.schemaVersion !== expected.schemaVersion
    || profile.switchVersion !== expected.switchVersion
    || profile.rollbackModelId !== expected.rollbackModelId
    || profile.memoryReferenceScope !== 'CURRENT_COMMON_ZONE_REFERENCE'
    || profile.activationState !== expected.activationState
    || profile.publicAvailabilityPolicy !== expected.publicAvailabilityPolicy
    || profile.modelCoverageReady !== true
    || profile.modelMemoryReady !== true
    || profile.modelMigrationReady !== true
    || profile.advisories.length !== 0) {
    throw new Error(`${label} has incompatible operational controls`);
  }
}

function scanBindings(value, expected, label, pathPrefix = label) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanBindings(item, expected, label, `${pathPrefix}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (value.modelBinding !== undefined) {
    assertExactBinding(value.modelBinding, expected, `${pathPrefix}.modelBinding`);
  }
  if (value.ravScoreModelBinding !== undefined) {
    assertExactBinding(value.ravScoreModelBinding, expected, `${pathPrefix}.ravScoreModelBinding`);
  }
  if (Object.keys(expected).every(key => Object.hasOwn(value, key))) {
    assertExactBinding(Object.fromEntries(Object.keys(expected).map(key => [key, value[key]])),
      expected, `${pathPrefix} embedded binding`);
  }
  for (const [key, child] of Object.entries(value)) {
    if (['modelId', 'modelVersion', 'scoreProfileId'].includes(key)
      && typeof child === 'string' && child !== expected.modelId) {
      throw new Error(`${label} contains another model at ${pathPrefix}.${key}`);
    }
    scanBindings(child, expected, label, `${pathPrefix}.${key}`);
  }
}

async function fetchBytes(fetchImpl, url, label) {
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { accept: label.endsWith('.json') || label.endsWith('.geojson')
      ? 'application/json' : 'text/javascript' },
  });
  if (!response?.ok) throw new Error(`${label} returned HTTP ${response?.status ?? 'unknown'}`);
  return Buffer.from(await response.arrayBuffer());
}

function withCacheBuster(baseUrl, relative, sourceHead, observationNonce) {
  const url = new URL(relative, `${String(baseUrl).replace(/\/$/, '')}/`);
  url.searchParams.set('ravscore-source', sourceHead);
  url.searchParams.set('ravscore-observation', observationNonce);
  return url.toString();
}

function normalizedBundleSource(value) {
  return String(value)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/([?&]v=)\d+\.\d+\.\d+(?=["'])/g, '$1<release-version>');
}

function exactKeys(value, fields) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
}

export function parseSealedRavScoreBundleModule(text, { model, binding } = {}) {
  assertExactPublicRavScoreModelBindingShape(binding, 'sealed bundle binding');
  if (!MODEL_MODES[model]) throw new Error('Sealed bundle model is unknown');
  const match = String(text).match(
    /^\/\/ Generated by [^\r\n]+\r?\nexport const GENERATED_RAVSCORE_MODEL_CONTRACT_SHA256 = '([a-f0-9]{64})';\r?\nexport const GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256 = '([a-f0-9]{64})';\r?\nexport const GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST = Object\.freeze\(([\s\S]+)\);\r?\n$/,
  );
  if (!match) {
    throw new Error('Sealed generated model bundle has non-deterministic or executable extra syntax');
  }
  let manifest;
  try { manifest = JSON.parse(match[3]); }
  catch { throw new Error('Sealed generated model bundle manifest is not JSON'); }
  const manifestFields = model === 'integrated'
    ? ['schemaVersion', 'normalizationId', 'contractSha256', 'entrypoints', 'files']
    : ['schemaVersion', 'normalizationId', 'entrypoints', 'excludedModules', 'files'];
  if (!exactKeys(manifest, manifestFields)
    || !Array.isArray(manifest.entrypoints)
    || !Array.isArray(manifest.files)
    || (model === 'candidate-g' && !Array.isArray(manifest.excludedModules))) {
    throw new Error('Sealed generated model bundle manifest has an incompatible exact field set');
  }
  const fileKey = model === 'integrated' ? 'path' : 'file';
  const seen = new Set();
  for (const item of manifest.files) {
    const relative = item?.[fileKey];
    if (!exactKeys(item, [fileKey, 'sha256'])
      || typeof relative !== 'string'
      || !/^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/.test(relative)
      || relative.startsWith('../')
      || !SHA256_PATTERN.test(String(item.sha256 ?? ''))
      || seen.has(relative)) {
      throw new Error('Sealed generated model bundle contains an unsafe or duplicate file');
    }
    seen.add(relative);
  }
  const computedBundleSha256 = sha256(model === 'integrated'
    ? JSON.stringify(canonical(manifest)) : JSON.stringify(manifest));
  if (match[1] !== binding.modelContractSha256
    || match[2] !== binding.modelBundleSha256
    || computedBundleSha256 !== binding.modelBundleSha256
    || (model === 'integrated' && manifest.contractSha256 !== binding.modelContractSha256)) {
    throw new Error('Sealed generated model bundle differs from its exact 11-field binding');
  }
  const contractManifestPath = model === 'integrated'
    ? 'js/core/ravscore-model-contract.js'
    : 'scripts/rollback-assets/ravscore-model-contract.js';
  const contractFile = manifest.files.find(item => item[fileKey] === contractManifestPath);
  if (!contractFile) {
    throw new Error('Sealed generated model bundle omits its executable model contract source');
  }
  const publicFiles = manifest.files
    .map(item => Object.freeze({ path: item[fileKey], sha256: item.sha256 }))
    .filter(item => !item.path.startsWith('scripts/') && !item.path.startsWith('supabase/'));
  for (const required of REQUIRED_PUBLIC_CLOSURE_FILES) {
    if (!publicFiles.some(item => item.path === required)) {
      throw new Error(`Sealed generated model bundle omits public browser closure file ${required}`);
    }
  }
  return Object.freeze({
    manifest,
    publicFiles: Object.freeze(publicFiles),
    contractSourceSha256: contractFile.sha256,
  });
}

export function computeSealedPublicImplementationClosureIdentity({
  expectedModel,
  expectedBinding,
  expectedContractText,
  expectedBundleText,
  expectedPublicClosure,
} = {}) {
  if (typeof expectedContractText !== 'string' || typeof expectedBundleText !== 'string') {
    throw new Error('Sealed public implementation requires exact contract and bundle bytes');
  }
  const sealed = parseSealedRavScoreBundleModule(expectedBundleText, {
    model: expectedModel,
    binding: expectedBinding,
  });
  if (sha256(normalizedBundleSource(expectedContractText)) !== sealed.contractSourceSha256) {
    throw new Error('Sealed executable model contract source differs from the bundle closure');
  }
  assertRavScorePublicBrowserClosure(expectedPublicClosure);
  const expectedClosureFiles = new Map(expectedPublicClosure.files
    .map(item => [item.path, item.sha256]));
  for (const item of sealed.publicFiles) {
    if (expectedClosureFiles.get(item.path) !== item.sha256) {
      throw new Error(`Sealed model and public browser closures diverge at ${item.path}`);
    }
  }
  const identity = Object.freeze({
    schemaVersion: RAVSCORE_SEALED_PUBLIC_IMPLEMENTATION_SCHEMA,
    model: expectedModel,
    modelBinding: structuredClone(expectedBinding),
    contractFileSha256: sha256(Buffer.from(expectedContractText, 'utf8')),
    generatedBundleFileSha256: sha256(Buffer.from(expectedBundleText, 'utf8')),
    publicBrowserClosureSha256:
      sha256(JSON.stringify(canonical(expectedPublicClosure))),
    files: Object.freeze(expectedPublicClosure.files.map(item => Object.freeze({ ...item }))),
  });
  return Object.freeze({
    ...identity,
    implementationClosureSha256: sha256(JSON.stringify(canonical(identity))),
  });
}

async function verifyPublicImplementationClosure({
  baseUrl,
  sourceHead,
  expectedModel,
  expectedBinding,
  expectedContractText,
  expectedBundleText,
  expectedPublicClosure,
  observationNonce,
  fetchImpl,
}) {
  const sealedIdentity = computeSealedPublicImplementationClosureIdentity({
    expectedModel,
    expectedBinding,
    expectedContractText,
    expectedBundleText,
    expectedPublicClosure,
  });
  const [contractBytes, bundleBytes] = await Promise.all([
    fetchBytes(fetchImpl, withCacheBuster(baseUrl,
      'js/core/ravscore-model-contract.js', sourceHead, observationNonce),
    'ravscore-model-contract.js'),
    fetchBytes(fetchImpl, withCacheBuster(baseUrl,
      'js/core/ravscore-model-bundle.generated.js', sourceHead, observationNonce),
    'ravscore-model-bundle.generated.js'),
  ]);
  if (contractBytes.toString('utf8') !== expectedContractText
    || bundleBytes.toString('utf8') !== expectedBundleText) {
    throw new Error('Deployed operational model implementation overlay differs from the sealed source');
  }
  for (const expectedHtml of expectedPublicClosure.htmlEntrypoints) {
    const htmlBytes = await fetchBytes(fetchImpl,
      withCacheBuster(baseUrl, expectedHtml.path, sourceHead, observationNonce), expectedHtml.path);
    const htmlSource = htmlBytes.toString('utf8');
    if (sha256(normalizedBundleSource(htmlSource)) !== expectedHtml.sourceSha256
      || !same(ravScorePublicEntrypointDescriptor(htmlSource, {
        expectedModuleScripts: expectedHtml.executableSurface.moduleScripts,
      }), expectedHtml.executableSurface)) {
      throw new Error(`Deployed public HTML entrypoint differs from the sealed browser closure: ${expectedHtml.path}`);
    }
  }
  for (const item of expectedPublicClosure.files) {
    const bytes = await fetchBytes(fetchImpl,
      withCacheBuster(baseUrl, item.path, sourceHead, observationNonce), item.path);
    if (sha256(normalizedBundleSource(bytes.toString('utf8'))) !== item.sha256) {
      throw new Error(`Deployed public browser implementation closure drifted: ${item.path}`);
    }
  }
  if (sha256(contractBytes) !== sealedIdentity.contractFileSha256
    || sha256(bundleBytes) !== sealedIdentity.generatedBundleFileSha256) {
    throw new Error('Deployed public implementation byte identity differs from the sealed target');
  }
  return sealedIdentity.implementationClosureSha256;
}

function assertPublicDocuments({ manifest, startup, details, coastalParts, zoneRegistry }, mode,
  expected) {
  if (manifest.schemaVersion !== 4 || manifest.complete !== true
    || !manifest.datasetId
    || !Number.isFinite(Date.parse(manifest.productionReferenceAt))
    || manifest.zoneCount !== 210
    || manifest.coastalPartCount !== 673
    || Object.keys(startup?.zones ?? {}).length !== 210
    || Object.keys(details?.zones ?? {}).length !== 210
    || Object.keys(details?.coastalParts?.parts ?? {}).length !== 673
    || coastalParts?.zoneCount !== 210
    || coastalParts?.partCount !== 673
    || zoneRegistry?.type !== 'FeatureCollection') {
    throw new Error('Deployed operational RavScore package lacks exact schema-4 210/673 coverage');
  }
  for (const [label, document] of [['startup', startup], ['details', details]]) {
    if (document.datasetId !== manifest.datasetId
      || document.productionReferenceAt !== manifest.productionReferenceAt
      || document.ravScoreRuntime?.datasetId !== manifest.datasetId
      || document.ravScoreRuntime?.productionReferenceAt !== manifest.productionReferenceAt
      || document.ravScoreRuntime?.payloadBodySha256 !== bodySha256(document)) {
      throw new Error(`Deployed ${label} runtime envelope is incompatible`);
    }
    assertExactBinding(document.ravScoreRuntime.modelBinding, expected,
      `Deployed ${label} runtime binding`);
    assertPublicRuntimeEnvelope(document, {
      kind: label === 'startup' ? RAVSCORE_PUBLIC_STARTUP_KIND : RAVSCORE_PUBLIC_DETAILS_KIND,
      datasetId: manifest.datasetId,
      productionReferenceAt: manifest.productionReferenceAt,
      modelBinding: expected,
      label: `Deployed ${label}`,
    });
  }
  assertExactBinding(manifest.ravScoreModelBinding, expected, 'Deployed manifest binding');
  assertExactBinding(manifest.ravScoreRuntime?.modelBinding, expected,
    'Deployed manifest runtime binding');
  assertPublicRuntimeManifest(manifest.ravScoreRuntime, {
    modelBinding: expected,
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
    label: 'Deployed manifest RavScore runtime',
  });
  assertExactPublicRavScoreProfile(startup?.coastalParts?.scoreProfile, expected,
    'Deployed startup score profile');
  assertOperationalProfileControls(startup.coastalParts.scoreProfile, mode,
    'Deployed startup score profile');
  assertSameExactPublicRavScoreProfile(details?.coastalParts?.scoreProfile,
    startup?.coastalParts?.scoreProfile, expected, 'Deployed detail score profile');
  assertSameExactPublicRavScoreProfile(manifest.ravScoreProfile,
    startup?.coastalParts?.scoreProfile, expected, 'Deployed manifest score profile');
  if (manifest.ravScoreAvailability?.allZonesActive !== true
    || manifest.ravScoreAvailability?.unavailableZoneCount !== 0) {
    throw new Error('Deployed operational RavScore profile or availability is incompatible');
  }
  for (const [label, document] of [
    ['manifest', manifest], ['startup', startup], ['details', details],
  ]) scanBindings(document, expected, label);
}

async function verifyOnce({
  baseUrl,
  sourceHead,
  expectedManifest,
  expectedModel,
  expectedBinding,
  expectedContractText,
  expectedBundleText,
  expectedPublicClosure,
  observationNonce,
  fetchImpl,
} = {}) {
  const manifestBytes = await fetchBytes(fetchImpl,
    withCacheBuster(baseUrl, 'data/live/manifest.json', sourceHead, observationNonce),
    'manifest.json');
  let manifest;
  try { manifest = JSON.parse(manifestBytes.toString('utf8')); }
  catch { throw new Error('Deployed operational manifest is not JSON'); }
  if (!same(manifest, expectedManifest)) {
    throw new Error('Deployed operational manifest differs from the sealed artifact');
  }
  const fetched = {};
  for (const relative of PUBLIC_FILES) {
    fetched[relative] = await fetchBytes(fetchImpl,
      withCacheBuster(baseUrl, relative, sourceHead, observationNonce), relative);
  }
  const digestChecks = [
    ['data/live/public-conditions.json', manifest.publicConditionsSha256,
      manifest.publicConditionsBytes],
    ['data/live/public-condition-details.json', manifest.publicConditionDetailsSha256,
      manifest.publicConditionDetailsBytes],
    ['data/live/coastal-parts-v2.json', manifest.coastalPartsSha256,
      manifest.coastalPartsBytes],
    ['data/zones.geojson', manifest.zoneRegistrySha256, manifest.zoneRegistryBytes],
  ];
  for (const [relative, expectedSha, expectedBytes] of digestChecks) {
    if (!SHA256_PATTERN.test(String(expectedSha ?? ''))
      || sha256(fetched[relative]) !== expectedSha
      || fetched[relative].length !== expectedBytes) {
      throw new Error(`Deployed operational artifact digest mismatch for ${relative}`);
    }
  }
  const parsed = Object.fromEntries(PUBLIC_FILES.map(relative => {
    try { return [relative, JSON.parse(fetched[relative].toString('utf8'))]; }
    catch { throw new Error(`Deployed operational artifact is not JSON: ${relative}`); }
  }));
  assertPublicDocuments({
    manifest,
    startup: parsed['data/live/public-conditions.json'],
    details: parsed['data/live/public-condition-details.json'],
    coastalParts: parsed['data/live/coastal-parts-v2.json'],
    zoneRegistry: parsed['data/zones.geojson'],
  }, expectedModel, expectedBinding);

  const implementationClosureSha256 = await verifyPublicImplementationClosure({
    baseUrl,
    sourceHead,
    expectedModel,
    expectedBinding,
    expectedContractText,
    expectedBundleText,
    expectedPublicClosure,
    observationNonce,
    fetchImpl,
  });
  return Object.freeze({
    schemaVersion: RAVSCORE_OPERATIONAL_PAGES_VERIFICATION_SCHEMA,
    status: 'passed',
    sourceHead,
    datasetId: manifest.datasetId,
    productionReferenceAt: manifest.productionReferenceAt,
    model: expectedModel,
    modelBinding: structuredClone(expectedBinding),
    implementationClosureSha256,
    publicManifestSha256: sha256(JSON.stringify(canonical(manifest))),
    zoneCount: manifest.zoneCount,
    coastalPartCount: manifest.coastalPartCount,
    privatePayloadRead: false,
  });
}

export async function verifyRavScoreOperationalPagesDeployment({
  baseUrl,
  sourceHead,
  expectedManifest,
  expectedModel,
  expectedBinding = null,
  expectedContractText,
  expectedBundleText,
  expectedPublicClosure = null,
  observationNonce = null,
  fetchImpl = globalThis.fetch,
  attempts = 12,
  retryDelayMs = 5_000,
} = {}) {
  const sealedBinding = expectedBinding ?? MODEL_MODES[expectedModel]?.binding();
  if (!MODEL_MODES[expectedModel]
    || !/^https:\/\//.test(String(baseUrl ?? ''))
    || !/^[a-f0-9]{40}$/.test(String(sourceHead ?? ''))
    || typeof expectedContractText !== 'string'
    || typeof expectedBundleText !== 'string'
    || !/^[A-Za-z0-9._-]{8,128}$/.test(String(observationNonce ?? ''))
    || typeof fetchImpl !== 'function'
    || !Number.isSafeInteger(attempts)
    || attempts < 1
    || attempts > 12) {
    throw new Error('Operational Pages verification inputs are incompatible');
  }
  assertExactPublicRavScoreModelBindingShape(sealedBinding,
    'Operational Pages expected sealed model binding');
  const sealedPublicClosure = expectedPublicClosure
    ?? (await computeRavScorePublicBrowserClosure()).manifest;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await verifyOnce({
        baseUrl,
        sourceHead,
        expectedManifest,
        expectedModel,
        expectedBinding: sealedBinding,
        expectedContractText,
        expectedBundleText,
        expectedPublicClosure: sealedPublicClosure,
        observationNonce: `${observationNonce}-${attempt}`,
        fetchImpl,
      });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
  }
  throw lastError;
}

function argumentValue(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0 || !argv[index + 1] || argv[index + 1].startsWith('--')) {
    throw new Error(`Operational Pages verification requires ${name}`);
  }
  return argv[index + 1];
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

async function main() {
  const argv = process.argv.slice(2);
  const expectedModel = argumentValue(argv, '--model');
  const mode = MODEL_MODES[expectedModel];
  if (!mode) throw new Error('Operational Pages model must be integrated or candidate-g');
  const bindingPath = argv.includes('--binding') ? argumentValue(argv, '--binding') : null;
  const contractPath = argv.includes('--contract')
    ? argumentValue(argv, '--contract') : mode.contractPath;
  const bundlePath = argv.includes('--bundle')
    ? argumentValue(argv, '--bundle') : mode.bundlePath;
  const publicClosurePath = argv.includes('--public-closure')
    ? argumentValue(argv, '--public-closure') : null;
  const [expectedManifest, expectedBinding, expectedContractText, expectedBundleText,
    expectedPublicClosure] = await Promise.all([
    fs.readFile(argumentValue(argv, '--manifest'), 'utf8').then(JSON.parse),
    bindingPath
      ? fs.readFile(bindingPath, 'utf8').then(JSON.parse)
      : Promise.resolve(mode.binding()),
    fs.readFile(contractPath, 'utf8'),
    fs.readFile(bundlePath, 'utf8'),
    publicClosurePath
      ? fs.readFile(publicClosurePath, 'utf8').then(JSON.parse)
      : computeRavScorePublicBrowserClosure().then(result => result.manifest),
  ]);
  const result = await verifyRavScoreOperationalPagesDeployment({
    baseUrl: argumentValue(argv, '--base-url'),
    sourceHead: argumentValue(argv, '--source-head'),
    expectedManifest,
    expectedModel,
    expectedBinding,
    expectedContractText,
    expectedBundleText,
    expectedPublicClosure,
    observationNonce: argumentValue(argv, '--observation-nonce'),
  });
  await atomicWriteJson(argumentValue(argv, '--output'), result);
  console.log(`Operational Pages verified: ${result.model}, ${result.zoneCount}/${result.coastalPartCount}, private payload read: false.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`Operational Pages verification failed closed: ${error.message}`);
    process.exitCode = 1;
  });
}
