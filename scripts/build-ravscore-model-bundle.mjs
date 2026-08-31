#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAVSCORE_MODEL_CONTRACT } from '../js/core/ravscore-model-contract.js';
import { exactRelativeModuleSpecifiers } from './lib/static-module-closure.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED_PATH = 'js/core/ravscore-model-bundle.generated.js';
export const RAVSCORE_MODEL_BUNDLE_NORMALIZATION_ID =
  'lexer-esm-relative-import-closure-utf8-lf-static-cachebuster-v2';
export const RAVSCORE_MODEL_BUNDLE_ENTRYPOINTS = Object.freeze([
  'js/core/best-time-selector.js',
  'js/core/local-zone-score.js',
  'js/core/ravscore-integrated-explanation-presenter.js',
  'js/core/ravscore-integrated-state-pipeline.js',
  'js/core/ravscore-integrated.js',
  'js/core/ravscore-public-model.js',
  'js/core/ravscore-public-runtime-contract.js',
  'scripts/lib/coastal-point-stage-dmi-adapter.mjs',
  'scripts/lib/coastal-point-staging-contract.mjs',
  'scripts/lib/ravscore-candidate-g-rollback-runtime.mjs',
  'scripts/lib/ravscore-integrated-runtime.mjs',
  'scripts/lib/ravscore-production-adapters.mjs',
  'scripts/lib/ravscore-production-part-pipeline.mjs',
  'scripts/lib/ravscore-profile-transition.mjs',
  'scripts/lib/ravscore-recovery-replay.mjs',
  'scripts/public-conditions-lib.mjs',
]);

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
}

export function canonicalBundleJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function posix(value) {
  return value.split(path.sep).join('/');
}

function normalizedSource(text) {
  return String(text)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/([?&]v=)\d+\.\d+\.\d+(?=["'])/g, '$1<release-version>');
}

async function regularFile(filePath) {
  try {
    const stat = await fs.lstat(filePath);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

async function resolveRelativeImport(root, importer, specifier) {
  const clean = specifier.split(/[?#]/, 1)[0];
  const base = path.resolve(path.dirname(path.join(root, importer)), clean);
  const candidates = path.extname(base)
    ? [base]
    : [base, `${base}.js`, `${base}.mjs`, `${base}.json`, path.join(base, 'index.js')];
  for (const candidate of candidates) {
    const relative = posix(path.relative(root, candidate));
    if (relative.startsWith('../') || path.isAbsolute(relative)) {
      throw new Error(`Model import escapes repository root: ${importer}`);
    }
    if (await regularFile(candidate)) return relative;
  }
  throw new Error(`Unresolved relative model import in ${importer}: ${clean}`);
}

export async function computeRavScoreModelBundle({
  root = ROOT,
  entrypoints = RAVSCORE_MODEL_BUNDLE_ENTRYPOINTS,
  sourceOverrides = new Map(),
} = {}) {
  const normalizedRoot = path.resolve(root);
  const pending = [...new Set(entrypoints.map(value => posix(value)))].sort();
  const visited = new Set();
  const sources = new Map();
  while (pending.length) {
    const relative = pending.shift();
    if (relative === GENERATED_PATH || visited.has(relative)) continue;
    const absolute = path.resolve(normalizedRoot, relative);
    const relativeCheck = posix(path.relative(normalizedRoot, absolute));
    if (relativeCheck.startsWith('../') || path.isAbsolute(relativeCheck) || !await regularFile(absolute)) {
      throw new Error(`Invalid RavScore bundle source: ${relative}`);
    }
    const raw = sourceOverrides.has(relative)
      ? String(sourceOverrides.get(relative))
      : await fs.readFile(absolute, 'utf8');
    const normalized = normalizedSource(raw);
    visited.add(relative);
    sources.set(relative, normalized);
    for (const specifier of exactRelativeModuleSpecifiers(raw, relative)) {
      const dependency = await resolveRelativeImport(normalizedRoot, relative, specifier);
      if (dependency !== GENERATED_PATH && !visited.has(dependency)) pending.push(dependency);
    }
    pending.sort();
  }
  const contractSha256 = sha256(canonicalBundleJson(RAVSCORE_MODEL_CONTRACT));
  const files = [...sources].sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([filePath, source]) => Object.freeze({ path: filePath, sha256: sha256(source) }));
  const manifest = Object.freeze({
    schemaVersion: '1.0.0',
    normalizationId: RAVSCORE_MODEL_BUNDLE_NORMALIZATION_ID,
    contractSha256,
    entrypoints: [...entrypoints].sort(),
    files,
  });
  return Object.freeze({
    contractSha256,
    modelBundleSha256: sha256(canonicalBundleJson(manifest)),
    manifest,
  });
}

export function renderGeneratedBundleModule(bundle) {
  return [
    '// Generated by scripts/build-ravscore-model-bundle.mjs. Do not edit manually.',
    `export const GENERATED_RAVSCORE_MODEL_CONTRACT_SHA256 = '${bundle.contractSha256}';`,
    `export const GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256 = '${bundle.modelBundleSha256}';`,
    `export const GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST = Object.freeze(${JSON.stringify(bundle.manifest, null, 2)});`,
    '',
  ].join('\n');
}

async function main() {
  const mode = process.argv.includes('--write') ? 'write' : 'check';
  const bundle = await computeRavScoreModelBundle();
  const expected = renderGeneratedBundleModule(bundle);
  const generatedAbsolute = path.join(ROOT, GENERATED_PATH);
  if (mode === 'write') {
    await fs.writeFile(generatedAbsolute, expected, 'utf8');
    console.log(`RavScore model bundle generated: ${bundle.modelBundleSha256} (${bundle.manifest.files.length} files).`);
    return;
  }
  const actual = await fs.readFile(generatedAbsolute, 'utf8');
  if (normalizedSource(actual) !== normalizedSource(expected)) {
    throw new Error('RavScore model bundle is stale; run node scripts/build-ravscore-model-bundle.mjs --write');
  }
  console.log(`RavScore model bundle verified: ${bundle.modelBundleSha256} (${bundle.manifest.files.length} files).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : 'RavScore model bundle verification failed');
    process.exitCode = 1;
  }
}
