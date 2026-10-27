import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  CANDIDATE_G_ROLLBACK_BUNDLE_ENTRYPOINTS,
  computeCandidateGRollbackBundle,
  renderCandidateGRollbackGeneratedModule,
} from './build-candidate-g-rollback-bundle.mjs';
import {
  GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST,
} from './rollback-assets/ravscore-model-bundle.generated.js';
import {
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
} from './rollback-assets/ravscore-model-contract.js';

const baseline = await computeCandidateGRollbackBundle();
const candidateEvaluatorSource = await fs.readFile('js/core/ravscore-candidate-g.js', 'utf8');
await assert.rejects(() => computeCandidateGRollbackBundle({
  sourceOverrides: new Map([[
    'js/core/ravscore-candidate-g.js',
    `${candidateEvaluatorSource}\nconst hiddenModule = './hidden-model.js'; void import(hiddenModule);\n`,
  ]]),
}), /non-literal or unparsed dynamic import/);
assert.match(baseline.contractSha256, /^[a-f0-9]{64}$/);
assert.match(baseline.modelBundleSha256, /^[a-f0-9]{64}$/);
assert.notEqual(baseline.contractSha256, baseline.modelBundleSha256);
assert.equal(baseline.contractSha256, RAVSCORE_MODEL_CONTRACT_SHA256);
assert.equal(baseline.modelBundleSha256, RAVSCORE_MODEL_BUNDLE_SHA256);
assert.deepEqual(baseline.manifest, GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST);
assert.deepEqual(baseline.manifest.entrypoints, [...CANDIDATE_G_ROLLBACK_BUNDLE_ENTRYPOINTS].sort());
assert.equal(baseline.manifest.files.some(item => item.file === 'js/core/ravscore-model-contract.js'), false,
  'Candidate G bundle must not depend on the integrated contract/calibration flag');

for (const file of [
  'js/core/ravscore-candidate-g.js',
  'js/core/ravscore-candidate-g-state-pipeline.js',
  'js/core/ravscore-public-model.js',
  'js/core/best-time-selector.js',
  'js/core/local-zone-score.js',
  'js/core/score-presentation.js',
  'js/core/ravscore-public-runtime-contract.js',
  'js/core/ravscore-profile-switch.js',
  'js/core/ravscore-integrated-explanation-presenter.js',
  'js/services/rav-assistant.js',
  'js/services/trip-evidence-public-adapter.js',
  'supabase/functions/_shared/trip-storage.js',
  'supabase/functions/submit-observation/index.ts',
  'scripts/lib/ravscore-candidate-g-rollback-runtime.mjs',
  'scripts/lib/ravscore-production-part-pipeline.mjs',
  'scripts/rollback-assets/ravscore-model-contract.js',
]) {
  assert.ok(baseline.manifest.files.some(item => item.file === file), `${file} is absent from Candidate G closure`);
  const source = await fs.readFile(file, 'utf8');
  const changed = await computeCandidateGRollbackBundle({
    sourceOverrides: new Map([[file, `${source}\n// candidate-g-semantic-mutation\n`]]),
  });
  assert.notEqual(changed.modelBundleSha256, baseline.modelBundleSha256,
    `${file} mutation did not change Candidate G bundle identity`);
}

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
  assert.equal(baseline.manifest.files.some(item => item.file === file), false,
    `${file} is public-release/transition tooling and must not identify the Candidate G model`);
  const source = await fs.readFile(file, 'utf8');
  const changed = await computeCandidateGRollbackBundle({
    sourceOverrides: new Map([[file, `${source}\n// transition-tooling-only-mutation\n`]]),
  });
  assert.equal(changed.modelBundleSha256, baseline.modelBundleSha256,
    `${file} mutation incorrectly changed Candidate G model identity`);
}

const generated = renderCandidateGRollbackGeneratedModule(baseline).replace(/\r\n?/g, '\n');
const tracked = (await fs.readFile('scripts/rollback-assets/ravscore-model-bundle.generated.js', 'utf8'))
  .replace(/\r\n?/g, '\n');
assert.equal(tracked, generated);

console.log(`Candidate G rollback bundle binds ${baseline.manifest.files.length} implementation files independently of the integrated contract.`);
