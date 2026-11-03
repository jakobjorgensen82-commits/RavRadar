// TEST ONLY: qualify the exact additive SDK graph, then reconstruct all old
// cache-only manifest bytes. Never install, call an SDK, or grant SAVE authority.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
export const SOURCE_ARTIFACT_DISTRIBUTION_REVIEW = Object.freeze({
  packageSha256: '27ec4c37add8a4fb54de05e6ceb797b42c95ff15dd84526b4aa326f64c073d99',
  lockSha256: '920ad50fc3b7084879c1257d5b11e0e3ce52367b42f05871ffc68f8a66f66c47',
  predecessorPackageSha256: '111ef6137410cce15e90ddfea3fbbb70b04285a2e0c1fc04cb221c04cc3b61d8',
  predecessorLockSha256: '9bd935a0c94f605ab28b4cc1ea543173bb06e213ba779e6e9855e31a4dd6a9a5',
  packages: 259, predecessorPackages: 49, addedPackages: 210,
});
export function inverseSourceArtifactDistribution(packageText, lockText) {
  assert.equal(arguments.length, 2);
  for (const text of [packageText, lockText]) { assert.equal(typeof text, 'string'); assert(!text.includes('\r')); }
  const pin = SOURCE_ARTIFACT_DISTRIBUTION_REVIEW;
  assert.equal(sha(packageText), pin.packageSha256, 'Whole reviewed SOURCE package');
  assert.equal(sha(lockText), pin.lockSha256, 'Whole reviewed SOURCE lock');
  const declaration = JSON.parse(packageText), lock = JSON.parse(lockText);
  assert.deepEqual(declaration.dependencies, { '@actions/cache': '6.1.0', '@actions/artifact': '6.3.1' });
  assert.deepEqual(declaration.engines, { node: '>=24' });
  assert.deepEqual(lock.packages[''].dependencies, declaration.dependencies);
  assert.equal(JSON.stringify(lock, null, 2) + '\n', lockText);
  const resolve = (from, name) => {
    for (let base = from;;) {
      const key = `${base ? base + '/' : ''}node_modules/${name}`;
      if (Object.hasOwn(lock.packages, key)) return key;
      if (!base) return null;
      const index = base.lastIndexOf('/node_modules/'); base = index < 0 ? '' : base.slice(0, index);
    }
  };
  const reachable = first => {
    const seen = new Set(), pending = [first];
    while (pending.length) {
      const key = pending.pop(); if (seen.has(key)) continue; seen.add(key);
      const row = lock.packages[key]; assert(row, 'Actual transitive node exists');
      for (const kind of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
        for (const name of Object.keys(row[kind] || {})) {
          const selected = resolve(key, name);
          if (selected) pending.push(selected);
          else assert(kind === 'optionalDependencies' || row.peerDependenciesMeta?.[name]?.optional === true,
            'Every required transitive dependency resolves');
        }
      }
    }
    return seen;
  };
  const legacy = reachable('node_modules/@actions/cache'), artifact = reachable('node_modules/@actions/artifact');
  const added = Object.keys(lock.packages).filter(key => key && !legacy.has(key));
  assert.equal(legacy.size, pin.predecessorPackages); assert.equal(added.length, pin.addedPackages);
  assert.equal(Object.keys(lock.packages).length, pin.packages + 1);
  assert(added.every(key => artifact.has(key)), 'Only the actual artifact closure is additive');
  assert.equal(lock.packages['node_modules/@actions/artifact'].version, '6.3.1');
  delete lock.packages[''].dependencies['@actions/artifact'];
  for (const key of added) delete lock.packages[key];
  const priorLock = JSON.stringify(lock, null, 2) + '\n';
  assert.equal(packageText.split(', "@actions/artifact": "6.3.1"').length, 2);
  const priorPackage = packageText.replace(', "@actions/artifact": "6.3.1"', '');
  assert.equal(sha(priorPackage), pin.predecessorPackageSha256, 'Whole genuine cache-only package restored');
  assert.equal(sha(priorLock), pin.predecessorLockSha256, 'Every old cache dependency byte restored');
  return Object.freeze({ packageText: priorPackage, lockText: priorLock });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.deepEqual(process.argv.slice(2), ['--legacy-json']);
  assert.equal(process.versions.node.split('.')[0], '24');
  const action = new URL('../../.github/actions/save-owned-dmi-grib/', import.meta.url);
  const read = name => fs.readFileSync(new URL(name, action), 'utf8').replaceAll('\r\n', '\n');
  const prior = inverseSourceArtifactDistribution(read('package.json'), read('package-lock.json'));
  process.stdout.write(JSON.stringify({ kind: 'TEST_ONLY_SOURCE_ARTIFACT_LEGACY_GRAPH', ...SOURCE_ARTIFACT_DISTRIBUTION_REVIEW,
    predecessorPackage: prior.packageText, predecessorLock: prior.lockText, productionAuthority: false }));
}
