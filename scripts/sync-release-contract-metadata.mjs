#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertReleaseContractMetadata,
  buildReleaseContractMetadata,
} from './lib/release-contract-metadata.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function synchronizeReleaseContractMetadata({
  write = false,
  root = ROOT,
} = {}) {
  const versionPath = path.join(root, 'version.json');
  const versionDocument = JSON.parse(await fs.readFile(versionPath, 'utf8'));
  const releaseContract = buildReleaseContractMetadata({ releaseVersion: versionDocument.version });
  const changed = [];

  if (write) {
    if (JSON.stringify(versionDocument.releaseContract) !== JSON.stringify(releaseContract)) {
      versionDocument.releaseContract = releaseContract;
      await fs.writeFile(versionPath, `${JSON.stringify(versionDocument, null, 2)}\n`, 'utf8');
      changed.push('version.json');
    }
  } else {
    assertReleaseContractMetadata(versionDocument.releaseContract, {
      releaseVersion: versionDocument.version,
    });
  }

  return Object.freeze({
    releaseContract,
    changed: Object.freeze(changed),
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const write = process.argv.includes('--write');
    const result = await synchronizeReleaseContractMetadata({ write });
    console.log(
      `Release contract metadata ${write ? 'synchronized' : 'verified'} for ${result.releaseContract.releaseVersion}.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Release contract metadata synchronization failed');
    process.exitCode = 1;
  }
}
