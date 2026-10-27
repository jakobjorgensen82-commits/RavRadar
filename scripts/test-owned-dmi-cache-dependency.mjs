// Source-CI distribution proof only. Import the official module in a clean
// child, NEVER call isFeatureAvailable/saveCache or the production action.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

assert.equal(process.versions.node.split('.')[0], '24', 'Actual Node24 is required');
const action = fileURLToPath(new URL('../.github/actions/save-owned-dmi-grib/', import.meta.url));
const sri = 'sha512-LVqybSbzhBp2uAETOQ3HnVjXA4AcjavgMH+LCr+cjgO+PZfciv/1QAgoW+esXBaAhvDid+vXeV70GGJpAh4V5Q==';
function reviewedJson(name, expectedHash) {
  const raw = fs.readFileSync(path.join(action, name), 'utf8');
  // Git's CRLF/LF checkout conversion is not a dependency-graph mutation.
  const canonicalLines = raw.replace(/\r\n/g, '\n');
  assert.equal(canonicalLines.includes('\r'), false, 'Unexpected bare CR');
  assert.equal(crypto.createHash('sha256').update(canonicalLines).digest('hex'), expectedHash,
    `Unreviewed local action ${name}`);
  return JSON.parse(raw);
}
const declaration = reviewedJson('package.json',
  '111ef6137410cce15e90ddfea3fbbb70b04285a2e0c1fc04cb221c04cc3b61d8');
const lock = reviewedJson('package-lock.json',
  '9bd935a0c94f605ab28b4cc1ea543173bb06e213ba779e6e9855e31a4dd6a9a5');
assert.equal(declaration.private, true);
assert.deepEqual(declaration.dependencies, {'@actions/cache': '6.1.0'});
assert.deepEqual(declaration.overrides,
  {'uri-js': 'npm:uri-js-replace@^1.0.1', 'node-fetch': '^3.3.2'});
assert.equal(lock.lockfileVersion, 3);
assert.deepEqual(lock.packages[''].dependencies, declaration.dependencies);
const packages = Object.entries(lock.packages).filter(([name]) => name !== '');
assert.equal(packages.length, 49, 'Reviewed locked graph must not change silently');
for (const [name, item] of packages) {
  assert.ok(name.startsWith('node_modules/'));
  assert.equal(item.link, undefined, 'No linked dependency in the reviewed distribution');
  assert.match(item.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/);
  const resolved = new URL(item.resolved);
  assert.equal(resolved.protocol, 'https:');
  assert.equal(resolved.hostname, 'registry.npmjs.org');
  assert.equal(resolved.username + resolved.password + resolved.port + resolved.hash + resolved.search, '');
  assert.ok(resolved.pathname.endsWith('.tgz'));
}
assert.equal(lock.packages['node_modules/@actions/cache'].version, '6.1.0');
assert.equal(lock.packages['node_modules/@actions/cache'].integrity, sri);

// Fixed import-only body, no caller module/command argument or inherited
// NODE_OPTIONS/cache endpoints/runtime tokens. Actual APIs are merely inspected.
const probe = `
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { findPackageJSON } from 'node:module';
assert.equal(process.versions.node.split('.')[0], '24');
const metadataPath = findPackageJSON('@actions/cache', import.meta.url);
assert.equal(fs.realpathSync(metadataPath),
  fs.realpathSync(path.resolve('node_modules/@actions/cache/package.json')));
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
assert.equal(metadata.name, '@actions/cache');
assert.equal(metadata.version, '6.1.0');
assert.equal(metadata.type, 'module');
assert.equal(metadata.exports['.'].import, './lib/cache.js');
assert.equal(metadata.exports['.'].require, undefined);
const api = await import('@actions/cache');
assert.equal(typeof api.isFeatureAvailable, 'function');
assert.equal(typeof api.saveCache, 'function');
process.stdout.write(JSON.stringify({version: metadata.version, type: metadata.type,
  isFeatureAvailable: typeof api.isFeatureAvailable, saveCache: typeof api.saveCache}));
`;
let stdout;
try {
  stdout = execFileSync(process.execPath, ['--input-type=module', '--eval', probe], {
    cwd: action, env: {}, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8',
    timeout: 30_000, maxBuffer: 16 * 1024, windowsHide: true,
  });
} catch {
  // Never relay child stderr/environment; import failure is not cache health.
  throw new Error('OWNED_CACHE_DEPENDENCY_IMPORT_FAILED');
}
assert.deepEqual(JSON.parse(stdout), {version: '6.1.0', type: 'module',
  isFeatureAvailable: 'function', saveCache: 'function'});
console.log('Owned cache dependency: reviewed 49-package lock + official 6.1.0 import PASS; no runtime API call');
