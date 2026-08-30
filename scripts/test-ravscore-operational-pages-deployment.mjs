import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {
  ravScoreModelBinding as integratedModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  ravScoreModelBinding as candidateModelBinding,
} from './rollback-assets/ravscore-model-contract.js';
import {
  computeSealedPublicImplementationClosureIdentity,
  verifyRavScoreOperationalPagesDeployment,
} from './verify-ravscore-operational-pages-deployment.mjs';
import {
  RAVSCORE_PUBLIC_BROWSER_CLOSURE_NORMALIZATION,
  RAVSCORE_PUBLIC_BROWSER_CLOSURE_SCHEMA,
  RAVSCORE_PUBLIC_BROWSER_EXECUTABLE_ENTRYPOINTS,
  RAVSCORE_PUBLIC_BROWSER_REQUIRED_MODEL_CONSUMERS,
  ravScorePublicEntrypointDescriptor,
} from './lib/ravscore-public-browser-closure.mjs';

const sourceHead = 'e'.repeat(40);
const productionReferenceAt = '2026-08-29T12:00:00.000Z';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const REQUIRED_CLOSURE = Object.freeze([...new Set([
  ...RAVSCORE_PUBLIC_BROWSER_EXECUTABLE_ENTRYPOINTS,
  ...RAVSCORE_PUBLIC_BROWSER_REQUIRED_MODEL_CONSUMERS,
])]);
const MODEL_CLOSURE = Object.freeze([
  'js/core/best-time-selector.js',
  'js/core/local-zone-score.js',
  'js/services/rav-assistant.js',
  'js/services/trip-evidence-public-adapter.js',
]);
const INDEX_HTML = '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' https://unpkg.com"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script type="module" src="bootstrap.js?v=4.0.308"></script>';
const ADMIN_HTML = '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' https://unpkg.com"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script type="module" src="js/ui/admin-dashboard.js?v=4.0.308"></script>';
const normalizedSource = value => String(value)
  .replace(/^\uFEFF/, '')
  .replace(/\r\n?/g, '\n')
  .replace(/([?&]v=)\d+\.\d+\.\d+(?=["'])/g, '$1<release-version>');

function bodySha256(document) {
  const { ravScoreRuntime: _runtime, ...body } = document;
  return sha256(JSON.stringify(canonical(body)));
}

function jsonBytes(value) {
  return Buffer.from(JSON.stringify(value));
}

function response(bytes) {
  const copy = Uint8Array.from(bytes);
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => copy.buffer,
  };
}

function sealedImplementation(baseBinding, mode) {
  const contractText = `// sealed ${mode} contract\n`;
  const contractPath = mode === 'integrated'
    ? 'js/core/ravscore-model-contract.js'
    : 'scripts/rollback-assets/ravscore-model-contract.js';
  const sources = new Map(REQUIRED_CLOSURE.map(relative => [
    relative,
    `// sealed ${mode} public closure: ${relative}\n`,
  ]));
  sources.set('js/core/ravscore-model-contract.js', contractText);
  const modelSources = new Map(MODEL_CLOSURE.map(relative => [relative, sources.get(relative)]));
  modelSources.set(contractPath, contractText);
  const fileKey = mode === 'integrated' ? 'path' : 'file';
  const files = [...modelSources].map(([relative, source]) => ({
    [fileKey]: relative,
    sha256: sha256(normalizedSource(source)),
  }));
  const manifest = mode === 'integrated'
    ? {
      schemaVersion: '1.0.0',
      normalizationId: 'lexer-esm-relative-import-closure-utf8-lf-static-cachebuster-v2',
      contractSha256: baseBinding.modelContractSha256,
      entrypoints: [...REQUIRED_CLOSURE],
      files,
    }
    : {
      schemaVersion: 'candidate-g-operational-rollback-bundle-v1',
      normalizationId: 'candidate-g-rollback-lexer-esm-closure-utf8-lf-static-cachebuster-v2',
      entrypoints: [...REQUIRED_CLOSURE],
      excludedModules: [
        'js/core/ravscore-model-bundle.generated.js',
        'js/core/ravscore-model-contract.js',
        'scripts/rollback-assets/ravscore-model-bundle.generated.js',
      ],
      files,
    };
  const bundleSha256 = sha256(mode === 'integrated'
    ? JSON.stringify(canonical(manifest)) : JSON.stringify(manifest));
  const binding = Object.freeze({ ...baseBinding, modelBundleSha256: bundleSha256 });
  const publicClosure = Object.freeze({
    schemaVersion: RAVSCORE_PUBLIC_BROWSER_CLOSURE_SCHEMA,
    normalizationId: RAVSCORE_PUBLIC_BROWSER_CLOSURE_NORMALIZATION,
    htmlEntrypoints: [
      Object.freeze({
        path: 'index.html',
        sourceSha256: sha256(normalizedSource(INDEX_HTML)),
        executableSurface: ravScorePublicEntrypointDescriptor(INDEX_HTML, {
          expectedModuleScripts: ['bootstrap.js'],
        }),
      }),
      Object.freeze({
        path: 'admin.html',
        sourceSha256: sha256(normalizedSource(ADMIN_HTML)),
        executableSurface: ravScorePublicEntrypointDescriptor(ADMIN_HTML, {
          expectedModuleScripts: ['js/ui/admin-dashboard.js'],
        }),
      }),
    ],
    executableEntrypoints: [...RAVSCORE_PUBLIC_BROWSER_EXECUTABLE_ENTRYPOINTS],
    files: [...sources].sort(([left], [right]) => left.localeCompare(right))
      .map(([relative, source]) => Object.freeze({
        path: relative,
        sha256: sha256(normalizedSource(source)),
      })),
  });
  const bundleText = [
    `// Generated by synthetic ${mode} verifier fixture.`,
    `export const GENERATED_RAVSCORE_MODEL_CONTRACT_SHA256 = '${binding.modelContractSha256}';`,
    `export const GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256 = '${binding.modelBundleSha256}';`,
    `export const GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST = Object.freeze(${JSON.stringify(manifest, null, 2)});`,
    '',
  ].join('\n');
  return Object.freeze({
    binding,
    contractText,
    bundleText,
    sources,
    publicClosure,
  });
}

function profileFor(binding, mode) {
  const candidate = mode === 'candidate-g';
  return {
    schemaVersion: candidate ? '2.0.0' : '3.0.0',
    switchVersion: candidate
      ? 'RAVSCORE-OPERATIONAL-ROLLBACK-DEC-0110-V2'
      : 'RAVSCORE-PROFILE-SWITCH-INTEGRATED-1.0.0',
    requestedProfileId: binding.modelId,
    activeProfileId: binding.modelId,
    stateSchemaVersion: binding.stateSchemaVersion,
    variantId: binding.variantId,
    profileId: binding.profileId,
    componentSchemaId: binding.componentSchemaId,
    explanationSchemaId: binding.explanationSchemaId,
    rankingPolicyId: binding.rankingPolicyId,
    bestTimePolicyId: binding.bestTimePolicyId,
    presentationPolicyId: binding.presentationPolicyId,
    modelContractSha256: binding.modelContractSha256,
    modelBundleSha256: binding.modelBundleSha256,
    rollbackModelId: candidate
      ? null : 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3',
    runtimeFallbackModelId: null,
    modelCoverageReady: true,
    modelMemoryReady: true,
    modelMigrationReady: true,
    memoryReferenceScope: 'CURRENT_COMMON_ZONE_REFERENCE',
    activationState: candidate
      ? 'manual-candidate-g-only-local-fail-closed'
      : 'integrated-model-only-local-fail-closed',
    advisories: [],
    publicAvailabilityPolicy: candidate
      ? 'candidate-g-local-fail-closed'
      : 'integrated-model-local-fail-closed',
    crossModelRuntimeFallbackAllowed: false,
    automaticActivationAllowed: false,
  };
}

function buildFixture(binding, mode) {
  const datasetId = `rr-20260829120000-${mode}`;
  const zones = Object.fromEntries(Array.from({ length: 210 }, (_, index) => [
    `zone-${index + 1}`,
    { available: true },
  ]));
  const parts = Object.fromEntries(Array.from({ length: 673 }, (_, index) => [
    `part-${index + 1}`,
    { available: true, modelBinding: binding },
  ]));
  const scoreProfile = profileFor(binding, mode);
  const startupBody = {
    datasetId,
    productionReferenceAt,
    zones,
    coastalParts: { scoreProfile },
  };
  const startup = {
    ...startupBody,
    ravScoreRuntime: {
      schemaVersion: '1.0.0',
      kind: 'RAVSCORE_PUBLIC_STARTUP',
      datasetId,
      productionReferenceAt,
      payloadBodySha256: bodySha256(startupBody),
      modelBinding: binding,
    },
  };
  const detailsBody = {
    datasetId,
    productionReferenceAt,
    zones,
    coastalParts: { modelBinding: binding, scoreProfile, parts },
  };
  const details = {
    ...detailsBody,
    ravScoreRuntime: {
      schemaVersion: '1.0.0',
      kind: 'RAVSCORE_PUBLIC_DETAILS',
      datasetId,
      productionReferenceAt,
      payloadBodySha256: bodySha256(detailsBody),
      modelBinding: binding,
    },
  };
  const coastalParts = {
    schemaVersion: 2,
    zoneCount: 210,
    partCount: 673,
    modelBinding: binding,
  };
  const zoneRegistry = {
    type: 'FeatureCollection',
    features: Array.from({ length: 210 }, (_, index) => ({
      type: 'Feature',
      properties: { id: `zone-${index + 1}` },
      geometry: null,
    })),
  };
  const files = new Map([
    ['/index.html', Buffer.from(INDEX_HTML)],
    ['/admin.html', Buffer.from(ADMIN_HTML)],
    ['/data/live/public-conditions.json', jsonBytes(startup)],
    ['/data/live/public-condition-details.json', jsonBytes(details)],
    ['/data/live/coastal-parts-v2.json', jsonBytes(coastalParts)],
    ['/data/zones.geojson', jsonBytes(zoneRegistry)],
  ]);
  const manifest = {
    schemaVersion: 4,
    complete: true,
    datasetId,
    productionReferenceAt,
    zoneCount: 210,
    coastalPartCount: 673,
    publicConditionsSha256: sha256(files.get('/data/live/public-conditions.json')),
    publicConditionsBytes: files.get('/data/live/public-conditions.json').length,
    publicConditionDetailsSha256: sha256(files.get('/data/live/public-condition-details.json')),
    publicConditionDetailsBytes: files.get('/data/live/public-condition-details.json').length,
    coastalPartsSha256: sha256(files.get('/data/live/coastal-parts-v2.json')),
    coastalPartsBytes: files.get('/data/live/coastal-parts-v2.json').length,
    zoneRegistrySha256: sha256(files.get('/data/zones.geojson')),
    zoneRegistryBytes: files.get('/data/zones.geojson').length,
    ravScoreModelBinding: binding,
    ravScoreRuntime: {
      schemaVersion: '1.0.0',
      modelBinding: binding,
      startup: {
        kind: 'RAVSCORE_PUBLIC_STARTUP',
        payloadBodySha256: startup.ravScoreRuntime.payloadBodySha256,
        fileSha256: sha256(files.get('/data/live/public-conditions.json')),
        bytes: files.get('/data/live/public-conditions.json').length,
      },
      details: {
        kind: 'RAVSCORE_PUBLIC_DETAILS',
        payloadBodySha256: details.ravScoreRuntime.payloadBodySha256,
        fileSha256: sha256(files.get('/data/live/public-condition-details.json')),
        bytes: files.get('/data/live/public-condition-details.json').length,
      },
    },
    ravScoreProfile: scoreProfile,
    ravScoreAvailability: {
      allZonesActive: true,
      unavailableZoneCount: 0,
    },
  };
  files.set('/data/live/manifest.json', jsonBytes(manifest));
  return { datasetId, files, manifest, startup, details };
}

function mockFetch(files) {
  return async url => {
    const bytes = files.get(new URL(url).pathname);
    return bytes ? response(bytes) : { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
  };
}

function resealPublicDocuments(fixture) {
  for (const document of [fixture.startup, fixture.details]) {
    document.ravScoreRuntime.payloadBodySha256 = bodySha256(document);
  }
  const startupBytes = jsonBytes(fixture.startup);
  const detailsBytes = jsonBytes(fixture.details);
  fixture.files.set('/data/live/public-conditions.json', startupBytes);
  fixture.files.set('/data/live/public-condition-details.json', detailsBytes);
  fixture.manifest.publicConditionsSha256 = sha256(startupBytes);
  fixture.manifest.publicConditionsBytes = startupBytes.length;
  fixture.manifest.publicConditionDetailsSha256 = sha256(detailsBytes);
  fixture.manifest.publicConditionDetailsBytes = detailsBytes.length;
  Object.assign(fixture.manifest.ravScoreRuntime.startup, {
    payloadBodySha256: fixture.startup.ravScoreRuntime.payloadBodySha256,
    fileSha256: fixture.manifest.publicConditionsSha256,
    bytes: startupBytes.length,
  });
  Object.assign(fixture.manifest.ravScoreRuntime.details, {
    payloadBodySha256: fixture.details.ravScoreRuntime.payloadBodySha256,
    fileSha256: fixture.manifest.publicConditionDetailsSha256,
    bytes: detailsBytes.length,
  });
  fixture.files.set('/data/live/manifest.json', jsonBytes(fixture.manifest));
}

for (const [mode, baseBinding] of [
  ['integrated', integratedModelBinding()],
  ['candidate-g', candidateModelBinding()],
]) {
  const implementation = sealedImplementation(baseBinding, mode);
  const { binding, contractText, bundleText, publicClosure } = implementation;
  const fixture = buildFixture(binding, mode);
  fixture.files.set('/js/core/ravscore-model-contract.js', Buffer.from(contractText));
  fixture.files.set('/js/core/ravscore-model-bundle.generated.js', Buffer.from(bundleText));
  for (const [relative, source] of implementation.sources) {
    fixture.files.set(`/${relative}`, Buffer.from(source));
  }
  const result = await verifyRavScoreOperationalPagesDeployment({
    baseUrl: 'https://ravradar.example.test/',
    sourceHead,
    expectedManifest: fixture.manifest,
    expectedModel: mode,
    expectedBinding: binding,
    expectedContractText: contractText,
    expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure,
    observationNonce: 'fixture-observation-01',
    fetchImpl: mockFetch(fixture.files),
    attempts: 1,
  });
  assert.equal(result.status, 'passed');
  assert.equal(result.model, mode);
  assert.equal(result.zoneCount, 210);
  assert.equal(result.coastalPartCount, 673);
  assert.equal(result.privatePayloadRead, false);
  assert.deepEqual(result.modelBinding, binding);
  const predeployIdentity = computeSealedPublicImplementationClosureIdentity({
    expectedModel: mode,
    expectedBinding: binding,
    expectedContractText: contractText,
    expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure,
  });
  assert.equal(result.implementationClosureSha256,
    predeployIdentity.implementationClosureSha256,
    'the predeploy seal and deployed byte verification must produce one canonical identity');
  const mutatedClosure = structuredClone(publicClosure);
  const mutableItem = mutatedClosure.files.find(item => item.path === 'bootstrap.js');
  mutableItem.sha256 = 'f'.repeat(64);
  const mutatedIdentity = computeSealedPublicImplementationClosureIdentity({
    expectedModel: mode,
    expectedBinding: binding,
    expectedContractText: contractText,
    expectedBundleText: bundleText,
    expectedPublicClosure: mutatedClosure,
  });
  assert.notEqual(mutatedIdentity.implementationClosureSha256,
    predeployIdentity.implementationClosureSha256,
    'a mutated transitive public file must alter the predeploy implementation identity');

  const tamperedFiles = new Map(fixture.files);
  tamperedFiles.set('/data/live/public-condition-details.json', Buffer.from('tampered'));
  await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
    baseUrl: 'https://ravradar.example.test/',
    sourceHead,
    expectedManifest: fixture.manifest,
    expectedModel: mode,
    expectedBinding: binding,
    expectedContractText: contractText,
    expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure,
    observationNonce: 'fixture-observation-02',
    fetchImpl: mockFetch(tamperedFiles),
    attempts: 1,
  }), /digest mismatch/);

  for (const [label, mutate] of [
    ['partial startup profile', invalid => {
      delete invalid.startup.coastalParts.scoreProfile.rankingPolicyId;
      resealPublicDocuments(invalid);
    }],
    ['extra detail profile field', invalid => {
      invalid.details.coastalParts.scoreProfile.unexpectedShadowBinding = 'forbidden';
      resealPublicDocuments(invalid);
    }],
    ['forged manifest profile policy', invalid => {
      invalid.manifest.ravScoreProfile.bestTimePolicyId = 'forged-best-time';
      invalid.files.set('/data/live/manifest.json', jsonBytes(invalid.manifest));
    }],
    ['extra payload envelope field', invalid => {
      invalid.startup.ravScoreRuntime.hiddenFallback = true;
      resealPublicDocuments(invalid);
    }],
    ['extra manifest runtime field', invalid => {
      invalid.manifest.ravScoreRuntime.hiddenFallback = true;
      invalid.files.set('/data/live/manifest.json', jsonBytes(invalid.manifest));
    }],
    ['partial manifest runtime descriptor', invalid => {
      delete invalid.manifest.ravScoreRuntime.details.fileSha256;
      invalid.files.set('/data/live/manifest.json', jsonBytes(invalid.manifest));
    }],
  ]) {
    const invalid = buildFixture(binding, mode);
    invalid.files.set('/js/core/ravscore-model-contract.js', Buffer.from(contractText));
    invalid.files.set('/js/core/ravscore-model-bundle.generated.js', Buffer.from(bundleText));
    for (const [relative, source] of implementation.sources) {
      invalid.files.set(`/${relative}`, Buffer.from(source));
    }
    mutate(invalid);
    await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
      baseUrl: 'https://ravradar.example.test/',
      sourceHead,
      expectedManifest: invalid.manifest,
      expectedModel: mode,
      expectedBinding: binding,
      expectedContractText: contractText,
      expectedBundleText: bundleText,
      expectedPublicClosure: publicClosure,
      observationNonce: 'fixture-observation-invalid',
      fetchImpl: mockFetch(invalid.files),
      attempts: 1,
    }), /profile|runtime|field set|match|incompatible/i, `${mode}: ${label}`);
  }

  const transitiveMutation = new Map(fixture.files);
  transitiveMutation.set('/js/core/local-zone-score.js', Buffer.from('// mutated transitive score consumer\n'));
  await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
    baseUrl: 'https://ravradar.example.test/',
    sourceHead,
    expectedManifest: fixture.manifest,
    expectedModel: mode,
    expectedBinding: binding,
    expectedContractText: contractText,
    expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure,
    observationNonce: 'fixture-observation-transitive',
    fetchImpl: mockFetch(transitiveMutation),
    attempts: 1,
  }), /public browser implementation closure drifted.*local-zone-score/);

  const bootstrapMutation = new Map(fixture.files);
  bootstrapMutation.set('/bootstrap.js', Buffer.from('// loads a different app\n'));
  await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
    baseUrl: 'https://ravradar.example.test/',
    sourceHead,
    expectedManifest: fixture.manifest,
    expectedModel: mode,
    expectedBinding: binding,
    expectedContractText: contractText,
    expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure,
    observationNonce: 'fixture-observation-bootstrap',
    fetchImpl: mockFetch(bootstrapMutation),
    attempts: 1,
  }), /public browser implementation closure drifted.*bootstrap/);

  const htmlTargetMutation = new Map(fixture.files);
  htmlTargetMutation.set('/index.html', Buffer.from('<script type="module" src="evil.js"></script>'));
  await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
    baseUrl: 'https://ravradar.example.test/', sourceHead,
    expectedManifest: fixture.manifest, expectedModel: mode, expectedBinding: binding,
    expectedContractText: contractText, expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure,
    observationNonce: 'fixture-observation-html',
    fetchImpl: mockFetch(htmlTargetMutation), attempts: 1,
  }), /HTML entrypoint differs from the sealed browser closure/);

  const contractSideEffect = `${contractText}globalThis.forbidden = true;\n`;
  const contractMutation = new Map(fixture.files);
  contractMutation.set('/js/core/ravscore-model-contract.js', Buffer.from(contractSideEffect));
  await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
    baseUrl: 'https://ravradar.example.test/', sourceHead,
    expectedManifest: fixture.manifest, expectedModel: mode, expectedBinding: binding,
    expectedContractText: contractSideEffect, expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure,
    observationNonce: 'fixture-observation-contract',
    fetchImpl: mockFetch(contractMutation), attempts: 1,
  }), /contract source differs from the bundle closure/);

  await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
    baseUrl: 'https://ravradar.example.test/',
    sourceHead,
    expectedManifest: fixture.manifest,
    expectedModel: mode,
    expectedBinding: binding,
    expectedContractText: contractText,
    expectedBundleText: `${bundleText}\nconsole.log('forbidden');\n`,
    expectedPublicClosure: publicClosure,
    observationNonce: 'fixture-observation-bundle',
    fetchImpl: mockFetch(fixture.files),
    attempts: 1,
  }), /executable extra syntax|manifest is not JSON/);
}

const mixedImplementation = sealedImplementation(integratedModelBinding(), 'integrated');
const integrated = buildFixture(mixedImplementation.binding, 'integrated');
const candidate = candidateModelBinding();
const mixedStartup = structuredClone(integrated.startup);
mixedStartup.ravScoreRuntime.modelBinding = candidate;
const mixedBytes = jsonBytes(mixedStartup);
integrated.files.set('/data/live/public-conditions.json', mixedBytes);
integrated.manifest.publicConditionsSha256 = sha256(mixedBytes);
integrated.manifest.publicConditionsBytes = mixedBytes.length;
integrated.files.set('/data/live/manifest.json', jsonBytes(integrated.manifest));
const integratedContract = mixedImplementation.contractText;
const integratedBundle = mixedImplementation.bundleText;
const integratedPublicClosure = mixedImplementation.publicClosure;
integrated.files.set('/js/core/ravscore-model-contract.js', Buffer.from(integratedContract));
integrated.files.set('/js/core/ravscore-model-bundle.generated.js', Buffer.from(integratedBundle));
for (const [relative, source] of mixedImplementation.sources) {
  integrated.files.set(`/${relative}`, Buffer.from(source));
}
await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
  baseUrl: 'https://ravradar.example.test/',
  sourceHead,
  expectedManifest: integrated.manifest,
  expectedModel: 'integrated',
  expectedBinding: mixedImplementation.binding,
  expectedContractText: integratedContract,
  expectedBundleText: integratedBundle,
  expectedPublicClosure: integratedPublicClosure,
  observationNonce: 'fixture-observation-mixed',
  fetchImpl: mockFetch(integrated.files),
  attempts: 1,
}), /incompatible|exact|another model/);

console.log('Operational Pages exact integrated/Candidate 210/673 verification and mixed/tampered fail-closed: passed.');
