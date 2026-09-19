#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { publicDeliveryEntries, assertPublicDeliveryDocument } from '../js/core/public-delivery-contract.js';

export async function copyPublicDeliveryShards({ source, target }) {
  const manifest = JSON.parse(await fs.readFile(path.join(source, 'manifest.json'), 'utf8'));
  const entries = publicDeliveryEntries(manifest);
  if (entries.length) await fs.mkdir(path.join(target, 'forecast'), { recursive: true });
  for (const entry of entries) {
    const relative = entry.path.slice(2);
    const sourcePath = path.join(source, relative);
    const stat = await fs.lstat(sourcePath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== entry.bytes) throw new Error('Invalid public delivery file size/type.');
    const bytes = await fs.readFile(sourcePath);
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error('Public delivery hash mismatch.');
    assertPublicDeliveryDocument(JSON.parse(bytes.toString('utf8')), manifest, entry);
    await fs.writeFile(path.join(target, relative), bytes);
  }
  return { files: entries.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = key => process.argv[process.argv.indexOf(key) + 1];
  if (!process.argv.includes('--source') || !process.argv.includes('--target')) throw new Error('Use --source and --target.');
  console.log(JSON.stringify(await copyPublicDeliveryShards({ source: option('--source'), target: option('--target') })));
}
