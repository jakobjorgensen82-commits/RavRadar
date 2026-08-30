#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  RAVSCORE_PUBLIC_DETAILS_KIND,
  RAVSCORE_PUBLIC_STARTUP_KIND,
  assertPublicRuntimeEnvelope,
  canonicalPublicRuntimeJson,
  publicRuntimeDocumentBody,
} from '../js/core/ravscore-public-runtime-contract.js';

const EXPECTED_LIVE_FILES = new Set([
  'data/live/manifest.json',
  'data/live/public-conditions.json',
  'data/live/public-condition-details.json',
  'data/live/coastal-parts-v2.json',
]);

const EXPECTED_PUBLIC_PATHS = Object.freeze({
  conditionsPath: './public-conditions.json',
  conditionDetailsPath: './public-condition-details.json',
});
const ZONE_REGISTRY_FILE = 'data/zones.geojson';

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const PRIVATE_RUNTIME_MANIFEST_KIND = 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_BUNDLE';
const PRIVATE_RUNTIME_PRIVACY_CLASS = 'PRIVATE_PRODUCTION_RUNTIME';
const PRIVATE_FIELD = /^(candidateG|ravScoreModel|ravScoreState|state|stateHistory|modelState|derivedState|currentState|continuationState|stateKey|samplingContext|samplingContextKey|transportEvidence|currentEvidence|waveEvidence|rawPayload|privatePayload|diagnostic|diagnostics|privateDiagnostic|runtimeDiagnostic|runtimeDiagnostics|continuationCheckpoint)$/i;
const PRIVATE_PATH_FIELD = /^(fullConditionsPath|currentPilotHistoryPath|checkpointPath|diagnosticsPath|privatePath|cachePath)$/i;
const RAW_VECTOR_FIELD = /^(currentUMps|currentVMps|uMps|vMps|rawU|rawV|uo|vo|eastwardCurrent|northwardCurrent|eastwardSeaWaterVelocity|northwardSeaWaterVelocity)$/i;
const PRIVATE_SAMPLING_FIELD = /^(gridPoint|gridIndex|gridCell|gridCoordinates|nativeGrid|samplingPoint|samplePoint|samplingCoordinates|privatePoint|privateCoordinates)$/i;
const COORDINATE_FIELD = /^(coordinates?|coords?|latitude|longitude|lat|lon|lng)$/i;
const MODEL_BINDING_FIELD = /^(modelBinding|ravScoreModelBinding)$/i;

function normalizedPath(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replaceAll('\\', '/')
    .replace(/^\.\//, '')
    .replace(/\/+/g, '/')
    .toLowerCase();
}

function relativePath(root, target) {
  return path.relative(root, target).split(path.sep).join('/');
}

function safePath(value) {
  return String(value ?? '')
    .replace(/[^A-Za-z0-9_./\-[\]]/g, '_')
    .slice(0, 240);
}

function sha256(bufferOrText) {
  return crypto.createHash('sha256').update(bufferOrText).digest('hex');
}

function privatePathReason(value) {
  let candidate = normalizedPath(value).split(/[?#]/, 1)[0];
  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    // Invalid percent encoding stays subject to the literal checks below.
  }
  candidate = normalizedPath(candidate);
  const segments = candidate.split('/').filter(Boolean);
  for (const segment of segments) {
    if (segment === 'conditions.json'
      || (/conditions/.test(segment)
        && segment !== 'public-conditions.json'
        && segment !== 'public-condition-details.json')) return 'full conditions';
    if (/(?:^|[-_.])dmi(?:[-_.].*)?cache|cache(?:[-_.].*)?dmi/.test(segment)) return 'DMI cache';
    if (/pilot(?:[-_.].*)?history|history(?:[-_.].*)?pilot/.test(segment)) return 'pilot history';
    if (/checkpoint/.test(segment)) return 'checkpoint';
    if (/diagnostics?/.test(segment)) return 'diagnostics';
    if (/(?:^|[-_.])private(?:[-_.]|$)/.test(segment)) return 'private artifact';
    if (/candidate[-_.]?g.*recovery|continuation.*recovery/.test(segment)) return 'private recovery';
  }
  return null;
}

function isPathLikeString(value) {
  return typeof value === 'string' && (/[/\\]/.test(value) || /\.json(?:[?#]|$)/i.test(value));
}

function isApprovedCoordinatePath(file, tokens) {
  const normalizedFile = normalizedPath(file);
  const last = String(tokens.at(-1) ?? '');
  const previous = String(tokens.at(-2) ?? '');

  if (normalizedFile.endsWith('.geojson') && tokens.includes('coordinates')) return true;

  if (normalizedFile === 'data/live/coastal-parts-v2.json') {
    if (last === 'landPoint' || last === 'waterPoint') return true;
    if (tokens.includes('geometry') && tokens.includes('coordinates')) return true;
  }

  if (normalizedFile === 'data/live/public-conditions.json'
    || normalizedFile === 'data/live/public-condition-details.json') {
    if (last === 'landPoint' || last === 'waterPoint') return true;
    if (previous === 'flowPoints' && (last === 'current' || last === 'wind')) return true;
  }

  return false;
}

function displayJsonPath(file, tokens) {
  const leaf = tokens.at(-1);
  const field = typeof leaf === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(leaf)
    ? leaf
    : '[redacted-field]';
  return `${safePath(file)}#${field}@depth-${tokens.length}`;
}

function isCoordinatePair(value) {
  return Array.isArray(value)
    && value.length === 2
    && value.every(item => typeof item === 'number' && Number.isFinite(item));
}

function hasCoordinateShape(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (!Array.isArray(value)) return false;
  if (isCoordinatePair(value)) return true;
  return value.some(item => Array.isArray(item) && hasCoordinateShape(item));
}

function scanJsonPrivacy(value, { file, tokens = [], issues }) {
  if (Array.isArray(value)) {
    if (normalizedPath(file).startsWith('data/live/')
      && isCoordinatePair(value)
      && !isApprovedCoordinatePath(file, tokens)) {
      issues.push(`unapproved coordinate-like pair at ${displayJsonPath(file, tokens)}`);
    }
    value.forEach((item, index) => scanJsonPrivacy(item, { file, tokens: [...tokens, index], issues }));
    return;
  }

  if (!value || typeof value !== 'object') {
    if (isPathLikeString(value)) {
      const reason = privatePathReason(value);
      if (reason) issues.push(`${reason} reference at ${displayJsonPath(file, tokens)}`);
    }
    return;
  }

  const normalizedKeys = new Set(Object.keys(value).map(key => key.toLowerCase()));
  if ((normalizedKeys.has('u') && normalizedKeys.has('v'))
    || (normalizedKeys.has('uo') && normalizedKeys.has('vo'))) {
    issues.push(`raw vector component pair at ${displayJsonPath(file, tokens)}`);
  }

  for (const [key, nested] of Object.entries(value)) {
    const nestedTokens = [...tokens, key];
    const fieldPath = displayJsonPath(file, nestedTokens);
    if (PRIVATE_FIELD.test(key)) issues.push(`private state field at ${fieldPath}`);
    if (PRIVATE_PATH_FIELD.test(key)) issues.push(`private path field at ${fieldPath}`);
    if (RAW_VECTOR_FIELD.test(key)) issues.push(`raw vector field at ${fieldPath}`);
    if (PRIVATE_SAMPLING_FIELD.test(key)) issues.push(`private sampling/grid field at ${fieldPath}`);
    if (COORDINATE_FIELD.test(key)
      && hasCoordinateShape(nested)
      && !isApprovedCoordinatePath(file, nestedTokens)) {
      issues.push(`unapproved coordinate field at ${fieldPath}`);
    }
    scanJsonPrivacy(nested, { file, tokens: nestedTokens, issues });
  }
}

async function collectEntries(root, directory = root, entries = [], issues = []) {
  const children = await fs.readdir(directory, { withFileTypes: true });
  children.sort((left, right) => left.name.localeCompare(right.name, 'en'));
  for (const child of children) {
    const absolute = path.join(directory, child.name);
    const relative = relativePath(root, absolute);
    const stat = await fs.lstat(absolute);
    if (child.isSymbolicLink() || stat.isSymbolicLink()) {
      issues.push(`symbolic link at ${safePath(relative)}`);
      continue;
    }
    if (child.isDirectory()) {
      entries.push({ absolute, relative, kind: 'directory' });
      await collectEntries(root, absolute, entries, issues);
      continue;
    }
    if (!child.isFile()) {
      issues.push(`non-regular artifact entry at ${safePath(relative)}`);
      continue;
    }
    entries.push({ absolute, relative, kind: 'file', size: stat.size });
  }
  return { entries, issues };
}

async function loadPrivateRuntimeFingerprints(privateManifestPath, { required }) {
  if (!privateManifestPath) {
    if (required) throw new PagesArtifactPrivacyError([
      'validated private runtime fingerprint manifest is required',
    ]);
    return new Set();
  }
  let manifest;
  try {
    const stat = await fs.lstat(privateManifestPath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('not a regular file');
    manifest = JSON.parse(await fs.readFile(privateManifestPath, 'utf8'));
  } catch {
    throw new PagesArtifactPrivacyError([
      'validated private runtime fingerprint manifest is unavailable',
    ]);
  }
  if (manifest?.schemaVersion !== '1.0.0'
    || manifest?.kind !== PRIVATE_RUNTIME_MANIFEST_KIND
    || manifest?.privacyClass !== PRIVATE_RUNTIME_PRIVACY_CLASS
    || !Array.isArray(manifest?.files)
    || manifest.files.length < 1
    || manifest.fileCount !== manifest.files.length) {
    throw new PagesArtifactPrivacyError([
      'private runtime fingerprint manifest has an incompatible contract',
    ]);
  }
  const fingerprints = new Set();
  for (const file of manifest.files) {
    if (file?.privacyClass !== PRIVATE_RUNTIME_PRIVACY_CLASS
      || !Number.isSafeInteger(file?.bytes)
      || file.bytes < 1
      || !SHA256_PATTERN.test(String(file?.sha256 ?? ''))) {
      throw new PagesArtifactPrivacyError([
        'private runtime fingerprint manifest contains an invalid file descriptor',
      ]);
    }
    const fingerprint = `${file.bytes}:${file.sha256}`;
    if (fingerprints.has(fingerprint)) {
      throw new PagesArtifactPrivacyError([
        'private runtime fingerprint manifest contains a duplicate payload descriptor',
      ]);
    }
    fingerprints.add(fingerprint);
  }
  return fingerprints;
}

function addBindingIssue(binding, label, issues) {
  try {
    assertRavScoreModelBinding(binding, label);
    const expectedKeys = Object.keys(ravScoreModelBinding()).sort();
    const actualKeys = Object.keys(binding).sort();
    if (actualKeys.length !== expectedKeys.length
      || actualKeys.some((key, index) => key !== expectedKeys[index])) {
      throw new Error('non-canonical model binding fields');
    }
  } catch {
    issues.push(`${safePath(label)} is not bound to the current RavScore model`);
  }
}

function scanAtomicFields(value, { label, datasetId, productionReferenceAt, issues, tokens = [] }) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanAtomicFields(item, {
      label, datasetId, productionReferenceAt, issues, tokens: [...tokens, index],
    }));
    return;
  }
  if (!value || typeof value !== 'object') return;

  const expectedBinding = ravScoreModelBinding();
  for (const [key, nested] of Object.entries(value)) {
    const nestedTokens = [...tokens, key];
    const fieldPath = displayJsonPath(label, nestedTokens);
    if (MODEL_BINDING_FIELD.test(key)) addBindingIssue(nested, fieldPath, issues);
    if (key === 'scoreProfileId' || key === 'activeProfileId') {
      if (nested !== expectedBinding.modelId) issues.push(`${safePath(fieldPath)} has a cross-model profile id`);
    }
    if (key === 'stateSchemaVersion' && nested !== expectedBinding.stateSchemaVersion) {
      issues.push(`${safePath(fieldPath)} has a cross-model state schema`);
    }
    if (key === 'modelContractSha256' && nested !== expectedBinding.modelContractSha256) {
      issues.push(`${safePath(fieldPath)} has a cross-model contract digest`);
    }
    if (key === 'modelBundleSha256' && nested !== expectedBinding.modelBundleSha256) {
      issues.push(`${safePath(fieldPath)} has a cross-model bundle digest`);
    }
    if (key === 'datasetId' && nested !== datasetId) {
      issues.push(`${safePath(fieldPath)} has a cross-dataset binding`);
    }
    if (key === 'productionReferenceAt' && nested !== productionReferenceAt) {
      issues.push(`${safePath(fieldPath)} has a cross-reference-time binding`);
    }
    scanAtomicFields(nested, { label, datasetId, productionReferenceAt, issues, tokens: nestedTokens });
  }
}

function validatePublicRuntime({ manifest, startup, details, coastalParts, zoneRegistry, texts, issues }) {
  const datasetId = typeof manifest?.datasetId === 'string' ? manifest.datasetId.trim() : '';
  const productionReferenceAt = manifest?.productionReferenceAt;
  const expectedBinding = ravScoreModelBinding();

  if (manifest?.schemaVersion !== 4 || manifest?.complete !== true) {
    issues.push('data/live/manifest.json is not a complete schema-4 manifest');
  }
  if (!datasetId) issues.push('data/live/manifest.json lacks a dataset id');
  if (typeof productionReferenceAt !== 'string' || !Number.isFinite(Date.parse(productionReferenceAt))) {
    issues.push('data/live/manifest.json lacks a valid production reference');
  }
  if (typeof manifest?.generatedAt !== 'string' || !Number.isFinite(Date.parse(manifest.generatedAt))) {
    issues.push('data/live/manifest.json lacks a valid generation time');
  }

  for (const [field, expected] of Object.entries(EXPECTED_PUBLIC_PATHS)) {
    if (manifest?.[field] !== expected) issues.push(`data/live/manifest.json has an invalid ${field}`);
  }
  if (manifest?.coastalPartsPath !== './coastal-parts-v2.json') {
    issues.push('data/live/manifest.json has an invalid coastalPartsPath');
  }
  if (manifest?.zoneRegistryPath !== './data/zones.geojson') {
    issues.push('data/live/manifest.json has an invalid zoneRegistryPath');
  }

  addBindingIssue(manifest?.ravScoreModelBinding, 'manifest.ravScoreModelBinding', issues);
  addBindingIssue(manifest?.ravScoreRuntime?.modelBinding, 'manifest.ravScoreRuntime.modelBinding', issues);

  const publicHash = sha256(texts.startup);
  const detailsHash = sha256(texts.details);
  const publicBytes = Buffer.byteLength(texts.startup);
  const detailsBytes = Buffer.byteLength(texts.details);
  const publicBodyHash = sha256(canonicalPublicRuntimeJson(publicRuntimeDocumentBody(startup)));
  const detailsBodyHash = sha256(canonicalPublicRuntimeJson(publicRuntimeDocumentBody(details)));

  const digestChecks = [
    [manifest?.publicConditionsSha256, publicHash, 'manifest public-conditions file digest'],
    [manifest?.publicConditionDetailsSha256, detailsHash, 'manifest detail file digest'],
    [manifest?.ravScoreRuntime?.startup?.fileSha256, publicHash, 'runtime startup file digest'],
    [manifest?.ravScoreRuntime?.details?.fileSha256, detailsHash, 'runtime detail file digest'],
    [startup?.ravScoreRuntime?.payloadBodySha256, publicBodyHash, 'startup body digest'],
    [details?.ravScoreRuntime?.payloadBodySha256, detailsBodyHash, 'detail body digest'],
    [manifest?.ravScoreRuntime?.startup?.payloadBodySha256, publicBodyHash, 'manifest startup body digest'],
    [manifest?.ravScoreRuntime?.details?.payloadBodySha256, detailsBodyHash, 'manifest detail body digest'],
  ];
  for (const [actual, expected, label] of digestChecks) {
    if (!SHA256_PATTERN.test(String(actual ?? '')) || actual !== expected) issues.push(`${label} mismatch`);
  }
  if (manifest?.publicConditionsBytes !== publicBytes
    || manifest?.ravScoreRuntime?.startup?.bytes !== publicBytes) {
    issues.push('public-conditions byte count mismatch');
  }
  if (manifest?.publicConditionDetailsBytes !== detailsBytes
    || manifest?.ravScoreRuntime?.details?.bytes !== detailsBytes) {
    issues.push('public-condition-details byte count mismatch');
  }

  try {
    assertPublicRuntimeEnvelope(startup, {
      kind: RAVSCORE_PUBLIC_STARTUP_KIND,
      datasetId,
      productionReferenceAt,
      payloadBodySha256: publicBodyHash,
      modelBinding: expectedBinding,
      label: 'startup payload',
    });
  } catch {
    issues.push('public-conditions runtime envelope mismatch');
  }
  try {
    assertPublicRuntimeEnvelope(details, {
      kind: RAVSCORE_PUBLIC_DETAILS_KIND,
      datasetId,
      productionReferenceAt,
      payloadBodySha256: detailsBodyHash,
      modelBinding: expectedBinding,
      label: 'detail payload',
    });
  } catch {
    issues.push('public-condition-details runtime envelope mismatch');
  }

  if (manifest?.ravScoreRuntime?.startup?.kind !== RAVSCORE_PUBLIC_STARTUP_KIND) {
    issues.push('manifest startup runtime kind mismatch');
  }
  if (manifest?.ravScoreRuntime?.details?.kind !== RAVSCORE_PUBLIC_DETAILS_KIND) {
    issues.push('manifest detail runtime kind mismatch');
  }

  if (startup?.generatedAt !== manifest?.generatedAt || details?.generatedAt !== manifest?.generatedAt) {
    issues.push('public runtime generation-time mismatch');
  }
  const manifestZoneCount = manifest?.zoneCount;
  if (!Number.isInteger(manifestZoneCount) || manifestZoneCount < 1
    || Object.keys(startup?.zones ?? {}).length !== manifestZoneCount
    || Object.keys(details?.zones ?? {}).length !== manifestZoneCount) {
    issues.push('manifest and public runtime zone count mismatch');
  }
  scanAtomicFields(startup, {
    label: 'public-conditions', datasetId, productionReferenceAt, issues,
  });
  scanAtomicFields(details, {
    label: 'public-condition-details', datasetId, productionReferenceAt, issues,
  });
  scanAtomicFields(manifest, {
    label: 'manifest', datasetId, productionReferenceAt, issues,
  });

  if (coastalParts?.schemaVersion !== 2 || coastalParts?.enabled !== true
    || !coastalParts?.zones || typeof coastalParts.zones !== 'object' || Array.isArray(coastalParts.zones)) {
    issues.push('coastal-parts-v2 has an invalid public contract');
  } else {
    const rows = Object.values(coastalParts.zones).flatMap(value => Array.isArray(value) ? value : []);
    const ids = rows.map(row => row?.partId).filter(value => typeof value === 'string' && value.length > 0);
    if (rows.length !== coastalParts.partCount || new Set(ids).size !== rows.length) {
      issues.push('coastal-parts-v2 part count or identity mismatch');
    }
    if (Object.keys(coastalParts.zones).length !== coastalParts.zoneCount) {
      issues.push('coastal-parts-v2 zone count mismatch');
    }
    if (manifest?.coastalPartCount !== coastalParts.partCount) {
      issues.push('manifest and coastal-parts-v2 count mismatch');
    }
    for (const document of [startup, details]) {
      if (document?.coastalParts?.expectedPartCount !== coastalParts.partCount) {
        issues.push('public runtime and coastal-parts-v2 count mismatch');
      }
    }
  }

  if (manifest?.coastalPartsPath !== './coastal-parts-v2.json'
    || manifest?.coastalPartsSha256 !== sha256(texts.coastalParts)
    || manifest?.coastalPartsBytes !== Buffer.byteLength(texts.coastalParts)) {
    issues.push('coastal-parts-v2 manifest binding mismatch');
  }
  if (manifest?.zoneRegistryPath !== './data/zones.geojson'
    || manifest?.zoneRegistrySha256 !== sha256(texts.zoneRegistry)
    || manifest?.zoneRegistryBytes !== Buffer.byteLength(texts.zoneRegistry)) {
    issues.push('zones.geojson manifest binding mismatch');
  }
  const registered = Array.isArray(zoneRegistry?.features) ? zoneRegistry.features : [];
  const activeZoneIds = registered
    .filter(feature => feature?.properties?.zoneStatus === 'active')
    .map(feature => feature?.properties?.id);
  const startupZoneIds = Object.keys(startup?.zones ?? {});
  const coastalZoneIds = Object.keys(coastalParts?.zones ?? {});
  if (zoneRegistry?.type !== 'FeatureCollection'
    || registered.some(feature => typeof feature?.properties?.id !== 'string'
      || !feature.properties.id)
    || new Set(registered.map(feature => feature.properties.id)).size !== registered.length
    || registered.length !== manifest?.zoneRegistryFeatureCount
    || activeZoneIds.length !== manifest?.zoneRegistryActiveCount
    || manifest?.zoneRegistryActiveCount < manifestZoneCount
    || startupZoneIds.length !== manifestZoneCount
    || coastalZoneIds.length !== manifestZoneCount
    || startupZoneIds.some(zoneId => !activeZoneIds.includes(zoneId)
      || !coastalZoneIds.includes(zoneId))) {
    issues.push('zones.geojson identity or active-zone coverage mismatch');
  }
}

export class PagesArtifactPrivacyError extends Error {
  constructor(issues) {
    const unique = [...new Set(issues)];
    super(`Pages artifact rejected with ${unique.length} privacy/atomicity issue(s): ${unique.slice(0, 30).join('; ')}`);
    this.name = 'PagesArtifactPrivacyError';
    this.issues = unique;
  }
}

export async function auditPagesArtifactPrivacy(siteRoot, {
  privateManifestPath = null,
  requirePrivateManifest = false,
} = {}) {
  if (!siteRoot) throw new Error('A Pages artifact directory must be provided');
  const root = path.resolve(siteRoot);
  let rootStat;
  try {
    rootStat = await fs.lstat(root);
  } catch {
    throw new Error('The Pages artifact directory does not exist');
  }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new PagesArtifactPrivacyError(['artifact root is not a real directory']);
  }

  const privateFingerprints = await loadPrivateRuntimeFingerprints(
    privateManifestPath,
    { required: requirePrivateManifest },
  );
  const { entries, issues } = await collectEntries(root);
  const files = entries.filter(entry => entry.kind === 'file');
  const pathKeys = new Map();
  for (const entry of entries) {
    const key = normalizedPath(entry.relative);
    if (pathKeys.has(key)) issues.push(`case-normalized path collision at ${safePath(entry.relative)}`);
    pathKeys.set(key, entry.relative);
    const reason = privatePathReason(entry.relative);
    if (reason) issues.push(`${reason} path at ${safePath(entry.relative)}`);
    if (key === 'data/live' && entry.relative !== 'data/live') {
      issues.push(`non-canonical live directory at ${safePath(entry.relative)}`);
    }
    if (key.startsWith('data/live/') && !EXPECTED_LIVE_FILES.has(entry.relative)) {
      issues.push(`unexpected live artifact at ${safePath(entry.relative)}`);
    }
  }

  const fileByRelative = new Map(files.map(file => [file.relative, file]));
  for (const expected of EXPECTED_LIVE_FILES) {
    if (!fileByRelative.has(expected)) issues.push(`missing required live artifact at ${expected}`);
  }
  if (!fileByRelative.has(ZONE_REGISTRY_FILE)) {
    issues.push(`missing required public zone registry at ${ZONE_REGISTRY_FILE}`);
  }

  const parsed = new Map();
  const texts = new Map();
  for (const file of files) {
    if (privateFingerprints.size > 0) {
      const bytes = await fs.readFile(file.absolute);
      if (privateFingerprints.has(`${bytes.length}:${sha256(bytes)}`)) {
        issues.push(`exact private runtime payload fingerprint at ${safePath(file.relative)}`);
      }
    }
    if (!/\.(?:json|geojson)$/i.test(file.relative)) continue;
    let text;
    let document;
    try {
      text = await fs.readFile(file.absolute, 'utf8');
      document = JSON.parse(text);
    } catch {
      issues.push(`invalid JSON at ${safePath(file.relative)}`);
      continue;
    }
    parsed.set(file.relative, document);
    texts.set(file.relative, text);
    scanJsonPrivacy(document, { file: file.relative, issues });
  }

  const requiredParsed = [...EXPECTED_LIVE_FILES, ZONE_REGISTRY_FILE].every(file => parsed.has(file));
  if (requiredParsed) {
    validatePublicRuntime({
      manifest: parsed.get('data/live/manifest.json'),
      startup: parsed.get('data/live/public-conditions.json'),
      details: parsed.get('data/live/public-condition-details.json'),
      coastalParts: parsed.get('data/live/coastal-parts-v2.json'),
      zoneRegistry: parsed.get(ZONE_REGISTRY_FILE),
      texts: {
        startup: texts.get('data/live/public-conditions.json'),
        details: texts.get('data/live/public-condition-details.json'),
        coastalParts: texts.get('data/live/coastal-parts-v2.json'),
        zoneRegistry: texts.get(ZONE_REGISTRY_FILE),
      },
      issues,
    });
  }

  if (issues.length) throw new PagesArtifactPrivacyError(issues);
  return Object.freeze({
    root,
    fileCount: files.length,
    jsonFileCount: parsed.size,
    liveFileCount: EXPECTED_LIVE_FILES.size,
    privateFingerprintCount: privateFingerprints.size,
    datasetId: parsed.get('data/live/manifest.json').datasetId,
  });
}

function parseCliOptions(argv) {
  const index = argv.indexOf('--site');
  const privateIndex = argv.indexOf('--private-manifest');
  return {
    site: index >= 0
      ? argv[index + 1] || null
      : argv.find(value => !value.startsWith('-')) || null,
    privateManifestPath: privateIndex >= 0 ? argv[privateIndex + 1] || null : null,
    requirePrivateManifest: argv.includes('--require-private-manifest'),
  };
}

const isMain = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  const options = parseCliOptions(process.argv.slice(2));
  auditPagesArtifactPrivacy(options.site, options)
    .then(result => {
      console.log(`Pages artifact privacy gate: ${result.liveFileCount} allowlisted live files and ${result.fileCount} total files passed.`);
    })
    .catch(error => {
      console.error(error instanceof PagesArtifactPrivacyError
        ? error.message
        : `Pages artifact privacy gate failed: ${error.message}`);
      process.exitCode = 1;
    });
}
