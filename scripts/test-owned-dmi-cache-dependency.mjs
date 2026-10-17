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

// This exact artifact distribution was already introduced by SOURCE a74ec936.
// Execute its unchanged, whole-pinned normal guard before observing the old
// cache-only projection. No dependency repin or runtime API call is admitted.
const sourceArtifactProjection = (() => {
  const packageText = fs.readFileSync(path.join(action, 'package.json'), 'utf8').replace(/\r\n/g, '\n');
  const digest = text => crypto.createHash('sha256').update(text).digest('hex');
  const SOURCE_ARTIFACT_PACKAGE_SHA256 = '27ec4c37add8a4fb54de05e6ceb797b42c95ff15dd84526b4aa326f64c073d99';
  const SOURCE_ARTIFACT_LOCK_SHA256 = '920ad50fc3b7084879c1257d5b11e0e3ce52367b42f05871ffc68f8a66f66c47';
  if (digest(packageText) !== SOURCE_ARTIFACT_PACKAGE_SHA256) return null;
  const source = fs.readFileSync(path.join(action, 'index.cjs'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(source.includes('\r'), false, 'Unexpected bare CR');
  const start = source.indexOf('function assertArtifactDistributionSuccessor() {');
  const end = source.indexOf('\nfunction assertAdmittedDistributionLock() {', start);
  assert.ok(start >= 0 && end > start, 'Normal artifact distribution guard is required');
  const guard = source.slice(start, end);
  assert.equal(digest(guard), '9942c1e9ef40bd31284fa8e26122ba8d8ac9fe62a785ccd6a8566148206fcb9d',
    'Unreviewed normal artifact distribution guard');
  // The only test adapter observes the projection AFTER every normal guard.
  const oldReturn = '  return action;\n}\n';
  assert.equal(guard.split(oldReturn).length, 2);
  assert.ok(guard.endsWith(oldReturn));
  const observed = guard.slice(0, -oldReturn.length) +
    '  return {"package.json": texts[0].replace(\', "@actions/artifact": "6.3.1"\', \'\'), ' +
    '"package-lock.json": JSON.stringify(lock, null, 2) + \'\\n\'};\n}\n';
  const project = new Function('ROOT', 'fs', 'path', 'crypto', 'LOCK_SHA256',
    'SOURCE_ARTIFACT_PACKAGE_SHA256', 'SOURCE_ARTIFACT_LOCK_SHA256', 'refused',
    observed + '\nreturn assertArtifactDistributionSuccessor();');
  return project(path.resolve(action, '../../..'), fs, path, crypto,
    '9bd935a0c94f605ab28b4cc1ea543173bb06e213ba779e6e9855e31a4dd6a9a5',
    SOURCE_ARTIFACT_PACKAGE_SHA256, SOURCE_ARTIFACT_LOCK_SHA256, reason => new Error(reason));
})();
function reviewedJson(name, expectedHash) {
  const raw = sourceArtifactProjection?.[name] ?? fs.readFileSync(path.join(action, name), 'utf8');
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


// Inspect the separately admitted official artifact SDK, never instantiate a
// client or call upload/download/cache APIs. Keep the old cache probe intact.
if (sourceArtifactProjection) {
  const artifactLock = JSON.parse(fs.readFileSync(path.join(action, 'package-lock.json'), 'utf8'));
  assert.equal(Object.keys(artifactLock.packages).length - 1, 259);
  assert.equal(artifactLock.packages['node_modules/@actions/artifact'].version, '6.3.1');
  assert.equal(artifactLock.packages['node_modules/@actions/artifact'].integrity,
    'sha512-DBXgdB9T4yj2KSe0tFg+MTi9T5se+16bdrFQh+3Y6Nq1lZ3gYQk1BjHoTof+7Zf36bEAlfVMf+8ifRKeyGJugQ==');
  const artifactProbe = `
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { findPackageJSON } from 'node:module';
assert.equal(process.versions.node.split('.')[0], '24');
const metadataPath = findPackageJSON('@actions/artifact', import.meta.url);
assert.equal(fs.realpathSync(metadataPath),
  fs.realpathSync(path.resolve('node_modules/@actions/artifact/package.json')));
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
assert.equal(metadata.name, '@actions/artifact');
assert.equal(metadata.version, '6.3.1');
const api = await import('@actions/artifact');
assert.equal(typeof api.DefaultArtifactClient, 'function');
process.stdout.write(JSON.stringify({version: metadata.version, DefaultArtifactClient: typeof api.DefaultArtifactClient}));
`;
  let artifactStdout;
  try {
    artifactStdout = execFileSync(process.execPath, ['--input-type=module', '--eval', artifactProbe], {
      cwd: action, env: {}, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8',
      timeout: 30_000, maxBuffer: 16 * 1024, windowsHide: true,
    });
  } catch {
    throw new Error('OWNED_ARTIFACT_DEPENDENCY_IMPORT_FAILED');
  }
  assert.deepEqual(JSON.parse(artifactStdout), {version: '6.3.1', DefaultArtifactClient: 'function'});
  console.log('Owned artifact dependency: exact 259-to-49 lock inverse + official 6.3.1 import PASS; no runtime API call');
}
