#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { computeRavScorePublicBrowserClosure } from './lib/ravscore-public-browser-closure.mjs';
import {
  ravScoreModelBinding as integratedModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  ravScoreModelBinding as candidateModelBinding,
} from './rollback-assets/ravscore-model-contract.js';
import {
  computeSealedPublicImplementationClosureIdentity,
} from './verify-ravscore-operational-pages-deployment.mjs';

function option(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0 || !argv[index + 1] || argv[index + 1].startsWith('--')) {
    throw new Error(`Public browser closure requires ${name}`);
  }
  return argv[index + 1];
}

function optionalOption(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
}

async function atomicWrite(file, value) {
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

const argv = process.argv.slice(2);
const result = await computeRavScorePublicBrowserClosure({ root: path.resolve(option(argv, '--root')) });
await atomicWrite(option(argv, '--output'), result.manifest);
const model = optionalOption(argv, '--model');
const identityOutput = optionalOption(argv, '--identity-output');
if ((model === null) !== (identityOutput === null)) {
  throw new Error('Public implementation identity requires both --model and --identity-output');
}
if (model !== null) {
  if (!['integrated', 'candidate-g'].includes(model)) {
    throw new Error('Public implementation identity model must be integrated or candidate-g');
  }
  const defaults = model === 'integrated'
    ? {
      binding: integratedModelBinding(),
      contract: 'js/core/ravscore-model-contract.js',
      bundle: 'js/core/ravscore-model-bundle.generated.js',
    }
    : {
      binding: candidateModelBinding(),
      contract: 'scripts/rollback-assets/ravscore-model-contract.js',
      bundle: 'scripts/rollback-assets/ravscore-model-bundle.generated.js',
    };
  const bindingFile = optionalOption(argv, '--binding');
  const binding = bindingFile
    ? JSON.parse(await fs.readFile(path.resolve(bindingFile), 'utf8')) : defaults.binding;
  const [contractText, bundleText] = await Promise.all([
    fs.readFile(path.resolve(optionalOption(argv, '--contract') ?? defaults.contract), 'utf8'),
    fs.readFile(path.resolve(optionalOption(argv, '--bundle') ?? defaults.bundle), 'utf8'),
  ]);
  const identity = computeSealedPublicImplementationClosureIdentity({
    expectedModel: model,
    expectedBinding: binding,
    expectedContractText: contractText,
    expectedBundleText: bundleText,
    expectedPublicClosure: result.manifest,
  });
  await atomicWrite(identityOutput, identity);
  console.log(`Public implementation sealed: ${identity.implementationClosureSha256}.`);
}
console.log(`Public browser closure sealed: ${result.publicBrowserClosureSha256} (${result.manifest.files.length} files).`);
