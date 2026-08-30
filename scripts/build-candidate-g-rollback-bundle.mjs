#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAVSCORE_MODEL_CONTRACT } from './rollback-assets/ravscore-model-contract.js';
import { exactRelativeModuleSpecifiers } from './lib/static-module-closure.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED_PATH = 'scripts/rollback-assets/ravscore-model-bundle.generated.js';
export const CANDIDATE_G_ROLLBACK_BUNDLE_NORMALIZATION_ID =
  'candidate-g-rollback-lexer-esm-closure-utf8-lf-static-cachebuster-v2';
export const CANDIDATE_G_ROLLBACK_BUNDLE_ENTRYPOINTS = Object.freeze([
  'js/core/best-time-selector.js',
  'js/core/local-zone-score.js',
  'js/core/ravscore-candidate-g.js',
  'js/core/ravscore-candidate-g-state-pipeline.js',
  'js/core/ravscore-integrated-explanation-presenter.js',
  'js/core/ravscore-profile-switch.js',
  'js/core/ravscore-public-model.js',
  'js/core/ravscore-public-runtime-contract.js',
  'js/core/score-presentation.js',
  'js/services/rav-assistant.js',
  'js/services/trip-evidence-public-adapter.js',
  'supabase/functions/_shared/trip-storage.js',
  'supabase/functions/submit-observation/index.ts',
  'scripts/lib/ravscore-candidate-g-rollback-runtime.mjs',
  'scripts/lib/ravscore-production-part-pipeline.mjs',
  'scripts/rollback-assets/ravscore-model-contract.js',
]);

// Candidate G is bound to its own contract and implementation closure. The
// integrated contract is intentionally excluded: the source model binding is
// verified separately by the rollback plan, and changing an integrated-only
// calibration flag must not silently re-identify the Candidate G oracle.
export const CANDIDATE_G_ROLLBACK_BUNDLE_EXCLUDED_MODULES = Object.freeze([
  'js/core/ravscore-model-bundle.generated.js',
  'js/core/ravscore-model-contract.js',
  GENERATED_PATH,
]);

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const posix = value => value.split(path.sep).join('/');
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;

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

async function resolveImport(root, importer, specifier) {
  const clean = specifier.split(/[?#]/, 1)[0];
  const base = path.resolve(path.dirname(path.join(root, importer)), clean);
  const candidates = path.extname(base)
    ? [base]
    : [base, `${base}.js`, `${base}.mjs`, `${base}.json`, path.join(base, 'index.js')];
  for (const candidate of candidates) {
    const relative = posix(path.relative(root, candidate));
    if (relative.startsWith('../') || path.isAbsolute(relative)) {
      throw new Error(`Candidate G rollback import escapes repository: ${importer}`);
    }
    if (await regularFile(candidate)) return relative;
  }
  throw new Error(`Candidate G rollback import cannot be resolved: ${importer} -> ${clean}`);
}

export async function computeCandidateGRollbackBundle({
  root = ROOT,
  sourceOverrides = new Map(),
} = {}) {
  const excluded = new Set(CANDIDATE_G_ROLLBACK_BUNDLE_EXCLUDED_MODULES);
  const pending = [...CANDIDATE_G_ROLLBACK_BUNDLE_ENTRYPOINTS];
  const sources = new Map();
  while (pending.length) {
    const relative = pending.pop();
    if (sources.has(relative) || excluded.has(relative)) continue;
    const absolute = path.join(root, relative);
    const source = normalizedSource(sourceOverrides.has(relative)
      ? sourceOverrides.get(relative)
      : await fs.readFile(absolute, 'utf8'));
    sources.set(relative, source);
    for (const specifier of exactRelativeModuleSpecifiers(source, relative)) {
      const imported = await resolveImport(root, relative, specifier);
      if (!sources.has(imported) && !excluded.has(imported)) pending.push(imported);
    }
  }
  const files = [...sources.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([file, source]) => Object.freeze({ file, sha256: sha256(source) }));
  const manifest = Object.freeze({
    schemaVersion: 'candidate-g-operational-rollback-bundle-v1',
    normalizationId: CANDIDATE_G_ROLLBACK_BUNDLE_NORMALIZATION_ID,
    entrypoints: Object.freeze([...CANDIDATE_G_ROLLBACK_BUNDLE_ENTRYPOINTS].sort()),
    excludedModules: Object.freeze([...excluded].sort()),
    files: Object.freeze(files),
  });
  return Object.freeze({
    contractSha256: sha256(JSON.stringify(canonical(RAVSCORE_MODEL_CONTRACT))),
    modelBundleSha256: sha256(JSON.stringify(manifest)),
    manifest,
  });
}

export function renderCandidateGRollbackGeneratedModule(bundle) {
  return [
    '// Generated by scripts/build-candidate-g-rollback-bundle.mjs. Do not edit.',
    `export const GENERATED_RAVSCORE_MODEL_CONTRACT_SHA256 = '${bundle.contractSha256}';`,
    `export const GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256 = '${bundle.modelBundleSha256}';`,
    `export const GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST = Object.freeze(${JSON.stringify(bundle.manifest, null, 2)});`,
    '',
  ].join('\n');
}

async function main() {
  const bundle = await computeCandidateGRollbackBundle();
  const generated = renderCandidateGRollbackGeneratedModule(bundle);
  const outputPath = path.join(ROOT, GENERATED_PATH);
  if (process.argv.includes('--write')) {
    await fs.writeFile(outputPath, generated, 'utf8');
    console.log(`Candidate G rollback bundle written: ${bundle.modelBundleSha256}`);
    return;
  }
  if (process.argv.includes('--check')) {
    const current = normalizedSource(await fs.readFile(outputPath, 'utf8'));
    if (current !== normalizedSource(generated)) {
      throw new Error('Candidate G rollback implementation bundle is stale');
    }
    console.log(`Candidate G rollback bundle verified: ${bundle.modelBundleSha256}`);
    return;
  }
  console.log(JSON.stringify(bundle, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Candidate G rollback bundle failed');
    process.exitCode = 1;
  });
}
