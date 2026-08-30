import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  PagesArtifactPrivacyError,
  auditPagesArtifactPrivacy,
} from './audit-pages-artifact-privacy.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import {
  RAVSCORE_PUBLIC_DETAILS_KIND,
  RAVSCORE_PUBLIC_RUNTIME_SCHEMA_VERSION,
  RAVSCORE_PUBLIC_STARTUP_KIND,
  canonicalPublicRuntimeJson,
} from '../js/core/ravscore-public-runtime-contract.js';

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const jsonText = value => `${JSON.stringify(value)}\n`;
const generatedAt = '2026-08-29T12:00:00.000Z';
const referenceAt = '2026-08-29T11:00:00.000Z';
const datasetId = 'rr-synthetic-pages-privacy';

function scoreProfile(binding) {
  return {
    schemaVersion: 3,
    activeProfileId: binding.modelId,
    stateSchemaVersion: binding.stateSchemaVersion,
    variantId: binding.variantId,
    profileId: binding.profileId,
    componentSchemaId: binding.componentSchemaId,
    explanationSchemaId: binding.explanationSchemaId,
    presentationPolicyId: binding.presentationPolicyId,
    modelContractSha256: binding.modelContractSha256,
    modelBundleSha256: binding.modelBundleSha256,
  };
}

function runtimeDocument(body, kind, binding) {
  return {
    ...body,
    ravScoreRuntime: {
      schemaVersion: RAVSCORE_PUBLIC_RUNTIME_SCHEMA_VERSION,
      kind,
      datasetId: body.datasetId,
      productionReferenceAt: body.productionReferenceAt,
      modelBinding: binding,
      payloadBodySha256: sha256(canonicalPublicRuntimeJson(body)),
    },
  };
}

function fixtureDocuments(binding = ravScoreModelBinding()) {
  const profile = scoreProfile(binding);
  const projectedPart = {
    id: 'part-1',
    zoneId: 'zone-1',
    name: 'Syntetisk del',
    waterPoint: [10, 55],
    landPoint: [10.01, 55.01],
    flowPoints: { current: [10, 55], wind: [10.02, 55.02], sources: { current: 'dmi', wind: 'dmi' } },
  };
  const projectedCoastal = {
    schemaVersion: 2,
    enabled: true,
    modelBinding: binding,
    scoreProfile: profile,
    expectedPartCount: 1,
    scoredPartCount: 1,
    parts: { 'part-1': projectedPart },
    zones: { 'zone-1': { expectedPartCount: 1, scoredPartCount: 1, hourly: [] } },
  };
  const startupBody = {
    schemaVersion: 3,
    datasetId,
    generatedAt,
    productionReferenceAt: referenceAt,
    source: 'synthetic public runtime',
    nationalForecast: { schemaVersion: 2, modelBinding: binding, dates: [], modes: { waders: [], beach: [] } },
    zones: {
      'zone-1': {
        flowPoints: { current: [10, 55], wind: [10.02, 55.02], sources: { current: 'dmi', wind: 'dmi' } },
        current: { windSpeedMps: 4, currentSpeedMps: 0.1 },
        history: { verifiedCurrentCoverageHours: 24 },
      },
    },
    coastalParts: projectedCoastal,
  };
  const detailsBody = {
    schemaVersion: 2,
    datasetId,
    generatedAt,
    productionReferenceAt: referenceAt,
    zones: { 'zone-1': { forecast: { hourly: [] } } },
    coastalParts: projectedCoastal,
  };
  const startup = runtimeDocument(startupBody, RAVSCORE_PUBLIC_STARTUP_KIND, binding);
  const details = runtimeDocument(detailsBody, RAVSCORE_PUBLIC_DETAILS_KIND, binding);
  const startupText = jsonText(startup);
  const detailsText = jsonText(details);
  const coastalParts = {
    schemaVersion: 2,
    enabled: true,
    datasetVersion: 'synthetic-geometry',
    sourceRunId: 'synthetic-source',
    generatedAt,
    partCount: 1,
    sourcePartCount: 1,
    zoneCount: 1,
    zones: {
      'zone-1': [{
        partId: 'part-1',
        name: 'Syntetisk del',
        geometry: { type: 'LineString', coordinates: [[10, 55], [10.01, 55.01]] },
        landPoint: [10.01, 55.01],
        waterPoint: [10, 55],
      }],
    },
  };
  const coastalText = jsonText(coastalParts);
  const zoneRegistry = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: { id: 'zone-1', zoneStatus: 'active', name: 'Syntetisk zone' },
      geometry: { type: 'Polygon', coordinates: [[[10, 55], [10.1, 55], [10.1, 55.1], [10, 55]]] },
    }],
  };
  const zoneRegistryText = jsonText(zoneRegistry);
  const manifest = {
    schemaVersion: 4,
    datasetId,
    generatedAt,
    productionReferenceAt: referenceAt,
    validUntil: '2026-08-30T12:00:00.000Z',
    zoneCount: 1,
    coastalPartCount: 1,
    conditionsPath: './public-conditions.json',
    conditionDetailsPath: './public-condition-details.json',
    coastalPartsPath: './coastal-parts-v2.json',
    ravScoreModelBinding: binding,
    ravScoreProfile: profile,
    publicConditionsSha256: sha256(startupText),
    publicConditionsBytes: Buffer.byteLength(startupText),
    publicConditionDetailsSha256: sha256(detailsText),
    publicConditionDetailsBytes: Buffer.byteLength(detailsText),
    coastalPartsSha256: sha256(coastalText),
    coastalPartsBytes: Buffer.byteLength(coastalText),
    zoneRegistryPath: './data/zones.geojson',
    zoneRegistrySha256: sha256(zoneRegistryText),
    zoneRegistryBytes: Buffer.byteLength(zoneRegistryText),
    zoneRegistryFeatureCount: zoneRegistry.features.length,
    zoneRegistryActiveCount: zoneRegistry.features.length,
    ravScoreRuntime: {
      schemaVersion: RAVSCORE_PUBLIC_RUNTIME_SCHEMA_VERSION,
      modelBinding: binding,
      startup: {
        kind: RAVSCORE_PUBLIC_STARTUP_KIND,
        payloadBodySha256: startup.ravScoreRuntime.payloadBodySha256,
        fileSha256: sha256(startupText),
        bytes: Buffer.byteLength(startupText),
      },
      details: {
        kind: RAVSCORE_PUBLIC_DETAILS_KIND,
        payloadBodySha256: details.ravScoreRuntime.payloadBodySha256,
        fileSha256: sha256(detailsText),
        bytes: Buffer.byteLength(detailsText),
      },
    },
    complete: true,
  };
  return { manifest, startup, details, coastalParts, zoneRegistry };
}

async function writeFixture(root, binding) {
  const live = path.join(root, 'data', 'live');
  await fs.mkdir(live, { recursive: true });
  await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><title>synthetic</title>\n');
  const documents = fixtureDocuments(binding);
  await Promise.all([
    fs.writeFile(path.join(live, 'manifest.json'), jsonText(documents.manifest)),
    fs.writeFile(path.join(live, 'public-conditions.json'), jsonText(documents.startup)),
    fs.writeFile(path.join(live, 'public-condition-details.json'), jsonText(documents.details)),
    fs.writeFile(path.join(live, 'coastal-parts-v2.json'), jsonText(documents.coastalParts)),
    fs.writeFile(path.join(root, 'data', 'zones.geojson'), jsonText(documents.zoneRegistry)),
  ]);
  return documents;
}

async function freshFixture(binding) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-pages-privacy-'));
  await writeFixture(root, binding);
  return root;
}

async function expectRejected(name, mutate, pattern, { binding } = {}) {
  const root = await freshFixture(binding);
  try {
    await mutate(root);
    await assert.rejects(
      auditPagesArtifactPrivacy(root),
      error => error instanceof PagesArtifactPrivacyError && pattern.test(error.message),
      name,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

const cleanRoot = await freshFixture();
try {
  const result = await auditPagesArtifactPrivacy(cleanRoot);
  assert.equal(result.liveFileCount, 4);
  assert.equal(result.datasetId, datasetId);
} finally {
  await fs.rm(cleanRoot, { recursive: true, force: true });
}

const fingerprintRoot = await freshFixture();
const privateManifestRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-private-fingerprints-'));
try {
  const syntheticPrivateBytes = Buffer.from('synthetic-private-runtime-payload\n');
  const privateManifestPath = path.join(privateManifestRoot, 'manifest.json');
  await fs.writeFile(privateManifestPath, jsonText({
    schemaVersion: '1.0.0',
    kind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_BUNDLE',
    privacyClass: 'PRIVATE_PRODUCTION_RUNTIME',
    fileCount: 1,
    files: [{
      id: 'synthetic-private',
      relativePath: 'data/live/opaque.json',
      bytes: syntheticPrivateBytes.length,
      sha256: sha256(syntheticPrivateBytes),
      privacyClass: 'PRIVATE_PRODUCTION_RUNTIME',
    }],
  }));
  const clean = await auditPagesArtifactPrivacy(fingerprintRoot, {
    privateManifestPath,
    requirePrivateManifest: true,
  });
  assert.equal(clean.privateFingerprintCount, 1);
  await fs.mkdir(path.join(fingerprintRoot, 'assets'), { recursive: true });
  await fs.writeFile(path.join(fingerprintRoot, 'assets', 'innocent-name.bin'), syntheticPrivateBytes);
  await assert.rejects(
    auditPagesArtifactPrivacy(fingerprintRoot, {
      privateManifestPath,
      requirePrivateManifest: true,
    }),
    error => error instanceof PagesArtifactPrivacyError
      && /exact private runtime payload fingerprint/.test(error.message),
  );
} finally {
  await fs.rm(fingerprintRoot, { recursive: true, force: true });
  await fs.rm(privateManifestRoot, { recursive: true, force: true });
}

const missingFingerprintRoot = await freshFixture();
try {
  await assert.rejects(
    auditPagesArtifactPrivacy(missingFingerprintRoot, { requirePrivateManifest: true }),
    error => error instanceof PagesArtifactPrivacyError
      && /fingerprint manifest is required/.test(error.message),
  );
} finally {
  await fs.rm(missingFingerprintRoot, { recursive: true, force: true });
}

await expectRejected('tamper/raw U/V', async root => {
  const file = path.join(root, 'data', 'live', 'public-conditions.json');
  const document = JSON.parse(await fs.readFile(file, 'utf8'));
  document.zones['zone-1'].current.currentUMps = 0.123456;
  await fs.writeFile(file, jsonText(document));
}, /raw vector field/);

await expectRejected('generic raw u/v component pair', async root => {
  const directory = path.join(root, 'assets');
  await fs.mkdir(directory);
  await fs.writeFile(path.join(directory, 'opaque-vector.json'), JSON.stringify({ u: [0.1], v: [0.2] }));
}, /raw vector component pair/);

await expectRejected('nested live artifact', async root => {
  const nested = path.join(root, 'data', 'live', 'archive');
  await fs.mkdir(nested);
  await fs.writeFile(path.join(nested, 'apparently-public.json'), '{}\n');
}, /unexpected live artifact/);

await expectRejected('renamed private state payload without value disclosure', async root => {
  const directory = path.join(root, 'assets');
  await fs.mkdir(directory);
  await fs.writeFile(path.join(directory, 'opaque-weather.json'), JSON.stringify({
    currentState: { rawPayload: 'DO-NOT-LOG-THIS-SENTINEL' },
  }));
  try {
    await auditPagesArtifactPrivacy(root);
  } catch (error) {
    assert.ok(error instanceof PagesArtifactPrivacyError);
    assert.match(error.message, /private state field/);
    assert.doesNotMatch(error.message, /DO-NOT-LOG-THIS-SENTINEL/);
    return;
  }
  assert.fail('renamed private state payload was accepted');
}, /private state field/);

await expectRejected('private conditions path', async root => {
  const file = path.join(root, 'data', 'live', 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(file, 'utf8'));
  manifest.conditionsPath = './conditions.json';
  await fs.writeFile(file, jsonText(manifest));
}, /full conditions reference|invalid conditionsPath/);

await expectRejected('file hash tamper', async root => {
  const file = path.join(root, 'data', 'live', 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(file, 'utf8'));
  manifest.publicConditionsSha256 = '0'.repeat(64);
  await fs.writeFile(file, jsonText(manifest));
}, /file digest mismatch/);

await expectRejected('zone registry byte tamper', async root => {
  const file = path.join(root, 'data', 'zones.geojson');
  await fs.appendFile(file, ' ');
}, /zones\.geojson manifest binding mismatch/);

await expectRejected('zone registry identity mix', async root => {
  const file = path.join(root, 'data', 'zones.geojson');
  const document = JSON.parse(await fs.readFile(file, 'utf8'));
  document.features[0].properties.id = 'other-zone';
  const text = jsonText(document);
  await fs.writeFile(file, text);
  const manifestPath = path.join(root, 'data', 'live', 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  manifest.zoneRegistrySha256 = sha256(text);
  manifest.zoneRegistryBytes = Buffer.byteLength(text);
  await fs.writeFile(manifestPath, jsonText(manifest));
}, /identity or active-zone coverage mismatch/);

await expectRejected('cross-reference payload', async root => {
  const file = path.join(root, 'data', 'live', 'public-condition-details.json');
  const document = JSON.parse(await fs.readFile(file, 'utf8'));
  document.productionReferenceAt = '2026-08-29T10:00:00.000Z';
  document.ravScoreRuntime.productionReferenceAt = document.productionReferenceAt;
  const { ravScoreRuntime, ...body } = document;
  document.ravScoreRuntime.payloadBodySha256 = sha256(canonicalPublicRuntimeJson(body));
  await fs.writeFile(file, jsonText(document));
  const manifestPath = path.join(root, 'data', 'live', 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const text = jsonText(document);
  manifest.publicConditionDetailsSha256 = sha256(text);
  manifest.publicConditionDetailsBytes = Buffer.byteLength(text);
  manifest.ravScoreRuntime.details.fileSha256 = sha256(text);
  manifest.ravScoreRuntime.details.bytes = Buffer.byteLength(text);
  manifest.ravScoreRuntime.details.payloadBodySha256 = document.ravScoreRuntime.payloadBodySha256;
  await fs.writeFile(manifestPath, jsonText(manifest));
}, /cross-reference-time binding|runtime envelope mismatch/);

const crossModelBinding = {
  ...ravScoreModelBinding(),
  modelId: 'RRS-SYNTHETIC-OLD-MODEL',
  modelBundleSha256: 'f'.repeat(64),
};
await expectRejected('internally consistent cross-model artifact', async () => {}, /current RavScore model|cross-model/, {
  binding: crossModelBinding,
});

await expectRejected('unapproved coordinate-like pair', async root => {
  const file = path.join(root, 'data', 'live', 'public-conditions.json');
  const document = JSON.parse(await fs.readFile(file, 'utf8'));
  document.zones['zone-1'].hiddenPair = [11, 56];
  await fs.writeFile(file, jsonText(document));
}, /unapproved coordinate-like pair/);

await expectRejected('private filename outside live', async root => {
  const directory = path.join(root, 'archive');
  await fs.mkdir(directory);
  await fs.writeFile(path.join(directory, 'conditions.json'), '{}\n');
}, /full conditions path/);

for (const [name, relative, expected] of [
  ['DMI cache', ['archive', 'dmi-bulk-cache.json'], /DMI cache path/],
  ['pilot history', ['archive', 'current-pilot-history.json'], /pilot history path/],
  ['checkpoint', ['archive', 'ravscore-checkpoint.json'], /checkpoint path/],
  ['diagnostics', ['archive', 'runtime-diagnostics.json'], /diagnostics path/],
]) {
  await expectRejected(name, async root => {
    const directory = path.join(root, relative[0]);
    await fs.mkdir(directory);
    await fs.writeFile(path.join(directory, relative[1]), '{}\n');
  }, expected);
}

await expectRejected('cross-dataset payload', async root => {
  const file = path.join(root, 'data', 'live', 'public-condition-details.json');
  const document = JSON.parse(await fs.readFile(file, 'utf8'));
  document.datasetId = 'rr-another-synthetic-dataset';
  document.ravScoreRuntime.datasetId = document.datasetId;
  const { ravScoreRuntime, ...body } = document;
  document.ravScoreRuntime.payloadBodySha256 = sha256(canonicalPublicRuntimeJson(body));
  await fs.writeFile(file, jsonText(document));
  const manifestPath = path.join(root, 'data', 'live', 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const text = jsonText(document);
  manifest.publicConditionDetailsSha256 = sha256(text);
  manifest.publicConditionDetailsBytes = Buffer.byteLength(text);
  manifest.ravScoreRuntime.details.fileSha256 = sha256(text);
  manifest.ravScoreRuntime.details.bytes = Buffer.byteLength(text);
  manifest.ravScoreRuntime.details.payloadBodySha256 = document.ravScoreRuntime.payloadBodySha256;
  await fs.writeFile(manifestPath, jsonText(manifest));
}, /cross-dataset binding|runtime envelope mismatch/);

await expectRejected('symbolic link', async root => {
  const target = path.join(root, 'index.html');
  const link = path.join(root, 'linked-public-file');
  try {
    await fs.symlink(target, link, 'file');
  } catch (error) {
    if (error?.code !== 'EPERM') throw error;
    const targetDirectory = path.join(root, 'link-target');
    await fs.mkdir(targetDirectory);
    await fs.symlink(targetDirectory, link, 'junction');
  }
}, /symbolic link/);

console.log('OK: recursive Pages artifact privacy gate rejects tamper, nested/renamed private data, symlinks, path/hash/reference and cross-model attacks.');
