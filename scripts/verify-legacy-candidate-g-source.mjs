#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  LEGACY_CANDIDATE_G_IMPLEMENTATION_CLOSURE_SHA256,
  LEGACY_CANDIDATE_G_IMPLEMENTATION_FILE_COUNT,
  LEGACY_CANDIDATE_G_MODEL_ID,
  LEGACY_CANDIDATE_G_SOURCE_HEAD,
  LEGACY_CANDIDATE_G_SOURCE_TREE,
  LEGACY_CANDIDATE_G_STATE_SCHEMA_VERSION,
  assertLegacyCandidateGManifest,
  legacyCandidateGSourceIdentity,
} from './lib/ravscore-legacy-candidate-g-source.mjs';

export const LEGACY_CANDIDATE_G_ATTESTATION_SCHEMA =
  'ravscore-legacy-candidate-g-local-attestation-v1';
export const LEGACY_CANDIDATE_G_VERIFICATION_SCHEMA =
  'ravscore-legacy-candidate-g-pages-verification-v1';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execFile = promisify(execFileCallback);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const HEAD_PATTERN = /^[a-f0-9]{40}$/;
export const LEGACY_IMPLEMENTATION_ENTRYPOINTS = Object.freeze([
  'index.html',
  'learn.html',
  'app.js',
  'service-worker.js',
  'js/core/ravscore-candidate-g.js',
  'js/core/ravscore-candidate-g-state-pipeline.js',
]);
// These modules were intentionally excluded from the 49dd public Pages
// package. They are not silently skipped because of a missing fetch; their
// exclusion is the exact historical packaging contract.
const LEGACY_PUBLIC_MODULE_EXCLUSIONS = Object.freeze(new Set([
  'js/ui/handbook.js',
  'js/ui/admin-app.js',
  'js/core/rule-engine.js',
  'js/services/rule-service.js',
]));
const ATTESTATION_FIELDS = Object.freeze([
  'schemaVersion', 'legacySourceIdentity', 'datasetId', 'productionReferenceAt',
  'publicManifestSha256', 'zoneCount', 'coastalPartCount', 'candidateStateCount',
  'privatePayloadLogged',
]);
const VERIFICATION_FIELDS = Object.freeze([
  'schemaVersion', 'status', 'sourceHead', 'legacySourceIdentity', 'datasetId',
  'productionReferenceAt', 'publicManifestSha256', 'zoneCount', 'coastalPartCount',
  'candidateStateCount', 'localAttestationSha256', 'implementationClosureSha256',
  'privatePayloadRead', 'privatePayloadLogged',
]);

const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const stableJson = value => JSON.stringify(canonical(value));
const sha256 = value => crypto.createHash('sha256')
  .update(typeof value === 'string' || Buffer.isBuffer(value) ? value : stableJson(value))
  .digest('hex');
const exactKeys = (value, fields) => value && typeof value === 'object' && !Array.isArray(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
const same = (left, right) => stableJson(left) === stableJson(right);

function assertExactIdentity(value, label) {
  if (!same(value, legacyCandidateGSourceIdentity())) {
    throw new Error(`${label} has another legacy source identity`);
  }
}

export function assertLegacyCandidateGAttestation(value) {
  if (!exactKeys(value, ATTESTATION_FIELDS)
    || value.schemaVersion !== LEGACY_CANDIDATE_G_ATTESTATION_SCHEMA
    || !value.datasetId
    || !Number.isFinite(Date.parse(value.productionReferenceAt))
    || !SHA256_PATTERN.test(String(value.publicManifestSha256 ?? ''))
    || value.zoneCount !== 210
    || value.coastalPartCount !== 673
    || value.candidateStateCount !== 673
    || value.privatePayloadLogged !== false) {
    throw new Error('Legacy Candidate G local attestation is incomplete or unsafe');
  }
  assertExactIdentity(value.legacySourceIdentity, 'Legacy Candidate G local attestation');
  return value;
}

export function attestLegacyCandidateGSource({ manifest, conditions } = {}) {
  assertLegacyCandidateGManifest(manifest);
  const parts = conditions?.coastalParts?.parts;
  if (!conditions || conditions.datasetId !== manifest.datasetId
    || conditions.productionReferenceAt !== manifest.productionReferenceAt
    || Object.keys(conditions.zones ?? {}).length !== 210
    || !parts || Object.keys(parts).length !== 673
    || conditions.coastalParts?.scoreProfile?.activeProfileId !== LEGACY_CANDIDATE_G_MODEL_ID) {
    throw new Error('Legacy Candidate G local source lacks exact 210/673 runtime identity');
  }
  let candidateStateCount = 0;
  for (const part of Object.values(parts)) {
    const state = part?.candidateG?.currentState;
    if (!state
      || state.schemaVersion !== LEGACY_CANDIDATE_G_STATE_SCHEMA_VERSION
      || state.modelId !== LEGACY_CANDIDATE_G_MODEL_ID
      || Object.hasOwn(part, 'ravScoreModel')) {
      throw new Error('Legacy Candidate G local source contains a non-Candidate or incomplete part');
    }
    candidateStateCount += 1;
  }
  const document = Object.freeze({
    schemaVersion: LEGACY_CANDIDATE_G_ATTESTATION_SCHEMA,
    legacySourceIdentity: legacyCandidateGSourceIdentity(),
    datasetId: manifest.datasetId,
    productionReferenceAt: manifest.productionReferenceAt,
    publicManifestSha256: sha256(manifest),
    zoneCount: 210,
    coastalPartCount: 673,
    candidateStateCount,
    privatePayloadLogged: false,
  });
  assertLegacyCandidateGAttestation(document);
  return document;
}

function relativeModuleSpecifiers(source, importer) {
  const values = new Set();
  for (const pattern of [
    /(?:^|\n)\s*(?:import|export)\s+(?:[^;"']*?\s+from\s+)?["']([^"']+)["']/gm,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+\.(?:js|mjs)(?:\?[^"']*)?)["']/gi,
  ]) {
    for (const match of String(source).matchAll(pattern)) {
      const specifier = match[1].split(/[?#]/, 1)[0];
      if (specifier.startsWith('./') || specifier.startsWith('../')) values.add(specifier);
      else if (importer.endsWith('.html') && !/^[a-z]+:/i.test(specifier)
        && specifier.endsWith('.js')) values.add(`./${specifier.replace(/^\//, '')}`);
    }
  }
  return [...values];
}

async function gitBytes(root, relative) {
  const { stdout } = await execFile('git', [
    '-C', root,
    'show', `${LEGACY_CANDIDATE_G_SOURCE_HEAD}:${relative}`,
  ], { encoding: null, maxBuffer: 32 * 1024 * 1024 });
  return Buffer.from(stdout);
}

async function assertPinnedSourceTree(root) {
  const { stdout } = await execFile('git', [
    '-C', root,
    'rev-parse', `${LEGACY_CANDIDATE_G_SOURCE_HEAD}^{tree}`,
  ], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (String(stdout).trim() !== LEGACY_CANDIDATE_G_SOURCE_TREE) {
    throw new Error('Legacy Candidate G pinned source head and tree differ');
  }
}

async function resolveBaselineImport(root, importer, specifier) {
  const clean = specifier.split(/[?#]/, 1)[0];
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), clean));
  if (base.startsWith('../') || path.posix.isAbsolute(base)) {
    throw new Error(`Legacy public implementation import escapes its source tree: ${importer}`);
  }
  const candidates = path.posix.extname(base)
    ? [base]
    : [base, `${base}.js`, `${base}.mjs`, path.posix.join(base, 'index.js')];
  for (const candidate of candidates) {
    try {
      await gitBytes(root, candidate);
      return candidate;
    } catch {
      // Try the next deterministic ESM resolution candidate.
    }
  }
  throw new Error(`Legacy public implementation import is missing at 49dd: ${importer} -> ${clean}`);
}

export async function baselineImplementationSources({ root = ROOT } = {}) {
  await assertPinnedSourceTree(root);
  const pending = [...LEGACY_IMPLEMENTATION_ENTRYPOINTS];
  const sources = new Map();
  while (pending.length) {
    const relative = pending.pop();
    if (sources.has(relative) || LEGACY_PUBLIC_MODULE_EXCLUSIONS.has(relative)) continue;
    const bytes = await gitBytes(root, relative);
    sources.set(relative, bytes);
    const source = bytes.toString('utf8');
    for (const specifier of relativeModuleSpecifiers(source, relative)) {
      const imported = await resolveBaselineImport(root, relative, specifier);
      if (!sources.has(imported) && !LEGACY_PUBLIC_MODULE_EXCLUSIONS.has(imported)) {
        pending.push(imported);
      }
    }
  }
  const baseline = [...sources.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([relative, bytes]) => Object.freeze({ relative, bytes }));
  if (baseline.length !== LEGACY_CANDIDATE_G_IMPLEMENTATION_FILE_COUNT) {
    throw new Error(`Legacy Candidate G pinned implementation file count differs: ${baseline.length}`);
  }
  const closureSha256 = sha256(Object.freeze({
    sourceHead: LEGACY_CANDIDATE_G_SOURCE_HEAD,
    files: Object.freeze(baseline.map(({ relative, bytes }) => Object.freeze({
      file: relative,
      sha256: sha256(bytes),
    }))),
  }));
  if (closureSha256 !== LEGACY_CANDIDATE_G_IMPLEMENTATION_CLOSURE_SHA256) {
    throw new Error(`Legacy Candidate G pinned implementation closure differs: ${closureSha256}`);
  }
  return baseline;
}

export async function legacyCandidateGImplementationClosureSha256({ root = ROOT } = {}) {
  const baseline = await baselineImplementationSources({ root });
  const closureSha256 = sha256(Object.freeze({
    sourceHead: LEGACY_CANDIDATE_G_SOURCE_HEAD,
    files: Object.freeze(baseline.map(({ relative, bytes }) => Object.freeze({
      file: relative,
      sha256: sha256(bytes),
    }))),
  }));
  if (closureSha256 !== LEGACY_CANDIDATE_G_IMPLEMENTATION_CLOSURE_SHA256) {
    throw new Error('Legacy Candidate G implementation closure is not the pinned public source');
  }
  return closureSha256;
}

async function fetchBytes(fetchImpl, url, label) {
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { accept: label.endsWith('.json') ? 'application/json' : 'text/javascript' },
  });
  if (!response?.ok) throw new Error(`${label} returned HTTP ${response?.status ?? 'unknown'}`);
  return Buffer.from(await response.arrayBuffer());
}

function withCacheBuster(baseUrl, relative, sourceHead) {
  const url = new URL(relative, `${String(baseUrl).replace(/\/$/, '')}/`);
  url.searchParams.set('ravscore-legacy-source', sourceHead);
  return url.toString();
}

export async function verifyLegacyCandidateGSource({
  baseUrl,
  sourceHead,
  expectedManifest,
  localAttestation,
  fetchImpl = globalThis.fetch,
  root = ROOT,
} = {}) {
  if (!baseUrl || !HEAD_PATTERN.test(String(sourceHead ?? ''))
    || typeof fetchImpl !== 'function') {
    throw new Error('Legacy Candidate G source verification input is invalid');
  }
  assertLegacyCandidateGManifest(expectedManifest);
  assertLegacyCandidateGAttestation(localAttestation);
  if (localAttestation.datasetId !== expectedManifest.datasetId
    || localAttestation.productionReferenceAt !== expectedManifest.productionReferenceAt
    || localAttestation.publicManifestSha256 !== sha256(expectedManifest)) {
    throw new Error('Legacy Candidate G attestation belongs to another public manifest');
  }

  const deployedManifestBytes = await fetchBytes(fetchImpl,
    withCacheBuster(baseUrl, 'data/live/manifest.json', sourceHead), 'manifest.json');
  let deployedManifest;
  try { deployedManifest = JSON.parse(deployedManifestBytes.toString('utf8')); }
  catch { throw new Error('Deployed legacy Candidate G manifest is not JSON'); }
  if (!same(deployedManifest, expectedManifest)) {
    throw new Error('Deployed legacy Candidate G manifest differs from the attested source');
  }

  for (const [relative, expectedSha, expectedBytes] of [
    ['data/live/public-conditions.json', expectedManifest.publicConditionsSha256,
      expectedManifest.publicConditionsBytes],
    ['data/live/public-condition-details.json', expectedManifest.publicConditionDetailsSha256,
      expectedManifest.publicConditionDetailsBytes],
  ]) {
    const bytes = await fetchBytes(fetchImpl, withCacheBuster(baseUrl, relative, sourceHead), relative);
    if (!SHA256_PATTERN.test(String(expectedSha ?? ''))
      || sha256(bytes) !== expectedSha
      || bytes.length !== expectedBytes) {
      throw new Error(`Legacy Candidate G public payload digest mismatch for ${relative}`);
    }
  }

  const baseline = await baselineImplementationSources({ root });
  const closure = [];
  for (const { relative, bytes: expectedBytes } of baseline) {
    const deployed = await fetchBytes(fetchImpl,
      withCacheBuster(baseUrl, relative, sourceHead), relative);
    if (!deployed.equals(expectedBytes)) {
      throw new Error(`Legacy Candidate G public implementation drifted from 4.0.316: ${relative}`);
    }
    closure.push(Object.freeze({ file: relative, sha256: sha256(expectedBytes) }));
  }
  const implementationClosureSha256 = sha256(Object.freeze({
    sourceHead: LEGACY_CANDIDATE_G_SOURCE_HEAD,
    files: Object.freeze(closure),
  }));
  const locallySealedImplementationClosureSha256 =
    await legacyCandidateGImplementationClosureSha256({ root });
  if (implementationClosureSha256 !== locallySealedImplementationClosureSha256) {
    throw new Error('Legacy Candidate G verified and locally sealed closures diverge');
  }
  const verification = Object.freeze({
    schemaVersion: LEGACY_CANDIDATE_G_VERIFICATION_SCHEMA,
    status: 'passed',
    sourceHead,
    legacySourceIdentity: legacyCandidateGSourceIdentity(),
    datasetId: expectedManifest.datasetId,
    productionReferenceAt: expectedManifest.productionReferenceAt,
    publicManifestSha256: sha256(expectedManifest),
    zoneCount: 210,
    coastalPartCount: 673,
    candidateStateCount: 673,
    localAttestationSha256: sha256(localAttestation),
    implementationClosureSha256,
    privatePayloadRead: false,
    privatePayloadLogged: false,
  });
  assertLegacyCandidateGVerification(verification, {
    sourceHead,
    publicManifest: expectedManifest,
    localAttestation,
  });
  return verification;
}

export function assertLegacyCandidateGVerification(value, {
  sourceHead,
  publicManifest,
  localAttestation,
} = {}) {
  if (!exactKeys(value, VERIFICATION_FIELDS)
    || value.schemaVersion !== LEGACY_CANDIDATE_G_VERIFICATION_SCHEMA
    || value.status !== 'passed'
    || value.sourceHead !== sourceHead
    || value.datasetId !== publicManifest?.datasetId
    || value.productionReferenceAt !== publicManifest?.productionReferenceAt
    || value.publicManifestSha256 !== sha256(publicManifest)
    || value.zoneCount !== 210
    || value.coastalPartCount !== 673
    || value.candidateStateCount !== 673
    || value.localAttestationSha256 !== sha256(localAttestation)
    || !SHA256_PATTERN.test(String(value.implementationClosureSha256 ?? ''))
    || value.privatePayloadRead !== false
    || value.privatePayloadLogged !== false) {
    throw new Error('Legacy Candidate G public verification is incomplete or unsafe');
  }
  assertExactIdentity(value.legacySourceIdentity, 'Legacy Candidate G public verification');
  return value;
}

async function atomicWriteJson(file, value) {
  const destination = path.resolve(file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value)}\n`, { flag: 'wx', mode: 0o600 });
    await fs.rename(temporary, destination);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function cliOptions(argv) {
  const options = { command: argv[2] ?? '' };
  for (let index = 3; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`Unknown legacy source option: ${key}`);
    options[key.slice(2)] = value;
  }
  return options;
}

async function readJson(file, label) {
  if (!file) throw new Error(`${label} path is required`);
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { throw new Error(`${label} is not valid JSON`); }
}

async function main() {
  const options = cliOptions(process.argv);
  if (!options.output) throw new Error('Legacy Candidate G verification output is required');
  if (options.command === 'attest') {
    const [manifest, conditions] = await Promise.all([
      readJson(options.manifest, 'Legacy manifest'),
      readJson(options.conditions, 'Legacy conditions'),
    ]);
    const attestation = attestLegacyCandidateGSource({ manifest, conditions });
    await atomicWriteJson(options.output, attestation);
    console.log(`Legacy Candidate G source attested for ${attestation.datasetId}; private payload logged: false.`);
    return;
  }
  if (options.command === 'verify') {
    const [expectedManifest, localAttestation] = await Promise.all([
      readJson(options.manifest, 'Legacy expected manifest'),
      readJson(options.attestation, 'Legacy local attestation'),
    ]);
    const verification = await verifyLegacyCandidateGSource({
      baseUrl: options['base-url'],
      sourceHead: options['source-head'],
      expectedManifest,
      localAttestation,
    });
    await atomicWriteJson(options.output, verification);
    console.log(`Legacy Candidate G public source verified for ${verification.datasetId}; private payload read/logged: false/false.`);
    return;
  }
  throw new Error('Legacy Candidate G verification requires attest or verify');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Legacy Candidate G source verification failed');
    process.exitCode = 1;
  });
}
