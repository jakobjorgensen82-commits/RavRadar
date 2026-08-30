import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  RAVSCORE_MODEL_BUNDLE_ENTRYPOINTS,
  computeRavScoreModelBundle,
  renderGeneratedBundleModule,
} from './build-ravscore-model-bundle.mjs';
import {
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
} from '../js/core/ravscore-model-contract.js';

const baseline = await computeRavScoreModelBundle();
const integratedEvaluatorSource = await fs.readFile('js/core/ravscore-integrated.js', 'utf8');
await assert.rejects(() => computeRavScoreModelBundle({
  sourceOverrides: new Map([[
    'js/core/ravscore-integrated.js',
    `${integratedEvaluatorSource}\nconst hiddenModule = './hidden-model.js'; void import(hiddenModule);\n`,
  ]]),
}), /non-literal or unparsed dynamic import/);
assert.match(baseline.contractSha256, /^[a-f0-9]{64}$/);
assert.match(baseline.modelBundleSha256, /^[a-f0-9]{64}$/);
assert.equal(baseline.contractSha256, RAVSCORE_MODEL_CONTRACT_SHA256);
assert.equal(baseline.modelBundleSha256, RAVSCORE_MODEL_BUNDLE_SHA256);
assert.ok(baseline.manifest.files.length >= 15);
assert.deepEqual(baseline.manifest.entrypoints, [...RAVSCORE_MODEL_BUNDLE_ENTRYPOINTS].sort());

for (const file of [
  'js/core/ravscore-integrated.js',
  'js/core/ravscore-huntability.js',
  'js/core/ravscore-integrated-state-pipeline.js',
  'js/core/local-zone-score.js',
  'js/core/best-time-selector.js',
  'scripts/public-conditions-lib.mjs',
  'scripts/lib/ravscore-production-adapters.mjs',
  'scripts/lib/ravscore-production-part-pipeline.mjs',
]) {
  assert.ok(baseline.manifest.files.some(item => item.path === file), `${file} is absent from the bundle closure`);
  const source = await fs.readFile(file, 'utf8');
  const changed = await computeRavScoreModelBundle({
    sourceOverrides: new Map([[file, `${source}\n// semantic-mutation-fixture\n`]]),
  });
  assert.notEqual(changed.modelBundleSha256, baseline.modelBundleSha256, `${file} mutation did not change bundle identity`);
}

const productionAdapterPath = 'scripts/lib/ravscore-production-adapters.mjs';
const productionAdapterSource = await fs.readFile(productionAdapterPath, 'utf8');
for (const [label, before, after] of [
  [
    'verified-current vector-selection gate',
    "source?.vectorSelection !== bulkCache?.currentVectorSelection",
    "false && source?.vectorSelection !== bulkCache?.currentVectorSelection",
  ],
  [
    'zone winner margin boundary',
    'high - row.score <= marginPoints',
    'high - row.score < marginPoints',
  ],
]) {
  assert.ok(productionAdapterSource.includes(before), `${label} mutation fixture is stale`);
  const changed = await computeRavScoreModelBundle({
    sourceOverrides: new Map([[
      productionAdapterPath,
      productionAdapterSource.replace(before, after),
    ]]),
  });
  assert.notEqual(changed.modelBundleSha256, baseline.modelBundleSha256,
    `${label} mutation did not change bundle identity`);
}

const productionPartPipelinePath = 'scripts/lib/ravscore-production-part-pipeline.mjs';
const productionPartPipelineSource = await fs.readFile(productionPartPipelinePath, 'utf8');
const publicScoreBoundary = 'scoreStartAt: recovery.scoreStartAt';
assert.ok(productionPartPipelineSource.includes(publicScoreBoundary),
  'public score boundary mutation fixture is stale');
const unboundedReplayScores = await computeRavScoreModelBundle({
  sourceOverrides: new Map([[
    productionPartPipelinePath,
    productionPartPipelineSource.replace(publicScoreBoundary, 'scoreStartAt: null'),
  ]]),
});
assert.notEqual(unboundedReplayScores.modelBundleSha256, baseline.modelBundleSha256,
  'changing the private-replay/public-score boundary must change bundle identity');

const candidateFiles = baseline.manifest.files.map(item => item.path);
let normalizedCachebusterProved = false;
for (const file of candidateFiles) {
  const source = await fs.readFile(file, 'utf8');
  if (!/[?&]v=\d+\.\d+\.\d+/.test(source)) continue;
  const changed = await computeRavScoreModelBundle({
    sourceOverrides: new Map([[file, source.replace(/([?&]v=)\d+\.\d+\.\d+/g,
      (_match, prefix) => `${prefix}999.999.999`)]]),
  });
  assert.equal(changed.modelBundleSha256, baseline.modelBundleSha256,
    'release-only module cachebusters must not invalidate the semantic model bundle');
  normalizedCachebusterProved = true;
  break;
}
assert.equal(normalizedCachebusterProved, true, 'bundle closure lacks a cachebuster normalization fixture');
assert.match(renderGeneratedBundleModule(baseline), new RegExp(baseline.modelBundleSha256));

for (const file of [
  'app.js',
  'bootstrap.js',
  'service-worker.js',
  'scripts/prepare-candidate-g-operational-rollback.mjs',
  'scripts/install-candidate-g-rollback-stage.mjs',
  'scripts/audit-candidate-g-rollback-public-runtime.mjs',
  'scripts/verify-ravscore-operational-pages-deployment.mjs',
  'scripts/ravscore-operational-activation.mjs',
]) {
  assert.equal(baseline.manifest.files.some(item => item.path === file), false,
    `${file} is public-release/transition tooling and must not identify the integrated model`);
  const source = await fs.readFile(file, 'utf8');
  const changed = await computeRavScoreModelBundle({
    sourceOverrides: new Map([[file, `${source}\n// transition-tooling-only-mutation\n`]]),
  });
  assert.equal(changed.modelBundleSha256, baseline.modelBundleSha256,
    `${file} mutation incorrectly changed integrated model identity`);
}

console.log(`OK: RavScore bundle binds ${baseline.manifest.files.length} transitive implementation files and ignores release-only cachebusters.`);
