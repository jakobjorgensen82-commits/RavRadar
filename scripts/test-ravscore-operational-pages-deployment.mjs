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
  assertKnownSourceRepairBrowserClosure,
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
const completeSourceRepair = Object.freeze({
  expectedPublicFileCount: 79,
  knownMissingPublicFile: null,
});
assert.equal(assertKnownSourceRepairBrowserClosure({
  knownSourceRepair: completeSourceRepair,
  expectedPublicFileCount: 79,
  missingPublicFiles: [],
}), true, 'a pinned complete 79/79 source must be repairable without inventing a missing file');
assert.throws(() => assertKnownSourceRepairBrowserClosure({
  knownSourceRepair: completeSourceRepair,
  expectedPublicFileCount: 79,
  missingPublicFiles: [{
    path: 'unexpected.js', sha256: 'a'.repeat(64), httpStatus: 404,
  }],
}), /exact pinned browser closure/,
'a complete source repair must reject any missing browser file');
const oneMissingSourceRepair = Object.freeze({
  expectedPublicFileCount: 79,
  knownMissingPublicFile: Object.freeze({
    path: 'known-missing.js', sha256: 'b'.repeat(64), expectedHttpStatus: 404,
  }),
});
assert.equal(assertKnownSourceRepairBrowserClosure({
  knownSourceRepair: oneMissingSourceRepair,
  expectedPublicFileCount: 79,
  missingPublicFiles: [{
    path: 'known-missing.js', sha256: 'b'.repeat(64), httpStatus: 404,
  }],
}), true, 'the older one-file repair shape must remain exact and supported');
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
  const integratedScore = {
    available: true,
    score: 50,
    scoreQuality: 'FULL_HISTORY',
    calibrationEligible: true,
    scoreSemantics: 'EXACT_POINT_SCORE',
    conservativeTailResetApplied: false,
    scoreBounds: {
      lower: 50, upper: 50, modelUncertaintyPoints: 0, rawLower: 50, rawUpper: 50,
    },
    historyCoverageHours: 48,
    historyReasonCodes: [],
    modelBinding: binding,
  };
  const scoreZones = Object.fromEntries(Object.keys(zones).map(zoneId => [zoneId, {
    currentReferenceAt: productionReferenceAt,
    hourly: [{
      time: productionReferenceAt,
      waders: structuredClone(integratedScore),
      beach: structuredClone(integratedScore),
    }],
  }]));
  const integratedAvailability = {
    schemaVersion: 2,
    policy: 'integrated-model-local-fail-closed',
    allZonesActive: true,
    activeZoneCount: 210,
    unavailableZoneCount: 0,
    totalZoneCount: 210,
    allCurrentScoresFullHistory: true,
    fullHistoryModeCount: 420,
    historyIncompleteModeCount: 0,
    historyIncompleteZoneCount: 0,
    evaluatedAt: productionReferenceAt,
    unavailableZones: [],
    historyIncompleteZones: [],
  };
  const startupBody = {
    datasetId,
    productionReferenceAt,
    zones,
    coastalParts: mode === 'integrated'
      ? {
        scoreProfile,
        scoreAvailability: structuredClone(integratedAvailability),
        zones: structuredClone(scoreZones),
      }
      : { scoreProfile },
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
    coastalParts: mode === 'integrated'
      ? {
        modelBinding: binding,
        scoreProfile,
        scoreAvailability: structuredClone(integratedAvailability),
        parts,
        zones: structuredClone(scoreZones),
      }
      : { modelBinding: binding, scoreProfile, parts },
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
    ravScoreAvailability: mode === 'integrated' ? {
      schemaVersion: 2,
      policy: 'integrated-model-local-fail-closed',
      allZonesActive: true,
      activeZoneCount: 210,
      unavailableZoneCount: 0,
      totalZoneCount: 210,
      allCurrentScoresFullHistory: true,
      fullHistoryModeCount: 420,
      historyIncompleteModeCount: 0,
      historyIncompleteZoneCount: 0,
      evaluatedAt: productionReferenceAt,
      unavailableZones: [],
      historyIncompleteZones: [],
    } : {
      allZonesActive: true,
      unavailableZoneCount: 0,
    },
  };
  files.set('/data/live/manifest.json', jsonBytes(manifest));
  return { datasetId, files, manifest, startup, details };
}

function installHistoryIncompleteIntegratedState(fixture) {
  const incompleteProfile = {
    ...fixture.startup.coastalParts.scoreProfile,
    modelMemoryReady: false,
    advisories: ['LOCAL_MODEL_MEMORY_INCOMPLETE'],
  };
  fixture.startup.coastalParts.scoreProfile = structuredClone(incompleteProfile);
  fixture.details.coastalParts.scoreProfile = structuredClone(incompleteProfile);
  fixture.manifest.ravScoreProfile = structuredClone(incompleteProfile);
  fixture.manifest.ravScoreAvailability = {
    ...fixture.manifest.ravScoreAvailability,
    allCurrentScoresFullHistory: false,
    fullHistoryModeCount: 419,
    historyIncompleteModeCount: 1,
    historyIncompleteZoneCount: 1,
    historyIncompleteZones: [{
      zoneId: 'zone-1',
      zoneName: 'Zone 1',
      modes: ['waders'],
      historyCoverageHours: 24,
      historyReasonCodes: ['CURRENT_HISTORY_INCOMPLETE'],
    }],
  };
  for (const document of [fixture.startup, fixture.details]) {
    document.coastalParts.scoreAvailability = structuredClone(
      fixture.manifest.ravScoreAvailability,
    );
    Object.assign(document.coastalParts.zones['zone-1'].hourly[0].waders, {
      scoreQuality: 'HISTORY_INCOMPLETE',
      calibrationEligible: false,
      scoreSemantics: 'CONSERVATIVE_ENCLOSING_LOWER_BOUND',
      historyCoverageHours: 24,
      historyReasonCodes: ['CURRENT_HISTORY_INCOMPLETE'],
    });
  }
  resealPublicDocuments(fixture);
}

function unavailableIntegratedMode(fixture) {
  return {
    available: false,
    score: null,
    scoreQuality: 'UNAVAILABLE',
    calibrationEligible: false,
    scoreSemantics: null,
    conservativeTailResetApplied: false,
    scoreBounds: null,
    historyCoverageHours: null,
    historyReasonCodes: [],
    validPartCount: 0,
    expectedPartCount: 1,
    unavailableParts: [{
      partId: 'part-1',
      name: 'Part 1',
      code: 'DIRECT_INPUT_MISSING',
      reason: 'Et direkte lokalt input mangler.',
    }],
    modelBinding: fixture.manifest.ravScoreModelBinding,
    status: 'unavailable',
    reasons: ['Et direkte lokalt input mangler.'],
    unavailability: {
      available: false,
      code: 'DIRECT_INPUT_MISSING',
      messageDa: 'Et direkte lokalt input mangler.',
      policy: 'integrated-model-local-fail-closed',
      validPartCount: 0,
      expectedPartCount: 1,
    },
  };
}

function installLocallyUnavailableIntegratedState(fixture) {
  const localProfile = {
    ...fixture.startup.coastalParts.scoreProfile,
    modelCoverageReady: false,
    advisories: ['LOCAL_MODEL_COVERAGE_INCOMPLETE'],
  };
  const localAvailability = {
    ...fixture.manifest.ravScoreAvailability,
    allZonesActive: false,
    activeZoneCount: 209,
    unavailableZoneCount: 1,
    allCurrentScoresFullHistory: false,
    fullHistoryModeCount: 419,
    unavailableZones: [{
      zoneId: 'zone-1',
      zoneName: 'Zone 1',
      modes: ['waders'],
      reasons: ['Et direkte lokalt input mangler.'],
    }],
  };
  const unavailableMode = unavailableIntegratedMode(fixture);
  for (const document of [fixture.startup, fixture.details]) {
    document.coastalParts.scoreProfile = structuredClone(localProfile);
    document.coastalParts.scoreAvailability = structuredClone(localAvailability);
    document.coastalParts.zones['zone-1'].hourly[0].waders = structuredClone(unavailableMode);
  }
  fixture.manifest.ravScoreProfile = structuredClone(localProfile);
  fixture.manifest.ravScoreAvailability = structuredClone(localAvailability);
  resealPublicDocuments(fixture);
}

function installCompletelyUnavailableMigrationPendingState(fixture) {
  const unavailableProfile = {
    ...fixture.startup.coastalParts.scoreProfile,
    modelCoverageReady: false,
    modelMemoryReady: false,
    modelMigrationReady: false,
    advisories: [
      'LOCAL_MODEL_COVERAGE_INCOMPLETE',
      'LOCAL_MODEL_MEMORY_INCOMPLETE',
      'MODEL_STATE_NOT_CONTINUED_OR_MIGRATED',
    ],
  };
  const unavailableZones = Object.keys(fixture.startup.coastalParts.zones)
    .sort().map(zoneId => ({
      zoneId,
      zoneName: `Zone ${zoneId.slice(5)}`,
      modes: ['waders', 'beach'],
      reasons: ['Et direkte lokalt input mangler.'],
    }));
  const unavailableAvailability = {
    ...fixture.manifest.ravScoreAvailability,
    allZonesActive: false,
    activeZoneCount: 0,
    unavailableZoneCount: unavailableZones.length,
    allCurrentScoresFullHistory: false,
    fullHistoryModeCount: 0,
    historyIncompleteModeCount: 0,
    historyIncompleteZoneCount: 0,
    unavailableZones,
    historyIncompleteZones: [],
  };
  const unavailableMode = unavailableIntegratedMode(fixture);
  for (const document of [fixture.startup, fixture.details]) {
    document.coastalParts.scoreProfile = structuredClone(unavailableProfile);
    document.coastalParts.scoreAvailability = structuredClone(unavailableAvailability);
    for (const zone of Object.values(document.coastalParts.zones)) {
      zone.hourly[0].waders = structuredClone(unavailableMode);
      zone.hourly[0].beach = structuredClone(unavailableMode);
    }
  }
  fixture.manifest.ravScoreProfile = structuredClone(unavailableProfile);
  fixture.manifest.ravScoreAvailability = structuredClone(unavailableAvailability);
  resealPublicDocuments(fixture);
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

async function verifyBoundedTransientHttpContract() {
  const implementation = sealedImplementation(integratedModelBinding(), 'integrated');
  const { binding, contractText, bundleText, publicClosure } = implementation;
  const fixture = buildFixture(binding, 'integrated');
  fixture.files.set('/js/core/ravscore-model-contract.js', Buffer.from(contractText));
  fixture.files.set('/js/core/ravscore-model-bundle.generated.js', Buffer.from(bundleText));
  for (const [relative, source] of implementation.sources)
    fixture.files.set('/' + relative, Buffer.from(source));
  const options = {
    baseUrl: 'https://ravradar.example.test/', sourceHead,
    expectedManifest: fixture.manifest, expectedModel: 'integrated', expectedBinding: binding,
    expectedContractText: contractText, expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure, observationNonce: 'fixture-bounded-http',
    retryDelayMs: 0,
  };
  const manifestPath = '/data/live/manifest.json';
  const detailsPath = '/data/live/public-condition-details.json';
  const legacyPaths = ['/data/live/public-conditions.json', detailsPath,
    '/data/live/coastal-parts-v2.json', '/data/zones.geojson'];
  const makeFetch = intercept => {
    const counts = new Map(), requests = new Map();
    let cancelled = 0;
    const refused = status => ({
      ok: false, status,
      body: { cancel: async () => { cancelled++; } },
      arrayBuffer: async () => { throw new Error('refused HTTP body must never be read'); },
    });
    const normal = mockFetch(fixture.files);
    return {
      counts, requests, cancellations: () => cancelled,
      fetch: async (url, init) => {
        const pathname = new URL(url).pathname, count = (counts.get(pathname) ?? 0) + 1;
        counts.set(pathname, count);
        requests.set(pathname, [...(requests.get(pathname) ?? []), { url, init }]);
        const selected = await intercept?.({ pathname, count, refused, url, init });
        return selected ?? normal(url, init);
      },
    };
  };
  const baseline = makeFetch();
  assert.equal((await verifyRavScoreOperationalPagesDeployment({
    ...options, fetchImpl: baseline.fetch,
  })).status, 'passed');
  for (const relative of legacyPaths) assert.equal(baseline.counts.get(relative), 1);

  for (const [status, failedPath] of [[502, detailsPath], [503, detailsPath], [504, '/index.html']]) {
    const transient = makeFetch(({ pathname, count, refused }) =>
      pathname === failedPath && count === 1 ? refused(status) : undefined);
    assert.equal((await verifyRavScoreOperationalPagesDeployment({
      ...options, fetchImpl: transient.fetch,
    })).status, 'passed');
    assert.equal(transient.cancellations(), 1);
    for (const [relative, count] of baseline.counts)
      assert.equal(transient.counts.get(relative), count + Number(relative === failedPath),
        'successful files must not be downloaded again after another file has transient HTTP');
    const requests = transient.requests.get(failedPath);
    assert.deepEqual(requests[1], requests[0], 'retry preserves exact URL, source nonce and request options');
  }

  for (const failedPath of [manifestPath, detailsPath]) {
    const permanent = makeFetch(({ pathname, refused }) =>
      pathname === failedPath ? refused(503) : undefined);
    await assert.rejects(verifyRavScoreOperationalPagesDeployment({
      ...options, fetchImpl: permanent.fetch,
    }), /returned HTTP 503/);
    assert.equal(permanent.counts.get(failedPath), 3, 'one file has at most three total attempts');
    assert.equal(permanent.cancellations(), 3);
    assert.equal(permanent.counts.get(manifestPath), failedPath === manifestPath ? 3 : 1,
      '121 manifest observations cannot multiply the exhausted transient budget');
  }

  const globalPaths = [manifestPath, legacyPaths[0], detailsPath, legacyPaths[2]];
  const shared = makeFetch(({ pathname, count, refused }) =>
    globalPaths.includes(pathname) && count === 1 ? refused(503) : undefined);
  await assert.rejects(verifyRavScoreOperationalPagesDeployment({
    ...options, fetchImpl: shared.fetch,
  }), /returned HTTP 503/);
  assert.deepEqual(globalPaths.map(relative => shared.counts.get(relative)), [2, 2, 2, 1],
    'one invocation shares exactly three retry tokens across manifest and all payload files');
  assert.equal(shared.cancellations(), 4);

  const betweenObservations = makeFetch(({ pathname, count, refused }) => {
    assert.equal(pathname, manifestPath);
    return count % 2 ? refused(503) : response(jsonBytes({ datasetId: 'previous-generation' }));
  });
  await assert.rejects(verifyRavScoreOperationalPagesDeployment({
    ...options, fetchImpl: betweenObservations.fetch,
  }), /returned HTTP 503/);
  assert.equal(betweenObservations.counts.get(manifestPath), 7,
    'transient budget is not renewed when a stale manifest starts the next observation');
  assert.equal(betweenObservations.cancellations(), 4);

  const corrupt = makeFetch(({ pathname, count, refused }) => pathname !== detailsPath
    ? undefined : count === 1 ? refused(503) : response(Buffer.from('corrupt after HTTP retry')));
  await assert.rejects(verifyRavScoreOperationalPagesDeployment({
    ...options, fetchImpl: corrupt.fetch,
  }), /artifact digest mismatch.*public-condition-details/);
  assert.equal(corrupt.counts.get(manifestPath), 1);
  assert.equal(corrupt.counts.get(detailsPath), 2);
  assert.equal(corrupt.counts.size, 5);
  for (const relative of legacyPaths.filter(relative => relative !== detailsPath))
    assert.equal(corrupt.counts.get(relative), 1, 'digest failure never restarts the payload closure');

  for (const [status, failedPath] of [[404, manifestPath], [404, detailsPath],
    [401, detailsPath], [403, detailsPath], [429, detailsPath], [500, detailsPath]]) {
    const hard = makeFetch(({ pathname, refused }) => pathname === failedPath ? refused(status) : undefined);
    await assert.rejects(verifyRavScoreOperationalPagesDeployment({
      ...options, fetchImpl: hard.fetch,
    }), new RegExp('returned HTTP ' + status));
    assert.equal(hard.counts.get(failedPath), 1, 'only502/503/504 may retry');
    assert.equal(hard.cancellations(), 1);
    assert.equal(hard.counts.get(manifestPath), 1, 'hard HTTP failures never become manifest propagation');
  }
  const malformed = makeFetch(({ pathname }) =>
    pathname === manifestPath ? response(Buffer.from('{invalid JSON')) : undefined);
  await assert.rejects(verifyRavScoreOperationalPagesDeployment({
    ...options, fetchImpl: malformed.fetch,
  }), /manifest is not JSON/);
  assert.equal(malformed.counts.get(manifestPath), 1);

  for (const phase of ['fetch', 'body', 'cleanup']) {
    const abort = new Error('synthetic abort'); abort.name = 'AbortError';
    const interrupted = makeFetch(({ pathname }) => {
      if (pathname !== detailsPath) return undefined;
      if (phase === 'fetch') throw abort;
      if (phase === 'body') return { ok: true, status: 200, arrayBuffer: async () => { throw abort; } };
      return { ok: false, status: 503, body: { cancel: async () => { throw abort; } } };
    });
    await assert.rejects(verifyRavScoreOperationalPagesDeployment({
      ...options, fetchImpl: interrupted.fetch,
    }), error => error === abort, 'abort/failed physical response cleanup must keep the original failure');
    assert.equal(interrupted.counts.get(detailsPath), 1);
    assert.equal(interrupted.counts.get(manifestPath), 1);
  }
  console.log('Transient HTTP: exact-file502/503/504 retries, shared three-token bound, cleanup, hard failures, abort and one payload pass: passed.');
}

async function verifyManifestOnlyPropagationContract() {
  const implementation = sealedImplementation(integratedModelBinding(), 'integrated');
  const { binding, contractText, bundleText, publicClosure } = implementation;
  const fixture = buildFixture(binding, 'integrated');
  fixture.files.set('/js/core/ravscore-model-contract.js', Buffer.from(contractText));
  fixture.files.set('/js/core/ravscore-model-bundle.generated.js', Buffer.from(bundleText));
  for (const [relative, source] of implementation.sources)
    fixture.files.set('/' + relative, Buffer.from(source));
  const options = {
    baseUrl: 'https://ravradar.example.test/', sourceHead,
    expectedManifest: fixture.manifest, expectedModel: 'integrated', expectedBinding: binding,
    expectedContractText: contractText, expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure, observationNonce: 'fixture-manifest-propagation',
    retryDelayMs: 0,
  };
  const manifestPath = '/data/live/manifest.json';
  const currentFetch = mockFetch(fixture.files);
  const counts = new Map(), manifestNonces = new Set();
  let manifestReads = 0;
  const delayedFetch = async (url, init) => {
    const parsed = new URL(url), relative = parsed.pathname;
    counts.set(relative, (counts.get(relative) ?? 0) + 1);
    if (relative === manifestPath) {
      manifestReads++;
      assert.equal(manifestNonces.has(parsed.searchParams.get('ravscore-observation')), false);
      manifestNonces.add(parsed.searchParams.get('ravscore-observation'));
      if (manifestReads <= 40) {
        assert.equal(counts.size, 1, 'stale manifest polling must not fetch payloads');
        return response(jsonBytes({ datasetId: 'previous-generation' }));
      }
    }
    return currentFetch(url, init);
  };
  const propagated = await verifyRavScoreOperationalPagesDeployment({
    ...options, fetchImpl: delayedFetch,
  });
  assert.equal(propagated.status, 'passed');
  assert.equal(manifestReads, 41, 'default polling must survive more than 36 stale observations');
  assert.equal(manifestNonces.size, 41);
  const expectedPayloadReads = new Map();
  for (const relative of [
    '/data/live/public-conditions.json', '/data/live/public-condition-details.json',
    '/data/live/coastal-parts-v2.json', '/data/zones.geojson',
    '/js/core/ravscore-model-contract.js', '/js/core/ravscore-model-bundle.generated.js',
    ...publicClosure.htmlEntrypoints.map(item => '/' + item.path),
    ...publicClosure.files.map(item => '/' + item.path),
  ]) expectedPayloadReads.set(relative, (expectedPayloadReads.get(relative) ?? 0) + 1);
  assert.deepEqual(new Map([...counts].filter(([relative]) => relative !== manifestPath)),
    expectedPayloadReads, 'one unchanged complete verification pass follows manifest match');

  for (const [label, alteredManifest] of [
    ['old generation', { datasetId: 'previous-generation' }],
    ['same dataset with changed manifest', { ...fixture.manifest, publicConditionsBytes: fixture.manifest.publicConditionsBytes + 1 }],
  ]) {
    let reads = 0, payloadReads = 0;
    await assert.rejects(verifyRavScoreOperationalPagesDeployment({
      ...options,
      fetchImpl: async url => {
        if (new URL(url).pathname !== manifestPath) {
          payloadReads++;
          throw new Error('unexpected payload fetch before exact manifest');
        }
        reads++;
        return response(jsonBytes(alteredManifest));
      },
    }), /manifest differs from the sealed artifact/, label);
    assert.equal(reads, 121, label + ' exhausts only the bounded manifest phase');
    assert.equal(payloadReads, 0, label + ' must never qualify by dataset id alone');
  }

  const mutatedCounts = new Map();
  const mutatedFetch = async (url, init) => {
    const relative = new URL(url).pathname;
    mutatedCounts.set(relative, (mutatedCounts.get(relative) ?? 0) + 1);
    if (relative === '/data/live/public-condition-details.json')
      return response(Buffer.from('detail mutation after exact manifest'));
    return currentFetch(url, init);
  };
  await assert.rejects(verifyRavScoreOperationalPagesDeployment({
    ...options, fetchImpl: mutatedFetch,
  }), /artifact digest mismatch.*public-condition-details/);
  assert.equal(mutatedCounts.get(manifestPath), 1);
  assert.equal(mutatedCounts.size, 5, 'only manifest and the four original payloads precede digest rejection');
  for (const [relative, count] of mutatedCounts)
    assert.equal(count, 1, relative + ' must fail immediately without a full-package retry');

  for (const [key, invalidValues] of [
    ['attempts', [0, 122, 1.5, -1, NaN, Infinity, '121', null]],
    ['retryDelayMs', [-1, 5001, 0.5, NaN, Infinity, '0', null]],
  ]) {
    for (const invalid of invalidValues) {
      let fetches = 0;
      await assert.rejects(verifyRavScoreOperationalPagesDeployment({
        ...options, [key]: invalid,
        fetchImpl: async () => { fetches++; throw new Error('invalid polling inputs must not fetch'); },
      }), /verification inputs are incompatible/, key + ' must be a bounded safe integer');
      assert.equal(fetches, 0);
    }
  }
  console.log('Manifest-only propagation: 40 stale then exact, 121 bounded mismatches, same-id drift, single payload pass and input bounds: passed.');
}

await verifyManifestOnlyPropagationContract();
await verifyBoundedTransientHttpContract();

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
  if (mode === 'integrated') {
    const fetchCurrent = mockFetch(fixture.files);
    let staleManifestReads = 0;
    const delayedPagesFetch = async url => {
      if (new URL(url).pathname === '/data/live/manifest.json'
        && staleManifestReads++ < 12) {
        return response(Buffer.from('{"datasetId":"previous-generation"}'));
      }
      return fetchCurrent(url);
    };
    const delayedResult = await verifyRavScoreOperationalPagesDeployment({
      baseUrl: 'https://ravradar.example.test/',
      sourceHead,
      expectedManifest: fixture.manifest,
      expectedModel: mode,
      expectedBinding: binding,
      expectedContractText: contractText,
      expectedBundleText: bundleText,
      expectedPublicClosure: publicClosure,
      observationNonce: 'fixture-delayed-pages',
      fetchImpl: delayedPagesFetch,
      attempts: 13,
      retryDelayMs: 0,
    });
    assert.equal(delayedResult.status, 'passed');
    assert.equal(staleManifestReads, 13,
      'a valid sealed artifact must survive Pages serving an old manifest for twelve checks');
  }
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

const historyImplementation = sealedImplementation(integratedModelBinding(), 'integrated');
const attachIntegratedImplementation = fixture => {
  fixture.files.set('/js/core/ravscore-model-contract.js',
    Buffer.from(historyImplementation.contractText));
  fixture.files.set('/js/core/ravscore-model-bundle.generated.js',
    Buffer.from(historyImplementation.bundleText));
  for (const [relative, source] of historyImplementation.sources) {
    fixture.files.set(`/${relative}`, Buffer.from(source));
  }
  return fixture;
};
const verifyIntegratedFixture = fixture => verifyRavScoreOperationalPagesDeployment({
  baseUrl: 'https://ravradar.example.test/',
  sourceHead,
  expectedManifest: fixture.manifest,
  expectedModel: 'integrated',
  expectedBinding: historyImplementation.binding,
  expectedContractText: historyImplementation.contractText,
  expectedBundleText: historyImplementation.bundleText,
  expectedPublicClosure: historyImplementation.publicClosure,
  observationNonce: 'fixture-history-incomplete',
  fetchImpl: mockFetch(fixture.files),
  attempts: 1,
});

const historyIncomplete = attachIntegratedImplementation(
  buildFixture(historyImplementation.binding, 'integrated'),
);
installHistoryIncompleteIntegratedState(historyIncomplete);
assert.equal((await verifyIntegratedFixture(historyIncomplete)).status, 'passed',
  'an exact all-active HISTORY_INCOMPLETE deployment remains operational');

// The normal producer can have mature state memory while causal wave or
// last-mile uncertainty remains. Keep the lower-bound quality and its reasons;
// a complete 48-hour current window is not a FULL_HISTORY claim.
for (const reason of ['WAVE_MOBILISATION_HISTORY_INCOMPLETE',
  'LAST_MILE_HISTORY_INCOMPLETE']) {
  const readyWithCausalUncertainty = attachIntegratedImplementation(
    buildFixture(historyImplementation.binding, 'integrated'),
  );
  installHistoryIncompleteIntegratedState(readyWithCausalUncertainty);
  for (const profile of [readyWithCausalUncertainty.startup.coastalParts.scoreProfile,
    readyWithCausalUncertainty.details.coastalParts.scoreProfile,
    readyWithCausalUncertainty.manifest.ravScoreProfile]) {
    profile.modelMemoryReady = true;
    profile.advisories = [];
  }
  for (const availability of [readyWithCausalUncertainty.manifest.ravScoreAvailability,
    readyWithCausalUncertainty.startup.coastalParts.scoreAvailability,
    readyWithCausalUncertainty.details.coastalParts.scoreAvailability]) {
    availability.historyIncompleteZones[0].historyCoverageHours = 48;
    availability.historyIncompleteZones[0].historyReasonCodes = [reason];
  }
  for (const document of [readyWithCausalUncertainty.startup,
    readyWithCausalUncertainty.details]) {
    const mode = document.coastalParts.zones['zone-1'].hourly[0].waders;
    mode.historyCoverageHours = 48;
    mode.historyReasonCodes = [reason];
  }
  resealPublicDocuments(readyWithCausalUncertainty);
  assert.equal((await verifyIntegratedFixture(readyWithCausalUncertainty)).status,
    'passed', 'mature memory must preserve and accept causal uncertainty: ' + reason);
  assert.equal(readyWithCausalUncertainty.manifest.ravScoreAvailability
    .allCurrentScoresFullHistory, false);
  assert.equal(readyWithCausalUncertainty.details.coastalParts.zones['zone-1']
    .hourly[0].waders.calibrationEligible, false);
}

const partialParts = attachIntegratedImplementation(
  buildFixture(historyImplementation.binding, 'integrated'),
);
for (const profile of [partialParts.startup.coastalParts.scoreProfile,
  partialParts.details.coastalParts.scoreProfile, partialParts.manifest.ravScoreProfile]) {
  profile.modelCoverageReady = false;
  profile.advisories = ['LOCAL_MODEL_COVERAGE_INCOMPLETE'];
}
resealPublicDocuments(partialParts);
assert.equal((await verifyIntegratedFixture(partialParts)).status, 'passed',
  'usable zones do not falsely imply every underlying part has direct-input coverage');

const mixedInitialization = attachIntegratedImplementation(
  buildFixture(historyImplementation.binding, 'integrated'),
);
installHistoryIncompleteIntegratedState(mixedInitialization);
for (const profile of [mixedInitialization.startup.coastalParts.scoreProfile,
  mixedInitialization.details.coastalParts.scoreProfile,
  mixedInitialization.manifest.ravScoreProfile]) {
  profile.modelMigrationReady = false;
  profile.advisories.push('MODEL_STATE_NOT_CONTINUED_OR_MIGRATED');
}
resealPublicDocuments(mixedInitialization);
assert.equal((await verifyIntegratedFixture(mixedInitialization)).status, 'passed',
  'an honestly declared migration advisory does not reject a sealed usable deployment');

const entirelyUnavailable = attachIntegratedImplementation(
  buildFixture(historyImplementation.binding, 'integrated'),
);
installCompletelyUnavailableMigrationPendingState(entirelyUnavailable);
assert.equal((await verifyIntegratedFixture(entirelyUnavailable)).status, 'passed',
  'an honestly unavailable sealed deployment can complete bookkeeping without inventing scores');

const locallyUnavailable = attachIntegratedImplementation(
  buildFixture(historyImplementation.binding, 'integrated'),
);
installLocallyUnavailableIntegratedState(locallyUnavailable);
assert.equal((await verifyIntegratedFixture(locallyUnavailable)).status, 'passed',
  'one exact local direct-input gap must not reject the otherwise sealed deployment');

const unavailableWithIncompleteMemory = attachIntegratedImplementation(
  buildFixture(historyImplementation.binding, 'integrated'),
);
installLocallyUnavailableIntegratedState(unavailableWithIncompleteMemory);
for (const profile of [
  unavailableWithIncompleteMemory.startup.coastalParts.scoreProfile,
  unavailableWithIncompleteMemory.details.coastalParts.scoreProfile,
  unavailableWithIncompleteMemory.manifest.ravScoreProfile,
]) {
  profile.modelMemoryReady = false;
  profile.advisories = [
    'LOCAL_MODEL_COVERAGE_INCOMPLETE',
    'LOCAL_MODEL_MEMORY_INCOMPLETE',
  ];
}
resealPublicDocuments(unavailableWithIncompleteMemory);
assert.equal((await verifyIntegratedFixture(unavailableWithIncompleteMemory)).status, 'passed',
  'one local direct-input gap may coexist with honestly incomplete raw model memory');

const combinedButFalseMemoryReady = attachIntegratedImplementation(
  buildFixture(historyImplementation.binding, 'integrated'),
);
installLocallyUnavailableIntegratedState(combinedButFalseMemoryReady);
const combinedAvailability = {
  ...combinedButFalseMemoryReady.manifest.ravScoreAvailability,
  fullHistoryModeCount: 418,
  historyIncompleteModeCount: 1,
  historyIncompleteZoneCount: 1,
  historyIncompleteZones: [{
    zoneId: 'zone-2',
    zoneName: 'Zone 2',
    modes: ['waders'],
    historyCoverageHours: 24,
    historyReasonCodes: ['CURRENT_HISTORY_INCOMPLETE'],
  }],
};
combinedButFalseMemoryReady.manifest.ravScoreAvailability = combinedAvailability;
for (const document of [
  combinedButFalseMemoryReady.startup,
  combinedButFalseMemoryReady.details,
]) {
  document.coastalParts.scoreAvailability = structuredClone(combinedAvailability);
  Object.assign(document.coastalParts.zones['zone-2'].hourly[0].waders, {
    scoreQuality: 'HISTORY_INCOMPLETE',
    calibrationEligible: false,
    scoreSemantics: 'CONSERVATIVE_ENCLOSING_LOWER_BOUND',
    historyCoverageHours: 24,
    historyReasonCodes: ['CURRENT_HISTORY_INCOMPLETE'],
  });
}
resealPublicDocuments(combinedButFalseMemoryReady);
await assert.rejects(() => verifyIntegratedFixture(combinedButFalseMemoryReady),
  /history controls/i,
  'local unavailability must not hide a false memory-ready profile elsewhere');

for (const [label, mutate] of [
  ['malformed history counts', fixture => {
    fixture.manifest.ravScoreAvailability.historyIncompleteModeCount = 2;
    fixture.manifest.ravScoreAvailability.fullHistoryModeCount = 418;
  }],
  ['malformed history zone summary', fixture => {
    fixture.manifest.ravScoreAvailability.historyIncompleteZones[0]
      .historyReasonCodes = [];
  }],
  ['unavailable zone', fixture => {
    fixture.manifest.ravScoreAvailability.allZonesActive = false;
    fixture.manifest.ravScoreAvailability.activeZoneCount = 209;
    fixture.manifest.ravScoreAvailability.unavailableZoneCount = 1;
    fixture.manifest.ravScoreAvailability.unavailableZones = [{ zoneId: 'zone-2' }];
  }],
  ['migration not ready', fixture => {
    for (const profile of [
      fixture.startup.coastalParts.scoreProfile,
      fixture.details.coastalParts.scoreProfile,
      fixture.manifest.ravScoreProfile,
    ]) profile.modelMigrationReady = false;
  }],
  ['coverage not ready', fixture => {
    for (const profile of [
      fixture.startup.coastalParts.scoreProfile,
      fixture.details.coastalParts.scoreProfile,
      fixture.manifest.ravScoreProfile,
    ]) profile.modelCoverageReady = false;
  }],
]) {
  const invalid = attachIntegratedImplementation(
    buildFixture(historyImplementation.binding, 'integrated'),
  );
  installHistoryIncompleteIntegratedState(invalid);
  mutate(invalid);
  resealPublicDocuments(invalid);
  await assert.rejects(() => verifyIntegratedFixture(invalid),
    /availability|history|operational controls|malformed|incompatible/i, label);
}

const strictCandidateImplementation = sealedImplementation(candidateModelBinding(), 'candidate-g');
const candidateMemoryIncomplete = buildFixture(
  strictCandidateImplementation.binding, 'candidate-g',
);
candidateMemoryIncomplete.startup.coastalParts.scoreProfile.modelMemoryReady = false;
candidateMemoryIncomplete.startup.coastalParts.scoreProfile.advisories =
  ['LOCAL_MODEL_MEMORY_INCOMPLETE'];
candidateMemoryIncomplete.details.coastalParts.scoreProfile = structuredClone(
  candidateMemoryIncomplete.startup.coastalParts.scoreProfile,
);
candidateMemoryIncomplete.manifest.ravScoreProfile = structuredClone(
  candidateMemoryIncomplete.startup.coastalParts.scoreProfile,
);
resealPublicDocuments(candidateMemoryIncomplete);
candidateMemoryIncomplete.files.set('/js/core/ravscore-model-contract.js',
  Buffer.from(strictCandidateImplementation.contractText));
candidateMemoryIncomplete.files.set('/js/core/ravscore-model-bundle.generated.js',
  Buffer.from(strictCandidateImplementation.bundleText));
for (const [relative, source] of strictCandidateImplementation.sources) {
  candidateMemoryIncomplete.files.set(`/${relative}`, Buffer.from(source));
}
await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
  baseUrl: 'https://ravradar.example.test/', sourceHead,
  expectedManifest: candidateMemoryIncomplete.manifest,
  expectedModel: 'candidate-g', expectedBinding: strictCandidateImplementation.binding,
  expectedContractText: strictCandidateImplementation.contractText,
  expectedBundleText: strictCandidateImplementation.bundleText,
  expectedPublicClosure: strictCandidateImplementation.publicClosure,
  observationNonce: 'fixture-candidate-strict',
  fetchImpl: mockFetch(candidateMemoryIncomplete.files), attempts: 1,
}), /Candidate G operational controls/,
'Candidate G must remain strict when memory is incomplete');

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

// The existing complete 210/673 public fixture drives the real verifier here;
// neither a caller supplied "verified" object nor a stubbed clear is used.
async function verifyPreActivationClearRestoresLegacyPointer() {
  const path = await import('node:path');
  const os = await import('node:os');
  const {
    PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY: policy,
    publishProtectedOperationalEvidence, publishProtectedPreActivationTarget,
    clearProtectedPreActivationTarget, restoreProtectedOperationalEvidence,
    validateProtectedOperationalEvidenceDescriptor,
  } = await import('./protected-operational-reentry-evidence.mjs');
  const activation = await import('./ravscore-operational-activation.mjs');
  const {CANDIDATE_G_OPERATIONAL_ROLLBACK_ID} = await import('./lib/ravscore-candidate-g-rollback-runtime.mjs');
  const canonicalSha = value => sha256(JSON.stringify(canonical(value)));
  const copy = value => structuredClone(value);
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const POINTER_KEYS = Object.freeze(['schemaVersion', 'kind', 'current', 'previous']);
  const PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY = policy;
  function exactKeys(value, keys, label) {
    assert.ok(isObject(value), label);
    assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), label);
  }
  // Whole historical validator, pinned by the private proposal against dc3900.
  // The descriptor validator it calls is also unchanged by the successor.
function legacySchemaOnePointer(value, {
  policy = PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY,
} = {}) {
  exactKeys(value, POINTER_KEYS, 'Operational evidence pointer');
  if (value.schemaVersion !== policy.schemaVersion || value.kind !== policy.pointerKind) {
    throw new Error('Operational evidence pointer identity is invalid');
  }
  const current = validateProtectedOperationalEvidenceDescriptor(value.current, { policy });
  const previous = value.previous === null
    ? null
    : validateProtectedOperationalEvidenceDescriptor(value.previous, { policy });
  if (previous?.deploymentId === current.deploymentId) {
    throw new Error('Operational evidence pointer duplicates a deployment');
  }
  return { schemaVersion: value.schemaVersion, kind: value.kind, current, previous };
}
  const work = await fs.mkdtemp(path.join(os.tmpdir(),'rr-operational-clear-'));
  const repository = 'ravradar/RavRadar';
  const sourceId = 'pages-51002-1', targetId = 'pages-51003-1';
  const implementation = sealedImplementation(integratedModelBinding(), 'integrated');
  const target = buildFixture(implementation.binding, 'integrated');
  target.files.set('/js/core/ravscore-model-contract.js',Buffer.from(implementation.contractText));
  target.files.set('/js/core/ravscore-model-bundle.generated.js',Buffer.from(implementation.bundleText));
  for(const [name,text] of implementation.sources)target.files.set('/'+name,Buffer.from(text));
  const identity = computeSealedPublicImplementationClosureIdentity({expectedModel:'integrated',
    expectedBinding:implementation.binding,expectedContractText:implementation.contractText,
    expectedBundleText:implementation.bundleText,expectedPublicClosure:implementation.publicClosure});
  const sourceManifest={...copy(target.manifest),datasetId:'rr-schema-one-source-210'};
  const write=async(directory,name,value)=>fs.writeFile(path.join(directory,name),
    typeof value==='string'?value:JSON.stringify(value));
  const directoryFor = async (name,manifest,deploymentId) => {
    const directory=path.join(work,name);await fs.mkdir(directory);
    const [,runId,runAttempt]=deploymentId.match(/^pages-([1-9][0-9]*)-([1-9][0-9]*)$/);
    const seal={schemaVersion:'ravscore-operational-pages-artifact-seal-v1',repository,
      runId:Number(runId),runAttempt:Number(runAttempt),headSha:sourceHead,ref:'refs/heads/main',attemptId:deploymentId,
      artifactId:Number(runId)+1000,artifactName:'github-pages',artifactDigestSha256:'b'.repeat(64),artifactSizeBytes:12345,
      targetPublicManifestSha256:canonicalSha(manifest),targetImplementationClosureSha256:identity.implementationClosureSha256,
      targetModelBinding:implementation.binding,createdAt:'2026-08-29T12:05:00.000Z',privatePayloadIncluded:false};
    const runtimeAudit={datasetId:manifest.datasetId,privatePayloadIncluded:false};
    const d={schemaVersion:'ravscore-continuation-checkpoint-disposition-v1',sourceHead,datasetId:manifest.datasetId,
      disposition:'READY_PUBLISHED',rollbackStatus:'READY',rollbackActivationReady:true,checkpointRequired:true,
      runtimeAuditSha256:canonicalSha(runtimeAudit),privatePayloadIncluded:false};
    const handoff={schemaVersion:'ravscore-operational-deploy-handoff-v2',action:'integrated',sourceHead,
      centralVersion:30,legacySourceRequired:false,checkpointDisposition:d.disposition,
      checkpointDispositionSha256:canonicalSha(d),checkpointDatasetId:manifest.datasetId,
      checkpointRuntimeAuditSha256:d.runtimeAuditSha256,checkpointBuildOutcome:'success',checkpointSaveOutcome:'success',
      checkpointPublishOutcome:'success',privatePayloadIncluded:false};
    for(const [file,value] of Object.entries({'manifest.json':manifest,'handoff.json':handoff,
      'pages-artifact-seal.json':seal,'target-binding.json':implementation.binding,
      'target-public-closure.json':implementation.publicClosure,'target-contract.js':implementation.contractText,
      'target-bundle.generated.js':implementation.bundleText,'public-audit.json':runtimeAudit,
      'checkpoint-disposition.json':{...d,bindingSha256:canonicalSha(d)},'checkpoint-runtime-audit.json':runtimeAudit}))
      await write(directory,file,value);
    return directory;
  };
  let row=null,central,profileRow,failCas=false;
  const objects=new Map(),removed=[],writes=[];
  const storage={ensurePrivateBucket:async()=>true,anonymousStatus:async()=>404,
    uploadImmutable:async(name,bytes)=>{if(objects.has(name))return {created:false};objects.set(name,Buffer.from(bytes));return {created:true};},
    download:async name=>Buffer.from(objects.get(name)),removeExact:async name=>{removed.push(name);objects.delete(name);}};
  const request=async(suffix,options={})=>{
    const method=options.method??'GET';
    if(suffix.includes('document_key=in.')){assert.equal(method,'GET');return copy([central,profileRow]);}
    if(method==='GET')return row?[copy(row)]:[];
    writes.push(method);if(failCas)throw null;
    const body=JSON.parse(options.body);
    if(method==='POST'){assert.equal(row,null);row={document_key:policy.documentKey,version:1,payload:body.payload};}
    else {assert.equal(method,'PATCH');assert(suffix.includes('&version=eq.'+row.version+'&'));
      row={...row,version:row.version+1,payload:body.payload};}
    return [copy(row)];
  };
  const common={request,storage,repository};
  try {
    const sourceDir=await directoryFor('source',sourceManifest,sourceId);
    const targetDir=await directoryFor('target',target.manifest,targetId);
    await publishProtectedOperationalEvidence({...common,directory:sourceDir,deploymentId:sourceId});
    const profile=JSON.parse(await fs.readFile(new URL('../data/admin/ravscore-profile-selection.json',import.meta.url),'utf8'));
    profileRow={document_key:activation.RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY,version:20,
      payload:{...profile,modelBundleSha256:implementation.binding.modelBundleSha256}};
    central={document_key:activation.RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY,version:30,payload:{
      schemaVersion:activation.RAVSCORE_OPERATIONAL_ACTIVATION_SCHEMA,status:activation.RAVSCORE_OPERATIONAL_STATUSES.integrated,
      transitionKind:activation.RAVSCORE_OPERATIONAL_TRANSITION_KINDS.integratedReturn,sourceHead,
      datasetId:sourceManifest.datasetId,productionReferenceAt:sourceManifest.productionReferenceAt,
      rollbackId:CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,activeModelBinding:implementation.binding,
      requestedModelBinding:implementation.binding,sourceModelBinding:implementation.binding,
      candidatePlanSha256:null,candidateFullSha256:null,privateBundleContentSha256:null,
      publicManifestSha256:canonicalSha(sourceManifest),sourcePublicManifestSha256:canonicalSha(sourceManifest),
      requestedPublicManifestSha256:canonicalSha(sourceManifest),
      sourceImplementationClosureSha256:identity.implementationClosureSha256,
      requestedImplementationClosureSha256:identity.implementationClosureSha256,
      sourceDeploymentId:sourceId,deploymentId:sourceId,automaticActivationAllowed:false,schedulerActivationAllowed:false,
      calibrationEligible:false,requestedAt:'2026-08-29T12:05:00.000Z',activatedAt:'2026-08-29T12:05:00.000Z',failureCode:null,
      returnPlanSha256:null,integratedReadinessSha256:null,integratedPublicAuditSha256:null,integratedManifestSha256:null}};
    const resolved=activation.resolveOperationalRavScoreModel(central,{profileRow});
    const sourceCurrent={...resolved,bindingCurrent:activation.operationalResolvedBindingCurrent(resolved)};
    await fs.unlink(path.join(targetDir,'handoff.json'));
    await write(targetDir,'pre-activation.json',{schemaVersion:'ravradar-current-grid-pre-activation-v1',sourceHead,
      sourceCurrent,sourceCurrentSha256:canonicalSha(sourceCurrent),checkpointOutcomes:{build:'success',save:'success',publish:'success'},
      privatePayloadIncluded:false});
    await publishProtectedPreActivationTarget({...common,directory:targetDir,deploymentId:targetId});
    // The ordinary Pages caller publishes its full handoff before begin/complete.
    // Reuse that normal archive publisher; the phase must not replace it.
    const publishedTargetDir=await directoryFor('published-target',target.manifest,targetId);
    await publishProtectedOperationalEvidence({...common,directory:publishedTargetDir,deploymentId:targetId,
      retainDeploymentId:sourceId,requireRetained:true});
    const phaseRow=copy(row),objectBefore=new Map([...objects].map(([name,bytes])=>[name,Buffer.from(bytes)]));
    assert.throws(()=>legacySchemaOnePointer(row.payload),'old reader must really reject an unfinished schema2 pointer');
    const fetchPublic=mockFetch(target.files);
    let publicReads=0;
    await assert.rejects(clearProtectedPreActivationTarget({...common,sourceHead,baseUrl:'https://ravradar.example.test/',
      fetchImpl:async()=>{publicReads++;throw new Error('unexpected public read');}}),/not actually active/);
    assert.equal(publicReads,0);assert.deepEqual(row,phaseRow);
    // This is the controlled central-response oracle, not a claim that an Edge,
    // activation transaction or hosted Pages deployment happened in this test.
    central={...central,version:31,payload:{...central.payload,datasetId:target.manifest.datasetId,
      publicManifestSha256:canonicalSha(target.manifest),requestedPublicManifestSha256:canonicalSha(target.manifest),
      sourcePublicManifestSha256:canonicalSha(target.manifest),sourceDeploymentId:targetId,
      deploymentId:targetId}};
    activation.resolveOperationalRavScoreModel(central,{profileRow});
    const sourceCentral=copy(central),writeCount=writes.length;
    // The normal resolver admits this complete sealed source. It does not
    // give a changed target closure permission to clear the delivery phase.
    const changedClosure=copy(row);
    changedClosure.payload.preActivation.target.implementationClosureSha256='6'.repeat(64);
    row=changedClosure;
    await assert.rejects(clearProtectedPreActivationTarget({...common,sourceHead,baseUrl:'https://ravradar.example.test/',
      fetchImpl:async()=>{publicReads++;throw new Error('changed closure must refuse before public read');}}),
      /Pre-activation target generation changed/);
    assert.equal(publicReads,0);assert.equal(writes.length,writeCount);
    assert.deepEqual(row,changedClosure);row=copy(phaseRow);
    let drift=false;
    await assert.rejects(clearProtectedPreActivationTarget({...common,sourceHead,baseUrl:'https://ravradar.example.test/',
      fetchImpl:async(...args)=>{if(!drift){central={...central,version:central.version+1};drift=true;}return fetchPublic(...args);}}),/central completion changed/);
    assert.equal(writes.length,writeCount);assert.deepEqual(row,phaseRow);central=sourceCentral;
    let pointerDrift=false;
    await assert.rejects(clearProtectedPreActivationTarget({...common,sourceHead,baseUrl:'https://ravradar.example.test/',
      fetchImpl:async(...args)=>{if(!pointerDrift){row={...row,version:row.version+1};pointerDrift=true;}return fetchPublic(...args);}}),/slot changed/);
    assert.equal(writes.length,writeCount);row=copy(phaseRow);
    failCas=true;let caught;
    try{await clearProtectedPreActivationTarget({...common,sourceHead,baseUrl:'https://ravradar.example.test/',fetchImpl:fetchPublic});}
    catch(error){caught=error;}
    assert(caught instanceof Error);assert.equal(caught.cause,null);assert.deepEqual(row,phaseRow);failCas=false;
    const result=await clearProtectedPreActivationTarget({...common,sourceHead,baseUrl:'https://ravradar.example.test/',fetchImpl:fetchPublic});
    assert.equal(result.cleared,true);assert.equal(row.version,phaseRow.version+1);
    assert.deepEqual(row.payload,{schemaVersion:policy.schemaVersion,kind:phaseRow.payload.kind,
      current:phaseRow.payload.current,previous:phaseRow.payload.previous});
    assert.deepEqual(legacySchemaOnePointer(row.payload),row.payload);
    assert.deepEqual(await clearProtectedPreActivationTarget({...common,sourceHead,baseUrl:'https://ravradar.example.test/',
      fetchImpl:()=>{throw new Error('idempotent clear must not fetch');}}),{cleared:false,reason:'no-pre-activation'});
    for(const [label,descriptor] of [['current',row.payload.current],['previous',row.payload.previous]]){
      const restored=path.join(work,'restored-'+label);
      const restoredResult=await restoreProtectedOperationalEvidence({...common,directory:restored,deploymentId:descriptor.deploymentId});
      assert.equal(restoredResult.restored,true);
      const original=label==='current'?publishedTargetDir:sourceDir;
      for(const name of await fs.readdir(original))assert.deepEqual(await fs.readFile(path.join(restored,name)),await fs.readFile(path.join(original,name)));
    }
    for(const [name,bytes] of objectBefore)assert.deepEqual(objects.get(name),bytes);
    assert.deepEqual(removed,[],'no original/phase archive deletion or repinning');
  } finally {await fs.rm(work,{recursive:true,force:true});}
}
await verifyPreActivationClearRestoresLegacyPointer();
console.log('Pre-activation verified clear restores exact schema1/current/previous with normal public verifier and original restore: passed.');
