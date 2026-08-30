#!/usr/bin/env node
import { execFile as execFileCallback } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);

export const TRACKED_PUBLIC_LIVE_ALLOWLIST = Object.freeze([
  'data/live/coastal-parts-v2.json',
  'data/live/manifest.json',
  'data/live/public-condition-details.json',
  'data/live/public-conditions.json',
]);

export function auditTrackedRuntimePaths(paths) {
  if (!Array.isArray(paths)) throw new Error('Tracked runtime path inventory is invalid');
  const allowed = new Set(TRACKED_PUBLIC_LIVE_ALLOWLIST);
  const normalized = paths.filter(Boolean).map(value => {
    if (typeof value !== 'string' || value.includes('\\') || value.includes('\0')) {
      throw new Error('Tracked runtime path inventory contains an unsafe path');
    }
    return value;
  });
  const duplicates = normalized.filter((value, index) => normalized.indexOf(value) !== index);
  if (duplicates.length > 0) throw new Error('Tracked runtime path inventory contains duplicates');
  const forbidden = normalized.filter(value => value.startsWith('data/live/') && !allowed.has(value));
  if (forbidden.length > 0) {
    throw new Error(
      `Private runtime files are tracked outside the four-file public allowlist (${forbidden.length})`,
    );
  }
  return {
    passed: true,
    trackedLiveFileCount: normalized.filter(value => value.startsWith('data/live/')).length,
    maximumAllowedLiveFileCount: allowed.size,
    privateRuntimeTracked: false,
  };
}

async function main() {
  const { stdout } = await execFile('git', ['ls-files', '-z', '--', 'data/live'], {
    cwd: path.resolve('.'),
    encoding: 'buffer',
    maxBuffer: 1024 * 1024,
  });
  const paths = stdout.toString('utf8').split('\0').filter(Boolean);
  const result = auditTrackedRuntimePaths(paths);
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`Tracked runtime privacy gate failed closed: ${error.message}`);
    process.exitCode = 1;
  });
}
