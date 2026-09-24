#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrivateRuntimeJson } from './private-production-runtime-bundle.mjs';
import {
  isExactDmiSchedulerPredecessor,
  isExactDmiMarineSeamPredecessor,
  isExactWeatherRotationPredecessor,
} from './protected-private-production-runtime.mjs';

const same = (left, right) => canonicalPrivateRuntimeJson(left) === canonicalPrivateRuntimeJson(right);

// The protected restore has already authenticated the archive and its bytes.
// The second, local bundle restore must use that same *exact* archive contract
// during a narrowly approved source-only transition, not a wider hash bypass.
export function secondRestoreExpectation({ expected, source, manifest }) {
  if (!expected?.contractHashes || !source || !manifest) {
    throw new Error('Second restore requires an expectation, protected source and bundle manifest');
  }
  if (source.bundleContentSha256 !== manifest.bundleContentSha256
    || source.datasetId !== manifest.datasetId
    || source.productionReferenceAt !== manifest.productionReferenceAt
    || source.generatedAt !== manifest.generatedAt
    || !same(source.modelBinding, manifest.modelBinding)
    || !same(source.contractHashes, manifest.contractHashes)) {
    throw new Error('Second restore source contradicts the authenticated bundle');
  }
  if (same(manifest.contractHashes, expected.contractHashes)) return expected;
  if (!(
    isExactDmiSchedulerPredecessor(source, expected)
    || isExactDmiMarineSeamPredecessor(source, expected)
    || isExactWeatherRotationPredecessor(source, expected)
  )) {
    throw new Error('Second restore source is not an approved exact predecessor');
  }
  return { ...expected, contractHashes: manifest.contractHashes };
}

function argument(args, name) {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error(`Missing ${name}`);
  return args[index + 1];
}

async function main(args) {
  const expected = JSON.parse(await fs.readFile(argument(args, '--expected'), 'utf8'));
  const source = JSON.parse(await fs.readFile(argument(args, '--source-description'), 'utf8'));
  const manifest = JSON.parse(await fs.readFile(argument(args, '--bundle-manifest'), 'utf8'));
  const output = path.resolve(argument(args, '--output'));
  const selected = secondRestoreExpectation({ expected, source, manifest });
  await fs.writeFile(output, `${canonicalPrivateRuntimeJson(selected)}\n`, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ status: 'second-restore-expectation-ready', exactPredecessor: selected !== expected }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(`Private runtime second-restore expectation failed closed: ${error.message}`);
    process.exitCode = 1;
  });
}
