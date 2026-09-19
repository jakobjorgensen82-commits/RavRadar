#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validatePredecessorIdentity, validatePredecessorManifest } from './migrate-post-cutover-private-runtime.mjs';
import { extractProtectedPredecessorInputs } from './lib/protected-predecessor-inputs.mjs';

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const inside = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

export async function exportProtectedPredecessorInputs({ privateRoot, bundlePath,
  predecessorRoot, predecessorDescriptorPath, expectedSourceHead, outputPath,
  repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  now = new Date().toISOString() } = {}) {
  const repository = await fs.realpath(repositoryRoot);
  const privateDirectory = await fs.realpath(privateRoot);
  const predecessor = await fs.realpath(predecessorRoot);
  const output = path.resolve(outputPath);
  const outputParent = await fs.realpath(path.dirname(output));
  if (inside(repository, privateDirectory) || inside(repository, predecessor)
      || !inside(privateDirectory, outputParent) || inside(repository, output)
      || inside(predecessor, outputParent)) throw new Error('Predecessor export and source must remain in private directories outside the repository');
  const identity = validatePredecessorIdentity(JSON.parse(await fs.readFile(predecessorDescriptorPath, 'utf8')), expectedSourceHead);
  const importOld = relative => import(`${pathToFileURL(path.join(predecessor, relative)).href}?inputExport=${expectedSourceHead}`);
  const [bundle, oldStaging, oldIntegratedBinding, oldCandidateBinding, oldWorkflow] = await Promise.all([
    importOld('scripts/private-production-runtime-bundle.mjs'),
    importOld('scripts/lib/coastal-point-staging-contract.mjs'),
    importOld('js/core/ravscore-model-contract.js'),
    importOld('scripts/rollback-assets/ravscore-model-contract.js'),
    importOld('scripts/private-production-runtime-workflow.mjs'),
  ]);
  // The archived old reader must agree with the sealed continuation code,
  // independently of central hydration's other runtime-contract changes.
  const rows = [];
  for (const relative of [...oldWorkflow.PRIVATE_RUNTIME_CONTRACT_FILES.continuationStateContractSha256].sort()) {
    const absolute = path.resolve(predecessor, relative);
    if (!inside(predecessor, absolute)) throw new Error('Predecessor continuation source escapes its archive');
    const text = (await fs.readFile(absolute, 'utf8')).replace(/\r\n/g, '\n')
      .replace(/(releaseVersion\s*:\s*['"])\d+\.\d+\.\d+(['"])/g, '$1<release-version>$2')
      .replace(/\?v=\d+\.\d+\.\d+(?=['"])/g, '?v=<release-version>');
    rows.push([relative, sha(Buffer.from(text))]);
  }
  if (sha(JSON.stringify(rows)) !== identity.contractHashes.continuationStateContractSha256) {
    throw new Error('Archived predecessor continuation source differs from the sealed generation');
  }
  const verified = await bundle.verifyPrivateProductionRuntimeBundle({ privateRoot: privateDirectory,
    bundlePath, repositoryRoot: repository, now, expected: {
      datasetId: identity.datasetId, productionReferenceAt: identity.productionReferenceAt,
      generatedAt: identity.generatedAt, modelBinding: identity.modelBinding,
      contractHashes: identity.contractHashes,
    } });
  validatePredecessorManifest(verified.manifest, oldIntegratedBinding.ravScoreModelBinding(), identity);
  if (inside(verified.bundlePath, outputParent)) throw new Error('Predecessor evidence export must not alter the protected bundle inventory');
  const conditionsBytes = await fs.readFile(path.join(verified.bundlePath, 'payload/data/live/conditions.json'));
  const evidence = extractProtectedPredecessorInputs({ conditionsBytes, manifest: verified.manifest,
    expectedIdentity: identity, oldStaging, oldIntegratedBinding, oldCandidateBinding });
  // Exclusive create: never overwrite a protected generation or earlier proof.
  await fs.writeFile(output, `${JSON.stringify(evidence)}\n`, { flag: 'wx', mode: 0o600 });
  return evidence.summary;
}

async function main() {
  const args = process.argv.slice(2), values = {};
  const keys = { '--private-root': 'privateRoot', '--bundle': 'bundlePath',
    '--predecessor-root': 'predecessorRoot', '--predecessor-descriptor': 'predecessorDescriptorPath',
    '--expected-source-head': 'expectedSourceHead', '--output': 'outputPath',
    '--repository-root': 'repositoryRoot', '--now': 'now' };
  for (let i = 0; i < args.length; i += 2) {
    if (!keys[args[i]] || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Invalid predecessor-export arguments');
    if (values[keys[args[i]]] !== undefined) throw new Error('Duplicate predecessor-export argument');
    values[keys[args[i]]] = args[i + 1];
  }
  for (const key of ['privateRoot', 'bundlePath', 'predecessorRoot', 'predecessorDescriptorPath', 'expectedSourceHead', 'outputPath']) {
    if (!values[key]) throw new Error(`Missing predecessor-export ${key}`);
  }
  console.log(JSON.stringify(await exportProtectedPredecessorInputs(values)));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
