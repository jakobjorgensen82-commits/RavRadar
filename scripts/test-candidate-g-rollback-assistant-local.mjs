import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ravScoreModelBinding as integratedModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateModelBinding } from './rollback-assets/ravscore-model-contract.js';

const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-candidate-assistant-'));
const stageRoot = path.join(temporaryRoot, 'candidate-pages');
const repositoryRoot = process.cwd();
const candidateBinding = candidateModelBinding();
const integratedBinding = integratedModelBinding();
const headers = {
  'x-ravradar-model-id': integratedBinding.modelId,
  'x-ravradar-model-state-version': integratedBinding.stateSchemaVersion,
  'x-ravradar-model-contract-sha256': integratedBinding.modelContractSha256,
  'x-ravradar-model-bundle-sha256': integratedBinding.modelBundleSha256,
  'x-ravradar-assistant-knowledge-schema': 'rav-assistant-public-knowledge-v1',
  'x-ravradar-assistant-knowledge-sha256':
    '39b0d33bd347418716cfccb7b20d711775bf520634c498d30c0b11c2cf24a5d2',
};

try {
  await fs.mkdir(stageRoot, { recursive: true });
  await Promise.all([
    fs.cp(path.join(repositoryRoot, 'js'), path.join(stageRoot, 'js'), { recursive: true }),
    fs.cp(path.join(repositoryRoot, 'knowledge'), path.join(stageRoot, 'knowledge'),
      { recursive: true }),
    fs.copyFile(path.join(repositoryRoot, 'config.js'), path.join(stageRoot, 'config.js')),
    fs.copyFile(path.join(repositoryRoot, 'package.json'), path.join(stageRoot, 'package.json')),
  ]);
  await Promise.all([
    fs.copyFile(path.join(repositoryRoot, 'scripts', 'rollback-assets',
      'ravscore-model-contract.js'), path.join(stageRoot, 'js', 'core',
      'ravscore-model-contract.js')),
    fs.copyFile(path.join(repositoryRoot, 'scripts', 'rollback-assets',
      'ravscore-model-bundle.generated.js'), path.join(stageRoot, 'js', 'core',
      'ravscore-model-bundle.generated.js')),
  ]);
  const assistant = await import(`${pathToFileURL(path.join(stageRoot, 'js', 'services',
    'rav-assistant.js')).href}?candidate-assistant-test=1`);
  const question = 'Kan succinit have elektrisk polarisering?';
  assert.equal(assistant.routeRavQuestion(question), 'remote-candidate');
  const local = await assistant.askRavRadar(question, {}, { language: 'da', localOnly: true });

  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ error: 'MODEL_BINDING_MISMATCH' }), {
      status: 409,
      headers,
    });
  };
  try {
    const answer = await assistant.askRavRadar(question, {}, { language: 'da' });
    assert.equal(answer, local,
      'Candidate Pages must fall back deterministically to its local assistant');
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].body.context.modelBinding, candidateBinding,
    'Candidate Pages must send its exact active 11-field binding');
  assert.equal(requests[0].body.context.modelBinding.modelId, candidateBinding.modelId);
  assert.notEqual(requests[0].body.context.modelBinding.modelId, integratedBinding.modelId);
  assert.doesNotMatch(JSON.stringify(requests[0].body),
    /(?:latitude|longitude|currentUMps|currentVMps|anonymous_id|user_id)/i);
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}

console.log('Candidate G assistant sends exact Candidate binding; integrated Edge 409 yields deterministic local-only fallback.');
