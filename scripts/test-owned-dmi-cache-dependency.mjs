// Source-CI distribution proof only. Import the official module in a clean
// child, NEVER call isFeatureAvailable/saveCache or the production action.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { createRequire } from 'node:module';
import { inverseSourceArtifactDistribution, SOURCE_ARTIFACT_DISTRIBUTION_REVIEW as distributionReview }
  from './lib/source-artifact-distribution-review.mjs';

assert.equal(process.versions.node.split('.')[0], '24', 'Actual Node24 is required');
const action = fileURLToPath(new URL('../.github/actions/save-owned-dmi-grib/', import.meta.url));
const sri = 'sha512-LVqybSbzhBp2uAETOQ3HnVjXA4AcjavgMH+LCr+cjgO+PZfciv/1QAgoW+esXBaAhvDid+vXeV70GGJpAh4V5Q==';
const current = Object.fromEntries(['package.json', 'package-lock.json'].map(name => [name,
  fs.readFileSync(path.join(action, name), 'utf8').replaceAll('\r\n', '\n')]));
const predecessor = inverseSourceArtifactDistribution(current['package.json'], current['package-lock.json']);
const historical = { 'package.json': predecessor.packageText, 'package-lock.json': predecessor.lockText };
// The old 49-package assertions below stay byte-for-byte meaningful. Only
// their input is the fully pinned predecessor, never an assumed current graph.
function reviewedJson(name, expectedHash) {
  const raw = historical[name];
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

// The deployed/current distribution remains the full259 graph. Verify every
// real installed package, engine and HTTPS/SRI locator, not only the old cache.
const currentLock = JSON.parse(current['package-lock.json']);
const currentPackages = Object.entries(currentLock.packages).filter(([name]) => name !== '');
assert.equal(currentPackages.length, 259);
const semver = createRequire(path.join(action, 'package.json'))('semver');
assert(semver.satisfies(process.versions.node, JSON.parse(current['package.json']).engines.node));
for (const [name, row] of currentPackages) {
  assert(name.startsWith('node_modules/') && !name.split('/').includes('..'));
  assert.equal(row.link, undefined);
  assert.match(row.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/);
  const locator = new URL(row.resolved);
  assert.equal(locator.protocol, 'https:'); assert.equal(locator.hostname, 'registry.npmjs.org');
  assert.equal(locator.username + locator.password + locator.port + locator.hash + locator.search, '');
  assert(locator.pathname.endsWith('.tgz'));
  const directory = path.join(action, name), metadataPath = path.join(directory, 'package.json');
  assert(!fs.lstatSync(directory).isSymbolicLink());
  assert.equal(fs.realpathSync(metadataPath), metadataPath);
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  assert.equal(metadata.version, row.version);
  // npm registry metadata can declare node:'*' although the published binary
  // and chainsaw package.json files omit engines. Both real requirements must
  // accept this host; literal metadata equality is not that contract.
  for (const [origin, engines] of [['locked', row.engines], ['installed', metadata.engines]]) {
    if (engines?.node) assert(semver.satisfies(process.versions.node, engines.node),
      'Current Node24 satisfies ' + origin + ' ' + name);
  }
}
assert.equal(currentLock.packages['node_modules/@actions/artifact'].integrity,
  'sha512-DBXgdB9T4yj2KSe0tFg+MTi9T5se+16bdrFQh+3Y6Nq1lZ3gYQk1BjHoTof+7Zf36bEAlfVMf+8ifRKeyGJugQ==');

// Execute only the actual pure manifest guards, not the action entrypoint.
// The real guard body and all old constants stay unchanged; real files in an
// owned temporary host cover current259, old49 and unknown/drifted operands.
const entry = fs.readFileSync(path.join(action, 'index.cjs'), 'utf8').replaceAll('\r\n', '\n');
const begin = entry.indexOf('function assertDistributionLock() {');
const end = entry.indexOf('\nfunction ', entry.indexOf('function assertAdmittedDistributionLock() {') + 1);
assert(begin >= 0 && end > begin);
const guard = entry.slice(begin, end);
assert(guard.includes('legacy.size !== 49 || added.length !== 210'));
const parent = fs.realpathSync(os.tmpdir()), owned = fs.mkdtempSync(path.join(parent, 'rr-sdk-distribution-'));
const ownedAction = path.join(owned, '.github/actions/save-owned-dmi-grib');
const identities = new Map();
const directories = [owned, path.join(owned, '.github'), path.join(owned, '.github/actions'), ownedAction];
const manifestNames = ['package.json', 'package-lock.json'];
const identity = (target, kind) => {
  const stat = fs.lstatSync(target, { bigint: true });
  assert(!stat.isSymbolicLink());
  assert(kind === 'directory' ? stat.isDirectory() : stat.isFile());
  const saved = identities.get(target);
  if (saved) { assert.equal(stat.dev, saved.dev); assert.equal(stat.ino, saved.ino); }
  else identities.set(target, { dev: stat.dev, ino: stat.ino });
};
identity(owned, 'directory');
let refused = 0;
let primaryError;
try {
  for (const directory of directories.slice(1)) {
    fs.mkdirSync(directory); identity(directory, 'directory');
  }
  const normal = Function('fs', 'path', 'crypto', 'ROOT', 'LOCK_SHA256', 'refused', guard +
    '\nreturn {legacy:assertDistributionLock,current:assertArtifactDistributionSuccessor,admitted:assertAdmittedDistributionLock};')(
    fs, path, crypto, owned, distributionReview.predecessorLockSha256,
    code => Object.assign(new Error(code), { code }));
  const install = pair => {
    assert.deepEqual(Object.keys(pair).sort(), [...manifestNames].sort());
    for (const name of manifestNames) {
      const target = path.join(ownedAction, name), known = identities.has(target);
      if (known) identity(target, 'file');
      fs.writeFileSync(target, pair[name], { flag: known ? 'w' : 'wx' });
      identity(target, 'file');
    }
  };
  install(current);
  assert.equal(normal.current(), ownedAction);
  assert.equal(normal.admitted().lockSha256, distributionReview.lockSha256);
  assert.throws(() => normal.legacy(), { code: 'DMI_RAW_DISTRIBUTION_LOCK_REFUSED' });
  install(historical);
  assert.equal(normal.legacy(), ownedAction);
  assert.equal(normal.admitted().lockSha256, distributionReview.predecessorLockSha256);
  assert.throws(() => normal.current(), { code: 'DMI_RAW_DISTRIBUTION_LOCK_REFUSED' });
  for (const changed of [
    { ...current, 'package.json': current['package.json'].replace('6.3.1', '6.3.2') },
    { ...current, 'package-lock.json': current['package-lock.json'].replace('6.1.0', '6.1.1') },
    { ...current, 'package-lock.json': current['package-lock.json'].replace('sha512-DBX', 'sha512-ABX') },
    { ...current, 'package-lock.json': current['package-lock.json'] + ' ' },
    { ...current, 'package.json': current['package.json'] + '\r' },
    { ...current, 'package-lock.json': historical['package-lock.json'] },
    { ...historical, 'package-lock.json': current['package-lock.json'] },
  ]) {
    install(changed);
    assert.throws(() => normal.admitted(), { code: 'DMI_RAW_DISTRIBUTION_LOCK_REFUSED' });
    assert.throws(() => inverseSourceArtifactDistribution(changed['package.json'], changed['package-lock.json']));
    refused++;
  }
} catch (error) {
  primaryError = error; throw error;
} finally {
  try {
    assert.equal(path.dirname(owned), parent); assert(path.basename(owned).startsWith('rr-sdk-distribution-'));
    // Check the complete owned tree before removing anything. Unknown files,
    // links or replaced identities are retained, never recursively deleted.
    for (const directory of directories.filter(target => identities.has(target))) {
      identity(directory, 'directory');
      const expected = [...identities.keys()].filter(target => path.dirname(target) === directory).map(target => path.basename(target));
      assert.deepEqual(fs.readdirSync(directory).sort(), expected.sort());
    }
    for (const name of manifestNames) {
      const target = path.join(ownedAction, name);
      if (identities.has(target)) identity(target, 'file');
    }
    for (const name of manifestNames) {
      const target = path.join(ownedAction, name);
      if (identities.has(target)) { identity(target, 'file'); fs.unlinkSync(target); }
    }
    for (const directory of [...directories].reverse().filter(target => identities.has(target))) {
      identity(directory, 'directory'); assert.deepEqual(fs.readdirSync(directory), []); fs.rmdirSync(directory);
    }
  } catch (cleanupError) {
    if (primaryError) primaryError.cleanupFailure = cleanupError;
    else throw cleanupError;
  }
}

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

const artifactProbe = `
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { findPackageJSON } from 'node:module';
assert.equal(process.versions.node.split('.')[0], '24');
const metadataPath = findPackageJSON('@actions/artifact', import.meta.url);
assert.equal(fs.realpathSync(metadataPath), fs.realpathSync(path.resolve('node_modules/@actions/artifact/package.json')));
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
assert.equal(metadata.name, '@actions/artifact'); assert.equal(metadata.version, '6.3.1');
assert.equal(metadata.type, 'module'); assert.equal(metadata.exports['.'].import, './lib/artifact.js');
assert.equal(metadata.exports['.'].require, undefined);
const api = await import('@actions/artifact');
assert.equal(typeof api.DefaultArtifactClient, 'function');
assert.equal(typeof api.DefaultArtifactClient.prototype.uploadArtifact, 'function');
assert.equal(typeof api.DefaultArtifactClient.prototype.getArtifact, 'function');
process.stdout.write(JSON.stringify({version:metadata.version,type:metadata.type,
  client:typeof api.DefaultArtifactClient,upload:typeof api.DefaultArtifactClient.prototype.uploadArtifact,
  readback:typeof api.DefaultArtifactClient.prototype.getArtifact}));
`;
let artifactStdout;
try {
  artifactStdout = execFileSync(process.execPath, ['--input-type=module', '--eval', artifactProbe], {
    cwd: action, env: {}, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8',
    timeout: 30_000, maxBuffer: 16 * 1024, windowsHide: true,
  });
} catch { throw new Error('OWNED_ARTIFACT_DEPENDENCY_IMPORT_FAILED'); }
assert.deepEqual(JSON.parse(artifactStdout), {version:'6.3.1',type:'module',client:'function',upload:'function',readback:'function'});
console.log(JSON.stringify({kind:'SOURCE_ARTIFACT_DISTRIBUTION_CONTRACT',currentPackages:259,legacyPackages:49,addedPackages:210,
  realManifestGuards:true,refused,cacheImport:true,artifactImport:true,runtimeApiCalls:0,nativeCohortProven:false}));
